---
artifact: implementation_plan
story: US-7.1
version: 1
status: APPROVED
owner: so-planner
created_at: 2026-10-09T17:30:00Z
updated_at: 2026-10-09T17:30:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 4
  - key: open_decisions
    version: 2
  - key: impact_analysis
    version: 1
open_decisions_blocking: false
---

# Implementation plan: US-7.1 (keep the operator's product name intact)

## Approach

Add a deterministic, model-free layer and a prompt layer that agree on one definition of a "protected name".

1. **Deterministic layer (new sibling modules in `src/utils` and `src/prompt-core`, nothing FROZEN):** a classifier (FR-1), one shared tokenisation T (FR-5), and a two-part preservation check (FR-5) that emits `ValidationIssue`s. It is wired into the existing SEO Meta repair gate (the only surface where a repair attempt is required, FR-8) and into post-hoc output validation (everything else is report-only per FR-3/FR-6).
2. **Prompt layer, reached without touching FROZEN files:** (a) rewrite the non-frozen Slugs prompt, Doc prompt, Translator and Optimizer text; (b) add one static precedence clause to the shared `PRODUCT_NAME_LOCALIZATION` constant (reaches the master, Task C and the Optimizer by interpolation); (c) add a small dynamic `[PROTECTED PRODUCT NAME]` block, built from the deterministic classification, and **append it to `userContent`** at the orchestrator call sites for every builder that carries a Product Name. Because it is appended to `userContent`, `systemBlocks` are untouched and the prompt-caching economics hold (NFR-1).
3. **Length/ordering fixes, also non-frozen:** a sibling slug trimmer that spares the typed-name slug tokens (FR-10) and a sibling that picks the SEO name core (category dropped when category + typed name reaches 54 code points, OD-12 default; FR-4).

The repair gate's blind spot today (it accepts the shortened H1 because `meta-title-template-shape` passes) is closed by the new FR-5 part 1 rule living in the same `validate:` list, so a shortened H1 or `meta_title` triggers a repair and is never accepted unrepaired (FR-8).

## Design decisions

### D1. Domain model (`src/domain/`): no change

`ProductDescriptionDoc` / `ConsumablesDoc` keep `localizedName: string`. No field added, so corpus fixtures in `test/fixtures/corpus/` parse unchanged and nothing is regenerated. The classification result is computed on demand from the typed name, never stored.

### D2. Deterministic modules (FR-1, FR-5, NFR-5)

All new, all pure functions, no model call, no clock, no randomness. None imports `task-a.ts` (keeps `task-a.import-cycle.spec.ts` green).

