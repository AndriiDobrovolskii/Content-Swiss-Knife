---
artifact: impact_analysis
story: US-7.1
version: 1
status: DRAFT
owner: so-impact-analyzer
created_at: 2026-10-09T17:00:00Z
updated_at: 2026-10-09T17:00:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 4
  - key: open_decisions
    version: 2
open_decisions_blocking: false
---

# Impact analysis: US-7.1 (keep the operator's product name intact)

All lists were re-derived in this run by Grep/Bash over `src`, `test`, `server`; nothing is copied from the skill text. Specification v4 is APPROVED; Open Decisions v2 has no blocking item (OD-11, OD-12, OD-13 are OPEN with carried defaults, non-blocking).

## Design under survey (Specification v4, scope only)

Track: prompt, with validator work. Surfaces named by the spec: Slugs mode (FR-3, FR-10), SEO Meta mode (FR-4), UA Description / Generator and Task C translations (FR-6), Translator and Optimizer prompts (FR-7), a new deterministic classifier (FR-1) and token-preservation check (FR-5), repair-gate behaviour for SEO Meta (FR-8), legacy worked examples and assertions (FR-9).

## Affected files

### Must change (or very likely change)

| File | Why | FROZEN |
|---|---|---|
| `src/prompts/task-slug.ts` | The Slugs prompt. Rules 1-3, 5 and 8, worked examples 1 and 2 (`Bambu Lab Hardened Steel Nozzle 0.4 mm`, `Bambu Lab PLA Basic Filament ...`) localize descriptive tokens of a protected name; FR-2, FR-3, FR-9, FR-10 rewrite them. Worked example 3 (`XGRIDS L2 Pro 32/300 Standard Package`) also localizes `Standard Package`, so it is a third protected-name example. The context-enrichment block example (`Revopoint MetroY Ultra Standard Edition`) is a fourth. | no |
| `src/prompt-core/constants.ts` | `PRODUCT_NAME_LOCALIZATION` (line ~798) is "THE single copy" of the rule "translate the generic descriptive category, put it first". It is interpolated into `master-system-prompt.ts` (line 87), `task-c.ts` (six times, lines 178/206/234/284/332/369) and reached by `optimizer.ts` through `MASTER_SYSTEM_PROMPT`. It is the one non-frozen file through which the FR-6 and FR-7 rule can reach the master, Task C and the Optimizer. Also the home of `officialBrands` data for FR-1. | no |
| New sibling module(s), e.g. next to `src/utils/slug-validator.ts` | FR-1 classifier and FR-5 check (OD-10 precedent: `seo-metadata-shape.ts`, `product-name-consistency.ts`). Location is a `so-planner` decision. | no (new) |
| `src/services/content-orchestrator.service.ts` | Wiring. Validator call sites that must carry the new check: Slugs repair gate `validate:` (lines ~1014, ~1460, ~1654), SEO Meta repair gate `validate:` (~1061, ~1499, ~1609), the Doc / HTML master gates (~634, ~885) for the description surface, and `runOutputValidation` (~1885-1917). `enforceSlugLength(s.name, base, s.language)` at ~1682 is the FR-10 trim call. `canonicalizeSeoData` (~1703) calls `normalizeLongH1MetaTitle` (FR-4, OD-12). | no |
| `src/prompt-core/slug-utils.ts` | `enforceSlugLength` anchors on `invariantCore(name)` and trims tail tokens; FR-10 needs it to spare the full typed-name slug tokens without editing `invariantCore` (OD-5, OD-6). Also owns `stripSlugStopwords` / `normalizeSlug`, which FR-5 part 1 reuses for the slugified form (OD-3). | no |
| `src/prompts/task-translate.ts` | Translator prompt (no Product Name input, OD-7); needs the generic verbatim-preservation instruction (FR-7). Does NOT use `PRODUCT_NAME_LOCALIZATION` (verified), so it needs its own text. | no |
| `src/prompts/optimizer.ts` | Optimizer prompt, optional `[Product Name]` line; FR-7 verbatim instruction. Inherits `PRODUCT_NAME_LOCALIZATION` via `MASTER_SYSTEM_PROMPT`. | no |
| `src/prompts/task-a-doc.ts` | The UA Description (Doc) prompt, the master for FR-6 / AC-3; `localizedName` field instruction (line 55: "product name as it should read in this language"). | no |
| `src/utils/repair-strategy.ts` | `REPAIR_STRATEGIES` registry keys by rule id; a new rule id for FR-8's repair attempt needs an entry or it falls to the `['full-regen']` default (as `meta-title-template-shape` does today). `slug-name-designator-lost` already has a `deterministic` rung here. | no |
| `src/utils/slug-validator.ts` | `slug-name-designator-lost` compares each `name` against `invariantCore(sourceName)` only; the FR-5 part 1 check is stricter and sits beside it. Likely touched only if the planner extends it instead of adding a sibling. | no |
| `src/utils/seo-metadata-shape.ts` | OD-12 default: H1 over 54 code points triggers `normalizeLongH1MetaTitle`, which overwrites `meta_title` with a 49-code-point prefix plus a middle dot, cutting the typed name. Not required to change under the OD-12 default (the H1 omits the category instead), but it is the module that decides whether FR-4 holds; it changes if the OD-12 default is overturned. | no |

