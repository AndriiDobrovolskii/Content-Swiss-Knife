---
artifact: verification_report
story: US-1.1
version: 2
status: APPROVED
owner: so-implementation-verifier
created_at: 2026-09-18T09:20:00Z
updated_at: 2026-09-18T21:00:00Z
supersedes: docs/verification/US-1.1-verification-report.md#1
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: implementation_report
    version: 2
  - key: quality_gate_report
    version: 2
open_decisions_blocking: false
---

# Implementation Verification Report — US-1.1 (track `server`), version 2

Branch `feat/US-1.1-proxy-cors-allowlist`. Commits verified: `dc29f40` (T1), `540a676` (T2),
`68dea71` (T3), `7b117e2` (the spec file, handed over untracked), `f981732` (two added
preflight assertions) — **five**, one more than version 1 carried.

**Verdict: PASS.** No AGENTS.md rule is violated by this change set. One non-blocking
finding is recorded (NBF-D9-LEG, adjudicated in §9).

## Why this version exists

Version 1 recorded every input at `version: 1`. `RECONCILIATION` returned `story_drift`, the
Story was amended, and the whole upstream chain was re-issued at v2; `so-test-writer` then
added two assertions to `test/cors-policy.spec.ts`. v1's `inputs_consumed` no longer describes
the artifacts this stage is answerable to.

**What the amendment actually moved, and what it did not.** The Story's outcome clause now
promises in its own words that "no preflighted cross-origin request … succeeds from an unlisted
origin". Specification v2 FR-6 discharges that promise, and `test/cors-policy.spec.ts:349`,
`:356`, `:366` and `:382` assert both preflight legs. **No production file changed between v1
and v2 of this report** — `git diff --name-status 3c043c4..HEAD` returns the same five paths,
and `server/index.js` is still +3/−1. The code verdict is therefore unchanged. What is new in
v2 is the input versions, the re-read of the route handlers, and the D9 adjudication routed to
this stage.

## Input currency (lifecycle §1)

Every consumed input was confirmed current by reading its front matter this pass, not assumed:

| Input | version | status |
|---|---|---|
| `story` | 2 | `DRAFT` |
| `specification` | 2 | `APPROVED` |
| `implementation_plan` | 2 | `APPROVED` |
| `task_breakdown` | 2 | `APPROVED` |
| `implementation_report` | 2 | `DRAFT` |
| `quality_gate_report` | 2 | `DRAFT` |

None is `SUPERSEDED` or `ARCHIVED`. The Story sitting at `DRAFT` while the Specification is
`APPROVED` is not a finding: lifecycle §1 promotes artifacts per human gate, and the Story is
not in the spec gate's `required_artifacts`.

Everything below is a check against **the diff**, read directly. Where `quality_gate_report`
covers the same ground it is cited as corroboration only — a green gate was not accepted as
evidence for any item in this document.

## What was read

```
$ git diff --name-status 3c043c4..HEAD
M	.env.example
A	docs/catalog/US-1.1-pipeline-status.md
A	server/cors-policy.js
M	server/index.js
A	test/cors-policy.spec.ts

$ git diff 3c043c4..HEAD -- server/ .env.example          # read in full
$ git diff --stat 3c043c4..HEAD                            # 758 insertions, 1 deletion
$ sed -n '199,222p' server/index.js                        # retrieval handlers, read this pass
$ sed -n '66,80p'   server/index.js                        # /api/llm/generate, read this pass
$ sed -n '165,182p;180,250p' node_modules/cors/lib/index.js  # the D9 claim, at source
```

---

## 1. Architecture Rule 2 — retrieval separate from generation

**This check exists only here.** `arch-guard.sh` implements Rules 1, 3 and 4 and explicitly not
Rule 2 (AGENTS.md §3, "Known accepted tech debt"); no test covers it; `quality_gate_report`
§*What this green gate does not cover* item 1 says so in its own words and routes it here. The
green arch-guard run is **not** evidence for this section.

### Code paths actually opened this pass

