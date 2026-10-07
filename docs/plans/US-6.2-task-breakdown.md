---
artifact: task_breakdown
story: US-6.2
version: 2
status: ARCHIVED
owner: so-implementation-planner
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-07T00:00:00Z
supersedes: docs/plans/US-6.2-task-breakdown.md#1
inputs_consumed:
  - key: story
    version: 3
  - key: specification
    version: 2
  - key: impact_analysis
    version: 2
  - key: implementation_plan
    version: 2
open_decisions_blocking: false
---

# Task breakdown: US-6.2 (keep `<b>` and `<strong>` exactly as supplied) - v2

v1 planned an `optimizer.ts` override and is obsolete (the human rejected that design, Story v3). Two builder tasks, two
commits, plus a pending manual release check M1 that is NOT a builder task. Both builder tasks run in `test:logic` (vitest).

## Execution order

`T1 -> T2`. T1 and T2 share no symbol and are independent (either order is technically valid); T1 goes first because it
is the low-risk, non-FROZEN change and the plan fixes this commit order. Then the gate, then M1 (human).

## Risk-first rationale

The riskiest step is the FROZEN edit (T2), but it cannot land safely before its own golden and checksum, and it is
independent of T1. T1 is first only because it is cheap and fixes the order given in plan v2. The riskiest assumption (A-1,
live model obedience) is provable by no task and is isolated in manual check M1.

---

## T1 - Delete the `<b>` to `<strong>` rewrite from `cleanHtmlStructure`

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none |
| **FROZEN** | no (`html-cleaner.ts` is not on the AGENTS.md section 9 list) |

### Files
- modify `src/utils/html-cleaner.ts`: delete the "Replace all `<b>` tags with `<strong>` tags" block (comment ~line 164, block through ~169). Nothing else; no compensating logic.
- modify `src/utils/html-cleaner.spec.ts`: new cases (written by TEST_WRITING, failing at pickup).

### Tests (runner: `test:logic`, vitest)
`src/utils/html-cleaner.spec.ts`: FR-1 (`<b>` kept, no `<strong>`), FR-2 (mirror), FR-3 (mixed, counts equal outside headings), FR-5 (bold unwrapped to text in h2/h3/h4, both tags), FR-7 (`class="highlight"` and tag name kept on both), FR-6 as the Fast-path composition `finalizeTablesForDisplay(cleanHtmlStructure(raw))` with `<b>X</b>` and `<strong>Y</strong>`. Turn them green without weakening (AGENTS.md section 7.7).

### Acceptance check
- New FR-1/2/3/5/6/7 cases red before the edit, green after; existing `html-cleaner.spec.ts` suites stay green.
- `git diff --stat` shows only `html-cleaner.ts` and its spec; `git diff` of `html-cleaner.ts` is a pure deletion.
- `npm run lint`, `npm test` (both runners), `npm run build` green; `bash arch-guard.sh` exit 0 with `.arch-guard-checksums` unchanged.

### Commit
One commit: cleaner deletion + its tests.

---

## T2 - FROZEN master prompt emphasis-sentence swap, golden regeneration, rebaseline

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | none technically (commit order after T1 per plan v2) |
| **FROZEN** | YES: `src/prompt-core/master-system-prompt.ts` |

### AGENTS.md section 9 note (first step, before any edit)
The human's explicit section 9 permission to edit `src/prompt-core/master-system-prompt.ts` is recorded in Story v3
(2026-10-06). That is the ONLY FROZEN file that may be edited. If any other FROZEN file (`task-a.ts`, `task-b.ts`,
`task-c.ts`, `output-validator.ts`) would be needed, STOP and report; do not edit it and do not route around it.

### Files
- modify FROZEN `src/prompt-core/master-system-prompt.ts` (`[FORMAT]`, lines ~475-477): exact-substring replacement (Edit with the full old string, must match exactly once; never retype surrounding lines).
  Old (newline after "500", en dash U+2013 in "2-3"): `Reserve <strong> for brands / main model / core USPs at a density of 2–3 per 500` + newline + `characters maximum; use <b> for inline spec scannability.`
  New: `Use <b> for all emphasis (brands, models, specifications).`
  The following ` Emit only tags that wrap` / `content. Keep a high text-to-HTML ratio.` stays byte-identical.
- modify `test/fixtures/golden/full-description-prompts.json`: regenerated with a throwaway script in the scratchpad (not committed): load the JSON, replace the old sentence with the new one in every string value, write back with identical indent, trailing newline and no `\u` re-escaping drift. Do NOT recapture by re-running prompt builders.
- modify `src/prompt-core/master-system-prompt.spec.ts`: FR-4 / FR-8 prompt-text tests (written by TEST_WRITING, failing at pickup).
- modify any `src/**/*.spec.ts` asserting the old wording (grep `Reserve <strong>` and `2–3 per 500`): update to the new wording; never delete or weaken (FR-10).
- modify `.arch-guard-checksums` via `bash arch-guard.sh --rebaseline`.
- NOT touched: `src/prompts/optimizer.ts`, `src/prompts/task-a-doc.ts`, `src/prompts/simplified-template-blocks.ts` (A-6), stale comments.

### Tests (runner: `test:logic`, vitest)
- `src/prompt-core/master-system-prompt.spec.ts`: old fragments (`Reserve <strong> for brands`, density cap) absent; new sentence present inside the `[FORMAT]` section; `Emit only tags that wrap\ncontent. Keep a high text-to-HTML ratio.` still immediately follows.
- `src/prompts/full-description.golden.spec.ts`: green against unmodified builders and the regenerated fixture.

### Acceptance check
- `git diff --stat` for the FROZEN file: 1 file, only the lines 475-477 region; `git diff -U0` shows nothing else.
- `git diff test/fixtures/golden/full-description-prompts.json` shows exactly 10 changed sentences (doc/expert3d, doc/expert3d+hook, doc/c3d, html/expert3d, html/legacy, html/legacy+lang, html/c3d+customTemplate, c/expert3d-es, c/eu-en, c/us-uk); the two translate cases unchanged.
- Before rebaselining, run `git diff --stat` and `git status`. After `bash arch-guard.sh --rebaseline`, `git diff .arch-guard-checksums` shows EXACTLY ONE changed line, for `master-system-prompt.ts` (FR-9). If any other checksum changes, STOP: revert the baseline file and report (main's baseline is known to lag, memory note).
- `git diff main -- src/prompts/optimizer.ts` is empty; `git diff --stat` shows no FROZEN file other than the permitted one.
- `npm run lint`, `npm test` (both runners), `npm run test:coverage`, `npm run build` green; `bash arch-guard.sh` exit 0.

### Commit
One commit containing all of the above (the golden spec fails until the JSON matches the prompt, and arch-guard fails until the checksum is recorded, so they cannot be split).

---

## M1 - Manual release evidence (NOT a builder task)

Owner: the human operator. Status: PENDING. Run the Optimizer and the generator on `Knowledge/Issues/1/strong-tags.txt`; confirm `<b>` stays `<b>`, `<strong>` stays `<strong>`, and new emphasis is `<b>`. No builder, gate or reviewer may claim it done; it is recorded only when the human records it. It is the only evidence for A-1 (live model obedience).

---

## Coverage (both directions)

| Item | Task |
|---|---|
| FR-1, FR-2, FR-3 | T1 |
| FR-4 | T2 |
| FR-5 | T1 (unchanged code, regression test) |
| FR-6 | T1 (Fast-path composition test) |
| FR-7 | T1 |
| FR-8 | T2 (substring swap + diff checks) |
| FR-9 | T2 (rebaseline, one-line diff) |
| FR-10 | T2 (golden regeneration, old-wording specs updated) |
| NFR-1 | T1, T2 (deterministic unit tests, diff checks) |
| NFR-2 | T2 (one-sentence change; no systemBlocks change); none otherwise by design |
| NFR-3 | T1, T2 (full gate on each commit) |
| NFR-4 | T2 (FROZEN section 9 note, STOP rule, diff check) |
| NFR-5 | none by design (no retrieval/secret code touched) |
| Plan D1 | T1 |
| Plan D2 | T2 |
| Plan D3 | T2 |
| Plan D4 | T1, T2 |
| Plan D5 | none by design (no schema/renderer/validator change) |
| Plan D6 | none by design (payload unchanged; cache miss is one-time cost) |
| Manual A-1 evidence | M1 (human, PENDING) |

Every task maps to plan items and FRs; no task maps to nothing.
