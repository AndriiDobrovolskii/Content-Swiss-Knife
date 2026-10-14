---
artifact: pipeline_status
story: US-8.1
version: 1
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-10-14T20:30:00Z
updated_at: 2026-10-14T21:30:00Z
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
| T6 `runFaqPipeline` / `storeFaq` in the orchestrator, used by `generate()` | angular | DONE (the 6 FR-21 English-translation tests were a test defect, corrected in c62e30a; they pass) | f3343e1 |
| T7 `generateUaContent()` Step 4 replaced by the shared `runFaqPipeline` | angular | IMPLEMENTED, owned tests GREEN | 7f534d7 |
| T8 `generateFaqOnly()` standalone orchestrator method | angular | DONE | 9f20a15 |
| T9 `AppMode` + `TOOL_LABEL` + `faq-form.ts` (+ feedback form `create-form.gs` entry) | angular | DONE | e8dcf56 |
| T10 `deriveTabDescriptors` extracted, UA-Description and FAQ-only tab cases | angular | DONE | 3e9db41 |
| T11 FAQ Generator component state and `generateFaqOnly()` call | angular | DONE | 88670be |
| T12 FAQ Generator mode button, form and Generate button in the template | angular | DONE | c04096a |
| T13 README documentation | angular | DONE | 7a0613e |

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
- Outcome at the time: the 6 Generator FR-21 English-translation tests could not pass without changing a test (reported as `changes_required_tests`). Resolution: test correction c62e30a accepts the NBSP unit spacing; after it the 6 tests pass (post-T6-correction state: failed 314, passed 5868) and T6 needed a re-run, not a rebuild. T6 is DONE.

## T7 - results (real runs)

- File: `src/services/content-orchestrator.service.ts` only (not FROZEN). `git show --stat 7f534d7`: 1 file, 5 insertions, 50 deletions. `generateUaContent()` Step 4 (the uk-UA-only inline FAQ gate with no locale overlay) is replaced, not wrapped, by `await this.runFaqPipeline(input, useThinking)`; the post-FAQ code (validation, table finalisation, history) is unchanged. `grep -n buildPromptFaq` shows it only at the import and inside `runFaqPipeline` (line 825). No literal language list or currency symbol, no retrieval, no prompt text added.
- `npx vitest run src/services/content-orchestrator.faq-pipeline.spec.ts src/services/content-orchestrator.simplified.spec.ts src/services/content-orchestrator.ua-doc-pipeline.spec.ts`: `Test Files  3 passed (3)`, `Tests  572 passed (572)` (Generator and UA groups, FR-19 parity and premise groups, the simplified `UA-only mode` test, the UA FR-21 twins with the NBSP-tolerant assertion from c62e30a).
- Whole `test:logic` (`vitest run`), post-T6-correction vs post-T7: failed 314 -> 132, passed 5868 -> 6050 (+182), 3 skipped (total 6185 both times); 0 tests that passed before now fail. The remaining failing files are exactly the later-task specs: `content-orchestrator.faq-standalone.spec.ts` 112 failed tests (T8), `app.component.template-wiring.spec.ts` 20 failed tests (T9/T11/T12), and `faq-form.spec.ts` and `tab-descriptors.spec.ts` failing at load, module not found (T9, T10).
- Per-task compile gate: `npx tsc --noEmit` prints 12 diagnostics, all in `tab-descriptors.spec.ts` (8), `content-orchestrator.faq-standalone.spec.ts` (3) and `faq-form.spec.ts` (1), the allowlist after T7; `faq-pipeline.spec.ts` and `simplified.spec.ts` carry none. `npm run lint` / `npm run build` are judged by this gate until T10.
- `bash arch-guard.sh`: exit 0, "All frozen files unchanged". No FROZEN file touched, no `--rebaseline`.
- `npm run test:components`: not run (accepted as unevaluated until T10/QUALITY_GATE; no component spec touched).
- Outcome: T7 complete, one commit, no test file touched.

## T8 - results (real runs)

