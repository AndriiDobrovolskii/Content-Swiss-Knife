---
artifact: story
story: US-1.1
slug: proxy-cors-allowlist
title: Restrict proxy CORS to an allow-list instead of every origin
track: server
version: 2
status: DRAFT
owner: so-story-writer
created_at: 2026-09-18T00:00:00Z
updated_at: 2026-09-18T12:00:00Z
supersedes: docs/stories/US-1.1-proxy-cors-allowlist.md#1
---

# US-1.1 — Restrict proxy CORS to an allow-list instead of every origin

## Story

As a **maintainer of the deployed proxy**,
I want **the BFF to withhold its CORS response headers from every origin I have not listed**,
so that **no third-party page can read a response from my proxy, and no preflighted
cross-origin request — which is every JSON `fetch` the real frontend makes — succeeds from an
unlisted origin**.

## Context

`server/index.js:33` mounts `app.use(cors())` with no options, which sets
`Access-Control-Allow-Origin: *` for every request. The proxy is not a local-only development
tool: it reads `PORT` from the environment and `server/index.js:39-42` documents a `/health`
endpoint configured as Railway's deploy health check, so it is a publicly reachable service.

It holds four API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `SERPER_API_KEY`, optional
`GEMINI_API_KEY`) and exposes `/api/llm/*` and `/api/retrieval/*` with no authentication of
any kind. Wide-open CORS means any web page a user visits can read the proxy's responses in
full, and can make preflighted cross-origin calls — every JSON `fetch` — succeed from that
user's browser.

What wildcard CORS does **not** control is whether a request reaches the proxy at all. A
CORS-simple cross-origin request is delivered and executed regardless of the allow-list; the
browser only withholds the response from the calling page. Preventing that execution is an
authentication concern, not a CORS one — see *Out of scope* and OD-1.

Found during the P5b security-reviewer authoring, while enumerating the real attack surface.

## Scope

| | |
|---|---|
| **Stores** | none — this is infrastructure, no `STORE_REGISTRY` involvement |
| **Locales** | none |
| **Surface** | `server/index.js`, `.env.example`, and the server tests under `test/` |
| **Touches FROZEN files?** | no |
| **Touches generated HTML?** | no |

## Acceptance criteria

- **AC-1:** When `ALLOWED_ORIGINS` is set, a request carrying an `Origin` header listed in it
  receives an `Access-Control-Allow-Origin` header echoing that exact origin.
- **AC-2:** A request carrying an `Origin` header **not** in the list receives **no**
  `Access-Control-Allow-Origin` header, so the browser blocks the response. The request is not
  rejected with an error status.
- **AC-3:** A request with **no** `Origin` header — a server-to-server call, `curl`, or the
  Railway health check — is unaffected: `GET /health` still answers `200`.
- **AC-4:** When `ALLOWED_ORIGINS` is unset or empty, the allow-list defaults to
  `http://localhost:3000` **only**. It must not fall back to allowing every origin — a missing
  configuration value must fail closed, not open.
- **AC-5:** `.env.example` documents `ALLOWED_ORIGINS` with a placeholder value and a comment
  explaining the comma-separated format. No real deployed URL appears in the repository.

## Out of scope

- **Stopping the request from being executed — for any client, browser or not.** CORS governs
  what a browser does with the *response*; it does not withhold the *request* from the proxy.
  Two paths remain open and this Story deliberately closes neither:
  - **Non-browser clients.** A `curl`, a script or any server-to-server caller sends no
    `Origin` header, which AC-3 requires to be allowed through, and reaches `/api/llm/*`
    directly.
  - **CORS-simple cross-origin browser requests.** `application/x-www-form-urlencoded` is a
    CORS-safelisted content type, and `server/index.js:36` mounts
    `express.urlencoded({ limit: '50mb', extended: true })` two lines after the CORS
    middleware. A cross-origin form POST to `/api/llm/generate` therefore sends no preflight,
    is delivered, is parsed into `req.body`, and drives a real provider call.
    `/api/retrieval/search` and the `GET /api/usage*` routes are reachable the same way. The
    attacker's page cannot read the result — but it does not need to if the goal is to burn
    credits.

  Preventing the credit spend itself requires **authentication on the proxy**, which is OD-1
  and is deliberately deferred to its own Story. No acceptance criterion in this Story
  addresses it, and none could.
- Rate limiting.
- Any change to what the endpoints themselves do.
- Configuring the actual deployed origin in Railway — that is a deployment action, not a code
  change, and no real URL belongs in this repository.

## Open questions

- **Q1 (OD-1):** The proxy has no authentication at all, so restricting CORS reduces the
  exposure but does not remove it — any client that reaches the proxy, browser or not, can
  still cause `/api/llm/*` to run and spend API credits.
  - Checked: `server/index.js` has no auth middleware; `.env.example` has no shared-secret
    setting; the README's BFF API reference documents no auth header.
  - Impact if unresolved: the deployed proxy remains callable by anyone who knows its URL,
    whether by a direct non-browser request or by a CORS-simple cross-origin form POST from a
    third-party page. Deliberately deferred to its own Story rather than widening this one;
    recorded here so it is not mistaken for an oversight.

## Amendment history

- **v2 (2026-09-18):** Corrected the business outcome, the capability clause, the Context
  motivation and Q1. Version 1 claimed the control would stop a third-party page making a
  visitor's browser call the proxy and spend API credits; the RECONCILIATION stage returned
  `story_drift` because no implementation satisfying AC-1 through AC-5 could make that claim
  true, and because v1's *Out of scope* excluded only non-browser clients, leaving the
  CORS-simple browser path standing as an unmet promise. The Story now claims what the control
  demonstrably delivers — no third-party page can read a proxy response, and no preflighted
  cross-origin request succeeds from an unlisted origin — and its *Out of scope* now names the
  CORS-simple path and points at OD-1 for the credit spend itself. **AC-1 through AC-5 are
  unchanged**: AC-1, AC-2 and AC-4 describe response-header behaviour accurately, AC-3
  describes the health-check status code and AC-5 the documented setting, and **none of the
  five makes a claim about request execution** — which is why the correction reaches only the
  narrative. Each was verified at assertion level and is satisfied by the delivered
  implementation, with AC-3's `200` leg verified by diff review rather than by test (NBF-1).
  Sources: the RECONCILIATION report §4 and the security review R1.

## References

- `server/index.js:33` — `app.use(cors())`
- `server/index.js:36` — `express.urlencoded(...)`, the CORS-simple request path
- `server/index.js:39-42` — the Railway health-check comment establishing this is deployed
- `docs/reconciliation/US-1.1-reconciliation-report.md` §4 — the `story_drift` finding
- `docs/reviews/security/US-1.1-security-review.md` — residual risk R1
- `docs/decisions/US-1.1-open-decisions.md` — OD-1, the deferred authentication decision
- `AGENTS.md` §3 Rule 4 — secrets are server-side only, through the proxy
- `README.md` — "BFF API reference", "Configuration"
