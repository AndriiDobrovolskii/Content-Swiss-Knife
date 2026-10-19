---
artifact: test_generation_report
story: US-9.1
version: 5
status: DRAFT
owner: so-test-writer
created_at: 2026-10-18T15:14:00Z
updated_at: 2026-10-19T18:30:00Z
supersedes: docs/tests/US-9.1-test-generation-report.md#4
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
  - key: test_strategy
    version: 5
  - key: ac_test_matrix
    version: 5
open_decisions_blocking: false
---

# Test Generation Report - US-9.1 (v5: records refresh; v4 content kept as the TEST_WRITING history)

## v5 (RECORDS-REFRESH, 2026-10-19, HEAD `313f727`): what is true now

No test, source file, fixture or golden was written, edited, deleted or moved by v5; only the three `docs/tests/US-9.1-*` artifacts were rewritten, and nothing was committed. The tests of the removal are committed (`1b73c8a`) and the builder landed T43 to T49 (`fd9b052`, `439cc1e`, `19ed848`, `4556cb4`, `291bc1e`, `bad5161`, `86b0d62`). Everything below this section is the v4 run (HEAD `09f87dc`), kept as history: its "failing" and "red" statements describe that moment, **not** the current state.

Real output of the read-only confirmations run for v5 (no file written; `git status --short` shows `docs/**` only, as at the start):

```
npx vitest run                         -> Test Files  221 passed (221)
                                          Tests  7569 passed | 3 skipped (7572)         (0 failed)
npm run test:components                -> Test Files  2 passed (2)
                                          Tests  32 passed (32)
npx vitest run --reporter=json <the 10 files that were red in v4>
                                       -> 611 passed, 0 failed, 611 total
   per file (passed / total): task-a.user-content.golden 324/324; task-c.master-reach 84/84; full-description.golden.us91 83/83; optimizer.master-reach 19/19;
   measure-description.cli 33/33; stray-operator-notes 27/27; operator-notes-source-scan 26/26; source-scope 6/6; golden.fr43-oracle 5/5; app.component.no-operator-notes 4/4
```

So the 200 failing tests of v4 (32 of them inverted existing tests) are all green, and the totals equal the SIMULATION figures of v4 (221 files / 7569 passed / 3 skipped / 0 failed): the builder's end state matches the simulated one. The sanctioned red window closed with T43.

**AC-11 and AC-12 are WAIVED by the owner (Story v6, Specification v8; history event `ts` 2026-10-19T14:50:23Z) and were not measured.** No test was written for them, none is claimed, and no coverage is invented. The matrix rows say "WAIVED (owner, Story v6, 2026-10-19; not measured)" with no test file, no "green" and no "built" (OD-27 PROPOSED DEFAULT, accepted at the spec gate); RECONCILIATION reports them as non-blocking findings. T51 is SUPERSEDED (breakdown v6). The v4 gap line about "evidence captured before the master revert" (plan R5) is moot: no live evidence exists.

The four corrected Specification readings (P14) are carried unchanged in the strategy and the matrix; the evidence section below is as taken at HEAD `09f87dc`.

---

(v4 report follows, unchanged except where marked.)

v3 of this report (and of the strategy and matrix) described the additive operator-notes feature and is stale for it. This report is for the TEST_WRITING run of 2026-10-19 against HEAD `09f87dc`
(branch base `6546db8`), following task breakdown v5 handles P0 to P14 and nothing else (owner scope: "the whole feature, nothing extra"). Real output below was produced in that v4 run.

## What this run changed (tests, test fixtures, artifacts only)

No `src/` production file, no FROZEN file, no `.arch-guard-checksums`, no golden JSON was touched: `git status --short -- src ':!*.spec.ts' test/fixtures/golden .arch-guard-checksums` lists nothing, and `bash arch-guard.sh` exits 0.
Nothing was committed or staged (the 8 deletions are working-tree deletions).