- File: `src/services/content-orchestrator.service.ts` only (not FROZEN). `git show --stat 9f20a15`: 1 file, 28 insertions, 0 deletions; CRLF preserved. Added `generateFaqOnly(input, useThinking)` after `generateSlugs`: returns at once (no call, no state change, no progress, no history) when `supplementalContent` is blank; otherwise sets `content` to the AC-13 shape (`mainHtmlUa: ''`, `translations: {}`, `seoData: null`, `slugData: null`, `website`, `faqArtifacts: {}`, `mainHtmlLocale: MASTER_LOCALE`), resets `validationIssues`, `repairReport`, both patch tallies and `repairReportMeta`, then inside `withProgress` awaits `runFaqPipeline`, writes one history entry and sets "FAQ Generation Done!". No description, SEO or slug call, no `runOutputValidation` / `finalizeTablesForDisplay`, no download code, `zip-generator.ts` untouched. A failed master still ends with the AC-13 shape and one history entry (the pipeline never throws); this follows the sibling methods and is not pinned further by the spec. Uses the `MASTER_LOCALE` constant, no literal language list or currency symbol.
- `npx vitest run src/services/content-orchestrator.faq-standalone.spec.ts src/services/content-orchestrator.faq-pipeline.spec.ts`: `Test Files  2 passed (2)`, `Tests  652 passed (652)`. `npx vitest run content-orchestrator.simplified.spec.ts content-orchestrator.ua-doc-pipeline.spec.ts content-orchestrator.doc-gate.spec.ts`: `Test Files  3 passed (3)`, `Tests  48 passed (48)`.
- Whole `test:logic` (`vitest run`, JSON reporter), post-T7 vs post-T8: failed 132 -> 20, passed 6050 -> 6162 (+112 = the `faq-standalone` tests), 3 skipped (total 6185 both times); no test that passed post-T7 now fails (counts move by exactly the 112). The 20 remaining failures are all in `app.component.template-wiring.spec.ts` (T9/T11/T12); `faq-form.spec.ts` (T9) and `tab-descriptors.spec.ts` (T10) still fail at load, module not found.
- Per-task compile gate: `npx tsc --noEmit | grep "error TS"` prints 9 diagnostics, all in `tab-descriptors.spec.ts` (8) and `faq-form.spec.ts` (1), the allowlist after T8; `faq-standalone.spec.ts` carries none (its 3 TS2339 are gone); table B specs carry none. `npm run lint` / `npm run build` are judged by this gate until T10.
- `bash arch-guard.sh`: exit 0, all checks passed. No FROZEN file touched, no `--rebaseline`.
- `npm run test:components`: not run (accepted as unevaluated until T10/QUALITY_GATE; no component spec touched).
- Open points left as recorded (not decided here): OD-6 (the `faqTranslationPayload` seam is unchanged), OD-8, OD-9 (empty `description_uk-UA.html` in a standalone ZIP unchanged; TXT download of a FAQ-only run is open point OD-9(e), no download code changed).
- Outcome: T8 complete, one commit, no test file touched.

## T9 - results (real runs)

