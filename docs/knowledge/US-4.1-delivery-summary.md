---
artifact: delivery_summary
story: US-4.1
version: 1
status: ARCHIVED
owner: so-orchestrator
created_at: 2026-10-01T13:59:42Z
updated_at: 2026-10-01T13:59:42Z
supersedes: null
---

# US-4.1 delivery summary — Sonnet 5.5 and Gemini 3.8 Flash as defaults, Sonnet 4.6 retired

## What was delivered
`claude-sonnet-5-5` and `gemini-3.8-flash` are selectable in the model catalog and are the defaults for the
Deep and Fast slots; `claude-sonnet-4-6` is removed from the catalog. Cost reporting is correct for both new
models, including the Gemini 3.8 Flash price step on 2027-01-01. Concretely: catalog entries with their own
level sets (Sonnet 5.5: five levels, no `max`; Gemini 3.8 Flash: low/medium/high, no `minimal`); pricing entries
(Gemini's by an exact-match branch with a date-based rate step); the Anthropic provider defaults to 5.5 and its
request shape sends no `temperature`/`top_p`/`top_k`/forced `tool_choice`; the Gemini fast fallback is `low`;
client defaults and the stored-settings restore migrate a stored `claude-sonnet-4-6` to 5.5 and clamp stale
levels; a stored `max` restores as `xhigh` and effort `max` is kept off the wire for models that lack it (spec v3
rework, T11–T13); README, `.env.example` and `AGENTS.md` name the new defaults.

Delivered by PR #131 (`feat/US-4.1-add-sonnet-5-5-and-gemini-3-8-flash`), merged into `main` at
2026-10-01T13:57:11Z as merge commit `765b5a0`; pushed tip `6664e89` (12 commits: T1–T9, T11–T13). Track: server.

## Acceptance criteria and how each was proven
Full matrix: `docs/tests/US-4.1-ac-test-matrix.md` (v2). Reconciliation (v2, PASS) confirmed AC-1..AC-10 for
matrix row, existing named test and a real assertion, against Specification v3. No criterion was reinterpreted.

| AC | Criterion | Proven by |
|---|---|---|
| AC-1 | Catalog contains `claude-sonnet-5-5` / `gemini-3.8-flash` with their level sets and ceilings | `model-catalog.spec.ts` FR-1/FR-2/FR-4, `llm-routes.spec.ts`, component slider specs |
| AC-2 | `claude-sonnet-4-6` gone from the catalog; other models unchanged | catalog FR-3, component and settings-service list assertions |
| AC-3 | Defaults: Deep anthropic/5.5/high, Fast gemini/3.8-flash/low | `model-settings.service.spec.ts` default snapshot; Gemini NFR-6; routes FR-5 |
| AC-4 | Provider fallbacks resolve to the new models; never `minimal` | `anthropic-provider.spec.ts`, `gemini-provider.spec.ts` |
| AC-5 | `getPrices('claude-sonnet-5-5')` exact rates | `pricing.spec.ts` |
| AC-6 | `getPrices('gemini-3.8-flash')` rates on both sides of 2027-01-01 | `pricing.spec.ts` (injected instant and system clock) |
| AC-7 | Stored `claude-sonnet-4-6` restores as 5.5; levels clamp | `model-settings.service.spec.ts`, `llm-routes.spec.ts` |
| AC-8 | 5.5 request carries no sampling params or forced tool use at any level | `anthropic-provider.spec.ts` at all five levels and the plain endpoint |
| AC-9 | README / `.env.example` (and AGENTS.md row) name 5.5; 4.6 absent | `active-docs-models.spec.ts` |
| AC-10 | Lint, both test runners, build, arch-guard green | quality gate v2 (no unit test by design) |

## Gate results (quality gate v2 at `6664e89`)
lint exit 0; `npm test` 150 logic files / 4054 passed / 3 skipped (live-probe cases needing a real proxy), plus
2 component files / 32 passed; coverage floors held; build clean; `arch-guard.sh` exit 0; `validate:harness`
not applicable. Implementation verification (v2), security review (v2, no blocking findings) and reconciliation
(v2) all PASS.

## Open Decisions
OD-1..OD-8 RESOLVED, including the Sonnet 5.5 level set and defaults (OD-1, OD-7) and the migration scope (OD-3).
OD-9 (Sonnet 5.5 request-shape assumptions) PARTIALLY RESOLVED; AC-8 became a guard test. Residuals R-1..R-4 were
non-blocking: R-1 settled by spec v3; **R-2** (beta header `extended-cache-ttl-2025-04-11` on 5.5 unverified) and
**R-3** (timeout exposure at `high` on 5.5, the "30%+ faster" claim) remain unverified against the live API;
**R-4** (Story does not mention `AGENTS.md` or the 5.5 `levels`) — Story not amended.

## FROZEN files
None changed. `.arch-guard-checksums` untouched.

## Known residuals
Security O1 (RETIRED_MODELS plain-object lookup, harmless) and O2 (unknown model ids degrade safely rather than
being rejected); two pre-existing observations. Reconciliation notes: FR-4 prose is stale about which models list
`max`; the AC-9 doc test scans only README, `.env.example` and `AGENTS.md`, so `claude-sonnet-4-6` remains in
historical comments, fixtures and the retained price entry; 3.7 and 3.8 Flash rates are identical, so protection
is the exact-match branch. Harness docs for this Story were still uncommitted when the PR merged.
