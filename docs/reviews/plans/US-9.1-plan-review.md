---
artifact: plan_review
story: US-9.1
version: 3
status: APPROVED
owner: so-plan-reviewer
created_at: 2026-10-17T19:27:39Z
updated_at: 2026-10-18T11:01:34Z
supersedes: docs/reviews/plans/US-9.1-plan-review.md#2
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: impact_analysis
    version: 4
  - key: implementation_plan
    version: 4
  - key: task_breakdown
    version: 3
open_decisions_blocking: false
---

# Plan Review: US-9.1 — No picture references and livelier descriptions (Creality Pika regression)

**Verdict:** PASS
**Loop-back:** n/a

> `PASS` here is **not** human approval. Only `/so:approve` records that (AGENTS.md section 10).
> The plan (v4) and the task breakdown (v3) stay `DRAFT`. This file is revision 3 and supersedes v2 at the same path (v2 is `SUPERSEDED`).
> No FROZEN-file approval exists in any session; this review grants none and the plan claims none.

All inputs are current (none `SUPERSEDED`): Story v4, Specification v5 (front matter `APPROVED`; `history.jsonl` records the human approval of v5 at
2026-10-18T10:22:23Z), impact analysis v4, implementation plan v4 (consumes Specification v5 / impact v4 / Open Decisions v4), task breakdown v3 (consumes plan v4).
`open_decisions_blocking` is false in every input. Review run on `feat/US-9.1-no-picture-references-and-livelier-descriptions`, HEAD `6546db8` (equal to the commit the
branch was cut from; source tree unchanged). `bash arch-guard.sh` re-run now: "All frozen files unchanged", ALL CHECKS PASSED (`task-a.ts` `0421226c...`, `task-c.ts` `619c45a9...`).
A grep for `TODO|TBD|FIXME|???` over the Specification, plan, task breakdown, impact analysis and Story returned no match.

## Summary

The re-baselined plan v4 and the 42-task breakdown v3 are buildable and faithful to Specification v5 and to the owner's plan-gate answers. Every FR and AC (including the new
FR-41, the new FR-20 literal, FR-23 at both levels and NFR-9) is reachable through a task; all twelve FROZEN-file tasks (T21 to T32) carry the section 9 stop and claim no
approval; the owner's answers are applied as decided and not stretched (Q1 option (b) kept to block 0, no `optimizer.ts` edit, both `clearAll` cases, OD-19 yes/no, the
OD-12 order recorded as intent only). All of v2's N10 to N16 are closed. Nothing blocks. The things the human should look at before approving are a decision, not a defect: H-OD13 now
gates ten tasks (N20), Q-FR41-TEST's "default if no answer" is not what the breakdown does with an unanswered Hn (N23), and a handful of wording slips to fix at the next touch (N17 to N19, N21, N22).

## Status of review v2 findings N10 to N16 (explicit)

| Id | v2 finding | Status in v3 | Evidence |
|---|---|---|---|
| **N10** | "no digit" formulation of the FR-20 Assert-absent | **CLOSED** | Plan change-note row 2, D7, D13 category 1 and 19; breakdown change-note row 2, "Constraints on TEST_WRITING" item 3, T16, T32, T33: every place now says "no sentence-length number other than `6`" plus `9–17`, `9-17`, `at most two consecutive`, `two consecutive sentences`, a digit-range-plus-`word` expression, and states `§1`, `§3`, `<h2>` are not sentence-length numbers. A grep for `no digit` finds only the withdrawals. The new self-scoping literal carries no digit |
| **N11** | `content-orchestrator.faq-standalone.spec.ts` (NFR-9 item 2) not carried | **CLOSED** | In plan D11 row, D13 category 17, traceability NFR-9; in breakdown T27, T28, T29, T30, T31, T32 stay-green rows and the T33 run list |
| **N12** | stale Specification v4 prose | **CLOSED** | Specification v5 revision note row "Hygiene" corrects it; plan v4 row 17 removes the "PROPOSED DEFAULT" labels the owner confirmed (Q-SCOPE) |
| **N13** | T20 option (a) co-commit conflict | **CLOSED (moot)** | Option (b) decided: T20 is its own commit, green on arrival and after the master edit, "no co-commit"; the option (a) text survives only as rejected alternative 21 and a change-note row |
| **N14** | refusal consequences stated for T-A4 only; T31 not gated | **CLOSED** | Plan "Refusal rule" (applies to every FROZEN item); breakdown Reading guide item 8 and the Refusal table; **T31 now depends on T21** |
| **N15** | H-OD13 register row listed only T36 | **CLOSED in form, consequence is N20** | The register "Blocks" now lists T5, T6, T7, T14, T16, T17, T18, T19, T25, T36 and each of those `Depends on` lines names H-OD13 (re-checked, ten of ten). Resolving it in the strict direction is what produces N20 |
| **N16** | hard-coded commit `6546db8` | **CLOSED** | Reading guide item 10, T1, T33, T37 use `<BASE>` read from the fixture header, preceded by `git merge-base --is-ancestor <BASE> HEAD`. Verified, see "BASE derivation" below |

