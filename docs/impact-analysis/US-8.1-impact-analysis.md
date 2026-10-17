---
artifact: impact_analysis
story: US-8.1
version: 2
status: ARCHIVED
owner: so-impact-analyzer
created_at: 2026-10-15T12:00:00Z
updated_at: 2026-10-15T12:00:00Z
supersedes: docs/impact-analysis/US-8.1-impact-analysis.md#1
inputs_consumed:
  - key: story
    version: 3
  - key: specification
    version: 3
  - key: open_decisions
    version: 2
open_decisions_blocking: false
---

# Impact analysis: US-8.1 v2 (revision for Specification v3: FAQ Generator layout, FR-24 to FR-28, NFR-9)

**Why this is v2.** v1 was written against Specification v2 (FR-1 to FR-23: one master FAQ, translated; `<b>` not `<strong>`;
standalone FAQ tool). Specification v3 (APPROVED at HUMAN_SPEC_APPROVAL, commit c7098af) adds FR-24 to FR-28 and NFR-9 for
Story v3's AC-21 to AC-26 and re-bases Open Decisions to v2 (OD-1 to OD-20, none blocking). v1 is `SUPERSEDED` by this file;
its full text is recoverable with `git show c7098af:docs/impact-analysis/US-8.1-impact-analysis.md`.

**What this revision covers.** Only the blast radius of the NEW requirements. All lists below were re-derived in this run by
Grep/Read/Bash over `src`, `test`, `tools`, `server` against the code on branch `feat/US-8.1-single-master-faq` as it is now
(HEAD c7098af, tree clean). Nothing is copied from v1 or from the skill text.

**FR-1 to FR-23's already-built surface is unchanged by this revision.** Tasks T1 to T13 (see
`docs/catalog/US-8.1-pipeline-status.md`) are implemented; FR-24 to FR-28 reach none of their files except
`src/app/app.component.html` and `src/app/app.component.ts`, which T9, T11 and T12 already edited, and which are touched here
only in the places named below. The v1 hazard findings for the FAQ pipeline (task-c.ts permission, `structural-parity.ts`,
orchestrator, `faq-html.ts`, `faq-gate.ts`, tab descriptors for the *content* of FAQ runs) neither widen nor narrow.

## Design under survey (Specification v3, scope only)

