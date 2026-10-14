---
artifact: impact_analysis
story: US-8.1
version: 1
status: DRAFT
owner: so-impact-analyzer
created_at: 2026-10-14T18:00:00Z
updated_at: 2026-10-14T18:00:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: open_decisions
    version: 1
open_decisions_blocking: false
---

# Impact analysis: US-8.1 (one master FAQ, translated; `<b>` not `<strong>`; standalone FAQ tool)

All lists were re-derived in this run by Grep/Bash over `src`, `test`, `server`, `tools`; nothing is copied from the skill
text. Specification v2 is APPROVED and is the current version; Open Decisions v1 has nine items, all `blocking: false`
(OD-1 to OD-9 carried as defaults in the Specification; SP-1 to SP-3 are not yet in the log). `bash`-checked: the sha256 of
`src/prompts/task-c.ts` and `src/prompts/task-a.ts` equals the entries in `.arch-guard-checksums` today (baseline is clean
before this Story starts).

## Design under survey (Specification v2, scope only)

Surfaces named by the spec: FAQ step of `generate()` and of `generateUaContent()` (FR-1, FR-2, FR-4, FR-10, FR-11), a new
standalone FAQ orchestrator method (FR-18, FR-19, FR-20), the FAQ prompt text (FR-6), a FAQ-scoped `<strong>`→`<b>` step
(FR-7), a FAQ validity check (FR-9), FAQ-aware structural parity (FR-3), FAQ-aware Task C (FR-12, FR-13, FR-14), the mode
switcher / form / tabs (FR-15 to FR-17), and the §4 constraints on the FAQ output (FR-21 to FR-23).

## Affected files

### Must change (or very likely change)

