---
artifact: open_decisions
story: US-9.1
version: 6
status: DRAFT
owner: so-clarifier
created_at: 2026-10-17T15:12:00Z
updated_at: 2026-10-19T14:55:00Z
supersedes: docs/decisions/US-9.1-open-decisions.md#5
inputs_consumed:
  - key: story
    version: 6
  - key: specification
    version: 7
  - key: clarification_report
    version: 5
  - key: open_decisions
    version: 5
open_decisions_blocking: false
---

# US-9.1 - Open Decisions (v6)

## v6 revision note (2026-10-19T14:55:00Z)

Revision run against **Story v6** (DRAFT, 2026-10-19T14:50:33Z). **Decision source (cited for every v6 status change; abbreviated
"Waiver decision"):** the owner's decision recorded in Story v6 "Amendment" (v6, "decided by the owner (human operator,
sbruhov@gmail.com) at the AC-11/AC-12 reconciliation blocker") and in `docs/workflow/history.jsonl` (`ts` 2026-10-19T14:50:23Z,
RECONCILIATION to STORY_WRITING, actor sbruhov@gmail.com), verbatim: "Waive the AC-11/AC-12 hard script criteria for US-9.1;
accepted on my manual testing". Owner context, previous owner event (`ts` 2026-10-19T14:42:16Z), original text: "Це дуже важко. Я
зробив простіше. Було проведено тестування генерації товарів. Все працює так як треба." (English rendering: this is very hard; I did
it a simpler way; product generation testing was carried out; everything works as it should). Story v6 changes only the acceptance
status of AC-11 and AC-12 (criterion text unchanged, each carries a marked WAIVED note), corrects the stale FROZEN-approval sentence,
and keeps AC-10 (`tools/measure-description.ts`) in scope. **Nothing was measured:** no script output, no product list, no run count
exists. This stage records the effect on the log; it made no decision and invented no answer.

What changed in this log, by id (everything else, including every recorded resolution, is unchanged from v5):

- **MOOT-BY-WAIVER (status line added at the top of the entry, the full v1 to v5 text kept for history, no answer invented):**
  **OD-11** (live-run acceptance: inputs, repeats, evidence, who runs, what a failure triggers; as a whole, because every part of it
  exists only to run AC-11/AC-12 on live runs), and the **live-run parts** of **OD-10** (the use of the metric definitions as the
  AC-12 hard "0 numbers absent from the input" acceptance on live runs) and **OD-14** (the "35" baseline counting rule and the
  AC-11 comparison against it; the 48-word-hook item is a soft-metric statement, see the OD-14 status line). The source for each is
  the Waiver decision. Their earlier resolutions stay recorded as history and do not bind any live-run acceptance requirement.
- **Not moot, and why (stated so a part is not mistaken for closed):** the **definitions** D-3 to D-5, D-7 and D-9 of OD-10 still
  describe what `tools/measure-description.ts` computes and Story v6 keeps AC-10 in scope, so they stay OPEN as recorded; whether
  the script itself changes is the new OD-30. OD-9 (how the script runs; Node >= 22.18) is untouched for the same reason.
