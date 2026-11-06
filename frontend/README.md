# NextSpace AI — Frontend

React + Vite SPA for the FastAPI backend.

## Stack

- **React 19** + **Vite** + **React Router**
- **TanStack Query** — server state (spaces, projects, board, work lists, admin)
- **Zustand** — client state only (`authStore` for token/user, `toastStore`)
- **@dnd-kit** — Kanban drag-and-drop
- **Tailwind CSS 4**

## Setup

```bash
npm install
cp .env.example .env
```

Typical env:

```env
VITE_API_URL=http://127.0.0.1:8001
```

## Run

Start the backend first (`cd ../backend && uv run fastapi dev app/main.py --port 8001`), then:

```bash
npm run dev
```

App: http://127.0.0.1:5173

## Folder layout

```text
src/
  api/          Thin HTTP clients (paths + fetch). Does not define backend routes.
  hooks/        TanStack Query hooks (useSpaces, useWork, useProjectBoard, …)
  stores/       Zustand: auth + toasts
  pages/        Route screens
  components/   UI + domain components (Kanban, space cards, …)
  types/        Shared TypeScript models
  lib/          queryClient, queryKeys, helpers
```

### Data flow

```text
Page → hooks (useQuery / useMutation) → api/*.ts → FastAPI
         ↑
    Zustand auth token
```

Mutations invalidate related query keys (spaces list, board, work tables, etc.).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + production build |
| `npm run lint` | Oxlint |
