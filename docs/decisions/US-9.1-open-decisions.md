---
artifact: open_decisions
story: US-9.1
version: 4
status: DRAFT
owner: so-clarifier
created_at: 2026-10-17T15:12:00Z
updated_at: 2026-10-18T10:09:20Z
supersedes: docs/decisions/US-9.1-open-decisions.md#3
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 4
  - key: impact_analysis
    version: 3
  - key: implementation_plan
    version: 3
  - key: plan_review
    version: 2
  - key: open_decisions
    version: 3
open_decisions_blocking: false
---

# US-9.1 - Open Decisions (v4)

## v4 revision note (2026-10-18T10:09:20Z)

Revision run whose only purpose is to **record the human owner's plan-gate answers** as resolutions of the Open Decisions they
answer. **Decision source (cited for every v4 resolution below; abbreviated "Plan-gate answers"):** the last event of
`docs/workflow/history.jsonl` (`ts` 2026-10-18T10:08:01Z, `from` HUMAN_PLAN_APPROVAL, `to` SPECIFICATION, `actor`
sbruhov@gmail.com): the verbatim owner answers given with `/so:approve` at HUMAN_PLAN_APPROVAL. **The plan gate itself was NOT
approved** (plan v3, task_breakdown v2, plan_review v2 stay DRAFT); the answers are applied first, then the Specification is
revised (spec v5). This stage records the owner's answers; it made none of them. Where an answer does not clearly cover a part of
an OD, that part stays open. No answer is read beyond its quoted text.

Resolved in v4 (by id): **OD-2** (residues R1, R2 - now fully resolved), **OD-19** (residues (1b), (2) - now fully resolved),
**OD-20** ((2), (3) - now fully resolved), **OD-7**, **OD-8**, **OD-9**, **OD-14**, **OD-18** (each "accept as built"), and the
**D-10** part of OD-10(4). **PARTLY resolved:** **OD-11** (the quoted run rules; two sub-questions are not answered, stated in its
entry). **Intent recorded, nothing resolved:** **OD-12** (order of the three FROZEN edits and commit shape are the owner's stated
intent; the per-file "modify <filename>" instruction is NOT given, so OD-12 stays OPEN). **Still open (carried forward, untouched
by the answers):** OD-10 parts (1) (D-3 to D-5), (3) (D-7) and the D-9 half of (4); OD-13 (rest); OD-15. Plan-level answers (Q1,
Q-TRANS, Q-OPT, Q-SCOPE, Q-CLEARALL, Q-CODEALT, Q-SIMPL) are not Open Decisions; they are recorded in the section "Plan-level
answers" at the end of this file. `open_decisions_blocking` stays `false`: no OD is `blocking: true`. No new Open Decision was
needed (see "Consistency check of the v4 answers" at the end).

Verbatim owner answers (the part of the last `history.jsonl` event's `note` that carries them): "Approve plan v3 / breakdown v2
with answers: | Branch: cut feat/US-9.1-* from 6546db8 (or main after US-8.1 merges); fixtures T1/T37 record "the commit the Story
branch was cut from" (N16). | Q-OD12: intent to approve task-a.ts T-A4 first, then output-validator.ts, then
master-system-prompt.ts last. One commit per task with --rebaseline in the same commit. This is intent only; the "modify <file>"
instruction will be given per file in the editing session. | Q1: accept master in Task C and optimizer; guard option (b): block 0
compared with live MASTER_SYSTEM_PROMPT; block 1 and userContent stay pinned per case. | Q-TRANS: options (1)+(3); optional live
translation comparison for Creality Pika outside the gate. | Q-OPT: option (1). Note: the optimizer's "lead-in" is the figcaption
<b> label, and it inherits PLACEMENT; soften R7a at the next plan touch. | Q-SCOPE: change the literal to "...they do not apply,
and the source's sentences and their order are kept." (drop "headings"); update the three Assert-present strings and category 19.
| Q-CLEARALL: reset the notes signal in clearAll (generator and ua-generator). | Q-OD2: defaults R1 and R2. Q-OD19: (1b) no, (2)
yes. Q-OD20: defaults; script input set as D-10. | Q-OD7/8/9/14/18: accept as built. Q-OD9: verify Node >= 22.18, else the D12
launcher. | Q-OD11: three products x 2 runs, all must pass hard criteria, include a non-marker run; evidence = script output;
failure is reported, not auto-iterated. | Q-CODEALT: no. Q-SIMPL: no. | Findings: N10 binding (FR-20 wording governs); N14 T31
depends on T21 plus a general no-weakening rule for refused frozen items; N11, N13, N15, N12 fix at next touch."
Only the Q-answers that name an Open Decision (Q-OD2, Q-OD7, Q-OD8, Q-OD9, Q-OD11, Q-OD12, Q-OD14, Q-OD18, Q-OD19, Q-OD20) change
an OD below. The branch instruction and the Findings line (N10, N11 to N16) are plan/review instructions, not answers to any OD,
and are not tracked as ODs.

## v3 revision note (2026-10-17T15:50:33Z)

Revision whose only purpose is to **record the human owner's decisions** as resolutions of the Open Decisions they answer.
**Decision source (cited for every resolution below):** `docs/workflow/workflow-state.yaml`, `pending_human_gate.comment`
(the verbatim `/so:approve` argument, decided by sbruhov@gmail.com on 2026-10-17 at HUMAN_SPEC_APPROVAL; abbreviated
"**Decision**" below), plus the Story v3 "Amendment" (v3, 2026-10-17T15:49:00Z) for AC-12. This stage records the owner's
answers; it did not make any of them, and where the Decision text does not answer a part of an OD, that part stays open.

Resolved in v3 (by id): OD-2 (a)(b)(c), OD-3, OD-4, OD-5, OD-6, OD-16, OD-17, OD-19 (parts 1-mechanism, 3, 4), OD-20(1);
the AC-12 / D-6 part of OD-10 (part 2) and of OD-14 (the soft-target sub-question); FR-7 to FR-9 normative confirmation
(spec note A, recorded under OD-13). **Still open (carried forward):** OD-7, OD-8, OD-9, OD-11, OD-12 (FROZEN approvals
explicitly NOT given), OD-15, OD-18, and the unanswered residue of OD-2, OD-10, OD-13, OD-14, OD-19, OD-20 (each stated in its
entry). No new Open Decision was needed: no Decision text conflicts with the Story v3 or with the cited tree facts (see
"Consistency check" at the end). `open_decisions_blocking` stays `false`: no OD is `blocking: true`.

The Decision also contains a wording instruction that is not an answer to any OD in this log and so is not tracked as one:
"`buildVideoBlock` new span: use the pointer-free wording (no quoted "below"/"nizhche"; "written in the body language"
attached to the paragraph)". It is a content instruction on spec FR-11 (the "exact new spans" PROPOSED DEFAULT) for the
Specification revision; it is recorded here so it is not lost, not interpreted.

## v2 header (kept for the record)

Revision run for Story v2. The Story's "Amendment" (v2, 2026-10-17T15:08:25Z, decided by the owner, sbruhov@gmail.com)
resolves OD-1 as option (b): the four Generator fields travel in a new optional `ProductInput.operatorNotes`, not in
`supplementalContent`. v1 of this log (superseded; it was overwritten at the same path) held OD-1 to OD-15; **all fifteen
are carried forward below by id**, none dropped. OD-1 is now marked resolved with the Story as the cited source (this stage
did not answer it). OD-2 and OD-12 are re-assessed against the new carrier. OD-16 to OD-20 are new, created by the amendment.
OD-3 to OD-11 and OD-13 to OD-15 are unchanged apart from the cross-references noted in them. This stage records questions
only; "Options" lines (where present) list what the sources leave open, without a recommendation. Nothing here is a decision.

Sources read (v2 additions to the v1 list): the amended Story (Scope rows, AC-9, Resolved decisions Q1, Amendment, Open
questions); `src/app/types.ts` (the only declaration of `ProductInput`, line 41); `src/prompts/task-a.ts`
(`buildPromptA`, `userContent` assembly, lines 130-190); `src/prompts/task-a-doc.ts` (`buildPromptADoc`: inherits
`base.userContent` as a byte-for-byte prefix); `src/services/content-orchestrator.service.ts` (`numericFidelitySources`,
called at lines 674, 1081 and 1489, i.e. from the Doc gate and both HTML paths; `historyService.add(input, ...)` at the
`generate`, `generateUaContent` and later sites); `src/services/history.service.ts` (persists the whole `input` object to
`localStorage` key `seo_gen_history`); `src/app/app.component.ts` (`buildGeneratorInput`, `restoreHistory`,
`seo_gen_form_state` effect); `src/app/app.component.html` lines 258-294; `src/prompt-core/master-system-prompt.ts` lines
40-55 (STRICT INPUT SCOPE, INTERNAL RECONCILIATION "the three input blocks"); `src/prompt-core/constants.ts`
`NUMERIC_SOURCE_FIDELITY_RULES`; `AGENTS.md` section 9. `bash arch-guard.sh` was re-run read-only: all frozen files unchanged.

