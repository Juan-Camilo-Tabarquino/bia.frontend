# Feature: Documentation accuracy fixes + brand cleanup

**Status: COMPLETE — 2/2 plus the follow-up, independently verified.** Branch `main`, work units
`98a5abb2`, `bef78c99` and the follow-up `01b97688`.

**Reference:** `odd/tasks/docs-reorganization.md` (the pass that surfaced the defects), `docs/routes.md`,
`docs/backend-requirements.md`.

## Context

The verified `docs-reorganization` pass surfaced four defects in the repository documentation. All four
were pre-existing: none was introduced by that pass, and all were reported as out-of-scope follow-ups
instead of being absorbed into it. The user then authorized them as a separate change
("mandalos en otro commit para evitar problemas").

The failures share one root cause: **the text was written or reconciled without checking the tree it
describes.** These fixes are held to the opposite standard: every claim below is backed by an
observation of the actual repository.

The user also asked that no `.md` mention "Ascent"; the product is referred to as **BIA Energy** /
**BIA Frontend**.

## Task board

| ID | Title | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Fix the four documentation defects | done | `98a5abb2` — `README.md`, `docs/project-structure.md`, `docs/decisions/vite-decision.md`; 7 insertions, 5 deletions |
| 2 | Drop the remaining "Ascent" mention | done | `bef78c99` — `CONTRIBUTING.md:1`; no product document mentions it any more. The string still appears inside this record, which is the document that describes its removal |
| 3 | Fix P-1: the false `/events` claim | done | `01b97688` — dropped from `README.md` and `docs/project-structure.md`; endpoint reconciliation clean in all three directions |
| 4 | Resolve P-2 by deleting the stray `frontend/` directory | done | `rm -rf frontend` — 753 MB, 62,597 entries, no git diff; the three "no `frontend/` prefix" statements are now literally true |
| 5 | Fix P-3: document the lint command the repository runs | done | `01b97688` — both docs now say `eslint .`, matching `package.json:9`. The originally stated harm was false and is corrected below |

## Defect 1 — `README.md` routes contradicted the repository

`README.md` listed `/anomalies` and `/anomalies/[id]` under "Planned, not implemented yet", while
`docs/routes.md` listed both as implemented and both pages exist at `HEAD`.

Observed facts:

- `src/app/anomalies/page.tsx` mounts `AiReanalysis` (line 163) alongside `AnomalyFilters` and
  `AnomalyTable`; filtering and sorting run in the browser through
  `applyAnomalySort(applyAnomalyFilters(anomalies, filters), sortKey)`.
- `src/app/anomalies/[id]/page.tsx` renders `AnomalyDetail` (line 72) and has a dedicated 404 state
  (antd `Result status="404"`, reached via `isNotFound`) for an unknown id.
- `/settings` has no page: absent from `src/app` and from `git ls-files 'src/app/**/page.tsx'`.

Fix: both anomaly routes moved into the implemented table with those verified descriptions, and the
planned rows were replaced by the single real `/settings` row, matching `docs/routes.md:21`.

## Defect 2 — `docs/project-structure.md` diagram disagreed with the tree

Three inaccuracies in one diagram, verified against `git ls-files src`:

1. The diagram advertised `src/hooks/` as "Reservado para hooks personalizados (vacío hoy)". The
   directory does not exist and was never tracked.
2. `src/app/anomalies/` (with `page.tsx` and `[id]/page.tsx`) was missing from the `app/` block.
3. `src/components/anomalies/` (14 tracked files) was missing from the `components/` block.

Fix: the `hooks/` line is gone and both directories are shown, each inserted before the block's existing
last entry so the `└─` glyphs stay with `meter/[id]/` and `dashboard/`.

## Defect 3 — `docs/decisions/vite-decision.md` claimed a directory that does not exist

Line 34 asserted "The untracked `dist/` folder at the repository root is leftover build output from the
abandoned setup and is not part of the application."

Observed: `ls -d dist` fails; `.gitignore:24` does list `dist/`.

Fix: the sentence now states the real repository state and keeps the accurate `.gitignore` part.

## Defect 4 — the diagram's `docs/` comment broke the comment column

Every line of the tree places its `#` at character column 31. The `docs/` line added by the previous pass
was 180 characters against 50-101 for every sibling, the one outlier in the diagram.

Fix: shortened to `# Documentación del proyecto` (59 characters).

