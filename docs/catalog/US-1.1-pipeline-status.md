---
artifact: pipeline_status
story: US-1.1
version: 2
status: DRAFT
owner: so-builder
created_at: 2026-09-18T08:30:00Z
updated_at: 2026-09-18T16:45:00Z
supersedes: docs/catalog/US-1.1-pipeline-status.md#1
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: open_decisions
    version: 2
  - key: impact_analysis
    version: 2
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: plan_review
    version: 2
  - key: test_strategy
    version: 2
  - key: ac_test_matrix
    version: 2
open_decisions_blocking: false
---

# Pipeline Status — US-1.1 (IMPLEMENTATION, track `server`)

Sub-step progress for `so-builder`. Workflow state itself lives in
`docs/workflow/workflow-state.yaml`, which only `so-orchestrator` writes.

## Why this version exists

Version 1 recorded every input at `version: 1`. After `RECONCILIATION` returned `story_drift`,
the Story was amended and the upstream chain was re-issued at v2, so v1's `inputs_consumed` no
longer describes the artifacts this stage is answerable to. This revision re-records the stage
against the v2 chain and **re-verifies the delivered state from scratch** rather than asserting
it from v1.

**No code was written in this pass, and that is the correct outcome.** Task breakdown v2 carries
the same three tasks as v1 — it is explicit that it is *"a re-record, not a re-decomposition"* —
and all three were already delivered. The three decisions v2 adds (D9, D10, D11) are stated by
implementation plan v2 to *"produce no task and no file change"*, and task breakdown v2 argues the
fourth task out by name in *The fourth task that is not here*. This stage therefore built nothing,
invented nothing, and confined itself to verifying that what the breakdown claims is delivered
genuinely is.

**Evidence separation.** Everything under *Re-verification in this pass* below was run in this
pass and its output is real. The per-task verification transcripts in version 1 — including the
`PORT=3999` manual smoke check of the booted proxy — belong to the v1 pass and are **not**
reproduced here as this pass's evidence. They remain readable in v1's history.

## Task status

Every task in task breakdown v2 was checked against the working tree and against its named
commit. All three are genuinely delivered; none required building.

| Task | Files | Status | Commit | Verified how |
|---|---|---|---|---|
| T1 — pure CORS allow-list policy module | `server/cors-policy.js` (new) | DELIVERED | `dc29f40` | file read at HEAD; its describe blocks green |
| T2 — wire the policy into the proxy | `server/index.js` | DELIVERED | `540a676` | commit diff read line by line |
| T3 — document the setting | `.env.example` | DELIVERED | `68dea71` | variable + comment block read; its describe block green |

`git status --porcelain` shows **no modification to `server/cors-policy.js`, `server/index.js` or
`.env.example`** in the working tree, so the files that were tested are byte-for-byte the files at
those commits. Nothing in this pass touched them.

---

## T1 — Create the pure CORS allow-list policy module

**Status: DELIVERED at `dc29f40`. No work required in this pass.**

`server/cors-policy.js` exists and exports exactly the two functions D2 names,
`resolveAllowedOrigins(raw)` and `corsOriginPolicy(allowed)`. It has no imports and no state.

Checked against the task's acceptance check and its Notes:

- **D3 — fail closed by construction.** `resolveAllowedOrigins` has one return expression,
  `configured.length > 0 ? configured : [DEFAULT_ALLOWED_ORIGIN]`. There is no branch that can
  yield `[]` or `undefined`, which is what the task's Notes demand structurally rather than
  conditionally. `resolveAllowedOrigins(undefined)` returning exactly `['http://localhost:3000']`
  is asserted by the AC-4 tests, which pass.
- **D4 — trailing slash stripped from configuration, exact match on the `Origin`.** The `.replace(/\/$/, '')`
  runs before the `filter`, so a lone `/` cannot survive as an empty entry. Nothing is lowercased.
- **D5 — empty `Origin` string refused**, not special-cased: `''` is simply absent from the list.
- **D6 — refuse by omission, never by `Error`.** The callback's first argument is the literal
  `null` on both legs.

The comments recording D4 and D6 are present at the points a future editor would change them, as
the task's Files row requires.

---

## T2 — Wire the policy into the proxy

**Status: DELIVERED at `540a676`. No work required in this pass.**

The task's acceptance check is defined as a **diff shape** — "the import line plus the one wiring
line, and nothing else" — so it was verified as a diff, not as a summary. `git show 540a676 -- server/index.js`
is, in full:

```diff
+import { resolveAllowedOrigins, corsOriginPolicy } from './cors-policy.js';
...
-app.use(cors());
+app.use(cors({ origin: corsOriginPolicy(resolveAllowedOrigins(process.env.ALLOWED_ORIGINS)) }));
```

Two changed lines, no third. The added import shifts the wiring to line 34, exactly as task
breakdown v2's Files row predicts; `grep -n` at HEAD confirms `server/index.js:34`.

