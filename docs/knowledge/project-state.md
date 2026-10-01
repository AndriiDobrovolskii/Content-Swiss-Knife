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

## US-3.1 — repair gate blocks ungrounded content; brand-core fixes (archived 2026-09-29T17:33:11Z)
- Grounding failures retry and then hard-block; there is no silent fail-open fallback.
- The repair ladder is reachable in production: missing fields are dispatched to their strategy, and each
  fresh regeneration attempt gets its own field/block ladder pass. Field-scoped repair answers that come
  back JSON-shaped are rejected with one bounded retry (`src/utils/repair-gate.ts`).
- `meta_title` follows one template without a site-name suffix; a deterministic long-h1 fallback and a
  word-boundary-safe clip keep it valid (`repair-strategy.ts`, `seo-metadata-shape`).
- `cta.heading` non-empty is `schemaVersion`-conditional (required for 3.0, not 4.0) in
  `description-doc.schema.ts`.
- Frozen `task-a.ts`, `master-system-prompt.ts`, `task-b.ts` changed (OD-3/OD-7/OD-9), checksums re-baselined.
- Delivered by PR #129, merge commit `209627b`. Summary: `docs/knowledge/US-3.1-delivery-summary.md`.
- Open items: OD-10 (de-DE h1-identity band partly closed); §9 approvals for T8/T10 not durably recorded;
  FR-14(a) missing-key wording unclarified in the Specification.

## US-4.1 — Sonnet 5.5 and Gemini 3.8 Flash as defaults; Sonnet 4.6 retired (archived 2026-10-01T13:59:42Z)
- Deep defaults to `claude-sonnet-5-5` (levels between_tools/low/medium/high/xhigh, default high, 128K output);
  Fast defaults to `gemini-3.8-flash` (low/medium/high, default low; `minimal` unsupported). `claude-sonnet-4-6`
  is gone from the catalog; a stored 4.6 setting migrates to 5.5 and stale levels clamp (a stored `max` -> `xhigh`).
- Pricing has entries for both; Gemini 3.8 Flash steps up on 2027-01-01 (`server/usage/pricing.js`).
- Anthropic provider sends no sampling params or forced tool use for 5.5 and keeps effort `max` off the wire for
  models that lack it (`server/providers/anthropic.js`, `model-support.js`).
- No FROZEN file changed. Delivered by PR #131, merge commit `765b5a0`. Summary: `docs/knowledge/US-4.1-delivery-summary.md`.
- Open items: beta header `extended-cache-ttl-2025-04-11` and 5.5 timeout exposure at `high` unverified live;
  AC-9 doc test covers only README, `.env.example`, AGENTS.md.
