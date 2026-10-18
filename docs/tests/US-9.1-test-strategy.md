---
artifact: test_strategy
story: US-9.1
version: 3
status: DRAFT
owner: so-test-writer
created_at: 2026-10-18T15:10:00Z
updated_at: 2026-10-18T19:57:00Z
supersedes: docs/tests/US-9.1-test-strategy.md#2
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
open_decisions_blocking: false
---

# Test Strategy - US-9.1: no picture references, livelier descriptions (track prompt)

## Revision 3 (this version; TEST_WRITING loop-back 2, NARROW revision, key `changes_required_tests`, finding F8)

Run on 2026-10-18T19:57Z at HEAD `c24d974`. Tests only; no production file, no FROZEN file, no `--rebaseline`, nothing committed. One spec changed:
`src/prompt-core/master-system-prompt.no-picture-references.spec.ts` (T27). **F8**: two approved expectations contradicted each other. FR-7 (and
`master-system-prompt.placement.spec.ts`) require the literal `see [NO PICTURE REFERENCES]` in the master, so the prefix `[NO PICTURE REFERENCES` legitimately occurs
twice once T30 lands, but the T27 test "heading not between [IMAGE HANDLING] and FIGURE FORMAT" also asserted that the prefix occurs only once (`indexOf(prefix, at + 1) === -1`), which
T30 turned red. Fix, not a weakening: uniqueness is now asserted on the HEADING (the first line of `NO_IMAGE_DEIXIS_RULE`, taken from the constant) - exactly once, at a line
start, the only line-start `[NO PICTURE REFERENCES` - and the total count of the prefix must equal 1 + the number of FR-7 pointers, so any third mention still fails. The "heading is outside the
[IMAGE HANDLING] span" check now locates the heading at its line start. Scan of the other US-9.1 specs for the same defect class (uniqueness on a string that FR-7/FR-9/FR-20 require in more than
one place): none found; the `split(...).length - 1 === 1` assertions in `constants.liveliness`, `master-system-prompt.liveliness`, `task-a.deixis-wording`, `task-a.user-content.golden` and
`master-system-prompt.v4` are on whole constants or sentences that occur in one place only, and all passed with the T30/T31/T32 hunks applied (scratch copy).

## Revision 2 (previous version; TEST_WRITING loop-back 1 of 3 from IMPLEMENTATION, key `changes_required_tests`)

Run on 2026-10-18T16:43Z at HEAD `8a7a55b` (17 of the 42 tasks built). Tests and test fixtures only; no production file, no FROZEN file, no `--rebaseline`, nothing committed
(`docs/workflow/history.jsonl` was already modified in the working tree before this run and is not mine). What changed relative to v1:

- **Owner answers in force** (`docs/workflow/history.jsonl`): H-FR41TEST (accept the default split: call-site source-text pins plus `OperatorNotesFormState` behaviour tests satisfy FR-41; no `AppComponent` TestBed),
  H-OD13 (restated Specification text is normative; baseline files tracked under `test/fixtures/baseline/`) and, arriving during the run, **H-FR20PREC** (precedence sentence accepted exactly as written), **H-FR11I3** (marker block wording accepted
  exactly as written), **H-OD10** (D-3, D-4, D-5, D-7, D-9 confirmed as written) and **H-OD11** (live acceptance runs: standard catalog items, a generic Bambu Lab product for Center 3D Print and an Anycubic Kobra for 3DDevice, the human QA operator runs the 6 live
  runs manually, 3 marker-built + 3 non-marker figures). **Nothing is deferred on an unanswered question any more.**
- **F4 written (T12, T13, T38, T39, T40)**: `src/app/operator-notes-form-state.spec.ts` (28 behaviour tests) and, in `src/app/app.component.operator-notes.spec.ts`, a describe per owner task (T12 binding pins, T13, T38, T39 with the slicing-helper self-test). Red until the owner tasks land.
- **F1, F2 fixed** (test defects of v1, both now green): `image-placeholder.deixis.spec.ts` "takes an optional locale" builds its English figure with `cyrillicCheck: false` (and asserts the English text survives `buildFigureParts`); `vision-prepass.no-picture-references.spec.ts` NFR-12 starts its slice at the `{` that opens the JSON example.
  The assertions are the same as before; no test was weakened.
