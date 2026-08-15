"""add files.deleted_at, folders.deleted_at

Soft-delete support for the Trash feature — NULL means live, a timestamp
means trashed (and eligible for auto-purge after the retention window).
Indexed since every normal-use listing query now filters on this column.

Revision ID: 0005_add_trash
Revises: 0004_add_avatar
Create Date: 2026-08-16

"""
from alembic import op
import sqlalchemy as sa

revision = "0005_add_trash"
down_revision = "0004_add_avatar"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("files", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("folders", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_files_deleted_at", "files", ["deleted_at"])
    op.create_index("ix_folders_deleted_at", "folders", ["deleted_at"])


def downgrade() -> None:
    op.drop_index("ix_folders_deleted_at", table_name="folders")
    op.drop_index("ix_files_deleted_at", table_name="files")
    op.drop_column("folders", "deleted_at")
    op.drop_column("files", "deleted_at")
