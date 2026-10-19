---
artifact: test_strategy
story: US-9.1
version: 5
status: DRAFT
owner: so-test-writer
created_at: 2026-10-18T15:10:00Z
updated_at: 2026-10-19T18:30:00Z
supersedes: docs/tests/US-9.1-test-strategy.md#4
inputs_consumed:
  - key: story
    version: 6
  - key: specification
    version: 8
  - key: impact_analysis
    version: 6
  - key: implementation_plan
    version: 7
  - key: task_breakdown
    version: 6
  - key: plan_review
    version: 6
open_decisions_blocking: false
---

# Test Strategy - US-9.1: no picture references, livelier descriptions (track prompt) - records refresh after the removal and the AC-11 / AC-12 waiver

## Revision 5 (this version; RECORDS-REFRESH, no test written)

Written on 2026-10-19 at HEAD `313f727` (branch base `6546db8`). **No test file, source file, fixture or golden was written, edited, deleted or moved by this revision**; only the three `docs/tests/US-9.1-*` artifacts changed. The tests of the removal were written and committed in `1b73c8a` (revision 4 below) and the builder landed T43 to T49 in `fd9b052`, `439cc1e`, `19ed848`, `4556cb4`, `291bc1e`, `bad5161`, `86b0d62`. Read-only confirmation at HEAD `313f727`: `npx vitest run` (the logic runner, `npm run test:logic`) -> **221 files / 7569 passed / 3 skipped / 0 failed (7572)**; `npm run test:components` -> **2 files / 32 passed**. The ten files that revision 4 recorded as RED (200 tests, 32 of them inverted existing tests) were re-run on their own: 611 of 611 tests pass (see the generation report). The 7569 / 7572 figures equal the SIMULATION figures of revision 4 ("Satisfiability" below), so the builder's end state matches the simulated one.

What changed since revision 4, and only this:

1. **Story v6 / Specification v8 (APPROVED) change one thing: the acceptance status of AC-11 and AC-12.** Their hard script criteria are WAIVED by the owner on manual testing (history event `ts` 2026-10-19T14:50:23Z) and were not measured. FR-34 and FR-35 keep their criterion text marked WAIVED. Task T51 (the manual live runs) is SUPERSEDED by the waiver (breakdown v6; no replacement task). Consequently this strategy states no test, no run and no coverage for AC-11 or AC-12, and the matrix rows say "WAIVED (owner, Story v6, 2026-10-19; not measured)" under the PROPOSED DEFAULT of OD-27 (accepted at the spec gate); RECONCILIATION reports them as non-blocking findings. Nothing in this strategy may be read as saying the runs will be performed.
2. **The RED-as-of-TEST_WRITING statements are historical.** Every pin that revision 4 recorded as RED is GREEN at HEAD `313f727`, from the task that owned it. Where this document says "RED", it means "red at the revision 4 run (HEAD `09f87dc`)"; the current state is green. The sanctioned red window closed with T43 (`fd9b052`).
3. Inputs brought current (Story v6, Specification v8, impact analysis v6, plan v7, breakdown v6, plan review v6). No requirement, handle (P0 to P14), assertion or tested behaviour changed; the four corrected Specification readings (P14) are carried unchanged.

## Revision 4 (historical; TEST_WRITING for the REMOVAL of the withdrawn operator-notes feature, committed in `1b73c8a`)

Run on 2026-10-19 at HEAD `09f87dc` on branch `feat/US-9.1-no-picture-references-and-livelier-descriptions`; branch base `6546db8`. The owner withdrew the operator-notes feature (Story v5); Specification v7 and
plan v6 / breakdown v5 (APPROVED) were the design of its removal. v3 of this strategy (and the v3 matrix and report) mapped AC-9 to the operator-notes specs and is **stale for everything about operator notes**; the
parts about the surviving requirements (FR-1 to FR-23, FR-27, FR-32 to FR-39) are carried over below, condensed. Statements below about "this run" are about that revision 4 run.