Line numbers are post-diff (the added import at `server/index.js:13` shifted everything below
it by one, so version 1's citations no longer land).

| Path | What it does after the diff |
|---|---|
| `server/cors-policy.js` (new, 70 lines) | Two pure functions. **Zero `import` statements, no `require`, no `fetch`, no HTTP client, no provider, no model call** — confirmed by `grep -nE "console\.\|fetch\|^import \|require\(\|axios\|http"`, whose only hits are the `http://localhost:3000` default at `:13` and two `https://shop.example` occurrences inside doc comments at `:19-20`. |
| `server/index.js:34` (the one changed line) | Registers `cors()` as Express middleware. Takes an `Origin` string, returns a boolean. Reads no body, calls no provider, fetches no page, reaches no model. |
| `server/index.js:201-210` `/api/retrieval/url` | Read in full this pass. Destructures `url` from the body, `await fetchUrl(url)`, returns `{ content }`. **No model call, no provider import, no prompt.** Unchanged by this diff. |
| `server/index.js:212-221` `/api/retrieval/search` | Read in full this pass. `await serper.search(query, num)` via `SerperRetrieval` imported at `:5`. **No model call.** Unchanged by this diff. |
| `server/index.js:66-80` `/api/llm/generate` | Read in full this pass. `resolveRequest(req.body, slotName)` then `resolved.instance.generate({ systemBlocks, userContent }, mode, slot)`. **No `fetchUrl`, no `serper`, no URL fetch of its own.** Unchanged by this diff. |
| `server/index.js:116`, `:139` `/api/llm/vision`, `/api/llm/pdf` | Provider calls via `server/providers/factory.js` (`warmProviders`, `:12`). Unchanged by this diff. |

### Verdict on Rule 2: holds

Rule 2 governs **where fetching and model calls live**: web search and page fetch through
`RetrievalProvider`/`SerperRetrieval`, generation code that does not fetch, retrieval code that
does not call a model, URL extraction by fetching rather than searching. This diff moves none of
it. It adds a transport-layer header policy in front of the whole Express app and changes no
route handler, no provider and no retrieval path. After the change `/api/retrieval/*` still
reaches `fetchUrl` and `serper.search` and nothing else, and `/api/llm/*` still reaches the
provider factory and nothing else.

**On the uniform-middleware question routed to this stage.** The policy is applied once, at
`app.use`, so it covers `/api/llm/*` and `/api/retrieval/*` identically. My own reasoning, not
an endorsement of an earlier pass's: the question Rule 2 asks is whether the two concerns'
*code* is coupled — whether generation can reach a fetcher or retrieval can reach a model. The
callback's entire input is an `Origin` string and its entire output is a boolean. It carries no
body, no query, no provider handle, no continuation. There is therefore no data, context or
control flow it *could* move from one concern into the other, and no call path between them that
it creates or could create. Two per-router CORS policies would be strictly worse: two allow-lists
free to drift apart, for no separation gain. **One cross-cutting middleware applied uniformly is
not the two concerns mixed.** I reach the same conclusion as `plan_review` and
`quality_gate_report` NBF-5, independently and on this reasoning.

**Google Grounding is not reintroduced.** `git diff 3c043c4..HEAD -- server/ .env.example test/`
piped through `grep -niE "grounding|googleSearch"` returns **nothing**. Grounding remains
Serper-only.

---

## 2. The `server/index.js` wiring line — the Story's untested surface

Referred here by name by `quality_gate_report` item 3. Plan decision D1 (`app.listen()` at module
scope makes the file unimportable; `supertest` rejected as a §7.8 dependency proposal) means diff
review **is** this line's only coverage.

**The v1 manual boot-and-curl smoke check is not relied on anywhere in this report.** It belongs
to the v1 pass, `so-gate-enforcer` did not re-run it and explicitly does not vouch for it. Every
statement below rests on reading the diff this pass.

The complete diff for this file:

```diff
+import { resolveAllowedOrigins, corsOriginPolicy } from './cors-policy.js';
...
-app.use(cors());
+app.use(cors({ origin: corsOriginPolicy(resolveAllowedOrigins(process.env.ALLOWED_ORIGINS)) }));
```

**(a) Credentials are not passed — NFR-1 / D8 holds.** The options object has exactly one key,
`origin`. There is no `credentials`, no `exposedHeaders`, no `methods`, no `allowedHeaders`. The
`cors` package defaults `credentials` to `false` and nothing in the diff changes it. Read off the
line itself, not off the plan's intention.

**(b) No error-throwing origin callback at the wiring level — FR-3 holds.** The wiring constructs
no callback of its own; it passes `corsOriginPolicy(...)`'s return value straight through. That
callback, at `server/cors-policy.js:66-70`, is

```js
return (origin, callback) => {
  callback(null, origin === undefined || allowed.includes(origin));
};
```

The first argument is the literal `null` on every path — no `new Error`, no `throw`, no
conditional that could yield a truthy first argument. A refused origin reaches `cors` as
`(null, false)`. There is also **no try/catch** added at the wiring level, which `task_breakdown`
warned against explicitly. The module's comment records why the common online shape
(`callback(new Error('Not allowed by CORS'))`) would violate FR-3 while appearing to work — the
rationale sits where a future editor would change it.

**(c) The change is the import plus that one line and nothing else.** `server/index.js` is **+3 /
−1**: one added `import` in the existing import block, and `app.use(cors())` replaced by the
configured call. No other line is touched — no reformatting, no reordering of the surrounding
`app.use` calls, no comment deleted, no route changed. NFR-3 holds by inspection, not by the
suite staying green.

### Fail-closed, verified at the source

FR-5 is the requirement most likely to fail silently, so it was read rather than assumed.
`resolveAllowedOrigins` ends in

```js
return configured.length > 0 ? configured : [DEFAULT_ALLOWED_ORIGIN];
```

Both branches return a non-empty array; there is no `return undefined`, no `return []`, no early
return anywhere in the function. Since `cors` reads a falsy `origin` option as permission for
every origin (`node_modules/cors/lib/index.js:210-216`: an `originCallback` is only bound when
`corsOptions.origin` is truthy, and otherwise the middleware calls plain `next()`), the absence
of such a path is what keeps the wildcard closed — and it is **structural rather than
conditional**, as D3 required.

---

## 3. AGENTS.md §4 — HTML acceptance criteria: NOT APPLICABLE

Established from the change set, not asserted. §4 engages when the prompt, the Zod schema, a
renderer or the validator changes. The five changed paths are `.env.example`,
`server/cors-policy.js`, `server/index.js`, `test/cors-policy.spec.ts` and a workflow document.
**Nothing under `src/` appears in the diff at all** — no `src/prompts/`, `src/prompt-core/`,
`src/domain/`, `src/render/` or `src/utils/`. No prompt text, Zod schema, renderer or validator
changed, so no generated HTML can differ. There is no output to check §4 against, because this
Story produces none.

**`meta-description-currency` remains disarmed.** `src/utils/output-validator.ts` is not in the
change set, so the rule cannot have been armed by this diff.
`src/services/seo-currency-wiring.spec.ts`, which pins it, is likewise untouched and green.

## 4. `STORE_REGISTRY` remains the single source of truth

Searched the production diff for locale codes, currency characters and registry bypasses:
`git diff 3c043c4..HEAD -- server/ .env.example | grep -nE "uk-UA|en-US|pl-PL|de-DE|₴|€|zł|USD|EUR|getLangsForStore|STORE_REGISTRY"` returns **nothing**. No language list, locale set,
currency symbol or image base URL is introduced anywhere; `src/prompt-core/constants.ts` is not in
the change set. The Specification records the scope as "none — infrastructure only, no
`STORE_REGISTRY` involvement", and the diff matches.

The only literals in the new module are `http://localhost:3000` (see §8) and the `,` / `/`
characters used for parsing.

## 5. Prompt-caching block separation

No prompt builder changed — nothing under `src/prompts/` or `src/prompt-core/` is in the diff, so
`systemBlocks` / `userContent` separation and the `cache: true` markers cannot have been collapsed
by this change set. Corroborated at the transport boundary this pass:
`server/index.js:67` still destructures `systemBlocks` and `userContent` as separate fields and
`:79` still passes them as `{ systemBlocks, userContent }` — unchanged by this diff.

### AGENTS.md §6 item 6 — "runtime rules held" — discharged here

`quality_gate_report` item 2 routes AGENTS.md §6.6 to this stage by name, so it is closed
explicitly rather than left as an unanswered routing. Item 6 has exactly three limbs, and each is
discharged above: **Rule #2 checked by reading the diff** (§1, with the route handlers reopened
this pass); **§4's HTML acceptance criteria checked against real output if the prompt or renderer
was touched** (§3 — neither was touched, nothing under `src/` is in the change set, so the
conditional does not fire and there is no output to check); **the store registry still the only
source of languages and currency** (§4). No limb of item 6 is left open.