- **F6 added**: eleven ordinary product sentences as negatives in `image-deixis.spec.ts` (22 tests: the detector, and the paragraph above a figure through `collectFigureDeixis` / `imageDeixisIssues`). **They fail against the builder's detector BY DESIGN** and send T2/T3 back to a narrowing task.
- **F7 done** (`test/fixtures/faq-pipeline.ts`, test helper, extended and never narrowed) with a new guard spec, see "Existing tests touched".
- **Tests for the four answered questions**: FR-20 precedence sentence (T16, T32); FR-11 item 3 marker span and the exact Tier B marker equalities (T23); D-3, D-4, D-5, D-7, D-9, the D-6 per-section count and the FR-33 absent-number decision (T34); the CLI exit status for an absent number and the optional input flags (T35).
- **Contracts chosen by TEST_WRITING that no approved artifact fixes** are listed at the end of this document (new in v2: six report keys of `measureDescription`, the four `--notes-*` flag names and their file-path form, `OperatorNotesFormState` API names from plan D9). They are visible so that reconciliation can accept or reject them; changing one is a one-line test edit.

Run 1 (v1 text, kept below as the record of the first TEST_WRITING pass): TEST_WRITING for Story US-9.1, run on branch `feat/US-9.1-no-picture-references-and-livelier-descriptions` at HEAD `6546db8`
(`src/`, `server/`, `tools/`, `package.json`, `.arch-guard-checksums` unchanged from that commit; `git diff HEAD --name-only` over them lists
only `src/prompts/task-c.description-bytes.spec.ts`, the guard T20 amends). No production file and no FROZEN file was edited, `--rebaseline`
was not run, nothing was committed. `bash arch-guard.sh`: all frozen files unchanged, ALL CHECKS PASSED.

## Approach

- **Assertions are written from the Specification (v5) literals, never from the plan's proposed code or from a captured model run.** The
  Specification's "Assertion convention" is followed everywhere: case-sensitive comparison over text with every run of whitespace
  collapsed to one space; only the listed Assert-present / Assert-absent strings are normative; restated blocks are illustrative.
- **Everything runs in the logic runner (`npm run test:logic`)** except one component spec, because the only component is the four-textarea
  `OperatorNotesFieldsComponent` (T11). Services are driven with the established pattern (`import '@angular/compiler'` first,
  `Injector.create`, never TestBed). The model is stubbed at the `LlmService` boundary only; the orchestrator, repair gate, prompt builders
  and validators are the real ones. Existing fixtures are reused (`test/fixtures/protected-name.ts`, `faq-pipeline.ts`,
  `image-placeholder/fixtures.ts`, `task-c-description-inputs.ts`).
- **One `describe` (or one file) per owner task** (task breakdown, TEST_WRITING constraint 2), so no group stays red across several commits for
  a reason a later task owns.
- **Type-clean from the first commit (constraint 1).** New constants are read through `test/fixtures/us91-constants.ts` (a module-namespace
  accessor that throws a message naming the missing export); `ProductInput.operatorNotes` is added through a cast. The only `tsc` diagnostics
  are TS2307 (and one TS2339 that is a consequence of it) in the five logic specs and the one component spec that import a module a task of
  this Story creates (`image-deixis`, `operator-notes`, `description-metrics`, the component). These are the missing-symbol kinds the
  breakdown allows in later-owner specs.
- **Red for the right reason.** Prompt-text pins fail with `expected '<text>' to contain '<literal>'`; reach pins fail with the master not
  containing the new block; behaviour pins fail with `expected [] to have a length of 1`; the CLI spec fails because the script is absent.
  Negative tests cannot pass vacuously (the CLI negatives also require that the script ran; the absence pins are paired with presence pins).
