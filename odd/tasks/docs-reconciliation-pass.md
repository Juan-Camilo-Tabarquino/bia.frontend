# Feature: Systematic documentation reconciliation

**Status: COMPLETE — 5/5, verified across two independent rounds.** Branch `main`, base `a58e87ff`
(pushed). Delivered in two commits: the corrections, then this record.

## Why this existed

Three consecutive verification rounds each surfaced **new instances of the same defect class**: a
documentation claim the repository contradicts. Round 1 found four defects, round 2 found three
(P-1/P-2/P-3), round 3 found two more (P-4/P-5). Round-by-round sampling kept drawing from the same pool,
so this pass replaced it with one exhaustive reconciliation: every live document, every verifiable claim,
one inventory, one work unit.

## Method

Three read-only explorations ran in parallel (API surface; routes and structure; toolchain and process).

**Methodological caveat, recorded because it shaped the result:** the explorer subagents had only `read`,
`grep`, `find` and `codegraph` — **no shell**. Their verdicts rest on quoted file content rather than
executed commands, and two of them could not run a single documented command. Every consequential finding
was therefore **re-verified by the parent with real commands** before a fix was specified. That was not
ceremony: this pass also produced two of the explorers' verdicts that did not survive contact with a
command, and one that reversed the parent's own earlier claim.

Verdict vocabulary: **TRUE** / **FALSE** / **IMPRECISE** / **UNVERIFIABLE**.

## What was corrected

### FALSE — the document asserted what the repository refutes

| # | Location | Claim | Evidence |
| --- | --- | --- | --- |
| F1 | `CONTRIBUTING.md` | "Prettier is also installed as a dependency", plus `npx prettier --check .` and `--write .` | `grep prettier package.json package-lock.json` → zero hits; `npm ls prettier --depth=0` → `prettier@3.9.9 extraneous`. A fresh `npm ci` does not install it |
| F2 | `docs/decisions/vite-decision.md` | The cited plan "proposed migrating the frontend **away from Next.js (Webpack)** to **Vite (esbuild)** plus **React Router v6**" | The cited file says `- **Framework**: Next.js (App Router)` and `- **Empaquetador**: **vite**`. No Webpack, no React Router, no proposal to leave Next.js. The ADR misquoted its own evidence |
| F3 | `docs/endpoints.md` | "**Open asks to the backend** … §3" | §2 is `Resolved by the backend` and holds both requests marked *resolved*; §3 is the frontend-only markdown decision |

### IMPRECISE — substance held, wording asserted something demonstrably not so

| # | Location | Was | Evidence |
| --- | --- | --- | --- |
| I1 | `README.md` | "**SCSS modules** for styles" | `src/app/layout.tsx:3` imports `../styles/globals.scss`; `src/styles/` holds two non-module files |
| I2 | `README.md` | "Node.js 20 or newer (CI runs Node 20)" | True as stated, but `@testing-library/jest-dom@7.0.1` declares `engines.node >=22` and `package.json` declares no `engines`, so a Node 20 install warns instead of failing |
| I3 | `README.md` | "All HTTP access lives under `src/features`" | Refuted by the next bullet in the same section and by `src/api/backend.ts` |
| I4 | `CONTRIBUTING.md` | "All CI **jobs** will fail on lint errors or a failing build" | One job (`build`), steps `npm ci`, `npm run lint`, `npm test`, `npm run build`: a failing test also stops it and was omitted |
| I5 | `docs/routes.md` | "el orden por severidad/**tipo**/fecha es local" | `anomalySortOptions` = `backend`, `priority`, `severity`, `detected_at`. `type` is a **filter**, not a sort |
| I6 | `docs/routes.md` | "Un id desconocido **responde `404`**" | `src/app/anomalies/[id]/page.tsx` is `"use client"` and renders `<Result status="404">`; it emits no HTTP status |
| I7 | `docs/routes.md` | The Meter Detail table renders "los campos que devuelve `GET /meters/{meterId}` (… `name`, `location` …)" | `MeterDetail.tsx` deliberately omits them and says so in a comment |
| I8 | `docs/project-structure.md` | "Los estilos se gestionan con módulos SCSS (`*.module.scss`)" | Contradicted line 30 of its own file, and the global stylesheet `layout.tsx` imports |

### UNVERIFIABLE — documented instead of asserted

