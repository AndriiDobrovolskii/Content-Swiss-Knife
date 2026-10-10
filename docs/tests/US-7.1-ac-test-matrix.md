---
artifact: ac_test_matrix
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
  - key: implementation_plan
    version: 1
  - key: task_breakdown
    version: 1
  - key: test_strategy
    version: 1
open_decisions_blocking: false
---

# AC <-> Test Matrix - US-7.1

Ids are the Story's `AC-n`. `RED` = fails now, for the reason recorded in the generation report. `RED (import)` = the spec cannot load until so-builder creates the named module (the intended red for a new module). `guard` = green now by design, pins behaviour that must survive. Every file named below exists in the repository now.

Spec files are abbreviated: `tokens` = `src/utils/product-name-tokens.spec.ts`; `classifier` = `src/utils/protected-product-name.spec.ts`; `preservation` = `src/utils/product-name-preservation.spec.ts`; `stores` = `src/utils/product-name-preservation.stores.spec.ts`; `seo-name` = `src/utils/protected-seo-name.spec.ts`; `slug-trim` = `src/prompt-core/protected-slug.spec.ts`; `block` = `src/prompt-core/protected-name-block.spec.ts`; `precedence` = `src/prompt-core/protected-name-precedence.spec.ts`; `wiring` = `src/services/content-orchestrator.protected-name-wiring.spec.ts`; `gate` = `src/services/content-orchestrator.protected-name-repair-gate.spec.ts`; `validation` = `src/services/content-orchestrator.protected-name-validation.spec.ts`.

