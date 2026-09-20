---
artifact: ac_test_matrix
story: US-2.1
version: 1
status: DRAFT
owner: so-test-writer
created_at: 2026-09-21T12:00:00Z
updated_at: 2026-09-21T12:00:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 2
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: plan_review
    version: 2
open_decisions_blocking: false
---

# AC ↔ Test Matrix — US-2.1

Every `AC-n` from `docs/stories/US-2.1-migrate-descriptions-to-v4-schemas.md` has at least one row
naming a **real file** and a **real test**. `FR-27..FR-30`, `FR-20..FR-22`, `FR-25` and `FR-26`
trace to no AC by design and are recorded below as **standing / system-level** rows, not gaps — the
Specification's own traceability matrix says so.

`⬤` = expected RED at this stage (the TDD gate). `○` = green on arrival, labelled in the spec file
as a characterization or baseline.

---

## Acceptance criteria

### AC-1 — hook: single `<p>`, 40–85 words, opens `<b>{name}</b> —`

| Test file | Test | FR | |
|---|---|---|---|
| `src/prompts/task-a-doc.v4.spec.ts` | `V10 / FR-17.3, FR-18, FR-19 … › carries the §1 hook 40–85 volume` | FR-1, FR-17.3 | ⬤ |
| `src/prompt-core/master-system-prompt.v4.spec.ts` | `NI-1 / FR-1 … › has removed every occurrence of the superseded 40–75` | FR-1 | ⬤ |
| `src/prompt-core/master-system-prompt.v4.spec.ts` | `NI-1 / FR-1 … › states 40–85 in both the section map and the §1 clause` | FR-1 | ⬤ |
| `src/render/render-description.v4.spec.ts` | `V3 … › FR-18 — renders an over-long §1 hook unchanged rather than truncating it` | FR-18, FR-19 | ○ |

*The single-`<p>` shape is a renderer invariant (`render-description.ts:312` emits exactly one
`<p>` for `doc.hook`) and the 40–85 range is **prompt-only** by FR-17.3 — so the word count itself
is asserted as prompt text and as the absence of a rejection, never as an output measurement. That
is FR-18, not a gap.*

### AC-2 — hook 2–4 technical values; `killerSpecs` 3–4 in `<b>lead</b> — benefit` form

| Test file | Test | FR | |
|---|---|---|---|
| `src/render/render-description.v4.spec.ts` | `V3 … › renders each killer spec as <b>{label}: {value}</b> — {why} with a literal em dash` | FR-3 | ⬤ |
| `src/render/render-description.v4.spec.ts` | `V3 … › never lets a killer-spec item glue its bold lead to the following letter` | FR-3 | ⬤ |
| `src/domain/description-doc.schema.v4.spec.ts` | `V1 … › shows the over-ceiling shape is legal today because every individual bound still holds` (asserts `killerSpecs` length 4) | FR-3, FR-17 | ○ |

*The hook's "2–4 technical values" is declared a property of prose by FR-2 and carries no automated
check — stated in the Specification, not conceded here.*

### AC-3 — §2: one H2 + `<ul>` ≤ 8 items, 90–300 words, no table

