# API Endpoints (pointer — not authoritative)

This file is a short pointer. It deliberately does **not** reproduce the API
contract, to avoid a second copy that drifts out of sync with the backend.

- **Confirmed contract:** [`docs/backend-requirements.md`](backend-requirements.md)
  — the route table, the exact response shapes, the confirmed enum values for
  `type` / `severity` / `status`, and the operational notes.
- **Open asks to the backend:** also in
  [`docs/backend-requirements.md`](backend-requirements.md) §3 — expose anomaly
  `priority` and/or sort `GET /api/anomalies`, and expose the per-anomaly
  statistical evidence (baseline, per-signal change percentages, correlated
  events, data-quality flag).
- [`ROUTES.md`](../ROUTES.md) — the routes each page consumes today and the three
  RTK Query slices that declare them.
- The backend repository's own `docs/endpoints.md` and its router/handlers
  (`internal/api/...`) remain the definitive backend reference.
