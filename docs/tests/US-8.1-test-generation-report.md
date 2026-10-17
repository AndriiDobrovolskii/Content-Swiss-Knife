---
artifact: test_generation_report
story: US-8.1
version: 4
status: ARCHIVED
owner: so-test-writer
created_at: 2026-10-14T19:45:00Z
updated_at: 2026-10-15T17:00:00Z
supersedes: docs/tests/US-8.1-test-generation-report.md#3
inputs_consumed:
  - key: story
    version: 3
  - key: specification
    version: 3
  - key: impact_analysis
    version: 2
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 4
  - key: plan_review
    version: 4
  - key: test_strategy
    version: 2
  - key: ac_test_matrix
    version: 4
  - key: security_review
    version: 1
  - key: reconciliation_report
    version: 1
open_decisions_blocking: false
---

> **Revision v4 (2026-10-15).** v3 (the sections below, unchanged) reported TEST_WRITING for Specification v2 and its two loop-backs. v4 adds the final
> section "v4 addendum: the FAQ Generator layout delta (T14 to T17)" with real command output. Nothing above it is reworded.

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

## Loop-back addendum (v2): security finding B-1, red regression tests written BEFORE the fix

Trigger: IMPLEMENTATION returned CHANGES_REQUIRED (`changes_required_tests`) for security finding B-1 (`docs/reviews/security/US-8.1-security-review.md` v1), with a test brief (TW-1) recorded in the pipeline status. No implementation, FROZEN file or `.arch-guard-checksums` was touched; no existing test was edited, weakened or skipped.

Files changed: `src/utils/faq-html.spec.ts` (+19 tests: one new describe), `src/utils/faq-gate.spec.ts` (+6 tests: one new describe), `src/services/content-orchestrator.faq-pipeline.spec.ts` (+3 cases, run for both entry points = +6 tests, inside "AC-16: the uk-UA master"; the orchestrator-level test was cheap with the existing `mode.run` and `FAQ_MASTER_HTML` fixtures and imports only symbols that already exist).

Baseline before this loop-back: 184 files, 6254 passed, 3 skipped (6257).

Observed run (real output, `npx vitest run`, whole logic suite): `Test Files  3 failed | 181 passed (184)`, `Tests  20 failed | 6265 passed | 3 skipped (6288)`. 31 tests were added (6257 + 31 = 6288); 11 of them are green guards (6254 + 11 = 6265 passed, so every previously passing test still passes) and **20 are red, the only failures**:

| File | Red | Failure message (right reason) |
|---|---|---|
| `faq-html.spec.ts` R1-R8 | 8 | `expected at least one issue for "<h3>Q</h3><p>A</p><img src=x onerror=alert(1) a'>", got 0: expected 0 to be greater than or equal to 1` (same shape for R2-R8) |
| `faq-gate.spec.ts` R1-R3 master | 3 | `expected at least one contract error for "...", got 0: expected 0 to be greater than or equal to 1` |
| `faq-gate.spec.ts` R1-R3 translation validator | 3 | `expected true to be false` (`isFaqStorable` returned true) |
| `faq-pipeline.spec.ts` B-1 (3 cases x Generator and UA) | 6 | `AssertionError: expected [ 'FAQ (uk-UA)' ] to deeply equal [ 'FAQ (uk-UA)', 'FAQ (uk-UA)', ... ]` (the poisoned master was accepted on attempt 1) |

Guards, green now by design (11): `faq-html` R9 (see finding below), G1-G6 (accepted with no issue), G7-G10 (still rejected with `faq-attribute-present` / `faq-element-not-allowed`).

Finding: **R9 is not red.** The brief expected `<h3>Q</h3><p onclick='x()>A</p>` to be accepted today; the real function already rejects it, because the unmatched `<p` leaves a `</p>` that was never opened (`faq-not-well-formed`). The case is kept as a guard (it must stay rejected after the fix), not as a red test; it is rejected for an incidental reason, which the fix must preserve either way.

`npx tsc --noEmit`: exit 0, 0 diagnostics. The new tests import only existing modules and symbols, so no import-level red exists in this loop-back.

