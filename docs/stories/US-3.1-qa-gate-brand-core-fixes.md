---
artifact: story
story: US-3.1
slug: qa-gate-brand-core-fixes
title: Make the repair gate actually block ungrounded content and stop the brand-core/heading-form rule conflict
track: angular
version: 1
status: ARCHIVED
owner: so-story-writer
created_at: 2026-09-22T00:00:00Z
updated_at: 2026-09-22T12:00:00Z
---

# US-3.1 — Make the repair gate actually block ungrounded content and stop the brand-core/heading-form rule conflict

## Story

As a **store operator relying on the QA-gated generator pipeline**,
I want **the repair gate to actually block ungrounded/unverified content, and the brand-core
naming rules to stop contradicting each other**,
so that **generated product cards never ship with unverified §7 specs or an inconsistent
product name across locales**.

## Context

`Knowledge/Issues/First_Batch/QA_report_makera_cyclone_2026-09-21.md` reports 7 findings from a
manual QA pass over an EXPERT3D product-card generation run (Makera Cyclone Dust Collector,
locales en-ES/es-ES/pt-PT/uk-UA). Every code-rooted finding below was independently re-verified
against a second, same-day regeneration
(`expert3d_makera_cyclone_dust_collector_2026-09-22_1134.zip`) — these are live generator
defects, not one-off model noise — and traced to its exact source in the codebase rather than
taken on the report's hypotheses:

- **Gate fail-open (AC-1).** `specs-grounding-disabled` is emitted with `severity: 'warning'`
  in `src/services/content-orchestrator.service.ts` (~lines 547, 755, 1172). `src/utils/repair-gate.ts`
  only counts `severity === 'error'` issues toward "still failing" / blocking (lines 344, 388,
  496, 577), so a grounding failure can never block shipment — §7's technical specs table ships
  unverified against source. The warning-severity choice is **intentional**: the code comment at
  `content-orchestrator.service.ts:257-266` explains it was chosen to avoid repeating the "Ortur
  H20 incident," where a silent fallback to *untranslated* specs text caused false-positive
  deletions. That incident was about the fallback *value* (never silently reuse unverified
  text), not about the *severity* of reporting the failure — escalating severity, or adding a
  distinct hard-block path, does not reintroduce it, but any implementation must preserve the
  "never fall back to untranslated text" guarantee while fixing the blocking behavior. Per the
  Story Owner: "grounding" here means specifically the translated-specs check that row count
  (input = output) and numeric values/units were not distorted by the model — if the API call
  behind that check cannot be completed at all, even after retry, the artifact must fail closed.

- **Heading-rule conflict (AC-2, AC-3) — one code defect, not several.** `src/utils/heading-style.ts`
  has a budget-of-two "blessed" exemption (the first §3 heading and `doc.cta.heading`) that lets
  a heading carry the product's *short* name without being flagged — but only for headings
  matched by the short-pattern branch (`named` array, ~lines 369-393). The full-pattern branch
  (~lines 354-367 in the Doc variant, ~137-150 in the HTML variant) unconditionally flags
  `heading-product-name-stuffing` for **any** heading containing the *full* product name, with no
  position check at all — contradicting the rule's own message, which names the §9 closing as an
  allowed location. This is why uk-UA (which correctly keeps the invariant core `Makera Cyclone
  Dust Collector` in `cta.heading`) gets flagged, while es-ES/pt-PT (which drop the core there to
  satisfy the heading-form rule) pass this check but violate the brand-core invariant instead.
  Separately, `src/utils/slug-validator.ts` (using `invariantCore()` from
  `src/prompt-core/product-name-core.ts`) only checks `slugs.json` entries for the invariant
  core — it has no reference to `cta.heading` at all, so the es-ES/pt-PT drift goes undetected.

