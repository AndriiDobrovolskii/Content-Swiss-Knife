---
artifact: impact_analysis
story: US-1.1
version: 2
status: DRAFT
owner: so-impact-analyzer
created_at: 2026-09-18T00:25:00Z
updated_at: 2026-09-18T15:00:00Z
supersedes: docs/impact-analysis/US-1.1-impact-analysis.md#1
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: open_decisions
    version: 2
open_decisions_blocking: false
---

# Impact Analysis — US-1.1 (version 2)

## Why this version exists

Version 1 recorded `specification version 1` in `inputs_consumed` and was therefore stale the
moment the Specification was re-recorded at version 2 after `RECONCILIATION` returned
`story_drift`. This revision re-surveys against Story v2, Specification v2 (`APPROVED`) and
Open Decisions v2.

**The requirement surface did not move.** FR-1 … FR-7 and NFR-1 … NFR-3 are unchanged between
Specification v1 and v2; what changed is Background prose, *Out of scope*, the OD-1 restatement,
a non-normative rationale paragraph under FR-6, and the traceability matrix. A survey bounded by
the approved requirements therefore reaches the same requirement-driven conclusions as v1 — and
this document says so explicitly rather than pretending to a fresh result it does not have.

**What is genuinely new is that the blast radius is no longer hypothetical.** The implementation
exists and is verified across four commits, so this revision reports the *observed* affected-file
set alongside what v1 predicted, and names three surfaces the change actually reached that v1 did
not anticipate. That comparison is this version's substantive contribution.

---

## Blast-radius summary

Narrow, and confirmed narrow by observation rather than by inference. Two production files
(`server/index.js`, the new `server/cors-policy.js`), one configuration example, one new logic
spec. No store, locale, prompt, schema, renderer, validator, fixture or Angular surface is
reached, and no FROZEN file is touched.

The three things a planner would still not get from the requirement text alone are: the
**`cors` package version is now part of this Story's behavioural contract** (NBF-5); **`.env.example`
has crossed from documentation into a test fixture**; and **`README.md` §Configuration is now a
stale mirror of `.env.example`**. All three are recorded below under *Reach v1 did not anticipate*.

---

## Observed reach vs. the v1 prediction

`git diff --name-status 3c043c4..HEAD` (the plan gate to `HEAD`):

| Status | Path | Predicted by v1? |
|---|---|---|
| `M` | `.env.example` | **Yes** — named under *must change* for FR-7 |
| `M` | `server/index.js` | **Yes** — named, and the change is the single line 33/34 replacement v1 described |
| `A` | `server/cors-policy.js` | **Yes, conditionally** — v1 named "*(new)* a pure-function module under `server/`… only if the planner takes route 1", and route 1 is what was taken |
| `A` | `test/cors-policy.spec.ts` | **Yes** — named as "*(new)* a `test/*.spec.ts`… Runner: `test:logic`", and that is the runner it lands in |
| `A` | `docs/catalog/US-1.1-pipeline-status.md` | Not named — **and correctly so**: this is a workflow artifact owned by `so-builder`, not production reach. Recorded here only so it is not mistaken for one. |

**Verdict on the v1 survey's must-change prediction: it held, exactly.** Including the
conditional: `server/cors-policy.js` exports `resolveAllowedOrigins(raw)` and
`corsOriginPolicy(allowed)`, and `server/index.js` was reduced to the wiring
`app.use(cors({ origin: corsOriginPolicy(resolveAllowedOrigins(process.env.ALLOWED_ORIGINS)) }))`
— which is the shape v1's route 1 described, down to the module name it guessed.

The value of this re-run is therefore **not** in the must-change list. It is in the three
surfaces below.

---

## Reach v1 did not anticipate — read this before planning anything further

### A. `README.md` §Configuration is now a stale mirror of `.env.example`

