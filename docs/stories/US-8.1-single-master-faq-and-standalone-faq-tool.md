---
artifact: story
story: US-8.1
slug: single-master-faq-and-standalone-faq-tool
title: "Generate the FAQ once in uk-UA and translate it into the other store languages, use <b> instead of <strong> in FAQ HTML, and add a standalone FAQ tool"
track: angular
version: 3
status: DRAFT
owner: so-story-writer
created_at: 2026-10-14T00:00:00Z
updated_at: 2026-10-15T10:12:00Z
---

# US-8.1 — One master FAQ, translated; `<b>` not `<strong>`; standalone FAQ tool

## Story

> Mixed Story — the first part is a **bug** (Observed / Expected), the second a **feature**.

**Actor:** a content operator running a generation for a store that has several languages.

### Observed

1. The FAQ artifact is generated **independently for every language** of the store (a loop over
   `store.languages`, one `buildPromptFaq` call each). A store with 4 languages therefore gets
   4 different FAQs — different questions, different facts, different emphasis — instead of one
   FAQ in 4 languages.
2. The FAQ prompt allows `<strong>` as well as `<b>`, and the model uses `<strong>` for the
   bolded lead sentence of an answer. The product standard for emphasis is `<b>`.
3. The FAQ can only be produced as a by-product of the full Generator or UA Description run.
   There is no way to produce just the FAQ without paying for a full description, SEO metadata
   and slugs.
4. In UA Description (`ua-generator`, uk-UA only) the FAQ is produced for uk-UA only, with no
   translations to the store's other languages.

### Expected

- **One FAQ per run**, generated once in uk-UA (the master language, as for descriptions) and
  **translated** into every other language of the selected store. Every language carries the
  same questions.
- FAQ emphasis uses `<b>`; `<strong>` never appears in a FAQ.
- A **standalone FAQ tool**, built the way the standalone SEO Meta and Slug tools are, that
  produces only the FAQ.
- UA Description: when a FAQ is generated, uk-UA first, then translations into all other
  languages of the store.

The `<h3>` question tag is cosmetic (a separate OpenCart CMS module renders the questions);
only valid HTML in the answers matters.

### Reproduction

1. Generator, store `EXPERT3D` (`en-ES`, `es-ES`, `pt-PT`, `uk-UA`), any product, Supplemental
   Content filled.
2. Open the FAQ tabs: four separately authored FAQs; the es-ES and pt-PT ones contain
   `<p><strong>…</strong> …</p>`.

## Context

Reported by the content operator on the EinScan TRAK scanner FAQ (5 Q&As: markers,
surfaces and conditions, accuracy and speed with a laser-mode list, PC requirements, delivery
kit). The operator's reference of correct versus incorrect HTML, shortened:

Correct (uk-UA, bold only inside list items):

```html
<h3>Яку точність і швидкість забезпечує сканер?</h3>
<p>Об'ємна точність сягає 0,1 мм … Три лазерні режими покривають різні завдання:</p>
<ul>
<li><b>19+19 схрещених ліній:</b> швидке сканування великих поверхонь;</li>
<li><b>7 паралельних ліній:</b> дрібні деталі та гострі кромки;</li>
<li><b>одна лінія:</b> глибокі отвори зі співвідношенням діаметра до глибини 1:4.</li>
</ul>
```

Wrong (es-ES, `<strong>` around the lead sentence):

```html
<h3>¿Se puede escanear sin marcadores?</h3>
<p><strong>Sí, EinScan TRAK escanea sin marcadores en sus dos modos.</strong> En modo seguimiento …</p>
```

Right (same text, tag corrected — the operator confirmed the bold **lead sentence stays**, only
the tag changes):

```html
<p><b>Sí, EinScan TRAK escanea sin marcadores en sus dos modos.</b> En modo seguimiento …</p>
```

Operator decisions recorded at Story writing (2026-10-14): uk-UA is the master language in
Generator, UA Description and the new tool; translations must be structurally identical to the
master; in the standalone tool Original Description and Tech Specs are optional context.

