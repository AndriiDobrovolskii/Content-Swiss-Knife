---
name: so-pr-preparer
description: >
  Drafts the Pull Request title and body once the quality gate, implementation verification,
  security review and AC reconciliation have all reported PASS — verifying all four actually
  did, checking commit hygiene against AGENTS.md §7.8 and §13, confirming .env.example is
  current if a setting was added, and producing the test-plan checklist. Use when a Story has
  cleared HUMAN_PR_APPROVAL and the Pull Request content needs writing ("prepare the PR for
  US-x.y"). Owns the PR_PREPARATION stage and the pr_summary artifact. It drafts only: it does
  NOT push, open or merge anything, and it runs no git or gh command that writes. Pushing and
  opening the Pull Request is so-pr-creator's, on a separate explicit human instruction.
---

# so-pr-preparer

## Purpose

Write what the Pull Request will say, and check the work is actually in a state to be
proposed.

This skill never touches the remote. It produces one artifact — the drafted title and body —
that `so-pr-creator` later uses **verbatim**, and only on a separate explicit human
instruction (AGENTS.md §1: propose, never execute unilaterally on shared state).

## Operational Contract

```
Precondition:     HUMAN_PR_APPROVAL approved.
Input Artifacts:  story, specification, implementation_report, quality_gate_report,
                  verification_report, security_review, reconciliation_report.
Output Artifacts: pr_summary
Template:         assets/pr-template.md
Resolve every path from docs/workflow/artifact-paths.yaml. Never hard-code one.
```

## 1. Verify all four upstream reports actually passed

Open each of `quality_gate_report`, `verification_report`, `security_review` and
`reconciliation_report` and confirm the recorded verdict is `PASS`. Do not infer this from the
workflow having reached this stage — the whole point of reading them is that reaching a stage
is not evidence about what happened in it.

Check specifically:

- the quality gate recorded **real output** for all six commands, not a summary;
- the verifier explicitly addressed architecture Rule 2, which nothing automated checks;
- the security review classed each finding, and no **blocking** one is unresolved;
- reconciliation cleared **every** `AC-n` at all three levels.

Any of these missing or ambiguous → `CHANGES_REQUIRED`. Do not draft a Pull Request over an
unverified gate.

## 2. Commit hygiene

Read the actual commits on the branch:

- **No unrelated files.** Anything the `task_breakdown` did not name is a §7.8 finding.
- **No drive-by refactors**, renames or reformatting of untouched files.
- **No phase batching** — one Story's work, not two.
- **Each commit is a complete working change**, not a checkpoint. A run of "fix typo", "fix
  again" commits means an earlier commit should not have landed (AGENTS.md §13).
- **No `--no-verify`**, no skipped hook.
- If a FROZEN file changed, `.arch-guard-checksums` was re-baselined **in the same commit**.
- No secret, key or `.env` in any commit — including one added and later removed, which stays
  in history.

## 3. Configuration

If the change added or renamed a setting, `.env.example` carries it with a **placeholder**,
never a real value, and the README's Configuration section still matches.

## 4. Draft the content

Use `assets/pr-template.md`. There is no `.github/pull_request_template.md` in this
repository; if one is added later, it takes precedence and this template is adapted to it.

The body must state, per AGENTS.md §13:

- **which phase or Story was closed**, and
- **how the acceptance criteria were verified** — pointing at the AC ↔ test matrix, not
  asserting it in prose.

The test plan is a checklist of the real commands with their real results, carried from the
quality gate report. Not "tests pass" — the counts.

English, per §1.

## 5. Stop

Hand the drafted title and body to the user. Recommend that `so-pr-creator` can open the Pull
Request **when they explicitly ask for it**, and state plainly that approving
`HUMAN_PR_APPROVAL` did not carry that approval.

## Result Envelope

`stage: PR_PREPARATION`, `skill: so-pr-preparer`. The single key is `changes_required` →
`IMPLEMENTATION`.

## Constraints

- **Never run `git push`**, `gh pr create`, or any GitHub MCP write.
- Never create a branch, commit, amend, rebase or tag.
- Never merge anything.
- Never draft over an upstream report that is not `PASS`.
- Never soften a security finding in the Pull Request body to make the change look ready.
- Never write a real secret into the artifact.
- English in the artifact; Ukrainian to the user.

## Verification Checklist

- [ ] All four upstream reports were **opened** and their verdicts read, not inferred.
- [ ] The quality gate's six commands each have real recorded output.
- [ ] Architecture Rule 2 was explicitly addressed by the verifier.
- [ ] No unresolved blocking security finding.
- [ ] Every `AC-n` cleared reconciliation's three levels.
- [ ] Commits contain only what `task_breakdown` named.
- [ ] No fixup-run, no `--no-verify`, no batching across phases.
- [ ] Frozen-file change, if any, has a same-commit re-baseline.
- [ ] No secret in any commit, including removed ones.
- [ ] `.env.example` current with placeholders if a setting changed.
- [ ] The body names the Story closed and how the ACs were verified.
- [ ] Nothing was pushed, opened or merged.
