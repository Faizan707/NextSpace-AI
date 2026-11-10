from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.chat import Notification
from app.models.user import User
from app.schemas.space import SpaceCreatorRead
from app.services.realtime import queue_ws_event


def _notification_payload(notification: Notification) -> dict:
    actor = None
    if notification.actor is not None:
        actor = SpaceCreatorRead.model_validate(notification.actor).model_dump(mode="json")
    created = notification.created_at or datetime.now(timezone.utc)
    return {
        "type": "notification.created",
        "notification": {
            "id": notification.id,
            "user_id": notification.user_id,
            "actor_id": notification.actor_id,
            "actor": actor,
            "type": notification.type,
            "title": notification.title,
            "body": notification.body,
            "link": notification.link,
            "read_at": notification.read_at.isoformat() if notification.read_at else None,
            "created_at": created.isoformat(),
        },
    }


def notify_user(
    db: Session,
    *,
    user_id: int,
    type: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
    actor_id: int | None = None,
) -> Notification | None:
    """Create an in-app notification and push it over WebSocket after commit."""

    if actor_id is not None and actor_id == user_id:
        return None

    row = Notification(
        user_id=user_id,
        actor_id=actor_id,
        type=type,
        title=title,
        body=body,
        link=link,
    )
    db.add(row)
    db.flush()
    db.refresh(row)

    if actor_id is not None:
        row.actor = db.get(User, actor_id)

    queue_ws_event(db, user_id, _notification_payload(row))
    return row 
