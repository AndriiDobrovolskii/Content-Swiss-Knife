---
artifact: verification_report
story: US-8.1
version: 1
status: DRAFT
owner: so-implementation-verifier
stage: IMPLEMENTATION_VERIFICATION
created_at: 2026-10-14T21:40:00Z
updated_at: 2026-10-14T21:40:00Z
supersedes: null
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
    version: 1
  - key: quality_gate_report
    version: 1
---

# Implementation Verification Report - US-8.1

Scope: `git diff 27b01b8..HEAD` on `feat/US-8.1-single-master-faq` (HEAD `56f690b`). Every check below was made against the diff and the files as they stand, not against the implementation or gate reports. The mechanical gate was not re-run.

**Verdict: CHANGES_REQUIRED** (`loop_back_stage: changes_required`), for one finding (V-1): a new hard-coded language-code table in `src/prompts/task-c.ts`, which AGENTS.md section 7 item 5 prohibits. Everything else holds.

## Findings

### V-1 (blocking, medium) - new hard-coded language table outside STORE_REGISTRY

`src/prompts/task-c.ts` (added in da59195) defines:

```
const FAQ_LANGUAGE_NAMES: Record<string, string> = {
  PL: 'Polish', RU: 'Russian', DE: 'German', UA: 'Ukrainian', ES: 'Spanish', PT: 'Portuguese',
};
```

It is read by `faqGenericRules()` to turn a Task C language key into a display name. This is a literal language-code table outside `src/prompt-core/constants.ts`. AGENTS.md section 3 ("Store registry") and section 7 item 5 forbid it. The registry already has the right derivation: `taskLangToIso(taskLabel, storeName)` followed by `isoToHumanLang(iso)` in `constants.ts`. The description path's `genericInstruction()` does not need a table; it interpolates `targetLang`. Neither the plan nor the task breakdown names this table.

Consequences of the fix, for the orchestrator and the human:
- `task-c.ts` is FROZEN. Removing the table is another section 9 edit. The grant recorded in `docs/catalog/US-8.1-pipeline-status.md` ("T1 - section 9 stop and approval record") covers T1 only, so a fresh explicit "modify src/prompts/task-c.ts" instruction and a same-commit `--rebaseline` are required before the builder touches it.
- A fix inside `constants.ts` alone does not remove the table, because the table is in `task-c.ts`. Deriving the name inside `task-c.ts` (via existing exports) or passing a derived name in `opts` both edit the frozen file.
- If the human prefers to accept the table, that is a recorded deviation to decide, not something this stage can waive.

### V-2 (non-blocking) - master-locale literal in new code

`src/app/tab-descriptors.ts` uses the `'uk-UA'` literal (`iso: 'uk-UA'`, `faqArtifacts?.['uk-UA']`, `if (iso === 'uk-UA') continue`). The task breakdown (T6/T7 notes) says to prefer `MASTER_LOCALE` over the literal in new code. The orchestrator does this; `tab-descriptors.ts` and `buildFaqLanguageInstruction` (`sourceLocale === 'uk-UA'`, copied from the description path) do not. A single master-locale code is not a language list, so this is not a section 7.5 violation. Suggest fixing it alongside V-1, in `tab-descriptors.ts` (not frozen).

### V-3 (non-blocking, informational) - test edited after RED

c62e30a changed the FR-21 assertions from `toContain('1.75 mm')` to `toMatch(/1\.75\smm/)`, because the unchanged normaliser emits U+00A0. The negative assertion `not.toContain('1.75mm')` was kept and the master guard already used `\s`. This is a legitimate correction, not a weakening, but it is recorded here as a test change made during IMPLEMENTATION. Section 4 says "space"; NBSP is the repo's existing behaviour and is unchanged by this Story.

## Check 1 - Architecture Rule 2 (retrieval separate from generation): HOLDS

