---
artifact: test_generation_report
story: US-6.2
version: 1
status: DRAFT
owner: so-test-writer
created_at: 2026-10-07T00:00:00Z
updated_at: 2026-10-07T00:00:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 3
  - key: specification
    version: 2
  - key: impact_analysis
    version: 2
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: plan_review
    version: 2
  - key: open_decisions
    version: 3
open_decisions_blocking: false
---

# Test Generation Report - US-6.2

## Files changed (tests only)

- `src/utils/html-cleaner.spec.ts`: import of `finalizeTablesForDisplay` from `./table-finalize` and a describe with 6 tests (AC-1, 2, 3, 5, 6, 7).
- `src/prompt-core/master-system-prompt.spec.ts`: a describe with 3 tests (AC-4 x2, AC-8/FR-8).

No implementation code, FROZEN file or golden fixture was edited.

## Observed run

Command: `npx vitest run src/utils/html-cleaner.spec.ts src/prompt-core/master-system-prompt.spec.ts`

Cleaner (4 red, 2 guards green; the 25 pre-existing cleaner tests still pass):

```
x AC-1  -> expected  to have a length of 1 but got +0        (the <b> was rewritten to <strong>)
v AC-2  (guard)
x AC-3  -> expected +0 to be 4                                (output has 0 <b>; input has 4)
v AC-5  (guard)
x AC-6  -> expected  to have a length of 1 but got +0
x AC-7  -> Cannot read properties of null (reading 'getAttribute')   (no <b class> in output)
```

Master prompt (3 red; all pre-existing tests in the file pass):

```
x AC-4/FR-4 old sentence gone  -> expected '[ROLE] You are an expert technical c...' not to contain 'Reserve <strong> for brands / main mo...'
x AC-4/FR-4 [FORMAT] new text  -> expected -1 to be greater than 44180
x AC-8/FR-8 trailing bytes     -> expected '[ROLE] You are an expert technical c...' to contain 'Use <b> for all emphasis (brands, mod...'
```

Totals for the two files: 7 new tests red, 2 new guard tests green, 28 other tests green. Every failure is an assertion on the behaviour under test, not an import or transform error. (A string-escaping typo in the prompt spec's first draft produced a transform error; it was fixed before the recorded run.)

## Right-reason notes

- AC-7 fails with a null dereference because `<b class>` no longer exists in the output. The assertion is on the criterion (class kept on a `b`) and goes green only once the element is preserved.
- The AC-8 text test fails now only because the new sentence is absent; after T2 it additionally proves the following bytes, including the newline, are unchanged.

## Baseline check

`npx vitest run src/prompts/full-description.golden.spec.ts`: 14/14 pass now. It will fail after the FROZEN swap until the golden is regenerated (expected inside the single T2 commit; see the strategy).

## Coverage gaps and notes

- AC-8 diff half, AC-9, AC-10 and M1 are process or manual proofs, not unit tests (see the strategy).
- Corpus fixtures were not reused: the cleaner spec uses inline strings for tag-level assertions, and the corpus triples carry no bold-tag-specific cases.
- The full `npm run test:logic` was not run in this stage; only the two touched files and the golden spec were executed.
