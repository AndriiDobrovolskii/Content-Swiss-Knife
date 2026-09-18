---
artifact: task_breakdown
story: US-1.1
version: 2
status: APPROVED
owner: so-implementation-planner
created_at: 2026-09-18T00:35:00Z
updated_at: 2026-09-18T17:00:00Z
supersedes: docs/plans/US-1.1-task-breakdown.md#1
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: impact_analysis
    version: 2
  - key: implementation_plan
    version: 2
open_decisions_blocking: false
---

# Task Breakdown — US-1.1 (version 2)

## Why this version exists

Version 1 recorded `story` v1, `specification` v1, `impact_analysis` v1 and
`implementation_plan` v1 in `inputs_consumed`, and was stale the moment the Story was amended to
v2 after `RECONCILIATION` returned `story_drift`. This revision is re-recorded against Story v2,
Specification v2 (`APPROVED`), Impact Analysis v2 and Implementation Plan v2.

**This is a re-record, not a re-decomposition.** Implementation Plan v2 states that *"none of
D1 … D8 changed"* and that its three added decisions — D9, D10, D11 — *"produce no task and no
file change"*, closing with the instruction that `so-implementation-planner` **should derive no
work from them**. Impact Analysis v2 states the requirement surface did not move: *"FR-1 … FR-7
and NFR-1 … NFR-3 are unchanged between Specification v1 and v2"*. A decomposition bounded by the
same decisions and the same requirements therefore yields the same three tasks, in the same
order, on the same tracks.

**A fourth task was considered and is not created.** See *The fourth task that is not here*
below, which argues it explicitly rather than leaving the absence unremarked.

## Tense: these tasks are already delivered

Every task below is **delivered and verified**, so this document is written about completed work.
Each task carries a **Status** row naming its commit. Where the template says a task's tests
"already exist and are failing when this task starts", that was true **when the task ran** and is
recorded historically: `so-test-writer` wrote `test/cors-policy.spec.ts` and it was failing at
the start of T1; it is green now.

The AGENTS.md §6 gate is green, and the change has since passed implementation verification,
security review and AC reconciliation. The evidence for the suite's state is
`docs/verification/US-1.1-quality-gate-report.md`; this document cites it rather than re-running
anything, because running the gate is `so-gate-enforcer`'s stage, not this one.

---

## Execution order

```
T1  →  T2  →  T3
```

No parallelism. Three tasks, strictly sequential. Order unchanged from version 1, and the
delivered commit order (`dc29f40` → `540a676` → `68dea71`) matches it.

**Why T1 is first (risk-first).** T1 carries every design decision that could have been wrong:
the fail-closed default (D3), trailing-slash normalisation of configuration (D4), and the
callback contract (D6 — `callback(null, false)` rather than an `Error`). If the `cors` package's
contract had not been what D6 assumes, T1's tests would have failed before a single line of
`index.js` was touched, while changing course was still free. T2 is one line of wiring that is
only meaningful once T1 exists; T3 documents the variable T1 reads.

**Contract before consumer** also forces this order: `server/index.js` cannot import
`server/cors-policy.js` before it exists.

**Independence note, for information rather than reordering.** T3's own assertion — the
`.env.example` describe block — does not import `server/cors-policy.js` and is technically
independent of T1. The `depends-on: T1` edge is carried forward unchanged from version 1: no v2
input delta justifies re-deciding an ordering edge, and the delivered order followed it.

---

## T1 — Create the pure CORS allow-list policy module

| | |
|---|---|
| **Track** | `server` |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | no — no file in this task appears in the §9 list or in `.arch-guard-checksums` |
| **Status** | **Delivered** — commit `dc29f40` |

### What changes

The allow-list decision becomes a pure function pair that can be unit-tested without starting an
HTTP listener: one that turns the raw environment string into a normalised, always-non-empty
list, and one that is the `origin` callback `cors` expects.

Nothing is wired up in this task. The proxy still behaves exactly as it does today.

### Files

| File | Change |
|---|---|
| `server/cors-policy.js` | **create** — exports `resolveAllowedOrigins(raw)` and `corsOriginPolicy(allowed)`. Pure ESM, no imports. Comments must record D4 (exact match, beyond trailing-slash normalisation of *configuration*) and D6 (refuse by omission, never by `Error`) where a future reader would go to change them. |

### Tests to turn green

Written by `so-test-writer` and **failing when this task started**; green now, committed at
`7b117e2`. Turned green without weakening them (AGENTS.md §7.7).

| Test file | Runner | Covers |
|---|---|---|
| `test/cors-policy.spec.ts` — the `resolveAllowedOrigins`, `corsOriginPolicy` and composed-middleware describe blocks | `test:logic` | AC-1, AC-2, AC-3, AC-4 → FR-1, FR-2, FR-3, FR-4, FR-5, FR-6; plus D4 (trailing slash on configuration), D5 (empty `Origin` string refused), NFR-1 (no `Access-Control-Allow-Credentials`) |