| Kind | Files |
|---|---|
| Deleted (P0, 7 logic + 1 component) | `src/prompts/operator-notes.spec.ts`, `src/prompts/task-a.operator-notes.spec.ts`, `src/prompt-core/master-system-prompt.operator-notes.spec.ts`, `src/services/content-orchestrator.operator-notes.spec.ts`, `src/services/history.service.operator-notes.spec.ts`, `src/app/app.component.operator-notes.spec.ts`, `src/app/operator-notes-form-state.spec.ts`, `src/app/components/operator-notes-fields/operator-notes-fields.component.spec.ts` |
| Inverted EXISTING tests (P3, P4: the sanctioned red) | `src/prompts/full-description.golden.us91.spec.ts` (T31), `src/prompts/task-c.master-reach.spec.ts` (R22), `src/prompts/optimizer.master-reach.spec.ts` |
| Edited (P0, P5, P8, P12) | `src/prompts/task-a.user-content.golden.spec.ts`, `src/prompts/task-a-doc.figure-placement.spec.ts`, `test/measure-description.cli.spec.ts`, `test/faq-pipeline.master-leak.spec.ts`, `test/fixtures/faq-pipeline.ts`, `test/fixtures/task-a-user-content-inputs.ts` (comment) |
| New | `src/prompt-core/master-system-prompt.source-scope.spec.ts` (P1), `src/prompts/full-description.golden.fr43-oracle.spec.ts` (P2), `src/services/content-orchestrator.stray-operator-notes.spec.ts` (P6, P7), `src/services/history.service.legacy-entry.spec.ts` (P9a), `src/app/app.component.no-operator-notes.spec.ts` (P9b), `test/operator-notes-source-scan.spec.ts` (P10), `src/prompt-core/constants.numeric-source-rules.spec.ts` (P11) |
| Artifacts | `docs/tests/US-9.1-test-strategy.md`, `docs/tests/US-9.1-ac-test-matrix.md`, this report (all v4, DRAFT, same paths) |
| NOT touched (B4) | `src/utils/description-metrics.spec.ts`, `src/prompt-core/master-system-prompt.liveliness.spec.ts` |

## Baseline: a clean pre-change run (real output)

An earlier baseline attempt in this run was discarded: edits were applied while it was running, so its 11 failures were my own inversions and a syntax slip of mine. The baseline below was taken in a separate throwaway
`git worktree` checked out at `09f87dc` (clean, `git status` empty; `node_modules` junctioned), so it cannot be contaminated.

```
npx tsc --noEmit                      -> exit 0, no output
npx vitest run                        -> Test Files  221 passed (221)
                                         Tests  7620 passed | 3 skipped (7623)
npm run test:components               -> Test Files  3 passed (3)
                                         Tests  55 passed (55)
bash arch-guard.sh                    -> exit 0
```

## After the v4 run (real output, working tree at the time; HISTORICAL: this is the red state, superseded by the v5 section above)

```
npx tsc --noEmit                      -> exit 0, no output (spec files compile after the deletions and the new files)
npx vitest run                        -> Test Files  10 failed | 211 passed (221)
                                         Tests  200 failed | 7369 passed | 3 skipped (7572)
npm run test:components               -> Test Files  2 passed (2)
                                         Tests  32 passed (32)      (the deleted component spec had 23 of the 55)
bash arch-guard.sh                    -> exit 0
```

Test count reconciles: 7623 - 223 (deleted logic tests: 22 + 58 + 16 + 53 + 6 + 40 + 28) - 120 (`EMPTY_NOTES` block) - 6 (CLI notes tests) - 1 (figure-placement case) - 1 (master-leak literal) + 217 (P5) + 9 (P8) + 74 (new files) = 7572.

### The 200 failing tests of the v4 run, file by file (HISTORICAL red set at HEAD `09f87dc`; no other test turned red then; all 200 are green at HEAD `313f727`)

| File | Failing | Why (first failing assertion, real) | Kind | Owner |
|---|---|---|---|---|
| `src/prompts/task-a.user-content.golden.spec.ts` | 124 | `AssertionError: expected '[INPUT DATA]\n[Store Name]: EXPERT3D\n...' not to contain 'STRAY-NOTE-7731'` (and the `hook=false` form for the Doc payload); 2 stray values x 31 inputs x (`buildPromptA`, `buildPromptADoc`) | NEW (P5 b) | T44 |
| `test/operator-notes-source-scan.spec.ts` | 15 | `expected [ ... ] to deeply equal []` listing the hit lines (109 at HEAD); `src/prompts/operator-notes.ts still exists: expected true to be false` | NEW (P10) | T43..T49 |
| `src/prompts/task-c.master-reach.spec.ts` | 16 | the R22 describe, 16 pairs: block 0 (the master) still names `Operator Notes` | **INVERTED existing (P4)** | T43 |
| `src/prompts/full-description.golden.us91.spec.ts` | 10 | `AssertionError: the provided [Raw Description], [Technical Specs] or [Supplemental Content]: expected '[ROLE] You are an expert technical co...' to contain '...'` for each of the ten cases | **INVERTED existing (P3)** | T43 |
| `test/measure-description.cli.spec.ts` | 9 | `AssertionError: the withdrawn flag was accepted: expected +0 to be 2`; usage text still lists the four names; missing-file flag reported as unreadable | NEW (P8) | T47 |
| `src/services/content-orchestrator.stray-operator-notes.spec.ts` | 9 | `the stray value grounded the number: expected 0 to be greater than 0`; `expected '\| Power \| 20 W \|\nLaser engraver with...\nПротестовано на 777 Вт' to be '\| Power \| 20 W \|\nLaser engraver with...'` | NEW (P6) | T45 |
| `src/prompts/optimizer.master-reach.spec.ts` | 6 | the R22 describe, 6 inputs: block 0 still names `Operator Notes` | **INVERTED existing (P4)** | T43 |
| `src/prompt-core/master-system-prompt.source-scope.spec.ts` | 5 of 6 | the two FR-42 literals missing from the master; `Operator Notes`, `the input blocks you were given` and the case-insensitive form present | NEW (P1) | T43 |
| `src/prompts/full-description.golden.fr43-oracle.spec.ts` | 4 of 5 | literals missing from block 0 of the ten cases; `the golden still holds Operator Notes: expected true to be false` | NEW (P2) | T43 |
| `src/app/app.component.no-operator-notes.spec.ts` | 2 of 4 | `expected 'restoreHistory(item: HistoryItem) {...' not to match /operator[ _-]?notes?/i` (and for `buildGeneratorInput`) | NEW (P9b) | T46 |

