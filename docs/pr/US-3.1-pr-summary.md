---
artifact: pr_summary
story: US-3.1
version: 1
status: DRAFT
owner: so-pr-preparer
created_at: 2026-09-29T23:45:00Z
updated_at: 2026-09-29T23:45:00Z
supersedes: null
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

> **BLOCKING FINDING - do not open from this branch as it stands.** The T13-T18 work verified by
> every upstream report is partly UNCOMMITTED (see "Pre-flight record"). A PR built from HEAD
> `54e5fa6` would NOT contain the code the gate, verifier, security review and reconciliation
> actually evaluated. The body below describes the full verified state and is only accurate once
> that work is committed (AGENTS.md sections 7.8 / 13).

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
fields and spends fresh regeneration attempts (FR-10/FR-11).

## Why

Real-regeneration defects and QA rejections recorded in `docs/verification/US-3.1-implementation-report.md`
and `docs/catalog/US-3.1-pipeline-status.md`: docs shipped with a grounding failure unflagged,
brand-core headings dropped, over-long meta titles, and repair loops that gave up early.

## How the acceptance criteria were verified

Full matrix: `docs/tests/US-3.1-ac-test-matrix.md` (v7).
Reconciliation (`docs/reconciliation/US-3.1-reconciliation-report.md` v4): every AC-n cleared the
existence, naming and assertion checks; verdict PASS.

## Test plan

Carried from `docs/verification/US-3.1-quality-gate-report.md` v5 (run against the working tree):

- [x] `npm run lint` - exit 0
- [x] `npm test` - logic: 149 files / 3945 passed / 3 skipped (3948); components: 2 files / 23 passed
- [x] `npm run test:coverage` - exit 0, 149 files / 3945 passed / 3 skipped
- [x] `npm run build` - exit 0
- [x] `bash arch-guard.sh` - exit 0, ALL CHECKS PASSED (re-run during preparation: exit 0)
- [x] `npm run validate:harness` - exit 0

## Rules checked that nothing automates

- **Architecture Rule 2** (retrieval separate from generation): HOLDS (verification report v4, section 1).
- **STORE_REGISTRY** sole source of locale/currency: HOLDS. **Prompt-caching block separation**: HOLDS.
- **FROZEN files**: changed earlier in the branch by T8 (`task-a.ts`, `master-system-prompt.ts`,
  commit 1c02c89) and T10 (`task-b.ts`, commit 3d89c86), each with `.arch-guard-checksums`
  re-baselined in the same commit. Verification v4 covers only the T16-T18 delta (no frozen
  file). Reviewer: confirm the recorded section 9 approvals for T8/T10 in the pipeline status.

## Security

PASS, no blocking findings. N1 non-blocking (carried): more block-repair points reach the accepted
SafeHtml bypass surface. N2 observation, pre-existing: v4 discards a non-empty model `cta.heading`.
N3 non-blocking (cost only, this change): one extra LLM call on JSON-shaped field-repair output.

## Notes for the reviewer

- The branch is ~31 commits ahead of origin/main and includes interleaved `docs(US-3.1)`
  pipeline-status commits and one test-fix commit (c5e6139).
- `.env.example` / README: no setting added; unchanged.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Pre-flight record

| Check | Result |
|---|---|
| All four upstream reports opened, verdict `PASS` | Yes: quality gate v5, verification v4, security v4, reconciliation v4 all PASS (front-matter APPROVED) |
| Quality gate has real output for all six commands | Yes |
| No unresolved blocking security finding | Yes (N1, N3 non-blocking; N2 observation) |
| Every `AC-n` cleared all three reconciliation levels | Yes per reconciliation v4 |
| Commits contain only what `task_breakdown` named | **FAIL / cannot confirm**: T13-T18 production and spec changes are uncommitted (src/domain/description-doc.schema.ts, src/utils/repair-gate.ts, src/utils/repair-strategy.ts, their specs, plus new untracked src/utils/seo-metadata-shape.long-h1.spec.ts; 8 tracked src files +710/-3) and many docs/ artifacts untracked or modified |
| No fixup-run, no `--no-verify`, no phase batching | No batching seen; c5e6139 is a test-fix commit (minor, non-blocking); `--no-verify` not determinable from git history |
| Frozen-file change has same-commit re-baseline | Yes (1c02c89, 3d89c86) |
| No secret in any commit, including removed ones | No `sk-ant` hit and no `.env` file in branch history |
| `.env.example` current with placeholders | N/A, no setting added |
