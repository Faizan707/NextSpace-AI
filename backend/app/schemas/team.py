from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.space import SpaceCreatorRead


class TeamCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    member_ids: list[int] = Field(default_factory=list)


class TeamUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None


class TeamRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    space_id: int
    name: str
    description: str | None
    created_by_id: int
    created_by: SpaceCreatorRead
    members: list[SpaceCreatorRead] = []
    created_at: datetime
