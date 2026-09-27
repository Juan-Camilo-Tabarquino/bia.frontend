# Feature: refactor/improve-ui — phase 4 (Interactividad)

**Status: IN PROGRESS — 1/8 (T1 done).** Branch `refactor/improve-ui`, base `cdb610b` (phase 3 complete).

**Reference:** `odd/tasks/refactor-improve-ui.md` (the whole feature and its phases),
`docs/ui-refactor-plan.md` (the resume entry point), and the 12 open advisories recorded there.

## Why

Phase 4 is what separates a data table from an application. Phases 0+1, 2 and 3 gave the app an identity,
a shell and honest states; phase 4 makes it **operable**: search, sort, paginate, share a filtered view, and
move between a meter and its anomalies without retyping an id.

Two of the 12 open advisories land in this phase and are closed here:
`R3-retry-loading-flag` (the retry buttons in `MeterList` and on `/anomalies` never show their disabled
state, because `retrying` is not passed — the lens and the independent verifier found this separately, four
times) and `R3-breadcrumb-encoding` (raw pathname segments in the breadcrumb).

## Baseline (measured, before the first write)

`node_modules` was empty on arrival, so `npm install` ran first. After it:

| Gate | Result |
| --- | --- |
| `npx eslint .` | 0 |
| `npx tsc --noEmit` | 0 |
| `npm test` | **24 suites / 155 tests, all passing** |
| `npx next build` | not re-run yet (deferred to the first work unit) |

This matches the phase-3 record exactly, so the branch starts from the documented state.

## Scope (from `docs/ui-refactor-plan.md`, phase 4)

- **Search** in meters and anomalies (the full arrays are already client-side).
- **Header sorting** on `AnomalyTable` (today the sort lives in an external `Select`).
- **Consistent pagination**: `AnomalyTable` renders **all** rows (`pagination={false}`, verified) while
  `ReadingsTable` paginates by 10.
- **Deep links for filters**: `/anomalies` reads `meter_id` from the URL but **never writes it back**, so
  filters and sort are lost on refresh and cannot be shared.
- **Cross-links** meter ↔ anomaly: `AnomalyDetail` shows `meter_id` as plain text, not a link.
- **Readable dates**: RFC3339 is shown raw in several places and on the chart X axis.
- **KPI cards with a delta pill** and an insight banner (Bia's visual signature: green ↓ / red ↑ with the
  percentage, plus a context line).

## Exploration findings (read-only map, before the first write)

Measured against the branch at `cdb610b`. Corrections to the plan's assumptions are marked **[corrected]**.

- **Sorting/pagination confirmed.** `AnomalyTable` has **no column `sorter`** and `pagination={false}`
  (`AnomalyTable.tsx:26-73,89`); sort is external via `applyAnomalySort` (`app/anomalies/page.tsx:69`).
  `ReadingsTable` has no `sorter` and `pagination={{ pageSize: 10 }}` (`ReadingsTable.tsx:34-44,61`).
- **`R3-retry-loading-flag` confirmed and narrowly scoped.** `RequestError` already supports `retrying`
  (`RequestError.tsx:20`, applied at `:49-53`, tested at `RequestError.test.tsx:41-46`). Exactly **two**
  callers omit it: `MeterList.tsx:24,31-37` and `app/anomalies/page.tsx:66-71,79-88`. Four other callers
  already pass it, so the fix is adding `isFetching` in two places, not new API surface.
- **Raw dates: 6 field sites + 3 chart surfaces** (the plan said 6 + the axis). Sites:
  `AnomalyTable.tsx:51-55`, `AnomalyDetail.tsx:59-61`, `AnomalyDetail.tsx:188`
  (`{event.start} – {event.end}`), `MeterDetail.tsx:87`, `MeterDetail.tsx:89-91`, `ReadingsTable.tsx:35`. Chart:
  `<XAxis dataKey="Timestamp">` (`ReadingsChart.tsx:217`), the default `<Tooltip />` label (`:218`), the marker
  list (`:265`) and the `sr-only` figcaption interpolation (`:178`, rendered `:262-264`).
  **[corrected]** `dashboard/page.tsx:163` renders `summary.lastRun`, which is the literal `"latest"`
  (`types/backend.ts:141`) and is **not** a date — it must not be formatted as one.
  **[constraint]** the chart snaps anomaly markers to category timestamps with `Date.parse`
  (`ReadingsChart.tsx:82-113`), so a `tickFormatter` must format the label without changing the axis category key.
