---
artifact: impact_analysis
story: US-9.1
version: 6
status: ARCHIVED
owner: so-impact-analyzer
created_at: 2026-10-17T16:09:47Z
updated_at: 2026-10-19T16:20:00Z
supersedes: docs/impact-analysis/US-9.1-impact-analysis.md#5
inputs_consumed:
  - key: story
    version: 6
  - key: specification
    version: 8
  - key: open_decisions
    version: 6
open_decisions_blocking: false
---

# Impact analysis: US-9.1 (no picture references and livelier descriptions), revision for the AC-11/AC-12 waiver (Spec v8)

> **Change note, v5 to v6.** v5 surveyed the operator-notes REMOVAL against Specification v7 as work still to do. Since then the
> removal is **implemented and committed** (`1b73c8a..313f727`; HEAD `313f727`, branch
> `feat/US-9.1-no-picture-references-and-livelier-descriptions`). Specification v8 / Story v6 change **only the acceptance status**
> of AC-11 and AC-12: the owner waived their hard script criteria on manual testing (history event `ts` 2026-10-19T14:50:23Z), nothing
> was measured, FR-34 and FR-35 keep their text and are marked WAIVED. No FR is renumbered, no Open Decision is resolved (OD-26 to
> OD-32 raised, PROPOSED DEFAULTS). This revision (a) re-surveys the blast radius of Spec v8 on the **current** tree, (b) re-checks
> the removal footprint with `git grep`, and (c) lists exactly which docs artifacts v8 makes stale. v5's pre-implementation
> "must change" file lists are **obsolete** (those edits are committed) and are kept only in git
> (the committed v4/v5 revisions of this path in `git log`). Survey only: no design, no ordering, no code.
>
> Basis (all re-derived in this run): `git rev-parse --short HEAD` = `313f727`; `git status --short -- . ':!docs'` is empty (only `docs/`
> files are modified); `git diff --stat 313f727 HEAD -- . ':!docs'` is empty (src, test, tools, server unchanged since the
> implementation round); no untracked files; `bash arch-guard.sh`: ALL CHECKS PASSED.

## Verdict on the v8 change: documentation / acceptance-status only

**No source, test, fixture, prompt, golden, server or tool file is reached by Specification v8.** Evidence:

- Spec v8's own change list (revision note) touches FR-34, FR-35 (text + WAIVED marker, waiver record), the traceability rows AC-10/
  AC-11/AC-12, Open-questions rows OD-26 to OD-32, and "live-run" wording in the Summary, Background, Scope, FR-1, FR-5, FR-20,
  FR-21 and Out of scope. All of it is Specification prose; no FR that prescribes behaviour changed.
- **Behaviour requirements are unchanged.** FR-1 to FR-23, FR-32, FR-33, FR-36 to FR-39 and FR-42 to FR-44 (the requirements that
  map to code) are not renumbered or reworded in substance; FR-32/FR-33 (the AC-10 script) stay in scope. Wording edits in FR-1/
  FR-5/FR-20/FR-21 are cross-reference text about the live runs, not requirements on a file.
- `git grep -n "FR-34\|FR-35\|AC-11\|AC-12" -- . ':!docs'` returns only (i) **comments** in `src/utils/description-metrics.ts` (lines 25,
  46, 48) and `src/utils/description-metrics.spec.ts` (line 26) that say the script's soft items are reported and never change
  `hardViolations`, and `src/prompts/vision-prepass.no-picture-references.spec.ts` (line 8) that calls the live acceptance "outside
  the gate"; all three stay true under v8 (the waiver covers the hard script criteria; the soft items remain non-blocking), so they
  need re-verification of wording at most, not an edit; and (ii) **unrelated** hits where `AC-11`/`AC-12` are other Stories' ids
  (US-8.1 FAQ Generator, US-2.2 simplified templates) in `app.component.template-wiring.spec.ts`, `app.component.ts` line 492,
  `src/domain/description-doc.schema.simplified.spec.ts`, `simplified-templates.spec.ts`, `task-a-doc.simplified.spec.ts`,
  `content-orchestrator.faq-standalone.spec.ts`. None is touched.
