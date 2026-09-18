---
artifact: pipeline_status
story: US-1.1
version: 1
status: DRAFT
owner: so-builder
created_at: 2026-09-18T08:30:00Z
updated_at: 2026-09-18T08:30:00Z
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
  - key: implementation_plan
    version: 1
  - key: task_breakdown
    version: 1
  - key: plan_review
    version: 1
  - key: test_strategy
    version: 1
  - key: ac_test_matrix
    version: 1
open_decisions_blocking: false
---

# Pipeline Status — US-1.1 (IMPLEMENTATION, track `server`)

Sub-step progress for `so-builder`. Workflow state itself lives in
`docs/workflow/workflow-state.yaml`, which only `so-orchestrator` writes.

## Baseline handed to this stage

`npm run test:logic` — **24 failed, 2357 passed, 3 skipped** across 109 files. All 24 failures
are `test/cors-policy.spec.ts`, which `so-test-writer` left red by design (AGENTS.md §5).
`npm run lint` was already clean at baseline, verified before any file was written.

## Task status

| Task | Files | Status | Commit |
|---|---|---|---|
| T1 — pure CORS allow-list policy module | `server/cors-policy.js` (new) | DONE | `feat(US-1.1): T1 …` |
| T2 — wire the policy into the proxy | `server/index.js` | DONE | `feat(US-1.1): T2 …` |
| T3 — document the setting | `.env.example` | PENDING | — |

---

## T1 — Create the pure CORS allow-list policy module

**Status:** DONE.

`server/cors-policy.js` created with exactly the two exports the plan's D2 names,
`resolveAllowedOrigins(raw)` and `corsOriginPolicy(allowed)`. No imports, no state, no
dependency added.

What was implemented, against the decisions it had to carry:

- **D3 — fail closed by construction.** `resolveAllowedOrigins` funnels through one return:
  the parsed list when it has entries, otherwise `['http://localhost:3000']`. No code path
  yields `[]` or `undefined`, so `cors()` can never receive a falsy `origin` option and fall
  back to `*`.
- **D4 — trailing slash, then exact match.** Entries are split on `,`, trimmed, and stripped
  of a single trailing `/` **before** empty entries are filtered out, so a lone `/` cannot
  survive as an empty allow-list entry. Nothing is lowercased; matching stays case-sensitive,
  which is what the near-miss assertions (`http://LOCALHOST:3000`) pin.
- **D5 — empty `Origin` refused.** Not special-cased. `''` matches no entry, so it falls out
  of exact matching as `false`, while an absent header (`undefined`) is allowed.
- **D6 — refuse by omission, never by `Error`.** The callback's first argument is always
  `null`; the second is a literal boolean. Verified against `node_modules/cors/lib/index.js`
  before writing: `callback(null, true)` reaches `isOriginAllowed(requestOrigin, true)` →
  `!!true`, so the header echoes the request's exact origin rather than `*`; `callback(null,
  false)` hits `if (err2 || !origin) next(err2)` → `next(undefined)`, i.e. no header, no
  error, response untouched.

### Verification

`npx vitest run test/cors-policy.spec.ts` — **22 passed, 2 failed (24)**.

**The two remaining failures are T3's, and are expected here.** They are the `.env.example`
FR-7 / AC-5 assertions (`expected null not to be null` — the `ALLOWED_ORIGINS` line does not
exist yet). They were failing before T1 and are closed by T3. Every test that passed before
T1 still passes; T1 turned 22 red tests green and weakened nothing.

`npm run lint` clean. `npm run test:components` — 1 file, 4 passed.

Recorded deliberately (AGENTS.md §13 vs. the per-task commit rule): T1 lands as its own commit
with those two assertions still red, because pulling T3 forward to make the file fully green
would collapse two tasks into one commit. T3 closes them in this same branch, minutes later.

---

## T2 — Wire the policy into the proxy

**Status:** DONE.

The diff for `server/index.js` is exactly two lines, as the task's acceptance check requires:
the import, and line 33. Nothing else in the file changed.

```diff
+import { resolveAllowedOrigins, corsOriginPolicy } from './cors-policy.js';
...
-app.use(cors());
+app.use(cors({ origin: corsOriginPolicy(resolveAllowedOrigins(process.env.ALLOWED_ORIGINS)) }));
```

No `credentials` option is passed, so `cors`'s default of `false` stands (D8, NFR-1). No
try/catch and no error-throwing origin callback were added (T2's note, FR-3).

### Verification

This task has **no test**, by plan decision D1 — `server/index.js:242` calls `app.listen()` at
module scope, so the file cannot be imported, and adding `supertest` was rejected at planning as
an AGENTS.md §7.8 dependency proposal. The plan and `plan_review` finding 1 both name this line
as the Story's untested surface. Nothing here hides that.

What *was* done instead of a test, so the line is not merely asserted to be correct: the wired
proxy was booted and exercised for real.

```
$ PORT=3999 ALLOWED_ORIGINS="https://shop.example" node server/index.js
[Server] Running on http://localhost:3999

--- listed origin ---
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://shop.example
--- unlisted origin ---
HTTP/1.1 200 OK            (no Access-Control-Allow-Origin header, request not rejected)
--- no origin header ---
HTTP/1.1 200 OK
{"ok":true,"uptime":1.2372129}
```

That is AC-1, AC-2 and AC-3 observed against the running proxy. It is a manual smoke check, not
a repeatable test, and it does not replace one — it is recorded so the residual risk is a known
quantity at review rather than an assumption.

`node --check server/index.js` clean. `npm run lint` clean.

---

## T3 — Document the setting

**Status:** PENDING.
