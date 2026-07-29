from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.core.deletion import collect_folder_subtree, delete_folder_tree
from app.db.session import get_db
from app.models import File, Folder, User
from app.schemas import FolderCreateRequest, FolderResponse, FolderUpdateRequest

router = APIRouter(prefix="/folders", tags=["folders"])


@router.post("", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def create_folder(
    body: FolderCreateRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> Folder:
    if body.parent_folder_id is not None:
        result = await db.execute(
            select(Folder).where(Folder.id == body.parent_folder_id, Folder.user_id == current_user.id)
        )
        if result.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent folder not found")

    existing = await db.execute(
        select(Folder)
        .where(
            Folder.user_id == current_user.id,
            Folder.parent_folder_id == body.parent_folder_id,
            Folder.name == body.name,
        )
        .limit(1)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A folder with this name already exists in this folder",
        )

    folder = Folder(user_id=current_user.id, name=body.name, parent_folder_id=body.parent_folder_id)
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return folder


@router.get("/{folder_id}", response_model=FolderResponse)
async def get_folder(
    folder_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> Folder:
    result = await db.execute(select(Folder).where(Folder.id == folder_id, Folder.user_id == current_user.id))
    folder = result.scalar_one_or_none()
    if folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return folder


@router.patch("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: UUID,
    body: FolderUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Folder:
    result = await db.execute(select(Folder).where(Folder.id == folder_id, Folder.user_id == current_user.id))
    folder = result.scalar_one_or_none()
    if folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    fields_set = body.model_fields_set
    target_parent_id = body.parent_folder_id if "parent_folder_id" in fields_set else folder.parent_folder_id
    target_name = body.name if "name" in fields_set and body.name else folder.name

    if "parent_folder_id" in fields_set and target_parent_id is not None:
        if target_parent_id == folder.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can't move a folder into itself")
        parent_result = await db.execute(
            select(Folder).where(Folder.id == target_parent_id, Folder.user_id == current_user.id)
        )
        if parent_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination folder not found")
        # Moving a folder into one of its own descendants would orphan the
        # whole subtree into a cycle — collect_folder_subtree (same helper
        # recursive delete uses) is the authority on what's a descendant.
        subtree_ids = await collect_folder_subtree(db, current_user.id, folder.id)
        if target_parent_id in subtree_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Can't move a folder into its own subfolder"
            )

    if (target_parent_id, target_name) != (folder.parent_folder_id, folder.name):
        existing = await db.execute(
            select(Folder)
            .where(
                Folder.user_id == current_user.id,
                Folder.parent_folder_id == target_parent_id,
                Folder.name == target_name,
                Folder.id != folder.id,
            )
            .limit(1)
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A folder with this name already exists in the destination",
            )

    folder.parent_folder_id = target_parent_id
    folder.name = target_name
    await db.commit()
    await db.refresh(folder)
    return folder


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    folder_id: UUID,
    force: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Folder).where(Folder.id == folder_id, Folder.user_id == current_user.id))
    folder = result.scalar_one_or_none()
    if folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    folder_ids = await collect_folder_subtree(db, current_user.id, folder_id)
    subfolder_count = len(folder_ids) - 1
    file_count = (
        await db.execute(select(func.count()).select_from(File).where(File.folder_id.in_(folder_ids), File.user_id == current_user.id))
    ).scalar_one()

    if (file_count > 0 or subfolder_count > 0) and not force:
        parts = []
        if file_count:
            parts.append(f"{file_count} file{'s' if file_count != 1 else ''}")
        if subfolder_count:
            parts.append(f"{subfolder_count} subfolder{'s' if subfolder_count != 1 else ''}")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"This folder contains {' and '.join(parts)}.")

    # Recursively deletes every subfolder and every file within any of them —
    # each file for real, from Google Drive itself (dedup-aware, same as a
    # single file delete) — not just Orbit Drive's own records.
    await delete_folder_tree(db, current_user.id, folder_id)