This run wrote only tests, test fixtures and these three artifacts. No `src/` production file, no FROZEN file, no `.arch-guard-checksums`, no golden JSON was edited (`git status` over `src ':!*.spec.ts'` and
`test/fixtures/golden` is empty; `bash arch-guard.sh` exits 0). Nothing was committed. Owner scope: "the whole feature, nothing extra": the handles P0 to P14 were followed exactly and no test was added or removed
beyond them (two guards of a deleted spec that the plan does not relocate are listed as findings in the generation report instead of being re-added).

## Approach (unchanged in kind)

- **Assertions are written from the Specification (v7) literals, never from the plan's proposed code, a captured model run or the golden's own bytes.** The Specification's "Assertion convention" is followed everywhere: case-sensitive comparison over text with every run of whitespace collapsed to one space (plan-review N5: the second FR-42 literal crosses a line break in the master source and in the golden JSON string, so the pins collapse before comparing); only the listed Assert-present / Assert-absent strings are normative.
- **Everything runs in the logic runner (`npm run test:logic`).** The components runner keeps its two remaining specs (`content-template-select`, `model-settings`; 32 tests) and nothing new was added there: the only component of the feature (`OperatorNotesFieldsComponent`) is deleted. Services are driven with the established pattern (`import '@angular/compiler'` first, `Injector.create`, never TestBed); the model is stubbed at the `LlmService` boundary only.
- **One describe (or one file) per owner task**, so no group stays red for a reason a later task owns (breakdown constraint 2).
- **Red for the right reason (at the revision 4 run; all green now).** Every new pin failed by assertion on the removed state (`expected '[ROLE] You are an expert...' to contain 'the provided [Raw Description]...'`; `the withdrawn flag was accepted: expected +0 to be 2`; `expected '[INPUT DATA]...' not to contain 'STRAY-NOTE-7731'`), never on a missing import or module.
- **Absence pins cannot pass vacuously.** Every per-file source-scan block first requires the file to exist; the stray-property pins have paired controls (the gate IS able to report 777; FAQ calls ARE made when `supplementalContent` is set); the token set carries a self-test that each token matches its own canonical form.
- **Cast constraint (plan W8, breakdown F6).** Every pin that attaches a stray `operatorNotes` property (P5, P6, P7, P9a) does it through `unknown` / a `Record<string, unknown>`, never a typed literal, so it compiles BEFORE and AFTER T49 removes `ProductInput.operatorNotes`. Verified, not assumed: see "Satisfiability" below (tsc clean on a scratch tree where `types.ts` is at its base bytes).

## Test layers (what is tested at which level, which runner)