Sum: 124 + 15 + 16 + 10 + 9 + 9 + 6 + 5 + 4 + 2 = 200. Existing tests turned red: **32** (P3 10 + P4 16 + 6), all three the sanctioned inversions. The other 168 are new pins. No failure is "cannot find module" or a syntax error: each is an assertion on the removed state.
The sanctioned red window is the one the plan states for the human (plan "For the human at HUMAN_PLAN_APPROVAL", breakdown F3): the TEST_WRITING commit turns these pre-existing tests red until T43 reverts the master.

### Green on arrival, by design (guards that must stay green T43 to T49)

`golden-A` FR-44 item 2 (a) 93 tests and the unchanged FR-27 oracle (Tier A 24, Tier B 8 + 6 + 2, Doc remainder 63, premise 4); `stray` item 4.2 (P7) 16 tests and the item 4.1 controls 2; `legacy` (P9a) 4; `app-absent` premise 2; `constants.numeric-source-rules` (P11) 2; `master-leak` (P12) 20; `figure-placement` 10; source-scan premise 3 + 8 per-file existence premises.

## Satisfiability and P13 re-verification (v4; scratch worktree, removed afterwards; confirmed by the real build at HEAD `313f727`: 221 files / 7569 passed / 3 skipped / 0 failed)

A throwaway `git worktree` at `09f87dc` (node_modules junctioned) had the builder's end state SIMULATED: reverse of `6db2885` (master) and `7397081` (`task-a.ts`) applied with `git apply -R`; `types.ts`, `app.component.ts`, `app.component.html` checked out from `6546db8`; the four non-spec files deleted;
the orchestrator, `tools/measure-description.ts` and `description-metrics.ts` edited as T45 / T47 describe; the golden produced by the plan's W6 raw-text substitution (the JSON-escaped HEAD region occurred exactly 10 times; region 1095 to 965 characters, the plan's measured figure). The new tests were copied in.

```
npx tsc --noEmit                      -> exit 0, no output   (the cast-through-unknown pins compile with ProductInput.operatorNotes REMOVED)
git grep -n -i -E <widened token set> -- src tools server ':!*.spec.ts'   -> (no hits)
npx vitest run                        -> Test Files  221 passed (221)
                                         Tests  7569 passed | 3 skipped (7572)
```

So every new / inverted pin is satisfiable by the plan's design, and the surviving specs the breakdown lists for P13 (`master-leak` and the FAQ specs with the `masterPromptBlocks` windows, `task-c.description-bytes`, `payload-oracle.d15`, `master-system-prompt.image-markers`, `task-a.spec`, `task-a-doc.spec`, `app.component.template-wiring` / `faq-layout` / `export-guard`, the full-description byte-equality golden spec, `golden-A` Tier A / B) are green against the reverted master. Nothing from the simulation was copied into the repository. The junction was removed with `cmd /c rmdir` before `git worktree remove`; the main `node_modules` was verified intact afterwards (467 entries before and after, `vitest` present, components runner re-run green).

The baseline and the simulation are different runs of the same 221 files: 7623 tests (baseline) and 7572 (simulation and after) differ by exactly the deletions and additions above.

## Evidence for the P14 readings (real output; the readings themselves are in the strategy and the matrix)

