# Backend API Contract — Confirmed (AI Energy Management Platform)

**Frontend:** `bia.frontend`
**Backend:** `bia.backend`
**Status:** the HTTP contract below is **confirmed** against the backend. The
backend repository's `docs/endpoints.md` remains the definitive backend
reference; this file is the frontend-facing summary of that contract, the
backend requests (all of them resolved), one frontend-only
decision, and the operational notes needed to run against it.

The earlier version of this handoff was written against a speculative API and
listed defects that the backend has since fixed. Those sections were removed; see
[Backend requests](#2-backend-requests).

---

## 1. Confirmed contract

**Base path.** Every route lives under `/api` and nowhere else. Unprefixed paths
such as `GET /health` or `GET /meters` return `404`. Every registered handler is
wrapped with CORS (`Access-Control-Allow-Origin: *`).

### Route summary

| Method | Route | Response body (top level) |
| --- | --- | --- |
| POST | `/api/auth/login` | `{"token":…,"expires_at":…,"user":{…}}` on success, or `{"error":…}` |
| GET | `/api/health` | literal `{"status":"ok"}` |
| GET | `/api/meters` | **bare array** of meter-id strings |
| GET | `/api/meters/{meterId}` | meter metadata object |
| GET | `/api/meters/{meterId}/readings?from&to` | **bare array** of reading objects, or `null` |
| GET | `/api/anomalies` | **bare array** of anomaly objects (`[]` when empty) |
| GET | `/api/anomalies/{id}` | single anomaly object |
| POST | `/api/ai/analyze` | `202 {"analysisId":"<uuid>","meter_id":"M-109","status":"queued"}` |
| GET | `/api/ai/analysis/{id}` | analysis result object |
| GET | `/api/dashboard/summary` | summary object |
| GET | `/api/reports` | `{"reports":[…]}` (raw evidence; not consumed by the frontend) |

### `POST /api/auth/login`

Body `{"username":"…","password":"…"}`. It is the **only** authenticated route: it issues an HS256 JWT and the
backend does **not** validate that token on any other route. That is a deliberate scope limit of this demo, not an
oversight — and it is why the frontend guard is a UX flow rather than a security boundary.

Success (`200`):

```json
{
  "token": "<jwt>",
  "expires_at": "RFC3339",
  "user": { "username": "jcamilo", "name": "Juan Camilo", "authorized": true }
}
```

The JWT claims are `sub` (username), `name`, `authorized` (bool), `iat` and `exp` (8 h). The frontend reads them by
decoding the `base64url` payload segment; it never verifies the signature.

| Case | Response |
| --- | --- |
| valid and authorized | `200` with the body above |
| unknown user **or** wrong password | `401` `{"error":"usuario o contraseña incorrectos"}` (the same body for both, so the endpoint does not enumerate users) |
| `authorized: false` | `403` `{"error":"el usuario no está autorizado"}` |
| missing field | `400` `{"error":"usuario y contraseña son obligatorios"}` |

Demo credentials: username **`jcamilo`**, password **`bia2026`**. The credential store is a committed CSV that keeps
only the SHA-256 of the password (standard library, no dependency).

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

Takes a JSON body naming the meter:

```json
{ "meter_id": "M-109" }
```

The handler starts (or joins) the AI analysis **for that meter** and answers
immediately with `202 Accepted`:

```json
{ "analysisId": "3f1c9d4e-…-uuid", "meter_id": "M-109", "status": "queued" }
```

- `meter_id` is **required**. Missing or unknown: `400` with `{"error":"…"}`.
- The run is **not synchronous**: the deterministic pipeline and the LLM run
  behind the returned id, and progress is read from `GET /api/ai/analysis/{id}`.
- A second POST while one run for that meter is in flight returns `202` with the
  **existing** `analysisId` instead of starting another LLM call, so a double
  click cannot lose or duplicate the run.

### `GET /api/ai/analysis/{id}`

```json
{
  "analysisId": "3f1c9d4e-…-uuid",
  "meter_id": "M-109",
  "status": "queued",
  "stage": "lecturas",
  "progress": { "done": 0, "total": 7 },
  "started_at": "2026-09-12T14:00:00Z",
  "finished_at": null,
  "anomalies": [ { "…": "same anomaly DTO shape as above" } ],
  "platform": { "total_anomalies": 4, "high_priority": 2 },
  "error": null
}
```

- `status` is the lifecycle: `"queued"` → `"running"` → `"completed"` |
  `"failed"`.
- `stage` is the **real** pipeline stage the run is on:

  | `stage` | Spanish label drawn by the UI |
  | --- | --- |
  | `lecturas` | Lecturas |
  | `baseline` | Baseline |
  | `deteccion` | Detección |
  | `correlacion` | Correlación |
  | `eventos` | Eventos |
  | `explicacion` | Explicación con IA |
  | `recomendacion` | Recomendación |

  plus the lifecycle-only values `"queued"` (nothing started yet),
  `"completed"` and `"failed"`. `progress` (`done`/`total`, `total` = 7) counts
  the seven stages.
- `started_at` / `finished_at` are RFC3339; `finished_at` is `null` while the
  run is in flight.
- `anomalies` is the same DTO array, in the same deterministic priority order,
  as `GET /api/anomalies`, but **scoped to the run's meter** (empty when that
  meter has none): the backend maps the list endpoint and this stored snapshot
  through one shared helper (`anomalyDTOs` over `sortedEvidence`,
  `internal/api/handlers/endpoints.go`), called by `AnalysisGET` in
  `internal/api/handlers/ai.go`. The first element is therefore the most urgent
  anomaly of the meter. That ordering is committed and pinned:
  `sortedEvidence()` is the sort and `anomalyDTOs()` is the mapping both
  endpoints share, and `internal/api/api_test.go` asserts the ascending
  `priority` sequence.
