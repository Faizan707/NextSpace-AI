"""Smoke-test Qdrant + current LLM provider (Ollama by default)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.ai.llm import chat, embed_texts, get_llm_provider  # noqa: E402
from app.ai.qdrant_store import ensure_collection, get_qdrant, search_similar, upsert_texts  # noqa: E402
from app.config import get_settings  # noqa: E402


def main() -> int:
    settings = get_settings()
    provider = get_llm_provider()
    print(f"provider={provider}")
    print(f"qdrant_url={settings.qdrant_url}")
    print(f"collection={settings.qdrant_collection}")

    client = get_qdrant()
    collections = [c.name for c in client.get_collections().collections]
    print(f"qdrant_ok collections={len(collections)}")

    vectors = embed_texts(["NextSpace AI smoke test"])
    print(f"embed_ok dim={len(vectors[0])}")

    ensure_collection(vector_size=len(vectors[0]))
    upsert_texts(
        ["NextSpace AI uses Qdrant for vector search and Ollama locally."],
        payloads=[{"source": "ai_smoke"}],
    )
    hits = search_similar("What does NextSpace use for vectors?", limit=3)
    print(f"search_ok hits={len(hits)} top_score={hits[0]['score'] if hits else None}")

    reply = chat(
        [
            {"role": "system", "content": "Reply in one short sentence."},
            {"role": "user", "content": "Say hello from NextSpace AI smoke test."},
        ]
    )
    print(f"chat_ok reply={reply[:200]!r}")
    print("AI smoke passed")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"AI smoke failed: {exc}")
        raise SystemExit(1)
