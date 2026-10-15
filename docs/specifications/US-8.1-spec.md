---
artifact: specification
story: US-8.1
version: 3
status: APPROVED
owner: so-spec-writer
created_at: 2026-10-14T15:00:00Z
updated_at: 2026-10-15T12:00:00Z
supersedes: docs/specifications/US-8.1-spec.md#2
inputs_consumed:
  - key: story
    version: 3
  - key: clarification_report
    version: 2
  - key: open_decisions
    version: 2
open_decisions_blocking: false
---

# Specification: US-8.1 — One master FAQ translated into the store languages, `<b>` instead of `<strong>`, and a standalone FAQ tool

## Summary

For a store with several languages, a run produces one FAQ: it is generated once in uk-UA and translated into every other
language of the selected store, so every language carries the same questions with the same structure. Every stored FAQ
uses `<b>` for emphasis and never `<strong>`. A new "FAQ Generator" mode produces only the FAQ, through the same
single-master pipeline, without producing a description, SEO metadata or slugs. The UA Description mode produces the FAQ
for every store language too. The FAQ Generator screen shows its result at the top of the central area with no
"No content generated yet" block, and its left-panel form places the now-mandatory Supplemental Content directly under
Product Name with the label "Supplemental Content (Required)"; no other mode's screen changes (v3).

## Background

The operator reported (EinScan TRAK scanner, EXPERT3D) that the FAQ is authored independently for each store language, so
the languages disagree on questions, facts and emphasis, and that the es-ES and pt-PT FAQs contain
`<p><strong>…</strong> …</p>` where the product standard is `<b>`. The FAQ also cannot be produced without paying for a full
description, and in UA Description it exists for uk-UA only. The Story (v2) records the operator's decisions, including the
explicit AGENTS.md §9 permission "modify `src/prompts/task-c.ts`" (2026-10-14). Clarification returned Ready for
Specification with nine non-blocking Open Decisions (OD-1 to OD-9). Where a requirement below depends on one, it is marked
and carries the clarifier's proposed default, which the human may overturn at HUMAN_SPEC_APPROVAL; see Open questions.

**v3 change of requirements (2026-10-15).** After the operator rejected the HUMAN_PR_APPROVAL gate and instructed that the
findings be recorded as a change of requirements and the work returned to SPECIFICATION, the Story was amended to v3 with
AC-21 to AC-26 (FAQ Generator layout), and clarification was re-run (clarification report v2, Open Decisions v2 with OD-1 to
OD-20, all non-blocking). The cause the Story author found: the central area's empty-state block is shown whenever the mode
is not Generator and the description, SEO and slug results are all empty; a standalone FAQ run leaves all three empty by
design (AC-13 / FR-18), so the block also appeared after a successful run, above the FAQ result. The label read
"(Optional)" because the Supplemental Content label text is shared with the Generator and UA Description forms, where the
field really is optional. AC-1 to AC-20 are unchanged, FR-1 to FR-23 and NFR-1 to NFR-8 keep their ids and meaning, and
the new requirements FR-24 to FR-28 are added. The Specification is back to `DRAFT`: it must pass SPEC_REVIEW and
HUMAN_SPEC_APPROVAL again.

## Scope

| | |
|---|---|
| **Stores** | All of `STORE_REGISTRY`: `3DDevice`, `3DPrinter`, `3DScanner`, `Center 3D Print`, `Drukarka 3D`, `EXPERT3D`, `Expert-3DPrinter`. Every one lists `uk-UA` in `languages`, and the smallest (`Drukarka 3D`: `pl-PL`, `uk-UA`) has N = 2. |
| **Locales** | All locales in the selected store's `languages` (read from `STORE_REGISTRY`, never hard-coded). uk-UA is the master FAQ; every other locale of the store receives a translation of it. Fan-out of a uk-UA change: one master reaches N−1 other languages; there is no per-language FAQ authoring. A store profile that does not list `uk-UA` (the `getStore()` fallback for an unregistered store name, `languages: ['en-GB']`, N = 1) is outside every acceptance criterion; no requirement is written for it (OD-20, formerly SP-3). The v3 layout requirements (FR-24 to FR-28) are store-independent and add no locale fan-out: the English label text is fixed by AC-24, and the only locale-dependent point is the interface-language (not store-locale) wording of the label, OD-13. |
| **UI scope of the v3 change** | The FAQ Generator mode (`faq-generator`) only: its left-panel form and its central area, plus the FAQ-Generator-specific label text. The layouts of Generator, UA Description, SEO Generator, Slug Generator and every other mode are not changed (AC-26, FR-28; OD-10 default). |
| **Track** | angular (per the Story). The work also reaches a prompt and a service; the task breakdown assigns a per-task track and the prompt-track FROZEN stop applies to the `task-c.ts` task. |
| **FROZEN files (AGENTS.md §9)** | `src/prompts/task-c.ts` only, on the operator's explicit permission "modify `src/prompts/task-c.ts`" (2026-10-14) recorded in the Story. `src/prompts/task-a.ts`, `src/prompts/task-b.ts`, `src/prompt-core/master-system-prompt.ts` and `src/utils/output-validator.ts` are not authorised; needing any of them is a new §9 stop. The v3 layout change (FR-24 to FR-28) concerns the application component only, touches no FROZEN file and needs no prompt change; needing one would be a new §9 stop. |

