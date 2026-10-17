---
artifact: pr_summary
story: US-8.1
version: 1
status: APPROVED
owner: so-pr-preparer
created_at: 2026-10-17T07:04:00Z
updated_at: 2026-10-17T07:04:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 3
  - key: specification
    version: 3
  - key: implementation_report
    version: 5
  - key: quality_gate_report
    version: 5
  - key: verification_report
    version: 5
  - key: security_review
    version: 4
  - key: reconciliation_report
    version: 3
open_decisions_blocking: false
---

# Drafted Pull Request — US-8.1

> **Not opened.** This is drafted content only. `so-pr-creator` opens the Pull Request, and
> only on a separate explicit instruction. Approving `HUMAN_PR_APPROVAL` did not carry that
> approval (AGENTS.md §10).

## Decisions and open items for the human BEFORE opening (not resolved by this draft)

1. **The manual AC-22 browser check is not recorded.** The HUMAN_PR_APPROVAL approver comment
   was empty (`history.jsonl`: "Approver comment: none. The AC-22 manual browser layout result
   was NOT recorded in this approval."). The check has no automated test by design (OD-15), so it
   is the one acceptance clause with no evidence in the pipeline. It is an unchecked item in the
   test plan below. The operator should run it and record who/when/result before or on opening.
2. **Branch base and stacking.** The branch is stacked on `docs/US-7.1-archive`
   (`27b01b8`), not on current `main` (`1b444e2`). Merge base with `main` is `120dcbc`;
   `main..HEAD` is 121 commits: 21 belong to US-7.1 (`ac03ac6..27b01b8`, its PR #138 and archive
   are not on `main`) and the rest are US-8.1. Opened against `main` as-is, the PR carries the
   US-7.1 work as well. Options: merge the US-7.1 PRs first and retarget; open against
   `docs/US-7.1-archive` and retarget after it merges; or rebase. History rewrite or retarget is
   the human's call; this draft does not choose.
3. **The branch is not pushed** (no upstream configured). `so-pr-creator` performs the push.
4. **Uncommitted bookkeeping and this file.** See "Commit hygiene" below.

## Title

```
feat(faq): generate one master FAQ in uk-UA, translate it per store language, use <b>, and add a standalone FAQ Generator
```

## Body

```markdown
Closes US-8.1 — Generate the FAQ once in uk-UA and translate it into the other store languages,
use `<b>` instead of `<strong>` in FAQ HTML, and add a standalone FAQ tool.

## What changed

The FAQ is now produced once in uk-UA (the master) and translated into every other language of
the selected store, so each store gets one FAQ in N languages instead of N different FAQs. FAQ
HTML uses `<b>` (the prompt lists `<b>`; any `<strong>` the model returns is converted). Every
stored FAQ passes a well-formedness / shape gate and a structural-parity check against the
master, with at most 3 attempts per language, and a language that still fails is skipped rather
than stored. A new **FAQ Generator** mode produces only the FAQ (no description, SEO or slugs),
and UA Description now also gets translated FAQs. A layout change to the FAQ Generator: no
"no content yet" placeholder, the Supplemental Content field sits directly under Product Name,
and its label reads "Supplemental Content (Required)" with `*` (Ukrainian: "Додатковий контент
(Обов'язково)"). Other modes are unchanged.

## Why

Observed: a 4-language store got 4 independently generated, mutually different FAQs; the model
used `<strong>` for the bold lead; the FAQ could only be produced as a by-product of a full run;
UA Description produced a uk-UA-only FAQ. The Story v3 layout requirements (AC-21..AC-26) came
from the operator's review at the first HUMAN_PR_APPROVAL.

## Closed

Story US-8.1 (Epic 8), Story v3 / Specification v3 (FR-1..FR-28, AC-1..AC-26). Plan tasks
T1..T17, one commit per task; four loop-back fixes recorded as separate commits.

## How the acceptance criteria were verified

All 26 criteria were reconciled at three levels (matrix row, named test exists, test body
genuinely asserts the criterion); 16 mutation probes were killed by the specs.

| AC | Verified by (spec files) | Result |
|---|---|---|
| AC-1, AC-2 | `content-orchestrator.faq-pipeline.spec.ts`, `.simplified.spec.ts`, `.faq-standalone.spec.ts` | pass |
| AC-3 | pipeline, `faq-gate.spec.ts`, `structural-parity.faq.spec.ts` | pass |
| AC-4 | pipeline, simplified, `tab-descriptors.spec.ts` | pass |
| AC-5 | pipeline, simplified | pass |
| AC-6 | `task-faq.spec.ts` | pass |
| AC-7, AC-8 | pipeline, standalone, `faq-html.spec.ts` | pass |
| AC-9 | pipeline, standalone, faq-gate, faq-html (incl. fail-closed cases) | pass |
| AC-10 | standalone, `app.component.template-wiring.spec.ts` | pass (source-text pins) |
| AC-11, AC-12 | standalone, `faq-form.spec.ts`, template-wiring | pass |
| AC-13 | standalone, tab-descriptors, template-wiring | pass |
| AC-14, AC-15 | pipeline, standalone | pass |
| AC-16, AC-17 | pipeline, standalone, faq-gate | pass |
| AC-18 | `task-c.description-bytes.spec.ts` (96-case SHA-256 golden), `task-c.faq.spec.ts` | pass |
| AC-19 | `task-c.faq.spec.ts`, structural-parity.faq, pipeline + standalone "AC-19 integration" | pass |
| AC-20 | no unit test by design; `bash arch-guard.sh` exit 0, two same-commit re-baselines | pass |
| AC-21 | `app.component.faq-layout.spec.ts` (evaluated empty-state condition), standalone | pass |
| AC-22 | faq-layout spec (structural clauses only) | pass for structure; **geometric clause NOT verified, see below** |
| AC-23 | faq-layout spec (field order) | pass |
| AC-24 | faq-layout spec (label key, en/uk values, `[required]`, `*` marker) | pass (source-text pins, not rendered DOM) |
| AC-25 | `faq-form.spec.ts`, template-wiring (existing, unmodified) | pass |
| AC-26 | faq-layout spec (48-state oracle for four other modes, generatorForm pins) | pass |

Full matrix: `docs/tests/US-8.1-ac-test-matrix.md`
Reconciliation: `docs/reconciliation/US-8.1-reconciliation-report.md` (v3, PASS).

**AC-22 geometric clause, no automated test (OD-15).** "The FAQ result panel's top edge sits one
container padding (`p-8`, 32 px) below the tab bar and is not vertically centred" is checked
structurally only (no element between the tab bar and the result, no flex/grid/centring tokens on
the scroll container). The visual outcome is a manual browser check by the operator. **Its result
is not yet recorded** (the approval comment was empty); see the test plan.

## Test plan

Real commands, real results, carried from `docs/verification/US-8.1-quality-gate-report.md` (v5,
HEAD ac62fe4).

- [x] `npm run lint` — clean (`tsc --noEmit`, exit 0)
- [x] `npm test` — test:logic 185 files / 6380 passed / 3 skipped (live-probe tests, skipped by design); test:components 2 files / 32 passed
- [x] `npm run test:coverage` — 94.13 stmts / 87.95 branches / 95.62 funcs / 94.69 lines; global (80/75/80/80) and domain, render, prompt-core per-directory floors held; no threshold changed
- [x] `npm run build` — clean (only the 3 known CommonJS warnings: file-saver, js-beautify, jszip)
- [x] `bash arch-guard.sh` — exit 0; all five frozen checksums match the baseline
- [x] `npm run validate:harness` — 0 errors (22 stages, 23 artifacts, 16 skills)
- [ ] **Manual browser check of the FAQ Generator (operator, NOT yet done).** Open the FAQ Generator, run a generation, and confirm: (a) the FAQ result panel top edge is `p-8` / 32 px below the version tab bar and the panel is not vertically centred (AC-22 geometric clause); (b) no "no content yet" placeholder appears before, during or after a run (AC-21); (c) field order is Store, Product Name, Supplemental Content, Original Description, Tech Specs, Extended Thinking (AC-23); (d) the label reads "Supplemental Content (Required) *" and the Ukrainian UI reads "Додатковий контент (Обов'язково) *" (AC-24); (e) the Generator, UA Description, SEO and Slug tabs look and behave as before (AC-26). Record who/when/result here.

No live model call was made by any gate; every model call in the suites is stubbed.

## Rules checked that nothing automates

- **Architecture Rule 2** (retrieval separate from generation): the verifier read the FAQ pipeline,
  gate, form and prompt paths and the layout delta. The standalone FAQ path takes only
  operator-supplied Supplemental Content, Description and Specs; no search, fetch or grounding
  call was added, and `server/` and `retrieval.service.ts` have no diff. HOLDS.
- **AGENTS.md §4 criteria**: the layout delta changes no prompt, schema, renderer or validator;
  `output-validator.ts` has no diff, so `meta-description-currency` stays disarmed; the
  description-path prompts are pinned byte-for-byte by the AC-18 golden.
- **STORE_REGISTRY** remains the only source of languages and currency; **prompt caching**: the
  FAQ Task C variant keeps its two cached system blocks, per-product data stays in `userContent`.
- **FROZEN files**: only `src/prompts/task-c.ts` changed (additive FAQ translation variant).
  Two commits, each with the `.arch-guard-checksums` re-baseline in the same commit, each under a
  recorded AGENTS.md §9 operator grant: `da59195` (T1) and `8c89bce` (language-name fix).
  `task-a.ts`, `task-b.ts`, `master-system-prompt.ts` and `output-validator.ts` are untouched.

## Security

PASS (`docs/reviews/security/US-8.1-security-review.md`, v4), no unresolved blocking finding.

- B-1 (blocking, introduced): the FAQ shape gate could be bypassed by markup its tag pass could
  not see. RESOLVED in `1ac82e1` (fail-closed), with regression tests; the gate source is
  unchanged since.
- N-1 (non-blocking, introduced): a poisoned master FAQ fans out to the translation calls;
  wording-level risk, the markup half is gated fail-closed.
- N-2 (non-blocking, widening of an accepted pattern): pasted Supplemental/Description/Specs
  are interpolated into the prompt without a fence or length cap (second entry point); the FROZEN
  prompt files are not to be touched for it.
- N-3 (non-blocking, low, introduced by the B-1 fix): `PERMITTED_TAG` uses `\s`, so a
  Unicode-space-padded tag such as `<b >` is accepted and an `<h3 >` question renders empty. No
  attribute or executable context is reachable; functional gap only.
- Pre-existing, unchanged: open `cors()` on the local proxy (O-1); `localStorage` history
  re-hydration without re-running the gate (O-2); the single `bypassSecurityTrustHtml` (O-3).
- O-4 (accepted): the FROZEN `task-c.ts` re-baseline, with approval recorded.

No new setting was added; `.env.example` is unchanged.

## Notes for the reviewer (non-blocking, open human points)

- **OD-13:** the Ukrainian label "Додатковий контент (Обов'язково)" is a labelled default, not a
  confirmed wording. One literal and one pin change if another wording is chosen.
- **OD-12 / OD-16:** the validation/repair panels stay above the result, so a run with a skipped
  language shows a panel (AC-22 then holds only vacuously for that run). With the placeholder
  removed (AC-21), a run that stores no FAQ shows a blank central area; there is no longer a
  "nothing produced" cue. Both are accepted defaults.
- **OD-17:** the Generate-guard alert still lists "Original Description" as mandatory in FAQ
  Generator, although the field is optional. Unchanged by design; now more visibly inconsistent.
- AC-10, AC-21..AC-24 and AC-26 are source-text / evaluated-condition pins, not rendered DOM (the
  repository has no AppComponent DOM spec); the manual check above covers the rendered result.
- `tools/feedback-form/create-form.gs` gained one dropdown entry ("FAQ Generator", T9). It is
  outside the Story's original surface (flagged in the plan); it is an Apps Script the operator
  deploys separately, and it has no test.
- Unit-spacing in English FAQ translations uses NBSP; `c62e30a` corrected six test assertions for
  it (a test defect, not a behaviour change).
- The AC-test matrix "State now" column still shows RED for T14..T17 (stale label; all green).
- Test-only literals `'en-GB'` / `'de-DE'` in `app.component.faq-layout.spec.ts` are stub inputs,
  not a language list.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Pre-flight record

| Check | Result |
|---|---|
| All four upstream reports opened, verdict `PASS` | Yes. quality gate v5 PASS, verification v5 PASS, security review v4 PASS, reconciliation v3 PASS (plus implementation report v5, gate PASS). All five are v-current, front matter `APPROVED`. |
| Quality gate has real output for all six commands | Yes. lint, test (both runners), coverage, build, arch-guard, validate:harness each with pasted output and exit 0. |
| Architecture Rule 2 addressed by the verifier | Yes (verification report v5, Check 1: HOLDS, by reading the diff and the unchanged FAQ paths). |
| No unresolved blocking security finding | Yes. B-1 resolved in `1ac82e1`; N-1..N-3 non-blocking. |
| Every `AC-n` cleared all three reconciliation levels | AC-1..AC-26 yes. Stated exception: the AC-22 geometric clause, assigned to a manual operator check by design (OD-15); no evidence recorded yet. |
| Commits contain only what `task_breakdown` named | Yes, with one flagged item: `tools/feedback-form/create-form.gs` (T9, called out in the plan as scope growth). No unrelated file, no drive-by refactor found in `27b01b8..HEAD` non-docs files. |
| No fixup-run, no `--no-verify`, no phase batching | No fixup-run: the corrective commits (`c62e30a`, `d33292c`, `8c89bce`, `1ac82e1`) each fix a recorded finding. One Story's work only. `--no-verify`: no commit message mentions it; a skipped hook cannot be proven absent from history alone. |
| Frozen-file change has same-commit re-baseline | Yes: `da59195` and `8c89bce` each carry `task-c.ts` and `.arch-guard-checksums`. |
| No secret in any commit, including removed ones | No hit from a pattern scan of the added and removed lines of all non-docs, non-spec changes across `27b01b8..HEAD` (`git log -p`); no `.env` file in any commit. Docs and spec files were not pattern-scanned. |
| `.env.example` current with placeholders | Yes: no setting added or renamed; `.env.example` has no diff. README changed (7 lines) to document the feature. |

## Commit hygiene

- `27b01b8..HEAD`: 100 commits. 24 are code or test commits (task commits, test-first commits and recorded
  loop-back fixes; the T13 README commit is a `docs(...)` commit and is counted with the 76) interleaved with 76
  `docs(US-8.1): ...` pipeline-bookkeeping commits. The bookkeeping commits are the harness's own workflow record, the same pattern as
  earlier Stories, and are noise rather than a rule violation.
- Working tree at preparation time is NOT clean, by the orchestrator's own transition
  bookkeeping, and nothing was committed by this stage: modified and uncommitted are
  `docs/workflow/workflow-state.yaml` (`current_stage: PR_PREPARATION`),
  `docs/workflow/history.jsonl` (+5 lines, ending with the HUMAN_PR_APPROVAL approval) and the
  front-matter `status` of the five approved artifacts (implementation report, quality gate
  report, verification report, security review, reconciliation report). This file
  (`docs/pr/US-8.1-pr-summary.md`) is also new and uncommitted. All of these must be committed on
  the branch before the PR is opened, or the PR will not contain the Story's delivery record.
- `git diff` reports LF to CRLF warnings on the modified docs; line-ending churn could inflate
  those files' diffs. Not a content issue.
