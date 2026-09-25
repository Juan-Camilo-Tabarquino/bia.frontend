# Feature: Repo cleanup + AI re-analysis action

**Status: COMPLETE — 7/7.** Both work units are verified: `tsc` 0, lint 0, **18 suites / 118 tests**,
`next build` green warm and cold (7 routes). The work is committed on branch
`feat/frontend-contract-compliance` in 8 work-unit commits (below); `main` is untouched.

**Reference:** `assets/Requerimientos.md`, `docs/backend-requirements.md` (confirmed contract),
`odd/tasks/frontend-requirements-compliance.md` (25/25, closed).

## Context

1. A previous session ran a "remove dead code and leave the repository clean" pass and was cut off
   (`~14:41` local) **without any Engram record and without verification**. Its deletions live in the
   working tree (20+ files) and were never checked with `tsc`/lint/tests/build.
2. That pass left `odd/tasks/frontend-requirements-compliance.md` stale: its "Known non-blocking
   leftovers" section still listed files the pass had already deleted.
3. The AI RTK Query slice `src/features/dashboards/dashboardAPI.ts`
   (`POST /ai/analyze`, `GET /ai/analysis/{id}`) had **zero consumers**. User decision: keep it and
   turn it into a real UI action, not delete it.

## Task 1 — validation of the vestigios, and one correction

The user asked to validate whether each unused-looking file was **normal or an error** before deleting
anything. That instruction paid off: the first scan produced a **wrong verdict**.

### What the first scan did and what it missed

The orphan scan resolved TypeScript/JavaScript importers across `src/**` (including `@/` aliases and
binding-less `.scss` side-effect imports) and cross-checked `HEAD` with
`git grep variables.scss HEAD -- src`. Both missed the same thing: `src/styles/globals.scss` loads
that partial through **Sass's own module syntax**, `@use 'variables';` — no extension, so neither the
TS specifier scan nor the literal `variables.scss` grep could see it.

**Corrected verdict: `src/styles/variables.scss` was LIVE code.** `globals.scss` declares
`@use 'variables';` and uses `variables.$primary-color`. It was deleted during this session, which
broke `npm run build`, and it has been **restored byte-identical to HEAD**.

**Lesson (applies to any future dead-code audit):** resolving only the host language's import syntax is
not enough. Sass/SCSS reaches files through `@use`/`@import` with extension-less and
partial-underscore conventions, so a file can be a hard build dependency while having zero TS
importers.

### Final evidence table

| Path | Mtime | Evidence | Verdict |
| --- | --- | --- | --- |
| `src/styles/variables.scss` | 2026-09-24 12:23 | **Used by `globals.scss` via `@use 'variables'`** (`variables.$primary-color` at globals.scss:11); tracked and unmodified in HEAD | **Live — restored** |
| `src/components/dashboard/ReadingsTable.module.scss` | 2026-09-24 21:25 | 0 bytes; `HEAD:ReadingsTable.tsx` already carried the binding-less `import './ReadingsTable.module.scss'`; no `styles.` usage; the only `@use`/`@import` in the repo is the one in `globals.scss` | Dead weight (deleted with its import) |
| `src/components/PrivateRoute.tsx` | 2026-09-24 18:14 | `HEAD` version is byte-identical (no-op wrapper); imported by `src/app/dashboard/page.tsx` | Live code, deliberate remnant of the auth removal; **kept** |

No other file in `src/**` has zero importers (verified after the correction, and confirmed by a green
`next build`).

### Operational gotcha found while restoring

`npm run build` kept failing with `Can't find stylesheet to import. @use 'variables'` **after** the
partial was already back on disk. `npx sass src/styles/globals.scss` exited 0, proving the SCSS was
valid. The cause was Turbopack's **persistent cache**: it does not invalidate the failed resolution of a
dependency that did not exist when the failure was recorded, even once the file is recreated.
`rm -rf .next` + rebuild → `✓ Compiled successfully`, 7 routes. Any missing-module build failure must be
re-tested against a clean `.next` before being diagnosed as a source problem.

### AI flow facts that constrain the design

- `POST /api/ai/analyze` is **synchronous**: it calls `orchestrator.Run()`, which runs the
  deterministic pipeline and then `LLM.GenerateExplanation` **once per evidence item** (4 real LLM
  calls). Measured at server start-up: ~80 s. No request body is read.
- `GET /api/ai/analysis/{id}` always returns `"status": "completed"` — there is **no pending state**
  to poll. Unknown id → `404`. The snapshot store is in-memory and per process.
- Therefore the UI action is: trigger → wait (long, must be visible) → fetch the snapshot → show it.

## Task board

| ID | Title | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Validate the vestigios against HEAD and Engram | done | Table above; correction documented above |
| 2 | Remove confirmed dead weight | done | `ReadingsTable.module.scss` (0 bytes) + its binding-less import deleted. `variables.scss` **restored**: it was live |
| 3 | Consolidate `globals.scss` imports into `layout.tsx` | done | Import removed from `HealthStatus`, `MeterDetail`, `MeterList`; `grep globals.scss src` → only `layout.tsx` |
| 4 | Wire the AI re-analysis action (real UI) | done | `AiReanalysis.tsx` + tests + mount on `/anomalies`; delegated to `gentle-ai-worker` |
| 5 | Update stale docs | done | `ROUTES.md` (page row, endpoint row, removed the false `GET /events` row), `docs/backend-requirements.md` (frontend consumer note + the priority-ordering fact), compliance doc leftovers + stale test counts |
| 6 | Independent verification | done | `gentle-ai-verify` → all gates PASS; 3 findings, all closed (see below) |
| 7 | Engram record + report | done | Mirror `odd/repo-cleanup-and-ai-action/tasks` updated to the closed state |

