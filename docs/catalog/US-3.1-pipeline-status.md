---
artifact: pipeline_status
story: US-3.1
version: 3
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-09-27T10:00:00Z
updated_at: 2026-09-28T07:37:00Z
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
| T7 | angular | **done, with one disclosed finding** | `ad4c678` | Rebuilt in full against Implementation Plan v7's D5/D5(e)/D5(f) design (v2's own stash, popped and verified this round — see §2). All of T7's own named tests pass (174/174 across the four target files); the two pre-existing tests v2 reported as blocked now pass against `TEST_WRITING`'s v3 recalibration. One plan-conformance defect found via due diligence on `TEST_WRITING`'s F5, not covered by any test — see §5 finding 8. |
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
`src/prompts/task-b.ts`); AGENTS.md §9's stop-and-report applies to both — see §4 for the precise
gap (a Story-level authorization already exists for both; the missing piece is the in-session
stop-and-confirm ritual). `stash@{1}` (v1's own stale, superseded attempt) is unaffected by this
dispatch and remains parked; it should not be popped.

## 4. T8/T10 — not attempted (frozen-file, wrong track, §9 stop)

Unchanged since v1/v2: both remain `track: prompt`, both name FROZEN files
(`src/prompt-core/master-system-prompt.ts`, `src/prompts/task-a.ts`, `src/prompts/task-b.ts`), and
this dispatch was explicitly scoped to `track: angular` with T8/T10 explicitly named out of scope.
**Correction to how v2 phrased this section: the Story-level §9 authorization for both tasks
already exists on paper** — T8's edit is pre-authorized by the Story's own D3 decision
(`docs/stories/US-3.1-qa-gate-brand-core-fixes.md`, "Resolved decisions"), confirmed by Task
Breakdown v6 §T8 Notes ("§9 stop, already recorded, not newly requested here"); T10's edit is
pre-authorized by OD-3/OD-7/OD-9 (`docs/decisions/US-3.1-open-decisions.md#4`), confirmed by Task
Breakdown v6 §T10 Notes ("Authorization is now fully confirmed, not merely proposed"). What is
still missing, per both Notes sections verbatim, is that **`so-builder` must still perform the full
§9 stop-and-confirm ritual in-session** (state exactly what changes and why, per AGENTS.md §9 steps
1-3) **before editing either file** — the paper authorization does not remove that ritual, and no
fresh, in-session "modify [filename]" instruction triggering it was given this dispatch. Per §9,
the next dispatch that intends to build T8/T10 must perform that stop and obtain explicit approval
before editing either file. See v1 §4 / v2 §4 / Task Breakdown v6 (T8 §790-836, T10 §950-1057) for
the full per-task breakdown of what each still needs; nothing about the underlying task scope has
changed.

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

8. **A verified, currently untested conformance gap between Implementation Plan v7's own D5(f)
   worked-example verification and the actual runtime behaviour of the code it specifies — found
   this round by acting on `TEST_WRITING`'s F5 finding, not inherited from any prior version.** F5
   asked `so-builder` to verify Specification v17's "Bambu Lab. Hardened Steel" worked example
   (spec lines ~1814-1822) against the real implementation. Verified with a throwaway diagnostic
   script (`npx vitest run` against a temporary, never-committed spec file, deleted immediately
   after use — not a test addition) exercising `validateHeadingStyleDoc()` directly on a
   `schemaVersion: '4.0'` doc with `opts.input.name = "Bambu Lab Hardened Steel Nozzle 0.4 mm"`
   (`productShort` of that name, confirmed by the same script: `"Bambu Lab Hardened Steel"`).

   Implementation Plan v7 §D5(f) (lines 687-698) explicitly claims to have "verified against every
   one of FR-7's own worked examples, re-derived independently" and states the candidate
   `"Bambu Lab. Hardened Steel"` (the added period relocated to an interior position) **passes**.
   **The actual code returns an error** for this exact candidate — but not for the reason the Plan
   discusses (the occurrence-count/trailing-position shape mechanism, D5(f)'s own subject): it fails
   one step earlier, at the **presence** check (D5(e)'s `hasProductCore`/
   `productNamePatternWithUnitLocale`), which requires `productShort(full)` ("Bambu Lab Hardened
   Steel") to appear as a **contiguous** literal substring of the candidate. The inserted `". "`
   between "Lab" and "Hardened" breaks that contiguity, so `hasProductCore` returns `false` and the
   candidate is rejected with `"omits the required brand core"` — the shape check (where the Plan's
   own worked-example arithmetic lives) is never reached, because D5(f)'s own design gates it on
   presence passing first ("Shape check only runs once presence has already passed for that leaf").

   This is a defect in the Plan's own verification claim, not in `so-builder`'s implementation of
   what the Plan specifies: the code was built exactly to D5(e)'s presence mechanism and D5(f)'s
   presence-gated shape mechanism as both are literally written, and that combination cannot produce
   the Plan's claimed "passes" outcome for its own cited example. Confirmed for the other three
   worked examples in the same Plan section (full unframed name passes; both period-count/
   trailing-position failure cases correctly fail) — only this one, interior-relocation case
   diverges from the Plan's claim.

   **Not fixed in this dispatch.** No test currently pins either the Plan's claimed behaviour or the
   code's actual behaviour, so this is not a "red test in T7's scope" the dispatch instructions
   direct `so-builder` to fix, and closing it requires a design decision beyond this skill's
   remit (so-builder does not decide architecture) — plausible directions include loosening D5(e)'s
   presence match to tolerate an interior single-character insertion already accepted by the shape
   check, or explicitly accepting this interaction as a further, disclosed residual the way several
   other edge cases in this Specification's own history already were. **Recommend routing to
   `ARCHITECTURE_PLANNING` (via `changes_required_plan`, once this reaches `IMPLEMENTATION_VERIFICATION`,
   or directly if a human elects to loop back now) to correct D5(f)'s worked-example verification
   and decide the presence/shape interaction, followed by a `TEST_WRITING` pass to pin whichever
   behaviour is chosen** — not a silent `so-builder`-authored fix to the presence-matching mechanism.

9. **`ad4c678` alone, checked out in isolation, reproduces v2's measured red state (2 failing
   tests), not a green one.** `so-builder` does not own `heading-style.spec.ts` or
   `content-orchestrator.simplified.spec.ts` and did not stage or commit `TEST_WRITING`'s v3
   recalibration of either — both remain uncommitted in the working tree, as `TEST_WRITING`'s own
   artifact (§6). Every measurement in §2.3 was taken against the working tree (popped T7 code +
   `TEST_WRITING`'s uncommitted spec edits together), which is genuinely green — but `git checkout
   ad4c678 -- src/utils/heading-style.ts src/utils/repair-strategy.ts` against an otherwise-clean
   tree at the prior commit would not be, because the two recalibrated spec files it depends on
   would be missing. This is expected under this pipeline's own division of ownership (`so-builder`
   commits code, `TEST_WRITING` commits tests, separately), but it means **`ad4c678` and
   `TEST_WRITING`'s v3 spec edits must land together, in the same Pull Request, with the spec edits
   committed no later than `ad4c678`**, or AGENTS.md §13 bisectability breaks for this range. Flagged
   for `PR_PREPARATION`'s own commit-hygiene check.

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
