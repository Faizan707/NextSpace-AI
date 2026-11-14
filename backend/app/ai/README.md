NextSpace AI module

Local LLM: Ollama (default)
Cloud LLM later: set AI_LLM_PROVIDER=openai + OPENAI_API_KEY
Vectors: Qdrant Cloud

Env (backend/.env)

AI_LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_CHAT_MODEL=qwen3:4b
OLLAMA_EMBED_MODEL=nomic-embed-text

QDRANT_URL=https://....aws.cloud.qdrant.io
QDRANT_API_KEY=...
QDRANT_COLLECTION=nextspace_docs

# Later:
# AI_LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-...
# OPENAI_CHAT_MODEL=gpt-4o-mini
# OPENAI_EMBED_MODEL=text-embedding-3-small

Ollama setup

1. Install Ollama
2. ollama pull qwen3:4b
3. ollama pull nomic-embed-text

Smoke test

cd backend
uv run python scripts/ai_smoke.py

Workspace assistant (tool calling)

API: POST /ai/chat
UI: /app/ai

Can:
- count/list assigned tasks, projects, spaces
- create/update spaces
- create/assign tasks
- read task comments and reply

RAG helpers

from app.ai import index_text, answer_with_context

index_text("Project Alpha deadline is Friday.", metadata={"space_id": 1})
result = answer_with_context("When is Project Alpha due?")
