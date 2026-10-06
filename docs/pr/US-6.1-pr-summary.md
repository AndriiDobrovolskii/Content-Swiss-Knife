---
artifact: pr_summary
story: US-6.1
version: 1
status: DRAFT
owner: so-pr-preparer
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T00:00:00Z
supersedes: null
inputs_consumed:
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

# Drafted Pull Request — US-6.1

> **Not opened.** This is drafted content only. `so-pr-creator` opens the Pull Request, and
> only on a separate explicit instruction. Approving `HUMAN_PR_APPROVAL` did not carry that
> approval (AGENTS.md §10).

## Title

```
fix(html-editor): preserve div-wrapped YouTube/Vimeo iframes through the editor and Copy HTML
```

## Body

```markdown
Closes US-6.1 — Preserve a pasted YouTube/Vimeo iframe and its wrapper divs in the HTML editor so Copy HTML no longer fails with "Structure changed".

## What changed

A bare `<iframe>` wrapped in plain divs (the pasted YouTube/Vimeo embed form) now survives the HTML editor: a new `embedIframe` node keeps the iframe and its attributes, and `genericBlock` returns a wrapper `style` verbatim instead of re-serialising it. A hostname/protocol allow-list filter (strict `URL` parsing, YouTube and Vimeo hosts, `http:`/`https:` only) is composed with the existing sanitizer at the load gate and the Copy HTML gate, so an off-list or malformed iframe is removed before the structural-parity baseline is taken and Copy HTML no longer raises "Structure changed since load: <iframe> src list diverges".

## Why

Pasting a description containing `<div style=…><div style=…><iframe src="https://www.youtube.com/embed/…"></iframe></div></div>` dropped the iframe, collapsed the inner div to `<p></p>`, and blocked Copy HTML with the iframe src-list divergence message. The same iframe inside a `<figure>` already round-tripped (`video-embed-figure-node.ts`); only the div-wrapped form was lost. Story: `docs/stories/US-6.1-html-editor-preserve-iframe-embed.md`.

## How the acceptance criteria were verified

| AC | Verified by | Result |
|---|---|---|
| AC-1 | `round-trip.spec.ts` › `div-wrapped YouTube iframe - attributes and wrappers survive` (N = 1/2/3 wrappers) | pass |
| AC-2 | same describe, plus `genericBlock - wrapper style is returned verbatim` | pass |
| AC-3 | `editor-html-pipeline.spec.ts` › `T3 Copy HTML structure check with an allowed div-wrapped iframe` | pass |
| AC-4 | `round-trip.spec.ts` › `two div-wrapped iframes keep their order` | pass |
| AC-5 | `round-trip.spec.ts` › `editing elsewhere leaves a div-wrapped iframe untouched` | pass |
| AC-6 | `round-trip.spec.ts` › `videoEmbedFigure - attribute fidelity` (unmodified); `editor-html-pipeline.spec.ts` › figure-wrapped iframes untouched | pass |
| AC-7 | `editor-html-pipeline.spec.ts` › `filterEmbedIframes` hostname, protocol and empty/unparsable describes; `sanitizeEditorHtml` / `finalizeCopyHtml` composition | pass |
| AC-8 | `round-trip.spec.ts` › `text beside a div-wrapped iframe` (two tests) | pass |
| AC-9 | `editor-html-pipeline.spec.ts` › `T2 structural-parity baseline after load-time sanitization`; `T3 a kept iframe that is changed or lost still triggers the warning` | pass |

Full matrix: `docs/tests/US-6.1-ac-test-matrix.md`
Reconciliation: every criterion cleared existence, naming and assertion checks (`docs/reconciliation/US-6.1-reconciliation-report.md`).

Limits of that proof (reconciliation G-2, G-3): AC-4, AC-5 and AC-8 are proven on schema-level fixtures (ProseMirror parser/serializer, EditorState transactions), not on a mounted TipTap editor; AC-3 and AC-9 are proven at function level, not through the component. The two `html-editor.component.ts` call-site swaps (`load()`, `buildCopyHtml()`) have no automated component test.

## Test plan

Real commands, real results — carried from the quality gate report (HEAD df268b8).

- [x] `npm run lint` — clean (`tsc --noEmit`, exit 0)
- [x] `npm test` — 164 logic files / 4569 passed / 3 skipped (pre-existing LIVE_DOC_TEST probe); 2 component files / 32 passed
- [x] `npm run test:coverage` — global (statements 93.79%, branches 87.97%, functions 95.07%, lines 94.29%) and per-directory floors held; no threshold changed
- [x] `npm run build` — clean (only the three known CommonJS warnings)
- [x] `bash arch-guard.sh` — exit 0, five frozen checksums unchanged
- [x] `npm run validate:harness` — 0 errors (run because `docs/workflow/*` state files were modified)
- [x] Manual Copy HTML QA for the T2 call-site swaps (plan D9) — performed by the approver, who reports it works. This is the approver's statement recorded at HUMAN_PR_APPROVAL; it was not independently verified by the pipeline.

## Rules checked that nothing automates

- **Architecture Rule 2** (retrieval separate from generation): holds, not in play. The diff touches only `src/app/components/html-editor/`; no `server/`, retrieval, provider or prompt code, and no fetch or LLM call was added.
- **AGENTS.md §4 criteria in play**: none; no prompt or renderer change.
- **FROZEN files**: none changed; `.arch-guard-checksums` untouched.

## Security

Verdict PASS, no blocking findings (`docs/reviews/security/US-6.1-security-review.md`).

- **NB-1 (non-blocking, introduced by this change):** a kept iframe (allow-listed `src`) may still carry `srcdoc` and no `sandbox` on the Source -> Copy path. Follow-up outside the ACs.
- **NB-2 (non-blocking, pre-existing path, widened by one node):** Source -> WYSIWYG toggle-back sets content from the raw, unsanitized source; one more node now honours `src`. Follow-up outside the ACs.
- **Observations (pre-existing):** `figure > iframe` stays unfiltered by decision (Story Q1 / OD-6); `http:` is allowed; subdomain breadth of the allow-list.

## Notes for the reviewer

- `generic-block-node.ts` `renderHTML` now applies to every `genericBlock`; regression coverage relies on the existing round-trip and parity specs (verification N2).
- The A-9 hostname edge cases (port, case, whitespace, trailing dot, `youtube-nocookie.com`) are deliberately untested, by documented decision.
- Branch contains exactly the implementation commits `58d8335` (T1), `770c61a` (T2), `df268b8` (T3) and the pipeline-status commit `5b5c422`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Pre-flight record

| Check | Result |
|---|---|
| All four upstream reports opened, verdict `PASS` | Yes. Quality gate PASS, verification PASS, security review PASS (2 non-blocking), reconciliation PASS (gaps G-1..G-3, not AC failures). All four front matter `status: APPROVED`. |
| Quality gate has real output for all six commands | Yes, all six with real output at df268b8. |
| No unresolved blocking security finding | Yes. Blocking: none. NB-1 and NB-2 are non-blocking follow-ups. |
| Every `AC-n` cleared all three reconciliation levels | Yes, AC-1..AC-9. |
| Commits contain only what `task_breakdown` named | Yes. `git diff --name-only main..HEAD` lists 8 files: 7 under `src/app/components/html-editor/` plus `docs/catalog/US-6.1-pipeline-status.md` (builder-owned pipeline_status). Verifier confirmed all named in T1-T3. |
| No fixup-run, no `--no-verify`, no phase batching | Four commits, one per task plus a status commit; no fixup run; one Story. No evidence of `--no-verify` in the history available to this stage. |
| Frozen-file change has same-commit re-baseline | N/A: no FROZEN file changed. |
| No secret in any commit, including removed ones | No `sk-ant` string was added in any branch commit (pickaxe over `main..HEAD`). |
| `.env.example` current with placeholders | Yes: no setting added or renamed; `.env.example` absent from the branch diff. |

## Commit hygiene blockers before a PR is opened (AGENTS.md §7.8, §13)

The branch currently carries only the three implementation commits and the pipeline-status commit. The pipeline documents that the PR body cites are **uncommitted** in the working tree, so a PR opened now would link to files that do not exist on the branch:

- Must be committed on the branch first (as Story-scoped docs commit(s), ending with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`): `docs/stories/US-6.1-html-editor-preserve-iframe-embed.md`, `docs/specifications/US-6.1-spec.md`, `docs/plans/US-6.1-*`, `docs/reviews/**/US-6.1-*`, `docs/tests/US-6.1-*`, `docs/verification/US-6.1-*`, `docs/reconciliation/US-6.1-reconciliation-report.md`, `docs/decisions/US-6.1-open-decisions.md`, `docs/evidence/US-6.1-clarification-report.md`, `docs/impact-analysis/US-6.1-impact-analysis.md`, this `docs/pr/US-6.1-pr-summary.md`, the modified `docs/workflow/{active-story.yaml,history.jsonl,workflow-state.yaml}` and the US-6.1 entry in `docs/catalog/stories.yaml`.
- **Must NOT ride along:** `docs/stories/US-6.2-preserve-b-and-strong-tags.md` is a different Story (§7.8: no unrelated files, no phase batching). Leave it untracked, or commit it on its own branch. Check that `docs/catalog/stories.yaml` does not also carry a US-6.2 registration into this PR; if it does, stage only the US-6.1 hunk.
- `docs/workflow/workflow-state.yaml` and `history.jsonl` are written by the orchestrator, so commit them after the orchestrator records this stage.

Nothing was committed, pushed, opened or merged by this stage.

## Next step

Hand this title and body to the user. `so-pr-creator` may open the Pull Request only when the user explicitly asks for it, after the commits above exist on the branch. Approving `HUMAN_PR_APPROVAL` did not carry that approval.
