---
artifact: quality_gate_report
story: US-8.1
version: 4
status: DRAFT
owner: so-gate-enforcer
stage: QUALITY_GATE
created_at: 2026-10-15T09:20:00Z
updated_at: 2026-10-15T09:20:00Z
supersedes: docs/verification/US-8.1-quality-gate-report.md#3
inputs_consumed:
  - key: story
    version: 2
  - key: implementation_plan
    version: 1
  - key: task_breakdown
    version: 3
  - key: ac_test_matrix
    version: 3
  - key: pipeline_status
    version: 2
---

# Quality Gate Report - US-8.1 (v4, re-run after the RECONCILIATION loop-back)

Branch `feat/US-8.1-single-master-faq`, HEAD `3488b97`. Base for the diff scope: `27b01b8`.

This is a re-run. v3 of this report described HEAD `a8b3e2e` and is superseded (it stays in git history). Between `a8b3e2e` and `HEAD` the non-docs changes are exactly (`git diff --name-status a8b3e2e HEAD -- src test tools`):

```
M	src/app/app.component.template-wiring.spec.ts
M	src/services/content-orchestrator.faq-pipeline.spec.ts
M	src/services/content-orchestrator.faq-standalone.spec.ts
M	src/utils/faq-html.ts
M	test/fixtures/faq-pipeline.ts
```

- `b9eef79` test (TEST_WRITING loop-back, RECONCILIATION finding F-1): the AC-19 integration tests (`faq-pipeline.spec.ts`, `faq-standalone.spec.ts`), the AC-10 / AC-11 wiring pins (`app.component.template-wiring.spec.ts`) and the fixture `test/fixtures/faq-pipeline.ts`. Tests and fixture only.
- `d33292c` style: `src/utils/faq-html.ts`, 1 insertion / 1 deletion, restores the space in `const MARKDOWN_BOLD = /\*\*[^*\n]+\*\*/;` (whitespace only).

No FROZEN file was touched after `8c89bce`. Working tree was clean before the run and clean after it (`git status --short` empty; `coverage/` and `dist/` are git-ignored).

All six commands below were executed in this run, in this order, from `C:\Work\Content-Swiss-Knife`, on HEAD `3488b97`. Output is pasted from the real runs (long per-test listings are trimmed to the header, the summary and the exit code). Nothing was fixed, edited or re-baselined by this stage.

**Verdict: PASS - all six applicable commands exited 0.**

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `npm run lint` | 0 | PASS |
| 2 | `npm test` (`test:logic` AND `test:components`) | 0 | PASS |
| 3 | `npm run test:coverage` | 0 | PASS (global and all three per-directory floors hold) |
| 4 | `npm run build` | 0 | PASS (only the 3 known CommonJS warnings) |
| 5 | `bash arch-guard.sh` | 0 | PASS (all five frozen checksums match the baseline) |
| 6 | `npm run validate:harness` | 0 | PASS (run: `docs/workflow/` was touched) |

---

## 1. `npm run lint`

Invocation: `npm run lint` (= `tsc --noEmit`; a type-check, not a linter).

```
> 02-05-2026-seo-content-generator@0.0.0 lint
> tsc --noEmit

EXIT=0
```

Zero errors. **PASS**

---

## 2. `npm test`

Invocation: `npm test` (= `npm run test:logic && npm run test:components`). Both runners ran under the composite command (exit 0). Before the composite run, `test:logic` and `test:components` were also run on their own (same figures, both exit 0); the figures below are from the composite `npm test` run.

```
> 02-05-2026-seo-content-generator@0.0.0 test
> npm run test:logic && npm run test:components
```

### 2a. `test:logic` (`vitest run`)

```
 Test Files  184 passed (184)
      Tests  6343 passed | 3 skipped (6346)
   Start at  12:15:32
   Duration  62.70s (transform 22.33s, setup 0ms, import 58.73s, tests 72.84s, environment 198.51s)
```

The 3 skipped are the `test/doc-generation-live.spec.ts` live-probe tests, skipped by design when no live model is configured (printed with the skip marker in the run):

```
 ↓ test/doc-generation-live.spec.ts > live: can a model emit a valid ProductDescriptionDoc? > reaches the proxy and returns JSON
 ↓ test/doc-generation-live.spec.ts > live: can a model emit a valid ProductDescriptionDoc? > validates against ProductDescriptionDocSchema
 ↓ test/doc-generation-live.spec.ts > live: can a model emit a valid ProductDescriptionDoc? > renders, and the rendered HTML has zero validator errors
```

### 2b. `test:components` (`ng test`)

