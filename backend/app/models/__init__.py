import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    # Nullable: Google-authenticated users (mvp.md's Google-first login) never set one.
    password_hash: Mapped[str | None] = mapped_column(Text)
    display_name: Mapped[str | None] = mapped_column(Text)
    # Public URL into the Supabase Storage "avatars" bucket (not routed
    # through the Drive storage pipeline like real files — an avatar isn't
    # "your data" in the product's sense, it's account metadata, same as
    # display_name). A public bucket URL also sidesteps an awkward problem:
    # this app's auth is a Bearer token, not a cookie, so a plain <img src>
    # can't carry it — a public CDN URL just works directly, no proxying.
    avatar_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    google_accounts: Mapped[list["GoogleAccount"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    folders: Mapped[list["Folder"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    files: Mapped[list["File"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class GoogleAccount(Base):
    __tablename__ = "google_accounts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    google_email: Mapped[str] = mapped_column(Text, nullable=False)
    access_token_enc: Mapped[bytes] = mapped_column(nullable=False)
    refresh_token_enc: Mapped[bytes] = mapped_column(nullable=False)
    token_expiry: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    total_quota_bytes: Mapped[int | None] = mapped_column(BigInteger)
    used_quota_bytes: Mapped[int | None] = mapped_column(BigInteger)
    status: Mapped[str] = mapped_column(Text, server_default="active")
    last_quota_check_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="google_accounts")


class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    parent_folder_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("folders.id"))
    name: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # NULL = live. Set by a trash (soft-delete), cleared by restore. Every
    # query that lists/checks folders for normal use must filter this out —
    # see app/core/deletion.py for the trash/restore/purge lifecycle.
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="folders")


class FileObject(Base):
    __tablename__ = "file_objects"
    __table_args__ = (UniqueConstraint("owner_user_id", "checksum_sha256", name="uq_file_objects_owner_checksum"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    checksum_sha256: Mapped[str] = mapped_column(Text, nullable=False)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    google_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("google_accounts.id"))
    google_file_id: Mapped[str] = mapped_column(Text, nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class File(Base):
    __tablename__ = "files"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    folder_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("folders.id"))
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    file_object_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("file_objects.id"))
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    mime_type: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # NULL = live. See Folder.deleted_at — same lifecycle, same rule that
    # every normal-use query must filter this out.
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="files")
    # Without this, SQLAlchemy has no way to know files_file_object_id_fkey
    # must be inserted after file_objects, and can flush them out of order
    # in the same transaction — a real bug, not just missing metadata.
    file_object: Mapped["FileObject | None"] = relationship()


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    job_type: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, server_default="pending")
    payload: Mapped[dict | None] = mapped_column(JSONB)
    attempts: Mapped[int] = mapped_column(Integer, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
