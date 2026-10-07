---
artifact: test_strategy
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

# Test Strategy - US-6.2: Keep `<b>` and `<strong>` exactly as supplied

## Approach

Assertions are written from the acceptance criteria and the specification, never from captured output. Both new groups run under `npm run test:logic` (plain vitest, happy-dom). No Angular code is touched, so no component or service spec is needed.

| Layer | File | Runner | Covers |
|---|---|---|---|
| Cleaner (pure DOM logic) | `src/utils/html-cleaner.spec.ts` (new describe "US-6.2 bold tag preservation") | test:logic | AC-1, AC-2, AC-3, AC-5, AC-6, AC-7 |
| FROZEN master prompt text | `src/prompt-core/master-system-prompt.spec.ts` (new describe "US-6.2 emphasis tag wording") | test:logic | AC-4, and the in-prompt half of AC-8 (FR-8 trailing bytes) |

- AC-6 (Fast path) is tested as the exact composition `finalizeTablesForDisplay(cleanHtmlStructure(input))` that `cleanStructureOnly()` runs (`content-orchestrator.service.ts`, around line 1787). The orchestrator method itself is not driven: it only adds progress signals and a `setTimeout`; the composition is the whole behaviour.
- The prompt tests use the RAW exported string, not the whitespace-normalised copy, so the byte-identical trailing sentence (including the newline after "wrap") is really checked. Template-literal line breaks are LF at runtime irrespective of the file's CRLF checkout; the test hard-codes the LF and normalises nothing.
- Guards: AC-2 (`<strong>` already survives today) and AC-5 (heading hygiene unchanged) are green now by design. They pin behaviour the deletion must not break (FR-5, NFR-3) and are not evidence for the new behaviour. AC-1, AC-3, AC-6, AC-7, AC-4 and the FR-8 trailing-bytes test are the red ones.
- No fixture added: inline fixed strings only (no model, no randomness, no network).

## Not unit-tested (proof by other means)

| AC | Why no vacuous unit test | Proof |
|---|---|---|
| AC-8 (minimal FROZEN diff, optimizer.ts unmodified) | A diff property, not runtime behaviour. The in-prompt half (trailing sentences byte-identical) IS asserted. | `git diff main -- src/prompt-core/master-system-prompt.ts` shows only the one sentence; `git diff main --stat -- src/prompts/optimizer.ts` is empty |
| AC-9 (arch-guard baseline) | Checksum process | `bash arch-guard.sh --rebaseline`, then `bash arch-guard.sh` exits 0; only the master-system-prompt.ts checksum changes, same commit |
| AC-10 (existing specs follow new wording) | Process outcome | Golden `test/fixtures/golden/full-description-prompts.json` regenerated (single-sentence diff); `npm run test:logic` green |
| M1 (live model emits `<b>`) | Not provable by tests (A-1) | Manual Optimizer + generator run on `Knowledge/Issues/1/strong-tags.txt`; status PENDING |

## Expected interaction with the golden spec (for T2)

`src/prompts/full-description.golden.spec.ts` passes today (14/14) because the golden embeds the old sentence. It WILL go red the moment the FROZEN swap lands, until `full-description-prompts.json` is regenerated. This is expected and is resolved inside the single T2 commit (swap + golden regeneration + arch-guard rebaseline). It is not a test defect and no test is weakened to avoid it.

## Failure reasons expected before implementation

Cleaner: every `<b>` is rewritten to `<strong>` (no `<b>` in the output, `<strong>` count too high). Prompt: old sentence still present, new sentence absent.