```
 Test Files  2 passed (2)
      Tests  32 passed (32)
   Start at  12:17:07
   Duration  2.49s (transform 399ms, setup 1.01s, import 1.16s, tests 820ms, environment 1.35s)
```

`npm test` exit code: 0.

### Counts, written down so a deletion would be visible

| Runner | Test files | Tests | v3 of this report (HEAD a8b3e2e) | v2 (HEAD b1aaf12) |
|---|---|---|---|---|
| `test:logic` | 184 passed (184) | 6343 passed, 3 skipped (6346) | 184 / 6285 passed, 3 skipped (6288) | 184 / 6254 passed, 3 skipped (6257) |
| `test:components` | 2 passed (2) | 32 passed (32) | 2 / 32 | 2 / 32 |

Test files: 184, unchanged (no file added or removed; the AC-19 / AC-10 / AC-11 tests were added inside existing spec files). Tests: +58 passed (6285 -> 6343), skipped unchanged at 3. This matches the pipeline status ("6343 - 6285 = 58 new tests": 35 in `faq-pipeline.spec.ts`, 14 in `faq-standalone.spec.ts`, 9 in `app.component.template-wiring.spec.ts`) and the figures expected for this gate (184 files / 6343 passed / 3 skipped; 32 component tests). No test file and no test was removed. `git diff --name-status a8b3e2e HEAD -- src test tools` shows only `M`, no `D` or `R`.

Observation, not a failure: `test:components` still runs only the two pre-existing `*.component.spec.ts` files; the FAQ Generator template wiring is asserted by `src/app/app.component.template-wiring.spec.ts` on the logic runner. Real rendering of the new mode in a browser was NOT performed (section 8).

**PASS**

---

## 3. `npm run test:coverage`

Invocation: `npm run test:coverage` (= `vitest run --coverage`, v8 provider). Exit code 0.

```
 Test Files  184 passed (184)
      Tests  6343 passed | 3 skipped (6346)
   Duration  70.20s (transform 24.66s, setup 0ms, import 63.82s, tests 88.26s, environment 194.64s)

 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   94.13 |    87.95 |   95.62 |   94.69 |                   
 domain            |   99.26 |    97.19 |     100 |   99.17 |                   
 prompt-core       |   96.07 |     88.7 |     100 |    97.6 |                   
 render            |     100 |       98 |     100 |     100 |                   
 utils             |   93.54 |     86.9 |   94.62 |   94.06 |                   
  faq-html.ts      |     100 |    97.36 |     100 |     100 | 111               
  ...ral-parity.ts |   97.87 |    94.44 |     100 |     100 | 131               
  (other rows trimmed)
-------------------|---------|----------|---------|---------|-------------------

=============================== Coverage summary ===============================
Statements   : 94.13% ( 4170/4430 )
Branches     : 87.95% ( 2599/2955 )
Functions    : 95.62% ( 853/892 )
Lines        : 94.69% ( 3502/3698 )
================================================================================
```

Floors from `vitest.config.ts` (AGENTS.md thresholds), against the measured numbers:

| Scope | Metric | Floor | Measured | Holds |
|---|---|---|---|---|
| global | lines | 80 | 94.69 | yes |
| global | functions | 80 | 95.62 | yes |
| global | branches | 75 | 87.95 | yes |
| global | statements | 80 | 94.13 | yes |
| `src/domain/**` | lines / functions / branches / statements | 95 / 95 / 90 / 95 | 99.17 / 100 / 97.19 / 99.26 | yes |
| `src/render/**` | lines / functions / branches / statements | 95 / 95 / 90 / 95 | 100 / 100 / 98 / 100 | yes |
| `src/prompt-core/**` | lines / functions / branches / statements | 95 / 95 / 85 / 95 | 97.6 / 100 / 88.7 / 96.07 | yes |

Delta against v3: identical global and per-directory figures (the b9eef79 tests are orchestrator / component tests, outside the coverage `include`; `d33292c` is whitespace). `src/utils/faq-html.ts` unchanged at 100 / 97.36 / 100 / 100.

Threshold integrity: `git diff --name-only 27b01b8 HEAD -- vitest.config.ts package.json angular.json arch-guard.sh tsconfig.json` is empty. No threshold lowered, no `include` narrowed, no exclude added (section 7.7 clean).

