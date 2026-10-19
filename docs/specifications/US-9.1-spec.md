---
artifact: specification
story: US-9.1
version: 8
status: ARCHIVED
owner: so-spec-writer
created_at: 2026-10-17T15:31:09Z
updated_at: 2026-10-19T15:00:24Z
supersedes: docs/specifications/US-9.1-spec.md#7
inputs_consumed:
  - key: story
    version: 6
  - key: clarification_report
    version: 6
  - key: open_decisions
    version: 6
open_decisions_blocking: false
---

# Specification: US-9.1 — No picture references and livelier descriptions (Creality Pika regression)

## Summary

A generated description states product facts directly and never refers to the picture or to the page layout: not in the
paragraph above a figure, not in a `<figcaption>`, not in an `alt`, in any output language. The uk-UA text gains rhythm,
contrast and a buyer-task opening without gaining emotion and without gaining facts that are not in the input. A
deterministic detector reports picture references as warnings, and a measurement script (AC-10) is delivered. The live runs on
three products that were to evidence the result (the AC-11 and AC-12 hard script criteria) are WAIVED by the owner on manual testing
(Story v6, 2026-10-19) and are not measured (PROPOSED DEFAULT wording, OD-26 to OD-32; FR-34, FR-35). The four optional operator-note Generator fields that earlier revisions specified are withdrawn
(Story v5, owner decision of 2026-10-19): this Story adds no Generator input, no `ProductInput` property and no input block,
and its net change leaves the master's input-scope text as it was before the Story (PROPOSED DEFAULTS, FR-42 to FR-44, NFR-13 to NFR-15: a plain
`/so:approve` would accept them as written unless the owner answers OD-21 to OD-25 in the approval comment; see the v7 revision note).
The waiver wording of FR-34 and FR-35 is likewise a PROPOSED DEFAULT (OD-26 to OD-32): a plain `/so:approve` would accept it unless
the owner answers OD-21 to OD-32 in the approval comment (see the v8 revision note).

## Revision note (v8 against v7)

This is revision 8, made after the owner's waiver decision of 2026-10-19 recorded in Story v6 "Amendment" and in
`docs/workflow/history.jsonl` (`ts` 2026-10-19T14:50:23Z, actor sbruhov@gmail.com), verbatim: "Waive the AC-11/AC-12 hard script
criteria for US-9.1; accepted on my manual testing" (owner context, `ts` 2026-10-19T14:42:16Z: "Це дуже важко. Я зробив простіше.
Було проведено тестування генерації товарів. Все працює так як треба."). v7 was `APPROVED`; Story v6 states that the v7 approval
does not cover this change, so v8 is a `DRAFT` and passes SPEC_REVIEW and HUMAN_SPEC_APPROVAL again. v7 is `SUPERSEDED` by this file
at the same path. **FR numbers are stable: nothing is added, removed or renumbered.** Everything not listed below is unchanged from
v7. This Specification records the owner's waiver and decides nothing beyond it, and it resolves no Open Decision. **Nothing was
measured:** no `tools/measure-description.ts` output, no product list and no run count exists; the headline outcome (0 picture
references, 0 invented numbers) is accepted on the owner's word, not on script evidence.

**PROPOSED DEFAULTS that a plain `/so:approve` would accept.** The wording of the waiver in FR-34, FR-35 and the traceability rows is
the set of PROPOSED DEFAULTS of OD-26 to OD-32 (Open Decisions v6): OD-26 (what FR-34 and FR-35 say for a waived criterion) -> FR-34,
FR-35, trace rows; OD-27 (matrix rows and RECONCILIATION treatment of a WAIVED row) and OD-29 (what the waiver covers, whether it
lapses) and OD-32 (disclosure downstream) -> the waiver record in FR-34; OD-28 (soft and manual items of AC-12) -> FR-35; OD-30 (the
script stays unchanged) -> FR-32 and FR-33 are not touched; OD-31 (the AC-8 residual) -> note G is not touched. They are this
Specification's proposals, not owner decisions, and all seven stay open in the log. A plain `/so:approve` accepts them as written
unless the owner answers OD-21 to OD-32 in the approval comment (OD-21 to OD-25 are unchanged from v7: FR-42 to FR-44 and NFR-13 to
NFR-15 keep their PROPOSED DEFAULTS and their text). To change one, the owner answers the OD; only the labelled value then changes.

| Change in v8 | Requirement touched | Source |
|---|---|---|
| FR-34 and FR-35: the criterion text is retained unchanged and marked WAIVED (owner, Story v6; not measured); the run rules, failure path and coverage note become the procedure that applies only if the runs are ever performed; the OD-11 answers of 2026-10-18 are kept as history | FR-34, FR-35 | Story v6; OD-26 (a) with the meaning of (b) |
| FR-35: only the hard script criterion is waived; the soft items stay non-blocking and are recorded as not evidenced; the manual fact review is recorded as covered by the owner's statement, not as evidence | FR-35 | OD-28 (b) |
| Waiver record added to FR-34: the waiver covers the delivery as committed at the time of the decision; a later change to a prompt-bearing file of this Story needs the owner to restate it; a later failing run is reported and does not by itself void it; downstream records state "WAIVED (owner, Story v6, 2026-10-19; not measured)" and never "passed" or "measured" | FR-34 | OD-27, OD-29, OD-32 |
| Open-questions table: OD-11 moot-by-waiver; the live-run parts of OD-10 and OD-14 moot-by-waiver; OD-6 observation; OD-26 to OD-32 rows added; the OD-21 to OD-25 rows are unchanged; note J added; notes D, E, H, I and the Open-questions lead-in follow | Open questions | Open Decisions v6 |
| Traceability rows AC-10, AC-11, AC-12 rewritten: AC-11 and AC-12 are WAIVED and unmeasured, traced to FR-34 and FR-35 as retained criterion text; AC-10 stays in scope | Traceability matrix | Story v6; OD-26, OD-27, OD-30 |
| "Live-run" wording that implied the runs will happen made conditional or marked WAIVED: Summary, Background, Scope (Stores, Locales), the cross-references in the FR-1 failure path, the FR-5 coverage note, the FR-20 failure path and the FR-21 guidance, Out of scope | Summary, Background, Scope, FR-1, FR-5, FR-20, FR-21, Out of scope | Story v6 |
| Stale "no per-file approval has been given" wording removed from the Scope FROZEN row and from note I (Story v6 corrected its own row). The v7 note and the older notes are history in their own voice and are not edited | Scope (FROZEN row), note I | Story v6 |
| Front matter: `inputs_consumed` brought to story 6, clarification_report 6, open_decisions 6; the downstream artifacts v7 listed (specification_review, impact_analysis, plan_review, implementation_plan) are no longer listed because this revision did not read them; they are stale against Story v6 and are the orchestrator's to re-run | front matter | `artifact-schema.md` |

Not changed: FR-1 to FR-23 requirement text (only the cross-references named above), FR-27, FR-32 and FR-33 (the script and AC-10),
FR-36 to FR-39, FR-42 to FR-44, NFR-1 to NFR-15, note G (the AC-8 residual, OD-31 default: unchanged) and OD-15. No store, locale or
currency is added: the Scope still names all seven `STORE_REGISTRY` keys.

**Validation against the Story v6 AC list.** AC-1 (FR-1 to FR-4), AC-2 (FR-5 to FR-9), AC-3 (FR-10 to FR-14, FR-27, FR-36, FR-37),
AC-4 (FR-15), AC-5 (FR-16), AC-6 (FR-17), AC-7 (FR-18, FR-19), AC-8 (FR-20 to FR-23), AC-9 (withdrawn in Story v5; exclusions
testable by FR-42 to FR-44), AC-10 (FR-32, FR-33), AC-11 (FR-34, FR-36; WAIVED) and AC-12 (FR-35; hard criterion WAIVED) each have a
row; every FR traces to an AC except the preserve-only and process requirements the matrix footer lists. Story v6 changes the
acceptance status of AC-11 and AC-12 only; AC-1 to AC-10 text is as in Story v5.

## Revision note (v7 against v6)

This is revision 7, a loop-back revision (attempt 1 of 3) after SPEC_REVIEW v6 returned `CHANGES_REQUIRED` with blocker **B1**
(`docs/reviews/specifications/US-9.1-spec-review.md`). v6 was a `DRAFT` and was never approved; v7 is a `DRAFT` and passes
SPEC_REVIEW and HUMAN_SPEC_APPROVAL. v6 is `SUPERSEDED` by this file at the same path. **FR numbers are stable: nothing is
added, removed or renumbered.** Everything not listed below is unchanged from v6. This Specification resolves no Open Decision.

**PROPOSED DEFAULTS that a plain `/so:approve` would accept.** FR-42, FR-43, FR-44 and NFR-13, NFR-14, NFR-15 are PROPOSED
DEFAULTS of OD-21 to OD-25 (OD-21 -> FR-42; OD-22 -> FR-43; OD-23 (c) and OD-24 -> FR-44; OD-23 -> NFR-13; OD-24 -> NFR-14;
OD-25 -> NFR-15). They are the Specification's proposals, not owner decisions, and all five Open Decisions stay open in the log.
Approving this Specification without an answer would accept the labelled values as the approved requirement text (Conventions:
"requires the human's confirmation or change at HUMAN_SPEC_APPROVAL"). To change one, the owner answers the OD in the approval
comment; only the labelled value then changes. Each of the six headings or lead labels now says so.

| Change in v7 | Requirement touched | Source (review v6) |
|---|---|---|
| FR-44 item 4 split in two checks with their own input and expected outcome: (a) a stray `operatorNotes` value holding a number that appears nowhere else in specs, description or name does NOT ground that number (the gate reports `alt-numeric-not-grounded` for it); (b) a stray `operatorNotes` value with no `supplementalContent` triggers no FAQ request. The existing `main` specs the FAQ half relies on are named | FR-44 item 4 | B1 |
| FR-44 item 5: observable behaviour of `tools/measure-description.ts` for the removed `--notes-*` options stated: they are not accepted; an unknown option exits non-zero with the usage text. **PROPOSED DEFAULT** of this Specification (neither the Story nor Open Decisions state it) | FR-44 item 5 | B1 |
| The nine withdrawn stubs gain a carve-out so that "nothing may be built or tested for it" does not forbid the absence pins of FR-42 and FR-44 or the test removals of NFR-14; FR-44's intro follows | FR-24 to FR-26, FR-28 to FR-31, FR-40, FR-41; FR-44 | N3 |
| FROZEN-approval wording aligned: the three FR-11 hunks of `task-a.ts` are already committed under owner-approved grants (`87fb3c0`, `7c8fae9`, `266cd9c`) and are no longer called an approval request text or "VERBATIM once approved"; the "OD-12 point 1" citations (moot in Open Decisions v5) are replaced by OD-25; the OD-12 row points at OD-25 | FR-11, FR-27, NFR-15, OD table | N2 |
| The PROPOSED DEFAULT status of FR-42 to FR-44 and NFR-13 to NFR-15 made unmistakable (heading or lead label, one sentence each, the Conventions paragraph, note I) | FR-42 to FR-44, NFR-13 to NFR-15, Conventions, note I | N1 |
| "`main`" as a moving reference replaced by the merge base `120dcbc` (the commit at which the branch started, as FR-27 pins it) | FR-42, FR-44 item 4, NFR-13, Scope ("Other files") | N5 |

Not changed, because the review marks them non-blocking and they are not this revision's brief: the scope-creep caveat on FR-44
item 3 and NFR-13 to NFR-15 (N1: they stay as labelled proposals), the repeated "(if OD-21/OD-22 are accepted as proposed)"
clause (N4), the owner events of 2026-10-18 on OD-10, OD-11 and OD-13 (N6), and the removal inventory outside the FROZEN files
(`src/prompts/operator-notes.ts`, `src/utils/description-metrics.ts`; N7), which the plan finds. Story v5's stale sentence "No
per-file approval has been given" is the owner's to correct at the Story's next amendment.

## Revision note (v6 against v5)

This is revision 6, made after the owner's decision of 2026-10-19 (Story v5): the four operator-note fields (usage scenarios,
test results, comparison with the previous generation, limitations) are not needed and the feature is withdrawn. v5 was
`APPROVED`; v6 changes the requirement set, so it is a `DRAFT` and passes SPEC_REVIEW and HUMAN_SPEC_APPROVAL again. v5 is
`SUPERSEDED` by this file at the same path. **FR numbers are stable: nothing is renumbered.** Everything not listed below is
unchanged from v5. This Specification records the owner's decision and made none of it. The older revision notes below are kept
as history in their own version's voice.

**Validation pass on the pre-written v6 draft (same version number; no review had seen the draft).** The draft was written by
the assistant on the owner's instruction and was then checked against the so-spec-writer contract, Story v5, Clarification v5 and
Open Decisions v5. The corrections are in the second table below. In particular: the draft's sentence that the master "returns to
its pre-US-9.1 text" was presented as settled, but it is the PROPOSED DEFAULT of the new, still open OD-21, and is now labelled so.

| Change in v6 | Requirement touched | Source |
|---|---|---|
| Operator-note textareas, `ProductInput.operatorNotes`, the `[Operator Notes]` block, the FAQ guard, the `STRICT INPUT SCOPE` extension, the `numericFidelitySources` extension, history persistence and restore, the reach rule and "Clear All" are withdrawn | FR-24, FR-25, FR-26, FR-28, FR-29, FR-30, FR-31, FR-40, FR-41 (stubs); NFR-11; AC-9 row | Story v5 (AC-9 withdrawn) |
| The byte-identical `userContent` golden stays, reworded: Tier A / Tier B around the FR-11 spans only; no `operatorNotes`, no form side | FR-27 | Story v5; OD-18 unchanged |
| `[SOURCE FIDELITY]` in the master: the bullets `STRICT INPUT SCOPE` and `INTERNAL RECONCILIATION` ("three input blocks") return to the text they had before the Story **as a PROPOSED DEFAULT (OD-21), not an owner decision**; the FR-5 to FR-9 and FR-20 edits stay | master-system-prompt.ts; FR-42 | FR-29 withdrawn; OD-21 |
| D-10: the script's optional input texts are the specs and the product name; the notes are dropped | FR-32 (D-10) | FR-24 – FR-31 withdrawn |
| FROZEN files: the owner's by-name instruction of 2026-10-19 for `task-a.ts` and `master-system-prompt.ts` is recorded; **its scope is the open OD-25**; OD-12 updated; OD-1, OD-2, OD-16, OD-17, OD-19 moot, OD-20 (1)(2) moot | Scope, OD-12, Open questions | Owner instruction of 2026-10-19 |

Corrections made in the validation pass (all other text of the draft was kept):