- The instrument for AC-10 is untouched and still exists: `tools/measure-description.ts` (4 `measure-description` references in
  `tools/`, 3 in `test/measure-description.cli.spec.ts`, 5 in `test/operator-notes-source-scan.spec.ts`). The waiver does not
  retire the script, its tests or `src/utils/description-metrics.ts`.
- `src/prompts/**`, `src/prompt-core/**`, `src/domain/**`, `src/render/**`, `src/utils/output-validator.ts`, `server/**`,
  `test/fixtures/golden/**`, `test/fixtures/corpus/**`: no Spec v8 change reaches them. **Zero FROZEN-file impact from v8**
  (`task-a.ts`, `master-system-prompt.ts` hunks of the removal are already committed; frozen checksums match, arch-guard PASS).

## Operator-notes removal footprint re-check (non-doc files)

`git grep -il "operatorNotes\|operator-notes\|Operator Notes\|OperatorNotes\|notes-usage-scenarios\|notes-test-results\|notes-previous-generation\|notes-limitations\|usageScenarios\|OPERATOR_NOTE" -- . ':!docs'`
returns 16 files, **all test-side; none is a production file**:

| Group | Files (hit count) | Nature |
|---|---|---|
| New absence pins / removal tests (added by the removal) | `test/operator-notes-source-scan.spec.ts` (20), `src/app/app.component.no-operator-notes.spec.ts` (5), `src/services/content-orchestrator.stray-operator-notes.spec.ts` (14), `src/services/history.service.legacy-entry.spec.ts` (8), `src/prompts/full-description.golden.fr43-oracle.spec.ts` (8), `src/prompt-core/master-system-prompt.source-scope.spec.ts` (6), `src/prompt-core/constants.numeric-source-rules.spec.ts` (3) | FR-42/FR-43/FR-44 pins (absence, stray-value, legacy-entry, oracle, relocated `NUMERIC_SOURCE_FIDELITY_RULES` pin) |
| Existing specs rewritten to absence form | `src/prompts/full-description.golden.us91.spec.ts` (5), `src/prompts/task-c.master-reach.spec.ts` (8), `src/prompts/optimizer.master-reach.spec.ts` (9), `src/prompts/task-a-doc.figure-placement.spec.ts` (6), `src/prompts/task-a.user-content.golden.spec.ts` (17) | `[Operator Notes]` appears as a must-be-absent literal or in a stray-property cast |
| Script rejection pin | `test/measure-description.cli.spec.ts` (hits at lines 24, 211, 219, 222, 244, 247) | FR-44 item 5: `--notes-*` rejected as `unknown argument` |
| Fixtures / comment-only | `test/fixtures/faq-pipeline.ts` (line 129, comment: literal left the list), `test/faq-pipeline.master-leak.spec.ts` (line 86, title), `test/fixtures/task-a-user-content-inputs.ts` (1) | Comments / titles recording the withdrawal |

Confirmed absent (zero hits) outside `docs/`: `src/prompts/operator-notes.ts`, `src/app/operator-notes-form-state.ts`,
`src/app/components/operator-notes-fields/` (components dir now: content-template-select, dashboard, html-editor, model-settings,
source-input), `ProductInput.operatorNotes`, `OperatorNotes` type, the 8 `TRANSLATIONS` keys, `numericFidelitySources` reader, the
four `--notes-*` flags; `git ls-files | grep -i operator-notes` lists only the three new pin files above.
`git grep -n "operatorNotes\|Operator Notes\|\[Operator" -- src/prompts/task-a.ts src/prompt-core/master-system-prompt.ts
src/app/types.ts src/app/app.component.ts src/app/app.component.html src/services tools server src/utils src/domain src/render ':!*.spec.ts'`
is empty. The v5 footprint (11 production files, 8 dedicated specs, shared specs, golden) is therefore **fully realised and still
accurate as "done"**; nothing from it is outstanding in code. The only v5 statement that is no longer accurate is its tense and its
"must change" classification.

## Hazard table (all seven re-checked on the current tree for the v8 change)

