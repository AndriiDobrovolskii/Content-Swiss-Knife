---
artifact: open_decisions
story: US-2.2
version: 3
status: ARCHIVED
owner: so-clarifier
created_at: 2026-09-21T13:45:00Z
updated_at: 2026-09-21T16:00:00Z
supersedes: docs/decisions/US-2.2-open-decisions.md#2
inputs_consumed:
  - key: story
    version: 1
  - key: open_decisions
    version: 2
  - key: clarification_report
    version: 2
open_decisions_blocking: false
---

# US-2.2 — Open Decisions

This is the **v3 revision** (CLARIFICATION attempt 3). v3 records the human Resolutions of OD-11..OD-14 verbatim and adds OD-15 (non-blocking). (v2 text follows.) The Story's own "Open questions" section
says "None outstanding", and D1-D8 are recorded as human answers (2026-09-21); they are inputs and
are not re-asked. v1 recorded OD-1..OD-10, with OD-1..OD-4 blocking. On 2026-09-21 the human
resolved OD-1..OD-4 and approved OD-9; those `**Resolution (human, 2026-09-21)**` entries are kept
verbatim below and were not evaluated or rewritten by this skill. OD-5..OD-8 and OD-10 are carried
forward unchanged and still open (non-blocking). This run adds OD-11..OD-14, which arise from
checking the Resolutions against the Story's ACs and the codebase. No Open Decision has been
answered by this skill.

v3 note: OD-11 (AC-16 wins) and OD-12..OD-14 carry human Resolutions dated 2026-09-21; they were kept
verbatim and not second-guessed. No blocking Open Decision remains.

Blocking summary: OD-1..OD-4 and OD-11 were blocking and are resolved by the human (2026-09-21); OD-11
supersedes the OD-3 rejection wording. OD-12..OD-14 and OD-9 are resolved. OD-5..OD-8 and OD-10 are
`blocking: false`. No blocking Open Decision remains.

---

## OD-1 — Which generation paths must implement the four templates?
- **Question:** Do AC-3..AC-9 and AC-15 apply to the Doc pipeline (`task-a-doc.ts` /
  `ProductDescriptionDoc`) only, or also to the legacy HTML path (`task-a.ts`) that stores outside
  the Doc pipeline use?
- **Why it cannot be inferred:** The Story says "the built prompt" without naming one. Checked
  `src/prompt-core/doc-pipeline-flag.ts`: `DOC_PIPELINE_STORES` enrols every live store except
  `Expert-3DPrinter` (empty `imageBaseUrl`), which therefore takes the HTML path. The Story's Scope
  says "all of `STORE_REGISTRY`" and its Surface lists `task-a.ts`, but not `task-a-doc.ts`.
- **Impact if unresolved:** The spec writer must guess which prompt builders carry the per-template
  paragraph lists. A wrong guess leaves one path emitting all nine paragraphs (AC-3..5 false for
  that store), or forces edits to the FROZEN `task-a.ts` that were not required.
- **Resolution (human, 2026-09-21):** The template rules (omitting paragraphs by dropdown choice) apply to BOTH generation paths. Both prompt builders, `task-a.ts` (legacy HTML path, used for Expert-3DPrinter) and `task-a-doc.ts` (Doc pipeline), must check `templateId` and request only the paragraphs the selected simplified schema requires.
- **blocking:** false (was true; resolved)

## OD-2 — What replaces the consumables doc pipeline, and how much of it is removed?
- **Question:** AC-13 deletes four named items (`consumables-resin`, `CONSUMABLES_SIMPLIFIED_SCHEMA`,
  `CONSUMABLES_TRANSLATION_OVERLAY`, `task-a-consumables-doc.ts`). What happens to the rest of the
  consumables machinery, and which document model, schema and renderer now produce the Filaments
  and Accessories output?
