"""Task detail + attachments. Comments live in task_comments; replies in task_replies."""

import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.project import ProjectTask, TaskAttachment
from app.models.user import User
from app.rate_limit import limiter
from app.routers.space_projects import _get_project_in_space
from app.schemas.space import SpaceCreatorRead
from app.schemas.task_activity import TaskAttachmentRead, TaskDetailRead
from app.services.space_access import get_accessible_space
from app.services.storage import delete_stored, download_response, save_bytes
from app.services.task_scope import can_manage, require_task

router = APIRouter(prefix="/spaces", tags=["task-activity"])

MAX_UPLOAD_BYTES = 25 * 1024 * 1024

ALLOWED_ATTACHMENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
}

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".bmp",
}


def _attachment_query():
    return select(TaskAttachment).options(selectinload(TaskAttachment.uploaded_by))


def _to_task_detail(task: ProjectTask) -> TaskDetailRead:
    return TaskDetailRead(
        id=task.id,
        project_id=task.project_id,
        stage_id=task.stage_id,
        stage_name=task.stage.name if task.stage else "—",
        title=task.title,
        description=task.description,
        priority=getattr(task, "priority", None) or "medium",  # type: ignore[arg-type]
        position=task.position,
        assignee_id=task.assignee_id,
        assignee=SpaceCreatorRead.model_validate(task.assignee) if task.assignee else None,
        created_by_id=task.created_by_id,
        created_by=SpaceCreatorRead.model_validate(task.created_by),
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def _to_attachment_read(attachment: TaskAttachment) -> TaskAttachmentRead:
    return TaskAttachmentRead(
        id=attachment.id,
        task_id=attachment.task_id,
        original_name=attachment.original_name,
        content_type=attachment.content_type,
        size_bytes=attachment.size_bytes,
        uploaded_by_id=attachment.uploaded_by_id,
        uploaded_by=SpaceCreatorRead.model_validate(attachment.uploaded_by),
        created_at=attachment.created_at,
    )


def _is_attachment_allowed(filename: str, content_type: str | None) -> bool:
    suffix = Path(filename).suffix.lower()
    if suffix in ALLOWED_EXTENSIONS:
        return True
    if content_type and content_type.startswith("image/"):
        return True
    if content_type in ALLOWED_ATTACHMENT_TYPES:
        return True
    return False


@router.get(
    "/{space_id}/projects/{project_id}/tasks/{task_id}",
    response_model=TaskDetailRead,
)
def get_task(
    space_id: int,
    project_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskDetailRead:
    _, task = require_task(db, space_id, project_id, task_id, current_user)
    return _to_task_detail(task)


@router.get(
    "/{space_id}/projects/{project_id}/tasks/{task_id}/attachments",
    response_model=list[TaskAttachmentRead],
)
def list_attachments(
    space_id: int,
    project_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TaskAttachmentRead]:
    require_task(db, space_id, project_id, task_id, current_user)
    attachments = list(
        db.scalars(
            _attachment_query()
            .where(TaskAttachment.task_id == task_id)
            .order_by(TaskAttachment.created_at.desc(), TaskAttachment.id.desc())
        ).all()
    )
    return [_to_attachment_read(item) for item in attachments]


@router.post(
    "/{space_id}/projects/{project_id}/tasks/{task_id}/attachments",
    response_model=TaskAttachmentRead,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("30/minute")
async def upload_attachment(
    request: Request,
    space_id: int,
    project_id: int,
    task_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskAttachmentRead:
    require_task(db, space_id, project_id, task_id, current_user)

    original_name = Path(file.filename or "upload.bin").name
    data = await file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 25MB)")
    if not _is_attachment_allowed(original_name, file.content_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only images, PDF, and Office documents are allowed",
        )

    suffix = Path(original_name).suffix[:40]
    stored_name = f"{secrets.token_urlsafe(16)}{suffix}"
    stored_path = f"tasks/{task_id}/{stored_name}"
    save_bytes(relative_path=stored_path, data=data, content_type=file.content_type)

    attachment = TaskAttachment(
        task_id=task_id,
        original_name=original_name,
        stored_path=stored_path,
        content_type=file.content_type,
        size_bytes=len(data),
        uploaded_by_id=current_user.id,
    )
    db.add(attachment)
    db.commit()
    created = db.scalar(_attachment_query().where(TaskAttachment.id == attachment.id))
    assert created is not None
    return _to_attachment_read(created)


@router.get(
    "/{space_id}/projects/{project_id}/attachments/{attachment_id}/download",
)
def download_attachment(
    space_id: int,
    project_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    get_accessible_space(db, space_id, current_user)
    _get_project_in_space(db, space_id, project_id)
    attachment = db.scalar(
        _attachment_query()
        .join(ProjectTask, ProjectTask.id == TaskAttachment.task_id)
        .where(TaskAttachment.id == attachment_id, ProjectTask.project_id == project_id)
    )
    if attachment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    return download_response(
        relative_path=attachment.stored_path,
        filename=attachment.original_name,
        content_type=attachment.content_type,
    )


@router.delete(
    "/{space_id}/projects/{project_id}/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_attachment(
    space_id: int,
    project_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    get_accessible_space(db, space_id, current_user)
    _get_project_in_space(db, space_id, project_id)
    attachment = db.scalar(
        select(TaskAttachment)
        .join(ProjectTask, ProjectTask.id == TaskAttachment.task_id)
        .where(TaskAttachment.id == attachment_id, ProjectTask.project_id == project_id)
    )
    if attachment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")
    if not can_manage(current_user, attachment.uploaded_by_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    stored_path = attachment.stored_path
    db.delete(attachment)
    db.commit()
    delete_stored(stored_path)
