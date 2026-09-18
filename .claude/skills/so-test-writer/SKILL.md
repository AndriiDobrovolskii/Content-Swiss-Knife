---
name: so-test-writer
description: >
  Writes the tests for an approved plan BEFORE any implementation exists, and leaves them
  failing — the TDD gate AGENTS.md §5 makes mandatory. Produces the test strategy, the test
  files themselves, and the AC ↔ test traceability matrix that so-reconciliation-reviewer
  checks at the end of the pipeline. Use when a plan is approved and the tests must exist
  before code ("write the tests for US-x.y"). Owns the TEST_WRITING stage and the
  test_strategy, ac_test_matrix and test_generation_report artifacts. Tests assert observable
  behaviour, never toBeTruthy() alone. Does not write implementation code (so-builder) and
  does not run the full gate (so-gate-enforcer).
---

# so-test-writer

## Purpose

Write the tests that do not pass yet.

This stage runs **before** `IMPLEMENTATION` for a reason: a test written after the code it
tests is a description of what the code does, not a check on whether it does the right thing.
By the time this stage ends, every acceptance criterion has a test, and **those tests fail**.

A suite that passes at the end of this stage is not good news. It is evidence the tests do not
exercise the new behaviour, and it is a defect in this stage's output.

## Operational Contract

```
Precondition:     HUMAN_PLAN_APPROVAL approved. No implementation for this Story exists yet.
Input Artifacts:  story, specification, impact_analysis, implementation_plan, task_breakdown,
                  plan_review.
Output Artifacts: test_strategy, ac_test_matrix, test_generation_report
                  plus the test files themselves, beside the code they test.
Resolve every artifact path from docs/workflow/artifact-paths.yaml. Never hard-code one.
```

## The two runners — get the filename right

| Runner | Command | Picks up | Environment |
|---|---|---|---|
| logic | `npm run test:logic` | everything **except** `*.component.spec.ts` | `happy-dom`, no Angular compilation |
| components | `npm run test:components` | `**/*.component.spec.ts` only | Angular `unit-test` builder, TestBed available |

**The filename suffix is the only boundary.** A component test not named
`*.component.spec.ts` is picked up by the logic runner, which does not compile Angular — it
will fail for a reason that has nothing to do with the code under test, and the failure is
deeply confusing. Get this right first.

Tests live beside the code: `src/utils/foo.ts` → `src/utils/foo.spec.ts`.

## How to test each layer here

### Pure logic (`src/utils`, `src/render`, `src/domain`, `src/prompt-core`, `src/prompts`)

Plain Vitest under the logic runner. This is most of the codebase and most of the tests.

### Angular **services** — `Injector.create`, not TestBed

Services here use **field-level `inject()`**, which needs an active injection context but none
of TestBed's rendering machinery. The established pattern in this repository (see
`src/services/content-orchestrator.ua-doc-pipeline.spec.ts`, which documents its own reasoning
at the top):

```ts
import '@angular/compiler';        // MUST come first — partially-compiled Angular libs fall
                                   // back to JIT at import time, and JIT needs the compiler
import { Injector } from '@angular/core';

const injector = Injector.create({ providers: [ /* real or stub tokens */ ] });
const service = injector.get(ContentOrchestratorService);
```

This is the same DI Angular uses at runtime, without pulling in TestBed, zone.js or
platform-browser-dynamic. **Follow it.** Do not introduce TestBed into a service spec, and do
not name a service spec `*.component.spec.ts` to get TestBed — that is fighting the design.

### Angular **components** — `@testing-library/angular`

Under the components runner. Query the way a user finds things — `getByRole`, `getByText`,
accessible names — not by CSS class or internal field. Drive with
`@testing-library/user-event`. Assert what the user observes: rendered text, an emitted
output, a signal the interaction changed.

`src/app/components/model-settings/model-settings.component.spec.ts` is the worked example.

### Server (`server/**`)

Plain `.js` ESM, tested from `test/*.spec.ts` (there are no co-located server tests — see
`test/llm-routes.spec.ts`, `test/retry.spec.ts`, `test/usage-store.spec.ts`). `usage-store`
runs against a real in-memory sqlite via `USAGE_DB_PATH=':memory:'` rather than a mock, which
is the preferred shape: exercise the real DDL.

