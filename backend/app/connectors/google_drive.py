import asyncio
import io

from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload

from app.auth.google_oauth import build_credentials_from_refresh_token, fetch_drive_about
from app.connectors.base import QuotaInfo, StorageConnector, UploadResult


def _build_service(refresh_token: str):
    credentials = build_credentials_from_refresh_token(refresh_token)
    return build("drive", "v3", credentials=credentials, cache_discovery=False)


class GoogleDriveConnector(StorageConnector):
    """googleapiclient is synchronous — every call runs in a thread so it
    doesn't block the event loop."""

    async def upload(self, refresh_token: str, filename: str, content: bytes, mime_type: str | None) -> UploadResult:
        def _do() -> UploadResult:
            service = _build_service(refresh_token)
            media = MediaIoBaseUpload(io.BytesIO(content), mimetype=mime_type or "application/octet-stream", resumable=False)
            uploaded = service.files().create(body={"name": filename}, media_body=media, fields="id").execute()
            return UploadResult(provider_file_id=uploaded["id"], size_bytes=len(content))

        return await asyncio.to_thread(_do)

    async def download(self, refresh_token: str, provider_file_id: str) -> bytes:
        def _do() -> bytes:
            service = _build_service(refresh_token)
            request = service.files().get_media(fileId=provider_file_id)
            buffer = io.BytesIO()
            downloader = MediaIoBaseDownload(buffer, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()
            return buffer.getvalue()

        return await asyncio.to_thread(_do)

    async def delete(self, refresh_token: str, provider_file_id: str) -> None:
        def _do() -> None:
            service = _build_service(refresh_token)
            service.files().delete(fileId=provider_file_id).execute()

        await asyncio.to_thread(_do)

    async def get_quota(self, refresh_token: str) -> QuotaInfo:
        def _do() -> QuotaInfo:
            credentials = build_credentials_from_refresh_token(refresh_token)
            about = fetch_drive_about(credentials)
            quota = about.get("storageQuota", {})
            total = int(quota["limit"]) if "limit" in quota else None
            used = int(quota["usage"]) if "usage" in quota else None
            return QuotaInfo(total_bytes=total, used_bytes=used)

        return await asyncio.to_thread(_do)

    async def health_check(self, refresh_token: str) -> bool:
        def _do() -> bool:
            try:
                service = _build_service(refresh_token)
                service.about().get(fields="user").execute()
                return True
            except Exception:
                return False

        return await asyncio.to_thread(_do)
