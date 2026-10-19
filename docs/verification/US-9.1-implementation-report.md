---
artifact: implementation_report
story: US-9.1
version: 3
status: ARCHIVED
owner: so-gate-enforcer
stage: QUALITY_GATE
created_at: 2026-10-19T15:45:00Z
updated_at: 2026-10-19T15:45:00Z
supersedes: docs/verification/US-9.1-implementation-report.md#2
inputs_consumed:
  - key: story
    version: 6
  - key: implementation_plan
    version: 7
  - key: task_breakdown
    version: 6
  - key: ac_test_matrix
    version: 5
  - key: pipeline_status
    version: 5
open_decisions_blocking: false
---

# Implementation Report - US-9.1 (No picture references, livelier descriptions; operator-notes feature withdrawn; track prompt + angular)

Branch `feat/US-9.1-no-picture-references-and-livelier-descriptions`, HEAD `313f727`, branch base `6546db8`, pre-removal commit `09f87dc`. Node v24.15.0. The gate output itself is in `docs/verification/US-9.1-quality-gate-report.md` (v3); this report is the aggregated view for the downstream review stages. It supersedes v2 (same non-doc tree, re-run after the Story v6 records refresh). The operator-notes feature was withdrawn by Story v5 and removed in commits `1b73c8a..86b0d62` (T43 to T49).

