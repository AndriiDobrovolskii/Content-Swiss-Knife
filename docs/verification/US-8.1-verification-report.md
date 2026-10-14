---
artifact: verification_report
story: US-8.1
version: 2
status: DRAFT
owner: so-implementation-verifier
stage: IMPLEMENTATION_VERIFICATION
created_at: 2026-10-14T22:40:00Z
updated_at: 2026-10-14T22:40:00Z
supersedes: docs/verification/US-8.1-verification-report.md#1
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
    version: 2
  - key: quality_gate_report
    version: 2
---

# Implementation Verification Report - US-8.1 (v2, re-verification)

Scope: `git diff 27b01b8..HEAD` on `feat/US-8.1-single-master-faq` (HEAD `75cc0be`), with the loop-back fix commit `8c89bce` read in full. Version 1 of this report (CHANGES_REQUIRED on V-1 and V-2) is superseded. Every check below was made against the diff and the files as they stand, not against the implementation or gate reports. The mechanical gate was not re-run as a verification step (`bash arch-guard.sh` was run once, read-only, only to cross-check the FROZEN baseline; it exited 0).

**Verdict: PASS** (`loop_back_stage: null`), with three non-blocking findings (N-1 to N-3). V-1 and V-2 are fixed and the fix introduced no new violation.

## Status of the v1 findings

### V-1 (was blocking) - FIXED

`git show 8c89bce -- src/prompts/task-c.ts`: the `FAQ_LANGUAGE_NAMES` table is deleted. `faqGenericRules(targetLang, storeName)` now computes `isoToHumanLang(taskLangToIso(targetLang, storeName))`, both existing exports of `src/prompt-core/constants.ts` (imported there; `isoToHumanLang` added to the existing import line). A repo-wide search of `src` shows no remaining local language-name table in the new code; the only language-name map is `isoToHumanLang`'s own, in `constants.ts`, which is the registry layer and is not in the diff. The call site in `buildFaqLanguageInstruction` passes `storeName`; no other caller exists. Description path (`buildPromptC` non-FAQ branch, `genericInstruction`) is not touched by the commit.

### V-2 (was non-blocking) - FIXED

`git show 8c89bce -- src/app/tab-descriptors.ts`: `MASTER_LOCALE` imported from `prompt-core/constants` and used for the two `iso:` fields, the `faqArtifacts?.[...]` lookup and the `iso ===` skip. A scan of the added source lines (`git diff -U0 27b01b8..HEAD -- src` excluding specs) for quoted BCP-47 codes finds none. The one remaining `sourceLocale === 'uk-UA'` in `buildFaqLanguageInstruction` is a comparison mirrored from the description path's guard at `buildPromptC` (frozen, unchanged) and keyed to `UK_SOURCE_ANTICALQUE`, which is specific to uk-UA; it is a single master-locale code, not a language list (see N-3).

## Assessment of the ES/PT naming change (FAQ prompt now says "Castilian Spanish" and "European Portuguese")

Acceptable behaviour change; not a rule conflict, not a Specification conflict.

