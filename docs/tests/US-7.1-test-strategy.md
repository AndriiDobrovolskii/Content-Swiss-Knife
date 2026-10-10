---
artifact: test_strategy
story: US-7.1
version: 1
status: DRAFT
owner: so-test-writer
created_at: 2026-10-09T19:30:00Z
updated_at: 2026-10-09T19:30:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 4
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 1
  - key: task_breakdown
    version: 1
  - key: plan_review
    version: 1
  - key: open_decisions
    version: 2
open_decisions_blocking: false
---

# Test Strategy - US-7.1: Keep the operator's product name intact

## Approach

Every assertion is written from the Story's acceptance criteria and Specification v4, never from captured model output. The whole Story is `track: prompt` plus deterministic validators, so **everything runs under `npm run test:logic`** (vitest, happy-dom). No component is touched: no `*.component.spec.ts`, nothing for `npm run test:components`, nothing for `server/**` (node:test).

Services are driven with the repository's established pattern: `import '@angular/compiler'` first, then `Injector.create` with a routing mock `LlmService` (never TestBed, never a mock of the orchestrator itself). The model is mocked at the `LlmService` boundary only; the real `runRepairGate`, real validators, real slug/SEO canonicalizers and real prompt builders run.

Binding approver conditions from HUMAN_PLAN_APPROVAL and where each one lands:

| Condition | How it is met |
|---|---|
| 1. TEST_WRITING owns the AC-9 / T9 legacy rewrites, so the builder never edits a `.spec.ts` | Inventory below ("Legacy specs - OD-9 inventory"). The tests encode the new behaviour completely; the builder changes prompts, code and regenerates `full-description-prompts.json` only. |
| 2. AC-4 per-`STORE_REGISTRY` iteration in the tests for T12, T13 AND T14 | Wiring (T12), repair-gate (T13) and validation (T14) specs are each `describe.each(registryStores())`; no store name appears in any test body. |
| 3. Optimizer coverage relies on T11 plus the T6 dynamic block | T11: verbatim sentence asserted on the Optimizer's own task block. T6/T12: the block is asserted in the Optimizer `userContent`. T14: the surfacing point is pinned (below). |
| 4. F-1 / T15 approved: tests fail until the inline "TRANSLATE the generic descriptor ... category-first" sentences are replaced | `task-c.spec.ts` (all 12 `buildPromptC` instruction branches) and the golden spec. |
| Any file "named by TEST_WRITING" is fixed here | See the table in "File layout" and the matrix. |

## File layout

