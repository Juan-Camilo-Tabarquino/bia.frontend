# Feature: meters-cards — the meters list as clickable cards

**Status: CLOSED — implemented `cb0cec3`, recorded `9f5ef7f`, and the native review APPROVED with its authority burned (lineage `review-b78b90f368a5ca5c`).** Branch `refactor/improve-ui`, base `ff4b6b8`.

**Reference:** `odd/tasks/refactor-improve-ui.md` (the feature and its binding rules),
`odd/tasks/refactor-improve-ui-phase-4.md` (the contracts this change must not break),
`odd/tasks/refactor-improve-ui-phase-6.md` (the Spanish sweep that just closed here).

## Why

The owner's report: on the meters list, "estás usando una tabla que queda medio cortada — mejor usemos cards de
antd, más amigable, y que la card sea cliqueable."

**The premise needed correcting, and the correction is load-bearing.** `/meters` does **not** render an antd
`Table`. It renders `Listy` (`antd` 6's replacement for `List`, `MeterList.tsx:5`, rendered at `:105-113`), one row
per meter id. There are no columns, no `scroll`, no table roles. The only real `Table`s in the repository are
`AnomalyTable` and `ReadingsTable`.

The "cut off" impression does have a plausible structural cause, found while checking: the **outer** `Space` in
`MeterList` is `display: inline-flex` with no `width`, so it shrink-wraps to its content instead of filling the
1200 px `.shell-container` (`src/styles/globals.scss:29-33`). The owner confirmed the surface is `/meters` anyway.
A card grid supersedes that wrapper entirely, so the shrink-wrap is fixed by construction rather than patched.

**Not confirmable without a browser**: whether anything actually looks clipped. The code has no horizontal
overflow, no clipping rule, and no Table, so the visual complaint has no other structural explanation.

## Owner decisions (locked)

1. **Surface**: `/meters`, the meters list. Confirmed after the `Listy`-not-`Table` correction.
2. **Card content**: **id + estado + última lectura.** The owner trimmed this from the offered "id + estado +
   lecturas + última lectura", so `readings_count` is deliberately **not** shown.
3. **Branch**: the same `refactor/improve-ui`. (The alternative — a branch off `ff4b6b8`, which would have given
   this change its own in-budget review candidate — was offered and declined.)

## The data constraint this phase lives or dies by

`GET /api/meters` returns **`MeterId[]`, which is `string[]`** (`src/types/backend.ts:12`,
`apiSlice.ts:33-35`). There is **no bulk detail endpoint**. So `estado` and `última lectura` can only come from
`GET /api/meters/{id}` via `useGetMeterDetailQuery` — **one request per rendered card**, which is an N+1 the owner
accepted explicitly.

Consequences that are binding:

1. **The fetch follows the VISIBLE set, not the backend total.** The search filter already narrows the id array
   client-side before render, so a card must fetch only when it is rendered. Filtering 100 meters down to 2 must
   cost 2 requests, never 100. This is testable and must be tested.
2. `MeterDetail.name` and `.location` are **always `""` in the current backend response** (`backend.ts:130-133`), so
   the card title is the id. Do not design around a friendly name that does not exist.
3. `MeterDetail.status` is `"OK" | "DEGRADED"` and already has Spanish labels via `meterStatusLabel`
   (`src/components/formatters.ts`), which tolerates the summary's lower-case `ok` and returns an unknown status
   unchanged. Reuse it; do not write a second map.
4. `last_reading_at` is RFC3339 and must go through `formatDateTime` (`src/components/formatters.ts`), the single
   date formatter, which renders local time and returns malformed input unchanged.

## A clickable card, without lying to a screen reader

This is the part of the request that cannot be done naively. antd 6's `CardProps` extends
`React.HTMLAttributes<HTMLDivElement>` and has **no `href`**; `hoverable` only adds `cursor: pointer` and a hover
shadow — it adds no role, no focusability and no keyboard handler. So "clickable" has to be built.

**A `<div onClick>` is not acceptable, and neither is a card that swallows its own link's name.** The binding
requirements:

- The card is clickable **and** there is exactly **one** tab stop per card.
- The accessible name of each meter link stays **exactly the meter id**, which is the contract
  `accessibility.test.tsx` pins (`exposes the meter id as the accessible name of each meter link`) and the reason
  phase-4 T5 deliberately added no `aria-label`. A whole-card anchor whose name becomes
  `"M-101 Operativo 25/09/2026 07:00"` would break it, and an `aria-label={id}` on that anchor would break
  label-in-name instead, because the accessible name would no longer contain the visible text.
- The **stretched-link** pattern satisfies both: the card is a positioned container, the real `<Link>` keeps the id
  as its text, and a covering `::after` overlay makes the whole card the hit area. Focus lands on the one link, so
  the card needs `:focus-within` styling to show it.
- The link href must **`encodeURIComponent` the id**, matching the round trip the rest of the app already uses
  (`MeterDetail.tsx:72-75`, `AnomalyDetail.tsx:64-73`, `AnomalyTable.tsx:215-220`). `MeterList` is currently the
  one navigation site that does not encode.

## Contracts that must survive, verbatim

Every one of these is pinned by an existing test. A card layout must keep the copy and the semantics, not just the
feature:

| Contract | Where |
| --- | --- |
| `getByRole('link', { name: 'M-101' })` with `href='/meter/M-101'` | `MeterList.test.tsx:110,114`; `accessibility.test.tsx:159,163` |
| `getByLabelText('Buscar medidor')` | `MeterList.test.tsx:133` |
| `getByText('Mostrando 2 de 3 medidores.')` | `MeterList.test.tsx:145` |
| `'No hay medidores para mostrar.'` (backend empty, search box hidden) | `MeterList.test.tsx:93` |
| `'Ningún medidor coincide con la búsqueda.'` (filter empty, distinct) | `MeterList.test.tsx:178` |
| `role="region"` + `aria-label="Medidores"` | `MeterList.tsx:76-80` |
| exactly one `h1` `'Medidores'` per route | `accessibility.test.tsx:109` |
| `Skeleton` while loading, `RequestError` with `retrying={isFetching}` on error | `MeterList.tsx:55,60-72` |
| a `StrictMode` render of the list | `MeterList.test.tsx:186-207` |

## Rules from earlier phases

- **Spanish incremental**: every component touched is born in Spanish.
- **No hex literal outside the token module** (`src/theme/tokens.ts`); colours resolve through the `--bia-*` vars.
- **StrictMode**: every effect-bearing component needs a `StrictMode`-rendered test.
- **Mutation-test every fix**: remove the guard, show the test fails, restore byte-for-byte with a hash check. An
  assertion that cannot fail on the bug it names is false confidence.

## Deliverable and evidence

| Task | Commit | Gates | Mutation experiment | Review |
| --- | --- | --- | --- | --- |
| meters-cards | `cb0cec3` (code) · `9f5ef7f` (record) | `npx eslint .` 0 · `npx tsc --noEmit` 0 · `npx jest` **3 suites / 28 tests** (MeterCard 8, MeterList 11, accessibility 9) | 4 mutations run: the raw-status one failed 3 tests, the unencoded-href one failed with `Expected href="/meter/M-101%20%2F%20A"`, the fetch-everything one failed with `+ Received + 100`; **deleting the stretched-link overlay failed NOTHING** and is reported as browser-only rather than faked | **APPROVED, authority burned** — lineage `review-b78b90f368a5ca5c`, target `sha256:235689aa…904e`, consumed revision `sha256:56bcd220…bac`, tier `medium`, lens `review-reliability`, 8 paths / 574 changed lines, budget 200 with no correction opened. One finding, `R3-nplus1-load`, severity **WARNING** |

## Tasks

| # | Task | Status |
| --- | --- | --- |
| M1 | **`MeterCard`**: one card per meter — id as the real link (stretched-link overlay, encoded href), estado via `meterStatusLabel`, última lectura via `formatDateTime`, `hoverable`, `:focus-within`. Own loading and error presentation, since its detail request is independent of the list's. | **done** |
| M2 | **`MeterList` renders the grid**: replace the `Listy` block with a responsive card grid inside the existing `Space` structure, and make the detail fetch follow the VISIBLE set. Keep every contract in the table above. | **done** |
| M3 | **Tests**: a new `MeterCard` suite (id as the accessible name, one tab stop, the encoded href, both detail labels, its own loading/error) and the updated `MeterList` suite, including the visible-set request count. StrictMode where effects are involved. Mutation experiments for the stretched link's hit area, the encoded href, and the visible-set fetch. | **done** — 8 + 11 tests; `accessibility.test.tsx` needed **no** change, because its existing fixed `useGetMeterDetailQuery` mock already feeds every card |
| M4 | **Gates plus a real-browser look** at `/meters` with a stand-in backend: the grid fills the container, the card is clickable anywhere on its surface, Tab reaches exactly one link per card, the focus ring is visible, and no hydration warning. This is the one item that can confirm or refute the original "cortada" complaint. | **done** — see *Browser evidence* |
| M5 | **Commit and record**: work-unit commit, this file filled in, and the `docs/ui-refactor-plan.md` row. | **done** — `cb0cec3` code, `9f5ef7f` record; the review receipt is recorded below |

## Browser evidence (M4, 2026-09-27)

Measured over CDP against an isolated copy of the working tree (`next dev -p 3100`) with a 14-meter stand-in backend
(`M-101…M-112`, `M 109/A`, `M-500`), because ports 3000/3001 were already occupied by the owner's own dev server and
Go backend. Chrome 153 headless. The repository was not modified by the verification.

### The decisive item: the card really is the hit area

```
.ant-card  rect {x:64, y:304, w:276, h:128}     ← the clickable region
  <a>      rect {x:89, y:329, w:49.16, h:22}     ← the anchor, holding only the id
real click at (326, 418) → inside the card, OUTSIDE the anchor → navigated to /meter/M-101
```

This is the property jsdom provably cannot check, and it is the whole point of the request. It works.

### Tab order, focus ring, and names

- **23 focus stops on the page; exactly 14 in the grid, one per card, all `role="link"`.** Never two per card.
- Focus ring under real keyboard Tab: card `outline: 3px solid rgb(10,191,163)`, `outline-offset: 2px`. That is
`--bia-color-primary` (`#0abfa3`), so the `:focus-within` ring is the theme's primary and it is visible.
- Accessibility-tree link names: `M-101 … M-112`, `M 109/A`, `M-500` — **exactly the id**, with no estado or date
folded in, so the contract `accessibility.test.tsx` pins still holds in the real tree.

### The original complaint, refuted with numbers

| Measurement | Value |
| --- | --- |
| `.shell-container` | `clientWidth 1200`, `scrollWidth 1200`, 24 px inline padding → **1152 content** |
| grid | `display:grid`, `276px` columns, `width 1152`, **14 cards over 4 rows** |
| document | `clientWidth 1280`, `scrollWidth 1280`, `bodyScrollWidth 1280` → **no horizontal overflow** |
| clipping | every card `overflow:visible`, `scrollWidth 274 == clientWidth 274`; all ancestors equal |

The grid fills the container exactly, and the only `scrollWidth > clientWidth` element on the page is a
`.ant-breadcrumb-item` box (24 vs 20 px), unrelated to the meters list. **Nothing is cut off.**

### The rest

| Item | Measured |
| --- | --- |
| Encoded href | rendered `/meter/M%20109%2FA`; clicking it resolves and loads that meter (`ID M 109/A`) |
| Estado labels | `M-101` → `Operativo`; `M-103` (`DEGRADED`) → `Degradado` |
| Última lectura | `07/06/2025 13:45` for `2025-06-07T18:45:00Z`, matching `formatDateTime` exactly |
| A failing card | `M-500` (detail HTTP 500) renders `M-500No se pudo cargar el detalle.`; its link is still present, focusable, and a real click navigates |
| Network | first load: **14 detail requests for 14 cards**; narrowing to 2 meters issued **0** new requests |
| Hydration | 3 dev loads, **6 console messages, 0 exceptions, 0 hydration matches** |

## Advisories and limits of this phase

| ID | Severity | Where | What |
| --- | --- | --- | --- |
| `meters-hit-area-jsdom` | SUGGESTION | `MeterCard.module.scss` | The stretched-link hit area and the `:focus-within` ring are **browser-only properties**. Deleting the overlay left all 28 tests green, and no unit assertion was added to pretend otherwise. The M4 browser pass is what covers them; a future refactor of that SCSS has no unit guard. |
| `meters-visible-set-negative` | SUGGESTION | `MeterList.test.tsx` | The browser measurement of the visible-set fetch is **not fully discriminating**: the first load renders all 14 cards and fetches them all, so narrowing to 2 finds both already cached. The browser shows only that narrowing issues no spurious requests. The mutation-proven unit test (102 ids → 2 requests, 102 under mutation) is what actually pins the behaviour. |
| `no-red-first-evidence` | SUGGESTION | this phase | The implementation's tests were authored around the finished component, so no RED-first evidence exists. Falsification rests on the four mutation experiments, three of which fired. Reported as a deviation rather than presented as strict TDD. |
| `R3-nplus1-load` | **WARNING** | `src/components/MeterList.tsx:113-116` | Raised by the native review's `review-reliability` lens: one `GET /api/meters/<id>` per rendered card, because the list endpoint returns only ids and no bulk detail endpoint exists. The owner was shown this cost before the work started and accepted it, but the independent lens graded it **WARNING** rather than SUGGESTION — the highest severity any finding has carried on this branch. Non-blocking and informational: it opened no correction and does not reopen the review. The claim text was not retained (the receipt is burned), so this row records id, lens, location, severity and disposition only. **RESUELTO en `demo-polish`:** `GET /api/meters` ahora devuelve objetos con consumo y estado de cada medidor, así que `MeterCard` no hace ningún request y el N+1 deja de existir. El registro histórico de arriba se conserva tal como se escribió. |

### Two findings this phase did NOT cause, found while verifying it

Neither is fixed here: both are outside the authorised change, and on this branch every change needs its own reviewed
slice.

**`apiBaseUrl-never-inlined` — `NEXT_PUBLIC_API_URL` cannot reach the browser.**
`src/utils/apiBaseUrl.ts` reads `process?.env?.NEXT_PUBLIC_API_URL`. Next inlines a public variable only as a static
`process.env.NEXT_PUBLIC_X` reference; its own docs (`node_modules/next/dist/docs/01-app/02-guides/environment-variables.md:182-191`)
state that a dynamic lookup like `const env = process.env; env.NEXT_PUBLIC_X` is **not** inlined, and this is that shape
plus optional chaining. Proven in the emitted client bundle:`.next/static/chunks/2zp1jrsfcykn6.js` still carries the
literal `NEXT_PUBLIC_API_URL` (`let S=()=>void 0!==t.default&&t.default?.env?.NEXT_PUBLIC_API_URL?...:"http://localhost:3001/api"`).
In the browser `process` is undefined, the optional chain short-circuits, and the hardcoded fallback always wins.
**Impact: the deployed app cannot be pointed at any API other than `http://localhost:3001/api` from the client.** This is
what forced the verifier to redirect `localhost:3001` at the CDP layer to reach its stand-in.

**`meter-detail-h1-encoded` — the detail page's `h1` shows the raw route segment.** Visiting
`/meter/M%20109%2FA` renders `Medidor M%20109%2FA` while the API reports the id as `M 109/A`. Pre-existing
`useParams` behaviour, and the same class of defect the phase-4 breadcrumb fix addressed for labels.


**Known debt this change inherits, not created by it**: `T-SUITE` (~2.3 s/test against Jest's 5 s default).