| # | Location | Claim | Why it cannot be settled here |
| --- | --- | --- | --- |
| U1 | `docs/backend-requirements.md` (§1 and §2 R1); `docs/routes.md` (three rows) | `GET /api/anomalies` returns ascending-`priority` order | **The repository contradicts itself.** `apiSlice.ts:19` types it `Anomaly[] (unsorted)` and `AnomalyFilters.tsx:52,173` calls it "the full unsorted array", while `types/backend.ts:89`, `app/anomalies/page.tsx:50`, `app/dashboard/page.tsx`, `anomalyFiltering.ts:12`, `AnomalyTable.tsx` and `AiReanalysis.tsx` assert the ascending order. Only `bia.backend` can settle it, and four UI surfaces depend on the answer |
| U2 | `docs/backend-requirements.md`; `docs/routes.md` | `GET /ai/analysis/{id}` "**always** responds `completed`" | `src/types/backend.ts:164` records the observed values as `"queued"`, `"completed"`. The "does not poll" half is TRUE and verified; the "always" justification is not |

Roughly 29 further claims in `docs/backend-requirements.md` describe the `bia.backend` service (CORS
headers, `404` body shapes, the inclusive `from`/`to` window, the ~88 s startup, the uncommitted backend
working tree, the classification table, the Ollama provider). They remain **UNVERIFIABLE, not errors**:
nothing in this repository can settle them, and rewriting them on a hunch is the failure this pass exists
to correct.

## Independent verification — two rounds, both of which falsified something

### Round 1 falsified the word "exhaustive"

The verifier was asked to attack the claim rather than confirm it. It found two confirmed survivors:

1. **S1 — F3's defect survived in two other files.** `README.md` and `CONTRIBUTING.md` both still
   advertised "the open requests to the backend" after `docs/endpoints.md` had been corrected. `grep -in
   "open" docs/backend-requirements.md` returns zero hits: there are no open requests. Fixed.
2. **S2 — my own new caveat was inaccurate.** It claimed the ascending order "is corroborated only by
   `src/types/backend.ts`", which the repository refutes: `src/app/anomalies/page.tsx:50` and
   `src/components/anomalies/anomalyFiltering.ts:12` assert it too. **The pass committed the exact sin it
   was correcting, inside the caveat written to prevent it.** Fixed by listing the counter-evidence
   completely.

It also caught that the pass had missed `docs/routes.md` lines 41 and 42, which restated the ordering,
`tipo`-sort and "always completed" claims a second and third time — the same claim appearing in more
places than the fixer noticed.

### Round 2 confirmed readiness

`risk: unassessable` → independent verifier required. Verdict: **ready to commit**, no FALSE claim
surviving. It then produced four IMPRECISE items, all four of which were applied:

- the caveat's counter-list was still incomplete (missing `app/dashboard/page.tsx`, `AnomalyTable.tsx` and
  `AiReanalysis.tsx`) and its impact scope named only the `/anomalies` page;
- a broken in-page anchor, `#3-frontend-only-decision` against the heading `## 3. Frontend-only decision:
  resolved` (pre-existing);
- `docs/endpoints.md` asserted the ordering without pointing at the caveat;
- my "this section" scoping was ambiguous.

## Task board

| ID | Title | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Record the pass and its method | done | This file |
| 2 | Run the three read-only cluster explorations | done | Three inventories; the no-shell caveat recorded above |
| 3 | Consolidate and re-verify every consequential finding by command | done | The inventory above |
| 4 | Correct the confirmed findings in one work unit | done | 7 files, 33 insertions / 31 deletions; `git diff HEAD --stat -- src` empty |
| 5 | Independent verification, two rounds, and closure | done | Round 1 falsified "exhaustive" and found S1/S2; round 2 returned ready-to-commit with four IMPRECISE items, all applied |

## Decisions

- **The word "systematic" was earned, not assumed** — and it took two rounds to earn. Round 1 exists in
  this record precisely because the claim failed it.
- **UNVERIFIABLE is a verdict, not a licence.** Nothing was rewritten because it could not be checked.
- **Explorer verdicts are not evidence.** Every consequential finding was re-run by the parent. The
  explorers had no shell, and the previous two rounds had each been corrupted by an unverified assertion.
- **The `src/` ordering contradiction is reported, not fixed.** It touches source, and the real question —
  what order the backend guarantees — is a product decision with four UI surfaces depending on it.
- **`docs/project-structure.md` principles were left alone.** "Componentes presentacionales" and "la lógica
  de datos vive en `src/features`" are demonstrably aspirational (components fetch and derive), but they are
  stated as principles. Rewriting intent is a product decision, not a correction.
- **Stopping rule, stated and honoured.** This was the last round for this candidate: confirmed FALSE
  claims would be fixed, everything else reported. Both rounds' new items happened to be small and
  self-contained, so all were applied — but the rule was set before the round ran, not after.
