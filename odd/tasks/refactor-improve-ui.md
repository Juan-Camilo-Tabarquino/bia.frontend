# Feature: refactor/improve-ui — Bia visual identity, dark theme, Spanish, modern UX

**Status: COMPLETE — phases 0+1, 2, 3, 4, 5 and 6 done and pushed; phase 6 implementation `5539905`, record `a07a1c1`, native review APPROVED with its authority burned. What remains is the merge decision to `main`, which belongs to the owner.** Branch `refactor/improve-ui`, base `ab85e7e8` (which is `main` = `origin/main`).

**Reference:** the read-only audit of this branch (three explorations + parent verification),
`odd/tasks/u1-ordering-confirmed.md`, and the Bia brand research (Engram
`bia-frontend/brand-identity-bia-app`).

## Why

The owner wants the UI to read as a **modern application** — appearance, not only function — for a
**technical test being evaluated by Bia**. So Bia's own product is the design reference, and the
identity was extracted from their live assets rather than invented (see *Brand* below).

Current state, measured **before phase 0+1** (kept as history — it is the pre-refactor baseline, not today's
state): **no antd theming at all** (runs on defaults), **0 of 201 UI strings in
Spanish**, **0 media queries**, **0 uses of `refetch`/`isFetching`/`Skeleton`/toasts**, a hand-rolled
`<header>` with a v4-era navy, two competing primaries, six different error presentations, and `/` and
`/meters` rendering the same meter list under the same `h1`.

## Brand (extracted, with provenance — do not invent colors)

| Role | Value | Provenance |
| --- | --- | --- |
| Brand teal | `#08ddbc` → `#17ffdb` | exact, from an inline style block on bia.app |
| Border | `#27272a` | exact, Tailwind class in bia.app HTML |
| Muted text | `#a1a1aa` | exact, Tailwind class in bia.app HTML |
| Success | `#10b981` | exact, Tailwind class in bia.app HTML |
| Info/cyan accent | `#06b6d4` | exact, Tailwind class in bia.app HTML |
| Dark bg / card surface | ~`#0B0F11` / ~`#151B1D` | perceptual read of their product screenshots |
| Reference/average line | violet dashed ~`#8B5CF6` | perceptual read of their product screenshots |
| UI font | **Inter** | exact: their landing loads `family=Inter:wght@300..700` |

Their product IA, from the same screenshots: an icon rail with brand at top, a **"Pregúntale a IA"**
prompt entry with a sparkle icon, nav items **with icons and badge counters**, an expandable **"Análisis"**
section, active item as a rounded pill, a top bar with `‹ ›` history arrows and a **breadcrumb carrying
inline dropdown filters**, KPI cards with **green/red delta pills**, charts with a **legend of swatches,
a dashed violet average line, a faint grid and a `kWh` axis label**, and a full-width insight banner with
the number highlighted in teal.

Brand posture, from their own founder: *"we decided Bia would look and operate like a large, institutional
energy company — not a hype startup."* → **institutional and clear, never playful**.

## Owner decisions (locked)

1. **Collapse to 3 destinations**, with `/meters` as the app's entry point.
2. **Dark by default, with a light toggle.**
3. **Teal as proposed**, including a deeper teal for light mode (see the contrast note below).
4. **Toast only** for backend health — a notification on start, and a notification when a request fails.
   **No persistent status chip** in the shell: keep the UI clean. **No 30-second polling.**
5. **Phase by phase**, with a commit and a review per phase before moving on.
6. **Inter** (the evidenced font). Changeable later if the result does not convince.
7. **`@ant-design/icons` may be added** as an explicit dependency. **Free antd components only** — nothing
   from a paid tier.

### The contrast decision worth remembering

`#08ddbc` on white is **~1.6:1** — unreadable as text. So the primary is per-mode:
`#08DDBC` in dark, **`#0D9488`** in light. The bright teal stays for dark accents and chart series.

## Phases

