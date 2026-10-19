---
artifact: plan_review
story: US-9.1
version: 6
status: APPROVED
owner: so-plan-reviewer
created_at: 2026-10-19T12:30:00Z
updated_at: 2026-10-19T15:19:00Z
supersedes: docs/reviews/plans/US-9.1-plan-review.md#5
inputs_consumed:
  - key: story
    version: 6
  - key: specification
    version: 8
  - key: impact_analysis
    version: 6
  - key: implementation_plan
    version: 7
  - key: task_breakdown
    version: 6
open_decisions_blocking: false
---

# Plan Review: US-9.1 — No picture references and livelier descriptions (Creality Pika regression), re-review for the AC-11 / AC-12 waiver (plan v7, breakdown v6)

**Verdict:** PASS
**Loop-back:** n/a

> `PASS` here is **not** human approval. Only `/so:approve` records that (AGENTS.md section 10). Plan v7 and breakdown v6 stay `DRAFT` until the human gate
> fires; review v5 (`PASS`) is superseded at this path.

## Summary

Specification v8 (APPROVED at HUMAN_SPEC_APPROVAL, history `ts` 2026-10-19T15:10:58Z, OD-21 to OD-32 unanswered so their PROPOSED DEFAULTS are accepted as written) changes only the
acceptance status of AC-11 and AC-12. Plan v7 and breakdown v6 absorb exactly that: both ACs are WAIVED and unmeasured, reachable through no task, with wording that never says
"passed" or "measured"; T51 is superseded with no replacement; R5 is rewritten as a disclosure risk. T43 to T50, the two FROZEN STOP tasks (T43, T44) and the coupling constraints
are unchanged from the approved v6 / v5 shape, and the git tree agrees with the "code is done" premise. No blocking defect, no scope growth. Six non-blocking findings travel with the PASS.

## 1. Specification coverage (re-derived, both directions)

| FR / AC | Reached by task(s) | Verdict |
|---|---|---|
| FR-1 to FR-23 (AC-1 to AC-8) | committed, unchanged by Spec v8; stay-green lists T43 to T49, swept by T50 | covered (preserve) |
| FR-24, FR-25, FR-26, FR-28 to FR-31, FR-40, FR-41 (withdrawn stubs) | removal T44, T45, T46, T48, T49 | covered |
| FR-27 | golden untouched; T44 keeps the FR-11 hunks; P5 | covered |
| FR-32, FR-33 (AC-10) | T47, T50 (OD-30 default: script and metrics core not touched by the waiver) | covered |
| **FR-34 (AC-11)**, **FR-35 (AC-12, hard criterion)** | no task. **WAIVED (owner, Story v6, 2026-10-19; not measured)**; plan section "AC-11 / AC-12: WAIVED ...", validation rows 13 and 14, R5; breakdown trace rows, T51 SUPERSEDED, F11 | **explicitly WAIVED, honestly worded** (see below) |
| FR-36 to FR-39 | preserve-only | covered |
| FR-42, FR-43, FR-44 items 1 to 5 | T43 / T44 / T45 / T46 / T47 (P1 to P10) | covered |
| AC-9 (withdrawn), NFR-1, 9, 10, 13, 14, 15 | exclusions through FR-42 to FR-44; T43 to T49; P0 to P4, P11, P12, P14; T50 | covered |

| Task | Traces to | Verdict |
|---|---|---|
| T43 | W2/W4/W6, FROZEN item 2; FR-42, FR-43, NFR-15 | ok |
| T44 | W2, FROZEN item 1; FR-44.2, NFR-15 | ok |
| T45 | W5 orchestrator row; FR-44.4.1 | ok |
| T46 | W5 form rows, W9; FR-44.3 | ok |
| T47 | W5 `tools/` and comment rows; FR-44.5, AC-10 | ok |
| T48 | W5 leaf module; coupling 2 | ok |
| T49 | W1, W5 `types.ts`; coupling 1 | ok |
| T50 | verification commands | ok (evidence only) |
| T51 | none (SUPERSEDED, deliberately maps to nothing) | ok |

