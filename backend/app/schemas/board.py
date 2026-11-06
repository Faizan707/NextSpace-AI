from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.space import SpaceCreatorRead


class StageCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class StageUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    position: int | None = Field(default=None, ge=0)


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    stage_id: int
    assignee_id: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    stage_id: int | None = None
    position: int | None = Field(default=None, ge=0)
    assignee_id: int | None = None


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    stage_id: int
    title: str
    description: str | None
    position: int
    assignee_id: int | None
    assignee: SpaceCreatorRead | None = None
    created_by_id: int
    created_at: datetime
    updated_at: datetime


class StageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    position: int
    is_default: bool
    tasks: list[TaskRead] = []
    created_at: datetime


class BoardRead(BaseModel):
    project_id: int
    stages: list[StageRead]
