---
description: Activate a User Story and initialize its workflow.
argument-hint: <StoryId>
---

Invoke the `so-orchestrator` skill in start mode
(`.claude/skills/so-orchestrator/references/start-flow.md`).

Requested Story:

$ARGUMENTS

Requirements:

- activate only the explicitly requested Story, named in epic-dotted form (`US-1.2`); reject
  any other form and report the canonical one rather than auto-converting it;
- require that the Story file already exists at its registry path; if it does not, stop and
  report that `/so:new` creates one. Never invent a Story;
- do not replace another active Story — if one is active, refuse and report it;
- read the Story front matter and carry its `track` into workflow state; an unrecognised
  `track` is an error, not a default;
- initialize `docs/workflow/active-story.yaml` and `docs/workflow/workflow-state.yaml` per
  `docs/workflow/state-schema.md`;
- set the Story's catalog state to `IN_PROGRESS` in `docs/catalog/stories.yaml`;
- append one activation event to `docs/workflow/history.jsonl`;
- treat any pre-existing specification, review or plan for this Story as **context only**,
  never as evidence a stage already ran, and never mark one `APPROVED`;
- do not start stage execution automatically;
- finish with the Start Result and recommend `/so:next`.