Carried unchanged from earlier revisions: N5 (Hn volume, see N20 and N23), N6 (per-task gate redefines "green" for a tests-first branch, same as US-8.1), N7 (T8 has no failing test), N8 (T35 track
label), N9 (translator sentence drift passes `validateStructuralParity`: declared residual risk R1a, now with the unconditional characterization pin and the optional T42 comparison, owner Q-TRANS).
New non-blocking findings of this review are N17 onwards.

## 1. Specification coverage (re-derived, both directions)

Re-derived from each task's Files / Tests rows and the Specification text, not from the breakdown's own coverage table.

| FR | Reached by task(s) | Verdict |
|---|---|---|
| FR-1..FR-4 | T14 | covered |
| FR-5 | T15 (constant), T27 (interpolation outside `[IMAGE HANDLING]`, reach pins into Task C description block 0 and optimizer block 0) | covered |
| FR-6, FR-7 | T30 | covered |
| FR-8 / FR-9 | T29 / T28 | covered |
| FR-10 | T17 | covered |
| FR-11 items 1, 2, 3 | T24, T22, T23 | covered |
| FR-12 | T18 | covered |
| FR-13 | T6 (video half), T25 (image half, frozen) | covered |
| FR-14 | T7 | covered |
| FR-15 | T5 | covered |
| FR-16 / FR-17 | T2 / T3 | covered |
| FR-18 | T3 (issue builder), T26 (frozen call) | covered |
| FR-19 | T4 | covered |
| FR-20 (**new literal**) | T16 (constant with the verbatim sentence `These rules govern writing a new description; when the task is to translate an existing text they do not apply, and the source's sentences and their order are kept.`, its three strings, the N10 Assert-absent), T32 (interpolation; three strings in `systemBlocks[0]` of `buildPromptA` for 7 stores, of `buildPromptC` description over `registryPairs()`, of `buildOptimizerPrompt`; absent from the FAQ variant and `buildTranslatePrompt`), T33 | covered; literal compared character by character against Specification v5 FR-20 |
| FR-21 | T16, T19, T32 | covered |
| FR-22 | T19 | covered |
| FR-23 (**both levels**) | file level: T20 (no `task-c.ts` / `task-translate.ts` diff, checksum `619c45a9...` unchanged), T33; payload level: T20 (96 cases: block count, block-0 `cache`, block 1 and `userContent` pinned, block 0 `toBe` the live master), T27 + T32 (block 0 reach), T37 (optimizer block 1 / `userContent`, every FAQ-variant block); **item 1 (FR-22 strings absent from C3D, `task-c.ts`, `task-translate.ts`) has no named owner test, see N19** | covered |
| FR-24 | T11, T12 (gated on T21) | covered |
| FR-25 | T8, T9, T13, T40 (form side) | covered |
| FR-26 | T9, T21 (position test, Expert-3DPrinter test, OD-19 (1b) Assert-absent) | covered |
| FR-27 | T1 (oracle), T21 (Tier A), T22 / T23 (Tier B), T13 + T40 (no key when empty) | covered |
| FR-28 | T8 (isolation), T13 | covered |
| FR-29 | T31 (depends on T21; R22 category 9 test) | covered |
| FR-30 | T10 (gated on T21) | covered |
| FR-31 | item 1 T8; item 2 T40 + T38; item 3 T13 (constructor/effect pin); items 4, 5 T40 (behaviour) + T13 / T38 (call sites) | covered |
| FR-32, FR-33 | T34, T35 (T41 only on the Node-check condition) | covered |
| FR-34, FR-35 | T36 (manual, outside the gate) + T34 | covered; not unit-testable, as the Specification states |
| FR-36..FR-39 | preserve-only; existing specs re-run (T33, QUALITY_GATE) | covered |
| FR-40 | T10, T13, T17 / T21 / T31 (OD-19 (1b) Assert-absent), T31 (R22) | covered |
| **FR-41** | T40 (`clear`, restore-then-clear behaviour in the logic runner), T39 (both `clearAll` cases, disjoint per-case pins, slicing helper tested on a one-case-only synthetic source) | covered, with the test-shape caveat of N23 |
| NFR-1..NFR-12 | distributed; NFR-9 list re-derived against Specification v5 item 1, 2, 3 (all named specs present, including `faq-standalone`, `protected-name-precedence`, `image-figure-style.prompt-examples`, `optimizer.spec`, `task-a.spec` AC-9b and `task-a-doc.spec` line-229 blocks via the regenerated golden) | covered |