| id | Topic | blocking |
|---|---|---|
| OD-1 | The four new Generator textareas feed `supplementalContent`, which already triggers FAQ generation | **RESOLVED (b)** by Story Amendment v2; no longer blocking |
| OD-2 | (revised) History persistence/restore of `operatorNotes`, which Generator views show the four textareas, UI labels | **RESOLVED (a)(b)(c) in v3; residues R1, R2 RESOLVED in v4** (fully resolved); false |
| OD-3 | RHYTHM (FR-11) against the existing per-locale `[SENTENCE LENGTH]` bands and hard ceiling | **RESOLVED in v3**; false |
| OD-4 | HOOK and SCENE (FR-10, FR-13) against INVARIANT START, answer-first and the hook patterns | **RESOLVED in v3**; false |
| OD-5 | HEADINGS (FR-15) against `[HEADING FORM]`, the overlay's "keep mandated headings" and an existing guard test | **RESOLVED in v3**; false |
| OD-6 | Template and pipeline scope of the shared liveliness block (simplified templates, HTML path) | **RESOLVED in v3**; false |
| OD-7 | `image-deixis` pattern precision (false positives and recall gaps) and the undefined pl/de/es/pt/ru/en patterns | **RESOLVED in v4** (accept as built); false |
| OD-8 | What "the paragraph directly above a figure" means for the detector and the AC-11 structure checks | **RESOLVED in v4** (accept as built); false |
| OD-9 | How `tools/measure-description.ts` runs (no TS runner, DOM needed, outside every gate) | **RESOLVED in v4** (accept as built; verify Node >= 22.18, else the D12 launcher); false |
| OD-10 | Metric definitions in AC-10/AC-12: sentence, section, hook, "number absent from the input" | part (2) "§3 section" / D-6 **RESOLVED in v3** (D-6 unchanged); D-10 (the input-set half of part (4)) **RESOLVED in v4**; parts (1) D-3..D-5, (3) D-7 and the D-9 half of (4) open; false |
| OD-11 | Live-run acceptance (AC-11/AC-12): inputs, repeats, evidence, what a failed run triggers | **PARTLY RESOLVED in v4** (repeats, pass rule, non-marker run, evidence, failure path); product identity and runner open; false |
| OD-12 | (revised) Timing and shape of the FROZEN-file approvals; `task-a.ts` is now load-bearing for AC-9 | **STILL OPEN**; v4 records the owner's order and commit-shape INTENT only, no approval given; false |
| OD-13 | The requirements source and reference outputs live in git-ignored `Knowledge/` | FR-7..FR-9 normative status **RESOLVED in v3** (spec note A); rest open; false |
| OD-14 | The measured baseline does not reproduce from the Story's own breakdown; two thresholds are already met by the defective text | soft-target sub-question **RESOLVED in v3** (AC-12 amended); "35" counting rule and the 48-word-hook item **RESOLVED in v4** (accept as built); false |
| OD-15 | Non-uk-UA output languages: what actually verifies the ban beyond the warning | false |
| OD-16 | `operatorNotes` shape: the four key names, value types, and what counts as "empty" | **RESOLVED in v3** (PROPOSED DEFAULTS confirmed as written); false |
| OD-17 | `[Operator Notes]` block rendering: entry labels, join order, partial fill, placement in `userContent` | **RESOLVED in v3** (PROPOSED DEFAULTS confirmed as written); false |
| OD-18 | How "an empty object leaves `userContent` byte-identical" is tested in an edited FROZEN file | **RESOLVED in v4** (accept as built); false |
| OD-19 | Reach of `operatorNotes`: Doc pipeline, Expert-3DPrinter, SEO/slug/FAQ prompts | parts (1) mechanism, (3), (4) **RESOLVED in v3**; (1b) instruction text and (2) Expert-3DPrinter **RESOLVED in v4** (fully resolved); false |
| OD-20 | Extending `STRICT INPUT SCOPE`, `numericFidelitySources`, the numeric rule text and the AC-10 script's "input" | part (1) **RESOLVED in v3**; (2) and (3) **RESOLVED in v4** (fully resolved); false |

---

## OD-1 - The four new textareas feed `supplementalContent`, which already triggers FAQ generation

- **Status: RESOLVED (b) - 2026-10-17, by the Story owner.** **Resolution source:** Story v2, section "Amendment" (v2,
  2026-10-17T15:08:25Z, "decided by the owner (human operator, sbruhov@gmail.com)"), the recorded decision "OD-1 - resolved
  (b)" quoted there in Ukrainian and English, reflected in Story "Resolved decisions" Q1 and in AC-9. This stage cites it;
  it did not answer the question. Resolved content: the four fields do not go into `supplementalContent` (the only FAQ
  trigger in the Generator); the carrier is a new optional `ProductInput.operatorNotes` (structured object, four keys);
  `task-a.ts` emits an `[Operator Notes]` block; an empty object does not change `userContent`; `STRICT INPUT SCOPE` and
  `numericFidelitySources` are extended; `runFaqPipeline` and `faq-form.ts` are unchanged. This is option (b) of the v1 entry.
- **Original question (v1, kept for the record).** AC-9 assembled the four optional textareas into the existing
  `supplementalContent`, where a non-blank value is the sole trigger of the FAQ pipeline (`runFaqPipeline`, US-8.1 FR-5;
  `content-orchestrator.service.ts` line 809, also line 1780): one uk-UA master FAQ call plus one translation call per other
  store language. Was that side effect intended?
- **Originally not inferable because / impact.** Story Q1 and AC-9 v1 were silent on FAQ and ruled out a second carrier; the
  Generator form's existing Supplemental Content field already fed the FAQ. A wrong guess changed cost, output and the
  "byte-identical when empty" contract.
- **Verified against the tree (this run).** `runFaqPipeline` still keys only on `input.supplementalContent` (lines 809,
  1780); `buildGeneratorInput` (app.component.ts line 903) is unchanged today, so the amendment is consistent with the code.
- **blocking: false (was true).** Residual questions this resolution leaves are OD-2 (revised) and OD-16 to OD-20.

## OD-2 - (revised) History persistence/restore of `operatorNotes`, which Generator views show the four textareas, UI labels

