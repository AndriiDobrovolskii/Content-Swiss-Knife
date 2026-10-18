---
artifact: pipeline_status
story: US-9.1
version: 1
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-10-18T16:16:00Z
updated_at: 2026-10-18T16:16:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: open_decisions
    version: 4
  - key: impact_analysis
    version: 4
  - key: implementation_plan
    version: 4
  - key: task_breakdown
    version: 3
  - key: plan_review
    version: 3
  - key: test_strategy
    version: 1
  - key: ac_test_matrix
    version: 1
  - key: test_generation_report
    version: 1
open_decisions_blocking: true
---

# Pipeline status: US-9.1 (IMPLEMENTATION, track prompt + angular)

Branch `feat/US-9.1-no-picture-references-and-livelier-descriptions`, started from HEAD `cd8b04f`, Node v24.15.0, run of 2026-10-18 (UTC).
BASE (read from the fixture headers, never `git merge-base HEAD main`): `6546db83ef4005e9d6a57baf51adf0b35df8d3c7`.

**Result of this run: PARTIAL.** 17 of the 42 tasks are done and committed (plus three verify-only tasks and the baseline-fixtures commit). The rest are
waiting on an open human answer, on tests that do not exist yet, or are held for the owner's frozen-file order. Nothing was weakened, skipped or regenerated
with `-u`; no push, no PR.

## Human decisions in force (verbatim sources: `docs/workflow/history.jsonl`)

- FROZEN files (AGENTS.md section 9), event 2026-10-18T15:24:23Z, owner, verbatim: `modify src/prompts/task-a.ts, modify src/utils/output-validator.ts,
  modify src/prompt-core/master-system-prompt.ts`. Scope: this session, US-9.1 hunks only; `task-b.ts` and `task-c.ts` are NOT covered and were never opened.
  Intent order: `task-a.ts` T-A4 first, then the rest of `task-a.ts`, then `output-validator.ts`, `master-system-prompt.ts` last; one commit per task with
  `bash arch-guard.sh --rebaseline` and `.arch-guard-checksums` in the same commit.
- Event 2026-10-18T15:35:15Z, owner, verbatim: `H-OD13: Copy the needed reference outputs and baseline files from the git-ignored Knowledge/ folder into a
  permanent, tracked test fixtures directory (e.g., test/fixtures/baseline/) and commit them so CI and tests can access them. The restated Specification text is
  normative. | H-FR41TEST: Accept the default split. The call-site source-text pins plus OperatorNotesFormState behaviour tests satisfy the requirement. No heavy
  AppComponent TestBed is needed.`

## Task table

