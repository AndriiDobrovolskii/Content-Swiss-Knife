---
artifact: plan_review
story: US-5.1
version: 8
status: ARCHIVED
owner: so-plan-reviewer
created_at: 2026-10-04T05:30:00Z
updated_at: 2026-10-04T06:30:00Z
supersedes: docs/reviews/plans/US-5.1-plan-review.md#7
inputs_consumed:
  - key: specification
    version: 9
  - key: impact_analysis
    version: 3
  - key: implementation_plan
    version: 6
  - key: task_breakdown
    version: 8
open_decisions_blocking: false
---

# Plan Review (v8, eighth pass): US-5.1 - Replace `[file-name.ext]` markers with the matching uploaded image

**Verdict:** PASS
**Loop-back:** n/a

> `PASS` here is **not** human approval. Only `/so:approve` records that (AGENTS.md section 10).

Re-review after the second loop-back. Inputs: Specification v9 (APPROVED), Impact v3, Plan v6, Task breakdown v8. B-3 and B-4 were
re-verified against the working tree (branch `docs/US-4.1-archive`, HEAD `ef08509`), not taken from the breakdown's claims.

## Summary

Both blocking findings of v7 are fixed, and the restructuring (T2/T14/T15/T16 retired, T2 merged into T8, order
T0,T4,T1,T3,T5..T13, single owner for spec and fixture edits) introduces no blocking defect. Every task can end in one green commit
on its own staged contents, dependencies compile in the stated order, the frozen-file edits and their checksum rows are in the single
T11 commit, and no task asks the builder to edit a test. Remaining items are non-blocking and for the human gate.

## B-3 / B-4 re-verification (independent)

| Prior finding | Evidence checked in the tree | Result |
|---|---|---|
| B-3 T9 not green | At HEAD `content-orchestrator.service.ts` does not import the step modules (the wiring is the uncommitted 138-line diff, committed only by T10). `content-orchestrator.image-placeholder.spec.ts` is untracked and committed whole by T10; it stubs prompts (`systemBlocks: 'master'/'task'`), so it does not need T11. So at T9 no committed spec asserts the old caption derivation; T9's four step specs plus `test/fixtures/image-placeholder/` are self-contained (their only imports are the leaf modules, `image-figure`, T1 types, T4 fields, T8 style). T10 holds the `numericFidelitySources` widening and the numeric-grounding case (a) in the same commit and names it in its acceptance | **fixed** |
| B-4 landing baseline | Stage order HUMAN_PLAN_APPROVAL -> TEST_WRITING -> IMPLEMENTATION confirmed by the dependency of the design. v8 drops the "land v5, then rework" two-step: the builder never lands v5 content; untracked specs and fixtures are committed whole, once, by the last task with a case in them; tracked shared specs (`task-a.spec.ts`, `task-a-doc.spec.ts`) are touched only by T11 (git diff hunks at `:15` and `:236` both belong to T11), so `git add -p` has a real baseline. Untracked-file ownership re-derived from `git status`: T1 (`description-doc.hook-cta-extra.spec`), T3 (`hook-cta-extra-validators.spec`), T8 (`render-description.hook-cta-extra.spec`), T9 (four step specs, fixtures dir), T10 (orchestrator spec), T11 (`task-a.import-cycle`, `master-system-prompt.image-markers`); no file belongs to two tasks and none is orphaned. Specs in T1/T3/T8 import only tracked fixtures (`v4-docs`, `simplified-docs`) | **fixed** |

Stash proof feasibility: `git stash push --keep-index --include-untracked` leaves the index (including staged untracked files) in the
tree and removes everything else, so frozen files revert to HEAD. I checked that the committed baseline is consistent with HEAD
(a detached worktree of HEAD hashes `task-a.ts`, `task-c.ts`, `master-system-prompt.ts` equal to the `.arch-guard-checksums` rows),
so `bash arch-guard.sh` is green on the staged tree of T1..T10 and moves only at T11. See N-2 for the pop-ordering caveat.

## 1. Specification coverage (re-derived, both directions)

