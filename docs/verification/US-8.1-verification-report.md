---
artifact: verification_report
story: US-8.1
version: 4
status: DRAFT
owner: so-implementation-verifier
stage: IMPLEMENTATION_VERIFICATION
created_at: 2026-10-15T10:30:00Z
updated_at: 2026-10-15T10:30:00Z
supersedes: docs/verification/US-8.1-verification-report.md#3
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: implementation_plan
    version: 1
  - key: task_breakdown
    version: 3
  - key: implementation_report
    version: 4
  - key: quality_gate_report
    version: 4
---

# Implementation Verification Report - US-8.1 (v4, re-verification of HEAD e6088b7)

Scope: `git diff 27b01b8..HEAD` on `feat/US-8.1-single-master-faq` (HEAD `e6088b7`), plus the delta since the v3 report's code baseline, `git diff 1ac82e1..HEAD`. Version 3 (PASS) is superseded. Every check below is against the diff and the files as they stand, not against the reports. The mechanical gate was not re-run as verification; `bash arch-guard.sh` was run once, read-only, as a FROZEN cross-check (exit 0).

**Verdict: PASS** (`loop_back_stage: null`). No production-logic change since v3, confirmed from the real diff. Two non-blocking notes (N-1, N-2); the earlier whitespace nit is resolved.

## What changed since v3 (the whole code delta)

`git diff 1ac82e1..HEAD --stat -- src test server package.json arch-guard.sh .arch-guard-checksums` lists exactly six files:

| File | Change |
| --- | --- |
| `src/utils/faq-html.ts` | 1 line, `const MARKDOWN_BOLD =/...` to `const MARKDOWN_BOLD = /...` (d33292c). Whitespace only; the regex is byte-identical. |
| `src/app/app.component.template-wiring.spec.ts` | +96, AC-10 and AC-11 tightening pins (test only) |
| `src/services/content-orchestrator.faq-pipeline.spec.ts` | +41, AC-19 integration block (test only) |
| `src/services/content-orchestrator.faq-standalone.spec.ts` | +27, AC-19 integration block (test only) |
| `test/fixtures/faq-pipeline.ts` | +44, `DESCRIPTION_ONLY_MARKERS`, `faqTranslationPromptProblems`, `looksLikeDescriptionPrompt` (test helper only) |

`.arch-guard-checksums`, `src/prompts/`, `src/prompt-core/`, `src/utils/output-validator.ts`, `server/`, `package.json`, `arch-guard.sh` have no diff in the delta. The rest of the delta is docs and workflow state. So: no production-logic change; confirmed.

## N-2 from v3 (missing space after `=` in `MARKDOWN_BOLD`): RESOLVED

`d33292c` restores `const MARKDOWN_BOLD = /\*\*[^*\n]+\*\*/;` (line 56 of `src/utils/faq-html.ts`). Its diff is the single character and nothing else. The neighbouring `MARKDOWN_HEADING` and `MARKDOWN_FENCE` lines are consistent with it.

## Check 1 - Architecture Rule 2 (retrieval separate from generation): HOLDS

Read: `runFaqPipeline`, `runFaqGate` and `generateFaqOnly` in `src/services/content-orchestrator.service.ts` (added lines of the whole range), `src/utils/faq-gate.ts`, `faq-html.ts`, `faq-form.ts`, `structural-parity.ts`, `src/app/tab-descriptors.ts`, `src/prompts/task-faq.ts`, and the FAQ variant in `src/prompts/task-c.ts`. A search of the added lines for retrieval, fetch, search, grounding and Serper finds only comments (the `generateFaqOnly` doc comment states "no retrieval (Rule 2)"; "grounding" there means the user-supplied description and specs). The standalone path takes only operator-supplied Supplemental Content, Description and Specs; no `RetrievalService` / `RetrievalProvider` call exists in it. The pure FAQ utilities do no I/O. `server/`, `retrieval.service.ts` and `package.json` have no diff in the range; no Google Grounding is reintroduced. Review-only: no command checks this rule.

## Check 2 - AGENTS.md section 4 HTML criteria: HOLDS

The description prompt path, Zod schema, renderers and `output-validator.ts` are unchanged: `output-validator.ts` has no diff in the range and `seo-currency-wiring.spec.ts` is untouched, so `meta-description-currency` stays disarmed. The additive FAQ variant of Task C is selected only by `contentKind: 'faq'`; the 96-case description golden (`src/prompts/task-c.description-bytes.spec.ts` with `test/fixtures/golden/task-c-description-prompts.json`) pins the description path (system-block digests, lengths, `cache` flags, `userContent` digest) byte for byte, so the Product `itemtype`, unit spacing, spec count, figure, video, `meta_title` / `meta_description` / CTA, `<hr>` and no-Markdown criteria for descriptions cannot have moved. The FAQ artifact itself is held to the FR-9 shape: `h3`, `p`, `b`, `ul`, `li`, no attributes, no Markdown, no `<br>`, `<b>` instead of `<strong>` (T2 and T3; the B-1 fail-closed tag pass is unchanged since v3).

