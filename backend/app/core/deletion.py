from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.crypto import decrypt_token
from app.connectors.google_drive import GoogleDriveConnector
from app.core.audit import log_action
from app.models import File, FileObject, Folder, GoogleAccount


def _restore_suffix(name: str, n: int, is_folder: bool) -> str:
    suffix = "(restored)" if n == 1 else f"(restored {n})"
    if is_folder:
        return f"{name} {suffix}"
    idx = name.rfind(".")
    if 0 < idx < len(name) - 1:
        return f"{name[:idx]} {suffix}{name[idx:]}"
    return f"{name} {suffix}"


async def _unique_file_name_for_restore(
    db: AsyncSession, user_id: UUID, folder_id: UUID | None, filename: str, exclude_file_id: UUID
) -> str:
    candidate = filename
    n = 0
    while True:
        existing = await db.execute(
            select(File.id)
            .where(
                File.user_id == user_id,
                File.folder_id == folder_id,
                File.filename == candidate,
                File.deleted_at.is_(None),
                File.id != exclude_file_id,
            )
            .limit(1)
        )
        if existing.scalar_one_or_none() is None:
            return candidate
        n += 1
        candidate = _restore_suffix(filename, n, is_folder=False)


async def _unique_folder_name_for_restore(
    db: AsyncSession, user_id: UUID, parent_folder_id: UUID | None, name: str, exclude_folder_id: UUID
) -> str:
    candidate = name
    n = 0
    while True:
        existing = await db.execute(
            select(Folder.id)
            .where(
                Folder.user_id == user_id,
                Folder.parent_folder_id == parent_folder_id,
                Folder.name == candidate,
                Folder.deleted_at.is_(None),
                Folder.id != exclude_folder_id,
            )
            .limit(1)
        )
        if existing.scalar_one_or_none() is None:
            return candidate
        n += 1
        candidate = _restore_suffix(name, n, is_folder=True)


async def purge_file(db: AsyncSession, user_id: UUID, file_id: UUID) -> File | None:
    """Permanently removes a File row — and, if nothing else (live or still
    trashed) references its FileObject, the real Google Drive file too.
    This is the terminal step of the trash lifecycle: either the scheduled
    sweep in app/jobs/purge_trash.py once the retention window passes, or an
    explicit "Delete forever" from the Trash view. Never call this directly
    from a normal delete action — see trash_file() for that."""
    stmt = (
        select(File, FileObject, GoogleAccount.refresh_token_enc)
        .outerjoin(FileObject, FileObject.id == File.file_object_id)
        .outerjoin(GoogleAccount, GoogleAccount.id == FileObject.google_account_id)
        .where(File.id == file_id, File.user_id == user_id)
    )
    row = (await db.execute(stmt)).first()
    if row is None:
        return None
    file_row, file_object, refresh_token_enc = row

    if file_object is not None:
        # Dedup means other `files` rows (live or still-trashed — a trashed
        # file might still be restored, and needs the object to exist for
        # that) may still reference this same file_object — only remove the
        # underlying Drive file (and its file_objects row) once nothing else
        # needs it.
        other_refs = (
            await db.execute(
                select(func.count())
                .select_from(File)
                .where(File.file_object_id == file_object.id, File.id != file_id)
            )
        ).scalar_one()
        if other_refs == 0:
            if refresh_token_enc:
                refresh_token = decrypt_token(refresh_token_enc)
                connector = GoogleDriveConnector()
                await connector.delete(refresh_token, file_object.google_file_id)
            await db.delete(file_object)

    filename = file_row.filename
    await db.delete(file_row)
    log_action(db, user_id, "file_purge", {"file_id": str(file_id), "filename": filename})
    await db.commit()
    return file_row


async def trash_file(db: AsyncSession, user_id: UUID, file_id: UUID) -> File | None:
    """Soft-delete: marks the file deleted_at=now(). Reversible via
    restore_file() until the retention window expires. Never touches
    Google Drive — the real Drive object only goes away at purge time."""
    result = await db.execute(select(File).where(File.id == file_id, File.user_id == user_id, File.deleted_at.is_(None)))
    file_row = result.scalar_one_or_none()
    if file_row is None:
        return None
    file_row.deleted_at = datetime.now(timezone.utc)
    log_action(db, user_id, "file_trash", {"file_id": str(file_id), "filename": file_row.filename})
    await db.commit()
    return file_row


async def restore_file(db: AsyncSession, user_id: UUID, file_id: UUID) -> File | None:
    result = await db.execute(
        select(File).where(File.id == file_id, File.user_id == user_id, File.deleted_at.is_not(None))
    )
    file_row = result.scalar_one_or_none()
    if file_row is None:
        return None

    target_folder_id = file_row.folder_id
    if target_folder_id is not None:
        folder = await db.get(Folder, target_folder_id)
        # Parent folder was purged, or is still sitting in Trash itself —
        # restoring into either would leave the file in limbo, so it comes
        # back to the root instead. Restoring the parent folder (which
        # brings its trashed files back too, see restore_folder_tree) is
        # the normal way to get both back together.
        if folder is None or folder.deleted_at is not None:
            target_folder_id = None

    restored_name = await _unique_file_name_for_restore(db, user_id, target_folder_id, file_row.filename, file_row.id)
    file_row.folder_id = target_folder_id
    file_row.filename = restored_name
    file_row.deleted_at = None
    log_action(db, user_id, "file_restore", {"file_id": str(file_id), "filename": restored_name})
    await db.commit()
    return file_row