No `credentials` option is passed, so the `cors` default of `false` stands (D8, NFR-1). No
try/catch and no error-throwing origin callback were added (FR-3).

**This line remains the Story's untested surface**, as implementation plan v2 Risk 1, plan review
finding 1 and security review Finding 1 all record. That is unchanged by this pass and is not
hidden: `server/index.js` calls `app.listen()` at module scope so it cannot be imported, and D1
rejected adding `supertest` as an AGENTS.md §7.8 dependency proposal. This pass added no
dependency and did not restructure the app to get around it.

---

## T3 — Document the setting

**Status: DELIVERED at `68dea71`. No work required in this pass.**

`.env.example` carries `ALLOWED_ORIGINS` with an unbroken comment block immediately above it
stating the comma-separated format, the `http://localhost:3000` fail-closed default, trailing-slash
tolerance, exact-match semantics, and that a request with no `Origin` header is always served. The
value is a placeholder only — `http://localhost:3000,https://your-frontend.example.com`, using the
RFC 2606 reserved `example.com`. No real deployed hostname is in the file (NFR-2, AGENTS.md §3
Rule 4).

Both AC-5 assertions pass, including the one that rejects a real platform hostname anywhere in the
file.

---

## The test addition handed to this stage

`so-test-writer` left `test/cors-policy.spec.ts` modified but uncommitted: **35 insertions, 0
deletions**, taking the file from 24 to 26 tests. The two added assertions are, in the composed
middleware block:

- `FR-6/D9: a listed origin preflight is answered by the middleware itself, with 204, not handed on`
- `AC-2: an unlisted origin preflight is handed on, never answered by the middleware`

Both were **already green against the existing implementation** — confirmed by running them, not
by assumption. They required no code change, which is consistent with plan v2's position that D9
produces no file change.

This stage committed that file **byte-for-byte as received**, exactly as the previous pass did for
the same situation at `7b117e2`, and for the same reason: an uncommitted test file means no commit
on this branch can be verified standalone against the results it claims (AGENTS.md §13). The
staged diff was re-checked after `git add` and is still 35 insertions / 0 deletions — a pure
addition, with no line-ending renormalisation of the existing 424.

**Nothing in that file was modified, skipped, relaxed or deleted** (AGENTS.md §7.7). `so-builder`
does not own test files and did not edit one.

---

## Re-verification in this pass

Everything below was executed in this pass. The output is real.

| Check | Command | Result |
|---|---|---|
| Story's spec file | `npx vitest run test/cors-policy.spec.ts` | **26 passed (26)**, 1 file |
| Logic runner | `npm run test:logic` | **109 files passed; 2383 passed, 3 skipped (2386)** |
| Component runner | `npm run test:components` | 1 file passed, 4 passed |
| Type-check | `npm run lint` (`tsc --noEmit`) | clean, zero diagnostics |

The 3 skipped are the pre-existing live-model probes in `test/doc-generation-live.spec.ts`, which
skip without network credentials and did so before this Story. The count moved 2381 → 2383 purely
by `so-test-writer`'s two additions; nothing regressed.

`npm run test:coverage`, `npm run build` and `bash arch-guard.sh` are `so-gate-enforcer`'s stage
and were deliberately **not** run here, so no gate is reported as passing that this stage did not
execute (AGENTS.md §6).

## Scope

No source file changed in this pass. `server/cors-policy.js`, `server/index.js` and `.env.example`
were **read only** — they had already passed the mechanical gate, implementation verification,
security review and AC reconciliation, and no defect against an APPROVED requirement was found in
them. No refactor, no dependency added, no FROZEN file touched, no `STORE_REGISTRY` value
duplicated, no prompt builder involved.

Nothing under `docs/workflow/` was written or committed, and no artifact belonging to another
stage was edited. The only artifact written here is this file.

## Carried forward, not acted on

**NBF-D9-LEG** (raised by `so-test-writer`). D9's approved wording asks for `statusCode === 204`
on an **unlisted** origin's preflight. The `cors` package cannot produce that: at
`node_modules/cors/lib/index.js:219-221` a refusal calls `next()` and never enters the inner
`cors()` that reads `optionsSuccessStatus`. The assertions were therefore delivered on the
**listed** leg, plus a separate "unlisted is handed on" assertion — which is what the two new
tests above do, and both are green.

Three APPROVED artifacts (`implementation_plan`, `task_breakdown`, `plan_review`) still carry the
incorrect leg attribution in their prose. **This stage made no change on that account**: those
artifacts belong to other stages and to a human, and no test was altered to match their wording.
It is recorded here so the finding survives this stage boundary. It blocks nothing.

## For the next stage

Unchanged from v1 and still applicable: the deployed frontend origin must be set as
`ALLOWED_ORIGINS` in the deployment environment before or with this change, or the deployed proxy
will start refusing the real frontend. That is a deploy-time action, not a repository one, and it
belongs in the PR body.