Builder acceptance check: `npx vitest run src/utils/faq-html.spec.ts src/utils/faq-gate.spec.ts` plus `npx vitest run src/services/content-orchestrator.faq-pipeline.spec.ts -t "B-1"`; all must be green after the fix, then the full `npm run test:logic` must return to 184 files, 6288 passed, 3 skipped.

## Loop-back addendum (v3): RECONCILIATION finding F-1, the AC-19 integration half (TEST_WRITING loop-back 2 of 3)

Trigger: RECONCILIATION returned CHANGES_REQUIRED (`changes_required_tests`), `docs/reconciliation/US-8.1-reconciliation-report.md` v1, finding F-1 (blocking) plus the recommended tightening N-1/N-2. No implementation file, FROZEN file or `.arch-guard-checksums` was touched; no existing assertion was edited, weakened or skipped (the only edits to existing lines are the import lists of two specs that gained names).

### What was missing

`task-c.faq.spec.ts` proves the FAQ variant of the Task C prompt exists when `buildPromptC` is called with the explicit FAQ option. Nothing proved the production pipeline passes it. The reviewer removed the option from the translation call in a throwaway worktree and 1442 tests across 30 files stayed green: FAQ HTML would have gone through the full description prompt (closing H2 / CTA, delivery sentence, H1 LOCK, master prompt) with every gate green.

### Tests added (+58, all logic runner, no `*.component.spec.ts`)

| File | Added | What |
|---|---|---|
| `test/fixtures/faq-pipeline.ts` | helpers only | `DESCRIPTION_ONLY_MARKERS` (the nine plan-D4 markers, the same list `task-c.faq.spec.ts` uses), `faqTranslationPromptProblems(payload)` (returns the reasons a payload is not the FAQ variant: no element-for-element instruction, an element name missing, no no-additions instruction, any description-only marker anywhere in system blocks or `userContent`, a `MASTER_SYSTEM_PROMPT` block or slice), `looksLikeDescriptionPrompt(payload)` |
| `src/services/content-orchestrator.faq-pipeline.spec.ts` | 35 | Generator (`generate`) and UA Description (`generateUaContent`), per store of `STORE_REGISTRY` (7): a premise test (one FAQ translation call per non-master language captured) and "every FAQ translation prompt demands an element-for-element translation and carries NO description-only instruction" (28 tests); plus a discrimination control per store, Generator: the description translation prompts of the same run ARE flagged by the same helpers (7 tests), so the markers are not trivially absent |
| `src/services/content-orchestrator.faq-standalone.spec.ts` | 14 | `generateFaqOnly`, per store (7): the same two tests |
| `src/app/app.component.template-wiring.spec.ts` | 9 | AC-10: the mode button's only label binding is `uiLabels().faqGenerator`; the key is `'FAQ Generator'` in both label maps; the switcher holds the faq, seo and slug mode buttons; the FAQ button sits in the same row as the UA Description button. AC-11: `isFaqFormComplete` receives exactly `faqSelectedWebsite()`, `faqProductName()`, `faqSupplementalContent()`; the Store select, the Product Name input and the Supplemental Content source input each write the signal the predicate reads |

None of the orchestrator specs imports or names the option that selects the variant; they assert on what the stubbed `LlmService` received. They assert the FR-12 items (element-for-element, no description-only instruction), not exact sentences (OD-5). Languages come from the registry (every non-master language of each of the 7 stores = 16 translation prompts per entry point), never from a typed list.

### Mutation proof (not vacuous), real output

The tests pass against the current correct code (expected for a coverage-gap loop-back): `npx vitest run` on the two orchestrator specs = `Test Files 2 passed (2)`, `Tests 707 passed (707)`.

Mutation 1 (temporary local edit of `src/services/content-orchestrator.service.ts`, one line: `{ sourceLocale: MASTER_LOCALE, contentKind: 'faq' }` -> `{ sourceLocale: MASTER_LOCALE }` in `faqTranslationPayload`; reverted with `git checkout -- src/services/content-orchestrator.service.ts`, `git diff` for that path empty afterwards): the same two files = `Test Files 2 failed (2)`, `Tests 21 failed | 686 passed (707)`. The 21 are exactly 7 stores x 3 entry points, all of them the "every FAQ translation prompt ..." test:

| Entry point | Failing tests | Right reason (real output) |
|---|---|---|
| Generator (`generate`) | 7 | `AssertionError: FAQ translation (en-GB): expected [ ...(9) ] to deeply equal []`; the received list includes `"no element-for-element translation instruction"` and `"description-only marker present: </section>"` |
| UA Description (`generateUaContent`) | 7 | same shape (`FAQ translation (pl-PL): expected [ ...(10) ] to deeply equal []`) |
| `generateFaqOnly` | 7 | same shape (`FAQ translation (en-ES): ...`) |

The premise tests (7 per entry point) and every pre-existing test stayed green under the mutation (686 passed), which matches the reviewer's finding that the old suite could not see this regression.

Mutation 2 (the AC-10 and AC-11 pins; temporary edits of `src/app/app.component.html` (the mode button label key `faqGenerator` -> `faqOnlyTitle`) and `src/app/app.component.ts` (the `productName:` argument of `isFaqFormComplete` rewired to `this.faqDescription()`), both reverted with `git checkout`): `src/app/app.component.template-wiring.spec.ts` = `Tests 3 failed | 39 passed (42)`. The two NEW pins fail ("the FAQ Generator mode button shows uiLabels().faqGenerator ..." and "isFaqFormComplete receives faqSelectedWebsite() as the store, faqProductName() and faqSupplementalContent()"); the third failure is the existing "AC-12: the validity computation does not read Original Description or Tech Specs", which the rewiring to `faqDescription()` legitimately violates. Unmutated: 42 passed.

After both mutations `git status` listed only the four test paths (and, later, the two docs); no implementation file.

### Final run (real output)

- `npm run test:logic`: `Test Files 184 passed (184)`, `Tests 6343 passed | 3 skipped (6346)`, exit 0. Baseline before this loop-back: 184 files, 6285 passed, 3 skipped, 0 failed. 6343 - 6285 = 58 = exactly the new tests (35 + 14 + 9); no spec file was added, so the file count is unchanged.
- `npx tsc --noEmit`: exit 0, 0 diagnostics.
- `bash arch-guard.sh`: exit 0 ("ALL CHECKS PASSED").
- `npm run test:components` was not re-run in this loop-back (no component spec or Angular source was touched).

### Matrix corrections (ac_test_matrix v3)