| New file | Responsibility |
|---|---|
| `src/utils/product-name-tokens.ts` | Tokenisation T: HTML-to-text with the block-boundary hard-break list, attribute and `script`/`style` exclusion; whitespace split; edge-punctuation stripping and the hard-break punctuation set; number-with-separator rule; number+unit split (`0.4mm` to `0.4` + `mm`) applied to both sides; rule 3 equality (NFC, case-sensitive, decimal separator equivalence, unit equivalence via `LATIN_TO_CYRILLIC_UNITS` in `src/utils/unit-tables.ts`). |
| `src/utils/protected-product-name.ts` | FR-1 `classifyProductName(typed)` returning `{ protected, designators }`. Brand set = union of `officialBrands` derived from `STORE_REGISTRY` at call time (not copied) plus an exported `SPEC_LISTED_BRANDS = ['Formlabs', 'Bambu Lab']`. Implements rules (i)-(iii), number+unit and decimal exclusion before rule (iii), the `3D` exemption, `PLA+` non-match, empty input = generic. The whole OD-11 default lives in this one file, so overturning OD-11 at the spec gate changes one module. |
| `src/utils/product-name-preservation.ts` | FR-5 part 1 (`product-name-token-missing`, contiguity under rule 3, slug check using `stripSlugStopwords` / `normalizeSlug` from `src/prompt-core/slug-utils.ts` on both sides) and part 2 (`product-name-shortened-form`, designator-token scan, full-occurrence exclusion). Exposes one function per closed surface group: `checkNameSurfaces` (Slugs name/slug, SEO h1/meta_title; part 1 plus part 2 on h1/meta_title/meta_description), `checkDescriptionHtml` (part 2 only, all locales), `checkOptimizerText` (part 2 only). Generic or empty typed name returns `[]`. Issues are `severity: 'error'`, carrying surface, locale and missing token or offending form. |
| `src/utils/protected-seo-name.ts` | FR-4 / OD-12 default: `seoCoreName(localizedName, typedName, protected)` keeps the category when `category + typed name` is under 54 code points, otherwise returns the typed name alone. Used to build the `localizedNames` map passed to `buildPromptB`. |
| `src/prompt-core/protected-slug.ts` | FR-10: `enforceProtectedSlugLength(name, slug, typedName, language)` wraps the trimming idea of `enforceSlugLength` but removes only tail tokens outside the typed-name slug span; if the typed-name slug alone exceeds 100 it is returned whole. `enforceSlugLength` and `invariantCore` are not edited (OD-6); the orchestrator picks the protected variant when the classification says protected. |
| `src/prompt-core/protected-name-block.ts` | Builds the dynamic `[PROTECTED PRODUCT NAME]` text block and `withProtectedNameBlock(payload, typedName)`, which returns `{ systemBlocks: payload.systemBlocks, userContent: payload.userContent + block }` for protected names and the payload unchanged for generic ones. |

The existing `slug-name-designator-lost` rule (anchored on `invariantCore`, which stops before `resin`) stays as is; the new check sits beside it because it uses the full typed name.

### D3. The prompt -> schema -> renderer -> validator chain stays in agreement

- **Prompt:** typed name rendered verbatim for protected names (static clause in `PRODUCT_NAME_LOCALIZATION` + dynamic block + rewritten Slugs examples + Doc prompt `localizedName` instruction).
- **Schema:** unchanged (D1); `localizedName` is a string, so no prompt field lacks a schema field and no schema field is ignored.
- **Renderer (`src/render/render-description.ts`):** unchanged; emits the Doc's name as text.
- **Validator:** the new FR-5 modules sit beside the frozen `output-validator.ts`, which is not edited.
- **AGENTS.md section 4 criteria the renderer/validators must keep satisfying (FR-12 to FR-14), enforced where they already are:** `meta_title` at most 55 and `meta_description` at most 155 ending with the CTA arrow (`validateSeoMetadata`, `meta-title-length` in `seo-metadata-shape.ts`); `meta-description-currency` stays disarmed (`NO_CURRENCY_CHECK`); number-unit spacing (`number-format-fixer.ts`, `decimal-separator.ts`; FR-5 tokenisation treats the spaced and unspaced forms as equal so the required space is never a violation); spec-count parity (`spec-count-parity`); figure/figcaption/`loading`/`decoding` and video presence (renderer and `output-validator.ts`); anglicism rules (`language-consistency.ts`).

### D4. FROZEN-file position (AGENTS.md section 9), per file

| File | Edit needed? | Decision |
|---|---|---|
| `src/prompts/task-b.ts` | **No.** | Non-frozen route exists. `task-b.ts` already uses the supplied localized name VERBATIM as H1 and title core (ANCHOR 4). The typed-name-outranks-category rule (OD-2) is delivered by (a) feeding `buildPromptB` the `seoCoreName` result as its `localizedNames`, (b) the appended dynamic block stating the OD-2 priority, and (c) FR-5 part 1 on `h1`/`meta_title` inside the SEO gate with repair. Not a section 9 item. If live evidence at release shows the cascade still drops the name, that is a new, separate request. |
| `src/prompt-core/master-system-prompt.ts` | **No.** | It only interpolates `PRODUCT_NAME_LOCALIZATION` (line 87); editing the constant leaves this file's bytes and checksum unchanged. Line ~168 (trade names verbatim, "see [PRODUCT NAME LOCALIZATION]") is compatible with the new rule. |
| `src/prompts/task-a.ts` | **No.** | HTML-path Generator reached through the dynamic block appended at the orchestrator; the Doc path (`task-a-doc.ts`, non-frozen) is edited directly. |
| `src/utils/output-validator.ts` | **No.** | New checks are siblings (OD-10 precedent). |
| `src/prompts/task-c.ts` | **Not strictly required; one optional hardening is raised as a section 9 request (F-1).** | See below. |

