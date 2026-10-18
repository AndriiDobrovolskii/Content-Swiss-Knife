---
artifact: implementation_plan
story: US-9.1
version: 4
status: APPROVED
owner: so-planner
created_at: 2026-10-17T16:24:35Z
updated_at: 2026-10-18T10:40:24Z
supersedes: docs/plans/US-9.1-implementation-plan.md#3
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: open_decisions
    version: 4
  - key: impact_analysis
    version: 4
open_decisions_blocking: false
---

# Implementation plan: US-9.1 (no picture references, livelier descriptions)

> **Change note, v3 to v4 (revision run, re-baselined on Specification v5 `APPROVED`, Story v4, Open Decisions v4, Impact analysis v4).**
> v3 went to the plan gate; the gate was **not** approved (history event "Plan gate NOT approved", 2026-10-18T10:08Z, sbruhov@gmail.com).
> The owner's answers (verbatim in that event; recorded in Open Decisions v4 "Plan-level answers") were applied upstream first
> (Open Decisions v4, Specification v5 re-reviewed and approved, Impact analysis v4). Plan-review v2 (N10 to N16) is context, not an
> input. Every answer below is **DECIDED (decided by owner 2026-10-18)** and is no longer an open question. What changed, each change
> mapped to its source:
>
> | # | Change in this plan | Source |
> |---|---|---|
> | 1 | **FR-20 self-scoping literal** is now `These rules govern writing a new description; when the task is to translate an existing text they do not apply, and the source's sentences and their order are kept.` The old clause "headings and order" is gone; the three Assert-present strings are `govern writing a new description`, `when the task is to translate an existing text they do not apply`, `the source's sentences and their order are kept`. D0.5, D0.6, D4, D7, D13 category 19, R1d, Appendix C updated; Q-SCOPE is closed | Q-SCOPE (owner); Spec v5 FR-20; plan-review N10 ("FR-20 wording governs") |
> | 2 | **N10 wording.** The FR-20 Assert-absent is "no *sentence-length* number other than `6`" (plus `9-17`, `9–17`, `at most two consecutive`, `two consecutive sentences` and a digit-range-plus-`word` expression). `§1`, `§3` and `<h2>` in the required literals are not sentence-length numbers, so the earlier "no digit" formulation (D7, D13 categories 1 and 19, and the breakdown's T16/T32 rows) is withdrawn | Plan-review N10 (binding); Spec v5 FR-20 |
> | 3 | **Task C guard, Q1 option (b) is DECIDED**: block 0 is compared with the live `MASTER_SYSTEM_PROMPT`; block 1 and `userContent` stay pinned per case; **the per-case block count and block 0's `cache` flag stay pinned** (no reason to drop them); `task-c-description-prompts.json` stays byte-unchanged (its block-0 `sha256`/`length` become unread, named as risk R24). The amended guard is green against the current master and stays green after the master edit, so v3's "same commit as the master edit" sentence and the option (a) text are removed (option (a) is now a rejected alternative) (D0.2, D11, D13 categories 7 and 16, Files, R1, R1b, R24) | Q1 (owner); Spec v5 FR-23 and note F; impact v4 risks 16 and 21; plan-review N13 (now moot) |
> | 4 | **FR-41 designed**: "Clear All" resets the operator-note textareas in the `generator` and `ua-generator` cases. The notes state moves into a small plain class (`OperatorNotesFormState`) so the empty-values, restore and clear chains are behaviour-tested in the logic runner; the two `clearAll` call sites get pins over disjoint per-case slices that cannot pass with only one case edited (D9, D13 categories 11 and 21, Files, R23). Whether call-site pins satisfy FR-41's "invoke Clear All" wording is the one new open question (Q-FR41-TEST) | Q-CLEARALL (owner); Spec v5 FR-41; impact v4 risk 20, Unknown 17 |
> | 5 | **OD-2 R1/R2 decided**: the restored notes are resent on the next click; an entry without notes empties the four textareas. The `restoreHistory` line is no longer waiting (D8, D9) | OD-2 (owner); Spec v5 FR-31 items 4, 5 |
> | 6 | **OD-19 decided**: the Doc instructions do **not** mention `[Operator Notes]` (Assert-absent pin over `TASK_A_DOC_INSTRUCTION` and the simplified Doc instruction texts); Expert-3DPrinter **does** receive and render the notes (D8, D13) | OD-19 (owner); Spec v5 FR-26, FR-40 |
> | 7 | **OD-20 decided**: `NUMERIC_SOURCE_FIDELITY_RULES` text not extended; `supplementalContent` not added to `numericFidelitySources`; the script input set is D-10 (D8, D12) | OD-20 (owner); Spec v5 FR-30, FR-32 |
> | 8 | **Q-OPT option (1) DECIDED, R7a softened**: the optimizer's "lead-in" is the figcaption `<b>` label, not a lead-in `<p>`; the optimizer inherits PLACEMENT and `[NO PICTURE REFERENCES` through block 0. The "contradiction" wording is withdrawn (D7, R7, R7a, rejected alternative 15) | Q-OPT (owner); impact v4 risk 15 restatement |
> | 9 | **Q-TRANS options (1)+(3) DECIDED**: the residual risk stays declared; the documentation-only characterization pin of `validateStructuralParity` is now **unconditional** (D13 category 18); an optional live translation comparison for Creality Pika outside the gate is recorded (D13 category 22) | Q-TRANS (owner); Spec v5 note G |
> | 10 | **Q-CODEALT "no"** (the detector does not match the code-authored `Фото:` / `Зображення товару:`; `ALT_PREFIX`/`FALLBACK_LABEL` untouched) and **Q-SIMPL "no"** (the simplified Doc templates and the optimizer are not edited; `SIMPLIFIED_TRANSLATION_CLAUSE` stays byte-identical) (D5, D7) | Q-CODEALT, Q-SIMPL (owner) |
> | 11 | **OD-7, OD-8, OD-14, OD-18 accepted as built**; D-1, D-2, D-6, D-10 confirmed (D5, D12, D14) | OD-7/8/14/18 (owner); Spec v5 FR-16, FR-17, FR-32, FR-34, FR-27 |
> | 12 | **OD-9 condition planned**: verify Node >= 22.18 first (the repository pins no Node version), print `process.version` in the report, build the D12 launcher only if the check fails (D12, R12) | OD-9 (owner); impact v4 hazard 6, Unknowns 4, 18 |
> | 13 | **OD-11 partly decided**: three products x 2 runs, every run passes the hard criteria, the runs include a non-marker run, evidence = script output, a failure is reported and not auto-iterated (D13 category 14, R4). Which products, who runs and the marker/non-marker split stay open | OD-11 (owner); Spec v5 FR-34 |
> | 14 | **OD-12 intent recorded as intent only**: `task-a.ts` T-A4 first, then `output-validator.ts`, then `master-system-prompt.ts` last, one commit per task with `bash arch-guard.sh --rebaseline` in the same commit. The AGENTS.md section 9 "modify <filename>" instruction is **not given**; it will be given per file in the editing session; every FROZEN hunk stays blocked until then. This plan decides no task order | OD-12 intent (owner) |
> | 15 | **N14**: one general no-weakening rule for every refused FROZEN item (FROZEN-file position, "Refusal rule"); the master hunk M6 (FR-29, which makes the master name `[Operator Notes]`) **depends on** T-A4 (breakdown v2: T31 depends on T21). M6 and FR-41 are added to the refusal table | Plan-review N14; owner Findings line |
> | 16 | **Impact risk 22** (the FR-29 edit makes block 0 of Task C description translation and of the optimizer name `[Operator Notes]` although their `userContent` never carries it): consequence (6) of the master request, risk R22, test in D13 category 9 | Impact v4 risk 22 |
> | 17 | **Housekeeping.** N11: `content-orchestrator.faq-standalone.spec.ts` added to D11, D13 category 17 and the NFR-9 trace. N12: stale prose about Specification v4 states and "PROPOSED DEFAULT" labels corrected. N13: moot (option (a) removed). N15: the OD-13 (rest) residue now lists every plan item that takes wording latitude from it. N16: fixtures record "the commit the Story branch was cut from" (currently `6546db8`), decided by the owner (D14, D15). The breakdown-side fixes (T16/T32 text, T20, the H-OD13 register row, T1/T37 checks) belong to the task breakdown's own re-baseline and are **not** done here | Plan-review N11 to N16; owner Findings line and Branch answer |
>
> Nothing here grants a FROZEN-file approval; no per-file "modify <filename>" instruction exists in any session. No task order is decided
> here. The task breakdown (v2) is not touched and needs its own re-baseline.

> **History, change note v2 to v3 (kept in its own version's voice; superseded where the v4 note says so).** v2 was returned
> `CHANGES_REQUIRED` by PLAN_REVIEW v1 (blocker B1: Story AC-8 / FR-23 against the shared master). The Specification (v4) and the
> Impact analysis (v3) were revised and v3 re-baselined on them: FR-23 became a requirement at file and payload level (Q-SPEC23 closed);
> the NFR-9 list was adopted (D11) with three impact additions (property 6 as live oracle, two watch items, the tripwire
> `simplified-template-blocks.ts`); the FR-20 self-scoping sentence was planned as a requirement with three Assert-present strings
> (D0.5, D13 category 19); the optimizer's missing pre-change oracle got D15 and category 20; plan-review N1 to N4 and N9 were folded in
> (Appendix A lower-case literal, textarea and history work gated on `task-a.ts` T-A4, `clearAll` as a question, the neutral
> `toFormValues`, translator drift as a declared residual risk).

> **History, change note v1 to v2 (kept in its own version's voice).** v1 was returned `CHANGES_REQUIRED` (`changes_required_impact`)
> because impact analysis v1 missed that `src/prompts/task-c.ts` `pack()` and `src/prompts/optimizer.ts` embed the FROZEN master as
> `systemBlocks[0]`. v2 re-baselined on impact v2: three payload consumers of the master (Task A, Task C description translation,
> optimizer); 96 cases of `task-c-description-prompts.json` move at block 0 only and 10 of 12 cases of `full-description-prompts.json`
> at block 0; the section 9 request for the master names Task C and the optimizer; consumer tests (categories 16 to 18) and the
> silent-failure risks R1a, R1b, R1c, R7a were added.

## Approach

The Story is a prompt-track change with a code tail. The prompt half removes every instruction that teaches the model to point
at a picture and adds one shared, cached rule that forbids it. The rule text is a new constant in `constants.ts` interpolated
into the frozen master prompt, outside the `[IMAGE HANDLING]` span that an existing spec pins. The Vision pre-pass, the Doc
FIGURE PLACEMENT paragraph, the C3D override, the video lead-in templates, the validator repair messages and two orchestrator
warnings are edited in place. A second shared constant carries SCENE, RHYTHM, HONEST LIMITS and HOOK; EXPERT3D alone gets two
overlay rules (APPLICATIONS, HEADINGS) and one amended overlay line. The code half is a dependency-free detector module
(`image-deixis.ts`) that returns its own hit type and is called from three places: `collectFigureDeixis` (the three carriers),
`figureCaptionWarnings` (figcaption) and one call inside the frozen `validateGeneratedHtml` (paragraph above a figure). The
operator-notes feature is a vertical slice around a new optional `ProductInput.operatorNotes`: a leaf module owns the empty
rule and the `[Operator Notes]` block, and the frozen `task-a.ts` gets one import and one interpolation, so FR-27 (byte
identity when empty) holds by construction. A small standalone component renders the four textareas; the parent holds the notes in
one small plain state class (`OperatorNotesFormState`) whose `restore`, `clear` and input-part methods carry FR-31 items 4 and 5, FR-41
and the FR-25 form side, so they are behaviour-tested without an `AppComponent` spec. Metrics and the hard-violation decision live in
`src/utils` (reached by lint and coverage); `tools/measure-description.ts` is a thin CLI. Frozen-file edits are kept to the smallest
hunks that satisfy the text the Specification pins, and every frozen hunk is itemised below so the human can approve or refuse it
separately. Because the master is a single shared constant, the prompt half reaches three prompt families (Task A, Task C description
translation, optimizer) even though only Task A is the Story's subject; the owner accepted that (Q1) and D0 states what it means for
goldens, guards and risks. The Task C digest guard is amended so that block 0 is compared with the live master while block 1,
`userContent`, the block count and block 0's cache flag stay pinned per case. The liveliness constant also carries the FR-20
self-scoping sentence, so the same cached block 0 tells a translator and the optimizer that the rules are for authoring; whether that is
enough is not provable by any gate (declared residual risk). Because two of the three payload families (the optimizer and the Task C
FAQ variant) have no pre-change byte oracle, a digest capture from the unmodified tree is part of the plan (D15), and the operator-notes
half, including FR-41 and the master's `[Operator Notes]` naming (M6), is gated on the `task-a.ts` approval so that no inert textarea
and no dangling master sentence can ship (D8, D9).

## D0. The master prompt is a Task A, Task C and optimizer input (impact v4, Specification v5 FR-23)

`task-c.ts` `pack()` (line 89) builds `systemBlocks: [MASTER_SYSTEM_PROMPT, instruction]` for description translation, and
`optimizer.ts` `buildOptimizerPrompt` (lines 115-127) puts `MASTER_SYSTEM_PROMPT` in `systemBlocks[0]`. Both files are untouched;
the master is not. The pre-Story master hashes to `b01074fa...5433` (45 387 chars), the single block-0 digest shared by all 96 cases of
`task-c-description-prompts.json` (impact v2, re-verified there). Not reached: the FAQ translation variant (`pack()` omits the
master; `task-c.faq.spec.ts` line 82) and `task-translate.ts` (`buildTranslatePrompt`, block-0 digest `151c04990596`, no master).
**Accepted by the owner (Q1, decided 2026-10-18): the Task C description prompts and the optimizer prompt carry the new master text.**
Consequences carried into the design:

1. **Goldens.** `full-description-prompts.json`: block 0 moves in **10 of 12** cases (7 Task A, plus `c/expert3d-es`, `c/eu-en`,
   `c/us-uk`); only `translate/uk-user` and `translate/de-internal` are unchanged end to end. For the three `c/*` cases block 1 and
   `userContent` must not move. `task-c-description-prompts.json`: all 96 cases move at **block 0 only** in the sense that the master
   bytes change; block 1 (96 per-case Task C instructions) and `userContent` must not. The mechanical cross-check: the block-0 delta of
   the three `c/*` cases of the first golden is the same master delta as in the Task A cases.
2. **Guard `src/prompts/task-c.description-bytes.spec.ts` (header "Never regenerate the golden, never pass `-u`"): option (b) is DECIDED
   (decided by owner 2026-10-18).** The guard's single per-block loop (spec lines 59-63) checks `length`, `sha256` and `cache` for
   **every** block, after a block-count assertion (line 58). The amended guard has these properties (a property list, not a task order):
   - **Block count** per case stays pinned (equals the golden record's, i.e. 2).
   - **Block 0**: `text` is compared with the live `MASTER_SYSTEM_PROMPT` (`toBe`), and its `cache` flag stays pinned per case (equals the
     record's `true`). The reason to keep these two pinned (impact v4 risk 21; the Specification requires only block 1 and `userContent`): a
     careless split of the loop could otherwise drop the block count or the cache flag for 96 cases with no failing test; the cache flag
     is the AGENTS.md section 3 caching property of the family and costs nothing to keep.
   - **Block 1 and `userContent`**: `length` and `sha256` (and, for block 1, `cache`) stay pinned per case against the unchanged record.
   - **`test/fixtures/golden/task-c-description-prompts.json` stays byte-unchanged** (an empty `git diff` over it is part of the check).
     Its 96 block-0 `sha256`/`length` records (`b01074fa...5433`, 45 387) describe the pre-Story master and are **no longer read**; the
     spec header says so, and the stale-record consequence is named as risk R24. The premise tests (16 pairs, 96 cases) stay.
   - **Green on arrival and after the master edit.** Block 0 equals the master both before and after any master edit, so the amended guard
     does not force a co-commit with the master edit (v3's "same commit as the master edit" sentence is withdrawn; plan-review N13, the
     T20 option (a) conflict, is moot). This is a property of the guard, not an ordering of tasks.
   - **Demonstration.** The amended guard is shown to fail on a deliberate one-character change to Task C's block-1 instruction and to
     `userContent` (temporary mutation, reverted, evidence recorded), so the split cannot silently drop the pins that are the guard's purpose.
   - **AGENTS.md section 7.7, named not silent.** This is a requirement-driven change to an existing guard. What the guard stops pinning:
     the master's bytes for 96 cases by digest (the master's text stays pinned by the master specs and, as a reviewed diff, by the
     regenerated `full-description-prompts.json`). What it newly proves: block 0 of the Task C description prompt **is** the master, for
     all 96 cases (property 6 of `master-system-prompt.image-markers.spec.ts` proves it for one case). It cannot show that the master
     changed unintentionally; that rests on the regenerated golden's reviewed diff. The header sentence "Never regenerate the golden, never
     pass `-u`" stays true for the JSON and is amended to say block 0 follows the live master.
3. **FR-23 / AC-8 are stated by the Specification at file level and at payload level.** File level: `task-c.ts` and `task-translate.ts` are
   not edited (`git diff` empty, arch-guard checksum `task-c.ts` `619c45a9...9247` unchanged; `optimizer.ts` likewise not edited). Payload
   level: block 0 of the Task C description-translation prompt (96 cases) and of the optimizer prompt equals `MASTER_SYSTEM_PROMPT` and
   therefore carries `[NO PICTURE REFERENCES`, the liveliness block and its self-scoping sentence; block 1 and `userContent` of those 96
   cases are byte-identical; the Task C FAQ variant and `buildTranslatePrompt` are byte-identical in every block. A file-level FROZEN check
   (arch-guard, `git diff -- src/prompts/task-c.ts`) cannot see the payload change; the payload-level oracles are the amended Task C guard
   (item 2), the reviewed diff of the first golden, `master-system-prompt.image-markers.spec.ts` property 6, and the captures of D15
   (impact silent risk 17).
4. **Behavioural risk (cannot be proven by a unit test; declared residual risk, Specification note G; Q-TRANS options (1)+(3) decided
   2026-10-18).** The rules are written for authoring. In a translation prompt SCENE, RHYTHM or HOOK can push the translator to add,
   split or merge sentences, add an opening hook, or "delete, not reword" a pointer sentence that a stored uk master legitimately contains.
   `validateStructuralParity` (`COUNTED_TAGS`: `<section>`, `<h2>`, `<h3>`, `<hr>`, `<figure>`, `<figcaption>`, `<table>`, `<tr>`, `<td>`,
   `<li>`, at `severity: 'error'`) counts tags only, so a changed sentence count or sentence length **inside a `<p>`**, and a `<p>` above a
   figure that is rewritten or removed, pass silently (impact silent risk 14, R1a). **No design decision in this plan closes it.** What is
   decided: the risk stays declared (option 1) with the self-scoping sentence (item 5) and an optional live translation comparison for
   Creality Pika outside the gate (D13 category 22); and an unconditional, documentation-only characterization pin records that
   `validateStructuralParity` is blind to sentence changes inside `<p>` (option 3, D13 category 18). Options (2) (a scope sentence beside
   the FR-5 literals) and (4) (a sentence-level check in the gate) were not chosen.
5. **The FR-20 self-scoping sentence: where it lives and how it reaches three payloads (requirement, FR-20 v5; literal confirmed by the
   owner 2026-10-18, Q-SCOPE).** It is one sentence in the one shared `LIVELINESS_RULES` constant (`constants.ts`), at the end of the
   block after `apply only where §3 exists`. The constant is interpolated once, statically, into the master (hunk M7); the master is
   `systemBlocks[0]` of `buildPromptA` (and, through it, `buildPromptADoc`) for all 7 stores, of the `buildPromptC` description variant and
   of `buildOptimizerPrompt`. So **one interpolation reaches all three payloads and no per-consumer code exists or is planned**: there is no
   `task-c.ts` change, no second constant and no store-dependent text (it would break the cached-prefix-identical-across-stores test). The
   full sentence is VERBATIM and normative (ASCII apostrophe): `These rules govern writing a new description; when the task is to translate
   an existing text they do not apply, and the source's sentences and their order are kept.` The three Assert-present strings are
   `govern writing a new description`, `when the task is to translate an existing text they do not apply` and `the source's sentences and
   their order are kept`. The sentence carries no digit and no sentence-length number. The old clause naming headings is dropped; heading
   counts are gated independently by `validateStructuralParity` (`<h2>`/`<h3>`).
6. **Two things the sentence does not do (recorded; accepted).** (a) **Collision with FR-5, in the same block 0.** `NO_IMAGE_DEIXIS_RULE`
   says a sentence whose only job is to point at the picture is "deleted, not reworded"; the self-scoping sentence says that in a translation
   the source's sentences and their order are kept. A translator that receives a legacy uk master containing «нижче» or «на знімку» gets
   both instructions, and which one wins is untested and untestable in the gate. The FR-5 literals (`deleted, not reworded`, `figcaption`,
   `alt`, `«на зображенні»`, `«на фото»`, `«нижче»`) must stay verbatim; Q-TRANS option (2) (a scope sentence beside them) was not chosen, so
   the collision stays declared (R1d). (b) **It does not name the optimizer's task** (impact Unknown 16): the optimizer restructures and
   re-authors an existing description (`[INPUT HTML] - existing description to restructure and optimize`), which is neither "writing a new
   description" nor "translate an existing text". The owner accepted this (Q-OPT option 1); no further sentence is added (the FR-20 literal
   set is fixed).
7. **Oracles and watch items for the inheritance (impact v4; all existing tests are kept, none is weakened).**
   - **Live oracle, stays green by design:** `src/prompt-core/master-system-prompt.image-markers.spec.ts` property 6 (lines 132-151)
     asserts `buildPromptA(...)`, `buildPromptC(...)` and `buildOptimizerPrompt(...)` `systemBlocks[0].text` `toBe(MASTER_SYSTEM_PROMPT)`. It is
     the existing oracle for FR-23's "block 0 equals the master" clause for Task C and the optimizer (one Task C case, EXPERT3D). The plan
     relies on it and does not edit it; the amended guard and the category 16 and 19 tests widen the coverage to the 96 pairs without
     replacing it. It is not on the Specification's NFR-9 list (impact finding).
   - **Watch item (stays green; a failure would mean the new prose is wrong, not the test):** `src/prompts/task-translate.simplified.spec.ts`
     line 83 asserts `allText(buildPromptC(..., simplified template))` (the master included) does not match `/§C[1-6]|CONSUMABLES/`. The text of
     `NO_IMAGE_DEIXIS_RULE`, `LIVELINESS_RULES` (including the self-scoping sentence), the PLACEMENT, GROUNDING LOCK and FR-29 hunks therefore
     must not contain `§C1` to `§C6` or `CONSUMABLES`. Likewise `task-c.spec.ts` lines 271 and 295 forbid three phrases in the joined blocks
     (`TRANSLATE the generic descriptor`, `reorder it category-first`) and `image-figure-style.prompt-examples.spec.ts` line 57 forbids
     `fit-content` in the master. These are prose constraints for the builder, checked by those tests being re-run.
   - **Watch item:** `src/prompts/output-integrity-wiring.spec.ts` (lines 47-48, 74-75) asserts `NO_LEAKED_REASONING_CLAUSE` reaches the
     optimizer, Task A block 0 and Task C block 1. No FR edits that clause; the test stays green and is re-run.
   - **Tripwire, not edited:** `src/prompts/simplified-template-blocks.ts` exports `SIMPLIFIED_TRANSLATION_CLAUSE`, which `task-c.ts` (line
     134) and `task-translate.ts` (line 159) append to Task C **block 1**. It is the one non-`constants.ts` file whose edit would move Task C
     block 1 in the 16 `corpus/simplified-template+source-locale` golden cases (and the Doc translator), contradicting FR-23 item 3. The plan
     does not edit it (D7; Q-SIMPL decided "no"); the per-case block-1 pins of the amended guard are what would catch an accidental edit.
8. **FR-29 puts `[Operator Notes]` into block 0 of three families that carry the block in one (impact v4 risk 22).** The `STRICT INPUT SCOPE`
   edit (M6) is in the shared master, so the Task C description translation and the optimizer read a source name for a block that their
   `userContent` never contains (FR-40 item 2). No test can fail on it and none is wrong: it is a consequence of the owner's Q1 and FR-29
   decisions, and the "three input blocks" rewording (OD-20(1)) removes the count that would have been false for them too. A conditional
   master (naming the block only for Task A) would break the byte-stable cached prefix and is rejected (alternative 11). It is recorded as R22,
   pinned by a category 9 test (block 0 names `[Operator Notes]`; `userContent` of the Task C description and of the optimizer does not), and
   named in the section 9 request for the master (consequence 6). With OD-19 (1b) the Doc instructions say nothing about the block, so for the
   six Doc-pipeline stores the master bullet is the only prompt text that names it (impact Unknown 5).

## Design decisions

### D1. Domain model (`src/domain/`): no change; `ProductInput` gains one optional field

- No Zod schema changes. `ProductDescriptionDoc` and `ConsumablesDoc` are unchanged; figure `caption`/`alt` and paragraph
  blocks already exist (NFR-12: the Vision JSON field set is unchanged).
- `ProductInput` (declared only in `src/app/types.ts`, not on the section 9 list) gains `operatorNotes?: OperatorNotes`, where
  `OperatorNotes` is the FR-25 type (four optional string keys `usageScenarios`, `testResults`, `previousGenerationComparison`,
  `limitations`). It is a TypeScript interface, not a Zod schema: `ProductInput` is not Zod-validated anywhere.
- Compatibility: optional field, so history entries already in `seo_gen_history` (stored `ProductInput`) stay valid and simply
  lack it. `test/fixtures/corpus/` (`.ctx.json`, `.doc.json`, `.uk-UA.html`) does not involve `ProductInput.operatorNotes` and
  still parses; nothing is regenerated. The corpus EXPERT3D item contains 14 picture-reference sentences and must **not** be
  edited to remove them (impact analysis, Fixture and corpus impact); the new warning appears in the harness report only,
  because the harness asserts `severity === 'error'` only.

### D2. Prompt -> schema -> renderer -> validator chain

| Link | Change | How the links stay in agreement |
|---|---|---|
| Prompt | Vision pre-pass, master (`NO PICTURE REFERENCES`, PLACEMENT, GROUNDING LOCK, `[VIDEO]`, liveliness, source scope), `task-a.ts` (instruction, video block, marker block, `[Operator Notes]`), `task-a-doc.ts` (FIGURE PLACEMENT), C3D override, EXPERT3D overlay | Every prompt still asks for a body `<p>` directly above every figure; none asks for a pointer. Agreement is held by presence/absence pins per FR (Assertion convention) and by the existing `no orphan images`, `<figure> directly after a </ul>` pins. |
| Schema | none | No new field is requested from the model; `operatorNotes` is input-side only. A prompt asking for a field the schema lacks cannot occur. |
| Renderer | none | `render-description.ts` renders model text verbatim; it neither adds nor drops figure/paragraph structure. Deixis therefore reaches HTML unfiltered, which is why the detector exists. |
| Validator | `image-manifest-missing` detail (frozen), `video-embed-missing` detail, new `image-deixis` warning (paragraph carrier) in `validateGeneratedHtml`, new `image-caption-deixis` warning in `figureCaptionWarnings` | The repair message and the prompt ask for the same thing (a body `<p>` that states a product fact). New findings are `warning`, never `error`, so they cannot enter the repair loop (`severity === 'error'` filters in `repair-gate.ts`); no `REPAIR_STRATEGIES` / `NON_REGENERABLE_RULES` entry is added. |

AGENTS.md section 4 criteria that must keep holding, and where each is enforced:

| Section 4 criterion | Enforced by |
|---|---|
| Each `<figure>` has a `<figcaption>`; first image eager, rest lazy; `decoding="async"` | `validateGeneratedHtml` (`lcp-image-lazy`, `image-not-lazy`, `figure-missing-figcaption`), unchanged |
| No orphan images (a `<p>` directly above each `<figure>`); paragraph does not duplicate the figcaption; `alt` does not duplicate the figcaption | Prompt pins (master SPACING sentence kept, FR-6; `no orphan images` kept, FR-10; instruction FR-11.1); `image-manifest-missing` repair message (FR-13); measurement script D-2 (figure without a paragraph above, consecutive figures) |
| Video embed present in output; video `<figure>` with localized figcaption; `rel=0`, lazy, `allow` set | `validateVideoCoverage`, `restoreMissingVideos`, `video-figure.ts`, all unchanged; FR-9/11/13/15 change wording only |
| Spec count and unit parity; SEO limits; no currency symbol | Untouched files (`task-b.ts`, spec-parity gates); FR-38/FR-39/FR-40 pin that the notes cannot reach them |

### D3. FROZEN files: edit in place, with the smallest hunks; siblings carry all logic

Three frozen files are reached and the Specification pins literal text inside each, so a sibling file cannot replace the
edit (the text being changed lives in the frozen file). The plan therefore **requests** the edits (section "FROZEN-file
position") and moves everything that can move into non-frozen siblings so each frozen hunk is a few lines:

| Frozen hunk | What stays inside the frozen file | What is placed in a sibling |
|---|---|---|
| `task-a.ts` FR-26 | one import line, one interpolation `${buildOperatorNotesBlock(input.operatorNotes)}` | `src/prompts/operator-notes.ts` (empty rule, labels, block rendering) |
| `output-validator.ts` FR-18 | one import line, one call inside the existing `DOMParser` `try` | `src/utils/image-deixis.ts` (detector, carrier walk, issue builder) |
| `master-system-prompt.ts` FR-5, FR-20 | two constant names added to the existing import, two `${...}` interpolations | `NO_IMAGE_DEIXIS_RULE` and `LIVELINESS_RULES` in `constants.ts` |

The established sibling pattern (`task-a-doc.ts`, `image-manifest-coverage.ts`) is not usable as a full substitute: AC-2/FR-5 assert
the text inside `MASTER_SYSTEM_PROMPT`; AC-7/FR-18 assert that `validateGeneratedHtml` itself emits the rule; FR-13 and FR-11
change text that exists only in the frozen files. The sibling-only variants are recorded as rejected alternatives and as the
fallback for a refusal (section "What a refusal drops").

### D4. Prompt payload contract and prompt caching

- `PromptPayload` shape is unchanged. `systemBlocks` and `userContent` stay separate.
- Cached (`systemBlocks[0]`, master): `NO_IMAGE_DEIXIS_RULE` (FR-5) and `LIVELINESS_RULES` (FR-20, including the self-scoping sentence)
  are **static** constants with no per-store or per-run interpolation, so the master stays byte-identical across every store (and across
  the three families that embed it: the self-scoping sentence is the same bytes for an author, a translator and the optimizer). The standing guard is
  `task-a.spec.ts` "the two cached prefix blocks are byte-identical across every store". The master change invalidates the prompt
  cache once for every store (NFR-1, accepted by the Story). It also invalidates it, once, for Task C description translation (all
  96 store x language prompts) and the optimizer, which embed the master (D0). `systemBlocks[0]` stays `cache: true` and block 1 of
  Task C stays its own instruction, so the separation holds in all three families; no `PromptPayload` shape changes anywhere.
- Cached (`systemBlocks[1]`): the `TASK_A_INSTRUCTION` clause (FR-11.1) and the `task-a-doc.ts` FIGURE PLACEMENT paragraph (FR-10)
  are system text and stay system text.
- Uncached (`userContent`): the `[Operator Notes]` block (FR-26), and the two `buildVideoBlock` / `buildMarkerBlock` spans
  (FR-11.2, FR-11.3). Nothing moves from `userContent` into a cached block or the reverse.
- `buildPromptADoc` keeps `base.userContent` as a byte prefix, so the `[Operator Notes]` block reaches the Doc pipeline with no
  `task-a-doc.ts` edit for the carrier (confirmed by the owner, OD-19 mechanism; the Doc instructions stay silent about the block, OD-19 (1b)).
- The FR-29 hunk M6 (`[Operator Notes]` named in `STRICT INPUT SCOPE`) is part of the cached block 0 and so is static text shared by the three
  families that embed the master (D0.8); it is not a per-family or per-store interpolation.

### D5. Detector module `src/utils/image-deixis.ts` (FR-16, FR-17, NFR-6, NFR-7, NFR-8)

- **Leaf module**: no import except `import type { ValidationIssue } from './output-validator'` (erased, no runtime cycle).
  This keeps NFR-7 (no service dependency; `output-validator.ts` and `image-placeholder.ts` can both import it) and keeps the
  module runnable under Node type stripping (D12).
- `findImageDeixis(text, locale): DeixisMatch | null`. Base language = lower-cased primary subtag of `locale`; an unknown
  language, an omitted/empty locale, an empty text or a non-string returns `null`; never throws. **Omitted locale returns `null`**
  (Specification note C leaves it to the plan).
- Pattern table `DEIXIS_PATTERNS: Record<string, readonly RegExp[]>` keyed by uk, ru, en, pl, de, es, pt. Each pattern uses
  `(?<!\p{L})` / `(?!\p{L})` boundaries (project convention: short roots need a lookbehind) so «на фото» does not match inside
  «на фотополімерній». Construction classes per language: (1) preposition + picture noun («на зображенні», «на фото», «на знімку»,
  «на кадрі», "in/on the image/photo/picture/frame"); (2) picture-noun + show verb, or show participle + picture context
  («колаж показує», «показано», «зображено», «видно на», "shown/pictured/as seen"); (3) a spatial pointer adverb used as a
  pointer («нижче», "below") when it opens a clause about a figure/video. The uk patterns are built to the Specification's
  required cases only (AC-5 list). The known precision candidates of OD-7(1) («Температура вище 200 °C», «на якому/на яких/на ній»)
  are **not asserted either way** by any test (OD-7 accepted as built, decided by owner 2026-10-18).
- **Non-uk phrase lists (OD-7(2), accepted as built, decided by owner 2026-10-18)**: the Story supplies none and native review is out of
  scope. The builder drafts ru, en, pl, de, es, pt entries from the same construction classes; the tests give each language at least two
  positives and two negatives (AC-5). The lists are labelled **unreviewed** in the module header.
- **NFR-8 (no locale list hard-coded)**: the table keys are language codes, not store locales. A spec cross-checks the table against
  `STORE_REGISTRY`: the set of primary subtags of all registry `languages` equals the table's key set (so a new registry language
  fails a test instead of silently having no detector). The detector never imports the registry.
- `collectFigureDeixis(html, locale, parse?)`: parses with `globalThis.DOMParser` (as `output-validator.ts` does), with an optional
  injected parse function used by the CLI (D12). It delegates to `collectFigureDeixisFromDocument(doc, locale)` so the validator
  reuses the document it already parsed. Carrier definitions are exactly FR-17 (OD-8 accepted as built, decided by owner 2026-10-18): figure = every
  `<figure>` (image or video); paragraph above = the figure's previous **element** sibling, only if it is a `<p>`; `figcaption` =
  every `<figcaption>`; `alt` = the `alt` of every `<img>`; counting unit = one hit per carrier instance. Hit shape:
  `{ carrier: 'paragraph' | 'figcaption' | 'alt', text, match }`. HTML with no `<figure>`: no paragraph hits; malformed HTML or
  no parser: returns `[]`, never throws.
- **Code-authored text** (`ALT_PREFIX 'Фото: '`, `FALLBACK_LABEL 'Зображення товару:'`, `GENERIC_LABELS`): the uk patterns are
  construction-based, so a bare noun prefix does not match; tests include these two strings as explicit negatives. `ALT_PREFIX` and
  `FALLBACK_LABEL` are not changed (no requirement covers them). Q-CODEALT "no", decided by owner 2026-10-18: the detector does not match
  the code-authored labels (R5).

### D6. Where the warnings are emitted

- **`image-deixis` (paragraph carrier only)**: `imageDeixisIssues(doc, locale, context): ValidationIssue[]` in `image-deixis.ts` returns
  one `warning` per figure whose paragraph above has a hit, `rule: 'image-deixis'`. In frozen `validateGeneratedHtml` it is one call
  placed **inside the existing `try`** after the figure-wrapping rules (reuses `doc`; skipped silently where `DOMParser` is
  unavailable; skipped when `locale` is undefined). It emits nothing for a phrase in a paragraph that is not directly above a figure
  (the «нижче -10 °C» case) and nothing for the `figcaption` or `alt` carrier (FR-18 carrier table, normative).
- **`image-caption-deixis` (figcaption carrier)**: `figureCaptionWarnings(figures, locale = 'uk-UA')` gets an
  **optional second parameter**; existing callers (`image-placeholder.ts` report, `image-placeholder-validate.ts`) are unchanged
  because marker figures are always native Ukrainian (`buildFigureParts` reads only the `...Uk` Vision texts). The module stays
  locale-free (its NFR-6): the default is a literal parameter, not a registry read. The check runs on `captionPlainText(parts)` and
  is placed **before** the `if (f.fallbackLabel) continue;` skip so fallback-label figures are covered. The warning for a figure
  depends only on that figure, so the `slice(before)` logic in `image-placeholder-validate.ts` lines 80-81 still holds; a spec
  re-asserts it. Detail text is Ukrainian (module convention); tests assert rule id and level only (FR-19).
- **Surfacing**: HTML-path stores see both warnings in the repair-gate `validate` array and in `runOutputValidation`. Doc-pipeline
  stores see the paragraph warning only in the post-hoc `runOutputValidation` (the Doc gate does not call `validateGeneratedHtml`).
  A pointer-style figcaption on a **non-marker** figure produces no warning on any path, and `alt` has none on any path (the FR-18
  table is normative); only the script counts them. Recorded as risk R6.
- `repair-gate.ts` / `repair-strategy.ts` are re-verified, not edited.

### D7. Non-frozen prompt and message edits (exact scope)

| File | Edit | FR |
|---|---|---|
| `src/prompts/vision-prepass.ts` | `description` line and `alt` line of the UKRAINIAN FIELDS block; one Grounding-rules sentence; keep `one sentence`, `differ`, `NUMBERS ARE THE HIGHEST-RISK ELEMENT` | FR-1..FR-4 |
| `src/prompts/task-a-doc.ts` | `TASK_A_DOC_INSTRUCTION` FIGURE PLACEMENT paragraph (spec text, `no orphan images` kept) | FR-10 |
| `src/prompt-core/constants.ts` | new `NO_IMAGE_DEIXIS_RULE`; new `LIVELINESS_RULES`; C3D OVERRIDE #5 sentence; EXPERT3D overlay (APPLICATIONS, HEADINGS, amended line, replaced closing paragraph) | FR-5, FR-12, FR-20, FR-22 |
| `src/utils/video-manifest.ts` | `video-embed-missing` detail; all seven `LEAD_IN_TEMPLATES` (Appendix E) | FR-13, FR-15 |
| `src/services/content-orchestrator.service.ts` | two `video-embed-restored` warning texts; `numericFidelitySources` gains the notes; its doc comment updated | FR-14, FR-30 |

Decisions the Specification leaves to the plan:

- **`NO_IMAGE_DEIXIS_RULE` placement**: its own bracketed section **before** `[IMAGE HANDLING]` (after `[VIDEO]`), so it is outside the
  slice the image-markers spec delimits (`START = indexOf('\n[IMAGE HANDLING]\n')`, `END = indexOf('\nFIGURE FORMAT')`). The FR-7
  PLACEMENT bullets are after `FIGURE FORMAT`, hence outside that slice (verified in the tree: PLACEMENT is at the end of the section).
  Constant name `NO_IMAGE_DEIXIS_RULE` (source-analysis name; matches `image-deixis`).
- **`LIVELINESS_RULES` placement**: static block directly after `${SENTENCE_LENGTH_RULES}` (the authority it defers to,
  heading `[SENTENCE LENGTH ...` verified in `constants.ts`). The precedence sentence is the PROPOSED DEFAULT wording of FR-20 (still
  unconfirmed; listed in the open residues). The block ends with the `apply only where §3 exists` sentence followed by the **self-scoping
  sentence** (D0.5; literal confirmed by the owner 2026-10-18). Both stay in this one constant: no second constant, no `task-c.ts` /
  `optimizer.ts` text, no per-consumer interpolation. **Assert-absent as the Specification words it (plan-review N10, binding):** the
  block contains none of `9–17`, `9-17`, `at most two consecutive`, `two consecutive sentences`, matches no digit-range-plus-`word`
  expression, and states **no sentence-length number other than `6`** (RHYTHM). The required literals themselves contain `§3`, `§1` and
  `<h2>`; those are section references and a tag name, not sentence-length numbers, so the assertion is **not** "the block has no digit".
  The self-scoping sentence is worded without any number.
- **Heading collision (Unknown 9)**: `heading-style.ts` Style B checks are gated on `isCenter3dPrintStore` (lines 394, 661), so the
  EXPERT3D functional `<h2>` wording is not checked by Style B. The global product-name-in-heading check is not store-gated, so the
  HEADINGS rule states that the rest of `[HEADING FORM]` still applies. `grep` finds `functional headings` nowhere in `src` today.
- **`simplified-template-blocks.ts` (lines 123, 165, 208) is not edited (Q-SIMPL "no", decided by owner 2026-10-18).** No FR names it, OD-6
  limits acceptance to Full description, and changing unmeasured simplified-template instruction bytes is scope the Specification did not
  ask for. The three simplified Doc templates keep "a paragraph block that introduces it" while receiving the master rule (R8). Tripwire:
  this file also exports `SIMPLIFIED_TRANSLATION_CLAUSE`, appended to Task C block 1 by `task-c.ts` line 134 and `task-translate.ts` line
  159; any edit to it moves block 1 in 16 golden cases and contradicts FR-23 item 3.
- **`optimizer.ts` is not edited (Q-OPT option 1, decided by owner 2026-10-18)**: no FR names it and it is outside every acceptance run
  (OD-6). It inherits `[NO PICTURE REFERENCES` and the rewritten PLACEMENT through `systemBlocks[0]` and keeps its own
  `TASK_OPTIMIZE_INSTRUCTION` (line 87). The "lead-in" in that instruction is the figcaption `<b>` label (the master keeps
  `<b>LEAD-IN LABEL:</b>` in its `FIGURE FORMAT` examples, master lines 405 and 410), **not** a lead-in `<p>`, so it does not ask for the
  pointer paragraph that FR-5/FR-7 remove; the v2/v3 reading of a contradiction is withdrawn (impact v4 risk 15). What stays true and
  silent (R7a): the optimizer authors a figcaption for every image of its input, so figcaption text is model-authored for every figure
  (the non-marker exposure of R4); its input is an existing description that may contain pointer sentences while its job is to restructure;
  the FR-20 self-scoping sentence names neither case (D0.6(b)). The plan does not widen scope. Because the optimizer has no pre-change byte
  oracle, "block 1 and `userContent` unchanged" is proven by the D15 capture, not by the empty `git diff` alone.
- **Code-authored labels (Q-CODEALT "no", decided by owner 2026-10-18)**: the detector does not match `ALT_PREFIX 'Фото: '`,
  `FALLBACK_LABEL 'Зображення товару:'` or `GENERIC_LABELS`; they are untouched (D5).
- **Master header line 36 (`one lead-in <p> + one <iframe>`)** is not edited (FR-9 says so). It describes the contract and does not
  point at a picture. Recorded, no action.

### D8. Operator notes (FR-24..FR-31, FR-40)

- **Gate (plan-review N2, N14): this whole slice depends on the `task-a.ts` T-A4 approval.** The Specification's FR-26 failure path names
  the range FR-24..FR-31: FR-26 has no non-frozen route, so if "modify `src/prompts/task-a.ts`" is refused for the T-A4 item, the
  `[Operator Notes]` block never reaches a prompt. Two things travel with that slice by construction: **FR-40** (the reach of a block that
  exists only if FR-26 exists) and **FR-41** (it resets a state object that exists only inside the slice). The Specification gives no
  separate refusal text for them and none is invented here; the plan applies its own inert-input principle. A textarea, a state object, a
  history field, a reset or a label would otherwise be an input that is collected, stored, restored or cleared but never sent: **inert, and
  it must not ship.** The plan therefore conditions every user-visible part of D8 and D9 (the component, the eight `TRANSLATIONS` keys, the
  `OperatorNotesFormState` field, the `buildGeneratorInput` spread, `restoreHistory`, both `clearAll` cases, the template placement) on T-A4
  being approved. **The master hunk M6 (FR-29: `[Operator Notes]` named in `STRICT INPUT SCOPE`, and the neutral `INTERNAL RECONCILIATION`
  wording that travels with it) depends on T-A4 (breakdown v2: T31 depends on T21)**: a master that names a block no task emits is the same
  defect seen from the prompt side (plan-review N14). Only the pure, non-visible parts (the `OperatorNotes` type, the leaf module
  `operator-notes.ts` and its unit tests) are independent of the approval, and if T-A4 is refused they are dropped as well (dead code) unless
  the human decides otherwise. If T-A4 is refused, the human decides the scope (FR-24..FR-31 with FR-40 and FR-41, or the Story, OD-12); the
  plan does not decide it. Approving the plan is not the "modify <filename>" instruction (AGENTS.md section 9) and does not unblock the
  frozen edits.

- **Leaf module `src/prompts/operator-notes.ts`** (imports `type` from `../app/types` only; no `@angular/core`; `src/prompts` is already
  imported by the app): `OPERATOR_NOTE_FIELDS` (ordered keys with the confirmed English labels), `normalizeOperatorNotes(notes?)` (FR-25 empty
  rule, returns `undefined` when empty), `buildOperatorNotesBlock(notes?)` (`''` or `'[Operator Notes]\n' + lines.join('\n') + '\n'`, values
  `.trim()`ed, internal line breaks kept), the type `OperatorNotesFormValues` (four strings), and the form helpers `toOperatorNotes(values)`
  and `toFormValues(notes?)`. **`toFormValues` is a neutral mapping**: an `OperatorNotes` object or `undefined` becomes four strings, each
  absent key `''`. It encodes no decision about restore; the decided behaviour (an entry without notes empties the textareas, OD-2 R2) is
  the state class's `restore` (D9).
- **Position**: `task-a.ts` line 167 becomes `${buildOperatorNotesBlock(input.operatorNotes)}${buildImageBlock(...)}...`. The previous
  line ends with the `\n` after the whole supplemental value, so the block is inserted at exactly the FR-26 offset, and an empty block is the
  empty string: Tier A byte equality holds by construction.
- **Form input builder**: `buildGeneratorInput` spreads the state class's input part (`...this.operatorNotesState.inputPart()`), which is `{}`
  when the notes are empty by the FR-25 rule and `{ operatorNotes }` otherwise, because FR-27 requires "no `operatorNotes` key" (an explicit
  `operatorNotes: undefined` property would still be a key).
- **FAQ isolation (FR-28)**: untouched `runFaqPipeline` (`input.supplementalContent?.trim()`, orchestrator lines 809, 1780). The notes are
  never joined into `supplementalContent`.
- **Reach (FR-40)**: only `buildPromptA` reads `operatorNotes` (plus `numericFidelitySources` and the script). `buildPromptB`,
  `buildPromptSlug`, `buildPromptFaq`, `buildPromptC`, `buildTranslatePrompt` and `validateSpecsGrounding` are confirmed in the tree
  (`task-b.ts:122`, `task-slug.ts:216`, `task-faq.ts:34`, `specs-grounding.ts:153`); tests build each with the notes filled and absent and
  compare. The `{ ...input }` spreads at orchestrator lines 1015 and 1437 carry the field; the field-by-field builder is
  `buildGeneratorInput` only (silent-risk 13), covered by a wiring pin and by the state-class test.
- **Doc instructions (OD-19 (1b), decided by owner 2026-10-18)**: `TASK_A_DOC_INSTRUCTION` and the simplified Doc instructions do **not**
  mention `[Operator Notes]`; `task-a-doc.ts` gets no notes text and the FR-10 edit adds none (Assert-absent pin, D13 category 1). The model
  sees the block in `userContent` only (carried by the `buildPromptADoc` byte prefix, no `task-a-doc.ts` edit for the carrier); the only
  prompt text that names it is the master bullet (M6).
- **Expert-3DPrinter (OD-19 (2), decided by owner 2026-10-18)**: the plain-HTML path (`buildPromptA` called directly, no images) **does**
  receive and render the notes at the FR-26 position; a test builds `buildPromptA` for the Expert-3DPrinter profile with filled notes and
  asserts the block (D13 category 8). The two existing Tier A cases `html/legacy`, `html/legacy+lang` (this store) are the oracle for the
  empty form.
- **`numericFidelitySources` (FR-30; OD-20(2) decided by owner 2026-10-18)**: add the four trimmed note values to the joined list.
  `NUMERIC_SOURCE_FIDELITY_RULES` text is **not** extended and `supplementalContent` is **not** added (the asymmetry stays by decision;
  impact risk 12); only the doc comment of the method is updated.
- **History (FR-31)**: no `history.service.ts` change (it stores the whole `ProductInput`; quota handling unchanged); tested as a round
  trip. NFR-11: the notes are free text entering a prompt and live in `seo_gen_history` like the other inputs; they are never rendered as
  HTML.

### D9. Angular surface (`src/app`)

- **New standalone component** `src/app/components/operator-notes-fields/operator-notes-fields.component.{ts,html,spec.ts}`, `OnPush`,
  signal inputs `values = input.required<OperatorNotesFormValues>()` and `labels = input.required<...>()`, `valuesChange = output<...>()`.
  Four labelled `<textarea>`s (`<label for>`), no `required`, no placeholder (FR-24), emits the full four-key object on every input
  event. Precedent: `content-template-select.component` (US-2.2). No RxJS.
- **New plain state class** `src/app/operator-notes-form-state.ts`, `OperatorNotesFormState` (plan proposal; it exists so that FR-25's form
  side, FR-31 items 4 and 5 and FR-41 are executed by tests instead of only read as text). No decorator, no `inject()`; it imports `signal`
  from `@angular/core` and the leaf module. API: `readonly values = signal<OperatorNotesFormValues>(<four empty strings>)`;
  `set(values)`; **`restore(notes?: OperatorNotes)`** = `set(toFormValues(notes))` (FR-31 item 2 for an entry with notes; item 5, an entry
  without notes empties the four values); **`clear()`** = `set(<four empty strings>)` (FR-41 item 1); **`inputPart()`** = `{}` when
  `toOperatorNotes(values())` is `undefined`, else `{ operatorNotes }` (FR-25 form side, FR-27 form side, FR-41 item 2). `signal()` needs no
  injection context; the first test written against the class confirms that under the logic runner. The class is under `src/app`, which is
  outside the coverage include; its behaviour is nevertheless asserted by the tests below.
- **Parent (`app.component.ts/html`)**: `readonly operatorNotesState = new OperatorNotesFormState();` (a field initialiser, no DI); a
  `computed` of the four labels from `uiLabels()`; the component is rendered once in the Generator form branch (which serves both
  `generator` and `ua-generator`), bound to `operatorNotesState.values()` / `set($event)`, **outside** the
  `selectedWebsite()?.name !== 'Expert-3DPrinter'` image block and outside any `templateId` condition (OD-2(b) confirmed). Eight new
  `TRANSLATIONS` keys (en/uk, four each) with the confirmed label text.
- **Gate:** none of this is built unless the T-A4 approval exists (D8 "Gate").
- **`buildGeneratorInput`**: adds `...this.operatorNotesState.inputPart()` (conditional by construction).
- **`restoreHistory` (OD-2 R1 and R2, decided by owner 2026-10-18)**: adds `this.operatorNotesState.restore(item.input.operatorNotes);`. After a
  restore the next Generate / UA Description click **resends** the restored notes (the builder reads the state; FR-31 item 4), and an entry
  without notes **empties** the textareas (item 5; the sibling fields use `|| ''`). Nothing waits for an answer any more.
- **`clearAll` (FR-41; Q-CLEARALL decided by owner 2026-10-18)**: `clearAll()` (`app.component.ts` line 1061) has **two textually identical,
  independent bodies**, `case 'generator'` (lines 1063-1082) and `case 'ua-generator'` (lines 1084-1103); an edit to one leaves the other
  unchanged (impact v4 risk 20). The plan edits **both** cases, adding `this.operatorNotesState.clear();` next to the
  `supplementalContent.set('')` / `customInstructions.set('')` lines of each. The shared Clear All button needs no template change. No other
  mode and nothing else in `clearAll` changes; `seo_gen_form_state` gets no write (the constructor/effect region still does not read or
  write the notes, FR-31 item 3, FR-41 item 3).
- **The `seo_gen_form_state` constructor/effect (lines 640-677) must not mention the notes** (FR-31 item 3): a wiring pin asserts it.
- **How FR-41, FR-31 items 4 and 5 and FR-25's form side are tested (impact Unknown 17).** `clearAll()`, `restoreHistory()` and
  `buildGeneratorInput()` are `AppComponent` methods and no spec instantiates `AppComponent`. The plan splits the proof in two:
  1. **Behaviour, executed (logic runner, tests on `OperatorNotesFormState`)**: fill four values, `clear()`, assert four empty values and
     `inputPart()` equal to `{}` with no `operatorNotes` key (FR-41 item 2); `restore(<entry with notes>)` then `inputPart()` returns the
     restored values (FR-31 item 4); fill, `restore(undefined)` and `restore({})`, assert four empty values and `inputPart()` has no key
     (FR-31 item 5); empty, whitespace-only and `{}`-equivalent values give no key (FR-25 form side); the restore-then-clear chain for FR-41's
     second test case.
  2. **Call sites, read as text (logic runner, source-text pins, precedent `app.component.template-wiring.spec.ts`)**:
     (i) `buildGeneratorInput`'s body contains `operatorNotesState.inputPart()` and writes no literal `operatorNotes:` key itself;
     (ii) `restoreHistory`'s body contains `operatorNotesState.restore(item.input.operatorNotes)`;
     (iii) **`clearAll` is sliced per case, with disjoint slices, inside the `clearAll()` body**: the `case 'generator':` slice runs from its label to the first following
     `break;`, the `case 'ua-generator':` slice likewise; each slice is asserted to contain `operatorNotesState.clear()` exactly once **and
     to contain neither the other case's label nor `break;` more than once** (so a lazy slice cannot run into the neighbour and let one
     edited case satisfy both pins); the slicing helper itself is tested on a synthetic source in which only one of the two cases carries the
     call, and the pin for the other case must fail on it. A pin that slices the whole `clearAll()` block (the pattern of the existing
     faq-generator pin, line 173, which stays green) would pass with one case edited and is therefore not used for FR-41;
     (iv) the constructor/effect region contains no `operatorNotes`.
  3. **Residual gap, stated (Q-FR41-TEST):** no test executes `AppComponent.clearAll()` itself; the call-site pins prove that the call is in
     the text of each case, and the state-class tests prove what the call does. FR-41's Tests paragraph says "invoke Clear All". Whether the
     human accepts this split for that wording, or wants a first `AppComponent` test, is open (questions list). A construction through
     `runInInjectionContext(Injector.create(...))` with stubbed services (precedent: `llm.service.spec.ts`, `content-orchestrator.*.spec.ts`)
     is a candidate the test-writer may probe, but **this plan has not run it and does not claim it works**: `AppComponent` has a
     `templateUrl` component decorator, an `effect()` and `localStorage` reads in its constructor, and the wiring spec records that Angular
     compilation is absent from the logic runner.
- **Tests (D13)**: component spec in the components runner; the state-class tests, the pure helpers and the source-text pins in the logic
  runner. No `AppComponent` TestBed spec is written (precedent: `app.component.template-wiring.spec.ts`, heavy DI).

### D10. Server surface

None. `server/**` is payload-agnostic (`normalizePayload`, `server/index.js` destructuring); no `server/usage/store.js` change, so the
`CREATE TABLE IF NOT EXISTS` no-migration limitation is not triggered.

### D11. Handling of existing goldens and guards (what changes, honestly)

The table follows Specification v5 NFR-9: **item 1 (fail by design, never weakened)** is `full-description-prompts.json` with
`full-description.golden.spec.ts` (consumers that re-pin from it: `task-a.spec.ts` AC-9b block, `task-a-doc.spec.ts` line-229 block) and
`task-c.description-bytes.spec.ts` with `task-c-description-prompts.json`; **item 2 (consumers to keep green, or update honestly)** is the
set named in the rows below; **item 3** (specs that pin `§3 FUNCTIONALITY` and must stay) is unchanged. Three impact additions that
NFR-9 omits are carried in the rows "Live oracle" and "Watch items".

| Artifact | Effect | Handling |
|---|---|---|
| `full-description-prompts.json` | block 0 of **10 of 12** cases changes by design (7 Task A + `c/expert3d-es`, `c/eu-en`, `c/us-uk`); block 1 of `html/*` and `doc/*` changes (FR-11.1, FR-10); overlay blocks of `*/expert3d*` and `*/c3d*` change (FR-22, FR-12); `userContent` of the 3 EXPERT3D cases (video) moves **only** by the FR-11.2 span. For the 3 `c/*` cases block 1 and `userContent` must not move | Regenerated by the builder with a reviewed diff limited to the changed text (US-7.1 precedent), never `-u`; the `c/*` block-0 delta is cross-checked equal to the Task A master delta; a new "regenerated" describe block pins the new strings (as US-7.1 did); the header exceptions list gets a US-9.1 entry. The 4 other description `userContent` entries and both `translate/*` cases must not move. A commit that edits a FROZEN file carries the regeneration that edit forces, with a diff limited to that edit's text (AGENTS.md section 13) |
| `task-c-description-prompts.json` / `task-c.description-bytes.spec.ts` | the 96 per-case tests fail at block 0 by design (the master bytes change); block 1 and `userContent` digests must not move | **Option (b), DECIDED (decided by owner 2026-10-18).** The spec is amended (D0.2 lists the properties): block 0 `text` compared with the live `MASTER_SYSTEM_PROMPT`; the per-case block count, block 0's `cache` flag, and block 1 / `userContent` length and `sha256` stay pinned; the JSON is **byte-unchanged** (empty `git diff`), its block-0 `sha256`/`length` records are unread and named as such in the spec header (R24); the spec header's "never regenerate / never `-u`" is amended to say block 0 follows the live master; the amendment is shown to fail on a deliberate block-1 / `userContent` mutation; the change is named, not silent (section 7.7). Green on arrival and after the master edit, so it needs no co-commit with it. Option (a) is a rejected alternative |
| `task-a.spec.ts` | cached-prefix stability, `never bare noun` guard, `<figure> directly after` pin, `§3 FUNCTIONALITY` pin | Unchanged and must stay green (the `never bare noun` phrase is absent from every `systemBlocks` text, FR-22) |
| `constants.spec.ts`, `master-system-prompt*.spec.ts`, `v4-headings.spec.ts` | pins that must stay | Unchanged; FR-4/FR-9/FR-11/FR-21 keep the literal strings they pin |
| `task-c.spec.ts` (line 20), `task-c.faq.spec.ts` (lines 82, 168, 174), **`content-orchestrator.faq-standalone.spec.ts` (plan-review N11; NFR-9 item 2)**, `protected-name-precedence.spec.ts` (line 83 on), `test/fixtures/faq-pipeline.ts` (`masterPromptBlocks`, slices `0..400` and `3000..3400`), `image-figure-style.prompt-examples.spec.ts` (lines 23-25), `optimizer.spec.ts`, `structural-parity.ts` and its spec | master consumers named by impact | Expected to stay green; each is re-run, and D13 categories 16 to 18 add the new tests. The FAQ-negative positional slices read the live master (`faq-pipeline.ts` is the helper behind `task-c.faq.spec.ts` and `content-orchestrator.faq-standalone.spec.ts`), so after FR-29 (STRICT INPUT SCOPE / INTERNAL RECONCILIATION sit at about offsets 2235 and 2593 of the master source) and FR-20 edits the window `3000..3400` covers different master text; the test-writer re-verifies it still discriminates and may **extend** it (for example with the two new constants) but never narrows or removes it (section 7.7) |
| **Live oracle** `src/prompt-core/master-system-prompt.image-markers.spec.ts` property 6 (lines 132-151) | asserts block 0 of `buildPromptA`, `buildPromptC` (one case, EXPERT3D/ES) and `buildOptimizerPrompt` `toBe(MASTER_SYSTEM_PROMPT)`; not in NFR-9 | Unchanged, stays green by design, and is **the** existing oracle that block 0 of Task C and the optimizer is the master. It must not be edited, loosened or skipped; if it ever goes red the master is not what those builders embed. The `[IMAGE HANDLING]` span tests in the same file (lines 38-105) are what keeps `NO_IMAGE_DEIXIS_RULE` outside that span (D7) |
| **Watch items** `output-integrity-wiring.spec.ts` (lines 47-48, 74-75), `task-translate.simplified.spec.ts` (line 83), `task-c.spec.ts` lines 271 and 295, `image-figure-style.prompt-examples.spec.ts` line 57 | not in NFR-9; stay green | Re-run, not edited. They constrain the **prose** of the new master text: no `§C1`..`§C6` or `CONSUMABLES`, no `TRANSLATE the generic descriptor` / `reorder it category-first`, no `fit-content`. A red result means the new prose is wrong, not that the test is |
| **Tripwire** `src/prompts/simplified-template-blocks.ts` (`SIMPLIFIED_TRANSLATION_CLAUSE`) | not edited; an edit would move Task C block 1 in 16 cases | A `git diff` over it must be empty; the per-case block-1 pins of the amended Task C guard would catch an accidental edit in those 16 cases. Q-SIMPL is decided "no" |
| Optimizer and Task C FAQ variant | no pre-change oracle exists | D15 (capture from the unmodified tree) |
| corpus harness | new warnings only | Unchanged; warnings are recorded not asserted |
| New userContent golden (FR-27) | new | D14 |

### D12. Measurement script (FR-32, FR-33; OD-9 accepted by the owner with a condition)

- **Core in `src/utils/description-metrics.ts`**: pure functions for D-1..D-10 and the hard-violation decision (any deixis hit, any figure
  without a paragraph above, any two figures in a row, any number absent from the input). It takes a parse function and a deixis collector
  as parameters (so it is a dependency-free leaf for the CLI) and returns a report plus `hardViolations: string[]`. It lives in `src/utils`
  so `npm run lint` type-checks it and `npm run test:coverage` measures it.
- **`tools/measure-description.ts`** is a thin CLI: argument parsing (`--html`, `--input`, optional `--specs`, `--name`, the four
  `--notes-*` values, `--locale`), file reading, report printing, `process.exit(1)` on hard violations or unreadable/empty input
  (FR-32 failure path, FR-33). Soft items (FR-35) are printed and never change the exit status. **The first line of every report is
  `process.version`** (impact Unknown 18): the live-run evidence therefore carries the Node version that produced it, on any machine.
  Input set per D-10 (decided by owner 2026-10-18): the generated HTML and the input description are required; specs, product name and the
  four operator-note values are optional; every text given forms the input side; no exemption list.
- **Runner (OD-9 accepted as built, decided by owner 2026-10-18, with the condition "verify Node >= 22.18, else the D12 launcher")**: Node
  native type stripping (`node tools/measure-description.ts`, no new dependency). Native stripping cannot resolve the extensionless
  imports used under `src`, so the CLI imports the two leaf modules with explicit `.ts` extensions and injects `linkedom`'s `DOMParser`
  (already a dependency); both leaf modules import only types; `package.json` is `"type": "module"`. **The repository pins no Node version**
  (no `engines`, `.nvmrc`, `.node-version`, `.tool-versions`, `volta`, `packageManager`, no CI definition; impact v4 hazard 6), so the
  condition cannot be read from the repo; it is verified at the implementation stage, as steps (not a task order):
  1. run `node --version` on the machine that builds the CLI and require >= 22.18 (v24.15.0 on this machine at planning time); record it in
     the CLI task's evidence;
  2. run the CLI once on a fixture pair and record that the `.ts` entry loads, the extensionless-import workaround holds and `linkedom`
     parses (impact Unknown 4: a run is the only proof; none existed at planning time);
  3. the CLI spawn test (`test/measure-description.cli.spec.ts`) starts the CLI with `process.execPath`, so it measures the Node that runs
     vitest, and asserts exit codes, report lines and the leading `process.version` line;
  4. **only if step 1 or 2 fails**, build the D12 launcher: a thin `.mjs` wrapper that loads the same `tools/measure-description.ts` through
     `vite`'s `ssrLoadModule` (vite is a devDependency; loading `src/utils/video-manifest.ts` this way was verified at about 1.5 s), and
     point the spawn test at the launcher. AC-10's `.ts` file stays the one that holds the CLI.
  No `engines` field or `.nvmrc` is added by this plan (a repository-configuration change nobody asked for); the printed version is the
  evidence. Rejected: adding `tsx` (new dependency, AGENTS.md sections 1/7.8). `tools/` stays outside vitest, coverage and `tsconfig` includes,
  so the testable logic is in `src/utils` and a spawn test in `test/` covers the CLI contract.
- Metric definitions are exactly FR-32: D-6 and D-10 are owner-confirmed; D-1/D-2 follow FR-17 (OD-8 confirmed 2026-10-18); **D-3, D-4, D-5,
  D-7, D-9 are still PROPOSED DEFAULTS** (OD-10 stays open for them), built as written and marked unconfirmed in the code header.

### D13. Validation strategy (kinds of test, runner for each)

| # | Category | Against what | Runner |
|---|---|---|---|
| 1 | Prompt-wording pins: Assert-present / Assert-absent per FR-1..FR-15, FR-20..FR-23, FR-29, over whitespace-collapsed text. **FR-20 Assert-absent is implemented as the Specification words it (plan-review N10, binding):** `9–17`, `9-17`, `at most two consecutive`, `two consecutive sentences`, a digit-range-plus-`word` expression, and **no sentence-length number other than `6`** in the shared liveliness constant; `§1`, `§3` and `<h2>` in the required literals are not sentence-length numbers, so the test is not "no digit". **OD-19 (1b):** `[Operator Notes]` absent from `TASK_A_DOC_INSTRUCTION`, from `buildSimplifiedDocInstruction(...)` for every simplified template and from the FR-10 edit | `buildVisionPrepassPrompt`, `MASTER_SYSTEM_PROMPT`, `buildPromptA` (video and marker inputs), `TASK_A_DOC_INSTRUCTION` and the simplified Doc instruction texts, `constants.ts` exports, `buildPromptA` system blocks for each of the 7 `STORE_REGISTRY` stores | logic |
| 2 | Placement and non-regression pins | image-markers span unchanged; `[NO PICTURE REFERENCES` not inside the span; cached prefix identical across stores; INVARIANT START and `none of them varies the start` kept; `never bare noun` absent | logic |
| 3 | Detector units | `findImageDeixis` seven languages (uk required cases; >= 2 positives and >= 2 negatives elsewhere; unknown/omitted locale -> `null`); code-authored `Фото:` / `Зображення товару:` negatives (Q-CODEALT "no"); registry cross-check (NFR-8) | logic (happy-dom) |
| 4 | Carrier units | `collectFigureDeixis`: paragraph/figcaption/alt hits, non-adjacent paragraph not reported, heading-before-figure no paragraph hit, video figure treated as figure, no-figure HTML, malformed HTML | logic (happy-dom) |
| 5 | Warning-level units | `validateGeneratedHtml` emits `image-deixis` at `warning` only for the paragraph carrier and not for «нижче -10 °C» elsewhere; `figureCaptionWarnings` emits `image-caption-deixis` at `warning`; `slice(before)` property re-asserted | logic |
| 6 | Message and template units | `image-manifest-missing` / `video-embed-missing` details; two orchestrator warning texts; each of the 7 `LEAD_IN_TEMPLATES` free of the AC-4 words and returning `findImageDeixis(...) === null`; unknown language falls back to a pointer-free English template | logic |
| 7 | Byte identity | New `userContent` golden (Tier A strict, Tier B equal except FR-11 spans, Doc-wrapper remainder with and without `hookPattern`); regenerated `full-description-prompts.json` guard; the amended Task C guard (option (b), D0.2, D11) | logic |
| 8 | Operator-notes units | empty rule (undefined, `{}`, four empty, whitespace-only), block bytes for full and partial fill, position test (with-notes equals without-notes plus the block at the offset), `toOperatorNotes` / `toFormValues`; **Expert-3DPrinter (OD-19 (2))**: `buildPromptA` for that store profile with filled notes contains the `[Operator Notes]` block at the FR-26 position | logic |
| 9 | Isolation behaviours | FAQ not started with only notes filled (orchestrator with a fake provider, as `content-orchestrator.faq-pipeline.spec.ts`); `buildPromptB`, `buildPromptSlug`, `buildPromptFaq`, `buildPromptC`, `buildTranslatePrompt` payloads identical with and without notes; `validateSpecsGrounding` unchanged by notes; `numericFidelitySources` passes a note-only number and fails an absent one, and a number only in `supplementalContent` gives the same result as before (OD-20(2)); history round trip via `HistoryService`; **impact risk 22:** block 0 of a `buildPromptC` description prompt and of `buildOptimizerPrompt` names `[Operator Notes]` (the master bullet) while their `userContent` does not contain it | logic |
| 10 | Component | `OperatorNotesFieldsComponent`: renders four accessible textareas in en and uk, typing emits the updated object, empty stays empty, nothing required | components (`*.component.spec.ts`, `@testing-library/angular`) |
| 11 | Wiring pins over the call sites (exist only if the T-A4 approval exists, D8 Gate) | `app.component.html` renders the component once in the Generator branch outside the Expert-3DPrinter image block; `buildGeneratorInput` spreads `operatorNotesState.inputPart()`; `restoreHistory` calls `operatorNotesState.restore(item.input.operatorNotes)`; **both `clearAll` cases call `operatorNotesState.clear()`, pinned over disjoint per-case slices that cannot pass with only one case edited (D9 item 2(iii))**; the `seo_gen_form_state` constructor/effect does not mention the notes. These prove text; Q-FR41-TEST asks whether that suffices for FR-41's "invoke Clear All" wording | logic (source-text pins, precedent `app.component.template-wiring.spec.ts`) |
| 12 | Metrics and CLI | `description-metrics` units on hand-computable fixtures (D-1..D-10, hard-violation decision); a spawn test runs `tools/measure-description.ts` through `process.execPath` and asserts exit codes, report lines (including the leading `process.version` line) and unreadable/empty input -> non-zero | logic (`src/utils/*.spec.ts`, `test/measure-description.cli.spec.ts`) |
| 13 | Corpus and existing fan-out | `test/render-*.spec.ts` unchanged and green; existing specs listed in the impact analysis re-run | logic |
| 14 | Live acceptance (AC-11, AC-12; OD-11 partly decided by owner 2026-10-18) | Three products (Creality Pika EXPERT3D, one Center 3D Print product, one 3DDevice product) x **2 runs** each with the Full description template; **every one of the six runs must pass the hard criteria** (0 deixis hits, no figure without a paragraph above, no two figures in a row, 0 numbers absent from the input); the six runs **include at least one run whose output contains non-marker (model-authored) figures** (R4); the evidence is the **script output** (with its Node version line); the soft criterion (2 of 3) is reported and never blocks; **a failing run is reported with that output and is not automatically iterated** (a further prompt iteration is a separate human decision, a further FROZEN edit). Not a unit test; outside the gate. **Still open:** which Center 3D Print and 3DDevice products, who runs them, how the six runs split between marker and non-marker | manual / opt-in |
| 15 | Definition of Done | `npm run lint`, `npm test` (both runners), `npm run test:coverage` (new `src/utils` files count toward the 80/80/75/80 floors), `npm run build`, `bash arch-guard.sh` | gate |
| 16 | Master reaches Task C description translation | `buildPromptC` description variants over `registryPairs()`: `systemBlocks[0].text` equals the live `MASTER_SYSTEM_PROMPT` and contains `NO_IMAGE_DEIXIS_RULE` and `LIVELINESS_RULES` (pattern: `task-c.faq.spec.ts` lines 168, 174 and `protected-name-precedence.spec.ts` "reaches every prompt that interpolates the constant" with its `TASK_C_BRANCHES`); block 1 and `userContent` unchanged per case (the amended Task C guard); `task-c.spec.ts` line 20 (`NUMERIC_SOURCE_FIDELITY_RULES` in block 0) re-run and stays green (OD-20(2): the text is not edited); `task-c.ts` / `task-translate.ts` zero `git diff` and unchanged arch-guard checksums | logic |
| 17 | Master is absent from the FAQ and translate variants | `task-c.faq.spec.ts` (line 82 negative), **`content-orchestrator.faq-standalone.spec.ts`** and `test/fixtures/faq-pipeline.ts` `masterPromptBlocks`: re-verified over the shifted `3000..3400` window and extended with the two new constants as explicit FAQ-negatives; `buildTranslatePrompt` payload equals its golden (block-0 digest `151c04990596`) | logic |
| 18 | Optimizer, parity gate and figure-format consumers | `optimizer.spec.ts` stays green and gains a reach pin (optimizer `systemBlocks[0]` carries both new constants; its own `TASK_OPTIMIZE_INSTRUCTION` is not edited); `structural-parity.ts` spec re-run (tags only; no edit) **plus an unconditional characterization pin (Q-TRANS option 3, decided 2026-10-18; documentation only, not an endorsement): `validateStructuralParity` reports no error when a sentence is added to, split in or removed from a `<p>` while the counted tags stay equal**; if a sentence-level check is ever added the pin is updated deliberately; `image-figure-style.prompt-examples.spec.ts` stays green (the pinned `short scannable description of what the image shows` and the `FIGURE FORMAT — wrap every image` block are untouched, FR-21); `protected-name-precedence.spec.ts` stays green | logic |
| 19 | FR-20 self-scoping sentence reaches all three payloads and no others | Over whitespace-collapsed text: the three strings `govern writing a new description`, `when the task is to translate an existing text they do not apply`, `the source's sentences and their order are kept` (ASCII apostrophe) are present in `systemBlocks[0].text` of `buildPromptA` for each of the 7 `STORE_REGISTRY` stores, of a `buildPromptC` description prompt (over `registryPairs()`) and of `buildOptimizerPrompt`; they are absent from the Task C FAQ variant and from `buildTranslatePrompt` (neither embeds the master); each equals `MASTER_SYSTEM_PROMPT`; the FR-20 Assert-absent of category 1 holds (no sentence-length number other than `6`; **not** "no digit"). Presence only: no test can show a translator or the optimizer obeys the sentence (declared residual risk) | logic |
| 20 | Pre-change oracle for the optimizer and the Task C FAQ variant | The D15 fixture, compared per block: optimizer block 1 and `userContent`, every block of the Task C FAQ variant, plus optimizer block 0 `toBe(MASTER_SYSTEM_PROMPT)` (not a digest). Green on arrival; must stay green after every master edit | logic |
| 21 | Operator-notes form state: FR-41, FR-31 items 4 and 5, FR-25 form side (new in v4) | `OperatorNotesFormState` behaviour as listed in D9 item 1 (clear, restore with notes, restore without notes, empty and whitespace-only values give no `operatorNotes` key, restore-then-clear) | logic |
| 22 | Optional live translation comparison (Q-TRANS option 1, decided 2026-10-18) | Translate the Creality Pika uk master (from the git-ignored `Knowledge/`) and compare sentence count and the pointer sentences with the source. Outside the gate, optional, never a requirement; it is the only evidence for R1a. Who runs it is not decided | manual / opt-in |

### D14. FR-27 golden: capture constraint (not a task order)

- The oracle is a **new fixture holding `userContent` only** (plus the Doc-wrapper remainder), so later master/instruction edits can never
  invalidate it. Input set per FR-27 (OD-18 accepted as built, decided by owner 2026-10-18): one store per group (`3DDevice`, `Center 3D Print`,
  `EXPERT3D`, `Expert-3DPrinter`), Full description and one simplified template, with/without `customInstructions`, with/without an image
  manifest, with/without `baseLanguageOverride`, plus video, marker, and video-plus-marker inputs. It adds the **marker input the existing
  goldens lack** (impact silent risk 7: `buildMarkerBlock` is otherwise never exercised by a byte golden).
- It is captured from the unmodified tree: **the commit the Story branch was cut from** (decided by the owner 2026-10-18, plan-review N16;
  currently `6546db8`, with the `.arch-guard-checksums` entry for `task-a.ts` recorded at that commit, currently `0421226c...`), before any
  edit to `task-a.ts`. The fixture header records that commit's hash and checksum, and the capture step verifies that `src`, `test`, `tools`,
  `server` and `package.json` are unchanged relative to it. It must be green on arrival. Tier B tests are red until the FR-11 spans land.
- AGENTS.md section 5 ordering: the capture and its spec exist before the first frozen edit; the golden is not regenerated to make a test pass.

### D15. Pre-change oracle for the optimizer and the Task C FAQ variant: capture constraint (not a task order; impact Risk 18, Unknown 15)

- **The gap.** Specification FR-23 items 4 and 5 claim that the optimizer's block 1 and `userContent`, and every block of the Task C FAQ
  variant, are unchanged. No byte golden, digest or snapshot exists for either payload (impact v4: `optimizer.spec.ts` is behavioural; the
  FAQ variant has only the negative master-fragment check). Their block 1 is a module-local constant, so an accidental edit to it, or to a
  constant they interpolate (`NO_LEAKED_REASONING_CLAUSE` for the optimizer, the `FAQ_*` constants for the FAQ variant), would pass every
  existing test. An empty `git diff` over `optimizer.ts` proves the file, not the payload.
- **Design.** A new fixture, in the shape of `task-c-description-prompts.json` (per block: sha256, length, `cache` flag), holding (i)
  `buildOptimizerPrompt` block 1 and `userContent` for a small input set (with and without `productName`, an input HTML with figures, one
  with a pointer sentence) and (ii) every block of the Task C FAQ variant (`buildPromptC(..., { contentKind: 'faq' })`) for the same 16
  store/language pairs the Task C description golden uses. Optimizer **block 0 is not digested**: it is asserted `toBe(MASTER_SYSTEM_PROMPT)`
  (property 6 already does this for one input), so the fixture never has to follow a master edit and **nothing in it is expected to move**.
  The exact inputs are the test-writer's.
- **Capture constraint.** Captured from the unmodified tree (**the commit the Story branch was cut from**, currently `6546db8`; the hash is in
  the fixture header), before the first edit to `src/prompt-core/constants.ts` or `src/prompt-core/master-system-prompt.ts` (both are in the
  import chain of those payloads). It must be green on arrival and stay green through every later commit; it is never regenerated or updated
  to follow a change (AGENTS.md section 7.7). A red result means a block that FR-23 says is unchanged has changed. It does not change the Task C
  description guard.
- **What it does not do.** It does not close R7a (optimizer behaviour) or R1a (translator behaviour); it only makes "unchanged" a tested claim
  instead of a `git diff` reading. Category 20 (D13).

## Files to create / modify

**Create**

| File | Purpose |
|---|---|
| `src/utils/image-deixis.ts` | detector, carrier walk, issue builder (D5, D6) |
| `src/utils/image-deixis.spec.ts` | categories 3, 4, 5 (units) |
| `src/utils/description-metrics.ts` (+ `.spec.ts`) | metrics core and hard-violation decision (D12) |
| `src/prompts/operator-notes.ts` (+ `.spec.ts`) | empty rule, block, form helpers (D8) |
| `src/app/operator-notes-form-state.ts` (+ `.spec.ts`) | `OperatorNotesFormState`: `restore`, `clear`, `inputPart` (D9; FR-41, FR-31 items 4 and 5; category 21) |
| `src/app/components/operator-notes-fields/operator-notes-fields.component.{ts,html}` and `.component.spec.ts` | the four textareas (D9) |
| `tools/measure-description.ts` | thin CLI (D12) |
| `test/measure-description.cli.spec.ts` | CLI contract spawn test |
| `test/fixtures/golden/task-a-user-content.json` and its inputs file `test/fixtures/task-a-user-content-inputs.ts`, spec `src/prompts/task-a.user-content.golden.spec.ts` | FR-27 oracle (D14) |
| `test/fixtures/golden/` fixture for the optimizer and the Task C FAQ variant, its spec (names are the test-writer's) | pre-change oracle, captured from the commit the Story branch was cut from, before any master edit (D15, category 20) |
| prompt-pin specs for vision-prepass, master/constants, task-a (FR-11, FR-26), task-a-doc, video-manifest (templates, messages), orchestrator texts, app wiring | categories 1, 2, 6, 9, 11, 19 (names are the test-writer's) |

**Modify (non-frozen)**

| File | Change |
|---|---|
| `src/prompts/vision-prepass.ts` | FR-1..FR-4 |
| `src/prompts/task-a-doc.ts` | FR-10 only (no `[Operator Notes]` text, OD-19 (1b)) |
| `src/prompt-core/constants.ts` | `NO_IMAGE_DEIXIS_RULE`, `LIVELINESS_RULES` (with the self-scoping sentence), C3D OVERRIDE #5, EXPERT3D overlay |
| `src/utils/video-manifest.ts` | FR-13 detail, FR-15 templates |
| `src/utils/image-placeholder.ts` | `figureCaptionWarnings` optional locale + `image-caption-deixis` before the fallback-label skip |
| `src/services/content-orchestrator.service.ts` | FR-14 two texts, FR-30 `numericFidelitySources` (notes only) + comment |
| `src/app/types.ts` | `OperatorNotes`, `ProductInput.operatorNotes` |
| `src/app/app.component.ts` / `.html` | `operatorNotesState`, labels, component placement, `buildGeneratorInput` spread, `restoreHistory` line, **`clearAll` in both the `generator` and the `ua-generator` case (FR-41)**; all only with the T-A4 approval (D8 Gate) |
| `test/fixtures/golden/full-description-prompts.json`, `test/fixtures/full-description-inputs.ts` header, `src/prompts/full-description.golden.spec.ts` | reviewed regeneration + "regenerated" pins (D11) |
| `src/prompts/task-c.description-bytes.spec.ts` | the amended guard, option (b) (D0.2, D11). `test/fixtures/golden/task-c-description-prompts.json` is **not modified** (empty `git diff`) |
| `src/prompts/task-c.spec.ts`, `src/prompts/task-c.faq.spec.ts`, `src/prompts/optimizer.spec.ts`, `src/prompt-core/protected-name-precedence.spec.ts`, `test/fixtures/faq-pipeline.ts`, `src/utils/structural-parity` spec | new reach pins, FAQ-negatives and the characterization pin, D13 categories 16 to 19; existing assertions are kept or extended, never narrowed (names are the test-writer's). `master-system-prompt.image-markers.spec.ts` (property 6), `output-integrity-wiring.spec.ts`, `task-translate.simplified.spec.ts` and `content-orchestrator.faq-standalone.spec.ts` are re-run and **not edited** |

**Modify (FROZEN, each only on its own approval)**: see the next section. **Re-verified, not edited**: the rows of the impact analysis v4 section
"Needs re-verification" (including `image-placeholder-validate.ts`, `repair-gate.ts`, `simplified-template-blocks.ts`, `optimizer.ts`, `task-c.ts`,
`task-translate.ts`, `structural-parity.ts`, `history.service.ts`, `runFaqPipeline`, `hook-pattern.ts`, `app.component.template-wiring.spec.ts`).
`task-c.ts` and `optimizer.ts` are **payload-level** consumers of the edited master; `task-b.ts` and `task-c.ts` stay byte-identical as files.

## FROZEN-file position

**No approval exists and none is claimed. There is no per-file "modify <filename>" approval.** AGENTS.md section 9 requires the instruction "modify
[filename]" for each file in the session that edits it; the Specification Scope says the same. Approving this plan records the **request** below; it does not by
itself authorise the builder. Each file is a separate request, and `task-a.ts` is four separable items so that refusing one is visibly not refusing the others.
`task-b.ts` and `task-c.ts` are not edited (arch-guard checksums unchanged).

**The owner's stated INTENT (2026-10-18, OD-12; intent only, not an approval):** edit `task-a.ts` T-A4 first, then `output-validator.ts`, then
`master-system-prompt.ts` last; one commit per task, each with `bash arch-guard.sh --rebaseline` followed by a clean run, and
`.arch-guard-checksums` committed in the same commit as that edit. The "modify <filename>" instruction will be given per file in the editing
session. This plan records that intent, decides no task order, and treats every FROZEN hunk below as **blocked until that per-file
instruction is given**. Left to the task breakdown: whether T-A1..T-A3 share a commit with T-A4 or are their own commits. The dependency this
plan does state: **M6 depends on T-A4** (D8 Gate). A commit that edits a FROZEN file also carries the golden regeneration that edit forces, with
a reviewed diff limited to that edit's text, so every commit is green (AGENTS.md section 13); the amended Task C guard needs no co-commit (D0.2).

**Refusal rule (plan-review N14; applies to EVERY FROZEN item below: T-A1..T-A4, M1..M7, O1, O2).** If the owner refuses an item, or no
instruction is given for it: (1) the specs written for that item **stay red**; the builder never deletes, skips, loosens or rewrites a test to
make a gate pass (AGENTS.md section 7.7); (2) the scope consequence is the human's decision (drop that FR, drop the FR range, or re-scope the
Story); the plan and the builder decide nothing; (3) the work returns to TEST_WRITING through a loop-back so the specs are reconciled with the
human's scope decision; (4) nothing that depends on the refused item ships (D8 Gate: no inert input, no master sentence about a block that is
never emitted). The per-item consequences are in the table after the hunks.

### 1. `src/prompts/task-a.ts` (four items)

- **T-A1 (FR-11.1), `TASK_A_INSTRUCTION`**. Why: the clause teaches the model to write an introducing "lead-in" above a figure. Before: `...directly after a </ul>: an image still needs its own lead-in <p>.` After: `...directly after a </ul>: a figure needs a body <p> directly above it, and that <p> never refers to the picture.` The words `Do not place a <figure> directly after a </ul>` are unchanged.
- **T-A2 (FR-11.2), `buildVideoBlock`**. Why: the line tells the model to introduce each video with its own lead-in. Replace `Introduce each with its own lead-in <p> in the body language, and place it in §3 FUNCTIONALITY, before §7. The lead-in must not restate the figcaption.` with `Place each directly after a body paragraph of its sub-section, written in the body language, that states a product fact and does not refer to the video, and place it in §3 FUNCTIONALITY, before §7. That paragraph must not restate the figcaption.` (owner's pointer-free wording; `§3 FUNCTIONALITY, before §7` unchanged).
- **T-A3 (FR-11.3), `buildMarkerBlock`**. Why: the marker is told to sit after "the sentence that introduces what the image shows". Replace `at the end of the sentence that introduces what the image shows;` with `at the end of the paragraph that states the product fact the image belongs to (the paragraph never mentions the picture);`. (Source-analysis wording, PROPOSED DEFAULT, unconfirmed: FR-11 item 3 stays an open residue.)
- **T-A4 (FR-26)**. Why: the only route to the `[Operator Notes]` block (`buildPromptADoc` and the plain-HTML path both go through this builder). Add `import { buildOperatorNotesBlock } from './operator-notes';` and insert `${buildOperatorNotesBlock(input.operatorNotes)}` immediately before `${buildImageBlock(input, store.imageBaseUrl)}` on the line after `[Supplemental Content]: ...`. The block text, labels, order, `\n` and position are the owner-confirmed OD-16/OD-17 values; the rendering code is in the leaf module, not in the frozen file. **The owner's intent puts this item first.**

### 2. `src/prompt-core/master-system-prompt.ts` (hunks M1..M7; the owner's intent puts this file last)

- **Affected consumers the approval must name (impact v4).** `MASTER_SYSTEM_PROMPT` is `systemBlocks[0]` of three prompt families:
  **(i) Task A** (`task-a.ts`, and `buildPromptADoc` through it), **(ii) Task C description translation** (`task-c.ts` `pack()`
  line 89; all 96 store x language prompts; the FAQ variant and `task-translate.ts` are not reached), and **(iii) the optimizer**
  (`optimizer.ts` `buildOptimizerPrompt` line 124). Editing the master is, in effect, a behaviour change of a second FROZEN prompt
  (`task-c.ts`) without that file's checksum moving: `arch-guard.sh` will not show it. The human giving "modify
  `master-system-prompt.ts`" is therefore asked to give it **knowing** that (1) the Task C description prompts and the optimizer
  prompt will carry the new NO PICTURE REFERENCES, PLACEMENT, GROUNDING LOCK, `[VIDEO]`, STRICT INPUT SCOPE, INTERNAL RECONCILIATION
  and liveliness text (accepted by the owner, Q1); (2) 10 of 12 cases of `full-description-prompts.json` move at block 0 and the Task C
  digest guard is amended to compare block 0 with the live master (D11); (3) the translation-side behavioural risk (R1a, a declared
  residual risk) and the optimizer's inheritance (R7a) are not closed by this edit; (4) the shared liveliness block carries the FR-20
  self-scoping sentence (literal confirmed by the owner, Q-SCOPE), which tells a translator to keep the source's sentences and their order
  while `NO_IMAGE_DEIXIS_RULE` tells it that a pointer sentence is deleted, not reworded (D0.6, R1d), and which does not name the optimizer's
  task; (5) this is the owner's decision on plan-review B1 and the request names its consequences; it is not an approval; **(6) the
  FR-29 edit (M6) makes block 0 of the Task C description translation and of the optimizer name `[Operator Notes]` in `STRICT INPUT SCOPE`,
  although their `userContent` never carries that block (FR-40 item 2; impact v4 risk 22, R22).**

- **M1** import: add `NO_IMAGE_DEIXIS_RULE, LIVELINESS_RULES` to the existing `./constants` import.
- **M2 (FR-5)**: add `${NO_IMAGE_DEIXIS_RULE}` as its own block between the end of `[VIDEO]` and the `[IMAGE HANDLING]` heading (outside the pinned span).
- **M3 (FR-9)**, `[VIDEO]`: `Introduce every embed with a lead-in <p>. Emit exactly one copy` becomes `Place every embed directly after a body paragraph of its sub-section; that paragraph states a product fact and never points at the video ("below", «нижче»). Emit exactly one copy`.
- **M4 (FR-8)**, IMAGE GROUNDING LOCK: add first bullet `The lock restricts claims ABOUT THE IMAGE (what it proves, compares, demonstrates). It does not restrict product facts: the paragraph above a figure MAY and SHOULD state any fact from [Technical Specs] / [Raw Description] that belongs to the figure's subject, written as ordinary prose that never mentions the picture.`; change `the lead-in may reference the image only descriptively ("the head assembly shown here…")` to `the paragraph may name the depicted object only as a plain product fact ("The unit has three round modules on its back.")`.
- **M5 (FR-6, FR-7)**, PLACEMENT: replace the `LEAD-IN:` bullet (which contains `SUBSTANTIVE NARRATIVE SENTENCE`, `The image below shows`, `visible here`) and the `Give lead-in and figcaption separate jobs` bullet with the three bullets of FR-7 (`PRECEDING PARAGRAPH` ...); the SPACING sentence `every <figure> in the document therefore has a narrative <p> directly above it` is kept.
- **M6 (FR-29; depends on T-A4, D8 Gate)**: STRICT INPUT SCOPE names `[Operator Notes]` next to the three existing names; INTERNAL RECONCILIATION `scan the three input blocks` becomes neutral wording without a count (Appendix B). Not applied unless the T-A4 block exists in the tree (the master must not name a block no task emits).
- **M7 (FR-20)**: add `${LIVELINESS_RULES}` as a static block directly after `${SENTENCE_LENGTH_RULES}`. The constant (in `constants.ts`, not
  in the frozen file) ends with the self-scoping sentence (Appendix C); because the master is `systemBlocks[0]` of three families, this one
  hunk is what delivers the sentence to Task A, Task C description translation and the optimizer.
- Why: these are the master-prompt sources of the pointing phrasing (source analysis S1..S4) and the home of the shared rule; the cached prefix changes once for all stores.

### 3. `src/utils/output-validator.ts` (hunks O1, O2; the owner's intent puts this file second)

- **O1 (FR-13)**: in `checkImageManifestCoverage`, the `image-manifest-missing` detail `a substantive lead-in <p> directly above it, never adjacent to another <figure>, filename verbatim.` becomes `a body <p> directly above it (a product fact that does not point at the picture), never adjacent to another <figure>, filename verbatim.` Why: the repair cycle feeds this text back to the model; the old wording reintroduces the pointing phrasing.
- **O2 (FR-18)**: add `import { imageDeixisIssues } from './image-deixis';` and one line `issues.push(...imageDeixisIssues(doc, locale, context));` inside the existing `try` after the figure rules. Why: AC-7 requires `validateGeneratedHtml` itself to emit `image-deixis` at `warning`; the logic is in the sibling.

### What a refusal drops (OD-12 is the human's; this only states consequences; the Refusal rule above applies to every row)

| Refusal | Dropped | Notes |
|---|---|---|
| `task-a.ts` entirely | FR-11, FR-26, and with it FR-24..FR-31 (and FR-40's meaning, **FR-41**, and **M6**) | No non-frozen route to FR-26. Textareas must not ship inert (D8 Gate: the component, `OperatorNotesFormState`, labels, history wiring and **both** `clearAll` resets are **not built**; the leaf module and the type are dropped too unless the human decides otherwise). M6 is not applied (the master would name a block no task emits); the rest of the master hunks are independent. Scope drop (FR-24..FR-31 with FR-40/FR-41, or the Story) is the human's. FR-27 then guards only the form side, which does not exist |
| T-A1..T-A3 only | FR-11; Tier B degenerates to Tier A equality | FR-26, FR-41 unaffected. The Tier B specs stay red until the human decides |
| T-A4 only | FR-26 and FR-24..FR-31, with FR-40's meaning, **FR-41** and **M6** | FR-11 unaffected. Same inert-input rule as above: nothing user-visible of D8/D9 ships |
| `master-system-prompt.ts` | FR-5..FR-9, FR-20, FR-29 (M6 with them) | Most of AC-2 and AC-8. A partial non-frozen lever exists (an extra system block built in `task-a-doc.ts` for Doc stores) but it does not satisfy AC-2, does not reach Expert-3DPrinter, and is not planned. A refusal also removes every Task C / optimizer consequence in D0 (no block-0 move; the guard amendment becomes a harmless strengthening; R1a, R7a and R22 fall away), because the same edit is what reaches them. The master specs and category 16 / 19 tests stay red |
| `output-validator.ts` | FR-13 first half, FR-18 | Fallback: emit the paragraph warning from the orchestrator through `imageDeixisIssues` (US-5.1 sibling precedent); that does not match AC-7's wording that `validateGeneratedHtml` emits it. The FR-13 / FR-18 specs stay red |

## Risks

| # | Risk | How it would surface |
|---|---|---|
| R1 | D0: the master is embedded in Task C (description) and the optimizer (accepted by the owner, Q1); the 96 Task C cases and 10 of 12 `full-description-prompts.json` cases move at block 0 by design | `task-c.description-bytes.spec.ts` red on 96 per-case tests until it is amended (option (b), green on arrival); full-description golden red until regenerated with a reviewed diff |
| R1a | **Declared residual risk (Specification note G; accepted with Q-TRANS options (1)+(3), 2026-10-18; not closed by any decision in this plan).** (impact silent risk 14) Translators inherit authoring rules. SCENE, RHYTHM or HOOK can make a translator add, split, merge or delete sentences or add an opening hook inside a `<p>`; NO PICTURE REFERENCES tells it to delete a pointer sentence that a stored uk master legitimately contains, while the `<p>` above a figure must survive. `validateStructuralParity` counts tags only (`<section> <h2> <h3> <hr> <figure> <figcaption> <table> <tr> <td> <li>`), so sentence-level changes inside `<p>` pass with **no error and no warning** | Not visible to any gate or unit test (the category 18 characterization pin documents the blind spot; it does not detect anything). Only the optional live translation comparison for Creality Pika (category 22, outside the gate) shows it. The FR-20 self-scoping sentence (D0.5) lowers it and does not remove it (a model may ignore it) |
| R1b | (impact silent risk 16) All 96 cases share one block-0 digest; the cheapest ways to turn the guard green (bump the digest; relax block 0) can stop it protecting block 1 and `userContent` if done carelessly | A diff of the guard that touches anything but the block-0 comparison; the amendment must keep the block count, the cache flag and the block-1 / `userContent` pins and is shown to fail on a deliberate mutation (D0.2) |
| R1c | (impact silent risk 17) A file-level FROZEN check hides a payload-level change: arch-guard, `git diff -- src/prompts/task-c.ts` and a reviewer reading "FR-23 satisfied" all pass while the bytes sent for every translation change | Only the amended Task C guard, the regenerated golden's reviewed diff and property 6 see it; reconciliation must not accept FR-23 / AC-8 as "translation prompts unchanged" without D0.3 |
| R2 | Cache invalidated for every store once (NFR-1) and for Task C / optimizer | First-request cost spike; not a defect |
| R3 | Prompt wording cannot be proven by a unit test to change model output | Only FR-34/FR-35 live runs show it; a failing live run is reported, not auto-iterated (OD-11), and any further iteration is a separate human decision and may need a further frozen edit (new approval) |
| R4 | FR-1/FR-2 reach only marker-built figures (`buildFigureParts`); model-authored figcaptions use the master `FIGURE FORMAT` line (`short scannable description of what the image shows`, pinned by `image-figure-style.prompt-examples.spec.ts`) and the English manifest `caption`, which no FR edits, yet AC-11 requires 0 hits in every figcaption/alt. The owner's OD-11 answer requires a non-marker run, so this exposure is **accepted** (Spec FR-34 coverage note, note H) | The non-marker live run can fail the hard criterion on figcaptions that no warning flags and only FR-5 addresses; the script counts them; the failure is reported, not iterated |
| R5 | Code-authored `ALT_PREFIX` / `FALLBACK_LABEL` text (the detector deliberately does not match it, Q-CODEALT "no") | FR-2 is unmeasured for those figures; the script never exits non-zero on text no prompt can fix |
| R6 | Warnings are never repaired; figcaption on non-marker figures and `alt` have no warning on any path; Doc stores see the paragraph warning only post-hoc | Deixis ships and is visible only in the issues list or the script |
| R7 | `optimizer.ts` inherits the master but has its own figcaption instruction (accepted, Q-OPT option 1) | Optimizer output may still contain pointer figcaptions or pointer sentences carried over from its input; not in any acceptance run |
| R7a | (impact silent risk 15, softened per Q-OPT) The optimizer's own `TASK_OPTIMIZE_INSTRUCTION` (line 87) asks to author "a context-aware <figcaption> ... with a <b> lead-in"; that lead-in is the figcaption `<b>` label, **not** a lead-in `<p>`, so the instruction does not ask for the pointer paragraph FR-5/FR-7 remove. The optimizer inherits PLACEMENT and `[NO PICTURE REFERENCES` through block 0. What stays silent: its figcaption text is model-authored for every figure (the R4 exposure); its input may contain pointer sentences that the master says to delete while its task is to restructure; the FR-20 self-scoping sentence names neither writing nor translating for it (impact Unknown 16); it is outside every acceptance run (OD-6) and had no byte golden before D15 | Optimizer output with pointer figcaptions or retained pointer sentences; no gate, no warning (the new deixis warnings run on Generator and UA Description output, and the optimizer path runs `runRepairGate`, which ignores warnings) |
| R8 | Simplified Doc templates keep "a paragraph block that introduces it" (`simplified-template-blocks.ts` lines 123, 165, 208; Q-SIMPL "no") | Unmeasured; simplified output may keep a mild introducing paragraph |
| R9 | Overlay out-voting the master (precedent: C3D collapse): EXPERT3D functional `<h2>` next to `[HEADING FORM]`, and the amended overlay line | `task-a.spec.ts` guards stay dormant only while `never bare noun` is absent; the product name appearing in a functional heading trips the global heading check |
| R10 | Detector precision: uk prefix/FP candidates, unreviewed non-uk lists (OD-7 accepted as built; native review out of scope) | False warnings on product facts such as resin printers, or missed pointers; severity is `warning` so nothing blocks |
| R11 | linkedom vs happy-dom DOM differences in `collectFigureDeixis` | The CLI and the unit tests disagree on a fixture; both run in tests (CLI spawn test uses linkedom) |
| R12 | Native type stripping needs Node >= 22.18; the repository pins no Node version, so another machine can fall below it silently; one stray extensionless or non-erasable import breaks the CLI | The report's leading `process.version` line shows it; the spawn test fails; the D12 launcher is built only if the implementation-stage check fails |
| R13 | Resend of restored notes (OD-2 R1, decided) and the stale-notes hazard (impact risk 11) | An operator regenerates from a restored entry and the old notes ride along (by decision); FR-41's reset on Clear All is the operator's way out |
| R14 | Notes enlarge the input under the 25,000-character output cap (silent risk 10) | The model drops the element that has no manifest (video/figure); existing coverage rules catch it |
| R15 | Numeric gate asymmetry (decided, OD-20(2)): notes pass `numericFidelitySources`, `supplementalContent` does not, and the rule text does not name the notes | A number only in notes passes the gate while the model prompt's numeric rule text does not list notes; nothing errors |
| R16 | The live acceptance runs depend on git-ignored `Knowledge/` for Creality Pika (OD-13); the baseline 35 and the 48-word hook accepted as built (OD-14) | Reconciliation compares against numbers the repository cannot reproduce |
| R17 | FROZEN approvals are per file and per editing session (section 9); plan approval alone, and the owner's stated order, are not an edit approval | A builder reaching an edit without the "modify [filename]" instruction must stop |
| R1d | **FR-5 versus the self-scoping sentence, in the same cached block 0.** `NO_IMAGE_DEIXIS_RULE` says a pointer sentence is "deleted, not reworded"; `LIVELINESS_RULES` says that in a translation "the source's sentences and their order are kept". On a legacy uk master that still contains «нижче» / «на знімку», a translator holds both instructions. The FR-5 literals are pinned and must stay verbatim, so the plan cannot reconcile them by rewording either; Q-TRANS option (2) was not chosen | Not visible to any gate or unit test; the optional live translation comparison (category 22) of a legacy master would show whether pointer sentences are kept or deleted |
| R18 | (impact silent risk 18) No pre-change oracle for the optimizer's block 1 / `userContent` or for any block of the Task C FAQ variant; an accidental edit to a constant they interpolate would pass every existing test | Mitigated by D15 (capture from the unmodified tree). If the capture is skipped, "unchanged" rests on `git diff` over `optimizer.ts` and `task-c.ts`, which does not see an interpolated-constant edit |
| R19 | (impact silent risk 19) The cached prefix of all three families grows (FR-5, FR-20 with the self-scoping sentence, FR-29) from about 45 387 characters; no spec bounds prompt size | Cost and latency only; nothing errors. Recorded, not mitigated |
| R20 | The operator-notes slice (including FR-41 and M6) is gated on one frozen approval (T-A4). If it is refused after work started, collected-but-never-sent input or a dangling master sentence would ship | D8 Gate: nothing user-visible is built and M6 is not applied before T-A4 is approved; the Refusal rule applies |
| R21 | `LIVELINESS_RULES` / `NO_IMAGE_DEIXIS_RULE` prose can break watch-item tests that scan the whole master (`§C1`..`§C6`, `CONSUMABLES`, `fit-content`, two Task C negative phrases) | `task-translate.simplified.spec.ts` line 83, `task-c.spec.ts` lines 271 and 295, `image-figure-style.prompt-examples.spec.ts` line 57 go red; fix the prose, never the test |
| R22 | (impact silent risk 22) The FR-29 edit (M6) puts `[Operator Notes]` into `STRICT INPUT SCOPE` in block 0 of Task C description translation and of the optimizer, whose `userContent` never carries the block; for the six Doc-pipeline stores the master bullet is the only prompt text that names it (OD-19 (1b)) | No test fails and none can: those two families read a source name for an absent block; the category 9 test pins that block 0 names it and `userContent` does not. Accepted by the owner's Q1 and FR-29 decisions; named in the master request (consequence 6) |
| R23 | (impact silent risk 20) `clearAll()` has two independent, textually identical bodies; a reset added to one leaves the other mode carrying the previous product's notes into the next request, and a pin that slices the whole `clearAll()` block passes with one case edited | The per-case disjoint-slice pins and the state-class tests (D9). Residual: no test executes `AppComponent.clearAll()` itself (Q-FR41-TEST) |
| R24 | (impact silent risk 21) Under option (b) the 96 block-0 `sha256`/`length` records in `task-c-description-prompts.json` are unread: a fixture that quietly diverges from the code it documents; and block 0 equal to the live master proves "block 0 is the master", not "the master did not change unintentionally" | The amended spec header names the unread records and that they describe the pre-Story master; the second claim rests on the regenerated `full-description-prompts.json` reviewed diff (block 0 of the three `c/*` cases) and the master specs. Nothing fails if the JSON is never touched again, by design |

## Rejected alternatives

1. **A Task-A-only cached block instead of master interpolation.** Keeps Task C clean, but AC-2 and AC-8 require the text inside the master and the master is shared; rejected as the primary design (kept as the partial fallback for a master refusal).
2. **Sibling-only validator (no `output-validator.ts` edit) for FR-18.** US-5.1 precedent and no frozen change, but it contradicts AC-7 ("`validateGeneratedHtml` emits"); kept as the fallback if O2 is refused. O1 cannot be done by a sibling.
3. **Put the notes into `supplementalContent`.** Rejected by the owner (OD-1): it is the only FAQ trigger.
4. **Render the notes inside `task-a.ts` without a leaf module.** Larger frozen hunk and the Angular builder would need a second copy of the empty rule; rejected.
5. **Four inline textareas in `app.component.html`** (like `customInstructions`). Smaller, but no render-and-interact test is possible without the first `AppComponent` TestBed spec (AGENTS.md section 5); rejected for the component.
6. **First `AppComponent` TestBed spec** for restore/build/clear. Heavy DI, rejected in US-2.2; the state class plus call-site pins are used instead (D9). Whether the human wants an `AppComponent`-level test anyway is Q-FR41-TEST.
7. **Add `tsx` or `ts-node` for the script.** New dependency (approval); rejected. **Run the script as `.mjs`**: contradicts AC-10's `.ts` file; rejected.
8. **Metrics inside `tools/`.** Outside lint, coverage and vitest; rejected for the core, kept for the CLI shell.
9. **Edit `simplified-template-blocks.ts` and `optimizer.ts` for consistency.** No FR asks for it, acceptance is Full description only; the owner answered Q-SIMPL "no" and Q-OPT option (1) (2026-10-18). Recorded as R7/R8.
10. **Edit `ALT_PREFIX` / `FALLBACK_LABEL`.** No requirement covers code-authored labels; the owner answered Q-CODEALT "no".
11. **Make the shared liveliness block, or the `[Operator Notes]` naming in `STRICT INPUT SCOPE`, per-store or per-family (interpolated by store or by Task A only).** Would break byte-stable caching across stores and the cached-prefix test, and would need a second master source of truth for Task C and the optimizer (see 14).
12. **A `validateGeneratedHtml` call that re-parses the HTML.** Second parse of every artifact; rejected in favour of reusing `doc` inside the existing `try`.
13. **Promote the warnings to `error`.** Out of scope (follow-up after real runs); it would also enter the repair loop.
14. **Give Task C and the optimizer a master without the new blocks** (so the translation prompts stay unchanged). Needs `task-c.ts` / `optimizer.ts` to build a different system block (a FROZEN-file edit for Task C, against FR-23) or a second master constant (a second source of truth the master specs would not guard); rejected. Its cost, the payload-level reach, is accepted (Q1).
15. **Edit `optimizer.ts` `TASK_OPTIMIZE_INSTRUCTION` in this Story.** Its "lead-in" is the figcaption `<b>` label, not a lead-in `<p>`; no FR asks for it, the optimizer is outside acceptance (OD-6) and it would add an unmeasured prompt change; the owner chose Q-OPT option (1).
16. **Add a sentence-count check to `validateStructuralParity` for `<p>` content** (Q-TRANS option 4). Would make R1a visible, but it is a new requirement and an edit to a gate every translation passes (false-positive cost); not chosen. Only the documentation-only characterization pin (option 3) is planned.
17. **Rely on `git diff` and arch-guard alone for "optimizer and Task C FAQ block 1 / `userContent` unchanged".** Proves the file and not the payload (an interpolated-constant edit passes it) and the Specification states the claim as a testable outcome; rejected in favour of the D15 capture.
18. **Put the self-scoping sentence in a second constant, or in `task-c.ts` / `optimizer.ts`.** A second constant would be a second source of truth for the master specs; editing `task-c.ts` is a FROZEN edit against FR-23. FR-20 puts the sentence in the one shared liveliness constant; rejected.
19. **Ship the four textareas first and wire the prompt later (or if `task-a.ts` is approved).** Collects, stores and restores input that never reaches a prompt; rejected, the form half (and M6, and FR-41) is gated on T-A4 (D8 Gate).
20. **Reconcile FR-5 and the self-scoping sentence by rewording either (Q-TRANS option 2).** The FR-5 literals are pinned by the approved Specification and the self-scoping literal is the owner's; rewording would be the plan composing unauthorised requirement text. Not chosen; recorded as R1d.
21. **Task C guard option (a): a reviewed update of the one block-0 digest record in `task-c-description-prompts.json`.** Rejected because the owner chose (b) (2026-10-18). Its cost was a ceremony repeated on every later master edit, a digest bump that a careless change could use to stop protecting block 1 and `userContent`, and a co-commit with the master edit; (b) is green on arrival and cannot rot on master edits.
22. **Keep one bare notes signal in `AppComponent` with pure helpers only.** Smaller, but `restoreHistory`, `clearAll` and `buildGeneratorInput` could then be proven only as text; the state class makes the empty-values, restore and clear chains executable tests. The bare signal stays the fallback if the human prefers it (the call-site pins are unchanged either way).
23. **Merge the two identical `clearAll` cases into one fall-through case.** Would make "reset in both modes" true by construction, but it is an unrequested refactor of existing code (FR-41 item 3: nothing else changes) and widens the diff of a function the other modes share; rejected in favour of two edits plus disjoint-slice pins.

## Questions and residues for the human

**Decided by the owner on 2026-10-18** (source: the history event "Plan gate NOT approved", 2026-10-18T10:08Z, sbruhov@gmail.com; recorded in Open
Decisions v4 "Plan-level answers"). These are **no longer open questions**; each is marked "decided by owner 2026-10-18" where the plan uses it:

- **Branch**: `feat/US-9.1-*` is cut from `6546db8`; the fixtures record "the commit the Story branch was cut from" (N16) (D14, D15).
- **Q-OD12 (intent only)**: `task-a.ts` T-A4 first, then `output-validator.ts`, then `master-system-prompt.ts` last, one commit per task with `bash arch-guard.sh --rebaseline` in the same commit. **Not an approval**; the "modify <filename>" instruction is still to be given per file in the editing session (FROZEN-file position). OD-12 itself stays open.
- **Q1**: master accepted in Task C and the optimizer; guard option (b) (D0.2, D11).
- **Q-TRANS**: options (1)+(3); optional live translation comparison for Creality Pika outside the gate (D0.4, D13 categories 18, 22).
- **Q-OPT**: option (1), no `optimizer.ts` edit; R7a softened (D7, R7a).
- **Q-SCOPE**: the FR-20 self-scoping literal with "headings" dropped; the three Assert-present strings and category 19 updated (D0.5, Appendix C).
- **Q-CLEARALL**: the reset in both `clearAll` cases (FR-41; D9).
- **Q-OD2**: R1 and R2 as the defaults (D9). **Q-OD19**: (1b) no, (2) yes (D8). **Q-OD20**: defaults; script input set D-10 (D8, D12).
- **Q-OD7, Q-OD8, Q-OD14, Q-OD18**: accepted as built (D5, D12, D14). **Q-OD9**: verify Node >= 22.18, else the D12 launcher (D12).
- **Q-OD11 (in part)**: three products x 2 runs, every run passes the hard criteria, the runs include a non-marker run, evidence = script output, a failure is reported and not auto-iterated (D13 category 14).
- **Q-CODEALT**: no. **Q-SIMPL**: no.
- **Findings**: N10 (FR-20 wording governs; D7, D13), N14 (M6 depends on T-A4; one no-weakening rule for every refused FROZEN item), N11, N13 (moot), N15, N12, N16 folded in.

**Still open (explicit questions or residues; the plan decides none of them):**

- **Q-FR41-TEST (new in v4; plan proposal, default stated).** FR-41's Tests paragraph says "invoke Clear All". No test executes `AppComponent.clearAll()`:
  the plan proves what `clear()` does by tests on `OperatorNotesFormState` (D9 item 1) and that each of the two `clearAll` cases calls it by
  disjoint-slice source-text pins (D9 item 2). **Default if the human gives no answer: accept this split.** Alternatives: (a) require a first
  `AppComponent` test (a construction through `runInInjectionContext(Injector.create(...))` with stubbed services is a candidate the test-writer
  may probe; it has not been run here and may not work, see D9 item 3); (b) keep the bare signal and helpers only (rejected alternative 22).
- **OD-12 (per-file instruction)**: the AGENTS.md section 9 "modify <filename>" instruction has not been given for any file or item. Left to the
  breakdown: whether T-A1..T-A3 share a commit with T-A4. The refusal consequences are in the FROZEN-file position.
- **OD-10 (D-3, D-4, D-5, D-7 and the D-9 half of (4))**: PROPOSED DEFAULT metric definitions, built as written and marked unconfirmed in the code header.
- **OD-11 residue**: which Center 3D Print product and which 3DDevice product; who runs the six live runs (cost, API keys; never part of the gate); how the six runs split between marker and non-marker. Also who runs the optional category 22 comparison.
- **OD-13 (rest)**: whether the unpinned restated text is normative, and where the reference outputs live. **Plan items that take wording latitude from it
  (plan-review N15; the breakdown's H-OD13 register row must list the same set):** the D7 prose for FR-10 to FR-15 (Doc FIGURE PLACEMENT, C3D override
  #5, validator and orchestrator messages, Appendix E `LEAD_IN_TEMPLATES`), the FR-20 to FR-22 prose beyond their asserted literals (Appendix A and C), the
  FR-1 and FR-2 Vision-prepass prose beyond the asserted strings. The `[Operator Notes]` block text and labels are owner-confirmed (OD-16/OD-17) and
  take no latitude.
- **OD-15**: what verifies the ban in non-uk-UA languages beyond the warning (open, no default).
- **FR-11 item 3**: the marker span (T-A3) is the source-analysis wording, a PROPOSED DEFAULT, unconfirmed.
- **FR-20 precedence sentence**: `where a store voice block defines its own bullet form, heading form, tone or punctuation limits, that block wins` is a PROPOSED DEFAULT, unconfirmed.
- **FR-29 open note**: whether other places in the `[SOURCE FIDELITY]` block count or enumerate input blocks (none found; the OD-20 answer neither confirms nor changes it).

## Traceability

| Requirement | Design decision / file |
|---|---|
| FR-1..FR-4 | D7 `vision-prepass.ts` |
| FR-5 | D4, D7, M1/M2, `constants.ts` `NO_IMAGE_DEIXIS_RULE` |
| FR-6, FR-7, FR-8, FR-9 | M3, M4, M5 (master) |
| FR-10 | D7 `task-a-doc.ts` |
| FR-11 | T-A1, T-A2, T-A3 (`task-a.ts`) |
| FR-12 | D7 `constants.ts` C3D OVERRIDE #5 |
| FR-13 | O1 (`output-validator.ts`), D7 `video-manifest.ts` |
| FR-14 | D7 `content-orchestrator.service.ts` |
| FR-15 | D7 `video-manifest.ts`, Appendix E |
| FR-16, FR-17 | D5 `image-deixis.ts` |
| FR-18 | D6, O2 |
| FR-19 | D6 `image-placeholder.ts` |
| FR-20 | D0.5 and D0.6 (self-scoping sentence: where it lives, three payloads, collision with FR-5, optimizer gap), D4, D7 `LIVELINESS_RULES` (Assert-absent as worded, N10), M7, D13 categories 1 and 19, Appendix C |
| FR-21 | D7 (preserved strings; categories 1, 2) |
| FR-22 | D7 `constants.ts` EXPERT3D overlay, Appendix A |
| FR-23 | D0.2 (the amended Task C guard, option (b)), D0.3 (file level and payload level), D0.7 (live oracle, watch items, tripwire), D11, D13 categories 16, 17, 19, 20, D15 (pre-change oracle), FROZEN-file position item 2 (consumers named); R1a, R7a and R24 for the declared residue |
| FR-24 | D9 component, labels (gated on T-A4, D8 Gate) |
| FR-25 | D1 `types.ts`, D8 leaf module, D9 `OperatorNotesFormState.inputPart` (form side), D13 categories 8, 21 |
| FR-26 | T-A4, D8 (Doc instructions silent, Expert-3DPrinter receives) |
| FR-27 | D14, D8 position, D9 `inputPart` |
| FR-28 | D8, category 9 |
| FR-29 | M6 (depends on T-A4), Appendix B, D0.8, R22 |
| FR-30 | D8 `numericFidelitySources` (notes only) |
| FR-31 | D9 `restore` (items 2, 4, 5), D8 history (item 1), wiring pin on the constructor/effect (item 3); gated on T-A4; categories 21, 11 |
| FR-32, FR-33 | D12 (Node verification, `process.version` line) |
| FR-34, FR-35 | D13 category 14, D12 |
| FR-36..FR-39 | D2 (preserve-only table) |
| FR-40 | D8 reach, category 9 |
| FR-41 | D9 (`OperatorNotesFormState.clear`, both `clearAll` cases, disjoint-slice pins), D13 categories 11 and 21, R23, Q-FR41-TEST; gated on T-A4 |
| NFR-1 | D4 (cache effect on Task A, Task C description block 0 and the optimizer), R19 |
| NFR-2, NFR-3, NFR-4 | no provider, retrieval or secret change; D10 |
| NFR-5 | constants and `src/prompts/operator-notes.ts`, not services |
| NFR-6 | D5, D12 (pure functions) |
| NFR-7 | D5 leaf module |
| NFR-8 | D5 registry cross-check |
| NFR-9 | D11 (items 1, 2, 3 of the Specification v5 list including `content-orchestrator.faq-standalone.spec.ts`, plus property 6 as live oracle and the watch items and tripwire that the impact analysis adds), D13 categories 16 to 20, D15 |
| NFR-10 | FROZEN-file position (the owner's order recorded as intent only; Refusal rule) |
| NFR-11 | D8, D9 |
| NFR-12 | D1, D2, D6 (warnings never feed repair) |

## Appendix: prose the plan composes (for review at the gate)

All literals pinned by the Specification are kept; text is illustrative where the Specification says so.

**A. EXPERT3D overlay (FR-22).** Amended line, replacing `Keep the schema's mandated section order and headings — ...`:
`Keep the mandated section order (never add, drop or reorder a section) — the ToV changes the WORDING and the evidence discipline, not the structure.` (Plan-review N1: the HEADINGS sentence below carries the FR-22 literal in lower case, `at most one colon or dash per heading`, preceded by a semicolon, not a capital after a full stop. One sentence, so the lower-case literal `the ToV changes the WORDING and the evidence discipline, not the structure` appears verbatim; the old form `Keep the schema's mandated section order and headings` is gone.)
APPLICATIONS (replaces the closing "In Applications, every entry ..." paragraph): `APPLICATIONS (§4): each bullet differs in structure and states the mechanism that makes THIS product the right tool for its scenario, with a different measurable fact in each (accuracy, time, mode, format) — never the same "X: scan does Y; Z does W" frame in every bullet, and never just the industry name.`
HEADINGS: `HEADINGS: functional headings are allowed only for §3 <h2> — they say what the section does or answers ("The scanner travels to the object"). <h3> stay nominal labels per [HEADING FORM]; at most one colon or dash per heading. The rest of [HEADING FORM] (word limit, product name placement) still applies.`

**B. FR-29 neutral wording.** STRICT INPUT SCOPE: `...must trace to the provided [Raw Description], [Technical Specs], [Supplemental Content] or [Operator Notes].` INTERNAL RECONCILIATION: `INTERNAL RECONCILIATION (before writing): scan the input blocks you were given — [Raw Description], [Technical Specs], [Supplemental Content] and, when present, [Operator Notes] — for numbers that describe the SAME quantity ...` (rest of the bullet unchanged; no number word precedes `input blocks`).

**C. `LIVELINESS_RULES`.** The illustrative block of FR-20 with three additions: the precedence sentence `where a store voice block defines its own bullet form, heading form, tone or punctuation limits, that block wins` (a PROPOSED DEFAULT, unconfirmed; it opens the block as `These rules apply only where §3 exists; where a store voice block defines its own ...`), the `apply only where §3 exists` literal, and one self-scoping sentence (an FR-20 requirement; **literal confirmed by the owner 2026-10-18, Q-SCOPE, VERBATIM and normative**; it is read by Task C description translation and the optimizer too, D0.5; it collides with the FR-5 literal `deleted, not reworded`, D0.6 and R1d; it does not name the optimizer's task; it contains an ASCII apostrophe in `the source's` and no digit): `These rules govern writing a new description; when the task is to translate an existing text they do not apply, and the source's sentences and their order are kept.` No range of the form `N-M words`; the only sentence-length number is `6`. The required literals `§1`, `§3` and `<h2>` are section references and a tag name, not sentence-length numbers (plan-review N10).

**D. `NO_IMAGE_DEIXIS_RULE`.** The restated block of FR-5 as written in the Specification (it already contains `figcaption`, `alt`, `«на зображенні»`, `«на фото»`, `«нижче»`, `deleted, not reworded`).

**E. `LEAD_IN_TEMPLATES`** (each is the current sentence minus its pointer clause): en `See how ${p} works in practice.`; uk `Дивіться, як ${p} працює на практиці.`; ru `Смотрите, как ${p} работает на практике.`; pl `Zobacz, jak ${p} działa w praktyce.`; de `Sehen Sie, wie ${p} in der Praxis arbeitet.`; es `Vea cómo funciona ${p} en la práctica.`; pt `Veja como ${p} funciona na prática.` Unknown language still falls back to the English template.
