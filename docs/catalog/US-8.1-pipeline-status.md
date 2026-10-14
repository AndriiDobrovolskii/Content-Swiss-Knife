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
| T4 `validateFaqStructuralParity` in `structural-parity.ts` | angular | DONE | d09f092 |
| T5 `faq-gate.ts`: `buildFaqValidator`, `isFaqStorable`, `FAQ_MAX_ATTEMPTS` | angular | DONE | 54ee224 |
| T6 `runFaqPipeline` / `storeFaq` in the orchestrator, used by `generate()` | angular | IMPLEMENTED, 6 owned tests RED (test defect, loop-back `changes_required_tests`) | f3343e1 |
| T7 `generateUaContent()` Step 4 replaced by the shared `runFaqPipeline` | angular | IMPLEMENTED, owned tests GREEN | 7f534d7 |
| T8 to T13 | - | NOT STARTED | - |

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

## T4 - results (real runs)

- File: `src/utils/structural-parity.ts` only (not FROZEN); `validateFaqStructuralParity(master, translated, context)` appended with its own `FAQ_COUNTED_TAGS` (`<h3`, `<p`, `<ul`, `<li`). `git diff`: 41 insertions, 0 deletions; no changed line in `validateStructuralParity`, `COUNTED_TAGS` or `restoreMediaSrcs`; `html-editor.component.ts` untouched. CRLF preserved.
- `npx vitest run src/utils/structural-parity.faq.spec.ts src/utils/structural-parity.spec.ts src/utils/structural-parity.v4.spec.ts src/utils/structural-parity-restore.spec.ts src/utils/simplified-translation-parity.spec.ts`: `Test Files  5 passed (5)`, `Tests  66 passed (66)`.
- Whole `test:logic` (`vitest run`), post-T3 vs post-T4: failed 502 -> 486, passed 5636 -> 5652 (+16 = the `structural-parity.faq.spec.ts` tests), 3 skipped; failed test files 7. No test that passed post-T3 now fails; the 486 remaining failures are in specs owned by later tasks.
- Per-task compile gate: `npx tsc --noEmit | grep "error TS" | grep -v -E "(faq-gate|content-orchestrator.faq-standalone|faq-form|tab-descriptors).spec.ts\("` prints nothing; 13 diagnostics remain (tab-descriptors 8, faq-standalone 3, faq-form 1, faq-gate 1), all in table A specs owned by T5, T8, T9, T10; `structural-parity.faq.spec.ts` carries none. `npm run lint` / `npm run build` are judged by this gate until T10.
- `bash arch-guard.sh`: exit 0. No FROZEN file touched, no `--rebaseline`.
- `npm run test:components`: not run (accepted as unevaluated until T10/QUALITY_GATE; no component spec touched).

## T5 - results (real runs)

- File: `src/utils/faq-gate.ts` only (new, not FROZEN; `output-validator.ts` and `repair-strategy.ts` untouched, `validateGeneratedHtml` imported). `git show --stat 54ee224`: 1 file, 102 insertions. Pure module, CRLF line endings matching the checkout. Issue order as pinned: shape issues, then (translation only) `validateFaqStructuralParity`, then the frozen `validateGeneratedHtml` issues and the `non-html-output` check, the last two forced to `severity: 'warning'`; `providerFailed()` true returns exactly one path-less `faq-provider-error`.
- `npx vitest run src/utils/faq-gate.spec.ts src/utils/repair-strategy.spec.ts src/utils/repair-gate.spec.ts`: `Test Files  3 passed (3)`, `Tests  214 passed (214)` (`faq-gate.spec.ts` failed at load, "module not found", before this task). `resolveLadder` is pinned to `['full-regen']` for every emitted contract rule id by `faq-gate.spec.ts`; `REPAIR_STRATEGIES` has none of them.
- Whole `test:logic` (`vitest run`), post-T4 vs post-T5: failed 486 -> 486, passed 5652 -> 5696 (+44 = the `faq-gate` tests), 3 skipped; failed test files 6. No test that passed post-T4 now fails; the 486 remaining failures are in specs owned by later tasks.
- Per-task compile gate: `npx tsc --noEmit | grep "error TS" | grep -v -E "(content-orchestrator.faq-standalone|faq-form|tab-descriptors).spec.ts\("` prints nothing; 12 diagnostics remain (13 post-T4 minus the 1 TS2307 formerly in `faq-gate.spec.ts`), all in table A specs owned by T8, T9, T10; `faq-gate.spec.ts` carries none. `npm run lint` / `npm run build` are judged by this gate until T10.
- `bash arch-guard.sh`: exit 0. No FROZEN file touched, no `--rebaseline`.
- `npm run test:components`: not run (accepted as unevaluated until T10/QUALITY_GATE; no component spec touched).