**Gate outcome: PASS** (re-run on the unchanged non-doc tree of HEAD `313f727`, Node v24.15.0) - `npm run lint` 0; `npm test` (logic 221 files / 7569 passed + 3 skipped; components 2 files / 32 passed) 0 on its second run; `npm run test:coverage` 0 with every floor holding (global 95.02 / 96.41 / 88.12 / 94.37); `npm run build` 0; `bash arch-guard.sh` 0. **Disclosed:** the first `npm test` run of this re-run was RED (exit 1; 1 of 7572 logic tests, `test/removal.spec.ts:73`, timed out at 5000 ms under full-suite load; the test passes alone in 402 ms) and was followed by a green `npm test` and a green coverage run on the same tree; see quality gate report v3 section 2 and finding F1. `npm run validate:harness` not applicable and not run (no file under `docs/workflow/` other than the orchestrator's data files `workflow-state.yaml` / `history.jsonl`, no `.claude/` skill and no harness tool changed; data files are not a harness change).

**AC-11 and AC-12 are WAIVED by the owner (Story v6, 2026-10-19) and UNMEASURED.** They are not passed, not covered and not part of this gate's outcome; no test, run or script output exists for either.

## What was built, per task

Rounds 1 to 3 (task ids T1 to T42 of earlier breakdown versions) delivered the picture-reference and liveliness work; round 4 (T43 to T49 of task_breakdown v5) removed the withdrawn operator-notes feature. Source: pipeline_status v4, with commit ids verified present in `git log`.

| Task(s) | Track | What | Commits |
|---|---|---|---|
| Rounds 1 to 3, retained work | prompt + angular | tracked baseline fixtures; `src/utils/image-deixis.ts` detector and carriers; `image-caption-deixis` and `image-deixis` warnings (`image-placeholder.ts`, `output-validator.ts`); pointer-free video lead-ins (`video-manifest.ts`) and restored-embed messages (`content-orchestrator.service.ts`); vision pre-pass wording; `NO_IMAGE_DEIXIS_RULE` and `LIVELINESS_RULES` (`constants.ts`); Doc figure placement (`task-a-doc.ts`); C3D OVERRIDE #5 and EXPERT3D overlay; `task-a.ts` video span, marker block and figure clause; master prompt `[VIDEO]`, IMAGE GROUNDING LOCK, PLACEMENT, `LIVELINESS_RULES`; `description-metrics.ts` and `tools/measure-description.ts` | see pipeline_status v4 history section (round 1 to 3 commits, all in `git log 6546db8..HEAD`) |
| Round 4 TEST_WRITING | test | failing removal pins, eight operator-notes specs deleted | 1b73c8a |
| T43 | prompt (FROZEN, owner-approved) | master `[SOURCE FIDELITY]` bullets returned to the `6546db8` text; golden `full-description-prompts.json` regenerated (10 added / 10 deleted lines); checksum re-baselined | fd9b052 |
| T44 | prompt (FROZEN, owner-approved) | `task-a.ts` stops emitting the `[Operator Notes]` block (import and interpolation prefix removed); checksum re-baselined | 439cc1e |
| T45 | angular | orchestrator no longer reads operator notes as numeric-fidelity sources | 19ed848 |
| T46 | angular | Generator operator-notes form removed (component folder, state class; `app.component.ts/.html` back to base bytes) | 4556cb4 |
| T47 | angular | four `--notes-*` flags removed from `tools/measure-description.ts` (+ comment in `description-metrics.ts`) | 291bc1e |
| T48 | prompt | `src/prompts/operator-notes.ts` deleted | bad5161 |
| T49 | angular | `src/app/types.ts` back to base bytes (`ProductInput.operatorNotes`, `OperatorNotes` dropped) | 86b0d62 |
| T50 | verification | run by the builder on the final tree, no commit; the full gate is this report | - |
| T51 | manual | live acceptance runs: SUPERSEDED by the AC-11 / AC-12 waiver (breakdown v6); not executed, not replaced | - |

## Files changed

`git diff --name-status 09f87dc..HEAD -- . ':!docs'` (the removal round): 38 files, 7 `A`, 12 `D`, 19 `M` (752 insertions, 1773 deletions).

- Deleted (12): `src/app/app.component.operator-notes.spec.ts`; `src/app/components/operator-notes-fields/operator-notes-fields.component.{ts,html,spec.ts}`; `src/app/operator-notes-form-state.{ts,spec.ts}`; `src/prompt-core/master-system-prompt.operator-notes.spec.ts`; `src/prompts/operator-notes.{ts,spec.ts}`; `src/prompts/task-a.operator-notes.spec.ts`; `src/services/content-orchestrator.operator-notes.spec.ts`; `src/services/history.service.operator-notes.spec.ts`.
- Added (7, all specs): `src/app/app.component.no-operator-notes.spec.ts`, `src/prompt-core/constants.numeric-source-rules.spec.ts`, `src/prompt-core/master-system-prompt.source-scope.spec.ts`, `src/prompts/full-description.golden.fr43-oracle.spec.ts`, `src/services/content-orchestrator.stray-operator-notes.spec.ts`, `src/services/history.service.legacy-entry.spec.ts`, `test/operator-notes-source-scan.spec.ts`.
- Modified (19): `.arch-guard-checksums`; `src/app/app.component.{html,ts}`, `src/app/types.ts`; `src/prompt-core/master-system-prompt.ts` (FROZEN); `src/prompts/task-a.ts` (FROZEN); `src/services/content-orchestrator.service.ts`; `src/utils/description-metrics.ts`; `tools/measure-description.ts`; `test/fixtures/golden/full-description-prompts.json`, `test/fixtures/faq-pipeline.ts`, `test/fixtures/task-a-user-content-inputs.ts`; and the specs `full-description.golden.us91`, `optimizer.master-reach`, `task-a-doc.figure-placement`, `task-a.user-content.golden`, `task-c.master-reach`, `test/faq-pipeline.master-leak`, `test/measure-description.cli`.

Against BASE `6546db8` the branch now has 49 `A` and 14 `M` non-docs files, 0 `D`, 0 `R`. FROZEN `task-b.ts` and `task-c.ts`: no change against BASE. `vitest.config.ts`, `package.json`, `angular.json`, `tsconfig.json`: no change. `git grep -il "operator-notes\|operatorNotes\|OperatorNotes" -- src tools server ':!*.spec.ts'` returns nothing. `.arch-guard-checksums` moved against `09f87dc` on exactly the `task-a.ts` and `master-system-prompt.ts` lines, each in the same commit as the frozen-file edit.

## AC to test coverage (from ac_test_matrix v5; all files named exist in the tree and ran green in this gate's 221-file logic run)

| AC | Covered by (test file) | Status at the gate |
|---|---|---|
| AC-1 | `src/prompts/vision-prepass.no-picture-references.spec.ts` | green |
| AC-2 | `src/prompt-core/constants.no-image-deixis.spec.ts`, `master-system-prompt.{no-picture-references,video-placement,grounding-lock,placement}.spec.ts`, `src/prompts/full-description.golden.us91.spec.ts` (T31 group inverted by the withdrawal), `task-c.master-reach.spec.ts`, `optimizer.master-reach.spec.ts` | green |
| AC-3 | `src/prompts/task-a-doc.figure-placement.spec.ts`, `task-a.deixis-wording.spec.ts`, `task-a.user-content.golden.spec.ts`, `src/prompt-core/constants.c3d-override.spec.ts`, `src/utils/output-validator.image-manifest-wording.spec.ts`, `src/utils/video-manifest.pointer-free.spec.ts`, `src/services/content-orchestrator.deixis-messages.spec.ts` | green |
| AC-4 | `src/utils/video-manifest.pointer-free.spec.ts`, `src/utils/video-manifest.deixis.spec.ts` | green |
| AC-5 | `src/utils/image-deixis.spec.ts` | green |
| AC-6 | `src/utils/image-deixis.spec.ts` (`collectFigureDeixis`) | green |
| AC-7 | `src/utils/image-deixis.spec.ts`, `output-validator.image-deixis.spec.ts`, `image-placeholder.deixis.spec.ts`, `image-deixis.import-cycle.spec.ts` | green |
| AC-8 | `src/prompt-core/constants.liveliness.spec.ts`, `master-system-prompt.liveliness.spec.ts`, `constants.expert3d.spec.ts`, `constants.c3d-override.spec.ts`, `src/prompts/task-c.description-bytes.spec.ts`, `payload-oracle.d15.spec.ts`, `src/utils/structural-parity.sentence-blind.spec.ts`; residual R1a/R1d/R7a declared a GAP by design | green (gap declared) |
| AC-9 (withdrawn in Story v5; exclusion pins only) | `test/operator-notes-source-scan.spec.ts`, `src/app/app.component.no-operator-notes.spec.ts`, `src/prompt-core/constants.numeric-source-rules.spec.ts`, `master-system-prompt.source-scope.spec.ts`, `src/prompts/full-description.golden.fr43-oracle.spec.ts`, `task-a.user-content.golden.spec.ts` (stray-property cases), `src/services/content-orchestrator.stray-operator-notes.spec.ts`, `history.service.legacy-entry.spec.ts`, `test/measure-description.cli.spec.ts` (withdrawn-flag rows) | green |
| AC-10 | `src/utils/description-metrics.spec.ts`, `test/measure-description.cli.spec.ts` | green |
| AC-11 | none (no test file, no run) | **WAIVED (owner, Story v6, 2026-10-19), UNMEASURED**; not passed, not covered; T51 SUPERSEDED |
| AC-12 | none (no test file, no run); the AC-10 script/CLI specs are the instrument, not evidence for AC-12 | **WAIVED (owner, Story v6, 2026-10-19), UNMEASURED**; hard script criterion not measured, soft items not evidenced; not passed, not covered |

"green" here means the cited files passed in this run's full logic run (0 failed); this stage did not re-read each test body (that is `so-reconciliation-reviewer`'s). AC-11 and AC-12 are waived and unmeasured (reported as such, never as passed); the AC-8 residual risk is declared in the matrix, not hidden.

