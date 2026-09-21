---
artifact: implementation_plan
story: US-2.2
version: 2
status: APPROVED
owner: so-planner
created_at: 2026-09-21T17:00:00Z
updated_at: 2026-09-21T19:00:00Z
supersedes: docs/plans/US-2.2-implementation-plan.md@v1
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 1
  - key: open_decisions
    version: 3
  - key: impact_analysis
    version: 1
open_decisions_blocking: false
---

# Implementation Plan — US-2.2: Simplified v4 content-template schemas and Content Template dropdown

## Revision notes (v2, loop-back attempt 1 of 3)

Resolves PLAN_REVIEW v1 (`docs/reviews/plans/US-2.2-plan-review.md`). Changed sections are marked "(v2)".

- **B1** (FR-2 label seam): D7 now extracts the template labels into a pure module `src/app/content-template-labels.ts`; the test imports it under `test:logic`. Validation table and file list updated.
- **B2** (FR-8 failure path): new decision D4b names the enforcement point on both paths (Doc gate rule in the completeness gate, HTML rule in a new sibling `src/utils/simplified-specs-shape.ts` called through the single frozen-file call) and defines `flatSpecs` with several categories. D3, D5, D6, validation table, files, traceability updated.
- **N1** (merge unit), **N3/N4** (interim behaviour, ordering), **N2** (walker absent-case tests mandatory), **N7** (R6 surfaced) handled in D6, D6b, D7 and Risks. N5, N6 need no plan change.
- Specification and Open Decisions are unchanged.

## Approach

The three simplified templates are not a new pipeline. They are three **paragraph subsets of the standard v4 `ProductDescriptionDoc`**, selected by `templateId`. One pure, dependency-free module (`src/prompt-core/simplified-templates.ts`) is the single source of truth for the four templates: ids, per-template paragraph set, v4 word ranges, the 5500 soft ceiling. Every link of the chain reads it, so the links cannot drift apart: the prompt builders (`task-a-doc.ts`, frozen `task-a.ts`) request only the listed paragraphs; the schema makes the omittable paragraphs optional; the renderer skips absent ones and flattens §7 to one `<tbody>`; the validator checks each present paragraph against the ranges. Full description stays `templateId === undefined` (OD-5), so every new branch is guarded by "is a simplified template id" and the Full path is not touched, which is what makes FR-6 byte identity provable. The whole consumables stack is then deleted. Frozen files are edited minimally, and new logic lives in sibling files that the frozen files call.

## Design decisions

### D1. Template registry: a new pure module, ids, and guard (FR-1..FR-7, FR-13, FR-15)

New `src/prompt-core/simplified-templates.ts` (no imports from `src/app`, no Angular). Exports:

- `SIMPLIFIED_TEMPLATE_IDS = ['filaments-resins-powders', 'accessories', 'spare-parts'] as const`, `isSimplifiedTemplateId(id?: string)` (unknown or stale ids, including a persisted `'consumables-resin'`, return false and therefore behave as Full; see D14).
- `paragraphsFor(templateId, { includeFunctionality })` returning the ordered paragraph list (Filaments: 1,2,4,5,7,8; Accessories: 1,2,5,7,8 plus 3 only when the flag is true; Spare parts: 1,5,8), with `§5` and `§7` marked *conditional on source data* (OD-7, FR-10, FR-11).
- `V4_WORD_RANGES` (hook 40–85, killerSpecs+keyBenefits block 90–300 and ≤ 8 items, applications 80–250 with 4–8 items, compatibility 30–100, CTA 50–100, FAQ 150–400) and `NARRATIVE_SOFT_CEILING = 5500`.
- `countWords(text)`: one shared word counter used by both validator entry points (D6).

Reason: prompt, schema-adjacent validator and renderer flag all need the same table; duplicating it is how a prompt asks for a field the validator rejects. It is a sibling file, not an edit of a frozen one, and it imports nothing so frozen files may import it without new dependency edges.

`CONTENT_TEMPLATES` in `src/app/types.ts` keeps its type and holds the three simplified entries only (ids from the module, `geo` all four). "Full description" is not an entry: it is a static option with value `''`, because its identity is `templateId === undefined` (OD-5, AC-6). Rejected: giving Full an id such as `'full'` (would enter the `CONTENT_TEMPLATES.find` branch in `task-a.ts` and break byte identity).

### D2. Prompt builders (FR-3..FR-7, FR-9..FR-13, FR-15, NFR-1, NFR-6)

**Doc pipeline, `src/prompts/task-a-doc.ts` (not frozen).** `buildPromptADoc` currently calls the frozen `buildPromptA` and replaces `systemBlocks[1]` with `TASK_A_DOC_INSTRUCTION`. New behaviour, only when `isSimplifiedTemplateId(input.templateId)`:

- Call the base with `{ ...input, templateId: undefined }` so the frozen builder's legacy template branch never double-instructs the Doc path.
- Replace `systemBlocks[1]` with a per-template instruction built by a new function `buildSimplifiedDocInstruction(templateId)` (fixed string per template, 3 variants, `cache: true`). It states the paragraph set, the v4 ranges per included paragraph, "no §3/§6/§9 content" where excluded, single-`<tbody>` §7 with no `<h3>`/category row (FR-8, D2 of the Story) and one category item in `specs.categories`, the 5500 soft ceiling with "v4 ranges take absolute priority, exceed the ceiling rather than break a range" and the exact narrative definition (FR-15), and the v4 limits replacing every legacy consumables limit (FR-13).
- Dynamic, per-run facts ride in `userContent` (appended, never in a cached block): whether `input.specs` is empty (omit §7), the Accessories `includeFunctionality` flag (§3 only when true), and "emit §5 only if the source contains compatibility data".
- With `templateId` undefined the function returns exactly what it returns today: byte identity (FR-6, NFR-6). A golden snapshot of the pre-Story output is captured **before** any edit (first task in the breakdown), and asserted afterwards.

Caching consequence (NFR-1, AGENTS.md §3): `systemBlocks` stay separate from `userContent`; `PromptPayload` shape is unchanged. The system block differs per template (four stable variants, each cacheable); per-run data (specs emptiness, checkbox, hook pattern) stays in uncached `userContent`. Master block `[0]` and any store overlay `[2+]` are untouched.

**Legacy HTML path, `src/prompts/task-a.ts` (FROZEN, OD-9).** Edit limited to: remove `isConsumables`, the consumables reinforcement and `CONSUMABLES_SIMPLIFIED_SCHEMA` use; when `isSimplifiedTemplateId`, skip the `CONTENT_TEMPLATES` hint (as consumables did) and append `buildSimplifiedHtmlOverlay(templateId, {includeFunctionality, hasSpecs})` to `userContent`. `systemBlocks` are not touched. The overlay is generated by a new sibling `src/prompts/simplified-template-blocks.ts` (holds both the Doc instruction and the HTML overlay text, so the frozen file gains one import and one call). Undefined `templateId` with no `customTemplate` produces the same bytes as before (verified by golden).

**Translation.** `src/prompts/task-translate.ts` (Doc): `buildTranslatePrompt` gains an optional trailing `templateId`; only for simplified ids it appends the FR-19 clause (translate only fields present in the master document, do not add, re-add or expand omitted paragraphs, no length limits). No template → unchanged bytes. `src/prompts/task-c.ts` (FROZEN, OD-9): delete the `CONSUMABLES_TRANSLATION_OVERLAY` append; replace with the same clause from the sibling when the id is simplified. `CONSUMABLES_TRANSLATION_OVERLAY` and `CONSUMABLES_SIMPLIFIED_SCHEMA` are removed from `constants.ts` together with all other consumables text (D10).

### D3. Domain model (FR-17, FR-18) — `src/domain/description-doc.schema.ts`, `description-doc.ts`

- `hook`, `cta` stay required. `killerSpecs`, `keyBenefits`, `functionality`, `applications`, `specs`, `faq` (and already-optional `compatibility`, `packageContents`) become `.optional()` (null accepted where the existing convention accepts it, so "omitted or null" both validate). Array bounds stay (`applications.items` 4–8 etc.) and apply whenever the parent is present (OD-13c).
- Every `superRefine` callback that reads a now-optional field early-returns/skips when it is undefined or null. The hand-maintained TS type `ProductDescriptionDoc` is made optional in lockstep (the schema cannot infer it; see the comment near L226), so `npm run lint` flags every non-null-safe consumer.
- **Compatibility of stored artifacts / corpus:** the change only widens. Every existing all-paragraph document (the two `test/fixtures/corpus/` items, `test/fixtures/v4-docs.ts` builders) validates unchanged; no fixture is regenerated. New simplified-shape fixtures are added through the `v4-docs.ts` factory (new files, not edits to accepted artifacts).
- **Full-description completeness (impact-analysis unknown 1, silent risk 2).** Widening the shared schema means a Full response missing §3 or §9 would validate. Decision: keep one schema and add a **sibling gate**, `src/domain/description-doc.completeness.ts`, exporting `validateTemplateCompleteness(doc, templateId, {includeFunctionality, hasSpecs})`. For `templateId === undefined` it returns an `error` issue per missing paragraph of 1–9 (with the existing §5 and §6 conditionals excepted as they are optional in Full today: only the paragraphs mandatory before this Story are required: §2, §3, §4, §7, §9 as applicable to the pre-Story schema). For a simplified id it errors on a missing paragraph the template requires and emits a `warning` (`template-excluded-paragraph`) for a stray excluded one (FR-3..FR-5 leave stray output unspecified; no silent stripping is invented). It also carries the FR-8 shape rule for simplified ids (`simplified-specs-shape`, see D4b). It is wired into the Doc gate `validate` closure in the orchestrator, so the standard repair/retry path handles it. Rejected: a discriminated-union schema (two schemas to keep in agreement; the human resolved on one schema, OD-2).