| Task | Track | Status | Commit |
|---|---|---|---|
| H-OD13 baseline files (`Knowledge/Issues/4/*` copied verbatim to `test/fixtures/baseline/`) | - | DONE | 964468c |
| T1 FR-27 `userContent` oracle (verify) | prompt | VERIFIED, no new commit: fixture and spec were committed by TEST_WRITING | 3f9ae29 |
| T37 D15 digest fixture (verify) | prompt | VERIFIED, no new commit | 3f9ae29 |
| T20 amended Task C guard (verify) | prompt | VERIFIED, no new commit | 3f9ae29 |
| T2 `findImageDeixis` + pattern table | angular | DONE | 39ae78b |
| T3 `collectFigureDeixis` + `imageDeixisIssues` | angular | DONE | 1b132d0 |
| T4 `image-caption-deixis` in `figureCaptionWarnings` | angular | DONE, one test of its spec is unsatisfiable (finding F1) | dc5f589 |
| T5 seven `LEAD_IN_TEMPLATES` | angular | DONE | de730c4 |
| T6 `video-embed-missing` detail | angular | DONE | 40b4f57 |
| T7 two `video-embed-restored` warnings | angular | DONE | 3be4378 |
| T8 `OperatorNotes` type + `ProductInput.operatorNotes` | angular | DONE | 28ba099 |
| T9 `operator-notes` leaf module | prompt | DONE | 1a335c7 |
| T14 Vision pre-pass FR-1..FR-4 | prompt | DONE, one test of its spec is unsatisfiable (finding F2) | 8dbd980 |
| T15 `NO_IMAGE_DEIXIS_RULE` constant | prompt | DONE | 48ae4d6 |
| T17 Doc FIGURE PLACEMENT + golden regeneration | prompt | DONE | dd9c242 |
| T21 `task-a.ts` T-A4 `[Operator Notes]` (FROZEN, approved) | prompt | DONE | 7397081 |
| T22 `task-a.ts` T-A2 video block + golden regeneration (FROZEN, approved) | prompt | DONE | 7c8fae9 |
| T10 `numericFidelitySources` + the four notes | angular | DONE | 46d9a15 |
| T11 `OperatorNotesFieldsComponent` | angular | DONE (runner caveat, finding F3) | 9176be3 |
| T25 `output-validator.ts` O1 (FROZEN, approved) | angular | DONE | ff8ad92 |
| T26 `output-validator.ts` O2 (FROZEN, approved) | angular | DONE | 7958c7f |
| T16 `LIVELINESS_RULES` | prompt | NOT STARTED: H-FR20PREC open | - |
| T18 C3D OVERRIDE #5 + golden | prompt | NOT STARTED: serial after T16 (same file; Reading guide item 6) | - |
| T19 EXPERT3D overlay + golden | prompt | NOT STARTED: serial after T18 | - |
| T23 `task-a.ts` T-A3 marker block (FROZEN) | prompt | NOT STARTED: H-FR11I3 open | - |
| T24 `task-a.ts` T-A1 instruction clause (FROZEN) | prompt | NOT STARTED: serial after T23 (same file and golden) | - |
| T40 `OperatorNotesFormState` | angular | NOT STARTED: its test `operator-notes-form-state.spec.ts` does not exist (TEST_WRITING deferred it) | - |
| T12 notes state field, placement, labels | angular | NOT STARTED: depends on T40; its state-binding pin is missing; 12 label/placement pins exist and are red | - |
| T13 `buildGeneratorInput` spreads `inputPart()` | angular | NOT STARTED: depends on T12, T40; the `inputPart()` call-site pin is missing | - |
| T38 `restoreHistory` calls `restore` | angular | NOT STARTED: depends on T13, T40; no test exists | - |
| T39 `clearAll` resets both cases | angular | NOT STARTED: depends on T38, T40; no test exists | - |
| T27..T31 master M1+M2, M3, M4, M5, M6 (FROZEN, approved) | prompt | HELD for the owner's order ("master last"); technically startable (T27 deps T15, T20, T37 are met) | - |
| T32 master M7 `LIVELINESS_RULES` (FROZEN, approved) | prompt | NOT STARTED: depends on T16 (H-FR20PREC) and T31 | - |
| T33 consumer checkpoint (verification only) | prompt | NOT STARTED: needs T27..T32 | - |
| T34 `description-metrics` | angular | NOT STARTED: H-OD10 open | - |
| T35 `tools/measure-description.ts` + spawn test | angular | NOT STARTED: depends on T34 | - |
| T36 live acceptance runs (manual) | prompt | NOT STARTED: H-OD11 open | - |
| T41 D12 launcher (conditional) | angular | NOT STARTED: only if T35's Node check fails | - |
| T42 live translation comparison (manual, optional) | prompt | NOT STARTED: H-OD11 open | - |

## Per-task notes (what was run, what moved)

Every task: full `npx vitest run` before and after, compared test by test against a failing-test baseline taken before T2 (447 failing ids: 442 tests
and 5 load failures). **After every task: zero new failures; the only changes are tests leaving the failing set.** `npx tsc --noEmit` and
`bash arch-guard.sh` were run after every task.

- **T2, T3**: `src/utils/image-deixis.ts` is a leaf (only `import type`). `image-deixis.spec.ts`, `image-deixis.import-cycle.spec.ts` green (89 tests).
  The uk patterns cover the Specification's required cases; the ru/en/pl/de/es/pt lists are drafted from the same construction classes and labelled
  unreviewed in the module header (OD-7). Pointer adverbs ("нижче", "below") only match opening a clause or after a picture/video noun, never before a
  number or sign, so "нижче -10 °C" is not a hit.
- **T4**: `figureCaptionWarnings(figures, locale = 'uk')`. The plan's default `'uk-UA'` collides with the existing NFR-6 pin in `image-placeholder.spec.ts`
  (it forbids region-locale literals in the module); the default is the primary subtag `'uk'`, which is what the detector keys on. No test was changed.
  `image-placeholder-validate.ts` is untouched.
- **T5, T6, T7**: Appendix E sentences verbatim; the `video-embed-missing` detail and both orchestrator warnings reworded to the Specification's literals.
- **T9**: byte-exact block pins green (22 tests).
- **T14**: the Specification's restated `description` and `alt` blocks and the no-inference sentence, verbatim (H-OD13: restated text is normative).
- **T15**: the Specification's restated FR-5 block, verbatim; `grep -nE "§C[1-6]|CONSUMABLES|TRANSLATE the generic descriptor|reorder it category-first|fit-content"`
  over the constant returned nothing (exit 1); `full-description.golden`, `task-c.description-bytes`, D15 specs green (210 tests).
