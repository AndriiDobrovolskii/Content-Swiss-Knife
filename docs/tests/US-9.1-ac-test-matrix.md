---
artifact: ac_test_matrix
story: US-9.1
version: 1
status: DRAFT
owner: so-test-writer
created_at: 2026-10-18T15:12:00Z
updated_at: 2026-10-18T15:12:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: impact_analysis
    version: 4
  - key: implementation_plan
    version: 4
  - key: task_breakdown
    version: 3
  - key: plan_review
    version: 3
  - key: test_strategy
    version: 1
open_decisions_blocking: false
---

# AC <-> Test Matrix - US-9.1

Ids are the Story's `AC-n` (Story v4). Every file named below exists in the repository now (paths relative to the repository root; `src/...` specs run in
`npm run test:logic`, the one `*.component.spec.ts` in `npm run test:components`). States are as OBSERVED on 2026-10-18 at HEAD `6546db8`, before any
implementation:

- `RED` = fails now by assertion, for the reason recorded in the generation report; `RED (load)` = the spec cannot load until the owner task creates the
  module (breakdown constraint 1); `RED (script)` = the spawned script does not exist yet.
- `guard` = green now by design; pins behaviour that must survive the Story (the red tests of the same AC are listed beside it).
- `DEFERRED (Hn)` = deliberately NOT written because the task that owns it depends on the still-unanswered human question `Hn`; nothing was chosen or
  defaulted. `GAP` = an acceptance criterion (or part of one) that has no test at all today, with the reason.
- `Owner` = the breakdown task whose commit turns the row green. Frozen-file tasks (T21..T32) additionally need the per-file "modify" instruction (H-OD12).

Abbreviations: `golden-A` = `src/prompts/task-a.user-content.golden.spec.ts`; `d15` = `src/prompts/payload-oracle.d15.spec.ts`; `bytes` =
`src/prompts/task-c.description-bytes.spec.ts`; `c-reach` = `src/prompts/task-c.master-reach.spec.ts`; `o-reach` = `src/prompts/optimizer.master-reach.spec.ts`;
`gold-us91` = `src/prompts/full-description.golden.us91.spec.ts`; `deixis` = `src/utils/image-deixis.spec.ts`; `app-notes` = `src/app/app.component.operator-notes.spec.ts`.

## AC-1 Vision pre-pass

| AC | Test file | Test (describe > it) | State | Owner |
|---|---|---|---|---|
| AC-1 | `src/prompts/vision-prepass.no-picture-references.spec.ts` | "FR-1 ..." > "the UKRAINIAN FIELDS block states <each of: never begins with and never contains; never makes it the subject of a verb; the seven quoted phrases>" (9) | RED | T14 |
| AC-1 | same | "FR-1" > "Assert absent: the old description line \"says what the image shows\" ..." | RED | T14 |
| AC-1 | same | "FR-2 ..." > "the UKRAINIAN FIELDS block states <Start with the subject noun; «Зображення»; «Фото»; «Знімок»; one alphabet>" (5) | RED | T14 |
| AC-1 | same | "FR-3 ..." > "contains \"State only what is visible; never infer operating modes, compatibility or requirements\"" (inside the Grounding rules section) | RED | T14 |
| AC-1 | same | "FR-4 ..." > "the prompt still contains <one sentence; differ; NUMBERS ARE THE HIGHEST-RISK ELEMENT>"; "NFR-12 ..." > JSON keys and signature unchanged; FR-2 "keeps It must be different from description, not a copy." | guard | T14 |

## AC-2 Master prompt