**Section 9 request F-1 (for HUMAN_PLAN_APPROVAL; this plan does NOT assume it is granted).**

- *File:* `src/prompts/task-c.ts` (FROZEN).
- *Exact change:* in the inline per-locale instruction text, replace the sentence fragment "TRANSLATE the generic descriptor and reorder it category-first" (and its wrapped/variant forms) with "apply [PRODUCT NAME LOCALIZATION] (a protected name is kept verbatim)". Occurrences found by grep: lines ~170-171 (HTML-form instruction), ~251 (uk/ru), ~297 (es-ES), ~337-338 (pt-PT), ~389 (es-MX); the per-locale block at ~213 and the heading rule at ~29-31 must be re-read at implementation time and changed only if they carry the same instruction. No other change to the file; the six `${PRODUCT_NAME_LOCALIZATION}` interpolations stay.
- *Why:* these inline sentences live in the cached system block and tell the model to translate and reorder the descriptor, contradicting the protected-name rule for every non-uk-UA locale. They defer to "[PRODUCT NAME LOCALIZATION]", so the static precedence clause plus the userContent block should win, but a contradictory instruction in a cached prompt is the largest silent risk in the impact analysis (risk 1).
- *Consequence if approved:* `bash arch-guard.sh --rebaseline` and `.arch-guard-checksums` committed in the same commit as the edit; `task-c.spec.ts` and the Task C goldens move with a reviewed diff.
- *Consequence if NOT approved (default):* the baseline plan above is complete and implementable as written; risk R1 is accepted, detected by FR-5 part 2 on the translated descriptions, and the live-model check is recorded as manual release evidence (NFR-7).

The plan therefore has no FROZEN edit that is required; F-1 is the single per-file approval item.

### D5. Prompt payload contract (`src/prompt-core/payload.ts`)

`PromptPayload` shape is unchanged. The dynamic block (which contains the per-product typed name) is appended to `userContent`, never to a `systemBlocks` entry, so `systemBlocks[0]` (master) and `[1]` (task template) remain identical across products and keep their `cache: true` breakpoints. The static precedence clause added to `PRODUCT_NAME_LOCALIZATION` is product-independent, so it changes cached text once but does not fragment the cache per product. Caching consequence: none beyond a one-time cache re-warm after the constant changes.

Call sites that wrap the payload with `withProtectedNameBlock` in `content-orchestrator.service.ts`: Task A / A-doc (lines ~857, ~1330), Slugs (~1002, ~1449, ~1646), Task B (~1050, ~1488, ~1599), Task C (~1096 and the other `buildPromptC` sites), Optimizer when a product name is supplied (~1756). Translator (~1803) has no typed name (OD-7) and is not wrapped.

### D6. Non-frozen prompt text (FR-2, FR-3, FR-6, FR-7, FR-9)