- **T17**: golden regenerated from the builders (a throw-away spec that wrote `JSON.stringify(cases, null, 2)`; it reproduced the committed file byte for byte
  before the edit and was deleted afterwards). Reviewed diff, by case and block: `doc/expert3d`, `doc/expert3d+hook`, `doc/c3d` block 1 only; the other nine
  cases unchanged. `full-description-inputs.ts` header gained the first US-9.1 entry (comment only, as the breakdown lists it).
  `simplified-template-blocks.ts`: no diff.
- **T21**: two lines in `task-a.ts` (import + interpolation before the image block). `git diff --stat`: 2 insertions, 1 deletion. `task-a.operator-notes.spec.ts`
  54 tests green; Tier A of the FR-27 oracle stays green. Rebaseline run printed `CHANGED (unauthorized?): src/prompts/task-a.ts` and exited 1 (by design);
  the following run printed `All frozen files unchanged` / `ALL CHECKS PASSED`, exit 0. `.arch-guard-checksums` diff: only the `task-a.ts` line
  (`0421226c...` to `5d0e6e37...`).
- **T22**: one span in `buildVideoBlock`. Golden regenerated; reviewed diff = `userContent` of `doc/expert3d`, `doc/expert3d+hook`, `html/expert3d`, exactly the
  FR-11 item 2 span. Rebaseline exit 1, clean run exit 0; only the `task-a.ts` checksum line moved (now `d126ab91...`). `task-c-description-prompts.json` unchanged.
- **T10**: four trimmed note values appended to `numericFidelitySources`; `NUMERIC_SOURCE_FIDELITY_RULES` and `supplementalContent` untouched (the byte pin is green).
- **T11**: see finding F3.
- **T25**: one string in `output-validator.ts`; rebaseline exit 1, clean run exit 0; only the `output-validator.ts` line moved (now `a2853212...`, then `3b5f3796...` after T26).
- **T26**: one import + one call inside the existing `DOMParser` try (`imageDeixisIssues(doc, locale ?? '', context)`); warnings only, no repair-strategy entry. The corpus
  fixtures and `test/render-*.spec.ts` are unchanged and green (1209 tests across the validator, repair-gate, detector and render specs).

## Verification evidence (real output, final state of this run, 2026-10-18T16:15Z)

```
$ npx vitest run --reporter=dot                       # npm run test:logic
 Test Files  19 failed | 200 passed (219)
      Tests  286 failed | 7144 passed | 3 skipped (7433)
   (baseline before T2: 31 failed files | 442 failed tests + 5 load failures; 156 tests and 4 load failures left the failing set; 0 tests entered it)

$ npx tsc --noEmit                                    # npm run lint
src/utils/description-metrics.spec.ts(35,36): error TS2307: Cannot find module './description-metrics' ...
   (one diagnostic, in a spec whose owner task T34 is blocked; baseline had 10 diagnostics)

$ bash arch-guard.sh
  All frozen files unchanged / ALL CHECKS PASSED

$ npm run test:components
Application bundle generation failed.
X [ERROR] TS2307: Cannot find module './description-metrics' ...        (the only diagnostic; baseline had 10)
```

Oracles (T1, T20, T37): `npx vitest run src/prompts/payload-oracle.d15.spec.ts src/prompts/task-c.description-bytes.spec.ts` = 2 files / 183 tests green.
`task-a.user-content.golden.spec.ts`: Tier A and the Doc wrapper green; the 3 failing tests left are Tier B marker/video+marker (owner T23).
`git merge-base --is-ancestor 6546db8 HEAD` exit 0. `git diff 6546db8 --exit-code` over `task-c-description-prompts.json`, `task-b.ts`, `task-c.ts`,
`task-translate.ts`, `optimizer.ts`, `simplified-template-blocks.ts`, `master-system-prompt.ts`: exit 0 (empty). The T1 and T37 fixtures and their specs are
byte-identical to commit 3f9ae29. `.arch-guard-checksums` against BASE: only the `task-a.ts` and `output-validator.ts` lines differ; the `task-b.ts`, `task-c.ts` and
`master-system-prompt.ts` entries are unchanged.

### The 286 remaining failing tests, by file, and what they wait for

