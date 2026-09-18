---
artifact: implementation_plan
story: US-1.1
version: 2
status: APPROVED
owner: so-planner
created_at: 2026-09-18T00:30:00Z
updated_at: 2026-09-18T16:00:00Z
supersedes: docs/plans/US-1.1-implementation-plan.md#1
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: open_decisions
    version: 2
  - key: impact_analysis
    version: 2
open_decisions_blocking: false
---

# Implementation Plan — US-1.1 (version 2)

## Why this version exists

Version 1 recorded `story` v1, `specification` v1, `open_decisions` v1 and `impact_analysis` v1
in `inputs_consumed`, and was stale the moment the Story was amended to v2 after `RECONCILIATION`
returned `story_drift`. This revision is re-recorded against Story v2, Specification v2
(`APPROVED`), Open Decisions v2 and Impact Analysis v2.

**This is a re-record, not a redesign.** Two things make that the honest description:

1. **The requirement surface did not move.** Impact Analysis v2 states it directly (*"FR-1 … FR-7
   and NFR-1 … NFR-3 are unchanged between Specification v1 and v2"*); what moved is Background
   prose, *Out of scope*, the OD-1 restatement, a non-normative rationale paragraph under FR-6,
   and the traceability matrix. A design bounded by the approved requirements therefore reaches
   the same decisions.
2. **The design is already built and verified.** Four commits carry it — `dc29f40` (the new
   `server/cors-policy.js`), `540a676` (the `server/index.js` wiring), `68dea71` (`.env.example`),
   `7b117e2` (`test/cors-policy.spec.ts`, 24 tests). The AGENTS.md §6 gate is green on all five
   applicable commands with the logic suite at 2381 passing, 3 skipped
   (`docs/verification/US-1.1-quality-gate-report.md`), and the change has since passed
   implementation verification, security review and AC reconciliation.

So D1 … D8 below are carried forward, and where evidence now exists they are **cited rather than
re-argued**. Re-arguing a decision that running code has already settled would invite a different
answer, and a different answer here invalidates built and tested code.

**None of D1 … D8 changed.** Three decisions are *added* — D9, D10, D11 — and all three are
records of a position on a finding, not new work: **D9 and D11 produce no task and no file
change, and D10 produces no change in this Story at all.**

## Approach

Unchanged from v1. The allow-list decision lives in a **pure, testable module**
(`server/cors-policy.js`) exporting two functions: one turning the raw environment value into a
normalised list, one producing the `origin` callback the `cors` package expects.
`server/index.js` carries only the wiring —
`app.use(cors({ origin: corsOriginPolicy(resolveAllowedOrigins(process.env.ALLOWED_ORIGINS)) }))`
at line 34, plus the import.

All seven functional requirements are then properties of functions a unit test can call directly,
and the one file no test can import keeps only wiring.

**Observed against the plan:** Impact Analysis v2 §*Observed reach vs. the v1 prediction* records
that this is exactly the shape delivered, *"down to the module name it guessed"*, and that the
residual untested surface is the single line `server/index.js:34`.

---

## Design decisions

### D1 — Pure-function extraction, not `supertest` — **unchanged, validated**

`server/index.js` calls `app.listen()` at module scope, so the file cannot be imported by a test.
Every existing `server/**` test works around this by importing a pure function —
`test/llm-routes.spec.ts` imports `resolveRequest` and `slotFor` from `server/llm-request.js` and
says so in its own header. This Story follows that precedent.

**Rejected: `supertest`.** A new dependency is an AGENTS.md §7.8 proposal requiring explicit human
approval, not a build step, and it would additionally require restructuring `index.js` to export
the app without listening — a larger change than the Story it would serve, and a second competing
way to test server code alongside the established one. See *Rejected alternatives*.

**Evidence it held:** `server/cors-policy.js` exists as a dependency-free ESM module;
`test/cors-policy.spec.ts` runs 24 tests against it on `test:logic` with no new package. Impact
Analysis v2 §*The testability constraint — resolved* confirms route 1 was taken and that the
residual untested surface narrowed to one line.

### D2 — Two functions, not one — **unchanged, validated**

```js
export function resolveAllowedOrigins(raw)   // string | undefined  ->  string[]
export function corsOriginPolicy(allowed)    // string[]  ->  (origin, cb) => void
```

FR-1 and FR-5 (parsing, fail-closed default) become testable without constructing a callback;
FR-2, FR-3, FR-4 and FR-6 (matching) become testable without touching the environment. It also
makes the fail-closed default a property of one small function a test can pin directly — which
matters because FR-5 is the requirement most likely to be violated silently.

**Evidence it held:** both exports exist with those signatures
(`server/cors-policy.js:35`, `:66`), and `test/cors-policy.spec.ts` is organised as four `describe`
blocks along exactly that seam.

### D3 — Fail closed, structurally, with no `undefined` path — **unchanged, validated**

`resolveAllowedOrigins` **always returns a non-empty array.** When `ALLOWED_ORIGINS` is unset,
empty, or parses to zero entries, it returns `['http://localhost:3000']`. Deliberately structural
rather than conditional: because the function cannot return `undefined` or `[]`, no code path hands
`cors()` a falsy `origin` and gets its permissive `*` default. `http://localhost:3000` is correct
as the default — `angular.json:44` sets the dev server's `serve.options.port` to `3000`.

**Evidence it held:** `server/cors-policy.js:42` (`configured.length > 0 ? configured : [DEFAULT_ALLOWED_ORIGIN]`),
and the security review's §1 heading answers the question in its own words — *"Does the control
actually fail closed? — **Yes, by construction**"*. `test/cors-policy.spec.ts:341-347` drives the
composed middleware with `''`, `'   '` and `',,'` and asserts the wildcard does not reappear.

This is Impact Analysis v2's highest-ranked silent-failure risk (item 1), and it is discharged by
construction rather than by a branch a later edit could remove.

### D4 — Normalise a trailing slash on *configuration*; exact match on the `Origin` — **unchanged, and its scope defended**

Parsing trims surrounding whitespace (FR-1) **and strips a single trailing `/`**. Without it, an
operator who configures `http://localhost:3000/` gets a proxy that looks configured and silently
blocks everything, with no error anywhere. Beyond that, matching is **exact string comparison** —
case-sensitive, no wildcard, no subdomain matching, no port inference — stated in the module's own
comment, where someone would go to change it.

**This is a deliberate superset of FR-1, and the plan says so rather than leaving it unremarked.**
Impact Analysis v2's silent-failure item 2 hands this over explicitly — *"that normalisation is
behaviour FR-1 does not name … The implementation is a superset of the requirement here. Surveyed,
not judged."* The judgement is made here, and the decision is to keep it, on three grounds:

- **It normalises operator-supplied configuration, not the incoming `Origin`.** The request side is
  untouched: `corsOriginPolicy` compares the browser's `Origin` verbatim. Nothing an attacker
  controls is normalised, so the matching semantics FR-2 and FR-3 describe are unchanged.
- **It cannot widen the allow-list.** Stripping a trailing `/` maps one configured string to one
  other configured string; it admits no origin the operator did not write down. The security
  review asked precisely this — §2, *"Can normalisation be abused to match an unintended origin? —
  **No**"* — and cleared it.
- **It resolves spec review finding 5a**, which the reviewer left to this stage, by normalising
  *input* rather than by changing matching semantics — so it required no re-approval of the
  Specification, and still does not.

**Evidence it held:** `server/cors-policy.js:38` (`.trim().replace(/\/$/, '')`), plus the filter on
`:40` ordered *after* the strip so a lone `/` cannot survive as an empty entry.

### D5 — An empty `Origin` header is not allowed — **unchanged, validated**

`cors` invokes the `origin` callback with `undefined` when no `Origin` header is present — that is
FR-4, and it must be allowed. A header present but empty arrives as the empty string, which is not
`undefined`, matches no entry, and is refused. The decision is to **not** special-case it and to
pin it in a test, so the behaviour is deliberate rather than incidental.

**Evidence it held:** `server/cors-policy.js:68` — `origin === undefined || allowed.includes(origin)`.

### D6 — Refuse by omission, never by error — **unchanged, validated**

`cors` calls `next(err)` whenever the callback's first argument is truthy, which aborts the
request. FR-3 requires **header omission, not rejection** — the user chose that explicitly. The
policy therefore always passes `null` first and never constructs an `Error`. Called out because
`callback(new Error('Not allowed by CORS'))` is the shape most online examples use, and copying it
would violate FR-3 while appearing to work.

**Evidence it held:** `server/cors-policy.js:68`; `test/cors-policy.spec.ts:308-316` asserts
`nextCalled === true`, `nextError` falsy, `ended === false` and `statusCode === undefined` for an
unlisted origin. Security review §3 confirms — *"Refusal is an omitted header, not an error —
**Confirmed**"*.

### D7 — Preflight needs no separate handling — **unchanged, validated**

FR-6 is satisfied by the same `origin` option: `cors` applies it to the `OPTIONS` preflight and to
the actual request alike. No extra middleware, no `app.options()` route. The requirement is still
tested directly, because a requirement that is only implied is a requirement that is only sometimes
tested.

**Evidence it held:** `test/cors-policy.spec.ts:349-364` drives the real middleware with
`method: 'OPTIONS'` for a listed and an unlisted origin and asserts the echo and the omission.

**Scope note:** D7 covers the *header* behaviour FR-6 requires. It does **not** pin the status code
`cors` answers an unlisted preflight with, because FR-6 names none. That gap is D9.

### D8 — `credentials` stays off — **unchanged, validated**

NFR-1. The `cors` default is `false` and nothing is passed to change it. Stated so a later reader
does not add it "for completeness".

**Evidence it held:** `test/cors-policy.spec.ts:366-372` asserts no
`Access-Control-Allow-Credentials` on the allowed path. Security review §4 — *"Credentials — off,
and correctly so"* — with Finding 4 recording that this becomes a live question the moment
authentication (OD-1) lands.

---

### D9 — The `cors` preflight status is an unpinned package default: **accept and record** — *new at v2, addresses IA-3*

**Produces no task and no file change.** This is a recorded position, not work.

**The finding.** FR-6's `204` answer for an unlisted origin's preflight holds only because
`node_modules/cors/lib/index.js:8-12` defaults `preflightContinue: false` and
`optionsSuccessStatus: 204`. `package.json:51` declares `"cors": "^2.8.5"`; a caret range permits
a future `2.x` minor. If `preflightContinue` flipped to `true`, the middleware would `next()` on a
preflight, Express would fall through to the 404 handler, and **every existing assertion would
still pass** — verified this run: the only `statusCode` assertions in `test/cors-policy.spec.ts`
are at `:315` and `:328`, both on the *actual*-request path, and neither preflight test at
`:349-364` reads `statusCode` or `ended` at all. Impact Analysis v2 finding C and silent-failure
item 5 state it; spec review carried it in as NBF-5.

**The decision: accept the risk and record it.** Four reasons, in order of strength:

1. **The lockfile is committed and deterministic.** `package-lock.json:5823-5824` resolves `cors`
   to `2.8.6` with an integrity hash. `npm ci` — what a clean checkout and CI run — installs
   exactly that. The exposure is not "a future `npm install`" in general; it is a *deliberate*
   re-resolve or a `cors`-touching dependency bump, which is a reviewed act, not an accident.
2. **No requirement is at stake.** FR-6 requires the *absence of a header*, and that is asserted.
   No FR, NFR or AC names a status code for a preflight. Pinning a behaviour the Specification does
   not require, inside an `APPROVED` Specification's scope, is the same category of move as IA-1
   (see D10) — it adds scope no human approved.
3. **Semver already carries the guarantee an exact pin would duplicate.** Flipping a documented
   default is breaking behaviour, which a caret range is not supposed to carry within `2.x`.
   **The counter-precedent is acknowledged rather than ignored:** `AGENTS.md:82-88` records
   `@angular/router` pinned to an exact `21.2.18` because a caret range let `npm install` resolve
   a patch that then demanded a matching `@angular/core`. That is a different failure shape — a
   peer-dependency conflict that surfaces *loudly, at install time*, where an exact pin is the only
   thing that can prevent it. Here the risk is behavioural and silent, and an exact pin would not
   detect it either; it would only postpone it to whenever someone bumps the pin. The committed
   lockfile plus a review-time control is the proportionate answer to a silent risk, and an exact
   pin is the proportionate answer to a loud one.
4. **The counter-measure is not mine to direct and would cost the whole downstream pipeline.** The
   fix that actually catches this is an assertion on the preflight status, which lives in
   `test/cors-policy.spec.ts` — owned by `so-test-writer`, currently green, and not something this
   plan may direct an edit to. Re-entering `TEST_WRITING` re-opens `IMPLEMENTATION`, `QUALITY_GATE`,
   `IMPLEMENTATION_VERIFICATION`, `SECURITY_REVIEW` and `RECONCILIATION` on a change that alters no
   production behaviour.

**The detection mechanism, stated because it is not a test.** Impact Analysis v2 already carries
`package.json` / `package-lock.json` in its *Needs re-verification even if unchanged* table with
the reason *"Any dependency bump touching `cors` re-opens this Story's behaviour."* That row is the
control. It is a review-time control, not an automated one, and this plan does not pretend
otherwise.

**Recorded as a follow-up, not directed here:** if the pipeline ever re-enters `TEST_WRITING` for
this Story on other grounds, `so-test-writer` should add — not substitute — an assertion that an
unlisted origin's preflight is answered by the middleware itself (`ended === true`,
`statusCode === 204`) rather than handed to `next()`. That strengthens the suite and weakens
nothing. It is offered as the cheapest future closure, not as a task for this Story.

