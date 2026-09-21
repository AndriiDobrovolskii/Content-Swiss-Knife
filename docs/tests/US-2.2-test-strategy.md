---
artifact: test_strategy
story: US-2.2
version: 3
status: ARCHIVED
owner: so-test-writer
created_at: 2026-09-21T20:30:00Z
updated_at: 2026-09-21T23:30:00Z
supersedes: docs/tests/US-2.2-test-strategy.md#2
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 1
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: plan_review
    version: 2
  - key: open_decisions
    version: 3
open_decisions_blocking: false
---

# Test Strategy — US-2.2: Simplified v4 content-template schemas and Content Template dropdown

## Approach

Tests are written from the acceptance criteria and the specification, before any implementation exists. Assertions come from the criterion ("the built prompt requests paragraphs 1, 5, 8 and no others", "a 4000-character description with a 120-word hook is rejected"), never from the plan's proposed internals and never from a captured run. The one deliberate exception is the FR-6 golden, which is by definition a capture of the PRE-Story bytes (see "Golden guard").

Layers, and why each is tested where it is:

| Layer | Runner | How |
|---|---|---|
| Registry, prompt builders (Doc and legacy), translation prompts | `test:logic` | plain vitest, real builders, real fixtures |
| Domain schema, completeness gate, renderer (incl. `flatSpecs`) | `test:logic` | plain vitest, hand-authored v4 documents from `test/fixtures/simplified-docs.ts` |
| Validators (ranges, §7 shape, count parity, category shape, output-validator entry point) | `test:logic` | plain vitest; Doc and HTML entry points compared over one fixture set |
| Orchestrator (routing, gate wiring, FAQ step) | `test:logic` | `Injector.create` with `import '@angular/compiler'` first, LLM stubbed at the boundary, everything else real (the pattern of `content-orchestrator.ua-doc-pipeline.spec.ts`) |
| Media / translation-side utilities | `test:logic` | real utilities over rendered simplified documents |
| Cross-store conformance | `test:logic` | `test/render-conformance.simplified.spec.ts`, the 20 renderable store x locale pairs x 3 templates |
| Dropdown + checkbox DOM | `test:components` | `@testing-library/angular`, queried by role and accessible name |
| Removal | `test:logic` | `test/removal.spec.ts`, repository-wide search and file-existence checks |

No `sleep`, no unseeded randomness, no network. The unit under test is never mocked; the LLM is the only stub.

## Contracts the tests define (the plan names exports but not shapes)

`so-builder` must conform to these; they are what the tests import and assert.

| Contract | Shape assumed |
|---|---|
| `paragraphsFor(id, { includeFunctionality })` | returns the ORDERED list of v4 paragraph NUMBERS (1..9), including the data-conditional §5 and §7 |
| `V4_WORD_RANGES` | keys `hook`, `block2` (Killer Specs + Key Benefits block), `applications`, `compatibility`, `cta`, `faq`, each `{ min, max }` |
| `SIMPLIFIED_TEMPLATE_IDS`, `isSimplifiedTemplateId`, `NARRATIVE_SOFT_CEILING`, `countWords` | as named in plan D1; ids are `filaments-resins-powders`, `accessories`, `spare-parts` |
| `validateTemplateCompleteness(doc, templateId, { includeFunctionality, hasSpecs })` | returns `ValidationIssue[]`; missing REQUIRED paragraph = `error` with `path` at the paragraph's key; stray EXCLUDED paragraph = `warning`, rule `template-excluded-paragraph`; Full (`undefined` id) requires the pre-Story mandatory set |
| rule `simplified-specs-shape` | `error`, `path: 'specs.categories'`, `detail` contains "exactly one category"; also raised for a present `specs` with empty `categories`; specs present while `hasSpecs` is false is flagged at a `specs` path |
| `validateSimplifiedSpecsShapeHtml(html, templateId, label)` | error rule matching `/specs-shape/` for a second `<tbody>`, any `<h3>` in §7, a second table, or a full-width category title row (`<tr><td colspan="2"><b>…</b></td></tr>`) |
| `validateSimplifiedRangesDoc(doc, templateId, localeIso, label)`, `validateSimplifiedRangesHtml(html, templateId, locale, label)`, `validateSimplifiedTemplateHtml(html, templateId, locale, label)` | errors only, at the paragraph's Doc key as `path` (`hook`, `killerSpecs`/`keyBenefits`, `applications`, `compatibility`, `cta`); the ceiling produces NO issue of any severity |
| `renderDescription(doc, ctx, { flatSpecs })` | third optional argument; `flatSpecs` yields one `<tbody>`, no `<h3>`, no title, rows of all categories concatenated in order |
| `buildTranslatePrompt(text, label, context, templateId?)` | optional trailing `templateId` |
| `ProductInput.includeFunctionality?: boolean` | honoured only when `templateId === 'accessories'` |
| `content-template-labels.ts` | `TEMPLATE_LABEL_KEYS`, `TEMPLATE_LABELS.{en,uk}` with keys `templateFull`, `templateFilaments`, `templateAccessories`, `templateSpareParts`, `includeFunctionality` |
| `ContentTemplateSelectComponent` | inputs `value`, `labels`, `showFunctionalityToggle`, `functionalityChecked`; outputs `templateChange`, `functionalityChange`; option values `''`, then the three ids; never an empty "Select Template..." option |