## 6. FROZEN files (AGENTS.md §9)

**None of the five changed.** The evidence is the change set itself: `src/prompts/task-a.ts`,
`src/prompts/task-b.ts`, `src/prompts/task-c.ts`, `src/prompt-core/master-system-prompt.ts` and
`src/utils/output-validator.ts` (AGENTS.md:451-455) appear in **none** of
`git diff --name-status 3c043c4..HEAD`, nor in any of the five commits. A file absent from the
diff cannot have been edited by it. `.arch-guard-checksums` is likewise absent, which is correct —
with no frozen-file edit, re-baselining would itself be a finding.

The §9 approval question and the same-commit re-baseline question therefore do not arise. The
repository's known stale-baseline history on `task-a.ts` / `task-c.ts` is not engaged.

## 7. Server conventions and secret containment

- **No SDK import outside `server/providers/`.** `server/cors-policy.js` has no imports at all;
  `server/index.js` gained one import, of a local sibling module.
- **No prompt string** anywhere in the diff.
- **No secret can reach the bundle, a response body or a log.** `server/cors-policy.js` contains
  **no `console.*` call** (verified by grep, not by reading intent), so the allow-list cannot be
  logged. It cannot reach a response body: when the policy returns `true`, `cors` echoes the
  *request's own* `Origin` header, so the configured list is never serialised; when it returns
  `false`, nothing is emitted. It cannot reach the browser bundle: `grep -rn "ALLOWED_ORIGINS" src/`
  returns **nothing** — the variable is read exactly once, in `server/index.js`, from `process.env`.
  The value is a list of origins, not a credential, but the containment question was checked
  rather than waved off, because §3 Rule 4 applies to the mechanism, not to one value's sensitivity.
