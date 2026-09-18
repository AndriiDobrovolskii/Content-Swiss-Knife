---
artifact: reconciliation_report
story: US-1.1
version: 2
status: APPROVED
owner: so-reconciliation-reviewer
created_at: 2026-09-18T11:00:00Z
updated_at: 2026-09-18T22:30:00Z
supersedes: docs/reconciliation/US-1.1-reconciliation-report.md#1
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: ac_test_matrix
    version: 2
  - key: implementation_report
    version: 2
  - key: verification_report
    version: 2
  - key: security_review
    version: 2
open_decisions_blocking: false
---

# Reconciliation Report — US-1.1, restrict proxy CORS to an allow-list (version 2)

**Verdict: PASS**, with five non-blocking findings.

All five acceptance criteria clear Level 1, Level 2 and Level 3 against the 26 delivered tests,
including the two added at `f981732`. All seven functional and three non-functional requirements
are implemented. Nothing outside the Specification's *Out of scope* entered the diff.

**The `story_drift` this stage raised at version 1 is discharged** (§5). One new inaccuracy in the
amended Story — `security_review` v2 Finding 1 — is judged a non-blocking prose defect and is
**not** routed back; §6 argues it, including against this report's own version 1 reasoning.

---

## 1. Why this version exists

Version 1 returned `CHANGES_REQUIRED` / `story_drift` on the grounds that the Story's business
outcome was false as written. A human approved amending the Story; the whole upstream chain was
re-issued at version 2, and `so-test-writer` added two assertions to `test/cors-policy.spec.ts`
(24 → 26) at `f981732`. Version 1 consumed the version 1 chain and is stale.

**No production file changed between version 1 and version 2 of this report.** Confirmed, not
assumed: `git diff --name-status 3c043c4..HEAD` returns the same five paths and
`git diff --stat 3c043c4..HEAD -- server/ .env.example package.json` is still
`.env.example +9`, `server/cors-policy.js +70`, `server/index.js +3/−1`, with `package.json`
absent. What is new here is the input versions, the two added tests read at assertion level, and
the three items routed to this stage.

### Input currency (lifecycle §1)

| Input | version | status |
|---|---|---|
| `story` | 2 | `DRAFT` |
| `specification` | 2 | `APPROVED` |
| `ac_test_matrix` | 2 | `DRAFT` |
| `implementation_report` | 2 | `DRAFT` |
| `verification_report` | 2 | `DRAFT` |
| `security_review` | 2 | `DRAFT` |

Each read from front matter this pass. None is `SUPERSEDED` or `ARCHIVED`.

---

## 2. What was read, and how

| Read | Why |
|---|---|
| `test/cors-policy.spec.ts`, all 459 lines | Level 2 and Level 3. Every test body was read this pass, the 24 carried forward as well as the 2 new. No criterion below is marked covered on the strength of a test **name**. |
| `git diff 7b117e2 f981732 -- test/cors-policy.spec.ts`, in full | To verify the matrix's "nothing was modified, weakened, renamed, merged or deleted" claim at source rather than on its word. See §3. |
| `server/cors-policy.js`, all 70 lines | To answer "would this test fail if the criterion were violated" against the real implementation. |
| `server/index.js:30-40`, `.env.example:50-58`, `git diff --name-status 3c043c4..HEAD` | Drift, scope creep, the wiring line, and the AC-3 / AC-5 legs no test reaches. |
| `src/services/usage.service.ts` in full, plus `grep -rn "api/usage" src/ --include=*.ts` | `security_review` v2 Finding 1, confirmed independently at source rather than accepted on report (§5). |
| Story, Specification, `ac_test_matrix`, `implementation_report`, `verification_report`, `security_review` — all at v2 | Inputs. |
| `awk`-extracted *Acceptance criteria* section of `git show HEAD:docs/stories/…` vs. the working tree | To confirm AC-1 … AC-5 really are byte-identical across the amendment (§4). |

### Test run, this stage's own

```
$ npx vitest run test/cors-policy.spec.ts --reporter=verbose

 Test Files  1 passed (1)
      Tests  26 passed (26)
   Duration  749ms
```

