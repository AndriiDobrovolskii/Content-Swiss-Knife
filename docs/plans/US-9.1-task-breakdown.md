---
artifact: task_breakdown
story: US-9.1
version: 6
status: ARCHIVED
owner: so-implementation-planner
created_at: 2026-10-17T16:41:00Z
updated_at: 2026-10-19T15:15:59Z
supersedes: docs/plans/US-9.1-task-breakdown.md#5
inputs_consumed:
  - key: story
    version: 6
  - key: specification
    version: 8
  - key: impact_analysis
    version: 6
  - key: implementation_plan
    version: 7
open_decisions_blocking: false
---

# Task breakdown: US-9.1 (no picture references, livelier descriptions) - removal of the withdrawn operator-notes feature

> **Revision note, v5 to v6 (after Specification v8 / Plan v7: the owner's WAIVER of the AC-11 / AC-12 hard script criteria, Story v6,
> 2026-10-19; not measured).** Only what the waiver requires is revised. Task ids, order, dependencies, the definitions of T43 to T50, the
> FROZEN STOP tasks (T43, T44), the plan's coupling constraints and handles P0 to P14 are UNCHANGED (T43 to T49 are DONE and committed,
> `1b73c8a` to `313f727`; T50 is verification only). Nothing is renumbered.
> - **T51 is SUPERSEDED by the waiver** (Plan v7, OD-32 default): it is not pending, not manual, not executed, not replaced by another task and
>   not a blocking item. Its section keeps the id and is marked SUPERSEDED. No live run is required, planned or evidenced.
> - **Task count and summary lines** (header summary, Id handling, Execution order, Parallelisable group): 8 active tasks (T43 to T50) plus
>   1 superseded (T51); the "manual 1 (T51, outside the gate)" track entry and the "T49 (and T50) --> T51" edge are removed.
> - **Trace rows.** In the Requirement / acceptance criterion table, AC-11 and AC-12 now carry the status **WAIVED (not measured)** and point
>   at no task (T51 superseded; the old pointers to T51 "(live)" and to T47 / T50 as live-run support are removed: T47 serves AC-10 only).
>   The plan-item risk row maps **R5** to no task: R5 is now only a disclosure risk (Plan v7), carried by the downstream records.
>   Validation rows 13 and 14 (AC-11, AC-12; WAIVED) are mapped to no task.
> - **Findings.** F1 (version), F4 and F5 are brought current; F11 records the waiver and who discloses it.
> - Nothing here grants a waiver, resolves an Open Decision (OD-26 to OD-32 remain PROPOSED DEFAULTS), edits the Specification or the plan,
>   decides architecture, or writes a test or code.

