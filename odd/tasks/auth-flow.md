# Feature: flow login (JWT) and route protection for the demo

**Status: IN PROGRESS.** Two parallel writers, one per repository, on `feat/auth-flow` from `main`.

**Why:** technical test §21's flow starts with **Login → Dashboard → M-109 → Run AI Analysis → Anomalía →
Explicación → Acción**, and the frontend has no authentication at all: no route, no middleware, no
dependency, no credential handling. `src/app/page.tsx` redirects straight to `/meters` and
`PrivateRoute.tsx` returns its children unconditionally.

**Owner decisions (locked):**

- **No database.** The credential store is a committed CSV, like the rest of this project's data.
- One user: name **"Juan Camilo"**, `authorized: true`.
- The backend **only issues** the JWT. Its own instruction: *"el backend sólo debe devolver un JWT"* —
  so there is **no server-side validation middleware** and the other API routes stay open. That is a
  deliberate scope limit, not an oversight, and it must be documented as such: the frontend guard is a
  UX flow, not a security boundary.
- Frontend: JWT in `localStorage` + `Authorization: Bearer` on the three RTK Query slices, a real guard
  on the demo routes, the header showing the user and a logout, and the post-login landing on
  `/dashboard` (the flow puts Dashboard second; `/` currently goes to `/meters`).

## Frozen contract

### Backend

**`data/users.csv`** (committed; headers, one row):

```
username,password_sha256,name,authorized
jcamilo,<sha256 hex of "bia2026">,Juan Camilo,true
```

The plaintext is **`bia2026`** and it is deliberately documented here and in the README, because it is a
demo credential for a flow test. The CSV stores only the SHA-256 hex of it (stdlib, no dependency).

**`POST /api/auth/login`** — body `{"username":"…","password":"…"}`

| Case | Response |
| --- | --- |
| valid + authorized | `200 {"token":"<jwt>","expires_at":"RFC3339","user":{"username":"jcamilo","name":"Juan Camilo","authorized":true}}` |
| unknown user **or** wrong password | `401 {"error":"usuario o contraseña incorrectos"}` (the same body for both, so the endpoint does not enumerate users) |
| `authorized: false` | `403 {"error":"el usuario no está autorizado"}` |
| missing field | `400 {"error":"usuario y contraseña son obligatorios"}` |

**JWT**: HS256 implemented with the **standard library only** (`crypto/hmac`, `crypto/sha256`,
`encoding/base64`, `encoding/json`) — `go.mod` must not change. Header `{"alg":"HS256","typ":"JWT"}`;
claims `sub` (username), `name`, `authorized` (bool), `iat`, `exp` (8 h). Secret from `JWT_SECRET`, with
a documented development default so the demo needs no configuration.

CORS already allows any origin and the `Authorization` header, and `corsWrapper` answers `OPTIONS` — no
change needed there.

### Frontend

- `/login`: Spanish antd form, the demo credentials shown as a hint, honest error states, redirect to
  `/dashboard` on success, redirect away when a valid session already exists.
- Session module (e.g. `src/features/auth/session.ts`): read/write/clear the token in `localStorage`,
  decode the JWT payload for the display name, and treat an expired `exp` as logged out.
- `PrivateRoute` stops being a no-op and becomes the real guard (no valid session → redirect to
  `/login`). It is applied **once, in the shell**, so every demo route is covered — and it **skips
  `/login`** to avoid a redirect loop. The now-redundant wrap in `app/dashboard/page.tsx` is removed.
- **The guard lives in the shell on purpose**: suite pages are rendered directly in tests, so a guard at
  page level would break many suites, while the shell is what the real app always mounts.
- The shell hides the header/nav/breadcrumb on `/login` for a clean login screen.
- The header shows the user's name and a logout that clears the session and returns to `/login`.
- `Authorization: Bearer <token>` is added by a **shared** `prepareHeaders` used by the three slices
  (`apiSlice`, `dataApi`, `dashboardAPI`) instead of triplicating it.
- `/` now redirects to `/dashboard`.
- **No 401 handling**: the backend does not validate the token, so there is nothing to react to.

## Task board

| ID | Title | Status |
| --- | --- | --- |
| 1 | Freeze the auth contract and publish this record | done |
| 2 | Writer A — backend: users.csv, the login endpoint, HS256 with stdlib | pending |
| 3 | Writer B — frontend: `/login`, session, real guard, header, Bearer, landing | pending |
| 4 | Independent verification of both sides | pending |
| 5 | Commit both repos | pending |
| 6 | Demo credentials + flow documented in the READMEs | pending |