All 26 named individually in the verbose output. Zero `skip`, zero `todo`, zero `describe.skip` —
checked by reading the file and corroborated by the run naming every one. Every matrix row's test
name matched a real `it(...)` in the file verbatim.

---

## 3. The carried-forward 24, verified at source

The matrix states that the two new tests are purely additive and that nothing existing moved. That
claim is load-bearing — if any of the 24 tests behind version 1's PASS had been weakened while the
matrix said otherwise, this stage would be re-certifying coverage that no longer exists. It was
therefore verified rather than read:

```
$ git diff 7b117e2 f981732 --stat -- test/cors-policy.spec.ts
 test/cors-policy.spec.ts | 35 +++++++++++++++++++++++++++++++++++
 1 file changed, 35 insertions(+)
```

The full diff is two whole `it(...)` blocks inserted between the existing
`AC-2: a preflight from an unlisted origin …` test and `does not enable credentialed CORS`, with
**zero deletions and zero modified lines**. No `expect` was relaxed, no test renamed, no `describe`
restructured, no helper changed. AGENTS.md §7.7 holds, and the matrix's claim is accurate.

---

## 4. The three-level check, per acceptance criterion

**AC-1 … AC-5 are byte-identical between Story v1 and v2.** Verified independently of the Story's
own assertion: the *Acceptance criteria* section extracted from `HEAD`'s committed Story — which is
version 1, the v2 amendment being still uncommitted (`M` in `git status`) — and from the working
tree are identical under `diff`, with matching MD5 (`14ff382c…`). The criteria below
are therefore the same criteria version 1 assessed, and the 24 tests behind them are unchanged
(§3) — but each was re-read at assertion level anyway, because "unchanged since a prior PASS" is a
reason to expect the same answer, not a substitute for reaching it.

### AC-1 — a listed origin is echoed back exactly — **PASS (L1 ✓ L2 ✓ L3 ✓)**

> When `ALLOWED_ORIGINS` is set, a request carrying an `Origin` header listed in it receives an
> `Access-Control-Allow-Origin` header echoing that exact origin.

7 rows, 7 tests found, 7 read. Unchanged at v2.

The criterion is written about a **response header**, and the primary test asserts exactly that —
`spec.ts:293-299` drives the real `cors` middleware with the composed expression and asserts
`headers['access-control-allow-origin'] === 'https://shop.example'`, plus `.not.toBe('*')`. The
wildcard assertion is not decoration: `*` is the defect the Story exists to remove.

Level 3 held on the mutation question: a policy returning `true` for every origin passes
`AC-1: allows an origin that appears in the list` but fails the AC-2 and AC-4 tests; a policy that
echoed the whole list rather than the one origin fails the primary test's exact equality. The
supporting rows are genuine sub-claims of "listed in it" — `spec.ts:172-194` covers the comma
split, whitespace trim and trailing-slash normalisation that determine what "listed" means, each
asserting a concrete `toEqual([...])`, never a length or a truthiness.
`spec.ts:349-354` extends the same header assertion to the `OPTIONS` preflight, which is "a request
carrying an `Origin` header" and so falls inside AC-1 as written.

### AC-2 — an unlisted origin gets no header, and is not rejected — **PASS (L1 ✓ L2 ✓ L3 ✓)**

> A request carrying an `Origin` header **not** in the list receives **no**
> `Access-Control-Allow-Origin` header … The request is not rejected with an error status.

**8 rows at v2** (7 at v1, all 7 unchanged), 8 tests found, 8 read. The criterion has two clauses
and both are asserted separately, on both the actual-request and the preflight path.

Clause one, `spec.ts:301-306`: `headers[ALLOW_ORIGIN]` is `toBeUndefined()` — absence of the
header, which is the criterion, not a different header value.

Clause two, `spec.ts:308-316`: `nextCalled === true`, `nextError` falsy, `ended === false`,
`statusCode === undefined`. Four assertions, each of which a `403`-style implementation would fail.
This is a negative criterion tested as a negative criterion.

