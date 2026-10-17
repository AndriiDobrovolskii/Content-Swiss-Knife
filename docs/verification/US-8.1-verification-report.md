---
artifact: verification_report
story: US-8.1
version: 5
status: ARCHIVED
owner: so-implementation-verifier
stage: IMPLEMENTATION_VERIFICATION
created_at: 2026-10-16T07:00:00Z
updated_at: 2026-10-16T07:00:00Z
supersedes: docs/verification/US-8.1-verification-report.md#4
inputs_consumed:
  - key: story
    version: 3
  - key: specification
    version: 3
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 4
  - key: implementation_report
    version: 5
  - key: quality_gate_report
    version: 5
---

# Implementation Verification Report - US-8.1 (v5, re-verification of HEAD ac62fe4 after the layout delta T14-T17)

Scope: `git diff 27b01b8..HEAD` on `feat/US-8.1-single-master-faq` (HEAD `ac62fe4`), plus the delta since the v4 report's code baseline, `git diff e6088b7..HEAD -- . ':!docs'`. Version 4 (PASS, HEAD `e6088b7`) is superseded. Every check below is against the diff and the files as they stand, not against the reports. The mechanical gate was not re-run as verification; `bash arch-guard.sh` was run once, read-only, as a FROZEN cross-check (exit 0). All six inputs are the current versions (Story v3, Specification v3 APPROVED, plan v2 APPROVED, task breakdown v4 APPROVED, implementation report v5, quality gate report v5); none is SUPERSEDED.

**Verdict: PASS** (`loop_back_stage: null`). The whole code delta since v4 is three files and matches the plan's NFR-9(b) diff property exactly. No finding. The v4 non-blocking notes carry forward unchanged (N-1, N-2) and one informational note is added (N-3).

## What changed since v4 (the whole code delta)

`git diff --name-status e6088b7 HEAD -- . ':!docs'` lists exactly three files, and `git diff --stat e6088b7 HEAD -- src test server package.json arch-guard.sh .arch-guard-checksums` confirms nothing else:

| File | Change |
| --- | --- |
| `src/app/app.component.html` | +11 / -11. Four hunks, all read in full (below). |
| `src/app/app.component.ts` | +2. One new key `supplementalContentRequired` in each of the `en` and `uk` blocks of `TRANSLATIONS`. |
| `src/app/app.component.faq-layout.spec.ts` | new, 485 lines, test only (the layout pins `01061d4`, written before the implementation). |

