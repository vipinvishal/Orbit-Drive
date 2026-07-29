import base64
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pipeline import execute_upload


async def run_retry_upload(db: AsyncSession, payload: dict[str, Any]) -> None:
    content = base64.b64decode(payload["content_b64"])
    folder_id = UUID(payload["folder_id"]) if payload.get("folder_id") else None
    await execute_upload(
        db,
        user_id=UUID(payload["user_id"]),
        filename=payload["filename"],
        content=content,
        mime_type=payload.get("mime_type"),
        folder_id=folder_id,
    )