### D4. Renderer (FR-8, FR-18) (v2) — `src/render/render-description.ts`

- Skip absent paragraphs: no markup, heading or placeholder, and no throw for any combination (FR-18). The §1/§8-only case (Spare parts without §5) renders hook + CTA.
- Flat §7: `renderDescription` gains an optional third argument `opts?: { flatSpecs?: boolean }`, set by the orchestrator when `isSimplifiedTemplateId`. With it, the single category's rows render in one `<tbody>` with no `<h3>` and no category title row (OD-13b); without it (Full) output is byte-identical to today. Behaviour with several categories (v2): `flatSpecs` is total and lossless, never throws, and never drops rows: it concatenates the rows of all categories, in order, into the one `<tbody>` and still emits no `<h3>` and no title row. This is defensive only; a multi-category simplified Doc is rejected by the D4b gate before rendering on the pipeline path, so this output is a fallback shape, not an accepted one. Rejected: inferring flat output from `categories.length === 1` (would change Full documents that legitimately have one category and break byte reconciliation).
- The §7 `table-responsive` / `table table-bordered table-striped` markup is reused unchanged, so `table-finalize.ts` and the AGENTS.md §4 unit-spacing rules keep applying; a test asserts they survive finalization of a flat table.
- `RenderContext` helpers shared with `render-consumables.ts` are re-homed into `render-description.ts` (or a small `render-shared.ts` sibling) before the consumables renderer is deleted.

### D4b. FR-8 failure path: where a non-flat §7 is rejected (v2)

FR-8 requires that a Filaments or Accessories output with more than one category, a second `<tbody>`, an `<h3>` in §7 or a category title row fails validation. Spare parts has no §7 (covered by "absent §7" in D3). Enforcement is deterministic, `error` severity (so the standard repair/retry path fires), simplified templates only (Full skips), on both paths:

- **Doc path (pipeline stores):** rule `simplified-specs-shape` in `validateTemplateCompleteness` (`description-doc.completeness.ts`), run inside the Doc gate `validate` closure before rendering. When `doc.specs` is present and the id is simplified, `specs.categories.length !== 1` is an error at path `specs.categories` with detail "exactly one category, no headings", so the repair prompt can act on it. A `<tbody>`, `<h3>` or title row cannot exist in the Doc model (they are renderer output, and `flatSpecs` never emits them), so the single-category rule is the Doc-level equivalent; the one category's title text is not rendered and needs no rule. Empty `categories` with a present `specs` is also an error.
- **Legacy HTML path (`Expert-3DPrinter`) and the final HTML pass:** new sibling `src/utils/simplified-specs-shape.ts` exporting `validateSimplifiedSpecsShapeHtml(html, templateId, label)`. It locates §7 with `parseSpecCategories` (`spec-category-merge.ts`, reused) and errors when the §7 region has more than one `<tbody>`, any `<h3>`, more than one parsed category, or a category title row (the row shape the pre-flat renderer emits; a unit test pins it against that output). It runs for all locales, since structure is locale-independent. It is invoked through the single frozen-file call: `simplified-word-ranges.ts` exports `validateSimplifiedTemplateHtml(html, templateId, locale, label)`, which composes the range check (D5) and this shape check, so `output-validator.ts` still gains one call (D5, D9).
- The D6 `spec-category-shape` collapse skip stays: a flat single category would otherwise fire its "3 categories" guard. D4b is the replacement invariant for simplified templates (exactly one).
- Tests (`test:logic`): a Filaments or Accessories Doc with two categories fails; an HTML fixture with two `<tbody>`, one with an `<h3>`, and one with a title row each fail; a valid flat table passes on both paths; Full multi-category §7 is untouched.

### D5. Validator and word ranges (FR-14, FR-16, OD-11, OD-15) — FROZEN `output-validator.ts`

Logic lives in a new sibling `src/utils/simplified-word-ranges.ts` (imports only the `ValidationIssue` type, mirroring `image-manifest-coverage.ts` / `spec-category-shape.ts`), with **two entry points over one range table and one `countWords`**:

- `validateSimplifiedRangesDoc(doc, templateId, localeIso, label)`: called in the Doc-pipeline gate `validate` closure (validation happens on the Doc before rendering, so violations reach the repair loop with field paths).
- `validateSimplifiedRangesHtml(html, templateId, locale, label)`: locates paragraphs by the v4 heading/`<p>` shape, used by the legacy path and by the final pass.

