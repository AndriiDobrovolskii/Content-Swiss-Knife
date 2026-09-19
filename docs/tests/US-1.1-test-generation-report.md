---
artifact: test_generation_report
story: US-1.1
version: 2
status: DRAFT
owner: so-test-writer
created_at: 2026-09-18T00:50:00Z
updated_at: 2026-09-18T19:00:00Z
supersedes: docs/tests/US-1.1-test-generation-report.md#1
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: impact_analysis
    version: 2
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: plan_review
    version: 2
open_decisions_blocking: false
---

# Test Generation Report — US-1.1 (version 2)

**File changed:** `test/cors-policy.spec.ts` — **24 tests → 26**, runner `test:logic`.
**Diff against `HEAD` (`7b117e2`): 35 insertions, 0 deletions.**
**Files NOT written:** `server/cors-policy.js`, `server/index.js`, `.env.example` — T1, T2 and T3,
`so-builder`'s, and all three already delivered. No dependency added; `supertest` stays declined (D1).

This version supersedes version 1, which recorded every input at version 1 and went stale when the
Story was amended to v2 after `RECONCILIATION` returned `story_drift`.

Read §1 first. It is not a re-record — it is a correction to an approved plan decision, made against
primary sources, and it changes what was written.

---

## 1. D9's wording names a leg that does not exist, and this stage did not write it

### What was approved

The human approver, at `HUMAN_PLAN_APPROVAL`, accepted Implementation Plan v2's D9 follow-up into
implementation:

> «Покращення тестів для preflight (D9: ended === true, statusCode === 204) приймається в
> імплементацію.»

D9 itself sketches it as an assertion that *"an unlisted origin's preflight is answered by the
middleware itself (`ended === true`, `statusCode === 204`) rather than handed to `next()`."*

### That is factually false, and three independent sources say so

**Source 1 — the package, read directly.** `node_modules/cors/lib/index.js:218-226`:

```js
if (originCallback) {
  originCallback(req.headers.origin, function (err2, origin) {
    if (err2 || !origin) {
      next(err2);                       // <- unlisted origin stops HERE
    } else {
      corsOptions.origin = origin;
      cors(corsOptions, req, res, next);
    }
  });
}
```

`corsOriginPolicy` refuses with `callback(null, false)` (`server/cors-policy.js:68`), so `!origin` is
true and `next(err2)` fires. The inner `cors()` function is never entered — and `cors()` at
`:159-190` is **the only place in the package that ever reads `preflightContinue` or
`optionsSuccessStatus`**. An unlisted origin's preflight therefore cannot reach the `204` path by any
route.

**Source 2 — an empirical probe, run this session** against the real package and the real
`server/cors-policy.js`, using the same request/response double the spec uses:

```
LISTED OPTIONS   : {"headers":{"access-control-allow-origin":"https://shop.example","vary":"Origin, Access-Control-Request-Headers","access-control-allow-methods":"GET,HEAD,PUT,PATCH,POST,DELETE","content-length":"0"},"nextCalled":false,"ended":true,"statusCode":204}
UNLISTED OPTIONS : {"headers":{},"nextCalled":true,"nextError":null,"ended":false}
NO-ORIGIN OPTIONS: {"headers":{"vary":"Origin, Access-Control-Request-Headers","access-control-allow-methods":"GET,HEAD,PUT,PATCH,POST,DELETE","content-length":"0"},"nextCalled":false,"ended":true,"statusCode":204}
LISTED GET       : {"headers":{"access-control-allow-origin":"https://shop.example","vary":"Origin"},"nextCalled":true,"ended":false}
```

The `204` lives on the **listed** leg. The unlisted leg is `nextCalled: true, ended: false,
statusCode: undefined`.

**Source 3 — this artifact's own version 1**, §3, *Harness validation*, recorded the same observation
the first time this stage ran:

> "A **preflight from an unlisted origin is not short-circuited** with a `204`; `cors` calls `next()`
> and the request falls through. The FR-6 refusal test therefore asserts the absent header and a
> falsy error argument, not a status code."

That is why the file had no `204` in it: not an oversight, a deliberate consequence of what the
package does. D9 was written without that observation in hand, and plan review v2 §*The four items
routed to this review* item 1 flagged the adjacent uncertainty in its own words — *"The plan's own
account of what would happen instead — Express falling through to a 404 handler — is the plan's
claim, not one this review verified or needs."*

### Why the literal assertion was not written red either

The skill's rule is that a test which cannot pass is correct when `so-builder` can make it pass. Here
it cannot. Making an unlisted origin's preflight get answered with `204` by the middleware requires
either:

- **allowing the origin** — which makes `Access-Control-Allow-Origin` appear and fails AC-2 and FR-3;
  or
- **a separate `app.options()` route** — which plan D7 rejected by name as *"actively harmful: a
  second code path for preflight is exactly how preflight and the actual request come to disagree"*.

There is no implementation consistent with the `APPROVED` Specification that turns it green. Writing
it would have deadlocked the pipeline at `IMPLEMENTATION` on a stage's wording error.

### What was written instead — the finding's substance, on the correct leg

The *risk* D9 exists to close is stated precisely in Impact Analysis v2 IA-3 and plan Risk 2: a `cors`
minor could flip `preflightContinue`, under the `"^2.8.5"` caret at `package.json:51`, and **every
existing assertion would still pass while the proxy 404'd preflights**. That risk is real, and it
lands on the **listed** leg — the one the middleware actually answers. Two tests were added:

| Added test | Assertion | What it closes |
|---|---|---|
| `FR-6/D9: a listed origin preflight is answered by the middleware itself, with 204, not handed on` | `statusCode === 204`, `ended === true`, `nextCalled === false` | **IA-3 / Risk 2, in full.** The only assertion in the repository that goes red on that flip. With `preflightContinue: true`, the listed preflight is `next()`-ed, Express 404s it, and the **real frontend's** preflights break — which is the breakage that matters, since an unlisted origin's preflight failing is the intended behaviour either way. |
| `AC-2: an unlisted origin preflight is handed on, never answered by the middleware` | `nextCalled === true`, `nextError` falsy, `ended === false`, `statusCode === undefined`, no `Access-Control-Allow-Origin` | **Plan review v2 non-blocking finding 1.** That finding's precise words: *"`nextError` is falsy in both cases — so the closure D9 sketches is genuinely additive"*. This is that closure, written in the direction reality goes. It is derived from FR-6's own text (*a preflight is subject to FR-3 "identically to the actual request"*) applied to the `:308-316` assertion set, not copied from the probe above. |

The human's intent — close the unpinned-default gap, and make the preflight tests able to tell
"answered" from "handed on" — is delivered in full. Only the leg attribution is corrected.

**This is recorded as a non-blocking finding on the Result Envelope, not as `BLOCKED`.** The stage
goal is met, the contradiction is resolved against primary sources, and the correction is already in
the file. But D9's text, plan Risk 2's text and the task breakdown's D9 row all still describe the
unlisted leg, and a future reader will hit the same contradiction — so it wants a human's eye.

---

## 2. Every suite was run, and the numbers

| Run | Command | Result |
|---|---|---|
| Target spec | `npx vitest run test/cors-policy.spec.ts` | `Test Files 1 passed (1)` — `Tests 26 passed (26)` |
| **Logic, full** | `npm run test:logic` | `Test Files 109 passed (109)` — `Tests 2383 passed \| 3 skipped (2386)` |
| Components, full | `npm run test:components` | `Test Files 1 passed (1)` — `Tests 4 passed (4)`; bundle generation complete |
| Lint / typecheck | `npm run lint` (`tsc --noEmit`) | clean, no output, exit 0 |

**The full-suite number is itself a check on the §7.7 "add, never substitute" rule.** The quality gate
recorded the logic suite at **2381 passing / 3 skipped** before this run
(`docs/verification/US-1.1-quality-gate-report.md`). It is now **2383 passing / 3 skipped** — exactly
`+2`, and the skipped count is unmoved. Two tests were added and nothing anywhere in the repository
was removed, renamed or disabled.

### The 24 existing tests are byte-identical — shown, not asserted

`git status` cannot demonstrate this, because the file *is* modified: two tests were added to it. What
demonstrates it is that the diff against `HEAD` contains **zero deleted lines**:

```
$ git diff --numstat test/cors-policy.spec.ts
35      0       test/cors-policy.spec.ts

$ git diff --stat test/cors-policy.spec.ts
 test/cors-policy.spec.ts | 35 +++++++++++++++++++++++++++++++++++
 1 file changed, 35 insertions(+)

$ git diff -U0 test/cors-policy.spec.ts | grep -c '^-[^-]'
0
```

35 insertions, 0 deletions, in a single hunk `@@ -363,6 +363,41 @@` between the existing
unlisted-preflight test and `does not enable credentialed CORS`. Zero deletions means every original
line survives unchanged — so the 24 original tests are byte-identical by construction, not by
inspection. The `vitest` run above lists all 24 original test names still present and passing, under
their original `describe` blocks.