## Functional requirements

### FR-1: One uk-UA master FAQ generation per run

In Generator mode, for a store with N ≥ 2 languages and non-blank Supplemental Content, the FAQ generation prompt
(`buildPromptFaq`) is used for the uk-UA language, and for no other language. In the case where the first master response
is valid, exactly one FAQ generation call is made in the whole run. (OD-1: retries after an invalid master are governed by
FR-10; "exactly one" describes the first-valid-response case.)

**Failure path:** if the master response is not valid, FR-10 applies; at no point is a FAQ generation call made for a
language other than uk-UA.

### FR-2: A FAQ entry for every store language, translated from the master

After a successful run, `faqArtifacts` has an entry for every language in the selected store's `languages`. The uk-UA entry
is the master text. Each of the other N−1 entries is produced by translating the uk-UA master (one translation call
sequence per non-master language), not by generating a FAQ for that language.

**Failure path:** a language whose translation never passes FR-3 has no entry (FR-11); the remaining languages' entries
are kept. If no valid master exists, no entry exists for any language (FR-10).

### FR-3: Structural parity between master and each translation

A translated FAQ has the same number of `<h3>`, `<p>` and `<li>` elements as the uk-UA master. The number of `<ul>`
elements is compared as well, so a dropped list is caught (OD-3 default; the Story's Scope names `h3`, `ul`, `li`, AC-3
names `h3`, `p`, `li`). This FAQ comparison is selected explicitly for FAQ input only; the description translation path
keeps its current parity behaviour unchanged.

**Failure path:** a translation whose counts differ is reported as a validation issue and goes through the repair gate
(FR-11); it is never stored silently.

### FR-4: UA Description produces the FAQ for every store language

In UA Description (`ua-generator`) with non-blank Supplemental Content, the FAQ is generated in uk-UA first and then
translated into every other language of the selected store. `faqArtifacts` has an entry for every store language and the
UI shows one FAQ tab per such entry.

**Failure path:** per-language skipping and master failure follow FR-10 and FR-11; the UI shows a tab only for languages
that have an entry.

### FR-5: The FAQ trigger is unchanged

In Generator and UA Description, when Supplemental Content is blank or whitespace-only, no FAQ generation call and no FAQ
translation call is made and `faqArtifacts` stays empty. A non-blank Supplemental Content remains the only trigger.

**Failure path:** n/a, no failure path — the requirement is the absence of calls.

### FR-6: The FAQ prompt permits `<b>` and not `<strong>`

The text of the FAQ generation prompt lists `<b>` among the permitted answer tags and does not list `<strong>`.

**Failure path:** n/a, no failure path — a static property of the prompt text.

### FR-7: No `<strong>` in any stored FAQ

Given a model response (master or translation) that contains `<strong>`, the FAQ stored for every language contains zero
`<strong>` elements, and the emphasised text is preserved inside `<b>`. The conversion is a deterministic step applied to
every FAQ text the model produces (generation, translation and repair output) **before** that text is validated against
FR-3 or FR-9 and before it is stored. Consequences, stated as behaviour:

- A `<strong>` element on its own is never a violation of FR-9 and never costs an attempt under FR-10 or FR-11: a stubbed
  model that returns `<strong>` on every call still yields a stored FAQ in which the text is inside `<b>` (the AC-7
  scenario), with no retry caused by the tag.
- No text that reaches the store, the validator or the repair step's output contains `<strong>`, so a repair step that
  re-emits `<strong>` is converted again before its result is validated or stored (the conversion runs again after every
  repair).
- The conversion changes the element name only. It neither adds nor removes attributes (OD-7 default: attributes kept). The
  attribute rule belongs to FR-9 alone: a `<strong>` that carries an attribute becomes a `<b>` that carries it, and FR-9
  then judges that `<b>` (an attribute is an FR-9 violation; the text is retried or skipped under FR-10 or FR-11).

This requirement is FAQ-scoped (OD-2 default): descriptions, the Optimizer and the HTML editor keep their US-6.2 behaviour.

**Failure path:** the conversion itself cannot fail on its input and is total on any text it receives (it matches the tag
name regardless of letter case). A `<b>` that FR-9 later rejects for another reason (for example an attribute) follows the
FR-9 failure path; it is never "fixed" by reintroducing `<strong>`. Any stored FAQ with a `<strong>` element is a defect.

### FR-8: A bold lead sentence in an answer is preserved

A FAQ answer such as `<p><b>Lead sentence.</b> Rest of the answer.</p>` is stored unchanged: a bold lead sentence inside
`<p>` is not flagged, stripped or moved. Only the tag changes under FR-7 when the source used `<strong>`.

**Failure path:** n/a, no failure path — a stored FAQ in which such a lead sentence was flagged, stripped or moved fails
this requirement.

