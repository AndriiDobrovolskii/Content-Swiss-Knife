---
artifact: open_decisions
story: US-1.1
version: 2
status: DRAFT
owner: so-clarifier
created_at: 2026-09-18T00:00:00Z
updated_at: 2026-09-18T13:00:00Z
supersedes: docs/decisions/US-1.1-open-decisions.md#1
inputs_consumed:
  - key: story
    version: 2
  - key: reconciliation_report
    version: 1
  - key: security_review
    version: 1
open_decisions_blocking: false
---

# Open Decisions — US-1.1

Re-derived against Story **version 2**. Version 1 of this file recorded one Open Decision
(OD-1) and three questions resolved from a source. All four are carried forward below. OD-1 is
**restated**, not merely re-recorded: the amendment changed what the Story leans on it for.
Nothing from version 1 was dropped, and no new decision was opened by the amendment.

## OD-1 — The proxy still has no authentication (non-blocking) — *restated at v2*

**Question:** Should `/api/llm/*`, `/api/retrieval/*` and `GET /api/usage*` require
authentication of some kind, so that neither a non-browser client **nor a third-party page
making a CORS-simple cross-origin request** can cause the deployed proxy to execute a request
and spend API credits?

> **What changed from v1.** Version 1 asked this in two narrower forms that Story v2 has
> outgrown:
>
> 1. **Client population.** V1 asked it only for "a non-browser client". Story v2's *Out of
>    scope* now names a **second** open path — a CORS-simple cross-origin browser request
>    (`application/x-www-form-urlencoded` is CORS-safelisted, and `server/index.js:36` mounts
>    `express.urlencoded(...)` two lines after the CORS middleware, so a cross-origin form POST
>    to `/api/llm/generate` sends no preflight, is delivered, is parsed into `req.body`, and
>    drives a real provider call) — and points at **OD-1** as the thing that would close it.
>    OD-1 as written at v1 did not cover that path, so the Story would have been leaning on a
>    decision that did not state the case. It does now.
> 2. **Presupposed mechanism.** V1 asked "should … require **a shared secret**". That
>    presupposition is load-bearing once the browser path is in scope, and it collides with a
>    repository rule (see below). The question is now stated mechanism-neutrally.

**Why it cannot be inferred:**

- Checked `server/index.js` — no auth middleware is mounted. The only middleware before the
  routes is `cors(...)`, `express.json(...)` and `express.urlencoded(...)`.
- Checked `.env.example` — no shared-secret, token or API-key-for-callers setting exists.
- Checked the README's "BFF API reference" — it documents no authentication header.
- There is no prior decision to read.
- **A constraint on the answer space, not an answer.** `AGENTS.md:112-115` (§3 Rule 4) requires
  secrets to stay server-side and forbids putting them in the Angular bundle. The product's own
  frontend is a browser SPA that calls this proxy, so any scheme built on a static shared secret
  that the real frontend must present would have to ship that secret in the bundle. Whether an
  acceptable mechanism exists (a deploy-time gateway, a signed short-lived token minted
  server-side, network-level restriction, or accepting the residual risk) cannot be inferred
  from any source in this repository. It is recorded here as a constraint the eventual answer
  must satisfy — **not** resolved, and **not** a separate decision, because no US-1.1
  requirement depends on it.

**Impact if unresolved:** the deployed proxy remains callable by anyone who knows its URL, by
**two** distinct routes:

- a direct non-browser request (`curl`, a script, any server-to-server caller), which sends no
  `Origin` header and which AC-3 positively requires to be served; and
- a CORS-simple cross-origin form POST from a third-party page in a visitor's browser, which is
  delivered and executed regardless of the allow-list.

In both cases the provider call happens and the credits are spent. The attacker cannot read the
response in the browser case — the allow-list ensures that — but does not need to if the goal is
to burn credits. This Story reduces the exposure; it does not remove it, and Story v2 now says
so in its own words rather than implying otherwise.

**Blocking:** `false`. Story v2 places this out of scope explicitly and in more detail than v1
did, the user confirmed that scoping, and the Specification stands satisfied without it — AC-1
through AC-5 are unchanged and none of them makes a claim about request execution. Recorded so
the residual risk is visible at the human gate rather than discovered later.

**Recommended:** a follow-up Story, before or alongside any wider exposure of the deployment.
Whoever takes it inherits `security_review` Finding 4 as well — turning `credentials: true` on
is harmless today and becomes dangerous the moment authentication exists.

---

## Resolved during clarification — no decision needed

These were checked and answered from a source, so they are **not** Open Decisions. All three are
carried forward from version 1 and re-checked against Story v2. Recorded so it is visible that
they were considered.

### Preflight (`OPTIONS`) requests

**Question raised:** does the allow-list apply to CORS preflight?

**Resolved from source:** the `cors` package handles `OPTIONS` preflight itself using the same
`origin` option, so an origin function applies to preflight and to the actual request alike. No
separate requirement is needed; AC-1 and AC-2 already cover both.

**Delta at v2:** version 1 noted that "the Story never mentions preflight". That is no longer
true of the narrative — v2's business outcome explicitly names "no preflighted cross-origin
request … succeeds from an unlisted origin", so the Story itself now establishes preflight as
in-scope behaviour. The resolution-from-source still stands and still matters, because **no
acceptance criterion** mentions preflight; the Specification should continue to state the
preflight behaviour explicitly rather than leave it implied.

### `/health` with a disallowed `Origin`

**Question raised:** AC-3 covers a request with **no** `Origin`. What about a browser request to
`/health` carrying a disallowed one?

**Resolved from the Story:** AC-2 is written against any request, not against a specific route,
so a disallowed origin gets no CORS header on `/health` either. AC-3's concern is the health
check itself, which sends no `Origin` and is therefore unaffected. Consistent; no gap. AC-2 and
AC-3 are byte-for-byte unchanged at v2, so this resolution carries forward untouched.

### Credentials

**Question raised:** should `credentials: true` be set?

**Resolved from source:** the `cors` package defaults to `credentials: false`, and the
application uses no cookies or browser-side session — the access path is `HttpClient` calls to
the proxy. Nothing requires credentialed CORS, and enabling it would widen the surface for no
benefit. Unchanged at v2; see OD-1's closing note for why this becomes a live question again
once authentication lands.

---

## Checked at v2 and deliberately not opened as a decision

### The non-browser client can *read* responses, not merely send requests

Story v2's outcome clause says "no third-party page can read a response from my proxy". That is
literally true — a *page* is a browser context, and the allow-list withholds the response header
there. A **non-browser** client reads every response in full, and the *Out of scope* bullet for
non-browser clients frames that client only in terms of request execution ("reaches
`/api/llm/*` directly"), not response reading.

This is an asymmetry of emphasis, not an inconsistency, and it is **not** a repeat of the
`story_drift` shape RECONCILIATION found in v1: there, the outcome clause made a browser-side
claim that the exclusions covered only for non-browser clients. Here the outcome clause is
scoped to pages, which the control does govern. No specification writer has to guess at
anything, and no requirement changes either way. Recorded, not opened.
