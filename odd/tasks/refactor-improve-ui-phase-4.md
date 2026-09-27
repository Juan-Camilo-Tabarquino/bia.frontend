# Feature: refactor/improve-ui — phase 4 (Interactividad)

**Status: PHASE 4 COMPLETE — all 8 tasks done and independently verified (PASS WITH FINDINGS). 29 suites / 254 tests, lint 0, tsc 0, next build 0 with 7 routes. One debt task open (T-SUITE).** Branch `refactor/improve-ui`, base `cdb610b` (phase 3 complete).

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
- [x] **T2 — Search in `MeterList` and `AnomalyTable`.** **Done across T2 and T2b.** `MeterList` search and the
      `useDebouncedValue` hook shipped in T2; the anomaly search shipped in T2b after the root cause turned out to
      be a disabled gate rather than a state race. See both results above.
- [x] **T3 — Header sorting on `AnomalyTable`.** Done: sorting moved onto antd column `sorter` props driven by the
      URL `sort`, with one comparator registry shared by the page and the header. `priority` stays the API value. See
      the T3 result below.
- [x] **T4 — Consistent pagination.** Done: `AnomalyTable` paginates at `ReadingsTable`'s page size, the dashboard
      preview stays control-free, page stranding is impossible, and the ambiguous count wording was removed. See the
      T4 result below.
- [x] **T6 — Readable dates.** Done: one shared `formatDateTime`, six field sites and three chart surfaces, local
      time with a safe fallback, and the formatters extracted out of the anomaly module. See the T6 result below.
- [x] **T5 — Cross-links meter ↔ anomaly.** Done: `meter_id` links to `/meter/{id}` in both `AnomalyDetail`
      (was plain text) and the `AnomalyTable` column, closing the round trip. See the T5 result above.
- [x] **T7 — KPI delta pills and the insight banner.** Done: four delta pills on the signed DTO percentages of the
      leading anomaly, plus an insight banner backed only by the summary total and a plain count of fetched HIGH rows.
      No KPI got a pill without a DTO-backed delta, and no period-over-period comparison was invented. See the T7
      result below.
- [x] **T8 — Close the two advisories that belong to this phase.** Done: `retrying={isFetching}` at both sites, and
the breadcrumb decodes its label while keeping the href encoded, with a `URIError` guard. See the T8 result below.
- [ ] **T-SUITE — Reduce the page suite's runtime.** ~2.3 s per test against Jest's 5 s default; one flaky timeout
      observed. See the open-debt section below.

## Per-task evidence (filled as each task closes)

| Task | Commit | Gates | Mutation experiment | Review |
| --- | --- | --- | --- | --- |
| T1 | `62dceaa` | eslint 0 · tsc 0 · **25 suites / 170 tests** · next build 0 (7 routes, `/anomalies` still static) | 2 by the writer, 3 probes by the verifier | `gentle-ai-verify`: PASS WITH FINDINGS, no BLOCKER. 3 of 7 findings fixed here; 4 recorded below |
| T2 | `8bbd7e0` | eslint 0 · tsc 0 · **26 suites / 171 tests** · next build 0 (7 routes) | 1 probe proving the stale-closure fix | `gentle-ai-verify`: **FAIL**, 1 BLOCKER. Scope reduced by owner decision — see below |
| T2b | `a533122` | eslint 0 · tsc 0 · **26 suites / 177 tests** · next build 0 (7 routes) | 2 gate mutations by the verifier; real-Chrome probes by the parent | `gentle-ai-verify`: PASS WITH FINDINGS, no BLOCKER. 3 findings fixed; 4 recorded |
| T3 | `63644a2` | eslint 0 · tsc 0 · **26 suites / 196 tests** · next build 0 (7 routes) | 2 gate mutations by the parent | `gentle-ai-verify`: PASS WITH FINDINGS, no BLOCKER. 1 finding fixed; 4 recorded |
| T4 | `76c352d` | eslint 0 · tsc 0 · **26 suites / 217 tests** · next build 0 (7 routes) | 3 mutations by the worker, 1 load-bearing | parent audit: the `onChange` guard fixes a URL-rewrite bug the new tests caught |
| T5 | `93f1e45` | eslint 0 · tsc 0 · **26 suites / 202 tests** · next build 0 (7 routes) | n/a — verified by reading the whole diff (small, presentation-only) | parent audit: code matches the `MeterDetail.tsx:72` precedent; assertions strengthened, none loosened |
| T6 | `512593f` | eslint 0 · tsc 0 · **27 suites / 223 tests** · next build 0 (7 routes) | n/a — verified by reading the diff; two traps checked by hand | parent audit: formatters extracted to `components/formatters.ts` (see below) |
| T7 | `db0e73c` | eslint 0 · tsc 0 · **29 suites / 237 tests** · next build 0 (7 routes) | n/a — audited by reading the diff and by a real-browser check | parent audit: zero invented metrics; contrast measured in both themes |
| T8 | `652c04b` | eslint 0 · tsc 0 · **29 suites / 246 tests** · next build 0 (7 routes) | RED observed before the write; 3 mutations reverted with hashes | parent audit: 5 cases re-verified in real Chrome (see below) |
| **Phase verification** | _(this commit)_ | eslint 0 · tsc 0 · **29 suites / 254 tests** · next build 0 (7 routes) | 4 mutations by the verifier, all reproduced | `gentle-ai-verify`: PASS WITH FINDINGS. 3 coverage gaps + 2 doc defects fixed; rest recorded |
| **T-SUITE** | — | — | — | **OPEN DEBT**: the page suite runs ~2.3 s/test (~85 s total, was ~15 s at `cdb610b`). One flaky timeout observed. See below. |

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