| Failing | File | Waits for |
|---|---|---|
| 24 | `constants.liveliness.spec.ts` | T16 (H-FR20PREC) |
| 2 | `constants.c3d-override.spec.ts` | T18 (serial after T16) |
| 6 | `constants.expert3d.spec.ts` | T19 (serial after T18) |
| 4 | `task-a.deixis-wording.spec.ts` (2 marker tests: T23; 2 instruction tests: T24) | T23 (H-FR11I3), T24 |
| 3 | `task-a.user-content.golden.spec.ts` (Tier B marker and video+marker) | T23 |
| 11 / 3 / 4 / 10 / 6 / 16 | `master-system-prompt.no-picture-references` (T27) / `.video-placement` (T28) / `.grounding-lock` (T29) / `.placement` (T30) / `.operator-notes` (T31) / `.liveliness` (T32) | T27..T32 (held; T32 also H-FR20PREC) |
| 80 / 18 / 69 | `task-c.master-reach.spec.ts` / `optimizer.master-reach.spec.ts` / `full-description.golden.us91.spec.ts` | T18, T19, T24, T27..T32 |
| 12 | `app.component.operator-notes.spec.ts` (labels, placement) | T12 (after T40) |
| 16 | `test/measure-description.cli.spec.ts` | T35 (after T34, H-OD10) |
| 1 load file | `description-metrics.spec.ts` | T34 (H-OD10) |
| 1 | `vision-prepass.no-picture-references.spec.ts` NFR-12 key-set test | finding F2 (test defect) |
| 1 | `image-placeholder.deixis.spec.ts` "takes an optional locale" | finding F1 (test defect) |

The 286 failing tests sum to the rows above (24+2+6+4+3+11+3+4+10+6+16+80+18+69+12+16+1+1 = 286).

## Findings (for TEST_WRITING; the builder does not own tests)

- **F1 (T4)**: `image-placeholder.deixis.spec.ts`, "takes an optional locale: an English caption is judged by the English pattern" builds its English figure with
  `buildFigureParts(entry({visionLabelUk:'Back panel:', visionDescriptionUk:'The row of three round modules is shown in the image.'}), {cyrillicCheck:true})`.
  With the check on, `buildFigureParts` discards a non-Cyrillic label and description, so the figcaption holds the file-name fallback ("desk lamp.") and no English
  text; no implementation of `figureCaptionWarnings` can see the English sentence. The test needs `cyrillicCheck: false` for the English figure. The other 17 tests of the
  file pass.
- **F2 (T14)**: `vision-prepass.no-picture-references.spec.ts`, "NFR-12 ... still advertises exactly the keys" slices from the first `{` after `OUTPUT CONTRACT`. That `{` is
  the quoted `"{"` in the sentence "the first character of your output is "{" and the last is "}"", so the slice is `{" and the last is "}` and yields no keys. It failed at
  baseline (before any edit) and the prompt line it reads is not part of FR-1..FR-4 (NFR-12 forbids changing the field set). The slice must start at the `{` that opens the JSON
  example (for example the first `{` followed by a newline). The 16 other tests of the file pass.
- **F3 (T11, runner)**: `npm run test:components` still fails to bundle, now on one diagnostic (TS2307 for `description-metrics`, owner T34, blocked by H-OD10). Evidence that
  the new component spec passes: `ng test --ts-config=<throw-away tsconfig that includes only the component specs>` ran 3 files / 55 tests green (the new spec, 23 tests, plus the
  two existing specs). The throw-away tsconfig was deleted; no spec was moved. The component runner cannot be green until T34 lands.
- **F4 (tests to be written before T12, T13, T38, T39, T40)**: `OperatorNotesFormState` behaviour spec (clear; restore with notes; restore without notes and `{}`
  empty the four values; restore-then-clear; empty / whitespace-only values give no `operatorNotes` key; `inputPart()` returns `{}` or `{operatorNotes}`; and the check that
  `signal()` works without an injection context); T12's binding of the component to `operatorNotesState.values()/set()`; T13's `buildGeneratorInput` contains
  `operatorNotesState.inputPart()` and writes no literal `operatorNotes:` key; T38's `restoreHistory` contains `operatorNotesState.restore(item.input.operatorNotes)`;
  T39's two disjoint per-case `clearAll` pins (`case 'generator':` and `case 'ua-generator':` slices) and the slicing-helper self-test on a one-case-only synthetic source.
- **F5 (T23/T24)**: the two "Assert absent: the old marker span" tests and the Tier B marker equalities are red until T23 is built; they cannot be satisfied without
  the unconfirmed FR-11 item 3 wording (H-FR11I3), which the builder must not pick.

## Open items and what each blocks (nothing was defaulted)

| Open | Blocks |
|---|---|
| H-FR20PREC (precedence sentence of `LIVELINESS_RULES`) | T16, then T18, T19 (serial, same file), T32, T33 |
| H-FR11I3 (marker block wording) | T23, then T24 |
| H-OD10 (metric definitions D-3, D-4, D-5, D-7, D-9 half) | T34, T35, T41; and the whole `npm run test:components` bundle |
| H-OD11 (products, who runs, marker split) | T36, T42 |
| Missing tests (F4) | T40, T12, T13, T38, T39 |
| Owner's order ("master last") | T27..T31 are held; they need no further answer; T32 and T33 also need H-FR20PREC |