| Test file | Test | FR | |
|---|---|---|---|
| `src/render/render-description.v4.spec.ts` | `V3 … › emits exactly one <h2> and exactly one <ul>, and no <table> between them` | FR-4 | ⬤ |
| `src/render/render-description.v4.spec.ts` | `V3 … › puts nothing between the <h2> and the </ul> — no <p>, <figure>, <iframe> or second list` | FR-4 | ⬤ |
| `src/render/render-description.v4.spec.ts` | `V3 … › renders the killerSpecs first, then the keyBenefits items, in one list of at most 8` | FR-4, FR-17 | ⬤ |
| `src/domain/description-doc.schema.v4.spec.ts` | `V2 … › FR-4 — rejects every non-bullets §2 Block at keyBenefits.<i>.kind` | FR-4 | ⬤ |
| `src/domain/description-doc.schema.v4.spec.ts` | `V2 … › FR-17 — rejects a combined §2 list of more than 8 items, at keyBenefits` | FR-17 | ⬤ |
| `src/domain/description-doc.schema.v4.spec.ts` | `V2 … › FR-17 — a combined §2 list of exactly 8 items is accepted; 9 is not` | FR-17 | ⬤ |
| `src/domain/description-doc.schema.v4.spec.ts` | `V2 … › FR-17 — the ceiling issue carries measured: { actual, limit, unit }` | FR-17 | ⬤ |
| `src/prompt-core/v4-headings.spec.ts` | `FR-4 / FR-11 … › §2 — renders the table’s keyBenefitsH2 for the document locale` | FR-4, NFR-6 | ⬤ |
| `src/prompt-core/master-system-prompt.v4.spec.ts` | `NI-2 / FR-4 … › no longer prints a §2 Killer Specs table template` | FR-4 | ⬤ |
| `src/prompt-core/master-system-prompt.v4.spec.ts` | `NI-2 / FR-4 … › states the merged §2 shape — one heading over one list, and no table` | FR-4 | ⬤ |
| `src/prompts/task-a-doc.v4.spec.ts` | `V10 … › no longer offers the full <Block> union for keyBenefits, and names bullets on that line` | FR-4 | ⬤ |
| `test/render-conformance.v4.spec.ts` | `V14 … › renders §2 as one <h2> over one <ul>, with no table` (× 20 store-locale pairs) | FR-4 | ⬤ |
| `src/domain/description-doc.schema.v4.spec.ts` | `V1 … › accepts L3 / FR-4 — §2 carrying a paragraph, a figure and a video Block` | FR-4, OD-2 | ○ |

*90–300 words: prompt-only, asserted at `task-a-doc.v4.spec.ts › carries the §2 block 90–300 volume`.*

### AC-4 — applications: H2 + `<ul>` 4–8 items, 80–250 words

| Test file | Test | FR | |
|---|---|---|---|
| `src/prompts/task-a-doc.v4.spec.ts` | `V10 / FR-17.3 … › carries the §4 applications 80–250 volume` | FR-5, FR-17.3 | ⬤ |
| `src/domain/description-doc.schema.v4.spec.ts` | `V1 … › accepts the base document every builder above is derived from` (4-item `applications.items` parses; the 4–8 bound is unchanged at `description-doc.schema.ts:174`) | FR-5 | ○ |
| `test/render-conformance.v4.spec.ts` | `V14 … › produces zero validator errors` (the `'4.0'` conformance doc carries 4 application items across 20 store-locale pairs) | FR-5 | ○ |

*FR-5's item count is an existing bound this Story does not move — the task breakdown records AC-4
as "T7 (bound unchanged)". The scenario-explanation clause is declared prose-only by FR-5.*

### AC-5 — §5 and §6 only when the source has the data; §6 is an `<ol>` under the localized heading

| Test file | Test | FR | |
|---|---|---|---|
| `src/render/render-description.v4.spec.ts` | `V15 … › 4.0 — renders the package-contents list as an <ol>` | FR-6, D17 | ⬤ |
| `src/render/render-description.v4.spec.ts` | `V15 … › changes only the list container — the heading and every <li> are identical on both paths` | FR-6, FR-15 | ⬤ |
| `src/render/render-description.v4.spec.ts` | `V15 … › 3.0 — renders the package-contents list as a <ul>` | FR-15, NFR-8 | ○ |
| `src/domain/description-doc.schema.v4.spec.ts` | `V2 … › FR-6 — rejects a §6 heading that is not a table entry for the document locale` | FR-6, D5 | ⬤ |
| `src/domain/description-doc.schema.v4.spec.ts` | `V2 … › FR-6 — accepts the uk-UA single-product heading FR-6 states verbatim` | FR-6 | ⬤ |
| `src/prompt-core/v4-headings.spec.ts` | `V7 … › gives uk-UA the two §6 variants FR-6 names, and they differ from each other` | FR-6 | ⬤ |
| `src/prompt-core/v4-headings.spec.ts` | `V7 … › has all four entries for <locale>, each a non-empty string` (× 10 locales) | FR-6, FR-11, NFR-6 | ⬤ |
| `src/prompts/task-a-doc.v4.spec.ts` | `V10 … › tells the model the §6 heading is exactly one of the two strings for its locale` | FR-6 | ⬤ |
| `src/prompts/task-a-doc.v4.spec.ts` | `V10 … › states that §5 and §6 are emitted only when the source carries that data` | FR-6 | ○ |
| `src/prompt-core/master-system-prompt.v4.spec.ts` | `NI-5 / FR-6 … › no longer prints a §6 heading string` | FR-6 | ⬤ |
| `src/prompt-core/master-system-prompt.v4.spec.ts` | `NI-5 / FR-6 … › no longer describes §6 as 1 <h2> + 1 <ul> in the section map` | FR-6 | ⬤ |

