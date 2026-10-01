---
artifact: implementation_plan
story: US-4.1
version: 2
status: ARCHIVED
owner: so-planner
created_at: 2026-10-01T00:00:00Z
updated_at: 2026-10-01T00:00:00Z
supersedes: docs/plans/US-4.1-implementation-plan.md#1
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 3
  - key: open_decisions
    version: 2
  - key: impact_analysis
    version: 2
open_decisions_blocking: false
---

# Implementation Plan v2: US-4.1 — Add Claude Sonnet 5.5 and Gemini 3.8 Flash, make them the defaults, retire Sonnet 4.6

## Revision note (what v3 changes, and how to read this plan)

This is a delta plan on top of the nine commits T1..T9 (`eb669f0`..`db74695`) that implemented
plan v1 / specification v2. Plan v1's decisions D1..D11 are KEPT unless named below. Specification
v3 (OQ-2, owner decision) changes one thing: `claude-sonnet-5-5` loses `max` from its `levels`;
`max` clamps to `xhigh` on client and server; a stored `max` restores as `xhigh`; the provider never
sends effort `max`. Every v1 decision not listed in "Delta" is unchanged and is not restated
(v1 text remains the record for D2 ordering, D4, D5, D6, D7, D8 mechanics, D10, D11).

## Approach

Two production edits and a test rework. (1) Data: drop `max` from the `claude-sonnet-5-5` `levels` in
`src/prompt-core/model-catalog.json`. Because both clamps are nearest-level snaps over an ordering that
still contains `max` and ties resolve upward, `max` -> `xhigh` follows on client, server and settings
restore with no clamp change (impact F-5: T1 and T3 are not reopened). (2) Code: the provider must be
correct on its own when the clamp was bypassed (FR-10/FR-11), so `AnthropicProvider` gains a small
private effort-mapping helper that never lets `max` reach `output_config.effort` for a model whose catalog
`levels` do not list `max`. Everything else built in T1..T9 stays. Five spec files assert v2 behaviour and
are reworked; comment text describing `max` as a 5.5 capability is corrected.

## Delta against the built work

