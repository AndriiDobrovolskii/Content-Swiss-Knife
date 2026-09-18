---
artifact: implementation_report
story: US-1.1
version: 2
status: APPROVED
owner: so-gate-enforcer
created_at: 2026-09-18T08:45:00Z
updated_at: 2026-09-18T20:00:00Z
supersedes: docs/verification/US-1.1-implementation-report.md#1
inputs_consumed:
  - key: story
    version: 2
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: ac_test_matrix
    version: 2
  - key: pipeline_status
    version: 2
open_decisions_blocking: false
---

# Implementation Report — US-1.1 (track `server`, version 2)

The aggregated view of what was built, what changed, what covers which acceptance criterion, and
how the mechanical gate came out. Command-by-command evidence lives in `quality_gate_report` v2;
this document summarises the delivery rather than restating output.

Branch `feat/US-1.1-proxy-cors-allowlist`. Commits under gate: `dc29f40`, `540a676`, `68dea71`,
`7b117e2`, `f981732`.

## Why this version exists

Version 1 recorded every input at `version: 1` and is stale for two independent reasons:

1. **`story_drift`.** `RECONCILIATION` returned `story_drift`; the Story was amended to v2 and the
   whole upstream chain was re-issued at v2. v1's `inputs_consumed` no longer names the artifacts
   this stage is answerable to. That re-record is the main reason this re-run exists, and it is why
   every entry above reads `version: 2`.
2. **A test addition.** `so-test-writer` added two assertions to `test/cors-policy.spec.ts` — 35
   insertions, 0 deletions, 24 → 26 tests — committed by `so-builder` at `f981732`. v1's counts
   (2381 passed; 24 tests in the spec file; 24 matrix rows) are no longer the true state.

The gate was **fully re-executed** against the current tree; nothing was carried over from v1. See
`quality_gate_report` v2 for the pasted output of each command.

**No production code changed between v1 and v2 of this report.** `server/cors-policy.js`,
`server/index.js` and `.env.example` are byte-identical at `f981732` and at `7b117e2`. The only
delta in the change set is test code. Accordingly the *what was built* sections below are
unchanged in substance — correctly so, since nothing was rebuilt.

## Gate outcome

| # | Command | Verdict |
|---|---|---|
| 1 | `npm run lint` | PASS — exit 0, zero type errors |
| 2 | `npm test` | PASS — logic 109 files / **2383 passed** / 3 skipped; components 1 file / 4 passed |
| 3 | `npm run test:coverage` | PASS — exit 0, global and all three per-directory floors hold |
| 4 | `npm run build` | PASS — exit 0, only the three known CommonJS warnings |
| 5 | `bash arch-guard.sh` | PASS — exit 0, all five FROZEN checksums identical to baseline |
| 6 | `npm run validate:harness` | NOT APPLICABLE — no `docs/workflow/` and no `so-*` skill path in any of the five commits |

**QUALITY_GATE verdict: PASS.** Five applicable commands, all green, all with real recorded output.

## What was built, per task

Task breakdown v2 carries the same three tasks as v1 and states it is *"a re-record, not a
re-decomposition"*. All three were already delivered; `pipeline_status` v2 records that **no code
was written in the v2 pass**, which is the correct outcome — plan v2's three added decisions (D9,
D10, D11) are stated to produce no task and no file change.

| Task | Track | Files | Commit | State |
|---|---|---|---|---|
| T1 — pure CORS allow-list policy module | server | `server/cors-policy.js` (new, 70 lines) | `dc29f40` | DONE |
| T2 — wire the policy into the proxy | server | `server/index.js` (+2 / -1) | `540a676` | DONE |
| T3 — document the setting | server | `.env.example` (+9) | `68dea71` | DONE |
| (test hand-over) — commit the spec file received untracked | server | `test/cors-policy.spec.ts` (new, 424 lines) | `7b117e2` | DONE |
| (test hand-over, second) — commit `so-test-writer`'s two added preflight assertions | server | `test/cors-policy.spec.ts` (+35 / -0) | `f981732` | DONE |

### T1 — `server/cors-policy.js`

Two exports, exactly as plan D2 specifies: `resolveAllowedOrigins(raw)` and
`corsOriginPolicy(allowed)`. Pure ESM, no imports, no state, no new dependency. It carries D3
(always a non-empty array, so `cors()` can never receive a falsy `origin` and fall back to `*`),
D4 (single trailing slash stripped, otherwise exact case-sensitive match), D5 (an empty `Origin`
string matches nothing and is refused), and D6 (refusal is `callback(null, false)` — never an
`Error`).

