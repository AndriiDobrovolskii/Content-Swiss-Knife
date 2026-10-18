---
artifact: test_strategy
story: US-9.1
version: 1
status: DRAFT
owner: so-test-writer
created_at: 2026-10-18T15:10:00Z
updated_at: 2026-10-18T15:10:00Z
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
open_decisions_blocking: false
---

# Test Strategy - US-9.1: no picture references, livelier descriptions (track prompt)

TEST_WRITING for Story US-9.1, run on branch `feat/US-9.1-no-picture-references-and-livelier-descriptions` at HEAD `6546db8`
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
- **No weakening.** One existing spec was amended (T20, named under "Existing tests touched"); no other existing test was edited, skipped,
  `todo`-ed or excluded; no coverage config touched.

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
| Wiring pins | logic (source text) | label strings, single placement outside the Expert-3DPrinter image block, no join into `supplementalContent`, no `seo_gen_form_state` write | `app.component.operator-notes.spec.ts` |
| Component | components (`*.component.spec.ts`) | four labelled textareas (en, uk), optional, emits the full four-key object | `operator-notes-fields.component.spec.ts` |
| Metrics and CLI | logic | confirmed metrics (D-1, D-2, D-8), hard-violation decision, spawn test (exit codes, `process.version` first line, failure paths) | `description-metrics.spec.ts`, `test/measure-description.cli.spec.ts` |
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

Only `src/prompts/task-c.description-bytes.spec.ts` (T20, above): the per-case test ids keep their `<store> | <lang> | <variant>` prefix and now read
"block 0 is the live master; block 1, cache flags and userContent are byte-equal to the golden"; 100 tests became 108. All other existing specs are
unedited, including the three `figureCaptionWarnings(...)).toEqual([])` pins of `image-placeholder.spec.ts`, `task-a.spec.ts` lines 122/133 and
`master-system-prompt.image-markers.spec.ts` property 6. The FAQ-negative positional slices of `test/fixtures/faq-pipeline.ts` (`0..400`,
`3000..3400`) are **not** edited: they cannot be re-verified against a master that has not changed yet, so they are handed to the builder (T27..T32,
T33) with the instruction to extend, never narrow, them; the D15 oracle and `task-c.master-reach.spec.ts` give an independent "no master fragment in
the FAQ variant" check that does not depend on those offsets.

## Deliberately not unit-tested, and why

- **Model behaviour** (does the model stop pointing at pictures, is the text livelier): no unit test can prove it. Only presence/absence and
  placement of prompt text are tested (Specification note D); the effect is measured by the live runs (AC-11, AC-12; T36, manual, H-OD11).
- **Translator and optimizer drift** (R1a, R1d, R7a): declared residual risk (Specification note G). The only automated artefact is the
  characterization pin that `validateStructuralParity` is blind to sentence changes inside `<p>`; the optional live comparison (T42) is outside the gate.
- **`AppComponent.clearAll()`, `restoreHistory()` and `buildGeneratorInput()` execution**: no spec instantiates `AppComponent`; see DEFERRED below.
- **`validateSpecsGrounding` and the SEO / slug / FAQ builders with notes (FR-40 item 3)**: these functions take primitives and have no notes
  parameter by signature (`specs-grounding.ts:153`, `task-b.ts:122`, `task-slug.ts:216`, `task-faq.ts:34`); the behavioural check is the
  end-to-end payload equality of all non-Task-A calls of a whole `generate()` / `generateUaContent()` run with and without notes, on every store.
- **Tasks with no test by nature**: T33 (verification only, re-runs the specs above), T36 and T42 (manual, outside the gate), T41 (conditional
  launcher variant of the CLI spec: returns to TEST_WRITING if the Node check of T35 fails), T10/T21..T32 production edits (tests exist, red).

## DEFERRED and blocked tests (nothing here chooses an answer or assumes a default)

| Hn | Blocks tasks | Tests NOT written | Written without the answer |
|---|---|---|---|
| H-FR41TEST (Q-FR41-TEST) | T12, T13, T38, T39, T40 | `OperatorNotesFormState` behaviour spec (T40: clear, restore with / without notes, resend, empty-rule form side); `buildGeneratorInput` spreads `operatorNotesState.inputPart()` (T13); `restoreHistory` calls `operatorNotesState.restore(...)` (T38); both `clearAll` cases call `operatorNotesState.clear()` over disjoint slices plus the slicing-helper self-test (T39); binding of the component to the state object (T12). Any of them would adopt the plan's default split (or reject it for an `AppComponent` test or a bare signal) for the human. | State-independent subset only: the eight label strings, single placement outside the Expert-3DPrinter image block and without template conditions, no join into `supplementalContent`, no `seo_gen_form_state` write; the component spec (T11); the leaf module (T9); history round trip (T8); FAQ isolation; numeric fidelity |
| H-FR11I3 | T23 | exact new `buildMarkerBlock` span, and the exact Tier B marker equality (golden with old span replaced by the new) | old span absent; surrounding text unchanged (prefix and suffix equality); marker block rules intact |
| H-FR20PREC | T16 | the precedence sentence `where a store voice block defines its own bullet form, heading form, tone or punctuation limits, that block wins` | every other FR-20 literal, the self-scoping sentence, Assert-absent as the Specification words it |
| H-OD10 | T34 (and T35 through it) | D-3 (word), D-4 (prose block and sentence), D-5 (mean, sigma), D-7 (hook), the D-9 half (number token, "absent from the input"), the per-section short-sentence count of D-6, the "number absent" exit status, the names of the four `--notes-*` flags | D-1, D-2, D-8, the hard-violation decision for deixis / figure without paragraph / consecutive figures, soft items never change the status |
| H-OD11 | T36, T42 | none (manual by nature) | - |
| H-OD13 | T5, T6, T7, T14, T16, T17, T18, T19, T25, T36 | wording latitude beyond the Specification literals is not asserted anywhere | all Assert-present / Assert-absent literals the Specification fixes |
| H-OD12 | T21..T32 | none missing: all twelve frozen-hunk tasks have their tests, red | tests only; no frozen file touched, not even temporarily |
| H-OD15 | none | no task, no test | - |

## Contracts chosen by TEST_WRITING (not fixed by the Specification) - for reconciliation to see

- `src/utils/description-metrics.ts`: `measureDescription({ html, inputTexts, locale }, { parse, collect })` returning at least `deixisHits`,
  `figuresWithoutParagraphAbove`, `consecutiveFigures`, `connectiveCount` and `hardViolations: string[]`. The plan fixes only "pure functions, parse
  function and collector as parameters, a report plus `hardViolations`".
- `OperatorNotesFieldsComponent`: signal inputs `values` and `labels` (labels keyed by the four `operatorNotes` keys), output `valuesChange` emitting the
  full four-key object; selector `app-operator-notes-fields` (plan D9). Another shape is a loop back, not a builder guess.
- `operator-notes.ts`: names `OPERATOR_NOTE_FIELDS`, `normalizeOperatorNotes`, `buildOperatorNotesBlock`, `toOperatorNotes`, `toFormValues` (plan D8).
- `image-deixis.ts`: `findImageDeixis`, `collectFigureDeixis(html, locale, parse?)`, `collectFigureDeixisFromDocument`, `imageDeixisIssues`,
  `DEIXIS_PATTERNS`; a hit has `carrier` ('paragraph' | 'figcaption' | 'alt') and the matched text (plan D5).
- `figureCaptionWarnings(figures, locale = 'uk-UA')` (plan D6).

## Assumptions and observations

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