## T6 - results (real runs)

- File: `src/services/content-orchestrator.service.ts` only (not FROZEN). `git show --stat f3343e1`: 1 file, 167 insertions, 67 deletions. Added `runFaqPipeline` (trigger FR-5, SP-3 skip with `console.warn`, master, store-or-skip, sequential translations, outer try/catch so it never throws), `runFaqGate` (one artifact through `runRepairGate`, `maxRepairs = FAQ_MAX_ATTEMPTS - 1`, `threw` reset at the start of every `produce`, `convertStrongToB` after `stripCodeFences` and around `repairBlocks`, own try/catch), `faqTranslationPayload` (the single OD-6 seam) and `storeFaq` (re-applies `convertStrongToB`). `generate()` Step 5 (the inline per-language FAQ loop) is replaced by `await this.runFaqPipeline(input, useThinking)`, before `runOutputValidation`. `generateUaContent()` Step 4 is untouched (T7). Translation targets come from `getLangsForStore(...).transLangs` (Task C keys) mapped back with `taskLangToIso` for labels and `faqArtifacts` keys. No literal language list or currency symbol, no retrieval call, no prompt text in the service.
- `npx vitest run src/services/content-orchestrator.faq-pipeline.spec.ts -t "Generator \(generate\)"`: 249 passed, 6 failed, 285 skipped (by the filter). The 6 failures are exactly `Generator (generate) > AGENTS.md section 4 at normaliser level (FR-21, FR-23) > FR-21: <store> - the English translation of a number adjoined to a unit is stored as "1.75 mm"`, one per store with an `en-*` language (3DDevice, 3DPrinter, 3DScanner, Center 3D Print, EXPERT3D, Expert-3DPrinter), at `faq-pipeline.spec.ts:404`.
- `npx vitest run src/services/content-orchestrator.simplified.spec.ts -t "R6"`: 13 passed, 1 failed; the failure is the UA-only test owned by T7 ("UA-only mode ... ONE uk-UA FAQ generation, translated into every other store language"). The 4 Generator R6 tests pass. Whole file: 28 passed, 1 failed.
- **Test defect (not fixed in code, test files are not owned by the builder).** Expected `'1.75 mm'` (spec line 404, bytes `31 2e 37 35 20 6d 6d`, an ASCII space `20`); received `"<h3>Which filament?</h3><p>Use 1.75 mm filament.</p>"` where the space is U+00A0 (`a0`, confirmed by a probe of the stored text). The NBSP is inserted by `src/utils/number-format-fixer.ts` (`NBSP` between a digit and its unit, lines 154-166) for every locale, on purpose, and it is the same chain the description translation loop runs (spec FR-21: "the deterministic number/unit-spacing normalisation that the FAQ path applies today"). The master FR-21 guard of the same spec accepts it (`/1[.,]75\s(?:mm|мм)/`); only the English translation assertion uses a literal ASCII space. Stripping the NBSP in the FAQ path would diverge from the description path and is not in the plan. The UA-mode twin of this test fails the same way and will do so at T7.
- Whole `test:logic` (`vitest run`, JSON reporter, compared test by test against a stash of the post-T5 tree): failed 486 -> 320, passed 5696 -> 5862 (+166), 3 skipped; 0 tests that passed post-T5 now fail. The 320 remaining failures: `content-orchestrator.faq-pipeline.spec.ts` 187 (6 this defect in Generator mode, 154 UA groups and 6 UA FR-21 twins for T7, 21 FR-19 parity tests for T7), `content-orchestrator.faq-standalone.spec.ts` 112 (T8), `app.component.template-wiring.spec.ts` 20 (T9/T11/T12), `content-orchestrator.simplified.spec.ts` 1 (T7).
- Per-task compile gate: `npx tsc --noEmit | grep "error TS" | grep -v -E "(content-orchestrator.faq-standalone|faq-form|tab-descriptors).spec.ts\("` prints nothing; 12 diagnostics remain, all in those three table A specs owned by T8, T9, T10 (unchanged from post-T5); `faq-pipeline.spec.ts` and `simplified.spec.ts` carry none. `npm run lint` / `npm run build` are judged by this gate until T10.
- `bash arch-guard.sh`: exit 0. No FROZEN file touched, no `--rebaseline`.
- `npm run test:components`: not run (accepted as unevaluated until T10/QUALITY_GATE; no component spec touched).
- Outcome: the implementation is complete and committed; the 6 Generator FR-21 English-translation tests cannot pass without changing a test, so the task is reported as CHANGES_REQUIRED with loop-back `changes_required_tests`. After the test fix T6 needs a re-run, not a rebuild.

