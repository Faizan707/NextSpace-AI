from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.agent import run_assistant
from app.ai.llm import LlmError
from app.auth.deps import get_current_user
from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["ai"])


class ChatHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)


class AiChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    history: list[ChatHistoryItem] = Field(default_factory=list, max_length=40)


class AiChatResponse(BaseModel):
    reply: str
    provider: str
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)


@router.post("/chat", response_model=AiChatResponse)
def ai_chat(
    payload: AiChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AiChatResponse:
    try:
        result = run_assistant(
            db=db,
            user=current_user,
            message=payload.message,
            history=[item.model_dump() for item in payload.history],
        )
    except LlmError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc) or "AI assistant failed",
        ) from exc

    return AiChatResponse(
        reply=result["reply"],
        provider=result["provider"],
        tool_calls=result.get("tool_calls") or [],
    )
