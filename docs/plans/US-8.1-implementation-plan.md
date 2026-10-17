---
artifact: implementation_plan
story: US-8.1
version: 2
status: ARCHIVED
owner: so-planner
created_at: 2026-10-14T19:00:00Z
updated_at: 2026-10-15T14:00:00Z
supersedes: docs/plans/US-8.1-implementation-plan.md#1
inputs_consumed:
  - key: story
    version: 3
  - key: specification
    version: 3
  - key: open_decisions
    version: 2
  - key: impact_analysis
    version: 2
open_decisions_blocking: false
---

# Implementation plan: US-8.1 (one master FAQ, translated; `<b>` not `<strong>`; standalone FAQ Generator)

> **Revision v2 (2026-10-15).** v1 (APPROVED, covering FR-1 to FR-23, tasks T1 to T13 already built on this branch) is
> `SUPERSEDED` by this file; its exact text is recoverable with `git show 93cca71:docs/plans/US-8.1-implementation-plan.md`.
> Decisions D1 to D11, the Approach, the v1 files table, the v1 validation strategy, risks R1 to R12, rejected alternatives 1 to 12
> and the v1 traceability rows are **kept verbatim** below. Specification v3 adds FR-24 to FR-28 and NFR-9 (Story v3,
> AC-21 to AC-26). Their design is the new, clearly separated section **"v2 revision: design delta for FR-24 to FR-28 and
> NFR-9"** at the end of this file (decisions D12 to D16, risks R13 to R20, rejected alternatives 13 to 24, traceability rows).
> D9 is *extended*, not altered, by D12 to D15 (the FAQ form order and one label key). The status is back to `DRAFT`: a revised
> plan is not approved, and the plan review and `HUMAN_PLAN_APPROVAL` must run again against it.

## Approach

The FAQ stops being a per-language generation loop and becomes one **master-then-translate pipeline**, written once and called from three places (`generate()`, `generateUaContent()`, and a new standalone `generateFaqOnly()`). The pipeline generates the FAQ once in uk-UA, then translates it sequentially into `getLangsForStore(store).transLangs`, so the languages come from `STORE_REGISTRY` and not from a literal list.

Every model-produced FAQ text (generation, translation, block repair) goes through one deterministic **`<strong>` to `<b>` rename before it is validated**. The shape of the FAQ is judged by new sibling modules, because `output-validator.ts` is FROZEN and not authorised. Those modules cover FR-9 (well-formed, five elements, no attributes, starts with `<h3>`) and FR-3 (an FAQ-only structural-parity function). All of this runs inside the existing `runRepairGate`, with an attempt cap of 3 that is a fixed FAQ constant and is independent of the user-tunable `maxRepairs()` signal.

Because the gate always returns its best artifact, even when errors remain, the pipeline makes an explicit **store-or-skip decision after the gate**: a text with a surviving FR-9 or FR-3 error is never stored. The whole FAQ step is wrapped so a thrown provider error is one failed attempt (SP-1) and can never abort the run or skip table finalisation or history.

The only FROZEN edit is **`src/prompts/task-c.ts`**, under the operator's recorded §9 permission. It is **additive**. `buildPromptC` gains an explicit `contentKind: 'faq'` option. When the option is absent the function is byte-identical to today, which is FR-13. When it is `'faq'`, an early branch builds a payload that does NOT include `MASTER_SYSTEM_PROMPT`. That frozen description schema (CTA, `<h2>` rules, spec tables) contradicts FR-12 item 3, and omitting it needs no edit to `master-system-prompt.ts`, so **no second §9 stop is planned**. `.arch-guard-checksums` is re-baselined in the same commit.

The UI adds `AppMode` `'faq-generator'`, following the SEO/Slug pattern (own signals, own form, own Generate button, shared Extended Thinking toggle). Tab derivation is extracted from the component into a pure function so that "a FAQ tab for every language" (AC-4) can be asserted by behaviour in the logic runner.

## Design decisions

### D1. Domain model (`src/domain/`): no change

The FAQ is a schema-free string artifact (`GeneratedContent.faqArtifacts: Record<string,string>` already exists). No Zod schema, no `ProductDescriptionDoc` or `ConsumablesDoc` field changes, no persisted shape changes.

- `test/fixtures/corpus/` still parses and nothing is regenerated.
- Old history items keep working, since `faqArtifacts` is unchanged in shape.
- The impact analysis confirms the renderer is not touched.

### D2. The FAQ chain: prompt, normalizer, validator, store (there is no schema or renderer link)

The chain has four links, and each agrees on the same five-element, `<b>`-only contract.

| Link | Change | Agreement mechanism |
|---|---|---|
| Prompt (master) | `task-faq.ts` output contract lists `<p>, <b>, <ul>, <li>`; `<strong>` removed from the list and from the header doc comment (FR-6). | A prompt-text test pins `<b>` present and `<strong>` absent. |
| Prompt (translation) | `task-c.ts` FAQ variant (D4). It demands element-for-element translation of the same five tags. | A prompt-text test pins the FR-12 items. Parity (D3) enforces the result. |
| Deterministic normalisation | New `convertStrongToB` plus the existing number/unit/terminology chain. | Runs in `produce` before validation, and after every block repair. |
| Validator | New `validateFaqShape` (FR-9, FR-22) and `validateFaqStructuralParity` (FR-3), plus the frozen `validateGeneratedHtml` demoted to advisory (D6). | The same function builds the gate's `validate` for master and translation, so master and translation cannot disagree about what "valid" means. |
| Store | A single choke point `storeFaq(iso, html)`. It re-applies `convertStrongToB`, then writes `faqArtifacts[iso]`. | AC-7 holds for every stored string regardless of path. |

There is no renderer link. The FAQ is displayed through `parseFaqItems` and `safeHtml`, and downloaded as `faq_${iso}.html`.

**AGENTS.md §4 criteria the FAQ must keep satisfying, and where each is enforced.** Spec FR-21 to FR-23 are the §4 constraints on the FAQ artifact.

- **Number/unit spacing.**
  - Deterministic: `fixNumberFormatting`, `fixDecimalSeparator`, `restoreIdentifierDots` and `cyrillizeUnits` are applied in the FAQ `produce` for master and every translation. The chain is moved verbatim, not removed (FR-21).
  - Prompt: `UNIT_LOCALIZATION_RULES` and the number rules in the FAQ translation prompt.
- **HTML only, no Markdown, no `<br>`.**
  - `validateFaqShape` element whitelist excludes `<br>`.
  - Narrow Markdown detection (`**x**`, line-leading `#{1,6} `, backtick fences) emits `faq-markdown-syntax`. These patterns do not occur in legitimate FAQ text.
  - `<hr>`/`</section>` does not apply (FR-22).
- **No anglicisms.** `normalizeTerminology` and `cyrillizeUnits` stay in the chain. The per-language terminology rules stay in the translation prompt (FR-12 item 2). Wording beyond the normaliser is a review criterion, not an automated one (NFR-8).
- **No Product `itemtype`.** `validateFaqShape` rejects every attribute (`faq-attribute-present`), so `itemtype`, `itemscope` and `class` are covered. That is stricter than §4 and consistent with FR-9. The frozen CRITICAL rules (`duplicate-product-schema`, FAQPage `itemtype`) still run, but advisory (D6). The FR-9 attribute rule is the one that blocks storage.

### D3. FAQ structural parity: a separate function, not a parameter

Add `validateFaqStructuralParity(master, translated, context)` to `src/utils/structural-parity.ts`. It counts `<h3>`, `<p>`, `<ul>` and `<li>` (FR-3, OD-3 default) and emits `rule: 'structural-parity-count'` in the same issue shape as the existing function.

- `validateStructuralParity`, `COUNTED_TAGS`, `restoreMediaSrcs` and the description translation loop are **untouched**. The html-editor call at `html-editor.component.ts:413` and `runOutputValidation` stay byte-equivalent (NFR-7, silent-failure risk 8).
- The FAQ is selected explicitly by calling the FAQ function. There is no HTML sniffing.
- Regexes are `<p\b`, `<ul\b`, `<h3\b` and `<li\b`. `\b` after `p` does not match `<pre`.
- No `<b>` count (OD-7 default), and no media check (a FAQ has none).
- An empty translation gives counts of 0 against the master's counts, so it is a parity failure and is retried (FR-11, FR-9 exclusion).

### D4. FROZEN `task-c.ts`: an additive FAQ variant

**Recognition (FR-12, OD-5 default).** `opts.contentKind?: 'description' | 'faq'` is added to the `opts` type of `buildPromptC`. `undefined` means description. The orchestrator's FAQ translation passes `contentKind: 'faq'` explicitly. HTML sniffing is rejected, because every description already contains `<h3>` (spec categories) and misclassifying one would break AC-18.

**Shape of the edit (FR-14).**

- Hunks inside the frozen file: the widened `opts` type, one early `return buildFaqTranslationPayload(...)` at the top of `buildPromptC`, and new constants/functions **appended below** the existing code.
- No existing constant, instruction, or line of the description path is modified.
- The FAQ text lives in `task-c.ts` itself. The operator's Story decision is "no new prompt file without necessity", and a sibling file would still need the dispatch edit in the frozen file, so it buys nothing.