| AC | Test file | Test | State | Owner |
|---|---|---|---|---|
| AC-2 | `src/prompt-core/constants.no-image-deixis.spec.ts` | "NO_IMAGE_DEIXIS_RULE - the FR-5 literals" (begins `[NO PICTURE REFERENCES`; figcaption, alt, «на зображенні», «на фото», «нижче», `deleted, not reworded`); "static text" (no store name / currency / interpolation); "prose constraints from the watch items" | RED | T15 |
| AC-2 | `src/prompt-core/master-system-prompt.no-picture-references.spec.ts` | "FR-5 ... (M1 + M2)" > master contains the heading, the constant occurs once, the literals sit in the block; "OUTSIDE [IMAGE HANDLING]" > heading not between `\n[IMAGE HANDLING]\n` and `\nFIGURE FORMAT`, no `${` in that span (source); "NFR-1 / D4" > 7 stores x block 0 = master containing the block, first two cached blocks identical across stores | RED (the cache-identity and no-`${` tests guard) | T27 |
| AC-2 | `c-reach`, `o-reach` | "T27 / category 16" (16 pairs x 2) and "T27 / category 18" (6 optimizer inputs): block 0 is the live master and contains the constant | RED | T27 |
| AC-2 (FR-9) | `src/prompt-core/master-system-prompt.video-placement.spec.ts` | "[VIDEO] block contains <Place every embed directly after a body paragraph of its sub-section; never points at the video>"; "Assert absent: Introduce every embed with a lead-in <p>"; existing literals kept; header line untouched | RED / guard | T28 |
| AC-2 (FR-8, FR-6 `shown here`) | `src/prompt-core/master-system-prompt.grounding-lock.spec.ts` | "the IMAGE GROUNDING LOCK block contains <restricts claims ABOUT THE IMAGE; does not restrict product facts>"; absent `the lead-in may reference the image only descriptively`; absent `shown here` (whole master); rest of the lock and `IMAGE GROUNDING LOCK stands` kept | RED / guard | T29 |
| AC-2 (FR-6, FR-7) | `src/prompt-core/master-system-prompt.placement.spec.ts` | "PLACEMENT block contains <PRECEDING PARAGRAPH; reads as if the image did not exist; the figcaption carries the link to the picture; see [NO PICTURE REFERENCES]; Give the paragraph and the figcaption separate jobs>"; absent <LEAD-IN: precede every <figure>; visible here; Give lead-in and figcaption separate jobs; The image below shows; SUBSTANTIVE NARRATIVE SENTENCE>; SPACING sentence kept; `FIGURE FORMAT` text kept | RED / guard | T30 |
| AC-2 | `gold-us91` | "T27 to T32: block 0 of every master-embedding case carries the new master text" (10 cases x 6 owner groups) | RED | T27..T32 |

## AC-3 Lead-in wording removed

