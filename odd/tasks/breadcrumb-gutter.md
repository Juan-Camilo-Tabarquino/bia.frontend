# Feature: breadcrumb-gutter — one content edge for every route

**Status: DONE and verified — all six tasks complete, browser-verified on six routes at two viewports, and the owner confirmed it visually.** Branch `refactor/improve-ui`, base `c2064fa`.

**Review: deliberately NOT run — owner decision.** The owner reviewed the result in their own browser and declined the
native review slice for this candidate ("dejémoslo como está, no más corridas"). This is a recorded disposition, not an
oversight: the candidate `baseRef = c2064fa` stays **unreviewed on purpose**, so a later session does not need to
re-litigate it. What this candidate therefore does NOT have, and what the other two post-refactor changes do have: a
native review receipt. Phase 6 and `meters-cards` each carry one.

**Reference:** `odd/tasks/refactor-improve-ui.md`, `odd/tasks/refactor-improve-ui-phase-4.md` (the contracts),
`odd/tasks/meters-cards.md` (the change that closed right before this one).

## Why

The owner reported: *"el breadcrumb está pegado a la izquierda de la pantalla, déjale la margen igual al resto de
contenedores de las páginas. Por ejemplo en las lecturas de un meter lo ideal es que el breadcrumb esté encima del
título."*

**Two of the three premises were wrong, and measuring them is what produced the fix.** Reported before any code was
written:

1. **The breadcrumb is NOT outside the padded container.** The antd `<Breadcrumb>` carries the shared
   `shell-container` class itself (`SiteBreadcrumb.tsx:136`).
2. **It is ALREADY above the title on `/meter/[id]/readings`.** Measured in the real DOM:
   `nav.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING` is truthy on all five routes. The shell
   renders `<SiteBreadcrumb />` at `SiteShell.tsx:27` and `<Content>` at `:28`, and the page's `h1` is inside
   `Content`. **There is nothing to reorder**, so that half of the request is zero change.
3. **The complaint itself was real**, and it had two independent causes.

## The measured evidence (owner's own dev server, 1440×900, read-only)

### E1 — the actual bug: antd's reset wins a specificity tie by source order

```
nav.ant-breadcrumb   padding-inline: 0px   margin-inline: 0px   width: 1200px   rect.left: 0
breadcrumb text x: 0        header inner content edge: 144        main content edge: 144
```

CDP `CSS.getMatchedStylesForNode` on the nav, in cascade order:

```
[3] .shell-container              width:100%; max-width:1200px; margin-inline:auto; padding-inline:1.5rem
[6] :where(...).ant-breadcrumb    box-sizing:border-box; margin:0; padding:0; ...
```

`:where()` contributes zero specificity, so both selectors are `(0,1,0)` and **source order decides**. The antd
reset lives in the inline `<style id="antd-cssinjs">` (document index 3), **after** the Next global CSS chunk
(index 1) that holds `.shell-container`. So the reset nullifies the gutter AND `margin-inline:auto`, leaving the nav
left-anchored at x=0. `max-width` survives only because antd never sets it.

**Why the header does not have this bug**: it puts `shell-container` on a plain `<div>` of its own
(`SiteHeader.tsx`), and `main.ant-layout-content` does not reset padding. The breadcrumb is the only place the shared
class sits **on an antd component** — which is exactly the tie.

**The fix is therefore structural, not a specificity escalation.** Moving the gutter onto a wrapper element removes
the tie instead of winning it, so it cannot be lost again the next time a stylesheet moves. Adding `!important` or a
descendant selector would leave the fragile pattern in place.

### E2 — a second, independent cause: two different content edges

| Route | `h1` text x | Δ from the container content edge (144) | page adds `padding:"1rem"`? |
| --- | --- | --- | --- |
| `/meters` | 144.00 | **0** | no |
| `/meter/M-101` | 144.00 | **0** | no |
| `/dashboard` | 160.00 | **+16** | yes |
| `/anomalies` | 160.00 | **+16** | yes |
| `/meter/M-101/readings` | 160.00 | **+16** | yes |