### FR-9: Every stored FAQ is well-formed and uses only the five FAQ elements

Every stored FAQ, master or translation, parses with no unclosed or mismatched tag and contains no element other than
`h3`, `p`, `b`, `ul`, `li`. The check is evaluated on text in which `<strong>` has already been converted to `<b>` (FR-7), so
`<strong>` is not a violation here. By default (OD-4) "valid" also means beginning with an `<h3>` and having no attributes
on those elements, and the check is enforced in the same validate-and-repair gate as the other FAQ checks, outside
`src/utils/output-validator.ts`. An empty or whitespace-only response is **not evaluated by this requirement**: for the
master it is the separate terminal outcome of FR-10, and for a translation it is a structural-parity failure under FR-3
(zero elements against the master's count), handled by FR-11.

**Failure path:** a non-empty FAQ that violates this is reported as an error in the repair gate and retried under FR-10
(master) or FR-11 (translation); a FAQ still violating it after the attempts is not stored.

### FR-10: Master retry — at most 3 attempts

If the uk-UA master FAQ is not valid HTML (FR-9), generation is attempted again; at most 3 attempts in total are made. After
a valid master, no further master call is made. By default (OD-1) the 3 is the total number of produce attempts for the
master, counting the repair gate's own repair attempts inside it. An empty or whitespace-only master response is a terminal
"no FAQ" outcome, distinct from "not valid HTML": no retry, nothing stored, no translation call (OD-4 default; the prompt
itself allows an empty response when no question is answerable).

**Provider error (OD-18 default, formerly SP-1):** when the master call itself throws (timeout, rate limit or truncated response surfaced
by the provider layer), that call counts as one failed attempt under the same budget of 3; it does not abort the run.

**Failure path:** if the master is still not valid after 3 attempts (including attempts lost to a provider error), no FAQ
is stored for any language and no translation call is made (OD-1 default). A master failure never discards what the run
already produced: in Generator and UA Description the description, SEO metadata, slugs and description translations
already in the result are retained unchanged, and in FAQ Generator the other result fields keep the values of FR-18.
Whether the run is then reported as completed or failed, and what the operator sees, is not fixed by any acceptance
criterion (OD-8).

### FR-11: Translation retry per language — at most 3 attempts, then skip

If a translation fails the structural-parity check (FR-3), that language alone is retranslated; at most 3 translation
attempts are made per language (counted under the same convention as FR-10, OD-1 default). A language that still fails
after 3 attempts has no entry in `faqArtifacts`, and the other languages' entries are kept. The final parity failure
remains visible as a validation issue (FR-3). An empty or whitespace-only translation is a parity failure (FR-3) and is
retried under this requirement; it is not a separate terminal outcome.

**Provider error (OD-18 default, formerly SP-1):** when a translation call throws, that call counts as one failed attempt for that language
under the same budget of 3; a language whose attempts are exhausted that way is skipped, and the remaining languages are
still translated.

**Failure path:** this is the failure path — a failing language is skipped, never stored, and never discards the other
languages, nor the master, nor anything the run produced before the FAQ step (description, SEO metadata, slugs,
description translations). Operator-facing reporting of a skipped language is OD-8.

### FR-12: Task C carries FAQ-specific instructions for a FAQ input

For a FAQ input (`<h3>` questions with `<p>`/`<ul>`/`<li>` answers), the translation prompt built by `src/prompts/task-c.ts`
carries FAQ-specific instructions. The minimum normative content, which a test pins on the prompt text with a stubbed LLM:

1. it tells the model to translate the FAQ element for element, keeping every `<h3>`, `<p>`, `<ul>` and `<li>` of the input
   and adding none (this is what AC-3 and AC-9 require of the output);
2. it keeps the per-language tone-of-voice, terminology, unit and number rules that the description translation prompt
   carries (this is the prompt-level handle for FR-21 and FR-23);
3. it contains no instruction that would add an element outside the five FAQ elements of FR-9: for a FAQ input the
   description-only blocks (closing commercial `<h2>`, delivery-region sentence, H1 LOCK, "Technical specifications" and
   "What's in the box" labels) are absent.

With the FAQ comparison of FR-3, a translation with matching `h3`/`p`/`li` counts is accepted, and one that drops or adds an
`h3`, `p` or `li` is rejected. The mechanism that tells a FAQ input from a description is not specified here (OD-5;
default: an explicit caller-set option, not HTML sniffing). Items 1–3 are the requirement; OD-5 remains open on the
recognition rule, on the exact wording, and on whether other description-only parts of the prompt are also dropped.

**Failure path:** a translation of a FAQ that adds or drops an `h3`, `p` or `li` is rejected (FR-3, FR-11).

### FR-13: Description translation prompt is unchanged

For a non-FAQ input (a full description), the prompt built by `src/prompts/task-c.ts` is byte-identical to the one built
before this Story. By default (OD-5) this is asserted over every `STORE_REGISTRY` store × language pair.

**Failure path:** any byte difference in a description prompt is a defect.

### FR-14: Frozen-file baseline matches the `task-c.ts` change

After the `task-c.ts` edit and `bash arch-guard.sh --rebaseline`, `bash arch-guard.sh` exits 0. `.arch-guard-checksums` is
in the same commit as the `task-c.ts` edit, and the `task-c.ts` diff contains only the FAQ-aware change.

**Failure path:** a checksum mismatch, a `.arch-guard-checksums` committed separately, or an unrelated hunk in the
`task-c.ts` diff fails the requirement.

### FR-15: "FAQ Generator" mode

The mode switcher offers a mode labelled "FAQ Generator" alongside SEO Generator and Slug Generator, with the same
Extended Thinking toggle those modes have.

**Failure path:** n/a, no failure path — presence of a control.

### FR-16: Generate enablement in FAQ Generator

In FAQ Generator the Generate action is disabled while any of Product Name, Store or Supplemental Content is empty
(whitespace-only counts as empty), and enabled once all three are filled.

**Failure path:** with whitespace-only Supplemental Content, no LLM call is made, whatever the way the run was triggered.

### FR-17: Original Description and Tech Specs are optional context

In FAQ Generator, leaving Original Description and Tech Specs blank does not block Generate. When they are filled, they
reach the FAQ generation prompt as grounding context.

**Failure path:** n/a, no failure path — blank optional inputs are valid.

### FR-18: A standalone run produces only the FAQ

A FAQ Generator run makes no call for the master description, SEO metadata or slugs. Afterwards `mainHtmlUa` is `''`,
`translations` is `{}`, `seoData` and `slugData` are `null`, and `faqArtifacts` has an entry for every language of the
selected store (subject to the skip rules of FR-10 and FR-11).

**Failure path:** if the master FAQ fails (FR-10), `faqArtifacts` stays empty and the other fields keep the values above.

### FR-19: A standalone run uses the same single-master pipeline

The FAQ Generator run uses the same pipeline as Generator and UA Description: one uk-UA generation call in the
first-valid case (FR-1), N−1 translations (FR-2), structural parity (FR-3), `<b>` only (FR-7), well-formed output (FR-9),
and the retry limits of FR-10 and FR-11.

**Failure path:** as FR-10 and FR-11.

### FR-20: A completed standalone run adds one history entry

A completed FAQ Generator run adds one entry to the history, as `generateSeoMetadata` and `generateSlugs` do. Whether a
run with a skipped language or a dropped FAQ still writes an entry is not fixed by any acceptance criterion (OD-8).

**Failure path:** n/a, no failure path stated by the Story; see OD-8.

## Generated-HTML requirements (AGENTS.md §4)

The Story changes generated HTML for the FAQ artifact only (`h3`, `p`, `b`, `ul`, `li`), and states that the §4 description
criteria are not changed. The criteria in play are quoted verbatim and carried unchanged. The Story provides no dedicated
acceptance criterion for FR-21 to FR-23; they are the AGENTS.md §4 constraints on the FAQ output.

### FR-21: Space between number and unit

> "Space between number and unit: `1.75 mm`, `200 °C` (not `1.75mm`)."

This Story does not change the rule. It is asserted at normalizer level, because free model text cannot be pinned with a
stubbed LLM: the deterministic number/unit-spacing normalisation that the FAQ path applies to model output today is applied
to the master and to every translation (to every FAQ text produced by generation, translation or repair, before validation
and storage), and this Story removes none of it. With a stubbed model returning a number adjoined to a unit (`1.75mm`), the
stored FAQ contains the spaced form (`1.75 mm`).

**Failure path:** a stored FAQ in which a stubbed number-adjoined-to-unit input survives without the space fails this
requirement. The rule as applied to model wording beyond what the normaliser covers is a review criterion carried
unchanged, not asserted by an automated test.

### FR-22: HTML only, no Markdown, no `<br>` for spacing

> "HTML only, no Markdown. No `<br>` for spacing; `<hr>` after each `</section>`."

Every stored FAQ is HTML only with no Markdown and no `<br>` for spacing. The `<hr>`-after-`</section>` part does not apply
to the FAQ artifact, which contains no `<section>`.

**Failure path:** a stored FAQ containing Markdown syntax or `<br>` is a defect (the element whitelist of FR-9 already
excludes `<br>`).

### FR-23: No anglicisms in non-EN output; no Product `itemtype`

> "Non-EN languages: no anglicisms ("друк" not "прінт", "ПЗ" not "софт")."

> "**Forbidden** `itemtype="https://schema.org/Product"` in the description body (the CMS already emits Product via JSON-LD; a duplicate = a critical error in GSC). Allowed only: `PropertyValue`, `FAQPage`, `HowTo`."

The anglicism rule is carried at prompt and normaliser level, because free model text cannot be pinned with a stubbed LLM:
the FAQ translation prompt keeps the per-language terminology rules (FR-12, item 2), and the deterministic terminology
normalisation that the FAQ path applies to model output today stays applied to the master and to every translation (this
Story removes none of it). Which words count as anglicisms beyond that is a review criterion carried unchanged, not
asserted by an automated test.

The `itemtype` quote above comes from AGENTS.md §4 and forbids only the `Product` type. That the FAQ artifact carries no
schema.org markup at all (not even `FAQPage`, which §4 allows) is not a §4 rule: it follows from the five-element limit of
FR-9 and from the Story's Out of scope (FAQPage markup is supplied by the CMS module).

**Failure path:** a stored FAQ carrying any `itemtype` attribute is a defect (it violates FR-9, and with `Product` also §4).

Criteria not in play for the FAQ artifact: spec-count parity, figure/figcaption and image-loading rules, video survival, and
the SEO length and CTA rules. They remain true for the description path, which this Story does not change (FR-13).

## FAQ Generator layout requirements (v3 change of requirements)

These concern the FAQ Generator mode (`faq-generator`) only (OD-10 default). They are observable on the rendered screen with
stubbed run state and a stubbed LLM; none needs a live model.

**AGENTS.md §4 in play: none.** The v3 change alters labels, field order and the arrangement of the central area, not any
generated HTML. No §4 criterion is restated for it; FR-21 to FR-23 (the §4 criteria for the FAQ artifact) are unchanged and
not weakened. No `STORE_REGISTRY`, prompt or FROZEN-file change is implied.

### FR-24: No empty-state block in FAQ Generator

In FAQ Generator mode the central area never renders the empty-state block: no "No content generated yet" text, no "Select a
website, fill the form, and click Generate." text, and no icon belonging to that block, in each of three states: before any
run, during a run, and after a completed run.

The field semantics of FR-18 are unchanged by this requirement and are not a means of satisfying it: after a standalone run
`mainHtmlUa` is still `''`, `translations` is still `{}`, and `seoData` and `slugData` are still `null`. FR-18 and FR-24 hold
together; neither is met by altering the other.

**Failure path:** a FAQ Generator run that stores no FAQ (the master was empty or failed, FR-10) leaves the central area
without the empty-state block as well; what, if anything, tells the operator that nothing was produced is not fixed by any
acceptance criterion (OD-8, OD-16: AC-21 removes the only "nothing was produced" cue, so that run shows a blank central area;
flagged for the human, no requirement written). The empty-state block of the other modes is governed by FR-28.

### FR-25: The result is the first content directly below the version tabs

After a completed FAQ Generator run, the generated result (the panel of the active version tab) is the first content directly
below the version tab bar. Whenever no validation panel and no repair panel is shown, both of the following hold:

1. no other element, in particular no empty-state block, sits between the tab bar and the result panel;
2. the result panel is not vertically centred and is not pushed down by a full-height sibling.

How this is checked (OD-15 default, carried): clause 1, and for clause 2 the absence of a full-height or centring sibling in
the FAQ Generator branch of the result view, are asserted from the template structure; actual rendered geometry is verified
only by a manual browser check, and the human may require a stronger check at HUMAN_SPEC_APPROVAL.

When a validation panel or a repair panel is shown (they appear only when issues or a repair report exist), where it sits
relative to the result is not changed by this Specification: by default (OD-12) the panels stay where they are today, above
the result, and this requirement is stated for the case with no such panel. The version tabs' labels and styling and the
result block's own content, styling and copy buttons are unchanged (OD-14 default; only the position of the result is in
scope).

