---
artifact: plan_review
story: US-1.1
version: 2
status: APPROVED
owner: so-plan-reviewer
created_at: 2026-09-18T00:40:00Z
updated_at: 2026-09-18T18:00:00Z
supersedes: docs/reviews/plans/US-1.1-plan-review.md#1
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
open_decisions_blocking: false
---

# Plan Review: US-1.1 — Restrict proxy CORS to an allow-list (version 2)

**Verdict:** PASS
**Loop-back:** n/a

> `PASS` here is **not** human approval. Only `/so:approve` records that (AGENTS.md §10).

## Why this version exists

Version 1 of this review consumed `specification` v1, `impact_analysis` v1,
`implementation_plan` v1 and `task_breakdown` v1, and went stale when the Story was amended to
v2 after `RECONCILIATION` returned `story_drift`. This revision re-reviews against Story v2,
Specification v2 (`APPROVED`), Impact Analysis v2, Implementation Plan v2 and Task Breakdown v2.

**Input currency checked (not a `BLOCKED` condition).** Specification v2 is `APPROVED`;
`story`, `impact_analysis`, `implementation_plan` and `task_breakdown` are all at version 2 with
`supersedes` set to their own `#1`, and none is `SUPERSEDED` or `ARCHIVED`. Their `status: DRAFT`
is correct mid-flight — `DRAFT` → `APPROVED` belongs to `so-orchestrator` at the human gate
(`artifact-lifecycle.md` §1), not to this stage. `open_decisions_blocking: false` on every input;
OD-1 is non-blocking by its own record.

## Summary

Buildable as written, and — unusually — already built: `dc29f40` (T1), `540a676` (T2),
`68dea71` (T3) and `7b117e2` (the tests). The "re-record, not a redesign" claim both documents
make was **verified against the v1 versions in git, not accepted**: D1 … D8 are substantively
unchanged and the breakdown yields the same three tasks, in the same order, on the same track,
touching the same three files. The three added decisions (D9, D10, D11) each correctly produce no
task, and no acceptance criterion is left unreachable. Five non-blocking findings travel with this
`PASS`; none of them has a landing spot in a loop-back that would not require a stage to exceed
its own authority.

## 0. The re-record claim, verified against v1

Re-derived from `git show HEAD:docs/plans/US-1.1-implementation-plan.md` and
`git show HEAD:docs/plans/US-1.1-task-breakdown.md`, diffed against the working-tree v2 files.