**Both alternatives are recorded with their reasons in *Rejected alternatives*.** If a human at the
plan gate disagrees with this weighing, pinning `cors` to an exact `2.8.6` in `package.json` is the
§7.8 proposal to approve — this plan surfaces it and does not make it.

### D10 — `README.md` stays out of scope: **follow-up, not a task** — *new at v2, addresses IA-1*

**Produces no change in this Story.**

`README.md:157-189` reproduces the whole `.env` file inline as a fenced `dotenv` block and does not
mention `ALLOWED_ORIGINS`. Impact Analysis v2 finding A records it, and records that it is **not a
Specification violation**: FR-7 and AC-5 name `.env.example` and nothing else, and the
implementation discharged exactly what was asked.

**I do not believe it belongs in this Story's scope, and I am not adding it.** The question was put
to this stage explicitly, so here is the argument rather than silence:

- The Specification is `APPROVED`. Adding a file to the plan that no FR names and no AC requires is
  scope creep against a human-approved document, and `AGENTS.md:376` (§7.8 item 8) lists unilateral scope
  changes among the things to propose rather than execute. `so-plan-reviewer` checks for exactly
  this shape.
- The delivered change is already reconciled against AC-1 … AC-5. Widening the plan now would
  create a task whose completion no acceptance criterion can confirm and whose absence no
  acceptance criterion reports — an untraceable task, which is the defect the traceability matrix
  exists to prevent.
