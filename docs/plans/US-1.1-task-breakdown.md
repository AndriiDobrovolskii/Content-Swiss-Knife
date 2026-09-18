---
artifact: task_breakdown
story: US-1.1
version: 1
status: DRAFT
owner: so-implementation-planner
created_at: 2026-09-18T00:35:00Z
updated_at: 2026-09-18T00:35:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 1
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 1
open_decisions_blocking: false
---

# Task Breakdown — US-1.1

## Execution order

```
T1  →  T2  →  T3
```

No parallelism. Three tasks, strictly sequential.

**Why T1 is first (risk-first).** T1 carries every design decision that could be wrong: the
fail-closed default (D3), trailing-slash normalisation (D4), and the callback contract (D6 —
`callback(null, false)` rather than an `Error`). If the `cors` package's contract is not what
D6 assumes, T1's tests fail before a single line of `index.js` is touched, and the plan can
change while changing it is still free. T2 is one line of wiring that is only meaningful once
T1 exists; T3 is documentation that describes the variable T1 reads.

**Contract before consumer** also forces this order: `server/index.js` cannot import
`server/cors-policy.js` before it exists.

---

## T1 — Create the pure CORS allow-list policy module

| | |
|---|---|
| **Track** | `server` |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

The allow-list decision becomes a pure function pair that can be unit-tested without starting
an HTTP listener: one that turns the raw environment string into a normalised, always-non-empty
list, and one that is the `origin` callback `cors` expects.

Nothing is wired up in this task. The proxy still behaves exactly as it does today.

### Files

| File | Change |
|---|---|
| `server/cors-policy.js` | **create** — exports `resolveAllowedOrigins(env)` and `corsOriginPolicy(allowed)`. Pure ESM, no imports. Comments must record D4 (exact match beyond trailing-slash normalisation) and D6 (refuse by omission, never by `Error`) where a future reader would change them. |

### Tests to turn green

Already written and **failing** when this task starts.

| Test file | Runner | Covers |
|---|---|---|
| `test/cors-policy.spec.ts` | `test:logic` | AC-1, AC-2, AC-3, AC-4 → FR-1, FR-2, FR-3, FR-4, FR-5, FR-6; plus D4 (trailing slash) and D5 (empty `Origin` string refused) |

### Acceptance check

`npx vitest run test/cors-policy.spec.ts` passes, and `resolveAllowedOrigins(undefined)`
returns exactly `['http://localhost:3000']` — not `[]`, not `undefined`, not `['*']`.

### Notes

D3 is structural, not conditional: the function must have **no** return path that yields an
empty array or `undefined`. A branch that could later be edited into returning `undefined`
re-opens the exact silent failure this Story exists to close, because `cors()` treats
`origin: undefined` as permissive `*`.

---

## T2 — Wire the policy into the proxy

| | |
|---|---|
| **Track** | `server` |
| **Depends on** | T1 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

`server/index.js` stops accepting every origin. The bare `app.use(cors())` becomes a configured
one driven by T1's policy.

### Files

| File | Change |
|---|---|
| `server/index.js` | **modify** — add the import; replace line 33 `app.use(cors())` with `app.use(cors({ origin: corsOriginPolicy(resolveAllowedOrigins(process.env.ALLOWED_ORIGINS)) }))`. **Line 33 and the import only.** Nothing else in the file. |

### Tests to turn green

**None.** This task changes no behaviour that a test in this repository can observe:
`server/index.js:241` calls `app.listen()` at module scope, so the file cannot be imported by a
test, and the plan's D1 deliberately rejected adding `supertest` (a §7.8 dependency proposal)
rather than restructure the app for it.

This is recorded, not hidden. The implementation plan names this single line as **the untested
surface of this Story**, and `so-implementation-verifier` covers it by reading the diff.

### Acceptance check

The diff for `server/index.js` is the import line plus line 33, and nothing else.
`npm run lint` clean, `npm test` green (both runners), `npm run build` clean.

### Notes

Do not add an error-throwing origin callback here, and do not "improve" the wiring with a
try/catch — FR-3 requires header omission, and T1 already implements refusal correctly.

---

## T3 — Document the setting

| | |
|---|---|
| **Track** | `server` |
| **Depends on** | T1 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

`.env.example` gains `ALLOWED_ORIGINS`, so someone configuring a deployment knows the variable
exists and what shape it takes.

### Files

| File | Change |
|---|---|
| `.env.example` | **modify** — add `ALLOWED_ORIGINS` with a **placeholder** value and a comment stating the comma-separated format and the `http://localhost:3000` default. |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `test/cors-policy.spec.ts` | `test:logic` | AC-5 → FR-7 — asserts `.env.example` names `ALLOWED_ORIGINS` and contains no real deployed URL |

### Acceptance check

The FR-7 assertion passes, and `.env.example` contains a placeholder only — no real hostname
(NFR-2, AGENTS.md §3 Rule 4).

### Notes

`.env.example` is committed; `.env` is git-ignored. A real deployed URL must not enter either
the example file or any other tracked file.

---

## Coverage

### Plan item → task

| Design decision | Task |
|---|---|
| D1 pure-function extraction | T1 |
| D2 two functions | T1 |
| D3 fail closed, no `undefined` path | T1 |
| D4 trailing-slash normalisation | T1 |
| D5 empty `Origin` refused | T1 |
| D6 refuse by omission, never `Error` | T1 |
| D7 preflight needs no separate handling | T1 (asserted), T2 (wiring) |
| D8 `credentials` stays off | T2 — by passing nothing |

### Requirement → task

| FR / NFR | Task |
|---|---|
| FR-1, FR-2, FR-3, FR-4, FR-5, FR-6 | T1 |
| FR-7 | T3 |
| NFR-1 | T2 |
| NFR-2 | T3 |
| NFR-3 | verified by the existing suite staying green across T1–T3 |

Every plan item and every requirement maps to a task. No task maps to nothing.

### Acceptance criterion → task

| AC | Task |
|---|---|
| AC-1, AC-2, AC-3, AC-4 | T1 |
| AC-5 | T3 |

AC-1 through AC-4 are reachable through T1 alone because T1 owns the behaviour; T2 wires that
behaviour into the running process, which no test in this repository can observe.
