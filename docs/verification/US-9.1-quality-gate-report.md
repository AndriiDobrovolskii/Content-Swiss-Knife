---
artifact: quality_gate_report
story: US-9.1
version: 3
status: ARCHIVED
owner: so-gate-enforcer
stage: QUALITY_GATE
created_at: 2026-10-19T15:45:00Z
updated_at: 2026-10-19T15:45:00Z
supersedes: docs/verification/US-9.1-quality-gate-report.md#2
inputs_consumed:
  - key: story
    version: 6
  - key: implementation_plan
    version: 7
  - key: task_breakdown
    version: 6
  - key: ac_test_matrix
    version: 5
  - key: pipeline_status
    version: 5
open_decisions_blocking: false
---

# Quality Gate Report - US-9.1 (round 4 tree, re-run after the Story v6 records refresh)

Branch `feat/US-9.1-no-picture-references-and-livelier-descriptions`, HEAD `313f727`, branch base `6546db8`, pre-removal commit `09f87dc`. Node `v24.15.0` (`node --version`). Platform win32, Git Bash.
Run on 2026-10-19, `date -u` between about 15:30 and 15:41 (last command at 15:40:46). Every number below is from this run, not carried over from v2.

Tree state: `git diff 313f727 --stat -- . ':!docs'` is empty and `git status --short -- . ':!docs'` is empty (0 lines): no `src`, `test`, `tools`, `server` or config file is modified, so the gate ran on exactly the committed tree of `313f727`, the same non-doc tree as the previous gate run. The only working-tree modifications are under `docs/` (story, specification, plan, breakdown, test and review artifacts, `docs/workflow/workflow-state.yaml`, `docs/workflow/history.jsonl`). Nothing was fixed, edited, re-baselined or committed by this stage.

**Waived criteria (not a gate item, stated so they are not read as passed):** AC-11 and AC-12 are WAIVED by the owner (Story v6, 2026-10-19; history event `ts` 2026-10-19T14:50:23Z). They are **waived and unmeasured**: no test, no run and no script output exists for either, and this gate does not claim, imply or count them as passed.

**Verdict: PASS**, with one disclosed non-blocking finding: the first `npm test` run of this session was red (1 test timed out, F1 below) and a second full `npm test` run on the same unchanged tree was green. Both runs are recorded in section 2. All five applicable commands are green on their final recorded run; the sixth (`validate:harness`) is not applicable and was not run (section 6).

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `npm run lint` | 0 | PASS (`tsc --noEmit`, no output) |
| 2 | `npm test` (logic + components) | run 1: 1 (logic, 1 timeout); run 2: 0 | PASS on run 2 (logic 221 files / 7569 passed + 3 skipped; components 2 files / 32 passed); run 1 FAILED, see F1 |
| 3 | `npm run test:coverage` | 0 | PASS (global and every per-directory floor hold) |
| 4 | `npm run build` | 0 | PASS (only the three known CommonJS warnings) |
| 5 | `bash arch-guard.sh` | 0 | PASS (Rules 1, 3, 4 OK; "All frozen files unchanged") |
| 6 | `npm run validate:harness` | - | NOT APPLICABLE, NOT RUN (harness untouched) |

## 1. `npm run lint`

```
> 02-05-2026-seo-content-generator@0.0.0 lint
> tsc --noEmit

EXIT=0
```

Zero type errors. PASS.

## 2. `npm test` (composite: `test:logic && test:components`)

`npm test` itself was run both times (it prints `> npm run test:logic && npm run test:components`); `test:logic` alone was never taken as the result.

### Run 1 - FAILED (exit 1)

```
 FAIL  test/removal.spec.ts > AC-13 / FR-20 — no source, spec or fixture references a removed item > no CONSUMABLES_ constant, overlay or pipeline-enablement name is referenced anywhere (green at T13)
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ test/removal.spec.ts:73:3

 Test Files  1 failed | 220 passed (221)
      Tests  1 failed | 7568 passed | 3 skipped (7572)
   Start at  18:32:14
   Duration  124.58s (transform 32.08s, setup 0ms, import 97.62s, tests 184.88s, environment 376.61s)
EXIT=1
```