| Layer | Runner | What | Files |
|---|---|---|---|
| Byte oracles | logic | FR-27 `userContent` oracle (Tier A strict, Tier B video / marker / both, Doc-wrapper remainder); D15 pre-change oracle; amended Task C description guard | `src/prompts/task-a.user-content.golden.spec.ts` (notes-empty block removed, P0), `payload-oracle.d15.spec.ts`, `task-c.description-bytes.spec.ts` |
| Prompt-wording pins | logic | Vision pre-pass FR-1..FR-4; Doc FIGURE PLACEMENT FR-10; `task-a.ts` three FR-11 items; C3D override FR-12; EXPERT3D overlay FR-22; master FR-5..FR-9, FR-20 | see matrix AC-1 to AC-3, AC-8 |
| **Master source scope (NEW, P1)** | logic | the two `[SOURCE FIDELITY]` bullets name three input blocks and no `Operator Notes` (FR-42, FR-44 item 1) | `src/prompt-core/master-system-prompt.source-scope.spec.ts` |
| **Golden oracle pin (NEW, P2)** | logic | block 0 of the ten golden cases holds the FR-42 literals and no `Operator Notes`; the golden is read as data and never written (FR-43) | `src/prompts/full-description.golden.fr43-oracle.spec.ts` |
| Reach / inheritance (P3, P4 INVERTED) | logic | master block 0 reaches Task A (7 stores), Task C description translation (16 pairs x 2), the optimizer (6 inputs); the R22 / T31 describes now assert block 0 does NOT name `Operator Notes` | `task-c.master-reach`, `optimizer.master-reach`, `full-description.golden.us91` |
| **Stray-property inertness (NEW, P5)** | logic | no `[Operator Notes]` block for any FR-27 input; a stray `operatorNotes` changes no `buildPromptA` / `buildPromptADoc` payload | `task-a.user-content.golden.spec.ts` (appended blocks) |
| **Orchestrator pins (NEW, P6, P7)** | logic | a stray value grounds no number in the alt/figcaption gate (paired sources comparison); a stray value triggers no FAQ call | `src/services/content-orchestrator.stray-operator-notes.spec.ts` |
| **Legacy history (NEW, P9)** | logic | the real `HistoryService` constructor restores an entry that carries `operatorNotes`; source pins that `restoreHistory` / `buildGeneratorInput` name no notes | `src/services/history.service.legacy-entry.spec.ts`, `src/app/app.component.no-operator-notes.spec.ts` |
| **Script rejection (NEW, P8)** | logic (spawn) | the four `--notes-*` flags are rejected as unknown arguments, exit 2, no report, usage lists none | `test/measure-description.cli.spec.ts` |
| **Source scan (NEW, P10)** | logic | no token of the widened set in non-spec `src`, `tools`, `server`; the four deleted files and the folder do not exist | `test/operator-notes-source-scan.spec.ts` |
| Relocated / coupled (P11, P12) | logic | `NUMERIC_SOURCE_FIDELITY_RULES` byte pin; FAQ-negative helper literal list | `src/prompt-core/constants.numeric-source-rules.spec.ts`, `test/fixtures/faq-pipeline.ts`, `test/faq-pipeline.master-leak.spec.ts` |
| Detector, warning, message units | logic | `findImageDeixis` (7 languages), carriers, issue builder, `image-caption-deixis`, `image-deixis`, AC-4 templates, orchestrator warnings | unchanged: `image-deixis.spec.ts`, `image-deixis.import-cycle.spec.ts`, `image-placeholder.deixis.spec.ts`, `output-validator.image-deixis.spec.ts`, `video-manifest.pointer-free.spec.ts`, `content-orchestrator.deixis-messages.spec.ts` |
| Metrics and CLI | logic | D-1 to D-10 on hand-computed fixtures; spawn test (exit codes, `process.version` first line, failure paths, absent-number exit, `--specs`, `--name`) | `description-metrics.spec.ts` (NOT edited, B4), `test/measure-description.cli.spec.ts` |
| Characterization | logic | `validateStructuralParity` is blind to sentence changes inside `<p>` (Q-TRANS option 3) | `structural-parity.sentence-blind.spec.ts` |

## What was written, handle by handle (breakdown v5, P0 to P14)

The matrix holds the same table with the observed state per row ("Handle map"). In one line each:

- **P0** deleted the 8 dedicated specs (7 logic + 1 component runner) and edited `golden-A`, the CLI spec, `task-a-doc.figure-placement.spec.ts` and the inputs-file comment exactly as prescribed; **nothing else**.
- **P1, P2** new pins, RED on arrival (5 of 6, 4 of 5); **green at HEAD `313f727` (6 of 6, 5 of 5)** since T43. **P2 did not write, substitute or commit the golden**: the builder regenerated it in T43 (`fd9b052`; raw-text substitution, plan W6).
- **P3, P4** invert EXISTING green tests (below). **P5** to **P10** new pins. **P11, P12** relocation / coupling, green. **P13** re-verification, no edits. **P14** is the section "Four corrected Specification readings" below.

## Existing tests inverted or touched (AGENTS.md section 7.7: requirement-driven, not a weakening)

