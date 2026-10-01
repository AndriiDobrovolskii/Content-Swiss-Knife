---
artifact: test_strategy
story: US-4.1
version: 2
status: ARCHIVED
owner: so-test-writer
created_at: 2026-10-01T00:00:00Z
updated_at: 2026-10-01T12:00:00Z
supersedes: docs/tests/US-4.1-test-strategy.md (version 1, SUPERSEDED)
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
open_decisions_blocking: false
---

> **v2 (spec v3 rework).** Statements below that mention six Sonnet 5.5 levels, or `max` selectable or sent on 5.5, are SUPERSEDED by the "v2 rework" section at the end; everything else stands.

# Test Strategy — US-4.1: Add Claude Sonnet 5.5 and Gemini 3.8 Flash, make them the defaults, retire Sonnet 4.6

Story track: server. Every new or changed test below is written from the Specification's requirements
(FR/NFR) and the approver's notes (OQ-1 clamp outcomes confirmed; Fast default `low` vs catalog
`defaultLevel` `high` accepted; T2's label assertions live in T4's component spec), not from the
implementation the plan proposes. All of it was run before this report and fails for the reasons recorded
in the test generation report.

## Runners and files

| Level | Runner | File | Kind |
|---|---|---|---|
| Catalog content, clamp (client + server), parity | `test:logic` | `src/prompt-core/model-catalog.spec.ts` | existing file extended, existing tier-fallback and ceiling assertions updated to the new defaults |
| Pricing (exact 5.5 entry, date-aware 3.8, retained 4.6) | `test:logic` | `test/pricing.spec.ts` | existing file extended |
| Anthropic request shape, fallback, vision/pdf | `test:logic` | `test/anthropic-provider.spec.ts` | existing file extended, the existing same-provider fallback assertions updated |
| Gemini fallback, `minimal` clamp, client/server Fast parity | `test:logic` | `test/gemini-provider.spec.ts` | existing file extended |
| Server request boundary (`llm-request.js` slot resolution) | `test:logic` | `test/llm-routes.spec.ts` | existing file extended, the same-tier unknown-model assertion updated |
| Settings service defaults and restore migration | `test:logic` | `src/services/model-settings.service.spec.ts` | existing file extended, existing assertions updated, 3.6 -> 3.7 migration test inverted |
| Settings UI: six-step Sonnet 5.5 slider, EN/UK labels, model list | `test:components` | `src/app/components/model-settings/model-settings.component.spec.ts` | existing file extended (`*.component.spec.ts`) |
| Active documentation (AC-9) | `test:logic` | `test/active-docs-models.spec.ts` | new file |

No new service spec uses `Injector.create`: `ModelSettingsService` has no `inject()` and the existing spec
constructs it directly; that pattern is kept. The only component spec is the existing
`model-settings.component.spec.ts` with TestBed under `test:components`.

## What each level proves

- **Catalog (FR-1, FR-2, FR-3).** Exact values from the Specification: ids, tier, `levels` (set AND order),
  `defaultLevel`, `maxOutputTokens`, first-position, no `minimal` on 3.8, 4.6 absent from both client and
  server views, the five remaining models unchanged.
- **Clamp (FR-4, FR-4a).** Outcomes asserted on BOTH the client and the server implementation:
  `disabled` -> `between_tools` and `minimal` -> `low` on `claude-sonnet-5-5`, member passthrough for all six
  levels, unknown -> `high`, `minimal`/`disabled` -> `low` on 3.8, every pre-existing outcome unchanged
  (including `xhigh`/`max` on the old models), and an invariant over every catalog model and probe level
  (result is always in `levels`, never throws). The existing parity test is widened to probe
  `between_tools`, `xhigh`, `max`.
- **Defaults (FR-5, FR-6, FR-7, NFR-6).** Client defaults via the real `ModelSettingsService`; server
  fallbacks observed through what the real providers send to the mocked SDK (slot-less call); client Fast
  default equals the server Fast fallback in provider, model and level.