## Test counts (verbatim)

```
logic:      Test Files  221 passed (221)    Tests  7569 passed | 3 skipped (7572)
components: Test Files  2 passed (2)        Tests  32 passed (32)
coverage:   Statements 94.37%  Branches 88.12%  Functions 96.41%  Lines 95.02%
```

The counts above are from the second (green) `npm test` run; the first run was 220 passed / 1 failed files, 7568 passed / 1 failed (timeout, finding F1) with the same 221-file total. Identical to the previous gate run (v2) on this tree. BASE `6546db8`: logic 185 / 6380 + 3 skipped, components 2 / 32. Round 3 (before the removal): logic 221 / 7620 + 3 skipped, components 3 / 55. The removal changed the file count by -7 +7 (logic) and -1 (components); both reconcile with the 12 `D` and 7 `A` entries above (see the quality gate report, section 2). No unplanned test deletion.

## Not covered by the mechanical gate

arch-guard does not check architecture Rule 2 (retrieval separate from generation) and nothing here checks the AGENTS.md section 6.6 runtime rules, the section 4 HTML acceptance criteria, STORE_REGISTRY sourcing, or the prompt-caching block separation; those belong to `so-implementation-verifier`. Security review and AC reconciliation follow separately. Not run and not claimed: `npm run validate:harness` (not applicable, harness untouched since `09f87dc`; the uncommitted `docs/workflow` data files do not count). AC-11 / AC-12 live runs: waived by the owner, never executed, unmeasured.