**Waiver wording audit.** Checked against Specification v8 FR-34, FR-35, OD-26 to OD-32 (spec lines 1010 to 1056, 1429 to 1435): plan v7 section "AC-11 / AC-12", rows 13 and 14, R5, R12,
"Withdrawn from v4", Traceability, and breakdown v6 T51, the two trace tables, F4, F11. Every statement says WAIVED / not measured / unmeasured / "accepted on the owner's word"; the words
"passed" and "measured" occur only in negated form ("never as passed or measured", "not measured") or about unrelated measurements (the 130-character master figure). The soft items are
"not evidenced by any recorded run", the manual fact review is "covered by the owner's statement, not as evidence" (OD-28), and row 14 states that the unit-level number guards are not a
substitute for the criterion. Disclosure is assigned to the downstream records (matrix, RECONCILIATION `non_blocking_findings`, PR "how verified" line; AGENTS.md section 13 line 539 to 540
supports the last), as OD-27 / OD-32 say, and no new persistent record is invented.

**Live-run wording sweep.** `grep -i "live run|live-run|live acceptance|T51|should follow|re-run the live"` over plan v7 and breakdown v6: every hit is a revision note, the superseded T51 section,
the OD-26 / OD-32 default rows, row 13 (which names the criterion "0 picture references on live output" and says WAIVED), or R5 / R12 / "Withdrawn from v4" in qualified form. No sentence implies
the runs will happen. The old R5 phrase "should follow the revert" survives only inside the revision note that quotes it as removed. The remaining open-item framing of T51 lives in
`docs/catalog/US-9.1-pipeline-status.md` lines 38, 60, 121 (see N1), not in these two documents.

Scope creep checked against Specification v8 *Out of scope* by name (lines 1383 to 1386: no change to `tools/measure-description.ts`, `description-metrics.ts` or their tests because of the waiver;
OD-31 and OD-15 stay): the v7 / v6 deltas add no task, no file, no test and no design decision. Row 14's "unit-level guards are not a substitute" sentence is a protective qualification, not a
requirement.

## 2. FROZEN files (AGENTS.md section 9)

| Task | Frozen file touched | Section 9 stop present? | Sibling-file pattern used? | Verdict |
|---|---|---|---|---|
| T43 | `src/prompt-core/master-system-prompt.ts` (one hunk, reverse of `6db2885`) | yes, unchanged from v5: exact change, reason, 130 characters / 134 bytes, refusal rule, per-file "modify [filename]" in the builder's session, `--rebaseline` with one line moved | not applicable (text lives in the frozen file) | ok |
| T44 | `src/prompts/task-a.ts` (one hunk, reverse of `7397081`) | yes, unchanged; refusal blocks T48 / T49 | not applicable | ok |
| T45 to T50 | none | n/a | n/a | ok |
| T51 | none (superseded) | n/a | n/a | ok |

The waiver adds no frozen-file task and plan v7 states that nothing in `src/`, `tools/`, `server/`, `test/` changes. Tree check: HEAD `313f727`; `git diff 313f727 -- src tools server test .arch-guard-checksums`
is empty; the master diff against `6546db8` has no hunk inside `[SOURCE FIDELITY]` (hunks at lines 1, 87, 391, 430, 440, 460: import, `LIVELINESS_RULES`, FR-5 to FR-9 text); `task-a.ts` shows exactly the three FR-11
hunks (29, 105, 121); `bash arch-guard.sh` prints ALL CHECKS PASSED. FROZEN commits `fd9b052` (master + checksum + golden) and `439cc1e` (`task-a.ts` + checksum) each carry `.arch-guard-checksums` in the same commit.
Plan assumes approval it does not have: **no** ("No approval is claimed"; the FROZEN-file position section is unchanged and does not treat the committed edits as a standing grant).