Human decisions on the v1 open questions (2026-10-14, confirmed by the operator in session):

- **Q1 — `<strong>`:** it must not appear in a FAQ. A deterministic `<strong>`→`<b>` step runs
  on the final FAQ HTML, so a model that emits `<strong>` still produces `<b>`. The description
  path stays as US-6.2 left it.
- **Q2 — translation and FROZEN:** the operator gave explicit AGENTS.md §9 permission:
  **"modify `src/prompts/task-c.ts`"**. The FAQ is translated through Task C, which recognises a
  FAQ input and adapts its instructions; no new prompt file is created without necessity.
  `src/utils/structural-parity.ts` is extended to cover `h3`, `ul` and `li`.
- **Q3 — failures:** 3 attempts. The uk-UA master is retried up to 3 times until it is valid
  HTML. A language whose translation fails structural parity is retranslated, up to 3 attempts
  per language; if it still fails it is skipped so the other languages are kept.
- **Q4 — UI:** the mode is labelled "FAQ Generator" and has the standard Extended Thinking
  toggle.

### Change of requirements (v3, 2026-10-15)

After rejecting the HUMAN_PR_APPROVAL gate, the operator explicitly instructed: "Оформити як
зміну вимог: повернутися до SPECIFICATION і додати їх до Story/Spec" (record these as a change of
requirements; return to SPECIFICATION and add them to the Story and the Spec). They are UI
changes to the **FAQ Generator** screen only, added as AC-21–AC-26; AC-1–AC-20 are unchanged and
none of them conflicts with the new requirements.

