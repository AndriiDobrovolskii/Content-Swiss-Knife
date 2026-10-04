---
artifact: test_strategy
story: US-5.1
version: 6
status: ARCHIVED
owner: so-test-writer
created_at: 2026-10-03T02:00:00Z
updated_at: 2026-10-04T10:40:00Z
supersedes: docs/tests/US-5.1-test-strategy.md@v5
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 9
  - key: impact_analysis
    version: 3
  - key: implementation_plan
    version: 6
  - key: task_breakdown
    version: 8
  - key: plan_review
    version: 8
open_decisions_blocking: false
---

# Test Strategy - US-5.1: replace `[file-name.ext]` markers with the matching uploaded image

Track: angular (plus one server provider spec). Every test is written from the Story's AC-1..AC-6 and the
APPROVED Specification v9 (FR-1..FR-22, NFR-1..NFR-12, AC-9 (a)..(o)), with the human decisions recorded at the
plan gate (lead-in stays within the same section; plan outranks spec on OI-1/OI-2; AGENTS.md section 4 amended
to `max-content`; OpenAI vision cap 1000). v9 supersedes the v5-era strategy: the English `Image:` label,
`Product image: `, `View `, `altText` and `visionDescription` caption sources are gone; the figure texts are the
three native-Ukrainian Vision fields; the figure layout is `max-content`.

Ownership (task breakdown v8, section 0, B-4): TEST_WRITING is the single owner of every spec and fixture edit,
including the `fit-content` -> `max-content` pins, the caption and warning expectations, the shared fixtures,
the two corpus `.uk-UA.html` token substitutions and the prompt golden. The builder edits production code only,
plus two mechanical generated artefacts (the golden regenerated and checksums rebaselined in T11). No production
file, no frozen file, no ground-truth corpus input (`description_uk-UA.original.html` / `.corrected.html`), no
`.doc.json` / `.ctx.json`, `workflow-state.yaml` or `history.jsonl` was touched by this stage.

## 1. Runners and file naming

All new and reworked specs run in the **logic runner** (`npm run test:logic`, vitest + happy-dom). No component
spec is added or needed: no Angular component, template, signal or `OnPush` change is in scope (plan D9), and the
three app-level specs the plan names (`round-trip.spec.ts`, `app.component.template-wiring.spec.ts`,
`app.component.export-guard.spec.ts`) do not end in `.component.spec.ts`, so they live in the logic runner
(plan U-14). The one Angular service spec (`content-orchestrator.image-placeholder.spec.ts`) uses
`Injector.create` with `import '@angular/compiler'` first, as `content-orchestrator.ua-doc-pipeline.spec.ts`
documents; no TestBed. The provider spec is a plain `test/*.spec.ts` with a mocked `openai` SDK, like its
neighbours.

## 2. What is tested, at which level (by task)