`spec.ts:221-235` independently pins FR-3's failure path across four refused origins:
`decision.error` falsy and not an `Error`, and the policy does not throw. Read against
`server/cors-policy.js:66-69`, where the first callback argument is the literal `null` on every
path, this constrains a real trap — `callback(new Error('Not allowed by CORS'))` is the idiomatic
shape and would violate the criterion while appearing to work.

**The new row, `spec.ts:382-399` — `AC-2: an unlisted origin preflight is handed on, never answered
by the middleware` — is genuinely additive, and its bite was derived here rather than cited.** The
matrix attributes it to a mutation run in `test_generation_report` §3b; that run is not this
stage's evidence and is not relied on. Instead, from the `exchange()` harness read at
`spec.ts:100-134`: `nextCalled` is initialised `false` and set **only** inside the `next` callback,
and `ended` is initialised `false` and set **only** inside `res.end()`. On the path where `cors`
answers a preflight itself it calls `res.end()` and never calls `next`, so that mutation produces
`nextCalled === false` / `ended === true` / a set `statusCode` — and fails three of this test's five
assertions. On the correct path it produces the opposite of all three. The neighbouring
`spec.ts:356-364` cannot distinguish them, because `nextError` is falsy in **both** cases (it stays
`undefined` when `next` is never called, and `cors` passes `undefined` on a refusal). The row is a
real strengthening of AC-2's second clause on the `OPTIONS` leg, not a restatement.

### AC-3 — a request with no `Origin` header is unaffected — **PASS (L1 ✓ L2 ✓ L3 ✓), with a bounded limitation**

> A request with **no** `Origin` header — a server-to-server call, `curl`, or the Railway health
> check — is unaffected: `GET /health` still answers `200`.

2 rows, 2 tests found, 2 read. Unchanged at v2. The adjudication of version 1 §3 stands and is
re-stated as **NBF-1** (§9) rather than re-argued at length, because neither the criterion, the
tests, the code nor plan decision D1 moved.

