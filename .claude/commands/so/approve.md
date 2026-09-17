---
description: Record human approval for the current workflow human gate.
argument-hint: "[optional comment]"
---

Invoke the `so-orchestrator` skill to record human approval of the current human gate.

Optional approver comment:

$ARGUMENTS

Requirements:

- read `docs/workflow/workflow-state.yaml`; `current_stage` MUST be a stage whose `type` is
  `human_gate` in `docs/workflow/stage-map.yaml`. If it is not, **refuse** and report the
  current stage;
- confirm every artifact in that gate's `required_artifacts` exists, is current (not
  `SUPERSEDED`, not `ARCHIVED`), and that its recorded automated verdict is `PASS` with no
  blocking findings; if not, refuse and report exactly what is missing;
- if `current_stage` is `COMPLETED`, satisfy the gate's `approval_precondition`: verify
  **against the actual repository**, not the approver's stated word, that the Story's Pull
  Request is merged into the default branch — e.g. `git fetch` then `git merge-base
  --is-ancestor <tip-commit> origin/main`, or `gh pr view --json state,mergedAt`. If the
  branch or Pull Request cannot be found, the check fails, or the result is inconclusive,
  refuse the approval and report exactly what was checked and what was found
  (`AGENTS.md` §10);
- set `pending_human_gate.status = APPROVED`, with `decided_at` (runtime) and `decided_by`;
  store the comment;
- bump `status: APPROVED` in the front matter of every artifact in `required_artifacts` —
  a front-matter field update only, never content editing
  (`docs/workflow/artifact-lifecycle.md` §1);
- append one `docs/workflow/history.jsonl` event with verdict `HUMAN_APPROVED`;
- advance `current_stage` to the gate's `on_approve` target; clear `pending_human_gate`; set
  workflow status to `IN_PROGRESS`, or to `COMPLETED` / `ARCHIVED` when entering those stages;
- do not invoke any stage skill;
- do not create, push or merge a Pull Request — approving this gate never carries approval
  for `PR_CREATION` (`AGENTS.md` §1 and §10);
- finish with the Continue Result.
