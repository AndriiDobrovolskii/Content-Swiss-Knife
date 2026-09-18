# Artifact Front-Matter Schema

Every story-level artifact produced by a stage skill opens with YAML front matter. It is what
makes staleness detectable: without a recorded `version` and `inputs_consumed`, a review
generated from a since-revised Specification looks identical to a current one.

Artifact **locations** come from `artifact-paths.yaml`, never from a hard-coded path.
Artifact **status values** come from `artifact-lifecycle.md` §1.

---

## Schema

```yaml
---
artifact: specification           # the artifact KEY from artifact-paths.yaml
story: US-1.2                     # epic-dotted Story id
version: 1                        # integer, starts at 1, +1 on every revision
status: DRAFT                     # artifact-lifecycle.md §1
owner: so-spec-writer             # must equal the `owner` in artifact-paths.yaml
created_at: 2026-09-17T19:00:00Z  # ISO-8601 UTC
updated_at: 2026-09-17T19:00:00Z
supersedes: null                  # path#version of the prior revision, or null
inputs_consumed:                  # every input actually read, with its version
  - key: story
    version: 1
  - key: open_decisions
    version: 2
open_decisions_blocking: false    # true blocks every downstream stage (AGENTS.md §11)
---
```

## Rules

- **`version` is not decoration.** A revision increments it and sets `supersedes` to the
  prior `path#version`. The prior revision's `status` becomes `SUPERSEDED`.
- **`inputs_consumed` is the staleness contract.** If a downstream artifact records consuming
  `specification` v1 and the current Specification is v2, that downstream artifact is stale
  and its stage must be re-run. A reviewer that does not check this is not reviewing.
- **`owner` must match `artifact-paths.yaml`.** A skill writing an artifact it does not own
  is a defect, even when the content is correct.
- **`status` is not set to `APPROVED` by the producing or reviewing skill.** Only
  `so-orchestrator` does that, and only when a human gate is approved
  (`artifact-lifecycle.md` §1).

## Open Decisions

`open_decisions_blocking: true` means the artifact contains, or depends on, an unresolved
Open Decision that affects the next stage. Per AGENTS.md §11 this is a **blocker**: document
the gap, request clarification, update the Specification. Do not guess.

The same applies to an artifact marked `APPROVED` that still contains `TODO`, `TBD`,
`FIXME` or `???`. That combination is contradictory and any stage consuming it must return
`BLOCKED` rather than proceed on the approved label alone.

## The Story file

`docs/stories/{story_id}-{slug}.md` carries two extra fields, because it is the entry point
rather than a stage output:

```yaml
---
artifact: story
story: US-1.2
slug: dark-mode                   # must match the filename
title: Dark mode for the editor   # one line, English
track: angular                    # angular | server | prompt — selects the IMPLEMENTATION
                                  # sub-skill list in stage-map.yaml `skills_by_track`.
                                  # Absent/unset = angular.
version: 1
status: DRAFT
owner: so-story-writer
created_at: 2026-09-17T19:00:00Z
updated_at: 2026-09-17T19:00:00Z
---
```

`track` is the only field that changes routing, so an incorrect value sends implementation to
the wrong builder track. A Story touching more than one track names the **primary** one; the
task breakdown assigns per-task tracks.