| # | Hazard | Applies to v8? | Evidence |
|---|---|---|---|
| 1 | `STORE_REGISTRY` fan-out | **Checked, does not apply** | v8 touches no registry consumer and no file at all outside `docs/`. The waived runs named stores (EXPERT3D, Center 3D Print, 3DDevice, one no-ToV store) in Spec Scope prose only; the Scope table now says no store is evidenced by a run, which is a statement about evidence, not a code path. The registry consumer list was re-derived in v5 and has not changed: `git diff --stat 313f727 HEAD -- . ':!docs'` is empty. |
| 2 | uk-UA is the master | **Checked, does not apply** (no generation change). Spec Scope "Locales" row now says no live check of any output language is evidenced; the ban rests on the detector warning and the owner's manual testing. The direction (uk-UA change fans out to all other locales at payload level via `systemBlocks[0]`) is unchanged and already realised by the committed master revert. |
| 3 | prompt to schema to renderer to validator chain | **Checked, does not apply** | No link edited by v8. Chain state is the committed state (prompt link: master bullets + `task-a.ts` `userContent`; schema/renderer/validator links untouched by the removal). |
| 4 | FROZEN files | **Checked, does not apply to v8** | `bash arch-guard.sh`: ALL CHECKS PASSED at HEAD `313f727`; no frozen file is in the working-tree diff (`git status --short -- . ':!docs'` empty). The removal's two committed frozen hunks (`task-a.ts`, `master-system-prompt.ts`) are recorded in the earlier stages' history. |
| 5 | Corpus conformance harness | **Checked, does not apply** | Corpus `test/fixtures/corpus/` unchanged; renderer not edited. The waiver means the live-run coverage the corpus could never provide (corpus is 2 items, same product, `test/render-reconciliation.report.md` section 5) is simply not evidenced either; that is a pre-existing gap, not new work. |
| 6 | Two test runners | **Checked, does not apply** | v8 adds, removes or changes no test. State of runners after the removal: component runner (`**/*.component.spec.ts`) lost `operator-notes-fields.component.spec.ts`; the new pins are all logic-runner specs (none matches `*.component.spec.ts`). |
| 7 | Server-side surfaces | **Checked, does not apply** | `git grep -il "operatorNotes\|Operator Notes" -- server` is empty; `server/**` unchanged since `313f727`; no `server/usage/store.js` schema touched. |

## Fixture and corpus impact

None from v8. `test/fixtures/golden/{full-description-prompts,task-c-description-prompts,task-a-user-content,optimizer-faq-pre-change}.json`
and `test/fixtures/corpus/**` are unchanged since HEAD `313f727`; the removal's golden regeneration is already committed.

## Docs artifacts that Spec v8 / Story v6 make stale (exact list; for the orchestrator, not written here)

Staleness rule used: an artifact is stale if it consumed Story <= v5 or Specification <= v7 AND its content on AC-11/AC-12/FR-34/FR-35 or
the "T51 live runs" conclusion is contradicted by v8 (i.e. it describes the live runs as pending, required, blocking or unmeasured-as-defect).
`inputs_consumed` versions read from each front matter.

