from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.project import Project, ProjectStage, ProjectTask
from app.models.user import User
from app.routers.space_projects import _get_project_in_space, _to_read
from app.schemas.board import (
    BoardRead,
    StageCreate,
    StageRead,
    StageUpdate,
    TaskCreate,
    TaskRead,
    TaskUpdate,
)
from app.schemas.project import ProjectRead
from app.schemas.space import SpaceCreatorRead
from app.services.notifications import notify_user
from app.services.project_board import (
    ensure_default_stages,
    get_board,
    get_stage_in_project,
    get_task_in_project,
    next_stage_position,
    next_task_position,
    recalculate_project_progress,
)
from app.services.space_access import (
    get_accessible_space,
    require_project_access,
    require_project_write,
)

router = APIRouter(prefix="/spaces", tags=["project-board"])


def _task_to_read(task: ProjectTask) -> TaskRead:
    return TaskRead(
        id=task.id,
        project_id=task.project_id,
        stage_id=task.stage_id,
        title=task.title,
        description=task.description,
        priority=task.priority,  # type: ignore[arg-type]
        position=task.position,
        assignee_id=task.assignee_id,
        assignee=SpaceCreatorRead.model_validate(task.assignee) if task.assignee else None,
        created_by_id=task.created_by_id,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def _stage_to_read(stage: ProjectStage, include_tasks: bool = False) -> StageRead:
    tasks = []
    if include_tasks:
        tasks = [
            _task_to_read(task)
            for task in sorted(stage.tasks, key=lambda item: (item.position, item.id))
        ]
    return StageRead(
        id=stage.id,
        project_id=stage.project_id,
        name=stage.name,
        position=stage.position,
        is_default=stage.is_default,
        tasks=tasks,
        created_at=stage.created_at,
    )


def _assert_assignee_on_project(project: Project, assignee_id: int | None) -> None:
    if assignee_id is None:
        return
    member_ids = {membership.user_id for membership in project.memberships}
    if assignee_id not in member_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignee must be a project member",
        )


