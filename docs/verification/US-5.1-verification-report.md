---
artifact: verification_report
story: US-5.1
version: 3
status: ARCHIVED
supersedes: docs/verification/US-5.1-verification-report.md@v2
owner: so-implementation-verifier
stage: IMPLEMENTATION_VERIFICATION
inputs_consumed:
  - {key: story, version: 1}
  - {key: specification, version: 9}
  - {key: implementation_plan, version: 6}
  - {key: task_breakdown, version: 8}
  - {key: implementation_report, version: 3}
  - {key: quality_gate_report, version: 3}
---

# Implementation Verification - US-5.1 (v3, committed-diff re-run)

Verdict: **PASS** with non-blocking findings. Evidence is `git diff ef08509..HEAD` (50 files; implementation commits 134cdcc..dd5f039; ef08509 base per the human decision that the PR carries the US-4.1 archive commit) plus `git log` per file. The green gate was not used as evidence for any check.

## 1. Architecture Rule 2 - holds (review-only)
Read: `buildMarkerBlock` (task-a.ts:109-123), the new modules `image-placeholder.ts`, `-doc.ts`, `-html.ts`, `-validate.ts`, `image-figure-style.ts`, the renderer change in `render-description.ts`, and the orchestrator hunks (`produceTaskAArtifact`, `legacyPlaceholderIssues`, `finalizeLegacyPlaceholders`, the Doc attempt path, the two `generate`/`generateUaContent` wirings). `buildMarkerBlock` is pure string building from `input.description` and `input.imageManifest`. A grep of the new non-spec modules for fetch/serper/Retrieval/generateText/llm/grounding/SDK imports returned nothing (only prose comments about "the LLM" in the pre-existing image-figure.ts). The marker step runs after `llm.generateText` returns and after the schema-validity guard; it makes no model call, no fetch, and nothing was added to `RetrievalProvider`/`RetrievalService`. No Google Grounding reintroduced.

## 2. AGENTS.md section 4 HTML criteria - holds
- Figure style: `IMAGE_FIGURE_STYLE` (`display: block; width: max-content; max-width: 100%; margin: 4px auto;`) is the single constant imported by the structured renderer, `wrapImageFigures`, and the TipTap `imageFigure` node. AGENTS.md section 4 was amended to `max-content` in 17beda8 (human-approved, plan v6 OI-3/T12 and H-8). `master-system-prompt.ts` examples, both corpus uk-UA fixtures (14 and 14 lines, style swap only) and specs agree. No `fit-content` remains in src/server/prompt code; the only residue is two untouched legacy editor fixtures `src/utils/__fixtures__/description_uk-UA.{original,corrected}.html` (see N-3).
- Figures: first eager, later lazy, `decoding="async"`, no figure inside `<p>`, `<figcaption>` with `<b>` label distinct from alt (via the `Image:` label constants and `View ` alt prefix), figcaption `text-align: left` shared constant. `hookExtra`/`cta.extra` render through the same `block` renderer, so the document-position eager/lazy rule holds across hook, body, CTA (render-description.hook-cta-extra.spec.ts asserts it).
- No Product itemtype introduced; no meta/title/description change; no currency symbol added anywhere; spec/unit passes untouched (the three validators only read `hookText`/`ctaText`, unchanged when no figure is placed). The marker step runs before the number/unit and terminology passes so file names are not rewritten.
- `output-validator.ts` has no commits in range: `meta-description-currency` stays disarmed.
- Video embeds: `restoreMissingVideos` is still called after the marker step; not modified.

## 3. STORE_REGISTRY sole source - holds
Searched all added non-spec lines of src/server for locale codes, currency symbols and URLs. The base URL is read from `getStore(input.website.name).imageBaseUrl`. The only new locale-ish literals are `'uk-UA'` as `localeIso` args in the two orchestrator `finalizeLegacyPlaceholders` calls (same literal the surrounding 'HTML (uk-UA)' contexts already use, `UA_ISO` on the second) and `VISION_TEXT_LANGUAGE = 'uk'`, which is a Vision-prompt language tag compared with `new Intl.Locale(MASTER_LOCALE).language` (derived from the registry constant, no locale list added). No language list, currency symbol or base URL is hard-coded. Minor: the first call's `'uk-UA'` literal could be `UA_ISO` (N-4).

## 4. Prompt-caching block separation - holds
`buildPromptA` still returns `systemBlocks` with `{text: MASTER_SYSTEM_PROMPT, cache: true}`, `{text: TASK_A_INSTRUCTION, cache: true}` and the unchanged cached overlays. The marker block is inserted only into `userContent` (task-a.ts:167) and returns '' when no marker matches, keeping userContent byte-identical. `task-a-doc.ts` has no commits in range and inherits through `buildPromptA`. The master addition is one static sentence (no per-request data), so the cached prefix stays stable. Golden: only `systemBlocks[0].text` of the 10 master-embedding cases changes; userContent of all 12 and the 2 translate cases unchanged (header exception in `test/fixtures/full-description-inputs.ts` names both approvals).

