# Feature: AI re-analysis — read the analysis `status` and poll until it is terminal

**Status: DONE — committed and merged into `main` by PR #3.** Branch `feat/ai-reanalysis-status`, from `main`
(`4bf9bb07`). Five code/test files plus four documents changed; the work is committed and in `origin/main`.

**Trigger:** an independent read-only verification of the already-shipped AI re-analysis action
(`odd/tasks/repo-cleanup-and-ai-action.md`) found the highest-value gap: **the component never read
`AnalysisResult.status`.** It rendered "Análisis completado" for any payload, so a `"queued"` (or future
`"running"` / `"failed"`) response would have been reported to the user as a finished analysis.

**Not in scope (deliberate):**

- **Cache invalidation.** `dashboardAPI.ts` declares no cache tags and the component never invalidates, so the
  deterministic anomaly list on `/anomalies` is not refreshed after a run. It stays a recorded limitation;
  fixing it means touching the tag declarations of `apiSlice` and its consumers, which is a separate candidate.
- **A network-level test of the endpoints.** Both suites mock the hook module; proving a real request needs an
  MSW/fetch harness this repository does not have, and it was not invented here.
- **Any speculative DTO field.** No `error`/`progress` field was added to `AnalysisResult` while the backend
  does not document one; the repository's rule is that no field is stated as fact before the backend confirms it.
  The UI therefore reports `"failed"` with an honest fixed message instead of a server reason.

## What was implemented

### 1. The contract knowledge lives in the API layer

`src/features/dashboards/dashboardAPI.ts` gained `ANALYSIS_POLL_INTERVAL_MS = 3_000` and
`isAnalysisPending(status)`, an **allow-list of exactly `"queued"` and `"running"`**. The allow-list is the
safety property: an unrecognised status — a future `"processing"`, a malformed payload — stops the polling
instead of turning into an unbounded request loop, and is never rendered as a completed analysis.

### 2. The interval is derived from the status, one render behind

RTK Query 2.12 types `pollingInterval` as `number`, not a function (verified in
`node_modules/@reduxjs/toolkit/dist/query/index.d.ts:2711`), and it belongs to the same hook call that returns
the status. The interval therefore cannot be computed from the result of that same call in one pass. The
component holds the interval decision in state and adjusts it **during the render**, the pattern
`AnomalyFilters.tsx:146-152` already uses in this repository for its externally owned term:

```tsx
const [polling, setPolling] = useState(false);
const { data: result, error: resultError } = useGetAiAnalysisQuery(analysisId, {
  skip: analysisId.length === 0,
  pollingInterval: polling ? ANALYSIS_POLL_INTERVAL_MS : 0,
});
const pending = isAnalysisPending(result?.status);
if (polling !== pending) setPolling(pending); // converges on the next render
```

Verified against the installed RTK Query source: an interval of `0` is falsy, so it never contributes to
`findLowestPollingInterval`; the lowest interval stays `+Infinity`, and `updatePollingInterval` then calls
`cleanupPollForKey`, which clears the timer. **An interval of `0` genuinely stops polling**; it is not merely
"poll every 0 ms". A positive interval arms the next poll from two places: the middleware handler arms it on
every settled request (`queryThunk.fulfilled` / non-condition `rejected` → `startNextPoll`), and
`updatePollingInterval` arms it when the subscription options change, so the `0 → positive` transition itself
can arm the first poll without waiting for a settle. Both paths converge on the same timer.

### 3. Render branches

POST in flight → request error → **pending** (names the reported status, button disabled, polling on) →
`"failed"` (error alert) → **unrecognised status** (warning, no completion claim, no link) →
`"completed"` (the existing count, top-priority anomaly link and narrative). The success block is now gated on
`status === "completed"`, not on `result` being present.

The action button is disabled while `isLoading || pending`, so a second analysis cannot be spawned on top of
the first.

### 4. A failed read deliberately keeps polling, once a status was seen

