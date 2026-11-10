from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session, selectinload

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.chat import Notification
from app.models.user import User
from app.schemas.chat import NotificationRead, UnreadCountRead
from app.schemas.space import SpaceCreatorRead

router = APIRouter(tags=["notifications"])


def _notification_query():
    return select(Notification).options(
        selectinload(Notification.actor),
    )


def _to_read(notification: Notification) -> NotificationRead:
    return NotificationRead(
        id=notification.id,
        user_id=notification.user_id,
        actor_id=notification.actor_id,
        actor=SpaceCreatorRead.model_validate(notification.actor) if notification.actor else None,
        type=notification.type,
        title=notification.title,
        body=notification.body,
        link=notification.link,
        read_at=notification.read_at,
        created_at=notification.created_at,
    )


@router.get("/notifications", response_model=list[NotificationRead])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NotificationRead]:
    rows = list(
        db.scalars(
            _notification_query()
            .where(Notification.user_id == current_user.id)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
            .limit(50)
        ).all()
    )
    return [_to_read(row) for row in rows]


@router.get("/notifications/unread-count", response_model=UnreadCountRead)
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UnreadCountRead:
    count = db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.read_at.is_(None),
        )
    )
    return UnreadCountRead(count=int(count or 0))


@router.post("/notifications/{notification_id}/read", response_model=NotificationRead)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationRead:
    notification = db.scalar(
        _notification_query().where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if notification.read_at is None:
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        notification = db.scalar(_notification_query().where(Notification.id == notification_id))
        assert notification is not None
    return _to_read(notification)


@router.post("/notifications/read-all", response_model=UnreadCountRead)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UnreadCountRead:
    db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.read_at.is_(None),
        )
        .values(read_at=datetime.now(timezone.utc))
    )
    db.commit()
    return UnreadCountRead(count=0)
