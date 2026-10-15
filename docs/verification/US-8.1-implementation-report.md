---
artifact: implementation_report
story: US-8.1
version: 4
status: DRAFT
owner: so-gate-enforcer
stage: QUALITY_GATE
created_at: 2026-10-15T09:25:00Z
updated_at: 2026-10-15T09:25:00Z
supersedes: docs/verification/US-8.1-implementation-report.md#3
inputs_consumed:
  - key: story
    version: 2
  - key: implementation_plan
    version: 1
  - key: task_breakdown
    version: 3
  - key: ac_test_matrix
    version: 3
  - key: pipeline_status
    version: 2
---

# Implementation Report - US-8.1

Single-master FAQ and the standalone FAQ Generator tool. Branch `feat/US-8.1-single-master-faq`, HEAD `3488b97`, base `27b01b8`. This is the aggregated view for the downstream review stages; the command evidence is in `docs/verification/US-8.1-quality-gate-report.md` (v4).

v4 supersedes v3 (HEAD `a8b3e2e`, in git history). v4 adds the third loop-back: RECONCILIATION finding F-1 (`docs/reconciliation/US-8.1-reconciliation-report.md` v1, CHANGES_REQUIRED: the AC-19 pipeline wiring was untested). TEST_WRITING added tests only (`b9eef79`: AC-19 integration tests in `faq-pipeline.spec.ts` and `faq-standalone.spec.ts`, AC-10 / AC-11 wiring pins in `app.component.template-wiring.spec.ts`, fixture `test/fixtures/faq-pipeline.ts`; +58 tests, `ac_test_matrix` v3); IMPLEMENTATION confirmed no production change was needed and applied the verifier's non-blocking whitespace nit as `d33292c` (`src/utils/faq-html.ts`, one line, space after `=` in `MARKDOWN_BOLD`). No new AC, no FROZEN file touched. The full gate was re-run on the new HEAD.

v3 (kept below as history of the earlier loop-backs) added the second loop-back: security finding B-1 of `docs/reviews/security/US-8.1-security-review.md` v1 (`validateFaqShape` accepted a tag with an unpaired quote or a missing `>`, which `isFaqStorable` then stored for `bypassSecurityTrustHtml`). TEST_WRITING added red regression tests (`97d8913`), IMPLEMENTATION fixed `src/utils/faq-html.ts` (`1ac82e1`, a fail-closed `PERMITTED_TAG` check; no test file touched by the fix, no FROZEN file touched). The full gate was re-run on the new HEAD.

## 1. Gate outcome

| Check | Result |
|---|---|
| `npm run lint` | exit 0, zero `tsc` errors |
| `npm test` | exit 0; `test:logic` 184 files / 6343 passed, 3 skipped (6346); `test:components` 2 files / 32 passed |
| `npm run test:coverage` | exit 0; global 94.13 stmts / 87.95 branches / 95.62 funcs / 94.69 lines (floors 80/75/80/80); `src/domain`, `src/render`, `src/prompt-core` per-directory floors all hold |
| `npm run build` | exit 0; only the 3 known CommonJS warnings |
| `bash arch-guard.sh` | exit 0; the five frozen files match the baseline in `.arch-guard-checksums` (task-c.ts baseline `619c45a9...9247`, re-baselined in `da59195` and again in `8c89bce`, both under recorded section 9 grants) |
| `npm run validate:harness` | exit 0, zero errors |

Coverage figures are identical to the previous run (the b9eef79 tests are outside the coverage `include`).

Verdict: PASS. Browser/manual verification of the new UI: NOT performed. Rule #2 and the AGENTS.md section 6.6 runtime rules are not covered by the gate (`so-implementation-verifier`).

## 2. What was built, per task

Commits are `27b01b8..HEAD`; every task commit is followed by a `docs(US-8.1)` pipeline-status commit.