| Task | Spec file | Level | What it proves (requirement) |
|---|---|---|---|
| T4 | `src/utils/vision-contract.spec.ts` (extended, tracked) | unit, pure parser | three optional trimmed fields; missing / blank / non-string dropped, never thrown; caption mandatory and 20-word throw kept with the `/exceeds \d+ words/` text; `visionResultToEntryPatch` (FR-21, NFR-3, NFR-12) |
| T5 | `src/prompts/vision-prepass.spec.ts` (new) | unit, prompt text + parser agreement | advertised JSON keys are exactly `caption, label, description, alt` and a reply carrying them round-trips through the parser and the patch helper; native-Ukrainian, not-translated, image-specific, uppercase, one-sentence, differ instructions; no store/locale parameter (FR-21, NFR-10) |
| T6 | (helper cases in `vision-contract.spec.ts`; existing `app.component.*` specs re-run) | unit | the entry patch mapping; no end-to-end spec of `analyzeGenImages` exists or is planned (plan review N-4) |
| T7 | `test/openai-provider.spec.ts` (extended, tracked) | provider unit, mocked SDK | `analyzeImage` allows `max_tokens: 1000` (NFR-12, U-16); request shape unchanged |
| T8 | `src/utils/image-figure-style.spec.ts` (new) | unit, three production surfaces | renderer, `wrapImageFigures`, TipTap `imageFigure` node defaults, `cleanHtmlStructure` all carry the `max-content` figure style, the img style and the left-aligned figcaption; video figures unchanged; surfaces agree with the shared constants (FR-14, FR-22, AC-9 g, l, n, o) |
| T8 | `src/render/render-description.spec.ts`, `render-description.hook-cta-extra.spec.ts`, `src/utils/image-figure.spec.ts`, `html-cleaner.spec.ts`, `round-trip.spec.ts`, corpus `.uk-UA.html` (x2), `test/render-reconciliation.spec.ts` | unit / fixture conformance | every pre-existing `fit-content` pin moved to `max-content` (same assertion shape, no weakening); the renderer is compared with the token-updated corpus by the existing reconciliation spec (AC-9 l, o) |
| T9 | `src/utils/image-placeholder.spec.ts` (rewritten) | unit, pure | grammar, matcher; the figure builder rule by rule (label trim / colon collapse / generic list / Cyrillic, description, alt, fallbacks, `Фото: `, escaping, `cyrillicCheck` off path, no English string, `altText` and `visionDescription` ignored); `figureCaptionWarnings` (FR-21, A-14, A-15, A-16, NFR-6, NFR-10, NFR-11) |
| T9 | `src/utils/image-placeholder-doc.spec.ts` (reworked) | unit, Doc step | hosting and non-hosting carriers, hook / CTA extras, same-section lead-in, split with balanced inline tags, duplicates, unmatched, idempotence, schema re-parse, seen set, rendered section 4 criteria, Ukrainian captions and warnings through the step (FR-1, FR-3..FR-6, FR-8..FR-11, FR-13..FR-16, FR-21, FR-22) |
| T9 | `src/utils/image-placeholder-html.spec.ts` (reworked) | unit, HTML step | the same matrix on the legacy path, relative `src`, JSON-LD / meta / attributes ignored, end-append primitive, exact FR-14 layout, caption warnings (FR-7, FR-10, FR-18 primitive, FR-21) |
| T9 | `src/utils/image-placeholder-validate.spec.ts` (reworked) | unit | pre-extraction, `dropped-image-placeholder` validator, both finalisers; the appended figure is the Ukrainian builder's and the FR-21 warnings are raised or carried (FR-17, FR-18, FR-21, NFR-9) |
| T10 | `src/services/content-orchestrator.image-placeholder.spec.ts` (reworked) | integration through real service + mocked LLM | Doc gate and legacy path wiring; ladder; exhaustion; warnings survive block repair; schema-invalid candidate; legacy best-attempt lookup; Expert-3DPrinter relative `src`; Consumables; no-marker unchanged; **numeric grounding case (a) on both pipelines**; FR-21 warnings in the QA report; old entry never fails generation (FR-7..FR-12, FR-17, FR-18, FR-21, NFR-8, NFR-9, NFR-12, AC-9 k) |
| T11 | `src/utils/image-figure-style.prompt-examples.spec.ts` (new, separate file) | unit, FROZEN text | the two master-prompt example `<figure style>` lines equal the FR-14 layout; the whole example block equals the pre-Story block except for that token; no `fit-content` left (FR-22 consequence 2, AC-9 l, m) |
| T11 | `src/prompts/task-a.spec.ts`, `task-a-doc.spec.ts` (tracked; marker cases from v5 kept, AC-9 k sentinel case added) | unit, prompt builders | `[IMAGE MARKERS]` block (COUNT and verbatim list only), byte-equal no-marker `userContent`, static `systemBlocks`, same-section wording, **sentinels planted in the three Ukrainian fields reach no `userContent` and no system block, and the prompts are byte-identical with or without the fields** (FR-19, NFR-5, AC-9 a-d, k) |
| T11 | `src/prompt-core/master-system-prompt.image-markers.spec.ts`, `src/prompts/task-a.import-cycle.spec.ts` (kept) | unit | the six FR-20 properties; the import-cycle load-smoke (FR-20, AC-9 e) |
| T11 | `src/prompts/full-description.golden.spec.ts` + `test/fixtures/golden/full-description-prompts.json` | golden | the golden now carries `max-content` and the FR-20 sentence; reviewed against `git show HEAD:` (section 5) |
| T1, T3 | `description-doc.hook-cta-extra.spec.ts`, `hook-cta-extra-validators.spec.ts` (kept; neutral `Мітка:` caption instead of `Image:`) | unit | carriers, `forEachBlockInOrder`, validators on a split hook / CTA (FR-6, NFR-8) |