## Check 3 - STORE_REGISTRY as the only source of languages and currency: HOLDS in production code; test findings below

Production code (searched the added lines of every non-spec file in the range for BCP-47 codes, Task C key literals, currency symbols and codes, and URLs):

- `content-orchestrator.service.ts`: the master is `MASTER_LOCALE`; the translation set comes from the store profile; log and progress strings interpolate `${MASTER_LOCALE}` and the ISO. No language list, no currency, no URL literal. The V-2 fix (`8c89bce`) is still in place.
- `tab-descriptors.ts`: `uk-UA` and `UA` appear only in doc comments; tab ids and labels are interpolated from the ISO / task key; ordering is registry order.
- `faq-gate.ts`, `faq-html.ts`, `faq-form.ts`, `structural-parity.ts`, `app.component.ts`, `app.component.html`, `types.ts`: no locale or currency literal in code (the `AppMode` union gains `'faq-generator'`, a mode id, not a locale). `create-form.gs` gains one UI label.
- `task-faq.ts`: two tag-list wording edits only.
- `task-c.ts` (FROZEN, FAQ variant): the per-language rule blocks name languages inside prompt prose (Castilian Spanish es-ES, European Portuguese pt-PT, US English / Spanish, Ukrainian for the US market) and branch on the same `targetLang` / `websiteGroup` / `isExpert3dStore` dispatch labels as the existing description path. These are prompt content mirroring the pre-existing frozen dispatch (FR-12: same dispatch as the description path), not a second language registry. `sourceLocale === 'uk-UA'` mirrors the existing description branch. This is the v3 N-3 note, unchanged. No currency symbol and no image base URL is added anywhere.

Test code (reported as asked; test code is not a production list but I looked at whether it iterates the registry):

- The orchestrator specs, `faq-gate.spec.ts`, `app.component.template-wiring.spec.ts`, `task-c.faq.spec.ts` and `task-c.description-bytes.spec.ts` derive stores and languages from `STORE_REGISTRY`, `MASTER_LOCALE` and `getLangsForStore`-style helpers (`registryStores()`, `storeLanguages(store)`, `translationLanguages(store)`). New AC-19 blocks in the delta iterate `STORES` / `MODES` and compare against `translationLanguages(store)` (registry-derived), with no hard-coded language list.
- `src/app/tab-descriptors.spec.ts` hard-codes a per-store language table (`NON_MASTER`) and expected tab descriptors with literal ISO codes (`en-GB`, `ru-UA`, `pl-PL`, `de-DE`, `en-ES`, `es-ES`, `pt-PT`, `en-US`, `es-MX`). This is a deliberate hand-derived oracle ("the ORDER is the thing under test, written out by hand"), and it is cross-checked against the registry: `covers every registry store` asserts the store set equals `Object.keys(STORE_REGISTRY)`, and `non-master languages and Task C keys match the registry` asserts each row equals `STORE_REGISTRY[store].languages` minus the master mapped through `bcp47ToTaskCLang`. So if the registry changes, the oracle fails loudly rather than silently diverging. It does hard-code production language data, which is N-1 below.
- Other literal locales in specs (`'uk-UA'`, `'pl-PL'`, `'en-GB'` as validator context, `Drukarka 3D` as a store name in one standalone test) are inputs to a single case, not language lists.
- `test/fixtures/faq-pipeline.ts` has one currency literal: `buildPromptFaq('x', '', '', 's', 'Ukrainian', '€')`, used only to render the FAQ generation system block so calls can be classified. It is an argument for fingerprinting, not a list of currencies, and does not feed any assertion about currency. No language list or URL.

## Check 4 - Prompt-caching block separation: HOLDS

`buildPromptC`'s FAQ variant returns `systemBlocks: [{ text: FAQ_TRANSLATION_SYSTEM, cache: true }, { text: buildFaqLanguageInstruction(...), cache: true }]` and puts the per-product data (`[Store Name]`, `[BASE FAQ HTML]`) in `userContent` with the comment "Dynamic per-product data stays out of the cached system blocks". The description path's block structure and `cache` flags are pinned by the golden. `buildPromptFaq` keeps its cached system block (v2/v3 reading; `task-faq.ts` diff is two wording lines). Nothing in the delta touches a prompt builder.

