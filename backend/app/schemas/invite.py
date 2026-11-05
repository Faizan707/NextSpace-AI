from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class InviteCreate(BaseModel):
    email: EmailStr
    full_name: str | None = None
    send_password: bool = False


class InviteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    status: str
    send_password: bool
    company_id: int
    invited_by_id: int
    created_at: datetime
    accepted_at: datetime | None


class InvitePublicRead(BaseModel):
    email: EmailStr
    company_name: str
    status: str


class InviteAccept(BaseModel):
    password: str = Field(min_length=8)
    full_name: str | None = None


class InviteCreateResult(BaseModel):
    invite: InviteRead
    temporary_password: str | None = None
    invite_link: str | None = None