- Reach: `faqGenericRules` is the final `else` of `buildFaqLanguageInstruction`. `ES` and `PT` task labels exist in the registry only for the store `EXPERT3D` (`languages: ['en-ES','es-ES','pt-PT','uk-UA']`, the only group-`ES` store; `isExpert3dStore` is `group === 'ES'`). For that store, `targetLang === 'ES'` / `'PT'` is routed to `FAQ_EXPERT3D_ES_RULES` / `FAQ_EXPERT3D_PT_RULES` earlier in the chain, and those blocks already say "Castilian Spanish (es-ES)" and "European Portuguese (pt-PT)". `Expert-3DPrinter`'s `es-MX` maps to the label `American Spanish`, handled by `faqUsRules`. So with the current registry the generic branch is reached only for PL, RU, DE and UA, whose names are byte-identical to the old table (Polish, Russian, German, Ukrainian). The ES/PT change is reachable only if a future non-EXPERT3D store adds `es-ES` or `pt-PT`, and then it names the language more precisely and consistently with the description path's EXPERT3D wording.
- Specification: FR-12 item 2 requires only that the per-language rules be kept and picked by the same dispatch as the description path; item 3 and the minimum content do not pin wording, and OD-5 leaves the exact wording open. `task-c.faq.spec.ts` pins identity by regex (`/spanish/i`, `/portuguese/i`), which both names satisfy. No requirement is contradicted.
- AGENTS.md: the change is what section 3 and section 7 item 5 ask for (derive from the registry layer instead of a local table). No rule is violated.
- Prompt caching: the language block is still a cached system block depending only on `targetLang`, `storeName`, group and source locale; the name change does not make it per-product. See Check 4.
- Residual edge (N-1): for a store name absent from `STORE_REGISTRY`, `getStore` falls back to a profile whose languages are `['en-GB']`, so `taskLangToIso` returns the label unchanged and the block would read `[LANGUAGE — PL]` where the old table gave "Polish". The orchestrator derives labels from `getLangsForStore(store)`, so a label outside the store's languages is not produced by the app; the description path (`genericInstruction`) interpolates the raw label in the same way. Informational only.

## Check 1 - Architecture Rule 2 (retrieval separate from generation): HOLDS

Read: the full diff of `src/services/content-orchestrator.service.ts` (`runFaqPipeline`, `runFaqGate`, `faqTranslationPayload`, `storeFaq`, `generateFaqOnly`, and the call sites in `generate()` and `generateUaContent()`), `src/prompts/task-c.ts` (`buildFaqTranslationPayload`, `buildFaqLanguageInstruction`, `faqGenericRules`), `src/utils/faq-gate.ts`, `faq-html.ts`, `faq-form.ts`, `structural-parity.ts`, `src/app/*`.
- The only external call in the new FAQ code is `this.llm.generateText(...)` in the FAQ gate's produce step. No `RetrievalService`/`RetrievalProvider` use, no search, no fetch, no URL extraction appears in any added line; a diff-wide scan for `retriev|serper|fetch(|search|ground|http|@anthropic|openai|genai` over non-test source finds only comments.
- `git diff --stat 27b01b8..HEAD -- server package.json package-lock.json arch-guard.sh` is empty, so the retrieval service, providers and dependencies are untouched. No Google Grounding, no SDK import added.
- Fix commit 8c89bce changes only an import, a helper signature and `MASTER_LOCALE` references; it adds no I/O.
- Review-only: no command checks this rule.

## Check 2 - AGENTS.md section 4 HTML criteria: HOLDS for what is in play

Changed prompt surface: the FAQ prompt (`task-faq.ts`, `<strong>` replaced by `<b>` in the tag list) and the additive Task C FAQ variant. Description prompt, Zod schema, renderers and `output-validator.ts` are unchanged.
- Description-path parity: `buildPromptC` changed by one `opts` type widening and one early return guarded by `opts?.contentKind === 'faq'`. The 16-pair golden `test/fixtures/golden/task-c-description-prompts.json` and its spec were committed once, in `01527f4`, before any frozen edit, and have no later commit (`git log 27b01b8..HEAD` on those paths shows only `01527f4`), so they pin the pre-change bytes through both da59195 and 8c89bce.
- FAQ output contract: only `h3 p b ul li`, no attributes, no Markdown, no `<br>`, must start with `<h3>`; enforced by `validateFaqShape`; `<strong>` converted to `<b>` deterministically.
- Number/unit spacing and identical values: the FAQ produce path applies the existing normalisers to master and translations; the translation system block restates the single space between number and unit and that numbers carry over exactly.
- Currency: the FAQ prompt takes `store.currencySymbol` from the registry. A scan of added source lines for currency characters and ISO currency codes finds none outside prompt-rule prose that names no symbol.
- Figures, video embeds, spec tables, schema.org Product, meta lengths and CTA: not applicable to a FAQ and untouched on the description path (the FAQ translation variant deliberately omits CTA, delivery-region, H1 LOCK, spec-table and image-manifest blocks).
- `meta-description-currency`: `output-validator.ts` is not in the diff; the rule stays disarmed and `seo-currency-wiring.spec.ts` is untouched.