**Failure path:** a FAQ Generator run that stores no FAQ has no result panel; this requirement then asserts nothing beyond
FR-24.

### FR-26: Field order in the FAQ Generator form

In the FAQ Generator form, Supplemental Content is positioned directly under the Product Name field and before Original
Description and Tech Specs. The field order is Target Website, Product Name, Supplemental Content, Original Description,
Tech Specs.

**Failure path:** n/a, no failure path — a static property of the form layout.

### FR-27: Supplemental Content label and required marker in the FAQ Generator

In the FAQ Generator form, with the English interface, the Supplemental Content label reads "Supplemental Content
(Required)" followed by the required marker `*`; the text "Optional" does not appear in that label. The field carries the
required marker (the marker is part of this requirement because the field is mandatory; the enablement behaviour is FR-16
and is unchanged by FR-26).

With the Ukrainian interface the FAQ Generator shows a Ukrainian label for the same field, and it does not read "Опціонально".
Default carried (OD-13, flagged for human approval at HUMAN_SPEC_APPROVAL): "Додатковий контент (Обов'язково)". AC-24 itself
fixes the English text only; the Ukrainian wording is a labelled default, not a decision.

This requirement is FAQ-Generator-specific: the label text of the Generator and UA Description forms is governed by FR-28.

**Failure path:** n/a, no failure path — a static property of the form. The Generate-guard alert text that still lists
"Original Description" as mandatory is not covered by any acceptance criterion and is unchanged (OD-17, reported to the
human as a finding; no requirement written).

