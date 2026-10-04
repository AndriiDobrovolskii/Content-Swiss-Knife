---
artifact: impact_analysis
story: US-5.1
version: 3
status: ARCHIVED
owner: so-impact-analyzer
created_at: 2026-10-02T19:00:00Z
updated_at: 2026-10-04T01:00:00Z
supersedes: docs/impact-analysis/US-5.1-impact-analysis.md@v2
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 9
  - key: open_decisions
    version: 6
---

# Impact analysis: US-5.1 (replace `[file-name.ext]` markers with the matching uploaded image)

v3 is a full regeneration against Specification v9 (APPROVED) and Open Decisions v6. It supersedes v2
(built from spec v5 / log v3) entirely; nothing from v2 is carried over unverified. Everything below was
re-derived from the repository on branch `docs/US-4.1-archive`, HEAD `ef08509`, working tree with the
US-5.1 implementation of spec v5 in progress (uncommitted). The code state quoted is the working tree.

What v9 adds to the blast radius relative to v2 (the reason this file was stale):

1. **FR-21 / OD-25 = A**: the Vision pre-pass and the manifest entry gain a Ukrainian label, description and
   alt. This reaches `vision-prepass.ts`, `vision-contract.ts`, `types.ts`, `app.component.ts` (none FROZEN).
2. **FR-4 / A-14 / A-15 / A-16**: the built English strings (`Image:`, `Product image: `, `View `) must go;
   Ukrainian fallbacks, new warning rules (`image-caption-not-native`, `image-caption-duplicate-label`).
3. **FR-22 / H-8 (OD-26, OD-27 reversed)**: `max-content` and `figcaption text-align: left` on **all
   non-video figures**. `fit-content` is hardcoded in **five production files** and pinned in about twenty
   test and fixture files (section 1, 4).
4. **H-8 section 9 authorisation** for the two example-figure lines of the FROZEN
   `master-system-prompt.ts`, and the **AGENTS.md section 4 amendment** (text update pending human
   confirmation at the spec gate).
5. A-17 (testable scope of FR-22), AC-9 (l)(m)(n)(o), the editor round trip (FR-22 consequence 3).

## 0. FROZEN files (AGENTS.md section 9) — stated loudly

| File | State under spec v9 | Evidence |
|---|---|---|
| `src/prompts/task-a.ts` | **MAY be edited**, additive only (FR-19), approval 2026-10-03T09:25:44Z / 09:28:48Z. Already edited in the working tree (`git diff`: +18 lines). | `git diff --stat` |
| `src/prompt-core/master-system-prompt.ts` | **MAY be edited** in exactly two ways: (i) the FR-20 sentence (already in the working tree, +3 lines at lines 397-399, under the 09:25/09:28 approval), (ii) **the two example `<figure style="...fit-content...">` lines only, identified by content** (today lines 403 and 408 in the working tree), under the separate H-8 approval of event 2026-10-03T18:20:00Z. **Edit (ii) is NOT yet done**: both lines still say `fit-content`. | `grep fit-content` hits lines 403 and 408; `git diff` shows only the 3-line FR-20 addition |
| `src/prompts/task-b.ts`, `src/prompts/task-c.ts`, `src/utils/output-validator.ts` | **NOT approved, unmodified** (absent from `git status`). Any task touching them is a section 9 stop. `output-validator.ts` contains no `fit-content` literal (grep), so FR-22 does not force an edit there. | `git status`, grep |
| `.arch-guard-checksums` | Already modified (2 rows). It will change again after the H-8 example-line edit: `bash arch-guard.sh --rebaseline` only after confirming only the two approved files differ. | `git status` (`M .arch-guard-checksums`) |
| `AGENTS.md` (not on the FROZEN list) | Section 4, second image bullet, line 214 still states `fit-content`. Updating it to `max-content` is a **proposed planner task, not yet authorised**; the human must confirm at the spec gate. If declined, the amendment lives in the spec alone and AGENTS.md and the implementation disagree. | `AGENTS.md:214` |