- **Carried forward unchanged, with an observation only (their entries are NOT edited):** **OD-6** (its second clause, "acceptance
  runs use Full description", is a live-run clause now without a consumer; its first clause, where section 3 exists, stands),
  **OD-13** (rest: the reference outputs were also the comparison basis of AC-11/AC-12; now informational only), **OD-15** (the
  waiver removes the only live check that a clean uk-UA master was ever to be looked at, so "what verifies the ban in the other six
  base languages" rests on the `image-deixis` warning and on the owner's manual testing alone; the question and its status are
  unchanged). OD-12 and OD-25 (FROZEN approvals) are untouched by the waiver.
- **NEW Open Decisions created by the waiver (all non-blocking, each with a PROPOSED DEFAULT that is a proposal only):**
  **OD-26** (what FR-34/FR-35 say for a waived, unmeasured criterion), **OD-27** (what the `ac_test_matrix` rows AC-11/AC-12 say, and
  how RECONCILIATION treats a WAIVED row), **OD-28** (whether the soft and manual items of AC-12 are also waived), **OD-29** (what the
  waiver covers: which build and which manual tests, and whether it lapses), **OD-30** (whether `tools/measure-description.ts` and its
  tests stay unchanged), **OD-31** (whether the AC-8 translator/optimizer residual still needs any live check), **OD-32** (fate of
  task T51, the plan's live-run risk entries, and how the unmeasured outcome is disclosed downstream).
- `open_decisions_blocking` stays `false`: no Open Decision is `blocking: true`. Story v6 itself states the consequence that the
  Specification (FR-34, FR-35, OD-11), the `ac_test_matrix` and the reconciliation report "must be revised to the waiver and
  re-reviewed" and that the Specification v7 approval does not cover the change; that is a pipeline consequence of the Story, not an
  Open Decision.

## v5 revision note (2026-10-19T08:10:00Z)

Revision run against **Story v5** (DRAFT, 2026-10-19). **Decision source (cited for every v5 status change; abbreviated "Withdrawal
decision"):** the owner's decision of 2026-10-19 recorded in Story v5 "Amendment" (v5, 2026-10-19T07:25:00Z, "decided by the owner
(human operator, sbruhov@gmail.com)") and in `docs/workflow/history.jsonl` (`ts` 2026-10-19T07:50:00Z, RECONCILIATION to
STORY_WRITING, actor sbruhov@gmail.com), verbatim: "досліди можливість безпечного видалення цих полів. вони не потрібні" then
"modify для task-a.ts та master-system-prompt.ts, шлях 1" (English rendering: investigate whether these fields can be removed
safely, they are not needed; modify task-a.ts and master-system-prompt.ts, path 1). The four operator-note Generator fields, the
carrier `ProductInput.operatorNotes`, the `[Operator Notes]` block, and the `STRICT INPUT SCOPE` and `numericFidelitySources`
extensions are withdrawn (Story v5: AC-9 is a withdrawal stub). This stage records the effect on the log; it made no decision and
invented no answer.

What changed in this log, by id (everything else, including every recorded resolution, is unchanged from v4):

- **MOOT by withdrawal (status line added at the top of the entry, the full v1 to v4 text kept for history, no answer invented):**
  **OD-1** (carrier question, existed only because of the fields; not on the caller's list, marked on the same ground, see the
  v5 consistency check), **OD-2**, **OD-16**, **OD-17**, **OD-19**, and **OD-20 parts (1) and (2)**. Their earlier
  resolutions stay recorded as history; they no longer bind any requirement.
- **Notes part only:** **OD-18** (the "empty `operatorNotes` leaves `userContent` byte-identical" premise is moot; the recorded
  resolution "accept as built" and the FR-11 two-tier golden stay), **OD-20 part (3)** and the D-10 half of **OD-10** (the recorded
  owner answer "script input set as D-10" stands; the notes are no longer one of D-10's optional input texts, which is a
  consequence of the withdrawal, not a new answer), and the **notes parts of OD-12** (see below).
- **OD-12 updated** to the owner's FROZEN-file instruction of 2026-10-19 (`modify src/prompts/task-a.ts`, `modify
  src/prompt-core/master-system-prompt.ts`, history event above). `src/utils/output-validator.ts` was approved earlier and the two
  `output-validator.ts` hunks are committed (commits 7958c7f, ff8ad92; both messages cite the owner instruction of
  `docs/workflow/history.jsonl` `ts` 2026-10-18T15:24:23Z). See the OD-12 entry for what this does and does not close.
- **NEW Open Decisions created by the withdrawal (all non-blocking, each with a PROPOSED DEFAULT that is a proposal only):**
  **OD-21** (what the master `STRICT INPUT SCOPE` / `INTERNAL RECONCILIATION` text reverts to), **OD-22** (how the golden
  `full-description-prompts.json` and the other operator-notes-bearing fixtures are brought back), **OD-23** (how the removal is
  delivered on a branch that is already pushed with an open draft Pull Request), **OD-24** (disposition of the tests of the
  withdrawn feature), **OD-25** (the scope of the 2026-10-19 FROZEN-file instruction).
- **Carried forward unchanged and still open:** OD-10 (D-3 to D-5, D-7, D-9 as recorded in v4), OD-11 (residue as recorded in v4),
  OD-13 (rest), OD-15. See "Owner events after the v4 record" below for one non-blocking observation about them.
- `open_decisions_blocking` stays `false`: no Open Decision is `blocking: true`.

### Owner events after the v4 record (observation only; nothing applied)

`docs/workflow/history.jsonl` holds owner events dated 2026-10-18 after this log's v4 (`ts` 2026-10-18T15:24:23Z, 15:35:15Z,
16:24:34Z, 16:26:23Z) that appear to bear on OD-10 (D-3 to D-5, D-7, D-9: "Confirm and accept the proposed default metric
definitions ... as written"), OD-11 (the residue: products and who runs the live runs, "I will test on other products"), OD-13
("Copy the needed reference outputs ... into a tracked test fixtures directory ... The restated Specification text is normative")
and OD-12 (the earlier by-name FROZEN instructions). This run was told to keep every other Open Decision and its recorded
resolution unchanged, so **their statuses above are left exactly as v4 recorded them**; applying those events is a separate
record-only revision that the orchestrator can request. Spec v6 draft still lists these as open, so the two documents agree. This
is flagged so the stale status is not mistaken for an unanswered question.

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
| OD-1 | The four new Generator textareas feed `supplementalContent`, which already triggers FAQ generation | **RESOLVED (b)** by Story Amendment v2; **v5: MOOT by withdrawal** (Story v5); no longer blocking |
| OD-2 | (revised) History persistence/restore of `operatorNotes`, which Generator views show the four textareas, UI labels | **RESOLVED (a)(b)(c) in v3; residues R1, R2 RESOLVED in v4; v5: MOOT by withdrawal** (Story v5); false |
| OD-3 | RHYTHM (FR-11) against the existing per-locale `[SENTENCE LENGTH]` bands and hard ceiling | **RESOLVED in v3**; false |
| OD-4 | HOOK and SCENE (FR-10, FR-13) against INVARIANT START, answer-first and the hook patterns | **RESOLVED in v3**; false |
| OD-5 | HEADINGS (FR-15) against `[HEADING FORM]`, the overlay's "keep mandated headings" and an existing guard test | **RESOLVED in v3**; false |
| OD-6 | Template and pipeline scope of the shared liveliness block (simplified templates, HTML path) | **RESOLVED in v3**; false |
| OD-7 | `image-deixis` pattern precision (false positives and recall gaps) and the undefined pl/de/es/pt/ru/en patterns | **RESOLVED in v4** (accept as built); false |
| OD-8 | What "the paragraph directly above a figure" means for the detector and the AC-11 structure checks | **RESOLVED in v4** (accept as built); false |
| OD-9 | How `tools/measure-description.ts` runs (no TS runner, DOM needed, outside every gate) | **RESOLVED in v4** (accept as built; verify Node >= 22.18, else the D12 launcher); false |
| OD-10 | Metric definitions in AC-10/AC-12: sentence, section, hook, "number absent from the input" | part (2) "§3 section" / D-6 **RESOLVED in v3** (D-6 unchanged); D-10 (the input-set half of part (4)) **RESOLVED in v4** (v5: the notes are no longer one of D-10's optional input texts, a consequence of the withdrawal); parts (1) D-3..D-5, (3) D-7 and the D-9 half of (4) open; **v6: the live-run use of the definitions (AC-12 hard "0 numbers absent" acceptance on live runs) is MOOT-BY-WAIVER; the definitions as the script's behaviour (AC-10, still in scope) stay as recorded, see OD-30**; false |
| OD-11 | Live-run acceptance (AC-11/AC-12): inputs, repeats, evidence, what a failed run triggers | **PARTLY RESOLVED in v4** (repeats, pass rule, non-marker run, evidence, failure path); product identity and runner open; **v6: MOOT-BY-WAIVER** (Story v6, owner, 2026-10-19; the v4 record is kept as history, nothing measured); false |
| OD-12 | (revised) Timing and shape of the FROZEN-file approvals; `task-a.ts` is now load-bearing for AC-9 | **v5: by-name approvals RECORDED for `task-a.ts` and `master-system-prompt.ts` (owner, 2026-10-19) and `output-validator.ts` (earlier, committed); the AC-9 / operator-notes parts are MOOT; the scope of the 2026-10-19 instruction is the new OD-25**; false |
| OD-13 | The requirements source and reference outputs live in git-ignored `Knowledge/` | FR-7..FR-9 normative status **RESOLVED in v3** (spec note A); rest open; false |
| OD-14 | The measured baseline does not reproduce from the Story's own breakdown; two thresholds are already met by the defective text | soft-target sub-question **RESOLVED in v3** (AC-12 amended); "35" counting rule and the 48-word-hook item **RESOLVED in v4** (accept as built); **v6: the live-run part (the AC-11 comparison against the "35" baseline on live runs) is MOOT-BY-WAIVER; the v4 record is kept**; false |
| OD-15 | Non-uk-UA output languages: what actually verifies the ban beyond the warning | false |
| OD-16 | `operatorNotes` shape: the four key names, value types, and what counts as "empty" | **RESOLVED in v3** (PROPOSED DEFAULTS confirmed as written); **v5: MOOT by withdrawal**; false |
| OD-17 | `[Operator Notes]` block rendering: entry labels, join order, partial fill, placement in `userContent` | **RESOLVED in v3** (PROPOSED DEFAULTS confirmed as written); **v5: MOOT by withdrawal**; false |
| OD-18 | How "an empty object leaves `userContent` byte-identical" is tested in an edited FROZEN file | **RESOLVED in v4** (accept as built); **v5: the operator-notes premise is MOOT; the recorded resolution and the FR-11 two-tier golden stay**; false |
| OD-19 | Reach of `operatorNotes`: Doc pipeline, Expert-3DPrinter, SEO/slug/FAQ prompts | parts (1) mechanism, (3), (4) **RESOLVED in v3**; (1b) instruction text and (2) Expert-3DPrinter **RESOLVED in v4** (fully resolved); **v5: MOOT by withdrawal**; false |
| OD-20 | Extending `STRICT INPUT SCOPE`, `numericFidelitySources`, the numeric rule text and the AC-10 script's "input" | part (1) **RESOLVED in v3**; (2) and (3) **RESOLVED in v4** (fully resolved); **v5: parts (1) and (2) MOOT by withdrawal; part (3) (script input set D-10) stands, minus the notes**; false |
| OD-21 | NEW (v5) - What the master `STRICT INPUT SCOPE` / `INTERNAL RECONCILIATION` text reverts to | **OPEN**, PROPOSED DEFAULT; false |
| OD-22 | NEW (v5) - How the golden `full-description-prompts.json` and the other operator-notes-bearing fixtures are brought back | **OPEN**, PROPOSED DEFAULT; false |
| OD-23 | NEW (v5) - How the removal is delivered on a branch already pushed with an open draft Pull Request | **OPEN**, PROPOSED DEFAULT; false |
| OD-24 | NEW (v5) - Disposition of the tests of the withdrawn feature | **OPEN**, PROPOSED DEFAULT; false |
| OD-25 | NEW (v5) - Scope of the 2026-10-19 FROZEN-file instruction | **OPEN**, PROPOSED DEFAULT; false |
| OD-26 | NEW (v6) - What FR-34 / FR-35 say for a waived, unmeasured criterion | **OPEN**, PROPOSED DEFAULT; false |
| OD-27 | NEW (v6) - What the `ac_test_matrix` rows AC-11 / AC-12 say, and how RECONCILIATION treats a WAIVED row | **OPEN**, PROPOSED DEFAULT; false |
| OD-28 | NEW (v6) - Are the soft and manual items of AC-12 also waived | **OPEN**, PROPOSED DEFAULT; false |
| OD-29 | NEW (v6) - What the waiver covers (build, products, manual tests) and whether it lapses | **OPEN**, PROPOSED DEFAULT; false |
| OD-30 | NEW (v6) - Does `tools/measure-description.ts` (AC-10) stay unchanged | **OPEN**, PROPOSED DEFAULT; false |
| OD-31 | NEW (v6) - Does the AC-8 translator / optimizer residual still need any live check | **OPEN**, PROPOSED DEFAULT; false |
| OD-32 | NEW (v6) - Fate of task T51 and the live-run risk entries; how the unmeasured outcome is disclosed downstream | **OPEN**, PROPOSED DEFAULT; false |

---

## OD-1 - The four new textareas feed `supplementalContent`, which already triggers FAQ generation

- **Status v5: MOOT by withdrawal - 2026-10-19, by the owner.** **Source:** Withdrawal decision (see the v5 revision note: Story
  v5 "Amendment", `docs/workflow/history.jsonl` `ts` 2026-10-19T07:50:00Z). The question exists only because of the four fields;
  they are withdrawn, so no carrier is chosen and the FAQ-trigger concern does not arise. The v2 resolution (b) below is kept as
  history only. Marked on the same ground as the ODs the caller listed; the caller's list did not name OD-1.

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

- **Status v5: MOOT by withdrawal - 2026-10-19, by the owner.** **Source:** Withdrawal decision (v5 revision note). There are no
  textareas, no `operatorNotes` in `ProductInput`, so nothing is persisted in history, restored, shown per view or labelled. The v3
  and v4 resolutions below (including R1 and R2) are kept as history and no longer bind any requirement. No answer is invented.
  A side question this leaves (entries already written to `seo_gen_history` while the branch existed) is not part of this OD;
  see OD-23.

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

- **Status v6: the LIVE-RUN part is MOOT-BY-WAIVER; the rest is unchanged - 2026-10-19, by the owner.** **Source:** Waiver decision
  (v6 revision note). The hard AC-12 criterion "0 numbers absent from the input on the same runs" is waived and not measured, so the
  use of D-9 and D-10 as the acceptance test of live runs has no consumer. This is a status mark, not an answer: the v3 and v4
  resolutions below (D-6; D-10) stay recorded as history, and the open parts (D-3 to D-5, D-7, D-9) are NOT closed, because
  `tools/measure-description.ts` computes them and Story v6 keeps AC-10 in scope; whether the script's behaviour changes at all is
  the new OD-30. No answer is invented.

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

- **Status v6: MOOT-BY-WAIVER - 2026-10-19, by the owner.** **Source:** Waiver decision (v6 revision note): "Waive the AC-11/AC-12
  hard script criteria for US-9.1; accepted on my manual testing" (Story v6 "Amendment"; `docs/workflow/history.jsonl` `ts`
  2026-10-19T14:50:23Z). There are no live runs to accept, so the inputs, repeats, pass rule, non-marker run, evidence, runner and
  failure path asked here have no subject. The v4 partial resolution below ("three products x 2 runs, all must pass hard criteria,
  include a non-marker run; evidence = script output; failure is reported, not auto-iterated") and the open residue (which Center
  3D Print and 3DDevice products; who runs, with the 2026-10-18T16:26:23Z owner note "I will test on other products") are kept as
  history; they no longer bind any requirement. **Nothing was measured:** no script output, no product list, no run count. This
  stage did not answer the question and does not treat the owner's manual testing as the answer to any of its parts; what the
  waiver covers is the new OD-29.

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

- **Status v5: by-name approvals RECORDED; operator-notes parts MOOT; scope question moved to OD-25 - 2026-10-19.** **Source:**
  `docs/workflow/history.jsonl`, event `ts` 2026-10-19T07:50:00Z (actor sbruhov@gmail.com), verbatim: "modify для task-a.ts та
  master-system-prompt.ts, шлях 1", recorded in that event as "FROZEN-file approval: modify src/prompts/task-a.ts and
  src/prompt-core/master-system-prompt.ts" (English rendering: modify task-a.ts and master-system-prompt.ts, path 1). This stage
  records the instruction; it did not give it and reads nothing beyond its text.
  **Per file (AGENTS.md section 9, "modify [filename]"):**
  - `src/prompts/task-a.ts` - instruction given 2026-10-19 (above). An earlier by-name instruction for the whole file's US-9.1
    hunks is also in the history (`ts` 2026-10-18T15:24:23Z, "modify src/prompts/task-a.ts, modify src/utils/output-validator.ts,
    modify src/prompt-core/master-system-prompt.ts", "this session only").
  - `src/prompt-core/master-system-prompt.ts` - same two events.
  - `src/utils/output-validator.ts` - the 2026-10-18T15:24:23Z instruction (cited in the messages of commits 7958c7f and ff8ad92,
    which landed the two hunks: the `image-manifest-missing` message and the `image-deixis` warning). Nothing in the withdrawal
    touches this file.
  **Parts of the OD by the v4 numbering:** (1) "`task-a.ts` is edited for two independent reasons" - MOOT, one reason remains (the
  FR-11 spans); (2) "`master-system-prompt.ts` is edited for three reasons ... and now the `STRICT INPUT SCOPE` text" - MOOT for
  the `STRICT INPUT SCOPE` / "three input blocks" reason as an *extension*; what the text reverts to is the new OD-21; (3) the
  fallback if `task-a.ts` is declined for AC-9 - MOOT (AC-9 is withdrawn); (4) timing - the approvals now exist, before the
  withdrawal edits; (5) commit shape - the v4 *intent* (one commit per task with `bash arch-guard.sh --rebaseline` in the same
  commit) is unchanged and not re-asked, but how the removal is committed on the existing branch is the new OD-23.
  **What this does not settle:** whether the 2026-10-19 instruction covers only the withdrawal hunks or all US-9.1 hunks of the two
  files, and for how long it lives, is the new **OD-25**. The v4 entry and the v3 entry below are kept as history.

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

- **Status v6: the LIVE-RUN part is MOOT-BY-WAIVER; the rest is unchanged - 2026-10-19, by the owner.** **Source:** Waiver decision
  (v6 revision note). AC-11's "0 deixis hits (Creality Pika baseline: 35)" is waived and not measured, so the before/after
  comparison against the "35" baseline has no live consumer. The v4 resolution ("accept as built": reading B; 35 informational, no
  test asserts it) stays recorded as history. The soft-target sub-question (v3, AC-12 amended) is untouched by this status line;
  whether AC-12's soft items are themselves waived is the new OD-28. The counting rule as implemented in the script (D-1) is part
  of the script's behaviour, see OD-30. No answer is invented.

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

- **Status v5: MOOT by withdrawal - 2026-10-19, by the owner.** **Source:** Withdrawal decision (v5 revision note). The structure
  does not exist any more. The v3 resolution below is kept as history; no answer is invented.

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

- **Status v5: MOOT by withdrawal - 2026-10-19, by the owner.** **Source:** Withdrawal decision (v5 revision note). The block is not
  emitted any more. The v3 resolution below (and its note that this text was part of the OD-12 approval request) is kept as
  history; no answer is invented.

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

- **Status v5: notes premise MOOT by withdrawal; recorded resolution UNCHANGED - 2026-10-19.** **Source:** Withdrawal decision (v5
  revision note) and Spec v6 FR-27 as drafted. The contract "empty `operatorNotes` leaves `userContent` byte-identical" no longer
  exists (AC-9 is withdrawn). The v4 owner resolution ("accept as built": the two-tier golden captured from the pre-change `HEAD`)
  is kept as recorded; what survives is the FR-11 part, i.e. a golden that pins the `userContent` text outside the three FR-11
  spans (Tier A) and the spans themselves (Tier B). This stage did not decide that reading; it is Spec v6's, and the golden
  fixtures that still carry the operator-notes shape are OD-22.

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

- **Status v5: MOOT by withdrawal - 2026-10-19, by the owner.** **Source:** Withdrawal decision (v5 revision note). No notes reach
  any prompt. The v3 and v4 resolutions below are kept as history; no answer is invented.

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

- **Status v5: parts (1) and (2) MOOT by withdrawal; part (3) stands minus the notes - 2026-10-19, by the owner.** **Source:**
  Withdrawal decision (v5 revision note). (1) `STRICT INPUT SCOPE` / "the three input blocks" is no longer *extended*, and the v3
  owner decision "notes are a fact source; reword 'three input blocks' to neutral" has no subject any more; what the text is then
  is the new **OD-21**, not an answer given here. (2) `numericFidelitySources` is not extended and its doc comment is not updated
  for the notes (the v4 default "`NUMERIC_SOURCE_FIDELITY_RULES` not extended, `supplementalContent` not added" is unaffected
  because nothing is extended at all). (3) The v4 owner answer "script input set as D-10" stands as recorded; the notes are no
  longer among D-10's optional input texts (Spec v6, FR-32), a consequence of the withdrawal. v3/v4 text below is history.

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

## OD-21 - NEW (v5) - What the master `STRICT INPUT SCOPE` / `INTERNAL RECONCILIATION` text reverts to

- **Question.** With the `[Operator Notes]` block withdrawn, what is the final text of the two bullets of `[SOURCE FIDELITY]` in
  `src/prompt-core/master-system-prompt.ts` (FROZEN): (a) byte-identical to `main`; (b) a new text that keeps the count-free
  wording of the branch ("scan the input blocks you were given") but names only [Raw Description], [Technical Specs] and
  [Supplemental Content]; or (c) something else?
- **Why it cannot be inferred.** Checked: `git show main:src/prompt-core/master-system-prompt.ts` lines 47-53: `STRICT INPUT
  SCOPE` names "[Raw Description], [Technical Specs] or [Supplemental Content]" and `INTERNAL RECONCILIATION` says "scan the three
  input blocks". The branch text (commit 6db2885, lines 48-54) adds `[Operator Notes]` to the first and replaces "the three input
  blocks" with "the input blocks you were given - ... and, when present, [Operator Notes] -". `git grep` for `operatorNotes` or
  `Operator Notes` on `main` finds nothing, so (a) is a complete restore. The only owner statements are the 2026-10-19 withdrawal
  ("modify ... master-system-prompt.ts, path 1") and the 2026-10-17 v3 decision OD-20(1) "notes are a fact source; reword 'three
  input blocks' to neutral", which was premised on a fourth block that no longer exists; neither says what the text becomes now. The
  Spec v6 draft states "returns to its pre-US-9.1 text", but history event `ts` 2026-10-19T07:50:00Z records that Story v5 and
  Spec v6 were pre-written by the assistant to be validated, so that sentence is a draft proposal, not an owner decision.
- **Impact if unresolved.** The master is FROZEN and cache-bearing; it is block 0 of Task C description translation and of the
  optimizer (commit 6db2885 disclosed that their block 0 named [Operator Notes] although their `userContent` never carries it), and
  block 0 of ten golden cases (OD-22). An existing spec `src/prompt-core/master-system-prompt.operator-notes.spec.ts` asserts the
  literal `three input blocks` is ABSENT, which contradicts (a). A wrong guess means a second FROZEN edit round.
- **PROPOSED DEFAULT (a proposal only, not an answer):** (a), both bullets byte-identical to `main`, so the net diff of the master
  against `main` has no `[SOURCE FIDELITY]` hunk; "three input blocks" is true again (three blocks). The spec above that asserts the
  absence of `three input blocks` then has no subject (OD-24).
- **blocking: false.**

## OD-22 - NEW (v5) - How the golden `full-description-prompts.json` and the other operator-notes-bearing fixtures are brought back

- **Question.** `test/fixtures/golden/full-description-prompts.json` was regenerated in commit 6db2885 to carry the notes-bearing
  master text in block 0 of ten cases (the commit message: "block 0 of ten cases; translate/* unchanged"). Must the file be
  regenerated after the master revert (OD-21), by which mechanism and stage, and what proves that the regenerated diff contains
  only the withdrawal? The same question for the other fixtures and specs that carry the notes shape.
- **Why it cannot be inferred.** Checked: `grep -c "Operator Notes"` on the golden gives 10; `git diff main --stat` shows the golden
  changed by 60 lines in total (the US-9.1 changes together, not only the notes); files with `operatorNotes` / `Operator Notes`
  outside `docs/`: `test/fixtures/golden/full-description-prompts.json`, `test/fixtures/task-a-user-content-inputs.ts`,
  `test/fixtures/faq-pipeline.ts`, `src/prompts/task-a.user-content.golden.spec.ts`,
  `src/prompts/full-description.golden.us91.spec.ts`, `src/prompts/task-c.master-reach.spec.ts`,
  `src/prompts/optimizer.master-reach.spec.ts`, `src/prompts/task-a-doc.figure-placement.spec.ts`,
  `test/faq-pipeline.master-leak.spec.ts`, `test/measure-description.cli.spec.ts`. AGENTS.md section 7 item 7 lists "asserting on
  copied-from-actual output" as test weakening, so a regenerated golden needs an independent oracle. The history note of
  2026-10-18T19:58:59Z ("Builder must regenerate full-description-prompts.json in the same T30-T32 commits") is a precedent for this
  Story, not a rule for the removal.
- **Impact if unresolved.** Block 0 is wrong in the golden, or the golden is regenerated blindly and a defect is frozen into it.
- **PROPOSED DEFAULT (a proposal only, not an answer):** regenerate the golden with the existing mechanism in the same commit as the
  master revert (OD-21), and show that the diff against the current golden touches only the two `[SOURCE FIDELITY]` bullets in the ten
  block-0 cases (no `userContent`, no block 1, no `translate/*` hunk); fixtures and specs that carry only the notes shape follow OD-24.
- **blocking: false.**

## OD-23 - NEW (v5) - How the removal is delivered on a branch that is already pushed with an open draft Pull Request

- **Question.** (a) Are the notes removed by new commits on top of the existing branch history, or is the branch history rewritten
  (the notes commits dropped) and force-pushed? (b) What does "path 1" mean: the Story v5 English rendering says "path 1 (amend
  US-9.1 on its branch)", but the owner's verbatim words are only "шлях 1" and the alternatives are not in the sources read. (c)
  What happens to browser history entries (`localStorage` key `seo_gen_history`) written with an `operatorNotes` property while the
  branch existed, and to the open draft PR #142 whose title and body describe the feature?
- **Why it cannot be inferred.** Checked: `git log origin/main..HEAD` shows 51 commits and `git branch -r --contains HEAD` shows the
  branch on origin; history event `ts` 2026-10-18T20:38:25Z records the push and DRAFT PR #142 outside the pipeline; the notes
  commits (28ba099, 1a335c7, 7397081, 46d9a15, 9176be3, 24bee59, 6033a80, 510604c, fe29f88, 6db2885) are interleaved with commits
  that stay. AGENTS.md section 7 item 10 reserves every write to a remote (push, PR) to `so-pr-creator` on a separate explicit human
  instruction, and `so-pr-creator` never force-pushes. `main` has no `operatorNotes`, the PR is unmerged, so the field could reach a
  browser only through a run of this branch; `HistoryService` reads with `JSON.parse` and no shape check, so an extra property would
  be carried, not rejected (not tested here).
- **Impact if unresolved.** A history rewrite would erase commits whose FROZEN approvals are recorded; leaving PR #142 as is would
  present a withdrawn feature; stale browser entries are a privacy remainder (the security review had noted notes in `localStorage`,
  finding N-3).
- **PROPOSED DEFAULT (a proposal only, not an answer):** (a) forward removal commits on the same branch, one per task, with
  `bash arch-guard.sh --rebaseline` in the same commit for each FROZEN file, no history rewrite and no force-push; (c) no migration of
  browser history (the property is ignored by the code once the type no longer has it) and the PR text is updated only by a
  separately instructed `so-pr-creator` run; (b) the owner confirms the meaning in one sentence.
- **blocking: false.**

## OD-24 - NEW (v5) - Disposition of the tests of the withdrawn feature

- **Question.** The branch holds specs written for AC-9 and FR-24 to FR-31, FR-40, FR-41. Are they deleted with the feature, and is
  anything kept or added to prove the feature is gone and stays gone?
- **Why it cannot be inferred.** Checked: operator-notes specs on the branch: `src/prompts/operator-notes.spec.ts`,
  `src/prompts/task-a.operator-notes.spec.ts`, `src/prompt-core/master-system-prompt.operator-notes.spec.ts`,
  `src/services/content-orchestrator.operator-notes.spec.ts`, `src/services/history.service.operator-notes.spec.ts`,
  `src/app/app.component.operator-notes.spec.ts`, `src/app/operator-notes-form-state.spec.ts`,
  `src/app/components/operator-notes-fields/operator-notes-fields.component.spec.ts`, plus notes cases inside the shared specs of
  OD-22. AGENTS.md section 7 item 7 forbids "deleting a failing test"; those specs would fail once the code is gone, and the
  deletion is a withdrawal of a requirement, not of a defect, but nothing in the sources says that the owner's decision authorises
  the deletion. `so-builder` does not modify tests, so the owning stage matters. Spec v6 stubs the FRs and rewords only FR-27.
- **Impact if unresolved.** Either orphan specs fail the gate, or they are deleted without a recorded authority; and nothing stops
  the feature returning silently through the master text or `userContent`.
- **PROPOSED DEFAULT (a proposal only, not an answer):** the TEST_WRITING stage removes exactly the tests of the withdrawn
  requirements, each deletion traced to a withdrawn FR stub of Spec v6, and adds absence pins (the master contains no `Operator
  Notes`; `userContent` contains no `[Operator Notes]`; the FR-27 Tier A / Tier B golden stays); no test of a surviving requirement
  is touched.
- **blocking: false.**

## OD-25 - NEW (v5) - Scope and lifetime of the 2026-10-19 FROZEN-file instruction

- **Question.** AGENTS.md section 9 requires "modify [filename]" for that file "in the current session". The 2026-10-19 instruction
  names `src/prompts/task-a.ts` and `src/prompt-core/master-system-prompt.ts`. Does it cover (i) only the removal of the notes
  hunks (the `buildOperatorNotesBlock` import and call in `task-a.ts`; the two `[SOURCE FIDELITY]` bullets, see OD-21), (ii) the
  removal plus any other hunk the revised Specification needs in those files, or (iii) all US-9.1 hunks of both files again? And in
  which session do the edits happen, given the instruction was given before the Specification, plan and tests are re-approved?
- **Why it cannot be inferred.** Checked: `docs/workflow/history.jsonl`, `ts` 2026-10-19T07:50:00Z: the verbatim words carry no scope
  or session statement, and the same note says "no code is edited until HUMAN_SPEC_APPROVAL, plan, and tests are re-done"; the
  earlier instruction of `ts` 2026-10-18T15:24:23Z says "Scope: this session only; US-9.1 hunks only", and the owner re-stated the
  authorisation at 15:35:15Z and 16:24:34Z, which the orchestrator relied on when it checked the "grant liveness" finding F1 (history
  event `ts` 2026-10-18T20:19:04Z). Other US-9.1 hunks of the two files are already committed under the earlier grant (`task-a.ts`:
  87fb3c0, 7c8fae9; `master-system-prompt.ts`: a0e33a5, 3110e94, 18cad1f, ecaa2fd, d5d207a); only 7397081 (`task-a.ts`) and 6db2885
  (master) are notes commits. The withdrawal does not undo the others.
- **Impact if unresolved.** The implementation stage may reach the section 9 stop with a hunk the instruction does not clearly cover,
  or may treat a stale grant as live.
- **PROPOSED DEFAULT (a proposal only, not an answer):** (i) the 2026-10-19 instruction covers the withdrawal hunks only; the
  Specification stage lists the exact hunks as the approval-request text; and the owner re-states the instruction in the session
  that edits, as was done on 2026-10-18.
- **blocking: false.**

---

## OD-26 - NEW (v6) - What FR-34 / FR-35 say for a waived, unmeasured criterion

- **Question.** Story v6 leaves the AC-11/AC-12 criterion text unchanged and marks it WAIVED. Spec v7 (APPROVED) FR-34 (structural
  acceptance on 3 products x 2 runs, hard) and FR-35 (hard numbers, soft liveliness, manual fact review) are written as
  requirements that must be met by a live run. In the revised Specification, do FR-34/FR-35 (a) keep their text and gain a marked
  WAIVED note citing the owner decision, (b) stay as a non-binding procedure "applicable if the live runs are ever performed", (c)
  be removed or stubbed (the way the withdrawn FR-24 to FR-31 were stubbed), or (d) something else? And what happens to their
  sub-parts: the run rules and failure path (OD-11, now MOOT-BY-WAIVER), the coverage note (spec note H: FR-5 alone reaches
  model-authored figcaptions and `alt`), and the traceability rows of AC-11/AC-12?
- **Why it cannot be inferred.** Checked: Story v6 "Amendment" (it says only that FR-34, FR-35 and OD-11 "must be revised to the
  waiver and re-reviewed"; it does not say how); `grep -i waiv` over `docs/workflow/*.md`, `docs/workflow/*.yaml`, `AGENTS.md`,
  and the `so-reconciliation-reviewer`, `so-spec-writer`, `so-test-writer` skills finds no waiver vocabulary, status or procedure
  (the only hit, `AGENTS.md` line 515, is the section 10 spec waiver for harness files); the Story precedent for withdrawn text is
  a stub that keeps the number (AC-9), which is a withdrawal, not a waiver of a criterion whose text is kept "so the intent stays
  readable".
- **Impact if unresolved.** The Specification writer would invent the wording; a requirement left reading as "must be measured" next
  to a Story that waives it makes the Specification contradict the Story, and a removed requirement loses the intent the owner asked
  to keep. Spec v7's approval does not cover the change (Story v6), so the choice is re-reviewed and re-approved at
  HUMAN_SPEC_APPROVAL.
- **PROPOSED DEFAULT (a proposal only, not an answer):** (a), with (b) as the meaning: FR-34 and FR-35 keep their text unchanged,
  each begins with a marked note "WAIVED for this delivery by the owner, Story v6, history.jsonl `ts` 2026-10-19T14:50:23Z; not
  measured", the run rules / failure path / coverage note stay as the procedure that applies if the runs are performed, and the
  traceability matrix marks AC-11/AC-12 "waived, unmeasured" instead of dropping them.
- **blocking: false.**

## OD-27 - NEW (v6) - What the `ac_test_matrix` rows AC-11 / AC-12 say, and how RECONCILIATION treats a WAIVED row

- **Question.** (a) What do the AC-11 and AC-12 rows of `docs/tests/US-9.1-ac-test-matrix.md` carry in their test-file, state and
  evidence cells for a criterion that is waived and has no test and no measurement? (b) What does RECONCILIATION do with a WAIVED
  row: count it as satisfied-by-waiver with a disclosure, report it as a non-blocking finding, or keep the verdict BLOCKED until a
  different artifact exists? (c) Does the waiver change anything for the other rows (AC-1 to AC-10 are unchanged by Story v6)?
- **Why it cannot be inferred.** Checked: the matrix v4 (breakdown v5) rows for AC-11 and AC-12 read test file `-`, state "green
  (committed; guard, stays green; observed in this run)", disposition "built (guard)"; they cite no test and no run, so that state
  text does not describe a waived, unmeasured criterion and would mislead a reader of the report; `docs/workflow/history.jsonl`
  records two reconciliation results (`ts` 2026-10-19T12:49:31Z v2 BLOCKED, 14:43:55Z v3 BLOCKED), the second stating that the
  owner's statement "is neither script evidence nor a recorded waiver" and that an explicit owner waiver, "preferably as Story v6
  amendment", unblocks; nothing in `artifact-lifecycle.md`, `artifact-paths.yaml` or the reviewer skill defines a WAIVED state or
  what the reviewer does with one.
- **Impact if unresolved.** The matrix and the reconciliation report either keep a false "green/built" claim for two rows nobody
  measured, or the next RECONCILIATION run re-blocks on a point the owner already decided; the Pull Request (OD-32) would then
  inherit the same ambiguity.
- **PROPOSED DEFAULT (a proposal only, not an answer):** (a) the AC-11 and AC-12 rows state "WAIVED (owner, Story v6, 2026-10-19;
  not measured)", test file `-`, and cite the history event instead of any test or run; (b) RECONCILIATION records them as waived
  and unmeasured, lists them in `non_blocking_findings`, and does not report them as passed or as measured; (c) no other row changes.
- **blocking: false.**

## OD-28 - NEW (v6) - Are the soft and manual items of AC-12 also waived

- **Question.** The AC-12 waiver note names "the hard script criterion of AC-12 (0 numbers absent from the input)" as waived, then
  says "the soft and manual items above are likewise not evidenced by any recorded run". Are the soft items (2 of 3 of: «тож» +
  «Тому» <= 2; mean >= 12 and sigma >= 5.5; the hook names the buyer's task) and the manual operator review (no fact absent from the
  input) (a) waived with the hard criterion, (b) not waived and still required, with the owner's manual testing standing in as the
  only, unevidenced, review, or (c) not waived and deferred to a later live run?
- **Why it cannot be inferred.** Checked: the AC-12 waiver note wording above, Story v6 "Amendment" ("only the acceptance status of
  AC-11 and AC-12"; "the hard script criteria ... are WAIVED"), and the owner's verbatim words ("Waive the AC-11/AC-12 hard script
  criteria"), which name only the hard criteria; the Story's phrase "likewise not evidenced" states a fact (no evidence) and does not
  say whether the absence of evidence is acceptable for these items. By their own text the soft items are "reported, not blocking",
  so a miss never blocked; the manual item is "reviewed by the operator", which the owner's statement may or may not be.
- **Impact if unresolved.** RECONCILIATION cannot decide whether the manual fact review (the only check of invented facts that is not
  a number) is an open gap or accepted; the Specification cannot word the soft and manual parts of FR-35.
- **PROPOSED DEFAULT (a proposal only, not an answer):** (b) read narrowly as the owner's words: only the hard script criteria of
  AC-11 and AC-12 are waived; the soft items remain non-blocking and are recorded as "not evidenced", the manual review is recorded
  as covered by the owner's statement and not as evidence; the owner confirms or widens this in one sentence.
- **blocking: false.**

## OD-29 - NEW (v6) - What the waiver covers (build, products, manual tests) and whether it lapses

- **Question.** The waiver is "accepted on my manual testing", with the owner's context "product generation testing was carried out.
  Everything works as it should" (14:42:16Z) and no product list, run count or script output. (a) Against which prompt state was
  that testing done (the final prompt after the master revert and `task-a.ts` removal hunks, or an earlier state)? (b) Which stores,
  templates and languages did it cover, and did it include a run with non-marker (model-authored) figures (spec note H: the case
  that FR-5 alone must cover)? (c) Does the waiver lapse if a prompt-bearing file changes after 2026-10-19T14:50:23Z (for example a
  further FROZEN edit), or if the owner later performs the live runs and one fails: is the waiver then void, or does a failed run
  only have to be reported?
- **Why it cannot be inferred.** Checked: Story v6 "Amendment" ("No `measure-description.ts` output, product list or run count
  exists"); `docs/workflow/history.jsonl` events of 14:42:16Z and 14:50:23Z (no products, no commit, no time of the testing); the
  event of `ts` 2026-10-18T16:26:23Z in which the owner said the live runs would use "other products" chosen by the operator; plan
  risk R5 (evidence captured before the master revert used a different master, 130 more characters). The last implementation commits
  in the log, `313f727` and the FROZEN rebaselines cited by the verification event of `ts` 2026-10-19T12:41:12Z, precede the waiver,
  but nothing links the manual testing to a commit.
- **Impact if unresolved.** The headline outcome (0 picture references, 0 invented numbers) is accepted on the owner's word with no
  recorded scope; a later prompt change could silently void the basis of the waiver, and RECONCILIATION and the Pull Request cannot
  say what exactly was accepted.
- **PROPOSED DEFAULT (a proposal only, not an answer):** the waiver is recorded as covering the delivery as committed at the time of
  the owner's decision, with no product list demanded and no retro-fitted claim of coverage; any later change to a prompt-bearing file
  of this Story needs the owner to restate the waiver; a later live run that fails is reported with its output (the OD-11 v4
  failure-path wording is kept as history) and does not by itself void the waiver; the owner confirms (a) and (b) in one sentence.
- **blocking: false.**

## OD-30 - NEW (v6) - Does `tools/measure-description.ts` (AC-10) stay unchanged

- **Question.** Story v6 keeps AC-10 in scope and unchanged. The AC-10 text ends "It exits non-zero when a hard threshold is
  violated (AC-11 hard items, AC-12 numbers)", i.e. it names two criteria that are now waived. Does the script, `src/utils/
  description-metrics.ts`, and their tests (`description-metrics.spec.ts`, `test/measure-description.cli.spec.ts`) stay exactly as
  built, including the non-zero exit on a hard violation and the header/doc comments that refer to AC-11/AC-12? And is the script
  still a delivered operator tool (usable for any later live run) rather than dead code, and does the OD-9 condition (verify Node
  >= 22.18, else the D12 launcher) still apply to it?
- **Why it cannot be inferred.** Checked: Story v6 AC-10 text and the sentence "AC-10 (`tools/measure-description.ts`) stays in
  scope"; `git log` of `tools/measure-description.ts` (990cb32 added it; 291bc1e removed the four `--notes-*` flags; nothing since)
  and `git diff --stat main -- tools src/utils/description-metrics.ts` (the script and `description-metrics.ts` are on the branch,
  117 and 262 lines); the matrix rows for AC-10 are green and cite real specs. The Story does not say whether "stays in scope"
  means "stays unchanged".
- **Impact if unresolved.** A specification writer might either strip or reword threshold behaviour that tests pin, or leave comments
  that describe a waived criterion as a live gate; the script's remaining definitions D-3 to D-5, D-7, D-9 (OD-10, still open) have
  an unresolved purpose if the script is never run for acceptance.
- **PROPOSED DEFAULT (a proposal only, not an answer):** the script, the metrics module, their tests and the AC-10 criterion text
  are unchanged by the waiver; the thresholds stay implemented (the criterion text is kept "so the intent stays readable"); the OD-9
  verification condition and the open OD-10 definitions are carried as recorded.
- **blocking: false.**

## OD-31 - NEW (v6) - Does the AC-8 translator / optimizer residual still need any live check

- **Question.** AC-8 accepts a declared residual: description-translation prompts (Task C) and the optimizer inherit the new master
  through `systemBlocks[0]`, a translator that adds, splits or drops a sentence inside a `<p>` is invisible to
  `validateStructuralParity`, and the optimizer keeps its own "`<b>` lead-in" instruction (plan R1a, R7a; spec note G). Does the
  waiver of AC-11/AC-12 change what is required of that residual: still no live check required, the optional live translation
  comparison of Q-TRANS kept optional, or a live check now needed because the only live evidence is the owner's unscripted manual
  testing?
- **Why it cannot be inferred.** Checked: spec v7 note G ("the only evidence would be an opt-in live comparison outside the gate (not
  required by any requirement here)"); the Q-TRANS answer recorded in the plan-level answers of this log ("options (1)+(3);
  optional live translation comparison for Creality Pika outside the gate"); AC-11/AC-12 never covered a translated language (a
  uk-UA run, see OD-15), so the waiver removes no check of translation that existed; the owner's statement does not say whether the
  manual testing included a translated language or the optimizer.
- **Impact if unresolved.** RECONCILIATION and the Pull Request cannot tell whether "AC-8 residual" is a closed, a declared or an
  open item once the live criteria are waived.
- **PROPOSED DEFAULT (a proposal only, not an answer):** unchanged by the waiver: the residual stays declared, the Q-TRANS optional
  live comparison stays optional and outside the gate, and no new requirement or check is created; the unverified state of
  translated output is disclosed together with OD-15 and OD-32.
- **blocking: false.**

## OD-32 - NEW (v6) - Fate of task T51 and the live-run risk entries; how the unmeasured outcome is disclosed downstream

- **Question.** (a) Task T51 of `docs/plans/US-9.1-task-breakdown.md` ("Re-run the live acceptance runs after the master revert
  (manual, owner-run, outside the gate)", dependent on the human QA operator, H-OD11) and the plan risk R5 exist only for AC-11/AC-12:
  are they retired, kept as an optional owner action, or left as an unfulfilled task? (b) AGENTS.md section 13 requires the Pull
  Request to state "how the acceptance criteria were verified": must the PR description, the reconciliation report and the
  `ac_test_matrix` state explicitly that the headline outcome is unmeasured and accepted on the owner's word? (c) Is the unmeasured
  status a known limitation recorded anywhere persistent besides these artifacts?
- **Why it cannot be inferred.** Checked: task breakdown v5 T51 ("Not a precondition for QUALITY_GATE"; "Whether pre-revert evidence
  still counts is left to RECONCILIATION"); plan risk R5; `AGENTS.md` lines 534-541 (the PR states which phase was closed and how
  the acceptance criteria were verified); Story v6 ("The delivery ships with the headline outcome unmeasured and accepted on the
  owner's word"), which states the fact but gives the downstream stages no instruction.
- **Impact if unresolved.** The plan and breakdown keep a manual task that can never complete, so the pipeline's status reads as
  unfinished or the task is silently dropped; the PR may describe verification that did not occur.
- **PROPOSED DEFAULT (a proposal only, not an answer):** (a) T51 and R5 are marked superseded by the owner's waiver, citing Story v6,
  with no new task; (b) the unmeasured, owner-accepted status is stated verbatim in the reconciliation report, the matrix and the
  PR "how verified" line, using the Story v6 sentence; (c) no new persistent record.
- **blocking: false.**

---

## Consistency check of the v6 revision (waiver; OD-26 to OD-32 raised)

- **Story v6 vs this log.** Story v6 changes only the acceptance status of AC-11 and AC-12 and the stale "Touches FROZEN files?"
  sentence; AC-1 to AC-10, Scope (other rows), Out of scope and the Q entries are untouched. The FROZEN row now matches the
  approvals recorded in OD-12 (2026-10-18T15:24:23Z for three files, 2026-10-19 for the withdrawal hunks), so the v5 "Story
  discrepancy" note is closed by the Story; OD-25 (scope and lifetime of the 2026-10-19 instruction) is not touched by it.
- **Recorded resolutions.** No resolution of any earlier Open Decision was changed or removed. OD-10, OD-11 and OD-14 gained a v6
  status line marking only their live-run parts MOOT-BY-WAIVER; all v1 to v5 text is intact. OD-6, OD-13, OD-15 are unedited (their
  live-run relevance is noted in the v6 revision note only).
- **Source discipline.** Every v6 status change cites the Waiver decision (Story v6 "Amendment" and `history.jsonl` 14:50:23Z). The
  owner's manual-testing statement (14:42:16Z) is cited as context, not as an answer to any part of OD-10, OD-11 or OD-14, and is
  not treated as evidence: nothing was measured.
- **Spec v7 (APPROVED), matrix v4 and reconciliation v3 vs Story v6.** FR-34 and FR-35 are written as hard live-run requirements,
  the matrix AC-11 / AC-12 rows read green / built (guard) with no test, and reconciliation v3 is BLOCKED on exactly these rows; all
  are stale against Story v6 (the Story says so). That is the pipeline's consequence, resolved through OD-26, OD-27, not an
  additional Open Decision. The impact analysis, plan, task breakdown (T51, R5), test strategy and the implementation, gate,
  verification and security reports are otherwise unaffected in substance: the waiver changes no code and no prompt text.
- **Checked unchanged this run.** `STORE_REGISTRY` has the same seven keys; `bash arch-guard.sh` read-only: all checks passed; no
  store, locale or currency was added by the waiver.
- **Timestamp (non-blocking).** The system clock read 2026-10-19T14:53Z; the last history event is 14:51:35Z; this revision uses
  14:55:00Z so artifact times stay monotonic.

---

## Consistency check of the v5 revision (withdrawal; no further Open Decision raised)

- **Story v5 vs this log.** Story v5 AC-9 is a withdrawal stub, the Scope Surface row excludes the Generator input form,
  `ProductInput`, `numericFidelitySources` and the `STRICT INPUT SCOPE` text, Out of scope bars any new Generator input field, and
  Resolved decisions Q1 is "withdrawn with the fields". All of this agrees with marking OD-1, OD-2, OD-16, OD-17, OD-19 and OD-20
  (1)(2) moot. OD-1 was not on the caller's list; it is marked because Story v5 itself says Q1 was withdrawn with the fields and
  OD-1 is the question behind Q1.
- **Story v5 discrepancy (reported, not corrected; the Story is not edited by this stage).** The Scope row "Touches FROZEN files?"
  still says "No per-file approval has been given; the Story defers the explicit approval to the plan gate". The history records
  by-name approvals on 2026-10-18T15:24:23Z (three files) and 2026-10-19T07:50:00Z (two files). The statement is stale; it does not
  change any requirement.
- **Spec v6 draft vs this log.** Spec v6 (DRAFT) marks OD-2, OD-16, OD-17, OD-19, OD-20 (1)(2) moot and OD-12 given for two files;
  this agrees. Its sentence that the master "returns to its pre-US-9.1 text" is the proposal recorded as OD-21's default.
- **Stale downstream artifacts.** Everything produced against Story v4 / Spec v5 (impact analysis, plan, task breakdown, test
  artifacts, implementation / gate / verification / security / reconciliation reports) is stale against Story v5. Not an Open
  Decision; the orchestrator re-runs those stages. The security review findings N-1 to N-3 concerned the withdrawn notes.
- **Timestamp (non-blocking).** The system clock read 2026-10-19T07:28Z at this run, earlier than the last history event
  (08:05:00Z); this revision uses 08:10:00Z so artifact times stay monotonic.

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