**FAQ variant payload.**

- `systemBlocks[0]` is a new `FAQ_TRANSLATION_SYSTEM` block (`cache: true`). It is shared by every language and every store. **`MASTER_SYSTEM_PROMPT` is not included** (see D8 for why that avoids a second frozen-file edit).
  - Role.
  - Element-for-element translation: keep every `<h3>`, `<p>`, `<ul>`, `<li>` and add none, as FR-12 item 1.
  - The only tags are `h3, p, b, ul, li`, and `<b>` is the only emphasis tag.
  - Keep each `<b>` where the master put it.
  - HTML only, no Markdown, no `<br>`, no wrapper or attributes.
  - Number/unit spacing.
  - Numbers, units and product names unchanged, other than locale separators and unit script.
  - `NO_LEAKED_REASONING_CLAUSE`.
- `systemBlocks[1]` is a per-language FAQ instruction (`cache: true`). It is picked by the **same dispatch conditions** as the description path (EU English, US Ukrainian, American English/Spanish, EXPERT3D ES and PT, generic). It carries the per-language register, terminology and decimal-separator rules (FR-12 item 2), and reuses the shared blocks (`UNIT_LOCALIZATION_RULES`, the EXPERT3D and C3D ToV overlays, `UK_SOURCE_ANTICALQUE` when `sourceLocale === 'uk-UA'`) **only if each passes the FR-12 item 3 audit** below.
- `userContent` is `[Store Name]: ...` plus a short FAQ note plus `[BASE HTML]:`. There is no delivery-region block, no H1 LOCK, no `STANDALONE_SNIPPET_NOTE`, no `HEADING_FIDELITY`, no spec-table preservation, no simplified-template clause, and no `<hr>`/`</section>`/closing-CTA/"Technical specifications"/"What's in the box" text.

**FR-12 item 3 audit, required of the builder.** Reused shared blocks such as `PRODUCT_NAME_LOCALIZATION` mention a "closing CTA paragraph" and `[HEADING FORM]`. A block that contains description-structure instructions is NOT reused. A short FAQ-specific equivalent is written inside `task-c.ts`. `constants.ts` is never edited to make a block reusable, because that would change description prompt bytes and break FR-13. A test scans the FAQ-variant prompt for the forbidden markers: `</section>`, `<hr`, `<h2`, `COMMERCIAL CLOSING`, `CTA`, `H1 LOCK`, `Technical specifications`, `What's in the box`, `[Delivery`.

### D5. The single-master pipeline (orchestrator)

One private method `runFaqPipeline(input, useThinking)` in `content-orchestrator.service.ts`, called by `generate()` Step 5, `generateUaContent()` Step 4 and `generateFaqOnly()`. The two near-identical inline FAQ blocks are deleted, which closes silent-failure risk 1 (UA Description left uk-UA-only).

Steps:

1. **Trigger (FR-5).** If `input.supplementalContent?.trim()` is empty, return before any call.
2. **Master precondition (SP-3, provisional).** If the store does not list `MASTER_LOCALE`, `console.warn` and return without a call. Every `STORE_REGISTRY` store lists it.
3. **Master (FR-1, FR-10).**
   - `buildPromptFaq` with `humanLang = isoToHumanLang('uk-UA')`, `store.currencySymbol`, and the uk-UA native overlay (the Generator already passed it for uk-UA, and UA Description now gains it, so the pipelines are identical, FR-19).
   - Run in `runRepairGate` with label `FAQ (uk-UA)`, taskLabel `FAQ (uk-UA)` (unchanged), `maxRepairs: FAQ_MAX_ATTEMPTS - 1` where `FAQ_MAX_ATTEMPTS = 3`, and `withFeedback: appendRepairFeedback`.
   - `repairBlocks` stays but is wrapped, so its output is converted too.
4. **After the gate** decide:
   - empty after trim: terminal "no FAQ", nothing stored, no translation;
   - a contract error survived: not stored, no translation, `finalIssues` pushed to `validationIssues`;
   - otherwise `storeFaq('uk-UA', master)`.
5. **Translations (FR-2, FR-3, FR-11).** For each `taskLang` in `transLangs`, sequentially, as the description loop does, to avoid provider rate limits.
   - `buildPromptC(master, taskLang, input.website.name, store.group, undefined, { sourceLocale: 'uk-UA', contentKind: 'faq' })`. `templateId` is `undefined`, since the simplified-template clause is description-only.
   - Gate label and taskLabel `FAQ translation (${iso})`, deliberately not starting with `FAQ (`, so a legacy stub keyed on that prefix cannot mistake a translation for a generation call.
   - `validate` is the composed FAQ validator with the master supplied, so parity applies.
   - Same attempt cap.
   - Store if storable, else skip (the other languages and the master are kept), and push `finalIssues` to `validationIssues` so the failure stays visible (FR-3, FR-11).

