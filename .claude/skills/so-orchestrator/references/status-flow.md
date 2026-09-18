# Status Flow (`/so:status`)

A read-only report of where the active Story stands.

## Hard constraints

- **Read-only.** Modify no file — not workflow state, not an artifact, not the catalog.
- **Invoke no stage skill.** Reporting is not executing.
- Resolve the stage from `stage-map.yaml` and every path from `artifact-paths.yaml`. Never
  hard-code either.

## Idle

If `active-story.yaml.active_story` is `null`, report that no Story is active, list the
Stories in `docs/catalog/stories.yaml` with their states, and recommend `/so:start <StoryId>`
(or `/so:new` if the catalog is empty). This is a normal state, not an error.

## Steps

1. Read `active-story.yaml` and `workflow-state.yaml`. If they disagree, report
   `INCONSISTENT` and name both values — do not choose between them.
2. Resolve `current_stage` in `stage_order`. If it is a `retired_identifiers` key, report
   `INCONSISTENT` **and** the canonical replacement, rather than silently translating it.
3. Resolve the current stage's `inputs` and `outputs` to paths, and for each report whether it
   exists, its `version`, and its `status`.
4. Flag **stale inputs**: any input whose current on-disk `version` is newer than the version
   a downstream artifact recorded consuming (`artifact-schema.md`), and any input marked
   `SUPERSEDED` or `ARCHIVED`.
5. Flag **blockers**: `status: BLOCKED`, unresolved blocking Open Decisions, and any
   `TODO` / `TBD` / `FIXME` / `???` inside an `APPROVED` artifact this stage depends on.
6. Report the pending human gate, if any, with its exact approval command.
7. Recommend the next command.

## The Status Result

```
Story:        US-1.2 — Dark mode for the editor      track: angular
Current:      TEST_WRITING   (automated_skill → so-test-writer)
Status:       IN_PROGRESS            attempts at this stage: 1/3
Health:       OK

Inputs:
  story                 docs/stories/US-1.2-dark-mode.md            v1  APPROVED
  specification         docs/specifications/US-1.2-spec.md          v2  APPROVED
  implementation_plan   docs/plans/US-1.2-implementation-plan.md    v1  APPROVED
  task_breakdown        docs/plans/US-1.2-task-breakdown.md         v1  APPROVED

Outputs (not yet produced):
  test_strategy         docs/tests/US-1.2-test-strategy.md          —
  ac_test_matrix        docs/tests/US-1.2-ac-test-matrix.md         —

Stale inputs:  none
Blockers:      none
Pending gate:  none

Next:  /so:next
```

When health is not `OK`, say exactly what is wrong and which stage is the earliest one
responsible. A status report that says "blocked" without naming the cause is not a report.
