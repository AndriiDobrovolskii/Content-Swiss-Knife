---
artifact: pr_summary
story: US-1.1
version: 2
status: DRAFT
owner: so-pr-preparer
created_at: 2026-09-18T23:10:00Z
updated_at: 2026-09-18T23:55:00Z
supersedes: docs/pr/US-1.1-pr-summary.md#1
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
open_decisions_blocking: false
---

# Drafted Pull Request — US-1.1 (version 2)

> **Not opened.** This is drafted content only. `so-pr-creator` opens the Pull Request, and
> only on a separate explicit instruction. Approving `HUMAN_PR_APPROVAL` did not carry that
> approval (AGENTS.md §10).

## Why this version exists

`so-pr-creator` returned `CHANGES_REQUIRED` at its PR_CREATION pre-flight: version 1 made four
claims that were false about the diff the Pull Request would actually render. **The cause has been
removed, not worked around.** The P0–P6 SDD+TDD harness migration, which had never been merged and
was riding on this branch, has since landed on `main` in its own Pull Request (#123, merge commit
`87b0aef`). The merge base moved to `c8d0a32`, and this branch now carries US-1.1 and nothing else.

Every figure below was **re-derived against the current `origin/main`** in this pass. Nothing was
carried over from version 1. The four corrections are recorded in the pre-flight record at the end
of this document rather than buried.

### The base these figures are pinned to

| | |
|---|---|
| Merge base | `c8d0a32` (`git merge-base origin/main HEAD`) — verified an ancestor of `origin/main` |
| `origin/main` | `87b0aef` |
| Branch tip | the commit carrying this artifact, which cannot name its own SHA (note **R**) |
| Branch is behind `origin/main` by | 4 commits (the merged harness Pull Request) |

Every diff figure is the three-dot diff from `c8d0a32` to the branch tip — the same diff GitHub
renders for a Pull Request — and it **includes this artifact's own version-2 revision**.
See pre-flight note **R** at the end: committing this version moved the insertion total from 6282
to 6405 and left the file count at 27, exactly as note R predicted it would.

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

## What is in this diff

Merge base `c8d0a32`, tip the commit carrying this artifact, **10 commits, all US-1.1**.

```
27 files changed, 6405 insertions(+), 21 deletions(-)
```

The production and test surface is **four paths**:

```
 .env.example             |   9 +
 server/cors-policy.js    |  70 +++++
 server/index.js          |   3 +-
 test/cors-policy.spec.ts | 459 +++++++++++++++++++++++++++++++++++++++
 4 files changed, 540 insertions(+), 1 deletion(-)
```

The remaining 23 paths are this Story's own `docs/` artifact chain, its catalog entry and the
orchestrator's run state. **No `package.json`, no `package-lock.json`, and nothing under `src/`** —
this branch proposes no dependency, script or frontend change at all. `package.json` is
byte-identical to `origin/main`'s.

The 21 deletions decompose exactly, and the arithmetic closes:

| Deleted lines | Where | What |
|---|---|---|
| 1 | `server/index.js` | `app.use(cors());` — the only deleted **production** line in the branch |
| 3 | `docs/catalog/stories.yaml` | the Story's catalog row, rewritten |
| 7 | `docs/workflow/active-story.yaml` | orchestrator run state |
| 10 | `docs/workflow/workflow-state.yaml` | orchestrator run state |
| **21** | | |

No line of production code is deleted anywhere else in the branch, so the
added-then-removed-secret class is not merely unfound — it is structurally impossible here.

## How the acceptance criteria were verified

| AC | Verified by | Result |
|---|---|---|
| AC-1 — a listed origin is echoed back exactly | `test/cors-policy.spec.ts` › `AC-1: a listed origin receives Access-Control-Allow-Origin echoing that exact origin` | pass |
| AC-2 — an unlisted origin gets no header, and is not rejected | `test/cors-policy.spec.ts` › `AC-2: an unlisted origin receives no Access-Control-Allow-Origin header` and › `AC-2: an unlisted origin is not rejected — the request is processed, the browser blocks the response` | pass |
| AC-3 — a request with no `Origin` header is unaffected | `test/cors-policy.spec.ts` › `AC-3: allows a request that carries no Origin header at all` and › `AC-3: a request with no Origin header is handed on untouched, so /health still answers` | pass (see note 4 below) |
| AC-4 — an unset allow-list fails closed | `test/cors-policy.spec.ts` › `AC-4: defaults to http://localhost:3000 alone when ALLOWED_ORIGINS is unset` and › `AC-4: never returns a value the cors package would read as "allow every origin"` | pass |
| AC-5 — `.env.example` documents the setting with a placeholder | `test/cors-policy.spec.ts` › `AC-5: names the variable and explains the comma-separated format` and › `AC-5: carries a placeholder only — no real deployed URL enters the repository` | pass |

