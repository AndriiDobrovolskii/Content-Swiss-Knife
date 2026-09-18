---
description: Record human rejection of the current workflow human gate.
argument-hint: "<reason>"
---

Invoke the `so-orchestrator` skill to record human rejection of the current human gate.

Rejection reason (required):

$ARGUMENTS

Requirements:

- read `docs/workflow/workflow-state.yaml`; `current_stage` MUST be a stage whose `type` is
  `human_gate` in `docs/workflow/stage-map.yaml`. If it is not, **refuse** and report the
  current stage;
- require a non-empty reason; store it as `pending_human_gate.comment`. A rejection without a
  stated reason is refused — the loop-back target has to know what to fix;
- set `pending_human_gate.status = REJECTED`, with `decided_at` (runtime) and `decided_by`;
- leave every artifact's front-matter `status` untouched — a rejection does not supersede an
  artifact, it sends the workflow back to the stage that will revise it;
- append one `docs/workflow/history.jsonl` event with verdict `HUMAN_REJECTED`;
- route `current_stage` to the gate's `on_reject` target; clear `pending_human_gate`; set
  workflow status to `IN_PROGRESS`;
- do not invoke any stage skill;
- finish with the Continue Result, naming the loop-back target and the recommended next
  command.
