---
artifact: clarification_report
story: US-2.2
version: 3
status: DRAFT
owner: so-clarifier
created_at: 2026-09-21T13:45:00Z
updated_at: 2026-09-21T16:00:00Z
supersedes: docs/evidence/US-2.2-clarification-report.md#2
inputs_consumed:
  - key: story
    version: 1
  - key: open_decisions
    version: 2
  - key: clarification_report
    version: 2
open_decisions_blocking: false
---

# US-2.2 — Clarification Report (v3, attempt 3)

## Verdict: Ready for Specification

No blocking Open Decision remains. OD-1..OD-4, OD-9 and OD-11..OD-14 carry human Resolutions
(2026-09-21), kept verbatim and not re-evaluated. OD-11 (AC-16 wins: v4 word ranges are hard, both
min and max; 5500 characters soft) supersedes the OD-3 rejection wording. Non-blocking and still open:
OD-5..OD-8, OD-10, and new OD-15 (scope of the hard word-range check to Full description; failure
semantics). Log: `docs/decisions/US-2.2-open-decisions.md` (v3).

## Sources read
Story; `README.md`; `AGENTS.md` §3, §4, §8, §9, §11; `STORE_REGISTRY` and `doc-pipeline-flag.ts`;
`Knowledge/Schemas/product_description_schemas_v4_ua.md`; `test/render-reconciliation.report.md`
§5; `src/domain/description-doc.schema.ts`; `src/utils/output-validator.ts`; code references to
`consumables`; the v1 open decisions and report.

## What changed since v1
- OD-1 (both paths, `task-a.ts` and `task-a-doc.ts`), OD-2 (delete all consumables machinery; standard
  schema and renderer with paragraphs 2, 3, 4, 6, 7, 9 optional), OD-3 (validator in
  `output-validator.ts`, soft 5500 ceiling, paragraph 7 excluded), OD-4 (master uk-UA only;
  `task-c.ts` preserves omissions; overlay deleted) and OD-9 (FROZEN edits to `task-a.ts`,
  `task-c.ts`, `output-validator.ts` approved) are settled by human Resolution.
- The Resolutions introduce new gaps against the Story's own ACs and the codebase: OD-11..OD-14.

## What is clear
- Actor, trigger, value; four templates and their paragraph subsets (AC-3..5).
- D1..D8 human-settled; OD-1..OD-4, OD-9 human-settled.
- Stores: "all of STORE_REGISTRY", none named outside it; no currency or locale named.
- Locale scope: length constraints master (uk-UA) only; translation enforces none (OD-4 Resolution).
- FROZEN status: `task-a.ts`, `task-c.ts`, `output-validator.ts` edits approved (OD-9); `master-system-prompt.ts`
  and `task-b.ts` need not change on current evidence.

## Resolved since v2 (human, 2026-09-21)
- OD-11: AC-16 wins; hard min and max word ranges at any length; soft 5500 bypassed when all ranges hold.
- OD-12: tag-stripped counting; §7, figcaptions, alt text and FAQ excluded; §3 counts.
- OD-13: paragraph 2 = killerSpecs + keyBenefits, 3 = functionality; one category, one tbody, no h3 or title row.
- OD-14: complete eradication of legacy consumables code and its tests, stated as not test-weakening.

## What is ambiguous (all non-blocking)
- OD-15 (new): whether hard word ranges reach Full description; how "rejected" and paragraph-2 word
  counting map onto existing validator/repair behaviour.
- Carried forward: OD-5 (Full description templateId vs AC-6, Customize panel), OD-6 (Accessories
  checkbox default), OD-7 (Spare parts §5 without data), OD-8 (v4 internal contradictions),
  OD-10 (label/numbering).

## Impact areas
- **Generated HTML:** yes. AGENTS.md §4 criteria in play: spec-count parity where §7 is kept (skipped
  where §7 is omitted, see OD-13), figure/figcaption structure, video survival, no `<h1>`, CTA H2.
- **Prompt:** yes; FROZEN edits approved (OD-9).
- **uk-UA fan-out:** master-only limits; translation prompt must not invent omitted paragraphs (OD-4).
- **Dependencies:** US-2.1 (done). Consumables fixtures/tests are removed per OD-2.
