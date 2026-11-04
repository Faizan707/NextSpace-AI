from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CompanyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    employee_count: int = Field(ge=1, description="How many people work at the company")
    location: str = Field(min_length=1, max_length=255)


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    employee_count: int | None = Field(default=None, ge=1)
    location: str | None = Field(default=None, min_length=1, max_length=255)


class CompanyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    employee_count: int
    location: str
    created_at: datetime
