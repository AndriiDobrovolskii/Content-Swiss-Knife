---
artifact: task_breakdown
story: US-9.1
version: 3
status: APPROVED
owner: so-implementation-planner
created_at: 2026-10-17T16:41:00Z
updated_at: 2026-10-18T10:52:12Z
supersedes: docs/plans/US-9.1-task-breakdown.md#2
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: impact_analysis
    version: 4
  - key: implementation_plan
    version: 4
open_decisions_blocking: false
---

# Task breakdown: US-9.1 (no picture references, livelier descriptions) - track prompt

> **Change note, v2 to v3 (revision run, re-baselined on Story v4, Specification v5 APPROVED, Impact analysis v4, Implementation plan v4 DRAFT).**
> v2 was written against plan v3. The plan gate was not approved on 2026-10-18; the owner's answers were applied upstream (Open Decisions v4,
> Specification v5, Impact v4, Plan v4). This revision follows plan v4's own change note (its 17 changes). What changed here, each row mapped to
> its plan-v4 source (`Plan v4 #n` = row n of the plan's change note; `Nn` = plan-review v2 finding):
>
> | # | Change | Tasks | Plan v4 source |
> |---|---|---|---|
> | 1 | **FR-20 literal and the three Assert-present strings.** The literal is now `These rules govern writing a new description; when the task is to translate an existing text they do not apply, and the source's sentences and their order are kept.` ("headings" dropped). The three strings are `govern writing a new description`, `when the task is to translate an existing text they do not apply`, `the source's sentences and their order are kept`. H-SCOPE is closed | T16, T32, T33, Constraints on TEST_WRITING | Plan v4 #1 (Q-SCOPE) |
> | 2 | **N10 wording.** The FR-20 Assert-absent is the Specification's: `9–17`, `9-17`, `at most two consecutive`, `two consecutive sentences`, a digit-range-plus-`word` expression, and **no sentence-length number other than `6`**. `§1`, `§3` and `<h2>` in the required literals are not sentence-length numbers. Every "no digit" / "no number other than 6" formulation of v2 is withdrawn | T16, T32, T33, Constraints on TEST_WRITING | Plan v4 #2, N10 |
> | 3 | **T20 is the amended Task C guard, option (b), DECIDED.** Block 0 compared `toBe` the live `MASTER_SYSTEM_PROMPT`; block count, block-0 `cache` flag, block 1 and `userContent` length + `sha256` (and block-1 `cache`) stay pinned per case; the JSON is byte-unchanged; green on arrival and after the master edit; **no co-commit** with any master task. H-Q1 and every "only if H-Q1 option (a)" Files row of T27 to T32 are removed; the option (a) text is gone | T20, T27-T32, T33 | Plan v4 #3 (Q1) |
> | 4 | **FR-41 and the notes state class.** New task **T40** (`OperatorNotesFormState`: `restore`, `clear`, `inputPart`; behaviour tests, category 21). T12 creates the field, T13 spreads `inputPart()`, T38 calls `restore`, **T39 is unconditional** (both `clearAll` cases, disjoint per-case slice pins, plus the slicing helper tested on a one-case-only synthetic source). All depend on T21 (gate). `operatorNotesForm` is renamed `operatorNotesState` everywhere. H-CLEARALL is closed; the one new open question is **H-FR41TEST** (default: accept the split) | T12, T13, T38, T39, T40 | Plan v4 #4 (Q-CLEARALL, Q-FR41-TEST) |
> | 5 | **OD-2 R1/R2 decided.** T38 no longer waits on an answer; FR-31 items 4 and 5 are tested in T40 and pinned at the call site in T13 / T38 | T38, T40 | Plan v4 #5 |
> | 6 | **OD-19 and OD-20 decided.** Doc instructions do not mention `[Operator Notes]` (Assert-absent pins, owner T17, stay-green T21 and T31); Expert-3DPrinter receives the notes (category 8 test, owner T21); `NUMERIC_SOURCE_FIDELITY_RULES` and `supplementalContent` untouched; script input set D-10 | T10, T12, T17, T21, T34, T35 | Plan v4 #6, #7 |
> | 7 | **Q-OPT option (1), Q-TRANS options (1)+(3), Q-CODEALT "no", Q-SIMPL "no".** H-OPT and H-TRANS are closed; the `validateStructuralParity` characterization pin is now **unconditional** (green on arrival, no owner task, re-run in T33); the optional Creality Pika translation comparison is the new manual task **T42** (outside the gate); R7a is softened | T2, T17, T33, T36, T42 | Plan v4 #8, #9, #10 |
> | 8 | **OD-7, OD-8, OD-14, OD-18 accepted as built; OD-9 condition planned.** T2, T3, T1 lose their Hn dependencies. T35 now starts with the Node >= 22.18 check, one real CLI run, a leading `process.version` report line asserted by the spawn test; the D12 launcher is the conditional task **T41** (built only if the check fails) | T1, T2, T3, T34, T35, T41 | Plan v4 #11, #12 |
> | 9 | **OD-11 partly decided.** T36 is three products x 2 runs (six), every run passes the hard criteria, at least one non-marker run, evidence = script output, a failure is reported and not auto-iterated. Open: which products, who runs, the marker / non-marker split | T36 | Plan v4 #13 |
> | 10 | **OD-12 intent recorded, not an approval.** Order of the frozen files follows the owner's intent (`task-a.ts` T-A4 first, then `output-validator.ts`, `master-system-prompt.ts` last), one commit per task, `bash arch-guard.sh --rebaseline` in the same commit. **Decision taken here (left to the breakdown): T-A1..T-A3 do NOT share T-A4's commit** (Reading guide item 9). No "modify <filename>" instruction exists; every frozen task stays BLOCKED-UNTIL-APPROVED | T21-T32 | Plan v4 #14 |
> | 11 | **General no-weakening / refusal rule for ALL frozen tasks** (Reading guide item 8, Refusal table); **T31 depends on T21** (the master must not name a block no task emits); T31 gains the R22 category 9 test | T21-T32, T31 | Plan v4 #15, #16, N14 |
> | 12 | **Housekeeping.** N11: `content-orchestrator.faq-standalone.spec.ts` added to the stay-green lists of T27 to T32 and to T33. N15: the H-OD13 register row lists every task that takes wording latitude (T5, T6, T7, T14, T16, T17, T18, T19, T25, T36) and each of them names H-OD13 in `Depends on`. N16: T1, T33, T37 use "the commit the Story branch was cut from" (BASE, currently `6546db8`) read from the fixture header, never a hard-coded `git diff` and never `git merge-base HEAD main` (Reading guide item 10) | T1, T5-T7, T14, T16-T19, T25, T33, T36, T37 | Plan v4 #17, N11, N15, N16 |
>
> **Id map.** T1 to T39 keep their v2 ids and meaning. New: **T40** (notes state class), **T41** (conditional D12 launcher), **T42** (optional live
> translation comparison). Open human dependencies are in the register below; the decided ones are in the "Decided by the owner" table and are
> **not** dependencies of any task. A *Blocks* set in the register equals the set of tasks whose `Depends on` names that Hn (direct dependents; a
> task that depends on a blocked task is blocked transitively).
>
> **M1 (master import) handling, unchanged.** The plan's M1 line adds two names to one existing `./constants` import. An import-only commit would fail lint (unused import) and cannot be a task of its own, so M1 is carried by T27 for `NO_IMAGE_DEIXIS_RULE` and by T32 for `LIVELINESS_RULES`, each together with the interpolation that uses it.

> **History, change note v1 to v2 (kept in its own version's voice; superseded where the v3 note says so).** v1 was written against plan v2. Plan v3 closed Q-SPEC23, made the FR-20 self-scoping sentence a requirement, added the D15 pre-change oracle and the category 19 and 20 tests, and gated the operator-notes slice on the `task-a.ts` T-A4 approval. v2 added T37 (D15 digest fixture), split v1 T13 three ways (T13, T38, T39), moved the category 16 to 18 reach tests to the owner constant (T27, T32), and placed T21 to T24 ahead of the form slice.

Task count: **42** (T1 to T42). Primary track `prompt`; per-task tracks: prompt 23, angular 19, server 0. Frozen-file tasks: **12**
(`task-a.ts` 4, `master-system-prompt.ts` 6, `output-validator.ts` 2), **all blocked-until-approved**. Conditional tasks: T41 (only if the
Node check fails). Manual tasks outside the gate: T36, T42. Verification-only tasks (no commit): T33. Nothing here grants a FROZEN
approval, resolves an Open Decision, edits the Specification, or writes a test or code.

## Reading guide: what "blocked" and "human answer" mean in this document

1. **BLOCKED-UNTIL-APPROVED (AGENTS.md section 9).** No per-file "modify <filename>" instruction exists in any session. Every task
   marked this way carries the section 9 stop: the builder MUST NOT edit the file, must report the exact change and why (the text in
   the plan's "FROZEN-file position" section, item named in the task), and wait for the user's explicit "modify <filename>" in the
   builder's own session. Without it the task stays BLOCKED and its dependants stay blocked. After an approved edit:
   `bash arch-guard.sh --rebaseline`, then a clean `bash arch-guard.sh`, and `.arch-guard-checksums` goes into the same commit.
   Approving the plan, answering a plan-gate question, or the owner's stated intent order (OD-12) is not that instruction.
2. **HUMAN-ANSWER dependency (Hn).** A task that depends on an open question or Open Decision residue lists the Hn id in `Depends on`. The
   task is not startable until that answer is recorded (the plan gate is where the human gives it). The task states what the answer changes.
   The builder never picks an option; an unanswered Hn means STOP. Where the plan built a PROPOSED DEFAULT or a default split "as written",
   the task says so and still lists the Hn: the human may confirm it or change it, and a change is a loop back, not a builder decision.
   Questions the owner **decided** on 2026-10-18 are not Hn dependencies; they are listed in "Decided by the owner" for traceability.
3. **Per-task gate** (an interpretation of AGENTS.md section 6 for a tests-first branch, the same convention US-8.1 used; surfaced to
   the human at HUMAN_PLAN_APPROVAL). Tests for the whole Story exist and are red before T1 (AGENTS.md section 5), so red specs owned
   by later tasks are on the branch. A task is **gate-green** when: (a) every test it owns passes; (b) nothing that passed before it
   fails after it (both runners; this includes `full-description.golden.spec.ts`, the amended Task C guard
   `task-c.description-bytes.spec.ts` (T20), `task-a.spec.ts` cached-prefix test, the D15 fixture spec of T37,
   `master-system-prompt.image-markers.spec.ts` property 6, `content-orchestrator.faq-standalone.spec.ts` and the watch items);
   (c) `npx tsc --noEmit` reports zero diagnostics in any non-spec file and in any spec whose owner task is
   already committed, and in later-owner specs only missing-symbol kinds (TS2307, TS2305, TS2339, TS2353); (d) `bash arch-guard.sh`
   exits 0; (e) `git diff` lists only the task's Files. The QUALITY_GATE stage, after the last task, proves full lint, test (both runners), coverage and build.
4. **Golden-moving tasks are serial.** Any task that changes bytes in `test/fixtures/golden/full-description-prompts.json` (T17, T18,
   T19, T22, T24, T27 to T32) regenerates that fixture in the same commit, never with `-u`, with a reviewed diff limited to the
   text the task changed (US-7.1 precedent), and no two of them run in parallel (same file). The T1, T37 fixtures and
   `task-c-description-prompts.json` are never regenerated (the last one must show an empty `git diff` in every task).
5. Test file names below are the plan's / this breakdown's proposals; `so-test-writer` fixes the names. Runners: `test:logic` =
   `vitest run` (config `vitest.config.ts`, happy-dom); `test:components` = `ng test` (`*.component.spec.ts`). Single-file check:
   `npx vitest run <path>` for logic.
6. **"Serial, same file" means decided, not approved.** Where a task depends on an earlier task only because both edit the same file
   (T21 to T24; T27 to T32; T25 and T26; T12, T13, T38, T39 in `app.component.ts`; T15, T16, T18, T19 in `constants.ts`), the later task
   waits until the earlier one is committed **or explicitly refused or dropped**. A refusal of one frozen item never silently blocks the next
   item, which needs its own instruction anyway.
7. **Operator-notes gate (plan D8 / D9 Gate, R20).** FR-26 has no non-frozen route, so the `[Operator Notes]` block reaches a prompt only
   if T21 (`task-a.ts` T-A4) is approved and committed. FR-40, FR-41 and the master hunk M6 (FR-29, T31) travel with that slice. T10, T11, T12,
   T13, T38, T39, T40 and T31 therefore depend on **T21 committed**, not on a plan-gate answer: a textarea, state object, label, history
   field or reset that is collected, stored, restored or cleared but never sent is inert and must not ship, and a master that names a block no
   task emits is the same defect from the prompt side. T8 (type) and T9 (leaf module) are the only approval-independent parts and land before
   T21 because T21 imports them. If T-A4 is refused: T10 to T13, T38 to T40 and T31 are not built; T8 and T9 are dropped as dead code unless
   the human decides otherwise; the general rule of item 8 applies to the specs left red.
8. **General refusal and no-weakening rule (plan N14; applies to EVERY frozen task T21 to T32: T-A1..T-A4, O1, O2, M1..M7).** If the owner
   refuses a frozen item, or no "modify <filename>" instruction is ever given for it: (1) the specs written for that item **stay red** and
   the builder never deletes, skips, loosens or rewrites a test to make a gate pass (AGENTS.md section 7.7); (2) the scope consequence (drop
   that FR, drop the FR range, re-scope the Story) is the human's decision, never the plan's or the builder's; (3) the work returns to
   TEST_WRITING through a loop-back so the specs are reconciled with the human's scope decision (and to SPECIFICATION if the scope
   changes); (4) nothing that depends on the refused item ships. Per-item consequences are in the Refusal table at the end.
9. **Frozen order and commit shape (OD-12 intent, recorded as intent only).** Order: `task-a.ts` with T-A4 (T21) first, then the rest of
   `task-a.ts`, then `output-validator.ts`, then `master-system-prompt.ts` last. One commit per task, each with
   `bash arch-guard.sh --rebaseline` followed by a clean `bash arch-guard.sh`, and `.arch-guard-checksums` in the same commit. **Decision taken
   by this breakdown (the plan left it to it): T22 (T-A2), T23 (T-A3) and T24 (T-A1) are their own commits and do not share T21's.** Reasons:
   AGENTS.md section 13 (one task, one commit); FR-11 and FR-26 are different requirements with different refusal rows (a refusal of T-A1..T-A3
   or of T-A4 alone is a separate consequence, plan "What a refusal drops"); T21 moves no golden while T22 and T24 move different cases and
   must carry reviewed regenerations; and a merged commit would make a partial refusal a revert. The order across files is the owner's intent;
   the `Depends on` lines list only technical dependencies, so a different order is the human's call, not the builder's.
10. **BASE = "the commit the Story branch was cut from" (plan N16, owner answer).** Currently `6546db8`. It is read from the header of the
    T1 and T37 fixtures; no check hard-codes a hash and none derives it with `git merge-base HEAD main`, which returns `120dcbc` on this
    checkout (`6546db8` is on an unmerged branch), i.e. the wrong commit. Every "unchanged since BASE" check is `git diff <BASE> -- <paths>`
    with `<BASE>` taken from the fixture header, preceded by `git merge-base --is-ancestor <BASE> HEAD` (exit 0). If the Story branch is
    re-cut (for example from `main` after the US-8.1 pull request lands), the hash in the headers must be the new cut point; a header that
    names another commit is a loop back to TEST_WRITING, never a builder edit.

## Decided by the owner on 2026-10-18 (traceability only; none of these is a dependency of any task)

Source: history event "Plan gate NOT approved" (2026-10-18T10:08Z), Open Decisions v4 "Plan-level answers", Specification v5, Plan v4.
A decided item is built as decided; a different wish is a new Specification change, not a task edit.

| Former id | Decision | Where it shaped the tasks |
|---|---|---|
| H-Q1 (Q1) | Master accepted in Task C description translation and the optimizer; guard option (b) | T20 (amended guard), T27-T33; no digest bump anywhere |
| H-SCOPE (Q-SCOPE) | FR-20 literal "...and the source's sentences and their order are kept." | T16, T32, T33 category 19 strings |
| H-CLEARALL (Q-CLEARALL) | Reset the notes state in `clearAll` for `generator` and `ua-generator` (FR-41) | T39 unconditional; T40 |
| H-TRANS (Q-TRANS) | Options (1) declare the risk + (3) unconditional characterization pin; options (2) and (4) not chosen; optional live comparison outside the gate | T15 (FR-5 literals verbatim), T33, T42 |
| H-OPT (Q-OPT) | Option (1): no `optimizer.ts` edit; its "lead-in" is the figcaption `<b>` label; R7a softened | T33, T36 (no optimizer check added) |
| H-OD2 | R1 restored notes are resent; R2 an entry without notes empties the four textareas | T38, T40 |
| H-OD19 | (1b) Doc instructions do not mention `[Operator Notes]`; (2) Expert-3DPrinter receives and shows the notes | T12, T17, T21, T31 |
| H-OD20 | `NUMERIC_SOURCE_FIDELITY_RULES` text not extended, `supplementalContent` not added to `numericFidelitySources`; script input set D-10 | T10, T34, T35 |
| H-OD7 | uk precision candidates asserted neither way; non-uk lists drafted by the builder, labelled unreviewed, native review out of scope | T2 |
| H-OD8 | FR-17 carriers and the video figure accepted as built; D-1, D-2 follow FR-17 | T3, T34 |
| H-OD9 | Native type stripping, with the condition: verify Node >= 22.18, else the D12 launcher | T35, T41 |
| H-OD14 | Counting rule for "35" and the 48-word-hook item accepted as built (reading B) | T34, T36 |
| H-OD18 | Two-tier golden, input set as FR-27 | T1 |
| Q-CODEALT | No: the detector does not match `Фото:` / `Зображення товару:`; `ALT_PREFIX` / `FALLBACK_LABEL` untouched | T2 (explicit negatives) |
| Q-SIMPL | No: `simplified-template-blocks.ts` untouched | T17, T33 tripwire |
| OD-10 (part) | D-6 and D-10 confirmed; D-1, D-2 follow FR-17 | T34 |
| OD-11 (part) | Three products x 2 runs, all pass the hard criteria, include a non-marker run, evidence = script output, a failure is reported not auto-iterated | T36 |
| Findings | N10 binding; N14; N11, N15, N16 folded in; N13 moot (option (a) removed) | see change-note rows 2, 11, 12 |

## Human-answer register (still open; nothing here is decided by this breakdown)

"Blocks" lists the tasks whose `Depends on` names the id. An Hn is answered, or its default is explicitly accepted, at the plan gate;
the builder never picks.

| Id | Open question | What the answer decides | Blocks | Default the plan built (not a decision) |
|---|---|---|---|---|
| H-OD12 | Q-OD12: the AGENTS.md section 9 "modify <filename>" instruction, per file, for `task-a.ts` (four items; **T-A4 asked first**: it gates Group B, T31 and T40), `output-validator.ts`, `master-system-prompt.ts`. The owner's INTENT (order T-A4, validator, master last; one commit per task) is recorded, but no instruction has been given | Whether T21 to T32 may start; a T-A4 refusal also removes T10 to T13, T31, T38 to T40 (and T8, T9 unless the human decides otherwise); consequences per Refusal table | T21, T22, T23, T24, T25, T26, T27, T28, T29, T30, T31, T32 directly; T10-T13, T38-T40 through T21 | none: no approval exists |
| H-FR41TEST | Q-FR41-TEST: do call-site source-text pins plus `OperatorNotesFormState` behaviour tests satisfy FR-41's "invoke Clear All" wording, or is a first `AppComponent` test wanted (alternative a), or the bare signal (alternative b, plan rejected alternative 22)? | The test shape of the whole notes state: (a) adds an `AppComponent` test and may change the pins of T13, T38, T39; (b) drops T40 and changes the field in T12 and every pin | T12, T13, T38, T39, T40 | **Accept the split** (state-class tests + disjoint per-case slice pins). An answer other than the default changes tests, so it is a loop back to TEST_WRITING |
| H-FR11I3 | FR-11 item 3: the `buildMarkerBlock` span (source-analysis wording) is a PROPOSED DEFAULT, unconfirmed | The text built in T23 and its pins (FR-11 item 3, Tier B marker cases) | T23 | The wording of T23, as written |
| H-FR20PREC | FR-20 precedence sentence `where a store voice block defines its own bullet form, heading form, tone or punctuation limits, that block wins` is a PROPOSED DEFAULT, unconfirmed | The text built in T16 and the pin that asserts it (a changed sentence changes TEST_WRITING's strings: a loop back, not a builder edit) | T16 | The sentence as written |
| H-OD10 | OD-10: metric definitions D-3, D-4, D-5, D-7 and the D-9 half (D-1, D-2, D-6, D-10 are decided) | T34 definitions | T34 | FR-32 as written, marked unconfirmed in the code header |
| H-OD11 | OD-11 residue: which Center 3D Print and which 3DDevice product; who runs the six live runs (cost, API keys; never part of the gate); how the six runs split between marker and non-marker (at least one non-marker is decided); who runs the optional T42 comparison | T36 and T42 entirely | T36, T42 | none |
| H-OD13 | OD-13 rest: `Knowledge/` is git-ignored; whether restated Specification text beyond the asserted literals is normative; where the reference outputs live | Wording latitude of every task listed in "Blocks" and the T36 baseline. The `[Operator Notes]` block text and labels are owner-confirmed and take none | T5, T6, T7, T14, T16, T17, T18, T19, T25, T36 | none |
| H-OD15 | OD-15: what verifies the ban in non-uk-UA languages beyond the warning | nothing planned | none | none |

Noted, no dependency: the FR-29 open note (whether other places in the `[SOURCE FIDELITY]` block count or enumerate input blocks; none found;
T31's "no other count-of-blocks wording" test covers it). The H-OD13 list is the plan's (plan "Questions and residues", N15): FR-10 Doc FIGURE
PLACEMENT (T17), C3D override #5 (T18), validator messages (T6 `video-embed-missing`, T25 `image-manifest-missing`), orchestrator messages
(T7), Appendix E `LEAD_IN_TEMPLATES` (T5), FR-20 to FR-22 prose beyond the asserted literals (T16 for Appendix C, T19 for Appendix A) and the
FR-1 / FR-2 Vision-prepass prose (T14).

No task is planned for (listed so nothing is silently dropped): editing `optimizer.ts`, `simplified-template-blocks.ts`, `ALT_PREFIX` /
`FALLBACK_LABEL`, `NUMERIC_SOURCE_FIDELITY_RULES`, the `supplementalContent` gate, `task-a-doc.ts` notes text, a sentence-count check in
`validateStructuralParity`, an `engines` / `.nvmrc` Node pin, promoting warnings to `error`. Each needs a Specification revision or a human
instruction first.

## Execution order

Order is by dependency and risk. Within a group, tasks marked (||) are independent of each other (different files) and may run in
any order; anything touching the same file or `full-description-prompts.json` is serial.

```
Group 0  oracles first (no production edit)   T1 || T37       (T1 before any task-a.ts edit; T37 before any constants.ts / master edit)
Group A  contracts, leaves (||)               T2 -> T3 -> T4 ; T2 -> T5 ; T6 ; T7 ; T8 -> T9      (A-chains are independent of one another; T5/T6 serial, same file)
Group C  non-frozen prompt text               T14 ; T15 -> T16 -> T18 -> T19 (constants.ts, serial) ; T17 -> T18 -> T19 (golden, serial)   (T15, T16, T18, T19 after T37)
Group D  Task C guard (amended, option b)     T20                      (green on arrival; committed before any master task)
Group E  task-a.ts (FROZEN)                   T21 -> T22 -> T23 -> T24 (serial: same file + golden; after T1, T8, T9; blocked; T21 = T-A4 first)
Group B  operator-notes slice (GATED on T21)  T10 ; T11 || T40 -> T12 -> T13 -> T38 -> T39      (T10 || the rest; nothing user-visible ships unless T21 is committed)
Group F  output-validator.ts (FROZEN)         T25 -> T26               (T26 after T3; blocked; independent of E)
Group G  master (FROZEN)                      T27 -> T28 -> T29 -> T30 -> T31 -> T32   (after T15/T16/T20/T37; T31 also after T21; serial; blocked)
Group H  checkpoint                           T33                      (after G; verification only, no commit)
Group I  measurement                          T34 -> T35 (-> T41 only if the Node check fails)   (T34 after T3; can run in parallel with Groups B-G)
Group J  live acceptance                      T36 ; T42 (optional)     (manual, last)
```

Linear order for a single builder: T1, T37, T2, T3, T4, T5, T6, T7, T8, T9, T14, T15, T16, T17, T18, T19, T20, T21, T22, T23, T24,
T10, T11, T40, T12, T13, T38, T39, T25, T26, T27, T28, T29, T30, T31, T32, T33, T34, T35, (T41), T36, (T42). Groups E, F, G are the
blocked region and Group B is blocked through T21; everything else can finish while approvals are pending (apart from the H-OD13 tasks),
and a refused frozen file leaves the non-frozen work green (plan "What a refusal drops"). T21 is placed right after the non-frozen groups so
that the section 9 stop for T-A4 (which decides whether Group B, T31 and T40 exist at all) is reached as early as the independent work
allows; a builder that is stopped at T21 continues with Group F, Group I and any other task that does not depend on it, and returns to
Group B only after T21 is committed.

**Risk-first rationale.** T1 and T37 are first because they are the only tasks whose value expires: the FR-27 byte oracle must come
from the unmodified `task-a.ts` (BASE, currently `6546db8`, checksum `0421226c...`) and the D15 digest of the optimizer and Task C FAQ
payloads must come from the unmodified `constants.ts` / master, and every later frozen task and AC-9 / FR-23 lean on them; after that, the
highest-fan-out unknown (the detector and its carrier rules, which feed the validator, the warnings, the templates and the script) is
built as leaf modules before any consumer, the single decision that can remove a whole slice (T-A4: form, state class, FR-41, M6) is reached
before the slice is built, and the master edits (the change with the widest blast radius: 96 Task C cases and the optimizer) go last, behind
the already-green amended Task C guard, so the cheapest course changes stay cheap.

## Constraints on TEST_WRITING (so the per-task gate is achievable)

1. A spec that imports a symbol a task of this Story creates (`image-deixis`, `operator-notes`, `OperatorNotes`, `OperatorNotesFormState`,
   the component, `description-metrics`, the two new constants) is red-by-load until its owner task and is the only kind of spec that may
   carry missing-symbol `tsc` diagnostics. Every prompt-pin / master / validator / orchestrator-text spec must be type-clean from the first
   commit (reach new behaviour through existing symbols and source text), so frozen-file tasks can be judged by the compile gate.
2. Split pins by owner task (one `describe` per task id below, e.g. the Assert-present for `NO_IMAGE_DEIXIS_RULE` in the master
   separate from the `LIVELINESS_RULES` one) so no spec stays red across several commits for a reason a later task owns. In particular
   the categories 16, 18 and 19 reach tests need **one `describe` per constant**: the `NO_IMAGE_DEIXIS_RULE` reach into Task C
   description block 0 and the optimizer block 0 (owner T27), the `LIVELINESS_RULES` reach plus the three self-scoping strings in the
   same payloads and in the 7 Task A stores (owner T32), and the presence of the three strings in the constant itself (owner T16). The
   absence checks for the Task C FAQ variant and `buildTranslatePrompt` are green on arrival and are stay-green pins.
3. **FR-20 Assert-absent is implemented as the Specification words it (N10, binding):** `9–17`, `9-17`, `at most two consecutive`,
   `two consecutive sentences`, a digit-range-plus-`word` expression, and no sentence-length number other than `6`, applied to
   `LIVELINESS_RULES` (not to the whole master, whose `[SENTENCE LENGTH]` block carries the bands). It is **not** "no digit": `§1`, `§3`
   and `<h2>` in the required literals are not sentence-length numbers. The three self-scoping Assert-present strings are
   `govern writing a new description`, `when the task is to translate an existing text they do not apply`,
   `the source's sentences and their order are kept` (ASCII apostrophe, whitespace-collapsed text).
4. The amended Task C guard (T20, option b), the consumer reach pins (categories 16 to 19), the FR-27 oracle, the D15 fixture and the
   characterization pin are test-code and fixture and are TEST_WRITING's; the builder only commits / regenerates the fixtures named below
   (and never regenerates the T1 and T37 fixtures nor `task-c-description-prompts.json`). The amended guard's negative demonstration must
   not need a frozen-file edit (T20 Notes).
5. **D15 capture.** The T37 fixture is captured from BASE with the commit hash in its header, before any production edit, and is green on
   arrival. Optimizer block 0 is asserted `toBe(MASTER_SYSTEM_PROMPT)`, not digested, so nothing in the fixture is expected to move.
6. **Operator-notes specs are split by owner:** `operator-notes-form-state.spec.ts` (T40, category 21: clear, restore with notes, restore
   without notes, empty / whitespace-only values give no key, restore-then-clear), and in `app.component.operator-notes.spec.ts` separate
   describes for T12 (placement and labels), T13 (`buildGeneratorInput` pin, no-join pin, no-form-state pin), T38 (`restoreHistory` pin)
   and T39 (the two `clearAll` per-case pins and the slicing-helper test). The category 11 wiring pins exist only for tasks that are built
   (all of them need T21).
7. **The `validateStructuralParity` characterization pin** (Q-TRANS option 3, unconditional) is green on arrival, documents existing behaviour
   and has no owner task; it is re-run in T33 and must be updated only deliberately.

---

## T1 - Verify and commit the FR-27 `userContent` golden captured from the unmodified tree

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | none |
| **FROZEN (AGENTS.md section 9)** | no (it only reads `task-a.ts`). It is a **task-order precondition for T21 to T24**: no `task-a.ts` edit may precede it |

### What changes

The FR-27 oracle (new `userContent`-only fixture plus the Doc-wrapper remainder, D14) is confirmed to have been captured from BASE, the
commit the Story branch was cut from (currently `6546db8`; Reading guide item 10), with the `.arch-guard-checksums` `task-a.ts` entry at
that commit (currently `0421226c...`), and is committed. The input set is accepted as built (two-tier, as FR-27; owner 2026-10-18): it adds
the marker input the existing goldens lack. No production file changes. The capture is `TEST_WRITING`'s; if the fixture is absent, its
header lacks the BASE hash and checksum, or `git diff <BASE> -- src/prompts/task-a.ts` is non-empty at capture time, the builder stops and
loops back to `TEST_WRITING`; it never captures from an edited tree.

### Files

| File | Change |
|---|---|
| `test/fixtures/golden/task-a-user-content.json` | verify / commit (header records the BASE hash and the checksum) |
| `test/fixtures/task-a-user-content-inputs.ts` | verify / commit (one store per group `3DDevice`, `Center 3D Print`, `EXPERT3D`, `Expert-3DPrinter`; Full description + one simplified template; with/without `customInstructions`, image manifest, `baseLanguageOverride`; video, marker, video+marker) |
| `src/prompts/task-a.user-content.golden.spec.ts` | verify / commit |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-a.user-content.golden.spec.ts` (Tier A strict, Doc-wrapper remainder with and without `hookPattern`) | `test:logic` | FR-27, AC-9 |

Green on arrival (it pins the unmodified tree), so there is nothing red to turn green. Tier B (equal except the FR-11 spans) is red until T22/T23 and is not owned here.

### Acceptance check

`npx vitest run src/prompts/task-a.user-content.golden.spec.ts` shows Tier A and the wrapper-remainder tests green; the fixture header
names a BASE hash and `0421226c...`-style checksum; `git merge-base --is-ancestor <BASE> HEAD` exits 0 with `<BASE>` read from that header;
`git diff <BASE> -- src/prompts/task-a.ts` is empty; `git diff <BASE> --name-only -- src server tools package.json` lists no file that is
not a `*.spec.ts` (D14: production paths unchanged relative to BASE); the fixture was not produced with `-u`.

### Notes

BASE is never derived with `git merge-base HEAD main` (it returns `120dcbc` here, not the cut point; Reading guide item 10). If the branch
was re-cut, the header must name the new cut point or the task loops back to TEST_WRITING. Its sibling oracle for the other prompt families
is T37 (D15, the optimizer and the Task C FAQ variant); both are verify-and-commit tasks with no production edit and neither depends on the other.

---

## T2 - Add `findImageDeixis` and the per-language pattern table (leaf module)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

A dependency-free module `src/utils/image-deixis.ts` exports `findImageDeixis(text, locale): DeixisMatch | null`. The base language is the lower-cased primary subtag; unknown language, omitted/empty locale, empty or non-string text returns `null`; it never throws. Patterns use `(?<!\p{L})` / `(?!\p{L})` boundaries and are built to the Specification's required uk cases; ru, en, pl, de, es, pt entries are drafted by the builder from the same construction classes and labelled unreviewed in the module header. The code-authored `Фото: ` and `Зображення товару:` strings do not match. Only a type import from `output-validator` is allowed (no runtime import).

### Files

| File | Change |
|---|---|
| `src/utils/image-deixis.ts` | create: `findImageDeixis`, `DeixisMatch`, `DEIXIS_PATTERNS` (keys = language codes, not store locales) |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/image-deixis.spec.ts` (detector groups) | `test:logic` (happy-dom) | AC-5, FR-16, NFR-6, NFR-7, NFR-8 (table key set equals the set of primary subtags of all `STORE_REGISTRY` languages), the `Фото:` / `Зображення товару:` negatives, «на фотополімерній» negative |

### Acceptance check

`npx vitest run src/utils/image-deixis.spec.ts -t findImageDeixis` green: every uk required positive / negative of AC-5, >= 2 positives and >= 2 negatives for each of the six other languages, unknown and omitted locale -> `null`, registry cross-check passes; `npx tsc --noEmit` has no diagnostic in `image-deixis.ts`; the file's runtime imports are empty (checked by the existing import-cycle style spec or `grep -n "^import" src/utils/image-deixis.ts` shows only `import type`).

### Notes

Decided by the owner (OD-7, 2026-10-18, accepted as built): the uk precision candidates («Температура вище 200 °C», «на якому/на яких/на ній») are asserted neither way; the non-uk lists are drafted by the builder from the same construction classes and labelled unreviewed in the module header (native review is out of scope). Q-CODEALT "no" (decided): the detector does not match the code-authored `Фото: ` / `Зображення товару:`, which are explicit negatives; `ALT_PREFIX` and `FALLBACK_LABEL` are not changed. The table is keyed by language, not locale (NFR-8); the detector never imports `STORE_REGISTRY`.

---

## T3 - Add `collectFigureDeixis` and `imageDeixisIssues` (carrier walk and issue builder)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T2 |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

`image-deixis.ts` gains `collectFigureDeixisFromDocument(doc, locale)`, `collectFigureDeixis(html, locale, parse?)` (global `DOMParser` or an injected parse function for the CLI) and `imageDeixisIssues(doc, locale, context): ValidationIssue[]`. Carriers exactly as FR-17 (confirmed by the owner, OD-8, 2026-10-18): figure = every `<figure>` incl. video; paragraph above = previous element sibling only if it is a `<p>`; `figcaption`; `alt` of every `<img>`; one hit per carrier instance. The issue builder returns one `warning` (`rule: 'image-deixis'`) per figure whose paragraph above has a hit and nothing for figcaption, alt or a non-adjacent paragraph. Malformed HTML / no parser -> `[]`, never throws; undefined locale -> no issues.

### Files

| File | Change |
|---|---|
| `src/utils/image-deixis.ts` | modify: add the three functions and the hit type |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/image-deixis.spec.ts` (carrier and issue-builder groups) | `test:logic` (happy-dom) | AC-6, AC-7 (builder half), FR-17, FR-18 carrier table; heading-before-figure gives no paragraph hit; «нижче -10 °C» in a non-adjacent paragraph gives no issue |

### Acceptance check

`npx vitest run src/utils/image-deixis.spec.ts` green in full; `tsc` clean for the file; the issue level is `warning` in every assertion and none carries a `path`.

### Notes

Decided by the owner (OD-8, 2026-10-18, accepted as built): the adjacency and video-figure rules are FR-17 as written. The CLI later reuses `collectFigureDeixisFromDocument` through an injected parser, so keep it free of `globalThis` access except in the default parse path.

---

## T4 - Emit `image-caption-deixis` from `figureCaptionWarnings` (FR-19)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T2 |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

`figureCaptionWarnings(figures, locale = 'uk-UA')` gets an optional second parameter and emits a `warning` with `rule: 'image-caption-deixis'` when `findImageDeixis(captionPlainText(parts), locale)` hits, placed before the `if (f.fallbackLabel) continue;` skip so fallback-label figures are covered. A figure's warnings depend only on that figure, so `image-placeholder-validate.ts`'s `slice(before)` logic is unchanged and not edited. Existing callers are unchanged.

### Files

| File | Change |
|---|---|
| `src/utils/image-placeholder.ts` | modify: optional locale parameter and the new warning |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/image-placeholder.spec.ts` (extended) | `test:logic` | AC-7, FR-19 (rule id and `warning` level only; detail text not asserted) |
| `src/utils/image-placeholder-validate.spec.ts` (extended) | `test:logic` | `slice(before)` property still holds with the new warning |

### Acceptance check

Both specs green; the three existing `figureCaptionWarnings(...)).toEqual([])` assertions in `image-placeholder.spec.ts` (lines 173, 220, 242) are unchanged and still green; `image-placeholder-validate.ts` shows no diff.

---

## T5 - Remove the spatial pointer from all seven `LEAD_IN_TEMPLATES` (FR-15)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T2 (the test asserts `findImageDeixis(...) === null`); H-OD13 (Appendix E wording latitude) |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

The seven templates become the Appendix E sentences (en `See how ${p} works in practice.`, uk, ru, pl, de, es, pt); unknown language still falls back to the English template.

### Files

| File | Change |
|---|---|
| `src/utils/video-manifest.ts` | modify: `LEAD_IN_TEMPLATES` only |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/video-manifest.spec.ts` (extended) | `test:logic` | AC-4, FR-15: none of the AC-4 words in any template, `findImageDeixis` returns `null` for each, product name still present (existing restore test at line 111 stays green) |

### Acceptance check

`npx vitest run src/utils/video-manifest.spec.ts` green, including the unknown-language fallback case; no other function in the file changes.

### Notes

Independent of T6 in intent but same file: run T5 and T6 serially.

---

## T6 - Reword the `video-embed-missing` detail (FR-13, HTML sibling)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none; H-OD13 (validator message wording latitude) |
| **FROZEN (AGENTS.md section 9)** | no (this is the non-frozen half of FR-13; the frozen half is T25) |

### What changes

The `video-embed-missing` detail stops asking for a "lead-in" and asks for a body paragraph that states a product fact and does not point at the video. The Doc sibling `validateVideoCoverageDoc` is not touched.

### Files

| File | Change |
|---|---|
| `src/utils/video-manifest.ts` | modify: the detail string at the `video-embed-missing` issue only |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/video-manifest.spec.ts` (extended) | `test:logic` | FR-13 (video half): old words absent, new words present |

### Acceptance check

Spec green; `rule`/`severity` of the issue unchanged (existing repair-gate specs `repair-gate.spec.ts` still green).

---

## T7 - Reword the two `video-embed-restored` orchestrator warnings (FR-14)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none; H-OD13 (orchestrator message wording latitude) |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

The two warning texts (about lines 1105 and 1506) stop saying "lead-in". Nothing else in the orchestrator changes in this task.

### Files

| File | Change |
|---|---|
| `src/services/content-orchestrator.service.ts` | modify: the two warning strings |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/services/content-orchestrator.deixis-messages.spec.ts` (proposed name; may extend `content-orchestrator.image-placeholder.spec.ts`) | `test:logic` | FR-14, AC-3 |

### Acceptance check

Spec green; `rule` ids of the warnings unchanged; the existing orchestrator specs listed in impact v2 still green.

---

## T8 - Add `OperatorNotes` and optional `ProductInput.operatorNotes` (contract before consumer)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none |
| **FROZEN (AGENTS.md section 9)** | no (`src/app/types.ts` is not on the section 9 list) |

### What changes

`OperatorNotes` (four optional string keys `usageScenarios`, `testResults`, `previousGenerationComparison`, `limitations`) and `ProductInput.operatorNotes?: OperatorNotes` are added. It is a TypeScript interface only; no Zod change, no runtime code. It makes the history round trip and the FAQ-isolation tests type-clean.

### Files

| File | Change |
|---|---|
| `src/app/types.ts` | modify: add the interface and the optional field |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/services/content-orchestrator.operator-notes.spec.ts` (FR-28 group, proposed name; fake provider as in `content-orchestrator.faq-pipeline.spec.ts`) | `test:logic` | FR-28: notes only filled -> FAQ pipeline not started |
| `src/services/history.service.operator-notes.spec.ts` (proposed name) | `test:logic` | FR-31 item 1: `add` / read-back round trip of `operatorNotes`; entry without it still valid |

### Acceptance check

Both specs green; `npx tsc --noEmit` has no diagnostic caused by these specs; the change adds no runtime statement (diff shows only type declarations). No behaviour change in code: the two tests pass because the existing FAQ trigger (`input.supplementalContent?.trim()`) and `HistoryService` already ignore / carry the field, which is exactly what they pin.

### Notes

T8 and T9 are the only approval-independent parts of the operator-notes slice (plan D8 Gate) and must land before T21, which imports them. If the `task-a.ts` T-A4 item is later refused, they are dropped as dead code unless the human decides otherwise, together with the specs above: that is a TEST_WRITING loop back after the human's scope decision, never a builder deletion (AGENTS.md section 7.7).

---

## T9 - Create the `operator-notes` leaf module (empty rule, block, form helpers)

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T8 (imports `type` from `../app/types`) |
| **FROZEN (AGENTS.md section 9)** | no (`task-a.ts` consumes it in T21) |

### What changes

`src/prompts/operator-notes.ts` owns `OPERATOR_NOTE_FIELDS` (ordered keys with the confirmed English labels), `normalizeOperatorNotes(notes?)` (FR-25 empty rule: undefined / `{}` / all empty or whitespace-only -> `undefined`), `buildOperatorNotesBlock(notes?)` (`''` or `'[Operator Notes]\n' + lines + '\n'`, values trimmed, internal line breaks kept, partial fill lists only filled entries in the confirmed order), and the form helpers `toOperatorNotes(values)` and `toFormValues(notes?)`.

### Files

| File | Change |
|---|---|
| `src/prompts/operator-notes.ts` | create |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/operator-notes.spec.ts` | `test:logic` | FR-25, FR-26 (block bytes for full and partial fill), FR-27 (empty rule -> `''`), form-helper round trip |

### Acceptance check

`npx vitest run src/prompts/operator-notes.spec.ts` green with byte-exact block assertions; `grep -n "^import" src/prompts/operator-notes.ts` shows only `import type` from `../app/types`; no `task-a.ts` diff. The `toFormValues` assertions cover the mapping only: an `OperatorNotes` object or `undefined` becomes four strings, each absent key `''`; they say nothing about what a restore does.

### Notes

Prompt text lives here, not in a service (NFR-5). The labels and order are owner-confirmed (OD-16, OD-17). `toFormValues(undefined)` returning four empty strings is a **neutral mapping**: it encodes no decision about restoring an entry that has no notes. The decided behaviour (OD-2 R2, owner 2026-10-18: an entry without notes empties the textareas) lives in `OperatorNotesFormState.restore` (T40) and nowhere else. Same approval-independence and refusal consequence as T8.

---

## T10 - Add the four note values to `numericFidelitySources` (FR-30)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T8, T21 (gate: T-A4 approved and committed) |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

`numericFidelitySources` appends the four trimmed note values to its joined list, and its doc comment is updated. `NUMERIC_SOURCE_FIDELITY_RULES` text and the `supplementalContent` asymmetry are NOT changed (decided by the owner 2026-10-18, OD-20(2); a different wish is a Specification revision first and not this task). **Gate (plan D8):** the function reads notes that only the form (T12/T13) can supply and that only FR-26 (T21) sends; without T-A4 it is dead behaviour, so it is not built before T21 is committed and is dropped if T-A4 is refused.

### Files

| File | Change |
|---|---|
| `src/services/content-orchestrator.service.ts` | modify: `numericFidelitySources` and its comment |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/services/content-orchestrator.operator-notes.spec.ts` (FR-30 group) | `test:logic` | FR-30: a number present only in a note passes the alt/figcaption fidelity gate; a number absent everywhere still fails; a number only in `supplementalContent` behaves as before |
| FR-40 negatives in the same spec: `validateSpecsGrounding` and the SEO / slug / FAQ builders unchanged with notes filled | `test:logic` | FR-40 (non-Task-A side) |

### Acceptance check

Spec green; `content-orchestrator.doc-gate.spec.ts` and `content-orchestrator.image-placeholder.spec.ts` (the three call sites at about lines 674, 1081, 1489) still green; `git diff` shows no change to `constants.ts` or `task-c.ts`, and the `NUMERIC_SOURCE_FIDELITY_RULES` text is byte-unchanged.

---

## T11 - Create `OperatorNotesFieldsComponent` (four optional textareas)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T9 (value type and helpers), T21 (gate: T-A4 approved and committed) |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

A standalone `OnPush` component with signal inputs `values` and `labels` and an output `valuesChange`, rendering four `<label for>` + `<textarea>` pairs (no `required`, no placeholder) and emitting the full four-key object on every input event. Precedent: `content-template-select.component`. No RxJS. **Gate (plan D8 / D9):** user-visible, so it is not started before T21 is committed; if T-A4 is refused it is not built (a textarea whose text never reaches a prompt must not ship).

### Files

| File | Change |
|---|---|
| `src/app/components/operator-notes-fields/operator-notes-fields.component.ts` | create |
| `src/app/components/operator-notes-fields/operator-notes-fields.component.html` | create |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/app/components/operator-notes-fields/operator-notes-fields.component.spec.ts` | `test:components` | FR-24: four accessible textareas by role/label in en and uk, typing emits the updated object, empty stays empty, nothing required |

### Acceptance check

`npm run test:components` green for the new spec (`@testing-library/angular`, `user-event`, queried by role and label); `npx tsc --noEmit` clean for the component files.

---

## T12 - Create the notes state field, render the component in the Generator branch and add the eight label keys

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T11, T40, T21 (gate: T-A4 approved and committed); H-FR41TEST |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

`app.component.ts` gains `readonly operatorNotesState = new OperatorNotesFormState();` (a field initialiser, no DI), a `computed` of the four labels from `uiLabels()`, and eight new `TRANSLATIONS` keys (en/uk, four each, owner-confirmed text). `app.component.html` renders the component once in the Generator form branch (serves `generator` and `ua-generator`), bound to `operatorNotesState.values()` / `set($event)`, outside the `selectedWebsite()?.name !== 'Expert-3DPrinter'` image block and outside any `templateId` condition (OD-2(b)); the notes are shown for every store including Expert-3DPrinter (decided by the owner, OD-19(2)). Gate as T11: nothing user-visible before T21 is committed. This task does not touch `buildGeneratorInput`, `restoreHistory` or `clearAll` (T13, T38, T39).

### Files

| File | Change |
|---|---|
| `src/app/app.component.ts` | modify: `operatorNotesState` field, labels computed, `TRANSLATIONS` keys |
| `src/app/app.component.html` | modify: one component placement |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/app/app.component.operator-notes.spec.ts` (T12 describe: placement and labels; source-text wiring pins, precedent `app.component.template-wiring.spec.ts`) | `test:logic` | FR-24, category 11: rendered exactly once, in the Generator branch, outside the Expert-3DPrinter image block and `templateId` conditions; bound to `operatorNotesState`; eight keys present in both languages |

### Acceptance check

Wiring spec (placement and label pins) green; no `AppComponent` TestBed spec is introduced; `app.component.template-wiring.spec.ts` and `app.component.faq-layout.spec.ts` still green; `grep -n operatorNotesForm src/app` returns nothing (the field is `operatorNotesState`).

### Notes

H-FR41TEST: the field is the state class under the plan's default split; alternative (b) (bare signal) would change this task, so a changed answer is a loop back, not a builder edit.

---

## T13 - Carry the notes through `buildGeneratorInput` (FR-25, FR-27, FR-28, FR-31.3)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T8, T9, T12, T40, T21 (gate: T-A4 approved and committed); H-FR41TEST |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

`buildGeneratorInput` adds `...this.operatorNotesState.inputPart()`, which is `{}` when the notes are empty by the FR-25 rule and `{ operatorNotes }` otherwise, so an empty form yields no key at all (FR-27; an explicit `operatorNotes: undefined` property would still be a key). `runFaqPipeline` is untouched (FR-28: notes are never joined into `supplementalContent`). The `seo_gen_form_state` constructor / effect does NOT read or write the state (FR-31.3). The `restoreHistory` line is T38 and the `clearAll` resets are T39; this task touches neither.

### Files

| File | Change |
|---|---|
| `src/app/app.component.ts` | modify: `buildGeneratorInput` only |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/app/app.component.operator-notes.spec.ts` (T13 describe: builder group, source-text pins) | `test:logic` | FR-25, FR-27: `buildGeneratorInput`'s body contains `operatorNotesState.inputPart()` and writes no literal `operatorNotes:` key itself; FR-28 (no join into `supplementalContent`; `runFaqPipeline` untouched); FR-31 item 3 (no mention of `operatorNotes` in the `seo_gen_form_state` constructor / effect region). The behaviour of `inputPart()` is owned by T40 |

### Acceptance check

Spec green; `git diff` shows `buildGeneratorInput` only (no `restoreHistory`, no `clearAll`); `app.component.template-wiring.spec.ts` and `app.component.faq-layout.spec.ts` still green.

### Notes

Because `buildGeneratorInput` reads the state, after a restore the next Generate / UA Description click resends the restored notes (FR-31 item 4, decided by the owner, OD-2 R1). That behaviour is proven by T40's tests; the call-site text by T38.

---

## T14 - Vision pre-pass: product-fact `description`, picture-free `alt`, no-inference sentence (FR-1 to FR-4)

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | none; H-OD13 (FR-1 / FR-2 prose beyond the asserted strings) |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

In the UKRAINIAN FIELDS block the `description` and `alt` lines are rewritten per FR-1 / FR-2 (product facts, no picture pointers; alt carries no deixis), one Grounding-rules sentence is added (FR-3), and the pinned phrases `one sentence`, `differ`, `NUMBERS ARE THE HIGHEST-RISK ELEMENT` are kept (FR-4). The Vision JSON field set is unchanged (NFR-12).

### Files

| File | Change |
|---|---|
| `src/prompts/vision-prepass.ts` | modify |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/vision-prepass.spec.ts` (extended) | `test:logic` | AC-1, FR-1 to FR-4 present / absent literals over whitespace-collapsed text |

### Acceptance check

Spec green; no key added to the Vision JSON shape; existing pins in `vision-prepass.spec.ts` unchanged.

### Notes

R4: FR-1 / FR-2 reach marker-built figures only; model-authored figcaptions are covered by T15/T27, and live coverage is H-OD11.

---

## T15 - Add the `NO_IMAGE_DEIXIS_RULE` constant (FR-5 text)

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T37 |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

`constants.ts` exports `NO_IMAGE_DEIXIS_RULE`: the FR-5 restated block as written (it contains `figcaption`, `alt`, `«на зображенні»`, `«на фото»`, `«нижче»`, `deleted, not reworded`). It is a static string with no per-store or per-run interpolation (NFR-1). It is not interpolated anywhere yet, so no payload byte changes and no golden moves.

### Files

| File | Change |
|---|---|
| `src/prompt-core/constants.ts` | modify: new export |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/constants.no-image-deixis.spec.ts` (proposed name) | `test:logic` | FR-5 literals in the constant; static (identical regardless of store) |

### Acceptance check

Spec green; `full-description.golden.spec.ts` and `task-c.description-bytes.spec.ts` unchanged and green (the constant is unused); `constants.spec.ts` green; the D15 fixture spec (T37) is green; `grep -nE "§C[1-6]|CONSUMABLES|TRANSLATE the generic descriptor|reorder it category-first|fit-content"` over the new constant returns nothing.

### Notes

T37 is a hard predecessor: this is the first edit to `constants.ts` and the D15 fixture must be captured from the unmodified tree first (its spec stays green here).

Q-TRANS option (2) (a matching translation-scope sentence beside the FR-5 literals) was **not chosen** by the owner: the literals `deleted, not reworded`, `figcaption`, `alt` stay verbatim and nothing is added beside them. The collision with the FR-20 self-scoping sentence ("the source's sentences and their order are kept") is a declared residual risk (R1d), not something this task resolves by rewording.

**Prose constraints from the watch items (plan D0.7, R21).** `task-translate.simplified.spec.ts` line 83, `task-c.spec.ts` lines 271 and 295, `image-figure-style.prompt-examples.spec.ts` line 57 and `output-integrity-wiring.spec.ts` scan the master. This constant is not yet interpolated, so they stay **falsely green** here and first go red inside the frozen-file commit T27. The text of `NO_IMAGE_DEIXIS_RULE` therefore must not contain `§C1` to `§C6`, `CONSUMABLES`, `TRANSLATE the generic descriptor`, `reorder it category-first` or `fit-content`; check it now with `grep -nE` over the new constant (empty result expected). A red result later means the prose is wrong, never the test.

---

## T16 - Add the `LIVELINESS_RULES` constant with the self-scoping sentence (FR-20, FR-21)

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T15 (serial, same file), T37; H-FR20PREC, H-OD13 |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

`constants.ts` exports `LIVELINESS_RULES`: SCENE, RHYTHM (without the 9-17 band; the only sentence-length number is `6`, and `[SENTENCE LENGTH]` is named as the authority), HONEST LIMITS and HOOK (only the `[use-case]` slot); the `apply only where §3 exists` literal; the precedence sentence `where a store voice block defines its own bullet form, heading form, tone or punctuation limits, that block wins` (PROPOSED DEFAULT wording, H-FR20PREC); and, as the last sentence, the **FR-20 self-scoping sentence**, VERBATIM and normative (owner 2026-10-18, ASCII apostrophe, no digit): `These rules govern writing a new description; when the task is to translate an existing text they do not apply, and the source's sentences and their order are kept.` The constant is static, with no interpolation and no per-consumer text (NFR-1); it is not yet interpolated, so no payload byte changes and no golden moves.

### Files

| File | Change |
|---|---|
| `src/prompt-core/constants.ts` | modify: new export |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/constants.liveliness.spec.ts` (proposed name) | `test:logic` | AC-8, FR-20 Assert-present and Assert-absent **as the Specification words it (N10)**: none of `9–17`, `9-17`, `at most two consecutive`, `two consecutive sentences`, no digit-range-plus-`word` expression, no sentence-length number other than `6` (`§1`, `§3` and `<h2>` in the required literals are not sentence-length numbers; the test is not "no digit"); FR-21 (each ToV block keeps its tone limits: existing `constants.spec.ts` pins untouched); **category 19, constant half:** the three strings `govern writing a new description`, `when the task is to translate an existing text they do not apply`, `the source's sentences and their order are kept` are present in `LIVELINESS_RULES` over whitespace-collapsed text |
| D15 fixture spec (T37) | `test:logic` | stays green (this is a `constants.ts` edit) |

### Acceptance check

Spec green; `constants.spec.ts` "mirrors" band test and every existing overlay pin still green; INVARIANT START and `none of them varies the start` untouched; the D15 spec is green; `grep -nE "§C[1-6]|CONSUMABLES|TRANSLATE the generic descriptor|reorder it category-first|fit-content"` over the new constant returns nothing.

### Notes

The literal is decided (Q-SCOPE, owner 2026-10-18); only the precedence sentence (H-FR20PREC) and the prose beyond the asserted literals (H-OD13, Appendix C) are open. A changed precedence sentence changes TEST_WRITING's strings: a loop back, never a builder edit. The self-scoping sentence collides with the FR-5 literal `deleted, not reworded` (R1d) and does not name the optimizer's task (R7a); the owner accepted both (Q-TRANS, Q-OPT); no sentence is added.

**Prose constraints (watch items, plan D0.7, R21).** As in T15 the master-scanning watch tests stay falsely green until the constant is interpolated in the frozen commit T32. The text must not contain `§C1` to `§C6`, `CONSUMABLES`, `TRANSLATE the generic descriptor`, `reorder it category-first` or `fit-content`; `output-integrity-wiring.spec.ts` (`NO_LEAKED_REASONING_CLAUSE` reach) is not touched by this constant and stays green.

---

## T17 - Doc pipeline FIGURE PLACEMENT asks for a fact paragraph (FR-10) and regenerate the golden

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | none; H-OD13 (FR-10 prose beyond the asserted literals) |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

The `TASK_A_DOC_INSTRUCTION` FIGURE PLACEMENT paragraph is rewritten per FR-10 (a body paragraph that states a product fact and does not refer to the picture; `no orphan images` kept). `buildPromptADoc` is not edited (the `[Operator Notes]` block reaches it through the `base.userContent` byte prefix). `full-description-prompts.json` is regenerated for block 1 of the `doc/*` cases only; the header exceptions list in `full-description-inputs.ts` gets the first US-9.1 entry and the golden spec gets a "regenerated" pin set for this text.

### Files

| File | Change |
|---|---|
| `src/prompts/task-a-doc.ts` | modify: FIGURE PLACEMENT paragraph only |
| `test/fixtures/golden/full-description-prompts.json` | regenerate (reviewed diff: block 1 of `doc/*` only) |
| `test/fixtures/full-description-inputs.ts` | modify: header exceptions entry |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-a-doc.spec.ts` (extended) | `test:logic` | AC-3, FR-10 literals |
| `src/prompts/full-description.golden.spec.ts` ("regenerated" pins) | `test:logic` | NFR-9 |
| `src/prompts/task-a-doc.spec.ts` / simplified Doc instruction specs (OD-19 (1b) Assert-absent) | `test:logic` | `[Operator Notes]` absent from `TASK_A_DOC_INSTRUCTION`, from `buildSimplifiedDocInstruction(...)` for every template and from the FR-10 edit (decided by the owner; green on arrival, stays green; `task-a-doc.ts` gets no notes text) |

### Acceptance check

Both specs green; the golden diff touches only block 1 of the `doc/*` cases (the 4 other description `userContent` entries and both `translate/*` cases do not move); `task-a-doc.v4.spec.ts` line 207 regex and `task-a-doc.simplified.spec.ts` still green; `simplified-template-blocks.ts` untouched (R8, Q-SIMPL): `git diff -- src/prompts/simplified-template-blocks.ts` is empty (tripwire for `SIMPLIFIED_TRANSLATION_CLAUSE`, which an edit would move into Task C block 1 in 16 golden cases).

---

## T18 - C3D OVERRIDE #5 compares the opener to the paragraph above the figure (FR-12) and regenerate the golden

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T16 (serial, same file), T17 (serial on the golden), T37 (the D15 capture must exist before any `constants.ts` edit); H-OD13 (OVERRIDE #5 prose beyond the asserted literals) |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

The sentence in `C3D_TOV_BASE_OVERLAY` OVERRIDE #5 that compares the opener with the lead-in is rewritten per FR-12. The golden is regenerated for the overlay block of the `*/c3d*` cases only.

### Files

| File | Change |
|---|---|
| `src/prompt-core/constants.ts` | modify: OVERRIDE #5 sentence only |
| `test/fixtures/golden/full-description-prompts.json` | regenerate (reviewed diff: overlay block of `*/c3d*`) |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/constants.spec.ts` (C3D overlay pins at lines 118-170 stay; new FR-12 pin added by TEST_WRITING) | `test:logic` | AC-3, FR-12 |
| `src/prompts/full-description.golden.spec.ts` | `test:logic` | regenerated bytes |
| D15 fixture spec (T37) | `test:logic` | stays green (`constants.ts` edit) |

### Acceptance check

Specs green; golden diff limited to that overlay text; FR-23: no liveliness text appears in `C3D_TOV_BASE_OVERLAY`.

---

## T19 - EXPERT3D overlay: APPLICATIONS, HEADINGS, amended line (FR-22) and regenerate the golden

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T18 (serial, same file and golden), T37; H-OD13 (Appendix A prose beyond the asserted literals) |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

In `EXPERT3D_TOV_BASE_OVERLAY` only: the `Keep the schema's mandated section order and headings` line becomes Appendix A's single sentence (the old form gone, `the ToV changes the WORDING and the evidence discipline, not the structure` verbatim), the closing "In Applications ..." paragraph is replaced by APPLICATIONS, and HEADINGS is added (functional `<h2>` only for §3, `<h3>` nominal, at most one colon or dash, the rest of `[HEADING FORM]` still applies). "never bare noun" is NOT introduced into any `systemBlocks` text. Golden regenerated for the overlay block of `*/expert3d*`.

### Files

| File | Change |
|---|---|
| `src/prompt-core/constants.ts` | modify: `EXPERT3D_TOV_BASE_OVERLAY` only |
| `test/fixtures/golden/full-description-prompts.json` | regenerate (reviewed diff: overlay block of `*/expert3d*`) |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/constants.expert3d.spec.ts` (proposed name; existing EXPERT3D pins in `constants.spec.ts` stay) | `test:logic` | AC-8, FR-22 literals; absent: `Keep the schema's mandated section order and headings` |
| `src/prompts/task-a.spec.ts` (guards at lines 122, 133 must stay green) | `test:logic` | `never bare noun` absent; cached prefix byte-identical across every store |
| `src/prompts/full-description.golden.spec.ts` | `test:logic` | regenerated bytes |
| D15 fixture spec (T37) | `test:logic` | stays green (`constants.ts` edit) |

### Acceptance check

Specs green; `C3D_TOV_BASE_OVERLAY` not touched by this task; golden diff limited to the EXPERT3D overlay text.

### Notes

R9: `heading-style.ts` Style B is gated to Center 3D Print, so no `heading-style.ts` edit; the HEADINGS rule restates that product-name placement still applies.

---

## T20 - Verify and commit the amended Task C description guard (option (b): block 0 follows the live master)

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | none |
| **FROZEN (AGENTS.md section 9)** | no (guard spec only; `task-c.ts` is never edited, and the golden JSON is not modified) |

### What changes

Option (b) is DECIDED (owner 2026-10-18, Q1). `src/prompts/task-c.description-bytes.spec.ts` is the amended guard authored by `TEST_WRITING`; this task verifies and commits it, and it lands **before T27**, in its own commit, **with no co-commit** with any master task. Its properties (plan D0.2; a property list, not a task order):

- the per-case **block count** stays pinned (equals the record's);
- **block 0**: `text` is compared `toBe` the live `MASTER_SYSTEM_PROMPT`, and its `cache` flag stays pinned per case;
- **block 1 and `userContent`**: `length` and `sha256` (and, for block 1, `cache`) stay pinned per case against the unchanged record;
- `test/fixtures/golden/task-c-description-prompts.json` stays **byte-unchanged**; its 96 block-0 `sha256` / `length` records (`b01074fa...5433`, 45 387) describe the pre-Story master, are no longer read, and the spec header says so (R24); the header sentence "Never regenerate the golden, never pass `-u`" stays true for the JSON and is amended to say block 0 follows the live master;
- the premise tests (16 pairs, 96 cases) stay;
- **green on arrival and after the master edit**: block 0 equals the master both before and after, so nothing forces a co-commit and no digest is ever bumped.

AGENTS.md section 7.7, named not silent: what the guard stops pinning is the master's bytes for 96 cases by digest (the master's text stays pinned by the master specs and by the reviewed regeneration of `full-description-prompts.json`); what it newly proves is that block 0 of every Task C description prompt **is** the master. It cannot show that the master changed unintentionally.

### Files

| File | Change |
|---|---|
| `src/prompts/task-c.description-bytes.spec.ts` | verify / commit the amended guard (test code, authored by TEST_WRITING) |

`test/fixtures/golden/task-c-description-prompts.json` is **not** a file of this task: `git diff` over it must be empty.

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-c.description-bytes.spec.ts` | `test:logic` | NFR-9, FR-23 payload level: 96 per-case tests; block 1 (96 instructions) and `userContent` unchanged; premise tests (16 pairs, 96 cases). **Green on arrival** (and after every master task), so there is nothing red to turn green |

### Acceptance check

`npx vitest run src/prompts/task-c.description-bytes.spec.ts` is fully green at this commit and stays green at every later commit; `git diff --exit-code -- test/fixtures/golden/task-c-description-prompts.json` exits 0; `git diff -- src/prompts/task-c.ts src/prompts/task-translate.ts` is empty and the `task-c.ts` checksum `619c45a9...9247` in `.arch-guard-checksums` is unchanged; **negative demonstration recorded as evidence** (plan D0.2): the guard is shown to fail on a one-character change to a block-1 record and to a `userContent` record, then the change is reverted and `git diff` over the JSON is empty again.

### Notes

R1b / R24. **Do not demonstrate the failure by editing a frozen file.** Plan D0.2 words the demonstration as "a deliberate one-character change to Task C's block-1 instruction"; that text lives in `src/prompts/task-c.ts`, which is FROZEN (checksum `619c45a9...`), and a temporary edit of it would be an AGENTS.md section 9 edit without a "modify src/prompts/task-c.ts" instruction. The demonstration is therefore done on **test data**: a scratch copy of the golden record (or an in-memory mutated record fed to the guard's own comparison) with one block-1 `sha256` character and one `userContent` `sha256` character changed; the real JSON is never left modified. If TEST_WRITING's guard cannot be exercised that way, the builder STOPS and loops back to TEST_WRITING; it never edits `task-c.ts`, `task-translate.ts` or `simplified-template-blocks.ts` (tripwire) even temporarily.

---

## T21 - `task-a.ts` T-A4: import and interpolate `buildOperatorNotesBlock` (FR-26)

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T1, T8, T9; H-OD12 (task-a.ts, item T-A4) |
| **FROZEN (AGENTS.md section 9)** | **`src/prompts/task-a.ts` - BLOCKED-UNTIL-APPROVED.** This task MUST stop and request approval before editing it: add `import { buildOperatorNotesBlock } from './operator-notes';` and insert `${buildOperatorNotesBlock(input.operatorNotes)}` immediately before `${buildImageBlock(input, store.imageBaseUrl)}` on the line after `[Supplemental Content]: ...`. Why: the only route to the `[Operator Notes]` block (`buildPromptA`, and `buildPromptADoc` through its byte prefix); the rendering lives in the leaf module, not the frozen file. Needs the user's explicit "modify src/prompts/task-a.ts" in the builder's session. **Refusal or no instruction:** Reading guide item 8 and the Refusal table (the specs for this item stay red; the human decides the scope; TEST_WRITING loop-back; the builder never deletes or weakens a test). |

### What changes

`buildPromptA` emits the `[Operator Notes]` block at the FR-26 offset (right after the whole supplemental value, before the image block); an empty block is the empty string, so Tier A byte identity holds by construction. Refusal of this item drops FR-26 and with it FR-24 to FR-31, FR-40's meaning, FR-41 and the master hunk M6 (T31) (no non-frozen route). **This task is the gate of Group B:** T10, T11, T12, T13, T38, T39 and T40 (and the master task T31) depend on T21 being committed, and none of them is built if T-A4 is refused (textareas must not ship inert). T8 and T9 are then dropped unless the human decides otherwise, and because the FR-24 to FR-31 specs already exist and are red, the human must decide the scope (FR-24 to FR-31 only, or the Story) and TEST_WRITING (and SPECIFICATION, if the scope changes) is re-entered; the builder never deletes those tests (AGENTS.md section 7.7).

### Files

| File | Change |
|---|---|
| `src/prompts/task-a.ts` | modify: one import line, one interpolation |
| `.arch-guard-checksums` | rebaseline in the same commit |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-a.operator-notes.spec.ts` (proposed name) | `test:logic` | FR-26 position test (with-notes equals without-notes plus the block at the offset), FR-40 positive side (`buildPromptADoc` carries the block through the prefix, no `task-a-doc.ts` notes text), notes in `userContent` not `systemBlocks` (NFR-1); **Expert-3DPrinter (OD-19 (2), decided):** `buildPromptA` for that store profile with filled notes contains the `[Operator Notes]` block at the FR-26 position (category 8); **OD-19 (1b), decided:** `[Operator Notes]` absent from `TASK_A_DOC_INSTRUCTION` and the simplified Doc instructions (Assert-absent, stays green) |
| `src/prompts/task-a.user-content.golden.spec.ts` (Tier A) | `test:logic` | FR-27 stays green |
| `src/prompts/task-a.spec.ts`, `task-a-doc.spec.ts` | `test:logic` | cached-prefix test and AC-9b blocks unchanged |

### Acceptance check

Specs green; with all four notes empty `buildPromptA(...).userContent` is byte-equal to the T1 oracle for every captured input; `bash arch-guard.sh --rebaseline` then `bash arch-guard.sh` exits 0; `git diff` shows exactly two changed lines in `task-a.ts`.

### Notes

First of the four `task-a.ts` tasks because it carries the byte-identity risk and because it decides whether the operator-notes slice exists (plan D8 Gate): ask this item first, at the plan gate for intent and in the builder's session for the actual "modify src/prompts/task-a.ts" instruction. A plan-gate answer is not that instruction. Commit shape is decided by this breakdown (Reading guide item 9): T21 is its own commit and does not share a commit with T22 to T24; each commit carries its own `--rebaseline`.

---

## T22 - `task-a.ts` T-A2: `buildVideoBlock` places the embed after a fact paragraph (FR-11.2) and regenerate the golden

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T1, T21 (serial, same file); H-OD12 (task-a.ts, item T-A2) |
| **FROZEN (AGENTS.md section 9)** | **`src/prompts/task-a.ts` - BLOCKED-UNTIL-APPROVED.** STOP and request approval first. Change: replace `Introduce each with its own lead-in <p> in the body language, and place it in §3 FUNCTIONALITY, before §7. The lead-in must not restate the figcaption.` with `Place each directly after a body paragraph of its sub-section, written in the body language, that states a product fact and does not refer to the video, and place it in §3 FUNCTIONALITY, before §7. That paragraph must not restate the figcaption.` Why: the line teaches the model to introduce each video with a lead-in. Needs the user's explicit "modify src/prompts/task-a.ts". **Refusal or no instruction:** Reading guide item 8 and the Refusal table (the specs for this item stay red; the human decides the scope; TEST_WRITING loop-back; the builder never deletes or weakens a test). |

### What changes

The video block's instruction uses the owner's pointer-free wording; `§3 FUNCTIONALITY, before §7` is unchanged. The `userContent` of the 3 EXPERT3D video cases in `full-description-prompts.json` moves only by this span and is regenerated here.

### Files

| File | Change |
|---|---|
| `src/prompts/task-a.ts` | modify: `buildVideoBlock` string |
| `test/fixtures/golden/full-description-prompts.json` | regenerate (reviewed diff: `userContent` of the 3 EXPERT3D cases, FR-11.2 span only) |
| `.arch-guard-checksums` | rebaseline in the same commit |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-a.deixis-wording.spec.ts` (proposed name) | `test:logic` | AC-3, FR-11 item 2 present / absent literals |
| `src/prompts/task-a.user-content.golden.spec.ts` (Tier B, video inputs) | `test:logic` | FR-27 Tier B: equal to the oracle except the FR-11 span |
| `src/prompts/task-a.spec.ts`, `master-system-prompt*.spec.ts` | `test:logic` | `§3 FUNCTIONALITY, before §7` intact |

### Acceptance check

Specs green; Tier B video cases differ from the oracle only inside the replaced span; arch-guard rebaselined and clean. Refusal of T-A1 to T-A3 drops FR-11 and Tier B degenerates to Tier A equality (FR-26 unaffected).

---

## T23 - `task-a.ts` T-A3: `buildMarkerBlock` ties the marker to the product-fact paragraph (FR-11.3)

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T1, T22 (serial, same file); H-OD12 (task-a.ts, item T-A3); H-FR11I3 |
| **FROZEN (AGENTS.md section 9)** | **`src/prompts/task-a.ts` - BLOCKED-UNTIL-APPROVED.** STOP and request approval first. Change: replace `at the end of the sentence that introduces what the image shows;` with `at the end of the paragraph that states the product fact the image belongs to (the paragraph never mentions the picture);`. Why: the marker is told to sit after the sentence that introduces the picture. The wording is the source-analysis PROPOSED DEFAULT (unconfirmed, H-FR11I3). Needs the user's explicit "modify src/prompts/task-a.ts". **Refusal or no instruction:** Reading guide item 8 and the Refusal table (the specs for this item stay red; the human decides the scope; TEST_WRITING loop-back; the builder never deletes or weakens a test). |

### What changes

The marker block span is rewritten. No existing golden has a marker input, so no existing golden moves; the FR-27 oracle (T1) is the only byte guard.

### Files

| File | Change |
|---|---|
| `src/prompts/task-a.ts` | modify: `buildMarkerBlock` string |
| `.arch-guard-checksums` | rebaseline in the same commit |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-a.deixis-wording.spec.ts` (marker group) | `test:logic` | AC-3, FR-11 item 3 |
| `src/prompts/task-a.user-content.golden.spec.ts` (Tier B, marker and video+marker inputs) | `test:logic` | FR-27 Tier B |

### Acceptance check

Specs green; marker-input `userContent` differs from the oracle only in the span; arch-guard clean.

---

## T24 - `task-a.ts` T-A1: `TASK_A_INSTRUCTION` figure clause (FR-11.1) and regenerate the golden

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T1, T23 (serial, same file); H-OD12 (task-a.ts, item T-A1) |
| **FROZEN (AGENTS.md section 9)** | **`src/prompts/task-a.ts` - BLOCKED-UNTIL-APPROVED.** STOP and request approval first. Change: `...directly after a </ul>: an image still needs its own lead-in <p>.` becomes `...directly after a </ul>: a figure needs a body <p> directly above it, and that <p> never refers to the picture.` (the words `Do not place a <figure> directly after a </ul>` unchanged). Why: the clause teaches the model to write an introducing lead-in above a figure. Needs the user's explicit "modify src/prompts/task-a.ts". **Refusal or no instruction:** Reading guide item 8 and the Refusal table (the specs for this item stay red; the human decides the scope; TEST_WRITING loop-back; the builder never deletes or weakens a test). |

### What changes

The instruction clause changes. Block 1 of the `html/*` cases in `full-description-prompts.json` moves and is regenerated here. This is `systemBlocks[1]`, so nothing moves into or out of `userContent`.

### Files

| File | Change |
|---|---|
| `src/prompts/task-a.ts` | modify: `TASK_A_INSTRUCTION` clause |
| `test/fixtures/golden/full-description-prompts.json` | regenerate (reviewed diff: block 1 of `html/*`) |
| `.arch-guard-checksums` | rebaseline in the same commit |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-a.deixis-wording.spec.ts` (instruction group) | `test:logic` | AC-3, FR-11 item 1; `Do not place a <figure> directly after a </ul>` present |
| `src/prompts/task-a.spec.ts` (`<figure> directly after` pin, `never bare noun` absent) | `test:logic` | stays green |
| `src/prompts/full-description.golden.spec.ts` | `test:logic` | regenerated bytes |

### Acceptance check

Specs green; golden diff limited to that clause in the `html/*` cases; arch-guard clean. After T24 the `task-a.ts` checksum in `.arch-guard-checksums` is the post-Story value recorded in the final commit.

---

## T25 - `output-validator.ts` O1: `image-manifest-missing` detail asks for a body paragraph (FR-13)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none; H-OD12 (output-validator.ts, item O1); H-OD13 (repair-message wording latitude) |
| **FROZEN (AGENTS.md section 9)** | **`src/utils/output-validator.ts` - BLOCKED-UNTIL-APPROVED.** STOP and request approval first. Change: in `checkImageManifestCoverage`, the detail `a substantive lead-in <p> directly above it, never adjacent to another <figure>, filename verbatim.` becomes `a body <p> directly above it (a product fact that does not point at the picture), never adjacent to another <figure>, filename verbatim.` Why: the repair cycle feeds this text back to the model and the old wording reintroduces the pointing phrasing. A sibling cannot carry this text. Needs the user's explicit "modify src/utils/output-validator.ts". **Refusal or no instruction:** Reading guide item 8 and the Refusal table (the specs for this item stay red; the human decides the scope; TEST_WRITING loop-back; the builder never deletes or weakens a test). |

### What changes

Only the detail string changes; rule id, severity and message structure are unchanged. Refusal drops the frozen half of FR-13 (no fallback; the video half is T6).

### Files

| File | Change |
|---|---|
| `src/utils/output-validator.ts` | modify: one string |
| `.arch-guard-checksums` | rebaseline in the same commit |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/output-validator.spec.ts` (image-manifest block at line 750, extended) | `test:logic` | AC-3, FR-13 (image half): old words absent, new present |
| `src/utils/repair-gate.spec.ts` | `test:logic` | unchanged and green |

### Acceptance check

Specs green; arch-guard rebaselined and clean; `git diff` is one string.

---

## T26 - `output-validator.ts` O2: `validateGeneratedHtml` emits `image-deixis` at `warning` (FR-18)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T3, T25 (serial, same file); H-OD12 (output-validator.ts, item O2) |
| **FROZEN (AGENTS.md section 9)** | **`src/utils/output-validator.ts` - BLOCKED-UNTIL-APPROVED.** STOP and request approval first. Change: add `import { imageDeixisIssues } from './image-deixis';` and one line `issues.push(...imageDeixisIssues(doc, locale, context));` inside the existing `DOMParser` `try`, after the figure-wrapping rules (reuses `doc`; no second parse; skipped where `DOMParser` is unavailable or `locale` is undefined). Why: AC-7 requires `validateGeneratedHtml` itself to emit the rule; the logic is in the sibling. Needs the user's explicit "modify src/utils/output-validator.ts". Refusal drops FR-18; the fallback (emitting from the orchestrator through `imageDeixisIssues`) does not match AC-7's wording and is the human's call. **Refusal or no instruction:** Reading guide item 8 and the Refusal table (the specs for this item stay red; the human decides the scope; TEST_WRITING loop-back; the builder never deletes or weakens a test). |

### What changes

The paragraph-above carrier produces an `image-deixis` `warning` from `validateGeneratedHtml`; the figcaption and alt carriers produce none (FR-18 table is normative); warnings never enter the repair loop (no `REPAIR_STRATEGIES` / `NON_REGENERABLE_RULES` entry).

### Files

| File | Change |
|---|---|
| `src/utils/output-validator.ts` | modify: one import, one call |
| `.arch-guard-checksums` | rebaseline in the same commit |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/output-validator.image-deixis.spec.ts` (proposed name) | `test:logic` | AC-7, FR-18: `warning` only, paragraph carrier only, «нижче -10 °C» elsewhere gives nothing |
| `src/utils/output-validator.spec.ts`, `output-validator.simplified.spec.ts`, `repair-gate.spec.ts`, `test/render-reconciliation.spec.ts`, `test/render-conformance*.spec.ts` | `test:logic` | no regression; the corpus EXPERT3D item (14 pointer sentences) gains warnings only and the harness still asserts `severity === 'error'` only |
| import-cycle check (`task-a.import-cycle.spec.ts` style) | `test:logic` | no runtime cycle between `output-validator.ts` and `image-deixis.ts` |

### Acceptance check

Specs green; corpus fixtures unchanged (`git diff test/fixtures/corpus` empty); arch-guard clean; the issue has `severity: 'warning'` in every assertion.

---

## T27 - `master-system-prompt.ts` M1+M2: interpolate `NO_IMAGE_DEIXIS_RULE` (FR-5) and regenerate the golden

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T15, T20, T37; H-OD12 (master-system-prompt.ts) |
| **FROZEN (AGENTS.md section 9)** | **`src/prompt-core/master-system-prompt.ts` - BLOCKED-UNTIL-APPROVED.** STOP and request approval first. Change: add `NO_IMAGE_DEIXIS_RULE` to the existing `./constants` import (M1) and add `${NO_IMAGE_DEIXIS_RULE}` as its own block between the end of `[VIDEO]` and the `[IMAGE HANDLING]` heading, outside the span the image-markers spec pins (M2). Why: the master-prompt source of the pointing phrasing and the home of the shared rule. **The approval request must name the affected consumers (impact v4): (i) Task A, (ii) Task C description translation (all 96 store x language prompts, block 0) and (iii) the optimizer** - the Task C file checksum does not move, so arch-guard cannot show it. Consequences to disclose: the Task C description prompts and the optimizer prompt carry the new text (accepted by the owner, Q1); 10 of 12 `full-description-prompts.json` cases move at block 0; the amended Task C guard (T20) stays green because it compares block 0 with the live master; the translation-side behavioural risk (R1a) and the optimizer inheritance (R7a) are not closed by this edit. Needs the user's explicit "modify src/prompt-core/master-system-prompt.ts". **Refusal or no instruction:** Reading guide item 8 and the Refusal table (the specs for this item stay red; the human decides the scope; TEST_WRITING loop-back; the builder never deletes or weakens a test). |

### What changes

The cached master (`systemBlocks[0]`) carries the NO PICTURE REFERENCES rule for every store, once, outside `[IMAGE HANDLING]`. The cache is invalidated once for every store, for Task C description translation and for the optimizer (NFR-1, accepted by the Story). The first master commit absorbs the consumer fallout: `full-description-prompts.json` is regenerated (block 0 of 10 of 12 cases) with a reviewed diff; `task-c-description-prompts.json` does not move and the amended guard needs no edit.

### Files

| File | Change |
|---|---|
| `src/prompt-core/master-system-prompt.ts` | modify: M1 import, M2 interpolation |
| `test/fixtures/golden/full-description-prompts.json` | regenerate (reviewed diff: block 0 of the 7 Task A cases and `c/expert3d-es`, `c/eu-en`, `c/us-uk`; the c/* block-0 delta equals the Task A master delta; their block 1 and `userContent` do not move; `translate/uk-user` and `translate/de-internal` do not move) |
| `.arch-guard-checksums` | rebaseline in the same commit |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/master-system-prompt.no-picture-references.spec.ts` (proposed name) | `test:logic` | AC-2, FR-5: constant present in the master, `[NO PICTURE REFERENCES` not inside the image-markers span (`START = indexOf('\n[IMAGE HANDLING]\n')`, `END = indexOf('\nFIGURE FORMAT')`) |
| `src/prompts/task-a.spec.ts` | `test:logic` | cached prefix byte-identical across every store |
| `src/prompts/full-description.golden.spec.ts` | `test:logic` | regenerated bytes |
| `src/prompts/task-c.spec.ts` (new describe, `NO_IMAGE_DEIXIS_RULE` reach; category 16) | `test:logic` | FR-23 payload level: over `registryPairs()` the description variant's `systemBlocks[0].text` equals the live `MASTER_SYSTEM_PROMPT` and contains the constant |
| `src/prompts/optimizer.spec.ts` (new describe, `NO_IMAGE_DEIXIS_RULE` reach; category 18) | `test:logic` | optimizer `systemBlocks[0]` carries the constant; `TASK_OPTIMIZE_INSTRUCTION` unchanged |
| `src/prompts/task-c.description-bytes.spec.ts` (T20), `master-system-prompt.spec.ts`, `.v4.spec.ts`, `.image-markers.spec.ts` (property 6, live oracle), `constants.spec.ts`, `protected-name-precedence.spec.ts` | `test:logic` | unchanged, stay green |
| D15 fixture spec (T37); `task-c.faq.spec.ts`, `content-orchestrator.faq-standalone.spec.ts` and `test/fixtures/faq-pipeline.ts` FAQ-negatives; `output-integrity-wiring.spec.ts`; `task-translate.simplified.spec.ts` (line 83); `task-c.spec.ts` lines 271 and 295; `image-figure-style.prompt-examples.spec.ts` (line 57) | `test:logic` | stay green (FAQ variant and `buildTranslatePrompt` carry no master fragment; the new prose carries no `§C1`..`§C6`, `CONSUMABLES`, `fit-content`, `TRANSLATE the generic descriptor`, `reorder it category-first`) |

### Acceptance check

Specs green; `git diff -- src/prompts/task-c.ts src/prompts/task-translate.ts src/prompts/optimizer.ts src/prompts/simplified-template-blocks.ts` empty; `git diff --exit-code -- test/fixtures/golden/task-c-description-prompts.json` exits 0; the D15 fixture spec is green and its fixture is unmodified; `task-c.ts` checksum `619c45a9...9247` unchanged in `.arch-guard-checksums`, `master-system-prompt.ts` checksum rebaselined, `bash arch-guard.sh` exits 0; golden diff matches the stated cases exactly.

### Notes

M1 (the import line) is carried here for `NO_IMAGE_DEIXIS_RULE` and by T32 for `LIVELINESS_RULES`: an import-only commit would fail lint and each name is added with the interpolation that uses it. The FAQ-negative positional slices of `faq-pipeline.ts` (`0..400`, `3000..3400`) read the live master, so every master hunk can shift what they cover; the test-writer re-verifies they still discriminate and may extend, never narrow, them (AGENTS.md section 7.7). The refusal consequence of this item is in the Refusal table.

---

## T28 - `master-system-prompt.ts` M3: `[VIDEO]` places the embed after a fact paragraph (FR-9)

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T27 (serial: same file and golden); H-OD12 (master-system-prompt.ts) |
| **FROZEN (AGENTS.md section 9)** | **`src/prompt-core/master-system-prompt.ts` - BLOCKED-UNTIL-APPROVED.** STOP and request approval first (same consumer disclosure as T27). Change: in `[VIDEO]`, `Introduce every embed with a lead-in <p>. Emit exactly one copy` becomes `Place every embed directly after a body paragraph of its sub-section; that paragraph states a product fact and never points at the video ("below", «нижче»). Emit exactly one copy`. Why: the master's video instruction still teaches an introducing lead-in. Needs the user's explicit "modify src/prompt-core/master-system-prompt.ts". **Refusal or no instruction:** Reading guide item 8 and the Refusal table (the specs for this item stay red; the human decides the scope; TEST_WRITING loop-back; the builder never deletes or weakens a test). |

### What changes

One sentence in `[VIDEO]`; the master header line 36 (`one lead-in <p> + one <iframe>`) is not edited (FR-9). Golden block 0 regenerated again; the amended Task C guard (T20) stays green.

### Files

| File | Change |
|---|---|
| `src/prompt-core/master-system-prompt.ts` | modify: `[VIDEO]` sentence |
| `test/fixtures/golden/full-description-prompts.json` | regenerate (block 0 delta: this sentence only) |
| `.arch-guard-checksums` | rebaseline in the same commit |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/master-system-prompt.video-placement.spec.ts` (proposed name) | `test:logic` | AC-2, FR-9 present / absent; `§3 FUNCTIONALITY, before §7` and `master-system-prompt.spec.ts` pins intact |
| golden and Task C guard specs | `test:logic` | regenerated / guarded bytes |
| `content-orchestrator.faq-standalone.spec.ts`, `task-c.faq.spec.ts`, D15 fixture spec (T37), amended Task C guard (T20) | `test:logic` | stay green (the FAQ positional slices read the live master; never narrowed) |

### Acceptance check

Specs green; golden diff is exactly the `[VIDEO]` sentence in block 0; arch-guard clean.

---

## T29 - `master-system-prompt.ts` M4: IMAGE GROUNDING LOCK restricts claims about the image, not product facts (FR-8)

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T28 (serial); H-OD12 (master-system-prompt.ts) |
| **FROZEN (AGENTS.md section 9)** | **`src/prompt-core/master-system-prompt.ts` - BLOCKED-UNTIL-APPROVED.** STOP and request approval first (same consumer disclosure as T27). Change: add the first bullet `The lock restricts claims ABOUT THE IMAGE (what it proves, compares, demonstrates). It does not restrict product facts: the paragraph above a figure MAY and SHOULD state any fact from [Technical Specs] / [Raw Description] that belongs to the figure's subject, written as ordinary prose that never mentions the picture.`; change `the lead-in may reference the image only descriptively ("the head assembly shown here…")` to `the paragraph may name the depicted object only as a plain product fact ("The unit has three round modules on its back.")`. Why: the lock currently suppresses the product facts the paragraph above a figure needs. Needs the user's explicit "modify src/prompt-core/master-system-prompt.ts". **Refusal or no instruction:** Reading guide item 8 and the Refusal table (the specs for this item stay red; the human decides the scope; TEST_WRITING loop-back; the builder never deletes or weakens a test). |

### What changes

IMAGE GROUNDING LOCK wording; `IMAGE GROUNDING LOCK stands` in `NUMERIC_SOURCE_FIDELITY_RULES` (pinned by `constants.spec.ts` line 111) stays untouched.

### Files

| File | Change |
|---|---|
| `src/prompt-core/master-system-prompt.ts` | modify: lock bullet and example |
| `test/fixtures/golden/full-description-prompts.json` | regenerate (block 0 delta: lock text only) |
| `.arch-guard-checksums` | rebaseline in the same commit |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/master-system-prompt.grounding-lock.spec.ts` (proposed name) | `test:logic` | AC-2, FR-8 present / absent literals |
| `constants.spec.ts`, golden and Task C guard specs | `test:logic` | stay green / regenerated |
| `content-orchestrator.faq-standalone.spec.ts`, `task-c.faq.spec.ts`, D15 fixture spec (T37), amended Task C guard (T20) | `test:logic` | stay green (the FAQ positional slices read the live master; never narrowed) |

### Acceptance check

Specs green; golden diff limited to the lock text; arch-guard clean.

---

## T30 - `master-system-prompt.ts` M5: PLACEMENT uses "preceding paragraph" (FR-6, FR-7)

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T29 (serial); H-OD12 (master-system-prompt.ts) |
| **FROZEN (AGENTS.md section 9)** | **`src/prompt-core/master-system-prompt.ts` - BLOCKED-UNTIL-APPROVED.** STOP and request approval first (same consumer disclosure as T27). Change: replace the `LEAD-IN:` bullet (which contains `SUBSTANTIVE NARRATIVE SENTENCE`, `The image below shows`, `visible here`) and the `Give lead-in and figcaption separate jobs` bullet with the three FR-7 bullets (`PRECEDING PARAGRAPH` ...); the SPACING sentence `every <figure> in the document therefore has a narrative <p> directly above it` is kept. Why: these are the master sources of the pointing phrasing (source analysis S1 to S4). Needs the user's explicit "modify src/prompt-core/master-system-prompt.ts". **Refusal or no instruction:** Reading guide item 8 and the Refusal table (the specs for this item stay red; the human decides the scope; TEST_WRITING loop-back; the builder never deletes or weakens a test). |

### What changes

PLACEMENT bullets after `FIGURE FORMAT` (outside the pinned image-markers span) change; `FIGURE FORMAT — wrap every image` and `short scannable description of what the image shows` stay (FR-21; pinned by `image-figure-style.prompt-examples.spec.ts`).

### Files

| File | Change |
|---|---|
| `src/prompt-core/master-system-prompt.ts` | modify: PLACEMENT bullets |
| `test/fixtures/golden/full-description-prompts.json` | regenerate (block 0 delta: PLACEMENT only) |
| `.arch-guard-checksums` | rebaseline in the same commit |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/master-system-prompt.placement.spec.ts` (proposed name) | `test:logic` | AC-2, FR-6 (removed phrases absent; SPACING sentence and a body `<p>` above every figure still required), FR-7 present |
| `image-figure-style.prompt-examples.spec.ts`, `master-system-prompt.image-markers.spec.ts`, golden and Task C guard specs | `test:logic` | stay green / regenerated |
| `content-orchestrator.faq-standalone.spec.ts`, `task-c.faq.spec.ts`, D15 fixture spec (T37), amended Task C guard (T20) | `test:logic` | stay green (the FAQ positional slices read the live master; never narrowed) |

### Acceptance check

Specs green; the image-markers span bytes unchanged; golden diff limited to PLACEMENT; arch-guard clean.

---

## T31 - `master-system-prompt.ts` M6: name `[Operator Notes]` in STRICT INPUT SCOPE (FR-29)

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T30 (serial), T21 (gate: T-A4 approved and committed); H-OD12 (master-system-prompt.ts) |
| **FROZEN (AGENTS.md section 9)** | **`src/prompt-core/master-system-prompt.ts` - BLOCKED-UNTIL-APPROVED.** STOP and request approval first (same consumer disclosure as T27). Change (Appendix B): STRICT INPUT SCOPE names `[Operator Notes]` next to the three existing names; INTERNAL RECONCILIATION `scan the three input blocks` becomes `scan the input blocks you were given — [Raw Description], [Technical Specs], [Supplemental Content] and, when present, [Operator Notes] — ...` with no number word before `input blocks`. Why: otherwise the model refuses to use an operator-supplied fact. Additional disclosure (impact risk 22, R22): block 0 of Task C description translation and of the optimizer will name `[Operator Notes]` although their `userContent` never carries it. Needs the user's explicit "modify src/prompt-core/master-system-prompt.ts". **Not applied unless T21 (T-A4) is committed**: the master must not name a block no task emits. **Refusal or no instruction:** Reading guide item 8 and the Refusal table (the specs for this item stay red; the human decides the scope; TEST_WRITING loop-back; the builder never deletes or weakens a test). |

### What changes

Two sentences in the master. The `[Operator Notes]` block only reaches the model through T21; this task makes the master consistent with it, and therefore waits for T21 (plan-review N14).

### Files

| File | Change |
|---|---|
| `src/prompt-core/master-system-prompt.ts` | modify: STRICT INPUT SCOPE and INTERNAL RECONCILIATION |
| `test/fixtures/golden/full-description-prompts.json` | regenerate (block 0 delta: those two sentences) |
| `.arch-guard-checksums` | rebaseline in the same commit |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/master-system-prompt.operator-notes.spec.ts` (proposed name) | `test:logic` | AC-9, FR-29: `[Operator Notes]` named; `three input blocks` / `three input` absent; no other count-of-blocks wording (also covers the FR-29 open note) |
| `src/prompts/task-c.spec.ts` / `src/prompts/optimizer.spec.ts` (new describe, category 9, R22) | `test:logic` | block 0 of a `buildPromptC` description prompt and of `buildOptimizerPrompt` names `[Operator Notes]` (the master bullet), while their `userContent` does not contain it |
| `src/prompts/task-a-doc.spec.ts` / simplified Doc instruction specs (OD-19 (1b) Assert-absent) | `test:logic` | `[Operator Notes]` absent from `TASK_A_DOC_INSTRUCTION` and `buildSimplifiedDocInstruction(...)` for every template (stay green; the master bullet is the only prompt text that names the block for the Doc stores) |
| `src/prompts/task-c.spec.ts` (line 20, `NUMERIC_SOURCE_FIDELITY_RULES` in block 0) | `test:logic` | stays green (that text is not edited) |
| golden spec (regenerated), amended Task C guard (T20), `content-orchestrator.faq-standalone.spec.ts`, `task-c.faq.spec.ts` | `test:logic` | regenerated / stay green |

### Acceptance check

Specs green; `NUMERIC_SOURCE_FIDELITY_RULES` text unchanged (decided, OD-20(2)); golden diff limited to those sentences; `git diff --exit-code -- test/fixtures/golden/task-c-description-prompts.json` exits 0; arch-guard clean.

### Notes

Refusal of this item (or of T-A4, which removes it) drops FR-29 only; T21 and the form are unaffected by an M6 refusal but the notes would be named nowhere as a fact source (human's scope decision, Refusal table).

---

## T32 - `master-system-prompt.ts` M7: interpolate `LIVELINESS_RULES` after `${SENTENCE_LENGTH_RULES}` (FR-20)

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T16, T31 (serial), T37 (transitively via T27); H-OD12 (master-system-prompt.ts) |
| **FROZEN (AGENTS.md section 9)** | **`src/prompt-core/master-system-prompt.ts` - BLOCKED-UNTIL-APPROVED.** STOP and request approval first (same consumer disclosure as T27). Change: add `LIVELINESS_RULES` to the `./constants` import and `${LIVELINESS_RULES}` as a static block directly after `${SENTENCE_LENGTH_RULES}`. Why: the shared, cached liveliness block must reach every store. This is the hunk that puts SCENE, RHYTHM and HOOK, and the self-scoping sentence, in front of Task C description translation and the optimizer (R1a, R7a); the sentence's "the source's sentences and their order are kept" collides with FR-5's `deleted, not reworded` (R1d) and does not name the optimizer's task. Needs the user's explicit "modify src/prompt-core/master-system-prompt.ts". **Refusal or no instruction:** Reading guide item 8 and the Refusal table (the specs for this item stay red; the human decides the scope; TEST_WRITING loop-back; the builder never deletes or weakens a test). |

### What changes

Every store's cached master carries the liveliness block; the cache is byte-identical across stores (the shared block is static). After this commit the master is in its final state. The amended Task C guard (T20) needs no edit; `task-c-description-prompts.json` stays unchanged.

### Files

| File | Change |
|---|---|
| `src/prompt-core/master-system-prompt.ts` | modify: import and one interpolation |
| `test/fixtures/golden/full-description-prompts.json` | regenerate (block 0 delta: the liveliness block) |
| `.arch-guard-checksums` | rebaseline in the same commit |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/master-system-prompt.liveliness.spec.ts` (proposed name) | `test:logic` | AC-8, FR-20 inside `buildPromptA` system blocks for each of the 7 `STORE_REGISTRY` stores; FR-21 tone limits kept; INVARIANT START unchanged; the FR-20 Assert-absent applies to `LIVELINESS_RULES` as the Specification words it (N10: `9–17`, `9-17`, `at most two consecutive`, `two consecutive sentences`, digit-range-plus-`word`, no sentence-length number other than `6`; not "no digit") |
| `src/prompts/task-a.spec.ts` | `test:logic` | cached prefix byte-identical across every store |
| `src/prompts/task-c.spec.ts` (new describe, `LIVELINESS_RULES` reach; categories 16 and 19) | `test:logic` | over `registryPairs()` the Task C description `systemBlocks[0].text` equals the live master and contains `LIVELINESS_RULES` and the three self-scoping strings (`govern writing a new description`, `when the task is to translate an existing text they do not apply`, `the source's sentences and their order are kept`) |
| `src/prompts/optimizer.spec.ts` (new describe, `LIVELINESS_RULES` reach; categories 18 and 19) | `test:logic` | optimizer `systemBlocks[0]` carries `LIVELINESS_RULES` and the three strings; `TASK_OPTIMIZE_INSTRUCTION` unchanged |
| `src/prompt-core/master-system-prompt.liveliness.spec.ts` (category 19, Task A half) | `test:logic` | the three strings in `systemBlocks[0]` of `buildPromptA` for each of the 7 `STORE_REGISTRY` stores, each equal to `MASTER_SYSTEM_PROMPT` |
| `hook-pattern.spec.ts`, `v4-headings.spec.ts`, golden spec, amended Task C guard (T20) | `test:logic` | stay green / regenerated |
| D15 fixture spec (T37); `task-c.faq.spec.ts`, `content-orchestrator.faq-standalone.spec.ts` and `faq-pipeline.ts` FAQ-negatives (extended with both new constants, never narrowed); `buildTranslatePrompt` golden (block-0 digest `151c04990596`); `master-system-prompt.image-markers.spec.ts` (property 6); `output-integrity-wiring.spec.ts`; `task-translate.simplified.spec.ts` (line 83); `task-c.spec.ts` lines 271 and 295; `image-figure-style.prompt-examples.spec.ts` (line 57) | `test:logic` | stay green: the three strings are absent from the Task C FAQ variant and from `buildTranslatePrompt`; the liveliness prose carries none of the forbidden watch-item strings |

### Acceptance check

Specs green; golden diff limited to the liveliness block; `git diff -- src/prompts/simplified-template-blocks.ts src/prompts/optimizer.ts` empty; `git diff --exit-code -- test/fixtures/golden/task-c-description-prompts.json` exits 0; arch-guard clean; after this task the working tree's `master-system-prompt.ts`, `task-a.ts` and `output-validator.ts` checksums are rebaselined and the final `.arch-guard-checksums` is committed with the last frozen edit.

---

## T33 - Consumer checkpoint: the master reaches Task C description and the optimizer, nothing else (D0, categories 16 to 20) - verification only

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T27 to T32, T37 |
| **FROZEN (AGENTS.md section 9)** | no; verification only. If T27 to T32 are refused or partly done, this checkpoint is reduced to the tasks that landed |

### What changes

No file edit and no commit. It proves, on the finished tree, the payload-level facts the file-level checks cannot see (R1c). FR-23 is stated by Specification v5 at **both** levels, so it is verified at both: file level by empty `git diff` and unchanged checksums, payload level by the amended Task C guard (T20), the reach pins owned by T27 and T32, and the pre-change oracle (T37). This task owns no test: every test it runs is owned by another task (or is a green-on-arrival characterization) and already green.

### Files

No file is edited. Specs run (already written and green): `src/prompts/task-c.spec.ts`, `src/prompts/task-c.faq.spec.ts`, `src/services/content-orchestrator.faq-standalone.spec.ts` (N11), `src/prompts/optimizer.spec.ts`, `src/prompt-core/protected-name-precedence.spec.ts`, `test/fixtures/faq-pipeline.ts` (positional slices `0..400` and `3000..3400`, re-verified over the shifted window and extended with the two new constants as FAQ-negatives, never narrowed), `src/utils/structural-parity.ts` spec including the characterization pin, `src/utils/image-figure-style.prompt-examples.spec.ts`, the D15 fixture spec (T37), `src/prompts/task-c.description-bytes.spec.ts` (T20), `master-system-prompt.image-markers.spec.ts` (property 6), `output-integrity-wiring.spec.ts`, `task-translate.simplified.spec.ts`.

### Tests to turn green

No test to turn green: this task is verification only. Owners of the tests it re-runs:

| Test / category | Owner task | Runner |
|---|---|---|
| Category 16 and 18 reach, `NO_IMAGE_DEIXIS_RULE` (Task C description block 0, optimizer block 0) | T27 | `test:logic` |
| Category 16, 18 and 19 reach, `LIVELINESS_RULES` and the three self-scoping strings `govern writing a new description`, `when the task is to translate an existing text they do not apply`, `the source's sentences and their order are kept` (Task A 7 stores, Task C description, optimizer) | T32 | `test:logic` |
| Category 19, constant half; FR-20 Assert-absent as the Specification words it (N10, not "no digit") | T16 | `test:logic` |
| Category 9, R22 (block 0 names `[Operator Notes]`, `userContent` does not) | T31 | `test:logic` |
| Amended Task C guard (96 cases, block count, block-0 `cache`, block 1 and `userContent` pinned; block 0 = live master) | T20 | `test:logic` |
| Category 17 (FAQ variant and `buildTranslatePrompt` carry no master fragment) and category 20 (D15 fixture), green on arrival and stay-green | T37 and the existing FAQ-negatives | `test:logic` |
| Characterization pin: `validateStructuralParity` reports no error when a sentence is added to, split in or removed from a `<p>` while the counted tags stay equal (Q-TRANS option 3, **unconditional**; documentation only, not an endorsement) | none: green on arrival, TEST_WRITING's | `test:logic` |

### Acceptance check

All listed specs green in one `npx vitest run` over those paths; with `<BASE>` read from the T1 / T37 fixture header (Reading guide item 10), `git diff <BASE> -- src/prompts/task-c.ts src/prompts/task-translate.ts src/prompts/optimizer.ts src/prompts/task-b.ts src/prompts/simplified-template-blocks.ts` is empty; `.arch-guard-checksums` `task-c.ts` and `task-b.ts` entries equal their values at `<BASE>` (`git show <BASE>:.arch-guard-checksums`); `git diff <BASE> --exit-code -- test/fixtures/golden/task-c-description-prompts.json` exits 0; the D15 fixture is byte-identical to its T37 commit. The pipeline status records that FR-23 / AC-8 hold at file level **and** payload level (Specification v5), and that the translation-side behavioural risk (R1a, R1d) and the optimizer inheritance (R7a) remain declared residual risks that no gate shows.

### Notes

The behavioural translation risk (R1a) and the optimizer inheritance (R7a) remain open by design; the only evidence for R1a is the optional T42 comparison. No optimizer check is added to T36 (Q-OPT option (1), decided).

---

## T34 - Create the description-metrics core and the hard-violation decision (FR-32, FR-33)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T3; H-OD10 |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

`src/utils/description-metrics.ts` holds pure functions for D-1 to D-10 and the hard-violation decision (any deixis hit, any figure without a paragraph above, any two figures in a row, any number absent from the input). D-6 and D-10 are owner-confirmed and D-1 / D-2 follow FR-17 (decided 2026-10-18; the "35" counting rule and the 48-word-hook item are accepted as built, reading B); **D-3, D-4, D-5, D-7 and the D-9 half are PROPOSED DEFAULTS (H-OD10), built as written and marked unconfirmed in the code header.** Input set per D-10: the generated HTML and the input description form the required sides; specs, product name and the four operator-note values are optional; every text given forms the input side; no exemption list. Parse function and deixis collector are parameters; the module imports only types (leaf, so the CLI can load it under native type stripping). Soft items (FR-35) are reported and never change the exit decision.

### Files

| File | Change |
|---|---|
| `src/utils/description-metrics.ts` | create |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/description-metrics.spec.ts` | `test:logic` | AC-10, FR-32 hand-computable fixtures for D-1 to D-10, the hard-violation decision, soft items never fail |

### Acceptance check

Spec green; the file is in the coverage include (`src/utils/**`) and `npm run test:coverage` does not drop below the 80/80/75/80 floors for it; `tsc` clean; `grep -n "^import" src/utils/description-metrics.ts` shows only `import type`.

---

## T35 - Create the thin `tools/measure-description.ts` CLI, its spawn test and the Node check (FR-32, FR-33; OD-9 condition)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T34 |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

The CLI parses `--html`, `--input`, optional `--specs`, `--name`, the four `--notes-*` values and `--locale`; reads files; prints the report; exits non-zero on hard violations or unreadable / empty input (FR-32 failure path). **The first line of every report is `process.version`** (impact Unknown 18), so live-run evidence carries the Node version. Mechanism (OD-9 accepted as built, with the owner's condition): Node native type stripping with explicit `.ts` imports of the two leaf modules and an injected `linkedom` `DOMParser` (no new dependency). The repository pins no Node version (no `engines`, `.nvmrc`; impact v4 hazard 6) and none is added by this Story. `tools/` stays outside vitest, `tsconfig` and coverage includes. The track is `angular` only because the logic lives in `src/utils` and the test runs in `test:logic`; `tools/` is outside all three track path lists (non-blocking finding, N8).

**The Node check (OD-9 condition), as steps of this task:**
1. run `node --version` on the machine that builds the CLI and require **>= 22.18**; record the output in the evidence (v24.15.0 at planning time);
2. run the CLI once on a fixture pair and record that the `.ts` entry loads, the extensionless-import workaround holds and `linkedom` parses (a run is the only proof, impact Unknown 4);
3. the spawn test starts the CLI with `process.execPath` (so it measures the Node that runs vitest) and asserts exit codes, report lines **and the leading `process.version` line**;
4. **only if step 1 or step 2 fails**, the D12 launcher is built: that is **T41** (decided by the owner, not an Hn); T35 then stops and does not claim completion.

### Files

| File | Change |
|---|---|
| `tools/measure-description.ts` | create |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `test/measure-description.cli.spec.ts` | `test:logic` | AC-10, FR-33: spawns the CLI; exit codes and report lines including the leading `process.version` line; unreadable / empty input -> non-zero; soft items never change status |

### Acceptance check

`npx vitest run test/measure-description.cli.spec.ts` green on the repo's Node; the recorded `node --version` is >= 22.18 and one real CLI run on a fixture pair is recorded; the CLI runs with no extra dependency (`git diff package.json` empty); a stray extensionless or non-erasable import fails the spawn test (R12).

---

## T36 - Live acceptance runs and fact review (FR-34, FR-35) - manual, outside the gate

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T35 (and through it T1 to T34, as far as approvals allow); H-OD11, H-OD13 |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

Three products (Creality Pika EXPERT3D, one Center 3D Print product, one 3DDevice product) x **2 runs** each with the Full description template, measured by the script (T35) against the human-defined inputs. **Every one of the six runs must pass the hard criteria** (0 deixis hits, no figure without a paragraph above, no two figures in a row, 0 numbers absent from the input); the six runs **include at least one run whose output contains non-marker (model-authored) figures** (R4); the evidence is the **script output** with its `process.version` line; the soft criterion (liveliness, at least 2 of 3) is reported and never blocks; a manual fact review is signed off by the human. **A failing run is reported with that output and is not automatically iterated** (a further prompt iteration is a separate human decision and may need a further frozen edit under a new approval, R3). Decided (OD-11 part, 2026-10-18): the counts, the hard criteria, the non-marker run, the evidence form, the failure action. **Open (H-OD11):** which Center 3D Print and which 3DDevice product, who runs the six runs, how they split between marker and non-marker. Open (H-OD13): the `Knowledge/` baseline (git-ignored). No code, no test. No optimizer check is added (Q-OPT option 1).

### Files

No file is edited. Evidence is recorded in the `pipeline_status` / quality artifacts by their owners.

### Tests to turn green

No test - this task changes no behaviour; it is the opt-in live acceptance (D13 category 14) and is not part of `npm test`.

### Acceptance check

Script reports for the six runs exist and exit 0 (hard items), each starts with its `process.version` line, the soft-item tally is recorded, at least one run contained non-marker figures, and the manual fact review is signed off by the human. Not startable until H-OD11 is answered.

---

## T37 - Verify and commit the D15 pre-change digest fixture (optimizer and Task C FAQ variant)

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | none |
| **FROZEN (AGENTS.md section 9)** | no (it only reads files). It is a **task-order precondition for every task that edits `constants.ts` or `master-system-prompt.ts`: T15, T16, T18, T19, T27 to T32** (the same role T1 plays for `task-a.ts`) |

### What changes

The D15 pre-change oracle is confirmed to have been captured from BASE, the commit the Story branch was cut from (currently `6546db8`; BASE hash in the fixture header; Reading guide item 10), and is committed. It holds, per block (sha256, length, `cache` flag, the shape of `task-c-description-prompts.json`): (i) `buildOptimizerPrompt` block 1 and `userContent` for a small input set (with and without `productName`, an input HTML with figures, one with a pointer sentence); (ii) every block of the Task C FAQ variant (`buildPromptC(..., { contentKind: 'faq' })`) for the same 16 store/language pairs the Task C description golden uses. Optimizer **block 0 is not digested**: it is asserted `toBe(MASTER_SYSTEM_PROMPT)`, so nothing in the fixture is expected to move. The exact inputs and file names are the test-writer's. No production file changes. The capture is `TEST_WRITING`'s; the builder never captures, never regenerates and never passes `-u`.

### Files

| File | Change |
|---|---|
| `test/fixtures/golden/optimizer-faq-pre-change.json` (proposed name) | verify / commit (header names BASE) |
| `test/fixtures/optimizer-faq-pre-change-inputs.ts` (proposed name, if the inputs are separate) | verify / commit |
| `src/prompts/payload-oracle.d15.spec.ts` (proposed name) | verify / commit |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/payload-oracle.d15.spec.ts` (proposed name; category 20) | `test:logic` | FR-23 items 4 and 5 (optimizer block 1 and `userContent`; every block of the Task C FAQ variant), NFR-9. **Green on arrival**, so there is nothing red to turn green; it must stay green after every later task |

### Acceptance check

`npx vitest run src/prompts/payload-oracle.d15.spec.ts` is green; the fixture header names a BASE hash and `git merge-base --is-ancestor <BASE> HEAD` exits 0; `git diff <BASE> -- src/prompt-core/constants.ts src/prompt-core/master-system-prompt.ts src/prompts/optimizer.ts src/prompts/task-c.ts` is empty at this point; the fixture was not produced with `-u`. If the fixture is absent, its header lacks the commit, or that `git diff` is non-empty at capture time, the builder stops and loops back to `TEST_WRITING`; it never captures from an edited tree.

### Notes

Independent of T1 (different files): both are verify-and-commit tasks and either order is fine, but both must precede the production edits they guard. The fixture is never updated to follow a change (AGENTS.md section 7.7): a red result in any later task means a block FR-23 says is unchanged has changed, and the fix is in the code. It does not change the amended Task C guard (T20), and it does not close R1a or R7a; it only makes "unchanged" a tested claim instead of a `git diff` reading (an edit to an interpolated constant such as `NO_LEAKED_REASONING_CLAUSE` or a `FAQ_*` constant would otherwise pass every existing test).

---

## T38 - Restore the notes from a history entry in `restoreHistory` (FR-31 items 2, 4, 5 at the call site)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T13 (serial, same file), T40, T21 (gate); H-FR41TEST |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

`restoreHistory` adds `this.operatorNotesState.restore(item.input.operatorNotes);`. The behaviour is decided (owner 2026-10-18, OD-2 R1 and R2) and **nothing waits for an answer any more**: an entry with notes fills the four textareas; an entry without notes (every entry stored before this Story) **empties** them; after a restore the next Generate / UA Description click **resends** the restored notes because `buildGeneratorInput` (T13) reads the state. What the state does is T40's; this task adds the call and the text pin.

### Files

| File | Change |
|---|---|
| `src/app/app.component.ts` | modify: the `restoreHistory` notes statement only |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/app/app.component.operator-notes.spec.ts` (T38 describe: restore call-site pin, source-text) | `test:logic` | FR-31 item 2, category 11: `restoreHistory`'s body contains `operatorNotesState.restore(item.input.operatorNotes)`. The behaviour (restore with notes, restore without notes, resend) is asserted by T40's state-class tests |

### Acceptance check

Spec green; `git diff` shows one changed statement in `restoreHistory`; the `seo_gen_form_state` constructor / effect pin of T13 is still green.

---

## T39 - Reset the notes state in both `clearAll` cases (FR-41)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T38 (serial, same file), T40, T21 (gate); H-FR41TEST |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

**Unconditional** since the owner's Q-CLEARALL answer (2026-10-18; Specification v5 FR-41). `clearAll()` has **two textually identical, independent bodies**, `case 'generator'` and `case 'ua-generator'` (impact v4 risk 20); an edit to one leaves the other unchanged. This task adds `this.operatorNotesState.clear();` next to the `supplementalContent.set('')` / `customInstructions.set('')` lines of **each** case, so the next built input has no `operatorNotes` key (FR-41 item 2). The shared Clear All button needs no template change; no other mode and nothing else in `clearAll` changes; no write to `seo_gen_form_state`; history untouched (FR-41 item 3). Do not merge the two cases into one fall-through (plan rejected alternative 23).

### Files

| File | Change |
|---|---|
| `src/app/app.component.ts` | modify: `clearAll`, the `generator` and `ua-generator` cases only |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/app/app.component.operator-notes.spec.ts` (T39 describe: two per-case pins) | `test:logic` | FR-41, category 11: inside the `clearAll()` body the `case 'generator':` slice (label to the first following `break;`) and the `case 'ua-generator':` slice are **disjoint**; each is asserted to contain `operatorNotesState.clear()` exactly once and to contain neither the other case's label nor more than one `break;`, so one edited case cannot satisfy both pins. A pin that slices the whole `clearAll()` block (the pattern of the existing faq-generator pin, line 173, which stays green) is not used for FR-41 |
| same file, helper test | `test:logic` | the slicing helper itself is tested on a **synthetic source in which only one of the two cases carries the call**; the pin for the other case must fail on it (green on arrival: it tests test code) |

### Acceptance check

Both per-case pins show the reset in its own case and nowhere else in `clearAll`; every earlier operator-notes describe is still green; the existing faq-generator `clearAll` pin (line 173) is still green; `git diff` over `clearAll` shows the two insertions only.

### Notes

Residual gap, stated (H-FR41TEST, plan R23): no test executes `AppComponent.clearAll()` itself. The call-site pins prove the call is in the text of each case; T40 proves what the call does. FR-41's Tests paragraph says "invoke Clear All"; whether this split satisfies that wording is the human's (default: accept). A first `AppComponent` test is alternative (a) and would be a TEST_WRITING loop back, not a builder decision.

---

## T40 - Create `OperatorNotesFormState` (restore, clear, inputPart) (FR-41, FR-31 items 4 and 5, FR-25 form side)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T9 (leaf module; T8 transitively), T21 (gate: T-A4 approved and committed); H-FR41TEST |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

A small plain class `src/app/operator-notes-form-state.ts` (plan proposal D9, so that the form side of FR-25, FR-31 items 4 and 5 and FR-41 is executed by tests rather than only read as text). No decorator, no `inject()`; it imports `signal` from `@angular/core` and the leaf module (T9). API: `readonly values = signal<OperatorNotesFormValues>(<four empty strings>)`; `set(values)`; `restore(notes?: OperatorNotes)` = `set(toFormValues(notes))` (an entry with notes fills the four values; an entry without notes empties them: FR-31 item 5); `clear()` = `set(<four empty strings>)` (FR-41 item 1); `inputPart()` = `{}` when `toOperatorNotes(values())` is `undefined`, else `{ operatorNotes }` (FR-25 form side, FR-27 form side, FR-41 item 2). It is a gated part of the slice: the plan's refusal table drops it with the rest if T-A4 is refused.

### Files

| File | Change |
|---|---|
| `src/app/operator-notes-form-state.ts` | create |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/app/operator-notes-form-state.spec.ts` (proposed name; category 21) | `test:logic` | FR-41: fill four values, `clear()`, four empty values and `inputPart()` equal to `{}` with no `operatorNotes` key; the restore-then-clear chain (FR-41's second test case); FR-31 item 4: `restore(<entry with notes>)` then `inputPart()` returns the restored values; FR-31 item 5: fill, then `restore(undefined)` and `restore({})`, four empty values and `inputPart()` has no key; FR-25 form side: empty, whitespace-only and `{}`-equivalent values give no key |

### Acceptance check

Spec green; `grep -n "^import" src/app/operator-notes-form-state.ts` shows only `signal` from `@angular/core` and the leaf module (no `inject`, no decorator); **the first run confirms that `signal()` works without an injection context under the logic runner** (the plan has not run this and does not claim it). If it does not, the builder STOPS and returns `changes_required_architecture` to the planner; it does not invent a replacement design.

### Notes

The class is under `src/app`, outside the coverage include; its behaviour is nevertheless asserted by the spec. H-FR41TEST alternative (b) (bare signal) would drop this task; alternative (a) adds an `AppComponent` test beside it. Either is a loop back, not a builder edit.

---

## T41 - (conditional) Build the D12 launcher only if the Node check of T35 fails

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T35 (its step 1 or step 2 failed) |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

**Conditional task; dropped, with no pin written, when T35's Node check passes.** If `node --version` is below 22.18, or the `.ts` entry does not load under native type stripping, a thin `.mjs` wrapper loads the same `tools/measure-description.ts` through `vite`'s `ssrLoadModule` (vite is a devDependency; loading `src/utils/video-manifest.ts` this way was verified at about 1.5 s) and the spawn test is pointed at the launcher. AC-10's `.ts` file stays the one that holds the CLI. No new dependency (`tsx` rejected); no `engines` / `.nvmrc`. The condition itself is decided (OD-9, owner 2026-10-18): this is not an Hn.

### Files

| File | Change |
|---|---|
| `tools/measure-description.launcher.mjs` (proposed name) | create, only on the condition |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `test/measure-description.cli.spec.ts` (variant pointing at the launcher) | `test:logic` | AC-10, FR-33 through the launcher. **The builder does not edit the spawn test**: the variant is test code and returns to `TEST_WRITING` through a loop back |

If the condition does not hold: no test - this task is dropped and changes no behaviour.

### Acceptance check

On the condition: the spawn test through the launcher is green and the report still starts with `process.version`; `git diff package.json` is empty. Otherwise: no file created.

---

## T42 - (optional) Live translation comparison for Creality Pika - manual, outside the gate (D13 category 22)

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T32 (final master); H-OD11 (who runs it) |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

Optional, never a requirement (Q-TRANS option (1), owner 2026-10-18). Translate the Creality Pika uk master (from the git-ignored `Knowledge/`) and compare sentence count and the pointer sentences with the source. It is the only evidence for R1a and R1d (whether SCENE, RHYTHM, HOOK or the FR-5 "deleted, not reworded" push the translator to add, split, merge or delete sentences, or to drop a pointer sentence that a legacy master legitimately contains). No code, no test, no file edit. Who runs it is not decided (H-OD11).

### Files

No file is edited.

### Tests to turn green

No test - manual, opt-in, outside `npm test` and the gate.

### Acceptance check

If run: a short evidence note (source vs translation sentence counts, pointer sentences kept or deleted) is recorded by the person who ran it. If not run: nothing is blocked; R1a / R1d stay declared residual risks.

---

## Coverage table

### Specification and plan items to tasks

| Item | Task ids |
|---|---|
| FR-1 to FR-4 (Vision pre-pass) | T14 |
| FR-5 | T15 (constant), T27 (master interpolation and reach pins) |
| FR-6, FR-7 | T30 |
| FR-8 | T29 |
| FR-9 | T28 |
| FR-10 | T17 |
| FR-11 | T24 (item 1), T22 (item 2), T23 (item 3) |
| FR-12 | T18 |
| FR-13 | T6 (video half), T25 (O1) |
| FR-14 | T7 |
| FR-15 | T5 |
| FR-16 | T2 |
| FR-17 | T3 |
| FR-18 | T3 (builder), T26 (O2) |
| FR-19 | T4 |
| FR-20 | T16 (constant, including the self-scoping sentence and its three category-19 strings, and the N10 Assert-absent), T32 (master interpolation; category 19 payload presence in Task A, Task C description, optimizer; absence from FAQ and translate), T33 (re-run) |
| FR-21 | T16, T19, T32 (preserved tone limits, existing pins stay green) |
| FR-22 | T19 |
| FR-23 (file level and payload level, Specification v5) | T20 (amended Task C guard), T27 and T32 (block 0 reach pins), T33 (verification, empty `git diff`, unchanged checksums), T37 (optimizer and FAQ-variant pre-change oracle) |
| FR-24 | T11, T12 (both gated on T21) |
| FR-25 | T8, T9, T13, T40 (form side) |
| FR-26 | T9, T21 (Expert-3DPrinter category 8 test in T21) |
| FR-27 | T1, T13 (no key when empty), T21 (Tier A), T22/T23 (Tier B), T40 (`inputPart`) |
| FR-28 | T8 (isolation test), T13 (notes never joined into `supplementalContent`) |
| FR-29 | T31 (depends on T21) |
| FR-30 | T10 (gated on T21) |
| FR-31 | item 1: T8 (round trip); item 2: T40 (behaviour) + T38 (call site); item 3: T13 (no `seo_gen_form_state` write); items 4 and 5: T40 (behaviour), T13 / T38 (call sites) |
| FR-32, FR-33 | T34, T35 (T41 only on the Node-check condition) |
| FR-34, FR-35 | T36 (hard / soft acceptance), T34 (metrics) |
| FR-36, FR-37 (preserve-only) | guarded by T17, T24, T25, T30, T22 and the existing harness; re-run at T33 and QUALITY_GATE |
| FR-38, FR-39 (preserve-only) | T10, T21 (notes cannot reach spec / SEO limits), existing specs re-run |
| FR-40 | T10 (non-Task-A side), T21 (Task A + Doc prefix), T13, T17 / T21 / T31 (OD-19 (1b) Assert-absent: Doc instructions silent), T31 (R22 category 9) |
| FR-41 | T40 (`clear`, restore-then-clear, behaviour), T39 (both `clearAll` cases, disjoint per-case pins, slicing-helper test); plan-origin requirement added by Specification v5 |
| NFR-1 | T15, T16, T27, T32 (static constants; notes in `userContent` T21) |
| NFR-5 | T9, T15, T16 (text in `prompts/` and `constants.ts`) |
| NFR-6, NFR-7, NFR-8 | T2, T3, T34 |
| NFR-9 | T17 to T20, T22, T24, T27 to T32, T33, T37 (including `content-orchestrator.faq-standalone.spec.ts` in T27 to T33) |
| NFR-10 | T21 to T32 (section 9 stop in each; Reading guide items 8, 9) |
| NFR-11 | T9, T11 to T13, T38, T40 (free text into a prompt, never rendered as HTML) |
| NFR-12 | T14, T26 (warnings only, no repair-loop entry), T4 |
| NFR-2, NFR-3, NFR-4 | no task (no provider, retrieval or secret change; D10: no `server/**` task) |
| D0 (items 1-8) | T20, T27 to T33, T37; item 8 / R22: T31 |
| D1 | T8 |
| D2 (chain) | T2 -> T3 -> T4 / T26 (detector before consumers); prompt tasks before the validator tasks that cite them |
| D3 (frozen hunks) | T21 to T32 |
| D4 (caching) | T15, T16, T27, T32 |
| D5 | T2, T3 |
| D6 | T4, T26 |
| D7 (table) | T14, T17, T15, T16, T18, T19, T6, T5, T7, T10 |
| D8 (incl. Gate) | T9, T10, T21 (the gate itself), T31 |
| D9 (incl. Gate) | T11, T12, T13, T38, T39, T40 |
| D10 | no task (nothing on the server) |
| D11 | T17 to T19, T22, T24, T27 to T32 (golden), T20 (amended Task C guard), T33 (other consumers, `faq-standalone`), T37 (optimizer / FAQ oracle) |
| D12 | T34, T35, T41 (conditional launcher) |
| D13 | tests distributed per task; category 14 = T36, 15 = QUALITY_GATE, 16 and 18 = T27 (`NO_IMAGE_DEIXIS_RULE`) and T32 (`LIVELINESS_RULES`), checked in T33; 17 = stay-green pins checked in T33; 18 characterization pin = green on arrival, re-run in T33; 19 = T16, T32, T33; 20 = T37, stay-green in T15, T16, T18, T19, T27 to T33; 11 = T12, T13, T38, T39; 21 = T40; 22 = T42; 9 (R22) = T31 |
| D14 | T1 |
| D15 | T37 |
| Appendices A, B, C, D, E | T19, T31, T16, T15, T5 |

### Tasks to plan items

| Task | Maps to |
|---|---|
| T1 | D14, FR-27 |
| T2, T3 | D5, FR-16, FR-17 |
| T4 | D6, FR-19 |
| T5, T6 | D7, FR-15, FR-13 |
| T7 | D7, FR-14 |
| T8 | D1, FR-25 |
| T9 | D8, FR-25, FR-26 |
| T10 | D8, FR-30 |
| T11, T12 | D9, FR-24 |
| T13 | D9, FR-25, FR-27, FR-28, FR-31 (item 3) |
| T14 | D7, FR-1 to FR-4 |
| T15, T16 | D4, D7, FR-5, FR-20, D13 category 19 (T16) |
| T17, T18, T19 | D7, D11, FR-10, FR-12, FR-22 |
| T20 | D0.2, D11, Q1 option (b) |
| T21 to T24 | D3, FROZEN item 1 (T-A4, T-A2, T-A3, T-A1) |
| T25, T26 | D3, FROZEN item 3 (O1, O2) |
| T27 to T32 | D0, D3, FROZEN item 2 (M1+M2, M3, M4, M5, M6, M7), D13 categories 16, 18, 19 |
| T33 | D0, D13 categories 16 to 20 (verification only) |
| T34, T35 | D12 |
| T36 | D13 category 14 |
| T37 | D15, D13 category 20, FR-23 items 4 and 5, NFR-9 |
| T38 | D9 (`restoreHistory`), FR-31 item 2 (call site) |
| T39 | D9 (`clearAll`), FR-41 |
| T40 | D9 (`OperatorNotesFormState`), FR-41, FR-31 items 4 and 5, FR-25 form side, D13 category 21 |
| T41 | D12 (launcher, conditional) |
| T42 | D13 category 22 |

No plan item is without a task except D10 (explicitly nothing to do), the NFR-2/3/4 "no change" statements and the rejected / not-chosen alternatives listed in the register section; no task is without a plan item.

## Blocked-until-approved register

| Frozen file | Tasks | Plan item | Needs |
|---|---|---|---|
| `src/prompts/task-a.ts` | T21 (T-A4), T22 (T-A2), T23 (T-A3), T24 (T-A1) | FROZEN item 1 | "modify src/prompts/task-a.ts"; T1 (FR-27 oracle) committed first; T-A4 asked first because it gates Group B, T31 and T40; four separate commits |
| `src/utils/output-validator.ts` | T25 (O1), T26 (O2) | FROZEN item 3 | "modify src/utils/output-validator.ts" |
| `src/prompt-core/master-system-prompt.ts` | T27 (M1+M2), T28 (M3), T29 (M4), T30 (M5), T31 (M6), T32 (M7) | FROZEN item 2 | "modify src/prompt-core/master-system-prompt.ts" with the Task C / optimizer consumers named; T20 and T37 committed first; T31 also needs T21 |

### Gated through T21 (not FROZEN themselves)

| Tasks | Gate | If T-A4 is refused |
|---|---|---|
| T10, T11, T12, T13, T38, T39, T40 (and the frozen T31) | T21 committed (the `task-a.ts` "modify" instruction for item T-A4 given in the builder's session) | Not built. T8 and T9 are dropped unless the human decides otherwise. The FR-24 to FR-31, FR-40, FR-41 and FR-29 specs stay red until the human's scope decision and a loop back to TEST_WRITING (the builder never deletes tests) |

### Refusal table (plan "What a refusal drops"; the general rule is Reading guide item 8)

| Refusal | Dropped | Notes |
|---|---|---|
| `task-a.ts` entirely (T21-T24) | FR-11, FR-26, and with it FR-24..FR-31 (and FR-40's meaning, **FR-41**, and **M6 = T31**) | No non-frozen route to FR-26. Not built: T10-T13, T38, T39, **T40**, T31; T8 and T9 dropped unless the human decides otherwise. The rest of the master hunks are independent. Scope drop is the human's. FR-27 then guards only what exists |
| T-A1..T-A3 only (T22-T24) | FR-11; Tier B degenerates to Tier A equality | FR-26 and FR-41 unaffected. The Tier B specs stay red until the human decides |
| T-A4 only (T21) | FR-26 and FR-24..FR-31, FR-40's meaning, **FR-41** and **M6 (T31)** | FR-11 unaffected. Same inert-input rule: nothing user-visible of D8/D9 ships |
| `master-system-prompt.ts` (T27-T32) | FR-5..FR-9, FR-20, FR-29 (T31 with them) | Most of AC-2 and AC-8. A refusal also removes every Task C / optimizer consequence in D0 (no block-0 move; the amended guard stays green; R1a, R7a and R22 fall away). The master specs and category 16 / 19 tests stay red |
| `output-validator.ts` (T25, T26) | FR-13 first half, FR-18 | Fallback (the human's call): emit the paragraph warning from the orchestrator through `imageDeixisIssues`; it does not match AC-7's wording that `validateGeneratedHtml` emits it. The FR-13 / FR-18 specs stay red |

`src/prompts/task-b.ts` and `src/prompts/task-c.ts` are never edited by any task (T20 and T33 prove it), nor are `src/prompts/task-translate.ts`, `src/prompts/optimizer.ts` and `src/prompts/simplified-template-blocks.ts`.
