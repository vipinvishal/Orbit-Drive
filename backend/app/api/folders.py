from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.core.deletion import collect_folder_subtree, trash_folder_tree
from app.db.session import get_db
from app.models import Folder, User
from app.schemas import FolderCreateRequest, FolderResponse, FolderTrashResponse, FolderUpdateRequest

router = APIRouter(prefix="/folders", tags=["folders"])


@router.post("", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def create_folder(
    body: FolderCreateRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> Folder:
    if body.parent_folder_id is not None:
        result = await db.execute(
            select(Folder).where(
                Folder.id == body.parent_folder_id, Folder.user_id == current_user.id, Folder.deleted_at.is_(None)
            )
        )
        if result.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent folder not found")

    existing = await db.execute(
        select(Folder)
        .where(
            Folder.user_id == current_user.id,
            Folder.parent_folder_id == body.parent_folder_id,
            Folder.name == body.name,
            Folder.deleted_at.is_(None),
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
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == current_user.id, Folder.deleted_at.is_(None))
    )
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
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == current_user.id, Folder.deleted_at.is_(None))
    )
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
            select(Folder).where(Folder.id == target_parent_id, Folder.user_id == current_user.id, Folder.deleted_at.is_(None))
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
                Folder.deleted_at.is_(None),
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


@router.delete("/{folder_id}", response_model=FolderTrashResponse)
async def delete_folder(
    folder_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FolderTrashResponse:
    """Moves the folder and everything inside it (recursively) to Trash —
    reversible, so there's no more 409-and-confirm-again dance for non-empty
    folders like the old hard-delete had. See app/api/trash.py for restore
    and permanent deletion."""
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == current_user.id, Folder.deleted_at.is_(None))
    )
    folder = result.scalar_one_or_none()
    if folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    trashed = await trash_folder_tree(db, current_user.id, folder_id)
    assert trashed is not None
    files_trashed, folders_trashed = trashed
    return FolderTrashResponse(files_trashed=files_trashed, folders_trashed=folders_trashed)
