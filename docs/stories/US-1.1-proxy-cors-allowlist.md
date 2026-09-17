---
artifact: story
story: US-1.1
slug: proxy-cors-allowlist
title: Restrict proxy CORS to an allow-list instead of every origin
track: server
version: 1
status: DRAFT
owner: so-story-writer
created_at: 2026-09-18T00:00:00Z
updated_at: 2026-09-18T00:00:00Z
---

# US-1.1 — Restrict proxy CORS to an allow-list instead of every origin

## Story

As a **maintainer of the deployed proxy**,
I want **the BFF to accept browser requests only from origins I have listed**,
so that **an arbitrary third-party page cannot make a visitor's browser call my proxy and
spend my API credits**.

## Context

`server/index.js:33` mounts `app.use(cors())` with no options, which sets
`Access-Control-Allow-Origin: *` for every request. The proxy is not a local-only development
tool: it reads `PORT` from the environment and `server/index.js:39-42` documents a `/health`
endpoint configured as Railway's deploy health check, so it is a publicly reachable service.

It holds four API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `SERPER_API_KEY`, optional
`GEMINI_API_KEY`) and exposes `/api/llm/*` and `/api/retrieval/*` with no authentication of
any kind. Wide-open CORS means any web page a user visits can issue cross-origin requests to
the proxy from that user's browser and have them succeed.

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

- **Authentication on the proxy.** CORS is a browser mechanism only; it does not stop a direct
  `curl`, a script, or any non-browser client from calling `/api/llm/*` and spending credits.
  This Story deliberately does not close that hole — see Q1.
- Rate limiting.
- Any change to what the endpoints themselves do.
- Configuring the actual deployed origin in Railway — that is a deployment action, not a code
  change, and no real URL belongs in this repository.

## Open questions

- **Q1:** The proxy has no authentication at all, so restricting CORS reduces the exposure but
  does not remove it — a direct non-browser request still reaches `/api/llm/*` and spends API
  credits.
  - Checked: `server/index.js` has no auth middleware; `.env.example` has no shared-secret
    setting; the README's BFF API reference documents no auth header.
  - Impact if unresolved: the deployed proxy remains callable by anyone who knows its URL.
    Deliberately deferred to its own Story rather than widening this one; recorded here so it
    is not mistaken for an oversight.

## References

- `server/index.js:33` — `app.use(cors())`
- `server/index.js:39-42` — the Railway health-check comment establishing this is deployed
- `AGENTS.md` §3 Rule 4 — secrets are server-side only, through the proxy
- `README.md` — "BFF API reference", "Configuration"
