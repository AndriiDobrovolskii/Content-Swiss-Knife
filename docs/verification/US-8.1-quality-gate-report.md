---
artifact: quality_gate_report
story: US-8.1
version: 1
status: DRAFT
owner: so-gate-enforcer
stage: QUALITY_GATE
created_at: 2026-10-14T21:15:00Z
updated_at: 2026-10-14T21:15:00Z
supersedes: null
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

# Quality Gate Report - US-8.1

Branch `feat/US-8.1-single-master-faq`, HEAD `56f690b` (includes T1-T13). Base for the diff scope: `27b01b8`.
Working tree was clean before the run and clean after it (`git status --short` empty; `coverage/` and `dist/` are git-ignored).
All six commands below were executed in this run, in this order, from `C:\Work\Content-Swiss-Knife`. Output is pasted from the real runs (long per-test listings trimmed to the header, the summary and the exit code). Nothing was fixed, edited or re-baselined by this stage.

**Verdict: PASS - all six applicable commands exited 0.**

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `npm run lint` | 0 | PASS |
| 2 | `npm test` (`test:logic` AND `test:components`) | 0 | PASS |
| 3 | `npm run test:coverage` | 0 | PASS (global and all three per-directory floors hold) |
| 4 | `npm run build` | 0 | PASS (only the 3 known CommonJS warnings) |
| 5 | `bash arch-guard.sh` | 0 | PASS (all five frozen checksums unchanged) |
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
   Start at  21:07:48
   Duration  43.12s (transform 11.03s, setup 0ms, import 37.37s, tests 49.24s, environment 135.69s)
```

### 2b. `test:components` (`ng test`)

The user accepted `test:components` as unevaluated until this gate; it is evaluated here.

```
> 02-05-2026-seo-content-generator@0.0.0 test:components
> ng test

Application bundle generation complete. [10.944 seconds] - 2026-10-14T18:08:44.615Z

 RUN  v4.1.10 C:/Work/Content-Swiss-Knife

 Test Files  2 passed (2)
      Tests  32 passed (32)
   Start at  21:08:45
   Duration  1.68s (transform 346ms, setup 748ms, import 668ms, tests 671ms, environment 720ms)

EXIT=0
```

### Counts, written down so a deletion would be visible

| Runner | Test files | Tests | Previous gate (US-7.1 quality-gate report) |
|---|---|---|---|
| `test:logic` | 184 passed (184) | 6254 passed, 3 skipped (6257) | 175 files, 5176 passed, 3 skipped (5179) |
| `test:components` | 2 passed (2) | 32 passed (32) | 2 files, 32 tests |

The logic runner grew by 9 test files and 1078 tests; the 3 skipped are unchanged; the component runner is identical. No test file count dropped. The 9 new files match the 9 `A` (added) spec files in the diff (`tab-descriptors.spec.ts`, `task-c.description-bytes.spec.ts`, `task-c.faq.spec.ts`, `content-orchestrator.faq-pipeline.spec.ts`, `content-orchestrator.faq-standalone.spec.ts`, `faq-form.spec.ts`, `faq-gate.spec.ts`, `faq-html.spec.ts`, `structural-parity.faq.spec.ts`).

Observation, not a failure: `test:components` still runs only the two pre-existing `*.component.spec.ts` files (model-settings, content-template-select). US-8.1 added no `*.component.spec.ts`; the FAQ Generator template wiring (AC-10, AC-11, AC-12, AC-13) is asserted by `src/app/app.component.template-wiring.spec.ts` on the logic runner. Real rendering of the new mode in a browser was NOT performed (see section 8).

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

Threshold integrity: `vitest.config.ts` is not in the `27b01b8..HEAD` diff, so no threshold was lowered, no `include` narrowed, no exclude added (section 7.7 clean).

Coverage-scope note: the coverage `include` is `src/utils`, `src/prompt-core`, `src/render`, `src/domain` only. The new `src/utils/faq-html.ts` (100/97.22/100/100) and `src/utils/structural-parity.ts` (97.87/94.44/100/100) appear in the text table. The new `src/utils/faq-gate.ts` and `src/utils/faq-form.ts` do not appear as rows because the text reporter omits fully covered files; the generated HTML report (`coverage/utils/faq-gate.ts.html`, `coverage/utils/faq-form.ts.html`) shows 100% / 100% / 100% / 100% for both. Orchestrator, component and `src/prompts/` code is outside the coverage scope by configuration (unchanged by this Story), so its coverage is not measured by this command.

**PASS**

---

## 4. `npm run build`

Invocation: `npm run build` (= `ng build`).

```
> 02-05-2026-seo-content-generator@0.0.0 build
> ng build

Initial chunk files | Names                 |  Raw size | Estimated transfer size
main-IPKDBT23.js    | main                  |   1.03 MB |               259.25 kB
chunk-7RYU3Q7I.js   | -                     | 172.35 kB |                51.51 kB
styles-KY2DT4WL.css | styles                |   3.29 kB |               835 bytes

                    | Initial total         |   1.21 MB |               311.60 kB