## 3. Architecture rules (AGENTS.md section 3)

| Rule | Checked | Finding |
|---|---|---|
| 1 — no direct SDK outside `server/providers/` | yes | no provider file in any task; `server/**` unedited (empty `git diff 09f87dc` over `server` non-spec) |
| **2 — retrieval separate from generation** | yes, deliberately | the v7 / v6 delta touches no code at all; the earlier design adds no retrieval path (FAQ trigger only observed by P7). Clear |
| 3 — prompt text out of services | yes | T45 only deletes; no string added |
| 4 — no key in the bundle | yes | nothing touched |
| 5 — no existing feature broken | yes | `app.component.{ts,html}`, `types.ts` byte-identical to `6546db8` (empty `git diff --stat`); T46 acceptance includes `npm run build` |
| `STORE_REGISTRY` sole source of locales/currency | yes | no locale or currency literal added; the waived runs named stores in prose only |
| `systemBlocks` not collapsed into `userContent` | yes | `PromptPayload` unchanged; block 0 only shrinks |

## 4. prompt → schema → renderer → validator

- Links touched: unchanged from v5 (prompt master bullets and `task-a.ts` emission, `ProductInput`, the validator's source list). The waiver touches none.
- Stay in agreement: yes. Contract-before-consumer in removal form holds: T44 < T49, T44 / T45 / T46 < T48, T48 / T47 < T49; the four importers of the leaf module at the pre-removal state are exactly T48's dependencies.
- Section 4 criteria the renderer must keep satisfying: complete (the removal never touched figure, figcaption, lazy, orphan-image, video, spec-parity, SEO-limit or currency rules). AC-11's structural intent (FR-36) stays covered at unit level as the spec's trace row says.

## 5. Task quality

| Check | Result |
|---|---|
| All eight fields present on every task | yes (T50 has no files and no commit by design; T51 is a marked tombstone with Status in place of a live Track) |
| Acceptance checks observable | yes; T43 to T50 unchanged: net-diff oracles against `6546db8`, numstat 10/10, one-line checksum move, `git ls-files`, widened `git grep` |
| Each task could end in one green commit (section 13) | T43 to T49 yes under the per-task gate convention; they are in fact committed as `fd9b052`, `439cc1e`, `19ed848`, `4556cb4`, `291bc1e`, `bad5161`, `86b0d62` |
| No task spans two tracks | yes; counts agree (8 active: prompt 4 = T43, T44, T48, T50; angular 4 = T45, T46, T47, T49; 7 committing; 2 FROZEN; T51 outside every count) |
| Ordered by dependency and risk | yes; the execution-order block drops the `T49 --> T51` edge and states T51 is not part of the order |
| Fixture updates sit with the change that moves them | yes (golden with the master in T43; `git diff --numstat 09f87dc` on it = 10 / 10, `Operator Notes` count 0) |

## 6. Test strategy

| Check | Result |
|---|---|
| Every task names test files and runner | yes (handles P1 to P14, `test:logic` / `test:components`); T51 and AC-11 / AC-12 have none by waiver, stated as such |
| Component specs named `*.component.spec.ts` | n/a (one deleted; two remain) |
| Untested tasks justify changing no behaviour | yes (T47 comment edit pinned textually; T50 evidence only) |
| Failure paths from the FRs are covered | yes for FR-42 to FR-44. The only criteria without a runnable check are AC-11 and AC-12, by the owner's decision and stated in the plan ("the only acceptance criteria without a runnable check in this plan") |
| Nothing relies on weakening/skipping a test (7.7) | yes; the waiver deletes no test and skips none (it is an acceptance-status change, and no test ever existed for these runs) |

## 7. Impact-analysis fidelity

- Plan consumed the survey: yes. Impact v6 states that Spec v8 / Story v6 reach no source, test, fixture, prompt, golden, server or tool file and no FROZEN file, and lists the stale documents; plan v7 and breakdown v6 act on exactly that list (T51, R5, trace rows) and nothing else.
- Files touched but not surveyed: none.

## Drift check of T43 to T50 against the approved v6 / v5

Plan and breakdown were overwritten in place and the previous approved copies are not in git (HEAD still holds v4 / v3), so the baseline is review v5's own record of them plus the revision notes. Both revision notes
claim byte-identical everything else. Verified by reading: the FROZEN-file position section, W1 to W10, coupling constraints 1 to 6, "The sanctioned red window", "Specification inaccuracies", the Reading guide, P0 to P14, and
T43 to T50 (What changes, Files, Tests, Acceptance) match review v5's descriptions point by point (T43 master + golden + `--rebaseline`; T44 `task-a.ts`; T45 lines 43, FR-30 paragraph, 384; T46 one change; T47 four flags; T48 depends on T44, T45, T46; T49 depends on T48, T47;
T50 verification only). The 130-character figure, golden case list, widened token set and `6546db8` base are as reviewed. **No drift found.**