- **No API key** is read, passed, logged or referenced anywhere in the diff.
- `server/usage/store.js` is untouched, so the no-migration question does not arise.
- The change follows the existing `server/llm-request.js` precedent (pure logic extracted so a test
  can import it, wiring left in `index.js`) rather than inventing a second pattern — AGENTS.md §1.1.

## 8. Scope discipline (§7.8)

Five paths. Four are named in `task_breakdown`'s Files tables: `server/cors-policy.js` (T1),
`server/index.js` (T2), `.env.example` (T3), and `test/cors-policy.spec.ts` (named in the
implementation plan's file table as `so-test-writer`'s).

The fifth, `docs/catalog/US-1.1-pipeline-status.md`, is not in any task's Files table and is not
scope creep: it is the `pipeline_status` artifact, owned by `so-builder` in
`docs/workflow/artifact-paths.yaml`. Workflow bookkeeping, not product code.

**`f981732`, new since version 1, does not widen the change set.** Its production content is a
+35 delta to `test/cors-policy.spec.ts` — already an accounted path, and `so-test-writer`'s
artifact, not the builder's. It adds two assertions and touches no production file. The five-path
change set still contains nothing `task_breakdown` did not account for.

No drive-by refactor, no rename, no reformatting of an untouched file, no deleted comment, no new
dependency (`package.json` and `package-lock.json` are absent from the diff — the rejected
`supertest` proposal stayed rejected), no config edit (`vitest.config.ts`, `tsconfig.json`,
`angular.json`, `arch-guard.sh` all absent).

---

## 9. NBF-D9-LEG — adjudicated

Routed to this stage by `quality_gate_report` item 5, which recorded it without adjudicating it.

### The technical claim, verified at source this pass

