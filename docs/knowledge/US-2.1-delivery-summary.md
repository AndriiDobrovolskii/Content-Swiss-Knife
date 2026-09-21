---
artifact: delivery_summary
story: US-2.1
version: 1
status: ARCHIVED
owner: so-orchestrator
created_at: 2026-09-21T12:40:54Z
updated_at: 2026-09-21T12:40:54Z
supersedes: null
---

# US-2.1 delivery summary — Migrate product descriptions to the v4.0 UA content schema

## What was delivered
Descriptions are generated and rendered under `schemaVersion: "4.0"`: merged key-benefits
section, invariant-start hook (`<b>Name</b> — text`), `<ol>` package contents, per-locale
headings and CTA heading from code-resident tables, a deterministic hook-pattern selector, and
locale-aware thousands grouping in `fixNumberFormatting`. Every v4 rule is gated behind
`schemaVersion`, so cached 3.0 documents still parse and render as before.

Delivered by PR #125 (`feat/US-2.1-migrate-descriptions-to-v4-schemas`), merged into `main` at
2026-09-21T12:36:49Z as merge commit `544c896`; pushed tip `5229e28` (36 commits before the docs
commits, 54 files). Track: prompt.

## Acceptance criteria and how each was proven
Full matrix: `docs/tests/US-2.1-ac-test-matrix.md` (v4). Reconciliation (v3, PASS) cleared every
criterion for existence, naming and assertion.

| AC | Criterion | Proven by |
|---|---|---|
| AC-1 | Hook invariant start | `description-doc.schema.v4.spec.ts` (V16), `master-system-prompt.v4.spec.ts` |
| AC-2 | killerSpecs 3-4 | `description-doc.schema.v4.spec.ts` (V16), `render-description.v4.spec.ts` |
| AC-3 | Merged key-benefits list | `render-description.v4.spec.ts`, `render-conformance.v4.spec.ts` |
| AC-4 | Applications 4-8 | `description-doc.schema.v4.spec.ts` (V16), `render-conformance.v4.spec.ts` |
| AC-5 | Package contents `<ol>`, locale headings | `v4-headings.spec.ts`, `render-description.v4.spec.ts` |
| AC-6 | Specs comma-join, one H3 + table per category | `description-doc.schema.v4.spec.ts`, `render-conformance.v4.spec.ts` |
| AC-7 | CTA heading per store-locale | `v4-headings.spec.ts`, `task-a-doc.v4.spec.ts` |
| AC-8 | No `<h1>`; FAQ shape | `render-description.v4.spec.ts`, `task-faq.v4.spec.ts` |
| AC-9 | Hook-pattern selector | `hook-pattern.spec.ts`, `content-orchestrator.hook-pattern.spec.ts` |
| AC-10 | Lazy images, per-locale number separators | `render-conformance.v4.spec.ts`, `number-format-fixer.v4.spec.ts` |
| AC-11 | `4.0` accepted, cached 3.0 still parse | `description-doc.schema.v4.spec.ts`, `doc-schema-issues.v4.spec.ts` |

## Gate results (quality gate v3, HEAD 53a8f29)
lint 0 errors; `npm test` 122 logic files / 2828 passed / 3 skipped and 1 component file /
4 passed; coverage 91.97 / 85.84 / 94.12 / 92.57 with floors held; build clean (3 known CommonJS
warnings); `arch-guard.sh` exit 0; `validate:harness` 0 errors. Implementation verification,
security review and reconciliation all PASS (v3). Security: no findings inside the US-2.1 diff.

## Open Decisions
OD-1..OD-11 were all settled by the human on 2026-09-19 and none blocked SPECIFICATION
(`docs/decisions/US-2.1-open-decisions.md` v2). Notable: dual 3.0/4.0 support at the rendering
layer (OD-2); frozen-file edits required per-file AGENTS.md §9 approval (OD-8); number-format
rules for ambiguous locales (OD-11). Later human rulings: N9 (2026-09-22, FR-16 thousands
grouping preserved for groups 1/2 including uk-UA) and the plan-approval scope extensions
(`optimizer.ts`, schema-level hook-start validation, locale passed at seven
`fixNumberFormatting` call sites). No decision was deferred.

## FROZEN files
Only `src/prompt-core/master-system-prompt.ts` changed, in `85ebaa3`, `270caa7`, `43c8d49`,
each under a recorded §9 grant with a same-commit `.arch-guard-checksums` re-baseline.

## Not part of this delivery
The US-1.1 CORS rollback that was in the working tree (bare `cors()`, `ALLOWED_ORIGINS` removed
from `.env.example`) was excluded from the PR and is held in `stash@{0}` ("US-1.1 CORS
rollback"). It needs its own decision and story; nothing in US-2.1 depends on it.