Nothing was modified, weakened, renamed, merged, skipped, deleted, or excluded from coverage
(AGENTS.md §7.7). No `.skip`, no `.only`, no `exclude:` change.

---

## 3. The TDD position, stated rather than glossed

### 3a. These two assertions pass immediately, and why that is not a §5 violation

AGENTS.md §5 requires the tests to exist and fail before the implementation. **That red state was
satisfied for this Story, at the proper time.** Version 1 of this report records it in full: 24 named
failing tests, two of them red on a behavioural assertion against `.env.example` and 22 red on
`ERR_MODULE_NOT_FOUND` for a `server/cors-policy.js` that did not yet exist, with `so-builder` turning
them green across `dc29f40`, `540a676` and `68dea71`. The tests were committed at `7b117e2`.

This run is different in kind. It is a **re-record against v2 inputs plus one approved addition**,
executed against an implementation that is already built, gated, verified, security-reviewed and
reconciled. The two new assertions describe behaviour the delivered code already has — they are
**regression guards against a future dependency change and a future edit**, not a specification of
work to be done. There is no task for them; the task breakdown's *The fourth task that is not here*
says in its own words that D9 *"produces no task and no file change"*, and that remains true: nothing
in `server/` or `.env.example` changed this run.

**So they cannot start red, and pretending otherwise would be dishonest.** What replaces the red state
as evidence that they bite is §3b — targeted mutation, which is a stronger check than a missing-module
failure ever was.

### 3b. Proof that each new assertion bites — two mutants, each caught by one test only

A regression guard that cannot fail is decoration. Each new assertion was therefore paired with a
mutation that a naive reading would call correct, and which **only that assertion catches**. Both
mutations were made to the shared `middlewareFor` helper in `test/cors-policy.spec.ts`, run, and
reverted.

**Mutant M1 — the IA-3 scenario itself: a `cors` minor flips `preflightContinue`.**
`middlewareFor` changed to `cors({ origin: corsOriginPolicy(resolveAllowedOrigins(env)), preflightContinue: true })`.

```
 × test/cors-policy.spec.ts > the composed policy, through the real cors middleware > FR-6/D9: a listed origin preflight is answered by the middleware itself, with 204, not handed on 6ms
      Tests  1 failed | 25 passed (26)
```

**1 of 26 failed, and it is the new assertion.** Note what stayed green: the pre-existing
`AC-1: a preflight from a listed origin is answered with that origin echoed back` still passed,
because `cors` applies the headers *before* it branches on `preflightContinue`. That is exactly the
silent failure D9 describes — the header assertions cannot see it — and it is now visible.

**Mutant M2 — the middleware short-circuits an unlisted preflight.** `middlewareFor` changed to
`cors({ origin: resolveAllowedOrigins(env) })`: the allow-list array passed to `cors` directly instead
of through the policy callback. This is a realistic wrong turn — it looks like a simplification — and
it changes the refusal path: `cors` enters its core function, finds the origin not allowed, omits the
header **and then answers the preflight itself** with `204`.

```
 × test/cors-policy.spec.ts > the composed policy, through the real cors middleware > AC-2: an unlisted origin preflight is handed on, never answered by the middleware 6ms
      Tests  1 failed | 25 passed (26)

AssertionError: expected false to be true // Object.is equality
- Expected
+ Received
- true
+ false
```

**1 of 26 failed, and it is the new assertion.** Everything else stayed green — including
`AC-2: a preflight from an unlisted origin receives no Access-Control-Allow-Origin header either`,
because under M2 the header is still correctly absent. Before this run, **no test in the repository
could detect M2 at all.** That is the hole plan review v2 non-blocking finding 1 named, closed and
demonstrated.

**Both mutations reverted; the diff is additive-only again.** Re-verified after revert:

```
$ git diff --numstat test/cors-policy.spec.ts
35      0       test/cors-policy.spec.ts
$ git diff -U0 test/cors-policy.spec.ts | grep -c '^-[^-]'
0
$ npx vitest run test/cors-policy.spec.ts
 Test Files  1 passed (1)
      Tests  26 passed (26)
```

No mutant residue, and no production file was touched at any point. Stated as what was actually
checked rather than as an absence: `git status --short -- server/ .env.example` returned **no output**,
so no file under `server/` — including `server/cors-policy.js` and `server/index.js` — and not
`.env.example` is modified, staged or untracked. The working tree is **not** claimed to be clean: it
legitimately carries this Story's v2 workflow artifacts. But `test/cors-policy.spec.ts` is the only
non-`docs/` entry in `git status --short`, and its diff is the 35 additive lines above.

