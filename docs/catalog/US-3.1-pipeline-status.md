---
artifact: pipeline_status
story: US-3.1
version: 3
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-09-27T10:00:00Z
updated_at: 2026-09-28T10:45:00Z
supersedes: docs/catalog/US-3.1-pipeline-status.md#2
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

**Verdict (attempt 2 of the IMPLEMENTATION retry, angular track, T7 only): `CHANGES_REQUIRED` →
`partial`.** T7 is now **done and committed** (`ad4c678`) — `TEST_WRITING`'s v3 recalibration of
the two tests v2 reported as blocking (`heading-style.spec.ts:268-272`,
`content-orchestrator.simplified.spec.ts:351-364`) is independently verified correct (§2) and both
now pass against T7's popped code, with no regression anywhere else in either runner. This
dispatch's own scope was T7 alone; **T8/T10 remain not attempted** (`track: prompt`, FROZEN files,
no fresh in-session "modify [filename]" instruction this dispatch — unchanged since v1/v2, see
§4), so `IMPLEMENTATION` as a whole is not yet complete for this Story and the verdict is
`partial`, not `PASS`.

Branch: `feat/US-3.1-qa-gate-brand-core-fixes` (unchanged).

## 1. Task outcomes

| Task | Track | Outcome | Commit | Notes |
|---|---|---|---|---|
| T1 | angular | done | `df9ec36` | Unchanged since v1/v2. |
| T2 | angular | done | `e48fa1b` | Unchanged since v1/v2. |
| T3 | angular | done | `a01bd12` | Unchanged since v1/v2. |
| T4 | angular | done | `4dfccf0` | Unchanged since v1/v2. |
| T5 | angular | done | `fb03d68` | Unchanged since v1/v2. |
| T6 | angular | done | `fbf4859` | Unchanged since v1/v2. |
| T7 | angular | **done** | `ad4c678` | Rebuilt in full against Implementation Plan v7's D5/D5(e)/D5(f) design (v2's own stash, popped and verified this round — see §2). All 26 of T7's own named tests pass; the two pre-existing tests v2 reported as blocked now pass against `TEST_WRITING`'s v3 recalibration. |
| T8 | prompt | **not attempted** | — | Out of scope this dispatch (angular only); FROZEN file, no fresh-session "modify" instruction. Unchanged since v1/v2 — see §4. |
| T9 | angular | done | `c78e6da` | Unchanged since v1/v2. |
| T10 | prompt | **not attempted** | — | Out of scope this dispatch; FROZEN `task-b.ts`, no fresh-session "modify" instruction. Unchanged since v1/v2 — see §4. |
| T11 | angular | done | `0c14353` | Unchanged since v1/v2. |
| T12 | angular | done | `3e36e4e` | Unchanged since v1/v2. |

## 2. T7 — popped, independently verified, committed

### 2.1 What was popped

`git stash pop stash@{0}` — v2's own parked T7 rebuild (`src/utils/heading-style.ts`,
`src/utils/repair-strategy.ts`), identical to the diff v2 §3.1 described. The pop applied cleanly
with no conflicts against the working tree (which by this point already carried `TEST_WRITING`'s
v3 recalibration of the two spec files, uncommitted). `git stash show -p stash@{0}` was read in
full before popping and confirmed to match v2's own description exactly — this was v2's own prior
work, not a fresh rebuild.

### 2.2 The two recalibrations — verified independently, not taken on faith

Per this dispatch's own instruction and `so-builder`'s constraint (never trust a test change
without checking it against the actual design), both of `TEST_WRITING`'s v3 recalibrations were
read and reasoned through against T7's actual code before running anything:

1. **`heading-style.spec.ts:268-272`, `'tolerates the unit-spacing normalization…'`.** Diffed
   against the last-committed version (`git show HEAD:src/utils/heading-style.spec.ts`): the
   assertion itself (`issues.filter(i => i.rule === 'heading-product-name-stuffing')).toHaveLength(1)`)
   is **unchanged** — the filter already existed in the committed version. The only change is the
   fixture: a generic, non-product-named heading (`h2('Загальний вступ')`) is now prepended before
   the tested heading, so the tested `<h2>` is no longer structurally first (and therefore no
   longer blessed) in a single-heading document. This is exactly the fixture-only fix v2 §3.2
   described as needed — no assertion was weakened, only the fixture's shape changed, and the
   test's own stated intent (digit/letter-spacing tolerance in the pattern match) is preserved
   because the heading no longer needs blessed-position exemption to be evaluated.
2. **`content-orchestrator.simplified.spec.ts:351-364`, `'the FAQ request does not depend on the
   template…'`.** v2's own suggested recalibration (§3.2, finding 2) was to pass `name` only on the
   `full` harness's `generate()` call. `TEST_WRITING`'s actual v3 fix is broader and correct where
   v2's own suggestion would not have been: it gives **both** harnesses (`simp` and `full`) the same
   `name: 'Ortur H20 20 W'`, and additionally overrides `sparePartsDoc()`'s `localizedName` on the
   `simp` side to the same value. Reasoned through: `simp` uses a `schemaVersion: '4.0'` doc, so
   FR-7 checks `doc.localizedName` there, not `input.name` directly — patching only `full`'s `name`
   (v2's own suggestion) would have left `simp`'s `sparePartsDoc().localizedName` at its own
   unrelated default, which does not itself trip FR-7 (it already matches `simp`'s own default
   `input().name`) but would make the two harnesses' FAQ prompts diverge on the interpolated
   product name, failing the test's own `userContent` equality assertion for a new reason.
   `TEST_WRITING`'s test-generation report v3 records this exact failure mode as empirically
   observed before arriving at the two-sided fix. The applied recalibration is therefore the
   correct form of v2's own weaker suggestion, not a deviation from it.

Neither recalibration weakens an assertion, skips a case, or narrows what is checked — both are
fixture/input-data corrections only, matching AGENTS.md §7.7.

### 2.3 Measured state (real command output, after popping and before committing)

| Check | Result |
|---|---|
| `npx vitest run src/utils/heading-style.spec.ts src/utils/repair-strategy.spec.ts src/utils/heading-style.v4.spec.ts src/services/content-orchestrator.simplified.spec.ts` | **4 files passed, 174 passed (174), 0 failed** — includes both previously-blocking tests, now green. |
| `npm run test:logic` (`vitest run`, full suite) | 3 files failed, **10 failed** / 3874 passed / 3 skipped (3887). All 10 are T8/T10 (`master-system-prompt.spec.ts` 1, `task-a.spec.ts` 1, `task-b.spec.ts` 8) — pre-existing, out of scope, unchanged from v2's own baseline. Zero failures in `heading-style.spec.ts`, `repair-strategy.spec.ts`, `content-orchestrator.simplified.spec.ts`, or `content-orchestrator.doc-gate.spec.ts` (the one collateral test v2 §2/`TEST_WRITING`'s report expected to self-resolve once T7 landed — confirmed green). |
| `npm run test:components` (`ng test`) | 2 files, **23 passed**, 0 failed. |
| `npm run lint` (`tsc --noEmit`) | **clean, 0 errors**. |
| `bash arch-guard.sh` | **ALL CHECKS PASSED** — all five FROZEN checksums unchanged (T7's two files are not FROZEN; T8/T10 never touched). |
| `npm run test:coverage` / `npm run build` / `npm run validate:harness` | not run — `QUALITY_GATE`'s concern, per this artifact's own v1/v2 convention (unchanged reasoning). |

3874 passed vs. v2's own recorded 3872 — the delta of 2 is exactly the two previously-red,
now-recalibrated-and-green tests; every other count (10 failed, 3 skipped, 3887 total) matches v2's
baseline exactly, confirming zero regression anywhere else.

### 2.4 Committed

`ad4c678` — `src/utils/heading-style.ts` (full rewrite of `checkProductNameStuffing`/
`checkProductNameStuffingDoc`, plus the new `productNamePatternWithUnitLocale()`/
`hasProductCore()`/`localizedNameShapeIssue()` helpers) and `src/utils/repair-strategy.ts` (new
`heading-brand-core-missing` entry only) — staged and committed by exact path, nothing else. No
test file, fixture, `vitest.config.ts`, or FROZEN file was touched by this commit.

## 3. Why `partial`, not `PASS`

`IMPLEMENTATION`'s own `loop_back` map (`docs/workflow/stage-map.yaml`) defines `partial ->
IMPLEMENTATION` for exactly this state: this dispatch's named task (T7) is complete and verified,
but the Story's task breakdown still names two not-yet-attempted tasks (T8, T10) before
`IMPLEMENTATION` as a whole can hand off to `QUALITY_GATE`. Both remain `track: prompt` and both
name a FROZEN file (`src/prompt-core/master-system-prompt.ts`, `src/prompts/task-a.ts`,
`src/prompts/task-b.ts`); AGENTS.md §9's stop-and-report applies to both and neither has received
the required explicit approval or a fresh in-session "modify [filename]" instruction, so they stay
untouched — see §4 for what each still needs. `stash@{1}` (v1's own stale, superseded attempt) is
unaffected by this dispatch and remains parked; it should not be popped.

## 4. T8/T10 — not attempted (frozen-file, wrong track, §9 stop)

Unchanged since v1/v2: both remain `track: prompt`, both name FROZEN files
(`src/prompt-core/master-system-prompt.ts`, `src/prompts/task-a.ts`, `src/prompts/task-b.ts`), and
this dispatch was explicitly scoped to `track: angular` with T8/T10 explicitly named out of scope.
No fresh, in-session "modify [filename]" instruction was given for either. Per §9, the next
dispatch that intends to build T8/T10 must perform the stop (name the exact frozen-file change and
why) and obtain explicit approval before editing either file. See v1 §4 / v2 §4 for the full
per-task breakdown of what each still needs; nothing about that description has changed.

## 5. Non-blocking findings

Findings 1-6 are unchanged from v1/v2 (T1's `step()` narrowing, the T4/T9/T11/T12 file-contention
serialization, the FR-6 degenerate-exemption reading, T6's `repairReportExtraFile()` extraction,
the HTML-path `closing`/blessed-CTA correction, the `fieldInstruction` line-wrap fix) — all already
landed and committed; not repeated here in full, see v2 §5.

7. **`TEST_WRITING`'s test-generation report v3 also records one self-correction of its own v2
   over-claim** (its "Collateral fixture/mock changes" item 3, on
   `content-orchestrator.simplified.spec.ts`'s exposure to `heading-brand-core-missing` via
   `runDocGate()` called internally by `ContentOrchestratorService.generate()`, not by direct symbol
   reference). This is the same file as the second recalibrated test above; recorded here for
   traceability since it explains why that test's exposure was not caught until this round.

## 6. Files changed (summary)

Unchanged since v1/v2 for the committed T1-T6/T9/T11/T12 work (see v2 §6).

Newly committed this round (`ad4c678`): `src/utils/heading-style.ts`, `src/utils/repair-strategy.ts`
— exactly the two files T7 names, nothing else.

Not touched: `src/prompt-core/master-system-prompt.ts`, `src/prompts/task-a.ts`,
`src/prompts/task-b.ts`, `src/prompts/task-c.ts`, `src/utils/output-validator.ts` (all five FROZEN
files — `bash arch-guard.sh` confirms all five checksums unchanged).

Not touched, not owned by `so-builder` (verified against, not edited — see §2.2):
`src/utils/heading-style.spec.ts`, `src/services/content-orchestrator.simplified.spec.ts` (both
already recalibrated by `TEST_WRITING` before this dispatch began; both remain uncommitted, as
`TEST_WRITING`'s own artifact, not this skill's to stage or commit).
