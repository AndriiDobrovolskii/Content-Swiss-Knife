---
artifact: implementation_report
story: US-9.1
version: 1
status: DRAFT
owner: so-gate-enforcer
stage: QUALITY_GATE
created_at: 2026-10-18T20:14:00Z
updated_at: 2026-10-18T20:14:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 4
  - key: implementation_plan
    version: 4
  - key: task_breakdown
    version: 3
  - key: ac_test_matrix
    version: 3
  - key: pipeline_status
    version: 3
open_decisions_blocking: false
---

# Implementation Report - US-9.1 (No picture references, livelier descriptions; track prompt)

Branch `feat/US-9.1-no-picture-references-and-livelier-descriptions`, HEAD `9d8b0c2`, BASE `6546db8`. The gate output itself is in `docs/verification/US-9.1-quality-gate-report.md`; this report is the aggregated view for the downstream review stages.

**Gate outcome: PASS** - `npm run lint` 0, `npm test` (logic 221 files / 7620 passed + 3 skipped; components 3 files / 55 passed), `npm run test:coverage` 0 with every floor holding, `npm run build` 0, `bash arch-guard.sh` 0, `npm run validate:harness` 0.

## What was built, per task (from pipeline_status v3)

| Task(s) | Track | What | Commits |
|---|---|---|---|
| H-OD13 | - | tracked baseline fixtures (`test/fixtures/baseline/*`) | 964468c |
| T1, T37, T20 | prompt | oracles verified: FR-27 `userContent` golden, D15 payload fixture, amended Task C guard (T20 test edit came from TEST_WRITING `3f9ae29`) | 3f9ae29 |
| T2, T3 (+F6 narrowing) | angular | `src/utils/image-deixis.ts`: `findImageDeixis`, per-language patterns, `collectFigureDeixis`, `imageDeixisIssues` | 39ae78b, 1b132d0, 3ef0f1a |
| T4, T5, T6, T7 | angular | `image-caption-deixis` warning in `image-placeholder.ts`; pointer-free `LEAD_IN_TEMPLATES` and `video-embed-missing` wording in `video-manifest.ts`; `video-embed-restored` messages in `content-orchestrator.service.ts` | dc5f589, de730c4, 40b4f57, 3be4378 |
| T8, T9, T10 | angular | `OperatorNotes` type, `ProductInput.operatorNotes` (`src/app/types.ts`), `src/prompts/operator-notes.ts` leaf module, notes added to `numericFidelitySources` | 28ba099, 1a335c7, 8dbd980 |
| T11, T12, T13, T38, T39, T40 | angular | `OperatorNotesFieldsComponent`, `OperatorNotesFormState`, Generator form wiring, eight label keys, `buildGeneratorInput` spread, `restoreHistory`, `clearAll` | 46d9a15, 9472ade, 6033a80, 510604c, fe29f88, 24bee59 |
| T14, T15, T16, T17, T18, T19 | prompt | vision pre-pass wording (`vision-prepass.ts`), `NO_IMAGE_DEIXIS_RULE` and `LIVELINESS_RULES` (`constants.ts`), Doc figure placement (`task-a-doc.ts`), C3D OVERRIDE #5, EXPERT3D overlay + goldens | 48ae4d6, dd9c242, 4945ff5, 9bbfd50, fb0b24b |
| T21, T22, T23, T24 | prompt (FROZEN, owner-approved) | `src/prompts/task-a.ts`: `[Operator Notes]` block, video span, marker block, figure clause | 7397081, 7c8fae9, 266cd9c, 87fb3c0 |
| T25, T26 | angular (FROZEN, owner-approved) | `src/utils/output-validator.ts`: image-manifest-missing repair message; `image-deixis` warnings | ff8ad92, 7958c7f |
| T27 to T32 | prompt (FROZEN, owner-approved) | `src/prompt-core/master-system-prompt.ts`: `NO_IMAGE_DEIXIS_RULE`, `[VIDEO]`, IMAGE GROUNDING LOCK, PLACEMENT, `[Operator Notes]` input block, `LIVELINESS_RULES`; golden `full-description-prompts.json` regenerated per task | a0e33a5, 3110e94, 18cad1f, ecaa2fd, 6db2885, d5d207a |
| T33 | prompt | consumer checkpoint, verification only, no commit | - |
| T34, T35 | angular | `src/utils/description-metrics.ts`, `tools/measure-description.ts` (Node v24.15.0 native type stripping; T41 launcher not built) | b7b2ef8, 990cb32 |
| T36, T42 | prompt | live acceptance / translation comparison runs: MANUAL, owner-run (H-OD11), outside this gate | - |

## Files changed (`git diff --name-status 6546db8..HEAD -- . ':!docs'`)

71 non-docs files: 54 `A`, 17 `M`, 0 `D`, 0 `R` (8536 insertions, 98 deletions). Modified (17):

