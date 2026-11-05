# NextSpace AI

Multi-tenant workspace app: companies, spaces, and JWT auth.

```text
backend/   FastAPI + SQLAlchemy + pwdlib (Argon2) + PyJWT
frontend/  React + Vite + Zustand
```

## Backend

```bash
cd backend
uv sync
uv run fastapi dev app/main.py --port 8001
```

API docs: http://127.0.0.1:8001/docs

## Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://127.0.0.1:5173
