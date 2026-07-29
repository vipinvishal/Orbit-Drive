from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.crypto import decrypt_token
from app.connectors.google_drive import GoogleDriveConnector
from app.models import GoogleAccount


async def run_quota_refresh(db: AsyncSession, google_account_id: UUID) -> None:
    account = await db.get(GoogleAccount, google_account_id)
    if account is None or account.status != "active":
        return

    refresh_token = decrypt_token(account.refresh_token_enc)
    connector = GoogleDriveConnector()
    quota = await connector.get_quota(refresh_token)

    account.total_quota_bytes = quota.total_bytes
    account.used_quota_bytes = quota.used_bytes
    account.last_quota_check_at = datetime.now(timezone.utc)
    await db.commit()