- The cost of deferring is bounded and known. A developer following the README builds a `.env`
  with no `ALLOWED_ORIGINS`, gets the FR-5 fail-closed default, and reaches the SPA on
  `http://localhost:3000` — the default is the dev origin, so the documented-path outcome is a
  working local setup, not a broken one. The gap is explanatory, not functional.

**Recorded as a follow-up.** README §Configuration is a manually maintained mirror of
`.env.example` with no mechanism keeping the two in step, and Impact Analysis v2 silent-failure
item 7 notes that no command in the AGENTS.md §6 gate reads `README.md`, so nothing will ever
report the drift. That is a documentation-maintenance problem larger than one variable and is the
right shape for its own small Story. A human who wants it inside US-1.1 instead can say so at the
plan gate; that is a scope decision, and this stage is not the place it gets made silently.

### D11 — `.env.example` is now a parsed test fixture: **recorded as a standing consequence** — *new at v2, addresses IA-2*

**Produces no task and no file change.** It is a risk entry and a note to future Stories.

`test/cors-policy.spec.ts:379-424` reads `.env.example` off disk at run time, locates the line
matching `/^\s*ALLOWED_ORIGINS\s*=/`, takes its value and the **contiguous comment block
immediately above it**, and asserts that the comment names the format and that the value is a
placeholder only. The file has therefore crossed from documentation into a parsed fixture.