```
git merge-base HEAD origin/main                                      -> 6546db83ef4005e9d6a57baf51adf0b35df8d3c7
git merge-base HEAD main                                             -> 120dcbc0d42b3160078cacb682dd00cc48157ca3
git merge-base --is-ancestor 6546db8 HEAD                            -> exit 0
sed -n 322p src/services/content-orchestrator.simplified.spec.ts     -> describe('R6 (human resolution) — FAQ artifact: data-driven, one uk-UA master translated into all store languages, any template', () => {
git show HEAD:test/fixtures/golden/full-description-prompts.json | grep -o "\[Operator Notes\]" | wc -l   -> 20
git show HEAD:test/fixtures/golden/full-description-prompts.json | grep -c "\[Operator Notes\]"            -> 10
git ls-files | grep -i golden        -> 3 specs + full-description-prompts.json, optimizer-faq-pre-change.json, task-a-user-content.json, task-c-description-prompts.json
grep -n -i golden package.json       -> (no output: no golden script)
git show 6546db8:src/prompt-core/master-system-prompt.ts (collapsed)   -> contains both FR-42 literals; contains none of Operator Notes / operatorNotes / "the input blocks you were given"
git grep -c -i -E <widened token set> 6546db8 -- src tools server ':!*.spec.ts'                            -> (no output: zero hits at the branch base)
```

## Coverage gaps and deferred tests (what the reconciliation reviewer should expect)

- **AC-11 and AC-12 are WAIVED by the owner (Story v6; not measured) and have no test.** The v4 wording ("no automated test by nature (T51, manual, outside the gate)") is withdrawn: T51 is superseded and no run will be performed under this breakdown. The script (AC-10) exists and is tested as an instrument, but is not evidence for the waived criteria. The soft items of AC-12 are not evidenced by any recorded run; the manual fact review rests on the owner's statement. RECONCILIATION reports these as non-blocking findings.
- FR-44 item 3 "not shown, not sent" is proven by absence of the reading code (P9b), not by executing `restoreHistory` (no `AppComponent` spec; plan R9, accepted).
- The effect of the master revert on Task C and optimizer payloads is pinned only by the golden `c/*` cases and the P3 / P4 inversions: `task-c.description-bytes` and `payload-oracle.d15` cannot see it (plan R4).
- The corpus (`test/fixtures/corpus/`) is untouched; nothing in it carries notes text. No new fixture was invented: the stray-property pins reuse the FR-27 input set and the `faq-pipeline` / `protected-name` harnesses.

## Non-blocking findings for the next stages

0. **(v5) AC-11 and AC-12 are WAIVED and unmeasured** (owner, Story v6, history `ts` 2026-10-19T14:50:23Z). Under the OD-27 PROPOSED DEFAULT, RECONCILIATION should record them as waived and unmeasured in its own non-blocking findings and never as passed; the Pull Request "how verified" line should say the same (OD-32 default). The matrix holds no test or run for them.

1. **P11's "move cited in its commit"** (plan W7, R11): `1b73c8a`'s message names the relocated `NUMERIC_SOURCE_FIDELITY_RULES` byte pin and the deletion of the eight dedicated specs (W7); it does not name the source and target files. RECONCILIATION may rule whether that citation suffices. (v4 said this was the committer's job; the commit now exists.)
2. **Two guards of the deleted orchestrator spec are not carried over, because plan W7 relocates only the byte pin and P0 says do exactly that.** The deleted file also held (a) OD-20(2) "a number that appears only in `supplementalContent` is NOT grounded by it" (`sourcesFor({ supplementalContent: 'Q: how strong? A: 40 Вт.' })` still reports `alt-numeric-not-grounded`), and (b) "whitespace-only notes and an empty object do not start the FAQ". (a) tests a surviving behaviour of `numericFidelitySources` (it never included `supplementalContent`), independent of notes; (b) is notes-only. RECONCILIATION may rule under NFR-14 whether (a) needed relocating; adding it is a small test-writer change if the human wants it.
3. **The golden pin P2 and the surviving `full-description.golden.spec.ts` are consistent only if the builder moves master and golden together in T43** (the golden spec asserts byte equality with the live master and stays green until then). Verified in the simulation.
4. **Plan files list says "5 modules"; there are four non-spec files** (plan-review N2); the scan lists the four paths and the folder.
5. **Source-scan token (1) is broad on purpose** (`operator[ _-]?notes?`, case-insensitive, prose included); it is zero at `6546db8`. A future legitimate use of the phrase "operator notes" in non-spec source would fail the scan and should be discussed, not silenced.
6. **Header comments of several surviving specs still use the `T31` / `T21` task ids of the retired v3 breakdown** (e.g. `full-description.golden.us91.spec.ts` describe titles). They are history; v5 ids T43 to T51 are used in every new or rewritten comment.
7. **P9a deviation** (real constructor with `effect` mocked instead of `Object.create`) and the **P6 stray-value text** are explained in the strategy ("Deviations").
8. **The `masterPromptBlocks` windows** (`slice(0,400)`, `slice(3000,3400)`) are green against the simulated reverted master and still read verbatim master text; none was narrowed.
