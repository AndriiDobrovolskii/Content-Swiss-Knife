---
artifact: open_decisions
story: US-8.1
version: 2
status: ARCHIVED
owner: so-clarifier
created_at: 2026-10-14T14:00:00Z
updated_at: 2026-10-15T11:00:00Z
supersedes: docs/decisions/US-8.1-open-decisions.md#1
inputs_consumed:
  - key: story
    version: 3
  - key: open_decisions
    version: 1
open_decisions_blocking: false
---

# US-8.1 - Open Decisions (v2)

Re-run against Story v3 (the operator's FAQ Generator layout change of requirements, AC-21 to AC-26, UI-Q1 to UI-Q5).
v1 (written against Story v2) is superseded. OD-1 to OD-9 are carried forward with their ids and text unchanged; none was
answered by Story v3 or by any source read, so none is dropped. OD-10 to OD-16 are new from the v3 change; OD-17 is a new
finding about the same UI; OD-18 to OD-20 record the three points that Specification v2 ("Open questions", SP-1 to SP-3)
raised but that were never logged. This stage records questions only; every "Default a spec may carry" below is a proposal
the human can overturn at HUMAN_SPEC_APPROVAL, not a decision.

Sources read for the v1 items: Story v2; `README.md`; `AGENTS.md` (sections 3, 4, 9, 11); `STORE_REGISTRY` in
`src/prompt-core/constants.ts`; `test/render-reconciliation.report.md` (headings, grep for FAQ); and, to ground the
questions, `src/prompts/task-faq.ts`, `src/prompts/task-c.ts`, `src/utils/structural-parity.ts`,
`src/services/content-orchestrator.service.ts` (`generate()` Steps 4-5, `generateUaContent()` Step 4,
`generateSeoMetadata`, `generateSlugs`), `src/app/app.component.ts` (`tabDescriptors`, `restoreHistory`,
mode reset) and `src/utils/output-validator.ts` (`validateGeneratedHtml`). `bash arch-guard.sh` was run read-only: all
five frozen checksums currently match.

Additional sources read for the v2 items (read-only, nothing changed): Story v3 (Context "Change of requirements", Scope
"UI scope", AC-21 to AC-26, Out of scope, Open questions UI-Q1 to UI-Q5); `docs/specifications/US-8.1-spec.md` v2 (FR-15,
FR-16, FR-18, Out of scope, "Open questions" SP-1 to SP-3, read only for the text of SP-1 to SP-3 and for the conflict check;
it is deliberately not listed in `inputs_consumed`, because this stage precedes it); `src/app/app.component.html` (FAQ form
`@else if (appMode() === 'faq-generator')`, the generator/SEO/Slug/FAQ result view, the empty-state condition);
`src/app/app.component.ts` (`TRANSLATIONS` en/uk, `tabDescriptors`, `baseFaqTabLabel`, `generateFaqOnly`);
`src/app/tab-descriptors.ts`; `src/app/components/source-input/source-input.component.html`;
`src/app/app.component.template-wiring.spec.ts` (what the existing UI tests pin); `src/prompt-core/constants.ts`
(`bcp47ToTaskCLang`, `MASTER_LOCALE`).

| id | Topic | Origin | blocking |
|---|---|---|---|
| OD-1 | "3 attempts" vs the repair gate budget; master exhausted; "exactly one call" vs retries | Story Q1 + new | false |
| OD-2 | Scope of the `<strong>` ban (FAQ only vs product-wide) | Story Q2 | false |
| OD-3 | Structural-parity tag set (`h3`/`p`/`li` vs `h3`/`ul`/`li`) and whether the change is FAQ-scoped | new | false |
| OD-4 | What "valid HTML" means for the master; empty master response; who enforces AC-9 | new | false |
| OD-5 | How Task C "recognises a FAQ input" and which description-only blocks it drops | new | false |
| OD-6 | FAQ translation call parameters: model tier, normalizers, validators, protected-name block | new | false |
| OD-7 | `<b>` policy beyond the tag swap: placement, preservation in translations, `<strong>` attributes and ordering | new | false |
| OD-8 | How a skipped language or dropped FAQ is surfaced to the operator | new | false |
| OD-9 | Standalone FAQ tool: form inputs, output tabs, state reset, history restore | new | false |
| OD-10 | Scope of the v3 layout change: FAQ Generator only, or also the shared empty state / field order of other modes (Story UI-Q1) | Story UI-Q1 | false |
| OD-11 | What the FAQ Generator central area shows before any run, including the tab-bar strip (Story UI-Q2) | Story UI-Q2 | false |
| OD-12 | Validation / repair panels versus "result directly under the tabs" (Story UI-Q3) | Story UI-Q3 | false |
| OD-13 | Ukrainian-UI wording of the FAQ Generator Supplemental Content label (Story UI-Q4) | Story UI-Q4 | false |
| OD-14 | Version-tab labels stay as they are (Story UI-Q5) | Story UI-Q5 | false |
| OD-15 | How AC-22 ("not vertically centred or pushed down by a full-height sibling") is verified | new (v3 ACs) | false |
| OD-16 | AC-21 removes the only "nothing produced" cue: a run that stores no FAQ leaves a blank central area | new (v3 ACs x OD-8) | false |
| OD-17 | The Generate-guard alert text names Original Description as mandatory in FAQ Generator | new (v3 ACs) | false |
| OD-18 | SP-1: a thrown provider error counts as one failed attempt | Spec v2 SP-1 | false |
| OD-19 | SP-2: FAQ translations preserve numbers, units, currency symbol and product names; no AC | Spec v2 SP-2 | false |
| OD-20 | SP-3: a store profile without uk-UA / N = 1 (the `getStore()` fallback) | Spec v2 SP-3 | false |

No item is `blocking: true`.

## OD-1 (Story Q1) - Do "3 attempts" replace or add to the repair gate budget; master exhausted; "exactly one call" - blocking: false

**Question.** Do the 3 attempts of AC-16 (master) and AC-17 (per-language translation) replace the repair gate's own
`maxRepairs()` budget, wrap around it, or count the gate's attempts inside them? And, if the uk-UA master is still invalid
after 3 attempts, is the whole FAQ dropped (no translations, nothing stored)?

**What was checked.** `content-orchestrator.service.ts` runs each FAQ in `runRepairGate` with `maxRepairs: this.maxRepairs()`;
`maxRepairs` is a signal defaulting to `1` (line ~203). The Story names only "3 attempts" and "skip a failed language".
The Story's Q3 decision does not mention the repair gate. Nothing in AGENTS.md section 3 or 4 speaks to retry budgets.

**Why it cannot be inferred.** Both "3 total per artifact" and "3 attempts, each with its own repair-gate budget" fit the Story
text, and they produce different call counts (3 vs up to 3 x (1 + maxRepairs)).

**Impact if unresolved.** A spec writer must pick a call-count contract that tests then pin. A second tension follows:
AC-1 and AC-14 say "exactly one call uses the FAQ generation prompt", which holds only when the first master response is
valid; AC-16 and the existing repair gate both allow further `buildPromptFaq`-derived calls. Left unsaid, a test for AC-1 will
either fail on any repair, or silently exclude retries.

**Default a spec may carry:** 3 is the total number of produce attempts per artifact, counted across the repair gate (the gate's
repair attempts are attempts); AC-1/AC-14 are read as "one call in the first-attempt case, at most 3 in total"; an unusable
master after 3 attempts stores no FAQ at all and makes no translation call.

## OD-2 (Story Q2) - Is the `<strong>` ban FAQ-scoped or product-wide - blocking: false

**Question.** The operator said `<strong>` must be "nowhere". The Story reads that as nowhere in a FAQ and leaves
descriptions as US-6.2 decided (both tags preserved). Is a product-wide ban intended?

**What was checked.** Story Context ("Q1 - `<strong>`": replacement runs "on the final FAQ HTML", "the description path stays as US-6.2
left it"); Story Out of scope ("`<b>`/`<strong>` handling in descriptions, the Optimizer and the HTML editor (US-6.2)");
`docs/stories/US-6.2-preserve-b-and-strong-tags.md` is referenced and archived; `html-cleaner.ts` and `task-a-doc.ts` still
contain `strong` handling.

**Why it cannot be inferred.** The Story itself records the question as open. The Out of scope list excludes descriptions, which
points to FAQ-only, but the operator's wording ("nowhere") points the other way; the Story author did not resolve it.

**Impact if unresolved.** Low for this Story: the specification stays FAQ-scoped. A product-wide ban would be a separate Story that
re-opens US-6.2 and touches the description path (including FROZEN files).

**Default a spec may carry:** FAQ-scoped; the Story's Out of scope list stands.

## OD-3 - Structural-parity tag set and scope - blocking: false

**Question.** Which elements does the FAQ parity check count, and is the extension applied only to FAQ input or to every call of
`validateStructuralParity`?

**What was checked.** The Story contradicts itself: Scope and Context (Q2) say `structural-parity.ts` is "extended to cover `h3`,
`ul` and `li`", while AC-3 and AC-19 require equal counts of `h3`, `p` and `li`. In `src/utils/structural-parity.ts`
`COUNTED_TAGS` already contains `<h3>` and `<li>` (and `section`, `h2`, `hr`, `figure`, `figcaption`, `table`, `tr`, `td`); it does
not contain `<p>` or `<ul>`. `validateStructuralParity` is called by the description translation loop in `generate()` (Step 4) with no
FAQ switch. AC-18 pins only the Task C prompt bytes, not the parity behaviour on descriptions; Out of scope says "changing any
other mode" is excluded.

**Why it cannot be inferred.** `h3` and `li` need no extension; `ul` and `p` are the only real additions and the Story names a
different one in each place. Adding `<p>` to the shared list would newly fail description translations whose paragraph counts
differ from the master, which no AC covers.

**Impact if unresolved.** The spec cannot state FR text for the check. A global `<p>`/`<ul>` addition risks regressing every
description translation (new `structural-parity-count` errors, extra repair attempts, spend); a FAQ-only addition needs a new
parameter or a sibling function and a way for the FAQ path to select it.

**Default a spec may carry:** the ACs are authoritative (`h3`, `p`, `li`; `ul` also counted so a dropped list is caught); the
additional tags apply to FAQ input only, selected explicitly by the caller; description-path behaviour is byte-for-byte unchanged and
pinned by an existing-behaviour test.

## OD-4 - Meaning of "valid HTML", an empty master response, and who enforces AC-9 - blocking: false

**Question.** (a) What check decides that a master is "not valid HTML" (AC-16)? (b) What happens when the model returns an empty
response, which `task-faq.ts` explicitly allows when no question is answerable: retry, accept as "no FAQ", or error? (c) Which
component enforces AC-9 (well-formed; only `h3`, `p`, `b`, `ul`, `li`), and what does a violation trigger: a repair-gate error, a
deterministic strip/unwrap, or a skipped artifact? (d) Are attributes (`class`, `style`) on those elements allowed?

**What was checked.** `validateGeneratedHtml` (FROZEN `output-validator.ts`) returns an `empty-output` error for an empty string,
and the FAQ wrapper adds `non-html-output` when text does not start with `<`; neither checks tag balance or the allowed-tag set. The
prompt says "return an empty response" when nothing is answerable and forbids wrapper divs and `class` attributes. In
`generate()` the artifact is stored only if `faqHtml.startsWith('<')`. `output-validator.ts` is FROZEN and the operator's section 9
permission names only `task-c.ts`, so a new rule must live in a sibling module.

**Why it cannot be inferred.** The existing code treats an empty response as an error (retried under the gate, then skipped
with a console warning); the prompt treats it as a valid outcome. AC-9 describes an outcome but no mechanism; no existing check
covers tag balance or the tag whitelist.

**Impact if unresolved.** A retry loop (AC-16) can burn 3 calls on a product with legitimately no answerable questions, and
AC-9 has no defined failing path, so the repair gate may never act on it.

**Default a spec may carry:** "valid" = non-empty, starts with `<h3`, balanced tags, only the five allowed elements, no attributes;
a new check in a sibling module (not `output-validator.ts`) reports violations as errors in the same gate; an empty master is a
terminal "no FAQ" outcome (no retry, nothing stored, no translations).

## OD-5 - How Task C recognises a FAQ input, and what it drops for FAQ - blocking: false

**Question.** What exactly makes `buildPromptC` treat its input as a FAQ (a new option, or detection from the HTML), and which of
its current description-oriented parts are omitted or replaced for a FAQ?

**What was checked.** `task-c.ts` always emits `MASTER_SYSTEM_PROMPT` as a cached system block, then an instruction that speaks of
"complete description", `<hr>` after `</section>`, "Technical specifications" and "What's in the box" labels, a commercial-closing
`<h2>`, a delivery-region block, an optional H1 LOCK, `HEADING_FIDELITY`, store ToV overlays (EXPERT3D, Center 3D Print) and the
uk-UA anti-calque guard. A FAQ input has no figures, so `pack()` selects `STANDALONE_SNIPPET_NOTE` ("do not ask for ... a fuller
description"). A description already contains `<h3>` (spec categories, `countSpecCategories`), so the presence of `<h3>` alone is
not a discriminator. The Story says only that Task C "recognises a FAQ input and adapts its instructions" and AC-19 "carries
FAQ-specific instructions"; AC-18 requires byte-identical prompts for non-FAQ input.

**Why it cannot be inferred.** The Story fixes the outcome (AC-18, AC-19) but not the discriminator or the exact adaptation; both
are design choices inside a FROZEN file.

**Impact if unresolved.** The spec writer must invent the recognition rule. A weak rule can reclassify a description as a FAQ and
break AC-18, which would silently change every description translation. Leaving the description-only blocks in place would tell
the model to append a closing CTA `<h2>` and a delivery sentence to a FAQ, breaking AC-3 and AC-9. Also open: which inputs the
AC-18 byte-identity is asserted over (all targets for all stores, or a representative set).

**Default a spec may carry:** an explicit option on `buildPromptC` (not HTML sniffing) selects the FAQ variant; the variant keeps
per-language ToV/terminology and the unit/number rules and drops the CTA, closing-H2, spec-label, H1 LOCK and delivery blocks;
AC-18 is asserted by snapshot over every `STORE_REGISTRY` store x language pair (the existing golden approach).

## OD-6 - FAQ translation call parameters: model tier, normalizers, validators, protected name - blocking: false

**Question.** For each FAQ translation call: which model slot (fast, or the Extended Thinking slot when the toggle is on), which
deterministic normalizers run, which validators run beside structural parity, and is the US-7.1 protected-name block applied?

**What was checked.** In the description loop, translation calls pass `useThinking`, then apply `applySpanishExpert3dReplacements`
(EXPERT3D es/pt), `fixNumberFormatting`, `fixDecimalSeparator`, `restoreIdentifierDots`, `cyrillizeUnits`, `normalizeTerminology`,
`canonicalizeMultiInOne`, `restoreMediaSrcs`; validate with `validateGeneratedHtml` + `validateStructuralParity` +
`validateHeadingStyle`; repair with `blockRepairer`; and wrap the prompt in `withProtectedNameBlock` (US-7.1). The current FAQ
path has the normalizer chain but no `withProtectedNameBlock`. AGENTS.md section 3 says Task C "always runs on the fast model",
while the code passes `useThinking`. `validateHeadingStyle` targets description headings, not FAQ questions. The Story is silent on
all of these.

**Why it cannot be inferred.** Each is plausible either way, and each changes cost and output (the Spanish EXPERT3D replacements
alter wording; a missing protected-name block lets a product name be shortened in a FAQ answer, the class of defect US-7.1 closed
for descriptions).

**Impact if unresolved.** The spec writer would copy the description loop wholesale (including a heading-style check that does not
apply) or invent a subset; either way the translated FAQ and the description for the same store can be normalised differently.

**Default a spec may carry:** mirror the description translation loop except for description-only checks (`validateHeadingStyle`,
media restoration); keep `useThinking` as the description loop does; apply `withProtectedNameBlock`.

## OD-7 - `<b>` policy beyond the tag swap - blocking: false

**Question.** (a) Should the master prompt tell the model where to place bold (lead sentence of a `<p>` answer, list-item labels,
or either), or only permit `<b>`? (b) Must translations preserve the master's `<b>` elements (count or placement), given AC-3
counts only `h3`/`p`/`li`? (c) Does the deterministic `<strong>` to `<b>` step keep attributes on the tag, and does it run before
validation and parity or only on the stored result?

**What was checked.** `task-faq.ts` permits `<p>`, `<strong>`, `<b>`, `<ul>`, `<li>` and gives no bold placement guidance. The
Story's Context shows a uk-UA reference with bold only inside list items and records the operator's confirmation that a bold lead
sentence in es-ES "stays", with only the tag changing; AC-8 says a bold lead inside `<p>` is not flagged, stripped or moved. The
orchestrator's `blockRepairer` patches single blocks and could reintroduce `<strong>` after a step that ran earlier.

**Why it cannot be inferred.** The Story fixes the tag, not the policy. Two translations of one master could differ in emphasis
and still pass every AC.

**Impact if unresolved.** Cross-language emphasis drift (the operator's original complaint was cross-language inconsistency) can
persist unnoticed; a conversion that runs before the block repair pass can let `<strong>` back in, breaking AC-7 on the stored
text.

**Default a spec may carry:** the prompt permits `<b>` without prescribing placement; no `<b>` parity check; conversion is a pure
rename (attributes kept) applied last, on the stored text of every artifact, in addition to the prompt change.

## OD-8 - Surfacing a skipped language or a dropped FAQ - blocking: false

**Question.** When a language is skipped after 3 failed translations (AC-17), or the master is dropped (OD-1), what does the operator
see, and what is recorded?

**What was checked.** Today a skipped FAQ logs `console.warn('[FAQ] No usable artifact ...')` only. AC-3 says a parity failure is
"reported as a validation issue", while AC-17 says that after 3 attempts the language has no entry. The orchestrator already
exposes `validationIssues` and `repairReport` signals. Project convention: user-facing
QA warnings are Ukrainian. The Story does not say whether the history entry (AC-15, and the equivalent in Generator) is still
written for a partial result.

**Why it cannot be inferred.** The ACs state the absence of an entry but not any message; `STORE_REGISTRY` and AGENTS.md hold
nothing on operator messaging.

**Impact if unresolved.** A silently missing FAQ tab looks like "no FAQ was requested", which is indistinguishable from AC-5. The
spec writer would invent the wording and the issue severity.

**Default a spec may carry:** each skipped language adds a Ukrainian-language error-severity issue to `validationIssues` naming
the language; the final parity issues stay in the repair report; the history entry is still written for a partial result.

## OD-9 - Standalone FAQ tool: inputs, tabs, state reset, history - blocking: false

**Question.** (a) Does the tool reuse the Generator's form fields (product name, store, description, specs, supplemental content) or
have its own signals like the SEO and Slug tools? (b) Which tabs does a standalone run show, given `mainHtmlUa` is `''`
(AC-13)? (c) What does switching modes clear? (d) What does restoring a standalone history item do?

**What was checked.** SEO and Slug modes have their own input signals (`seoProductName`, `slugProductName`) and own reset branches in
`setMode`. `tabDescriptors` always emits the master-locale description tab, and for every non-master locale it `continue`s when
`translations[taskKey]` is missing, so FAQ tabs for N-1 languages would not appear in either the standalone run (`translations` is
`{}`) or UA Description (single-tab branch) without a change. `restoreHistory` always switches to `generator` mode. AC-10 to AC-12
fix the label, the toggle, the button enabling and the optional fields; AC-4 requires a tab per language in UA Description; AC-13
states no tab expectations for the standalone tool.

**Why it cannot be inferred.** The Story fixes behaviour of the Generate action and the stored data, not the screen.

**Impact if unresolved.** An empty "description" tab, or no FAQ tabs at all for N-1 languages, would pass AC-13 yet be unusable; a
spec writer would invent the layout.

**Default a spec may carry:** own signals following the SEO/Slug pattern; the tool shows only FAQ tabs (one per store language, master
first); mode switch clears the FAQ output; history restore of a standalone item opens in the standalone mode if the item can be
identified, otherwise in Generator as SEO-only items do today.

## v2 additions - raised by Story v3 (the FAQ Generator layout change, AC-21 to AC-26)

Common findings behind OD-10 to OD-17, read from the code on the branch (nothing changed):

- The empty-state block is the `<div class="h-full flex ...">` at `app.component.html` ~line 1447, guarded by
  `appMode() !== 'generator' && !content().mainHtmlUa && !content().seoData && !content().slugData && !isGenerating()`. It
  sits inside the result view whose outer condition (~line 1289) is `hasGeneratorOutput() || seo-generator || slug-generator ||
  faq-generator`, so today it appears for SEO Generator and Slug Generator before their first run, and for FAQ Generator both
  before a run **and after a successful run** (AC-13 leaves all three fields empty). The Story's reading is accurate.
- The FAQ form already marks Supplemental Content required: `[required]="true"` on the `app-source-input` (the component
  renders `{{ label }} *` and a red border while blank), and `isFaqFormValid()` already disables Generate while it is blank.
  The label text comes from the single shared `uiLabels().supplementalContent` (`'Supplemental Content (Optional)'` in `en`,
  `'Додатковий контент (Опціонально)'` in `uk`), used by the Generator/UA Description form (~line 279) and the FAQ form
  (~line 626).
- `uiLanguage` is a global `'en' | 'uk'` toggle that does not depend on the selected store; `TRANSLATIONS.en` and
  `TRANSLATIONS.uk` are kept key-for-key (the existing `app.component.template-wiring.spec.ts` compares the two blocks).
- Conflict check against the approved Specification v2: AC-25 restates FR-16 / AC-11 (no conflict); AC-21 to AC-23 and AC-26
  do not touch FR-15, FR-16 or FR-18 semantics (data fields, enablement, and the mode label are unchanged); AC-13 / FR-18
  (the three fields stay empty) is the **cause** of the visible defect, and is not changed. One real friction: Specification
  v2 "Out of scope" excludes "the layout of the standalone tool's output tabs ... (OD-8, OD-9)", which AC-21/AC-22 now
  partly cover, so the Specification must be revised for the new ACs (a finding for so-spec-writer, not an Open Decision).
- FROZEN / Rule check: the UI change is in `app.component.html` and `app.component.ts`, neither FROZEN (AGENTS.md section 9);
  no prompt, `task-c.ts`, validator or `STORE_REGISTRY` change is implied; AGENTS.md section 4 HTML criteria concern generated
  HTML and are not in play for a layout change; no AC-21 to AC-26 text contradicts a Rule.
- Store / locale scope: AC-21 to AC-26 are store-independent (they concern the form and the central area for every store).
  The only locale-dependent point is the Ukrainian-UI label (OD-13); the English label is fixed by AC-24.

## OD-10 (Story UI-Q1) - Scope of the layout change - blocking: false

**Question.** Does the empty-state removal and the field reorder apply to FAQ Generator only (as AC-26 assumes), or does the
operator also want the shared empty state removed or the Supplemental Content position / label changed in other modes?

**What was checked.** Story Scope row "UI scope", AC-26 and Out of scope all say FAQ Generator only, and the operator's quote in
the Story names only "FAQ Generator". In the code the empty-state guard (see the common findings above) is shared with SEO Generator and
Slug Generator, where it is shown only before the first run, so those modes do not show the defect the operator saw (their
result is non-empty after a run). The Supplemental Content label string is shared with the Generator and UA Description forms,
where the field really is optional.

**Why it cannot be inferred.** The Story presents this as an open question with a default; no source states the operator's
intent for the other modes.

**Impact if unresolved.** If the intent was wider, the delivery rejects again at the PR gate for a missing change. If it was
narrower than AC-26 pins, a test written for AC-26 would lock in the current empty state of SEO / Slug Generator.

**Default a spec may carry (the Story's own, AC-26):** FAQ Generator only; every other mode, including the empty state of SEO
and Slug Generator, unchanged.

## OD-11 (Story UI-Q2) - What the FAQ Generator central area shows before any run - blocking: false

**Question.** Before a run (and with no store selected), what is in the FAQ Generator central area: nothing, a placeholder, or
the tab bar strip?

**What was checked.** The Story default says "nothing ... beyond the tab bar, if it is rendered at all (AC-21)", which does not
decide whether the tab bar is rendered. In the code the `<header role="tablist">` is rendered whenever the mode is
`faq-generator` (outer condition ~line 1289); `tabDescriptors()` returns `[]` with no store or no `faqArtifacts`
(`tab-descriptors.ts`), so before a run the header is an empty bordered strip (`pt-6`, no buttons) above an empty area.

**Why it cannot be inferred.** AC-21 pins the absence of the empty-state block only; "if it is rendered at all" leaves two
different screens, and a test cannot assert both.

**Impact if unresolved.** The specification writer must choose between "empty bordered strip stays" and "no header until a
result exists". The first leaves a visible empty bar (probably an unintended-looking leftover of the removal); the second is an
extra change to the tab bar condition that the operator did not ask for.

**Default a spec may carry (the Story's):** nothing is shown beyond whatever the tab bar renders today; AC-21 constrains only
the empty-state block. Whether to also hide an empty tab strip is left to the human.

## OD-12 (Story UI-Q3) - Validation and repair panels versus "result directly under the tabs" - blocking: false

**Question.** When the validation panel or the repair panel is shown, does it stay above the result (AC-22 is then not met
literally), or move below it?

**What was checked.** Both panels are rendered inside the same scroll container, above the tab panels
(`validationIssues().length > 0 && !isGenerating()`; `repairReport().length > 0 && (repairedArtifactsCount() > 0 ||
validationWarningCount() > 0) && !isGenerating()`). They also appear for warnings, not only errors. Specification v2 reports a
skipped language only through the OD-8 default (an error issue in `validationIssues`), which would put a panel above the result
in exactly the runs where a language was skipped. How often a FAQ run produces any issue or repair report was not measured.

**Why it cannot be inferred.** AC-22 is stated "with no validation or repair panel shown", which defines the behaviour only for
the clean case; the Story leaves the panel case open on purpose.

**Impact if unresolved.** The "clean run" precondition may be the minority case; if so AC-22 is satisfied vacuously for most real
runs and the operator sees the result pushed down again. A test written for AC-22 must also fix which stubbed run counts as
"clean".

**Default a spec may carry (the Story's):** panels stay where they are; AC-22 is asserted for the case with no panel.

## OD-13 (Story UI-Q4) - Ukrainian-UI wording of the FAQ Generator Supplemental Content label - blocking: false

**Question.** What is the label text when the interface language is Ukrainian (`uiLanguage` = `uk`) for the FAQ Generator
field, and does the Generator / UA Description label keep "Додатковий контент (Опціонально)" in that language?

**What was checked.** AC-24 fixes the English text only. `TRANSLATIONS.uk.supplementalContent` is
`'Додатковий контент (Опціонально)'`. The existing wiring spec compares the `en` and `uk` blocks key for key, so a FAQ-specific
label key added for English must also exist in `uk`; the Ukrainian string cannot be left undefined. The operator supplied no
Ukrainian text.

**Why it cannot be inferred.** The wording is a product-copy decision; deriving it from "Опціонально" by substitution is a guess
about the operator's preferred term (for example "Обов'язково" versus "Обов'язкове").

**Impact if unresolved.** The implementation must ship some Ukrainian string; a test for AC-24 cannot assert it without a
decision, and a wrong word is operator-visible copy in a project whose user-facing text is Ukrainian-first.

**Default a spec may carry (the Story's):** `"Додатковий контент (Обов'язково)"`, flagged for human approval at
HUMAN_SPEC_APPROVAL; AC-24 itself fixes only the English text.

## OD-14 (Story UI-Q5) - Version-tab labels - blocking: false

**Question.** Do the FAQ Generator version-tab labels stay as they are today?

**What was checked.** The operator listed "Ukrainian FAQ, European English FAQ, ES FAQ, PT FAQ". In the code the master tab label
is `baseFaqTabLabel()` = `uiLabels().ukrainianFaqTabLabel` ("Ukrainian FAQ") when `mainHtmlLocale` is `uk-UA`, which the
standalone run sets; the other tabs are `` `${taskKey} FAQ` `` with `taskKey` from `bcp47ToTaskCLang`: `en-ES` and `en-GB` map
to "European English", `es-ES` to "ES", `pt-PT` to "PT". For `EXPERT3D` today's labels therefore equal the operator's list
exactly. The tab bar order is `STORE_REGISTRY` language order, uk-UA first.

**Why it cannot be inferred.** The code evidence suggests "unchanged" is consistent with the operator's message, but only the
operator can say that no wording change was meant; the Story keeps the question open.

**Impact if unresolved.** Low: the labels would be changed by mistake or left; Out of scope already says they are not renamed.

**Default a spec may carry (the Story's):** unchanged; renaming or restyling the tabs is Out of scope.

## OD-15 - How AC-22 is verified - blocking: false

**Question.** AC-22 contains two clauses: (a) "no other element ... sits between the tab bar and the result panel", and (b) "the
result panel is not vertically centred or pushed down by a full-height sibling". What check makes them pass or fail?

**What was checked.** Clause (a) is a statement about template structure and can be asserted from the template source (the
existing `app.component.template-wiring.spec.ts` asserts template and component source text by regex). Clause (b) is a layout
property (computed geometry). `package.json` lists `vitest` with `happy-dom` (no layout engine) and `ng test`; no Playwright,
Cypress or other browser-layout runner was found in the dependencies; the Angular `ng test` configuration was not inspected.
The Story's informational note says the operator's manual browser test covered the screen, but states that this is a recorded
claim, not pipeline evidence. Story preamble: "Each is checkable with a stubbed LLM; none requires a live model."

**Why it cannot be inferred.** The Story says every AC is checkable but gives no method for a geometric clause; no source
read defines the project's UI-layout test approach beyond source-text assertions.

**Impact if unresolved.** Clause (b) may end up untested, or be reduced silently to "the empty-state element is absent"
(which is AC-21 again). The reconciliation stage will then find AC-22 only partly asserted.

**Default a spec may carry:** assert (a) and, for (b), the absence of the full-height centring sibling (no element with the
empty-state's `h-full` / centring classes in the FAQ Generator branch of the result view) as template-source checks; record
that real geometry is verified only by a manual browser check. The human may require a stronger check.

## OD-16 - AC-21 removes the only "nothing was produced" cue - blocking: false

**Question.** After a FAQ Generator run that stores no FAQ (the master was empty or failed 3 times, FR-10; no valid output),
what does the operator see, given AC-21 forbids the "No content generated yet" block in every state?

**What was checked.** Specification v2 FR-10 / FR-18 leave `faqArtifacts` empty on a master failure and all other result fields
empty. Today that state shows the empty-state block (the guard is true). The code on the branch reports a dropped master only
via `console.warn` / `console.info` (`content-orchestrator.service.ts`, "[FAQ] ... no valid master after ... attempts" and
"the model returned no FAQ"); no `validationIssues` entry is added for it, so no panel appears either. OD-8 (still open) is the
decision on operator-facing reporting.

**Why it cannot be inferred.** AC-21 and OD-8 each look complete alone. Together they produce a screen that is blank after a
failed run, which no source addresses; AC-22 describes the screen only for a run that produced a result.

**Impact if unresolved.** A failed or empty FAQ run is indistinguishable from "the Generate click did nothing", and the only
copy that explained the empty screen is removed by this change. A test for AC-21 would pass on that blank screen.

**Default a spec may carry:** no requirement is written beyond AC-21; the failure-state message stays with OD-8 (default:
Ukrainian error-severity issue naming the language), and the blank-after-failure case is flagged to the human as a consequence
of AC-21.

## OD-17 - Generate-guard alert text names Original Description as mandatory - blocking: false

**Question.** `generateFaqOnly()` re-checks `isFaqFormValid()` and, on failure, shows `alertFillFields`
("Please fill in all mandatory fields: Target Website, Product Name, Original Description"). In FAQ Generator the mandatory
fields are Target Website, Product Name and Supplemental Content, and Original Description is optional (AC-12). Is this text in
scope of AC-25 ("Supplemental Content ... is mandatory")?

**What was checked.** `app.component.ts` `generateFaqOnly` uses the shared `alertFillFields` string (en line ~129); AC-12 and
AC-25 name the real mandatory set; no AC mentions the alert text. The guard is reachable only if the disabled Generate button
is bypassed, so the wrong text is rarely seen.

**Why it cannot be inferred.** AC-25 speaks of the marker and the button state; the Story does not say whether user-visible
messages about the mandatory set must agree with it.

**Impact if unresolved.** Low: an unreachable-in-normal-use message tells the operator the wrong field is mandatory. Fixing it
unprompted adds an unrequested change; leaving it leaves a known inconsistency in the mode this Story ships.

**Default a spec may carry:** unchanged (no AC covers it); reported to the human as a finding.

## v2 additions - the three open points from Specification v2 that were never logged

OD-18 to OD-20 come from Specification v2 "Open questions" (SP-1 to SP-3), raised during the revision after SPEC_REVIEW v1. Each
is recorded as-is with the Specification's proposed default. Nothing here is resolved.

## OD-18 (Spec SP-1) - A thrown provider error counts as one failed attempt - blocking: false

**Question.** When a master or translation call throws (timeout, rate limit, truncated response surfaced by the provider
layer), does it (a) count as one failed attempt under the same budget of 3, or (b) end that artifact immediately (skip), and
does it abort the run?

**What was checked.** Story AC-16 and AC-17 speak only of an invalid master and a parity-failing translation. Specification v2
FR-10 and FR-11 carry the default (a) and say a FAQ failure never discards output produced earlier in the run. The branch code
already counts a provider failure as "one failed attempt" (`content-orchestrator.service.ts` ~line 900) and the FAQ pipeline is
wrapped so the rest of the run continues (~line 865), i.e. the implementation follows the Specification default.

**Why it cannot be inferred.** The Story and OD-1 do not mention thrown errors; the budget semantics (attempt versus skip) is a
product decision, and the code matching the default does not make it the operator's decision.

**Impact if unresolved.** Two valid readings give different call counts and different outcomes on a flaky provider (retry versus
immediate loss of a language); tests pin one.

**Default a spec may carry (Spec v2 FR-10, FR-11):** a thrown call counts as one failed attempt under the same budget of 3 and
does not abort the run; earlier output is retained.

## OD-19 (Spec SP-2) - Do FAQ translations preserve numbers, units, currency symbol and product names - blocking: false

**Question.** Must a translated FAQ preserve the master's numbers, units, currency symbol and product name, and is that to be an
acceptance criterion or only a prompt-level instruction?

**What was checked.** AGENTS.md section 4 says "Don't change values or units" for descriptions; the Story has no AC for it for
FAQ translations; Specification v2 writes no FR (FR-12 item 2 keeps the unit and number rules in the Task C FAQ variant as the
only coverage) and notes the relation to OD-6 (US-7.1 protected-name block). Writing an AC would add a Story-level requirement,
which this stage does not do.

**Why it cannot be inferred.** Adding a requirement is the Story author's / human's call; the sources describe the rule for
descriptions only.

**Impact if unresolved.** A FAQ translation can alter a number, unit, price symbol or product name and still pass every AC
(AC-3 counts elements only). No automated test would catch it.

**Default a spec may carry (Spec v2):** no requirement written; the prompt-level handle (FR-12 item 2) is the only coverage; the
human decides whether the Story needs an AC. Related: OD-6.

## OD-20 (Spec SP-3) - A store without uk-UA / N = 1 - blocking: false

**Question.** What is the behaviour for a store profile that does not list `uk-UA` (the `getStore()` fallback for an unregistered
store name, `languages: ['en-GB']`, N = 1)?

**What was checked.** Every `STORE_REGISTRY` key has `uk-UA` and N >= 2 (the smallest is `Drukarka 3D`, `pl-PL`, `uk-UA`);
AC-1 is stated for N >= 2; the Story's Scope row says every store has a master; Specification v2 Scope marks this case outside
every acceptance criterion. The branch code skips FAQ generation with a `console.warn` for a store that does not list the master
(`content-orchestrator.service.ts` ~line 814).

**Why it cannot be inferred.** The fallback profile is reachable only by an unregistered name; no source states whether it must
be supported, rejected or skipped silently.

**Impact if unresolved.** Low: unspecified behaviour for an input the UI does not offer. If a store without uk-UA were later
added to the registry, the FAQ master rule would have no defined behaviour.

**Default a spec may carry (Spec v2):** unspecified; no requirement written.

## Change history

- **v2** - re-run against Story v3 (amended by the operator: FAQ Generator layout change, AC-21 to AC-26, UI-Q1 to UI-Q5).
  OD-1 to OD-9 carried forward unchanged (ids and text). New: OD-10 to OD-14 (Story UI-Q1 to UI-Q5), OD-15 to OD-17 (ambiguities
  in the new ACs: AC-22 verification, blank screen after a no-FAQ run, the Generate-guard alert text), OD-18 to OD-20 (Spec
  v2 SP-1 to SP-3). No Open Decision is blocking; none was resolved. Cross-reference notes: OD-8 and OD-9 now interact with
  AC-21/AC-22 (see OD-16, OD-11), but their questions are unchanged. v1 is superseded.
- **v1** - first run against Story v2. OD-1 and OD-2 are the Story's own Q1 and Q2; OD-3 to OD-9 are new. No blocking items.
