---
artifact: clarification_report
story: US-9.1
version: 6
status: DRAFT
owner: so-clarifier
created_at: 2026-10-17T15:12:00Z
updated_at: 2026-10-19T14:55:00Z
supersedes: docs/evidence/US-9.1-clarification-report.md#5
inputs_consumed:
  - key: story
    version: 6
  - key: specification
    version: 7
  - key: open_decisions
    version: 5
  - key: clarification_report
    version: 5
open_decisions_blocking: false
---

# US-9.1 - Clarification Report (v6)

## v6 revision (2026-10-19T14:55:00Z): the AC-11/AC-12 hard script criteria are waived

Re-run of clarification against **Story v6** (DRAFT). The owner decided on 2026-10-19 to waive the AC-11/AC-12 hard script criteria
on the basis of the owner's manual testing (Story v6 "Amendment"; `docs/workflow/history.jsonl` `ts` 2026-10-19T14:50:23Z, actor
sbruhov@gmail.com, verbatim "Waive the AC-11/AC-12 hard script criteria for US-9.1; accepted on my manual testing"; context event
14:42:16Z: "Це дуже важко. Я зробив простіше. Було проведено тестування генерації товарів. Все працює так як треба."). The criterion
text of AC-11 and AC-12 is unchanged and marked WAIVED; the "Touches FROZEN files?" sentence was corrected; AC-1 to AC-10 and every
other Story section are untouched; AC-10 (`tools/measure-description.ts`) stays in scope. **Nothing was measured**: no script output,
no product list, no run count. This stage records the effect and answered nothing. The Open Decisions log is
`docs/decisions/US-9.1-open-decisions.md` (v6).

**What is clear now (checked against the sources).**

- **Actor, trigger, value, track** unchanged (bug Story, track `prompt`, Creality Pika regression). The headline outcome (0 picture
  references, 0 invented numbers) is now **unmeasured and accepted on the owner's word**; the Story says so in its own words.
- **Store and locale scope** unchanged and explicit: all seven `STORE_REGISTRY` keys (re-read this run: 3DDevice, 3DPrinter,
  3DScanner, Center 3D Print, Drukarka 3D, EXPERT3D, Expert-3DPrinter); uk-UA is the master and a change there fans out; the ban
  applies to every output language. The waiver adds no store, locale or currency, and no code or prompt text. The only change is that
  the live check of the uk-UA master (AC-11/AC-12, three acceptance products) no longer exists as an acceptance criterion, so the
  other six base languages rest on the `image-deixis` warning and the owner's testing (OD-15, unchanged).
- **Acceptance criteria.** AC-1 to AC-8 and AC-10 remain substring, behaviour or script-measured and falsifiable; AC-9 is the
  withdrawal stub. AC-11 and AC-12 are **falsifiable in principle and deliberately not falsified**: the criterion text is kept, the
  status is WAIVED. That is explicit in the Story and is not an ambiguity; what a waived, unmeasured criterion means for the
  Specification, the matrix and RECONCILIATION is (OD-26, OD-27).
