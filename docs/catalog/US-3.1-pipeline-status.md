---
artifact: pipeline_status
story: US-3.1
version: 5
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-09-27T10:00:00Z
updated_at: 2026-09-28T11:35:00Z
supersedes: docs/catalog/US-3.1-pipeline-status.md#4
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
    version: 4
  - key: ac_test_matrix
    version: 4
open_decisions_blocking: false
---

# Pipeline Status — US-3.1: Make the repair gate actually block ungrounded content and stop the brand-core/heading-form rule conflict

**Verdict (attempt 3 of the IMPLEMENTATION retry, final attempt under the 3-attempt cap): `PASS`.**
All 12 in-track tasks (T1-T12) are done and committed. The two findings that blocked v4
(`task-b.spec.ts`'s destructuring bug and the stale `full-description.golden.spec.ts` fixture) were
both resolved by `TEST_WRITING` in the prior loop-back round; this round independently re-verified
both fixes, confirmed the full suite is green **against `HEAD`** (not merely against an uncommitted
working tree), and committed T8's previously-parked FROZEN-file change. `IMPLEMENTATION` is complete
for this Story.

Branch: `feat/US-3.1-qa-gate-brand-core-fixes` (unchanged).

**Authorization for this round's FROZEN-file commit:** T8 ([HEADING FORM] disambiguation,
`src/prompt-core/master-system-prompt.ts` and `src/prompts/task-a.ts`) was already authorized in
this session per the §9 stop-and-confirm ritual performed in the round that first implemented it
(recorded in pipeline_status v4 §"Authorization"). No fresh authorization was needed this round —
this dispatch only verified the already-applied, already-authorized edit was still correct and
committed it once its blocking test-fixture gap was closed.

## 0. What changed this round

This round did **not** write any new production code. It:

1. Independently re-confirmed (git diff, not narrative) that the working tree held exactly the
   changes the prior round's report described: T8's two FROZEN-file edits plus a matching
   `.arch-guard-checksums` rebaseline, `TEST_WRITING`'s recalibrated golden fixture, and
   `TEST_WRITING`'s one-line `task-b.spec.ts` destructuring fix.
2. Ran the full suite (both runners), lint and `bash arch-guard.sh` against that working tree —
   green (§4).