- `src/prompt-core/constants.ts`: `PRODUCT_NAME_LOCALIZATION` gains a leading precedence clause ("when the request carries a [PROTECTED PRODUCT NAME] block, keep every token of that name, in order, untranslated, rendered verbatim once; this overrides the descriptor-translation and category-first rules below and any inline instruction elsewhere to translate or reorder the descriptor; only number/unit locale formatting is allowed"). Generic-name behaviour text is unchanged. The `master-system-prompt.spec.ts` phrase pin (line ~132) is re-checked.
- `src/prompts/task-slug.ts`: rules 1-3, 5, 8 get a protected-name carve-out; worked examples 1-3 and the context-enrichment example are rewritten so no protected input name translates, drops or reorders a token; generic-name examples (`Hardened Steel Nozzle`, `With Spool`) and their behaviour are untouched.
- `src/prompts/task-a-doc.ts`: `localizedName` instruction (line ~55) states the protected-name rule; no positive "name must appear" clause (OD-8).
- `src/prompts/task-translate.ts` and `src/prompts/optimizer.ts`: a generic verbatim-preservation sentence for brand/model names (OD-7). `task-translate.ts` does not use the shared constant, so it gets its own text.
- Fixtures/goldens: `test/fixtures/golden/full-description-prompts.json` regenerated only for the changed text, with a reviewed diff (OD-9).

### D7. Orchestrator wiring (`src/services/content-orchestrator.service.ts`)

- `classifyProductName(input.name)` computed once per run.
- SEO Meta gate `validate:` (lines ~1057, ~1499, ~1609): append `checkNameSurfaces` results for `h1`/`meta_title`/`meta_description` (FR-4, FR-5, FR-8). The `withFeedback` text for the new rule ids restates the OD-2 priority. Repair outcomes: still shortened, HTTP 429, malformed JSON all leave the issue unresolved (existing `runRepairGate` behaviour; confirmed by tests, not changed).
- Slugs mode and description surfaces: **report-only** (FR-3, FR-6). `checkNameSurfaces` for Slugs name/slug and `checkDescriptionHtml` per locale are added to `runOutputValidation` (~1885-1917), not to the Slugs/HTML repair gates, because the spec requires no repair attempt there.
- `localizedNames` passed to `buildPromptB` are mapped through `seoCoreName`; the trim call at ~1682 uses `enforceProtectedSlugLength` for protected names.
- `src/utils/repair-strategy.ts`: explicit registry entries for `product-name-token-missing` and `product-name-shortened-form` (same ladder as `meta-title-template-shape`: `['full-regen']`) so they do not rely on the default.

### D8. Angular and server surface

No component, signal or service-state change: new issues flow through the existing `validationIssues` signal and its current display. No RxJS added. `server/**` is untouched; no `server/usage/store.js` column, so the no-migration hazard is not tripped.

### D9. Store / locale scope (FR-11, NFR-4)

Nothing is named per store. The classifier derives its brand set from `STORE_REGISTRY` and tests iterate `STORE_REGISTRY` entries and each store's own locales, including `Drukarka 3D` and `Expert-3DPrinter` (empty `officialBrands`). The classification is store-independent, so a uk-UA master fix fans out to every translated locale through Task C.

### D10. Validation strategy (all categories land in `npm run test:logic`, vitest; no component test; no server/node:test change)

