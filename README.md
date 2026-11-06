# NextSpace AI

Multi-tenant workspace for companies, spaces, projects (Kanban), teams, and documents — with JWT auth and an admin console.

```text
backend/   FastAPI + SQLAlchemy + pwdlib (Argon2) + PyJWT
frontend/  React + Vite + TanStack Query + Zustand
```

## Stack

| Layer | Role |
|-------|------|
| **Backend** | REST API, multi-tenant models, Kanban stages/tasks, invites |
| **Frontend** | SPA — TanStack Query for server/API data; Zustand for auth session + toasts |
| **Auth** | JWT bearer tokens; tenant owner vs member roles |

## Features

- Companies & membership
- Spaces (public / specific / private) with members
- Projects with status, deadline, and **progress derived from Kanban stages** (Todo 0%, other stages 50%, Done 100%)
- Project board: Todo / In Progress / Done + custom stages, drag-and-drop tasks
- Teams & document upload/preview
- Work tables: all projects & tasks (role-based visibility)
- Admin: users, invites, space management

## Backend

```bash
cd backend
uv sync
uv run alembic upgrade head
uv run fastapi dev app/main.py --port 8001
```

API docs: http://127.0.0.1:8001/docs

See [backend/README.md](backend/README.md) for env vars, migrations, and route map.

## Frontend

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL if needed
npm run dev
```

App: http://127.0.0.1:5173

See [frontend/README.md](frontend/README.md) for structure (api / hooks / stores).
