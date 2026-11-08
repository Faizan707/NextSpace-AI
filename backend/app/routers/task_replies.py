"""Reply routes — separate from top-level comments for clearer API docs."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.project import TaskComment
from app.models.user import User
from app.routers.task_comments import comment_to_read, get_comment_on_task, save_comment_row
from app.schemas.task_activity import TaskCommentRead, TaskReplyCreate
from app.services.task_scope import assert_project_member_ids, require_task

router = APIRouter(prefix="/spaces", tags=["task-replies"])


@router.post(
    "/{space_id}/projects/{project_id}/tasks/{task_id}/comments/{comment_id}/replies",
    response_model=TaskCommentRead,
    status_code=status.HTTP_201_CREATED,
)
def reply_to_comment(
    space_id: int,
    project_id: int,
    task_id: int,
    comment_id: int,
    payload: TaskReplyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskCommentRead:
    """Reply to a top-level comment. Parent id comes from the URL."""

    project, _ = require_task(db, space_id, project_id, task_id, current_user)
    parent = get_comment_on_task(
        db,
        project_id=project_id,
        task_id=task_id,
        comment_id=comment_id,
    )
    if parent.parent_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use the reply-to-reply route for replies under a reply",
        )

    assert_project_member_ids(project, payload.mention_ids)
    created = save_comment_row(
        db,
        task_id=task_id,
        author_id=current_user.id,
        body=payload.body,
        parent_id=parent.id,
        mention_ids=payload.mention_ids,
    )
    return comment_to_read(created)


@router.post(
    "/{space_id}/projects/{project_id}/tasks/{task_id}/replies/{reply_id}/replies",
    response_model=TaskCommentRead,
    status_code=status.HTTP_201_CREATED,
)
def reply_to_reply(
    space_id: int,
    project_id: int,
    task_id: int,
    reply_id: int,
    payload: TaskReplyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskCommentRead:
    """Reply to an existing reply. Parent id comes from the URL."""

    project, _ = require_task(db, space_id, project_id, task_id, current_user)
    parent = get_comment_on_task(
        db,
        project_id=project_id,
        task_id=task_id,
        comment_id=reply_id,
    )
    if parent.parent_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use the reply-to-comment route for top-level comments",
        )

    # Only one level of reply-to-reply under a direct comment reply
    grandparent = db.get(TaskComment, parent.parent_id)
    if grandparent is None or grandparent.parent_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only one level of reply-to-reply is allowed",
        )

    assert_project_member_ids(project, payload.mention_ids)
    created = save_comment_row(
        db,
        task_id=task_id,
        author_id=current_user.id,
        body=payload.body,
        parent_id=parent.id,
        mention_ids=payload.mention_ids,
    )
    return comment_to_read(created)