| Item | Verdict | Why |
|---|---|---|
| `server/providers/model-support.js` `LEVEL_ORDER` (T1) | stays | `max` stays in the ordering (FR-4) |
| `src/prompt-core/model-catalog.ts` `ThinkingLevel`/`LEVEL_ORDER` (T3) | stays (code); comment reworked | Doc comment lines ~6-11 say 5.5 "adds xhigh and max"; reword so `max` is described as an ordering member no catalog model lists |
| `model-settings.component.ts` labels (T2) | stays | `LABELS.max` becomes unreachable but harmless; removing it breaks the `Record<ThinkingLevel,..>` typing while the union keeps `max` (impact 1.1) |
| `model-catalog.json` (T4) | REWORKED | drop `max` from 5.5 `levels` (D1') |
| `pricing.js` (T5) | stays | |
| `anthropic.js` (T6) | REWORKED | effort helper (D3') |
| `gemini.js` (T7) | stays | |
| `model-settings.service.ts` (T8) | stays (code); doc comment reworked | clamp already yields `xhigh`; the doc comment/restore text names `max` examples (D8') |
| README/.env.example/AGENTS.md (T9) | stays | |
| Tests (five files) | REWORKED | see Validation strategy |

## Design decisions

### D1'. Catalog (FR-1, FR-3; amends v1 D1)

`claude-sonnet-5-5` `levels` become exactly `["between_tools","low","medium","high","xhigh"]`.
`defaultLevel` `high`, `maxOutputTokens` 128000, first position, label: unchanged. All other entries
unchanged (no catalog model then lists `max`). One data edit; nothing else in the JSON.

### D2'. Clamp ordering and F-4 (FR-4, FR-4a; amends v1 D2)

No code change to either clamp or either `LEVEL_ORDER` (identical literal on both sides is kept, R1
from v1 still applies). Derived outcomes on 5.5 (indices disabled0 between_tools1 minimal2 low3 medium4
high5 xhigh6 max7), verifiable by hand: `max`(7) -> `xhigh`(6) distance 1; `disabled` -> `between_tools`;
`minimal` -> tie `between_tools`/`low`, upward -> `low`; unknown -> `defaultLevel` `high`; members unchanged.
Outcomes on every other model are unchanged.

**F-4 handling.** The FR-4 clause "on every model whose `levels` contain `max`, `max` is returned
unchanged" and the phrase "Gemini and Sonnet 5 list `max`" are false against the catalog: no model lists
`max` after v3, so the clause is vacuous and has no test subject. Position taken by the plan:
(a) the plan does not rely on it and does not create a test for it; (b) the substance is covered by a
strictly stronger, non-vacuous invariant in the parity test: for EVERY catalog model and EVERY probe
level (`disabled`, `between_tools`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`, unknown),
`clampLevel` returns a member of that model's `levels`, client equals server, and a probe that is a member
is returned unchanged; (c) explicit expected-value rows for `max` on every model (Sonnet 5.5 -> `xhigh`,
Sonnet 5 -> `high`, Gemini 3.1 Pro / 3.8 / 3.7 / 3.6 Flash -> `high`, Haiku -> `disabled`); (d) a
non-blocking recommendation to reword the clause at the next specification revision (no loop-back; no
requirement outcome changes).

### D3'. Provider effort mapping (FR-10, FR-11; replaces the effort branch of v1 D3)

Decision: a provider-local, capability-derived helper in `server/providers/anthropic.js`, in the same style
as the existing `#offThinking` (which already imports `findModel` from `model-support.js`):

`#effort(level, model)`:
- `minimal` -> `low` (existing defensive snap, unchanged);
- `max` -> `xhigh` when the model's catalog `levels` (via `findModel('anthropic', model)`, `[]` when the id is
  not in the catalog) do NOT include `max`; otherwise `max` is passed through (capability-derived, so a future
  catalog model that lists `max` is not silently capped);
- anything else -> unchanged.

`#thinkingConfig(level, model)` keeps its v1 shape: `disabled`/`between_tools` -> `#offThinking(model)`, no
`output_config`; every other level -> `{ thinking:{type:'adaptive',display:'omitted'}, output_config:{ effort:
this.#effort(level, model) } }`. Effects: on `claude-sonnet-5-5` the request carries `xhigh`, never `max`, on
every path that calls `#thinkingConfig` (`generate`, `analyzeImage`), whatever its source (clamped slot,
`FALLBACK_DEEP` with `ANTHROPIC_THINKING_EFFORT=max`, a hand-built slot). `extractFromPdf` uses
`#offThinking` only and is unaffected. `between_tools` still never combines with an effort field (D3 v1).

Why this mechanism, and why it is independent of the clamp (FR-10): it reads only (level, model) as received
and the catalog's declared capability; it neither calls nor assumes `clampLevel`/`resolveSlot`. It does not
reuse `clampLevel` on purpose (rejected, A2 below). Silent change on other models: none, because no other
Anthropic catalog model lists `max` and none reaches the `max` branch today; `xhigh` on Sonnet 5/Haiku is
passed as before (clamp, not provider, owns that; unchanged behaviour).

Test-seam note for so-test-writer: the "model lists `max` -> pass-through" branch has no catalog subject; it is
reachable in tests only by stubbing `findModel` (module mock of `model-support.js`). It is a one-line
conditional; if the test-writer judges the mock disproportionate, that branch's absence from the suite is
acceptable and must be recorded in the test strategy, not silently skipped.

### D4'. Unchanged decisions carried forward (no edit)

v1 D4 (`analyzeImage` no-thinking `max_tokens` `Math.min(1000, maxOutputTokens)` for `disabled` and
`between_tools`; the thinking-enabled branch unchanged) — still correct, independent of effort; v1 D5
(`extractFromPdf` `#offThinking`); D6 (Gemini); D7 (pricing and clock seam); D10 (docs); D11 (NFR-8
verification). v1 D9 labels: unchanged in code; the slider is index-based over `levels`, so Deep now has 5
steps (indices 0..4, last `xhigh`); component assertions change (below), template does not.

### D8'. Settings service restore and U-5 (FR-9; amends v1 D8)

No behaviour change. After D1' the existing `validateSlot` -> `clampLevel` path restores a stored
Sonnet 5.5 `max` as `xhigh`, and a stored 4.6 `max` (rare) migrates to 5.5 then clamps to `xhigh`.
**U-5 resolved by reading the code:** `restore()` persists only when `migrated` is true (a model
rewrite). A level-only correction (stored 5.5 / `max`, model unchanged) is applied in memory on every boot
and is written back at the next setter call (`persist()` inside each `set*`). Decision: do NOT widen the
persist condition. Reason: the correction is idempotent and cheap, every consumer reads `snapshot()` (the
in-memory, already-clamped value), so the stale `max` in storage never reaches a request; widening it adds
a write on read for no observable gain. Recorded in Risks. Doc comment on `restore()` and on the
`ThinkingLevel`/service header that name `max` as a 5.5 capability are reworded (comment-only).

### D12. Server route resolution and U-2 (no code)

Resolved by reading: `server/llm-request.js` line 44 passes the request slot through `resolveSlot`, which
calls `clampLevel`. So on the normal route path a requested `max` for 5.5 arrives at the provider as `xhigh`
already; D3' is the second, independent guard for the paths that do not go through it (direct provider calls,
`FALLBACK_DEEP`, the `analyzeImage`/PDF slots resolved elsewhere). Both layers are tested separately.

## Unknowns (impact analysis v2 section 7)

- **U-1** (historical Sonnet-id references in `doc-schema-issues.spec.ts` / `doc-repair-recovery.spec.ts`):
  resolved in v1 (log strings and comments imitating a past 4.6 truncation, not assertions of current
  defaults); unchanged by v3; not edited (FR-16 historical carve-out).
- **U-2:** resolved, D12.
- **U-3** (`arch-guard.sh` and `AGENTS.md`): resolved by reading `arch-guard.sh` (FROZEN_FILES array at line
  ~111, sha256 over those files only); `AGENTS.md` is not checksummed; T9's one-line edit does not trip it.
- **U-4** (vendor facts: beta header on 5.5, effort default under `between_tools`): NOT answerable from code;
  remains an explicit unverified assumption (spec NFR-7/R-1b), carried in Risks.
- **U-5:** resolved, D8'.

## Files to create / modify (delta only)

Modify (code and data):
- `src/prompt-core/model-catalog.json` — drop `max` from 5.5 `levels` (D1').
- `server/providers/anthropic.js` — add `#effort`, use it in `#thinkingConfig` (D3'); comment update.
- `src/prompt-core/model-catalog.ts` — comment-only: `ThinkingLevel` doc (lines ~6-11) and any block comment
  that calls `max` a 5.5 level (D2').
- `src/services/model-settings.service.ts` — comment-only (D8').

Modify (tests, rework authored via so-test-writer; the behaviour they pinned is deliberately replaced by spec v3,
not weakened, §7.7):
- `src/prompt-core/model-catalog.spec.ts` — `levels` toEqual without `max` (~line 176); "every 5.5 level
  unchanged" iterates five levels (~249-251); add `max` -> `xhigh` on client and server and the D2' invariant
  and per-model `max` rows; probe lists (~107/286/297) keep `max` as a probe only.
- `src/services/model-settings.service.spec.ts` — stored 5.5 `max` restores as `xhigh` (~355-358); "five Sonnet
  5.5 levels" (~381-385) plus `setDeepLevel('max')` -> `xhigh`; 4.6 + `max` migrates to 5.5/`xhigh`.
- `src/app/components/model-settings/model-settings.component.spec.ts` — comment at ~76; drop the `getAllByText
  ('Max')` assertion (~120-127); slider top step is `'4'` = `xhigh`, remove the step-`'5'`/`max` cases (~150-157,
  ~163 loop `['5','max']`); `between_tools`/`xhigh` cases (~129-148) stay.
- `test/anthropic-provider.spec.ts` — `SONNET_55_LEVELS` (~262) drops `max` (feeds the FR-12 guard); the
  `it.each` at ~289 no longer asserts `effort:'max'` is sent: `low..xhigh` send that effort; a slot with
  `level:'max'` that bypasses the clamp sends `xhigh`; `max` never appears in any request body for 5.5 at any
  input level; an id not in the catalog with `max` also yields `xhigh`; `disabled`/`between_tools` shape tests
  unchanged.
- `test/llm-routes.spec.ts` — ADD a case: a request slot `{model:'claude-sonnet-5-5', level:'max'}` resolves
  to `xhigh` on the route path. Existing `xhigh` case (~178-180) stays.

Not touched: both `LEVEL_ORDER` arrays, `model-support.js`, `gemini.js`, `pricing.js`, `server/usage/store.js`,
all FROZEN files, `src/prompts/**`, `src/domain/**`, `src/render/**`, corpus fixtures, `README.md`,
`.env.example`, `AGENTS.md`. Tests that stay valid unchanged: `test/pricing.spec.ts`,
`test/gemini-provider.spec.ts`, `test/active-docs-models.spec.ts`.

## FROZEN-file position

Unchanged from v1: none of the five FROZEN files is edited; no sibling file; no §9 request. `AGENTS.md` is not
touched by v3.

## Architecture rule position

Unchanged from v1 and still satisfied: Rule 1 (effort shaping stays in `server/providers/anthropic.js`; the
client carries catalog data only); Rule 2 untouched; prompt caching (no prompt builder or `PromptPayload`
change; `systemBlocks` stay separate); Rule 4 no secret; no language list or currency symbol added outside
`STORE_REGISTRY`; §4 generated-HTML criteria untouched (no prompt/schema/renderer/validator/domain change,
corpus fixtures not regenerated, no Zod change); `server/usage/store.js` unchanged so its no-migration caveat
does not trigger.

## Validation strategy

Logic runner (`npm run test:logic`, Vitest, mocked SDKs) for all categories except the component row.

| Category | Against | Runner |
|---|---|---|
| Catalog content: 5.5 `levels` exactly five without `max`, defaults, first position; other models unchanged | `model-catalog.json` via `model-catalog.spec.ts` | logic |
| Clamp outcomes: `max` -> `xhigh` and the FR-4 list on 5.5 | client `clampLevel` | logic |
| Parity and invariant (D2', F-4): every model x probe level, client == server, result in `levels`, member unchanged | both clamps | logic |
| Restore: stored 5.5 `max` -> `xhigh`; `disabled`/`minimal` unchanged outcomes; 4.6 migration carries `max` to `xhigh`; level-only correction is not required to persist (U-5) | `ModelSettingsService` | logic |
| Provider effort mapping (FR-11): `low..xhigh` send that effort; `max` sent as `xhigh` when the clamp is bypassed; never `max` in any 5.5 request; `generate` and `analyzeImage` both | `AnthropicProvider` | logic |
| Provider independence from the clamp (FR-10): `disabled`/`between_tools` shape on every path incl. `FALLBACK_DEEP` with `ANTHROPIC_THINKING_EFFORT=max`; never `{type:'disabled'}` for 5.5; no `display`/`budget_tokens`/`block_binding`/`output_config` with `between_tools` | `AnthropicProvider` | logic |
| FR-12 guard: no `temperature`/`top_p`/`top_k`, no forced `tool_choice`, at each of the five 5.5 levels | `AnthropicProvider` | logic |
| Route level resolution: `max` for 5.5 resolves to `xhigh` before the provider | `llm-request.js` via `test/llm-routes.spec.ts` | logic |
| UI: Deep scale has five steps, last `xhigh`; new labels EN/UK; no Max label reachable | `model-settings.component.spec.ts` | components (`npm run test:components`) |
| Gate | `npm test`, `npm run lint`, `npm run build`, `bash arch-guard.sh` | both runners |

Unchanged v1 categories (pricing, Gemini, defaults, `analyzeImage` sizing, docs review) still apply and
their tests are valid as built. Not verified by tests (out of scope): live vendor behaviour, the beta header
on 5.5, truncation at `xhigh`/`high`.

## Risks

1. Provider guard silently absent: if `#effort` is removed or bypassed, only the clamp keeps `max` off the
   wire and the old test shape would pass. Surfaces through the "clamp bypassed" provider test (new).
2. Spec/catalog drift on F-4: a reader assumes `max` is selectable on some model. Mitigated by the comment
   rewrites, the per-model `max` rows, and the non-blocking spec recommendation.
3. Stale stored `max` (U-5): re-clamped in memory at each boot, stays in storage until the next setter call.
   Benign; no request carries it. Visible only by inspecting localStorage.
4. Unverified vendor assumptions (U-4, NFR-7): effort omitted under `between_tools` defaults to `high`; beta
   header accepted on 5.5; `xhigh` accepted without `between_tools`. Symptom would be a loud HTTP 400 on the
   first live call, logged by `call-log`; not testable offline.
5. Truncation/timeouts (NFR-8, OQ-2): the 818 s `max` failure is moved out of reach, not fixed; `xhigh` and
   `high` share the 128000 ceiling and `DEEP_TIMEOUT_MS`. Verification only (v1 D11); a finding if observed.
6. `LABELS.max` dead entry (harmless, intentional).
7. v1 risks 1-3, 5-9 carry forward unchanged.

## Rejected alternatives

New in v2 (v1 R1..R8 stand):
- A1: Rely on the catalog clamp alone (the T6 state; no provider change). Rejected: FR-10/FR-11 require the
  provider mapping to be independent of the clamp; `FALLBACK_DEEP` env effort and direct slots bypass it.
- A2: Call `clampLevel('anthropic', model, level)` inside `#thinkingConfig` for the effort. Rejected: it
  couples the provider to the clamp it must be independent of, falls back to the first catalog model's levels
  for an unknown id, and silently changes behaviour on Haiku/Sonnet 5 (`xhigh` -> `high`, effort levels ->
  `disabled` on Haiku) beyond this Story's scope.
- A3: Hard-code `if (model === 'claude-sonnet-5-5' && level === 'max')` (R2 reasoning): the next model whose
  `levels` lack `max` would silently 400; capability is already in the catalog.
- A4: A static `max -> xhigh` map for every Anthropic model, no catalog read. Rejected: silently caps a future
  model that does list `max`; the catalog-derived check costs one line and matches `#offThinking`.
- A5: Throw on `max` for 5.5 in the provider. Rejected: FR-11/FR-4 require a clamp, never a throw; a stale
  stored setting must degrade, not break.
- A6: Widen `restore()` to persist level-only corrections. Rejected: no observable gain (D8').
- A7: Remove `max` from `ThinkingLevel`/`LEVEL_ORDER`/`LABELS`. Rejected: FR-4 says `max` stays in the
  ordering; removing it makes a stray `max` an "unknown level" (-> `defaultLevel` `high`) instead of the
  required `xhigh`, and reopens T1/T3 for no benefit.

## Traceability

| Requirement | Design decision / files |
|---|---|
| FR-1 | D1'; `model-catalog.json` |
| FR-2, FR-3 | v1 D1 (unchanged); `model-catalog.json` |
| FR-4 | D2'; ordering unchanged (`model-catalog.ts` comment-only); catalog edit D1' |
| FR-4a | D2' invariant and parity test; `model-support.js` unchanged |
| FR-5, FR-6, FR-7, FR-8 | v1 D1/D3/D6/D8 (unchanged, built) |
| FR-9 | D8'; `model-settings.service.ts` (no code change) |
| FR-10 | D3', v1 D3/D5; `anthropic.js` |
| FR-10a | v1 D4 (unchanged) |
| FR-11 | D3' (`#effort`); `anthropic.js` |
| FR-12 | v1 D3 guard + five-level test (D3', Validation) |
| FR-13, FR-14, FR-15 | v1 D7 (unchanged, built) |
| FR-16 | v1 D10 (unchanged, built); D2'/D8' comment edits only |
| FR-17 | Validation strategy gate row |
| NFR-1 | D3' (shaping in `server/providers/`) |
| NFR-2, NFR-3, NFR-4 | architecture rule position |
| NFR-5, NFR-6 | v1 D6/D7/D8 (unchanged) |
| NFR-7 | Risks 4 |
| NFR-8 | v1 D11, Risks 5 |

Impact v2 findings: F-4 -> D2'; F-5 -> D2' (no clamp change); F-6 -> D3'; silent-failure risks 1 -> D3',
2 -> test rework list, 3 -> D8'/U-5, 4 -> comment rewrites, 5 -> D2'. Unknowns U-1..U-5 -> section "Unknowns".
