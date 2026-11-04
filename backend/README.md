# NextSpace AI — Backend

FastAPI + SQLAlchemy + pwdlib (Argon2) + PyJWT.

## Setup

```bash
uv sync
```

Copy `.env` if needed and set `JWT_SECRET`.

## Run

```bash
uv run fastapi dev app/main.py
```

API docs: http://127.0.0.1:8000/docs

## Main routes

| Area | Paths |
|------|--------|
| Auth | `/auth/register`, `/auth/login`, `/auth/me` |
| Companies | `/companies`, `/companies/me`, `/companies/{id}` |
| Spaces | `/spaces`, `/spaces/{id}` |
