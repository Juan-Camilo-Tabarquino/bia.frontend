# Feature: U1 ordering confirmation — correct the stale ordering claims

**Status: COMPLETE — 4/4, verified across four rounds.** Branch `main`, base `0c86abbe` (pushed).

**Reference:** `odd/tasks/docs-reconciliation-pass.md` (the pass that surfaced U1),
`odd/tasks/docs-accuracy-fixes.md`.

## Why this exists

The reconciliation pass found **U1**: the ascending-`priority` ordering of `GET /api/anomalies` was
asserted across the frontend docs while two frontend source comments called the response "unsorted". The
pass could not settle it — the repository contradicts itself — so it documented a caveat and left the
question open, because only the backend could answer it.

The user then authorised measuring it (option A). Nothing was listening on `localhost:3001`, so instead of
starting a server the answer was taken from the **backend source**, which is stronger evidence than a
runtime sample: a sample shows one instance, the source shows the guarantee, and it also answers whether
the ordering was committed.

## What the measurement found

`bia.backend` (`../bia.backend`), branch `main`, in sync with `origin/main`, **working tree clean**.

```go
// sortedEvidence returns a copy of the evidence ordered for the UI: the most
// urgent anomaly first (priority ascending, 1 = most urgent), then oldest
// first, then by meter id. The three keys give a total order, so the list
// endpoint and the stored analysis result always agree on the sequence.
func sortedEvidence(evidence []models.Evidence) []models.Evidence {
	out := append([]models.Evidence(nil), evidence...)
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Priority != out[j].Priority { return out[i].Priority < out[j].Priority }
		if !out[i].Anomaly.Timestamp.Equal(out[j].Anomaly.Timestamp) { return out[i].Anomaly.Timestamp.Before(out[j].Anomaly.Timestamp) }
		return out[i].Anomaly.MeterID < out[j].Anomaly.MeterID
	})
	return out
}
```

| Finding | Evidence |
| --- | --- |
| The backend sorts, and it is a **total order** (three keys), so there are no ambiguous ties | `internal/api/handlers/endpoints.go`, `sortedEvidence()` |
| **Both** endpoints share the ordering, so `AiReanalysis`'s `anomalies[0]` really is the most urgent | `anomalyDTOs()` calls `sortedEvidence()`; it is used by `Anomalies()` (`endpoints.go:218`) and by `AnalysisGET` (`ai.go:86`) |
| The ordering is **pinned by a test**, not by convention | `internal/api/api_test.go:456` asserts `list[i-1].Priority > got.Priority` → "list is not ordered by priority ascending" |
| The route is wired | `internal/api/router.go:90` |
| It is **committed and pushed** | `a9067ac` ("feat(ai): narrate anomalies with the real Ollama provider") is contained in `origin/main`; the sort entered there |
| `priorityFor` also has a `default = 5` the doc omitted | `internal/analysis/scorer.go` |
| `11c9508` is an **ancestor of `main`**, and `split-commits` exists and is pushed | `git merge-base --is-ancestor 11c9508 main` succeeds; `git branch -a` shows both local and remote `split-commits` |

**Verdict: the docs were right and the two source comments are the wrong half.** Nothing about the
frontend's behaviour needs to change: `applyAnomalySort("priority")` already mirrors the backend's three
keys, and `sortKey: "backend"` (identity over the fetched array) is therefore correct.

**Consequence worth recording:** the earlier recommendation to change the default sort (option B) would
have been a **behaviour no-op**. Measuring first is what caught that.

## Edits

