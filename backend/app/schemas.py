from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GoogleAccountResponse(BaseModel):
    id: UUID
    google_email: str
    status: str
    total_quota_bytes: int | None
    used_quota_bytes: int | None
    last_quota_check_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class FileResponse(BaseModel):
    id: UUID
    filename: str
    folder_id: UUID | None
    size_bytes: int
    mime_type: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FolderCreateRequest(BaseModel):
    name: str
    parent_folder_id: UUID | None = None


class FolderUpdateRequest(BaseModel):
    # Both optional; presence is checked via model_fields_set so
    # parent_folder_id=null (move to root) is distinguishable from omitted.
    name: str | None = None
    parent_folder_id: UUID | None = None


class FolderResponse(BaseModel):
    id: UUID
    name: str
    parent_folder_id: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class FileUpdateRequest(BaseModel):
    # Same model_fields_set convention as FolderUpdateRequest.
    filename: str | None = None
    folder_id: UUID | None = None


class FileListResponse(BaseModel):
    folders: list[FolderResponse]
    files: list[FileResponse]


class AccountFileResponse(FileResponse):
    # "Documents/2024" — where this file lives in the Orbit Drive folder
    # tree, None at root. Only meaningful for the per-account file browser;
    # normal listings scope by folder_id already and don't need it.
    folder_path: str | None = None


class StorageSummaryResponse(BaseModel):
    total_quota_bytes: int
    used_quota_bytes: int
    remaining_bytes: int


class StorageBreakdownResponse(BaseModel):
    images_bytes: int
    videos_bytes: int
    documents_bytes: int
    other_bytes: int
