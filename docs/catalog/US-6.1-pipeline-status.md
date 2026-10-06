---
artifact: pipeline_status
story: US-6.1
version: 1
status: DRAFT
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
    version: 1
  - key: task_breakdown
    version: 1
  - key: plan_review
    version: 1
  - key: test_strategy
    version: 1
  - key: ac_test_matrix
    version: 1
---

# Pipeline status: US-6.1

Overall: T1 DONE (commit 58d8335), T2 DONE (commit 770c61a), T3 BLOCKED (not committed).

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

## T3 - embedIframe atomic block node: BLOCKED (plan defect), left uncommitted

Working tree (uncommitted): new `extensions/embed-iframe-node.ts`, `EmbedIframe` registered in `extensions/index.ts`.

- `npx vitest run src/app/components/html-editor` with these two files: `Tests 2 failed | 102 passed (104)`:
  round-trip.spec.ts "keeps the iframe attributes and the wrapper divs for N = 2 / N = 3 wrappers":
  `Expected: "max-width: 1200px; width: 100%; margin: 0 auto;"  Received: "max-width: 1200px; width: 100%; margin: 0px auto;"`.
- Root cause: `genericBlock.renderHTML` returns a `[tag, attrs, 0]` spec; ProseMirror's renderer sets `style` through
  `dom.style.cssText`, which re-serialises the value (also in real browsers: `0` becomes `0px`). The plan (D6, D2 and
  T3 Notes) assumed "wrapper `style` already round-trips through genericBlock" and forbade editing genericBlock;
  AC-2 and the tests require verbatim wrapper style, so that assumption is false.
- A first failure of the same kind on the iframe `style` (`border: none none`) was fixed inside the new node by
  building the element with `setAttribute` in `renderHTML` (no plan deviation).
- Experiment (reverted, genericBlock is not modified): making `genericBlock.renderHTML` create the element and use
  `setAttribute('style', ...)` made all 104 tests in `src/app/components/html-editor` pass.
- Not run for T3 (blocked): full `npm test`, `npm run test:coverage`, `ng build`.
- Needed: plan amendment allowing a minimal `generic-block-node.ts` edit (verbatim `style` rendering) in T3, then re-dispatch.
