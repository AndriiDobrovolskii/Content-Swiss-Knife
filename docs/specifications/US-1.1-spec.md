---
artifact: specification
story: US-1.1
version: 1
status: DRAFT
owner: so-spec-writer
created_at: 2026-09-18T00:00:00Z
updated_at: 2026-09-18T00:00:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 1
  - key: clarification_report
    version: 1
  - key: open_decisions
    version: 1
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
authentication. Wide-open CORS means any page a user visits can drive that user's browser to
call the proxy successfully and spend the owner's API credits.

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

- **Authentication on the proxy.** CORS is a browser-side mechanism; a direct `curl` or script
  still reaches `/api/llm/*` and spends credits. Recorded as **OD-1**, non-blocking, deferred
  to its own Story.
- Rate limiting.
- Any change to endpoint behaviour, payloads or routing.
- Setting the real origin in Railway — a deployment action, not a code change.

## Open questions

- **OD-1** (non-blocking): the proxy has no authentication, so this Story reduces exposure
  without removing it. Explicitly out of scope per the Story and confirmed with the user. See
  `docs/decisions/US-1.1-open-decisions.md`.

## Traceability matrix

| Acceptance criterion | Satisfied by | Notes |
|---|---|---|
| AC-1 | FR-1, FR-2 | listed origin echoed exactly |
| AC-2 | FR-3 | header omitted, request not rejected |
| AC-3 | FR-4 | origin-less requests, incl. the health check |
| AC-4 | FR-5 | fail closed on unset configuration |
| AC-5 | FR-7 | `.env.example` placeholder |
| — | FR-6 | preflight; derived from AC-1/AC-2 and made explicit per the clarification report. Not scope creep: it constrains the same behaviour those criteria already describe, on the request type the browser sends first. |