- **Generated-HTML impact** (AGENTS.md section 4) unchanged: `<p>` directly above every `<figure>`, lead-in not duplicating the
  `<figcaption>`, `alt` not duplicating the `<figcaption>`, first-image / lazy rules, video `<figure>` / `<figcaption>`. These are
  still pinned by the unit-level tests; the live structural check of them (AC-11 "no figure without a paragraph above, no two figures
  in a row") is the part that is waived.
- **FROZEN files (section 9).** Unchanged: `task-a.ts`, `master-system-prompt.ts`, `output-validator.ts`. The Story's FROZEN row now
  agrees with the recorded approvals (2026-10-18T15:24:23Z, three files; 2026-10-19, withdrawal hunks), which closes the v5 "Story
  discrepancy". The waiver edits no file. `bash arch-guard.sh` was run read-only this run: all checks passed.
- **Generation invariants.** Spec-count parity (`input.specs` untouched), figure / figcaption structure, video survival: unchanged
  and covered by unit tests; the live confirmation is waived.
- **Dependencies.** US-5.1 and US-8.1 are archived. `test/render-reconciliation.report.md` section 3 and section 5 concern the Doc
  renderer's post-processing and corpus; the waiver changes no transform and adds no blocker there.

**Open Decisions, by effect of the waiver.**

- **Moot by waiver (history kept, no answer invented, source = the owner decision):** **OD-11** as a whole (inputs, repeats, evidence,
  who runs, failure trigger), and the **live-run parts** of **OD-10** (the use of D-9 / D-10 as the AC-12 hard acceptance on live
  runs) and **OD-14** (the "35" baseline comparison on live runs). All earlier resolutions of these ODs stay recorded.
- **Not moot, and why:** the definitions D-3 to D-5, D-7, D-9 of OD-10 are what the AC-10 script computes and the script stays in
  scope, so they stay open as recorded; OD-9 (Node >= 22.18) likewise. Observation only, entries unedited: OD-6 (its "acceptance runs
  use Full description" clause has no live consumer now), OD-13 (rest) and OD-15 (strengthened: no live check of any output language).
  OD-12 and OD-25 are unaffected.
- **New, non-blocking, each with a PROPOSED DEFAULT that is a proposal only:** OD-26 (what FR-34 / FR-35 say for a waived criterion),
  OD-27 (the matrix rows AC-11 / AC-12 and how RECONCILIATION treats WAIVED; the current rows read green / built with no test),
  OD-28 (whether AC-12's soft and manual items are also waived: the waiver note names only the hard criterion, then says the soft and
  manual items are "likewise not evidenced"), OD-29 (what the waiver covers: which build, which products, whether a non-marker figure
  run happened, and whether it lapses on a later prompt change), OD-30 (whether `tools/measure-description.ts` and its tests stay
  unchanged; AC-10's text names the now-waived thresholds), OD-31 (whether the AC-8 translator / optimizer residual needs any live
  check), OD-32 (T51 and plan risk R5, and how the unmeasured outcome is stated in the reconciliation report and the Pull Request,
  AGENTS.md section 13).
- **Carried forward unchanged and still open:** OD-10 (D-3 to D-5, D-7, D-9), OD-13 (rest), OD-15, plus the v5 OD-21 to OD-25 as
  recorded. The observation in the v5 note about 2026-10-18 owner events bearing on OD-10, OD-11 and OD-13 stands for OD-10 and OD-13;
  for OD-11 it is now moot.
- **Stale downstream artifacts.** Spec v7 (APPROVED) FR-34 / FR-35 and its OD-11 row, `ac_test_matrix` v4 (AC-11 / AC-12 rows) and
  `reconciliation_report` v3 (BLOCKED on these rows) are stale against Story v6; the Story states that the v7 approval does not cover
  the change and that they must be revised and re-reviewed. The plan / task breakdown (T51, risk R5) are affected only as OD-32 says;
  the impact analysis, the other test artifacts and the implementation, gate, verification and security reports are not affected in
  substance (no code or prompt change). Not an Open Decision; the pipeline re-runs those stages.

**Verdict: Ready for Specification.** No Open Decision is `blocking: true`; `open_decisions_blocking` stays `false`. The seven new
Open Decisions (OD-26 to OD-32) are non-blocking; OD-26, OD-27 and OD-28 fix the wording the revised Specification, the matrix and the
reconciliation report will carry, so the owner should answer them before the Specification is re-approved. The v5, v4, v3 and v2 text
below is retained for the record; where it describes the live-run criteria as measured, the v6 status table in the open-decisions file
prevails.

Verification checklist (v6): [x] both artifacts written; [x] every ambiguity resolved with a cited source or logged; [x] each new Open
Decision states question, evidence, impact, `blocking`; [x] locale scope examined (uk-UA fan-out; non-uk-UA verification, OD-15);
[x] stores checked against `STORE_REGISTRY`; [x] section 4 criteria named; [x] FROZEN status addressed; [x] still-open decisions
carried forward, none dropped; [x] no earlier resolution changed; [x] verdict stated.

---

## v5 revision (2026-10-19T08:10:00Z): the operator-note fields are withdrawn

Re-run of clarification against **Story v5** (DRAFT). The owner decided on 2026-10-19 to withdraw the four operator-note Generator
fields (Story v5 "Amendment"; `docs/workflow/history.jsonl` `ts` 2026-10-19T07:50:00Z, actor sbruhov@gmail.com, verbatim "досліди
можливість безпечного видалення цих полів. вони не потрібні" and "modify для task-a.ts та master-system-prompt.ts, шлях 1").
Story v5: AC-9 is a withdrawal stub; `ProductInput.operatorNotes`, the `[Operator Notes]` block and the `STRICT INPUT SCOPE` /
`numericFidelitySources` extensions are out; AC-1 to AC-8 and AC-10 to AC-12 are unchanged. This stage records the effect and
answered nothing. The Open Decisions log is `docs/decisions/US-9.1-open-decisions.md` (v5).

**What is clear now (checked against the sources).**

- **Actor, trigger, value, track** unchanged (bug Story, track `prompt`, Creality Pika regression).
- **Store and locale scope** unchanged and explicit: all seven `STORE_REGISTRY` keys (the acceptance stores EXPERT3D, Center 3D
  Print, 3DDevice exist in it; no currency named); uk-UA is the master and a change there fans out; the ban applies to every output
  language. The withdrawal adds no store, locale or currency. With the fields gone, the uk-UA master task has no extra input at
  all, so the locale fan-out concern that the notes added (OD-19) disappears.
- **Acceptance criteria.** AC-1 to AC-8 and AC-10 to AC-12 are substring, behaviour or script-measured and falsifiable; AC-9 is an
  explicit stub (the number is kept so AC-10 to AC-12 are not renumbered), so nothing in it needs testing.
- **Generated-HTML impact** (AGENTS.md section 4): unchanged and named by the Story: a `<p>` directly above every `<figure>`, lead-in
  not duplicating the `<figcaption>`, `alt` not duplicating the `<figcaption>`, first-image / lazy rules, video `<figure>` /
  `<figcaption>`. The withdrawal removes the only input-side change; nothing in it touches these criteria.
- **FROZEN files (section 9).** Story v5 Scope still lists `task-a.ts`, `master-system-prompt.ts` and `output-validator.ts`;
  `task-a.ts` is edited for FR-11 (AC-3) only. By-name approvals are recorded (OD-12 v5): `task-a.ts` and `master-system-prompt.ts`
  on 2026-10-19; `output-validator.ts` on 2026-10-18 (hunks committed: 7958c7f, ff8ad92). `task-b.ts` and `task-c.ts` are not touched.
- **Generation invariants.** Spec-count parity (`input.specs` is untouched), figure / figcaption structure and video survival are
  the invariants at risk and the Story names them. The master change still invalidates the prompt cache for every store once.
- **Dependencies.** US-5.1 and US-8.1 are archived; US-8.1's FAQ trigger no longer matters to this Story (OD-1 moot).
- **Registry and renderer cross-checks (this run).** `STORE_REGISTRY` has seven keys (3DDevice, 3DPrinter, 3DScanner, Center 3D
  Print, Drukarka 3D, EXPERT3D, Expert-3DPrinter); their locales (uk-UA, ru-UA, en-GB, pl-PL, de-DE, en-ES, es-ES, pt-PT, en-US,
  es-MX) reduce to the seven base languages of AC-5. `test/render-reconciliation.report.md` section 3 (transform dispositions) and
  section 5 (open gaps, PR-3 blocked) concern the Doc renderer's post-processing and corpus; the withdrawal changes no transform
  and adds no blocker there.

**Open Decisions, by effect of the withdrawal.**

- **Moot by withdrawal (history kept, no answer invented):** OD-1, OD-2, OD-16, OD-17, OD-19, OD-20 (1)(2). Notes part only: OD-18
  (the recorded resolution and the FR-11 two-tier golden stand), OD-20 (3) / the D-10 half of OD-10 (the owner's "script input set
  as D-10" stands, minus the notes), and the notes parts of OD-12.
- **OD-12 updated:** by-name FROZEN approvals now on record for all three files (see above); its scope question is the new OD-25.
- **New, non-blocking, each with a PROPOSED DEFAULT that is a proposal only:** OD-21 (what the master `STRICT INPUT SCOPE` /
  `INTERNAL RECONCILIATION` text reverts to: byte-identical to `main`, or a count-free neutral wording without the notes), OD-22
  (golden `full-description-prompts.json`, block 0 of ten cases, and the other fixtures that carry the notes shape: regenerate, how
  verified), OD-23 (how the removal is delivered on an already-pushed branch with open draft PR #142, the meaning of "path 1", and
  browser history entries that carry `operatorNotes`), OD-24 (tests of the withdrawn feature: delete or keep, absence pins),
  OD-25 (scope and lifetime of the 2026-10-19 FROZEN instruction).
- **Carried forward unchanged and still open:** OD-10 (D-3 to D-5, D-7, D-9), OD-11 (residue), OD-13 (rest), OD-15.
  Observation only: later owner events of 2026-10-18 in `history.jsonl` (15:24:23Z, 15:35:15Z, 16:24:34Z, 16:26:23Z) appear to
  answer parts of OD-10, OD-11 and OD-13. They were not applied (the instruction for this run was to leave every other Open Decision
  as recorded); see the v5 note in the open-decisions file. A record-only revision can apply them.
- **Story discrepancy (reported, not corrected).** Story v5 Scope "Touches FROZEN files?" still says no per-file approval has
  been given; the history records the approvals above. It changes no requirement.
- **Stale downstream artifacts.** Spec v6 is DRAFT and consistent with this log; the impact analysis, plan, task breakdown, test
  artifacts and the implementation, gate, verification, security and reconciliation reports were produced against Story v4 and are
  stale against Story v5. Not an Open Decision; the pipeline re-runs those stages.

**Verdict: Ready for Specification.** No Open Decision is `blocking: true`; `open_decisions_blocking` stays `false`. The five new
Open Decisions (OD-21 to OD-25) are non-blocking; OD-21 and OD-25 should be answered by the owner before the plan gate because
they fix the text of a FROZEN edit and the authority for it. The v4, v3 and v2 text below is retained for the record; where it
describes the operator notes, the v5 status table in the open-decisions file prevails.

Verification checklist (v5): [x] both artifacts written; [x] every ambiguity resolved with a cited source or logged; [x] each new
Open Decision states question, evidence, impact, `blocking`; [x] locale scope examined (uk-UA fan-out); [x] stores checked against
`STORE_REGISTRY`; [x] section 4 criteria named; [x] FROZEN status addressed; [x] still-open decisions carried forward; [x] verdict
stated.

## v4 revision (2026-10-18T10:09:20Z): plan-gate answers recorded

Only the Open Decision status changed. The human owner's answers given with `/so:approve` at HUMAN_PLAN_APPROVAL (source: the last
event of `docs/workflow/history.jsonl`, `ts` 2026-10-18T10:08:01Z, sbruhov@gmail.com) are recorded in
`docs/decisions/US-9.1-open-decisions.md` (v4). **The plan gate itself was NOT approved** (plan v3, task_breakdown v2, plan_review v2
stay DRAFT); the answers are applied first (open-decisions v4, then spec v5 with re-review and re-approval at HUMAN_SPEC_APPROVAL, then
impact / plan / tasks re-baseline, plan review, plan gate). This stage recorded the answers; it made none of them, and read none beyond
its quoted text.

- **RESOLVED in v4:** OD-2 (residues R1, R2 - the OD is now fully resolved), OD-19 ((1b) no, (2) yes - fully resolved), OD-20 ((2) and
  (3): defaults, script input set as D-10 - fully resolved), OD-7, OD-8, OD-9 (verify Node >= 22.18, else the D12 launcher; verification
  not performed by this stage), OD-14, OD-18 (all "accept as built"), and the D-10 half of OD-10(4).
- **PARTLY RESOLVED:** OD-11 (three products x 2 runs, all must pass the hard criteria, a non-marker run, evidence = script output,
  failure reported not auto-iterated; still open: which Center 3D Print and 3DDevice products, and who runs). OD-10 (D-6 from v3 and
  D-10 from v4 resolved; D-3 to D-5, D-7 and D-9 open).
- **STILL OPEN:** OD-12 (the owner stated the INTENT - task-a.ts T-A4, then output-validator.ts, then master-system-prompt.ts last,
  one commit per task with --rebaseline in the same commit - but the section 9 "modify <file>" instruction is NOT GIVEN; it will be
  given per file in the editing session), OD-13 (rest), OD-15.
- **Plan-level answers (not ODs), recorded in the open-decisions file:** Q1 (accept master in Task C and optimizer; guard option (b)),
  Q-TRANS (options 1+3), Q-OPT (option 1), **Q-SCOPE** (change the FR-20 self-scoping literal, drop "headings": **a Specification
  change**, handled by the Specification stage as spec v5), **Q-CLEARALL** (reset the notes signal in `clearAll`: a requirement the
  Specification must now carry), Q-CODEALT (no), Q-SIMPL (no).
- **No new Open Decision** was raised: no answer conflicts with Story v4, spec v4 or plan v3 (the only changed text is the FR-20
  literal, which is the owner's explicit instruction). `open_decisions_blocking` stays `false`.
- **Verdict unchanged: Ready for Specification** (no Open Decision is `blocking: true`); the Specification must now be revised (spec v5).
  The v3 and v2 text below is retained for the record; where it lists an OD as open, the v4 status table in the open-decisions file prevails.

## v3 revision (2026-10-17T15:50:33Z): owner decisions recorded

Only the Open Decision status changed. The human owner's decisions at HUMAN_SPEC_APPROVAL (source:
`docs/workflow/workflow-state.yaml` `pending_human_gate.comment`, decided by sbruhov@gmail.com on 2026-10-17, plus Story v3
"Amendment" for AC-12) are recorded in `docs/decisions/US-9.1-open-decisions.md` (v3) as resolutions. This stage recorded them; it
answered nothing itself.

- **RESOLVED:** OD-16, OD-17 (PROPOSED DEFAULTS confirmed as written), OD-2 (a)(b)(c), OD-3, OD-4, OD-5, OD-6.
- **PARTLY RESOLVED (remainder still open):** OD-19 (mechanism, SEO/slug/FAQ, spec grounding resolved; Doc-instruction text and
  Expert-3DPrinter open), OD-20 (part 1 resolved; parts 2-3 open), OD-10 (part 2 / D-6 resolved, "D-6 unchanged"; parts 1, 3, 4
  open), OD-14 (AC-12 soft-target sub-question resolved; the "35" counting rule and the 48-word-hook item open), OD-13 (FR-7 to
  FR-9 confirmed normative, spec note A; the rest open). OD-2 keeps one small residue (resend after restore).
- **STILL OPEN, untouched:** OD-7, OD-8, OD-9, OD-11, OD-12 (FROZEN approvals "not given here; per-file at the plan gate"), OD-15,
  OD-18.
- **Story v3** amends only the soft part of AC-12 (3 soft items, 2 of 3, non-blocking; per-section short-sentence count reported
  with no threshold; D-6 unchanged). The Decisions change spec v2 content (FR-11 RHYTHM, FR-13/FR-10, FR-15, FR-35, FR-24/FR-31,
  FR-29, the video-block wording); the Specification must be revised (spec v3) and re-reviewed. No Decision conflicts with the
  Story or the tree, so no new Open Decision was raised.
- **Verdict unchanged:** Ready for Specification (no Open Decision is `blocking: true`). The v2 text below is retained for the
  record; where it lists an OD as open, the v3 status table in the open-decisions file prevails.

**Verdict: Ready for Specification.** No Open Decision is `blocking: true`. The only v1 blocker (OD-1) is resolved by the
Story owner's amendment (Story v2, "Amendment", 2026-10-17T15:08:25Z). Nineteen Open Decisions were open at v2 (v3 above records which are now resolved or partly resolved), all non-blocking, in
`docs/decisions/US-9.1-open-decisions.md` (v2): OD-2 to OD-15 carried forward (OD-2 and OD-12 revised) and OD-16 to OD-20 new.
Several of them (OD-12, OD-16, OD-17) must be answered by a human before the Specification can be approved or before
IMPLEMENTATION; they do not stop the Specification from being drafted, where each is recorded as a gap, not filled by a guess.

## What changed since v1

- **Story v1 -> v2.** Q1 and AC-9 were rewritten; the Scope rows "Surface" and "Touches FROZEN files?" were updated. The four
  Generator textareas are carried by a new optional `ProductInput.operatorNotes` (structured object, four keys), rendered by
  `task-a.ts` as an `[Operator Notes]` block; `STRICT INPUT SCOPE` and `numericFidelitySources` are extended; `runFaqPipeline`
  and `faq-form.ts` are unchanged. All other Story content is unchanged (AC-1 to AC-8 and AC-10 to AC-12, Out of scope).
- **OD-1 resolved (b)**, citing the Story's Amendment (the Story owner decided it; this stage did not answer it). Checked against
  the tree: `runFaqPipeline` still keys only on `supplementalContent` (orchestrator lines 809, 1780), so the premise of the
  amendment holds.
- **OD-2 re-assessed.** The join-with-Supplemental-Content half is moot (separate carrier). Still open, and new in form:
  `HistoryService` persists the whole `input` (so `operatorNotes` lands in `seo_gen_history` although AC-9 speaks only of
  `seo_gen_form_state`), `restoreHistory` does not know the new fields, which views show the textareas, and the UI labels.
- **OD-12 re-assessed.** `task-a.ts` is now edited for two independent reasons and is the only route to AC-9; no non-frozen
  fallback exists for the carrier. Approval is still not recorded anywhere (the Story and Amendment both say so).
- **New:** OD-16 (keys, types, "empty"), OD-17 (entry labels, order, partial fill, placement), OD-18 (how byte-identical is
  tested), OD-19 (Doc pipeline / Expert-3DPrinter / other prompts), OD-20 (the other source lists and the AC-10 script).

## What is clear

- **Actor, trigger and value.** A content operator generating a description (UA Description / Generator) and the page reader;
  trigger is the Creality Pika regression (35 picture references, dry text). Bug Story, track `prompt`.
- **Store scope.** "All stores in `STORE_REGISTRY`" (seven keys). The acceptance stores (EXPERT3D, Center 3D Print, 3DDevice)
  exist in the registry; 3DDevice has no ToV overlay. No currency is named. The amendment adds no store, locale or currency.
- **Locale scope.** Examined explicitly: uk-UA is the master; the ban applies to every output language; a uk-UA change fans out
  to every translation. The four operator notes are input to the uk-UA master Task A only (translations, FAQ, SEO and slug
  prompts do not read `operatorNotes`; confirmed in OD-19 as a question, not assumed). Verification for non-uk-UA output is OD-15.
- **Acceptance criteria.** AC-1 to AC-9 are substring or behaviour assertions and falsifiable. AC-9 now adds checkable
  behaviours (empty object leaves `userContent` unchanged, filling only these textareas does not trigger the FAQ, a number that
  appears only in the notes passes `numericFidelitySources`). AC-10 to AC-12 remain live-run measures (OD-9 to OD-11, OD-20).
- **Carrier facts verified in the tree (not decisions).** `ProductInput` is declared only in `src/app/types.ts` (not FROZEN,
  not named in the Story's Surface); `buildPromptADoc` keeps `base.userContent` as a byte-for-byte prefix, so a block added in
  `task-a.ts` reaches the Doc pipeline; `numericFidelitySources` is the single method used by the Doc gate and both HTML paths.
- **Generated-HTML impact.** AGENTS.md section 4 criteria in play are unchanged and named by the Story: lead-in `<p>` above
  every `<figure>`, lead-in not duplicating the `<figcaption>`, `alt` not duplicating the `<figcaption>`, first-image / lazy rules,
  video `<figure>`/`<figcaption>`. The operator notes add input text only; they must not change the empty-input prompt (AC-9) and
  must not introduce new numbers outside the extended source set.
- **Prompt impact and FROZEN status.** Addressed by the Story: `task-a.ts`, `master-system-prompt.ts`, `output-validator.ts`
  (section 9). `task-b.ts` and `task-c.ts` are not touched. `bash arch-guard.sh` was re-run read-only today: all frozen files
  unchanged. Approval timing and fallback are OD-12.
- **Generation invariants.** Spec-count parity is not touched (`input.specs` untouched); figure/figcaption structure and video
  survival are the invariants at risk and the Story names them. Prompt caching: the `[Operator Notes]` block rides in the
  uncached `userContent`; the master change still invalidates the cache once for all stores (the Story states it).
- **Dependencies.** US-5.1 and US-8.1 are archived and present; US-8.1 is why the FAQ trigger matters.

## What is ambiguous

- **Carrier details (new, OD-16 to OD-18, OD-20).** Key names and "empty" semantics; entry labels, join order, partial fill and
  placement in `userContent`; the oracle for byte-identical; the other source lists (`NUMERIC_SOURCE_FIDELITY_RULES`, "the three
  input blocks", the AC-10 script's "input").
- **Reach (OD-2, OD-19).** History persistence/restore, views per template and store, UI labels; Doc pipeline mechanism,
  Expert-3DPrinter, SEO/slug/FAQ consumers.
- **FROZEN approvals (OD-12).** Per-file approval not recorded; `task-a.ts` has no non-frozen fallback for AC-9.
- **Carried forward unchanged (OD-3 to OD-11, OD-13 to OD-15).** Liveliness block against existing master rules (sentence
  bands, INVARIANT START, `[HEADING FORM]`, simplified templates); detector precision and missing non-uk patterns; "paragraph
  directly above"; how the measuring script runs; metric definitions; live-run evidence; git-ignored `Knowledge/` sources;
  the baseline that does not reproduce; verification of non-uk languages.

## Assumptions a specification writer would otherwise make silently

- The four key names, the empty-state rule, the entry labels, the join order and the block position (OD-16, OD-17).
- That notes are persisted in history and restored (or not) (OD-2).
- That the byte-identical test has a golden captured before the edit (OD-18).
- That the Doc pipeline, SEO/slug prompts and the numeric rule text need no change (OD-19, OD-20).
- Everything listed in v1 for OD-3 to OD-11 (RHYTHM vs sentence bands, hook vs INVARIANT START, functional headings, per-language
  phrase lists, a TS runner and sentence-splitting method).

## Constraints checked and found satisfied

- Story not edited. `workflow-state.yaml`, `active-story.yaml`, `history.jsonl` not written. No Open Decision answered; OD-1 is
  marked resolved only by citing the Story's Amendment.
- No still-open v1 decision was dropped: OD-1 resolved (cited), OD-2 and OD-12 revised in place, OD-3 to OD-11 and OD-13 to
  OD-15 carried forward; part (1) of v1 OD-2 is closed by reason (separate carrier), recorded in OD-2.
- AGENTS.md section 4 is not contradicted by the amendment.

## Notes

- **Timestamps (non-blocking).** The earlier artifacts (Story v1 `created_at` 18:00:00Z, clarification v1 19:00:00Z) carry
  times later than the real UTC clock at this revision (about 15:11Z on 2026-10-17). They were not rewritten. The v2 artifacts
  use real UTC (15:12:00Z). Because v2 reuses the v1 paths, the v1 file contents were overwritten and survive only as the
  carried-forward text in the v2 files (the v1 files were untracked, so git does not hold them).
- **Surface gap (non-blocking).** `src/app/types.ts` is where `ProductInput.operatorNotes` must be declared; the Story's
  Surface row leaves the file "to be confirmed". The tree answers it; the Specification should list it.

## Verification checklist

- [x] Both artifacts written (v2, supersede v1).
- [x] Every ambiguity is resolved with a cited source or logged as an Open Decision.
- [x] Every Open Decision states question, what was checked, impact and `blocking`.
- [x] Locale scope examined, including uk-UA fan-out.
- [x] Every store, locale and currency in the Story checked against `STORE_REGISTRY`.
- [x] AGENTS.md section 4 criteria in play named.
- [x] FROZEN status (section 9) addressed.
- [x] Still-open decisions from the previous run carried forward.
- [x] Explicit readiness verdict stated.