I did not take the claim on report. Reading `node_modules/cors/lib/index.js`:

```js
// :219-224
originCallback(req.headers.origin, function (err2, origin) {
  if (err2 || !origin) {
    next(err2);                          // ← a refusal lands here
  } else {
    corsOptions.origin = origin;
    cors(corsOptions, req, res, next);   // ← only this path reaches the preflight handler
  }
});
```

and the preflight handler itself, reached only from `:224`:

```js
// :173-181
if (options.preflightContinue) {
  next();
} else {
  res.statusCode = options.optionsSuccessStatus;   // :178 — the 204
  res.setHeader('Content-Length', '0');
  res.end();
}
```

**The claim is correct.** Our policy returns `false` for an unlisted origin, so `!origin` is true
at `:220`, the middleware calls `next(undefined)` at `:221` and **never enters the inner `cors()`**
where `optionsSuccessStatus` (defaulted to `204` at `:12`) is applied. `statusCode === 204` on an
unlisted origin's preflight is **not producible by this package**, at any configuration. The
`204` belongs to the **listed** leg, and only there.

The delivered tests match the package: `test/cors-policy.spec.ts:366` asserts
`statusCode === 204`, `ended === true`, `nextCalled === false` on the **listed** leg, and `:382`
asserts the complementary and genuinely additive fact on the unlisted leg — `nextCalled === true`,
`ended === false`, `statusCode` undefined, header absent.

### Is this a compliance finding for this stage? No — it is a documentation matter

**It is a documentation matter for the owning stages, recorded here, not a compliance finding.**
My reasoning, in the terms this stage is answerable to:

1. **The APPROVED requirement is satisfied exactly as written.** Specification v2 FR-6 requires
   that "an unlisted origin's preflight receives no `Access-Control-Allow-Origin` header" and
   names **no status code for any preflight**. That is precisely what shipped and precisely what
   `:356` and `:382` assert. The requirement is correct; the delivered behaviour is correct; they
   agree. There is nothing for this stage to fail.
2. **No AGENTS.md rule is engaged.** This skill's remit is technical compliance with AGENTS.md —
   Rule 2, §4, `STORE_REGISTRY`, prompt-caching, §9, conventions, scope. No rule in AGENTS.md
   requires that an artifact's explanatory prose be technically accurate. That is the review and
   lifecycle stages' concern, not a Definition-of-Done rule I can hang a verdict on.
3. **Neither loop-back key fits, which is the decisive test.** `changes_required` →
   `IMPLEMENTATION` would be wrong: there is nothing for the builder to change, since the code and
   the tests are already right. `changes_required_plan` → `ARCHITECTURE_PLANNING` would be wrong on
   this skill's own definition of that key — it is for code that *faithfully implements a plan that
   itself violates a rule*. D9 states in plan v2's own words that it "produces no task and no file
   change". A factual slip in a passage that generated no work is not a design defect, and routing
   it back would ask a stage to re-decide a design it never made.

Returning `CHANGES_REQUIRED` with no correctable code and no fitting loop-back target would stall
the workflow on a prose error in three documents I neither own nor may edit.

### Recorded so it survives this stage boundary

The defect is confined to prose in three `APPROVED` artifacts, none of them mine:

| Artifact | Owning stage / skill | The incorrect prose |
|---|---|---|
| `implementation_plan` (§D9) | `ARCHITECTURE_PLANNING` / `so-planner` | attributes FR-6's `204` to the **unlisted** origin's preflight |
| `task_breakdown` (D9 row) | `IMPLEMENTATION_PLANNING` / `so-implementation-planner` | carries the same leg attribution forward |
| `plan_review` (finding 1) | `PLAN_REVIEW` / `so-plan-reviewer` | sketches the closure as `ended === true, statusCode === 204` on the unlisted leg |

**The correction, in one line:** the `204` / `ended` / `not handed on` assertions belong to the
**listed** origin's preflight; the unlisted leg's assertable facts are `nextCalled === true`,
`ended === false`, no status set and no header — which is what shipped.

