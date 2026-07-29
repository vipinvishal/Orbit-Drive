import secrets
from datetime import datetime, timezone
from typing import Any

from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from app.config import settings

DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file"


def _client_config() -> dict[str, Any]:
    return {
        "web": {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.google_redirect_uri],
        }
    }


def generate_code_verifier() -> str:
    # RFC 7636: 43-128 chars from [A-Za-z0-9-._~]. token_urlsafe uses
    # [A-Za-z0-9-_], a valid subset.
    return secrets.token_urlsafe(64)


def build_flow(code_verifier: str) -> Flow:
    # autogenerate_code_verifier is off: the connect and callback requests
    # build separate Flow instances (no shared memory across the redirect to
    # Google and back), so we generate and pass the same code_verifier
    # ourselves, round-tripped through the signed `state` param.
    return Flow.from_client_config(
        _client_config(),
        scopes=[DRIVE_FILE_SCOPE],
        redirect_uri=settings.google_redirect_uri,
        code_verifier=code_verifier,
        autogenerate_code_verifier=False,
    )


def get_authorization_url(state: str, code_verifier: str) -> str:
    flow = build_flow(code_verifier)
    # access_type=offline + prompt=consent guarantees a refresh_token is
    # returned even if the user has authorized this app before.
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
        state=state,
    )
    return auth_url


def exchange_code(code: str, code_verifier: str) -> Credentials:
    flow = build_flow(code_verifier)
    flow.fetch_token(code=code)
    return flow.credentials


def build_credentials_from_refresh_token(refresh_token: str) -> Credentials:
    """
    Used by GoogleDriveConnector (Phase 2) for every Drive API call: always
    refresh from the stored refresh_token rather than tracking access-token
    expiry separately — simpler and always correct at MVP scale.
    """
    credentials = Credentials(
        None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=[DRIVE_FILE_SCOPE],
    )
    credentials.refresh(GoogleAuthRequest())
    return credentials


def fetch_drive_about(credentials: Credentials) -> dict[str, Any]:
    service = build("drive", "v3", credentials=credentials, cache_discovery=False)
    return service.about().get(fields="user,storageQuota").execute()


def credentials_expiry(credentials: Credentials) -> datetime | None:
    if credentials.expiry is None:
        return None
    return credentials.expiry.replace(tzinfo=timezone.utc) if credentials.expiry.tzinfo is None else credentials.expiry