Coverage-scope note: the coverage `include` is `src/utils`, `src/prompt-core`, `src/render`, `src/domain` only. `src/utils/faq-gate.ts` and `src/utils/faq-form.ts` are not rows in the text table because the text reporter omits fully covered files; the generated HTML report shows `faq-gate.ts` 100% (19/19 statements, 10/10 branches, 4/4 functions) and `faq-form.ts` 100% (1/1, 3/3, 1/1) on all metrics. Orchestrator, component and `src/prompts/` code (including the FROZEN `task-c.ts`) is outside the coverage scope by configuration (unchanged by this Story), so this command does not measure it.

**PASS**

---

## 4. `npm run build`

Invocation: `npm run build` (= `ng build`).

```
> 02-05-2026-seo-content-generator@0.0.0 build
> ng build

Initial chunk files | Names                 |  Raw size | Estimated transfer size
main-57RJST46.js    | main                  |   1.03 MB |               259.48 kB
chunk-7RYU3Q7I.js   | -                     | 172.35 kB |                51.51 kB
styles-KY2DT4WL.css | styles                |   3.29 kB |               835 bytes
                    | Initial total         |   1.21 MB |               311.83 kB

Lazy chunk files    | Names                 |  Raw size | Estimated transfer size
chunk-G4VV4H53.js   | html-editor-component |   1.07 MB |               282.90 kB

Application bundle generation complete. [16.667 seconds] - 2026-10-15T09:18:53.700Z

▲ [WARNING] Module 'file-saver' used by 'src/app/app.component.ts' is not ESM
▲ [WARNING] Module 'js-beautify' used by 'src/app/components/html-editor/source-view.ts' is not ESM
▲ [WARNING] Module 'jszip' used by 'src/utils/zip-generator.ts' is not ESM

Output location: C:\Work\Content-Swiss-Knife\dist

BUILD_EXIT=0
```

No errors. The three CommonJS warnings (`file-saver`, `js-beautify`, `jszip`) are the known pre-existing ones and are not failures. **PASS**

---

## 5. `bash arch-guard.sh`

Invocation: `bash arch-guard.sh` (no `--rebaseline`).

```
╔══════════════════════════════════════════════════════╗
║   Content Swiss Knife — Architecture Guard v1.0     ║
╚══════════════════════════════════════════════════════╝

[Rule #1] Checking for direct SDK calls outside providers/...
  ✓ OK

[Rule #3] Checking for hard-coded LLM prompts in services (not orchestrator)...
  ✓ OK

[Rule #4] Checking for API keys in frontend source...
  ✓ OK

[FROZEN] Checking frozen prompt files for unauthorized changes...
  ✓ All frozen files unchanged

══════════════════════════════════════════════════════
  ✅  ALL CHECKS PASSED
══════════════════════════════════════════════════════

ARCH_EXIT=0
```

Exit code 0. The five frozen checksums: the baseline in `.arch-guard-checksums` at HEAD, and an independent `sha256sum` of the five working files returns the same values:

```
0421226ccbf10c1f347ee134d2633086a2dbe89284148d053ce4d56ba1c9c89f  src/prompts/task-a.ts
ad55a5ff3684ea7ffb7d3d58442c554835a644821718397974c66de638cda3c9  src/prompts/task-b.ts
619c45a98f6dac6ef912316ab26fa05d5c58ab010ac8a54ad8198f0e23329247  src/prompts/task-c.ts
75eb4d0b9268a514268f2d53b36d12a5ff15bc3537a8d9cf84d6f189f93197f8  src/prompt-core/master-system-prompt.ts
fba6ba2848a714298117155ebd4debe361f5665f3f679698c6c2b4136ac55cc2  src/utils/output-validator.ts
```

### Frozen-file scope check (`git diff` since base `27b01b8`)

- `task-a.ts`, `task-b.ts`, `master-system-prompt.ts` and `output-validator.ts`: `git diff --shortstat 27b01b8 HEAD -- <file>` is empty (unchanged). `src/prompts/task-c.ts` is the only FROZEN file changed: `1 file changed, 171 insertions(+), 2 deletions(-)`.
- `git log --oneline 27b01b8..HEAD -- src/prompts/task-c.ts .arch-guard-checksums` returns exactly two commits, each carrying both files in the same commit:
  - `da59195 feat(US-8.1 T1): add the additive FAQ translation variant to task-c.ts (FROZEN, operator-approved)` - `.arch-guard-checksums | 2 +-`, `src/prompts/task-c.ts | 174 +++`.
  - `8c89bce fix(US-8.1): derive the FAQ language name from the registry and use MASTER_LOCALE in tab descriptors` - `.arch-guard-checksums | 2 +-`, `src/prompts/task-c.ts | 13 +++---`.
  The edit and the re-baseline are in the same commit in both cases, as AGENTS.md section 9 requires.
