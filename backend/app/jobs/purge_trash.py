import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deletion import purge_file, purge_folder_tree
from app.models import File, Folder

logger = logging.getLogger("orbit_drive.jobs")

TRASH_RETENTION = timedelta(days=30)


async def run_purge_trash(db: AsyncSession) -> None:
    """Permanently removes anything that's been sitting in Trash past the
    retention window — real Google Drive deletes for files, via the same
    purge_file/purge_folder_tree logic "Delete forever" uses.

    Folders and files expire independently on their own deleted_at, not as
    one combined tree: a folder's purge already recurses through its whole
    subtree (see purge_folder_tree), so only the *root* of an expired
    trashed folder chain is purged directly here. A file past its own
    retention window is purged on its own regardless of whether its parent
    folder is expired yet — file and folder trash are tracked separately.
    """
    cutoff = datetime.now(timezone.utc) - TRASH_RETENTION

    folders_result = await db.execute(select(Folder).where(Folder.deleted_at.is_not(None), Folder.deleted_at < cutoff))
    expired_folders = list(folders_result.scalars().all())
    expired_folder_ids = {f.id for f in expired_folders}
    top_folders = [f for f in expired_folders if f.parent_folder_id is None or f.parent_folder_id not in expired_folder_ids]

    for folder in top_folders:
        try:
            await purge_folder_tree(db, folder.user_id, folder.id)
        except Exception:
            logger.exception("purge_trash: failed to purge folder %s", folder.id)

    # Queried after the folder pass above, so files already removed by a
    # folder purge (they lived inside one of top_folders' subtrees) no
    # longer show up here — no double-processing.
    files_result = await db.execute(select(File).where(File.deleted_at.is_not(None), File.deleted_at < cutoff))
    for file_row in files_result.scalars().all():
        try:
            await purge_file(db, file_row.user_id, file_row.id)
        except Exception:
            logger.exception("purge_trash: failed to purge file %s", file_row.id)
