# Test Specification

> ⚠️ **Warning:** `.pipeline/surface.json` was not found. The API surface below was
> derived from the "Surface contract" section of `.pipeline/tasks.md` and the approved
> spec. If `surface.json` is later produced, re-run this agent to reconcile.

## Coverage summary
- Total cases: 63
- API endpoints covered: 10 / 10 (derived from tasks.md surface contract)
- User journeys covered: 9

Endpoints under test:
1. `POST /api/auth/register`
2. `POST /api/auth/login`
3. `GET /api/books`
4. `POST /api/books`
5. `PATCH /api/books/{id}`
6. `DELETE /api/books/{id}`
7. `GET /api/health`
8. `GET /api/health/deep`
9. `GET /api/admin/settings`
10. `PATCH /api/admin/settings`

## API tests

### `POST /api/auth/register`
- **Happy path (first user)**: `{email:"a@x.com", password:"pw123456"}` on an empty DB → `200/201`; body is a `Token` (`{access_token, token_type:"bearer"}`); the created user has `is_admin=true` / `role=ADMIN`.
- **Happy path (second user)**: register `b@x.com` after `a@x.com` exists → `200/201` with `Token`; user has `is_admin=false` / `role=USER`.
- **Validation failures**:
  - Missing/empty `email` → `422`.
  - Malformed email (`"not-an-email"`) → `422` (pydantic[email]).
  - Missing/empty `password` → `422`.
- **Duplicate email**: register `a@x.com` twice → second call returns `400/409` (unique constraint), not a 500.

### `POST /api/auth/login`
- **Happy path**: register `a@x.com`/`pw123456`, then login with same creds → `200`; body is `Token` with a non-empty `access_token` decodable to the user's identity.
- **Auth failures**:
  - Correct email, wrong password → `401`.
  - Unknown email → `401`.
- **Validation failures**: missing `email` or `password` field → `422`.

### `GET /api/books`
- **Happy path (no filter)**: authenticated user with 2 owned books → `200`; array of exactly those 2 `BookRead` objects (`id, title, author, status, rating, created_at`).
- **Happy path (status filter)**: user has books in `WANT_TO_READ`, `READING`, `FINISHED`; `GET /api/books?status=READING` → `200`; returns only the `READING` book(s).
- **Per-user scoping**: user B calls `GET /api/books` while user A owns books → returns only B's books (A's books never appear).
- **Validation failures**: `?status=INVALID` (not in enum) → `422`.
- **Auth failures**: no `Authorization` header → `401`.
- **Empty state**: authenticated user with no books → `200` with `[]`.

### `POST /api/books`
- **Happy path (defaults)**: `{title:"Dune", author:"Herbert"}` → `201`; returned book has `status="WANT_TO_READ"`, `rating=null`, `owner_id` = current user.
- **Explicit status**: `{title, author, status:"READING"}` → `201` with `status="READING"`.
- **Validation failures**:
  - Missing `title` → `422`.
  - Missing `author` → `422`.
  - Invalid `status` value → `422`.
- **Auth failures**: unauthenticated → `401`.

### `PATCH /api/books/{id}`
- **Happy path (status change)**: own book `WANT_TO_READ` → `{status:"READING"}` → `200`; persisted `status="READING"`, `rating` unchanged.
- **Happy path (finish + rate)**: `{status:"FINISHED", rating:4}` on own book → `200`; `status="FINISHED"`, `rating=4`.
- **Rating rules (business logic)**:
  - `{status:"READING", rating:5}` (rating while not FINISHED) → `400/422` (rating only allowed when FINISHED).
  - `{status:"FINISHED", rating:0}` → `422` (below 1–5).
  - `{status:"FINISHED", rating:6}` → `422` (above 1–5).
- **Ownership / existence**:
  - PATCH a book owned by another user → `404` (not 403, to avoid leaking existence).
  - PATCH a non-existent `id` → `404`.
- **Auth failures**: unauthenticated → `401`.

### `DELETE /api/books/{id}`
- **Happy path**: delete own book → `200/204`; subsequent `GET /api/books` no longer includes it.
- **Ownership / existence**:
  - Delete another user's book → `404`; the book still exists for its owner.
  - Delete a non-existent `id` → `404`.
- **Auth failures**: unauthenticated → `401`.

### `GET /api/health`
- **Happy path**: `GET /api/health` (no auth) → `200`; liveness body (e.g. `{status:"ok"}`).
- **Public access**: succeeds without any `Authorization` header.

### `GET /api/health/deep`
- **Happy path**: `GET /api/health/deep` (no auth) → `200`; body indicates DB connectivity OK.
- **Public access**: succeeds without auth.

### `GET /api/admin/settings`
- **Happy path (admin)**: admin token → `200`; lists `postgresql` and `minio` service keys with **masked** values and a configured/unconfigured status per key.
- **Auth failures**:
  - Non-admin (`USER`) token → `403`.
  - Unauthenticated → `401`.

### `PATCH /api/admin/settings`
- **Happy path (admin)**: admin upserts `{postgresql:{...}, minio:{...}}` key/value pairs → `200`; a follow-up `GET` reflects configured status (values still masked).
- **Auth failures**:
  - Non-admin token → `403`; no settings mutated.
  - Unauthenticated → `401`.
