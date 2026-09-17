---
name: so-orchestrator
description: >
  Sequences a User Story through the delivery workflow defined in
  docs/workflow/stage-map.yaml, invoking each stage's owning skill, reading its Result
  Envelope, and recording the transition in docs/workflow/workflow-state.yaml plus
  docs/workflow/history.jsonl. Use when the user wants to "advance this story", "run the
  pipeline for US-x.y", "start US-x.y", asks where a story stands, or runs any /so command.
  Four modes, one per command: start (activate a Story), continue (advance automatically
  through consecutive automated stages, stopping only at a human gate, a BLOCKED verdict, or
  a CHANGES_REQUIRED loop that exhausted its attempt cap), status (read-only report), archive
  (consolidate a completed delivery). Acts as a sequencer only — it invokes the owning skills
  rather than doing their work, stops at any stage whose skill reports anything other than
  PASS or NOT_APPLICABLE, and never treats a review skill's PASS as human approval. Does not
  write specifications, plans, code or reports itself, and never pushes, opens or merges a
  Pull Request.
---

# so-orchestrator

## Purpose

Drive one Story through the stages in `docs/workflow/stage-map.yaml`, invoking each stage's
owning skill, reading its actual Result Envelope, and advancing only on a genuine `PASS`.

This skill's entire value is **refusing to skip a stage or fabricate a result.** It does none
of the substantive work itself.

## The stage map is the authority

**This skill carries no stage list of its own.** The canonical stage order, each stage's
owning skill, its inputs and outputs, its `next` target, its `loop_back` keys, and which
stages are human gates all live in `docs/workflow/stage-map.yaml`. Read it at the start of
every run. If this document and the stage map ever disagree, **the stage map wins and this
document is the bug.**

Likewise, never hard-code an artifact path. Resolve every one from
`docs/workflow/artifact-paths.yaml`. A hard-coded path is a defect even when it currently
happens to be correct.

A stage identifier that is not in `stage_order` — including any key in `retired_identifiers`
— is an `INCONSISTENT` state. Report it and its canonical replacement; never silently
translate it and carry on.

## Operational Contract

```
Precondition:    docs/workflow/active-story.yaml names the Story in scope, and
                 docs/workflow/workflow-state.yaml agrees with it.
Input Artifacts: docs/workflow/{stage-map,artifact-paths}.yaml and the schema documents
                 (read-only); active-story.yaml; workflow-state.yaml;
                 docs/catalog/stories.yaml.
Output Artifacts: docs/workflow/workflow-state.yaml; append-only history.jsonl;
                 docs/catalog/stories.yaml (status only); the delivery summary and
                 project-state in archive mode only.
```

## Canonical sources

| Concern | File |
|---|---|
| Workflow, routing, ownership, gates | `docs/workflow/stage-map.yaml` |
| Artifact paths and owners | `docs/workflow/artifact-paths.yaml` |
| Status vocabularies + the Result Envelope | `docs/workflow/artifact-lifecycle.md` |
| Front matter and the staleness contract | `docs/workflow/artifact-schema.md` |
| State and history event schemas | `docs/workflow/state-schema.md` |
| Story lifecycle status | `docs/catalog/stories.yaml` |
| Non-normative overview | `docs/workflow/stages.md` |
| Binding engineering rules | `AGENTS.md` |

## Modes

One per command. **Read the reference file for the mode you are in** — they carry the actual
algorithms; this file carries only what is common to all four.

| Mode | Command | Reference |
|---|---|---|
| start | `/so:start <StoryId>` | `references/start-flow.md` |
| continue | `/so:next` | `references/continue-flow.md` |
| status | `/so:status` | `references/status-flow.md` |
| archive | `/so:archive` | `references/archive-flow.md` |

`/so:approve` and `/so:reject` are handled inside continue mode's human-gate branch — see
`references/continue-flow.md` step 3.

`/so:new` does **not** use this skill. It invokes `so-story-writer` directly, which owns both
the Story file and the catalog entry. Creating a Story does not activate it; `/so:start`
does, and only this skill may write workflow state.

## Resolving a stage to its skill

Do not consult a table in this file. For the current stage:

1. `stage := workflow-state.yaml.current_stage`; confirm it is in `stage_order`.
2. `type: human_gate` → **invoke no skill.** Follow continue mode's human-gate branch.
3. `type: terminal` → only archive mode reaches it.
4. `type: automated_skill` → dispatch `stages.<stage>.skill` as an isolated sub-agent (see
   below), never inline.
5. `type: composite_skill` → resolve the Story's `track` from its front matter
   (`artifact-schema.md`; absent means `angular`), then dispatch each skill in
   `stages.<stage>.skills_by_track[track]`, in the order given, each as its **own** sub-agent.
   Record each sub-step in `pipeline_status` — not in `workflow-state.yaml`. Only
   `IMPLEMENTATION` is composite today.

## Dispatching a stage skill

