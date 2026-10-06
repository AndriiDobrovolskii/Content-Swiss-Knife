---
artifact: pipeline_status
story: US-6.1
version: 2
status: ARCHIVED
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T00:00:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: open_decisions
    version: 4
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: plan_review
    version: 2
  - key: test_strategy
    version: 2
  - key: ac_test_matrix
    version: 2
---

# Pipeline status: US-6.1

Overall: T1 DONE (commit 58d8335), T2 DONE (commit 770c61a; manual Copy HTML QA PENDING), T3 DONE (see git log, commit "feat(US-6.1 T3)").

## T1 - pure iframe filter and sanitizer pipeline: DONE

- Created `src/app/components/html-editor/editor-html-pipeline.ts` (`filterEmbedIframes`, `sanitizeEditorHtml`, `finalizeCopyHtml`).
- Command: `npx vitest run src/app/components/html-editor/editor-html-pipeline.spec.ts -t "filter"`
  Output: `Test Files 1 passed (1) / Tests 30 passed | 19 skipped (49)`
- `npx vitest run ... editor-html-pipeline.spec.ts src/utils/html-cleaner.spec.ts`: html-cleaner.spec.ts file passed;
  the only failures in the pipeline spec were the 5 T3-tagged tests (copy-parity with a kept iframe), expected red.
- `npm run lint` (`tsc --noEmit`): clean.
- Commit 58d8335 `feat(US-6.1 T1): ...`.

## T2 - wire the composed sanitizer at both component gates: DONE (manual QA pending)

- `html-editor.component.ts`: `load()` uses `sanitizeEditorHtml`; `buildCopyHtml()` returns `finalizeCopyHtml(raw)`; now-unused imports removed.
- `npx vitest run src/app/components/html-editor src/utils`: 13 failures, all in the new T3 tests
  (5 in editor-html-pipeline.spec.ts, 8 in round-trip.spec.ts); the removed-iframe parity tests, structural-parity,
  beautify-round-trip, source-view and table-thead specs pass.
- `npm run lint`: clean.
- Commit 770c61a `feat(US-6.1 T2): ...`.
- PENDING MANUAL CHECK (not performed): per the human approver's comment on the plan (D9 accepted), the two call-site
  swaps have no automated component test and get manual QA: paste an off-list iframe, Load, Copy HTML, confirm no
  structure warning and the iframe absent; also paste an allowed div-wrapped iframe and confirm it survives.

## T3 - embedIframe atomic block node plus genericBlock verbatim style (plan v2 D6): DONE

- Files: new `extensions/embed-iframe-node.ts`; `EmbedIframe` registered in `extensions/index.ts`;
  `extensions/generic-block-node.ts` `renderHTML` now builds the wrapper element, writes every attribute with
  `setAttribute` (so `style` is verbatim), skips null/undefined values, returns `{ dom, contentDOM }`.
  Attribute schema and `parseHTML` unchanged. No test file, fixture or FROZEN file edited.
- Previously red (4 round-trip tests, `margin: 0 auto` -> `margin: 0px auto`) now green.
- `npx vitest run src/app/components/html-editor`: `Test Files 7 passed (7) / Tests 110 passed (110)`.
- `npx vitest run` (test:logic, full): `Test Files 164 passed (164) / Tests 4569 passed | 3 skipped (4572)`
  (the 3 skipped are the pre-existing LIVE_DOC_TEST probe).
- `npm run test:components` (ng test): `Test Files 2 passed (2) / Tests 32 passed (32)`.
- `npm run lint` (`tsc --noEmit`): exit clean, no diagnostics.
- Not run by so-builder (owned by so-gate-enforcer): `npm run test:coverage`, `ng build`, `arch-guard.sh`.

## Pending

- Manual Copy HTML QA for T2: PENDING, not performed (see T2 section).