- **P3: `src/prompts/full-description.golden.us91.spec.ts`, T31 (lines 114 to 117).** It asserted block 0 CONTAINS `[Operator Notes]` and NOT `three input blocks`. FR-42 (PROPOSED DEFAULT of OD-21 (a), ratified by the plain approval) requires the opposite, and Story v5 withdrew the feature, so the test is inverted to the FR-42 literals over the ten cases. Line 128 (the `translate/*` cases carry no `[Operator Notes]`) stays: it is absence-shaped and true.
- **P4: `src/prompts/task-c.master-reach.spec.ts` (R22, 16 pairs) and `src/prompts/optimizer.master-reach.spec.ts` (6 inputs).** They asserted block 0 names `[Operator Notes]` while `userContent` does not. Inverted: block 0 does not contain `Operator Notes`; block 1 and `userContent` still do not. Headers updated. Lines 90 / 52 stay.
- **Historical RED, current green.** At the revision 4 run (HEAD `09f87dc`) these three inversions turned pre-existing green tests RED (32 tests) and were the only sanctioned red among existing tests: they preceded T43 (TEST_WRITING precedes IMPLEMENTATION), were red by design until T43 reverted the master, and did not co-commit with it (breakdown F3, plan "The sanctioned red window", per-task gate convention N6 of review v3, precedent `3f9ae29`). Surfaced for the human at HUMAN_PLAN_APPROVAL. Nothing else went red then (baseline 221 files / 7620 passed; the only failing files were the 10 listed in the report). **At HEAD `313f727` all 32 are green**, the red window closed with T43 (`fd9b052`), and the full logic suite is 221 files / 7569 passed / 3 skipped / 0 failed.
- **P12** `test/fixtures/faq-pipeline.ts` (`US91_MASTER_LITERALS` loses `'[Operator Notes]'`), `test/faq-pipeline.master-leak.spec.ts` (the `arrayContaining` entry dropped, title fixed, `>= 11` to `>= 10`). The detector's literal set shrinks by one with no loss: the string is no longer in the master after T43, and the other ten literals and the two positional windows stay (extend, never narrow).
- **NOT touched (B4):** `src/utils/description-metrics.spec.ts` and `src/prompt-core/master-system-prompt.liveliness.spec.ts`. Their stale titles ("... EVERY text given (description, specs, name, notes)"; "STRICT INPUT SCOPE is still present (it is extended by FR-29, T31)") are harmless prose and both specs test surviving requirements, which NFR-14's last sentence protects. If the human wants the titles fixed it is an explicit NFR-14 exception granted at the plan gate; none was granted.

### NFR-14 trace: every removed test -> the withdrawn stub it served (same table as the matrix)

| Removed | Withdrawn stub(s) | Replaced by |
|---|---|---|
| `src/prompts/operator-notes.spec.ts` (22) | FR-25, FR-26 | nothing (module deleted in T48); existence pinned by the scan |
| `src/prompts/task-a.operator-notes.spec.ts` (58) | FR-26, FR-27 notes side, FR-40 positive | P5 |
| `src/prompt-core/master-system-prompt.operator-notes.spec.ts` (16) | FR-29 (asserted `three input blocks` ABSENT: contradicts FR-42) | P1, P3, P4 |
| `src/services/content-orchestrator.operator-notes.spec.ts` (53) | FR-28, FR-30, FR-40 | P6, P7 (harness carried over), P11 (byte pin relocated) |
| `src/services/history.service.operator-notes.spec.ts` (6) | FR-31 item 1 | P9a |
| `src/app/app.component.operator-notes.spec.ts` (40) | FR-24, FR-28 guard, FR-31.3 guard, FR-41 call sites | P9b, P10 |
| `src/app/operator-notes-form-state.spec.ts` (28) | FR-25 form side, FR-31 items 2/4/5, FR-41 | nothing (class deleted in T46); pinned by the scan |
| `.../operator-notes-fields.component.spec.ts` (23, components runner) | FR-24 | nothing (component deleted in T46); pinned by the scan |
| `golden-A` `withNotes` + `EMPTY_NOTES` (120 tests) | FR-25 empty rule, FR-27 notes-empty contract | P5 |
| `cli` `NOTES_FLAGS` + 3 positive tests (6 tests) | FR-32 D-10 notes half | P8 |
| `figure-placement` stray-property cast case (1) | FR-26 / OD-19 (1b) cast case | P5 |
| `master-leak` `[Operator Notes]` literal (1 test + list entry) | FR-29 | P12 |

