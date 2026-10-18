---
artifact: reconciliation_report
story: US-9.1
version: 1
status: DRAFT
owner: so-reconciliation-reviewer
stage: RECONCILIATION
created_at: 2026-10-18T20:27:08Z
updated_at: 2026-10-18T20:27:08Z
supersedes: null
inputs_consumed:
  - {key: story, version: 4}
  - {key: specification, version: 5}
  - {key: ac_test_matrix, version: 3}
  - {key: implementation_report, version: 1}
  - {key: verification_report, version: 1}
  - {key: security_review, version: 1}
open_decisions_blocking: false
---

# US-9.1 Reconciliation Report (branch feat/US-9.1-no-picture-references-and-livelier-descriptions, BASE 6546db8, HEAD 9d8b0c2)

Verdict: **BLOCKED**. AC-1 to AC-10 clear all three levels. AC-11 and AC-12 are live-run criteria that the approved plan makes
manual and owner-run (T36), and that have not been run. They cannot be evaluated by this stage, so they cannot clear a level, and
the skill allows no partial pass. There is no defect to loop back for: nothing is unimplemented, no test is wrong, and the Story is
not mistaken. The blocker is missing owner evidence (listed below). This stage's result is not human approval (AGENTS.md section 10).

## Why BLOCKED and not PASS, and not CHANGES_REQUIRED

- **Not PASS.** AC-11 ("0 deixis hits in the paragraph above each figure, each figcaption and each alt ... on live runs") is the
  criterion that measures whether the Creality Pika regression (35 hits) is fixed. Everything else in this Story proves that the
  prompt text is delivered, the detector works and the script measures. Nothing proves that a model told these things stops pointing
  at pictures. The Story says so itself ("cannot be pinned by a prompt test"). A PASS would read as coverage of the one outcome that
  has never been observed. Earlier reports passed with manual items (US-5.1, US-8.1), but those were sub-clauses of a criterion; here
  two whole criteria, one of them the Story's headline result, have zero evidence.
- **Not CHANGES_REQUIRED.** The loop-back keys under RECONCILIATION are `changes_required` (a criterion lacks an implementation),
  `changes_required_tests` (a criterion lacks a real test) and `story_drift` (the criterion is wrong). None fits. AC-11 and AC-12
  are implemented as far as they can be (script plus prompts) and cannot be given an automated test by nature. Sending the Story
  to IMPLEMENTATION or TEST_WRITING would loop with nothing to do. No key is named, because none applies.
- **BLOCKED** is the lifecycle's state for "not evaluable". It holds the pipeline for a human decision, which is what is needed.
  Two legitimate ways out belong to the owner and are not decided here:
  1. Produce the evidence below. Reconciliation then re-runs on the delta only and is expected to reach PASS. A failing run would
     instead be a reportable defect (`changes_required` to IMPLEMENTATION; per FR-34 a failure is reported, not auto-iterated).
  2. Decide consciously to go to the PR gate without live evidence. That changes the Story's acceptance (for example AC-11 and AC-12
     become post-merge acceptance), so it is a Story amendment (`story_drift` to STORY_WRITING) or an explicit recorded waiver at
     the gate, not something a reviewer may assume.

### Evidence the owner still has to produce (AC-11, AC-12; FR-34, FR-35; OD-11 as amended 2026-10-18T16:26:23Z)

- Six live runs, uk-UA master, **Full description** template, images uploaded (Vision pre-pass on): three products x two runs.
  The products are Creality Pika (EXPERT3D), one Center 3D Print product and one 3DDevice product (a store with no ToV block).
  The Center 3D Print and 3DDevice products are chosen by the QA operator (owner amendment: "I will test on other products"; the
  earlier Bambu Lab / Anycubic Kobra examples no longer bind).
- The split is **3 marker-built and 3 non-marker** runs. A non-marker run has model-authored figures, for which FR-5 alone is the
  prevention (Specification FR-5 coverage note, note H).