- **Why it cannot be inferred:** Grep found further consumables-only code that the Story does not
  list: `src/domain/consumables-doc.ts` and `consumables-doc.schema.ts` (+ spec),
  `src/render/render-consumables.ts`, `src/render/consumables-prose-transforms.ts`,
  `src/utils/consumables-trim.ts`, `consumables-bullet-lead-punctuation.ts`,
  `usesConsumablesDocPipeline()` and `CONSUMABLES_DOC_PIPELINE_ENABLED`, the
  `content-orchestrator.consumables-doc-gate.spec.ts`, `test/render-reconciliation-consumables.spec.ts`,
  and `test/render-reconciliation.report.md` §3-§5, which records that consumables need their own
  model and that widening `ProductDescriptionDocSchema` to accept them fails fixtures.
  D5 implies the simplified templates now use `ProductDescriptionDocSchema` (paragraphs optional),
  but the Story never says so, and AC-13 ("no source or spec references them") is silent on the
  unlisted files.
- **Impact if unresolved:** The spec writer cannot state what is deleted versus kept, or which
  schema AC-11 governs for the simplified output. Deleting too little leaves dead code that trips
  AC-13's "no references" check; deleting too much removes tests and fixtures that guard the
  renderer. The reconciliation report's finding that `ProductDescriptionDoc` cannot express §C
  shape could invalidate the D5 approach if the v4 simplified output differs in shape.
- **Resolution (human, 2026-09-21):** Delete ALL legacy consumables machinery; the simplified templates need no separate pipeline. Delete `src/domain/consumables-doc.ts`, `consumables-doc.schema.ts`, `src/render/render-consumables.ts`, `src/render/consumables-prose-transforms.ts`, `src/utils/consumables-trim.ts`, `consumables-bullet-lead-punctuation.ts`, and any related test files and fixtures. New architecture: Filaments, Accessories and Spare parts use the standard `ProductDescriptionDocSchema` and the standard renderer. Paragraphs 2, 3, 4, 6, 7 and 9 become `optional` (or nullable) in `ProductDescriptionDocSchema`, and the standard renderer skips undefined/null paragraphs without throwing.
- **blocking:** false (was true; resolved)

## OD-3 — How are AC-14 and AC-16 enforced and measured?
- **Question:** (a) Where is validation of "v4 word range violated" (AC-16) implemented, and which
  ranges are checked (hook 40-85, Killer Specs 90-300, applications 80-250, compatibility 30-100,
  CTA 50-100)? (b) Is the 5500-character ceiling prompt-only, or also checked or trimmed after
  generation? (c) What exactly is "narrative text" — do the §2, §4 and §8 H2 headings, `<b>` lead
  phrases and figcaptions count?
- **Why it cannot be inferred:** Checked `src/utils/output-validator.ts`, `src/domain/*` and
  `src/render/*` for word-range checks: none found for Full description, so AC-16 asks for a
  validator that does not exist. The current consumables gate (`output-validator.ts:391,505`, rule
  `consumables-char-limit`, plus `consumables-trim.ts`) is a HARD error on all stripped visible
  text including the table, which contradicts D8 (soft, narrative only, table excluded).
  US-2.1 OD-9 settled measurement for Full description only.
- **Impact if unresolved:** The spec writer must invent the validator's location (a FROZEN file
  `output-validator.ts` versus schema versus doc-level check), its unit of measurement and its
  severity. AC-16's "not rejected / rejected" cannot be tested without them, and the existing hard
  gate would keep rejecting exactly the documents AC-16 says must pass.
- **Resolution (human, 2026-09-21):** Validation is implemented in `src/utils/output-validator.ts`, replacing the hard-coded `consumables-char-limit` gate. "Narrative text" = all text, headings (H2/H3), lists and inline formatting tags (`<b>`, `<ul>`, etc.) of paragraphs 1, 2, 4, 5 and 8; it STRICTLY EXCLUDES paragraph 7 (Technical Specifications) and all its table markup and content. Logic: measure the narrative text's character length. Only if it exceeds 5500 characters, check the word counts of those paragraphs; reject ONLY if length > 5500 AND the word counts exceed the v4 schema maximums (e.g. Hook > 85 words, CTA > 100 words). If word counts are within v4 limits, the 5500 limit is bypassed (soft ceiling).
- **blocking:** false (was true; resolved)

