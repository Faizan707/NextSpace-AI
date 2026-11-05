"""add invites table

Revision ID: a1b2c3d4e5f6
Revises: 9fd1b335b07d
Create Date: 2026-11-05 04:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "9fd1b335b07d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "invites",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("send_password", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("invited_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_invites_email", "invites", ["email"])
    op.create_index("ix_invites_token", "invites", ["token"], unique=True)
    op.create_index("ix_invites_status", "invites", ["status"])
    op.create_index("ix_invites_company_id", "invites", ["company_id"])
    op.create_index("ix_invites_invited_by_id", "invites", ["invited_by_id"])


def downgrade() -> None:
    op.drop_index("ix_invites_invited_by_id", table_name="invites")
    op.drop_index("ix_invites_company_id", table_name="invites")
    op.drop_index("ix_invites_status", table_name="invites")
    op.drop_index("ix_invites_token", table_name="invites")
    op.drop_index("ix_invites_email", table_name="invites")
    op.drop_table("invites")
