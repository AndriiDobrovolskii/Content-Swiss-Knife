---
artifact: specification_review
story: US-9.1
version: 5
status: APPROVED
owner: so-spec-reviewer
created_at: 2026-10-18T10:19:20Z
updated_at: 2026-10-18T10:19:20Z
supersedes: docs/reviews/specifications/US-9.1-spec-review.md#4
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: open_decisions
    version: 4
open_decisions_blocking: false
---

# Spec Review: US-9.1 — No picture references and livelier descriptions (Creality Pika regression)

**Verdict:** PASS
**Loop-back:** n/a

> A `PASS` here is **not** human approval. Approval is recorded only by `/so:approve`
> (AGENTS.md §10). Specification v5 is a `DRAFT`: v4 was approved at HUMAN_SPEC_APPROVAL, v5 changes an approved literal
> (Q-SCOPE) and adds a requirement (FR-41), so a plain `/so:approve` on v5 is needed again. Nothing in this review approves a
> FROZEN-file edit or closes an Open Decision.

This is review v5, a focused re-review of Specification v5 (a loop-back revision, attempt 1 of 3, after the owner's 2026-10-18
plan-gate answers). It supersedes review v4 (`SUPERSEDED`; it judged Specification v4 and is overwritten at the same path).
Review v4's decision-by-decision checks of text that v5 does not touch are not repeated; they are re-confirmed below through the
carried non-blocking items.

Input currency: Story v4 (`DRAFT`, `updated_at` 2026-10-17T19:33:15Z, untouched), Specification v5 (`DRAFT`, `supersedes
...#4`, `updated_at` 2026-10-18T10:17:20Z), Open Decisions v4 (`DRAFT`, `updated_at` 10:09:20Z, `open_decisions_blocking:
false`), clarification report v4. The owner answers are read from the verbatim `note` of the last "Plan gate NOT approved" event
in `docs/workflow/history.jsonl` (`ts` 2026-10-18T10:08:01Z, actor sbruhov@gmail.com, `from` HUMAN_PLAN_APPROVAL `to`
SPECIFICATION). None of the inputs is `SUPERSEDED`. No Open Decision is `blocking: true`. The Specification contains no `TBD`,
`TODO`, `FIXME` or `???`. Authorities: AGENTS.md; `stage-map.yaml` (SPEC_REVIEW `loop_back` keys `changes_required` and
`changes_required_clarification`); `artifact-lifecycle.md` section 3.

**Limit of the drift check.** Specification v4 is not recoverable as a file (the Specification is untracked in git and v5
overwrote it at the same path; `git log` for it is empty). "Nothing else changed" was verified by (a) the v5 change table, (b) the
anchors review v4 quoted from v4 (FR-20 bullets, FR-22, FR-23, FR-29, FR-32 calibration table, FR-34, FR-40, note E, the NFR-9
list), all re-found in the same words except where the change table says otherwise, (c) FR numbering, and (d) a read of the whole
v5 file. A byte diff was not possible.

## Summary

Every change in the v5 table matches the owner's verbatim answer. The Q-SCOPE literal is applied exactly, in the one normative
place (FR-20) and the places that cite it; the old literal survives only as quoted superseded history. FR-41 is a faithful,
testable rendering of Q-CLEARALL. Every "confirmed by owner, 2026-10-18" mark corresponds to a verbatim answer and no mark goes
beyond it. Nothing the owner did not answer is closed, and no FROZEN-file approval is claimed. FR numbers are stable (41 `### FR-`
headings; only FR-41 appended). The remaining points are non-blocking wording and hygiene.

## 1. Acceptance-criterion coverage

Matrix re-derived from Story v4's AC text and the FR text, not read from the Specification's table. Only the rows v5 touches are
re-derived in depth; AC-1 to AC-8 (apart from the Q-SCOPE literal), AC-10 to AC-12 are unchanged in the Story and in the FRs that
satisfy them.

