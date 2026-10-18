---
artifact: ac_test_matrix
story: US-9.1
version: 2
status: DRAFT
owner: so-test-writer
created_at: 2026-10-18T15:12:00Z
updated_at: 2026-10-18T16:43:00Z
supersedes: docs/tests/US-9.1-ac-test-matrix.md#1
inputs_consumed:
  - key: pipeline_status
    version: 1
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
    version: 2
open_decisions_blocking: false
---

# AC <-> Test Matrix - US-9.1 (v2, revision run after IMPLEMENTATION loop-back 1 of 3)

Ids are the Story's `AC-n` (Story v4). Every file named below exists in the repository now (paths relative to the repository root; `src/...` specs run in
`npm run test:logic`, the one `*.component.spec.ts` in `npm run test:components`). States in v1 were observed at HEAD `6546db8` before any implementation.
**v2 states are observed at HEAD `8a7a55b` (17 of the 42 tasks built) on 2026-10-18T16:35Z; a row whose owner task has landed shows `guard` or `green` for the part that
landed.** What v2 changed: F1/F2 (two defective specs fixed), F4 (T40/T12/T13/T38/T39 tests written), F6 (eleven false-positive negatives), F7 (FAQ-negative helper),
and the four owner answers that arrived during the run (H-FR20PREC, H-FR11I3, H-OD10, H-OD11). Row legend:

- `RED` = fails now by assertion, for the reason recorded in the generation report; `RED (load)` = the spec cannot load until the owner task creates the
  module (breakdown constraint 1); `RED (script)` = the spawned script does not exist yet.
