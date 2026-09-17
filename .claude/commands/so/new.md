---
description: Turn a raw idea, bug report or piece of feedback into a User Story file.
argument-hint: "<raw description of the idea, bug or feedback>"
---

Invoke the `so-story-writer` skill to turn the raw input below into a User Story at the
`story` path resolved from `docs/workflow/artifact-paths.yaml`.

Raw input:

$ARGUMENTS

Requirements:

- do **not** invoke `so-orchestrator` and do **not** write workflow state — creating a Story
  does not activate it. `/so:start <StoryId>` does that, and only `so-orchestrator` may write
  `workflow-state.yaml`, `active-story.yaml` or `history.jsonl`;
- allocate the next free epic-dotted id matching `story_id_pattern`
  (`US-<epic>.<n>`), reusing an existing epic number where the work belongs to one;
- **interview the user for anything missing** — the actor, the business outcome, the
  acceptance criteria, the affected stores or locales. Ask one focused round of questions
  rather than a long form. Never invent an acceptance criterion, a business rule or a
  security rule to fill a gap; an unanswerable question becomes a recorded Open Decision
  (`AGENTS.md` §11);
- write the front matter required by `docs/workflow/artifact-schema.md`, including `slug`
  (matching the filename) and `track` (`angular` | `server` | `prompt`, default `angular`) —
  `track` selects the implementation sub-skill list, so a wrong value misroutes the build;
- add the Story to `docs/catalog/stories.yaml` with state `NOT_STARTED`;
- write the Story in English, per `AGENTS.md` §1, and talk to the user in Ukrainian;
- finish by naming the created file, the allocated id, any recorded Open Decisions, and
  recommending `/so:start <StoryId>`.
