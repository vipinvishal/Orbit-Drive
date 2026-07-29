from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.crypto import decrypt_token
from app.connectors.google_drive import GoogleDriveConnector
from app.models import File, FileObject, GoogleAccount


async def resolve_and_download(db: AsyncSession, user_id: UUID, file_id: UUID) -> tuple[File, bytes] | None:
    """Resolve a File to the Google account that actually holds it and
    stream its bytes back — transparent to the caller, per mvp.md §9."""
    result = await db.execute(select(File).where(File.id == file_id, File.user_id == user_id))
    file_row = result.scalar_one_or_none()
    if file_row is None or file_row.file_object_id is None:
        return None

    file_object = await db.get(FileObject, file_row.file_object_id)
    if file_object is None or file_object.google_account_id is None:
        return None

    account = await db.get(GoogleAccount, file_object.google_account_id)
    if account is None:
        return None

    refresh_token = decrypt_token(account.refresh_token_enc)
    connector = GoogleDriveConnector()
    content = await connector.download(refresh_token, file_object.google_file_id)
    return file_row, content
