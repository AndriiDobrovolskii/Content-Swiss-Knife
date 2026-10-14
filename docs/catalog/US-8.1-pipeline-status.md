---
artifact: pipeline_status
story: US-8.1
version: 1
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-10-14T20:30:00Z
updated_at: 2026-10-14T20:30:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: open_decisions
    version: 1
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 1
  - key: task_breakdown
    version: 3
  - key: plan_review
    version: 3
  - key: test_strategy
    version: 1
  - key: ac_test_matrix
    version: 1
open_decisions_blocking: false
---

# Pipeline status: US-8.1

| Task | Track | Status | Commit |
|---|---|---|---|
| T1 FAQ variant in task-c.ts (FROZEN, operator-approved) + re-baseline | prompt | DONE | da59195 |
| T2 `<strong>` to `<b>` in the FAQ generation prompt | prompt | DONE | 3698434 |
| T3 `faq-html.ts`: `convertStrongToB`, `validateFaqShape` | angular | DONE | c7197f0 |
| T4 to T13 | - | NOT STARTED | - |

## T1 - section 9 stop and approval record

- File: `src/prompts/task-c.ts` (FROZEN, AGENTS.md section 9). Only this file; `master-system-prompt.ts`, `constants.ts` and every other FROZEN file were not touched.
- Exact change: additive FAQ translation variant (FR-12, FR-14) - the `opts` type gains `contentKind?: 'description' | 'faq'`, one early `return` at the top of `buildPromptC`, and new constants/functions appended below the existing code. No description-path line changed (the only removed line in the diff is the old `opts` type in the signature).
- Why: FR-12/FR-13 cannot be met in any other file, because `buildPromptC` is the dispatch point for the Task C prompt.
- Approval: the operator's explicit instruction in the builder session, quoted verbatim: "modify src/prompts/task-c.ts 1. I explicitly grant permission to modify src/prompts/task-c.ts under AGENTS.md §9. Re-baseline .arch-guard-checksums in commit T1." It covers this one file for T1 only. Story v2's earlier record of the permission was not relied on.
- FR-12 item 3 audit: `PRODUCT_NAME_LOCALIZATION` (contains `<h2`, `CTA`, `Technical specifications`), `EXPERT3D_PT_LOCALE_TOV` (`CTA`, `[Delivery`) and `C3D_TOV_TRANSLATION_OVERLAY` (`<h2`, `CTA`) failed the forbidden-marker scan and are NOT reused; compact FAQ-specific equivalents are written in `task-c.ts`. `UNIT_LOCALIZATION_RULES`, `US_MEASUREMENT_RULES`, `EXPERT3D_TOV_TRANSLATION_OVERLAY`, `NO_LEAKED_REASONING_CLAUSE` and `UK_SOURCE_ANTICALQUE` scanned clean and are reused. `MASTER_SYSTEM_PROMPT` is not included, so no second section 9 stop was needed.

## T1 - results (real runs)

- `bash arch-guard.sh` before the edit: exit 0. `npx vitest run src/prompts/task-c.description-bytes.spec.ts` before the edit: 100 passed (golden taken from the unmodified file).
- After the edit, `npx vitest run src/prompts/task-c.faq.spec.ts src/prompts/task-c.description-bytes.spec.ts src/prompts/task-c.spec.ts src/prompts/full-description.golden.spec.ts`: `Test Files  4 passed (4)`, `Tests  293 passed (293)`. No golden regenerated, no `-u`.
- `bash arch-guard.sh` before `--rebaseline` reported only `src/prompts/task-c.ts` as changed; after `--rebaseline` it exits 0. `.arch-guard-checksums` diff is the single `task-c.ts` line, committed in the same commit as the edit.
- `git show --stat da59195`: `.arch-guard-checksums` (1 line) and `src/prompts/task-c.ts` (+173/-1) only.
- Whole `test:logic` (`vitest run`), before vs after T1 (compared test by test): failed 570 -> 505, passed 5522 -> 5587; 0 tests that passed before now fail; 65 turned green (all of `task-c.faq.spec.ts`). The 505 remaining failures are in specs owned by later tasks: `app.component.template-wiring.spec.ts` (20, T9/T11/T12), `task-faq.spec.ts` (3, T2), `content-orchestrator.faq-pipeline.spec.ts` (349, T6/T7), `content-orchestrator.faq-standalone.spec.ts` (112, T8), `content-orchestrator.simplified.spec.ts` (5, T6/T7), `structural-parity.faq.spec.ts` (16, T4), and the load-failure suites `faq-html` (T3), `faq-gate` (T5), `faq-form` (T9), `tab-descriptors` (T10).
- Per-task compile gate: `npx tsc --noEmit | grep "error TS" | grep -v -E "(faq-html|structural-parity.faq|faq-gate|content-orchestrator.faq-standalone|faq-form|tab-descriptors).spec.ts\("` prints nothing. 17 diagnostics remain, all in those six table A specs (TS2307 x5, TS2339 x3, TS2345 x7, TS2724 x2); none in `task-c.faq.spec.ts`, none in a non-spec file, none in a table B spec. `npm run lint` / `npm run build` are judged by this per-task gate until T10 (the exit code is non-zero while the allowlist is non-empty).
- `npm run test:components` (Karma): not run; no component, template or Karma spec was touched by T1.

