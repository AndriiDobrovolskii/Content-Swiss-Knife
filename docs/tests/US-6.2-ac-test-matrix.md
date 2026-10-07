---
artifact: ac_test_matrix
story: US-6.2
version: 1
status: ARCHIVED
owner: so-test-writer
created_at: 2026-10-07T00:00:00Z
updated_at: 2026-10-07T00:00:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 3
  - key: specification
    version: 2
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: test_strategy
    version: 1
open_decisions_blocking: false
---

# AC <-> Test Matrix - US-6.2

Ids are the Story's `AC-n`. State is as observed in the generation report. `guard` means green now by design and pins behaviour that must survive.

Cleaner describe = `cleanHtmlStructure - US-6.2 bold tag preservation` in `src/utils/html-cleaner.spec.ts`. Prompt describe = `MASTER_SYSTEM_PROMPT - US-6.2 emphasis tag wording` in `src/prompt-core/master-system-prompt.spec.ts`.

| AC | Test file | Test | State now | Green by |
|---|---|---|---|---|
| AC-1 | html-cleaner.spec.ts | Cleaner describe > AC-1: keeps `<b>X</b>` as `<b>` and introduces no `<strong>` | RED | T1 |
| AC-2 | html-cleaner.spec.ts | Cleaner describe > AC-2: keeps `<strong>Y</strong>` as `<strong>` and introduces no `<b>` | guard (green) | must stay green after T1 |
| AC-3 | html-cleaner.spec.ts | Cleaner describe > AC-3: mixed input keeps exactly the input count of each tag outside h2-h4 | RED | T1 |
| AC-4 | master-system-prompt.spec.ts | Prompt describe > AC-4/FR-4: the old `<strong>`-reservation sentence is gone; and > AC-4/FR-4: [FORMAT] states `<b>` is the tag for all emphasis | RED (2 tests) | T2 |
| AC-5 | html-cleaner.spec.ts | Cleaner describe > AC-5: bold elements inside h2/h3/h4 are still unwrapped to plain text (heading hygiene) | guard (green) | must stay green after T1 |
| AC-6 | html-cleaner.spec.ts | Cleaner describe > AC-6: Fast-path composition finalizeTablesForDisplay(cleanHtmlStructure(input)) preserves both tags | RED | T1 |
| AC-7 | html-cleaner.spec.ts | Cleaner describe > AC-7: `<b class>` and `<strong class>` keep class and their own tag name | RED | T1 |
| AC-8 | master-system-prompt.spec.ts (in-prompt half) plus git diff | Prompt describe > AC-8/FR-8: the sentence after the replacement is byte-identical, newline included. Diff half: `git diff main` on the FROZEN file and optimizer.ts (no unit test) | RED (text half) | T2 |
| AC-9 | none (process) | `bash arch-guard.sh --rebaseline` then `bash arch-guard.sh` exits 0, same commit | n/a | T2 |
| AC-10 | existing `src/prompts/full-description.golden.spec.ts` via `npm run test:logic` | golden fixture regenerated, single-sentence diff | green now; goes RED after the swap until regenerated (expected, inside T2) | T2 |
| M1 | manual | Optimizer + generator run on `Knowledge/Issues/1/strong-tags.txt` | PENDING | release evidence |
