# Feature: frontend-docs — the phase status refresh and a frontend guide

**Status: DONE — all five tasks complete.** The guide landed as `cc60524` and the repairs plus the status refresh as
`354fc8d`, both pushed. Branch `refactor/improve-ui`, base `aa4947b`.

**Review: not run** — the owner has declined further review runs (see `odd/tasks/breadcrumb-gutter.md` for the same
disposition). A documentation-only candidate is the `non_executable_only` case, which the provider typically
self-closes without a lens run, but that was not confirmed because no `START` was issued.

## Why

The owner asked for two things:
1. **Update the phase-status `.md`** so it reflects what has actually been implemented.
2. **Create a new `.md`** that explains how the whole frontend works, what each page contains, and everything else worth
presenting about this repository.

The second one is presentation-facing, so it has to be accurate rather than thorough: a guide that describes a deleted
component or a mechanism that does not work is worse than no guide.

## What the first pass already found

**`README.md` is stale in three places that matter**, and they are exactly the class of defect this repository has been
bitten by before (a record describing a state that no longer exists):

1. It lists `/` as *"Home: backend health status (`HealthStatus`) and meter list (`MeterList`)"*. Phase 0+1 made `/`
   **redirect to `/meters`**, and phase 3 **deleted `HealthStatus.tsx`** as dead code. The README documents a route
   shape and a component that no longer exist.
2. Its **Environment** section states that `src/utils/apiBaseUrl.ts` reads `NEXT_PUBLIC_API_URL`. It does read it — and
   it **never reaches the browser**: the optional-chaining form is not statically inlined by Next, so the hardcoded
   `http://localhost:3001/api` fallback always wins client-side. The README documents a working configuration knob that
   does not work (`apiBaseUrl-never-inlined`, proven from the emitted bundle).
3. Its route table and description predate the whole UI refactor: no mention of the Spanish UI, the dark-by-default
   theme, the token layer, the anomaly detail view's shape, or that `/meters` is now a card grid.

## Deliverables and their homes

| # | Deliverable | Home | Language |
| --- | --- | --- | --- |
| D1 | **Phase status refreshed** — every phase and post-phase change, its commit, its receipt state, and what is actually pending | `docs/ui-refactor-plan.md` (the status/continuity doc) and `odd/tasks/refactor-improve-ui.md` (the phase table) | Spanish / English as each file already is |
| D2 | **The frontend guide** — architecture, data flow, every page and its content, conventions, gates, known issues | **`docs/frontend-guide.md` (new)** | **Spanish** — the owner asked in Spanish and will present it; the repository's reader-facing docs (`docs/routes.md`, `docs/project-structure.md`, `docs/ui-refactor-plan.md`) are already Spanish |
| D3 | **README corrected** | `README.md` | English, matching the file |

D2 must **complement, not duplicate**, `docs/routes.md` (routes → endpoints) and `docs/project-structure.md` (folder
responsibilities): it should reference them for the mechanical mapping and spend its own space on how the thing actually
works and what a reader needs to understand it.

## Rules this document must respect

- **Never describe a mechanism that does not work as if it did.** The `apiBaseUrl` defect is documented as a defect, and
  a reader setting `NEXT_PUBLIC_API_URL` must be told it has no client-side effect today.
- **Every page description must be verified against the code**, not inferred from its name.
- **No invented numbers.** Test counts, route counts and gate results must be labelled with the commit they were
  measured at, or omitted.
- The environment trap stays prominent: the app only hydrates on `http://localhost:3000`.

## Tasks

| # | Task | Status |
| --- | --- | --- |
| F1 | Map the repository for the guide: routes, components, endpoints, states, theme, i18n, conventions, tests, CI, gates, and the existing docs inventory. | **done** — the scout also found the two extra stale documents and the oddities (`jest` in `dependencies`, no `.env` file) that the brief had not asked for |
| F2 | Write `docs/frontend-guide.md` in Spanish from that mapping. | **done** — 11 sections, `cc60524` |
| F3 | Refresh the phase status in `docs/ui-refactor-plan.md` and `odd/tasks/refactor-improve-ui.md`. | **done** — `354fc8d` |
| F4 | Correct the three stale README claims. | **done, and it was four documents** — `README.md`, `docs/routes.md`, `docs/project-structure.md` (which also claimed a `variables.scss` that phase 0+1 deleted) and the new guide. `354fc8d` |
| F5 | Structural readback by the parent, commit, and the review slice. | **done except the slice** — readback done, including verifying the AI-latency copy and the skeleton row counts against the code; no review slice, per the disposition above |

## Two claims in the brief turned out to be wrong

Both were reported back instead of written into the guide, which is what the brief asked for:

1. The brief located the raw-route-segment `h1` on the **anomaly** detail page. It is on the **meter** detail page
   (`src/app/meter/[id]/page.tsx`); the anomaly detail `h1` is the static "Investigación de la anomalía". The
   advisory `meter-detail-h1-encoded` was always named correctly — the parent's prose was what moved it.
2. The brief asserted that BOTH post-refactor changes carry a review receipt. `meters-cards` does
   (`review-b78b90f368a5ca5c`); `breadcrumb-gutter` does **not**, because the owner declined that slice. The
   asymmetry was documented rather than papered over with an invented receipt.

## A third round of this session's own defect class

Verifying the push surfaced three more records describing states that no longer exist — **including this file**:

- **This document** was committed in `cc60524` with every task still marked `todo` and its status reading
  `IN PROGRESS — 0/5`, while all five were done. The tracking doc for the work that repaired stale records was
  itself stale. Fixed here.
- **`docs/ui-refactor-plan.md`** told anyone resuming that browser verification runs on "a headless Chromium
  installed via Playwright in `node_modules`" and to run `npx playwright install chromium`. **There is no Playwright
  and no Puppeteer**: `node_modules` has neither and `package.json` declares neither. Replaced with the recipe that
  is actually used and proven, the machine's Chrome driven over CDP.
- **`odd/tasks/refactor-improve-ui-phase-4.md`** carried the same false Playwright claim, while phase 5's own record
  already described the same check as "the Playwright-free CDP driver used in phase 4". Corrected there too.

The pattern is worth naming: it is *the same failure as the README's deleted-component row*, and it happened again
inside the pass that was fixing it. Writing about a state while the state moves is the risk; the mitigation that
works is re-reading the file after the work, not trusting the note taken before it.
