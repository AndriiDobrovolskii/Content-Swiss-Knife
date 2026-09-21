---
artifact: test_generation_report
story: US-2.2
version: 3
status: DRAFT
owner: so-test-writer
created_at: 2026-09-21T20:30:00Z
updated_at: 2026-09-21T23:30:00Z
supersedes: docs/tests/US-2.2-test-generation-report.md#2
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 1
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: plan_review
    version: 2
  - key: open_decisions
    version: 3
open_decisions_blocking: false
---

# Test Generation Report — US-2.2

No implementation code was written. No existing test, fixture or source file was modified, weakened, skipped or excluded: `git status` shows only new untracked files under `src/`, `test/` and `docs/tests/`. Nothing was committed and no workflow state was written.

## Files created

Specs (all `test:logic` except the one marked):

| File | Task | Registered tests |
|---|---|---|
| `src/prompts/full-description.golden.spec.ts` | T1 (guard) | 14 |
| `src/prompt-core/simplified-templates.spec.ts` | T1 | 0 (module missing) |
| `src/prompt-core/simplified-templates.consistency.spec.ts` | T15 | 0 (module missing) |
| `src/prompt-core/doc-pipeline-flag.simplified.spec.ts` | T11 | 0 (module missing: imports T1 registry) |
| `src/domain/description-doc.schema.simplified.spec.ts` | T3 | 34 |
| `src/domain/description-doc.completeness.spec.ts` | T5 | 0 (module missing) |
| `src/render/render-description.simplified.spec.ts` | T3 | 13 |
| `src/render/render-description.flat-specs.spec.ts` | T4 | 17 |
| `src/utils/doc-absent-paragraphs.spec.ts` (11 walker describes) | T3 | 33 |
| `src/utils/simplified-specs-shape.spec.ts` | T6a | 0 (module missing) |
| `src/utils/simplified-word-ranges.spec.ts` | T6 | 0 (module missing) |
| `src/utils/spec-category-shape.simplified.spec.ts` | T7 | 12 |
| `src/utils/spec-count-parity.simplified.spec.ts` | T7 | 9 |
| `src/utils/output-validator.simplified.spec.ts` (frozen entry point) | T10 | 17 |
| `src/prompts/task-a-doc.simplified.spec.ts` | T8 | 68 |
| `src/prompts/task-a.simplified.spec.ts` | T9 | 22 |
| `src/prompts/task-translate.simplified.spec.ts` | T8/T9 | 17 |
| `src/services/content-orchestrator.simplified.spec.ts` | T12 (incl. R6) | 29 |
| `src/utils/simplified-media-survival.spec.ts` | T15 | 21 |
| `src/utils/simplified-translation-parity.spec.ts` | T15 | 24 |
| `test/render-conformance.simplified.spec.ts` | T15 | 0 (module missing) |
| `test/removal.spec.ts` | T11/T13 | 19 |
| `src/app/content-template-labels.spec.ts` | T14 | 0 (module missing) |
| `src/app/app.component.template-wiring.spec.ts` | T14 | 12 |
| `src/app/components/content-template-select/content-template-select.component.spec.ts` (`test:components`) | T14 | not runnable, see below |

Fixtures and helpers: `test/fixtures/simplified-docs.ts`, `test/fixtures/full-description-inputs.ts`, `test/fixtures/golden/full-description-prompts.json`, `test/fixtures/prompt-clauses.ts`, `test/fixtures/removed-tokens.ts`.

Deviations from the file names in the task breakdown (the tests named there exist; the files differ): new `*.simplified.spec.ts` siblings instead of appending to the existing `description-doc.schema.spec.ts`, `task-a-doc.spec.ts`, `task-a.spec.ts`, `task-c.spec.ts`, `task-translate.spec.ts`, `output-validator.spec.ts`, `spec-category-shape.spec.ts`, `spec-count-parity.spec.ts`, `render-description.spec.ts` (so no accepted spec is edited); one consolidated `doc-absent-paragraphs.spec.ts` with one describe per walker instead of one case in each walker's own spec (`repair-strategy` path helpers are exercised through the `doc-block-repair` and `doc-tier` describes; `doc-prose-transforms` and `doc-schema-issues` have no separate describe: `normalizeDocProse` runs inside the orchestrator specs on every simplified document and `doc-schema-issues` is exercised by the same runs, so a runtime null-safety gap there fails an existing red test — a separate case may be added by the builder if either proves otherwise); the task-C translation checks live in `task-translate.simplified.spec.ts` (`buildPromptC` describe). The consumables specs and fixtures the breakdown deletes (T11) were left in place: deleting them is implementation work, and `test/removal.spec.ts` is what turns red until they go.

