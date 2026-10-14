---
artifact: story
story: US-8.1
slug: single-master-faq-and-standalone-faq-tool
title: "Generate the FAQ once in uk-UA and translate it into the other store languages, use <b> instead of <strong> in FAQ HTML, and add a standalone FAQ tool"
track: angular
version: 2
status: DRAFT
owner: so-story-writer
created_at: 2026-10-14T00:00:00Z
updated_at: 2026-10-14T12:00:00Z
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

Related, not duplicated: US-6.2 changed `<b>`/`<strong>` handling for descriptions (cleaner and
master prompt); the FAQ prompt `src/prompts/task-faq.ts` still lists `<strong>` and is outside
that Story.

## Scope

| | |
|---|---|
| **Stores** | all of `STORE_REGISTRY` (`3DDevice`, `3DPrinter`, `3DScanner`, `Center 3D Print`, `Drukarka 3D`, `EXPERT3D`, `Expert-3DPrinter`). Every store has `uk-UA` in `languages`, so every store has a master |
| **Locales** | all store locales; uk-UA is the master FAQ and the other locales are translations of it (a uk-UA change fans out to every language) |
| **Surface** | `src/prompts/task-faq.ts`; `src/services/content-orchestrator.service.ts` (`generate()` FAQ step, the UA Description FAQ step, a new standalone FAQ method beside `generateSeoMetadata` / `generateSlugs`); `src/prompts/task-c.ts` (FROZEN, FAQ-aware translation); `src/utils/structural-parity.ts` (extended for `h3`, `ul`, `li`); `.arch-guard-checksums`; `src/app/types.ts` (`AppMode`), `src/app/app.component.ts` / `.html` (mode switcher, form, FAQ tabs for all store languages in UA Description); `README.md` ("FAQ / HowTo artifacts", "Tools & modes") |
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

## Out of scope

- The `<h3>` question tag and how the CMS renders it (an OpenCart module owns that).
- Making the FAQ unconditional in Generator or UA Description; the trigger stays "only with
  Supplemental Content".
- `<b>`/`<strong>` handling in descriptions, the Optimizer and the HTML editor (US-6.2).
- FAQPage / schema.org markup, the HowTo artifact, the number of questions (3–5) and the
  150–400 word target of the FAQ prompt.
- Changing any other mode, or the per-language SEO and slug generation.

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

## References

- `src/prompts/task-faq.ts`; `src/services/content-orchestrator.service.ts` (`generate()` Step 5,
  UA Description Step 4, `generateSeoMetadata`, `generateSlugs`)
- `src/utils/structural-parity.ts`; `src/app/types.ts` (`AppMode`); `src/app/app.component.ts`
  (`parseFaqItems`, FAQ tab construction)
- `README.md` — "How generation works" step 5, "Tools & modes"
- `docs/stories/US-6.2-preserve-b-and-strong-tags.md` (related, `<b>`/`<strong>` for descriptions)
- AGENTS.md §9 (FROZEN files)
