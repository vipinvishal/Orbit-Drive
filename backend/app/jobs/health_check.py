from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.crypto import decrypt_token
from app.connectors.google_drive import GoogleDriveConnector
from app.models import GoogleAccount


async def run_health_check(db: AsyncSession, google_account_id: UUID) -> None:
    account = await db.get(GoogleAccount, google_account_id)
    if account is None:
        return

    refresh_token = decrypt_token(account.refresh_token_enc)
    connector = GoogleDriveConnector()
    healthy = await connector.health_check(refresh_token)

    if not healthy:
        account.status = "error"
        await db.commit()