| Requirement | Reached by task(s) | Verdict |
|---|---|---|
| FR-1, FR-3, FR-5, FR-6, FR-10, FR-11 | T9 (with T1, T3, T8) | covered |
| FR-2, FR-4 | T4, T9 | covered |
| FR-7, FR-8, FR-9, FR-12, FR-17, FR-18 | T9, T10 | covered |
| FR-13, FR-14, FR-15, FR-16 | T8, T9 | covered |
| FR-19, FR-20 | T11, T13 | covered |
| FR-21 | T4, T5, T6, T9, T10 | covered |
| FR-22 | T8, T11, T12 | covered |
| NFR-1..NFR-12 | T1..T13 per breakdown, re-derived and consistent | covered |
| AC-1..AC-6; AC-9 (a)..(o) (the Spec's traceability matrix rows) | via the FRs above; (k) T11 with T4; (l)(m)(n)(o) T8, T11, T13 | covered |

| Task | Traces to | Verdict |
|---|---|---|
| T0 | harness precondition (branch), no plan item | acceptable |
| T1, T3 | D1 | ok |
| T4 | D1, D5, D8 | ok |
| T5, T6, T7 | D5, D9 | ok |
| T8 | D1, D6, D8 | ok |
| T9 | D4 | ok |
| T10 | D7 | ok |
| T11 | D3, D6, D8 | ok |
| T12 | D6, OI-3 (conditional) | ok |
| T13 | D3, section 4 | ok |

Scope creep checked against the Specification *Out of scope* by name (Task B/C, `output-validator.ts`, other master-prompt lines,
per-locale resolution, translation prompts, store enrolment, video figures, non-marker label rules, meta/attribute markers, relaxed
matching, AGENTS.md edit without confirmation): none touched; `server/providers/openai.js` is required by NFR-12 (OI-5). Clear.

## 2. FROZEN files (AGENTS.md section 9)

| Task | Frozen file touched | Section 9 stop present? | Sibling-file pattern used? | Verdict |
|---|---|---|---|---|
| T11 | `src/prompts/task-a.ts` (A1, 17/1), `src/prompt-core/master-system-prompt.ts` (A1 3/0 plus A2 two example lines, +5/-2) | yes: cites A1 and A2 records, content-identified diffs, both checksum rows in the same commit, any other frozen file or extra line is a new stop | n/a | ok |
| all others | none; `task-b.ts`, `task-c.ts`, `output-validator.ts` not edited | stated | n/a | ok |

Plan assumes approval it does not have: no. Tree facts match the claims: `git diff HEAD --numstat` shows `task-a.ts` 18 changed lines
(17/1), `master-system-prompt.ts` 3 added, `.arch-guard-checksums` exactly two rows. Checksum pairing: T11 is the only task that
rebaselines; T10 and T13 assert an empty or read-only checksum diff. T9 imports nothing frozen; T10 imports the leaf and step modules
only (`task-a.ts` is reached through the existing `buildPromptA` call, which already exists at HEAD).

## 3. Architecture rules (AGENTS.md section 3)

| Rule | Checked | Finding |
|---|---|---|
| 1 - no direct SDK outside `server/providers/` | T7 edits a provider only | clear |
| **2 - retrieval separate from generation** | read deliberately; no task touches Serper or fetch; Vision is image analysis; the marker step is deterministic post-generation | clear |
| 3 - prompt text out of services | prompt text only in `task-a.ts`, master prompt, `vision-prepass.ts`; the orchestrator keeps the existing import-only pattern | clear |
| 4 - no key in the bundle | none added | clear |
| 5 - no existing feature broken | no-marker byte identity (AC-9b), optional manifest fields, tolerant parse; every intermediate commit is green by construction | clear |
| `STORE_REGISTRY` sole source | `cyrillicCheck` from the master-locale constant, no literal | clear |
| `systemBlocks` not collapsed | marker data only in uncached `userContent`; AC-9k sentinel case | clear |

## 4. prompt -> schema -> renderer -> validator

- Links touched: Vision contract and prompt (T4, T5), manifest type (T4), carriers (T1), validators (T3), renderer and style (T8),
  builder and steps (T9), orchestrator (T10), Task A and master prompt (T11).
- Stay in agreement: yes.
- Contract-before-consumer ordering holds: yes. Linear order T0, T4, T1, T3, T5, T6, T7, T8, T9, T10, T11 respects every declared
  edge (T1 before T3 and T8; T4 before T5, T6, T9, T11; T8 before T9 and T11; T9 before T10 and T11). The declared graph now carries
  the previously missing edges (v7 N-1).
- Section 4 criteria the renderer must keep satisfying, list complete: yes (AC-3 and AC-9 g, l, m, n, o cover figure, img, figcaption,
  `max-content`, lazy/eager).

## 5. Task quality

| Check | Result |
|---|---|
| All eight fields present on every task | yes (T0..T13; T0 and T13 state no files, T12 conditional) |
| Acceptance checks observable | yes, each names a command or assertion; T11 checks against HEAD with real output |
| Each task could end in one green commit (section 13) | yes: verified for T1, T3, T8, T9, T10, T11 against the tree; T4..T7 touch only tracked files with optional additions |
| No task spans two tracks | ok (T12 `prompt` is a stated convention for a docs edit; T0 and T13 write nothing) |
| Ordered by dependency and risk, riskiest first, rationale stated | yes: T0 precondition, then T4 (the one new upstream assumption) |
| Fixture updates sit with the change that moves them | yes: corpus and style pins with T8, golden and fixture header with the prompt change in T11 |

## 6. Test strategy

| Check | Result |
|---|---|
| Every task names test files and runner | yes, all `test:logic`; `round-trip.spec.ts` in the logic runner |
| Component specs named `*.component.spec.ts` | n/a (no component spec added) |
| Untested tasks justify changing no behaviour | T0, T12, T13 do; T6 relies on the T4 helper spec and the existing app specs (see N-4) |
| Failure paths from the FRs are covered | yes (dropped marker, exhaustion, schema-invalid, malformed Vision fields, ungrounded numbers) |
| Nothing relies on weakening/skipping a test (7.7) | yes; the builder edits no spec or fixture; v7 N-2 is resolved by the single-owner rule |

AGENTS.md 7.7 / builder-does-not-edit-tests: every spec and fixture edit is attributed to TEST_WRITING. The only builder-authored
non-source writes are the prompt golden regenerated from the prompt and the `.arch-guard-checksums` rebaseline, both mechanical
generated artefacts that cannot exist before the frozen edit (T11 requires byte-equality with any golden TEST_WRITING already left
and a defined diff review); see N-3.

## 7. Impact-analysis fidelity

- Plan consumed the survey rather than re-deriving it: yes.
- Files touched but not surveyed: `server/providers/openai.js` and `test/openai-provider.spec.ts` (plan-documented, NFR-12, OI-5);
  scope that follows from the Specification, not a survey gap. No loop-back to IMPACT_ANALYSIS.

## Verdict rationale

No blocking defect remains. The v8 decomposition is internally consistent with the tree and with the pipeline stage order; the
remaining items are procedural cautions or decisions that belong to the human at HUMAN_PLAN_APPROVAL.

## Non-blocking findings

- N-1 (HQ-1) Base branch: HEAD `ef08509` exists only on `docs/US-4.1-archive`; the human should name the base before T0.
- N-2 Stash proof ordering: the procedure says stage, stash, test, `git stash pop`, but does not say whether the commit comes before
  the pop. Popping while the index holds staged tracked-file changes can conflict with the stash's superset of the same files; the
  safer order is commit first, then pop. Also the stash temporarily removes tracked and untracked `docs/**` workflow files, so it must
  not run while the orchestrator is writing state. The builder should state the order in its report. Not a plan defect.
- N-3 (7.7) T11 has the builder regenerate the golden and rebaseline checksums. This is consistent with the repository precedent and
  guarded by the diff review (12 keys, exactly 10 differ, only `systemBlocks[0].text`), but the human should confirm that regenerating
  a test fixture from the approved frozen prompt does not count as a builder edit of a test.
- N-4 T6 has no test that drives `analyzeGenImages`; the unit proof is the T4 helper spec. Acknowledged by the breakdown; low risk.
- N-5 (OI-1) Q-D/FR-19 same-section wording versus the plan's position; Specification v10 should align Q-D, FR-19, NFR-1.
- N-6 (OI-2) NFR-1 / AC-9 (f) "no existing line changed" versus one modified `task-a.ts` template line; human confirms.
- N-7 (OI-3, OI-5) T12 stays conditional until OI-3 is answered; `server/providers/openai.js` 300 -> 1000 is flagged for the human.
- N-8 (OI-4, OI-6..OI-9, HQ-2) Plan positions with stated reasons; none is blocking.
- N-9 The pipeline-status v5 finding (split hook measured under path `hook`, `doc-block-repair.ts` unedited) is not addressed by any
  task; the human should know.
