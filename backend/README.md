# NextSpace AI — Backend

FastAPI + SQLAlchemy + pwdlib (Argon2) + PyJWT.

## Setup

```bash
uv sync
```

Copy `.env.example` to `.env` and set at least `DATABASE_URL` + `JWT_SECRET`.

### Migrations (Alembic)

```bash
# create a new migration after model changes
uv run alembic revision --autogenerate -m "describe change"

# apply migrations
uv run alembic upgrade head

# rollback one step
uv run alembic downgrade -1
```

On startup the app also runs lightweight column/backfill helpers (e.g. default Kanban stages, project progress recalculation).

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
| Admin | `/admin/overview`, `/admin/invites`, `/admin/users/{id}` |
| Companies | `/companies`, `/companies/me`, `/companies/{id}` |
| Spaces | `/spaces`, `/spaces/{id}`, members |
| Projects | `/spaces/{id}/projects`, members |
| Board | `/spaces/{id}/projects/{id}/board`, stages, tasks |
| Work | `/work/projects`, `/work/tasks` (role-filtered lists) |
| Teams | `/spaces/{id}/teams` |
| Documents | `/spaces/{id}/documents` |

## Project progress

Progress is **not** set manually. It is the average of task stage weights:

| Stage name | Weight |
|------------|--------|
| Todo | 0% |
| Done / Complete / Completed | 100% |
| Any other stage (e.g. In Progress, custom) | 50% |

Recalculated when tasks are created, moved, updated, or deleted.