`spec.ts:237-246` asserts `allowed === true` and `error` falsy for `origin === undefined` — the
decision `cors` actually asks for when no `Origin` header arrives, and the one that breaks the
Railway health check if it is wrong. `spec.ts:318-329` asserts the middleware leaves the exchange
untouched: `nextCalled`, no error, not ended, no status set. Both are behavioural; neither is
`toBeTruthy()` or `toBeDefined()` alone; neither expected value was copied from actual output
(`undefined` and `false` are the specified values, and the opposite of what a naive "not in the
list, so refuse" implementation produces).

Neither test asserts a literal `200`, and that gap is recorded, not smoothed over. The leg
attribution is unchanged from version 1: (a) the `/health` handler is not in the diff at all, so no
line of this change could alter its status code; (b) the CORS layer's non-interference is the leg
this Story could actually have broken and is the leg that is tested; (c) the wiring line is the
Story-wide residual, NBF-2, not an AC-3-specific defect.

### AC-4 — an unset allow-list fails closed — **PASS (L1 ✓ L2 ✓ L3 ✓)**

> When `ALLOWED_ORIGINS` is unset or empty, the allow-list defaults to `http://localhost:3000`
> **only**. It must not fall back to allowing every origin.

5 rows, 5 tests found, 5 read. Unchanged at v2. The strongest-tested criterion in the Story,
correctly, since FR-5 names it as the one most likely to be silently violated.

Positive half: `spec.ts:143-147`, `resolveAllowedOrigins(undefined)` `toEqual(['http://localhost:3000'])`
— exact array equality, so an extra entry fails it, which is what "**only**" requires.
Negative half: `spec.ts:157-170` asserts, for five empty-ish inputs, that the result is a non-empty
array containing neither `'*'` nor `''`. That test is written against the actual `cors` rule
(`if (!options.origin || options.origin === '*')`) rather than against the implementation's shape,
so it constrains the failure mode rather than describing the code. `spec.ts:331-347` closes it end
to end through the real middleware. Read against `server/cors-policy.js:42`
(`configured.length > 0 ? configured : [DEFAULT_ALLOWED_ORIGIN]`) the fail-closed property is
structural, not conditional: there is no `return []`, no `return undefined`, no early return.

### AC-5 — `.env.example` documents the setting with a placeholder — **PASS (L1 ✓ L2 ✓ L3 ✓)**

> `.env.example` documents `ALLOWED_ORIGINS` with a placeholder value and a comment explaining the
> comma-separated format. No real deployed URL appears in the repository.

2 rows, 2 tests found, 2 read, and `.env.example:50-58` read directly this pass rather than trusted
to the test. The live value is
`ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.example.com`, above a seven-line
comment covering the comma-separated format, the fail-closed default, trailing-slash tolerance and
the origin-less case.

`spec.ts:428-436` finds the `ALLOWED_ORIGINS=` line and its preceding comment block and asserts the
comment matches `/comma/i` and `/localhost:3000/`. The looseness is deliberate and declared in the
test; it is not a level-3 failure, because the criterion says "a comment explaining the
comma-separated format", not any particular wording — a stricter match would assert a neighbouring
property (the exact prose) rather than the criterion. `spec.ts:438-458` asserts every host in the
configured value is loopback, an RFC 2606 example domain or a `your-…` stand-in, and that no
deployment-platform hostname appears anywhere in the file, across six suffixes. That is the "no real
deployed URL" clause tested as a clause.

### Coverage summary

| AC | Rows | Tests found | Bodies read | Level 1 | Level 2 | Level 3 |
|---|---|---|---|---|---|---|
| AC-1 | 7 | 7 | 7 | ✓ | ✓ | ✓ |
| AC-2 | **8** | 8 | 8 | ✓ | ✓ | ✓ |
| AC-3 | 2 | 2 | 2 | ✓ | ✓ | ✓ (NBF-1) |
| AC-4 | 5 | 5 | 5 | ✓ | ✓ | ✓ |
| AC-5 | 2 | 2 | 2 | ✓ | ✓ | ✓ |
| (no AC — NFR-1) | 1 | 1 | 1 | n/a | ✓ | ✓ |
| (no AC — FR-6/D9) | **1** | 1 | 1 | n/a | ✓ | ✓ (§7) |
| **Total** | **26** | **26** | **26** | | | |

26 matrix rows, 26 tests in the file, 26 in the run. No row points at a test that does not exist,
was renamed, or was deleted. No criterion is marked covered without its test body having been read.

---

## 5. Routed item 1 — is the `story_drift` discharged? **Yes.**

Reached independently. `security_review` v2 closes its own R1 as `CLOSED_AT_V2`; that is
corroboration, not the basis for this conclusion — the finding was this stage's and its discharge
is this stage's to judge.

Version 1's finding was precise: the Story's benefit clause promised that "an arbitrary third-party
page cannot make a visitor's browser call my proxy and spend my API credits", and **no
implementation satisfying AC-1 through AC-5 could make that true**, because a CORS-simple
cross-origin form POST is delivered, parsed and executed regardless of the allow-list. Worse, v1's
*Out of scope* excused only **non-browser** clients while the benefit clause was scoped to **a
visitor's browser**, so the Story was internally inconsistent and left the browser case standing as
an unmet promise.

Story v2's outcome clause now reads:

> so that **no third-party page can read a response from my proxy, and no preflighted cross-origin
> request … succeeds from an unlisted origin**.

Applying this stage's own test — *could an implementation satisfying AC-1 through AC-5 make this
clause true?* — the answer is now yes, and the delivered one does:

| Clause | Delivered by | Evidence in this report |
|---|---|---|
| no third-party page can **read** a response | AC-1/AC-2 + FR-2/FR-3: an unlisted origin receives no `Access-Control-Allow-Origin`, so the browser exposes nothing to the calling page | §4 AC-2, `spec.ts:301-306`; `server/cors-policy.js:66-69` |
| no **preflighted** cross-origin request succeeds from an unlisted origin | AC-2 + FR-6 on the `OPTIONS` leg: no header, and the preflight is handed on rather than answered, so the browser fails it and never sends the real request | §4 AC-2, `spec.ts:356-364` and `spec.ts:382-399` |

And the gap v1 identified is now named rather than left open: Story v2's *Out of scope* states the
CORS-simple browser path explicitly, cites `server/index.js:36`'s `express.urlencoded` by line,
names `/api/retrieval/search` and `GET /api/usage*` as reachable the same way, and routes the
credit spend itself to **OD-1**. The exclusion now covers the case the outcome clause does not
claim. The internal inconsistency that made this a `STORY_WRITING` matter is gone.

**AC-1 through AC-5 did not change** (§4, verified by section diff and MD5), which is exactly what
version 1 predicted would be sufficient: *"If the amended Story keeps AC-1 through AC-5 as they
stand, this delivery satisfies it unchanged."* It does. **`story_drift` is discharged.**

---

## 6. Routed item 2 — `security_review` Finding 1: non-blocking prose defect, **not** a second loop-back

### The fact, confirmed at source

Story v2's outcome clause carries a parenthetical: "no preflighted cross-origin request — **which
is every JSON `fetch` the real frontend makes** — succeeds from an unlisted origin". The emphasised
part is false, and this stage confirmed it independently rather than accepting the security
review's word:

`src/services/usage.service.ts:43` is `this.http.get<{ rows: UsageRecord[] }>('/api/usage', { params })`
— an Angular `HttpClient` GET with no custom headers and no body. It sends only CORS-safelisted
request headers, so it is a **CORS-simple request and is not preflighted**, even though it both
requests and receives JSON. The Story's parenthetical is therefore untrue of at least one real
frontend call.

One precision correction to the finding as written: it also cites "`/api/usage/generations` the
same way". `grep -rn "api/usage" src/ --include=*.ts` returns exactly three hits — the GET above,
`src/services/llm.service.ts:75`'s `POST /api/usage/generation` (which *is* preflighted, carrying
`Content-Type: application/json`), and one spec assertion. No frontend caller of
`/api/usage/generations` exists. **The core claim is confirmed; that secondary citation is not.**
This does not weaken Finding 1 — one counter-example is all it needs, and `usage.service.ts:43` is
that counter-example.

