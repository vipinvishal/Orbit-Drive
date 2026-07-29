from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.crypto import decrypt_token
from app.connectors.google_drive import GoogleDriveConnector
from app.core.audit import log_action
from app.models import File, FileObject, Folder, GoogleAccount


async def delete_file(db: AsyncSession, user_id: UUID, file_id: UUID) -> File | None:
    """Minimizes round trips to Supabase (each one is real, measurable
    latency): one join to fetch the file plus its object/account in one
    shot, one count to check for other references, one commit. ORM-tracked
    entities from the join let both deletes ride the same final commit
    instead of each needing their own round trip."""
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
        # Dedup means other `files` rows may still reference this same
        # file_object — only remove the underlying Drive file (and its
        # file_objects row) once nothing else needs it.
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
    log_action(db, user_id, "file_delete", {"file_id": str(file_id), "filename": filename})
    await db.commit()
    return file_row


async def collect_folder_subtree(db: AsyncSession, user_id: UUID, folder_id: UUID) -> list[UUID]:
    """Root folder id followed by every descendant folder id, breadth-first
    (root-to-leaf order — deleting in reverse order is child-before-parent,
    which the parent_folder_id foreign key requires)."""
    all_ids = [folder_id]
    frontier = [folder_id]
    while frontier:
        result = await db.execute(select(Folder.id).where(Folder.parent_folder_id.in_(frontier), Folder.user_id == user_id))
        children = [row[0] for row in result.all()]
        if not children:
            break
        all_ids.extend(children)
        frontier = children
    return all_ids


async def delete_folder_tree(db: AsyncSession, user_id: UUID, folder_id: UUID) -> tuple[int, int]:
    """Recursively deletes a folder, every subfolder beneath it, and every
    file inside any of them — each file going through the exact same
    dedup-aware, real-Drive-deleting logic as a single file delete. Returns
    (files_deleted, folders_deleted)."""
    folder_ids = await collect_folder_subtree(db, user_id, folder_id)
    root_folder = await db.get(Folder, folder_id)
    root_name = root_folder.name if root_folder is not None else "unknown"

    files_result = await db.execute(select(File.id).where(File.folder_id.in_(folder_ids), File.user_id == user_id))
    file_ids = [row[0] for row in files_result.all()]

    for file_id in file_ids:
        await delete_file(db, user_id, file_id)

    for fid in reversed(folder_ids):
        folder = await db.get(Folder, fid)
        if folder is not None:
            await db.delete(folder)
    log_action(
        db,
        user_id,
        "folder_delete",
        {"folder_id": str(folder_id), "name": root_name, "files_deleted": len(file_ids), "folders_deleted": len(folder_ids)},
    )
    await db.commit()

    return len(file_ids), len(folder_ids)
