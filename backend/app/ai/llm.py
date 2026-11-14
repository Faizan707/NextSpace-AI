"""LLM + embeddings providers. Default: local Ollama. Switch via AI_LLM_PROVIDER=openai."""

from __future__ import annotations

import logging
from typing import Literal

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

ProviderName = Literal["ollama", "openai"]


class LlmError(RuntimeError):
    pass


def get_llm_provider() -> ProviderName:
    settings = get_settings()
    name = (settings.ai_llm_provider or "ollama").strip().lower()
    if name not in ("ollama", "openai"):
        raise LlmError(f"Unsupported AI_LLM_PROVIDER={name!r}. Use ollama or openai.")
    return name  # type: ignore[return-value]


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    provider = get_llm_provider()
    if provider == "ollama":
        return _ollama_embed(texts)
    return _openai_embed(texts)


def chat(
    messages: list[dict],
    *,
    temperature: float = 0.2,
) -> str:
    """messages: [{role: system|user|assistant, content: str}, ...]"""
    result = chat_with_tools(messages, tools=None, temperature=temperature)
    return (result.get("content") or "").strip()


def chat_with_tools(
    messages: list[dict],
    *,
    tools: list[dict] | None = None,
    temperature: float = 0.2,
) -> dict:
    """
    Returns {content: str, tool_calls: list}.
    tool_calls items use OpenAI shape: {id, type, function: {name, arguments}}.
    """
    provider = get_llm_provider()
    if provider == "ollama":
        return _ollama_chat(messages, tools=tools, temperature=temperature)
    return _openai_chat(messages, tools=tools, temperature=temperature)


def _ollama_embed(texts: list[str]) -> list[list[float]]:
    settings = get_settings()
    base = settings.ollama_base_url.rstrip("/")
    model = settings.ollama_embed_model
    vectors: list[list[float]] = []
    with httpx.Client(timeout=120.0) as client:
        for text in texts:
            response = client.post(
                f"{base}/api/embeddings",
                json={"model": model, "prompt": text},
            )
            if response.status_code >= 400:
                raise LlmError(
                    f"Ollama embeddings failed ({response.status_code}): {response.text[:300]}"
                )
            data = response.json()
            embedding = data.get("embedding")
            if not isinstance(embedding, list):
                raise LlmError("Ollama embeddings response missing embedding[]")
            vectors.append(embedding)
    return vectors


def _normalize_tool_calls(raw_calls: list | None) -> list[dict]:
    normalized: list[dict] = []
    if not raw_calls:
        return normalized
    for index, call in enumerate(raw_calls):
        if not isinstance(call, dict):
            continue
        fn = call.get("function") or {}
        name = fn.get("name") or call.get("name")
        if not name:
            continue
        arguments = fn.get("arguments", call.get("arguments", {}))
        if isinstance(arguments, dict):
            import json as _json

            arguments = _json.dumps(arguments)
        normalized.append(
            {
                "id": call.get("id") or f"call_{index}_{name}",
                "type": "function",
                "function": {"name": name, "arguments": arguments or "{}"},
            }
        )
    return normalized


def _ollama_chat(
    messages: list[dict],
    *,
    tools: list[dict] | None = None,
    temperature: float,
) -> dict:
    settings = get_settings()
    base = settings.ollama_base_url.rstrip("/")
    model = settings.ollama_chat_model
    payload: dict = {
        "model": model,
        "messages": messages,
        "stream": False,
        # Qwen3 "thinking" can burn the whole timeout before any tool JSON appears.
        "think": False,
        "options": {
            "temperature": temperature,
            "num_predict": 512,
        },
    }
    if tools:
        payload["tools"] = tools
    try:
        with httpx.Client(timeout=120.0) as client:
            response = client.post(f"{base}/api/chat", json=payload)
    except httpx.TimeoutException as exc:
        raise LlmError(
            "AI model timed out. Ollama is slow or busy — retry, or keep the request shorter."
        ) from exc
    except httpx.HTTPError as exc:
        raise LlmError(f"Ollama connection failed: {exc}") from exc
    if response.status_code >= 400:
        raise LlmError(f"Ollama chat failed ({response.status_code}): {response.text[:300]}")
    data = response.json()
    message = data.get("message") or {}
    content = message.get("content")
    if content is None:
        content = ""
    if not isinstance(content, str):
        raise LlmError("Ollama chat response missing message.content")
    return {
        "content": content,
        "tool_calls": _normalize_tool_calls(message.get("tool_calls")),
    }


def _openai_embed(texts: list[str]) -> list[list[float]]:
    settings = get_settings()
    if not settings.openai_api_key:
        raise LlmError("OPENAI_API_KEY is required when AI_LLM_PROVIDER=openai")
    base = settings.openai_base_url.rstrip("/")
    with httpx.Client(timeout=120.0) as client:
        response = client.post(
            f"{base}/embeddings",
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json={"model": settings.openai_embed_model, "input": texts},
        )
        if response.status_code >= 400:
            raise LlmError(
                f"OpenAI embeddings failed ({response.status_code}): {response.text[:300]}"
            )
        data = response.json()
        items = sorted(data.get("data") or [], key=lambda row: row.get("index", 0))
        vectors = [row.get("embedding") for row in items]
        if not vectors or any(not isinstance(v, list) for v in vectors):
            raise LlmError("OpenAI embeddings response malformed")
        return vectors  # type: ignore[return-value]


def _openai_chat(
    messages: list[dict],
    *,
    tools: list[dict] | None = None,
    temperature: float,
) -> dict:
    settings = get_settings()
    if not settings.openai_api_key:
        raise LlmError("OPENAI_API_KEY is required when AI_LLM_PROVIDER=openai")
    base = settings.openai_base_url.rstrip("/")
    payload: dict = {
        "model": settings.openai_chat_model,
        "messages": messages,
        "temperature": temperature,
    }
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"
    try:
        with httpx.Client(timeout=90.0) as client:
            response = client.post(
                f"{base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
    except httpx.TimeoutException as exc:
        raise LlmError("OpenAI timed out — please retry.") from exc
    except httpx.HTTPError as exc:
        raise LlmError(f"OpenAI connection failed: {exc}") from exc
    if response.status_code >= 400:
        raise LlmError(f"OpenAI chat failed ({response.status_code}): {response.text[:300]}")
    data = response.json()
    try:
        message = data["choices"][0]["message"]
    except (KeyError, IndexError, TypeError) as exc:
        raise LlmError("OpenAI chat response malformed") from exc
    content = message.get("content") or ""
    return {
        "content": content if isinstance(content, str) else "",
        "tool_calls": _normalize_tool_calls(message.get("tool_calls")),
    }