### T2 — `server/index.js`

Exactly the import plus the one wiring line the task's acceptance check allows, and nothing else
in the file:

```diff
+import { resolveAllowedOrigins, corsOriginPolicy } from './cors-policy.js';
@@
-app.use(cors());
+app.use(cors({ origin: corsOriginPolicy(resolveAllowedOrigins(process.env.ALLOWED_ORIGINS)) }));
```

No `credentials` option is passed, so the `cors` default of `false` stands (D8 / NFR-1). No
try/catch and no error-throwing origin callback were added (FR-3). The added import shifts the
wiring to line 34.

### T3 — `.env.example`

`ALLOWED_ORIGINS` appended after `PORT` with a comment block covering the comma-separated format,
the `http://localhost:3000` fail-closed default, trailing-slash tolerance, exact-match semantics,
and that a request with no `Origin` header is always served. The value is a placeholder only —
`http://localhost:3000,https://your-frontend.example.com`, with `example.com` reserved by RFC 2606.
No real deployed hostname enters the repository (NFR-2, AGENTS.md §3 Rule 4).

## Files changed

Cumulative across the five commits (`git diff --stat 3c043c4 HEAD`):

```
 .env.example                           |   9 +
 docs/catalog/US-1.1-pipeline-status.md | 218 ++++++++++++++++
 server/cors-policy.js                  |  70 +++++
 server/index.js                        |   3 +-
 test/cors-policy.spec.ts               | 459 +++++++++++++++++++++++++++++++++
 5 files changed, 758 insertions(+), 1 deletion(-)
```

Three production files and one test file — exactly what task breakdown v2 names — plus
`so-builder`'s own `pipeline_status` artifact. `test/cors-policy.spec.ts` is 459 lines: the 424
committed at `7b117e2` plus the 35 added at `f981732`.

No dependency added, no FROZEN file touched, no `vitest.config.ts` or `tsconfig.json` change, no
drive-by refactor, no `STORE_REGISTRY` involvement, no prompt builder involved.

## AC ↔ test coverage, as verified in this run

From `ac_test_matrix` **v2**. All 26 tests live in `test/cors-policy.spec.ts`, runner `test:logic`,
and **all 26 were observed green in this gate run** (`npx vitest run test/cors-policy.spec.ts` —
26 passed (26); the full per-test list is pasted in `quality_gate_report` v2 §2).

| AC | Tests at v1 | Tests at v2 | This run |
|---|---|---|---|
| AC-1 — a listed origin is echoed back exactly | 7 | 7 | all passing |
| AC-2 — an unlisted origin gets no header and is not rejected | 7 | **8** (+1) | all passing |
| AC-3 — a request with no `Origin` header is unaffected | 2 | 2 | all passing |
| AC-4 — an unset allow-list fails closed | 5 | 5 | all passing |
| AC-5 — `.env.example` documents the setting with a placeholder | 2 | 2 | all passing |
| NFR-1 — credentials stay off (`does not enable credentialed CORS`) | 1 | 1 | passing |
| FR-6/D9 — preflight completion behaviour (no AC of its own) | 0 | **1** (+1) | passing |
| **Total** | **24** | **26** | **26 passed (26)** |

Counts and names match the matrix row for row. No matrix test is missing from the file, and no
test in the file was renamed away from its `AC-n:` prefix.

### The two tests new at v2

Both were confirmed present by name and green in this run:

- **`FR-6/D9: a listed origin preflight is answered by the middleware itself, with 204, not handed on`**
  — filed by `so-test-writer` under *Requirements with no acceptance criterion of their own*, not
  under AC-1, because it asserts nothing about the `Access-Control-Allow-Origin` value. It is a
  dependency-contract regression guard against a future `cors` minor flipping `preflightContinue`
  or `optionsSuccessStatus` under the `"^2.8.5"` caret range.
- **`AC-2: an unlisted origin preflight is handed on, never answered by the middleware`** — the
  second clause of AC-2 applied to `OPTIONS`, which nothing previously asserted. `plan_review` v2
  non-blocking finding 1 names exactly this hole.

