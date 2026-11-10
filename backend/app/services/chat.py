from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models.chat import Conversation, ConversationParticipant, Message
from app.models.user import User


def dm_pair_key(user_a_id: int, user_b_id: int) -> str:
    low, high = sorted((user_a_id, user_b_id))
    return f"{low}:{high}"


def conversation_query():
    return select(Conversation).options(
        selectinload(Conversation.participants).selectinload(ConversationParticipant.user),
        selectinload(Conversation.messages).selectinload(Message.sender),
    )


def find_dm_between(
    db: Session,
    company_id: int,
    user_a_id: int,
    user_b_id: int,
) -> Conversation | None:
    """Find an existing 1:1 conversation between two users in the same company."""

    key = dm_pair_key(user_a_id, user_b_id)
    by_key = db.scalar(
        conversation_query().where(
            Conversation.company_id == company_id,
            Conversation.dm_key == key,
        )
    )
    if by_key is not None:
        return by_key

    # Fallback for rows created before dm_key existed
    conversations = list(
        db.scalars(
            conversation_query().where(Conversation.company_id == company_id)
        ).all()
    )
    wanted = {user_a_id, user_b_id}
    for conversation in conversations:
        participant_ids = {item.user_id for item in conversation.participants}
        if participant_ids == wanted and len(conversation.participants) == 2:
            if not conversation.dm_key:
                conversation.dm_key = key
            return conversation
    return None


def get_or_create_dm(
    db: Session,
    company_id: int,
    user_a: User,
    user_b: User,
) -> Conversation:
    """Return the DM between two company users, creating it if needed."""

    existing = find_dm_between(db, company_id, user_a.id, user_b.id)
    if existing is not None:
        return existing

    key = dm_pair_key(user_a.id, user_b.id)
    conversation = Conversation(company_id=company_id, dm_key=key)
    db.add(conversation)
    try:
        db.flush()
    except IntegrityError:
        # Concurrent create for the same pair — reuse the winner
        db.rollback()
        existing = find_dm_between(db, company_id, user_a.id, user_b.id)
        if existing is not None:
            return existing
        raise

    db.add(ConversationParticipant(conversation_id=conversation.id, user_id=user_a.id))
    db.add(ConversationParticipant(conversation_id=conversation.id, user_id=user_b.id))
    db.flush()

    created = db.scalar(conversation_query().where(Conversation.id == conversation.id))
    assert created is not None
    return created


def get_other_participant(conversation: Conversation, current_user_id: int) -> User | None:
    for participant in conversation.participants:
        if participant.user_id != current_user_id:
            return participant.user
    return None


def user_is_participant(conversation: Conversation, user_id: int) -> bool:
    return any(item.user_id == user_id for item in conversation.participants)


def mark_conversation_read(db: Session, conversation_id: int, user_id: int) -> None:
    participant = db.scalar(
        select(ConversationParticipant).where(
            and_(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == user_id,
            )
        )
    )
    if participant is None:
        return
    from datetime import datetime, timezone

    participant.last_read_at = datetime.now(timezone.utc)


def dedupe_conversations_for_user(
    conversations: list[Conversation],
    current_user_id: int,
) -> list[Conversation]:
    """Keep one conversation per peer (prefer the one with latest activity)."""

    def activity_key(conversation: Conversation):
        if conversation.messages:
            latest = max(conversation.messages, key=lambda message: (message.created_at, message.id))
            return (latest.created_at, latest.id)
        return (conversation.created_at, conversation.id)

    best_by_peer: dict[int, Conversation] = {}
    for conversation in conversations:
        other = get_other_participant(conversation, current_user_id)
        if other is None:
            continue
        current = best_by_peer.get(other.id)
        if current is None or activity_key(conversation) > activity_key(current):
            best_by_peer[other.id] = conversation

    unique = list(best_by_peer.values())
    unique.sort(key=activity_key, reverse=True)
    return unique