## What a test must assert

**Behaviour, not existence.** `expect(x).toBeTruthy()` as a test's only assertion is a defect
(AGENTS.md §5, §7.7). So is asserting on output copied from an actual run — that pins current
behaviour, including current bugs, and proves nothing about what was specified.

Write the assertion from the **acceptance criterion**, not from the implementation the plan
proposes. If the criterion says `meta_description` ends with the CTA ➔ and is ≤ 155
characters, that is the assertion — not "the function returns a string".

## Fixtures

**Reuse before inventing.** `test/fixtures/corpus/` holds hand-verified artifacts as
`.ctx.json` / `.doc.json` / `.uk-UA.html` triples, already shared by
`render-reconciliation.spec.ts`, `render-description.spec.ts` and the orchestrator specs. A
new fixture that duplicates one of those is one more thing to keep in sync.

If the Story genuinely needs coverage the corpus does not have, say so in the test generation
report — `test/render-reconciliation.report.md` §5 already records that the corpus is only two
items covering the same product across two stores, so this is a known gap, not a surprise.

## Determinism

No `sleep`, no retry-until-pass, no unseeded randomness, no network. Async assertions use
`findBy*` / `waitFor`, never a fixed `setTimeout`. Anything time-dependent takes an injected
clock or a frozen value. A flaky test is worse than no test: it trains people to re-run.

## Never mock the unit under test

Mock the boundary, not the code being tested. `vi.mock()` on the component, service or
function actually under test defeats the test. Prefer a real `providedIn: 'root'` signal
store, a real in-memory sqlite, a real fixture, over a stub of the thing you are checking.

## Prove the tests fail

Before returning, **run them and observe the failures.** Record the actual output in the test
generation report. A test claimed to be failing but never executed is the exact
"reporting a check without running it" violation AGENTS.md §6 calls the most serious one
available.

Check the failures are for the **right reason** — "expected 155, got 168" is the right reason;
"cannot find module" is a broken test, not a red one.

## Outputs

- **Test files**, beside the code they test, correctly named for their runner.
- **`test_strategy`** — what is tested at which level, which runner, and what is deliberately
  not unit-tested (with why).
- **`ac_test_matrix`** — every `AC-n` → the test file and the test name that proves it. This
  is the artifact `so-reconciliation-reviewer` checks at the end, and it checks that the named
  test *actually asserts* the criterion, not merely that it exists. Use the exact `AC-n` ids
  from the Story.
- **`test_generation_report`** — the observed failing output, plus any coverage gap found.

## Result Envelope

`stage: TEST_WRITING`, `skill: so-test-writer`. Available `loop_back` keys:
`changes_required_tests` → `TEST_WRITING`, `invalid_specification` → `SPECIFICATION`,
`invalid_plan` → `ARCHITECTURE_PLANNING`.

Use `invalid_specification` when an acceptance criterion cannot be turned into an assertion
without inventing something — that is the criterion's fault, and inventing the missing detail
here is how a specification silently drifts from what was asked.

## Constraints

- **Never write implementation code.** If a test needs a function that does not exist, that is
  correct — the test fails on it, and `so-builder` creates it.
- Never write a test that passes at this stage against unimplemented behaviour.
- Never weaken an existing test, skip it, or exclude a file from coverage (§7.7).
- Never assert on output copied from an actual run.
- Never mock the unit under test.
- Never invent an acceptance criterion the Specification does not contain.
- English in the artifacts and test names; Ukrainian to the user.

## Verification Checklist

- [ ] Every component spec is named `*.component.spec.ts`; every other spec is not.
- [ ] Service specs use `Injector.create`, with `import '@angular/compiler'` first.
- [ ] Every `AC-n` appears in the matrix with a real test file and test name.
- [ ] Every assertion was written from the criterion, not from the proposed implementation.
- [ ] No test's only assertion is `toBeTruthy()`.
- [ ] No assertion is copied from actual output.
- [ ] Existing corpus fixtures were reused where they fit; any new one is justified.
- [ ] No `sleep`, no unseeded randomness, no network.
- [ ] The tests were **actually run** and the failing output is recorded.
- [ ] Each failure is for the right reason, not a missing import.
- [ ] Pre-existing tests still pass — the new ones are the only red.