Read: the full diff of `src/services/content-orchestrator.service.ts` (`runFaqPipeline`, `runFaqGate`, `faqTranslationPayload`, `storeFaq`, `generateFaqOnly`, and the two replaced call sites in `generate()` and `generateUaContent()`), `src/prompts/task-c.ts` (`buildFaqTranslationPayload`, `buildFaqLanguageInstruction`), `src/utils/faq-gate.ts`, `faq-html.ts`, `structural-parity.ts`, `src/app/*`.
- The only external call in the new FAQ code is `this.llm.generateText(...)` inside `runFaqGate.produce`. There is no `RetrievalService`/`RetrievalProvider` use, no search, no fetch, no URL extraction in any added line (a diff-wide grep for `retriev|serper|fetch(|search|ground|http|@anthropic|openai|genai` over non-test source finds only comments).
- The retrieval code paths (server `RetrievalService`, URL import) were not touched: `git diff --stat 27b01b8..HEAD -- server` is empty.
- No Google Grounding reintroduced; no SDK import added anywhere (`package.json` and `server/` unchanged).
- This is review-only: arch-guard and the tests do not check Rule 2.

## Check 2 - AGENTS.md section 4 HTML criteria: HOLDS for what is in play

Changed prompt surface: the FAQ prompt (`task-faq.ts`) and the new Task C FAQ variant. The description prompt, renderer, Zod schema and `output-validator.ts` are unchanged.
- Description-path parity: the `buildPromptC` diff is one `opts` type widening plus one early `return` guarded by `opts?.contentKind === 'faq'`; every description-path line is unchanged, and `constants.ts` is not in the diff. The 16-pair golden (`test/fixtures/golden/task-c-description-prompts.json`) was committed in 01527f4, before the T1 edit (da59195), so it pins the pre-change bytes.
- FAQ output contract: only `h3 p b ul li`, no attributes, no Markdown, no `<br>`, must start with `<h3>` - stated in both prompts and enforced by `validateFaqShape` as errors. `<strong>` is removed from the FAQ prompt tag list (T2) and converted to `<b>` deterministically.
- Number/unit spacing: the FAQ produce path runs `fixNumberFormatting`, `fixDecimalSeparator`, `restoreIdentifierDots`, `cyrillizeUnits`, `normalizeTerminology`, `canonicalizeMultiInOne` on master and translations; the FAQ translation system block restates "single space between a number and its unit" and "numbers carry over exactly".
- Currency: the FAQ prompt takes `store.currencySymbol` from the registry; no currency literal appears in new code (regex scan of added source lines for currency characters and ISO currency codes: none).
- Figures, video embeds, spec tables, schema.org Product, meta lengths, CTA: not applicable to a FAQ and untouched in the description path. The FAQ translation variant deliberately omits the CTA, delivery-region sentence, H1 LOCK, spec-table and image-manifest blocks.
- `meta-description-currency`: `output-validator.ts` is not in the diff; the rule stays disarmed and `seo-currency-wiring.spec.ts` is untouched.

## Check 3 - STORE_REGISTRY as single source: ONE VIOLATION (V-1), one note (V-2)

- Languages for FAQ translation come from `getLangsForStore(...).transLangs` (which excludes the master) and `taskLangToIso`; the master gate uses `store.languages.includes(MASTER_LOCALE)`; tab order comes from `getStore(...).languages`. Currency comes from `getStore(...).currencySymbol`. No image base URL added.
- Violation: `FAQ_LANGUAGE_NAMES` (V-1).

## Check 4 - Prompt-caching block separation: HOLDS

`buildFaqTranslationPayload` returns `systemBlocks: [{ text: FAQ_TRANSLATION_SYSTEM, cache: true }, { text: <language instruction>, cache: true }]` and puts all per-product data (`[Store Name]`, `[BASE FAQ HTML]`) in `userContent`. The language instruction depends only on target language, store and group (same dispatch inputs as the description path), so it is stable per store/language. `buildPromptFaq` is unchanged apart from the tag list: still `systemBlocks` with `cache: true`, product data in `userContent`. Nothing is collapsed.

## Check 5 - FROZEN files: HOLDS (one approved edit)

- Changed FROZEN file: `src/prompts/task-c.ts` only, in commit da59195 (the only commit in the range touching it or `.arch-guard-checksums`).
- Approval: recorded verbatim in `docs/catalog/US-8.1-pipeline-status.md` ("T1 - section 9 stop and approval record"), scoped to this file and T1. I can confirm the record exists and that the diff stays inside it (additive branch plus appended constants; the only removed line is the old `opts` type). I cannot independently re-observe the in-session instruction itself.
- Re-baseline: `.arch-guard-checksums` changed in the same commit, one line (`task-c.ts`); the `task-a.ts`, `task-b.ts`, `master-system-prompt.ts` and `output-validator.ts` lines are byte-identical to the base.
- `task-a.ts`, `task-b.ts`, `master-system-prompt.ts`, `output-validator.ts`, `constants.ts`: no diff.

