# Feature: frontend-docs — the phase status refresh and a frontend guide

**Status: IN PROGRESS — 0/5.** Branch `refactor/improve-ui`, base `aa4947b`.

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
| F1 | Map the repository for the guide: routes, components, endpoints, states, theme, i18n, conventions, tests, CI, gates, and the existing docs inventory. | todo |
| F2 | Write `docs/frontend-guide.md` in Spanish from that mapping. | todo |
| F3 | Refresh the phase status in `docs/ui-refactor-plan.md` and `odd/tasks/refactor-improve-ui.md`. | todo |
| F4 | Correct the three stale README claims. | todo |
| F5 | Structural readback by the parent, commit, and the review slice. | todo |
