import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy import delete as sql_delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.crypto import decrypt_token, encrypt_token
from app.auth.deps import get_current_user
from app.auth.google_oauth import (
    credentials_expiry,
    exchange_code,
    fetch_drive_about,
    generate_code_verifier,
    get_authorization_url,
)
from app.auth.security import (
    create_oauth_state_token,
    decode_access_token,
    decode_login_state_token,
    decode_oauth_state_token,
)
from app.config import settings
from app.connectors.google_drive import GoogleDriveConnector
from app.core.audit import log_action
from app.core.folder_path import build_folder_path_fn
from app.core.rebalance import run_rebalance
from app.db.session import get_db
from app.jobs.quota_refresh import run_quota_refresh
from app.models import File, FileObject, GoogleAccount, User
from app.schemas import AccountFileResponse, GoogleAccountResponse, RebalanceResponse

logger = logging.getLogger("orbit_drive.api.accounts")

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("/google/connect")
async def google_connect(access_token: str) -> RedirectResponse:
    """
    Plain-navigation endpoint: the frontend sends the user here via
    `window.location.href`, so auth travels as a query param (not a header)
    and this issues a real 302 to Google's consent screen.
    """
    user_id = decode_access_token(access_token)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    code_verifier = generate_code_verifier()
    state = create_oauth_state_token(user_id, code_verifier)
    return RedirectResponse(get_authorization_url(state, code_verifier))


@router.get("/google/callback")
async def google_callback(code: str, state: str, db: AsyncSession = Depends(get_db)) -> RedirectResponse:
    # Google only ever redirects to this one registered callback URI, so it
    # also serves the Google-first login flow (app.api.auth.google_login) —
    # dispatched here by the state token's purpose rather than a second
    # registered redirect URI.
    decoded = decode_oauth_state_token(state)
    if decoded is None:
        login_code_verifier = decode_login_state_token(state)
        if login_code_verifier is not None:
            from app.api.auth import handle_google_login_callback

            return await handle_google_login_callback(code, login_code_verifier, db)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OAuth state")
    user_id, code_verifier = decoded

    credentials = exchange_code(code, code_verifier)
    about = fetch_drive_about(credentials)
    email = about["user"]["emailAddress"]
    quota = about.get("storageQuota", {})
    total_quota = int(quota["limit"]) if "limit" in quota else None
    used_quota = int(quota["usage"]) if "usage" in quota else None

    existing = await db.execute(
        select(GoogleAccount).where(GoogleAccount.user_id == user_id, GoogleAccount.google_email == email)
    )
    account = existing.scalar_one_or_none()

    if not credentials.refresh_token and account is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google did not return a refresh token. Revoke Orbit Drive's access in your Google "
            "Account settings and try connecting again.",
        )

    access_enc = encrypt_token(credentials.token)
    refresh_enc = encrypt_token(credentials.refresh_token) if credentials.refresh_token else account.refresh_token_enc
    expiry = credentials_expiry(credentials)
    now = datetime.now(timezone.utc)

    if account is None:
        account = GoogleAccount(
            user_id=user_id,
            google_email=email,
            access_token_enc=access_enc,
            refresh_token_enc=refresh_enc,
            token_expiry=expiry,
            total_quota_bytes=total_quota,
            used_quota_bytes=used_quota,
            status="active",
            last_quota_check_at=now,
        )
        db.add(account)
    else:
        account.access_token_enc = access_enc
        account.refresh_token_enc = refresh_enc
        account.token_expiry = expiry
        account.total_quota_bytes = total_quota
        account.used_quota_bytes = used_quota
        account.status = "active"
        account.last_quota_check_at = now

    log_action(db, user_id, "account_connected", {"google_email": email})
    await db.commit()

    return RedirectResponse(f"{settings.frontend_url}/accounts?connected=1")