| File | Why | FROZEN |
|---|---|---|
| `src/prompts/task-faq.ts` | FR-6: the output contract lists `<p>, <strong>, <b>, <ul>, <li>`; `<strong>` must go. Header doc comment repeats the tag list. It is also the prompt the uk-UA master call uses (FR-1). | no |
| `src/prompts/task-c.ts` | FR-12 / FR-13 / FR-14: `buildPromptC(html, targetLang, storeName, websiteGroup, templateId, opts)` has no FAQ switch today. It always emits `MASTER_SYSTEM_PROMPT` as cached `systemBlocks[0]`, then a per-language instruction written for a complete description (`<hr>` after `</section>`, "Technical specifications" / "What's in the box" labels, closing commercial `<h2>`, delivery-region block via `buildDeliveryRegionBlock`, optional H1 LOCK, `HEADING_FIDELITY`, EXPERT3D / Center 3D Print ToV overlays, `UK_SOURCE_ANTICALQUE`). `pack()` selects `STANDALONE_SNIPPET_NOTE` for HTML without `<figure>` (every FAQ). | **YES - operator's recorded §9 permission** ("modify `src/prompts/task-c.ts`", 2026-10-14) |
| `.arch-guard-checksums` | FR-14: must be re-baselined in the same commit as the `task-c.ts` edit. | n/a (baseline file) |
| `src/utils/structural-parity.ts` | FR-3: `COUNTED_TAGS` has `h3` and `li` but not `p` or `ul`. A FAQ-selected comparison is needed without changing the description path. It is also consumed by the HTML editor (see re-verification). | no |
| `src/services/content-orchestrator.service.ts` | The FAQ step exists twice, both loops: `generate()` Step 5 (lines ~1194-1260, a `for (const isoCode of store.languages)` loop with one `buildPromptFaq` per language) and `generateUaContent()` Step 4 (lines ~1543-1592, uk-UA only). Both are replaced by the master-then-translate pipeline. A new standalone method sits beside `generateSeoMetadata` (~1606) / `generateSlugs` (~1668). Also: `historyService.add` (~1280, ~1601), `withProgress`, `blockRepairer`, `toArtifactReport`, the normalizer chain. | no |
| New sibling module(s) (names are `so-planner`'s) | FR-7 (`<strong>`→`<b>` step) and FR-9 (well-formed, five-element whitelist, `<h3>` start, no attributes): `src/utils/output-validator.ts` is FROZEN and not authorised, so the check cannot live there (OD-4 precedent: `seo-metadata-shape.ts`, `image-manifest-coverage.ts`). Possibly also the shared FAQ pipeline helper. | no (new) |
| `src/utils/repair-strategy.ts` | New FAQ rule ids (not well-formed, element not whitelisted, attribute present, does not start with `<h3>`) fall to the `['full-regen']` default unless registered, as `meta-title-template-shape` does today. | no |
| `src/app/types.ts` | `AppMode` union gains a value (line 4). `GeneratedContent.faqArtifacts` already exists (line 94). | no |
| `src/app/app.component.ts` | New mode: own signals following the SEO / Slug pattern (`seoProductName`, `slugProductName`, `seoUseThinking`), validity computed (FR-16: Product Name + Store + Supplemental Content, whitespace-only = empty), a `generate…Only()` method, `activeProductName` switch (line ~553), `clearAll()` switch (~1062), `tabDescriptors` (~583), `hasGeneratorOutput` / `hasOutput` (~545-549), `TRANSLATIONS` en and uk label maps (lines ~41 and ~211), `restoreHistory` (~1000, always `generator` mode). | no |
| `src/app/app.component.html` | Mode switcher (three rows of two buttons, lines ~48-125), a new form block (the `seo-generator` form at ~412, `slug-generator` at ~518 are the models), the Generate button chain (~797-850), and every `appMode() === 'generator' \|\| 'ua-generator' \|\| 'seo-generator' \|\| 'slug-generator'` condition (lines ~930, ~1174, ~1183) plus the `'seo'` tab button (`@if (appMode() !== 'slug-generator')`, ~1210). | no |
| `README.md` | "FAQ / HowTo artifacts" bullet (line 37), "How generation works" step 5 (line 98), step 3 of "Usage" (line 223), and the "Tools & modes" section; the Story lists it explicitly. | no |

### FROZEN files (AGENTS.md §9): stated loudly

1. **`src/prompts/task-c.ts` - TOUCHED, authorised.** One recorded permission, one file. Needs `bash arch-guard.sh --rebaseline`
   with `.arch-guard-checksums` in the same commit, and a diff limited to the FAQ-aware change (FR-14). The existing
   `task-c.ts` goldens (`c/expert3d-es`, `c/eu-en`, `c/us-uk` in `test/fixtures/golden/full-description-prompts.json`)
   guard FR-13 for three store-language pairs only.
2. **`src/prompt-core/master-system-prompt.ts` - NOT authorised, but reached through `task-c.ts`.** `buildPromptC` places
   `MASTER_SYSTEM_PROMPT` first in `systemBlocks` for every call. That frozen text carries the description schema (§9
   COMMERCIAL CLOSING / CTA, `<h2>` rules, HEADING FORM). FR-12 item 3 requires that no instruction in the FAQ translation
   prompt would add an element outside the five; whether that holds while `MASTER_SYSTEM_PROMPT` is still included
   cannot be settled by this survey. Omitting that block for the FAQ variant is an edit inside `task-c.ts` (within the
   permission) and changes the cached prefix (NFR-4: system blocks keep `cache: true`); if the plan finds it must edit
   `master-system-prompt.ts` itself, that is a **new §9 stop**.
3. **`src/utils/output-validator.ts` - NOT authorised, not edited, but it runs on every FAQ today.**
   `validateGeneratedHtml(html, 'FAQ (iso)', input.name, iso)` is already the FAQ validator; it has description-oriented
   rules that will now also see translated FAQs. Its CRITICAL checks (`duplicate-product-schema`, `duplicate-h1`, FAQPage
   `itemtype`) overlap FR-23. FR-9's new checks must go in a sibling.
4. **`src/prompts/task-a.ts`, `src/prompts/task-b.ts` - not needed.** The FAQ does not pass through Task A or Task B.
5. `.arch-guard-checksums` currently matches all five frozen files, so a mismatch after this Story is attributable to this
   Story alone.

### Needs re-verification even if unchanged

- `src/app/components/html-editor/html-editor.component.ts` (line 413): calls `validateStructuralParity(original, html, 'HTML Editor')`
  on a description. Any change to `COUNTED_TAGS` or the signature must leave this call byte-for-byte equivalent (OD-3 default).
- `src/services/content-orchestrator.service.ts` line ~1954 (`runOutputValidation` calls `validateStructuralParity` for
  description translations) and line ~1156 (translation gate): description-path parity must not gain `p` / `ul` counting.
- `src/utils/zip-generator.ts`: writes `description_${mainIso}.html` from `content.mainHtmlUa` unconditionally (line 32), so a
  standalone FAQ run (`mainHtmlUa === ''`) would ship an empty description file next to the `faq_*.html` files. It already
  writes `faq_${iso}.html` for every entry. See silent-failure risk 6.
- `src/utils/block-tier.ts` / `src/utils/block-repair` (`createBlockRepairExecutor`) and `blockRepairer`: the FAQ gate uses the
  block rung; a rewritten `<p>` can reintroduce `<strong>` after the conversion step ran earlier (FR-7 says the conversion
  runs again after every repair).
- `src/utils/repair-gate.ts` (`runRepairGate`): semantics the Story's "3 attempts" must be mapped onto. `maxRepairs` defaults to 1
  (`this.maxRepairs = signal(1)`), the loop is `while (repairsUsed < opts.maxRepairs)`, the initial `produce` is awaited
  unguarded, and the gate always RETURNS the best artifact even when errors remain (it never throws on residual errors).
- `src/utils/number-format-fixer.ts`, `decimal-separator.ts`, `terminology` normalizers
  (`fixNumberFormatting`, `fixDecimalSeparator`, `restoreIdentifierDots`, `cyrillizeUnits`, `normalizeTerminology`,
  `canonicalizeMultiInOne`): FR-21 / FR-23 require that the chain still runs on the master and every translation.
- `src/prompt-core/constants.ts`: `getStore`, `getLangsForStore`, `bcp47ToTaskCLang`, `taskLangToIso`, `isoToHumanLang`,
  `buildNativeLangOverlay`, `MASTER_LOCALE`, `UK_SOURCE_ANTICALQUE` - consumed, not edited.
- `src/prompt-core/protected-name-block.ts` (`withProtectedNameBlock`, US-7.1): the description translation call wraps its prompt
  with it; the FAQ call does not today. OD-6 is open and no FR was written, so whether the FAQ translation gets it is undecided.
- `src/services/llm.service.ts` / `server/index.js` / `server/usage/store.js`: carry `taskLabel`, `productName`, `store`, `lang`
  as telemetry. New task labels for the translation calls appear in the usage database and call log; no schema change.
- `src/app/app.component.ts` `parseFaqItems` (line ~740): walks `doc.body.children`, `<h3>` then siblings. Display only; still
  correct for `<ul>` and `<b>`; no change expected.

### Tests that cover them

| Spec | Relevance |
|---|---|
| `src/services/content-orchestrator.simplified.spec.ts` (R6 block, lines ~309-400) | **Pins the OLD behaviour and will fail**: asserts `FAQ (${lang})` text calls for EVERY store language (`expectedLabels = langs.map(l => 'FAQ (' + l + ')')`), `faqLabels` equal that set, and `FAQ (uk-UA)` once for a UA run. Its stub returns `FAQ_HTML` for any label starting `FAQ (`. This block must be rewritten, not just extended. |
| `src/services/content-orchestrator.doc-gate.spec.ts`, `content-orchestrator.ua-doc-pipeline.spec.ts`, `content-orchestrator.protected-name-*.spec.ts`, `content-orchestrator.image-placeholder.spec.ts`, `seo-currency-wiring.spec.ts` | Orchestrator harnesses; any new text-call label or FAQ step must not break their stubs (they throw on an unknown `generateJson` label; unknown `generateText` labels fall to the default stub). |
| `src/prompts/task-faq.spec.ts`, `src/prompts/task-faq.v4.spec.ts` | Prompt-shape specs for `buildPromptFaq` (overlay, cache stability). Neither asserts the `<strong>` tag list today; FR-6 adds the `<b>`-yes / `<strong>`-no assertion here. |
| `src/prompts/task-c.spec.ts`, `src/prompts/output-integrity-wiring.spec.ts`, `src/prompt-core/protected-name-precedence.spec.ts`, `src/prompt-core/ua-translation-style-guide.spec.ts`, `src/prompts/task-translate.simplified.spec.ts`, `src/prompt-core/master-system-prompt.image-markers.spec.ts` | Call `buildPromptC`; `task-c.spec.ts` line ~218 already pins `systemBlocks[0]` byte-identical "with and without opts". New FAQ-variant tests (FR-12) and the FR-13 byte-identity test land here. |
| `src/prompts/full-description.golden.spec.ts` + `test/fixtures/golden/full-description-prompts.json` (12 keys incl. `c/expert3d-es`, `c/eu-en`, `c/us-uk`) + `test/fixtures/full-description-inputs.ts` | Existing FR-13 evidence for three Task C pairs. Must stay green with no `-u`. |
| `src/utils/structural-parity.spec.ts`, `structural-parity.v4.spec.ts`, `structural-parity-restore.spec.ts`, `simplified-translation-parity.spec.ts` | Description-path parity behaviour (FR-3 "unchanged"); the FAQ comparison tests are new, beside them. |
| `src/app/components/html-editor/html-editor.component.ts` has no co-located component spec | Its `validateStructuralParity` call is covered only indirectly; see re-verification. |
| `src/app/app.component.template-wiring.spec.ts`, `src/app/app.component.export-guard.spec.ts` | Source-text pins on `app.component.{html,ts}` under `test:logic`. Precedent for FR-15 / FR-16 tests (there is no `AppComponent` spec "by deliberate prior decision"). `export-guard` regex-extracts `downloadZip` / `downloadText` bodies; changing them risks it. |
| `src/utils/repair-gate.spec.ts`, `repair-strategy.spec.ts`, `block-tier.spec.ts` | Gate / ladder behaviour for new FAQ rule ids. |
| `src/prompt-core/constants.spec.ts`, `store-render-rules.spec.ts`, `doc-pipeline-flag*.spec.ts`, `src/utils/product-name-preservation.stores.spec.ts` | Registry consumers; per-store iteration idioms (`STORE_REGISTRY[site.name].languages`) for the "every store" scope. |

## Hazard table (all seven checked)

| # | Hazard | Applies? | Evidence |
|---|---|---|---|
| 1 | `STORE_REGISTRY` fan-out | **Applies; no registry edit needed.** | Re-derived with `grep -rln STORE_REGISTRY` over `src server test tools` (non-spec): `src/app/app.component.ts`, `src/app/components/html-editor/editor-html-pipeline.ts`, `src/prompt-core/{constants,doc-pipeline-flag,store-render-rules}.ts`, `src/render/render-description.ts`, `src/utils/{language-consistency,output-validator,protected-product-name,table-finalize}.ts`, `test/fixtures/{image-placeholder/fixtures.ts,protected-name.ts}`, `test/tools/derive-ctx.mjs`. Via `getStore` / `getLangsForStore` (not by name): `app.component.ts`, `store-render-rules.ts`, `prompts/{copywriter,task-a,task-b,task-slug}.ts`, `content-orchestrator.service.ts`, `utils/zip-generator.ts`. This Story's reach: the FAQ loop reads `store.languages`, `store.currencySymbol`, `store.group`, `website.name`. Fan-out per store (N / translations N-1): `3DDevice` 3/2, `3DPrinter` 3/2, `3DScanner` 3/2 (en-GB, uk-UA, ru-UA), `Center 3D Print` 5/4 (pl-PL, en-GB, de-DE, uk-UA, ru-UA), `Drukarka 3D` 2/1 (pl-PL, uk-UA), `EXPERT3D` 4/3 (en-ES, es-ES, pt-PT, uk-UA), `Expert-3DPrinter` 3/2 (en-US, es-MX, uk-UA): 16 FAQ translation pairs in total. The `getStore()` fallback (`languages: ['en-GB']`, constants.ts line ~308) has no `uk-UA`: outside every AC (SP-3). Per-store Task C dispatch is store- and group-sensitive (EXPERT3D ES/PT blocks and `applySpanishExpert3dReplacements`, Center 3D Print ToV overlay, US-group Ukrainian) so the FAQ variant meets the same dispatch. |
| 2 | uk-UA is the master | **Applies - this Story changes who the master is for the FAQ.** | Today the FAQ is authored natively per language (no master; `generate()` Step 5 loops `store.languages`). After the Story, a change to the uk-UA FAQ generation (`buildPromptFaq`, FR-1/FR-6/FR-7/FR-9) reaches **every language of every store** (N-1 translations, 16 pairs); a change to Task C's FAQ variant reaches the **translated** languages only (all except uk-UA). A uk-UA fix is therefore a full-catalogue FAQ regeneration, not a one-locale fix. The description master (Task A) is untouched; the FAQ master is a separate call that is NOT Task A. |
| 3 | prompt → schema → renderer → validator chain | **Partly; the FAQ chain is shorter than the description chain.** | Prompt: affected (`task-faq.ts`, `task-c.ts`). Schema: not affected (the FAQ is schema-free; no Zod type exists for it; `src/domain/*` is not touched). Renderer: not affected (`src/render/render-description.ts` is description-only; FAQ is displayed by `parseFaqItems` + `safeHtml` in `app.component.html` ~1407-1430 and downloaded as `faq_${iso}.html`). Validator: **affected** - new sibling FAQ-shape validation and conversion (FR-7, FR-9), extended structural parity (FR-3), repair-strategy registration; the frozen `output-validator.ts` is unedited and still enforces the AGENTS.md §4 criteria on the FAQ via `validateGeneratedHtml`. Links NOT touched: description schema, description renderer, description validator behaviour (FR-13, NFR-7). |
| 4 | FROZEN files | **YES - `src/prompts/task-c.ts`, authorised.** Possible stop on `master-system-prompt.ts`. | See "FROZEN files" above: the permission is one file; `MASTER_SYSTEM_PROMPT` is `systemBlocks[0]` of every Task C call and holds description-only rules; the plan must remove it from the FAQ variant inside `task-c.ts` or stop. No sibling-file workaround exists for Task C (the pattern `task-a-doc.ts` is for Task A; the Story's own decision is "no new prompt file without necessity"). |
| 5 | Corpus conformance harness | **Does not move; coverage gap does not apply to rendering but FAQ has no corpus at all.** | `test/fixtures/corpus/` holds the Ortur H20 20 W triples (EXPERT3D, Center 3D Print) of descriptions; `test/render-reconciliation.spec.ts` and `test/render-conformance*.spec.ts` compare the description renderer to them. `grep` for FAQ in `test/render-reconciliation.spec.ts` finds only a verbatim copy of `structural-parity.ts` (line 34) in a comment. This Story changes no renderer output, so no triple moves. Report `test/render-reconciliation.report.md` §5 item 2 ("Corpus is 2 items, not 6, and both are the same product") stands: the corpus has no FAQ artifact, no multi-language FAQ and no `<strong>` example (the es-ES / pt-PT EXPERT3D `<strong>` case from the Story's Reproduction exists nowhere in `test/fixtures/`). New FAQ fixtures must be authored at TEST_WRITING. |
| 6 | The two test runners | **Applies; all new tests land in `test:logic`.** | `vitest.config.ts` includes `src/**/*.spec.ts`, `test/**/*.spec.ts` and excludes `**/*.component.spec.ts` (line 47). `test:components` (`ng test`) currently has TWO files: `content-template-select.component.spec.ts` and `model-settings.component.spec.ts` (the skill text says one). No `AppComponent` spec exists by deliberate decision; FR-15 / FR-16 follow the source-text-pin precedent (`app.component.template-wiring.spec.ts`) and so run under `test:logic`. If the planner chooses a real component test for the new mode it would add a third `*.component.spec.ts` to `test:components`, with Angular DI cost. |
| 7 | `server/**` | **Does not apply, with two incidental touch points.** | Searched `server/` for `faq`: only `server/usage/store.js` matches, by incidental text. No server file needs editing; the FAQ calls reuse `/generate` (NFR-6). New `taskLabel` strings flow into `server/usage/store.js` (`task_label` column) and `server/utils/call-log.js`; no column is added, so the `CREATE TABLE IF NOT EXISTS` no-migration hazard is not tripped. Covered indirectly by `test/usage-store.spec.ts`, `test/call-log.spec.ts`, `test/llm-routes.spec.ts` only if a label constant is asserted (not verified). |

## Silent-failure risks (produce wrong output, no error)

1. **Old behaviour lingers in `generateUaContent()`.** Two near-identical FAQ blocks exist (`generate()` Step 5 and
   `generateUaContent()` Step 4); the UA one does not pass a locale overlay and is uk-UA only. If only `generate()` is
   converted, UA Description (AC-4) silently stays uk-UA-only with no error and `faqArtifacts` of size 1.
2. **Gate returns an invalid artifact; nothing rejects it.** `runRepairGate` returns the best artifact even with residual
   errors. The current code stores any result whose first character is `<` (`faqHtml.startsWith('<')`). Without an explicit
   post-gate decision, a master that is still malformed after 3 attempts (FR-10), or a translation still failing parity after
   3 attempts (FR-11), is stored as a normal FAQ. The Story's "not stored / skipped" is not what the gate does by default.
3. **A thrown provider error aborts everything after the FAQ step.** `withProgress` catches the exception, sets the error
   message and `alert()`s; `produce` is awaited unguarded in `runRepairGate`. In both `generate()` and `generateUaContent()`
   the FAQ step sits *before* `runOutputValidation`, `finalizeTablesForDisplay` and `historyService.add`. A throw in the FAQ
   step therefore silently skips the table finalisation (the operator would copy un-finalised tables) and the history entry
   - SP-1 ("does not abort the run") needs an explicit catch around the FAQ step, not just a retry counter.
4. **`<strong>` reintroduced after conversion.** `blockRepairer` runs inside the gate (pre-loop ladder pass and after each
   regeneration) and rewrites single blocks with the fast model; its output is not passed through the produce-side
   normalizers. FR-7 requires conversion before validate and again after every repair; a conversion placed only in
   `produce` leaves `<strong>` in stored text when the block rung fires.
5. **Task C description-only text reaches the FAQ model (FR-12 item 3).** The per-language instructions and the cached
   `MASTER_SYSTEM_PROMPT` still tell the model to add a closing `<h2>`, a delivery sentence and spec labels. The parity gate
   would catch an added `<p>` / `<h3>`, but an added `<h2>` or `<section>` is not counted by an FAQ `h3/p/ul/li` comparison
   unless the validity check (FR-9) flags it; it is the only thing that does, and only if wired into the translation gate.
6. **Standalone ZIP ships an empty description.** `downloadPackage` writes `description_uk-UA.html` from `mainHtmlUa === ''`
   and `downloadTextPackage` (not read in full) may do similarly; `hasOutput()` only knows generator / SEO / slug output, so
   a FAQ-only result may even hide the ZIP button. Neither errors. Output tabs for a standalone run are also invisible:
   `hasGeneratorOutput()` is `!!mainHtmlUa`, and `tabDescriptors` skips every non-master language whose
   `translations[taskKey]` is empty (it is `{}`), so N-1 FAQ tabs do not render (OD-9) - data present, UI empty.
7. **UA Description tab branch.** `tabDescriptors()` for `ua-generator` returns one description tab plus one uk-UA FAQ tab only;
   AC-4's "tab for each language" does not appear unless that branch changes. `_autoSelectTab` hides the failure by falling back to
   `tabs[0]`.
8. **Parity counting asymmetry.** `validateStructuralParity` counts `<h3>` and `<li>` already (and `section`, `h2`, `hr`,
   `figure`, `table` ...). Calling it unchanged on a FAQ already enforces `h3` / `li`; adding `p` / `ul` globally would fail
   description translations whose paragraph counts differ (OD-3) with no description AC covering it, and `html-editor`'s
   copy gate would start reporting new issues.
9. **`<b>` placement and cross-language emphasis drift** (OD-7): a translation can move or drop `<b>` and pass every AC; FR-7
   adds no `<b>` parity check.
10. **FAQ translation call parameters undecided (OD-6).** The description translation loop applies the protected-name block,
    `applySpanishExpert3dReplacements` (EXPERT3D ES/PT) and `useThinking`. Copying the loop wholesale applies description-only
    URL replacements to a FAQ; omitting `withProtectedNameBlock` lets a product name be shortened in a FAQ answer (the US-7.1
    defect class). Either passes every AC.
11. **Existing R6 spec encodes the old contract**: it would keep passing if the FAQ step were left untouched for non-EXPERT3D
    branches, hiding a half-converted pipeline (see tests above).
12. **Interaction of the number/unit normalizer with translated text**: FR-21 is asserted at normalizer level only; free model
    wording is unchecked (NFR-8).

## Failures that will error (for contrast)

`tsc --noEmit` (`npm run lint`) on the `AppMode` union (`Record<AppMode, ...>`-style exhaustiveness, if any) and new signatures;
`arch-guard.sh` FROZEN checksum failure for `task-c.ts` until `--rebaseline`; `arch-guard.sh` Rule #3 (prompt role strings in a
service) if the FAQ translation instructions are written inline in the orchestrator instead of the prompt layer (NFR-3);
`content-orchestrator.simplified.spec.ts` R6; `task-c.spec.ts` / goldens if any description prompt byte changes;
`app.component.export-guard.spec.ts` if `downloadZip` / `downloadText` change shape; `ng build` template type errors in
`app.component.html`.

## Fixture and corpus impact

- **Corpus (`test/fixtures/corpus/`)**: does not move (renderer unchanged). It cannot supply FAQ coverage: no FAQ fixture of any kind;
  report §5 gap (2 items, one product) holds.
- **Golden (`test/fixtures/golden/full-description-prompts.json`)**: must NOT change (FR-13). Only the three `c/*` keys exercise
  Task C; they pin `EXPERT3D`/`ES`, `Center 3D Print`/`EU` English and `Expert-3DPrinter`/`US` Ukrainian. FR-13's default scope
  (OD-5) is every `STORE_REGISTRY` store x language pair (16 non-master pairs), which the golden does not cover - the broader
  snapshot is new work. A new FAQ-variant golden, if the planner wants one, is a new key, not a change to the 12 existing.
- **New fixtures needed (TEST_WRITING, not this stage)**: a uk-UA master FAQ with `<h3>`, `<p>`, `<ul>`, `<li>`, `<b>`; one
  translation each that is parity-clean, drops/adds an `h3` / `p` / `li` / `ul`, contains `<strong>` (plain, uppercase, with an attribute),
  is empty, has an unclosed tag, has an attribute / `class`, has `itemtype`; `1.75mm`-style number-adjoined-to-unit text (FR-21);
  a per-store iteration over all 7 registry entries (N = 2 to 5) including `Drukarka 3D` (one translation) for FR-1/FR-2/FR-4; blank
  and whitespace-only Supplemental Content (FR-5, FR-16). A harness analogous to `content-orchestrator.simplified.spec.ts`'s
  `harness()` with call counting by `taskLabel` is the existing idiom.
- `test/fixtures/full-description-inputs.ts`, `test/fixtures/protected-name.ts`: consume `STORE_REGISTRY`; unaffected.

## Blast-radius summary

The change is narrow in file count and wide in locale fan-out. The pipeline change is two FAQ blocks in
`content-orchestrator.service.ts` (`generate()` Step 5 and `generateUaContent()` Step 4) plus one new standalone method, all
delegating to a single master-then-translate flow; the prompt layer changes in `task-faq.ts` (tags) and in the FROZEN
`task-c.ts` (authorised, FAQ variant, re-baseline in the same commit), with `structural-parity.ts` extended for FAQ input only and
new sibling modules for the `<strong>`→`<b>` step and the FAQ validity check because `output-validator.ts` stays frozen.
Every store is reached (N = 2 to 5, 16 translation pairs), and a uk-UA FAQ fix is a full-catalogue FAQ regeneration while a Task C
FAQ fix reaches the translated languages. The UI work is the larger share of the file list: `AppMode`, a new mode form, button
chain, tab descriptors (which currently hide FAQ-only output and non-UA-Description translations), `hasOutput` / ZIP, i18n labels,
and README. The §9 risk to carry into planning is that `MASTER_SYSTEM_PROMPT` (frozen, not authorised) is the first cached block of
every Task C call. The failure modes to design against are the gate returning an invalid artifact, a provider exception skipping
table finalisation and history, `<strong>` re-entering through the block repairer, and FAQ-only output that renders no tabs.
No schema, renderer, corpus, `server/` or `invariantCore` change is implied. All new tests run under `test:logic`; the existing R6
block in `content-orchestrator.simplified.spec.ts` must be rewritten.

## Unknowns

1. Whether removing `MASTER_SYSTEM_PROMPT` from the FAQ variant inside `task-c.ts` is sufficient for FR-12 item 3, or whether the plan
   would need a `master-system-prompt.ts` edit (a new §9 stop). Settled at planning by reading `master-system-prompt.ts` against the
   three FR-12 items and, if needed, asking the human.
2. Which existing `validateGeneratedHtml` rules (frozen) fire on a translated FAQ in each locale - e.g. language-consistency, the
   anglicism warnings, `latin-unit-in-cyrillic-text` for ru-UA / uk-UA, `lead-in` capitalisation - and so how many repair attempts a
   clean translation costs. Needs a stubbed run at TEST_WRITING or a one-off check at planning; not measured here.
3. The meaning of "attempt" under OD-1 relative to `runRepairGate` (initial `produce` + up to `maxRepairs` regenerations, plus ladder
   rungs that are not counted) - the planner picks the counting; `maxRepairs` is a signal (default 1, not user-visible in this survey).
4. Which `taskLabel` the translation calls carry, and whether `content-orchestrator.*.spec.ts` stubs and `server` usage reporting key
   off the `FAQ (` prefix (the simplified spec stub matches `startsWith('FAQ (')`; other specs not exhaustively read).
5. Whether `downloadTextPackage` (not read in full) and `groundingExportBlocked` behave for an empty `mainHtmlUa`.
6. How the standalone run should treat `seoSelectedWebsite`-style per-mode form state versus shared Generator fields (OD-9) - affects
   which signals and `clearAll()` branches are added; not determinable from the Specification.
7. OD-6 (FAQ translation model tier, normalizer chain, protected-name block) and SP-2 (preservation of numbers, units, names in FAQ
   translations) have no requirement; their resolution can add a normalizer or a `withProtectedNameBlock` call to the file list.
8. SP-1 (thrown provider error), SP-2, SP-3 are not yet recorded in `docs/decisions/US-8.1-open-decisions.md`; the survey assumed
   the Specification's carried defaults.
9. No live-model behaviour was observed; whether a model given the FAQ variant of Task C returns exactly the master's element counts
   is for the stubbed tests (and the manual release evidence the spec rejects) to show, not this survey.