> **Revision note, v4 to v5 (after PLAN_REVIEW v4, `CHANGES_REQUIRED`, and the plan's revision to v6).** Task ids, order, dependencies,
> FROZEN STOP tasks (T43 master, T44 `task-a.ts`, both with `--rebaseline`) and the plan's coupling constraints are UNCHANGED. Only the
> task-owned review items are fixed; handles are NOT renumbered (P14 is appended):
> - **B1, golden ownership.** P2 is the oracle pin only (RED on arrival); the golden `full-description-prompts.json` is no longer in
>   TEST_WRITING's remit. T43 regenerates it in the same commit as the master revert; the "unless already substituted by TEST_WRITING"
>   hedge is gone (T43 What changes / Files; finding F2 rewritten).
> - **B2, the red window.** P3 and P4 invert EXISTING green tests; they precede T43 (TEST_WRITING precedes IMPLEMENTATION) and are red by
>   design until it. Only master + golden co-commit in T43 (P3, P4, Reading guide 3, T43, finding F3 rewritten).
> - **B3 (tasks part), source-scan tokens.** P10 now carries the plan v6 widened token set; the stale four-token set and the sentence
>   placing the tokens "in `tools/measure-description.ts` and `description-metrics.ts`" are replaced. T47 and T49 checks use the widened
>   set. P8 stays the behavioural pin for the flags.
> - **B4.** The title-only edits of `description-metrics.spec.ts` and `master-system-prompt.liveliness.spec.ts` are dropped: neither file is
>   touched (P0, T50 check).
> - **B5.** New handle P14: TEST_WRITING records the four corrected spec readings in the `ac_test_matrix` and the `test_strategy`. The
>   "compiles before and after T49" cast constraint is now stated on every handle that attaches a stray `operatorNotes` property (P5, P6,
>   P7, P9a).
>
> **Change note, v3 to v4.** v3 (APPROVED, 42 tasks T1 to T42) decomposed the ADDITIVE feature of Story v4 / Specification v5 / Plan v4.
> The owner withdrew the operator-notes feature (Story v5, 2026-10-19); Specification v7 is APPROVED and Plan v5 is the design of its
> REMOVAL. v3 is stale for everything about operator notes. What survives from v3 is only history: T1 to T42 are DONE or dropped on the
> branch (`docs/catalog/US-9.1-pipeline-status.md`, round 3, last commit `d5d207a`), apart from the manual T36 and T42.
>
> **Id handling (explicit, so that "T21 done" in the pipeline status keeps meaning what it meant).** The ids T1 to T42 are RETIRED and are
> not reused. The tasks of this breakdown are **T43 to T50**; T51 keeps its id but is SUPERSEDED (see its section). Map of the retired ids whose work this breakdown undoes:
> T8 (`ProductInput.operatorNotes`, `28ba099`) -> T49; T9 (leaf module, `1a335c7`) -> T48; T10 (orchestrator sources, `46d9a15`) -> T45;
> T11, T12, T13, T38, T39, T40 (component, fields, spread, restore, clear, state class: `9176be3`, `9472ade`, `6033a80`, `510604c`, `fe29f88`,
> `24bee59`) -> T46; T21 (`task-a.ts` T-A4, `7397081`) -> T44; T31 (master M6, `6db2885`) -> T43; the `--notes-*` part of T35 -> T47;
> manual T36 (live acceptance runs) -> T51, which is SUPERSEDED by the AC-11 / AC-12 waiver (nothing replaces it). Every other v3 task (FR-1 to FR-23, FR-27, FR-32 to FR-39 work) is committed, unchanged by
> Specification v7, and is NOT rebuilt: it stays reachable through the stay-green lists of T43 to T49 and the sweep T50.
>
> Task count: **8 active** (T43 to T50) **plus 1 superseded** (T51, by the owner's AC-11 / AC-12 waiver; not counted in any track).
> Tracks: prompt 4 (T43, T44, T48, T50), angular 4 (T45, T46, T47, T49).
> Committing tasks: 7 (T43 to T49). T50 is verification only (no commit). T51 is SUPERSEDED (no execution, no commit). FROZEN-file tasks: **2** (T43, T44), both explicit
> STOP tasks. Nothing here grants a FROZEN approval, resolves an Open Decision, edits the Specification, or writes a test or code.

## Reading guide

1. **Base.** Every "base" below is `6546db8` (plan "Specification inaccuracies" item 1: the Specification's `120dcbc` is the merge base with a
   stale local `main`; read it as "the branch base"). `git merge-base --is-ancestor 6546db8 HEAD` must exit 0. Net-diff oracles are
   `git diff 6546db8 -- <file>`; the removal returns five files to their base bytes.
2. **Direction.** A removal reverses contract-before-consumer: a CONSUMER stops using a module or type, then the module or type goes. The
   order is therefore: frozen readers and consumers first (T43 to T47), then the leaf module (T48), then the type (T49).
3. **Per-task gate (carried from v3, Reading guide item 3; surfaced to the human at HUMAN_PLAN_APPROVAL).** The tests of the whole Story
   exist before T43 (AGENTS.md section 5), and several are RED until their owner task lands. **The sanctioned red window (plan v6):**
   P3 and P4 INVERT EXISTING green tests (T31; R22 and the optimizer master-reach block), so the TEST_WRITING commit turns pre-existing
   tests red; they precede T43 and stay red by design until T43 reverts the master. Every other red test in the window is a NEW pin. Nothing
   else may go red. A task is **gate-green** when: (a) every test it
   owns passes; (b) nothing that passed before it fails after it, in both runners; (c) full `npm run lint` (`tsc --noEmit` over `src/**`,
   `test/**`) reports ZERO diagnostics at every task (the removal creates no new symbol, so no missing-symbol exemption is legitimate; a spec that
   stops compiling because of an uncast stray property is a failure of the task that removed the property); (d) `bash arch-guard.sh` exits 0;
   (e) `git diff` lists only the task's Files. The QUALITY_GATE stage proves the full DoD (lint, both runners, coverage, build) after the last
   task. Each task is one commit (AGENTS.md section 13); no history rewrite, no force-push; `09f87dc` stays an ancestor (NFR-13).
4. **FROZEN tasks are STOP tasks (AGENTS.md section 9).** T43 and T44 edit a FROZEN file. Their first step is the STOP: the builder does not
   open the file for editing; it reports the exact change and its reason (the text in the task) and waits for the owner's own words
   **"modify [filename]" for that file, said in the builder's editing session**. What does NOT count: plan approval, the HUMAN_SPEC_APPROVAL
   comment, and the 2026-10-19 history event ("modify ... task-a.ts ... master-system-prompt.ts, path 1"). The plan builds on OD-25 default
   (i): that instruction covers the withdrawal hunks only, and it is restated per file in the editing session. Any hunk outside the one named
   in the task STOPS the work again. After an approved edit: `bash arch-guard.sh --rebaseline`, then a clean `bash arch-guard.sh`, and
   `.arch-guard-checksums` goes into the same commit; that file's diff must move exactly ONE line (the edited file's). A moved `task-b.ts`,
   `task-c.ts` or `output-validator.ts` line is a finding.
5. **Refusal rule (plan "FROZEN-file position" item 4; AGENTS.md section 7.7).** If an instruction is withheld: the tests that assert the
   reverted state STAY RED; the builder never deletes, skips, loosens or rewrites a test to pass a gate; the scope decision is the human's;
   the work returns to the plan. Refusing T43 leaves a master that names a block nothing emits. **Refusing T44 blocks T48 and T49** (the
   frozen interpolation still reads `input.operatorNotes` and imports `operator-notes.ts`), so the removal cannot complete.
6. **Two frozen commits are one-at-a-time, in either order.** T43 and T44 both rewrite `.arch-guard-checksums`, so they are never in the same
   commit and never run concurrently, but neither depends on the other: whichever file the owner approves first is committed first and the other
   rebaselines on top of it (each commit's checksum diff still moves exactly one line). A pending master approval therefore does not stall T44,
   T48 or T49. T43 stays the suggested first task for the risk-first reason below. The human may ask for both STOPs in one session.
7. **Test files are never edited by the builder** (AGENTS.md section 7.7). A test the task cannot turn green without editing it returns to
   TEST_WRITING. Test file names are TEST_WRITING's; the handles P1 to P14 below are this breakdown's labels.
8. **Runners.** `test:logic` = `vitest run` (`npx vitest run <path>` for one file); `test:components` = `ng test` (`*.component.spec.ts`).
   Track note: `tools/` belongs to none of the three track directories; T47 is `angular` because v3 gave the same script work (`tools/measure-description.ts`,
   `src/utils/description-metrics.ts`) that track.
9. **Intermediate branch states are not shippable and are not pushed here.** Between T43 and T49 the branch can hold a UI that collects notes
   while the master no longer names the block (or the reverse). Draft PR #142 is not touched; any remote write is so-pr-creator on a separate
   human instruction (AGENTS.md section 7 item 10).

## Must exist before IMPLEMENTATION (TEST_WRITING owns every row; the builder never writes or edits them)

The tests of the removal are written first and left failing where they assert the absent state (AGENTS.md section 5). The breakdown names
them so that every task can say which of them it turns green. "Stay green" rows are green on arrival and must remain green through every task.

| Handle | What must exist (plan item) | State on arrival | Turned green / guarded by |
|---|---|---|---|
| P0 | Whole-file deletion of the 8 dedicated specs (W7; 7 logic runner, 1 component runner) so that no spec imports a deleted module: `operator-notes.spec.ts`, `task-a.operator-notes.spec.ts`, `master-system-prompt.operator-notes.spec.ts`, `content-orchestrator.operator-notes.spec.ts`, `history.service.operator-notes.spec.ts`, `app.component.operator-notes.spec.ts`, `operator-notes-form-state.spec.ts`, `operator-notes-fields.component.spec.ts`. Edits that remove the `withNotes` cast helper and `EMPTY_NOTES` block of `task-a.user-content.golden.spec.ts` (Tier A / Tier B body stays), the notes-flag contract and three positive tests of `test/measure-description.cli.spec.ts`, the stray-property cast case of `task-a-doc.figure-placement.spec.ts`; comment line 17 of `test/fixtures/task-a-user-content-inputs.ts`. **NOT touched (B4, plan W7 / rejected alternative 13):** `src/utils/description-metrics.spec.ts` and `src/prompt-core/master-system-prompt.liveliness.spec.ts` (their stale titles are harmless and NFR-14 protects tests of surviving requirements); an edit to either is a finding unless the human grants it as an explicit NFR-14 exception at the plan gate | done before T43 | prerequisite for T45 to T49 (lint must not break) |
| P1 | FR-42 / FR-44 item 1: the FR-42 Assert-present literals (`the provided [Raw Description], [Technical Specs] or [Supplemental Content]`, `scan the three input blocks for numbers that describe the SAME quantity`) and Assert-absent (`Operator Notes`, `operatorNotes`, `the input blocks you were given`) over `MASTER_SYSTEM_PROMPT`, written as literals in the test | RED | T43 |
| P2 | FR-43 **oracle pin only** (B1): a test that reads `test/fixtures/golden/full-description-prompts.json` as data and asserts that `systemBlocks[0]` of the ten cases holds the FR-42 Assert-present literals and contains no `Operator Notes`; the literals are written in the test (source: the `6546db8` blob and the Specification), not copied from output. **The golden JSON itself is NOT TEST_WRITING's and is not written, substituted or committed by TEST_WRITING**; the builder regenerates it in T43 in the same commit as the master revert (plan W6). The "new equals old with the two bullets replaced" comparison is not a persistent spec (the old text leaves the tree at T43); it is T43 / T50 acceptance evidence. The surviving `full-description.golden.spec.ts` (byte equality with the live master) is NOT edited and stays green until T43 | RED on arrival (the golden is not yet moved) | T43 |
| P3 | `full-description.golden.us91.spec.ts` T31 (lines 114 to 117) INVERTED to the FR-42 literals over the ten cases; line 128 stays. **Inverts an EXISTING green test**; written by TEST_WRITING, so it PRECEDES T43 and is red by design until T43 (the sanctioned red window, Reading guide 3, finding F3) | RED | T43 |
| P4 | `task-c.master-reach.spec.ts` (R22, 16 pairs) and `optimizer.master-reach.spec.ts` INVERTED: block 0 does not contain `Operator Notes`; block 1 and `userContent` still do not; headers updated. **Inverts EXISTING green tests**; precedes T43, red by design until T43 (as P3) | RED | T43 |
| P5 | FR-44 item 2: for every FR-27 input (Tier A, Tier B, Doc wrapper with and without `hookPattern`) `userContent` has no `[Operator Notes]`; an input with a stray `operatorNotes` property gives a `buildPromptA` and a `buildPromptADoc` payload byte-identical to the same input without it. **Cast constraint (compiles before AND after T49):** the stray property is attached through a cast through `unknown` (for example `as unknown as ProductInput` built from a `Record<string, unknown>`), never through a typed literal, so the spec compiles both while `ProductInput.operatorNotes` exists and after T49 removes it; otherwise `npm run lint` breaks in one of the two states | RED (stray non-empty value) | T44 |
| P6 | FR-44 item 4.1: `sourcesFor` harness carried over (`bootOrchestrator` + private-method cast) into a surviving spec; stray `operatorNotes` value `777 Вт`, an input whose specs/description/name hold a number but not 777, a figure whose alt/figcaption states `777 Вт`; asserts `alt-numeric-not-grounded` naming `777` and a sources string equal to the run without the stray property. **Cast constraint (compiles before AND after T49):** the stray property is attached through `unknown` (the carried-over `withNotes` helper at `content-orchestrator.operator-notes.spec.ts` line 60 already does; keep that form), never a typed literal | RED | T45 |
| P7 | FR-44 item 4.2: `runGenerate` / `runUa` with `supplementalContent: undefined` and a stray non-blank `operatorNotes`, store by store: `faqCalls(mock)` empty and equal to the no-property run; the HEAD describe at `content-orchestrator.simplified.spec.ts` line 322 passes unmodified. **Cast constraint (compiles before AND after T49):** the stray property is attached through `unknown`, never a typed literal | green on arrival (no FAQ trigger ever read the notes) | stay green T45 to T49 |
| P8 | FR-44 item 5: spawn test (`process.execPath`) with each of the four `--notes-*` flags plus valid `--html` / `--input`: status 2, stderr contains `unknown argument "<flag>"`, no report on stdout, usage text lists none of the four names. **The behavioural pin for the flags** (P10 is only the textual pin for their remnants) | RED | T47 |
| P9 | FR-44 item 3: (a) `HistoryService` (via `Object.create(HistoryService.prototype)`) restores a stored entry that carries `operatorNotes` without error; (b) source pins that `restoreHistory` and `buildGeneratorInput` in `app.component.ts` name no `operatorNotes` (honest limit: no `AppComponent` TestBed, plan W8 item 3). **Cast constraint on (a) (P9a; compiles before AND after T49):** the stored entry with `operatorNotes` is built through `unknown` (the `baseInput(over: Record<string, unknown>) ... as unknown as ProductInput` helper of `history.service.operator-notes.spec.ts` line 33 already does), never a typed literal | (a) green on arrival; (b) RED | (a) stay green; (b) T46 |
| P10 | Source-scan pin (plan W8 addition): non-spec `src/**` (`.ts`, `.html`), `tools/**`, `server/**` hold no match of the plan v6 **widened token set, case-insensitive, one pattern per bullet:** (1) `operator[ _-]?notes?` (covers `operatorNotes`, `OperatorNotes`, `operator-notes`, `Operator Notes` and the lowercase prose "operator notes"); (2) `--notes-(usage\|test\|previous\|limitations)`; (3) `notes(UsageScenarios\|TestResults\|PreviousGenerationComparison\|Limitations)`; plus `existsSync` false for the five deleted modules. It excludes `*.spec.ts` and `test/` because the absence pins carry the literals. The widened set (not the v4 four-token set, which matched nothing in `tools/measure-description.ts` or `description-metrics.ts` and was vacuous for T47) is what makes the `tools/` and metrics blocks able to fail: per the plan it hits `description-metrics.ts` line 40 and `tools/measure-description.ts` lines 9, 10, 14, 34 to 37, 40, 43, 44 at HEAD, hits exactly the 12 files this removal edits or deletes, and returns zero hits against `6546db8`. If TEST_WRITING splits it into per-file blocks, each block is owned by the task that edits that file | RED | T43 (master block), T44 (`task-a.ts` block), T45 (orchestrator), T46 (form files, `app.component.*`), T47 (`tools/measure-description.ts` and `description-metrics.ts` blocks), T48 (`operator-notes.ts` file and `existsSync`), T49 (`types.ts`; owns the full scan, fully green after T49) |
| P11 | `NUMERIC_SOURCE_FIDELITY_RULES` byte pin (sha256 `4d18ed53...`, length 1776) RELOCATED unchanged to a surviving spec, with the move cited in its commit (plan W7, R11) | green on arrival | stay green T45 to T49 |
| P12 | `US91_MASTER_LITERALS` without `'[Operator Notes]'`, the `arrayContaining` entry dropped and the title fixed, `>= 11` become `>= 10` (`test/fixtures/faq-pipeline.ts`, `test/faq-pipeline.master-leak.spec.ts`; the two move together, W5.6). Independent of the master's content: it pins the detector's own list | green on arrival | stay green T43 to T49 |
| P13 | Re-verification, not edits (plan validation row 9): `task-c.description-bytes` (JSON byte-unchanged), `payload-oracle.d15`, `master-system-prompt.image-markers` property 6, the `faq-pipeline.ts` `masterPromptBlocks` windows (`slice(0,400)`, `slice(3000,3400)`: re-verify they still discriminate; extend, never narrow), `task-a.spec` AC-9b and cached-prefix-across-stores, `task-a-doc.spec` line 229, `app.component.template-wiring` / `faq-layout` / `export-guard` (the `clearAll()` slice regex) | green on arrival | stay green; named per task below |
| P14 | **Four corrected Specification readings (B5; plan "Recording obligation").** TEST_WRITING writes these into BOTH the `ac_test_matrix` and the `test_strategy`, each with its evidence command, because RECONCILIATION reads the Specification and the test artifacts, not the plan: (1) the branch base is `6546db8` (`git merge-base HEAD origin/main`), not `120dcbc` (the merge base with a stale local `main`), wherever the Specification says `120dcbc`; every net-diff oracle uses `6546db8`; (2) the FR-44 item 4.2 relied-on block is the successor `describe('R6 (human resolution) ...')` at line 322 of `src/services/content-orchestrator.simplified.spec.ts`, passing unmodified; (3) FR-43's count is 20 occurrences of `[Operator Notes]` on 10 lines of the golden, not "ten times" (the Assert-absent is on the string); (4) FR-43's "existing golden mechanism" is the plan's W6 procedure (the builder regenerates in the commit that moves the master; raw-text substitution; independent oracle; diff reviewed), because no regeneration tool is committed. Documentation handle: it changes no behaviour and has no test of its own | n/a (artifact content, present before IMPLEMENTATION) | no builder task; checked in T50 (the two artifacts hold the four readings) and read by RECONCILIATION |

## Execution order

```
T43 (master, FROZEN STOP)  |  T44 (task-a.ts, FROZEN STOP)   <- independent; one commit at a time (shared .arch-guard-checksums), either order
T45 (orchestrator) | T46 (form removal) | T47 (script)     <- mutually independent AND independent of T43/T44
T44 + T45 + T46 --> T48 (delete operator-notes.ts)
T48 + T47        --> T49 (types.ts to base bytes)
T43..T49         --> T50 (verification only, no commit)
T51              SUPERSEDED by the AC-11 / AC-12 waiver (Story v6): not in the order, no edge, nothing to run
```

**Parallelisable group:** T45, T46, T47 may run in any order or alongside T43/T44 (they touch disjoint files and no shared fixture);
they do not wait for either FROZEN approval. If the owner has not answered a STOP, T45 to T47 proceed and T48/T49 wait. Suggested linear
order: T43, T44, T45, T46, T47, T48, T49, T50 (T51 is superseded and not part of the order).

**Risk-first rationale.** T43 is first because it carries the plan's two least reversible exposures at once: the owner's per-file STOP under
the open OD-25 (if the scope answer differs, every later FROZEN assumption moves and the plan returns to its stage) and the only silent-failure
surface of the removal (R1, R4: a master hunk that is slightly wrong changes the Task C translation and optimizer prompts with no failing test
other than the golden and the FR-42 literals). Finding that out while nothing has been deleted is cheap; T44 follows because its refusal
would make T48/T49 impossible.

---

## T43 - Revert the master's two [SOURCE FIDELITY] bullets and regenerate the golden in the same commit (FROZEN STOP)

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | none (technical). Human: the owner's "modify src/prompt-core/master-system-prompt.ts" in the builder's session (OD-25 default (i)) |
| **FROZEN (AGENTS.md section 9)** | `src/prompt-core/master-system-prompt.ts` - this task MUST STOP and request approval before editing it |

### The STOP (what the builder puts to the owner, verbatim content)

- **Change:** one hunk, the reverse of `6db2885`. Set the `STRICT INPUT SCOPE` bullet to read "...to the provided [Raw Description], [Technical
  Specs] or [Supplemental Content]. Add nothing from outside knowledge..." and the `INTERNAL RECONCILIATION` bullet to read "(before writing):
  scan the three input blocks for numbers that describe the SAME quantity ..." - the `6546db8` bytes (FR-42, OD-21 option (a), a PROPOSED DEFAULT
  the owner has not answered). Nothing else in the file moves: the import (line 1), `${LIVELINESS_RULES}` (87 to 88) and the FR-5 to FR-9
  text (about 389 to 467) stay. Any other hunk stops the work again.