## 3. Pinned contracts (names from the plan; shapes chosen here, recorded for the builder)

The plan and breakdown name these; they do not fix every shape. TEST_WRITING pinned the following and the specs
fail until the builder honours them. None invents behaviour: each is read off a Specification rule.

- `VisionResult`: optional trimmed `label`, `description`, `alt`. `visionResultToEntryPatch(result)` returns
  `{ visionLabelUk?, visionDescriptionUk?, visionAltUk? }` containing only the fields present (`{}` for a caption-only
  result). `ImageManifestEntry` gains the three optional `...Uk` fields (plan D1).
- `buildFigureParts(entry, { cyrillicCheck })` -> `{ file, alt, captionText }` (`captionText` is the whole
  `Figure.caption`, `<b>label</b> description`, HTML-escaped). `cyrillicCheck: false` replaces the Cyrillic test by the
  non-empty test (A-15).
- `figureCaptionWarnings(figures)` takes the `buildFigureParts` results in document order and returns
  `{ severity: 'warning', rule, detail }[]` for `image-caption-not-native` (once per file) and
  `image-caption-duplicate-label` (each later figure; fallback label exempt). Detail is Ukrainian and names the file.
- `applyImagePlaceholdersDoc(doc, manifest, opts?)` and `applyImagePlaceholdersHtml(html, manifest, imageBase,
  folders, opts?)` take `opts = { cyrillicCheck? }` (default on; today always on). Their `report.warnings` carry the
  FR-21 warnings in addition to the unmatched / not-placed ones. The names and signatures of
  `preExtractPlaceholders`, `validateDroppedPlaceholders`, `finalizeDroppedPlaceholdersDoc`,
  `finalizeDroppedPlaceholdersHtml` are unchanged.
- `src/utils/image-figure-style.ts` exports `IMAGE_FIGURE_STYLE`, `IMAGE_IMG_STYLE`, `IMAGE_FIGCAPTION_STYLE` (plan D6).
- `IMAGE_CAPTION_LABEL` is no longer exported by `image-placeholder.ts` (plan D4 item 4).

## 4. Fixtures

- `test/fixtures/image-placeholder/fixtures.ts` (TEST_WRITING-owned): `entry()` now carries the three Ukrainian
  fields; the legacy English `visionDescription` and `altText` stay as deliberately different English sentinels so a
  builder that still reads them is caught (A-16). New: `legacyEntry()` (a pre-Story entry with no Ukrainian fields),
  `FALLBACK_LABEL`, `LAMP_*_UK`, `hasCyrillic()` (an independent Cyrillic proxy, so the check is not asserted against
  the production helper). The base document is still `v3BaseDoc()`, reused.
- `test/fixtures/corpus/*.uk-UA.html` (2 files): 14 `width: fit-content;` -> `width: max-content;` each, nothing else
  (proof in section 5). `.doc.json` / `.ctx.json` untouched. Reused by `render-reconciliation` and `render-conformance*`.
- `test/fixtures/golden/full-description-prompts.json` and its header in `full-description-inputs.ts`: updated to name
  both approved exceptions (section 5).