Every acceptance criterion has at least one green test — but see the limitations below before
reading that as full behavioural coverage.

## Regression position

| Point | logic runner |
|---|---|
| Baseline handed to IMPLEMENTATION | 24 failed, 2357 passed, 3 skipped (109 files) |
| Builder's run at gate v1 | 109 files, 2381 passed, 3 skipped |
| Gate run v1 | 109 files passed (109), 2381 passed, 3 skipped (2384) |
| `pipeline_status` v2 re-verification | 109 files, 2383 passed, 3 skipped (2386) |
| **This gate run** | **109 files passed (109), 2383 passed, 3 skipped (2386)** |

2357 + 24 = 2381; 2381 + 2 = 2383. The file count never moved from 109 and **the skip count never
moved from 3**, so nothing was deleted, quietly `.skip`-ed or relaxed to reach green. The `+2` is
entirely `f981732`'s 35-insertion / 0-deletion addition to `test/cors-policy.spec.ts`; that commit
touches no production file. The 3 skips are the pre-existing opt-in live probe in
`test/doc-generation-live.spec.ts`, which also skipped at baseline.

## Known limitations carried forward

Stated in the plan, the breakdown and the matrix; a green gate does not retire them.

1. **The wiring line in `server/index.js` has no automated test.** `app.listen()` at module scope
   makes the file unimportable, and `supertest` was rejected at planning as an AGENTS.md §7.8
   dependency proposal (D1). This one line is the Story's untested surface; diff review by
   `so-implementation-verifier` is its coverage. `so-builder` recorded a manual boot-and-curl smoke
   check in `pipeline_status` **v1**; that evidence belongs to the v1 pass, was **not** re-run in
   the v2 pass or by this stage, and is not vouched for here.
2. **AC-3 is not asserted as a literal `200`** — same root cause. The two AC-3 tests assert the
   policy's answer for a missing `Origin` and that the middleware leaves the request to continue.
   Carried as NBF-1.
3. **Commit ordering.** The tests were committed **after** T1–T3 rather than before them, now
   across **two** commits — `7b117e2` (the original 424 lines) and `f981732` (the two added
   assertions) — so branch history does not show either batch red first. `so-builder` recorded the
   reason in both cases: the file arrived uncommitted, and rewriting history would have destroyed
   uncommitted `so-orchestrator` state. `ac_test_matrix` v2 records that the two new assertions
   were instead proven to bite by targeted mutation. Flagged here for `so-pr-preparer`'s §13
   hygiene check; **not adjudicated by this stage.**
4. **NBF-D9-LEG** (raised by `so-test-writer`, carried in `pipeline_status` v2). D9's approved
   wording asks for `statusCode === 204` on an **unlisted** origin's preflight, which the `cors`
   package cannot produce — a refusal calls `next()` and never reaches the code reading
   `optionsSuccessStatus`. The assertions were delivered on the **listed** leg plus a separate
   "unlisted is handed on" assertion, and both are green. Three APPROVED artifacts
   (`implementation_plan`, `task_breakdown`, `plan_review`) still carry the incorrect leg
   attribution in their prose. This stage owns none of them and changed none of them; recorded so
   the finding survives the stage boundary. **Blocks nothing** — no test asserts the incorrect
   wording and the delivered behaviour is correct.
5. **Deploy-time action** (`plan_review` finding 1): the deployed frontend origin must be set as
   `ALLOWED_ORIGINS` in the deployment environment before or with this change, or the deployed
   proxy starts refusing the real frontend. Belongs in the PR body.

## What this report does not certify

- **Architecture Rule 2** (retrieval separate from generation) is checked by neither arch-guard nor
  any other gate command. `so-implementation-verifier`'s.
- **AGENTS.md §6.6 runtime rules** are not checked here at all — also `so-implementation-verifier`'s.
- **Coverage says nothing about the new module.** `coverage.include` covers `src/utils`,
  `src/prompt-core`, `src/render`, `src/domain`; `server/**` is outside it. The 26 tests are the
  evidence for `server/cors-policy.js`, not the coverage percentages.
- Security posture (`so-security-reviewer`) and AC/spec reconciliation
  (`so-reconciliation-reviewer`) are separate stages. A green mechanical gate is neither. Note that
  both of those stages already produced reports against the v1 chain and may themselves need
  re-running against v2 — that sequencing decision is `so-orchestrator`'s, not this stage's.