- Evidence per run is the output of `node tools/measure-description.ts --html <generated> --input <original description>` with
  `--specs`, `--name` and, when filled, the four `--notes-*` files (D-10: every text given forms the input side of the number
  check). Keep the full output; its first line is `process.version` and it must be Node >= 22.18 (this session: v24.15.0).
- **Pass rule: every one of the six runs exits 0**, which means 0 deixis hits (paragraph above, figcaption, alt), 0 figures without
  a paragraph above, 0 consecutive figures and 0 numbers absent from the input (AC-11 hard, AC-12 hard). A failing run is reported
  with its output and is not iterated automatically.
- Reported per run, non-blocking: soft items (1) "тож" + "Тому" <= 2, (2) mean >= 12 and sigma >= 5.5 as one item, (3) the hook
  names the buyer's task (manual reading), at least 2 of 3. Per-section short-sentence counts are reported with no threshold.
- Manual per AC-12: the operator's fact review (no fact absent from the input) from the list of sentences with numbers and proper
  names the input lacks.
- Optional, outside the gate: T42 (Creality Pika translation comparison) is the only evidence available for the declared
  translator-drift risk (R1a); not required for any AC.

## Evidence (real runs, this session)

- `date -u`: 2026-10-18T20:27:08Z. HEAD `9d8b0c2`. Security review v1 PASS (precondition met). Verification report v1 PASS.
- `npx vitest run` on the 37 spec files the matrix names for AC-1 to AC-10 (plus `test/faq-pipeline.master-leak.spec.ts`):
  **37 files, 1340 tests, 1340 passed.** The component-runner spec `operator-notes-fields.component.spec.ts` was read but **not
  executed** by me (`ng test` was not run); I rely on the gate report (components 3 files, 55 passed) for it.