- **Status v4: FULLY RESOLVED (residues R1, R2) - 2026-10-18, by the owner.** **Source:** `docs/workflow/history.jsonl`, last event (`ts` 2026-10-18T10:08:01Z, HUMAN_PLAN_APPROVAL, sbruhov@gmail.com; "Plan-gate answers"; plan gate itself NOT approved). **Answer, verbatim:** "Q-OD2: defaults R1 and R2."
  The defaults are those of the implementation plan v3 Q-list entry Q-OD2 (`docs/plans/US-9.1-implementation-plan.md`): **R1** -
  after a history restore, a subsequent Generate / UA Description click resends the restored notes (the default consequence of
  restoring them into the four textareas, which the form then reads); **R2** - restoring a history entry that has no `operatorNotes`
  empties the four textareas (`restoreHistory` sets the notes signal from the neutral `toFormValues(undefined)`; the previous
  values are not kept). The v3 "Residue that stays OPEN" paragraph below is **closed by this answer**; its second point (the
  Story's Out of scope concerns the `seo_gen_form_state` key, not the history record) was a reading note, not a question, and is
  unchanged. This stage did not answer the question.

- **Status v3: RESOLVED for (a), (b) and (c) - 2026-10-17, by the owner.** **Source:** `docs/workflow/workflow-state.yaml`
  `pending_human_gate.comment`, decided by sbruhov@gmail.com at HUMAN_SPEC_APPROVAL. **Decision, verbatim:** "OD-2(a): persist
  operatorNotes in history and restore into the four textareas. OD-2(b)(c): confirm defaults." Recorded content: (a)
  `operatorNotes` is persisted in history and restored into the four textareas on history restore; (b) and (c) the spec v2
  PROPOSED DEFAULTS in FR-24 are confirmed as written (views: the four textareas are shown for every store and every
  `templateId`, including Expert-3DPrinter, and the input builder shared by Generate and UA Description includes them for both;
  labels: the en and uk label texts listed in FR-24, no placeholder). The Decision does not restate the default texts; "as
  written" means FR-24 of `docs/specifications/US-9.1-spec.md` v2, unchanged. This stage did not answer the question.
- **Residue that stays OPEN (non-blocking), because the Decision does not state it:** after a restore, whether a subsequent
  Generate / UA Description click resends the restored notes is not stated (the Decision says only "restore into the four
  textareas"); and the Story's Out of scope says only that `seo_gen_form_state` is not written, so the Specification must
  not read the Decision as changing that line (it concerns the history record, `seo_gen_history`, not the form-state key).
  Neither blocks the Specification; they are to be written as plain consequences of the Decision or raised at the gate.

- **Carried forward from v1, re-assessed against Story v2.** v1 asked (1) how the four labelled sections join with the
  existing Supplemental Content text, (2) how history restore handles the assembled text in the single existing field,
  (3) which Generator views show the textareas, (4) UI label text in both UI languages. Part (1) and the "labelled text
  lands in the existing field" half of (2) **no longer apply**: under OD-1 (b) the four fields are a separate carrier and
  never join `supplementalContent` (cited: Story Amendment v2, AC-9). They are closed by that reason, not silently dropped.
  Parts (3) and (4) are unchanged and still open, and (2) is replaced by a new, different question.
- **Question.** (a) **History.** `HistoryService.add(input, output)` stores the whole `ProductInput` object and
  `HistoryService` writes it to `localStorage` key `seo_gen_history`; so a populated `operatorNotes` is persisted in history
  automatically, while AC-9 and Out of scope say only that the fields are "not persisted to `seo_gen_form_state`". Is
  persistence in history intended? And `restoreHistory` (app.component.ts line ~1025) restores `supplementalContent` and
  `customInstructions` but would not restore the four textareas unless changed: after "restore" do the four fields
  come back, stay empty, or keep the previous values, and is a regeneration from a restored entry expected to resend the
  notes? (b) **Views.** Which Generator views show the four textareas: all stores, every `templateId` (Full description and
  the three simplified templates), Expert-3DPrinter (no images, plain-HTML path), and both buttons (Generate and UA
  Description) that share `buildGeneratorInput`? (c) **Labels.** Label and placeholder text for the textareas in both
  `TRANSLATIONS` languages (en and uk), including the Ukrainian wording of the four labels.
- **Why it cannot be inferred.** Checked: Story AC-9, Out of scope, Open questions (silent on history, views and UI text);
  `history.service.ts` (whole `input` persisted); `restoreHistory`; `app.component.html` lines 258-294 (the single existing
  field has no template- or store-based hiding; only the image block is hidden for Expert-3DPrinter).
- **Impact if unresolved.** Operator-written test results and limitations would be stored in the browser's history without
  the Story saying so (privacy and quota: the history effect trims on `QuotaExceededError`); restore behaviour, visibility
  per template and UI wording would be invented in the specification.
- **blocking: false.**

## OD-3 - RHYTHM (FR-11) against the existing per-locale `[SENTENCE LENGTH]` bands and hard ceiling

- **Status v3: RESOLVED - 2026-10-17, by the owner.** **Source:** `docs/workflow/workflow-state.yaml`
  `pending_human_gate.comment`, decided by sbruhov@gmail.com at HUMAN_SPEC_APPROVAL. **Decision, verbatim:** "OD-3: drop the
  9-17 band and "at most two consecutive" from RHYTHM; numbers only in [SENTENCE LENGTH], which wins on conflict. Keep "at least
  one sentence of 6 words or fewer" and the particle limit." Effect on the original question: the FR-11 9-17 band and the "at
  most two consecutive sentences" limit are removed from the shared RHYTHM block; sentence-length numbers live only in
  `[SENTENCE LENGTH]`, which wins where the two disagree (so the per-locale bands and ceiling stay authoritative for every
  language); the "at least one sentence of 6 words or fewer" rule and the particle limit stay. The spec text change is for the
  Specification revision (spec v3).

- **Question.** FR-11 (inside AC-8's shared master block) says at most two consecutive sentences may sit in a 9-17-word
  band and every section needs a sentence of 6 words or fewer. `SENTENCE_LENGTH_RULES` (already in the master, applies
  to every language) sets per-locale bands (uk-UA: HERO 8-12, BODY 12-14, ceiling 20; en: 15-18, ceiling 25; de: 11-13,
  ceiling 18) with the instruction to "aim at the MIDDLE of the band", and `sentence-length.ts` enforces the ceiling.
  Which rule wins where they disagree, and are the FR-11 numbers meant to be universal across all seven base languages
  or uk-UA only?
- **Why it cannot be inferred.** Checked: Story AC-8 (only says a store voice block wins); the C3D overlay (states the
  global per-locale budget "remains authoritative" for its rhythm rule, a precedent for one store, not a rule for
  the shared block); the Knowledge spec FR-11 (silent on `[SENTENCE LENGTH]`). In uk-UA a BODY sentence of 12-14 words
  is inside the 9-17 band, so following both literally pushes sentences either to 8 words or fewer or toward 18-20, next to
  the hard ceiling the same prompt says never to approach.
- **Impact if unresolved.** The shared block is interpolated into every store and language (AC-8). Contradictory
  instructions raise `sentence-length` ceiling errors and repair cycles, or one rule is silently ignored; the soft
  metrics in AC-12 then cannot be met.
- **blocking: false.**

## OD-4 - HOOK and SCENE (FR-10, FR-13) against INVARIANT START, answer-first and the hook patterns

- **Status v3: RESOLVED - 2026-10-17, by the owner.** **Source:** `docs/workflow/workflow-state.yaml`
  `pending_human_gate.comment`, decided by sbruhov@gmail.com at HUMAN_SPEC_APPROVAL. **Decision, verbatim:** "OD-4: HOOK
  governs only the [use-case] slot; INVARIANT START unchanged; SCENE is a statement, not a question, and does not apply to
  sect.1." Effect: the HOOK rule (FR-13) governs only the `[use-case]` slot of the fixed hook start; the INVARIANT START text is
  not changed; SCENE (FR-10) is a statement, not a question, and does not apply to section 1 (the hook). The spec text change is
  for the Specification revision (spec v3).

- **Question.** FR-13 asks that the hook "names the task the buyer solves"; AC-12 (soft) says the "hook starts from the
  buyer's task". The master's `[CONTENT STRUCTURE]` clause 1 fixes the hook start (`<b>[Product]</b> — [Category] for
  [use-case], featuring [key specs]`, "none of the patterns varies the start"), requires 2-4 sentences each inside the
  HERO band, and `hook-pattern.ts` injects one of five structural patterns per product. FR-10 asks every section to open
  with the reader's task or constraint, while `[SENTENCE LENGTH]` UNIVERSAL says "open each section ... with a complete,
  self-contained statement (answer-first)". What does "starts from the buyer's task" mean given an invariant start, and
  which instruction governs a section opening?
- **Why it cannot be inferred.** Checked: Story P2/Expected/AC-8/AC-12; `master-system-prompt.ts` lines ~222-232 and
  the SENTENCE LENGTH UNIVERSAL line; `hook-pattern.ts` header. The reference output's hook shape was not cross-checked
  against INVARIANT START by the Story.
- **Impact if unresolved.** A soft criterion ("hook starts from the buyer's task") that the prompt forbids literally;
  specification text would invent the reconciliation.
- **blocking: false.**

## OD-5 - HEADINGS (FR-15) against `[HEADING FORM]`, the overlay's "keep mandated headings" and an existing guard test

- **Status v3: RESOLVED - 2026-10-17, by the owner.** **Source:** `docs/workflow/workflow-state.yaml`
  `pending_human_gate.comment`, decided by sbruhov@gmail.com at HUMAN_SPEC_APPROVAL. **Decision, verbatim:** "OD-5: functional
  wording for sect.3 h2 only; h3 stay nominal; max one colon/dash per heading; amend overlay line "Keep the schema's mandated
  section order and headings"; do not use the phrase "never bare noun"." Effect: functional heading wording is allowed for the
  section-3 `<h2>` only; `<h3>` stay nominal; a heading carries at most one colon or dash; the EXPERT3D overlay line "Keep the
  schema's mandated section order and headings" is amended (the Decision names the line, not its new wording; the wording is for
  the Specification); the phrase "never bare noun" is not used (so the `task-a.spec.ts` guard keyed on that phrase is not
  triggered by the new text). The spec text change is for the Specification revision (spec v3).

- **Question.** FR-15 (EXPERT3D overlay only) permits "functional" headings (examples: «Сканер їде до об'єкта»,
  «Лазер без маркерів: лише з кабелем», «Режим підключення — вибір місця роботи»). Existing text says otherwise:
  `[HEADING FORM]` gives `<h3>` sub-headings as "short nominal labels", the EXPERT3D overlay itself says "Keep the
  schema's mandated section order and headings", and `task-a.spec.ts` guards that an overlay line matching
  "never bare noun" must be paired with the `<h3>` "MUST be CONCISE NOMINAL PHRASES" carve-out (the C3D collapse
  precedent). Also, two of the three examples contain a colon or an em dash inside a heading. Which heading levels may
  be functional, may a heading carry a colon or dash, and which existing sentence is replaced or amended?
  Note `[HEADING FORM]` already contains most of FR-15's limits (8 words, no product name in `<h3>`, at most two
  `<h2>` with the short name), so the new content is only "functional wording allowed".
- **Why it cannot be inferred.** Checked: Story AC-8 (names FR-15 but not its text), the overlay lines 903-906,
  `master-system-prompt.ts` lines 127-155, `task-a.spec.ts` ~100-125, `heading-style.ts` (its nominal checks cover
  `<h2>` for Center 3D Print only).
- **Impact if unresolved.** The overlay (appended after the master) would out-specify the master heading rules, the
  documented failure mode of this codebase, and the guard test may fail or be weakened to pass.
- **blocking: false.**

## OD-6 - Template and pipeline scope of the shared liveliness block

- **Status v3: RESOLVED - 2026-10-17, by the owner.** **Source:** `docs/workflow/workflow-state.yaml`
  `pending_human_gate.comment`, decided by sbruhov@gmail.com at HUMAN_SPEC_APPROVAL. **Decision, verbatim:** "OD-6: liveliness
  rules apply where sect.3 exists; acceptance runs use Full description." Effect: the liveliness rules (SCENE/RHYTHM/HONEST
  LIMITS/HOOK) apply wherever section 3 exists (so on templates that omit section 3 there is nothing for them to apply to); the
  AC-11/AC-12 acceptance runs use the Full description template. The Decision says nothing about the Doc-vs-HTML pipeline split
  beyond that, and the Story's three acceptance products are unchanged.

- **Question.** AC-8 puts SCENE/RHYTHM/HONEST LIMITS/HOOK into the master for every store. Sections the rules name
  ("each §3 `<h2>`", "§1 hook", "§4") do not all exist in the three simplified templates (`filaments-resins-powders`,
  `accessories`, `spare-parts`), where §3 is omitted unless asked and the §7 table is flat. Are the rules meant to
  apply to those templates? And: six of the seven registered stores run the Doc pipeline; only Expert-3DPrinter
  (no images) uses the HTML path. Do the acceptance runs (AC-11: Creality Pika on EXPERT3D, one Center 3D Print
  product, one 3DDevice product) use the Full description template only?
