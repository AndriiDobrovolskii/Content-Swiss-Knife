---
artifact: pipeline_status
story: US-3.1
version: 4
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-09-27T10:00:00Z
updated_at: 2026-09-28T09:15:00Z
supersedes: docs/catalog/US-3.1-pipeline-status.md#3
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 17
  - key: open_decisions
    version: 4
  - key: impact_analysis
    version: 4
  - key: implementation_plan
    version: 7
  - key: task_breakdown
    version: 6
  - key: plan_review
    version: 6
  - key: test_strategy
    version: 3
  - key: ac_test_matrix
    version: 3
open_decisions_blocking: false
---

# Pipeline Status — US-3.1: Make the repair gate actually block ungrounded content and stop the brand-core/heading-form rule conflict

**Verdict (attempt 2 of the IMPLEMENTATION retry, T8/T10, prompt track): `CHANGES_REQUIRED` →
`changes_required_tests`.** T10 is **done and committed** (`3d89c86`), with one disclosed,
pre-existing, content-independent test-file defect left red (§3.1). T8 is **fully implemented and
independently verified against its own named tests (89/89 passing)**, but is deliberately left
**uncommitted** — landing it now would ship a real regression in an out-of-scope test file no
US-3.1 artifact (Impact Analysis, Implementation Plan, Task Breakdown) identified as touched by a
`[HEADING FORM]`/line-153 edit (§3.2). Both items route to `TEST_WRITING`, not to a
`so-builder`-authored fix, per AGENTS.md §7.7 and `so-builder/SKILL.md`'s "never modify a test
file" constraint. `IMPLEMENTATION` is not yet complete for this Story.

Branch: `feat/US-3.1-qa-gate-brand-core-fixes` (unchanged).

**Authorization actually used this dispatch, recorded verbatim per `AGENTS.md` §9 and
`IMPLEMENTATION_VERIFICATION`'s own check for it:** the orchestrator's dispatch to this round of
`so-builder` relayed the user's exact in-session words, "modify
src/prompt-core/master-system-prompt.ts, src/prompts/task-a.ts, and src/prompts/task-b.ts" — all
three FROZEN files T8/T10 touch, named individually, satisfying §9's "explicitly says 'modify
[filename]' for that specific file in the current session" requirement for exactly these three and
no other FROZEN file. `so-builder` performed the §9 stop-and-confirm ritual in-session (stating the
exact change and its source in the Task Breakdown/Implementation Plan) before each edit, per Task
Breakdown v6's own T8/T10 Notes sections.

## 1. Task outcomes

| Task | Track | Outcome | Commit | Notes |
|---|---|---|---|---|
| T1 | angular | done | `df9ec36` | Unchanged since v1-v3. |
| T2 | angular | done | `e48fa1b` | Unchanged since v1-v3. |
| T3 | angular | done | `a01bd12` | Unchanged since v1-v3. |
| T4 | angular | done | `4dfccf0` | Unchanged since v1-v3. |
| T5 | angular | done | `fb03d68` | Unchanged since v1-v3. |
| T6 | angular | done | `fbf4859` | Unchanged since v1-v3. |
| T7 | angular | done, with one disclosed finding | `ad4c678` | Unchanged since v3; test recalibrations committed this round (§2). |
| T8 | prompt | **implemented, own tests 89/89 green, held uncommitted** | — (working tree only) | FROZEN-file edit complete and verified against its own named tests; not committed because it regresses `full-description.golden.spec.ts` (§3.2), a test no US-3.1 artifact scoped to T8. Routed to `TEST_WRITING`. |
| T9 | angular | done | `c78e6da` | Unchanged since v1-v3. |
| T10 | prompt | **done, committed, one disclosed pre-existing red test** | `3d89c86` | See §3.1. |
| T11 | angular | done | `0c14353` | Unchanged since v1-v3. |
| T12 | angular | done | `3e36e4e` | Unchanged since v1-v3. |

## 2. This round's housekeeping: TEST_WRITING's remaining uncommitted spec files

`c48a51c` — commits the eleven spec files `TEST_WRITING` had left uncommitted across T1-T7/T9/T11/T12's
rounds (`heading-style.spec.ts`, `content-orchestrator.simplified.spec.ts`, plus nine more recalibrated
or newly-added spec files), per pipeline_status v3 §5 finding 9's own bisectability concern and this
dispatch's explicit instruction to check and commit them. `so-builder` did not edit any of these files —
staged and committed byte-for-byte as found, verified green in the same full-suite runs reported in §4.
Excludes `master-system-prompt.spec.ts`, `task-a.spec.ts` and `task-b.spec.ts`, which land with their
respective FROZEN-file commits so each production change and the test that pins it travel together.