- **Cross-links.** `meter_id` is plain text (`AnomalyDetail.tsx:57`); the component imports no `next/link`.
  The existing encoding precedent is `MeterDetail.tsx:79-83`
  (`/anomalies?meter_id=${encodeURIComponent(...)}`), which T1/T5 should mirror.
- **KPI cards do not exist.** No delta-pill or KPI component in the repo; `dashboard/page.tsx:143-165` uses inline
  `Card` + `Statistic`. The only reusable piece is `formatSignedPercent` (`anomalyLabels.ts:104-107`) — and it is
  exactly what the delta pill needs. **T7 builds the component; it is not a refactor.**
- **[corrected] No reuse candidates for search or URL state.** There is no `src/hooks/`, no
  `useDebounce`/`useUrlState`, and `src/utils/` holds only `apiBaseUrl.ts`. T1 and T2 must create them.
- **URL is never written today**: no `useRouter`/`router.*`/history API anywhere in `src/`, so T1 is genuinely new
  behaviour rather than a repair.
- **R3-breadcrumb-encoding confirmed**: `SiteBreadcrumb.tsx:54,68` uses the `second` segment verbatim and
  unencoded; existing tests only exercise ASCII ids, which is why it was never caught.
- **Test patterns to follow.** Component suites mock the RTK Query hooks and `next/navigation` directly and use
  **no Redux provider** (`accessibility.test.tsx:9-22`, `app/anomalies/__tests__/page.test.tsx:5-20`); URL state is
  injected via `useSearchParams` (`:319`). The `FakeMessageChannel` shim for rc-select is local to the anomalies
  suite (`:28-61`). **[attention]** only `themeProvider.test.tsx:25` and `BackendStatus.test.tsx:57,77` render inside
  `StrictMode`, so any new effect-bearing component must add that itself.

## Anti-scope (inherited, still binding)

- No new UI library, no Tailwind, no CSS-in-JS, no i18n library.
- **No changes to `src/features/**`** (the three RTK Query slices and their contract are verified).
- **No server-side pagination or filtering**: `GET /api/anomalies` accepts no query parameters. Every
  filter, sort and search runs in the browser over the fetched array.
- Nothing from a paid antd tier.
- Do not retranslate or restructure what phase 5 (chart) or phase 6 (Spanish sweep) will rewrite anyway.
- **Spanish incremental rule**: every component touched in this phase is born in Spanish. Untouched copy
  waits for phase 6.

## Rules the earlier phases cost a cycle each (binding here)

1. **StrictMode.** Every component with effects needs its test rendered inside `<StrictMode>`; every new
   effect must be StrictMode-safe.
2. **Verify the effect, not the intent.** Where a guard matters, run a mutation experiment: remove the
   protection, show the test fails, restore byte-for-byte with a hash check.
3. **`var()` is not reliable in recharts SVG presentation attributes** (`svgwg#1031`); chart colors come
   from the TS map in the token module.
4. **antd's own strings are not in the repo** and no grep of our strings finds them (paginator, `DatePicker`
   panel, "No data"). They need `ConfigProvider locale={esES}` + `dayjs/locale/es`, which is phase 6.

## Tasks

- [x] **T1 — Deep-linked filter and sort state on `/anomalies`.** Read every filter and the sort key from the
      URL and write changes back, without breaking the static prerender (`useSearchParams` already forces the
      Suspense boundary) and without a history entry per keystroke. Round-trip: refresh and a shared link both
      restore the exact view. **Done** — see the T1 result below.
- [ ] **T2 — Search in `MeterList` and `AnomalyTable`.** **Partially done.** `MeterList` search and the
      `useDebouncedValue` hook shipped. The **anomaly** search was reverted after the verification reproduced a
      BLOCKER (a clear racing the debounce resurrects the cleared term); see the T2 result for the evidence and
      the six failed attempts. Re-attempt it with an explicit reset in the state the box is given, rather than
      inferring the reset from the value.
- [ ] **T3 — Header sorting on `AnomalyTable`.** Move sorting onto antd column `sorter` props, keeping the
      existing `applyAnomalySort` semantics (and the "API order" default) so the page's `Select` and the
      header do not fight. `priority` stays the API value, never re-derived.
