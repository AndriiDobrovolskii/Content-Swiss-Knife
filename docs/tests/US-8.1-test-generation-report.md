---
artifact: test_generation_report
story: US-8.1
version: 1
status: DRAFT
owner: so-test-writer
created_at: 2026-10-14T19:45:00Z
updated_at: 2026-10-14T19:45:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 1
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

# Test Generation Report - US-8.1

## Files changed (tests and test fixtures only)

No implementation code, no FROZEN file and no `.arch-guard-checksums` was edited. `git status` outside `docs/` lists exactly these paths (nothing else):

**New specs (9)** - `src/prompts/task-c.faq.spec.ts`, `src/prompts/task-c.description-bytes.spec.ts`, `src/utils/faq-html.spec.ts`, `src/utils/faq-gate.spec.ts`, `src/utils/structural-parity.faq.spec.ts`, `src/utils/faq-form.spec.ts`, `src/app/tab-descriptors.spec.ts`, `src/services/content-orchestrator.faq-pipeline.spec.ts`, `src/services/content-orchestrator.faq-standalone.spec.ts`.

**New shared fixtures, not specs (3)** - `test/fixtures/faq-pipeline.ts` (FAQ strings, routing routes, call classification, boot with a `HistoryService.add` handle), `test/fixtures/task-c-description-inputs.ts` (the 96 deterministic `buildPromptC` description cases), `test/fixtures/golden/task-c-description-prompts.json` (the AC-18 golden).

**Extended / rewritten existing specs (3)** - `src/prompts/task-faq.spec.ts` (+5 tests appended, existing 5 untouched), `src/app/app.component.template-wiring.spec.ts` (+21 tests appended, existing 12 untouched), `src/services/content-orchestrator.simplified.spec.ts` (the R6 block rewritten, see below).

No `*.component.spec.ts` was added. All new tests run under `npm run test:logic`.

## Baseline (before any test was written)

`npx vitest run` on the clean tree (working-tree changes were `docs/` only): `Test Files  175 passed (175)`, `Tests  5176 passed | 3 skipped (5179)`.
`npx tsc --noEmit` on the clean tree: exit 0, no output. `bash arch-guard.sh`: exit 0 ("ALL CHECKS PASSED", "All frozen files unchanged"), HEAD `27b01b8`.

## The AC-18 golden was captured from the UNMODIFIED `task-c.ts`

Immediately before capture: `git diff -- src/prompts/task-c.ts .arch-guard-checksums` empty, HEAD `27b01b8`, `bash arch-guard.sh` exit 0. The golden was written by a one-off temporary vitest file (`src/prompts/zz-capture-tmp.spec.ts`, run once and deleted; it is not in the tree) that builds the 96 cases of `test/fixtures/task-c-description-inputs.ts` with the real `buildPromptC` and records, per case, the SHA-256 digest, the length and the `cache` flag of every system block and the digest and length of `userContent`. The corpus HTML input is read with line endings normalised (the worktree is CRLF under `autocrlf`; the first capture was from CRLF text and was redone from normalised text so a Linux checkout gives the same digests). After the capture: `git diff` for `task-c.ts` and the checksums still empty; `npx vitest run src/prompts/task-c.description-bytes.spec.ts src/prompts/task-c.spec.ts src/prompts/full-description.golden.spec.ts` = 3 files, 173 tests, all passed. The permanent spec only READS the golden; there is no `-u`, no snapshot and no write path.

The pair count the Specification names is derived, not typed: `registryPairs()` yields 16 (3DDevice 2, 3DPrinter 2, 3DScanner 2, Center 3D Print 4, Drukarka 3D 1, EXPERT3D 3, Expert-3DPrinter 2), and a premise test asserts `=== 16`.

## Observed run (after the tests were written)

`npx vitest run` (whole `test:logic` suite, JSON reporter): `Test Files 184 (173 passed, 11 failed)`, `suites 1333  tests 6095  passed 5522  failed 570  pending 3`, exit 1. The 9 new spec files plus the 175 baseline files are 184. **Every failing file is one of the 11 below; no other file contains a failure.** No pre-existing test fails: the failing tests in the three extended files are all new (names begin `US-8.1`, or the 3 new `AC-6` tests) or are the 5 rewritten R6 tests.

