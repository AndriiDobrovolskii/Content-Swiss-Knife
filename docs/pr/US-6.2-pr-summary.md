---
artifact: pr_summary
story: US-6.2
version: 1
status: DRAFT
owner: so-pr-preparer
created_at: 2026-10-07T08:00:00Z
updated_at: 2026-10-07T08:00:00Z
supersedes: null
inputs_consumed:
  - key: implementation_report
    version: 1
  - key: quality_gate_report
    version: 1
  - key: verification_report
    version: 1
  - key: security_review
    version: 1
  - key: reconciliation_report
    version: 1
open_decisions_blocking: false
---

# Drafted Pull Request — US-6.2

> **Not opened.** This is drafted content only. `so-pr-creator` opens the Pull Request, and
> only on a separate explicit instruction. Approving `HUMAN_PR_APPROVAL` did not carry that
> approval (AGENTS.md §10).

## Before the PR can be opened (commit hygiene, AGENTS.md §7.8 and §13)

The branch carries only the two implementation commits. All US-6.2 pipeline documents are
currently **uncommitted** and must be committed on this branch before a PR is opened (otherwise
the PR would cite evidence that is not in it):

- modified: `docs/catalog/stories.yaml`, `docs/workflow/active-story.yaml`,
  `docs/workflow/history.jsonl`, `docs/workflow/workflow-state.yaml`
- untracked: `docs/stories/`, `docs/specifications/`, `docs/impact-analysis/`, `docs/plans/`
  (plan + task breakdown), `docs/reviews/` (spec, plan, security), `docs/tests/` (strategy,
  matrix, generation report), `docs/verification/` (implementation, quality gate,
  verification), `docs/reconciliation/`, `docs/decisions/`, `docs/evidence/`,
  `docs/catalog/US-6.2-pipeline-status.md`, and this file `docs/pr/US-6.2-pr-summary.md`

Every docs commit must end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
Commit them as docs-only commit(s) (no code, no `--no-verify`). This skill did not commit them.

## Title

```
feat(US-6.2): keep <b> and <strong> as supplied and make the master prompt use <b> for all emphasis
```

## Body

