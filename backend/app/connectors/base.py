from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class UploadResult:
    provider_file_id: str
    size_bytes: int


@dataclass
class QuotaInfo:
    total_bytes: int | None
    used_bytes: int | None


class StorageConnector(ABC):
    """
    mvp.md §4: GoogleDriveConnector is the only implementation in v1. Adding
    Dropbox/OneDrive/S3 later means a new connector against this same
    interface — nothing above it (SIE, API routes) changes.
    """

    @abstractmethod
    async def upload(self, refresh_token: str, filename: str, content: bytes, mime_type: str | None) -> UploadResult: ...

    @abstractmethod
    async def download(self, refresh_token: str, provider_file_id: str) -> bytes: ...

    @abstractmethod
    async def delete(self, refresh_token: str, provider_file_id: str) -> None: ...

    @abstractmethod
    async def get_quota(self, refresh_token: str) -> QuotaInfo: ...

    @abstractmethod
    async def health_check(self, refresh_token: str) -> bool: ...
