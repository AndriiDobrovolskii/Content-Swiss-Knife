---
artifact: implementation_report
story: US-8.1
version: 5
status: ARCHIVED
owner: so-gate-enforcer
stage: QUALITY_GATE
created_at: 2026-10-16T06:20:00Z
updated_at: 2026-10-16T06:20:00Z
supersedes: docs/verification/US-8.1-implementation-report.md#4
inputs_consumed:
  - key: story
    version: 3
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 4
  - key: ac_test_matrix
    version: 4
  - key: pipeline_status
    version: 3
---

# Implementation Report - US-8.1

Single-master FAQ and the standalone FAQ Generator tool, plus the v4 layout delta for the FAQ Generator. Branch `feat/US-8.1-single-master-faq`, HEAD `ac62fe4`, base `27b01b8`. This is the aggregated view for the downstream review stages; the command evidence is in `docs/verification/US-8.1-quality-gate-report.md` (v5).

v5 supersedes v4 (HEAD `3488b97`, Story v2, plan v1, task breakdown v3, matrix v3, pipeline status v2; the file at this path is overwritten, v4 stays in git history). v5 adds the change of requirements recorded as Story v3 after the HUMAN_PR_APPROVAL rejection: Specification v3 (FR-24 to FR-28, AC-21 to AC-26), implementation plan v2, task breakdown v4 (T14 to T17), `ac_test_matrix` v4. TEST_WRITING added the layout pin spec (`01061d4`); IMPLEMENTATION built T14 to T17 (`6c19042`, `9494b2b`, `81bee6a`, `3dc3490`). No FROZEN file and no `.arch-guard-checksums` change in the delta. The full gate was re-run on the new HEAD.

Earlier history (kept for context): v4 covered RECONCILIATION finding F-1 (AC-19 pipeline wiring untested; tests-only `b9eef79`, plus the whitespace nit `d33292c`); v3 covered the security finding B-1 (`validateFaqShape` fail-closed fix `1ac82e1`, red tests `97d8913`); v2 covered verification findings V-1 and V-2 (`8c89bce`, second operator section 9 grant).

## 1. Gate outcome

| Check | Result |
|---|---|
| `npm run lint` | exit 0, zero `tsc` errors |
| `npm test` | exit 0; `test:logic` 185 files / 6380 passed, 3 skipped (6383); `test:components` 2 files / 32 passed |
| `npm run test:coverage` | exit 0; global 94.13 stmts / 87.95 branches / 95.62 funcs / 94.69 lines (floors 80/75/80/80); `src/domain`, `src/render`, `src/prompt-core` per-directory floors all hold |
| `npm run build` | exit 0; only the 3 known CommonJS warnings |
| `bash arch-guard.sh` | exit 0; the five frozen files match the baseline in `.arch-guard-checksums` (task-c.ts baseline `619c45a9...9247`, re-baselined in `da59195` and again in `8c89bce`, both under recorded section 9 grants) |
| `npm run validate:harness` | exit 0, zero errors |

Versus v4: test files 184 -> 185 and tests passed 6343 -> 6380 (+37 = the new `src/app/app.component.faq-layout.spec.ts`); skipped unchanged (3). Coverage figures are identical (the delta files are outside the coverage `include`).

