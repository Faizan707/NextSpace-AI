from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.user import UserRole
from app.schemas.space import SpaceRead


class MemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str | None
    job_role: str | None = None
    avatar_url: str | None = None
    role: UserRole
    created_at: datetime


class MemberUpdate(BaseModel):
    full_name: str | None = None
    job_role: str | None = None


class AdminOverview(BaseModel):
    users: list[MemberRead]
    spaces: list[SpaceRead]
