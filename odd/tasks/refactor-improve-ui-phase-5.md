# Feature: refactor/improve-ui — phase 5 (Chart)

**Status: COMPLETE — 1/1, verified.** Branch `refactor/improve-ui`, base `026794d` (phase 4 complete and pushed).

**Reference:** `odd/tasks/refactor-improve-ui.md` (the feature, its phases and the binding rules),
`docs/ui-refactor-plan.md` (the resume entry point).

## Why

Phases 0-4 gave the app an identity, a shell, honest states, deep-linkable interactivity and readable data. The
readings chart is the last surface still wearing the pre-refactor look: a single teal line, a raw axis, a default
tooltip and no legend, grid, axis unit or reference line. Bia's own product has all five.

## Scope (from the phase plan)

- **Teal series** — already true.
- **Baseline reference line** from `Anomaly.baseline.mean`.
- **Legend with swatches**, distinguishing the series, the anomaly markers and the reference line.
- **Soft grid**, **unit on the Y axis**, **themed tooltip**.

## Baseline (measured before the first write)

| Gate | Result |
| --- | --- |
| `npx eslint .` | 0 |
| `npx tsc --noEmit` | 0 |
| `npm test` | **29 suites / 254 tests** |
| `npx next build` | 0 (7 routes) |

Carried over from phase 4 and still open: **T-SUITE** (the page suite runs ~2.3 s/test against Jest's 5 s default).

## The finding that shaped this phase

A comment in `ReadingsChart.tsx` says the API exposes "no per-meter subset, **no baseline** and no delta". The
"no baseline" part is **false**: `Anomaly.baseline` carries `mean`, `stddev`, `count` and three signal means, and
`src/app/meter/[id]/readings/page.tsx` already has the anomaly in hand when it builds the chart's markers — it maps
only `id`, `detectedAt` and `label` and drops `baseline.mean` on the floor.

So the reference line the plan asks for was always available; the comment said otherwise and the mapping threw it
away. Correcting the claim is part of this phase, not a side quest.

## TRAPS — carried from earlier phases, all binding

1. **`var()` is not reliable in recharts SVG presentation attributes.** `stroke`/`fill` are parsed as SVG attribute
   grammar, not CSS, and the W3C issue is open (`svgwg#1031`). This was hit once already in phase 0+1. Chart colours
   come from the TS map (`chartColors` in `src/theme/tokens.ts`) and never from a CSS variable.
2. **The axis category key stays the raw `Timestamp`.** Marker snapping resolves each anomaly to the nearest reading
   with `Date.parse`; changing the key or the data shape moves which point a marker lands on. Only labels may change.
3. **A new data key must not collide with `ANOMALY_DATA_KEY`.** The marker series depends on `null` at non-anomaly
   points plus `connectNulls={false}`.
4. **A baseline mean belongs to consumption.** `baseline.mean` is the mean CONSUMPTION, so drawing it on a voltage or
   current axis would be a silently wrong chart. It must be shown only where it is meaningful, or explicitly
   qualified.

## Deliverable and evidence

| Task | Commit | Gates | Mutation experiment | Review |
| --- | --- | --- | --- | --- |
| Phase 5 | _(this commit)_ | eslint 0 · tsc 0 · **29 suites / 262 tests** · next build 0 (7 routes) | n/a — audited by reading the diff and by a real-browser check | parent audit: 3 traps verified on the rendered chart in both signals |

## Phase 5 result

The chart now matches Bia's product: the teal series, a **baseline reference line**, a swatch **legend**, a soft
**grid**, a **Y-axis unit** and a **token-themed tooltip**.

**The finding this phase was built around was resolved.** The old comment claiming the API exposes "no baseline" was
false, and `page.tsx` was dropping `baseline.mean` while building the chart's markers. The value is now carried on
`ReadingAnomalyMarker.baselineMean` rather than as a parallel prop, so the detection list and the chart cannot drift
apart; the stale comments in both files were corrected.

**Several anomalies on one meter draw one line per distinct DTO mean** (deduped and sorted), never an average:
each anomaly was scored against its own baseline window, so its mean is its own DTO value, and averaging would put a
number on screen that exists in no payload. Showing only the leading detection would hide the others.

**The wrong-chart trap is closed and made visible.** `baseline.mean` is mean **consumption**, so the line is drawn
only while the Consumption signal is selected. On any other signal it is withheld *and* a `role="note"` line names
the owning signal, so a consumption baseline can never be read off a voltage axis.

**A cross-boundary conflict the worker correctly refused to resolve on its own.** Adding `CartesianGrid` and
`ReferenceLine` broke four pre-existing tests in `src/components/__tests__/accessibility.test.tsx`, which owns its own
inline recharts mock and was outside the allowed surfaces. It stopped and asked instead of editing outside its
surfaces — the right call, and worth recording as such.

**The cause was worse than a missing stand-in: there were three independent inline recharts mocks**
(`accessibility.test.tsx`, `ReadingsChart.test.tsx`, `readings/page.test.tsx`), each listing its own subset of
components. That is why a new chart component silently broke one suite. Rather than patch the third copy, the mock
moved to `src/test-support/rechartsMock.ts` and all three suites now build from it, so a new chart component is added
in one place and a suite can no longer mock less than the component renders.

**Verified on the rendered chart in a real browser**, with a stand-in backend serving three anomalies with three
different baselines:

| | Consumption | Voltage |
| --- | --- | --- |
| Reference lines | **3**, at `52.16` / `80.4` / `120.9` — the exact DTO means | **0** |
| Legend | `Media de referencia: 52.16 kWh` … | no reference entries |
| Explanatory note | — | names Consumo as the owning signal |
| Series stroke | `#08DDBC` | `#08DDBC` |
| Console errors | none | none |

**The three traps were confirmed avoided** on the rendered output: no `var()` reached an SVG attribute (the stroke
is a real hex from the token map), the axis category key is still the raw `Timestamp`, and no hex literal exists in
the component or the SCSS module.

**Recorded, not resolved:** `ifOverflow="extendDomain"` means a baseline outside the visible readings extends the Y
domain instead of being discarded — intentional (the line stays visible) but a reviewer should confirm that is the
desired reading. And the Y-axis tick text does not render in headless Chrome, because `ResponsiveContainer` measures
0 there; the unit is asserted in the suite instead, including the `undefined` case for the dimensionless power
factor.

## Verification plan (phase 5)

- `npx eslint .`, `npx tsc --noEmit`, `npm test`, `npx next build` — all four.
- **Baseline truth**: the reference line appears with the DTO value for the Consumption signal, does not appear
  unqualified on another signal, and a meter with no anomalies draws no line.
- **Axis truth**: the category key is still the raw `Timestamp`.
- **Colour truth**: no hex literal outside the token module.
- **Theme truth**: the chart reads correctly in both light and dark.
- **Browser check** with the Playwright-free CDP driver used in phase 4, against `next dev` with the stand-in backend,
  in both themes, with zero console errors.