### Why it does not warrant another loop-back

**The drift test does not engage, and that is the reason — not the cost of another cycle.**

This stage's test is whether an implementation satisfying AC-1 through AC-5 can make the Story's
claim true. The claim the Story is answerable to is *"no preflighted cross-origin request succeeds
from an unlisted origin"*. The parenthetical does not alter that claim; it asserts the **size of
the set** of frontend requests that fall inside it. The promise holds whatever that set's size is —
it would hold vacuously if the set were empty. An aside that misdescribes the population cannot
make the quantified promise false, and **no acceptance criterion could be written to make the aside
true or false**, because it is a statement about `src/services/*.ts` — the frontend's request
shapes — not about the proxy control this Story delivers. `src/**` is not in this Story's surface
at all; the diff does not touch it.

That is a difference **in kind** from version 1, not in degree. At v1 the defect was in the benefit
clause itself: the Story named an outcome that no conforming implementation could produce, and its
own *Out of scope* did not cover the gap. Here the binding scope statement is already correct — the
Story's *Out of scope* names the CORS-simple browser path **and `GET /api/usage*` by name**, which
is the very route that falsifies the parenthetical. The Story contradicts its own aside, and the
authoritative side of the contradiction is the one already written down.

**On this report's own version 1 sentence.** Version 1 stated that "whether the re-entry cost is
worth paying is `so-orchestrator`'s and the human's call at the gate, not a reason for a reviewer to
soften its own verdict." That holds, and it is not being walked back. The reason this finding is not
routed is **not** the cost of re-invalidating the downstream chain — that cost is deliberately
excluded from the reasoning above and plays no part in it. The reason is that the finding fails this
stage's own drift test: the Story's promise is kept, its scope section is accurate, and the defect
is a factual slip in an explanatory gloss about a file outside this Story's surface. Routing it
would be routing a copy-editing correction through a stage designed for a Story whose criteria
cannot produce its own outcome.

### What this stage does instead

Recorded as **NBF-4**, with the correction stated precisely so nobody has to re-derive it, and with
the consequence named: `so-pr-preparer` reads the Story to draft the Pull Request body, and **the
parenthetical must not be carried into it**. The nine words "— which is every JSON `fetch` the real
frontend makes —" are the whole defect; deleting them leaves the clause correct and leaves every
other artifact untouched. If the human at `HUMAN_PR_APPROVAL` wants the Story exactly right before
it ships, that deletion is theirs to order, and `STORY_WRITING` is where it goes. **This stage does
not block on it.**