### AC-6 — §7: H3 + table per category, responsive/bordered/striped, no list or `<br>` in a cell, multi-value comma-joined

| Test file | Test | FR | |
|---|---|---|---|
| `src/domain/description-doc.schema.v4.spec.ts` | `V2 … › FR-10 — rejects an array §7 spec value at specs.categories.0.rows.2.value` | FR-10 | ⬤ |
| `src/domain/description-doc.schema.v4.spec.ts` | `V2 … › FR-10 — accepts the same parameter comma-joined into a single string` | FR-9, FR-22 | ⬤ |
| `src/domain/description-doc.schema.v4.spec.ts` | `V1 … › accepts L2 / FR-10 — a §7 spec row whose value is an array of strings` | FR-10, OD-2 | ○ |
| `src/prompts/task-a-doc.v4.spec.ts` | `V10 … › states that specs.categories[].rows[].value is a string, with no array alternative` | FR-9, FR-10 | ⬤ |
| `src/prompts/task-a-doc.v4.spec.ts` | `V10 … › tells the model to comma-join a multi-value parameter into that one string` | FR-9 | ⬤ |
| `test/render-conformance.v4.spec.ts` | `V14 … › keeps one <h3> and one table per §7 category` (× 20 pairs) | FR-7 | ⬤ |
| `test/render-conformance.v4.spec.ts` | `V14 … › produces zero validator errors` — `spec-category-shape` and `spec-count-parity` run inside it | FR-7, FR-8, FR-22 | ○ |
| `src/render/render-description.v4.spec.ts` | `V3 … › keeps §7 the only <section> and the only <hr>, and emits no <br>` | FR-8, FR-25 | ○ |

*FR-8's "no `<ul>`/`<ol>`/`<br>` in a value cell" is made unrepresentable for `'4.0'` by the
string-only value (D1) — the array rejection above is the direct check; `br-spacing` in the
validator is the standing one.*

### AC-7 — CTA: single `<p>` 50–100 words under the localized commercial H2

| Test file | Test | FR | |
|---|---|---|---|
| `src/prompt-core/v4-headings.spec.ts` | `FR-11 / D6 … › $storeName / $locale — substitutes the product and the store, leaving no placeholder behind` (× 23 store-locale pairs) | FR-11, NFR-6 | ⬤ |
| `src/prompt-core/v4-headings.spec.ts` | `FR-11 / D6 … › honours Center 3D Print’s uk-UA «варто … у Center 3D Print» override` | FR-11 | ⬤ |
| `src/prompt-core/v4-headings.spec.ts` | `FR-11 / D6 … › resolves from V4_SECTION_HEADINGS rather than holding its own copy of the template` | FR-11, NFR-6 | ⬤ |
| `src/prompt-core/v4-headings.spec.ts` | `FR-4 / FR-11 … › §9 — discards doc.cta.heading and assembles the CTA from the template instead` | FR-11, D6 | ⬤ |
| `src/prompt-core/v4-headings.spec.ts` | `V7 … › gives <locale> a §9 template carrying both [Product-short] and [Store]` (× 10) | FR-11 | ⬤ |
| `src/prompt-core/master-system-prompt.v4.spec.ts` | `NI-4 / FR-11 … › carries the v4 uk-UA CTA template and not the superseded «Чому купити» one` | FR-11 | ⬤ |
| `src/prompt-core/master-system-prompt.v4.spec.ts` | `NI-4 / FR-11 … › states 50–100 for §9, in the section map and in the clause` | FR-11, FR-17.3 | ⬤ |
| `src/prompts/task-a-doc.v4.spec.ts` | `V10 … › states the §9 CTA is a single paragraph under the localized commercial heading` | FR-11 | ⬤ |
| `src/prompt-core/v4-headings.spec.ts` | `FR-4 / FR-11 … › §9 — a 3.0 document still renders its own authored cta.heading` | FR-15, NFR-8 | ○ |