## 3. T8/T10 — implemented this round; two findings routed to `TEST_WRITING`

### 3.1 T10 — committed (`3d89c86`); one pre-existing, content-independent test defect

`task-b.ts`'s `TASK_B_INSTRUCTION` "— meta_title —" block, budget table and four few-shot anchors,
plus `buildPromptB()`'s excerpt-construction code, were rewritten per Implementation Plan v7 D11(a)-(d)
— read directly from the Plan (not re-derived from the Task Breakdown's prose alone, after an initial
draft that deviated from D11's concrete text was caught and corrected mid-round; see §5 finding 1).
29 of `task-b.spec.ts`'s 31 tests were already green before this round's D11-conformant rewrite; all
31 target tests pass except one:

**`task-b.spec.ts:55-76`, `'every budget equals ceiling-1 (general rows) or ceiling-4 (de-DE) exactly'`
(lines 70 and 73) — a pre-existing, content-independent destructuring defect, not a T10 regression.**
Both loops destructure the raw `RegExpMatchArray` as `const [locales, budgetStr] of generalRows` /
`deDeRows`. A `RegExpMatchArray` is array-like with index 0 = the full match, index 1 = the first
capture group (the locale-name text), index 2 = the second capture group (the digit budget). The
destructuring should be `const [, locales, budgetStr] of ...` (skipping index 0); as written,
`budgetStr` actually receives index 1 — the locale-name string (e.g. `"en-GB, en-US, en-ES"`) — so
`Number(budgetStr)` is `NaN` regardless of what numeric value the prompt actually states. Confirmed
content-independent with a throwaway Node reproduction (not committed): feeding the exact same regex
match against both the old (48/45) and new (54/51) row text produces the identical `NaN` failure mode.
This test could never pass as written, for any `task-b.ts` content — it was going to be part of the
originally-reported 10 red tests (pipeline_status v3 §4) for this same structural reason, independent
of which numbers T10 ultimately wrote. Per `so-builder/SKILL.md` ("Never modify a test file... A test
that seems wrong is a finding to report... not a test to edit — you do not own the test files") and
AGENTS.md §7.7, this is **not fixed here**. **Fix needed:** `task-b.spec.ts:70` and `:73`,
`[locales, budgetStr]` → `[, locales, budgetStr]`. Evidence the content itself is correct: the
`it.each` budget-value tests (`rows.map(r => [r[1].trim(), Number(r[2])])`, correctly indexed) already
pass with titles "...budget (54 chars)..." / "...budget (51 chars)..." — sourced from the same `rows`
array via correct indexing — confirming `task-b.ts` states exactly the OD-8-reconciled 54/51 values the
broken test intends to check.

`.arch-guard-checksums` rebaselined for `task-b.ts` alone (`git diff` against the prior commit shows
exactly one changed line), committed in the same commit as the `task-b.ts` edit, kept separate from
T8's rebaseline per Implementation Plan Risk 8.

### 3.2 T8 — implemented, own tests green, held uncommitted: a real regression in an unscoped test

`master-system-prompt.ts`'s `[HEADING FORM]` block gained one new bullet (after the existing "AT MOST
TWO... may contain [Product-short]" sentence) stating the two-blessed-position exception holds
unchanged when `[Product-short]` equals the full product name; `task-a.ts`'s line-153 restatement was
reworded from "...which forbids the full name outright." to "...which forbids the full name outright
except at the two blessed positions it names." No other line in either file changed. All four of T8's
own named tests pass (`task-a.spec.ts`, `task-a.simplified.spec.ts`, `master-system-prompt.spec.ts`,
`master-system-prompt.v4.spec.ts` — 89/89).

**Verified by independently un-stashing just these two files against `HEAD`:** the edit alone —
nothing else in the working tree — turns 10 tests in `src/prompts/full-description.golden.spec.ts`
from green to red (confirmed both ways: red with the edit applied, green with it stashed out, on an
otherwise-identical tree). This is `TEST_WRITING`'s own US-2.2 byte-identical prompt-caching regression
guard: it pins `MASTER_SYSTEM_PROMPT`/`TASK_A_INSTRUCTION`'s exact bytes for every "no `templateId`"
("Full description") case, captured from the tree *before* US-2.2. **No US-3.1 artifact — Impact
Analysis v4, Implementation Plan v7, Task Breakdown v6 — names `full-description.golden.spec.ts` or
its backing fixture (`test/fixtures/golden/full-description-prompts.json`) as a file T8 touches or
exposes.** This is a genuine blast-radius gap in this Story's own planning, not a defect in T8's
implementation of the Task Breakdown's design (which was itself followed exactly: the new clause
states the required exception; the line-153 reword ends with "...positions it names.", not "...
outright."; no other line changed).

The fixture's own file-header comment (`test/fixtures/full-description-inputs.ts`) explicitly forbids
`so-builder` (or anyone) from regenerating it from the implemented tree: "Do NOT regenerate the JSON
after implementation starts: doing so would make the guard assert the implementation back to itself."
Regenerating it is a fixture edit in any case — forbidden to `so-builder` regardless of that comment,
per AGENTS.md §7.7 / `so-builder/SKILL.md`. **T8's code is therefore left applied in the working tree,
uncommitted**, rather than shipping a commit that turns 10 previously-green tests red (violates the
Definition of Done's "every test that passed before still passes"). This follows the same precedent
this Story's own T7 round already established (`heading-style.ts`/`repair-strategy.ts` parked via
`git stash` until `TEST_WRITING` recalibrated the two blocked tests, then popped and committed).

**Exact regeneration delta, captured with a throwaway, never-committed diagnostic spec (deleted
immediately after use, the same pattern used for pipeline_status v3's finding 8):**

- `systemBlocks[0]` (the shared `MASTER_SYSTEM_PROMPT` block, present in every golden case) gains
  exactly one inserted bullet, immediately after `"...not a place to repeat the keyword.\n"` and
  before `"- NO <h3> EVER CONTAINS..."`:
  ```
  - This exception holds unchanged even when [Product-short] equals the full product name (no
    configuration code or packaging suffix to drop) — the two blessed positions still permit it
    there.
  ```
- `userContent` (only for cases that reach `buildPromptA()`'s "Full description" tail, e.g.
  `html/expert3d`) gains exactly one appended clause, changing
  `'...[HEADING FORM], which forbids the full name outright.'` to
  `'...[HEADING FORM], which forbids the full name outright except at the two blessed positions it
  names.'`
- No other byte in any golden case differs (verified for `html/expert3d` and `c/eu-en`, one
  representative case with and one without the `userContent` tail; the `translate/*` cases stay green
  untouched, since they never embed `MASTER_SYSTEM_PROMPT`).

**Fix needed, `TEST_WRITING`'s to make, not `so-builder`'s:** hand-apply exactly this delta to
`test/fixtures/golden/full-description-prompts.json` (not a fresh capture from the implemented tree,
per the fixture's own comment) for every affected case, and confirm the resulting JSON diff contains
only this delta — which then doubles as independent proof of T8's own acceptance check ("no other
line in either file changed"). The spec file's header comment (`full-description.golden.spec.ts`,
which currently cites US-2.2's own T9/T13 numbering) is worth a one-line update noting it must also
stay green across US-3.1's authorized FROZEN-file edits, so the next Story that legitimately edits
these files isn't caught by the same gap.

**Once `TEST_WRITING` lands that fixture update, the next `so-builder` round only needs to commit** —
`master-system-prompt.ts`, `task-a.ts` and `.arch-guard-checksums` are already correctly edited and
rebaselined in the working tree (verified: `git diff .arch-guard-checksums` against `HEAD` shows
exactly two changed lines, `task-a.ts` and `master-system-prompt.ts`, matching T8's own two-file
scope) — no frozen-file re-edit, and no fresh §9 stop, should be needed.

## 4. Measured state (real command output)

| Check | Result |
|---|---|
| `npx vitest run src/prompts/task-a.spec.ts src/prompt-core/master-system-prompt.spec.ts src/prompts/task-a.simplified.spec.ts src/prompt-core/master-system-prompt.v4.spec.ts` (T8 applied) | **4 files passed, 89 passed (89), 0 failed.** |
| `npx vitest run src/prompts/task-b.spec.ts` (T10 applied, T8 parked) | **1 file failed, 30 passed / 1 failed (31)** — only the destructuring defect (§3.1). |
| `npm run test:logic` (T10 committed, T8 parked) | **3 files failed → down to `master-system-prompt.spec.ts` (1), `task-a.spec.ts` (1, both T8's own tests, expected since T8 was parked for this specific run), `task-b.spec.ts` (1, the destructuring defect)** — 3881 passed / 3 skipped (3887); golden confirmed green in this state. |
| `npm run test:logic` (T10 committed, T8 applied/uncommitted — the state this artifact leaves the tree in) | **2 files failed, 11 failed** — the 10 `full-description.golden.spec.ts` cases (§3.2) plus the 1 destructuring defect (§3.1); 3873 passed / 3 skipped (3887). T8's own 4 named test files are NOT in this failure list — confirmed passing. |
| `npm run test:components` (`ng test`) | **2 files, 23 passed, 0 failed.** |
| `npm run lint` (`tsc --noEmit`) | **clean, 0 errors.** |
| `bash arch-guard.sh --rebaseline` (T10 state, task-b.ts alone) | `git diff .arch-guard-checksums` against the prior commit: **exactly one changed line — `task-b.ts`.** |
| `bash arch-guard.sh --rebaseline` (T8 applied on top, uncommitted) | `git diff .arch-guard-checksums` against `HEAD` (which now has T10 committed): **exactly two changed lines — `task-a.ts`, `master-system-prompt.ts`.** `task-b.ts`'s row is unchanged, correctly matching its committed value. |
| `npm run test:coverage` / `npm run build` / `npm run validate:harness` | not run — `QUALITY_GATE`'s concern, per this artifact's own v1-v3 convention (unchanged reasoning); would not be meaningful yet in any case while T8 is uncommitted. |

## 5. Non-blocking findings

Findings 1-9 are unchanged from v1-v3 (see v3 §5) — all already landed, committed, or (finding 8, the
Bambu Lab "Hardened Steel" D5(f) worked-example defect) still open and out of this dispatch's scope.

10. **A first T10 draft, self-corrected before committing, deviated from Implementation Plan v7's D11
    concrete text.** Working from the Task Breakdown's prose description of D11 alone (without opening
    Implementation Plan v7 §D11 directly first) produced a plausible-looking but non-conformant
    rewrite: it kept `[Site Suffix]` inside the degradation cascade itself (rungs 1-2), used a
    "Center3D" example suffix in a shared system block, and included a false "one/two characters over
    budget already fails" arithmetic claim. Caught via `advisor()` review before any commit, and
    corrected against D11's actual verbatim block, anchors and `buildPromptB()` code
    (`docs/plans/US-3.1-implementation-plan.md:938-1068`) before landing `3d89c86`. Recorded here
    because it is a process finding for future rounds: when a Task Breakdown says "see D-something",
    open the cited Implementation Plan section directly rather than working from the Task Breakdown's
    own paraphrase of it, even when the paraphrase looks complete.

11. **Implementation Plan v7 D11(a)'s own `buildPromptB()` excerpt code, implemented here verbatim, is
    imprecise about its stated 1000-character cap.** In the specs-section branch, `proseExcerpt` (≤500)
    + `"\n"` + `specsExcerpt` (≤500) can total 1001 characters, one over the Plan's own stated "Total
    excerpt length stays capped at 1000 characters in both branches." No test checks the combined
    total in that branch (only that `Weight`/`500 g`-style content is present and that the prose slice
    does not exceed 500), so nothing is currently red over this. Implemented exactly as the Plan
    specifies rather than second-guessed, since the Plan is the authorized design and the 1-character
    imprecision is the Plan's own, not introduced by this implementation. Flagged for
    `IMPLEMENTATION_VERIFICATION`/a future Plan revision to decide whether it is worth a trivial fix
    (e.g. capping the joined excerpt at 1000 explicitly).

## 6. Files changed (summary)

Committed this round:
- `c48a51c` — 11 `TEST_WRITING` spec files (housekeeping, §2); `so-builder` did not edit any of them.
- `3d89c86` — `src/prompts/task-b.ts`, `src/prompts/task-b.spec.ts` (staged as `TEST_WRITING` left it,
  not edited), `.arch-guard-checksums` (task-b.ts row only).

Applied, uncommitted (left in the working tree, per §3.2):
- `src/prompt-core/master-system-prompt.ts` — one new bullet in `[HEADING FORM]`.
- `src/prompts/task-a.ts` — line-153 restatement reworded.
- `.arch-guard-checksums` — `task-a.ts`/`master-system-prompt.ts` rows rebaselined to the applied edit.

Not touched, not authorized: `src/prompts/task-c.ts`, `src/utils/output-validator.ts` (both FROZEN,
untouched, confirmed by `bash arch-guard.sh`).

Not touched, not owned by `so-builder`: `test/fixtures/golden/full-description-prompts.json`,
`src/prompts/full-description.golden.spec.ts`, `src/prompts/task-b.spec.ts:70,73` — all three are
`TEST_WRITING`'s to fix (§3.1, §3.2).
