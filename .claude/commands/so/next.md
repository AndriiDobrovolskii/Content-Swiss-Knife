---
description: Advance the active User Story automatically through consecutive workflow stages until a human gate or a blocked state.
argument-hint: ""
---

Invoke the `so-orchestrator` skill in continue mode
(`.claude/skills/so-orchestrator/references/continue-flow.md`).

Requirements:

- process only the active User Story;
- advance automatically through as many consecutive automated stages as possible in this one
  invocation — after each `PASS` / `NOT_APPLICABLE`, or an under-cap `CHANGES_REQUIRED`
  loop-back, continue immediately to the next stage rather than stopping just because a
  transition was recorded;
- resolve stage routing from `docs/workflow/stage-map.yaml` and artifact paths from
  `docs/workflow/artifact-paths.yaml` — never hard-code either;
- invoke exactly one stage skill per transition, dispatched as an isolated sub-agent, except
  a `composite_skill`, whose per-track sub-steps each get their own dispatch and are tracked
  in `pipeline_status`;
- read the stage skill's actual Result Envelope **and inspect the artifacts it claims to have
  written**; never infer success from a skill running without error;
- stop the run the moment any of these is hit:
  - a human gate: invoke no skill, set `WAITING_FOR_HUMAN`, list the artifacts to review with
    their versions and the automated verdict, and report that `/so:approve` or `/so:reject`
    records the decision. A review skill returning `PASS` is not human approval;
  - a `BLOCKED` verdict from a stage skill;
  - a `CHANGES_REQUIRED` loop-back whose target has already been attempted 3 times without
    reaching `PASS` — report the repeated finding and hold `BLOCKED` for a human decision
    rather than attempting a fourth time;
  - an unknown `loop_back` key, a retired stage identifier, or any workflow invariant
    failure — hold, report, name the earliest responsible stage, never route around it;
  - `STORY_WRITING` is reached (its `run_policy` still applies — never auto-run it);
  - `PR_CREATION` is reached — it pushes a branch and opens a real Pull Request, which needs
    its own separate explicit human instruction (`AGENTS.md` §10);
  - 25 transitions have been recorded in this single invocation (safety fuse — report it and
    that something should be investigated before re-invoking);
- record each transition in `docs/workflow/workflow-state.yaml` and append exactly one event
  per transition to `docs/workflow/history.jsonl` — never batch several stages into one event;
- finish with the Continue Result, covering every stage processed this run, not just the last
  one.