So "el resto de contenedores" is not one thing but two, and fixing E1 alone would still leave the title 16 px right
of the breadcrumb on four of six routes.

### What the measurement did NOT cover

- Production cascade order is **unverified**; only the dev-mode `antd-cssinjs` inline sheet was audited. The
  `:where(...).ant-breadcrumb` reset is generated identically, so the tie is expected to persist, and the structural
  fix is order-independent either way.
- Below the 1200 px breakpoint, where `margin-inline:auto` collapses to 0 anyway: **not measured**.

## Owner decision (locked)

**One content edge at 144 on every route.** The owner chose to stop duplicating the gutter in the four pages rather
than to add the missing inset to the other two. Consequence accepted: the content of those four routes moves **16 px
to the left**. The vertical rhythm must NOT change, so the fix is to keep the vertical padding and drop only the
horizontal part — never to delete the padding outright.

## Tasks

| # | Task | Status |
| --- | --- | --- |
| B1 | **E1**: take `shell-container` off the antd `<Breadcrumb>` and put it on a wrapper element around it. No specificity escalation, no `!important`. | **done** — the wrapper carries `shell-container`; the nav carries nothing. Regression guard added (M1 fails it) |
| B2 | **E2**: in the four pages that add `padding: "1rem"`, keep the vertical padding and drop only the horizontal duplication. | **done** — `paddingBlock: "1rem"` on `/dashboard`, `/anomalies` (both wrappers), `/anomalies/[id]` and the readings `Row` |
| B3 | **Guard and gates**: a unit assertion that the gutter class is on a wrapper and NOT on antd's component. | **done** — 83 tests across the five affected suites, `eslint` 0, `tsc` 0. jsdom cannot see the alignment: mutation M3 (a wrapper gutter that does not match the container) left every test green |
| B4 | **Re-measure the routes in the browser.** | **done** — six routes at 1440 and two at 768; breadcrumb text and `h1` both at **144**, one shared edge at **24** when narrow |
| B5 | **D5 — the dead `margin-top`.** The first re-measure found `nav.ant-breadcrumb` computing `margin: 0px`, so `.breadcrumb { margin-top: 1rem }` had **never** applied: the same tie, this time for the `margin` shorthand, and the breadcrumb sat 2 px from the header. The owner chose to restore the intended separation by moving it to the wrapper. | **done** — `.breadcrumb` renamed `.wrapper`, applied to the wrapper; the nav has no class of its own. RED-first evidence captured this time (`Expected the element to have class: wrapper` / `Received: shell-container`), then 15/15 |
| B6 | **Re-measure and judge the falsifiable prediction.** | **done** — all six predictions CONFIRMED, see below |

## Browser evidence (B4 + B6)

Measured on the owner's own `next dev` at `http://localhost:3000` (the working tree, confirmed by the served class
attribute), Chrome 153 headless.

### The alignment (B4): six routes, one edge

On `/meters`, `/dashboard`, `/anomalies`, `/meter/<id>`, `/meter/<id>/readings` and `/anomalies/<id>`: the wrapper is
at `rect.left 120` with `padding-inline 24px` and `margin-inline 120px` resolved from `auto`; the first breadcrumb
item's text and the page `h1` both read **`144`**, matching the header inner and `main.ant-layout-content`. At
**768×900** everything still shares one edge at **24**. No horizontal overflow at either width.

The readings arithmetic held: `Row` `margin-inline-start:-8px` + `padding-inline:0` + each `Col` `padding-inline:8px`
→ `144 − 8 + 0 + 8 = 144`.

### The vertical separation (B5/B6): a falsifiable claim, all six confirmed

The implementer stated the geometry in advance so it could be judged rather than interpreted. Every prediction held:

| # | Prediction | Measured |
| --- | --- | --- |
| P1 | The wrapper is a flex item of `.ant-layout` (`display:flex; flex-direction:column`), so its margin does not collapse with siblings | confirmed — `layout display:flex`, margin realized |
| P2 | Header `border-bottom` bottom edge unchanged at **65** | `65` on all routes |
| P3 | Wrapper computed `margin-top` **16px**, nav's **0px** | `wrapperMarginTop=16px`, `navMarginTop=0px` |
| P4 | Wrapper / nav / link box top all **81** | `81` / `81` / `81`. **The `65` refutation branch did not trigger** |
| P5 | Text ink top **83** | `83` (Range over the text node) |
| P6 | Header → text gap **18px**, versus **2px** before | `83 − 65 = 18` |

### The baseline that closes an earlier caveat

The first measurement could not compare against the committed revision. This one built the committed tree
(`git archive c2064fa` on an isolated port) and measured it: **nav top `65`, `navMarginTop: 0px`,
`navPaddingLeft: 0px`, item text top `67`, left `0`.** So the two dead declarations are proven dead on the old tree
and proven live on the new one — the diagnosis is now backed by a direct before/after, not only by reasoning.

### Regression scan

- The four pre-existing `scrollWidth > clientWidth` shell entries (`navIcon 21/14`, `ant-badge 21/14`, header
  `sr-only 80/1`, `.ant-breadcrumb-item 24/20`) are unchanged on every route. The new page-level entries
  (`/dashboard` sections `1160/1152`) are the intended gutter consolidation, not clipping.
- Console: 14 events across six visits — 6 React DevTools notices, 6 `[HMR] connected`, 2 Fast Refresh — **0 errors,
  0 exceptions, 0 hydration mismatches**.
- `/dashboard` at 768 overflows horizontally from its data table: **863/768 now versus 879/768 at `c2064fa`**, so it
  is pre-existing and slightly reduced, not a regression from this change.

**The owner also confirmed the result visually in their own browser**, which is why the measurement loop was stopped
there rather than extended.

## Advisories

| ID | Severity | Where | What |
| --- | --- | --- | --- |
| `dev-127-does-not-hydrate` | **WARNING** | environment, not the app | **Found while verifying this change, and it can waste hours.** The app only hydrates when addressed as `http://localhost:3000`. At `http://127.0.0.1:3000` the Next 16 dev HMR WebSocket fails (`ERR_INVALID_HTTP_RESPONSE`) and the page never hydrates: zero `__reactFiber$` keys, no renderer registered, an inert theme button, and **no `/api` fetch at all** — so `/anomalies` stays on its SSR `Skeleton` and has no `h1`, which looks exactly like an application bug. Reproduced on the owner's server AND on an isolated copy, so it is host-driven rather than the server's. Always test on `localhost`. **The exact Next mechanism is not proven**, only the observed correlation |
| `breadcrumb-margin-jsdom-invisible` | SUGGESTION | `SiteBreadcrumb.test.tsx` | The guards assert class PLACEMENT, which is genuinely falsifiable. The alignment and the separation themselves are not jsdom-visible — mutation M3 proved it — so the browser measurement is the only oracle for the geometry |
| `page-padding-shape-proxies` | SUGGESTION | four page suites | The E2 guards assert the page wrapper uses vertical-only padding. They are labelled in-code as SHAPE PROXIES: they catch the named regression (M2 fails them) but cannot prove the 144px edge |
| `breadcrumb-item-4px-overhang` | SUGGESTION | pre-existing | antd gives breadcrumb items `margin-inline:-4px; padding:0 4px`, so an item box reports `24/20` on `scrollWidth/clientWidth` while the visible text sits exactly on the gutter. Cosmetic and position-independent |
| `production-cascade-unverified` | SUGGESTION | this phase | Only the dev-mode `antd-cssinjs` inline sheet was audited. The structural fix is order-independent, so it is expected to hold, but a production build was not measured |

**Known debt inherited, not created here**: `T-SUITE` (~2.3 s/test against Jest's 5 s default).
