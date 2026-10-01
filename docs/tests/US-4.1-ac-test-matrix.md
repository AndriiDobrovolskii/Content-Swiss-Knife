---
artifact: ac_test_matrix
story: US-4.1
version: 2
status: ARCHIVED
owner: so-test-writer
created_at: 2026-10-01T00:00:00Z
updated_at: 2026-10-01T12:00:00Z
supersedes: docs/tests/US-4.1-ac-test-matrix.md (version 1, SUPERSEDED)
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 3
  - key: impact_analysis
    version: 2
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 3
  - key: plan_review
    version: 3
  - key: test_strategy
    version: 2
open_decisions_blocking: false
---

# AC <-> Test Matrix — US-4.1

Test names are the exact `it(...)` titles (a leading `FR-n:` prefix is part of the title). "RED" means the
test failed when run before implementation; "GUARD" means it passes today by construction and pins behaviour
the Specification requires to be kept (listed in the test strategy). File abbreviations:
`CAT` = `src/prompt-core/model-catalog.spec.ts`, `PRC` = `test/pricing.spec.ts`,
`ANT` = `test/anthropic-provider.spec.ts`, `GEM` = `test/gemini-provider.spec.ts`,
`RTE` = `test/llm-routes.spec.ts`, `SVC` = `src/services/model-settings.service.spec.ts`,
`CMP` = `src/app/components/model-settings/model-settings.component.spec.ts`,
`DOC` = `test/active-docs-models.spec.ts`.