| Task | Commit | Track | Non-docs files |
|---|---|---|---|
| T1 additive FAQ translation variant in `task-c.ts` (FROZEN, operator-approved) + checksum re-baseline | da59195 | prompt | `src/prompts/task-c.ts`, `.arch-guard-checksums` |
| T2 `<strong>` -> `<b>` in the FAQ generation prompt | 3698434 | prompt | `src/prompts/task-faq.ts` |
| T3 `convertStrongToB`, `validateFaqShape` | c7197f0 | angular | `src/utils/faq-html.ts` |
| T4 `validateFaqStructuralParity` | d09f092 | angular | `src/utils/structural-parity.ts` |
| T5 `buildFaqValidator`, `isFaqStorable`, `FAQ_MAX_ATTEMPTS` | 54ee224 | angular | `src/utils/faq-gate.ts` |
| T6 `runFaqPipeline` / `storeFaq`, used by `generate()` | f3343e1 | angular | `src/services/content-orchestrator.service.ts` |
| T7 `generateUaContent()` Step 4 uses the shared `runFaqPipeline` | 7f534d7 | angular | `src/services/content-orchestrator.service.ts` |
| T8 standalone `generateFaqOnly()` | 9f20a15 | angular | `src/services/content-orchestrator.service.ts` |
| T9 `AppMode` `faq-generator`, `TOOL_LABEL`, `faq-form.ts`, feedback-form entry | e8dcf56 | angular | `src/app/app.component.ts`, `src/app/types.ts`, `src/utils/faq-form.ts`, `tools/feedback-form/create-form.gs` |
| T10 `deriveTabDescriptors` extracted; UA-Description and FAQ-only tab cases | 3e9db41 | angular | `src/app/app.component.ts`, `src/app/tab-descriptors.ts` |
| T11 component state and `generateFaqOnly()` call | 88670be | angular | `src/app/app.component.ts` |
| T12 mode button, form, Generate button | c04096a | angular | `src/app/app.component.html` |
| T13 README documentation | 7a0613e | angular | `README.md` |
| Loop-back fix 1 (V-1, V-2): `FAQ_LANGUAGE_NAMES` removed, name derived with `isoToHumanLang(taskLangToIso(...))`; `MASTER_LOCALE` in tab descriptors; checksum re-baseline (FROZEN, second operator grant) | 8c89bce | prompt + angular | `src/prompts/task-c.ts`, `src/app/tab-descriptors.ts`, `.arch-guard-checksums` |
| Loop-back fix 2 (security B-1): `validateFaqShape` fails closed on markup the tag pass cannot tokenize (a `PERMITTED_TAG` check); adds no new AC, tightens FR-9 / AC-9 | 1ac82e1 | angular | `src/utils/faq-html.ts` |
| Loop-back 3 (RECONCILIATION F-1): no production change was needed (tests only, `b9eef79`); verifier nit N-2 applied as a whitespace-only style commit | d33292c | angular | `src/utils/faq-html.ts` (1 line, whitespace) |

Test-side commits: `c62e30a` corrected the six FR-21 English-translation assertions in `content-orchestrator.faq-pipeline.spec.ts` (NBSP unit spacing; the adjoined-unit negative assertion kept). Recorded in the pipeline status as a test defect, not an implementation workaround. `97d8913` (TEST_WRITING, B-1 loop-back) added the red regression tests: the B-1 block in `src/utils/faq-html.spec.ts` (R1-R9 reject, G1-G10 guards), `src/utils/faq-gate.spec.ts` and the `-t B-1` cases in `src/services/content-orchestrator.faq-pipeline.spec.ts`; additions only, +31 tests. `b9eef79` (TEST_WRITING, RECONCILIATION F-1 loop-back) added tests only: 35 in `src/services/content-orchestrator.faq-pipeline.spec.ts` (AC-19 integration, Generator and UA Description entry points, per store), 14 in `src/services/content-orchestrator.faq-standalone.spec.ts` (AC-19 integration, `generateFaqOnly`), 9 in `src/app/app.component.template-wiring.spec.ts` (AC-10 / AC-11 pins), plus fixture additions in `test/fixtures/faq-pipeline.ts`; +58 tests in total.

## 3. Files changed (`git diff --name-status 27b01b8..HEAD`, code and tests)

Source (modified): `src/app/app.component.html`, `src/app/app.component.ts`, `src/app/types.ts`, `src/prompts/task-c.ts` (FROZEN), `src/prompts/task-faq.ts`, `src/services/content-orchestrator.service.ts`, `src/utils/structural-parity.ts`, `tools/feedback-form/create-form.gs`, `.arch-guard-checksums`.
Source (added): `src/app/tab-descriptors.ts`, `src/utils/faq-form.ts`, `src/utils/faq-gate.ts`, `src/utils/faq-html.ts`.
Tests (modified): `src/app/app.component.template-wiring.spec.ts`, `src/prompts/task-faq.spec.ts`, `src/services/content-orchestrator.simplified.spec.ts` (R6 block rewrite owned by TEST_WRITING). The B-1 tests were added inside the added specs `faq-html.spec.ts`, `faq-gate.spec.ts` and `content-orchestrator.faq-pipeline.spec.ts` listed below.
Tests (added): `src/app/tab-descriptors.spec.ts`, `src/prompts/task-c.description-bytes.spec.ts`, `src/prompts/task-c.faq.spec.ts`, `src/services/content-orchestrator.faq-pipeline.spec.ts`, `src/services/content-orchestrator.faq-standalone.spec.ts`, `src/utils/faq-form.spec.ts`, `src/utils/faq-gate.spec.ts`, `src/utils/faq-html.spec.ts`, `src/utils/structural-parity.faq.spec.ts`.
Fixtures (added): `test/fixtures/faq-pipeline.ts`, `test/fixtures/golden/task-c-description-prompts.json`, `test/fixtures/task-c-description-inputs.ts`.
Docs/harness: `README.md`, the Story's pipeline artifacts under `docs/`, and `docs/workflow/{active-story.yaml,history.jsonl,workflow-state.yaml}` (written by the orchestrator, not this stage).

