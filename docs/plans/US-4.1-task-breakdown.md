---
artifact: task_breakdown
story: US-4.1
version: 3
status: ARCHIVED
owner: so-implementation-planner
created_at: 2026-10-01T00:00:00Z
updated_at: 2026-10-01T00:00:00Z
supersedes: docs/plans/US-4.1-task-breakdown.md#2
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 3
  - key: impact_analysis
    version: 2
  - key: implementation_plan
    version: 2
  - key: plan_review
    version: 1
open_decisions_blocking: false
---

# Task Breakdown v3: US-4.1 — Add Claude Sonnet 5.5 and Gemini 3.8 Flash, make them the defaults, retire Sonnet 4.6

This revision is a DELTA on the nine built commits T1..T9 (`git log main..HEAD`). T1..T9 are recorded
below as DONE/built and are not re-planned; their v2 task text is superseded only in status (built).
New rework tasks T11..T13 implement plan v2 deltas D1', D2', D3', D8', D12 (spec v3, OQ-2: `max` is
removed from the `claude-sonnet-5-5` `levels`; `max` clamps to `xhigh`). T10 stays the verification-only
task and is the only still-pending original task. Numbering skips nothing: T10 precedes T11 in id only,
not in execution order (see below).

Story primary track: server. Tracks are per task. No task edits a FROZEN file; no §9 stop is carried.

## Built tasks (DONE, not re-planned)

| Id | Track | Commit | Title | Status |
|---|---|---|---|---|
| T1 | server | `eb669f0` | Widen the server clamp ordering to the new level vocabulary | DONE |
| T2 | angular | `75c98d7` | Add settings-UI labels for the new thinking levels | DONE |
| T3 | prompt | `83a859a` | Widen the client ThinkingLevel type and clamp ordering | DONE |
| T4 | prompt | `6646005` | Add Sonnet 5.5 and Gemini 3.8 Flash to the catalog, remove Sonnet 4.6 | DONE (data reworked by T11) |
| T5 | server | `05b03f4` | Price Sonnet 5.5 exactly and Gemini 3.8 Flash by date | DONE |
| T6 | server | `aa036df` | Shape Anthropic thinking-off from catalog capability | DONE (effort branch reworked by T12) |
| T7 | server | `2d5f4c6` | Flip the server fallback defaults to Sonnet 5.5 and Gemini 3.8 Flash | DONE |
| T8 | angular | `a6eb94d` | Set client defaults and replace the settings migration | DONE (comment reworked by T13) |
| T9 | server | `db74695` | Update active documentation to the new defaults | DONE |

Plan v2 "Delta against the built work" verdicts: T1, T2, T3 (code), T5, T7, T9 stay as built; `LEVEL_ORDER`
on both sides keeps `max` (FR-4) so neither clamp is reopened (impact F-5).

## Execution order

1. `T11` depends on the built T4 (and T3). First, because it carries the data change every other rework
   reads.
2. `T12` depends on `T11`. It cannot precede `T11`: `#effort` derives "model lacks `max`" from the catalog,
   and until `T11` the catalog still lists `max` for 5.5, so the new provider tests cannot go green.
3. `T13` depends on `T11` only; it is independent of `T12` (different file, different track, comment-only) and
   may run before or after it. It is not parallel with `T11`.
4. `T10` (verification only, no commit) depends on `T4`, `T6`, `T11`, `T12`; runs last.

Sequential recommendation for the remaining work: `T11, T12, T13, T10`.

Gap window noted (not a defect): between the `T11` and `T12` commits a request that bypasses the clamp with
effort `max` for 5.5 would still reach the wire; the normal route path is already safe after `T11` (D12), and
`T12` closes the bypass paths. Land `T12` immediately after `T11`.

## TDD note (applies to T11 and T12)

`so-test-writer` (TEST_WRITING) reworks the five spec files and the one new route case first, and they must
fail (red) against the current code before `so-builder` starts. Each spec rework replaces behaviour pinned by
spec v2 (`max` selectable on 5.5) with spec v3, a deliberate replacement, not a weakening (AGENTS.md §7.7).
Following the T1..T9 convention, the reworked spec files are committed in the same commit as the production
task that turns them green. A spec rework cannot be its own commit: it would leave the gate red, and the
old assertions cannot stay because they fail the moment the catalog loses `max`.

