---
artifact: test_generation_report
story: US-9.1
version: 1
status: DRAFT
owner: so-test-writer
created_at: 2026-10-18T15:14:00Z
updated_at: 2026-10-18T15:14:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
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
open_decisions_blocking: false
---

# Test Generation Report - US-9.1

Run: 2026-10-18 (`date -u` at the last command: 2026-10-18T15:09:53Z), branch `feat/US-9.1-no-picture-references-and-livelier-descriptions`,
HEAD `6546db83ef4005e9d6a57baf51adf0b35df8d3c7`, Node v24.15.0. Nothing was committed; `bash arch-guard.sh --rebaseline` was not run.

## Files changed (tests and test fixtures only)

`git diff --name-only HEAD -- src server tools package.json .arch-guard-checksums` lists exactly one file, the guard T20 amends:
`src/prompts/task-c.description-bytes.spec.ts`. `git status --porcelain -- src server tools package.json .arch-guard-checksums` lists, besides it, only new
`*.spec.ts` files and the new directory `src/app/components/operator-notes-fields/` (which holds only its spec). No FROZEN file was edited.

**New logic specs (34)** - `src/prompts/`: `task-a.user-content.golden`, `payload-oracle.d15`, `vision-prepass.no-picture-references`, `task-a-doc.figure-placement`,
`task-a.deixis-wording`, `task-a.operator-notes`, `operator-notes`, `task-c.master-reach`, `optimizer.master-reach`, `full-description.golden.us91`;
`src/prompt-core/`: `constants.no-image-deixis`, `constants.liveliness`, `constants.c3d-override`, `constants.expert3d`, `master-system-prompt.no-picture-references`,
`.video-placement`, `.grounding-lock`, `.placement`, `.operator-notes`, `.liveliness`; `src/utils/`: `image-deixis`, `image-deixis.import-cycle`,
`image-placeholder.deixis`, `video-manifest.pointer-free`, `video-manifest.deixis`, `output-validator.image-manifest-wording`, `output-validator.image-deixis`,
`structural-parity.sentence-blind`, `description-metrics`; `src/services/`: `content-orchestrator.deixis-messages`, `content-orchestrator.operator-notes`,
`history.service.operator-notes`; `src/app/`: `app.component.operator-notes`; `test/`: `measure-description.cli`.
**New component spec (1)** - `src/app/components/operator-notes-fields/operator-notes-fields.component.spec.ts`.
**New fixtures and helpers (not specs)** - `test/fixtures/golden/task-a-user-content.json`, `test/fixtures/golden/optimizer-faq-pre-change.json`,
`test/fixtures/task-a-user-content-inputs.ts`, `test/fixtures/optimizer-faq-pre-change-inputs.ts`, `test/fixtures/task-c-description-guard.ts`,
`test/fixtures/us91-constants.ts`, `test/fixtures/us91-master.ts`.
**Amended (1)** - `src/prompts/task-c.description-bytes.spec.ts` (T20, see the strategy). Existing goldens were NOT regenerated; no `-u` was used.

## Baseline before any test was added (real output)

`npx vitest run` on the unmodified tree: `Test Files 185 passed (185)`, `Tests 6380 passed | 3 skipped (6383)`. `npx tsc --noEmit`: exit 0.

## After TEST_WRITING (real output)

```
$ npx vitest run --reporter=dot            # npm run test:logic
 Test Files  31 failed | 188 passed (219)
      Tests  442 failed | 6869 passed | 3 skipped (7314)
```

- 219 - 185 = 34 new spec files; 31 are red, 3 are green on arrival (`payload-oracle.d15`, `history.service.operator-notes`, `structural-parity.sentence-blind`)
  and the amended `task-c.description-bytes` is green too. **Every one of the 31 failing files is new** (the list below); no pre-existing spec fails.
- 7314 - 6383 = 931 new test cases net (the amended guard went from 100 to 108): 442 red, 489 green on arrival (guards, characterization pins, the byte oracles
  of Tier A and the Doc wrapper, the absence pins). Five logic specs (`image-deixis`, `image-deixis.import-cycle`, `video-manifest.deixis`, `operator-notes`,
  `description-metrics`) collect zero tests because their module does not exist (red by load, breakdown constraint 1); their further test cases appear once T2, T9 and T34 land. The component spec is counted separately below.