**Why it is worth recording rather than dropping.** It has a concrete future cost: a reader acting
on that prose in good faith — a maintainer hardening the suite, or a later Story touching this
middleware — would try to assert `statusCode === 204` on a refusal and burn time discovering the
package makes it impossible. Recorded here, that cost is paid once, by me, at source.

I have **not** edited any of the three artifacts, per this stage's constraints.

---

## Reviewed and cleared — recorded, not raised as findings

Carried forward deliberately so a later stage does not meet them cold and re-litigate them.

**The `http://localhost:3000` literal in `server/cors-policy.js:13` versus §7.2.** AGENTS.md §7.2
prohibits hard-coded hosts and ports. Looked at deliberately, and cleared on two grounds. First,
approved Specification FR-5 names that exact string as the required fail-closed fallback — the
literal *is* the requirement, not an environment value smuggled into code; the deployed origin
comes from `ALLOWED_ORIGINS`, and `.env.example` says so in as many words ("Set the real deployed
frontend origin in the deployment's own environment, not here"). Second, `server/index.js` already
carries `process.env.PORT || 3001` and `process.env.LLM_PROVIDER || 'openai'` two lines below the
changed line, so a dev-loopback default beside an environment override is this repository's
established reading of §7.2, not a new liberty.

**`.env.example` carries a placeholder only (NFR-2).** The added value is
`http://localhost:3000,https://your-frontend.example.com`. `example.com` is the IANA-reserved
documentation domain; no real deployed hostname, key or credential enters the repository.

**Commit ordering (`7b117e2` lands the spec file after the three implementation commits).** This
invites a §7.6 "implementation before its failing test" reading and is not one: the baseline
arithmetic in `quality_gate_report` shows `test/cors-policy.spec.ts` existed and was failing
before the builder started — it was untracked, not absent, and `7b117e2`'s own message says so.
`f981732` lands two *additional* assertions after the implementation, which is `so-test-writer`
hardening a green suite, not implementation preceding its test. Checked and dismissed; commit
hygiene proper is `so-pr-preparer`'s remit under §7.8 and §13, not this stage's, so no finding is
raised.

---

## What this stage covered that no command would have caught

Stated explicitly, per this skill's checklist:

1. **Architecture Rule 2** — §1. `arch-guard.sh` does not implement it, no test asserts it, and
   the gate's PASS says nothing about it. Review-only, by design, and the route handlers were
   reopened this pass rather than cited from version 1.
2. **The `server/index.js` wiring line** — §2. Structurally untestable in this repository (D1), so
   the three properties — no credentials, no error-throwing callback, import-plus-one-line — exist
   **only** as a read of the diff. With the v1 smoke check disowned, this section is now the sole
   evidence for that line in the whole pipeline.
3. **The D9 leg discrepancy** — §9. No command compares an APPROVED artifact's prose against a
   dependency's source. Verifying it required reading `node_modules/cors/lib/index.js` by hand.
4. **§4, §9, `STORE_REGISTRY` and prompt-caching as *scope* questions** — §3 to §6 resolve to
   NOT APPLICABLE from the change set rather than from any command's output.
5. **AGENTS.md §6 item 6 in full** — all three limbs of the "runtime rules held" clause, which
   §6 itself marks "not machine-checkable". Closed in §5 above.

## Residual risk carried forward

Not findings; the next stages should hold them.

- **The wiring line stays untested by construction.** Any future edit to `server/index.js:34` has
  the same zero automated coverage, and the same diff review is its only gate.
- **The deployed frontend origin must be set in Railway** before or with the deploy, or the
  frontend will start being refused. Out of scope per the Story; `implementation_plan` Risks asks
  `so-pr-preparer` to surface it in the PR body.
- **NBF-D9-LEG's prose correction** (§9) remains outstanding in three APPROVED artifacts. Blocks
  nothing; owned by the three stages named above.
- **OD-1 stands:** the proxy still has no authentication, so a direct `curl` — or a CORS-simple
  cross-origin form POST, which Specification v2 now names explicitly — reaches `/api/llm/*` and
  spends credits. CORS is a browser-side response control only. Non-blocking, deferred to its own
  Story, and relevant to `SECURITY_REVIEW`.
