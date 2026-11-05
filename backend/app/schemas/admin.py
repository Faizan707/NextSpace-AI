from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.user import UserRole
from app.schemas.space import SpaceRead


class MemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str | None
    avatar_url: str | None = None
    role: UserRole
    created_at: datetime


class AdminOverview(BaseModel):
    users: list[MemberRead]
    spaces: list[SpaceRead]