The "State now" / "Green by" columns were stale (the TEST_WRITING-time RED snapshot). v3 keeps that snapshot as "State at TEST_WRITING" and adds a refreshed "State now (v3)" column (all GREEN, observed by the full run above). The faq-form row claimed whitespace "incl. NBSP"; `faq-form.spec.ts` tests spaces, tab and newline only, so the claim was corrected rather than a test added (the implementation's `trim()` would handle U+00A0 but nothing asserts it). New rows: AC-19 pipeline and standalone, AC-10 and AC-11 wiring.

### Limits (unchanged by this loop-back)

The AC-4 / AC-10 / AC-11 wiring pins are still source-text pins, not a rendered DOM; "alongside SEO Meta and Slugs" is pinned as presence in the one mode switcher plus adjacency to UA Description, not as visual position. A manual run of the FAQ Generator in a browser remains advisable at HUMAN_PR_APPROVAL (reconciliation N-3).

---

## v4 addendum: the FAQ Generator layout delta (T14 to T17; FR-24 to FR-28, NFR-9; AC-21 to AC-26)

Stage: TEST_WRITING for the APPROVED plan v2 (D12 to D16) and task breakdown v4 (T14 to T17), written on branch `feat/US-8.1-single-master-faq` at HEAD `4c5f37e`, **before any implementation of T14 to T17**. T1 to T13 are built and green and were not touched.
Binding instructions followed: the approver's N2 (split mixed baseline states), N3 (exact key / icon / slice matching), N4 (diff range = the commit before the first v4 task, which is T15), N5 (the `*` pin, done).

### Files changed

| Path | Change |
|---|---|
| `src/app/app.component.faq-layout.spec.ts` | **new**, 37 tests, `test:logic`. Table B: reads `app.component.html`, `app.component.ts`, `source-input.component.html` and `source-input.component.ts` as text; imports only `vitest`, `node:fs`, `node:path` |
| `docs/tests/US-8.1-test-strategy.md` | v1 -> v2 (addendum) |
| `docs/tests/US-8.1-ac-test-matrix.md` | v3 -> v4 (AC-21 to AC-26 rows) |
| `docs/tests/US-8.1-test-generation-report.md` | v3 -> v4 (this section) |

No implementation file (`src/app/app.component.html`, `src/app/app.component.ts`, `source-input.component.*`), no FROZEN file, no `.arch-guard-checksums`, no existing test, fixture or golden was edited. `git status` after the work lists only the new spec and the three docs.

### Table, runner, compile state (V4-6)

| Spec | Table | Runner | `tsc --noEmit` | Red because |
|---|---|---|---|---|
| `src/app/app.component.faq-layout.spec.ts` | **B** (source text; imports nothing a task creates; not `AppComponent`; no Angular) | `test:logic` (not `*.component.spec.ts`; `test:components` gains no file) | **0 diagnostics** (`npx tsc --noEmit` exit 0) | runtime assertion failures ("expected X, got Y"); none by a load error |

### Per-pin baseline state (37 tests: 14 red-first, 23 baseline-guard)

| Tag | Test (shortened) | State on the tree at `4c5f37e` | Runtime failure reason (real output) / protects |
|---|---|---|---|
| `(owner T15)` | FR-24 before a run: faq-generator, empty content, not generating -> condition false | RED | `AssertionError: expected true to be false` (the evaluated condition is true today) |
| `(owner T15)` | FR-24 after a FAQ-only run (faqArtifacts populated, other fields empty) -> false | RED | `expected true to be false` |
| `(owner T15)` | FR-24 after a run that stored no FAQ (faqArtifacts empty) -> false | RED | `expected true to be false` |
| `(owner T15)` | FR-24 condition text contains `appMode() !== 'faq-generator'` | RED | `AssertionError` (text lacks the term) |
| `(owner T16)` | FR-26 anchors in order Store, Product Name, Supplemental, Description, Specs, toggle | RED | `expected [ 'Store select', ...(5) ] to deeply equal [ ... ]`; received `Store select, Product Name input, Original Description, Tech Specs, Supplemental Content, Deep Thinking toggle` |
| `(owner T16)` | FR-26 first `app-source-input` of the FAQ form is the Supplemental one | RED | `expected '<app-source-input ... [label]="uiLabels().originalDescription" ...' to contain '(valueChange)="faqSupplementalContent.set($event)"'` |
| `(owner T17)` | FR-27 FAQ Supplemental input has `[label]="uiLabels().supplementalContentRequired"` | RED | `expected '<app-source-input ... [label]="uiLabels().supplementalContent" ...' to contain '[label]="uiLabels().supplementalContentRequired"'` |
| `(owner T17)` | FR-27 / FR-28 exact key `uiLabels().supplementalContent` used exactly once in the template, inside `generatorForm` | RED | `expected [ ...(2) ] to have a length of 1 but got 2` |
| `(owner T17)` | FR-27 the new key is read exactly once, in the FAQ form | RED | `expected [] to have a length of 1 but got +0` |
| `(owner T14)` | FR-27 `en` carries `supplementalContentRequired: 'Supplemental Content (Required)'` | RED | `expected null to be 'Supplemental Content (Required)'` |
| `(owner T14)` | FR-27 the `en` label has no "Optional" | RED | `en supplementalContentRequired is missing: expected null not to be null` |
| `(owner T14)` | FR-27 `uk` = `Додатковий контент (Обов'язково)`, apostrophe U+0027 | RED | `expected null to be 'Додатковий контент (Обов\'язково)'` |
| `(owner T14)` | FR-27 `uk` has no U+2019 / U+02BC, no "Опціонально", no "Optional", differs from `en` | RED | `uk supplementalContentRequired is missing: expected null not to be null` |
| `(owner T14)` | FR-27 new key present in BOTH blocks | RED | `expected [ 'appTitle', 'generator', ...(168) ] to include 'supplementalContentRequired'` |
| `[baseline-guard]` x3 | FR-24 premises: `noContentYet` / `fillFormStart` once each in one block with its own `fa-file-code`; condition is a plain expression of `appMode()`, `content()`, `isGenerating()` only; condition holds no `hasOutput` / `hasFaqOutput` / `faqArtifacts` | GREEN | stay green through T15 |
| `[baseline-guard]` | FR-24 during a run (isGenerating true) -> false for every content state | GREEN (already false through the existing `!isGenerating()`; split out of the red rows per N2) | stays green through T15 |
| `[baseline-guard]` x5 | FR-28 oracle: `generator`, `ua-generator`, `seo-generator`, `slug-generator` each over 48 states incl. trap states vs. the literal oracle of today's condition; plus the oracle-discrimination test | GREEN | must stay green at T15 (the task that can break it), T16, T17 |
| `[baseline-guard]` x6 | FR-28 forms and labels: blocks found; `generatorForm` input bound to the exact `supplementalContent` key, no `[required]`; order `description.set`, `specs.set`, `supplementalContent.set`; SEO / Slug / `generatorForm` do not bind the new key; `en` and `uk` shared literals unchanged | GREEN | must stay green at T14, T16, T17 |
| `[baseline-guard]` x4 | FR-25 structure: slice premise; only the container opening tag remains; container class tokens; FAQ panel root class tokens | GREEN | stay green through T15, T16, T17 |
| `[baseline-guard]` | FR-26 premise: six anchors once each, exactly three source inputs (split out of the T16 red rows per N2) | GREEN | stays green through T16 |
| `[baseline-guard]` | FR-27 whole-dictionary parity en = uk key set (170 / 170 today; none one-sided, none duplicated) | GREEN | must stay green at T14 (key added to both blocks in one commit) |
| `[baseline-guard]` x2 | FR-27 `[required]="true"` on the FAQ Supplemental input (split out of the T17 rows per N2); the shared `source-input` component renders `*` from `@if (required)` and defaults `required = false` (plan review N5) | GREEN | stay green through T16, T17 |

Selectors, observed: `-t "owner T14"` selects 5 failing tests, `T15` 4, `T16` 2, `T17` 3 (14 red); `-t "baseline-guard"` = `23 passed | 14 skipped (37)`; no title carries both markers.

### Observed red run, real output

`npx vitest run src/app/app.component.faq-layout.spec.ts` on the tree at `4c5f37e` + the new spec (no implementation of T14 to T17):

```
 Test Files  1 failed (1)
      Tests  14 failed | 23 passed (37)
```

The 14 failures are exactly the 14 red-first rows above, each an `AssertionError` with the message quoted in the table. Excerpts of the real output:

```
FAIL  ... > (owner T15) FR-24 before a run: faq-generator, empty content, not generating -> the empty-state condition is false
AssertionError: expected true to be false // Object.is equality
FAIL  ... > (owner T16) FR-26 the anchors appear in this order: Store, Product Name, Supplemental Content, Original Description, Tech Specs, Deep Thinking toggle
- Expected  "Store select", "Product Name input", "Supplemental Content", "Original Description", "Tech Specs", "Deep Thinking toggle"
+ Received  "Store select", "Product Name input", "Original Description", "Tech Specs", "Supplemental Content", "Deep Thinking toggle"
FAIL  ... > (owner T17) FR-27 / FR-28 the shared key uiLabels().supplementalContent is used exactly once in the whole template, inside generatorForm
AssertionError: expected [ ...(2) ] to have a length of 1 but got 2
FAIL  ... > (owner T14) FR-27 supplementalContentRequired is present in BOTH TRANSLATIONS blocks (the new key is not one-sided)
AssertionError: expected [ 'appTitle', 'generator', ...(168) ] to include 'supplementalContentRequired'
```

Right reason: every one fails because the behaviour is missing (the empty state is rendered for `faq-generator`; the field is last; the FAQ form reads the shared key; the new key is absent), none because of a missing module or a bad selector.

### Not vacuous (1): the red pins are satisfiable, and each is owned by one task

Throwaway probe (`mutate.cjs` + `probe.sh` in the session scratchpad, not part of the repository): apply the planned implementation to the working tree, run the spec, `git checkout --` the three source files, verify. After every probe `git diff --stat` was empty.

| Applied | Result (real) | Reading |
|---|---|---|
| T14 + T15 + T16 + T17 (exactly the plan's four edits) | `Tests 37 passed (37)` | every red pin is satisfiable by the planned edits, and no guard breaks |
| T14 only | `9 failed / 28 passed` | the 5 `(owner T14)` tests turned green, the 4 T15, 2 T16, 3 T17 stay red; all guards green |
| T15 only | `10 failed / 27 passed` | the 4 `(owner T15)` tests turned green; T14 (5), T16 (2), T17 (3) stay red; all guards green |

### Not vacuous (2): throwaway-mutation probe of the guards

Each row applies the full correct implementation (T14 to T17) plus one realistic WRONG change, runs the spec, and reverts. "Fails" lists the tests that went red (real output); every other test stayed green.

| Wrong implementation | Fails (real) |
|---|---|
| relabel the SHARED key values (`en` -> `(Required)`, `uk` -> `(Обов'язково)`) | 2: `[baseline-guard] ... en keeps supplementalContent 'Supplemental Content (Optional)'`, `... uk keeps supplementalContent 'Додатковий контент (Опціонально)'` |
| bind the `generatorForm` input to the new key (Generator and UA Description would read "Required") | 4: guard `generatorForm: ... bound to uiLabels().supplementalContent (exact key)`, guard `... do not bind the new FAQ-only key`, and the two `(owner T17)` exact-count tests |
| data-derived empty-state fix (`&& !content().faqArtifacts`) instead of a mode term, alone | 6: guard `no data-derived exclusion`, `(owner T15)` before a run, `(owner T15)` text, and the 3 guards `ua-generator` / `seo-generator` / `slug-generator` vs. the oracle (the trap state) |
| the same data-derived conjunct added on top of the correct T15 | 4: guard `no data-derived exclusion` and the 3 oracle guards (so even a fix that does hide the FAQ block is caught when it leaks to other modes) |
| mode term that also hides the block for `slug-generator` | 1: guard `slug-generator: ... equals today's condition` |
| `supplementalContentRequired` missing from `uk` only | 4: two `(owner T14)` uk tests, `(owner T14)` both-blocks, and guard `whole-dictionary parity` |
| `supplementalContentRequired` missing from `en` only | 4: two `(owner T14)` en tests, `(owner T14)` both-blocks, and guard `whole-dictionary parity` |
| a stray extra key in `uk` only (one-sided dictionary) | 1: guard `whole-dictionary parity` |
| typographic apostrophe U+2019 in the `uk` label | 2: `(owner T14)` uk equals U+0027 literal, `(owner T14)` uk rejects U+2019 / U+02BC |
| "Опціонально" left in the new `uk` label | 2: the same two `(owner T14)` uk tests |
| Supplemental placed after Description but before Tech Specs | 2: both `(owner T16)` tests |
| `generatorForm`: Supplemental moved above Description | 1: guard `generatorForm: the order description.set, specs.set, supplementalContent.set is unchanged` |
| `generatorForm` Supplemental made `[required]` | 1: guard `generatorForm: ... exact key ... and has no [required]` |
| scroll container turned into a centring flex box (`flex items-center justify-center`) | 1: guard `the scroll container carries no flex ... class` |
| extra wrapper element between the tab bar and the container | 2: guards `nothing but the scroll container's opening tag remains` and the container class guard |
| FAQ panel root gets `mt-16 min-h-full` | 1: guard `the FAQ result panel root carries no h-full, min-h-*, ...` |
| `[required]="true"` dropped from the FAQ Supplemental input | 1: guard `the FAQ Supplemental source input is passed [required]="true"` |
| shared `source-input` stops rendering the `*` | 1: guard `the source-input component renders the * marker ...` |
| `isGenerating` conjunct removed from the empty-state condition (applied WITHOUT T15; after T15 the mode term makes the FAQ rows ignore `isGenerating`, so this guard can only bite before it) | 9: guard `FAQ during a run: ... -> false for every content state`, guard `the condition is a plain expression of appMode(), content() and isGenerating() only` (the evaluator now sees only two reads), the 4 `(owner T15)` tests (still red, unchanged) and the 3 oracle guards `ua-generator` / `seo-generator` / `slug-generator` |
| T15 done through a helper (`!isFaqOnlyMode() &&`), which the plan rejects | 9: guard `plain expression ...` (`expected [ 'appMode', 'content', ...(2) ] to deeply equal [ Array(3) ]`) and every evaluated test errors with `ReferenceError: isFaqOnlyMode is not defined` (5 of them), which is the V4-4 fail-closed behaviour: the evaluated pins fail, never skip. Includes guard `during a run` and the 3 oracle guards; the `(owner T15)` text test fails too |
| T16 done as a copy instead of a move (Supplemental present twice, four source inputs; applied after T14 and T15) | 4: guard `FR-26 premise: ... each of the six anchors exactly once and exactly three source inputs`, and the three `(owner T17)` tests (the copy still reads the shared key) |
| the `fa-file-code` icon moved out of the empty-state block to just before its `@if` | 2: guard `noContentYet and fillFormStart each occur once ... in one block that also holds its fa-file-code icon`, guard `FR-25 nothing but the scroll container's opening tag remains ...` (the stray icon sits between the tab bar and the result) |

Mutation coverage by guard (22 probes in all, each reverted; `git diff --stat` empty after every one): every `[baseline-guard]` has at least one probe that turns it red EXCEPT the oracle-discrimination test (`the oracle discriminates ...`), which tests the literal oracle function itself and has no mutation of the template that can reach it (it fails only if the oracle copy in the spec is edited); that is stated here rather than claimed. The FR-24 icon-in-block guard is killed by the icon-move probe, the plain-expression guard by the helper and the `isGenerating` probes, the FR-24 during-a-run guard by the `isGenerating` and helper probes, the FR-26 premise guard by the copy-not-move probe, and the FR-25 structure guards by the wrapper, flex, panel-root and icon probes.

### Final run (real output)

- `npm run test:logic`: `Test Files  1 failed | 184 passed (185)`, `Tests  14 failed | 6366 passed | 3 skipped (6383)`, exit non-zero. Baseline before this delta: 184 files, 6343 passed, 3 skipped, 0 failed. 6366 - 6343 = 23 = exactly the new spec's green tests; 14 failed = exactly its red-first tests; 6343 + 3 + 37 = 6383. The 184 pre-existing files are all green: the only red is the new spec's 14 red-first tests.
- `npx tsc --noEmit`: exit 0, 0 diagnostics.
- `bash arch-guard.sh`: exit 0 ("ALL CHECKS PASSED"; "All frozen files unchanged").
- `npm run test:components` was not run: no component spec or Angular source was touched.
- `git status --short` before the commit: `?? src/app/app.component.faq-layout.spec.ts` plus the three modified docs.

The IMPLEMENTATION stage expects, after T17, `npx vitest run src/app/app.component.faq-layout.spec.ts` = 37 passed and `npm run test:logic` = 185 files, 6366 + 14 = 6380 passed, 3 skipped, 0 failed (6343 + 37).

### Coverage gaps and limits

- **AC-22's geometric clause has no automated test.** Manual browser check by the operator at HUMAN_PR_APPROVAL (approver's N1 confirmation; D16 / OD-15 default). The structural pins are only a proxy and were mutation-checked for exactly that (wrapper, flex container, panel root classes).
- All pins are source-text or condition-evaluation pins, not rendered DOM (standing decision; plan review N7 flags the tension with AGENTS.md section 5 for the human).
- The condition evaluator runs repository-owned template text through `new Function`, after a whitelist check of its characters and with the three reads stubbed (plan review N6: mention to the security reviewer).
- AC-25's enablement has no new test (the delta changes no predicate): the existing `faq-form.spec.ts` and wiring pins cover it and stay green unmodified.
- NFR-9's diff property is a gate / diff-review check, not a test. The diff range for the whole-delta check is "the commit before the first v4 task" (T15), not "the commit before T14" (N4): `git diff --stat 4c5f37e..HEAD` after T17 lists the new spec, the three test docs, `src/app/app.component.html`, `src/app/app.component.ts` and whatever other `docs/` files later stages commit (workflow state, reports), and no other source file.
- The task breakdown's T17 acceptance line still says `<commit before T14>`; it was not edited here (it is an approved input). The strategy v2 records the corrected range.