## Evidence: the tests were run

Command: `npx vitest run --reporter=json` on the tree as left (no source edits). Real result:

```
Test Files  23 failed | 124 passed (147)        # every failing file is one of the 24 new files (the 24th, the golden guard, is green)
Tests       255 failed | 2960 passed (3218)     # 3 pre-existing skipped tests unchanged
```

Pre-existing tests: all 123 pre-existing files pass (0 failures), including all corpus, reconciliation and conformance specs. The only red files are the new ones.

Golden guard, green as required: `Test Files 1 passed`, `Tests 14 passed` for `full-description.golden.spec.ts`.

### The 255 failures, in three buckets

**(a) Module not yet created: legitimate TDD red (8 files, 0 tests register).** Vitest reports `Failed to resolve import "<module>"`; these files register no test until the task creates the module. This is the skill's "cannot find module" case, kept only where the module IS the new unit and no runtime probe of the behaviour is possible without it:

| Missing module | Created by | Spec files blocked |
|---|---|---|
| `src/prompt-core/simplified-templates.ts` | T1 | `simplified-templates.spec.ts`, `simplified-templates.consistency.spec.ts`, `doc-pipeline-flag.simplified.spec.ts`, `content-template-labels.spec.ts` |
| `src/domain/description-doc.completeness.ts` | T5 | `description-doc.completeness.spec.ts`, `render-conformance.simplified.spec.ts`, consistency |
| `src/utils/simplified-specs-shape.ts` | T6a | `simplified-specs-shape.spec.ts` |
| `src/utils/simplified-word-ranges.ts` | T6 | `simplified-word-ranges.spec.ts`, consistency |
| `src/app/content-template-labels.ts`, `.../content-template-select.component.ts` | T14 | `content-template-labels.spec.ts`, the component spec |

**(b) Assertion or runtime failures against existing code, for the right reason (255 failing tests; 152 assertion failures, 103 `TypeError` raised inside the code under test).** Observed output, verbatim excerpts:

- Schema (`description-doc.schema.simplified.spec.ts`, "accepts a document that omits §3 functionality"): `AssertionError: [{"code":"invalid_type","expected":"array","received":"undefined","path":["functionality"],"message":"Required"}]: expected false to be true`
- Prompt (`task-a-doc.simplified.spec.ts`, AC-3 "does not request §3"): `AssertionError: expected true to be false`; AC-12 spare parts: `AssertionError: 30-100: expected 'TASK A-GENERATE THE BASE-LANGUAGE DES…' to contain '30-100'`
- Legacy prompt (`task-a.simplified.spec.ts`, "Spare parts: only 1, 5, 8"): `AssertionError: §1: expected false to be true`
- Translation (`task-translate.simplified.spec.ts`): `AssertionError: expected 0 to be greater than 0` (no clause added yet)
- Renderer (`render-description.flat-specs.spec.ts`, absent §2): `TypeError: Cannot read properties of undefined (reading 'forEach') at forEachBlockInOrder (src/domain/description-doc.ts:195:21)` — the exact FR-18 defect
- Walkers (`doc-absent-paragraphs.spec.ts`, specs-grounding): `expected [Function] to not throw an error but 'TypeError: Cannot read properties of …' was thrown`
- Category shape (`spec-category-shape.simplified.spec.ts`): `AssertionError: expected [ { severity: 'error', …(3) } ] to deeply equal []` (simplified id not yet exempt)
- Orchestrator (`content-orchestrator.simplified.spec.ts`, Spare parts): `AssertionError: §8: expected false to be true`; the run itself logs `HTML (base): the model never produced a valid ProductDescriptionDoc within the repair budget` (schema rejects the simplified doc today)
- Wiring pins: `AssertionError: expected [] to have a length of 2 but got +0`
- Removal: `AssertionError: expected true to be false` at `src/domain/consumables-doc.schema.ts no longer exists`, and both token searches list current offenders

**(c) Collection crashes: none.** An earlier draft rendered simplified documents at describe scope, which aborted collection with `Cannot read properties of undefined (reading 'forEach')` and registered zero tests; every render now happens inside an `it()` (through `lazy()`), so each test fails on its own.

### Tests that pass today, deliberately (not defects)

