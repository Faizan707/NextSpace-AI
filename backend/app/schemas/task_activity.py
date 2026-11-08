from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.board import TaskPriorityValue
from app.schemas.space import SpaceCreatorRead


class TaskDetailRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    stage_id: int
    stage_name: str
    title: str
    description: str | None
    priority: TaskPriorityValue
    position: int
    assignee_id: int | None
    assignee: SpaceCreatorRead | None = None
    created_by_id: int
    created_by: SpaceCreatorRead
    created_at: datetime
    updated_at: datetime


class TaskCommentCreate(BaseModel):
    """Body for a new top-level comment (no parent)."""

    body: str = Field(min_length=1, max_length=5000)
    mention_ids: list[int] = Field(default_factory=list)


class TaskReplyCreate(BaseModel):
    """Body for a reply — parent comes from the URL, not from this payload."""

    body: str = Field(min_length=1, max_length=5000)
    mention_ids: list[int] = Field(default_factory=list)


class TaskCommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    author_id: int
    author: SpaceCreatorRead
    parent_id: int | None
    body: str
    mention_ids: list[int] = []
    mentions: list[SpaceCreatorRead] = []
    replies: list["TaskCommentRead"] = []
    created_at: datetime
    updated_at: datetime


class TaskAttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    original_name: str
    content_type: str | None
    size_bytes: int
    uploaded_by_id: int
    uploaded_by: SpaceCreatorRead
    created_at: datetime


TaskCommentRead.model_rebuild()
