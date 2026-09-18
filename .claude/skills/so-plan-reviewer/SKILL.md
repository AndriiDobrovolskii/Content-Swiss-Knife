---
name: so-plan-reviewer
description: >
  Reviews the architectural plan and the task breakdown together, as one gate, against the
  approved Specification and AGENTS.md — checking that every acceptance criterion is reachable
  through a task, that no task would edit a FROZEN file without the §9 stop, that no
  architecture rule is violated, that task ordering and sizing hold, and that nothing crept in
  beyond what was specified. Use when a plan and its task breakdown are drafted and need their
  quality gate before HUMAN_PLAN_APPROVAL ("review the plan for US-x.y"). Owns the PLAN_REVIEW
  stage and the plan_review artifact. Reports findings and names a loop-back target; it never
  edits the plan or the tasks, and its PASS is NOT human approval.
---

# so-plan-reviewer

## Purpose

The last check before a human is asked to approve the plan — and approving the plan is what
sends work to `TEST_WRITING` and then to code. Review both documents **together**: a sound
plan with a task list that does not implement it is as broken as a bad plan, and neither is
visible from reading one document alone.

**This skill's `PASS` is not human approval** (AGENTS.md §10).

## Operational Contract

```
Precondition:     IMPLEMENTATION_PLANNING returned PASS. Both artifacts are current.
Input Artifacts:  story, specification, impact_analysis, implementation_plan, task_breakdown.
Output Artifacts: plan_review
Template:         assets/template.md
Resolve every path from docs/workflow/artifact-paths.yaml. Never hard-code one.
```

## Review axes

Work all seven. Each gets an explicit finding or an explicit "clear".

### 1. Specification coverage, both directions

Re-derive the mapping; do not read back the plan's own coverage table.

- Every `FR-n` reaches at least one task. An FR with no task is **work that will not happen**.
- Every `AC-n` is reachable through the tasks that implement its FRs.
- Every task traces to a plan item, and every plan item to an FR. A task tracing to nothing is
  **scope creep**; check it against the Specification's *Out of scope* section specifically.

### 2. FROZEN files (AGENTS.md §9)

The single highest-stakes check here. For every task touching
`src/prompts/task-{a,b,c}.ts`, `src/prompt-core/master-system-prompt.ts` or
`src/utils/output-validator.ts`:

- the task MUST carry the §9 stop — state exactly what and why, wait for explicit approval;
- or the plan MUST have chosen the sibling-file pattern instead (`task-a-doc.ts`,
  `image-manifest-coverage.ts` are the precedents).

A task that edits a frozen file with neither is a **blocking** finding, not a note.

Also check the plan did not silently *assume* approval it does not have.

### 3. Architecture rules (AGENTS.md §3)

- **Rule 1** — no direct SDK use outside `server/providers/`.
- **Rule 2** — retrieval stays separate from generation. **This rule has no automated check
  at all**; arch-guard will not catch a violation, and neither will the tests. If it is not
  caught here, it ships. Check it deliberately, by reading what the plan actually proposes.
- **Rule 3** — prompt text lives in `src/prompts/` or `src/prompt-core/`, not in a service.
- **Rule 4** — no key reaches the browser bundle.
- **Rule 5** — no existing feature breaks.
- `STORE_REGISTRY` remains the only source of locales and currency symbols.
- `systemBlocks` are not collapsed into `userContent` (prompt-caching economics).

### 4. The prompt → schema → renderer → validator chain

If the plan touches any link, check all four stay in agreement and that the task **ordering**
reflects it: contract before consumer. A renderer task scheduled before its schema task will
not typecheck, and that is an ordering defect visible only here.

Check which AGENTS.md §4 criteria the plan says the renderer must keep satisfying, and whether
that list is complete for what is being changed.

### 5. Task quality

- Every task has all eight fields and an **observable** acceptance check.
- Every task could end in one commit with the gate green (§13). A task that cannot is
  mis-scoped.
- No task spans two tracks.
- Ordering is by dependency and risk, with the riskiest decision first.
- Fixture updates sit with the change that moves them, not in a cleanup task.

### 6. Test strategy

- Every task names test files **and their runner**. A component spec must be
  `*.component.spec.ts` or it runs in the wrong runner (AGENTS.md §5).
- A task with no test states why it changes no behaviour.
- The plan's validation strategy has no missing category — especially the failure paths the
  Specification's FRs declared.
- Nothing in the plan relies on weakening, skipping or excluding an existing test (§7.7).

### 7. Impact-analysis fidelity

The plan consumed the impact analysis rather than re-deriving or contradicting it. If the plan
touches a file the survey did not list, either the survey was incomplete — a loop-back to
`IMPACT_ANALYSIS` — or the plan grew beyond its scope.

## Verdict and loop-back

`stage: PLAN_REVIEW`, `skill: so-plan-reviewer`. Three keys exist under this stage:

| Verdict / key | When |
|---|---|
| `PASS` | All seven axes clear. Non-blocking findings may travel with it. |
| `changes_required` → `ARCHITECTURE_PLANNING` | A design decision is wrong, missing, or violates a rule. |
| `changes_required_tasks` → `IMPLEMENTATION_PLANNING` | The design is sound; the decomposition, ordering or sizing is not. |
| `changes_required_specification` → `SPECIFICATION` | The plan is a fair reading of a Specification that is itself wrong or incomplete. |
| `BLOCKED` | A stale or `SUPERSEDED` input, or a blocking Open Decision. |

Choose by **where the fix belongs**. A task that edits a frozen file without the stop is a
task problem; a plan that decided to edit it at all is a design problem.

## Constraints

- **Never edit the plan or the task breakdown.** Report; the owners revise.
- Never add a missing task or design decision yourself.
- Never mark anything `APPROVED`.
- Never treat your own `PASS` as clearance past the human gate.
- Never pass a plan whose only flaw is that the Specification was weak — loop back to
  `SPECIFICATION` instead.
- English in the artifact; Ukrainian to the user.

## Verification Checklist

- [ ] All seven axes have an explicit finding or an explicit "clear".
- [ ] FR → task and task → plan-item mappings were **re-derived**, both directions.
- [ ] Every task touching a FROZEN file was checked for the §9 stop or the sibling-file
      pattern.
- [ ] Architecture Rule 2 was checked deliberately, since nothing else will catch it.
- [ ] `STORE_REGISTRY` remains the only source of locales and currency.
- [ ] Contract-before-consumer ordering holds across the prompt → schema → renderer →
      validator chain.
- [ ] Every task's tests name a runner, and component specs are named `*.component.spec.ts`.
- [ ] Scope creep was checked against the Specification's *Out of scope* section by name.
- [ ] The verdict names a `loop_back` key that exists under `PLAN_REVIEW`.
- [ ] The review states that `PASS` is not human approval.