- Files (`git show --stat e8dcf56`: 4 files, 30 insertions, 1 deletion; none FROZEN): `src/app/types.ts` (`AppMode` + `'faq-generator'`), `src/app/app.component.ts` (the `TOOL_LABEL` entry `'faq-generator': 'FAQ Generator'` only, nothing else in the file), `src/utils/faq-form.ts` (new: `FaqFormValues`, `isFaqFormComplete`; pure, `WebsiteOption` imported as a type), `tools/feedback-form/create-form.gs` (one `'FAQ Generator'` entry in `TOOLS`, built as written despite the scope-growth flag; no test, reviewed by reading).
- `npx vitest run src/utils/faq-form.spec.ts src/app/app.component.template-wiring.spec.ts`: `faq-form.spec.ts` 21 of 21 passed (`faq-form.spec.ts` now loads, its diagnostic is gone); the two T9 pins in the template-wiring spec pass ("AppMode includes faq-generator", "TOOL_LABEL ... maps it to FAQ Generator"). The 18 other tests of the template-wiring spec still fail by design (T11 component pins, T12 template pins).
- Whole `test:logic` (`vitest run`), post-T8 vs post-T9: failed 20 -> 18, passed 6162 -> 6185 (+23 = 21 `faq-form` tests + 2 `TOOL_LABEL` pins), 3 skipped; `Test Files  2 failed | 182 passed (184)`. No test that passed post-T8 now fails (the counts move by exactly the 23). The remaining failures: 18 in `app.component.template-wiring.spec.ts` (T11/T12) and `tab-descriptors.spec.ts` failing at load, module not found (T10).
- Per-task compile gate: `npx tsc --noEmit | grep "error TS"` prints exactly one line, `src/app/tab-descriptors.spec.ts(32,91): error TS2307`, in the allowlist after T9; zero diagnostics in any non-spec file (so the `Record<AppMode, string>` exhaustiveness holds and no other exhaustive `AppMode` consumer exists), `faq-form.spec.ts` and the table B specs carry none. `npm run lint` / `npm run build` are judged by this gate until T10.
- `bash arch-guard.sh`: exit 0, all checks passed. No FROZEN file touched, no `--rebaseline`.
- `npm run test:components`: not run (accepted as unevaluated until T10/QUALITY_GATE; no component spec touched).
- Outcome: T9 complete, one commit (e8dcf56), no test file touched.

## T10 - results (real runs)

- Files (`git show --stat 3e9db41`: 2 files, 105 insertions, 45 deletions; none FROZEN): `src/app/tab-descriptors.ts` (new: `TabDescriptorLabels`, `TabDescriptorContext`, `deriveTabDescriptors`; resolves the store with `getStore` and the task key with `bcp47ToTaskCLang`, no literal language list) and `src/app/app.component.ts` (the `tabDescriptors` computed now only gathers the context and delegates; `_autoSelectTab` skips `'seo'` for `faq-generator`; the two now-unused `getStore` / `bcp47ToTaskCLang` imports were dropped, `deriveTabDescriptors` imported). `ua-generator` returns the description tab plus a FAQ tab per language with a `faqArtifacts` entry (uk-UA first, `faq-html`, then `faq-trans-${iso}` in `store.languages` order); `faq-generator` returns FAQ tabs only (`faq-html` labelled `labels.baseFaqTab`).
- Move-only check (plan R10), run before and after. Before: `sed -n 583,629p src/app/app.component.ts` saved (47 lines, identical sha1 to `git show HEAD:...`). After: the non-`ua-generator` body of the old computed (HEAD lines 604-629, from the "master locale" comment to `return tabs;`) was compared with the matching block of `tab-descriptors.ts` after whitespace stripping and only the substitutions `this.baseOutputLabel()` -> `labels.baseOutput`, `this.baseFaqTabLabel()` -> `labels.baseFaqTab`, `c.faqArtifacts` -> `faqArtifacts`, `c.translations` -> `ctx.translations`, `c.mainHtmlLocale` -> `ctx.mainHtmlLocale`: `diff` printed nothing (MOVE_ONLY_IDENTICAL). Loop order, ids, labels, colors and the `continue` condition are unchanged. `git diff -w --color-moved=zebra` cannot show the relocation (the code moved to a new file) so it shows the deletion in `app.component.ts` only. The Generator-mode literals in `tab-descriptors.spec.ts` were not touched.
- `npx vitest run src/app/tab-descriptors.spec.ts`: `Tests  51 passed (51)`.
- Whole `test:logic` (`vitest run`), post-T9 vs post-T10: failed 18 -> 17, passed 6185 -> 6237 (+52 = 51 `tab-descriptors` tests + the pin "_autoSelectTab does not add the SEO tab id for faq-generator"), 3 skipped; `Test Files  1 failed | 183 passed (184)`. Verified by diffing the failing-test names against a stashed run of the T9 state: the only difference is that one pin; nothing that passed before now fails. The 17 remaining failures are all in `app.component.template-wiring.spec.ts` (T11/T12).
- Compile gate with the EMPTY allowlist: `npm run lint` (`tsc --noEmit`) exit 0, zero diagnostics; `npm run build` (`ng build`) exit 0 (only the existing js-beautify / jszip "not ESM" warnings).
- `npm run test:components` (`ng test --watch=false`, first attempt now that the program compiles): exit 0, `Test Files  2 passed (2)`, `Tests  32 passed (32)`. It ran for real; no fix was needed or made.
- `bash arch-guard.sh`: exit 0, all checks passed. No FROZEN file touched, no `--rebaseline`.
- Outcome: T10 complete, one commit (3e9db41), no test file touched.