`task-a-doc.ts` inherits the FR-19 block through `buildPromptA` (no edit). Importers of
`MASTER_SYSTEM_PROMPT`, re-derived by grep earlier in this Story and unchanged: `task-a.ts`, `task-c.ts`,
`optimizer.ts`. The example-figure edit therefore reaches Task A, Task C and the optimizer prompt, and is a
second one-time prompt-cache invalidation (the FR-20 edit was the first).

## 1. Affected files

### 1.1 Must change or be created (production code)

Already built or edited in the working tree for spec v5 and **re-opened by v9** are marked *(rework)*.

| File | Why (evidence) |
|---|---|
| `src/utils/image-placeholder.ts` *(rework)* | Holds `IMAGE_CAPTION_LABEL = 'Image:'` (line 32) and the figure-part builder (lines 94-108) that uses `Product image: ${name}`, `altText` and the `View ` prefix. FR-4/FR-21/A-14/A-16 replace all three: label/description/alt from the manifest Ukrainian fields, Cyrillic-presence rules, generic-label list, trailing-colon collapse, `Зображення товару:` fallback, `Фото: ` prefix, `altText` no longer read. New warning rules `image-caption-not-native` and `image-caption-duplicate-label`. |
| `src/utils/image-placeholder-doc.ts`, `src/utils/image-placeholder-html.ts` *(rework)* | Consume the figure-part builder; the HTML variant calls `wrapImageFigures`. Must emit the FR-14 figure style (`max-content`), first image with no `loading` attribute, `figcaption style="text-align: left;"`, and pass the duplicate-label bookkeeping (document order across the whole description). |
| `src/utils/image-placeholder-validate.ts` | `dropped-image-placeholder` (FR-17/FR-18). Behaviour unchanged by v9; re-verify only. |
| `src/render/render-description.ts` *(rework)* | `FIGURE_STYLE` line 51 is `fit-content` and is the single style applied to every Doc figure (line 137, caption at 139). Must become `max-content` (FR-22 consequence 1, AC-9 l). Video figure constants (lines 56, 61) must stay untouched (FR-15, FR-22 item 5). |
| `src/utils/image-figure.ts` | `FIGURE_STYLE` line 19 is `fit-content`. This is `wrapImageFigures`, the standard-fallback / legacy-path normaliser, also run by `cleanHtmlStructure` (html-cleaner.ts line 3). It rewrites the figure style of **every** `<img>` figure in legacy HTML, including model-emitted ones. Must change to `max-content` (FR-8 fallback, FR-22). **Observation, not a design:** because it re-asserts the style on model-emitted HTML too, the legacy-path residual that A-17 declares untestable is in practice reached by this function; whether A-17's "no deterministic rewrite" claim stays true is a planner/spec-owner point (see U-13). |
| `src/app/components/html-editor/extensions/image-figure-node.ts` | `FIGURE_STYLE` line 17 is `fit-content` and is the TipTap node attribute default (line 75). Operator editing must not undo the layout (FR-22 consequence 3, AC-9 n). Defaults apply to newly inserted figures; parsed figures carry their own style, so whether a round trip preserves `max-content` is only verifiable by test. |
| `src/prompt-core/master-system-prompt.ts` (FROZEN, H-8 edit) | The two example figure lines (section 0). |
| `src/prompts/vision-prepass.ts` | Currently demands one English caption of at most 20 words (line 39: `"caption": "string (<= 20 words, English...)"`, lines 59-60 hard limit), whose text "becomes the ALT TEXT and figure caption". Must be extended to return a native Ukrainian label, description and alt (FR-21, NFR-10: native, not translated). It takes no store or locale parameter (signature line 23: `productName`, `specsExcerpt`), which matters for A-15 (U-12). Not FROZEN. |
| `src/utils/vision-contract.ts` | `VisionResult` is `{ caption }` only; `parseVisionResult` enforces a 20-word ceiling and ignores extra fields. Must carry label, description, alt and tolerate their absence (NFR-12). The 20-word ceiling's relation to the new fields is a design point. |
| `src/app/types.ts` | `ImageManifestEntry` (lines 26-35) has `visionDescription`, `altText`; no label/alt-uk fields. New optional fields needed (entries created before the Story must stay valid, NFR-8, FR-21 failure path). |
| `src/app/app.component.ts` | `analyzeGenImages` (lines 1231-1295) is the only producer of Vision results into `genImgManifest`; it sets `visionDescription: result.caption` and `altText: e.altText \|\| result.caption`, retries once on the 20-word overflow (lines 1256-1269) and on failure writes the filename-derived fallback and `status: 'error'` (lines 1286-1289). Must store the three new texts. Note the error branch: an `error` entry never matches a marker (FR-2), so a Vision failure silently turns a marker into an unmatched-warning. `buildGeneratorInput` (lines 890-901) passes the manifest through. Also `app.component.html` line 375 (operator-editable `altText`): per A-16 the recorded Ukrainian alt replaces it for marker images, so the editable field no longer affects them; whether the UI needs a hint is not specified. |
| `src/services/content-orchestrator.service.ts` *(rework)* | Marker wiring already present (lines 427, 573-575, 772-775, 1254-1256). Reworks needed where the step builds figures for the master, passes warnings (FR-21 rules) and runs idempotently across repair attempts. |
| `src/domain/description-doc*.ts`, `src/render/doc-prose-transforms.ts`, `src/utils/{sentence-length,simplified-word-ranges,tov-second-person}.ts` | Hook/CTA carrier extension, built under spec v5; v9 does not change it. Re-verify only. |
| `AGENTS.md` | Section 4 text update, **conditional** on human confirmation (section 0). |

