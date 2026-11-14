"""Qdrant Cloud vector store helpers."""

from __future__ import annotations

import logging
import uuid
from functools import lru_cache
from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.http import models as qm

from app.ai.llm import embed_texts
from app.config import get_settings

logger = logging.getLogger(__name__)


class QdrantError(RuntimeError):
    pass


@lru_cache
def get_qdrant() -> QdrantClient:
    settings = get_settings()
    url = (settings.qdrant_url or "").strip()
    api_key = (settings.qdrant_api_key or "").strip()
    if not url:
        raise QdrantError("QDRANT_URL is not configured")
    if not api_key:
        raise QdrantError("QDRANT_API_KEY is not configured")
    return QdrantClient(url=url, api_key=api_key, timeout=60)


def _collection_name() -> str:
    return get_settings().qdrant_collection.strip() or "nextspace_docs"


def ensure_collection(vector_size: int | None = None) -> str:
    """Create collection if missing. Infers vector size from a probe embed when needed."""
    client = get_qdrant()
    name = _collection_name()
    existing = {c.name for c in client.get_collections().collections}
    if name in existing:
        return name

    size = vector_size
    if size is None:
        probe = embed_texts(["dimension probe"])
        size = len(probe[0])

    client.create_collection(
        collection_name=name,
        vectors_config=qm.VectorParams(size=size, distance=qm.Distance.COSINE),
    )
    logger.info("Created Qdrant collection %s (dim=%s)", name, size)
    return name


def upsert_texts(
    texts: list[str],
    *,
    payloads: list[dict[str, Any]] | None = None,
    ids: list[str] | None = None,
) -> list[str]:
    if not texts:
        return []
    if payloads is not None and len(payloads) != len(texts):
        raise QdrantError("payloads length must match texts")
    if ids is not None and len(ids) != len(texts):
        raise QdrantError("ids length must match texts")

    vectors = embed_texts(texts)
    name = ensure_collection(vector_size=len(vectors[0]))
    point_ids = ids or [str(uuid.uuid4()) for _ in texts]
    points = [
        qm.PointStruct(
            id=point_ids[i],
            vector=vectors[i],
            payload={**(payloads[i] if payloads else {}), "text": texts[i]},
        )
        for i in range(len(texts))
    ]
    get_qdrant().upsert(collection_name=name, points=points)
    return point_ids


def search_similar(query: str, *, limit: int = 5, score_threshold: float | None = None) -> list[dict[str, Any]]:
    vectors = embed_texts([query])
    name = ensure_collection(vector_size=len(vectors[0]))
    response = get_qdrant().query_points(
        collection_name=name,
        query=vectors[0],
        limit=limit,
        score_threshold=score_threshold,
    )
    results: list[dict[str, Any]] = []
    for hit in response.points:
        payload = hit.payload or {}
        results.append(
            {
                "id": str(hit.id),
                "score": float(hit.score) if hit.score is not None else None,
                "text": payload.get("text"),
                "payload": payload,
            }
        )
    return results