- **No weakening.** v1: one existing spec was amended (T20, named under "Existing tests touched"). v2: two of this stage's own v1 specs were corrected (F1, F2; same assertions, made satisfiable) and the describe titles
  of the Tier B marker group in `task-a.user-content.golden.spec.ts` and the marker group of `task-a.deixis-wording.spec.ts` were renamed (the "DEFERRED" wording left them; every v1 assertion is kept, new exact-wording assertions were added beside them).
  No test was deleted, skipped, `todo`-ed or excluded; no coverage config touched.

## Test layers

| Layer | Runner | What | Files |
|---|---|---|---|
| Byte oracles | logic | FR-27 `userContent` oracle (Tier A strict, Tier B video / marker / both, Doc-wrapper remainder); D15 pre-change oracle (optimizer block 1 + userContent, every block of the Task C FAQ variant, `buildTranslatePrompt`); amended Task C description guard | `src/prompts/task-a.user-content.golden.spec.ts`, `src/prompts/payload-oracle.d15.spec.ts`, `src/prompts/task-c.description-bytes.spec.ts` + fixtures |
| Prompt-wording pins | logic | Vision pre-pass FR-1..FR-4; Doc FIGURE PLACEMENT FR-10; `task-a.ts` three FR-11 items; C3D override FR-12; EXPERT3D overlay FR-22; master FR-5..FR-9, FR-20, FR-29; `[Operator Notes]` block FR-26 | see matrix |
| Reach / inheritance | logic | master block 0 reaches Task A (7 stores), Task C description translation (16 pairs x 2), the optimizer (6 inputs); FAQ variant and `buildTranslatePrompt` carry none of it; regenerated-golden pins | `task-c.master-reach`, `optimizer.master-reach`, `master-system-prompt.liveliness`, `full-description.golden.us91` |
| Detector units | logic (happy-dom) | `findImageDeixis` (7 languages), carriers, issue builder, registry cross-check, leaf-module and import-cycle guards | `image-deixis.spec.ts`, `image-deixis.import-cycle.spec.ts` |
| Warning-level units | logic | `image-caption-deixis`, `image-deixis` in `validateGeneratedHtml`, repair-loop exclusion | `image-placeholder.deixis.spec.ts`, `output-validator.image-deixis.spec.ts` |
| Message / template units | logic | AC-4 lead-in templates, `video-embed-missing`, `image-manifest-missing`, the two orchestrator warnings | `video-manifest.pointer-free`, `video-manifest.deixis`, `output-validator.image-manifest-wording`, `content-orchestrator.deixis-messages` |
| Operator-notes units | logic | leaf module bytes, block position over 11 inputs x 4 note sets, empty rule, FAQ isolation, numeric fidelity, history round trip, isolation of SEO / slug / FAQ / translation payloads | `operator-notes.spec`, `task-a.operator-notes.spec`, `content-orchestrator.operator-notes.spec`, `history.service.operator-notes.spec` |
| Wiring pins | logic (source text) | label strings, single placement outside the Expert-3DPrinter image block, no join into `supplementalContent`, no `seo_gen_form_state` write; v2: T12 binding to `operatorNotesState`, T13 `inputPart()` spread, T38 `restore(item.input.operatorNotes)`, T39 two disjoint per-case `clearAll` pins with the slicing-helper self-test | `app.component.operator-notes.spec.ts` |
| Component | components (`*.component.spec.ts`) | four labelled textareas (en, uk), optional, emits the full four-key object | `operator-notes-fields.component.spec.ts` |
| Metrics and CLI | logic | all metric definitions D-1 to D-10 on hand-computed fixtures (v2: D-3 word, D-4 prose block and sentence, D-5 mean and sigma, D-7 hook, D-6 per-section count, D-9 number token / normalisation / absent), hard-violation decision incl. an absent number, spawn test (exit codes, `process.version` first line, failure paths, absent-number exit, optional input flags) | `description-metrics.spec.ts`, `test/measure-description.cli.spec.ts` |
| Operator-notes form state (v2) | logic | `OperatorNotesFormState` behaviour: construction without an injection context, `set`, `inputPart()` (FR-25 empty rule), `clear()` (FR-41), `restore()` with notes / without notes / `{}` (FR-31 items 2, 4, 5), restore-then-clear | `src/app/operator-notes-form-state.spec.ts` |
| FAQ-negative helper (v2) | logic | the discrimination of `faqTranslationPromptProblems` against the Story's new master text, offset-independent | `test/faq-pipeline.master-leak.spec.ts` |
| Characterization | logic | `validateStructuralParity` is blind to sentence changes inside `<p>` (Q-TRANS option 3) | `structural-parity.sentence-blind.spec.ts` |

