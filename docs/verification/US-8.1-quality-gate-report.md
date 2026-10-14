---
artifact: quality_gate_report
story: US-8.1
version: 2
status: DRAFT
owner: so-gate-enforcer
stage: QUALITY_GATE
created_at: 2026-10-14T22:20:00Z
updated_at: 2026-10-14T22:20:00Z
supersedes: docs/verification/US-8.1-quality-gate-report.md#1
inputs_consumed:
  - key: story
    version: 2
  - key: implementation_plan
    version: 1
  - key: task_breakdown
    version: 3
  - key: ac_test_matrix
    version: 1
  - key: pipeline_status
    version: 1
---

# Quality Gate Report - US-8.1 (v2, re-run after the IMPLEMENTATION loop-back)

Branch `feat/US-8.1-single-master-faq`, HEAD `b1aaf12` (includes T1-T13 and the loop-back fix `8c89bce`). Base for the diff scope: `27b01b8`.

This is a re-run. v1 of this report described HEAD `56f690b` and is superseded (it stays in git history at `e32ebdd`). Between `56f690b` and `HEAD` the only non-docs changes are the loop-back fix commit `8c89bce` (`src/prompts/task-c.ts`, `src/app/tab-descriptors.ts`, `.arch-guard-checksums`) answering `docs/verification/US-8.1-verification-report.md` v1 findings V-1 and V-2; the other two commits (`ca4a390`, `b1aaf12`) and `e32ebdd` are docs only. `git diff 56f690b HEAD --stat -- src test` lists exactly those two source files.

Working tree was clean before the run and clean after it (`git status --short` empty; `coverage/` and `dist/` are git-ignored).
All six commands below were executed in this run, in this order, from `C:\Work\Content-Swiss-Knife`, on HEAD `b1aaf12`. Output is pasted from the real runs (long per-test listings trimmed to the header, the summary and the exit code). Nothing was fixed, edited or re-baselined by this stage.

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

Invocation: `npm test` (= `npm run test:logic && npm run test:components`). Both runners ran; `test:logic` alone was not used.

### 2a. `test:logic` (`vitest run`)

```
> 02-05-2026-seo-content-generator@0.0.0 test
> npm run test:logic && npm run test:components

> 02-05-2026-seo-content-generator@0.0.0 test:logic
> vitest run
...
 Test Files  184 passed (184)
      Tests  6254 passed | 3 skipped (6257)
   Start at  22:14:25
   Duration  48.25s (transform 13.40s, setup 0ms, import 40.81s, tests 52.75s, environment 153.07s)
```

The 3 skipped are the `test/doc-generation-live.spec.ts` live-probe tests (`reaches the proxy and returns JSON`, `validates against ProductDescriptionDocSchema`, `renders, and the rendered HTML has zero validator errors`), skipped by design when no live model is configured.

### 2b. `test:components` (`ng test`)

```
> 02-05-2026-seo-content-generator@0.0.0 test:components
> ng test

Application bundle generation complete. [9.795 seconds] - 2026-10-14T19:15:26.352Z

 RUN  v4.1.10 C:/Work/Content-Swiss-Knife

 Test Files  2 passed (2)
      Tests  32 passed (32)
   Start at  22:15:26
   Duration  1.88s (transform 217ms, setup 753ms, import 776ms, tests 710ms, environment 920ms)

EXIT=0
```

### Counts, written down so a deletion would be visible

| Runner | Test files | Tests | v1 of this report (HEAD 56f690b) | US-7.1 gate |
|---|---|---|---|---|
| `test:logic` | 184 passed (184) | 6254 passed, 3 skipped (6257) | 184 / 6254 passed, 3 skipped (6257) | 175 files, 5176 passed, 3 skipped (5179) |
| `test:components` | 2 passed (2) | 32 passed (32) | 2 / 32 | 2 files, 32 tests |

Identical to v1 after the loop-back fix: no test file or test was added or removed by `8c89bce` (consistent with the pipeline status, "no test file, fixture, golden or coverage setting modified"), and no count dropped.

