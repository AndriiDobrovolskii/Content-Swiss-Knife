# Status Vocabularies and the Result Envelope

The **single authoritative source** for status values used across the harness, and for the
contract a stage skill returns. There are **three separate enums**. They describe different
things and MUST NOT be mixed or conflated.

| Enum | Question it answers | Where it is stored |
|---|---|---|
| Artifact lifecycle status | "Is this document current?" | `status:` in each artifact's front matter (`artifact-schema.md`) |
| Review verdict | "What did this automated stage decide?" | `result.verdict` in the stage Result Envelope (§3) |
| Workflow status | "What state is the delivery workflow in?" | `status:` / `pending_human_gate.status` in `workflow-state.yaml` |

---

## 1. Artifact lifecycle status

Applies to every story-level artifact (front-matter `status:` field).

| Value | Meaning |
|---|---|
| `DRAFT` | Produced by its owner skill; not yet reviewed or approved. |
| `IN_REVIEW` | A downstream review stage is currently evaluating it. |
| `APPROVED` | Passed its review gate **and** the human gate where one exists. Safe to consume downstream. |
| `SUPERSEDED` | A newer version exists. The newer artifact's `supersedes:` points here. Never used as a current input. |
| `ARCHIVED` | Belongs to a delivery that has completed archive mode. Retained for history only. |

Rules:

- A revised artifact increments `version:` and sets `supersedes:` to the prior path/version.
  The prior revision becomes `SUPERSEDED`.
- Reviewers MUST check that every input artifact they consumed is the current
  (non-`SUPERSEDED`, non-`ARCHIVED`) version.
- Stale input — a review or evidence artifact generated from a now-`SUPERSEDED` upstream —
  blocks progression until the dependent stage is re-run.
- `DRAFT` → `APPROVED` is owned by **`so-orchestrator`**, not by the producing or reviewing
  skill. When a human gate's `/so:approve` is recorded, the orchestrator sets
  `status: APPROVED` in the front matter of every artifact in that gate's
  `required_artifacts`. Until that gate fires, an artifact stays `DRAFT` **even after its
  review stage returned `PASS`** — a verdict and an artifact status are different enums.

---

## 2. Review verdict

The only values an automated stage skill may emit in `result.verdict`.

| Value | Meaning | Orchestrator action |
|---|---|---|
| `PASS` | Stage goal met, zero blocking findings. May carry `non_blocking_findings`. | Advance to `stage-map.yaml` `next`. |
| `CHANGES_REQUIRED` | Correctable problem. The skill sets `loop_back_stage` to a key defined under this stage's `loop_back` map. | Route to `loop_back[key]`. |
| `BLOCKED` | Stage cannot be evaluated: missing or stale mandatory input, unresolved blocking Open Decision, environment failure, artifact conflict. | Hold at the current stage; surface `blocking_issues`. |
| `NOT_APPLICABLE` | Only for a stage marked `optional: true` whose `optional_when` condition is met and recorded. | Advance to `next`. |

**A `PASS` is never human approval.** Only `/so:approve` records that (AGENTS.md §10).

### Retired verdict values

MUST NOT appear in any skill or new artifact.

| Retired | Canonical |
|---|---|
| `Pass` | `PASS` |
| `Pass with Issues` | `PASS` with `non_blocking_findings` populated |
| `Fail` | `CHANGES_REQUIRED` (correctable) or `BLOCKED` (not evaluable) |
| `APPROVED` (as a verdict) | `PASS` |
| `REJECTED` | `CHANGES_REQUIRED` or `BLOCKED` |
| `PARTIALLY_IMPLEMENTED` | `CHANGES_REQUIRED` with `loop_back_stage` key `partial` |
| `PROCEED_TO_*` | derive the next stage from `stage-map.yaml`; never name it in the skill |
| `RETURN_TO_*` | use `loop_back_stage` with a key from `stage-map.yaml` |

Note: `READY_FOR_PR`, `COMPLETED` and `ARCHIVED` are **stages**, not verdicts. The verdict at
`PR_PREPARATION` is `PASS`; the orchestrator then advances the *stage*.

---

## 3. The Result Envelope

Every automated stage skill ends by returning exactly this structure. The orchestrator reads
it and records the transition; it never infers success from a skill running without error.

```yaml
stage: TEST_WRITING                  # must be a canonical id from stage_order
skill: so-test-writer                # must match stage-map.yaml `skill`
story: US-1.2
result:
  verdict: PASS                      # PASS | CHANGES_REQUIRED | BLOCKED | NOT_APPLICABLE
  loop_back_stage: null              # required when verdict is CHANGES_REQUIRED; a KEY from
                                     # this stage's loop_back map, not a stage id
  summary: >
    One or two sentences. What was produced or decided, in English.
artifacts_written:                   # resolved from artifact-paths.yaml, never hard-coded
  - key: ac_test_matrix
    path: docs/tests/US-1.2-ac-test-matrix.md
    version: 1
    status: DRAFT
inputs_consumed:                     # every input, with the version actually read
  - key: specification
    version: 2
blocking_issues: []                  # required non-empty when verdict is BLOCKED
non_blocking_findings: []            # optional; allowed alongside PASS
evidence: []                         # commands run and their real output, where applicable
```

Rules:

- `loop_back_stage` carries a **key** (`changes_required_tests`), not a stage identifier. The
  orchestrator resolves it through `stage-map.yaml`. An unknown key is a workflow invariant
  failure: hold, report, never route around it.
- A skill MUST NOT write `workflow-state.yaml` or append `history.jsonl`. Those are
  `so-orchestrator`'s alone.
- A skill MUST NOT write an artifact it does not `own` in `artifact-paths.yaml`.
- Reporting a check as passing without running it is the most serious violation available
  (AGENTS.md §6) — `evidence` carries real output or the field stays empty.

---

## 4. Workflow status

Stored in `workflow-state.yaml`. See `state-schema.md` for the full file shape.

| Value | Meaning |
|---|---|
| `NOT_STARTED` | A Story is active but no stage has run. |
| `IN_PROGRESS` | Normal execution. |
| `WAITING_FOR_HUMAN` | Held at a `human_gate`. `/so:approve` or `/so:reject` is the only way out. |
| `BLOCKED` | A stage returned `BLOCKED`, or a loop-back exhausted its attempt cap. Needs a human decision. |
| `INCONSISTENT` | State files disagree, or `current_stage` is a retired identifier. Report; do not silently translate. |
| `COMPLETED` | The `COMPLETED` gate was approved against a verified merged Pull Request. |
| `ARCHIVED` | Archive mode finished. Terminal. |

`pending_human_gate.status` is a separate, smaller enum: `PENDING`, `APPROVED`, `REJECTED`.