### Failures are for the right reason - first failing test of every red file (from `vitest --reporter=json`)

```
test/measure-description.cli.spec.ts (16/16) :: the first line of stdout is process.version, for a clean run :: AssertionError: expected '' to be 'v24.15.0'
                                       (negative cases:  AssertionError: the script itself did not run ... Error: Cannot find module '...\tools\measure-description.ts')
src/prompt-core/constants.c3d-override.spec.ts (2/6) :: Assert absent: the old lead-in comparison :: AssertionError: expected '[CENTER 3D PRINT BRAND VOICE ...' not to contain 'The lead-in must still differ from th...'
src/prompt-core/constants.expert3d.spec.ts (6/24) :: contains the literal "states the mechanism that makes THIS product the ... :: AssertionError: expected '[EXPERT3D BRAND VOICE ...' to contain 'states the mechanism that makes THIS ...'
src/prompt-core/constants.liveliness.spec.ts (24/28) :: contains the literal "open each §3 <h2> section ..." :: Error: LIVELINESS_RULES is not exported from src/prompt-core/constants.ts as a string (created by T16)
src/prompt-core/constants.no-image-deixis.spec.ts (9/9) :: is exported from constants.ts as a string ... :: Error: NO_IMAGE_DEIXIS_RULE is not exported from src/prompt-core/constants.ts as a string (created by T15)
src/prompt-core/master-system-prompt.grounding-lock.spec.ts (4/8) :: the IMAGE GROUNDING LOCK block contains "restricts claims ABOUT THE IMAGE" :: AssertionError: expected 'IMAGE GROUNDING LOCK (overrides the d...' to contain 'restricts claims ABOUT THE IMAGE'
src/prompt-core/master-system-prompt.liveliness.spec.ts (16/20) :: systemBlocks[0] is the master and carries the SCENE, RHYTHM ... :: AssertionError: open each §3 <h2> section with one short sentence ...: expected '[ROLE] You are an expert technical co...' to con...
src/prompt-core/master-system-prompt.no-picture-references.spec.ts (11/15) :: MASTER_SYSTEM_PROMPT contains a block whose heading begins "[NO PICTUR... :: AssertionError: expected '[ROLE]\nYou are an expert technical c...' to contain '[NO PICTURE REFERENCES'
src/prompt-core/master-system-prompt.operator-notes.spec.ts (6/16) :: contains [Operator Notes] :: AssertionError: expected '- STRICT INPUT SCOPE: every claim, nu...' to contain '[Operator Notes]'
src/prompt-core/master-system-prompt.placement.spec.ts (10/14) :: the PLACEMENT block contains the literal "PRECEDING PARAGRAPH" :: AssertionError: expected 'PLACEMENT — STRICT RULES: - LEAD-IN: ...' to contain 'PRECEDING PARAGRAPH'
src/prompt-core/master-system-prompt.video-placement.spec.ts (3/8) :: the [VIDEO] block contains the literal "Place every embed directly aft... :: AssertionError: expected '[VIDEO] MANDATORY WHEN PRESENT: if [R...' to contain 'Place every embed directly after a bo...'
src/prompts/full-description.golden.us91.spec.ts (75/83) :: doc/expert3d :: AssertionError: expected 'TASK A — GENERATE THE BASE-LANGUAGE D...' to contain 'states a product fact from the source'
src/prompts/optimizer.master-reach.spec.ts (18/19) :: block 0 is the live master and carries the constant ... :: AssertionError: expected '[ROLE]\nYou are an expert technical c...' to contain '[NO PICTURE REFERENCES'
src/prompts/task-a-doc.figure-placement.spec.ts (5/11) :: contains the literal "states a product fact from the source" :: AssertionError: expected 'TASK A — GENERATE THE BASE-LANGUAGE D...' to contain 'states a product fact from the source'
src/prompts/task-a.deixis-wording.spec.ts (20/33) :: Assert present: "a figure needs a body <p> directly above it, and that <p> never refers to the picture" :: AssertionError: expected 'TASK A — GENERATE BASE-LANGUAGE HTML ...' to contain 'a figure needs a body <p> directly ab...'
src/prompts/task-a.operator-notes.spec.ts (54/58) :: all four filled: userContent equals the no-notes userContent with the block inserted at the FR-26 offset ... :: AssertionError: userContent differs from "no-notes userContent + block at the FR-26 offset": expected false to be true
src/prompts/task-a.user-content.golden.spec.ts (11/222) :: es/video/one-embed: userContent equals the golden with the old video span ... :: AssertionError: userContent differs from the golden beyond the FR-11 video span: expected false to be true
src/prompts/task-c.master-reach.spec.ts (80/84) :: (opts: false) block 0 equals the live master and contains [NO PICTURE ... :: AssertionError: expected '[ROLE]\nYou are an expert technical c...' to contain '[NO PICTURE REFERENCES'
src/prompts/vision-prepass.no-picture-references.spec.ts (17/23) :: the UKRAINIAN FIELDS block states "never begins with and never contains" :: AssertionError: expected 'UKRAINIAN FIELDS (label, description,...' to contain 'never begins with and never contains'
src/app/app.component.operator-notes.spec.ts (12/17) :: English label "Usage scenarios (optional)" :: AssertionError: label missing from app.component.ts: expected false to be true
src/services/content-orchestrator.deixis-messages.spec.ts (2/3) :: generateUaContent: the HTML (uk-UA) warning says "sensible preceding paragraph" ... :: AssertionError: expected 'The model omitted the source video em...' not to contain 'sensible lead-in paragraph'
src/services/content-orchestrator.operator-notes.spec.ts (4/53) :: a number that appears ONLY in the usageScenarios note passes the alt/figcaption gate :: AssertionError: expected [ { severity: 'error', ...(3) } ] to deeply equal []
src/utils/image-placeholder.deixis.spec.ts (13/18) :: emits one warning-level finding for a caption description that points at the picture :: AssertionError: expected [] to have a length of 1 but got +0
src/utils/output-validator.image-deixis.spec.ts (4/12) :: emits exactly one warning for a pointer paragraph directly above a figure ... :: AssertionError: expected [] to have a length of 1 but got +0
src/utils/output-validator.image-manifest-wording.spec.ts (2/6) :: Assert absent: "a substantive lead-in <p> directly above it" :: AssertionError: expected 'Manifest image "b.jpg" is absent from...' not to contain 'a substantive lead-in <p> directly ab...'
src/utils/video-manifest.pointer-free.spec.ts (18/31) :: uk (uk-UA): none of the AC-4 words appears ... :: AssertionError: pointer word(s) in the rendered template: "Як Ortur Laser Master 3 працює на практиці — дивіться у відео нижче.": expected [ 'нижче' ] to deeply equal []
src/prompts/operator-notes.spec.ts            :: LOAD :: Failed to resolve import "./operator-notes" ... Does the file exist?        (T9)
src/utils/description-metrics.spec.ts         :: LOAD :: Failed to resolve import "./description-metrics" ...                      (T34)
src/utils/image-deixis.spec.ts                :: LOAD :: Failed to resolve import "./image-deixis" ...                              (T2/T3)
src/utils/image-deixis.import-cycle.spec.ts   :: LOAD :: Failed to resolve import "./image-deixis" ...                              (T2)
src/utils/video-manifest.deixis.spec.ts       :: LOAD :: Failed to resolve import "./image-deixis" ...                              (T2, then T5)
```