- **meta_title inconsistency (AC-4, AC-5).** Confirmed across both the original run and the
  independent same-day regeneration: suffix presence/absence and truncation behavior vary both
  by run and by locale (e.g. an unretried run produced a `| EXPERT3D` suffix on en-ES only;
  the fresh regeneration produced no suffix anywhere but truncated es-ES mid-word, dropping
  "Collector"). An approved meta_title spec already exists
  (`Knowledge/Issues/First_Batch/meta-titles.txt`): a single template, `{Product Name} -
  {Localized Category} {Spec}`, across every locale, with no site-name suffix.

- **Repair cost (AC-6).** `src/utils/repair-strategy.ts` already has a tiered ladder
  (`deterministic → field-scoped → block-scoped → full-regen`) via a `REPAIR_STRATEGIES` map
  keyed by rule name, with existing entries to follow as precedent. `doc-schema` (an empty
  required string) and `slug-name-designator-lost` both currently have no entry and fall through
  to full-document regeneration — a disproportionate cost for a single-field fix, and the QA
  report's own repair log shows `doc-schema` needing two full-document regeneration attempts
  because the first one fixed one empty field while a second empty field elsewhere in the
  document went untouched.

## Scope

| | |
|---|---|
| **Stores** | all of `STORE_REGISTRY` — EXPERT3D was the QA sample, but every rule here is store-generic |
| **Locales** | all — es-ES, pt-PT, uk-UA and en-ES were the QA sample, but every rule here is locale-generic |
| **Surface** | `src/services/content-orchestrator.service.ts`, `src/utils/repair-gate.ts`, `src/utils/heading-style.ts`, `src/utils/slug-validator.ts`, `src/utils/repair-strategy.ts`, and their `.spec` files |
| **Touches FROZEN files?** | Yes, with limits. The Story Owner has pre-authorized, under §9, editing `src/prompts/task-a.ts`, `task-b.ts`, `task-c.ts` and/or `src/prompt-core/master-system-prompt.ts` **specifically to disambiguate [HEADING FORM] and the invariant-core rule text** — stating explicitly which fields require the short name and which (the first §3 heading, the §9 CTA) may carry the full name (resolves OD-3/D3 below). Re-baseline `.arch-guard-checksums` in the same commit as any such edit. `src/utils/output-validator.ts` is FROZEN and **not** covered by this authorization — a real edit there is still a stop for separate explicit approval |
| **Touches generated HTML?** | No — this changes validation/repair/gate logic, not the generation prompts or renderer output shape |

## Acceptance criteria

- **AC-1:** The specs-translation call used for §7 grounding gets a retry-with-backoff (today's
  observed failure was a single, unretried attempt), so a transient provider error no longer
  disables grounding by itself. If the call still fails after retries are exhausted, the
  artifact gets `severity: 'error'` and is **hard-blocked from shipping** — `repair-gate.ts`
  must count it toward "still failing" the same as any other error-severity issue, not merely
  report it as a warning. The fix must not reintroduce a silent fallback to unverified or
  untranslated spec text (the Ortur H20 regression this design originally guarded against).
- **AC-2:** `heading-product-name-stuffing`'s full-pattern branch respects the same
  blessed-position exemption (first §3 heading, `doc.cta.heading`) as the short-pattern branch,
  so a heading correctly carrying the invariant core in one of those two allowed positions is
  never flagged.
- **AC-3:** The brand-core invariant check extends beyond `slugs.json` to `doc.cta.heading` (and
  the other §3/§9 headings exempted by AC-2), so es-ES/pt-PT dropping the invariant core there is
  caught the same way slug drift already is.
- **AC-4:** `meta_title` follows the single approved template —
  `{Product Name} - {Localized Category} {Spec}` (e.g. `Makera Cyclone Dust Collector - Colector
  de Polvo 6 L`) — identically across all four locales, with any `| {site_name}` suffix removed
  entirely rather than merely made consistent. A validation rule fails the artifact when a
  `| {site_name}` suffix is present, or when a locale's `meta_title` diverges from the template
  shape, including mid-word truncation of the product name.
