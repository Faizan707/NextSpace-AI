from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.models.space import SpaceType


class SpaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    space_type: SpaceType = SpaceType.PRIVATE


class SpaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    space_type: SpaceType | None = None


class SpaceCreatorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str | None
    job_role: str | None = None
    avatar_url: str | None = None


class SpaceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    space_type: SpaceType
    company_id: int
    created_by_id: int
    created_by: SpaceCreatorRead
    members: list[SpaceCreatorRead] = []
    projects_count: int = 0
    teams_count: int = 0
    documents_count: int = 0
    created_at: datetime


class SpaceMembersAdd(BaseModel):
    user_ids: list[int] = Field(min_length=1)


class ProjectMembersAdd(BaseModel):
    user_ids: list[int] = Field(default_factory=list)
    team_ids: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def require_users_or_teams(self) -> "ProjectMembersAdd":
        if not self.user_ids and not self.team_ids:
            raise ValueError("Provide at least one user_id or team_id")
        return self