| Artifact (path) | v / status | Consumed | Why v8 reaches it | Staleness |
|---|---|---|---|---|
| `docs/plans/US-9.1-task-breakdown.md` | v5 APPROVED | story 5, spec 7 | **T51** ("Re-run the live acceptance runs after the master revert", manual, lines 47-55, 131, 136, 553-575) and trace row `AC-11 (FR-34, FR-36), AC-12 (FR-35) -> T51 (live), T47, T50` (line 626) and risk line 613 (`R5: T51`) describe a task v8 says is not performed. Task count/track summary (9 tasks, 1 manual) also moves. | **Stale**: task no longer required. |
| `docs/plans/US-9.1-implementation-plan.md` | v6 APPROVED | story 5, spec 7, impact 5 | **R5** (line 398: live evidence captured before the revert used the notes-bearing master; "runs not yet done should follow the revert"), lines 337 and 440 (`FR-34, FR-35 ... unchanged; R5`). R5 becomes moot-by-waiver. | **Stale**: risk R5 and the FR-34/35 mapping. |
| `docs/reviews/plans/US-9.1-plan-review.md` | v5 APPROVED | story 5, spec 7, impact 5, plan 6, tasks 5 | Reviewed a plan/breakdown that carries T51/R5 and AC-11/AC-12 reachability through T51 (12 AC-11/12/T51 mentions). | **Stale** (consequential: its subject artifacts change). |
| `docs/tests/US-9.1-ac-test-matrix.md` | v4 DRAFT | story 5, spec 7 | **Rows AC-11 and AC-12** (lines 194-195: "live runs ... green (committed; guard, stays green) / built (guard)"), the T51 reference (line 201), and the closing coverage sentence (line 224). Rows must carry WAIVED (owner, Story v6, 2026-10-19; not measured) per FR-34 waiver record, never "passed"/"measured". Row AC-10 stays. | **Stale**: two rows + footers. |
| `docs/tests/US-9.1-test-strategy.md` and `docs/tests/US-9.1-test-generation-report.md` | v4 DRAFT each | story 5, spec 7 | 6 and 5 AC-11/AC-12/live-run mentions describing the live check as manual/outside the gate; wording only. | **Stale (wording)**. |
| `docs/reconciliation/US-9.1-reconciliation-report.md` | v3 DRAFT | story 5, spec 7 | Verdict **BLOCKED** specifically on AC-11/AC-12 ("Ruling on AC-11 and AC-12 ... BLOCKED", lines 24-78, 248); unblock route (a) "explicit waiver / Story amendment" is exactly what Story v6 now is. It already discusses waivers (8 mentions, written as routes) but consumed Spec v7. | **Stale**: must be re-run against Story v6 / Spec v8 (RECONCILIATION stage output). |
| `docs/verification/US-9.1-verification-report.md` | v2 DRAFT | story 5, spec 7 | Line 70 and F3 (line 142): "no live model output ... T51 not done, so section 4 criteria on real generations are unverified". Still factually true (nothing measured) but its framing as an open item changes to "waived, accepted on the owner's word". | **Stale (framing)**; mechanical conclusions unaffected. |
| `docs/verification/US-9.1-quality-gate-report.md` | v2 DRAFT | story 5 (no spec key) | Line 204 only: "T51 (manual live runs ...) is owner-run and outside this gate; pipeline_status v4 residual R5". Gate evidence (lint/test/build/arch-guard) is untouched by v8. | **Stale (one sentence)**; gate results not invalidated. |
| `docs/verification/US-9.1-implementation-report.md` | v2 DRAFT | story 5, plan 6, tasks 5, matrix 4, status 4 | 10 mentions of T51/AC-11/AC-12; downstream of the stale breakdown/matrix. | **Stale (consequential)**. |
| `docs/catalog/US-9.1-pipeline-status.md` | v4 DRAFT | story 5, spec 7 | 11 mentions: residual R5 and T51 listed as open. Written by so-builder. | **Stale (residuals section)**. |
| `docs/reviews/security/US-9.1-security-review.md` | v2 DRAFT | story 5, spec 7 | 2 live-run/AC-11/12 mentions only; security conclusions (no code change since) unaffected. | **Stale (two mentions)**; verdict not reached by v8. |
| `docs/impact-analysis/US-9.1-impact-analysis.md` | v5 DRAFT | story 5, spec 7, OD 5 | This artifact; superseded by this v6. | **Superseded now.** |

Not stale (already at v8/v6, nothing to do): `docs/specifications/US-9.1-spec.md` (v8 APPROVED), `docs/reviews/specifications/US-9.1-spec-review.md`
(v8, consumed spec 8), `docs/stories/...` (v6). Consumed-version lag with no content effect: `docs/decisions/US-9.1-open-decisions.md` (v6) and
`docs/evidence/US-9.1-clarification-report.md` (v6) list `specification: 7` in `inputs_consumed` while their text already carries the
v6 waiver material; the orchestrator should decide whether that is a front-matter correction only (this survey makes no change to them).

