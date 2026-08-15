from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.core.deletion import purge_file, purge_folder_tree, restore_file, restore_folder_tree
from app.core.folder_path import build_folder_path_fn
from app.db.session import get_db
from app.models import File, Folder, User
from app.schemas import (
    EmptyTrashResponse,
    FileResponse,
    FolderPurgeResponse,
    FolderResponse,
    TrashedFileResponse,
    TrashedFolderResponse,
    TrashListResponse,
)

router = APIRouter(prefix="/trash", tags=["trash"])


async def _top_level_trashed(db: AsyncSession, user_id: UUID) -> tuple[list[Folder], list[File], set[UUID]]:
    """Trash only shows the root of a trashed subtree, not every nested
    file/folder underneath it too — same convention as Google Drive's own
    Trash. Loaded in two flat queries (cheap at personal scale) rather than
    a recursive CTE, matching this codebase's existing style."""
    folders_result = await db.execute(select(Folder).where(Folder.user_id == user_id, Folder.deleted_at.is_not(None)))
    trashed_folders = list(folders_result.scalars().all())
    trashed_folder_ids = {f.id for f in trashed_folders}
    top_folders = [f for f in trashed_folders if f.parent_folder_id is None or f.parent_folder_id not in trashed_folder_ids]

    files_result = await db.execute(select(File).where(File.user_id == user_id, File.deleted_at.is_not(None)))
    trashed_files = list(files_result.scalars().all())
    top_files = [f for f in trashed_files if f.folder_id is None or f.folder_id not in trashed_folder_ids]

    return top_folders, top_files, trashed_folder_ids


@router.get("", response_model=TrashListResponse)
async def list_trash(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> TrashListResponse:
    top_folders, top_files, _ = await _top_level_trashed(db, current_user.id)
    folder_path = await build_folder_path_fn(db, current_user.id)

    top_folders.sort(key=lambda f: f.deleted_at, reverse=True)
    top_files.sort(key=lambda f: f.deleted_at, reverse=True)

    return TrashListResponse(
        folders=[
            TrashedFolderResponse.model_validate(f).model_copy(update={"folder_path": folder_path(f.parent_folder_id)})
            for f in top_folders
        ],
        files=[
            TrashedFileResponse.model_validate(f).model_copy(update={"folder_path": folder_path(f.folder_id)}) for f in top_files
        ],
    )


@router.post("/files/{file_id}/restore", response_model=FileResponse)
async def restore_trashed_file(
    file_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> File:
    restored = await restore_file(db, current_user.id, file_id)
    if restored is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trashed file not found")
    return restored


@router.post("/folders/{folder_id}/restore", response_model=FolderResponse)
async def restore_trashed_folder(
    folder_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> Folder:
    restored = await restore_folder_tree(db, current_user.id, folder_id)
    if restored is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trashed folder not found")
    return restored


@router.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def purge_trashed_file(
    file_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> None:
    """Delete forever — permanently removes the file (and its real Google
    Drive object, if nothing else still references it). Only works on
    something already in Trash; use DELETE /files/{id} to trash a live file."""
    result = await db.execute(
        select(File.id).where(File.id == file_id, File.user_id == current_user.id, File.deleted_at.is_not(None))
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trashed file not found")
    await purge_file(db, current_user.id, file_id)


@router.delete("/folders/{folder_id}", response_model=FolderPurgeResponse)
async def purge_trashed_folder(
    folder_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> FolderPurgeResponse:
    result = await db.execute(
        select(Folder.id).where(Folder.id == folder_id, Folder.user_id == current_user.id, Folder.deleted_at.is_not(None))
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trashed folder not found")
    purged = await purge_folder_tree(db, current_user.id, folder_id)
    assert purged is not None
    files_purged, folders_purged = purged
    return FolderPurgeResponse(files_purged=files_purged, folders_purged=folders_purged)


@router.post("/empty", response_model=EmptyTrashResponse)
async def empty_trash(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> EmptyTrashResponse:
    top_folders, top_files, _ = await _top_level_trashed(db, current_user.id)

    files_purged = 0
    folders_purged = 0
    for folder in top_folders:
        result = await purge_folder_tree(db, current_user.id, folder.id)
        if result is not None:
            f, d = result
            files_purged += f
            folders_purged += d
    for file_row in top_files:
        if await purge_file(db, current_user.id, file_row.id) is not None:
            files_purged += 1

    return EmptyTrashResponse(files_purged=files_purged, folders_purged=folders_purged)
