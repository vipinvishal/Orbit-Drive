"""add users.avatar_url

Profile picture upload. Stores a public Supabase Storage URL rather than
raw bytes — keeps binary data out of Postgres and gives a plain <img src>
something it can load directly, which matters since this app's auth is a
Bearer token (not a cookie) and can't otherwise be attached to an <img>
request.

Revision ID: 0004_add_avatar
Revises: 0003_add_display_name
Create Date: 2026-08-11

"""
from alembic import op
import sqlalchemy as sa

revision = "0004_add_avatar"
down_revision = "0003_add_display_name"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_url")