---

## 7. Routed item 3 — NBF-D9-LEG: no effect on AC traceability

`implementation_plan` §D9, the `task_breakdown` D9 row and `plan_review` finding 1 — all three
`APPROVED` — attribute a `statusCode === 204` assertion to the **unlisted** origin's preflight,
which `cors` cannot produce (a refusal reaches `next(undefined)` and never enters the inner
`cors()` where `optionsSuccessStatus` is applied). `so-implementation-verifier` §9 verified that at
source and adjudicated it a documentation matter. **On the narrow question routed here — does it
affect AC traceability? — the answer is no,** for three reasons each checked against the delivered
matrix and file:

1. **No AC row depends on the 204 assertion.** The matrix files
   `FR-6/D9: a listed origin preflight is answered by the middleware itself, with 204, not handed
   on` under *Requirements with no acceptance criterion of their own*, and the test carries an
   `FR-6/D9:` prefix, not an `AC-n:` one. Removing it entirely would leave AC-1 … AC-5 covered at
   7 / 8 / 2 / 5 / 2. It is a dependency-contract regression guard against the `"^2.8.5"` caret
   range, and that is what it is filed as.
2. **The AC-2 row on the same leg asserts the opposite of the incorrect prose, correctly.**
   `spec.ts:382-399` asserts `statusCode` is `undefined` on the unlisted preflight — which is what
   the package actually does, and what FR-3 "identically to the actual request" requires. Had the
   plan's prose driven the tests, an AC-2 row would now point at an assertion that can never go
   green. It does not.
3. **`so-test-writer` refusing to prefix the 204 test `AC-1:` is this stage's Level 3 discipline
   applied correctly, and should be preserved.** The test asserts nothing about the value of
   `Access-Control-Allow-Origin`, which is all AC-1 is about. A future reader "tidying" that name to
   `AC-1:` would manufacture precisely the level-3 failure this stage exists to catch — a test named
   after a criterion it does not assert. The matrix's own note says so; this stage confirms it.

The residual cost is the one the verifier named: a maintainer acting on the plan's prose in good
faith would try to assert `204` on a refusal and burn time discovering the package makes it
impossible. That is a documentation defect in three artifacts this stage neither owns nor may edit.
Carried as **NBF-5**, unrouted, for the same reason `so-implementation-verifier` gave — no loop-back
key under `RECONCILIATION` reaches `ARCHITECTURE_PLANNING` or `IMPLEMENTATION_PLANNING`, and the
delivered code and tests are already right.

---

## 8. Drift from the approved Specification

### Requirements silently dropped — none

Every `FR-n` was checked for an implementation, not assumed from the gate being green. Re-confirmed
against the source this pass; the production code is byte-identical to what version 1 assessed.

| FR | Implemented at | Evidence it is not merely declared |
|---|---|---|
| FR-1 — allow-list read from configuration | `server/cors-policy.js:35-43` | Comma split, `trim()`, one trailing-slash strip, empty-entry filter, read end to end. Asserted by `spec.ts:172-194`. |
| FR-2 — a listed origin echoed back | `server/cors-policy.js:66-69` + `server/index.js:34` | Response header asserted exactly, `spec.ts:293-299`. |
| FR-3 — unlisted origin gets no headers, is **not** rejected | `server/cors-policy.js:68` — first callback argument is the literal `null` on every path | `spec.ts:221-235`, `spec.ts:308-316`. |
| FR-4 — no `Origin` header is unaffected | `server/cors-policy.js:68` — `origin === undefined \|\|` | `spec.ts:237-246`, `spec.ts:318-329`. `200` leg: NBF-1. |
| FR-5 — an unset allow-list fails closed | `server/cors-policy.js:42` | Structural, not conditional: no `return []`, no `return undefined`, no early return. `spec.ts:143-170`, `spec.ts:331-347`. |
| FR-6 — preflight obeys the same allow-list | One `origin` callback serving both paths | Asserted rather than assumed, and now on **both** legs and **both** clauses: `spec.ts:349-354`, `:356-364`, `:366-380`, `:382-399`. This is where v2 is stronger than v1. |
| FR-7 — the setting is documented | `.env.example:51-58` | Read directly. `spec.ts:428-458`. |