## T11 - results (real runs)

- File (`git show --stat 88670be`: 1 file, 62 insertions, 1 deletion; not FROZEN): `src/app/app.component.ts` only. Added the signals `faqSelectedWebsite`, `faqProductName`, `faqDescription`, `faqSpecs`, `faqSupplementalContent`; `isFaqFormValid` (computed through `isFaqFormComplete` with website, product name and supplemental content only, so Original Description and Tech Specs never gate Generate); `onFaqWebsiteChange` and `updateFaqProductName` (input handlers the T12 template will bind); `generateFaqOnly()` (re-checks `!site || !isFaqFormValid()`, alerts with the existing `alertFillFields` label and returns before any orchestrator call; otherwise builds the `ProductInput` with description, specs and supplemental content, sets the active tab to `faq-html` and calls `orchestrator.generateFaqOnly(input, seoUseThinking())`); the `activeProductName` branch; the `clearAll()` branch (clears the five signals, sets `faqArtifacts: {}` and `website: undefined`, resets `validationIssues`); `hasFaqOutput` (from `faqArtifacts` keys) included in `hasOutput`; and the labels `faqGenerator` ("FAQ Generator" in en and uk), `faqOnlyTitle`, `faqGenBtn` in `TRANSLATIONS` en and uk. Ukrainian UI strings only for the title and button; code and comments English.
- Not touched: `downloadZip` / `downloadText` (`git diff` has no match), `restoreHistory`, any download code, `zip-generator.ts`, the template. No `AppComponent` spec added. No secret or key in browser code.
- `npx vitest run src/app/app.component.template-wiring.spec.ts src/app/app.component.export-guard.spec.ts`: export guard green; template-wiring 7 failed, 33 passed in the two files. All 10 T11 component pins pass (en and uk label, `isFaqFormValid` via `isFaqFormComplete`, no Description/Specs in validity, guard-then-return in `generateFaqOnly`, description/specs/supplemental reach `ProductInput`, `seoUseThinking()`, `activeProductName`, `clearAll`, `hasOutput`). The 7 remaining failures are the T12 template pins (mode button, Extended Thinking toggle in the FAQ form, text inputs, no template dropdown, Generate button binding, three result-view conditions, SEO tab hidden).
- Whole `test:logic` (`vitest run`), post-T10 vs post-T11: failed 17 -> 7, passed 6237 -> 6247 (+10 = the T11 component pins), 3 skipped; `Test Files  1 failed | 183 passed (184)`. Only that spec fails; nothing that passed post-T10 now fails (the counts move by exactly the 10). The 7 remaining failures are T12-owned.
- Compile gate with the EMPTY allowlist: `npx tsc --noEmit` exit 0, zero diagnostics; `npm run build` exit 0, zero errors (only the existing file-saver / js-beautify / jszip "not ESM" warnings). No template change was needed, so the template type-check is unaffected until T12.
- `npm run test:components`: exit 0, `Test Files  2 passed (2)`, `Tests  32 passed (32)`.
- `bash arch-guard.sh`: exit 0. No FROZEN file touched, no `--rebaseline`.
- Open points left as recorded (not decided here): OD-8 (history restore and skipped-language messaging unchanged), OD-9(e) (TXT download of a FAQ-only run: `hasOutput` is now true for a FAQ-only result so the existing download controls appear; no download code changed and nothing hidden).
- Outcome: T11 complete, one commit (88670be), no test file touched.

