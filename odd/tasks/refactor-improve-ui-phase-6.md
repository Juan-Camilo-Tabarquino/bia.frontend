# Feature: refactor/improve-ui — phase 6 (Spanish)

**Status: CLOSED — implementation committed as `5539905`, record as `a07a1c1`, all four gates green, and the
native review APPROVED with its authority burned (lineage `review-ea04c99651f669cf`).**
Branch `refactor/improve-ui`, base `a845fc2` (phase 5 done and pushed). The phase-6 implementation landed in
`5539905` "feat(i18n): translate the app to Spanish, and give antd its es_ES locale" (35 files, 1040 insertions,
372 deletions).

**Gates measured at `5539905`** (independent run):
`npx eslint .` 0 · `npx tsc --noEmit` 0 · `npm test -- --ci` **32 suites / 279 tests** in 51.785 s ·
`npx next build` 0 with 8 routes (5 static, 3 dynamic).

_Superseded:_ the pre-commit measurement at `a845fc2` + uncommitted phase 6 read **31 suites / 272 tests, all
passing**; `5539905` is the committed tree, so the numbers above are the ones that count.

**Reference:** `odd/tasks/refactor-improve-ui.md` (the feature and its binding rules),
`odd/tasks/refactor-improve-ui-phase-4.md` (the contracts this phase must not break).

## Why

This is the last phase of the refactor, and it closes something that has been visible in the app since phase 0+1:
**antd's own strings are still English**, and no grep of our own source can find them. A user reading a Spanish page
sees antd's `No data` inside an empty table, an English paginator, and an English date-picker panel.

The phase-4 verification confirmed the exact shape of the problem in a real browser: the paginator renders
`title="Previous Page"` / `title="Next Page"`, its buttons take their accessible name from icon `aria-label`s
`"left"` / `"right"`, and the tables print `No data` next to our own Spanish empty state.

The measured scope of our own strings, by file: `AnomalyFilters` 12, `AnomalyDetail` 11, `dashboard/page` 9,
`anomalies/page` 7, `MeterList` 4, `MeterDetail` 4, `anomalies/[id]/page` 4, `ReadingsChart` 3,
`DataQualityNotice` 3, `AiReanalysis` 2, `readings/page` 2, `SiteHeader` 1, `AnomalyTable` 1.

## The two halves, and why the locale half is the one a grep cannot do

1. **antd's locale** — `ConfigProvider locale={esES}` (verified present at `antd/locale/es_ES`) plus
   `dayjs.locale("es")` so the `DatePicker`/`RangePicker` render Spanish months and weekdays.
2. **Our own strings**, plus the four label maps that do not exist yet and are the reason raw enum values leak to
   the UI: `HIGH`/`MEDIUM`/`LOW`, `OK`/`DEGRADED`, and the missing labels for 3 of the 4 anomaly types.

## TRAPS — all verified, all binding

1. **Never translate a value that is data.** `summary.lastRun` is the literal `"latest"`; `reason`,
   `recommended_action`, `data_quality.reason`, `llm_analysis` and `correlated_events[].description` are API strings;
   `explained`/`unexplained` and the `type`/`severity` enums are wire values. Label them; do not rewrite them.
2. **Do not break the phase-4 contracts.** The count line reads `N de M anomalías coinciden con los filtros.` and was
   worded deliberately so it cannot imply every match is visible. The backend-empty vs filter-empty distinction must
   survive translation, and several phase-4 tests assert that exact wording.
3. **`dayjs.locale("es")` is a global mutation.** Set at module scope in a client module it can cause a hydration
   mismatch if any date renders on the server under a different locale. Follow the pattern the theme provider already
   uses for the client/server boundary, and if it needs an effect, that effect needs a StrictMode-rendered test.
4. **Accessible names are part of the contract.** Many tests query by name (`Buscar anomalías`, `Limpiar filtros`,
   `Clear filters`, the chart's `Readings chart:` name, the table's `Readings table:` name). Translating a name
   silently breaks either a test or a screen-reader user's experience. `sr-only` text and `aria-label`s must stay in
   step with the visible copy.
5. **`formatters.ts` pins `DD/MM/YYYY HH:mm` and its unit tests pin the local/UTC behaviour.** A translation pass does
   not change formats.
6. **The `anomalyLabels` maps are consumed by tests and by `AnomalyTypeTag`.** Adding a map means updating its
   consumers deliberately.

## Deliverable and evidence

