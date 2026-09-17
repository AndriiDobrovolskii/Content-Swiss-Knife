---
name: so-implementation-planner
description: >
  Decomposes an approved architectural plan into ordered, individually verifiable tasks — each
  naming its track (angular | server | prompt), the files it touches, its acceptance check,
  and its dependencies. Use when the architectural plan is written and the work needs to be
  broken into executable units ("break down US-x.y", "task breakdown for this plan"). Owns the
  IMPLEMENTATION_PLANNING stage and the task_breakdown artifact. Decides execution ORDER and
  per-task track assignment; it does not decide architecture (so-planner), does not write
  tests (so-test-writer), and does not write code (so-builder).
---

# so-implementation-planner

## Purpose

Turn a plan into a sequence someone can execute one step at a time, where each step ends in a
state that can be checked.

The unit of work here is not "a file" and not "a feature" — it is **a change small enough to
verify and large enough to be worth verifying**. A task whose acceptance check is "the code
compiles" is too small. A task whose acceptance check is "the Story works" is too large.

## Operational Contract

```
Precondition:     ARCHITECTURE_PLANNING returned PASS. The plan is current.
Input Artifacts:  story, specification, impact_analysis, implementation_plan.
Output Artifacts: task_breakdown
Template:         assets/task-template.md
Resolve every path from docs/workflow/artifact-paths.yaml. Never hard-code one.
```

## Every task states

| Field | Requirement |
|---|---|
| **Id** | `T1`, `T2`, … Stable; referenced by `pipeline_status` and by `so-builder`. |
| **Title** | One line, imperative. |
| **Track** | `angular` \| `server` \| `prompt`. Per task, not per Story — a Story's own `track` is only the primary one. |
| **Files** | The files this task creates or modifies, from the plan and impact analysis. |
| **Depends on** | Task ids that must complete first, or `none`. |
| **Acceptance check** | How a human or a gate sees this task is done. Observable. |
| **Tests** | Which test files cover it, and **which runner** they run in. |
| **FROZEN** | `no`, or the named file plus the §9 stop this task must perform. |

## Ordering

There is no layer ordering to obey here — this codebase has no schema → repository → service →
router chain to respect. Order by **dependency and by risk**:

1. **The riskiest decision first.** If the plan contains an assumption that might not hold,
   the task that proves or breaks it goes first, while changing course is still cheap.
2. **Contract before consumer.** A Zod schema or `PromptPayload` change lands before the code
   that depends on the new shape, so the dependent task compiles against something real.
3. **Within the prompt → schema → renderer → validator chain, follow the chain.** A renderer
   task that lands before its schema task will not typecheck.
4. **Fixtures with the change that moves them**, not in a separate cleanup task — a corpus
   fixture updated in isolation is indistinguishable from an accidental regression.
5. **Independent tasks in any order**, but say they are independent. That is information the
   builder can use.

Do not order by file, by directory, or by "easy things first".

## Task sizing

- One task = one commit, per AGENTS.md §13: a complete, working change with the gate passing —
  not a checkpoint. If a task cannot end with lint, tests and build green, it is two tasks or
  it is mis-scoped.
- A task that touches more than one track is almost always two tasks. Split it and record the
  dependency.
- A task with no test is a defect unless it genuinely changes no behaviour (a comment, a
  rename with no semantics). Say which case it is.

## The TDD ordering constraint

`TEST_WRITING` runs **before** `IMPLEMENTATION` as a whole stage: the tests exist and fail
before any task runs. So a task's `Tests` field names test files that **will already exist**
and be failing when the builder picks the task up. The task's job is to turn those specific
tests green without weakening them (AGENTS.md §7.7).

If a task has no failing test to turn green, either `so-test-writer` has a gap — which is a
finding for `so-plan-reviewer` — or the task changes no behaviour.

## Coverage of the plan

Every design decision and every file named in the `implementation_plan` appears in at least
one task. Every `FR-n` in the Specification is reachable through the task list. A plan item
with no task is work that will not happen; a task with no plan item is scope creep. Both are
findings, not things to smooth over.

## Output

The `task_breakdown` artifact, front matter per `artifact-schema.md`:

- **Execution order** — the task ids in sequence, with parallelisable groups marked.
- **Tasks** — one section each, using `assets/task-template.md`.
- **Coverage table** — plan item / `FR-n` → task ids, both directions.
- **Risk-first rationale** — one line on why the first task is first.

## Result Envelope

`stage: IMPLEMENTATION_PLANNING`, `skill: so-implementation-planner`. The single `loop_back`
key here is `changes_required_architecture` → `ARCHITECTURE_PLANNING`. Use it when the plan
cannot be decomposed — a decision is missing, or two decisions contradict each other. Do not
invent the missing decision.

## Constraints

- Never make an architectural decision. If the plan does not say, loop back.
- Never write code, tests or fixtures.
- Never create a task whose acceptance check is not observable.
- Never assign a task to a track the plan's files do not belong to.
- Never plan a task that edits a FROZEN file without carrying the §9 stop into the task itself.
- Never batch unrelated changes into one task to reduce the count (AGENTS.md §7.8, §13).
- English in the artifact; Ukrainian to the user.

## Verification Checklist

- [ ] Every task has all eight fields, including runner-qualified tests.
- [ ] Every task's acceptance check is observable.
- [ ] Every task could end in a commit with the gate green.
- [ ] No task spans two tracks.
- [ ] Ordering is by dependency and risk, with the riskiest decision first and its rationale
      stated.
- [ ] Contract-before-consumer holds across the prompt → schema → renderer → validator chain.
- [ ] Fixture updates sit with the change that moves them.
- [ ] Every plan item and every `FR-n` maps to at least one task, and no task maps to nothing.
- [ ] Any FROZEN-file task carries the §9 stop.
- [ ] Tasks reference test files that `TEST_WRITING` will have created and left failing.