None of these is "cannot find module" for a module the test should not need: the five LOAD files import exactly the module their owner task creates; every other red
test fails on an assertion about the missing text, block or behaviour. Green-on-arrival counts of the red files are guards that must stay green (matrix, "guard").

### Green on arrival, by design

`src/prompts/payload-oracle.d15.spec.ts` 75/75, `src/prompts/task-c.description-bytes.spec.ts` 108/108, `src/services/history.service.operator-notes.spec.ts` 6/6,
`src/utils/structural-parity.sentence-blind.spec.ts` 5/5; and inside red files: Tier A and Doc-wrapper of `task-a.user-content.golden` (211/222), FR-28 isolation and FR-40 payload
equality of `content-orchestrator.operator-notes` (49/53), the FR-28 / FR-31.3 guards of `app.component.operator-notes` (5/17), the absence pins of the constants and master specs.

## Type check (`npx tsc --noEmit`)

```
src/app/components/operator-notes-fields/operator-notes-fields.component.spec.ts  TS2307  (T11)
src/prompts/operator-notes.spec.ts                                                TS2307  (T9)
src/utils/description-metrics.spec.ts                                             TS2307 x2 (T34)
src/utils/image-deixis.import-cycle.spec.ts                                       TS2307 x3 (T2)
src/utils/image-deixis.spec.ts                                                    TS2307, TS2339 (the TS2339 is a consequence of the unresolved import)
src/utils/video-manifest.deixis.spec.ts                                           TS2307  (T2)
```

