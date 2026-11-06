from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.project import Project, ProjectMember, ProjectStage, ProjectTask
from app.models.space import Space
from app.models.user import User, UserRole
from app.schemas.space import SpaceCreatorRead
from app.schemas.work import WorkProjectRead, WorkTaskRead

router = APIRouter(prefix="/work", tags=["work"])


def _project_query():
    return select(Project).options(
        selectinload(Project.created_by),
        selectinload(Project.memberships).selectinload(ProjectMember.user),
        selectinload(Project.space),
    )


def _to_work_project(project: Project) -> WorkProjectRead:
    return WorkProjectRead(
        id=project.id,
        space_id=project.space_id,
        space_name=project.space.name if project.space else "",
        name=project.name,
        description=project.description,
        status=project.status,  # type: ignore[arg-type]
        progress=project.progress,
        deadline=project.deadline,
        created_by_id=project.created_by_id,
        created_by=SpaceCreatorRead.model_validate(project.created_by),
        members=[
            SpaceCreatorRead.model_validate(membership.user)
            for membership in project.memberships
            if membership.user is not None
        ],
        created_at=project.created_at,
    )


def _to_work_task(task: ProjectTask) -> WorkTaskRead:
    project = task.project
    stage = task.stage
    space = project.space if project else None
    return WorkTaskRead(
        id=task.id,
        project_id=task.project_id,
        project_name=project.name if project else "",
        space_id=project.space_id if project else 0,
        space_name=space.name if space else "",
        stage_id=task.stage_id,
        stage_name=stage.name if stage else "",
        title=task.title,
        description=task.description,
        position=task.position,
        assignee_id=task.assignee_id,
        assignee=SpaceCreatorRead.model_validate(task.assignee) if task.assignee else None,
        created_by_id=task.created_by_id,
        created_by=SpaceCreatorRead.model_validate(task.created_by),
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.get("/projects", response_model=list[WorkProjectRead])
def list_work_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WorkProjectRead]:
    query = _project_query().where(Project.space.has(Space.company_id == current_user.company_id))

    if current_user.role != UserRole.TENANT_OWNER:
        query = query.where(
            or_(
                Project.created_by_id == current_user.id,
                Project.memberships.any(ProjectMember.user_id == current_user.id),
            )
        )

    projects = list(db.scalars(query.order_by(Project.created_at.desc())).unique().all())
    return [_to_work_project(project) for project in projects]


@router.get("/tasks", response_model=list[WorkTaskRead])
def list_work_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WorkTaskRead]:
    query = (
        select(ProjectTask)
        .join(Project, ProjectTask.project_id == Project.id)
        .join(Space, Project.space_id == Space.id)
        .where(Space.company_id == current_user.company_id)
        .options(
            selectinload(ProjectTask.assignee),
            selectinload(ProjectTask.created_by),
            selectinload(ProjectTask.stage),
            selectinload(ProjectTask.project).selectinload(Project.space),
        )
    )

    if current_user.role != UserRole.TENANT_OWNER:
        query = query.where(
            or_(
                ProjectTask.created_by_id == current_user.id,
                ProjectTask.assignee_id == current_user.id,
            )
        )

    tasks = list(db.scalars(query.order_by(ProjectTask.updated_at.desc())).unique().all())
    return [_to_work_task(task) for task in tasks]