### Acceptance check

`npx vitest run test/cors-policy.spec.ts` passes for those describe blocks, and
`resolveAllowedOrigins(undefined)` returns exactly `['http://localhost:3000']` — not `[]`, not
`undefined`, not `['*']`.

### Notes

D3 is structural, not conditional: the function must have **no** return path that yields an empty
array or `undefined`. A branch that could later be edited into returning `undefined` re-opens the
exact silent failure this Story exists to close, because `cors()` treats a falsy `origin` as
permissive `*`.

D4 normalises **operator-supplied configuration only**. The incoming `Origin` is compared
verbatim; nothing an attacker controls is normalised.

---

## T2 — Wire the policy into the proxy

| | |
|---|---|
| **Track** | `server` |
| **Depends on** | T1 |
| **FROZEN (AGENTS.md §9)** | no — `server/index.js` is not a §9 file |
| **Status** | **Delivered** — commit `540a676` |

### What changes

`server/index.js` stops accepting every origin. The bare `app.use(cors())` becomes a configured
one driven by T1's policy.

### Files

| File | Change |
|---|---|
| `server/index.js` | **modify** — add the import of `resolveAllowedOrigins` and `corsOriginPolicy` from `./cors-policy.js`, and replace the pre-change line 33 `app.use(cors())` with `app.use(cors({ origin: corsOriginPolicy(resolveAllowedOrigins(process.env.ALLOWED_ORIGINS)) }))`. **Those two lines only.** The added import shifts the wiring down by one, so it sits at line 34 after the change. |

### Tests to turn green

**None.** This task changes no behaviour that a test in this repository can observe:
`server/index.js` calls `app.listen()` at module scope, so the file cannot be imported by a test,
and D1 deliberately rejected adding `supertest` (an AGENTS.md §7.8 dependency proposal) rather
than restructure the app for it.

This is recorded, not hidden. Implementation Plan v2 names this single line as **the untested
surface of this Story** (Risk 1), and `so-implementation-verifier` covers it by reading the diff.
Security review Finding 1 carries the same point.

### Acceptance check

The diff for `server/index.js` is the import line plus the one wiring line, and nothing else.
`npm run lint` clean, `npm test` green (both runners), `npm run build` clean.

### Notes

Do not add an error-throwing origin callback here, and do not "improve" the wiring with a
try/catch — FR-3 requires header omission, and T1 already implements refusal correctly.

Pass no `credentials` option: NFR-1 is satisfied by leaving the `cors` default of `false` alone
(D8). Adding it "for completeness" is the likeliest wrong turn on a future edit.

---

## T3 — Document the setting

| | |
|---|---|
| **Track** | `server` |
| **Depends on** | T1 |
| **FROZEN (AGENTS.md §9)** | no — `.env.example` is not a §9 file |
| **Status** | **Delivered** — commit `68dea71` |

### What changes

`.env.example` gains `ALLOWED_ORIGINS`, so someone configuring a deployment knows the variable
exists and what shape it takes.

### Files

| File | Change |
|---|---|
| `.env.example` | **modify** — add `ALLOWED_ORIGINS` with a **placeholder** value and a contiguous comment block immediately above it stating the comma-separated format, the `http://localhost:3000` default and the fail-closed behaviour. |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `test/cors-policy.spec.ts` — the `.env.example documents ALLOWED_ORIGINS` describe block | `test:logic` | AC-5 → FR-7, NFR-2 — the variable is present, the comment above it names the format, and the value is a placeholder only |

### Acceptance check

That describe block passes, and `.env.example` contains a placeholder only — no real hostname
(NFR-2, AGENTS.md §3 Rule 4).

### Notes

`.env.example` is committed; `.env` is git-ignored. A real deployed URL must not enter either the
example file or any other tracked file.

**The comment block is load-bearing (plan v2 D11, Risk 4).** The test locates the line matching
`/^\s*ALLOWED_ORIGINS\s*=/` and reads the **unbroken** comment block immediately above it.
Inserting a blank line into that block, or reordering `.env.example` so another setting's comment
abuts the variable, fails `npm run test:logic` without changing any behaviour. Nothing in
`.env.example` itself says a test reads it.

---

## The fourth task that is not here

The re-run brief asked that a fourth task, if one were needed, be argued loudly. **No fourth task
is created, and this is the argument for that.**

