from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.space import SpaceCreatorRead

ProjectStatusValue = Literal["open", "in_progress", "completed"]


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    status: ProjectStatusValue = "open"
    progress: int = Field(default=0, ge=0, le=100)
    deadline: datetime | None = None
    member_ids: list[int] = Field(default_factory=list)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: ProjectStatusValue | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    deadline: datetime | None = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    space_id: int
    name: str
    description: str | None
    status: ProjectStatusValue
    progress: int
    deadline: datetime | None
    created_by_id: int
    created_by: SpaceCreatorRead
    members: list[SpaceCreatorRead] = []
    created_at: datetime
