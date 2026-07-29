from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd_context.verify(password, password_hash)


def create_access_token(user_id: UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> UUID | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
    sub = payload.get("sub")
    if sub is None:
        return None
    try:
        return UUID(sub)
    except ValueError:
        return None


def create_oauth_state_token(user_id: UUID, code_verifier: str) -> str:
    # Carries the PKCE code_verifier across the redirect to Google and back,
    # since the connect and callback requests build separate Flow objects
    # with no shared memory (see app.auth.google_oauth).
    expire = datetime.now(timezone.utc) + timedelta(minutes=10)
    payload = {"sub": str(user_id), "cv": code_verifier, "exp": expire, "purpose": "oauth_state"}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_oauth_state_token(token: str) -> tuple[UUID, str] | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
    if payload.get("purpose") != "oauth_state":
        return None
    sub = payload.get("sub")
    code_verifier = payload.get("cv")
    if sub is None or not code_verifier:
        return None
    try:
        return UUID(sub), code_verifier
    except ValueError:
        return None


def create_login_state_token(code_verifier: str) -> str:
    # Same PKCE round-trip problem as create_oauth_state_token, but for the
    # Google-first login flow, which runs before any user_id exists.
    expire = datetime.now(timezone.utc) + timedelta(minutes=10)
    payload = {"cv": code_verifier, "exp": expire, "purpose": "google_login"}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_login_state_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
    if payload.get("purpose") != "google_login":
        return None
    code_verifier = payload.get("cv")
    return code_verifier if code_verifier else None
