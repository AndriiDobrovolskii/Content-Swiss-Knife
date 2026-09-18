---
artifact: plan_review
story: US-1.1
version: 1
status: DRAFT
owner: so-plan-reviewer
created_at: 2026-09-18T00:40:00Z
updated_at: 2026-09-18T00:40:00Z
supersedes: null
inputs_consumed:
  - key: specification
    version: 1
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 1
  - key: task_breakdown
    version: 1
open_decisions_blocking: false
---

# Plan Review: US-1.1 — Restrict proxy CORS to an allow-list

**Verdict:** PASS
**Loop-back:** n/a

> `PASS` here is **not** human approval. Only `/so:approve` records that (AGENTS.md §10).

## Summary

Buildable as written. The plan resolves both edge cases the spec review left open (D4, D5),
and D3's fail-closed-by-construction decision removes the Story's highest-ranked silent-failure
risk structurally rather than with a branch that could later be edited away. Two non-blocking
findings, both about the one line of this Story that no test can observe.

## 1. Specification coverage (re-derived, both directions)

| FR / NFR | Reached by | Verdict |
|---|---|---|
| FR-1 parsing | T1 | covered |
| FR-2 exact echo | T1 | covered |
| FR-3 omission, not rejection | T1 (D6) | covered |
| FR-4 no `Origin` allowed | T1 (D5) | covered |
| FR-5 fail closed | T1 (D3) | covered |
| FR-6 preflight | T1 asserted, T2 wired (D7) | covered |
| FR-7 `.env.example` | T3 | covered |
| NFR-1 credentials off | T2 (by passing nothing, D8) | covered |
| NFR-2 no secret / real URL | T3 | covered |
| NFR-3 nothing else broken | existing suite across T1–T3 | covered — correctly, per spec review finding 1, rather than by a vacuous new test |

| Task | Traces to | Verdict |
|---|---|---|
| T1 | D1–D7 → FR-1…FR-6 | ok |
| T2 | D7, D8 → wiring | ok |
| T3 | FR-7, NFR-2 | ok |

No task traces to nothing. No requirement is unreached. Checked against the Specification's
*Out of scope* section by name: nothing in the plan touches proxy authentication, rate
limiting, endpoint behaviour or Railway configuration.

## 2. FROZEN files (AGENTS.md §9)

| Task | Files | Frozen? |
|---|---|---|
| T1 | `server/cors-policy.js` (new) | no |
| T2 | `server/index.js` | no |
| T3 | `.env.example` | no |

None of the five FROZEN paths is touched. No §9 stop is required, and the plan does not assume
an approval it does not have.

## 3. Architecture rules (AGENTS.md §3)

| Rule | Checked | Finding |
|---|---|---|
| 1 — no direct SDK outside `server/providers/` | yes | No SDK import added. `cors-policy.js` imports nothing at all. |
| **2 — retrieval separate from generation** | **yes, deliberately** | Clear. The change is uniform middleware applied to the whole app; it adds no call path between `server/retrieval/` and the generation path, and moves no code between them. Note for the record: the policy does affect `/api/retrieval/*` as well as `/api/llm/*`, which is correct — that is one middleware applying uniformly, not the two concerns being mixed. |
| 3 — prompt text out of services | yes | No prompt text involved. |
| 4 — no key in the bundle | yes | `.env.example` takes a placeholder only (T3); nothing reaches `src/`. |
| 5 — no existing feature broken | yes | NFR-3, verified by the existing suite. FR-4 specifically protects the Railway health check. |
| `STORE_REGISTRY` sole source | yes | Untouched. No locale or currency value involved. |
| `systemBlocks` not collapsed | yes | Untouched. No prompt builder involved. |

## 4. prompt → schema → renderer → validator

Not touched — no link is in scope.

**Contract-before-consumer ordering holds**: T1 creates `server/cors-policy.js`; T2 imports it.
T2 could not typecheck or run before T1, and the breakdown orders them accordingly.

## 5. Task quality