## Deviations from the handles' wording, with the reasons (for RECONCILIATION to accept or reject)

1. **P9a drives the REAL `HistoryService` constructor with `effect` mocked, not `Object.create(HistoryService.prototype)`.** The handle says "(via `Object.create(...)`)". The deleted spec used `Object.create` and only called `add()` and `JSON.stringify`; it never exercised RESTORE, and "restores a stored entry that carries `operatorNotes` without error" is the constructor's job (`localStorage.getItem` -> `JSON.parse` -> `history.set`, with a `catch` that discards the stored history). So the new spec stubs `localStorage`, mocks only the persistence `effect()` boundary (it needs the render schedulers a service spec must not pull in) and constructs the real service: it can fail if the restore throws, logs, or drops the entry. Stronger than the handle's form; no TestBed.
2. **P6's stray value is `Протестовано на 777 Вт` (a sentence), not the bare string `777 Вт`.** Found by running it: the orchestrator joins sources with `\n`, so a bare `777 Вт` after `Ortur H20` reads to `validateAltNumericFidelity` as the thousands group `20\n777` (one number, 20777), which hides whether 777 itself is grounded and made the grounding test pass at HEAD for the wrong reason. The sentence form keeps 777 a separate number, so the gate test is red at HEAD for the right reason. The paired "sources string equals the run without the property" test is independent of this and fails at HEAD either way.
3. **Header comments were edited** in `task-a-doc.figure-placement.spec.ts`, `test/measure-description.cli.spec.ts`, `task-a.user-content.golden.spec.ts`, `test/fixtures/task-a-user-content-inputs.ts` (line 17) and `test/faq-pipeline.master-leak.spec.ts` / `test/fixtures/faq-pipeline.ts` (comments naming FR-29), so that they stop describing behaviour that no longer exists. Prose only; no assertion changed by the edit of a comment.
4. **P10 lists four deleted paths plus the folder, not "five modules"** (plan-review N2: `git ls-files` shows four non-spec files). **P10 is split one describe per owner** (T43 to T49) as the breakdown prescribes.
5. **P7 adds a control** (with `supplementalContent` set the FAQ calls ARE made) so the "no FAQ call" assertion cannot pass because the detector is blind. The handle's checks (empty `faqCalls`, equality with the no-property run, the line-322 block unmodified) are all kept.

## Four corrected Specification readings (P14; the plan's "Recording obligation", B5)

RECONCILIATION reads the Specification and the test artifacts, not the plan. The Specification (v8) is NOT edited (v8 changes only the status of AC-11 / AC-12; the four readings below are carried unchanged from revision 4, and their evidence lines are as taken at HEAD `09f87dc`). Read it with these four corrections; each has the evidence command run in this run (real output). The same text is in the `ac_test_matrix`.

1. **The branch base is `6546db8`, not `120dcbc`**, wherever the Specification says `120dcbc` (FR-27, FR-42, FR-44 item 4, NFR-13, Scope "Other files"); every net-diff oracle uses `6546db8`.
   `git merge-base HEAD origin/main` printed `6546db83ef4005e9d6a57baf51adf0b35df8d3c7`; `git merge-base HEAD main` printed `120dcbc0d42b3160078cacb682dd00cc48157ca3` (the stale LOCAL `main`); `git merge-base --is-ancestor 6546db8 HEAD` exits 0.
