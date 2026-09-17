---
artifact: open_decisions
story: US-1.1
version: 1
status: DRAFT
owner: so-clarifier
created_at: 2026-09-18T00:00:00Z
updated_at: 2026-09-18T00:00:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 1
open_decisions_blocking: false
---

# Open Decisions — US-1.1

## OD-1 — The proxy still has no authentication (non-blocking)

**Question:** Should `/api/llm/*` and `/api/retrieval/*` require a shared secret, so that a
non-browser client cannot call the deployed proxy and spend API credits?

**Why it cannot be inferred:** Checked `server/index.js` — no auth middleware is mounted.
Checked `.env.example` — no shared-secret or token setting exists. Checked the README's "BFF
API reference" — it documents no authentication header. There is no prior decision to read.

**Impact if unresolved:** CORS is enforced by browsers only. A `curl`, a script, or any
non-browser client that knows the deployed URL still reaches the endpoints and spends the
owner's API credits. This Story reduces the exposure; it does not remove it.

**Blocking:** `false`. The Story explicitly places proxy authentication out of scope and the
user confirmed that scoping. A Specification can be written and satisfied without resolving
this. Recorded so the residual risk is visible at the human gate rather than discovered later.

**Recommended:** a follow-up Story, before or alongside any wider exposure of the deployment.

---

## Resolved during clarification — no decision needed

These were checked and answered from a source, so they are **not** Open Decisions. Recorded
so it is visible that they were considered.

### Preflight (`OPTIONS`) requests

**Question raised:** does the allow-list apply to CORS preflight, which the Story never
mentions?

**Resolved from source:** the `cors` package handles `OPTIONS` preflight itself using the same
`origin` option, so an origin function applies to preflight and to the actual request alike. No
separate requirement is needed; AC-1 and AC-2 already cover both, and the Specification should
say so explicitly rather than leave it implied.

### `/health` with a disallowed `Origin`

**Question raised:** AC-3 covers a request with **no** `Origin`. What about a browser request
to `/health` carrying a disallowed one?

**Resolved from the Story:** AC-2 is written against any request, not against a specific
route, so a disallowed origin gets no CORS header on `/health` either. AC-3's concern is the
health check itself, which sends no `Origin` and is therefore unaffected. Consistent; no gap.

### Credentials

**Question raised:** should `credentials: true` be set?

**Resolved from source:** the `cors` package defaults to `credentials: false`, and the
application uses no cookies or browser-side session — the access path is `HttpClient` calls to
the proxy. Nothing requires credentialed CORS, and enabling it would widen the surface for no
benefit.
