---
artifact: story
story: US-2.1
slug: migrate-descriptions-to-v4-schemas
title: Migrate product descriptions to the v4.0 UA content schema
track: prompt
version: 1
status: DRAFT
owner: so-story-writer
created_at: 2026-09-19T00:00:00Z
updated_at: 2026-09-19T00:00:00Z
---

# US-2.1 — Migrate product descriptions to the v4.0 UA content schema

## Story

As a **content operator running a generation**,
I want **generated product descriptions to follow the v4.0 UA schema
(`Knowledge/Schemas/product_description_schemas_v4_ua.md`)**,
so that **pages published to OpenCart conform to the approved content standard without manual
rework**.

## Context

The v4.0 UA schema was approved on 2026-09-18 and supersedes
`Knowledge/Schemas/product_description_schema_v3_ua.docx`. The generator still encodes v3:
`ProductDescriptionDocSchema` pins `schemaVersion: z.literal('3.0')`
(`src/domain/description-doc.schema.ts:155`), and the prompts in `src/prompts/` and
`src/prompt-core/` carry v3 rules. There is no v3 → v4 changelog (the v4 file lists "Журнал змін"
in its contents but has no such section), so the delta for this Story is the whole v4 document.

## Scope

| | |
|---|---|
| **Stores** | all of `STORE_REGISTRY` |
| **Locales** | all; uk-UA is generated natively as the master, other locales follow the existing pipeline |
| **Surface** | `src/prompts`, `src/prompt-core`, `src/domain`, `src/render`, `src/utils` |
| **Touches FROZEN files?** | **YES** — `src/prompts/task-a.ts`, `src/prompts/task-c.ts`, `src/prompt-core/master-system-prompt.ts`, `src/utils/output-validator.ts`. This is an AGENTS.md §9 stop: each file needs explicit per-file approval before it is edited, and `.arch-guard-checksums` must be re-baselined in the same commit. |
| **Touches generated HTML?** | yes — AGENTS.md §4 criteria apply |

## Acceptance criteria

Each is taken from the v4 text (section in brackets) and is falsifiable.

- **AC-1:** The hook is a single `<p>` of 40–85 words that starts with `<b>{product name}</b> —` (§1).
- **AC-2:** The hook contains 2–4 technical values, and `killerSpecs` has 3–4 items, each rendered
  as `<b>lead</b> — benefit` (§1, §2).
- **AC-3:** The Killer Specs + Key Benefits block is one H2 followed by a `<ul>` of at most 8
  items, 90–300 words in total, and contains no table (§2).
- **AC-4:** The applications section is an H2 followed by a `<ul>` of 4–8 items, 80–250 words in
  total (§4).
- **AC-5:** Compatibility (§5) and package contents (§6, an `<ol>` headed "Що в коробці?" or
  "Що входить до набору?" in uk-UA) are emitted only when the source data contains them;
  otherwise the section is absent.
- **AC-6:** The specs section (§7) has one H3 and one table per category, using
  `table-responsive` / `table table-bordered table-striped` markup; no value cell contains
  `<ul>`, `<ol>` or `<br>`, and a multi-value parameter is comma-joined in one row.
- **AC-7:** The CTA (§8) is a single `<p>` of 50–100 words under the H2
  "Чому варто купити {product name} в {store name}?" (localized per locale).
- **AC-8:** The description body contains no `<h1>` (§0), and the FAQ (§9) is produced
  separately as 3–5 question/answer pairs of 2–4 sentences each, never embedded in the
  description HTML.
- **AC-9:** Across a fixture batch, no two consecutive products' hooks use the same v4 structural
  pattern (§1 "Антиконвеєр"); see Q3 for how a pattern is detected.
- **AC-10:** Figures and videos use the v4 Appendix markup: the first `<img>` has no
  `loading="lazy"`, every later one does; the `<iframe>` `title` is localized; decimal and
  thousands separators follow the locale rules of the Appendix.
- **AC-11:** The emitted document has `schemaVersion: '4.0'`; how a `'3.0'` document is treated is
  decided by Q2.

## Out of scope

- The simplified schemas (filaments/resins/powders, accessories, spare parts) — separate Stories.
- Changing the OpenCart FAQ module.
- Deploying, or regenerating already-published products.

## Open questions

- **Q1:** Which rules are new or changed between v3 and v4 (word ranges, H2 titles, hook rules)?
  - Checked: v4 `.md` has no changelog section; v3 is a `.docx` and was not diffed.
  - Impact if unresolved: the ACs treat every v4 number as authoritative, and the spec writer
    cannot tell which prompt rules actually need to change.
- **Q2:** What happens to `schemaVersion: '3.0'` documents (cached, stored, or regenerated) —
  reject, migrate, or dual-support?
  - Checked: `description-doc.schema.ts:155` pins the literal `'3.0'`.
  - Impact if unresolved: AC-11 cannot be turned into a test.
- **Q3:** v4 requires rotating at least 4 hook patterns but gives no measurable rule for detecting
  a pattern.
  - Checked: v4 §1 lists 5 patterns with prose descriptions only.
  - Impact if unresolved: AC-9 has no deterministic assertion; the spec writer would invent one.
- **Q4:** v4 §7 forbids lists in spec value cells, but `SpecRow.value` currently allows
  `string[]` (`description-doc.schema.ts:187`). Remove the array form, or keep it and comma-join
  at render?
  - Impact if unresolved: the domain shape and the renderer change differently under each choice.
- **Q5:** v4 word ranges and samples are written for uk-UA; do en/es/pl/de use the same ranges or
  scaled ones?
  - Impact if unresolved: AC-1, AC-3, AC-4 and AC-7 are ambiguous for non-uk-UA locales.
- **Q6:** `src/prompts/task-a-consumables-doc.ts` shares §1/§2/§4/§7/§8 rules — does this Story
  touch it, or does it stay on v3 until the simplified-schema Story?
  - Impact if unresolved: scope of the consumables pipeline is undecided.
- **Q7:** The Story spans the whole v4 document; should clarification split it per section?

## References

- `Knowledge/Schemas/product_description_schemas_v4_ua.md`
- `Knowledge/Schemas/product_description_schema_v3_ua.docx`
- `src/domain/description-doc.schema.ts`, `src/prompts/task-a-doc.ts`
- `AGENTS.md` §3, §4, §9
- `README.md` — "How generation works"
