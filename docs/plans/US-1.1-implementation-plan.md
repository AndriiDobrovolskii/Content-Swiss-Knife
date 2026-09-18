---
artifact: implementation_plan
story: US-1.1
version: 1
status: DRAFT
owner: so-planner
created_at: 2026-09-18T00:30:00Z
updated_at: 2026-09-18T00:30:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 1
  - key: open_decisions
    version: 1
  - key: impact_analysis
    version: 1
open_decisions_blocking: false
---

# Implementation Plan — US-1.1

## Approach

Extract the allow-list decision into a **pure, testable module** (`server/cors-policy.js`) that
exports two functions: one that turns the raw environment value into a normalised list, and one
that is the `origin` callback the `cors` package expects. `server/index.js` changes by a single
line: `app.use(cors())` becomes `app.use(cors({ origin: originPolicy(...) }))`.

All seven functional requirements are then properties of a function that a unit test can call
directly, and the one file that cannot be imported by a test keeps only wiring.

## Design decisions

### D1 — Pure-function extraction, not `supertest`

The impact analysis named two routes. **Route 1 is taken.**

`server/index.js:241` calls `app.listen()` at module scope, so the file cannot be imported by a
test. Every existing `server/**` test already works around this by importing a pure function —
`test/llm-routes.spec.ts` imports `resolveRequest` and `slotFor` from `server/llm-request.js`
and states that intent in its own header comment. This Story follows that precedent exactly.

**Rejected: introducing `supertest`.** It is a new dependency, which AGENTS.md §7.8 makes a
proposal requiring explicit human approval rather than a build step, and it would additionally
require restructuring `index.js` to export the app without listening. That is a larger change
than the Story it would serve, and it would introduce a second, competing way to test server
code alongside the established one.

### D2 — Two functions, not one

```js
// server/cors-policy.js
export function resolveAllowedOrigins(env)   // string | undefined  ->  string[]
export function corsOriginPolicy(allowed)    // string[]  ->  (origin, cb) => void
```

Splitting them means FR-1 and FR-5 (parsing and the fail-closed default) are testable without
constructing a callback, and FR-2, FR-3, FR-4 and FR-6 (matching behaviour) are testable
without touching the environment. It also makes the fail-closed default a property of one small
function that a test can pin directly, which matters because FR-5 is the requirement most
likely to be violated silently.

### D3 — Fail closed, explicitly, with no `undefined` path

`resolveAllowedOrigins` **always returns a non-empty array.** When `ALLOWED_ORIGINS` is unset,
empty, or parses to zero entries, it returns `['http://localhost:3000']`.

This is the decision that satisfies FR-5, and it is deliberately structural rather than
conditional: because the function cannot return `undefined` or `[]`, there is no code path on
which `cors()` receives `origin: undefined` and falls back to its permissive `*` default. The
silent-failure risk the impact analysis ranked highest is removed by construction, not by a
branch that could later be edited away.

`http://localhost:3000` is correct as the default: `angular.json` sets the dev server's
`serve.options.port` to `3000` (verified this run, line 44).

### D4 — Normalise a trailing slash; document the rest as exact match

Resolves spec review **finding 5a**, which the reviewer left to this stage.

Parsing trims surrounding whitespace (FR-1) **and strips a single trailing `/`**. A browser
sends `Origin: http://localhost:3000` with no trailing slash, so without this an operator who
configures `http://localhost:3000/` gets a proxy that looks configured and silently blocks
everything, with no error anywhere.

Beyond that, matching is **exact string comparison** — case-sensitive, no wildcard, no
subdomain matching, no port inference. That is stated in the module's own comment so the
decision is visible where someone would change it. This resolves the finding by normalising
input rather than by changing matching semantics, so it does not require re-approving the
Specification.

### D5 — An empty `Origin` header is not allowed

Resolves spec review **finding 5b**.

The `cors` package invokes the `origin` callback with `undefined` when no `Origin` header is
present — that is FR-4, and it must be allowed. A header present but empty arrives as the empty
string, which is **not** `undefined` and will not match any entry, so it is refused. That falls
out of exact matching naturally; the decision is to **not** special-case it, and to assert it in
a test so the behaviour is pinned rather than incidental.

### D6 — Callback signature: refuse by omission, never by error