## OD-4 — Locale scope of the ceiling, and translation of omitted paragraphs
- **Question:** Does the 5500-character ceiling and the paragraph subset apply to uk-UA only (the
  master) or to every translated locale? How must the translation step (`task-c.ts`) treat
  paragraphs the template omits?
- **Why it cannot be inferred:** Story Scope says "all locales; uk-UA is generated natively as the
  master, other locales follow the existing pipeline" but AC-14 and AC-16 name no locale. README
  and `STORE_REGISTRY` give per-store language lists but no per-locale length rule. Translations
  routinely change character counts, and `task-c.ts:127` and `CONSUMABLES_TRANSLATION_OVERLAY`
  currently carry the consumables translation rules that AC-13 deletes.
- **Impact if unresolved:** uk-UA is the master every locale is translated from, so any choice here
  fans out to every store. A ceiling enforced per locale can force a v4 word-range violation in a
  longer language; a ceiling on the master alone leaves translated output unbounded. The
  translation prompt could also re-add §3, §6 or §9.
- **Resolution (human, 2026-09-21):** Length constraints apply ONLY to the master `uk-UA` generation; the 5500-character ceiling and word-range checks are master-locale only. `task-c.ts` (Translation) enforces no length limits. `task-c.ts` MUST preserve the master document's structural omissions (if the master `ProductDescriptionDoc` lacks §3 and §6, the translation prompt translates only the provided fields and MUST NOT invent the missing paragraphs). `CONSUMABLES_TRANSLATION_OVERLAY` is deleted completely.
- **blocking:** false (was true; resolved)

## OD-5 — Identity of "Full description" and what AC-6 compares against
- **Question:** What `templateId` value does "Full description" carry, given the dropdown default is
  now that option and `templateId` is no longer empty? How does the "Customize" panel interact with
  it?
- **Why it cannot be inferred:** Today an empty selection gives `templateId: undefined`
  (`app.component.ts:885,919`), and `task-a.ts:134` branches on
  `input.templateId || input.customTemplate`; `onTemplateChange` hides the Customize panel when the
  value is empty. AC-6 requires a byte-identical prompt to the no-`templateId` case. The Story does
  not say whether Full maps to `undefined` or to a new id, nor whether Customize stays reachable.
- **Impact if unresolved:** A new id such as `full` would send `task-a.ts` into the
  `CONTENT_TEMPLATES.find` branch and break AC-6. The "keep Customize working" out-of-scope line
  cannot be verified.
- **blocking:** false

## OD-6 — Accessories §3 checkbox behaviour
- **Question:** What is the checkbox's default state, does it reset when the template changes, is it
  persisted, and what does the SEO-only form do for Accessories (no checkbox is required there by
  AC-9)?
- **Why it cannot be inferred:** AC-9 fixes visibility (Generator form, Accessories only) and
  prompt effect, and D1 says "a flag the prompt builder reads". The flag's name, its place on
  `ProductInput`, default, and the SEO-only form are unstated. The saved form state
  (`seo_gen_form_state`) does not currently include the template.
- **Impact if unresolved:** Spec writer must guess default (checked or unchecked). That is
  user-visible and decides whether §3 appears by default.
- **blocking:** false

## OD-7 — Spare parts: §5 with no compatibility data, and specs data
- **Question:** For Spare parts (§1, §5, §8), if the source has no compatibility data is the
  description just hook plus CTA? Is source specs data ignored?
- **Why it cannot be inferred:** AC-8 and AC-15 are scoped to Filaments and Accessories only. v4
  says Spare parts §5 is "за наявності даних" (lines 1546-1552), but AC-5 says "requests only
  paragraphs 1, 5 and 8" without the conditional.
- **Impact if unresolved:** AC-5 and AC-8 conflict for Spare parts when data is absent.
- **blocking:** false

## OD-8 — Contradictions inside the v4 simplified schemas
- **Question:** Confirm D2 overrides the v4 text where it conflicts, and how "for complex
  accessories" is decided.