**Measurement note (this bit the previous pass):** the box-drawing characters `├ ─ │` are multi-byte, so
byte-oriented tools (`awk index`, `grep -b`, `wc -c`) report wrong columns. The correct check is a
character-aware scan (`node -e "... l.indexOf('#') ..."`).

## Task 2 — the last "Ascent" mention

`git grep -in ascent` over the whole tracked tree returned exactly one hit: `CONTRIBUTING.md:1`. `README.md`
had already been cleaned by the user's own commit `836d1368`.

Observed non-findings, deliberately left alone:

- `package.json` has `"name": "frontend"`, so there is no package-level brand to fix.
- `bia.backend` and `bia.frontend` are repository names, not branding.
- The `docs/requisitos/` inputs are the original handoff documents and contain no "Ascent" mention; they
  are historical evidence and were not rebranded.

Fix: `CONTRIBUTING.md:1` is now `# Contributing to BIA Frontend`, matching the `README.md` title.

## Independent verification

`gentle-ai-verify`, read-only, over the uncommitted tree. Results:

| Gate | Result | Evidence |
| --- | --- | --- |
| 1 Scope discipline | PASS | Restricted and unrestricted `git diff --stat HEAD` are identical: only the four surfaces. Nothing under `src/`, `odd/` (tracked), `.github/` or any build config |
| 2 Fixes are factually right | PASS | Each new sentence confirmed against the code: `AiReanalysis` mounted, in-browser filter/sort, `AnomalyDetail` rendered, antd `Result status="404"` state, no `/settings` page, no `dist/` directory, `.gitignore:24` entry |
| 3 Three-way route reconciliation | PASS | Code (7 routes from `src/app/**/page.tsx`), `README.md` and `docs/routes.md` now agree in all directions. The exact failure mode of defect 1 is closed |
| 4 Diagram accuracy, in full | FAIL, pre-existing | One false line remains, untouched by this change: see finding P-1 |
| 5 Comment column integrity | PASS | Character-aware scan: every one of the 30 commented tree lines places `#` at index 30. The `docs/` line went from 180 to 59 characters; no length outlier remains |
| 6 Brand | FAIL literally, PASS on intent | The tracked tree is clean. The only "ascent" matches are inside this task record, which is about removing the word |
| 7 No new false claims | PASS | Every changed sentence verified true. Three pre-existing inaccuracies found nearby, listed below |
| 8 Build, lint, test | NOT RUN | Deliberate and judged acceptable by the verifier given gate 1. Reported as not-run, never as green |

## Defects found by the first verification (fixed in the follow-up)

None was introduced by this change, and none was in the authorized scope. All three are the same class of
defect this feature exists to correct, which is why they are reported rather than buried.

- **P-1 — `/events` is described as an endpoint declared in the slice, and it is not.**
  `README.md:77`, `docs/project-structure.md:26` (diagram) and `:47` (prose) all claim
  `GET /events` is declared in `apiSlice` but unused. Reality: `apiSlice.ts` declares five endpoints and
  carries the comment "There is no `/events` resource on the backend", and
  `src/features/api/__tests__/apiSlice.test.ts:20` asserts that no `getEvents` endpoint is exposed.
  `docs/routes.md`'s API table correctly omits `/events`, so the docs also disagree with each other.
- **P-2 — the "no `frontend/` subdirectory" claim was literally contradicted.**
  `README.md:15`, `docs/project-structure.md:3` and `docs/routes.md:3` deny a `frontend/` prefix, but a
  root `frontend/` directory existed holding a `node_modules` tree. **Correction to the first description:
  the directory was not ignored.** It was untracked, and only its `node_modules` contents were ignored by
  the `node_modules/` rule; the root `.gitignore` has no `frontend/` rule. A second correction: `frontend/`
  **was** tracked historically and was removed in `cff488db` and `eb950e19`, which are ancestors of `HEAD`
  — `git log --all --oneline -- frontend` returns 14 commits. So "never tracked" was wrong, even though
  `HEAD` tracks zero `frontend/` paths and the deletion was safe.
- **P-3 — the documented lint command did not match `package.json`.**
  `README.md:48` and `CONTRIBUTING.md:88` documented `eslint . --ext .ts,.tsx`; `package.json` runs
  `eslint .`. **Correction to the first description: the harm was overstated.** A later verification
  measured `npx eslint . --ext .ts,.tsx` exiting 0 with no error text and linting the same 54 files as
  `eslint .`, because under this flat config the flag is accepted but inert (`--ext` is still printed by
  `--help`). No contributor was ever blocked by it. The defect was real but purely one of documentation
  fidelity, not of a broken instruction.

