# API Endpoints (pointer — not authoritative)

This file is a short pointer. It deliberately does **not** reproduce the API
contract, to avoid a second copy that drifts out of sync with the backend.

- **Confirmed contract:** [`docs/backend-requirements.md`](backend-requirements.md)
  — the route table, the exact response shapes, the confirmed enum values for
  `type` / `severity` / `status`, and the operational notes.
- **Backend requests:** in
  [`docs/backend-requirements.md`](backend-requirements.md) §2 — two asks the
  backend has already resolved (the anomaly
  `priority` field and the ordering, confirmed against the backend source and
  recorded in §2 R1, plus the
  per-anomaly statistical evidence (baseline, per-signal change percentages,
  correlated events, data-quality flag) are all in place) and one ask that the
  backend has since **resolved**: **R3**, the asynchronous analysis lifecycle
  (implemented as `202` + polling, and recorded as resolved in
  `docs/backend-requirements.md`).
- §3 of the same document is the frontend-only markdown decision.
- [`docs/routes.md`](routes.md) — the routes each page consumes today and the three
  RTK Query slices that declare them.
- The backend repository's own `docs/endpoints.md` and its router/handlers
  (`internal/api/...`) remain the definitive backend reference.
