from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.space_member import SpaceMember
    from app.models.user import User


class SpaceType(StrEnum):
    PUBLIC = "public"
    SPECIFIC = "specific"
    PRIVATE = "private"


class Space(Base):
    __tablename__ = "spaces"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    space_type: Mapped[str] = mapped_column(String(50), default=SpaceType.PRIVATE, index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    company: Mapped["Company"] = relationship(back_populates="spaces")
    created_by: Mapped["User"] = relationship(back_populates="spaces")
    memberships: Mapped[list["SpaceMember"]] = relationship(
        back_populates="space",
        cascade="all, delete-orphan",
    )