`README.md:157-189` reproduces the whole `.env` file inline as a fenced `dotenv` block, ending
with `# --- Server ---` / `PORT=3001`. **`ALLOWED_ORIGINS` does not appear in it.** Verified by
search: the only non-`docs/` files mentioning `ALLOWED_ORIGINS` are `server/index.js`,
`server/cors-policy.js`, `test/cors-policy.spec.ts` and `.env.example`.

This is **not a Specification violation** — FR-7 and AC-5 name `.env.example` and nothing else,
so the implementation discharged what was asked. It is a file the change *reached in substance*
and did not update, and it is the exact file the Story's own *References* section cites
(`README.md` — "BFF API reference", "Configuration").

Consequence: a developer following the README to build a `.env` produces one with no
`ALLOWED_ORIGINS`, gets the FR-5 fail-closed default, and has no in-README explanation of why an
origin is being refused. v1 did not name `README.md` at any point.

### B. `.env.example` is no longer only documentation — it is a test fixture

`test/cors-policy.spec.ts:25` imports `readFileSync` and the AC-5 block (`:379-412`) reads
`.env.example` off disk at run time. The coupling is precise, so it is worth stating precisely:
the spec splits the file into lines, locates the line matching `/^\s*ALLOWED_ORIGINS\s*=/`
(`:386`), takes its value and the **contiguous comment block immediately above it** (`:383`,
`:390`), and asserts that the comment names the variable and explains the comma-separated format
and that the value is a placeholder only.

v1 listed `.env.example` under *must change* for FR-7 and stopped there. It did not predict that
a test would **parse** it. The standing consequence, which belongs in *needs re-verification*
from now on: **an edit to `.env.example` can now fail `npm run test:logic` from a Story that has
nothing to do with CORS.** The blast radius is not the whole file — it is the `ALLOWED_ORIGINS=`
line and the unbroken comment block above it. Inserting a blank line into that comment block, or
reordering the file so another setting's comment abuts the variable, breaks the AC-5 tests without
changing any behaviour the Story cares about.

### C. The `cors` package version is part of this Story's impact surface (carries NBF-5)

Neither `package.json` nor `package-lock.json` was modified, and no dependency was added — but
both are now load-bearing, in **two distinct ways with different blast radii**:

1. **The fail-closed guarantee rests on a `cors` internal branch.** `cors/lib/index.js` treats a
   falsy `origin` option as permission for every origin
   (`if (!options.origin || options.origin === '*')`). `server/cors-policy.js:25-31` documents
   this by name and guarantees `resolveAllowedOrigins` never returns `[]` or `undefined`
   *because* of it. FR-5's entire fail-closed promise is therefore a promise about how a
   third-party package reads a falsy option.
2. **NBF-5 — the preflight status is an unpinned package default.** Carried in from spec-review
   for weighing, not for fixing. FR-6 names no positive status for an unlisted origin's
   preflight; the behaviour holds today only because `cors/lib/index.js:8-12` sets
   `preflightContinue: false` and `optionsSuccessStatus: 204` as defaults, so the middleware
   answers `204` itself. **Verified this run at those exact lines.** No requirement states it and
   nothing in the repository pins it.

**The version facts:** `package.json:51` declares `"cors": "^2.8.5"`; `package-lock.json:5823-5824`
and `node_modules/cors/package.json` both resolve to **2.8.6**. The caret range permits any future
`2.x` minor on a fresh `npm install`. A minor that changed either default would move FR-5's
fail-closed behaviour or FR-6's preflight answer **with no test failing for the reason that
matters** — the unit tests assert the callback's arguments and the composed middleware's headers,
neither of which pins the `204`.

Additionally, `test/cors-policy.spec.ts:100-134` hand-rolls a request/response double against
`cors`'s *internal* API expectations (`setHeader` / `getHeader` / `removeHeader` / `statusCode` /
`end`, plus the `vary` package's `getHeader` read). That double is a second, implicit coupling to
`cors` internals: a package change to which response methods it calls breaks the test even when
the behaviour is intact.

---

## Hazard table — all seven checked this run