- **Why it cannot be inferred:** In `product_description_schemas_v4_ua.md` the Accessories §7 body
  (line 1341) says each category is a separate H3 and table, while the paragraph list (line 57) says
  "not divided into subheadings". The document also says the simplified rule wins over the general
  one, whereas D3 says v4 wins over the old consumables limits. §3 and §7 for Accessories are
  "for complex ones only", which D1 and AC-15 replace with a checkbox and a data check.
- **Impact if unresolved:** Spec writer must choose which v4 sentence to cite for AC-7 and AC-12.
- **blocking:** false

## OD-9 — FROZEN-file edits are required, not probable
- **Question:** Approval is needed per file for `src/prompts/task-a.ts`, `src/prompts/task-c.ts` and
  `src/utils/output-validator.ts`.
- **Why it cannot be inferred:** The Story says "Probably YES". Checked: `task-a.ts:129-135`,
  `task-c.ts:127` and `output-validator.ts:391,505` all reference `consumables-resin`, so AC-13
  makes editing all three certain. `spec-category-shape.ts` and `doc-pipeline-flag.ts` are not on
  the AGENTS.md §9 list. Per project memory, the arch-guard baseline lags legitimate commits
  (`task-a.ts`, `task-c.ts`), so check the diff before reading a checksum mismatch as a defect.
- **Impact if unresolved:** Implementation would stop at §9 mid-build.
- **Resolution (human, 2026-09-21):** The user explicitly approves the modifications to the FROZEN files `src/prompts/task-a.ts`, `src/prompts/task-c.ts` and `src/utils/output-validator.ts` required to implement US-2.2 (AGENTS.md §9).
- **blocking:** false

## OD-10 — Label and numbering inconsistencies in the Story
- **Question:** Is AC-1's "Filaments/resins/powders" a paraphrase of AC-2's "Filaments, resins,
  powders"? Which is the label?
- **Why it cannot be inferred:** Both are in the Story. Also AC-10 and AC-16 appear out of order,
  and the current single `uiLabels().consumablesTemplateName` key cannot supply four labels.
- **Impact if unresolved:** Tests could assert different strings.
- **blocking:** false

---

## OD-11 — AC-16 versus the OD-3 resolution: when is a v4 word-range violation rejected, and which ranges?
- **Question:** AC-16 says a description that "violates a v4 word range is rejected regardless of
  length". The OD-3 resolution says: measure narrative characters; only if > 5500 check word counts,
  and "reject ONLY if length > 5500 AND the word counts exceed the v4 schema maximums". Which rule
  governs the validator? (a) A description under 5500 characters with a word-range violation (for
  example a 120-word hook) - rejected or accepted? (b) Are v4 MINIMUMS (hook 40, Killer Specs 90,
  applications 80, compatibility 30, CTA 50) checked at all, or maximums only? (c) Which paragraphs
  and which max values are checked? The resolution names only Hook > 85 and CTA > 100 as examples;
  AC-12 and the Story give Killer Specs 90-300, applications 80-250, compatibility 30-100.
- **Why it cannot be inferred:** The two statements are both human-settled and contradict each
  other on case (a): AC-16 rejects at any length, the resolution rejects only above 5500. Checked
  `src/utils/output-validator.ts` and `src/domain/*` for existing word-range checks: none for Full
  description, so no code precedent decides it. The resolution's "e.g." leaves the paragraph set
  open, and it says "maximums" where AC-16 says "range".
- **Impact if unresolved:** The spec writer must choose which of two human statements to honour in
  the rejection rule of a FROZEN validator. A wrong choice either accepts out-of-range hooks that
  AC-16 says must be rejected, or rejects nothing below 5500 characters. AC-16's test cases cannot be
  written until this is fixed.