Observation, not a failure: `test:components` still runs only the two pre-existing `*.component.spec.ts` files. US-8.1 added no `*.component.spec.ts`; the FAQ Generator template wiring (AC-10 to AC-13) is asserted by `src/app/app.component.template-wiring.spec.ts` on the logic runner. Real rendering of the new mode in a browser was NOT performed (section 8).

**PASS**

---

## 3. `npm run test:coverage`

Invocation: `npm run test:coverage` (= `vitest run --coverage`, v8 provider).

```
 Test Files  184 passed (184)
      Tests  6254 passed | 3 skipped (6257)
...
 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   94.12 |    87.94 |   95.62 |   94.69 |                   
 domain            |   99.26 |    97.19 |     100 |   99.17 |                   
 prompt-core       |   96.07 |     88.7 |     100 |    97.6 |                   
 render            |     100 |       98 |     100 |     100 |                   
 utils             |   93.54 |    86.89 |   94.62 |   94.06 |                   
  faq-html.ts      |     100 |    97.22 |     100 |     100 | 108               
  ...ral-parity.ts |   97.87 |    94.44 |     100 |     100 | 131               
...
=============================== Coverage summary ===============================
Statements   : 94.12% ( 4167/4427 )
Branches     : 87.94% ( 2597/2953 )
Functions    : 95.62% ( 853/892 )
Lines        : 94.69% ( 3499/3695 )
================================================================================
EXIT=0
```

Floors from `vitest.config.ts` (AGENTS.md thresholds), against the measured numbers:

| Scope | Metric | Floor | Measured | Holds |
|---|---|---|---|---|
| global | lines | 80 | 94.69 | yes |
| global | functions | 80 | 95.62 | yes |
| global | branches | 75 | 87.94 | yes |
| global | statements | 80 | 94.12 | yes |
| `src/domain/**` | lines / functions / branches / statements | 95 / 95 / 90 / 95 | 99.17 / 100 / 97.19 / 99.26 | yes |
| `src/render/**` | lines / functions / branches / statements | 95 / 95 / 90 / 95 | 100 / 100 / 98 / 100 | yes |
| `src/prompt-core/**` | lines / functions / branches / statements | 95 / 95 / 85 / 95 | 97.6 / 100 / 88.7 / 96.07 | yes |

Every number is identical to v1 (the loop-back fix touched only `src/prompts/` and `src/app/`, both outside the coverage scope).

Threshold integrity: `vitest.config.ts` is not in the `27b01b8..HEAD` diff (`git diff 27b01b8 --name-only` also shows no change to `package.json`, `angular.json`, `tsconfig*` or `arch-guard.sh`), so no threshold was lowered, no `include` narrowed, no exclude added (section 7.7 clean).

Coverage-scope note: the coverage `include` is `src/utils`, `src/prompt-core`, `src/render`, `src/domain` only. The new `src/utils/faq-html.ts` and `src/utils/structural-parity.ts` appear in the text table. The new `src/utils/faq-gate.ts` and `src/utils/faq-form.ts` are not rows because the text reporter omits fully covered files; the generated HTML report (`coverage/utils/faq-gate.ts.html`, `coverage/utils/faq-form.ts.html`) shows 100% on all four metrics for both. Orchestrator, component and `src/prompts/` code (including the FROZEN `task-c.ts`) is outside the coverage scope by configuration (unchanged by this Story), so this command does not measure it.

**PASS**

---

## 4. `npm run build`

Invocation: `npm run build` (= `ng build`).