- No new corpus triple was needed. Known gap (carried): the corpus is two items of one product across two stores, and
  neither carries a marker, so marker behaviour is covered by the hand-authored fixtures above, not by the corpus.

## 5. Mechanical evidence the specs rely on

- Corpus: `git diff --stat -- test/fixtures/corpus` shows exactly the two `.uk-UA.html` files, 14 lines each; every
  changed line differs from its original only by the width token. `src/utils/__fixtures__/description_uk-UA.*.html`
  (the ground-truth inputs, 15 `fit-content` each, plan U-15) are not touched.
- Golden: a scratchpad script (not committed) compared the working golden with `git show HEAD:`: 12 keys in both, in
  the same order; exactly 10 entries differ (`doc/*`, `html/*`, `c/*`); in each, `userContent` and every system block
  other than block 0 are equal, and block 0 equals the HEAD text with exactly one pure insertion (the 242-character
  FR-20 sentence, none removed) plus exactly two `fit-content` -> `max-content` substitutions; the two `translate/*`
  entries are byte-identical. The builder's regenerated golden must equal this file byte for byte (T11).

## 6. Deliberately not unit-tested (with why)

- **Model compliance** with FR-19 / FR-20 and the quality of the Vision Ukrainian (image-specific label, one sentence,
  idiomatic text): non-deterministic. AC-9 proves the instruction is delivered, not obeyed; the human live re-runs of
  `expert3d_agibot_d1_ultra_2026-10-03_1217` and `..._1922` are the only evidence (Spec "What this Specification cannot
  guarantee"). The Vision prompt spec asserts the instruction text and the contract agreement only.
- **AC-9 (f), (o), the diff-against-HEAD footprints** (`task-a.ts` 17/1, `master-system-prompt.ts` +5/-2, only two
  checksum rows, `task-b.ts` / `task-c.ts` / `output-validator.ts` untouched, no `fit-content` survivors): mechanical
  repository checks owned by T11 and T13 (plan section 4). A unit test that shells out to `git` would depend on the
  repository state at run time and rot after merge. What is unit-testable about the frozen master text (the example
  block content) is pinned in `image-figure-style.prompt-examples.spec.ts`.
- **`analyzeGenImages` end to end** (T6): no existing seam; the pure helper is the unit-level proof (plan review N-4).
- **AGENTS.md section 4 text (T12)** and **component display of the Ukrainian warnings**: no behaviour change / no
  component change; `validationIssues()` is an existing, unchanged rendering path.
- **OI-8** (a whole-call Vision failure shows a misleading unmatched warning), **OI-6** (operator `altText` edits are
  inert for marker figures): spec-literal, out of scope, no assertion.
- **Duplicate-label check inside a post-gate finaliser against labels of the attempt's report** (plan D4 item 4): the
  plan says the report carries the ordered labels but fixes neither the field name nor how a finaliser with an
  unchanged signature receives them. Not pinned; reported as a plan finding (see the generation report). The
  finalisers' own not-native warning and Ukrainian figure are asserted.

## 7. Determinism

No `sleep`, no retry-until-pass, no unseeded randomness, no network, no wall clock. The only dynamic import is the
shared style module in `image-figure-style.spec.ts` (through a variable specifier so that the other cases in the file
stay observable while the module is absent). The LLM is a `vi.fn()` stub returning fixed documents; the sentinel
strings are literals.

## v6 change note

Loop-back (TEST_WRITING attempt 2, `changes_required_tests`): two spec defects fixed, no change to
levels, runners or AC-to-test mapping. `image-figure-style.spec.ts` now awaits `loadStyleModule()` in
the two "agreement between the surfaces" cases; `image-placeholder-doc.spec.ts` builds
`SAME_LABEL_KETTLE` from `KETTLE` with only the label overridden. Stage-map expectation: TEST_WRITING
tests normally fail pre-implementation; here they are expected green because production already exists
(loop-back). Verified: the two files 88/88 pass, `npm run test:logic` 4506 passed / 3 skipped, lint clean.