```
.arch-guard-checksums
src/app/app.component.html, src/app/app.component.ts, src/app/types.ts
src/prompt-core/constants.ts, src/prompt-core/master-system-prompt.ts  (FROZEN)
src/prompts/task-a-doc.ts, src/prompts/task-a.ts (FROZEN), src/prompts/vision-prepass.ts
src/prompts/task-c.description-bytes.spec.ts  (the decided T20 amended guard, TEST_WRITING 3f9ae29)
src/services/content-orchestrator.service.ts
src/utils/image-placeholder.ts, src/utils/output-validator.ts (FROZEN), src/utils/video-manifest.ts
test/fixtures/faq-pipeline.ts, test/fixtures/full-description-inputs.ts, test/fixtures/golden/full-description-prompts.json
```

Added source files: `src/app/components/operator-notes-fields/operator-notes-fields.component.{ts,html}`, `src/app/operator-notes-form-state.ts`, `src/prompts/operator-notes.ts`, `src/utils/description-metrics.ts`, `src/utils/image-deixis.ts`, `tools/measure-description.ts`; the remainder are 37 spec files, goldens, fixtures and baselines. FROZEN `task-b.ts` and `task-c.ts`: no change. `vitest.config.ts`, `package.json`, `angular.json`, `tsconfig.json`: no change.

## AC to test coverage (from ac_test_matrix v3)

| AC | Covered by (test file) | Status at the gate |
|---|---|---|
| AC-1 | `src/prompts/vision-prepass.no-picture-references.spec.ts` | green |
| AC-2 | `src/prompt-core/constants.no-image-deixis.spec.ts`, `master-system-prompt.{no-picture-references,video-placement,grounding-lock,placement}.spec.ts`, `src/prompts/full-description.golden.us91.spec.ts`, `src/prompts/task-c.master-reach.spec.ts`, `src/prompts/optimizer.master-reach.spec.ts` | green |
| AC-3 | `src/prompts/task-a-doc.figure-placement.spec.ts`, `task-a.deixis-wording.spec.ts`, `task-a.user-content.golden.spec.ts`, `src/prompt-core/constants.c3d-override.spec.ts`, `src/utils/output-validator.image-manifest-wording.spec.ts`, `src/utils/video-manifest.pointer-free.spec.ts`, `src/services/content-orchestrator.deixis-messages.spec.ts` | green |
| AC-4 | `src/utils/video-manifest.pointer-free.spec.ts`, `src/utils/video-manifest.deixis.spec.ts` | green |
| AC-5 | `src/utils/image-deixis.spec.ts` | green |
| AC-6 | `src/utils/image-deixis.spec.ts` (`collectFigureDeixis`) | green |
| AC-7 | `src/utils/image-deixis.spec.ts`, `output-validator.image-deixis.spec.ts`, `image-placeholder.deixis.spec.ts`, `image-deixis.import-cycle.spec.ts` | green |
| AC-8 | `src/prompt-core/constants.liveliness.spec.ts`, `master-system-prompt.liveliness.spec.ts`, `constants.expert3d.spec.ts`, `constants.c3d-override.spec.ts`, `src/prompts/task-c.description-bytes.spec.ts`, `payload-oracle.d15.spec.ts`, `src/utils/structural-parity.sentence-blind.spec.ts`; residual R1a/R1d/R7a declared a GAP by design | green (gap declared) |
| AC-9 | `operator-notes-fields.component.spec.ts` (components runner), `src/app/operator-notes-form-state.spec.ts`, `src/prompts/operator-notes.spec.ts`, `task-a.operator-notes.spec.ts`, `master-system-prompt.operator-notes.spec.ts`, `content-orchestrator.operator-notes.spec.ts`, `history.service.operator-notes.spec.ts`; FR-40 item 3 gap by construction and FR-41 "invoke Clear All" residual accepted by owner (H-FR41TEST) | green (gaps declared) |
| AC-10 | `src/utils/description-metrics.spec.ts`, `test/measure-description.cli.spec.ts` | green |
| AC-11 | no automated test by nature; manual T36 (H-OD11) | NOT COVERED by this gate (manual, owner-run) |
| AC-12 | no automated test by nature; manual T36; hard half mechanised by the script's "number absent" exit (AC-10 CLI rows) | NOT COVERED by this gate (manual, owner-run) |

AC-11 and AC-12 remain open for the owner; AC-8 residual risk and the two AC-9 gaps are declared in the matrix, not hidden.

## Test counts (verbatim)

```
logic:      Test Files  221 passed (221)    Tests  7620 passed | 3 skipped (7623)
components: Test Files  3 passed (3)        Tests  55 passed (55)
coverage:   Statements 94.37%  Branches 88.12%  Functions 96.41%  Lines 95.02%
```

BASE: logic 185 / 6380 + 3 skipped, components 2 / 32. Delta +36 / +1 files reconciles with the 37 added spec files; no test file deleted.

## Not covered by the mechanical gate

arch-guard does not check architecture Rule 2 (retrieval separate from generation) and nothing here checks the AGENTS.md section 6.6 runtime rules, the section 4 HTML acceptance criteria, STORE_REGISTRY sourcing, or the prompt-caching block separation; those belong to `so-implementation-verifier`. Security review and AC reconciliation follow separately.