```markdown
Closes US-6.2 — Keep `<b>` and `<strong>` exactly as supplied.

## What changed

`cleanHtmlStructure` no longer rewrites `<b>` into `<strong>`: both tags (and their attributes,
e.g. `class`) now pass through exactly as supplied. The master system prompt's FORMAT section now
says "Use <b> for all emphasis (brands, models, specifications)" instead of reserving `<strong>`
for brands/USPs. Heading hygiene (bold unwrapped inside h2-h4) is unchanged.

## Why

The cleaner silently turned every `<b>` into `<strong>`, so the output did not match the supplied
or intended markup, and the prompt told the model to mix both tags. Two small commits fix both
ends: T1 removes the 7-line conversion block (no compensating logic); T2 swaps one prompt
sentence.

## How the acceptance criteria were verified

| AC | Verified by | Result |
|---|---|---|
| AC-1 | `src/utils/html-cleaner.spec.ts` › AC-1: keeps `<b>X</b>` as `<b>` and introduces no `<strong>` | pass |
| AC-2 | `src/utils/html-cleaner.spec.ts` › AC-2: keeps `<strong>Y</strong>` as `<strong>` and introduces no `<b>` | pass |
| AC-3 | `src/utils/html-cleaner.spec.ts` › AC-3: mixed input keeps exactly the input count of each tag outside h2-h4 | pass |
| AC-4 | `src/prompt-core/master-system-prompt.spec.ts` › AC-4/FR-4 (two tests: old sentence gone; [FORMAT] states `<b>` for all emphasis) | pass |
| AC-5 | `src/utils/html-cleaner.spec.ts` › AC-5: bold elements inside h2/h3/h4 are still unwrapped | pass |
| AC-6 | `src/utils/html-cleaner.spec.ts` › AC-6: Fast-path composition preserves both tags | pass |
| AC-7 | `src/utils/html-cleaner.spec.ts` › AC-7: `<b class>` and `<strong class>` keep class and tag name | pass |
| AC-8 | `src/prompt-core/master-system-prompt.spec.ts` › AC-8/FR-8 byte-identical, plus diff review (one hunk, -2/+1 lines; `optimizer.ts` untouched) | pass |
| AC-9 | process: `.arch-guard-checksums` re-baselined in the same commit (a9ede90), one line changed; `bash arch-guard.sh` exit 0 | pass |
| AC-10 | `src/prompts/full-description.golden.spec.ts` (14 passed) with the regenerated golden fixture: 10 one-sentence replacements | pass |

Full matrix: `docs/tests/US-6.2-ac-test-matrix.md`
Reconciliation: every criterion cleared existence, naming and assertion checks
(`docs/reconciliation/US-6.2-reconciliation-report.md`, PASS).

Manual run M1 (Optimizer + generator on `Knowledge/Issues/1/strong-tags.txt`, the only evidence
of live-model obedience to the new sentence): the approver recorded in the workflow history that
they performed it and that it works. This is an approver statement and was not independently
verified; the generated reports still list M1 as pending because they predate that approval.

## Test plan

Real commands, real results — carried from the quality gate report (HEAD a9ede90).

- [x] `npm run lint` — clean (`tsc --noEmit`, exit 0)
- [x] `npm test` — 164 logic files / 4578 passed / 3 skipped; 2 component files / 32 passed
- [x] `npm run test:coverage` — floors held; All files 93.91 / 88.01 / 95.19 / 94.43 (stmts/branches/funcs/lines); `vitest.config.ts` unchanged
- [x] `npm run build` — clean (only the three known CommonJS warnings)
- [x] `bash arch-guard.sh` — exit 0, ALL CHECKS PASSED; the one frozen checksum changed is re-baselined in the same commit
- [x] `npm run validate:harness` — 0 errors (22 stages, 23 artifacts, 16 skills)

## Rules checked that nothing automates

- **Architecture Rule 2** (retrieval separate from generation): verifier read both source
  diffs; no retrieval, provider or model call added. Holds, not in play.
- **AGENTS.md §4 criteria in play**: no `<strong>` rule exists in §4; the figcaption `<b>`
  lead-in is now preserved rather than mutated. No criterion weakened. Prompt caching:
  `systemBlocks` structure unchanged, one cache rewrite after deploy.
- **FROZEN files**: ONE frozen file edited, `src/prompt-core/master-system-prompt.ts`, under the
  human's explicit AGENTS.md §9 permission recorded in Story v3 (2026-10-06). One sentence
  replaced; `.arch-guard-checksums` re-baselined in the same commit (exactly one changed line).
  No other frozen file touched. Reviewer: please confirm this against §9.

## Security

No blocking findings. One non-blocking finding introduced by this change (NB-1): `<b>` and
`<strong>` attributes now pass through `cleanHtmlStructure` unsanitised. Fast-path and
optimize output is rendered via `safeHtml` (the existing bypass) with no later sanitiser, so an
`onclick` on a `<b>` would run in the preview. Previously `<b>` attributes were dropped by the
rewrite. This extends a pre-existing class (`cleanHtmlStructure` already passes `onclick` on
`<p>`, `<span>`, `<strong>`); exposure is self-XSS, as the Fast-path input is HTML the operator
pastes into their own local tool. Suggested follow-up: run `sanitizeUntrustedHtml` on Fast-path
output before display. Pre-existing observations (not introduced): unrestricted `cors()` on the
local proxy.

## Notes for the reviewer

- Follow-ups outside the ACs (not fixed here): `src/prompts/task-a-doc.ts:96`,
  `src/prompts/simplified-template-blocks.ts:127`, `src/prompt-core/constants.ts:1189-1190` and
  `src/prompts/copywriter.ts:53` still say "Reserve `<strong>`" / "use `<strong>`", so the Doc
  pipeline receives contradictory emphasis guidance. Output stays valid since both tags are now
  preserved. FROZEN `output-validator.ts` counts only literal `<b>`; accepted in the Story.
- The builder's first full test run showed 1 failure of 4577 that was never named and was not
  reproduced in three later full runs (all 4578 passed). Cause unknown, likely a load flake,
  unproven.
- The golden fixture was regenerated: 10 entries, each a pure swap of the old sentence for the new.
- `.env.example` is unchanged; no setting was added or renamed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Pre-flight record

| Check | Result |
|---|---|
| All four upstream reports opened, verdict `PASS` | Yes: quality gate PASS, verification PASS, security PASS (NB-1 non-blocking), reconciliation PASS |
| Quality gate has real output for all six commands | Yes |
| No unresolved blocking security finding | Yes (none blocking) |
| Every `AC-n` cleared all three reconciliation levels | Yes, AC-1..AC-10 |
| Commits contain only what `task_breakdown` named | Yes: 6 files, matching T1 and T2 |
| No fixup-run, no `--no-verify`, no phase batching | Two complete commits, one Story; no `--no-verify` evidence (cannot be proven from history alone) |
| Frozen-file change has same-commit re-baseline | Yes, a9ede90, one line |
| No secret in any commit, including removed ones | Yes: added-line scan found none; only two commits on branch |
| `.env.example` current with placeholders | Yes: unchanged, no setting added |
| Docs committed | NO: pipeline docs are uncommitted and must be committed before the PR is opened |
