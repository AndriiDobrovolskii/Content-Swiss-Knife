---
artifact: plan_review
story: US-8.1
version: 4
status: DRAFT
owner: so-plan-reviewer
created_at: 2026-10-15T16:00:00Z
updated_at: 2026-10-15T16:00:00Z
supersedes: docs/reviews/plans/US-8.1-plan-review.md#3
inputs_consumed:
  - key: story
    version: 3
  - key: specification
    version: 3
  - key: impact_analysis
    version: 2
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 4
open_decisions_blocking: false
---

# Plan Review: US-8.1 — One master FAQ, translated; `<b>` not `<strong>`; standalone FAQ Generator (v3 layout delta)

**Verdict:** PASS
**Loop-back:** n/a

> `PASS` here is **not** human approval. Only `/so:approve` records that (AGENTS.md section 10). The plan and task breakdown
> stay `DRAFT` until HUMAN_PLAN_APPROVAL.

This is plan_review v4. It supersedes plan_review v3 (APPROVED), which reviewed implementation plan v1 and task breakdown v3 for
Specification v2 and is stale for this revision; its text is recoverable with
`git show 5cedb99:docs/reviews/plans/US-8.1-plan-review.md`. All inputs consumed are current: Story v3, Specification v3
(APPROVED at HUMAN_SPEC_APPROVAL, c7098af), impact analysis v2, implementation plan v2 (DRAFT) and task breakdown v4 (DRAFT); none
is `SUPERSEDED`, and `open_decisions_blocking` is false (Open Decisions v2, OD-1 to OD-20, all non-blocking).

## Summary

The v3 layout delta (FR-24 to FR-28, NFR-9; AC-21 to AC-26) is buildable as written. It is a two-file, template-and-labels change
(`app.component.html`, the `TRANSLATIONS` literal in `app.component.ts`) plus one new source-text spec, decomposed into four small,
correctly ordered, single-track tasks (T14 to T17). I re-derived every claim against the repository and found the design sound: the
empty-state fix is scoped by `appMode()` only, cannot change another mode, leaves the FR-18 data fields alone, leaves the shared
`supplementalContent` key alone, and leaves the brittle `>= 3` pin undisturbed. T1 to T13 are built, match git and the pipeline
status, and their task text is unaltered. The most important thing to carry forward is not a defect in the plan: AC-22's geometric
clause has **no owner able to perform it** in the pipeline as defined (finding N1, a human decision), and several guard pins need
word-boundary and slice-scoping care when TEST_WRITING writes them (N2, N3).

## Verification performed (real runs, this review)

