from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.space import SpaceCreatorRead

NotificationType = Literal["task_assigned", "space_added", "project_added", "chat_message"]


class ConversationCreate(BaseModel):
    user_id: int


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    sender_id: int
    sender: SpaceCreatorRead
    body: str
    created_at: datetime


class ConversationRead(BaseModel):
    id: int
    company_id: int
    other_user: SpaceCreatorRead
    last_message: MessageRead | None = None
    created_at: datetime


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    actor_id: int | None
    actor: SpaceCreatorRead | None = None
    type: str
    title: str
    body: str | None
    link: str | None
    read_at: datetime | None
    created_at: datetime


class UnreadCountRead(BaseModel):
    count: int