- `guard` = green now by design; pins behaviour that must survive the Story (the red tests of the same AC are listed beside it).
- `DEFERRED (Hn)` = deliberately NOT written because the task that owns it depends on a still-unanswered human question `Hn`. **In v2 no row is DEFERRED to an unanswered
  question**: H-FR41TEST, H-FR20PREC, H-FR11I3, H-OD10 and H-OD13 are answered and their tests are written; H-OD11 is answered and concerns manual runs only (rows AC-11 and AC-12).
  `GAP` = an acceptance criterion (or part of one) that has no automated test, with the reason. `green` = passes now because its owner task landed (v2 observation).
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
| AC-1 | same | "FR-4 ..." > "the prompt still contains <one sentence; differ; NUMBERS ARE THE HIGHEST-RISK ELEMENT>"; "NFR-12 ..." > JSON keys and signature unchanged; FR-2 "keeps It must be different from description, not a copy." | guard (green since T14; the NFR-12 key-set test was unsatisfiable in v1 - F2: its slice started at the quoted `"{"` - and now starts at the `{` that opens the JSON example, same assertion: keys `alt, caption, description, label`) | T14 |

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
| AC-3 (FR-11 item 3) | same | "FR-11 item 3 (T23, T-A3): buildMarkerBlock - <es/marker/one, us/marker/legacy>": **Assert present (v2, H-FR11I3 answered "as written"): `at the end of the paragraph that states the product fact the image belongs to (the paragraph never mentions the picture);` VERBATIM, exactly once**; old marker span absent; marker block rules intact | RED (2 new) / guard | T23 |
| AC-3, AC-9 (FR-27) | `golden-A` | Tier B video (4 inputs x 2), marker (2), video+marker (1): golden with old span(s) replaced equals live; marker cases pin prefix and suffix and absence of the old span, **and (v2, H-FR11I3 answered) exact equality: the golden with the old marker span replaced by the new span (2 marker cases), the new span exactly once (2), and the golden with BOTH old spans replaced (1 video+marker case)** | RED (video half green since T22; marker halves red: 5 new + the 3 of v1) | T22, T23 |
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
| AC-5 | `deixis` | "findImageDeixis - uk-UA": 3 required positives, 2 required negatives, `Фото: ` / `Зображення товару:` negatives, «на фотополімерній» negative, primary subtag case-insensitive | green since T2 | T2 |
| AC-5 (F6, precision; v2) | `deixis` | "findImageDeixis - ordinary product sentences are not picture references (F6, FR-16 precision)": 11 ordinary sentences, each asserted twice (`findImageDeixis` is `null`; and as the paragraph above a figure `collectFigureDeixis` and `imageDeixisIssues` report nothing) - uk «Прогрес друку видно на дисплеї.», «Результат показано на екрані.», «Візок рухається на роликах.», «Принтер працює на відео-кадрах з частотою 30 Гц.»; en "The scan is displayed in real time.", "The extruder is mounted on the frame.", "The printer is shown in two colours."; de "Der Fortschritt wird auf dem Bildschirm angezeigt.", "Gedruckt wird in Fotopolymerharz."; es "El escaneo se muestra en tiempo real."; pt "O progresso é visível no ecrã." | **RED (22) BY DESIGN: the builder's detector flags all eleven; sends T2/T3 back to a narrowing task** | T2/T3 (narrowing) |
| AC-5 | `deixis` | "findImageDeixis - <ru, en, pl, de, es, pt>": 2 positives + 2 negatives each; en-ES/en-US/en-GB -> en; es-MX -> es; unknown language and omitted locale -> `null`; never throws; deterministic | RED (load) | T2 |
| AC-5 (NFR-8) | `deixis` | "DEIXIS_PATTERNS - keyed by language, in step with STORE_REGISTRY"; "dependency-free leaf" (type imports only, no `STORE_REGISTRY`) | RED (load) | T2 |
| AC-6 | `deixis` | "collectFigureDeixis - the three carriers": paragraph / figcaption / alt hits with carrier; non-adjacent paragraph not reported; heading, `<hr>`, `<ul>`, `<table>`, another `<figure>` between; first child; comments and text nodes ignored; video figure; iframe title not inspected; one hit per carrier instance; failure paths and injectable parser | RED (load) | T3 |
| AC-7 (builder half) | `deixis` | "imageDeixisIssues": one `warning` `image-deixis` per figure with a pointer paragraph above; none for figcaption / alt; none for «нижче -10 °C» elsewhere; none for undefined locale | RED (load) | T3 |
| AC-7 (validator) | `src/utils/output-validator.image-deixis.spec.ts` | "FR-18": emits `image-deixis` at `warning` for the paragraph carrier only (uk and en locale, video figure); carrier-table guards (figcaption, alt, undefined locale, no figure give nothing); "NFR-12": no repair strategy, not a ladder candidate | RED (4) / guard (8) | T26 (T3, T25) |
| AC-7 (figcaption) | `src/utils/image-placeholder.deixis.spec.ts` | "figureCaptionWarnings emits image-caption-deixis (FR-19)": warning level, three phrase classes, label, fallback-label figure, once per figure, none for clean caption / alt-only, optional locale; reaches `report.warnings` and `validateDroppedPlaceholders`; `slice(before)` property via the finaliser | green since T4 (18/18). F1: "takes an optional locale" was unsatisfiable in v1 (its English figure was built with `cyrillicCheck: true`, which discards non-Cyrillic text); v2 builds it with `cyrillicCheck: false` and also asserts the English text survives `buildFigureParts`; same behaviour asserted | T4 |
| AC-7 / NFR-7 | `src/utils/image-deixis.import-cycle.spec.ts` | 3 load orders of detector, validator, placeholder module | RED (load) | T2, T4, T26 |

## AC-8 Liveliness, overlays, inheritance