`failed` (a mutation or query error) is shown as an alert, and the polling is **not** stopped by it **once a
non-terminal status has been observed**. The run continues on the backend regardless of one failed poll, RTK
Query keeps the last successful `data` across a failed refetch, and a later successful poll clears the error
and replaces the alert with the result. The alternative — stopping and making the user re-run the whole
analysis, which costs about a minute and one LLM call per evidence item — is worse. This is a decision, not an
oversight, and it is commented as such in the component.

The healing property is **bounded by that first observation**: if the very first read after the `POST` fails,
there is no status yet, so nothing is armed, the alert is shown and the button stays available for a fresh
run. An earlier draft of this record stated the property unconditionally; the independent verification caught
the overreach and both the comment and this section were corrected.

**Known, accepted limitations (all recorded by the independent verification):**

- While the status stays non-terminal the polling has **no client-side budget**, so a backend that never
  reaches a terminal state is polled indefinitely while the page stays mounted. That is exactly why the
  backend ask requires a guaranteed terminal state within a bounded time.
- A **sustained** poll failure after a non-terminal status leaves `pending` true from the retained `data`, so
  the button stays disabled and only a page reload escapes. There is no cancel action.
- RTK Query carries the **previous cache key's `data`** (`queryStatePreSelector`) across an `analysisId`
  change, so the previous run's result can render for the window before the new key's first response. It
  self-corrects on that response and it is unreachable through the UI (the button is disabled while pending),
  but it is not covered by a test.

## Task board

| ID | Title | Status |
| --- | --- | --- |
| 1 | Publish this tracking artifact + its Engram mirror | done |
| 2 | Branch `feat/ai-reanalysis-status` from `main` | done |
| 3 | `ANALYSIS_POLL_INTERVAL_MS` + `isAnalysisPending` in `dashboardAPI.ts` | done |
| 4 | Status branching + polling + button gating in `AiReanalysis.tsx` | done |
| 5 | Tests: statuses, polling interval, button gating | done |
| 6 | Correct the docs that claimed the UI does not poll | done |
| 7 | Independent verification (`gentle-ai-verify`) | done |
| 8 | Engram record of the backend asks (the end-to-end contract) | done |

## Delegation and deviations

The five-file writer work was delegated to `gentle-ai-worker` under an explicit `## Allowed edit surfaces`
block. Two forced deviations were reported and **accepted**:

1. **The parent's brief contained invalid TypeScript.** It asked for `const status = result?.status` *before*
   the `useGetAiAnalysisQuery` call that produces `result`, which is a TDZ error and a redeclaration. The
   interval genuinely cannot be derived from the response of the same call, so the writer used the
   state-plus-render-adjustment pattern instead and documented it. The parent verified the pattern is
   precedented in `AnomalyFilters.tsx` before accepting it.
2. **The `"completed"` branch needed `result &&`** in addition to `status === "completed"`, because the
   `status` alias does not narrow `result` and `tsc` reported three `TS18048` errors without it.