| Task | Commit | Gates | Mutation experiment | Review |
| --- | --- | --- | --- | --- |
| Phase 6 | `5539905` (35 files, 1040 insertions / 372 deletions) | `npx eslint .` 0 · `npx tsc --noEmit` 0 · `npm test -- --ci` **32 suites / 279 tests** (51.785 s) · `npx next build` 0 (8 routes: 5 static, 3 dynamic) | C1: three mutations on the new suite, each producing its matching failure (M1 removed the `aria-label` → name assertions failed; M2 made the replacement swallow the click → the paging assertion failed; M3 dropped the arrow child → the icon assertion failed). C1b: the decisive mutation is **restoring the wrapping implementation** — the four ORIGINAL assertions still passed while all three new ones failed | **APPROVED, authority burned** — lineage `review-ea04c99651f669cf`, target `sha256:c6a8998e…d831`, consumed receipt revision `sha256:2635eb02…4391`, tier `medium`, lens `review-reliability`, 38 paths / 1681 changed lines, correction budget 200 with **no correction opened**. Three non-blocking advisories, listed below |

## Closing plan (6 tasks)

The implementation was measured green, but two of the phase's own claims have no guard and the record is stale.
Tasks are ordered; each closes with a work-unit commit.

| # | Task | Status |
| --- | --- | --- |
| C1 | **Guard the replaced paginator arrow.** `paginationLabels.tsx` had no test: nothing asserted the Spanish accessible name the `itemRender` produces, and nothing asserted that the replaced `<button>` still advances the page (every existing pagination test clicks a page NUMBER, never the arrow). **Done**: `src/components/__tests__/paginationLabels.test.tsx`, 4 tests, mutation-proven three ways (M1 removed the `aria-label` → name assertions failed; M2 made the replacement swallow the click → the paging assertion failed; M3 dropped the arrow child → the icon assertion failed). `paginationLabels.tsx` left byte-identical, sha256 `786f1296…adc97` before and after all three mutations. 3 suites / 35 tests green. | **done** |
| C1b | **Fix the defect C1's guard exposed: the replacement NESTED a button inside a button.** `itemRender`'s `element` for `prev`/`next` is already the whole `<button class="ant-pagination-item-link">` antd built, so wrapping it produced invalid HTML, a React `validateDOMNesting` error in dev, and a control still named `left`/`right`. **Done**: `renderPaginationItem` now `cloneElement`s antd's own button with `aria-label` / `title` / `type="button"` and adds no DOM level. Verified in the rendered DOM — exactly one `<button>` per control, with the `<li>` as its parent. Three new assertions added (no `button` inside a `button`, no control named `left`/`right`, and no React nesting warning via a `console.error` spy), for 7 tests in the file. The decisive mutation is **M2, restoring the wrapping implementation**: the four ORIGINAL assertions still passed under it while all three new ones failed — direct proof the old guard could not see the defect that shipped. 3 suites / 38 tests, eslint 0, tsc 0. | **done** |
| C2 | **Real-browser locale evidence.** The phase exists to fix strings invisible to grep, and `paginationLabels.tsx`'s whole premise is a browser-measured accessible name, so both belong in a real browser. **Done**: all seven items measured over CDP against `next dev` with a stand-in backend, zero console errors and zero hydration warnings across 6 routes (14 messages total, which is what makes the negative falsifiable). See *Real-browser evidence* below. | **done** |
| C3 | **Commit the phase as work units.** **Done**: the implementation landed as `5539905` with its guard test inside it, and the record as `a07a1c1`. | **done** |
| C4 | **Fill this file's deliverable table** with commit hashes, the gate numbers, the mutation result and the review outcome. | **done** |
| C5 | **Repair the record drift.** `odd/tasks/refactor-improve-ui.md:3` still read "phase 0+1 and phase 2 done, 4 phases left" and its phase table marked 4, 5 and 6 `todo`; `docs/ui-refactor-plan.md` still said "Fases pendientes 4, 5, 6", "24 suites / 155 tests", "4 recibos", and listed advisories that are already fixed (at least `R3-retry-loading-flag`). Replacing a phase does not update the text that described it. **Done** in `a07a1c1`: both documents now describe the branch as it is, the phase-4 and phase-5 scope is kept under a history heading rather than deleted, and the plan's receipt claim was narrowed to what the documents can actually support. | **done** |
| C6 | **Native review** of the candidate. **Done and APPROVED** — see *The review, and the one obstacle it hit* below. The push is done too: `origin/refactor/improve-ui` is at `a07a1c1`. | **done** |

## The review, and the one obstacle it hit

The first `START` **failed with no authority created**: `lens_context_budget_exceeded` over the candidate the
provider derives by default, which is the WHOLE branch — 86 paths, phases 3 through 6 accumulated against `main`.
Nothing had to be abandoned or repaired (`mutation_outcome: not_started`), and retrying that exact candidate
cannot succeed. The fix was to review the phase as its own work unit, with `baseRef` on phase 5's tip
(`a845fc24dff084761081cdab024c00f3ecda721d`) and `committedOnly: true`, which cut the candidate to 38 paths and
let `START` create the lineage.

