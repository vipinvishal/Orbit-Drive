import base64
import logging
import uuid
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("orbit_drive.pipeline")

from app.auth.crypto import decrypt_token
from app.connectors.google_drive import GoogleDriveConnector
from app.core.audit import log_action
from app.core.dedup import check_dedup
from app.core.hashing import sha256_hex
from app.core.placement import pick_destination_account
from app.models import File, FileObject, Job


class NoSpaceAvailableError(Exception):
    pass


class UploadQueuedForRetryError(Exception):
    pass


class DuplicateFileError(Exception):
    pass


async def execute_upload(
    db: AsyncSession,
    user_id: UUID,
    filename: str,
    content: bytes,
    mime_type: str | None,
    folder_id: UUID | None,
) -> File:
    """One raw attempt: hash -> dedup check -> placement -> connector upload
    -> metadata writes. Raises NoSpaceAvailableError or whatever the
    connector raises — no retry-queueing here, so the retry_upload job
    handler can call this directly without double-queueing on failure.

    DB round trips are kept to a minimum (each one costs real latency to
    Supabase): one combined dedup/duplicate check, one placement check (new
    content only), one final commit. IDs and timestamps are generated
    client-side rather than relying on server defaults, so no flush/refresh
    round trip is needed to read them back.
    """
    checksum = sha256_hex(content)
    size_bytes = len(content)
    now = datetime.now(timezone.utc)

    existing_object, is_duplicate = await check_dedup(db, user_id, folder_id, filename, checksum)
    if is_duplicate:
        raise DuplicateFileError()

    if existing_object is not None:
        file_row = File(
            id=uuid.uuid4(),
            user_id=user_id,
            folder_id=folder_id,
            filename=filename,
            file_object_id=existing_object.id,
            size_bytes=size_bytes,
            mime_type=mime_type,
            created_at=now,
            updated_at=now,
        )
        db.add(file_row)
        log_action(db, user_id, "file_upload", {"filename": filename, "size_bytes": size_bytes, "deduped": True})
        await db.commit()
        return file_row

    account = await pick_destination_account(db, user_id, size_bytes)
    if account is None:
        raise NoSpaceAvailableError()

    refresh_token = decrypt_token(account.refresh_token_enc)
    connector = GoogleDriveConnector()
    upload_result = await connector.upload(refresh_token, filename, content, mime_type)

    file_object = FileObject(
        id=uuid.uuid4(),
        checksum_sha256=checksum,
        owner_user_id=user_id,
        google_account_id=account.id,
        google_file_id=upload_result.provider_file_id,
        size_bytes=size_bytes,
        created_at=now,
    )
    db.add(file_object)

    file_row = File(
        id=uuid.uuid4(),
        user_id=user_id,
        folder_id=folder_id,
        filename=filename,
        file_object_id=file_object.id,
        size_bytes=size_bytes,
        mime_type=mime_type,
        created_at=now,
        updated_at=now,
    )
    db.add(file_row)

    # Optimistic update; reconciled by the quota_refresh job enqueued below.
    account.used_quota_bytes = (account.used_quota_bytes or 0) + size_bytes

    db.add(Job(job_type="quota_refresh", payload={"google_account_id": str(account.id)}))
    log_action(db, user_id, "file_upload", {"filename": filename, "size_bytes": size_bytes, "deduped": False})

    await db.commit()
    return file_row


async def upload_file(
    db: AsyncSession,
    user_id: UUID,
    filename: str,
    content: bytes,
    mime_type: str | None,
    folder_id: UUID | None,
) -> File:
    """Entry point for the live API request: one attempt, and on a
    transient failure (not NoSpaceAvailableError, which is a permanent
    condition the user must act on), queue a retry_upload job instead of
    failing the user's request silently. mvp.md §11 Phase 4."""
    try:
        return await execute_upload(db, user_id, filename, content, mime_type, folder_id)
    except (NoSpaceAvailableError, DuplicateFileError):
        raise
    except Exception:
        logger.exception("upload of %r failed on first attempt, queueing retry_upload job", filename)
        db.add(
            Job(
                job_type="retry_upload",
                payload={
                    "user_id": str(user_id),
                    "folder_id": str(folder_id) if folder_id else None,
                    "filename": filename,
                    "mime_type": mime_type,
                    # MVP-scale compromise: small files only, given JSONB storage.
                    "content_b64": base64.b64encode(content).decode(),
                },
            )
        )
        await db.commit()
        raise UploadQueuedForRetryError()