The writer also kept single quotes in `dashboardAPI.test.ts` (the repository's only single-quoted test file)
instead of the double quotes the brief demanded — correct judgement, kept.

The parent then **reverted its own correction** to the failed-read behaviour (see §4) after finding that
stopping on error would force an expensive re-analysis instead of letting a transient read failure heal.

## Evidence

- `npx jest src/components/anomalies/__tests__/AiReanalysis.test.tsx src/features/dashboards/__tests__/dashboardAPI.test.ts src/app/anomalies/__tests__/page.test.tsx`
  → **3 suites passed, 56 tests passed** (the three files held 46 tests before this change), exit 0.
- The full suite after the change: **33 suites / 304 tests**, exit 0.
- `npx tsc --noEmit` → exit 0, no output.
- `npx eslint .` → exit 0, no output.
- The five tests the writer added cover: `queued` never announced as completed, `running` keeps
  `pollingInterval: ANALYSIS_POLL_INTERVAL_MS`, `completed` sets it back to `0`, `failed` alerts without
  claiming completion, and an unrecognised `"processing"` warns **and** sets the interval to `0` (the guard for
  the allow-list property), plus a `queued` → `completed` transition triangulation.
- Both suites that mock the slice now spread `jest.requireActual(...)` and override only the two hooks, because
  the component imports a constant and a function from that module.

## Independent verification

`gentle-ai-verify`, read-only, over the working tree. Gates: `npx jest --ci` → **33 suites / 304 tests, all
passed**, exit 0; `npx tsc --noEmit` → exit 0; `npx eslint .` → exit 0. The recorded baseline was 32 suites /
279 tests at `55399056`; the candidate adds **+10 tests, 0 suites**, and the extra suite and remaining tests
come from work already in `main`. No regression.

The central claim was confirmed: the block reads `AnalysisResult.status`, polls only on the `queued`/`running`
allow-list, and stops on every other value, including an unrecognised one, which is never rendered as finished.
The state machine was judged sound (the render-phase adjustment converges, the six branches are pairwise
exclusive with at most one `role="status"`, and the `polling` state cannot get stuck across runs). The library
claim was confirmed against the installed source, and the six new tests were judged non-vacuous, each paired
with the production change that would fail it. The property "an unrecognised status never keeps polling" is
guarded twice (the component test and `isAnalysisPending`'s unit test).

**No high or medium severity defect was found.** Seven low-severity gaps were reported:

| Gap | Disposition |
| --- | --- |
| G1 — "a failed read heals" was stated unconditionally | **closed**: the component comment and §4 now bound it to a status already observed |
| G2 — cross-key stale render window on a new `analysisId` | **accepted and recorded** as a known limitation |
| G3 — sustained poll failure leaves the button disabled, no cancel | **accepted and recorded** as a known limitation |
| G4 — broken intra-page anchor after the §2 retitle (`#2-resolved-by-the-backend`) | **closed** |
| G5 — `docs/endpoints.md` still framed §2 as "already resolved" | **closed** |
| G6 — older task records still assert "no polling" / "no pending state" | **left as history**: they describe the state before this change, and this record is the living pointer |
| G7 — "arms the next poll only after a request settles" was imprecise | **closed** in §2 above |

The verification's own caveat is kept: **no live backend, no browser, no network-level test.** Both suites mock
`dashboardAPI`, so real RTK Query polling is never exercised end to end — the tests assert the `pollingInterval`
argument, not that a request fires on the timer. The 3 s timing and background-tab behaviour are unexercised.

The four G1/G4/G5/G7 fixes were made **after** that verification run and are comment-and-documentation only;
the behaviour of the verified code was not changed by them.

## Docs corrected in the same change

Three documents asserted that the UI does **not** poll, which the change made false:
`docs/routes.md` (the `/anomalies` row), `docs/backend-requirements.md` (the frontend-consumer note under
`GET /api/ai/analysis/{id}`), and `docs/frontend-guide.md` (the `/anomalies` states and the re-analysis note,
plus a clarification in the caching section, since this is the repository's first polling subscription).

`docs/backend-requirements.md` §2 is retitled **"Backend requests"** and carries the open ask **R3** (the
asynchronous lifecycle). "§2" and "§2 R1" references elsewhere stay valid; the one **anchor link** that broke
(the intro's `#2-resolved-by-the-backend`) and the `docs/endpoints.md` pointer that still framed §2 as fully
resolved were both fixed.

## Backend asks

Written to Engram as **`bia-backend/ai-reanalysis-async-contract`** (observation 79, `scope: global`, because
Engram pins a session to one project and this session belongs to `bia.frontend`) for the backend agent: an
asynchronous `POST /api/ai/analyze` returning `queued` immediately, a real status lifecycle
(`queued` → `running` → `completed` | `failed`) with a guaranteed terminal state, a failure reason, optional
progress, and idempotency/retention rules. The same ask is written as **R3** in `docs/backend-requirements.md`
§2 so it is discoverable from the repository as well.
