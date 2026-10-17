---
artifact: quality_gate_report
story: US-8.1
version: 5
status: ARCHIVED
owner: so-gate-enforcer
stage: QUALITY_GATE
created_at: 2026-10-16T06:15:00Z
updated_at: 2026-10-16T06:15:00Z
supersedes: docs/verification/US-8.1-quality-gate-report.md#4
inputs_consumed:
  - key: story
    version: 3
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 4
  - key: ac_test_matrix
    version: 4
  - key: pipeline_status
    version: 3
---

# Quality Gate Report - US-8.1 (v5, re-run after the v4 layout delta T14-T17)

Branch `feat/US-8.1-single-master-faq`, HEAD `ac62fe4`. Base for the diff scope: `27b01b8`.

v4 of this report described HEAD `3488b97` and consumed Story v2, plan v1, task breakdown v3, matrix v3 and pipeline status v2. It is SUPERSEDED (the file at this path is overwritten by v5; v4 stays in git history, last committed in `0775627`). Between `3488b97` and HEAD the non-docs changes are exactly (`git diff --name-status 3488b97 HEAD -- . ':!docs'`):

```
A	src/app/app.component.faq-layout.spec.ts
M	src/app/app.component.html
M	src/app/app.component.ts
```

```
 src/app/app.component.faq-layout.spec.ts | 485 +++++++++++++++++++++++++++++++
 src/app/app.component.html               |  22 +-
 src/app/app.component.ts                 |   2 +
 3 files changed, 498 insertions(+), 11 deletions(-)
```

- `01061d4` test (TEST_WRITING for the v4 delta): the new layout pin spec `src/app/app.component.faq-layout.spec.ts` (AC-21 to AC-26).
- `9494b2b` T15, `6c19042` T14, `81bee6a` T16, `3dc3490` T17: `src/app/app.component.html` and `src/app/app.component.ts` (the `supplementalContentRequired` key, the empty-state exclusion, the field move, the relabel).

No FROZEN file and no `.arch-guard-checksums` change after `8c89bce`. Working tree was clean before the run and clean after it (`git status --short` empty; `coverage/` and `dist/` are git-ignored).

All six commands below were executed in this run, in this order, from `C:\Work\Content-Swiss-Knife`, on HEAD `ac62fe4`. Output is pasted from the real runs (long per-test listings are trimmed to the header, the summary and the exit code; ANSI colour codes removed). Nothing was fixed, edited or re-baselined by this stage.

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

Invocation: `npm test` (= `npm run test:logic && npm run test:components`). Both runners ran under the composite command; composite exit code 0.

```
> 02-05-2026-seo-content-generator@0.0.0 test
> npm run test:logic && npm run test:components

> 02-05-2026-seo-content-generator@0.0.0 test:logic
> vitest run
```

### 2a. `test:logic` (`vitest run`)

```
 Test Files  185 passed (185)
      Tests  6380 passed | 3 skipped (6383)
   Start at  09:04:50
   Duration  68.62s (transform 16.69s, setup 0ms, import 96.31s, tests 55.16s, environment 222.29s)
```

The 3 skipped are the `test/doc-generation-live.spec.ts` live-probe tests, skipped by design when no live model is configured (printed with the skip marker in the run):

```
 ↓ test/doc-generation-live.spec.ts > live: can a model emit a valid ProductDescriptionDoc? > reaches the proxy and returns JSON
 ↓ test/doc-generation-live.spec.ts > live: can a model emit a valid ProductDescriptionDoc? > validates against ProductDescriptionDocSchema
 ↓ test/doc-generation-live.spec.ts > live: can a model emit a valid ProductDescriptionDoc? > renders, and the rendered HTML has zero validator errors
```

### 2b. `test:components` (`ng test`)

```
> 02-05-2026-seo-content-generator@0.0.0 test:components
> ng test

 Test Files  2 passed (2)
      Tests  32 passed (32)
   Start at  09:06:27
   Duration  7.71s (transform 272ms, setup 880ms, import 12.17s, tests 697ms, environment 960ms)

EXIT=0
```

### Counts, written down so a deletion would be visible

| Runner | Test files | Tests | v4 of this report (HEAD 3488b97) | v3 (HEAD a8b3e2e) |
|---|---|---|---|---|
| `test:logic` | 185 passed (185) | 6380 passed, 3 skipped (6383) | 184 / 6343 passed, 3 skipped (6346) | 184 / 6285 passed, 3 skipped (6288) |
| `test:components` | 2 passed (2) | 32 passed (32) | 2 / 32 | 2 / 32 |

