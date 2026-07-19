# Pipeline Task Decomposition

## Summary
BookNook is a single-container reading-shelf app: a FastAPI + SQLModel backend with JWT bearer auth and strictly per-user Book CRUD, paired with a React (Vite + TypeScript) SPA offering login/signup/logout, a URL-addressable shelf with status filtering (`?status=`) and URL-driven add/rate modals (`?modal=`). The first registered user becomes admin; ratings (1–5) are only permitted on `FINISHED` books. The built frontend is served statically by FastAPI, deployed via a multi-stage Dockerfile.

## Surface contract

### Backend routes (all under `/api`)
- `POST /api/auth/register` — create user; first user → `is_admin=True` / `ADMIN` role; returns token.
- `POST /api/auth/login` — email/password; 401 on bad creds; returns `Token`.
- `GET /api/books?status=` — list current user's books, optional status filter (`WANT_TO_READ | READING | FINISHED`).
- `POST /api/books` — create book, defaults `status=WANT_TO_READ`.
- `PATCH /api/books/{id}` — update status and/or rating; ownership-checked (404 on foreign/missing); rating 1–5 and only when `FINISHED`.
- `DELETE /api/books/{id}` — delete owned book.
- `GET /api/health` — liveness. `GET /api/health/deep` — DB connectivity check.
- `GET /api/admin/settings` / `PATCH /api/admin/settings` — admin-only service/config management (postgresql, minio).

### Frontend routes/screens
- Public: `/login`, `/signup`.
- Guarded: `/shelf` (book list + `?status=` filter + `?modal=add-book` / `?modal=rate&bookId=`), `/admin/settings` (admin-only).

### Entities
- `User` (id, email unique, hashed_password, is_admin, role, created_at).
- `Book` (id, owner_id FK, title, author, status enum, rating nullable 1–5, created_at).
- `SystemSetting` (key, value, updatedAt).

## db_agent tasks
- [ ] Create `backend/app/database.py` — SQLModel engine + session dependency for SQLite file `booknook.db`; create tables on startup.
- [ ] Define `backend/app/models.py` `User` model: `id`, `email` (unique), `hashed_password`, `is_admin`, `created_at`, plus `enum UserRole { ADMIN USER }` and `role: UserRole @default(USER)` field.
- [ ] Define `backend/app/models.py` `Book` model: `id`, `owner_id` FK → User, `title`, `author`, `status` enum (`WANT_TO_READ | READING | FINISHED`), `rating` nullable (1–5), `created_at`.
- [ ] Add `SystemSetting` model — `key: str @id`, `value: str`, `updatedAt: datetime @updatedAt` — for admin-managed service config (postgresql, minio).

## backend_agent tasks
- [ ] Create `backend/app/schemas.py` — `UserCreate`, `UserRead`, `Token`, `BookCreate`, `BookUpdate` (status + optional rating), `BookRead`; status enum `WANT_TO_READ | READING | FINISHED`.
- [ ] Create `backend/app/auth.py` — passlib bcrypt hashing (pinned versions), python-jose JWT encode/decode with secret from env `JWT_SECRET` (fail fast if missing in prod), `get_current_user` dependency.
- [ ] Create `backend/app/routers/auth_router.py` — `POST /api/auth/register` (first user → `is_admin=True` + `ADMIN` role, subsequent → `USER`), `POST /api/auth/login` (401 on bad creds, returns `Token`).
- [ ] Add admin guard dependency/middleware and protect the `(admin)` route group; admin access gated by role check.
- [ ] Create `backend/app/routers/books_router.py` — `GET /api/books?status=`, `POST /api/books` (defaults `WANT_TO_READ`), `PATCH /api/books/{id}` (status + rating, ownership-checked, 404 on foreign/missing, rating 1–5 only when `FINISHED`), `DELETE /api/books/{id}`; all require auth and scope to `current_user`.
- [ ] Create `backend/app/main.py` — FastAPI app, CORS, mount routers under `/api`, `/api/health` (liveness) + `/api/health/deep` (DB check), static-file serving + SPA fallback for non-API routes.
- [ ] Create `backend/requirements.txt` — fastapi, uvicorn, sqlmodel, python-jose[cryptography], passlib[bcrypt], python-multipart, pydantic[email] (pin bcrypt/passlib to known-good versions).
- [ ] Create `backend/.env.example` (`JWT_SECRET`).
- [ ] Create `backend/app/lib/config.py` — `resolveConfig(key) -> str | None`: read `process.env[key]` first; if value equals `PLACEHOLDER_CONFIGURE_IN_SETTINGS` or absent, read from `SystemSetting` DB row; return `None` if neither set.
- [ ] Add `GET /api/admin/settings` (list postgresql + minio service keys with masked values + configured status) and `PATCH /api/admin/settings` (upsert key-value pairs, admin role required).