Semantics, per OD-11/OD-15: master locale only (`uk-UA`; translated locales skip); simplified templates only (Full skips); each **present** paragraph checked against both min and max; a violation is an `error` (so the standard validator retry/repair path fires, "standard validator retry", OD-15), at any total length. Paragraph 2 is the whole §2 block: `killerSpecs` + `keyBenefits` merged list words counted together against 90–300 and item count ≤ 8 (impact unknown 6). FAQ 150–400 is encoded but never fires for simplified templates (no §9 requested). The 5500 soft ceiling produces no issue at all in the validator (FR-16); the narrative count is only used by an optional `info`-level note, or not at all. Any per-paragraph range hit is described in the issue `detail` with actual vs allowed words, to steer the retry.

`output-validator.ts` edit (approved, OD-9), kept to three changes: delete the `consumables-char-limit` gate and its constants/exports (`CONSUMABLES_CHAR_LIMIT`, `strippedVisibleLength` if only consumables use them, verified by grep), replace the `templateId === 'consumables-resin'` branch with one call to `validateSimplifiedTemplateHtml` (ranges plus the D4b shape check), and nothing else. Because the Doc path and the final HTML pass could disagree, one shared fixture set runs both entry points and asserts identical verdicts (V6).

### D6. Downstream utilities (FR-11, FR-21, hazard 3)

- `spec-category-shape.ts` (`…Doc` and HTML variants): re-express the old consumables carve-out as "simplified template → skip the multi-category collapse check" (a single flat category is correct there). Full behaviour unchanged. The inverse invariant (exactly one category) is enforced by D4b, not here (v2).
- `spec-count-parity.ts`: run only when §7 is present; with `hasSpecs === false` and an absent `doc.specs`, the check is a no-op (FR-11, FR-21). A specs table or heading present for empty input specs is flagged by the completeness gate (D3).
- Optional-field null-safety pass over every reader of Doc fields: `doc-block-repair`, `doc-tier`, `heading-style`, `sentence-length`, `tov-second-person`, `bullet-lead-punctuation`, `alt-numeric-fidelity`, `video-manifest`, `specs-grounding`, `doc-prose-transforms`, `doc-schema-issues` (its L189 consumables mention removed), `repair-strategy` (L328 mention removed). `npm run lint` enforces most; each walker also gets a runtime "absent paragraph" test, mandatory per file (v2, N2).
- `structural-parity`, `spec-category-merge`, `legacy-specs-wrap`, `translation-integrity`, `llm-output-integrity`, `image-manifest-coverage`: re-verified, not redesigned. Parity compares master and translation, and both omit the same paragraphs, so no restore should fire; a test with an omitted-§3/§6/§9 master pins it (FR-19, silent risk 4).
- Images and videos (FR-22, FR-23, silent risk 11): the prompt instructs placing figures and video embeds only inside paragraphs that are present; the existing coverage validators (`validateImageManifestCoverageDoc`, `validateVideoCoverageDoc`) run for simplified templates, and consumables' old video opt-out is deleted. A Spare-parts test (only §1/§5/§8) proves a figure and an iframe survive.

### D6b. Orchestrator and routing (FR-7, FR-20) — `content-orchestrator.service.ts`

Delete `ConsumablesDocAttempt`, `produceTaskAConsumablesDoc`, `runConsumablesDocGate`, both `isConsumables` sites and their effects (video opt-out, `repairBudget = 2`, trim, validator branch), both pipeline ladders' consumables arms, the `'…consumables-doc'` pipeline labels and the imports. `usesDocPipeline()` loses its `consumables-resin` exclusion (`doc-pipeline-flag.ts`), so simplified templates route to the Doc pipeline for the six `DOC_PIPELINE_STORES` and stay on the legacy path for `Expert-3DPrinter` (FR-7). `CONSUMABLES_DOC_PIPELINE_ENABLED` and `usesConsumablesDocPipeline` are deleted. The orchestrator threads `templateId` and the new `includeFunctionality` flag into both paths, passes `flatSpecs` to the renderer, wires `validateTemplateCompleteness` and `validateSimplifiedRangesDoc` into the Doc gate, and passes `templateId` into `buildTranslatePrompt`. The `llm.service.ts` pipeline literal becomes `'doc' | 'html'`.

Interim behaviour and merge unit (v2, N1/N4): between the schema widening and the gate wiring a Full description missing §3/§9 can validate, and between the `usesDocPipeline` change and gate wiring a simplified id routes to a Doc gate without the range, shape and completeness rules. The schema widening, completeness gate and gate wiring are one merge unit; none ships alone. On the feature branch the window is accepted.