```
> 02-05-2026-seo-content-generator@0.0.0 build
> ng build

Initial chunk files | Names                 |  Raw size | Estimated transfer size
main-UFTY3AKP.js    | main                  |   1.03 MB |               259.49 kB
chunk-7RYU3Q7I.js   | -                     | 172.35 kB |                51.51 kB
styles-KY2DT4WL.css | styles                |   3.29 kB |               835 bytes

                    | Initial total         |   1.21 MB |               311.83 kB

Lazy chunk files    | Names                 |  Raw size | Estimated transfer size
chunk-G4VV4H53.js   | html-editor-component |   1.07 MB |               282.90 kB

Application bundle generation complete. [8.469 seconds] - 2026-10-14T19:16:46.273Z

[WARNING] Module 'file-saver' used by 'src/app/app.component.ts' is not ESM
[WARNING] Module 'js-beautify' used by 'src/app/components/html-editor/source-view.ts' is not ESM
[WARNING] Module 'jszip' used by 'src/utils/zip-generator.ts' is not ESM

Output location: C:\Work\Content-Swiss-Knife\dist

EXIT=0
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

EXIT=0
```

Exit code 0. The five frozen checksums (the baseline in `.arch-guard-checksums` at HEAD, which arch-guard verified against the working files; `sha256sum src/prompts/task-c.ts` independently returns `619c45a9...9247`):

```
0421226ccbf10c1f347ee134d2633086a2dbe89284148d053ce4d56ba1c9c89f  src/prompts/task-a.ts
ad55a5ff3684ea7ffb7d3d58442c554835a644821718397974c66de638cda3c9  src/prompts/task-b.ts
619c45a98f6dac6ef912316ab26fa05d5c58ab010ac8a54ad8198f0e23329247  src/prompts/task-c.ts
75eb4d0b9268a514268f2d53b36d12a5ff15bc3537a8d9cf84d6f189f93197f8  src/prompt-core/master-system-prompt.ts
fba6ba2848a714298117155ebd4debe361f5665f3f679698c6c2b4136ac55cc2  src/utils/output-validator.ts
```

### Frozen-file scope check (`git diff` since base `27b01b8`)

- Per-file `git diff 27b01b8 --shortstat`: `task-a.ts`, `task-b.ts`, `master-system-prompt.ts` and `output-validator.ts` are empty (unchanged). `src/prompts/task-c.ts` is the only FROZEN file changed: 171 insertions, 2 deletions net since base.
- `git log 27b01b8..HEAD -- src/prompts/task-c.ts .arch-guard-checksums` returns exactly two commits, and each carries both files:
  - `da59195 feat(US-8.1 T1): add the additive FAQ translation variant to task-c.ts (FROZEN, operator-approved)` - `git show --stat`: `.arch-guard-checksums | 2 +-`, `src/prompts/task-c.ts | 174 +++`.
  - `8c89bce fix(US-8.1): derive the FAQ language name from the registry and use MASTER_LOCALE in tab descriptors` - `git show --stat`: `.arch-guard-checksums | 2 +-`, `src/prompts/task-c.ts | 13 +++---` (plus `src/app/tab-descriptors.ts`, not frozen).
  The edit and the re-baseline are in the same commit in both cases, as AGENTS.md section 9 requires.
- The net `.arch-guard-checksums` diff since base is one line only: the `task-c.ts` checksum `aa1f675c...5936f` -> `619c45a9...9247`. The other four lines are unchanged.
- Section 9 approval records, both present in `docs/catalog/US-8.1-pipeline-status.md` and quoted from there:
  1. "T1 - section 9 stop and approval record": "modify src/prompts/task-c.ts 1. I explicitly grant permission to modify src/prompts/task-c.ts under AGENTS.md §9. Re-baseline .arch-guard-checksums in commit T1." Scope: this one file, T1 only. Covers `da59195`.
  2. "Loop-back fix 1 of 3 (changes_required: V-1, V-2) - section 9 stop and approval record": "I explicitly grant permission to modify src/prompts/task-c.ts under AGENTS.md §9 for the V-1 fix only; re-baseline .arch-guard-checksums in the same commit." Scope: this one file, the V-1 fix only. Covers `8c89bce`. The pipeline status records that the T1 grant was not relied on for it.
  Both grants match the grants the caller recorded for this gate. Both edits are within the granted scope: `8c89bce` removes the `FAQ_LANGUAGE_NAMES` table and derives the name via `isoToHumanLang(taskLangToIso(...))` (V-1) and touches no other FROZEN file.