`&&` short-circuited, so `test:components` did not run inside this `npm test` invocation. This run is a recorded failure and is not discarded.

Diagnosis (read-only, nothing changed): the failing assertion is `expect(offenders(constantsPrefix)).toEqual([])` at `test/removal.spec.ts:74`; the test text-scans the whole tree for six removed tokens and carries the default 5000 ms vitest timeout. The failure is a timeout, not an assertion mismatch. `npx vitest run test/removal.spec.ts` alone passed 19/19 and that same test took 402 ms (its sibling 449 ms); the full logic runs took 116 to 134 s of wall time, so the scan was starved by parallel worker load. No `src`/`test` file differs from the previous gate run, in which this test passed. Treat as a load-sensitive timing flake, finding F1.

### Run 2 - PASS (exit 0), same unchanged tree

Logic runner (`vitest run`):

```
 Test Files  221 passed (221)
      Tests  7569 passed | 3 skipped (7572)
   Duration  116.68s (transform 25.78s, setup 0ms, import 89.26s, tests 176.92s, environment 351.08s)
```

The 3 skipped tests are the pre-existing live-proxy tests in `test/doc-generation-live.spec.ts`, unchanged by this Story.

Components runner (`ng test`; the two specs are `model-settings` and `content-template-select`):

```
> 02-05-2026-seo-content-generator@0.0.0 test:components
> ng test
Application bundle generation complete. [17.743 seconds] - 2026-10-19T15:37:00.339Z

 RUN  v4.1.10 C:/Work/Content-Swiss-Knife

 Test Files  2 passed (2)
      Tests  32 passed (32)
   Start at  18:37:01
   Duration  2.92s (transform 371ms, setup 1.31s, import 1.11s, tests 1.03s, environment 1.50s)

EXIT=0
```

### Deletion check (counts written down so a deleted test would be visible)

BASE `6546db8` (US-8.1 gate): logic 185 files / 6380 + 3 skipped, components 2 / 32. Round 3 gate (HEAD `9d8b0c2`, operator-notes present): logic 221 / 7620 + 3 skipped, components 3 / 55. Previous gate run (v2, same tree): logic 221 / 7569 + 3 skipped, components 2 / 32. Now (run 2): logic 221 / 7569 + 3 skipped, components 2 / 32. Identical to v2; no file or test lost against the previous run on this tree. Round 3 to now: `git diff --name-status 09f87dc..HEAD -- . ':!docs'` is 12 `D`, 7 `A`, 19 `M` (re-run this session, same counts), which reconcile with the 221 - 7 + 7 logic files and 3 - 1 component files as recorded in v2; the net test drop is the owner-decided removal of the operator-notes feature specs. Skipped count unchanged at 3. PASS (run 2).

## 3. `npm run test:coverage`

Same logic suite under v8 coverage (a third full pass of the logic suite on this tree, all green, which includes `test/removal.spec.ts`):

```
 Test Files  221 passed (221)
      Tests  7569 passed | 3 skipped (7572)
   Duration  133.73s

-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   94.37 |    88.12 |   96.41 |   95.02 |                   
 domain            |   99.26 |    97.19 |     100 |   99.17 |                   
 prompt-core       |    96.1 |     88.7 |     100 |   97.62 |                   
 render            |     100 |       98 |     100 |     100 |                   
 utils             |   93.85 |    87.16 |   95.62 |   94.47 |                   
-------------------|---------|----------|---------|---------|-------------------
EXIT=0
```

(Directory rows are copied from the full per-file table in the run output; per-file rows omitted for length.)

Floors from `vitest.config.ts` (`git diff 6546db8..HEAD -- vitest.config.ts package.json angular.json tsconfig.json` is empty: no threshold lowered, no `include` narrowed, no exclude added):