async def collect_folder_subtree(
    db: AsyncSession, user_id: UUID, folder_id: UUID, include_trashed: bool = False
) -> list[UUID]:
    """Root folder id followed by every descendant folder id, breadth-first
    (root-to-leaf order — deleting in reverse order is child-before-parent,
    which the parent_folder_id foreign key requires). By default only walks
    through live folders — pass include_trashed=True when restoring a
    trashed tree, where the whole subtree (already trashed) needs to be
    found regardless of its deleted_at state."""
    all_ids = [folder_id]
    frontier = [folder_id]
    while frontier:
        stmt = select(Folder.id).where(Folder.parent_folder_id.in_(frontier), Folder.user_id == user_id)
        if not include_trashed:
            stmt = stmt.where(Folder.deleted_at.is_(None))
        result = await db.execute(stmt)
        children = [row[0] for row in result.all()]
        if not children:
            break
        all_ids.extend(children)
        frontier = children
    return all_ids


async def trash_folder_tree(db: AsyncSession, user_id: UUID, folder_id: UUID) -> tuple[int, int] | None:
    """Soft-deletes a folder and every live subfolder/file beneath it in one
    bulk update — one commit, one timestamp shared across the whole tree
    (unlike purge_folder_tree, which still needs to process files one at a
    time for their real Drive deletes)."""
    root = await db.get(Folder, folder_id)
    if root is None or root.user_id != user_id or root.deleted_at is not None:
        return None

    folder_ids = await collect_folder_subtree(db, user_id, folder_id)
    files_result = await db.execute(
        select(File.id).where(File.folder_id.in_(folder_ids), File.user_id == user_id, File.deleted_at.is_(None))
    )
    file_ids = [row[0] for row in files_result.all()]

    now = datetime.now(timezone.utc)
    if file_ids:
        await db.execute(update(File).where(File.id.in_(file_ids)).values(deleted_at=now))
    await db.execute(update(Folder).where(Folder.id.in_(folder_ids)).values(deleted_at=now))
    log_action(
        db,
        user_id,
        "folder_trash",
        {"folder_id": str(folder_id), "name": root.name, "files_trashed": len(file_ids), "folders_trashed": len(folder_ids)},
    )
    await db.commit()
    return len(file_ids), len(folder_ids)


async def restore_folder_tree(db: AsyncSession, user_id: UUID, folder_id: UUID) -> Folder | None:
    """Restores a trashed folder, every descendant folder beneath it
    (trashed as part of the same or a later trash action), and every
    trashed file directly inside any of them — the natural counterpart to
    trash_folder_tree."""
    root = await db.get(Folder, folder_id)
    if root is None or root.user_id != user_id or root.deleted_at is None:
        return None

    folder_ids = await collect_folder_subtree(db, user_id, folder_id, include_trashed=True)

    target_parent_id = root.parent_folder_id
    if target_parent_id is not None:
        parent = await db.get(Folder, target_parent_id)
        if parent is None or parent.deleted_at is not None:
            target_parent_id = None

    restored_name = await _unique_folder_name_for_restore(db, user_id, target_parent_id, root.name, root.id)

    await db.execute(update(Folder).where(Folder.id.in_(folder_ids)).values(deleted_at=None))
    await db.execute(
        update(File)
        .where(File.folder_id.in_(folder_ids), File.user_id == user_id, File.deleted_at.is_not(None))
        .values(deleted_at=None)
    )
    root.parent_folder_id = target_parent_id
    root.name = restored_name
    log_action(
        db, user_id, "folder_restore", {"folder_id": str(folder_id), "name": restored_name, "folders_restored": len(folder_ids)}
    )
    await db.commit()
    await db.refresh(root)
    return root


async def purge_folder_tree(db: AsyncSession, user_id: UUID, folder_id: UUID) -> tuple[int, int] | None:
    """Permanently deletes a folder, every subfolder beneath it (trashed or
    not — this is the real, final removal), and every file inside any of
    them via purge_file (real Google Drive deletion, dedup-aware). Used by
    the "Delete forever" action and the scheduled trash sweep."""
    root = await db.get(Folder, folder_id)
    if root is None or root.user_id != user_id:
        return None

    folder_ids = await collect_folder_subtree(db, user_id, folder_id, include_trashed=True)
    files_result = await db.execute(select(File.id).where(File.folder_id.in_(folder_ids), File.user_id == user_id))
    file_ids = [row[0] for row in files_result.all()]

    for file_id in file_ids:
        await purge_file(db, user_id, file_id)

    for fid in reversed(folder_ids):
        folder = await db.get(Folder, fid)
        if folder is not None:
            await db.delete(folder)
    log_action(
        db,
        user_id,
        "folder_purge",
        {"folder_id": str(folder_id), "name": root.name, "files_purged": len(file_ids), "folders_purged": len(folder_ids)},
    )
    await db.commit()

    return len(file_ids), len(folder_ids)