Every AC-1..AC-12 is reachable through the tasks of its FRs (AC-8 last sentence: T16, T20, T27, T32, T33, T37; AC-9 now also T39 / T40; AC-11 / AC-12 are live-run criteria, T36).

| Task | Traces to | Verdict |
|---|---|---|
| T1, T37 | D14 / D15, FR-27, FR-23 items 4 and 5, NFR-9 | ok (verify-and-commit of oracles; no production edit) |
| T2..T7 | D5..D7, FR-13..FR-19 | ok |
| T8..T13, T38..T40 | D1, D8, D9, FR-24..FR-31, FR-41 | ok; gated on T21 except T8 / T9 |
| T14..T19 | D7, FR-1..FR-12, FR-20, FR-22 | ok |
| T20 | D0.2, D11, Q1 option (b), FR-23, NFR-9 | ok (a spec amendment the Specification names and the owner chose; its limits are stated) |
| T21..T32 | D3 FROZEN hunks T-A1..T-A4, O1, O2, M1..M7 | ok |
| T33 | D0, D13 categories 16-20 | ok (verification only) |
| T34, T35, T41 | D12, FR-32, FR-33, OD-9 condition | ok (T41 conditional, owner OD-9) |
| T36, T42 | D13 categories 14, 22 | ok (manual, outside the gate; T42 optional, owner Q-TRANS) |

