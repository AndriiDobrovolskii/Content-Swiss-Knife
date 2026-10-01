---
artifact: impact_analysis
story: US-4.1
version: 2
status: ARCHIVED
owner: so-impact-analyzer
created_at: 2026-10-01T00:00:00Z
updated_at: 2026-10-01T00:00:00Z
supersedes: docs/impact-analysis/US-4.1-impact-analysis.md#1
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 3
  - key: open_decisions
    version: 2
---

# Impact analysis v2: US-4.1 (Sonnet 5.5 + Gemini 3.8 Flash, defaults, retire Sonnet 4.6)

Revision trigger: specification v2 -> v3. Delta: `claude-sonnet-5-5` `levels` become
`["between_tools","low","medium","high","xhigh"]` (no `max`); `max` clamps to `xhigh` on client and
server (FR-4, FR-4a); a stored `max` restores as `xhigh` (FR-9); the provider sends effort only for
`low..xhigh` and never `max` (FR-11). OQ-2 supersedes the `max` member of OD-1 for this model only
(owner-confirmed; open_decisions v2 is not edited). Everything below was re-derived on this run from
the repository at branch HEAD (`git log main..HEAD` = commits T1..T9, `eb669f0`..`db74695`).

All v1 findings that the delta does not touch carry forward unchanged; section 1 states precisely
which already-built work is stale and which stays valid.

## 1. Affected files

### 1.1 Already built (T1..T9) that needs REWORK for v3

Production code:

| File | Built in | What is stale (evidence) |
|---|---|---|
| `src/prompt-core/model-catalog.json` | T4 `6646005` | Line 11: `claude-sonnet-5-5` `levels` still ends `"xhigh","max"`. Must drop `max` (FR-1). `defaultLevel` high and `maxOutputTokens` 128000 stay. |
| `server/providers/anthropic.js` | T6 `aa036df` | `#thinkingConfig(level, model)` (lines 64-68) builds `effort = level` for every non-off level, so a level that reaches it unclamped (a request or slot that bypassed `resolveSlot`/`clampLevel`) produces `output_config.effort: "max"` on `claude-sonnet-5-5`. FR-10 states the provider mapping is independent of the catalog clamp and FR-11 says the provider never sends `max` to this model. As built, only the upstream clamp prevents it, and the provider test (below) asserts the opposite. Also reaches `analyzeImage` (line 150) and `generate` (line 89), both via `#thinkingConfig`. `extractFromPdf` uses `#offThinking` only and is not affected. |

Production code that stays valid with NO edit (derived by reading it):

- `src/prompt-core/model-catalog.ts` `ThinkingLevel` and `LEVEL_ORDER` (T3) and
  `server/providers/model-support.js` `LEVEL_ORDER` (T1): `max` stays in both orderings (FR-4: "`max` stays in that ordering"). The nearest-level clamp already maps a level absent from `levels` to the nearest present one with ties upward, so once the catalog drops `max`, `max` -> `xhigh` follows on both sides with no code change. The two orderings remain identical, so FR-4a parity needs no code change.
- `src/services/model-settings.service.ts` (T8): `restore()`/`setDeepLevel`/`setDeepModel` all route levels through `clampLevel` (lines 118-136, 232), so a stored `max` restores as `xhigh` after the catalog edit alone. No code change.
- `src/app/components/model-settings/model-settings.component.ts` (T2): `LABELS` keeps `max` (line 24, 44). It becomes unreachable from the UI for every catalog model (no model lists `max` after the catalog edit) but is harmless, and removing it would break the `Record<ThinkingLevel,...>`-shaped typing while `ThinkingLevel` still includes `max`. The `.html` slider uses `spec.levels.length - 1`, so Deep gets 5 steps instead of 6 with no template change.
- `server/providers/gemini.js` (T7), `server/usage/pricing.js` (T5), `README.md`/`.env.example`/`AGENTS.md` (T9): untouched by the delta.

Tests that assert v2 behaviour and must be reworked (each asserted line verified):

| File | Stale assertions |
|---|---|
| `src/prompt-core/model-catalog.spec.ts` | line 176 `levels` toEqual includes `'max'`; line 249-251 "returns every claude-sonnet-5-5 level unchanged" iterates `'max'`; lines 107/286/297 probe lists contain `max` and stay valid as probes, but any expectation inside them that `max` is returned unchanged on 5.5 breaks. New cases needed: `max` -> `xhigh` on both clamps; `levels` lacks `max`. Lines 276-281 (Haiku/Sonnet 5/Gemini `max` outcomes) stay valid. |
| `src/services/model-settings.service.spec.ts` | line 355-358 "keeps a stored claude-sonnet-5-5 selection ... `max`" expects `max`, must expect `xhigh`; lines 381-385 "exposes the six Sonnet 5.5 levels" iterates `max` (must be five, and add `setDeepLevel('max')` -> `xhigh`). Line 338-341 (`xhigh` kept) stays valid. |
| `src/app/components/model-settings/model-settings.component.spec.ts` | line 76 comment says six levels; line 120-127 asserts a Max label is displayed (`getAllByText('Max')`) - the Deep scale no longer ends at Max; lines 150-157 slide to step `'5'` and expect `max` - step 5 no longer exists (last step is `'4'` = `xhigh`); lines 163 loop includes `['5','max']` for UK labels. The `between_tools`/`xhigh` cases (lines 129-148) stay valid. |
| `test/anthropic-provider.spec.ts` | line 262 `SONNET_55_LEVELS` includes `max` (feeds FR-12 guard); line 289 `it.each([... 'max'])` asserts `effort: 'max'` is SENT - directly contradicts FR-11 v3. Must become: `low..xhigh` send that effort; `max` (bypassing the clamp) sends `xhigh`, never `max`. |
| `test/llm-routes.spec.ts` | line 178-180 uses `xhigh` unchanged: stays valid. A server-side `max` -> `xhigh` route case is a new addition, not a rework. |