### T2b result — the anomaly search, and the real cause of the revert

**Shipped.** The client-side anomaly search, deep-linked as `?q=`, composing with the other filters through
`applyAnomalyFilters`. Searches `id`, `meter_id`, `reason` and `recommended_action`; `type`/`severity`/`status`
are excluded because they already have exact-match controls, and unrendered nested fields are excluded because a
match the user cannot see looks like a bug.

**The finding that mattered: the earlier revert had the wrong root cause.** Six attempts had failed to fix
"clearing the filters while a draft is inside the debounce resurrects the term". All six attacked the state
machine. Driving real Chrome against `next dev` showed the cause immediately, in the DOM:

```
after typing 'zzz':  {"boxValue":"zzz","clearDisabled":true}
```

`disabled={!hasActiveFilters(values)}` reads only the **committed** filters. While a typed term sat in the
debounce, every committed filter was still empty, so "Clear filters" rendered **disabled**. The user could not
clear what they had just typed, and the term reached the URL moments later. **Nothing was ever resurrected — the
button never fired.**

**Why jsdom hid it:** the earlier probes reasoned about state and asserted the box value, while the decisive
fact was the `disabled` attribute. The harness never asserted it. The lesson, now recorded in the task: when a
probe and the app disagree, the probe is the suspect — go to a real browser before iterating further.

**The fix.** The gate also reads the raw box value (`typed.length === 0`), so the action is available whenever
something visible is on screen, including whitespace, which never commits but is still something to clear. The
search state is an explicit `{ text, resetToken }` object so an external reset is always an observable change
instead of something inferred from a value that may not differ. `onChange` takes a **patch** rather than a whole
snapshot, because the search publishes from a timer and a snapshot would overwrite whatever the user changed
while that timer was pending.

**Verified in real Chrome** (the parent drove it over CDP, no new dependency): scenario A (type, clear before the
settle) and scenario B (type, settle, clear) both pass; `?q=` survives a reload; a no-match search shows the
filter empty state and not the backend one; the antd clear icon works; whitespace enables the button; zero
console errors. Three regression tests cover the gate, and moving the gate back to committed-only fails two of
them — so the tests guard the fix rather than decorate it.

**What the falsification round corrected in this task's own reasoning:** the claim that "jsdom clicks a disabled
button anyway" is **false** — React suppresses the handler and the old tests did fail under mutation. The test
comment that repeated it was rewritten. A whitespace-only entry left the button disabled while visibly holding
characters, contradicting the comment; fixed and covered by a test. The full-snapshot `onChange` was replaced by
a patch. Four suggestions remain open and are listed below.