## Check 3 - STORE_REGISTRY as the only source of languages and currency: HOLDS (re-scanned across all new code)

- Languages for FAQ translation come from `getLangsForStore(...).transLangs` and `taskLangToIso`; the master gate uses `store.languages.includes(MASTER_LOCALE)`; tab order and tab keys come from `getStore(...).languages` and `bcp47ToTaskCLang`; the language display name comes from `isoToHumanLang(taskLangToIso(...))`. Currency comes from `getStore(...).currencySymbol`. No image base URL, locale set or currency literal was added.
- Re-scan result: no quoted BCP-47 code, currency symbol, currency ISO code or URL in added non-spec source lines (other than `$`-matches in template interpolation). Remaining literals are the Task C dispatch labels (`'ES'`, `'PT'`, `'Ukrainian'`, `'European English'`, `'Spanish (EXPERT3D)'`, ...) and the prompt-rule headings that name a language (`[LANGUAGE — CASTILIAN SPANISH (es-ES) FOR EXPERT3D]`, `... (en-US)`, `... (es-US)`). These are copies of the dispatch conditions the description path already uses in `buildPromptC` (FR-12 requires the same dispatch) and prompt prose inside the prompt layer, not lists that drive store or locale behaviour. See N-3.

## Check 4 - Prompt-caching block separation: HOLDS

`buildFaqTranslationPayload` returns `systemBlocks: [{ text: FAQ_TRANSLATION_SYSTEM, cache: true }, { text: buildFaqLanguageInstruction(...), cache: true }]` and keeps all per-product data (`[Store Name]`, `[BASE FAQ HTML]`) in `userContent`. The fix does not change this shape; the language instruction now also depends on `storeName` through `taskLangToIso`, which was already an input to the same function (store dispatch for EXPERT3D, C3D). `buildPromptFaq` still returns `systemBlocks` with `cache: true` and product data in `userContent`. Nothing is collapsed.

## Check 5 - FROZEN files: HOLDS (two approved edits, both re-baselined in the same commit)

- Commits in `27b01b8..HEAD` touching any frozen file or `.arch-guard-checksums`: exactly `da59195` and `8c89bce` (`git log --oneline 27b01b8..HEAD -- src/prompts/task-c.ts .arch-guard-checksums src/prompts/task-a.ts src/prompts/task-b.ts src/prompt-core/master-system-prompt.ts src/utils/output-validator.ts src/prompt-core/constants.ts`). Both commits touch `src/prompts/task-c.ts` and `.arch-guard-checksums` together.
- Frozen files changed: `src/prompts/task-c.ts` only. `task-a.ts`, `task-b.ts`, `master-system-prompt.ts`, `output-validator.ts` have no diff, and `.arch-guard-checksums` changed only on the `task-c.ts` line in each commit (8c89bce: `06867d09...` to `619c45a9...`; the other four lines byte-identical). `constants.ts` (not frozen) also has no diff.
- Section 9 grants recorded in `docs/catalog/US-8.1-pipeline-status.md`: (1) "T1 - section 9 stop and approval record", the operator's verbatim grant for `src/prompts/task-c.ts` under section 9, T1 only, with re-baseline in commit T1; (2) "Loop-back fix 1 of 3 ... section 9 stop and approval record", the operator's verbatim second grant for `src/prompts/task-c.ts` for the V-1 fix only, with same-commit re-baseline, and an explicit note that the T1 grant was not relied on. Each edit is inside its grant (da59195 additive FAQ branch and constants; 8c89bce removes the table, adds one import name and a parameter, nothing else in `task-c.ts`). I can confirm the records exist and the diffs stay in scope; I cannot independently re-observe the in-session instructions themselves.
- `bash arch-guard.sh` (read-only cross-check): exit 0, "All frozen files unchanged" against the committed baseline.