`cors`'s `origin` callback is `(origin, callback)`; calling `callback(null, false)` omits the
CORS headers, while calling `callback(new Error(...))` makes the middleware pass an error to
Express and abort the request.

FR-3 requires **header omission, not rejection** — the user chose this explicitly. The policy
therefore calls `callback(null, true)` or `callback(null, false)` and **never** constructs an
`Error`. This is called out because `callback(new Error('Not allowed by CORS'))` is the shape
most examples online use, and copying it would violate FR-3 while appearing to work.

### D7 — Preflight needs no separate handling

FR-6 is satisfied by the same `origin` option: the `cors` package applies it to `OPTIONS`
preflight and to the actual request alike. No extra middleware, no `app.options()` route. The
requirement is still tested (the test calls the policy with the same inputs a preflight would
produce), because a requirement that is only implied is a requirement that is only sometimes
tested.

### D8 — `credentials` stays off

NFR-1. The `cors` default is `false` and nothing is passed to change it. Stated so that a later
reader does not add it "for completeness".

## Files to create / modify

| File | Change |
|---|---|
| `server/cors-policy.js` | **Create.** `resolveAllowedOrigins(env)` and `corsOriginPolicy(allowed)`. Pure, no imports beyond none. Documents the exact-match decision (D4) and the omission-not-error decision (D6) in comments. |
| `server/index.js` | **Modify, line 33 only.** `app.use(cors())` → `app.use(cors({ origin: corsOriginPolicy(resolveAllowedOrigins(process.env.ALLOWED_ORIGINS)) }))`, plus the import. Nothing else in the file changes. |
| `.env.example` | **Modify.** Add `ALLOWED_ORIGINS` with a placeholder and a comment stating the comma-separated format and the localhost default (FR-7). No real deployed URL. |
| `test/cors-policy.spec.ts` | **Create** — by `so-test-writer`, not by the builder. Runner: `test:logic`. |

## Validation strategy

| Category | Runner | Covers |
|---|---|---|
| Unit — `resolveAllowedOrigins` | `test:logic` | FR-1 (parsing, whitespace, empty entries), FR-5 (fail-closed default), D4 (trailing slash) |
| Unit — `corsOriginPolicy` | `test:logic` | FR-2 (exact echo via `callback(null, true)`), FR-3 (omission via `callback(null, false)`, never an `Error`), FR-4 (`undefined` origin allowed), FR-6 (preflight inputs), D5 (empty string refused) |
| Repository assertion | `test:logic` | FR-7 — `.env.example` contains `ALLOWED_ORIGINS` and no real URL |
| **Existing suite** | `test:logic` + `test:components` | **NFR-3.** Per spec review finding 1, NFR-3 has no assertion of its own and is verified by the 108 existing logic files plus the component file staying green. `so-test-writer` should record this rather than write a vacuous test for it. |

No component test. No fixture change. No new dependency.

## Risks

| Risk | How it would surface |
|---|---|
| The `cors` package's `origin` callback contract differs from what D6 assumes | The unit test asserts the callback arguments directly, so a wrong assumption fails at `TEST_WRITING`, before any wiring exists. |
| `index.js` wiring is correct in isolation but wired wrong | Not covered by unit tests — `index.js` cannot be imported. Mitigated by the change being a single line, and by `so-implementation-verifier` reading the diff. **Stated openly: this one line is the untested surface of this Story.** |
| The deployed frontend origin is not configured in Railway after this ships | The deployment starts refusing the real frontend. Out of scope per the Story, but it is a deploy-time action someone must take; `so-pr-preparer` should surface it in the PR body's notes. |

## Traceability

| FR | Design decision / file |
|---|---|
| FR-1 | D2, D4 — `resolveAllowedOrigins` |
| FR-2 | D2, D4 — `corsOriginPolicy`, exact match |
| FR-3 | D6 — `callback(null, false)`, never an `Error` |
| FR-4 | D5 — `undefined` origin allowed |
| FR-5 | D3 — always a non-empty array, no `undefined` path |
| FR-6 | D7 — same `origin` option covers preflight |
| FR-7 | `.env.example` |
| NFR-1 | D8 |
| NFR-2 | `.env.example` placeholder only |
| NFR-3 | existing suite, per validation strategy |