| AC | Requirement | Test file | Test name | State |
|---|---|---|---|---|
| AC-1 | FR-1 | CAT | FR-1: lists claude-sonnet-5-5 as the premium first anthropic model with exactly the five Sonnet 5.5 levels (no max) | RED (v2: levels toEqual five) |
| AC-1 | FR-2 | CAT | FR-2: lists gemini-3.8-flash as the first fast gemini model with low/medium/high and no minimal | RED |
| AC-1 | FR-2 | CAT | excludes minimal from Gemini 3.1 Pro and 3.8 Flash but keeps it on 3.6 and 3.7 Flash | RED |
| AC-1 | FR-4 | CAT | FR-4: snaps disabled to between_tools on claude-sonnet-5-5 | RED |
| AC-1 | FR-4 | CAT | FR-4: snaps minimal up to low on claude-sonnet-5-5 (tie resolves upward) | RED (asserts model exists) |
| AC-1 | FR-4 | CAT | FR-4: returns every one of the five claude-sonnet-5-5 levels unchanged | GUARD (v2: max removed from the loop) |
| AC-1 | FR-4 | CAT | FR-4: resolves an unknown level to the model default on claude-sonnet-5-5 | GUARD |
| AC-1 | FR-4 / FR-8 | CAT | FR-4 / FR-8: snaps minimal and disabled to low on gemini-3.8-flash | RED (asserts model exists) |
| AC-1 | FR-4 | CAT | FR-4: keeps the existing outcomes on the other catalog models | RED (new `xhigh`/`max`/`between_tools` vocabulary) |
| AC-1 | FR-4 | CAT | FR-4: never produces a level outside the target model levels and never throws | GUARD |
| AC-1 | FR-4a | CAT | FR-4a: client and server agree on the new models for every probe level | RED |
| AC-1 | FR-4a | CAT | matches the server implementation on every level/model pair (probes widened) | GUARD until T1 only; red-for-new-levels coverage is the row above |
| AC-1 | FR-4a | RTE | FR-4: clamps a stale disabled level on claude-sonnet-5-5 to between_tools | RED |
| AC-1 | FR-1 | RTE | resolves the new Sonnet at 128000 output tokens with an xhigh level unchanged | RED |
| AC-1 | FR-1 (ceiling) | CAT | carries the model output ceiling through for the providers to use | RED |
| AC-1 | FR-4 (UI) | CMP | sizes the Deep slider to the five Sonnet 5.5 levels (steps 0..4) and starts it on High | RED (v2: max attribute 4) |
| AC-1 | FR-4 (UI) | CMP | labels the Deep scale ends in English: Between tools ... Extra high, with no Max label and no raw level id | RED (v2) |
| AC-1 | FR-4 (UI) | CMP | shows Extra high and drives setDeepLevel when the user slides to the top (fifth, index 4) step | RED |
| AC-1 | FR-4 (UI) | CMP | shows Between tools and drives setDeepLevel when the user slides to the first step | RED |
| AC-1 | FR-4 (UI) | CMP | has no step beyond Extra high: the top step is index 4 and never reads Max | RED (v2, replaces the Max step test) |
| AC-1 | FR-4 (UI) | CMP | renders Ukrainian text, not English and not the raw id, for the new levels | RED |
| AC-1 | FR-2 (UI) | CMP | sizes the Fast slider to the three Gemini 3.8 Flash levels (no Minimal) and starts it on Low | RED |
| AC-2 | FR-3 | CAT | FR-3: no longer contains claude-sonnet-4-6 | RED |
| AC-2 | FR-3 | CAT | FR-3: keeps the other models selectable with their existing values | GUARD |
| AC-2 | FR-3 (UI) | CMP | offers claude-sonnet-5-5 in the Deep model list and no longer offers claude-sonnet-4-6 | RED |
| AC-2 | FR-3 (UI) | CMP | offers gemini-3.8-flash in the Fast model list when Fast runs on Gemini | RED |
| AC-2 | FR-3 | SVC | offers each slot only its own provider models | RED |
| AC-3 | FR-5 | SVC | ships the mixed Anthropic-deep / Gemini-fast configuration | RED |
| AC-3 | FR-5 | SVC | runs the fast slot at low thinking, not the catalog default of high | RED |
| AC-3 | FR-5 | SVC | FR-5: starts the deep slot at a level claude-sonnet-5-5 accepts | RED |
| AC-3 | FR-5 | SVC | lands a provider switch on a model of the slot own tier | RED |
| AC-3 | FR-5 | SVC | falls back to defaults when the legacy provider is unknown | RED |
| AC-3 | FR-5 | CAT | FR-5: tier fallbacks land on the new models by catalog position; gemini deep default unchanged | RED |
| AC-3 | FR-5 | CAT | falls back to a fast-tier model for the fast slot / falls back to a premium model for the deep slot | RED |
| AC-3 | FR-5 / NFR-6 | GEM | NFR-6: matches the client Fast-slot default in provider, model and level | RED |
| AC-3 | FR-5 | RTE | FR-5: resolves a request with no settings to the new Fast and Deep catalog defaults per provider | RED |
| AC-4 | FR-6 | ANT | resolves to claude-sonnet-5-5 when ANTHROPIC_MODEL_THINKING is unset | RED |
| AC-4 | FR-6 | ANT | uses the set value when ANTHROPIC_MODEL_THINKING is set | GUARD |
| AC-4 | FR-6 | ANT | does not build a fallback when the configured slot already is the fallback model (slot = 5.5) | RED |
| AC-4 | FR-6 | ANT | invokes the fallback against the alternate model and logs both model names (expects 5.5) | RED |
| AC-4 | FR-7 | GEM | runs a slot-less fast call on gemini-3.8-flash at low, never minimal | RED |
| AC-4 | FR-7 | GEM | runs slot-less pdf extraction and vision on gemini-3.8-flash without minimal | RED |
| AC-4 | FR-7 | GEM | builds no fallback when a fast slot already is gemini-3.8-flash | RED |
| AC-4 | FR-7 | GEM | falls back to gemini-3.8-flash at low when a fast call on 3.6 Flash exhausts its retry budget | RED |
| AC-4 | FR-7 | GEM | keeps the slot-less deep fallback on gemini-3.1-pro-preview | GUARD |
| AC-4 | FR-8 | GEM | clamps a pdf extraction to low, not minimal | GUARD (clamp already runs; green after catalog change only) |
| AC-4 | FR-8 | GEM | clamps a generate slot that carries minimal to low | RED |
| AC-4 | FR-8 | GEM | clamps a vision slot that carries minimal to low | RED |
| AC-4 | FR-8 | GEM | does not throw and still returns the answer when it clamps | GUARD |
| AC-4 | FR-8 | GEM | leaves minimal untouched on models that support it | GUARD |
| AC-4 | FR-8 | RTE | FR-8: clamps minimal to low for gemini-3.8-flash | RED |
| AC-4 | FR-8 | RTE | falls back to a same-tier catalog model when the requested model is unknown (3.8) | RED |
| AC-5 | FR-13 | PRC | prices claude-sonnet-5-5 at 2.00 / 10.00 / 4.00 (1h cache write) / 0.20 | GUARD (a substring match yields the same numbers today) |
| AC-5 | FR-13 | PRC | has an exact entry of its own, not a substring match on claude-sonnet-5 | RED |
| AC-5 | FR-13 | PRC | does not return FALLBACK_PRICE | GUARD |
| AC-5 | FR-13 | PRC | prices a dated claude-sonnet-5-5 id with the same rates | GUARD |
| AC-5 | FR-13 | PRC | computes cost for 1M tokens of each kind from the 5.5 entry | GUARD |
| AC-5 | FR-15 | PRC | returns its own entry, not the claude-sonnet-4 cache-write rate | GUARD |
| AC-6 | FR-14 | PRC | charges the promo rate one millisecond before the cutover (injected instant) | RED |
| AC-6 | FR-14 | PRC | charges the standard rate exactly at the cutover (injected instant) | RED |
| AC-6 | FR-14 | PRC | charges the promo rate before the cutover (system clock) | RED |
| AC-6 | FR-14 | PRC | charges the standard rate at the cutover (system clock) | RED |
| AC-6 | FR-14 | PRC | reads the clock at each lookup, not at module load | RED |
| AC-6 | FR-14 | PRC | never falls through to FALLBACK_PRICE | RED |
| AC-6 | FR-14 | PRC | prices cost from the dated entry (promo) for 1M tokens of each kind | RED |
| AC-7 | FR-9 | SVC | moves a stored claude-sonnet-4-6 Deep slot onto claude-sonnet-5-5 | RED |
| AC-7 | FR-9 | SVC | persists the corrected settings | RED |
| AC-7 | FR-9 / FR-4 | SVC | keeps a stored level the new model accepts (medium stays medium) | RED (model assertion) |
| AC-7 | FR-9 / FR-4 | SVC | clamps a stored disabled level to between_tools on the migrated model | RED |
| AC-7 | FR-9 / FR-4 | SVC | clamps a stored minimal level to low on the migrated model | RED |
| AC-7 | FR-9 | SVC | migrates a claude-sonnet-4-6 selection in any slot, not only Deep | RED |
| AC-7 | FR-9 | SVC | migrates a claude-sonnet-4-6 selection stored in the legacy single-provider shape | RED |
| AC-7 | FR-9 | SVC | never leaves a model id that is absent from the catalog after migrating | RED |
| AC-7 | FR-9 (OD-3) | SVC | does not migrate a stored claude-sonnet-5, gemini-3.7-flash or gemini-3.6-flash selection | RED |
| AC-7 | FR-9 (OD-3) | SVC | no longer migrates a stored gemini-3.6-flash fast model | RED |
| AC-7 | FR-9 | SVC | keeps a stored claude-sonnet-5-5 selection and a level it lists untouched | GUARD (v2: stores xhigh) |
| AC-7 | FR-9 | SVC | resolves an unknown stored model to a catalog model of the slot tier, never an absent id | RED |
| AC-7 | FR-9 | SVC | does not throw when persisting the migration fails | RED |
| AC-7 | FR-9 | SVC | reads a single top-level provider as the provider of both slots | RED |
| AC-7 | FR-9 (server side) | RTE | FR-9: resolves a stale claude-sonnet-4-6 deep slot to a premium catalog model, not an absent id | RED |
| AC-8 | FR-10 | ANT | FR-10: sends thinking between_tools with no output_config, display, budget_tokens or block_binding | RED |
| AC-8 | FR-10 | ANT | FR-10: maps a level of disabled (request that bypassed the clamp) to between_tools, never disabled | RED |
| AC-8 | FR-10 | ANT | FR-10: never combines between_tools with effort, and never sends disabled, in any generate mode or level | RED |
| AC-8 | FR-10 | ANT | FR-10: keeps thinking disabled on models that still use it (Haiku, Sonnet 5) | GUARD |
| AC-8 | FR-10 | ANT | FR-10: pins pdf extraction to between_tools on claude-sonnet-5-5, never disabled | RED |
| AC-8 | FR-10 | ANT | FR-10: keeps pdf extraction on disabled for Haiku | GUARD |
| AC-8 | FR-10a | ANT | FR-10a: sizes max_tokens for a no-thinking caption at level disabled / between_tools | RED |
| AC-8 | FR-10a | ANT | FR-10a: keeps the thinking-enabled caption budget at high | GUARD |
| AC-8 | FR-10a | ANT | FR-10a: never exceeds the model ceiling on a small-ceiling model | GUARD |
| AC-8 | FR-10a | ANT | FR-10a: leaves the Haiku no-thinking caption shape unchanged | GUARD |
| AC-8 | FR-11 | ANT | FR-11: sends adaptive thinking, display omitted and exactly effort low / medium / high / xhigh | GUARD (v2: max removed) |
| AC-8 | FR-11 | ANT | FR-11: maps minimal onto low effort on claude-sonnet-5-5 | GUARD |
| AC-8 | FR-12 | ANT | FR-12: carries no sampling fields and no forced tool_choice at level between_tools / low / medium / high / xhigh | GUARD (the Specification states it holds by construction, OD-9) |
| AC-8 | FR-12 | ANT | FR-12: carries the same guard on the cache-free (plain endpoint) request | GUARD |
| AC-8 | NFR-7 / NFR-2 | ANT | NFR-7 / NFR-2: keeps the 1h-cache beta header and the cache breakpoints on claude-sonnet-5-5 | GUARD |
| AC-1 | FR-4 / FR-4a (v2, D1'/D2') | CAT | FR-4: snaps max to xhigh on claude-sonnet-5-5 on client and server | RED |
| AC-1 | FR-4 (v2) | CAT | FR-4: anthropic claude-sonnet-5-5 clamps max to xhigh on client and server (it.each row; sibling rows: sonnet-5 high, gemini 3.1 Pro / 3.8 / 3.7 / 3.6 high, haiku disabled) | RED for 5.5, GUARD for the other rows |
| AC-1 | FR-1 (v2, D1') | CAT | D2: no catalog model lists max as a level | RED |
| AC-1 | FR-4a (v2, F-4) | CAT | FR-4a: for every model x probe level, result is in the model levels, client == server, and a member level is unchanged | GUARD |
| AC-1 | FR-4 / FR-4a (v2, D12) | CAT | AC-1: the route-level resolver maps a max slot on claude-sonnet-5-5 to xhigh with the 128000 ceiling | RED |
| AC-1 | FR-4 (v2, D12) | RTE | FR-4: resolves a max level on claude-sonnet-5-5 to xhigh at 128000 output tokens | RED |
| AC-7 | FR-9 (v2, D8') | SVC | restores a stored claude-sonnet-5-5 max level as xhigh | RED |
| AC-7 | FR-9 / FR-4 (v2) | SVC | migrates a stored claude-sonnet-4-6 at max to claude-sonnet-5-5 at xhigh and persists it | RED |
| AC-1 | FR-1 / FR-4 (v2) | SVC | exposes the five Sonnet 5.5 levels as selectable deep levels | RED |
| AC-1 | FR-4 (v2) | SVC | clamps setDeepLevel(max) on Sonnet 5.5 to xhigh | RED |
| AC-8 | FR-11 (v2, D3') | ANT | FR-11: a slot with level max that bypassed the clamp sends xhigh via generate | RED |
| AC-8 | FR-11 (v2) | ANT | FR-11: a slot with level max that bypassed the clamp sends xhigh via analyzeImage | RED |
| AC-8 | FR-11 (v2) | ANT | FR-11: the FALLBACK_DEEP slot with ANTHROPIC_THINKING_EFFORT=max sends xhigh | RED |
| AC-8 | FR-11 (v2) | ANT | FR-11: an id absent from the catalog with level max sends xhigh | RED |
| AC-8 | FR-11 (v2) | ANT | FR-11: no claude-sonnet-5-5 request body contains effort max at any input level | RED |
| AC-8 | FR-11 (v2) | ANT | FR-11: passes max through unchanged when the model catalog entry lists max (mocked findModel) | GUARD (mock seam, see strategy) |
| AC-8 | FR-10 / FR-11 (v2) | ANT | FR-10: never combines between_tools with effort, and never sends disabled, in any generate mode or level (now also feeds max and asserts effort is never max) | RED (v2) |
| AC-9 | FR-16 | DOC | README.md shows claude-sonnet-5-5 as the ANTHROPIC_MODEL_THINKING example | RED |
| AC-9 | FR-16 | DOC | .env.example sets ANTHROPIC_MODEL_THINKING to claude-sonnet-5-5 | RED |
| AC-9 | FR-16 | DOC | .env.example no longer describes Sonnet 5 on Deep and Gemini 3.7 Flash on Fast as the defaults | RED |
| AC-9 | FR-16 | DOC | AGENTS.md LLM-providers row names claude-sonnet-5-5 as the Anthropic target | RED |
| AC-9 | FR-16 | DOC | names claude-sonnet-4-6 in no active doc or default | GUARD |
| AC-10 | FR-17 | none | no unit test: the QUALITY_GATE runs `npm test` (both runners), `npm run lint`, `npm run build`, `bash arch-guard.sh` | n/a |

Rows tagged "(v2)" are the spec v3 rework (T11/T12). Rows whose title changed in v2 replace their v1 title; the old six-level / `max` titles no longer exist.

## Notes for the reconciliation reviewer

- The Anthropic `FR-11`, `FR-12` and `FR-10a` thinking-branch rows are GUARD by design: the current provider
  already emits that shape for any `low..max` level. The RED rows in the same `describe` blocks
  (`between_tools`, `disabled` mapping, `analyzeImage`/`extractFromPdf` shape, FR-6 fallback) are what
  demand the implementation.
- Requirements with no direct Story AC (FR-4a, FR-10a, FR-15, the AGENTS.md part of FR-16, NFR-6, NFR-7)
  are covered by the rows above and are traced in the Specification to recorded owner decisions.
- FR-8 on the vision and generate paths is asserted at the provider (direct call with a `minimal` slot), as
  the T7 acceptance check states; see the report's finding on plan D6.
