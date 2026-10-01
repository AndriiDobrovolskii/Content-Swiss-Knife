---
artifact: open_decisions
story: US-4.1
version: 2
status: ARCHIVED
owner: so-clarifier
created_at: 2026-10-01T00:00:00Z
updated_at: 2026-10-01T00:00:00Z
supersedes: docs/decisions/US-4.1-open-decisions.md#1
inputs_consumed:
  - key: story
    version: 1
  - key: open_decisions
    version: 1
open_decisions_blocking: false
---

# US-4.1 - Open Decisions (v2)

v2 records the product owner's answers (product owner, 2026-10-01, confirmed explicitly in-session).
Every v1 decision is carried forward with its original question text; none is dropped. The skill
recorded the answers as given; it decided nothing itself.

Status: OD-1, OD-2, OD-3, OD-4, OD-5, OD-6, OD-7, OD-8 RESOLVED. OD-9 PARTIALLY RESOLVED.
Blocking: none. Non-blocking residuals are listed in "Residual items" below.

Source legend: "docs-verified" = checked by the owner against the official page
https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5.
"owner judgement" = the owner's own decision, not a vendor fact.

---

## OD-1 (was blocking) - RESOLVED - Thinking levels and default level of `claude-sonnet-5-5` (Story Q1)

- **Question (original):** Which `levels` and `defaultLevel` does the `claude-sonnet-5-5` catalog entry
  carry, and is `thinking: { type: "disabled" }` (sent for level `disabled` and unconditionally by
  `extractFromPdf`) valid on this model?
- **Resolution (product owner, 2026-10-01):**
  - `claude-sonnet-5-5` catalog `levels`: `["between_tools","low","medium","high","xhigh","max"]`;
    catalog `defaultLevel`: `"high"`.
  - `thinking: { type: "disabled" }` is INVALID on 5.5 (HTTP 400). Source: docs-verified.
  - The provider MUST map the catalog level `disabled` (from stored settings or from `extractFromPdf`)
    to `thinking: { type: "between_tools" }`.
- **Constraints recorded (docs-verified corrections):**
  - `between_tools` is a value of the `thinking` field, NOT an effort level.
  - It accepts no other fields: `display`, `budget_tokens`, `block_binding` => HTTP 400. Therefore the
    `between_tools` branch MUST NOT send `display: 'omitted'`.
  - It is valid only at effort `low`, `medium` or `high`; at `xhigh` or `max` => HTTP 400.
- **Open sub-point (non-blocking, NOT decided here; the spec must settle it):** whether the
  catalog/TypeScript level type in `src/` supports `xhigh` and `max`, and how a catalog level
  `between_tools` maps to an effort (omitting effort => default `high`, which is allowed). See R-1.

## OD-2 (was blocking) - RESOLVED - Default Fast level and catalog `defaultLevel` for `gemini-3.8-flash` (Story Q2)

- **Question (original):** What level does the Fast slot default to (`DEFAULT_SETTINGS.fast` and
  `FALLBACK_FAST` in `gemini.js`), and what is the entry's catalog `defaultLevel`?
- **Resolution (owner judgement, 2026-10-01):** `gemini-3.8-flash` `levels`: `["low","medium","high"]`;
  catalog `defaultLevel`: `"high"`; Fast-slot default (`DEFAULT_SETTINGS.fast` and `FALLBACK_FAST`) =
  `"low"`. Gemini PDF/vision calls `clampLevel('gemini', model, 'minimal')` must snap to `"low"`
  (confirmed intended; resolves the v1 sub-question).
- **Consequence for spec:** client `DEFAULT_SETTINGS.fast` and server `FALLBACK_FAST` must stay equal
  (`model-settings.service.ts` invariant). Catalog `defaultLevel` (`high`) intentionally differs from the
  Fast-slot default (`low`).

## OD-3 (was blocking) - RESOLVED - Migration of stored settings other than `claude-sonnet-4-6` (Story Q3)

- **Question (original):** Is a stored Fast slot on `gemini-3.7-flash`/`gemini-3.6-flash`, or a stored
  Deep slot on `claude-sonnet-5`, migrated to the new defaults or left alone?
- **Resolution (owner judgement, 2026-10-01):** Do NOT migrate stored Sonnet 5 or Gemini 3.7/3.6
  choices (AC-2 keeps them selectable). Migrate only a stored `claude-sonnet-4-6` to `claude-sonnet-5-5`
  (AC-7). A stored level unsupported by the target model snaps to the nearest valid level via
  `clampLevel`.

## OD-4 (non-blocking) - RESOLVED - Keep or delete `claude-sonnet-4-6` in `DEFAULT_PRICES` (Story Q4)

- **Question (original):** Delete the entry from `server/usage/pricing.js` or keep it?
- **Resolution (owner judgement, 2026-10-01):** KEEP the `claude-sonnet-4-6` entry. Rationale (code
  fact from v1, still valid): removal would make `getPrices('claude-sonnet-4-6')` substring-match
  `claude-sonnet-4` with a wrong cache-write rate (3.75).

