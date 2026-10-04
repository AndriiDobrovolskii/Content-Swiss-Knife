---
artifact: pr_summary
story: US-5.1
version: 1
status: ARCHIVED
owner: so-pr-preparer
created_at: 2026-10-04T13:00:00Z
updated_at: 2026-10-04T13:00:00Z
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

# Drafted Pull Request - US-5.1

> **Not opened.** This is drafted content only. `so-pr-creator` opens the Pull Request, and
> only on a separate explicit instruction. Approving `HUMAN_PR_APPROVAL` did not carry that
> approval (AGENTS.md section 10).

## Title

```
feat(US-5.1): substitute [file-name] markers with the matching uploaded image
```

## Body

```markdown
Closes US-5.1 - Replace [file-name.ext] markers in Original Description with the matching uploaded image at the same position in the final description.

## What changed

A new marker step turns `[file-name.jpg]` / `[file-name.webp]` tokens in the Original Description into the matching uploaded image figure at the same position in the generated description, on both the structured (Doc) path and the legacy HTML path. Markers with no matching upload are removed with one Ukrainian warning; non-file brackets (`[note]`, `[1]`) are left untouched. The Vision pre-pass now returns a native-Ukrainian label, description and alt per image, and the figure width is unified to `max-content` across the renderer, `wrapImageFigures` and the TipTap node.

## Why

Operators place `[file-name.ext]` markers in the Original Description to say where a picture belongs, but the generator ignored them, so images landed in the wrong place or not at all. Closing this keeps the operator's layout intent in the final description.

## Base branch and history (read before reviewing)

- The branch was cut from `docs/US-4.1-archive` (human decision HQ-1 = a), base `ef08509`.
- This PR therefore **also carries the US-4.1 archive commit `ef08509`** (delivery harness artifacts and archive of US-4.1) **and the PR #131 merge history** (`765b5a0`, merge of feat/US-4.1-add-sonnet-5-5-and-gemini-3-8-flash). The likely PR base target is `main`, with those US-4.1 commits included in the diff history.
- The US-5.1 implementation is the 13 commits `134cdcc..dd5f039`.
- Harness `docs/**` for US-5.1 (story, spec, plans, reviews, reports, workflow state) is intentionally **uncommitted** until the archive commit (HQ-2). It is not part of this diff.

## How the acceptance criteria were verified

| AC | Verified by | Result |
|---|---|---|
| AC-1 (file-name token detection) | `src/utils/image-placeholder.spec.ts` | pass |
| AC-2 (same-position substitution, hook/body/CTA) | `src/utils/image-placeholder-doc.spec.ts`, `src/render/render-description.hook-cta-extra.spec.ts`, `src/services/content-orchestrator.image-placeholder.spec.ts` | pass |
| AC-3 (section 4 image criteria) | `src/utils/image-figure-style.spec.ts` | pass |
| AC-4 (every content schema / store) | `src/services/content-orchestrator.image-placeholder.spec.ts`, `src/domain/description-doc.hook-cta-extra.spec.ts` | pass |
| AC-5 (unmatched marker removed + one warning) | `src/utils/image-placeholder-validate.spec.ts`, `src/utils/image-placeholder-html.spec.ts` | pass |
| AC-6 (non-file brackets untouched) | `src/utils/image-placeholder-html.spec.ts` | pass |
| AC-9 (a)-(o) (Spec-level: prompt delivery, caching, FROZEN footprint, figure style, Vision contract) | `src/prompts/task-a.spec.ts`, `src/prompts/task-a-doc.spec.ts`, `src/prompt-core/master-system-prompt.image-markers.spec.ts`, `src/utils/vision-contract.spec.ts`, `src/prompts/vision-prepass.spec.ts`, `test/openai-provider.spec.ts`, golden prompts | pass (f), (o) are diff/grep checks, see manual items |

Full matrix: `docs/tests/US-5.1-ac-test-matrix.md` (v6, 22 spec files)
Reconciliation (v3, Spec v9): every criterion cleared existence, naming and assertion checks; 633/633 tests in the 22 matrix files passed in a read-only re-run, no skip/todo/only.

## Test plan

Real commands, real results - carried from the quality gate report v3 (HEAD `dd5f039`).

- [x] `npm run lint` - clean (`tsc --noEmit`, exit 0)
- [x] `npm test` - 163 logic files / 4506 passed / 3 skipped; 2 component files / 32 passed
- [x] `npm run test:coverage` - statements 93.79%, branches 87.97%, functions 95.07%, lines 94.29%; global and per-directory floors held, no threshold changed
- [x] `npm run build` - clean (three known CommonJS warnings only)
- [x] `bash arch-guard.sh` - exit 0, ALL CHECKS PASSED; exactly two frozen checksum rows re-baselined in the same commit as the frozen edits
- [x] `npm run validate:harness` - 0 errors (22 stages, 23 artifacts, 16 skills)

### Manual verification still outstanding (not covered by tests)

- [ ] **Live re-run** of `expert3d_agibot_d1_ultra_2026-10-03_1217`: do the live model's outputs keep the `[file.jpg]` markers and honour the relocation rule? Tests prove only that the instruction is delivered. Backstop (tested): regeneration, then end-append with a Ukrainian warning.
- [ ] **Vision output quality**: native Ukrainian label, description and alt from the live Vision call; image-specific label, nothing generic.
- [ ] **Browser visual check** of an uploaded-image description (figure position and rendered width).

## Rules checked that nothing automates

- **Architecture Rule 2** (retrieval separate from generation): verified by reading the diff. `buildMarkerBlock` is pure string building from `description` and the manifest; the marker step runs after `llm.generateText` returns, makes no model call or fetch, and adds nothing to `RetrievalProvider` / `RetrievalService`.
- **AGENTS.md section 4 criteria in play**: figure style (`max-content`) comes from one shared constant used by the renderer, `wrapImageFigures` and the TipTap node; first figure eager, later lazy, `decoding="async"`, no figure inside `<p>`, `<figcaption>` with `<b>` label; no Product itemtype, meta or currency change.
- **Prompt caching**: the marker block goes only into `userContent`; cached `systemBlocks` are unchanged apart from the master prompt's static sentence.
- **FROZEN files** (AGENTS.md section 9): `src/prompts/task-a.ts` (one import, one new `buildMarkerBlock` function, one modified template line) and `src/prompt-core/master-system-prompt.ts` (3 static sentence lines, 2 example figure lines `fit-content` -> `max-content`), both only in commit `df52e88`. Human approvals recorded in `docs/workflow/history.jsonl`: section 9 override on 2026-10-03T09:25:44Z, H-8 on 2026-10-03T18:20:00Z, HUMAN_PLAN_APPROVAL on 2026-10-04T06:37:29Z. `.arch-guard-checksums` re-baselined (2 rows) in the same commit. `task-b.ts`, `task-c.ts`, `output-validator.ts` unchanged.

## Security

Review v3: no blocking and no non-blocking finding introduced by this Story. Two pre-existing observations: F-1 (brand/model folder free text is concatenated into `src` before attribute escaping; operator-supplied only, no injection) and F-2 (`escapeText` does not escape quotes; correct for text nodes only, do not reuse for attributes). Vision fields are escaped on both the HTML and Doc paths; no new `bypassSecurityTrust*`; no secret, log or response-shape change.

## Notes for the reviewer

- **AGENTS.md section 4 amended** (commit `17beda8`, human-approved via plan v6 OI-3/T12 and H-8): image figure width `fit-content` -> `max-content`.
- **`server/providers/openai.js`**: Vision `max_tokens` raised 300 -> 1000 (single line, human-approved OI-5, covered by `test/openai-provider.spec.ts`). It raises cost per Vision call only; it does not change what is recorded. A truncated reply fails parsing and the entry becomes `error`.
- **Accepted gap N-9**: a too-long sentence inside `hookExtra` is measured under path `hook`, but the targeted `doc-block-repair.ts` repair can only edit `doc.hook`, so it may fall to the regular ladder or ship as a residual length finding. Accepted by the human at HUMAN_PLAN_APPROVAL; `doc-block-repair.ts` is intentionally unedited.
- **Non-blocking nits**: two untouched legacy editor fixtures (`src/utils/__fixtures__/description_uk-UA.{original,corrected}.html`) still hold `fit-content`; the orchestrator passes literal `'uk-UA'` where a sibling call uses `UA_ISO`; `TOKEN_RE` in `image-placeholder-html.ts` has theoretical quadratic backtracking on pathological input (no security finding recorded).
- **No new setting**: `.env.example` is unchanged and needs no update.
- Goldens (`test/fixtures/golden/full-description-prompts.json`) and both corpus uk-UA fixtures changed only by the approved style/prompt swap.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01YMNAWkTuDb3vACUrRhYRo9
```

## Pre-flight record

| Check | Result |
|---|---|
| All four upstream reports opened, verdict `PASS` | yes: quality gate v3, verification v3, security v3, reconciliation v3 all PASS (APPROVED) |
| Quality gate has real output for all six commands | yes, all six with recorded output at HEAD dd5f039 |
| No unresolved blocking security finding | yes, none (2 pre-existing observations) |
| Every `AC-n` cleared all three reconciliation levels | yes (AC-9 (f), (o) are mechanical n/a at L2/L3, run as diff/grep checks) |
| Commits contain only what `task_breakdown` named | yes, 50 files all map to T1/T3-T12 plus fixtures; AGENTS.md and .arch-guard-checksums are named (T12, T11) |
| No fixup-run, no `--no-verify`, no phase batching | yes: 13 commits, one per task or spec, none mention `--no-verify` |
| Frozen-file change has same-commit re-baseline | yes, df52e88 |
| No secret in any commit, including removed ones | yes: secret-pattern scan of `git diff ef08509..HEAD` empty, no deleted files in range |
| `.env.example` current with placeholders | yes: no new setting, file untouched in range |
| Commit-hygiene flag | Harness `docs/**` uncommitted by design until the archive commit (HQ-2): flagged, not a failure |
| Other flag | Matrix v6 front-matter status is DRAFT while reports reference it; non-blocking |
