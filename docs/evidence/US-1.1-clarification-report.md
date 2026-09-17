---
artifact: clarification_report
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

# Clarification Report — US-1.1

**Verdict: Ready for Specification.**

One non-blocking Open Decision (OD-1). Three questions raised during analysis were answered
from a source and are recorded in the Open Decisions file as resolved, not left open.

## What is clear

- **Business intent** is stated with an actor, a trigger and a value: the maintainer of a
  deployed proxy, so that a third-party page cannot spend their API credits.
- **The evidence is concrete and verifiable**, not asserted. `server/index.js:33` is
  `app.use(cors())` with no options; `server/index.js:39-42` documents the Railway health-check
  path, which establishes the proxy is deployed rather than local-only.
- **All five acceptance criteria are observable and falsifiable.** Each names a request shape
  and a checkable response property. AC-4 in particular is stated as a fail-closed
  requirement, which is the criterion most likely to be silently violated by an
  implementation that treats an unset variable as "no restriction".
- **Scope is bounded** and the boundary is stated rather than implied: authentication, rate
  limiting and the deployment configuration itself are all explicitly out of scope.
- **Configuration approach is decided**: a new `ALLOWED_ORIGINS` environment variable with a
  documented placeholder, so no real deployed URL enters the repository.

## Checked and not applicable

| Area | Finding |
|---|---|
| `STORE_REGISTRY` fan-out | Not applicable. This Story touches no store, locale, currency or image base URL. |
| uk-UA master / locale fan-out | Not applicable. No generation path is involved. |
| AGENTS.md §4 HTML acceptance criteria | Not applicable. No generated HTML changes. |
| FROZEN files (§9) | Not applicable. None of the five is in scope. |
| Prompt → schema → renderer → validator chain | Not applicable. No link is touched. |
| `test/render-reconciliation.report.md` §3/§5 | Not applicable. No renderer or Doc-pipeline work; the corpus coverage gap does not constrain this Story. |

## Ambiguities found and how each was handled

| # | Ambiguity | Outcome |
|---|---|---|
| 1 | Proxy has no authentication; CORS does not stop a direct `curl` | **OD-1**, non-blocking. Explicitly out of scope per the Story and confirmed by the user. |
| 2 | The Story never mentions `OPTIONS` preflight | **Resolved from source** — the `cors` package applies the same `origin` option to preflight. The Specification should state it explicitly rather than leave it implied. |
| 3 | `/health` with a disallowed `Origin` is not addressed by name | **Resolved from the Story** — AC-2 is written against any request, not a route, so it already covers this. AC-3's subject is the origin-less health check. |
| 4 | `credentials` not mentioned | **Resolved from source** — `cors` defaults to `false`, the app uses no cookies, and enabling it would widen the surface for no benefit. |

## Note for the Specification writer

AC-4 is the requirement that carries the real risk. "Unset `ALLOWED_ORIGINS` defaults to
`http://localhost:3000` only" must not be softened into "defaults to permissive for local
development" — a missing configuration value failing **open** is precisely the bug this Story
exists to remove, and it would pass a careless reading of AC-1 and AC-2 while leaving
production wide open.

The Specification should also state the preflight behaviour explicitly (ambiguity 2) so it is
tested rather than assumed.