**Attempt counting (OD-1 default, planner's choice).** An "attempt" is one `produce` call, meaning the gate's initial produce plus each full regeneration. That gives `maxRepairs = 2`. A provider exception inside `produce` is caught, returns `''` and flags the attempt as failed, so it costs one attempt (SP-1). Block-scoped patch calls (taskLabel `Block repair — …`) are single-element edits of an existing artifact. They are not counted as attempts and are not made to the FAQ generation prompt.

**Provider error (SP-1 default).** `produce` is `try { llm.generateText } catch { threw = true; return '' }`. `validate` returns one `faq-provider-error` error (no `path`, so `resolveLadder` gives `['full-regen']`) when `threw` is true. For the master this is distinct from the legitimately empty response, which gives no issues and ends the gate.

**Safety net.** Each gate call is additionally wrapped in `try/catch` (a throw from the block repairer would otherwise escape). On catch, that artifact counts as failed and is not stored. The pipeline method itself never throws, so the steps after it (`runOutputValidation`, `finalizeTablesForDisplay`, `historyService.add`) always run (silent-failure risk 3). Output produced before the FAQ step is never touched (FR-10, FR-11).

**Call-site integration.**

- In `generate()`, the pipeline replaces Step 5 and runs before `runOutputValidation`, as the FAQ did.
- In `generateUaContent()`, it replaces Step 4.
- In both, the surrounding code (post-validation, table finalisation, history) is unchanged.

**Seam for OD-6 (see Open points).** The FAQ translation call parameters (`useThinking`, protected-name wrapping, store-specific replacements) are set at **one** place, a small `faqTranslationPayload(...)` and `useThinking` pass-through. Initial wiring mirrors today's FAQ path and the description loop's thinking flag. It adds no protected-name block and no Spanish URL replacements. The human can change either by editing that one place.

### D6. Validation composition and the store-or-skip rule

New `src/utils/faq-gate.ts` (pure) builds the gate's `validate`:

- **Contract errors** (they drive regeneration and block storage): `faq-provider-error`, the `validateFaqShape` rules (`faq-not-well-formed`, `faq-element-not-allowed`, `faq-attribute-present`, `faq-must-start-with-h3`, `faq-markdown-syntax`), and `structural-parity-count` (translations only).
- **Advisory findings:** every issue from the frozen `validateGeneratedHtml` and the existing `non-html-output` check, kept with rule id and detail but demoted to `severity: 'warning'`.

Why demote? FR-10 says "after a valid master, no further master call is made", and "valid" is defined as FR-9. If the frozen validator's errors still drove the gate, a FR-9-valid master could be regenerated, which would break AC-1 and FR-10. The FR-9 attribute and element rules already cover the frozen CRITICAL cases that matter for §4 (`itemtype`, a second `<h1>`).

The consequence is that the FAQ no longer gets one extra full regeneration for a frozen-validator error. Those findings still surface in the repair report and the validation panel, and warnings still reach the block-scoped rung where a strategy is registered. This is recorded as a risk (R3).

`isFaqStorable(finalIssues)` is true when no contract rule is present at error severity. It is the only storage decision.

`repair-strategy.ts` is **not changed**. A rule with no `path` resolves to `['full-regen']` (`resolveLadder`), which is exactly what these rules need. A test pins `resolveLadder` for every new rule id so an accidental registration cannot slip in. The impact analysis listed this file as "must change"; verified: registration would only be needed for a non-default ladder.

### D7. `<strong>` to `<b>` (FR-7, FR-8) and `validateFaqShape` (FR-9)

New `src/utils/faq-html.ts`, pure, no DOM, no clock, no randomness (NFR-8).

- **`convertStrongToB(html)`** rewrites the tag name only: `/<(\/?)strong(?=[\s/>])/gi` becomes `<$1b`.
  - Case-insensitive, total on any input, idempotent.
  - Attributes are left as they are (OD-7), so a `<strong class=…>` becomes `<b class=…>` and FR-9 then rejects the attribute.
  - `<b>` and every bold lead sentence are never touched (FR-8).
- **Placement.**
  - In `produce`, immediately after `stripCodeFences` and before the number/unit chain and before any validation.
  - Wrapped around `repairBlocks`, so a rewritten block cannot re-enter `<strong>` (silent-failure risk 4).
  - Again in `storeFaq` as a final choke point.
- **`validateFaqShape(html, context)`** is a small stack-based tag tokenizer, not `DOMParser`. `DOMParser` silently repairs unclosed and mismatched tags, which is exactly what AC-9 must detect, and the logic runner has no browser DOM. It runs on a text where `<strong>` is already `<b>`.
  - Rules: unclosed or mismatched tag, or stray `<` (`faq-not-well-formed`).
  - Element not in `h3,p,b,ul,li`, case-insensitive (`faq-element-not-allowed`).
  - Any attribute (`faq-attribute-present`).
  - Does not start with `<h3` after trim (`faq-must-start-with-h3`), plus `faq-markdown-syntax` as above.
  - Empty or whitespace-only input yields no issues. Empty is FR-10's terminal outcome for the master and FR-3's parity failure for a translation, so the shape check must not claim it.

### D8. Prompt payload contract (`src/prompt-core/payload.ts`): unchanged shape

`PromptPayload` is not changed.

- **`systemBlocks` and `userContent` stay separate** in every changed builder. All dynamic content (store, product, `[BASE HTML]`) is in `userContent`.
- **Caching consequence.** The FAQ translation no longer starts with the ~35 KB `MASTER_SYSTEM_PROMPT` cached prefix. It has its own cached `FAQ_TRANSLATION_SYSTEM` block, shared across all 16 non-master pairs and all stores, plus a per-language cached block. Tokens per call fall sharply. The risk is that the FAQ-specific system block may be smaller than the provider's minimum cacheable size, in which case it is silently not cached. That is cheaper than the old design in absolute terms and is accepted (NFR-4 only requires `cache: true` and no collapse into `userContent`).
- The description path is byte-identical (FR-13), and the existing goldens stay green with no `-u`.
- `buildPromptFaq`'s signature is unchanged. `FAQ_TRANSLATION_SYSTEM` is a constant inside `task-c.ts`, so NFR-3 (prompt text lives in the prompt layer) holds and `arch-guard` Rule 3 is not tripped by the orchestrator.

**Why `master-system-prompt.ts` is not edited.** It is 35 KB of description schema (`§2` to `§9` including `COMMERCIAL CLOSING / CTA`, `<h2>`/`<ol>`/`<section>` rules, HEADING FORM). Omitting it from the FAQ variant inside `task-c.ts`, which is within the permission, is sufficient for FR-12 item 3. This answers the impact analysis's Unknown 1. If the builder finds a FAQ-needed rule that exists only in that file, the right move is to restate it compactly in `FAQ_TRANSLATION_SYSTEM`. Editing the frozen master prompt would be a **new §9 stop** and is not planned.

### D9. Angular surface (`src/app`)

Standalone component, signals and `inject()` as the code base does. No RxJS is introduced. `OnPush` is not added, since `AppComponent` is not OnPush today and this Story does not change that.

**`types.ts`.** `AppMode` gains `'faq-generator'`. `TOOL_LABEL: Record<AppMode,string>` (a compile-time exhaustiveness check) gains `'FAQ Generator'`.

**Component state.**

- New signals: `faqSelectedWebsite`, `faqProductName`, `faqDescription`, `faqSpecs`, `faqSupplementalContent`.
- `isFaqFormValid` is computed through a small pure predicate `isFaqFormComplete({website, productName, supplementalContent})` in `src/utils/faq-form.ts`. Whitespace-only counts as empty (FR-16), and the predicate is testable by behaviour.
- The Extended Thinking toggle is the existing one, bound to `seoUseThinking` / `toggleSeoThinking()`, the signal SEO and Slug already share. AC-10 asks for "the same toggle", and this keeps one value across the standalone tools.
- `generateFaqOnly()` re-checks `isFaqFormValid()` and returns without any call otherwise (FR-16 failure path). The orchestrator method has its own blank-supplemental guard (defence in depth).
- `activeProductName` gets a `'faq-generator'` branch.
- `clearAll()` gets a `'faq-generator'` branch that clears the FAQ signals and `faqArtifacts`.
- `hasFaqOutput` is computed, and `hasOutput` includes it so the existing download controls appear.

**Tab derivation extracted.**

- The body of `tabDescriptors` moves to a pure `deriveTabDescriptors(ctx)` in `src/app/tab-descriptors.ts`. The computed becomes a thin call.
- It gains the FAQ-only and UA-Description cases: `ua-generator` returns one description tab plus one FAQ tab for **every** language with an entry, uk-UA first (FR-4). `faq-generator` returns FAQ tabs only (no `html` tab, no SEO tab), uk-UA first.
- Existing Generator output is asserted unchanged by a snapshot test. The extraction is behaviour-preserving for modes other than the two above.
- `_autoSelectTab` must not add the `'seo'` id for `faq-generator`.
- Tab ids already in use are reused: `faq-html` for uk-UA, `faq-trans-${iso}` for the others. The existing panel template already renders them from `faqArtifacts[tab.iso]`.

**Template (`app.component.html`).**

- A mode button in the vacant cell of the existing `grid-cols-2` UA row.
- An `@else if (appMode()==='faq-generator')` form block modelled on the SEO and Slug forms. It uses `app-source-input` for Description, Tech Specs and Supplemental Content, and does **not** use `content-template-select`. The template-wiring spec pins that component at exactly two usages.
- A Generate button in the button chain, bound to `isGenerating() || !isFaqFormValid()`.
- `'faq-generator'` added to the three "generator/ua/seo/slug" conditions (lines ~930, ~1174, ~1183) and to the header `@if`.
- The SEO tab button is hidden for the FAQ mode.
- `TRANSLATIONS` en and uk label maps gain the mode label (both `FAQ Generator`, so AC-10 holds in either UI language), a form title and a button label.

`tools/feedback-form/create-form.gs` gets the `'FAQ Generator'` dropdown entry, per the comment on `TOOL_LABEL`. `README.md` is updated at the three places the Story names plus "Tools & modes".

**What the component-level checks drive.** A real `AppComponent` spec is not added (heavy DI, a prior deliberate decision). FR-15, FR-16 and FR-17 are covered by source-text pins in the existing `app.component.template-wiring.spec.ts` idiom plus the pure predicate and `deriveTabDescriptors` tests, all under `test:logic`.

**`restoreHistory` is unchanged.** It always opens Generator mode, exactly as for SEO-only and Slug-only history items today (OD-9d, see Open points).

### D10. Server surface (`server/`): none

No `server/**` file changes. New `taskLabel` strings (`FAQ translation (iso)`, `Block repair — FAQ translation (iso)`) are existing free-text telemetry fields. `server/usage/store.js` gets no new column, so the `CREATE TABLE IF NOT EXISTS` no-migration hazard is not tripped. Existing installs need nothing.

### D11. History and standalone result shape (FR-18, FR-20)

`generateFaqOnly(input, useThinking)` sits beside `generateSeoMetadata`/`generateSlugs`.

1. Return at once, with no state change and no call, if supplemental content is blank.
2. Reset `content` to `{ mainHtmlUa:'', translations:{}, seoData:null, slugData:null, website, faqArtifacts:{}, mainHtmlLocale:'uk-UA' }`. This is the AC-13 shape. `mainHtmlLocale` follows `generateUaContent`, so the master tab is labelled correctly. Also reset `validationIssues`, `repairReport` and the patch tallies, and set `repairReportMeta`.
3. `await withProgress(...)`: `runFaqPipeline`, then `historyService.add(input, this.content())`, then progress "FAQ Generation Done!".

It makes no `buildPromptA`/`B`/slug call and runs no `runOutputValidation` or `finalizeTablesForDisplay`, since there is no description. The ZIP behaviour for an empty `mainHtmlUa` (an empty `description_*.html` entry) is **pre-existing** for SEO-only and Slug-only runs. It is left unchanged and recorded in Open points under OD-9.

## Files to create / modify

Derived from the impact analysis, not re-surveyed. Test files are listed so the gaps are visible; `so-test-writer` writes them.

**Modify (production)**

| File | Change |
|---|---|
| `src/prompts/task-faq.ts` | FR-6: drop `<strong>` from the tag list and header comment. |
| `src/prompts/task-c.ts` (FROZEN, authorised) | `contentKind` option, early FAQ branch, appended FAQ constants/functions. Nothing in the description path changes (D4). |
| `.arch-guard-checksums` | Re-baselined, in the same commit as `task-c.ts`. |
| `src/utils/structural-parity.ts` | Add `validateFaqStructuralParity`. |
| `src/services/content-orchestrator.service.ts` | Add `runFaqPipeline`, `generateFaqOnly` and the `storeFaq` choke point. Replace the two inline FAQ blocks. |
| `src/app/types.ts` | `AppMode` + `'faq-generator'`. |
| `src/app/app.component.ts` | Signals, predicate use, `generateFaqOnly`, `activeProductName`, `clearAll`, `TOOL_LABEL`, `TRANSLATIONS`, `hasFaqOutput`/`hasOutput`, `tabDescriptors` delegating, `_autoSelectTab`. |
| `src/app/app.component.html` | Mode button, FAQ form, Generate button, extended view conditions, SEO tab hidden for FAQ mode. |
| `README.md` | "FAQ / HowTo artifacts", "How generation works" step 5, Usage step 3, "Tools & modes". |
| `tools/feedback-form/create-form.gs` | Dropdown entry `'FAQ Generator'`. |

**Create (production)**

| File | Purpose |
|---|---|
| `src/utils/faq-html.ts` | `convertStrongToB`, `validateFaqShape`, allowed-element set and contract rule ids. |
| `src/utils/faq-gate.ts` | `FAQ_MAX_ATTEMPTS`, `buildFaqValidator` (D6 composition), `isFaqStorable`. |
| `src/utils/faq-form.ts` | `isFaqFormComplete`. |
| `src/app/tab-descriptors.ts` | `deriveTabDescriptors`. |

**Tests (proposed for TEST_WRITING, not written here).** All run in `test:logic`.

- `src/utils/faq-html.spec.ts`
- `src/utils/faq-gate.spec.ts`
- `src/utils/structural-parity.faq.spec.ts`
- `src/utils/faq-form.spec.ts`
- `src/app/tab-descriptors.spec.ts`
- `src/prompts/task-faq.spec.ts` (extend)
- `src/prompts/task-c.faq.spec.ts`
- `src/prompts/task-c.description-bytes.spec.ts` with a new golden `test/fixtures/golden/task-c-description-prompts.json`
- `src/services/content-orchestrator.faq-pipeline.spec.ts`
- `src/services/content-orchestrator.simplified.spec.ts` (R6 block rewritten)
- `src/app/app.component.template-wiring.spec.ts` (extend)

**Not changed:** `src/domain/**`, `src/render/**`, `server/**`, `src/utils/output-validator.ts`, `src/prompts/task-a.ts`, `src/prompts/task-b.ts`, `src/prompt-core/master-system-prompt.ts`, `src/prompt-core/payload.ts`, `src/prompt-core/constants.ts`, `src/utils/repair-strategy.ts`, `src/utils/zip-generator.ts`, `html-editor.component.ts`, corpus fixtures and the existing goldens.

## FROZEN-file position

- **`src/prompts/task-c.ts`: edited, within the operator's recorded §9 permission** ("modify `src/prompts/task-c.ts`", 2026-10-14, in the Story). The plan does not grant or extend it. The edit is purely additive, and `.arch-guard-checksums` is re-baselined in the same commit via `bash arch-guard.sh --rebaseline` (FR-14). The diff of `.arch-guard-checksums` must show only the `task-c.ts` line changed.
- **`src/prompt-core/master-system-prompt.ts`: NOT edited.** Reached only through `task-c.ts`, and avoided by not including it in the FAQ variant (D8). If the builder concludes the FAQ variant cannot work without editing it, that is a **new §9 stop**: state exactly what and why, then wait for explicit approval.
- **`src/utils/output-validator.ts`: NOT edited.** FR-9 checks live in the sibling `faq-html.ts` (the precedent is `seo-metadata-shape.ts` and `image-manifest-coverage.ts`). The frozen validator still runs on the FAQ as an advisory check.
- **`task-a.ts` and `task-b.ts`: not touched.** The FAQ does not pass through them.

## Validation strategy

All new tests run in **`test:logic`** (vitest, `src/**/*.spec.ts` and `test/**/*.spec.ts`). `test:components` (`ng test`, `*.component.spec.ts`) gains **no** file. No test is weakened or excluded.

| Category | Against what | Runner |
|---|---|---|
| Pure unit | `convertStrongToB` (plain, uppercase, with attribute, nested, already `<b>`, idempotent, total on garbage); `validateFaqShape` (unclosed, mismatched, `<br>`, `<h2>`, `class`, `itemtype`, not starting with `<h3`, Markdown, empty yields nothing); `isFaqStorable`; `resolveLadder` for every new rule id equals `['full-regen']`. | logic |
| Parity | `validateFaqStructuralParity` accepts equal `h3/p/ul/li` counts and rejects a dropped or added one of each, and an empty translation. **Existing** `validateStructuralParity` specs unchanged and green, proving description parity is not changed. | logic |
| Prompt text, FAQ | `buildPromptFaq`: `<b>` listed, `<strong>` absent (FR-6). Task C FAQ variant: FR-12 items 1 to 3 pinned; forbidden-marker scan; `systemBlocks` all `cache: true` and stable across calls; dynamic data only in `userContent` (NFR-4); no `MASTER_SYSTEM_PROMPT` text. | logic |
| Prompt text, FR-13 byte identity | A new golden captured from the **unmodified** `task-c.ts`, over every `STORE_REGISTRY` store x every non-master language (16 pairs), with and without `opts`. Plus the existing 12-key golden unchanged with no `-u`. | logic |
| Orchestrator with a stubbed LLM | Per store, all 7 (N = 2 to 5, including `Drukarka 3D` with one translation), calls counted by `taskLabel`. Covers AC-1, 2, 4, 5, 7, 8, 9, 16, 17 and 18 (blank and whitespace-only supplemental yield zero calls); a master invalid 3 times gives 3 master calls, no translation, an empty `faqArtifacts` and a retained description; a translation failing 3 times is skipped and the others kept; a provider throw is one attempt and does not abort the run, and table finalisation and history still happen; a `<strong>` stub on every call yields zero `<strong>` stored and no extra attempt; `1.75mm` is stored as `1.75 mm`; the FAQ Generator makes no description, SEO or slug call and leaves `mainHtmlUa === ''`, `translations === {}`, `seoData/slugData === null`; one history entry. The R6 block in `content-orchestrator.simplified.spec.ts` is rewritten, and the other orchestrator specs stay green. | logic |
| UI | `deriveTabDescriptors`: a UA Description FAQ tab per language, FAQ-only tabs with no `html`/SEO tab, and a snapshot proving Generator output is unchanged. `isFaqFormComplete`: whitespace-only is empty. Template pins: FAQ Generator label, the toggle binding, button `[disabled]`, no `content-template-select` in the FAQ form. | logic |
| Frozen-file baseline | `bash arch-guard.sh` exits 0 after rebaseline (FR-14). | gate command |
| Static and build | `npm run lint` (`tsc --noEmit`: `AppMode`/`TOOL_LABEL` exhaustiveness), `npm run build` (template type-check), `npm run test:coverage`. | gate commands |

## Risks

| # | Risk | How it would surface |
|---|---|---|
| R1 | **Old behaviour lingers in one of the three call sites.** | The per-store orchestrator test covers `generate()` and `generateUaContent()` explicitly. Leaving `generateUaContent()` untouched shows as `faqArtifacts` of size 1 in the AC-4 test. |
| R2 | **The gate stores an invalid artifact** because `runRepairGate` returns its best artifact. | `isFaqStorable` is tested on a master that is invalid 3 times and a translation failing parity 3 times. Both must be absent from `faqArtifacts`. |
| R3 | **Demoting the frozen validator's errors on the FAQ** removes the extra regeneration the FAQ used to get for those findings. | They remain in the repair report and validation panel. A spec states that a FR-9-valid master with a frozen-validator finding makes exactly one master call (FR-10). If the human reads "valid" as "passes every check", revert to leaving them as errors. |
| R4 | **`<strong>` re-enters via block repair.** | Conversion wraps `repairBlocks` and runs again in `storeFaq`. The test uses a stub block repairer that returns `<strong>`. |
| R5 | **Task C FAQ variant leaks description-only text** (FR-12 item 3), or the shared blocks it reuses carry such text. | The forbidden-marker scan test. A block that fails is replaced inside `task-c.ts`, never by editing `constants.ts`. |
| R6 | **A description prompt byte changes** (FR-13), breaking every description translation. | The 16-pair golden captured before the edit, plus the existing goldens. The captured golden is the reference, so it must be committed before the `task-c.ts` edit. |
| R7 | **Quality of FAQ translations is unmeasured.** No stubbed test proves a live model returns the master's element counts. | Parity plus retries plus skip is the designed safety net. Free wording (FR-21 and FR-23 beyond normaliser and prompt text) is a review criterion (NFR-8). A skipped language shows as a missing tab plus a validation issue. |
| R8 | **Attempt budget cost.** Up to 3 generation calls for the master and for each of up to 4 languages (about 15 calls worst case), plus block-repair calls that are not counted. | The telemetry labels separate master, translation and block repair, so spend is visible in the usage database. |
| R9 | **FAQ-only run renders no tabs.** `tabDescriptors` previously skipped every non-master language with no `translations` entry. | The `deriveTabDescriptors` test with `mainHtmlUa: ''`, `translations: {}` and a populated `faqArtifacts`. |
| R10 | **Extracting `tabDescriptors` regresses Generator tab order or labels.** | A snapshot test over all 7 stores in Generator mode, generated from the pre-extraction function. |
| R11 | **`.arch-guard-checksums` committed separately, or other checksum drift.** Memory notes this baseline has lagged before. | `bash arch-guard.sh` exits 0, and `git diff` of the checksums shows only the `task-c.ts` line. |
| R12 | **A uk-UA master error reaches every language.** A bad master wastes N-1 translations. | Parity cannot detect a wrong-but-well-formed master. Mitigated by validating the master (FR-9) before any translation call. A bad master fact is a review concern. |

## Rejected alternatives

1. **A parameter on `validateStructuralParity` (`{kind:'faq'}`) instead of a separate function.** It would work, but it touches the signature of a function shared with the HTML editor and the description loop. A separate function makes FR-3's "description parity unchanged" true by construction.
2. **A new prompt file (`task-c-faq.ts`).** The Story says no new prompt file without necessity. The frozen `task-c.ts` still needs the dispatch edit, so a sibling would not avoid the §9 permission.
3. **Keep `MASTER_SYSTEM_PROMPT` in the FAQ variant and add an "ignore the description rules" override.** About 35 KB of CTA, `<h2>` and spec-table instructions would sit in front of a clause fighting them. That does not satisfy FR-12 item 3 in a way a test can pin.
4. **Edit `master-system-prompt.ts` to add a FAQ mode.** Not authorised. It would be a new §9 stop and is unnecessary.
5. **Detect a FAQ input by sniffing `<h3>` in the HTML.** Every description contains `<h3>`, so a misclassification silently changes description translation (AC-18).
6. **Convert `<strong>` only on the stored result (after validation).** `<strong>` would then trip FR-9 and cost attempts, contradicting FR-7 and AC-7's "no retry caused by the tag".
7. **`DOMParser` for well-formedness.** It silently repairs the very defects AC-9 must detect, and the logic runner has no browser DOM.
8. **Reuse `this.maxRepairs()` as the attempt cap.** It is a user-tunable signal defaulting to 1, which would give 2 attempts instead of 3 and change the contract when a user edits it.
9. **A hand-written 3-attempt loop instead of `runRepairGate`.** It would duplicate the ladder, repair report and feedback mechanism, and FR-9 says the checks are enforced in the same validate-and-repair gate.
10. **`Promise.all` for the translations.** The code base is sequential everywhere to respect provider rate limits.
11. **A real `AppComponent` spec for FR-15/16/17.** A prior deliberate decision rejects it (heavy DI). It would also add a third file to `test:components`. Extracted pure functions plus source-text pins give the same coverage in `test:logic`.
12. **Leave the FAQ pipeline inline in both `generate()` and `generateUaContent()` (as today).** That is what allowed the divergence (UA Description uk-UA-only, no overlay). One shared method is the only way FR-19 ("same pipeline") is true by construction.

## Traceability

| Requirement | Design decision / file |
|---|---|
| FR-1 | D5 step 3, master gate; `task-faq.ts` prompt unchanged apart from tags; `content-orchestrator.service.ts` |
| FR-2 | D5 steps 4 to 5 (`transLangs` from `getLangsForStore`, store per language) |
| FR-3 | D3, `structural-parity.ts`; D6 composition |
| FR-4 | D5 call site in `generateUaContent()`; D9 `deriveTabDescriptors` (a tab per language) |
| FR-5 | D5 step 1 (trigger guard); D11 step 1 |
| FR-6 | D2 `task-faq.ts` row |
| FR-7 | D7 `convertStrongToB` and its three placements; D2 store choke point |
| FR-8 | D7 (`<b>` never touched); orchestrator test |
| FR-9 | D7 `validateFaqShape`; D6 composition; `faq-html.ts` |
| FR-10 | D5 attempt counting, terminal empty, provider error; D6 `isFaqStorable` |
| FR-11 | D5 step 5, skip rule; `validationIssues` push |
| FR-12 | D4 FAQ variant and audit; `task-c.ts` |
| FR-13 | D4 additive edit; D8; 16-pair golden |
| FR-14 | FROZEN-file position; `.arch-guard-checksums`; R11 |
| FR-15 | D9 mode button, `types.ts`, `TOOL_LABEL`, `TRANSLATIONS`, shared toggle |
| FR-16 | D9 `isFaqFormComplete`, button binding, the guard in `generateFaqOnly()` and in the orchestrator method |
| FR-17 | D9 FAQ form fields; `ProductInput.description` and `specs` flow to `buildPromptFaq` |
| FR-18 | D11 result shape; D5 |
| FR-19 | D5 (one shared `runFaqPipeline`); Rejected 12 |
| FR-20 | D11 step 3 (`historyService.add`); OD-8 point below |
| FR-21 | D2 normaliser chain in the FAQ `produce` for master and translation; D4 number rules in the prompt |
| FR-22 | D2 and D7 (`validateFaqShape` whitelist plus Markdown rule) |
| FR-23 | D2 (`normalizeTerminology` stays; FR-9 attribute rule); D4 terminology rules |
| NFR-1 | All FAQ calls go through `this.llm.generateText` (`LlmProvider`); no provider branch |
| NFR-2 | The pipeline has no `retrieval` call; the reviewer checks this by reading (no automated check) |
| NFR-3 | D4 and D8: all prompt text in `task-c.ts` and `task-faq.ts` |
| NFR-4 | D8 |
| NFR-5 | `getLangsForStore`, `MASTER_LOCALE`, `store.currencySymbol`; no literal list or symbol |
| NFR-6 | D10; no new key path |
| NFR-7 | D3, D8, D9 snapshot, D10 |
| NFR-8 | D7: pure functions; stubbed-LLM tests only |

## Open points carried, not resolved

These are recorded so a human can decide them at HUMAN_PLAN_APPROVAL. None blocks planning. The plan follows the carried defaults where the Specification carries one, and isolates the rest.

- **OD-6 (no Specification default; no FR).** FAQ translation model tier, extra normalisers, extra validators and the protected-name block. The plan wires today's FAQ behaviour (the thinking flag as the description loop passes it, the existing FAQ normaliser chain, no `withProtectedNameBlock`, no `applySpanishExpert3dReplacements`) behind the single seam in D5. If the human adopts the clarifier's default (`withProtectedNameBlock` on the translation), it is a one-line change in `userContent` only, with no `systemBlocks` or caching impact. SP-2 (do translations preserve numbers, units and the product name) depends on the same decision and is covered only at prompt level (D4).
- **OD-8 (no FR).** Operator-facing wording and severity for a skipped language or dropped FAQ. The plan only pushes the surviving `finalIssues` into `validationIssues`, which FR-3 and FR-11 require. No new message. History is written at the end of every `generateFaqOnly` run that did not throw, mirroring `generateSeoMetadata`/`generateSlugs`.
- **OD-9 (no FR beyond AC-10 to AC-15).** The tab layout, state reset and history restore use the clarifier's default: own signals (the SEO/Slug pattern), FAQ tabs only, master first, mode switch clears the FAQ output, and `restoreHistory` unchanged. A standalone ZIP still contains an empty `description_uk-UA.html` entry, exactly as SEO-only and Slug-only runs do today (`zip-generator.ts` untouched).
- **SP-1** follows the Specification's carried default (D5). **SP-3** is handled provisionally by skipping with a warning and making no call (D5 step 2). **SP-2** is as under OD-6.
- **FR-12 recognition and wording (OD-5).** The plan takes the carried default (explicit `contentKind` option). The exact wording and the set of reused shared blocks are for the builder under the D4 audit.
- **Numbering note for v2.** Open Decisions v2 logs Specification v2's SP-1, SP-2 and SP-3 as **OD-18, OD-19 and OD-20**, and OD-1 to OD-9 keep their ids. The "SP-n" labels in D5, D6 and the points above mean those ODs. Nothing about them changed; none is resolved here.

---

# v2 revision: design delta for FR-24 to FR-28 and NFR-9

This section is the whole of the v2 design change. It does not alter the FAQ pipeline built by T1 to T13.

## v2 Approach

Specification v3 changes only the screen of the FAQ Generator mode (`faq-generator`): no empty-state block (FR-24), the result directly
under the version tabs (FR-25), a new form field order (FR-26), a "Required" label for Supplemental Content (FR-27), and every other
mode unchanged (FR-28). It is a **two-file, template-and-labels change**: `src/app/app.component.html` and `src/app/app.component.ts`
(only the `TRANSLATIONS` literal). There are four edits, all confined to FAQ Generator branches or to one new label key:

1. One extra mode term in the single empty-state `@if` condition.
2. One cut-and-paste of the Supplemental Content `app-source-input` inside the FAQ form.
3. One changed `[label]` binding on that same input.
4. One new label key in both `TRANSLATIONS` blocks.

FR-25 needs **no edit of its own**: it is satisfied by edit 1, because the empty-state block is the only element that can sit between the tab bar and the result in the FAQ branch (D13). No component logic, signal, computed, predicate, orchestrator, prompt, renderer, validator, server file or already-built FR-1 to FR-23 file changes. The tests are new source-text pins under `test:logic` (D16).

Inputs verified against the code on this branch (HEAD 93cca71, tree clean) rather than copied from the impact analysis. Every claim below that the impact analysis made and that I re-read is marked as such; the one claim I found to be wrong is in D15.

## D12. FR-24 and the empty-state half of FR-28: mode-scoped exclusion at the one condition

**Verified.** `noContentYet` and `fillFormStart` are referenced once each, at `app.component.html:1450-1451`, inside the single block guarded by (line 1447):

```
@if (appMode() !== 'generator' && !content().mainHtmlUa && !content().seoData && !content().slugData && !isGenerating())
```

This block sits in the result view under the outer `generator | ua-generator | seo-generator | slug-generator | faq-generator` condition (line 1280) and inside the tab-bar condition (line 1289), so it is reached by `ua-generator`, `seo-generator`, `slug-generator` and `faq-generator`. A standalone FAQ run leaves `mainHtmlUa === ''`, `seoData === null`, `slugData === null` (FR-18, pinned by `content-orchestrator.faq-standalone.spec.ts:176`), so today the block shows for `faq-generator` before **and after** a run. `content` is one shared signal across modes and `setMode()` does not reset it, so a data-derived guard would leak across modes (impact silent-failure risk 1).

**Decision.** Add exactly one conjunct to that condition, scoped by `appMode()` and nothing else:

```
@if (appMode() !== 'generator' && appMode() !== 'faq-generator' && !content().mainHtmlUa && !content().seoData && !content().slugData && !isGenerating())
```

- Every existing conjunct stays, in the same order and text. For any mode other than `faq-generator` the new expression is logically identical to today's, so FR-28 ("rendered exactly when it is rendered today", in particular SEO and Slug Generator before their first run) holds **by construction**, not by a case-by-case argument.
- For `faq-generator` the new conjunct is false in every state, so the block is absent before a run, during a run and after a run, including a run that stores no FAQ (the FR-24 failure path).
- The condition is **not** derived from `hasOutput()`, `hasFaqOutput()`, `faqArtifacts` or any other shared data. `mainHtmlUa`, `translations`, `seoData`, `slugData` and `faqArtifacts` are not changed to dodge the block, so FR-18/AC-13 hold exactly as built (`''`, `{}`, `null`, `null`).
- The three `appMode() === 'slug-generator' ... appMode() === 'faq-generator'` lines (1032, 1280, 1289) and the `!==` line 1316 are **not touched**. The new conjunct uses `!==` and does not mention `slug-generator`, so the brittle `>= 3` line-count pin at `app.component.template-wiring.spec.ts:236-239` still counts exactly the same three lines. No line is reformatted, wrapped or extracted, and no `isFaqOnlyMode` helper is introduced.

The condition stays in the template as a single expression made only of `appMode()`, `content()` and `isGenerating()`. That is deliberate: it keeps it evaluable by the verification in D16.

## D13. FR-25: no reorder; satisfied structurally by D12; panels stay (OD-12 default)

**Verified.** Between the tab-bar `</header>` (line 1341) and the first `@for (tab of tabDescriptors()` (line 1455) the scroll container (`flex-1 overflow-y-auto p-8 relative`, line 1343) holds exactly three siblings: the validation `<details>` (condition `validationIssues().length > 0 && !isGenerating()`), the repair `<details>` (condition `repairReport().length > 0 && ...`), and the empty-state block. Both `<details>` are `max-w-5xl mx-auto mb-6` (no centring, not full height). The empty-state block is the only `h-full flex ... justify-center` element and is what pushed the result down. The container itself is a plain block (no `flex`, `grid`, `items-*` or `justify-*` token; `flex-1` is its role as a child of the column layout, not a layout of its content). The FAQ panels (line 1515) are `max-w-5xl mx-auto space-y-6`.

**Decision.**

- **No template reorder and no extra wrapper.** After D12, in the no-panel case the FAQ result panel is the first child of the container directly below the tab bar, which is FR-25 clauses 1 and 2.
- **OD-12 default kept:** the validation and repair panels stay above the result, and FR-25 is asserted for the no-panel case. When a panel is shown (a run with a skipped language, OD-8), FR-25 holds only vacuously; this is the Specification's flagged consequence, not a design defect.
- **OD-11 default kept:** the tab-bar `<header>` (line 1289) is rendered for `faq-generator` unconditionally and is an empty bordered strip before a run. Hiding it would mean rewriting line 1289, which would disturb the `>= 3` pin and is not asked by any requirement; it is left to the human.
- **OD-16 accepted as flagged:** a run that stores no FAQ leaves a blank central area. No message is added here (the failure-state message stays with OD-8).
- **OD-14 default kept:** tab labels and styling are untouched.

## D14. FR-26: move the Supplemental Content input directly after Product Name

In the FAQ form block (`@else if (appMode() === 'faq-generator')`, lines 571-651), cut the Supplemental `<app-source-input>` (lines 625-633) and paste it between the Product Name `<div class="space-y-2">` (ends line 604) and the Original Description input (line 606). Resulting DOM order: Target Website select, Product Name input, Supplemental Content, Original Description, Tech Specs, then the Deep Thinking toggle.

- **Everything about the moved element is preserved except the label key (D15):** `[placeholder]="uiLabels().placeholderSupplemental"`, `[labels]`, `[accent]="'blue'"`, **`[required]="true"`**, `[textHeight]`, `[value]="faqSupplementalContent()"` and `(valueChange)="faqSupplementalContent.set($event)"`. FR-27's required marker (the `*` rendered by `source-input.component.html:4` from `[required]`) and FR-16/AC-25 enablement (`isFaqFormComplete`, unchanged) are therefore untouched.
- No signal, predicate or handler changes: the five inputs are independent signals, so order is a template-only matter. DOM order is the keyboard tab order, so focus order follows the new field order.
- The existing pins keep passing: `>= 3` `app-source-input` in the block (213-217); exactly one input with `(valueChange)="faqSupplementalContent.set($event)"`, containing `[value]="faqSupplementalContent()"` and `[required]="true"` (333-341); the `faqForm()` helper's start/end anchors (`\n    @else if (appMode() === 'faq-generator')` to the next 4-space `\n    @else`) are not affected because the moved element keeps its 8-space indent and adds no 4-space `@else` line.
- `README.md` needs no change: line 113 already lists the needed fields as Store, Product Name, Supplemental Content and states no field order or label text.

## D15. FR-27 and the label half of FR-28: a new FAQ-only label key in both `TRANSLATIONS` blocks

**Verified.** `uiLabels().supplementalContent` is read at exactly two template sites: line 279 (inside `<ng-template #generatorForm>`, line 182, rendered by both `generator` and `ua-generator`) and line 626 (FAQ form). `TRANSLATIONS.en.supplementalContent = 'Supplemental Content (Optional)'` (line 147) and `TRANSLATIONS.uk.supplementalContent = 'Додатковий контент (Опціонально)'` (line 320). Relabelling the shared key would change three forms at once and violate FR-28/AC-26, so the shared key is **not touched**.

**Decision.** Add one key, `supplementalContentRequired`, to **both** `en` and `uk` blocks, placed immediately after the existing `supplementalContent` line in each block:

| Block | Key and value (source text) |
|---|---|
| `en` | `supplementalContentRequired: 'Supplemental Content (Required)',` |
| `uk` | `supplementalContentRequired: 'Додатковий контент (Обов\'язково)',` |

- The English text is fixed by AC-24 and FR-27 ("Supplemental Content (Required)", no "Optional"). The `*` marker is not part of the string: it comes from `[required]="true"` (D14), so the rendered label reads "Supplemental Content (Required) *".
- The Ukrainian text is the **OD-13 labelled default**, flagged by the Specification for human approval at HUMAN_SPEC_APPROVAL. This plan implements the default; it does not resolve OD-13. If the human chooses another term, the only change is this one literal and its pin.
- **Apostrophe.** I read the bytes: in the Specification (`docs/specifications/US-8.1-spec.md` lines 385 and 495) and in Open Decisions (lines 368 and 373) the apostrophe in "Обов'язково" is **ASCII U+0027** (byte `0x27`), not U+2019 or U+02BC. The `uk` block is single-quoted TypeScript, so the source must escape it as `\'`, exactly as line 302 already does for `обов\'язкові` (an unescaped `'` is a `tsc --noEmit` syntax error, which `npm run lint` would report). The runtime string therefore contains U+0027, which is the character the Specification fixed. The pin (D16) asserts the unescaped runtime value with U+0027 and rejects U+2019 and U+02BC.
- The template change is the single binding at line 626: `[label]="uiLabels().supplementalContentRequired"`. Line 279 is untouched. `placeholderSupplemental` stays shared (it is not part of FR-27). `[labels]="uiLabels()"` passed to `app-source-input` reads only fixed button keys, so the new key does not affect it. `source-input.component.*` is not edited.
- `uiLabels` is `computed(() => TRANSLATIONS[this.uiLanguage()])`, an inferred union type, and `tsconfig.json` sets no `strict`/`strictTemplates`. Whether `ng build` would fail on a one-sided key is **unverified**, so the plan does not rely on the build: the parity pin below does.
- **Correction recorded against the inputs.** OD-13's "What was checked" text says the existing wiring spec compares the `en` and `uk` blocks key for key. It does not (impact analysis v2 already says so; I re-read `app.component.template-wiring.spec.ts` and it only asserts specific keys `FAQ Generator` and `faqGenerator`). The OD text is not edited here (it is an input). The consequence is a **new** parity pin. I checked the baseline with a script: both blocks currently carry **170** keys, with **no key only in one block** and no duplicate, so a whole-dictionary key-set parity pin is green today and goes red the moment the new key is added to only one block.

## D16. How each requirement is verified (the repo has no `AppComponent` spec, by standing decision)

**Where.** One new spec file, `src/app/app.component.faq-layout.spec.ts`, in the existing source-text family (`app.component.template-wiring.spec.ts`, `app.component.export-guard.spec.ts`). It matches `vitest`'s `src/**/*.spec.ts` and does **not** match `*.component.spec.ts`, so it runs in `test:logic` and `test:components` (`ng test`) stays at its two files. **No existing test is modified, weakened or excluded** (§7.7); the existing wiring spec is not edited, which also keeps its `>= 3` pin visibly undisturbed. The new spec reads the sources through the same CRLF-normalising helper the wiring spec uses (`text.split('\r\n').join('\n')`) and starts with premise assertions (block found, slice non-empty) so a mis-slice fails loudly rather than passing vacuously.

The pins use the same extraction idioms as the wiring spec: the FAQ form block is the text from `\n    @else if (appMode() === 'faq-generator')` to the next `\n    @else`; the `en` block is the text from `const TRANSLATIONS` to `\n  uk: {`; the `uk` block runs from `\n  uk: {` to the first `\n};` after it.

| Req / AC | What the pins assert | How |
|---|---|---|
| **FR-24 / AC-21** (never rendered before, during, after a run) | (a) `noContentYet` and `fillFormStart` each occur exactly once in the template, in the one block, which also holds the block's icon (`fa-file-code`), so removing the block removes text and icon together. (b) The `@if (...)` condition that guards that block is extracted with a balanced-parenthesis scan and **evaluated** with stubbed `appMode`, `content` and `isGenerating` (it is pure JS-compatible: only `appMode()`, `content()`, `isGenerating()`, `!`, `&&`, `!==`). For `appMode = 'faq-generator'` it is `false` for every state in the grid: before a run (empty content, `isGenerating` false), during a run (`isGenerating` true), and after a FAQ-only run (`mainHtmlUa ''`, `translations {}`, `seoData null`, `slugData null`, `faqArtifacts` populated) and after a no-FAQ run (all empty). (c) The condition text does not contain `hasOutput`, `hasFaqOutput` or `faqArtifacts` (no data-derived exclusion) and does contain `appMode() !== 'faq-generator'`. | source-text + condition evaluation |
| **FR-18 interplay** (FR-24 is not met by changing data) | No new test. The existing `content-orchestrator.faq-standalone.spec.ts` assertion that a standalone run leaves `mainHtmlUa === ''` stays green and unmodified; the delta changes no `.ts` logic and no orchestrator file, which the verification stage can read in the diff. | existing + diff review |
| **FR-28 / AC-26 (empty state)** | The same extracted condition, evaluated for each of `generator`, `ua-generator`, `seo-generator`, `slug-generator` over a state grid that includes the trap states (`faqArtifacts` populated from an earlier FAQ run while the output fields are empty; `seoData`/`slugData` set; `mainHtmlUa` set; `isGenerating`), must equal an **oracle that is a literal copy of today's condition** (`appMode() !== 'generator' && !mainHtmlUa && !seoData && !slugData && !isGenerating()`). This proves SEO, Slug and UA Description keep the block exactly when they do today, including the case a data-derived fix would silently break. | condition evaluation vs. frozen oracle |
| **FR-28 / AC-26 (forms and labels)** | In `<ng-template #generatorForm>`: the Supplemental input is still bound to `uiLabels().supplementalContent` (and not to the new key); has no `[required]`; the relative order of the Description, Tech Specs and Supplemental `valueChange` targets (`description.set`, `specs.set`, `supplementalContent.set`) is unchanged; `uiLabels().supplementalContent` (the exact key, not the `...Required` one) occurs exactly once in the whole template, inside `generatorForm`. In `en`, `supplementalContent` is still `'Supplemental Content (Optional)'`; in `uk` it is still `'Додатковий контент (Опціонально)'`. The SEO and Slug form blocks do not bind the new key. | source-text |
| **FR-25 / AC-22 (structure; clauses 1 and 2)** | Take the text from the `</header>` that closes the tab bar to the first `@for (tab of tabDescriptors()` in the result view. After removing the validation `<details>` (the `validationIssues().length > 0` block), the repair `<details>` (the `repairReport().length > 0` block) and the empty-state block, the remainder is only the scroll container's opening tag: no other element sits between the tab bar and the result. The container's class tokens contain no `flex` (as a whole token), `grid`, `items-*`, `justify-*`, `h-full` or `min-h-*`. The FAQ result panel root (the `tab.type === 'faq-english' \|\| ... 'faq-translation'` block's `role="tabpanel"` div) carries no `h-full`, `min-h-*`, `justify-*`, `items-center` or top-margin/padding token (`mt-*`, `pt-*`). Clause 1 for the empty-state block specifically follows from the FR-24 pin. | source-text |
| **FR-25 / AC-22 (geometric clause)** | **Manual browser check (OD-15 default), not an automated pin and not pipeline evidence.** Run the app, open FAQ Generator, produce a result with no validation or repair panel shown, and confirm in DevTools that the active panel's top edge is the container's top padding (`p-8`, 32 px) below the tab bar's bottom edge, with nothing in between, and that it is not vertically centred. Record the outcome (who, when, result) in the quality-gate report. The human may require a stronger check at `HUMAN_PLAN_APPROVAL`; this plan adds none because the repository has no layout engine (`happy-dom` has no layout) and no browser-test tool. | manual |
| **FR-26 / AC-23** | In the FAQ form block, the character indices of these anchors are strictly increasing: the Store `<select ... (change)="onFaqWebsiteChange($event)"`, the Product Name `<input ... (input)="updateFaqProductName($event)"`, `(valueChange)="faqSupplementalContent.set($event)"`, `(valueChange)="faqDescription.set($event)"`, `(valueChange)="faqSpecs.set($event)"`, then `toggleSeoThinking()`. The first `<app-source-input` in the block is the Supplemental one, and the block still has exactly three. | source-text |
| **FR-27 / AC-24** | In the FAQ form block, the Supplemental `app-source-input` has `[label]="uiLabels().supplementalContentRequired"` and still has `[required]="true"` (this is also what the existing 333-341 pin guards). The `en` block carries `supplementalContentRequired: 'Supplemental Content (Required)'`; that value contains no "Optional". The `uk` block carries the key; its literal, after turning the source escape `\'` into `'`, equals `Додатковий контент (Обов'язково)` with the apostrophe code point **U+0027**; it does not contain "Опціонально"; it does not contain U+2019 or U+02BC; and it differs from the English value. | source-text |
| **FR-27 / explicit translations parity** | The set of top-level keys of the `en` block equals the set of top-level keys of the `uk` block (key regex anchored on the four-space indent, `^    (\w+):`), and `supplementalContentRequired` is in both. This is the pin that fails when the new key is added to one block only (D15: no existing spec and possibly not the build catches it). | source-text, whole-dictionary |
| **FR-27 / AC-25 (enablement)** | No new test. `src/utils/faq-form.spec.ts` (`isFaqFormComplete`) and the existing wiring pins on `isFaqFormValid`, the Generate button `[disabled]` and the required Supplemental input stay green and unmodified; FR-26/FR-27 do not touch the predicate. | existing |
| **NFR-9** | (a) Every FR-24 to FR-28 pin above is a source-text or condition-evaluation pin that needs no LLM and no live model. (b) "No prompt, `STORE_REGISTRY`, FROZEN or data-field change" is a **diff property**, checked by the gate: `bash arch-guard.sh` exits 0 with `.arch-guard-checksums` **unchanged** (no re-baseline, no new §9 stop), the existing goldens (`test/fixtures/golden/*`) stay green with no `-u`, and `git diff --stat` for this revision's implementation lists only `src/app/app.component.html`, `src/app/app.component.ts` and the new spec file (plus docs). `IMPLEMENTATION_VERIFICATION` reads that diff. (c) The geometric clause is the manual check above. | gate + diff review + manual |

**Red-first versus regression guards.** Not every pin fails before the implementation, and TEST_WRITING should not read a green one as a test that exercises nothing. Red first (they fail against the current tree): the FR-24 evaluated condition for `faq-generator`, the FR-26 index order, the FR-27 `[label]` binding and the `supplementalContentRequired` value pins (and the parity pin's "new key is in both blocks" assertion), and the "exactly one use of the shared key" count. Green at baseline by design, as FR-28/NFR-9 regression guards (they fail only if the change goes wrong): the FR-28 oracle comparison for the other modes, the `generatorForm` binding, literal-value and order checks, the whole-dictionary key-set parity (170/170 today), and the FAQ-structure class-token checks of FR-25.

**Runners.** All new automated pins run in `test:logic` (`vitest run`). `test:components` gains no file. Static and build checks run as gate commands: `npm run lint` (`tsc --noEmit` catches an unescaped apostrophe), `npm run build` (template type-check), `npm run test:coverage`, `bash arch-guard.sh`.

## v2 Files to create / modify

Derived from impact analysis v2 and re-checked against the code.

| File | Change |
|---|---|
| `src/app/app.component.html` | (1) line 1447: add `appMode() !== 'faq-generator' &&` after `appMode() !== 'generator' &&`. (2) FAQ form: move the Supplemental `app-source-input` (lines 625-633) to directly after the Product Name `<div>` (line 604). (3) its `[label]` binding at line 626 becomes `uiLabels().supplementalContentRequired`. Nothing else, in particular not lines 279, 1032, 1280, 1289, 1316. |
| `src/app/app.component.ts` | `TRANSLATIONS`: add `supplementalContentRequired` after `supplementalContent` in `en` (after line 147) and in `uk` (after line 320). No logic change. |
| `src/app/app.component.faq-layout.spec.ts` (new, tests for TEST_WRITING) | The pins of D16, `test:logic`. |

**Not changed:** `src/app/types.ts`, `src/app/tab-descriptors.ts`, `src/utils/faq-form.ts`, `src/app/components/source-input/*`, `src/services/**`, `src/prompts/**`, `src/prompt-core/**`, `src/domain/**`, `src/render/**`, `server/**`, `README.md`, `tools/**`, `.arch-guard-checksums`, all fixtures and goldens, and every existing spec (including `app.component.template-wiring.spec.ts`).

## v2 FROZEN-file, STORE_REGISTRY, prompt and server position

**No stop is needed.** I checked each:

- **FROZEN files (AGENTS.md §9):** none of `task-a.ts`, `task-b.ts`, `task-c.ts`, `master-system-prompt.ts`, `output-validator.ts` is in any list above. `bash arch-guard.sh` was run in this session on the current tree and ends `ALL CHECKS PASSED`, so the checksums match the files as built. The §9 permission recorded for `task-c.ts` covered FR-1 to FR-23 only and is neither used nor extended here. No re-baseline.
- **`STORE_REGISTRY`:** no language list, locale, currency symbol or store entry is read or written by any v2 edit. The Ukrainian string is a UI-language label, unrelated to the uk-UA content master.
- **Prompts and the chain:** no prompt, schema, renderer or validator link is touched; `systemBlocks`/`userContent` and caching are unaffected (D8 stands). §4 criteria: none in play for FR-24 to FR-28; FR-21 to FR-23 are not weakened.
- **Server:** no `server/**` file, no `taskLabel`, no usage column; the no-migration hazard is not tripped (D10 stands).
- **Domain model and corpus:** no field change; `test/fixtures/corpus/` is unaffected (D1 stands).

## v2 Risks

| # | Risk | How it would surface |
|---|---|---|
| R13 | **Data-derived empty-state fix leaks into other modes** (shared `content` signal): an exclusion built from `hasOutput()`/`faqArtifacts` would hide the SEO/Slug/UA Description empty state after any earlier FAQ run, and would also still show the block in FAQ mode before a run. | The oracle comparison in D16 includes the trap state (stale `faqArtifacts`, empty output fields) for the three other modes, and the "no `hasOutput`/`faqArtifacts` in the condition" assertion. |
| R14 | **The shared `supplementalContent` key is relabelled** (Generator and UA Description change to "Required"). | The FR-28 pins: the `generatorForm` binding, the two literal values, and the "exactly one use of the shared key" count. No existing test would notice, hence the new pins. |
| R15 | **A one-sided label key.** In `en` only, the Ukrainian UI shows nothing for a mandatory field; with an English or "Опціонально" string in `uk` nothing fails. The build may not catch it (unverified). | The whole-dictionary key-set parity pin (green at baseline: 170/170), plus the `uk` value pin (not "Опціонально", differs from English). |
| R16 | **Wrong apostrophe or an unescaped one.** A U+2019/U+02BC apostrophe diverges from the Specification's character with no failure; an unescaped `'` breaks the string. | The `uk` pin asserts U+0027 and rejects the other two; `npm run lint` fails on the syntax error. |
| R17 | **The `>= 3` line-count pin (`template-wiring.spec.ts:236-239`) is disturbed** by reformatting, wrapping or extracting lines 1032/1280/1289, or by moving the count below 3. | The edits never touch those lines (D12), and the new conjunct is a `!==` without `slug-generator`. If the human later overturns OD-11, rewriting line 1289 would be the one legitimate reason to update that pin, to be justified by that requirement then. |
| R18 | **Pins prove structure, not rendering.** Source-text and condition-evaluation pins do not show the page looks right; AC-22's geometric clause is unproven by automation. | The manual browser check (D16) is a required, recorded step; reconciliation must treat it as a recorded claim, not pipeline evidence (the Specification says so). The evaluated-condition pin fails closed: if the condition stops being JS-compatible the pin errors rather than skips. |
| R19 | **Pre-run empty tab strip (OD-11) and blank area after a no-FAQ run (OD-16)** look unfinished once the empty-state block is gone; and FR-25 holds only vacuously when a validation or repair panel is shown (OD-12). | Not a defect: accepted as the labelled defaults, flagged to the human. Visible in the manual check. If overturned, the changes are named in D13. |
| R20 | **The `faqForm()` extraction idiom is brittle** (`\n    @else` at four-space indent): a moved element that introduced such a line, or a re-indent, would truncate the block and make several existing pins fail or pass on the wrong text. | The move keeps the 8-space indent; the new pins start with a non-empty-block premise; the existing FAQ-form pins run in the same gate. |

## v2 Rejected alternatives

13. **Derive the empty-state exclusion from data** (`!hasOutput()`, `!hasFaqOutput()`, non-empty `faqArtifacts`). It leaks to the other modes through the shared `content` signal (R13) and still shows the block in FAQ mode before a run, since no data exists then.
14. **Make the FAQ-only result non-empty to dodge the block** (put the FAQ in `mainHtmlUa`, add a `translations` entry). It breaks FR-18/AC-13 and changes the ZIP output; the Specification forbids it.
15. **Wrap the block in a second `@if`, hide it with CSS (`hidden`), or add an `isFaqOnlyMode` computed.** A wrapper adds nesting and breaks the evaluable single-expression pin; CSS-hiding still renders the text into the DOM, violating "never renders"; a computed adds `.ts` surface and invites rewriting the line 1032/1280/1289 conditions, which the `>= 3` pin guards.
16. **Relabel the shared `supplementalContent` key.** Changes Generator, UA Description and FAQ at once and violates FR-28.
17. **A FAQ-only literal in the template, or a ternary in the shared label binding.** A literal bypasses `TRANSLATIONS` (the UI-language switch, and the Ukrainian text of FR-27); the FAQ form is a separate block from `generatorForm`, so no ternary is needed.
18. **Add a "required suffix" input to `app-source-input` that appends "(Required)".** That edits a component shared with the Generator forms for a one-form label, and the Specification fixes the English text as a plain label.
19. **Reorder the validation and repair panels below the result, or hide the pre-run tab strip** (OD-12, OD-11 non-defaults). Not required by FR-24 to FR-28, not chosen by the human, and the strip change would rewrite line 1289 and disturb the `>= 3` pin. Left to the human.
20. **A rendered `AppComponent` spec, or a third `*.component.spec.ts` in `test:components`, for AC-21 and AC-22.** Heavy DI, rejected twice already; evaluating the template condition against stubbed state gives the same behavioural coverage under `test:logic`.
21. **Add a browser or layout tool (Playwright, a geometry assertion) for AC-22's geometric clause.** The repository has none and `happy-dom` has no layout engine; introducing one is out of this Story's scope. The OD-15 default (structure pin + manual check) stands, and the human can require more.
22. **Put the new pins into `app.component.template-wiring.spec.ts`.** Works, but edits an existing test file next to the brittle `>= 3` pin; a new sibling file keeps "no existing test modified" demonstrable.
23. **A name-only parity pin (just the new key in both blocks).** It would not catch a different one-sided key later; the whole-dictionary key-set pin is green today and strictly stronger.
24. **Resolve OD-13 (the Ukrainian wording) or OD-11/12/16/17 in the plan.** These stay labelled defaults for the human; the plan implements the carried default and isolates the one literal that would change.

## v2 Traceability

| Requirement | Design decision / file |
|---|---|
| FR-24 | D12 (`app.component.html` line 1447); D16 AC-21 pins |
| FR-25 | D13 (no edit; follows from D12); D16 structure pins and the manual geometric check; OD-11, OD-12, OD-16 stay defaults |
| FR-26 | D14 (`app.component.html` FAQ form move); D16 order pin |
| FR-27 | D15 (`app.component.ts` both `TRANSLATIONS` blocks; `app.component.html` line 626 binding); D14 (`[required]="true"` kept); D16 label, apostrophe and parity pins; OD-13 stays a labelled default |
| FR-28 | D12 (condition identical for every other mode by construction); D15 (shared key untouched); D16 oracle and `generatorForm` pins |
| NFR-9 | D16 (stubbed state, template structure, no LLM); the v2 FROZEN/STORE_REGISTRY/prompt/server position above; arch-guard unchanged; D16 NFR-9 row |
| FR-1 to FR-23, NFR-1 to NFR-8 | Unchanged; the v1 traceability table above stands. |

## v2 Open points carried, not resolved

OD-10 to OD-20 remain labelled defaults; none is blocking and none is resolved by this plan. As implemented here: **OD-10** FAQ Generator only (D12, D15). **OD-11** pre-run strip left as is (D13). **OD-12** panels stay above the result (D13). **OD-13** Ukrainian label "Додатковий контент (Обов'язково)" implemented as the labelled default; the one literal and its pin change if the human decides otherwise (D15). **OD-14** tab labels unchanged. **OD-15** structure pin plus manual check (D16). **OD-16** blank area after a no-FAQ run accepted and flagged (D13, R19). **OD-17** the `alertFillFields` text is unchanged; a FAQ-only alert would need a new key and a branch in `generateFaqOnly`, not planned. **OD-18 to OD-20** unchanged from the carried SP-1 to SP-3 handling in D5.