- **Why:** the master must not name an `[Operator Notes]` block that no prompt carries any more (FR-42), and Story v5 withdrew the feature.
- **Consequences the request must name (FR-42, FR-23, NFR-1):** this master is `systemBlocks[0]` of Task A (all 7 stores), of
  `buildPromptADoc`, of the `buildPromptC` description translation (96 guard cases + 3 golden `c/*` cases) and of the optimizer, so block 0 of all
  of them shrinks by **130 characters (134 bytes)**, a MEASURED figure (plan v6: master lines 48 to 54 at HEAD are 678 characters against lines 48 to 53 at
  `6546db8` = 548 characters; the bullets-region figure 1095 to 965 gives the same 130). The STOP text quotes this number, and after the edit the builder
  re-measures it on the actual result and states any difference. The Anthropic prompt cache is invalidated once more for all of them;
  10 of 12 `full-description-prompts.json` cases change at block 0; the `task-c.ts` checksum does NOT move (a file-level check cannot see this
  payload change); block 1, `userContent`, the FAQ variant and `buildTranslatePrompt` do not move.
- **Refusal:** Reading guide item 5. P1 to P4 stay red; the master keeps naming a block nothing emits.

### What changes

The master returns to the `6546db8` text in `[SOURCE FIDELITY]`, and the BUILDER regenerates `full-description-prompts.json` in this SAME commit (FR-43;
plan B1): the golden spec `full-description.golden.spec.ts` asserts byte equality with the live master, so master and golden must move together, and the
us91 / master-reach specs (P3, P4, inverted earlier by TEST_WRITING and red until this commit) assert the FR-42 literals (plan W5.5, AGENTS.md section 13).
The golden is the builder's alone: TEST_WRITING wrote only the oracle pin P2 and never committed the golden. It is produced by the plan's W6 raw-text
substitution (never parse/stringify, never `-u`): the JSON-escaped text of the two-bullet region of the CURRENT golden is replaced by the JSON-escaped
text of the same region taken from `git show 6546db8:src/prompt-core/master-system-prompt.ts`, by a throwaway scratchpad script that is not committed;
the procedure is recorded in the commit message. The "new block 0 equals old block 0 with the two bullets replaced by the FR-42 literals" comparison is
run once as a scripted diff before the commit and its output recorded in the implementation report (it cannot be a persistent spec, the old text leaves
the tree here).