- **Why it cannot be inferred.** Checked: Story Scope (silent on `templateId`); `simplified-template-blocks.ts`
  (`paragraphsFor`, §3 "omit unless the per-run facts ask"); `doc-pipeline-flag.ts`; AC-11.
- **Impact if unresolved.** Rules referring to absent sections, or a pass on the Full template that says nothing
  about the simplified ones, both reached by an AC-8 that says "every store".
- **v2 note.** Unchanged by the amendment; the template/store scope of the four textareas is OD-2(b).
- **blocking: false.**

## OD-7 - `image-deixis` pattern precision and the undefined non-uk patterns

- **Status v4: RESOLVED (accept as built) - 2026-10-18, by the owner.** **Source:** `docs/workflow/history.jsonl`, last event (`ts` 2026-10-18T10:08:01Z, HUMAN_PLAN_APPROVAL, sbruhov@gmail.com; "Plan-gate answers"; plan gate itself NOT approved). **Answer, verbatim:** "Q-OD7/8/9/14/18: accept as built."
  Q-OD7 as put in the plan v3 Q-list: (1) the precision of the uk `image-deixis` pattern (the candidate false positives such as
  «на фото» inside «фотополімерній», and the missed «на якому/на яких/на ній» form) is accepted as built, at `warning` level;
  (2) the ru, en, pl, de, es, pt phrase lists are accepted as the builder drafts them, **unreviewed** (the Story excludes
  native-speaker review). "As built" is what the plan v3 and spec v4 specify for FR-16 and the module header; this stage restates
  no pattern text. Related plan-level answer: **Q-CODEALT: no** (the detector does not match the code-authored `Фото:` /
  `Зображення товару:` labels), see "Plan-level answers". This stage did not answer the question.

- **Question.** (1) The only pattern text the sources give (spec FR-9 uk) was run against sample sentences: it matches
  «Принтер друкує на фотополімерній смолі…» («на фото» is a prefix match), «Працює на фотосенсорах…», «Зберігає дані
  на кадрових буферах», «Температура вище 200 °C…», and misses the Story's own example «Рекламний банер, на якому жінка…».
  Is a false positive on such product facts in the paragraph above a figure acceptable at `warning` level (AC-7
  says only that «нижче -10 °C» does not fire outside a figure context, which implies it fires inside), and must
  «на якому/на яких/на ній» be detected? (2) AC-5 requires patterns for ru, en, pl, de, es, pt, but the sources
  provide none ("ru and en by the same principle" in the Knowledge spec); the Story excludes native-speaker review.
  Who supplies the phrase lists?
- **Why it cannot be inferred.** Checked: AC-5/AC-6/AC-7; Knowledge spec FR-9; scratch run of the pattern on the
  baseline files and samples. Resin printers and scanners (fotopolymer, photosensor) are core catalogue items, so the
  false-positive case is not hypothetical.
- **Impact if unresolved.** AC-11 ("0 hits") can fail on correct text or pass on text still carrying a pointer; the
  four non-uk patterns would be invented by the specification writer or the builder.
- **blocking: false** (severity is `warning`, and promotion to `error` is out of scope).

## OD-8 - What "the paragraph directly above a figure" means

- **Status v4: RESOLVED (accept as built) - 2026-10-18, by the owner.** **Source:** `docs/workflow/history.jsonl`, last event (`ts` 2026-10-18T10:08:01Z, HUMAN_PLAN_APPROVAL, sbruhov@gmail.com; "Plan-gate answers"; plan gate itself NOT approved). **Answer, verbatim:** "Q-OD7/8/9/14/18: accept as built."
  Q-OD8 as put in the plan v3 Q-list: the adjacency definition and the video-figure handling - the spec FR-17 PROPOSED DEFAULT (D-1,
  D-2), built as written - is accepted. This stage did not answer the question.

