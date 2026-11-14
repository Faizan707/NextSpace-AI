from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.ai.agent import run_assistant
from app.ai.llm import LlmError
from app.auth.deps import get_current_user
from app.database import get_db
from app.models.ai_chat import AiConversation, AiMessage
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["ai"])


class AiMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime


class AiConversationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime
    updated_at: datetime


class AiConversationDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[AiMessageRead]


class AiChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    conversation_id: int | None = None


class AiChatResponse(BaseModel):
    conversation_id: int
    title: str
    reply: str
    provider: str
    user_message: AiMessageRead
    assistant_message: AiMessageRead
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)


def _title_from_message(message: str) -> str:
    cleaned = " ".join(message.strip().split())
    if len(cleaned) <= 60:
        return cleaned or "New chat"
    return cleaned[:57].rstrip() + "…"


def _get_owned_conversation(
    db: Session,
    conversation_id: int,
    user: User,
    *,
    with_messages: bool = False,
) -> AiConversation:
    query = select(AiConversation).where(
        AiConversation.id == conversation_id,
        AiConversation.user_id == user.id,
        AiConversation.company_id == user.company_id,
    )
    if with_messages:
        query = query.options(selectinload(AiConversation.messages))
    conversation = db.scalar(query)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    return conversation


@router.get("/conversations", response_model=list[AiConversationSummary])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AiConversation]:
    return list(
        db.scalars(
            select(AiConversation)
            .where(
                AiConversation.user_id == current_user.id,
                AiConversation.company_id == current_user.company_id,
            )
            .order_by(AiConversation.updated_at.desc())
            .limit(100)
        )
    )


@router.post("/conversations", response_model=AiConversationDetail, status_code=status.HTTP_201_CREATED)
def create_conversation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AiConversationDetail:
    conversation = AiConversation(
        company_id=current_user.company_id,
        user_id=current_user.id,
        title="New chat",
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return AiConversationDetail(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=[],
    )


@router.get("/conversations/{conversation_id}", response_model=AiConversationDetail)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AiConversationDetail:
    conversation = _get_owned_conversation(db, conversation_id, current_user, with_messages=True)
    return AiConversationDetail(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=[
            AiMessageRead.model_validate(m)
            for m in conversation.messages
            if m.role in {"user", "assistant"}
        ],
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    conversation = _get_owned_conversation(db, conversation_id, current_user)
    db.delete(conversation)
    db.commit()


@router.post("/chat", response_model=AiChatResponse)
def ai_chat(
    payload: AiChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AiChatResponse:
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message is required")

    conversation_id = payload.conversation_id
    history: list[dict[str, str]] = []

    if conversation_id is not None:
        conversation = _get_owned_conversation(
            db, conversation_id, current_user, with_messages=True
        )
        history = [
            {"role": m.role, "content": m.content}
            for m in conversation.messages
            if m.role in {"user", "assistant"}
        ][-20:]
    else:
        conversation = AiConversation(
            company_id=current_user.company_id,
            user_id=current_user.id,
            title=_title_from_message(message),
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        conversation_id = conversation.id

    try:
        result = run_assistant(
            db=db,
            user=current_user,
            message=message,
            history=history,
        )
    except LlmError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc) or "AI assistant failed",
        ) from exc

    conversation = _get_owned_conversation(db, conversation_id, current_user)
    user_msg = AiMessage(conversation_id=conversation.id, role="user", content=message)
    assistant_msg = AiMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=str(result.get("reply") or "").strip() or "Done.",
    )
    db.add(user_msg)
    db.add(assistant_msg)
    if conversation.title == "New chat":
        conversation.title = _title_from_message(message)
    conversation.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user_msg)
    db.refresh(assistant_msg)
    db.refresh(conversation)

    return AiChatResponse(
        conversation_id=conversation.id,
        title=conversation.title,
        reply=assistant_msg.content,
        provider=result["provider"],
        user_message=AiMessageRead.model_validate(user_msg),
        assistant_message=AiMessageRead.model_validate(assistant_msg),
        tool_calls=result.get("tool_calls") or [],
    )