### Files

| File | Change |
|---|---|
| `src/prompt-core/master-system-prompt.ts` | modify (FROZEN): the two bullets only |
| `.arch-guard-checksums` | modify: `bash arch-guard.sh --rebaseline`; exactly the master line moves |
| `test/fixtures/golden/full-description-prompts.json` | modify (W6, BUILDER-owned, same commit as the master); block 0 of the ten cases only |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| FR-42 / FR-44 item 1 literal pin (P1) | `test:logic` | FR-42, FR-44.1, AC-9 exclusion |
| source-scan block for `src/prompt-core/master-system-prompt.ts` (P10) | `test:logic` | FR-44 (no `Operator Notes` in non-spec source) |
| the FR-43 oracle pin over the regenerated golden (P2; RED on arrival, green when the builder regenerates the golden here) | `test:logic` | FR-43 |
| `src/prompts/full-description.golden.us91.spec.ts`, T31 inverted (P3; inverted EXISTING test, red by design since the TEST_WRITING commit) | `test:logic` | FR-42, FR-43, AC-2, AC-8 |
| `src/prompts/task-c.master-reach.spec.ts`, `src/prompts/optimizer.master-reach.spec.ts`, inverted (P4; inverted EXISTING tests, red by design since the TEST_WRITING commit) | `test:logic` | FR-42 consequence, FR-23, AC-8 |

Stay green (named, re-run; green BEFORE this task and AFTER it, which is why the golden moves with the master): `src/prompts/full-description.golden.spec.ts`
(byte equality of the golden with the live master; not edited), `task-c.description-bytes.spec.ts` with `task-c-description-prompts.json` byte-unchanged (it cannot show that the master
changed, R4), `payload-oracle.d15.spec.ts`, `master-system-prompt.image-markers.spec.ts` property 6, `master-system-prompt.no-picture-references.spec.ts`,
`master-system-prompt.liveliness.spec.ts`, `task-a.spec.ts` (AC-9b, cached prefix identical across stores), `task-a-doc.spec.ts`, `task-c.spec.ts`,
`task-c.faq.spec.ts`, `optimizer.spec.ts`, `protected-name-precedence.spec.ts`, `image-figure-style.prompt-examples.spec.ts`, the `faq-pipeline.ts`
`masterPromptBlocks` windows (P13: re-verify they still discriminate), P12.

### Acceptance check

- With the owner's per-file instruction recorded: `bash arch-guard.sh --rebaseline` then `bash arch-guard.sh` exit 0; `git diff HEAD~1 -- .arch-guard-checksums`
  changes exactly the `master-system-prompt.ts` line (the other four lines identical, `task-c.ts` still `619c45a9...`).
- `git diff 6546db8 -- src/prompt-core/master-system-prompt.ts` has zero hunks inside `[SOURCE FIDELITY]`; the only residual hunks are the import (line 1),
  `LIVELINESS_RULES` (87 to 88) and the FR-5 to FR-9 region.
- `git diff --numstat HEAD~1 -- test/fixtures/golden/full-description-prompts.json` reports 10 added / 10 deleted; a scripted diff shows only the two-bullet
  region differs inside each of the ten `systemBlocks[0]` strings (`doc/expert3d`, `doc/expert3d+hook`, `doc/c3d`, `html/expert3d`, `html/legacy`,
  `html/legacy+lang`, `html/c3d+customTemplate`, `c/expert3d-es`, `c/eu-en`, `c/us-uk`) and no `userContent`, block 1, overlay or `translate/*` entry
  moves; `Operator Notes` occurs 0 times in the file; the `c/*` block-0 delta equals the Task A delta; the one-off scripted check that each new block 0 equals
  the old block 0 with the two bullets replaced by the FR-42 literals (source: the `6546db8` blob) has run and its output is recorded.
- `git diff 6546db8 -- test/fixtures/golden/task-c-description-prompts.json` is empty.
- P1 to P4 green; the stay-green list green; `npm run lint` green.

### Notes

The oracle for the golden is the `6546db8` blob and the Specification literals, never the generator's own output (FR-43, AGENTS.md section 7.7).
Golden-moving work is serial; no other task in this breakdown touches this file, and no earlier stage does (TEST_WRITING writes only the oracle pin P2).
P3 and P4 are NOT part of this commit: they invert existing tests and precede it; T43 is the commit at which master, golden and inversions first agree.

---

## T44 - Remove the `[Operator Notes]` emission from `task-a.ts` (FROZEN STOP)

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | none (technical). Not blocked by T43 or its approval; the two frozen commits are one-at-a-time because both rewrite `.arch-guard-checksums` (Reading guide item 6). Human: the owner's "modify src/prompts/task-a.ts" in the builder's session (OD-25 default (i)) |
| **FROZEN (AGENTS.md section 9)** | `src/prompts/task-a.ts` - this task MUST STOP and request approval before editing it |

### The STOP (what the builder puts to the owner, verbatim content)

- **Change:** one hunk, the reverse of `7397081` (2 lines): remove `import { buildOperatorNotesBlock } from './operator-notes';` (line 7) and the prefix
  `${buildOperatorNotesBlock(input.operatorNotes)}` of the line-168 interpolation (the rest of the line, `${buildImageBlock(input, store.imageBaseUrl)}
  ${buildVideoBlock(input)}${buildMarkerBlock(input)}${template}${custom}${simplifiedOverlay}`, is kept). The three FR-11 hunks (lines 29, 105, 121,
  committed under `87fb3c0`, `7c8fae9`, `266cd9c`) stay. Any other hunk stops the work again.