- **Question.** For `collectFigureDeixis` and the AC-11 checks ("no figure without a paragraph above", "no two figures in
  a row"): is the carrier the previous element sibling only if it is a `<p>`, or the nearest preceding `<p>`? What
  happens when the previous sibling is a heading, `<hr>`, `<ul>`/`<ol>` or `<table>`; when the figure is the video
  `<figure>` (the baseline's video lead-in «Нижче розміщено відео…» is one of the 35); when the paragraph is inside
  `<li>` or `<section>`; and is a figure with no paragraph above reported by the detector or only by the script?
  Also: `task-a.ts` currently says "Do not place a `<figure>` directly after a `</ul>`" and AC-3 pins that phrase, so
  the "directly above" rule must agree with it.
- **Why it cannot be inferred.** Checked: AC-6, AC-11, the Knowledge spec FR-9 ("the paragraph directly above"); the
  baseline HTML (20 `<figure>`: 19 images and 1 video).
- **Impact if unresolved.** Detector and script disagree on edge cases, and AC-6's "non-adjacent paragraph is not
  reported" cannot be written as a test without a stated adjacency rule.
- **blocking: false.**

## OD-9 - How `tools/measure-description.ts` runs

- **Status v4: RESOLVED (accept as built), with a recorded verification condition - 2026-10-18, by the owner.** **Source:** `docs/workflow/history.jsonl`, last event (`ts` 2026-10-18T10:08:01Z, HUMAN_PLAN_APPROVAL, sbruhov@gmail.com; "Plan-gate answers"; plan gate itself NOT approved).
  **Answer, verbatim:** "Q-OD7/8/9/14/18: accept as built. ... Q-OD9: verify Node >= 22.18, else the D12 launcher." Recorded content:
  the script runner is accepted as built in plan v3 D12 (`tools/measure-description.ts` run under Node native type stripping, a thin
  CLI over `src/utils/description-metrics.ts`); the owner's condition is that **Node >= 22.18 is verified first, and only if it is not
  met the D12 vite-based launcher fallback is used**. The verification itself is **not** performed or recorded by this stage; it
  belongs to the plan/implementation stages. Observation only (not the verification, not a decision): `node --version` in this
  workspace printed `v24.15.0`; `package.json` has no `engines` field; the repository has no `.nvmrc`, `.node-version` or `.github`
  directory, so no in-repo statement of the supported Node version exists to check against. This stage did not answer the question.

- **Question.** AC-10 requires a TypeScript script under `tools/` that reuses `collectFigureDeixis`. How is it executed
  and verified? The repo has no TS runner (`tsx`/`ts-node` absent from `package.json`; adding one is a dependency change
  that `AGENTS.md` section 1/7.8 reserves for approval), `src` imports are extensionless, `collectFigureDeixis`
  parses HTML (needs a DOM; only `happy-dom` in the test environment provides one), and `tools/` is in none of the
  gates: not in `vitest.config.ts` `include`, not in the coverage scope, and `tsconfig.json` `include` lists only `index.ts`, `src/**/*` and `test/**/*`, so
  `npm run lint` does not type-check it either. Where does its test live (section 5 requires a test beside the code and
  before it), and does `npm run validate:harness` or another gate cover it?
- **Why it cannot be inferred.** Checked: `package.json` scripts and dependencies, `tools/` contents
  (`validate-harness.mjs`, `feedback-form/`), `vitest.config.ts` include list, AC-10.
- **Impact if unresolved.** Either a new dependency appears without approval, or the script cannot import its
  own detector, or it ships untested and outside every gate.
- **blocking: false.**

## OD-10 - Metric definitions in AC-10 / AC-12

- **Status v4: D-10 (the input-set half of part (4)) RESOLVED - 2026-10-18, by the owner.** **Source:** `docs/workflow/history.jsonl`, last event (`ts` 2026-10-18T10:08:01Z, HUMAN_PLAN_APPROVAL, sbruhov@gmail.com; "Plan-gate answers"; plan gate itself NOT approved). **Answer, verbatim:** "Q-OD20:
  defaults; script input set as D-10." Recorded content: the set of texts the measurement script treats as "the input" is spec
  FR-32 **D-10** as written (the script requires the generated HTML and the input description; it accepts as optional further
  input texts the technical specs, the product name and the four operator-notes values; every text given forms the input side; a
  number found only in a text the script was not given is reported as absent; no exemption list for fixed CTA or store text). The
  Plan-gate answers say nothing about **D-3 to D-5** (part (1), sentence split and word count), **D-7** (part (3), hook word
  count) or **D-9** (the number token and normalisation half of part (4)); those stay **OPEN** (non-blocking) with their spec
  PROPOSED DEFAULT status unchanged. Part (2) / D-6 is unchanged from v3.

- **Status v3: PARTLY RESOLVED - 2026-10-17, by the owner.** **Source:** `docs/workflow/workflow-state.yaml`
  `pending_human_gate.comment` (decided by sbruhov@gmail.com at HUMAN_SPEC_APPROVAL) and Story v3 "Amendment" (v3,
  2026-10-17T15:49:00Z). **Decision, verbatim:** "AC-12: amend soft part to {tozh+Tomu <= 2; mean >= 12 and sigma >= 5.5 as one
  item; hook use-case names the buyer's task (manual)}, need 2 of 3, non-blocking. Per-section short-sentence count reported,
  no threshold. D-6 unchanged." Resolves **part (2)** ("what is a §3 section"): the spec v2 definition **D-6** stands as
  written, unchanged; because the per-section short-sentence count is now reported with no threshold, D-6 only defines what
  is reported per section, and its disclosed over-inclusion (spec FR-32 D-6 note: it also takes the §4-§6 `<h2>` sections) is
  left as written. Also fixes the AC-12 soft thresholds that parts of this OD referred to (the mean/σ item is now σ ≥ 5.5;
  "tozh+Tomu <= 2" is the existing D-8 item).
- **Still OPEN (non-blocking), the Decision does not answer them:** part (1) how sentences are split and words counted
  (spec D-3 to D-5 remain PROPOSED DEFAULTS, not confirmed); part (3) hook word count (D-7); part (4) "numbers absent from the
  input" (D-9, D-10 PROPOSED DEFAULTS, not confirmed).

- **Question.** (1) How are sentences split and words counted (decimals «0,03 мм», «3.5», «1 000», abbreviations, list
  items, headings, table cells, figcaptions, alt)? The thresholds only mean something against a fixed method; the
  Story's numbers (81 sentences / 12.2 / 5.7 before; 74 / 14.2 / 6.5 after) imply one the Story does not state.
  (2) What is a "§3 section" for the per-section short-sentence count, and how is it found in rendered HTML?
  (3) What is "hook word count" (the first `<p>` of the body)? (4) "Numbers absent from the input": the script is
  said to take "the input description", but `numericFidelitySources` (the repo's own sanctioned set) is specs +
  description + product name + the Vision texts of the manifest, and AC-9 adds the supplemental fields; numbers also
  legitimately come from fixed CTA and store text. Which set is "the input", how are numbers normalised (decimal comma
  vs point, thin space, `×` sequences, units), and are digits inside product names or model codes ignored?
- **Why it cannot be inferred.** Checked: AC-10/AC-12; `numericFidelitySources` (line 374) and its doc comment;
  the Knowledge spec section 7 table.
- **Impact if unresolved.** The "hard" AC-12 criterion (0 absent numbers) could fail on grounded figure numbers from the
  Vision pass or pass by ignoring real inventions.
- **v2 note.** Under AC-9 v2, a number that appears only in an `operatorNotes` field passes `numericFidelitySources`; whether
  the same number counts as "present in the input" for the script is OD-20.
- **blocking: false.**

## OD-11 - Live-run acceptance (AC-11 / AC-12)

- **Status v4: PARTLY RESOLVED - 2026-10-18, by the owner.** **Source:** `docs/workflow/history.jsonl`, last event (`ts` 2026-10-18T10:08:01Z, HUMAN_PLAN_APPROVAL, sbruhov@gmail.com; "Plan-gate answers"; plan gate itself NOT approved). **Answer, verbatim:** "Q-OD11: three products x 2 runs, all must
  pass hard criteria, include a non-marker run; evidence = script output; failure is reported, not auto-iterated." Resolves: **repeats
  and pass rule** - each of the three acceptance products is run **twice** (6 live runs) and **every** run must pass the hard criteria
  (AC-11 hard items and AC-12 numbers); **non-marker figures** - the runs must include a run with non-marker (model-authored) figures
  (the plan's risk R4 / spec FR-34 coverage note), so FR-5 alone is exercised against figcaptions and `alt` that FR-1 / FR-2 do not
  reach; **evidence** - the measurement script's output; **failure path** - a failed run is reported with that output and is **not**
  automatically iterated (no automatic further prompt edit, so no unapproved second round of FROZEN edits).
  **Not covered by the answer, so still OPEN (non-blocking):** (a) which Center 3D Print product and which 3DDevice product are used
  (only Creality Pika is named; its files are outside version control, OD-13); (b) who runs the live runs (cost, API keys; the
  opt-in live spec "is never part of the gate"); (c) the plan Q-OD11 sub-question whether the `FIGURE FORMAT` text "short scannable
  description of what the image shows" should be reworded - the answer adds no such requirement, so none exists (a record that it was
  not asked for, not a decision to reject it). This stage did not answer the question.

- **Question.** AC-11/AC-12 are "measured on a live run". Which input products are used for the Center 3D Print and
  3DDevice runs (only Creality Pika is named and its files are outside version control, OD-13)? How many runs per
  product, and must every run pass or one? Where is the evidence recorded for the reconciliation stage? Who runs it
  (cost, API keys; `test/doc-generation-live.spec.ts` is opt-in and "never part of the gate")? What does a failed run
  trigger: re-iterate the prompt text (a further FROZEN-file change), or only report?
- **Why it cannot be inferred.** Checked: AC-10-AC-12, `AGENTS.md` sections 5 (determinism, live test) and 6; Story
  Scope. LLM output varies between runs, so a single run proves little.
- **Impact if unresolved.** Reconciliation has no defined evidence to accept; the loop may need an unapproved
  second round of FROZEN edits.
- **blocking: false.**

## OD-12 - (revised) Timing and shape of the FROZEN-file approvals; `task-a.ts` is now load-bearing for AC-9

- **Status v4: STILL OPEN - owner INTENT recorded, no approval.** **Source:** `docs/workflow/history.jsonl`, last event (`ts` 2026-10-18T10:08:01Z, HUMAN_PLAN_APPROVAL, sbruhov@gmail.com; "Plan-gate answers"; plan gate itself NOT approved). **Answer, verbatim:** "Q-OD12: intent to approve task-a.ts
  T-A4 first, then output-validator.ts, then master-system-prompt.ts last. One commit per task with --rebaseline in the same
  commit. This is intent only; the "modify <file>" instruction will be given per file in the editing session." Recorded: the
  owner's stated **intent** is the order (1) `src/prompts/task-a.ts` T-A4 (plan-review N2: the operator-notes slice is gated on it),
  (2) `src/utils/output-validator.ts`, (3) `src/prompt-core/master-system-prompt.ts` last; and the commit shape of part (5) is one
  commit per task with `bash arch-guard.sh --rebaseline` in the same commit. **This is not an approval.** The AGENTS.md section 9
  "modify [filename]" instruction is **NOT GIVEN** for any of the three FROZEN files; it "will be given per file in the editing
  session", so OD-12 (the approvals themselves, and the unanswered part (3), which scope is dropped if `task-a.ts` is declined)
  **stays OPEN**. Do not read "approve the plan" or this intent as satisfying section 9. (Plan-review N14, in the same event: T31
  depends on T21 plus a general no-weakening rule for refused frozen items - a plan instruction, not an answer to an OD.)

- **Status v3: STILL OPEN - unchanged.** The Decision (`docs/workflow/workflow-state.yaml` `pending_human_gate.comment`, sbruhov@gmail.com,
  2026-10-17) states, verbatim: "FROZEN-file approvals: not given here; per-file at the plan gate." No approval is recorded
  for `task-a.ts`, `master-system-prompt.ts` or `output-validator.ts`; the Decision restates only that they are per-file at the plan gate (the other parts of this OD are not answered).
  Note for the plan gate: the text confirmed under OD-16/OD-17 is part of the `task-a.ts` approval request.

- **Question.** The Story says per-file approval for `src/prompts/task-a.ts`, `src/prompt-core/master-system-prompt.ts` and
  `src/utils/output-validator.ts` "is required at the plan gate". `AGENTS.md` section 9 requires an explicit user instruction
  naming each file ("modify [filename]") in the current session; the Story records none (the Amendment says so explicitly
  for `task-a.ts`). Re-assessed against the new carrier: (1) `task-a.ts` is now edited for **two independent reasons** (AC-3
  lead-in wording and the AC-9 `[Operator Notes]` block), so the approval has to name both, and a refusal of one
  must not be read as a refusal of the other. (2) `master-system-prompt.ts` is edited for three reasons (AC-2, AC-8, and now
  the `STRICT INPUT SCOPE` text at line 49; see also OD-20 for "the three input blocks" in INTERNAL RECONCILIATION).
  (3) Fallback if a file is declined: before the amendment `output-validator.ts` had a sibling-module fallback (US-8.1
  precedent); with AC-9, a declined `task-a.ts` leaves no stated way to emit the `[Operator Notes]` block, because
  `buildPromptADoc` only appends to `base.userContent` and the plain-HTML path (Expert-3DPrinter, and `generateUaContent`)
  calls the frozen builder directly. Which scope is dropped if `task-a.ts` is declined: AC-9 only, or the whole Story?
  (4) When is approval obtained: before the Specification is signed, or at HUMAN_PLAN_APPROVAL? (5) `bash arch-guard.sh
  --rebaseline` in the same commit as the frozen-file edits: one commit for three files or one per file.
- **Why it cannot be inferred.** Checked: Story Scope "Touches FROZEN files?" and Amendment "FROZEN file"; `AGENTS.md`
  section 9 (list: `task-a.ts`, `task-b.ts`, `task-c.ts`, `master-system-prompt.ts`, `output-validator.ts`; `types.ts`,
  `constants.ts`, `task-a-doc.ts`, `content-orchestrator.service.ts`, `app.component.*` are not on it); `arch-guard.sh` run
  today (clean, so `--rebaseline` would not absorb unrelated drift); `task-a-doc.ts` `buildPromptADoc` and its call sites.
- **Impact if unresolved.** Implementation may reach the section 9 stop with a plan already built around a file, and for
  `task-a.ts` there is no non-frozen route to AC-9 to fall back on.
- **blocking: false** (the Story defers it to the plan gate; it must be settled before IMPLEMENTATION and, for `task-a.ts`,
  it determines whether AC-9 is deliverable at all).

## OD-13 - The requirements source and reference outputs are git-ignored

- **Status v3: PARTLY RESOLVED - 2026-10-17, by the owner.** **Source:** `docs/workflow/workflow-state.yaml`
  `pending_human_gate.comment`, decided by sbruhov@gmail.com at HUMAN_SPEC_APPROVAL. **Decision, verbatim:** "FR-7..FR-9:
  confirmed as normative." This is the confirmation that spec v2 "Specification-level note A" asked of the human ("confirm they
  want the unpinned strings of FR-7 to FR-9 as normative; if not, only the strings pinned by AC-2 remain requirements"): the
  Assert-present / Assert-absent strings of spec FR-7, FR-8 (grounding lock first bullet) and FR-9 (`[VIDEO]` placement) are
  normative, not only the AC-2 strings. This answers the part of this OD about FR-7 to FR-9 only.
- **Still OPEN (non-blocking):** whether the Specification restates the remaining unpinned prompt text (FR-2c, FR-2d,
  FR-10 to FR-15, FR-20 to FR-22) as normative, and whether the reference outputs are committed under a tracked fixture path.

- **Question.** The Story adopts `Knowledge/Issues/4/prompt-changes.spec.md` as its requirements source and uses
  `creality-pika-uk-v2.html` as the reference, but `/Knowledge/` is in `.gitignore` and `AGENTS.md` section 14 calls it
  a read-only snapshot, never rules. Must the Specification restate the normative prompt text of FR-1 to FR-16 in full
  (including FR-2c, FR-2d, FR-10 to FR-15, which no AC pins), and is the reference output to be committed under a
  tracked fixture path, given AC-11/AC-12 are checked against it?
- **Why it cannot be inferred.** Checked: `git check-ignore` (rule `.gitignore:27`), `git ls-files Knowledge` (empty),
  Story References.
- **Impact if unresolved.** The approved specification would point at files that other contributors, CI and
  the reconciliation reviewer cannot read, and the prompt wording could drift unreviewed.
- **blocking: false.**

## OD-14 - The measured baseline does not reproduce from the Story's own breakdown

- **Status v4: RESOLVED (accept as built) - 2026-10-18, by the owner.** **Source:** `docs/workflow/history.jsonl`, last event (`ts` 2026-10-18T10:08:01Z, HUMAN_PLAN_APPROVAL, sbruhov@gmail.com; "Plan-gate answers"; plan gate itself NOT approved). **Answer, verbatim:** "Q-OD7/8/9/14/18: accept as
  built." Q-OD14 as put in the plan v3 Q-list: the counting rule for the "35" baseline (**reading B** is built: spec FR-34 / D-1, one
  hit per carrier instance over all 20 `<figure>` elements, three carriers; 35 is an informational baseline, no test asserts it) and
  the 48-word-hook item are accepted as built. For the 48-word-hook item "as built" is what spec v4 carries: no requirement or
  threshold treats a 48-word hook as a defect (D-7 reports the hook's word count only; "the hook names the buyer's task" is a manual
  AC-12 soft item). The mean >= 12 point (already met by the defective text, 12.2) is covered by the AC-12 amendment of v3 (owner's own
  wording: "mean >= 12 and sigma >= 5.5 as one item"). This stage did not answer the question.

- **Status v3: PARTLY RESOLVED - 2026-10-17, by the owner (soft-target sub-question only).** **Source:**
  `docs/workflow/workflow-state.yaml` `pending_human_gate.comment` (decided by sbruhov@gmail.com at HUMAN_SPEC_APPROVAL) and Story
  v3 "Amendment" (v3, 2026-10-17T15:49:00Z). **Decision, verbatim:** "AC-12: amend soft part to {tozh+Tomu <= 2; mean >= 12 and
  sigma >= 5.5 as one item; hook use-case names the buyer's task (manual)}, need 2 of 3, non-blocking. Per-section
  short-sentence count reported, no threshold. D-6 unchanged." Resolves the part of this OD about which soft targets AC-12
  carries (AC-12 amended as quoted; recorded in Story v3).
- **Still OPEN (non-blocking), not answered by the Decision:** which counting rule defines the "35" baseline and whether the
  video figure counts (spec FR-34 PROPOSED DEFAULT, reading B, not confirmed); and the Story's P2 line that treats "the hook is
  48 words (requirement 40-85)" as a defect. The Decision does not say whether the mean-length item "mean >= 12", which the
  defective text already meets (12.2 in the Story's figures), is still intended to discriminate; this is recorded, not decided.

- **Question.** The Story reports 35 hits as 19 paragraphs plus 16 figcaptions (and AC-11 repeats "35"). The baseline file
  has 20 `<figure>` (19 images and 1 video). The spec FR-9 uk pattern run on it gives 20 paragraph hits (the video lead-in
  included), 14 figcaption hits and 1 `alt` hit, which also sums to 35 but splits differently; two manually
  counted caption hits (the banner «на якому…») are not found. Separately, P2 lists "the hook is 48 words (requirement
  40-85)" as a defect although 48 is inside the range, and the soft target "mean length >= 12" is met by the
  defective text (12.2). Which counting rule defines "35", is the video figure one of the "figures", and which items
  are real targets?
- **Why it cannot be inferred.** Checked: scratch run of the FR-9 pattern on `description_uk-UA.html` and
  `creality-pika-uk-v2.html` (the latter gives 0, matching the Story).
- **Impact if unresolved.** Reconciliation cannot compare before/after against a baseline that has two readings.
- **blocking: false.**

## OD-15 - Non-uk-UA output languages: what verifies the ban

- **Question.** The ban is stated for "every output language", yet `task-c.ts` and `task-translate.ts` are untouched and
  FROZEN (`task-c.ts`), the gate is a `warning`, and AC-11 measures a uk-UA run. Is the intended guarantee only "the
  clean uk-UA master translates clean", with the warning as the sole check for pl/de/es/pt/en/ru, or must a live run
  or unit test cover a translated language? What happens to descriptions already generated and saved in history (not
  re-checked)?
- **Why it cannot be inferred.** Checked: Story Scope (Locales), AC-5, AC-7, AC-11; the uk-UA master fan-out in
  `AGENTS.md` section 3; `validateGeneratedHtml` is called per language (line ~1318).
- **Impact if unresolved.** "Every output language" is an unverifiable claim in the specification.
- **blocking: false.**

---

## OD-16 - `operatorNotes` shape: key names, value types, and what counts as "empty"

- **Status v3: RESOLVED - 2026-10-17, by the owner.** **Source:** `docs/workflow/workflow-state.yaml`
  `pending_human_gate.comment`, decided by sbruhov@gmail.com at HUMAN_SPEC_APPROVAL. **Decision, verbatim:** "OD-16/OD-17:
  confirm PROPOSED DEFAULTS as written (keys, empty rule, labels, order, \n, position)." Recorded content: the OD-16 PROPOSED
  DEFAULTS of `docs/specifications/US-9.1-spec.md` v2, FR-25, are confirmed as written, with no change: key names
  `usageScenarios`, `testResults`, `previousGenerationComparison`, `limitations`; every key optional, every value a `string`;
  a value is empty when `undefined` or its `.trim()` is empty; `operatorNotes` is empty when `undefined` or all four values are
  empty; the rule is applied in `buildPromptA` and in the Generator's input builder (which leaves `operatorNotes` `undefined`
  when empty). This stage did not answer the question.

- **Question.** (1) What are the four keys of `ProductInput.operatorNotes` (the Story fixes "four keys" and the four
  textareas: usage scenarios, test results, comparison with the previous generation, limitations; it does not name the keys or
  say whether to mirror the textarea names)? (2) Are the keys all optional and the values `string`? (3) What is "empty":
  `operatorNotes` absent, `{}`, an object whose four values are `''`, or values that are whitespace only; and where is that
  normalised (in `buildGeneratorInput`, which could leave the whole object `undefined`, or inside `buildPromptA`)?
  The two empty-state sentences in AC-9 ("an empty `operatorNotes` object leaves `userContent` byte-identical" and "with all
  four textareas empty the output is byte-identical") only coincide if one of these rules is chosen.
- **Why it cannot be inferred.** Checked: Story AC-9 and Amendment ("Key names, label text and join order are left to the
  Specification"; Open questions repeats it); `src/app/types.ts` (`ProductInput`, line 41, has no similar structured field;
  the neighbours `supplementalContent?: string` and `customInstructions?: string` give two precedents: `customInstructions`
  is `.trim()`-checked in `buildPromptA`, `supplementalContent` is not).
- **Resolved by source (not a decision).** `ProductInput` is declared only in `src/app/types.ts`, which is not on the
  section 9 FROZEN list; the Story's "the file that declares `ProductInput` is to be confirmed at impact analysis" is
  therefore answered by the tree. That file is absent from the Story's Surface row and must appear in the Specification's
  file list.
- **Impact if unresolved.** The Specification would invent the keys and the empty-state rule, and the byte-identical
  tests (OD-18) cannot be written without the latter.
- **blocking: false.** The Story deliberately delegates the names to the Specification; the human spec gate confirms them.

## OD-17 - `[Operator Notes]` block rendering: entry labels, join order, partial fill, placement

- **Status v3: RESOLVED - 2026-10-17, by the owner.** **Source:** `docs/workflow/workflow-state.yaml`
  `pending_human_gate.comment`, decided by sbruhov@gmail.com at HUMAN_SPEC_APPROVAL. **Decision, verbatim:** "OD-16/OD-17:
  confirm PROPOSED DEFAULTS as written (keys, empty rule, labels, order, \n, position)." Recorded content: the OD-17 PROPOSED
  DEFAULTS of `docs/specifications/US-9.1-spec.md` v2, FR-26, are confirmed as written, with no change: English entry labels
  `Usage scenarios:`, `Test results:`, `Comparison with the previous generation:`, `Limitations:`; fixed join order; one line
  per entry `<label> <value>`; entries joined by a single `\n`; partial fill emits only non-empty entries; the block is omitted
  entirely when all are empty; the block sits immediately after the whole `[Supplemental Content]` line and before the image
  block. This default text is also part of the FROZEN-file approval request of OD-12, which is **not** given by this Decision.
  This stage did not answer the question.

- **Question.** AC-9 fixes only the block label `[Operator Notes]`. Left open by the Story (its Open questions): the label
  text of each of the four entries; the order in which entries are joined; the separator; where the block sits in
  `userContent`, which today is `[INPUT DATA]` ... `[Supplemental Content]` ... image block, video block, marker block,
  `[TEMPLATE]`, `[USER INSTRUCTIONS]`, simplified overlay, then the closing "Generate the description in ..." sentence
  (`task-a.ts` lines 154-168). Not stated by the Story either: what is emitted when only some of the four fields are
  filled (omit empty entries, or print a "None provided."-style line as `[Supplemental Content]` does), and whether the
  block is omitted entirely when all four are empty (implied by byte-identical, but only if the empty state is as in OD-16).
  Whether entry labels are English-only (the prompt language) while the UI labels are bilingual (OD-2(c)).
- **Why it cannot be inferred.** Checked: Story AC-9, Amendment, Open questions; `buildPromptA` today. The existing
  `[Supplemental Content]: ${... || 'None provided.'}` line is an always-present precedent that contradicts "unchanged when
  empty", so it cannot simply be copied.
- **Impact if unresolved.** The text the model reads is part of the FROZEN-file approval request (OD-12). The block rides in
  the uncached `userContent`, so the position decides whether the Doc pipeline's appended suffixes (`runFacts`,
  `[§1 HOOK PATTERN]`) stay after it.
- **blocking: false.**

## OD-18 - NEW - How the byte-identical contract is tested in an edited FROZEN file

- **Status v4: RESOLVED (accept as built) - 2026-10-18, by the owner.** **Source:** `docs/workflow/history.jsonl`, last event (`ts` 2026-10-18T10:08:01Z, HUMAN_PLAN_APPROVAL, sbruhov@gmail.com; "Plan-gate answers"; plan gate itself NOT approved). **Answer, verbatim:** "Q-OD7/8/9/14/18: accept as
  built." Q-OD18 as put in the plan v3 Q-list: the two-tier golden and the input set for the byte-identical oracle are accepted as
  built (spec FR-27 two-tier "today's"; the golden captured from the pre-change `HEAD` before `task-a.ts` is touched). This stage did
  not answer the question.

- **Question.** AC-9 requires `userContent` byte-identical to "today's" when `operatorNotes` is empty. Once `task-a.ts`
  is edited there is no pre-change function to compare against. What is the oracle: a stored golden string captured from
  the current `HEAD` for a defined set of inputs, a test that reconstructs the old template inline, or a snapshot? And
  which inputs: each store group, with and without images/video/markers, a simplified template, `customInstructions`,
  and the Doc-path wrapper `buildPromptADoc` (which asserts a byte-for-byte prefix) with and without a `hookPattern`?
- **Why it cannot be inferred.** Checked: AC-9; `task-a-doc.ts` header comment ("byte-identical to what it was before the
  Story" is the US-2.2 precedent); `task-a.spec.ts` and `task-a-doc.spec.ts` exist (names only; their assertion style was not
  audited here). AGENTS.md section 5 requires the test before the code, so a golden must be captured before `task-a.ts` is
  touched: an ordering constraint for TEST_WRITING.
- **Impact if unresolved.** A byte-identical claim asserted for one input only, or against a fixture generated after the
  change, would pass while regressing cached or Doc-path prompts.
- **blocking: false.**

## OD-19 - Reach of `operatorNotes`: Doc pipeline, Expert-3DPrinter, other prompts

- **Status v4: FULLY RESOLVED (residues (1b), (2)) - 2026-10-18, by the owner.** **Source:** `docs/workflow/history.jsonl`, last event (`ts` 2026-10-18T10:08:01Z, HUMAN_PLAN_APPROVAL, sbruhov@gmail.com; "Plan-gate answers"; plan gate itself NOT approved). **Answer, verbatim:** "Q-OD19: (1b) no, (2)
  yes." Recorded content: **(1b)** `TASK_A_DOC_INSTRUCTION` and the simplified Doc instructions do **not** mention the `[Operator
  Notes]` block (the model sees it in `userContent` only; `task-a-doc.ts` is not edited for the carrier); **(2)** Expert-3DPrinter
  (plain-HTML path, `buildPromptA` direct) **does** receive and render the notes. The v3 "Still OPEN" paragraph below is **closed by
  this answer**. Consistent with OD-2(b) (the four textareas are shown for Expert-3DPrinter). This stage did not answer the question.

- **Status v3: PARTLY RESOLVED - 2026-10-17, by the owner.** **Source:** `docs/workflow/workflow-state.yaml`
  `pending_human_gate.comment`, decided by sbruhov@gmail.com at HUMAN_SPEC_APPROVAL. **Decision, verbatim:** "OD-19: notes reach
  Task A (and Doc via prefix) only; not SEO/slug/FAQ/specs grounding." Resolves: **(1) the mechanism** - the notes reach Task A
  and, through the byte-for-byte `userContent` prefix kept by `buildPromptADoc`, the Doc pipeline (no `task-a-doc.ts` edit for
  the carrier); **(3)** the notes do not reach the SEO-meta, slug or FAQ prompts (they influence the description only); **(4)**
  the notes are not part of spec grounding (`validateSpecsGrounding` and spec-parity read `input.specs` only).
- **Still OPEN (non-blocking), beyond the stated reach:** (1, second half) whether `TASK_A_DOC_INSTRUCTION` or the simplified Doc
  instructions must mention the block; (2) whether Expert-3DPrinter (plain-HTML path, which calls `buildPromptA` directly)
  receives and renders the notes - the Decision says "Task A" and does not name Expert-3DPrinter, so it is not treated as
  answered here; the Specification or the gate should confirm it in one sentence.

- **Question.** (1) **Doc pipeline (`task-a-doc.ts`).** `buildPromptADoc` calls the frozen `buildPromptA` and keeps its
  `userContent` as a byte-for-byte prefix, so a block emitted in `task-a.ts` reaches the Doc path (six of seven stores) with
  no edit to `task-a-doc.ts`. Is that the intended mechanism, and must `TASK_A_DOC_INSTRUCTION` or the simplified Doc
  instructions say anything about the block (the model otherwise sees it in `userContent` only)? The Story's Surface lists
  `task-a-doc.ts` for AC-3 only. (2) **Expert-3DPrinter** uses the plain-HTML path (`buildPromptA` direct, no images, no Doc
  pipeline): does it receive and render the notes? `numericFidelitySources` is reached from the Doc gate (line 674) and both
  HTML paths (1081, 1489), so one extension covers all three. (3) **Other consumers of the same `input`.** `generate()` also
  builds the SEO-meta and slug prompts (`buildPromptB`, `buildPromptSlug`: description only) and the FAQ (supplemental only);
  translations work from the master HTML. Is it intended that the notes influence the description only? (4)
  `validateSpecsGrounding` and the spec-parity gates read `input.specs` only; a figure in the notes (for example "Test
  results") is outside them: intended?
- **Why it cannot be inferred.** Checked: `task-a-doc.ts` (`buildPromptADoc`), `doc-pipeline-flag.ts`, the orchestrator call
  sites above, Story Scope ("`runFaqPipeline`, `src/utils/faq-form.ts` and the translation prompts are not touched"; silent
  on SEO/slug prompts and on the Doc pipeline's carrier).
- **Impact if unresolved.** Silent scope: an unplanned edit to `task-a-doc.ts` or the other prompts, or notes that influence
  the body but not the meta description, with no test saying so.
- **blocking: false.**

## OD-20 - Extending the source lists: `STRICT INPUT SCOPE`, `numericFidelitySources`, the numeric rule text, the script

- **Status v4: FULLY RESOLVED (parts (2), (3)) - 2026-10-18, by the owner.** **Source:** `docs/workflow/history.jsonl`, last event (`ts` 2026-10-18T10:08:01Z, HUMAN_PLAN_APPROVAL, sbruhov@gmail.com; "Plan-gate answers"; plan gate itself NOT approved). **Answer, verbatim:** "Q-OD20: defaults; script
  input set as D-10." Recorded content: **(2)** the plan Q-OD20 default is taken - the `NUMERIC_SOURCE_FIDELITY_RULES` text
  (`constants.ts`) is **not** extended and `supplementalContent` is **not** added to `numericFidelitySources` (the existing
  asymmetry is left alone; `numericFidelitySources` gains the operator-notes values per AC-9, and only that method's doc comment is
  updated, as in plan v3); **(3)** the AC-10 script's input set is spec FR-32 **D-10** (see OD-10). Not covered by this answer: the v3
  note that other places in `STRICT INPUT SCOPE` that count input blocks are not named - spec v4 FR-29 states that no other
  counting place changes; this answer neither confirms nor changes that. This stage did not answer the question.

- **Status v3: PART (1) RESOLVED - 2026-10-17, by the owner.** **Source:** `docs/workflow/workflow-state.yaml`
  `pending_human_gate.comment`, decided by sbruhov@gmail.com at HUMAN_SPEC_APPROVAL. **Decision, verbatim:** "OD-20(1): notes are
  a fact source; reword "three input blocks" to neutral." Resolves part (1): the operator notes are a source for facts (not only
  for scenarios and limitations), and the INTERNAL RECONCILIATION wording "the three input blocks" is reworded to a neutral
  wording that does not count the blocks (the Decision does not give the new wording; it is for the Specification).
- **Still OPEN (non-blocking), the Decision says "OD-20(1)" only:** (2) whether `NUMERIC_SOURCE_FIDELITY_RULES`
  (`constants.ts`) and the `numericFidelitySources` doc comment are extended, and the existing `supplementalContent` asymmetry;
  (3) how the AC-10 script receives the notes (spec FR-32 D-10 stays a PROPOSED DEFAULT, not confirmed). Also not stated: whether
  other places in the `STRICT INPUT SCOPE` block that count input blocks, beyond "the three input blocks", change.

- **Question.** (1) **`STRICT INPUT SCOPE`** (`master-system-prompt.ts` line 49) names "[Raw Description], [Technical Specs]
  or [Supplemental Content]"; the next bullet, INTERNAL RECONCILIATION, scans "the three input blocks". Is the extension only
  the first sentence, or also "three" and the other places in that block that count input blocks (the master is FROZEN and
  cache-bearing, so every word is a change)? Are the notes a source for facts, or only for scenarios and limitations, given
  that STRICT INPUT SCOPE says every claim must trace to a source? (2) **`numericFidelitySources`** (orchestrator line 374)
  carries a comment "MUST stay in sync with NUMERIC_SOURCE_FIDELITY_RULES" (`constants.ts` line 592, not FROZEN), which names
  [Technical Specs], [Raw Description] and the manifest caption: is that text extended too? Note `supplementalContent` is
  absent from both even though STRICT INPUT SCOPE allows it; is that existing asymmetry to be left alone? (3) **AC-10 script.**
  It "takes a generated HTML and the input description": a number that appears only in the operator notes would pass the
  production gate but count as "absent from the input" in the script (AC-12 hard criterion). Does the script receive the notes,
  and how (see OD-10)?
- **Why it cannot be inferred.** Checked: Story AC-9 (says both lists "are extended" without the text), AC-10/AC-12, master
  lines 40-55, `constants.ts` line 592 and the orchestrator doc comment.
- **Impact if unresolved.** A gate stricter or looser than the rule the model was given (the orchestrator comment documents
  that this burns the repair budget), and a measurement script that disagrees with production.
- **blocking: false.**

---

## Consistency check of the v3 Decisions (no new Open Decision raised)

Each Decision was compared with Story v3 and the cited tree facts; none conflicts, so none was held open as a conflict.

- **AC-12 amendment** matches Story v3 "Amendment" v3 and AC-12 as now written (three soft items, 2 of 3, non-blocking, per-section
  count reported, no threshold). The Story's Out of scope line "Persisting the new FR-16 fields in `seo_gen_form_state`"
  concerns the form-state key; OD-2(a) concerns the history record (`seo_gen_history`), so they do not conflict. Spec v2 FR-31
  ("limits itself to form state") and FR-35 ("at least three of four") do **not** yet reflect the Decisions; that is a
  Specification revision (spec v3), not a conflict between Decisions.
- OD-3 (drop the 9-17 band), OD-4 (HOOK on the `[use-case]` slot only, SCENE not in section 1), OD-5 (functional wording for
  section-3 `<h2>` only) and OD-6 (Full description for acceptance runs) are consistent with Story AC-8 (shared block in the
  master; HEADINGS in `EXPERT3D_TOV_BASE_OVERLAY` only; store voice block wins) and with AC-11's three acceptance products.
- OD-19 (notes reach Task A and Doc via prefix only) and OD-20(1) (notes are a fact source) are consistent with Story AC-9 and
  `runFaqPipeline` / `faq-form.ts` unchanged.
- The `buildVideoBlock` wording instruction in the Decision (see the v3 revision note) affects spec FR-11 only; it conflicts with
  no Story text (AC-3 and AC-4 ban pointer words in templates and lead-ins).

---

## Plan-level answers (v4; recorded, NOT Open Decisions)

Source for all rows: `docs/workflow/history.jsonl`, last event (`ts` 2026-10-18T10:08:01Z, HUMAN_PLAN_APPROVAL,
sbruhov@gmail.com). These are answers to questions the implementation plan v3 put to the human (its Q-list, not this log). They are
recorded here so they are not lost and so the Specification and Plan revisions can cite them; they are not Open Decisions and
none was ever `blocking`. This stage interprets none of them beyond the quoted text.

| Q | Owner answer, verbatim | What it changes |
|---|---|---|
| Q1 | "accept master in Task C and optimizer; guard option (b): block 0 compared with live MASTER_SYSTEM_PROMPT; block 1 and userContent stay pinned per case." | Plan decision D0/D11: the new master text reaching Task C description translation and the optimizer is accepted; the Task C digest guard is amended (block 0 vs the live master, block 1 and `userContent` pinned per case). Plan revision. |
| Q-TRANS | "options (1)+(3); optional live translation comparison for Creality Pika outside the gate." | R1a stays a declared residual risk with the self-scoping sentence and an opt-in live comparison outside the gate (option 1), plus a documentation-only characterization pin of the `validateStructuralParity` blind spot (option 3). Options 2 and 4 are not chosen. Plan revision. |
| Q-OPT | "option (1). Note: the optimizer's "lead-in" is the figcaption <b> label, and it inherits PLACEMENT; soften R7a at the next plan touch." | The optimizer contradiction is accepted as recorded (default built; no `optimizer.ts` edit). R7a wording to be softened at the next plan touch. Plan revision. |
| **Q-SCOPE** | "change the literal to "...they do not apply, and the source's sentences and their order are kept." (drop "headings"); update the three Assert-present strings and category 19." | **A Specification change:** the FR-20 self-scoping literal (spec v4 line "the source's sentences, headings and order are kept" and its Assert-present strings) becomes "...they do not apply, and the source's sentences and their order are kept."; handled by the Specification stage (spec v5, re-review, re-approval at HUMAN_SPEC_APPROVAL); the plan's category 19 tests follow. Consistent with the owner's earlier meaning ("sentences", plan R1d). Plan-review N10 (same event): "FR-20 wording governs". |
| Q-CLEARALL | "reset the notes signal in clearAll (generator and ua-generator)." | Not built before; now to be built: "Clear" resets the notes signal in both `clearAll` cases. No FR asked for it (plan-review N3), so it is a new requirement for the Specification revision (spec v5) to carry; the wiring pins the plan held back become due. |
| Q-CODEALT | "no." | The detector does not match the code-authored `Фото:` / `Зображення товару:` labels (`ALT_PREFIX` / `FALLBACK_LABEL` untouched). Tied to OD-7(1) (recorded there). |
| Q-SIMPL | "no." | FR-10 is not extended to the simplified Doc templates or the optimizer; `SIMPLIFIED_TRANSLATION_CLAUSE` stays byte-identical. Related to OD-6 (unchanged). |

Instructions in the same event that are not answers to any question and not ODs: the branch instruction (cut `feat/US-9.1-*` from
6546db8, or from `main` after US-8.1 merges; fixtures T1/T37 record "the commit the Story branch was cut from", N16) and the
Findings line (N10 binding; N14 T31 depends on T21 plus a general no-weakening rule for refused frozen items; N11, N13, N15, N12 fix
at the next touch). They are for the Specification / Plan / Task revisions.

## Consistency check of the v4 answers (no new Open Decision raised)

Each answer was compared with Story v4, spec v4, plan v3 and the earlier owner decisions; none conflicts, so none was held open as a
conflict.

- **Q-SCOPE vs the approved spec FR-20 literal.** Not an OD conflict: the owner changes the literal ("headings" dropped) and spec v4
  contains the old literal, so spec v5 is required (a Specification change, said above). The Story v4 does not pin the literal
  (a search of the Story for it found nothing), so the Story needs no change.
- **Q-CLEARALL** adds behaviour no FR covers; it is a requirement addition for the Specification stage, not an OD and not a conflict
  with Story Out of scope (which concerns `seo_gen_form_state` persistence, not `clearAll`).
- **Q-OD2 defaults (R1 resend, R2 empty on a note-less entry)** are consistent with OD-2 (a) (persist and restore) and with Story
  Out of scope (history record, not `seo_gen_form_state`).
- **Q-OD19 (2) yes** is consistent with OD-2(b) (textareas shown for Expert-3DPrinter) and OD-19 mechanism (Task A direct).
- **Q-OD20 defaults** keep the AC-9 requirement that a number appearing only in the notes passes `numericFidelitySources`; they
  decline only the extra extensions of the rule text and of `supplementalContent`, which the Story does not require.
- **Q-OD11 "include a non-marker run" and "all must pass"** raise the exposure to plan risk R4 (a non-marker run can fail AC-11 on
  model-authored figcaptions that only FR-5 covers); the answer pre-states the consequence ("failure is reported, not auto-iterated"),
  so it is consistent with spec FR-34's failure path and not a new decision.
- **Q-OD12 intent** conflicts with nothing: it is expressly not the section 9 instruction, and OD-12 stays open for it.
- **Q-OD9** conditions the runner on a Node version no repository file states (see OD-9 observation); that is a verification task,
  not a conflict.