- `full-description.golden.spec.ts` (14): pre-edit capture, FR-6 / NFR-6 regression guard mandated by the breakdown's "Goldens" note. Must stay green at every task.
- Full-description rows of the R6 FAQ block and the R2 guard in `content-orchestrator.simplified.spec.ts`; corpus-parse and "existing Full documents validate" rows of the schema spec; "Full … still fires" rows of `spec-category-shape.simplified.spec.ts` and `spec-count-parity.simplified.spec.ts`; the walker cases for code that is already null-safe (`doc-block-repair`, `doc-tier`, `alt-numeric-fidelity`, `video-manifest`, `heading-style` present-paragraph checks). Each pins existing behaviour that must survive the widening; the matrix marks them `guard`.
- A handful of prompt facts that are true of the Full block today (for example `AC-8` "§5 conditional", the `faq` key absent from the shape). They are not evidence for the new behaviour; the failing rows beside them are.

### The two expected-red repository conditions (not defects)

1. `npm run lint` (`tsc --noEmit`) reports 85 errors, all inside the new specs and fixtures, and all resolving as the tasks land: `Cannot find module` for the five new modules, `ProductInput.includeFunctionality` (T2), `renderDescription`'s third argument (T4), `buildTranslatePrompt`'s trailing `templateId` (T8), and the property types of the not-yet-existing range validators. No pre-existing file has a new type error.
2. `npm run test:components` (`ng test`) currently fails at BUILD, not per test. The Angular unit-test builder type-checks the whole program (`tsconfig.json` includes `test/**`), so the unresolved modules stop it compiling; its output is `Could not resolve "./content-template-select.component"` and `Could not resolve "../../content-template-labels"`. Consequence: the pre-existing `model-settings.component.spec.ts` cannot be observed passing during this stage; this is inherent to writing tests before the modules, and it clears when T14 lands the two modules (and T2/T4/T8 the signatures). The component spec's failure is therefore evidenced by the build error above rather than by per-test output.

## Findings