**Findings recorded, not fixed:** two consecutive clears can emit one duplicate `router.replace` with identical
state (harmless; skip publishing when the serialized state is unchanged); `resetToken` is not monotonic because
the page's own Empty-state reset path sets it to 0 instead of incrementing it (the box still clears, via the
external-adoption path, so the token is currently belt-and-braces rather than load-bearing); the Empty-state and
filter-bar clear actions share the accessible name "Clear filters", so a `getByRole` lookup by that name would
throw in that state — worth differentiating when T3/T4 touch that region; and the new pure logic
(`matchesSearch`, `normalizedTerm`, the `q` parse/serialize) has no direct unit coverage in
`anomalyFiltering.test.ts`, only indirect coverage through the page suite.

## Exploration notes for the later tasks (recorded so they are not re-discovered)

**T5 — cross-links.** The meter → anomaly direction **already works**: `MeterDetail.tsx:72,101` builds
`/anomalies?meter_id=${encodeURIComponent(data.meter_id)}` and renders it as "View anomalies", and T1 made that
parameter deep-linkable. The missing direction is anomaly → meter: `AnomalyDetail.tsx:57` renders `meter_id` as
plain text (`{ key: "meter", label: "Meter", children: anomaly.meter_id }`) and the component imports no
`next/link`. The detail page's own back-link (`app/anomalies/[id]/page.tsx:27-28`) points at `/anomalies`, not at
the meter. `AnomalyTable.tsx` also renders `meter_id` as a plain column, which is a second candidate site — note
that making it a link there interacts with the row-level link to the anomaly.

**T6 — readable dates.** Six field sites plus three chart surfaces, all rendering raw RFC3339:
`AnomalyTable.tsx:51-55` (`detected_at` column, no `render`), `AnomalyDetail.tsx:59-61`,
`AnomalyDetail.tsx:187` (`{event.start} – {event.end}` for correlated events), `MeterDetail.tsx:87`
(`created_at`), `MeterDetail.tsx:89-91` (`last_reading_at`), `ReadingsTable.tsx:35` (`Timestamp` column). Chart:
`ReadingsChart.tsx:217` (`<XAxis dataKey="Timestamp">`), the default `<Tooltip />` label at `:218`, the marker
list at `:265`, and the `sr-only` figcaption interpolation at `:178`.

Two traps recorded so T6 does not fall into them: `dashboard/page.tsx:163` renders `summary.lastRun`, which is
the literal string `"latest"` (`types/backend.ts:141`) and is **not** a date — formatting it would be a bug. And
the chart snaps anomaly markers to category timestamps with `Date.parse` (`ReadingsChart.tsx:82-113`), so a
`tickFormatter` must change only the label, never the axis category key, or the marker snapping breaks.

### T3 result — header sorting, and the redundancy the verification exposed

**Shipped.** Anomaly sorting moved off the external `Select` onto antd column-header `sorter` props. One registry
(`anomalySortDefinitions`) is read by both the page's `applyAnomalySort` and the table's antd column props, so
no ordering can be declared twice. The header drives the URL `sort`, so a click is deep-linkable and survives a
refresh; `backend` (untouched API order) is the no-arrow state, and clicking the active header returns to it. The
`Select` was removed rather than kept in parallel, because two controls that can disagree are worse than one.
Columns sorted: `priority`, `detected_at`, `severity` and a new `confidence`. `id`/`meter_id` and
`type`/`status` were deliberately left unsortable. The duplicate accessible name was fixed ("Limpiar filtros"
vs "Clear filters"). The dashboard preview is untouched and gains no URL coupling.

**The finding that changed the task: `applyAnomalySort` is functionally redundant for what the user sees.**
`AnomalyTable` hands `dataSource` to antd, whose controlled sorter re-sorts it in `getSortData`
(`antd/es/table/hooks/useSorter.js`). So the rendered order is antd's, and the verification proved the
consequence by mutation: removing the direction negation from `applyAnomalySort` left **all 25 page tests green**,
because the table still rendered the right rows. The worker's claim that the two "cannot disagree" was wrong —
they can, and antd's pass simply overwrites the other.