## Check 6 - Angular and server conventions: HOLDS

No `NgModule`; new state is signals; the new pure modules (`faq-form.ts`, `tab-descriptors.ts`, `faq-gate.ts`, `faq-html.ts`) have no RxJS, DOM or I/O. No SDK import outside `server/providers/` (`server/` untouched). No prompt string in a service (the orchestrator only calls `buildPromptFaq`/`buildPromptC`; the `faq-provider-error` text is a validation message, not a prompt). No secret, key, `localStorage`, `bypassSecurityTrust*` or `innerHTML` added. `server/usage/store.js` untouched. Minor: the FAQ form reuses `seoUseThinking`/`toggleSeoThinking` for its Deep Thinking toggle (shared with SEO mode); a design choice, not a rule violation.

## Check 7 - Scope discipline: HOLDS

The non-doc, non-test source set is exactly the T1-T13 files: `task-c.ts`, `task-faq.ts`, `faq-html.ts`, `structural-parity.ts`, `faq-gate.ts`, `content-orchestrator.service.ts`, `types.ts`, `faq-form.ts`, `tab-descriptors.ts`, `app.component.ts/.html`, `README.md`, `.arch-guard-checksums` (T1), and `tools/feedback-form/create-form.gs` (one dropdown string, flagged in the breakdown as scope growth for plan approval and approved with it). The `tabDescriptors` extraction is T10. No config, dependency, CI or `arch-guard.sh` change.

## Reviewer-flagged items

- Description-path structural parity unchanged: `validateStructuralParity` and its `COUNTED_TAGS` are untouched; the FAQ comparison is a separate appended function (`validateFaqStructuralParity`, counts `h3 p ul li`) that is called only from `buildFaqValidator`.
- FAQ gate demotion (plan D6) does not weaken description validation: `buildFaqValidator` is referenced only by `runFaqGate`; `validateGeneratedHtml` is imported and called unmodified, and its findings (path preserved) are demoted to `warning` only inside the FAQ validator. The description gates in `generate()`/`generateUaContent()` and `runOutputValidation` are unchanged. Storability is decided by `isFaqStorable` on the contract rules only; `non-html-output` is demoted but its error-level equivalent remains via `faq-must-start-with-h3`.
- Provider error cannot abort the run: `produce` catches the `generateText` throw, sets `threw`, returns `''` (the validator then returns one `faq-provider-error`, path-less so full-regen is the only rung; `threw` is reset at the start of every produce, so an early throw cannot taint a later success); `runFaqGate` wraps `runRepairGate` in try/catch and returns an unstorable result with a `faq-provider-error` issue; `runFaqPipeline` wraps everything in a final try/catch. `generate()`, `generateUaContent()` and `generateFaqOnly()` all `await` it with nothing after that can be skipped by a throw.
- `convertStrongToB` ordering: applied (1) to the raw model output immediately after `stripCodeFences` and before the normalisers and validation, so the shape check sees `<b>`; (2) to the block-repair output, so a rewritten block cannot reintroduce `<strong>`; (3) to the master before it is used as the translation source and parity reference; (4) again in `storeFaq`, the single write point to `faqArtifacts`. It is a tag-name rename only, total and idempotent, with an existing `<b>` untouched. No later step produces `<strong>`.

## Review-only checks (not caught by any command)

Rule 2 (Check 1); STORE_REGISTRY literal scan (Check 3, which is how V-1 was found - arch-guard implements Rules 1, 3, 4 only); the section 9 approval record and same-commit re-baseline (Check 5); prompt-caching block separation (Check 4); D6 demotion blast radius and provider-error containment (reviewer-flagged items).

## Result

CHANGES_REQUIRED, loop back to IMPLEMENTATION (`changes_required`). The architecture plan does not prescribe the language-name table, so this is a builder defect, not a plan defect (`changes_required_plan` not warranted). The fix needs a new section 9 approval for `task-c.ts` before the builder starts.
