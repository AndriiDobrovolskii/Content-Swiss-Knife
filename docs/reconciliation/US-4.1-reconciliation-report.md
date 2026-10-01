---
artifact: reconciliation_report
story: US-4.1
version: 2
status: ARCHIVED
owner: so-reconciliation-reviewer
stage: RECONCILIATION
created_at: 2026-10-01T00:00:00Z
updated_at: 2026-10-01T00:00:00Z
supersedes: docs/reconciliation/US-4.1-reconciliation-report.md (version 1, SUPERSEDED)
inputs_consumed:
  - {key: story, version: 1}
  - {key: specification, version: 3}
  - {key: ac_test_matrix, version: 2}
  - {key: implementation_report, version: 2}
  - {key: verification_report, version: 2}
---

# Reconciliation Report - US-4.1 (v2)

Verdict: **PASS**. This PASS is not human approval (AGENTS.md section 10); only the human PR gate approves.

Re-reconciliation against Specification v3 (Sonnet 5.5 has no `max`; `max` -> `xhigh`) and matrix v2, HEAD 6664e89.

Method: read the Story ACs, Specification v3, matrix v2, and the body of every named test (v2 rows read in full). Re-ran the specs myself:
- Logic runner, 7 files backing AC-1..AC-9 (`model-catalog`, `pricing`, `anthropic-provider`, `gemini-provider`, `llm-routes`, `model-settings.service`, `active-docs-models`): 7 files, 217 tests passed.
- Component spec `model-settings.component.spec.ts` via `ng test --include`: 1 file, 13 tests passed.
- grep for `.skip`, `.only`, `xit`, `fit`, `it.todo`, `describe.skip` across all 8 matrix spec files: none.

## v3 behaviour checks (the focus of this re-run)

| v3 behaviour | Test(s) read | Would a violation fail it? |
|---|---|---|
| 5.5 levels exactly five, no `max` | CAT FR-1 `toEqual(['between_tools','low','medium','high','xhigh'])` plus `not.toContain('max')`; CAT "D2: no catalog model lists max"; catalog JSON line 11 matches | yes |
| `max` -> `xhigh` on client and server | CAT "FR-4: snaps max to xhigh ... on client and server" and `it.each` MAX_ROWS call both `clampLevel` implementations; parity invariant test over all models x probes incl. `max` | yes |
| `max` -> `xhigh` at route level | RTE "resolves a max level on claude-sonnet-5-5 to xhigh at 128000 output tokens"; CAT route-resolver test `toEqual({model, level:'xhigh', maxOutputTokens:128000})` | yes |
| stored `max` restores as `xhigh` | SVC "restores a stored claude-sonnet-5-5 max level as xhigh"; "migrates a stored claude-sonnet-4-6 at max to claude-sonnet-5-5 at xhigh and persists it" (asserts deepLevel and persisted JSON `xhigh`); `setDeepLevel(max)` clamps to `xhigh` | yes |
| provider never sends effort `max` to 5.5 | ANT: slot with level `max` via `generate`, via `analyzeImage`, FALLBACK_DEEP with `ANTHROPIC_THINKING_EFFORT=max`, an id absent from the catalog, and a sweep of all input levels asserting `JSON.stringify(config)` never contains `"effort":"max"`; positive control passes `max` through only for a mocked catalog entry that lists it | yes |
| UI has no Max step | CMP: slider max attribute `'4'`, top step is `xhigh` shown as "Extra high", `queryByText('Max')` null, Ukrainian labels not raw ids | yes |

## Per-criterion verdicts (L1 row exists / L2 test exists / L3 asserts the criterion)

| AC | L1 | L2 | L3 | Evidence |
|---|---|---|---|---|
| AC-1 | yes | yes | yes | CAT FR-1/FR-2 exact `toEqual` levels, ceilings 128000/65536, tier, no `minimal`; v3 `max` rows above; CMP slider sizing. |
| AC-2 | yes | yes | yes | CAT FR-3 4.6 absent, other models' values kept; CMP and SVC list assertions. |
| AC-3 | yes | yes | yes | SVC exact default snapshot (anthropic/5.5/high, gemini/3.8-flash/low) and level membership; GEM NFR-6 and RTE FR-5 on the server side. |
| AC-4 | yes | yes | yes | ANT unset env resolves 5.5; GEM slot-less calls on 3.8-flash at `low`, never `minimal`, plus FR-8 clamps. |
| AC-5 | yes | yes | yes | PRC exact rates, own entry (not substring), not FALLBACK. |
| AC-6 | yes | yes | yes | PRC both sides of 2027-01-01T00:00:00Z, injected instant and system clock, per-lookup. |
| AC-7 | yes | yes | yes | SVC migration, persistence, level clamps (`disabled`, `minimal`, `max`), non-migration of 5 / 3.7 / 3.6, no-throw; RTE stale 4.6 slot. |
| AC-8 | yes | yes | yes | ANT no `temperature`/`top_p`/`top_k`/`tool_choice` at all five 5.5 levels and on the plain endpoint; thinking-shape tests (`between_tools`, never `disabled`, never effort `max`). |
| AC-9 | yes | yes | yes | DOC asserts the `ANTHROPIC_MODEL_THINKING=claude-sonnet-5-5` line in README and `.env.example`, AGENTS.md row, 4.6 absent from the three docs. |
| AC-10 | yes (n/a row) | n/a | n/a | No unit test by design; proved by the quality gate. |

## Drift from the approved Specification (v3)

- Dropped requirements: none. FR-1..FR-17 each trace to landed code or tests, including the v3 `max` -> `xhigh` handling at client clamp, server clamp, route resolver, settings restore and provider.
- Behaviour changed during coding: none found against v3.
- Scope added: none that is named in Out of scope. See finding 1 for a minor generalisation.
- Reinterpreted criteria: none. Story AC-1 (levels of 5.5) is silent on `levels`; v3 narrows via OD/OQ-2 and is traced, not a reinterpretation.
- Story drift: none.

## Non-blocking findings

1. `server/providers/anthropic.js` line 75 sends `xhigh` instead of `max` for any Anthropic model whose catalog `levels` lack `max` (none list it today), not only `claude-sonnet-5-5`. This is broader than FR-11's wording but harmless today (the mocked-catalog test pins the pass-through branch) and consistent with the "never send effort max to a model that does not list it" intent.
2. FR-4 prose says `max` stays "for the models that list it, such as Gemini and Sonnet 5", but no catalog model lists `max` (catalog test D2 asserts this). The v3 clamp tests assert top-rung outcomes for every model, so the behaviour is pinned; the spec wording is stale.
3. AC-9 second clause ("no remaining reference in non-historical source, specs or docs"): the DOC test scans only README.md, `.env.example` and AGENTS.md. Remaining `claude-sonnet-4-6` strings are in historical comments, fixtures, the retained FR-15 price entry and the migration map (permitted by FR-16 / OD-8). Carried from v1.
4. AC-6 "never resolves to another Gemini model's entry": the 3.8 and 3.7 rates are identical, so a value assertion cannot separate them; protection is the dedicated exact-match branch. Carried from v1.
5. The matrix "State" column is the pre-implementation RED/GUARD snapshot; GUARD rows pass by construction as the Specification (OD-9) accepts. Carried from v1.

## Result

PASS: every AC-n clears levels 1, 2 and 3 (AC-10 by the gate). No `loop_back_stage`. Supersedes report v1.