@router.get("/{space_id}/projects/{project_id}", response_model=ProjectRead)
def get_project(
    space_id: int,
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectRead:
    space = get_accessible_space(db, space_id, current_user)
    project = _get_project_in_space(db, space_id, project_id)
    require_project_access(current_user, space, project)
    return _to_read(project)


@router.get("/{space_id}/projects/{project_id}/board", response_model=BoardRead)
def read_board(
    space_id: int,
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BoardRead:
    space = get_accessible_space(db, space_id, current_user)
    project = _get_project_in_space(db, space_id, project_id)
    require_project_access(current_user, space, project)
    return get_board(db, project_id)


@router.post(
    "/{space_id}/projects/{project_id}/stages",
    response_model=StageRead,
    status_code=status.HTTP_201_CREATED,
)
def create_stage(
    space_id: int,
    project_id: int,
    payload: StageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StageRead:
    space = get_accessible_space(db, space_id, current_user)
    project = _get_project_in_space(db, space_id, project_id)
    require_project_write(current_user, space, project)
    ensure_default_stages(db, project_id)

    stage = ProjectStage(
        project_id=project_id,
        name=payload.name.strip(),
        position=next_stage_position(db, project_id),
        is_default=False,
    )
    db.add(stage)
    db.commit()
    db.refresh(stage)
    return _stage_to_read(stage)


@router.patch("/{space_id}/projects/{project_id}/stages/{stage_id}", response_model=StageRead)
def update_stage(
    space_id: int,
    project_id: int,
    stage_id: int,
    payload: StageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StageRead:
    space = get_accessible_space(db, space_id, current_user)
    project = _get_project_in_space(db, space_id, project_id)
    require_project_write(current_user, space, project)
    stage = get_stage_in_project(db, project_id, stage_id)
    if stage is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stage not found")

    data = payload.model_dump(exclude_unset=True)
    if "name" in data and isinstance(data["name"], str):
        data["name"] = data["name"].strip()
    for field, value in data.items():
        setattr(stage, field, value)

    if "name" in data:
        recalculate_project_progress(db, project_id)
    db.commit()
    db.refresh(stage)
    return _stage_to_read(stage)


@router.delete(
    "/{space_id}/projects/{project_id}/stages/{stage_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_stage(
    space_id: int,
    project_id: int,
    stage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    space = get_accessible_space(db, space_id, current_user)
    project = _get_project_in_space(db, space_id, project_id)
    require_project_write(current_user, space, project)
    stage = get_stage_in_project(db, project_id, stage_id)
    if stage is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stage not found")
    if stage.is_default:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Default stages cannot be deleted",
        )

    task_count = db.scalar(
        select(ProjectTask.id).where(ProjectTask.stage_id == stage.id).limit(1)
    )
    if task_count is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Move or delete tasks before removing this stage",
        )

    db.delete(stage)
    db.commit()


@router.post(
    "/{space_id}/projects/{project_id}/tasks",
    response_model=TaskRead,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    space_id: int,
    project_id: int,
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskRead:
    space = get_accessible_space(db, space_id, current_user)
    project = _get_project_in_space(db, space_id, project_id)
    require_project_write(current_user, space, project)
    ensure_default_stages(db, project_id)

    stage = get_stage_in_project(db, project_id, payload.stage_id)
    if stage is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stage not found")

    _assert_assignee_on_project(project, payload.assignee_id)

    task = ProjectTask(
        project_id=project_id,
        stage_id=stage.id,
        title=payload.title.strip(),
        description=payload.description,
        priority=payload.priority,
        position=next_task_position(db, stage.id),
        assignee_id=payload.assignee_id,
        created_by_id=current_user.id,
    )
    db.add(task)
    db.flush()
    recalculate_project_progress(db, project_id)

    if payload.assignee_id is not None:
        actor_label = current_user.full_name or current_user.email
        notify_user(
            db,
            user_id=payload.assignee_id,
            actor_id=current_user.id,
            type="task_assigned",
            title=f"Assigned to “{task.title}”",
            body=f"{actor_label} assigned you this task.",
            link=f"/app/spaces/{space_id}/projects/{project_id}",
        )

    db.commit()
    created = get_task_in_project(db, project_id, task.id)
    return _task_to_read(created)


@router.patch("/{space_id}/projects/{project_id}/tasks/{task_id}", response_model=TaskRead)
def update_task(
    space_id: int,
    project_id: int,
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskRead:
    space = get_accessible_space(db, space_id, current_user)
    project = _get_project_in_space(db, space_id, project_id)
    require_project_write(current_user, space, project)
    task = get_task_in_project(db, project_id, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    data = payload.model_dump(exclude_unset=True)
    if "title" in data and isinstance(data["title"], str):
        data["title"] = data["title"].strip()

    if "stage_id" in data and data["stage_id"] is not None:
        stage = get_stage_in_project(db, project_id, data["stage_id"])
        if stage is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stage not found")
        if data["stage_id"] != task.stage_id and "position" not in data:
            data["position"] = next_task_position(db, data["stage_id"])

    previous_assignee_id = task.assignee_id
    if "assignee_id" in data:
        _assert_assignee_on_project(project, data["assignee_id"])

    for field, value in data.items():
        setattr(task, field, value)

    db.flush()
    recalculate_project_progress(db, project_id)

    new_assignee_id = task.assignee_id
    if (
        "assignee_id" in data
        and new_assignee_id is not None
        and new_assignee_id != previous_assignee_id
    ):
        actor_label = current_user.full_name or current_user.email
        notify_user(
            db,
            user_id=new_assignee_id,
            actor_id=current_user.id,
            type="task_assigned",
            title=f"Assigned to “{task.title}”",
            body=f"{actor_label} assigned you this task.",
            link=f"/app/spaces/{space_id}/projects/{project_id}",
        )

    db.commit()
    updated = get_task_in_project(db, project_id, task.id)
    return _task_to_read(updated)


@router.delete(
    "/{space_id}/projects/{project_id}/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_task(
    space_id: int,
    project_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    space = get_accessible_space(db, space_id, current_user)
    project = _get_project_in_space(db, space_id, project_id)
    require_project_write(current_user, space, project)
    task = get_task_in_project(db, project_id, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    db.delete(task)
    db.flush()
    recalculate_project_progress(db, project_id)
    db.commit()
