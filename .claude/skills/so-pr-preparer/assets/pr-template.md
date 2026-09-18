---
artifact: pr_summary
story: {{US-x.y}}
version: 1
status: DRAFT
owner: so-pr-preparer
created_at: {{ISO-8601 UTC}}
updated_at: {{ISO-8601 UTC}}
supersedes: null
inputs_consumed:
  - key: implementation_report
    version: {{n}}
  - key: quality_gate_report
    version: {{n}}
  - key: verification_report
    version: {{n}}
  - key: security_review
    version: {{n}}
  - key: reconciliation_report
    version: {{n}}
open_decisions_blocking: false
---

# Drafted Pull Request — {{US-x.y}}

> **Not opened.** This is drafted content only. `so-pr-creator` opens the Pull Request, and
> only on a separate explicit instruction. Approving `HUMAN_PR_APPROVAL` did not carry that
> approval (AGENTS.md §10).

## Title

```
{{type}}({{scope}}): {{one line, imperative, English}}
```

## Body

```markdown
Closes {{US-x.y}} — {{Story title}}.

## What changed

{{Two or three sentences: the behaviour that is different now, not the edits.}}

## Why

{{The problem this solves, with the evidence — a failed generation, a review finding, a
corpus fixture, a report section.}}

## How the acceptance criteria were verified

| AC | Verified by | Result |
|---|---|---|
| AC-1 | `{{test file}}` › `{{test name}}` | pass |
| AC-2 | `{{test file}}` › `{{test name}}` | pass |

Full matrix: `docs/tests/{{US-x.y}}-ac-test-matrix.md`
Reconciliation: every criterion cleared existence, naming and assertion checks.

## Test plan

Real commands, real results — carried from the quality gate report.

- [x] `npm run lint` — clean
- [x] `npm test` — {{n}} logic files / {{n}} passed / {{n}} skipped; {{n}} component files / {{n}} passed
- [x] `npm run test:coverage` — global and per-directory floors held
- [x] `npm run build` — clean
- [x] `bash arch-guard.sh` — exit 0, five frozen checksums unchanged
- [{{x| }}] `npm run validate:harness` — {{n/a — harness untouched | 0 errors}}

## Rules checked that nothing automates

- **Architecture Rule 2** (retrieval separate from generation): {{how it was verified — the
  code paths read}}
- **AGENTS.md §4 criteria in play**: {{which, and how confirmed}}
- **FROZEN files**: {{none changed | named, with the recorded §9 approval}}

## Security

{{No findings — or the findings, classed blocking / non-blocking / observation, with
pre-existing ones separated from ones this change introduced.}}

## Notes for the reviewer

{{Anything that needs a human eye: a deliberate trade-off, a deferred Open Decision, a
fixture that was regenerated and why.}}

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Pre-flight record

| Check | Result |
|---|---|
| All four upstream reports opened, verdict `PASS` | |
| Quality gate has real output for all six commands | |
| No unresolved blocking security finding | |
| Every `AC-n` cleared all three reconciliation levels | |
| Commits contain only what `task_breakdown` named | |
| No fixup-run, no `--no-verify`, no phase batching | |
| Frozen-file change has same-commit re-baseline | |
| No secret in any commit, including removed ones | |
| `.env.example` current with placeholders | |
