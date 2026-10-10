---
artifact: pr_summary
story: US-7.1
version: 1
status: DRAFT
owner: so-pr-preparer
created_at: 2026-10-09T23:00:00Z
updated_at: 2026-10-09T23:00:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 4
  - key: implementation_report
    version: 1
  - key: quality_gate_report
    version: 1
  - key: verification_report
    version: 1
  - key: security_review
    version: 1
  - key: reconciliation_report
    version: 1
open_decisions_blocking: false
---

# Drafted Pull Request — US-7.1

> **Not opened.** This is drafted content only. `so-pr-creator` opens the Pull Request, and
> only on a separate explicit instruction. Approving `HUMAN_PR_APPROVAL` did not carry that
> approval (AGENTS.md §10).

## Decisions for the human BEFORE opening (not resolved by this draft)

1. **Branch base.** The branch was created from `docs/US-6.2-archive`, not `main`. Merge base with
   `main` is `53608b7`; `main..HEAD` contains 18 commits: US-7.1 `ac03ac6..fb335d8` (17) plus
   **`120dcbc` "docs(US-6.2): archive the Story and record the delivery"** (unmerged; present on
   `origin/docs/US-6.2-archive`). Opened as-is, the PR would also carry that archive commit. Options:
   (a) merge the US-6.2 archive PR first, then retarget/rebase; (b) rebase US-7.1 onto `main`
   dropping `120dcbc`; (c) open the PR against `docs/US-6.2-archive` and retarget after it merges.
   This draft does not choose. Any history rewrite or retarget is the human's call.
2. **Uncommitted Story artifacts.** See "Commit state" below. They must be committed on this branch
   before the PR is opened, or the PR will not contain the Story's delivery record.

## Title

```
feat(prompts): preserve proper product names verbatim across Slugs, SEO, descriptions and translations
```

## Body