- All 37 matrix-named spec files exist on this branch (Level 2, by opening each). Grep for `.skip`, `.todo`, `.only`, `xit`,
  `xdescribe`, `skipIf` over `src`, `test`, `tools`: one hit, `describe.skipIf(!LIVE)` in `test/doc-generation-live.spec.ts`, which
  backs no AC (it is the gate's 3 skipped tests). No AC row is backed by a skipped test.
- `grep -nE "toBeTruthy|toBeDefined"` over the 38 matrix-named spec files (the 37 run above plus the component spec): 3 hits, all
  `toBeDefined()` and none the sole assertion of a test: `operator-notes.spec.ts:70` and `:142` are each followed by an exact-value
  assertion (`.usageScenarios?.trim()` is `'Fast prototyping'`; the block bytes `toBe(...)`), and `operator-notes-form-state.spec.ts:50`
  is a presence guard inside a helper whose callers assert the values. No `toBeTruthy()` in any of them.
- Mutation probes, in a throwaway detached worktree at HEAD (node_modules junctioned, mutation applied, specs run, tree reset;
  the worktree was removed and the main tree is unchanged, `git status` shows only the pre-existing docs changes):

| # | Mutation | Specs run | Result |
|---|---|---|---|
| M1 | AC-2: delete the `${NO_IMAGE_DEIXIS_RULE}` interpolation from the master | no-picture-references, task-c reach, optimizer reach, golden.us91 | 43 failed |
| M2 | AC-7: delete the `imageDeixisIssues` push in `validateGeneratedHtml` | output-validator.image-deixis | 4 failed |
| M3 | AC-8: delete the FR-20 self-scoping sentence from `LIVELINESS_RULES` | constants.liveliness, task-c reach, master liveliness | 44 failed |
| M4 | AC-9 / FR-41: delete `operatorNotesState.clear()` from the `ua-generator` case only | app.component.operator-notes | 1 failed |
| M5 | AC-9 / FR-31: delete `operatorNotesState.restore(...)` from `restoreHistory` | app.component.operator-notes | 2 failed |
| M6 | AC-9 / FR-30: drop the notes from `numericFidelitySources` | content-orchestrator.operator-notes | 4 failed |
| M7 | AC-9 / FR-26: put the `[Operator Notes]` block after the image block | task-a.operator-notes | 42 failed |
| M8 | AC-1 / FR-3: delete the Vision grounding sentence | vision-prepass.no-picture-references | 1 failed |

Every probe turns at least one named test red, so those tests would fail if the criterion were violated.

## Three-level check per criterion

L1 = a matrix row exists. L2 = the named file and test exist (opened). L3 = the body was read and a violation of the criterion
would fail it.

| AC | L1 | L2 | L3 | What the tests actually assert (read) |
|---|---|---|---|---|
| AC-1 | yes | yes | yes | `vision-prepass.no-picture-references.spec.ts` builds the real prompt. FR-1 literals (9) and FR-2 literals (5) are scoped to the UKRAINIAN FIELDS block, so a hit elsewhere in the prompt cannot satisfy them. The Grounding sentence is scoped to the Grounding section (M8 red). `says what the image shows` is asserted absent. `one sentence`, `differ`, `NUMBERS ARE THE HIGHEST-RISK ELEMENT` and the JSON key set are kept. It proves the prompt instructs; model obedience is AC-11, as the AC wording ("instructs") allows. |
| AC-2 | yes | yes | yes | The constant (`constants.no-image-deixis.spec.ts`), its single interpolation outside `[IMAGE HANDLING]` with the heading unique at a line start and every other occurrence being the FR-7 pointer (`master-system-prompt.no-picture-references.spec.ts`, M1 red), and for all 7 stores block 0 equals the master. `SUBSTANTIVE NARRATIVE SENTENCE`, `shown here`, `The image below shows` are absent (placement and grounding-lock specs). The SPACING sentence "narrative `<p>` directly above it" is kept. The FR-7/8/9 literals are asserted per block. The v3 matrix change (heading-once instead of prefix-once) is sound: FR-7 requires the second occurrence. |
| AC-3 | yes | yes | yes | Each named text is asserted for new wording present and old wording absent: Doc FIGURE PLACEMENT, `TASK_A_INSTRUCTION` (`</ul>` clause), `buildVideoBlock` new span VERBATIM x4 inputs with no pointer word, `buildMarkerBlock` new span VERBATIM exactly once, C3D OVERRIDE #5, `image-manifest-missing`, `video-embed-missing`, both orchestrator warnings x every plain-HTML store (through the real orchestrator with a mock model). Pinned phrases (`no orphan images`, `Do not place a <figure> directly after a </ul>`, `§3 FUNCTIONALITY, before §7`) are asserted kept. The `userContent` golden proves the video and marker spans are the only `userContent` change. `IMAGE GROUNDING LOCK stands` is asserted in `NUMERIC_SOURCE_FIDELITY_RULES`, unedited. |
| AC-4 | yes | yes | yes | All 7 languages are rendered through `restoreMissingVideos` and checked for the 7 pointer words (case-insensitive), the product name, primary-subtag lookup and the English fallback. A second spec requires `findImageDeixis(...) === null` for each rendered template. |
| AC-5 | yes | yes | yes | The 3 required uk positives and 2 negatives, 2+2 for each of ru, en, pl, de, es, pt, `en-ES`/`en-US`/`en-GB` to en, `es-MX` to es, unknown language and omitted locale to `null`, never throws. The 11 F6 precision negatives guard against over-matching (each asserted on `findImageDeixis` and on the figure-adjacent carrier path). `DEIXIS_PATTERNS` keys are pinned to the `STORE_REGISTRY` languages. |
| AC-6 | yes | yes | yes | Paragraph, figcaption and alt each reported with the right carrier. The same phrase in a non-adjacent paragraph, behind a heading, `<hr>`, `<ul>`, `<table>` or another `<figure>`, and as the first child, is not reported. The video figure counts and the iframe title is not read. One hit per carrier instance. |
| AC-7 | yes | yes | yes | `validateGeneratedHtml` itself emits `image-deixis` at `warning` for the paragraph carrier in uk and en (M2 red), does not fire for «нижче -10 °C» outside a figure context, and does not fire for the figcaption or alt carriers (carrier table). `figureCaptionWarnings` emits `image-caption-deixis` at `warning`, once per figure, and the warning reaches `report.warnings` and `validateDroppedPlaceholders`. No repair strategy exists for either rule (NFR-12). |
| AC-8 | yes | yes | yes, with a declared residual | (a) One shared constant `LIVELINESS_RULES` interpolated once, reaching `systemBlocks[0]` of all 7 stores, with SCENE/RHYTHM/HONEST LIMITS/HOOK literals, the precedence sentence VERBATIM once, no digit range and no sentence-length number other than 6. (b) FR-22 literals in `EXPERT3D_TOV_BASE_OVERLAY` only; absent from the C3D overlay, the master, `task-c.ts`, `task-translate.ts` and every other string constant; `never bare noun` used nowhere. (c) Tone limits kept for both overlays. (d) **Story-v4 sentence checked against built payloads**: for 16 store/language pairs x with/without opts, Task C block 0 is the live master and carries `[NO PICTURE REFERENCES`, the liveliness block and the three self-scoping strings, while block 1 and `userContent` do not (task-c.master-reach). For the 6 optimizer inputs, block 0 is the master with both constants, and block 1 and `userContent` are digest-equal to the pre-change capture (optimizer.master-reach, payload-oracle.d15). The Task C FAQ variant (48 cases) and `buildTranslatePrompt` carry no master text. `task-c.ts`, `task-translate.ts`, `optimizer.ts` have an empty diff, and the three `.arch-guard-checksums` lines that changed are exactly `task-a.ts`, `master-system-prompt.ts`, `output-validator.ts`. (e) The self-scoping sentence is pinned VERBATIM in the constant, in the master and in block 0 of Task C and the optimizer (M3 red). Residual: translator and optimizer behaviour under the shared block is untestable in the gate (see N1). |
| AC-9 | yes | yes | yes, with two declared gaps | Four textareas in en and uk (labels, order, not required, no placeholder, emits the full 4-key object untrimmed). `operatorNotes` carrier type. The block text and bytes are asserted independently of the implementation (a local `expectedBlock`) over 11 inputs x 4 note sets at the FR-26 offset, with nothing else changed (M7 red). Empty object / undefined / empty strings / whitespace give `userContent` byte-equal to the pre-change golden (Tier A, 24 inputs x 5 empty shapes). The notes never enter `supplementalContent`, and no FAQ call is made in either mode for 7 stores with a control showing the FAQ detector is not blind. `STRICT INPUT SCOPE` names `[Operator Notes]`, and "three input blocks" is gone. A number only in each of the 4 notes passes the gate (M6 red), and a `supplementalContent`-only number is not grounded. `NUMERIC_SOURCE_FIDELITY_RULES` is pinned by sha256 to the pre-Story text. History round-trip, and restore/resend/empty-entry/clear are asserted on the state class (28 tests) plus call-site pins (M4, M5 red). `seo_gen_form_state` keeps exactly 5 keys. `runFaqPipeline` and `faq-form.ts` have an empty diff. Gaps: N2 (FR-40 item 3) and N3 (FR-41 wording). |
| AC-10 | yes | yes | yes | `description-metrics.spec.ts` asserts D-1 to D-9 with hand-computed values (mean/sigma on 2,4 and 1,1,1,5; word and sentence boundaries; number normalisation; the absent-number rule) and the hard-violation decision. `measure-description.cli.spec.ts` spawns the real script: first line `process.version`, exit 0 on a clean document, non-zero for each of the 3 deixis carriers, a figure without a paragraph above, consecutive figures and an absent number. Soft items never change the status. Empty or unreadable input fails visibly on stderr. Negative cases cannot pass vacuously (they also require the report header). |
| AC-11 | yes | n/a | **no evidence** | Matrix row says "no automated test by nature, manual T36". The script (AC-10) is its instrument and is verified. No run exists. **BLOCKER.** |
| AC-12 | yes | n/a | **no evidence** | Same. The hard half is mechanised by the script's absent-number exit (verified under AC-10); the soft items and the fact review are manual. No run exists. **BLOCKER.** |

## Drift from the approved Specification

- **FRs silently dropped: none.** FR-1 to FR-41 each map to a production change or a verified preserve-only constraint. FR-36 to FR-39
  (section 4 preserve-only) are guarded by the retained `no orphan images`, SPACING, video and `meta-description-currency` pins; the
  verifier checked the latter two against the diff.
- **Behaviour changed during coding: none found.** The FROZEN hunks equal the Specification and plan text (verification report section
  5, re-checked against `git diff`). The built `LEAD_IN_TEMPLATES` differ in wording from the FR-15 illustration, which FR-15 allows
  ("the plan may choose other pointer-free sentences").
- **Scope added: none found against the Out of scope list.** 19 source files plus `.arch-guard-checksums` (the verifier's "20 production files"), each traceable to an FR. Not touched, as required:
  `runFaqPipeline`, `faq-form.ts`, `task-b.ts`, `task-c.ts`, `task-translate.ts`, `optimizer.ts`, `server/**`, `package.json`.
  No `alt` warning in the validator (carrier table). `image-deixis` stays `warning`. One small point, N6.
- **Reinterpreted criteria: none that weaken an AC.** The two places where tests are weaker than the Specification's wording are
  FR-41 "invoke Clear All" (N3) and FR-40 item 3 (N2); both are declared and owner-accepted or by-construction, and described
  precisely below.

## Declared gaps, evaluated (not waved through)

- **N1. AC-8 residual translator and optimizer drift (R1a, R1d, R7a). Accepted as declared; non-blocking.** The AC-8 sentence as
  amended in Story v4 is file-level plus inheritance plus a self-scoping sentence, and every part of that is pinned. What no test can
  show is that a translator obeys "the source's sentences ... are kept" (a sentence added, split or dropped inside a `<p>` is
  invisible to `validateStructuralParity`, pinned as such by `structural-parity.sentence-blind.spec.ts`), or that the optimizer
  reads `[NO PICTURE REFERENCES` sensibly next to its own "lead-in" figcaption instruction. The self-scoping sentence lowers the
  risk. The only evidence is the optional T42 run. Recommendation for the human: run T42 for one product alongside the AC-11 runs.
- **N2. FR-40 item 3 (spec grounding), no behavioural test. Accepted; non-blocking.** I checked the structure the matrix relies on:
  `validateSpecsGrounding` and `validateSpecsGroundingDoc` take `(html|doc, sourceSpecs, context, ...)` and have no notes parameter,
  and the only production readers of `operatorNotes` are `buildPromptA` (via `buildOperatorNotesBlock`), `numericFidelitySources`,
  the form, the state class and `types.ts`. So the requirement holds today. It is not guarded: a future change that passed notes
  into spec grounding would not turn a test red. Payload equality (SEO, slug, FAQ and translation prompts identical with and without
  notes, x2 modes x7 stores) covers the prompt half of item 3 only.
- **N3. FR-41 "invoke Clear All". Accepted split; non-blocking, stated precisely.** The Specification (v5) test text says
  "invoke 'Clear All' ... assert that the four values are empty and that the input built ... has no `operatorNotes` key". No test
  executes `AppComponent.clearAll()`. What stands in for it: (a) `OperatorNotesFormState` behaviour tests (28), including
  `clear()` after fill, `clear()` after `restore()`, and the empty-form `inputPart()` having no key; (b) source-text pins that
  `clearAll()` contains `operatorNotesState.clear()` exactly once inside each of the `generator` and `ua-generator` case slices,
  that the slices are disjoint, and that no other mode mentions the state, with the slicing helper self-tested on seven synthetic
  sources so a pin that passes with one case edited does not exist (M4 confirms: removing the call from `ua-generator` only turns a
  test red); (c) pins that `buildGeneratorInput` spreads `operatorNotesState.inputPart()` and `restoreHistory` calls `restore(...)`.
  Together they prove that each link of the chain exists and that each link behaves; they do not prove that the chain runs in the
  app. A call that is commented out inside the slice would satisfy the text pin (not probed). The owner accepted exactly this split
  (H-FR41TEST, `history.jsonl` 2026-10-18T15:35:15Z: "accept the default split"). The approved Specification text was not amended to
  match, so the record is: Specification says "invoke", owner decision says "accept the split".
- **N4. FR-34's inference ("0 under reading B implies 0 under reading A"). Sound; one caveat for AC-11.** Reading B counts the
  paragraph carrier of all 20 figures plus every figcaption plus every alt, which is a superset of reading A (19 paragraphs plus 16
  figcaptions), so 0 under B implies 0 under A. The caveat is the detector, not the inference: "0 hits" is relative to the
  per-language patterns the owner accepted as built (OD-7), which are known to miss forms such as «Рекламний банер, на якому…» and
  to be narrower than the Story's prose «посилання на картинку». A run can therefore exit 0 and still contain a picture reference
  the detector does not know. The operator's fact review is the only check on that, and the owner should read the figcaptions of
  the six runs, not only the exit codes.
- **N5. The matrix is a historical document in its State column.** Rows read RED, RED (load) or "guard" as observed at `6546db8`,
  `8a7a55b` and `c24d974`; every one of those tests is green at HEAD (1340 of 1340). It is documentation staleness, not a coverage
  gap. The row content (file, test, what is asserted) is accurate where I checked it against the files.
- **N6. Two small observations, not scope creep.** (i) The script reuses `collectFigureDeixisFromDocument`, the document-level core
  that `collectFigureDeixis` wraps, rather than the string entry point named in AC-10, because the CLI injects a `linkedom` parser;
  a test asserts the two agree. (ii) The EXPERT3D overlay edit removed the old sentence "In Applications, every entry states a
  concrete scenario plus what makes THIS product the right tool (the differentiator vs alternatives), never just the industry
  name" and replaced it with the APPLICATIONS rule. FR-22 says the overlay "gains" the rule and "one existing line ... is amended";
  the rewritten Applications sentence is a second existing line. The meaning is kept ("never just the industry name" stays; the
  phrase "differentiator vs alternatives" is dropped). No test pinned the old sentence. For the human's awareness only.
- **N7. The amended Task C guard.** `task-c.description-bytes.spec.ts` was changed from digest-pinning block 0 to comparing block 0
  with the live master (owner decision Q1, option b, named in the file per AGENTS.md 7.7). Block count, cache flags and the
  block 1 and `userContent` digests of all 96 cases are still pinned, the golden JSON is byte-unchanged (empty diff), and a
  negative demonstration on test data shows the guard still fails on a one-character change. This is the decided outcome of FR-23,
  not a weakening.
- Items outside this stage, recorded by other reviewers and not repeated here: the FROZEN-grant timing note (verification F1) and the
  CLI's hard-coded `uk-UA` default (verification F2).

## Summary

- Levels 1 to 3: AC-1 to AC-10 clear. Eight mutation probes and 1340 passing tests back that.
- AC-11 and AC-12: no evidence exists, by design of the plan. Verdict BLOCKED until the owner produces the six-run evidence above
  or records a decision on how the Story's acceptance is to change.
- This verdict is not human approval.
