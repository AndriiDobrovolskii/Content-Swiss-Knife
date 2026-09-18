---
name: so-builder
description: >
  Writes the implementation that turns TEST_WRITING's failing tests green, one task at a time,
  without weakening them. One composite skill with three tracks — angular (src/app,
  src/services, src/render, src/domain, src/utils), server (server/** Express proxy, providers,
  retrieval, usage), and prompt (src/prompts, src/prompt-core, which leads with the FROZEN-file
  stop). Use when a plan and its failing tests are approved and the code must be written
  ("implement US-x.y", "build task T3"). Owns the IMPLEMENTATION stage and the pipeline_status
  artifact. Builds only what task_breakdown names; it does not decide architecture
  (so-planner), does not write or modify tests (so-test-writer), and does not run the full
  gate (so-gate-enforcer).
---

# so-builder

## Purpose

Turn red tests green. Nothing else.

The design is decided (`implementation_plan`), the work is ordered (`task_breakdown`), and the
tests exist and fail (`TEST_WRITING`). This skill writes the code that makes a named task's
tests pass — and the definition of success is narrow on purpose: **those tests pass, and every
test that passed before still passes.**

## Operational Contract

```
Precondition:     HUMAN_PLAN_APPROVAL approved; TEST_WRITING returned PASS with failing tests.
Input Artifacts:  story, specification, open_decisions, impact_analysis, implementation_plan,
                  task_breakdown, plan_review, test_strategy, ac_test_matrix.
Output Artifacts: pipeline_status  (docs/catalog/{story_id}-pipeline-status.md)
                  plus the source files the task names.
Resolve every artifact path from docs/workflow/artifact-paths.yaml. Never hard-code one.
```

One dispatch per task. Record each task's outcome in `pipeline_status` as it completes —
**not** in `workflow-state.yaml`, which only `so-orchestrator` writes.

## Scope discipline

Build **only what the current task names.** Not the next task, not something adjacent that
looks broken, not a refactor of code you had to read.

- No drive-by refactors, renames or reformatting of untouched files (AGENTS.md §7.8).
- No removing a comment you do not understand.
- No "while I was in here" improvements.

If the task cannot be completed as written, stop and report. Do not substitute a different
task.

---

## Track: `angular`

`src/app`, `src/services`, `src/render`, `src/domain`, `src/utils`.

**Match the surrounding code.** This codebase has a settled style; mirror it rather than
introducing a second way to do something that already has one:

- Standalone components, `signal()` / `computed()` / `effect()` / `input()` / `output()`,
  field-level `inject()`. **`NgModule` is forbidden** — the repo has zero.
- `ChangeDetectionStrategy.OnPush` where the plan calls for it.
- **RxJS only at the HTTP boundary** (`src/services/http-retry.ts`). No `BehaviorSubject`
  state; signals are the state mechanism here.
- `src/domain/*.schema.ts` is Zod. A schema change must keep the corpus fixtures in
  `test/fixtures/corpus/` parsing, or the task must say they are regenerated and why.
- Renderers (`src/render/render-{description,consumables}.ts`) emit the canonical HTML
  structure directly — the `<figure>` wrapping, first-image-eager/rest-lazy, video figures.
  Whatever you change there is checked against AGENTS.md §4.
- `STORE_REGISTRY` stays the only source of locales, currency and image base URLs. Never
  hard-code a language list or a currency symbol anywhere else.

## Track: `server`

`server/**`. Plain ESM JavaScript, not TypeScript.

- **This is where secrets live and where they stay.** Never let a key, or a payload containing
  one, reach a response body, a log line, or anything the browser sees (AGENTS.md §3 Rule 4).
- Real SDK calls belong in `server/providers/` and nowhere else (Rule 1). Adding a provider is
  a new class plus a `case` in `factory.js` plus `.env.example` — no Angular change.
- Retrieval (`server/retrieval/`) stays separate from generation (Rule 2). **Nothing checks
  this automatically** — not arch-guard, not the tests. Mixing them here ships.
- `server/usage/store.js` has **no migration mechanism**. Its schema is
  `CREATE TABLE IF NOT EXISTS`, so adding a column silently no-ops against an existing
  database. If the task adds one, implement what the plan decided about existing installs —
  do not assume the table will be recreated.

## Track: `prompt`

`src/prompts`, `src/prompt-core`.

### Read this before touching anything

**FROZEN files (AGENTS.md §9):**

```
src/prompts/task-a.ts
src/prompts/task-b.ts
src/prompts/task-c.ts
src/prompt-core/master-system-prompt.ts
src/utils/output-validator.ts
```

If the task requires changing one of these, you **MUST**:

1. **STOP.**
2. Tell the user exactly what change is needed and why.
3. **Wait for explicit approval** before proceeding.

Refactoring a service that imports them does not authorize editing them. Fixing a bug
elsewhere does not authorize editing them. A task that names a frozen file should already
carry this stop from `so-implementation-planner`; if it does not, perform the stop anyway.

**The sibling-file pattern is usually the right answer** and is well established here:
`task-a-doc.ts` and `task-a-consumables-doc.ts` exist because `task-a.ts` is frozen;
`image-manifest-coverage.ts` and `heading-style.ts` exist because `output-validator.ts` is. If
the plan chose this, follow it.

After an approved frozen-file change: `bash arch-guard.sh --rebaseline`, and commit
`.arch-guard-checksums` in the same commit as the edit.

### The rest of the prompt track

- New prompts go in `src/prompts/`, never as strings inside a service (Rule 3).
- Every builder returns a `PromptPayload` (`src/prompt-core/payload.ts`).
- **Do not collapse `systemBlocks` into `userContent`** — `cache: true` on system blocks is
  what makes Anthropic prompt caching work, and collapsing them breaks the economics
  (AGENTS.md §3).
- A prompt change that alters what the model produces must keep the Zod schema, the renderer
  and the validator in agreement. That chain is the plan's problem to have decided and yours
  to implement faithfully.

---

## Definition of done, per task

1. The task's named tests **pass**.
2. Every test that passed before still passes — both runners.
3. `npm run lint` is clean.
4. The task ends in **one commit**: a complete, working change, not a checkpoint
   (AGENTS.md §13).

If you cannot reach that state, the task is mis-scoped — report it rather than committing a
half-state.

## Never weaken a test to go green

This is the failure this whole pipeline exists to prevent (AGENTS.md §7.7). Forbidden:
deleting a failing test, `skip` / `only` / `todo` over a real defect, commenting out an
assertion, relaxing an expected value to match what the code happens to produce, lowering a
coverage threshold, narrowing the coverage `include`.

A test that seems wrong is a finding to report — `loop_back_stage: changes_required_tests` →
`TEST_WRITING` — not a test to edit. **You do not own the test files.**

## Result Envelope

`stage: IMPLEMENTATION`, `skill: so-builder`. Available `loop_back` keys: `partial` →
`IMPLEMENTATION`, `blocked_by_plan` → `IMPLEMENTATION_PLANNING`, `blocked_by_architecture` →
`ARCHITECTURE_PLANNING`, `changes_required_tests` → `TEST_WRITING`.

Use `blocked_by_architecture` when the plan's design cannot work as specified — do not
redesign it here.

## Constraints

- Never modify a test file, a fixture, or `vitest.config.ts` coverage settings.
- Never edit a FROZEN file without the §9 stop and explicit approval.
- Never edit `arch-guard.sh` or run `--rebaseline` to silence an unapproved change.
- Never write outside the files the current task names.
- Never add a dependency — that is a §7.8 proposal, not a build step.
- Never write `workflow-state.yaml` or `history.jsonl`.
- Never commit with `--no-verify`.
- English in code and comments; Ukrainian to the user.

## Verification Checklist

- [ ] Only the files this task names were changed.
- [ ] The task's named tests pass, and were actually run.
- [ ] Both runners are green — `test:logic` and `test:components`.
- [ ] No test file, fixture or coverage setting was modified.
- [ ] `npm run lint` is clean.
- [ ] No FROZEN file changed, or the §9 stop was performed and approval recorded.
- [ ] No `STORE_REGISTRY` value was hard-coded elsewhere.
- [ ] `systemBlocks` / `userContent` separation intact if a prompt builder changed.
- [ ] No secret can reach the browser bundle or a log line.
- [ ] `pipeline_status` records this task's outcome.
- [ ] The change is one coherent commit, not a checkpoint.
