---
artifact: clarification_report
story: US-4.1
version: 2
status: ARCHIVED
owner: so-clarifier
created_at: 2026-10-01T00:00:00Z
updated_at: 2026-10-01T00:00:00Z
supersedes: docs/evidence/US-4.1-clarification-report.md#1
inputs_consumed:
  - key: story
    version: 1
  - key: open_decisions
    version: 2
open_decisions_blocking: false
---

# US-4.1 - Clarification Report (v2)

**Verdict: Ready for Specification.** All nine v1 Open Decisions were answered by the product owner
(2026-10-01): OD-1..OD-8 RESOLVED, OD-9 PARTIALLY RESOLVED. No decision is blocking. Non-blocking
residuals R-1..R-4 are logged in `docs/decisions/US-4.1-open-decisions.md` (v2).

## What changed since v1

- v1 verdict was Not Ready (5 blocking: OD-1, OD-2, OD-3, OD-6, OD-7). Each is now resolved with the
  owner as source. Vendor facts the owner checked against the official Sonnet 5.5 page are marked
  "docs-verified"; owner choices are marked "owner judgement". This stage did not re-verify the vendor
  page itself.
- Recorded resolutions: Sonnet 5.5 levels `["between_tools","low","medium","high","xhigh","max"]`,
  `defaultLevel` `high`; `disabled` maps to `thinking {type:"between_tools"}` (no `display`, valid only at
  effort low/medium/high); Gemini 3.8 Flash levels `["low","medium","high"]`, `defaultLevel` `high`,
  Fast default `low`; no migration beyond `claude-sonnet-4-6`; new models first in their tier arrays;
  `DEFAULTS.deep.level` `high`; keep the 4.6 price entry; 128000 confirmed; active docs (AGENTS.md line 55,
  README, `.env.example`) updated, historical references untouched.

## What is clear (unchanged from v1 unless noted)

- **Intent:** Deep default becomes Sonnet 5.5, Fast default Gemini 3.8 Flash, Sonnet 4.6 retired,
  usage cost stays correct. Actor, trigger, value stated.
- **Store/locale scope:** all stores and locales; the Story names none, so nothing contradicts
  `STORE_REGISTRY`. uk-UA fan-out: the model choice changes which model writes the uk-UA master (Deep)
  and the translations (Fast); no prompt, schema or content text changes. Output quality on the new
  models is not covered by any AC (live verification out of scope).
- **Generated HTML / section 4:** unchanged by construction (no prompt, renderer or validator edit).
- **FROZEN files (section 9):** none in the Surface. Prompt impact: none.
- **Generation invariants:** not disturbed by code in Surface; out of scope.
- **Dependencies:** the Gemini 3.6 to 3.7 `restore()` migration is the precedent; `render-reconciliation`
  report concerns the Doc renderer and does not block.
- **AC-5/AC-6/AC-8:** observable and falsifiable. AC-8 is already true by construction; it needs a
  guard test only (OD-9).

## Consequences the specification must carry (no new decision taken)

- Provider: `disabled` to `between_tools` mapping; `between_tools` branch sends no `display`/budget/
  block_binding; `display:'omitted'` only on adaptive; effort only low/medium/high with `between_tools`.
- Catalog: new entries first in tier arrays; update the existing `fastModels()` order assertion.
- Defaults: `DEFAULT_SETTINGS.fast` = `FALLBACK_FAST` = `low`; `DEFAULTS.deep.level` = `high`;
  Gemini PDF/vision `minimal` snaps to `low`.
- Restore: only `claude-sonnet-4-6` migrates; level clamped via `clampLevel`.
- Pricing: exact key for `claude-sonnet-5-5` and for `gemini-3.8-flash` (own date-aware case; do not
  reuse the 3.6 key); keep `claude-sonnet-4-6`.
- Docs: AGENTS.md line 55, README, `.env.example` only.
- Existing specs hard-coding old defaults (`model-settings.service.spec.ts`, `model-catalog.spec.ts`,
  `pricing.spec.ts`, `llm-routes.spec.ts`) change where they assert current defaults, not where they
  imitate historical states.
- Verification tasks: truncation-repair and timeouts against the 128000 ceiling; timeout exposure at
  `high` (R-3).

## Non-blocking residuals (see open-decisions v2)

- R-1: `xhigh`/`max` support in the `src/` level type, and catalog `between_tools` to effort mapping.
- R-2: beta header `extended-cache-ttl-2025-04-11` unverified on 5.5.
- R-3: timeout exposure at `high`; owner's "30%+ faster" claim is an unverified assumption.
- R-4: Story AC-9 and Surface do not mention AGENTS.md; AC-1 does not state the 5.5 levels/
  `defaultLevel` or the Gemini `defaultLevel`. Recommend a Story amendment, or have so-spec-writer carry
  them as requirements. The Story was not edited.