## Verdict rationale

PASS, not `changes_required` / `changes_required_tasks`: the delta is purely an acceptance-status change, it is worded honestly and consistently in both documents, the T51 removal leaves no dangling edge or count, and nothing outside Spec v8
was added. Not `changes_required_specification`: Spec v8 is APPROVED and a fair statement of the owner's waiver; the plan reads it faithfully. Not BLOCKED: all five inputs are current and non-`SUPERSEDED` (story v6, spec v8 APPROVED, impact v6, plan v7, breakdown v6),
and OD-21 to OD-32 are non-blocking PROPOSED DEFAULTS, labelled as such at every use (plan: "PROPOSED DEFAULT ... accepted by a plain `/so:approve`; not an owner answer; closes nothing"; breakdown F5 and F11).

## For the human at HUMAN_PLAN_APPROVAL

- **The AC-11 / AC-12 waiver is the owner's, not the pipeline's.** The headline outcomes (0 picture references, 0 invented numbers on live output) are unmeasured and rest on the owner's manual testing; the waiver is bound to the delivery as committed (OD-29). The pipeline can only disclose this (matrix, RECONCILIATION `non_blocking_findings`, PR "how verified" line).
- The plan and breakdown still describe T43 to T49 prospectively (STOP requests, red window), but those commits exist. Approval of v7 / v6 is therefore retroactive for the removal design; the sanctioned red window and the per-task gate convention (N1 of review v5) are historical. Whether TEST_WRITING and IMPLEMENTATION are re-run against committed code is an orchestrator routing question, not decided here.
- Unconfirmed owner answers the design builds on, unchanged: OD-23 (b), Spec Q-D (deleting 8 spec files; they are in fact gone), OD-21 (a), OD-25 (i), and now OD-26 to OD-32 defaults.

## Non-blocking findings