- **AC-5:** A validation rule fails the artifact when `h1` and `meta_title` are byte-identical
  for the same locale — they must always differ.
- **AC-6:** `doc-schema` (empty required string) and `slug-name-designator-lost` get targeted
  ladder entries in `REPAIR_STRATEGIES`, so a repair for either no longer falls through to a
  full-document regeneration.

## Out of scope

- **Manual reconciliation of the already-shipped 2026-09-21 artifact** — re-verifying its 15 §7
  spec rows against the official datasheet, resolving its "200 W" line, hand-fixing its es-ES/pt-PT
  CTA headings, and aligning its `meta_title`. That is an operational task on one specific,
  already-delivered artifact, not a generator code change. Regenerating that product through the
  fixed pipeline is preferable to hand-editing it once this Story ships.
- **Any edit to `src/utils/output-validator.ts`.** FROZEN and not covered by the Owner's OD-3
  authorization (see Scope) — still a separate §9 stop if it turns out necessary.
- Any prompt-text rewrite beyond disambiguating which fields the short-name vs. full-name rule
  governs — the OD-3 authorization is scoped to that clarification, not a general license to
  rewrite [HEADING FORM] or the invariant-core rule's substance.

## Resolved decisions

- **D1 (was Q1/OD-1), resolved 2026-09-22 by the Story Owner:** Hard-block (fail-closed). If the
  specs-translation call behind grounding cannot be completed — even after the AC-1 retry — the
  artifact gets `severity: 'error'` and is blocked from shipping. Shipping unreviewed LLM
  translations is not acceptable. The no-silent-fallback guarantee (Ortur H20) is preserved
  unchanged. See the AC-1 wording above, which was tightened to match — the "non-suppressible
  summary line" alternative originally posed alongside hard-block is no longer live.
- **D2 (was Q2/OD-2), resolved 2026-09-22 by the Story Owner:** Moot — no further investigation
  into the es-ES `meta_title` truncation's root cause is needed. AC-4's single hard template
  removes the code path that produced it regardless of cause.
- **D3 (was Q3/OD-3), resolved 2026-09-22 by the Story Owner:** Code-only is **not** sufficient —
  a code-side exemption without a corresponding prompt-text change would leave the model
  generating content the rule then has to repair on every run, burning repair-gate attempts. The
  Owner authorizes, under AGENTS.md §9, editing `src/prompts/task-a.ts`, `task-b.ts`, `task-c.ts`
  and/or `src/prompt-core/master-system-prompt.ts` to state explicitly which fields require the
  short product name and which (first §3 heading, §9 CTA) may carry the full name — scoped to
  that disambiguation only, not a general prompt rewrite. See Scope and Out of scope above.

## References

- `Knowledge/Issues/First_Batch/QA_report_makera_cyclone_2026-09-21.md` — source QA report (all 7 findings)
- `Knowledge/Issues/First_Batch/expert3d_makera_cyclone_dust_collector_2026-09-21_2147.zip` — original artifact, `repair_gate_report.md` confirms the report's claims verbatim
- `Knowledge/Issues/First_Batch/expert3d_makera_cyclone_dust_collector_2026-09-22_1134.zip` — independent same-day regeneration used to confirm findings are reproducible, not one-off
- `Knowledge/Issues/First_Batch/meta-titles.txt` — approved meta_title template referenced by AC-4
- `src/services/content-orchestrator.service.ts:257-266` — the Ortur H20 incident comment explaining the intentional fail-open design
- `src/utils/repair-gate.ts:344,388,496,577` — where only `severity === 'error'` counts toward blocking
- `src/utils/heading-style.ts:354-367,369-393` (Doc variant) / `:137-150` (HTML variant) — the blessed-position exemption gap
- `src/utils/slug-validator.ts` — invariant-core check scoped to `slugs.json` only
- `src/utils/repair-strategy.ts` — `REPAIR_STRATEGIES` ladder map and existing entry precedent
- `AGENTS.md` §9 — FROZEN files list and the required stop-and-approve procedure
