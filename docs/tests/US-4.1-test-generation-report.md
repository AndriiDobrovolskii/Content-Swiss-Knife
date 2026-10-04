---
artifact: test_generation_report
story: US-4.1
version: 2
status: ARCHIVED
owner: so-test-writer
created_at: 2026-10-01T00:00:00Z
updated_at: 2026-10-01T12:00:00Z
supersedes: docs/tests/US-4.1-test-generation-report.md (version 1, SUPERSEDED)
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
  - key: ac_test_matrix
    version: 2
open_decisions_blocking: false
---

> **v2 (spec v3 rework).** The "v2 rework run" section at the end is the current evidence for T11/T12/T13. The v1 run below was taken before T1-T9 and is historical.

# Test Generation Report — US-4.1

## Observed run (before any implementation)

Commands were run in `C:\Work\Content-Swiss-Knife` with no implementation present.

| Command | Result |
|---|---|
| `npx vitest run` (full logic runner, 150 files) | `Test Files 7 failed \| 143 passed (150)`, `Tests 71 failed \| 3964 passed \| 3 skipped (4038)` |
| `npm run test:components` (`ng test`) | `Test Files 1 failed \| 1 passed (2)`, `Tests 9 failed \| 23 passed (32)` |
| `npm run lint` (`tsc --noEmit`, includes the specs) | clean, no output |

The seven failing logic files are exactly the seven files this stage touched: `model-catalog.spec.ts`,
`pricing.spec.ts`, `anthropic-provider.spec.ts`, `gemini-provider.spec.ts`, `llm-routes.spec.ts`,
`model-settings.service.spec.ts`, `active-docs-models.spec.ts`. Every other pre-existing file (143) passes;
no pre-existing test outside the modified files regressed, and no unrelated spec names `claude-sonnet-4-6`
as an active default (the remaining occurrences are the historical ones OD-8 keeps).

## Failure reasons (each is the right reason, not a broken import)

Representative observed assertions (verbatim from the run):

- Catalog: `claude-sonnet-5-5 missing from catalog: expected undefined to be defined`;
  `gemini-3.8-flash missing from catalog`; `expected { id: 'claude-sonnet-4-6', ... } to be undefined`;
  `client: expected 'disabled' to be 'between_tools'`; `client between_tools: expected 'medium' to be
  'between_tools'` (the client `LEVEL_ORDER` does not know the new levels).
- Tier fallbacks / ceiling: `expected 'gemini-3.7-flash' to be 'gemini-3.8-flash'`,
  `expected 'claude-sonnet-5' to be 'claude-sonnet-5-5'`, `expected 64000 to be 128000`.
- Pricing: `expected { in: 3, out: 15, cw: 3.75, cr: 0.3 } to deeply equal { in: 0.75, out: 3.75, ... }`
  (3.8 falls through to `FALLBACK_PRICE`); `expected false to be true` for the exact 5.5 own-key.
- Anthropic: `expected { Object (type, display) } to deeply equal { type: 'between_tools' }`,
  `expected { type: 'disabled' } to deeply equal { type: 'between_tools' }` (a `disabled` level, PDF
  extraction and the image path still send `disabled` to 5.5), `expected 'claude-sonnet-5' to be
  'claude-sonnet-5-5'` (FR-6 fallback).
- Gemini: `expected 'gemini-3.7-flash' to be 'gemini-3.8-flash'`,
  `expected { thinkingLevel: 'minimal' } to deeply equal { thinkingLevel: 'low' }`.
- Settings service: `expected 'claude-sonnet-4-6' to be 'claude-sonnet-5-5'`,
  `expected 'minimal' to be 'low'`, `expected 'gemini-3.7-flash' to be 'gemini-3.6-flash'` (the old
  migration still runs).
- Docs: README `^ANTHROPIC_MODEL_THINKING=claude-sonnet-5-5` and `.env.example` patterns do not match;
  AGENTS.md row still has `claude-sonnet-5`.
