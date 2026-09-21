---
artifact: story
story: US-2.2
slug: simplified-content-template-schemas
title: Add simplified v4 content-template schemas and update the Content Template dropdown
track: prompt
version: 1
status: ARCHIVED
owner: so-story-writer
created_at: 2026-09-21T13:03:00Z
updated_at: 2026-09-21T13:03:00Z
---

# US-2.2 — Add simplified v4 content-template schemas and update the Content Template dropdown

## Story

As a **content operator running a generation**,
I want **to pick a content template — Full description, Filaments/resins/powders, Accessories
or Spare parts — and get a description that contains only the paragraphs the v4 schema defines
for that product class**,
so that **simple products (consumables, accessories, spare parts) are not padded with sections
that only make sense for complex machines**.

## Context

US-2.1 implemented the v4 full description schema. The v4 document
(`Knowledge/Schemas/product_description_schemas_v4_ua.md`) also defines three simplified schemas
("Спрощені схеми опису для простих товарів"), each a subset of the v4 paragraphs. Today the
"Content Template" dropdown offers one template, `consumables-resin` ("Consumables /
Accessories"), backed by a v3-era `CONSUMABLES_SIMPLIFIED_SCHEMA` and
`task-a-consumables-doc.ts`. The dropdown's default is an empty "Select Template..." option, and
it appears in both the Generator and the SEO-only forms of `src/app/app.component.html`.

## Scope

| | |
|---|---|
| **Stores** | all of `STORE_REGISTRY` |
| **Locales** | all; uk-UA is generated natively as the master, other locales follow the existing pipeline |
| **Surface** | `src/app/types.ts` (`CONTENT_TEMPLATES`), `src/app/app.component.{ts,html}` (both dropdowns, EN/UA labels), `src/prompts`, `src/prompt-core`, `src/services/content-orchestrator.service.ts`, `src/utils` |
| **Touches FROZEN files?** | **Probably YES** — `src/prompts/task-a.ts` and `src/prompts/task-c.ts` read `templateId`/`CONTENT_TEMPLATES`, and `src/utils/output-validator.ts` may need per-template rules. Each is an AGENTS.md §9 stop needing per-file approval and a re-baselined `.arch-guard-checksums`; `so-planner` must confirm which are really required. |
| **Touches generated HTML?** | yes — AGENTS.md §4 criteria apply, plus the v4 §7 rules for the single-table variant |

## Acceptance criteria

Paragraph numbers refer to the v4 schema (§1 hook, §2 Killer Specs + Key Benefits,
§3 functionality, §4 applications, §5 compatibility, §6 package contents, §7 specs table,
§8 CTA, §9 FAQ).

- **AC-1:** In both the Generator and the SEO-only forms, the "Content Template" dropdown lists
  exactly four options in this order: Full description, Filaments/resins/powders, Accessories,
  Spare parts. There is no empty "Select Template..." option, and "Full description" is
  selected by default.
- **AC-2:** The four option labels are rendered as "Full description / Filaments, resins,
  powders / Accessories / Spare parts" in EN and "Повний опис / Філаменти, смоли, порошки /
  Аксесуари / Запчастини" in UA, taken from the existing EN/UA `uiLabels` mechanism; the
  `consumables-resin` option no longer appears.
- **AC-3:** With "Filaments, resins, powders" selected, the built prompt requests paragraphs
  1, 2, 4, 5 and 7 and 8, and requests no §3, §6 or §9 content.
- **AC-4:** With "Accessories" selected, the built prompt requests paragraphs 1, 2, 3, 5, 7 and
  8, and requests no §4, §6 or §9 content.
- **AC-5:** With "Spare parts" selected, the built prompt requests only paragraphs 1, 5 and 8.
- **AC-6:** With "Full description" selected, the built prompt is byte-identical to the prompt
  built before this Story for a product with no `templateId` (paragraphs 1–9 unchanged).
- **AC-7:** For "Filaments, resins, powders" and "Accessories", the §7 specs section uses the
  Full §7 `table-responsive` / `table table-bordered table-striped` markup with all parameters
  in a single `<tbody>` and no `<h3>` category subheadings, and the prompt states this
  explicitly (D2).
- **AC-8:** For "Filaments, resins, powders" and "Accessories", §5 compatibility is emitted only
  when the source data contains compatibility information; otherwise the section is absent
  (same rule as v4 §5 in Full description).
- **AC-9:** When "Accessories" is selected, a checkbox labeled "Include Functionality (§3)" /
  "Додати блок Функціональність (§3)" is visible in the Generator form; it is hidden for every
  other template. The built Accessories prompt includes §3 instructions only when the checkbox
  is checked and omits §3 when it is unchecked (D1).
- **AC-11:** `ProductDescriptionDocSchema` accepts a document that omits (or sets to null)
  paragraphs 2, 3, 4, 6, 7 and 9, and still rejects a document missing paragraph 1 or 8 (D5).
- **AC-12:** Where a rule of the removed `CONSUMABLES_SIMPLIFIED_SCHEMA` conflicts with the v4
  schema, v4 wins in every simplified template: hook 40–85 words (§1), Killer Specs block
  ≤ 8 items and 90–300 words (§2), applications 4–8 items and 80–250 words (§4), CTA as an H2
  plus a single 50–100-word `<p>` (§8). No legacy limit from the old schema survives except the
  ceiling in AC-14, which is soft and subordinate to v4 (D3, D6, D8).
- **AC-13:** After this Story, `consumables-resin`, `CONSUMABLES_SIMPLIFIED_SCHEMA`,
  `CONSUMABLES_TRANSLATION_OVERLAY` and `src/prompts/task-a-consumables-doc.ts` no longer
  exist in the repository, and no source or spec references them (D4).
- **AC-10:** Every simplified template still satisfies the shared v4 rules for the paragraphs it
  does include: hook in a single `<p>` starting with `<b>{product name}</b> —` (§1), CTA
  `<p>` under the localized H2 "Чому варто купити … в …?" (§8), no `<h1>` in the body.
- **AC-14:** For all three simplified templates, the prompt states a 5500-character soft
  ceiling on narrative text only (§1, §2, §4, §5, §8, tags stripped; the §7 table and all markup
  excluded), and states that the v4 per-paragraph word ranges take absolute priority: when
  meeting them pushes the narrative above 5500 characters, the model keeps the v4 ranges and
  exceeds the ceiling. Full description is unaffected (D6, D8).
- **AC-16:** A simplified-template description whose narrative text exceeds 5500 characters but
  keeps every paragraph within its v4 word range is not rejected by validation; one that
  violates a v4 word range is rejected regardless of length (D8).
- **AC-15:** For "Filaments, resins, powders" and "Accessories", when the source technical
  specifications data is empty, the prompt omits §7 and the generated description contains no
  specs table or its heading; when the data is non-empty, §7 is present (D7).

## Out of scope

- Changing the v4 Full description schema or the FAQ (§9) — FAQ stays with Full description.
- Adding further templates beyond the four listed, or a product-class auto-detector.
- Migrating already-generated or published descriptions.
- Any change to the "Customize" custom-template panel beyond keeping it working.

## Resolved decisions

Answered by the user on 2026-09-21; these replace the original Q1–Q5 (D3 revised, D6–D8 added).

- **D1 (was Q1):** §3 for Accessories is controlled by a deterministic UI checkbox, "Include
  Functionality (§3)" / "Додати блок Функціональність (§3)", shown only for the Accessories
  template and bound to a flag the prompt builder reads.
- **D2 (was Q2):** single-table §7 uses the Full §7 markup minus all `<h3>` subheadings, with
  every parameter in one `<tbody>`.
- **D3 (was Q3, REVISED 2026-09-21):** the v4 schema always wins over the old `consumables-resin` limits;
  the old limits below are recorded for history only and are discarded wherever they contradict v4.
  Old `CONSUMABLES_SIMPLIFIED_SCHEMA`
  (`src/prompt-core/constants.ts`), captured before deletion: hook 40–60 words; features
  4–6 `<li>`; applications 3–4 `<li>`; storage 2–3 `<li>`; closing CTA 1–2 sentences; target
  ~4700 visible characters, hard ceiling 5500 (tags stripped); no `<thead>`, no `<h3>`.
- **D4 (was Q4):** delete `consumables-resin`, `CONSUMABLES_SIMPLIFIED_SCHEMA` (and its
  translation overlay) and `task-a-consumables-doc.ts` after D3 is extracted.
- **D5 (was Q5):** make paragraphs 2, 3, 4, 6, 7, 9 optional/nullable in
  `ProductDescriptionDocSchema` and related types.

- **D6 (was Q6):** the 5500-character visible-text ceiling applies to all three simplified
  templates, not only Filaments/resins/powders.
- **D7 (was Q7):** if the source technical specifications are empty, §7 is not generated at all.

- **D8 (was Q8):** the 5500-character ceiling counts narrative text only (§1, §2, §4, §5, §8) —
  the §7 table and all HTML tags are excluded — and is a soft ceiling. The v4 per-paragraph word
  ranges have strict priority: if honouring them exceeds 5500 characters, the model must keep
  the v4 ranges. The ceiling exists to curb padding and hallucination, never to force a v4
  minimum/maximum violation.

## Open questions

None outstanding.

## References

- `Knowledge/Schemas/product_description_schemas_v4_ua.md` — "Перелік параграфів для «простих»
  товарів" and the three simplified schemas
- `src/app/types.ts` (`CONTENT_TEMPLATES`), `src/app/app.component.html` (two dropdowns)
- `src/prompt-core/constants.ts` (`CONSUMABLES_SIMPLIFIED_SCHEMA`), `src/prompts/task-a-consumables-doc.ts`
- `docs/stories/US-2.1-migrate-descriptions-to-v4-schemas.md`
- `AGENTS.md` §3, §4, §9
