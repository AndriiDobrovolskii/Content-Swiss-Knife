---
artifact: quality_gate_report
story: US-6.1
version: 1
status: ARCHIVED
owner: so-gate-enforcer
stage: QUALITY_GATE
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T00:00:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 4
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: ac_test_matrix
    version: 2
  - key: pipeline_status
    version: 2
---

# Quality Gate Report - US-6.1

Verdict: PASS. All six commands were executed this run, in order, at HEAD `df268b8` (branch feat/US-6.1-html-editor-preserve-iframe-embed, implementation commits 58d8335, 770c61a, df268b8). Nothing was fixed, edited, committed or re-baselined by this stage.

Pending manual check (NOT a pass): the manual Copy HTML QA for the T2 call-site swaps in `html-editor.component.ts` (plan decision D9) has NOT been performed. It is not a gate command and does not change the six results below, but it is recorded as open.

## 1. `npm run lint` - PASS (exit 0)
```
> tsc --noEmit
```
Zero errors (type-check only; no ESLint exists).

## 2. `npm test` (composite, both runners) - PASS (exit 0)
test:logic (vitest):
```
 Test Files  164 passed (164)
      Tests  4569 passed | 3 skipped (4572)
```
test:components (ng test):
```
 Test Files  2 passed (2)
      Tests  32 passed (32)
```
Versus the US-5.1 baseline report (163 files / 4506 tests / 3 skipped): 164 files / 4569 tests / 3 skipped. No count decreased, so no test was deleted. The 3 skipped are the pre-existing LIVE_DOC_TEST probe.

## 3. `npm run test:coverage` - PASS (exit 0)
```
 Test Files  164 passed (164)
      Tests  4569 passed | 3 skipped (4572)
Statements   : 93.79% ( 3811/4063 )
Branches     : 87.97% ( 2393/2720 )
Functions    : 95.07% ( 792/833 )
Lines        : 94.29% ( 3208/3402 )
 domain      |   99.26 |    97.19 |     100 |   99.17
 prompt-core |   98.53 |     90.5 |     100 |   99.12
 render      |     100 |       98 |     100 |     100
```
Global floor 80/75/80/80 and per-directory floors (domain/render 95/90/95/95, prompt-core 95/85/95/95) held; no threshold-failure message; exit 0. `git diff main...HEAD -- vitest.config.ts` is empty: no threshold lowered, no include/exclude change.

## 4. `npm run build` - PASS (exit 0)
```
Application bundle generation complete. [15.029 seconds]
WARNING Module 'file-saver' used by 'src/app/app.component.ts' is not ESM
WARNING Module 'js-beautify' used by 'src/app/components/html-editor/source-view.ts' is not ESM
WARNING Module 'jszip' used by 'src/utils/zip-generator.ts' is not ESM
Output location: C:\Work\Content-Swiss-Knife\dist
```
Only the three known CommonJS warnings; no errors.

## 5. `bash arch-guard.sh` - PASS (exit 0)
```
[Rule #1] Checking for direct SDK calls outside providers/...  OK
[Rule #3] Checking for hard-coded LLM prompts in services (not orchestrator)...  OK
[Rule #4] Checking for API keys in frontend source...  OK
[FROZEN] Checking frozen prompt files for unauthorized changes...  All frozen files unchanged
ALL CHECKS PASSED
```
Five frozen checksums unchanged. `git diff --name-only main...HEAD -- src/prompts src/prompt-core .arch-guard-checksums` is empty: no frozen file touched, no §9 approval needed, no re-baseline run.

## 6. `npm run validate:harness` - PASS (exit 0)
Run because the working tree modifies `docs/workflow/*` (state files; not part of the implementation commits).
```
harness validation — 22 stages, 23 artifacts, 16 skills named
  OK — registry is internally consistent and every named skill exists.
```

## Limits of this gate
- arch-guard does NOT check architecture Rule 2 (retrieval separate from generation); a green arch-guard is not evidence for it. Rule 2 belongs to so-implementation-verifier, by reading the diff.
- The AGENTS.md §6.6 runtime rules are not checked by any command here; they are so-implementation-verifier's.
- Manual Copy HTML QA for the T2 call-site swaps (D9): PENDING, not performed.