| # | Hazard | Applies | Evidence (re-derived this run) |
|---|---|---|---|
| 1 | `STORE_REGISTRY` fan-out | **No** | Re-derived by search, **not copied** — and the list has moved since the skill document was written. Current non-`docs/`, non-`.claude/` consumers: definition in `src/prompt-core/constants.ts`; consumers `src/app/app.component.ts`, `src/prompt-core/doc-pipeline-flag.ts`, `src/prompt-core/store-render-rules.ts`, `src/render/render-description.ts`, `src/utils/language-consistency.ts`, `src/utils/output-validator.ts`, `src/utils/table-finalize.ts`, plus `test/render-conformance.spec.ts` and `test/tools/derive-ctx.mjs`. **Divergence from the skill's list, recorded as evidence the re-derivation happened:** `src/services/content-orchestrator.service.ts` and `src/prompts/task-slug.ts` no longer match. None of the current consumers is in this Story's surface; the Story introduces no store, locale, currency or image-base value, and Specification v2's Scope records `Stores: none`. |
| 2 | uk-UA is the master, not one locale among many | **No** | No generation path is reached. Task A (uk-UA master), Task B and Task C (translation) are untouched — the diff contains no `src/prompts/**` file. The master-vs-translation direction question does not arise because neither direction is entered. Specification v2 Scope records `Locales: none`. |
| 3 | prompt → schema → renderer → validator chain | **No** | **No link of the chain is touched.** Diff contains no `src/prompts/*`, no `src/prompt-core/*`, no `src/domain/*.schema.ts`, no `src/render/render-{description,consumables}.ts` and no `src/utils/output-validator.ts`. Nothing changes what the model is asked for, the Zod shape, the Doc → HTML rendering, or the enforced AGENTS.md §4 criteria. |
| 4 | FROZEN files (AGENTS.md §9) | **No — and confirmed by checksum** | The §9 list at `AGENTS.md:449-455` is `src/prompts/task-{a,b,c}.ts`, `src/prompt-core/master-system-prompt.ts`, `src/utils/output-validator.ts`; `.arch-guard-checksums` carries exactly those five. None appears in `git diff --name-status 3c043c4..HEAD`. **No §9 stop is required for this Story, and none was taken.** The sibling-file workaround pattern (`task-a-doc.ts`, `image-manifest-coverage.ts`) is not needed here. |
| 5 | Corpus conformance harness | **No** | `test/fixtures/corpus/` holds exactly six files — the two `.ctx.json` / `.doc.json` / `.uk-UA.html` triples for `center-3d-print-ortur-h20-20w` and `expert3d-ortur-h20-20w`, i.e. the same product (Ortur H20 20 W) across two stores, which is precisely the §5 gap `test/render-reconciliation.report.md:206` records. Consumed by `render-reconciliation.spec.ts`, `render-reconciliation-consumables.spec.ts` and `render-conformance.spec.ts`; none is reached. **This Story needs no corpus coverage at all** — it renders nothing — so the §5 gap does not constrain it. Cited rather than omitted, per the checklist. |
| 6 | Which test runner | **Yes — `test:logic`** | `vitest.config.ts` includes `['src/**/*.spec.ts', 'test/**/*.spec.ts']` and excludes `**/*.component.spec.ts`, which it documents as "the ONLY boundary between the two runners". `test/cors-policy.spec.ts` matches the include and not the exclude, so it runs under `npm run test:logic` (`vitest run`). **The `test:components` runner is untouched**, which matters because it still has the single-file load the hazard note describes. The spec file's own header states the same intent. |
| 7 | `server/**` has no co-located tests; `usage/store.js` has no migrations | **Yes, the first half only** | First half applies and shaped the whole design — see below. Specs that indirectly cover `server/**` and therefore had to stay green: `test/{llm-routes,openai-provider,anthropic-provider,gemini-provider,pricing,usage-store,retry,json-parse,build-info,call-log,describe-error}.spec.ts`. **Second half does not apply:** this Story adds no column and never touches `server/usage/store.js`, so the `CREATE TABLE IF NOT EXISTS` silent-no-op trap is not entered. |