| Category | Against | Where |
|---|---|---|
| Classifier unit tests | FR-1 table: Fixtures A, B, C, `0.4 mm`, `0.4mm`, `4 mm`, `1 kg`, `3D Printer Cleaning Kit`, `PLA+`, empty | `src/utils/protected-product-name.spec.ts` |
| Tokenisation and check unit tests | Part 1 (missing `Resin`/`Tank`, locale number/unit equivalence, slug form), part 2 (`Form Studio 1 Pro` flagged; bare `Form Studio 1`, `any Elegoo resin printer`, `PLA, 1.75 mm` not flagged; full occurrence exclusion), closed surface list | `src/utils/product-name-tokens.spec.ts`, `src/utils/product-name-preservation.spec.ts` |
| Slug trimming | FR-10 cases (a) and (b) | `src/prompt-core/protected-slug.spec.ts` |
| SEO name core | OD-12 default at 53/54/55 code points | `src/utils/protected-seo-name.spec.ts` |
| Prompt-text assertions on exported builders | Slugs, Doc, Task B/C/Optimizer payload (block in `userContent`, `systemBlocks` identical to the no-block payload), Translator, Optimizer verbatim sentence; rewritten examples contain no localized protected name | `src/prompts/*.spec.ts`, `src/prompt-core/protected-name-block.spec.ts` |
| Per-store registry iteration | FR-3/FR-4/FR-6 fixtures against every `STORE_REGISTRY` entry | spec under `src/prompt-core` or `src/utils` |
| Mocked-LLM repair gate (AC-8) | model returns `Formlabs Form Studio 1 Pro`: issue raised, repair attempted, not accepted; repair still shortened, 429, malformed JSON all unresolved | new spec beside `content-orchestrator.repair-field-wiring.spec.ts` |
| Regression | `heading-style`, `product-name-consistency`, `slug-validator`, `seo-metadata-shape*`, `number-format-fixer`, spec-count parity, corpus (`test/render-*.spec.ts`), goldens | existing specs, goldens updated with reviewed diff |
| Legacy assertion cleanup (AC-9) | confirm the OD-9 set; `spec-count-parity.spec.ts` membership is unconfirmed by the survey and is verified when reading its fixtures | existing specs |
| Manual release evidence | live-model run of Fixture A on EXPERT3D (NFR-7) | recorded outside the suite |

## Files to create / modify

Derived from the impact analysis; not re-surveyed.

**Create (non-frozen):** `src/utils/product-name-tokens.ts`, `src/utils/protected-product-name.ts`, `src/utils/product-name-preservation.ts`, `src/utils/protected-seo-name.ts`, `src/prompt-core/protected-slug.ts`, `src/prompt-core/protected-name-block.ts`, plus a `.spec.ts` for each.

**Modify (non-frozen):**
- `src/prompt-core/constants.ts` — precedence clause in `PRODUCT_NAME_LOCALIZATION`.
- `src/prompts/task-slug.ts` — rules and four worked examples (FR-3, FR-9).
- `src/prompts/task-a-doc.ts` — `localizedName` instruction (FR-6).
- `src/prompts/task-translate.ts`, `src/prompts/optimizer.ts` — verbatim sentence (FR-7).
- `src/services/content-orchestrator.service.ts` — wrapper at call sites, gate `validate:` wiring, `runOutputValidation`, `seoCoreName`, protected slug trim.
- `src/utils/repair-strategy.ts` — registry entries.
- Existing specs and `test/fixtures/golden/full-description-prompts.json` per OD-9.
- Read-only unless tests show otherwise: `src/utils/slug-validator.ts`, `src/utils/seo-metadata-shape.ts` (changes only if OD-12 is overturned), `src/utils/language-consistency.ts` (a name mask only if a fixture shows Latin `Resin Tank` is flagged in Cyrillic output), `src/utils/heading-style.ts`.

**Modify only with section 9 approval (F-1):** `src/prompts/task-c.ts`, with `.arch-guard-checksums` re-baselined in the same commit.

**Not touched:** `src/domain/**`, `src/render/**`, `src/app/**`, `server/**`, `src/prompt-core/product-name-core.ts` (OD-6), and the four other FROZEN files.

## Risks