## Check 5 - FROZEN files: HOLDS

`git log --oneline 27b01b8..HEAD -- src/prompts/task-c.ts .arch-guard-checksums src/prompts/task-a.ts src/prompts/task-b.ts src/prompt-core/master-system-prompt.ts src/utils/output-validator.ts` lists exactly `da59195` (T1) and `8c89bce` (V-1 / V-2 fix). Only `src/prompts/task-c.ts` is a frozen file that changed (the diff removes only the import line and the old `opts` signature, both extended additively; `task-a.ts`, `task-b.ts`, `master-system-prompt.ts`, `output-validator.ts` have no diff). `.arch-guard-checksums` shows a single changed line, the `task-c.ts` hash, and each of the two commits carries both the edit and the re-baseline in the same commit. The two section 9 grants are recorded in `docs/catalog/US-8.1-pipeline-status.md`: "T1 - section 9 stop and approval record" (line 59, operator instruction quoted verbatim) and "Loop-back fix 1 of 3 ... section 9 stop and approval record" (line 202). The delta since v3 touches neither the frozen files nor the checksums. `bash arch-guard.sh`: Rules 1, 3, 4 OK, "All frozen files unchanged", exit 0. I can confirm the records exist and the diffs stay inside them; I cannot independently re-observe the in-session grants.

## Check 6 - Angular and server conventions: HOLDS

The new component code (`app.component.ts`, the template, `tab-descriptors.ts`) is standalone-style signals and field-level `inject()`; no `NgModule`, no new RxJS beyond the existing HTTP boundary. No SDK import outside `server/providers/` (arch-guard Rule 1 OK); no prompt string added to a service (Rule 3 OK; the FAQ prompt text lives in `src/prompts/`). No secret, response body or log line carries one (Rule 4 OK; the new `console.warn` / `console.info` lines carry labels, counts and the store name). `server/` has no diff, so `server/usage/store.js` is unchanged. The FAQ HTML still reaches `SafeHtml` only after the FR-9 shape gate with the B-1 fail-closed pass from v3, unchanged.

## Check 7 - Scope discipline: HOLDS

Production files in the range: `README.md`, `app.component.html|ts`, `tab-descriptors.ts`, `types.ts`, `task-c.ts`, `task-faq.ts`, `content-orchestrator.service.ts`, `faq-form.ts`, `faq-gate.ts`, `faq-html.ts`, `structural-parity.ts`, `tools/feedback-form/create-form.gs`; all are named in `task-breakdown` v3 (T1-T13, the V-1 / V-2 and B-1 loop-backs). Test-side files are `.spec.ts` files plus `test/fixtures/faq-pipeline.ts`, `test/fixtures/task-c-description-inputs.ts` and the golden JSON, which are TEST_WRITING artifacts listed in the test generation report. The delta since v3 is tests, one whitespace-restoring line, and docs. No drive-by refactor, rename, deleted comment or reformatting of an untouched file was found.

## Non-blocking findings

- **N-1 (informational): a hand-written per-store language table in `tab-descriptors.spec.ts`.** It repeats production language data as literals (the hard-coding the section 7.5 spirit warns against) but is guarded by two registry-equality tests and is intentionally independent of the code under test. No action required; if the registry gains a store or language the guard tests will point at this table.
- **N-2 (informational, carried from v3 N-1 and N-3):** a raw `<` in FAQ prose is a hard shape-gate rejection (the prompts do not instruct writing `&lt;`); the unregistered-store fallback in `faqGenericRules` yields the raw task label; the `'uk-UA'` source-locale branch and Task C dispatch labels in the FAQ variant are literals mirrored from the frozen description path. None changed since v3 and none is a rule violation.

## Review-only checks (not caught by any command)

Rule 2 (Check 1); the STORE_REGISTRY literal scan across production code and test helpers (Check 3); the judgment that the FAQ Task C language prose is mirrored dispatch rather than a second registry; the FROZEN approval records and same-commit re-baseline beyond arch-guard's checksum compare; prompt-caching separation; the scope read against the task breakdown. A passing `npm run lint`, `npm test` or `bash arch-guard.sh` would not have caught any of these.

## Result

PASS. HEAD `e6088b7` differs from the v3-verified code only by one whitespace-restoring line in `src/utils/faq-html.ts` and added tests and fixtures. No Rule 2, section 4, STORE_REGISTRY, caching, FROZEN or scope violation; `meta-description-currency` stays disarmed. This is a verdict, not human approval; the artifact stays DRAFT.
