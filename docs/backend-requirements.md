# Backend API Contract — Confirmed (AI Energy Management Platform)

**Frontend:** `bia.frontend`
**Backend:** `bia.backend`
**Status:** the HTTP contract below is **confirmed** against the backend. The
backend repository's `docs/endpoints.md` remains the definitive backend
reference; this file is the frontend-facing summary of that contract, the
requests the backend has since resolved, one frontend-only decision, and the
operational notes needed to run against it.

The earlier version of this handoff was written against a speculative API and
listed defects that the backend has since fixed. Those sections were removed; see
[Resolved by the backend](#2-resolved-by-the-backend).

---

## 1. Confirmed contract

**Base path.** Every route lives under `/api` and nowhere else. Unprefixed paths
such as `GET /health` or `GET /meters` return `404`. Every registered handler is
wrapped with CORS (`Access-Control-Allow-Origin: *`).

### Route summary

| Method | Route | Response body (top level) |
| --- | --- | --- |
| GET | `/api/health` | literal `{"status":"ok"}` |
| GET | `/api/meters` | **bare array** of meter-id strings |
| GET | `/api/meters/{meterId}` | meter metadata object |
| GET | `/api/meters/{meterId}/readings?from&to` | **bare array** of reading objects, or `null` |
| GET | `/api/anomalies` | **bare array** of anomaly objects (`[]` when empty) |
| GET | `/api/anomalies/{id}` | single anomaly object |
| POST | `/api/ai/analyze` | `{"analysisId":"<uuid>"}` |
| GET | `/api/ai/analysis/{id}` | analysis result object |
| GET | `/api/dashboard/summary` | summary object |
| GET | `/api/reports` | `{"reports":[…]}` (raw evidence; not consumed by the frontend) |

### `GET /api/health`

Literal body `{"status":"ok"}`.

### `GET /api/meters`

Bare JSON array of meter-id strings, with no wrapper object. The order is not
sorted.

```json
["M-101", "M-112"]
```

### `GET /api/meters/{meterId}`

Real, derivable meter metadata:

```json
{
  "id": "M-109",
  "meter_id": "M-109",
  "name": "",
  "location": "",
  "status": "OK",
  "created_at": "2026-09-01T00:00:00Z",
  "readings_count": 336,
  "last_reading_at": "2026-09-14T23:00:00Z"
}
```

- `name` and `location` are **always empty strings**: the backend has no data
  source for them and invents no values.
- `status` is `"OK"` or `"DEGRADED"`.
- `created_at` / `last_reading_at` are the earliest / latest reading timestamps,
  UTC RFC3339.
- Unknown meter: `404` with `{"error":"meter <meterId> not found"}`.

### `GET /api/meters/{meterId}/readings?from&to`

Bare JSON array of reading objects. `from` and `to` are RFC3339, both optional
and **inclusive**; an unparseable value is silently ignored (the request is not
rejected). Object field names are the **Go field names**:

```json
[
  {
    "MeterID": "M-109",
    "Timestamp": "2026-09-12T14:00:00Z",
    "Consumption": 43.2,
    "Voltage": 221.9,
    "Current": 101.28,
    "PowerFactor": 0.954,
    "status": "OK"
  }
]
```

- `status` is the only field that carries a JSON tag, and it is `omitempty`
  (absent when empty). It is re-tagged with the lowercase `status` name while
  the other six fields keep their exported Go names.
- Unknown meter, or a window with no matching readings: **`200 null`** — never
  `404`.

### `GET /api/anomalies` and `GET /api/anomalies/{id}`

The list is a **bare array**; the detail is a single object, with the same shape.
An empty list is `[]`. The list is **sorted by ascending `priority`** (`1` =
most urgent), then by `detected_at`, then by `meter_id`.

> **The ordering is confirmed against the backend source.** `sortedEvidence()` in
> `bia.backend`'s `internal/api/handlers/endpoints.go` sorts by `Priority`
> ascending, then by timestamp, then by meter id — a total order, so there are no
> ambiguous ties. `anomalyDTOs()` is the single mapping behind both this list
> endpoint and the stored analysis result, and `internal/api/api_test.go` asserts
> that a response list is ordered by `priority` ascending, so the sequence is
> pinned rather than merely conventional.

```json
{
  "id": "M-109-2026-09-12T14:00:00Z",
  "meter_id": "M-109",
  "detected_at": "2026-09-12T14:00:00Z",
  "type": "REAL_ANOMALY",
  "severity": "HIGH",
  "confidence": 0.9700,
  "reason": "…",
  "recommended_action": "…",
  "status": "unexplained",
  "priority": 1,
  "baseline": {
    "mean": 52.16083333333332,
    "stddev": 20.8447416159286,
    "count": 336,
    "voltage_mean": 219.3816071428571,
    "current_mean": 238.8183035714285,
    "power_factor_mean": 0.9054226190476188
  },
  "consumption_change_pct": 125.28397744156703,
  "voltage_change_pct": -2.7129016057310187,
  "current_change_pct": 111.16053185980832,
  "power_factor_change_pct": -18.159764908520728,
  "correlated_events": [],
  "data_quality": { "flagged": false, "reason": "" },
  "llm_analysis": "…"
}
```

- `id` is deterministic: `<meter_id>-<detected_at as UTC RFC3339>`, so the list
  and the detail always agree.
- `priority` is an integer assigned by the deterministic scorer; **`1` is the
  most urgent**. `GET /api/anomalies` is sorted by it ascending, so the response
  order already answers "what should be investigated first".
- `baseline` carries the statistics of the window the anomaly was compared
  against: consumption `mean`, `stddev` and `count`, plus `voltage_mean`,
  `current_mean` and `power_factor_mean`.
- `consumption_change_pct`, `voltage_change_pct`, `current_change_pct` and
  `power_factor_change_pct` are **signed** percentages relative to the baseline.
- `correlated_events` is **always present** (an empty array when none). Each
  entry is `{ id, type, start, end, description }` with RFC3339 `start`/`end`.
  Only events that explain the deviation are listed, so a real, unexplained
  anomaly (e.g. `M-109`) carries `[]`.
- `data_quality` is `{ flagged, reason }`. `flagged` is `true` only for records
  whose measurements are themselves unreliable (e.g. `M-112`); `reason` is an
  empty string when `flagged` is `false`.
- `llm_analysis` is `omitempty`: the key is absent when no narrative was
  produced, and the frontend renders an honest empty state in that case (see
  [Frontend-only decision](#3-frontend-only-decision-resolved)).
- Unknown id: `404` with `{"error":"anomaly <id> not found"}`.

**Enum values**

| Field | Values |
| --- | --- |
| `type` | `REAL_ANOMALY` \| `EXPLAINABLE_ANOMALY` \| `FALSE_POSITIVE` \| `DATA_QUALITY` |
| `severity` | `LOW` \| `MEDIUM` \| `HIGH` |
| `status` | `explained` \| `unexplained` |

`type`, `severity`, `confidence`, `reason`, `recommended_action` and `status`
are **deterministic pipeline outputs**. `llm_analysis` is an additional narrative
and never replaces them.

### `POST /api/ai/analyze`

No request body is read. The handler re-runs the deterministic pipeline
(idempotent: it does not duplicate stored data) and snapshots the produced
evidence under a new id:

```json
{ "analysisId": "3f1c9d4e-…-uuid" }
```

### `GET /api/ai/analysis/{id}`

```json
{
  "analysisId": "3f1c9d4e-…-uuid",
  "status": "completed",
  "anomalies": [ { "…": "same anomaly DTO shape as above" } ]
}
```

- There is **no** evidence-counter field.
- **`anomalies` is the same DTO array, in the same deterministic priority order, as `GET /api/anomalies`:**
the backend maps the list endpoint and this stored snapshot through one shared helper
(`anomalyDTOs` over `sortedEvidence`, `internal/api/handlers/endpoints.go`), called by
`AnalysisGET` in `internal/api/handlers/ai.go`. The first element is therefore the most urgent
anomaly, which is what the `/anomalies` re-analysis action labels "top-priority".
That ordering is committed and pinned: `sortedEvidence()` is the sort and
`anomalyDTOs()` is the mapping both endpoints share, and `internal/api/api_test.go`
asserts the ascending `priority` sequence.
- Unknown id: `404`.
- The snapshot store is in-memory and per-process: ids are lost on restart.

**Frontend consumer:** the `/anomalies` page mounts `AiReanalysis`, which is the
only UI path to these two routes. Because `POST /api/ai/analyze` is synchronous
and runs the LLM once per evidence item, the request can stay pending for about
a minute; the UI states that latency in the page instead of hiding it, and it
does **not** poll: every response observed so far carried `status: "completed"`, and the DTO in `src/types/backend.ts` also lists `"queued"` among the observed values, so a future run could differ. The action is
additive: it never replaces the deterministic anomaly list already on the page.

### `GET /api/dashboard/summary`

```json
{ "health": "ok", "meters": 12, "anomalies": 4, "lastRun": "latest" }
```

`lastRun` is a literal placeholder string; the backend does not compute a
timestamp for it.

### `GET /api/reports`

```json
{ "reports": [ { "…": "raw models.Evidence, Go field names" } ] }
```

The elements are raw `models.Evidence` values with Go field names, **not** the
anomaly DTO. This route is not consumed by the frontend.

---

## 2. Resolved by the backend

The defects listed in the earlier handoff are fixed:

- **The pipeline produces evidence.** `GET /api/anomalies` returns the classified
  anomalies instead of `[]`; the classifier result is no longer discarded.
- **Classification is deterministic and real.** `type`, `severity`,
  `confidence`, `reason`, `recommended_action` and `status` come from the
  pipeline, not from hardcoded constants.
- **The four required cases are verified:**

  | Meter | `type` | `severity` | `confidence` |
  | --- | --- | --- | --- |
  | M-104 | `EXPLAINABLE_ANOMALY` | `MEDIUM` | 0.8297 |
  | M-106 | `FALSE_POSITIVE` | `LOW` | 0.7932 |
  | M-109 | `REAL_ANOMALY` | `HIGH` | 0.9700 |
  | M-112 | `DATA_QUALITY` | `HIGH` | 0.9000 |

- **A real LLM provider is wired in.** `llm_analysis` is produced by the real
  Ollama provider and exposed on the anomaly DTO (and inside the analysis
  result).

### Former request R1 — priority and ordering (resolved)

The anomaly DTO now exposes `priority` (`REAL_ANOMALY` = 1, `DATA_QUALITY` = 2,
`EXPLAINABLE_ANOMALY` = 3, `FALSE_POSITIVE` = 4, any other type = 5; lower = more
urgent) and
`GET /api/anomalies` is sorted by it ascending, then by `detected_at`, then by
`meter_id`. The ordering is a backend concern: the frontend shows the API value
and never recomputes the priority from `type`. The ordering is confirmed against the backend source and pinned by its test; see the confirmation note under `GET /api/anomalies` in §1.

### Former request R2 — statistical evidence (resolved)

The anomaly DTO now exposes the baseline (`mean`, `stddev`, `count`,
`voltage_mean`, `current_mean`, `power_factor_mean`), the four signed per-signal
change percentages (`consumption_change_pct`, `voltage_change_pct`,
`current_change_pct`, `power_factor_change_pct`), `correlated_events` (always
present, `[]` when none) and `data_quality` (`{ flagged, reason }`).

---

## 3. Frontend-only decision: resolved

`llm_analysis` is **markdown** (headings, tables). Source: the backend session
observed this shape in a **live** LLM run (T24/T25); the backend's own
`docs/endpoints.md` only describes it as the “LLM-generated interpretation” and
does not state a content format, so treat the markdown shape as
observed-on-a-live-run rather than a documented guarantee.

**Resolved.** The frontend renders `llm_analysis` with
[`react-markdown`](https://github.com/remarkjs/react-markdown) plus
[`remark-gfm`](https://github.com/remarkjs/remark-gfm) (GFM is required for the
tables the model emits). `react-markdown`'s default safe behaviour is kept:
**raw HTML stays disabled** — no `rehype-raw` and no `dangerouslySetInnerHTML`,
so the model cannot inject markup.

The field stays **optional**: when `llm_analysis` is absent, empty or
whitespace-only, the UI shows a short honest note instead of a broken empty block.
The narrative is rendered by `src/components/anomalies/AnomalyNarrative.tsx`,
inside a labelled region, and is **additive**: the deterministic `reason` and
`recommended_action` remain plain text and are never replaced or re-parsed as
markdown.

---

## 4. Operational notes

- Start the backend **from its repository root**: its `.env` uses relative CSV
  paths, so running it from another directory breaks dataset loading.
- Port: `3001`. The frontend default base URL is `http://localhost:3001/api`.
- With the real LLM, startup takes about **88 s**: the backend makes 4 model
  calls before it starts listening, so a client that probes immediately will time
  out.
- The backend's LLM work (T23–T25: LLM payload, real Ollama provider,
  `llm_analysis`) is **committed**, not pending: `a9067ac` ("feat(ai): narrate
  anomalies with the real Ollama provider") is on `main`, which is pushed and in
  sync with `origin/main`, and `11c9508` is an ancestor of `main` as well. Both
  `main` and `split-commits` exist and are pushed, so confirming the running
  revision is a matter of which checkout is served, not of uncommitted work.

---

## 5. How the frontend verifies against a live backend

```bash
curl -s localhost:3001/api/anomalies | jq 'length, .[].type, .[].severity'
curl -s "localhost:3001/api/meters/M-109/readings?from=2026-09-12T00:00:00Z&to=2026-09-13T00:00:00Z" | jq '.[0]'
curl -s localhost:3001/api/dashboard/summary | jq
```