### 1.2 Needs re-verification even if unchanged

| File | Why |
|---|---|
| `src/utils/output-validator.ts` (FROZEN, unedited) | Legacy HTML validation runs over the substituted figures (figure/figcaption/lead-in/alt-vs-figcaption rules). Ukrainian label/description change what those rules see. No `fit-content` literal. |
| `src/utils/alt-numeric-fidelity.ts` | Reads `figures[].alt/caption` against source numbers; now sees Ukrainian Vision text. |
| `src/utils/image-manifest-coverage.ts`, `structural-parity.ts`, `repair-gate.ts`, `repair-strategy.ts` | Unchanged by v9; v2 reasoning stands (figure refs in hook/CTA, parity of split paragraphs, FR-18 downgrade after exhaustion). Spot re-run only. |
| `src/prompts/task-c.ts` (FROZEN), `task-translate.ts` | Task C and the Doc translation path carry the master figure to other locales. For the Doc path the translated artifact is re-rendered by `render-description.ts`, so the new style reaches translations by the renderer fix. For the legacy path Task C is told to preserve `<figure>` blocks byte-identical, so the figure style comes from the master (and the master's `max-content` must therefore be right at the source). |
| `src/utils/html-cleaner.ts` | Delegates to `wrapImageFigures` (line 293 comment, line 3 import); has its own `<img>` and iframe styles (lines 207, 265). Covered by AC-9 n. |
| `src/services/llm.service.ts`, `server/index.js`, `server/providers/{anthropic,gemini,openai}.js` | `analyzeImage` path. The Vision prompt is assembled client-side and only proxied; the Anthropic provider caps vision `max_tokens` at 1000 (thinking off) or 8000 (line 165) and fails loud on truncation (lines 182-185). Three Ukrainian texts raise output size versus one 20-word caption; no server edit is implied but the provider behaviour must be checked per provider (NFR-12, AGENTS.md section 3 Rule 1). |
| `src/app/app.component.html` (lines 1238-1262) | Renders `validationIssues()` and error/warning counts; the new Ukrainian warnings display through existing markup. |

### 1.3 Tests that cover or will need to cover them

**Logic runner (`npm run test:logic`, vitest):**

- Pinning `fit-content` and therefore **must be updated** to the new layout (AC-9 o). Re-derived by
  `grep -rn fit-content src test AGENTS.md`: `src/render/render-description.spec.ts` (lines 171, 178, 200),
  `src/render/render-description.hook-cta-extra.spec.ts` (line 20), `src/utils/image-figure.spec.ts` (lines 28,
  40), `src/utils/html-cleaner.spec.ts` (line 190), `src/utils/image-placeholder-doc.spec.ts` (line 466),
  `src/utils/image-placeholder-html.spec.ts` (line 27), `src/prompt-core/` golden (below).
- Specs that pin the English strings or the `Image:` label (must change; grep for `Product image`, `View `,
  `IMAGE_CAPTION_LABEL`): `src/utils/image-placeholder.spec.ts`, `image-placeholder-doc.spec.ts`,
  `image-placeholder-html.spec.ts`, `src/services/content-orchestrator.image-placeholder.spec.ts`,
  `test/fixtures/image-placeholder/fixtures.ts`. The English-string assertions are inverted by FR-4 (no English
  string may appear); this is a rewrite of expectations required by a human decision, not a weakening.
- `src/utils/vision-contract.spec.ts` (new fields, tolerant parse, 20-word rule).
- `src/utils/alt-numeric-fidelity.spec.ts` (imports vision-prepass).
- Master prompt and prompt specs: `src/prompt-core/master-system-prompt.image-markers.spec.ts`,
  `master-system-prompt.spec.ts`, `master-system-prompt.v4.spec.ts`, `constants.spec.ts`,
  `src/prompts/{task-a,task-a-doc,task-c,optimizer,task-a.import-cycle}.spec.ts`,
  `src/prompts/full-description.golden.spec.ts`. AC-9 (m) needs a diff-against-HEAD check by content.
- Existing figure-adjacent specs from v2 section 1.3 (structural-parity, repair-gate, doc-gate, ua-doc-pipeline,
  render-conformance, render-reconciliation) re-run unchanged.

**Component runner (`npm run test:components`, `ng test`):** `src/app/components/html-editor/extensions/round-trip.spec.ts`
(lines 63 and 66 pin `fit-content` and the round-trip AC-9 n). **Correction to v2:** the component runner is
**not untouched** by this Story. `*.component.spec.ts` runs there; whether `round-trip.spec.ts` (not named
`*.component.spec.ts`) lands in the logic runner or the component runner is determined by
`vitest.config.ts`/`angular.json`, which this survey did not open (U-14). Either way an existing spec of
the editor extension must be edited. `src/app/app.component.template-wiring.spec.ts` and
`app.component.export-guard.spec.ts` reference vision-prepass and are re-verification candidates if
`app.component.ts` changes.

New tests (marker, Ukrainian rules, FR-21 failure paths, AC-9 g-o) land in the **logic runner**.

## 2. Hazard table

| # | Hazard | Applies? | Evidence |
|---|---|---|---|
| 1 | `STORE_REGISTRY` fan-out | **Applies, read-only; no registry edit is specified.** | Re-derived by `grep -l "STORE_REGISTRY\|getLangsForStore" src` (non-spec): `src/app/app.component.ts`, `src/prompt-core/{constants,doc-pipeline-flag,store-render-rules}.ts`, `src/prompts/task-slug.ts`, `src/render/render-description.ts`, `src/services/content-orchestrator.service.ts`, `src/utils/{language-consistency,output-validator,table-finalize}.ts`. The Story reads `imageBaseUrl` and `languages` for src formation and the master-locale choice (A-13, A-15). Stores without `uk-UA` (default custom store `['en-GB']`, empty `imageBaseUrl`) are unreachable per A-3. Expert-3DPrinter has empty `imageBaseUrl` and takes the legacy path. New with v9: **A-15 makes the master locale of a non-uk-UA store matter for FR-21**, but the Vision prompt has no store parameter (U-12). |
| 2 | uk-UA is the master | **Applies directly.** | The step and the Vision-derived texts are resolved once in the uk-UA master; Task C / the Doc translation carry label, description, alt and style to every other locale. A defect in the master Ukrainian text (wrong label, English leak, bad `alt`) reaches the whole catalogue. NFR-10: native generation, not translated. FR-22's renderer change reaches every store and every locale immediately (all Doc stores re-render with `max-content`), including figures that no marker touched. Task C is not modified. |
| 3 | Prompt -> schema -> renderer -> validator chain | **All four links, plus a fifth input stage (Vision).** | Prompt: FR-19 block, FR-20 sentence, H-8 example-line edit (`task-a.ts`, `master-system-prompt.ts`); Vision prompt (`vision-prepass.ts`) is new. Schema: hook/CTA carrier extension (built) and the manifest entry type. Renderer: `render-description.ts` `FIGURE_STYLE`. Validator: `output-validator.ts` unedited (FROZEN) but sees new figure text; sibling validators `image-placeholder-validate.ts`, `image-manifest-coverage.ts`. The AGENTS.md section 4 criteria no longer match the renderer until AGENTS.md line 214 is updated (section 0). |
| 4 | FROZEN files (section 9) | **Applies, loudly.** | Section 0: two approved files (`task-a.ts` additive, `master-system-prompt.ts` FR-20 sentence + two example lines by content); `task-b.ts`, `task-c.ts`, `output-validator.ts` not approved and unmodified. The H-8 example-line edit is still to do. |
| 5 | Corpus conformance harness | **Applies and the corpus lacks needed coverage; the corpus WILL move.** | `test/fixtures/corpus/` holds two triples (Ortur H20 20 W on Center 3D Print and EXPERT3D; `test/render-reconciliation.report.md` section 5 item 2 records "2 items, not 6, same product"). v2 claimed these stay byte-identical. **That is now false:** `center-3d-print-ortur-h20-20w.uk-UA.html` and `expert3d-ortur-h20-20w.uk-UA.html` contain 14 `fit-content` figure styles each (`grep -c`), and FR-22 changes the renderer for every figure. Both `.uk-UA.html` files are consumed by `test/render-reconciliation.spec.ts` and `render-conformance*.spec.ts` and must be regenerated as a reviewed diff limited to the figure style (and any figcaption style) cells, never a blind overwrite. `.ctx.json`/`.doc.json` should not change. Missing coverage (unchanged): marker in each carrier, unmatched/dropped marker, `.webp`, Ukrainian label/alt from the manifest, fallback strings, non-Doc store. Both corpus items are Doc stores, so the legacy path has no corpus coverage. |
| 6 | Two test runners | **Applies, and is wider than v2 said.** | See 1.3: new tests in the logic runner; the editor round-trip spec (`round-trip.spec.ts`) needs an edit and may sit in the component runner (U-14). |
| 7 | Server-side surfaces | **Checked: no `server/**` edit is implied, but the Vision route is reached.** | `server/providers/*.js` `analyzeImage` is used unchanged; the prompt and parsing are client-side. Provider limits for a three-field Ukrainian response (Anthropic vision `max_tokens` 1000/8000, truncation fails loud) are a risk, not an edit. No `server/` spec covers vision directly (`test/llm-routes.spec.ts`, `anthropic-provider.spec.ts`, `gemini-provider.spec.ts`, `openai-provider.spec.ts` are the nearest and are at risk only if a provider changes). `server/usage/store.js` migration limitation not reached. |

## 3. Silent-failure risks (break without erroring)

Carried forward from v2 (still valid): model rewrites the marker; normalisation passes altering a marker;
hook/CTA figure refs not counted by the ref check and coverage; first-eager ordering drift; idempotence loss
across repair attempts; FR-18 downgrade missed; translation structural-parity churn; case/extension mismatch;
unrelated bracket text. New or changed by v9:

1. **Vision returns nothing usable, so the figure silently degrades.** An entry with a missing or non-Cyrillic
   label/description/alt takes the `Зображення товару:` fallback and the file name as description, with **no
   warning** when the field is merely empty (FR-21 failure path). A whole upload of images created before this
   Story, or a provider that ignores the new fields, produces a valid but generic description. Only the
   non-Cyrillic case warns.
2. **Cyrillic-presence is a proxy.** Text with one Cyrillic letter and otherwise English passes; the spec
   states this. A model that answers in Russian also passes. Only the human-verified live re-run catches it.
3. **A-15 for non-uk-UA stores.** The Cyrillic test is replaced by "non-empty" for other master locales, but the
   Vision prompt is store-agnostic (U-12), so such a store may get Ukrainian label/alt text while its master is
   a different language, with no error.
4. **A-16 discards operator edits.** `app.component.html` line 375 lets the operator edit `altText`; for
   marker figures the recorded Ukrainian alt completely replaces it, so an operator's edit has no effect on
   those figures and nothing tells them.
5. **Style pins that stay green for the wrong reason.** `fit-content` is hardcoded in five production files
   (`render-description.ts`, `image-figure.ts`, `image-figure-node.ts`, master prompt x2). Fixing one and
   missing another yields mixed layouts, and each spec only pins its own constant. The editor default
   (`image-figure-node.ts`) is invisible to every generation test: it only shows when an operator inserts a
   figure by hand.
6. **Model-emitted figure on the legacy path.** The two prompt example lines are the only lever, but
   `wrapImageFigures` re-asserts the style afterwards, so the real outcome depends on whether that function
   runs on the path (U-13); the spec says no deterministic test can fail it.
7. **Golden and corpus regeneration blessing drift.** Two reviewed regenerations are now needed (prompt golden:
   `systemBlocks[0]` of 10 of 12 cases, second change after FR-20; corpus HTML: figure/figcaption style). A
   blind regenerate would also bless an accidental `userContent`, Task B or text change.
8. **AGENTS.md vs implementation disagreement.** If the human declines the AGENTS.md text update, section 4
   (the repository authority) says `fit-content` while the code and spec say `max-content`; a later agent
   following AGENTS.md alone would revert the layout.
9. **Second prompt-cache invalidation** (Task A, Task C, optimizer) from the example-line edit; cost, not error.
10. **Prompt-length growth in `userContent`** is unchanged from v2 and not determined to matter.

## 4. Fixture and corpus impact

| Fixture | Moves? | Evidence / handling |
|---|---|---|
| `test/fixtures/golden/full-description-prompts.json` | **Yes, a second time**, in `systemBlocks[0]` of the 10 cases embedding the master text; 10 lines contain `fit-content` (`grep -c`). The 2 `translate/*` cases (Task B) must stay byte-identical, `userContent` unchanged. | Reviewed diff only. The `full-description-inputs.ts` header ("do not regenerate after implementation starts") is deliberately overridden twice. |
| `test/fixtures/corpus/*.uk-UA.html` (2 files, 14 figures each) | **Yes** (figure style; also figcaption if its style changes). | Contradicts v2 section 4. Regenerate as a reviewed diff. `.doc.json` / `.ctx.json` expected unchanged. |
| `src/utils/__fixtures__/description_uk-UA.original.html` / `.corrected.html` (15 `fit-content` each) | **Unknown**: depends on whether a spec asserts them against `wrapImageFigures` output. The files are pinned legacy HTML samples; a spec comparing normaliser output with them would fail after `image-figure.ts` changes. | U-15. |
| `test/fixtures/image-placeholder/fixtures.ts`, `test/fixtures/full-description-inputs.ts` (modified) | Yes: manifest entries need the new Ukrainian fields and English-string expectations change. | Working tree. |
| `test/fixtures/simplified-docs.ts`, `v4-docs.ts` | No change expected (schema extension is optional). | NFR-8 |

Coverage the Story needs and the corpus does not have: see hazard 5. Cited gap:
`test/render-reconciliation.report.md` section 5 item 2.

## 5. Blast-radius summary

Spec v9 widens the Story from "a deterministic marker step plus a prompt instruction" into three
separate changes that share one feature name: (a) the marker step (built under v5, now reworked for Ukrainian
text and new warnings), (b) a **new upstream Vision stage** that must return native Ukrainian label,
description and alt into an extended manifest entry (`vision-prepass.ts`, `vision-contract.ts`,
`types.ts`, `app.component.ts`), and (c) a **catalogue-wide figure-layout change** (FR-22) that is independent
of markers: `max-content` and `figcaption text-align: left` are hardcoded in `render-description.ts`,
`image-figure.ts`, the TipTap `image-figure-node.ts` and two FROZEN prompt lines, so every Doc store and every
locale re-renders, both corpus HTML files and the prompt golden move, and about ten existing specs that pin
`fit-content` or the English strings must be rewritten as human-mandated changes. Two FROZEN files take
approved edits (one of them, the example lines, is still pending); three stay untouched. AGENTS.md section 4
disagrees with the delivered behaviour until the human confirms the proposed text update. No `server/**`
file changes, but the Vision route is exercised per provider. The riskiest silent failures are Vision
returning nothing usable (generic fallback with no warning), a missed `fit-content` constant, and the blind
regeneration of golden and corpus fixtures.

## 6. Unknowns (not determinable from the approved inputs) and what would settle each

Carried from v2 and still open: U-3 (what "no processed occurrence" means for a mangled marker), U-4 (where the
pre-extracted set lives), U-5 (schema-version scope of the carrier extension; `render-consumables.ts` does not
exist, consumables share `renderDescription`), U-6 (section boundary for Doc carriers), U-7 (FR-18 relocation
versus a model-placed figure). Closed since v2: U-1 (Expert-3DPrinter, resolved by A-3/`markerManifest`), U-2 and
the label question (superseded by FR-21), U-8 (circular import covered by `task-a.import-cycle.spec.ts`), U-9
(line format not fixed by spec), U-10 (planning, done in the existing plan).

New:

- **U-11. Q-D versus v2's binding note.** v2 recorded a human binding rule that a lead-in must not cross a
  section boundary. Spec v9 Q-D and FR-19 still read "even across a section boundary" (spec lines ~897-899,
  ~563-565). The two disagree and v9 still carries the wording v2 called an error. Settle: spec owner states
  which reading governs; planner and test-writer must not derive a cross-section test until then.
- **U-12. Vision has no store or locale input.** `buildVisionPrepassPrompt(productName, specsExcerpt)` and the
  upload-time call do not know the store, so "the store's master language" (FR-21, A-15) cannot be honoured for
  a store without `uk-UA`. Settle: planner decision (always Ukrainian, as A-15's "stay Ukrainian" fallbacks
  imply, versus passing the master locale).
- **U-13. Does the legacy-path figure style get a deterministic rewrite?** A-17 says no deterministic rewrite of
  model-emitted HTML is required, but `wrapImageFigures` already rewrites every figure style on the legacy
  path when it runs. Not determined here whether it runs after the model output in every legacy flow
  (`produceTaskAArtifact` calls it, orchestrator line ~370). Settle: planner reads that path; spec owner decides
  whether A-17 should be tightened.
- **U-14. Runner for `round-trip.spec.ts`.** The config files were not opened. Settle: read
  `vitest.config.ts` exclude patterns and `angular.json`.
- **U-15. Whether `src/utils/__fixtures__/description_uk-UA.*.html` are asserted against normaliser output.**
  Settle: grep their consumers in TEST_WRITING.
- **U-16. Vision output budget per provider.** Three Ukrainian texts versus one 20-word English caption: whether
  the 20-word contract, the retry-on-overflow path and each provider's vision `max_tokens` still hold. Settle:
  planner defines the contract; a live Vision run per provider.
- **U-17. Whether `app.component.html` should signal that `altText` no longer affects marker figures (A-16).**
  Not specified; outside the survey.
- **U-18. Pending human confirmations affecting scope:** AGENTS.md section 4 text update, A-17, FR-22
  consequence 3 (AC-9 n), FR-11. Until confirmed, tasks for them are conditional.