### 3c. Version 1's mutation results, carried forward

Version 1 proved the original 24 bite, using a reference implementation at a throwaway path and a
throwaway copy of the spec, both deleted afterwards. Carried forward because it is the evidence that
the 24 are sound, and nothing in this run re-opens it:

| Mutant | Violates | Tests that caught it |
|---|---|---|
| empty configuration yields `[]` | FR-5 (fails open — `cors` then allows `*`) | 5 failed, 19 passed |
| refuses with `callback(new Error(…))` | FR-3 (rejection instead of omission) | 6 failed, 18 passed |
| treats a missing `Origin` as "not in the list" | FR-4 (would break the Railway health check) | 1 failed, 23 passed — `AC-3: allows a request that carries no Origin header at all` |
| no trailing-slash normalisation | plan D4 | 1 failed, 23 passed — `AC-1: a configured trailing slash still matches the origin a browser actually sends` |

---

## 4. Input currency

Every input artifact was read at version 2 from the working tree. `specification` is `APPROVED`;
`story`, `impact_analysis`, `implementation_plan`, `task_breakdown` and `plan_review` are each at
version 2 with `supersedes` pointing at their own `#1`. None is `SUPERSEDED` or `ARCHIVED`. Every one
carries `open_decisions_blocking: false`; OD-1 is non-blocking on its own record.

**AC-1 … AC-5 verified byte-identical between Story v1 and v2**, by diffing the *Acceptance criteria*
section of `git show HEAD:docs/stories/US-1.1-proxy-cors-allowlist.md` against the working tree. That
is why no existing row in the AC ↔ test matrix moved, and why blocks 1, 2 and 4 of the spec file are
untouched.

---

## 5. Coverage gaps and notes for later stages

1. **D9's text now contradicts the test that discharges it.** Plan v2 §D9, plan v2 Risk 2 and the task
   breakdown's *fourth task* D9 row all describe the closure as landing on the **unlisted** leg. The
   delivered closure lands on the **listed** leg, for the reasons in §1. Those artifacts belong to
   `so-planner` and `so-implementation-planner`, and this stage does not edit another stage's
   artifact — so the correction lives here and on the Result Envelope. `so-reconciliation-reviewer`
   and `so-pr-preparer` will both read D9; whoever gets there first should carry the correction
   rather than re-derive it.
2. **The review-time control D9 relies on is now partly automated.** Plan review v2 non-blocking
   finding 1 observed that D9's detection mechanism — a row in Impact Analysis v2's *needs
   re-verification* table — archives with this Story and is read by nobody during a dependency bump.
   `FR-6/D9: a listed origin preflight is answered by the middleware itself…` replaces that for the
   `preflightContinue` half. **Scoped precisely to what was executed:** M1 proved the test fails when
   `preflightContinue: true` is passed as an *option*. A `cors` minor changing the *default* was
   **not** run as a mutant — that would mean editing `node_modules` — and is inferred from
   `node_modules/cors/lib/index.js:208`, `assign({}, defaults, options)`, which merges the two into
   the same `corsOptions` the `:173` branch reads. Same code path, verified by reading rather than by
   execution, and recorded that way. What remains review-time is anything a bump could change that
   alters no assertion in this file.
3. **`GET /health` returning `200` is still not asserted anywhere**, and cannot be without HTTP-level
   testing of an app that calls `app.listen()` at module scope. NBF-1, unchanged. If the `supertest`
   proposal is ever put to a human, this is the first assertion to write with it.
4. **`server/index.js:34` remains the untested surface.** Unchanged from v1, and narrower than it
   looks: block 3 of the spec fully covers the *value* handed to `app.use`.
5. **The corpus fixtures were not touched and not needed.** This Story reaches no renderer, prompt or
   locale path (impact analysis v2, hazard row 5), so the known corpus-coverage gap recorded in
   `test/render-reconciliation.report.md` §5 does not constrain it.
6. **`.env.example`'s fixture coupling is still invisible from `.env.example`.** Plan review v2
   non-blocking finding 3. Not addressed here: adding a marker line would edit a file whose content
   AC-5 governs, outside any acceptance criterion.
7. **A deploy-time action still exists outside the tests.** Nothing in this repository can assert that
   the real deployed frontend origin was configured in Railway. Out of scope per the Story —
   `so-pr-preparer` should carry it into the PR body (plan Risk 7, security review R3).