NFR-1 (credentials off) has its own test, `spec.ts:401-407`; `server/index.js:34` passes exactly one
option key, read at source this pass. NFR-2 (no secret or real URL) — `.env.example` read;
placeholder only. NFR-3 (nothing else changes) — the diff touches three production paths and nothing
else.

### Behaviour that changed during coding — none

The implementation matches the Specification requirement for requirement. The trailing-slash
normalisation (`cors-policy.js:38`) and the empty-`Origin` refusal are plan decisions D4 and D5,
both named in the matrix, and both sit inside FR-1's "surrounding whitespace is ignored, and empty
entries are discarded" and FR-3's exact-match rule rather than extending them.

One behaviour delta is worth naming because a reader could raise it against NFR-3, and it is
correctly classed: before this change `cors()` answered every preflight itself with `204`; now a
**refused** preflight is handed on and Express's default `OPTIONS` handler answers `200` with
`Allow`. That is `security_review` Observation O2, and it is a consequence of FR-3's *specified*
refuse-by-omission requirement, not an undeclared change — FR-3 requires the request to continue
down the chain, and a preflight is a request. NFR-3 governs endpoint behaviour, payloads and
routing, none of which moved.

### A criterion reinterpreted — none

Each test carrying an `AC-n:` prefix was compared against the criterion's own wording. AC-1 is
asserted as a response header, not as a callback boolean (the boolean tests are supporting rows,
declared as such). AC-2's "not rejected" clause is asserted as four distinct observable properties
on the actual request and five on the preflight, not implied. AC-4's "**only**" is asserted as exact
array equality, not as membership. AC-3 is the one criterion whose literal wording (`200`) is not
asserted, and §4 states exactly how the tests differ from the Story rather than treating them as
equivalent. The two tests added at v2 were checked against the same standard: the `AC-2:`-prefixed
one asserts AC-2's second clause on `OPTIONS` and earns the prefix; the `FR-6/D9:` one does not
assert any AC and correctly does not carry one (§7).

### Scope added — none

Checked against Specification v2's *Out of scope* section by name.

| Out-of-scope item | In the diff? |
|---|---|
| Stopping the request from being executed (non-browser clients; CORS-simple browser requests) | No. Nothing in the diff inspects a body, a method or a content type; `express.urlencoded` at `server/index.js:36` is untouched and still mounted with its pre-existing `50mb` limit. The gap the Specification declares is the gap that remains — which is the correct outcome, not a defect. |
| Authentication on the proxy (OD-1) | No. No auth middleware, no shared secret, no header check. `server/index.js` is +3 / −1. |
| Rate limiting | No. No counter, no window, no dependency. |
| Any change to endpoint behaviour, payloads or routing | No. No route handler, provider or retrieval path is in the diff. |
| Setting the real origin in Railway | No. `.env.example` carries `your-frontend.example.com` (RFC 2606) and directs the operator to the deployment environment. |

Five paths in `git diff --name-status 3c043c4..HEAD`: `.env.example`, `server/cors-policy.js`,
`server/index.js`, `test/cors-policy.spec.ts`, and `docs/catalog/US-1.1-pipeline-status.md` — the
last being `so-builder`'s own workflow artifact, not product code. No dependency added
(`package.json` and `package-lock.json` absent from the diff — the rejected `supertest` proposal
stayed rejected), no config edit, no drive-by refactor.

---

## 9. Non-blocking findings

### NBF-1 — AC-3's `200` is diff-verified, not test-verified *(carried forward from v1)*

