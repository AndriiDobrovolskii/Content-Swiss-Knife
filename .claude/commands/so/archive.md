---
description: Archive the completed active User Story after its required human gates.
argument-hint: ""
---

Invoke the `so-orchestrator` skill in archive mode
(`.claude/skills/so-orchestrator/references/archive-flow.md`).

Requirements:

- require `workflow-state.yaml.current_stage == COMPLETED`, that the `COMPLETED` gate was
  approved with its `approval_precondition` genuinely satisfied (the Pull Request verified
  merged against the repository), and explicit human invocation of this command. **Never
  infer archiving from a merged Pull Request** — a merge is evidence for the gate, not
  authority to archive;
- create the delivery summary at the `delivery_summary` path resolved from
  `docs/workflow/artifact-paths.yaml`, recording what was delivered, each acceptance
  criterion and how it was proven, the gate results, and any Open Decisions resolved or
  deferred;
- update `docs/knowledge/project-state.md`;
- **propose — do not auto-apply —** any implied update to `AGENTS.md` or other standing
  documents, and wait for approval. Never edit `AGENTS.md` (`AGENTS.md` §7.8);
- set the Story's catalog state to `ARCHIVED` in `docs/catalog/stories.yaml`, and set
  `status: ARCHIVED` in the front matter of its artifacts;
- preserve all historical artifacts in place — do not move, rename or delete anything.
  Archived is a status, not a directory;
- do not merge a Pull Request, and request human approval before any remote write;
- clear `active-story.yaml` and set `current_stage` to `ARCHIVED` **only after** the delivery
  summary is written; append exactly one `history.jsonl` event;
- finish with the Archive Result.
