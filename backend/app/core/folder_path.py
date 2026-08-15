from typing import Callable
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Folder


async def build_folder_path_fn(db: AsyncSession, user_id: UUID) -> Callable[[UUID | None], str | None]:
    """Loads every one of the user's folders once (including trashed ones —
    a trashed file's path should still resolve, e.g. for display in Trash)
    and returns a closure that walks parent_folder_id to build a
    "Documents/2024"-style path. None at root or if the chain is broken."""
    folders_result = await db.execute(select(Folder.id, Folder.name, Folder.parent_folder_id).where(Folder.user_id == user_id))
    folder_map = {row.id: (row.name, row.parent_folder_id) for row in folders_result.all()}

    def folder_path(folder_id: UUID | None) -> str | None:
        parts: list[str] = []
        current = folder_id
        while current is not None:
            entry = folder_map.get(current)
            if entry is None:
                break
            name, parent = entry
            parts.append(name)
            current = parent
        return "/".join(reversed(parts)) if parts else None

    return folder_path
