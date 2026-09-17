# Start Flow (`/so:start <StoryId>`)

Activate one User Story and initialise its workflow state. **Does not run any stage** — it
sets the workflow at the first stage and stops.

## Preconditions

- The Story file exists at the `story` path resolved from `artifact-paths.yaml`. If it does
  not, stop and report that `/so:new` creates one. Never invent a Story.
- No other Story is active. If `active-story.yaml.active_story` is non-null and different,
  **refuse** — report the active Story and that it must reach `ARCHIVED` (or be explicitly
  deactivated by the user) first. Never silently replace it.
- The requested id matches `artifact-paths.yaml` `story_id_pattern` (`US-<epic>.<n>`). A
  retired sequential form such as `US-014` is rejected with the canonical form explained,
  not auto-converted.

## Steps

1. **Resolve and validate the id.** Epic-dotted form only. Confirm exactly one Story file
   matches `docs/stories/<StoryId>-*.md`; more than one is `INCONSISTENT`.

2. **Read the Story front matter** (`artifact-schema.md`): `slug` must match the filename,
   and `track` must be `angular`, `server` or `prompt` — absent means `angular`. An
   unrecognised `track` is an error, not a default.

3. **Initialise `active-story.yaml`** per `state-schema.md`: `active_story`, `story_path`,
   `source.type: local_only`, `activated_at` (runtime ISO-8601), `activated_by`,
   `status: IN_PROGRESS`.

4. **Initialise `workflow-state.yaml`**: `story`, `current_stage` := the first stage after
   `STORY_WRITING` in `stage_order` (`STORY_WRITING` has already happened — the Story file
   exists), `status: IN_PROGRESS`, `started_at`, `updated_at`, `pending_human_gate: null`,
   `stage_attempts: {}`, `track` from the front matter.

5. **Set the catalog state** to `IN_PROGRESS` in `docs/catalog/stories.yaml`.

6. **Append one activation event** to `history.jsonl`: `from: null`, `to` the initial stage,
   `verdict: null`, `actor` the invoking user.

7. **Stop.** Do not begin stage execution.

## Pre-existing artifacts

A draft specification, review or plan that already exists for this Story is **context only**,
never evidence that a stage already ran. Workflow state is what records that. If such
artifacts exist, list them in the Start Result so the user can decide whether to keep or
supersede them — do not mark anything `APPROVED`, and do not skip ahead to a later stage
because output appears to exist.

## The Start Result

```
Activated:  US-1.2 — Dark mode for the editor
Track:      angular
Story:      docs/stories/US-1.2-dark-mode.md
Now at:     CLARIFICATION   (automated_skill → so-clarifier)
Status:     IN_PROGRESS

Pre-existing artifacts found (context only, not evidence a stage ran):
  - none

Next:  /so:next
```
