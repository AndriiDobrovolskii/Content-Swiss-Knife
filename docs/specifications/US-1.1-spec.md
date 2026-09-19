---
artifact: specification
story: US-1.1
version: 2
status: APPROVED
owner: so-spec-writer
created_at: 2026-09-18T00:00:00Z
updated_at: 2026-09-18T14:00:00Z
supersedes: docs/specifications/US-1.1-spec.md#1
inputs_consumed:
  - key: story
    version: 2
  - key: clarification_report
    version: 2
  - key: open_decisions
    version: 2
open_decisions_blocking: false
---

# Specification: US-1.1 — Restrict proxy CORS to an allow-list instead of every origin

## Summary

The BFF proxy sets its CORS response headers from a configured allow-list rather than
accepting every origin. An origin on the list is echoed back; an origin not on it receives no
CORS headers at all, so the browser blocks the response. Requests carrying no `Origin` header
are unaffected. When the allow-list is not configured, it contains exactly one entry —
`http://localhost:3000` — and never degrades to permitting everything.

## Background

`server/index.js:33` currently mounts `app.use(cors())` with no options, which answers every
request with `Access-Control-Allow-Origin: *`. The proxy is deployed, not local-only: it reads
`PORT` from the environment, and `server/index.js:39-42` documents `/health` as Railway's
configured deploy health-check path.

The proxy holds four API keys and exposes `/api/llm/*` and `/api/retrieval/*` with no
authentication. Wide-open CORS means any page a user visits can read the proxy's responses in
full, and can make preflighted cross-origin calls — every JSON `fetch` — succeed from that
user's browser.

What wildcard CORS does **not** control is whether a request reaches the proxy at all. A
CORS-simple cross-origin request is delivered and executed regardless of the allow-list; the
browser only withholds the response from the calling page. Preventing that execution is an
authentication concern, not a CORS one — see *Out of scope* and OD-1.

## Scope

| | |
|---|---|
| **Stores** | none — infrastructure only, no `STORE_REGISTRY` involvement |
| **Locales** | none |
| **Track** | `server` |
| **FROZEN files (AGENTS.md §9)** | none in scope |

## Functional requirements

### FR-1: The allow-list is read from configuration

The proxy reads `ALLOWED_ORIGINS` from the environment as a comma-separated list of origins.
Surrounding whitespace around each entry is ignored, and empty entries are discarded.

**Failure path:** a malformed entry is not a crash — it simply never matches an incoming
`Origin`, since matching is exact string equality.

### FR-2: A listed origin is echoed back

When a request carries an `Origin` header whose value appears in the allow-list, the response
carries `Access-Control-Allow-Origin` set to **that exact origin** — not `*`, and not the
whole list, which the CORS specification does not permit.

**Failure path:** none. A listed origin always matches.

### FR-3: An unlisted origin receives no CORS headers

When a request carries an `Origin` header not in the allow-list, the response carries **no**
`Access-Control-Allow-Origin` header. The request is **not** rejected with an error status —
it is processed normally, and the browser refuses to expose the response to the calling page.

**Failure path:** this *is* the failure path. It must not be implemented as a thrown error, a
`403`, or a middleware that aborts the request, because the user chose header omission over
explicit rejection.

### FR-4: Requests without an `Origin` header are unaffected

A request carrying no `Origin` — a server-to-server call, `curl`, or the Railway health check
— is processed exactly as before. `GET /health` answers `200` with its existing body.

**Failure path:** an implementation that treats a missing `Origin` as "not in the allow-list"
and blocks it would break the deploy health check. It must be allowed.

### FR-5: An unset allow-list fails closed

When `ALLOWED_ORIGINS` is unset, empty, or contains only empty entries, the effective
allow-list is exactly `["http://localhost:3000"]`.

It **must not** fall back to permitting every origin, to `*`, or to disabling the CORS
middleware. A missing configuration value failing open is precisely the defect this
Specification removes.

**Failure path:** this is the requirement most likely to be silently violated by an
implementation that reads the variable, finds it empty, and skips configuring `origin` at all —
which restores the current wide-open behaviour while appearing to satisfy FR-1 through FR-3.

### FR-6: Preflight requests obey the same allow-list

A CORS preflight (`OPTIONS`) request is subject to FR-2 and FR-3 identically to the actual
request. An unlisted origin's preflight receives no `Access-Control-Allow-Origin` header.

This is stated explicitly rather than left implied — the clarification report recorded it as
resolved from the `cors` package's behaviour, and a requirement that is only implied is a
requirement that is only sometimes tested.