| Layer / task | File (new unless marked) | Runner | Covers |
|---|---|---|---|
| T1 tokenisation | `src/utils/product-name-tokens.spec.ts` | test:logic | FR-5 Tokenisation T, OD-13, AC-6 (number/unit spacing) |
| T2 classifier | `src/utils/protected-product-name.spec.ts` | test:logic | FR-1, FR-11, AC-4 (classifier half), AC-7 (generic exemption) |
| T3 preservation checks | `src/utils/product-name-preservation.spec.ts` | test:logic | FR-5 parts 1 and 2, closed surface list, FR-7 optimizer check, AC-1, AC-2, AC-3, AC-5, AC-7, AC-8 (issue raised) |
| T3 + AC-4 at validator level | `src/utils/product-name-preservation.stores.spec.ts` | test:logic | NFR-7: fixture outputs for every registry store, every locale and every `officialBrands` entry |
| T4 SEO core name | `src/utils/protected-seo-name.spec.ts` | test:logic | FR-4, OD-2, OD-12 default, boundary 53/54/55, code points |
| T5 protected slug trim | `src/prompt-core/protected-slug.spec.ts` | test:logic | FR-10 (a) and (b), AC-1 slug half, contrast with the legacy trimmer |
| T6 dynamic block | `src/prompt-core/protected-name-block.spec.ts` | test:logic | FR-2, OD-2 priority statement, NFR-1 / plan R8 (`systemBlocks` by reference) |
| T7 repair registry | `src/utils/repair-strategy.spec.ts` (extended) | test:logic | FR-8 |
| T8 static clause | `src/prompt-core/protected-name-precedence.spec.ts` | test:logic | FR-2, FR-6, FR-7 (clause reaches master, Optimizer master block and every Task C branch), NFR-1 |
| T8-T11, T15 goldens | `src/prompts/full-description.golden.spec.ts` (extended) | test:logic | "regenerated" made observable (OD-9, plan R5) |
| T9 Slugs prompt | `src/prompts/task-slug.spec.ts` (extended) | test:logic | FR-3, FR-9, AC-1 prompt half, AC-9 |
| T10 Doc prompt | `src/prompts/task-a-doc.spec.ts` (extended) | test:logic | FR-6, AC-3, OD-8 |
| T11 Translator / Optimizer prompts | `src/prompts/task-translate.spec.ts`, `src/prompts/optimizer.spec.ts` (extended) | test:logic | FR-7, AC-5, OD-7 |
| T15 Task C (F-1, approved) | `src/prompts/task-c.spec.ts` (extended) | test:logic | FR-2, FR-6, AC-3 |
| T12 payload wiring | `src/services/content-orchestrator.protected-name-wiring.spec.ts` | test:logic | FR-2, FR-11, NFR-1, AC-4 (Task A/Doc, Slugs, Task B, Task C per store), AC-5 (Optimizer, Translator) |
| T13 SEO gate | `src/services/content-orchestrator.protected-name-repair-gate.spec.ts` | test:logic | FR-4, FR-8, OD-2, OD-12, AC-2, AC-4, AC-6 guard, AC-8 incl. all failure paths |
| T14 report-only validation, slug trim | `src/services/content-orchestrator.protected-name-validation.spec.ts` | test:logic | FR-3, FR-5, FR-6, FR-7, FR-10, AC-1, AC-3, AC-4, AC-5 |
| shared fixtures | `test/fixtures/protected-name.ts` (not a spec) | - | routing mock `LlmService`, Fixture A/C, compliant and shortened Slugs/SEO builders |
| rewritten expectation | `src/services/content-orchestrator.repair-field-wiring.spec.ts` (T15 block of US-3.1) | test:logic | see "Rewritten, not weakened" |

