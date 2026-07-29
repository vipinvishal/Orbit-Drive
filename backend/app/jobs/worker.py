import asyncio
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pipeline import DuplicateFileError
from app.db.session import AsyncSessionLocal
from app.jobs.health_check import run_health_check
from app.jobs.quota_refresh import run_quota_refresh
from app.jobs.retry_upload import run_retry_upload
from app.models import GoogleAccount, Job

logger = logging.getLogger("orbit_drive.jobs")

POLL_INTERVAL_SECONDS = 30
PERIODIC_QUOTA_REFRESH_INTERVAL = timedelta(minutes=20)
PERIODIC_HEALTH_CHECK_INTERVAL = timedelta(minutes=45)
MAX_ATTEMPTS = 10
BASE_BACKOFF_SECONDS = 30


def _due_for_retry(job: Job, now: datetime) -> bool:
    if job.attempts == 0:
        return True
    backoff = timedelta(seconds=min(BASE_BACKOFF_SECONDS * (2**job.attempts), 1800))
    return now - job.updated_at >= backoff


async def _process_job(db: AsyncSession, job: Job) -> None:
    try:
        if job.job_type == "quota_refresh":
            await run_quota_refresh(db, UUID(job.payload["google_account_id"]))
        elif job.job_type == "retry_upload":
            await run_retry_upload(db, job.payload)
        elif job.job_type == "health_check":
            await run_health_check(db, UUID(job.payload["google_account_id"]))
        else:
            logger.warning("unknown job_type %s on job %s", job.job_type, job.id)
        job.status = "done"
    except DuplicateFileError:
        # The file this retry would create already exists (e.g. uploaded
        # successfully another way while this job sat pending) — nothing
        # left to do, and retrying forever would never resolve it.
        logger.info("retry_upload job %s skipped: duplicate already exists", job.id)
        job.status = "done"
    except Exception:
        logger.exception("job %s (%s) failed", job.id, job.job_type)
        job.attempts += 1
        job.status = "failed" if job.attempts >= MAX_ATTEMPTS else "pending"
    job.updated_at = datetime.now(timezone.utc)
    await db.commit()


async def _process_pending_jobs(db: AsyncSession) -> None:
    result = await db.execute(select(Job).where(Job.status == "pending").order_by(Job.created_at).limit(50))
    now = datetime.now(timezone.utc)
    for job in result.scalars().all():
        if _due_for_retry(job, now):
            await _process_job(db, job)


async def _enqueue_periodic(db: AsyncSession, job_type: str) -> None:
    accounts = (await db.execute(select(GoogleAccount).where(GoogleAccount.status == "active"))).scalars().all()
    for account in accounts:
        already_pending = (
            await db.execute(
                select(Job.id).where(
                    Job.job_type == job_type,
                    Job.status == "pending",
                    Job.payload["google_account_id"].astext == str(account.id),
                )
            )
        ).scalar_one_or_none()
        if already_pending is None:
            db.add(Job(job_type=job_type, payload={"google_account_id": str(account.id)}))
    await db.commit()


async def run_worker_loop(stop_event: asyncio.Event) -> None:
    last_quota_refresh_run = datetime.min.replace(tzinfo=timezone.utc)
    last_health_check_run = datetime.min.replace(tzinfo=timezone.utc)

    while not stop_event.is_set():
        try:
            async with AsyncSessionLocal() as db:
                now = datetime.now(timezone.utc)
                if now - last_quota_refresh_run >= PERIODIC_QUOTA_REFRESH_INTERVAL:
                    await _enqueue_periodic(db, "quota_refresh")
                    last_quota_refresh_run = now
                if now - last_health_check_run >= PERIODIC_HEALTH_CHECK_INTERVAL:
                    await _enqueue_periodic(db, "health_check")
                    last_health_check_run = now
                await _process_pending_jobs(db)
        except Exception:
            logger.exception("worker loop iteration failed")

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=POLL_INTERVAL_SECONDS)
        except asyncio.TimeoutError:
            pass
