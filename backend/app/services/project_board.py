from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.project import DEFAULT_PROJECT_STAGES, Project, ProjectStage, ProjectTask
from app.schemas.board import BoardRead, StageRead, TaskRead
from app.schemas.space import SpaceCreatorRead


def ensure_default_stages(db: Session, project_id: int) -> None:
    existing = db.scalar(
        select(func.count()).select_from(ProjectStage).where(ProjectStage.project_id == project_id)
    )
    if existing and existing > 0:
        return
    for position, (name, is_default) in enumerate(DEFAULT_PROJECT_STAGES):
        db.add(
            ProjectStage(
                project_id=project_id,
                name=name,
                position=position,
                is_default=is_default,
            )
        )
    db.flush()


def stage_progress_weight(stage_name: str) -> int:
    """Todo = 0%, Done/Complete = 100%, all other stages = 50%."""
    key = stage_name.strip().lower()
    if key == "todo":
        return 0
    if key in {"done", "complete", "completed"}:
        return 100
    return 50


def recalculate_project_progress(db: Session, project_id: int) -> int:
    """Average task weights from their Kanban stages; no tasks → 0%."""
    rows = db.execute(
        select(ProjectStage.name)
        .join(ProjectTask, ProjectTask.stage_id == ProjectStage.id)
        .where(ProjectTask.project_id == project_id)
    ).all()
    if not rows:
        progress = 0
    else:
        total = sum(stage_progress_weight(name) for (name,) in rows)
        progress = int(round(total / len(rows)))

    project = db.get(Project, project_id)
    if project is not None:
        project.progress = progress
    return progress


def board_query(project_id: int):
    return (
        select(ProjectStage)
        .where(ProjectStage.project_id == project_id)
        .options(
            selectinload(ProjectStage.tasks).selectinload(ProjectTask.assignee),
        )
        .order_by(ProjectStage.position.asc(), ProjectStage.id.asc())
    )


def _task_to_read(task: ProjectTask) -> TaskRead:
    return TaskRead(
        id=task.id,
        project_id=task.project_id,
        stage_id=task.stage_id,
        title=task.title,
        description=task.description,
        priority=getattr(task, "priority", None) or "medium",  # type: ignore[arg-type]
        position=task.position,
        assignee_id=task.assignee_id,
        assignee=SpaceCreatorRead.model_validate(task.assignee) if task.assignee else None,
        created_by_id=task.created_by_id,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def _stage_to_read(stage: ProjectStage) -> StageRead:
    tasks = sorted(stage.tasks, key=lambda item: (item.position, item.id))
    return StageRead(
        id=stage.id,
        project_id=stage.project_id,
        name=stage.name,
        position=stage.position,
        is_default=stage.is_default,
        tasks=[_task_to_read(task) for task in tasks],
        created_at=stage.created_at,
    )


def get_board(db: Session, project_id: int) -> BoardRead:
    ensure_default_stages(db, project_id)
    db.commit()
    stages = list(db.scalars(board_query(project_id)).all())
    return BoardRead(
        project_id=project_id,
        stages=[_stage_to_read(stage) for stage in stages],
    )


def next_stage_position(db: Session, project_id: int) -> int:
    current = db.scalar(
        select(func.coalesce(func.max(ProjectStage.position), -1)).where(
            ProjectStage.project_id == project_id
        )
    )
    return int(current) + 1


def next_task_position(db: Session, stage_id: int) -> int:
    current = db.scalar(
        select(func.coalesce(func.max(ProjectTask.position), -1)).where(
            ProjectTask.stage_id == stage_id
        )
    )
    return int(current) + 1


def get_stage_in_project(db: Session, project_id: int, stage_id: int) -> ProjectStage | None:
    return db.scalar(
        select(ProjectStage).where(
            ProjectStage.id == stage_id,
            ProjectStage.project_id == project_id,
        )
    )


def get_task_in_project(db: Session, project_id: int, task_id: int) -> ProjectTask | None:
    return db.scalar(
        select(ProjectTask)
        .options(selectinload(ProjectTask.assignee))
        .where(ProjectTask.id == task_id, ProjectTask.project_id == project_id)
    )


def backfill_project_stages(db: Session) -> None:
    projects = list(db.scalars(select(Project.id)).all())
    for project_id in projects:
        ensure_default_stages(db, project_id)
        recalculate_project_progress(db, project_id)
    db.commit()