---

## The testability constraint — resolved, recorded for the record

v1 identified this as the thing that would shape the plan, and it did. `server/index.js:242`
calls `app.listen()` at module scope, so the module cannot be imported by a test without starting
a listener, and the repository has no HTTP-level test of the Express app and no `supertest`.
(v1 cited line 241; the added import moved it by one.)

The plan took **route 1** — extract the decision into a pure module, unit-test that, leave
`index.js` as wiring — matching the `test/llm-routes.spec.ts` precedent and adding no dependency.
Route 2 (`supertest`) was rejected as an AGENTS.md §7.8 dependency proposal.

The residual untested surface is now **one line**: `server/index.js:34`, the `app.use(cors({...}))`
call itself. The spec file narrows even that by driving the composed expression through the *real*
`cors` middleware with a request/response double — which is what makes finding C above matter.

---

## Affected files

### Must change *(observed, not predicted)*

| File | Change |
|---|---|
| `server/index.js` | One import added; `app.use(cors())` at line 33 became `app.use(cors({ origin: corsOriginPolicy(resolveAllowedOrigins(process.env.ALLOWED_ORIGINS)) }))` at line 34. Nothing else in the file moved — the diff is `+1/-1` plus the import. |
| `server/cors-policy.js` *(new)* | The two pure functions: `resolveAllowedOrigins(raw)` (FR-1, FR-5) and `corsOriginPolicy(allowed)` (FR-2, FR-3, FR-4, FR-6). |
| `.env.example` | `ALLOWED_ORIGINS` plus an eight-line comment block (FR-7). |
| `test/cors-policy.spec.ts` *(new)* | 24 tests across four `describe` blocks, on the `test:logic` runner. |

### Needs re-verification even if unchanged

| File | Why |
|---|---|
| `server/index.js` — every other route | NFR-3: `/api/llm/*`, `/api/retrieval/*`, `GET /api/usage*` and `/health` must behave identically. NFR-3 has no assertion of its own (spec review NBF-1); it is discharged only by the pre-existing suite staying green. |
| `package.json` / `package-lock.json` | **New at v2.** Not modified, but `cors@^2.8.5` → 2.8.6 now carries FR-5's fail-closed branch and FR-6's unstated `204`. See finding C. Any dependency bump touching `cors` re-opens this Story's behaviour. |
| `.env.example` | **New at v2.** Now read and asserted by `test/cors-policy.spec.ts`. Any future edit, on any Story, must be re-verified against that spec. See finding B. |
| `README.md:157-189` | **New at v2.** Stale relative to `.env.example`. See finding A. |
| `proxy.conf.json` + `angular.json` | Confirmed this run: `angular.json:44` sets `serve.options.port: 3000`, so FR-5's `http://localhost:3000` default is the correct dev origin. `proxy.conf.json` forwards `/api` to `http://localhost:3001` with `changeOrigin: true`. See *Unknowns* for the one thing this does not settle. |

### Tests that cover them

| Test | Status |
|---|---|
| `test/cors-policy.spec.ts` | New; 24 tests, `test:logic`. Covers AC-1 … AC-5, including both preflight legs (FR-6) and the "refusal is by omission, never by error" leg (FR-3). |
| `test/llm-routes.spec.ts` | Unchanged — the pure-function pattern route 1 copied. |
| `test/{openai,anthropic,gemini}-provider,pricing,usage-store,retry,json-parse,build-info,call-log,describe-error}.spec.ts` | Unchanged; these are the indirect `server/**` coverage hazard 7 names, and they are how NFR-3 is actually discharged. |
| The rest of the logic suite | Must stay green. Reported green at 2381 passing. |
| `npm run test:components` | Untouched — no `*.component.spec.ts` involved. |

---

## Silent-failure risks

Failures that produce **no error**, only wrong behaviour. Items 1–4 carry forward from v1 (the
requirement text they attach to did not move); items 5–7 are new at v2.

