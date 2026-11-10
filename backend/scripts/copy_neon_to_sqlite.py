"""Copy all app tables from Neon Postgres into local SQLite.

Usage (from backend/):
  $env:NEON_DATABASE_URL="postgresql+psycopg://..."
  .\\.venv\\Scripts\\python.exe scripts\\copy_neon_to_sqlite.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, select, text

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))
os.chdir(BACKEND_ROOT)

from app.database import Base  # noqa: E402
import app.models  # noqa: F401, E402

DEFAULT_SQLITE = "sqlite:///./nextspace_local.db"


def main() -> None:
    neon_url = os.environ.get("NEON_DATABASE_URL", "").strip()
    if not neon_url:
        raise SystemExit("Set NEON_DATABASE_URL to your Neon SQLAlchemy URL first.")

    sqlite_url = os.environ.get("SQLITE_DATABASE_URL") or DEFAULT_SQLITE

    neon = create_engine(neon_url, pool_pre_ping=True, connect_args={"connect_timeout": 60})
    local = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )

    print("Creating local schema...")
    Base.metadata.drop_all(bind=local)
    Base.metadata.create_all(bind=local)

    tables = list(Base.metadata.sorted_tables)
    print(f"Copying {len(tables)} tables from Neon -> SQLite...")

    with neon.connect() as src, local.begin() as dst:
        dst.execute(text("PRAGMA foreign_keys=OFF"))
        for table in tables:
            rows = src.execute(select(table)).mappings().all()
            payloads = [dict(row) for row in rows]
            if payloads:
                dst.execute(table.insert(), payloads)
            print(f"  {table.name}: {len(payloads)} rows")
        dst.execute(text("PRAGMA foreign_keys=ON"))

    print("Done. Local DB ready:", sqlite_url)


if __name__ == "__main__":
    main()
