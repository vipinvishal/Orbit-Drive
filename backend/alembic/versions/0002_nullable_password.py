"""make users.password_hash nullable

Google-authenticated users (mvp.md's Google-first login) never set a
password, so it can no longer be required.

Revision ID: 0002_nullable_password
Revises: 0001_initial
Create Date: 2026-07-28

"""
from alembic import op
import sqlalchemy as sa

revision = "0002_nullable_password"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("users", "password_hash", existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    op.alter_column("users", "password_hash", existing_type=sa.Text(), nullable=False)