- [ ] **T4 — Consistent pagination.** `AnomalyTable` paginates like `ReadingsTable` instead of rendering
      every row, with a page size that suits the list and a row count the user can read.
- [ ] **T5 — Cross-links meter ↔ anomaly.** `meter_id` becomes a link to `/meter/{id}` on the anomaly detail
      and in the table; the anomaly list keeps filtering by the same id without navigating.
- [ ] **T6 — Readable dates.** One formatting helper, used everywhere a date is rendered to the user
      (including the chart X axis in phase 5 by contract), while the DTO keeps the raw RFC3339 value.
- [ ] **T7 — KPI delta pills and the insight banner** on `/dashboard`, reading only fields the DTO actually
      carries. No invented metric, no derived baseline: `baseline.mean` and the four signed
      `*_change_pct` values **exist**, so the UI must not claim the backend lacks them.
- [ ] **T8 — Close the two advisories that belong to this phase** (`R3-retry-loading-flag`,
      `R3-breadcrumb-encoding`) and record the phase result here.

## Per-task evidence (filled as each task closes)

| Task | Commit | Gates | Mutation experiment | Review |
| --- | --- | --- | --- | --- |
| T1 | `62dceaa` | eslint 0 · tsc 0 · **25 suites / 170 tests** · next build 0 (7 routes, `/anomalies` still static) | 2 by the writer, 3 probes by the verifier | `gentle-ai-verify`: PASS WITH FINDINGS, no BLOCKER. 3 of 7 findings fixed here; 4 recorded below |
| T2 | `cf5cb04` | eslint 0 · tsc 0 · **26 suites / 171 tests** · next build 0 (7 routes) | 1 probe proving the stale-closure fix | `gentle-ai-verify`: **FAIL**, 1 BLOCKER. Scope reduced by owner decision — see below |
| T3 | — | — | — | — |
| T4 | — | — | — | — |
| T5 | — | — | — | — |
| T6 | — | — | — | — |
| T7 | — | — | — | — |
| T8 | — | — | — | — |

### T1 result

Deep-linked filter and sort state on `/anomalies`, over a new generic `src/hooks/useUrlState.ts`.
Baseline was 24 suites / 155 tests; this task ends at **25 / 170** (+1 suite, +15 tests).

**Shipped:** `useUrlState` (a field-name-agnostic `UrlStateSchema<T>` over the query string) plus
`anomalyUrlSchema` in `anomalyFiltering.ts`, which keeps the semantics in
`applyAnomalyFilters`/`applyAnomalySort` and only declares `meter_id`, `type`, `severity`, `status`,
`detected_from`, `detected_to` and `sort` as transport. Two rules are enforced for every field: **absent
means default** (and a default is never written, so a clean `/anomalies` carries no query string at all) and
**invalid is ignored** (an unknown enum or unparseable `sort` falls back to the default and never counts as an
active filter). Writes use `router.replace(..., { scroll: false })`, so no history entry is pushed. The
pre-existing `?meter_id=M-109` link from `MeterDetail` keeps working.

**Verified no request is triggered:** `useGetAnomaliesQuery()` is still called with no arguments and the slice
declares no `refetchOnMount`/`refetchOnFocus`/`refetchOnReconnect`, so the URL write cannot cause a fetch.

**Mutation experiments (writer):** replacing the `severity` parse with a raw cast made only the
invalid-value test fail; making `serializeSortKey` always emit made exactly the two URL-shape tests fail.
Both reverted and re-verified.

**What the independent verification changed (3 of 7 findings fixed):**
1. `serializeUrlState` could emit the literal string `"undefined"` for an incomplete state object, creating
   parameters that look active and parse back to nothing. No T1 caller triggers it (every call site spreads a
   full object) but the hook advertises reuse, so the guard now also rejects `undefined`.
2. **A real bug my own fix introduced and a test caught:** carrying over foreign parameters by deleting only
   the keys the new state *emits* left a just-cleared parameter in the URL, because a cleared value emits
   nothing. The deletion now walks every key the **schema owns**, so
   `/anomalies?type=DATA_QUALITY&sort=priority` cleared back to `/anomalies?sort=priority`. This is the
   concrete value of the falsification round: the first version of the fix was wrong and the suite said so.