### FR-28: Other modes are unchanged by FR-24 to FR-27

The Generator and UA Description forms keep the Supplemental Content label "Supplemental Content (Optional)" (English
interface; the Ukrainian interface keeps the label it shows today) and their current field order. The empty-state block is
still rendered in every mode other than FAQ Generator exactly when it is rendered today (in particular SEO Generator and Slug
Generator before their first run keep it; OD-10 default). The layouts, field labels and empty state of SEO Generator, Slug
Generator and every other mode are unchanged.

**Failure path:** any change of those outputs in a mode other than FAQ Generator is a defect.

## Non-functional requirements

- **NFR-1 (provider independence, AGENTS.md §3 Rule 1):** the FAQ generation and translation calls go through the
  `LlmProvider` interface; no behaviour depends on which provider is active.
- **NFR-2 (retrieval separation, §3 Rule 2):** the FAQ generation and translation steps make no web search or page-fetch
  call. This rule has no automated check, so it is stated here for review.
- **NFR-3 (prompts out of code, §3 Rule 3):** all prompt text, including the FAQ-specific translation instructions, lives
  in the prompt layer and is not hard-coded as strings in a service.
- **NFR-4 (caching, §3):** system blocks of the FAQ generation and translation prompts keep `cache: true` and are not
  collapsed into `userContent`.