| AC | Test file | Test | State | Owner |
|---|---|---|---|---|
| AC-8 (FR-20) | `src/prompt-core/constants.liveliness.spec.ts` | Assert present (SCENE, RHYTHM, HONEST LIMITS, HOOK literals, `[SENTENCE LENGTH]`, `apply only where §3 exists`); self-scoping three strings + full sentence VERBATIM once + superseded wording absent; Assert absent as the Specification words it (N10): `9–17`, `9-17`, `at most two consecutive`, `two consecutive sentences`, digit-range-plus-`word`, no sentence-length number other than `6`; static; watch-item prose | RED | T16 |
| AC-8 (FR-20 precedence sentence; v2) | `src/prompt-core/constants.liveliness.spec.ts`, `src/prompt-core/master-system-prompt.liveliness.spec.ts` | H-FR20PREC answered ("accept the proposed default exactly as written"): `where a store voice block defines its own bullet form, heading form, tone or punctuation limits, that block wins` VERBATIM - in `LIVELINESS_RULES` (present, exactly once, names the four things a store block may define), in `systemBlocks[0]` of `buildPromptA` for each of the 7 stores, and once in the master | RED (3 + 8) | T16 (constant), T32 (master) |
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
| AC-9 (FR-24 labels, views) | `app-notes` | 8 label strings in `app.component.ts`; component rendered once, after the Generator supplemental input and before the SEO-only form, outside the Expert-3DPrinter image block, no template condition on its tag (T12 describe "state-independent") | RED (12) | T12 |
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
| AC-9 (FR-31 items 2, 4, 5; FR-25 form side) - behaviour (v2, H-FR41TEST answered: accept the default split) | `src/app/operator-notes-form-state.spec.ts` | `OperatorNotesFormState`, 28 tests: `new` outside any injector exposes a signal of four empty strings (the plan's "signal() without an injection context" check); two instances share nothing; `set` replaces; four filled -> `inputPart()` = `{operatorNotes}` with the four values; four empty / four whitespace-only -> `{}` with no `operatorNotes` key (`'operatorNotes' in part` false); each of the 4 keys alone filled; whitespace-only next to filled is empty; **FR-31 item 2/4 (R1)**: `restore(<four values>)` fills the four values and `inputPart()` returns them (resent); partial restore empties the other keys; restore replaces, never merges; **FR-31 item 5 (R2)**: fill then `restore(undefined)`, `restore({})` and `restore()` -> four empty values and no key; all-empty stored notes -> no key; `restore` does not mutate its argument | RED (load, T40 creates `src/app/operator-notes-form-state.ts`); satisfiable: 28/28 against a throw-away reference class | T40 |
| AC-9 (FR-31 items 2, 4, 5 - call sites; v2) | `app-notes` | **T38 describe**: `restoreHistory`'s body contains `operatorNotesState.restore(item.input.operatorNotes)` exactly once, as an unconditional statement of its own (R2: an entry without notes must still empty the form) | RED (2) | T38 |
| AC-9 (FR-25, FR-27 - call site; v2) | `app-notes` | **T13 describe**: `buildGeneratorInput`'s body contains `operatorNotesState.inputPart()`, spread into the returned object, and writes no literal `operatorNotes:` property (an explicit `undefined` would still be a key) | RED (2) / guard (1: no literal key) | T13 |
| AC-9 (FR-24 binding; v2) | `app-notes` | **T12 describe (state pins)**: `app.component.ts` declares `readonly operatorNotesState = new OperatorNotesFormState()` and imports it from `./operator-notes-form-state`; the component tag is bound `[values]="operatorNotesState.values()"` and `(valuesChange)="operatorNotesState.set($event)"`; the superseded name `operatorNotesForm` appears nowhere | RED (4) / guard (1: old name absent) | T12 |
| AC-9 (FR-40) | `content-orchestrator.operator-notes.spec.ts` | "FR-40 (T10)": per mode x 7 stores, every SEO-meta, slug, FAQ and translation payload identical with notes filled and absent, none contains a note | guard | T10 |
| AC-9 (FR-40 item 3, spec grounding) | - | `validateSpecsGrounding` takes no notes parameter by signature; no behavioural test is possible without inventing one | **GAP by construction** (covered only by the payload equality above and review) | - |
| AC-9 (FR-41 items 1, 2 - behaviour; v2) | `src/app/operator-notes-form-state.spec.ts` | "Clear All" outcome on the state: fill four values then `clear()` -> four empty values and no `operatorNotes` key; `clear()` on a partly filled and on an empty form; usable after `clear()`; **FR-41's second test case**: `restore(<entry with notes>)` then `clear()` -> four empty values and no key; `clear()` then `restore()` refills | RED (load, same file) | T40 |
| AC-9 (FR-41 - both `clearAll` cases; v2) | `app-notes` | **T39 describe**: `clearAll()` is sliced per case, label to the FIRST following `break;`: `case 'generator':` and `case 'ua-generator':` each contain `operatorNotesState.clear()` exactly once, contain exactly one `break;` and not the other case's label; the two slices are disjoint (premise, guard); no other mode of `clearAll()` mentions the state; `clearAll()` writes no `seo_gen_form_state` and does not touch `historyService` (guards). **Slicing-helper self-test (7 tests, green on arrival, they test test code)** on synthetic sources: both edited -> both pass; only `generator` edited -> the `ua-generator` pin FAILS; only `ua-generator` edited -> the `generator` pin FAILS; call only in another mode -> both fail; call twice -> fails; the two cases merged into one fall-through (plan rejected alternative 23) -> the two pins cannot both pass; a case with no `break;` is reported. A pin that passes with one case edited does not exist | RED (2) / guard (4 + 7 helper) | T39 |
| AC-9 (FR-41 - "invoke Clear All" wording) | - | no spec instantiates `AppComponent` and none executes `clearAll()` | **Residual gap, accepted by the owner (H-FR41TEST: "accept the default split ... no heavy AppComponent TestBed is needed")** - call-site text (T39) plus state behaviour (T40) stand for it | - |

## AC-10 / AC-11 / AC-12 Measurement and live acceptance

| AC | Test file | Test | State | Owner |
|---|---|---|---|---|
| AC-10 (D-1, D-2, D-8, FR-33) | `src/utils/description-metrics.spec.ts` | deixis hits over carriers incl. video; figures without a paragraph above and consecutive figures (independent counts); «тож»/«Тому» count; hard-violation decision; soft items never change it; injected parser; leaf imports | RED (load) | T34 |
| AC-10 (D-3 word; v2, H-OD10 answered) | `src/utils/description-metrics.spec.ts` | "D-3 word" (via `hookWordCount`): «0,03» and «3D-модель» are one word each (8-word hand count); a standalone dash, «×», «...» are not words; NBSP (U+00A0), U+2009 and U+202F separate words; whitespace runs create no empty word | RED (load; satisfiable) | T34 |
| AC-10 (D-4 prose block and sentence; v2) | same | "D-4": `.` `!` `?` `…` + whitespace + uppercase ends a sentence and so does the block end; before a digit, `«`, `"`; a full stop + lowercase does not; `0,03` / `3.5` never; whitespace collapsed; empty fragments dropped; `<p>` and `<li>` outside a `<figure>` are prose; headings, table cells, figcaptions, alt and anything inside a `<figure>` are not | RED (load; satisfiable) | T34 |
| AC-10 (D-5 mean and sigma; v2) | same | "D-5": words 2,4 -> mean 3, sigma 1; 1,1,1,5 -> mean 2, sigma sqrt(3) (population: divide by n); one sentence -> sigma 0; sentences pooled over paragraphs and list items (2,4,6 -> mean 4, sigma sqrt(8/3)); figcaption / heading / table words outside the pool | RED (load; satisfiable) | T34 |
| AC-10 (D-7 hook; v2) | same | "D-7": word count of the first `<p>` in document order, not the heading, not a later paragraph | RED (load; satisfiable) | T34 |
| AC-10 (D-6 per-section short-sentence count; v2) | same | "D-6": one count per §3 section in document order (the §2 block and everything after the first top-level `<hr>` or `<section>` skipped): `[1, 2, 0]` on a hand-built document; exactly 6 words is short, 7 is not; a top-level `<section>` ends the §3 sections; sentences inside a figure do not count; reported only, many empty sections change no hard decision | RED (load; satisfiable) | T34 |
| AC-10 (D-9 number token, normalisation, "absent from the input"; v2) | same | "D-9": `0,03` absent -> `0.03`; group spaces removed (space, U+00A0, U+202F - the characters the Specification lists) so `1 000` = `1000`; `,` = `.`; `3,5` is not `35`, `20` is not `200`; `L2`, `3D`, `4K`, `Wi-Fi6`, `H20` yield no token, `300 мм/с` yields `300`; attribute values (src, alt, style, href) not read; headings, table cells, figcaptions read; each distinct absent number once; the input side is the number tokens of EVERY text given (description, specs, name, notes); a number only in a text not given is absent; `H20` in the input grounds no `20` | RED (load; satisfiable) | T34 |
| AC-10 (FR-33 hard decision incl. D-9; v2) | same | "FR-33: a number absent from the input is a hard violation": hard violation when a generated number is absent; none when all are present; absent numbers reported next to another hard violation | RED (load) | T34 |
| AC-10 (CLI, FR-33) | `test/measure-description.cli.spec.ts` | spawn: first line `process.version`; exit 0 clean; non-zero for deixis (3 carriers), figure without paragraph, consecutive figures; soft items never change status; optional `--specs`, `--name`; missing / empty html or input file, no arguments fail visibly with stderr | RED (script, 16) | T35 |
| AC-10 (CLI, "number absent" exit; v2) | same | "FR-33: a number absent from the input is a hard violation (D-9)": non-zero after the header when a generated number is not in the input; the report names the number (`42`); exit 0 when it is in the input; `1 000,5` in the input equals `1000.5` in the text; numbers in attribute values are never absent | RED (script, 5) | T35 |
| AC-10 (CLI, D-10 input set, `--notes-*` flags; v2) | same | "FR-32 / D-10": `--specs` grounds a number (and without it the number is absent); `--name` grounds one; each of the four notes flags grounds a number given only in that note; a note not passed does not ground; a missing notes file fails visibly. **Flag names and the file-path form of the notes flags are a CONTRACT CHOSEN BY TEST_WRITING** (`--notes-usage-scenarios`, `--notes-test-results`, `--notes-previous-generation-comparison`, `--notes-limitations`; see the strategy) - no approved artifact fixes them; soft metrics (D-3..D-7 mean, sigma, hook, per-section counts) are reported and never change the exit status (1 test) | RED (script, 9) | T35 |
| AC-11 | - | live runs: 0 deixis hits, no figure without a paragraph above, no two figures in a row, three products x 2 runs incl. a non-marker run | **No automated test by nature (manual T36, outside the gate). H-OD11 ANSWERED by the owner: the live runs use standard catalog items - a generic Bambu Lab product for Center 3D Print and an Anycubic Kobra for 3DDevice; the human QA operator runs the 6 live runs manually; split 3 marker-built + 3 non-marker figures** - the script (AC-10, now fully specified by H-OD10) is its instrument | T36 (manual) |
| AC-12 | - | hard: 0 numbers absent from the input; soft (2 of 3, non-blocking); manual fact review | **No automated test by nature (manual T36, same H-OD11 answer; the D-9 definition is confirmed, H-OD10)**; the hard half is mechanised by the script's "number absent" exit status (rows above) | T36 (manual) |

## Task coverage (breakdown v3) - which task has which red or guard test

T1 `golden-A` (guard + Tier B red) - T2 `deixis` (T2 groups; **plus the F6 narrowing group, red**) - T3 `deixis` (T3 groups; **plus F6 carrier checks, red**) - T4 `image-placeholder.deixis` - T5 `video-manifest.pointer-free`, `video-manifest.deixis` -
T6 `video-manifest.pointer-free` - T7 `content-orchestrator.deixis-messages` - T8 `content-orchestrator.operator-notes` (FR-28), `history.service.operator-notes` (green by the breakdown's own wording) -
T9 `operator-notes.spec` - T10 `content-orchestrator.operator-notes` (FR-30, FR-40) - T11 component spec - T12 `app-notes` (state-independent subset **and the state pins: declaration, import, `[values]`/`(valuesChange)` binding, old name absent**) -
T13 `app-notes` (FR-28, FR-31.3 guards; **`inputPart()` call-site pin, no literal `operatorNotes:` key**) - T14 `vision-prepass.no-picture-references` - T15 `constants.no-image-deixis` - T16 `constants.liveliness` (**plus the precedence sentence**) -
T17 `task-a-doc.figure-placement`, `gold-us91` - T18 `constants.c3d-override`, `gold-us91` - T19 `constants.expert3d`, `gold-us91` - T20 `bytes` (amended) -
T21 `task-a.operator-notes` - T22/T23/T24 `task-a.deixis-wording`, `golden-A`, `gold-us91` (**T23: new marker span, exact Tier B equalities**) - T25 `output-validator.image-manifest-wording` - T26 `output-validator.image-deixis`, `image-deixis.import-cycle` -
T27 `master-system-prompt.no-picture-references`, `c-reach`, `o-reach`, `gold-us91` - T28 `...video-placement` - T29 `...grounding-lock` - T30 `...placement` - T31 `...operator-notes`, `c-reach`, `o-reach` -
T32 `...liveliness` (**plus the precedence sentence per store**), `c-reach`, `o-reach` - T33 verification only (re-runs `c-reach`, `o-reach`, `d15`, `bytes`, `structural-parity.sentence-blind`, **`test/faq-pipeline.master-leak.spec.ts` and the FAQ specs that use the extended helper**) -
T34 `description-metrics` (**all of D-1 to D-10 and the FR-33 absent-number decision**) - T35 `test/measure-description.cli.spec.ts` (**plus the absent-number exit and the input flags**) - T36, T42 manual - T37 `d15` -
T38 `app-notes` (restore call-site pin) - T39 `app-notes` (two disjoint per-case `clearAll` pins + slicing-helper self-test) - T40 `src/app/operator-notes-form-state.spec.ts` (28 behaviour tests) - T41 conditional (returns to TEST_WRITING if triggered).
Test-helper fixtures owned by TEST_WRITING: `test/fixtures/faq-pipeline.ts` (F7, extended) with `test/faq-pipeline.master-leak.spec.ts` (its guard, 21 tests); `test/fixtures/us91-constants.ts` (`PRECEDENCE_SENTENCE` added).

## v2 state overlay - owner tasks that landed since v1 (observed 2026-10-18T16:35Z, HEAD `8a7a55b`)

Rows above that read `RED` / `RED (load)` for an owner task in this list are GREEN now (the builder's table is the record; the full run reconciles to it): T2, T3, T4 (18/18 after F1), T5, T6, T7, T8, T9, T10, T11 (component runner caveat below),
T14 (23/23 after F2), T15, T17, T20, T21, T22, T25, T26. Still red, by file (350 failing tests in 20 files): `task-c.master-reach` 80, `full-description.golden.us91` 69, `measure-description.cli` 30, `constants.liveliness` 27, `master-system-prompt.liveliness` 24,
`app.component.operator-notes` 22, `image-deixis` 22 (all F6), `optimizer.master-reach` 18, `master-system-prompt.no-picture-references` 11, `...placement` 10, `task-a.user-content.golden` 8, `constants.expert3d` 6, `...operator-notes` 6, `task-a.deixis-wording` 6,
`...grounding-lock` 4, `...video-placement` 3, `faq-pipeline.master-leak` 2, `constants.c3d-override` 2; two files red by load: `operator-notes-form-state.spec.ts` (T40) and `description-metrics.spec.ts` (T34).
Guards inside `app.component.operator-notes.spec.ts` that are green on arrival by design (18 of 40): the 5 v1 guards (FR-28 x3, FR-31.3 x2), the T12 old-name-absent pin, the T13 no-literal-key pin, the T39 premise, disjoint-slices, other-modes-untouched and no-`seo_gen_form_state`/history pins, and the 7 slicing-helper self-tests.
The component runner (`npm run test:components`) still cannot bundle: 2 diagnostics, TS2307 for `./description-metrics` (T34) and for `./operator-notes-form-state` (T40); it is unblocked when BOTH land.

## Coverage statement

Every acceptance criterion AC-1 .. AC-12 has at least one row above. **No row is deferred on an unanswered human question.** Gaps recorded, none papered over: (1) AC-11 and AC-12 are live-run criteria with no automated test by design: T36 (and the optional T42) are MANUAL, run by the human QA operator on the products the owner named (H-OD11), 3 marker-built + 3 non-marker runs; the script is their instrument; (2) FR-40 item 3 spec-grounding has no behavioural test (no parameter to vary; payload equality covers it); (3) AC-8's translator / optimizer behaviour is a declared residual risk (note G); (4) FR-41's "invoke Clear All" wording is satisfied by the accepted split (call-site pins T39 + state behaviour T40), not by executing `AppComponent.clearAll()` (H-FR41TEST answer); (5) the four `--notes-*` flag names, their file-path form and six report keys of `measureDescription` are contracts chosen by TEST_WRITING because no approved artifact fixes them (strategy, "Contracts chosen"); (6) the F6 negatives are red by design against the builder's detector and send T2/T3 to a narrowing task.