Full matrix: `docs/tests/US-1.1-ac-test-matrix.md` — 26 rows across 5 criteria, plus NFR-1 and a
dependency-contract guard that carry no criterion of their own.
Reconciliation: every criterion cleared existence, naming and assertion checks, with every one of
the 26 test bodies read rather than matched by name — `docs/reconciliation/US-1.1-reconciliation-report.md`.

## Test plan

Real commands, real results — carried from `docs/verification/US-1.1-quality-gate-report.md`,
except the last, which was run again on this branch for the reason given below it.

- [x] `npm run lint` (`tsc --noEmit`) — exit 0, zero type errors
- [x] `npm test` — logic: 109 files / 2383 passed / 3 skipped (2386); components: 1 file / 4 passed
- [x] `npm run test:coverage` — exit 0; global 92.45/93.9/85.75/91.83 and all three per-directory floors (`src/domain`, `src/render`, `src/prompt-core`) hold
- [x] `npm run build` (`ng build`) — exit 0, only the three known pre-existing CommonJS warnings (`file-saver`, `js-beautify`, `jszip`)
- [x] `bash arch-guard.sh` — exit 0, all five frozen checksums identical to baseline
- [x] `npm run validate:harness` — exit 0: `22 stages, 23 artifacts, 16 skills named — OK, registry is internally consistent and every named skill exists`

The 3 skips are the pre-existing opt-in live probe in `test/doc-generation-live.spec.ts`
(`LIVE_DOC_TEST=1`), skipped at baseline too. The skip count did not move — 3 before, 3 after —
so nothing was quietly `.skip`-ed to reach green. Regression arithmetic: 2357 baseline + 24
(the original spec) + 2 (the two added assertions) = 2383.

### On `npm run validate:harness`, stated plainly rather than inherited

The quality gate recorded this command as **NOT APPLICABLE**, on the evidence that no commit under
gate touched `docs/workflow/` or `.claude/skills/so-*`. **That evidence has since gone stale.** Two
documentation commits made *after* the gate ran — `5864970` and `5293acc` — commit
`docs/workflow/active-story.yaml`, `docs/workflow/history.jsonl` and
`docs/workflow/workflow-state.yaml`, so three `docs/workflow/` paths **are** in this Pull Request's
diff.

The gate's *reasoning* still holds: those three files are per-Story run state written by
`so-orchestrator`, not harness definitions. `stage-map.yaml`, `artifact-paths.yaml`,
`artifact-lifecycle.md`, `artifact-schema.md`, `state-schema.md` and every file under
`.claude/skills/` are **absent from the diff** — checked against the rendered file list, not
assumed.

Rather than rest on a re-argued exemption, the command was **run on this branch** and is green, and
its real output is the checkbox above. The gate's conclusion re-verifies; only its stated evidence
had been overtaken.

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
  the validator changes. **Nothing under `src/` appears in the diff at all**, so no generated HTML
  can differ and there is no output to check.
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
`optionsSuccessStatus: 204`. `package.json:51` declares `"cors": "^2.8.5"` — re-read in this pass
on both the working tree and `origin/main`, where it is identical — and the installed module
resolves **2.8.6**. That is a caret range which permits a 2.x minor to move either default. One test now catches
exactly that flip (`FR-6/D9: a listed origin preflight is answered by the middleware itself, with
204, not handed on`), added at `f981732`, and it was proven to bite: mutating the middleware to
`preflightContinue: true` fails that assertion and **only** that assertion, 1 of 26, while every
header assertion stays green — which is precisely the silent failure mode. **The standing
instruction to re-verify this on a `cors` version bump currently lives only in an impact-analysis
row that archives with this Story.** It is recorded here so it survives, and it should be carried
into a follow-up Story or a dependency note.

**3. Follow-up Story recommended: update `README.md` (plan decision D10).** `README.md:157-189`
mirrors the env file inline — the `dotenv` block at `README.md:161-186` lists `PORT` but not
`ALLOWED_ORIGINS` — so the README's Configuration section is now stale. This was deliberately argued
out of US-1.1's scope because no acceptance criterion reaches it, and `.env.example` (the file the
acceptance criterion *does* reach) is fully current. Recommend a follow-up Story.

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

**7. What the 23 non-code paths are, so the file list is not mistaken for scope creep.** This Pull
Request renders 27 files, of which only 4 are code or tests. The other 23 are this Story's delivery
record, committed by five documentation commits — `917501c`, `3c043c4`, `5864970`, `5293acc`, and the one carrying this artifact:
the `docs/` artifact chain from Story through reconciliation, `docs/catalog/US-1.1-pipeline-status.md`
and `docs/catalog/stories.yaml` (the `pipeline_status` and `story_catalog` artifacts, both
registry-owned in `docs/workflow/artifact-paths.yaml`), and the three `docs/workflow/` run-state
files written by `so-orchestrator`. None is product code and none is an unrelated file; all are
workflow bookkeeping for this Story. The side effect is that no commit on this branch is purely
code. Acceptable; noted so the rendered file list reads correctly.

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