1. **FR-5 failing open.** Passing `undefined` or `[]` as `origin` gets the `cors` default, which is
   `*`. Every FR-1 … FR-3 test could pass while production stays wide open. The single
   highest-risk item in the Story. *(Addressed by construction in `cors-policy.js:35-43`, and
   asserted at spec line 157.)*
2. **Trailing slash.** A configured `http://localhost:3000/` never equals a browser's
   `Origin: http://localhost:3000`; the proxy looks configured and refuses everything, silently.
   *(Addressed by the `.replace(/\/$/, '')` in `resolveAllowedOrigins`, asserted at spec line 186.)*
   **Note for the record:** that normalisation is behaviour FR-1 does not name — FR-1 says only
   that whitespace is trimmed and empty entries discarded, and that matching is exact string
   equality. The implementation is a superset of the requirement here. Surveyed, not judged.
3. **Breaking the health check.** Treating a missing `Origin` as "not allowed" fails Railway's
   deploy check — on deploy only, never locally, and in no test unless FR-4 is asserted directly.
4. **Preflight divergence (FR-6).** Preflight handled separately from the actual request lets a
   browser pass one and be blocked on the other.
5. **NBF-5, restated as a silent failure.** If a `cors` minor flipped `preflightContinue` to
   `true`, the middleware would call `next()` on a preflight instead of answering `204`. Express
   would fall through to the 404 handler. Every existing assertion — which checks *headers* and
   *callback arguments*, never the status — would still pass.
6. **A `.env.example` edit failing `test:logic` for a reason the editor cannot see.** The
   coupling in finding B is invisible from `.env.example` itself: nothing in that file says a
   test reads it.
7. **README drift compounding.** Finding A is silent by definition — no command in the AGENTS.md
   §6 gate reads `README.md`, so nothing will ever report it.

---

## Fixture and corpus impact

**None.** No fixture is added, moved or regenerated; `test/fixtures/corpus/` is untouched and its
six files are unchanged. Confirmed against the diff.

---

## Unknowns

- **Whether a local `ng serve` request actually exercises the FR-5 default.** The dev server runs
  on `:3000` (`angular.json:44`) and proxies `/api` to `:3001` with `changeOrigin: true`. In
  `http-proxy`, `changeOrigin` rewrites the **`Host`** header, not `Origin`, and incoming request
  headers are otherwise forwarded — so a same-origin `POST` from the SPA, which per the Fetch
  standard carries `Origin: http://localhost:3000`, should arrive at the BFF with that header
  intact and match the default; a `GET` carries no `Origin` and takes the FR-4 path instead.
  **This is reasoned from the proxy's implementation, not observed.** The unknown is narrower than
  it first looks: the *origin-less* leg **is** covered — `test/cors-policy.spec.ts:319-329` drives
  the real middleware with no `Origin` and asserts it neither ends the response, sets a status, nor
  passes an error. (That is middleware-level pass-through; `/health` actually answering `200` is
  the separate leg NBF-1 records as verified by diff review rather than by test, because the app is
  not importable.) What is genuinely unsettled is only whether a **browser** same-origin `POST`
  through the dev proxy arrives carrying `Origin: http://localhost:3000`. What would settle it: one
  `ng serve` run with the BFF logging `req.headers.origin` on an `/api/llm/*` call. It changes no
  requirement either way — recorded because a negative answer would mean the FR-5 default is
  decorative on the dev path rather than load-bearing.
- **Whether the deployed frontend origin should also be in the default list.** Not determinable —
  no deployed URL appears anywhere in the repository, deliberately (FR-7, NFR-2). A deployment
  configuration value, explicitly out of scope. Carried forward from v1 unchanged.
- **Whether OD-1's authentication question changes this surface later.** Non-blocking and out of
  scope here, but noted: `security_review` Finding 4 records that `credentials: true` is harmless
  today and becomes dangerous once authentication exists, which would put `server/cors-policy.js`
  and the NFR-1 credentials decision back in a future Story's blast radius. No action now.