Tests that stay valid unchanged: `test/pricing.spec.ts`, `test/gemini-provider.spec.ts`,
`test/active-docs-models.spec.ts`, and the non-`max` portions of every file above.

### 1.2 Still to change (nothing new from v3 beyond 1.1)

No file outside section 1.1 is newly reached by v3. The v1 "must change" list is fully built
(T1..T9) and only the rows in 1.1 are reopened.

### 1.3 Needs re-verification even if unchanged

- `server/index.js` / `server/routes/**` slot validation (v1 U-2): v3 makes the route-level clamp the primary guard that keeps `max` off the wire on the normal path; confirm requests resolve through `resolveSlot` (via `server/providers/model-support.js`) before the provider. `test/llm-routes.spec.ts` already exercises `resolve`.
- `src/services/llm.service.ts`, `src/prompt-core/payload.ts`: read `ModelSettingsService.snapshot()`; confirm no code path writes a raw stored level past the clamp (the stored-`max` migration depends on restore clamping).
- `model-settings.component.html` `highWarning`: only mentions High, still no copy for `xhigh` (v1 note, unchanged).
- NFR-8 / OQ-2: the live truncation at `max` (818 s, 128000 tokens) is not fixed by v3, only moved out of reach of `max`; `xhigh` and `high` runs are still bounded by the same 128000 ceiling and `DEEP_TIMEOUT_MS` (1,200,000). Verification only, no code.

### 1.4 Test runners

Logic runner (`npm run test:logic`): `model-catalog.spec.ts`, `model-settings.service.spec.ts`, `test/anthropic-provider.spec.ts`, `test/llm-routes.spec.ts`. Component runner (`npm run test:components`): `model-settings.component.spec.ts` only (rework, no new file).

## 2. Hazard table

| # | Hazard | Applies? | Evidence |
|---|---|---|---|
| 1 | `STORE_REGISTRY` fan-out | Does not apply | Searched `STORE_REGISTRY` in `src`: consumers `src/utils/{output-validator,table-finalize,language-consistency}.ts`, `src/render/render-description.ts`, `src/prompt-core/{store-render-rules,doc-pipeline-flag,constants}.ts`, `src/app/app.component.ts`. None are touched by v3 (or by v2); model choice is store-independent. |
| 2 | uk-UA master vs translation | Applies (runtime only) | Deep slot (Sonnet 5.5) writes the uk-UA master, Fast (Gemini 3.8 Flash) translates. v3 narrows Deep levels but changes no prompt text; a Deep-model change reaches every locale, a Fast-model change only translated ones. Output quality is not in any AC. |
| 3 | prompt -> schema -> renderer -> validator chain | Does not apply | No link touched; `rg` of level/model ids in `src/prompts`, `src/domain`, `src/render`, `src/utils/output-validator.ts` finds only a historical comment in `doc-schema-issues.ts`. |
| 4 | FROZEN files (AGENTS.md section 9) | Does not apply | No FROZEN file edited by T1..T9 or by v3 rework (`git diff --stat main..HEAD` lists none). The one `AGENTS.md` line 55 edit (T9, OD-8) is owner-authorised and not a frozen file; arch-guard checksum of `AGENTS.md` is still unconfirmed (U-3). |
| 5 | Corpus conformance harness | Does not apply | `test/fixtures/corpus/` has two items (Ortur H20 20 W, two stores; section 5 gap in `test/render-reconciliation.report.md`). No rendered output changes; no fixture moves. |
| 6 | Two test runners | Applies | See 1.4: logic runner for four specs, component runner for the existing model-settings spec only. |
| 7 | Server surfaces without co-located tests | Applies | Reopened server file: `server/providers/anthropic.js`; specs at risk: `test/anthropic-provider.spec.ts`, `test/llm-routes.spec.ts`, and the client/server parity test in `model-catalog.spec.ts`. `server/usage/store.js` untouched (no migration issue). |

## 3. Silent-failure risks (no error, wrong output)