- Neither `b9eef79` nor `d33292c` touches a FROZEN file or `.arch-guard-checksums` (see the `a8b3e2e..HEAD` file list above): no new section 9 stop was needed for this loop-back.
- Section 9 approval records, both present in `docs/catalog/US-8.1-pipeline-status.md` (v2, lines 59-64 and 202-207) and quoted from there:
  1. "T1 - section 9 stop and approval record": "modify src/prompts/task-c.ts 1. I explicitly grant permission to modify src/prompts/task-c.ts under AGENTS.md §9. Re-baseline .arch-guard-checksums in commit T1." Scope: this one file, T1 only. Covers `da59195`.
  2. "Loop-back fix 1 of 3 (changes_required: V-1, V-2) - section 9 stop and approval record": "I explicitly grant permission to modify src/prompts/task-c.ts under AGENTS.md §9 for the V-1 fix only; re-baseline .arch-guard-checksums in the same commit." Scope: this one file, the V-1 fix only. Covers `8c89bce`.
  Both edits are within the granted scope.
- This stage did not run `arch-guard.sh --rebaseline`.

### What arch-guard does NOT prove

- **It does not check architecture Rule #2** (retrieval separate from generation). A green arch-guard is not evidence that Rule #2 holds. Rule #2 is `so-implementation-verifier`'s, verified by reading the diff.
- It does not run the tests, the type-check or the build; it is one of six commands.

**PASS**

---

## 6. `npm run validate:harness`

Run because `git diff --name-only 27b01b8 HEAD -- docs/workflow .claude` lists `docs/workflow/active-story.yaml`, `docs/workflow/history.jsonl` and `docs/workflow/workflow-state.yaml` (no `so-*` skill file changed; those three are written by the orchestrator, not this stage).

Invocation: `npm run validate:harness` (= `node tools/validate-harness.mjs --strict`).

```
> 02-05-2026-seo-content-generator@0.0.0 validate:harness
> node tools/validate-harness.mjs --strict


harness validation — 22 stages, 23 artifacts, 16 skills named

  OK — registry is internally consistent and every named skill exists.

HARNESS_EXIT=0
```

Zero errors. **PASS**

---

## 7. Test-integrity observations (informational, none is a failure)

- `b9eef79` modified four pre-existing test-side files, additions only in intent (`faq-pipeline.spec.ts`, `faq-standalone.spec.ts`, `app.component.template-wiring.spec.ts`, fixture `test/fixtures/faq-pipeline.ts`); no test file deleted or renamed; the +58 test delta equals the 35 + 14 + 9 new tests recorded in the pipeline status.
- `d33292c` is whitespace only in `src/utils/faq-html.ts`; the verifier's non-blocking nit (the missing space after `=` in `MARKDOWN_BOLD`) is now resolved. The full suites in this report were run after it.
- Earlier observations still hold: `content-orchestrator.simplified.spec.ts` (R6 block rewrite owned by TEST_WRITING) and `task-faq.spec.ts` (AC-6) are the two pre-existing specs modified by the Story from the first TEST_WRITING pass.
- No threshold, `include` or exclude change (section 3), no `--no-verify`, no hook skip is evidenced in the diff.

---

## 8. Not performed

- **Browser / manual check: NOT performed.** The FAQ Generator mode button, form, disabled-Generate state (AC-10, AC-11, AC-12), the FAQ-only tab (AC-13) and the history entry (AC-15) were not exercised in a running application by this stage. They are asserted by the logic-runner template-wiring, tab-descriptor and orchestrator specs only.
- No live LLM call was made; all model calls in the suites are stubbed (the 3 skipped live-probe tests did not run).

## 9. What this report does not cover

- **Architecture Rule #2** has no automated check; `bash arch-guard.sh` green is not evidence for it.
- **The AGENTS.md section 6.6 runtime rules** (Rule #2 by reading the diff; section 4 HTML acceptance criteria against real output where the prompt or renderer changed; the store registry as the only source of languages and currency) are NOT checked by this gate. They belong to `so-implementation-verifier` (IMPLEMENTATION_VERIFICATION). A green gate must not be read as full compliance.
- Whether the new AC-19 / AC-10 / AC-11 tests genuinely assert their criteria (the RECONCILIATION finding F-1) is `so-reconciliation-reviewer`'s; this gate only shows they run and pass.
- AC-20 (arch-guard exit 0 after the re-baseline) has no unit test by design; it is evidenced by section 5 above.

## 10. Outcome

`verdict: PASS`. No `loop_back_stage`. Next stage per the stage map; the orchestrator decides the re-run order after the RECONCILIATION loop-back.