| AC | Test file | Test | State | Owner |
|---|---|---|---|---|
| AC-3 (FR-10) | `src/prompts/task-a-doc.figure-placement.spec.ts` | "FR-10 ... (Assert present)": `no orphan images` (guard), `states a product fact from the source`, `never refers to the picture`, `The same holds for every figure's "caption" and "alt"`; "(Assert absent)": `introduces what the image shows`, `place the lead-in paragraph beside it` | RED / guard | T17 |
| AC-3 (FR-10) | `gold-us91` | "T17 (FR-10): doc/* block 1 ..." (3 cases) | RED | T17 |
| AC-3 (FR-11 item 1) | `src/prompts/task-a.deixis-wording.spec.ts` | "FR-11 item 1 (T24, T-A1)": present `a figure needs a body <p> directly above it, and that <p> never refers to the picture`; absent `an image still needs its own lead-in <p>`; `Do not place a <figure> directly after a </ul>` kept; consistency instructions untouched; same for every store | RED / guard | T24 |
| AC-3 (FR-11 item 2) | same | "FR-11 item 2 (T22, T-A2): buildVideoBlock" x 4 inputs: new span VERBATIM present, old span absent, `§3 FUNCTIONALITY, before §7` intact, `written in the body language` attached to the paragraph, no pointer word inside the new span, the two manifest references kept | RED / guard | T22 |
| AC-3 (FR-11 item 3) | same | "FR-11 item 3 (T23, T-A3)": old marker span absent; marker block rules intact. **The NEW span wording is DEFERRED (H-FR11I3)** | RED / guard; DEFERRED (H-FR11I3) | T23 |
| AC-3, AC-9 (FR-27) | `golden-A` | Tier B video (4 inputs x 2), marker (2), video+marker (1): golden with old span(s) replaced equals live; marker cases pin prefix and suffix and absence of the old span (the exact new-span equality is DEFERRED, H-FR11I3) | RED | T22, T23 |
| AC-3 (FR-11) | `gold-us91` | "T22 ... EXPERT3D video cases carry the new video span only" (3 + premise + no-stray-copy); "T24 ... html/* block 1" (4) | RED | T22, T24 |
| AC-3 (FR-12) | `src/prompt-core/constants.c3d-override.spec.ts` | absent `The lead-in must still differ from the alt text and from the preceding lead-in <p>`; present `The opener must still differ from the alt text and from the paragraph above the figure`; OVERRIDE #5 label form kept | RED / guard | T18 |
| AC-3 (FR-12) | `gold-us91` | "T18 (FR-12): the Center 3D Print overlay block ..." (2 cases) | RED | T18 |
| AC-3 (FR-13 image) | `src/utils/output-validator.image-manifest-wording.spec.ts` | absent `a substantive lead-in <p> directly above it`; present `a body <p> directly above it (a product fact that does not point at the picture)`; `never adjacent to another <figure>`, `filename verbatim`, `[IMAGE HANDLING]` kept; duplicate rule untouched | RED / guard | T25 |
| AC-3 (FR-13 video) | `src/utils/video-manifest.pointer-free.spec.ts` | "FR-13 (video half)": absent `introduced by its own lead-in <p>`; present `placed after a body paragraph of its sub-section (no pointer to the video)`; `src copied VERBATIM` and `§3 FUNCTIONALITY — before §7 Technical Specifications` kept; Doc sibling untouched | RED / guard | T6 |
| AC-3 (FR-14) | `src/services/content-orchestrator.deixis-messages.spec.ts` | "video-embed-restored warnings, store <each plain-HTML store>": `generateUaContent` (HTML (uk-UA)) and `generate` (HTML (base)) warnings contain `sensible preceding paragraph` and not `sensible lead-in paragraph` | RED | T7 |
| AC-3 (FR-36, FR-37) | `golden-A`, `d15`, `task-a-doc.figure-placement` ("no orphan images"), `master-system-prompt.placement` (SPACING sentence), existing `render-*`/`task-a-doc.v4` specs | preserve-only: figure/figcaption/lazy/`<p>` above rules and video rules are not weakened | guard | all |

## AC-4 / AC-5 / AC-6 / AC-7 Detector and warnings

