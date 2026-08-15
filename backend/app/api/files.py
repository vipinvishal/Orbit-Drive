import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Form, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("orbit_drive.api.files")

from app.auth.deps import get_current_user
from app.core.categories import categorize
from app.core.deletion import trash_file
from app.core.pipeline import DuplicateFileError, NoSpaceAvailableError, UploadQueuedForRetryError, upload_file
from app.core.retrieval import resolve_and_download
from app.db.session import get_db
from app.models import File, FileObject, Folder, User
from app.schemas import FileListResponse, FileResponse, FileUpdateRequest

router = APIRouter(prefix="/files", tags=["files"])


def _has_extension(filename: str) -> bool:
    # A dot that isn't the first or last character — "photo.jpg" yes,
    # "photo." or ".jpg" or "photo" no. Renaming a file to drop its
    # extension is almost always a mistake, not an intentional choice.
    idx = filename.rfind(".")
    return 0 < idx < len(filename) - 1


@router.post("/upload", response_model=FileResponse, status_code=status.HTTP_201_CREATED)
async def upload(
    file: UploadFile,
    folder_id: UUID | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> File:
    content = await file.read()
    logger.info(
        "upload request: user=%s filename=%r content_type=%r received_bytes=%d folder_id=%s",
        current_user.id,
        file.filename,
        file.content_type,
        len(content),
        folder_id,
    )
    try:
        return await upload_file(
            db,
            user_id=current_user.id,
            folder_id=folder_id,
            filename=file.filename or "untitled",
            content=content,
            mime_type=file.content_type,
        )
    except DuplicateFileError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A file with this name already exists in this folder",
        )
    except NoSpaceAvailableError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No space available — connect another Google account",
        )
    except UploadQueuedForRetryError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Upload temporarily failed and has been queued for automatic retry",
        )


@router.get("", response_model=FileListResponse)
async def list_files(
    folder_id: UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FileListResponse:
    folders_result = await db.execute(
        select(Folder)
        .where(Folder.user_id == current_user.id, Folder.parent_folder_id == folder_id, Folder.deleted_at.is_(None))
        .order_by(Folder.name)
    )
    files_result = await db.execute(
        select(File)
        .where(File.user_id == current_user.id, File.folder_id == folder_id, File.deleted_at.is_(None))
        .order_by(File.filename)
    )
    return FileListResponse(
        folders=list(folders_result.scalars().all()),
        files=list(files_result.scalars().all()),
    )


@router.get("/search", response_model=list[FileResponse])
async def search_files(
    q: str = Query(..., min_length=1),
    category: str | None = Query(None, pattern="^(image|video|document|other)$"),
    account_id: UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[File]:
    # Postgres full-text search on filename per mvp.md §6 — no separate
    # SearchIndex table. Punctuation (-, ., _) is normalized to spaces
    # before indexing/querying: Postgres's default parser otherwise keeps
    # a whole filename like "orbit-phase3-test.bin" as one lexeme, so a
    # partial term like "phase3" would never match without this.
    # Bound param, not string interpolation: safe from injection despite
    # the raw SQL fragment.
    stmt = select(File).where(
        File.user_id == current_user.id,
        File.deleted_at.is_(None),
        text(
            "to_tsvector('english', regexp_replace(filename, '[^a-zA-Z0-9]+', ' ', 'g')) "
            "@@ plainto_tsquery('english', regexp_replace(:q, '[^a-zA-Z0-9]+', ' ', 'g'))"
        ),
    ).params(q=q)

    if account_id is not None:
        stmt = stmt.join(FileObject, FileObject.id == File.file_object_id).where(
            FileObject.google_account_id == account_id
        )

    stmt = stmt.order_by(File.filename)
    result = await db.execute(stmt)
    files = list(result.scalars().all())

    # Category filtering happens in Python via the same categorize() the
    # sidebar breakdown uses, rather than a parallel SQL prefix match —
    # search result sets are already small, and this guarantees the two
    # features can never disagree on what counts as a "document".
    if category is not None:
        files = [f for f in files if categorize(f.mime_type) == category]
    return files


@router.get("/{file_id}/download")
async def download_file(
    file_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> Response:
    try:
        resolved = await resolve_and_download(db, current_user.id, file_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to retrieve file from storage provider"
        )

    if resolved is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    file_row, content = resolved
    return Response(
        content=content,
        media_type=file_row.mime_type or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{file_row.filename}"'},
    )


@router.patch("/{file_id}", response_model=FileResponse)
async def update_file(
    file_id: UUID,
    body: FileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> File:
    """Rename and/or move a file. Orbit's folders are a metadata-only
    layer over Drive (drive.file uploads aren't organized into matching
    Drive folders), so this never touches Google Drive — it's a plain
    row update."""
    result = await db.execute(
        select(File).where(File.id == file_id, File.user_id == current_user.id, File.deleted_at.is_(None))
    )
    file = result.scalar_one_or_none()
    if file is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    fields_set = body.model_fields_set
    target_folder_id = body.folder_id if "folder_id" in fields_set else file.folder_id
    target_filename = body.filename if "filename" in fields_set and body.filename else file.filename

    if "filename" in fields_set and not _has_extension(target_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='File names need an extension (like ".jpg" or ".pdf") — add one and try again.',
        )

    if "folder_id" in fields_set and target_folder_id is not None:
        folder_result = await db.execute(
            select(Folder).where(Folder.id == target_folder_id, Folder.user_id == current_user.id, Folder.deleted_at.is_(None))
        )
        if folder_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination folder not found")

    if (target_folder_id, target_filename) != (file.folder_id, file.filename):
        existing = await db.execute(
            select(File)
            .where(
                File.user_id == current_user.id,
                File.folder_id == target_folder_id,
                File.filename == target_filename,
                File.deleted_at.is_(None),
                File.id != file.id,
            )
            .limit(1)
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A file with this name already exists in the destination folder",
            )

    file.folder_id = target_folder_id
    file.filename = target_filename
    file.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(file)
    return file


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    file_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> None:
    """Moves the file to Trash — see app/api/trash.py for restore and
    permanent deletion. Never touches Google Drive directly."""
    trashed = await trash_file(db, current_user.id, file_id)
    if trashed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