All rows re-derived in this pass against merge base `c8d0a32` and the current branch tip. No row is
carried over from version 1.

| Check | Result |
|---|---|
| All four upstream reports opened, verdict `PASS` | **Yes** — each opened and its verdict read, not inferred. `quality_gate_report` v2 "Gate verdict: PASS"; `verification_report` v2 "Verdict: PASS"; `security_review` v2 "Verdict: PASS" with five non-blocking findings; `reconciliation_report` v2 "Verdict: PASS", `loop_back_stage: null`. All four are `status: APPROVED`, version 2. The `story` is v2 / `DRAFT`, which is not a finding — lifecycle §1 promotes per human gate and the Story is not in the spec gate's `required_artifacts`. |
| Quality gate has real output for all six commands | **Yes, for all six — five from the gate, the sixth re-run here.** Five commands were executed by the gate with real pasted output (lint, `npm test` both runners, coverage, build, arch-guard) — verbatim terminal blocks with exit codes, not summaries. The sixth, `npm run validate:harness`, the gate declared NOT APPLICABLE; **its premise was overtaken by `5864970` and `5293acc`**, which commit three `docs/workflow/` paths into this diff. The command was therefore **run on this branch in this pass** — exit 0, `22 stages, 23 artifacts, 16 skills named — OK`. Its reasoning survives independently: no harness *definition* is in the diff (`stage-map.yaml`, `artifact-paths.yaml`, `artifact-lifecycle.md`, `artifact-schema.md`, `state-schema.md` and `.claude/skills/` all absent, checked against the rendered file list). |
| Architecture Rule 2 explicitly addressed by the verifier | **Yes** — `verification_report` v2 §1, a dedicated section. The route handlers (`/api/retrieval/url`, `/api/retrieval/search`, `/api/llm/generate`) were reopened this pass, and the verifier states in its own words that the green arch-guard is *not* evidence for this section. |
| No unresolved blocking security finding | **Yes** — five findings, all classed non-blocking, none routed to `IMPLEMENTATION`. No blocking condition from the severity table present: no secret escapes the server, nothing new reaches the `bypassSecurityTrustHtml` pipe, no fetched page reaches `systemBlocks`. Finding 4 is forward-looking and belongs to OD-1. |
| Every `AC-n` cleared all three reconciliation levels | **Yes** — AC-1 (7 tests), AC-2 (8), AC-3 (2), AC-4 (5), AC-5 (2) all ✓/✓/✓; 26 rows, 26 tests found, **26 bodies read**. AC-3's Level 3 carries a bounded limitation (NBF-1, the literal `200`), surfaced in the PR body's reviewer notes rather than left in the artifact. |
| Commits contain only what `task_breakdown` named | **Yes, argued at the 27-path scope this Pull Request actually renders — not carried from the upstream five-commit analysis.** Every upstream report assessed five commits and five paths; the Pull Request renders **ten commits and 27 paths**, so the row was re-derived. Code and tests are **4 paths**: `server/cors-policy.js` (T1), `server/index.js` (T2), `.env.example` (T3) and `test/cors-policy.spec.ts` (the plan's file table, `so-test-writer`'s). The other **23** are all workflow bookkeeping for this same Story — the `docs/` artifact chain, `docs/catalog/US-1.1-pipeline-status.md` and `docs/catalog/stories.yaml` (the registry-owned `pipeline_status` and `story_catalog` artifacts), and `docs/workflow/active-story.yaml`, `history.jsonl` and `workflow-state.yaml` (`so-orchestrator`'s state files, owned in `artifact-paths.yaml` under `state_files`). **Not one is product code and not one is unrelated to US-1.1.** No drive-by refactor, no rename, no reformatting of an untouched file. **No dependency change: `package.json` and `package-lock.json` are in 0 files** — the rejected `supertest` proposal stayed rejected. Stated as the fact derived rather than as a history claim: both files are absent from the diff, and `package.json:51` is byte-identical to `origin/main`'s (`"cors": "^2.8.5"`), so this branch proposes no dependency or script change of any kind. **Nothing under `src/`: 0 files.** |
| No fixup-run, no `--no-verify`, no phase batching | **Qualified pass.** No fixup run: ten commits, each a complete working change, no `fixup`/`squash`/`wip`/`typo` subject on the branch, re-checked across all ten. **No phase batching — and this is the row the harness merge cleaned up:** the P0–P6 harness migration that previously rode on this branch has landed separately on `main` (#123, `87b0aef`), so all ten commits are now one Story's work. On `--no-verify` — not retrospectively provable from history, and the honest answer is that **this repository has no commit hooks at all** (no `.husky/`, no `prepare`/`husky`/`pre-commit` entry in `package.json`, only `.sample` files in `.git/hooks/`), so there is no hook that could have been skipped. **The one real deviation is commit ordering**, assessed in the body's reviewer note 6: tests landed after implementation, leaving `dc29f40`, `540a676` and `68dea71` not verifiable standalone against the test results they cite. Recorded, not waved through. |
| Frozen-file change has same-commit re-baseline | **Not engaged** — no FROZEN file changed. All five are absent from every commit, and `.arch-guard-checksums` is correctly absent too. arch-guard exit 0 with all five checksums matching baseline byte for byte. |
| No secret in any commit, including removed ones | **Yes**, and structurally so. The branch is **+6405 / −21** across ten commits, and the **only deleted production line is `app.use(cors());`**; the other 20 deletions are `docs/catalog/stories.yaml` (3), `docs/workflow/active-story.yaml` (7) and `docs/workflow/workflow-state.yaml` (10) — 3 + 7 + 10 + 1 = 21, and a reviewer can check that in one command. With no other production deletion anywhere on the branch, the added-then-removed-secret class is impossible here. `.env.example` is the only tracked `.env*` file (`.env` is gitignored). A scan of every added line across all ten commits for key/token/secret shapes returned **zero matches**, re-run across all ten. |
| `.env.example` current with placeholders | **Yes** — T3 is what made it current. `ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.example.com` above a seven-line comment block. Placeholder only: loopback plus `example.com`, the IANA/RFC 2606 reserved documentation domain. No real deployed hostname, key or credential. **`README.md` is a separate matter:** its Configuration section (`README.md:157-189`, `dotenv` block at `:161-186`) mirrors the env file inline and does not carry `ALLOWED_ORIGINS`, so it is now stale — deliberate, per plan decision **D10**, since no acceptance criterion reaches it. Recommended as a follow-up Story in the PR body. |

### The four version-1 claims this version corrects

Recorded explicitly, because `so-pr-creator` rejected version 1 on exactly these.

| # | Version 1 claimed | The re-derived truth |
|---|---|---|
| 1 | "**+758 / −1** across five commits" | **+6405 / −21 across ten commits**, 27 files. The production/test surface is +540 / −1 across four paths. |
| 2 | "**five paths** across five commits" | **27 paths**: 4 code/test, 23 workflow bookkeeping for this Story. |
| 3 | "the **single deleted line** is `app.use(cors());`" | It is the single deleted **production** line. 20 further deletions exist in three `docs/` files; the decomposition is in the table above. |
| 4 | "`npm run validate:harness` — n/a, harness untouched: **no `docs/workflow/` … path appears in any of the five commits**" | Three `docs/workflow/` paths **are** in the diff, committed by `5864970` and `5293acc`. The command was run and is green. This row is the only place that sentence appears in this version, and it appears here as the claim being retracted — it is asserted nowhere in the Pull Request body or the pre-flight rows. |

A fifth version-1 statement, "`package.json` and `package-lock.json` absent — the rejected
`supertest` proposal stayed rejected", was **true when written and is still true**: re-derived at 0
files in this pass. It is listed here only so the reader knows it was re-checked rather than
assumed.

### R — the recursion note `so-pr-creator` must read before opening

**This document is itself inside the diff it describes.** Version 1 was committed at `5293acc`;
this version-2 revision rides on the tip commit, which is why **no SHA for it is named anywhere
above** — a commit cannot state its own hash. This file is 388 lines, exactly 388 of the 6405.

1. **Resolved.** The Pull Request no longer renders version 1 — the superseded draft with the four
   false claims. This version replaced it, and the insertion figure was re-derived afterwards
   against the amended tip, which is why it reads 6405 rather than 6282.
2. **The file count stayed 27**, as this note predicted, because the path was already `A` relative
   to the merge base — verified with
   `git diff --name-status c8d0a32..HEAD -- docs/pr/US-1.1-pr-summary.md`, not assumed. Only the
   insertion total moved. Any further edit to this file must either preserve its 388 lines or
   re-derive that total again with `git diff --stat origin/main...HEAD`.
3. **The branch is 4 commits behind `origin/main`** (`87b0aef`, the merged harness Pull Request).
   The figures above are the three-dot diff from merge base `c8d0a32`, which is what GitHub renders,
   so they are correct as they stand. But a **rebase or merge of `main` before opening would move
   the merge base and every figure with it** — if that happens, this artifact needs a version 3, not
   an edit in place.