| Spec | Table | Collected | Red | Green | Red reason (real output) |
|---|---|---|---|---|---|
| `src/prompts/task-c.faq.spec.ts` | A (T1) | 120 | 65 | 55 | `expected '[ROLE]\nYou are an expert technical c...' to match /element[- ]for[- ]element/i` (description prompt returned for `contentKind: 'faq'`); `expected [ '</section>', '<hr', '<h2', ...(4) ] to deeply equal []` (markers still present); `expected true to be false` (master prompt still included) |
| `src/utils/faq-html.spec.ts` | A (T3) | not collected (46 authored cases) | - | - | `Failed to resolve import "./faq-html" from "src/utils/faq-html.spec.ts". Does the file exist?` - **red by absent module, by design** |
| `src/utils/structural-parity.faq.spec.ts` | A (T4) | 18 | 16 | 2 | `TypeError: (0 , __vite_ssr_import_1__.validateFaqStructuralParity) is not a function` (the 2 green are the NFR-7 description-comparison guards) |
| `src/utils/faq-gate.spec.ts` | A (T5) | not collected (44 authored cases) | - | - | `Failed to resolve import "./faq-gate" from "src/utils/faq-gate.spec.ts". Does the file exist?` - **red by absent module, by design** |
| `src/services/content-orchestrator.faq-standalone.spec.ts` | A (T8) | 112 | 112 | 0 | `TypeError: booted.orchestrator.generateFaqOnly is not a function` (every test fails individually; setup is memoised instead of `beforeAll` so the suite is not reported as skipped) |
| `src/utils/faq-form.spec.ts` | A (T9) | not collected (21 authored cases) | - | - | `Failed to resolve import "./faq-form" from "src/utils/faq-form.spec.ts". Does the file exist?` - **red by absent module, by design** |
| `src/app/tab-descriptors.spec.ts` | A (T10) | not collected (51 authored cases) | - | - | `Failed to resolve import "./tab-descriptors" from "src/app/tab-descriptors.spec.ts". Does the file exist?` - **red by absent module, by design** |
| `src/prompts/task-faq.spec.ts` | B (T2) | 10 (5 existing + 5 new) | 3 | 7 | `expected '[OUTPUT CONTRACT - Schema v4.0 §8 art...' not to match /<\/?strong\b/` (and the same for the whole payload and with an overlay) |
| `src/services/content-orchestrator.faq-pipeline.spec.ts` | B (T6, T7) | 540 | 349 | 191 | `expected [ 'FAQ (en-GB)', 'FAQ (uk-UA)', ...(1) ] to deeply equal [ 'FAQ (uk-UA)' ]` (per-language generation still happens); `expected [] to deeply equal [ 'en-GB', 'ru-UA' ]` (no translation call); `expected [ 'uk-UA' ] to deeply equal [ 'en-GB', 'ru-UA', 'uk-UA' ]` (UA mode: no entry per language); `en-GB: expected 3 to be +0` (a `<strong>` survives into storage); `expected [...] to have a length of 3 but got 1/5/6` (attempt counts) |
| `src/services/content-orchestrator.simplified.spec.ts` | B (T6, T7; R6 block) | 29 | 5 | 24 | `expected [ 'FAQ (en-ES)', 'FAQ (es-ES)', ...(2) ] to deeply equal [ 'FAQ (uk-UA)' ]` (x4 templates); `expected [] to deeply equal [ 'en-ES', 'es-ES', 'pt-PT' ]` (UA-only: no translations) |
| `src/app/app.component.template-wiring.spec.ts` | B (T9, T11, T12) | 33 (12 existing + 21 new) | 20 | 13 | `expected 'export type AppMode = ... ' to contain ''faq-generator''`; `isFaqFormValid not found: expected '' not to be ''`; `FAQ form block not found: expected '' not to be ''`; `expected 0 to be greater than or equal to 3` |
| `src/prompts/task-c.description-bytes.spec.ts` | B (characterization) | 100 | 0 | 100 | green by design (see above) |