- **N1 — downstream records still treat T51 as open.** `docs/catalog/US-9.1-pipeline-status.md` lines 38, 60, 121 list T51 as "PENDING, owner-run, outside the gate"; the test artifacts (matrix v4, strategy, generation report), the verification, gate and implementation reports and the reconciliation report are stale against Spec v8 (impact v6 lists them). Plan v7 correctly delegates this to those stages; they must be refreshed, and RECONCILIATION must report AC-11 / AC-12 as waived and unmeasured, never as passed.
- **N2 — clock anomaly.** `impact_analysis` v6 front matter says `updated_at: 2026-10-19T16:20:00Z`, later than plan v7 (15:13:31Z), breakdown v6 (15:15:59Z) and the history event recording the stage (15:13:23Z). Cosmetic; flagged by the planner itself.
- **N3 — "five deleted modules" is four non-spec files** (carried from review v5 N2). Plan Files list "Delete (5 modules + 8 specs)" and breakdown P10 / T48 / T49 say five; `git ls-files` shows no deleted-module path remains, so nothing fails, but the count is wrong. The non-spec scan clean result holds: `git grep` of the widened token set over `src tools server` excluding `*.spec.ts` returns nothing (rc 1); the only tracked files with `operator-notes` in the path are three new absence pins (`app.component.no-operator-notes.spec.ts`, `content-orchestrator.stray-operator-notes.spec.ts`, `test/operator-notes-source-scan.spec.ts`).
- **N4 — T45 comment range** "374 to 378" (carried N4) is off by one against the real paragraph (374 to 377); moot, the task is committed (`19ed848`, 6 deletions) and the oracle (diff equals the two FR-14 lines) holds.
- **N5 — P2 / P3 / P4 "whitespace-collapsed"** (carried N5): moot now that the pins exist; RECONCILIATION should confirm the committed pins collapse whitespace.
- **N6 — carried unchanged:** the 130-character STOP figure (measured), T47 `angular` track by `src/utils`, the source-scan pin beyond FR-44's five items, FR-44.3 proven by absence of reading code, the `sourcesFor` observation point, the `masterPromptBlocks` windows (R6), Q-D and OD-23 (b) unconfirmed (R3, R10). Spec review v8 N1 (FR-32 D-10 live-run wording leftover) is a Specification matter and does not affect the plan.

## Evidence

Commands run in this review (real output, abbreviated):

- `git rev-parse --short HEAD` = `313f727`; `git merge-base HEAD origin/main` = `6546db8`; `git status --short`: only `docs/` files modified.
- `git diff --stat 313f727 -- src tools server test .arch-guard-checksums`: empty. `git diff --stat 6546db8 -- src/app/types.ts src/app/app.component.ts src/app/app.component.html`: empty.
- `git diff -U0 6546db8 -- src/services/content-orchestrator.service.ts`: exactly the two FR-14 line pairs. `git diff -U0 6546db8 -- src/prompts/task-a.ts`: hunks at 29, 105, 121 only. `git diff -U0 6546db8 -- src/prompt-core/master-system-prompt.ts`: hunks at 1, 87, 391, 430, 440, 460 (none in `[SOURCE FIDELITY]`).
- `git diff --numstat 09f87dc -- test/fixtures/golden/full-description-prompts.json`: `10 10`; `grep -c "Operator Notes"` on it: `0`.
- `git grep -l -i -E "operator[ _-]?notes?|--notes-(usage|test|previous|limitations)|notes(UsageScenarios|TestResults|PreviousGenerationComparison|Limitations)" -- src tools server ':!*.spec.ts'`: no output (rc 1).
- `git diff 09f87dc --name-only` over `description-metrics.spec.ts`, `master-system-prompt.liveliness.spec.ts`, and over `server src/domain src/render output-validator.ts task-a-doc.ts task-c.ts optimizer.ts history.service.ts` (non-spec): no output.
- `git show --stat` of `fd9b052`, `439cc1e`, `19ed848`, `4556cb4`, `291bc1e`, `bad5161`, `86b0d62`: each touches only its task's files (`fd9b052`: checksums + master + golden; `439cc1e`: checksums + `task-a.ts`).
- `bash arch-guard.sh`: ALL CHECKS PASSED.
- `grep -i` for live-run / T51 / measured / passed wording over plan v7 and breakdown v6: all hits classified in section 1.
- Read in full: plan v7 (499 lines), breakdown v6 (687 lines), review v5; read the relevant parts of Spec v8 (header, v8 revision note, FR-34, FR-35, Out of scope, OD-26 to OD-32, traceability) and the impact v6 stale-document list; `docs/workflow/history.jsonl` last eight events and `workflow-state.yaml` (`current_stage: PLAN_REVIEW`).
- Not run: `npm run lint`, `npm test`, `npm run build` (documents reviewed against the tree; the gate belongs to QUALITY_GATE).
