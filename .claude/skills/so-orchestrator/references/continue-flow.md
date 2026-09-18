# Continue Flow (`/so:next`)

Advance the active Story automatically through consecutive workflow stages — one skill
dispatch per stage, one `history.jsonl` event per transition — without waiting for a separate
invocation between them. This is the primary mode.

## Inputs

`docs/workflow/active-story.yaml`, `workflow-state.yaml`, `stage-map.yaml` (routing
authority), `artifact-paths.yaml` (path authority), `artifact-lifecycle.md`,
`state-schema.md`, and `AGENTS.md`.

## Constants

| Name | Value | Why |
|---|---|---|
| `MAX_STAGE_ATTEMPTS` | 3 | A loop-back target attempted three times without `PASS` is not converging. |
| `MAX_TRANSITIONS_PER_RUN` | 25 | Safety fuse. `stage_order` has 22 entries, so hitting this means something loops. |

## Outer loop

Run the per-stage algorithm once per stage, stage after stage, **in the same invocation**. Do
not wait for the user to call `/so:next` again just to move from one automated `PASS` to the
next. Stop the loop the moment any **stop condition** is hit:

- **Human gate reached.** The (possibly just-advanced) `current_stage` is `type: human_gate`.
  Invoke no skill. Report per step 3 and end the run. Never infer approval, never treat this
  as an error.
- **`BLOCKED`.** A stage skill returns `BLOCKED`. Hold that stage, `status: BLOCKED`, surface
  `blocking_issues`, end the run.
- **Attempt cap exhausted.** A skill returns `CHANGES_REQUIRED` and the `loop_back` target has
  already been attempted `MAX_STAGE_ATTEMPTS` times this delivery without reaching `PASS`.
  Do not attempt a fourth time — hold `BLOCKED` at the looped-back stage, report the
  finding repeated across attempts, end the run for a human decision. *(Under the cap, apply
  the loop-back per step 7 and continue the outer loop — that is not a stop condition.)*
- **Invariant failure.** Steps 1, 2 or 4 fail. Hold, report, name the earliest responsible
  stage, end the run. Never route around it.
- **`STORY_WRITING` reached.** Its `run_policy` applies — never auto-run it on a continue.
  End the run and report that `/so:new` (or an explicit Story activation) is needed.
- **`PR_CREATION` reached.** Its `run_policy` applies (`AGENTS.md` §10): it pushes a branch
  and opens a real Pull Request — an externally visible action on shared state. End the run
  and report that a separate explicit instruction is needed.
- **Safety fuse.** `MAX_TRANSITIONS_PER_RUN` transitions recorded this invocation. End and
  report that something is looping and should be investigated before re-invoking.

Every iteration performs exactly one transition (or ends the run without one) and appends
exactly one `history.jsonl` event per transition actually made. Never batch several stages
into one event; never skip recording a transition that happened.

---

## Per-stage algorithm

### 1. Resolve the active Story

Read `active-story.yaml`. Confirm exactly one `active_story`, and that
`workflow-state.yaml.story` matches. None → stop with `BLOCKED — run /so:start <StoryId>`.
Disagreement → stop `INCONSISTENT`; do not guess which file is authoritative.

**Re-check this every iteration.** A run processing several stages must not keep going
against a mismatch that appears mid-run.

### 2. Resolve the current stage

Read `current_stage`, `status`, `stage_attempts`, `pending_human_gate`. `current_stage` must
be in `stage_order`. If it is a `retired_identifiers` key, report the canonical replacement
and stop `INCONSISTENT` — do not silently translate it.

### 3. If the current stage is a human gate

Invoke no skill. This is a stop condition: report and end the run regardless of how many
stages were already processed. Branch on `pending_human_gate.status`:

- **`null`** → build `pending_human_gate` per `state-schema.md`, set
  `status: WAITING_FOR_HUMAN`, and stop. Report: the gate, each required artifact **with its
  version**, the automated verdict that fed it, any non-blocking findings, and the exact
  `/so:approve` | `/so:reject` command.
- **`PENDING`** → re-report the same, and stop.
- **`APPROVED`** → bump `status: APPROVED` in the front matter of every artifact in
  `required_artifacts` (`artifact-lifecycle.md` §1 — a front-matter field update, never
  content editing); advance `current_stage` to the gate's `on_approve`; clear
  `pending_human_gate`; set `status: IN_PROGRESS`; append one history event; stop.
