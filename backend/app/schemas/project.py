from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.space import SpaceCreatorRead


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    space_id: int
    name: str
    description: str | None
    created_by_id: int
    created_by: SpaceCreatorRead
    created_at: datetime