(The pipeline count of 540 is `describe.each` over 7 stores x the two entry points x the scenarios; the 4 module-absent specs' authored counts were measured by loading them against empty stand-in modules that were deleted again, so those numbers are real case counts even though the files do not collect on the branch.)

### Module-absent specs ("red by absent module, by design", constraint 4)

`faq-html.spec.ts`, `faq-gate.spec.ts`, `faq-form.spec.ts`, `tab-descriptors.spec.ts`. These are the four named by the breakdown. Their red state is the recorded intended state, not a broken test. No empty stub modules were added to the repository (that would add source files the breakdown does not list).

### Tests that are GREEN BY DESIGN now (guards that must survive the change)

- `task-c.description-bytes.spec.ts` (100): the one characterization test; stays green through T1.
- `task-c.faq.spec.ts` (55): AC-18 "other side" (`contentKind "description"` equals absent, no HTML sniffing, snippet path), NFR-4 caching on the payload, FR-12 item 2 per-language identity (the description prompt already carries it and the FAQ variant must keep it), "the FAQ reaches userContent verbatim".
- `pipeline` (191): the AC-5 trigger groups (42), AC-8 bold-lead guard (14), "the surrounding run is untouched" / description-retained halves of every failure scenario, FR-21 / FR-23 normaliser guards (master), the Generator `AC-2` / `AC-3` / `AC-9` checks (today's per-language loop also fills every language with well-formed text), and in UA mode `AC-1` (UA already makes one call).
- `simplified` (24), `task-faq` (7), `wiring` (13), `parity` NFR-7 (2).
- `tab-descriptors.spec.ts` has 8 premise tests that would pass against any module (the hand-written store table agrees with `STORE_REGISTRY`).

Each table B spec still has red tests for its owner task: `task-faq` 3 (T2), `pipeline` 349 (T6/T7), `simplified` 5 (T6/T7), `wiring` 20 (T9/T11/T12). Each table A spec is red in full or in the owner-specific part.

## `tsc --noEmit` on the branch after TEST_WRITING (task breakdown, constraint 6)

`npx tsc --noEmit`: exit 2, 19 diagnostics, **all in table A spec files, all of the allowed missing-symbol kinds, none in a table B spec, none in a non-spec file**:

| File | Table | Diagnostics (exact) |
|---|---|---|
| `src/prompts/task-c.faq.spec.ts` | A (T1) | `(39,84)` and `(160,117)` TS2353: Object literal may only specify known properties, and 'contentKind' does not exist in type '{ localizedName?: string; sourceLocale?: string; }' |
| `src/utils/faq-html.spec.ts` | A (T3) | `(21,91)` TS2307: Cannot find module './faq-html' |
| `src/utils/structural-parity.faq.spec.ts` | A (T4) | `(18,10)` TS2724: '"./structural-parity"' has no exported member named 'validateFaqStructuralParity'. Did you mean 'validateStructuralParity'? |
| `src/utils/faq-gate.spec.ts` | A (T5) | `(25,88)` TS2307: Cannot find module './faq-gate'; `(26,33)` TS2307: Cannot find module './faq-html'; `(27,10)` TS2724: no exported member 'validateFaqStructuralParity' |
| `src/services/content-orchestrator.faq-standalone.spec.ts` | A (T8) | `(68,29)`, `(173,31)`, `(211,33)` TS2339: Property 'generateFaqOnly' does not exist on type 'ContentOrchestratorService' |
| `src/utils/faq-form.spec.ts` | A (T9) | `(19,55)` TS2307: Cannot find module './faq-form' |
| `src/app/tab-descriptors.spec.ts` | A (T10) | `(32,91)` TS2307: Cannot find module './tab-descriptors'; `(254,50)`, `(261,55)`, `(266,58)`, `(271,31)`, `(278,49)`, `(279,49)`, `(291,31)` TS2345: Argument of type '"faq-generator"' is not assignable to parameter of type 'AppMode' |

`grep "error TS" | grep -v -E "(task-c.faq|faq-html|structural-parity.faq|faq-gate|faq-standalone|faq-form|tab-descriptors)\.spec\.ts\("` prints nothing (0 lines). Table B specs (`faq-pipeline`, `simplified`, `task-faq`, `template-wiring`, `description-bytes`) and both new fixtures carry zero diagnostics. As an extra check that the table A specs are written against the fixed signatures, `tsc` was also run once against four throwaway signature-only declaration modules (`faq-html`, `faq-gate`, `faq-form`, `tab-descriptors`, built from the breakdown's signatures, deleted immediately, never in the tree): the four specs then type-check with only the two diagnostic kinds left that need a production edit (the `'faq-generator'` `AppMode` literal and the `validateFaqStructuralParity` export).

## Rewritten existing tests: R6 block of `content-orchestrator.simplified.spec.ts` (before / after)

The breakdown assigns this rewrite to TEST_WRITING (T6/T7). 5 tests changed; the trigger tests are untouched.

| # | Before | After |
|---|---|---|
| 1-4 (one per template: Filaments/resins/powders, Accessories, Spare parts, Full description) | "`<template>` + FAQ source materials: an FAQ artifact is generated for EVERY store language": `FAQ (` labels == one per store language; `faqArtifacts` keys == all languages; each value starts with `<` | "...: ONE uk-UA FAQ is generated and translated into every other store language": `FAQ (` labels == `['FAQ (uk-UA)']`; the translation calls' languages == the non-master languages; `faqArtifacts` keys == all languages; each value starts with `<` (kept) |
| 5 (UA-only mode) | "with FAQ source materials: exactly one uk-UA FAQ artifact, for a simplified template": labels == `['FAQ (uk-UA)']`; `faqArtifacts` keys == `['uk-UA']` | "...: ONE uk-UA FAQ generation, translated into every other store language, for a simplified template": labels == `['FAQ (uk-UA)']` (kept); translation languages == non-master languages; `faqArtifacts` keys == all languages |

Harness change: the text mock gained one branch returning the harness's FAQ for a label that starts with `FAQ` but not `FAQ (` (a translation call), because the harness otherwise returns a `<p>` stub that structural parity would reject. Unchanged and still green: no-materials / whitespace-only skip tests, "same input, same FAQ prompt (simplified vs Full)", "the description never carries the FAQ", UA-only skip and Doc-request tests. Nothing was weakened, skipped or deleted; no coverage exclusion was added.

## Acceptance-check filters for the builder (run once now to confirm what they select)

T6 and T7 share one spec file and one service file, and the spec contains groups owned by different tasks. These `-t` filters (vitest matches the regex against the full test name) select them:

| Task | Command | Selects (verified) |
|---|---|---|
| T6 | `npx vitest run src/services/content-orchestrator.faq-pipeline.spec.ts -t "Generator \(generate\)"` | the Generator groups only: 255 tests (87 pass today as guards, 168 red); excludes the UA groups and the FR-19 block |
| T7 | `npx vitest run src/services/content-orchestrator.faq-pipeline.spec.ts -t "UA Description \(generateUaContent\)"` | the UA Description groups only: 255 tests (95 pass today as guards, 160 red) |
| T7 (end) | `npx vitest run src/services/content-orchestrator.faq-pipeline.spec.ts` | the whole file, 540 tests: the 30 not covered by the two filters are the FR-19 / AC-14 parity block (7 stores x 4) and 2 premises; they need BOTH entry points and go green only at T7 |
| T6 | `npx vitest run src/services/content-orchestrator.simplified.spec.ts -t "R6"` | the R6 block: 14 tests (9 green, 5 red today); the 4 Generator R6 tests turn green at T6 |
| T7 | `npx vitest run src/services/content-orchestrator.simplified.spec.ts -t "UA-only mode"` | 3 tests (2 green, 1 red today); the red one, "with FAQ source materials: ONE uk-UA FAQ generation, translated into every other store language, for a simplified template", is the T7-only test |

Run as one file, the R6 block therefore still shows 1 red test after T6 (the UA-only one stays red until T7): that is expected, not a regression. Likewise the whole `faq-pipeline.spec.ts` stays partly red after T6 (the UA groups and the FR-19 block belong to T7).

## Findings (honest limits and surprises)

1. **`npm run test:components` also fails on the branch** (not only `npm run build`). It runs the Angular `unit-test` builder against `buildTarget app:build:development`, which compiles the whole `tsconfig.json` program, so the same 19 diagnostics make it exit 1 ("Application bundle generation failed") before a single component spec runs. The breakdown anticipated `build` and `lint` being non-zero until T10 but did not name `test:components`. The two existing component specs (`content-template-select`, `model-settings`) therefore cannot be executed between TEST_WRITING and T10. They are not affected by any test written here, but the claim cannot be proved yet: the task breakdown's per-task gate item 2 ("every test that passed before still passes (both runners)") cannot be evaluated for `test:components` at any task from T1 to T9; the first honest run is after T10 (allowlist empty) and at QUALITY_GATE. This follows from the approved red-spec convention (the same mechanism that already makes `build` red) and the only fix, empty stub modules, was rejected by the breakdown; it needs a human decision at the next gate (accept that `test:components` is unevaluated until T10, or direct stubs). `npm run build` was not run separately: it compiles the same program and prints the same diagnostics.
2. **The T6 "stub block repairer returns `<strong>`" case is untestable.** No validator in the FAQ chain emits a block-scoped (`block[i]`) issue (`validateGeneratedHtml` does not call the sentence-length or heading-style checks; the FR-9 and parity checks are path-less), so `repairBlocks` is never invoked for a FAQ. Recorded in the strategy; AC-7 is asserted on every text that reaches storage and on the master handed to translation instead.
3. **Default `maxRepairs` is 1**, so today the gate makes 2 master attempts; the cap tests run with 0, 2 and 5 to pin the fixed cap of 3 independent of the setting (plan Rejected 8).
4. **Accidental greens were designed out.** Counting `FAQ (` labels would pass today for every 3-language store (3 attempts x 1 language, or 1 attempt x 3 languages), so master-attempt assertions compare the whole label list to `['FAQ (uk-UA)', ...]`; generation calls are identified by their payload (the FAQ system block), not by label; "translation prompts are identical" and "the master handed to translation" assert the call count first so they cannot pass vacuously.
5. **Label dependence.** A FAQ translation call is recognised by a label that starts with `FAQ` and is not a generation call (plan D5 / T6 note: `FAQ translation (iso)`). If the builder labels it otherwise, every pipeline test that counts translation calls fails loudly; that is intended, the label is part of the plan.
6. **Pins beyond the Specification text**, flagged for RECONCILIATION: the progress line `FAQ Generation Done!`, `content().website` on a standalone result, one history entry holding the input and the FAQ (T8, not in AC-13/AC-15 wording); the fixed cap of 3 independent of the user setting (plan); source-text pins that match `this.faq*()` patterns.
7. **Corpus gap**: the corpus has no FAQ artifact and no `<strong>` example (impact analysis). One small authored FAQ set was added (`FAQ_MASTER_HTML` and its `<strong>` and invalid twins); no corpus triple was added or changed. The only coverage of `<strong>` is therefore synthetic.
8. **Golden is digest-based**, so a future failure shows which part differs and by how many characters but not the text diff; the alternative (storing ~35 KB of master prompt per case) was rejected for size.
9. **Hand-derived literals** in `tab-descriptors.spec.ts` are cross-checked against `STORE_REGISTRY` and `bcp47ToTaskCLang` by 8 premise tests that run even before the module exists.
10. Line endings: the worktree is CRLF (`core.autocrlf=true`); all touched files were left CRLF to match, and the golden's input is normalised so it is checkout-independent.

## Verification checklist (so-test-writer)

- [x] Every component spec named `*.component.spec.ts`: none exist; no spec needs the component runner.
- [x] Service specs use `Injector.create` with `import '@angular/compiler'` first (via the shared fixture; `simplified` keeps its own).
- [x] Every `AC-1` to `AC-19` has a row with a real file and test name; `AC-20` is mechanical (stated).
- [x] No test's only assertion is `toBeTruthy()`; no assertion is copied from an actual run (only the AC-18 golden is a captured characterization, as the breakdown specifies).
- [x] No `sleep`, no unseeded randomness, no network.
- [x] Tests were run and the failing output recorded above; failures are assertion failures or the four named module-absent loads, plus the `is not a function` pair named in the table.
- [x] Pre-existing tests still pass **on the logic runner** (5171 of the 5176 baseline passes are unchanged and green; the other 5 are the rewritten R6 tests, which are the intended red). **Not verified for the component runner**: `npm run test:components` exits 1 at compile on this branch (finding 1) and no baseline run of it was taken on the clean tree, so the two existing component specs were not executed either before or after.
- [x] FROZEN files untouched: `git diff -- src/prompts/task-c.ts .arch-guard-checksums` empty; `bash arch-guard.sh` exit 0 after all edits.