Decision on FAQ (impact unknown 2): the FAQ **artifact** step (`buildPromptFaq`, "Step 5") is a separate schema-free Journal-theme module, not description §9. Neither Story nor spec suppresses it, so its behaviour is deliberately unchanged for all templates. Recorded as risk R6, non-blocking; if the human wants it suppressed for simplified templates it is a new Open Decision, not a plan assumption.

### D7. Angular surface (FR-1, FR-2, FR-9, OD-6) (v2)

- New standalone component `src/app/components/content-template-select/content-template-select.component.ts` (signals `input()`/`output()`, `inject()` not needed, OnPush): renders the four options in order (static Full `''`, then `CONTENT_TEMPLATES`), no empty "Select Template..." option, labels from an `uiLabels`-style map. It is used by both forms (Generator L205-209 and SEO-only L444-449), removing the duplicated markup and making the DOM testable in the component runner, following the `model-settings` precedent. Inputs: `value`, `labels`, `showFunctionalityToggle`, `functionalityChecked`; outputs `templateChange`, `functionalityChange`.
- Label location (v2, B1): `TRANSLATIONS`/`uiLabels` is a private const in `app.component.ts` and cannot be imported by plain vitest. Decision: extract **only the template labels** into a new pure module `src/app/content-template-labels.ts` (no Angular imports; exports `TEMPLATE_LABEL_KEYS` and `TEMPLATE_LABELS: { en: Record<TemplateLabelKey, string>; uk: Record<TemplateLabelKey, string> }`, language keys matching `uiLanguage`'s `'en' | 'uk'`). `app.component.ts` spreads `...TEMPLATE_LABELS.en` / `.uk` into the two `TRANSLATIONS` entries, so `uiLabels()` exposes the same keys and the rest of the map is not moved. Its spec `src/app/content-template-labels.spec.ts` runs under `test:logic` (matches `src/**/*.spec.ts`, not `*.component.spec.ts`), asserts every key is a non-empty string in both languages, the key sets are equal, and pins the FR-2 strings; the `Record<TemplateLabelKey, string>` annotation also makes a missing key a build error (FR-2 failure path). Rejected: moving all of `TRANSLATIONS` (large unrelated diff) and asserting in the component runner (heavy DI, no existing `AppComponent` spec).
- Labels: `uiLabels` EN/UA gain `templateFull`, `templateFilaments`, `templateAccessories`, `templateSpareParts`, `includeFunctionality` (EN "Include Functionality (§3)", UA "Додати блок Функціональність (§3)"); `consumablesTemplateName` is deleted. EN "Full description", "Filaments, resins, powders", "Accessories", "Spare parts"; UA "Повний опис", "Філаменти, смоли, порошки", "Аксесуари", "Запчастини" (FR-2; OD-10 open, the spec's rendered strings are used). The keys are defined in `content-template-labels.ts` and tested there (above).
- State: `selectedTemplateId` signal default `''` (Full) stays; add `includeAccessoriesFunctionality = signal(false)` (OD-6: default unchecked, not persisted: the saved `seo_gen_form_state` does not contain the template, so nothing is added there). `onTemplateChange` resets the flag to `false` on any change and preserves the current `showCustomTemplate` behaviour for Full (`''` ⇒ Customize handling exactly as the old empty selection, OD-5). The checkbox shows only in the Generator form when the id is `accessories`; the SEO-only form never shows it and its input builder never sets the flag. `ProductInput` gains `includeFunctionality?: boolean`, honoured by builders only when `templateId === 'accessories'` (a stale `true` for another template is ignored, silent risk 9). Ordering constraint (v2, N3): `CONTENT_TEMPLATES` (still read by frozen `task-a.ts` until its edit) and `consumablesTemplateName` change only after the `task-a.ts`/`task-c.ts` edits land, so the UI never offers ids the legacy builder cannot handle; the dropdown work is ordered after the frozen prompt edits. Plumbing at app.component.ts L885 (Generator) keeps `|| undefined`; L919 (SEO-only) unchanged apart from the type.
- No RxJS is introduced.

### D8. Server surface (`server/`)

No schema change. `server/usage/store.js` only has a comment listing `'consumables-doc'`; it is updated. `pipeline` is a free TEXT column and no migration is needed or attempted. Historical rows in existing `data/usage.db` may still hold `'consumables-doc'`; they are intentionally left untouched (append-only usage log), and no consumer switches on the value (verified by grep in the breakdown; `test/usage-store.spec.ts` and `test/llm-routes.spec.ts` contain no consumables assertion).

### D9. FROZEN-file position (AGENTS.md §9, NFR-7)

Three frozen files are edited: `src/prompts/task-a.ts`, `src/prompts/task-c.ts`, `src/utils/output-validator.ts`. The human approval is recorded as OD-9 (2026-09-21, explicit, per file). This plan does not grant it: at implementation the §9 stop is still performed per file (state exactly what changes, then proceed under the recorded approval) and `.arch-guard-checksums` is re-baselined afterwards (check `git diff` on the three files, since the baseline is chronically stale). To keep each frozen edit minimal the plan uses the **sibling-file pattern**: all new logic is in `simplified-templates.ts`, `simplified-template-blocks.ts` and `simplified-word-ranges.ts`; the frozen files gain only an import, one call, and deletions. `task-b.ts` and `master-system-prompt.ts` are **not** edited by this plan (no FR requires it); needing either would be a new §9 stop with no approval.

### D10. Legacy consumables removal (FR-20, OD-2, OD-14)

Delete the files enumerated by the impact analysis (domain, schema and spec; `task-a-consumables-doc.ts` and spec; `render-consumables.ts`; `consumables-prose-transforms` and spec; `consumables-trim.ts`; `consumables-bullet-lead-punctuation` and spec; the orchestrator doc-gate spec; `test/render-reconciliation-consumables.spec.ts`; `test/fixtures/consumables/`, `test/fixtures/consumables-corpus/`) and the scaffold pin tests in `test/tools/scaffold-doc.spec.ts`. Purge consumables text/notes from `constants.ts` (`CONSUMABLES_SIMPLIFIED_SCHEMA`, `CONSUMABLES_TRANSLATION_OVERLAY`, `CONSUMABLES MODE (§C1-§C6)` notes, C3D ToV overlay notes). The generic trust-point sentence at `master-system-prompt.ts` L365-368 is not the consumables template and is left alone. Completion criterion: a repository-wide grep for `consumables-resin`, `CONSUMABLES_`, `consumables-doc`, `ConsumablesDoc`, `render-consumables`, `usesConsumablesDocPipeline` returns nothing under `src`, `test`, `server` (docs and archived stories excluded). Deletion of these tests is authorised by OD-14 and is not test-weakening; every other pre-existing test that mentions consumables is **rewritten to assert the new behaviour**, never skipped (§7.7).

### D11. Prompt → schema → renderer → validator agreement

| Link | Reads from `simplified-templates.ts` | Agreement mechanism |
|---|---|---|
| Prompt (Doc + HTML) | paragraph set, ranges, ceiling | builders take text from the module; unit tests assert each excluded section is absent from the built prompt |
| Schema | n/a (optionality is static) | required set is exactly {hook, cta}; completeness gate enforces the per-template required set |
| Renderer | `flatSpecs` from `isSimplifiedTemplateId` | renders whatever is present; simplified fixtures per template rendered and validated |
| Validator | `V4_WORD_RANGES`, `countWords` | Doc and HTML entry points share one table; parity test V6 |

A consistency test iterates all four templates and checks: every paragraph the prompt requests can be produced by a schema-valid doc, and the render of that doc passes the validator with zero errors.

AGENTS.md §4 criteria the renderer/validator must keep satisfying (enforced by existing `validateGeneratedHtml` rules plus the Doc siblings): number–unit spacing and spec-count parity (`spec-count-parity.ts`), `<figure>`/`<figcaption>`/`loading`/`decoding` rules (`image-figure.ts`, `image-manifest-coverage.ts`, render), video survival (`video-manifest.ts`, `validateVideoCoverageDoc`), meta fields ≤55/≤155 with no currency (`task-b.ts`, untouched, `meta-description-currency` disarmed), forbidden `schema.org/Product` itemtype, HTML only, `<hr>` after `</section>` (renderer). FR-21..FR-25 are constraints, verified by running the conformance suite over simplified fixtures.

### D12. Retrieval, providers, locales (NFR-2..NFR-5)

No retrieval or provider code is touched (Rule 1, Rule 2). Locale gating in the validator uses the master locale constant already in the codebase (`UA_ISO`), and no locale list or currency symbol is introduced; store scope comes from `STORE_REGISTRY` / `DOC_PIPELINE_STORES` unchanged. Nothing new reaches the browser bundle beyond static template ids and labels (Rule 4).

### D13. OD-8 / OD-10 handling

Both open, non-blocking. OD-8: the prompt follows the Story decisions (D1/D2/D7/D8: checkbox, single table, data-conditional §7) wherever v4 text conflicts, and the instruction text records that in comments citing OD-8. OD-10: rendered labels are the spec's FR-2 strings; if the human later picks the other wording it is a one-key change in the label map.

### D14. Persisted `templateId: 'consumables-resin'` (impact unknown 3)

Grepped: `templateId` is only set from the `selectedTemplateId` signal (app.component.ts L815/885/919); `seo_gen_form_state` does not store it and no history restore reads it. There is therefore no persisted source of the stale id. Defence in depth: `isSimplifiedTemplateId` returns false for unknown ids, so an unexpected id degrades to Full behaviour rather than throwing. No migration.

## Files to create / modify

Derived from the impact analysis, not re-surveyed.

**Create**
- `src/prompt-core/simplified-templates.ts` — registry, paragraph sets, ranges, `countWords`.
- `src/prompts/simplified-template-blocks.ts` — Doc instruction per template, HTML overlay, translation clause.
- `src/utils/simplified-word-ranges.ts` — Doc and HTML range validators.
- `src/domain/description-doc.completeness.ts` — Full and per-template completeness gate.
- `src/app/components/content-template-select/content-template-select.component.ts` (+ template) — shared dropdown and checkbox.
- `src/app/content-template-labels.ts` — pure template label map (v2, B1).
- `src/utils/simplified-specs-shape.ts` — HTML §7 shape check (v2, B2).
- New spec files beside each (including `content-template-labels.spec.ts` and `simplified-specs-shape.spec.ts`), plus simplified-shape fixtures added through `test/fixtures/v4-docs.ts`.

**Modify (not frozen)**
- `src/app/types.ts` (`CONTENT_TEMPLATES`, `ProductInput.includeFunctionality`), `src/app/app.component.html` (both dropdowns use the new component), `src/app/app.component.ts` (labels, signal, handler, plumbing).
- `src/prompts/task-a-doc.ts`, `src/prompts/task-translate.ts`, `src/prompt-core/constants.ts` (consumables text removed), `src/prompt-core/doc-pipeline-flag.ts`.
- `src/domain/description-doc.schema.ts`, `src/domain/description-doc.ts`.
- `src/render/render-description.ts`, `doc-schema-issues.ts`, `doc-prose-transforms.ts`.
- `src/utils/spec-category-shape.ts`, `spec-count-parity.ts`, `repair-strategy.ts` and the null-safety list in D6.
- `src/services/content-orchestrator.service.ts`, `src/services/llm.service.ts`, `server/usage/store.js` (comment), `.arch-guard-checksums` (re-baseline).
- Existing specs listed in the impact analysis are rewritten to the new behaviour.

**Modify (FROZEN, OD-9, §9 stop applies)**
- `src/prompts/task-a.ts`, `src/prompts/task-c.ts`, `src/utils/output-validator.ts`.

**Delete** — the D10 list.

## Validation strategy

| Category | What is proven | Runner |
|---|---|---|
| Golden byte identity | Full description prompts (Doc `buildPromptADoc`, legacy `buildPromptA`, `buildTranslatePrompt`, `buildPromptC`) byte-equal to goldens captured before any edit (FR-6, NFR-6) | `test:logic` |
| Prompt content per template | included paragraphs requested, excluded absent, §5/§7 conditionals, checkbox on/off, ranges, 5500 statement and priority sentence, no legacy limits (FR-3..5, 9..13, 15) for both builders | `test:logic` |
| Schema | omit/null each optional paragraph, reject missing §1 or §8, bounds when present, Full docs still valid, corpus fixtures still parse (FR-17) | `test:logic` |
| Completeness gate | Full missing §3/§9 errors; per-template required/stray behaviour (D3) | `test:logic` |
| Renderer | every absent-paragraph combination no-throw, no stray markup; flat §7 one `<tbody>`, no `<h3>`, no title row; Full output unchanged (FR-8, FR-18) | `test:logic` |
| Corpus | `render-reconciliation` stays byte-stable; `render-conformance{,.v4}` run over new simplified fixtures (no accepted simplified artifact exists; rules-based only, recorded as a coverage gap) | `test:logic` |
| Validator ranges | each range min/max, 4000-char doc with 120-word hook rejected, >5500 chars within ranges accepted, non-uk-UA and Full skipped, Doc/HTML parity (FR-14, FR-16) | `test:logic` |
| Translation | prompt clause; master omissions survive structural-parity/merge/restore utilities (FR-19) | `test:logic` |
| Routing / orchestrator | simplified ids route to Doc for Doc stores and legacy for `Expert-3DPrinter`; both paths honour the template (FR-7); Doc-gate wiring | `test:logic` |
| Media survival | figure and iframe survive in Spare parts and Filaments (FR-22, FR-23) | `test:logic` |
| Removal | repo-wide reference check for the D10 tokens (FR-20) | `test:logic` |
| Label completeness | `content-template-labels.spec.ts`: five keys present, non-empty, equal sets in EN and UK, FR-2 strings pinned (FR-2) | `test:logic` |
| Flat §7 enforcement | multi-category Doc, second `<tbody>`, `<h3>`, title row each fail; flat table passes; Doc and HTML paths agree (FR-8) | `test:logic` |
| Dropdown/checkbox DOM | option order, no empty option, default Full, checkbox only for Accessories in the Generator, absent in SEO-only, reset on template change (FR-1, FR-9) | `test:components` (`ng test`) |
| Gate | lint, both runners, coverage, build, `bash arch-guard.sh` after re-baseline | so-gate-enforcer |

## Risks

| # | Risk | How it surfaces |
|---|---|---|
| R1 | Full byte identity broken by an accidental edit | golden test fails |
| R2 | Schema widening lets Full omit paragraphs | completeness gate test; would otherwise be silent |
| R3 | Doc and HTML validators disagree on a paragraph boundary | V6 parity test; final-pass errors that the gate did not raise |
| R4 | Live model cannot satisfy both the 5500 soft ceiling and v4 ranges, causing retry loops | repair-attempt counts in the usage log; the prompt states ranges win. Not verifiable statically |
| R5 | Legacy path only gets a user-turn overlay, weaker than a system-block rewrite, so `Expert-3DPrinter` may emit extra paragraphs | overlay tests only prove the text; the completeness/range checks are HTML-based for legacy, stray paragraphs would surface as warnings. Accepted trade-off to keep `systemBlocks` (cache) untouched |
| R6 | FAQ artifact step still runs for simplified templates | visible FAQ tabs; **to be surfaced to the human at HUMAN_PLAN_APPROVAL as a possible new Open Decision** (v2, N7) |
| R7 | Stray excluded paragraph in model output is only a warning | rendered output contains it; spec leaves this unspecified |
| R8 | Simplified templates have no accepted artifact fixture | conformance only; recorded coverage gap |
| R9 | `arch-guard.sh` baseline stale-prone | diff the three frozen files, not only the guard |
| R10 | Component extraction enlarges `app.component.html` diff | component test plus manual UI check |

## Rejected alternatives

1. **Keep a separate simplified pipeline/schema** (extend consumables): contradicts OD-2/OD-14 and the reconciliation report; two models to keep aligned.
2. **Discriminated-union schema per template**: multiplies schemas and forces renderer switches; the human chose one schema with optional paragraphs.
3. **Give Full description an id (`'full'`)**: breaks FR-6 (see D1).
4. **Add a fourth system block per template**: changes block layout and the caching prefix contract; replacing `[1]` on the Doc path (existing pattern) and a user-turn overlay on the legacy path avoid that.
5. **Put range logic inline in `output-validator.ts`**: enlarges the frozen-file edit; sibling file follows the `image-manifest-coverage.ts` precedent.
6. **Doc-only or HTML-only range check**: Doc-only misses the legacy path; HTML-only misses the repair loop's field paths on the Doc path.
7. **Infer flat §7 from `categories.length === 1`**: alters Full output.
8. **Strip stray excluded paragraphs deterministically**: invents unspecified behaviour (FR-3 failure path).
9. **Test the dropdown through `AppComponent`**: heavy DI, no existing spec; extraction gives a cheap component test.

## Traceability

| Requirement | Design decision / file |
|---|---|
| FR-1, FR-2 | D7 (`content-template-select`, `content-template-labels.ts`, `types.ts`); D1 |
| FR-3, FR-4, FR-5 | D1 `paragraphsFor`, D2 (Doc instruction, HTML overlay), D3 stray-warning |
| FR-6 | D1 (Full = undefined), D2 golden, D4 flat only via option |
| FR-7 | D2, D6b routing, `doc-pipeline-flag.ts` |
| FR-8 | D2 instruction, D4 `flatSpecs`, **D4b enforcement (Doc gate rule + `simplified-specs-shape.ts`)**, D6 `spec-category-shape` skip |
| FR-9 | D7 checkbox and `includeFunctionality`, D2 userContent flag |
| FR-10, FR-11 | D2 conditional userContent, D6 `spec-count-parity` |
| FR-12 | D2 instruction, existing `validateGeneratedHtml` rules (D11) |
| FR-13 | D1 `V4_WORD_RANGES`, D2, D10 (legacy limits deleted) |
| FR-14, FR-16 | D5 `simplified-word-ranges.ts`, `output-validator.ts` call |
| FR-15 | D1 `NARRATIVE_SOFT_CEILING`, D2 statement |
| FR-17 | D3 |
| FR-18 | D4, D6 null-safety |
| FR-19 | D2 translation, D6 parity utilities |
| FR-20 | D10, D6b, D8 |
| FR-21..FR-25 | D6 (media, spec count), D11 (§4 list), D12 |
| NFR-1, NFR-6 | D2 caching and determinism |
| NFR-2..NFR-5 | D12 |
| NFR-7 | D9 |