The decision is to **leave the coupling in place**. It is what makes AC-5 and NFR-2 assertable at
all — the alternative is a test that greps for the string `ALLOWED_ORIGINS`, which would pass
against a file documenting nothing. The cost is real and belongs in *Risks*, not in a redesign:
see Risk 4. It is not weakened, worked around, or excluded (AGENTS.md §7.7).

---

## Files to create / modify

Derived from Impact Analysis v2 §*Affected files* (observed, not re-surveyed). All four are already
delivered across `dc29f40`, `540a676`, `68dea71` and `7b117e2`; the table states what the design
requires, and the right-hand column records that it is in place.

| File | Change required by this plan | State |
|---|---|---|
| `server/cors-policy.js` | **Create.** `resolveAllowedOrigins(raw)` (D2, D3, D4) and `corsOriginPolicy(allowed)` (D2, D5, D6, D7). No imports. The exact-match decision (D4) and the omission-not-error decision (D6) documented in the module's own comments. | Delivered, `dc29f40` |
| `server/index.js` | **Modify, one line plus the import.** `app.use(cors())` → `app.use(cors({ origin: corsOriginPolicy(resolveAllowedOrigins(process.env.ALLOWED_ORIGINS)) }))`. Nothing else moves. | Delivered, `540a676` (now line 34) |
| `.env.example` | **Modify.** `ALLOWED_ORIGINS` with a placeholder value and a comment stating the comma-separated format, the localhost default and the fail-closed behaviour (FR-7, NFR-2). No real deployed URL. | Delivered, `68dea71` |
| `test/cors-policy.spec.ts` | **Create** — by `so-test-writer`, not by the builder. Runner: `test:logic`. | Delivered, `7b117e2`, 24 tests |