## The prompt-clause convention (`test/fixtures/prompt-clauses.ts`)

A prompt is prose, so "the prompt requests §N" is read as: some clause names `§N` without a negation word; "requests no §N" as: every clause naming it carries one (`no`, `not`, `never`, `omit*`, `exclud*`, `without`, `skip*`, `absent`, `forbid*`, `must not`, `do not`, `drop`, `leave out`). Clauses are split on sentence ends, `;` and newlines. Scanned text is only the TEMPLATE-SPECIFIC part: the task block (`systemBlocks[1]`, Doc path) plus the `userContent` lines the builder ADDED relative to the same input built with no template. The master prompt (block 0) legitimately mentions all nine paragraphs and is never scanned.

Constraint for the builder: polarity is per clause, so a clause naming two § numbers gives both the same polarity. "Do not emit §6; cover packaging in §1" would read §1 as negated. Use ONE § number per clause when mixing polarity, or separate the clauses with `.` or `;`. Excluded paragraphs may be named, but only in a negated clause. Accessories' §3 is decided per run in `userContent` (the checkbox), so the fixed task block may name it conditionally.

## Golden guard (FR-6, AC-6, NFR-6)

`test/fixtures/golden/full-description-prompts.json` holds the bytes of 12 Full-description prompts (`buildPromptADoc` x3, `buildPromptA` x4, `buildTranslatePrompt` x2, `buildPromptC` x3) captured from the tree BEFORE any US-2.2 edit, via the inputs in `test/fixtures/full-description-inputs.ts`. `src/prompts/full-description.golden.spec.ts` compares byte for byte and asserts purity. It is green today and must stay green at every task. It must never be re-captured to make it pass: a legitimate byte change needs human approval (see finding F1 in the generation report).

## What each AC is proven by

See `docs/tests/US-2.2-ac-test-matrix.md`. Summary of the level chosen per AC: AC-1/AC-9 (component runner + parent wiring pins), AC-2 (label module spec), AC-3/4/5/8/9/12/14/15 (prompt-builder specs on both paths plus orchestrator routing), AC-6 (golden), AC-7 (renderer flat spec, shape validators, output-validator and orchestrator), AC-10 (schema, renderer, conformance matrix), AC-11 (schema spec, renderer combinatorics, walker specs), AC-13 (removal spec), AC-16 (range validators, both entry points, output-validator, orchestrator).

## R6 — FAQ artifact (human resolution)

Resolution: the FAQ artifact (Step 5) is data-driven, not template-driven. It runs for ANY template, simplified or Full, if and only if FAQ source materials (supplemental content) were provided; for every store language (and for uk-UA in UA-only mode); otherwise it is skipped. Tests placed where the plan/tasks place the wiring (T12, `content-orchestrator.simplified.spec.ts`, describe "R6 (human resolution)"): one "runs for every store language" and one "skipped without materials" case per template (Filaments, Accessories, Spare parts, Full), a whitespace-only-materials case, "the FAQ prompt is independent of the template", "the simplified description carries no FAQ", and two UA-only-mode cases. NO task changes FAQ artifact behaviour: the existing gate (`if (input.supplementalContent?.trim())`) already implements the resolution. The simplified-template R6 cases are red today only because the simplified fixtures cannot yet be rendered (T3), and go green with zero FAQ code changed.