### AC-8 — no `<h1>` in the body; FAQ separate, 3–5 pairs of 2–4 sentences, never embedded

| Test file | Test | FR | |
|---|---|---|---|
| `src/render/render-description.v4.spec.ts` | `V3 … › emits no <h1> in a 4.0 document / … in a 3.0 document` | FR-12 | ○ |
| `test/render-conformance.v4.spec.ts` | `V14 … › emits no <h1> and never puts schema.org/Product in the body` (× 20) | FR-12, FR-26 | ○ |
| `src/prompts/task-faq.v4.spec.ts` | `FR-13 … › states the 150–400 word range v4 adds` | FR-13 | ⬤ |
| `src/prompts/task-faq.v4.spec.ts` | `FR-13 … › no longer labels the artifact Schema v3.0` | FR-13 | ⬤ |
| `src/prompts/task-faq.v4.spec.ts` | `FR-13 … › states 3–5 question/answer pairs` | FR-13 | ○ |
| `src/prompts/task-faq.v4.spec.ts` | `FR-13 … › states 2–4 factual sentences per answer` | FR-13 | ○ |
| `src/prompts/task-faq.v4.spec.ts` | `FR-13 / OD-10 … › keeps the FAQ a standalone artifact with no description-body sections in its contract` | FR-13 | ○ |
| `src/prompts/task-faq.v4.spec.ts` | `FR-13 / OD-10 … › still tells the model to return nothing when the sources answer no question` | FR-13, OD-10 | ○ |

### AC-9 — hook structural pattern rotation across a fixture batch

| Test file | Test | FR | |
|---|---|---|---|
| `src/prompt-core/hook-pattern.spec.ts` | `AC-9 … › repeats its predecessor’s pattern on fewer than half the adjacent pairs` | FR-14 | ⬤ |
| `src/prompt-core/hook-pattern.spec.ts` | `AC-9 … › yields a run of 5 consecutive products with no two adjacent hook patterns alike` | FR-14 | ⬤ |
| `src/prompt-core/hook-pattern.spec.ts` | `AC-9 … › spreads that batch across every available pattern, not just two` | FR-14 | ⬤ |
| `src/prompt-core/hook-pattern.spec.ts` | `V5 / FR-14 … › reaches every available pattern over a set of distinct name + website pairs` | FR-14 | ⬤ |
| `src/prompt-core/hook-pattern.spec.ts` | `V5 / FR-14 … › is not constant` | FR-14 | ⬤ |
| `src/prompt-core/hook-pattern.spec.ts` | `V5 / FR-14 … › is not a function of website alone — one store’s products draw different patterns` | FR-14 | ⬤ |
| `src/prompt-core/hook-pattern.spec.ts` | `V5 / FR-14 … › is not a function of any single character of name` | FR-14 | ⬤ |
| `src/prompt-core/hook-pattern.spec.ts` | `V5 / NFR-5 … › returns the same pattern for the same name + website on every call` | NFR-5 | ⬤ |
| `src/prompt-core/hook-pattern.spec.ts` | `V5 / NFR-5 … › offers at least 4 structural patterns, as v4 §1 «Антиконвеєр» requires` | FR-14 | ⬤ |
| `src/prompt-core/hook-pattern.spec.ts` | `V5 … › contains no Math.random, no Date and no mutable module-level binding` | NFR-5 | ⬤ |
| `src/services/content-orchestrator.hook-pattern.spec.ts` | `FR-14 … › passes selectHookPattern(name, website) to buildPromptADoc` | FR-14 | ⬤ |
| `src/services/content-orchestrator.hook-pattern.spec.ts` | `FR-14 … › selects a pattern on every buildPromptADoc call the run makes` | FR-14 | ⬤ |

*Both hook-pattern files fail at module resolution until T6 creates `src/prompt-core/hook-pattern.ts`
— the intended TDD state for a module that does not exist. See the test generation report.*

