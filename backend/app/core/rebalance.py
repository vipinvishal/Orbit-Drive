import logging
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.crypto import decrypt_token
from app.connectors.google_drive import GoogleDriveConnector
from app.core.audit import log_action
from app.models import File, FileObject, GoogleAccount, Job, User

logger = logging.getLogger("orbit_drive.rebalance")

# Same margin placement.py uses at upload time — cached quota numbers can be
# stale, so this absorbs that instead of a move failing mid-flight because
# the destination turned out to have less room than we thought.
SAFETY_MARGIN_BYTES = 100 * 1024 * 1024
# Below this many percentage points of difference, accounts count as
# "balanced enough" — not worth moving anything.
IMBALANCE_THRESHOLD = 0.15
# Manual, synchronous trigger (v1 — no background automation), so this caps
# how long a single request can run and how many real Drive API round
# trips happen in one burst.
MAX_FILES_PER_RUN = 15


@dataclass
class RebalanceResult:
    moved_files: int
    moved_bytes: int
    message: str


def _usage_ratio(account: GoogleAccount) -> float:
    if not account.total_quota_bytes:
        return 0.0
    return (account.used_quota_bytes or 0) / account.total_quota_bytes


def _pick_rebalance_pair(accounts: list[GoogleAccount]) -> tuple[GoogleAccount, GoogleAccount] | None:
    usable = [a for a in accounts if a.status == "active" and a.total_quota_bytes]
    if len(usable) < 2:
        return None
    ranked = sorted(usable, key=_usage_ratio, reverse=True)
    fullest, emptiest = ranked[0], ranked[-1]
    if _usage_ratio(fullest) - _usage_ratio(emptiest) < IMBALANCE_THRESHOLD:
        return None
    return fullest, emptiest


async def _move_file_object(db: AsyncSession, source: GoogleAccount, dest: GoogleAccount, file_object: FileObject) -> None:
    """download from source -> upload to dest -> best-effort delete from
    source -> repoint the FileObject row. There's no atomic "move" in the
    Drive API (see connectors/google_drive.py), so this is composed from
    the same primitives execute_upload already uses. If the delete step
    fails, the file briefly exists on both accounts rather than neither —
    the safer failure direction — logged, not raised, so one bad delete
    doesn't abort the whole run."""
    source_refresh = decrypt_token(source.refresh_token_enc)
    dest_refresh = decrypt_token(dest.refresh_token_enc)
    connector = GoogleDriveConnector()

    content = await connector.download(source_refresh, file_object.google_file_id)

    file_row = (
        await db.execute(select(File).where(File.file_object_id == file_object.id).limit(1))
    ).scalar_one_or_none()
    filename = file_row.filename if file_row else "file"
    mime_type = file_row.mime_type if file_row else None

    upload_result = await connector.upload(dest_refresh, filename, content, mime_type)
    old_google_file_id = file_object.google_file_id
    old_size = file_object.size_bytes

    try:
        await connector.delete(source_refresh, old_google_file_id)
    except Exception:
        logger.exception("rebalance: failed to delete source copy %s after moving to %s", old_google_file_id, dest.id)

    file_object.google_account_id = dest.id
    file_object.google_file_id = upload_result.provider_file_id
    # Optimistic; both accounts get a quota_refresh Job queued by the
    # caller once the whole run finishes, to reconcile with real numbers.
    source.used_quota_bytes = max((source.used_quota_bytes or 0) - old_size, 0)
    dest.used_quota_bytes = (dest.used_quota_bytes or 0) + old_size
    await db.commit()


async def run_rebalance(db: AsyncSession, user: User) -> RebalanceResult:
    accounts = (await db.execute(select(GoogleAccount).where(GoogleAccount.user_id == user.id))).scalars().all()
    usable = [a for a in accounts if a.status == "active" and a.total_quota_bytes]
    if len(usable) < 2:
        return RebalanceResult(0, 0, "Rebalancing needs at least two connected, active accounts.")

    pair = _pick_rebalance_pair(list(accounts))
    if pair is None:
        return RebalanceResult(0, 0, "Your accounts are already balanced — nothing to move.")
    source, dest = pair

    target_ratio = (_usage_ratio(source) + _usage_ratio(dest)) / 2
    bytes_to_move = int((source.used_quota_bytes or 0) - target_ratio * (source.total_quota_bytes or 0))
    dest_free = (dest.total_quota_bytes or 0) - (dest.used_quota_bytes or 0) - SAFETY_MARGIN_BYTES
    bytes_budget = min(bytes_to_move, max(dest_free, 0))

    if bytes_budget <= 0:
        return RebalanceResult(0, 0, f"{dest.google_email} doesn't have enough free room to take anything right now.")

    candidates_result = await db.execute(
        select(FileObject)
        .where(FileObject.google_account_id == source.id, FileObject.owner_user_id == user.id)
        .order_by(FileObject.size_bytes.desc())
    )
    candidates = list(candidates_result.scalars().all())

    moved_files = 0
    moved_bytes = 0
    for file_object in candidates:
        if moved_files >= MAX_FILES_PER_RUN or moved_bytes >= bytes_budget:
            break
        remaining_budget = bytes_budget - moved_bytes
        if file_object.size_bytes > remaining_budget:
            continue
        try:
            await _move_file_object(db, source, dest, file_object)
        except Exception:
            logger.exception("rebalance: failed to move file_object %s", file_object.id)
            continue
        moved_files += 1
        moved_bytes += file_object.size_bytes

    if moved_files == 0:
        return RebalanceResult(0, 0, "Couldn't find anything that would safely fit — try again after a quota refresh.")

    log_action(
        db,
        user.id,
        "rebalance",
        {"from": source.google_email, "to": dest.google_email, "files_moved": moved_files, "bytes_moved": moved_bytes},
    )
    db.add(Job(job_type="quota_refresh", payload={"google_account_id": str(source.id)}))
    db.add(Job(job_type="quota_refresh", payload={"google_account_id": str(dest.id)}))
    await db.commit()

    gb = moved_bytes / (1024**3)
    return RebalanceResult(
        moved_files,
        moved_bytes,
        f"Moved {moved_files} file{'s' if moved_files != 1 else ''} ({gb:.1f} GB) from {source.google_email} to {dest.google_email}.",
    )