Verdict: PASS. Browser/manual verification of the FAQ Generator UI, including the AC-22 geometric clause: NOT performed (the matrix assigns that clause to the operator at HUMAN_PR_APPROVAL). Rule #2 and the AGENTS.md section 6.6 runtime rules are not covered by the gate (`so-implementation-verifier`).

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
| T14 (v4 delta) `supplementalContentRequired` label key in both `TRANSLATIONS` blocks (en `Supplemental Content (Required)`, uk `Додатковий контент (Обов'язково)`, ASCII apostrophe) | 6c19042 | angular | `src/app/app.component.ts` |
| T15 (v4 delta) `appMode() !== 'faq-generator'` added to the empty-state condition (AC-21) | 9494b2b | angular | `src/app/app.component.html` |
| T16 (v4 delta) FAQ form: Supplemental Content input moved directly after Product Name (AC-23) | 81bee6a | angular | `src/app/app.component.html` |
| T17 (v4 delta) FAQ Supplemental Content `[label]` bound to `uiLabels().supplementalContentRequired` (AC-24; `generatorForm` keeps the shared key, AC-26) | 3dc3490 | angular | `src/app/app.component.html` |
| Loop-back fix 1 (V-1, V-2): `FAQ_LANGUAGE_NAMES` removed, name derived with `isoToHumanLang(taskLangToIso(...))`; `MASTER_LOCALE` in tab descriptors; checksum re-baseline (FROZEN, second operator grant) | 8c89bce | prompt + angular | `src/prompts/task-c.ts`, `src/app/tab-descriptors.ts`, `.arch-guard-checksums` |
| Loop-back fix 2 (security B-1): `validateFaqShape` fails closed on markup the tag pass cannot tokenize (a `PERMITTED_TAG` check) | 1ac82e1 | angular | `src/utils/faq-html.ts` |
| Loop-back 3 (RECONCILIATION F-1): no production change needed (tests only, `b9eef79`); verifier nit N-2 as a whitespace-only style commit | d33292c | angular | `src/utils/faq-html.ts` (1 line, whitespace) |

Test-side commits: `c62e30a` corrected six FR-21 English-translation assertions in `content-orchestrator.faq-pipeline.spec.ts` (NBSP unit spacing; recorded as a test defect). `97d8913` (TEST_WRITING, B-1) added red regression tests (+31). `b9eef79` (TEST_WRITING, F-1) added 35 + 14 + 9 tests and fixture additions (+58). `01061d4` (TEST_WRITING, v4 delta) added the new spec `src/app/app.component.faq-layout.spec.ts` (485 lines, 37 tests: `(owner T14)`, `(owner T15)`, `(owner T16)`, `(owner T17)` red-first pins and `[baseline-guard]` guards).

## 3. Files changed (`git diff --name-status 27b01b8..HEAD`, code and tests)

Source (modified): `src/app/app.component.html`, `src/app/app.component.ts`, `src/app/types.ts`, `src/prompts/task-c.ts` (FROZEN), `src/prompts/task-faq.ts`, `src/services/content-orchestrator.service.ts`, `src/utils/structural-parity.ts`, `tools/feedback-form/create-form.gs`, `.arch-guard-checksums`.
Source (added): `src/app/tab-descriptors.ts`, `src/utils/faq-form.ts`, `src/utils/faq-gate.ts`, `src/utils/faq-html.ts`.
Tests (modified): `src/app/app.component.template-wiring.spec.ts`, `src/prompts/task-faq.spec.ts`, `src/services/content-orchestrator.simplified.spec.ts` (R6 block rewrite owned by TEST_WRITING). The B-1 tests were added inside the added specs `faq-html.spec.ts`, `faq-gate.spec.ts` and `content-orchestrator.faq-pipeline.spec.ts`.
Tests (added): `src/app/app.component.faq-layout.spec.ts`, `src/app/tab-descriptors.spec.ts`, `src/prompts/task-c.description-bytes.spec.ts`, `src/prompts/task-c.faq.spec.ts`, `src/services/content-orchestrator.faq-pipeline.spec.ts`, `src/services/content-orchestrator.faq-standalone.spec.ts`, `src/utils/faq-form.spec.ts`, `src/utils/faq-gate.spec.ts`, `src/utils/faq-html.spec.ts`, `src/utils/structural-parity.faq.spec.ts`.
Fixtures (added): `test/fixtures/faq-pipeline.ts`, `test/fixtures/golden/task-c-description-prompts.json`, `test/fixtures/task-c-description-inputs.ts`.
Docs/harness: `README.md`, the Story's pipeline artifacts under `docs/`, and `docs/workflow/{active-story.yaml,history.jsonl,workflow-state.yaml}` (written by the orchestrator, not this stage).