1. **Empty state and result position.** Remove the empty-state block (icon + "No content
   generated yet. Select a website, fill the form, and click Generate.") from the central area,
   and show the generated result (e.g. the Ukrainian FAQ) at the top of the central area,
   directly under the version tabs (Ukrainian FAQ, European English FAQ, ES FAQ, PT FAQ).
2. **Left-panel field order and Supplemental Content.** Move Supplemental Content up to directly
   under the Product Name * field, before Original Description and Tech Specs; rename its label
   from "Supplemental Content (Optional) *" to "Supplemental Content (Required) *" and make it
   mandatory.

Observed in the code at v3 (read, not changed): the empty-state block in `app.component.html`
is shown whenever the mode is not `generator` and `mainHtmlUa`, `seoData` and `slugData` are all
empty. A standalone FAQ run leaves all three empty (AC-13), so in FAQ Generator mode the block
is also shown **after** a successful run, above the FAQ result — which is why the result is not
at the top. The FAQ form already marks the field required (red asterisk) and AC-11 already
disables Generate while it is blank; what is wrong today is the label, which reads "(Optional)"
because the one `supplementalContent` label string is shared with the Generator and UA
Description forms, where the field really is optional.

Informational note (not an acceptance criterion): the operator ran a manual browser test of the
FAQ Generator and reports that everything else works. By their statement this satisfies the
previously outstanding browser check for the features they exercised; it is a recorded claim, not
evidence produced by the pipeline.

Related, not duplicated: US-6.2 changed `<b>`/`<strong>` handling for descriptions (cleaner and
master prompt); the FAQ prompt `src/prompts/task-faq.ts` still lists `<strong>` and is outside
that Story.

## Scope

| | |
|---|---|
| **Stores** | all of `STORE_REGISTRY` (`3DDevice`, `3DPrinter`, `3DScanner`, `Center 3D Print`, `Drukarka 3D`, `EXPERT3D`, `Expert-3DPrinter`). Every store has `uk-UA` in `languages`, so every store has a master |
| **Locales** | all store locales; uk-UA is the master FAQ and the other locales are translations of it (a uk-UA change fans out to every language) |
| **Surface** | `src/prompts/task-faq.ts`; `src/services/content-orchestrator.service.ts` (`generate()` FAQ step, the UA Description FAQ step, a new standalone FAQ method beside `generateSeoMetadata` / `generateSlugs`); `src/prompts/task-c.ts` (FROZEN, FAQ-aware translation); `src/utils/structural-parity.ts` (extended for `h3`, `ul`, `li`); `.arch-guard-checksums`; `src/app/types.ts` (`AppMode`), `src/app/app.component.ts` / `.html` (mode switcher, form, FAQ tabs for all store languages in UA Description); `README.md` ("FAQ / HowTo artifacts", "Tools & modes") |
| **UI scope of the v3 change (AC-21–AC-26)** | the **FAQ Generator** mode only (its left-panel form and its central area in `app.component.html`, plus the FAQ-Generator-specific label text). The layouts of Generator, UA Description, SEO Generator, Slug Generator and every other mode are not changed |
| **Touches FROZEN files?** | **YES** — `src/prompts/task-c.ts`, with the operator's explicit AGENTS.md §9 permission ("modify `src/prompts/task-c.ts`", 2026-10-14). Requires `bash arch-guard.sh --rebaseline` and `.arch-guard-checksums` in the same commit. No other FROZEN file is authorised: `task-a.ts`, `task-b.ts`, `master-system-prompt.ts` and `output-validator.ts` stay unedited, and needing one is a new §9 stop. `task-faq.ts` is not FROZEN |
| **Touches generated HTML?** | yes — the FAQ artifact only (`h3`, `p`, `b`, `ul`, `li`); AGENTS.md §4 description criteria are not changed |

## Acceptance criteria

Each is checkable with a stubbed LLM; none requires a live model.

**Single master + translations**

- **AC-1:** In Generator mode, for a store with N ≥ 2 languages and non-blank Supplemental
  Content, exactly **one** call uses the FAQ generation prompt (`buildPromptFaq`), and its target
  language is Ukrainian (uk-UA). No FAQ generation call is made for any other language.
- **AC-2:** After that run, `faqArtifacts` has an entry for **every** language in
  `store.languages`; the uk-UA entry is the master text and each of the other N−1 entries is
  produced by translating it.
- **AC-3:** Each translated FAQ has the same number of `<h3>`, `<p>` and `<li>` elements as the
  uk-UA master. A translation that differs is reported as a validation issue and goes through the
  repair gate rather than being stored silently.
- **AC-4:** In UA Description (`ua-generator`) with non-blank Supplemental Content, the FAQ is
  generated in uk-UA first and then translated into every other language of the selected store;
  `faqArtifacts` has an entry for every store language and the UI shows a FAQ tab for each.
- **AC-5:** The trigger is unchanged: in Generator and UA Description with blank or
  whitespace-only Supplemental Content, no FAQ generation call and no FAQ translation call is
  made and `faqArtifacts` stays empty.

**`<b>` instead of `<strong>`**

- **AC-6:** The FAQ prompt text lists `<b>` and does not list `<strong>` among the permitted
  answer tags.
- **AC-7:** Given a stubbed model response containing `<strong>`, the stored FAQ for **every**
  language (master and translations) contains zero `<strong>` elements, and the emphasised text
  is preserved inside `<b>`.
- **AC-8:** A FAQ answer such as `<p><b>Lead sentence.</b> Rest of the answer.</p>` is stored
  unchanged — a bold lead sentence inside `<p>` is not flagged, stripped or moved.
- **AC-9:** Every stored FAQ is well-formed HTML — parsing it yields no unclosed or mismatched
  tag — and contains no element other than `h3`, `p`, `b`, `ul`, `li`.

**Standalone FAQ tool**

- **AC-10:** The mode switcher offers a mode labelled "FAQ Generator" alongside SEO Generator
  and Slug Generator, with the same Extended Thinking toggle those modes have.
- **AC-11:** The Generate action is disabled while any of Product Name, Store or Supplemental
  Content is empty (whitespace-only counts as empty), and enabled once all three are filled.
  With whitespace-only Supplemental Content, no LLM call is made.
- **AC-12:** Original Description and Tech Specs are optional; leaving them blank does not
  block Generate, and when filled they reach the FAQ prompt as grounding context.
- **AC-13:** A standalone run makes **no** call for the master description, SEO metadata or
  slugs: afterwards `mainHtmlUa` is `''`, `translations` is `{}`, `seoData` and `slugData` are
  `null`, and `faqArtifacts` has an entry for every language of the selected store.
- **AC-14:** The standalone run uses the same single-master pipeline as AC-1–AC-3 and AC-6–AC-9
  (one uk-UA generation call, N−1 translations, structural parity, `<b>` only).
- **AC-15:** A completed standalone FAQ run adds one entry to the history, as
  `generateSeoMetadata` and `generateSlugs` do.

**Failure handling (Q3)**

- **AC-16:** If the uk-UA master FAQ is not valid HTML, generation is attempted again; at most 3
  attempts in total are made. After a valid master no further master call is made.
- **AC-17:** If a translation fails the structural-parity check (AC-3), that language alone is
  retranslated; at most 3 translation attempts are made per language. A language still failing
  after 3 attempts has no entry in `faqArtifacts`, and the other languages' entries are kept.

**FROZEN `task-c.ts` (Q2)**

- **AC-18:** For a non-FAQ input (a full description), the prompt built by `task-c.ts` is
  byte-identical to the one built before this Story — description translation is unchanged.
- **AC-19:** For a FAQ input (`<h3>` questions with `<p>`/`<ul>`/`<li>` answers) the Task C
  prompt carries FAQ-specific instructions, and the structural-parity check accepts a translation
  with matching `h3`/`p`/`li` counts and rejects one that drops or adds an `h3`, `p` or `li`.
- **AC-20:** `bash arch-guard.sh` exits 0 after `--rebaseline`; `.arch-guard-checksums` is in
  the same commit as the `task-c.ts` edit, and the `task-c.ts` diff contains only the FAQ-aware
  change.

**FAQ Generator layout (v3 change of requirements)**

All of these concern the FAQ Generator mode (`faq-generator`) only.

- **AC-21:** In FAQ Generator mode the central area never renders the empty-state block: no
  "No content generated yet" text, no "Select a website, fill the form, and click Generate."
  text, and no icon belonging to that block — before any run, during a run, and after a completed
  run.
- **AC-22:** After a completed FAQ run, the generated result (the panel of the active version
  tab) is the first content directly below the version tabs: with no validation or repair panel
  shown, no other element (in particular no empty-state block) sits between the tab bar and the
  result panel, and the result panel is not vertically centred or pushed down by a full-height
  sibling.
- **AC-23:** In the FAQ Generator form, Supplemental Content is positioned directly under the
  Product Name field and before Original Description and Tech Specs; the field order is Target
  Website, Product Name, Supplemental Content, Original Description, Tech Specs.
- **AC-24:** In the FAQ Generator form (English UI), the Supplemental Content label reads
  "Supplemental Content (Required)" followed by the required marker `*`; the text "Optional"
  does not appear in that label.
- **AC-25:** Supplemental Content in the FAQ Generator is mandatory: it carries the required
  marker, and the Generate action stays disabled while it is blank or whitespace-only and enabled
  once Product Name, Store and Supplemental Content are filled (AC-11 behaviour, unchanged by the
  move).
- **AC-26:** Other modes are unchanged by AC-21–AC-25: the Generator and UA Description forms
  keep the Supplemental Content label "Supplemental Content (Optional)" and their current field
  order, and the empty-state block is still rendered in the other modes exactly when it is
  rendered today.

## Out of scope

- The `<h3>` question tag and how the CMS renders it (an OpenCart module owns that).
- Making the FAQ unconditional in Generator or UA Description; the trigger stays "only with
  Supplemental Content".
- `<b>`/`<strong>` handling in descriptions, the Optimizer and the HTML editor (US-6.2).
- FAQPage / schema.org markup, the HowTo artifact, the number of questions (3–5) and the
  150–400 word target of the FAQ prompt.
- Changing any other mode, or the per-language SEO and slug generation.
- The layout, field order, field labels and empty state of Generator, UA Description, SEO
  Generator, Slug Generator and every other mode (v3: the new UI changes are FAQ Generator only).
- Renaming or restyling the version tabs of the FAQ Generator, and the FAQ result block's own
  content, styling and copy buttons (only its position changes).

## Open questions

Q1–Q4 of v1 were answered by the operator (see Context) and are folded into AC-7, AC-10 and
AC-16–AC-20. What remains:

- **Q1:** Do the "3 attempts" of AC-16/AC-17 replace, or add to, the repair gate's own retry budget
  (`maxRepairs()`)? And if the uk-UA master is still invalid after 3 attempts, is the whole FAQ
  dropped (no translations, nothing stored)?
  - Checked: `content-orchestrator.service.ts` wraps each FAQ in `runRepairGate` with
    `maxRepairs()`; the decision names only "3 attempts" and "skip a failed language".
  - Impact if unresolved: a specification would assume 3 attempts in total per artifact
    (repair-gate attempts counted in), and that an unusable master stores no FAQ at all.
- **Q2:** The operator said `<strong>` must be "nowhere". This Story reads that as nowhere in a
  FAQ and leaves the description path as US-6.2 decided (it preserves both tags). Is a
  product-wide ban intended?
  - Checked: US-6.2 (`<b>`/`<strong>` preserved in descriptions, master prompt uses `<b>`);
    the decision text applies the replacement "in the FAQ result".
  - Impact if unresolved: the specification stays FAQ-scoped; a product-wide ban would be a
    separate Story touching the description path.

Open questions raised by the v3 change of requirements (each has a proposed default, which AC-21–AC-26
already assume):

- **UI-Q1:** Do the layout changes apply to FAQ Generator only, or also to the empty state / field
  order of other modes? The operator named only "FAQ Generator".
  - Checked: the empty-state condition and the Supplemental Content label are shared with the
    other modes in `app.component.html` / `TRANSLATIONS`.
  - Default (AC-26): FAQ Generator only; other modes unchanged, including their empty state.
- **UI-Q2:** What does the central area show in FAQ Generator before any run?
  - Default: nothing (no placeholder) beyond the tab bar, if it is rendered at all (AC-21).
- **UI-Q3:** When a validation or repair panel is shown (only when issues exist), does it stay
  above the result, or move below it so the result is directly under the tabs?
  - Checked: both panels are currently rendered above the tab panels in the same container.
  - Default: they stay where they are; AC-22 is stated for the case with no such panel.
- **UI-Q4:** What is the Ukrainian-UI wording of the label for the FAQ Generator? The operator gave
  only the English text; the current Ukrainian label is "Додатковий контент (Опціонально)".
  - Default: AC-24 fixes only the English text; the Ukrainian counterpart is chosen by the
    specification as "Додатковий контент (Обов'язково)" and flagged for human approval.
- **UI-Q5:** Do the version-tab labels stay as they are today (including how a tab for the
  store's English locale is named)? The operator listed "Ukrainian FAQ, European English FAQ,
  ES FAQ, PT FAQ" as examples, not as a change.
  - Default: unchanged (Out of scope).

## References

- `src/prompts/task-faq.ts`; `src/services/content-orchestrator.service.ts` (`generate()` Step 5,
  UA Description Step 4, `generateSeoMetadata`, `generateSlugs`)
- `src/utils/structural-parity.ts`; `src/app/types.ts` (`AppMode`); `src/app/app.component.ts`
  (`parseFaqItems`, FAQ tab construction)
- `README.md` — "How generation works" step 5, "Tools & modes"
- `docs/stories/US-6.2-preserve-b-and-strong-tags.md` (related, `<b>`/`<strong>` for descriptions)
- AGENTS.md §9 (FROZEN files)