| AC | Test file | Test | State | Owner |
|---|---|---|---|---|
| AC-4 | `src/utils/video-manifest.pointer-free.spec.ts` | "FR-15 / AC-4": 7 languages x none of «нижче», «below», «ниже», «poniżej», «unten», «abaixo», «siguiente»; product name present; primary-subtag lookup; unknown / omitted locale falls back to a pointer-free English template | RED (words) / guard (fallback, name) | T5 |
| AC-4 | `src/utils/video-manifest.deixis.spec.ts` | each rendered template: `findImageDeixis(text, locale)` is `null` | RED (load) | T5 (needs T2) |
| AC-5 | `deixis` | "findImageDeixis - uk-UA": 3 required positives, 2 required negatives, `Фото: ` / `Зображення товару:` negatives, «на фотополімерній» negative, primary subtag case-insensitive | RED (load) | T2 |
| AC-5 | `deixis` | "findImageDeixis - <ru, en, pl, de, es, pt>": 2 positives + 2 negatives each; en-ES/en-US/en-GB -> en; es-MX -> es; unknown language and omitted locale -> `null`; never throws; deterministic | RED (load) | T2 |
| AC-5 (NFR-8) | `deixis` | "DEIXIS_PATTERNS - keyed by language, in step with STORE_REGISTRY"; "dependency-free leaf" (type imports only, no `STORE_REGISTRY`) | RED (load) | T2 |
| AC-6 | `deixis` | "collectFigureDeixis - the three carriers": paragraph / figcaption / alt hits with carrier; non-adjacent paragraph not reported; heading, `<hr>`, `<ul>`, `<table>`, another `<figure>` between; first child; comments and text nodes ignored; video figure; iframe title not inspected; one hit per carrier instance; failure paths and injectable parser | RED (load) | T3 |
| AC-7 (builder half) | `deixis` | "imageDeixisIssues": one `warning` `image-deixis` per figure with a pointer paragraph above; none for figcaption / alt; none for «нижче -10 °C» elsewhere; none for undefined locale | RED (load) | T3 |
| AC-7 (validator) | `src/utils/output-validator.image-deixis.spec.ts` | "FR-18": emits `image-deixis` at `warning` for the paragraph carrier only (uk and en locale, video figure); carrier-table guards (figcaption, alt, undefined locale, no figure give nothing); "NFR-12": no repair strategy, not a ladder candidate | RED (4) / guard (8) | T26 (T3, T25) |
| AC-7 (figcaption) | `src/utils/image-placeholder.deixis.spec.ts` | "figureCaptionWarnings emits image-caption-deixis (FR-19)": warning level, three phrase classes, label, fallback-label figure, once per figure, none for clean caption / alt-only, optional locale; reaches `report.warnings` and `validateDroppedPlaceholders`; `slice(before)` property via the finaliser | RED (13) / guard | T4 |
| AC-7 / NFR-7 | `src/utils/image-deixis.import-cycle.spec.ts` | 3 load orders of detector, validator, placeholder module | RED (load) | T2, T4, T26 |

## AC-8 Liveliness, overlays, inheritance