- **Why:** the withdrawn `[Operator Notes]` block must stop being emitted; this is the only reader of `input.operatorNotes` in a prompt, and
  `operator-notes.ts` and `ProductInput.operatorNotes` cannot be deleted while it exists.
- **Consequences:** `userContent` of `buildPromptA` and `buildPromptADoc` is unchanged for every input without notes (every committed fixture); the
  FR-27 golden `task-a-user-content.json` is NOT touched; no `systemBlocks` change; only the `task-a.ts` checksum moves.
- **Refusal:** Reading guide item 5. P5 stays red, and T48 and T49 are blocked.

### What changes

A stray `operatorNotes` value on a `ProductInput` no longer reaches any prompt: `buildPromptA` and `buildPromptADoc` produce the same payload with or
without it. `task-a.ts` returns to exactly the three FR-11 hunks relative to base.

### Files

| File | Change |
|---|---|
| `src/prompts/task-a.ts` | modify (FROZEN): the import line and the interpolation prefix only |
| `.arch-guard-checksums` | modify: `bash arch-guard.sh --rebaseline`; exactly the `task-a.ts` line moves |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| FR-44 item 2 stray-property inertness, Task A and Doc wrapper over the FR-27 set (P5, in `task-a.user-content.golden.spec.ts` and its inputs file or beside it; the stray property is attached through `unknown`, so the spec compiles before and after T49) | `test:logic` | FR-44.2, FR-27, AC-3, AC-9 exclusion |
| source-scan block for `src/prompts/task-a.ts` (P10) | `test:logic` | FR-44 (no `operator-notes` / `operatorNotes` in non-spec source) |

Stay green: `task-a.user-content.golden.spec.ts` Tier A / Tier B body (FR-27), `task-a.spec.ts`, `task-a-doc.spec.ts`, `task-a-doc.figure-placement.spec.ts`
(absence-shaped assertion), `full-description.golden.spec.ts`, `task-a.deixis-wording.spec.ts` (FR-11), P12.

### Acceptance check

`git diff 6546db8 -- src/prompts/task-a.ts` shows exactly the three FR-11 hunks (lines 29, 105, 121); `git grep -n "operator-notes\|operatorNotes\|OperatorNotes" -- src/prompts/task-a.ts`
is empty; `git diff HEAD~1 -- .arch-guard-checksums` moves exactly the `task-a.ts` line; `bash arch-guard.sh` exits 0; P5 green (payload with a
non-empty stray `operatorNotes` equals the payload without it, `buildPromptA` and `buildPromptADoc`, Tier A, Tier B, hook and no hook);
`npm run lint` green.

### Notes

`ProductInput.operatorNotes` still exists after this task (T49 removes it); `operator-notes.ts` still exists and is still imported by the orchestrator
and the form files until T45 and T46.

---

## T45 - Stop the orchestrator from reading operator notes as numeric-fidelity sources

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none (independent of T43, T44, T46, T47). P0 done |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

`numericFidelitySources` in `content-orchestrator.service.ts` stops including the four note values: a stray stored `operatorNotes` value grounds no
number. The three call sites (Doc gate, HTML base, HTML uk-UA) are not edited; the two FR-14 text lines stay.

### Files

| File | Change |
|---|---|
| `src/services/content-orchestrator.service.ts` | modify: remove the import of `OPERATOR_NOTE_FIELDS` (line 43), the FR-30 doc-comment paragraph (lines 374 to 378) and the `...OPERATOR_NOTE_FIELDS.map(...)` line (384) |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| FR-44 item 4.1 numeric-sources pin with the carried-over `sourcesFor` harness (P6; stray property attached through `unknown`, compiles before and after T49) | `test:logic` | FR-44.4.1 |
| source-scan block for `src/services/content-orchestrator.service.ts` (P10) | `test:logic` | FR-44 (no `operator-notes` / `operatorNotes` in non-spec source) |

Stay green: FR-44 item 4.2 FAQ pin (P7; stray property attached through `unknown`, compiles before and after T49) and the `content-orchestrator.simplified.spec.ts` line 322 block unmodified; the relocated
`NUMERIC_SOURCE_FIDELITY_RULES` byte pin (P11); `content-orchestrator.faq-standalone.spec.ts`; `content-orchestrator.deixis-messages.spec.ts` (FR-14).

### Acceptance check

`git diff 6546db8 -- src/services/content-orchestrator.service.ts` consists of exactly the two FR-14 text lines; `git grep -n "OPERATOR_NOTE_FIELDS\|operator-notes\|operatorNotes" -- src/services/content-orchestrator.service.ts`
is empty; P6 green (an `alt-numeric-not-grounded` error naming `777` for the stray-`777 Вт` input, and a sources string equal to the run without the
property); P11 and P7 green; `npm run lint` green.

### Notes

The sources string is the pin, because P6 would otherwise pass vacuously; the paired with/without comparison is what lets it fail. Do not change
`NUMERIC_SOURCE_FIDELITY_RULES` or `validateAltNumericFidelity`.

---

## T46 - Remove the Generator operator-notes form as one change (component, state class, `app.component.ts` and `.html`)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none (independent of T43, T44, T45, T47). P0 done (the component spec and the state-class spec are already deleted) |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

The four operator-note textareas, their state class and every wiring point in `AppComponent` disappear in one commit. The `app.component.ts` pieces and
the `app.component.html` tag are one change: the tag references `operatorNotesState` / `operatorNotesLabels`, and a template error is caught by
`npm run build` (AOT), not by `npm run lint`; half of it breaks the build. `AppComponent` returns to its base bytes.

### Files

| File | Change |
|---|---|
| `src/app/operator-notes-form-state.ts` | delete |
| `src/app/components/operator-notes-fields/operator-notes-fields.component.ts` | delete |
| `src/app/components/operator-notes-fields/operator-notes-fields.component.html` | delete (the folder then holds nothing) |
| `src/app/app.component.ts` | modify: the two imports, the `imports: [...]` entry, 8 `TRANSLATIONS` keys (en 4, uk 4), `operatorNotesState`, `operatorNotesLabels`, the `buildGeneratorInput` spread, the `restoreHistory` line, and BOTH `clearAll` calls (`generator` and `ua-generator`) |
| `src/app/app.component.html` | modify: the `<app-operator-notes-fields>` tag (one Generator branch serving `generator` and `ua-generator`) |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| source pins on `app.component.ts` (`restoreHistory` and `buildGeneratorInput` name no `operatorNotes`) (P9b) | `test:logic` | FR-44.3 (honest limit: absence of the reading code, not execution) |
| `app.component.*` and `operator-notes-fields` blocks of the source scan (P10) | `test:logic` | removal of the form, the 8 labels, the component |

Stay green: `HistoryService` legacy-entry pin (P9a; the stored entry carrying `operatorNotes` is built through `unknown`, compiles before and after T49); `app.component.template-wiring.spec.ts`, `app.component.faq-layout.spec.ts`, `app.component.export-guard.spec.ts`
(the `clearAll()` slice regex), `src/app/content-template-labels.spec.ts`; the two remaining component specs `content-template-select` and `model-settings`
under `test:components`.

### Acceptance check

`git diff 6546db8 -- src/app/app.component.ts src/app/app.component.html` is empty; `src/app/operator-notes-form-state.ts` and the
`src/app/components/operator-notes-fields/` folder do not exist; `npm run build` succeeds (AOT template check); `npm run test:components` green with
exactly the two remaining component specs; `npm run lint` green; P9b and the P10 form blocks green; no `operatorNotes` / `OperatorNotes` token in a
non-spec `src/app/**` file other than `types.ts` (removed in T49).

### Notes

`src/app/types.ts` is NOT edited here (it still holds `ProductInput.operatorNotes` and `interface OperatorNotes` until T49). `operator-notes.ts` still
exists. `npm run build` is part of this task's acceptance because `tsc` alone cannot see a residual template reference.

---

## T47 - Remove the four `--notes-*` flags from the measurement script

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none (independent of T43 to T46) |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