3. `anomalySortKeys` was a second hand-written copy of the four values in `anomalySortOptions`; a sort added
   to the selector but not to the parser would be offered in the UI and silently discarded by a deep link.
   It is now derived from the options.

**Findings deliberately NOT fixed in T1**, recorded as carried advisories rather than silently dropped:
- The hook reads `searchParams` **once, on mount**, so an in-app `<Link>` to the *same* route with different
  parameters would not update the view. Not reachable from the shipped UI (the only link carrying parameters
  goes from `/meter/[id]` to `/anomalies`, which remounts), and refresh/share both remount. A resync effect
  would add loop risk for a path nothing reaches, so the mount-only contract is documented instead.
- A deep link with **one** date bound (`detected_from` alone) filters correctly but renders an empty
  `RangePicker`, because `AnomalyFilters` builds its value only when both bounds exist. Degraded display, no
  crash; T2 or T6 territory.
- Date parameters accept any `Date.parse`-able string, which is consistent with `applyAnomalyFilters` (same
  parser) and therefore never filters inconsistently — only loose link validation.

## Verification plan (phase 4)

### T2 result — partially shipped, scope reduced on purpose

**What shipped:** debounced search on `/meters` (`MeterList`), the generic `useDebouncedValue` hook, and a
**real bug fix in `useUrlState`** (below). `MeterList` search filters the already-fetched id array
case-insensitively, with an honest "mostrando X de Y" count and a search-empty state distinct from the
backend-empty state.

**What was deliberately removed: the anomaly search box.** The independent verification returned **FAIL with a
reproduced BLOCKER**: pressing "Clear filters" while a search draft is still inside the debounce window
re-commits the term the user asked to clear, because `q` was already `null`, so the clear produces no observable
change in the value the box receives. Six implementation attempts failed to close it — a `value`-keyed effect, a
separate external ref, comparing against the draft, a `key`-based remount, an imperative `reset()` through
`useImperativeHandle`, and moving the draft into the caller. Each was validated by a probe and each still lost.
Rather than ship a known-broken interaction, or delete the test that catches it to make the suite look green,
the owner chose to **reduce scope**: `AnomalyFilters.tsx` is reverted to its `cdb610b` state and the defect is
recorded here as the next attempt's input.

**The bug this task DID fix, found while chasing the above: a stale closure in the page.** The page merged
filter patches into a captured value:

```ts
onChange={(next) => setUrlState({ ...urlState, ...next })}
```

`urlState` is the value captured at render time, so **two updates landing before a re-render silently dropped
one**. Proven by probe: setting `meterId` and then `severity` in the same tick produced only `severity`. That is
silent data loss reachable by the ordinary user path — the debounce publishes a term one render after the filter
state it merges into. `useUrlState` now accepts a value **or an updater**, exactly like `useState`'s setter, and
every call site uses the updater form. Re-probed after the fix: both updates survive. This is the highest-value
change in T2 and it was invisible until the falsification round forced a closer look.

**Removed with the search box:** the `q` field in `AnomalyFilterValues`/`emptyAnomalyFilters`/`hasActiveFilters`,
the `matchesAnomalySearch` predicate, the `q` entry in `anomalyUrlSchema`, and the 20 tests covering them (12 in
`anomalyFiltering.test.ts`, 8 in the page suite). Test count went 199 to 171.

**Carried forward:** the anomaly search needs a design where a clear cannot race the debounce. The six failures
are recorded above so the next attempt does not repeat them; the strongest signal is that every one of them came
from *inferring* the reset instead of making it an explicit part of the state the box is given.

- `npx eslint .`, `npx tsc --noEmit`, `npm test`, `npx next build` — all four, per work unit.
- **Route truth**: `/anomalies?meter_id=M-109&severity=HIGH` and a refresh restore the same filtered and
  sorted view; an invalid value is ignored rather than crashing; a shared link reproduces the view.
- **Order truth**: the default view still shows the API order untouched (ascending `priority`), and
  `priority` is never recomputed in the client.
- **Date truth**: no raw RFC3339 string is rendered to the user anywhere.
- **Accessibility**: every new input has an accessible name; the existing `accessibility.test.tsx` rules
  (exactly one `h1` per route) still hold.
- **Browser check** with the Playwright Chromium already in `node_modules` against `next dev` (React only
  logs hydration warnings in dev), with zero console errors.