- **NFR-5 (store registry, §3):** the languages of a run, the master language's presence and the currency symbol come from
  `STORE_REGISTRY`; no language list or currency symbol is hard-coded.
- **NFR-6 (secrets, §3 Rule 4):** no key reaches the browser bundle; the standalone mode uses the existing proxy path.
- **NFR-7 (behavioural compatibility, §3 Rule 5):** Generator, UA Description, SEO Meta, Slug and the other modes keep their
  behaviour apart from the FAQ changes specified here; description translation (prompt and parity behaviour) is unchanged.
- **NFR-8 (determinism):** the `<strong>`→`<b>` conversion, the parity check and the validity check are deterministic and
  pure on their input (no wall-clock or unseeded randomness), so each is testable with a stubbed LLM; no acceptance criterion
  requires a live model. Statements about free model wording (FR-21 and FR-23 beyond their normaliser and prompt-text parts)
  are review criteria and are not asserted automatically.
- **NFR-9 (UI change containment, v3):** FR-24 to FR-28 are verifiable with stubbed run state and the template structure, with
  no live model; they change no prompt, no `STORE_REGISTRY` entry and no FROZEN file (AGENTS.md §9), and no data field of the
  result (FR-18). The geometric clause of FR-25 is verified manually (OD-15 default).

## Out of scope

- The `<h3>` question tag and how the CMS renders it (an OpenCart module owns that).
- Making the FAQ unconditional in Generator or UA Description; the trigger stays "only with Supplemental Content".
- `<b>`/`<strong>` handling in descriptions, the Optimizer and the HTML editor (US-6.2); a product-wide `<strong>` ban (OD-2).
- FAQPage / schema.org markup, the HowTo artifact, the number of questions (3–5) and the 150–400 word target of the FAQ prompt.
- Changing any other mode, or the per-language SEO and slug generation.
- Any edit to `task-a.ts`, `task-b.ts`, `master-system-prompt.ts` or `output-validator.ts`.
- Operator-facing wording and severity of messages about a skipped language or dropped FAQ (OD-8), and what the operator sees
  after a FAQ Generator run that stores no FAQ now that the empty-state block is gone (OD-16).
- Of the standalone tool's screen, everything that FR-24 to FR-28 do not fix: which tabs a standalone run shows and their
  order, state reset on a mode switch, history restore (OD-9), what the central area shows before a run beyond the absence
  of the empty-state block, including whether an empty tab-bar strip is hidden (OD-11), and where the validation and repair
  panels sit relative to the result (OD-12). v2 excluded "the layout of the standalone tool's output tabs" wholesale; v3
  narrows that exclusion to exactly these items, because AC-21 and AC-22 now fix the empty-state block and the result
  position, and AC-23 to AC-25 fix the form.
- The layout, field order, field labels and empty state of Generator, UA Description, SEO Generator, Slug Generator and every
  other mode (FR-28); renaming or restyling the FAQ Generator version tabs (OD-14), and the FAQ result block's own content,
  styling and copy buttons.
- The text of the Generate-guard alert that names Original Description as mandatory (OD-17).
- Treating the operator's manual browser test of the FAQ Generator as acceptance evidence: it is a recorded claim in the
  Story, not an acceptance criterion and not evidence produced by the pipeline.
- A live-model run as release evidence; acceptance is by stubbed LLM.

## Open questions

All twenty Open Decisions are recorded in `docs/decisions/US-8.1-open-decisions.md` (v2), all `blocking: false`. None is
resolved by this Specification. Carried-default means a requirement above states the clarifier's proposed default, which the
human may overturn at HUMAN_SPEC_APPROVAL. OD-1 to OD-9 are carried from v1 of the log with their ids and text unchanged. The
three open points that Specification v2 held as its own SP-1 to SP-3 are now OD-18 to OD-20 in the log, and are referenced
here by those ids.

### Carried from Specification v2 (OD-1 to OD-9)