Fixtures: Fixture A, B, C are inline strings (they are the Specification's definitions and no corpus item carries a decimal+unit protected name; the corpus is two items of one product, `test/render-reconciliation.report.md` line 211). The hand-verified corpus Doc `test/fixtures/corpus/expert3d-ortur-h20-20w.doc.json` is reused as the Doc body for the pipeline runs - nothing new is invented to keep in sync. No sleep, no retry-until-pass, no randomness, no network, no clock.

## Signatures fixed here (the Specification and plan fix behaviour, not argument lists)

The plan (D2) names these modules and their responsibilities but not every parameter list. TEST_WRITING fixes them in the specs; so-builder implements to these. Where the plan DOES name a signature it is used as written.

| Module (task) | Signature pinned by the tests |
|---|---|
| `src/utils/product-name-tokens.ts` (T1) | `interface Token { text: string; hardBreakAfter: boolean }`; `tokenize(input: string, opts?: { html?: boolean }): Token[]`; `tokensEqual(a: string, b: string): boolean` (rule 3 for one pair). `hardBreakAfter` is only asserted for non-final tokens. |
| `src/utils/protected-product-name.ts` (T2) | plan: `classifyProductName(typed): { protected: boolean; designators: string[] }`; `SPEC_LISTED_BRANDS: string[]` containing `Formlabs` and `Bambu Lab`. |
| `src/utils/product-name-preservation.ts` (T3) | `checkNameSurfaces(typedName, { slugs?: SlugResponse \| null; seo?: SeoResponse \| null }): ValidationIssue[]`; `checkDescriptionHtml(typedName, html, context): ValidationIssue[]` (issue `context` is the caller's string); `checkOptimizerText(typedName, html): ValidationIssue[]`. Issues: `severity 'error'`; rule `product-name-token-missing` (part 1) or `product-name-shortened-form` (part 2); `path` in the existing grammar (`slugs[i].name`, `slugs[i].slug`, `seo_data[i].h1\|meta_title\|meta_description`); `context` contains the locale; `detail` names the missing token / the offending form. |
| `src/utils/protected-seo-name.ts` (T4) | `seoCoreName(localizedName, typedName, isProtected): string` |
| `src/prompt-core/protected-slug.ts` (T5) | `enforceProtectedSlugLength(name, slug, typedName, language?): string` |
| `src/prompt-core/protected-name-block.ts` (T6) | `withProtectedNameBlock(payload, typedName): PromptPayload`; returns the SAME `systemBlocks` array reference; marker literal `[PROTECTED PRODUCT NAME]` |
| `src/utils/repair-strategy.ts` (T7) | `REPAIR_STRATEGIES.has('product-name-token-missing'\|'product-name-shortened-form')`, full-regeneration-only ladder, no `deterministic` / `fieldInstruction` |

## Interpretations pinned (not contradicted by the Specification; flagged so a reviewer can overturn them)

1. **A shortened form is reported once, as the maximal run** satisfying FR-5 (a)-(d). `Studio 1 Pro` inside an already-reported `Form Studio 1 Pro` is not a second violation. (`product-name-preservation.spec.ts`, comment above the part-2 describe.)
2. **The marker literal is `[PROTECTED PRODUCT NAME]`** in both the static clause (T8) and the dynamic block (T6); `protected-name-block.spec.ts` and `protected-name-precedence.spec.ts` assert the identical literal. The Specification and plan use the bracketed name; the spelling is the plan's.
3. **Slug trimming (FR-10)** removes tail tokens only, never a localized category prefix (plan D2 wording "removes only tail tokens outside the typed-name slug span"). `protected-slug.spec.ts` asserts the prefix is kept.
4. **A repair-call failure** (HTTP 429, unparseable JSON) is modelled as a REJECTED `generateJson`, because `LlmService.generateJson` rejects on unparseable JSON and `runRepairGate` does not catch a `produce()` throw. "Never accepted as passing" is asserted as: either nothing is shipped (`seoData === null`) or the finding is reported - never a clean-looking shortened artifact. A resolved garbage object is deliberately not used: the outcome would depend on how many FR-5 issues the builder emits against the tie-break.
5. **Worked-example slugs (AC-9 / AC-1 shape):** each slug in a Slugs prompt example must contain `normalizeSlug(stripSlugStopwords(input))`. `with` is NOT in `SLUG_STOPWORDS`, so example 2's slug must keep `with` (its current "linking preposition dropped" note is part of the legacy behaviour the Story invalidates).

## Surfacing points pinned (builder-facing; plan-review non-blocking 3 asked TEST_WRITING to pin these)

The plan's single "`runOutputValidation`" wiring point does not reach three of the four surfaces, because three entry points do not call it. Verified in `content-orchestrator.service.ts`:

| Surface | Observable the tests pin | Why the plan's point is not enough |
|---|---|---|
| Standalone SEO Meta (`generateSeoMetadata`) | repair attempted (`generateJson` called twice); FR-5 finding in `repairReport()[0].finalIssues` AND in `validationIssues()` when unresolved | the method ends with `validationIssues.set(validateSeoMetadata(...))`, which overwrites the gate result - the FR-5 results must be added to that set |
| Slugs (`generateSlugs`) | ONE `Slug` request, no `generateText` call, FR-5 error per locale in `validationIssues()` | the method ends with `validationIssues.set(slugFinalIssues)` and never calls `runOutputValidation` |
| Description (`generate`, `generateUaContent`) | FR-5 part 2 error with context `HTML (<master>)` and every `HTML (<lang>)` in `validationIssues()`; the call-count map is identical to a run with the full name | `runOutputValidation` is the right place here (verified: both methods call it, `content-orchestrator.service.ts` lines 1242 and 1569) |
| Optimizer (`optimize`) | FR-5 part 2 error in `validationIssues()` for a supplied `[Product Name]`; `Optimizer` call count unchanged | `optimize()` never touches `validationIssues` today |

"Report-only" is asserted as call-count equality between a run with the altered name and a run with the full name (FR-3, FR-6, FR-7: no repair is required, and none may be bought by FR-5 on these surfaces).

## AC-4 coverage (per-`STORE_REGISTRY`, no store named)

`registryStores()` is `Object.keys(STORE_REGISTRY)`. Each store contributes its own `languages`, `group` and `officialBrands`. Seven stores today, including the two with an empty `officialBrands` and `Expert-3DPrinter`, which is the only store off the Doc pipeline (HTML path), so both Task A shapes are exercised.

| Task | Where the iteration is |
|---|---|
| T2 | `protected-product-name.spec.ts`: every brand of every entry; empty-brand stores; call-time derivation by mutating the registry |
| T3 | `product-name-preservation.stores.spec.ts`: per store - compliant and shortened Slugs/SEO per locale, description per locale, store brands |
| T12 | `...protected-name-wiring.spec.ts`: `describe.each(stores)` over `generate()`; Task A/Doc, Slugs, Task B and **every** Task C locale of the store |
| T13 | `...protected-name-repair-gate.spec.ts`: `describe.each(stores)` for `generateSeoMetadata` (premise, repair, three failure paths), for the SEO gate inside `generate()` and `generateUaContent()`, for `seoCoreName` feeding `buildPromptB`, and for the AC-6 guard |
| T14 | `...protected-name-validation.spec.ts`: `describe.each(stores)` for Slugs (report-only, FR-10) and for the description surfaces in both pipelines |

## Rewritten, not weakened

`content-orchestrator.repair-field-wiring.spec.ts`, the US-3.1 T15 describe (es-ES, pt-PT, uk-UA). Its product name `Formlabs Optical Cleaning Cloths x100` is a PROTECTED name under FR-1 (brand + `x100`), 37 code points. The long-H1 canonicalizer (unchanged, FR-4 failure path / OD-12) cuts `meta_title` to a prefix of the h1, so the whole typed name is no longer inside `meta_title`; FR-5 part 1 now reports that in the SEO gate and the gate spends its repair. The three tests pinned `generateJson` to ONE call - possible only because nothing could see the dropped name, which is the blind spot the Story closes. The call-count assertion became "2 calls (1 attempt + 1 repair) and the part-1 finding stays in `finalIssues` at `seo_data[0].meta_title`". **Every prefix-shape assertion (the substance of US-3.1 T15) is kept byte-for-byte.** The mocked model returns identical data to the repair, which is why the finding stays reported.

## Legacy specs - OD-9 inventory (verified by reading, decision per file)

Rule applied: rewrite only a test that asserts the prompt or the model *localizes a protected name*. A test that feeds a localized string to an unchanged deterministic function stays.

| File | Finding | Decision |
|---|---|---|
| `src/prompts/task-slug.spec.ts` | Pinned no worked-example text (context-window shape only) | Extended: AC-9 tests added; the 6 existing tests untouched and green |
| `src/prompt-core/slug-utils.spec.ts` | `Bambu Lab` strings are inputs to `normalizeSlug`/`enforceSlugLength`/stopwords; none asserts a localized *name* | Unchanged. The legacy trimmer's behaviour is pinned by a contrast test in `protected-slug.spec.ts` |
| `src/utils/heading-style.spec.ts` lines ~1008-1041 | `productShort`/`brandCoreMissing` heading SHORT forms; OD-6 keeps short forms | Unchanged, stays valid |
| `src/utils/output-validator.spec.ts` line ~336 | `Bambu Lab PLA Basic Filament, 1.75 mm, ...` is a `productName` for decimal-separator masking | Unchanged (FROZEN-file spec; asserts masking) |
| `src/utils/spec-count-parity.spec.ts` | **Verified a NON-member of the OD-9 set**: no `Bambu`/`Hardened`/`PLA Basic` and no localized-name assertion | Unchanged. Recorded here as verified |
| `src/utils/slug-validator.spec.ts` lines ~85-96 | feeds localized XGRIDS names to the EXISTING `slug-name-designator-lost` rule (anchored on `invariantCore`, untouched by OD-6) | Unchanged. `product-name-preservation.spec.ts` pins the contrast: the same three names ARE rejected by FR-5 |
| `src/utils/number-format-fixer.spec.ts` line ~369, `src/utils/seo-metadata-shape.spec.ts` line ~81 | localized strings fed to unchanged deterministic functions | Unchanged |
| `src/prompt-core/master-system-prompt.spec.ts` line ~132 | anchors on the `[HEADING FORM - applies to every` block header, not on `PRODUCT_NAME_LOCALIZATION` | Re-checked: unaffected by a leading clause in the constant |
| `test/fixtures/golden/full-description-prompts.json` | byte-equality spec; moves with T8 (constant), T10, T11 and T15 | **Not edited here** (generated data). `full-description.golden.spec.ts` gained assertions that fail until it is regenerated. so-builder regenerates it with a reviewed diff, once, after T15 |

Additional sweeps for tests that pin bytes, length or vocabulary of the text this Story changes (all clear):

| Sweep | Result |
|---|---|
| Snapshots (`toMatchSnapshot`, `toMatchInlineSnapshot`, `__snapshots__`) | one hit, `src/render/render-description.spec.ts:151`, an inline snapshot of the RENDERER; no prompt builder is snapshotted |
| Prompt size / token budgets (`.length`, `toBeLessThan*` on any changed prompt) | none on a prompt; `master-system-prompt.v4.spec.ts` counts only the range literals `40-75`, `40-85`, `90-200`, `150-2,000`, `80-150`, `50-100`, which the new clause does not need |
| Banned tokens | `test/removal.spec.ts` / `test/fixtures/removed-tokens.ts` ban the legacy consumables identifiers only; no `not.toMatch`/`not.toContain` on `verbatim`, `untranslated`, `overrides`, `every token`, `protected`, `once` exists in any prompt spec, so the vocabulary the new tests require is satisfiable; `test/fixtures/prompt-clauses.ts` only supplies helper regexes to the simplified-template specs, which compare a templated build to its own no-template build and are unaffected by a static addition |

Net: there is no existing test asserting the old localizing behaviour *for the examples*, so no pre-existing assertion needed deleting. The builder's only fixture duty is the golden JSON.

## Guards (green now by design - they pin behaviour that must survive; not evidence for the new behaviour)

Premise checks (the shortened mock passes every existing validator; helper lengths; located prompt sections); generic-name regression (Slugs legacy trimmer byte-for-byte, no block in generic payloads, `buildPromptSlug` generic wording); `systemBlocks` equality between protected and generic runs; Translator never wrapped; the enrichment worked example already keeps `Revopoint MetroY Ultra Standard Edition` whole; OD-8 (no positive "name must appear" clause); the AC-6 end-to-end SEO guard; `shortened` SEO-name 'category kept when under 54'. The red tests are the ones in the matrix marked RED.

## Not unit-tested (proof by other means)

| Item | Why | Proof |
|---|---|---|
| Live-model behaviour (Fixture A on EXPERT3D, all modes) | NFR-7 / OD-8: not provable offline | Manual release evidence recorded outside the suite |
| FROZEN-file checksums (`task-c.ts`, F-1) | a process property | `bash arch-guard.sh --rebaseline` then `bash arch-guard.sh`; before rebaselining, `git diff` the `task-a.ts` / `task-c.ts` drift (plan-review non-blocking 1) |
| Golden diff limited to the changed text (OD-9) | a review step | reviewed diff of `full-description-prompts.json` |
| AC-5 for Translator and Optimizer without `[Product Name]` | stated limitation (OD-7): no typed name in the request | prompt-text assertions only (T11), by design |
| FR-5 blind spots (shortened form lacking the last token, brand-only names, surfaces off the list) | NFR-7 | the blind spots are *asserted to stay undetected* (`bare Form Studio 1`, `Bambu` brand-only) so nobody silently widens the check |
| Cache re-warm after the constant changes | operational | accepted by plan D5 |

## Failure reasons expected before implementation

- New-module specs (T1-T6): `Failed to resolve import "./<module>"` - the module does not exist; this is the intended red for a NEW module (type check shows only TS2307 for the same files).
- Prompt-text specs: the sentence / marker / clause is absent; the old sentences are present.
- Orchestrator specs: `expected '[INPUT DATA]...' to contain '[PROTECTED PRODUCT NAME]'`; `generateJson` called 1 time, expected 2; FR-5 findings absent from `validationIssues()`; slug `en-gb-formlabs-form-studio-1-filler9-...` lacks `formlabs-form-studio-1-resin-tank-pro`; the `[LOCALIZED NAMES]` line carries the 57-code-point name instead of the typed name alone.
