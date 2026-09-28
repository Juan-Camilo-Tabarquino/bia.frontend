# BIA Frontend

Web client for the BIA energy management platform: meter monitoring, per-meter readings and dashboard summaries over the `bia.backend` REST API.

[![CI](https://github.com/Juan-Camilo-Tabarquino/bia.frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/Juan-Camilo-Tabarquino/bia.frontend/actions/workflows/ci.yml)

## Stack

- **Next.js 16** with the **App Router** (routes live in `src/app`) and the built-in **Turbopack** bundler.
- **React 19** + **TypeScript**.
- **Redux Toolkit / RTK Query** for data fetching.
- **Ant Design** for UI, **Recharts** for charts, **SCSS** for styles (global stylesheets plus `*.module.scss` for components).
- **Jest** + **React Testing Library** for tests.

There is **no Vite and no React Router** in this repository. Everything lives at the repository root; there is no `frontend/` subdirectory. See `docs/decisions/vite-decision.md` for the superseded bundler decision record.

## UI

The interface is the result of the `refactor/improve-ui` work (`docs/ui-refactor-plan.md`):

- **Spanish** throughout, including antd's own strings via `locale={esES}` and `dayjs.locale("es")`.
- **Dark by default with a persisted light toggle.** The palette lives in one token module (`src/theme/tokens.ts`) that emits the `--bia-*` CSS variables, scoped by the `bia-theme` class on `<html>`.
- **A real shell** (`AntdRegistry` → `Providers` → `SiteShell`): header with three destinations, a pathname-derived breadcrumb, and a one-shot health toast.
- **`/meters` is a card grid**, not a list: one clickable antd card per meter (id, estado, última lectura), where the whole card is the hit area but the accessible name of the link stays exactly the meter id.

The full architecture, data flow, per-page behaviour and conventions are in [`docs/frontend-guide.md`](docs/frontend-guide.md) (Spanish).

## Requirements

- Node.js 20, the version CI runs on. Note that `@testing-library/jest-dom@7` declares `engines.node >=22` while the repository declares no `engines` field of its own, so a Node 20 install prints an npm engine warning instead of failing.
- A reachable `bia.backend` instance exposing the REST API.

## Environment

The API base URL is resolved in exactly one place, `src/utils/apiBaseUrl.ts`. That file reads `NEXT_PUBLIC_API_URL` and falls back to `http://localhost:3001/api`, but the read is **materially incomplete**: it uses the dynamically optional-chained form `process?.env?.NEXT_PUBLIC_API_URL`, which Next does not statically inline, so in the browser the chain short-circuits and the hardcoded fallback always wins. **Setting `NEXT_PUBLIC_API_URL` has no browser effect today**, and this repository has no `.env.local` or `.env.example`. The defect is tracked as `apiBaseUrl-never-inlined` and documented as a defect, not a feature, in the API-URL defect section of [`docs/frontend-guide.md`](docs/frontend-guide.md).

The `.env.local` file below is therefore *not* sufficient to point the running client at another API:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `next dev` | Development server (Turbopack) on http://localhost:3000 |
| `npm run build` | `next build` | Production build |
| `npm start` | `next start` | Serve the production build |
| `npm run lint` | `eslint .` | Lint the codebase |
| `npm test` | `jest` | Run the test suite |

## Routes

Implemented today under `src/app`:

| Route | File | Description |
|-------|------|-------------|
| `/` | `src/app/page.tsx` | Server component whose only body is `redirect("/dashboard")`; it renders nothing itself. |
| `/login` | `src/app/login/page.tsx` | Sign-in screen: antd username/password form, the demo credentials shown as a hint, the backend's `400`/`401`/`403` messages surfaced, and a redirect to `/dashboard` on success. Hides the shell's header, nav and breadcrumb. |
| `/meters` | `src/app/meters/page.tsx` | Full meter list. |
| `/meter/[id]` | `src/app/meter/[id]/page.tsx` | Single meter detail. |
| `/meter/[id]/readings` | `src/app/meter/[id]/readings/page.tsx` | Meter readings with chart and table. |
| `/dashboard` | `src/app/dashboard/page.tsx` | Summary metrics and anomaly table. |
| `/anomalies` | `src/app/anomalies/page.tsx` | Anomaly list with in-browser filters and sorting, plus the on-demand AI re-analysis action (`AiReanalysis`). |
| `/anomalies/[id]` | `src/app/anomalies/[id]/page.tsx` | Anomaly investigation view (`AnomalyDetail`). An unknown id renders a dedicated 404 state. |

Planned, not implemented yet:

| Route | Status |
|-------|--------|
| `/settings` | Planned. User preferences; no final design yet. |

`docs/routes.md` (Spanish) maps each page to the endpoints it consumes.

## Authentication (demo flow)

The technical-test flow starts with **Login → Dashboard**, so the demo has a login screen and a route guard. It is a
**UX flow, not a security boundary**: the backend only issues the JWT at `POST /api/auth/login` and does **not**
validate it on any other route.

**Demo credentials:**

```text
username: jcamilo
password: bia2026
```

They are shown on the login screen too, because this is a flow demo. How it works, briefly:

- The token is stored in `localStorage` under the versioned key **`bia.session.v1`**. The JWT payload (`sub`, `name`,
  `authorized`, `exp`) is decoded by hand; a missing, malformed or expired token counts as “no session”.
- `src/components/PrivateRoute.tsx` is the real guard. It is mounted **once, in the shell** (`SiteShell`), redirects to
  `/login` when there is no valid session, and skips `/login` so it can never loop.
- The header shows the signed-in user and a logout control that clears the session and returns to `/login`.
- A shared `prepareHeaders` (`src/features/auth/authHeaders.ts`) adds `Authorization: Bearer <token>` to the three RTK
  Query slices. There is no response interceptor, because the API returns no `401` on those routes.

See the auth section of [`docs/frontend-guide.md`](docs/frontend-guide.md) and the endpoint in
[`docs/backend-requirements.md`](docs/backend-requirements.md) for the details.

## API layer

All RTK Query HTTP access lives under `src/features`, with one axios call outside it:

- `src/features/api/apiSlice.ts` — `apiSlice` (reducerPath `api`): `POST /auth/login`, `GET /meters`, `GET /meters/{meterId}`, `GET /anomalies`, `GET /anomalies/{id}`, `GET /dashboard/summary`.
- `src/features/data/dataAPI.ts` — `dataApi`: `GET /meters/{meterId}/readings` with `from`/`to` query params.
- `src/features/dashboards/dashboardAPI.ts` — `dashboardApi`: `POST /ai/analyze` and `GET /ai/analysis/{id}`.
- `src/features/store/index.ts` — registers the three slices and their middleware.

`src/api/backend.ts` is a thin axios wrapper kept for one-shot calls outside RTK Query, such as the `GET /health` health check used by `BackendStatus` (a one-shot start-up toast that renders no markup).

## Documentation

- `docs/backend-requirements.md` — the confirmed backend contract, the two requests the backend has since resolved, the markdown decision and the operational notes.
- `docs/endpoints.md` — short pointer to the confirmed contract.
- `docs/routes.md` — routes and the endpoints each page consumes (Spanish).
- `docs/project-structure.md` — folder responsibilities (Spanish).
- `docs/requisitos/Requerimientos.md` — the original technical-test requirements (Spanish input document).
- `docs/requisitos/Frontend_implementation_plan.md` — the original implementation plan (Spanish input document; the `vite` bundler it listed was never adopted).
- `docs/decisions/vite-decision.md` — superseded bundler decision record.
- `docs/frontend-guide.md` — the frontend guide: architecture, data flow, every page and its states, conventions, tests/CI and known issues (Spanish).
- `docs/ui-refactor-plan.md` — the UI refactor plan: the phases delivered, the reviewed post-refactor changes (`meters-cards`, `breadcrumb-gutter`), the review advisories still open, and how to resume (Spanish). No phase is pending.
- `CONTRIBUTING.md` — contribution workflow.
- `AGENTS.md` — Next.js agent notes, regenerated by `next dev`.

## Deploy

Standard Next.js deployment: `npm run build` followed by `npm start`, either on the [Vercel Platform](https://vercel.com/new) or any Node.js host.