Diff size over `src test tools` (`git diff --shortstat 27b01b8 HEAD -- src test tools`): 27 files changed, 5472 insertions, 179 deletions (at HEAD `3488b97`; same 27 files as before, the growth is the added tests).

FROZEN files: only `src/prompts/task-c.ts` changed since base (net 171 added, 2 removed), in two commits, each carrying its `.arch-guard-checksums` re-baseline in the same commit, under two operator section 9 grants recorded in `docs/catalog/US-8.1-pipeline-status.md`:
- `da59195` (T1): grant quoted in "T1 - section 9 stop and approval record" - "modify src/prompts/task-c.ts 1. I explicitly grant permission to modify src/prompts/task-c.ts under AGENTS.md §9. Re-baseline .arch-guard-checksums in commit T1."
- `8c89bce` (V-1 fix): grant quoted in "Loop-back fix 1 of 3 ... approval record" - "I explicitly grant permission to modify src/prompts/task-c.ts under AGENTS.md §9 for the V-1 fix only; re-baseline .arch-guard-checksums in the same commit."

`task-a.ts`, `task-b.ts`, `master-system-prompt.ts` and `output-validator.ts` are untouched. `vitest.config.ts`, `package.json`, `angular.json` and `arch-guard.sh` are untouched.

## 4. Which tests cover which AC

From `docs/tests/US-8.1-ac-test-matrix.md` v3 (v1 rows unchanged; the v2 addendum adds the B-1 rows under FR-9 / AC-9 and AC-16; the v3 addendum adds the AC-19 pipeline and standalone rows and the AC-10 / AC-11 wiring pins; no new AC; the matrix lists the individual tests; only the spec files per AC are repeated here). All of these specs ran green in the `test:logic` run recorded in the quality-gate report (v4, HEAD `3488b97`: 184 files, 6343 passed, 3 skipped; the +58 versus v3 are the RECONCILIATION-loop-back tests). Spec abbreviations as in the matrix: `pipeline` = `content-orchestrator.faq-pipeline.spec.ts`, `standalone` = `content-orchestrator.faq-standalone.spec.ts`, `simplified` = `content-orchestrator.simplified.spec.ts`.

| AC | Spec files |
|---|---|
| AC-1 | pipeline, simplified, standalone |
| AC-2 | pipeline, simplified |
| AC-3 | pipeline, faq-gate, structural-parity.faq |
| AC-4 | pipeline, simplified, tab-descriptors |
| AC-5 | pipeline, simplified |
| AC-6 | task-faq |
| AC-7 | pipeline, standalone, faq-html |
| AC-8 | pipeline, standalone, faq-html |
| AC-9 | pipeline, standalone, faq-gate, faq-html (incl. the B-1 fail-closed cases) |
| AC-10 | standalone, app.component.template-wiring |
| AC-11 | standalone, faq-form, app.component.template-wiring |
| AC-12 | standalone, faq-form, app.component.template-wiring |
| AC-13 | standalone, tab-descriptors, app.component.template-wiring |
| AC-14 | pipeline, standalone |
| AC-15 | standalone |
| AC-16 | pipeline (incl. the B-1 never-stored cases), standalone, faq-gate |
| AC-17 | pipeline, standalone, faq-gate |
| AC-18 | task-c.description-bytes, task-c.faq |
| AC-19 | task-c.faq, structural-parity.faq, pipeline (integration: the pipeline sends the FAQ prompt variant to translation), standalone (same, `generateFaqOnly`) |
| AC-20 | no unit test by design; evidenced by `bash arch-guard.sh` exit 0 and the single-commit `da59195` re-baseline (quality-gate report v2, section 5) |

The matrix still carries its TEST_WRITING-time "State now" column (RED/guard); its refresh against the final green state is the matrix's own revision and was not done by this stage (upstream artifact, not edited here). Whether each named test genuinely asserts its AC is `so-reconciliation-reviewer`'s question, not this stage's.

## 5. Not covered here

- No browser or manual check of the FAQ Generator UI was performed (AC-10 to AC-13, AC-15 are asserted only by logic-runner specs).
- No live LLM call; every model call in the suites is stubbed.
- Architecture Rule #2 and the section 6.6 runtime rules: `so-implementation-verifier`, which must re-verify the post-fix diff (the FAQ generic-branch prompt text now names ES "Castilian Spanish" and PT "European Portuguese", per the pipeline status).
- Whether the new AC-19 / AC-10 / AC-11 tests genuinely assert their criteria (RECONCILIATION F-1 re-check): `so-reconciliation-reviewer`. This gate shows only that they run and pass.
- Security of the new input path and `[innerHTML]` surfaces, including whether the B-1 fix closes the finding: `so-security-reviewer` (SECURITY_REVIEW re-run).