Only the missing-symbol kinds the breakdown allows, only in the later-owner specs; zero diagnostics in any non-spec file and in any other spec.

## Component runner

`npm run test:components` with all specs present: `Application bundle generation failed`, 10 TS2307/TS2339 errors from the specs above (re-counted from the last build before the final spec fixes it printed 11, one of which, a TS2554, was since fixed); **no component spec executes** (the Angular
`unit-test` builder type-checks every spec of the tsconfig). With the six files above held aside in the scratchpad (restored afterwards; `git status` confirms all present):
`Test Files 2 passed (2) / Tests 32 passed (32)`, i.e. the two pre-existing component specs are healthy. The new component spec cannot run until T11 creates the component, and
`npm test` (both runners) cannot be green until T2, T9, T11 and T34 exist. This is the state US-8.1 was in, and the breakdown's constraint 1 anticipates it.

## Architecture gate

`bash arch-guard.sh`: `All frozen files unchanged`, `ALL CHECKS PASSED` (run after the last file was written).

## Satisfiability checks (not part of the repository)

`src/utils/image-deixis.spec.ts` was run in the scratchpad against a naive throw-away regex implementation: first run 83/86, which exposed four defects in the SPECS themselves
(a table row where the intervening figure legitimately has the pointer paragraph above it; a parser helper created after `DOMParser` was stubbed away; two helpers whose default
parameter swallowed an explicit `undefined`), all fixed; second run 86/86. `src/prompts/operator-notes.spec.ts` against a reference leaf module: 22/22. The metrics, CLI and component
specs were not checked this way.

## Coverage gaps and deferred tests (what the reconciliation reviewer should expect)

See the matrix, "Coverage statement", and the strategy, "DEFERRED". In short: FR-41, FR-31 items 2/4/5 and the FR-25 form side have no test (H-FR41TEST); the FR-20 precedence sentence
(H-FR20PREC) and the FR-11 item 3 marker wording (H-FR11I3) are not asserted; AC-10's D-3, D-4, D-5, D-7, D-9 and the "number absent" exit are not asserted (H-OD10); AC-11 and AC-12
are live-run criteria (T36, H-OD11). No default of any unanswered question was assumed.

## Observations for later stages

- The `faq-pipeline.ts` positional slices (`0..400`, `3000..3400`) could not be re-verified against a master that has not changed; builder tasks T27..T32 and T33 must re-verify they still
  discriminate and extend them, never narrow them. `task-c.master-reach.spec.ts` and `payload-oracle.d15.spec.ts` give an offset-independent check meanwhile.
- `FR-16` vs breakdown T2 on «на фотополімерній смолі» (see the strategy): the spec follows the breakdown.
- The component spec assumes the plan's D9 input names (`values`, `labels` keyed by the four notes keys, `valuesChange`); the metrics spec assumes `measureDescription` and four report keys.
  Both are listed in the strategy under "Contracts chosen by TEST_WRITING".
- The FR-23 item-1 absence pin (plan-review N19) is in `constants.expert3d.spec.ts`; N17, N21, N22 are applied as described in the strategy.
