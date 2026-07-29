import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import GoogleAccount

logger = logging.getLogger("orbit_drive.placement")

# Quota numbers are cached (refreshed by the quota_refresh job), not live —
# this margin absorbs staleness so an upload doesn't fail mid-transfer
# because the cached "free space" turned out to be optimistic. See mvp.md §7.
SAFETY_MARGIN_BYTES = 100 * 1024 * 1024


async def pick_destination_account(db: AsyncSession, user_id: UUID, file_size_bytes: int) -> GoogleAccount | None:
    free_space = GoogleAccount.total_quota_bytes - GoogleAccount.used_quota_bytes
    stmt = (
        select(GoogleAccount)
        .where(
            GoogleAccount.user_id == user_id,
            GoogleAccount.status == "active",
            GoogleAccount.total_quota_bytes.is_not(None),
            GoogleAccount.used_quota_bytes.is_not(None),
            free_space > (file_size_bytes + SAFETY_MARGIN_BYTES),
        )
        # Greedy: most free space wins. Simplest correct v1 strategy — see mvp.md §7.
        .order_by(free_space.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    chosen = result.scalar_one_or_none()

    if chosen is None:
        all_accounts = (await db.execute(select(GoogleAccount).where(GoogleAccount.user_id == user_id))).scalars().all()
        logger.warning(
            "placement found no candidate: user=%s file_size_bytes=%d safety_margin=%d accounts=%s",
            user_id,
            file_size_bytes,
            SAFETY_MARGIN_BYTES,
            [
                {
                    "id": str(a.id),
                    "email": a.google_email,
                    "status": a.status,
                    "total": a.total_quota_bytes,
                    "used": a.used_quota_bytes,
                }
                for a in all_accounts
            ],
        )
    else:
        logger.info("placement chose account=%s (%s) for file_size_bytes=%d", chosen.id, chosen.google_email, file_size_bytes)

    return chosen
