# NextSpace AI — Backend

FastAPI + SQLAlchemy + pwdlib (Argon2) + PyJWT.

## Setup

```bash
uv sync
```

Copy `.env` if needed and set `DATABASE_URL` + `JWT_SECRET`.

### Migrations (Alembic)

```bash
# create a new migration after model changes
uv run alembic revision --autogenerate -m "describe change"

# apply migrations
uv run alembic upgrade head

# rollback one step
uv run alembic downgrade -1
```

## Run

```bash
uv run alembic upgrade head
uv run fastapi dev app/main.py --port 8001
```

API docs: http://127.0.0.1:8001/docs

## Main routes

| Area | Paths |
|------|--------|
| Auth | `/auth/register`, `/auth/login`, `/auth/me` |
| Companies | `/companies`, `/companies/me`, `/companies/{id}` |
| Spaces | `/spaces`, `/spaces/{id}` |