### AC-10 — first image eager / rest lazy, localized iframe title, locale decimal and thousands separators

| Test file | Test | FR | |
|---|---|---|---|
| `test/render-conformance.v4.spec.ts` | `V14 … › keeps the first image in rendered document order eager and every later one lazy` (× 20) | FR-23 | ○ |
| `test/render-conformance.v4.spec.ts` | `V14 … › gives every figure a figcaption and never nests one inside a <p>` (× 20) | FR-23 | ○ |
| `test/render-conformance.v4.spec.ts` | `V14 … › carries the video embed through, inside §3 and never inside §2` (× 20) | FR-24, FR-4 | ⬤ |
| `src/prompt-core/number-format-rules.v4.spec.ts` | `V9 / FR-16 … › fixes de-DE on decimal comma + non-breaking space / es-ES / pt-PT` | FR-16 | ⬤ |
| `src/prompt-core/number-format-rules.v4.spec.ts` | `V9 / FR-16 … › no longer offers de-DE or es-ES a thousands DOT` | FR-16 | ⬤ |
| `src/prompt-core/number-format-rules.v4.spec.ts` | `V9 / FR-16 … › gives group 3 the same worked example group 2 already shows` | FR-16 | ⬤ |
| `src/prompt-core/number-format-rules.v4.spec.ts` | `V9 / FR-16 … › keeps the uk-UA / ru-UA line exactly as the UA style guide asserts it` | FR-16 | ○ |
| `src/prompt-core/number-format-rules.v4.spec.ts` | `V9 / FR-16 … › keeps es-US / es-MX on decimal dot and thousands comma` | FR-16 | ○ |
| `src/utils/number-format-fixer.v4.spec.ts` | `FR-16 group 3 … › regroups a dot-grouped number for de-DE / es-ES / pt-PT` | FR-16 | ⬤ |
| `src/utils/number-format-fixer.v4.spec.ts` | `FR-16 groups 1 and 2 … › leaves a group-1 number alone for <locale>` | FR-16 | ⬤ |
| `src/utils/number-format-fixer.v4.spec.ts` | `FR-21 … › never changes a digit or a unit, and keeps the space between them` | FR-21 | ○ |
| `src/prompt-core/master-system-prompt.v4.spec.ts` | `NI-2 / FR-4 … › no longer routes a figure into §2 body text, nor weaves figures into §2 prose` | FR-23 | ⬤ |
| `src/prompts/task-a-doc.v4.spec.ts` | `V10 / FR-23, FR-24 … › names §3 as where a video embed goes` | FR-24 | ⬤ |
| `src/prompts/task-a-doc.v4.spec.ts` | `V10 / FR-23, FR-24 … › keeps the lead-in <p> obligation attached to every figure` | FR-23 | ⬤ |

*The localized iframe `title` is model-authored prose the renderer escapes and never rewrites; the
conformance matrix asserts it survives verbatim into every store's output. **R3 is recorded, not
closed**: the group-3 switch ships with no automated detector — see the test strategy §7.*

### AC-11 — emitted document has `schemaVersion: '4.0'`; `'3.0'` per OD-2

| Test file | Test | FR | |
|---|---|---|---|
| `src/domain/description-doc.schema.v4.spec.ts` | `V2 … › FR-15 — the schema accepts 4.0 as a version at all` | FR-15 | ⬤ |
| `src/prompts/task-a-doc.v4.spec.ts` | `V10 / FR-15 … › asks for "schemaVersion": "4.0"` | FR-15 | ⬤ |
| `src/prompts/task-a-doc.v4.spec.ts` | `V10 / FR-15 … › offers the model no "3.0" anywhere to fall back to` | FR-15, FR-30 | ⬤ |
| `src/render/doc-schema-issues.v4.spec.ts` | `V13 / FR-30 … › the Doc prompt offers the model no 3.0` | FR-15, FR-30 | ⬤ |
| `src/domain/description-doc.schema.v4.spec.ts` | `V1 … › accepts <each of the six cached `'3.0'` shapes>` (6 cases) | FR-15, NFR-8, OD-2 | ○ |
| `test/render-reconciliation.spec.ts` | the whole existing suite, **unchanged**, on both corpus items | NFR-8, leak L6 | ○ |