That matters because it means **no rendered assertion can guard this ordering**. The verification brute-forced
200,000 valid-domain and 2,000,000 malformed arrays through both sort paths and found **zero divergences**, so the
agreement is real — but it rests on the comparators being total orders combined with V8's stable sort, not on the
code structure.

**What was done about it:** the module docstring now states the situation and where the real guard lives, and a
new direct unit test asserts that `applyAnomalySort` reproduces the registry's own comparison for **every**
declared ordering. Re-running the same mutation now fails 4 tests instead of 3, and the fourth is that new test.
A row-order assertion was first added to the page suite and then **deliberately removed** once the mutation proved
it could not fail: keeping an assertion that cannot detect the bug it names is false confidence, and the comment
left in its place says so. A test tying the sortable columns 1:1 to the registry, plus a two-header switch test,
were also added.

**Recorded, not fixed:** the page-side sort is redundant work rather than removed (the dashboard preview has no
antd sorter, so `applyAnomalySort` is still the only ordering there, and the unit tests depend on it);
`?sort=backend` is *accepted as the explicit default* rather than ignored, which is what the wording claimed —
the outcome is still correct (no arrow, no rewrite); and the deep-link coverage for `sort=confidence` is indirect,
sharing the `detected_at` path.

### T5 result — the anomaly → meter direction

The meter → anomaly direction already worked (`MeterDetail.tsx` renders `/anomalies?meter_id=<encoded>`, made
deep-linkable by T1). This closes the other direction: `meter_id` is now a link to `/meter/{id}` in both
`AnomalyDetail` (it was plain text, and the component did not even import `next/link`) and the `AnomalyTable`
`Meter` column.

Encoding follows the existing precedent exactly (`encodeURIComponent`, as `MeterDetail.tsx:72` does), so an id
with a reserved character addresses the same route segment in both directions of the round trip. `MeterId` is
`type MeterId = string` (`types/backend.ts:11`), so that is reachable in principle even though the seeded ids are
`M-<digits>`; both new encoding tests use `"M 109/A"`.

**Two links per table row, checked rather than assumed.** The row already linked the anomaly id, and now links
the meter too. They live in separate cells as siblings — `AnomalyTable` declares no `onRow`, so there is no
row-level click for a cell link to collide with, and neither anchor nests inside the other. Accessible names stay
distinct and equal to the visible text (which satisfies label-in-name and is why no `aria-label` was added): the
anomaly link is named by the anomaly id, the meter link by the meter id.

**The 16 `linkNames()` assertions in the page suite were doubled deliberately, not loosened.** Each row
legitimately gained a link, so the counts changed. The audit confirmed every one is still an exact `toEqual` over
the full ordered list of links on the page — now also pinning each meter link's position between its row's
anomaly link and the next row. One table-suite expectation was changed from `getByText("M-109")` to a role+name
lookup plus an href assertion, which is strictly stronger.

### T4 result — consistent pagination, and a URL bug the new tests caught

`AnomalyTable` now paginates at page size 10 — the same size `ReadingsTable` already used, so the two tables finally agree —
through an optional `pagination` prop whose default follows the same rule as the sort props: an **interactive** list
(a caller passed `onSortChange`, which is `/anomalies`) pages with antd's defaults, while a **static preview** (no
`onSortChange`, which is the dashboard's fixed 5-row overview) renders every row and no paginator. `ReadingsTable`
was deliberately left unchanged: its `pagination={{ pageSize: 10 }}` is exactly the reference being reproduced, so
touching it would churn the readings page for nothing.

**The bug the new tests caught, which is the most valuable part of this task.** antd funnels pagination and sorting
through the **same** table `onChange`. The previous version reported the sort on every call, so clicking to the next
page re-reported the active ordering — and when no sorter was active it fell through to `onSortChange("backend")`,
**rewriting the URL and discarding the ordering the user had chosen**. That is the single most common interaction on
the page. The fix reports an ordering only when it genuinely changed (`nextSort !== sortKey`), and removing that
guard fails two of the new page tests.

