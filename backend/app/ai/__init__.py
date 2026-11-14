"""NextSpace AI layer: LLM (Ollama → OpenAI) + Qdrant + workspace assistant."""

from app.ai.agent import run_assistant
from app.ai.llm import chat, embed_texts, get_llm_provider
from app.ai.qdrant_store import (
    ensure_collection,
    get_qdrant,
    search_similar,
    upsert_texts,
)
from app.ai.rag import index_text, retrieve

__all__ = [
    "chat",
    "embed_texts",
    "ensure_collection",
    "get_llm_provider",
    "get_qdrant",
    "index_text",
    "retrieve",
    "run_assistant",
    "search_similar",
    "upsert_texts",
]
