from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine
from sqlalchemy import inspect, select, text

from app.models import (  # noqa: F401
    Company,
    Document,
    Invite,
    Project,
    ProjectMember,
    ProjectStage,
    ProjectTask,
    Space,
    SpaceMember,
    Team,
    TeamMember,
    User,
)
from app.routers import (
    admin,
    auth,
    companies,
    project_board,
    space_documents,
    space_projects,
    space_teams,
    spaces,
    work,
)


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


def _ensure_column(table: str, column: str, ddl: str) -> None:
    inspector = inspect(engine)
    if table not in inspector.get_table_names():
        return
    columns = {item["name"] for item in inspector.get_columns(table)}
    if column in columns:
        return
    with engine.begin() as conn:
        conn.execute(text(ddl))


def _ensure_project_columns() -> None:
    """Add newer project columns for databases created before they existed."""
    _ensure_column("projects", "deadline", "ALTER TABLE projects ADD COLUMN deadline TIMESTAMP WITH TIME ZONE")
    _ensure_column(
        "projects",
        "status",
        "ALTER TABLE projects ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'open'",
    )
    _ensure_column(
        "projects",
        "progress",
        "ALTER TABLE projects ADD COLUMN progress INTEGER NOT NULL DEFAULT 0",
    )


def _ensure_user_job_role_columns() -> None:
    _ensure_column("users", "job_role", "ALTER TABLE users ADD COLUMN job_role VARCHAR(255)")
    _ensure_column("invites", "full_name", "ALTER TABLE invites ADD COLUMN full_name VARCHAR(255)")
    _ensure_column("invites", "job_role", "ALTER TABLE invites ADD COLUMN job_role VARCHAR(255)")


def _backfill_project_memberships() -> None:
    """Ensure existing projects include their creator as a member."""
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        projects = list(db.scalars(select(Project)).all())
        for project in projects:
            exists = db.scalar(
                select(ProjectMember.id).where(
                    ProjectMember.project_id == project.id,
                    ProjectMember.user_id == project.created_by_id,
                )
            )
            if exists is None:
                db.add(ProjectMember(project_id=project.id, user_id=project.created_by_id))
        db.commit()
    finally:
        db.close()


def _backfill_project_stages() -> None:
    """Ensure every project has default Kanban stages."""
    from app.database import SessionLocal
    from app.services.project_board import backfill_project_stages

    db = SessionLocal()
    try:
        backfill_project_stages(db)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    _ensure_project_columns()
    _ensure_user_job_role_columns()
    _backfill_space_memberships()
    _backfill_project_memberships()
    _backfill_project_stages()
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
app.include_router(project_board.router)
app.include_router(work.router)
app.include_router(space_teams.router)
app.include_router(space_documents.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