2. **The FR-44 item 4.2 relied-on block is the successor `describe('R6 (human resolution) ...')` at line 322 of `src/services/content-orchestrator.simplified.spec.ts`**, passing unmodified.
   `sed -n 322p src/services/content-orchestrator.simplified.spec.ts` printed `describe('R6 (human resolution) — FAQ artifact: data-driven, one uk-UA master translated into all store languages, any template', () => {`.
3. **FR-43's count is 20 occurrences of `[Operator Notes]` on 10 lines of the golden (at HEAD `09f87dc`), not "ten times"**; the Assert-absent is on the string `Operator Notes`.
   `git show HEAD:test/fixtures/golden/full-description-prompts.json | grep -o "\[Operator Notes\]" | wc -l` printed `20`; with `grep -c` it printed `10`.
4. **FR-43's "existing golden mechanism" is the plan's W6 procedure**: the builder regenerates in the commit that moves the master, by raw-text substitution (never parse/stringify, never `-u`), against the independent oracle (`6546db8` blob and the Specification literals; P2 / P3), with the diff reviewed (numstat 10/10), because no regeneration tool is committed.
   `git ls-files | grep -i golden` lists three specs and four JSON fixtures only; `grep -n -i golden package.json` printed nothing.

## Satisfiability (revision 4; scratch worktree, not part of the repository; removed afterwards. Confirmed by the real builder end state at HEAD `313f727`: 221 files / 7569 passed / 3 skipped / 0 failed)

To prove the new pins are satisfiable and compile after T49, the builder's end state was SIMULATED in a throwaway `git worktree` (node_modules junctioned): the reverse of `6db2885` for the master and of `7397081` for `task-a.ts`; `types.ts`, `app.component.ts`, `app.component.html` checked out from `6546db8`; the four files deleted; the orchestrator, `tools/measure-description.ts` and `description-metrics.ts` edited as T45 and T47 describe; the golden produced by the W6 raw-text substitution (the escaped HEAD region occurred exactly 10 times, region 1095 to 965 characters). Result: `tsc --noEmit` clean, the whole logic suite 221 files / 7569 passed / 3 skipped / 0 failed, the source scan finds no hit. This is the P13 re-verification as far as it can be made before the builder works (the `faq-pipeline` windows and `master-leak` spec, `task-c.description-bytes`, `payload-oracle.d15`, `image-markers`, `task-a.spec`, `task-a-doc.spec`, the `app.component.*` wiring specs all green against the reverted master). The scratch simulation is evidence, not the builder's work: nothing from it was copied into the repository.

## Oracle capture (T1, T37), the amended Task C guard (T20), the FAQ-negative helper (F7): surviving, condensed

- `test/fixtures/golden/task-a-user-content.json` (31 cases = 4 stores x 6 Tier A inputs + 4 video + 2 marker + 1 video-plus-marker; Doc-wrapper remainder with and without a hook) and `optimizer-faq-pre-change.json` were captured from the branch base (`_meta.base` `6546db83...`, `task-a.ts` checksum `0421226c...`); never regenerated after implementation started (7.7). Neither is touched by the removal (T50 checks `git diff 6546db8` empty).
- `task-c.description-bytes.spec.ts` compares block 0 of the 96 Task C prompts with the live master and pins block count, `cache` flags, block 1 and `userContent` by digest against the byte-unchanged `task-c-description-prompts.json`. **It cannot see that the master changed (plan R4)**: the golden `c/*` cases, P2, P3, P4 are the only pins on the new bytes.
- `test/fixtures/faq-pipeline.ts` `masterPromptBlocks`: the positional windows `slice(0, 400)` and `slice(3000, 3400)` plus constant windows plus `US91_MASTER_LITERALS`. Re-verified in the plan (R6) and in the simulation: `slice(0,400)` is identical after the revert; `slice(3000,3400)` straddles the bullets and equals the `6546db8` window afterwards; both still discriminate. Extend, never narrow (7.7): a window judged weaker returns here.

## Deliberately not unit-tested, and why