## Oracle capture (T1, T37; breakdown Reading guide item 10, plan-review N16/N21)

Both fixtures were captured by a one-off vitest run (deleted afterwards, as the US-8.1 precedent) from the commit the Story branch was cut from.
The header `_meta` of each JSON records `base: 6546db83ef4005e9d6a57baf51adf0b35df8d3c7` and the `task-a.ts` checksum at that commit
(`0421226ccbf10c1f347ee134d2633086a2dbe89284148d053ce4d56ba1c9c89f`). The capture script asserted `git diff --name-only HEAD -- src server tools
package.json` was empty and that no non-spec file was untracked under those paths; it did not use `-u` and did not use `git merge-base HEAD main`
(which returns `120dcbc`, not the cut point). The whole-tree "no production change relative to BASE" clause of T1 is a **capture-time property**
(plan-review N21): it was true when the fixtures were captured and is not re-checkable once a production task lands; the builder re-checks it only
against the `task-a.ts` import closure. The specs verify the header is well-formed (40-hex hash, 64-hex checksum); `git merge-base --is-ancestor`
is the builder's acceptance check, not a unit test (a shallow CI clone may lack the commit).

- `test/fixtures/golden/task-a-user-content.json`: 31 cases = 4 stores (one per registry group) x 6 Tier A inputs (Full plain; custom instructions +
  manifest; multi-line supplemental + `baseLanguageOverride`; simplified `spare-parts`; simplified `accessories` + functionality + custom + manifest;
  simplified `filaments-resins-powders` + override) + 4 video inputs + 2 marker inputs + 1 video-plus-marker input; each with the Doc-wrapper
  remainder without and with a hook pattern.
- `test/fixtures/golden/optimizer-faq-pre-change.json`: 6 optimizer inputs (block 1 + `userContent` digests; block 0 asserted `toBe` the live master),
  48 Task C FAQ-variant payloads (16 pairs x 3 option sets, every block), 3 `buildTranslatePrompt` payloads (block-0 digest prefix `151c04990596`
  matches impact analysis).

## T20: the amended Task C description guard (option (b), decided)

`src/prompts/task-c.description-bytes.spec.ts` now compares block 0 of each of the 96 prompts with the live `MASTER_SYSTEM_PROMPT` and keeps the
block count, the block-0 `cache` flag, block 1 and `userContent` (length and sha256, and block 1 `cache`) pinned per case against the unchanged
`task-c-description-prompts.json` (byte-unchanged). The comparison is the pure function `compareCaseToRecord` in
`test/fixtures/task-c-description-guard.ts` (plan-review N17: the guard exposes its comparison so it can be fed test data). The **negative
demonstration is done on in-memory mutated records**, never by editing `task-c.ts`: one-character changes to the block-1 and `userContent`
digests, a changed length, block count, cache flag and master are each shown to fail, and the unread block-0 record is shown not to matter. A
premise test pins that the JSON still holds the pre-Story block-0 digest in all 96 records (so nobody regenerates it). Named under AGENTS.md section
7.7: what the guard stops pinning is the master's bytes for 96 cases by digest (still pinned by the master specs and by the reviewed golden
regeneration); what it newly proves is that block 0 of every Task C description prompt IS the master. Green on arrival and after the master edit.