| Check | Result |
|---|---|
| All eight fields on every task | yes — T1, T2, T3 each carry track, depends-on, FROZEN, files, tests, acceptance check and notes |
| Acceptance checks observable | yes — T1 names a concrete return value, T2 names the exact diff shape, T3 names the file content |
| Each task could end in one green commit (§13) | yes |
| No task spans two tracks | yes — all three are `server` |
| Ordered by dependency and risk, riskiest first, rationale stated | yes — and the rationale is correct: T1 carries D3, D4 and D6, the three decisions that could be wrong |
| Fixture updates sit with the change that moves them | n/a — no fixture change |

## 6. Test strategy

| Check | Result |
|---|---|
| Every task names test files **and** runner | yes — `test/cors-policy.spec.ts`, `test:logic` |
| Component specs named `*.component.spec.ts` | n/a — no component test |
| Untested tasks justify themselves | **T2 — see finding 1** |
| Failure paths from the FRs are covered | yes — FR-3's (must not be an `Error`), FR-4's (must not block the health check) and FR-5's (must not yield `undefined`) each have a named assertion |
| Nothing relies on weakening or skipping a test (§7.7) | yes |

**Finding 1 (non-blocking) — the Story's actual fix is the one line with no test.**

T2 changes behaviour — it *is* the fix — and has no test. `so-implementation-planner`'s own rule
is that a task with no test is a defect unless it genuinely changes no behaviour. This task does
change behaviour, so the exemption does not strictly apply.

The reasoning is nonetheless sound and is stated openly rather than hidden: `server/index.js`
calls `app.listen()` at module scope and cannot be imported, and D1 rejected `supertest` because
adding a dependency is a §7.8 proposal requiring human approval, not a build step. For a
one-line wiring change with `so-implementation-verifier` reading the diff, that is proportionate.

**Not `CHANGES_REQUIRED`**, but recorded so the residual risk is visible at the human gate
rather than discovered later — and so that if this pattern recurs on a larger change, the
`supertest` proposal gets made to a human instead of being declined again by default.

**Finding 2 (non-blocking) — shrink the untested surface by asserting the composition.**

T1 tests `resolveAllowedOrigins` and `corsOriginPolicy` separately. T2 uses them composed:
`corsOriginPolicy(resolveAllowedOrigins(process.env.ALLOWED_ORIGINS))`.

If `so-test-writer` also asserts that **composed expression** — e.g. that
`corsOriginPolicy(resolveAllowedOrigins(undefined))` refuses `https://evil.example` and allows
`http://localhost:3000` — then the genuinely untested surface shrinks from "the policy wiring"
to the literal `app.use(cors({ origin: <already-tested value> }))` call, which is as small as it
can get without `supertest`. Cheap, and it closes most of finding 1.

## 7. Impact-analysis fidelity

The plan **consumed** the survey rather than re-deriving it: D1 explicitly picks route 1 of the
two the survey named, and cites the survey's evidence (`llm-routes.spec.ts` as the precedent,
`app.listen()` at module scope as the constraint).

Files touched vs surveyed: the survey listed `server/index.js`, `.env.example` and "a
pure-function module under `server/`, only if the planner takes route 1". The plan creates
`server/cors-policy.js`. Consistent — no file is touched that the survey did not anticipate.

## Verdict rationale

`PASS` rather than `CHANGES_REQUIRED`: both findings concern the same single line, the plan
already names it as the untested surface in its own risk table, and neither blocks
implementation or testing. Finding 2 is an addition to the test file that `so-test-writer` can
make without any plan change.

`changes_required_tasks` → `IMPLEMENTATION_PLANNING` was considered for finding 1 and rejected:
the decomposition is not wrong. The alternative — splitting T2 further, or adding a task to
introduce `supertest` — would either change nothing or require a dependency approval this Story
does not need.

## Non-blocking findings

1. **T2 changes behaviour and has no test.** Justified by the `app.listen()` constraint and the
   §7.8 dependency rule, stated openly, and mitigated by diff review. Recorded so it is visible
   at the human gate, and so the `supertest` proposal is made deliberately if this recurs.
2. **Assert the composed expression in T1's tests** to shrink the untested surface to the
   literal `app.use` call. A test-file addition, not a plan change.
