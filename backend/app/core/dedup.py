from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import File, FileObject


async def check_dedup(
    db: AsyncSession, user_id: UUID, folder_id: UUID | None, filename: str, checksum_sha256: str
) -> tuple[FileObject | None, bool]:
    """Single round trip covering both dedup checks that used to be two
    separate queries: does a FileObject with this content already exist for
    this user (reuse it, skip the Drive upload), and does a File with this
    exact name already exist in this exact folder pointing at it (reject as
    a duplicate)? Returns (existing_file_object_or_None, is_exact_duplicate).
    """
    stmt = (
        select(FileObject, File.id)
        .outerjoin(
            File,
            and_(
                File.file_object_id == FileObject.id,
                File.folder_id == folder_id,
                File.filename == filename,
            ),
        )
        .where(FileObject.owner_user_id == user_id, FileObject.checksum_sha256 == checksum_sha256)
        .limit(1)
    )
    row = (await db.execute(stmt)).first()
    if row is None:
        return None, False
    file_object, existing_file_id = row
    return file_object, existing_file_id is not None
