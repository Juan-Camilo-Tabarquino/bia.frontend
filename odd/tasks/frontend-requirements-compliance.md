# Feature: Frontend requirements compliance (`assets/Requerimientos.md`)

**Status: COMPLETE — 25/25 tasks closed.** Every slice was delegated to a subagent and independently verified; the plan ended with a live end-to-end acceptance against the real Go backend.

**Reference:** `assets/Requerimientos.md`, `docs/backend-requirements.md` (confirmed contract), `docs/endpoints.md` (pointer).

**Stack decision:** **Next.js App Router ONLY** (Next 16, Turbopack). Vite and React Router removed.

## Final task board

| ID | Title | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Unify the frontend stack | done | Next App Router; Vite/React Router deleted; `tsc` 0; build OK |
| 2 | Fix bundler env strategy and `next.config.ts` | done | `process.env.NEXT_PUBLIC_API_URL` via `src/utils/apiBaseUrl.ts` |
| 3 | Replace frontend DTOs with real payloads | done | Two passes: handoff, then the confirmed contract |
| 4 | Remove non-existent `GET /analysis` | done | Only `/ai/analysis` remains |
| 5 | Remap routes and query params | done | `from`/`to` on readings |
| 6 | Register every RTK Query slice | done | `apiSlice`, `dataApi`, `dashboardApi` |
| 7 | `tsc --noEmit` = 0 | done | Verified repeatedly |
| 8 | Rebuild dashboard on deterministic results | done | `/dashboard/summary` + `/anomalies`, no AI on mount |
| 9 | `/anomalies` list with filters and priority | done | Client-side filters; real `priority` column + order |
| 10 | `/anomalies/:id` investigation page | done | Evidence blocks: baseline, change %, correlated events, data quality |
| 11 | Anomaly type/severity/confidence for the 4 cases | done | Verified live |
| 12 | Multi-series charts with baseline and markers | done | Signal selector (4 real signals) + anomaly markers; no baseline drawn (API had none at the time) |
| 13 | Data-quality visualization | done | M-112 distinct visually and textually |
| 14 | Full navigation flow | done | Nav + dashboard → anomalies → detail → action |
| 15 | Real meter detail + links | done | Metadata + readings/anomalies links |
| 16 | i18n + accessibility pass | done | Option A: a11y without deps; dead i18n scaffold removed |
| 17 | Rewrite test suite | done | 17 suites / 110 tests at the time; 18 / 118 after the follow-up AI action |
| 18 | Update documentation | done | README/ROUTES/PROJECT_STRUCTURE/VITE_DECISION/CONTRIBUTING/endpoints/backend-requirements |
| 19 | CI green + clean artifacts | done | lint 0, tests green, build OK, lockfile re-synced, `dist/` removed |
| 20 | End-to-end acceptance M-104/M-106/M-109/M-112 | done | Live backend; 4/4 cases PASS |
| 21 | Re-align DTOs to the confirmed contract | done | Go wire names, `Reading[] \| null` |
| 22 | Resolve `priority` + ordering | done | **Backend change** + frontend column/order |
| 23 | Resolve statistical evidence | done | **Backend change** + investigation blocks |
| 24 | Reconcile docs with the confirmed contract | done | No false field stated as fact |
| 25 | Render `llm_analysis` (markdown) | done | `react-markdown` + `remark-gfm`, raw HTML disabled |

## Backend changes and rollback (engram)

The two backend tasks required touching `bia.backend` (authorized by the user, with rollback documented):

- Rollback anchor (pre-change state + sha256 BEFORE): engram `bia-backend/rollback-anchor-priority-evidence`.
- Change record (what changed, sha256 AFTER, isolated diff): engram `bia-backend/change-record-priority-evidence`.
- Isolated diff of the backend change: `/tmp/bia-backend-my-change.diff`
- Full pre-change backup: `/tmp/bia-backend-rollback-20260925-135115`
- Restore: `BK=/tmp/bia-backend-rollback-20260925-135115; cd <bia.backend>; cp -r "$BK"/internal .` then `go build ./... && go test -count=1 ./...`.
- **Never** `git checkout/restore/stash/reset` on those files: the repo carries another session's uncommitted LLM work.

## Final verification (independent)

`npm ci --dry-run` 0 · `tsc` 0 · lint 0 · **17/110 tests at the time of this close** (the follow-up feature `repo-cleanup-and-ai-action.md` brings it to 18 suites / 118 tests) · `next build` OK (7 routes) · backend `go build`/`go test` green · live contract: 4 anomalies ordered by `priority`, exactly the 18 DTO keys, `baseline` with 6 fields, `correlated_events` empty only for M-109, `data_quality.flagged` only for M-112, `null`/404 edge cases correct, `llm_analysis` present and rendered from the DTO field.

## Known non-blocking leftovers

- Jest prints a pre-existing "worker process has failed to exit gracefully" teardown warning (suite still passes).
- Dead code removed by the follow-up cleanup pass (see `odd/tasks/repo-cleanup-and-ai-action.md`): `src/features/data/dataHooks.ts`, `src/features/dashboards/dashboardHooks.ts`, `src/components/dashboard/ChartPanel.tsx`, `src/components/dashboard/Analyzer.tsx` and the orphan RTK Query reducers. `src/features/dashboards/dashboardAPI.ts` is **not** dead: it is consumed by the `/anomalies` AI re-analysis action.
- antd v6 deprecation warnings in tests: `Alert message` → `title`, `Space direction` → `orientation`.
- `bia.backend/docs/endpoints.md` shows `"Status"` (capitalized) for readings; the wire emits lowercase `status`. Backend doc owned by another session.
- No commits were made in either repo: everything lives in the working trees.