| Scope | Floor (lines / functions / branches / statements) | Measured (lines / functions / branches / statements) | Holds |
|---|---|---|---|
| global | 80 / 80 / 75 / 80 | 95.02 / 96.41 / 88.12 / 94.37 | yes |
| `src/domain/**` | 95 / 95 / 90 / 95 | 99.17 / 100 / 97.19 / 99.26 | yes |
| `src/render/**` | 95 / 95 / 90 / 95 | 100 / 100 / 98 / 100 | yes |
| `src/prompt-core/**` | 95 / 95 / 85 / 95 | 97.62 / 100 / 88.7 / 96.1 | yes |

vitest printed no threshold error and exited 0. Measured totals are identical to the previous run. PASS.

## 4. `npm run build`

```
> 02-05-2026-seo-content-generator@0.0.0 build
> ng build

Initial chunk files | Names                 |  Raw size | Estimated transfer size
chunk-7RYU3Q7I.js   | -                     | 172.35 kB |                51.51 kB
styles-KY2DT4WL.css | styles                |   3.29 kB |                   835 bytes
                    | Initial total         |   1.23 MB |               314.95 kB
Lazy chunk files    | Names                 |  Raw size | Estimated transfer size
chunk-G4VV4H53.js   | html-editor-component |   1.07 MB |               282.90 kB

Application bundle generation complete. [22.518 seconds] - 2026-10-19T15:40:05.291Z

WARNING Module 'file-saver' used by 'src/app/app.component.ts' is not ESM
WARNING Module 'js-beautify' used by 'src/app/components/html-editor/source-view.ts' is not ESM
WARNING Module 'jszip' used by 'src/utils/zip-generator.ts' is not ESM

Output location: C:\Work\Content-Swiss-Knife\dist
EXIT=0
```

(ANSI colour codes, the `main` chunk row and the "CommonJS or AMD dependencies can cause optimization bailouts" help lines trimmed.) No errors; the three warnings are the known pre-existing CommonJS ones. PASS.

## 5. `bash arch-guard.sh`

```
Content Swiss Knife - Architecture Guard v1.0
[Rule #1] Checking for direct SDK calls outside providers/...      OK
[Rule #3] Checking for hard-coded LLM prompts in services (not orchestrator)...   OK
[Rule #4] Checking for API keys in frontend source...             OK
[FROZEN] Checking frozen prompt files for unauthorized changes... All frozen files unchanged
ALL CHECKS PASSED
EXIT=0
```

(ANSI colour codes trimmed.) Exit 0. `--rebaseline` was NOT run by this stage.

### Frozen files (AGENTS.md section 9)

`sha256sum` of the five files in the tree this run, identical to the five lines of `.arch-guard-checksums` (working tree clean for that file):

```
dc49a4405c95bdd44714cb2eb479c8f69a7bbaca10c73efffe87c70a2ab1056a  src/prompts/task-a.ts
ad55a5ff3684ea7ffb7d3d58442c554835a644821718397974c66de638cda3c9  src/prompts/task-b.ts
619c45a98f6dac6ef912316ab26fa05d5c58ab010ac8a54ad8198f0e23329247  src/prompts/task-c.ts
0fe9a169fe48818a076ba9e58f8ec43690b2afa80530a85bc45ae56d1ee3b1bb  src/prompt-core/master-system-prompt.ts
3b5f3796bc5613b676cee93ddb19c4ac3419aa3ec0993d96839ad1aef52c1cd4  src/utils/output-validator.ts
```

Change since `09f87dc` (`git diff 09f87dc..HEAD -- .arch-guard-checksums`): exactly two lines, `task-a.ts` (`dc98fd7a...` to `dc49a440...`) and `master-system-prompt.ts` (`57d54839...` to `0fe9a169...`). `task-b.ts`, `task-c.ts` and `output-validator.ts` have no commit in `09f87dc..HEAD` (`git log` empty for each).

