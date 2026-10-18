---
artifact: clarification_report
story: US-9.1
version: 4
status: DRAFT
owner: so-clarifier
created_at: 2026-10-17T15:12:00Z
updated_at: 2026-10-18T10:09:20Z
supersedes: docs/evidence/US-9.1-clarification-report.md#3
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
    version: 4
open_decisions_blocking: false
---

# US-9.1 - Clarification Report (v4)

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