**Count ambiguity resolved** by removing the word that caused it. The line read `Showing X of Y anomalies`, which
implied every match was visible; it now reads
`25 de 25 anomalías coinciden con los filtros.` The visible window is conveyed by antd's own paginator, which keeps
the "same antd defaults" requirement intact (`showTotal` would have broken it).

**Page stranding handled at the source.** The current page is controlled and reset during render whenever the row
count the caller passes changes, so a filter or sort that shrinks the result set cannot leave the user on page 3 of
one page, and growing it again does not resurrect an abandoned page. A mutation proved the reset load-bearing.

**Recorded risk:** the dashboard's lack of a paginator is guaranteed *structurally* (it passes no interactive
props) but **implicitly** — `src/app/dashboard/page.tsx` was outside the allowed surfaces, so it does not pass an
explicit `pagination={false}`, and a future dashboard change that started passing `onSortChange` would silently gain
a paginator. Worth making explicit when that file is next authorized.

### OPEN DEBT — the page suite is near the Jest timeout

Measured during T4: `src/app/anomalies/__tests__/page.test.tsx` runs **30 tests in ~69 s (~2.3 s per test)**, while
the equivalent `ReadingsTable` suite does 6 tests in ~2 s. The full suite went from ~15 s at `cdb610b` to ~90 s.
Jest's default per-test timeout is 5 s and `jest.config.js` sets none, so the tests now sit close enough to the limit
to flake: **one timeout failure was observed and could not be reproduced in two subsequent clean runs.**

The cause is that 31 tests each render the full page, and the page now renders an antd table *with a paginator*.
This is pre-existing debt that this task aggravated rather than introduced. It was deliberately NOT papered over with a
raised `testTimeout`, and it was NOT bundled into T4's commit: it is its own task. Left unattended, the next phase that
adds tests will turn it into a genuine red suite and the failure will be blamed on whatever code is in flight.

### T6 result — readable dates, and a module boundary that had gone wrong

Every user-facing date rendered the raw RFC3339 string. They now all go through **one** helper, `formatDateTime`.
Six field sites were fixed (`AnomalyTable.detected_at`, `AnomalyDetail.detected_at`, the correlated-event
`start – end` range, `MeterDetail.created_at`, `MeterDetail.last_reading_at`, `ReadingsTable.Timestamp`) plus the
three chart surfaces (axis tick, tooltip label, marker list / `sr-only` figcaption).

**Local time, not UTC**, and the reason is that the app's own filters already work in local days: `AnomalyFilters`
builds bounds with `dayjs(...).startOf("day")` and the readings page uses an antd `RangePicker`. Rendering UTC
would make the filtered window and the displayed hours disagree for every viewer outside UTC. Format is
`DD/MM/YYYY HH:mm`. A malformed or empty value is returned unchanged — never `Invalid Date`, never a throw.

**Both traps avoided, checked by hand.** `dashboard/page.tsx` renders `summary.lastRun`, the literal `"latest"`,
and was left alone. And the chart's axis category key is still the raw `Timestamp`: the formatters are *wrapped*
(`(value) => formatDateTime(String(value))`) rather than passed directly, because recharts hands the tick index as
the second argument and passing the helper directly would have fed that index in as `timeZone`. The
`Date.parse` marker snapping is untouched.

**A module boundary this task had to fix.** The helpers lived in `anomalyLabels.ts`, a module about anomaly
metadata. That was survivable while only anomaly components used them, but a generic date formatter made it wrong:
`MeterDetail`, `ReadingsTable` and `ReadingsChart` — none of which is about anomalies — were importing a file named
after another feature. All four presentational formatters moved to `src/components/formatters.ts`, `anomalyLabels.ts`
kept only its own metadata, and every import was repointed (nine files, including six suites). Leaving it would have
guaranteed a second date formatter the next time a chart needed one.

### T7 result — Bia's visual signature, with no invented metric

The dashboard's four plain `Statistic` cards gained the product's signature: a **delta pill** per signed signal, and a
full-width **insight banner** with the number that matters highlighted in teal. Two new components
(`KpiDeltaPill`, `InsightBanner`) with their own SCSS modules.