3. Split the working-tree changes into two commits, since they address two independent findings
   and AGENTS.md §13 asks for one coherent change per commit:
   - `c5e6139` — `src/prompts/task-b.spec.ts` alone: the `[locales, budgetStr]` →
     `[, locales, budgetStr]` destructuring fix (§3.1 below). Unrelated to T8; `task-b.ts` itself is
     untouched by T8.
   - `1c02c89` — T8's full, coherent change: `src/prompt-core/master-system-prompt.ts`,
     `src/prompts/task-a.ts`, `.arch-guard-checksums` (both FROZEN-file rows), plus
     `master-system-prompt.spec.ts`, `task-a.spec.ts` (T8's own pinning tests) and
     `test/fixtures/golden/full-description-prompts.json` (the recalibrated golden fixture,
     landing with the change it pins — §3.2 below).
4. Re-ran the full suite, lint and `bash arch-guard.sh` a second time **against `HEAD`** after both
   commits, so the green result is evidence for the committed state itself, not just for a
   working tree that no longer exists in that form (§4).
5. Confirmed `git status` after both commits shows no modified file under `src/` or `test/` — only
   `so-orchestrator`-owned state files and this Story's own untracked upstream docs remain.

## 1. Task outcomes

| Task | Track | Outcome | Commit | Notes |
|---|---|---|---|---|
| T1 | angular | done | `df9ec36` | Unchanged since v1-v4. |
| T2 | angular | done | `e48fa1b` | Unchanged since v1-v4. |
| T3 | angular | done | `a01bd12` | Unchanged since v1-v4. |
| T4 | angular | done | `4dfccf0` | Unchanged since v1-v4. |
| T5 | angular | done | `fb03d68` | Unchanged since v1-v4. |
| T6 | angular | done | `fbf4859` | Unchanged since v1-v4. |
| T7 | angular | done, with one disclosed finding | `ad4c678` | Unchanged since v3-v4. |
| T8 | prompt | **done, committed** | `1c02c89` | FROZEN-file `[HEADING FORM]` disambiguation, committed this round once the golden fixture (§3.2) unblocked it. |
| T9 | angular | done | `c78e6da` | Unchanged since v1-v4. |
| T10 | prompt | **done, committed; test destructuring defect now fixed** | `3d89c86` (task-b.ts), `c5e6139` (test fix) | See §3.1. |
| T11 | angular | done | `0c14353` | Unchanged since v1-v4. |
| T12 | angular | done | `3e36e4e` | Unchanged since v1-v4. |

All 12 in-track tasks are done and committed. No task remains uncommitted or unimplemented.

## 2. This round's housekeeping

None beyond the two commits in §0 — `TEST_WRITING`'s prior loop-back round already committed the
eleven-spec housekeeping batch (`c48a51c`, recorded in v4 §2).

## 3. T8/T10 — both findings from v4 now resolved

### 3.1 T10 — `task-b.spec.ts` destructuring defect, now fixed (`c5e6139`)

v4 §3.1 identified that `task-b.spec.ts:70,73` destructured the raw `RegExpMatchArray` as
`[locales, budgetStr]` instead of `[, locales, budgetStr]`, putting the locale-name capture group
into `budgetStr` and making `Number(budgetStr)` evaluate to `NaN` regardless of `task-b.ts`'s actual
content. `TEST_WRITING` fixed this in the prior loop-back round. This round confirmed the diff is
exactly the two-line index fix described (`git diff` against the prior commit: 2 insertions,
2 deletions, both lines changing only `[locales, budgetStr]` → `[, locales, budgetStr]`) — no
assertion was weakened, no expected value changed, only the indexing bug was corrected — and
committed it standalone as `c5e6139` since it is unrelated to any FROZEN-file change.

### 3.2 T8 — golden fixture recalibrated, FROZEN-file change now committed (`1c02c89`)

v4 §3.2 identified that T8's `[HEADING FORM]` disambiguation (one new bullet in
`master-system-prompt.ts`, one reworded closing line in `task-a.ts`) turned 10 cases in
`full-description.golden.spec.ts` red, because those cases pin `MASTER_SYSTEM_PROMPT`/
`TASK_A_INSTRUCTION`'s exact bytes from before US-3.1, and no US-3.1 artifact had scoped that file
as touched. `TEST_WRITING` recalibrated `test/fixtures/golden/full-description-prompts.json` in the
prior loop-back round with T8's exact, independently-verified delta.

This round independently re-verified that delta by diffing every case in the fixture
programmatically (not by trusting the prior round's narrative): for every one of the 10 cases that
embeds `MASTER_SYSTEM_PROMPT` in `systemBlocks[0]`, the only change is the one inserted bullet
("This exception holds unchanged even when [Product-short] equals the full product name...")
immediately after the "...not a place to repeat the keyword." line and before "NO <h3> EVER
CONTAINS..."; for the subset of those cases that reach `buildPromptA()`'s `userContent` tail
(`doc/expert3d`, `doc/expert3d+hook`, `doc/c3d`, `html/expert3d`, `html/legacy`,
`html/legacy+lang`, `html/c3d+customTemplate`), the only further change is the appended clause
"...which forbids the full name outright except at the two blessed positions it names." replacing
"...which forbids the full name outright." Cases that do not reach that tail (`c/expert3d-es`,
`c/eu-en`, `c/us-uk` — the `translate/*`-style cases) show no `userContent` change at all. No other
byte in the fixture differs. This matches T8's own two-file, two-clause acceptance scope exactly and
confirms `TEST_WRITING`'s recalibration did not smuggle in any other change.

With the fixture recalibrated, `master-system-prompt.ts` and `task-a.ts` (already correctly edited
and already rebaselined in `.arch-guard-checksums` from the prior round) needed no re-edit and no
fresh §9 stop — only committing, together with the fixture and T8's own two pinning spec files, as
`1c02c89`.

## 4. Measured state (real command output, against `HEAD` after both commits)

| Check | Result |
|---|---|
| `npm run test:logic` (`vitest run`) | **147 files passed (147), 3884 passed \| 3 skipped (3887), 0 failed.** Run twice: once against the pre-commit working tree (identical result), once against `HEAD` after both commits. |
| `npm run test:components` (`ng test`) | **2 files passed, 23 passed, 0 failed.** Run twice (pre- and post-commit); identical result both times. |
| `npm run lint` (`tsc --noEmit`) | **clean, 0 errors.** Run twice; identical both times. |
| `bash arch-guard.sh` | **ALL CHECKS PASSED** — Rule #1 (no direct SDK calls outside providers/), Rule #3 (no hard-coded prompts in services), Rule #4 (no API keys in frontend source), and FROZEN (all frozen files match the committed `.arch-guard-checksums`) all green. Run twice; identical both times. |
| `git status` after both commits | Only `so-orchestrator`-owned state files (`docs/catalog/stories.yaml`, `docs/workflow/active-story.yaml`, `docs/workflow/history.jsonl`, `docs/workflow/workflow-state.yaml` — untouched by this skill, per its own constraints) and this Story's untracked upstream docs (clarification report, open decisions, impact analysis, plans, reviews, spec, story, test docs — all pre-existing inputs to this stage, not written by `so-builder`) remain. **No `src/` or `test/` file is modified.** |
| `npm run test:coverage` / `npm run build` / `npm run validate:harness` | not run — out of `so-builder`'s scope; `QUALITY_GATE`'s concern (`so-gate-enforcer`), consistent with v1-v4's own convention. |

## 5. Non-blocking findings

Findings 1-9 are unchanged from v1-v4 (see v3 §5) — all already landed, committed, or (finding 8,
the Bambu Lab "Hardened Steel" D5(f) worked-example defect) still open and out of this Story's
scope. Finding 10 and 11 (v4 §5) are also unchanged and still open:

10. A first T10 draft's mid-round self-correction (v4 §5 finding 10) — process finding only,
    already resolved in the committed `3d89c86`. No action needed.

11. Implementation Plan v7 D11(a)'s `buildPromptB()` excerpt code can total 1001 characters in the
    specs-section branch against its own stated 1000-character cap, by one character, in a path no
    current test checks. Flagged for `IMPLEMENTATION_VERIFICATION` / a future Plan revision.

12. **New, informational only — not a defect.** v4 §3.2 suggested a one-line header-comment update
    to `full-description.golden.spec.ts` noting it must stay green across future authorized
    FROZEN-file edits. `TEST_WRITING`'s recalibration round did not make that header edit (confirmed:
    not present in the diff this round independently verified). It does not block `PASS` — the
    fixture itself is correctly recalibrated and green — but is worth a follow-up for the next Story
    that legitimately edits these files, so it isn't caught by the same blast-radius gap T8 was.

