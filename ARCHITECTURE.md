# Architecture

## Stack
Requested stack: `fastapi-react` (fixed by platform at app creation).

- **Backend** — FastAPI (Python), scaffolded fresh from `template-fastapi-react/backend/` → lives at `backend/`.
- **Frontend** — React + Vite + TypeScript, scaffolded fresh from `template-fastapi-react/web/` → lives at `web/`.

No platform was previously present — this was a greenfield project directory (only `README.md`, `.git`, `.github` existed before scaffolding).

## Layout
- `backend/app/main.py` — FastAPI app entrypoint (template stub; coder will add routers, CORS, static SPA serving, health endpoints per plan).
- `backend/app/database.py`, `models.py` — SQLModel engine/session + ORM models (template stub).
- `backend/app/auth.py` — auth helpers (template stub).
- `backend/app/init_db.py`, `seed.py` — DB bootstrap/seeding, invoked by `backend/Dockerfile`'s CMD before `uvicorn` starts.
- `backend/requirements.txt` — Python dependencies.
- `backend/Dockerfile` — builds and serves the backend on port `3000` (see `colossus.yaml`).
- `web/src/App.tsx` — router shell; carries `data-testid="app-ready"` on the root — **do not remove** (read by the post-deploy render gate).
- `web/src/pages/Home.tsx`, `Login.tsx` — template stub pages.
- `web/src/lib/api.ts` — fetch helper.
- `web/vite.config.ts`, `package.json`, `index.html` — Vite scaffold.

## Next steps for the developer / build agent
1. Implement the plan's backend: `schemas.py`, `routers/auth_router.py`, `routers/books_router.py`, wire routers + CORS + health endpoints into `main.py`.
2. Implement the plan's frontend: `AuthContext.tsx`, `RequireAuth.tsx`, `SignupPage.tsx`, `ShelfPage.tsx`, `BookCard.tsx`, modals, etc., per the plan's file list.
3. Set `JWT_SECRET` in the backend environment (no `.env.example` ships with this template — add one, and fail fast if unset in production, per plan risk notes).
4. Update `.colossus-acceptance.json`'s `expect_text` once real front-page content (e.g. shelf/login copy) is implemented — it currently seeds only `reject_signatures` for the untouched stub.
5. Update `.pipeline/surface.json` if/when this project's test-spec generation needs a route/component/testid manifest (not auto-generated for this stack — only `enterprise` gets Phase 3b treatment).
6. Run `pip install -r backend/requirements.txt` and `npm install` in `web/` locally before development.
7. Build/deploy is driven by root `colossus.yaml` (framework: react, backend port 3000, nginx SPA fallback) — do not hand-edit unless the build shape changes.

## Template sources used
- `/app/scaffold-templates/template-fastapi-react/backend/` → `backend/`
- `/app/scaffold-templates/template-fastapi-react/web/` → `web/`