- **OD-1** (Story Q1) — "3 attempts" versus the repair gate budget; master exhausted; "exactly one call" versus retries.
  Carried default in FR-1, FR-10, FR-11.
- **OD-2** (Story Q2) — FAQ-scoped versus product-wide `<strong>` ban. Carried default (FAQ-scoped) in FR-7 and Out of scope.
- **OD-3** — parity tag set (`h3`/`p`/`li` versus `h3`/`ul`/`li`) and FAQ-only scope. Carried default in FR-3. The Story's
  Scope and AC-3 disagree; the ACs are treated as authoritative with `ul` added.
- **OD-4** — meaning of "valid HTML", empty master response, enforcer of AC-9. Carried default in FR-9, FR-10.
- **OD-5** — how Task C recognises a FAQ input and which description-only blocks it drops; the scope of the AC-18 byte
  identity. Carried default in FR-12, FR-13. The mechanism is a planning matter.
- **OD-6** — FAQ translation model tier, normalizers, extra validators, protected-name block (US-7.1). No acceptance
  criterion covers it, so no requirement is written; the human should decide before planning.
- **OD-7** — bold placement policy, `<b>` preservation in translations, conversion ordering and attributes. Carried default in
  FR-7 (pure rename, attributes kept; no `<b>` parity check). The ordering is stated more precisely than the clarifier's
  "applied last": the conversion runs on every model-produced FAQ text before validation and again after every repair, so
  that the stored text has no `<strong>` and `<strong>` alone never fails FR-9 (v1 of this Specification had FR-7 and FR-9
  in conflict on this point). The human may overturn this at approval.
- **OD-8** — surfacing a skipped language or dropped FAQ; history entry for a partial result. No requirement written (no AC);
  FR-20 notes the gap. Interacts with OD-16.
- **OD-9** — standalone tool inputs, output tabs, state reset, history restore. No requirement written beyond AC-10 to AC-15
  and, for the screen layout, the v3 requirements FR-24 to FR-28 (AC-21 to AC-26); the rest stays open (Out of scope).

### Raised by the v3 change (OD-10 to OD-17)

Each Story-level question (UI-Q1 to UI-Q5) carries the Story's own default, which AC-21 to AC-26 already assume and which the
clarifier proposes a specification may carry. Carried defaults are labelled in the requirements.

- **OD-10** (Story UI-Q1) — scope of the layout change. Carried default (FAQ Generator only; other modes, including the empty
  state of SEO and Slug Generator, unchanged) in the Scope table, FR-24 to FR-28.
- **OD-11** (Story UI-Q2) — what the FAQ Generator central area shows before any run, including whether an empty tab-bar strip
  is hidden. Carried default: nothing beyond whatever the tab bar renders today; AC-21 constrains only the empty-state block.
  No requirement is written for the tab strip (Out of scope).
- **OD-12** (Story UI-Q3) — validation and repair panels versus "result directly under the tabs". Carried default in FR-25:
  panels stay where they are; FR-25 is stated for the case with no panel. Note for the human: when a language is skipped
  (OD-8 default) a panel can appear in exactly those runs, so FR-25 may hold only vacuously for real runs.
