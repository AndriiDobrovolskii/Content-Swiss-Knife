---
artifact: pipeline_status
story: US-4.1
version: 2
status: ARCHIVED
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-10-01T00:00:00Z
updated_at: 2026-10-01T00:00:00Z
supersedes: pipeline_status v1
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 3
  - key: open_decisions
    version: 2
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

# Pipeline Status — US-4.1

Branch: `feat/US-4.1-add-sonnet-5-5-and-gemini-3-8-flash`. Verdict: `PASS`. T1..T9 and rework tasks T11..T13 committed, T10 re-verified (no commit). No FROZEN file, fixture or coverage setting touched. Nothing pushed.

| Task | Commit | Outcome |
|---|---|---|
| T1 | eb669f0 | server `LEVEL_ORDER` widened |
| T2 | 75c98d7 | EN/UK labels for `between_tools`, `xhigh`, `max` |
| T3 | 83a859a | client `ThinkingLevel` + `LEVEL_ORDER`, comments |
| T4 | 6646005 | catalog: +5.5, +3.8 Flash, -4.6 |
| T5 | 05b03f4 | pricing: exact 5.5, dated 3.8, `now` seam |
| T6 | aa036df | `#offThinking`, `#thinkingConfig(level, model)`, `analyzeImage`, `extractFromPdf` |
| T7 | 2d5f4c6 | `FALLBACK_DEEP` 5.5, Gemini `FALLBACK_FAST` 3.8/low, `clampLevel` in `generate()` and `analyzeImage()` (FR-8) |
| T8 | a6eb94d | client `DEFAULTS`, 4.6 -> 5.5 migration replaces 3.6 -> 3.7 |
| T9 | db74695 | README, `.env.example`, AGENTS.md line 55 only |
| T11 | a05da21 | `max` dropped from 5.5 `levels`; `model-catalog.ts` comment; catalog, service, component and llm-routes specs |
| T12 | 43d4f40 | `#effort(level, model)` via `findModel` (no `clampLevel`, A2); `anthropic-provider.spec.ts` |
| T13 | 6664e89 | comment-only: stored `max` restores as `xhigh` (D8') |
| T10 | none | verification only, see below |

## Notes

- Spec files were committed with the task that turns each fully green, not the first task that touches it: `model-catalog.spec.ts` with T4, `pricing.spec.ts` with T5, provider/route specs with T7, service and component specs with T8, `active-docs-models.spec.ts` with T9. Reason: committing them earlier would have put red tests on a commit.
- Task-breakdown inconsistency (recorded, not a blocker): T4's listed component-runner tests (`model-settings.component.spec.ts`) depend on the client `DEFAULTS` change that T8 owns (the component renders the stored Deep default, Sonnet 5.5, only after T8). They went green at T8. Likewise the NFR-6 Fast-parity case in `gemini-provider.spec.ts` (T7) needs T8's `DEFAULTS`. Final state is green; only the per-task attribution differs.
- T7 note (a) followed: `clampLevel('gemini', model, level)` is applied in `generate()` and `analyzeImage()` as well (FR-8), beyond plan D6 prose.
- Fast default stays `low` vs catalog `defaultLevel` `high` (accepted, plan Risk 7).

## T10 — NFR-8 verification (read-only)

Read: `server/utils/timeouts.js`, `server/providers/anthropic.js` (max_tokens throw), plan D11. `DEEP_TIMEOUT_MS` is 1,200,000 ms (20 min), already sized for the 4.6 @ high run (attempt 1 timed out at 600 s, attempt 2 ran ~533 s). Sonnet 5.5 keeps the same 128000 `maxOutputTokens` ceiling as 4.6 and the same fail-loud `stop_reason === 'max_tokens'` throw; the repair gate's `isUnrepairableGenerationError` short-circuit is unchanged. Conclusion: adequate on the available evidence. Residual (not verifiable offline): real 5.5 latency and token spend at `high`; a live first run is the only check. No finding requires a change in this Story.

## Evidence

- `npm run lint` (tsc --noEmit): clean.
- `npm test`: test:logic 150 files, 4035 passed, 3 skipped, 0 failed; test:components 2 files, 32 passed.
- `npm run build`: success.
- `bash arch-guard.sh`: ALL CHECKS PASSED.
- `test:coverage` is QUALITY_GATE's.

## Rework (v2)

- Land order T11, T12, T13 followed; T12 immediately after T11. The five reworked spec files were committed with the task that turns each green (T11: four, T12: `anthropic-provider.spec.ts`); none weakened.
- Between T11 and T12 only `anthropic-provider.spec.ts` was red (expected gap window).
- Component test assumption confirmed: top level `xhigh` renders "Extra high", no "Max" label; no production change needed.
- T13: the `restore()` doc already described the 4.6 -> 5.5 migration (T8) and no comment called `max` a 5.5 level; a D8' paragraph was added (comment-only, +5 lines).
- T10 re-run: `DEEP_TIMEOUT_MS` and the `max_tokens` fail-loud throw are unchanged; top level is now `xhigh` and default `high`; conclusion unchanged (adequate; live latency unverifiable offline).
- Evidence after T13: `npm run lint` clean; `test:logic` 150 files, 4054 passed, 3 skipped; `test:components` 32 passed; build success; arch-guard ALL CHECKS PASSED.