**That is the durable finding, and it is about the merge, not about phase 6:** the branch cannot be reviewed as
one candidate. `main` → `refactor/improve-ui` now exceeds the reviewer lens context budget, so whichever phases
land next will each need their own reviewed slice, and a single review of the whole accumulation is not available.

Two configuration facts learned the hard way, both now fixed and neither about this repository:

- The lens's model comes from `~/.pi/gentle-ai/models.json` keyed by the lens's routing key (`review-<lens>`), and
there is **no ambient model fallback** by design. No entry existed for any lens, so the first relay refusal was
`reviewer-config-invalid`, not a candidate problem. The keys are the four lenses plus two host-mediated role keys,
`review-refuter` and `review-validator`.
- The `~/.pi/agent/subagents.json` model profiles are a DIFFERENT store: they are `effort`-shaped, while the
routing config is `thinking`-shaped, and the review lane reads the latter.

Also kept out of every candidate, locally: the session export `docs/01a0decd-bia-frontend-2026-09-26.jsonl` was
added to `.git/info/exclude` (local-only, never committed) so it stops appearing in the untracked inventory that
the review's selection step walks.

**Carried debt, not part of this phase:** `T-SUITE` (~2.3 s/test against Jest's 5 s default; one flaky timeout
observed once in phase 4). The clean 272/272 run in 54.46 s neither confirmed nor refuted it — the flakiness stays
unverified, not resolved.

**Out of scope, deliberately:** the untracked session export `docs/01a0decd-bia-frontend-2026-09-26.jsonl` is not
part of this deliverable and is left untracked.

## Real-browser evidence (C2, 2026-09-27)

Measured over CDP against `npm run dev` with a stand-in backend on port 3001 (25 anomalies, a meter whose
readings endpoint returns `null`, and `M-101` with readings). Chrome 153 headless. The repository was not modified.
Accessible names were read from the **accessibility tree** (`Accessibility.getFullAXTree`), not from the `aria-label`
attribute we set — reading our own attribute back would prove nothing.

### The paginator, which is what the new file exists for

```
.ant-pagination-prev      .ant-pagination-next
  listitem  "Página anterior"    listitem  "Página siguiente"
    button  "Página anterior"      button  "Página siguiente"
      image   "left"                 image   "right"
```

- **No `role=button` named `left`/`right` exists.** The only nodes named `left`/`right` are `role=image`, which is
antd's own baseline structure inside its own button.
- The `<li>` and the button carry the **same** Spanish name, and exactly one `<button>` sits inside each `<li>` — the
nesting the C1 guard found is gone in the real DOM.
- **The arrow really pages**: active page item `1` → `2` after a real click on next → `1` after prev.

### The rest

| Item | Measured |
| --- | --- |
| `No hay datos` | `/meter/M-EMPTY/readings`, 0 rows: table placeholder and `.ant-empty-description` both read `No hay datos` |
| `DatePicker` panel | `/meter/M-101/readings`, panel opened with a real click: header `Sep2026`, buttons `["Sep","2026","Oct","2026"]`, weekdays `["Lun","Mar","Mié","Jue","Vie","Sáb","Dom",…]`. This is the item jsdom provably cannot show |
| Hydration | 6 routes, **14 messages, 0 errors, 0 warnings, 0 exceptions, 0 hydration-pattern matches** |
| Data truth | First row: `REAL_ANOMALY \| Anomalía real`, `HIGH \| Alta` — raw wire values intact next to the labels. Dashboard `lastRun` = **`latest`** verbatim, not translated; `health` = `Operativo` |
| Contract truth | Unfiltered `25 de 25 anomalías coinciden con los filtros.`; with `?severity=HIGH`, **`9 de 25 …`** and exactly **9** rendered rows |

**Left unmeasured, stated rather than inferred**: whether the button's `title` and the bare `<li>`'s English `title`
produce two competing hover tooltips was not tested (no hover was dispatched), and chart tick rendering was out of
scope because `ResponsiveContainer` measures 0 in headless.

## Defect log — found by the C1 guard, 2026-09-27

**The phase's own fix introduced invalid HTML.** `renderPaginationItem` wraps antd's element in a NEW `<button>`,
but for `type === "prev" | "next"` that element **is already** the complete
`<button class="ant-pagination-item-link" tabIndex={-1}>` antd built — the file's own comment says so. Rendered
DOM, measured:

```html
<li title="Previous Page" tabindex="0">
  <button class="ant-pagination-item-link" aria-label="Página anterior" tabindex="-1">
    <button class="ant-pagination-item-link" tabindex="-1">
      <span role="img" aria-label="left">…</span>
    </button>
  </button>
</li>
```

Three consequences, all measured or read directly from that tree:

1. **Invalid HTML.** `<button>` cannot descend from `<button>`. React emits a `validateDOMNesting` console error in
dev — the C1 suite observed it.
2. **The defect it exists to remove is still there.** The nested original button keeps the icon's `left`/`right`
accessible name, so `queryByRole("button", { name: "left" })` still resolves. The fix renames the WRAPPER, not the
control it was worried about.
3. **The C1 guard could not catch this.** Its assertions target the element `itemRender` owns, so they pass with the
nesting present. A guard that cannot fail on the defect in the same file is the phase-4 pattern again.

The narrower fix is to override the original element's attributes rather than wrap it, so the DOM gains no level.
`<span role="img" aria-label="left">` is antd's own baseline structure inside its button — it exists with or
without `itemRender` — so it is not a regression this phase introduces and is not part of this defect.

**Resolved** by C1b. Two limitations C1b could not close, both handed to C2 (the real-browser task) rather than
smoothed over:

- The `console.error` nesting spy is **order-coupled**: React reports `validateDOMNesting` once per
  `(child, ancestor)` pair for the life of its module registry, so that test must stay the first paginator render in
  the file or the spy goes silently vacuous. The DOM assertions still fail on the defect regardless of order.
- Whether the button's `title` and the bare `<li>`'s English `title` produce two competing tooltips, and whether the
  `<span role="img" aria-label="left">` is really reached as an image rather than a control, are both derived from
  role arithmetic in jsdom. Only a browser accessibility tree settles them.

## Open advisories from phase 6

| ID | Severity | Where | What |
| --- | --- | --- | --- |
| `status-column-raw-value` | SUGGESTION | `AnomalyTable.tsx:262-265` | The **Estado** column renders the label ALONE (`Sin explicación`), while the two neighbouring enum columns render the raw wire value next to the label (`HIGH \| Alta`, `REAL_ANOMALY \| Anomalía real`) and the detail page renders `Sin explicación (unexplained)`. A reader cross-referencing the API payload cannot see `explained`/`unexplained` in the list. **Pre-existing behaviour phase 6 did not introduce** — phase 6 changed only the column's `title`. Not changed here because it is a user-visible UI decision on a surface under evaluation; the `anomalyLabels.ts` header comment was corrected instead, since it claimed "both halves are required" for a render site that does not do that. |
| `pagination-nesting-spy-order` | SUGGESTION | `__tests__/paginationLabels.test.tsx` | The `console.error` nesting spy is **order-coupled**: React reports `validateDOMNesting` once per `(child, ancestor)` pair for the life of its module registry, so that test must stay the first paginator render in the file or the spy goes silently vacuous. The DOM assertions still fail on the defect regardless of order. |
| `pagination-two-tooltips` | SUGGESTION | `paginationLabels.tsx` | The cloned button now carries `title="Página anterior"` while the `<li>` carries antd's own title. Under `locale={esES}` both are the same Spanish string, but a no-locale render would have two competing tooltips. Never measured with a real hover. |
| `R3-dashboard-health-raw-value` | SUGGESTION | `src/app/dashboard/page.tsx:195` | Raised by the native review's `review-reliability` lens against this candidate. Non-blocking and informational: the review states none of its findings opened a correction and none reopens the review. **The claim text is not retained anywhere readable** — the receipt is burned and the terminal-consumption record keeps only repository, target and lineage hashes — so this row carries exactly the id, lens, location, severity and disposition that the acknowledgement did, and nothing paraphrased from them. |
| `R3-detail-severity-label` | SUGGESTION | `src/components/anomalies/__tests__/anomalyLabels.test.tsx:71-84` | Same provenance and the same limitation as the row above: `review-reliability`, informational, claim text not retained. The location is in the label-map suite's render-site assertions. |
| `R3-pagination-wiring` | SUGGESTION | `src/components/__tests__/paginationLabels.test.tsx:35-41` | Same provenance and the same limitation: `review-reliability`, informational, claim text not retained. The location is the suite's structural locator for the replaced control — the helper that finds it by CSS path instead of by the name under test, which is the same tension the `pagination-nesting-spy-order` row above describes from the mutation side. |

## Verification plan (phase 6)

- `npx eslint .`, `npx tsc --noEmit`, `npm test`, `npx next build` — all four.
- **Locale truth**, verified in a real browser because jsdom cannot show it: the paginator's `title`s are Spanish,
  the empty-table text is Spanish, and the `DatePicker` panel shows Spanish months. This is the one item the phase
  exists for and it is invisible to a unit test.
- **Data truth**: no API-provided value was rewritten — the enums, `status`, `lastRun` and the narrative strings
  still render their wire values.
- **Contract truth**: the count wording and the empty-state distinction still hold, and every accessible name still
  resolves.
- **Hydration truth**: no mismatch warning in a real browser in dev, where React logs them.
