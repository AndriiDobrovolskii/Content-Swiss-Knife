---
artifact: specification
story: US-2.2
version: 1
status: ARCHIVED
owner: so-spec-writer
created_at: 2026-09-21T16:30:00Z
updated_at: 2026-09-21T13:59:30Z
supersedes: null
inputs_consumed:
  - key: story
    version: 1
  - key: clarification_report
    version: 3
  - key: open_decisions
    version: 3
open_decisions_blocking: false
---

# Specification: US-2.2 — Add simplified v4 content-template schemas and update the Content Template dropdown

## Summary

When this is done, the "Content Template" dropdown offers exactly four templates (Full description, Filaments/resins/powders, Accessories, Spare parts) in both the Generator and SEO-only forms. Each simplified template produces a description containing only the v4 paragraphs defined for that product class, through the standard description document model and renderer. All legacy consumables machinery no longer exists. Full description output is unchanged.

## Background

Today the dropdown offers one template, `consumables-resin`, backed by a v3-era simplified schema and a separate consumables pipeline. US-2.1 delivered the v4 full schema. The v4 document (`Knowledge/Schemas/product_description_schemas_v4_ua.md`) defines three simplified schemas as paragraph subsets. Human Resolutions dated 2026-09-21 (OD-1..OD-4, OD-9, OD-11..OD-14) settle: both generation paths implement the templates; the standard document schema and renderer replace the consumables pipeline; the v4 word ranges are hard and the 5500-character ceiling is soft (OD-11 supersedes the OD-3 rejection wording); length rules apply to the uk-UA master only; all legacy consumables code and tests are removed. Story decisions D1–D8 are inputs, not re-asked. Paragraph numbers refer to the v4 schema (§1 hook, §2 Killer Specs + Key Benefits, §3 functionality, §4 applications, §5 compatibility, §6 package contents, §7 specs table, §8 CTA, §9 FAQ).

## Scope