- **`minimal` clamp on Gemini calls (FR-8).** `generate`, `analyzeImage`, `extractFromPdf` and the
  route-level `resolveRequest` all send `low`, never `minimal`, to `gemini-3.8-flash`; models that support
  `minimal` are unchanged.
- **Restore (FR-9).** Real `ModelSettingsService` over real `localStorage`: 4.6 -> 5.5 in Deep, in any slot
  and in the legacy single-provider shape; persisted; level clamped (`disabled` -> `between_tools`,
  `minimal` -> `low`, `medium`/`high`/`xhigh` kept); Sonnet 5, 3.7, 3.6 NOT migrated; unknown id resolves to
  a catalog model; storage failure never throws.
- **Anthropic request shape (FR-10, FR-10a, FR-11, FR-12).** Real `AnthropicProvider`, mocked SDK: for
  `claude-sonnet-5-5`, `between_tools` carries no `output_config`/`display`/`budget_tokens`/`block_binding`;
  a `disabled` level maps to `between_tools`; `low..max` map to adaptive + `display: 'omitted'` + effort;
  `minimal` -> `low`; across 4 modes x 8 levels no request ever has `thinking.type: 'disabled'` or
  `between_tools` + effort; no `temperature`/`top_p`/`top_k`/forced `tool_choice` at any level; `analyzeImage`
  `max_tokens` is 1000 at `disabled`/`between_tools`, <= `maxOutputTokens`, thinking branch (8000) unchanged;
  `extractFromPdf` sends `between_tools`; Haiku and Sonnet 5 keep `disabled`.
- **Pricing (FR-13, FR-14, FR-15, NFR-5).** Exact entry for 5.5 (own-property check plus values, plus a
  dated-id variant), 3.8 promo/standard on both sides of 2027-01-01T00:00:00Z (one millisecond before / at),
  via both the injected instant and the frozen system clock, clock read per lookup, `computeCost`; 4.6 kept.
- **Settings UI (FR-4 labels, AC-1/AC-2).** Through the rendered component: Deep slider has six steps and
  starts on High, Fast slider has three (no Minimal), EN labels "Between tools" / "Extra high" / "Max"
  appear, UK renders Cyrillic text that is neither the EN label nor the raw id, sliding drives
  `setDeepLevel`, the Deep model list is `[5.5, 5, haiku]` with no 4.6.
- **Docs (FR-16 / AC-9).** README, `.env.example` and `AGENTS.md` line 55 name `claude-sonnet-5-5`; none
  of the three names `claude-sonnet-4-6`.

## Existing assertions modified (not weakened)

Every modification moves an assertion to the new default the Specification fixes; none is deleted, skipped
or loosened. `fastModels()` order now includes 3.8 Flash (FR-16); tier fallbacks now expect 5.5 / 3.8;
the 3.6 -> 3.7 migration tests are inverted to assert no migration (OD-3); the Anthropic fallback tests move
to `claude-sonnet-5-5` while keeping a `claude-sonnet-4-6` slot as a stale-client input (a historical state,
OD-8). Tests of unrelated models (Haiku, Sonnet 5, 3.1 Pro, 3.6/3.7 Flash) are untouched.

## Deliberately NOT unit-tested

- **Live vendor behaviour** (HTTP 400 on `disabled`, beta header validity on 5.5, "30%+ faster", output
  quality of the new models): out of scope per the Specification; NFR-7/NFR-8 are unverified assumptions.
  The beta header and cache-block shape are pinned only as "still sent" regression guards.
- **NFR-8 timeout / truncation exposure at `high`** (T10): read-only verification, no behaviour change.
- **AC-10 / FR-17** (lint, both runners, build, arch-guard): the QUALITY_GATE's command run, not a test.
- **Stale `claude-sonnet-5` pricing comment, `AGENTS.md` lines other than 55, historical references**: out
  of scope; the docs spec checks only the named lines/keys.
- **Fixtures:** no new fixture. The corpus triples are not touched (no prompt/render change).

## Pass-by-design guards (green before implementation)