- **Model behaviour** (does the model stop pointing at pictures, is the text livelier): no unit test can prove it (Specification note D). The live runs that were to measure it (AC-11 / AC-12 hard script criteria, FR-34, FR-35, task T51) are **WAIVED by the owner (Story v6, Specification v8; history `ts` 2026-10-19T14:50:23Z) and were not measured**; T51 is superseded and nothing replaces it. This strategy therefore holds no test, no run and no coverage claim for AC-11 or AC-12: the headline outcomes (0 picture references, 0 invented numbers) are accepted on the owner's word, not on script evidence, and no live evidence exists to be ruled on (plan risk R5 is superseded with T51).
- **Translator and optimizer drift** (R1a, R1d, R7a): declared residual risk (note G); only the characterization pin on `validateStructuralParity`.
- **`AppComponent.restoreHistory()` / `buildGeneratorInput()` execution** (FR-44 item 3 "not shown, not sent"): no spec instantiates `AppComponent` (heavy DI, `templateUrl`, `effect()`, `localStorage` in the constructor; rejected at US-2.2). Pinned as ABSENCE of the reading code (P9b) plus the net-diff oracle `git diff 6546db8 -- src/app/app.component.ts` empty (T50). Plan R9, accepted.
- **The golden comparison "new block 0 equals old block 0 with the two bullets replaced"**: cannot be persistent (the old text leaves the tree at T43). It is T43 / T50 acceptance evidence, run as a one-off scripted diff by the builder.
- **Net-diff and arch-guard checks** (`git diff 6546db8 -- <file>` oracles, `.arch-guard-checksums` moving exactly two lines, numstat 10/10): verification commands for T50, not unit tests.
- **Tasks with no test by nature:** T50 (verification only). T51 is SUPERSEDED by the AC-11 / AC-12 waiver (breakdown v6): it is not pending, not manual and not executed.

## Contracts chosen by TEST_WRITING (not fixed by the Specification) - for reconciliation to see

Still in force: `measureDescription({ html, inputTexts, locale }, { parse, collect })` and its report keys (`deixisHits`, `figuresWithoutParagraphAbove`, `consecutiveFigures`, `connectiveCount`, `hardViolations`, `sentenceCount`, `meanSentenceWords`, `sigmaSentenceWords`, `hookWordCount`, `shortSentencesPerSection`, `absentNumbers`); `image-deixis.ts` names (`findImageDeixis`, `collectFigureDeixis`, `collectFigureDeixisFromDocument`, `imageDeixisIssues`, `DEIXIS_PATTERNS`); `figureCaptionWarnings(figures, locale)`.
**Withdrawn with the feature:** the `OperatorNotesFieldsComponent` shape, `operator-notes.ts` names, `OperatorNotesFormState`, and the four `--notes-*` flag names / file-path form (they were a contract chosen by TEST_WRITING; their rejection is now the FR-44 item 5 pin). **New in v4:** the stray value text `STRAY-NOTE-7731...` and `Протестовано на 777 Вт` (test data only); the source-scan file set (`.ts`, `.html` under `src`; `.ts`, `.html`, `.js`, `.mjs`, `.cjs`, `.json` under `tools` and `server`; never `node_modules`).

## Assumptions and observations

- The spawn test needs Node >= 22.18 natively (OD-9 condition); local Node is v24.15.0 (`process.version` is the first report line). `package.json` pins no `engines`.
- The source-scan token (1) `operator[ _-]?notes?` is intentionally broad (it also matches prose "operator notes"). At `6546db8` it returns zero hits over non-spec `src`, `tools`, `server` (`git grep -c ... 6546db8` printed nothing); at HEAD it hits exactly the 12 files the removal edits or deletes, 109 lines.
- Component runner: baseline 3 files / 55 tests; after the revision 4 run 2 files / 32 tests (the deleted component spec had 23). It compiles and passes; at HEAD `313f727` it is still 2 files / 32 passed (read-only re-run for revision 5).