Diff size over `src test tools` (`git diff --shortstat 27b01b8 HEAD -- src test tools`): 28 files changed, 5960 insertions, 180 deletions (17 added, 11 modified, none deleted; v4 was 27 files / 5472 / 179 at `3488b97`, the growth is the new faq-layout spec and the delta edits to `app.component.html` / `app.component.ts`).

FROZEN files: only `src/prompts/task-c.ts` changed since base (net 171 added, 2 removed), in two commits, each carrying its `.arch-guard-checksums` re-baseline in the same commit, under two operator section 9 grants recorded in `docs/catalog/US-8.1-pipeline-status.md`:
- `da59195` (T1): "modify src/prompts/task-c.ts 1. I explicitly grant permission to modify src/prompts/task-c.ts under AGENTS.md §9. Re-baseline .arch-guard-checksums in commit T1."
- `8c89bce` (V-1 fix): "I explicitly grant permission to modify src/prompts/task-c.ts under AGENTS.md §9 for the V-1 fix only; re-baseline .arch-guard-checksums in the same commit."

`task-a.ts`, `task-b.ts`, `master-system-prompt.ts` and `output-validator.ts` are untouched. `vitest.config.ts`, `package.json`, `angular.json`, `tsconfig.json` and `arch-guard.sh` are untouched (empty `git diff --name-only 27b01b8 HEAD` over those five).

## 4. Which tests cover which AC

From `docs/tests/US-8.1-ac-test-matrix.md` v4 (the v3 rows for AC-1 to AC-20 unchanged; the v4 addendum adds AC-21 to AC-26; the matrix lists the individual tests, only the spec files per AC are repeated here). All of these specs ran green in the `test:logic` run recorded in the quality-gate report (v5, HEAD `ac62fe4`: 185 files, 6380 passed, 3 skipped). Spec abbreviations as in the matrix: `pipeline` = `content-orchestrator.faq-pipeline.spec.ts`, `standalone` = `content-orchestrator.faq-standalone.spec.ts`, `simplified` = `content-orchestrator.simplified.spec.ts`, `layout` = `app.component.faq-layout.spec.ts`.

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
| AC-19 | task-c.faq, structural-parity.faq, pipeline (integration), standalone (integration, `generateFaqOnly`) |
| AC-20 | no unit test by design; evidenced by `bash arch-guard.sh` exit 0 (quality-gate report v5, section 5) and the single-commit `da59195` re-baseline |
| AC-21 | layout (owner T15 pins plus `[baseline-guard]` premises), standalone (FR-18 data shape) |
| AC-22 | layout (structural `[baseline-guard]` pins only); the geometric clause has NO automated test: manual operator check at HUMAN_PR_APPROVAL |
| AC-23 | layout (owner T16 pins plus the premise guard) |
| AC-24 | layout (owner T14 and T17 pins, whole-dictionary parity guard, `[required]="true"` and shared-component `*` guards) |
| AC-25 | faq-form, app.component.template-wiring (existing, unmodified); no new test claimed |
| AC-26 | layout (`[baseline-guard]` empty-state oracle for the four other modes, `generatorForm` label/order guards, owner-T17 shared-key count) |

The matrix still carries its TEST_WRITING-time "State now" column (RED/guard); its refresh against the final green state is the matrix's own revision and was not done by this stage (upstream artifact, not edited here). Whether each named test genuinely asserts its AC is `so-reconciliation-reviewer`'s question, not this stage's.

## 5. Not covered here

- No browser or manual check of the FAQ Generator UI was performed (AC-10 to AC-13, AC-15, AC-21 to AC-24 are asserted only by logic-runner specs; the AC-22 geometric clause is a recorded manual operator check at HUMAN_PR_APPROVAL).
- No live LLM call; every model call in the suites is stubbed.
- Architecture Rule #2 and the section 6.6 runtime rules: `so-implementation-verifier`, which must re-verify the diff including the v4 delta.
- Whether the AC-21 to AC-26 pins genuinely assert their criteria: `so-reconciliation-reviewer`. This gate shows only that they run and pass.
- Security of the changed template surfaces: `so-security-reviewer`.