## 5. FROZEN files (AGENTS.md section 9) - holds, approvals recorded
Touched in range: only `src/prompts/task-a.ts` and `src/prompt-core/master-system-prompt.ts`, both solely in commit df52e88. `task-b.ts`, `task-c.ts`, `output-validator.ts` have no commits in range; `task-a-doc.ts` (not frozen) also none.
- task-a.ts diff: one added import, the added `buildMarkerBlock` function, ONE modified template line (adds `${buildMarkerBlock(input)}`). master-system-prompt.ts diff: 3 added sentence lines plus the two example `<figure style>` lines `fit-content` -> `max-content`. Nothing else.
- Approvals in `docs/workflow/history.jsonl`: 2026-10-03T09:25:44Z (human approved section 9 edits to master-system-prompt.ts and task-a.ts only) and 09:28:48Z (route via SPECIFICATION); 2026-10-03T18:20:00Z (H-8, authorises updating the master example figure lines 403/408 to max-content); `HUMAN_APPROVED` HUMAN_SPEC_APPROVAL of spec v9 (17:31:49Z entry, see N-5); `HUMAN_APPROVED` HUMAN_PLAN_APPROVAL 2026-10-04T06:37:29Z (plan v6 / tasks v8: "the single modified task-a.ts template line is approved under the section 9 override", N-3 golden/checksum regeneration is a mechanical build step). The diff scope matches the approvals exactly.
- `.arch-guard-checksums`: exactly two rows changed (task-a.ts, master-system-prompt.ts), re-baselined in the SAME commit df52e88 as the edits. Other three rows unchanged.

## 6. Angular and server conventions - holds
`src/app/app.component.ts` change is one import and one spread (`visionResultToEntryPatch`) into the manifest update; `types.ts` adds three optional fields without repurposing `altText`. No NgModule/RxJS added. No SDK import outside `server/providers/` (the only server change is `openai.js` `max_tokens` 300 -> 1000, human-approved OI-5; covered by `test/openai-provider.spec.ts`). Prompt strings live in `src/prompts/` and `src/prompt-core/`, none in a service. No secret, log or response exposure introduced. No `server/usage/store.js` change.

## 7. Scope discipline - holds
Every non-spec file in the diff maps to a task: T1 domain carriers, T3 validators (sentence-length, simplified-word-ranges, tov-second-person), T4/T5/T6 Vision contract/prompt/manifest/app wiring, T7 openai.js, T8 renderer + shared style (image-figure.ts, image-figure-node.ts, doc-prose-transforms), T9 four new modules, T10 orchestrator, T11 frozen prompts + golden + checksums, T12 AGENTS.md, plus corpus and fixture style updates. No drive-by refactors found.

## Documented gap - N-9 (carried, not addressed by any task)
A too-long sentence inside `hookExtra` is measured by the carrier-aware validators under path `hook` (via `hookText(doc)`), so the root-leaf `hook` repair in `doc-block-repair.ts` can only edit `doc.hook`, not the split hook paragraph in `hookExtra`. `doc-block-repair.ts` was intentionally not edited. Consequence: such an issue may not be repairable by the targeted repair and falls to the regular ladder / ships as a residual length finding. Plan review N-9 recorded it and the human accepted it at HUMAN_PLAN_APPROVAL ("N-9: risks accepted as planned"). It is reported here as a known gap, not a defect of this diff.

## Findings
Blocking: none.
Non-blocking:
- N-1 Documented gap N-9 above (accepted).
- N-2 task-a.ts:122 marker prompt: "a <p>, or the text of a paragraph block" is silent on hook/CTA string fields; the FR-18 end-append finaliser is the backstop (wording only).
- N-3 `src/utils/__fixtures__/description_uk-UA.{original,corrected}.html` still hold `fit-content` (15 occurrences each). They are untouched editor round-trip inputs and not an output criterion; left unchanged, noted so a later cleanup can decide.
- N-4 orchestrator `generate()` passes the literal `'uk-UA'` where the sibling call uses `UA_ISO`; consistency nit only.
- N-5 history.jsonl ordering: the HUMAN_APPROVED spec v9 entry carries ts 17:31:49Z but sits after entries timestamped 19:25Z (and after the H-8 rejection at 18:20Z). The H-8 approval itself is carried by the HUMAN_REJECTED-verdict event that reinstated the Spec with decisions plus the later spec v9 and plan v6 approvals. Bookkeeping note for the orchestrator; I did not touch the file.

Review-only checks (no automated detection): Rule 2, caching separation, STORE_REGISTRY literal scan, section 4 criteria against code and fixtures, FROZEN scope against recorded approvals, N-9 gap.
