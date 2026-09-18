---
artifact: impact_analysis
story: US-1.1
version: 1
status: DRAFT
owner: so-impact-analyzer
created_at: 2026-09-18T00:25:00Z
updated_at: 2026-09-18T00:25:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 1
  - key: open_decisions
    version: 1
open_decisions_blocking: false
---

# Impact Analysis — US-1.1

## Blast-radius summary

Narrow. One production file (`server/index.js`), one configuration example, and one new test
file. No store, locale, prompt, renderer, validator or Angular surface is reached.

**The one thing that is not narrow is testability.** `server/index.js` calls `app.listen()` at
module scope, so it cannot be imported by a test without starting a listener, and this
repository has no HTTP-level testing of the Express app at all. Every existing `server/**` test
imports a **pure function** instead. That constraint, not the CORS logic, is what shapes this
Story's plan.

## Hazard table — all seven checked

| # | Hazard | Applies | Evidence |
|---|---|---|---|
| 1 | `STORE_REGISTRY` fan-out | **No** | Re-derived the consumer list this run: `src/app/app.component.ts`, `src/prompt-core/{constants,doc-pipeline-flag,store-render-rules}.ts`, `src/prompts/task-slug.ts`, `src/render/render-description.ts`, `src/services/content-orchestrator.service.ts`, `src/utils/{language-consistency,output-validator,table-finalize}.ts`. None is in this Story's surface, and the Story introduces no locale, currency or image-base value. |
| 2 | uk-UA master vs translation | **No** | No generation path is touched. Task A/B/C are not reached. |
| 3 | prompt → schema → renderer → validator chain | **No** | No link is touched. No `src/prompts`, `src/prompt-core`, `src/domain`, `src/render` or `src/utils/output-validator.ts` change. |
| 4 | FROZEN files (AGENTS.md §9) | **No** | None of the five is in scope. Confirmed against the list in `.arch-guard-checksums`. |
| 5 | Corpus conformance harness | **No** | `test/fixtures/corpus/` is consumed by `render-reconciliation.spec.ts` and `render-conformance.spec.ts`; neither is reached. The §5 corpus-coverage gap does not constrain this Story. |
| 6 | Which test runner | **Yes** | `test:logic`. This is a `server` track Story; no `*.component.spec.ts` is involved and the components runner is untouched. |
| 7 | `server/**` has no co-located tests; `usage/store.js` has no migrations | **Yes, partly** | The no-co-located-tests half applies and is the central constraint (below). The `usage/store.js` half does not — this Story adds no column and does not touch the database. |

## The testability constraint — read this before planning

`server/index.js:241` is `const server = app.listen(PORT, () => {...})` at module scope.
Importing the module starts a listener, so the file cannot be unit-tested as it stands.

Every existing `server/**` test works around this the same way: it imports a **pure function**
and tests it in isolation. `test/llm-routes.spec.ts` is the clearest precedent — it imports
`BadRequest`, `resolveRequest` and `slotFor` from `server/llm-request.js` and injects a stub
provider, and its own header comment states the intent: *"Tests the real
`server/llm-request.js`. A stub `getProvider` is injected so no API keys or SDK clients are
needed — everything else is production code."*

There is **no** `supertest`, no `app`-factory export, and no HTTP-level test of the Express
application anywhere in the repository.

This gives the planner two routes, and it must choose one explicitly:

1. **Extract the decision into a pure function** (e.g. `server/cors-policy.js` exporting
   `resolveAllowedOrigins(env)` and an `origin` callback), unit-test that, and have
   `index.js` merely wire it into `cors()`. Matches the established pattern exactly; adds no
   dependency; leaves the untestable `index.js` surface as thin as it already is.
2. **Introduce `supertest`** and test the app over HTTP. This is a **new dependency**, which
   AGENTS.md §7.8 makes a proposal requiring explicit approval, not a build step. It would
   also require restructuring `index.js` to export the app without listening.

Route 1 is consistent with what the codebase already does. Route 2 is a larger change than the
Story it serves. **The choice belongs to `so-planner`, not here.**

## Affected files

### Must change

| File | Change |
|---|---|
| `server/index.js` | Replace bare `app.use(cors())` at line 33 with an options object driven by the allow-list. Line 33 only; nothing else in the file. |
| `.env.example` | Add `ALLOWED_ORIGINS` with a placeholder and a format comment (FR-7). |
| *(new)* a pure-function module under `server/` | Only if the planner takes route 1. Not decided here. |

### Needs re-verification even if unchanged

| File | Why |
|---|---|
| `server/index.js` remaining routes | NFR-3: `/api/llm/*`, `/api/retrieval/*` and `/health` must behave identically. The health check in particular is load-bearing for the Railway deployment (FR-4). |
| `proxy.conf.json` | The Angular dev server proxies to the BFF. If the dev origin is not `http://localhost:3000`, the FR-5 default would break local development — the planner should confirm the dev-server port against `angular.json` (`serve.options.port: 3000`) rather than assume it. **Checked: `angular.json` sets port 3000, so the FR-5 default is correct.** |

### Tests that cover them

| Test | Status |
|---|---|
| *(new)* a `test/*.spec.ts` for the allow-list logic | To be written by `so-test-writer`. Runner: `test:logic`. |
| `test/llm-routes.spec.ts` | Unchanged; the pattern to copy, not a file to edit. |
| The remaining 107 logic spec files | Must stay green — this is how NFR-3 is verified, since NFR-3 has no assertion of its own (spec review, finding 1). |

## Silent-failure risks

Failures that produce **no error**, only wrong behaviour:

1. **FR-5 failing open.** An implementation that reads `ALLOWED_ORIGINS`, finds it empty, and
   passes `undefined` as `origin` gets the `cors` package's default — which is `*`. Every test
   for FR-1 through FR-3 could pass while production stays wide open. This is the single
   highest-risk item in the Story and the spec's own failure path names it.
2. **Trailing slash** (spec review, finding 5a). A configured `http://localhost:3000/` never
   matches a browser's `Origin: http://localhost:3000`. The proxy looks configured and blocks
   everything, with no error anywhere.
3. **Breaking the health check.** Treating a missing `Origin` as "not allowed" would make
   Railway's deploy health check fail — but only on deploy, not locally, and not in any test
   unless one is written for FR-4 specifically.
4. **Preflight divergence** (FR-6). If preflight were handled separately from the actual
   request, a browser could pass preflight and be blocked on the real call, or the reverse.

Each of these should have its own assertion; none of them announces itself.

## Fixture and corpus impact

None. No fixture is added, moved or regenerated.

## Unknowns

- **Whether the deployed frontend origin should also be in the default list.** Not determinable
  from the repository — no deployed URL appears anywhere, deliberately (FR-7, NFR-2). It is a
  deployment configuration value, explicitly out of scope per the Story. No action needed;
  recorded so it is not mistaken for an omission.