## T12 - results (real runs)

- File (`git show --stat c04096a`: 1 file, 111 insertions, 5 deletions; not FROZEN; the CRLF line endings of the checkout were preserved): `src/app/app.component.html` only. Added a FAQ Generator mode button in the vacant cell of the UA row of the `grid-cols-2` switcher (label `uiLabels().faqGenerator`); an `@else if (appMode() === 'faq-generator')` sidebar form after the Slug form (store select bound to `faqSelectedWebsite` / `onFaqWebsiteChange`, Product Name input bound to `updateFaqProductName`, three `app-source-input` for Original Description (not required), Tech Specs (not required) and Supplemental Content (required), the shared Extended Thinking toggle via `seoUseThinking()` / `toggleSeoThinking()`, no content-template select); a Generate button in the footer chain calling `generateFaqOnly()` with `[disabled]="isGenerating() || !isFaqFormValid()"`; `'faq-generator'` added to the three conditions (download-controls `@if`, result-view `@if`, header `@if`); the SEO tab button condition is now `appMode() !== 'slug-generator' && appMode() !== 'faq-generator'`; and the busy-overlay spinner got green border bindings for the mode (cosmetic, same file, mirrors the other modes).
- Not touched: any download control or code (the ZIP and TXT buttons stay as they were; OD-9(e) not decided), `restoreHistory`, the FAQ tab panels (they already render from `faqArtifacts`), any TypeScript, any spec. `grep -c "content-template-select" src/app/app.component.html`: 2 before, 2 after.
- `npx vitest run src/app/app.component.template-wiring.spec.ts src/app/app.component.export-guard.spec.ts`: `Test Files  2 passed (2)`, `Tests  40 passed (40)`; the 7 T12 pins pass.
- Whole `test:logic` (`vitest run`), post-T11 vs post-T12: failed 7 -> 0, passed 6247 -> 6254 (+7 = the T12 pins), 3 skipped; `Test Files  184 passed (184)`. Nothing that passed before fails.
- Compile gate: `npx tsc --noEmit` exit 0, zero diagnostics; `npm run build` exit 0 (template type-check), zero errors, only the existing js-beautify / jszip "not ESM" warnings.
- `npm run test:components`: exit 0, `Test Files  2 passed (2)`, `Tests  32 passed (32)`.
- `bash arch-guard.sh`: exit 0. No FROZEN file touched, no `--rebaseline`.
- Open points left as recorded (not decided here): OD-8, OD-9(e) (a FAQ-only run shows the existing ZIP and TXT controls because `hasOutput()` is true; nothing hidden). A rendered-in-browser check of the new mode is a manual QUALITY_GATE concern.
- Outcome: T12 complete, one commit (c04096a), no test file touched.

## T13 - results (real runs)

- File (`git show --stat 7a0613e`: 1 file, 4 insertions, 3 deletions; not FROZEN): `README.md` only. Changed the "What it does" FAQ bullet, "How generation works" step 5, Usage step 3 and added the FAQ Generator entry to "Tools & modes". Written from the code (`runFaqPipeline`, `generateFaqOnly`, `faq-gate.ts`, `tab-descriptors.ts`, `faq-form.ts`): one uk-UA master FAQ, sequential translation into the other store languages, 3 attempts in total per FAQ (`FAQ_MAX_ATTEMPTS = 3`), skip on failure (master failure: nothing stored and nothing translated; translation failure: only that language skipped), `<b>` not `<strong>`, FAQ Generator needs Store + Product Name + Supplemental Content with Original Description and Tech Specs optional. The "FAQ / HowTo" wording was reduced to "FAQ" because the orchestrator generates no HowTo artifact. The architecture section's mention of `task-howto.ts` and the file tree were left as they were.
- Not documented as decided: OD-6 (translation model tier and protected-name handling), OD-8 (skipped-language messaging), OD-9 (TXT download of a FAQ-only run).
- `grep -n "FAQ Generator" README.md` matches in "Tools & modes" and in Usage step 3.
- `npx tsc --noEmit`: exit 0. `npm run lint`: exit 0. `npm run build`: exit 0 (only the existing "not ESM" warnings).
- `npx vitest run` (test:logic): `Test Files  184 passed (184)`, `Tests  6254 passed | 3 skipped (6257)`, 0 failed.
- `npm run test:components`: exit 0, `Test Files  2 passed (2)`, `Tests  32 passed (32)`.
- `bash arch-guard.sh`: exit 0 (ALL CHECKS PASSED). No FROZEN file touched, no `--rebaseline`.
- Outcome: T13 complete, one commit (7a0613e), no test file touched. All of T1-T13 are DONE; the IMPLEMENTATION stage task table is complete. QUALITY_GATE (full gate incl. coverage) and a rendered-in-browser check remain for later stages.

