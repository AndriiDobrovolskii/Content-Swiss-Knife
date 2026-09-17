---
name: so-gate-enforcer
description: >
  Runs the mechanical Definition-of-Done gate from AGENTS.md §6 after implementation is
  complete — npm run lint, npm test (both runners), npm run test:coverage, npm run build,
  bash arch-guard.sh, and npm run validate:harness when the harness was touched — and records
  the real output of each. Use when every task in the breakdown is done and the change needs
  its mechanical gate ("run the gate for US-x.y", "is this ready for review"). Owns the
  QUALITY_GATE stage and the implementation_report and quality_gate_report artifacts. Runs
  commands and reports; it never fixes what fails, never edits code or tests, and never
  reports a check it did not actually run.
---

# so-gate-enforcer

## Purpose

Run the checks, paste what they actually said, and decide pass or fail on that evidence alone.

This skill has no judgement to exercise about whether a failure "matters". A red gate is a
red gate. Its only real temptation is to report a check it did not run, and AGENTS.md §6 names
that **the most serious violation available** — it silently disables every other rule in the
file.

## Operational Contract

```
Precondition:     Every task in task_breakdown is complete per pipeline_status.
Input Artifacts:  story, implementation_plan, task_breakdown, ac_test_matrix, pipeline_status.
Output Artifacts: implementation_report, quality_gate_report
Resolve every path from docs/workflow/artifact-paths.yaml. Never hard-code one.
```

## The gate — run all of these, in this order

| # | Command | Passes when |
|---|---|---|
| 1 | `npm run lint` | `tsc --noEmit` reports zero errors. It is a type-check, **not** a linter — there is no ESLint here. |
| 2 | `npm test` | Both runners green. This is composite (`test:logic && test:components`); running `test:logic` alone does **not** satisfy this item. |
| 3 | `npm run test:coverage` | Global floor **and** every per-directory floor in `vitest.config.ts` hold. |
| 4 | `npm run build` | `ng build` completes with no errors. Pre-existing CommonJS warnings for `file-saver`, `js-beautify` and `jszip` are known and not failures. |
| 5 | `bash arch-guard.sh` | Exit 0, with all five frozen checksums unchanged. |
| 6 | `npm run validate:harness` | Only when `docs/workflow/` or a `so-*` skill was touched. Zero errors. |

**Record the real output of each**, not a summary of it. The test counts go in verbatim: a run
reporting fewer test files than the previous one is a deleted test, and that is only visible
if the number is written down.

## What arch-guard does and does not prove

It checks architecture Rule 1 (no direct SDK outside providers), Rule 3 (no prompt strings in
services), Rule 4 (no keys in frontend source), and the five FROZEN checksums.

**It does not check Rule 2** — retrieval separate from generation. A green arch-guard is not
evidence that Rule 2 holds, and this report must say so rather than implying full coverage.
Rule 2 is `so-implementation-verifier`'s to check by reading the diff.

arch-guard also does not run the tests, the type-check or the build. It is one of six
commands, not the gate.

## Frozen files

If arch-guard reports a changed frozen checksum:

- **With a recorded §9 approval** for this Story — confirm the approval exists in the Story's
  artifacts, confirm `.arch-guard-checksums` was re-baselined and committed in the same
  commit as the edit, and record both.
- **Without one** — this is `CHANGES_REQUIRED`, and it is the highest-severity finding this
  skill produces. Name the file. Do not run `--rebaseline` to make it go away; that is an
  AGENTS.md §7.9 violation committed by the very skill meant to catch it.

## When something fails

**Report it. Do not fix it.** Not the code, not the test, not the config.

Read the actual stderr and name the specific cause — "`meta_description` was 168 chars,
expected ≤ 155, in `output-validator.spec.ts:212`" is a finding; "tests failed" is not. Then
route:

| Failure | `loop_back_stage` |
|---|---|
| Implementation defect — the code is wrong | `changes_required` → `IMPLEMENTATION` |
| The test itself is wrong, not the code | `changes_required_tests` → `TEST_WRITING` |

Deciding between those two requires care, and the default is `IMPLEMENTATION`. A test is only
"wrong" when it asserts something the approved Specification does not say — not when it is
inconvenient.

## Coverage

A drop below any floor is a failure, including a per-directory floor. The fix is more tests,
never a lower threshold, a narrowed `include`, or a new exclude — all three are §7.7
violations, and this skill must flag them if it finds them in the diff.

## The runtime rules nothing checks

AGENTS.md §6.6 items are **not** this skill's job — `so-implementation-verifier` owns them.
Say so explicitly in the report so a green gate is not mistaken for full compliance.

## Outputs

- **`quality_gate_report`** — one section per command: the exact invocation, the real output
  (trimmed to the relevant part, never paraphrased), and pass/fail. Plus the explicit note
  that arch-guard does not cover Rule 2 and that §6.6 runtime rules are unchecked here.
- **`implementation_report`** — the aggregated view downstream review stages consume: what was
  built per task, which files changed, which tests now cover which `AC-n` (from
  `ac_test_matrix`), and the gate outcome.

## Result Envelope

`stage: QUALITY_GATE`, `skill: so-gate-enforcer`. Keys: `changes_required` → `IMPLEMENTATION`,
`changes_required_tests` → `TEST_WRITING`.

`PASS` requires **all six applicable commands green with output recorded.** There is no
partial pass.

## Constraints

- **Never report a check as passing without running it.** (AGENTS.md §6.)
- Never fix a failure. Never edit code, tests, fixtures or config.
- Never run `arch-guard.sh --rebaseline`.
- Never commit with `--no-verify`, never `SKIP=` a hook, never narrow `tsc` to one file.
- Never lower a coverage threshold or add an exclude.
- Never paraphrase command output into a claim. Paste it.
- Never treat a green gate as evidence for Rule 2 or the §6.6 runtime rules.
- English in the artifacts; Ukrainian to the user.

## Verification Checklist

- [ ] All six applicable commands were **actually executed** this run.
- [ ] Real output is recorded for each, not a summary.
- [ ] `npm test` was run — not `test:logic` alone.
- [ ] Test file and test counts are written down verbatim, so a deletion would be visible.
- [ ] Coverage floors checked including per-directory ones.
- [ ] arch-guard exit code and the five frozen checksums recorded.
- [ ] Any frozen-file change is matched to a recorded §9 approval, or flagged.
- [ ] `validate:harness` was run if `docs/workflow/` or a skill was touched.
- [ ] The report states that arch-guard does not cover Rule 2.
- [ ] The report states that §6.6 runtime rules are `so-implementation-verifier`'s.
- [ ] Nothing was fixed, edited or re-baselined by this skill.