| Claim under test | Verdict |
|---|---|
| "None of D1 … D8 changed" | **Holds.** Same eight headings, same decisions, same rejected alternatives. The deltas are evidentiary (`— unchanged, validated` plus a citation), not decisional. |
| D2's signature | `resolveAllowedOrigins(env)` → `resolveAllowedOrigins(raw)`. Parameter **name** only; the contract in both is `string \| undefined → string[]`. Not a design move. |
| D4's scope | v1: "Normalise a trailing slash; document the rest as exact match". v2: "…on *configuration*; exact match on the `Origin`". v2 makes explicit which side is normalised; v1 already normalised on the parsing side only. A clarification, not a relocation — and the delivered `server/cors-policy.js:38` sits in `resolveAllowedOrigins`, i.e. the configuration side, matching both. |
| D7's validation route | v1 tested preflight by "calling the policy with the same inputs a preflight would produce"; v2 records the delivered test driving the real middleware with `method: 'OPTIONS'`. **Stronger**, not different, and it is what shipped. |
| v1 Risk "the `cors` callback contract differs from what D6 assumes" dropped in v2 | Correctly retired: the contract is now observed, and v2 Risk 3 carries the residual (`cors`'s falsy-`origin` branch). |
| "The same three tasks in the same order" | **Holds.** T1 → T2 → T3, all `server`, `server/cors-policy.js` / `server/index.js` / `.env.example`, dependencies `none` / `T1` / `T1`. Additions are the `Status` rows, the D8 and D4 notes, T3's comment-block warning, the fourth-task argument and the extra coverage tables. |
| AC-3's mapping narrowed (v1: "T1"; v2: "T1 at middleware level + diff review on T2") | **More honest, not a regression.** It matches NBF-1 and the security review's Finding 1. |

**No decision moved silently.** Nothing in v2 invalidates the built and tested code.

## 1. Specification coverage (re-derived, both directions)

Derived from Specification v2's FR/NFR text and the Story's AC list, not read back from the
plan's own tables.

| FR / NFR | Reached by | Verdict |
|---|---|---|
| FR-1 read the allow-list from configuration | T1 (D2, D4) — `resolveAllowedOrigins` | covered |
| FR-2 listed origin echoed exactly | T1 (D2) — exact `includes` match; T2 puts it in the request path | covered |
| FR-3 unlisted origin gets no header, and no error | T1 (D6) — `callback(null, false)`, never an `Error` | covered |
| FR-4 no `Origin` is unaffected | T1 (D5) — `origin === undefined` allowed | covered |
| FR-5 unset fails closed | T1 (D3) — always a non-empty array | covered |
| FR-6 preflight obeys the same list | T1 (D7, header behaviour asserted with `method: 'OPTIONS'`), T2 (wiring) | covered — see finding 1 on the status-code leg |
| FR-7 the setting is documented | T3 | covered |
| NFR-1 credentials stay off | T2 by passing nothing (D8); asserted in T1's composed-middleware block | covered |
| NFR-2 no secret or real URL | T3 | covered |
| NFR-3 nothing else changes behaviour | no task of its own — the pre-existing suite across T1–T3 | covered, correctly (spec review finding 1: a vacuous test would be worse) |

| AC | Reachable through | Verdict |
|---|---|---|
| AC-1 | T1 (FR-1, FR-2, FR-6) | reachable |
| AC-2 | T1 (FR-3, FR-6) | reachable |
| AC-3 | T1 at middleware level; the `GET /health` `200` leg by diff review on T2 (NBF-1) | reachable |
| AC-4 | T1 (FR-5) | reachable |
| AC-5 | T3 (FR-7) | reachable |

| Task | Traces to | Verdict |
|---|---|---|
| T1 | plan D1–D7 → FR-1 … FR-6 | ok |
| T2 | plan D7 (wiring), D8 → NFR-1, and the request-path leg of FR-1 … FR-6 | ok |
| T3 | plan `.env.example` row → FR-7, NFR-2 | ok |

**No FR reaches no task. No task traces to nothing.**

**Scope creep, checked against Specification v2 *Out of scope* by name.** That section names:
stopping request execution (non-browser clients and the CORS-simple browser path), rate limiting,
any change to endpoint behaviour/payloads/routing, and setting the real origin in Railway. No task
touches any of them. `server/index.js`'s diff is one import plus one line, so routing, payloads and
middleware order are untouched; `.env.example` carries a placeholder host only
(`http://localhost:3000,https://your-frontend.example.com` — verified), so no real deployed URL
enters the repository. **Clear.**

One deliberate superset is recorded rather than passed over: D4's trailing-slash strip is behaviour
FR-1 does not name (Impact Analysis v2 silent-failure item 2 says so and declines to judge it).
Judged here: **not scope creep.** It traces to FR-1's parsing clause, resolves spec review finding
5a, is argued as a superset in the plan rather than smuggled, normalises only operator-supplied
configuration (never the attacker-controlled `Origin`), and cannot admit an origin the operator did
not write down — security review §2 cleared exactly that question. See non-blocking finding 4.

## 2. FROZEN files (AGENTS.md §9)

| Task | Files touched | In the §9 list? | §9 stop present? | Sibling-file pattern? | Verdict |
|---|---|---|---|---|---|
| T1 | `server/cors-policy.js` (new) | no | n/a | n/a — it is a new module for D1's testability reason, not a frozen-file workaround | ok |
| T2 | `server/index.js` | no | n/a | n/a | ok |
| T3 | `.env.example` | no | n/a | n/a | ok |

Re-derived, not copied: the §9 list at `AGENTS.md:449-455` is `src/prompts/task-a.ts`,
`src/prompts/task-b.ts`, `src/prompts/task-c.ts`, `src/prompt-core/master-system-prompt.ts`,
`src/utils/output-validator.ts`; `.arch-guard-checksums` carries exactly those five lines and no
others. None of the three task files appears in either.

**Plan assumes approval it does not have: no.** The plan makes the opposite move where it matters —
D9 explicitly declines to pin `cors` because that is an AGENTS.md §7.8 dependency change, and
surfaces it for the human gate instead of executing it. That is the §7.8 shape done correctly.

## 3. Architecture rules (AGENTS.md §3)

| Rule | Checked | Finding |
|---|---|---|
| 1 — no direct SDK outside `server/providers/` | yes | `server/cors-policy.js` imports nothing at all (verified — the file has zero `import` statements). T2 adds one relative import of that module. No provider SDK is touched. **Clear.** |
| **2 — retrieval separate from generation** (no automated check anywhere) | **yes, deliberately** | **Clear.** Read against what the plan actually proposes, not against its summary: the change is one Express middleware mounted once at `server/index.js:34`, before any route. It creates no call path between `server/retrieval/` and the generation path, moves no code between them, and introduces no module that both import — `cors-policy.js` is imported by `index.js` alone. That the policy applies to `/api/retrieval/*` as well as `/api/llm/*` is one middleware applying uniformly, which is not the two concerns being mixed. |
| 3 — prompt text out of services | yes | **Clear.** No prompt text anywhere in scope; no `src/prompts/` or `src/prompt-core/` file is reached. |
| 4 — no key in the bundle | yes | **Clear.** Nothing reaches `src/`. `.env.example` takes a placeholder host only, and NFR-2 is asserted by the T3 test block. No key, and no real deployment URL, enters a tracked file. |
| 5 — no existing feature broken | yes | **Clear.** NFR-3 is discharged by the pre-existing suite; FR-4 specifically protects the Railway health check, which is the one existing behaviour a CORS change could plausibly break. |
| `STORE_REGISTRY` sole source of locales/currency | yes | **Clear.** Untouched. The Story introduces no locale, language list, currency symbol or store value, in or out of the registry; Specification v2 Scope records `Stores: none`, `Locales: none`. |
| `systemBlocks` not collapsed into `userContent` | yes | **Clear.** No prompt builder is reached; `src/prompt-core/payload.ts` is not in scope, so the prompt-caching block separation is untouched. |

## 4. prompt → schema → renderer → validator

- **Links touched: none.** No `src/prompts/*`, no `src/prompt-core/*`, no `src/domain/*.schema.ts`,
  no `src/render/render-{description,consumables}.ts`, no `src/utils/output-validator.ts`.
- **Stay in agreement:** yes, trivially — none of them moves, so none can fall out of step.
- **Contract-before-consumer ordering holds:** yes. T1 creates `server/cors-policy.js`; T2 imports
  it. T2 could not run before T1, and the breakdown orders them that way and says why. The
  delivered commit order (`dc29f40` → `540a676` → `68dea71`) matches.
- **§4 criteria the renderer must keep satisfying:** **not applicable, and the list is complete for
  what is being changed** — this Story renders nothing. The plan's *Design areas not reached* table
  discharges each unreached area explicitly rather than by omission, which is the right form.

## 5. Task quality

| Check | Result |
|---|---|
| All eight fields present on every task | **yes — verified against the canonical `so-implementation-planner/assets/task-template.md`**, whose eight are Track, Depends on, FROZEN, What changes, Files, Tests to turn green, Acceptance check, Notes. T1, T2 and T3 each carry all eight. The added **Status** row is additive and does not displace one. |
| Acceptance checks observable | yes — T1 names a concrete return value (`['http://localhost:3000']`, not `[]`/`undefined`/`['*']`); T2 names the exact diff shape plus the gate commands; T3 names the describe block and the file content. None is "the code compiles". |
| Each task could end in one green commit (§13) | yes — and did: one commit each, `dc29f40` / `540a676` / `68dea71`. |
| No task spans two tracks | yes — all three are `server`. |
| Ordered by dependency and risk, riskiest first, rationale stated | yes, and the rationale is correct: T1 carries D3, D4 and D6, the three decisions that could have been wrong, and it is first. The `depends-on: T1` edge on T3 is acknowledged in v2 as conservative (T3's assertion imports nothing from T1) and carried forward unchanged — which is the right call, since no v2 input delta justifies re-deciding an ordering edge under built code. |
| Fixture updates sit with the change that moves them | n/a — no fixture change. `.env.example` is a *parsed* fixture (D11), and its edit sits in T3, with the change that moves it. |

## 6. Test strategy

| Check | Result |
|---|---|
| Every task names test files **and** runner | yes — `test/cors-policy.spec.ts`, runner `test:logic`, named per task and narrowed to the relevant describe blocks. |
| Component specs named `*.component.spec.ts` | n/a — no component test, correctly: no Angular surface is reached, and `vitest.config.ts` excludes `**/*.component.spec.ts` from the logic runner, so a misnamed file would run in the wrong runner. None exists here. |
| Untested tasks justify changing no behaviour | **T2 does not qualify — see finding 2.** T2 *is* the behavioural fix and has no test. The justification (module-scope `app.listen()`, `supertest` declined as a §7.8 proposal) is sound and stated openly, but it is a justification of impossibility, not of "changes no behaviour". Carried forward from v1 as non-blocking, now additionally backstopped by the verification report and security review Finding 1. |
| Failure paths from the FRs are covered | yes for every FR that declares one: FR-3's (must not be an `Error` — asserted, `nextError` falsy and `statusCode === undefined` at `test/cors-policy.spec.ts:314-315`), FR-4's (must not block the origin-less request — asserted at `:327-328`), FR-5's (must not reopen the wildcard — asserted against `''`, `'   '` and `',,'`), FR-1's (a malformed entry simply never matches). **One leg is header-only — see finding 1.** |
| Nothing relies on weakening/skipping/excluding a test (§7.7) | yes. The breakdown states the tests were turned green without weakening them, and D11 explicitly refuses to weaken the `.env.example` assertion into a string grep. No `skip`/`only`, no coverage narrowing, no `exclude:` change anywhere in scope. |

## 7. Impact-analysis fidelity

- **Plan consumed the survey rather than re-deriving it: yes.** The *Files to create / modify* table
  is explicitly "derived from Impact Analysis v2 §*Affected files* (observed, not re-surveyed)";
  D1 picks route 1 of the two the survey named; the *Design areas not reached* table cites a hazard
  row per line; D9, D10 and D11 exist precisely to take a position on IA-3, IA-1 and IA-2 rather
  than to re-open them. No contradiction of the survey was found.
- **Files touched but not surveyed: none.** The plan's four files (`server/cors-policy.js`,
  `server/index.js`, `.env.example`, `test/cors-policy.spec.ts`) are exactly the survey's observed
  must-change set. Neither a survey gap nor scope growth.

## The four items routed to this review

### 1. D9 — accept-and-record the unpinned `cors` preflight default: **adequate. Not `changes_required`.**

The finding's facts were re-verified this run, not taken on trust:
`node_modules/cors/lib/index.js:8-12` does default `preflightContinue: false` and
`optionsSuccessStatus: 204`; `package.json:51` does declare `"cors": "^2.8.5"`; and
`package-lock.json:5823-5824` does resolve to `2.8.6` with an integrity hash. The test-coverage
claim also holds: the only `statusCode` assertions in `test/cors-policy.spec.ts` are at `:315` and
`:328`, both on the actual-request path.

**The gap is real and is slightly sharper than the plan states it.** The unlisted-preflight test
asserts the absent header and `response.nextError` falsy — but `nextError` is *also* falsy when
`next()` was never called, so that assertion cannot distinguish "the middleware answered the
preflight itself" from "the middleware handed it on". Nothing in the suite pins which of those two
happened. That is the precise shape of the hole.

**Why accept-and-record is nonetheless adequate, on grounds this review verified independently:**

- **FR-6's normative content is asserted.** FR-6 requires that an unlisted origin's preflight
  carries no `Access-Control-Allow-Origin`. That is asserted directly. No FR, NFR or AC names a
  status code for any preflight — re-read against Specification v2 to be sure.
- **The refusal is status-independent by construction.** `corsOriginPolicy` refuses with
  `callback(null, false)` (`server/cors-policy.js:68`), which omits the header. No value of
  `preflightContinue` or `optionsSuccessStatus` can turn an omitted header into a present one, so
  no flip of either default can make an unlisted origin's response readable by the calling page.
  The security property FR-3 and FR-6 exist to deliver does not rest on the unpinned value. (The
  plan's own account of what *would* happen instead — Express falling through to a 404 handler — is
  the plan's claim, not one this review verified or needs.)
- **Both counter-measures would require a stage to exceed its authority.** Pinning `cors` is an
  AGENTS.md §7.8 item-8 dependency change that a human must approve; the plan surfaces it for the
  plan gate and declines to make it, which is §7.8 performed correctly rather than evaded. Directing
  an assertion into `test/cors-policy.spec.ts` is `so-test-writer`'s artifact, and the plan is right
  that reaching for it re-opens `TEST_WRITING` → `IMPLEMENTATION` → `QUALITY_GATE` →
  `IMPLEMENTATION_VERIFICATION` → `SECURITY_REVIEW` → `RECONCILIATION` on a change that alters no
  production behaviour. A `changes_required` here has no landing spot: `ARCHITECTURE_PLANNING`
  would be told to redo a decision it made correctly within its authority.
- **It is not hidden.** D9, Risk 2, the follow-up note for the next legitimate `TEST_WRITING` run,
  and the Impact Analysis re-verification row all carry it. The plan states in its own words that
  the control is review-time and not automated.

Recorded as non-blocking finding 1, including the one thing the plan does not address: where that
review-time control lives after this Story archives.

### 2. D10 — `README.md` argued out of scope: **correct. Not `changes_required_specification`.**

Verified at the source: `README.md:157-189` does reproduce the whole `.env` file inline as a fenced
`dotenv` block ending at `PORT=3001`, and `ALLOWED_ORIGINS` does not appear in it. The file is
stale.

The plan's argument is the right one and this review reaches it independently. FR-7 and AC-5 name
`.env.example` and nothing else; a README task would trace to no acceptance criterion, which is
exactly the untraceable-task shape axis 1 of this review exists to catch, and adding it to a plan
derived from an `APPROVED` Specification is the unilateral scope change AGENTS.md §7.8 item 8 says
to propose rather than execute. The plan proposes it — as a separate documentation Story — and says
a human may overrule that at the plan gate. That is the correct disposal.

The plan's cost assessment also checks out: a developer following the README builds a `.env` with
no `ALLOWED_ORIGINS`, takes the FR-5 fail-closed default, and reaches the SPA on
`http://localhost:3000` — which `angular.json:44` confirms is the dev server port. The gap is
explanatory, not functional.

### 3. D11 — the `.env.example` test-fixture coupling: **acceptable, and correctly surfaced.**

The coupling is what makes AC-5 and NFR-2 assertable as behaviour rather than as a string grep, and
refusing to weaken it to a grep is §7.7 discipline, not a shortcut. It is recorded in three places a
future editor could reach it: plan Risk 4, the Impact Analysis *needs re-verification* row, and —
most usefully — T3's own Notes, where a builder editing that file will see it. That is a standing
risk carried, not a defect. Non-blocking finding 3 records the one residual, without directing a
change to the file.

### 4. The fourth task: **discharged, not overlooked.**

The breakdown argues the absence explicitly in *The fourth task that is not here*, one row per added
decision, and repeats the disposal in its *Plan item → task* table (`D9 → no task`, `D10 → no task`,
`D11 → no task`) with the reason in each cell. Cross-checked against the plan, which instructs in
its own closing line that `so-implementation-planner` derive no work from D9, D10 or D11 — so the
breakdown is following the plan, not silently dropping three decisions.

**And no acceptance criterion is left unreachable by a task:** AC-1, AC-2 and AC-4 → T1; AC-3 → T1
at middleware level with the `GET /health` `200` leg by diff review on T2 (NBF-1, stated openly);
AC-5 → T3. Re-derived in §1 above from the Story's AC list.

## Verdict rationale

`PASS` because all seven axes are clear and every finding is either non-blocking or has no
loop-back that would not require a stage to exceed its authority.

**`changes_required` → `ARCHITECTURE_PLANNING` considered and rejected** (the candidate was D9).
The design is not wrong: the fail-closed guarantee, the omission-not-error refusal and the
preflight handling are all correct and verified, and D9's gap is a *test* gap about a status code no
requirement names. Sending it back would ask `so-planner` either to make a §7.8 dependency change a
human must make, or to direct an edit to another stage's artifact — both outside its authority, and
both against live, green, reconciled code.

**`changes_required_tasks` → `IMPLEMENTATION_PLANNING` considered and rejected** (the candidate was
T2's absent test, finding 2). The decomposition is not what is wrong. Splitting T2 further changes
nothing, and a task to introduce `supertest` is the same §7.8 dependency approval D1 already
declined with reasons. This was rejected for the same reason at v1 and nothing in the v2 inputs
moves it.

**`changes_required_specification` → `SPECIFICATION` considered and rejected** (the candidate was
D10). This is the adjacent verdict a reader will reach for: if the README's staleness means the
Specification was incomplete, this review should loop back to `SPECIFICATION` rather than pass. It
does not. FR-7 and AC-5 name `.env.example` deliberately and the implementation discharged exactly
that; Impact Analysis v2 finding A records in its own words that this is "not a Specification
violation"; and the README mirrors the whole `.env` file inline with no mechanism keeping the two in
step, so the defect predates US-1.1 and will outlive it regardless of what this Story documents. The
gap is explanatory, not functional. A Specification is not incomplete because a separate,
unsynchronised document is stale.

**`BLOCKED` considered and rejected.** Every input is current and non-`SUPERSEDED`; the
Specification is `APPROVED`; OD-1 is non-blocking on its own record and every input carries
`open_decisions_blocking: false`.

`PASS` is **not** human approval. The plan gate is where D9's `cors` pin proposal and D10's
in-or-out scope question get answered, and this review deliberately leaves both there.

## Non-blocking findings

1. **D9's detection mechanism outlives nothing.** The control for a `cors` bump silently moving
   `preflightContinue` is a row in Impact Analysis v2's *needs re-verification* table — an artifact
   that archives with this Story, inside a document nobody reads while bumping a dependency. The
   plan is honest that this is review-time and not automated, but does not address its durability.
   Observed, not directed: the two places it could live durably are the Pull Request body (which
   `so-pr-preparer` is already asked to use for the Railway origin, Risk 7) and D10's proposed
   follow-up documentation Story. Also worth recording precisely, for whoever closes it: the
   existing unlisted-preflight test's `nextError` falsy assertion cannot distinguish "answered by
   the middleware" from "handed to `next()`", because `nextError` is falsy in both cases — so the
   closure D9 sketches (`ended === true`, `statusCode === 204`) is genuinely additive, not a
   restatement of what is already asserted.
2. **T2 changes behaviour and has no test** — carried forward from version 1, still true, still
   non-blocking. T2 *is* the Story's fix. The exemption for an untested task is "changes no
   behaviour", and T2 does not meet it; what it meets is impossibility — `server/index.js` calls
   `app.listen()` at module scope and cannot be imported, and D1 declined `supertest` as a §7.8
   proposal. Proportionate for one line, and now additionally backstopped by
   `docs/verification/US-1.1-verification-report.md` and security review Finding 1, both of which
   read the diff. Recorded again so that if this pattern recurs on a larger change, the `supertest`
   proposal is put to a human rather than declined by default a third time.
3. **`.env.example`'s fixture coupling is invisible from `.env.example`.** D11 and T3's Notes warn
   the builder of *this* Story; nothing warns the author of an unrelated Story who reorders the file
   or inserts a blank line into the comment block and fails `npm run test:logic` for a reason that
   looks unrelated. The obvious mitigation — a marker line in the file itself — is deliberately
   **not** directed here: it would be a change to a file whose content AC-5 governs, made outside
   any acceptance criterion, which is precisely the scope-creep shape this review credits D10 for
   refusing. Recorded as an observation for a future Story.
4. **D4's trailing-slash normalisation remains a superset of FR-1.** Judged and cleared in §1 above,
   and cleared independently by security review §2. Recorded because Impact Analysis v2 surveyed it
   without judging it, and a superset of an approved requirement should be visible at the human
   gate rather than only in a design document.
5. **Version 1's finding 2 is discharged.** v1 asked `so-test-writer` to assert the *composed*
   expression so the untested surface would shrink to the literal `app.use` call. The delivered
   suite does exactly that — a composed-middleware describe block drives
   `corsOriginPolicy(resolveAllowedOrigins(raw))` through the real `cors` package, including both
   `method: 'OPTIONS'` legs. The residual untested surface is now the single line
   `server/index.js:34`, which is as small as it gets without `supertest`. Recorded as closed so the
   human gate is not shown a finding that no longer applies.