No other production file changes. No fixture changes. No dependency added.

## FROZEN-file position

**No FROZEN file is in scope, and no AGENTS.md §9 request is made or needed.**

The §9 list at `AGENTS.md:449-455` is `src/prompts/task-a.ts`, `src/prompts/task-b.ts`,
`src/prompts/task-c.ts`, `src/prompt-core/master-system-prompt.ts` and
`src/utils/output-validator.ts`; `.arch-guard-checksums` carries exactly those five. Impact Analysis
v2 hazard row 4 confirms by checksum that none appears in `git diff --name-status 3c043c4..HEAD`,
and the gate's `bash arch-guard.sh` run is green (`docs/verification/US-1.1-quality-gate-report.md`
§5, exit 0, `ALL CHECKS PASSED`).

The sibling-file pattern (`task-a-doc.ts`, `image-manifest-coverage.ts`) is therefore not needed.
`server/cors-policy.js` is a new module for the testability reason in D1, not a frozen-file
workaround.

## Design areas not reached

The skill's design areas are stated unconditionally, so each one this Story does not enter is
discharged explicitly here rather than by omission. Every row cites Impact Analysis v2.

| Design area | Reached? | Basis |
|---|---|---|
| Domain model (`src/domain/`), Zod shape | **No** | Hazard row 3 — the diff contains no `src/domain/*.schema.ts`. No `ProductDescriptionDoc` or `ConsumablesDoc` field changes. |
| prompt → schema → renderer → validator agreement | **No** | Hazard row 3 — no link of the chain is touched: no `src/prompts/*`, no `src/prompt-core/*`, no `src/render/render-{description,consumables}.ts`, no `src/utils/output-validator.ts`. Nothing changes what the model is asked for, the Zod shape, the Doc → HTML rendering, or the enforced criteria. The links stay in agreement because none of them moves. |
| AGENTS.md §4 HTML acceptance criteria | **Not applicable** | This Story renders nothing. No renderer or validator is in the diff, so the §4 criteria remain enforced exactly where they already are (`src/utils/output-validator.ts`, unchanged and FROZEN). |
| `PromptPayload` / `systemBlocks` ↔ `userContent` separation (AGENTS.md §3) | **Not applicable** | No prompt builder changes; `src/prompt-core/payload.ts` is not in the diff. The prompt-caching block separation is untouched, so there is no caching consequence to state. |
| Corpus fixture compatibility (`test/fixtures/corpus/`) | **Not applicable** | Hazard row 5 — the six corpus files are unchanged and no domain schema moves, so nothing needs to re-parse and nothing is regenerated. |
| Angular surface (`src/app`, `src/services`) | **No** | No component, signal, computed or service changes; `npm run test:components` is untouched (hazard row 6). No RxJS is introduced anywhere. |
| `server/usage/store.js` migration-free reality | **Not applicable** | Hazard row 7, second half — this Story adds no column and never touches `server/usage/store.js`, so the `CREATE TABLE IF NOT EXISTS` silent-no-op trap is not entered. |
| `STORE_REGISTRY` / locales / currency | **No** | Hazard rows 1 and 2; Specification v2 Scope records `Stores: none`, `Locales: none`. No language list or currency symbol is introduced anywhere, in or out of `STORE_REGISTRY`. |

## Validation strategy

