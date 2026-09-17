# Workflow State Schema

Authoritative schema for the two mutable workflow-state files and the history log.

- `docs/workflow/active-story.yaml` — identity and activation metadata of the active Story.
- `docs/workflow/workflow-state.yaml` — execution state of the active delivery workflow.
- `docs/workflow/history.jsonl` — append-only transition log.

All three are written by **`so-orchestrator` only**. Stage skills never write them; they
return a Result Envelope (`artifact-lifecycle.md` §3) and the orchestrator records the
transition.

Both YAML files are **structured data, not a narrative log**. Rationale belongs in the
stage's own artifact (a clarification report, a review, an Open Decisions entry) or in
`history.jsonl`. A `note:` field is available for one short qualifying line.

Adding a field to either file is a schema change and needs explicit human sign-off
(AGENTS.md §7.8).

---

## `active-story.yaml`

```yaml
version: 1
active_story: US-1.2                          # epic-dotted id, or null when idle
story_path: docs/stories/US-1.2-dark-mode.md  # resolved from artifact-paths.yaml `story`
source:
  type: local_only                            # local_only | github_issue
  repository: null                            # "owner/repo" or null
  issue_number: null                          # integer or null
  issue_url: null                             # string or null
activated_at: null                            # ISO-8601 or null
activated_by: null                            # actor string or null
status: NOT_STARTED                           # NOT_STARTED | IN_PROGRESS | COMPLETED | ARCHIVED
note: null                                    # optional single line
```

Rules:

- Exactly one Story may be active. A second `active_story`, or a value that disagrees with
  `workflow-state.yaml.story`, is `INCONSISTENT` and blocks `continue`.
- `source.type` is `local_only` for this repository's Docs-as-Code flow. The
  `github_issue` variant exists so the field never has to be invented later; do not
  fabricate repository names or issue numbers.
- `status` mirrors into `docs/catalog/stories.yaml` atomically with any change here.

---

## `workflow-state.yaml`

```yaml
version: 1
story: US-1.2                    # must equal active-story.yaml.active_story
current_stage: SPEC_REVIEW       # a canonical id from stage-map.yaml stage_order
status: IN_PROGRESS              # artifact-lifecycle.md §4
started_at: null                 # ISO-8601
updated_at: null                 # ISO-8601, set on every transition

pending_human_gate:              # null unless current_stage is a human_gate
  stage: null                    # the gate's stage id
  status: null                   # PENDING | APPROVED | REJECTED
  required_artifacts: []         # copied from the gate definition, with versions
  decided_at: null
  decided_by: null
  comment: null

stage_attempts:                  # loop-back attempt counter, per stage
  SPECIFICATION: 2               # reaching 3 without PASS holds BLOCKED for a human

track: angular                   # angular | server | prompt — from the Story front matter
blockers: []                     # free-form strings, only while status is BLOCKED
note: null
```

Rules:

- `current_stage` MUST be a canonical identifier. A retired identifier
  (`stage-map.yaml` `retired_identifiers`) is reported as `INCONSISTENT`, never silently
  translated to its replacement.
- `stage_attempts` is the attempt cap from `continue` mode: a loop-back target that has been
  attempted **3 times** without reaching `PASS` holds `BLOCKED` and reports the repeated
  finding rather than re-attempting a fourth time.
- `pending_human_gate` is cleared when the decision is recorded, and the stage advances to
  the gate's `on_approve` / `on_reject` target.
- Sub-step progress inside the `IMPLEMENTATION` composite stage lives in `pipeline_status`,
  **not** here.

---

## `history.jsonl`

One JSON object per line, one line per transition. **Append-only**: never edited, never
rewritten, never backfilled. It is the single place a retired stage identifier may legally
appear, because it is history.

```json
{"ts":"2026-09-17T19:00:00Z","story":"US-1.2","from":"SPECIFICATION","to":"SPEC_REVIEW","stage":"SPECIFICATION","skill":"so-spec-writer","verdict":"PASS","actor":"so-orchestrator","note":null}
```

| Field | Meaning |
|---|---|
| `ts` | ISO-8601 UTC timestamp. |
| `story` | Epic-dotted Story id. |
| `from` / `to` | Stage identifiers either side of the transition. `from` is null on activation. |
| `stage` | The stage whose skill produced the verdict. |
| `skill` | The skill that ran, or null for a human gate. |
| `verdict` | A value from `artifact-lifecycle.md` §2, or `HUMAN_APPROVED` / `HUMAN_REJECTED`. |
| `actor` | `so-orchestrator` for automated transitions; the approver for human decisions. |
| `note` | Optional single line. |

One event per transition — never batch several stages into one event.