1. **Provider sends `effort: "max"` when the clamp is bypassed.** `#thinkingConfig` passes the level straight to `output_config.effort`. After the catalog drops `max`, a direct `generate(..., slot{level:'max'})`, `analyzeImage` or any caller that did not pass through `resolveSlot` silently reaches the vendor with `max` (the very level that truncated at 128000 tokens after 818 s). Not an error until the vendor responds. Today's test asserts this behaviour as correct, so the suite would stay green while FR-11 is violated.
2. **Catalog JSON edited but spec fixtures not.** A repo where `model-catalog.json` drops `max` while four specs still iterate `max` fails loudly; the dangerous variant is a spec that only asserts `deepLevel()` toBe the stored value after a settings round trip. Line 355-358 as written would fail loudly, not silently, which is the desired outcome.
3. **Stale browser storage.** A user whose `localStorage` holds Deep `claude-sonnet-5-5` / `max` (set under T4..T9 builds) is only corrected because `restore()` clamps (line 232). The correction is in-memory plus persisted by the existing migration path; confirm the clamp-only path (model unchanged, level changed) is persisted or at least re-clamped at every boot, otherwise a stale `max` is re-clamped silently at each load without error (benign) - recorded as U-5.
4. **`LABELS.max` dead entry.** The UI keeps a Max label that no model can reach; harmless, but a reader will assume `max` is selectable. Doc comments in `model-catalog.ts` (lines 6-10, "adds the 'xhigh' and 'max' effort levels") and `model-settings.service.ts` doc comment still describe `max` as a 5.5 capability.
5. **Spec self-inconsistency (see F-4).** FR-4 asserts "`max` stays ... for the models that list it, such as Gemini and Sonnet 5" but `model-catalog.json` lists `max` for no model after v3 (Sonnet 5: `disabled/low/medium/high`; Gemini: `minimal/low/medium/high` or `low/medium/high`). The sentence "on every model whose `levels` contain `max`, `max` is returned unchanged" is vacuously true. A planner writing a test for it would find no subject.
6. Carried from v1 and unchanged: pricing substring fallback (T5 built exact entries); server `LEVEL_ORDER` divergence (parity test guards); `analyzeImage` `max_tokens` branch (T6 handles `between_tools`); hard-coded `disabled` in `extractFromPdf` (T6 replaced with `#offThinking`); timeouts at `high` with 128000 ceiling (NFR-8); stale prose in comments (above).

## 4. Fixture and corpus impact

No rendered-output fixture moves. Test fixtures that imitate v2 level behaviour and must change: the five specs in 1.1. Fixtures imitating the past (call-log, doc-repair, `timeouts.js` comments) stay.

## 5. Blast-radius summary

v3 is a small, mostly test-side rework on top of an otherwise sound T1..T9 build. One production data edit is required (`model-catalog.json` line 11: drop `max`) and one production code change in `server/providers/anthropic.js` (`#thinkingConfig` must not emit effort `max` for `claude-sonnet-5-5` even when the clamp was bypassed, FR-10/FR-11; mechanism is a planner decision). The two `LEVEL_ORDER` arrays, `ThinkingLevel`, the settings service, the labels table, pricing, the Gemini provider and docs stay valid: the existing nearest-level clamp, applied on both sides and on restore, already yields `max` -> `xhigh` once the catalog drops `max`. Five spec files assert v2 behaviour and must be reworked (`model-catalog.spec.ts`, `model-settings.service.spec.ts`, `model-settings.component.spec.ts`, `test/anthropic-provider.spec.ts`; `test/llm-routes.spec.ts` only gains a case). No store, locale list, prompt, schema, renderer, validator, FROZEN file or corpus fixture is reached.

## 6. Findings for the planner (not designs)

- **F-1 (v1, resolved by T2):** labels for new levels now exist; v3 leaves `LABELS.max` unreachable but valid.
- **F-2 (v1, resolved by T8):** old 3.6 -> 3.7 migration replaced.
- **F-3 (v1, resolved by T5):** pricing clock seam.
- **F-4 (new, spec text, non-blocking):** FR-4 wording that `max` is listed by "Gemini and Sonnet 5" is false against the catalog; no catalog model lists `max` after v3. Does not change any requirement outcome; the acceptable reading is "`max` stays in the ordering".
- **F-5 (new):** no code change to either clamp or ordering is needed for FR-4/FR-4a; planning must not reopen T1/T3.
- **F-6 (new):** the provider-side `max` guard is required by FR-10 (mapping independent of clamp) and is not satisfied by the catalog edit alone.

## 7. Unknowns

- **U-1:** whether `doc-schema-issues.spec.ts` / `doc-repair-recovery.spec.ts` Sonnet-id references are historical (v1, unchanged).
- **U-2:** whether routes re-clamp request levels before the provider (resolve by reading `server/index.js` resolution path; `llm-routes.spec.ts` suggests yes via `resolveSlot`).
- **U-3:** whether `arch-guard.sh` checksums `AGENTS.md`.
- **U-4:** vendor facts (beta header on 5.5, effort default under `between_tools`) unverified (NFR-7/NFR-8).
- **U-5:** whether `restore()` persists a level-only correction (stored `max`, model unchanged); resolve by reading `model-settings.service.ts` around line 232 and its persist call.