```markdown
Closes US-7.1 — Preserve proper product names.

## What changed

Brand and model names typed by the operator (for example "Formlabs Form Studio 1 Resin Tank Pro")
are now protected end to end. A classifier decides whether a typed name is a protected proper name
(per-store official brands, model tokens, number+unit precedence, 3D exemption). For protected
names the Slugs, Doc, Task C, Translator and Optimizer prompts carry a verbatim-preservation rule,
a dynamic `[PROTECTED PRODUCT NAME]` block is added to `userContent` only, the SEO Meta step has a
repair gate that rejects shortened names, and report-only validators flag altered names on Slugs and
description surfaces. Slugs get a protected trim that never drops name tokens.

## Why

Observed failure: es-ES/pt-PT outputs shortened the product to "Form Studio 1 Pro" and slugs ended
`...-form-studio-1-pro`, dropping "Resin" and "Tank". See the Story and the spec for the fixtures.

## Closed

Story US-7.1 (Epic 7). Plan tasks T1–T15, one commit per task.

## How the acceptance criteria were verified

| AC | Verified by | Result |
|---|---|---|
| AC-1 | `product-name-preservation.spec.ts`, `.stores.spec.ts`, `task-slug.spec.ts`, `content-orchestrator.protected-name-validation.spec.ts` | pass |
| AC-2 | `protected-seo-name.spec.ts`, `content-orchestrator.protected-name-repair-gate.spec.ts` | pass |
| AC-3 | `task-a-doc.spec.ts`, `task-c.spec.ts`, `protected-name-precedence.spec.ts`, validation spec | pass |
| AC-4 | `describe.each(STORE_REGISTRY)` in wiring, repair-gate, validation, stores specs | pass |
| AC-5 | `task-translate.spec.ts`, `optimizer.spec.ts`, wiring and validation specs | pass |
| AC-6 | repair-gate AC-6 guard, `content-orchestrator.repair-field-wiring.spec.ts`, unchanged existing validator specs | pass |
| AC-7 | `protected-product-name.spec.ts` | pass |
| AC-8 | repair-gate spec (premise test + repair attempt) | pass |
| AC-9 | rewritten `task-slug.spec.ts` worked-example checks | pass |

Full matrix: `docs/tests/US-7.1-ac-test-matrix.md`
Reconciliation: AC-1..AC-9 each cleared existence, naming and assertion checks
(`docs/reconciliation/US-7.1-reconciliation-report.md`, PASS).

## Test plan

Real commands, real results — carried from `docs/verification/US-7.1-quality-gate-report.md` (HEAD fb335d8).

- [x] `npm run lint` — clean (`tsc --noEmit`, exit 0)
- [x] `npm test` — test:logic 175 files / 5176 passed / 3 skipped (pre-existing live probes); test:components 2 files / 32 passed (run with `CI=1`)
- [x] `npm run test:coverage` — 94 / 87.73 / 95.57 / 94.57 (stmts/branch/funcs/lines); global, domain, render and prompt-core floors held; no threshold lowered
- [x] `npm run build` — clean (only known CommonJS warnings)
- [x] `bash arch-guard.sh` — exit 0; `task-c.ts` checksum re-baselined in the same commit as its edit
- [x] `npm run validate:harness` — 0 errors (22 stages, 23 artifacts, 16 skills)
- [ ] **Manual release evidence (NFR-7), not yet done:** run the live model on the real fixture
  "Formlabs Form Studio 1 Resin Tank Pro" for every store and confirm names, slugs, SEO meta, descriptions,
  translations and optimizer output keep the name verbatim. Unit tests cannot prove the live model follows
  the prompt.

## Rules checked that nothing automates

- **Architecture Rule 2** (retrieval separate from generation): verifier read the full orchestrator diff
  and every new module; new code is pure string/regex logic, no LLM/retrieval import, no search or fetch
  path added, `server/` and `src/app` untouched.
- **AGENTS.md §4 criteria**: every prompt hunk read; changes confined to product-name handling;
  `meta-description-currency` stays disarmed. Criteria needing real model output are covered by the manual item above.
- **STORE_REGISTRY** is the only locale/currency source; **prompt caching**: `systemBlocks` passed by
  reference, dynamic name only in `userContent`.
- **FROZEN files**: `src/prompts/task-c.ts` edited (commit a37826a, 14 lines) under the recorded per-file
  AGENTS.md §9 approval (F-1/T15, HUMAN_PLAN_APPROVAL 2026-10-09T13:32:21Z in `docs/workflow/history.jsonl`);
  `.arch-guard-checksums` re-baselined in the same commit. No other frozen file changed by US-7.1
  (`master-system-prompt.ts` differs from `main` only through the stacked US-6.2 commit a9ede90).

## Security

PASS, no blocking finding. Non-blocking, introduced by this change:
- F-1: the operator-typed name is interpolated into the `[PROTECTED PRODUCT NAME]` block without delimiter
  neutralisation (quotes, newlines, marker text). Same actor already controls the prompt; hardening NOT applied.
- F-2: repair feedback echoes a slice of model output (`form`) into the retry prompt; length cap NOT applied.
- F-3: no fetch/retrieval change (clear).
Pre-existing, unchanged: unrestricted `cors()` on the local proxy; `bypassSecurityTrustHtml` remains the single bypass.
No new setting, so `.env.example` is unchanged.

## Notes for the reviewer (accepted residuals)

- Slugs and description surfaces are **report-only**: violations surface as error-level findings, with an
  automatic repair attempt only on SEO Meta (AC-8). The Story wording ("fail") is stronger than this
  enforcement; Spec v4 and the operator accept it.
- FR-5 part 2 blind spots: a shortened form lacking the last token (for example "Formlabs Form Studio 1"),
  brand-only names, and surfaces outside the closed list are prompt-only.
- OD-7: Translator cannot tell brand from generic; its rule is deliberately generic. OD-6: for the
  Generator/UA Description H1 only part 2 applies.
- OD-11/OD-12/OD-13 were taken at their defaults.
- Optional cleanups left: misplaced docblock above `seoCoreNames()` in `content-orchestrator.service.ts`;
  prompt sentence in `withProtectedNameFeedback` could move to `protected-name-block.ts`.
- The AC-test matrix "State now / Green by" columns still show the pre-implementation snapshot (stale labels).
- Commit c41d339 fixes two test defects found after TEST_WRITING (tests only); not a fixup run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Commit state (verified against the real `git status` / `git log`)

Committed on the branch (via task commits and status commits): 17 US-7.1 commits `ac03ac6..fb335d8`
(T1–T15 as one `feat(US-7.1 Tn)` commit each, plus `c41d339`, `dcca9e5`, `fb335d8`), including
`docs/catalog/US-7.1-pipeline-status.md` and `docs/tests/US-7.1-test-generation-report.md`.

**NOT committed (working tree):**
- modified: `docs/catalog/stories.yaml`, `docs/workflow/active-story.yaml`, `docs/workflow/history.jsonl`, `docs/workflow/workflow-state.yaml`
- untracked: `docs/stories/US-7.1-*.md`, `docs/specifications/US-7.1-spec.md`, `docs/evidence/US-7.1-clarification-report.md`, `docs/decisions/US-7.1-open-decisions.md`, `docs/impact-analysis/US-7.1-impact-analysis.md`, `docs/plans/US-7.1-implementation-plan.md`, `docs/plans/US-7.1-task-breakdown.md`, `docs/reviews/{plans,security,specifications}/US-7.1-*`, `docs/tests/US-7.1-{ac-test-matrix,test-strategy}.md`, `docs/verification/US-7.1-{implementation,quality-gate,verification}-report.md`, `docs/reconciliation/US-7.1-reconciliation-report.md`

Recommendation: follow the US-6.2 precedent `8d059e1` ("docs(US-6.2): add the delivery harness
artifacts ...") — one docs-only commit on this branch containing all the Story artifacts above, the
catalog entry and the workflow state/history, plus this `docs/pr/US-7.1-pr-summary.md`, committed before
the PR is opened (human or `so-pr-creator` flow; this skill commits nothing). Per AGENTS.md §13 "every
logical change ends with a commit".

## Pre-flight record

| Check | Result |
|---|---|
| All four upstream reports opened, verdict `PASS` | Yes: quality gate PASS, verification PASS, security PASS, reconciliation PASS; implementation report PASS. All front matter APPROVED. |
| Quality gate has real output for all six commands | Yes (lint, test both runners, coverage, build, arch-guard, validate:harness). |
| Verifier addressed Rule 2 | Yes, section 1, review-only check. |
| No unresolved blocking security finding | Yes: F-1, F-2, F-3 non-blocking. |
| Every `AC-n` cleared all three reconciliation levels | Yes, AC-1..AC-9. |
| Commits contain only what `task_breakdown` named | Yes per verifier section 7 (36 non-doc files map to T1..T15). Exception: stacked `120dcbc` (US-6.2 archive) — see decision 1. |
| No fixup-run, no `--no-verify`, no phase batching | Yes: one commit per task; no "fix typo"/wip messages; `c41d339` corrects test defects; no hook skipping evident in log. |
| Frozen-file change has same-commit re-baseline | Yes, a37826a changes `task-c.ts` and `.arch-guard-checksums` together. |
| No secret in any commit, including removed ones | Pickaxe/grep over `main..HEAD` found no key-like string in source or any `.env`; one docs hit is prose, not a key. |
| `.env.example` current with placeholders | N/A: no setting added or renamed (diff of `.env.example` empty). |
| Story artifacts committed | **No** — see Commit state. |