| Category | Runner | Covers |
|---|---|---|
| Unit — `resolveAllowedOrigins` | `test:logic` | FR-1 (parsing, whitespace, empty entries), FR-5 (fail-closed default), D4 (trailing slash on configuration) |
| Unit — `corsOriginPolicy` | `test:logic` | FR-2 (exact echo via `callback(null, true)`), FR-3 (omission via `callback(null, false)`, never an `Error`), FR-4 (`undefined` origin allowed), D5 (empty string refused) |
| Integration — the composed middleware against the real `cors` package | `test:logic` | FR-2, FR-3, FR-5, FR-6, NFR-1 at header level: the policy is passed to `cors()` and driven with a request/response double, including `method: 'OPTIONS'` on both the listed and the unlisted leg |
| Repository assertion — `.env.example` | `test:logic` | FR-7, NFR-2 — the variable is documented with a format comment and a placeholder-only value |
| **Existing suite** | `test:logic` + `test:components` | **NFR-3.** Per spec review finding 1, NFR-3 has no assertion of its own and is discharged by the pre-existing suite staying green — in particular the `server/**` specs Impact Analysis v2 hazard row 7 names (`llm-routes`, the three provider specs, `pricing`, `usage-store`, `retry`, `json-parse`, `build-info`, `call-log`, `describe-error`). `so-test-writer` records this rather than writing a vacuous test for it. |

No component test. No fixture change. No new dependency.

**Observed:** the delivered suite is 24 tests in four `describe` blocks on `test:logic`, and the
full logic suite is green at 2381 passing / 3 skipped.

**One requirement leg is verified by diff review rather than by test, and is stated openly:** AC-3's
`GET /health` actually answering `200`. The middleware-level pass-through for an origin-less
request *is* asserted (`test/cors-policy.spec.ts:318-329`), but `server/index.js` cannot be
imported, so the route's status is not. This is NBF-1, carried in the security review as Finding 1.

## Risks

| # | Risk | How it would surface |
|---|---|---|
| 1 | The `index.js` wiring is correct in isolation but wired wrong | Not covered by a unit test — `index.js` cannot be imported. Mitigated by the change being one line and by `so-implementation-verifier` reading the diff. **Stated openly: `server/index.js:34` is the untested surface of this Story.** Security review Finding 1. |
| 2 | **A `cors` minor moves `preflightContinue` or `optionsSuccessStatus`** (D9) | It would **not** surface in the suite: every preflight assertion checks headers, not status. It surfaces only at review time, through Impact Analysis v2's *needs re-verification* row on `package.json` / `package-lock.json`. Accepted deliberately — see D9 for the full reasoning and the two rejected counter-measures. |
| 3 | The `cors` package's falsy-`origin` branch changes | FR-5's fail-closed guarantee rests on `cors` reading a falsy `origin` as "allow every origin", which `server/cors-policy.js:25-31` guards against by never returning `[]` or `undefined`. A change here would be *safer*, not less safe — the guard is a superset — but the module comment would become inaccurate. Same detection mechanism as Risk 2. |
| 4 | **`.env.example` is now parsed by a test** (D11) | An edit to `.env.example` from a Story with nothing to do with CORS can fail `npm run test:logic`. The blast radius is narrow and worth stating precisely: the `ALLOWED_ORIGINS=` line and the **unbroken comment block immediately above it**. Inserting a blank line into that comment block, or reordering the file so another setting's comment abuts the variable, breaks the AC-5 tests without changing any behaviour. Nothing in `.env.example` itself says a test reads it, so the failure will look unrelated to its cause. Impact Analysis v2 finding B. |
| 5 | The test's hand-rolled request/response double couples to `cors` internals | `test/cors-policy.spec.ts:100-134` implements `setHeader` / `getHeader` / `removeHeader` / `statusCode` / `end` because that is what `cors` (and the `vary` package) call. A package change to *which* response methods it uses breaks the test even when behaviour is intact. A loud failure, not a silent one — accepted as the price of testing against the real middleware rather than a mock of it. |
| 6 | **`README.md` drift** (D10) | Silent by definition: no command in the AGENTS.md §6 gate reads `README.md`, so nothing reports it. Deferred deliberately, not overlooked. Impact Analysis v2 finding A and silent-failure item 7. |
| 7 | The deployed frontend origin is not configured in Railway when this ships | The deployment starts refusing the real frontend — fail-closed cutting both ways. Out of scope per the Story (a deployment action, not a code change), but someone must take it; `so-pr-preparer` should surface it in the PR body. Security review R3. |
| 8 | **Residual, not introduced:** CORS does not stop the credit spend | A non-browser client, and a CORS-simple cross-origin form POST from a third-party page, both still reach `/api/llm/*` and spend credits. Specification v2 places this out of scope and points at **OD-1** (non-blocking). Recorded so the residual risk is visible at the plan gate, not because this plan can address it. Security review R1, R2. |