## Deliberately not unit-tested (with why)

- **FR-24 meta fields** (`meta_title` <= 55, `meta_description` <= 155 ending in the CTA arrow, no currency): `task-b.ts` and the SEO rules are untouched by this Story and already covered by their existing specs (`task-b.spec.ts`, `output-validator.spec.ts`, `seo-currency-wiring.spec.ts`). The orchestrator specs here still run the real SEO gate with a valid stub, so a regression would surface, but no new assertion is written.
- **Live-model behaviour** (plan R4 retry loops under the soft ceiling, R5 legacy overlay strength, R7 stray excluded paragraphs): not verifiable statically; only the prompt text, validators and gate wiring are tested.
- **R8 coverage gap**: no accepted simplified-template artifact exists, so `test/render-conformance.simplified.spec.ts` is rules-based only. Byte-exact reconciliation (`test/render-reconciliation.spec.ts`) is unchanged and remains the proof for Full description; the corpus is still two items of the same product (`test/render-reconciliation.report.md` §5). No corpus item was added (the corpus is reserved for accepted production artifacts).
- **T2 (type field), T16 (comment), T17 (checksums)**: no behaviour, per the task breakdown. `npm run lint` / build, the two server specs and `bash arch-guard.sh` are their proof.
- **`AppComponent` behaviour**: the plan rejects an `AppComponent` spec (heavy DI). The dropdown behaviour is tested on the extracted component; what only the parent can guarantee is pinned in `src/app/app.component.template-wiring.spec.ts` as source-text pins. Known limitation: those pins couple to spelling (a `include*Functionality* = signal(false)` field, the `onTemplateChange` body resetting it, `...TEMPLATE_LABELS.en/.uk`, two usages of a `*content-template-select` element, one enabling the toggle with the word `accessories`). A behaviourally correct implementation that names things differently would fail them; the pins are the cheapest available proxy, and a failure there should be resolved by adjusting the pin with the reason recorded, not by weakening the requirement.
- **Category title row (FR-8)**: the plan's "title row" does not exist in the pre-flat renderer (it emits an `<!-- TITLE -->` comment plus an `<h3>`). The spec pins the shape a model could produce inside a single table (`<tr><td colspan="2"><b>Title</b></td></tr>`) and the `<h3>`/comment shape; recorded as finding F3.

## Fixtures

Reused: `test/fixtures/corpus/*` (schema, orchestrator and render regression guards), `test/fixtures/v4-docs.ts` (`v4ValidDoc`, `v3BaseDoc`). New, and why: `simplified-docs.ts` (the simplified shapes and the word-budget arithmetic the corpus cannot supply; documents are hand-authored, not sampled), `full-description-inputs.ts` + `golden/` (FR-6), `prompt-clauses.ts`, `removed-tokens.ts` (assembles the removed names at runtime so the removal search does not match itself), `test/removal.spec.ts`. `simplified-docs.ts` was added as a new file rather than editing `v4-docs.ts` so the accepted fixtures stay byte-stable; the breakdown (T3) names `v4-docs.ts` as the home, a harmless deviation.

## Collection rule

No spec renders a simplified document at module or describe scope (exception thrown there aborts collection and the file registers no tests). Rendering happens inside `it()`, through `lazy()` where shared.

## Runner boundaries

Only `content-template-select.component.spec.ts` is named `*.component.spec.ts`. Every other spec is deliberately not, including the wiring pins (they read source text and need no Angular compilation).

## Revision 3 - branch-coverage supplement

Two logic-runner specs were added beside the code (`src/render/render-description.branches.spec.ts`, `src/render/doc-schema-issues.branches.spec.ts`) to meet the `src/render/**` branch floor. They assert observable HTML / issue text for the FR-18 one-half-absent §2 shapes (both versions), the flat-§7 array value (FR-8), and the provider-error / schema-issue fallbacks. Reused fixtures: `test/fixtures/v4-docs.ts`. Dead branches (`render-description.ts:201`, `:277`) are intentionally not unit-tested because they cannot be reached through the public API.