- **OD-13** (Story UI-Q4) — Ukrainian-interface wording of the FAQ Generator label. Carried default in FR-27 ("Додатковий
  контент (Обов'язково)"), **flagged for human approval at HUMAN_SPEC_APPROVAL**; AC-24 fixes the English text only.
- **OD-14** (Story UI-Q5) — version-tab labels. Carried default: unchanged (Out of scope, FR-25).
- **OD-15** — how AC-22's geometric clause is verified. Carried default in FR-25 and NFR-9: template-structure assertion
  for the structural clause and for the absence of a full-height or centring sibling; real geometry by manual browser check;
  the human may require a stronger check.
- **OD-16** — AC-21 removes the only "nothing was produced" cue, so a run that stores no FAQ leaves a blank central area.
  No requirement written beyond FR-24; the failure-state message stays with OD-8; flagged to the human as a consequence of
  AC-21.
- **OD-17** — the Generate-guard alert text names Original Description as mandatory in FAQ Generator. Carried default:
  unchanged; no requirement written; reported to the human as a finding (FR-27, Out of scope).

### Formerly Specification-internal points (OD-18 to OD-20, were SP-1 to SP-3)

- **OD-18** (was SP-1; review R3) — a thrown provider error (timeout, rate limit, truncated response) on a master or
  translation call. The Story and OD-1 say nothing. Carried default in FR-10 and FR-11: it counts as one failed attempt under
  the same budget of 3 and does not abort the run; a FAQ failure never discards output produced earlier in the run.
- **OD-19** (was SP-2; review N5) — whether a FAQ translation must preserve the master's numbers, units, currency symbol and
  product name. AGENTS.md §4 says "Don't change values or units" for descriptions; the Story has no AC for it for FAQ
  translations, and writing one would add a Story-level requirement. No FR is written. The prompt-level handle (FR-12, item
  2: unit and number rules kept) is the only coverage. Related: OD-6. The human decides whether the Story needs an AC.
- **OD-20** (was SP-3; review N4) — a store profile with no `uk-UA` / N = 1 (the `getStore()` fallback). Every
  `STORE_REGISTRY` store has uk-UA and N ≥ 2, and AC-1 is stated for N ≥ 2; behaviour outside that is unspecified and no
  requirement is written.

## Traceability matrix

| Acceptance criterion | Satisfied by | Notes |
|---|---|---|
| AC-1 | FR-1 | "Exactly one" holds for the first-valid-response case (OD-1). |
| AC-2 | FR-2 | |
| AC-3 | FR-3 | Failure path via FR-11. |
| AC-4 | FR-4 | |
| AC-5 | FR-5 | |
| AC-6 | FR-6 | |
| AC-7 | FR-7 | Conversion precedes the FR-9 check, so `<strong>` alone never costs an attempt. |
| AC-8 | FR-8 | |
| AC-9 | FR-9 | Enforcement mechanism per OD-4. Empty responses: FR-10 (master), FR-3/FR-11 (translation). |
| AC-10 | FR-15 | |
| AC-11 | FR-16 | |
| AC-12 | FR-17 | |
| AC-13 | FR-18 | Data fields only; tabs are OD-9. FR-24 holds together with it (the fields are not changed to remove the empty-state block). |
| AC-14 | FR-19, FR-1 | Same pipeline as AC-1–AC-3 and AC-6–AC-9. |
| AC-15 | FR-20 | |
| AC-16 | FR-10 | Provider-error handling: OD-18 default (formerly SP-1). |
| AC-17 | FR-11 | Provider-error handling: OD-18 default (formerly SP-1). |
| AC-18 | FR-13 | |
| AC-19 | FR-12, FR-3 | FR-12 items 1–3 are the pinned prompt content. |
| AC-20 | FR-14 | |
| AC-21 | FR-24 | Before a run, during a run, after a completed run. Blank area after a no-FAQ run: OD-16. Pre-run tab strip: OD-11. |
| AC-22 | FR-25, FR-24 | Asserted for the case with no validation or repair panel (OD-12). Geometric clause: OD-15 default. |
| AC-23 | FR-26 | |
| AC-24 | FR-27 | English text fixed by AC-24; Ukrainian-interface wording is the OD-13 labelled default. |
| AC-25 | FR-16, FR-27 | Enablement is FR-16 (restates AC-11, unchanged by the move); the required marker is part of FR-27. No second enablement requirement is invented. |
| AC-26 | FR-28 | FAQ Generator only (OD-10 default). |
| (none — AGENTS.md §4) | FR-21, FR-22, FR-23 | Required by the §4 rule for generated-HTML Stories; Story states no dedicated AC. FR-22/FR-23 partly overlap AC-9. FR-21 and the anglicism part of FR-23 are asserted only at normaliser and prompt-text level. The v3 layout change touches no §4 criterion. |

## Change history

- **v3** — revision against Story v3 (the operator's FAQ Generator layout change of requirements, AC-21 to AC-26),
  clarification report v2 and Open Decisions v2 (OD-1 to OD-20). Status returned to `DRAFT`; v2 is superseded and must pass
  SPEC_REVIEW and HUMAN_SPEC_APPROVAL again. Added FR-24 to FR-28 (empty-state block, result position, field order, label and
  required marker, other modes unchanged) and NFR-9; extended the traceability matrix so that AC-1 to AC-26 each trace to at
  least one FR. FR-1 to FR-23 and NFR-1 to NFR-8 keep their ids and meaning; the only edits to them are the reference
  renames SP-1 to OD-18 and SP-3 to OD-20 (no change of behaviour). Revised Out of scope: v2's exclusion of "the layout of the
  standalone tool's output tabs" is narrowed, consistently with AC-21 and AC-22, to the items FR-24 to FR-28 do not fix.
  Open questions now lists OD-1 to OD-20 as labelled carried defaults; the Specification's own SP-1 to SP-3 are replaced by
  OD-18 to OD-20. `specification_review` is no longer listed in `inputs_consumed`: review v2 was written against
  Specification v2 and is stale for this revision. No Open Decision was resolved.
- **v2** — revision after SPEC_REVIEW v1 (CHANGES_REQUIRED), attempt 1 of 3. R1: FR-7 now converts `<strong>` before the
  FR-9 and FR-3 checks and again after every repair, and states how "attributes kept" meets FR-9's "no attributes". R2: FR-9
  excludes empty responses; FR-10 makes an empty master terminal, FR-11 treats an empty translation as a parity failure. R3:
  FR-10 and FR-11 gained the provider-error path and "earlier output is never discarded" (SP-1, now OD-18). R4: FR-21 and
  FR-23 are restated at normaliser and prompt-text level, with the rest declared review-only (NFR-8). N3: FR-12 carries the
  pinned FAQ-variant content. N4: scope row and SP-3 (now OD-20). N5: SP-2 (now OD-19; no FR written). N6: FR-23 cites §4
  only for the `Product` `itemtype`. No Open Decision was resolved.
- **v1** — first draft against Story v2.
