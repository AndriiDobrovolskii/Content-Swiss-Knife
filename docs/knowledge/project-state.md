# Project state

Capabilities delivered through the story workflow. Updated by so-orchestrator at archive time.

## US-2.1 — v4.0 UA content schema (archived 2026-09-21T12:40:54Z)
- Descriptions generate and render under `schemaVersion: "4.0"`; cached `3.0` documents remain
  readable and render with the old rules (dual support at the rendering layer).
- v4 structure: merged key-benefits section, invariant-start hook, `<ol>` package contents,
  per-locale headings and CTA heading from code-resident tables, deterministic hook-pattern
  selector (`src/prompt-core/hook-pattern.ts`), locale-aware thousands grouping in
  `fixNumberFormatting`.
- Frozen `master-system-prompt.ts` carries the v4 opener rule; checksum baseline re-baselined.
- Delivered by PR #125, merge commit `544c896`. Summary: `docs/knowledge/US-2.1-delivery-summary.md`.
- Open item outside the story: US-1.1 CORS rollback held in `stash@{0}`, undecided.

## US-2.2 — simplified v4 content templates (archived 2026-09-21T19:13:03Z)
- Content Template dropdown (shared component) offers Full description plus Filaments/resins/powders,
  Accessories and Spare parts; Accessories has an "Include Functionality (§3)" checkbox.
- Simplified templates omit paragraphs (schema accepts omitted/null §2-§7), render §7 as one flat table,
  enforce v4 word ranges as a hard rule with a 5500-char soft ceiling; FAQ stays data-driven.
- The v3 consumables pipeline and its files were removed.
- Frozen `task-a.ts`, `task-c.ts`, `output-validator.ts` changed (OD-9), checksums re-baselined.
- Delivered by PR #127, merge commit `5749f42`. Summary: `docs/knowledge/US-2.2-delivery-summary.md`.
- Open items: CTA/FAQ numbering conflict (Story §8/§9 vs frozen master prompt §9/§8); live Spare parts check
  and F1 golden diff check not recorded as done.
