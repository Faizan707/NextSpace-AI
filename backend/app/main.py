from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine
from sqlalchemy import select

from app.models import (  # noqa: F401
    Company,
    Document,
    Invite,
    Project,
    Space,
    SpaceMember,
    Team,
    TeamMember,
    User,
)
from app.routers import admin, auth, companies, space_documents, space_projects, space_teams, spaces


def _backfill_space_memberships() -> None:
    """Ensure existing spaces include their creator as a member."""
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        spaces = list(db.scalars(select(Space)).all())
        for space in spaces:
            exists = db.scalar(
                select(SpaceMember.id).where(
                    SpaceMember.space_id == space.id,
                    SpaceMember.user_id == space.created_by_id,
                )
            )
            if exists is None:
                db.add(SpaceMember(space_id=space.id, user_id=space.created_by_id))
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    _backfill_space_memberships()
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(companies.router)
app.include_router(spaces.router)
app.include_router(space_projects.router)
app.include_router(space_teams.router)
app.include_router(space_documents.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