**The binding constraint held: every number is a DTO field or a plain count of fetched rows.** Pills were given only
to the four signed percentages the DTO actually carries (`consumption_change_pct`, `voltage_change_pct`,
`current_change_pct`, `power_factor_change_pct`), describing the leading anomaly (`anomalies[0]`, the head of the
API's ascending-priority array). The four summary KPIs got **no** pill, and correctly so: `health` is a status
string, `meters` and `anomalies` are current totals with no historical counterpart in this API, and `lastRun` is the
literal `"latest"`. A delta there would have been a **period-over-period comparison the API cannot support** — the
most tempting mistake in a task literally named "delta pills".

The banner reads `Hay 4 anomalías en la última ejecución, 1 de severidad alta.` The `4` is
`DashboardSummary.anomalies`; the `1` is a plain count of fetched rows with `severity === "HIGH"` (the established
browser-derived-count pattern, since the summary carries no breakdown). Three honest states are distinguished: a
zero total, an absent/malformed total, and the populated case.

**Verified in a real browser, not just in jsdom.** With the backend down the dashboard showed its error state, so a
minimal stand-in serving the two endpoints was used to exercise the real components:

- All four pills rendered with the right direction, and the **sign was preserved** (`-2.7%` did not become `2.7%`).
- Direction is communicated three ways, not by colour alone: an `aria-hidden` arrow, the colour, and an `sr-only`
  label ("aumento"/"descenso"). Colour-only signalling would have failed for colour-blind users.
- **WCAG AA contrast measured on composited backgrounds in both themes**: banner text 17.76 (dark) / 18.91 (light);
  the teal highlighted number 7.61 / 4.93; the red up-pill 4.83 in both; the green down-pill 6.76. All above the 4.5
  floor. The highlighted number was the one worth measuring, because `colorPrimary` had already needed darkening
  twice in earlier phases for exactly this reason.
- Zero console errors. No hex literal in either component or SCSS module — colours resolve through the `--bia-*`
  variables, which the theme toggle switches correctly.

**Corrected from the plan:** the plan claimed a code comment somewhere asserted the backend does not expose the
baseline. Re-checking before delegating showed that claim was wrong — `AnomalyDetail` already renders `baseline` and
its docstring says so. The stale claim was in this document, not in the code.

### T8 result — both advisories closed, and the first task with real RED evidence

**`R3-retry-loading-flag` closed at both sites.** `MeterList` and the anomalies page now destructure `isFetching`
and pass it as `retrying`. The distinction matters and both sites comment on it: **`isLoading` is `false` during a
manual refetch**, so gating the button on it would have left the disabled state unreachable — the advisory would
have looked fixed while changing nothing. `RequestError` was not touched; it already supported the prop. This
advisory was reported by the review lens and by the independent verifier separately, four times.

**`R3-breadcrumb-encoding` closed.** A route segment is now decoded for the label and re-encoded for the href
(`splitSegment`). The advisory had been reproduced in a real browser before delegating: `/meter/M%20109%2FA`
rendered the literal text `M%20109%2FA`, because `usePathname` returns the **encoded** pathname and the component
used it verbatim.

**The decode-failure fallback, and why it is the right one:** a malformed escape (`%ZZ`) makes `decodeURIComponent`
throw `URIError`, and the raw segment is then used for **both** label and href. Re-encoding the undecodable text
would produce `%25ZZ`, pointing the link at a *different* route than the one the browser is on; degrading to the
previous verbatim behaviour keeps the trail intact and never throws.

**First task in this phase with observed RED.** The worker ran the tests before writing the source:
`Tests: 5 failed, 51 passed` — the two disabled-state tests and the three decode tests. It also noted, correctly,
that the two malformed-escape tests **passed before the fix** (the old code rendered the raw segment) and are
therefore a guard against re-introducing an unguarded `decodeURIComponent`, not a description of new behaviour.
Three mutations were then reverted with hash verification.

**Parent re-verification in real Chrome**, because the worker honestly reported it had not driven the browser for the
malformed case:

| Path | Label | Verdict |
| --- | --- | --- |
| `/meter/M%20109%2FA` | `M 109/A` | decoded, was `M%20109%2FA` |
| `/meter/M-109` | `M-109` | unchanged |
| `/anomalies/anomaly-42` | `anomaly-42` | unchanged |
| `/meter/%ZZ` | (no trail) | no crash, no blank trail |
| `/meter/M%20109%2FA/readings` | `M 109/A` + href `/meter/M%20109%2FA` | **label decoded, href still encoded** |

The last row is the one that matters: it proves the href was re-encoded rather than the decoded label being
interpolated into the path, which would have split `M 109/A` into two route segments. No crash in any case.

## Phase 4 verification result — PASS WITH FINDINGS

The end-to-end falsification round executed every mutation the phase claimed and reproduced all of them: T2b's clear
button gate (2 tests fail when reverted), T8's `try/catch` (2 fail), T3's direction negation (**4** fail, none of them
rendered — confirming the ordering is unguardable from the DOM), and T4's `nextSort !== sortKey` guard (2 fail). It
also confirmed the corrected statement that jsdom does **not** click a disabled button, and that no DTO invention or
phase-3 regression exists.

**Three coverage gaps it found, all now closed — each one had allowed a real bug back in with the suite fully green:**

1. **The stale-closure fix had no guard.** Reintroducing the exact bug T2 called its highest-value change left the
   page suite at 33/33 green, because no test ever used the updater form. Two `useUrlState` tests now exercise it;
   re-mutating makes one fail. Worth recording precisely: the *state* assertion alone does **not** catch it (the
   internal ref carries the merged object either way) — only the serialized URL write distinguishes the two
   implementations, which is why both tests exist and why the weaker one says so in its own comment.
2. **`hasActiveFilters`' search branch had no direct guard.** Deleting it left **246 tests green**. That branch is what
   shows the "Filters are applied…" note and keeps the clear action enabled for a search-only filter. Four unit tests
   now pin it, and deleting it makes one fail.
3. **The StrictMode rule was violated on `AnomalyFilters`**, which gained two effects and three render-phase state
   updates this phase with no StrictMode coverage anywhere in `src/app/anomalies/` or `src/components/anomalies/`. The
   verifier probed it and found no live bug, but it is the exact class of gap the project rule exists for — and the
   coverage that had existed was **lost while T3 and T4 rewrote the page suite**, so it was restored rather than
   added. Two StrictMode tests now cover the restored and typed-then-cleared paths.

**Documentation defects it found, now corrected:** the per-task table listed T5 twice with identical text, the three
later rows carried no commit hash, and the T2 section still described the anomaly search as "removed" and
`AnomalyFilters.tsx` as "reverted to its `cdb610b` state" — false by phase end, since T2b re-implemented it and the
file ended among the most-changed in the phase. A superseded-by-T2b banner now marks that section as history.

**Recorded, not fixed (all pre-existing or disclosed):** a one-sided `detected_from` still parses to an active filter
behind an empty `RangePicker` (disclosed since T1); the dashboard's control-free preview remains *structurally*
guaranteed but implicit — and the T4 note promising to make it explicit "when that file is next authorized" is now
**stale, because T7 edited exactly that file without adding it**, so that follow-up is re-flagged rather than
considered done; the `useDebouncedValue` StrictMode test cannot detect double emission (React bails out of identical
state) so its name overstates what it proves; and the new paginator adds repeated jsdom `getComputedStyle` noise that
is the visible face of the T-SUITE debt.

**Not verifiable from the repository alone**, and therefore still on the parent's browser evidence only: the
`next build` output, every real-Chrome result, and the T7 contrast measurements.

## Verification plan (phase 4)

### T2 result — partially shipped, scope reduced on purpose

**What shipped:** debounced search on `/meters` (`MeterList`), the generic `useDebouncedValue` hook, and a
**real bug fix in `useUrlState`** (below). `MeterList` search filters the already-fetched id array
case-insensitively, with an honest "mostrando X de Y" count and a search-empty state distinct from the
backend-empty state.

> **Superseded by T2b — read this as history, not as current state.** The anomaly search described as removed
> below was re-implemented in T2b once the real cause turned out to be a disabled clear button rather than a state
> race, and `AnomalyFilters.tsx` is by phase end one of the most-changed files in the phase. The paragraph stands as
> the record of a wrong diagnosis, not as a description of the tree.

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