| AC | Story says | Specification satisfies it via | Verdict |
|---|---|---|---|
| AC-1 to AC-7 | unchanged | FR-1 to FR-19 | covered (unchanged) |
| AC-8 | shared constant; store voice wins; EXPERT3D-only additions; C3D not given them; tone limits kept; last sentence: translation files not edited, translation prompts and the optimizer inherit the master through block 0, block 1 and `userContent` unchanged, the shared block states its rules govern writing a new description while a translation keeps the source's sentences | FR-20 (self-scoping literal), FR-21, FR-22, FR-23 | covered. The Story says "keeps the source's sentences"; FR-20 now says "the source's sentences and their order are kept", i.e. the Story's words plus the order. See section 3 |
| AC-9 | four optional textareas; `ProductInput.operatorNotes`; `[Operator Notes]` from `task-a.ts`; byte-identical when empty; no FAQ trigger; `STRICT INPUT SCOPE` and `numericFidelitySources` extended; not persisted to `seo_gen_form_state` | FR-24 to FR-31, FR-40, **FR-41** | covered. FR-41 adds the reset of the textareas; see section 1.1 |
| AC-10 | script metrics and non-zero exit | FR-32, FR-33 | covered (D-10 now confirmed, D-3 to D-5, D-7, D-9 still PROPOSED DEFAULTS) |
| AC-11 | 0 deixis, no figure without a paragraph, none in a row, three live runs | FR-34, FR-36 | covered; criterion unchanged; OD-11 run rules now recorded |
| AC-12 | hard numbers; soft 2 of 3 | FR-35 | covered (unchanged) |

Requirements tracing to no AC (scope creep): none found. FR-38, FR-39 and FR-37 remain preserve-only §4 constraints, FR-21 is the
tone half of AC-8, NFR-12 states nothing else changes, FR-40 traces to AC-9. FR-41 is addressed next.

### 1.1 FR-41 (testability and the AC-9 trace)

- **What the owner said:** "Q-CLEARALL: reset the notes signal in clearAll (generator and ua-generator)." FR-41 renders this as
  "Clear All" setting the four textareas to the empty state in the `generator` and `ua-generator` modes. I checked the tree:
  `clearAll()` in `src/app/app.component.ts` (line 1061) has exactly the cases `'generator'` and `'ua-generator'`, and the UI
  labels are `Clear All` / `Очистити все`. The mode ids and the action name are facts of the product, not implementation design.
  "Notes signal" is the owner's implementation term; the Specification states the observable result instead, which is correct for
  a Specification.