| # | Location | Correction |
| --- | --- | --- |
| 1 | `src/features/api/apiSlice.ts:19` | `Anomaly[] (unsorted)` → `Anomaly[] (API order: priority ascending)` |
| 2 | `src/components/anomalies/AnomalyFilters.tsx` (doc comment) | "the full **unsorted** array" → the array arrives in the backend's deterministic priority order and nothing here re-sorts it |
| 3 | `src/components/anomalies/AnomalyFilters.tsx` (**user-visible copy**) | "the full, **unsorted** array" → "the full array, already in priority order" |
| 4 | `docs/backend-requirements.md` §1 | The reconciliation pass's caveat, which framed this as an unresolvable self-contradiction, becomes the confirmation with the function and the test as evidence |
| 5 | `docs/backend-requirements.md` §1 (analysis path) | The pre-existing caveat claiming the sort lives in an **uncommitted** backend working tree and that `HEAD` does not sort |
| 6 | `docs/backend-requirements.md` §2 R1 | The pass's own trailing caveat sentence, now obsolete because edits 1–3 fix the comments it pointed at |
| 7 | `docs/backend-requirements.md` §2 R1 | The `priority` mapping omitted the backend's `default = 5` case |
| 8 | `docs/backend-requirements.md` §4 | "The backend's latest LLM work … is **uncommitted** … `11c9508` is on branch `split-commits` and has not been pushed" — the work is committed on `main` and pushed, and `11c9508` is an ancestor of `main` |

## Verification bar, and how it was met

This is the **first change in this session that touches `src/`**. Comments and one JSX text node only, so
no behaviour can change, but the bar rises accordingly.

| Gate | Result |
| --- | --- |
| `npm run lint` | exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | **18/18 suites, 118/118 tests**, 0 snapshots |
| Test exposure of the changed JSX copy | none: no snapshot exists and no test asserts that string, so the copy change cannot break an assertion |
| `next build` | deliberately not run, as disproportionate for a comment-and-copy change; reported as not-run, never green |

The three commands above were run by the first verification round over the `src/` diff. The three later
rounds only fixed documentation pointers, so that diff did not change; the last round declined to re-run
them conditionally, and that is recorded as **not re-run this round** rather than as re-verified.

## Task board

| ID | Title | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Measure the ordering question | done | The table above; answered from the backend source |
| 2 | Record the measurement | done | This file, plus the Engram mirror |
| 3 | Apply the eight corrections | done | Five files, 31 insertions / 32 deletions; the `src/` half is `-U0`-verified as comment and text-node lines only |
| 4 | Verify and close | done | Four rounds; see below |

## What verification cost, and why it was worth it

Four rounds ran. **Every one of the first three found a surviving dangling pointer to the caveat this
change deleted**, each in a different file, and each written by the parent rather than by the worker:

| Round | Found | Why the previous sweep missed it |
| --- | --- | --- |
| 1 | Three rows in `docs/routes.md` — "no está verificable desde este repositorio" | The edit list was written from the plan instead of by grepping for the vocabulary the parent had introduced |
| 2 | `docs/endpoints.md:11` — "with the caveat recorded in §2 R1" | The sweep searched `verificable` and `unverifiable` but not the synonym `caveat` |
| 3 | The fix's own wording | — |
| 4 | Nothing. The class was declared **exhausted** after ~40 vocabulary variants and a concept-level search across every live document, with `odd/tasks/**` separated out as historical records | |

The lesson is specific and worth keeping: **when a change deletes a claim, the sweep must search for
the concept, not for the phrase you happen to remember writing.** Three times in a row, a synonym was
enough to hide a live pointer.

Also worth recording: the change **introduced** the defect in rounds 1 and 2 rather than merely failing to
clean it up. Deleting a caveat from one document made three pointers to it stale in others, and the same
pattern repeated one document later.

## Decisions

- **Answer from the source, not from a running server.** Nothing was listening on `:3001`, and the source
  settles both the list endpoint and the analysis endpoint, plus the committed-ness question, in one read.
  A live `curl` would confirm one instance of something now proven by construction.
- **Correct the comments, not the docs.** The docs' claim was true; the two source comments were the
  imprecise half. This is the first time in the session that the fix lands in `src/` rather than in `docs/`,
  and it is a comment-and-copy change with no behaviour.
- **Do not change the frontend's sort behaviour.** Option B would have been a no-op, so it is dropped
  rather than performed for symmetry.
- **The historical records stay historical.** `odd/tasks/docs-reconciliation-pass.md` still calls U1
  unverifiable and says the `src/` contradiction is "reported, not fixed". Both were true when written and
  are superseded by this file; they are records, not live claims, and they are not rewritten. Verification
  agreed they are not survivors of the dangling-pointer class.