| AC | Test file | Test | State | Owner |
|---|---|---|---|---|
| AC-8 (FR-20) | `src/prompt-core/constants.liveliness.spec.ts` | Assert present (SCENE, RHYTHM, HONEST LIMITS, HOOK literals, `[SENTENCE LENGTH]`, `apply only where §3 exists`); self-scoping three strings + full sentence VERBATIM once + superseded wording absent; Assert absent as the Specification words it (N10): `9–17`, `9-17`, `at most two consecutive`, `two consecutive sentences`, digit-range-plus-`word`, no sentence-length number other than `6`; static; watch-item prose | RED | T16 |
| AC-8 (FR-20 precedence sentence) | - | `where a store voice block defines its own bullet form, heading form, tone or punctuation limits, that block wins` | **DEFERRED (H-FR20PREC)** - the Story requires the idea, the exact words are an unconfirmed PROPOSED DEFAULT; **partial GAP** for that one element of AC-8 | T16 |
| AC-8 (FR-20, 7 stores) | `src/prompt-core/master-system-prompt.liveliness.spec.ts` | "store <each of 7>": block 0 = master and carries every FR-20 literal and the three self-scoping strings; constant occurs once; full sentence once; no watch-item prose; INVARIANT START unchanged | RED / guard | T32 |
| AC-8 (FR-21) | `constants.liveliness.spec.ts`, `constants.c3d-override.spec.ts`, `constants.expert3d.spec.ts`, `master-system-prompt.liveliness.spec.ts` | EXPERT3D `Emotionally neutral: no excitement, no exclamation marks.`; C3D `Exclamation marks in the body: ZERO`, `at most 1 per 400 words`, `instructional, calm`; master `STRICT INPUT SCOPE` | guard | T16, T19, T32 |
| AC-8 (FR-22) | `src/prompt-core/constants.expert3d.spec.ts` | EXPERT3D overlay present (7 literals, 5 red), old line absent, `never bare noun` used nowhere (constants + 7 stores' system blocks) | RED (6) / guard | T19 |
| AC-8 (FR-22) | `gold-us91` | "T19 (FR-22): the EXPERT3D overlay block ..." (3 cases) | RED | T19 |
| AC-8 (FR-23 item 1, N19) | `constants.expert3d.spec.ts`, `constants.c3d-override.spec.ts` | FR-22 strings absent from C3D overlay, master, `task-c.ts`, `task-translate.ts` (read as text), every other exported string constant; C3D carries no liveliness text | guard | T19 (stay green T27..T32) |
| AC-8 (FR-23 items 2-4) | `bytes` (amended, T20) | 96 cases: block count, block 0 = live master + `cache`, block 1 + `userContent` pinned; negative demonstration on test data (7 tests); premise: JSON holds the pre-Story block-0 digest | guard (108) | T20 |
| AC-8 (FR-23 item 3) | `c-reach` | "T27 / T32 / T31 ..." over 16 pairs x 2: block 0 = live master containing `[NO PICTURE REFERENCES`, the liveliness block and the three strings; block 1 / `userContent` do not | RED (80) | T27, T31, T32 |
| AC-8 (FR-23 item 4) | `o-reach`, `d15` | optimizer block 0 = master with both constants and the strings (6 inputs); block 1 and `userContent` byte-equal to the pre-change capture | RED (18) / guard (`d15` 75) | T27, T32 |
| AC-8 (FR-23 item 5) | `d15`, `c-reach` | every block of the 48 Task C FAQ-variant payloads and 3 `buildTranslatePrompt` payloads byte-equal to the capture and free of any master fragment, `[NO PICTURE REFERENCES`, the three strings | guard | T37 (stay green) |
| AC-8 | `gold-us91` | "what must NOT move": `translate/*` and `c/*` block 1 / `userContent` carry none of the new text | guard | T27..T32 |
| AC-8 (declared risk) | `src/utils/structural-parity.sentence-blind.spec.ts` | `validateStructuralParity` reports no error when a sentence is added, split, merged or removed inside a `<p>` (Q-TRANS option 3, documentation) | guard | - |
| AC-8 (residual R1a, R1d, R7a) | - | translator / optimizer behaviour under the shared block cannot be tested in the gate | **GAP by design** (declared residual risk, Specification note G; optional manual T42) | - |

## AC-9 Operator notes

| AC / FR | Test file | Test | State | Owner |
|---|---|---|---|---|
| AC-9 (FR-24) | `src/app/components/operator-notes-fields/operator-notes-fields.component.spec.ts` | 4 textareas by role and label in en and uk; order; not required, no placeholder, no alert; shows its values; emits the full four-key object on input (one char, cleared box = `''`, no trim) | RED (load, components runner) | T11 (gated T21) |
| AC-9 (FR-24 labels, views) | `app-notes` | 8 label strings in `app.component.ts`; component rendered once, after the Generator supplemental input and before the SEO-only form, outside the Expert-3DPrinter image block, no template condition on its tag | RED (12) | T12 |
| AC-9 (FR-25, FR-26 bytes) | `src/prompts/operator-notes.spec.ts` | empty rule (6 shapes), block bytes full / partial / reordered keys / trimmed + internal line breaks / non-English values, form helpers, round trip, leaf-module imports | RED (load) | T9 |
| AC-9 (FR-26 position, FR-27) | `src/prompts/task-a.operator-notes.spec.ts` | "FR-26 position: <11 inputs>" x 4 note sets: `userContent` = no-notes `userContent` + the block at the offset after the WHOLE supplemental value; empty `operatorNotes` emits no block (guard); empty entry prints nothing; block never merged into `[Supplemental Content]`; NFR-1 system blocks identical per store; Expert-3DPrinter receives the block (OD-19(2)); Doc prefix carries the block, hook suffix after it, simplified facts after it | RED (54) / guard (4) | T21 |
| AC-9 (FR-27) | `golden-A` | Tier A strict: 24 inputs, and again with `operatorNotes` = undefined, `{}`, four empty, four whitespace-only, one empty key (5 x 24); Doc-wrapper remainder x 31 x 2 | guard (green on arrival, stays green) | T1/T21 |
| AC-9 (OD-19 (1b)) | `src/prompts/task-a-doc.figure-placement.spec.ts` | `[Operator Notes]` absent from `TASK_A_DOC_INSTRUCTION`, from `buildSimplifiedDocInstruction(each)` and from the Doc instruction block of an input that carries notes | guard | T17, T21, T31 |
| AC-9 (FR-28) | `src/services/content-orchestrator.operator-notes.spec.ts` | "FR-28 (T8)": per mode (generate, generateUaContent) x 7 stores, notes only -> no FAQ generation or translation call, no `faqArtifacts`; control: supplemental set -> calls; whitespace-only notes | guard | T8 |
| AC-9 (FR-28) | `app-notes` | `buildGeneratorInput` still passes `this.supplementalContent()` unchanged and never builds it from the notes; `runFaqPipeline` trigger unchanged | guard | T13 (state-independent part) |
| AC-9 (FR-29) | `src/prompt-core/master-system-prompt.operator-notes.spec.ts` | STRICT INPUT SCOPE names `[Operator Notes]` and keeps the three names, exactly four bracketed names; `three input blocks` absent and the number-word regex absent in INTERNAL RECONCILIATION; kept literals; covers the notes block; no other count-of-blocks wording | RED (6) / guard | T31 (gated T21) |
| AC-9 (FR-29, R22) | `c-reach`, `o-reach` | block 0 of Task C description and the optimizer names `[Operator Notes]` while `userContent` never carries it | RED | T31 |
| AC-9 (FR-30) | `content-orchestrator.operator-notes.spec.ts` | "FR-30 (T10)": a number only in each of the 4 notes passes the alt/figcaption gate (4 RED); absent from notes still fails; absent from all fails; whitespace-only grounds nothing; `supplementalContent`-only number NOT grounded (OD-20(2)); `NUMERIC_SOURCE_FIDELITY_RULES` byte-unchanged (sha256 + length pin) | RED (4) / guard | T10 (gated T21) |
| AC-9 (FR-31 item 1) | `src/services/history.service.operator-notes.spec.ts` | `add()` stores, storage round trip returns the four values unchanged; partial; entry without notes valid and gains no key; side by side | guard | T8 |
| AC-9 (FR-31 item 3) | `app-notes` | constructor restore code and the `seo_gen_form_state` effect never mention the notes; stored object keeps exactly 5 keys | guard | T13 |
| AC-9 (FR-31 items 2, 4, 5; FR-25 form side) | - | restore fills the textareas; restored notes resent; an entry without notes empties them; empty / whitespace form values give no key | **DEFERRED (H-FR41TEST) - GAP** (T38, T40; also T12/T13 state pins) | T38, T40 |
| AC-9 (FR-40) | `content-orchestrator.operator-notes.spec.ts` | "FR-40 (T10)": per mode x 7 stores, every SEO-meta, slug, FAQ and translation payload identical with notes filled and absent, none contains a note | guard | T10 |
| AC-9 (FR-40 item 3, spec grounding) | - | `validateSpecsGrounding` takes no notes parameter by signature; no behavioural test is possible without inventing one | **GAP by construction** (covered only by the payload equality above and review) | - |
| AC-9 (FR-41) | - | "Clear All" resets the four textareas in `generator` and `ua-generator`; the next input has no `operatorNotes` key | **DEFERRED (H-FR41TEST) - GAP: no test at all for FR-41** (T39, T40) | T39, T40 |

## AC-10 / AC-11 / AC-12 Measurement and live acceptance

| AC | Test file | Test | State | Owner |
|---|---|---|---|---|
| AC-10 (D-1, D-2, D-8, FR-33) | `src/utils/description-metrics.spec.ts` | deixis hits over carriers incl. video; figures without a paragraph above and consecutive figures (independent counts); «тож»/«Тому» count; hard-violation decision; soft items never change it; injected parser; leaf imports | RED (load) | T34 |
| AC-10 (D-3, D-4, D-5, D-7, D-9, D-6 per-section count, D-10 "number absent") | - | word, sentence, mean / sigma, hook length, number token, "absent from the input", per-section short-sentence count | **DEFERRED (H-OD10) - partial GAP** | T34 |
| AC-10 (CLI, FR-33) | `test/measure-description.cli.spec.ts` | spawn: first line `process.version`; exit 0 clean; non-zero for deixis (3 carriers), figure without paragraph, consecutive figures; soft items never change status; optional `--specs`, `--name`; missing / empty html or input file, no arguments fail visibly with stderr | RED (script, 16) | T35 |
| AC-10 ("number absent" exit, `--notes-*` flags) | - | exit status for a number absent from the input; the four notes flags | **DEFERRED (H-OD10)** | T35 |
| AC-11 | - | live runs: 0 deixis hits, no figure without a paragraph above, no two figures in a row, three products x 2 runs incl. a non-marker run | **No automated test by nature (manual T36, outside the gate; H-OD11 open: which products, who runs)** - the script (AC-10) is its instrument | T36 |
| AC-12 | - | hard: 0 numbers absent from the input; soft (2 of 3, non-blocking); manual fact review | **No automated test by nature (manual T36; H-OD11, H-OD10 for D-9)** | T36 |

## Task coverage (breakdown v3) - which task has which red or guard test

T1 `golden-A` (guard + Tier B red) - T2 `deixis` (T2 groups) - T3 `deixis` (T3 groups) - T4 `image-placeholder.deixis` - T5 `video-manifest.pointer-free`, `video-manifest.deixis` -
T6 `video-manifest.pointer-free` - T7 `content-orchestrator.deixis-messages` - T8 `content-orchestrator.operator-notes` (FR-28), `history.service.operator-notes` (green by the breakdown's own wording) -
T9 `operator-notes.spec` - T10 `content-orchestrator.operator-notes` (FR-30, FR-40) - T11 component spec - T12 `app-notes` (state-independent subset; state pins DEFERRED H-FR41TEST) -
T13 `app-notes` (FR-28, FR-31.3 guards; `inputPart` pin DEFERRED) - T14 `vision-prepass.no-picture-references` - T15 `constants.no-image-deixis` - T16 `constants.liveliness` -
T17 `task-a-doc.figure-placement`, `gold-us91` - T18 `constants.c3d-override`, `gold-us91` - T19 `constants.expert3d`, `gold-us91` - T20 `bytes` (amended) -
T21 `task-a.operator-notes` - T22/T23/T24 `task-a.deixis-wording`, `golden-A`, `gold-us91` - T25 `output-validator.image-manifest-wording` - T26 `output-validator.image-deixis`, `image-deixis.import-cycle` -
T27 `master-system-prompt.no-picture-references`, `c-reach`, `o-reach`, `gold-us91` - T28 `...video-placement` - T29 `...grounding-lock` - T30 `...placement` - T31 `...operator-notes`, `c-reach`, `o-reach` -
T32 `...liveliness`, `c-reach`, `o-reach` - T33 verification only (re-runs `c-reach`, `o-reach`, `d15`, `bytes`, `structural-parity.sentence-blind`) - T34 `description-metrics` (H-OD10 subset) -
T35 `test/measure-description.cli.spec.ts` - T36, T42 manual - T37 `d15` - T38, T39, T40 **no test written (H-FR41TEST)** - T41 conditional (returns to TEST_WRITING if triggered).

## Coverage statement

Every acceptance criterion AC-1 .. AC-12 has at least one row above. **Gaps recorded, none papered over:** (1) FR-41 and FR-31 items 2, 4, 5 and the FR-25 form side (AC-9) have no test until H-FR41TEST is answered; (2) the FR-20 precedence sentence (part of AC-8) and the FR-11 item 3 new marker wording (part of AC-3) are untested until H-FR20PREC / H-FR11I3 are answered; (3) AC-10's D-3, D-4, D-5, D-7, D-9 definitions and the "number absent" exit are untested until H-OD10; (4) AC-11 and AC-12 are live-run criteria with no automated test by design (T36, H-OD11); (5) FR-40 item 3 spec-grounding has no behavioural test (no parameter to vary); (6) AC-8's translator / optimizer behaviour is a declared residual risk. RECONCILIATION will not pass rows (1)-(3) without a TEST_WRITING loop-back (`changes_required_tests`) after the human answers.