- `platform` carries the closing counters (`total_anomalies`,
  `high_priority`), populated when the run completes.
- `error` carries the failure reason when `status` is `"failed"` (`null`
  otherwise).
- Unknown id: `404` with `{"error":"análisis {id} no encontrado"}`.
- The snapshot store is in-memory and per-process: ids are lost on restart.

**Frontend consumer:** the `/meter/[id]` page mounts `AiReanalysis`, which is
now the only UI path to these two routes (it used to live on `/anomalies`). The
block posts `{"meter_id":"<meterId>"}`, keeps the returned `analysisId` and
**reads `status`**, polling this endpoint every 3 s
(`ANALYSIS_POLL_INTERVAL_MS`) while the reported value is `"queued"` or
`"running"` — the only two statuses the frontend treats as pending. Every other
value stops the polling: `"completed"`, `"failed"`, and **any status the
frontend does not recognise**, which is reported as unrecognised rather than
rendered as a finished analysis. The list of non-terminal statuses is
deliberately an allow-list, so a future or malformed value can never turn into
an unbounded request loop.

The UI turns the reported `stage` into an antd `Steps` with the seven real
stages, so the process state the technical test asks for reflects the backend
and is never simulated. Because one LLM call exposes no partial progress, the
in-flight signal is the active stage plus the elapsed seconds — **never a fake
percentage** — and a completed run renders the meter's narrative, its
`recommended_action` and the `platform` closing line. The action is additive: it
never replaces the deterministic anomaly list shown elsewhere in the app.

The frontend used to assume an asynchronous run while the backend answered
synchronously, so the polling never engaged. The backend now implements the
cycle above, so the polling is live; see §2 for the reversal of the old
"no polling protocol" stance.

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

## 2. Backend requests

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

### Former request R3 — asynchronous analysis with a real status lifecycle (RESOLVED, stance reversed)

**Reversal of the old stance.** Earlier layers of this document described the AI
endpoints as **synchronous** and treated polling as a protocol the frontend
*assumed* but the backend did not implement; the owner's broader caching
decision was "no polling" **except** this flow. That stance is reversed: the
per-meter analysis **is** now a `202` + polling protocol, and the frontend polls
it for real (see the frontend-consumer note under `GET /api/ai/analysis/{id}` in
§1). `POST /api/ai/analyze` is **not** a blocking request anymore, so the old
"sincrónico ~1 min" wording no longer applies.

The backend now implements the whole cycle:

- `POST /api/ai/analyze` takes `{"meter_id": …}` and returns **immediately** with
  `202 { analysisId, meter_id, status: "queued" }`, running the deterministic
  pipeline plus the LLM asynchronously; a concurrent POST returns the existing
  `analysisId`.
- `GET /api/ai/analysis/{id}` reports a real lifecycle: `queued` → `running` →
  `completed` \| `failed`, with `stage`, `progress`, `started_at` /
  `finished_at`, and `platform` counters, and **every run reaches a terminal
  state within a bounded time** (the frontend polls indefinitely while the status
  is non-terminal, by design).
- A failed run carries the machine-readable `error` string.

The frontend renders progress and the failure reason from those fields, and
deliberately invents none of them (see the DTO rule in §1: no field is stated as
fact before the backend confirms it). The old Engram record
`bia-backend/ai-reanalysis-async-contract` is superseded by the contract above.

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
