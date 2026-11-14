"""Tool-calling assistant loop (Ollama now, OpenAI-compatible later)."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from sqlalchemy.orm import Session

from app.ai.llm import LlmError, chat, chat_with_tools, get_llm_provider
from app.ai.tools import TOOL_HANDLERS, ToolContext, execute_tool, tool_specs
from app.models.user import User

logger = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 8

SYSTEM_PROMPT = """You are NextSpace AI, a helpful workspace assistant inside the NextSpace product.
You help the signed-in user with their company workspace using tools.

You can:
- answer how many tasks are assigned to them, projects, spaces, members
- list spaces/projects/tasks (only projects the user created or is a member of)
- create and update spaces
- rename/update projects only if the user is the project creator or an admin (company owner / space creator)
- create tasks and assign them to people
- read task comments and reply to comments

Rules:
- Always use tools for live data. Do not invent ids, counts, or names.
- Prefer concise, clear answers.
- When renaming a project: prefer one update_project call with project_name + new name. If can_update=false or permission error, refuse (member-only cannot rename; only creator/admin). Use list_projects only when the name is ambiguous.
- When creating/updating, confirm what you did with ids and titles.
- If a tool returns an error, explain it and ask for missing details.
- Stay within the current user's company and permissions.
- Users may mention people as @Name <email@domain>. For create_task / assign_task, pass that email as assignee_email (or resolve with find_user).
"""

OLLAMA_TOOL_PROTOCOL = """
When you need data or to take an action, output ONLY one JSON object on a single line:
{{"tool":"<tool_name>","arguments":{{...}}}}

When you are ready to answer the user, output ONLY:
{{"final":"<your answer to the user>"}}

Available tools:
{tool_list}

Do not wrap JSON in markdown fences. Do not add extra text outside the JSON object.
"""


def run_assistant(
    *,
    db: Session,
    user: User,
    message: str,
    history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    provider = get_llm_provider()
    if provider == "openai":
        return _run_native_tools(db=db, user=user, message=message, history=history, provider=provider)
    return _run_ollama_json_tools(db=db, user=user, message=message, history=history, provider=provider)


def _history_messages(history: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = []
    for item in history or []:
        role = item.get("role")
        content = item.get("content")
        if role in {"user", "assistant"} and isinstance(content, str) and content.strip():
            messages.append({"role": role, "content": content.strip()})
    return messages


def _run_native_tools(
    *,
    db: Session,
    user: User,
    message: str,
    history: list[dict[str, Any]] | None,
    provider: str,
) -> dict[str, Any]:
    messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(_history_messages(history))
    messages.append({"role": "user", "content": message.strip()})

    tools = tool_specs()
    ctx = ToolContext(db=db, user=user)
    tool_trace: list[dict[str, Any]] = []

    for _round in range(MAX_TOOL_ROUNDS):
        response = chat_with_tools(messages, tools=tools)
        tool_calls = response.get("tool_calls") or []
        content = (response.get("content") or "").strip()

        if not tool_calls:
            return {
                "reply": content or "Done.",
                "provider": provider,
                "tool_calls": tool_trace,
            }

        assistant_msg: dict[str, Any] = {"role": "assistant", "content": content or ""}
        assistant_msg["tool_calls"] = tool_calls
        messages.append(assistant_msg)

        for call in tool_calls:
            fn = call.get("function") or {}
            name = fn.get("name") or ""
            raw_args = fn.get("arguments")
            call_id = call.get("id") or name
            result = execute_tool(name, raw_args, ctx)
            tool_trace.append({"name": name, "arguments": raw_args, "result": _safe_json(result)})
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call_id,
                    "name": name,
                    "content": result,
                }
            )

    return {
        "reply": "I hit the tool-call limit while working on that. Please try a narrower request.",
        "provider": provider,
        "tool_calls": tool_trace,
    }


def _tool_list_for_prompt() -> str:
    lines: list[str] = []
    for spec in tool_specs():
        fn = spec["function"]
        lines.append(f"- {fn['name']}: {fn['description']}")
        params = fn.get("parameters") or {}
        props = params.get("properties") or {}
        if props:
            lines.append(f"  args: {', '.join(props.keys())}")
    return "\n".join(lines)


def _extract_json_object(text: str) -> dict[str, Any] | None:
    cleaned = (text or "").strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    # Prefer first JSON object in the response
    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def _run_ollama_json_tools(
    *,
    db: Session,
    user: User,
    message: str,
    history: list[dict[str, Any]] | None,
    provider: str,
) -> dict[str, Any]:
    protocol = OLLAMA_TOOL_PROTOCOL.format(tool_list=_tool_list_for_prompt())
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT + "\n" + protocol},
    ]
    messages.extend(_history_messages(history))
    messages.append({"role": "user", "content": message.strip()})

    ctx = ToolContext(db=db, user=user)
    tool_trace: list[dict[str, Any]] = []

    for _round in range(MAX_TOOL_ROUNDS):
        try:
            raw = chat(messages, temperature=0.1)
        except LlmError:
            raise
        parsed = _extract_json_object(raw)
        if not parsed:
            # Model answered in plain text — accept as final.
            return {"reply": raw.strip() or "Done.", "provider": provider, "tool_calls": tool_trace}

        if "final" in parsed:
            reply = str(parsed.get("final") or "").strip() or "Done."
            return {"reply": reply, "provider": provider, "tool_calls": tool_trace}

        tool_name = str(parsed.get("tool") or "").strip()
        arguments = parsed.get("arguments") or {}
        if not tool_name or tool_name not in TOOL_HANDLERS:
            messages.append({"role": "assistant", "content": raw})
            messages.append(
                {
                    "role": "user",
                    "content": (
                        'Unknown or missing tool. Reply with either '
                        '{"tool":"...","arguments":{...}} or {"final":"..."}.'
                    ),
                }
            )
            continue

        result = execute_tool(tool_name, arguments if isinstance(arguments, dict) else {}, ctx)
        tool_trace.append({"name": tool_name, "arguments": arguments, "result": _safe_json(result)})
        messages.append({"role": "assistant", "content": raw})
        messages.append(
            {
                "role": "user",
                "content": (
                    f"Tool result for {tool_name}:\n{result}\n\n"
                    'Continue. Output {"tool":...} again if needed, otherwise {"final":"..."}.'
                ),
            }
        )

    return {
        "reply": "I hit the tool-call limit while working on that. Please try a narrower request.",
        "provider": provider,
        "tool_calls": tool_trace,
    }


def _safe_json(raw: str) -> Any:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw
