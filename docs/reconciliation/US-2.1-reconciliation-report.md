---
artifact: reconciliation_report
story: US-2.1
version: 3
status: APPROVED
owner: so-reconciliation-reviewer
created_at: 2026-09-23T14:00:00Z
updated_at: 2026-09-23T14:00:00Z
supersedes: docs/reconciliation/US-2.1-reconciliation-report.md#2
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 2
  - key: ac_test_matrix
    version: 4
  - key: implementation_report
    version: 3
  - key: verification_report
    version: 3
open_decisions_blocking: false
---

# Reconciliation report - US-2.1 (HEAD 53a8f29)

Verdict: **PASS**. This is not human approval (AGENTS.md section 10).

Re-judgement after the v2 CHANGES_REQUIRED (`changes_required_tests`). The three level-3 gaps
(AC-1 hook invariant start, AC-2 killerSpecs 3-4, AC-4 applications 4-8) were closed by block V16 in
`src/domain/description-doc.schema.v4.spec.ts` (commit 2ddecf7). Between c8d91fa and HEAD the only
`src/`/`test/` change is that 88-line spec addition, so every other row is the code and tests v2
already judged.

## Verdict per criterion

L1 = matrix row exists, L2 = named test exists in the named file, L3 = test body would fail if the
criterion were violated.

| AC | L1 | L2 | L3 | Note |
|---|---|---|---|---|
| AC-1 | yes | yes | pass | V16 read in full (spec lines 250-291). Accept `<b>Name</b> — text`; reject at exactly `['hook']`: no leading `<b>`, `<strong>` opener (N11), en dash, hyphen-minus, em dash without spaces (both sides), `<b>` not opening; a 3.0 doc with the same bad hooks stays accepted (OD-2). Asserted with `toEqual(['hook'])`, so removing or loosening `HOOK_INVARIANT_START` (schema line 83, `addIssue` at 295) fails them. 40-85 range is prompt text by FR-17.3/FR-18; single `<p>` is a renderer invariant. |
| AC-2 | yes | yes | pass | V16 `it.each([2, 5])` rejects at exactly `['killerSpecs']`; `[3, 4]` accepted; matches `.min(3).max(4)` (schema line 176). The `<b>lead</b> — benefit` form is still asserted in `render-description.v4.spec.ts`. Hook "2-4 technical values" is prose-only by FR-2. |
| AC-3 | yes | yes | pass | unchanged from v2: one H2 / one `<ul>` / no table, 8 accepted / 9 rejected. 90-300 words prompt-only by spec. |
| AC-4 | yes | yes | pass | V16 `it.each([3, 9])` rejects at exactly `['applications.items']`; `[4, 8]` accepted; matches `.min(4).max(8)` (schema line 190). 80-250 words is prompt text by FR-17.3. |
| AC-5 | yes | yes | pass | unchanged: `<ol>` (4.0) vs `<ul>` (3.0), locale heading table, 10 locales. "Only when source has it" is prompt-text only, spec-declared. |
| AC-6 | yes | yes | pass | unchanged: array value rejected at path, comma-joined accepted, one H3 + table per category, no `<br>`. |
| AC-7 | yes | yes | pass | unchanged: template resolution for 23 store-locale pairs, Center 3D Print override, `doc.cta.heading` discarded. |
| AC-8 | yes | yes | pass | unchanged: no `<h1>` on 4.0 and 3.0; FAQ 3-5 pairs / 2-4 sentences / standalone (prompt-only by spec). |
| AC-9 | yes | yes | pass | unchanged: deterministic selector, adjacent-repeat < half, 5-run, all patterns, orchestrator wiring. |
| AC-10 | yes | yes | pass | unchanged: first eager / rest lazy over 20 pairs; per-locale separators incl. the N9 rows; iframe title escape-only. |
| AC-11 | yes | yes | pass | unchanged: `4.0` accepted, prompt asks for `"4.0"` with no `3.0` fallback, six cached 3.0 shapes parse. |

Level 2: every named test located. The 8 V16 test names in the matrix match the file; V16 ran green
(`vitest run ... -t V16`: 16 passed, the 24 other tests in the file merely filtered out). No
`.skip`/`.todo` in any named spec file (grep count 0 across the seven main files).

## Drift from the approved Specification

- **FR-1..FR-30**: each has an implementation or a stated prompt-only status; no requirement was
  silently dropped. FR-1's structural half (50ead2a) is now tested.
- **Behaviour changed during coding**: none found.
- **Scope added**: `src/prompts/optimizer.ts` (human decision 2 at HUMAN_PLAN_APPROVAL, recorded in
  the matrix); N11 `<b>`-only strictness is a recorded human decision. Neither is a surprise addition.
- **Criterion reinterpreted**: none. Prompt-only word ranges are asserted as prompt text, consistent
  with FR-17.3 / FR-18.
- **Story wrong**: no. No `story_drift`.

## Non-blocking

- AC-5 "emitted only when source has data" is asserted as prompt regex only (spec-declared
  prompt-only; R9 accepted).
- Working-tree US-1.1 rollback is outside US-2.1 and was sanctioned earlier.

## Precondition

SECURITY_REVIEW verdict PASS confirmed (working tree carries the security review artifact). This
PASS is not human approval; only `/so:approve` records that.
