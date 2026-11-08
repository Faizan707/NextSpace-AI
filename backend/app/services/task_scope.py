"""Shared helpers for task-scoped routes (detail, comments, replies, attachments)."""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.project import Project, ProjectTask
from app.models.user import User, UserRole
from app.routers.space_projects import _get_project_in_space
from app.services.space_access import get_accessible_space


def task_detail_query():
    return select(ProjectTask).options(
        selectinload(ProjectTask.assignee),
        selectinload(ProjectTask.created_by),
        selectinload(ProjectTask.stage),
    )


def require_task(
    db: Session,
    space_id: int,
    project_id: int,
    task_id: int,
    current_user: User,
) -> tuple[Project, ProjectTask]:
    get_accessible_space(db, space_id, current_user)
    project = _get_project_in_space(db, space_id, project_id)
    task = db.scalar(
        task_detail_query().where(ProjectTask.id == task_id, ProjectTask.project_id == project_id)
    )
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return project, task


def assert_project_member_ids(project: Project, user_ids: list[int]) -> None:
    if not user_ids:
        return
    member_ids = {membership.user_id for membership in project.memberships}
    invalid = [uid for uid in user_ids if uid not in member_ids]
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mentions must be project members",
        )


def can_manage(current_user: User, owner_id: int) -> bool:
    return current_user.id == owner_id or current_user.role == UserRole.TENANT_OWNER