## T2 - results (real runs)

- File: `src/prompts/task-faq.ts` only (not FROZEN). Two occurrences changed: the header doc comment and the output-contract tag list now read `<p>, <b>, <ul>, <li>`; `git diff --stat`: 1 file, 2 insertions, 2 deletions; CRLF line endings preserved; `grep strong src/prompts/task-faq.ts` prints nothing.
- `npx vitest run src/prompts/task-faq.spec.ts src/prompts/task-faq.v4.spec.ts`: `Test Files  2 passed (2)`, `Tests  18 passed (18)` (the 3 AC-6 tests were red before).
- Whole `test:logic` (`vitest run`), post-T1 vs post-T2: failed 505 -> 502, passed 5587 -> 5590 (3 skipped); the 3 newly green tests are the AC-6 group of `task-faq.spec.ts`; no test that passed post-T1 now fails (counts move by exactly the 3).
- Per-task compile gate: `npx tsc --noEmit | grep "error TS" | grep -v -E "(faq-html|structural-parity.faq|faq-gate|content-orchestrator.faq-standalone|faq-form|tab-descriptors).spec.ts\("` prints nothing; 17 diagnostics in total, unchanged from post-T1, all in table A specs. `task-faq.spec.ts` (table B) carries none.
- `bash arch-guard.sh`: exit 0. No FROZEN file touched, no `--rebaseline`.
- `npm run test:components`: not run (accepted as unevaluated until T10/QUALITY_GATE; no component spec touched).

## T3 - results (real runs)

- File: `src/utils/faq-html.ts` only (new, not FROZEN; `output-validator.ts` untouched, only the `ValidationIssue` type is imported). `git show --stat c7197f0`: 1 file. Pure module: stack-based tokenizer, no `DOMParser`, no DOM, clock or random call (NFR-8). CRLF line endings, matching the checkout.
- `npx vitest run src/utils/faq-html.spec.ts`: `Test Files  1 passed (1)`, `Tests  46 passed (46)` (the suite failed at load, "module not found", before this task).
- Whole `test:logic` (`vitest run`), post-T2 vs post-T3: failed 502 -> 502, passed 5590 -> 5636 (+46 = the new `faq-html` tests), 3 skipped; failed test files 8. No test that passed post-T2 now fails; the 502 remaining failures are in specs owned by later tasks (T4, T5, T6/T7, T8, T9, T10, T11/T12).
- Per-task compile gate: `npx tsc --noEmit | grep "error TS" | grep -v -E "(structural-parity.faq|faq-gate|content-orchestrator.faq-standalone|faq-form|tab-descriptors).spec.ts\("` prints nothing; 15 diagnostics remain (17 post-T2 minus the 2 TS2307/TS2345 formerly in `faq-html.spec.ts`), all in table A specs owned by T4, T5, T8, T9, T10; `faq-html.spec.ts` carries none. `npm run lint` (= `tsc --noEmit`) and `npm run build` are judged by this gate until T10.
- `bash arch-guard.sh`: exit 0. No FROZEN file touched, no `--rebaseline`.
- `npm run test:components`: not run (accepted as unevaluated until T10/QUALITY_GATE; no component spec touched).

## Notes

- Test components are accepted as unevaluated until T10/QUALITY_GATE (user decision); no stub was added.
- No test file, fixture, golden or coverage setting was modified.
- Not edited: `master-system-prompt.ts`, `constants.ts`, `task-a.ts`, `task-b.ts`, `output-validator.ts`, any `.spec.ts`.
- `.arch-guard-checksums` is hashed from the working-copy bytes (the file `task-c.ts` is CRLF in this checkout); the edit preserved the existing CRLF line endings.
- QUALITY_GATE not run (owned by so-gate-enforcer).