A few assertions hold today and are kept on purpose as regression guards of behaviour the Specification
requires to be preserved (FR-3 other models, FR-12 sampling/tool_choice fields and FR-11 effort levels on
5.5 by construction, FR-15 4.6 price entry, NFR-7/NFR-2 header and cache blocks, Haiku/Sonnet 5 `disabled`).
Each lives in a group whose other assertions are red.

## v2 rework (specification v3: Sonnet 5.5 has five levels, `max` is not one of them)

Written from spec v3 / plan v2 (D1', D2', D3', D8', D12) and task breakdown T11-T13, before any T11/T12
production code. A deliberate replacement of v2-spec assertions, not a weakening (AGENTS.md section 7.7);
each replaced `max` assertion has a stronger v3 counterpart. The spec edits are not committed here; the
builder commits them with the green production task.

| Spec file | Runner | v2 rework |
|---|---|---|
| `src/prompt-core/model-catalog.spec.ts` | test:logic | FR-1: 5.5 `levels` toEqual exactly five, no `max`; "every level unchanged" over five; `max` -> `xhigh` on client and server; new group: explicit `max` rows (5.5 `xhigh`, Sonnet 5 `high`, Gemini 3.1 Pro / 3.8 / 3.7 / 3.6 `high`, Haiku `disabled`), "no catalog model lists `max`", parity invariant over every model x probe level (result in the model's levels, client == server, member probe unchanged), resolver row `max` -> `xhigh` at 128000 |
| `src/services/model-settings.service.spec.ts` | test:logic | stored 5.5 `max` restores as `xhigh`; 4.6 + `max` migrates to 5.5/`xhigh` and persists; five-level loop with `deepSpec().levels` toEqual; `setDeepLevel('max')` -> `xhigh`; the kept-untouched test now stores `xhigh` |
| `src/app/components/model-settings/model-settings.component.spec.ts` | test:components | Deep slider `max` attribute `'4'` (five steps); no "Max" label; top step `'4'` = `xhigh` reads "Extra high"; step `'5'` case removed; UK loop covers steps 0 and 4 |
| `test/anthropic-provider.spec.ts` | test:logic | `SONNET_55_LEVELS` five; `it.each` sends exactly low/medium/high/xhigh; new group "never sends effort max": bypassed-clamp slot via `generate` and `analyzeImage`, `FALLBACK_DEEP` with `ANTHROPIC_THINKING_EFFORT=max`, id absent from catalog, no 5.5 request body contains `"effort":"max"` at any input level; the FR-10 matrix also feeds `max` and asserts effort is never `max` |
| `test/llm-routes.spec.ts` | test:logic | one new case: slot `{claude-sonnet-5-5, max}` -> `{level:'xhigh', maxOutputTokens:128000}` on the `resolveRequest` route path (D12); the `xhigh` case is kept |

**Mock seam for the #effort pass-through branch (decision).** After T11 no catalog model lists `max`, so
the branch "model lists `max` -> `max` passes through" of `#effort` is reachable only by overriding
`findModel`. The cost is small, so it is tested, not omitted: `test/anthropic-provider.spec.ts` wraps
`server/providers/model-support.js` with `vi.mock(..., importOriginal)` - the real `findModel` by default and
a per-test override (`findModelOverride`, reset in `afterEach`) for one fake id `claude-fake-max` whose
levels include `max`. The provider under test stays real; `resolveSlot` inside the module keeps its own
binding to the real `findModel`. This single test is a GUARD (green before and after T12): it pins the
branch contract and goes red only if the builder hard-codes `max` -> `xhigh`.

**Parity invariant (replaces the "model lists `max` returns `max`" clause, plan D2').** For every catalog
model x probe in `disabled, between_tools, minimal, low, medium, high, xhigh, max, turbo, undefined`: the
result is in that model's `levels`, client == server, and a probe that is a member is returned unchanged.
It is a GUARD today (it holds for the old data too); the RED rows beside it (`levels` toEqual five, no model
lists `max`, `max` -> `xhigh`) carry the demand.

Runner boundary unchanged: the component spec is `*.component.spec.ts` (ng test); every other file runs
under vitest. No new fixtures; `ModelSettingsService` keeps direct construction (no `inject()`).