## Risk-first rationale

`T11` is first because dropping `max` from the catalog is the single decision that changes observable
behaviour on every layer (client clamp, server clamp, settings restore, slider, route resolution) and is the
precondition for `T12`'s tests; its worst failure is silent (a spec still asserting `max` selectable, or a
parity gap), so it is proven first with the parity invariant while changing course is cheap.

## T11 — Remove `max` from the Sonnet 5.5 catalog levels and rework the specs that pinned it

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T3, T4 (built) |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

`src/prompt-core/model-catalog.json`: `claude-sonnet-5-5` `levels` become exactly
`["between_tools","low","medium","high","xhigh"]` (D1'); nothing else in the JSON changes. Because both clamps
are nearest-level snaps over an ordering that still holds `max`, `max` -> `xhigh` follows on client, server,
settings restore (D8') and route resolution (D12) with no clamp code change. Comment-only edit in
`src/prompt-core/model-catalog.ts`: the `ThinkingLevel` doc (~lines 6-11) and any block comment that calls
`max` a 5.5 level are reworded so `max` is an ordering member no catalog model lists (D2').

Production change is one track (data + a comment in `src/prompt-core/`). The four spec files below sit in
other tracks/runners but are test-only edits that go green on this single data edit and cannot be committed
apart from it (see TDD note).

### Files

| File | Change |
|---|---|
| `src/prompt-core/model-catalog.json` | modify — drop `max` from 5.5 `levels` |
| `src/prompt-core/model-catalog.ts` | modify — comments only, no behaviour |
| `src/prompt-core/model-catalog.spec.ts` | rework (so-test-writer) |
| `src/services/model-settings.service.spec.ts` | rework (so-test-writer) |
| `src/app/components/model-settings/model-settings.component.spec.ts` | rework (so-test-writer) |
| `test/llm-routes.spec.ts` | add one case (so-test-writer) |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/model-catalog.spec.ts` — 5.5 `levels` toEqual five without `max`; "every 5.5 level unchanged" over five levels; client and server `clampLevel('anthropic','claude-sonnet-5-5','max')` = `xhigh`; `disabled` -> `between_tools`, `minimal` -> `low`, unknown -> `high`; explicit `max` rows per model (5.5 `xhigh`, Sonnet 5 `high`, Gemini 3.1 Pro / 3.8 / 3.7 / 3.6 Flash `high`, Haiku `disabled`); parity invariant over every catalog model x probe level (`disabled`, `between_tools`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`, unknown): client == server, result in that model's `levels`, a member probe returned unchanged (D2', F-4) | `test:logic` | AC-1, FR-1, FR-4, FR-4a |
| `src/services/model-settings.service.spec.ts` — stored 5.5 `max` restores as `xhigh`; five Sonnet 5.5 levels; `setDeepLevel('max')` -> `xhigh`; stored 4.6 + `max` migrates to 5.5 / `xhigh` and persists; `disabled`/`minimal` outcomes unchanged | `test:logic` | AC-7, FR-9, FR-4 |
| `src/app/components/model-settings/model-settings.component.spec.ts` — Deep scale on 5.5 has five steps (indices 0..4), top step `'4'` = `xhigh`; no "Max" label reachable; step `'5'`/`max` cases removed; `between_tools`/`xhigh` EN and UK labels and `setDeepLevel` cases kept | `test:components` | AC-1, FR-1, FR-4 |
| `test/llm-routes.spec.ts` — new case: request slot `{model:'claude-sonnet-5-5', level:'max'}` resolves to `level:'xhigh'`, `maxOutputTokens:128000` on the route path (`llm-request.js` -> `resolveSlot` -> `clampLevel`); existing `xhigh` case stays | `test:logic` | AC-1, FR-4, FR-4a (D12) |

### Acceptance check

Before the edit, the four reworked/added specs are red (recorded by so-test-writer). After it: both runners
(`npm run test:logic`, `npm run test:components`) green for the four files; `git diff` of the JSON shows
exactly the removal of `"max"` from the 5.5 `levels` array and `git diff` of `model-catalog.ts` shows
comment lines only; no catalog model lists `max` (asserted by the parity test); `npm run lint`,
`npm run build`, `bash arch-guard.sh` green.

### Notes

The "model lists `max` returns `max` unchanged" clause of FR-4 has no test subject after v3 and is replaced
by the invariant above (plan D2'(a)-(d)); the non-blocking spec rewording recommendation is carried in the
Result Envelope, not in this task. Both `LEVEL_ORDER` literals and `LABELS.max` (T2) are NOT touched
(plan A7).

## T12 — Add the `#effort` helper so `max` never reaches the Anthropic request for a model that lacks it

| | |
|---|---|
| **Track** | server |
| **Depends on** | T11 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

`server/providers/anthropic.js`: add private `#effort(level, model)` (D3'): `minimal` -> `low`; `max` ->
`xhigh` when `findModel('anthropic', model)?.levels ?? []` does not include `max`, else `max` passes
through; anything else unchanged. `#thinkingConfig` uses it for `output_config.effort`. `disabled` and
`between_tools` keep their `#offThinking` shape with no `output_config`. It does not call `clampLevel`
(plan A2). `extractFromPdf` is unaffected. Comment update only otherwise.

### Files

| File | Change |
|---|---|
| `server/providers/anthropic.js` | modify — `#effort`, use in `#thinkingConfig`, comment |
| `test/anthropic-provider.spec.ts` | rework (so-test-writer) |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `test/anthropic-provider.spec.ts` — `SONNET_55_LEVELS` (~262) drops `max` and feeds the FR-12 guard (no `temperature`/`top_p`/`top_k`, no forced `tool_choice` at each of five levels); `it.each` (~289): `low`..`xhigh` send exactly that effort, `max` is no longer asserted sent; a slot `level:'max'` that bypasses the clamp sends `xhigh` via both `generate` and `analyzeImage`; `FALLBACK_DEEP` with `ANTHROPIC_THINKING_EFFORT=max` sends `xhigh`; `max` appears in no 5.5 request body at any input level; an id absent from the catalog with `max` yields `xhigh`; `disabled`/`between_tools` shape cases unchanged (no `output_config`/`display`/`budget_tokens`/`block_binding`, never `{type:'disabled'}` for 5.5); Haiku and Sonnet 5 unchanged | `test:logic` | AC-8, FR-10, FR-11, FR-12 |

### Acceptance check

Before the edit the new "clamp bypassed" and `FALLBACK_DEEP`-with-`max` cases are red (recorded by
so-test-writer). After it: `npm run test:logic` green for the file; with a mocked SDK no captured 5.5
request body contains `"effort":"max"` at any input level; `xhigh` is sent for input `max`; lint, build,
arch-guard green.

### Notes

The "model lists `max` -> pass-through" branch has no catalog subject; it is testable only by mocking
`findModel` (plan D3' test-seam note). If so-test-writer judges the mock disproportionate, the omission must
be recorded in the test strategy, not silently skipped. The beta header is unchanged (NFR-7). Prompt-caching
block separation untouched (NFR-2).

## T13 — Reword the model-settings service comments that name `max` as a 5.5 capability

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T11 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

`src/services/model-settings.service.ts`: the `restore()` doc comment and service header comment that cite
`max` as a 5.5 capability are reworded to match D8' (stored `max` restores as `xhigh` via `validateSlot` ->
`clampLevel`; level-only corrections are applied in memory and persisted at the next setter call, `restore()`
persist condition deliberately not widened). Comment-only: no behaviour change.

### Files

| File | Change |
|---|---|
| `src/services/model-settings.service.ts` | modify — comments only |

### Tests to turn green

no test — this task changes no behaviour (comment only). Behaviour it describes is asserted in
`src/services/model-settings.service.spec.ts` at `T11`.

### Acceptance check

`git diff -- src/services/model-settings.service.ts` shows comment lines only (no non-comment line changed);
a grep of the file finds no comment describing `max` as a Sonnet 5.5 level; `npm run lint`, `npm run build`,
`npm run test:logic` and `bash arch-guard.sh` green (unchanged).

### Notes

Independent of `T12`. Not folded into `T11` because it is a second track.

## T10 — Verify NFR-8 timeout and truncation exposure at default `high` (no commit)

| | |
|---|---|
| **Track** | server |
| **Depends on** | T4, T6, T11, T12 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

No code. Read `server/utils/timeouts.js` (`DEEP_TIMEOUT_MS` 1,200,000 ms) against default level `high` and the
now-top level `xhigh` on 5.5, and the `anthropic.js` max_tokens throw plus the `doc-repair` repair gate against
the 128000 ceiling (D11; plan Risk 5: the 818 s `max` failure is moved out of reach, not fixed). Exception to
one-task-one-commit: a recorded finding, not a commit.

### Files

| File | Change |
|---|---|
| none | read-only; any required change is reported as a finding, not folded into this Story |

### Tests to turn green

no test — this task changes no behaviour (read-only verification).

### Acceptance check

The builder's `pipeline_status` entry records what was read and the conclusion (adequate, or a named finding);
the working tree has no diff from this task.

### Notes

Findings route to the owner; changing `timeouts.js` is out of scope for this Story. Status: pending (not yet
executed).

## Coverage table

### Plan v2 item -> tasks

| Plan item | Task(s) |
|---|---|
| D1' catalog `levels` without `max` | T11 |
| D2' ordering unchanged; F-4 parity invariant and `max` rows; `model-catalog.ts` comment | T11 (code unchanged: T1, T3) |
| D3' `#effort` provider mapping | T12 (shape base: T6) |
| D4' carried-forward decisions (analyzeImage sizing, PDF, Gemini, pricing, docs, NFR-8) | T6, T7, T5, T9 (built), T10 |
| D8' settings restore, U-5 comment rewording | T11 (behaviour via spec), T13 (comment) |
| D12 route resolution (no code) | T11 (new `llm-routes.spec.ts` case), T12 (independent second guard) |
| v1 D1 (other catalog entries), D6, D7, D9, D10, D11 | T4, T7/T8, T5, T2, T9, T10 (built / pending) |
| Test rework list (five files + route case) | `model-catalog.spec.ts` T11; `model-settings.service.spec.ts` T11; `model-settings.component.spec.ts` T11; `anthropic-provider.spec.ts` T12; `llm-routes.spec.ts` T11 |

### FR / NFR -> tasks (spec v3)

| Requirement | Task(s) |
|---|---|
| FR-1 | T4, T11 (levels without `max`) |
| FR-2, FR-3 | T4 |
| FR-4, FR-4a | T1, T3, T4, T11 |
| FR-5 | T4, T8 |
| FR-6, FR-7, FR-8 | T7 |
| FR-9 | T8, T11 (stored `max` -> `xhigh`), T13 (comment) |
| FR-10 | T6, T12 |
| FR-10a | T6 |
| FR-11 | T12 |
| FR-12 | T6, T12 (five-level guard) |
| FR-13, FR-14, FR-15 | T5 |
| FR-16 | T9 (T11/T13 comment edits) |
| FR-17 | every task ends with lint, both runners, build and arch-guard green; verified at QUALITY_GATE |
| NFR-1..NFR-4 | T6, T7, T12 (no cross-provider or prompt change) |
| NFR-5 | T5 |
| NFR-6 | T8 |
| NFR-7 | T6, T12 (header unchanged) |
| NFR-8 | T10 |

### Task -> plan item (no orphan tasks)

T1 D2; T2 D9; T3 D2; T4 D1; T5 D7; T6 D3-D5; T7 D3, D6; T8 D6, D8; T9 D10; T10 D11; T11 D1', D2', D12; T12 D3', D12; T13 D8'.

### Acceptance criteria -> tasks

AC-1 T1-T4, T11; AC-2 T4; AC-3 T8; AC-4 T7; AC-5, AC-6 T5; AC-7 T8, T11; AC-8 T6, T12; AC-9 T9; AC-10 gate.
