---
artifact: pr_summary
story: US-1.1
version: 1
status: DRAFT
owner: so-pr-preparer
created_at: 2026-09-18T23:10:00Z
updated_at: 2026-09-18T23:10:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: implementation_report
    version: 2
  - key: quality_gate_report
    version: 2
  - key: verification_report
    version: 2
  - key: security_review
    version: 2
  - key: reconciliation_report
    version: 2
  - key: ac_test_matrix
    version: 2
  - key: test_generation_report
    version: 2
open_decisions_blocking: false
---

# Drafted Pull Request — US-1.1

> **Not opened.** This is drafted content only. `so-pr-creator` opens the Pull Request, and
> only on a separate explicit instruction. Approving `HUMAN_PR_APPROVAL` did not carry that
> approval (AGENTS.md §10).

## Title

```
feat(server): restrict proxy CORS to a configured origin allow-list
```

## Body

```markdown
Closes US-1.1 — Restrict proxy CORS to an allow-list instead of every origin.

## What changed

The BFF proxy no longer answers every request with `Access-Control-Allow-Origin: *`.
`app.use(cors())` is replaced by a policy that echoes back only an origin listed in the new
`ALLOWED_ORIGINS` environment variable, matched exactly on scheme, host and port. An unlisted
origin receives **no** CORS header at all — it is refused by omission, never by an error status,
so the request still runs and the browser is what withholds the response from the calling page.
A request carrying no `Origin` header (`curl`, server-to-server, the Railway deploy health check)
is unaffected.

What that does and does not buy, stated precisely: the frontend's JSON `POST`s to `/api/llm/*`,
`/api/retrieval/*` and `/api/usage/generation` carry `Content-Type: application/json`, so they are
preflighted, and from an unlisted origin the preflight now fails and the real request is never
sent. `GET /api/usage` is a CORS-simple request and is **not** preflighted: its response is
withheld from the calling page, but the request itself still reaches the proxy and executes. Not
all frontend traffic is preflight-protected, and CORS never stops a non-browser client at all.

## Why

`server/index.js` mounted `app.use(cors())` with no options. The proxy is publicly reachable — it
reads `PORT` from the environment and exposes a `/health` endpoint configured as Railway's deploy
health check — it holds four API keys, and it exposes `/api/llm/*` and `/api/retrieval/*` with no
authentication. Wildcard CORS meant any page a user visited could read the proxy's responses in
full. Found during the P5b security-reviewer authoring, while enumerating the real attack surface.

The control is built to fail **closed**: `resolveAllowedOrigins` can never return `[]` or
`undefined`, because the `cors` package reads a falsy `origin` option as permission for every
origin. That property is structural — there is no `return []`, no `return undefined`, no early
return — not a conditional that a later edit could slip past.

## How the acceptance criteria were verified

| AC | Verified by | Result |
|---|---|---|
| AC-1 — a listed origin is echoed back exactly | `test/cors-policy.spec.ts` › `AC-1: a listed origin receives Access-Control-Allow-Origin echoing that exact origin` | pass |
| AC-2 — an unlisted origin gets no header, and is not rejected | `test/cors-policy.spec.ts` › `AC-2: an unlisted origin receives no Access-Control-Allow-Origin header` and › `AC-2: an unlisted origin is not rejected — the request is processed, the browser blocks the response` | pass |
| AC-3 — a request with no `Origin` header is unaffected | `test/cors-policy.spec.ts` › `AC-3: allows a request that carries no Origin header at all` and › `AC-3: a request with no Origin header is handed on untouched, so /health still answers` | pass (see NBF-1 below) |
| AC-4 — an unset allow-list fails closed | `test/cors-policy.spec.ts` › `AC-4: defaults to http://localhost:3000 alone when ALLOWED_ORIGINS is unset` and › `AC-4: never returns a value the cors package would read as "allow every origin"` | pass |
| AC-5 — `.env.example` documents the setting with a placeholder | `test/cors-policy.spec.ts` › `AC-5: names the variable and explains the comma-separated format` and › `AC-5: carries a placeholder only — no real deployed URL enters the repository` | pass |

Full matrix: `docs/tests/US-1.1-ac-test-matrix.md` — 26 rows across 5 criteria, plus NFR-1 and a
dependency-contract guard that carry no criterion of their own.
Reconciliation: every criterion cleared existence, naming and assertion checks, with every one of
the 26 test bodies read rather than matched by name — `docs/reconciliation/US-1.1-reconciliation-report.md`.

## Test plan

Real commands, real results — carried from `docs/verification/US-1.1-quality-gate-report.md`.

- [x] `npm run lint` (`tsc --noEmit`) — exit 0, zero type errors
- [x] `npm test` — logic: 109 files / 2383 passed / 3 skipped (2386); components: 1 file / 4 passed
- [x] `npm run test:coverage` — exit 0; global 92.45/93.9/85.75/91.83 and all three per-directory floors (`src/domain`, `src/render`, `src/prompt-core`) hold
- [x] `npm run build` (`ng build`) — exit 0, only the three known pre-existing CommonJS warnings (`file-saver`, `js-beautify`, `jszip`)
- [x] `bash arch-guard.sh` — exit 0, all five frozen checksums identical to baseline
- [ ] `npm run validate:harness` — n/a, harness untouched: no `docs/workflow/` and no `.claude/skills/so-*` path appears in any of the five commits

The 3 skips are the pre-existing opt-in live probe in `test/doc-generation-live.spec.ts`
(`LIVE_DOC_TEST=1`), skipped at baseline too. The skip count did not move — 3 before, 3 after —
so nothing was quietly `.skip`-ed to reach green. Regression arithmetic: 2357 baseline + 24
(the original spec) + 2 (the two added assertions) = 2383.

## Rules checked that nothing automates

- **Architecture Rule 2** (retrieval separate from generation): `arch-guard.sh` implements Rules 1,
  3 and 4 and explicitly not Rule 2, so this was checked by reading the diff. `server/cors-policy.js`
  has zero imports — no `require`, no `fetch`, no HTTP client, no provider. The route handlers were
  reopened: `/api/retrieval/url` and `/api/retrieval/search` still reach `fetchUrl` and
  `serper.search` and nothing else; `/api/llm/generate` still reaches the provider factory and
  nothing else. None is in the diff. The middleware's entire input is an `Origin` string and its
  entire output is a boolean, so there is no data or control flow it could move between the two
  concerns. One cross-cutting policy applied uniformly at `app.use` is not the two concerns mixed —
  two per-router allow-lists would be strictly worse, free to drift apart for no separation gain.
- **AGENTS.md §4 criteria in play**: none. §4 engages when a prompt, the Zod schema, a renderer or
  the validator changes. Nothing under `src/` appears in the diff at all, so no generated HTML can
  differ and there is no output to check against.
- **STORE_REGISTRY**: untouched — no locale code, currency symbol or registry bypass anywhere in the
  production diff.
- **Prompt-caching block separation**: no prompt builder changed; `server/index.js` still
  destructures and forwards `systemBlocks` and `userContent` as separate fields.
- **FROZEN files**: none changed. All five are absent from every commit, and `.arch-guard-checksums`
  is correctly absent too — with no frozen-file edit, a re-baseline would itself be a finding.

## Security

`docs/reviews/security/US-1.1-security-review.md` — **PASS**, no blocking finding. This change *is*
a security control, so it was reviewed as one: fail-closed behaviour was probed across unset, empty,
whitespace, `','`, `'/'`, `'//'`, `'*'` and `'__proto__'` inputs, and **no input widens the list**.
Notably `ALLOWED_ORIGINS=*` fails *closed*, not open — the value handed to `cors` is a function, so
the package's wildcard branch is unreachable. Matching resists case, port, scheme, subdomain, suffix,
`null`-origin and duplicate-header near-misses, all erring toward over-restriction. Credentials stay
off. The allow-list cannot reach a response body (the allow path echoes the *request's own* `Origin`),
cannot reach the browser bundle (nothing under `src/` reads the variable), and cannot be logged
(`server/cors-policy.js` contains no `console.*` call).

Five non-blocking findings, none routed to implementation, and one is new and forward-looking enough
to repeat here:

- **Finding 4 — revisit `credentials` when authentication lands (OD-1).** Under the old wildcard, an
  operator who flipped `credentials: true` got a loud, immediate browser failure, because a browser
  rejects `Access-Control-Allow-Credentials: true` alongside `ACAO: *`. This policy reflects an exact
  operator-listed origin, so the same flip would now **silently succeed**. Combined with the
  authentication deferred to OD-1, a single wrong allow-list entry — a stale origin, an expired
  domain, a hijacked subdomain, a registrable typo — stops being "a page that can spend credits" and
  becomes "a page that acts as the authenticated user". Whoever implements OD-1 must revisit
  `server/index.js:34`.
- Findings 2 and 3 — a mis-cased or doubly-slashed entry silently never matches. Fails safe; costs
  debugging time. Feeds the deploy note below.
- Finding 5 — the wiring line's residual exposure, below.
- Observations: an unlisted preflight now answers `200 + Allow` from Express's default handler rather
  than `204` (a narrowing of what the browser is told, not a widening); and no `Vary: Origin` on the
  refusal path, which is an availability concern only.

**Residual risk the deployment owns, unchanged by this Story:** a refused cross-origin request is
still *executed* by the server — only the response is withheld from the calling page. A CORS-simple
form POST, or any non-browser client, still reaches `/api/llm/*` and spends credits. CORS is a
browser-side response control; only authentication closes that, and that is **OD-1**, deliberately
deferred to its own Story.

## Notes for the reviewer

**1. Deploy-time action — required before or with cutover, and the failure is silent.**
`ALLOWED_ORIGINS` must be set in the deployment environment. If it is not, the effective list is
`http://localhost:3000` alone and the deployed frontend is refused. **A misconfiguration is invisible
from the server side:** a refused request returns its normal `200`, a refused preflight returns `200`
with `Allow` rather than any 4xx, nothing logs a refusal, and `/health` carries no `Origin` header so
it keeps answering `200` — **the Railway health check goes green on a proxy that refuses every real
browser.** The only symptom is a CORS error in end-user consoles. A mis-cased or doubly-slashed entry
(security Findings 2 and 3) produces the same silent, total block as an unset variable. First
establish whether the deployed frontend is actually cross-origin with the proxy: the Angular app
calls relative `/api/...` URLs and in development reaches the proxy same-origin through
`proxy.conf.json`, so this repository does not record the production topology. Same-origin → CORS
never engages and fail-closed causes no outage. Cross-origin → `ALLOWED_ORIGINS` is **mandatory**.

**2. The `cors` dependency reminder must outlive this Story.** FR-6's `204` answer on a listed
origin's preflight holds only because the `cors` package defaults `preflightContinue: false` and
`optionsSuccessStatus: 204`. `package.json` declares `"cors": "^2.8.5"` and the lockfile resolves
**2.8.6** — a caret range that permits a 2.x minor to move either default. One test now catches
exactly that flip (`FR-6/D9: a listed origin preflight is answered by the middleware itself, with
204, not handed on`), and it was proven to bite: mutating the middleware to `preflightContinue: true`
fails that assertion and **only** that assertion, 1 of 26, while every header assertion stays green —
which is precisely the silent failure mode. **The standing instruction to re-verify this on a `cors`
version bump currently lives only in an impact-analysis row that archives with this Story.** It is
recorded here so it survives, and it should be carried into a follow-up Story or a dependency note.

**3. Follow-up Story recommended: update `README.md` (plan decision D10).** `README.md:157-189`
mirrors the env file inline — it lists `PORT` but not `ALLOWED_ORIGINS` — so the README's
Configuration section is now stale. This was deliberately argued out of US-1.1's scope because no
acceptance criterion reaches it, and `.env.example` (the file the acceptance criterion *does* reach)
is fully current. Recommend a follow-up Story.

**4. AC-3's `200` is diff-verified, not test-verified (NBF-1).** Neither AC-3 test asserts a literal
`200`. `server/index.js` calls `app.listen()` at module scope and so cannot be imported by a test, and
plan decision D1 rejected adding `supertest` as an AGENTS.md §7.8 dependency proposal. The `/health`
route is not in the diff, so no line of this change could alter its status code; the leg this Story
could actually have broken — the CORS layer's non-interference with an origin-less request — is the
leg that is tested, with four behavioural assertions. Reconciliation cleared AC-3 at all three levels
*with this limitation stated*, and it is repeated here rather than smoothed over.

**5. The wiring line is the Story's untested surface (NBF-2 / security Finding 5).** Every acceptance
criterion ultimately depends on `server/index.js:34`, and no test imports it, for the same D1 reason.
A regression to `app.use(cors())`, the addition of `credentials: true`, or dropping the
`resolveAllowedOrigins` call would leave **all 26 tests green**. The two assertions added on this
branch close a *dependency-drift* blind spot, not this one. Its only gate is diff review — which was
applied this pass and confirmed the three properties (exactly one options key, no error-throwing
origin callback, import plus one line and nothing else) — and that gate must be re-applied to any
future edit of that line. **Please read that line directly when reviewing.**

**6. Commit hygiene — one real deviation, recorded rather than laundered (AGENTS.md §13).** The
tests were committed **after** the implementation, across two commits (`7b117e2`, `f981732`), so the
branch history does not show them red first. The concrete consequence: `dc29f40`, `540a676` and
`68dea71` each cite test results (22/24, then 24/24) against a file that no SHA on the branch
contained at that point, so none of those three commits is verifiable standalone against the results
it claims. TDD did hold *in fact* — `test/cors-policy.spec.ts` existed and was failing before the
builder started; it was untracked, not absent — and the progression is recorded in the commit
messages. The stated reason in both cases is that the spec file was handed over uncommitted and
rewriting history would have destroyed another stage's uncommitted state; that is a real constraint,
but it is a constraint rather than a cure, and the gap in standalone verifiability is real. The two
assertions added at `f981732` could not have started red — they describe behaviour the delivered code
already had — so they were instead proven to bite by targeted mutation, two mutants each caught by
one assertion only, with the output recorded in `docs/tests/US-1.1-test-generation-report.md` §3b.
That is adequate evidence for those two, and it is not a substitute for red-first on the original 24.
Recorded so a reader meets it here rather than discovering it in the log.

**7. `docs/catalog/US-1.1-pipeline-status.md` rides along in all five commits.** It is not §7.8 scope
creep — it is the `pipeline_status` artifact, owned by `so-builder` in
`docs/workflow/artifact-paths.yaml`, workflow bookkeeping rather than product code. The side effect
is that no commit on this branch is purely code. Acceptable; noted so it is not mistaken for an
unrelated file.

**8. A documentation inconsistency in three approved planning artifacts (NBF-5 / NBF-D9-LEG).**
`implementation_plan` §D9, the `task_breakdown` D9 row and `plan_review` finding 1 all attribute the
`statusCode === 204` assertion to the **unlisted** origin's preflight. The `cors` package cannot
produce that — a refusal calls `next()` and never reaches the code that reads `optionsSuccessStatus`.
The delivered tests put the `204` on the **listed** leg, which is correct, and assert the unlisted
leg's genuinely observable facts (handed on, not ended, no status, no header). No acceptance
criterion, test or line of code is affected. It is flagged only so a future maintainer does not act
on that prose and burn time trying to assert `204` on a refusal.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01KmPsh3LA3Z2P67ZRAtsdoz
```

## Pre-flight record

| Check | Result |
|---|---|
| All four upstream reports opened, verdict `PASS` | **Yes** — each opened and its verdict read, not inferred. `quality_gate_report` v2 "Gate verdict: PASS"; `verification_report` v2 "Verdict: PASS"; `security_review` v2 "Verdict: PASS" with five non-blocking findings; `reconciliation_report` v2 "Verdict: PASS", `loop_back_stage: null`. All four are `status: APPROVED`, version 2. |
| Quality gate has real output for all six commands | **Qualified pass.** Five commands were executed with real pasted output (lint, `npm test` both runners, coverage, build, arch-guard) — verbatim terminal blocks with exit codes, not summaries. The sixth, `npm run validate:harness`, was **NOT RUN and reported as not applicable**, with the decision argued from the change set (`git show --name-only` across all five commits lists five paths, none under `docs/workflow/` or `.claude/skills/so-*`). Correctly *not* reported as passing. This is the template's own `n/a — harness untouched` case. |
| Architecture Rule 2 explicitly addressed by the verifier | **Yes** — `verification_report` v2 §1, a dedicated section. The route handlers (`/api/retrieval/url`, `/api/retrieval/search`, `/api/llm/generate`) were reopened this pass, and the verifier states in its own words that the green arch-guard is *not* evidence for this section. |
| No unresolved blocking security finding | **Yes** — five findings, all classed non-blocking, none routed to `IMPLEMENTATION`. No blocking condition from the severity table present: no secret escapes the server, nothing new reaches the `bypassSecurityTrustHtml` pipe, no fetched page reaches `systemBlocks`. Finding 4 is forward-looking and belongs to OD-1. |
| Every `AC-n` cleared all three reconciliation levels | **Yes** — AC-1 (7 tests), AC-2 (8), AC-3 (2), AC-4 (5), AC-5 (2) all ✓/✓/✓; 26 rows, 26 tests found, **26 bodies read**. AC-3's Level 3 carries a bounded limitation (NBF-1, the literal `200`), surfaced in the PR body's reviewer notes rather than left in the artifact. |
| Commits contain only what `task_breakdown` named | **Yes** — five paths across five commits: `server/cors-policy.js` (T1), `server/index.js` (T2), `.env.example` (T3), `test/cors-policy.spec.ts` (the plan's file table, `so-test-writer`'s), and `docs/catalog/US-1.1-pipeline-status.md` (the registry-owned `pipeline_status` artifact). No drive-by refactor, no rename, no reformatting of an untouched file, no dependency added (`package.json` and `package-lock.json` absent — the rejected `supertest` proposal stayed rejected), no config edit. |
| No fixup-run, no `--no-verify`, no phase batching | **Qualified pass.** No fixup run: five commits, each a complete working change, no `fixup`/`squash`/`wip`/`typo` subject on the branch. No phase batching: one Story's work only. On `--no-verify` — not retrospectively provable from history, and the honest answer is that **this repository has no commit hooks at all** (no `.husky/`, no `prepare`/`husky`/`pre-commit` entry in `package.json`, only `.sample` files in `.git/hooks/`), so there is no hook that could have been skipped. **The one real deviation is commit ordering**, assessed in the body's reviewer note 6: tests landed after implementation, leaving `dc29f40`, `540a676` and `68dea71` not verifiable standalone against the test results they cite. Recorded, not waved through. |
| Frozen-file change has same-commit re-baseline | **Not engaged** — no FROZEN file changed. All five are absent from every commit, and `.arch-guard-checksums` is correctly absent too. arch-guard exit 0 with all five checksums matching baseline byte for byte. |
| No secret in any commit, including removed ones | **Yes**, and structurally so. The branch is **+758 / −1** across five commits, and the single deleted line is `app.use(cors());` — so the added-then-removed-secret class is not merely unfound but impossible on this branch. `.env.example` is the only tracked `.env*` file (`.env` is gitignored). A scan of every added line across the five commits for key/token/secret shapes returned zero matches. |
| `.env.example` current with placeholders | **Yes** — T3 is what made it current. `ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.example.com` above a seven-line comment block. Placeholder only: loopback plus `example.com`, the IANA/RFC 2606 reserved documentation domain. No real deployed hostname, key or credential. **`README.md` is a separate matter:** its Configuration section (`README.md:157-189`) mirrors the env file inline and does not carry `ALLOWED_ORIGINS`, so it is now stale — deliberate, per plan decision **D10**, since no acceptance criterion reaches it. Recommended as a follow-up Story in the PR body. |
