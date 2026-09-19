---
artifact: test_strategy
story: US-1.1
version: 2
status: DRAFT
owner: so-test-writer
created_at: 2026-09-18T00:50:00Z
updated_at: 2026-09-18T19:00:00Z
supersedes: docs/tests/US-1.1-test-strategy.md#1
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

# Test Strategy — US-1.1, restrict proxy CORS to an allow-list (version 2)

## Why this version exists

Version 1 recorded every input at version 1 and went stale when the Story was amended to v2 after
`RECONCILIATION` returned `story_drift`. This revision is re-recorded against Story v2,
Specification v2 (`APPROVED`), Impact Analysis v2, Implementation Plan v2, Task Breakdown v2 and
Plan Review v2.

**AC-1 … AC-5 are byte-identical between Story v1 and v2** — the Story's own amendment history says
so and this stage verified it (`git show HEAD:docs/stories/US-1.1-proxy-cors-allowlist.md`, the
*Acceptance criteria* section, diffed against the working tree). FR-1 … FR-7 and NFR-1 … NFR-3 are
likewise unchanged. So blocks 1, 2 and 4 below, and every existing test in block 3, are carried
forward unchanged.

**One thing is genuinely new: two assertions added to block 3**, on the human approver's explicit
instruction at `HUMAN_PLAN_APPROVAL` accepting Implementation Plan v2's D9 follow-up into
implementation. They are **added, never substituted** (AGENTS.md §7.7): the file went from 24 tests
to 26, and `git diff` against `HEAD` is **35 insertions and 0 deletions**, so the original 24 are
byte-identical by construction. See §3a.

## One file, one runner

| | |
|---|---|
| **Test file** | `test/cors-policy.spec.ts` |
| **Runner** | `test:logic` (`npm run test:logic` → `vitest run`) |
| **Why this runner** | `server` track. Nothing Angular is involved, so no `*.component.spec.ts` exists and the components runner is untouched. `vitest.config.ts` already includes `test/**/*.spec.ts`; no configuration change was needed. |
| **New dependency** | none — `supertest` was declined at planning (D1) and that decision stands |
| **New fixture** | none — `test/fixtures/corpus/` is not reached by this Story (impact analysis v2, hazard row 5) |
| **Test count** | **26** (24 carried forward + 2 added at v2) |

The file has four blocks, in the order the behaviour composes.

## 1. `resolveAllowedOrigins` — configuration → allow-list (FR-1, FR-5)

Six tests, called directly with a string, never through `process.env`. The spec's own highest-risk
requirement is FR-5, so it gets three of the six: the unset default, the empty/entry-less default,
and a structural one asserting no input can produce a value `cors` reads as permissive.

That third test is deliberately written against the `cors` package's actual rule —
`if (!options.origin || options.origin === '*')` at `node_modules/cors/lib/index.js:41` allows every
origin — so it forbids the specific values that would silently reopen the hole: an empty array,
`undefined`, `'*'`, and an empty-string entry. FR-5's failure path says an implementation can pass
FR-1 through FR-3 while leaving production wide open; this is the assertion that catches it.

**Unchanged at v2.**

## 2. `corsOriginPolicy` — the decision (FR-2, FR-3, FR-4)

Seven tests calling the policy with an origin and capturing what it tells the callback. They assert
the two arguments `cors` acts on:

- the **second** argument decides the header (`true` reflects the request's origin, `false` omits it);
- the **first** argument, if truthy, makes `cors` call `next(err)` and abort the request — which is
  exactly what FR-3 forbids. One test walks four refused origins asserting the error argument stays
  falsy and is never an `Error`, and that the policy does not throw.

Exact matching is asserted through near-misses that differ only by port, scheme, case, or by being a
host the entry is a prefix or suffix of. An `Origin` header that is present but empty is asserted
refused (plan D5), distinct from the absent header in the next line.

**Unchanged at v2.**

## 3. The composed policy, through the real `cors` middleware

**Eleven tests at v2** (nine carried forward, two added). This block exists because **the acceptance
criteria are written about response headers** — "receives an `Access-Control-Allow-Origin` header
echoing that exact origin" — not about callback arguments. A callback assertion is one inference away
from the criterion; a header assertion is the criterion.

It builds `cors({ origin: corsOriginPolicy(resolveAllowedOrigins(env)) })` — character for character
the expression `server/index.js:34` now contains — and drives it with a minimal request/response
double (`req.method`, `req.headers.origin`; `res.setHeader` / `res.getHeader` / `res.statusCode` /
`res.end`, which is everything `cors` and its `vary` dependency touch).

This was **plan review v1 finding 2**, taken up; plan review v2 non-blocking finding 5 records it as
discharged. It shrinks the untested surface of the Story to the literal `app.use(...)` call at
`server/index.js:34`. It is **not** the `supertest` route D1 rejected: `cors` is already a production
dependency, nothing new is installed, and `server/index.js` is not restructured.

### 3a. The two assertions added at version 2

The human approver accepted Implementation Plan v2's D9 follow-up into implementation. D9 sketched
it as: *"an assertion that an unlisted origin's preflight is answered by the middleware itself
(`ended === true`, `statusCode === 204`) rather than handed to `next()`."*

**That sketch names the wrong leg, and this stage does not write an assertion it has verified to be
false.** The finding's *substance* is delivered in full; its leg-attribution is corrected. The
evidence, the mechanism and the reasoning are in the test generation report §1 — read that before
reading the two tests, because the correction is the load-bearing part of this re-run.

| Test (in `the composed policy, through the real cors middleware`) | Asserts | Closes |
|---|---|---|
| **`FR-6/D9: a listed origin preflight is answered by the middleware itself, with 204, not handed on`** | `statusCode === 204`, `ended === true`, `nextCalled === false` on `method: 'OPTIONS'` from a **listed** origin | **IA-3 / plan Risk 2.** This is the only assertion in the repository that goes red if a `cors` minor flips `preflightContinue` to `true` or moves `optionsSuccessStatus`. That flip is precisely the silent failure D9 exists to name: every header assertion would stay green while the proxy began 404-ing the real frontend's preflights. |
| **`AC-2: an unlisted origin preflight is handed on, never answered by the middleware`** | `nextCalled === true`, `nextError` falsy, `ended === false`, `statusCode === undefined`, and no `Access-Control-Allow-Origin` — on `method: 'OPTIONS'` from an **unlisted** origin | **Plan review v2 non-blocking finding 1.** The neighbouring test asserts `nextError` is falsy, but `nextError` is falsy *both* when the middleware answered the request itself and when it called `next()`. Nothing else in the file could tell those apart. |

**The second one is written from the Specification, not from an observed run.** FR-6 states a
preflight is subject to FR-3 *"identically to the actual request"*, and the actual-request leg is
already asserted as `next` called / no error / not ended / no status
(`test/cors-policy.spec.ts:308-316`). The new test is that clause applied to `OPTIONS`. It carries an
`AC-2:` prefix because AC-2's two clauses — no header, and not rejected — are exactly what it
asserts.

**The first one carries no `AC-n:` prefix, deliberately.** No FR, NFR or AC names a status code for
any preflight — re-read against Specification v2 to be sure. It is a **dependency-contract
regression guard**, not an acceptance-criterion assertion, and it is named and filed as one (see the
AC ↔ test matrix, *Requirements with no acceptance criterion of their own*). Giving it an `AC-1:`
prefix would hand `so-reconciliation-reviewer` a test named after a criterion it does not assert —
the exact failure mode that reviewer exists to catch. The existing naming precedent in this file is
`does not enable credentialed CORS`, which carries no prefix for the same reason.

**Both were proven to bite by mutation, each by a mutant that only it catches.** Test generation
report §3b.

## 4. `.env.example` (FR-7, NFR-2)

Two tests. One asserts the variable is documented and that the comment block directly above it
explains the comma-separated format and names the `http://localhost:3000` default. That match is
deliberately loose (`/comma/i`) — a stricter one would turn the test into a copy-editing gate on
prose.

The other asserts the value is a placeholder: every host in it must be loopback, a reserved example
domain (RFC 2606 / RFC 6761) or an obvious `your-…` stand-in, and no deployment-platform hostname may
appear anywhere in the file. That second half is the NFR-2 guard; it lives inside an AC-5 test rather
than in one of its own so it cannot sit green and vacuous.

**Unchanged at v2.** Implementation Plan v2 D11 and Risk 4 record that this makes `.env.example` a
parsed fixture, and decide to keep the coupling because the alternative — a grep for the string
`ALLOWED_ORIGINS` — would pass against a file documenting nothing. This stage agrees and has not
weakened it (AGENTS.md §7.7).

## What is deliberately not tested, and why

| Not tested | Why | What covers it instead |
|---|---|---|
| `app.use(cors({ … }))` at `server/index.js:34` | `server/index.js:241` calls `app.listen()` at module scope, so the file cannot be imported without starting a listener. Plan D1 rejected `supertest` — a new dependency is an AGENTS.md §7.8 proposal, not a build step. | The value handed to `app.use` is fully asserted by block 3. What remains untested is the single statement that passes it. `so-implementation-verifier` read that diff (plan review v2 finding 2; security review Finding 1). |
| **AC-3's literal wording — `GET /health` answers `200`** | A status code for a *route* needs an HTTP-level request, which is the same `app.listen()` constraint. Stated plainly rather than papered over. | The unit test asserts the policy **allows** a request with no `Origin` (the decision that would break the health check if it were wrong). The middleware test asserts the middleware hands such a request on. Together these are the stand-in; neither one is a `200`. This is NBF-1, carried in the security review as Finding 1. |
| NFR-1 at the wiring level | The middleware test proves the **policy** does not enable credentials. It cannot prove `server/index.js` passes no `credentials: true`. | Diff review (`so-implementation-verifier`), plus plan D8 stating it. |
| NFR-3 — nothing else breaks | It has no assertion of its own; a test for "nothing changed" would be vacuous (spec review finding 1). | The 108 other logic spec files and the component spec staying green. Baseline and current numbers in the test generation report §2. |
| A real `Origin` header carrying a trailing slash | Browsers do not send one. D4 normalises the **configured** value, not the incoming header, and FR-2 says matching is exact — asserting a refusal here would pin behaviour the Specification does not state. | Not applicable. |
| **An unlisted origin's preflight receiving a `204`** | **It does not happen, and cannot be made to happen within Specification v2.** `cors` never enters the code path that reads `optionsSuccessStatus` when the origin callback answers `false` (`node_modules/cors/lib/index.js:218-226`). The only ways to reach a `204` there are to allow the origin — which makes the `Access-Control-Allow-Origin` header appear and fails AC-2 — or to add a separate `app.options()` route, which plan D7 rejected as actively harmful. There is no implementation `so-builder` could write to turn such a test green. | The two assertions in §3a, which deliver what D9's finding was *for*. See test generation report §1. |

## Determinism

No timers, no sleeps, no randomness, no network. Every test is synchronous apart from the module
load. The `.env.example` tests read a committed file. The `happy-dom` environment is unused by this
file but is the runner's default.

## Module loading

The run-time specifier resolution described at v1 is retained verbatim in the file, and the header
comment explaining it is left intact even though `server/cors-policy.js` now exists. Two reasons:
removing it would be a non-additive edit to a green, reconciled file for no behavioural gain, and the
comment documents *why the file is shaped the way it is* for anyone who re-runs this stage on a
future Story. The mechanism behaves identically to a plain import now that the module is present —
which this run re-confirms, since all 26 tests resolve and pass.