- **Validation failures**: malformed/empty body → `422`.

## UI / journey tests

### Journey: Sign up (register)
- **Steps**: visit `/signup` → enter email + password → submit.
- **Expected outcomes**: token stored in `localStorage`; redirect to `/shelf`; shelf renders (empty state for a brand-new user).
- **Negative path**: submitting a duplicate email surfaces a visible error and stays on `/signup`; no navigation.

### Journey: Sign in
- **Steps**: visit `/login` → enter registered creds → submit.
- **Expected outcomes**: token stored; redirect to `/shelf`; current-user state populated.
- **Negative path**: wrong password → visible "invalid credentials" error, remains on `/login`, no token stored.

### Journey: Route guard / deep-link protection
- **Steps**: with no token, navigate directly to `/shelf` (and `/admin/settings`).
- **Expected outcomes**: `RequireAuth` redirects to `/login`.
- **Negative path**: an expired/invalid token causing a `401` from the API triggers the client's redirect to `/login`.

### Journey: Add a book
- **Steps**: on `/shelf`, click "Add book" (URL becomes `?modal=add-book`) → enter title + author → submit.
- **Expected outcomes**: `POST /api/books` sent; modal closes (`?modal` cleared); new card appears with status `WANT_TO_READ` and no rating.
- **Negative path**: empty title/author blocks submit (client validation) or shows server `422` error; modal stays open.

### Journey: Change book status
- **Steps**: on a `WANT_TO_READ` card, use the status control to set `READING`.
- **Expected outcomes**: `PATCH /api/books/{id}` sent; list refreshes; card shows `READING`.
- **Negative path**: server error leaves prior status displayed and shows an error indicator.

### Journey: Finish + rate a book
- **Steps**: set a book to `FINISHED` / open rate modal (`?modal=rate&bookId=<id>`) → choose a 1–5 star rating → submit.
- **Expected outcomes**: `PATCH` with `{status:"FINISHED", rating:N}`; card shows `FINISHED` and N filled stars; modal closes.
- **Negative path**: attempting to rate a non-finished book is not offered / rejected; out-of-range rating not selectable.

### Journey: Filter shelf by status (URL-addressable)
- **Steps**: click filter tabs (`All / WANT_TO_READ / READING / FINISHED`).
- **Expected outcomes**: URL updates to `?status=<value>`; list shows only matching books; `GET /api/books?status=` reflects the filter.
- **Deep-link restore**: loading `/shelf?status=FINISHED` directly pre-selects the FINISHED tab and shows only finished books. Loading `/shelf?modal=add-book` opens the add modal on mount.

### Journey: Delete a book
- **Steps**: on a card, click delete (confirm if prompted).
- **Expected outcomes**: `DELETE /api/books/{id}` sent; card removed from the list after refresh.
- **Negative path**: server error keeps the card and shows an error.

### Journey: Admin settings visibility & access
- **Steps**: sign in as first user (admin) vs a second user (non-admin).
- **Expected outcomes**: admin nav entry + `/admin/settings` page visible and usable for admin; page lists postgresql/minio with configured/unconfigured badges and per-service credential forms.
- **Negative path**: non-admin sees no admin nav entry; direct navigation to `/admin/settings` is blocked (redirect/hidden) and the API returns `403`.

## Data integrity tests
- After `POST /api/books`, exactly one new `Book` row exists with `owner_id` = current user and `status="WANT_TO_READ"` when unspecified.
- `Book.rating` is `NULL` for any book whose `status` is not `FINISHED`; when set, `1 <= rating <= 5`.
- `User.email` is unique — a second insert with the same email fails at the DB/constraint level (surfaces as `400/409`, never a duplicate row).
- Exactly one user has `is_admin=true` / `role=ADMIN`: the first registered user; all subsequent users are `USER`.
- `Book.owner_id` is a valid FK to an existing `User`; deleting/patching never crosses ownership boundaries (foreign books are invisible → treated as `404`).
- `DELETE` removes the row; the book no longer appears in any subsequent `GET /api/books` for its owner.
- Passwords are stored only as bcrypt hashes — no plaintext password is persisted or returned in any `UserRead`/`Token` payload.

## Out of scope
- **Postgres/MinIO as primary datastore**: the spec mandates SQLite (`booknook.db`); admin settings for postgresql/minio are exposed but no object-storage/file-upload feature is specified, so those services' functional behaviour is untested (see tasks.md open question).
- **Token expiry/refresh semantics**: spec describes stateless JWT bearer but does not define TTL or refresh flow; only presence/absence and 401-on-invalid are tested.
- **Password strength/complexity rules**: spec is silent; only presence (non-empty) is validated.
- **Rate limiting, pagination, and sorting of `GET /api/books`**: not described in the spec.
- **CORS specifics and static SPA fallback routing** beyond "non-API routes serve the SPA": exact allowed origins/headers are unspecified.
- **Concurrency/multi-writer behaviour of SQLite**: noted as a scaling risk in the spec, not a functional requirement under test.
- **Exact credential field names for postgresql/minio**: spec does not define them (tasks.md open question); admin form field-level validation is not asserted.

Wrote .pipeline/test_spec.md (63 cases across 10 endpoints / 9 journeys).