| # | Risk | How it surfaces |
|---|---|---|
| R1 | Task C inline "translate the generic descriptor" sentences still in the cached system block (if F-1 is denied) fight the protected-name instruction in non-uk-UA locales. | FR-5 part 2 error findings on translated descriptions; manual live run. |
| R2 | FR-5 part 2 blind spots accepted by the spec (shortened form lacking the last token; brand-only names; surfaces off the closed list; Translator and Optimizer without a name). | Not detected deterministically by design; prompt-text assertions and manual evidence only. |
| R3 | Long-H1 canonicalizer rewrites `meta_title` to a 49-code-point prefix when H1 reaches 54 code points. | `seoCoreName` keeps the H1 under 54 by dropping the category; FR-5 part 1 on `meta_title` fails loudly otherwise; unit test at 53/54/55. |
| R4 | `enforceSlugLength` anchoring on the short `invariantCore` trims `resin-tank`. | Protected variant used; FR-10 tests; FR-5 slug check. |
| R5 | Golden drift from the constant change. | Golden spec fails; diff reviewed before `-u`. |
| R6 | Language-consistency or heading-stuffing rules newly flag the full typed name. | Fixture runs at TEST_WRITING; sibling mask if confirmed. |
| R7 | OD-11 / OD-12 / OD-13 are OPEN; overturning them changes classifier, `seo-metadata-shape.ts` or tokenisation. | Each lives in one module (D2), so the blast radius of a reversal is bounded. |
| R8 | Dynamic block drifts into `systemBlocks` later. | Test asserts `systemBlocks` deep-equal to the unwrapped payload. |

## Rejected alternatives

1. **Edit `task-b.ts`, `task-c.ts` and `master-system-prompt.ts` directly.** Rejected as the baseline: the siblings, the shared constant and a `userContent` block reach the behaviour without a section 9 stop; only `task-c.ts` is raised as an optional hardening (F-1).
2. **Extend `invariantCore` to capture `Resin Tank`.** Rejected: spec OD-6 keeps it unchanged and its under-capture is a known fan-out hazard.
3. **Put the protected-name block in a `systemBlocks` entry.** Rejected: per-product text in a cached block breaks prompt caching economics (AGENTS.md section 3).
4. **Let the model decide brand versus generic.** Rejected: NFR-5 requires determinism; model inference cannot be asserted in tests.
5. **Auto-rewrite shortened names in output by string substitution.** Rejected: unsafe inside inflected and translated text; the spec requires detection and reporting, not silent repair.
6. **Wire the FR-5 check into the Slugs and HTML repair gates as well.** Rejected for this Story: FR-3 and FR-6 require only a reported violation; adding repair loops expands scope and LLM cost. Noted as a possible follow-up.
7. **One monolithic validator file.** Rejected: separating classifier, tokeniser and check keeps the OD-11 and OD-13 defaults each overturnable in one place.

## FROZEN-file position (summary)

No FROZEN edit is required. One per-file section 9 approval item for HUMAN_PLAN_APPROVAL: **F-1, `src/prompts/task-c.ts`** (inline descriptor-translation sentences, listed above). Default if not approved: proceed on the baseline.

## Traceability

| Requirement | Design decision / file |
|---|---|
| FR-1 | D2 `protected-product-name.ts` |
| FR-2 | D6 (constant clause, Slugs, Doc), D5 block |
| FR-3 | D6 `task-slug.ts`; D7 report-only in `runOutputValidation` |
| FR-4 | D2 `protected-seo-name.ts`; D4 task-b non-frozen route; D7 SEO gate |
| FR-5 | D2 `product-name-tokens.ts`, `product-name-preservation.ts`; D7 |
| FR-6 | D6 constant + `task-a-doc.ts`; D4 F-1; D7 `checkDescriptionHtml` |
| FR-7 | D6 `task-translate.ts`, `optimizer.ts`; D7 optimizer check |
| FR-8 | D7 SEO gate `validate:`, `repair-strategy.ts`; D10 mocked-LLM test |
| FR-9 | D6 Slugs examples and OD-9 spec/golden cleanup |
| FR-10 | D2 `protected-slug.ts`; D7 |
| FR-11 | D9; D10 per-store test |
| FR-12 to FR-14 | D3 (existing enforcement points), D10 regression |
| NFR-1 | D5 |
| NFR-2, NFR-3 | no provider or retrieval code touched; D2 modules are pure |
| NFR-4 | D9 |
| NFR-5 | D2 |
| NFR-6 | D8 |
| NFR-7 | D10 manual evidence and prompt-text assertions |
