# Feature: demo polish — the dashboard KPIs, the meters cards and the action column

**Status: DONE — merged into `main` by PR #6.** Two parallel writers, one per repository, on `feat/demo-polish`
(backend from `main` `092c6dc`; frontend stacked on `feat/auth-flow`, which already carries the login).

**Why:** the complete technical test asks for things the app does not show yet. §5 lists six dashboard
KPIs and the app has three of them; §6 wants a meters table with consumption, variation, state and
anomaly plus filters and sorting, and `/meters` is a card grid with a search box; §11 wants an
**Acción** column in the anomaly table; §20 asks for a 5–10 minute demo.

## Frozen contract (both writers code against this)

```
GET /api/dashboard/summary   → adds TWO fields and makes a third real:
  "total_consumption": 12345.6      // kWh: the sum of Consumption over every reading loaded
  "lastRun": "2026-09-28T00:16:17Z" // RFC3339 of the last Detect that published a snapshot.
                                    // REPLACES the literal "latest" placeholder.
  (unchanged: health, meters, anomalies, unvalidatedMeters)

GET /api/meters   → CHANGES from a bare array of ids to objects:
  [{"id":"M-109","consumption":2180.4,"status":"OK","readings_count":336,
    "last_reading_at":"2026-09-12T14:00:00Z"}, …]
  `consumption` is that meter's period total in kWh. `status` is the same OK/DEGRADED
  the meter detail already reports.
```

The `GET /api/meters` change is deliberately breaking: it is the only way to feed per-meter consumption
to the cards without twelve follow-up requests, and the repo already carries an open N+1 advisory.

## Frontend scope

| § | What | Where |
| --- | --- | --- |
| §5 | The six KPIs: Medidores, **Consumo total**, Anomalías IA, **Alta prioridad**, **Confianza IA**, **Último análisis (fecha/hora + estado)**. The last two are computed in the browser from the already-fetched `/anomalies` (`confidence` average, `severity === HIGH` count); the first two come from the summary | `src/app/dashboard/page.tsx` |
| §6 | Cards enriched with **consumption, variation and an anomaly/severity badge**, plus filters (todos / normales / alertas / críticas) and sorting by consumption, variation or severity — the browser joins `/meters` with `/anomalies` by `meter_id` | `src/components/MeterList.tsx`, `MeterCard.tsx` |
| §11 | An **Acción** column: Investigar / Validar / Validar operación / No escalar | `src/components/anomalies/AnomalyTable.tsx` |
| — | The one high-value test the auth verification asked for: prove the guard is mounted in `SiteShell` | `src/components/__tests__/` |
| §20 | The 5–10 minute run-through (startup order, credential, the `LLM_API_KEY` caveat, and what to look at on each screen). **Deliberately NOT in this repository**: the owner keeps it outside both repos to present the apps, so nothing here links to it and no commit contains it | the owner's copy |

## Backend scope

`total_consumption` and a real `lastRun` in the summary, the `GET /api/meters` shape change, the tests
those break, and the three docs that describe them (`docs/endpoints.md`, `docs/architecture.md`,
`docs/routing.md`).

## What is deliberately NOT in this batch

- **`apiBaseUrl`** stays as it is. The owner is writing `.env.example` by hand with a caveat that is
  true today; changing the code would make that file wrong.
- **More tests than the existing suites require**, plus the one `SiteShell` guard test above.
- **The `.env.example` files**: the owner creates them by hand because the path policy blocks the tool.