| Phase | Scope | Status |
| --- | --- | --- |
| **0+1** | **IA + foundation**: `/` redirects to `/meters`; nav collapses to 3 Spanish destinations; `ConfigProvider` with the teal tokens; dark default + light toggle; Inter via `next/font`; brand mark in the shell; `reset.css` moved to the root layout; spacing/radius scale; SCSS colors read from antd CSS variables | **done** |
| 2 | **Shell**: breadcrumb trail derived from the pathname, and the anomaly-count badge on the Anomalías entry fed by the shared summary cache. The footer landed in phase 0+1, and the **inline filters inside the breadcrumb belong to phase 4** (deep-linked filters), not here | **done** |
| 3 | **States**: one error vocabulary with retry, `Skeleton`, empty states, `isFetching` refetch indicators, toasts, and clearing the deprecated `Spin tip` + `Descriptions children` usages | **done** |
| 4 | **Interactivity**: search, header sorting, consistent pagination, deep-linked filters, cross-links, readable dates, KPI delta pills, insight banner | **done** — `62dceaa` … `026794d` (T1–T8 + the phase verification; records `64c069b`, `1147bc7`, `d3f5ca1`) |
| 5 | **Chart**: teal series, baseline reference line from `Anomaly.baseline.mean`, legend, grid, axis unit, themed tooltip | **done** — `a845fc2` (code and record in one commit) |
| 6 | **Spanish**: ~200 strings, `locale={esES}` + `dayjs/locale/es`, the four missing label maps, locale date/number formatting, `lang="es"` | **done** — implementation `5539905` (35 files, 1040/372), record `a07a1c1`, native review APPROVED (lineage `review-ea04c99651f669cf`), authority burned |

**Why 0 and 1 ship together:** they touch the same four files (`providers.tsx`, `layout.tsx`,
`globals.scss`, `page.tsx`). Splitting them would rewrite those files twice for no reader benefit.

## Phase 0+1 result

Implemented and verified. `lint` 0, `tsc --noEmit` 0, **20 suites / 124 tests** (was 18/118; the two new
suites cover the token layer), `next build` 0 with 7 routes and `/` prerendered as a static redirect to
`/meters`.

**Shipped:** the token module and theme provider, `ConfigProvider` with `cssVar: { prefix: "bia" }`, dark by
default with a persisted light toggle, Inter via `next/font`, `<html lang="es">`, Spanish metadata, a real
`Layout.Header/Content/Footer` shell with a brand mark and a 1200 px container, navigation collapsed to
three Spanish destinations with icons and `aria-current`, `/` redirecting to `/meters`, every colour literal
swept onto antd CSS variables, and `reset.css` moved to the root layout. `src/styles/variables.scss` was
deleted (it held one variable that only fed the focus ring).

### The regression this phase would have shipped, and its fix

With antd's CSS-in-JS injected only at runtime and no SSR extraction, the server sent **antd markup with no
antd stylesheet**: measured **0 `<style>` blocks** in the prerendered HTML and **0 `.ant-` rules** in all three
emitted CSS chunks, which also left the `--bia-*` variables undefined and silently dropped the `body`
background declaration. The first paint was therefore unstyled.

`@ant-design/nextjs-registry` (the official MIT package for App Router) fixes it: after the change the
prerendered pages carry **139+ `.ant-` rules** and **define** `--bia-color-primary` and `--bia-color-bg-base`.
The no-new-dependency alternative was tested and rejected: antd 6's `zeroRuntime` needs
`antd/dist/antd.css`, which hardcodes the `ant` prefix across 7,273 `var()` references without defining the
variables, and weighs 1 MB — it conflicts with our `bia` prefix and with the toggle.

### Independent verification, and what it changed

One verification round ran. Verdict: **PASS on every substantive gate**, one hygiene blocker (the deletion
was staged by `git rm`, and everything is staged at commit time anyway) and seven findings. The four that
mattered were fixed:

- **`var()` inside SVG presentation attributes** (the chart's `stroke`/`fill`). SVG2 still parses those as
  attribute grammar rather than CSS declarations, so substitution is not guaranteed, and the W3C issue is
  open (`svgwg#1031`, raised 2025-11). The chart now takes real values per mode from `chartColors` in the
  token module. This was introduced by this phase's own colour sweep.
- **Light-mode contrast.** `#0D9488` on white is only ~3.7:1, below the 4.5:1 WCAG AA floor for normal text —
  and antd uses `colorPrimary` for links. The light primary is now `#0F766E` at ~5.5:1.
- **A dead mock** of `getHealth` in `accessibility.test.tsx`, left behind by the IA change.
- **An imprecise comment** justifying the `!important` in `AnomalyTable.module.scss`: antd 6 expresses row
  hover through `.ant-table-cell-row-hover`, not a `:hover` selector. The `!important` itself is genuinely
  required — verified against antd's own selector weight.

Verification also confirmed two things worth keeping: the `.ant-layout-header` navy override is **necessary**
(antd really does emit `headerBg: #001529`), and the shell module out-specifies it **without** `!important`.

### Declared interim gap

**Phase 0+1 removes the last backend health indicator from the app.** `HealthStatus` is no longer mounted
anywhere, because `/` is now a redirect and the component's `Result` banner was the thing that made `/` a
near-duplicate of `/meters`. Backend health returns as a **start-up toast** in phase 3, per the owner's
decision. Until then the app reports nothing about backend availability. Also noted: a user whose stored
preference is `light` sees dark until hydration, which is the accepted cost of dark-by-default without a
pre-hydration script.

## Phase 2 result

Implemented and verified. `lint` 0, `tsc --noEmit` 0, **22 suites / 138 tests**, `next build` 0 with the same 7
routes.

**Shipped:** a Spanish breadcrumb trail derived from the pathname (`SiteBreadcrumb.tsx`), rendered by the
shell between the header and the content; an anomaly-count **badge** on the Anomalías entry; and the shell's
four inline layout styles moved into `SiteShell.module.scss`.

### Accessibility, which is where this phase earned its keep

- **antd 6 does not emit `aria-current` on the last breadcrumb item** (verified by grepping antd's own source
  for `aria-current`: zero matches), so the component sets it explicitly. The verification confirmed the
  necessity rather than accepting it.
- **The badge count is announced without renaming its destination.** The badge sits inside the already
  `aria-hidden` icon wrapper, and the count reaches assistive technology through an `aria-describedby`
  pointing at an `sr-only` span **outside** the link. Result: the accessible name stays exactly
  "Anomalías" while the count is still announced. Verified in the tests and in the emitted markup.
- `aria-label` is not part of `BreadcrumbProps`, and antd spreads unknown props onto its root `<nav>`; the
  component passes it through a typed `AriaAttributes` spread with **no cast**.

### What verification changed

The round returned **ready to commit** with no blocking defect, and then four test-quality findings were
fixed:

1. **Two assertions were vacuous.** The loading and error tests mocked the hook with `data: undefined`, so
   deleting the `!isLoading` / `!error` guards would have left them green. They now supply a **positive stale
   payload** — the real-world case the guard exists for, because RTK Query keeps the last successful `data`
   while a refetch is in flight or after it fails. A **mutation experiment** proved the fix: weakening the
   guard to `typeof summary?.anomalies === "number"` makes exactly those two tests fail, and the production
   file was restored byte-for-byte afterwards (sha256 checked).
2. The zero-count assertion relied on `queryByText("0")`, which passes even for a `>= 0` gate because antd
   hides `count={0}`; it now asserts the badge element and the `aria-describedby` are absent.
3. The nav's `aria-current` had **no** automated coverage — the accessibility suite renders pages, not the
   shell. Now covered for `/anomalies` and `/meters`.
4. **The Jest ESM trap was fixed at the cause instead of stubbed.** Phase 1's icon import reaches
   `@ant-design/colors/es/generate` (ESM) through an icon CJS entry that `require()`s the `/es/` path, which
   Jest cannot transform on Node 22. The first pass worked around it with a five-component
   `jest.mock("@ant-design/icons", …)` — all-or-nothing, so any future test importing a *different* icon
   would receive `undefined`. `jest.config.js` now allowlists `@ant-design/colors` and
   `@ant-design/fast-color`, and the tests exercise the **real** icon components.

### Deliberate tradeoffs worth knowing

- The shell issues one `GET /dashboard/summary` request **per session**, not per route: the layout never
  unmounts, so the cache entry is never evicted and `/dashboard` reuses it. A cold landing on `/anomalies`
  does issue that one request for the badge. The shell stays silent while the request is in flight or failed
  — it never shows a stale or fake count — and the page that owns the data reports its own errors.
- **That count is never invalidated**, because `apiSlice` declares no `tagTypes`/`providesTags`. It can be
  stale for the whole session, which is consistent with the owner's "no polling" decision but is a real
  limitation rather than an accident.
- A malformed path renders **no** breadcrumb rather than a misleading one (`/meters/extra`,
  `/meter/M-109/something-else`).

## Phase 0+1 verification plan (as originally written)

- `npm run lint`, `npx tsc --noEmit`, `npm test` all green (the suite is 18 suites / 118 tests, and it
  asserts accessibility behaviour — `accessibility.test.tsx` pins the `h1` rules, so the nav/heading
  changes must keep exactly one `h1` per route).
- The app builds: `next build` is worth running for this phase, because the theme provider, the font and
  the redirect are all build-visible changes.
- The 201-string inventory is not touched in this phase, except for the nav labels and the metadata.
- Route truth: `/` redirects to `/meters`; the three destinations exist and the removed ones do not
  appear in the nav.
- Theme truth: dark by default, the toggle flips to light, and **no colour literal survives in a SCSS
  module** — they must read from tokens so the toggle is not a lie.

## Phase 3 result

Implemented and verified. `lint` 0, `tsc --noEmit` 0, **24 suites / 155 tests**, `next build` 0 (7 app
routes). Commit `4820b93f` (25 files, 930 insertions / 349 deletions).

**Shipped:** `RequestError` (an antd `Alert` plus a "Reintentar" button wired to each query's `refetch`)
replaces all six ad-hoc error presentations, and `MeterDetail` now has a dedicated 404 state instead of a
generic error. `BackendStatus` calls `getHealth()` once and notifies success or failure — no polling, no
chip, no request on route change — and `HealthStatus.tsx` is deleted as dead code. `Skeleton` where the
content shape is known, `Empty` where a blank region used to be, and `"Actualizando…"` so a readings refetch
is visible without blanking the previous chart and table. `Spin tip` → `description` and `Descriptions`
`children` → `items` across five blocks, with the rendered rows unchanged. State copy is Spanish; untouched
copy stays English for an incremental language sweep.

**Browser verification** (the parent, real Chromium against the dev server): exactly **one** notification and
exactly **one** `GET /health` on load, still one after client-side navigation to two other routes, one again
after a reload, and **zero console errors** — the deprecated `Spin tip` warning is gone too. Also observed
there: `Medidor no encontrado` for an unknown meter (with no retry button, correctly — a 404 is not a
retryable failure), `No hay lecturas en el rango seleccionado.` for empty readings, and 12 rows on the meter
list. That check also surfaced antd's own untranslated `No data` sitting next to our Spanish empty state,
which is exactly what phase 6's `ConfigProvider locale={esES}` has to fix.

**Mutation experiment**: removing the `useRef` guard from `BackendStatus` makes the fire-once test fail with
`Expected calls: 1 / Received: 2`, after which the file was restored byte-for-byte with hash confirmation.

### A correction this phase forced

I had told the owner that antd's `Spin tip` "never renders without children" and that the loading text
therefore never appeared. **That was false.** antd 6.6.5 computes `mergedDescription = description ?? tip` and
renders it whenever the indicator shows (`node_modules/antd/es/spin/index.js:66,103-109,132`), and a test at
the previous HEAD asserted the text was visible. The misleading source was antd's own **stale JSDoc**
("Customize description content when Spin has children"), which still sits above the deprecated prop. Only the
**deprecation** was real, so the migration stands on that alone. The lesson: I verified the `.d.ts` comment
and mistook it for the implementation.

### Non-blocking findings from the phase-3 verification

`retrying` is not passed in `MeterList` and on the anomalies page, so those two retry buttons never show
their disabled state (the lens and the independent verifier found this separately); the `ReadingsTable`
skeleton is a paragraph for a six-column table; the sibling 404s disagree in language; and two defensible
error presentations survive outside the unified vocabulary. All recorded in
`bia-frontend/refactor-improve-ui/review-advisories`.

## Anti-scope

- No new UI library, no Tailwind, no CSS-in-JS. antd 6 with tokens is already paid for.
- No i18n library.
- No changes to `src/features/**` (the three RTK Query slices are correct and their contract is verified).
- No server-side pagination: the backend accepts no query parameters on `/anomalies`.
- Nothing from a paid antd tier.
- Do not retranslate or restructure what a later phase will rewrite anyway.

## Decisions

- **Their product is the reference, not a style trend.** Every color above has a provenance line; nothing
  is invented from taste.
- **One source of truth for color.** The palette lives in one module that feeds `ConfigProvider`, and the
  SCSS modules read antd's CSS variables instead of re-typing hexes — which is what made the current app
  show two different blues on one screen.
- **The light theme is not optional.** It is the proof that the token layer is real rather than a dark
  coat of paint, which is why the toggle ships in the foundation phase.
- **Phase by phase, reviewed.** No phase starts before the previous one is verified and committed.