## Rejected alternatives

| Alternative | Why it lost |
|---|---|
| **`supertest` + restructuring `index.js` to export the app** (D1) | A new dependency is an AGENTS.md §7.8 proposal needing explicit human approval, and it would additionally require splitting `app` from `app.listen()`. Larger than the Story it serves, and it introduces a second competing way to test server code alongside the pure-function precedent `test/llm-routes.spec.ts` set. |
| **A single combined function** (`corsPolicyFromEnv(process.env)`) (D2) | It would make FR-5's fail-closed default testable only through environment manipulation, and would couple the matching tests to the parsing tests. The highest-risk requirement in the Story deserves a function a test can pin on its own. |
| **Refusing an unlisted origin with `callback(new Error(...))`** (D6) | Directly violates FR-3, which requires header omission and explicitly *not* rejection. Recorded because it is the shape most online examples use, so it is the likeliest wrong turn on a future edit. |
| **A dedicated `app.options()` route for preflight** (D7) | Redundant — `cors` already applies the `origin` option to preflight — and actively harmful: a second code path for preflight is exactly how preflight and the actual request come to disagree (Impact Analysis v2 silent-failure item 4). |
| **Case-insensitive or subdomain matching** (D4) | Not required by FR-2, and each widens the allow-list beyond what the operator wrote down. Exact matching is the conservative default and is documented in the module so a future change is a deliberate one. Security review Finding 3 records the operator-facing cost (a case mismatch is refused with no log) as non-blocking. |
| **Pinning `cors` to an exact `2.8.6` in `package.json`** (D9) | It is an AGENTS.md §7.8 dependency change requiring human approval, and it buys little the committed lockfile does not already provide: `npm ci` is already deterministic at 2.8.6. It also trades a silent-behaviour risk for a silent-staleness risk — an exact pin stops receiving `cors` patch fixes, including security ones, until someone notices. Surfaced here for a human to overrule at the plan gate; **not proposed by this plan.** |
| **Directing an assertion on the preflight `204` into `test/cors-policy.spec.ts`** (D9) | Out of this stage's authority twice over: tests are `so-test-writer`'s artifact, and the 24 existing tests are green and reconciled. Re-entering `TEST_WRITING` re-opens `IMPLEMENTATION`, `QUALITY_GATE`, `IMPLEMENTATION_VERIFICATION`, `SECURITY_REVIEW` and `RECONCILIATION` for a change that alters no production behaviour and discharges no requirement. Recorded in D9 as a follow-up for the next time that stage legitimately runs. |
| **Adding `README.md` to this plan's scope** (D10) | Scope creep against an `APPROVED` Specification: FR-7 and AC-5 name `.env.example` and nothing else, so the resulting task would be untraceable to any acceptance criterion. Argued at length in D10 and recorded as a follow-up instead. |

## Traceability

| Requirement | Design decision / file |
|---|---|
| FR-1 | D2, D4 — `resolveAllowedOrigins` in `server/cors-policy.js` |
| FR-2 | D2, D4 — `corsOriginPolicy`, exact string match |
| FR-3 | D6 — `callback(null, false)`, never an `Error` |
| FR-4 | D5 — an `undefined` origin is allowed |
| FR-5 | D3 — always a non-empty array; no `undefined`/`[]` path |
| FR-6 | D7 — the same `origin` option governs preflight (header behaviour); D9 records the unpinned status default |
| FR-7 | `.env.example` — placeholder value plus format comment |
| NFR-1 | D8 — `credentials` left at the package default `false` |
| NFR-2 | `.env.example` — placeholder hosts only; D10 keeps no real URL entering via `README.md` either |
| NFR-3 | Existing suite green, per *Validation strategy*; no route, payload or middleware order changes — D1 confines the production diff to `server/cors-policy.js` and one line of `server/index.js` |

Every FR and NFR traces to a design decision or a named file. D9, D10 and D11 are records of a
position on an Impact Analysis v2 finding and **produce no task and no file change**;
`so-implementation-planner` should derive no work from them.
