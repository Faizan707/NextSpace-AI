import jwt
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.jwt import decode_access_token
from app.database import SessionLocal
from app.models.user import User
from app.services.realtime import hub

router = APIRouter(tags=["realtime"])


def _user_from_token(db: Session, token: str) -> User | None:
    try:
        payload = decode_access_token(token)
        email = payload.get("sub")
        if not email:
            return None
    except jwt.PyJWTError:
        return None
    return db.scalar(select(User).where(User.email == email))


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
) -> None:
    db = SessionLocal()
    try:
        user = _user_from_token(db, token)
        if user is None:
            await websocket.close(code=4401)
            return
        user_id = user.id
    finally:
        db.close()

    await hub.connect(user_id, websocket)
    try:
        await websocket.send_json({"type": "realtime.connected"})
        while True:
            # Keep connection alive; client may send pings as plain text/json
            await websocket.receive_text()
    except WebSocketDisconnect:
        hub.disconnect(user_id, websocket)
    except Exception:
        hub.disconnect(user_id, websocket)
        try:
            await websocket.close()
        except Exception:
            pass
