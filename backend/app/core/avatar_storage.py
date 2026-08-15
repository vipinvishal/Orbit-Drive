import time

import httpx

from app.config import settings

_BUCKET = "avatars"


def _headers(content_type: str | None = None) -> dict[str, str]:
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def _object_path(user_id: str) -> str:
    # Stable per-user path (not a random name) — re-uploading replaces the
    # same object via x-upsert instead of accumulating orphaned files that
    # would otherwise need separate cleanup on every avatar change.
    return f"{user_id}.jpg"


async def upload_avatar(user_id: str, image_bytes: bytes) -> str:
    path = _object_path(user_id)
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{settings.supabase_url}/storage/v1/object/{_BUCKET}/{path}",
            headers={**_headers("image/jpeg"), "x-upsert": "true"},
            content=image_bytes,
        )
        resp.raise_for_status()

    # The object path is stable per user, so without a cache-buster the
    # public URL would stay identical after a replace and browsers/the CDN
    # could keep serving the old cached image.
    return f"{settings.supabase_url}/storage/v1/object/public/{_BUCKET}/{path}?v={int(time.time())}"


async def delete_avatar(user_id: str) -> None:
    path = _object_path(user_id)
    async with httpx.AsyncClient(timeout=15) as client:
        # Not raising on failure — deleting an avatar that was never
        # uploaded (or is already gone) isn't an error the caller needs to
        # handle differently from a normal success.
        await client.request(
            "DELETE",
            f"{settings.supabase_url}/storage/v1/object/{_BUCKET}/{path}",
            headers=_headers(),
        )