## ui_agent tasks
- [ ] Scaffold Vite React-TS: `frontend/index.html`, `vite.config.ts` (dev proxy `/api` → backend), `tsconfig.json`, `package.json`; `src/main.tsx`, `src/App.tsx` with React Router (public `/login`, `/signup`; guarded app routes).
- [ ] Create `src/auth/AuthContext.tsx` (token in localStorage; `login`/`register`/`logout`; current-user state) and `src/components/RequireAuth.tsx` route guard redirecting to `/login`.
- [ ] Create `src/pages/LoginPage.tsx` and `src/pages/SignupPage.tsx` — email/password forms; successful auth stores token and navigates to `/shelf`.
- [ ] Create `src/pages/ShelfPage.tsx` — book list, status filter tabs bound to `?status=` (restore from URL on load), add flow via `?modal=add-book`, rate flow via `?modal=rate&bookId=`; handle empty/loading/error states.
- [ ] Create `src/components/BookCard.tsx` (title, author, status control, star rating display, delete), `src/components/AddBookModal.tsx`, `src/components/RateBookModal.tsx`, and `src/types.ts` mirroring backend schemas.
- [ ] Add admin nav entry visible only to admins and create `/admin/settings` page — list postgresql and minio each with configured/unconfigured badge and per-service credential form.

## service_agent tasks
- [ ] Create `src/api/client.ts` — fetch wrapper injecting `Authorization: Bearer <token>`; on 401 redirect to `/login`.
- [ ] Wire auth calls (register/login) from `AuthContext` through the client to `/api/auth/*` and persist the returned token.
- [ ] Wire shelf data layer to `/api/books` — list with `?status=`, create (POST), update status/rating (PATCH), delete (DELETE); refresh list after mutations.
- [ ] Wire `/admin/settings` page to `GET`/`PATCH /api/admin/settings` for reading masked values and upserting service credentials.

## tester tasks
- [ ] Create `backend/tests/test_auth.py` — register success (first user admin), login success returns token, wrong password → 401, unauthenticated access to `/api/books/*` → 401.
- [ ] Create `backend/tests/test_books.py` — add defaults to `WANT_TO_READ`, update to `READING`, finish + rate → `FINISHED` with rating, rating rejected when not `FINISHED` / out of 1–5, `?status=` filter returns only matching, foreign/missing book PATCH/DELETE → 404.
- [ ] Add health-check coverage: `GET /api/health` (liveness) and `GET /api/health/deep` (DB check).
- [ ] Document E2E happy path (manual): register → sign in → add book → change status → rate → filter; verify `?status=` deep-links restore filter and `?modal=` params open modals.

## Deploy tasks (backend_agent)
- [ ] Create root `Dockerfile` — multi-stage: build frontend (`npm run build`), copy `frontend/dist` into image, install backend deps, run uvicorn serving API + static SPA; add `.dockerignore`.

## Open questions
- `<spec_deployments>` lists `postgresql` and `minio`, but the spec explicitly specifies SQLite (`booknook.db`) for persistence and does not describe any object-storage/file-upload feature. Tasks follow the spec (SQLite) while still exposing admin settings for the provisioned services; downstream agents should confirm whether Postgres/MinIO should actually replace SQLite or back a not-yet-specified feature.
- No `## Integrations` were declared, so no third-party integration client modules are generated.
- Spec does not define credential field names/keys for postgresql and minio; admin settings agent should use conventional connection-string / access-key fields pending clarification.