`tools/measure-description.ts` no longer accepts `--notes-usage-scenarios`, `--notes-test-results`, `--notes-previous-generation-comparison` or
`--notes-limitations`; `parseArgs` already treats a flag not in `FLAGS` as `unknown argument "<flag>"` plus `USAGE` on stderr with status 2 and no file
read, so the removal alone yields the FR-44 item 5 behaviour (no new code path). The optional input texts are the specs and the product name (FR-32 D-10).
The comment on line 40 of `src/utils/description-metrics.ts` ("operator notes") is corrected; that line is a comment and changes no behaviour (no
notes parameter exists there: `MeasureInput.inputTexts` is a generic `string[]`); it changes no behaviour and is pinned only textually, by the
P10 `description-metrics.ts` block (the widened token set matches its lowercase "operator notes").

### Files

| File | Change |
|---|---|
| `tools/measure-description.ts` | modify: header usage comment (lines 9 to 10), `FLAGS` (34 to 37), `FILE_FLAGS` (40), `USAGE` (43 to 44) and the "operator notes" sentence (14) |
| `src/utils/description-metrics.ts` | modify: comment only (line 40) |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `test/measure-description.cli.spec.ts`, the new FR-44 item 5 rejection test (P8) | `test:logic` | FR-44.5, FR-32 D-10, AC-10 |
| source-scan blocks for `tools/measure-description.ts` and `src/utils/description-metrics.ts` (P10, plan v6 widened token set: `operator[ _-]?notes?`, `--notes-(usage\|test\|previous\|limitations)`, `notes(UsageScenarios\|TestResults\|PreviousGenerationComparison\|Limitations)`; the v4 four-token set matched nothing in these two files) | `test:logic` | FR-44 (no notes token or flag remnant in non-spec source) |

Stay green: the rest of `test/measure-description.cli.spec.ts` (first line `process.version`, exit codes, `--specs`, `--name`), `src/utils/description-metrics.spec.ts` (NOT edited, B4: its stale title stays).
P8 is the behavioural pin for the flags; the P10 blocks are the textual pin for their remnants (header comment, `FLAGS`, `FILE_FLAGS`, `USAGE`, the lowercase "operator notes" prose).

### Acceptance check

P8 green: for each of the four flags with a valid `--html` and `--input`, status 2, stderr contains `unknown argument "<flag>"`, nothing on stdout,
usage text lists none of the four names; the rest of the CLI spec green; `git grep -n -i -E "operator[ _-]?notes?|--notes-(usage|test|previous|limitations)|notes(UsageScenarios|TestResults|PreviousGenerationComparison|Limitations)" -- tools src/utils/description-metrics.ts`
(the widened P10 token set) is empty; the P10 `tools/measure-description.ts` and `description-metrics.ts` blocks green; `npm run lint` green. The spawn test needs Node >= 22.18 natively (OD-9 condition; local Node v24.15.0; `package.json` pins no `engines`).

### Notes

`tools/` is outside `tsconfig`, vitest `include` and coverage, so only the spawn test exercises this file.

---

## T48 - Delete the `operator-notes.ts` leaf module

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T44, T45, T46 (the four importers: `task-a.ts`, `content-orchestrator.service.ts`, `operator-notes-form-state.ts`, `operator-notes-fields.component.ts`) |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

`src/prompts/operator-notes.ts` (78 lines, `1a335c7`; `OPERATOR_NOTE_FIELDS`, `normalizeOperatorNotes`, `buildOperatorNotesBlock`, `toOperatorNotes`,
`toFormValues`, types) is deleted. With no importer left, `tsc` is the proof that none remains.

### Files

| File | Change |
|---|---|
| `src/prompts/operator-notes.ts` | delete |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `existsSync` block and the `operator-notes` import-token block of the source scan (P10) | `test:logic` | removal of the leaf module |

Stay green: P5, P6, P7, P11, P12; `task-a.spec.ts`, `task-a-doc.spec.ts`.

### Acceptance check

`git ls-files -- src/prompts/operator-notes.ts src/app/operator-notes-form-state.ts src/app/components/operator-notes-fields` lists nothing (the five deleted
modules and the folder are gone; absence-pin specs TEST_WRITING names are not matched because the paths are exact); `git grep -n "operator-notes" -- src tools server ':!*.spec.ts'`
is empty (non-spec files only, the same rule P10 applies to itself; the absence pins legitimately carry the token); `npm run lint`
and `npm run build` green; P10's existsSync and import-token blocks green.

### Notes

If T44 was refused, this task cannot start (Reading guide item 5). `interface OperatorNotes` in `types.ts` is still referenced nowhere after this task but is
removed in T49, because `operator-notes.ts` imported it and the deletion order is leaf module first, then type.

---

## T49 - Return `src/app/types.ts` to its base bytes (drop `ProductInput.operatorNotes` and `interface OperatorNotes`)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T48 (the leaf module imported the `OperatorNotes` type), T47 (so the source scan can go fully green); transitively T44, T45, T46 |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

`ProductInput` no longer has an `operatorNotes` property and `interface OperatorNotes` is deleted; no dormant type is left (plan rejected alternative 4). No
migration of stored history entries (NFR-13): a stored `operatorNotes` stays in `localStorage`, ignored.

### Files

| File | Change |
|---|---|
| `src/app/types.ts` | modify: `interface OperatorNotes` (about lines 41 to 50) and `ProductInput.operatorNotes` with its comment (58 to 59) |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| source-scan pin (P10), `types.ts` block and the whole scan | `test:logic` | FR-44 (no operator-notes code path) |