## OD-5 (non-blocking) - RESOLVED - `maxOutputTokens` 128000 for the Deep slot (Story Q5)

- **Question (original):** Is 128000 intended, given Sonnet 5 stays at 64000 and the truncation repair
  path is tuned to the old ceiling?
- **Resolution (2026-10-01):** 128000 confirmed. Source: docs-verified (official docs state 128K).
- **Consequence for spec/plan:** truncation-repair logic and `server/utils/timeouts.js` must be verified
  against the 128000 ceiling (verification task, not a decision).

## OD-6 (was blocking) - RESOLVED - Catalog entry order and selection-by-tier fallbacks

- **Question (original):** Where do `claude-sonnet-5-5` and `gemini-3.8-flash` sit in
  `model-catalog.json`, and how should tier fallbacks resolve?
- **Resolution (owner judgement, 2026-10-01):** `claude-sonnet-5-5` is FIRST in the anthropic `models`
  array (tier `premium`). `gemini-3.8-flash` is FIRST among the tier `fast` entries of the gemini
  provider. Note: catalog tiers are `premium` and `fast`; there is no `standard` tier.
  `defaultModel()`, `pick()` and `resolveSlot()` then return the new models without extra logic.
- **Consequence for spec:** the existing `fastModels()` order assertion in the catalog spec must be
  updated to the new order.

## OD-7 (was blocking) - RESOLVED (owner judgement) - Deep default thinking level

- **Question (original):** What is `DEFAULTS.deep.level` for Sonnet 5.5 (currently `medium`; the Story's
  context notes Anthropic's documented default effort is `high`)?
- **Resolution (owner judgement, 2026-10-01):** `DEFAULTS.deep.level = "high"`.
- **Unverified assumption (NOT a fact):** the owner's rationale that 5.5 is "30%+ faster than Sonnet 5"
  was NOT found in the official docs. The docs say effort levels are recalibrated versus Sonnet 5
  (re-run an effort sweep) and suggest starting at `high` unless the workload is agentic or
  latency-sensitive.
- **Residual risk for spec/plan:** `server/utils/timeouts.js` records an attempt at `high` exceeding
  600 s on Sonnet 4.6. Timeout exposure at `high` must be checked, not assumed away. See R-3.

## OD-8 (non-blocking) - RESOLVED - Scope of AC-9 "non-historical" and which docs are in surface

- **Question (original):** Which files must stop naming `claude-sonnet-4-6`/`Sonnet 5`/`3.7 Flash`?
- **Resolution (owner instruction, 2026-10-01):** Update the active docs: `AGENTS.md` line 55 (explicit
  owner instruction to edit AGENTS.md for this reference only), `README.md`, `.env.example`.
  Do NOT touch historical references: `timeouts.js` comments, and spec fixtures/log strings that imitate
  past states.
- **Note:** AGENTS.md is the repository authority; this edit is authorised by the owner for this one
  reference and for nothing else in that file.

## OD-9 (non-blocking) - PARTIALLY RESOLVED - Sonnet 5.5 request-shape assumptions

- **Question (original):** Is `betas: ['extended-cache-ttl-2025-04-11']` and `display: 'omitted'` still
  valid on Sonnet 5.5, and does AC-8's "no forced `tool_choice`/sampling params" need a new test or is
  it already true?
- **Resolved (2026-10-01):**
  - `display: 'omitted'` stays valid with adaptive thinking ONLY, NOT with `between_tools`
    (docs-verified; see OD-1).
  - AC-8 needs a guard test only: no `tool_choice` of `any`/`tool`, and no `temperature`/`top_p`/`top_k`
    in the request (already true by construction in `server/providers/anthropic.js`).
- **Still open (non-blocking; unverified assumption the spec must state):** the beta header
  `extended-cache-ttl-2025-04-11` is NOT mentioned in the Sonnet 5.5 docs. Treated as an unverified
  assumption. See R-2.

---

## Residual items (all non-blocking)

- **R-1 (from OD-1):** The spec must settle (a) whether the `src/` catalog/TypeScript level type
  supports `xhigh` and `max`, and (b) how a catalog level `between_tools` maps to an effort (omit effort
  => default `high`, allowed). Not decided by this stage.
- **R-2 (from OD-9):** Beta header `extended-cache-ttl-2025-04-11` on 5.5 is an unverified assumption;
  the spec should state it explicitly.
- **R-3 (from OD-7):** Timeout exposure at `high` on 5.5 (history: >600 s attempt at `high` on 4.6) and
  the "30%+ faster" claim are unverified; the plan must include a check.
- **R-4 (Story gaps; recommendation only, Story not edited):** Story AC-9 and Surface do not mention
  `AGENTS.md`, and AC-1 does not state the 5.5 `levels`/`defaultLevel` or the Gemini `defaultLevel`.
  Recommend a Story amendment, or that so-spec-writer carry these as explicit requirements.
