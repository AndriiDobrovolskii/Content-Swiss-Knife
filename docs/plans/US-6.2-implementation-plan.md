---
artifact: implementation_plan
story: US-6.2
version: 2
status: APPROVED
owner: so-planner
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-07T00:00:00Z
supersedes: docs/plans/US-6.2-implementation-plan.md#1
inputs_consumed:
  - key: story
    version: 3
  - key: specification
    version: 2
  - key: open_decisions
    version: 3
  - key: impact_analysis
    version: 2
---

# Implementation plan: US-6.2 - Keep `<b>` and `<strong>` exactly as supplied (v2)

v1 planned an `optimizer.ts` override and is obsolete; the human rejected that design (Story v3). This plan replaces it.

## Approach

Two edits plus tests. (1) Delete the "Replace all `<b>` tags with `<strong>` tags" block from `cleanHtmlStructure`
(`src/utils/html-cleaner.ts`, comment at line 164, block through ~169) with no compensating logic: both callers
(`optimize()`, `cleanStructureOnly()`) then pass `<b>` and `<strong>` through under their own names, `class` included.
(2) In the FROZEN `src/prompt-core/master-system-prompt.ts` (lines 475-477, `[FORMAT]`), swap one exact substring so the
prompt says `<b>` is the emphasis tag. `src/prompts/optimizer.ts` is not touched. The golden fixture is regenerated for the
ten affected one-sentence occurrences, the cleaner and prompt-text tests are added/updated, and arch-guard is rebaselined.
Live-model obedience is proven only by the human's manual run (M1).

## FROZEN-file position (AGENTS.md section 9)

Section 9 permission for `src/prompt-core/master-system-prompt.ts` is recorded in Story v3 (human, 2026-10-06). That is the
ONLY FROZEN file that may be edited. `task-a.ts`, `task-b.ts`, `task-c.ts`, `output-validator.ts` stay untouched. No other
FROZEN file is needed by this plan; if the builder finds one is needed, STOP and report. A sibling-file route is not
available because the sentence lives in the FROZEN file's own constant and the text sent to all pipelines is that constant.

## Design decisions

### D1. Cleaner: pure deletion (FR-1, FR-2, FR-3, FR-6, FR-7)
Remove the `b -> strong` block only. No `strong -> b` normalisation, no class handling, no new code. Heading hygiene
(lines 118-120, unwraps `strong, b, span` in h2/h3/h4) stays and still runs, so FR-5 holds unchanged. Microdata strip
(279-283) still drops `itemprop` (OD-8, accepted). `class` survives because the removed block was the only thing building a
fresh element from `innerHTML`; with it gone, the original element and its attributes are untouched.

### D2. FROZEN prompt: exact-substring swap (FR-4, FR-8)
Old text (byte-exact, newline after "500", en dash U+2013 in "2–3"):
```
Reserve <strong> for brands / main model / core USPs at a density of 2–3 per 500
characters maximum; use <b> for inline spec scannability.
```
New text: `Use <b> for all emphasis (brands, models, specifications).`
The following ` Emit only tags that wrap\ncontent. Keep a high text-to-HTML ratio.` is byte-identical, including its line
break; the resulting source reads `...specifications). Emit only tags that wrap` / `content. Keep a high text-to-HTML ratio.`
Execution: an exact string replacement (Edit with the full old string, must match once) - never retype the surrounding
lines. Verify with `git diff --stat` (1 file, only lines 475-477 region) and `git diff -U0` showing nothing else. The density
cap is dropped with the sentence (A-4).

### D3. Golden regeneration (FR-10, A-5)
`full-description.golden.spec.ts` is the only byte comparison. There is no generator script in the repo, so regenerate with a
throwaway script in the scratchpad (not committed): load `test/fixtures/golden/full-description-prompts.json`, replace the old
sentence with the new sentence in every string value, write back with identical formatting (same indent, same trailing newline,
no `\u` re-escaping drift). Do NOT recapture by re-running the builders (that would hide unintended prompt changes).
Acceptance: `git diff test/fixtures/golden/full-description-prompts.json` shows exactly 10 changed sentences (cases doc/expert3d,
doc/expert3d+hook, doc/c3d, html/expert3d, html/legacy, html/legacy+lang, html/c3d+customTemplate, c/expert3d-es, c/eu-en,
c/us-uk); the two translate cases are unchanged; `src/prompts/task-a-doc.ts:96` and
`simplified-template-blocks.ts:127` variants stay byte-identical (A-6). Then `npx vitest run src/prompts/full-description.golden.spec.ts`
is green against the unmodified builders.

### D4. Test placement (FR-1..FR-8)
- `src/utils/html-cleaner.spec.ts` (vitest, existing file): FR-1 (`<b>` kept, no `<strong>`), FR-2 (mirror), FR-3 (mixed, counts
  equal outside headings), FR-5 (bold unwrapped in h2/h3/h4 to text, both tags), FR-7 (`class="highlight"` kept on both,
  tag names kept), and FR-6 as the Fast-path composition `finalizeTablesForDisplay(cleanHtmlStructure(raw))`
  with `<b>X</b>` and `<strong>Y</strong>`. No existing spec exercises `cleanHtmlStructure` callers, so there is no service
  spec to extend; the composition test mirrors what `cleanStructureOnly()` runs and avoids Angular DI.
- `src/prompt-core/master-system-prompt.spec.ts` (vitest, existing): FR-4 asserted against exported `MASTER_SYSTEM_PROMPT`:
  old sentence absent (check both the `Reserve <strong> for brands` fragment and the density cap), new sentence present inside
  the `[FORMAT]` section (slice from `[FORMAT]` to the next section marker), and the trailing
  `Emit only tags that wrap\ncontent. Keep a high text-to-HTML ratio.` still present immediately after.
- FR-8 / FR-9 are diff/arch-guard checks, not unit tests (NFR-1): `git diff main -- src/prompts/optimizer.ts` empty,
  `git diff --stat` shows only the permitted FROZEN file, `bash arch-guard.sh` exit 0.
- Existing tests asserting the removed wording (grep `Reserve <strong>`/`2–3 per 500` in `src/**/*.spec.ts` during
  implementation) are updated to the new wording, none deleted or weakened (FR-10).

### D5. Chain agreement (prompt -> schema -> renderer -> validator)
No schema, renderer or validator change. Master prompt now says `<b>`; the HTML path's cleaner no longer rewrites it; the
Doc pipeline renders its own tags and is unaffected. `output-validator.ts` (FROZEN, untouched) already tolerates either tag.
AGENTS.md section 4 criterion in play: figcaption `<b>` lead-in; the new wording is consistent with it and enforcement stays
in the prompt (OD-9). Other section 4 criteria stay covered by existing suites (NFR-3).

### D6. Payload and caching
`PromptPayload` shape unchanged; `systemBlocks` stay separate from `userContent`. The cached master block changes by one
sentence, so the first request per store after deploy is a cache miss (one-time cost, NFR-2).

Domain model, Angular surface, server/store: not applicable (no change).

## Files to create / modify
- modify `src/utils/html-cleaner.ts`: delete the b->strong block.
- modify FROZEN `src/prompt-core/master-system-prompt.ts`: the D2 swap only (section 9 permission in Story v3).
- modify `test/fixtures/golden/full-description-prompts.json`: 10 sentence replacements.
- modify `src/utils/html-cleaner.spec.ts`, `src/prompt-core/master-system-prompt.spec.ts`: new tests; update any spec asserting the old wording.
- modify `.arch-guard-checksums`: rebaseline.
- not modified: `src/prompts/optimizer.ts`, `task-a-doc.ts`, `simplified-template-blocks.ts`, stale comments (A-6).

## Commit order (tree green at each commit)
1. Commit 1 (cleaner): deletion + cleaner tests (FR-1..3, 5..7) in the same commit. Green: nothing else depends on it. If tests were
   written first (TEST_WRITING stage), they fail until this commit; that is the TDD gate, not a green-tree violation on the branch history.
2. Commit 2 (FROZEN prompt): master-system-prompt.ts swap + regenerated golden + master prompt FR-4 tests + any updated old-wording specs +
   `.arch-guard-checksums`. These MUST be together: the golden spec fails until the JSON matches the new prompt, and arch-guard fails
   until the checksum is recorded (section 9: baseline in the same commit as the edit).
Rebaseline step: before running `bash arch-guard.sh --rebaseline`, run `git diff --stat` and `git status`; the command rebaselines ALL
five FROZEN files, and main's baseline is known to lag (memory: task-a.ts/task-c.ts). After it, `git diff .arch-guard-checksums` must show
exactly one changed line, for master-system-prompt.ts (FR-9). If any other checksum changes, STOP: revert the baseline file and report
rather than commit another file's drift.

## Validation strategy
- vitest (`npm run test:logic`): cleaner unit tests, master-prompt text tests, golden byte spec. Component runner (`npm run test:components`)
  has no new category; it must still pass (NFR-3).
- Diff checks: `git diff main -- src/prompts/optimizer.ts` empty; FROZEN diff limited to D2; golden diff exactly 10 sentences.
- Gate: lint, both test runners, coverage, build, `bash arch-guard.sh` (exit 0).
- Manual release evidence M1 (owned by the human operator, NOT run by this pipeline): run Optimizer and generator on
  `Knowledge/Issues/1/strong-tags.txt` and confirm `<b>` stays `<b>` and new emphasis is `<b>`. Do not record as executed until the human does.

## Risks
- A-1: the live model may still emit `<strong>` or ignore the new wording; unprovable by tests; surfaces only in M1 / operator reports.
- A-6: `task-a-doc.ts:96` and `simplified-template-blocks.ts:127` still say "Reserve `<strong>`" in the doc-pipeline prompt, which now
  contradicts the master clause there. Out of scope; may confuse the model on that path; visible in doc-pipeline output.
- OD-9: figcaption `<strong>` lead-in is not normalised on the Optimizer path; accepted.
- Density cap dropped (A-4): output may carry more bold; visible as heavier emphasis in outputs.
- Cache miss on first calls after deploy (cost/latency only).
- `--rebaseline` collateral drift in other FROZEN checksums (mitigated by the one-line diff check).
- Golden edit executed by text replace could drift in escaping/newlines; mitigated by the 10-sentence diff check and the byte spec itself.
- Cleaner no longer converts, so old `<b>` in stored/third-party HTML now stays `<b>` (intended, FR-1).

## Rejected alternatives
- Optimizer override clause in `optimizer.ts` (v1): rejected by the human; also only reached the Optimizer, not Task A/C.
- Cleaner `strong -> b` normalisation (inverse rewrite): contradicts the "exactly as supplied" requirement and FR-2.
- Rewrite the old sentence more extensively (keep density cap / keep `<strong>` for brands): wider FROZEN diff than FR-8 allows.
- Recapturing the golden by running the builders: would mask unintended prompt changes; replacement of the 10 sentences is auditable.
- Fixing `task-a-doc.ts`/`simplified-template-blocks.ts` too: scope creep (A-6), and `task-a-doc.ts` relationship to FROZEN `task-a.ts` is untested here.

## Traceability
- FR-1, FR-2, FR-3, FR-7: D1 + `html-cleaner.spec.ts` (commit 1). FR-5: D1 (unchanged code) + regression test. FR-6: D1 + D4 composition test.
- FR-4: D2 + D4 prompt-text tests. FR-8: D2 + diff checks. FR-9: rebaseline step. FR-10: D3 + D4 updates.
- NFR-1..5: validation strategy, D6, FROZEN-file position.
