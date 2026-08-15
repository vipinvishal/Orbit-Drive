"""add users.display_name

Profile section: a user-editable display name, shown in the sidebar and
elsewhere instead of the raw account email. Nullable — falls back to
deriving something from the email client-side when unset.

Revision ID: 0003_add_display_name
Revises: 0002_nullable_password
Create Date: 2026-08-11

"""
from alembic import op
import sqlalchemy as sa

revision = "0003_add_display_name"
down_revision = "0002_nullable_password"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("display_name", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "display_name")