Test files: 184 -> 185 (+1 = the new `app.component.faq-layout.spec.ts`). Tests passed: 6343 -> 6380 (+37 = the 37 tests of the new faq-layout spec, which `pipeline_status` v3 T17 records as `Tests  37 passed (37)`). Skipped unchanged at 3. No test file and no test was removed: `git diff --name-status 3488b97 HEAD -- src test tools` shows one `A` and two `M` (the two modified files are the template and component, not specs), and `git diff --name-status 27b01b8 HEAD -- src test tools | grep -v '^A'` lists only `M` entries (no `D`, no `R`). The figures match the pipeline status T17 record (`Test Files  185 passed (185)`, `Tests  6380 passed | 3 skipped (6383)`).

Observation, not a failure: the AC-21, AC-22 (structural half), AC-23, AC-24 and AC-26 tests are source-text and evaluated-condition pins on the logic runner (matrix v4 notes), not rendered DOM; `test:components` still runs only the two pre-existing `*.component.spec.ts` files. Real rendering of the FAQ Generator in a browser was NOT performed (section 8).

**PASS**

---

## 3. `npm run test:coverage`

Invocation: `npm run test:coverage` (= `vitest run --coverage`, v8 provider). Exit code 0.

```
 Test Files  185 passed (185)
      Tests  6380 passed | 3 skipped (6383)
   Duration  59.95s (transform 14.72s, setup 0ms, import 47.50s, tests 73.23s, environment 167.59s)

All files          |   94.13 |    87.95 |   95.62 |   94.69 |
 domain            |   99.26 |    97.19 |     100 |   99.17 |
 prompt-core       |   96.07 |     88.7 |     100 |    97.6 |
 render            |     100 |       98 |     100 |     100 |
 utils             |   93.54 |     86.9 |   94.62 |   94.06 |
  faq-html.ts      |     100 |    97.36 |     100 |     100 | 111
  ...ral-parity.ts |   97.87 |    94.44 |     100 |     100 | 131
  (other rows trimmed)

=============================== Coverage summary ===============================
Statements   : 94.13% ( 4170/4430 )
Branches     : 87.95% ( 2599/2955 )
Functions    : 95.62% ( 853/892 )
Lines        : 94.69% ( 3502/3698 )
================================================================================
EXIT=0
```

Floors from `vitest.config.ts` (`thresholds`, read in this run), against the measured numbers:

| Scope | Metric | Floor | Measured | Holds |
|---|---|---|---|---|
| global | lines | 80 | 94.69 | yes |
| global | functions | 80 | 95.62 | yes |
| global | branches | 75 | 87.95 | yes |
| global | statements | 80 | 94.13 | yes |
| `src/domain/**` | lines / functions / branches / statements | 95 / 95 / 90 / 95 | 99.17 / 100 / 97.19 / 99.26 | yes |
| `src/render/**` | lines / functions / branches / statements | 95 / 95 / 90 / 95 | 100 / 100 / 98 / 100 | yes |
| `src/prompt-core/**` | lines / functions / branches / statements | 95 / 95 / 85 / 95 | 97.6 / 100 / 88.7 / 96.07 | yes |

Delta against v4: identical global and per-directory figures. The v4-delta files (`app.component.html`, `app.component.ts`, the faq-layout spec) are outside the coverage `include` (`src/utils`, `src/prompt-core`, `src/render`, `src/domain`), so this command does not measure them.

Threshold integrity: `git diff --name-only 27b01b8 HEAD -- vitest.config.ts package.json angular.json arch-guard.sh tsconfig.json` prints nothing. No threshold lowered, no `include` narrowed, no exclude added (section 7.7 clean).

Coverage-scope note: `src/utils/faq-gate.ts` and `src/utils/faq-form.ts` have no row in the trimmed text table; the generated HTML reports in `coverage/utils/` (git-ignored) show 100% / 100% / 100% / 100% for both. Orchestrator, component and `src/prompts/` code (including the FROZEN `task-c.ts`) is outside the coverage scope by configuration (unchanged by this Story).

**PASS**

---

## 4. `npm run build`

Invocation: `npm run build` (= `ng build`).

```
> 02-05-2026-seo-content-generator@0.0.0 build
> ng build

Initial chunk files | Names                 |  Raw size | Estimated transfer size
main-6IZKG7FH.js    | main                  |   1.03 MB |               259.53 kB
chunk-7RYU3Q7I.js   | -                     | 172.35 kB |                51.51 kB
styles-KY2DT4WL.css | styles                |   3.29 kB |                835 bytes
                    | Initial total         |   1.21 MB |               311.88 kB

Lazy chunk files    | Names                 |  Raw size | Estimated transfer size
chunk-G4VV4H53.js   | html-editor-component |   1.07 MB |               282.90 kB

Application bundle generation complete. [13.159 seconds] - 2026-10-16T06:08:06.111Z

▲ [WARNING] Module 'file-saver' used by 'src/app/app.component.ts' is not ESM
▲ [WARNING] Module 'js-beautify' used by 'src/app/components/html-editor/source-view.ts' is not ESM
▲ [WARNING] Module 'jszip' used by 'src/utils/zip-generator.ts' is not ESM

Output location: C:\Work\Content-Swiss-Knife\dist

BUILD_EXIT=0
```

