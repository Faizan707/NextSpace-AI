from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.space import SpaceType


class SpaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    space_type: SpaceType = SpaceType.PRIVATE


class SpaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    space_type: SpaceType | None = None


class SpaceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    space_type: SpaceType
    company_id: int
    created_by_id: int
    created_at: datetime