---

## Standing rows — requirements that trace to no AC

These are declared in the Specification's traceability matrix as standing or system-level. They are
listed here so RECONCILIATION reads them as intentional rather than as untraced coverage.

| FR / NFR | Test file | Test | |
|---|---|---|---|
| **FR-20** v4 structure preserved in every locale | `src/utils/structural-parity.v4.spec.ts` | `V11 / FR-20 … › flags a translation that drops the §2 <h2> / … re-adds a §2 <table> / … changes the §2 <li> count / … merges two §3 groups` | ○ |
| **FR-20 / R9** the one property parity cannot see | `src/utils/structural-parity.v4.spec.ts` | `R9 … › does NOT flag a translation that renders §6 as a <ul> instead of an <ol>` — **the test passing IS the gap; R9 is accepted, not closed** | ○ |
| **FR-21** unit spacing, value fidelity | `src/utils/number-format-fixer.v4.spec.ts` | `FR-21 … › still masks the product name’s invariant core out of every numeric transform, … › does not touch numbers inside attributes` | ○ |
| **FR-22** spec-count parity under comma-joining | `test/render-conformance.v4.spec.ts` | `V14 … › produces zero validator errors` (runs `spec-count-parity`) | ○ |
| **FR-25** markup discipline | `src/render/render-description.v4.spec.ts` | `V3 … › keeps §7 the only <section> and the only <hr>, and emits no <br>; V15 … › leaves the <section> and <hr> counts untouched on both paths` | ○ |
| **FR-26** standing criteria; `meta-description-currency` stays disarmed | `test/render-conformance.v4.spec.ts` | `V14 … › emits no <h1> and never puts schema.org/Product in the body` | ○ |
| **FR-27** §3 mandatory, H2/H3 rule, no volume limit | `src/domain/description-doc.schema.v4.spec.ts` | `V2 … › FR-27 — rejects a single-<h3> functionality group at functionality.0.subsections; … › FR-27 — leaves an absent or empty subsections alone` | ⬤ |
| **FR-27** | `src/prompt-core/master-system-prompt.v4.spec.ts` | `NI-3 / FR-27 … › has removed every occurrence of the superseded 150–2,000; … › no longer asks the model to compress §3 toward a lower word bound it no longer has` | ⬤ |
| **FR-27** | `src/prompts/task-a-doc.v4.spec.ts` | `V10 / FR-27, FR-28 … › states that §3 is mandatory; … › states that an <h3> opens only when a group has 2 or more distinct sub-functions; … › states that §3 carries no word limit` | ⬤ |
| **FR-28** distinct technical aspects, no restatement | `src/prompts/task-a-doc.v4.spec.ts` | `V10 / FR-27, FR-28 … › forbids restating the same characteristic from one §3 block to the next` — **prompt-only by the Specification's own text; no validation rule is created** | ⬤ |
| **FR-29** no change to the functionality bullets floor | `src/domain/description-doc.schema.v4.spec.ts` | `V2 … › FR-29 — a 2-item bullets Block in §3 still fails under 4.0, exactly as under 3.0` | ○ |
| **FR-29** | `src/prompts/task-a-doc.v4.spec.ts` | `V10 … › keeps the paragraph escape hatch that stands in for an under-filled bullets Block` | ○ |
| **FR-30** exhaustion fails loudly, never downgrades | `src/render/doc-schema-issues.v4.spec.ts` | `V13 / FR-30 … › throws rather than returning an empty artifact`; `… › names every unresolved schema failure in the message`; `… › treats a whitespace-only artifact as empty`; `… › lets a non-empty artifact through untouched` — **a characterization test over existing `assertDocRendered` behaviour (D16: no code is added)** | ○ |
| **FR-30** the negative obligation | `src/render/doc-schema-issues.v4.spec.ts` | `V13 / FR-30 … › <module> assigns no schemaVersion at all (× 3); … › the renderer reads schemaVersion but never assigns it` | ○ |
| **NFR-1** prompt-caching separation | `src/prompts/task-a-doc.v4.spec.ts` | `V6 / NFR-1 … › keeps buildPromptA’s master block byte-identical, so the cached prefix still hits`; `… › replaces only index 1, and leaves it cacheable`; `… › still accepts the two-argument call both existing call sites make` (C-2) | ○ |
| **NFR-1** | `src/services/content-orchestrator.hook-pattern.spec.ts` | `NFR-1 … › appends the pattern instruction to userContent and leaves systemBlocks alone; … › two products drawing different patterns share byte-identical systemBlocks` | ⬤ |
| **NFR-5** determinism | `src/services/content-orchestrator.hook-pattern.spec.ts` | `NFR-1 … › is byte-stable for the same product across builds` | ⬤ |
| **NFR-5** | `src/prompt-core/hook-pattern.spec.ts` | `V5 / NFR-5 … › is unaffected by how many other products were selected before it` | ⬤ |
| **NFR-6** `STORE_REGISTRY` the only source | `src/prompt-core/v4-headings.spec.ts` | `V7 … › derives its locale set from STORE_REGISTRY rather than a hand-written list; … › covers no locale the registry does not publish, so the two cannot drift apart` | ⬤ |
| **NFR-8** cache preservation | `src/domain/description-doc.schema.v4.spec.ts` | the whole `V1` block (8 tests) | ○ |
| **NFR-8** | `src/render/render-description.v4.spec.ts` | `V3 … › leaves a 3.0 document rendering the §2a table exactly as before; V15 … › 3.0 — renders the package-contents list as a <ul>` | ○ |
| **D4 consequence 1** (heading-style interaction) | `src/utils/heading-style.v4.spec.ts` | `V8 — Center 3D Print / uk-UA \| ru-UA › renders one more <h2> than the same document does as `3.0``; `… › raises no h2-nominal-heading warning`; `… › raises no heading-product-name-stuffing warning`; `… › keeps the §9 closing as the last question-form <h2>` | ⬤ / ○ |
| **T2** `MANDATED_NOMINAL_H2` | `src/prompt-core/v4-headings.spec.ts` | `V7 … › adds the uk-ua \| ru-ua §2 heading to MANDATED_NOMINAL_H2` | ⬤ |
| **D14** `Expert-3DPrinter` exclusion | `test/render-conformance.v4.spec.ts` | `V14 … › keeps exactly one store blocked by a missing image base URL` | ○ |
| **T12 tier 2** | `src/prompt-core/master-system-prompt.v4.spec.ts` | `T12 tier 2 … › keeps COLON CAPITALIZATION and BOLD-LABEL SEPARATION in the prompt` (the one **positive** check — T5's `bold-label-glue` clearance depends on it) and the four rename checks | ○ / ⬤ |
| **Human decision 3** (schema label) | `src/prompt-core/master-system-prompt.v4.spec.ts` | `The schema label the human fixed at HUMAN_PLAN_APPROVAL › names the content structure Schema v4.0` | ⬤ |

---

## Recorded human decision — traced to no FR and no AC, by design

Decision 2 of HUMAN_PLAN_APPROVAL (2026-09-21) extends T12 to `src/prompts/optimizer.ts`. The
approved Specification does not reach that file; this is a human-directed consequence of the
shared-prompt edit and is recorded here so RECONCILIATION does not read it as untraced scope creep.

| Test file | Test | |
|---|---|---|
| `src/prompts/optimizer.spec.ts` | `buildOptimizerPrompt — the v4 target shape … › names the target schema v4.0, not v3.0` | ⬤ |
| `src/prompts/optimizer.spec.ts` | `… › no longer directs the model to reproduce a §2a Killer Specs highlight table` | ⬤ |
| `src/prompts/optimizer.spec.ts` | `… › tells the model to merge a legacy §2 table into one <ul> of at most 8 items` | ⬤ |
| `src/prompts/optimizer.spec.ts` | `… › tells the model to format §6 package contents as an <ol>` | ⬤ |
| `src/prompts/optimizer.spec.ts` | `… › tells the model to comma-join a multi-value §7 cell into one row` | ⬤ |
| `src/prompts/optimizer.spec.ts` | `… › keeps both system blocks cacheable and byte-stable` | ○ |

The plan review's first non-blocking finding was that `optimizer.spec.ts` "currently passes either
way", so this needed a test that actually fails today. Five of the six do.
