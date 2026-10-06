---
artifact: implementation_report
story: US-6.1
version: 1
status: APPROVED
owner: so-gate-enforcer
stage: QUALITY_GATE
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T00:00:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 4
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: ac_test_matrix
    version: 2
  - key: pipeline_status
    version: 2
---

# Implementation Report - US-6.1

Aggregated from pipeline_status v2, `git diff --stat main...HEAD` and the gate run in `docs/verification/US-6.1-quality-gate-report.md`.

## Built per task
- T1 (58d8335): `src/app/components/html-editor/editor-html-pipeline.ts` with `filterEmbedIframes`, `sanitizeEditorHtml`, `finalizeCopyHtml`.
- T2 (770c61a): `html-editor.component.ts` `load()` now calls `sanitizeEditorHtml`; `buildCopyHtml()` returns `finalizeCopyHtml(raw)`; unused imports removed.
- T3 (df268b8): new `extensions/embed-iframe-node.ts`, registered in `extensions/index.ts`; `extensions/generic-block-node.ts` `renderHTML` writes attributes verbatim via `setAttribute` (style preserved verbatim).

## Files changed (main...HEAD, code and tests)
- src/app/components/html-editor/editor-html-pipeline.ts (new)
- src/app/components/html-editor/editor-html-pipeline.spec.ts (new, 351 lines)
- src/app/components/html-editor/extensions/embed-iframe-node.ts (new)
- src/app/components/html-editor/extensions/generic-block-node.ts
- src/app/components/html-editor/extensions/index.ts
- src/app/components/html-editor/extensions/round-trip.spec.ts
- src/app/components/html-editor/html-editor.component.ts
- docs/catalog/US-6.1-pipeline-status.md

No FROZEN file, vitest.config.ts or `.arch-guard-checksums` changed.

## AC to test coverage
Per `docs/tests/US-6.1-ac-test-matrix.md` (v2): the AC rows map to `editor-html-pipeline.spec.ts` and `round-trip.spec.ts` (plus the existing html-cleaner, structural-parity and table-thead specs). All of these run green in the gate (see counts below). AC-to-test substance is verified by so-reconciliation-reviewer, not here.

## Gate outcome
lint PASS; npm test PASS (164 files, 4569 passed | 3 skipped; components 2 files, 32 tests); coverage PASS (93.79/87.97/95.07/94.29, per-directory floors held); build PASS; arch-guard PASS; validate:harness PASS.

## Open items
- Manual Copy HTML QA for the T2 call-site swaps (plan decision D9): PENDING, not performed. Steps: paste an off-list iframe, Load, Copy HTML, confirm no structure warning and the iframe is absent; paste an allowed div-wrapped iframe and confirm it survives.
- arch-guard Rule 2 and AGENTS.md §6.6 runtime rules unchecked here; owned by so-implementation-verifier.