Every stage skill reads its inputs from files, never from conversation history — each is
self-contained by design. Exploit that: instead of loading a stage skill's instructions inline
(which pulls its full working transcript into this session), dispatch its work to a fresh
sub-agent (`Agent` tool, `subagent_type: general-purpose`) and read back only its Result
Envelope. The orchestrator's context then grows by one short report per stage rather than by
every stage's full transcript. The exact dispatch-prompt contract is in `continue-flow.md`
step 6.

A stage marked `optional: true` may return `NOT_APPLICABLE` only when its `optional_when`
condition holds and the skill records why.

## Reading a result

Read the actual Result Envelope (`artifact-lifecycle.md` §3), then **inspect the artifacts it
claims to have produced, at their registry paths.** Never infer success from the fact that a
skill ran without erroring.

- `PASS` / `NOT_APPLICABLE` → advance to `stages.<stage>.next`; reset that stage's attempt
  counter.
- `CHANGES_REQUIRED` → the skill names a `loop_back` **key**. It must exist under
  `stages.<stage>.loop_back`; an unknown key is rejected and the stage holds `BLOCKED`
  pending a human decision.
- `BLOCKED` → the stage does not move; `status: BLOCKED`; surface `blocking_issues`.

A retired verdict (`Pass`, `Fail`, `Pass with Issues`, `APPROVED`, …) from a skill is a
defect. Map it via `artifact-lifecycle.md` §2 and report that the skill needs updating, rather
than guessing what it meant.

## Human gates

A gate stops the workflow for a person. Build `pending_human_gate` per `state-schema.md`, set
`status: WAITING_FOR_HUMAN`, list the required artifacts with their versions and the automated
verdict that fed the gate, and stop.

**A review skill returning `PASS` is not human approval.** Only `/so:approve` records one.
Never infer approval, and never pass a gate automatically — including when the user asks to
run several stages at once.

The `COMPLETED` gate additionally carries `approval_precondition`: verify against the actual
repository that the Story's Pull Request is merged. A human's word is not sufficient
(`AGENTS.md` §10).

## Workflow invariants

Check before invoking anything. On failure: hold, report, name the earliest stage responsible.
**Do not route.**

- `active-story.yaml.active_story` equals `workflow-state.yaml.story`.
- `current_stage` is in `stage_order`.
- No input artifact for the current stage is `SUPERSEDED` or `ARCHIVED`.
- No downstream artifact records an older `version` of an upstream artifact than the one on
  disk (`artifact-schema.md` staleness contract).
- No `TODO` / `TBD` / `FIXME` / `???` or unresolved blocking Open Decision in an `APPROVED`
  artifact this stage depends on (`AGENTS.md` §11).
- Exactly one Story is active.

## Constraints

- Never edit `stage-map.yaml`, `artifact-paths.yaml`, or any schema document.
- Never write specifications, plans, code or reports directly — always invoke the owning
  skill named in the stage map.
- Never write an artifact this skill does not `own` in `artifact-paths.yaml`. The one narrow
  exception is the `DRAFT` → `APPROVED` front-matter bump on a recorded `/so:approve`
  (`artifact-lifecycle.md` §1).
- Never advance past a stage whose skill reported anything other than `PASS` or
  `NOT_APPLICABLE`.
- Never skip a stage because the change "looks obviously fine". There are no escape hatches
  for trivial changes (`AGENTS.md` §10).
- Never add a field to `workflow-state.yaml`'s schema; that needs explicit human sign-off
  (`AGENTS.md` §7.8). Track sub-steps in `pipeline_status` instead.
- Never rewrite `history.jsonl`. Append-only, one event per transition.
- Never push, open or merge a Pull Request yourself.
- Never dispatch `PR_CREATION` on your own initiative, including inside a `continue` run —
  reaching it is a stop condition exactly like `STORY_WRITING` (`AGENTS.md` §10). Dispatch it
  only on its own separate, explicit human instruction.

## Verification Checklist

- [ ] The stage list came from `stage-map.yaml` this run, not from memory.
- [ ] `workflow-state.yaml` and `active-story.yaml` agree, or the mismatch was flagged and
      nothing advanced.
- [ ] The stage's owning skill was actually dispatched as an isolated sub-agent, and its
      Result Envelope actually read.
- [ ] The artifacts a skill claimed to write were inspected at their registry paths.
- [ ] Any `loop_back` key named by a skill exists under that stage in the map.
- [ ] Exactly one `history.jsonl` event was appended per transition.
- [ ] A `BLOCKED` verdict, an unknown `loop_back` key, or a loop past its attempt cap stopped
      the run and named the blocking stage — no downstream skill ran afterward.
- [ ] The run kept advancing through every `PASS` / `NOT_APPLICABLE` stage until a real stop
      condition was hit — it did not stop merely because a transition was recorded.
- [ ] No human gate was passed without `/so:approve`.
- [ ] `pipeline_status` reflects `IMPLEMENTATION`'s sub-steps, not just the top-level stage.

## Completion Criteria

A continue run is complete when the workflow has advanced through every automated stage it
could and is now holding at a human gate, a `BLOCKED` verdict, a `CHANGES_REQUIRED` loop that
exhausted its attempt cap, or an inconsistent state — **each with a specific, named reason.**
Never silently abandoned mid-sequence, and never stopped merely because a transition was
recorded when no stop condition applies.
