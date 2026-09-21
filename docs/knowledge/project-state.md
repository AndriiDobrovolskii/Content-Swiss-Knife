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
