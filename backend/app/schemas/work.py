from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.project import ProjectStatusValue
from app.schemas.space import SpaceCreatorRead


class WorkProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    space_id: int
    space_name: str
    name: str
    description: str | None
    status: ProjectStatusValue
    progress: int
    deadline: datetime | None
    created_by_id: int
    created_by: SpaceCreatorRead
    members: list[SpaceCreatorRead] = []
    created_at: datetime


class WorkTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    project_name: str
    space_id: int
    space_name: str
    stage_id: int
    stage_name: str
    title: str
    description: str | None
    priority: str = "medium"
    position: int
    assignee_id: int | None
    assignee: SpaceCreatorRead | None = None
    created_by_id: int
    created_by: SpaceCreatorRead
    created_at: datetime
    updated_at: datetime


class DashboardKpis(BaseModel):
    spaces: int
    projects: int
    teams: int
    members: int
    tasks_total: int
    tasks_done: int
    tasks_open: int
    avg_project_progress: int


class DashboardNamedCount(BaseModel):
    name: str
    value: int


class DashboardProjectProgress(BaseModel):
    name: str
    space_name: str
    progress: int


class DashboardTeamPerformance(BaseModel):
    name: str
    space_name: str
    members: int
    assigned_tasks: int
    done_tasks: int


class DashboardMemberPerformance(BaseModel):
    name: str
    assigned: int
    done: int
    open: int


class WorkDashboardRead(BaseModel):
    kpis: DashboardKpis
    tasks_by_priority: list[DashboardNamedCount]
    tasks_by_status: list[DashboardNamedCount]
    tasks_by_space: list[DashboardNamedCount]
    project_progress: list[DashboardProjectProgress]
    team_performance: list[DashboardTeamPerformance]
    member_performance: list[DashboardMemberPerformance]