## Follow-up — the three defects are fixed (`01b97688`)

The user authorized the follow-up and additionally authorized deleting the stray `frontend/` directory so
that the documentation and the filesystem stop contradicting each other.

| Defect | Resolution | Evidence |
| --- | --- | --- |
| P-1 | The `/events` claim is dropped from `README.md`'s API section, the diagram comment and the Principios bullet | The follow-up verifier enumerated every endpoint the three slices declare and reconciled them against `README.md`, `docs/project-structure.md` and `docs/routes.md`: no disagreement in any direction, and zero `events` hits left in `README.md` and `docs/project-structure.md` |
| P-2 | Resolved by deleting the directory, not by rewording: `rm -rf frontend` removed 753 MB and 62,597 entries, all inside `node_modules` | No `frontend/` exists at the root, and the three "no `frontend/` prefix" statements are now literally true. No path-prefix reference to `frontend/` exists in `HEAD`, the build configs, CI or `package.json`, so the deletion cannot break anything |
| P-3 | Both docs now document `npm run lint` as `eslint .`, matching `package.json:9` | `git grep -n eslint -- '*.md'` leaves no other lint command documented |

Nothing was committed for the deletion: it was untracked, so `git status` never showed it and no commit can
carry it. The follow-up commit contains only the three Markdown files (5 insertions, 5 deletions).

### What this verification caught in my own work

Two of my own assertions were wrong, and this is the second time in this feature that an independent
verifier corrected the record rather than merely confirming it. Both are corrected above.

1. **P-3's stated harm was false.** I relayed "a contributor copying it gets an error" without testing
   it. It was testable in one command, and the measurement showed the opposite.
2. **"`frontend/` was never tracked" was false.** I inferred it from `git ls-files` (which only shows the
   current index) instead of `git log --all --`, which shows 14 commits.

Both mistakes are the same failure this whole feature exists to correct: asserting a claim without running
the check that would falsify it. The lesson is that even the remediation of this defect class is not exempt
from it.

### Two further pre-existing defects found by the follow-up verification, NOT fixed

- **`CONTRIBUTING.md:67` claims Prettier "is also installed as a dependency".** It is not declared: neither
  `package.json` nor `package-lock.json` contains a `prettier` entry, and `npm ls prettier --depth=0`
  reports it as `extraneous`. It happens to be runnable in this working tree because a transitive copy is
  hoisted, but a fresh `npm ci` would not install it.
- **`README.md:75` says "All HTTP access lives under `src/features`".** The next paragraph in the same
  section points at `src/api/backend.ts` for the `GET /health` health check, so the sentence contradicts
  itself. The endpoint inventory is correct; the location claim is not.

## Work units

| Commit | Work unit | Surfaces |
| --- | --- | --- |
| `98a5abb2` | `docs`: correct the stale claims in the repository documentation | `README.md`, `docs/project-structure.md`, `docs/decisions/vite-decision.md` |
| `bef78c99` | `docs`: drop the Ascent mention from the contributor guide | `CONTRIBUTING.md` |
| `01b97688` | `docs`: align the API and lint documentation with the code | `README.md`, `CONTRIBUTING.md`, `docs/project-structure.md` |

Two commits on purpose: correctness fixes and a branding change are different intents, and the user asked
for the defects to land as their own commit. Attribution is verified by content, not by diff inspection:
each commit was staged per file and its `--stat` matches the surfaces above.

## Decisions

- **Fix only the four recorded defects.** The verifier explicitly judged `src/app/favicon.ico`, the root
  config files and the omitted `__tests__/` directories to be defensibly absent from a folders-oriented
  diagram, so they stayed out of scope.
- **Do not rebrand the `docs/requisitos/` inputs.** They are historical evidence with no "Ascent" mention.
- **The three new findings are reported, not absorbed.** Expanding an already-authorized commit with
  unrelated files would break the split the user asked for. The same rule now applies to the two findings
  the follow-up verification produced.
- **The follow-up verifier's correction of my own claims is recorded, not quietly fixed.** A record whose
  errors are erased teaches nothing; this one keeps them so the next reader can check for the same
  shortcut.