@router.get("", response_model=list[GoogleAccountResponse])
async def list_accounts(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[GoogleAccount]:
    result = await db.execute(
        select(GoogleAccount).where(GoogleAccount.user_id == current_user.id).order_by(GoogleAccount.created_at)
    )
    return list(result.scalars().all())


@router.post("/rebalance", response_model=RebalanceResponse)
async def rebalance_accounts(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> RebalanceResponse:
    """Manual, on-demand only (v1) — moves files from whichever connected
    account is fullest to whichever has the most free room, real Drive API
    calls, capped per run. No background automation yet; see
    app/core/rebalance.py for the full mechanism."""
    result = await run_rebalance(db, current_user)
    return RebalanceResponse(moved_files=result.moved_files, moved_bytes=result.moved_bytes, message=result.message)


@router.post("/{account_id}/refresh-quota", response_model=GoogleAccountResponse)
async def refresh_account_quota(
    account_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> GoogleAccount:
    result = await db.execute(
        select(GoogleAccount).where(GoogleAccount.id == account_id, GoogleAccount.user_id == current_user.id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    # Reuses the same live-quota logic the background job runs periodically —
    # this just lets the user pull fresh numbers on demand instead of waiting.
    await run_quota_refresh(db, account_id)
    await db.refresh(account)
    return account


@router.get("/{account_id}/files", response_model=list[AccountFileResponse])
async def list_account_files(
    account_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[AccountFileResponse]:
    """Per-account file browser (Accounts page 'View files') and the
    disconnect-confirmation dialog both use this — the only two places
    Orbit Drive exposes which account holds which file, since normal
    browsing deliberately never does."""
    account_result = await db.execute(
        select(GoogleAccount).where(GoogleAccount.id == account_id, GoogleAccount.user_id == current_user.id)
    )
    if account_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    result = await db.execute(
        select(File)
        .join(FileObject, FileObject.id == File.file_object_id)
        .where(FileObject.google_account_id == account_id, File.user_id == current_user.id)
        .order_by(File.filename)
    )
    files = list(result.scalars().all())
    folder_path = await build_folder_path_fn(db, current_user.id)

    return [
        AccountFileResponse.model_validate(f).model_copy(update={"folder_path": folder_path(f.folder_id)})
        for f in files
    ]


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_account(
    account_id: UUID,
    force: bool = Query(False),
    delete_from_drive: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(GoogleAccount).where(GoogleAccount.id == account_id, GoogleAccount.user_id == current_user.id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    file_objects_result = await db.execute(
        select(FileObject).where(FileObject.google_account_id == account_id)
    )
    file_objects = list(file_objects_result.scalars().all())

    if file_objects and not force:
        # Orbit Drive deliberately never shows which account holds which
        # file, so asking the user to go find and delete them manually
        # first isn't a reasonable ask — the caller re-requests with
        # force=true (after confirming) to cascade instead.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This account still has {len(file_objects)} file{'s' if len(file_objects) != 1 else ''} stored on it.",
        )

    if file_objects and delete_from_drive:
        refresh_token = decrypt_token(account.refresh_token_enc)
        connector = GoogleDriveConnector()
        for file_object in file_objects:
            try:
                await connector.delete(refresh_token, file_object.google_file_id)
            except Exception:
                # Best-effort: still fully clean up Orbit Drive's own state
                # below even if a given Drive file was already gone, or the
                # call otherwise failed.
                logger.exception(
                    "failed to delete Drive file %s (file_object %s) during account disconnect",
                    file_object.google_file_id,
                    file_object.id,
                )

    if file_objects:
        file_object_ids = select(FileObject.id).where(FileObject.google_account_id == account_id)
        await db.execute(sql_delete(File).where(File.file_object_id.in_(file_object_ids)))
        await db.execute(sql_delete(FileObject).where(FileObject.google_account_id == account_id))

    google_email = account.google_email
    await db.delete(account)
    log_action(
        db,
        current_user.id,
        "account_disconnected",
        {
            "google_email": google_email,
            "files_untracked": len(file_objects),
            "deleted_from_drive": delete_from_drive and bool(file_objects),
        },
    )
    await db.commit()
