from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.core.categories import categorize
from app.db.session import get_db
from app.models import File, GoogleAccount, User
from app.schemas import StorageBreakdownResponse, StorageSummaryResponse

router = APIRouter(prefix="/storage", tags=["storage"])


@router.get("/summary", response_model=StorageSummaryResponse)
async def storage_summary(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> StorageSummaryResponse:
    result = await db.execute(
        select(
            func.coalesce(func.sum(GoogleAccount.total_quota_bytes), 0),
            func.coalesce(func.sum(GoogleAccount.used_quota_bytes), 0),
        ).where(GoogleAccount.user_id == current_user.id, GoogleAccount.status == "active")
    )
    total_quota_bytes, used_quota_bytes = result.one()
    return StorageSummaryResponse(
        total_quota_bytes=total_quota_bytes,
        used_quota_bytes=used_quota_bytes,
        remaining_bytes=total_quota_bytes - used_quota_bytes,
    )


@router.get("/breakdown", response_model=StorageBreakdownResponse)
async def storage_breakdown(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> StorageBreakdownResponse:
    # Grouped by raw mime_type first (bounded by distinct mime types, not
    # file count) then folded into four buckets in Python — simpler than a
    # SQL CASE expression and plenty fast at personal-drive scale.
    result = await db.execute(
        select(File.mime_type, func.sum(File.size_bytes)).where(File.user_id == current_user.id).group_by(File.mime_type)
    )
    totals = {"image": 0, "video": 0, "document": 0, "other": 0}
    for mime_type, size in result.all():
        totals[categorize(mime_type)] += size or 0
    return StorageBreakdownResponse(
        images_bytes=totals["image"],
        videos_bytes=totals["video"],
        documents_bytes=totals["document"],
        other_bytes=totals["other"],
    )
