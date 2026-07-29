from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog


def log_action(db: AsyncSession, user_id: UUID, action: str, details: dict[str, Any] | None = None) -> None:
    """Stages an audit_logs row on the given session — caller commits as
    part of its own transaction so the log write is atomic with the action."""
    db.add(AuditLog(user_id=user_id, action=action, details=details))
