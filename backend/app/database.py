import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

_is_sqlite = settings.database_url.startswith("sqlite")
connect_args: dict = {"check_same_thread": False} if _is_sqlite else {"connect_timeout": 15}
# Default QueuePool (5+10) collapses under ~100 concurrent SPA users against Neon.
# Cap still respects Neon pooler limits; raise via DB_POOL_SIZE / DB_MAX_OVERFLOW if needed.
_pool_size = int(os.getenv("DB_POOL_SIZE", "20"))
_max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "40"))
engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=1 if _is_sqlite else _pool_size,
    max_overflow=0 if _is_sqlite else _max_overflow,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