- **Testable:** yes. Item 2 gives the oracle: after the action the `ProductInput` the next Generate / UA Description click builds
  has no `operatorNotes` key (FR-25's absence rule), including after a restore from history (FR-31). The Tests paragraph names two
  cases per mode (typed values; values restored from history) and both assertions (four values empty; next built input has no
  `operatorNotes`). The failure path states what a skipped reset does (the previous product's notes resent, FR-31 item 4).
- **Item 3 is a preserve-only fence** ("changes nothing else that Clear All does ... adds no write to `seo_gen_form_state` and does
  not delete or edit history records"). It adds no behaviour; it keeps FR-41 from being read as widening the Story's Out of
  scope. Acceptable.
- **Trace to AC-9 — my judgement: acceptable, not a scope-creep finding, but the trace is indirect.** AC-9's text does not mention
  clearing; it says the Generator form has four textareas and describes their carrier, the block, FAQ, persistence. The reset is
  part of the lifecycle of the textareas AC-9 introduces, and without it AC-9's own byte-identical and "empty textareas" contract
  is violable in practice (stale notes ride into the next product's request). The Specification states this honestly ("No
  requirement of v4 asked for it (plan-review N3) ... traces to AC-9, whose four textareas it completes") and the requirement
  exists because the owner directed it, not because the Specification invented it. It also does not conflict with Story Out of scope
  (that concerns `seo_gen_form_state` persistence). The same shape was accepted for FR-40 in reviews v3 and v4. I record it as N24
  rather than a blocker: the Story has no sentence that FR-41 can be read against, so the human should see at the gate that the
  trace is to the AC's intent, and the Story owner may add a line to AC-9 at the next Story revision.

## 2. Non-verifiable language

Quoted sentences checked in the text v5 added or changed:

- **FR-20 self-scoping literal** — "`These rules govern writing a new description; when the task is to translate an existing text
  they do not apply, and the source's sentences and their order are kept.`" Testable: three Assert-present substrings plus the
  FR-23 propagation assertion. By hand (whitespace collapsed, case-sensitive, ASCII apostrophe; the file contains zero `’`): all
  three substrings occur in the full sentence, in the FR-20 prose, and in the illustrative block (the block wraps the sentence
  across lines; collapsed it is identical). What no test can show (obedience by a translator or the optimizer) is stated by the
  Specification itself ("checked by presence only", note G). Honest; not a defect.
- **FR-41** — "sets the four operator-note textareas ... to the empty state (each value empty by FR-25's rule)" and "has no
  `operatorNotes` key". Both are decidable on the output; no vague wording.
- **FR-26 additions** — "Assert absent: `[Operator Notes]` in every instruction text of `task-a-doc.ts`" and "Assert present:
  ... `buildPromptA(...).userContent` contains the `[Operator Notes]` block". Decidable. See section 3 for fidelity.
- **FR-34** — "the owner's OD-11 answer requires such a run, so this exposure is accepted (2026-10-18)". It is a statement, not a
  requirement, and carries no test obligation; see N23 for the wording.
- Other changed prose (OD-9 "Node >= 22.18 is verified first, and only if it is not met is the D12 launcher fallback used") is a
  stated condition whose verification is assigned to the plan and implementation stages; the Specification says it does not
  perform it. Fine.

Otherwise none found in the v5 text.

## 3. Contradictions with the Story, and fidelity to the owner's answers

### 3.1 Story

- AC-8 last sentence versus FR-20 / FR-23: agree. Story: "a translation keeps the source's sentences". FR-20: "the source's
  sentences and their order are kept". The v4 concern (N18: "headings and order" stronger than the owner's words) is **closed**:
  "headings" is gone and the literal now carries only the owner's own addition, "their order", which the owner gave verbatim
  ("...and the source's sentences and their order are kept"). It is the owner's wording, not the Specification's.
- Story Out of scope (`seo_gen_form_state`, `supplementalContent`, `runFaqPipeline`) versus FR-41 item 3, FR-28, FR-31: agree.
- No contradiction between the Specification and Story v4. (Story v4 carries stale text recorded earlier as N19 and N16; the
  Story was not touched, so they remain; they are the Story owner's.)

### 3.2 Q-SCOPE literal, every place (checked by search of the whole file)

| Place | What it carries | Result |
|---|---|---|
| FR-20 self-scoping bullet (prose) | "source's sentences and their order are kept" | exact, no "headings" |
| FR-20 full literal (prose) | `These rules govern writing a new description; when the task is to translate an existing text they do not apply, and the source's sentences and their order are kept.` | exact; labelled VERBATIM and normative |
| FR-20 Assert-present (self-scoping item) | `govern writing a new description`, `when the task is to translate an existing text they do not apply`, `the source's sentences and their order are kept`, plus the full sentence | the three strings are consistent with each other and with the full sentence; ASCII apostrophe stated |
| FR-20 illustrative block, last paragraph | same sentence | identical after whitespace collapse |
| FR-23 Assert-present | "the three FR-20 self-scoping strings" in `systemBlocks[0].text` of `buildPromptC` and `buildOptimizerPrompt` | refers to the FR-20 strings; no second copy of the literal |
| Scope (Locales) | "its rules govern writing a new description and that a translation keeps the source's sentences (FR-20)" | consistent, no old literal |
| Note E | "the three strings ... and the full sentence beside them, are normative VERBATIM; the v4 PROPOSED DEFAULT carried the clause 'headings and order', now dropped" | consistent; old literal quoted as history only |
| Traceability AC-8 row | "keeps the source's sentences (FR-20 self-scoping strings, literal confirmed by owner, 2026-10-18, Q-SCOPE)" | consistent |
| v5 change table row 1 | quotes the superseded v4 text | allowed: quoted superseded history |

Search result: `headings and order` occurs once (note E, quoted as dropped); `sentences, headings` occurs once (the v5 change table,
quoted as the superseded v4 text). No normative place carries the old literal. The old literal also still sits in downstream
artifacts (impact analysis v3, implementation plan v3, task breakdown v2, plan review v2, and, as a quoted superseded row, Open
Decisions v4); those are re-baselined after HUMAN_SPEC_APPROVAL by the owner's own sequence ("then impact/plan/tasks
re-baseline"), not by this Specification (N25).

### 3.3 Each "confirmed by owner, 2026-10-18" mark against the verbatim answer

| Mark in v5 | Owner's verbatim text | Match |
|---|---|---|
| Q-SCOPE (FR-20, note E, AC-8 row) | "change the literal to '...they do not apply, and the source's sentences and their order are kept.' (drop 'headings'); update the three Assert-present strings and category 19" | exact. Category 19 is a plan test category and is correctly not in the Specification |
| Q-CLEARALL (FR-41) | "reset the notes signal in clearAll (generator and ua-generator)" | faithful, section 1.1 |
| OD-2 R1 (FR-31 item 4, FR-24) | "Q-OD2: defaults R1 and R2" | R1 is the resend after a restore; stated as the Open Decisions v4 records it |
| OD-2 R2 (FR-31 item 5, FR-24) | same | an entry with no notes empties the textareas; stated as recorded |
| OD-19 (1b) no (FR-26, FR-40, Scope) | "Q-OD19: (1b) no, (2) yes" | Doc instructions do not mention the block; matches the Open Decisions v4 record |
| OD-19 (2) yes (FR-26, FR-40, Scope) | same | Expert-3DPrinter receives and renders the notes; matches |
| OD-20 (2) (FR-30, FR-29 cross-reference) | "Q-OD20: defaults; script input set as D-10" | `NUMERIC_SOURCE_FIDELITY_RULES` text not extended, `supplementalContent` not added to `numericFidelitySources`; matches the record (the notes are still added per AC-9, which is OD-20(1)/AC-9, not an OD-20(2) change) |
| OD-20 (3) / D-10 (FR-32 D-10) | "script input set as D-10" | matches; D-10 stated as confirmed, D-3 to D-5, D-7, D-9 left PROPOSED |
| OD-7 (FR-16), OD-8 (FR-17), OD-14 (FR-34, FR-35), OD-18 (FR-27) | "Q-OD7/8/9/14/18: accept as built" | each marked "accept as built"; nothing added beyond the plain acceptance |
| OD-9 (FR-32 Execution, Out of scope) | "Q-OD9: verify Node >= 22.18, else the D12 launcher" | the condition is carried exactly and the Specification says it does not perform the verification |
| OD-11 settled part (FR-34, FR-35, FR-5 note, note H) | "three products x 2 runs, all must pass hard criteria, include a non-marker run; evidence = script output; failure is reported, not auto-iterated" | each element present; residue (which Center 3D Print and 3DDevice products; who runs the live runs) kept open |
| Q1 (FR-23, NFR-9, note F) | "accept master in Task C and optimizer; guard option (b): block 0 compared with live MASTER_SYSTEM_PROMPT; block 1 and userContent stay pinned per case" | annotation only, see 3.5 |
| Q-TRANS / Q-OPT (note G) | "options (1)+(3); optional live translation comparison ... outside the gate" / "option (1)" | annotation only, see 3.5 |
| Q-OD12 (NFR-10, OD table) | "intent to approve task-a.ts T-A4 first, then output-validator.ts, then master-system-prompt.ts last. One commit per task ... This is intent only; the 'modify <file>' instruction will be given per file" | recorded as intent only; OD-12 stays open |

### 3.4 Nothing the owner did not answer was closed

Checked against Open Decisions v4 and the Specification's "Still explicitly open" paragraph, Out of scope bullet, OD table and note E:

- **OD-10** D-3, D-4, D-5, D-7 and the D-9 half of part (4): still `PROPOSED DEFAULT`; the FR-32 intro, table row and note E say so. D-10 only is confirmed.
- **OD-11 residue** (products; who runs): still OPEN in FR-34, OD table, Out of scope.
- **OD-12**: still open. NFR-10 and the OD table record the order as "INTENT only" and say "No FROZEN-file approval has been given; none is claimed here". The Scope FROZEN row is unchanged ("No approval has been given; none is claimed here"). `VERBATIM once approved` phrases in FR-11, FR-13 are conditional.
- **OD-13 rest, OD-15**: still open (OD table, Out of scope).
- FR-29 tree-search note on other block-counting places: kept as an explicit non-OD OPEN note, with Open Decisions v4's statement that the OD-20 answer "neither confirms nor changes" it.
- Q-CODEALT ("no") and Q-SIMPL ("no") are not applied anywhere as new requirements, and correctly so: both are "no" (nothing to add). Q-SIMPL is consistent with FR-10 (not extended to the simplified Doc templates) as already written. FR-10's text, which keeps `SIMPLIFIED_TRANSLATION_CLAUSE` untouched implicitly by not mentioning it, still reads the same.

### 3.5 Annotation-only updates do not alter a requirement

- **FR-23 / note F (Q1):** the "Plan-gate item Q1" paragraph gains "answered by the owner, 2026-10-18: ... option (b)" and "The owner chose option (b) ...; the required outcome is unchanged". Items 1 to 5, the Assert-present, Assert-absent, unchanged-bytes assertions and the failure path are the v4 text. The required outcome (96 block-1 and 96 `userContent` digests unchanged, guard not weakened, AGENTS.md §7.7) is unchanged. The sentence "after either option" is now slightly stale (one option was chosen) and harmless (N22).
- **Note G (Q-TRANS (1)+(3), Q-OPT (1)):** a sentence is added recording the answers and saying "neither adds a requirement to this Specification, and the residual risk stays declared". Q-TRANS (3) (a documentation-only characterization pin of the `validateStructuralParity` blind spot) is a plan-level test, not a Specification requirement; the note still says no automated check can detect the drift, which a documentation pin does not contradict. Requirements unchanged.

### 3.6 The two added assertions

- **Assert-absent `[Operator Notes]` in the instruction texts of `task-a-doc.ts`** (FR-26). Renders "(1b) no" (the Doc instructions do not mention the block; `task-a-doc.ts` is not edited for the carrier). It names "every instruction text of `task-a-doc.ts`", so it also covers `TASK_A_DOC_INSTRUCTION` and the simplified Doc instructions that the Open Decisions v4 record names, and it states that the FR-10 edit adds no such string. I checked the tree: `src` contains no `Operator Notes` string today, so the assertion is true at baseline and fails only if someone adds the string. Faithful.
- **Assert-present for Expert-3DPrinter `buildPromptA(...).userContent`** (FR-26). Renders "(2) yes" (Expert-3DPrinter's plain-HTML path receives and renders the notes). It requires the `[Operator Notes]` block, at the FR-26 position, for the Expert-3DPrinter store profile with a non-empty `operatorNotes`. Faithful and consistent with the confirmed OD-2(b) default. It adds no new behaviour beyond FR-26's general rule that `buildPromptA` emits the block from whatever it receives.

## 4. Scope creep

- Out of scope section present and non-empty: **yes** (the v4 list plus the reworked OD-resolution bullet and the new bullets: the exemption list for fixed CTA / store text in D-9, the no-new-runner bullet, the Knowledge fixture bullet).
- v5 adds one requirement (FR-41), which the owner asked for. It adds no other requirement. Every change in the v5 table traces to a verbatim owner answer or to plan-review N10 / N12 / N20, as the table says.
- The two new Out of scope bullets (the exemption list, the TypeScript runner / dependency) are exclusions that record the OD-20(3) and OD-9 answers; they fence off options and are the opposite of creep.

## 5. Missing edge cases, boundaries and failure paths

| Area | Checked | Finding |
|---|---|---|
| FR failure paths | FR-41, FR-26 (new assertions), FR-31 items 4, 5 | FR-41 has a failure path; FR-31 items 4, 5 have a Failure path sentence (restore with values / without) |
| Clear All edge | FR-41 | handles typed values, history-restored values, partially filled and fully empty textareas (the "whatever the textareas held before" clause). No other app mode is touched (item 3) |
| Restore then clear then generate | FR-31 item 4 with FR-41 item 2 | consistent: restored notes are resent until cleared; after Clear All no `operatorNotes` key |
| Locale fan-out (uk-UA master to derived locales) | Scope (Locales), FR-23, FR-20 self-scoping | unchanged and still adequate; the 16 store/language pairs inherit the master through block 0, the self-scoping sentence is now exact |
| Store scope vs `STORE_REGISTRY` | Scope (Stores), NFR-8, FR-26 Expert-3DPrinter assertion | unchanged: seven stores and four groups; Expert-3DPrinter is `US`; no new locale or currency literal in v5 |
| §4 invariants that must survive | FR-36 to FR-39 | text unchanged in v5 |
| Provider behaviour | NFR-12 | unchanged |
| Empty and boundary inputs | FR-25, FR-27, FR-41 | empty `operatorNotes` rule (undefined, `{}`, whitespace-only) unchanged; FR-41 reuses it |

## 6. Compliance with AGENTS.md

| Check | Result |
|---|---|
| §4 criteria in play quoted verbatim and cited, not paraphrased | Pass. FR-36 to FR-39 unchanged; v5 adds no §4 text |
| §9 FROZEN-file impact named and acknowledged | Pass. Scope row unchanged: three files touched (`task-a.ts`, `master-system-prompt.ts`, `output-validator.ts`), per-file §9 STOP, no approval claimed. NFR-10 adds the owner's order as "intent only" and repeats "No FROZEN-file approval has been given; none is claimed here". FR-41 and the FR-26 additions touch no new frozen file (`app.component.ts`, `task-a-doc.ts` are not on the §9 list) |
| §3 architecture rules | Pass. Rule 2 unaffected (notes are typed operator input, NFR-3); FR-41 is UI state only |
| §11 no blocking Open Decision left unaddressed | Pass. None `blocking: true`; the remaining open ones are non-blocking and listed |
| No implementation design leaked in | Pass. FR-41 uses the observable result, not the owner's term "signal". Mode ids and the action label are product facts. FR-23 names `pack()` / `buildPromptC` / `buildOptimizerPrompt` only as the existing places the master already is block 0, as reviewed in v4 |

## Verdict rationale

`PASS` rather than `CHANGES_REQUIRED`: the Q-SCOPE literal is exact and consistent in every normative place; FR-41 is testable and
traces acceptably to AC-9; every confirmation mark matches a verbatim answer and none exceeds it; no unanswered Open Decision was
closed and no FROZEN approval is claimed; the annotation-only updates alter no requirement; the two added assertions render
the OD-19 answers faithfully; FR numbers are stable. The findings below are wording or oracle-completeness points that a test
writer, the plan or the next Specification touch can resolve without changing a requirement.

`PASS` rather than `BLOCKED`: all inputs are current and no Open Decision is `blocking: true`.

This `PASS` is a verdict about the document only. It does not approve the Specification, resolve any Open Decision, or approve any
FROZEN-file change; that is `/so:approve` at `HUMAN_SPEC_APPROVAL` and the per-file "modify [filename]" instruction of AGENTS.md §9.

## FR numbering and silent-closure check

- `grep -c '^### FR-'` = 41. FR-1 to FR-40 unchanged in number and heading; FR-41 appended under "Functional requirements added in
  v5". No FR renumbered.
- Open Decisions: resolved by v4 and marked so in the Specification: OD-2 R1/R2, OD-7, OD-8, OD-9, OD-14, OD-18, OD-19 (1b)(2),
  OD-20 (2)(3), D-10, OD-11 settled part. Open and still marked open: OD-10 D-3..D-5, D-7, D-9, OD-11 residue, OD-12, OD-13 rest,
  OD-15. This is the same set as the Open Decisions v4 index. Nothing is silently closed.
- Q-CODEALT and Q-SIMPL answered "no": no requirement added or changed.
- The self-scoping literal is attributed to Q-SCOPE, a plan-gate answer, and not to an OD number.

## Non-blocking findings

Re-confirmed from review v4 (still hold against v5; v5 did not change the text they cite):

- **N3 (OD-9)** the Node >= 22.18 verification belongs to the plan and implementation stages; the Specification does not perform it. Resolved in substance by the owner's condition; the verification itself is still to be done and recorded later.
- **N4 (OD-15)** "every output language" verified only by the warning and a clean master; open.
- **N6** FR-5's `alt` assertion is a weak substring check; the phrase assertions carry it.
- **N7 (OD-7)** uk detector false positives and missing non-uk lists: now accepted as built by the owner; bounded by `warning`.
- **N8 (OD-14)** "35" reading B and the 48-word hook: now accepted as built.
- **N9 (OD-12)** FROZEN approvals neither given nor claimed; the owner's order is intent only.
- **N10** FR-40 item 1 "Nothing else reads `ProductInput.operatorNotes`" is broader than FR-24/25/31 (it already excepts FR-30 and FR-32 D-10; FR-41 now also reads and clears the textareas, which is the form, not a reader of `ProductInput`). No action.
- **N11** FR-40's former OPEN for Expert-3DPrinter is closed by the owner's "(2) yes", so the earlier concern that the text leaned toward an unanswered question no longer applies.
- **N12** FR-20 says the `[SENTENCE LENGTH]` bands are authoritative "for all seven base languages"; `SENTENCE_LENGTH_RULES` has no `pt-PT` row. Still present in the RHYTHM bullet.
- **N13** FR-22 (b): the amended overlay line could loosen the heading mandate beyond the §3 `<h2>`; human to confirm.
- **N14** FR-11 item 2 new `buildVideoBlock` span is Specification-composed yet asserted VERBATIM.
- **N15** FR-29 reworded `INTERNAL RECONCILIATION` bullet has no positive literal covering `[Operator Notes]`.
- **N16** Story hygiene: Story "Open questions" still lists the four key names, labels, order and position as open, and AC-8 still cites the source-analysis FR numbers.
- **N17** FR-23 item 4 says the optimizer payload is otherwise unchanged but the unchanged-bytes list names no oracle for the optimizer's block 1 and `userContent`; add a pre-change digest check at the plan or TEST_WRITING stage. Still present.
- **N18** Self-scoping wording sharper than the owner's: **closed** by v5 ("headings" dropped). What remains is the Note G(2) residue (the optimizer is covered by implication only), accepted by the owner under Q-OPT (1).
- **N19** Story v4 "Resolved decisions" Q2 still says "translation prompts untouched" (contradicts AC-8 at payload level). Story not touched; the Story owner's fix.
- **N20** Hygiene items of review v4 (Open questions header still "v3", front matter listing `specification_review` version 2, change table omissions) are **fixed in v5** (header reads "(v5)", front matter lists current versions). Closed.
- **N21** FR-5 coverage note names the manifest caption loosely (`task-a.ts:64` is `altText`, else `visionDescription`, else a filename seed); FR-23 item 2 speaks of `.arch-guard-checksums` entries "for them" though `task-translate.ts` has none. Still present; no effect on any assertion.

New in this review:

- **N22 (stale prose in note G and FR-23).** The note G heading still reads "Q-TRANS and Q-OPT stay open and are not resolved
  here" and its body still says "is for the human at the plan gate", while the last sentence of the same note records the owner's
  answers; FR-23's Q1 paragraph still says "after either option". Annotation only; no requirement is affected. Correct at the next
  Specification touch.
- **N23 (FR-34 "this exposure is accepted").** The owner's OD-11 answer says "include a non-marker run" and "failure is reported,
  not auto-iterated". The Specification adds "so this exposure is accepted (2026-10-18)". That is the Specification's
  inference from those two answers (Open Decisions v4's consistency check draws the same inference), not a quoted owner
  statement. Harmless, since the failure path is exactly what the owner said; the human should see it is an inference.
- **N24 (FR-41 trace is to AC-9's intent, not to its text).** See section 1.1. Accepted; the Story owner may add a line to AC-9
  at the next Story revision, or the human may confirm the trace at the gate.
- **N25 (downstream re-baseline, informational).** Impact analysis v3, implementation plan v3, task breakdown v2 and plan review v2
  still quote the old literal ("headings"), the old Q1/Q-TRANS/Q-OPT "open" state, and have no task traced to FR-41 (plan T39 is
  "untraced to an FR by its own statement"). These are the owner's stated next steps after HUMAN_SPEC_APPROVAL, not defects of
  the Specification. Carried PROPOSED DEFAULTS still awaiting confirmation: FR-11 item 3, FR-17 (now confirmed, OD-8), FR-20
  precedence sentence, FR-32 D-3 to D-5, D-7, D-9.

## For the human at the gate

1. A plain `/so:approve` on Specification v5 is needed; v4's approval does not carry over (v5 is `DRAFT`).
2. Q-SCOPE literal is applied as you gave it; FR-41 is added as a new requirement (Q-CLEARALL) whose trace to AC-9 is indirect (N24).
3. Still yours, unanswered: OD-10 D-3 to D-5, D-7, D-9; OD-11 products and who runs the live runs; OD-12 (the per-file "modify
   <filename>" instruction for `task-a.ts`, `output-validator.ts`, `master-system-prompt.ts` is not given); OD-13 rest; OD-15.
4. After approval, the impact analysis, plan, task breakdown and plan review are re-baselined (N25).

## Result Envelope

```yaml
stage: SPEC_REVIEW
skill: so-spec-reviewer
story: US-9.1
result:
  verdict: PASS
  loop_back_stage: null
  summary: >
    Specification v5 applies the owner's 2026-10-18 plan-gate answers faithfully. The Q-SCOPE literal is exact in FR-20 (prose,
    full sentence, three consistent Assert-present strings, illustrative block) and in every citing place, with the old literal only
    in quoted superseded history. New FR-41 (Clear All resets the four operator-note textareas in the generator and ua-generator
    modes) is testable and traces acceptably, though indirectly, to AC-9. Every "confirmed by owner, 2026-10-18" mark matches the
    verbatim answer; OD-10 D-3..D-5/D-7/D-9, the OD-11 residue, OD-12, OD-13 rest and OD-15 stay open; no FROZEN-file approval is
    claimed. The annotation-only updates and the two added FR-26 assertions change no requirement. FR numbers are stable (only
    FR-41 appended). PASS is a verdict about the document, not human approval.
artifacts_written:
  - key: specification_review
    path: docs/reviews/specifications/US-9.1-spec-review.md
    version: 5
    status: DRAFT
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: open_decisions
    version: 4
blocking_issues: []
non_blocking_findings:
  - N22 Note G heading/body and FR-23 "after either option" still read as if Q-TRANS, Q-OPT and Q1 were open although the same text records the answers; annotation only.
  - N23 FR-34 "this exposure is accepted" is the Specification's inference from the OD-11 answer, not an owner quote.
  - N24 FR-41 traces to the intent of AC-9, whose text does not mention clearing; acceptable (owner-directed, same shape as FR-40); Story owner may add a line to AC-9.
  - N25 Impact analysis v3, plan v3, task breakdown v2 and plan review v2 still carry the old literal and have no task traced to FR-41; re-baseline follows HUMAN_SPEC_APPROVAL.
  - N17 Still open - FR-23 item 4 names no oracle for the optimizer's unchanged block 1 and userContent.
  - N18 and N20 closed by v5 ("headings" dropped; version and header hygiene fixed). N11 closed in substance by OD-19 (2) yes.
  - Carried and re-confirmed - N3 OD-9, N4 OD-15, N6, N7, N8, N9 OD-12, N10, N12 pt-PT row, N13, N14, N15, N16, N19 Story Q2, N21; remaining PROPOSED DEFAULTS (FR-11 item 3, FR-20 precedence sentence, FR-32 D-3 to D-5, D-7, D-9) await confirmation.
evidence:
  - "date -u: 2026-10-18T10:19:20Z"
  - "owner answers read verbatim from the last 'Plan gate NOT approved' event, docs/workflow/history.jsonl ts 2026-10-18T10:08:01Z, actor sbruhov@gmail.com"
  - "grep for the old literal in the Specification: 'headings and order' once (note E, quoted as dropped); 'sentences, headings' once (v5 change table, quoted as superseded); no normative occurrence; grep for the curly apostrophe in the file: 0"
  - "grep -c '^### FR-' docs/specifications/US-9.1-spec.md = 41; grep for TBD/TODO/FIXME/??? = none"
  - "tree: src/app/app.component.ts clearAll() line 1061 has cases 'generator' and 'ua-generator'; labels 'Clear All' / 'Очистити все'; grep 'Operator Notes' in src = none (the FR-26 Assert-absent holds at baseline)"
  - "input versions read from front matter: story 4 (updated 2026-10-17T19:33:15Z), clarification_report 4, open_decisions 4 (updated 2026-10-18T10:09:20Z), impact_analysis 3, implementation_plan 3, task_breakdown 2, plan_review 2; none SUPERSEDED; open_decisions_blocking false"
  - "Specification v4 not recoverable (untracked, overwritten in place; git log empty): drift verified against the v5 change table and review v4 anchors, not by byte diff"
  - "stage-map SPEC_REVIEW loop_back keys are changes_required and changes_required_clarification (neither used, verdict PASS)"
```
