from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.space import Space
    from app.models.user import User


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    space_id: Mapped[int] = mapped_column(ForeignKey("spaces.id", ondelete="CASCADE"), index=True)
    original_name: Mapped[str] = mapped_column(String(512))
    stored_path: Mapped[str] = mapped_column(String(1024))
    content_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    compliance_status: Mapped[str] = mapped_column(String(32), default="pending")
    compliance_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    compliance_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    compliance_findings_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    compliance_checked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    compliance_engine: Mapped[str | None] = mapped_column(String(64), nullable=True)

    space: Mapped["Space"] = relationship()
    uploaded_by: Mapped["User"] = relationship()
    memberships: Mapped[list["DocumentMember"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
    )


class DocumentMember(Base):
    __tablename__ = "document_members"
    __table_args__ = (
        UniqueConstraint("document_id", "user_id", name="uq_document_members_document_user"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document: Mapped["Document"] = relationship(back_populates="memberships")
    user: Mapped["User"] = relationship()