## Check 6 - Angular and server conventions: HOLDS

No `NgModule`; new state is signals; the new pure modules (`faq-form.ts`, `tab-descriptors.ts`, `faq-gate.ts`, `faq-html.ts`) have no RxJS, DOM or I/O. No SDK import outside `server/providers/` (`server/` untouched). No prompt string in a service (the orchestrator only calls `buildPromptFaq`/`buildPromptC`; `faq-provider-error` is a validation message). No secret, key, `localStorage`, `bypassSecurityTrust*` or `innerHTML` added. `server/usage/store.js` untouched. Minor design note: the FAQ form reuses `seoUseThinking`/`toggleSeoThinking` for its Deep Thinking toggle; not a rule violation.

## Check 7 - Scope discipline: HOLDS

The non-doc, non-test source set is exactly the T1-T13 files plus the fix: `task-c.ts`, `task-faq.ts`, `faq-html.ts`, `structural-parity.ts`, `faq-gate.ts`, `content-orchestrator.service.ts`, `types.ts`, `faq-form.ts`, `tab-descriptors.ts`, `app.component.ts/.html`, `README.md`, `.arch-guard-checksums`, and `tools/feedback-form/create-form.gs` (one dropdown string, flagged in the breakdown and approved with the plan). Commit 8c89bce touches 3 files (`.arch-guard-checksums`, `tab-descriptors.ts`, `task-c.ts`), 11 insertions, 14 deletions, all within V-1/V-2. No config, dependency, CI or `arch-guard.sh` change.

## Reviewer-flagged items (carried from v1, re-confirmed unchanged by 8c89bce)

- Description-path structural parity unchanged; `validateFaqStructuralParity` is a separate appended function called only from the FAQ validator.
- FAQ gate demotion (plan D6) is confined to `buildFaqValidator`/`runFaqGate`; the description gates and `validateGeneratedHtml` are unchanged.
- A provider error cannot abort the run: `produce` catches the throw, `runFaqGate` and `runFaqPipeline` wrap in try/catch, and all three entry points await it.
- `convertStrongToB` is applied after code-fence stripping and before validation, after block repair, to the master used as translation source, and again at the single write point `storeFaq`.

## Non-blocking findings

- N-1 (informational): unregistered-store fallback in `faqGenericRules` yields the raw task label as the language name (see the ES/PT assessment). Same behaviour as the description path's `genericInstruction`.
- N-2 (informational, carried from v1 V-3): `c62e30a` corrected the FR-21 assertion from `toContain('1.75 mm')` to `toMatch(/1\.75\smm/)` during IMPLEMENTATION because the unchanged normaliser emits U+00A0; the negative assertion was kept. A legitimate correction, recorded as a test change after RED.
- N-3 (informational): `sourceLocale === 'uk-UA'` and the Task C dispatch labels are retained as literals in `buildFaqLanguageInstruction` to stay identical to the description path (FR-12 same-dispatch). A future cleanup could route the guard through `MASTER_LOCALE` together with the frozen description-path guard, in one section 9 edit; not required by any rule or by this Story.

## Review-only checks (not caught by any command)

Rule 2 (Check 1); the STORE_REGISTRY literal scan, which is how V-1 was found (arch-guard implements Rules 1, 3, 4 only); the section 9 approval records and same-commit re-baseline (Check 5, beyond arch-guard's checksum compare); prompt-caching block separation (Check 4); the reachability analysis of the generic FAQ branch for the ES/PT naming change; D6 demotion blast radius and provider-error containment.

## Result

PASS. V-1 and V-2 are fixed, the fix is confined to its grant and re-baselined in the same commit, and no new violation was introduced. This is a verdict, not human approval; the artifact stays DRAFT.