## Independent verification (task 6)

`gentle-ai-verify`, read-only, over the uncommitted working tree. Gates:
`tsc --noEmit` 0 · `npm run lint` 0 · `npm test` **18 suites / 118 tests** · `npm run build` 0 both warm
(854 ms) and **cold after `rm -rf .next`** (5.0 s, 7 routes) · `variables.scss` byte-identical to HEAD
(`cmp` + sha256) · `globals.scss` imported only by `layout.tsx` · the repo's only SCSS `@use` resolves to
an existing file · zero-importer scan over 41 non-test files → none (exempt: `layout.tsx`, `env.d.ts`,
`favicon.ico`) · ROUTES.md has no `/events` claim · the one-`h1` rule holds statically.

Three findings, all closed here:

1. **Undocumented ordering assumption (real gap).** `AiReanalysis` labels `anomalies[0]` as the
   top-priority anomaly, but no doc stated that `GET /ai/analysis/{id}` returns the array in priority
   order (only `GET /api/anomalies` was documented as sorted). Confirmed against the backend source —
   `anomalyDTOs` over `sortedEvidence` is shared by the list endpoint and `AnalysisGET`, so both inherit
   the same fields and ordering — and now documented in `docs/backend-requirements.md` plus a comment in
   `AiReanalysis.tsx`.
2. **Stale counts** in the compliance doc (`17 suites / 110 tests` → annotated as the count at that
   close, with the follow-up's 18 / 118).
3. **Baseline nuance worth recording:** `ReadingsTable.module.scss` was **untracked** (absent from both
   `HEAD` and the index), so its deletion leaves no `git status` trace and is proven only by mtimes and
   the fact that `HEAD:ReadingsTable.tsx` carried an import for a blob that was never committed — i.e.
   there was a **pre-existing dangling import at HEAD**, now removed.

Verifier caveats accepted: the new component tests inject hook states through `jest.mock` (no store and
no RTK Query lifecycle), mitigated by `tsc` checking the component against the real hooks; and no backend
was reachable, so the latency, `status` and `404` claims rest on the contract doc plus the backend source
read earlier, not on a live call in this task.

## Work units (branch `feat/frontend-contract-compliance`, based on `main` = `2561da81`)

| Commit | Work unit |
| --- | --- |
| `d32f321c` | `chore(build)`: unify the toolchain on Next.js 16, ESLint 9 and jest |
| `c5892f81` | `feat(data)`: align the API layer with the confirmed backend contract |
| `0fc74717` | `feat(ui)`: rebuild the shell, meters and dashboard on deterministic data |
| `c4914b8f` | `feat(readings)`: plot every signal and mark anomalies on the timeline |
| `9f2707ad` | `feat(anomalies)`: add the anomaly list and investigation pages |
| `8ecfe502` | `feat(anomalies)`: re-run the platform AI analysis on demand |
| `8a9e0bd4` | `chore(cleanup)`: drop the components and modules the rebuilt pages no longer use |
| `8528030e` | `docs`: reconcile the repository docs with the delivered app |

Order is dependency-aware, not bisect-safe: this 25-task feature was never committed incrementally, so
no intermediate commit is claimed to be independently green. Only the final tree is verified, and the
last commit's content is byte-identical to the verified tree (`src/app/anomalies/page.tsx` sha256
`6f485431…`, `src/styles/variables.scss` sha256 `c8f0fd01…` = the value the verifier compared against
`HEAD`). The AI action's mount was attributed to `8ecfe502` by removing those two lines for the previous
commit, with a backup and a matching sha256 on restore. Two junk files (`nul`, `nul.map`, the accidental
output of `npx sass … /dev/null` on Windows) were deleted rather than committed.

## Decisions

- **`PrivateRoute` stays.** No-op wrapper, but referenced and byte-identical to `HEAD`: committed
  history, not damage. Deleting it is an optional refactor with diff cost and zero functional gain.
- **Dead weight is removed only where the evidence is conclusive**, and the evidence must cover the
  language-specific module syntax of every file type involved.
- **AI action shape:** a labelled `<section>` on `/anomalies` after the results block. Button +
  explicit latency disclosure (`aria-describedby`), a `role="status"` running message, an antd
  `Alert type="error"` with a fallback on either request failing, and on success the anomaly count,
  the top-priority anomaly (first element — the API orders by `priority`) linked to its detail route,
  and its narrative through the existing safe `AnomalyNarrative`. No polling, no fake progress
  percentages, no new dependency.
- **The deterministic list remains the source of truth.** The action is additive: it does not replace,
  reorder or mutate the list.
- **Known limitation (deliberate):** the list is not invalidated after a run, because the RTK Query
  slices declare no cache tags. Wiring that would require touching `apiSlice`, outside this scope;
  recorded in `ROUTES.md` instead of papering over it.
- **Nothing is committed** in this repo: `HEAD` is `2561da81` and every slice since lives in the
  working tree. Attribution rests on declared surfaces and content, not on diffs.