| AC | Test file | Test (describe > it) | State now | Green by |
|---|---|---|---|---|
| AC-1 (prompt half) | `src/prompts/task-slug.spec.ts` | "buildPromptSlug - worked examples never localize a protected input name (FR-9, AC-9)" > "example 0/1/2: every locale slug contains the slugified input name (AC-1 shape)" | RED (3) | T9 |
| AC-1 (name check) | preservation | "checkNameSurfaces - Slugs mode, part 1 token presence" > "the observed bug: a name that lost "Resin Tank" fails, and the violation names the missing tokens"; "accepts names that carry the whole typed name, with a localized category noun around it"; "a name missing only "Tank" ..."; "a re-ordered name fails"; "a translated token fails" | RED (import) | T1-T3 |
| AC-1 (slug check) | preservation | "checkNameSurfaces - Slugs mode ..." > "the observed slug bug: "...-form-studio-1-pro" lacks the typed-name slug and fails"; "a slug is judged by its own slugified form"; "a slug trimmed inside the typed-name span fails"; and "checkNameSurfaces - slug stopwords (OD-3)" > both tests | RED (import) | T3 |
| AC-1 (length, FR-10) | slug-trim | "FR-10 (a): ..." > "keeps the whole typed-name slug, "resin-tank" included", "returns a slug of at most 100 characters", "only trims the tail"; "FR-10 (b): ..." > "returns the full typed-name slug with nothing trimmed from it"; "CONTRAST (OD-6): the legacy enforceSlugLength ... trims "resin-tank" away" | RED (import); contrast is a guard once the module loads | T5 |
| AC-1 (pipeline, per store) | validation | "Slugs mode, report-only - generateSlugs(), store <each registry store> (FR-3, FR-5, AC-1, AC-4)" > "the observed bug: every locale's shortened name is reported ..., in ONE request, with no repair call"; "FR-10 (a): a long name is trimmed to <= 100 characters and still contains the whole typed-name slug"; "a compliant set raises no FR-5 finding and keeps the typed-name slug in every locale" | RED (36 across stores incl. AC-3/AC-5 rows); compliant-set test is a guard | T3, T5, T14 |
| AC-1 (validator, per store) | stores | "FR-5 on fixture outputs - store <each> (AC-1, AC-2, AC-3, AC-4)" > "AC-1: a compliant Slugs set ... raises nothing"; "AC-1: the observed bug (shortened names) is reported for EVERY locale of this store" | RED (import) | T3 |
| AC-2 | gate | "SEO Meta repair gate - generateSeoMetadata(), store <each> (AC-8, AC-4)" > "flags the violation and performs a repair attempt, then ships the corrected set" (h1 and meta_title contain `Formlabs Form Studio 1 Resin Tank Pro`, meta_title <= 55 code points, no `Form Studio 1 Pro`) | RED (56 across the gate spec) | T3, T7, T13 |
| AC-2 (category may be dropped) | gate | "SEO core name fed to Task B - store <each> (FR-4, OD-2, OD-12 default, AC-2)" > "category + typed name at 54 code points or more: the category is dropped, the typed name alone is passed"; > "category + typed name under 54 code points: the localized category is kept" | RED for the first; guard for the second | T4, T13 |
| AC-2 (boundary) | seo-name | "seoCoreName - the 54 code-point boundary" > "53 code points ... kept", "54 code points ... dropped", "55 code points ... dropped", "counts code points, not UTF-16 units" | RED (import) | T4 |
| AC-2 (validator) | preservation | "checkNameSurfaces - SEO Meta (FR-4, FR-5, AC-2)" > all 8 tests; stores > "AC-2: a compliant SEO set passes FR-5 AND every existing SEO validator"; "AC-2 / AC-8: the shortened SEO set is reported at h1 and meta_title for every locale of this store" | RED (import) | T3 |
| AC-3 (prompt, uk-UA master) | `src/prompts/task-a-doc.spec.ts` | "TASK_A_DOC_INSTRUCTION - localizedName states the protected-name rule (US-7.1 T10, FR-6)" > "says a protected name is kept whole ...", "points at the same [PROTECTED PRODUCT NAME] block ...", "reaches the model: the built Doc payload carries the rule in its cached task block"; OD-8 "adds no positive clause demanding the name appear" is a guard | RED (3), guard (1) | T8, T10 |
| AC-3 (prompt, fan-out via Task C) | `src/prompts/task-c.spec.ts` | "buildPromptC - inline descriptor-translation sentences are replaced (US-7.1 T15, F-1)" > "<branch>: none of the contradictory inline sentences remain" and "<branch>: the sentence now defers to [PRODUCT NAME LOCALIZATION] and says a protected name is kept verbatim" (12 branches) | RED (22) | T15 (F-1, approved) |
| AC-3 (static clause reaches master and every Task C branch) | precedence | "PRODUCT_NAME_LOCALIZATION - the leading protected-name precedence clause (T8, FR-2)" (5 RED + 2 guards); "the clause reaches every prompt that interpolates the constant" > master, Optimizer master block, 10 Task C branches | RED (17) | T8 |
| AC-3 (validator) | preservation | "checkDescriptionHtml - Generator / UA Description and Task C translations (FR-6, AC-3)" > all tests (heading, paragraph, list item, CTA, figcaption, every occurrence, full designator accepted, OD-6 short heading, no part 1, attributes ignored, block boundary) | RED (import) | T3 |
| AC-3 (pipeline, per store) | validation | "Description surfaces, report-only - generate() and generateUaContent(), store <each> (FR-5 part 2, FR-6, AC-3, AC-4)" > "<entry point>: the altered form in the master is reported ..."; "generate(): the altered form in every Task C translation is reported per locale"; "REPORT-ONLY - the altered name buys no extra model call" | RED (master/translation); full-designator tests are guards | T3, T14 |
| AC-4 | wiring | "protected-name wiring through generate() - store <each of the 7 registry stores> (AC-4)" > "Task A / Doc", "Slugs", "Task B (SEO metadata)", "Task C: every translation request, for every locale this store publishes", "the block comes AFTER the original userContent" | RED (5 per store); NFR-1 and generic-name tests are guards | T6, T12 |
| AC-4 (T13) | gate | `describe.each(stores)` x4: repair gate, SEO gate inside generate()/generateUaContent(), `seoCoreName` feed, AC-6 guard | RED / guard | T13 |
| AC-4 (T14) | validation | `describe.each(stores)` x2: Slugs mode; description surfaces | RED / guard | T14 |
| AC-4 (T2, T3) | classifier; stores | "classifyProductName - brand set comes from STORE_REGISTRY, never from a copy" (every brand of every entry; empty-brand stores; call-time derivation); stores > every `describe.each(stores)` test incl. "every official brand of this store ... makes a typed name protected and its tokens enforced" | RED (import) | T2, T3 |
| AC-5 (Translator prompt) | `src/prompts/task-translate.spec.ts` | "buildTranslatePrompt - brand and model names are preserved verbatim (US-7.1 T11, FR-7, AC-5)" > "the <each supported language> instruction carries the verbatim brand/model sentence" (10) and "an unknown target label (generic fallback) carries it too" | RED (11); the OD-7 "is generic" and cached-block tests are guards | T11 |
| AC-5 (Optimizer prompt) | `src/prompts/optimizer.spec.ts` | "buildOptimizerPrompt - brand and model names are preserved verbatim (US-7.1 T11, FR-7, AC-5)" > "the optimizer-specific task block states that brand and model names stay verbatim" | RED (1) | T11 |
| AC-5 (Optimizer block + Translator unwrapped) | wiring | "protected-name wiring - Optimizer (FR-7, AC-5; TEST_WRITING condition 3) and Translator (OD-7)" > "wraps the Optimizer payload for a protected name ..." | RED (1); the other 4 are guards | T6, T12 |
| AC-5 (Optimizer check) | validation; preservation | validation > "Optimizer, report-only with a supplied Product Name (FR-7, AC-5; TEST_WRITING condition 3)" > "reports an altered name in the optimized output as an error in validationIssues()"; preservation > "checkOptimizerText - Optimizer with a supplied Product Name" | RED; RED (import) | T3, T14 |
| AC-6 (H1 / meta_title checks, 55 limit) | gate | "AC-6 / FR-12 end-to-end guard - a compliant Fixture A set passes every existing check - store <each>" (no error finding, meta_title <= 55, meta_description <= 155 ending with the CTA, no currency symbol) | guard | must stay green |
| AC-6 (validators agree) | stores | "FR-5 on fixture outputs" > "AC-2: a compliant SEO set passes FR-5 AND every existing SEO validator (AC-6 regression guard)" (`validateSeoMetadata` + `validateSeoMetadataShape`) | RED (import) | T3 |
| AC-6 (number/unit spacing, FR-13) | tokens; preservation | tokens > "tokenises the spaced and the attached forms identically (the section 4 space is never a violation)"; preservation > "a typed attached "0.4mm" matches the spaced "0.4 mm" and "0,4 мм" in the output" | RED (import) | T1, T3 |
| AC-6 (existing checks on the pipeline) | `src/services/content-orchestrator.repair-field-wiring.spec.ts` | "generateSeoMetadata() - T15 (FR-8(b), AC-4): the h1Len >= 54 regime produces a genuine h1 prefix, ..." es-ES / pt-PT / uk-UA - REWRITTEN (see strategy): prefix-shape assertions kept, call count now 2 and the part-1 finding stays | RED (3) | T13 |
| AC-6 (regression set) | existing `heading-style`, `product-name-consistency`, `slug-validator`, `seo-metadata-shape*`, `number-format-fixer`, `spec-count-parity`, `test/render-*.spec.ts` | unchanged, all green at baseline (164 files) and still green | guard | must stay green |
| AC-7 (classifier) | classifier | all describes: Fixtures A/B/C; number+unit precedence; letters+digits and the 3D exemption; suffix words; brands; edge inputs | RED (import) | T2 |
| AC-7 (violation names the token) | preservation | "checkNameSurfaces - Slugs mode ..." > "the observed bug ... names the missing tokens" (`Resin`, `Tank`); "a name missing only "Tank" ..."; "a dropped token inside a branded name with a decimal and a unit is named: "Basic""; "...stopwords" > "but the NAME keeps the stopword" | RED (import) | T3 |
| AC-7 (generic exemption) | preservation; stores | preservation > "generic or empty typed names are not subject to the check (AC-7, FR-1 failure path)" (4 tests); stores > "a generic Fixture C is exempt on this store whatever the output looks like (AC-7)" | RED (import) | T2, T3 |
| AC-7 (new module wired into validation) | validation | "Slugs mode, report-only" > "the observed bug ..." and "Description surfaces, report-only" > master/translation tests | RED | T14 |
| AC-8 | gate | "SEO Meta repair gate - generateSeoMetadata(), store <each>" > "premise: the shortened set passes every EXISTING validator" (guard); "flags the violation and performs a repair attempt, then ships the corrected set"; "the repair request names the violation and restates the OD-2 priority" (judged on the feedback part of the repair `userContent` only); "FAILURE PATH: the repair still returns the shortened name -> unresolved, reported, never passing"; "FAILURE PATH: the repair call errors with HTTP 429 -> ..."; "FAILURE PATH: the repair response is unparseable JSON -> ..."; and "SEO Meta gate inside the other two pipelines" > "generate() / generateUaContent() repairs a shortened SEO set before shipping it" | RED (premise = guard) | T3, T7, T13 |
| AC-8 (registry) | `src/utils/repair-strategy.spec.ts` | "US-7.1 T7 - product-name rule ids are registered with a full-regen-only ladder (FR-8)" > "has an explicit REPAIR_STRATEGIES entry" (x2), "offers no deterministic or field-scoped repair" (x2); "resolves ... to full regeneration only", "is a ladder candidate and is regenerable", "registers the same shape as the sibling shape rule" are guards today | RED (4), guard (5) | T7 |
| AC-9 (examples) | `src/prompts/task-slug.spec.ts` | "worked examples never localize a protected input name (FR-9, AC-9)" > "example 0/1/2: every locale name keeps every token of the input, in order, untranslated" (RED x3); "premise: the instruction block carries the three base worked examples" and "the CONTEXT ENRICHMENT worked example also keeps its protected input name whole" are guards | RED (3) | T9 |
| AC-9 (carve-out in the rules) | `src/prompts/task-slug.spec.ts` | "buildPromptSlug - the protected-name carve-out is stated in the NAME composition rules (FR-2, FR-3)" > "refers to the [PROTECTED PRODUCT NAME] block ...", "says a protected name overrides the head-noun localization and the length-drop rules", "allows a localized category noun to be added around the protected name" | RED (3) | T9 |
| AC-9 (generic unchanged) | `src/prompts/task-slug.spec.ts` | "buildPromptSlug - generic-name behaviour is unchanged (FR-9, regression guard)" (3 tests); validation > "regression guard: a GENERIC name keeps the legacy slug trimmer byte-for-byte" per store | guard | must stay green |
| AC-9 (no remaining legacy assertion) | the OD-9 inventory in the test strategy | each candidate file read and decided; `spec-count-parity.spec.ts` verified a non-member; `full-description-prompts.json` regenerated by so-builder | n/a (inventory) | T9 |
| AC-9 (goldens regenerated) | `src/prompts/full-description.golden.spec.ts` | "US-7.1: the regenerated goldens carry the protected-name rule and drop the contradictory sentences" > "every golden that includes PRODUCT_NAME_LOCALIZATION also includes the [PROTECTED PRODUCT NAME] precedence clause"; "no golden still contains the inline "TRANSLATE the generic descriptor ... category-first" sentences (T15)"; premise and NFR-1 tests are guards | RED (2), guard (2) | T8, T15 (golden regeneration) |