## Existing tests touched

v1: only `src/prompts/task-c.description-bytes.spec.ts` (T20, above): the per-case test ids keep their `<store> | <lang> | <variant>` prefix and now read
"block 0 is the live master; block 1, cache flags and userContent are byte-equal to the golden"; 100 tests became 108. All other existing specs are
unedited, including the three `figureCaptionWarnings(...)).toEqual([])` pins of `image-placeholder.spec.ts`, `task-a.spec.ts` lines 122/133 and
`master-system-prompt.image-markers.spec.ts` property 6.

v2 (all of them this stage's own files; no pre-Story test touched):
- **F1** `src/utils/image-placeholder.deixis.spec.ts`, "takes an optional locale ...": the English figure is built with `cyrillicCheck: false` (with `true`, `buildFigureParts` discards non-Cyrillic text and the figcaption holds only the file-name fallback, so no implementation could see the English sentence). The assertion is unchanged (`en-GB` finds the English pointer, the Ukrainian pointer is not judged by the English pattern); one premise assertion was added (the English text survives `buildFigureParts`).
- **F2** `src/prompts/vision-prepass.no-picture-references.spec.ts`, NFR-12 key-set: the slice started at the first `{` after `OUTPUT CONTRACT`, which is the quoted `"{"` in "the first character of your output is "{"", so it found no keys; it now starts at the first `{` followed by a quoted key and a colon. Same assertion (`alt, caption, description, label`).
- **Marker group** of `src/prompts/task-a.deixis-wording.spec.ts` and `src/prompts/task-a.user-content.golden.spec.ts`: titles lost the "DEFERRED, H-FR11I3" wording (a rename); new exact-wording tests added next to the v1 ones, which are kept as they were.
- **`test/fixtures/faq-pipeline.ts` (F7)**: see below. **`test/fixtures/us91-constants.ts`**: `PRECEDENCE_SENTENCE` added.
- Header comments of `app.component.operator-notes.spec.ts`, `constants.liveliness.spec.ts`, `master-system-prompt.liveliness.spec.ts`, `description-metrics.spec.ts`, `test/measure-description.cli.spec.ts`, the component spec: DEFERRED paragraphs replaced by the answered-question notes.

### F7: the FAQ-negative helper against the master that will exist after the edits

`test/fixtures/faq-pipeline.ts` `masterPromptBlocks` slices the LIVE master at `0..400` and `3000..3400`. Re-verification, with the numbers measured on the live master (45 387 characters, `indexOf` of each anchor):
`STRICT INPUT SCOPE` 2731, `INTERNAL RECONCILIATION` 3085 (hunk M6 edits both), `[VIDEO]` 2225 / 17110 / 38057 (M3 at `Introduce every embed with a lead-in` 39128), `[IMAGE HANDLING]` 9418 (M2 inserts `${NO_IMAGE_DEIXIS_RULE}` just before it), `IMAGE GROUNDING LOCK` 9735 / 41321 (M4), `PLACEMENT` 43271 and `LEAD-IN: precede every` 43299 (M5),
`[SENTENCE LENGTH]` 27273 (M7 inserts `${LIVELINESS_RULES}` after it).
- Slice `0..400`: no hunk precedes offset 400, so it is byte-identical after the edits.
- Slice `3000..3400`: **the only hunk before it is M6, which edits the text AROUND offsets 2731..3085** (adds the name `[Operator Notes]`, makes "the three input blocks" neutral): the slice moves by the length of those edits (tens of characters) and keeps reading the same STRICT INPUT SCOPE / INTERNAL RECONCILIATION area. M2, M3, M4, M5, M7 are all past offset 9000, so they do not move it.
- Hazard measured, not assumed: a FAQ translation prompt legitimately shares master text. Windows of 400 characters at stride 200 over the whole master hit the FAQ prompt at the `NO LEAKED REASONING` block (around 800..1200) and the unit-localisation tables (5800..7400). The shifted slice stays about 1 800 characters clear of the first shared region and far from the second, so **the fixed slices stay valid** after M6. This is the re-verification against the post-edit master as far as it can be done before the master changes; the FAQ specs must be re-run when T31 (M6) lands, and again after T27..T32 (the builder's T33).
- **Whole-master windows were therefore REJECTED as the extension** (tried first: they fail the existing FAQ specs, 21 failures). The helper is extended with the two checks that cannot false-positive: windows (200 characters, stride 100) over the text the Story ADDS as constants (`NO_IMAGE_DEIXIS_RULE`, `LIVELINESS_RULES`, read through `us91-constants`, skipped while one does not exist), and eleven position-independent literals of the other master edits (`[NO PICTURE REFERENCES`, `PRECEDING PARAGRAPH`, `restricts claims ABOUT THE IMAGE`, the SCENE / HOOK / HONEST LIMITS literals, the precedence and self-scoping sentences, `[Operator Notes]`, the FR-9 `[VIDEO]` sentence). The original slices are kept (extend, never narrow, AGENTS.md section 7.7).
- Evidence the extension discriminates: against the OLD helper a 700-character master fragment at offset 7001 and a 300-character fragment of `NO_IMAGE_DEIXIS_RULE` are NOT reported (run: both tests asserting "old helper returns no problem" passed); against the new helper `test/faq-pipeline.master-leak.spec.ts` reports every 300-character fragment of the rule at stride 37, every literal, the original slices and the whole master (19 of 21 green; the 2 red tests need `LIVELINESS_RULES`, T16). The 760 tests of the FAQ pipeline / standalone / operator-notes orchestrator specs are green with the extended helper.

## Deliberately not unit-tested, and why

- **Model behaviour** (does the model stop pointing at pictures, is the text livelier): no unit test can prove it. Only presence/absence and
  placement of prompt text are tested (Specification note D); the effect is measured by the live runs (AC-11, AC-12; T36, manual, H-OD11).
- **Translator and optimizer drift** (R1a, R1d, R7a): declared residual risk (Specification note G). The only automated artefact is the
  characterization pin that `validateStructuralParity` is blind to sentence changes inside `<p>`; the optional live comparison (T42) is outside the gate.
- **`AppComponent.clearAll()`, `restoreHistory()` and `buildGeneratorInput()` execution**: no spec instantiates `AppComponent` (H-FR41TEST answered: accept the default split, no `AppComponent` TestBed). The call sites are pinned as source text (T12, T13, T38, T39) and what the calls do is executed on `OperatorNotesFormState` (T40).
- **`validateSpecsGrounding` and the SEO / slug / FAQ builders with notes (FR-40 item 3)**: these functions take primitives and have no notes
  parameter by signature (`specs-grounding.ts:153`, `task-b.ts:122`, `task-slug.ts:216`, `task-faq.ts:34`); the behavioural check is the
  end-to-end payload equality of all non-Task-A calls of a whole `generate()` / `generateUaContent()` run with and without notes, on every store.
- **Tasks with no test by nature**: T33 (verification only, re-runs the specs above), T36 and T42 (manual, outside the gate), T41 (conditional
  launcher variant of the CLI spec: returns to TEST_WRITING if the Node check of T35 fails), T10/T21..T32 production edits (tests exist, red).

## DEFERRED and blocked tests (v2: only the manual live runs remain)

| Hn | Status in v2 | Tests |
|---|---|---|
| H-FR41TEST | **ANSWERED** (accept the default split) | written: `operator-notes-form-state.spec.ts` (T40) and the T12 / T13 / T38 / T39 describes of `app.component.operator-notes.spec.ts` |
| H-FR20PREC | **ANSWERED** (proposed sentence accepted exactly as written) | written: `constants.liveliness.spec.ts` (3), `master-system-prompt.liveliness.spec.ts` (7 stores + once in the master) |
| H-FR11I3 | **ANSWERED** (proposed marker wording accepted exactly as written) | written: `task-a.deixis-wording.spec.ts` (new span once, both marker cases), `task-a.user-content.golden.spec.ts` (exact Tier B marker and video+marker equalities) |
| H-OD10 | **ANSWERED** (D-3, D-4, D-5, D-7, D-9 confirmed as written) | written: `description-metrics.spec.ts` (all definitions incl. the D-6 per-section count and the absent-number decision), `test/measure-description.cli.spec.ts` (absent-number exit, input flags) |
| H-OD13 | **ANSWERED** (restated text is normative) | wording latitude beyond the Specification literals is still not asserted anywhere (the literals are the contract) |
| H-OD11 | **ANSWERED, manual by nature** | **T36 and T42: no automated test.** Live acceptance runs use standard catalog items (a generic Bambu Lab product for Center 3D Print, an Anycubic Kobra for 3DDevice); the human QA operator runs the 6 runs manually; split 3 marker-built + 3 non-marker figures. Recorded in the matrix rows AC-11 and AC-12 |
| H-OD12 | FROZEN approvals given (task-a.ts, output-validator.ts, master-system-prompt.ts, per the builder's record) | tests only; no frozen file is touched by this stage |
| H-OD15 | none | no task, no test |

The DEFERRED list is therefore empty except the manual live runs T36 / T42.

## Contracts chosen by TEST_WRITING (not fixed by the Specification) - for reconciliation to see

- `src/utils/description-metrics.ts`: `measureDescription({ html, inputTexts, locale }, { parse, collect })` returning at least `deixisHits`,
  `figuresWithoutParagraphAbove`, `consecutiveFigures`, `connectiveCount` and `hardViolations: string[]`. The plan fixes only "pure functions, parse
  function and collector as parameters, a report plus `hardViolations`".
- `OperatorNotesFieldsComponent`: signal inputs `values` and `labels` (labels keyed by the four `operatorNotes` keys), output `valuesChange` emitting the
  full four-key object; selector `app-operator-notes-fields` (plan D9). Another shape is a loop back, not a builder guess.
- `operator-notes.ts`: names `OPERATOR_NOTE_FIELDS`, `normalizeOperatorNotes`, `buildOperatorNotesBlock`, `toOperatorNotes`, `toFormValues` (plan D8).
- `image-deixis.ts`: `findImageDeixis`, `collectFigureDeixis(html, locale, parse?)`, `collectFigureDeixisFromDocument`, `imageDeixisIssues`,
  `DEIXIS_PATTERNS`; a hit has `carrier` ('paragraph' | 'figcaption' | 'alt') and the matched text (plan D5).
- `figureCaptionWarnings(figures, locale = 'uk-UA')` (plan D6). (The builder defaults to `'uk'` because of an existing NFR-6 pin; the tests never rely on the default's spelling.)
- **New in v2.** `OperatorNotesFormState` (`src/app/operator-notes-form-state.ts`, plan D9 / task T40): `values` a signal of the four string values, `set(values)`, `restore(notes?)`, `clear()`, `inputPart()` returning `{}` or `{ operatorNotes }`; `new` with no argument and no injection context. The tests assert the observable outcomes of the Specification (FR-25, FR-31 items 2/4/5, FR-41) and use these names because the plan and the task breakdown fix them.
- **New in v2, NOT fixed by any approved artifact.** `measureDescription` report keys beyond the v1 four: `sentenceCount`, `meanSentenceWords`, `sigmaSentenceWords`, `hookWordCount`, `shortSentencesPerSection: number[]` (one entry per §3 section, in order) and `absentNumbers: string[]` (reported in the original or the normalised form: the tests compare through the Specification's normalisation).
- **New in v2, NOT fixed by any approved artifact.** CLI flags: the plan says "the four `--notes-*` values" and the Specification says only that the script "accepts, as optional further input texts, the technical specs, the product name and the four operator-notes values" (D-10). The spec chooses `--notes-usage-scenarios`, `--notes-test-results`, `--notes-previous-generation-comparison`, `--notes-limitations`, each a PATH to a text file like `--specs` (while `--name` is an inline string). If the owner prefers inline values or other names, the CLI spec is a few lines to change, and nothing in the metrics core depends on it.

## Assumptions and observations

- **v2 satisfiability checks (scratch copies outside the product code, deleted afterwards):** `operator-notes-form-state.spec.ts` 28/28 against a throw-away reference class (this also confirms that `signal()` works without an injection context under the logic runner); `description-metrics.spec.ts` 59/61 on the first run against a throw-away reference (the two red tests: the leaf-import check, which needs the real file, and one fixture of mine, fixed afterwards: elements glued by `textContent` made «111» and «222» one token; not re-run after the fix); the D-9 grouping characters were aligned with the Specification's character class (space, U+00A0, U+202F; U+2009 is NOT in it, so no test asserts it as a group space); the F6 negatives together with every existing positive and negative: 108/108 against a scratch copy of the detector with minimally narrowed patterns (the open `на|in|auf|en|na + <any word>` tails removed from the participle patterns, `frame` / `clip` / standalone `ролик` / greedy `bild*` `foto*` stems narrowed, and the Portuguese noun `imagem` added to `PT_PICTURE`: the builder's list has only `imagens?` = `imagen(s)`, and its positive «mostrada na imagem» passes today only through the open tail, so the narrowing task must add it). This is a hint for the narrowing task, not a test of production code.
- **Component runner (v2).** `npm run test:components` still cannot bundle: 2 TS2307 diagnostics, for `./description-metrics` (T34) and `./operator-notes-form-state` (T40). The runner is unblocked only when BOTH tasks land (the builder's note F3 named only T34).

- **The Angular components runner cannot compile while the red-by-load logic specs exist.** `ng test` type-checks every spec in the tsconfig; with
  `./image-deixis`, `./operator-notes`, `./description-metrics` and the component missing, the application bundle fails (TS2307) and **no** component
  spec executes. With those six files held aside in a scratch directory (restored afterwards), `npm run test:components` runs the two pre-existing
  component specs: 2 files, 32 tests passed. So the pre-existing component specs are healthy; they are blocked, not broken, until T2, T9, T11 and T34
  create their modules. This is the consequence of breakdown constraint 1 (missing-symbol diagnostics are allowed in later-owner specs) and is the
  same state US-8.1 had; it means `npm test` (both runners) cannot be green until those modules exist.
- The detector spec (86 tests) and the operator-notes leaf spec (22 tests) were checked for satisfiability against throw-away reference
  implementations kept in the scratchpad outside the repository (all passed after fixing four defects in the specs themselves: a default-parameter
  trap, a parser captured after being stubbed away, and a fixture where a figure legitimately had a pointer paragraph above it). The metrics, CLI and
  component specs were not checked this way.
- `FR-16` lists «на фотополімерній смолі» among the accepted candidate false positives of the uk pattern; plan D5 and breakdown T2 treat it as a
  word-boundary negative. The spec follows the (binding) breakdown and asserts it as a negative; if the owner prefers the Specification's reading the
  assertion is a one-line change at reconciliation.
- Plan-review wording corrections applied: N17 (guard exposes its comparison; demonstration on test data), N19 (FR-23 item 1 absence pin has an owner:
  `constants.expert3d.spec.ts`, stay-green through T27..T32), N21 (T1 whole-tree clause recorded as capture-time), N22 (composed HEADINGS parenthetical
  is not asserted). N18 concerns the builder: if T40's `signal()` check ever fails the loop-back key is `blocked_by_architecture`, not
  `changes_required_architecture`.
