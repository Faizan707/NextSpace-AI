"""Simple RAG helpers: chunk → embed → Qdrant → retrieve → chat."""

from __future__ import annotations

from typing import Any

from app.ai.llm import chat
from app.ai.qdrant_store import search_similar, upsert_texts


def chunk_text(text: str, *, chunk_size: int = 800, overlap: int = 120) -> list[str]:
    cleaned = " ".join((text or "").split())
    if not cleaned:
        return []
    if len(cleaned) <= chunk_size:
        return [cleaned]
    chunks: list[str] = []
    start = 0
    while start < len(cleaned):
        end = min(len(cleaned), start + chunk_size)
        chunks.append(cleaned[start:end])
        if end >= len(cleaned):
            break
        start = max(0, end - overlap)
    return chunks


def index_text(
    text: str,
    *,
    metadata: dict[str, Any] | None = None,
    chunk_size: int = 800,
    overlap: int = 120,
) -> list[str]:
    chunks = chunk_text(text, chunk_size=chunk_size, overlap=overlap)
    payloads = [{**(metadata or {}), "chunk_index": i} for i in range(len(chunks))]
    return upsert_texts(chunks, payloads=payloads)


def retrieve(query: str, *, limit: int = 5) -> list[dict[str, Any]]:
    return search_similar(query, limit=limit)


def answer_with_context(
    question: str,
    *,
    limit: int = 5,
    system_prompt: str | None = None,
) -> dict[str, Any]:
    hits = retrieve(question, limit=limit)
    context_blocks = []
    for i, hit in enumerate(hits, start=1):
        snippet = (hit.get("text") or "").strip()
        if snippet:
            context_blocks.append(f"[{i}] {snippet}")
    context = "\n\n".join(context_blocks) if context_blocks else "(no context found)"
    system = system_prompt or (
        "You are NextSpace AI assistant. Answer using only the provided context. "
        "If context is insufficient, say you do not know."
    )
    answer = chat(
        [
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {question}",
            },
        ]
    )
    return {"answer": answer, "sources": hits}