- **`REJECTED`** → route to `on_reject`; clear `pending_human_gate`; set `status: IN_PROGRESS`;
  append one history event; stop.

For the `COMPLETED` gate, `approval_precondition` must be satisfied **before** `APPROVED` is
accepted — verify the merge against the repository, not against what the approver said.

> A review skill's `PASS` is never human approval. Never let a run of consecutive automated
> passes carry the workflow through a gate. A gate always ends the run.

### 4. Validate workflow invariants

State files agree; no input artifact is `SUPERSEDED` or `ARCHIVED`; no downstream artifact
records an older upstream `version` than the one on disk; no blocking Open Decision affects
the stage about to run; no `TODO` / `TBD` / `FIXME` / `???` in an `APPROVED` artifact this
stage depends on. On failure: hold, report, recommend the earliest responsible stage.

### 5. Check for existing stage output

Resolve `stages.<current>.outputs` through `artifact-paths.yaml`. If a current, valid output
already exists — right Story, `status` not `SUPERSEDED`/`ARCHIVED`, inputs not stale, no open
`CHANGES_REQUIRED` or `BLOCKED` record — **do not regenerate.** Validate it and go to step 7
using its recorded verdict. Otherwise continue.

### 6. Dispatch the one responsible skill

`skill := stages.<current>.skill`. Confirm `.claude/skills/<skill>/SKILL.md` exists; if it
does not, stop `BLOCKED` naming the missing skill — do not improvise its work.

Dispatch to a fresh sub-agent (`Agent`, `subagent_type: general-purpose`). The prompt must
carry, and only carry:

1. The skill to invoke, by name, and the instruction to follow it exactly.
2. The Story id and the resolved **paths** of its inputs (resolved here, from
   `artifact-paths.yaml` — the sub-agent must not re-derive them).
3. The instruction to return the Result Envelope from `artifact-lifecycle.md` §3 and nothing
   else.
4. The reminder that it must not write `workflow-state.yaml` or `history.jsonl`.

For a `composite_skill`, resolve the Story's `track` and dispatch each entry of
`skills_by_track[track]` as its own separate sub-agent, in the listed order, recording each
sub-step in `pipeline_status` as it completes.

### 7. Read the result and record exactly one transition

Read the envelope. **Inspect the artifacts it claims to have written, at their registry
paths.** An envelope claiming an artifact that is not there is a `BLOCKED` condition, not a
pass.

| Verdict | Action |
|---|---|
| `PASS`, `NOT_APPLICABLE` | `current_stage := stages.<current>.next`; reset `stage_attempts[<current>]`. |
| `CHANGES_REQUIRED` | Resolve `loop_back_stage` (a **key**) through `stages.<current>.loop_back`. Unknown key → `BLOCKED`. Increment `stage_attempts[target]`; if it now exceeds `MAX_STAGE_ATTEMPTS`, stop per the outer loop. |
| `BLOCKED` | Hold. `status: BLOCKED`. Surface `blocking_issues`. Stop. |

Then, in one write: update `workflow-state.yaml` (`current_stage`, `status`, `updated_at`,
`stage_attempts`) and append **one** `history.jsonl` event per `state-schema.md`.

`NOT_APPLICABLE` is only legal where the stage is `optional: true` and the skill recorded why
`optional_when` holds. Otherwise treat it as a defect and stop.

### 8. Continue the outer loop

Go back to step 1 for the new `current_stage`, unless a stop condition was hit.

---

## The Continue Result

End every run with this report, covering **every stage processed this run**, not just the
last one:

```
Story:        US-1.2 — <title>
Transitions:  SPECIFICATION → SPEC_REVIEW → HUMAN_SPEC_APPROVAL   (2 recorded)
Now at:       HUMAN_SPEC_APPROVAL   (human_gate)
Status:       WAITING_FOR_HUMAN
Stopped because: a human gate was reached.

Awaiting review:
  - docs/specifications/US-1.2-spec.md            v1  DRAFT
  - docs/reviews/specifications/US-1.2-spec-review.md  v1  DRAFT   verdict: PASS

Non-blocking findings: 2 (see the review)

Next:  /so:approve [comment]   or   /so:reject <reason>
```

If the run stopped for any reason other than a gate, say which stop condition fired and name
the stage responsible. "Stopped" without a named reason is not an acceptable report.