Everything above is a **docs-only** set. No code, test, fixture, prompt or golden file is made stale by v8.

## Silent-failure risks (v8-specific; the removal's own risks, v5 items 1 to 8, are now realised in code and pinned by the new specs)

1. **The headline outcomes (0 picture references, 0 invented numbers) are accepted unmeasured.** Nothing erroring will ever show a
   regression of the model's behaviour; the guards only prove the prompt text is delivered (Spec: "judged only by the owner's manual
   testing"). The detector warning (FR-16 to FR-19) is the only runtime signal.
2. **A stale "green" label on the AC-11/AC-12 matrix rows.** Matrix v4 rows read "green (committed; guard, stays green)". Left as is
   after v8, a downstream reader (reconciliation, the PR "how verified" line) could read the live criteria as passed; FR-34's waiver
   record forbids "passed"/"measured". It fails no test.
3. **Waiver scope drift.** FR-34's waiver record (OD-29 default) says the waiver covers the delivery as committed at decision time;
   any later change to a prompt-bearing file needs a restated waiver. No test or gate detects a later prompt edit under an old waiver.
4. **Comments citing FR-35 / "outside the gate"** in `description-metrics.ts`, its spec and `vision-prepass.no-picture-references.spec.ts`
   remain accurate but would read ambiguously next to a WAIVED FR-35; no check catches wording drift.
5. **Plan/breakdown still prescribe T51.** An implementer or the PR preparer following the approved breakdown literally would be told a
   manual step is outstanding; `bash`/CI cannot detect it.

## Blast-radius summary

Specification v8 is a documentation/acceptance-status change with **no code blast radius**: zero source, test, fixture, prompt, golden,
server or tool file is reached, zero FROZEN files, zero fan-out hazards triggered; HEAD `313f727` has an unchanged non-doc tree and
passing arch-guard. Its entire reach is the pipeline's document set: the approved task breakdown (T51, trace row AC-11/AC-12, risk R5
mapping), the approved implementation plan (R5, FR-34/FR-35 line), the plan review that approved them, the ac_test_matrix rows AC-11/
AC-12 (must read WAIVED, not green), test strategy and test generation report wording, the reconciliation report (BLOCKED on exactly
these two criteria, to be re-run against Story v6/Spec v8), the verification/implementation/quality-gate reports and pipeline status
(open-item framing of T51/R5), and two sentences/mentions in the security review. The operator-notes removal footprint is verified as
complete in code: no production file mentions the tokens, 16 test-side files remain, all of them new pins, absence-form rewrites or
comments. What a planner must plan around: the owner's waiver is recorded but the OD-26 to OD-32 wording is PROPOSED DEFAULT (a plain
`/so:approve` accepts it), the approved breakdown/plan carry a task (T51) and risk (R5) that the spec no longer requires, and the
reconciliation verdict BLOCKED was grounded on the pre-waiver text.

## Unknowns

1. **OD-26 to OD-32 (and the still-open OD-21 to OD-25 defaults) are unanswered.** If the owner widens the waiver to the soft and
   manual items of AC-12 (OD-28 (a)) or defers them (OD-28 (c)), only FR-35's paragraph changes; the docs list above is unchanged in
   membership. Settled by the owner's `/so:approve` comment.
2. **Whether the orchestrator treats the plan, breakdown and plan review (APPROVED at spec v7) as requiring a full re-run or an
   amendment note.** Their v8 impact is limited to T51/R5/trace rows; process choice is not determinable from the tree.
3. **Whether `docs/decisions/US-9.1-open-decisions.md` and `docs/evidence/US-9.1-clarification-report.md` front matter
   (`specification: 7`) is a lag to correct.** Not determined; their text is already v6 material.
4. **Full gate not re-run** (survey only); `docs/verification/US-9.1-quality-gate-report.md` records the earlier green gate and the
   non-doc tree is byte-identical since `313f727`. `bash arch-guard.sh` was run read-only and passed.
5. **Node >= 22.18 for the script specs** (OD-9 condition): `package.json` still declares no `engines` (unchanged; not re-checked this run).