### FROZEN files (AGENTS.md section 9): possible stops, flagged loudly

None is assumed by the spec (OD-10). The survey found these places where the fix may NOT be reachable without one:

1. **`src/prompts/task-b.ts` (FROZEN) - SEO Meta mode (FR-4, AC-2).** The prompt text is in this file only. It instructs "use the localized name VERBATIM as `h1` and title core", and ANCHOR 4 pins the verbatim-name behaviour, so the H1 will follow a correct Slugs name. But FR-4 also requires `meta_title` to contain the whole typed name verbatim and allows the category to be dropped; the step-1/2/3 cascade is defined here, and there is no prompt-side statement of "typed name outranks category". Whether the fix needs text in `task-b.ts` cannot be settled by a survey; it is a stop-and-ask candidate at the plan gate.
2. **`src/prompts/task-c.ts` (FROZEN) - translation of the description (FR-6 for non-uk-UA locales).** The per-locale blocks contain inline text, not shared constants, that contradicts the new rule: lines ~170-171 ("TRANSLATE the generic descriptor and reorder it category-first"), ~213, ~251, ~297, ~337-338 ("TRANSLATE the generic descriptor, reorder it category-first"), plus the heading rule at ~29-31. Changing the shared `PRODUCT_NAME_LOCALIZATION` alone leaves those sentences in place, and the model then receives contradictory instructions. Reaching them needs a `task-c.ts` edit (section 9 approval, checksum re-baseline), or the planner finds a non-frozen override that wins.
3. **`src/prompt-core/master-system-prompt.ts` (FROZEN).** Interpolates `PRODUCT_NAME_LOCALIZATION` at line 87 and says at line ~168 that brand/model stay Latin "(see [PRODUCT NAME LOCALIZATION])". Text of the constant can change without touching this file (the file's bytes, and so its checksum, stay the same). A non-constant sentence in this file that conflicts would need the section 9 approval.
4. **`src/utils/output-validator.ts` (FROZEN).** Not required by the spec (OD-10 puts the new checks in siblings). Behavioural interaction only: it masks the product name before the Latin-unit check (`buildProductNamePattern`, lines ~395-570, driven by `productName`), and the MAX_META_TITLE (55) is mirrored, not imported, in `seo-metadata-shape.ts`.
5. **`src/prompts/task-a.ts` (FROZEN).** The HTML-path Generator prompt; passes `productShort(input.name)` as `[Product-short]` (line 163). It does not need to change if the Doc path (`task-a-doc.ts`) is the Generator path under test; the HTML path is still live in `content-orchestrator.service.ts` (line ~885) and AC-3 covers "Generator / UA Description" generally.

Note the precedent pattern: `task-a-doc.ts` / `task-a-consumables-doc.ts` exist because `task-a.ts` is frozen, and `seo-metadata-shape.ts` exists because `output-validator.ts` is. Whether a sibling or a section 9 approval is right for items 1 and 2 is a `so-planner` and human-gate decision, not decided here. `.arch-guard-checksums` currently holds entries for all five frozen files; any approved edit needs a re-baseline in the same commit.

### Needs re-verification even if unchanged

- `src/prompt-core/product-name-core.ts` (`invariantCore`, `productShort`): spec says unchanged (OD-6). Consumers: `slug-utils.ts`, `slug-validator.ts`, `heading-style.ts`, `number-format-fixer.ts`, `task-a.ts`. Its `DESCRIPTOR_STOPWORDS` includes `resin`, so for Fixture A the core stops before `Resin`; that under-capture is why `invariantCore` cannot enforce AC-1 and a full-typed-name check is needed.
- `src/utils/heading-style.ts`: `brandCoreMissing` and `heading-product-name-stuffing` (lines ~64, ~304, ~319) judge headings against `productShort`. AC-3 allows the full designator in the body but heading short forms are kept (OD-6); verify that a full-name heading is not newly flagged as stuffing, and that a short heading is not newly flagged by FR-5 part 2.
- `src/utils/product-name-consistency.ts` (`validateProductNameConsistency`, `validateProductNameH1SlugAgreement`): compares body, H1 and slug against the localized name; it receives the Slugs name and will see the new verbatim names.
- `src/utils/number-format-fixer.ts`: masks `invariantCore` only; a protected name carrying `1.75 mm` outside the core is still locale-formatted, which FR-2 permits.
- `src/utils/language-consistency.ts`, `src/utils/table-finalize.ts`: `STORE_REGISTRY` consumers; no direct role, re-run only.
- `src/utils/repair-gate.ts`: FR-8 failure paths (still shortened, HTTP 429, malformed JSON) are existing gate behaviour; confirm the rung that hands a rejected output back is not accepted unrepaired. Likely unchanged.
- `src/utils/translation-integrity.ts`, `src/utils/zip-generator.ts`: consume the product name; no change expected.
- `src/domain/description-doc.schema.ts` (references `product-name-core`/`slug-utils`): the Doc shape; `localizedName` stays a string, so no schema change is implied by the spec.
- `src/app/app.component.ts`: the only UI consumer of `SlugResponse` and `STORE_REGISTRY`; no spec requirement reaches it.

### Tests that cover them

Existing specs that exercise the files above (candidate set; OD-9 list marked *):

| Spec | Relevance |
|---|---|
| `src/prompts/task-slug.spec.ts` * | Prompt text assertions for Slugs; currently asserts only context-window shape. Worked-example text is not pinned here, so FR-9 cleanup is cheap but new prompt-text assertions are added here. |
| `src/prompt-core/slug-utils.spec.ts` * | `enforceSlugLength`, `normalizeSlug`, stopwords (FR-10, FR-5 slugified form). Uses `Bambu Lab` fixtures. |
| `src/utils/heading-style.spec.ts` * | Lines ~1008-1031: `productShort('Bambu Lab Hardened Steel Nozzle 0.4 mm')` -> `Bambu Lab Hardened Steel` and `brandCoreMissing` cases. These assert heading short-form behaviour, not localization; confirm they stay valid (OD-6 keeps short forms). |
| `src/utils/output-validator.spec.ts` * | Line ~336: `Bambu Lab PLA Basic Filament, 1.75 mm, 1 kg x 4` as productName for the unit-masking tests. Frozen-file spec; asserts masking, not localization. |
| `src/utils/spec-count-parity.spec.ts` * | Listed by OD-9; the grep for `Hardened Steel` / `PLA Basic` found no hit in it, so the OD-9 candidacy is unconfirmed (see Unknowns). |
| `test/fixtures/golden/full-description-prompts.json` * and `src/prompts/full-description.golden.spec.ts` | 14 `Bambu`/`Hardened` occurrences. Any text change in `PRODUCT_NAME_LOCALIZATION`, `task-a-doc.ts` or the master prompt moves these goldens. |
| `src/prompt-core/product-name-core.spec.ts` | Corpus for `invariantCore` / `productShort`; unchanged by spec, regression guard. |
| `src/utils/slug-validator.spec.ts`, `src/utils/product-name-consistency.spec.ts` | Sibling validators; regression guard and place to pin FR-5 interaction. |
| `src/utils/seo-metadata-shape.spec.ts`, `src/utils/seo-metadata-shape.long-h1.spec.ts` | FR-4 / OD-12 long-H1 canonicalizer; pins `MIRRORED_MAX_META_TITLE` against the frozen validator. |
| `src/prompts/task-b.spec.ts` | Contains `Bambu Lab` anchors; moves if `task-b.ts` is edited. |
| `src/prompts/task-c.spec.ts`, `src/prompts/task-translate.spec.ts`, `src/prompts/task-translate.simplified.spec.ts`, `src/prompts/optimizer.spec.ts` | Prompt-text assertions for FR-7 / FR-6. |
| `src/prompt-core/master-system-prompt.spec.ts` (+ `.v4`, `.image-markers`) | Line 132 already pins a phrase of `PRODUCT_NAME_LOCALIZATION`; text changes there can break it. |
| `src/prompt-core/constants.spec.ts`, `src/prompt-core/store-render-rules.spec.ts`, `src/prompt-core/doc-pipeline-flag*.spec.ts` | Registry consumers; per-store iteration for FR-11. |
| `src/utils/repair-gate.spec.ts`, `src/utils/repair-strategy.spec.ts`, `src/services/content-orchestrator.repair-field-wiring.spec.ts`, `content-orchestrator.translator-repair-gate.spec.ts`, `content-orchestrator.doc-gate.spec.ts`, `content-orchestrator.ua-doc-pipeline.spec.ts`, `content-orchestrator.simplified.spec.ts` | FR-8 mocked-LLM repair and orchestrator wiring; the spec file for the repair-gate test (AC-8) lands among these. |
| `src/prompts/task-a.spec.ts`, `task-a-doc*.spec.ts`, `src/prompts/task-a.import-cycle.spec.ts` | Generator prompt; the import-cycle spec guards new imports into `task-a.ts`. |
| `test/render-reconciliation.spec.ts`, `test/render-conformance*.spec.ts` | Corpus harness; see Fixture and corpus impact. |

## Hazard table (all seven checked)

| # | Hazard | Applies? | Evidence |
|---|---|---|---|
| 1 | `STORE_REGISTRY` fan-out | **Applies (AC-4, FR-11).** The change is registry-wide but needs no registry edit. | Re-derived with `grep STORE_REGISTRY` over `*.ts`: non-spec consumers are `src/app/components/html-editor/editor-html-pipeline.ts`, `src/app/app.component.ts`, `src/render/render-description.ts`, `src/prompt-core/{constants,store-render-rules,doc-pipeline-flag}.ts`, `src/utils/{output-validator,table-finalize,language-consistency}.ts`. `content-orchestrator.service.ts` and `task-slug.ts` reach it through `getStore` / `getLangsForStore` imported from `constants.ts`, not by name. Registry has 7 stores (`3DDevice`, `3DPrinter`, `3DScanner`, `Center 3D Print`, `Drukarka 3D`, `EXPERT3D`, `Expert-3DPrinter`); `officialBrands` is `[]` for `Drukarka 3D` and `Expert-3DPrinter` (constants.ts lines 75, 77), the FR-1 / FR-11 gap. Locale sets differ: EXPERT3D `en-ES, es-ES, pt-PT, uk-UA`; 3DDevice/3DPrinter/3DScanner `en-GB, uk-UA, ru-UA`; C3D `pl-PL, en-GB, de-DE, uk-UA, ru-UA`; Drukarka 3D `pl-PL, uk-UA`; Expert-3DPrinter `en-US, es-MX, uk-UA`. |
| 2 | uk-UA master, not one locale | **Applies, both directions.** | Task A / Doc builds the uk-UA artifact (`task-a-doc.ts`, `buildPromptADoc`), Task C translates every other locale (`task-c.ts` per-locale blocks). A fix in the shared `PRODUCT_NAME_LOCALIZATION` and `task-a-doc.ts` reaches **every locale of every store**; a Task C-only gap leaves the non-uk-UA description translations rewriting the name even after the uk-UA master is correct (this is the FR-6 "fan-out via Task C" line). Slugs and SEO Meta are separate per-locale generators (`buildPromptSlug`, `buildPromptB`), unaffected by the master. A change to uk-UA generation means full-catalogue regeneration, not a one-locale fix. |
| 3 | prompt -> schema -> renderer -> validator chain | **Partly.** | Prompt: affected (task-slug, constants, task-a-doc, task-translate, optimizer; task-b / task-c if approved). Schema (`src/domain/description-doc.schema.ts`): not affected, `localizedName` stays a string. Renderer (`src/render/render-description.ts`): not affected, the name is emitted as text. Validator: **affected** by addition of the new FR-5 sibling check, plus its wiring in the orchestrator and `repair-strategy.ts`; the frozen `output-validator.ts` itself is not edited. AGENTS.md section 4 criteria keep being enforced by the unchanged frozen validator. |
| 4 | FROZEN files | **Possible stop, not assumed.** | See "FROZEN files" above: `task-b.ts` (FR-4) and `task-c.ts` (FR-6 translation) are the two with real conflict text or sole-ownership of the behaviour; `master-system-prompt.ts` is touched only through its interpolated constant. Checksums file holds all five. |
| 5 | Corpus conformance harness | **Does not move the golden HTML directly; coverage gap applies.** | `test/fixtures/corpus/` holds 2 items, both Ortur H20 20 W (EXPERT3D and Center 3D Print): `*.ctx.json`, `*.doc.json`, `*.uk-UA.html`. Report `test/render-reconciliation.report.md` line 211: "Corpus is 2 items, not 6, and both are the same product". Neither product name is protected under FR-1(ii) / (iii) in a way that changes output (`Ortur H20 20 W`: `H20` is letter+digit so it IS protected by rule (ii); `20 W` is a number+unit span). Rendering is unchanged by this Story (the renderer emits whatever name the Doc carries), so the corpus is not expected to move. The corpus has no Formlabs-style or Bambu-style fixture, so FR-5 needs its own fixtures (Fixtures A, B, C), none of which exist in `test/fixtures/`. |
| 6 | Test runners | **Applies.** | All new tests are logic specs (`*.spec.ts` under `src/prompts`, `src/prompt-core`, `src/utils`, `src/services`, `test/`) and land in `npm run test:logic` (vitest, happy-dom). No component test is implied; `app.component.ts` is not required to change, so `npm run test:components` (the `*.component.spec.ts` runner) is not touched. |
| 7 | `server/**` | **Does not apply.** | Searched `server/` for `product-name-core`, `slug-validator`, `slug-utils`, `seo-metadata-shape`, `repair-gate`, `product-name-consistency`: no hit. All work is in `src/`. No usage-store column is added, so the `CREATE TABLE IF NOT EXISTS` no-migration hazard is not tripped. |

## Silent-failure risks (produce wrong output, no error)

1. **Prompt conflict in Task C.** `PRODUCT_NAME_LOCALIZATION` is changed but inline `task-c.ts` sentences still say "TRANSLATE the generic descriptor ... category-first". The model gets two instructions; the uk-UA master keeps the name while es-ES / pt-PT / ru-UA / pl-PL / de-DE translations still rewrite it. Detected by FR-5 part 2 only on the closed surface list, and only if the shortened form skips a token and ends on the last token.
2. **FR-5 part 2 blind spots (spec NFR-7).** A shortened form lacking the typed name's last token (`Formlabs Form Studio 1`), a brand-only name with no designator (`Bambu Lab PLA Basic Filament 1.75 mm`), and any surface outside the closed list pass without a violation.
3. **Translator, and Optimizer without `[Product Name]`.** No typed name in the request, so no deterministic check; behaviour is prompt-only (OD-7).
4. **`invariantCore` under-capture stays.** `slug-name-designator-lost` keeps passing a name that drops `Resin Tank`, because `resin` is a descriptor stopword and ends the core. Only the new FR-5 check catches it; if it is not wired into all three Slugs repair gates plus `runOutputValidation`, that path stays silent.
5. **Slug trimming.** `enforceSlugLength` returns the over-length slug unchanged when the anchor is not found, and trims tail tokens otherwise. A protected name whose slug anchors on the short core can lose `resin-tank` tokens from the tail without error unless FR-10's guard is added.
6. **Long-H1 canonicalizer.** If a localized name is added with a category prefix and the H1 reaches 54 code points, `canonicalizeSeoData` silently rewrites `meta_title` to a 49-code-point prefix, which cuts the typed name; `meta-title-template-shape` then accepts it because the same function produced it. The OD-12 default avoids this only if the H1 itself omits the category.
7. **Latin name inside Cyrillic text.** `language-consistency.ts` and the anglicism checks may flag Latin descriptive words such as `Resin Tank` in uk-UA / ru-UA output; the unit check masks the product name (`buildProductNamePattern`), but the language-consistency pass has no name mask (no `productName` use found in the file). Not verified against output; see Unknowns.
8. **Heading rules.** `heading-product-name-stuffing` and `brandCoreMissing` judge headings against `productShort`; the full typed name placed in a heading to satisfy AC-3 may be flagged as stuffing, and a short heading is not flagged by FR-5 only by the "bare `Form Studio 1`" carve-out.
9. **Golden drift.** `full-description-prompts.json` regenerates silently with `-u`; a reviewed diff is required (OD-9) or an unintended text change ships.

## Failures that will error (for contrast)

`tsc --noEmit` / lint on new modules; golden spec failure on any prompt text change; `master-system-prompt.spec.ts` line ~132 phrase pin; `arch-guard.sh` FROZEN checksum failure if a frozen file is edited without re-baseline; `task-a.import-cycle.spec.ts` if a new import creates a cycle through `task-a.ts`.

## Fixture and corpus impact

- **Corpus (`test/fixtures/corpus/`)**: not expected to move; rendering code is unchanged. `render-reconciliation.spec.ts` and `render-conformance*.spec.ts` remain regression guards. Coverage gap (report line 211): two items, one product; there is no protected-name product with a decimal and a unit, and no brand-only name, so the corpus cannot stand in for Fixtures A and B.
- **New fixtures needed (TEST_WRITING, not this stage)**: Fixture A (`Formlabs Form Studio 1 Resin Tank Pro`, EXPERT3D), Fixture B (`Bambu Lab PLA Basic Filament 1.75 mm`), Fixture C (`Hardened Steel Nozzle 0.4 mm`, `With Spool`), plus `0.4mm` / `4 mm` / `1 kg` / `3D Printer Cleaning Kit` classification cases from FR-1, and a per-store iteration over all 7 registry entries (FR-11).
- **Golden**: `test/fixtures/golden/full-description-prompts.json` moves for any text change in the shared constant or the master / Task A prompts.
- `test/fixtures/image-placeholder/fixtures.ts` references `STORE_REGISTRY` only; no impact.

## Blast-radius summary

The work is prompt text plus two deterministic modules, and it reaches every store and locale. The Slugs prompt (`task-slug.ts`, not frozen) carries four worked examples that localize protected names and must be rewritten. The description path is the wide fan-out: the rule "translate the descriptive category" lives once in `PRODUCT_NAME_LOCALIZATION` (`constants.ts`, not frozen), interpolated into the frozen master prompt and six places in frozen `task-c.ts`, and reaches the Optimizer, so one edit there moves the uk-UA master and every translated locale and shifts all prompt goldens. Task C also holds inline category-first sentences of its own, and `task-b.ts` owns the SEO Meta cascade; both are FROZEN and are the places where the plan may hit a section 9 stop. The FR-1 classifier and FR-5 check are new sibling modules that must be wired into three Slugs gates, three SEO gates, the Doc and HTML gates and `runOutputValidation` in the orchestrator, with repair registration in `repair-strategy.ts` for FR-8. `invariantCore`, the schema, the renderer, `server/` and the corpus do not change. All new tests run under `test:logic`. The largest silent risks are the Task C prompt conflict, the long-H1 `meta_title` canonicalizer, and the spec-acknowledged part 2 blind spots.

## Unknowns

1. Whether the fix needs text in `task-b.ts` (FR-4) or `task-c.ts` (FR-6); needs `so-planner` to try a non-frozen route (constants override) and the human gate for per-file section 9 approval if none wins. Settled by a prompt-text experiment at planning.
2. Whether `language-consistency.ts` / anglicism checks flag Latin descriptive tokens (`Resin Tank`) in uk-UA output; needs a test fixture run at TEST_WRITING.
3. Whether `src/utils/spec-count-parity.spec.ts` really belongs in the OD-9 set: the grep for `Hardened Steel` / `PLA Basic` / `Bambu` found no match in it. Settled by reading its fixtures at planning.
4. Which Generator path (Doc `task-a-doc.ts` vs HTML `task-a.ts`) is live per store for AC-3; `doc-pipeline-flag.ts` decides per store and was not exhaustively traced.
5. The `task-c.ts` and `task-b.ts` effects were judged from reading prompt text, not from live model output; spec NFR-7 itself records live confirmation as manual release evidence.
6. OD-11, OD-12 and OD-13 are OPEN with carried defaults; if overturned at HUMAN_SPEC_APPROVAL, the classifier (FR-1), `seo-metadata-shape.ts` (OD-12) and the tokenisation (OD-13) change, and this survey's file list for those three needs re-checking.
