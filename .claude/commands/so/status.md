---
description: Show the current User Story workflow status.
argument-hint: ""
---

Invoke the `so-orchestrator` skill in status mode
(`.claude/skills/so-orchestrator/references/status-flow.md`).

Requirements:

- use read-only operations; modify no file — not workflow state, not an artifact, not the
  catalog;
- do not invoke a stage skill;
- resolve the stage from `docs/workflow/stage-map.yaml` and every path from
  `docs/workflow/artifact-paths.yaml`;
- if no Story is active, say so, list the catalog with each Story's state, and recommend
  `/so:start <StoryId>` (or `/so:new` when the catalog is empty) — this is a normal state,
  not an error;
- report workflow health, the current stage's inputs and outputs with their versions and
  statuses, stale inputs, blockers, the pending human gate with its exact approval command,
  and the recommended next command;
- report `INCONSISTENT` if the two state files disagree, or if `current_stage` is a retired
  identifier — name the canonical replacement rather than silently translating it;
- when health is not OK, name exactly what is wrong and the earliest stage responsible.
