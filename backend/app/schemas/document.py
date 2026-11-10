from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.space import SpaceCreatorRead


class ComplianceFinding(BaseModel):
    severity: str
    code: str
    message: str


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    space_id: int
    original_name: str
    content_type: str | None
    size_bytes: int
    uploaded_by_id: int
    uploaded_by: SpaceCreatorRead
    members: list[SpaceCreatorRead] = []
    created_at: datetime
    compliance_status: str = "pending"
    compliance_summary: str | None = None
    compliance_score: int | None = None
    compliance_findings: list[ComplianceFinding] = Field(default_factory=list)
    compliance_checked_at: datetime | None = None
    compliance_engine: str | None = None