No errors. The three CommonJS warnings (`file-saver`, `js-beautify`, `jszip`) are the known pre-existing ones and are not failures. The build type-checks the changed Angular template. **PASS**

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

Exit code 0. The five frozen checksums: the baseline in `.arch-guard-checksums` and an independent `sha256sum` of the five working files return the same values:

```
0421226ccbf10c1f347ee134d2633086a2dbe89284148d053ce4d56ba1c9c89f  src/prompts/task-a.ts
ad55a5ff3684ea7ffb7d3d58442c554835a644821718397974c66de638cda3c9  src/prompts/task-b.ts
619c45a98f6dac6ef912316ab26fa05d5c58ab010ac8a54ad8198f0e23329247  src/prompts/task-c.ts
75eb4d0b9268a514268f2d53b36d12a5ff15bc3537a8d9cf84d6f189f93197f8  src/prompt-core/master-system-prompt.ts
fba6ba2848a714298117155ebd4debe361f5665f3f679698c6c2b4136ac55cc2  src/utils/output-validator.ts
```

### Frozen-file scope check (`git diff` since base `27b01b8`)

- `src/prompts/task-c.ts` is the only FROZEN file changed since the base. `git log --oneline 27b01b8..HEAD -- src/prompts/task-c.ts .arch-guard-checksums` returns exactly two commits, each carrying both files:
  - `da59195 feat(US-8.1 T1): add the additive FAQ translation variant to task-c.ts (FROZEN, operator-approved)`
  - `8c89bce fix(US-8.1): derive the FAQ language name from the registry and use MASTER_LOCALE in tab descriptors`
  The edit and the re-baseline are in the same commit in both cases (AGENTS.md section 9).
- The v4 layout delta (`3488b97..HEAD`, non-docs: the faq-layout spec, `app.component.html`, `app.component.ts`) touches no FROZEN file and not `.arch-guard-checksums`: no new section 9 stop was needed.
- The two section 9 approval records are in `docs/catalog/US-8.1-pipeline-status.md` (v3): "T1 - section 9 stop and approval record" ("I explicitly grant permission to modify src/prompts/task-c.ts under AGENTS.md §9. Re-baseline .arch-guard-checksums in commit T1.") and "Loop-back fix 1 of 3 ... approval record" ("I explicitly grant permission to modify src/prompts/task-c.ts under AGENTS.md §9 for the V-1 fix only; re-baseline .arch-guard-checksums in the same commit."). Both edits are within the granted scope.
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

- The only test-side change since v4 is the added `src/app/app.component.faq-layout.spec.ts` (`01061d4`, 485 lines, 37 tests). No existing spec, fixture or golden was modified, deleted or renamed since `3488b97`.
- No threshold, `include` or exclude change (section 3); no `--no-verify` or hook skip is evidenced in the diff.
- The layout pins are source-text / evaluated-condition checks (matrix v4 notes, plan review N7). They show the template and dictionaries say what AC-21 to AC-26 require; they do not show how the page renders.

---

## 8. Not performed

- **Browser / manual check: NOT performed.** The AC-22 geometric clause (the FAQ result panel's top edge sits one container padding, `p-8` / 32 px, below the tab bar and is not vertically centred) has no automated test by design. The matrix assigns it to a manual check by the operator at HUMAN_PR_APPROVAL (OD-15); this stage did not perform or substitute for it. The FAQ Generator mode button, form (AC-10 to AC-12, AC-23 field order, AC-24 Required label with `*`), the FAQ-only tab (AC-13), the empty-state suppression (AC-21) and the history entry (AC-15) were not exercised in a running application.
- No live LLM call was made; all model calls in the suites are stubbed (the 3 skipped live-probe tests did not run).

## 9. What this report does not cover

- **Architecture Rule #2** has no automated check; `bash arch-guard.sh` green is not evidence for it.
- **The AGENTS.md section 6.6 runtime rules** (Rule #2 by reading the diff; section 4 HTML acceptance criteria against real output where the prompt or renderer changed; the store registry as the only source of languages and currency) are NOT checked by this gate. They belong to `so-implementation-verifier` (IMPLEMENTATION_VERIFICATION). A green gate must not be read as full compliance.
- Whether the AC-21 to AC-26 pins genuinely assert their criteria is `so-reconciliation-reviewer`'s; this gate only shows they run and pass.
- Security of the changed template (`[label]` binding, field move) is `so-security-reviewer`'s.
- AC-20 (arch-guard exit 0 after the re-baseline) has no unit test by design; it is evidenced by section 5 above.

## 10. Outcome

`verdict: PASS`. No `loop_back_stage`. Next stage per the stage map.