- Components: `expected 'high' to be 'xhigh'`, `expected 'disabled' to be 'between_tools'`
  (slider on the old four-level model), plus label and model-list assertions.

## Two compile-time accommodations (not weakening)

The Angular builder type-checks every spec in the program, so a spec that does not compile blocks all
component tests with a TypeScript error rather than a red test. Two places are typed around the not-yet
existing contract: `priceAt = getPrices as unknown as (model, now?) => ...` in `test/pricing.spec.ts` (the
plan's `now` seam) and `setDeepLevel(level as never)` for `between_tools`/`xhigh`/`max` in the service spec
(until T3 widens `ThinkingLevel`). Behaviour is asserted in full; only the static type is bridged.

## Existing tests modified

Updated to the Specification's new defaults, never loosened or skipped: tier-fallback and output-ceiling
assertions and the `fastModels()` order (catalog spec); the `claude-sonnet-5` Deep default, `3.7` Fast
default and `minimal` Fast level (service spec); the 3.6 -> 3.7 migration tests inverted to assert no
migration (OD-3); `setDeepModel('claude-sonnet-4-6')` replaced by `claude-sonnet-5` because 4.6 is no longer
selectable; the Anthropic fallback tests (`DEEP_55` slot; alternate model `claude-sonnet-5-5`, still fed a
stale `claude-sonnet-4-6` slot); the unknown-model same-tier assertion (route spec).

## Findings (non-blocking, for so-builder / PLAN_REVIEW awareness)

1. **FR-8 on the generate and vision paths needs provider code, contrary to plan D6 ("no new code").**
   The plan says only `extractFromPdf` clamps. `GeminiProvider.generate()` and `analyzeImage()` forward the
   slot level verbatim. The Specification (FR-8, "any Gemini call path ... clamped to low before the request
   is built") and the T7 acceptance check ("PDF, vision and generate with a slot carrying `minimal` send `low`")
   require it, and the tests assert it at the provider (two RED tests in `gemini-provider.spec.ts`). The
   builder must add `clampLevel('gemini', model, level)` in those two paths. This is not an
   `invalid_plan` loop-back because T7 already states the behaviour; it only needs the builder to follow T7's
   acceptance check over D6's prose.
2. **Image-path `max_tokens` is asserted at the plan's value (1000)** and `<= maxOutputTokens`
   (FR-10a leaves the value to the plan).
3. **`getPrices(model, now)` seam is required by the injected-instant tests**; the frozen-clock tests alone
   would pass for any implementation that reads the date per lookup.
4. **GUARD rows** (listed in the matrix) are green before implementation by design; the groups containing
   them also hold RED tests that need the implementation.
5. **Extra file beyond the task breakdown:** `test/active-docs-models.spec.ts` gives AC-9 a mechanical check
   (T9 lists "no test, verified by grep"). It reads three docs only. If the owner prefers manual-only
   verification it can be dropped without affecting any other AC.
6. **Fixture gap (known, unchanged):** no corpus fixture is added or changed; the corpus covers a render
   path this Story does not touch.
7. **Out-of-scope unverified assumptions** remain untested by design: beta header validity on 5.5 (NFR-7),
   the "30%+ faster" claim and timeout/truncation exposure at `high` (NFR-8, T10).

## Determinism

No `sleep`, no retry loops, no network, no unseeded randomness. Time is pinned with `vi.useFakeTimers` /
`vi.setSystemTime` and an injected `Date`; env is set with `vi.stubEnv` and restored in `afterEach`;
`localStorage` is cleared per test; vendor SDKs are mocked at the boundary, the providers, the catalog, the
service and the component are real.

## v2 rework run (spec v3, at HEAD db74695 plus the uncommitted spec edits)

State: T1-T9 exist; v1 tests were green at HEAD. Only the five spec files below were edited; nothing was
committed; no production file was touched.

| Command | Result |
|---|---|
| `npx vitest run` (logic, 150 files) | `Test Files 4 failed | 146 passed (150)`, `Tests 16 failed | 4038 passed | 3 skipped (4057)` |
| `npx ng test --watch=false` (components) | `Test Files 1 failed | 1 passed (2)`, `Tests 3 failed | 29 passed (32)` |

Total red: 19 tests, all in the touched files; every other file passes (no regression).

Failing tests, logic runner (16):
- `src/prompt-core/model-catalog.spec.ts` (5): FR-1 five levels (`expected [ 'between_tools', 'low', ...(4) ] to deeply equal [ ...(3) ]`); "FR-4: snaps max to xhigh on claude-sonnet-5-5 on client and server" (`client: expected 'max' to be 'xhigh'`); "FR-4: anthropic claude-sonnet-5-5 clamps max to xhigh on client and server" (same); "D2: no catalog model lists max as a level" (`claude-sonnet-5-5: expected [...] to not include 'max'`); "AC-1: the route-level resolver maps a max slot on claude-sonnet-5-5 to xhigh with the 128000 ceiling" (level `max` vs `xhigh`).
- `src/services/model-settings.service.spec.ts` (4): "restores a stored claude-sonnet-5-5 max level as xhigh" (`expected 'max' to be 'xhigh'`); "migrates a stored claude-sonnet-4-6 at max to claude-sonnet-5-5 at xhigh and persists it" (same); "exposes the five Sonnet 5.5 levels as selectable deep levels" (levels toEqual five); "clamps setDeepLevel(max) on Sonnet 5.5 to xhigh".
- `test/anthropic-provider.spec.ts` (6): "FR-10: never combines between_tools with effort, and never sends disabled, in any generate mode or level" (`expected 'max' not to be 'max'`); "FR-11: a slot with level max that bypassed the clamp sends xhigh via generate"; "... via analyzeImage"; "FR-11: the FALLBACK_DEEP slot with ANTHROPIC_THINKING_EFFORT=max sends xhigh"; "FR-11: an id absent from the catalog with level max sends xhigh" (each `expected { effort: 'max' } to deeply equal { effort: 'xhigh' }`); "FR-11: no claude-sonnet-5-5 request body contains effort max at any input level" (`not to contain '"effort":"max"'`).
- `test/llm-routes.spec.ts` (1): "FR-4: resolves a max level on claude-sonnet-5-5 to xhigh at 128000 output tokens" (slot level `max`, expected `xhigh`).

Failing tests, components runner (3), `model-settings.component.spec.ts`:
- "sizes the Deep slider to the five Sonnet 5.5 levels (steps 0..4) and starts it on High" (`expected '5' to be '4'`);
- "has no step beyond Extra high: the top step is index 4 and never reads Max" (`expected '5' to be '4'`);
- "labels the Deep scale ends in English: Between tools ... Extra high, with no Max label and no raw level id" (`Unable to find an element with the text: Extra high`: the scale still ends at Max).

All 19 fail on a missing v3 behaviour (the data still lists `max`, the provider still forwards `max`), not on imports.

GUARD rows added or kept green (by design, listed in the matrix): the five-level pass-through loop, the
parity invariant, the `max` rows for Sonnet 5 / Gemini / Haiku, unknown-level default, the mocked-`findModel`
pass-through test, the kept `xhigh` restore.

Notes for the builder:
1. T12's `#effort` must read the catalog through the `findModel` import in `server/providers/anthropic.js`
   (the mock seam wraps the `model-support.js` exports) and must not call `clampLevel` (plan A2).
2. Between the T11 and T12 commits the bypass-path provider tests stay red by design (gap window in the breakdown).
3. The "labels the Deep scale ends" component test is red because the scale still ends at Max; its green state
   assumes the end label of the scale follows the top level (xhigh -> "Extra high"), not re-verified here.
4. `setDeepLevel('max' as never)` / `stored(..., 'max')` are used because `max` is no longer a catalog
   level but is still a valid `ThinkingLevel`; no other compile-time bridge was added.