Production commits in the range, in order: `9494b2b` T15, `6c19042` T14, `81bee6a` T16, `3dc3490` T17 (T15 first as the plan's riskiest-first order says). The four hunks of the template:

1. T15: the empty-state condition gains one conjunct, `appMode() !== 'faq-generator'`, placed after the existing `appMode() !== 'generator'` and before the unchanged `!content().mainHtmlUa && !content().seoData && !content().slugData && !isGenerating()`. Every existing conjunct keeps its text and order, so for any other mode the expression is logically identical to before (FR-28 by construction, plan D12). No data-derived term (`hasOutput`, `faqArtifacts`) was added.
2. T16: the `<app-source-input>` for Supplemental Content is removed from after Tech Specs and inserted directly after the Product Name input. Its attributes (`accent`, `[required]="true"`, `textHeight`, `[value]`, `(valueChange)`) are byte-identical to the removed block; no wrapper element and no class was added (FR-25 untouched).
3. T17: that input's `[label]` changes from `uiLabels().supplementalContent` to `uiLabels().supplementalContentRequired`. This is the only use of the new key; the shared `supplementalContent` key still serves `generatorForm` (Generator and UA Description), which has no diff.
4. T14: `supplementalContentRequired: 'Supplemental Content (Required)'` and `supplementalContentRequired: 'Додатковий контент (Обов\'язково)'` (ASCII apostrophe, escaped inside a single-quoted literal; not U+2019 / U+02BC) sit directly after the unchanged `supplementalContent` line in each block, so `en` and `uk` stay at the same key set. The existing key and its two values are untouched.

`.arch-guard-checksums`, `src/prompts/`, `src/prompt-core/`, `src/utils/`, `src/services/`, `server/`, `package.json`, `arch-guard.sh`, `test/fixtures/` (including the goldens) have no diff in the delta. So: no prompt, schema, renderer, validator, orchestrator, retrieval or data-field change; NFR-9(b) holds from the real diff.

## Check 1 - Architecture Rule 2 (retrieval separate from generation): HOLDS

Read: the full added lines of the delta (the two template/component files and the new spec), and re-read the v4-verified paths unchanged since: `runFaqPipeline`, `runFaqGate` and `generateFaqOnly` in `src/services/content-orchestrator.service.ts`, `src/utils/faq-gate.ts`, `faq-html.ts`, `faq-form.ts`, `src/prompts/task-faq.ts` and the FAQ variant of `src/prompts/task-c.ts` (none has a diff since v4: `git diff e6088b7 HEAD -- src/services src/utils src/prompts` is empty). A keyword search of the delta's added lines (retriev, serper, fetch, ground, http) finds only the spec's use of `String.search` and `Function`-evaluation helpers. The delta touches a template condition, a label and an input's position; it adds no call path of any kind. `server/` and `retrieval.service.ts` have no diff in the whole range, so no Google Grounding is reintroduced and the standalone FAQ path still takes only operator-supplied Supplemental Content, Description and Specs. Review-only: no command checks this rule.

## Check 2 - AGENTS.md section 4 HTML criteria: NOT IN PLAY for the delta; HOLDS for the carried code

The delta changes no prompt, Zod schema, renderer or validator and emits no generated HTML, so none of the section 4 criteria can move (plan section "Prompts and the chain": "no prompt, schema, renderer or validator link is touched"). `src/utils/output-validator.ts` has no diff in the whole range and `src/services/seo-currency-wiring.spec.ts` is untouched, so `meta-description-currency` stays disarmed. The description-path golden (`test/fixtures/golden/task-c-description-prompts.json`, pinned by `task-c.description-bytes.spec.ts`) and `full-description-prompts.json` are unmodified in the delta. The FAQ artifact shape gate (FR-9 plus the B-1 fail-closed pass) is unchanged since v4.

## Check 3 - STORE_REGISTRY as the only source of languages and currency: HOLDS

Production delta: the new template lines and the two TRANSLATIONS entries are UI label text and a mode id (`'faq-generator'`, which already existed in `AppMode`). There is no locale code, currency symbol, language list or image base URL in any added production line. The label strings "Supplemental Content (Required)" and its Ukrainian counterpart are UI copy for the app shell, which has its own `en` / `uk` dictionary by design, not a store language set.

Test code: the new `app.component.faq-layout.spec.ts` contains `'en-GB'` and `'de-DE'` once, in a stub `FAQ_RESULT` object used as a stand-in for a populated `faqArtifacts` in the empty-state evaluation grid. It is an input to the case, not a language list, and nothing asserts on it as a set. See N-3. Carried unchanged from v4: the hand-written per-store table in `tab-descriptors.spec.ts` (N-1) and the other single-case locale literals in older specs.

## Check 4 - Prompt-caching block separation: HOLDS (untouched)

No prompt builder changed in the delta (`src/prompts/` and `src/prompt-core/` have no diff since v4). The v4 reading stands: the FAQ Task C variant keeps its two `cache: true` system blocks with per-product data in `userContent`, and the description path is pinned by the golden.

## Check 5 - FROZEN files: HOLDS

`git log --oneline 27b01b8..HEAD -- src/prompts/task-c.ts .arch-guard-checksums src/prompts/task-a.ts src/prompts/task-b.ts src/prompt-core/master-system-prompt.ts src/utils/output-validator.ts` lists exactly `da59195` (T1) and `8c89bce` (V-1 / V-2 fix), the same two commits as in v4; no commit in `e6088b7..HEAD` touches a frozen file or the checksum file. `git diff --stat 27b01b8 HEAD` on the five frozen files plus `.arch-guard-checksums` shows only `.arch-guard-checksums` (1 line) as changed alongside `task-c.ts`; `task-a.ts`, `task-b.ts`, `master-system-prompt.ts` and `output-validator.ts` have no diff. The two section 9 grants are recorded in `docs/catalog/US-8.1-pipeline-status.md` (T1 stop and approval record; loop-back fix 1 stop and approval record), and each of the two commits carries the edit and the re-baseline together, as verified in v4. This revision's plan required "no re-baseline, no new section 9 stop" (NFR-9(b)); that holds. `bash arch-guard.sh` run now: Rules 1, 3, 4 OK, "All frozen files unchanged", exit 0. I can confirm the records exist and that the diffs stay inside them; I cannot independently re-observe the in-session grants.

## Check 6 - Angular and server conventions: HOLDS

The template edit keeps the existing standalone `<app-source-input>` usage with signal bindings (`faqSupplementalContent()` / `.set`); no `NgModule`, no new RxJS, no `inject()` change. No SDK import and no prompt string added to a service. No secret, response body or log line is touched; `server/` has no diff so `server/usage/store.js` is unchanged. The new spec evaluates template text with `new Function(...)` after a character-allowlist regex gate on a repository-owned template condition; it runs only in the test runner and receives no external input, so it is not a runtime or browser-bundle concern.

## Check 7 - Scope discipline: HOLDS

The delta contains exactly what `task_breakdown` v4 names: T14 (`app.component.ts`, two keys), T15, T16, T17 (`app.component.html` only), plus the pin spec that TEST_WRITING owns. No drive-by refactor, rename, reformatting or deleted comment: the two modified files each show only the hunks above, and the moved input is a pure relocation with only the label binding changed. Cumulative production files for the whole Story remain those named in v4 plus these two; no untouched file was reformatted.

## Non-blocking findings

- **N-1 (informational, carried from v4): a hand-written per-store language table in `tab-descriptors.spec.ts`.** Guarded by two registry-equality tests; no action required.
- **N-2 (informational, carried from v4):** a raw `<` in FAQ prose is a hard shape-gate rejection; the unregistered-store fallback in `faqGenericRules` yields the raw task label; the `'uk-UA'` source-locale branch and Task C dispatch labels in the FAQ variant mirror the frozen description path. None changed and none is a rule violation.
- **N-3 (informational, new):** `app.component.faq-layout.spec.ts` uses two BCP-47 literals (`'en-GB'`, `'de-DE'`) as the keys of a stub `faqArtifacts` object in the state grid. They are inputs to the empty-state evaluation, not a language list; if one is ever reused as a store assertion it should come from `STORE_REGISTRY`. No action required. The spec's purely visual clause (FR-25 geometry) is, per the spec, a manual check at HUMAN_PR_APPROVAL and is not claimed by any automated pin.

## Review-only checks (not caught by any command)

Rule 2 (Check 1); the STORE_REGISTRY literal scan (Check 3); that the delta really is the NFR-9(b) diff property (three files, no checksum or golden change), which neither lint, build nor test asserts; that the T16 move changed no attribute of the moved input and added no wrapper or class; that the new conjunct preserved the other modes' condition text and order (the pins evaluate it, but the textual reading here is independent of them); the FROZEN approval records and same-commit re-baseline beyond arch-guard's checksum compare; prompt-caching separation; the scope read against the task breakdown. A passing `npm run lint`, `npm test`, `npm run build` or `bash arch-guard.sh` would not have caught any of these.

## Result

PASS. HEAD `ac62fe4` differs from the v4-verified code `e6088b7` only by a template-condition conjunct, an input relocation and relabel, two label keys, and a new test spec. No Rule 2, section 4, STORE_REGISTRY, caching, FROZEN or scope violation; `meta-description-currency` stays disarmed. This is a verdict, not human approval; the artifact stays DRAFT.
