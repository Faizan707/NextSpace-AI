import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine
from sqlalchemy import inspect, select, text

from app.models import (  # noqa: F401
    Company,
    Conversation,
    ConversationParticipant,
    Document,
    DocumentMember,
    Invite,
    Message,
    Notification,
    Project,
    ProjectMember,
    ProjectStage,
    ProjectTask,
    Space,
    SpaceMember,
    TaskAttachment,
    TaskComment,
    TaskCommentMention,
    Team,
    TeamMember,
    User,
)
from app.routers import (
    admin,
    auth,
    chat,
    companies,
    notifications,
    project_board,
    space_documents,
    space_projects,
    space_teams,
    spaces,
    task_activity,
    task_comments,
    task_replies,
    work,
    ws,
)
from app.services.realtime import hub


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
    _ensure_column(
        "project_tasks",
        "priority",
        "ALTER TABLE project_tasks ADD COLUMN priority VARCHAR(16) NOT NULL DEFAULT 'medium'",
    )


def _ensure_conversation_dm_key() -> None:
    """Add dm_key so each company user-pair has at most one DM."""
    _ensure_column(
        "conversations",
        "dm_key",
        "ALTER TABLE conversations ADD COLUMN dm_key VARCHAR(64)",
    )
    inspector = inspect(engine)
    if "conversations" not in inspector.get_table_names():
        return
    indexes = {item["name"] for item in inspector.get_indexes("conversations")}
    uniques = {item["name"] for item in inspector.get_unique_constraints("conversations")}
    if "uq_conversation_company_dm_key" in indexes or "uq_conversation_company_dm_key" in uniques:
        return

    from app.database import SessionLocal
    from app.models.chat import Conversation, ConversationParticipant, Message
    from app.services.chat import dm_pair_key
    from sqlalchemy.orm import selectinload

    db = SessionLocal()
    try:
        conversations = list(
            db.scalars(
                select(Conversation).options(
                    selectinload(Conversation.participants),
                    selectinload(Conversation.messages),
                )
            ).all()
        )
        keep_by_pair: dict[tuple[int, str], Conversation] = {}
        for conversation in conversations:
            if len(conversation.participants) != 2:
                continue
            user_ids = sorted(item.user_id for item in conversation.participants)
            key = dm_pair_key(user_ids[0], user_ids[1])
            conversation.dm_key = key
            pair = (conversation.company_id, key)
            current = keep_by_pair.get(pair)
            if current is None:
                keep_by_pair[pair] = conversation
                continue
            # Keep the conversation with more/newer messages; delete the duplicate
            current_score = (
                len(current.messages),
                max((m.created_at for m in current.messages), default=current.created_at),
                current.id,
            )
            new_score = (
                len(conversation.messages),
                max((m.created_at for m in conversation.messages), default=conversation.created_at),
                conversation.id,
            )
            if new_score > current_score:
                loser, winner = current, conversation
            else:
                loser, winner = conversation, current
            for message in list(loser.messages):
                message.conversation_id = winner.id
            db.delete(loser)
            keep_by_pair[pair] = winner
        db.commit()
    finally:
        db.close()

    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_company_dm_key "
                "ON conversations (company_id, dm_key)"
            )
        )


def _ensure_user_job_role_columns() -> None:
    _ensure_column("users", "job_role", "ALTER TABLE users ADD COLUMN job_role VARCHAR(255)")
    _ensure_column("invites", "full_name", "ALTER TABLE invites ADD COLUMN full_name VARCHAR(255)")
    _ensure_column("invites", "job_role", "ALTER TABLE invites ADD COLUMN job_role VARCHAR(255)")


def _ensure_document_compliance_columns() -> None:
    """Add document compliance columns for databases created before they existed."""
    _ensure_column(
        "documents",
        "compliance_status",
        "ALTER TABLE documents ADD COLUMN compliance_status VARCHAR(32) NOT NULL DEFAULT 'pending'",
    )
    _ensure_column(
        "documents",
        "compliance_summary",
        "ALTER TABLE documents ADD COLUMN compliance_summary TEXT",
    )
    _ensure_column(
        "documents",
        "compliance_score",
        "ALTER TABLE documents ADD COLUMN compliance_score INTEGER",
    )
    _ensure_column(
        "documents",
        "compliance_findings_json",
        "ALTER TABLE documents ADD COLUMN compliance_findings_json TEXT",
    )
    _ensure_column(
        "documents",
        "compliance_checked_at",
        "ALTER TABLE documents ADD COLUMN compliance_checked_at TIMESTAMP WITH TIME ZONE",
    )
    _ensure_column(
        "documents",
        "compliance_engine",
        "ALTER TABLE documents ADD COLUMN compliance_engine VARCHAR(64)",
    )


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


def _backfill_document_memberships() -> None:
    """Ensure existing documents include their uploader as a member."""
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        documents = list(db.scalars(select(Document)).all())
        for document in documents:
            exists = db.scalar(
                select(DocumentMember.id).where(
                    DocumentMember.document_id == document.id,
                    DocumentMember.user_id == document.uploaded_by_id,
                )
            )
            if exists is None:
                db.add(
                    DocumentMember(document_id=document.id, user_id=document.uploaded_by_id)
                )
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
    hub.bind_loop(asyncio.get_running_loop())
    Base.metadata.create_all(bind=engine)
    _ensure_project_columns()
    _ensure_user_job_role_columns()
    _ensure_document_compliance_columns()
    _ensure_conversation_dm_key()
    _backfill_space_memberships()
    _backfill_project_memberships()
    _backfill_document_memberships()
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
app.include_router(task_activity.router)
app.include_router(task_comments.router)
app.include_router(task_replies.router)
app.include_router(chat.router)
app.include_router(notifications.router)
app.include_router(ws.router)
app.include_router(work.router)
app.include_router(space_teams.router)
app.include_router(space_documents.router)


@app.get("/health")
def health() -> dict[str, str | bool]:
    from app.services.email import is_email_configured

    return {"status": "ok", "smtp_configured": is_email_configured()}
