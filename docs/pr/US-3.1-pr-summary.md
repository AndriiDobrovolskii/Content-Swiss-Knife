---
artifact: pr_summary
story: US-3.1
version: 2
status: DRAFT
owner: so-pr-preparer
created_at: 2026-09-29T23:45:00Z
updated_at: 2026-09-30T00:30:00Z
supersedes: docs/pr/US-3.1-pr-summary.md#1
inputs_consumed:
  - key: implementation_report
    version: 5
  - key: quality_gate_report
    version: 5
  - key: verification_report
    version: 4
  - key: security_review
    version: 4
  - key: reconciliation_report
    version: 4
open_decisions_blocking: false
---

# Drafted Pull Request - US-3.1

> **Not opened.** Drafted content only. `so-pr-creator` opens the Pull Request, and only on a
> separate explicit instruction. Approving `HUMAN_PR_APPROVAL` did not carry that approval
> (AGENTS.md section 10).

> Re-run (v2): v1 was CHANGES_REQUIRED only because T13-T18 and the docs artifacts were
> uncommitted. They are now committed (HEAD `3e76515`); that blocker is cleared.

## Title

```
fix(US-3.1): QA-gate brand-core fixes - repair-ladder, grounding retry, heading/SEO shape rules
```

## Body

```markdown
Closes US-3.1 - QA gate / brand-core fixes.

## What changed

The QA gate now retries grounding through a provider-agnostic backoff helper, treats
`specs-grounding-disabled` as an error that also blocks ZIP/plain-text export, and repairs
schema-invalid Task-A docs field-by-field instead of full regeneration. Heading and SEO rules are
tightened (brand-core-missing restructure, `[HEADING FORM]` disambiguation, meta_title/h1 shape
validation with a deterministic long-h1 fallback), and the repair ladder now retries missing
fields and spends fresh regeneration attempts (FR-10/FR-11), rejects a JSON-envelope answer to a
field-scoped repair (one bounded retry), keeps the last complete word on a word-boundary clip, and
makes `cta.heading`'s non-empty requirement schemaVersion-conditional.

## Why

Real-regeneration defects and QA rejections recorded in `docs/verification/US-3.1-implementation-report.md`
and `docs/catalog/US-3.1-pipeline-status.md`: docs shipped with a grounding failure unflagged,
brand-core headings dropped, over-long meta titles, and repair loops that gave up early.

## How the acceptance criteria were verified

Full matrix: `docs/tests/US-3.1-ac-test-matrix.md` (v7).
Reconciliation (`docs/reconciliation/US-3.1-reconciliation-report.md` v4): every AC-n cleared the
existence, naming and assertion checks; verdict PASS.

## Test plan

Carried from `docs/verification/US-3.1-quality-gate-report.md` v5; the orchestrator re-ran the full
gate on the committed tree (HEAD `3e76515`) with the same results:

- [x] `npm run lint` - exit 0
- [x] `npm test` - logic: 149 files / 3945 passed / 3 skipped (3948); components: 2 files / 23 passed
- [x] `npm run test:coverage` - exit 0, 149 files / 3945 passed / 3 skipped
- [x] `npm run build` - exit 0
- [x] `bash arch-guard.sh` - exit 0, ALL CHECKS PASSED
- [x] `npm run validate:harness` - exit 0

## Rules checked that nothing automates

- **Architecture Rule 2** (retrieval separate from generation): HOLDS (verification report v4, section 1).
- **STORE_REGISTRY** sole source of locale/currency: HOLDS. **Prompt-caching block separation**: HOLDS.
- **FROZEN files**: changed earlier in the branch by T8 (`task-a.ts`, `master-system-prompt.ts`,
  commit 1c02c89) and T10 (`task-b.ts`, commit 3d89c86), each with `.arch-guard-checksums`
  re-baselined in the same commit. Verification v4 covers only the T16-T18 delta (no frozen
  file). Reviewer: the section 9 approval for T8/T10 is cited only in those commit messages
  (relayed in-session; Task Breakdown v6 T8, Plan v7 D10/D11, OD-3/OD-7/OD-9). No durable approval
  record was found in `docs/catalog/US-3.1-pipeline-status.md`. UNVERIFIED - please confirm.

## Security

PASS, no blocking findings. N1 non-blocking (carried): more block-repair points reach the accepted
SafeHtml bypass surface. N2 observation, pre-existing: v4 discards a non-empty model `cta.heading`.
N3 non-blocking (cost only, this change): one extra LLM call on JSON-shaped field-repair output.

## Notes for the reviewer

- 36 commits ahead of `origin/main`, all in `type(US-3.1 ...)` / `docs(US-3.1)` format, with
  interleaved `docs(US-3.1)` pipeline-status commits and one test-fix commit (c5e6139).
- T13-T18 landed as a16ddbd (T13/T14), 4a7f806 (T15), 2ae4236 (their specs), 33e4fc7 (T16),
  e6d4b05 (T17), 2199752 (T18).
- Non-blocking: 2ae4236 commits specs after the code they cover (a16ddbd, 4a7f806), so those two
  production commits are not test-covered at their own SHA.
- Non-blocking: 3e76515 is one large docs commit (23 files) with a long subject line.
- `.env.example` / README: no setting added; unchanged.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Pre-flight record (v2, against committed ref 3e76515)

| Check | Result |
|---|---|
| All four upstream reports opened, verdict `PASS` | Yes: quality gate v5, verification v4, security v4, reconciliation v4 all PASS (front-matter APPROVED) |
| Quality gate has real output for all six commands | Yes; re-run on the committed tree by the orchestrator, all exit 0 |
| Architecture Rule 2 addressed by verifier | Yes (verification v4, section 1) |
| No unresolved blocking security finding | Yes (N1, N3 non-blocking; N2 observation) |
| Every `AC-n` cleared all three reconciliation levels | Yes per reconciliation v4 |
| Commits contain only what `task_breakdown` named | Yes: `git diff origin/main..HEAD` outside `docs/` and `src/` is `test/fixtures/**` and `.arch-guard-checksums` only; T16-T18 commits touch exactly the files named for them |
| No fixup-run, no `--no-verify`, no phase batching | No fixup/wip/typo commits; one Story only; `--no-verify` not determinable from history (non-blocking) |
| Frozen-file change has same-commit re-baseline | Yes: 1c02c89 (T8), 3d89c86 (T10) each modify `.arch-guard-checksums` |
| Frozen-file section 9 approval durably recorded | UNVERIFIED (commit-message citation only); reviewer note, non-blocking |
| No secret in any commit, including removed ones | No `sk-ant` / `API_KEY=` diff hit, no `.env` file in the branch diff |
| `.env.example` current with placeholders | N/A, no setting added |
| Working tree | Only `docs/workflow/workflow-state.yaml` modified (orchestrator's); nothing pushed, opened or merged |