## T7 - results (real runs)

- File: `src/services/content-orchestrator.service.ts` only (not FROZEN). `git show --stat 7f534d7`: 1 file, 5 insertions, 50 deletions. `generateUaContent()` Step 4 (the uk-UA-only inline FAQ gate with no locale overlay) is replaced, not wrapped, by `await this.runFaqPipeline(input, useThinking)`; the post-FAQ code (validation, table finalisation, history) is unchanged. `grep -n buildPromptFaq` shows it only at the import and inside `runFaqPipeline` (line 825). No literal language list or currency symbol, no retrieval, no prompt text added.
- `npx vitest run src/services/content-orchestrator.faq-pipeline.spec.ts src/services/content-orchestrator.simplified.spec.ts src/services/content-orchestrator.ua-doc-pipeline.spec.ts`: `Test Files  3 passed (3)`, `Tests  572 passed (572)` (Generator and UA groups, FR-19 parity and premise groups, the simplified `UA-only mode` test, the UA FR-21 twins with the NBSP-tolerant assertion from c62e30a).
- Whole `test:logic` (`vitest run`), post-T6-correction vs post-T7: failed 314 -> 132, passed 5868 -> 6050 (+182), 3 skipped (total 6185 both times); 0 tests that passed before now fail. The remaining failing files are exactly the later-task specs: `content-orchestrator.faq-standalone.spec.ts` 112 failed tests (T8), `app.component.template-wiring.spec.ts` 20 failed tests (T9/T11/T12), and `faq-form.spec.ts` and `tab-descriptors.spec.ts` failing at load, module not found (T9, T10).
- Per-task compile gate: `npx tsc --noEmit` prints 12 diagnostics, all in `tab-descriptors.spec.ts` (8), `content-orchestrator.faq-standalone.spec.ts` (3) and `faq-form.spec.ts` (1), the allowlist after T7; `faq-pipeline.spec.ts` and `simplified.spec.ts` carry none. `npm run lint` / `npm run build` are judged by this gate until T10.
- `bash arch-guard.sh`: exit 0, "All frozen files unchanged". No FROZEN file touched, no `--rebaseline`.
- `npm run test:components`: not run (accepted as unevaluated until T10/QUALITY_GATE; no component spec touched).
- Outcome: T7 complete, one commit, no test file touched.

## Notes

- Test components are accepted as unevaluated until T10/QUALITY_GATE (user decision); no stub was added.
- No test file, fixture, golden or coverage setting was modified.
- Not edited: `master-system-prompt.ts`, `constants.ts`, `task-a.ts`, `task-b.ts`, `output-validator.ts`, any `.spec.ts`.
- `.arch-guard-checksums` is hashed from the working-copy bytes (the file `task-c.ts` is CRLF in this checkout); the edit preserved the existing CRLF line endings.
- QUALITY_GATE not run (owned by so-gate-enforcer).