| Commit | FROZEN file | `.arch-guard-checksums` in the same commit |
|---|---|---|
| `fd9b052` (T43) | `src/prompt-core/master-system-prompt.ts` | yes (`git show --stat` lists it) |
| `439cc1e` (T44) | `src/prompts/task-a.ts` | yes (`git show --stat` lists it) |

Both subjects carry "FROZEN, owner-approved". Approval on record (read by this stage, not written): `docs/workflow/history.jsonl` line 603, ts `2026-10-19T14:40:00Z`, actor `sbruhov@gmail.com`, owner instruction "modify master-system-prompt.ts, modify task-a.ts, так" (the withdrawal hunks); earlier hunks rest on the line 572 event, ts `2026-10-18T15:24:23Z` (one instruction per file, including `output-validator.ts`). Open Decision OD-25 (exact scope of the 2026-10-19 instruction) is still marked OPEN with a PROPOSED DEFAULT in `docs/decisions/US-9.1-open-decisions.md`; this is for `so-implementation-verifier` and the human, not a mechanical-gate failure (finding F2). PASS.

## 6. `npm run validate:harness`: not applicable, not run

Decision evidence:

- `git diff --name-only 09f87dc..HEAD -- docs/workflow .claude tools/validate-harness.mjs` returns 0 files. The commits in `09f87dc..HEAD` change no file under `docs/workflow/`, no `so-*` skill and no harness tool. (`tools/measure-description.ts` changed; it is the product measurement script, not the harness.)
- Uncommitted working tree: `git status --short docs/workflow .claude` lists only `docs/workflow/history.jsonl` and `docs/workflow/workflow-state.yaml`. These are orchestrator-written workflow data files (stage records), **not a harness change**: the harness is the stage map, schemas, lifecycle/paths registry, `so-*` skills and `tools/validate-harness.mjs`, none of which is modified. `docs/workflow/` data files do not count.

The trigger ("`docs/workflow/` or a `so-*` skill was touched" as a harness change) is not met, so the command was not run and no result is claimed for it.

## Findings

- **F1 (non-blocking, disclosed; flake):** `test/removal.spec.ts:73` ("no CONSUMABLES_ constant, ... referenced anywhere") timed out at the default 5000 ms inside one of three full-suite runs on the unchanged tree (it passed in the second `npm test`, in the coverage run, and alone in 402 ms). It scans the whole tree and is sensitive to worker load. Not fixed by this stage (a gate never edits tests or config). If the owner wants it hardened, a per-test timeout on that file is a TEST_WRITING decision (`changes_required_tests` route); it is not a US-9.1 acceptance failure. Reviewers should know a loaded machine can reproduce the red run.
- **F2 (informational):** OD-25 (scope of the 2026-10-19 FROZEN-file instruction) remains open with a proposed default; the per-file approvals and same-commit re-baselines are present and verified above.

## What this gate does not prove

- `arch-guard.sh` checks architecture Rules 1, 3 and 4 and the five FROZEN checksums only. **It does not check Rule 2 (retrieval separate from generation).** A green arch-guard is not evidence that Rule 2 holds; that is `so-implementation-verifier`'s to check by reading the diff.
- arch-guard also does not run the tests, the type-check or the build; those are separate gate items above.
- The AGENTS.md section 6.6 runtime rules are not checked by any command here; they are `so-implementation-verifier`'s.
- **AC-11 and AC-12 are WAIVED (owner, Story v6, 2026-10-19) and UNMEASURED.** They are not passed, not covered, not partially covered; no live run, script output or test exists for them. T51 is SUPERSEDED by the waiver. pipeline_status v4 residual R5 (live evidence captured before T43) is moot with the waiver but is for RECONCILIATION to restate.

## Non-blocking notes

- The 3 skipped tests are pre-existing (`test/doc-generation-live.spec.ts`); not a finding.
- The `stderr |` noise in the test output is logging from tests that exercise failure and skip paths.
- The `docs/` files modified in the working tree are not committed; the gate ran on the committed non-doc tree, so the result does not depend on them.