Stay green: P5, P6, P7, P9a (each attaches its stray `operatorNotes` property through `unknown`, so each still compiles once this task removes the key; an uncast
typed literal would fail tsc's excess-property check here and is a TEST_WRITING defect, not a builder edit), P11, P12.

### Acceptance check

`git diff 6546db8 -- src/app/types.ts` is empty; the whole source scan is green (no non-spec file under `src/`, `tools/`, `server/` matches any of the three P10
widened tokens, case-insensitive: `operator[ _-]?notes?`, `--notes-(usage|test|previous|limitations)`, `notes(UsageScenarios|TestResults|PreviousGenerationComparison|Limitations)`;
the five deleted modules do not exist); `npm run lint` and `npm run build` green; `npm run test:logic`
green.

### Notes

This is the last committing task. After it, `git diff 6546db8` for `types.ts`, `app.component.ts`, `app.component.html` is empty and for
`content-orchestrator.service.ts` equals the two FR-14 lines.

---

## T50 - Verify the removal as a whole and sweep the surviving surface (verification only, no commit)

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T43, T44, T45, T46, T47, T48, T49 |
| **FROZEN (AGENTS.md section 9)** | no (reads only) |

### What changes

Nothing is written to the tree. The builder runs the plan's verification commands (W8 / "Verification commands") and the re-runs of validation row 9 on the
final tree and records the real output in `pipeline_status`. It does not replace QUALITY_GATE; it is the evidence that the removal is exact and that the
committed US-9.1 surface (FR-1 to FR-23, FR-27, FR-32 to FR-39) still stands.

### Files

none. No commit.

### Tests to turn green

none; targeted re-run (`test:logic` unless stated) of the specs that keep the other ACs reachable (names from `docs/tests/US-9.1-ac-test-matrix.md`, which TEST_WRITING
refreshes for the removal): AC-1 `vision-prepass.no-picture-references.spec.ts`; AC-2 `constants.no-image-deixis.spec.ts`, `master-system-prompt.no-picture-references.spec.ts`,
`master-system-prompt.video-placement.spec.ts`, `master-system-prompt.grounding-lock.spec.ts`, `master-system-prompt.placement.spec.ts`, `full-description.golden.us91.spec.ts`;
AC-3 `task-a-doc.figure-placement.spec.ts`, `task-a.deixis-wording.spec.ts`, `constants.c3d-override.spec.ts`, `output-validator.image-manifest-wording.spec.ts`,
`video-manifest.pointer-free.spec.ts`, `content-orchestrator.deixis-messages.spec.ts`, `task-a.user-content.golden.spec.ts`; AC-4 to AC-7 the deixis, `output-validator.image-deixis`,
`image-placeholder.deixis`, `image-deixis.import-cycle` specs; AC-8 `constants.liveliness.spec.ts`, `master-system-prompt.liveliness.spec.ts` (untouched, B4), `constants.expert3d.spec.ts`,
`task-c.description-bytes.spec.ts`, `payload-oracle.d15.spec.ts`; AC-10 `description-metrics.spec.ts` (untouched, B4), `measure-description.cli.spec.ts`.

### Acceptance check

All of the following hold on the final tree, with output recorded: `git merge-base --is-ancestor 6546db8 HEAD` and `git merge-base --is-ancestor 09f87dc HEAD` exit 0;
`git diff 6546db8 -- src/app/types.ts src/app/app.component.ts src/app/app.component.html` empty; `git diff 6546db8 -- src/services/content-orchestrator.service.ts` equals the two FR-14
lines; `git diff 6546db8 -- src/prompts/task-a.ts` shows only the FR-11 hunks; no hunk of `git diff 6546db8 -- src/prompt-core/master-system-prompt.ts` lies inside `[SOURCE FIDELITY]`;
`git diff --numstat 09f87dc -- test/fixtures/golden/full-description-prompts.json` is 10/10; `git diff 09f87dc -- .arch-guard-checksums` moves exactly the `task-a.ts` and
`master-system-prompt.ts` lines; `git diff 6546db8 -- test/fixtures/golden/task-c-description-prompts.json test/fixtures/golden/task-a-user-content.json test/fixtures/golden/optimizer-faq-pre-change.json`
empty; `git diff 09f87dc --name-only -- server src/domain src/render src/utils/output-validator.ts src/prompts/task-a-doc.ts src/prompts/task-c.ts src/prompts/optimizer.ts src/services/history.service.ts ':!*.spec.ts'`
lists nothing (non-spec files only: an absence pin placed in one of those directories is a test and is not a production edit); `bash arch-guard.sh` exits 0; the AC sweep above is green; the relocated `NUMERIC_SOURCE_FIDELITY_RULES` pin exists and is green (R11); the 8 dedicated specs do not exist;
`git diff 09f87dc --name-only -- src/utils/description-metrics.spec.ts src/prompt-core/master-system-prompt.liveliness.spec.ts` lists nothing (B4: the two surviving specs are untouched);
the one-off T43 scripted check (new block 0 equals old block 0 with the two bullets replaced by the FR-42 literals) is re-run or its recorded output is cited;
`docs/tests/US-9.1-ac-test-matrix.md` and the `test_strategy` both state the four corrected readings of P14 (base `6546db8`; the line-322 successor describe; 20 occurrences on 10 lines; the W6 procedure as the FR-43 mechanism).

### Notes

Evidence only. A failing item is reported against its owner task, never fixed here; a test that must change returns to TEST_WRITING.

---

## T51 - SUPERSEDED: live acceptance re-runs after the master revert (AC-11 / AC-12 hard script criteria WAIVED)

| | |
|---|---|
| **Status** | **SUPERSEDED** by the owner's waiver (Story v6, 2026-10-19, history `ts` 2026-10-19T14:50:23Z; Specification v8 FR-34 / FR-35; Plan v7, OD-32 default). Not pending, not manual, not executed, not replaced by another task |
| **Track** | none (no work remains; the former entry was "prompt (manual)") |
| **Depends on** | none; nothing depends on it and it depends on nothing |
| **FROZEN (AGENTS.md section 9)** | no |

### What changes

Nothing. The three-products-by-two-runs live acceptance of AC-11 and AC-12 with `tools/measure-description.ts` as the instrument is NOT required, NOT planned and has no
evidence. The id is kept only so that references to "T51" in earlier records still resolve; it is not reused. No live run will be performed under this breakdown.

### Files

none.

### Tests to turn green

none. AC-11 and AC-12 have no test and no run; the status is **WAIVED (not measured)**. The script (AC-10) is verified by its own tests (T47, T50), not as an instrument of a live run.

### Acceptance check

None applies. There is no script output to record and none is claimed. The downstream records carry the disclosure, not this breakdown: the `ac_test_matrix` rows, the
reconciliation report (`non_blocking_findings`, never "passed" or "measured") and the Pull Request "how verified" line say "WAIVED (owner, Story v6, 2026-10-19; not measured)"
(Plan v7 OD-27, OD-32; AGENTS.md section 13).

### Notes

Superseded, not deferred. If the owner ever restores the runs, or restates the waiver after a later change to a prompt-bearing file of this Story (Plan v7 OD-29), that returns
to the owner and the plan; this breakdown does not reserve a slot for it. T51 is not a precondition for QUALITY_GATE and never was.

---

## Coverage

### Plan item -> tasks

| Plan item | Task(s) |
|---|---|
| W1 (`ProductInput`, `types.ts` to base bytes; no migration) | T49 |
| W2 (two FROZEN hunks, STOP) | T43 (master), T44 (`task-a.ts`) |
| W3 (prompt/schema/renderer/validator chain after removal) | T43, T44 (prompt link); T45 (validator-side source list); schema/renderer: none edited (T50 check) |
| W4 (payload contract, caching, block 0 shrinks 130 chars) | T43 (STOP consequences), T44 (`userContent` unchanged), T50 |
| W5 table (end state per file) | `operator-notes.ts`: T48; `operator-notes-form-state.ts`, component `.ts/.html`, `app.component.ts/.html`: T46; `types.ts`: T49; orchestrator: T45; `tools/measure-description.ts` and the `description-metrics.ts` comment: T47; not-edited rows: T50 |
| W5 coupling 1 (`task-a.ts` before `ProductInput.operatorNotes`) | T44 < T49 |
| W5 coupling 2 (`operator-notes.ts` after its four importers) | T48 depends on T44, T45, T46 |
| W5 coupling 3 (`app.component.ts` and `.html` one change; build proves it) | T46 |
| W5 coupling 4 (specs importing deleted modules gone first) | P0, before T43 |
| W5 coupling 5 (master revert + golden co-commit; the T31 / master-reach inversions precede it, red by design) | T43 (master + golden, builder-owned); P3, P4 (TEST_WRITING, before T43); findings F2, F3 |
| "The sanctioned red window" (plan v6) | Reading guide 3; P3, P4; finding F3 |
| "Specification inaccuracies" recording obligation (B5, plan v6) | P14 (TEST_WRITING); checked in T50 |
| W5 coupling 6 (`US91_MASTER_LITERALS` / `>= 10` pair) | P12, guarded T43 to T49 |
| W6 (golden procedure, builder-owned, and oracle) | T43 (regenerates the golden); P2 (oracle pin only, TEST_WRITING); verified T50 |
| W7 (test dispositions; the two surviving-spec title edits dropped, B4) | P0 to P4, P11, P12 (TEST_WRITING); each turned green or guarded by T43 to T49; the two untouched specs checked in T50 |
| W8 FR-43 oracle pin, items 1, 2, 3, 4.1, 4.2, 5, source scan (widened token set) | P2 -> T43; P1 -> T43; P5 -> T44; P9 -> T46 (+ stay green); P6 -> T45; P7 -> stay green; P8 -> T47; P10 -> T43 to T49 (the `tools/` and metrics blocks -> T47) |
| W8 cast constraint (stray `operatorNotes` compiles before and after T49) | P5 (T44), P6 (T45), P7 (stay green), P9a (stay green); stated on each handle; T49 stay-green |
| W9 (Angular surface: deletion only; no new component) | T46 |
| W10 (no server change; forward commits; no rewrite; coverage floors) | T50 (server unedited, ancestors), QUALITY_GATE (coverage) |
| Validation rows 1 to 12 | rows 1 to 8: T43 to T49; row 9 (re-runs): T50 and the stay-green lists; row 10: T46; row 11: T50; row 12: QUALITY_GATE |
| Validation rows 13 (AC-11) and 14 (AC-12), and the section "AC-11 / AC-12: WAIVED by the owner; T51 is superseded" (OD-26 to OD-32) | **WAIVED (not measured)**: no task. T51 is superseded; disclosure is carried by the matrix, RECONCILIATION and the PR "how verified" line, not by a task |
| FROZEN-file position items 1 to 4 | T44, T43 (STOP blocks), Reading guide 4 to 6 |
| Risks | R1, R4, R6: T43; R2, R9: T46, T49; R3: Reading guide 3; R5 (rewritten in Plan v7: unmeasured, owner-accepted headline outcomes): no task, disclosure only (T51 superseded); R7: Reading guide 3 and finding F3; R8: T46 (build), T49 (scan); R10: finding F5; R11: P11, T50; R6 (`masterPromptBlocks` windows): P13, T43 stay-green |

### Requirement / acceptance criterion -> tasks

| Requirement / AC | Task(s) |
|---|---|
| AC-1 (FR-1 to FR-4), AC-4 to AC-7 (FR-15 to FR-19) | committed; guarded by stay-green lists, swept in T50 |
| AC-2 (FR-5 to FR-9) | committed; master region kept untouched by T43; swept in T50 |
| AC-3 (FR-10 to FR-14, FR-27, FR-36, FR-37) | committed; T44 (FR-11 hunks kept, FR-27 golden), T45 (FR-14 lines kept), T50 |
| AC-8 (FR-20 to FR-23) | committed; T43 (FR-23 consequence, master-reach, golden), T50 |
| AC-9 (withdrawn; exclusions FR-42 to FR-44, NFR-13 to NFR-15) | T43 (FR-42, FR-43, FR-44.1), T44 (FR-44.2), T45 (FR-44.4), T46 (FR-44.3), T47 (FR-44.5), T48, T49 (scan), T50 |
| FR-24 to FR-26, FR-28 to FR-31, FR-40, FR-41 (withdrawn stubs; removal) | T44 (FR-26 emission), T45 (FR-30), T46 (FR-24, FR-25 form side, FR-31, FR-41), T48, T49 (FR-25) |
| AC-10 (FR-32, FR-33; D-10 input set) | T47; swept in T50 |
| AC-11 (FR-34; FR-36 is traced under AC-3) | **WAIVED (not measured)** (owner, Story v6, 2026-10-19). No task: T51 is superseded; no test, no run, no script output. Disclosure only, in the matrix, RECONCILIATION `non_blocking_findings` and the PR "how verified" line |
| AC-12 (FR-35), hard script criterion | **WAIVED (not measured)** (same waiver). No task: T51 is superseded. The soft items stay non-blocking and are recorded as not evidenced; the manual fact review is recorded as covered by the owner's statement, not as evidence (OD-28) |
| FR-38, FR-39 (preserve-only) | stay-green lists; T50 |
| NFR-1 (cache) | T43 |
| NFR-9 (tests that change) | P0 to P4, T43 |
| NFR-10, NFR-15 (FROZEN) | T43, T44, Reading guide 4 |
| NFR-13 (forward commits, no migration) | Reading guide 3; T49; T50 |
| NFR-14 (traced test removals; no test of a surviving requirement touched) | P0 to P4, P11, P12 (TEST_WRITING); the two untouched specs (B4) checked in T50 |
| FR-43 (golden diff scope, oracle, same commit as the master revert) | T43 (builder regenerates), P2 (oracle pin), T50 |
| Spec readings recorded for RECONCILIATION (B5) | P14, T50 |

Every ACTIVE task (T43 to T50) maps to at least one plan item and one requirement above; no active task maps to nothing. T51 is superseded and deliberately maps to
nothing; AC-11 and AC-12 are WAIVED (not measured) and are reachable through no task.

## Findings (non-blocking; for PLAN_REVIEW and the orchestrator)

- **F1 - Version discrepancy.** The brief named the existing breakdown "v2"; the file on disk was v3 APPROVED (`supersedes ...#2`). v4 superseded `#3`; v5 superseded `#4`; this is v6 (DRAFT) and supersedes `#5`.
- **F2 - Golden ownership (RESOLVED, B1).** Plan v6 and PLAN_REVIEW v4 rule that the BUILDER regenerates `full-description-prompts.json` in T43, in the same commit as the master
  revert (FR-43; precedent `6db2885`, `d5d207a`, `ecaa2fd`; the TEST_WRITING commit `3f9ae29` never touched it). It is in T43's Files and in no TEST_WRITING handle: P2 is the oracle
  pin only, RED on arrival. The v4 alternative "verify rather than re-edit if TEST_WRITING already committed it" is removed.
- **F3 - The red window, stated for the human (B2).** TEST_WRITING precedes IMPLEMENTATION, so the inversions P3 (T31) and P4 (R22, optimizer master-reach) PRECEDE T43; they do not
  co-commit with it. P3 and P4 invert EXISTING green tests, so the TEST_WRITING commit turns pre-existing tests red; they are red by design until T43 and are the only sanctioned red
  among existing tests (requirement-driven, NFR-9 / NFR-14, AGENTS.md section 7.7). Every other red test in the window is a NEW pin that turns green in its owner task. What co-commits in T43
  is the master revert and the golden; T43 is the commit where master, golden and inversions first agree. AGENTS.md section 13 "every commit green" is satisfied on the per-task gate
  convention only (N6 of review v3, US-8.1, `3f9ae29`), which PLAN_REVIEW v4 accepted; to be surfaced to the human at HUMAN_PLAN_APPROVAL.
- **F4 - Stale test artifacts.** `docs/tests/US-9.1-*` still map AC-9 to the operator-notes specs; TEST_WRITING must refresh them (P0 to P13) before IMPLEMENTATION. Under Specification v8 the matrix rows AC-11 and AC-12 read "WAIVED (owner, Story v6, 2026-10-19; not measured)"
  with no test (Plan v7, OD-27); the matrix is TEST_WRITING's and is not edited here.
- **F5 - Open Decisions.** OD-21 to OD-25 (and, for the waiver, OD-26 to OD-32; see F11) are PROPOSED DEFAULTS accepted by a plain `/so:approve`; OD-23 (b) "path 1" and Spec Q-D (deleting 8 spec files) are unconfirmed
  (plan R3, R10). A different owner answer returns the work to the plan; the breakdown builds on the defaults.
- **F6 - Cast constraint on every stray-property handle.** Each pin that attaches a stray `operatorNotes` property (P5, P6, P7, P9a) must compile both before and after T49 (cast through
  `unknown`, never a typed literal; the carried-over helpers `withNotes` and `baseInput(over: Record<string, unknown>) ... as unknown as ProductInput` already do). It is a constraint on
  TEST_WRITING, not a builder edit; it is written on each of the four handles.
- **F7 - Track assignment.** `tools/measure-description.ts` is in no track directory; T47 is `angular` by the v3 precedent.
- **F8 - Base commit.** The Specification's `120dcbc` is read as `6546db8` throughout (plan "Specification inaccuracies" item 1). The other three corrected readings travel with it
  to RECONCILIATION through handle P14 (B5).
- **F9 - Handle numbering.** No handle was renumbered in v5 (P14 is appended), so the plan v6 W8 cast paragraph, which names P5, P9a, P6 and P7, stays aligned as written.
- **F10 - Source-scan ownership.** With the widened token set the `tools/measure-description.ts` and `description-metrics.ts` blocks of P10 can fail at HEAD, so T47 owns them as
  real tests, not as vacuous rows (B3). The set was verified by the plan against `6546db8` (zero hits) and at HEAD (12 files); this breakdown re-ran nothing.
- **F11 - AC-11 / AC-12 waiver (v6).** The hard script criteria of AC-11 and AC-12 are WAIVED by the owner (Story v6, 2026-10-19; not measured), so T51 is superseded and no task evidences
  them. This breakdown does not disclose the waiver to the reader of the result: the `ac_test_matrix` rows, RECONCILIATION (`non_blocking_findings`, never "passed" or "measured") and the
  Pull Request "how verified" line do (Plan v7 OD-27, OD-32). The waiver is bound to the delivery as committed (OD-29): a later change to a prompt-bearing file of this Story needs the
  owner to restate it; this breakdown adds no such change. OD-26 to OD-32 remain PROPOSED DEFAULTS until the owner approves or answers them.
