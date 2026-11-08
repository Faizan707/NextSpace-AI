"""Top-level task comments (list / create / delete). See task_replies for replies."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.project import ProjectTask, TaskComment, TaskCommentMention
from app.models.user import User
from app.routers.space_projects import _get_project_in_space
from app.schemas.space import SpaceCreatorRead
from app.schemas.task_activity import TaskCommentCreate, TaskCommentRead
from app.services.space_access import get_accessible_space
from app.services.task_scope import assert_project_member_ids, can_manage, require_task

router = APIRouter(prefix="/spaces", tags=["task-comments"])


def comment_query():
    # Load author + mentions, then replies, then replies-of-replies (2 levels)
    return select(TaskComment).options(
        selectinload(TaskComment.author),
        selectinload(TaskComment.mentions).selectinload(TaskCommentMention.user),
        selectinload(TaskComment.replies).selectinload(TaskComment.author),
        selectinload(TaskComment.replies)
        .selectinload(TaskComment.mentions)
        .selectinload(TaskCommentMention.user),
        selectinload(TaskComment.replies)
        .selectinload(TaskComment.replies)
        .selectinload(TaskComment.author),
        selectinload(TaskComment.replies)
        .selectinload(TaskComment.replies)
        .selectinload(TaskComment.mentions)
        .selectinload(TaskCommentMention.user),
    )


def sort_by_oldest(items: list[TaskComment]) -> list[TaskComment]:
    return sorted(items, key=lambda item: (item.created_at, item.id))


def comment_to_read(comment: TaskComment) -> TaskCommentRead:
    """Convert ONE comment/reply row to JSON. Nested replies stay empty here."""

    mention_ids: list[int] = []
    mentioned_users: list[SpaceCreatorRead] = []
    for mention in comment.mentions:
        mention_ids.append(mention.user_id)
        if mention.user is not None:
            mentioned_users.append(SpaceCreatorRead.model_validate(mention.user))

    return TaskCommentRead(
        id=comment.id,
        task_id=comment.task_id,
        author_id=comment.author_id,
        author=SpaceCreatorRead.model_validate(comment.author),
        parent_id=comment.parent_id,
        body=comment.body,
        mention_ids=mention_ids,
        mentions=mentioned_users,
        replies=[],
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


def comment_with_replies(comment: TaskComment) -> TaskCommentRead:
    """
    Build a top-level comment tree (max 2 reply levels):

      comment
        └── reply          (task-replies: reply to comment)
              └── reply    (task-replies: reply to reply)
    """

    result = comment_to_read(comment)

    for reply in sort_by_oldest(list(comment.replies)):
        reply_read = comment_to_read(reply)
        for nested in sort_by_oldest(list(reply.replies)):
            reply_read.replies.append(comment_to_read(nested))
        result.replies.append(reply_read)

    return result


def save_comment_row(
    db: Session,
    *,
    task_id: int,
    author_id: int,
    body: str,
    parent_id: int | None,
    mention_ids: list[int],
) -> TaskComment:
    """Insert a comment or reply row + optional mentions."""

    clean_body = body.strip()
    if not clean_body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Comment cannot be empty")

    row = TaskComment(
        task_id=task_id,
        author_id=author_id,
        parent_id=parent_id,
        body=clean_body,
    )
    db.add(row)
    db.flush()

    unique_mention_ids = list(dict.fromkeys(mention_ids))
    for user_id in unique_mention_ids:
        db.add(TaskCommentMention(comment_id=row.id, user_id=user_id))

    db.commit()
    created = db.scalar(comment_query().where(TaskComment.id == row.id))
    assert created is not None
    return created


def get_comment_on_task(
    db: Session,
    *,
    project_id: int,
    task_id: int,
    comment_id: int,
) -> TaskComment:
    comment = db.scalar(
        select(TaskComment)
        .join(ProjectTask, ProjectTask.id == TaskComment.task_id)
        .where(
            TaskComment.id == comment_id,
            TaskComment.task_id == task_id,
            ProjectTask.project_id == project_id,
        )
    )
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    return comment


@router.get(
    "/{space_id}/projects/{project_id}/tasks/{task_id}/comments",
    response_model=list[TaskCommentRead],
)
def list_comments(
    space_id: int,
    project_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TaskCommentRead]:
    require_task(db, space_id, project_id, task_id, current_user)
    comments = list(
        db.scalars(
            comment_query()
            .where(TaskComment.task_id == task_id, TaskComment.parent_id.is_(None))
            .order_by(TaskComment.created_at.asc(), TaskComment.id.asc())
        ).all()
    )
    result: list[TaskCommentRead] = []
    for comment in comments:
        result.append(comment_with_replies(comment))
    return result


@router.post(
    "/{space_id}/projects/{project_id}/tasks/{task_id}/comments",
    response_model=TaskCommentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    space_id: int,
    project_id: int,
    task_id: int,
    payload: TaskCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskCommentRead:
    """Create a top-level comment only. For replies, use the task-replies routes."""

    project, _ = require_task(db, space_id, project_id, task_id, current_user)
    assert_project_member_ids(project, payload.mention_ids)

    created = save_comment_row(
        db,
        task_id=task_id,
        author_id=current_user.id,
        body=payload.body,
        parent_id=None,
        mention_ids=payload.mention_ids,
    )
    return comment_to_read(created)


@router.delete(
    "/{space_id}/projects/{project_id}/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_comment(
    space_id: int,
    project_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a comment or reply (author or tenant owner)."""

    get_accessible_space(db, space_id, current_user)
    _get_project_in_space(db, space_id, project_id)
    comment = db.scalar(
        select(TaskComment)
        .join(ProjectTask, ProjectTask.id == TaskComment.task_id)
        .where(TaskComment.id == comment_id, ProjectTask.project_id == project_id)
    )
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if not can_manage(current_user, comment.author_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    db.delete(comment)
    db.commit()
