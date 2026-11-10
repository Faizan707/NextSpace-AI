"""In-process WebSocket fan-out for chat + notifications."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any

from fastapi import WebSocket
from sqlalchemy import event
from sqlalchemy.orm import Session


class RealtimeHub:
    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = defaultdict(set)
        self._loop: asyncio.AbstractEventLoop | None = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[user_id].add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        sockets = self._connections.get(user_id)
        if not sockets:
            return
        sockets.discard(websocket)
        if not sockets:
            self._connections.pop(user_id, None)

    async def send_to_user(self, user_id: int, payload: dict[str, Any]) -> None:
        sockets = list(self._connections.get(user_id, set()))
        dead: list[WebSocket] = []
        for websocket in sockets:
            try:
                await websocket.send_json(payload)
            except Exception:
                dead.append(websocket)
        for websocket in dead:
            self.disconnect(user_id, websocket)

    def publish(self, user_id: int, payload: dict[str, Any]) -> None:
        """Thread-safe publish from sync FastAPI route handlers."""

        if self._loop is None or not self._loop.is_running():
            return
        asyncio.run_coroutine_threadsafe(self.send_to_user(user_id, payload), self._loop)


hub = RealtimeHub()


def queue_ws_event(db: Session, user_id: int, payload: dict[str, Any]) -> None:
    """Send after the current DB transaction commits successfully."""

    events: list[tuple[int, dict[str, Any]]] = db.info.setdefault("ws_events", [])
    events.append((user_id, payload))


def _flush_ws_events(session: Session) -> None:
    events: list[tuple[int, dict[str, Any]]] = session.info.pop("ws_events", [])
    for user_id, payload in events:
        hub.publish(user_id, payload)


def _clear_ws_events(session: Session) -> None:
    session.info.pop("ws_events", None)


event.listen(Session, "after_commit", _flush_ws_events)
event.listen(Session, "after_rollback", _clear_ws_events)