- **Resolution (human, 2026-09-21):** AC-16 WINS. The v4 word ranges are HARD constraints; the 5500-character ceiling is a SOFT constraint. (a) A 4000-character description with a 120-word hook MUST BE REJECTED: any v4 word-range violation rejects, regardless of total character length. (b) BOTH minimums and maximums are checked and strictly enforced. (c) Ranges validated (if the paragraph is present): Hook 40-85 words, Killer Specs 90-300, Applications 80-250, Compatibility 30-100, CTA 50-100, FAQ 150-400. Logic: if narrative chars > 5500 but ALL paragraphs are strictly within their v4 min/max word limits, the document is ACCEPTED (5500 bypassed). If any paragraph violates its v4 min/max, the document is REJECTED at any total character length. (This supersedes the OD-3 resolution's "reject only if length > 5500 AND word counts exceed maximums" wording.)
- **blocking:** false (was true; resolved)

## OD-12 — Character-counting basis: tags stripped or included?
- **Question:** Is the 5500-character narrative length measured on tag-stripped visible text (AC-14,
  D8: "tags stripped ... all markup excluded") or does it include inline tags, as the OD-3
  resolution's definition of narrative text ("headings, lists and inline formatting tags such as
  `<b>`, `<ul>`") could be read? Does Accessories' optional §3 count toward the ceiling, and do
  figcaptions count?
- **Why it cannot be inferred:** AC-14 says tags are stripped; the OD-3 resolution lists tags as part
  of narrative text without saying whether tag characters or the text they wrap are counted. The
  resolution names paragraphs 1, 2, 4, 5, 8 only, while Accessories may include §3 and Spare parts
  has only 1, 5, 8. Figcaptions and alt text are addressed by neither.
- **Impact if unresolved:** Bases differ by hundreds of characters and change which documents cross
  5500; the validator and the AC-14 prompt wording could measure differently.
- **Resolution (human, 2026-09-21):** Character counting is on TAG-STRIPPED visible text: strip all HTML tags (`<b>`, `<ul>`, `<li>`, `<h2>`, `<h3>`, `<p>`) and count only visible text. Exclusions: paragraph 7 (Technical Specs), figcaptions, alt text and the FAQ module (§9) do NOT count toward the 5500 limit. Paragraph 3 (Functionality, if included for Accessories) DOES count.
- **blocking:** false

## OD-13 — Can `ProductDescriptionDocSchema` express the single-table §7 and the optional §2/§3 groups?
- **Question:** The OD-2 resolution routes Filaments, Accessories and Spare parts through the
  standard `ProductDescriptionDocSchema` and renderer with paragraphs 2, 3, 4, 6, 7, 9 optional.
  (a) Which fields make up "paragraph 2" (`killerSpecs` and `keyBenefits`) and "paragraph 3"
  (`functionality`)? (b) AC-7 requires one `<tbody>` and no `<h3>` category subheadings, but
  `specs.categories` is `min(1)` with a mandatory `title` per category (rendered as a colspan
  category header row): may the simplified output contain category header rows inside the single
  tbody, or none? (c) How must spec-count parity and `spec-category-shape.ts` behave when §7 is
  absent or has no category rows? (d) Do the count bounds (`applications.items` 4-8,
  `killerSpecs` 3-4) still apply when the paragraph is present?
- **Why it cannot be inferred:** Checked `src/domain/description-doc.schema.ts:170-207`: `killerSpecs`,
  `keyBenefits`, `functionality`, `applications` and `specs` are all currently required, and
  `test/render-reconciliation.report.md` §5 item 4 records that a consumables artifact could not be
  expressed as a `ProductDescriptionDoc` because of the mandatory §2a and §7 fields, and that
  widening the schema to accept it fails fixtures. D5 makes 2, 3, 4, 6, 7, 9 optional but is silent
  on the tbody/category question, the bounds, and the cross-field `superRefine` rules (schema lines
  ~247-390) that assume those fields exist.
- **Impact if unresolved:** The spec writer must guess the single-table output shape and the
  per-field optionality. A wrong guess yields either a schema that rejects valid simplified output or
  category rows that contradict AC-7. The reconciliation report's finding is not fully neutralised
  by the OD-2 resolution.
- **Resolution (human, 2026-09-21):** Make the schema adaptable to the simplified structures without breaking Full templates. (a) "Paragraph 2" maps to BOTH `killerSpecs` and `keyBenefits`; "paragraph 3" maps to `functionality`; all optional in `ProductDescriptionDocSchema`. (b) For simplified templates `specs.categories` contains exactly 1 category item; update the renderer (`render-description.ts`): for a simplified template, render that category's items in one `<tbody>` and do NOT render the `<h3>` category subheading or category title row. (c) Array length bounds (e.g. `applications.items` 4-8) still apply when the parent field is present; `superRefine` rules early-return or skip when the target optional fields are undefined/null.
- **blocking:** false

## OD-14 — Unlisted consumables code paths touched by the "delete ALL" resolution
- **Question:** The OD-2 resolution deletes the named files and "any related test files and
  fixtures". Confirm the treatment of items it does not name: `usesConsumablesDocPipeline()` and
  `CONSUMABLES_DOC_PIPELINE_ENABLED` in `doc-pipeline-flag.ts`; the `'consumables-doc'` pipeline
  literal in `llm.service.ts:70`; consumables branches in `content-orchestrator.service.ts`,
  `repair-strategy.ts`, `render-description.ts`, `doc-schema-issues.ts`; consumables text in
  `src/prompt-core/constants.ts` (including the "CONSUMABLES MODE (§C1-§C6)" notes inside shared
  prompt text); `spec-category-shape.ts` / `spec-count-parity.ts`;
  `test/render-reconciliation-consumables.spec.ts`, `test/fixtures/consumables/`, and the tests in
  `test/tools/scaffold-doc.spec.ts` that pin "schema rejects a §C artifact".
- **Why it cannot be inferred:** Grep found consumables references in about 40 files. The resolution
  names six files and a class ("any related"). AC-13 only requires that the four items it names have
  no references. Deleting the scaffold pin tests removes a guard that AGENTS.md §8 item 7 would
  otherwise forbid weakening, so the human's intent for them is needed.
- **Impact if unresolved:** Deleting too little leaves dead code and trips AC-13; deleting guard
  tests without an explicit statement risks a test-weakening finding at review.
- **Resolution (human, 2026-09-21):** Complete eradication of ALL legacy consumables code and tests. Delete the unlisted code: `usesConsumablesDocPipeline()` and `CONSUMABLES_DOC_PIPELINE_ENABLED` in `doc-pipeline-flag.ts`, the `'consumables-doc'` literal in `llm.service.ts`, consumables text/notes in `constants.ts`, and consumables branches in orchestration/repair files. Test deletions explicitly authorized: `test/render-reconciliation-consumables.spec.ts`, `test/fixtures/consumables/`, and the scaffold pin tests in `test/tools/scaffold-doc.spec.ts` that expect the schema to reject a §C artifact. Human states this is NOT test-weakening under AGENTS.md §8: it removes obsolete tests of a deprecated architecture replaced by v4.
- **blocking:** false

## OD-15 — Scope and failure handling of the hard word-range check (new in v3)
- **Question:** (a) Do the OD-11 hard word ranges apply to Full description too, or only to the three
  simplified templates (AC-16 says "a simplified-template description")? (b) Does "rejected" mean the
  existing validator-error, repair and retry path, and how are word counts taken for paragraph 2
  (Killer Specs range 90-300 versus its `keyBenefits` part) and for the FAQ (150-400, excluded from the
  5500 count by OD-12)?
- **Why it cannot be inferred:** The OD-11 Resolution lists ranges "if the paragraph is present" without
  naming templates; AC-16 and AC-14 name only simplified templates, and AC-14 says Full is unaffected.
  Checked `src/utils/output-validator.ts`: no word-range rule exists for any template to copy.
- **Impact if unresolved:** The spec writer can default (a) to simplified-only per AC-16 and (b) to the
  existing validator error semantics; a wrong default would either reject Full descriptions that
  pass today or leave a range unmeasured. Not required to start the specification.
- **blocking:** false
