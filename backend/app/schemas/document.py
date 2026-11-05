from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.space import SpaceCreatorRead


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    space_id: int
    original_name: str
    content_type: str | None
    size_bytes: int
    uploaded_by_id: int
    uploaded_by: SpaceCreatorRead
    created_at: datetime
