import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.crypto import encrypt_token
from app.auth.google_oauth import (
    credentials_expiry,
    exchange_code,
    fetch_drive_about,
    generate_code_verifier,
    get_authorization_url,
)
from app.auth.security import (
    create_access_token,
    create_login_state_token,
    decode_login_state_token,
    hash_password,
    verify_password,
)
from app.config import settings
from app.core.audit import log_action
from app.db.session import get_db
from app.models import GoogleAccount, User
from app.schemas import LoginRequest, SignupRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    invalid = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if user is None or user.password_hash is None or not verify_password(body.password, user.password_hash):
        raise invalid

    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/google/login")
async def google_login() -> RedirectResponse:
    """
    Primary sign-up/sign-in path: one OAuth round trip both authenticates
    the user and connects that same Google account for storage, so a new
    user always starts with at least one account pooled — no separate
    "connect an account" step required. An existing password-based user
    logging in this way just matches their row by email (unique) and gains
    this account as a connected one, in place.

    Google only ever redirects back to the one callback URI registered in
    Cloud Console, which is /accounts/google/callback — that single handler
    branches on this state token's purpose to run this flow's logic. See
    app.api.accounts.google_callback.
    """
    code_verifier = generate_code_verifier()
    state = create_login_state_token(code_verifier)
    return RedirectResponse(get_authorization_url(state, code_verifier))


async def handle_google_login_callback(code: str, code_verifier: str, db: AsyncSession) -> RedirectResponse:
    """Called from accounts.google_callback once it identifies the state
    token as a login (not account-connect) — see module docstring above."""
    credentials = exchange_code(code, code_verifier)
    if not credentials.refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google did not return a refresh token. Revoke Orbit Drive's access in your Google "
            "Account settings and try again.",
        )

    about = fetch_drive_about(credentials)
    email = about["user"]["emailAddress"]
    quota = about.get("storageQuota", {})
    total_quota = int(quota["limit"]) if "limit" in quota else None
    used_quota = int(quota["usage"]) if "usage" in quota else None

    user_result = await db.execute(select(User).where(User.email == email))
    user = user_result.scalar_one_or_none()
    is_new_user = user is None
    if user is None:
        user = User(id=uuid.uuid4(), email=email, password_hash=None)
        db.add(user)
        await db.flush()

    account_result = await db.execute(
        select(GoogleAccount).where(GoogleAccount.user_id == user.id, GoogleAccount.google_email == email)
    )
    account = account_result.scalar_one_or_none()

    access_enc = encrypt_token(credentials.token)
    refresh_enc = encrypt_token(credentials.refresh_token)
    expiry = credentials_expiry(credentials)
    now = datetime.now(timezone.utc)

    if account is None:
        account = GoogleAccount(
            id=uuid.uuid4(),
            user_id=user.id,
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

    log_action(db, user.id, "google_signup" if is_new_user else "google_login", {"google_email": email})
    await db.commit()

    jwt_token = create_access_token(user.id)
    return RedirectResponse(f"{settings.frontend_url}/auth/callback?token={jwt_token}")
