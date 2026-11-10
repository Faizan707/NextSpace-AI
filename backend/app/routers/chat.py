from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.chat import Conversation, Message
from app.models.user import User
from app.schemas.chat import ConversationCreate, ConversationRead, MessageCreate, MessageRead
from app.schemas.space import SpaceCreatorRead
from app.services.chat import (
    conversation_query,
    dedupe_conversations_for_user,
    get_or_create_dm,
    get_other_participant,
    mark_conversation_read,
    user_is_participant,
)
from app.services.notifications import notify_user
from app.services.realtime import queue_ws_event

router = APIRouter(tags=["chat"])


def _message_to_read(message: Message) -> MessageRead:
    return MessageRead(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        sender=SpaceCreatorRead.model_validate(message.sender),
        body=message.body,
        created_at=message.created_at,
    )


def _conversation_to_read(conversation: Conversation, current_user_id: int) -> ConversationRead:
    other = get_other_participant(conversation, current_user_id)
    if other is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DM peer missing")

    last_message = None
    if conversation.messages:
        ordered = sorted(conversation.messages, key=lambda item: (item.created_at, item.id))
        last_message = _message_to_read(ordered[-1])

    return ConversationRead(
        id=conversation.id,
        company_id=conversation.company_id,
        other_user=SpaceCreatorRead.model_validate(other),
        last_message=last_message,
        created_at=conversation.created_at,
    )


def _require_conversation(
    db: Session,
    conversation_id: int,
    current_user: User,
) -> Conversation:
    conversation = db.scalar(conversation_query().where(Conversation.id == conversation_id))
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if conversation.company_id != current_user.company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if not user_is_participant(conversation, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a participant")
    return conversation


@router.get("/inbox/directory", response_model=list[SpaceCreatorRead])
def list_directory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SpaceCreatorRead]:
    users = list(
        db.scalars(
            select(User)
            .where(
                User.company_id == current_user.company_id,
                User.id != current_user.id,
            )
            .order_by(User.full_name.asc().nulls_last(), User.email.asc())
        ).all()
    )
    return [SpaceCreatorRead.model_validate(user) for user in users]


@router.get("/inbox/conversations", response_model=list[ConversationRead])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ConversationRead]:
    conversations = list(
        db.scalars(
            conversation_query().where(Conversation.company_id == current_user.company_id)
        ).all()
    )
    mine = [item for item in conversations if user_is_participant(item, current_user.id)]
    unique = dedupe_conversations_for_user(mine, current_user.id)
    return [_conversation_to_read(item, current_user.id) for item in unique]


@router.post(
    "/inbox/conversations",
    response_model=ConversationRead,
    status_code=status.HTTP_201_CREATED,
)
def open_conversation(
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationRead:
    if payload.user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot chat with yourself")

    peer = db.scalar(
        select(User).where(
            User.id == payload.user_id,
            User.company_id == current_user.company_id,
        )
    )
    if peer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in your company")

    conversation = get_or_create_dm(db, current_user.company_id, current_user, peer)
    db.commit()
    refreshed = db.scalar(conversation_query().where(Conversation.id == conversation.id))
    assert refreshed is not None
    return _conversation_to_read(refreshed, current_user.id)


@router.get(
    "/inbox/conversations/{conversation_id}/messages",
    response_model=list[MessageRead],
)
def list_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MessageRead]:
    conversation = _require_conversation(db, conversation_id, current_user)
    mark_conversation_read(db, conversation.id, current_user.id)
    db.commit()

    messages = list(
        db.scalars(
            select(Message)
            .options(selectinload(Message.sender))
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc(), Message.id.asc())
        ).all()
    )
    return [_message_to_read(message) for message in messages]


@router.post(
    "/inbox/conversations/{conversation_id}/messages",
    response_model=MessageRead,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    conversation_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageRead:
    conversation = _require_conversation(db, conversation_id, current_user)
    body = payload.body.strip()
    if not body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty")

    message = Message(
        conversation_id=conversation.id,
        sender_id=current_user.id,
        body=body,
    )
    db.add(message)
    db.flush()

    peer = get_other_participant(conversation, current_user.id)
    if peer is not None:
        sender_label = current_user.full_name or current_user.email
        notify_user(
            db,
            user_id=peer.id,
            actor_id=current_user.id,
            type="chat_message",
            title=f"Message from {sender_label}",
            body=body[:180],
            link=f"/app/inbox?c={conversation.id}",
        )

    mark_conversation_read(db, conversation.id, current_user.id)

    created = db.scalar(
        select(Message).options(selectinload(Message.sender)).where(Message.id == message.id)
    )
    assert created is not None
    message_read = _message_to_read(created)
    payload = {
        "type": "chat.message",
        "message": message_read.model_dump(mode="json"),
    }
    # Sender already gets the message from the HTTP response — push only to peers
    for participant in conversation.participants:
        if participant.user_id != current_user.id:
            queue_ws_event(db, participant.user_id, payload)

    db.commit()
    return message_read