**F1 (decision needed before T13; non-blocking now).** The Full-description golden vs T13. `constants.ts` L1380 and L1486 carry `CONSUMABLES MODE (§C1-§C6)` notes inside overlays that Full-description prompts include: the EXPERT3D and Center 3D Print ToV overlay (`systemBlocks[2]` of `buildPromptA`/`buildPromptADoc`, 4 goldens) and the Task C translation prompt (`buildPromptC`, `systemBlocks[1]`, 1 golden). T13 as written ("remove the `CONSUMABLES MODE (§C1-§C6)` notes and the C3D ToV overlay notes") would change those bytes, and AC-6 / FR-6 require them unchanged, while FR-20 / OD-14 require the notes removed. The two requirements conflict on those five sentences. The golden was NOT narrowed or normalised. If T13 deletes that text the golden goes red, and the correct response is a human decision (accept the byte change and re-capture with recorded approval, or keep the notes as generic overlay text and amend FR-20's scope), not a silent regeneration. T13's own note ("do not touch text shared with Full prompts") points to the second reading; the removal spec's `CONSUMABLES_` token test does not require these notes to go (they contain `CONSUMABLES MODE`, not `CONSUMABLES_`).

**F2 (R6 FAQ, no work item).** Per the human resolution, the FAQ artifact is data-driven for every template. No task changes FAQ artifact behaviour: the existing `if (input.supplementalContent?.trim())` gates already implement it, in `generate()` for every store language and in `generateUaContent()` for uk-UA. The R6 cases for the three simplified templates are red today only because the simplified fixtures cannot yet render (T3); they go green with zero FAQ code changed. The Full-description R6 rows are green now.

**F3 (plan wording, non-blocking).** The plan's FR-8 "category title row (the row shape the pre-flat renderer emits)" does not exist: the pre-flat renderer emits an HTML comment and an `<h3>`. The specs test both the `<h3>` shape and a full-width `colspan` title row a model could produce inside one table. If the builder's detector targets a different row shape, the shape spec is the place to align, with the reason recorded.

**F4 (contracts chosen).** The plan named `paragraphsFor`, `V4_WORD_RANGES` and the other new exports without shapes; the tests fix them (listed in the strategy, "Contracts the tests define"). `so-builder` should conform to them or raise the disagreement, not adapt the tests.

**F5 (wiring pins).** `app.component.template-wiring.spec.ts` pins source spelling as the cheapest proxy for an `AppComponent` spec the plan rejects; the regexes tolerate the flag's name but assume a `*content-template-select` element used twice, one usage enabling `showFunctionalityToggle` with `accessories` in its condition, and an `onTemplateChange` method. A correct implementation with a different structure should adjust the pin with the reason recorded.

**F6 (heuristic).** The prompt-clause reader is per-clause (see the strategy): a clause naming two § numbers gives both one polarity.

**F7 (coverage gaps carried).** R8: no accepted simplified artifact, conformance is rules-based only. The corpus remains two items of one product. FR-24 is untouched code, covered by existing specs.

## Verification checklist (skill)

- [x] Only `content-template-select.component.spec.ts` is named `*.component.spec.ts`; every other spec is not.
- [x] The one service-level spec (orchestrator) uses `Injector.create` with `import '@angular/compiler'` first; no TestBed.
- [x] Every `AC-n` (AC-1..AC-16) appears in `docs/tests/US-2.2-ac-test-matrix.md` with a real file and test name.
- [x] Assertions were written from the criteria; none is copied from an actual run, apart from the FR-6 golden, which is a pre-edit capture by definition.
- [x] No test's only assertion is `toBeTruthy()`.
- [x] Existing corpus fixtures reused (`corpus/*`, `v4-docs.ts`); each new fixture is justified in the strategy.
- [x] No `sleep`, unseeded randomness or network.
- [x] Tests were run; failing output recorded above; failures are for the right reason apart from bucket (a) which is the module-creation red.
- [x] Pre-existing tests pass (123 files, 0 failures, logic runner). The component runner cannot compile until T14 (see above), so `model-settings.component.spec.ts` could not be re-run at this stage.

## Loop-back attempt 2 (changes_required_tests)

Two test defects found by so-builder were fixed; no source file touched.

1. `src/prompts/task-a-doc.simplified.spec.ts` "PromptPayload shape is unchanged and product data never enters a system block" (3 tests): the `not.toContain('[INPUT DATA]')` assertion was wrong (the FROZEN master prompt legitimately contains that literal). Replaced by the real invariant: no user-supplied string value of `EXPERT3D_INPUT` (length >= 6) appears in any system block; the product name is still asserted absent from system blocks and present in `userContent`.
2. `src/services/content-orchestrator.simplified.spec.ts` "the FAQ request does not depend on the template": removed the `not.toMatch(/§\s*\d/)` assertion (task-faq.ts legitimately contains "Schema v4.0 §8"); replaced with an assertion that the FAQ call ran exactly once in both the simplified and Full runs. Identity of systemBlocks/userContent between the two runs is retained.

Observed: `npx vitest run` on the two files: 2 files, 97 tests passed. Full `npx vitest run`: 141 files passed, 3751 tests passed, 3 skipped, 0 failed.

## Revision 3 - loop-back from QUALITY_GATE (changes_required_tests, attempt 1)

`npm run test:coverage` failed on the per-directory floor `src/render/**` branches (89.23% < 90%). Two new spec files were added; no source file, threshold, vitest.config.ts or pre-existing spec was touched.

| File | Tests | Branches it covers |
|---|---|---|
| `src/render/render-description.branches.spec.ts` | 10 | `'3.0'` §2 with only killerSpecs / only keyBenefits / neither (FR-18); en-gb fallback for a locale with no §2a header pair; `'4.0'` §2 list with killerSpecs only / keyBenefits only / non-bullets Blocks ignored; `'4.0'` with no `ctx.storeName`; flat §7 array `SpecRow.value` joined by ", " (FR-8) |
| `src/render/doc-schema-issues.branches.spec.ts` | 8 | `providerDetail` plain-string / empty-string / non-string body and undefined result; `docSchemaIssues` empty path, non-array path -> `(root)`, missing message -> `invalid value` |

Observed (real runs):
- `npm run test:coverage`: EXIT 0; 143 files, 3769 tests passed, 3 skipped; `render` directory 100 / 97.69 / 100 / 100 (lines/branches/functions/statements order as reported); All files branches 87.19%. No threshold error.
- `npx vitest run`: 143 files passed, 3769 passed, 3 skipped, 0 failed. `npm run lint` (tsc --noEmit): exit 0.

Remaining uncovered branches, deliberately not tested (unreachable through the public API): `render-description.ts:201` `positions.get(b.ref) ?? 0` (every rendered figure is visited by `figurePositions`) and `:277` the en-gb fallback for `V4_SECTION_HEADINGS` (a `'4.0'` document with an unpublished locale throws earlier at §9 via `ctaHeading`). Writing tests for them would require asserting on dead code.