| Added decision | Would it generate work? | Why not |
|---|---|---|
| **D9** — the unpinned `cors` preflight status default | **No task, no file change** | Plan v2 decides to *accept and record* the risk. Its own §D9 rejects both counter-measures by name: pinning `cors` to an exact `2.8.6` is an AGENTS.md §7.8 dependency proposal a human must make, and directing a preflight-status assertion into `test/cors-policy.spec.ts` is out of this stage's authority twice over — tests are `so-test-writer`'s artifact, and the 24 existing tests are green and reconciled. The control is a **review-time** one: Impact Analysis v2's *needs re-verification* row on `package.json` / `package-lock.json`. A review-time control is not a task. |
| **D10** — `README.md` | **No change in this Story at all** | Plan v2 argues it OUT of scope and records it as a follow-up Story. FR-7 and AC-5 name `.env.example` and nothing else, so a README task would be **untraceable to any acceptance criterion** — a task whose completion no AC can confirm and whose absence no AC reports. Adding it to a plan derived from an `APPROVED` Specification is scope creep of exactly the shape `so-plan-reviewer` checks for, and AGENTS.md §7.8 item 8 lists unilateral scope changes among the things to propose, not execute. |
| **D11** — `.env.example` as a parsed test fixture | **No task, no file change** | Plan v2 decides to *leave the coupling in place*: it is what makes AC-5 and NFR-2 assertable at all. It is a standing consequence recorded in Risks (Risk 4), carried into T3's Notes above so a builder editing that file knows. A risk entry is not a task. |

Creating any of the three would mean plan v2 is wrong about its own decisions, and would put new
scope onto an `APPROVED` Specification after it has already been reconciled against AC-1 … AC-5.
Neither is this stage's call to make. If a human wants D10 inside US-1.1, that is a scope decision
for the plan gate, and plan v2 says so in the same words.

---

## Coverage

### Plan item → task

| Design decision | Task |
|---|---|
| D1 pure-function extraction, not `supertest` | T1 |
| D2 two functions | T1 |
| D3 fail closed, no `undefined`/`[]` path | T1 |
| D4 trailing-slash normalisation of configuration; exact match on the `Origin` | T1 |
| D5 empty `Origin` string refused | T1 |
| D6 refuse by omission, never `Error` | T1 |
| D7 preflight needs no separate handling | T1 (asserted), T2 (wiring) |
| D8 `credentials` stays off | T2 — by passing nothing |
| **D9** unpinned `cors` preflight status: accept and record | **no task** — plan v2 §D9: no file change; the control is Impact Analysis v2's re-verification row on `package.json` / `package-lock.json` |
| **D10** `README.md` out of scope | **no task** — plan v2 §D10: follow-up Story, no change in US-1.1 |
| **D11** `.env.example` is a parsed fixture | **no task** — plan v2 §D11 and Risk 4: a standing risk; surfaced in T3's Notes |

Every plan item is mapped. The three that map to **no task** are discharged explicitly on plan
v2's own authority (*"produce no task and no file change; `so-implementation-planner` should
derive no work from them"*), not omitted.

### Plan file → task

| File | Task |
|---|---|
| `server/cors-policy.js` | T1 |
| `server/index.js` | T2 |
| `.env.example` | T3 |
| `test/cors-policy.spec.ts` | none — `so-test-writer`'s artifact, written before `IMPLEMENTATION` (delivered at `7b117e2`) |

### Requirement → task

| FR / NFR | Task |
|---|---|
| FR-1, FR-2, FR-3, FR-4, FR-5, FR-6 | T1 (behaviour), T2 (wiring that puts it in the request path) |
| FR-7 | T3 |
| NFR-1 | T2 — by passing no `credentials` option; asserted through T1's composed-middleware block |
| NFR-2 | T3 |
| NFR-3 | no task of its own — discharged by the pre-existing suite staying green across T1–T3, per plan v2 *Validation strategy* |

### Acceptance criterion → task

| AC | Task |
|---|---|
| AC-1, AC-2, AC-4 | T1 |
| AC-3 | T1 (the origin-less pass-through at middleware level); the `GET /health` `200` leg is verified by diff review on T2, not by test — NBF-1, plan v2 *Validation strategy* |
| AC-5 | T3 |

Every FR, NFR and AC is reachable through a task or is explicitly discharged without one. No task
maps to nothing.

### Task → plan item (the reverse direction)

| Task | Plan items it discharges |
|---|---|
| T1 | D1, D2, D3, D4, D5, D6, D7 (behaviour); FR-1 … FR-6; the `server/cors-policy.js` file row |
| T2 | D7 (wiring), D8; NFR-1; the `server/index.js` file row |
| T3 | FR-7, NFR-2; the `.env.example` file row |

No task maps to nothing, and no task discharges a plan item the implementation plan does not
contain.

### Task → commit

| Task | Commit | Verified by |
|---|---|---|
| T1 | `dc29f40` | `docs/verification/US-1.1-quality-gate-report.md`, `docs/verification/US-1.1-verification-report.md` |
| T2 | `540a676` | as above, plus `docs/reviews/security/US-1.1-security-review.md` (the untested line, Finding 1) |
| T3 | `68dea71` | as above, plus `docs/reconciliation/US-1.1-reconciliation-report.md` (AC-5) |
| — (tests, `so-test-writer`) | `7b117e2` | `docs/tests/US-1.1-ac-test-matrix.md` |