§4, AC-3. Adjudicated adequate at v1 and unchanged: neither AC-3 test asserts a literal `200`,
because `server/index.js` calls `app.listen()` at module scope and plan decision D1 rejected
`supertest` as an AGENTS.md §7.8 dependency proposal. The `/health` route is not in the diff, so no
line of this change could alter its status code; the leg this Story could have broken — the CORS
layer's non-interference with an origin-less request — is the leg that is tested, with four
behavioural assertions. `TEST_WRITING` has no remedy available under D1, so routing there would
deliver a finding to a stage that cannot act on it. Recorded so the human at `HUMAN_PR_APPROVAL`
meets the limitation rather than inheriting it silently.

### NBF-2 — `server/index.js:34` remains the Story's untested surface *(carried forward from v1)*

Not new — `security_review` v2 Finding 5 and `verification_report` v2 §2 both name it — carried
forward because it is the line on which every acceptance criterion ultimately depends. A regression
to `app.use(cors())`, the addition of `credentials: true`, or dropping the `resolveAllowedOrigins`
call would leave all **26** tests green; the two assertions added at `f981732` close a
dependency-drift blind spot under the `"^2.8.5"` caret range, not this one. Its only gate is diff
review, and that gate must be re-applied to any future edit of that line.

### NBF-3 — deploy-time action must reach the Pull Request body *(carried forward from v1)*

`plan_review` finding 1, `verification_report` residual risk, `security_review` R3. If
`ALLOWED_ORIGINS` is not set in the deployment environment before this ships, the effective list is
`http://localhost:3000` alone and the deployed frontend is refused — while `/health` keeps answering
`200` (no `Origin` header), so the deploy health check goes green on a proxy that refuses every real
browser. `security_review` v2 sharpens it: a mis-cased or doubly-slashed entry (its Findings 2 and
3) produces the same silent, total block. Belongs in the PR body; `so-pr-preparer`'s to place.

### NBF-4 — the Story's parenthetical is false and must not reach the PR body *(new at v2)*

§6. Story v2's "which is every JSON `fetch` the real frontend makes" is untrue —
`src/services/usage.service.ts:43` issues a CORS-simple, unpreflighted `HttpClient` GET to
`/api/usage`, confirmed at source here. The Story's own *Out of scope* already names the CORS-simple
path and `GET /api/usage*`, and is the correct side of the contradiction. Judged a non-blocking
prose defect rather than `story_drift`, on the reasoning in §6. **Action for `so-pr-preparer`:** do
not quote the parenthetical in the Pull Request body. The correction, if the human orders it, is the
deletion of nine words and changes no criterion, requirement, test or line of code.

### NBF-5 — NBF-D9-LEG's prose correction remains outstanding *(new at v2, carried from the verifier)*

§7. `implementation_plan` §D9, the `task_breakdown` D9 row and `plan_review` finding 1 attribute the
`204` to the unlisted preflight leg, which `cors` cannot produce. No AC traceability is affected and
the delivered tests put the assertion on the correct (listed) leg. Unrouted: no loop-back key under
`RECONCILIATION` reaches those stages, and there is nothing in the code or tests to change.

---

## 10. Verdict

**PASS**, `loop_back_stage: null`, with five non-blocking findings.

- All five acceptance criteria clear Level 1, Level 2 and Level 3 against 26 tests, every body read.
- The 24 tests carried forward from version 1 were verified unmodified at source: `+35 / −0`, two
  whole new `it(...)` blocks and nothing else.
- All seven functional and three non-functional requirements are implemented.
- No scope was added, no requirement dropped, no criterion reinterpreted.
- **The `story_drift` raised at version 1 is discharged.** Story v2's outcome clause claims only
  what the control delivers, its *Out of scope* now covers the browser path that was the gap, and
  AC-1 … AC-5 are byte-identical — exactly the condition version 1 said would make this delivery
  satisfy the amended Story unchanged.
- The one new inaccuracy in the amended Story (NBF-4) is a factual slip in an explanatory aside
  about a file outside this Story's surface, contradicted by the Story's own scope section. It fails
  this stage's drift test and is recorded, not routed.

**A verdict recorded by this stage is not human approval.** Only `/so:approve` at
`HUMAN_PR_APPROVAL` records that (AGENTS.md §10, `artifact-lifecycle.md` §2). This report is `DRAFT`
and stays `DRAFT` until the orchestrator's gate handling says otherwise.