- This stage did not run `arch-guard.sh --rebaseline`.

### What arch-guard does NOT prove

- **It does not check architecture Rule #2** (retrieval separate from generation). A green arch-guard is not evidence that Rule #2 holds. Rule #2 is `so-implementation-verifier`'s, verified by reading the diff.
- It does not run the tests, the type-check or the build; it is one of six commands.

**PASS**

---

## 6. `npm run validate:harness`

Run because `docs/workflow/active-story.yaml`, `docs/workflow/history.jsonl` and `docs/workflow/workflow-state.yaml` appear in `git diff --name-only 27b01b8..HEAD -- docs/workflow` (no `so-*` skill file changed).

Invocation: `npm run validate:harness` (= `node tools/validate-harness.mjs --strict`).

```
> 02-05-2026-seo-content-generator@0.0.0 validate:harness
> node tools/validate-harness.mjs --strict


harness validation — 22 stages, 23 artifacts, 16 skills named

  OK — registry is internally consistent and every named skill exists.

EXIT=0
```

Zero errors. **PASS**

---

## 7. Test-integrity observations (informational, none is a failure)

- `git diff --name-status 27b01b8..HEAD` shows two modified pre-existing specs besides `app.component.template-wiring.spec.ts`: `src/services/content-orchestrator.simplified.spec.ts` (the "US-8.1 REWRITE OF THE R6 BLOCK" owned by TEST_WRITING: FAQ shape changed from one generation per language to one uk-UA generation plus one translation per other language) and `src/prompts/task-faq.spec.ts` (AC-6, `<strong>` to `<b>`). Unchanged from v1's reading.
- Commit `c62e30a` corrected six FR-21 English-translation assertions in `content-orchestrator.faq-pipeline.spec.ts` (ASCII space -> `\s` because the unchanged normaliser inserts U+00A0; the adjoined-unit negative assertion kept). Reported for the downstream reviewers; it did not weaken the gate.
- The loop-back fix `8c89bce` modified no test, fixture or golden file (`git diff 56f690b HEAD --stat -- src test` lists only `src/app/tab-descriptors.ts` and `src/prompts/task-c.ts`); the 16-pair `task-c.description-bytes.spec.ts` golden and `task-c.faq.spec.ts` stayed green with the same counts.
- Prompt-text effect of the V-1 fix, as recorded in the pipeline status: in the FAQ generic-language branch (non-EXPERT3D stores) the ES language name now reads "Castilian Spanish" and PT "European Portuguese" (the registry helper's names). The suite is green with that; whether the wording is acceptable is for `so-implementation-verifier` / `so-reconciliation-reviewer`, not a gate matter.
- No threshold, `include` or exclude change (section 3), no `--no-verify`, no hook skip is evidenced in the diff.

---

## 8. Not performed

- **Browser / manual check: NOT performed.** The FAQ Generator mode button, form, disabled-Generate state (AC-10, AC-11, AC-12), the FAQ-only tab (AC-13) and the history entry (AC-15) were not exercised in a running application by this stage. They are asserted by the logic-runner template-wiring, tab-descriptor and orchestrator specs only.
- No live LLM call was made; all model calls in the suites are stubbed (the 3 skipped live-probe tests did not run).

## 9. What this report does not cover

- **Architecture Rule #2** has no automated check; `bash arch-guard.sh` green is not evidence for it.
- **The AGENTS.md section 6.6 runtime rules** (Rule #2 by reading the diff; section 4 HTML acceptance criteria against real output where the prompt or renderer changed; the store registry as the only source of languages and currency) are NOT checked by this gate. They belong to `so-implementation-verifier` (IMPLEMENTATION_VERIFICATION), which must re-verify the post-fix diff. A green gate must not be read as full compliance.
- AC-20 (arch-guard exit 0 after the re-baseline) has no unit test by design; it is evidenced by section 5 above.

## 10. Outcome

`verdict: PASS`. No `loop_back_stage`. Next stage: IMPLEMENTATION_VERIFICATION (re-verification of the V-1/V-2 fix).
