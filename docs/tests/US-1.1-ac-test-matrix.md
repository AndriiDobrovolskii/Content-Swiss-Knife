---
artifact: ac_test_matrix
story: US-1.1
version: 2
status: DRAFT
owner: so-test-writer
created_at: 2026-09-18T00:50:00Z
updated_at: 2026-09-18T19:00:00Z
supersedes: docs/tests/US-1.1-ac-test-matrix.md#1
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

# AC ↔ Test Matrix — US-1.1 (version 2)

Every test below lives in **`test/cors-policy.spec.ts`**, runner **`test:logic`**. Test names are
copied from the file verbatim, including the `describe` block that contains them.

## Why this version exists, and what moved

Version 1 recorded every input at version 1 and went stale after the Story was amended to v2.

**AC-1 … AC-5 are byte-identical between Story v1 and v2.** The Story's amendment history says so in
its own words (*"AC-1 through AC-5 are unchanged"*) and this stage verified it by diffing the
*Acceptance criteria* section of `git show HEAD:docs/stories/US-1.1-proxy-cors-allowlist.md` against
the working tree. **No existing row in this matrix moved.** Every test named in version 1 is still
present, under the same name, in the same `describe` block, asserting the same thing.

**Two rows are added**, for the two assertions added to the file at v2 on the human approver's
explicit instruction at `HUMAN_PLAN_APPROVAL` (Implementation Plan v2 D9's follow-up). One is an
AC-2 row; the other deliberately is **not** an AC row and sits in the *Requirements with no
acceptance criterion of their own* table — see the note under it for why, and the test strategy §3a
for the full argument.

**24 → 26 tests. `git diff` against `HEAD`: 35 insertions, 0 deletions.** Nothing was modified,
weakened, renamed, merged or deleted (AGENTS.md §7.7).

## AC-1 — a listed origin is echoed back exactly

> When `ALLOWED_ORIGINS` is set, a request carrying an `Origin` header listed in it receives an
> `Access-Control-Allow-Origin` header echoing that exact origin.

| Test | Asserts |
|---|---|
| `the composed policy, through the real cors middleware` → **`AC-1: a listed origin receives Access-Control-Allow-Origin echoing that exact origin`** | **Primary.** Drives the real `cors` middleware with `ALLOWED_ORIGINS=https://shop.example,http://localhost:3000` and `Origin: https://shop.example`; asserts the response header equals `https://shop.example` and is not `*`. This is the criterion as written. |
| `the composed policy, through the real cors middleware` → **`AC-1: a preflight from a listed origin is answered with that origin echoed back`** | The same header on the `OPTIONS` preflight (FR-6). |
| `corsOriginPolicy — the decision the cors package asks for` → **`AC-1: allows an origin that appears in the list`** | The decision underneath: the policy answers `true` for a listed origin, which is what makes `cors` reflect it. |
| `corsOriginPolicy — the decision the cors package asks for` → **`AC-1: an allow-list with several entries admits each of them`** | Every entry of a multi-entry list is admitted, not just the first. |
| `resolveAllowedOrigins — the allow-list comes from configuration` → **`AC-1: splits a comma-separated value and ignores whitespace around each entry`** | "listed in it" — the comma-separated parse and whitespace trimming (FR-1). |
| `resolveAllowedOrigins — the allow-list comes from configuration` → **`AC-1: discards empty entries instead of admitting an empty origin`** | Empty entries are dropped rather than becoming an empty-string origin (FR-1). |
| `resolveAllowedOrigins — the allow-list comes from configuration` → **`AC-1: a configured trailing slash still matches the origin a browser actually sends`** | Plan D4. A configured `https://shop.example/` still matches `Origin: https://shop.example`. |

Unchanged at v2 — seven tests, none moved.

## AC-2 — an unlisted origin gets no header, and is not rejected

> A request carrying an `Origin` header **not** in the list receives **no**
> `Access-Control-Allow-Origin` header … The request is not rejected with an error status.

| Test | Asserts |
|---|---|
| `the composed policy, through the real cors middleware` → **`AC-2: an unlisted origin receives no Access-Control-Allow-Origin header`** | **Primary, first clause.** No such header is present on the response. |
| `the composed policy, through the real cors middleware` → **`AC-2: an unlisted origin is not rejected — the request is processed, the browser blocks the response`** | **Primary, second clause.** `next` is called, its error argument is falsy, the response is not ended, and no status code was set. |
| `the composed policy, through the real cors middleware` → **`AC-2: a preflight from an unlisted origin receives no Access-Control-Allow-Origin header either`** | The same first clause on `OPTIONS`, so preflight and the actual request cannot diverge (FR-6). |
| **NEW at v2** — `the composed policy, through the real cors middleware` → **`AC-2: an unlisted origin preflight is handed on, never answered by the middleware`** | **The second clause on `OPTIONS`, which nothing previously asserted.** `nextCalled === true`, `nextError` falsy, `ended === false`, `statusCode === undefined`, and no `Access-Control-Allow-Origin`. Written from FR-6's own words — a preflight is subject to FR-3 *"identically to the actual request"* — so it is the `:308-316` assertion set applied to `OPTIONS`. **Genuinely additive:** the row above it asserts `nextError` is falsy, but `nextError` is falsy *both* when the middleware answered the request itself and when it called `next()`, so no pre-existing assertion could distinguish correct behaviour from the middleware short-circuiting the exchange. Plan review v2 non-blocking finding 1 names exactly this hole. |
| `corsOriginPolicy — the decision the cors package asks for` → **`AC-2: refuses an origin that does not appear in the list, by omission`** | The policy answers `false`, which is what omits the header. |
| `corsOriginPolicy — the decision the cors package asks for` → **`AC-2: refusal never produces an error, which would abort the request instead of omitting the header`** | FR-3's failure path: across four refused origins the callback's error argument stays falsy and is never an `Error`, and the policy does not throw. `callback(new Error(…))` is the shape most online examples use and would violate the criterion while appearing to work. |
| `corsOriginPolicy — the decision the cors package asks for` → **`AC-2: matching is exact — a different port, scheme, case or host is a different origin`** | Five near-misses (port, scheme, case, suffix host, prefix host) are refused while the listed origin is admitted. |
| `corsOriginPolicy — the decision the cors package asks for` → **`AC-2: an Origin header that is present but empty is not in the list, so it is refused`** | Plan D5: an empty `Origin` string is not the absent header of AC-3 and is refused. |

Seven at v1, **eight at v2**. The seven v1 rows are unchanged.

## AC-3 — a request with no `Origin` header is unaffected

> A request with **no** `Origin` header … is unaffected: `GET /health` still answers `200`.

| Test | Asserts |
|---|---|
| `corsOriginPolicy — the decision the cors package asks for` → **`AC-3: allows a request that carries no Origin header at all`** | **Primary.** `cors` passes `undefined` when the request carries no `Origin`; the policy must allow it, with no error. This is the decision that breaks the Railway health check if it is wrong — verified by mutation at v1: an implementation treating a missing `Origin` as "not in the list" fails this test and only this test. |
| `the composed policy, through the real cors middleware` → **`AC-3: a request with no Origin header is handed on untouched, so /health still answers`** | The middleware does not end the response, set a status, or pass an error — the route handler runs as it does today. |

**Honest limitation, carried forward unchanged.** Neither test asserts a literal `200`. A route's
status code requires an HTTP-level request, and `server/index.js` cannot be imported because it calls
`app.listen()` at module scope (plan D1). The two tests above are the stand-in: the policy's answer,
and the middleware leaving the request to continue untouched. Recorded here rather than claimed as
full coverage. This is **NBF-1**, carried in the security review as Finding 1 and in the Story's own
amendment history (*"with AC-3's `200` leg verified by diff review rather than by test"*).

Unchanged at v2 — two tests, neither moved.

## AC-4 — an unset allow-list fails closed

> When `ALLOWED_ORIGINS` is unset or empty, the allow-list defaults to `http://localhost:3000`
> **only**. It must not fall back to allowing every origin.

| Test | Asserts |
|---|---|
| `resolveAllowedOrigins — the allow-list comes from configuration` → **`AC-4: defaults to http://localhost:3000 alone when ALLOWED_ORIGINS is unset`** | **Primary.** `resolveAllowedOrigins(undefined)` equals exactly `['http://localhost:3000']` — T1's own acceptance check. |
| `resolveAllowedOrigins — the allow-list comes from configuration` → **`AC-4: falls back to that same single default for an empty or entry-less value`** | `''`, `'   '`, `','` and `' , ,  ,'` all produce the same single-entry list. |
| `resolveAllowedOrigins — the allow-list comes from configuration` → **`AC-4: never returns a value the cors package would read as "allow every origin"`** | The "must not fall back to allowing every origin" clause, written against the `cors` rule that produces it (`!options.origin \|\| options.origin === '*'`, `node_modules/cors/lib/index.js:41`): for every empty-ish input the result is a non-empty array containing neither `'*'` nor `''`. |
| `the composed policy, through the real cors middleware` → **`AC-4: with ALLOWED_ORIGINS unset, localhost:3000 is admitted and every other origin is not`** | End to end on the composed expression: `http://localhost:3000` is echoed; `https://evil.example`, `http://localhost:4200` and `https://shop.example` get no header. |
| `the composed policy, through the real cors middleware` → **`AC-4: an empty ALLOWED_ORIGINS does not reopen the wildcard`** | `''`, `'   '` and `',,'` each still refuse an unlisted origin and still admit the default one. |

Unchanged at v2 — five tests, none moved.

## AC-5 — `.env.example` documents the setting with a placeholder

> `.env.example` documents `ALLOWED_ORIGINS` with a placeholder value and a comment explaining the
> comma-separated format. No real deployed URL appears in the repository.

| Test | Asserts |
|---|---|
| `.env.example documents ALLOWED_ORIGINS` → **`AC-5: names the variable and explains the comma-separated format`** | The `ALLOWED_ORIGINS=` line exists, and the comment block immediately above it mentions the comma-separated format and the `localhost:3000` default. |
| `.env.example documents ALLOWED_ORIGINS` → **`AC-5: carries a placeholder only — no real deployed URL enters the repository`** | Every host in the configured value is loopback, a reserved example domain, or a `your-…` stand-in; and no deployment-platform hostname (`*.railway.app`, `*.vercel.app`, `*.netlify.app`, `*.onrender.com`, `*.herokuapp.com`, `*.fly.dev`) appears anywhere in the file (NFR-2). |

Unchanged at v2 — two tests, neither moved.

## Requirements with no acceptance criterion of their own

| Requirement / decision | Test | Note |
|---|---|---|
| FR-6 preflight, header behaviour | the two preflight tests listed under AC-1 and AC-2 | The Specification derives FR-6 from AC-1/AC-2; the matrix rows above are the same tests. |
| **FR-6 preflight, completion behaviour — plan v2 D9 / Risk 2 / IA-3** (**NEW at v2**) | `the composed policy, through the real cors middleware` → **`FR-6/D9: a listed origin preflight is answered by the middleware itself, with 204, not handed on`** | `statusCode === 204`, `ended === true`, `nextCalled === false` on a **listed** origin's `OPTIONS`. **Filed here and not under AC-1 on purpose:** AC-1 is about the *value of the `Access-Control-Allow-Origin` header*, and this test asserts nothing about that header. Naming it `AC-1:` would hand `so-reconciliation-reviewer` a test named after a criterion it does not assert. It is a **dependency-contract regression guard**: it is the only assertion in the repository that goes red if a future `cors` minor flips `preflightContinue` or moves `optionsSuccessStatus` from the defaults at `node_modules/cors/lib/index.js:8-12`, under the `"^2.8.5"` caret range at `package.json:51`. Without it, that flip would leave every header assertion green while the proxy began 404-ing the real frontend's preflights. Naming precedent: `does not enable credentialed CORS`, in the same block, carries no `AC-n:` prefix for the same reason. |
| NFR-1 credentials off | `the composed policy, through the real cors middleware` → **`does not enable credentialed CORS`** | No `Access-Control-Allow-Credentials` header on an allowed request. Proves the **policy** does not enable it; it cannot prove `server/index.js` passes nothing (plan D8, diff review). |
| NFR-3 nothing else breaks | — | No test of its own, by design (spec review finding 1). Verified by the other 108 logic spec files and the component spec staying green; numbers in the test generation report §2. |

## Coverage summary

| AC | Tests at v1 | Tests at v2 | Delta | State this run |
|---|---|---|---|---|
| AC-1 | 7 | 7 | — | passing |
| AC-2 | 7 | **8** | +1 | passing |
| AC-3 | 2 | 2 | — | passing |
| AC-4 | 5 | 5 | — | passing |
| AC-5 | 2 | 2 | — | passing |
| (no AC — NFR-1) | 1 | 1 | — | passing |
| (no AC — FR-6/D9) | 0 | **1** | +1 | passing |
| **Total** | **24** | **26** | **+2** | **26 passed (26)** |

Every acceptance criterion has at least one test that asserts the criterion's own wording, not the
proposed implementation's shape.

**On the state column.** At version 1 every row read `failing`, which was correct: that was the TDD
red state AGENTS.md §5 requires, and it was satisfied before commit `7b117e2`. This run is a re-record
against v2 inputs against an implementation that already exists, so the 24 carried-forward tests are
green, and so are the two new ones. That is expected here and is **not** a "tests must fail first"
violation — the two new assertions were instead proven to bite by targeted mutation, each caught by a
mutant only it catches. Test generation report §3b has the commands and the output.
