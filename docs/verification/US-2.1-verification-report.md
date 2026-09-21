---
artifact: verification_report
story: US-2.1
version: 3
status: ARCHIVED
owner: so-implementation-verifier
created_at: 2026-09-21T21:30:00Z
updated_at: 2026-09-23T14:00:00Z
supersedes: docs/verification/US-2.1-verification-report.md#2
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 2
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: implementation_report
    version: 3
  - key: quality_gate_report
    version: 3
open_decisions_blocking: false
---

# US-2.1 Implementation Verification (v3, HEAD 53a8f29)

Verdict: **PASS**. Re-verified against `git diff main...HEAD` (48 files, 36 branch commits at 53a8f29), not the reports.
The v2 report is superseded.

## 0. Delta since v2 (c8d91fa..53a8f29)

Two commits: `2ddecf7` (test-only) and `53a8f29` (docs only). The only non-docs file changed since v2 is
`src/domain/description-doc.schema.v4.spec.ts` (+88 lines, the V16 block for the v4 schema rejection branches).
No source, server, fixture or `.arch-guard-checksums` change. Added lines contain no `meta-description-currency`,
`fetch`, Serper, `googleSearch`, `process.env`, `console.`, SDK import or new locale/currency literal. Every v2
conclusion in sections 1-7 carries over unchanged and was re-confirmed against the current diff.

## 1. Architecture Rule 2 (review-only)

Read: the branch's non-spec source diff. No file under `server/`, no `RetrievalProvider`/`RetrievalService`
file and no provider file is in the diff. `content-orchestrator.service.ts` hunks are only (a) the
`selectHookPattern` import, (b) `hookPattern` appended to `userContent`, and (c) a locale argument to
`fixNumberFormatting`. `hook-pattern.ts` is a pure deterministic FNV-1a selector with no I/O. No `fetch`,
Serper, grounding or `googleSearch` token was added in any non-spec source line (grep of added lines).
Retrieval stays separate from generation; no Google Grounding reintroduced. Holds.

## 2. Section 4 HTML criteria (prompt, schema, renderer changed)

Checked in the renderer/prompt diff and fixtures (`test/fixtures/v4-docs.ts`, `test/render-conformance.v4.spec.ts`):
- No `itemtype` Product introduced; v4 prompt still says to strip it.
- Spec count: section 7 table rule unchanged ("row count = input row count exactly"); the killer-specs table (a
  separate table) became the merged section 2 `<ul>`; section 7 comma-join keeps values intact.
- Figures/video: `renderFigure`, `renderVideo`, `renderSpecs`, `figurePositions` and `<section>/<hr>` discipline are
  version-blind and untouched. Figure/video placement moved from section 2 to section 3-5 (prompt says a
  present embed is placed in section 3), consistent with the invariant that an input embed appears in output.
- meta rules: `output-validator.ts` is unchanged, so `meta-description-currency` stays disarmed; nothing in the
  diff arms it. `seo-number-format.ts` only passes `item.language` to `fixNumberFormatting`.
- HTML only, no `<br>` spacing added; `<hr>` per section unchanged.
- FR-16 behaviour change (review note): with a locale passed, group-1/2 locales (incl. uk-UA) now PRESERVE thousands
  grouping instead of stripping it. This was ruled by the human at 2026-09-22T15:00 (N9).

## 3. STORE_REGISTRY single source

No literal locale set, currency symbol or image base URL added outside `constants.ts` (grep of added lines).
`V4_SECTION_HEADINGS` (per-locale headings) lives in `src/prompt-core/constants.ts`, the sanctioned home; renderer
looks it up. Non-blocking: `content-orchestrator.service.ts` gains a literal `'uk-UA'` in
`fixNumberFormatting(html, input.name, 'uk-UA')`, mirroring the pre-existing literals on the adjacent
`wrapVideoFigures`/`fixDecimalSeparator` calls in the same UA-only path (not a new pattern, but one more literal).

## 4. Prompt-caching separation

`systemBlocks` untouched. The FR-14 hook pattern is appended to `userContent` only (`base.userContent` preserved
byte-for-byte), explicitly to avoid pinning a pattern in a cached block. `cache: true` marking unchanged. Holds.

## 5. FROZEN files (highest severity check)

Only `src/prompt-core/master-system-prompt.ts` changed (task-a/b/c and output-validator: zero diff). Three commits touched it;
each carries a recorded per-file grant and re-baselined `.arch-guard-checksums` in the SAME commit
(old->new hash chain verified per commit; HEAD hash `d58c8466...` equals the current file sha256, re-checked at 53a8f29; task-a/b/c and output-validator hashes match the baseline; no FROZEN-file commit since v2):
- 85ebaa3 (T12, NI-1..NI-5, tier-2 repairs, "Schema v4.0" label): HUMAN_PLAN_APPROVAL 2026-09-21T10:00 grant.
- 270caa7 (hook clause at :217, 5 added lines): 2026-09-22T11:00 grant.
- 43c8d49 ([STYLE & GEO], lines 146-148): 2026-09-22T15:00 grant.
Approved. Non-blocking: `.arch-guard-checksums` baseline tracks 5 frozen files; the 16 other changed src files are not frozen.

## 6. Angular/server conventions

No SDK import, NgModule, localStorage, `process.env` or console logging added in non-spec source. No server file,
usage-store schema, or secret path changed. Prompt text stays in `src/prompt-core`/`src/prompts`, not in services
(the orchestrator only selects and appends).

## 7. Scope discipline

All changed source maps to T1-T13 plus human-sanctioned extensions: `optimizer.ts` (HUMAN_PLAN_APPROVAL decision 1),
hook-pattern realignment, seven `fixNumberFormatting` call sites (11:00 decision 2), schema hook-start validation
(11:00 decision 3), and the two pre-existing spec files updated per N9 (15:00). No drive-by renames found.

## Findings

- Non-blocking: the working tree holds an unrelated staged US-1.1 CORS rollback (deleted `server/cors-policy.js`,
  `test/cors-policy.spec.ts`, US-1.1 docs; modified `server/index.js`, `.env.example`, `stories.yaml`). It is in no
  US-2.1 commit and is not part of this verdict; the 11:00 decision (4) sanctions proceeding with it present.
  It must be kept out of the US-2.1 PR commits (AGENTS.md 7.8).
- Non-blocking: extra literal `'uk-UA'` noted in section 3.

## Review-only checks (no command would catch these)

Rule 2 (section 1), FROZEN-approval-to-commit mapping (section 5), caching separation (section 4), and the STORE_REGISTRY
literal audit (section 3).