The grounding is stronger at Story version 2 than at version 1: the Story's outcome clause now
promises in its own words that "no preflighted cross-origin request … succeeds from an unlisted
origin", while **no acceptance criterion mentions preflight**. FR-6 is what discharges that
promise, together with FR-3 — an unlisted origin's preflight receives no
`Access-Control-Allow-Origin`, the browser aborts the exchange, and the actual request is never
sent. AC-1 and AC-2 are written against "a request carrying an `Origin` header", and an
`OPTIONS` preflight is such a request, so FR-6 traces to both rather than standing alone.

### FR-7: The setting is documented

`.env.example` carries `ALLOWED_ORIGINS` with a **placeholder** value and a comment stating
the comma-separated format and the localhost default. No real deployed URL appears anywhere in
the repository.

## Non-functional requirements

- **NFR-1:** Credentialed CORS stays off. The `cors` package's `credentials` default is
  `false`, the application uses no cookies or browser session, and enabling it would widen the
  surface for no benefit (clarification report, ambiguity 4).
- **NFR-2:** No secret, key or real deployment URL enters the repository (AGENTS.md §3 Rule 4).
- **NFR-3:** Behaviour for every existing endpoint is otherwise unchanged — this Story adds a
  header policy, not a routing or payload change (AGENTS.md §3 Rule 5).

## Out of scope

- **Stopping the request from being executed — for any client, browser or not.** CORS governs
  what a browser does with the *response*; it does not withhold the *request* from the proxy.
  Two paths remain open and this Specification deliberately closes neither:
  - **Non-browser clients.** A `curl`, a script or any server-to-server caller sends no
    `Origin` header, which FR-4 requires to be served, and reaches `/api/llm/*` directly.
  - **CORS-simple cross-origin browser requests.** `application/x-www-form-urlencoded` is a
    CORS-safelisted content type, and `server/index.js:36` mounts
    `express.urlencoded({ limit: '50mb', extended: true })` two lines after the CORS
    middleware. A cross-origin form POST to `/api/llm/generate` therefore sends no preflight,
    is delivered, is parsed into `req.body`, and drives a real provider call.
    `/api/retrieval/search` and the `GET /api/usage*` routes are reachable the same way. The
    attacker's page cannot read the result — but it does not need to if the goal is to burn
    credits.

  Preventing the credit spend itself requires **authentication on the proxy**, which is
  **OD-1**, non-blocking and deliberately deferred to its own Story. No requirement in this
  Specification addresses it, and none could.
- Rate limiting.
- Any change to endpoint behaviour, payloads or routing.
- Setting the real origin in Railway — a deployment action, not a code change.

## Open questions

- **OD-1** (non-blocking, **restated at version 2**): should `/api/llm/*`, `/api/retrieval/*`
  and `GET /api/usage*` require authentication of some kind, so that neither a non-browser
  client **nor a third-party page making a CORS-simple cross-origin request** can cause the
  deployed proxy to execute a request and spend API credits? The question is stated
  mechanism-neutrally: version 1 asked it only for non-browser clients and presupposed a
  shared secret.

  A **constraint on the answer space, not an answer**: AGENTS.md §3 Rule 4 keeps secrets
  server-side and forbids shipping them in the Angular bundle, and the product's own frontend
  is a browser SPA calling this proxy — so any scheme resting on a static shared secret the
  real frontend must present would violate that rule. Which mechanism is acceptable cannot be
  inferred from any source in this repository and is **not** resolved here.

  This Specification stands satisfied without it: FR-1 through FR-7 are satisfiable, and none
  of AC-1 through AC-5 makes a claim about request execution. Recorded so the residual risk is
  visible at the human gate. See `docs/decisions/US-1.1-open-decisions.md`.

## Traceability matrix

| Acceptance criterion | Satisfied by | Notes |
|---|---|---|
| AC-1 | FR-1, FR-2, FR-6 | listed origin echoed exactly, on the preflight as on the actual request |
| AC-2 | FR-3, FR-6 | header omitted, request not rejected; the same for an unlisted origin's preflight |
| AC-3 | FR-4 | origin-less requests, incl. the health check |
| AC-4 | FR-5 | fail closed on unset configuration |
| AC-5 | FR-7 | `.env.example` placeholder |

Every FR traces to at least one AC and every AC to at least one FR. FR-6 is traced to AC-1 and
AC-2 rather than left as an untraced row: both criteria are written against "a request carrying
an `Origin` header", and a CORS preflight is such a request, so FR-6 constrains the same
behaviour on the request type the browser sends first. It is not scope creep and not a
requirement without a criterion.