| Check | Result |
|---|---|
| `npx tsc --noEmit` on the current tree | no diagnostics printed, exit 0 |
| `bash arch-guard.sh` | `ALL CHECKS PASSED`, all frozen files unchanged |
| `npx vitest run` (whole `test:logic`) | 184 files passed, 6343 tests passed, 3 skipped (matches the breakdown's "184 files, all green") |
| Line-1447 empty-state condition extracted by balanced-paren scan and evaluated for `appMode = 'faq-generator'` | before a run: **true**; during a run: false; after a FAQ-only run (`mainHtmlUa ''`, `translations {}`, `seoData/slugData null`, populated `faqArtifacts`): **true**; after a no-FAQ run: **true** |
| `git diff b6ceebe 65c620a -U0` on the task breakdown | hunks outside the new v4 sections are only the front matter, the intro, the open-points list and 13 inserted `Status (v4): DONE` lines (one per T1..T13); no line inside any T1..T13 task body was changed or removed |
| Per-task commits da59195, 3698434, c7197f0, d09f092, 54ee224, f3343e1, 7f534d7, 9f20a15, e8dcf56, 3e9db41, 88670be, c04096a, 7a0613e; fixes 8c89bce, 1ac82e1; test correction c62e30a | all exist on `feat/US-8.1-single-master-faq`, subjects match the status table |
| `en` and `uk` blocks of `TRANSLATIONS`, top-level keys by the four-space regex | 170 and 170, no one-sided key, no duplicate (the baseline for the parity pin) |
| Bytes of "Обов'язково" in the Specification | apostrophe is `0x27` (ASCII), as plan D15 states |

Not run in this review (so not claimed): `npm run build`, `npm run test:components`.

## 1. Specification coverage (re-derived, both directions)

I rebuilt the mapping from the Specification and the Story, not from the plan's tables.

| FR / NFR | AC | Reached by task(s) | Verdict |
|---|---|---|---|
| FR-1 to FR-14 | AC-1 to AC-9, AC-14, AC-16 to AC-20 | T1 to T8, T10 (DONE; see the DONE verification below) | covered |
| FR-15 to FR-20 | AC-10 to AC-13, AC-15 | T8 to T12 (DONE) | covered |
| FR-21 to FR-23 (section 4) | none | T1, T3, T6 (DONE) | covered |
| FR-24 | AC-21 | T15 (pin red first; the guard half stays green) | covered |
| FR-25 | AC-22 | structural clauses: T15 (nothing else may sit between the tab bar and the result; T16 and T17 must add no wrapper or class); geometric clause: manual, no task | covered, with the manual clause called out (N1) |
| FR-26 | AC-23 | T16 | covered |
| FR-27 | AC-24, AC-25 | T14 (both-language source), T17 (binding); enablement is FR-16 and is untouched, held by existing pins | covered |
| FR-28 | AC-26 | T15 (empty state), T14 and T17 (labels), T16 (order guards) | covered |
| NFR-9 | none | T14 to T17 | covered |

AC-1 to AC-26: each has at least one task or, for AC-25, an existing built task plus the existing pins that T16 and T17 re-run; AC-22
has one designed-manual clause. No FR is unreached.

| Task | Traces to | Verdict |
|---|---|---|
| T14 | plan D15 -> FR-27, FR-28 | ok |
| T15 | plan D12, D13 -> FR-24, FR-25, FR-28 | ok |
| T16 | plan D14 -> FR-26 | ok |
| T17 | plan D15 -> FR-27, FR-28 | ok |

No scope creep. Checked by name against the Specification's *Out of scope*: no task hides the pre-run tab strip (OD-11), reorders the
validation and repair panels (OD-12), renames or restyles the version tabs (OD-14), adds a failure-state message (OD-16 / OD-8),
changes the `alertFillFields` text (OD-17), touches the FAQ-only TXT/ZIP export (OD-9e), the FAQ pipeline, or any other mode's
layout, label or empty state. The one item beyond the literal requirements is a test-only whole-dictionary `en`/`uk` key-set parity
pin (see N8); it asserts no new product behaviour.

### T1 to T13: DONE claims and "not silently altered"

- The status table commits all exist and their subjects match the task titles. `pipeline_status` (DRAFT, last updated 2026-10-15T10:15Z)
  agrees on every task; its cell for T7 reads "IMPLEMENTED, owned tests GREEN" while its body and the breakdown say complete (N9,
  wording only).
- The whole logic suite is 184/184 files green on the current tree, `tsc --noEmit` is clean and `arch-guard.sh` passes, so the built
  state the delta rests on is real, not claimed.
- The v4 diff contains no change inside any T1 to T13 body (see the table above). The v3 gate, constraints and open points were
  extended, not rewritten; the v3 `create-form.gs` open point was re-worded to "presented at the v3 gate and approved" and that is
  true (history.jsonl: HUMAN_PLAN_APPROVAL 2026-10-14T16:00:08Z, no approver comment).
- The two post-T13 loop-back fixes are recorded as fixes, not tasks. 8c89bce is the second, separate section 9 grant for
  `task-c.ts` (history.jsonl: V-1/V-2 fix under "the operator second section 9 grant", checksums re-baselined in the same commit).
  Neither is re-opened by v4.

## 2. FROZEN files (AGENTS.md section 9)

| Task | Frozen file touched | section 9 stop present? | Sibling-file pattern used? | Verdict |
|---|---|---|---|---|
| T1 (DONE) | `src/prompts/task-c.ts` | yes (operator instruction quoted in `pipeline_status`; second grant for 8c89bce recorded) | additive edit under recorded permission | ok, built |
| T2 to T13 (DONE) | none | n/a | n/a | ok |
| T14 | none (`app.component.ts`) | n/a | n/a | ok |
| T15 | none (`app.component.html`) | n/a | n/a | ok |
| T16 | none | n/a | n/a | ok |
| T17 | none | n/a | n/a | ok |

Plan assumes approval it does not have: **no**. Plan v2 states that the earlier `task-c.ts` permission "covered FR-1 to FR-23 only and is
neither used nor extended"; `.arch-guard-checksums` is byte-unchanged in every v4 acceptance check; no `--rebaseline`. `arch-guard.sh`
passes today (run in this review), so the frozen baseline matches the files as built.

## 3. Architecture rules (AGENTS.md section 3)

| Rule | Checked | Finding |
|---|---|---|
| 1 — no direct SDK outside `server/providers/` | by reading the v4 file list | clear; no `server/**` or service file is in the delta |
| **2 — retrieval separate from generation** | deliberately, by reading | clear for the delta (no service, prompt or orchestrator file is touched). Re-checked the built `runFaqPipeline` region (lines 807 onward): its only model call is `this.llm.generateText`; the one `this.retrieval` use in the orchestrator is `extractContent` (line 2102), unrelated to the FAQ |
| 3 — prompt text out of services | by reading | clear; the delta adds only UI label strings, which are not prompt text |
| 4 — no key in the bundle | by reading | clear; no key path |
| 5 — no existing feature breaks | by pins | clear by construction for the empty state (new expression identical to today's for every mode but `faq-generator`); the shared `supplementalContent` key and `generatorForm` are untouched and guarded |
| `STORE_REGISTRY` sole source of locales/currency | by reading | clear; the delta reads and writes no language list, locale or symbol. The Ukrainian string is a UI-language label, not a store locale |
| `systemBlocks` not collapsed into `userContent` | by reading | not applicable to the delta; unchanged for the built pipeline |

## 4. prompt -> schema -> renderer -> validator

- Links touched: **none** by the delta (Specification: "AGENTS.md section 4 in play: none"). FR-21 to FR-23 are not weakened.
- Stay in agreement: n/a for the delta; the built FAQ chain was reviewed in v3 and is unchanged.
- Contract-before-consumer ordering holds: **yes** where it exists — T14 (the `supplementalContentRequired` key in both blocks) is
  scheduled before T17 (the binding that reads it).
- section 4 criteria the renderer must keep satisfying: none to list for the delta; the built FAQ keeps FR-21 to FR-23 as before.

## 5. Task quality

| Check | Result |
|---|---|
| All eight fields present on every task | yes: Track, Depends on, FROZEN, What changes, Files, Tests to turn green, Acceptance check, Notes on T14 to T17 |
| Acceptance checks observable | yes: named vitest `-t` selectors, `git diff -U0` line counts, tsc, lint, build, arch-guard. One wording defect: N4 |
| Each task could end in one green commit (section 13) | yes under the per-task gate convention already approved at the v3 gate: a pin owned by a later task may still be red (T14, T15, T16 leave T16/T17-owned pins red). The convention changes no threshold; for the delta it is stricter than v3 (empty compile allowlist, lint and build exit 0 after every task) |
| No task spans two tracks | yes, all four are `angular` |
| Ordered by dependency and risk, riskiest first, rationale stated | yes: T15 first (the only edit that can change another mode's screen), T14 independent (disjoint file), T16 and T17 serial after T15 because all three edit `app.component.html`, T17 after T14 and T16. Dependencies are acyclic |
| Fixture updates sit with the change that moves them | n/a, no fixture or golden moves; the new spec is created by TEST_WRITING, not by a task |

Sizing: T14 adds two lines, T15 changes one line, T16 relocates one nine-line element (verified: lines 625 to 633), T17 changes one
binding. Each is a single-requirement commit.

### Verification of the plan's repository claims (not taken on trust)

- The empty-state block: `noContentYet` and `fillFormStart` occur once each (html lines 1450 and 1451), in the single `@if` at line
  1447, whose icon `fa-file-code` is at line 1449. The condition is exactly as plan D12 quotes it.
- The block is reached by a data-only guard, and `content` is one shared signal (`setMode()` does not reset it, line 775); a
  data-derived fix would have leaked into SEO, Slug and UA Description. The chosen `appMode()` conjunct cannot.
- FR-18 is held by `content-orchestrator.faq-standalone.spec.ts:176` (`mainHtmlUa === ''`), unmodified.
- The `>= 3` pin (`template-wiring.spec.ts:236-239`) counts lines containing both `appMode() === 'slug-generator'` and
  `appMode() === 'faq-generator'`: exactly three today (lines 1032, 1280, 1289). T15's new conjunct uses `!==` on line 1447 and
  mentions no `slug-generator`, so the count and the pin are undisturbed. Line 1316 (`!==`) is not counted and is not edited.
- FAQ form block (`@else if (appMode() === 'faq-generator')`, lines 570 to 651): current order is Store, Product Name, Description,
  Tech Specs, Supplemental. `[required]="true"` is on the Supplemental input; the `*` is rendered by `source-input.component.html`
  line 4 (`@if (required) { <span class="text-red-500">*</span> }`).
- `uiLabels().supplementalContent` is read at exactly two template sites: line 279 (`generatorForm`, used by Generator and UA
  Description) and line 626 (FAQ). Relabelling the shared key would change three forms; adding a FAQ-only key does not.
- TRANSLATIONS: `en.supplementalContent` line 147, `uk.supplementalContent` line 320, the existing escaped-apostrophe precedent at line
  302 (`обов\'язкові`). The new `uk` literal needs `\'`; an unescaped quote is a `tsc` syntax error caught by `npm run lint`.
- Container between the tab bar and the result: three siblings only (validation `<details>`, repair `<details>`, the empty-state
  block); the container class is `flex-1 overflow-y-auto p-8 relative` (no centring token), the FAQ panel root is
  `max-w-5xl mx-auto space-y-6` (no `h-full`, `mt-*`, `pt-*`). The overlay at line 1090 is `absolute inset-0` and the comparison at
  line 1130 is `fixed`; neither is an in-flow sibling.

## 6. Test strategy

| Check | Result |
|---|---|
| Every task names test files **and** runner | yes: `app.component.faq-layout.spec.ts` plus the existing specs, all `test:logic` |
| Component specs named `*.component.spec.ts` | n/a. The new file is deliberately **not** a component spec: `angular.json` includes `**/*.component.spec.ts` for `ng test`, and `app.component.faq-layout.spec.ts` does not match it, so it runs in `vitest run` and `test:components` stays at two files |
| Untested tasks justify changing no behaviour | n/a, every task has pins |
| Failure paths from the FRs are covered | FR-24 failure path (a run that stores no FAQ) is a grid state of the condition pin; FR-27 and FR-28 failure paths are the guards; FR-25's failure path asserts nothing beyond FR-24 |
| Nothing relies on weakening/skipping a test (section 7.7) | yes: no existing spec is edited, and the delta modifies no test |

### Red-first versus baseline-green classification, checked against the code

- **FR-24 / AC-21 evaluated condition: genuinely red before T15** (my own evaluation above: three of the four grid states are `true`
  today). It is **not** red in every row: the "during a run" state is already `false` (the existing `!isGenerating()`), so it is a
  regression guard inside a red-first pin (N2).
- **FR-26 order pin: red before T16** (Supplemental `valueChange` currently follows Description and Specs).
- **FR-27 template side and the "exactly one use of the shared key" count: red before T17** (two uses today).
- **FR-27 source side: red before T14** (the key does not exist).
- **FR-28 oracle comparison: green at baseline and not vacuous.** The oracle is a literal copy of today's condition and the grid
  includes the trap states (stale `faqArtifacts` with empty output fields; `seoData`, `slugData` or `mainHtmlUa` set; generating), so a
  data-derived fix would turn it red. It holds after T15 because the new expression equals the oracle for every mode but
  `faq-generator`.
- **Other baseline-green guards** (`generatorForm` binding, the two literal values, the 170/170 parity, the FR-25 structure class
  tokens, the `noContentYet` single-occurrence): each can fail on a plausible wrong implementation, so none is vacuous, subject to
  the matching cautions in N3. The two-way split of the FR-27 parity pin (equality half is a guard, "contains the new key" half is
  red-first) is correct and V4-3 requires it.
- **Empty compile allowlist is achievable.** The new spec is source-text only: it imports `vitest`, `node:fs` and `node:path`, nothing a
  task creates, and not `AppComponent`. `tsconfig.json` includes `src/**/*` and has no `strict`, so such a file cannot carry a
  missing-symbol diagnostic; `tsc --noEmit` is clean today.
- **Dynamic evaluation of the template condition.** The pin compiles an extracted expression (a `new Function`-style evaluation). I
  checked: `arch-guard.sh` has no `eval` / `Function` rule, `npm run lint` is plain `tsc --noEmit`, there is no ESLint config; no rule
  forbids it. It runs only on repository-owned template text inside a test (N6).

## 7. Impact-analysis fidelity

- Plan consumed the survey rather than re-deriving it: **yes**. The plan's two-file list, the shared-key finding, the
  data-derived-fix trap, the wiring-pin analysis and the "no `strict`" unknown are the survey's, re-verified and, where the plan found
  the survey's correction (no existing key-for-key parity spec), carried into a new pin.
- Files touched but not surveyed: **none**. The plan touches `app.component.html`, `app.component.ts` and the new spec, all listed.
  The survey's "must change" list for this revision is exactly those two files plus the spec the survey called for.

## Findings

### Blocking

None.

### Non-blocking findings (travel with the PASS)

**N1. AC-22's geometric clause: manual by design, and nothing in the pipeline owns performing it. Flagged for the human; not decided
here.**
- The Specification (FR-25, NFR-9, OD-15 default) already fixes that the geometric clause is verified only by a manual browser check,
  and the human approved Specification v3 with that default. The plan and breakdown honestly mark it manual and give it no task.
- Facts for the decision, against AGENTS.md section 5: section 5 requires the failing test first and says to test behaviour; it has
  no category for a manual check, and the Definition of Done (section 6) has a "not machine-checkable" item that names Rule 2, the
  section 4 HTML criteria and the registry, not UI geometry. The repository has no layout engine (`happy-dom` has none) and no
  browser-test tool, so a stronger automated check would need a new dependency (section 7.8: a scope change for the human).
- Ownership gap: the breakdown assigns the check to "QUALITY_GATE (who, when, result)". The owning skill, `so-gate-enforcer`, runs
  commands and reports real output; it has no manual-check step. The last quality-gate report for this Story (section 8, line 304)
  recorded "Browser / manual check: NOT performed", and the operator then found the AC-21 defect by hand at HUMAN_PR_APPROVAL. Unless
  the human names who performs the AC-22 check (and where it is recorded), expect it to be reported "NOT performed" again and
  RECONCILIATION to find no evidence for that clause.
- Options for the human (not chosen here): accept the default; name the operator as the performer, recorded at HUMAN_PR_APPROVAL;
  require a stronger check.

**N2. Mixed baseline states inside "red first" pins; TEST_WRITING must split them (V4-3 only splits the parity pin).**
- T15: the "during a run" grid row of the FR-24 pin is already `false` at baseline. Tag it `[baseline-guard]` (or keep the red-first
  assertion aggregate over the three red states) so `-t "owner T15"` and the V4-6 baseline-state report are accurate.
- T16: "the block still has exactly three `app-source-input`" is green at baseline; it must not carry an `(owner T16)` tag.
- T17: "still has `[required]="true"`" is green at baseline; same.

**N3. Matching and slicing hazards that would make a guard vacuous or a red pin unsatisfiable. TEST_WRITING should state these in its
constraints.**
- `uiLabels().supplementalContent` is a prefix of `uiLabels().supplementalContentRequired`. The "exactly once, inside `generatorForm`"
  count and the `generatorForm` binding checks must match the exact key (a boundary or the closing quote); a substring count is 2
  before and after T17 and could never go green.
- `fa-file-code` occurs twice in the template (line 1449, the empty-state icon, and line 1856, an unrelated download button). The
  "block also holds the icon" check must be scoped to the empty-state block.
- `@for (tab of tabDescriptors()` occurs twice: inside the tab-bar `<header>` (line 1295) and at the result view (line 1455). The
  FR-25 slice must start after the `</header>` that closes the tab bar, or it measures the wrong span.
- The new key name is a prefix match for nothing else, but the premise assertions (block found, non-empty slice) V4-2 requires are what
  keep these from passing vacuously; keep them.

**N4. T17's whole-delta diff check names the wrong range.** It uses `git diff --stat <commit before T14>..HEAD` and says the new spec is
added "before T14". The v4 execution order puts **T15 first**, so that range omits the riskiest commit. It should read "the commit
before the first v4 task". The per-task scope checks still cover T15, so this does not block, but the wording should be fixed at the
next revision.

**N5. The required marker `*` (AC-24, AC-25) is unpinned at the rendering level.** The marker comes from an unchanged shared component
(`source-input.component.html` line 4); that component has no spec. The delta's pins assert `[required]="true"` on the input, not that
the component renders `*`. A one-line source-text pin on the component template would close it. Not in the plan; a TEST_WRITING
option.

**N6. Dynamic evaluation in a test.** No rule forbids it (checked above). It executes repository-owned template text only. Mention it to
the security reviewer; the alternative is a hand-written parser of the six-token expression. Either is acceptable.

**N7. Tension with AGENTS.md section 5, carried from the standing decision.** Section 5 asks for rendered, user-observable
assertions for components and says not to query by CSS-implementation selectors; the FAQ-layout pins are source-text pins, including
class-token checks (`h-full`, `justify-*`, `mt-*`) as the structural proxy for AC-22. This is the idiom the repository already uses for
`AppComponent` ("no `AppComponent` spec" by standing decision: heavy DI), it was in the v3 plan the human approved, the plan states
it as rejected alternatives 11 and 20, and `happy-dom` cannot measure layout. It is flagged for the human, not decided.

**N8. The condition-text pin over-specifies one form and the parity pin couples unrelated keys.**
- Pin (c) requires the condition text to contain `appMode() !== 'faq-generator'`; the evaluated behaviour pin is the real guard, and a
  behaviourally equivalent form (for example a negated list) would fail the text pin. Acceptable and consistent with the plan's
  "single `appMode()` conjunct" decision; note it.
- The whole-dictionary `en`/`uk` key-set parity pin (170/170 today) will fail any future one-sided key anywhere in the dictionary. That
  is the strict alternative the plan chose over a name-only pin (Rejected 23); no defect.

**N9. Status wording and stale artifacts.** `pipeline_status` v2 cell for T7 reads "IMPLEMENTED, owned tests GREEN" (body and breakdown:
complete, DONE). `pipeline_status`, `test_strategy`, `ac_test_matrix` and `test_generation_report` still record plan v1 / task
breakdown v3 as inputs and cover AC-1 to AC-20 only; they are revised by TEST_WRITING and IMPLEMENTATION re-entry, which this gate
precedes.

**N10. Decisions carried to the human at HUMAN_PLAN_APPROVAL (none decided here).** OD-13 (Ukrainian label default
"Додатковий контент (Обов'язково)", ASCII apostrophe, `\'` in source), OD-11 (pre-run empty tab strip), OD-12 (panels above the result,
FR-25 holds vacuously when a panel is shown), OD-16 (blank central area after a run that stores no FAQ), OD-17 (`alertFillFields`
still names Original Description), OD-6, OD-8, OD-9(e) (the TXT control appears for a FAQ-only run), and N1 above.

## Verdict rationale

Every one of the seven axes is clear for a PASS. The delta's design decisions D12 to D16 are right and verified: the guard is scoped by
mode, not data (the choice that matters, because `content` is a shared signal and the other modes would otherwise silently change);
the shared label key and `generatorForm` are untouched; the new key is added to both language blocks with the correct escape; the
`>= 3` pin and `.arch-guard-checksums` are untouched; no FROZEN file, `STORE_REGISTRY` surface, prompt, renderer, validator or
server file is reached. The decomposition is correct and the ordering holds. The findings above are about how the tests are written
and where one clause is verified, not about the design or the task list, so none of `changes_required`,
`changes_required_tasks` or `changes_required_specification` applies: a Specification fault would not be the cause either, because
the Specification explicitly accepts the manual clause (OD-15) and N1 is a question of who performs it, which is a human decision
rather than a Specification defect.

`PASS` is not human approval. The plan and task breakdown stay `DRAFT` until `/so:approve` at HUMAN_PLAN_APPROVAL.