**Scope creep, checked against the Specification's *Out of scope* by name:** no promotion of warnings to `error`; no `alt` validator warning; no edit of `task-c.ts`, `task-translate.ts`, `task-b.ts`,
`faq-form.ts`, `runFaqPipeline`, `optimizer.ts`, `simplified-template-blocks.ts`, `ALT_PREFIX` / `FALLBACK_LABEL`, `NUMERIC_SOURCE_FIDELITY_RULES`, or `task-a-doc.ts` notes text; no `FIGURE FORMAT` rewording; no
TypeScript runner or dependency (T35 uses native type stripping and `linkedom`; T41 is conditional on the owner's OD-9 condition); no `engines` / `.nvmrc`; no exemption list; no `AGENTS.md` edit; no
sentence-count check in `validateStructuralParity` (only the documentation pin the owner chose); no translation-scope sentence beside the FR-5 literals (Q-TRANS option (2) not chosen). The additions that are the plan's own
(T37 fixture, T40 `OperatorNotesFormState`, T39 slicing-helper test) are test infrastructure for a Specification-stated outcome, not behaviour no FR asks for, and each is tied to an owner question
(Q1 / D15, Q-CLEARALL / Q-FR41-TEST).

## 2. FROZEN files (AGENTS.md section 9)

| Task | Frozen file touched | Section 9 stop present? | Sibling-file pattern used? | Verdict |
|---|---|---|---|---|
| T21 (T-A4) | `src/prompts/task-a.ts` | yes (exact change, why, "modify src/prompts/task-a.ts", refusal consequence) | partly: logic in `src/prompts/operator-notes.ts`; frozen hunk = 1 import + 1 interpolation | ok |
| T22 (T-A2), T23 (T-A3), T24 (T-A1) | `src/prompts/task-a.ts` | yes, each, with exact old and new span | no (text lives in the file) | ok |
| T25 (O1) | `src/utils/output-validator.ts` | yes | no | ok |
| T26 (O2) | `src/utils/output-validator.ts` | yes | yes: logic in `src/utils/image-deixis.ts`; frozen hunk = 1 import + 1 call | ok |
| T27 (M1+M2), T28..T32 (M3..M7) | `src/prompt-core/master-system-prompt.ts` | yes, each, with the consumer disclosure (Task A, Task C description, optimizer); T31 and T32 add their own disclosures | partly: text in `constants.ts` constants | ok |

All twelve frozen-file tasks (T21..T32) were read in full: each begins its FROZEN cell with `BLOCKED-UNTIL-APPROVED` and the STOP, each names the file and the exact instruction wanted, none states or implies a granted
approval, and each repeats the refusal consequence (Reading guide item 8). `task-b.ts` and `task-c.ts` are named in no task as edited; `optimizer.ts`, `task-translate.ts` and `simplified-template-blocks.ts` neither. No non-frozen
task edits a frozen file indirectly (`constants.ts`, `task-a-doc.ts`, `types.ts`, `app.component.ts`, `content-orchestrator.service.ts` are not on the section 9 list). Every frozen task rebaselines `.arch-guard-checksums` in the same commit.

**The claimed "frozen-rule catch" (T20): confirmed, with a wording residue.** Plan D0.2 words the amended guard's negative demonstration as "a deliberate one-character change to Task C's block-1 instruction and to `userContent`
(temporary mutation, reverted)". Task C's block-1 instruction is text built in `src/prompts/task-c.ts` (FROZEN, checksum `619c45a9...`); a temporary edit of it would be a section 9 edit with no "modify src/prompts/task-c.ts".
The task breakdown caught this: T20 Notes forbid the demonstration by editing a frozen file and prescribe test data (a scratch copy of the golden record, or an in-memory mutated record fed to the guard's own comparison, one
block-1 `sha256` character and one `userContent` `sha256` character changed, real JSON never left modified, `git diff` over it empty again), with a STOP and a TEST_WRITING loop-back if the guard cannot be exercised that way; it
also forbids touching `task-c.ts`, `task-translate.ts` or `simplified-template-blocks.ts` "even temporarily". That demonstrates the pin on the same code path (the guard compares records) without a frozen edit, so the
catch is real. The plan text was not corrected (N17).

Plan assumes approval it does not have: **no**. Plan "FROZEN-file position": "No approval exists and none is claimed"; the owner's order is "intent only"; approving the plan is not the section 9 instruction (plan and breakdown say so).

## 3. Architecture rules (AGENTS.md section 3)

| Rule | Checked | Finding |
|---|---|---|
| 1 — no direct SDK outside `server/providers/` | all Files lists, D10 | clear: no provider or SDK file in any task; `server/**` untouched |
| **2 — retrieval separate from generation** (no automated check anywhere) | read D8, T9, T10, T21, T34, T35 by hand | clear: the operator notes are typed form input, never retrieved; T35 reads local files only; nothing adds search / fetch to generation or generation to retrieval |
| 3 — prompt text out of services | T7, T9, T10, T12 | clear: the only services edits are two existing warning strings (T7) and a source list (T10); new prompt text lives in `constants.ts` and `src/prompts/operator-notes.ts`; T12 adds UI labels (`TRANSLATIONS`), not prompt text |
| 4 — no key in the bundle | all Files lists | clear: no env or key touched |
| 5 — no existing feature breaks | D0, R1, R1a, R7a, R22, D11 | **exposed by the owner's own decision (Q1)**: Task C description translation and the optimizer receive the new master text and the behavioural effect is untestable. Disclosed in D0, in the section 9 request text (T27 / T31 / T32) and declared as residual risk (R1a, R1d, R7a, R22). Oracles that can exist are planned (amended Task C guard, D15 fixture, property 6, reviewed golden diff, characterization pin). Not a plan defect |
| `STORE_REGISTRY` sole source of locales/currency | T2, T35 | clear: `DEIXIS_PATTERNS` keyed by language code with a registry cross-check spec (NFR-8); the detector never imports the registry; no currency symbol anywhere |
| `systemBlocks` not collapsed into `userContent` | D4, T15, T16, T21, T27, T32 | clear: static constants stay in cached `systemBlocks[0]`; `[Operator Notes]` in uncached `userContent`; cached-prefix-identical-across-stores kept in T19, T24, T27, T32; block count and block-0 `cache` flag stay pinned for the 96 Task C cases |

## 4. prompt → schema → renderer → validator

- Links touched: prompt (many), validator (`image-manifest-missing` detail, new `image-deixis` / `image-caption-deixis` warnings). Schema and renderer untouched (NFR-12; Vision JSON field set unchanged).
- Stay in agreement: yes. The repair messages (T6, T25) and the prompts (T22, T24, T28, T30) ask for the same thing (a body `<p>` stating a product fact); the new findings are `warning`, never in the repair loop.
- Contract-before-consumer ordering holds: T2 → T3 → T4 / T5 / T26 / T34; T8 → T9 → T21 → T10..T13, T38..T40; T15 / T16 → T27 / T32; T20 before T27; T1 before every `task-a.ts` edit; T37 before every `constants.ts` / master edit (T15, T16, T18, T19 depend on it directly, T27 directly, T28..T32 through the serial chain); golden-moving tasks serial (T17 → T18 → T19 → T22 → T24 → T27..T32). The linear order and Group 0 (oracles first) agree with every `Depends on` line; no cycle in the Hn / T21 gate graph (T40 → T21; T12 → T40 / T11; T13 → T12; T38 → T13; T39 → T38).
- Section 4 criteria the renderer must keep satisfying, list complete: yes (plan D2 and FR-36..FR-39).

## 5. Task quality

| Check | Result |
|---|---|
| All eight fields present on every task | yes: Id and title (the `## Tn` heading), Track, Files, Depends on, Acceptance check, Tests, FROZEN on all 42 (counted: 42 headings, and 42 each of Track, Depends on, FROZEN, Files, Tests to turn green, Acceptance check). `What changes` is present too; `Notes` exists on 20 tasks only and is not one of the eight |
| Acceptance checks observable | yes (commands, empty `git diff` over named files, checksum values, golden-diff case lists, fixture-header hash, `git merge-base --is-ancestor`) |
| Each task could end in one green commit (section 13) | yes under the breakdown's stated per-task gate (red specs owned by later tasks tolerated, US-8.1 precedent; N6). T33 / T36 / T42 are verification or manual tasks that commit nothing, and say so. T12 renders the textareas one commit before T13 wires the input (see N24) |
| No task spans two tracks | clear. Re-counted from the task headers: prompt 23, angular 19, server 0, total 42; frozen-file tasks 12 (4 + 2 + 6). T35 (`tools/`) labelled angular with the reason (N8) |
| Ordered by dependency and risk, riskiest first, rationale stated | yes: oracles first (T1, T37), then leaf contracts, then the T-A4 gate (T21) before the slice it controls, master edits last behind the already-green amended Task C guard. "Risk-first rationale" is present |
| Fixture updates sit with the change that moves them | yes: each golden-moving task regenerates `full-description-prompts.json` in its own commit with a reviewed diff, never `-u`; the T1 / T37 fixtures and `task-c-description-prompts.json` are never regenerated and the last must show an empty `git diff` in every task |

## 6. Test strategy

| Check | Result |
|---|---|
| Every task names test files **and** runner | yes; `test:logic` or `test:components` on every row that has tests |
| Component specs named `*.component.spec.ts` | yes: only `operator-notes-fields.component.spec.ts` (T11, `test:components`, matches the `angular.json` include `**/*.component.spec.ts`). `app.component.operator-notes.spec.ts` and `operator-notes-form-state.spec.ts` correctly do not end in `.component.spec.ts` and run in the logic runner (precedent `app.component.template-wiring.spec.ts`) |
| Untested tasks justify changing no behaviour | T33, T36, T41 (dropped when the condition fails), T42, T8 (type only, N7), T1 / T37 (green on arrival) all state why |
| Failure paths from the FRs are covered | yes: FR-16 (unknown language / empty), FR-17 (no figure, malformed HTML), FR-18 / FR-19 (warning only), FR-27, FR-28, FR-32 (unreadable input → non-zero), FR-41 (reset skipped in either case → the disjoint-slice pins fail) |
| Nothing relies on weakening / skipping a test (7.7) | the one place where an existing guard changes, T20, is named under 7.7 with what it stops pinning and what it newly proves; block count, block-0 `cache`, block 1 and `userContent` pins are kept; the FAQ positional slices are "extended, never narrowed"; every refused frozen item leaves its specs red (Reading guide item 8) |

**T40's assumption that `signal()` works without an injection context under the logic runner: a probe supports it; T40's first-run check stays the authoritative confirmation.** What was run: a throw-away spec in the review scratchpad (no repository file touched)
that imports `signal` from the installed package's `node_modules/@angular/core/fesm2022/core.mjs` by file URL (not the bare `@angular/core` specifier the repository resolves), calls `signal({a: ''})`, `.set(...)` and reads it, executed with the repository's `vitest` binary,
`--root` set to the scratchpad (so the repository's `vitest.config.ts` was not loaded) and `--environment happy-dom`: 1 test passed. The same calls in plain Node ESM printed `signal ok { a: 'x' }`. This shows `signal()` needs no injection context; it does not exercise the repository's vitest config or module resolution. One wording slip in T40's fallback is N18.

## 7. Impact-analysis fidelity

- Plan consumed the survey rather than re-deriving it: yes. Carried and agreeing with impact v4: payload consumers of the master (Task A, Task C description 96 cases at block 0, optimizer), 10 of 12 `full-description-prompts.json` cases at block 0, tripwire `simplified-template-blocks.ts`, live oracle property 6, watch items, silent risks 14-22 (risk 20: the two identical `clearAll` bodies; risk 21: the unread block-0 records; risk 22: `[Operator Notes]` named in block 0 of families whose `userContent` never carries it), Unknowns 15-18.
- Files touched but not surveyed: only plan-created new files (`operator-notes.ts`, `operator-notes-form-state.ts`, `description-metrics.ts`, the component, new specs, the two new oracle fixtures). The state class versus impact's "four new input signals" is a design choice, declared (alternative 22, Q-FR41-TEST), not a survey gap.
- Facts re-checked in the tree at HEAD `6546db8`: `task-a.ts` imports `../app/types` already (so `operator-notes.ts` importing a type from `../app/types` adds no new direction); `angular.json` test include is `**/*.component.spec.ts` and `vitest.config.ts` include is `src/**/*.spec.ts`, `test/**/*.spec.ts`; `clearAll` and `buildGeneratorInput` are `AppComponent` methods with no instantiating spec.

### BASE derivation (the question asked): sound

- `git rev-parse HEAD` = `6546db83...`; `git merge-base --is-ancestor 6546db8 HEAD` exits 0; `git merge-base HEAD main` returns `120dcbc`, which is **not** the cut point (`6546db8` is on the unmerged `feat/US-8.1-single-master-faq` and `docs/US-8.1-archive`), confirming Reading guide item 10.
- The check discriminates: between `120dcbc` and `6546db8`, `src/prompts/task-c.ts` (+187 lines), `constants.ts`, `optimizer.ts` and 56 files under `src server tools package.json` differ, and the `.arch-guard-checksums` entry for `task-c.ts` differs (`3bffefc3...` at `120dcbc`, `619c45a9...` at `6546db8`). A fixture header naming the merge-base would therefore make T37's `git diff <BASE> -- constants.ts master optimizer task-c` and T33's checksum comparison non-empty and fail. (`task-a.ts` is identical at both commits, so T1's `task-a.ts`-only diff alone would not discriminate; T1's whole-tree `--name-only` check does, which is why that clause matters, see N21.)
- A re-cut (for example after the US-8.1 pull request lands) makes `--is-ancestor` or the diffs fail, and the breakdown routes that to a TEST_WRITING loop-back, never a builder edit. Sound.

## Verdict rationale

**PASS.** All seven axes are clear; v2's N10..N16 are closed or closed-in-form; the frozen-file discipline is intact (twelve stops, no assumed approval, the T20 demonstration kept off `task-c.ts`); owner decisions are applied as decided and not exceeded; ordering is correct (oracles T1 / T37 before the edits they guard, tests before code per the tests-first convention).
The open items are wording slips and decisions for the human at the gate, none of which makes the plan or the decomposition wrong, so no loop-back key is named (`loop_back_stage: null`).

Why not `changes_required` (plan): no design decision is wrong or breaks a rule; N17 is a stale sentence in the plan that the breakdown already overrides. Why not `changes_required_tasks`: sizing, ordering and the section 9 stops hold; N18, N19, N21, N24
are one-line corrections that TEST_WRITING and the next touch of the breakdown can make without re-decomposing; N20 is a human decision, not a decomposition defect (see below). Why not `changes_required_specification`: Specification v5 is approved and internally consistent for what the plan needs; the one place where the plan's default falls short of the Specification's literal test wording (FR-41 "invoke Clear All", N23) is surfaced by the plan as a question to the human, and the Specification is implementable as written (impact v4 names a TestBed route).

**H-OD13 gating ten tasks (the question asked): a decision for the human, not a blocker, and a minor plan-register defect.** It is not a blocker because it stops no wrong work; it can only delay work, and the human can clear it with one line at the gate. It is not a safety issue (no frozen file, no byte oracle). It is a human decision
because the register says "Default the plan built: none", while the Specification already supplies one: its convention (Conventions, "Verbatim vs illustrative") makes the asserted strings normative and the restated blocks illustrative, and Open Decisions v4 records OD-13 as `blocking: false`. It is a (minor) register defect because
resolving N15 by adding H-OD13 to nine more tasks turned a non-blocking open decision into a hard STOP (Reading guide item 2: "an unanswered Hn means STOP") for seven previously startable non-frozen tasks (T5, T6, T7, T14, T17, T18, T19) plus T16 and T36; T25 was already behind H-OD12. See N20 for the recommended handling.

## Non-blocking findings

- **N17 (plan wording; frozen-file hazard in prose).** Plan D0.2 "Demonstration" and R1b still describe the guard's negative demonstration as "a deliberate one-character change to Task C's block-1 instruction", i.e. an edit of the FROZEN `task-c.ts`. T20 Notes already override it with a test-data demonstration, and the builder follows the breakdown, so nothing frozen is at risk. Correct D0.2 / R1b to the test-data wording at the next plan touch so the two documents do not disagree. Also state in T20 that TEST_WRITING's guard must read its golden record from an overridable location or expose its comparison, otherwise the "scratch copy" cannot be fed to it (the STOP and loop-back already cover the failure).
- **N18 (wrong loop-back key in T40).** T40's fallback says the builder "returns `changes_required_architecture` to the planner". That key exists under `IMPLEMENTATION_PLANNING` in `stage-map.yaml`; the `IMPLEMENTATION` stage's keys are `partial`, `blocked_by_plan`, `blocked_by_architecture` (→ `ARCHITECTURE_PLANNING`) and `changes_required_tests`. Use `blocked_by_architecture`. Low risk: a probe supports the `signal()` assumption it guards (Section 6).
- **N19 (FR-23 item 1 has no named owner test).** FR-23 item 1 and its Assert-absent (the FR-22 strings `states the mechanism that makes THIS product the right tool` and `functional headings` absent from `C3D_TOV_BASE_OVERLAY`, `MASTER_SYSTEM_PROMPT`, `task-c.ts`, `task-translate.ts`) appear in no task's Tests row; T18's acceptance says "no liveliness text appears in `C3D_TOV_BASE_OVERLAY`", a different assertion. It is a green-on-arrival absence pin, so no production work is lost, but name an owner (T19 for the overlay, stay-green in T27..T32 for the master) and add it to the FR-23 coverage row.
- **N20 (decision for the human: H-OD13 over-gating).** Ten tasks name H-OD13 (T5, T6, T7, T14, T16, T17, T18, T19, T25, T36); T18 and T19 also wait on T16 and so on H-FR20PREC. With H-OD13 and H-FR20PREC open, the non-frozen tasks that can still start are T1, T2, T3, T4, T8, T9, T15, T20, T37 (and T34 only after H-OD10). Recommendation, in order of preference: (a) at the gate, record "restated text beyond the Assert literals is illustrative; build Appendices A to E as composed" (the Specification's own convention), which releases all ten with no edit; (b) at the next touch of the breakdown, split the row into H-OD13a (wording latitude of T5, T6, T7, T14, T16, T17, T18, T19, T25: default stated as Appendix text) and H-OD13b (where the reference outputs live: T36 only). The same pattern, kept from earlier revisions, applies to H-FR20PREC (T16), H-FR11I3 (T23) and H-OD10 (T34, and through it T35): the Specification builds those PROPOSED DEFAULTS as normative, the breakdown also stops on them. 28 tasks name an Hn directly (30 with T10 and T11, which wait on T21); this is N5 grown by H-OD13, not a new class of problem.
- **N21 (T1 acceptance is a capture-time property, not a Depends-on).** T1's check that `git diff <BASE> --name-only -- src server tools package.json` lists only `*.spec.ts` files is true only before the first production edit; T1 and T2..T20 declare `Depends on: none`, so only Group 0 and the linear order enforce "T1 first". A builder following `Depends on` alone could run T2 first and then fail T1's check for the wrong reason. Either say in T1 that the whole-tree clause is evaluated at capture time (TEST_WRITING) and re-checked only against the `task-a.ts` import closure, or put "Group 0 before any other task" in the Reading guide as a precondition.
- **N22 (composed prose to review at the gate; Appendix A).** The HEADINGS sentence adds "The rest of [HEADING FORM] (word limit, product name placement) still applies." FR-22 says those limits "are not asserted again in the overlay". The sentence references them rather than restating the numbers, and the plan gives a reason (Unknown 9, the global product-name-in-heading check), but it is composed text outside the FR-22 literals; the human should see it as such (H-OD13 covers it) or drop the parenthetical.
- **N23 (Q-FR41-TEST: the plan's default and the breakdown's behaviour disagree; the Specification's test wording is not met literally by default).** Plan: "Default if the human gives no answer: accept this split". Breakdown: H-FR41TEST is a `Depends on` of T12, T13, T38, T39, T40, i.e. an unanswered question stops those five tasks and the register's "default" is only "what was built". Silence must not stand for acceptance of a deviation from the approved FR-41 Tests paragraph ("invoke 'Clear All'"). The gate summary must carry it as an explicit question: accept the split (state-class behaviour tests plus disjoint per-case source-text pins; no test executes `AppComponent.clearAll()`), or require a first `AppComponent` test (a TEST_WRITING loop-back; the `runInInjectionContext` route is unproven, plan D9 item 3 says so honestly). Also align the two documents' wording on what an unanswered Hn does.
- **N24 (T12 before T13).** T12 renders the four textareas and T13 wires them into `buildGeneratorInput`, so for one commit the branch carries an input that is collected but not sent. It ships only as one pull request, and the plan's inert-input principle is about what ships, so this is acceptable; swapping the order is not possible as written (T13 depends on T12's field). Mention to the builder that T12 and T13 should be reviewed as a pair.
- **N25 (the Q-OD12 order: the placement of T-A1..T-A3 is the breakdown's choice, not the owner's).** The owner's verbatim answer is "task-a.ts T-A4 first, then output-validator.ts, then master-system-prompt.ts last". Reading guide item 9 presents the order as the owner's intent but inserts "then the rest of `task-a.ts`" after T-A4, and the linear order puts T22 to T24 before T25 and T26. The plan left commit shape to the breakdown, `Depends on` lines carry only technical dependencies (T22 on T21 is "serial, same file"), and the guide says a different order is the human's call, so nothing is decided on the owner's behalf; but putting T-A1..T-A3 before the validator is the breakdown's reading. The human may prefer them after the validator or inside the T-A4 session; relabel it as the breakdown's choice at the next touch.
- **N5 (carried, grown).** Items for the gate summary: H-OD12 (ask `task-a.ts` T-A4 first), H-FR41TEST, H-OD13 (N20), H-FR20PREC, H-FR11I3, H-OD10, H-OD11 (which products, who runs, and who runs T42), H-OD15 (no task). Every default is stated; none is chosen by this review.
- **N6, N7, N8, N9 (carried, open by design).** Unchanged: the per-task gate redefinition, T8 without a failing test, T35's track label, and the declared translator and optimizer drift (R1a, R1d, R7a) that no gate can show.

## Evidence

- `date -u` at the final write: 2026-10-18T11:01:34Z (the value in `updated_at`).
- `git rev-parse HEAD` = `6546db83ef4005e9d6a57baf51adf0b35df8d3c7`; `git merge-base HEAD main` = `120dcbc0d42b3160078cacb682dd00cc48157ca3`; `git merge-base --is-ancestor 6546db8 HEAD` exit 0; `git diff --stat 120dcbc 6546db8 -- src server tools package.json`: 56 files changed; `.arch-guard-checksums` `task-c.ts` `3bffefc3...` at `120dcbc`, `619c45a9...` at `6546db8`; `git diff 6546db8 -- src server tools package.json test`: empty.
- `bash arch-guard.sh`: "All frozen files unchanged", "ALL CHECKS PASSED".
- `grep -nE "TODO|TBD|FIXME|\?\?\?"` over the Specification, plan, task breakdown, impact analysis and Story: no match.
- T40 probe: a throw-away spec in the review scratchpad (outside the repository) importing `signal` from `file:///.../node_modules/@angular/core/fesm2022/core.mjs`, run as `npx vitest run --root <scratchpad> --environment happy-dom` (the repository's `vitest.config.ts` not loaded): 1 file, 1 test passed; the same calls in plain Node ESM printed `signal ok { a: 'x' }`. It supports, and does not replace, T40's first-run check.
- `grep -c '^### Notes'` over the task breakdown: 20; `grep -c '^## T[0-9]'`: 42.
- Task header counts re-derived: prompt 23 (T1, T9, T14-T24, T27-T33, T36, T37, T42), angular 19 (T2-T8, T10-T13, T25, T26, T34, T35, T38-T41), frozen 12 (T21-T32); all twelve FROZEN cells read and each begins `BLOCKED-UNTIL-APPROVED`.
- Open Decisions v4 OD-13: "blocking: false"; history event "Plan gate NOT approved" (2026-10-18T10:08:01Z) read for the owner's verbatim answers; each of Q1, Q-TRANS, Q-OPT, Q-SCOPE, Q-CLEARALL, Q-OD2 / 19 / 20, Q-OD7 / 8 / 9 / 14 / 18, Q-OD11, Q-CODEALT, Q-SIMPL, Q-OD12 compared with the plan and breakdown text.
