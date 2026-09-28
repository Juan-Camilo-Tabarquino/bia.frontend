# Feature: per-meter on-demand AI analysis with visible progress

**Status: DONE — merged into `main` by PR #4** (commit range `29b70bc1..e8f8118f`). Two parallel writers, one per repository.

**Why:** technical test §13 requires *"un botón Run AI Analysis y mostrar el estado del proceso"*, and §21's
flow runs `Run AI Analysis` **before** `Explicación`. Today the backend runs `Enrich()` (4 LLM calls,
~80-120 s) in a goroutine **at start-up**, so the narratives exist before anyone clicks, and the only button
lives on `/anomalies` below the table, labelled "Reintentar…", with no process state.

**Owner decisions (locked):**

- Analysis **per meter only**, triggered from the meter detail.
- The automatic start-up `Enrich()` is **removed**: the LLM runs only on the button.
- **202 + polling** (not a blocking POST, not a fixed sleep).
- The §13 pipeline stages are reported **for real** and drawn as an antd `Steps`.
- `data/analyses.json` as a **write-only audit log**.
- Meters cards get enriched (separate work unit), login per the agreed plan (separate work unit).

## Frozen contract (both writers code against this verbatim)

```
POST /api/ai/analyze            body {"meter_id":"M-109"}
  400 {"error":"…"}             when meter_id is missing or unknown
  202 {"analysisId":"<uuid>","meter_id":"M-109","status":"queued"}
  A second POST while one run for that meter is in flight returns 202 with the
  EXISTING analysisId instead of starting another LLM call.

GET /api/ai/analysis/{id}
  200 {
        "analysisId": "…", "meter_id": "M-109",
        "status":  "queued" | "running" | "completed" | "failed",
        "stage":   "queued" | "lecturas" | "baseline" | "deteccion" | "correlacion"
                 | "eventos" | "explicacion" | "recomendacion" | "completed" | "failed",
        "progress": {"done": 0, "total": 7},
        "started_at": "RFC3339", "finished_at": "RFC3339 | null",
        "anomalies": [],                      // filled when completed; the meter's anomalies
        "platform": {"total_anomalies": 4, "high_priority": 2},   // when completed; §13's closing line
        "error": null
      }
  404 {"error":"análisis {id} no encontrado"}   (unchanged)
```

Stages, in order, with the Spanish labels the UI draws:

| `stage` | Label |
| --- | --- |
| `lecturas` | Lecturas |
| `baseline` | Baseline |
| `deteccion` | Detección |
| `correlacion` | Correlación |
| `eventos` | Eventos |
| `explicacion` | Explicación con IA |
| `recomendacion` | Recomendación |

Honest progress: one LLM call has no partial progress, so the visible signal is **the active stage plus
elapsed seconds**, never a fake percentage. The repo already has that decision on record.

## Guardrails

- **Watchdog** ~90 s → `failed` with a reason, so the spinner can never hang (provider timeout is 60 s).
- **`defer recover()`** in the goroutine → `failed`. Today's start-up goroutine has neither, which is the
  backend's own open item A2.
- The audit log is **never a read path for the API**: memory is the single source of truth. An id does not
  survive a restart, which is already documented behaviour.

## Parallelisation (one writer per repository, disjoint files)

| Writer | Repository | Surface |
| --- | --- | --- |
| A | `bia.backend` | `internal/api/handlers/ai.go`, `internal/analysis/orchestrator.go` (progress hook), a new audit-log file, tests, `docs/`, `.env.example` |
| B | `bia.frontend` | `AiReanalysis.tsx` (meter-scoped + `Steps`), `meter/[id]/page.tsx`, `anomalies/page.tsx` (unmount), tests, docs, `.env.example` |

Deliberately **one writer per repository**: the two backend halves (contract + progress hook) touch the same
files, so they are one sequential writer inside that repo. Two repositories is real isolation; two writers in
one repo would not be.

**Not in this batch:** login/JWT, the §5 dashboard KPIs, the §6 card enrichment, the §11 `Acción` column.
The new endpoints must **not** require auth yet, or the frontend breaks mid-flight.

## Task board

| ID | Title | Status |
| --- | --- | --- |
| 1 | Freeze the contract and publish this record | done |
| 2 | Writer A — backend: record + 202 + statuses + stages + audit log + guardrails | done (PR #4) |
| 3 | Writer B — frontend: meter-scoped button, `Steps`, polling, result | done (PR #4) |
| 4 | Independent verification of both sides | done (PR #4) |
| 5 | Login/JWT + route guard | done (PR #6, auth flow) |
| 6 | §5 dashboard KPIs, §6 card enrichment, §11 `Acción` column | done (PR #6, `demo-polish`) |
| 7 | `.env.example` in both repos + demo script | done — frontend `.env.example` in PR #6; the demo script is deliberately kept outside the repo |