## 6. Files changed (summary)

Committed this round:
- `c5e6139` — `src/prompts/task-b.spec.ts` (destructuring fix, §3.1). Staged and committed as
  `TEST_WRITING` left it; `so-builder` did not edit it.
- `1c02c89` — `src/prompt-core/master-system-prompt.ts`, `src/prompts/task-a.ts` (T8's FROZEN-file
  edit, already applied and authorized in a prior round), `.arch-guard-checksums` (both FROZEN rows
  rebaselined in the same commit, per AGENTS.md §9), `src/prompt-core/master-system-prompt.spec.ts`,
  `src/prompts/task-a.spec.ts` (T8's own pinning tests), `test/fixtures/golden/full-description-prompts.json`
  (recalibrated by `TEST_WRITING`, independently re-verified this round, §3.2).

Committed in earlier rounds (unchanged): `df9ec36`, `e48fa1b`, `a01bd12`, `4dfccf0`, `fb03d68`,
`fbf4859`, `ad4c678`, `c78e6da`, `3d89c86`, `0c14353`, `3e36e4e`, `c48a51c`.

Not touched, not authorized: `src/prompts/task-c.ts`, `src/utils/output-validator.ts` (both FROZEN,
untouched, confirmed by `bash arch-guard.sh` against `HEAD`).

Not touched: `docs/workflow/workflow-state.yaml`, `docs/workflow/history.jsonl`,
`docs/workflow/active-story.yaml`, `docs/catalog/stories.yaml` — `so-orchestrator`'s alone, per
this skill's own constraints; left exactly as found in the working tree.

## 7. Conclusion

All 12 in-track tasks for US-3.1 (T1-T12) are done and committed. The full test suite is green
against `HEAD` — 3884/3884 logic tests passing (3 pre-existing, unrelated skips), 23/23 component
tests passing, 0 failures across both runners. Lint is clean. `bash arch-guard.sh` passes every
rule, including FROZEN-file integrity. No test was weakened, skipped, or had its expected value
altered to reach this state — the two defects blocking v4 (a genuine destructuring bug in a test
file, and a stale golden fixture not yet recalibrated for an authorized FROZEN-file change) were
both fixed by `TEST_WRITING` at the source, and both fixes were independently re-verified here
before being committed. `IMPLEMENTATION` is complete for this track and this Story.