Lazy chunk files    | Names                 |  Raw size | Estimated transfer size
chunk-G4VV4H53.js   | html-editor-component |   1.07 MB |               282.90 kB

Application bundle generation complete. [8.727 seconds] - 2026-10-14T18:10:05.995Z

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

Exit code 0. The five frozen checksums (the baseline in `.arch-guard-checksums` at HEAD) match the working files:

```
0421226ccbf10c1f347ee134d2633086a2dbe89284148d053ce4d56ba1c9c89f  src/prompts/task-a.ts
ad55a5ff3684ea7ffb7d3d58442c554835a644821718397974c66de638cda3c9  src/prompts/task-b.ts
06867d09704167e297f3199ea8cd94fe40759401fea9bcdac46bf903ce520ceb  src/prompts/task-c.ts
75eb4d0b9268a514268f2d53b36d12a5ff15bc3537a8d9cf84d6f189f93197f8  src/prompt-core/master-system-prompt.ts
fba6ba2848a714298117155ebd4debe361f5665f3f679698c6c2b4136ac55cc2  src/utils/output-validator.ts
```

### Frozen-file scope check (`git diff` since base `27b01b8`)

- FROZEN files in `git diff --name-only 27b01b8..HEAD`: exactly one, `src/prompts/task-c.ts`. `task-a.ts`, `task-b.ts`, `master-system-prompt.ts` and `output-validator.ts` are not in the diff. No other FROZEN file changed.
- `git log 27b01b8..HEAD -- src/prompts/task-c.ts .arch-guard-checksums` returns a single commit: `da59195 feat(US-8.1 T1): add the additive FAQ translation variant to task-c.ts (FROZEN, operator-approved)`. The edit and the re-baseline are in the same commit, as AGENTS.md section 9 requires (`git show da59195 --stat`: `.arch-guard-checksums | 2 +-`, `src/prompts/task-c.ts | 174 +++`).
- The `.arch-guard-checksums` diff is one line only: the `task-c.ts` checksum `aa1f675c...5936f` -> `06867d09...520ceb`. The other four lines are unchanged.
- Section 9 approval record: present in `docs/catalog/US-8.1-pipeline-status.md` under "T1 - section 9 stop and approval record", quoting the operator's instruction verbatim ("modify src/prompts/task-c.ts 1. I explicitly grant permission to modify src/prompts/task-c.ts under AGENTS.md §9. Re-baseline .arch-guard-checksums in commit T1."), scoped to this one file for T1. This matches the grant the caller recorded for this gate. The edit is additive (the diff shows 173 added / 1 removed lines in `task-c.ts`; the single removed line is the old `opts` type in the signature).
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

- `git diff --name-status 27b01b8..HEAD` shows one modified pre-existing spec: `src/services/content-orchestrator.simplified.spec.ts` (29 changed lines per `git diff --stat`). Its header records the change as the "US-8.1 REWRITE OF THE R6 BLOCK" owned by TEST_WRITING per the task breakdown T6/T7 (spec FR-1, FR-2, FR-4): the FAQ's shape changed from one generation per language to one uk-UA generation plus one translation per other language, so the expected call labels changed from 7 generations to 1 generation + 6 translations. The NO-FAQ-materials and whitespace-only tests are untouched. The assertions were made stricter in shape, not removed.
- `src/prompts/task-faq.spec.ts` is also modified (AC-6; `<strong>` to `<b>` in the FAQ prompt).
- Commit `c62e30a` corrected the six FR-21 English-translation assertions in `content-orchestrator.faq-pipeline.spec.ts` (`toContain('1.75 mm')` with an ASCII space -> `toMatch(/1\.75\smm/)` because the unchanged normaliser inserts U+00A0), keeping `.not.toContain('1.75mm')`. The pipeline status records this as a test defect; the change is a test-side correction that still fails an adjoined unit. It is reported here for the downstream reviewers; it did not weaken the gate.
- No threshold, `include` or exclude change (section 3), no `--no-verify`, no hook skip is evidenced in the diff.

---

## 8. Not performed

- **Browser / manual check: NOT performed.** The FAQ Generator mode button, form, disabled-Generate state (AC-10, AC-11, AC-12), the FAQ-only tab (AC-13) and the history entry (AC-15) were not exercised in a running application by this stage. They are asserted by the logic-runner template-wiring, tab-descriptor and orchestrator specs only.
- No live LLM call was made; all model calls in the suites are stubbed.

## 9. What this report does not cover

- **Architecture Rule #2** has no automated check; `bash arch-guard.sh` green is not evidence for it.
- **The AGENTS.md section 6.6 runtime rules** (Rule #2 by reading the diff; section 4 HTML acceptance criteria against real output where the prompt or renderer changed; the store registry as the only source of languages and currency) are NOT checked by this gate. They belong to `so-implementation-verifier` (IMPLEMENTATION_VERIFICATION). A green gate must not be read as full compliance.
- AC-20 (arch-guard exit 0 after the re-baseline) has no unit test by design; it is evidenced by section 5 above.

## 10. Outcome

`verdict: PASS`. No `loop_back_stage`. Next stage: IMPLEMENTATION_VERIFICATION.