| Correction | Where | Why |
|---|---|---|
| Front matter `inputs_consumed` brought current: story 5, clarification_report 5, open_decisions 5, specification_review 5, impact_analysis 4, plan_review 3, implementation_plan 4 (the versions on disk; the last four were produced against Story v4 and are stale against Story v5, which is the orchestrator's to re-run) | front matter | Clarification v5 and Open Decisions v5 exist |
| Live (non-withdrawn) mentions of the four fields removed from the Summary, Background, Conventions and NFR-4; the Scope and FROZEN rows no longer say "no approval has been given" next to a recorded approval; NFR-10 aligned with the OD-12 row | Summary, Background, Conventions, Scope, NFR-4, NFR-10 | Contradictions with Story v5 / OD v5 |
| FR-27 gains the statement that no input of the golden set carries an operator-notes property or text, and a cross-reference to FR-43 for how the golden is regenerated; FR-27 added to the AC-3 trace row | FR-27, trace | The matrix text said FR-27 traces to AC-3 but the AC-3 row did not list it |
| FR-21 no longer says `STRICT INPUT SCOPE` is "unchanged" without a reference; it points at FR-42 | FR-21 | The branch text of that bullet differs from `main` until FR-42 is implemented |
| FR-29 stub: the consequence paragraph is relabelled as the OD-21 PROPOSED DEFAULT | FR-29 | It was stated as settled |
| New **FR-42 to FR-44** and **NFR-13 to NFR-15** appended for OD-21 to OD-25, each a PROPOSED DEFAULT (never an owner decision); OD rows OD-1, OD-21 to OD-25, note I and the open owner questions added; Out of scope extended; AC-9 trace row rewritten | FR-42 to FR-44, NFR-13 to NFR-15, Open questions, Out of scope, trace | Open Decisions v5 raised OD-21 to OD-25 (non-blocking) |

## Revision note (v5 against v4)

This is revision 5 of the Specification, a loop-back revision (attempt 1 of 3) after the owner's answers given with
`/so:approve` at HUMAN_PLAN_APPROVAL on 2026-10-18 (the last event of `docs/workflow/history.jsonl`, `ts` 2026-10-18T10:08:01Z,
sbruhov@gmail.com; the plan gate itself was **not** approved). The answers that close Open Decisions are recorded as
resolutions in `docs/decisions/US-9.1-open-decisions.md` v4; the plan-level answers (Q-SCOPE, Q-CLEARALL, Q1, Q-TRANS, Q-OPT) are
recorded there in "Plan-level answers" and are not Open Decisions. v4 had been reviewed (SPEC_REVIEW v4) and was `APPROVED`; v5
changes an approved literal (Q-SCOPE) and adds a requirement (Q-CLEARALL), so v5 is a `DRAFT` and passes SPEC_REVIEW and
HUMAN_SPEC_APPROVAL again. v4 is `SUPERSEDED` by this file at the same path. **FR numbers are stable: one requirement is added,
FR-41, appended at the end; nothing is renumbered. Everything not listed below is unchanged from v4.** This Specification records
the owner's answers and made none of them. The older revision notes below are kept as history in their own version's voice
("this file" in them means that version).

| Change in v5 | Requirement touched | Source |
|---|---|---|
| The FR-20 self-scoping sentence literal becomes `These rules govern writing a new description; when the task is to translate an existing text they do not apply, and the source's sentences and their order are kept.` The word "headings" is dropped (the v4 PROPOSED DEFAULT read "...the source's sentences, headings and order are kept"; that old literal is quoted here only as the superseded text). The three Assert-present strings, the illustrative block, note E and the AC-8 traceability row follow. **Confirmed by owner, 2026-10-18.** | FR-20, Open questions note E, AC-8 row | Q-SCOPE; plan-review N10 ("FR-20 wording governs") |
| New requirement: "Clear All" resets the four operator-note textareas in the Generator and in the UA Description mode | **FR-41** (new, appended); AC-9 row | Q-CLEARALL (plan-review N3: no FR had asked for it) |
| OD-2 R1 (restored notes are resent on the next click) and R2 (restoring an entry with no notes empties the textareas) confirmed | FR-31 (items 4, 5), FR-24 | OD-2 v4 ("defaults R1 and R2") |
| OD-19: the Doc instructions do not mention `[Operator Notes]`; Expert-3DPrinter does receive and render the notes | FR-26, FR-40, Scope (Locales) | OD-19 v4 ("(1b) no, (2) yes") |
| OD-20: `NUMERIC_SOURCE_FIDELITY_RULES` text not extended; `supplementalContent` not added to `numericFidelitySources`; script input set is D-10 | FR-30, FR-29 (cross-reference), FR-32 (D-10) | OD-20 v4; OD-10 v4 (D-10 half of part (4)) |
| OD-7, OD-8, OD-14, OD-18 accepted as built; their PROPOSED DEFAULT labels become "confirmed by owner, 2026-10-18" | FR-16, FR-17, FR-32 (D-1, D-2), FR-34, FR-35, FR-27 | "Q-OD7/8/9/14/18: accept as built" |
| OD-9: accepted as built, with the owner's condition (verify Node >= 22.18, else the D12 launcher) | FR-32 (execution), Out of scope | OD-9 v4 |
| OD-11 partly resolved: three products x 2 runs, every run must pass the hard criteria, the runs include a non-marker run, evidence = script output, a failure is reported and not auto-iterated. Residue stays open | FR-34, FR-35, FR-5 (coverage note), note H | OD-11 v4 |
| Plan-gate answers Q1, Q-TRANS, Q-OPT recorded where this Specification said the choice was the human's at the plan gate (no requirement changes) | FR-23, notes F, G | Plan-level answers (Open Decisions v4) |
| OD-12: the owner's order of the three FROZEN edits recorded as **intent only** | NFR-10, Open questions table | OD-12 v4 |
| Hygiene: the stale prose of the v4 note ("v4 is a `DRAFT` again") corrected; Open-questions header version and the front-matter input versions brought current | v4 revision note; Open questions; front matter | Plan-review N12, N20 |

**Still explicitly open (not answered by any owner decision, carried from Open Decisions v4):** OD-10 D-3 to D-5, D-7 and the D-9
half of part (4) (PROPOSED DEFAULTS stay labelled); the OD-11 residue (which Center 3D Print and 3DDevice products; who runs the
live runs); OD-12 (**no FROZEN-file approval has been given or is claimed**; the per-file "modify <filename>" instruction is
still to be given in the editing session); OD-13 (rest); OD-15; and the FR-29 tree-search note on other block-counting places
(Open Decisions v4 says the OD-20 answer neither confirms nor changes it).

## Revision note (v4 against v3; history)

This is revision 4 of the Specification, a loop-back revision (attempt 1 of 3) after PLAN_REVIEW v1 returned
`CHANGES_REQUIRED` with blocker **B1** (`docs/reviews/plans/US-9.1-plan-review.md`): Story AC-8's last sentence and FR-23 said
the translation prompts are "byte-identical to the pre-Story commit" with "no liveliness rules", while FR-5 and FR-20 require
the new blocks in the master system prompt, and `src/prompts/task-c.ts` (`pack()`, line 89) and `src/prompts/optimizer.ts`
(`buildOptimizerPrompt`, line 124) embed that same master as `systemBlocks[0]`. v3 was approved at HUMAN_SPEC_APPROVAL; v4 was a
`DRAFT` when written, was reviewed (SPEC_REVIEW v4) and then approved again (`APPROVED`) before PLAN_REVIEW; v5 supersedes it. The human owner decided B1 (recorded in
`docs/workflow/history.jsonl`, event "Owner decision on plan-review blocker B1", and in Story v4 "Amendment" v4): AC-8 is
stated at **file level**. **Only what B1 requires changed. FR numbers are stable (no FR added, none renumbered). Everything the
owner confirmed in v3 stays verbatim.** The previous revision (v3, `APPROVED`) is `SUPERSEDED` by this file at the same
path; its own revision note is kept below as history.

| Change in v4 | Requirement touched | Why (plan-review item) |
|---|---|---|
| FR-23 restated at file level and at payload level: `task-c.ts` / `task-translate.ts` not edited (arch-guard checksums unchanged); Task C description translation (96 cases) and the optimizer inherit the new master through block 0; block 1 and `userContent` unchanged; Task C FAQ variant and `buildTranslatePrompt` unchanged at payload level; Q1 left open | FR-23; AC-8 row of the traceability matrix | B1, verdict item 1 |
| Scope (Locales) rewritten on the same basis (the v3 sentence "the translation prompts ... are not changed, so a clean uk-UA master is what the other locales inherit" rested on the false premise); Scope "Not touched" and FROZEN rows given the matching clause | Scope | B1, verdict item 1 |
| NFR-9: the list of tests that change now names `src/prompts/task-c.description-bytes.spec.ts` (fails by design at block 0 on 96 cases) and the other consumers of impact v2 (`task-c.spec.ts`, `task-c.faq.spec.ts`, `protected-name-precedence.spec.ts`, the `faq-pipeline.ts` slices, `image-figure-style.prompt-examples.spec.ts`, `optimizer.spec.ts`, `full-description.golden.spec.ts` and its `c/*` cases); NFR-1 notes the cache effect on Task C and the optimizer | NFR-9, NFR-1 | B1, verdict item 1 |
| The self-scoping sentence is a requirement with Assert-present strings (the owner decided it exists; the literal is a **PROPOSED DEFAULT** for human confirmation) | FR-20 | B1, verdict item 2; owner decision |
| Coverage statement for model-authored figcaptions and `alt` (FR-5 alone; FR-1/FR-2 reach only marker-built figures); AC-11 unchanged | FR-5 (new coverage note), FR-34 (cross-reference), AC-11 row | Verdict item 3; impact R4 (Open questions, note H) |
| Declared residual risk (translator sentence drift inside `<p>`) and the optimizer's own instruction recorded as an open note; R1a / R7a (Q-TRANS / Q-OPT) **not resolved** | Open questions, note G | N9; verdict item 2 |
| Plan question **Q1** (a: reviewed digest update of the Task C guard; b: amended guard) left as an explicit open item for the plan gate; **not decided here** | FR-23, Open questions, note F | Owner decision: Q1 stays with the humans |

No Open Decision is resolved or reopened by v4. No FROZEN-file approval is claimed: the frozen master edit that creates the
Task C and optimizer consequence is still subject to the per-file §9 stop (OD-12).

## Revision note (v3 against v2)

This is revision 3 of the Specification. It incorporates the human owner's HUMAN_SPEC_APPROVAL decisions (decided by
sbruhov@gmail.com on 2026-10-17; verbatim in `docs/workflow/workflow-state.yaml` `pending_human_gate.comment`, recorded as
resolutions in Open Decisions v3 and, for AC-12, in Story v3 "Amendment" v3). The gate itself is **not approved yet**: these
decisions change Story AC-12 and Specification content, so they are applied first and a plain `/so:approve` on this
Specification is then needed. v2 was never committed to git (untracked) and is overwritten at the same path; its `status` is
`SUPERSEDED` by this file. **FR numbers are stable: one requirement was added (FR-40, appended) and nothing was renumbered.**
Every decision below is applied as the owner gave it; where the owner gave no wording, the requirement and a testable
assertion are stated and no final prose is invented. Where a decision leaves a residue, it is an explicit OPEN item (see "Open
questions"), not decided here. No FROZEN-file approval is claimed.

| Decision (owner, 2026-10-17) | OD closed by the owner | Changed in v3 |
|---|---|---|
| OD-16/OD-17: PROPOSED DEFAULTS confirmed as written (keys, empty rule, labels, order, `\n`, position) | OD-16, OD-17 | FR-25, FR-26 normative ("confirmed by owner, 2026-10-17"); AC-9 trace |
| OD-2(a): persist `operatorNotes` in history and restore into the four textareas | OD-2(a) | FR-31 (rewritten), FR-24, AC-9 trace. **Residue kept OPEN:** whether Generate / UA Description resends restored notes; an entry that has no `operatorNotes` |
| OD-2(b)(c): defaults confirmed | OD-2(b), OD-2(c) | FR-24 normative |
| OD-19: notes reach Task A (and Doc via the prefix) only; not SEO / slug / FAQ / specs grounding | OD-19 (1) mechanism, (3), (4) | FR-26, **new FR-40**, FR-38, FR-39, Scope. **Residue kept OPEN:** `TASK_A_DOC_INSTRUCTION` mention; Expert-3DPrinter plain-HTML path |
| OD-20(1): notes are a fact source; reword "three input blocks" to neutral | OD-20(1) | FR-29 (neutral-wording requirement and assertions). OD-20(2)(3) stay open |
| AC-12 per Story v3: soft = 3 items, 2 of 3, non-blocking; per-section short-sentence count reported, no threshold; D-6 unchanged | OD-10 part (2); OD-14 soft-target part | FR-32 (metric list, calibration table recomputed), FR-33, FR-35; AC-12 trace |
| OD-3: drop the 9-17 band and "at most two consecutive"; numbers only in `[SENTENCE LENGTH]`, which wins; keep the 6-word and particle limits | OD-3 | FR-20 |
| OD-4: HOOK governs only the `[use-case]` slot; INVARIANT START unchanged; SCENE is a statement, not a question, not for section 1 | OD-4 | FR-20, FR-35 |
| OD-5: functional wording for section-3 `<h2>` only; `<h3>` nominal; at most one colon or dash per heading; overlay line amended; "never bare noun" not used | OD-5 | FR-22 |
| OD-6: liveliness rules apply where section 3 exists; acceptance runs use Full description | OD-6 | FR-20, FR-34, FR-35, Scope |
| FR-7..FR-9 confirmed as normative | OD-13 (this part only) | FR-7, FR-8, FR-9 (hedging removed); Open questions note A closed |
| `buildVideoBlock` new span: pointer-free wording | (content instruction, not an OD) | FR-11 item 2 (new span replaced; FR-27 Tier B follows it) |
| FROZEN-file approvals: not given; per-file at the plan gate | none (OD-12 stays open) | Scope and NFR-10 unchanged |

Still open, because no decision answers them: OD-7, OD-8, OD-9, OD-11, OD-12, OD-13 (rest), OD-14 (the "35" counting rule, the
48-word hook), OD-15, OD-18, OD-10 parts (1)(3)(4), OD-19 residue, OD-20 (2)(3), OD-2 residue. Their PROPOSED DEFAULTS in this
Specification keep that status.

### Change log

- **v8 (2026-10-19, after the owner's waiver of the AC-11/AC-12 hard script criteria, Story v6):** FR-34 and FR-35 keep their criterion text and are marked WAIVED (owner, Story v6; not measured), PROPOSED DEFAULT wording of OD-26 to OD-32; waiver record added to FR-34; OD-11 and the live-run parts of OD-10 and OD-14 marked moot-by-waiver; OD-26 to OD-32 rows and note J added; AC-10, AC-11, AC-12 trace rows rewritten; "live-run" wording made conditional; stale "no approval given" wording removed from the Scope FROZEN row and note I; front matter inputs brought current. No FR renumbered, no Open Decision resolved. See the v8 revision note.
- **v7 (2026-10-19, loop-back attempt 1 of 3 after SPEC_REVIEW v6 CHANGES_REQUIRED, blocker B1):** FR-44 items 4 and 5 given oracles that can fail (stray `operatorNotes` number not grounded; stray value triggers no FAQ; removed `--notes-*` options rejected as unknown, PROPOSED DEFAULT); carve-out added to the nine withdrawn stubs; FROZEN-approval wording aligned (FR-11, FR-27, OD-12 row -> OD-25); PROPOSED DEFAULT status of FR-42 to FR-44 and NFR-13 to NFR-15 made unmistakable; `main` replaced by the merge base `120dcbc`. No FR renumbered, no Open Decision resolved. See the v7 revision note.
- **v6 (2026-10-19, after the owner's decision to withdraw the operator-note fields, Story v5):** FR-24 – FR-26, FR-28 – FR-31, FR-40, FR-41 withdrawn; FR-27 reworded; NFR-11 withdrawn; Scope, FROZEN row, D-10, OD table and AC-9 trace updated. See the v6 revision note.
- **v6, validation pass (2026-10-19, same version, against Clarification v5 and Open Decisions v5):** front matter and live references corrected; FR-21, FR-27, FR-29 stub, NFR-4, NFR-10 aligned; FR-42 to FR-44 and NFR-13 to NFR-15 appended as PROPOSED DEFAULTS for OD-21 to OD-25; OD table, note I, open owner questions, Out of scope and the traceability matrix updated. No FR renumbered. See the second table of the v6 revision note.
- **v5 (2026-10-18, loop-back attempt 1 of 3 after the owner's plan-gate answers):** Q-SCOPE literal and Q-CLEARALL requirement
  (FR-41) applied; OD-2 R1/R2, OD-7, OD-8, OD-9, OD-14, OD-18, OD-19, OD-20, the D-10 part of OD-10 and the settled part of OD-11
  marked "confirmed by owner, 2026-10-18"; OD-12 intent recorded; stale prose and version hygiene fixed. See the v5 revision note.
- **v4 (2026-10-17, loop-back attempt 1 of 3 after PLAN_REVIEW v1 CHANGES_REQUIRED, blocker B1):** AC-8 / FR-23 restated at file
  level with the payload-level consequence; self-scoping sentence added to FR-20; coverage statement added to FR-5; NFR-9 and
  NFR-1 extended; Scope (Locales) rewritten; open notes F, G, H added (and the self-scoping literal added to note E). See the v4 revision note.
- **v3 (2026-10-17):** the revision as the v3 table above.
- **v2 (2026-10-17, loop-back attempt 1 of 3 after SPEC_REVIEW v1 CHANGES_REQUIRED):** added the Assertion convention (Assert
  present / Assert absent per prompt-wording requirement); concrete PROPOSED DEFAULTS for OD-16, OD-17, OD-2(b)(c), OD-8,
  OD-10, OD-14, OD-18; the FR-18 carrier table; removed the `alt` claim from FR-2; FR-27 two-tier "today's"; NFR-12; labelled
  illustrative blocks. Tree facts found then: a `<figure>` directly after a `</ul>` is forbidden in `TASK_A_INSTRUCTION` and no
  spec asserts that phrase by name (the byte goldens contain it), so FR-11 asserts it present; `IMAGE GROUNDING LOCK stands` is
  asserted for `NUMERIC_SOURCE_FIDELITY_RULES`, not for the master lock, and is not edited here.
- **v1 (2026-10-17):** first draft; never committed.

## Background

The operator reported a regression on Creality Pika (store EXPERT3D, uk-UA): the generated description
(`Knowledge/Issues/4/description_uk-UA.html`) carries 35 picture references (the paragraph above each of the 19 images, and
16 of 19 figcaptions; the counting rule is FR-34) and reads dry (81 sentences, mean 12.2 words, «тож» 7 times, a hook that
describes a photo). The operator's analysis (`Knowledge/Issues/4/prompt-changes.spec.md`, hereafter "the source analysis")
traces P1 to six independent prompt and utility sources and notes that the figcaption text is the Vision pre-pass
`description` copied unedited. The Story (v2) adopts that analysis as its requirements source; the corrected reference
output is `Knowledge/Issues/4/creality-pika-uk-v2.html`. Story v2 had moved four Generator fields to a new optional
`ProductInput.operatorNotes` (OD-1); Story v5 (2026-10-19) withdrew that feature, see the v6 revision note. Clarification (report v6) returned Ready for Specification with Open Decisions OD-1 to OD-32 recorded, all
non-blocking (OD-21 to OD-25 were raised by the withdrawal of the operator-note fields, OD-26 to OD-32 by the AC-11/AC-12 waiver of Story v6). At HUMAN_SPEC_APPROVAL on spec v2 the owner decided a set of Open Decisions and amended AC-12 (Story v3); this
revision (v3) applies them (see "Revision note"). Story v6 (2026-10-19) later waived the AC-11/AC-12 hard script criteria on the owner's manual testing; nothing was measured (see the v8 revision note).

`Knowledge/` is git-ignored (OD-13). The prompt text the source analysis proposes is therefore restated in this
Specification so the approved document is self-contained. Restated text is the *proposed wording from the source analysis*;
which parts of it are normative is stated per requirement (Assertion convention). It is not claimed to be reconciled with the
existing master-prompt rules where a conflict was recorded; the owner resolved those conflicts (OD-3, OD-4, OD-5, OD-6) and the
requirements below carry the resolutions, not the source analysis' original numbers.

## Conventions used in this Specification

**PROPOSED DEFAULT.** Where the Story left a value to the Specification (for example, in Story v2 to v4, AC-9: "Key names, label text and join order are left
to the Specification"; AC-9 is withdrawn in Story v5 and that case no longer arises) or where a requirement cannot be tested without one, this Specification **proposes** a concrete value
and labels it `PROPOSED DEFAULT (OD-n)`. Following the US-8.1 Specification's flagged-default precedent, a PROPOSED DEFAULT is
the Specification's proposal only. It requires the human's confirmation or change at HUMAN_SPEC_APPROVAL. **It does not
resolve the Open Decision it cites**: only the human closes an Open Decision, and every OD cited with a PROPOSED DEFAULT below remains open in the
Open Decisions log until then. (Exception: Open Decisions v4 records OD-7, OD-8, OD-9, OD-14, OD-18 and the D-10 part of OD-10 as
resolved by the owner on 2026-10-18 ("accept as built" and "script input set as D-10"); where such a default occurs below it is
marked "confirmed by owner, 2026-10-18" and cites the OD. Open Decisions v5 raises OD-21 to OD-25 with their own PROPOSED DEFAULTS; FR-42 to FR-44 and NFR-13 to NFR-15 state those defaults and are labelled `PROPOSED DEFAULT (OD-n)` throughout: they are not owner decisions and close nothing. Open Decisions v6 raises OD-26 to OD-32 with their own PROPOSED DEFAULTS; the waiver wording of FR-34 and FR-35 and the matching traceability rows state those defaults and are labelled `PROPOSED DEFAULT (OD-n)`: they are not owner decisions and close nothing either.) If the human changes a default, only the labelled value changes; the requirement's structure
and its tests do not. **A plain `/so:approve` with no answer accepts the labelled value as written** (it still does not close the Open Decision in the log): for FR-42, FR-43, FR-44 and NFR-13, NFR-14, NFR-15 that means OD-21 to OD-25 are ratified as proposed unless the owner answers them in the approval comment; for the waiver wording of FR-34 and FR-35 and the matching traceability rows it means OD-26 to OD-32 are ratified as proposed unless the owner answers them there.

**Confirmed by owner.** A value that carried a PROPOSED DEFAULT in v2 and was confirmed at HUMAN_SPEC_APPROVAL is now
normative and is marked `confirmed by owner, 2026-10-17 (OD-n)`, citing the resolution in Open Decisions v3. A PROPOSED
DEFAULT that no decision touched keeps its label and its status (still needs confirmation). **Wording composed from a
decision:** where the owner gave a decision but no prose (OD-3, OD-4, OD-5, OD-6, OD-20(1)), the requirement states the meaning
and the Assert-present / Assert-absent strings that test it; those literals are the Specification's testable rendering of the
decision, flagged `composed from OD-n`, not final prompt prose, and the plan may phrase the surrounding text freely as long as
every literal and the stated meaning hold.

**Assertion convention (prompt-wording requirements).** For every requirement that changes prompt or message text, the
requirement lists:

- **Assert present** — literal strings a test asserts are present in the named text;
- **Assert absent** — literal strings a test asserts are absent from the named text.

Comparison is case-sensitive, over the text with every run of whitespace (including line breaks) collapsed to one space on
both sides. Only the listed strings and the stated meaning are normative. The restated source-text blocks are
**ILLUSTRATIVE**: they show the intended wording, the plan may rephrase them, provided every Assert-present string is kept,
every Assert-absent string is gone, and the stated meaning holds. A block is normative verbatim only where the requirement
says **VERBATIM**. "Absent" applies only to the named text (for example the master system prompt or one message); the word
"lead-in" is **not** banned from the master prompt as a whole (it stays in the figcaption label `<b>LEAD-IN LABEL:</b>`, in
the IMAGE GROUNDING LOCK's other bullets and in AGENTS.md §4).

## Scope

| | |
|---|---|
| **Stores** | All of `STORE_REGISTRY`: `3DDevice`, `3DPrinter`, `3DScanner` (group UA), `Center 3D Print`, `Drukarka 3D` (group EU), `EXPERT3D` (group ES), `Expert-3DPrinter` (group US). Prompt-wording requirements apply to every store profile. The EXPERT3D-only additions (FR-22) apply to `EXPERT3D` alone (the profile that uses `EXPERT3D_TOV_BASE_OVERLAY`). The acceptance runs of FR-34 and FR-35 (`EXPERT3D` Creality Pika, `Center 3D Print` one product, `3DDevice` one product, a store with no ToV overlay; Full description template) are WAIVED by the owner (Story v6) and are not performed or measured, so no store is evidenced by a run (PROPOSED DEFAULT wording, OD-26 to OD-32). The liveliness rules apply wherever §3 exists (confirmed by owner, 2026-10-17, OD-6; FR-20); on a template that omits §3 there is nothing for SCENE or HONEST LIMITS to apply to. |
| **Locales** | uk-UA is the master that every other locale of the selected store is translated from. The picture-reference ban applies to every output language. A uk-UA change fans out to every other locale in the selected store's `languages` (`en-GB`, `ru-UA`, `pl-PL`, `de-DE`, `en-ES`, `es-ES`, `pt-PT`, `en-US`, `es-MX`, as the registry lists them per store): the translation **files** (`task-c.ts`, `task-translate.ts`) are not edited (arch-guard checksums unchanged), but at **payload level** the description-translation prompt of `task-c.ts` and the optimizer prompt embed the master as `systemBlocks[0]` and therefore receive the new master text, including `[NO PICTURE REFERENCES` and the shared liveliness block (owner decision on plan-review B1, 2026-10-17; FR-23). Their block 1 and `userContent` do not change; the Task C FAQ variant and `buildTranslatePrompt` (`task-translate.ts`) carry no master and do not change at all. The shared liveliness block states that its rules govern writing a new description and that a translation keeps the source's sentences (FR-20). A clean uk-UA master is what the other locales are translated from, and the detector (FR-16 to FR-19) is the check applied per language. Base languages for the detector are uk, ru, en, pl, de, es, pt, selected by the primary subtag of the locale (so `en-GB`, `en-ES`, `en-US` map to `en`; `es-ES`, `es-MX` to `es`). What verifies the ban in a non-uk-UA language beyond the warning is OD-15; with the AC-11/AC-12 live check waived (FR-34, FR-35), no live check of any output language is evidenced and the ban rests on the warning and on the owner's manual testing, and OD-15 itself is unchanged and open. A residual risk is declared, not resolved: a translator that adds, splits or drops a sentence inside a `<p>` is invisible to `validateStructuralParity` (Open questions, note G). |
| **Track** | prompt (per the Story). Tasks outside the prompt track (Angular form, orchestrator, new utility, script) get their per-task track in the task breakdown. |
| **FROZEN files (AGENTS.md §9)** | **Touched: three.** `src/prompts/task-a.ts` (FR-11 wording; and the removal of the withdrawn `[Operator Notes]` emission, NFR-15), `src/prompt-core/master-system-prompt.ts` (FR-5 to FR-9, FR-20; and the `[SOURCE FIDELITY]` revert, FR-42), `src/utils/output-validator.ts` (FR-13, FR-18). The §9 STOP applies to each: the exact change and its reason must be put to the user and each file approved by name ("modify [filename]") in the session that edits it. **By-name instructions are recorded in `docs/workflow/history.jsonl` (OD-12 v5):** for `output-validator.ts` on 2026-10-18 (its two hunks are committed) and, on 2026-10-19, "modify src/prompts/task-a.ts" and "modify src/prompt-core/master-system-prompt.ts" (the owner's words: "modify для task-a.ts та master-system-prompt.ts, шлях 1"). This Specification records those events and grants nothing. **What the 2026-10-19 instruction covers is the open OD-25; the PROPOSED DEFAULT is the withdrawal hunks only (NFR-15).** The hunks of these files that earlier grants covered are already committed; the §9 stop applies afresh to any hunk the instruction does not clearly cover. (Story v6 corrected its own Scope row to agree with these records, so the earlier discrepancy is closed.) After an approved change, `bash arch-guard.sh --rebaseline` and the `.arch-guard-checksums` commit follow in the same commit as the frozen-file edit. The `master-system-prompt.ts` edits reach block 0 of every Task C description-translation prompt and of the optimizer prompt (FR-23); the §9 request for that file names those consumers. |
| **Other files named by the Story** | `src/prompt-core/constants.ts`, `src/prompts/vision-prepass.ts`, `src/prompts/task-a-doc.ts`, `src/utils/video-manifest.ts`, `src/utils/image-placeholder.ts`, new `src/utils/image-deixis.ts`, `src/services/content-orchestrator.service.ts`, new `tools/measure-description.ts`. The Generator input form in `src/app`, `ProductInput`, `numericFidelitySources` and the `STRICT INPUT SCOPE` text are not changed by this Story relative to the merge base `120dcbc` (the commit at which the branch started; FR-27): the operator-notes edits that exist on the branch are removed (FR-44, NFR-13). Not touched (not edited): `runFaqPipeline`, `src/utils/faq-form.ts`, `task-b.ts`, `task-c.ts`, `task-translate.ts`, `optimizer.ts`. "Not edited" is a file-level statement: `task-c.ts` and `optimizer.ts` still send the edited master as block 0 (FR-23). |

## Functional requirements

Restated source-text blocks are illustrative unless a requirement says VERBATIM (see "Assertion convention"). Wording that is
Ukrainian inside a prompt block stays Ukrainian: it is prompt content.

### FR-1: Vision pre-pass `description` is about the product, never about the picture

The Vision pre-pass prompt instructs that the field `description` is one sentence stating the product capability, part or
result the image demonstrates, written about the product and never about the picture; that it never begins with and never
contains «На зображенні», «На фото», «На знімку», «На кадрі», «Зображено», «Показано», «Видно»; that it never names the
medium and never makes the medium the subject of a verb.

- **Assert present** (in the Vision pre-pass prompt): `never begins with and never contains`, `never makes it the subject of a verb`, and each of the seven quoted phrases `«На зображенні»`, `«На фото»`, `«На знімку»`, `«На кадрі»`, `«Зображено»`, `«Показано»`, `«Видно»`.
- **Assert absent**: `says what the image shows` (the current `description` line).
- The restated block below is illustrative.

Restated source text (replaces the `description` line of the UKRAINIAN FIELDS block):

```
- description: one sentence stating the product capability, part or result this image
  demonstrates, written about the PRODUCT, never about the picture. It never begins with and
  never contains «На зображенні», «На фото», «На знімку», «На кадрі», «Зображено», «Показано»,
  «Видно». It never names the medium (банер, колаж, схема, інфографіка, скриншот, кадр) and
  never makes it the subject of a verb («Колаж показує…», «Схема демонструє…»).
  Describe the content directly.
  GOOD: «Сенсорний екран запускає сканування й показує 3D-модель.»
  BAD:  «На фото сканер має вбудований екран, що показує зручність перегляду.»
```

**Failure path:** a Vision `description` that still contains a picture reference reaches the figcaption unedited
(`buildFigureParts` copies it). That case is reported as `image-caption-deixis` (FR-19) at `warning` level; it does not
block generation. Prompt wording cannot be proven by a unit test to change model output; the outcome criterion is FR-34 (retained text; WAIVED by the owner, Story v6, and not measured).

### FR-2: Vision pre-pass `alt` rule

The Vision pre-pass prompt instructs that `alt` is one sentence for a screen-reader user, different from `description` (not
a copy), starting with the subject noun and never with «Зображення», «Фото» or «Знімок», and written in one alphabet per
word (no Latin letters inside Ukrainian words).

- **Assert present**: `Start with the subject noun`, `«Зображення»`, `«Фото»`, `«Знімок»`, `one alphabet`.
- **Assert absent**: none (the existing `alt` sentence `It must be different from description, not a copy.` is kept).
- The restated block is illustrative.

Restated source text (replaces the `alt` line):

```
- alt: one sentence for a screen-reader user. It must be different from description, not a copy.
  Start with the subject noun, never with «Зображення», «Фото» or «Знімок». Write every word in
  one alphabet: no Latin letters inside Ukrainian words.
```

**Failure path:** an `alt` that carries a picture reference is reported by `collectFigureDeixis` (FR-17, `alt` carrier) and
counted by the measurement script (FR-32, FR-34). **No other function reports it**: `validateGeneratedHtml` does not emit a
rule for the `alt` carrier in this delivery (FR-18 carrier table). It does not block generation.

### FR-3: Vision pre-pass Grounding rules carry the no-inference sentence

The Grounding rules section of the Vision pre-pass prompt contains, exactly, the sentence
`State only what is visible; never infer operating modes, compatibility or requirements`.

- **Assert present** (VERBATIM): that sentence.

**Failure path:** n/a, no failure path — a static prompt sentence; its absence is a test failure.

### FR-4: Vision pre-pass phrases already pinned by existing tests are kept

After FR-1 to FR-3, the Vision pre-pass prompt still contains `one sentence`, `differ` and
`NUMBERS ARE THE HIGHEST-RISK ELEMENT` (**Assert present**, VERBATIM).

**Failure path:** removing any of the three fails the existing `vision-prepass` spec; that failure is not resolved by
weakening the existing assertion.

### FR-5: The master system prompt carries a `[NO PICTURE REFERENCES` rule

The master system prompt contains a block whose heading begins `[NO PICTURE REFERENCES`. Its text is defined as a constant
in `src/prompt-core/constants.ts` and interpolated into the master prompt **outside** the `[IMAGE HANDLING]` block (the
existing `master-system-prompt.image-markers` spec forbids `${…}` inside that block, and requires the block's existing
lines up to the `FIGURE FORMAT` line to remain). The rule covers body text, figcaption and `alt`, in all languages.

- **Assert present** (in `MASTER_SYSTEM_PROMPT`): `[NO PICTURE REFERENCES` (VERBATIM, heading prefix); within that block the words `figcaption` and `alt` and the phrases `«на зображенні»`, `«на фото»`, `«нижче»`, `deleted, not reworded`. A `constants.ts` export exists whose string value begins with `[NO PICTURE REFERENCES` and occurs in `MASTER_SYSTEM_PROMPT`.
- **Outside `[IMAGE HANDLING]`**: the existing `master-system-prompt.image-markers` spec passes unmodified, and the `[NO PICTURE REFERENCES` heading is not located between the `[IMAGE HANDLING]` heading and the end of that block as that spec delimits it.
- Constant name: the source analysis calls it `NO_IMAGE_DEIXIS_RULE`; the name is the plan's to confirm.
- The restated block is illustrative.

Restated source text:

```
[NO PICTURE REFERENCES — body, figcaption and alt, all languages]
No sentence in the body, in a figcaption or in an alt text refers to the picture or to the page
layout. Never write "on the image/photo/frame/diagram", "below/above" as a pointer, "as shown/seen",
"pictured", or their equivalents in the output language (uk: «на зображенні», «на фото», «на знімку»,
«на кадрі», «нижче», «вище», «як видно», «показано», «зображено», «видно на»). Never make the
picture, collage, banner, scheme or infographic the subject of a verb («колаж показує», «схема
демонструє»). State the product fact directly; the figure's position and its figcaption carry the
link to the image. A sentence whose only job is to point at the picture is deleted, not reworded.
```

**Coverage of model-authored figcaptions and `alt` (stated honestly; plan-review verdict item 3, impact R4; AC-11 is not
changed).** FR-1 and FR-2 reach only figures built from `[file.jpg]` markers: the Vision `description` and `alt` are consumed
in one place, `buildFigureParts` in `image-placeholder.ts`. A figure that Task A authors itself takes its figcaption and `alt`
from the model's reading of the master `FIGURE FORMAT` lines (which still read "short scannable description of what the image
shows"; no FR edits them and `image-figure-style.prompt-examples.spec.ts` pins that text) and of the manifest `caption` in
`userContent` (the Vision `caption`, or `altText`, or a filename seed; no FR edits it). For those figures **this requirement
(FR-5) is the only requirement that reaches the figcaption and the `alt`**; it is a prohibition in the cached master, written
for body, figcaption and `alt` in all languages. Its coverage is therefore partial in three respects, none of which this
Specification closes: (1) it is a prohibition standing next to an unedited positive instruction ("what the image shows"); (2)
a unit test can show only that the text is present, never that the model obeys it; (3) no warning flags a pointer-style
figcaption of a non-marker figure (`figureCaptionWarnings`, FR-19, sees marker-built figures only) and none flags an `alt`
(FR-18 carrier table), so only the measurement script counts them. AC-11's criterion text covers **every** figcaption and `alt`
(FR-34; the criterion is WAIVED by the owner, Story v6, and not measured), so FR-5 alone is the intended and the only prevention for model-authored ones, and whether it suffices is an
empirical question that no recorded run answers; the owner's answer of 2026-10-18 (OD-11) that the live runs would include a non-marker run is moot-by-waiver and kept as history (FR-34). Rewording the
`FIGURE FORMAT` line would be a new requirement and a change to a pinned spec; it is **not** specified here and stays a
decision for the human (Open questions, note H).

**Failure path:** if the constant were interpolated inside `[IMAGE HANDLING]`, the existing image-markers spec fails; the
placement is a requirement, not a preference.

### FR-6: The master prompt no longer teaches the pointing phrasing, and still requires a paragraph above every figure

- **Assert absent** (in `MASTER_SYSTEM_PROMPT`): `SUBSTANTIVE NARRATIVE SENTENCE`, `shown here`, `The image below shows` (VERBATIM, from AC-2).
- **Assert present**: `every <figure> in the document therefore has a narrative <p> directly above it` (the existing SPACING sentence, kept).

**Failure path:** n/a, no failure path — static text; either the three strings are absent and the requirement is present, or
a test fails.

### FR-7: PLACEMENT — "preceding paragraph" replaces "lead-in" in the master prompt

Inside the `[IMAGE HANDLING]` PLACEMENT instructions, the `LEAD-IN` bullet and the following "separate jobs" bullet are
replaced so that the paragraph above a figure is defined as ordinary body text stating a product fact, written as if the
image did not exist, with the figcaption carrying the link to the picture; the paragraph and the figcaption have separate jobs
and different phrasing. The existing `[IMAGE HANDLING]` lines above `FIGURE FORMAT` that the image-markers spec pins are not
altered; the replaced bullets are in the PLACEMENT part, outside the pinned span (the plan confirms this against that spec;
if they were inside it, the requirement stays and the plan raises it, the spec is not edited to pass).

- **Assert present** (in `MASTER_SYSTEM_PROMPT`): `PRECEDING PARAGRAPH`, `reads as if the image did not exist`, `the figcaption carries the link to the picture`, `see [NO PICTURE REFERENCES]`, `Give the paragraph and the figcaption separate jobs`.
- **Assert absent**: `LEAD-IN: precede every <figure>`, `visible here`, `Give lead-in and figcaption separate jobs`, `The image below shows` (the last also in FR-6).
- The restated block is illustrative. **The Assert-present and Assert-absent strings are normative: confirmed by owner,
  2026-10-17 (OD-13, FR-7..FR-9 confirmed as normative), not only the strings pinned by AC-2.**

Restated source text:

```
- PRECEDING PARAGRAPH: precede every <figure> with a <p> of ordinary body text from the same
  sub-section. It states a product fact (a spec, a mechanism, a benefit) and reads as if the image
  did not exist; the figure follows the paragraph that discusses its subject, and the figcaption
  carries the link to the picture. Stay within the IMAGE GROUNDING LOCK.
- That paragraph refers to the product, never to the picture: it contains no pointer to the image or
  the page layout (see [NO PICTURE REFERENCES]). A sentence whose only job is to point at the picture
  is deleted, not reworded.
- Give the paragraph and the figcaption separate jobs: the paragraph is narrative context in the flow,
  the figcaption is a short label — write them with different sentences and phrasing.
```

**Failure path:** a paragraph that duplicates the figcaption violates AGENTS.md §4 (see FR-36).

### FR-8: IMAGE GROUNDING LOCK restricts claims about the image, not product facts

The IMAGE GROUNDING LOCK gains a first bullet stating that the lock restricts claims *about the image* and does not
restrict product facts, and its example sentence changes from the "shown here" form to a plain product-fact form.

- **Assert present** (in `MASTER_SYSTEM_PROMPT`): `restricts claims ABOUT THE IMAGE`, `does not restrict product facts`.
- **Assert absent**: `the lead-in may reference the image only descriptively` (the head of the old example), and `shown here` (also FR-6).
- The restated block and the new example sentence are illustrative. **The Assert-present and Assert-absent strings are
  normative: confirmed by owner, 2026-10-17 (OD-13).**
- `IMAGE GROUNDING LOCK stands` is asserted by `constants.spec.ts` against `NUMERIC_SOURCE_FIDELITY_RULES`; that constant is not changed by this requirement.

Restated source text:

```
- The lock restricts claims ABOUT THE IMAGE (what it proves, compares, demonstrates). It does not
  restrict product facts: the paragraph above a figure MAY and SHOULD state any fact from
  [Technical Specs] / [Raw Description] that belongs to the figure's subject, written as ordinary
  prose that never mentions the picture.
```

and the example `the lead-in may reference the image only descriptively ("the head assembly shown here…")` becomes
`the paragraph may name the depicted object only as a plain product fact ("The unit has three round modules on its back.")`.

**Failure path:** n/a, no failure path. No acceptance criterion pins FR-8 beyond the removal of `shown here` (FR-6); it is a
requirement because the Story adopts the source analysis and the owner confirmed FR-7..FR-9 as normative (2026-10-17, OD-13).

### FR-9: `[VIDEO]` in the master prompt places the embed after a fact paragraph and never points at it

The `[VIDEO]` instruction `Introduce every embed with a lead-in <p>` is replaced so that every embed is placed directly
after a body paragraph of its sub-section, that paragraph states a product fact, and it never points at the video ("below",
«нижче»).

- **Assert present** (in `MASTER_SYSTEM_PROMPT`): `Place every embed directly after a body paragraph of its sub-section`, `never points at the video`.
- **Assert absent**: `Introduce every embed with a lead-in <p>`.
- **Assert present (existing, kept; pinned by `master-system-prompt.spec.ts`)**: `place it in §3 FUNCTIONALITY`, `before §7 TECHNICAL SPECIFICATIONS`, `MANDATORY WHEN PRESENT`.
- The Assert-present and Assert-absent strings are normative: confirmed by owner, 2026-10-17 (OD-13).
- Restated source text (illustrative): `Place every embed directly after a body paragraph of its sub-section; that paragraph states a product fact and never points at the video ("below", «нижче»).`
- The earlier sentence in the master (`one lead-in <p> + one <iframe>`, describing the contract) is not edited by this requirement.

**Failure path:** n/a, no failure path. Not pinned by an AC beyond the Story's intent in AC-2/AC-3 and Context; normative by
the owner's confirmation (OD-13, 2026-10-17).

### FR-10: Doc pipeline FIGURE PLACEMENT asks for a fact paragraph that does not point at the picture

The `task-a-doc.ts` FIGURE PLACEMENT instruction no longer asks for a paragraph "that introduces what the image shows". It
asks that every figure Block be immediately preceded by a paragraph Block of the same subsection that states a product fact
from the source and never refers to the picture, that a figure moved out of §2 carries that obligation (the paragraph is
placed beside it), and that the same holds for the figure's caption and alt.

- **Assert present** (in the `task-a-doc.ts` instruction text): `no orphan images` (existing, pinned by `task-a-doc.v4.spec`), `states a product fact from the source`, `never refers to the picture`, `The same holds for every figure's "caption" and "alt"`.
- **Assert absent**: `introduces what the image shows`, `place the lead-in paragraph beside it`.
- The restated block is illustrative.

Restated source text:

```
FIGURE PLACEMENT — no orphan images: every figure Block is immediately preceded by a paragraph
Block of the same subsection that states a product fact from the source and never refers to the
picture itself (no «на зображенні», «нижче», «показано», «колаж показує»). A figure moved out of §2
carries that obligation with it, so place that paragraph beside it in its new section rather than
leaving it behind. The same holds for every figure's "caption" and "alt".
```

**Failure path:** n/a, no failure path — static prompt text.

### FR-11: `task-a.ts` instruction, `buildVideoBlock` and `buildMarkerBlock` stop asking for an introducing lead-in

In `src/prompts/task-a.ts` (FROZEN — §9 STOP, see Scope; the three hunks below are already committed under owner-approved grants, item 1 in `87fb3c0`, item 2 in `7c8fae9`, item 3 in `266cd9c`, NFR-15; the stop applies afresh only to a later change of them). Three texts change; **only the last two are part of `userContent`**,
because `TASK_A_INSTRUCTION` is a cached system block:

1. `TASK_A_INSTRUCTION` (system block): the clause `: an image still needs its own lead-in <p>.` becomes a requirement that a
   figure needs a body `<p>` directly above it and that this `<p>` never refers to the picture.
   - **Assert present**: `a figure needs a body <p> directly above it, and that <p> never refers to the picture`; `Do not place a <figure> directly after a </ul>` (preserved; AC-3 requires it, and no existing spec asserts it, so this requirement does).
   - **Assert absent**: `an image still needs its own lead-in <p>`.
2. `buildVideoBlock` (a `userContent` text, present only when the description contains a video embed). The following old span is replaced by the new span.
   - **Old span** (assert absent from the new output): `Introduce each with its own lead-in <p> in the body language, and place it in §3 FUNCTIONALITY, before §7. The lead-in must not restate the figcaption.`
   - **New span — pointer-free wording per the owner's HUMAN_SPEC_APPROVAL instruction (2026-10-17: "use the pointer-free wording (no quoted "below"/"nizhche"; "written in the body language" attached to the paragraph)"). The sentence is composed by this Specification to satisfy that instruction (the source analysis elides the middle of this sentence); it changes only the lead-in-to-body-paragraph instruction, keeps the placement words `§3 FUNCTIONALITY, before §7` exactly as they are today, and is already committed in `7c8fae9` under an owner-approved grant (NFR-15); this Specification states its content and makes no new §9 request for it:** `Place each directly after a body paragraph of its sub-section, written in the body language, that states a product fact and does not refer to the video, and place it in §3 FUNCTIONALITY, before §7. That paragraph must not restate the figcaption.`
   - **Assert present**: the new span, VERBATIM (the text committed in `7c8fae9`); and, pinned today by `task-a.spec.ts` (line 215, `toContain('§3 FUNCTIONALITY')`), `§3 FUNCTIONALITY, before §7` intact in the `userContent` of a video input.
   - **Assert absent (inside the new span only)**: `"below"`, `«нижче»`, `нижче`, `below` — no quoted pointer word and no pointer word in the replaced sentences. The rest of the block keeps its two existing references to the manifest list (`every src below appears exactly once`, `the "source title" below`); they point at the manifest lines, not at a picture or the video, and are not edited.
   - **Assert present (attachment)**: the phrase `written in the body language` is attached to the paragraph (`a body paragraph of its sub-section, written in the body language`), not to the lead-in instruction.
3. `buildMarkerBlock` (a `userContent` text, present only when a marker is matched).
   - **Old span** (assert absent): `at the end of the sentence that introduces what the image shows;`
   - **New span** (source analysis wording): `at the end of the paragraph that states the product fact the image belongs to (the paragraph never mentions the picture);`
   - **Assert present**: the new span, VERBATIM (the text committed in `266cd9c`).

Nothing else in these three texts changes (in particular the sentence at `TASK_A_INSTRUCTION` line "keep every image's alt,
figcaption and lead-in consistent with its manifest caption", the `LISTS OVER RUN-ON SENTENCES` lead-in, and the
`(COMPARISON — … alt, figcaption and lead-in must preserve WHAT differs …)` manifest hint are consistency instructions, not
pointing wording, and are not changed).

**Failure path:** n/a, no failure path — static prompt text. The hunks are already committed (above); the consequence for FR-27 if they were refused or reverted is stated there (the scope of the 2026-10-19 instruction is the open OD-25).

### FR-12: C3D OVERRIDE #5 compares the opener to the paragraph above the figure

In the Center 3D Print override text in `constants.ts`:

- **Assert absent**: `The lead-in must still differ from the alt text and from the preceding lead-in <p>`.
- **Assert present**: `The opener must still differ from the alt text and from the paragraph above the figure`.

**Failure path:** n/a, no failure path.

### FR-13: Validator repair messages ask for a fact paragraph

In `src/utils/output-validator.ts` (FROZEN — §9 STOP, see Scope) the `image-manifest-missing` issue detail; and in
`src/utils/video-manifest.ts` (not on the §9 list; verified in the tree) the `video-embed-missing` issue detail.

- `image-manifest-missing` detail — **Assert absent**: `a substantive lead-in <p> directly above it`. **Assert present**: `a body <p> directly above it (a product fact that does not point at the picture)`; the filename-verbatim and never-adjacent-to-another-`<figure>` clauses are kept.
- `video-embed-missing` detail — **Assert absent**: `introduced by its own lead-in <p>`. **Assert present**: `placed after a body paragraph of its sub-section (no pointer to the video)`; the `src copied VERBATIM` clause and the `§3 FUNCTIONALITY — before §7 Technical Specifications` placement are kept.
- Both Assert-present strings are the source analysis' wording and are asserted VERBATIM once approved.

**Failure path:** the messages are what the repair cycle feeds back to the model; if they kept the old wording the repair
cycle would reintroduce the pointing phrasing (source analysis, S6).

### FR-14: Orchestrator warnings stop saying "lead-in"

The two `video-embed-restored` warning texts in `content-orchestrator.service.ts` (the occurrences whose context is `HTML (base)` and `HTML (uk-UA)`).

- **Assert absent** (in both): `sensible lead-in paragraph`.
- **Assert present** (in both): `sensible preceding paragraph`.

**Failure path:** n/a, no failure path.

### FR-15: Video lead-in templates contain no spatial pointer

No entry of `LEAD_IN_TEMPLATES` in `video-manifest.ts` contains, case-insensitively, any of «нижче», «below», «ниже»,
«poniżej», «unten», «abaixo» or «siguiente» (**Assert absent**, VERBATIM from AC-4, applied to the rendered output of each of
the seven templates for a sample product name). Every one of the seven base languages (uk, ru, en, pl, de, es, pt) keeps a
template whose rendered output contains the product name (**Assert present**: the product name), and the lookup by primary
subtag with English fallback keeps working. The restored-embed lead-in `<p>` that code inserts therefore points at nothing.

The templates below are an **ILLUSTRATIVE example** (the AC pins only the absence of the listed words); the plan may choose
other pointer-free sentences.

```ts
en: p => `See how ${p} works in practice.`,
uk: p => `Як ${p} працює на практиці.`,
ru: p => `Как ${p} работает на практике.`,
pl: p => `Zobacz, jak ${p} działa w praktyce.`,
de: p => `So arbeitet ${p} in der Praxis.`,
es: p => `Así funciona ${p} en la práctica.`,
pt: p => `Veja como ${p} funciona na prática.`,
```

**Failure path:** an unknown language falls back to the English template, which must also be pointer-free.

### FR-16: `findImageDeixis` detects picture references per base language

`findImageDeixis(text, locale)` returns a non-null match for a picture-reference phrase and `null` otherwise. It has a
pattern for each of the seven base languages of `STORE_REGISTRY` (uk, ru, en, pl, de, es, pt), chosen by the primary subtag
of `locale` (case-insensitive; `en-ES`, `en-US`, `en-GB` → `en`; `es-MX` → `es`). An unknown language returns `null`. The
behaviour for an omitted `locale` is the plan's (the Story does not require one).

For uk it returns a match for «Ряд із трьох круглих модулів ззаду показано на зображенні», «Три кадри показують…» and
«Нижче розміщено відео…», and `null` for «Режим працює від -10 °C» and «Сенсорний екран запускає сканування й показує
3D-модель». Every other base language has at least two positive and two negative cases in its tests.

The phrase lists for ru, en, pl, de, es, pt are **not supplied by the Story or the source analysis** ("ru and en by the same
principle"; no list for the rest) and native-speaker review is out of scope. **Confirmed by owner, 2026-10-18 (OD-7, "accept as
built"):** the ru, en, pl, de, es, pt phrase lists are accepted as the builder drafts them, unreviewed; and the uk pattern's
precision is accepted as built, at `warning` level, including its known candidate false positives on product facts such as
«на фотополімерній смолі», «Температура вище 200 °C» in a figure-adjacent paragraph, and the missed caption form «Рекламний
банер, на якому…». This Specification requires only the cases listed above and does not require «на якому/на яких/на ній» to be
detected.

**Failure path:** a language without a pattern, or an empty/undefined text, returns `null`; the function never throws.

### FR-17: `collectFigureDeixis` inspects three carriers only

`collectFigureDeixis(html, locale)` parses HTML and inspects only three carriers, defined below. A picture-reference phrase
(per FR-16) in any of them is reported; each hit identifies its carrier (the value `paragraph`, `figcaption` or `alt`) and
the matched text; the same phrase in a non-adjacent paragraph, or anywhere else in the body, is not reported.

**Definitions — confirmed by owner, 2026-10-18 (OD-8, "accept as built"; the v2 to v4 PROPOSED DEFAULT, unchanged):**

- **Figure**: every `<figure>` element, whether it contains an `<img>` or a video `<iframe>`/`<video>`. The video `<figure>` is a figure for every purpose in this Specification (it carries the baseline's video lead-in «Нижче розміщено відео…», and AGENTS.md §4 requires a lead-in above it).
- **Paragraph directly above a figure**: the figure's *previous element sibling*, if and only if that sibling is a `<p>`. Text nodes and comments are ignored; there is no walking up to the parent and no search for "the nearest preceding `<p>`". The carrier text is that `<p>`'s text content. If the previous element sibling is anything else (heading, `<hr>`, `<ul>`/`<ol>`, `<table>`, another `<figure>`) or there is none (the figure is the first child of its parent, including of an `<li>` or `<section>`), the figure has **no paragraph above it**: the `paragraph` carrier contributes no hit for that figure.
- **`figcaption`**: every `<figcaption>` element in the document, text content.
- **`alt`**: the `alt` attribute of every `<img>` element in the document. (A video `<iframe>` has `title`, not `alt`; `title` is not inspected.)
- A figure with no paragraph above it is **not** reported by `collectFigureDeixis` (it only reports phrases); that structure defect is reported by the measurement script (FR-32, FR-34) only.
- **Counting unit**: one hit per carrier instance whose text yields a non-null `findImageDeixis` result (two phrases in one paragraph are one hit).

Test cases required (AC-6): a phrase in the paragraph directly above a figure, in a figcaption and in an `alt` is reported
with the right carrier; the same phrase in a paragraph that is not the previous sibling of any figure is not reported; a
figure preceded by a heading yields no `paragraph` hit even if a deixis paragraph sits before the heading; the video figure
is treated like an image figure.

**Failure path:** HTML with no `<figure>` returns no hits; malformed HTML does not throw.

### FR-18: `validateGeneratedHtml` emits `image-deixis` at `warning` for the paragraph carrier only

`validateGeneratedHtml` (FROZEN — §9 STOP) emits a finding with rule `image-deixis` at level `warning` for a
picture-reference phrase in the paragraph directly above a figure (FR-17 definition), using the locale of the artifact being
validated. It does not emit it for a phrase such as «нижче -10 °C» in a paragraph that is not directly above a figure. The
level is `warning` and is not `error` in this delivery.

**Carrier table (answers review finding 3.2; it is normative):**

| Carrier | `collectFigureDeixis` (FR-17) | `validateGeneratedHtml` (this FR) | `figureCaptionWarnings` (FR-19) |
|---|---|---|---|
| paragraph directly above a figure | reports hit, carrier `paragraph` | emits `image-deixis`, level `warning` | does not emit |
| `<figcaption>` | reports hit, carrier `figcaption` | does **not** emit `image-deixis` or `image-caption-deixis` | emits `image-caption-deixis`, level `warning` |
| `alt` of an `<img>` | reports hit, carrier `alt` | does **not** emit any deixis rule | does not emit |

There is no validator or QA warning for the `alt` carrier in this delivery: `alt` hits are visible only through
`collectFigureDeixis` and are counted by the measurement script. (Adding one is not required by AC-7 and would be a new
requirement; it is not specified here.)

**Failure path:** the warning does not block generation and does not trigger the repair cycle. Promotion to `error` is out of
scope.

### FR-19: `figureCaptionWarnings` emits `image-caption-deixis` at `warning`

`figureCaptionWarnings` (in `image-placeholder.ts`) emits a finding with rule `image-caption-deixis` at level `warning` for
a picture-reference phrase in a figcaption's text (per the FR-18 carrier table, the only function that reports the
`figcaption` carrier as a warning). Tests assert the rule id and the level, not the detail text; the detail text follows the
existing convention of the module that emits it (`image-placeholder.ts` writes user-facing QA messages in Ukrainian).

**Failure path:** as FR-18 — a warning, never a blocker.

### FR-20: One shared liveliness block, interpolated into the master prompt, reaches every store

SCENE, RHYTHM, HONEST LIMITS and HOOK are defined as **one shared constant** interpolated into the master system prompt, so
every store profile receives them. The shared block states that where a store voice block defines its own bullet form,
heading form, tone or punctuation limits, that block wins. Four owner decisions of 2026-10-17 shape the block (each marked
below): OD-3 (numbers live only in `[SENTENCE LENGTH]`), OD-4 (HOOK and SCENE scope), OD-6 (applies where §3 exists), and the
decision on plan-review blocker B1 (the block scopes itself to writing a new description).

- **SCENE** (OD-4, confirmed by owner, 2026-10-17): each §3 `<h2>` section opens with one short **statement**, not a question,
  naming the task or constraint the reader faces; SCENE does **not** apply to section 1 (the hook).
- **RHYTHM** (OD-3, confirmed by owner, 2026-10-17): the 9-17-word band and the "at most two consecutive sentences" limit are
  **dropped** from RHYTHM. RHYTHM keeps (a) "each section contains at least one sentence of 6 words or fewer" and (b) the
  limit on connecting sentences with the same causal particle («тож», «тому») more than twice per document. Every other
  sentence-length number (bands, hero/body bounds, hard ceiling) lives **only** in `[SENTENCE LENGTH]`, and where RHYTHM and
  `[SENTENCE LENGTH]` disagree, `[SENTENCE LENGTH]` wins. The per-locale bands and the ceiling therefore stay authoritative for
  all seven base languages; RHYTHM adds no new band for any language.
- **HONEST LIMITS**: unchanged from the source analysis (a non-obvious constraint is surfaced in the paragraph where it
  matters; only constraints stated in the source).
- **HOOK** (OD-4, confirmed by owner, 2026-10-17): HOOK governs **only the `[use-case]` slot** of the fixed hook start: in that
  slot the hook names the task the buyer solves (what is scanned, printed or repaired), never describes a photo or a scene.
  The INVARIANT START (`[CONTENT STRUCTURE]` clause 1) is **not changed**: its text, its position and the rule that none of the
  §1 patterns varies the start stay as they are. HOOK does not alter the 40-85-word length, the 2-4 sentences or the HERO band.
- **Scope of the block** (OD-6, confirmed by owner, 2026-10-17): the liveliness rules apply where §3 exists. They are
  interpolated unconditionally (one shared constant, byte-stable cached prefix for all stores) and state in their own text
  that they apply only where §3 exists; for a template that omits §3 SCENE and HONEST LIMITS have nothing to apply to.
- **Self-scoping to authoring (owner decision on plan-review blocker B1, 2026-10-17; literal confirmed by owner, 2026-10-18,
  plan-gate answer Q-SCOPE):** the shared block also contains one sentence stating that its rules **govern writing a new
  description** and that, when the task is to **translate** an existing text, they do not apply and the **source's sentences
  and their order are kept**. The reason is that the same master is `systemBlocks[0]` of the Task C description-translation
  prompts and of the optimizer prompt (FR-23), which therefore read the liveliness rules too. The owner decided on 2026-10-17
  that the sentence exists and what it means, and on 2026-10-18 gave the literal (the word "headings" of the v4 PROPOSED DEFAULT
  is dropped; plan-review N10: this FR-20 wording governs): `These rules govern writing a new description; when the task is to
  translate an existing text they do not apply, and the source's sentences and their order are kept.` The literal is therefore
  **VERBATIM and normative**; it is a plan-gate answer, not an Open Decision (no OD number). The sentence lives in the one shared
  liveliness constant, not in a second constant and not in `task-c.ts`. It is checked by presence only; it lowers, and does not
  remove, the risk in Open questions note G.

- **Assert present** (in the master system prompt, and therefore in `systemBlocks[0].text` of `buildPromptA` for each of the seven `STORE_REGISTRY` stores):
  - `open each §3 <h2> section with one short sentence naming the task or constraint the reader faces` (SCENE; from the source analysis);
  - `a statement, not a question` and `does not apply to §1` (SCENE; composed from OD-4);
  - `at least one sentence of 6 words or fewer` (RHYTHM; kept by OD-3);
  - `more than twice per document` (RHYTHM particle limit; kept by OD-3; from the source analysis);
  - `[SENTENCE LENGTH]` named inside the shared block as the authority for sentence-length numbers (RHYTHM; composed from OD-3);
  - `surface the non-obvious constraint in the paragraph where it matters` (HONEST LIMITS);
  - `[use-case]` slot, with `names the task the buyer solves` (HOOK; composed from OD-4);
  - `apply only where §3 exists` (composed from OD-6);
  - the precedence sentence, **PROPOSED DEFAULT wording** (the Story fixes the meaning, not the words; no decision touched it): `where a store voice block defines its own bullet form, heading form, tone or punctuation limits, that block wins`;
  - the self-scoping sentence (**confirmed by owner, 2026-10-18, Q-SCOPE**; VERBATIM; the literals use an ASCII apostrophe): the three strings `govern writing a new description`, `when the task is to translate an existing text they do not apply` and `the source's sentences and their order are kept`, all inside the shared liveliness constant, and therefore also present in `systemBlocks[0].text` of `buildPromptC` for a description translation and of `buildOptimizerPrompt` (FR-23). The full sentence, which contains all three: `These rules govern writing a new description; when the task is to translate an existing text they do not apply, and the source's sentences and their order are kept.`
- **Assert present (existing, kept; INVARIANT START unchanged)**: `"<b>[Product]</b> — [Category] for [use-case], featuring [key specs]."` and `none of them varies the start` in `MASTER_SYSTEM_PROMPT`.
- **Assert absent** (in the shared liveliness constant): `9–17`, `9-17`, `at most two consecutive`, `two consecutive sentences`, and any word-count range in the form `N-M words` / `N–M-word band` (a test regular expression for a digit range followed by `word`); the block contains no sentence-length number other than `6`.
- **Verbatim vs illustrative**: the strings above are normative; the restated block is illustrative.

Restated source text (illustrative; the source analysis' proposal with the OD-3, OD-4 and OD-6 changes applied; the wording
marked "composed" is this Specification's rendering of the decision, not prose the owner wrote):

```
SCENE RULE: open each §3 <h2> section with one short sentence naming the task or constraint the
reader faces — a statement, not a question; this does not apply to §1. Then continue
Fact -> Mechanism -> Consequence. A consequence changes what the buyer does ("the object does not
travel to the scanner; the scanner travels to the object"), not just what the product is. No
emotional adjectives.

RHYTHM: vary sentence length; each section contains at least one sentence of 6 words or fewer. Do
not connect sentences with the same causal particle more than twice per document ("тож", "тому").
All other sentence-length numbers are in [SENTENCE LENGTH], which wins on any conflict.

HONEST LIMITS: surface the non-obvious constraint in the paragraph where it matters, as a
consultant's note, not as a footnote (e.g. a mode that works only with a cable, a missing export
format, what is not in the box). Only constraints stated in the source.

HOOK: in the [use-case] slot of the fixed hook start the hook names the task the buyer solves
(what is scanned/printed/repaired), never describes a photo or a scene. Numbers destined for §2
are not repeated.

These rules apply only where §3 exists. These rules govern writing a new description; when the
task is to translate an existing text they do not apply, and the source's sentences and their
order are kept.
```

Dependencies recorded, not resolved: none from OD-3, OD-4 or OD-6 remain (all resolved by the owner). The relation of HOOK
to the §1 pattern injected by `hook-pattern.ts` is unchanged because the INVARIANT START and the patterns are unchanged.

**Failure path:** the liveliness rules cannot be verified by a prompt test beyond presence (Story: AC-10 to AC-12 note);
the shared-block requirement is verified by presence, absence and placement; the effect would be measured by FR-34/FR-35, which are WAIVED (Story v6) and not measured, so it is judged only by the owner's manual testing. That a translator
or the optimizer obeys the self-scoping sentence cannot be verified by any test in the gate (note G). Contradicting
`[SENTENCE LENGTH]` is prevented by assertion (no number range in the shared block), not by a model-behaviour test.

### FR-21: Each ToV block keeps its own tone limits

After the change the following strings are still present (**Assert present**, VERBATIM; they are the current text in
`constants.ts`): in `EXPERT3D_TOV_BASE_OVERLAY` `Emotionally neutral: no excitement, no exclamation marks.`; in
`C3D_TOV_BASE_OVERLAY` `Exclamation marks in the body: ZERO` and `at most 1 per 400 words` and `instructional, calm`. In the
master system prompt `STRICT INPUT SCOPE` is still present; its exact text is the one FR-42 fixes (PROPOSED DEFAULT, OD-21: identical to `main`).

**Guidance (not asserted by a test):** the liveliness text adds no emotional adjectives and no facts; it works through
structure, rhythm and contrast. The only checkable part is that the SCENE sentence contains `No emotional adjectives`
(FR-20 restated block, illustrative); the effect is judged by the owner's manual testing, and the FR-35 review is retained criterion text that is not evidenced by any recorded run (Story v6).

**Failure path:** n/a, no failure path — a preserved-text requirement.

### FR-22: APPLICATIONS and HEADINGS are added to `EXPERT3D_TOV_BASE_OVERLAY` only

`EXPERT3D_TOV_BASE_OVERLAY` gains an APPLICATIONS rule and a HEADINGS rule, and one existing line of the overlay is amended.
No other overlay gains them.

**HEADINGS rule (OD-5, confirmed by owner, 2026-10-17):**

- functional wording is allowed for the **§3 `<h2>`** headings **only**;
- `<h3>` headings stay **nominal** (the master's `[HEADING FORM]` rule that `<h3>` are concise nominal labels is not weakened);
- a heading carries **at most one colon or dash** (the examples below each carry at most one: «Лазер без маркерів: лише з
  кабелем» one colon, «Режим підключення — вибір місця роботи» one dash, «Сканер їде до об'єкта» none);
- the rest of the heading limits (up to 8 words, no product name in `<h3>`, at most two `<h2>` with the `[Product-short]`
  name) are already carried by `[HEADING FORM]`, which this Story does not change; the HEADINGS rule must not contradict them.
  They are not asserted again in the overlay.

**Amendment of the overlay line (OD-5).** The owner named the line, not its new wording. Current text in
`EXPERT3D_TOV_BASE_OVERLAY` (`constants.ts`): `Keep the schema's mandated section order and headings — the ToV changes the WORDING and the evidence discipline, not the structure.` The exact requirement on the amended line:
(a) it keeps the mandated section **order** and does not permit adding, dropping or reordering sections; (b) it no longer
says the **headings** are mandated or must be kept, because that sentence contradicts the HEADINGS rule for §3 `<h2>`;
(c) it keeps `the ToV changes the WORDING and the evidence discipline, not the structure`. The Specification does not
supply the final sentence; the plan writes it so that the literals below hold.

- **Assert present** (in `EXPERT3D_TOV_BASE_OVERLAY`):
  - `states the mechanism that makes THIS product the right tool` (APPLICATIONS; from the source analysis);
  - `functional headings` (HEADINGS; from the source analysis);
  - `only for §3 <h2>`, `<h3> stay nominal` and `at most one colon or dash per heading` (HEADINGS; composed from OD-5);
  - `mandated section order` and `the ToV changes the WORDING and the evidence discipline, not the structure` (amended line; composed from OD-5).
- **Assert absent**:
  - in `EXPERT3D_TOV_BASE_OVERLAY`: `Keep the schema's mandated section order and headings` (the old line in that form);
  - in every `systemBlocks` text of every `STORE_REGISTRY` store (master, task instruction and overlays), and in `constants.ts`: `never bare noun` (OD-5: the phrase is not used, so the `task-a.spec.ts` guard keyed on it is never triggered and is not edited or weakened);
  - in `C3D_TOV_BASE_OVERLAY`, `MASTER_SYSTEM_PROMPT`, `task-c.ts` and `task-translate.ts`: `states the mechanism that makes THIS product the right tool` and `functional headings`.
- **Verbatim vs illustrative**: the strings above are normative; the bullets below are illustrative.

Restated source text (illustrative):

- APPLICATIONS (§4): `Each bullet differs in structure and states the mechanism that makes THIS product the right tool: a
  different measurable fact in each (accuracy, time, mode, format), never the same "X: scan does Y; Z does W" frame five times.`
- HEADINGS: functional headings are allowed for the §3 `<h2>` only, with at most one colon or dash per heading; `<h3>` stay
  nominal. Examples checked on Creality Pika: «Сканер їде до об'єкта», «Лазер без маркерів: лише з кабелем», «Режим
  підключення — вибір місця роботи» (the Specification does not claim which of them are §3 `<h2>`).

Dependencies recorded, resolved by OD-5: `[HEADING FORM]` (unchanged); the overlay's amended line; the existing
`task-a.spec.ts` guard (not triggered, because `never bare noun` is absent). Not decided by the owner and therefore not
specified: whether `heading-style.ts` checks need a matching change (it covers `<h2>` for Center 3D Print only, so none is
expected for EXPERT3D; the plan confirms).

**Failure path:** if the added HEADINGS wording contradicts an existing guard test, the test must not be weakened to pass
(AGENTS.md §5); the contradiction goes back to the human.

### FR-23: C3D overlay unchanged by FR-22; translation files not edited; translation and optimizer prompts inherit the master through block 0 only

Restated in v4 at file level with the payload-level consequence (owner decision on plan-review blocker B1, 2026-10-17; the v3
wording "byte-identical ... no liveliness rules" was unsatisfiable, because the master is `systemBlocks[0]` of the prompts it
described).

1. **C3D overlay.** `C3D_TOV_BASE_OVERLAY` is not given the APPLICATIONS or HEADINGS rules (its OVERRIDE #1 and SIGNATURE MOVE
   #2 already cover them): the FR-22 Assert-present strings are absent from it. (Unchanged from v3.)
2. **File level.** `src/prompts/task-c.ts` and `src/prompts/task-translate.ts` are **not edited**: `git diff` over them is
   empty and the `.arch-guard-checksums` entries for them are unchanged. `src/prompts/optimizer.ts` is likewise not edited by
   any requirement of this Specification.
3. **Payload level, Task C description translation.** The description-translation prompt built by `buildPromptC` embeds
   `MASTER_SYSTEM_PROMPT` as `systemBlocks[0]` (`pack()`; the existing golden holds 96 cases = 16 store/language pairs x 6
   variants). Its **block 0 changes by design** and carries the new master text, including `[NO PICTURE REFERENCES`, the
   shared liveliness block and its self-scoping sentence (FR-20). Its **block 1** (the per-case Task C instruction) and its
   **`userContent`** are **byte-identical** to the pre-Story output in all 96 cases.
4. **Payload level, the optimizer.** The optimizer prompt (`buildOptimizerPrompt`) embeds the master as `systemBlocks[0]` and
   inherits the same text through block 0. Nothing else in its payload is changed by this Story (no requirement edits
   `TASK_OPTIMIZE_INSTRUCTION`; Open questions, note G).
5. **Not reached at all.** The Task C **FAQ variant** (it carries no master) and `buildTranslatePrompt` (`task-translate.ts`,
   no master) are unchanged at payload level: their `systemBlocks` and `userContent` are byte-identical to the pre-Story
   output.

- **Assert present** (the translation and optimizer prompts inherit, by design): `[NO PICTURE REFERENCES` and the three FR-20
  self-scoping strings in `systemBlocks[0].text` of a `buildPromptC` description prompt and of a `buildOptimizerPrompt` prompt;
  `systemBlocks[0].text` of each equals the text of `MASTER_SYSTEM_PROMPT`.
- **Assert absent**: the FR-22 strings (`states the mechanism that makes THIS product the right tool`, `functional headings`)
  from `C3D_TOV_BASE_OVERLAY`, `task-c.ts` and `task-translate.ts` (as in FR-22); no `*_TOV_TRANSLATION_OVERLAY` constant is
  edited.
- **Unchanged-bytes assertions** (the existing `src/prompts/task-c.description-bytes.spec.ts` and
  `full-description.golden.spec.ts` are the oracles): block 1 and `userContent` of all 96 Task C description cases; block 1
  and `userContent` of the three `c/*` cases of `full-description-prompts.json`; every block of the `translate/*` cases and of
  the Task C FAQ variant.

**Plan-gate item Q1 (not an Open Decision) — answered by the owner, 2026-10-18: "accept master in Task C and optimizer; guard
option (b): block 0 compared with live MASTER_SYSTEM_PROMPT; block 1 and userContent stay pinned per case."** The question was how the existing guard
`task-c.description-bytes.spec.ts` (whose header says "Never regenerate the golden, never pass `-u`") returns to green for block 0
without ceasing to protect block 1 and `userContent`: **(a)** a reviewed update of the block-0 digest record in
`test/fixtures/golden/task-c-description-prompts.json`, with a diff limited to that record; or **(b)** an amended guard that
compares block 0 with the live master instead of a digest. This Specification requires only the outcome: after either option,
the 96 block-1 digests and the 96 `userContent` digests are unchanged and the guard is not weakened (AGENTS.md §7.7). The owner
chose option (b) on 2026-10-18; the required outcome is unchanged.

**Failure path:** a change to block 1 or `userContent` of any Task C description case, to the Task C FAQ variant, or to
`buildTranslatePrompt` is a failing test. Block 0 changing is not a failure. A model that rewrites a translation under the
liveliness rules is not detectable by any test (Open questions, note G).

### FR-24: Operator-note textareas — WITHDRAWN in v6

Withdrawn by the owner on 2026-10-19 (Story v5: the operator-notes fields are not needed). The number is kept so that no requirement is renumbered. Nothing in this Specification requires it, and nothing may be built or tested for it. Carve-out: the absence pins of FR-42 and FR-44 and the test removals of NFR-14 are not built or tested *for* this withdrawn requirement; they check that the feature is absent or remove its remnants, are PROPOSED DEFAULTS, and are not forbidden by this sentence.

### FR-25: `ProductInput.operatorNotes` — WITHDRAWN in v6

Withdrawn by the owner on 2026-10-19 (Story v5: the operator-notes fields are not needed). The number is kept so that no requirement is renumbered. Nothing in this Specification requires it, and nothing may be built or tested for it. Carve-out: the absence pins of FR-42 and FR-44 and the test removals of NFR-14 are not built or tested *for* this withdrawn requirement; they check that the feature is absent or remove its remnants, are PROPOSED DEFAULTS, and are not forbidden by this sentence.

### FR-26: `[Operator Notes]` block in `task-a.ts` — WITHDRAWN in v6

Withdrawn by the owner on 2026-10-19 (Story v5: the operator-notes fields are not needed). The number is kept so that no requirement is renumbered. Nothing in this Specification requires it, and nothing may be built or tested for it. Carve-out: the absence pins of FR-42 and FR-44 and the test removals of NFR-14 are not built or tested *for* this withdrawn requirement; they check that the feature is absent or remove its remnants, are PROPOSED DEFAULTS, and are not forbidden by this sentence.

### FR-27: Task A `userContent` changes only by the FR-11 spans

**Reworded in v6** (it guarded the empty-`operatorNotes` contract; the notes are withdrawn, the byte-identical oracle stays).

**Meaning of "today's".** The contract is on `userContent` only (the model's output is not byte-testable, and `systemBlocks`
change by design: FR-5 to FR-9, FR-11 item 1, FR-20, FR-22). "Today's" is a **golden captured from the commit at which the
Story's branch started, before any edit to `task-a.ts`** (AGENTS.md §5). `TASK_A_INSTRUCTION` is a system block and never
enters `userContent`; only the two spans inside `buildVideoBlock` and `buildMarkerBlock` change `userContent`, and they appear
only for an input with a video embed or a matched marker.

**Confirmed by owner, 2026-10-18 (OD-18, "accept as built"):**

- **Tier A (strict byte equality)** — inputs with no video embed and no matched marker: `buildPromptA(input[, baseLanguageOverride]).userContent` equals the golden byte for byte.
- **Tier B (equality except the two FR-11 spans)** — inputs with a video embed, with a matched marker, and with both: the test takes the golden, replaces the FR-11 **old span** of `buildVideoBlock` and of `buildMarkerBlock` by the corresponding **new span** (the literal strings in FR-11), and requires equality with `userContent` byte for byte. Any other difference, however small, fails.
- **Doc wrapper** — for the Tier A and Tier B inputs, `buildPromptADoc(...).userContent` starts with the same string and the remainder (the `runFacts` and, when a `hookPattern` is given, the `[§1 HOOK PATTERN]` suffix) equals the golden's remainder; checked with and without a `hookPattern`.
- **Existing oracle (verified in the tree)**: `test/fixtures/golden/full-description-prompts.json` with `src/prompts/full-description.golden.spec.ts` and `test/fixtures/full-description-inputs.ts` already hold whole-payload byte goldens. They change after this Story because `systemBlocks` change by design; they are regenerated with a reviewed diff limited to the changed text, never by a blind update (the regeneration after the withdrawal is FR-43). That regeneration changes no `userContent` entry for an input without a video embed or matched marker (Tier A) and, for a video or marker input, changes `userContent` only by the FR-11 spans (Tier B).
- **Input set** (each member captured once in the golden): one store from each `STORE_REGISTRY` group — `3DDevice` (UA), `Center 3D Print` (EU), `EXPERT3D` (ES), `Expert-3DPrinter` (US); Full-description template and one simplified template; with and without `customInstructions`; with and without an image manifest; with and without `baseLanguageOverride`; plus the video / marker / both inputs of Tier B. No input of the set carries an operator-notes property or text (the property is not part of `ProductInput` after this Story, FR-44).
- **If the FR-11 hunks were refused or reverted** (they are committed today; the scope and lifetime of the 2026-10-19 FROZEN-file instruction is the open OD-25, and "OD-12 point 1" is moot in Open Decisions v5): the old spans stay and Tier B degenerates to Tier A equality.

**Failure path:** a difference in any covered input is a failing test. The golden is not regenerated to make a test pass.

### FR-28: FAQ trigger for the operator-note textareas — WITHDRAWN in v6

Withdrawn by the owner on 2026-10-19 (Story v5: the operator-notes fields are not needed). The number is kept so that no requirement is renumbered. Nothing in this Specification requires it, and nothing may be built or tested for it. Carve-out: the absence pins of FR-42 and FR-44 and the test removals of NFR-14 are not built or tested *for* this withdrawn requirement; they check that the feature is absent or remove its remnants, are PROPOSED DEFAULTS, and are not forbidden by this sentence.

### FR-29: `STRICT INPUT SCOPE` names the operator notes — WITHDRAWN in v6

Withdrawn by the owner on 2026-10-19 (Story v5: the operator-notes fields are not needed). The number is kept so that no requirement is renumbered. Nothing in this Specification requires it, and nothing may be built or tested for it. Carve-out: the absence pins of FR-42 and FR-44 and the test removals of NFR-14 are not built or tested *for* this withdrawn requirement; they check that the feature is absent or remove its remnants, are PROPOSED DEFAULTS, and are not forbidden by this sentence.

**Consequence for the master prompt (PROPOSED DEFAULT, OD-21 — not an owner decision):** the two `[SOURCE FIDELITY]` bullets leave the notes-bearing branch text; the proposal is that they return to their pre-US-9.1 text (three input blocks: `[Raw Description]`, `[Technical Specs]`, `[Supplemental Content]`). The requirement is FR-42. The file's other US-9.1 edits (FR-5 to FR-9, FR-20) are unchanged.

### FR-30: `numericFidelitySources` includes the operator notes — WITHDRAWN in v6

Withdrawn by the owner on 2026-10-19 (Story v5: the operator-notes fields are not needed). The number is kept so that no requirement is renumbered. Nothing in this Specification requires it, and nothing may be built or tested for it. Carve-out: the absence pins of FR-42 and FR-44 and the test removals of NFR-14 are not built or tested *for* this withdrawn requirement; they check that the feature is absent or remove its remnants, are PROPOSED DEFAULTS, and are not forbidden by this sentence.

### FR-31: Operator notes in history and the textareas' restore — WITHDRAWN in v6

Withdrawn by the owner on 2026-10-19 (Story v5: the operator-notes fields are not needed). The number is kept so that no requirement is renumbered. Nothing in this Specification requires it, and nothing may be built or tested for it. Carve-out: the absence pins of FR-42 and FR-44 and the test removals of NFR-14 are not built or tested *for* this withdrawn requirement; they check that the feature is absent or remove its remnants, are PROPOSED DEFAULTS, and are not forbidden by this sentence.

### FR-32: `tools/measure-description.ts` reports the mechanical metrics

`tools/measure-description.ts` takes a generated HTML and the input description, reuses `collectFigureDeixis`, and reports:
deixis hits (three carriers); figures without a paragraph above; consecutive figures; numbers absent from the input;
«тож» + «Тому» count; sentences of 6 words or fewer per §3 section (a **reported** count per section, **no threshold**, per
Story v3 / owner decision of 2026-10-17); mean sentence length and standard deviation; hook word count.

**Metric definitions.** D-6 is **confirmed by owner, 2026-10-17** (OD-10 part (2): "D-6 unchanged"). D-1 and D-2 follow FR-17
(confirmed by owner, 2026-10-18, OD-8). **D-10 is confirmed by owner, 2026-10-18** (OD-10 part (4) input-set half and OD-20(3):
"Q-OD20: defaults; script input set as D-10"). D-3, D-4, D-5, D-7 and D-9 remain **PROPOSED DEFAULTS** (OD-10 parts (1), (3) and
the D-9 half of (4); not answered by any decision, still need confirmation; OD-10 stays open for them). D-8 is unchanged.
They are deterministic and unit-testable on small fixtures; each is stated so that a test can compute the expected value by
hand.

- **D-1 Figure, paragraph above, carriers, deixis hit**: as FR-17. *Deixis hits* = the number of carrier instances (paragraph / figcaption / alt) with a non-null `findImageDeixis` result, over all figures including the video figure.
- **D-2 Figure without a paragraph above**: a `<figure>` whose previous element sibling is not a `<p>` (FR-17), counted once per figure. **Consecutive figures**: a `<figure>` whose previous element sibling is a `<figure>`, counted once per such figure. A figure after another figure counts in both metrics; they are independent counts.
- **D-3 Word**: a whitespace-separated token (after NBSP and thin spaces are treated as whitespace) that contains at least one Unicode letter or digit (`[\p{L}\p{N}]`). A standalone dash, `×` or punctuation is not a word; `0,03` and `3D-модель` are one word each.
- **D-4 Prose block and sentence**: a *prose block* is every `<p>` and `<li>` element that is not inside a `<figure>`. Headings, table cells, figcaptions and `alt` are not prose blocks. In a prose block's text content (whitespace runs collapsed) a sentence ends at `.`, `!`, `?` or `…` that is followed by whitespace and then a character that is an uppercase letter (`\p{Lu}`), a digit, `«` or `"`, or ends at the end of the block; a decimal such as `0,03` or `3.5` (no whitespace after the separator) never ends a sentence. Empty fragments are not sentences.
- **D-5 Mean and σ**: over all sentences of all prose blocks: arithmetic mean of D-3 word counts; σ is the population standard deviation (divide by the number of sentences). The soft criterion uses them as **one** item: mean ≥ 12 **and** σ ≥ 5.5 (FR-35).
- **D-6 §3 section**: the document is cut into *sections* — an `<h2>` and the following top-level siblings up to the next `<h2>`, `<hr>` or `<section>`. The *§3 sections* are the sections that come after the first `<h2>` section (the §2 block) and before the first top-level `<hr>` or `<section>` element. **Disclosed over-inclusion (left as written; confirmed by owner, 2026-10-17, "D-6 unchanged"):** this positional rule also includes the §4 to §6 `<h2>` sections that precede the specifications `<section>` (Applications, Accessories, In the box). Because the per-section short-sentence count is now only **reported, with no threshold** (FR-35), the over-inclusion no longer makes any criterion stricter; it only widens what is listed. The per-section metric is the number of D-4 sentences of at most 6 D-3 words in each §3 section, reported per section.
- **D-7 Hook**: the first `<p>` in document order; its D-3 word count. ("The hook names the buyer's task / use case" is a manual criterion, FR-35; the script reports the hook's word count only.)
- **D-8 «тож» + «Тому» count**: in the prose blocks (D-4), the number of whole-word occurrences (neighbouring characters are not `\p{L}`) of `тож` in any letter case, plus of `Тому` written with a capital Т. Lowercase `тому` (a pronoun form, as in «тому що») is not counted.
- **D-9 Number token, normalisation, "absent from the input"**: a *number token* is a match of `\d+(?:[   ]\d{3})*(?:[.,]\d+)?` that is not directly adjacent (no space) to a letter on either side (so `L2`, `3D`, `Wi-Fi6` yield none). Normalisation: remove the group spaces and replace `,` by `.`. The *generated side* is the visible text content of the generated HTML (attribute values such as `src`, `href`, `style` are not read; headings, tables and figcaptions are). The *input side* is the number tokens of every text the script is given. A generated number whose normalised form is not among the input side's normalised forms is *absent from the input*; each distinct absent number is reported once.
- **D-10 Script inputs (confirmed by owner, 2026-10-18; OD-10(4), OD-20(3): "script input set as D-10")**: the script requires the generated HTML and the input description; it accepts, as optional further input texts, the technical specs and the product name. Every text the script is given forms the input side; a number found only in a text the script was not given is reported as absent (so for the three acceptance runs the operator passes description and specs). No exemption list for fixed CTA or store text is defined; if the first live runs show false reports from such text, the exemption is a new requirement for the human to decide, not invented here.

**Calibration disclosure (informational, not normative; scratch measurement on the two `Knowledge/Issues/4` files, `happy-dom`,
D-3 to D-8 applied as written; the figures are those measured for v2, recomputed here against the amended AC-12 and not
re-measured).** Under the v2 criterion ("at least three of four", σ ≥ 6) the Story's own corrected reference output could not
pass; the owner amended AC-12 (Story v3) for that reason. Against the amended criterion:

| Measure (D-n) | Reference `creality-pika-uk-v2.html` | Defective `description_uk-UA.html` | AC-12 v3 soft item |
|---|---|---|---|
| Sentences (D-4) | 80 | 98 | — |
| «тож» + «Тому» (D-8) | 1 + 1 = 2 | 7 + 0 = 7 | item 1: ≤ 2 |
| Mean words per sentence (D-5) | 12.61 | 10.92 | item 2: mean ≥ 12 **and** |
| σ, population (D-5) | 5.90 | 4.84 | item 2: σ ≥ 5.5 |
| Hook words (D-7) | 47 | 53 | item 3: manual (hook names the buyer's task) |
| Sentences of at most 6 words, total | 13 | 18 | reported, no threshold |
| §3 sections (D-6) / of them with 0 sentences of at most 6 words | 13 / 8 | 13 / 6 | reported, no threshold |

Reading against FR-35 ("at least 2 of 3"):

- **Reference output.** Item 1 is met (2 ≤ 2). Item 2 is met (mean 12.61 ≥ 12 and σ 5.90 ≥ 5.5, one item). So the two computed
  items are both met: the reference reaches **2 of 3** without the manual item, and 3 of 3 if the operator judges the hook to
  name the buyer's task. It passes the amended soft criterion.
- **Defective output.** Item 1 is not met (7 > 2). Item 2 is not met (mean 10.92 < 12; σ 4.84 < 5.5). It therefore meets at
  most **1 of 3** (only if the manual hook item were judged met, which the Story's P2 contradicts: the hook describes a photo),
  so it does not reach 2 of 3 under either reading of the manual item.
- The per-section column is reported, never scored: 8 of 13 sections of the reference have no sentence of at most 6 words under
  D-6. That is not a failure under v3; it is a number the operator reads.

The Story's own figures for the reference (74 sentences / mean 14.2 / σ 6.5 / 12 short) and baseline (81 / 12.2 / 5.7 / 16)
are **not reproduced** by any simple sentence definition tried (counting figcaptions as prose gives mean 14.3, σ 6.7, but 100
sentences and a defective-text mean of 13.8 that already meets "≥ 12"), so they stay informational, not thresholds. D-8 is
the one definition that **does** reproduce the Story's counts («тож» 7 on the defective text; 1 + 1 on the reference). Nothing
was retuned to make the reference pass.

**Execution (confirmed by owner, 2026-10-18, OD-9, "accept as built"):** the repository has no TypeScript runner, the detector
needs a DOM, and `tools/` is outside vitest, coverage and the `tsconfig` include; the script's runner is accepted as built in the
implementation plan (v3, D12). The owner's condition: **Node >= 22.18 is verified first, and only if it is not met is the D12
launcher fallback used.** That verification belongs to the plan and implementation stages and is not performed or recorded by
this Specification. No runner or other dependency is added (Out of scope).

**Failure path:** input that cannot be parsed (unreadable file, empty HTML) makes the script fail visibly (non-zero), not
report zeros.

### FR-33: The script exits non-zero when a hard threshold is violated

`tools/measure-description.ts` exits with a non-zero status when a hard threshold is violated: any deixis hit (D-1), any
figure without a paragraph above (D-2), any two figures in a row (D-2), or any number absent from the input (D-9). The soft
liveliness metrics (FR-35) are reported and never change the exit status.

**Failure path:** n/a (this requirement is the failure path of FR-34/FR-35).

### FR-34: Live-run structural acceptance (hard) — criterion text retained, WAIVED by the owner (Story v6; not measured; PROPOSED DEFAULT, OD-26)

**WAIVED (owner, Story v6; `docs/workflow/history.jsonl` `ts` 2026-10-19T14:50:23Z; not measured).** The owner waived the hard script criteria of AC-11 for this delivery, on the basis of the owner's manual testing ("Waive the AC-11/AC-12 hard script criteria for US-9.1; accepted on my manual testing"). No `tools/measure-description.ts` output, no product list and no run count exists. The criterion text below is **retained unchanged so the intent stays readable**; it is not an acceptance gate of this delivery, no live run is required, and nothing in this Specification may be read as saying that the runs will be performed. The headline outcome (0 picture references) is accepted on the owner's word, not on script evidence.

**PROPOSED DEFAULT (OD-26, with OD-27, OD-29, OD-32) — a proposal only; the owner has not answered any of them. A plain `/so:approve` would accept this wording as written unless the owner answers OD-26 to OD-32 in the approval comment.** OD-26 option (a) with the meaning of (b): FR-34 keeps its text and gains the note above; the run rules, the failure path and the coverage note below are the procedure that applies **only if the runs are ever performed** (they record the OD-11 answers of 2026-10-18, now moot-by-waiver and kept as history). Waiver record (the defaults of OD-27, OD-29, OD-32): (1) the waiver covers the delivery as committed at the time of the owner's decision; no product list is demanded and none is claimed; any later change to a prompt-bearing file of this Story needs the owner to restate the waiver; (2) a later live run that fails is reported with its output and does not by itself void the waiver; (3) the downstream records (the `ac_test_matrix` rows, the reconciliation report and the Pull Request "how verified" line) state this criterion as "WAIVED (owner, Story v6, 2026-10-19; not measured)", cite the history event and not a test or a run, and never report it as passed or as measured; the Story v6 sentence "The delivery ships with the headline outcome unmeasured and accepted on the owner's word" is the disclosure.

*Retained criterion text (unchanged from Story AC-11 and Specification v7):*

On live runs for each of three products — Creality Pika (EXPERT3D), one Center 3D Print product, one product from a store
with no ToV block (3DDevice) — **using the Full description template** (confirmed by owner, 2026-10-17, OD-6: "acceptance runs
use Full description"; the liveliness rules apply where §3 exists, and a Full description has §3) — the measurement script reports: **0** deixis hits (D-1: the paragraph above each figure, each
figcaption and each `alt`); no figure without a paragraph above it (D-2); no two figures in a row (D-2).

**Counting rule for the "35" baseline — confirmed by owner, 2026-10-18 (OD-14, "accept as built"; was a PROPOSED DEFAULT):** the normative rule is D-1 (**reading B**): one hit per carrier instance over all 20 `<figure>` elements of the
baseline (19 image figures and the video figure), three carriers. Under the uk pattern of FR-16 the clarifier's scratch run
gave 20 paragraph hits + 14 figcaption hits + 1 `alt` hit = 35 on `description_uk-UA.html`. The Story's breakdown (19
paragraphs + 16 figcaptions, reading A) did not reproduce and is not used. Because reading B covers every figure and
includes the `alt` carrier, **0 under reading B implies 0 under reading A**: the acceptance criterion (0) is the same under
either reading and is not weakened by choosing B. The number 35 is an informational baseline only: **no test asserts 35**. (The live-run comparison against it is moot-by-waiver, OD-14 v6; D-1, the script's counting rule, is unchanged.)

This would be measured on live model output and cannot be pinned by a prompt unit test. **Run rules (they apply only if the runs are ever performed; moot-by-waiver, history of OD-11) — confirmed by owner, 2026-10-18
(OD-11: "three products x 2 runs, all must pass hard criteria, include a non-marker run; evidence = script output; failure is
reported, not auto-iterated"):** if the runs are performed, each of the three products is run **twice** (six live runs); **every** run must pass the hard
criteria (this requirement and the hard numbers criterion of FR-35); the six runs **include a run whose output contains
non-marker (model-authored) figures**; the evidence is the **measurement script's output** for each run; a failing run is
**reported with that output and not automatically iterated** (no automatic further prompt edit). **Moot-by-waiver (formerly the OD-11 residue,
non-blocking, not decided here):** (a) which Center 3D Print product and which 3DDevice product are the inputs (only Creality
Pika is named); (b) who runs the live runs (cost, API keys; an opt-in live spec is never part of the gate). The OD-11 answer adds
no requirement to reword the master `FIGURE FORMAT` text, and none is added (note H).

**Coverage note (v4; the criterion is unchanged).** The "0" would be measured over **every** figcaption and `alt` of the run, but
FR-1 and FR-2 reach only marker-built figures; for model-authored figures the master rule FR-5 is the only prevention and no
warning covers them (FR-5 "Coverage of model-authored figcaptions and `alt`"; Open questions, note H). A live run containing
non-marker figures could therefore fail this criterion on figures that no other requirement addresses; the owner's OD-11 answer
of 2026-10-18 required such a run and accepted that exposure, now moot-by-waiver (no run is required).

**Failure path (only if a live run is ever performed):** a failing live run is reported with the script output as evidence; it is not "fixed" by relaxing the
threshold and is not automatically iterated (the OD-11 answer of 2026-10-18, moot-by-waiver and kept as history); under the OD-29 PROPOSED DEFAULT it does not by itself void the waiver. Whether to start a further prompt
iteration is a separate decision of the human, because it would be a further FROZEN-file change.

### FR-35: Live-run numbers (hard), liveliness (soft) and fact fidelity (manual) — hard criterion WAIVED by the owner (Story v6; not measured; PROPOSED DEFAULT, OD-26, OD-28)

**WAIVED (owner, Story v6; `ts` 2026-10-19T14:50:23Z; not measured) — the hard criterion only.** The owner waived the hard script criterion of AC-12 (0 numbers absent from the input) for this delivery, on the basis of the owner's manual testing. No script output, product list or run count exists; the headline outcome (0 invented numbers) is accepted on the owner's word, not on script evidence. The criterion text below is retained unchanged so the intent stays readable, and the waiver record of FR-34 applies to it.

**PROPOSED DEFAULT (OD-26, OD-28) — a proposal only; the owner has not answered either. A plain `/so:approve` would accept this reading as written unless the owner answers OD-26 and OD-28 in the approval comment.** Read narrowly as the owner's words (OD-28 option (b)): only the hard script criterion is waived. The soft items (at least 2 of 3) remain non-blocking, as they always were, and are recorded as "not evidenced by any recorded run"; the manual fact review is recorded as covered by the owner's statement and **not** as evidence. If the owner widens the waiver to the soft and manual items (OD-28 (a)) or defers them to a later run (OD-28 (c)), only this paragraph changes. The run rules of FR-34 apply only if the runs are ever performed.

*Retained criterion text:*

On the same runs (Full description template, OD-6): **hard** — 0 numbers absent from the input (D-9, script).

**Soft** (reported, not blocking, reviewed by the operator; amended by the owner, 2026-10-17, Story v3 AC-12): three items,
of which **at least 2 of 3** must hold:

1. «тож» + «Тому» ≤ 2 (D-8);
2. mean sentence length ≥ 12 **and** standard deviation ≥ 5.5 (D-5), counted as **one** item;
3. the hook names the buyer's task / use case (manual reading of the hook, reported under D-7, not computed; it concerns the
   `[use-case]` slot of the invariant hook start, FR-20, OD-4).

A miss of the soft criterion is reported and never blocks and never changes the script's exit status (FR-33). The number of
sentences of 6 words or fewer in each §3 section (D-6) is **reported per section with no threshold** and is not one of the
three items.

**Manual** (operator) — no fact absent from the input, reviewed from the list of sentences that contain numbers and proper
names the input lacks. The reference result the Story quotes for Creality Pika is `creality-pika-uk-v2.html` (0 picture
references, 74 sentences, mean 14.2 words, σ 6.5, 12 sentences ≤ 6 words, «тож» 1, «Тому» 1, all numbers from the source);
see the calibration disclosure in FR-32 for why those figures are informational and for the recomputed reading of both
Knowledge files against the amended criterion.

The baseline numbers (the "35" counting rule and the 48-word hook, which the Story's P2 lists as a defect although 48 lies inside
the 40-85 requirement) are accepted as built: confirmed by owner, 2026-10-18 (OD-14); no requirement or threshold treats a
48-word hook as a defect (D-7 reports its word count only). The "input" set for the numbers criterion is FR-32 D-10, confirmed
by owner, 2026-10-18 (OD-20(3), OD-10(4)). If the runs are ever performed, the run rules of FR-34 (OD-11, moot-by-waiver) apply here: every run must pass the hard criterion (0
numbers absent from the input); the soft criterion is reported per run and never blocks.

**Failure path (only if a live run is ever performed):** a hard-criterion failure is a failed acceptance; a soft-criterion miss is reported and does not block.

## Generated-HTML requirements (AGENTS.md §4)

The Story changes generated HTML. The §4 criteria in play are quoted verbatim below; the Story requires that they do not
regress. The Story's Out of scope forbids editing §4; the word "lead-in" therefore stays in §4, and for this Story the `<p>`
that §4 calls the lead-in is the body paragraph of FR-7 and FR-10 (a product fact that does not point at the picture).

### FR-36: Figure and figcaption structure, lead-in above every figure, first-image eager / rest lazy

> "Each image wrapped in a `<figure>` with a `<figcaption>` (figcaption sourced from the
> manifest caption). First image's `<img>` — without `loading="lazy"`; every subsequent one
> — with it; `decoding="async"` on all. No orphan images (each `<figure>` is preceded by a
> `<p>` lead-in). The lead-in `<p>` must not duplicate the `<figcaption>`; `alt` must not
> duplicate the `<figcaption>`." (AGENTS.md §4)

> "Images wrapped in `<figure>` (inline style
> `display: block; width: max-content; max-width: 100%; margin: 4px auto;`) with a
> `<figcaption>` (a `<b>` lead-in label distinct from the alt + description) and
> `decoding="async"`. First image — without `loading="lazy"`; every subsequent one — with
> it. No `<figure>` nested inside `<p>`. No orphan images (each is preceded by a `<p>`
> lead-in)." (AGENTS.md §4)

This Story **preserves** these criteria and is constrained by them: every `<figure>` keeps a `<p>` directly above it (FR-6,
FR-7, FR-10, FR-11, FR-34; "directly above" is the FR-17 definition); the paragraph above does not duplicate the figcaption
(FR-7, FR-12); `alt` does not duplicate the figcaption or the `description` (FR-2). The figcaption text is the Vision
`description` copied unedited, so FR-1 is what makes the figcaption pointer-free. Nothing in FR-1 to FR-35 permits a figure
without a paragraph above it, or two figures in a row.

### FR-37: Video embed survives and its figure/figcaption rules hold

> "**A video embed present in the input is present in the output.** A YouTube/Vimeo
> `<iframe>` in the source description must survive into every generated language version.
> Losing it is a bug, not a stylistic choice — see `src/utils/video-manifest.ts`." (AGENTS.md §4)

> "Video iframes (YouTube/Vimeo) wrapped in `<figure>` (aspect-ratio on the `<figure>`) with
> a `<figcaption>` in the artifact's own language (`Відеоогляд [Product]` for uk-UA,
> "Video review of [Product]" for en-*; see `FIGCAPTION_TEMPLATES` in
> `src/utils/video-figure.ts`); `src` preserved with `rel=0` ensured; `loading="lazy"` + the
> standard `allow`/`referrerpolicy`/`allowfullscreen` set; no `<figure>` nested inside `<p>`." (AGENTS.md §4)

This Story **preserves** these criteria: FR-9, FR-11, FR-13 and FR-15 change only the *wording* of the paragraph that
precedes the embed (no spatial pointer), never whether the embed is present, wrapped, or captioned. The restored-embed
`<p>` (FR-15) remains present.

### FR-38: Spec-count and unit parity are unaffected

> "Space between number and unit: `1.75 mm`, `200 °C` (not `1.75mm`)." and "Spec count on output = spec count on input.
> Don't change values or units." (AGENTS.md §4)

This Story **preserves** these criteria: it does not touch `input.specs`, the spec-parity gates or `validateSpecsGrounding`
; the liveliness rules (FR-20) add no spec and change no value or
unit.

### FR-39: SEO meta limits remain true

> "SEO: meta_title ≤ 55 chars; meta_description ≤ 155, ends with CTA ➔. **No currency
> symbol** — price is not available at the Task B stage, and `task-b.ts` forbids inventing
> one; price/priceCurrency ship via Schema.org Offer microdata instead." (AGENTS.md §4)

This Story **preserves** these criteria: `task-b.ts` is not changed, and the `meta-description-currency` rule stays
disarmed (AGENTS.md §4). Nothing in this Story can change `meta_title` or `meta_description`.

## Functional requirements added in v3, v5 and v6

**FR-42, FR-43 and FR-44 below are PROPOSED DEFAULTS (OD-21, OD-22, OD-24 with OD-23 (c)), not owner decisions.** A plain `/so:approve` of this Specification would accept them as written unless the owner answers the Open Decision named in the heading, in the approval comment. They close none of them.

### FR-40: Reach of the operator notes — WITHDRAWN in v6

Withdrawn by the owner on 2026-10-19 (Story v5: the operator-notes fields are not needed). The number is kept so that no requirement is renumbered. Nothing in this Specification requires it, and nothing may be built or tested for it. Carve-out: the absence pins of FR-42 and FR-44 and the test removals of NFR-14 are not built or tested *for* this withdrawn requirement; they check that the feature is absent or remove its remnants, are PROPOSED DEFAULTS, and are not forbidden by this sentence.

### FR-41: "Clear All" resets the operator-note textareas — WITHDRAWN in v6

Withdrawn by the owner on 2026-10-19 (Story v5: the operator-notes fields are not needed). The number is kept so that no requirement is renumbered. Nothing in this Specification requires it, and nothing may be built or tested for it. Carve-out: the absence pins of FR-42 and FR-44 and the test removals of NFR-14 are not built or tested *for* this withdrawn requirement; they check that the feature is absent or remove its remnants, are PROPOSED DEFAULTS, and are not forbidden by this sentence.

### FR-42: The master `[SOURCE FIDELITY]` input-scope bullets return to their pre-Story text (PROPOSED DEFAULT, OD-21 — accepted by a plain `/so:approve` unless the owner answers OD-21)

**PROPOSED DEFAULT (OD-21) — a proposal only; the owner has not answered OD-21. A plain `/so:approve` would accept option (a) as the approved text unless the owner answers OD-21 in the approval comment.** The only owner statements on record are the
withdrawal of 2026-10-19 and "modify ... master-system-prompt.ts, path 1"; neither says what the two bullets become. This
requirement states option (a) of OD-21. If the owner chooses (b) (a count-free wording that names only the three blocks) or (c),
only the Assert-present literals below change; the Assert-absent literals and the structure of the requirement hold.

In `MASTER_SYSTEM_PROMPT` (FROZEN, §9 STOP, NFR-15) the `STRICT INPUT SCOPE` and `INTERNAL RECONCILIATION` bullets of
`[SOURCE FIDELITY]` are identical to their text at the Story's merge base `120dcbc` (the commit at which the branch started, as FR-27 pins it; `main` is not used as a moving
reference), so the net diff of the master against `120dcbc` contains no hunk inside `[SOURCE FIDELITY]`. The remaining US-9.1 edits of the master (FR-5 to FR-9, FR-20) are not changed by
this requirement.

- **Assert present** (in `MASTER_SYSTEM_PROMPT`, whitespace-collapsed): `the provided [Raw Description], [Technical Specs] or [Supplemental Content]` and `scan the three input blocks for numbers that describe the SAME quantity`.
- **Assert absent** (in `MASTER_SYSTEM_PROMPT`): `Operator Notes`, `operatorNotes`, `the input blocks you were given`.
- **Consequence for other prompts (no new requirement):** `systemBlocks[0]` of a `buildPromptC` description prompt and of a
  `buildOptimizerPrompt` prompt equals `MASTER_SYSTEM_PROMPT` (FR-23), so it carries the same bullets; FR-23's statements about
  block 1 and `userContent` are unchanged.
- **Obsolete assertion (recorded, not edited here):** the existing `src/prompt-core/master-system-prompt.operator-notes.spec.ts`
  asserts that `three input blocks` is ABSENT and that `[Operator Notes]` is present; both contradict this requirement. That spec
  belongs to the withdrawn FR-29 and is handled under NFR-14, never by weakening it silently.

**Failure path:** a master that still contains `Operator Notes`, or whose two bullets differ from the Assert-present text, is a
failing test. The test compares against the literal strings above, not against text copied from the current output.

### FR-43: The golden `full-description-prompts.json` is regenerated for the revert, with a reviewed diff limited to the two bullets (PROPOSED DEFAULT, OD-22 — accepted by a plain `/so:approve` unless the owner answers OD-22)

**PROPOSED DEFAULT (OD-22) — a proposal only; the owner has not answered OD-22. A plain `/so:approve` would accept this regeneration rule unless the owner answers OD-22 in the approval comment.** `test/fixtures/golden/full-description-prompts.json`
carries the notes-bearing master text in `systemBlocks[0]` of ten cases (the 7 Task A cases and the 3 `c/*` cases; NFR-9 item 1).
After the FR-42 revert it is regenerated with the repository's existing golden mechanism, in the same commit as the master revert.

- **Assert (diff scope):** the regenerated file differs from the file as committed before the regeneration only in the text of the
  `STRICT INPUT SCOPE` and `INTERNAL RECONCILIATION` bullets inside `systemBlocks[0]` of those ten cases. No `userContent`, no
  block 1, no overlay block and no `translate/*` entry changes.
- **Assert (independent oracle; AGENTS.md §7.7 treats asserting on copied-from-actual output as weakening):** for each of the ten
  cases, the new `systemBlocks[0]` equals the old one with the two bullets replaced by the FR-42 Assert-present text, checked
  against those literal strings and not against the generator's own output.
- **Assert absent:** the string `Operator Notes` in the file (the file holds it ten times before the revert).
- Other fixtures and specs that carry the notes shape (the OD-22 list: `test/fixtures/task-a-user-content-inputs.ts`,
  `test/fixtures/faq-pipeline.ts` and the specs named in NFR-14) follow NFR-14, not this requirement.

**Failure path:** any other hunk in the regenerated diff, or a regeneration that is not backed by the literal oracle, is a
finding; the golden is never regenerated to make a failing test pass.

### FR-44: The withdrawal leaves absence pins and no operator-notes code path (PROPOSED DEFAULT, OD-24 with OD-23 (c) — accepted by a plain `/so:approve` unless the owner answers OD-24 and OD-23)

**PROPOSED DEFAULT (OD-24, OD-23 (c)) — a proposal only; the owner has not answered either. A plain `/so:approve` would accept these pins unless the owner answers OD-24 and OD-23 in the approval comment.** These are tests of the *absence*
of the withdrawn feature; they are not tests of the withdrawn FR stubs, and the carve-out written into each stub excepts them from "nothing may be built or tested for it".

1. **Master.** `MASTER_SYSTEM_PROMPT` contains no `Operator Notes` (the same assertion as FR-42, listed so that the pin survives
   if FR-42's option changes).
2. **`userContent`.** For every input of the FR-27 set (Tier A and Tier B, Task A and the Doc wrapper), `userContent` contains
   no `[Operator Notes]`. A `ProductInput` object that carries a stray `operatorNotes` property produces a `buildPromptA` and a
   `buildPromptADoc` payload byte-identical to the same input without that property: no prompt builder reads, renders or sends it.
3. **Legacy history entry (OD-23 (c)).** A stored history entry that carries an `operatorNotes` property is restored without
   error, and the value is not shown in any field and not sent with the next request. No migration of stored entries is
   performed (NFR-13). (Open Decisions v5 notes that this carry-through was not tested when the option was written.)
4. **Numeric-fidelity sources and FAQ trigger.** Two checks, each with its own input and expected outcome. "As at the merge base" below
   means the commit `120dcbc` at which the Story's branch started (FR-27), not the moving `main`.
   1. *Numeric-fidelity sources.* No spec at the merge base asserts the source list of `numericFidelitySources` (the only two
      references are comments), so the existing specs cannot fail this half; the following check does. **Input:** a `ProductInput`
      whose `specs`, `description` and `name` together contain at least one number (so that the no-op guard of
      `validateAltNumericFidelity` does not apply) but do not contain the number `777`, and that carries a stray `operatorNotes`
      property whose value contains `777 Вт`; and a generated description whose figure `alt` or `<figcaption>` states `777 Вт`.
      **Expected:** the orchestrator's quality gate reports an `alt-numeric-not-grounded` error whose detail names `777`, exactly as
      it does for the same input without the stray property: the stray value grounds nothing. (The function is private; the check
      goes through the orchestrator's own assembly of the sources. A check that calls `validateAltNumericFidelity` or
      `validateAltNumericFidelityDoc` with hand-built sources does not exercise `numericFidelitySources` and does not satisfy this
      item.) The number `777` is illustrative: any number that occurs only in the stray value serves.
   2. *FAQ trigger.* **Input:** a `ProductInput` with no `supplementalContent` (`undefined`) and a stray `operatorNotes` property
      with a non-blank value. **Expected:** no FAQ request is made (no `FAQ (<locale>)` text call) for any store language, exactly as
      for the same input without the stray property. **Specs relied on at the merge base, passing unmodified:** the
      `describe('R6 (human resolution) — FAQ artifact: data-driven, all store languages, any template', ...)` block of
      `src/services/content-orchestrator.simplified.spec.ts` (lines 311 to 395 at `120dcbc`, including its `supplementalContent`
      cases), which asserts that `supplementalContent` drives the FAQ (present: one FAQ per store language; `undefined` or
      whitespace-only: none). That block covers the `supplementalContent` trigger only; the stray-property input above is what
      makes the item able to fail.
5. **Script.** `tools/measure-description.ts` has no operator-notes option and accepts no operator-notes input text (FR-32 D-10:
   the optional input texts are the specs and the product name). **PROPOSED DEFAULT for the observable behaviour (this
   Specification's proposal; neither the Story nor Open Decisions state it):** invoked with any of `--notes-usage-scenarios`,
   `--notes-test-results`, `--notes-previous-generation-comparison` or `--notes-limitations`, with or without a value, the script
   treats it as an unknown argument: it writes `unknown argument "<flag>"` followed by its usage text to stderr, prints no report,
   reads no file, and exits non-zero (status 2, the status it already uses for an unusable invocation and for any unknown
   argument). The usage text lists none of the four options. A test runs the script with one of the four flags and a valid
   `--html` and `--input` and asserts the non-zero status, the `unknown argument` text and the absence of the four option names
   from the usage text.

**Failure path:** any of these found failing means a remnant of the withdrawn feature; it is fixed in code, not by relaxing the pin.

## Non-functional requirements

- **NFR-1 (prompt caching, AGENTS.md §3):** `systemBlocks` are not collapsed into `userContent`. The shared liveliness block
  (FR-20) and the `[NO PICTURE REFERENCES` rule (FR-5) are part of the cached master system prompt. The master change invalidates the prompt cache once for all stores; that
  is accepted by the Story and is not a defect. The same edit invalidates the cached block 0 of the Task C description
  translation and of the optimizer, which embed the master (FR-23); that is a consequence of the owner's decision on B1.
- **NFR-2 (provider independence, §3 Rule 1):** no behaviour required here depends on the active provider; prompt text, the
  detector and the script are provider-neutral.
- **NFR-3 (retrieval separation, §3 Rule 2):** search and page fetch stay out of generation. Nothing in this Story adds retrieval to generation or generation to retrieval. (No
  automated check exists for this rule; it is stated here so it is reviewed.)
- **NFR-4 (secrets, §3 Rule 4):** no key, token or secret enters the bundle, a prompt text, or the
  script's output.
- **NFR-5 (prompts out of code, §3 Rule 3):** the new prompt wording lives in `prompts/` or versioned constants
  (`constants.ts`), not as strings inside services. The two warning-text edits in the orchestrator (FR-14) are edits to
  existing text and add no new prompt.
- **NFR-6 (determinism):** `findImageDeixis`, `collectFigureDeixis` and the measurement script are pure functions of their
  inputs: no wall-clock, no randomness, no network. The byte-identical contract (FR-27) is deterministic.
- **NFR-7 (guidance for the plan, not asserted by a test):** the source analysis asks for a detector module with no
  dependency on services, so that `output-validator.ts` and `image-placeholder.ts` can both use it without an import cycle.
  How is the plan's.
- **NFR-8 (store/locale source):** no locale list, currency symbol or store list is hard-coded in the new code; the seven
  base languages of FR-16 correspond to the languages `STORE_REGISTRY` publishes and the primary-subtag mapping does not
  introduce a separate registry.
- **NFR-9 (existing tests remain green; gate):** the §6 Definition of Done passes. **Tests that change because a requirement
  changes.** The v3 list was found by searching `src` and `test` (all `.ts`/`.json`) for the old prompt literals `§3
  FUNCTIONALITY`, `lead-in <p> in the body language`, `introduces what the image shows`, `introduced by its own lead-in`,
  `substantive lead-in`, `sensible lead-in paragraph`, `own lead-in`; that search missed every test that consumes the master
  as a whole. v4 states the list at payload level (impact analysis v2):
  1. **Fail by design, handled under a named rule, never by weakening:**
     - `test/fixtures/golden/full-description-prompts.json`, checked by `src/prompts/full-description.golden.spec.ts` (also
       referenced by `task-a.spec.ts` and `task-a-doc.spec.ts`): block 0 moves in 10 of 12 cases (the 7 Task A cases and the 3
       `c/*` cases), block 1 in 7, the overlay block in 5, `userContent` in 3 (the video cases, Tier B); the two `translate/*`
       cases and the block 1 and `userContent` of the `c/*` cases do not move. It is regenerated under FR-27's rule with a
       reviewed diff, never a blind update.
     - **`src/prompts/task-c.description-bytes.spec.ts`** with `test/fixtures/golden/task-c-description-prompts.json`: the 96
       per-case tests fail **at `systemBlocks[0]` only** by design (FR-23); its premise tests stay green; block 1 and
       `userContent` digests must not move; how it returns to green is plan-gate item Q1, answered by the owner on 2026-10-18 as option (b) (FR-23). AGENTS.md §7.7 applies: this
       is a guard whose stated rule a requirement changed, so it is named here and not weakened silently.
  2. **Consumers of the master that must be re-run and stay green (or be updated honestly), named so that no reviewer takes
     them for untouched:** `src/prompts/task-c.spec.ts` (asserts Task C carries `NUMERIC_SOURCE_FIDELITY_RULES`),
     `src/prompts/task-c.faq.spec.ts` and `test/fixtures/faq-pipeline.ts` (positional `slice(0, 400)` / `slice(3000, 3400)`
     over the master: after an insertion the "FAQ prompt carries no master fragment" negative check examines different text),
     `src/services/content-orchestrator.faq-standalone.spec.ts`, `src/prompt-core/protected-name-precedence.spec.ts` and
     `src/prompt-core/constants.spec.ts` (search or slice the master), `src/utils/image-figure-style.prompt-examples.spec.ts`
     (slices the master from `FIGURE FORMAT — wrap every image`, pins `short scannable description of what the image shows`;
     must stay green because no requirement edits `FIGURE FORMAT`), `src/prompts/optimizer.spec.ts` (behavioural; the
     optimizer has no byte golden), and the `task-a.spec.ts` AC-9b block and `task-a-doc.spec.ts` line-229 block, which re-pin
     from the regenerated golden.
  3. No spec asserts the old pointing literals; the specs that mention `§3 FUNCTIONALITY` (`master-system-prompt.spec.ts`,
     `master-system-prompt.v4.spec.ts`, `task-a.spec.ts`) pin text that must **stay** (FR-9, FR-11).

  Existing tests that pin phrases
  this Story must keep (`no orphan images`, `IMAGE GROUNDING LOCK stands` in `NUMERIC_SOURCE_FIDELITY_RULES`, `one sentence` /
  `differ` / `NUMBERS ARE THE HIGHEST-RISK ELEMENT`, the image-markers span of `[IMAGE HANDLING]`) are not edited to pass.
  Any existing test that asserts "no findings" on a fixture containing a picture-reference phrase will see the new warnings
  (source analysis, risks); those tests are updated honestly, not loosened without a recorded reason.
- **NFR-10 (FROZEN discipline):** the §9 STOP applies before any edit to `task-a.ts`, `master-system-prompt.ts` or
  `output-validator.ts`, per file, and `bash arch-guard.sh --rebaseline` follows in the same commit as the approved edit.
  Whether those commits are one or three was OD-12 point 5. By-name instructions are on record (OD-12 v5, Scope row):
  `output-validator.ts` on 2026-10-18 (hunks committed), `task-a.ts` and `master-system-prompt.ts` on 2026-10-19; this
  Specification records them and grants nothing. The scope of the 2026-10-19 instruction is the open OD-25 (NFR-15). The owner's
  earlier stated INTENT of 2026-10-18 (order `task-a.ts`, `output-validator.ts`, `master-system-prompt.ts` last; one commit per
  task with `--rebaseline`) is history.
- **NFR-11 (untrusted input):** withdrawn in v6 (it covered the operator notes; no new free-text input is added by this Story).
- **NFR-12 (nothing else changes):** no provider selection, request shape, retry, timeout, 429 handling or malformed-JSON
  handling changes. The Vision pre-pass JSON field set (`description`, `alt`, and the other existing fields) is unchanged; only
  the instructions for two of its fields change (FR-1, FR-2). New findings are warnings and never feed the repair cycle
  (FR-18, FR-19).
- **NFR-13 (delivery of the removal; PROPOSED DEFAULT, OD-23 — a proposal only, not answered by the owner; a plain `/so:approve` would accept it unless the owner answers OD-23 in the approval comment):** the operator-notes
  code is removed by **forward commits on the existing branch**, one per task, each FROZEN file's commit carrying
  `bash arch-guard.sh --rebaseline` and the `.arch-guard-checksums` change in the same commit (NFR-10). Verifiable by history:
  the commit `09f87dc` (the branch tip on which this v7 was written; the branch's merge base with `main` is `120dcbc`, as FR-27 pins it) is an ancestor of the branch tip after the removal, and no
  force-push or history rewrite is performed. No migration of browser history is performed (`seo_gen_history`; FR-44 item 3).
  Updating the title and body of draft PR #142 is **not** part of this delivery: any write to a remote belongs to
  `so-pr-creator` on a separate, explicit human instruction (AGENTS.md §7 item 10). What "path 1" means beyond the Story's
  rendering "amend US-9.1 on its branch" is the owner's to confirm (OD-23 (b)) and is not decided here.
- **NFR-14 (disposition of the tests of the withdrawn feature; PROPOSED DEFAULT, OD-24 — a proposal only, not answered by the
  owner; a plain `/so:approve` would accept it unless the owner answers OD-24 in the approval comment):** the TEST_WRITING stage removes exactly the tests of the withdrawn requirements (FR-24 to FR-26, FR-28 to FR-31, FR-40,
  FR-41), and every deletion is traced in the test artifacts to the withdrawn FR stub it served. Those tests, as OD-24 lists them
  on the branch, are the specs `src/prompts/operator-notes.spec.ts`, `src/prompts/task-a.operator-notes.spec.ts`,
  `src/prompt-core/master-system-prompt.operator-notes.spec.ts`, `src/services/content-orchestrator.operator-notes.spec.ts`,
  `src/services/history.service.operator-notes.spec.ts`, `src/app/app.component.operator-notes.spec.ts`,
  `src/app/operator-notes-form-state.spec.ts` and `src/app/components/operator-notes-fields/operator-notes-fields.component.spec.ts`,
  and the operator-notes cases inside the shared specs and fixtures of OD-22 (`test/fixtures/task-a-user-content-inputs.ts`,
  `test/fixtures/faq-pipeline.ts`, `src/prompts/task-a.user-content.golden.spec.ts`, `src/prompts/full-description.golden.us91.spec.ts`,
  `src/prompts/task-c.master-reach.spec.ts`, `src/prompts/optimizer.master-reach.spec.ts`,
  `src/prompts/task-a-doc.figure-placement.spec.ts`, `test/faq-pipeline.master-leak.spec.ts`, `test/measure-description.cli.spec.ts`).
  The absence pins of FR-44 and the FR-27 Tier A / Tier B golden stay. No test of a surviving requirement is touched, weakened or
  deleted (AGENTS.md §5, §7 item 7). **Open owner question (Open questions, Q-D):** the sources do not say that the withdrawal
  decision authorises deleting these specs.
- **NFR-15 (scope of the FROZEN-file instruction of 2026-10-19; PROPOSED DEFAULT, OD-25 — a proposal only, not answered by the
  owner; a plain `/so:approve` would accept it unless the owner answers OD-25 in the approval comment):** the instruction covers the **withdrawal hunks only**, and this Specification lists them as the §9 approval-request
  text: (1) in `src/prompts/task-a.ts`, the import and the call that emit the `[Operator Notes]` block into `userContent`, removed
  without any other change to the file; (2) in `src/prompt-core/master-system-prompt.ts`, the two `[SOURCE FIDELITY]` bullets set
  to the FR-42 text, without any other change to the file. The other US-9.1 hunks of both files (FR-5 to FR-9, FR-11, FR-20) are
  already committed under earlier owner-approved grants (the `task-a.ts` hunks of FR-11 in `87fb3c0`, `7c8fae9`, `266cd9c`; the master hunks in `a0e33a5`, `3110e94`, `18cad1f`, `ecaa2fd`, `d5d207a`) and are not reopened; the master hunk that FR-42 reverts and the `task-a.ts` hunk that (1) removes are `6db2885` and `7397081`. The §9 STOP is still performed in the session that edits: the
  owner restates the by-name instruction there, and a hunk outside (1) and (2) stops the work. All other removal hunks (the Generator
  form, `ProductInput`, the orchestrator, the history service, the app component, the script) are in non-FROZEN files and are the
  plan's. Whether the instruction instead covers more (option (ii) or (iii) of OD-25) is the owner's to answer.

## Out of scope

- Raising `image-deixis` (or `image-caption-deixis`) from `warning` to `error`. The source analysis defers it to "after several
  real runs"; it is a follow-up decision.
- A validator or QA warning for the `alt` carrier (FR-18 carrier table): `alt` is reported by `collectFigureDeixis` and the
  script only.
- Any change to `STORE_REGISTRY`, models/providers, template schemas, or non-image tone rules not listed in FR-20 to FR-22.
- Re-analysing images already marked `done` in the current session. Vision results live only in the in-memory manifest signal,
  so a fresh upload is analysed with the new prompt; a forced re-run is not required and no stored-result migration exists.
- Any new Generator input field for operator-supplied facts; changing the FAQ form's `supplementalContent`; any change
  to `runFaqPipeline` or `faq-form.ts`.
- Native-speaker review of the pl/de/es/pt (and ru/en) deixis patterns; it is a precondition for promoting `image-deixis` to
  `error`, not for this delivery.
- Editing AGENTS.md §4 (carried verbatim; the word "lead-in" stays there).
- Editing the translation files (`task-c.ts`, `task-translate.ts`), `optimizer.ts`, `task-b.ts`, and the SEO-meta, slug and FAQ
  prompts. At payload level the Task C description-translation prompt and
  the optimizer prompt still inherit the new master through block 0 (FR-23); making them behave differently (a matching scope
  sentence for the FR-5 text, a sentence-count check in `validateStructuralParity`, an edit of the optimizer's own "lead-in"
  figcaption instruction, a live comparison in the gate) would be a new requirement and is not specified here (note G).
- Rewording the master `FIGURE FORMAT` line ("short scannable description of what the image shows") and the English manifest
  `caption` (note H).
- Resolving what Open Decisions v6 still lists as open: OD-10 D-3 to D-5, D-7 and D-9, OD-13 (rest), OD-15
  and OD-21 to OD-32 are open items, not requirements (OD-11 is moot-by-waiver). (The OD-20 (3) residue is a requirement as of v5: FR-32. FR-42 to FR-44 and
  NFR-13 to NFR-15 state the PROPOSED DEFAULTS of OD-21 to OD-25 so that they are testable if accepted; they close none of them. FR-34 and FR-35 and the matching traceability rows state the PROPOSED DEFAULTS of OD-26 to OD-32 for the same reason.)
- The withdrawn operator-note feature in any form: the four Generator textareas, `ProductInput.operatorNotes`, the
  `[Operator Notes]` block, the `STRICT INPUT SCOPE` / `numericFidelitySources` extensions, history persistence and restore, the
  reach rule, the FAQ guard and the "Clear All" reset (Story v5, AC-9 withdrawn).
- Rewriting the branch history, force-pushing, updating draft PR #142, and migrating browser history entries (NFR-13).
- Giving `C3D_TOV_BASE_OVERLAY` the APPLICATIONS or HEADINGS rules.
- An exemption list for fixed CTA or store text in the script's "number absent from the input" check (FR-32 D-10).
- Adding a TypeScript runner or any other dependency to execute the script (that would be a dependency change requiring its
  own approval, AGENTS.md §1/§7.8); how the script runs is settled by OD-9 (FR-32).
- Committing the git-ignored `Knowledge/` reference outputs under a tracked path (OD-13 asks whether to; this Specification
  restates the prompt text instead and does not decide the fixture question).
- Performing the AC-11/AC-12 live runs, producing script output as acceptance evidence for them, or measuring the headline outcome:
  waived by the owner (Story v6). The criterion text is retained only; any later run is the owner's own action outside the gate.
- Changing `tools/measure-description.ts`, `src/utils/description-metrics.ts` or their tests because of the waiver (OD-30 PROPOSED
  DEFAULT: unchanged; the thresholds stay implemented).
- Adding a live check of the AC-8 translator and optimizer residual, or of any non-uk-UA output language, because of the waiver
  (OD-31 and OD-15 stay as recorded).

## Open questions

No Open Decision is `blocking: true`; OD-1 is moot (the fields it concerned are withdrawn, Story v5). At HUMAN_SPEC_APPROVAL on spec v2
(2026-10-17) the owner resolved OD-2 (a)(b)(c), OD-3, OD-4, OD-5, OD-6, OD-16, OD-17, OD-19 parts (1 mechanism)(3)(4), OD-20(1),
OD-10 part (2) and the OD-14 soft-target part, and confirmed FR-7..FR-9 (OD-13 part). With `/so:approve` at HUMAN_PLAN_APPROVAL
(2026-10-18; the plan gate itself was not approved) the owner resolved OD-2 R1/R2, OD-7, OD-8, OD-9, OD-14, OD-18, OD-19 (1b)(2),
OD-20 (2)(3) and the D-10 part of OD-10, resolved OD-11 in part, and stated an order of the FROZEN-file approvals as intent only
(OD-12). This Specification applies those resolutions as recorded in Open Decisions v4 and does not claim to have made any of
them. Every other OD stays **open and unresolved**; this Specification proposes defaults for some (flagged `PROPOSED DEFAULT`),
picks no answer, and marks none resolved. A PROPOSED DEFAULT is the Specification's proposal for the human to accept or change;
closing the Open Decision is the human's act. Where a decision answered only part of an OD, the unanswered part is listed as a
residue and is **not** decided here. The plan-gate items Q1, Q-TRANS and Q-OPT are answered (notes F and G); notes F, G and H
are not Open Decisions. Story v6 (2026-10-19) waived the AC-11/AC-12 hard script criteria: OD-11 and the live-run parts of OD-10 and OD-14 are moot-by-waiver, and OD-26 to OD-32 are raised with PROPOSED DEFAULTS (note J); nothing is resolved here.

| OD | Topic | Requirements that depend on it | Status in this revision (v8) |
|---|---|---|---|
| OD-1 | carrier of the four fields (`supplementalContent` vs a new property) | none (FR-25, FR-26, FR-28 withdrawn) | **Moot — withdrawn in v6** (Story v5, owner, 2026-10-19; Story Q1 "withdrawn with the fields"). Kept for history |
| OD-2 | history persistence and restore of `operatorNotes` | FR-24, FR-31, FR-41 | **Moot — withdrawn in v6** (Story v5, owner, 2026-10-19). Kept for history |
| OD-3 | RHYTHM against `[SENTENCE LENGTH]` | FR-20 | **resolved by owner, 2026-10-17** (band and "two consecutive" dropped; numbers only in `[SENTENCE LENGTH]`, which wins) |
| OD-4 | HOOK / SCENE against INVARIANT START | FR-20, FR-35 | **resolved by owner, 2026-10-17** (HOOK only the `[use-case]` slot; INVARIANT START unchanged; SCENE a statement, not for §1) |
| OD-5 | HEADINGS against `[HEADING FORM]`, overlay line, guard test | FR-22 | **resolved by owner, 2026-10-17** (functional §3 `<h2>` only; `<h3>` nominal; one colon or dash; overlay line amended; "never bare noun" not used). The new overlay line's final prose is the plan's, bound by FR-22's literals |
| OD-6 | Template and pipeline scope of the liveliness block | FR-20, FR-34, FR-35 | **resolved by owner, 2026-10-17** (applies where §3 exists; acceptance runs use Full description). v8 observation: the second clause has no live consumer after the waiver; the resolution is unedited |
| OD-7 | `image-deixis` precision and the undefined ru/en/pl/de/es/pt phrase lists | FR-16, FR-34 | **resolved by owner, 2026-10-18 (accept as built)** |
| OD-8 | What "the paragraph directly above a figure" means; video figure; figure with no paragraph | FR-17, FR-32, FR-34 | **resolved by owner, 2026-10-18 (accept as built; the FR-17 definitions)** |
| OD-9 | How `tools/measure-description.ts` runs and is tested | FR-32 | **resolved by owner, 2026-10-18 (accept as built), with the owner's condition: verify Node >= 22.18, else the D12 launcher.** The verification is not performed here |
| OD-10 | Metric definitions | FR-32, FR-35 | **part (2) (§3 section, D-6) resolved by owner, 2026-10-17 ("D-6 unchanged"); D-10 (input-set half of part (4)) resolved by owner, 2026-10-18.** Parts (1) D-3, D-4, D-5, (3) D-7 and the D-9 half of (4) open: PROPOSED DEFAULTS. **v8: the live-run use of D-9 and D-10 as the AC-12 hard acceptance on live runs is moot-by-waiver (Story v6); the definitions as the script's behaviour (AC-10, in scope) stay open as recorded (OD-30)** |
| OD-11 | Live-run acceptance: inputs, repeats, evidence, who runs, what a failure triggers | FR-34, FR-35 | **MOOT-BY-WAIVER (v8; Story v6, owner, 2026-10-19; nothing was measured).** History kept: partly resolved by owner, 2026-10-18 (three products x 2 runs, every run passes the hard criteria, the runs include a non-marker run, evidence = script output, a failure is reported and not auto-iterated; residue (a) which Center 3D Print and 3DDevice products, (b) who runs the live runs). The record binds no requirement |
| OD-12 | FROZEN-file approvals: timing, shape, commit shape (**before IMPLEMENTATION**) | FR-11, FR-13, FR-18, FR-5 to FR-9, FR-20, FR-22 and every FROZEN edit | **Given for two files on 2026-10-19:** the owner instructed "modify src/prompts/task-a.ts" and "modify src/prompt-core/master-system-prompt.ts" (history.jsonl). `output-validator.ts` is already approved and committed. The FR-11 hunks of `task-a.ts` are already committed too (`87fb3c0`, `7c8fae9`, `266cd9c`); the withdrawal hunks are the §9 request text (NFR-15). **What the 2026-10-19 instruction covers beyond them, and its lifetime, is the open OD-25 (row below)** |
| OD-13 | `Knowledge/` is git-ignored; prompt text restated here | all restated source text | **FR-7..FR-9 normative: resolved by owner, 2026-10-17.** Rest open: whether the other unpinned restated text (source-analysis items 2c and 2d, FR-10 to FR-15, FR-20 to FR-22 beyond their asserted literals) is normative; fixture location of the reference outputs |
| OD-14 | The "35" baseline; two soft targets already met by the defective text | FR-34, FR-35 | **soft-target part resolved by owner, 2026-10-17 (AC-12 amended); the "35" counting rule (reading B in FR-34) and the 48-word-hook item resolved by owner, 2026-10-18 (accept as built)**. **v8: the live-run part (the AC-11 comparison against the "35" baseline on live runs) is moot-by-waiver (Story v6); the recorded resolutions are kept** |
| OD-15 | What verifies the ban in non-uk-UA languages beyond the warning | Scope (Locales), FR-16 to FR-19 | open, no default |
| OD-16 | `operatorNotes` keys and empty rule | FR-25 | **Moot — withdrawn in v6** (Story v5, owner, 2026-10-19). Kept for history |
| OD-17 | `[Operator Notes]` block shape | FR-26 | **Moot — withdrawn in v6** (Story v5, owner, 2026-10-19). Kept for history |
| OD-18 | The oracle and input set for "byte-identical" | FR-27 (reworded in v6) | **resolved by owner, 2026-10-18 (accept as built; the two-tier golden of FR-27)** |
| OD-19 | Reach of `operatorNotes` | FR-26, FR-40 | **Moot — withdrawn in v6** (Story v5, owner, 2026-10-19). Kept for history |
| OD-20 | Extension of `STRICT INPUT SCOPE`, `numericFidelitySources`, the numeric rule text, the script's "input" | FR-32, FR-35 | **Moot for `STRICT INPUT SCOPE` and `numericFidelitySources` — withdrawn in v6.** (3) the script's input set is D-10: confirmed by owner, 2026-10-18 (D-10 now takes description, specs and name) |
| OD-21 | What the master `STRICT INPUT SCOPE` / `INTERNAL RECONCILIATION` text reverts to | FR-42, FR-21, NFR-15 | **OPEN, non-blocking.** PROPOSED DEFAULT (a): byte-identical to `main` ("three input blocks"). Not an owner decision. Clarification v5 asks for an answer before the plan gate |
| OD-22 | How the golden `full-description-prompts.json` and the other notes-bearing fixtures are brought back | FR-43, NFR-14 | **OPEN, non-blocking.** PROPOSED DEFAULT: regenerate in the same commit as the master revert; reviewed diff limited to the two bullets in the ten block-0 cases; independent literal oracle. Not an owner decision |
| OD-23 | How the removal is delivered on the pushed branch with open draft PR #142 (forward commits or rewrite; meaning of "path 1"; browser history; PR text) | NFR-13, FR-44 item 3 | **OPEN, non-blocking.** PROPOSED DEFAULT: forward commits, no rewrite or force-push, no browser-history migration, PR text only via a separately instructed `so-pr-creator`; (b) the meaning of "path 1" is for the owner to confirm. Not an owner decision |
| OD-24 | Disposition of the tests of the withdrawn feature | NFR-14, FR-44 | **OPEN, non-blocking.** PROPOSED DEFAULT: remove exactly the tests of the withdrawn FRs, each traced to its stub; add absence pins; keep the FR-27 golden. Whether the withdrawal authorises the deletion is for the owner. Not an owner decision |
| OD-25 | Scope and lifetime of the 2026-10-19 FROZEN-file instruction | NFR-15, Scope (FROZEN row), NFR-10 | **OPEN, non-blocking.** PROPOSED DEFAULT (i): the withdrawal hunks only; the owner restates the instruction in the editing session. Clarification v5 asks for an answer before the plan gate. Not an owner decision |
| OD-26 | What FR-34 / FR-35 say for a waived, unmeasured criterion | FR-34, FR-35, trace rows AC-11, AC-12 | **OPEN, non-blocking.** PROPOSED DEFAULT (a) with the meaning of (b): the criterion text is retained and marked WAIVED (owner, Story v6; not measured); the run rules, failure path and coverage note stay as the procedure that applies only if the runs are performed. Not an owner decision |
| OD-27 | What the `ac_test_matrix` rows AC-11 / AC-12 say, and how RECONCILIATION treats a WAIVED row | FR-34 (waiver record), trace rows | **OPEN, non-blocking.** PROPOSED DEFAULT: the rows state "WAIVED (owner, Story v6, 2026-10-19; not measured)", no test, the history event cited; RECONCILIATION records them as waived and unmeasured in `non_blocking_findings` and not as passed; no other row changes. Not an owner decision |
| OD-28 | Are the soft and manual items of AC-12 also waived | FR-35 | **OPEN, non-blocking.** PROPOSED DEFAULT (b): only the hard script criteria are waived; the soft items stay non-blocking and are recorded as not evidenced; the manual review is recorded as covered by the owner's statement, not as evidence. Not an owner decision |
| OD-29 | What the waiver covers (build, products, manual tests) and whether it lapses | FR-34 (waiver record) | **OPEN, non-blocking.** PROPOSED DEFAULT: the delivery as committed at the time of the decision, no product list demanded; a later change to a prompt-bearing file of this Story needs the owner to restate the waiver; a later failing run is reported and does not by itself void it. Not an owner decision |
| OD-30 | Does `tools/measure-description.ts` (AC-10) stay unchanged | FR-32, FR-33 (not touched by v8) | **OPEN, non-blocking.** PROPOSED DEFAULT: the script, `description-metrics.ts`, their tests and the AC-10 text are unchanged; the thresholds stay implemented; the OD-9 condition and the open OD-10 definitions are carried. Not an owner decision |
| OD-31 | Does the AC-8 translator / optimizer residual still need any live check | note G (not touched by v8), FR-20, FR-23 | **OPEN, non-blocking.** PROPOSED DEFAULT: unchanged by the waiver; the residual stays declared and the Q-TRANS comparison stays optional and outside the gate. Not an owner decision |
| OD-32 | Fate of task T51 and the live-run risk entries; how the unmeasured outcome is disclosed downstream | FR-34 (waiver record); plan, reconciliation report and Pull Request are downstream | **OPEN, non-blocking.** PROPOSED DEFAULT: T51 and plan risk R5 are superseded by the waiver with no new task; the unmeasured, owner-accepted status is stated verbatim in the reconciliation report, the matrix and the Pull Request "how verified" line (AGENTS.md section 13); no new persistent record. Not an owner decision |

Specification-level notes that are not Open Decisions:

- **A. (closed in v3.)** Source-analysis items with no pinning acceptance criterion: FR-7, FR-8 and FR-9 are confirmed as
  normative by the owner (2026-10-17, OD-13); their Assert-present / Assert-absent strings are requirements. The surrounding
  restated blocks stay illustrative. FR-15's template examples, FR-21 to FR-23's restated blocks and the FR-1, FR-2, FR-10 to
  FR-14 blocks keep their v2 status (OD-13 rest).
- **B. FR-36 to FR-39 trace (with AC-3 / AC-11 where noted) to the Story's "Touches generated HTML?" row**, which says these
  §4 criteria must not regress; they add no new behaviour and are preserve-only constraints. FR-36 additionally traces to
  AC-11 ("no figure without a paragraph above it, no two figures in a row").
- **C. (v1 note C, the FR-16 locale default, is withdrawn.)** The behaviour for an omitted locale is not specified.
- **D. Prompt-wording requirements are verified by presence and absence of strings.** Whether the model's behaviour changes is
  measurable only by the live runs of FR-34/FR-35, which are WAIVED (Story v6), so it is not measured in this delivery.
- **E. What still needs the human's confirmation (PROPOSED DEFAULTS no decision touched), at HUMAN_SPEC_APPROVAL:** FR-32 D-3,
  D-4, D-5, D-7, D-9 (metrics; OD-10 parts (1), (3) and the D-9 half of (4)), FR-20 (precedence sentence wording), FR-11 item 3
  (marker span, source wording). **Wording composed from an owner decision** (the meaning is the owner's, the literals are this
  Specification's testable rendering; the human may change a literal without changing the requirement): FR-11 item 2 (new
  `buildVideoBlock` span), FR-20 (SCENE, `[SENTENCE LENGTH]`, `[use-case]`, `apply only where §3 exists` literals), FR-22
  (`only for §3 <h2>`, `<h3> stay nominal`, `at most one colon or dash per heading`, `mandated section order`). **Confirmed by owner, 2026-10-18 (left this list in v5):** the self-scoping literal of FR-20 (Q-SCOPE; the
  three strings `govern writing a new description`, `when the task is to translate an existing text they do not apply` and `the
  source's sentences and their order are kept`, and the full sentence beside them, are normative VERBATIM; the v4 PROPOSED DEFAULT
  carried the clause "headings and order", now dropped); FR-27 (golden tiers and input set; OD-18); FR-17 (adjacency, video
  figure; OD-8) and with it FR-32 D-1 and D-2; FR-32 D-10 (OD-10(4), OD-20(3)); FR-34 (counting rule; OD-14; its live-run use is moot-by-waiver). **Calibration:**
  against the amended AC-12 the Story's corrected reference output meets 2 of the 2 computed soft items (FR-32), so the criterion
  is reachable.
- **F. (v4) Plan-gate item Q1 — the Task C guard.** Not an Open Decision; **answered by the owner, 2026-10-18 (plan-gate answer Q1): option (b).** Option **(a)**: a reviewed
  update of the block-0 record of `task-c-description-prompts.json`; option **(b)**: an amended `task-c.description-bytes.spec.ts`
  that compares block 0 with the live master. FR-23 fixes the required outcome (block 1 and `userContent` of all 96 cases
  unchanged; guard not weakened); the owner chose (b) at the plan gate, and the required outcome is unchanged.
- **G. (v4) Declared residual risk — translator and optimizer inheritance (plan risks R1a and R7a; Q-TRANS and Q-OPT stay
  open and are not resolved here).** The owner decided that the translation and optimizer prompts inherit the master (file
  level, FR-23) and that the shared block scopes itself to authoring (FR-20). What remains: (1) a translator that adds, splits
  or drops a sentence **inside a `<p>`** is invisible to `validateStructuralParity` (`structural-parity.ts`), which counts
  tags only (`<section>`, `<h2>`, `<h3>`, `<hr>`, `<figure>`, `<figcaption>`, `<table>`, `<tr>`, `<td>`, `<li>`) at `error`
  severity; no automated check in the gate can detect this, and the self-scoping sentence lowers the risk without removing it
  (a model may ignore it); the only evidence would be an opt-in live comparison outside the gate (not required by any
  requirement here); (2) the optimizer keeps its own instruction to re-author every figcaption "with a `<b>` lead-in" and says
  the master's `FIGURE FORMAT and PLACEMENT` apply, which sits next to the new no-pointer rule; the optimizer is in no
  acceptance run (OD-6). Whether to accept both as recorded, or to add a requirement (a matching scope sentence for the FR-5
  text, a sentence-count check, an edit of `TASK_OPTIMIZE_INSTRUCTION`, a live check) is for the human at the plan gate; each
  would be a new requirement and none is made by v4 or v5. The owner answered at the plan gate on 2026-10-18: Q-TRANS "options
  (1)+(3); optional live translation comparison for Creality Pika outside the gate" and Q-OPT "option (1)" (numbered as in plan
  v3); neither adds a requirement to this Specification, and the residual risk stays declared.
- **H. (v4) Coverage of model-authored figcaptions and `alt`.** Stated in FR-5 and cross-referenced in FR-34: FR-1 and FR-2
  reach marker-built figures only; FR-5 is the only requirement that reaches model-authored figcaptions and `alt`, with no
  warning behind it; AC-11's text covers all of them and is not changed (it is WAIVED, not measured). Whether to reword the master `FIGURE FORMAT` line (pinned by
  `image-figure-style.prompt-examples.spec.ts`) or the English manifest `caption` is a decision for the human; nothing is added
  for it here. Whether the live runs would include non-marker figures was settled on 2026-10-18 (OD-11: they do); with the live runs
  waived (Story v6) that answer is moot and kept as history (FR-34).
- **I. (v6) Withdrawal notes and open owner questions.** FR-42 to FR-44 and NFR-13 to NFR-15 are the PROPOSED DEFAULTS of OD-21
  to OD-25 and are the only requirements of v6 that do not trace to a positive acceptance criterion: they trace to the exclusions
  recorded in withdrawn AC-9 and to the withdrawal decision (traceability matrix). If the owner rejects a default, that
  requirement is replaced by the owner's answer; none of them is an owner decision. **Questions for the owner, recorded here and
  not answered by this Specification:** **Q-A (OD-21)** the final text of the two master bullets: (a) identical to `main`, (b) a
  count-free wording that names the three blocks, or (c) other; **Q-B (OD-25)** whether the 2026-10-19 instruction covers the
  withdrawal hunks only, those plus other needed hunks, or all US-9.1 hunks of both files, and in which session the edits happen;
  **Q-C (OD-23)** forward commits or history rewrite, what "path 1" means, and what happens to draft PR #142's text; **Q-D (OD-24)**
  whether the withdrawal authorises deleting the operator-notes specs; **Q-E (OD-22)** the regeneration mechanism and the oracle
  for the golden. Q-A and Q-B are the two that fix the text and the authority of a FROZEN edit (Clarification v5). **What a plain `/so:approve` does:** FR-42, FR-43, FR-44 and NFR-13, NFR-14, NFR-15 are PROPOSED DEFAULTS; approving this Specification without answering Q-A to Q-E accepts the labelled values as the approved text (it does not close OD-21 to OD-25 in the log). The owner changes one by answering it in the approval comment. One
  discrepancy of v7 is closed and one stands: Story v6 corrected its Scope row (it no longer says that no per-file FROZEN approval
  has been given), and the Open Decisions v5 note that later owner events of 2026-10-18 appear to bear on OD-10, OD-11 and
  OD-13 stands for OD-10 and OD-13 (this Specification keeps those open exactly as that log does) and is moot for OD-11 (waiver, Story v6).

- **J. (v8) Waiver notes and open owner questions.** Story v6 waives the AC-11/AC-12 hard script criteria on the owner's manual
  testing; nothing was measured. FR-34 and FR-35 keep their criterion text with a WAIVED note; the wording is the PROPOSED DEFAULT of
  OD-26 to OD-32 (not owner decisions; none is closed). **Questions for the owner, recorded and not answered by this
  Specification:** **Q-F (OD-26)** how FR-34 and FR-35 read for a waived criterion: (a) text retained with a WAIVED note
  (proposed), (b) a non-binding procedure, (c) stubbed like the withdrawn FRs; **Q-G (OD-27)** what the matrix rows and
  RECONCILIATION say for a WAIVED row; **Q-H (OD-28)** whether the soft and manual items of AC-12 are also waived; **Q-I (OD-29)**
  against which build, stores and templates the manual testing was done (including a run with non-marker figures) and whether the
  waiver lapses on a later prompt change; **Q-J (OD-30)** whether the script, `description-metrics.ts` and their tests stay exactly as
  built (proposed: yes; FR-32 and FR-33 are not touched); **Q-K (OD-31)** whether the AC-8 translator and optimizer residual (note G)
  needs any live check (proposed: unchanged); **Q-L (OD-32)** whether task T51 and plan risk R5 are retired and how the unmeasured
  outcome is disclosed in the reconciliation report and the Pull Request (proposed: superseded by the waiver, disclosed verbatim,
  AGENTS.md section 13). **What a plain `/so:approve` does:** it accepts the labelled values of OD-21 to OD-25 (note I) and of OD-26
  to OD-32 as written and closes none of them; the owner changes one by answering it in the approval comment.

No user acceptance of a "Not Ready" risk is recorded or needed: the clarification verdict is Ready for Specification.

## Traceability matrix

| Acceptance criterion | Satisfied by | Notes |
|---|---|---|
| AC-1 | FR-1, FR-2, FR-3, FR-4 | Vision pre-pass: description rule, alt rule, grounding sentence, retained phrases (literals listed per FR) |
| AC-2 | FR-5, FR-6, FR-7, FR-8, FR-9 | `[NO PICTURE REFERENCES` constant outside `[IMAGE HANDLING]`; removed phrases; narrative `<p>` retained. FR-7 to FR-9 beyond the AC-2 strings are normative: confirmed by owner, 2026-10-17 (OD-13) |
| AC-3 | FR-10, FR-11, FR-12, FR-13, FR-14, FR-27, FR-36, FR-37 | Doc, `task-a.ts` (instruction, video block with the pointer-free span, marker block), C3D override, validator messages, orchestrator warnings, with literal absent/present strings; pinned phrases preserved (FR-4, FR-10, FR-11; `§3 FUNCTIONALITY, before §7` intact) |
| AC-4 | FR-15 | No spatial pointer in any `LEAD_IN_TEMPLATES` entry |
| AC-5 | FR-16 | Seven base languages by primary subtag; uk positives/negatives; ≥ 2/2 for others; unknown → `null`. Non-uk lists: OD-7 |
| AC-6 | FR-17 | Three carriers only; non-adjacent paragraph not reported; adjacency defined (OD-8 confirmed by owner, 2026-10-18) |
| AC-7 | FR-18, FR-19 | `image-deixis` and `image-caption-deixis` at `warning`; per-carrier table |
| AC-8 | FR-20, FR-21, FR-22, FR-23 | Shared constant in master (RHYTHM without the 9-17 band, numbers only in `[SENTENCE LENGTH]`; HOOK on the `[use-case]` slot; SCENE a statement, not for §1; applies where §3 exists); store voice block wins; EXPERT3D-only additions (functional §3 `<h2>`, `<h3>` nominal, one colon or dash, amended overlay line, no "never bare noun"); C3D overlay untouched by FR-22; tone limits kept. **Last sentence (Story v4, file level):** `task-c.ts` and `task-translate.ts` not edited (FR-23 items 2, 5); description-translation prompts and the optimizer inherit the new master through block 0, block 1 and `userContent` unchanged (FR-23 items 3, 4, unchanged-bytes assertions); the shared liveliness block states that its rules govern writing a new description while a translation keeps the source's sentences (FR-20 self-scoping strings, literal confirmed by owner, 2026-10-18, Q-SCOPE). Q1 answered (note F: option (b)); residue: translator drift and optimizer instruction (note G). OD-3, OD-4, OD-5, OD-6 resolved by the owner |
| AC-9 | — (withdrawn in v6); exclusions testable by FR-42, FR-43, FR-44 (PROPOSED DEFAULTS, OD-21, OD-22, OD-24, OD-23 (c)); NFR-13 to NFR-15 (OD-23, OD-24, OD-25) | Story v5 withdrew AC-9: no Generator field, no `ProductInput` property, no `[Operator Notes]` block, no `STRICT INPUT SCOPE` / `numericFidelitySources` extension. FR-24 – FR-26, FR-28 – FR-31, FR-40 and FR-41 are withdrawn stubs; FR-27 is kept, reworded as the `userContent` golden for FR-11 (Tier A / Tier B) and traces to AC-3. FR-42 to FR-44 make the exclusions falsifiable; they are labelled PROPOSED DEFAULTS and need the owner's answers (note I) |
| AC-10 | FR-32, FR-33 | Script metrics with definitions D-1 to D-10 (per-section short-sentence count reported, no threshold) and non-zero exit. OD-9 and OD-20(3) (D-10) resolved 2026-10-18; OD-10 D-3 to D-5, D-7, D-9 open. Story v6 keeps AC-10 in scope: its exit-status thresholds name AC-11 hard items and AC-12 numbers, which are WAIVED as acceptance (FR-34, FR-35) but stay implemented and unchanged (PROPOSED DEFAULT, OD-30) |
| AC-11 | FR-34 (criterion text retained; **WAIVED (owner, Story v6, 2026-10-19; not measured)**, PROPOSED DEFAULT OD-26), FR-36 (preserve-only §4 structure constraint, covered at unit level) | Status: WAIVED and unmeasured; not "passed" and not "measured". No script output, product list or run count exists; the headline outcome (0 picture references) is accepted on the owner's word. Criterion text retained unchanged. Counting rule fixed (D-1 reading B; OD-14 confirmed 2026-10-18, its live-run part moot-by-waiver). OD-11 moot-by-waiver. Coverage (v4, criterion unchanged): FR-1 / FR-2 reach marker-built figures only; for model-authored figcaptions and `alt` FR-5 is the only requirement, with no warning (FR-5 coverage note; note H) |
| AC-12 | FR-35 (criterion text retained; hard criterion **WAIVED (owner, Story v6, 2026-10-19; not measured)**, PROPOSED DEFAULT OD-26, OD-28) | Status: hard script criterion (0 numbers absent from the input, D-9) WAIVED and unmeasured; no script output, product list or run count exists; the headline outcome (0 invented numbers) is accepted on the owner's word. Soft liveliness per Story v3, retained, non-blocking and not evidenced by any recorded run (OD-28 (b) default): three items, at least 2 of 3 — (1) «тож» + «Тому» ≤ 2 (D-8); (2) mean ≥ 12 and σ ≥ 5.5 as one item (D-5); (3) hook names the buyer's task (manual); per-section count reported with no threshold (D-6 unchanged); manual fact review recorded as covered by the owner's statement, not as evidence. OD-11 moot-by-waiver; OD-14 (35 rule) and OD-20(3) resolved 2026-10-18 (the live-run part of OD-14 moot-by-waiver) |

**Validation against the Story v6 AC list (v8).** AC-1 to AC-12 each have a row above; AC-9 is withdrawn (Story v5); AC-11 and AC-12 are WAIVED by the owner (Story v6) and are traced to FR-34 and FR-35 as retained criterion text, marked WAIVED and unmeasured, never as measured or passed.

Requirements with no direct acceptance criterion: FR-38 and FR-39 (preserve-only §4 constraints from the Story's
"Touches generated HTML?" row, Open questions B; FR-37 is traced to AC-3 for the
video wording and is otherwise preserve-only); FR-21 is the preserved-tone-limit half of AC-8; NFR-12 states that nothing
else changes. FR-24 – FR-26, FR-28 – FR-31, FR-40 and FR-41 are withdrawn (AC-9 is withdrawn); FR-27 is reworded and traces to AC-3. FR-42 to FR-44 trace to the exclusions of withdrawn AC-9 (no positive criterion; PROPOSED DEFAULTS, note I). NFR-13 to NFR-15 are delivery and process constraints from OD-23, OD-24 and OD-25 (PROPOSED DEFAULTS). No other FR is without an AC.
