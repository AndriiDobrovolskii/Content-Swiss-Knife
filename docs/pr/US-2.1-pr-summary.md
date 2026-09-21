---
artifact: pr_summary
story: US-2.1
version: 1
status: DRAFT
owner: so-pr-preparer
created_at: 2026-09-21T12:25:00Z
updated_at: 2026-09-21T12:25:00Z
supersedes: null
inputs_consumed:
  - key: implementation_report
    version: 3
  - key: quality_gate_report
    version: 3
  - key: verification_report
    version: 3
  - key: security_review
    version: 3
  - key: reconciliation_report
    version: 3
open_decisions_blocking: false
---

# Drafted Pull Request — US-2.1

> **Not opened.** This is drafted content only. `so-pr-creator` opens the Pull Request, and
> only on a separate explicit instruction. Approving `HUMAN_PR_APPROVAL` did not carry that
> approval (AGENTS.md §10).

## Title

```
feat(prompt): migrate product descriptions to the v4.0 UA content schema
```

## Body

```markdown
Closes US-2.1 — Migrate product descriptions to the v4.0 UA content schema.

## What changed

Descriptions can now be generated and rendered under `schemaVersion: "4.0"`: a merged
key-benefits section, an invariant-start hook (`<b>Name</b> — text`), an `<ol>` package
contents list, per-locale headings and CTA heading from code-resident tables, a
deterministic hook-pattern selector, and locale-aware thousands grouping in
`fixNumberFormatting`. Every v4 rule is gated behind `schemaVersion`, so cached 3.0
documents still parse and render as before.

## Why

The v4.0 UA content schema (Story US-2.1) changes the section layout, hook shape and
number-format rules; the prompt, Zod schema, renderer and number fixer had to agree on it.
Evidence: `docs/specifications/US-2.1-spec.md` (FR-1..FR-30) and the AC matrix below.

## How the acceptance criteria were verified

| AC | Verified by | Result |
|---|---|---|
| AC-1 hook invariant start | `src/domain/description-doc.schema.v4.spec.ts` (V16), `src/prompt-core/master-system-prompt.v4.spec.ts` | pass |
| AC-2 killerSpecs 3-4 | `src/domain/description-doc.schema.v4.spec.ts` (V16), `src/render/render-description.v4.spec.ts` | pass |
| AC-3 merged key-benefits list | `src/render/render-description.v4.spec.ts`, `test/render-conformance.v4.spec.ts` | pass |
| AC-4 applications 4-8 | `src/domain/description-doc.schema.v4.spec.ts` (V16), `test/render-conformance.v4.spec.ts` | pass |
| AC-5 package contents `<ol>` / locale headings | `src/prompt-core/v4-headings.spec.ts`, `src/render/render-description.v4.spec.ts` | pass |
| AC-6 specs comma-join, one H3 + table per category | `src/domain/description-doc.schema.v4.spec.ts`, `test/render-conformance.v4.spec.ts` | pass |
| AC-7 CTA heading per store-locale | `src/prompt-core/v4-headings.spec.ts`, `src/prompts/task-a-doc.v4.spec.ts` | pass |
| AC-8 no `<h1>`; FAQ shape | `src/render/render-description.v4.spec.ts`, `src/prompts/task-faq.v4.spec.ts` | pass |
| AC-9 hook-pattern selector | `src/prompt-core/hook-pattern.spec.ts`, `src/services/content-orchestrator.hook-pattern.spec.ts` | pass |
| AC-10 lazy images, per-locale number separators | `test/render-conformance.v4.spec.ts`, `src/utils/number-format-fixer.v4.spec.ts` | pass |
| AC-11 `4.0` accepted, cached 3.0 still parse | `src/domain/description-doc.schema.v4.spec.ts`, `src/render/doc-schema-issues.v4.spec.ts` | pass |

Full matrix: `docs/tests/US-2.1-ac-test-matrix.md` (v4)
Reconciliation: every criterion cleared existence, naming and assertion checks
(`docs/reconciliation/US-2.1-reconciliation-report.md` v3, PASS).

## Test plan

Real commands, real results — carried from the quality gate report (v3, HEAD 53a8f29).

- [x] `npm run lint` — clean (`tsc --noEmit`, 0 errors)
- [x] `npm test` — 122 logic files / 2828 passed / 3 skipped; 1 component file / 4 passed
- [x] `npm run test:coverage` — All files 91.97 stmts / 85.84 branches / 94.12 funcs / 92.57 lines; global and per-directory floors held, no threshold changed
- [x] `npm run build` — clean (3 known CommonJS warnings only)
- [x] `bash arch-guard.sh` — exit 0; only `master-system-prompt.ts` changed, re-baselined in the same commits
- [x] `npm run validate:harness` — 0 errors (`docs/workflow/` was modified in the working tree)

## Rules checked that nothing automates

- **Architecture Rule 2** (retrieval separate from generation): verifier read the non-spec
  diff; no `server/`, retrieval or provider file changed, no `fetch`/Serper/grounding token
  added, `hook-pattern.ts` is a pure deterministic selector. Holds.
- **AGENTS.md §4 criteria in play**: no `itemtype` Product; section 7 row-count rule and
  figure/video/`<hr>` handling untouched; `output-validator.ts` unchanged so
  `meta-description-currency` stays disarmed; no `<br>` spacing added.
- **FROZEN files**: `src/prompt-core/master-system-prompt.ts` changed in three commits
  (`85ebaa3`, `270caa7`, `43c8d49`), each under a recorded §9 per-file grant and each with
  `.arch-guard-checksums` re-baselined in the same commit. `task-a.ts`, `task-b.ts`,
  `task-c.ts`, `output-validator.ts` have zero diff.
- **Prompt caching**: `systemBlocks` untouched; the hook pattern is appended to
  `userContent` only.
- **STORE_REGISTRY**: no locale set, currency or image base URL added outside `constants.ts`.

## Security

PASS, no findings inside the US-2.1 diff. Nothing under `server/**`, `src/app/**`,
`.env.example` or `html-cleaner.ts` changed; no new secret, `bypassSecurityTrust*`, logging
or fetch surface. The new renderer paths escape model output as the 3.0 path did. No new
setting was added, so `.env.example` needs no entry.

## Notes for the reviewer

- **Behaviour change (human ruling N9, 2026-09-22):** with a locale passed, locales in
  FR-16 groups 1/2 (including uk-UA) now preserve thousands grouping instead of stripping it;
  two pre-existing specs were updated accordingly.
- **Scope extensions sanctioned by the human at plan approval:** `src/prompts/optimizer.ts`,
  schema-level hook-start validation, and passing the locale at seven `fixNumberFormatting`
  call sites. Non-blocking: one more literal `'uk-UA'` in `content-orchestrator.service.ts`,
  mirroring the adjacent UA-only calls.
- Prompt-only word ranges (hook 40-85, section 90-300 / 80-250 words) are asserted as
  prompt text, not validated in code, as the spec declares.
- **Not part of this PR:** the working tree holds an unrelated staged US-1.1 CORS rollback
  (deleted `server/cors-policy.js`, `test/cors-policy.spec.ts` and the US-1.1 docs; modified
  `server/index.js`, `.env.example`). It is in no US-2.1 commit and must stay out of it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Pre-flight record

| Check | Result |
|---|---|
| All four upstream reports opened, verdict `PASS` | yes: quality gate, verification, security review, reconciliation, all v3 PASS at 53a8f29 |
| Quality gate has real output for all six commands | yes |
| No unresolved blocking security finding | yes (only F1, outside the US-2.1 diff, non-blocking) |
| Every `AC-n` cleared all three reconciliation levels | yes, AC-1..AC-11 |
| Commits contain only what `task_breakdown` named | yes: 35 commits, `main...HEAD` has only src/test/docs/`.arch-guard-checksums` for US-2.1; none of the US-1.1 rollback paths |
| No fixup-run, no `--no-verify`, no phase batching | no wip/typo/fixup subjects; each `fix`/`feat` commit is a discrete change; `--no-verify` is not visible in history and was not asserted |
| Frozen-file change has same-commit re-baseline | yes, 3 of 3 |
| No secret in any commit, including removed ones | pattern scan of added lines found none |
| `.env.example` current with placeholders | n/a: no setting added, file unchanged on the branch |

Open item: the five gate/review artifacts (implementation report, quality gate report,
verification report, security review, reconciliation report) and this summary are untracked;
they must be committed (US-2.1 only) before the branch is pushed.