## Loop-back fix 1 of 3 (changes_required: V-1, V-2) - section 9 stop and approval record

- Trigger: `docs/verification/US-8.1-verification-report.md` v1, verdict CHANGES_REQUIRED. V-1 (blocking): hard-coded `FAQ_LANGUAGE_NAMES` table in `src/prompts/task-c.ts`. V-2 (non-blocking): `'uk-UA'` literals in `src/app/tab-descriptors.ts`.
- FROZEN file: `src/prompts/task-c.ts` only (AGENTS.md section 9). `constants.ts`, `master-system-prompt.ts`, `output-validator.ts`, `task-a.ts`, `task-b.ts` were not touched.
- Exact change: removed the `FAQ_LANGUAGE_NAMES` table; `faqGenericRules(targetLang, storeName)` now computes `isoToHumanLang(taskLangToIso(targetLang, storeName))` (`isoToHumanLang` added to the existing `../prompt-core/constants` import); the single call site in `buildFaqLanguageInstruction` passes `storeName`. The description path (`buildPromptC` non-FAQ branch) is untouched.
- Approval (second grant, the operator's answer in this session), quoted verbatim: "I explicitly grant permission to modify src/prompts/task-c.ts under AGENTS.md §9 for the V-1 fix only; re-baseline .arch-guard-checksums in the same commit." It covers this one file for the V-1 fix only; the T1 grant was not relied on.
- Prompt-text effect (FAQ generic branch only, reached for non-EXPERT3D stores): PL, RU, DE and UA names are unchanged (Polish, Russian, German, Ukrainian). ES now reads "Castilian Spanish" (was "Spanish") and PT "European Portuguese" (was "Portuguese"), because that is what the registry helper returns; both are the same languages named more precisely and still satisfy the identity regexes pinned in `task-c.faq.spec.ts`. EXPERT3D ES/PT use their dedicated rule blocks and are unchanged.
- V-2: `tab-descriptors.ts` imports `MASTER_LOCALE` and uses it in place of the four `'uk-UA'` code literals (two `iso:` fields, the `faqArtifacts?.[...]` lookup, the `iso ===` skip); comments left as written. The `sourceLocale === 'uk-UA'` in `buildFaqLanguageInstruction` was LEFT as is: it mirrors the description path's guard at `buildPromptC` (frozen, unchanged), and `UK_SOURCE_ANTICALQUE` is keyed to uk-UA specifically; changing one without the other would diverge the two paths.

## Loop-back fix 1 - results (real runs)

- Commit `8c89bce` (one commit): `.arch-guard-checksums` (1 line, `task-c.ts`), `src/app/tab-descriptors.ts`, `src/prompts/task-c.ts`; 3 files, 11 insertions, 14 deletions. CRLF line endings preserved.
- `bash arch-guard.sh --rebaseline` run after the edit; `bash arch-guard.sh`: exit 0 (ALL CHECKS PASSED).
- `npx tsc --noEmit`: exit 0. `npm run lint`: exit 0. `npm run build`: exit 0 (only the existing "not ESM" warnings).
- `npx vitest run` (test:logic): `Test Files  184 passed (184)`, `Tests  6254 passed | 3 skipped (6257)`, 0 failed - equal to the baseline. This includes `task-c.faq.spec.ts` and the 16-pair `task-c.description-bytes.spec.ts` golden, unchanged and green.
- `npm run test:components`: exit 0, `Test Files  2 passed (2)`, `Tests  32 passed (32)`.
- No test file, fixture, golden or coverage setting modified; no test pinned the removed table.
- Outcome: V-1 and V-2 fixed. Re-verification (IMPLEMENTATION_VERIFICATION) is the orchestrator's next step.

## Loop-back fix 2 of 3 (changes_required: security finding B-1) - fixed

- Trigger: `docs/reviews/security/US-8.1-security-review.md` v1, verdict CHANGES_REQUIRED. B-1 (blocking): `validateFaqShape` in `src/utils/faq-html.ts` never saw a tag whose quote is unpaired or whose closing `>` is missing, so such a tag was stored and reached `bypassSecurityTrustHtml`.
- Red tests (TEST_WRITING, commit 97d8913): the "B-1" block in `src/utils/faq-html.spec.ts` (R1-R9 reject, G1-G10 guards), `src/utils/faq-gate.spec.ts`, and the `-t B-1` cases in `src/services/content-orchestrator.faq-pipeline.spec.ts`. No test file was touched by the fix.
- Fix (commit `1ac82e1`, one commit): `src/utils/faq-html.ts` only (12 insertions, 1 deletion; not FROZEN). New constant `PERMITTED_TAG = /<\/?(?:h3|p|b|ul|li)\s*>/gi`; after the existing tag-regex pass, `html.replace(PERMITTED_TAG, '')` must contain no `<`, otherwise `faq-not-well-formed` is reported (an existing rule id; no rule id added). The tag-regex pass is unchanged, so `faq-attribute-present` and `faq-element-not-allowed` keep firing for well-formed bad tags. A literal `<` in text must be written `&lt;`.
- Not touched: `html-cleaner.ts`, `output-validator.ts`, `safe-html.pipe.ts`, any FROZEN file, any spec; no second `bypassSecurityTrust*` call.

## Loop-back fix 2 - results (real runs)

- `npx vitest run src/utils/faq-html.spec.ts src/utils/faq-gate.spec.ts`: `Test Files  2 passed (2)`, `Tests  115 passed (115)`. `npx vitest run src/services/content-orchestrator.faq-pipeline.spec.ts -t B-1`: `Tests  6 passed | 540 skipped (546)`. The B-1 reject cases R1-R9 and the guards G1-G10 are green.
- Whole `test:logic` (`vitest run`): `Test Files  184 passed (184)`, `Tests  6285 passed | 3 skipped (6288)`, 0 failed. Baseline before the red tests was 6254 passed | 3 skipped; the difference of 31 is the new B-1 tests (6288 is the total including the 3 skipped).
- `npx tsc --noEmit`: exit 0. `npm run lint`: exit 0. `npm run build`: exit 0. `npm run test:components`: `Test Files  2 passed (2)`, `Tests  32 passed (32)`. `bash arch-guard.sh`: exit 0 (ALL CHECKS PASSED), no `--rebaseline`.
- Probe (`validateFaqShape` through tsx): R1 (unpaired single quote), R2 (unpaired double quote), R3 (unterminated trailing `<img ...`) each report `faq-not-well-formed` (1 error); a clean FAQ (`h3`, `p`, `b`, `ul`, `li`) reports 0.
- Outcome: B-1 fixed. Re-running SECURITY_REVIEW (and the gates after it) is the orchestrator's next step.

## Notes

- Test components were accepted as unevaluated until T10 (user decision, no stub added); first real run at T10: 2 files, 32 tests passed.
- No test file, fixture, golden or coverage setting was modified.
- Not edited: `master-system-prompt.ts`, `constants.ts`, `task-a.ts`, `task-b.ts`, `output-validator.ts`, any `.spec.ts`.
- `.arch-guard-checksums` is hashed from the working-copy bytes (the file `task-c.ts` is CRLF in this checkout); the edit preserved the existing CRLF line endings.
- QUALITY_GATE not run (owned by so-gate-enforcer).