| Req | Observable change | Source |
|---|---|---|
| FR-24 / AC-21 | In `faq-generator` the empty-state block ("No content generated yet" + "Select a website, fill the form, and click Generate." + file icon) is never rendered: before, during, after a run | Spec 333-346 |
| FR-25 / AC-22 | After a run the active version tab's panel is the first content under the tab bar; nothing between them, not centred, no full-height sibling (panel-free case; OD-12) | Spec 348-367 |
| FR-26 / AC-23 | FAQ form field order: Target Website, Product Name, Supplemental Content, Original Description, Tech Specs | Spec 369-375 |
| FR-27 / AC-24, AC-25 | FAQ form Supplemental Content label "Supplemental Content (Required)" + `*`, no "Optional"; Ukrainian-UI default "Додатковий контент (Обов'язково)" (OD-13, labelled default, human-flagged); enablement is FR-16, unchanged | Spec 377-392 |
| FR-28 / AC-26 | Generator and UA Description keep "Supplemental Content (Optional)" (uk: today's "Додатковий контент (Опціонально)") and their field order; the empty-state block is rendered in every other mode exactly when it is today | Spec 394-402 |
| NFR-9 | Verifiable with stubbed state and template structure; no prompt, `STORE_REGISTRY`, FROZEN or result-data-field change | Spec 423-425 |

## Affected files

### Must change

| File | Why (precisely) | FROZEN |
|---|---|---|
| `src/app/app.component.html` | Three independent edits, all inside the FAQ Generator branches. (1) **Empty-state condition** at line 1447: `@if (appMode() !== 'generator' && !content().mainHtmlUa && !content().seoData && !content().slugData && !isGenerating())` is the only empty-state in the file (`noContentYet`/`fillFormStart` are referenced once, lines 1450-1451). It currently fires for `faq-generator` before AND after a run, because a standalone run leaves `mainHtmlUa === ''`, `seoData`/`slugData` `null` (FR-18). It must stop firing for `faq-generator` only (FR-24, FR-28). (2) **FAQ form field order**: `@else if (appMode() === 'faq-generator')` block, lines 571-651: today Target Website (select, 577-590), Product Name (input, 592-602), Original Description (`app-source-input`, 604-611), Tech Specs (613-622), Supplemental Content (624-633, already `[required]="true"`), then the Deep Thinking toggle. The Supplemental `app-source-input` moves to directly after Product Name (FR-26). (3) **Label binding** of that same `app-source-input` at line 626 (`[label]="uiLabels().supplementalContent"`) must switch to a FAQ-specific label (FR-27); see the shared-key finding below. The `*` marker already renders for it (`source-input.component.html` line 4: `@if (required) { <span class="text-red-500">*</span> }`), so no change to `source-input` is needed. | no |
| `src/app/app.component.ts` | `TRANSLATIONS` `en` block (starts line 34; `supplementalContent: 'Supplemental Content (Optional)'` at 147) and `uk` block (starts line 208; `supplementalContent: 'Додатковий контент (Опціонально)'` at 320): a new FAQ-specific key (name is `so-planner`'s) must be added to BOTH blocks: English "Supplemental Content (Required)", Ukrainian default "Додатковий контент (Обов'язково)" (a single-quoted TS string needs the apostrophe escaped, as line 302's `обов\'язкові` already does; a pin must match the exact character the spec fixed). The existing `supplementalContent` key must NOT change (FR-28). No other `.ts` logic changes: `isFaqFormValid`/`isFaqFormComplete` (line 715), `generateFaqOnly` (961), `clearAll()` faq case (1122), `activeProductName` (577), `_autoSelectTab` (625), `tabDescriptors` (604) are unchanged by FR-24 to FR-28. | no |

That is the whole *must change* list for this revision: two files, both already in the Story's list. No `src/app/types.ts`,
`tab-descriptors.ts`, `faq-form.ts`, `source-input.component.*`, orchestrator, prompt, renderer, validator, server, README or
fixture change is implied by FR-24 to FR-28.

### Shared label/type fan-out (the one non-local finding)

`uiLabels().supplementalContent` is read at exactly two template sites: line 279 (inside `<ng-template #generatorForm>`, line 182,
which is rendered by BOTH `generator` and `ua-generator` through `*ngTemplateOutlet` at lines 413 and 1284) and line 626 (FAQ form).
So: relabelling the existing key in place would change three modes' forms at once (Generator, UA Description, FAQ) and violate
AC-26/FR-28; the FAQ label needs its own key (or an equivalent FAQ-only binding). `uiLabels` is typed by inference
(`computed(() => TRANSLATIONS[this.uiLanguage()])`, line 425; `TRANSLATIONS` has no declared type), so the template's
`uiLabels().<newKey>` is a type error in the Angular AOT template check (`ng build`) if the key exists in only one of `en` and
`uk`. That is the only possible en/uk key-parity guard in the repository (there is no spec that compares the two blocks key for
key; see correction under "Tests"); `tsconfig.json` sets no `strict`/`strictTemplates`, so how strictly the build checks a
union-typed property read was not verified (Unknown 6). `uiLabels()` is also passed whole as `[labels]` to `app-source-input` (`Record<string,string>`), which reads only
`inputText/inputPdf/inputUrl/inputMd/processing/normalizeBtn/malformedTableWarning`: unaffected by a new key.

The Generate-guard alert (OD-17): `alertFillFields` (en line 129, uk line 302: "...Original Description") is one shared key used by
four handlers (`buildGeneratorInput` 892, serving Generator and UA Description; `generateSeoOnly` 929; `generateSlugsOnly` 948;
`generateFaqOnly` 964). The OD-17 default is
unchanged text and no requirement. If the human later overturns that default, editing the shared key changes the alert of all
the sibling modes; a FAQ-only alert needs a new key plus a branch at line 964. Not in scope now.

### Needs re-verification even if unchanged

- `src/app/app.component.html` lines 1289-1333 (the `<header role="tablist">`) and the container at line 1335
  (`flex-1 overflow-y-auto p-8 relative`): FR-25's clause 2 is satisfied only if the FAQ branch has no centring or full-height
  sibling. After the empty-state block is excluded for `faq-generator`, the siblings above the tab panels are only the validation
  panel (line 1344, `@if (validationIssues().length > 0 && !isGenerating())`) and the repair panel (line 1372,
  `@if (repairReport().length > 0 && ...)`), both `max-w-5xl mx-auto mb-6`; the FAQ panels are `max-w-5xl mx-auto space-y-6`
  (line ~1513). Nothing centres. Structurally, FR-25 is met by FR-24's removal alone; no reordering is implied (OD-12 default).
- **Pre-run tab strip (OD-11).** The header is rendered for `faq-generator` unconditionally (line 1289:
  `hasGeneratorOutput() || ... || appMode() === 'faq-generator'`), and `deriveTabDescriptors` returns `[]` before any run
  (`faqArtifacts` empty; no `ua-generator` `html` tab for `faq-generator`; pinned by `tab-descriptors.spec.ts` lines 278-279).
  So today's pre-run FAQ screen = empty header band (`px-6 pt-6 pb-0`, `border-b`) over an otherwise blank area once the
  empty-state is removed. OD-11's carried default is to leave that; no file change. If the human decides to hide the strip,
  the change is at line 1289 of the template (not in `tab-descriptors.ts`), and the `tab-descriptors.spec.ts` pin stays valid.
- **Validation/repair panel placement (OD-12).** Both panels precede the tab panels in the same container; FR-25 is stated for the
  panel-free case. Default: no change. A run with a skipped language (OD-8) can show a panel, so FR-25 may hold only vacuously
  for such runs.
- `src/app/tab-descriptors.ts`, `src/app/types.ts`, `src/utils/faq-form.ts`, `src/app/components/source-input/*`,
  `src/services/content-orchestrator.service.ts`: read; no change from FR-24 to FR-28.
- The shared `content` signal (see silent-failure risk 1) is why the empty-state fix must be mode-scoped, not data-scoped.

### Tests that cover these surfaces

All are source-text/logic specs under `test:logic` (`vitest.config.ts` includes `src/**/*.spec.ts`; the only
`*.component.spec.ts` files are `content-template-select` and `model-settings`, so `test:components` has two files and no
`AppComponent` spec exists by prior decision).

| Spec | Relevance to FR-24 to FR-28 |
|---|---|
| `src/app/app.component.template-wiring.spec.ts` | The only spec reading `app.component.html`/`.ts` for the FAQ form. Pins listed precisely in the next section. |
| `src/app/tab-descriptors.spec.ts` | Pins pre-run `faq-generator` => `[]` (278-279) and per-mode tabs; relevant to OD-11 only. Unchanged by the default. |
| `src/utils/faq-form.spec.ts` | `isFaqFormComplete` enablement (AC-25 behaviour, restates AC-11). Unchanged; the move does not touch the predicate. |
| `src/app/app.component.export-guard.spec.ts` | Regex-extracts `downloadZip`/`downloadText` bodies and checks `alertGroundingBlocked` appears at least twice in `ts`; untouched by a new TRANSLATIONS key. |
| `src/app/content-template-labels.spec.ts` | Pins that `ts` contains `...TEMPLATE_LABELS.en` and `...TEMPLATE_LABELS.uk`; a new key in each block does not disturb it. |

## Existing tests: which break, which must be updated, which are at risk

**Result: no existing test fails if FR-24 to FR-28 are implemented minimally, and no existing pin needs to be weakened or
rewritten.** Evidence: grep over `src`, `test`, `tools` for `Supplemental Content`, `Опціонально`, `Додатковий контент`,
`noContentYet`, `fillFormStart`, `No content generated` finds the strings only in `app.component.ts` (TRANSLATIONS), the Story,
Specification, review and decision documents, and `faq-form.ts`/orchestrator/prompt comments; no spec asserts the current label
text, the Optional/Required wording, the field order, or the empty-state condition. Only the wiring spec reads the templates
(`grep -rln "app.component.html|app.component.ts|TRANSLATIONS"` over specs: exactly four files).

Pins in `app.component.template-wiring.spec.ts` that touch the changing regions, each checked against the change:

| Pin (lines) | Reads | Effect of the change | Verdict |
|---|---|---|---|
| "FAQ form takes Original Description, Tech Specs and Supplemental Content as text inputs" (213-217): `>= 3` `<app-source-input` in the FAQ block | field count | moving one field keeps the count at 3 | stays green |
| "Supplemental Content source input writes faqSupplementalContent and is the required one" (333-341): exactly one `app-source-input` with `(valueChange)="faqSupplementalContent.set($event)"`, contains `[value]="faqSupplementalContent()"` and `[required]="true"` | element attributes, not position or label | the move and a new `[label]` key leave all three assertions true; deleting `[required]="true"` WOULD break it, and AC-25/FR-27 require it to stay | stays green; constrains the implementer |
| "faq-generator sits beside slug-generator in the three result-view conditions" (236-239): `>= 3` lines containing both `appMode() === 'slug-generator'` and `appMode() === 'faq-generator'` | lines 1032, 1280, 1289 (exactly three today; line 1316 uses `!==` and is not counted) | the edits above touch none of these lines. **Brittle at the threshold**: reformatting, extracting or re-wording any of those three conditions (for example, to implement OD-11 at line 1289) drops the count to 2 and the pin fails, with no change of behaviour | stays green; at risk if lines 1032/1280/1289 are rewritten. A rewrite there would be a legitimate pin update only if the requirement being served is stated (OD-11 outcome); note it as a planner constraint |
| "SEO tab button is not offered for the FAQ Generator" (241-245): `'faq-generator'` within the 300 characters before `id="tab-seo"` | line 1316 condition | untouched | stays green |
| "FAQ Generator mode button shows uiLabels().faqGenerator" / "faqGenerator resolves to 'FAQ Generator' in both label maps" (262-274) | mode switcher, `faqGenerator` key | not touched by a new Supplemental key | stays green |
| "the mode label 'FAQ Generator' exists in BOTH UI languages" (110-124) | slices of `ts` between `const TRANSLATIONS` and `\n  uk: {` | slicing depends on the literal `\n  uk: {` anchor (line 208) and an 8-space-indented `en` block; adding keys inside the blocks is safe, restructuring the dictionary header is not | stays green |
| `faqForm()` helper (194-200, 296-302): block from `\n    @else if (appMode() === 'faq-generator')` to the next `\n    @else` | form block extraction | a moved field stays inside the block | stays green |

**Correction to the brief.** There is no spec that "compares the `en` and `uk` TRANSLATIONS blocks key for key". The wiring spec
only asserts that specific keys (`FAQ Generator`, `faqGenerator`) are present in each block. Key parity between the two blocks is
not enforced by any spec (for `alertGroundingBlocked`, only an occurrence count in `export-guard.spec.ts`), and possibly by the
`ng build` template check over the inferred union type (unverified). A new key present in only one block would not fail any
`npm test` spec; it may fail the build, or silently render nothing for the missing language.
The test writer should add a parity pin for the new key; that is a new test, not a changed one.

**Pins that do not exist and must be added at TEST_WRITING (new tests, no existing test modified):** AC-21 (the empty-state
condition excludes `faq-generator`, and still includes the other modes), AC-22 (FAQ branch has no centring or full-height
sibling; the panel-free structure), AC-23 (index order of the five fields inside the FAQ form block), AC-24 (FAQ label binding is
the new key; en value "Supplemental Content (Required)" with no "Optional"; the `*` comes from `[required]="true"`), the
Ukrainian value (OD-13 default; no "Опціонально"), AC-26 (the Generator/UA `generatorForm` still binds
`uiLabels().supplementalContent`; en value still "Supplemental Content (Optional)"; uk value still "Додатковий контент (Опціонально)").
Because AppComponent has no component spec, these land as source-text pins in the existing `*.spec.ts` family under `test:logic`
(`src/app/app.component.template-wiring.spec.ts` is the precedent); a rendered-DOM test would add a third `*.component.spec.ts`
to `test:components` with Angular DI cost (decision for the planner/test-writer, not made here). AC-22's geometric clause is a
manual browser check per OD-15 default.

If, and only if, the human overturns an OD default, the following pins are the ones that would legitimately change:
OD-11 (hide the pre-run strip): none in `tab-descriptors.spec.ts`; possibly the 236-239 count pin if line 1289 is rewritten
(justified by that OD, FR-24 is silent on the strip). OD-12 (move panels below the result): no existing pin reads panel
position. OD-17 (change the guard alert): no existing spec pins `alertFillFields` text.

## Hazard table (all seven checked)

| # | Hazard | Applies? | Evidence |
|---|---|---|---|
| 1 | `STORE_REGISTRY` fan-out | **Does not apply to FR-24 to FR-28.** | The v3 requirements are store-independent (Spec scope table: English label fixed by AC-24; only the interface language, not store locale, varies). No registry entry, language list or currency symbol is read or written by any v3 edit. `app.component.ts` is a registry consumer at file level (re-derived: `grep -rln STORE_REGISTRY` non-spec: `app.component.ts`, `html-editor/editor-html-pipeline.ts`, `prompt-core/{constants,doc-pipeline-flag,store-render-rules}.ts`, `render/render-description.ts`, `utils/{language-consistency,output-validator,protected-product-name,table-finalize}.ts`), but the two regions v3 edits (TRANSLATIONS label maps, the template) do not touch it. The FAQ-only tab descriptors read the registry through `getStore()` and are unchanged. Checked, expected none, found none. v1's FR-1 to FR-23 registry findings (16 FAQ translation pairs across 7 stores) are unchanged. |
| 2 | uk-UA is the master | **Does not apply to FR-24 to FR-28.** | No generation path is touched: no prompt, no Task A/C/FAQ call, no orchestrator edit. Only a label and layout in the FAQ screen. The Ukrainian *interface* label (OD-13) is a UI-language string and is unrelated to the uk-UA content master. v1's finding that a uk-UA FAQ change reaches all locales stands and is untouched. |
| 3 | prompt -> schema -> renderer -> validator chain | **None of the four links is touched.** | FR-24 to FR-28 change labels, field order and the arrangement of the central area (Spec 329-331; "AGENTS.md section 4 in play: none"). `src/prompts`, `src/prompt-core`, `src/domain`, `src/render`, `src/utils/output-validator.ts` and the FAQ sibling modules are not in the *must change* or *re-verification* lists. FR-21 to FR-23 (the FAQ section-4 criteria) are not weakened. Checked, expected none, found none. |
| 4 | FROZEN files (AGENTS.md section 9) | **None touched by the new requirements.** `task-c.ts` was authorised for FR-1 to FR-23 only. | The five FROZEN files (`task-a.ts`, `task-b.ts`, `task-c.ts`, `master-system-prompt.ts`, `output-validator.ts`) are not in any list above. Evidence: `bash arch-guard.sh` was run in this session on the current tree and ends `ALL CHECKS PASSED`, so `.arch-guard-checksums` matches the five frozen files as built; `src/prompts/task-c.ts` sha256 begins `619c45a98f6d`. v3 needs no re-baseline and no new section-9 stop. |
| 5 | Corpus conformance harness | **Does not apply.** | No rendered-description output changes (renderer untouched). `test/fixtures/corpus/` (Ortur H20 20 W, two stores) and `test/render-reconciliation.report.md` section 5 item 2 ("corpus is 2 items, same product") stand; the corpus has no UI or FAQ coverage and v3 needs none: its checks are template-structure and label pins, not HTML conformance. `grep -rn "faq-generator" test tools` finds nothing. |
| 6 | The two test runners | **Applies: new tests land in `test:logic`.** | Template/label pins are source-text specs in the existing family (`src/app/app.component.template-wiring.spec.ts` precedent, header comment: "no `AppComponent` spec ... rejected"). `test:components` still holds two files (`content-template-select`, `model-settings`). A rendered-DOM assertion for AC-21/AC-22 would be a third `*.component.spec.ts` under `ng test` with full Angular DI for `AppComponent` (heavy; previously rejected twice). |
| 7 | `server/**` | **Does not apply.** | No server file is read or written by v3; no `taskLabel`, usage row or call-log field changes (the v3 edits do not call the LLM). `server/usage/store.js` no-migration hazard not tripped. |

## Silent-failure risks (produce wrong output, no error)

1. **Data-derived empty-state fix leaks into other modes.** `content` is one shared signal across modes and `setMode()` does not
   reset it (line 775). The tempting fix, adding `!hasOutput()` or `!hasFaqOutput()` to the shared condition, would hide the empty
   state of SEO Generator, Slug Generator and UA Description whenever a FAQ run happened earlier in the session (leftover
   `faqArtifacts`), silently breaking AC-26/FR-28 with no error and passing every FAQ-only check. The condition must be
   scoped by `appMode()`. Equally, making `mainHtmlUa` or `translations` non-empty to dodge the block would break FR-18/FR-24 and
   change the ZIP output; the spec forbids it.
2. **Relabelling the shared key.** Editing `supplementalContent` in TRANSLATIONS (rather than adding a FAQ key) relabels Generator
   and UA Description as well (one `ng-template` serves both). Passes the FAQ pins and fails AC-26; no existing test would notice
   (nothing pins the Optional text today).
3. **One-language label.** A new key added to `en` but not `uk` may fail `ng build` (unverified) and fails no spec; if added to both with an English string in `uk`,
   or with "Опціонально", nothing fails and the Ukrainian interface shows a wrong or still-Optional label for a mandatory field
   (FR-27, OD-13). Existing specs do not compare the two blocks.
4. **Marker without enforcement, or enforcement without marker.** The `*` comes only from `[required]="true"` on the
   `app-source-input` and enablement from `isFaqFormComplete`; the label text "(Required)" is independent of both. A label change
   alone looks right and proves nothing about AC-25 (that stays pinned by `faq-form.spec.ts` and the wiring spec at 333-341).
5. **Blank central area after a no-FAQ run (OD-16).** With the empty-state block gone, a run whose master was empty or failed
   (FR-10, OD-8) leaves the header band and nothing else; the validation/repair panels may be the only cue. By the spec this
   is accepted and flagged to the human, not an implementation defect.
6. **Pre-run empty header band (OD-11 default).** `<header>` with `pt-6`, `border-b` and zero tabs renders before any run. Not an
   error; a visible leftover that AC-21 deliberately does not constrain.
7. **Wiring-pin count at threshold.** The "three result-view conditions" pin (lines 236-239) passes with exactly three matching
   lines (1032, 1280, 1289). A refactor of any of them (for example extracting an `isStandaloneMode` helper while serving
   OD-11) fails it without any behavioural change.
8. **`restoreHistory`** (always `generator` mode) and the `seo_gen_form_state` localStorage persistence do not include the FAQ
   fields or labels; unaffected, but it means a history restore never exercises the FAQ form (cannot hide a layout regression).

## Failures that will error (for contrast)

Possibly an `ng build` template type error if the new `uiLabels().<key>` exists in only one TRANSLATIONS block (unverified, see Unknown 6); `npm run lint`
(`tsc --noEmit`) on an unescaped apostrophe in the single-quoted Ukrainian string "Обов'язково"; the wiring-spec pins named above
if `[required]="true"` is dropped from the Supplemental input or the FAQ block markers (`@else if (appMode() === 'faq-generator')`
at four-space indent) are restructured.

## Fixture and corpus impact

None. No fixture moves: `test/fixtures/corpus/`, `test/fixtures/golden/full-description-prompts.json` (the 12 keys, including the
three `c/*` Task C keys) and `test/fixtures/full-description-inputs.ts` are read by renderer and prompt specs that v3 does not
touch. No new fixture is needed: the new pins read `app.component.html`/`.ts` as text. Corpus coverage gap
(`test/render-reconciliation.report.md` section 5: two items, one product) is not relevant to a UI-only change.

## Blast-radius summary

FR-24 to FR-28 are a two-file change inside `src/app/app.component.html` and `src/app/app.component.ts`, confined to the
`faq-generator` branches and one new FAQ-specific label key in both `TRANSLATIONS` blocks. The planner must (a) scope the
empty-state exclusion by mode at the single condition on line 1447, (b) move the Supplemental `app-source-input` in the FAQ form
(lines 624-633) to directly after Product Name (after line 602), (c) bind it to a new label key rather than the shared
`supplementalContent`, which Generator and UA Description render from the one `generatorForm` template (line 279), and (d) leave
`[required]="true"`, the predicate, the data fields and `tab-descriptors` alone. No FROZEN file, `STORE_REGISTRY` entry,
prompt, schema, renderer, validator, fixture, server file or already-built FR-1 to FR-23 file is touched; `arch-guard.sh` passes
today. No existing test breaks and none needs weakening; the new behaviour needs new source-text pins under `test:logic`, plus a
manual browser check for AC-22's geometry (OD-15). The risks to design against are the shared-signal leak into other modes,
relabelling the shared key, a one-language label, and the exactly-three-lines wiring pin.

## Unknowns

1. **Human outcomes on flagged defaults.** OD-13 (Ukrainian wording "Додатковий контент (Обов'язково)", apostrophe character),
   OD-11 (pre-run strip), OD-12 (panel placement), OD-16 (blank area after a no-FAQ run), OD-17 (guard alert text) were approved
   as carried defaults with Specification v3. If the human overturned any of them in `HUMAN_SPEC_APPROVAL` beyond what the
   Specification records, the affected file list changes as noted above. The Specification as approved was taken as-is.
2. **Real rendered geometry for AC-22 clause 2** was not observed (no browser run in this stage). The template read shows no
   centring or full-height sibling in the FAQ branch once the empty-state is excluded; the manual check settles it.
3. **Whether the planner prefers a new key or a FAQ-only binding for the label** (both avoid the shared key); not decided here.
4. **Exact character of the apostrophe** in the Ukrainian default: the Specification quotes an ASCII `'`; the repository's Ukrainian
   strings use an escaped ASCII apostrophe (`\'`, line 302). The test writer should pin the same character the Specification fixes.
5. **Whether `test:components` must stay at two files** is a planner/test-writer decision (source-text pins versus a rendered
   `AppComponent` spec).
6. No live-browser or build run was performed in this stage (impact analysis reads, does not execute the app); `npm run build`
   was not run, and `tsconfig.json` sets no `strict`/`strictTemplates`, so whether a one-sided TRANSLATIONS key fails `ng build`
   is inferred from `uiLabels = computed(() => TRANSLATIONS[this.uiLanguage()])`, not observed. The test writer should not rely
   on the build to catch it.