## Requirement traceability beyond the AC list (support rows)

| Requirement | Test file | Tests | State now |
|---|---|---|---|
| FR-2 / NFR-1 (block in `userContent`, `systemBlocks` by reference) | block | "withProtectedNameBlock - protected name" (9) and "generic or empty name leaves the payload untouched" (4) | RED (import) |
| FR-4 / OD-12 | seo-name; gate | see AC-2 rows | RED |
| FR-5 tokenisation (OD-13) | tokens | 5 describes, ~60 cases incl. every block boundary of the closed list, attribute and `script`/`style` exclusion, NFC, decimal separator, unit table | RED (import) |
| FR-5 closed surface list | preservation | "Slugs `name` is NOT a part-2 surface"; "a meta_description that never mentions the name is fine (no part 1 on meta_description, OD-8)"; "the altered form in meta_description is a part-2 violation only"; blind-spot tests | RED (import) |
| FR-7 OD-7 (Translator not wrapped, no check) | wiring; validation | "never wraps the Translator (it has no Product Name, OD-7)"; "with NO Product Name there is no typed name to check against (OD-7)" | guard |
| FR-10 | slug-trim; validation | AC-1 length rows | RED |
| FR-14 (figures, video, spec-count, anglicisms) | existing specs | unchanged and green; the Story adds no change to them | guard |
| NFR-2, NFR-3, NFR-6 | none | nothing in the change touches providers, retrieval or the bundle; no vacuous test written | n/a |