| | |
|---|---|
| **Stores** | All of `STORE_REGISTRY`. Both generation paths are in scope (OD-1): the Doc pipeline (stores enrolled in `DOC_PIPELINE_STORES`) and the legacy HTML path (currently `Expert-3DPrinter`). |
| **Locales** | uk-UA is generated natively as the master; the paragraph subset, word ranges and 5500-character ceiling are enforced on the uk-UA master only. Every derived locale is translated from the master document, enforces no length limit, and preserves the master's structural omissions (OD-4). |
| **Track** | prompt (with angular UI and domain/render/validator changes as consequences of the Story's surface) |
| **FROZEN files (AGENTS.md §9)** | `src/prompts/task-a.ts`, `src/prompts/task-c.ts`, `src/utils/output-validator.ts` are edited; the human approved each explicitly (OD-9, 2026-09-21). The §9 stop and a re-baselined `.arch-guard-checksums` still apply at implementation. |

## Functional requirements

### FR-1: Dropdown options and default

In both the Generator form and the SEO-only form, the "Content Template" dropdown lists exactly four options in this order: Full description, Filaments/resins/powders, Accessories, Spare parts. It has no empty "Select Template..." option, and "Full description" is selected by default.

**Failure path:** n/a, a static listing; the empty option must not exist under any form state.

### FR-2: Option labels, EN and UA

Labels come from the existing EN/UA `uiLabels` mechanism. In EN they render as "Full description", "Filaments, resins, powders", "Accessories", "Spare parts"; in UA as "Повний опис", "Філаменти, смоли, порошки", "Аксесуари", "Запчастини". The `consumables-resin` option does not appear. (The Story's AC-1 short form "Filaments/resins/powders" and AC-2's comma form are open, OD-10; the AC-2 strings are the rendered labels specified here.)

**Failure path:** if a label key is missing for the active UI language, the build or a test fails; the option must not render as a raw key or as blank.

### FR-3: Filaments, resins, powders paragraph set

With "Filaments, resins, powders" selected, the built prompt requests paragraphs 1, 2, 4, 5, 7 and 8 and requests no §3, §6 or §9 content.

**Failure path:** a built prompt that requests any excluded paragraph is a defect. How stray model output containing an excluded paragraph is handled is not specified by the Story and is not invented here.

### FR-4: Accessories paragraph set

With "Accessories" selected, the built prompt requests paragraphs 1, 2, 3, 5, 7 and 8 (§3 subject to FR-9) and requests no §4, §6 or §9 content.

**Failure path:** as FR-3.

### FR-5: Spare parts paragraph set

With "Spare parts" selected, the built prompt requests only paragraphs 1, 5 and 8. Behaviour of §5 when the source has no compatibility data is open (OD-7); this requirement makes no claim about it.

**Failure path:** as FR-3.

### FR-6: Full description unchanged

With "Full description" selected, the built prompt is byte-identical to the prompt built before this Story for a product with no `templateId`; paragraphs 1–9 are unchanged. What identifier "Full description" carries, and how the "Customize" panel interacts with it, are open (OD-5); the byte-identity requirement holds whatever that resolves to.

**Failure path:** any byte difference against the pre-Story prompt for the same input is a defect.

### FR-7: Both generation paths honour the template

Both prompt builders, the Doc-pipeline builder and the legacy HTML-path builder, request only the paragraphs of the selected template (FR-3..FR-6), so the result does not depend on which store is generating (OD-1).

**Failure path:** a store on either path that emits all nine paragraphs for a simplified template is a defect.

### FR-8: Single-table §7 for Filaments and Accessories

For "Filaments, resins, powders" and "Accessories", the §7 specs section uses the Full §7 `table-responsive` / `table table-bordered table-striped` markup with all parameters in a single `<tbody>`, with no `<h3>` category subheading and no category title row. The document holds exactly one category item, and the renderer emits that category's rows in one `<tbody>` (OD-13b). The prompt states this explicitly (D2).

**Failure path:** output with more than one `<tbody>`, an `<h3>` subheading or a category title row for these templates fails validation.

### FR-9: Accessories §3 checkbox

When "Accessories" is selected, a checkbox labeled "Include Functionality (§3)" (EN) / "Додати блок Функціональність (§3)" (UA) is visible in the Generator form and hidden for every other template. The built Accessories prompt includes §3 instructions only when the checkbox is checked and omits §3 when it is unchecked (D1). The checkbox's default state, reset-on-template-change, persistence and SEO-only form behaviour are open (OD-6).

**Failure path:** n/a for visibility; for the prompt, an unchecked checkbox must never yield §3 content.

### FR-10: Compatibility §5 conditional

For "Filaments, resins, powders" and "Accessories", §5 is emitted only when the source data contains compatibility information; otherwise the section is absent, the same rule as v4 §5 in Full description.

**Failure path:** when the source has no compatibility data, a fabricated §5 is a defect.

### FR-11: Specs §7 conditional on source data

For "Filaments, resins, powders" and "Accessories", when the source technical specifications data is empty, the prompt omits §7 and the generated description contains no specs table and no specs heading; when the data is non-empty, §7 is present (D7). Spec-count parity (AGENTS.md §4) applies only where §7 is present.

**Failure path:** a specs table or heading appearing for empty source data is a defect.

### FR-12: Shared v4 rules for included paragraphs

Every simplified template satisfies the shared v4 rules for the paragraphs it includes: the hook is a single `<p>` starting with `<b>{product name}</b> —` (§1); the CTA is a `<p>` under the localized H2 "Чому варто купити … в …?" (§8); the body contains no `<h1>`.

**Failure path:** a violation fails output validation on the existing validator path.

### FR-13: v4 wins over legacy consumables limits

In every simplified template the v4 rules apply: hook 40–85 words (§1); Killer Specs block ≤ 8 items and 90–300 words (§2); applications 4–8 items and 80–250 words (§4); CTA an H2 plus a single 50–100-word `<p>` (§8). No legacy limit of the removed consumables schema survives except the soft ceiling in FR-15 (D3, D6, D8). Where v4 text internally contradicts D2/D1/D7 the Story decisions govern (OD-8 remains open on which v4 sentence is cited).

**Failure path:** a prompt still carrying an old limit (for example hook 40–60 words, features 4–6 items) is a defect.

### FR-14: Hard v4 word ranges (master uk-UA)

For a simplified-template uk-UA master description, a paragraph present in the document is checked against its v4 word range, both minimum and maximum: hook 40–85, Killer Specs 90–300, applications 80–250, compatibility 30–100, CTA 50–100, and FAQ 150–400 where present (OD-11). Any violation rejects the document at any total character length; for example a 4000-character description with a 120-word hook is rejected. This check lives in the output validator, replacing the hard-coded consumables character-limit gate (OD-3). The FAQ range is listed per OD-11 although the simplified templates request no §9. Whether these ranges also apply to Full description, and how "rejected" and paragraph-2 word counting map onto the repair/retry path, are open (OD-15); this requirement is specified for the simplified templates, as AC-16 states.

**Failure path:** rejection uses the validator's existing error semantics as far as OD-15 is unresolved; no silent acceptance of an out-of-range paragraph.

### FR-15: Soft 5500-character narrative ceiling

For all three simplified templates the prompt states a 5500-character soft ceiling on narrative text and states that the v4 per-paragraph word ranges take absolute priority: when meeting them pushes the narrative above 5500 characters, the model keeps the v4 ranges and exceeds the ceiling. Narrative text is the tag-stripped visible text of paragraphs 1, 2, 4, 5 and 8, plus paragraph 3 when included for Accessories; paragraph 7 and its table, figcaptions, alt text, the FAQ module and all HTML markup are excluded (D8, OD-12). Full description is unaffected.

**Failure path:** n/a for the prompt statement; see FR-16 for validation behaviour when the ceiling is exceeded.

### FR-16: Ceiling does not reject

A simplified-template uk-UA description whose narrative text exceeds 5500 characters but keeps every present paragraph within its v4 word range is not rejected by validation. One that violates any v4 word range is rejected (FR-14) regardless of length. The previous hard consumables character-limit rule no longer rejects anything.

**Failure path:** n/a beyond FR-14.

### FR-17: Optional paragraphs in the document schema

The standard description document schema accepts a document that omits, or sets to null, paragraph 2 (`killerSpecs` and `keyBenefits`), 3 (`functionality`), 4, 6, 7 and 9, and still rejects a document missing paragraph 1 or 8 (D5, OD-2, OD-13a). Array count bounds (for example applications 4–8 items) still apply whenever the parent field is present; cross-field checks skip when their target optional fields are absent (OD-13c). Existing Full-description documents that include all paragraphs continue to validate as before.

**Failure path:** a document missing paragraph 1 or 8 is rejected by the schema.

### FR-18: Standard renderer skips absent paragraphs

The standard renderer renders a document with omitted or null paragraphs without throwing, emits no markup, heading or placeholder for them, and renders the single category of a simplified §7 per FR-8. Full-description rendering is unchanged.

**Failure path:** rendering must not throw on any combination of the optional paragraphs being absent.

### FR-19: Translation preserves master omissions

For every non-master locale, the translation prompt translates only the fields present in the master document and does not invent, re-add or expand omitted paragraphs (§3, §6, §9 or any other). It enforces no length limits. The translation overlay for consumables no longer exists (OD-4).

**Failure path:** a translated document containing a paragraph absent from its master is a defect.

### FR-20: Legacy consumables removal

After this Story, `consumables-resin`, `CONSUMABLES_SIMPLIFIED_SCHEMA`, `CONSUMABLES_TRANSLATION_OVERLAY` and the consumables doc prompt module no longer exist in the repository, and no source or spec references them (D4). Per OD-2 and OD-14 the following are also removed: the consumables domain model and schema, the consumables renderer and prose transforms, the consumables trim and bullet-punctuation utilities, the consumables pipeline flag and its enablement constant, the `'consumables-doc'` pipeline literal, consumables text and notes in shared prompt constants, consumables branches in orchestration, repair and rendering, and the related tests and fixtures, including the consumables reconciliation spec, the consumables fixtures and the scaffold pin tests that expect the schema to reject a consumables-shaped artifact. The human stated this is not test-weakening under AGENTS.md §8 (OD-14).

**Failure path:** any remaining reference to a removed item fails the repository-wide reference check.

## Generated-HTML requirements (AGENTS.md §4)

The Story changes generated HTML. The criteria below stay true for every simplified template wherever their subject is present.

### FR-21: Spec count and units

> "Space between number and unit: `1.75 mm`, `200 °C` (not `1.75mm`)."
> "Spec count on output = spec count on input. Don't change values or units."

Preserved. Where §7 is present (FR-11), the spec count equals the input count in the single tbody. Where §7 is omitted, there is nothing to count.

### FR-22: Images and figures

> "Each image wrapped in a `<figure>` with a `<figcaption>` (figcaption sourced from the manifest caption). First image's `<img>` — without `loading="lazy"`; every subsequent one — with it; `decoding="async"` on all. No orphan images (each `<figure>` is preceded by a `<p>` lead-in). The lead-in `<p>` must not duplicate the `<figcaption>`; `alt` must not duplicate the `<figcaption>`."
> "Images wrapped in `<figure>` (inline style `display: block; width: fit-content; max-width: 100%; margin: 4px auto;`) with a `<figcaption>` (a `<b>` lead-in label distinct from the alt + description) and `decoding="async"`. First image — without `loading="lazy"`; every subsequent one — with it. No `<figure>` nested inside `<p>`. No orphan images (each is preceded by a `<p>` lead-in)."

Preserved for simplified templates that include uploaded images (§4 of AGENTS.md figure rules) when the standard pipeline places them. Figcaptions are excluded from the 5500 count (FR-15).

### FR-23: Video survival

> "**A video embed present in the input is present in the output.** A YouTube/Vimeo `<iframe>` in the source description must survive into every generated language version. Losing it is a bug, not a stylistic choice — see `src/utils/video-manifest.ts`."

Preserved for every simplified template and every derived locale.

### FR-24: Meta fields

> "SEO: meta_title ≤ 55 chars; meta_description ≤ 155, ends with CTA ➔. **No currency symbol** — price is not available at the Task B stage, and `task-b.ts` forbids inventing one; price/priceCurrency ship via Schema.org Offer microdata instead."

Preserved unchanged. The `meta-description-currency` rule stays disarmed, as AGENTS.md §4 requires.

### FR-25: Forbidden Product itemtype, HTML only

> "**Forbidden** `itemtype="https://schema.org/Product"` in the description body [...] Allowed only: `PropertyValue`, `FAQPage`, `HowTo`."
> "HTML only, no Markdown. No `<br>` for spacing; `<hr>` after each `</section>`."

Preserved for every simplified template.

## Non-functional requirements

- **NFR-1:** `systemBlocks` are not collapsed into `userContent`; template-specific instructions must respect the existing prompt-caching block separation (AGENTS.md §3).
- **NFR-2:** No behaviour depends on the active provider (§3 Rule 1).
- **NFR-3:** Retrieval (search, page fetch) stays out of generation (§3 Rule 2).
- **NFR-4:** Locales and currency come only from `STORE_REGISTRY` (§3); no locale list is hard-coded for the templates.
- **NFR-5:** Nothing reaching the browser bundle is a secret (§3 Rule 4).
- **NFR-6:** Determinism: prompt construction for a given input and template is a pure function of that input, with no randomness or wall-clock dependence, so FR-6 byte-identity is testable.
- **NFR-7:** Edits to FROZEN files occur only under the recorded OD-9 approval, with the §9 stop and re-baselined checksums (AGENTS.md §9).

## Out of scope

- Changing the v4 Full description schema or the FAQ (§9); FAQ stays with Full description.
- Adding further templates beyond the four, or a product-class auto-detector.
- Migrating already-generated or published descriptions.
- Any change to the "Customize" custom-template panel beyond keeping it working.
- Length or word-range enforcement on non-master locales.
- Arming the `meta-description-currency` rule.
- Changes to retrieval, providers or usage tracking.

## Open questions

All non-blocking; none was resolved by this Specification.

- **OD-5:** the identity of "Full description" (`templateId` value) and Customize-panel interaction; affects FR-6.
- **OD-6:** Accessories checkbox default, reset, persistence and SEO-only behaviour; affects FR-9.
- **OD-7:** Spare parts §5 when no compatibility data exists; affects FR-5 (conflict between AC-5 and AC-8 for Spare parts).
- **OD-8:** contradictions inside the v4 simplified schemas and which sentence is cited; affects FR-8 and FR-13.
- **OD-10:** label wording ("Filaments/resins/powders" vs "Filaments, resins, powders") and AC numbering; affects FR-2.
- **OD-15:** whether hard word ranges reach Full description; failure and paragraph-2 counting semantics; affects FR-14.

## Traceability matrix

| Acceptance criterion | Satisfied by | Notes |
|---|---|---|
| AC-1 | FR-1 | |
| AC-2 | FR-2 | OD-10 open on label wording |
| AC-3 | FR-3, FR-7 | |
| AC-4 | FR-4, FR-7, FR-9 | |
| AC-5 | FR-5, FR-7 | OD-7 open |
| AC-6 | FR-6 | OD-5 open |
| AC-7 | FR-8 | OD-13b; OD-8 open |
| AC-8 | FR-10 | Spare parts case is OD-7 |
| AC-9 | FR-9 | OD-6 open |
| AC-10 | FR-12 | |
| AC-11 | FR-17, FR-18 | |
| AC-12 | FR-13 | |
| AC-13 | FR-20 | OD-2, OD-14 |
| AC-14 | FR-15, FR-19 | OD-12; FR-19 covers master-only scope (OD-4) |
| AC-15 | FR-11 | |
| AC-16 | FR-14, FR-16 | OD-11 governs; OD-15 open |

FR-21..FR-25 restate AGENTS.md §4 criteria that must remain true for the changed HTML; they trace to AC-7, AC-10 and AC-11 (rendered output) and are constraints, not new behaviour. NFR-1..NFR-7 are repository rules from AGENTS.md.
