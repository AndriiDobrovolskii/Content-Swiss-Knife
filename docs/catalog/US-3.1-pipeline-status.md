---
artifact: pipeline_status
story: US-3.1
version: 2
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-09-27T10:00:00Z
updated_at: 2026-09-28T10:15:00Z
supersedes: docs/catalog/US-3.1-pipeline-status.md#1
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 17
  - key: open_decisions
    version: 4
  - key: impact_analysis
    version: 4
  - key: implementation_plan
    version: 7
  - key: task_breakdown
    version: 6
  - key: plan_review
    version: 6
  - key: test_strategy
    version: 2
  - key: ac_test_matrix
    version: 2
open_decisions_blocking: false
---

# Pipeline Status — US-3.1: Make the repair gate actually block ungrounded content and stop the brand-core/heading-form rule conflict

**Verdict (attempt 2, angular track, T7 only): `CHANGES_REQUIRED` → `TEST_WRITING`.** This dispatch's
scope was T7 alone — T1–T6, T9, T11, T12 were already done/committed (v1, unchanged since), and
T8/T10 remain out of scope (`track: prompt`, FROZEN files, no fresh in-session "modify [filename]"
instruction — see §4, unchanged since v1). **T7 was rebuilt in full against Implementation Plan v7's
current D5/D5(e)/D5(f) design** (the CTA-heading-only, `schemaVersion`-conditional
`heading-brand-core-missing` check, narrowed from v1's stale two-blessed-position attempt) —
**not** a resumption of v1's parked stash. All 26 of T7's own named/rewritten tests
(`heading-style.spec.ts`'s FR-6/FR-7 blocks, `repair-strategy.spec.ts`'s
`heading-brand-core-missing` block) pass, and `heading-style.v4.spec.ts` (also named by the task
breakdown) is fully green. Running the full suite next surfaced **two** previously-green,
pre-existing tests — neither part of T7's own named set, neither touched by `TEST_WRITING` for this
Story — that a **correct** FR-6/FR-7 implementation now legitimately breaks, because their own
fixtures are stale (a content-derived mismatch FR-7 is specifically designed to catch). Per
`so-builder`'s own constraint (never modify a test file; report a wrong test as a finding), T7's
code was **parked again via `git stash`** (not committed) rather than shipped against two red,
previously-passing tests — see §3. This is a materially different outcome from v1: v1's stash broke
~30 tests via a real design defect (no locale-aware unit matching, a stale two-position design);
this attempt's stash breaks exactly 2 tests, both traced to stale test fixtures outside this task's
authority to edit, with a named, precise recalibration for each.

Branch: `feat/US-3.1-qa-gate-brand-core-fixes` (unchanged).

## 1. Task outcomes

| Task | Track | Outcome | Commit | Notes |
|---|---|---|---|---|
| T1 | angular | done | `df9ec36` | Unchanged since v1. |
| T2 | angular | done | `e48fa1b` | Unchanged since v1. |
| T3 | angular | done | `a01bd12` | Unchanged since v1. |
| T4 | angular | done | `4dfccf0` | Unchanged since v1. |
| T5 | angular | done | `fb03d68` | Unchanged since v1. |
| T6 | angular | done | `fbf4859` | Unchanged since v1. |
| T7 | angular | **blocked** (`changes_required_tests`) | not committed — stashed | Rebuilt in full against Implementation Plan v7's current design (not v1's stale attempt). All 26 own named tests pass. Blocked by 2 pre-existing, unowned tests with stale fixtures — see §3. |
| T8 | prompt | **not attempted** | — | Out of scope this dispatch (angular only); FROZEN file, no fresh-session "modify" instruction. Unchanged since v1 — see §4. |
| T9 | angular | done | `c78e6da` | Unchanged since v1. |
| T10 | prompt | **not attempted** | — | Out of scope this dispatch; FROZEN `task-b.ts`, no fresh-session "modify" instruction. Unchanged since v1 — see §4. |
| T11 | angular | done | `0c14353` | Unchanged since v1. |
| T12 | angular | done | `3e36e4e` | Unchanged since v1. |

## 2. Measured state (real command output, T7's diff applied, before parking)

| Check | Result |
|---|---|
| `npx vitest run src/utils/heading-style.spec.ts src/utils/repair-strategy.spec.ts src/utils/heading-style.v4.spec.ts` | 1 failed \| 144 passed (145) — the 1 failure is `heading-style.spec.ts`'s pre-existing "tolerates the unit-spacing normalization…" test (§3, finding 1); every one of T7's own 26 new/rewritten tests, plus every pre-existing test in these three files bar that one, passes |
| `npm run test:logic` (`vitest run`, full suite) | 5 files failed, **12 failed** / 3872 passed / 3 skipped (3887). Of the 12: **10 are T8/T10** (`master-system-prompt.spec.ts` 1, `task-a.spec.ts` 1, `task-b.spec.ts` 8 — pre-existing, out of scope, unchanged from v1's baseline), **2 are T7 collateral** (`heading-style.spec.ts` 1, `content-orchestrator.simplified.spec.ts` 1 — see §3) |
| `npm run test:components` (`ng test`) | 2 files, **23 passed**, 0 failed |
| `npm run lint` (`tsc --noEmit`) | **clean, 0 errors** |
| `bash arch-guard.sh` | **ALL CHECKS PASSED** — all five FROZEN checksums unchanged (T7's two files are not FROZEN; T8/T10 never touched) |
| `npm run test:coverage` / `npm run build` / `npm run validate:harness` | not run — `QUALITY_GATE`'s concern, per this artifact's own v1 convention (unchanged reasoning) |

## 3. T7 — rebuilt in full, blocked by 2 pre-existing tests (`changes_required_tests` → `TEST_WRITING`)

### 3.1 What was built

`checkProductNameStuffing`/`checkProductNameStuffingDoc` in `src/utils/heading-style.ts` restructured
into two passes, exactly per Implementation Plan v7 D5:

- **Pass 1 (structural blessed-position identification).** HTML: `blessedFirst` = the first `<h2>`
  outside `section.specs`; `closing` = that same population's own last `<h2>`, blessed only when
  *that* heading is question-shaped (not "whichever question-shaped heading sorts last" — a
  divergence caught and fixed during this attempt, see §5 finding 5). Doc: `blessedFirst` = the
  heading at `doc.functionality[0].heading` (by path, so a doc that omits §3 entirely has none);
  `blessedClosing` = `doc.cta.heading`, unconditionally, regardless of `schemaVersion` (FR-6's own
  CTA position is not retargeted by this task — a documented, non-blocking parallel gap, separate
  from FR-7's retarget below).
- **Pass 2 (FR-6, unchanged in substance).** The existing per-heading stuffing loop, with one new
  exemption: the full-pattern branch no longer flags a blessed-position heading when
  `productShort(name) === name` (the degenerate case) — AC-2's own fix.
- **FR-7 — `heading-brand-core-missing`, new, error-severity, CTA-heading position only.** Mandatory
  presence of `productShort(productName)` at: the HTML closing heading (every `schemaVersion`);
  `doc.cta.heading` for Doc `schemaVersion: '3.0'`; `doc.localizedName` for `'4.0'` (a
  `render-description.ts`-driven retarget). `doc.functionality[0].heading` is never checked by this
  rule, under any `schemaVersion` — narrowed from v1's stale two-position design per Specification
  v16/v17. A new locale-aware matcher, `productNamePatternWithUnitLocale()` (gated on
  `CYRILLIC_LOCALES`, sourced from the existing, read-only `LATIN_TO_CYRILLIC_UNITS` table), serves
  this presence test only — never the shared `productNamePattern()` FR-6 still uses unmodified (the
  exact false positive that broke v1's attempt on the real uk-UA corpus is now closed without
  widening the shared matcher). The `doc.localizedName` leaf additionally carries a shape
  requirement (banned sentence-terminal/quote characters, an occurrence-count exemption and a
  trailing-position check, both computed against the raw `opts.input.name`, plus an unconditional
  line-break ban) via a new `localizedNameShapeIssue()` helper, checked only once presence has
  already passed for that leaf (so the two checks never double-report the same finding).
  `repair-strategy.ts` gained a matching `heading-brand-core-missing` entry (ladder
  `['field-scoped', 'block-scoped']`, `fieldInstruction` dispatched by `issue.path`: bare-name
  wording for `doc.localizedName`, heading-oriented wording otherwise).

**All 26 of T7's own named tests pass** (`heading-style.spec.ts`'s "FR-6/FR-7: blessed-position
exemption and brand-core presence" / "the doc.localizedName leaf, schemaVersion-conditional
retarget" / "the Cyrillic-unit-aware presence matcher (D5(e))" / "the doc.localizedName shape
requirement" / "FR-6/FR-7 disjointness" blocks — 21 tests; `repair-strategy.spec.ts`'s
"heading-brand-core-missing (T7, FR-7)" block — 5 tests), and `heading-style.v4.spec.ts` (also
named by the task breakdown) is fully green. The three collateral regression checks the task
breakdown explicitly named as `TEST_WRITING`'s own prior fix — `content-orchestrator.doc-gate.spec.ts`,
`.hook-pattern.spec.ts`, `.ua-doc-pipeline.spec.ts` — all pass (confirmed the `doc-gate.spec.ts`
"sentence-too-long is repaired in place" test, which was red against this Story's OLD, unmodified
`heading-style.ts` because the now-truthful `makeDoc()` CTA placeholder trips the old,
unconditional full-pattern bug, is green once T7's degenerate-blessed exemption lands — proving the
fixture fix and this task's code change are the matched pair the task breakdown intended).

### 3.2 What blocks the commit: 2 pre-existing tests, both with stale fixtures

Both were green before this dispatch and are broken by a **correct** implementation of FR-6/FR-7
(verified by reverting only these two production files and confirming both pass again against the
unmodified code — i.e. neither is a wiring mistake in this attempt). Neither is named in
`test_strategy` v2 / `ac_test_matrix` v2 / `test_generation_report` v2, and neither is in the set of
files this session found already modified by `TEST_WRITING` for this Story. `so-builder` does not
own test files (`.claude/skills/so-builder/SKILL.md`) — both are reported here, not edited.

1. **`src/utils/heading-style.spec.ts:268-272`, `'tolerates the unit-spacing normalization the
   artifact applies to the name'`** (in the pre-existing `'validateHeadingStyle — product-name
   stuffing'` block, not the new FR-6/FR-7 block). Its fixture is a single, isolated `<h2>` — which
   is therefore, unavoidably, both the structurally-first and the only `<h2>` in the tested
   document — carrying the exact degenerate `productShort(name) === name` form of the name. That is
   precisely the shape AC-2's own fix (Pass 1's structural blessed-first identification, paired with
   the degenerate exemption) is built to exempt, and the new
   `'does not flag the short(=full) form at the first §3 heading or the §9 closing'` test in the same
   file asserts exactly that for a multi-heading fixture. This old test's assertion
   (`toHaveLength(1)`) pins the pre-fix bug this Story exists to remove, for the one fixture shape
   (a single heading) no new test happens to cover. **Suggested recalibration:** prepend a
   non-product-named heading (e.g. `h2('Вступ') + h2('Поради щодо експлуатації Ortur H20 20 W')`,
   asserting on the combined `issues`) so the tested heading is structurally non-blessed, preserving
   the test's actual, stated intent — digit/letter-spacing tolerance in the full-pattern match — sсope
   without exercising blessed-position semantics at all.

2. **`src/services/content-orchestrator.simplified.spec.ts:351-361`, `'the FAQ request does not
   depend on the template: same input, same FAQ prompt (simplified vs Full)'`**. The `full` harness
   (line 355) is built with `EXPERT3D_CORPUS_DOC` (the real `expert3d-ortur-h20-20w.doc.json`
   fixture, whose `cta.heading` genuinely names "Ortur H20 20 Вт") but `full.orchestrator.generate()`
   (line 357) is called via `input({ supplementalContent: 'Faq material.' })` **without** overriding
   `name`, so `productName` stays at this file's default, `'eSUN PLA+'` — a name with no relation to
   the mocked doc's own content. This mismatch was harmless before FR-7 (nothing previously checked
   whether `productName` and the doc's own heading content agreed); now `heading-brand-core-missing`
   correctly fires (`productShort('eSUN PLA+')` = `'eSUN'`, absent from the real Ortur CTA heading),
   spending the run's one field-scoped repair attempt. The harness's default `generateText` mock has
   no case for a field-scoped repair call and falls through to its `STUB_HTML` catch-all (an HTML
   string), which then fails Zod's plain-text-field check on re-validation
   (`cta.heading: Plain-text fields may not contain HTML tags`) and exhausts the `maxRepairs: 0`
   budget, throwing (`assertDocRendered`) instead of completing. This is the one sibling
   fixture-truthfulness gap Impact Analysis v4's own enumeration — and its own Unknown #8, which
   asked only about `test/fixtures/simplified-docs.ts`'s `sparePartsDoc()`, confirmed independently
   this attempt to be unaffected (its `localizedName` and the fixture's own `NAME` constant already
   agree) — did not name. **Suggested recalibration:** pass `name: 'Ortur H20 20 W'` in the `full`
   harness's `generate(input({...}))` call at line 357, matching the other three `TEMPLATE_RUNS`
   entries' "Full description" case (line 320) and the doc's own real content, so `input.name` and
   the mocked Doc agree.

### 3.3 Action taken

T7's two files (`src/utils/heading-style.ts`, `src/utils/repair-strategy.ts`) were reverted via a
**pathspec-only** `git stash` (not `-u`, so `TEST_WRITING`'s own uncommitted spec/doc changes for
this Story were left untouched in the working tree) rather than committed against two red,
previously-passing tests. The stash is preserved:

```
stash@{0}: US-3.1 T7 rebuild (angular, complete against Implementation Plan v7 D5/D5(e)/D5(f)) -
           parked: 2 pre-existing tests need TEST_WRITING recalibration (heading-style.spec.ts:270
           unit-spacing fixture, content-orchestrator.simplified.spec.ts:351 FAQ-template fixture
           name/doc mismatch)
```

(v1's own parked attempt is unchanged and now sits at `stash@{1}`.) Re-running the target suites
after popping confirms the working tree is back to the T1–T6/T9/T11/T12 state, with `heading-style.ts`
and `repair-strategy.ts` at their last-committed content.

**`loop_back_stage: changes_required_tests`.** `TEST_WRITING` needs to recalibrate the two tests
named in §3.2 (fixture-truthfulness fixes, not design changes — the same class of fix already
applied by `TEST_WRITING` to `content-orchestrator.doc-gate.spec.ts`'s `makeDoc()` before this
dispatch started). Once landed, the next `IMPLEMENTATION` dispatch for T7 should pop `stash@{0}`
(not re-derive the implementation) — `git stash show -p stash@{0}` is a complete, tested diff, not a
draft.

## 4. T8/T10 — not attempted (frozen-file, wrong track, §9 stop)

Unchanged since v1: both remain `track: prompt`, both name FROZEN files
(`src/prompt-core/master-system-prompt.ts`, `src/prompts/task-a.ts`, `src/prompts/task-b.ts`), and
this dispatch was explicitly scoped to `track: angular` with T8/T10 explicitly named out of scope.
No fresh, in-session "modify [filename]" instruction was given for either. See v1 (§4) for the full
per-task breakdown of what each still needs; nothing about that description has changed.

## 5. Non-blocking findings

Findings 1-4 are unchanged from v1 (T1's `step()` narrowing, the T4/T9/T11/T12 file-contention
serialization, the FR-6 degenerate-exemption reading, T6's `repairReportExtraFile()` extraction) —
all already landed and committed; not repeated here in full, see v1.

5. **The HTML-path `closing`/blessed-CTA identification needed one correction during this attempt,
   caught before committing.** An initial draft computed `closing` as "the last question-shaped
   `<h2>`" (i.e. filtering to question-shaped headings first, then taking the last of *those*), which
   diverges from the task breakdown's own wording ("the last such `<h2>` ending in `?`") whenever a
   mid-document heading happens to be a question but the structurally-last heading is not — the two
   readings agree on every fixture currently in the suite, so neither is distinguished by a test, but
   the second (wrong) reading would run FR-7's error-severity check against a heading that is not
   actually the CTA. Corrected to: take the structurally-last `<h2>` outside `section.specs`
   unconditionally, and bless it only when *that specific heading* is question-shaped — matching the
   original pre-T7 code's own `lastH2`-then-question-check order and the breakdown's literal wording.
6. **The `heading-brand-core-missing` `fieldInstruction`'s bare-name wording needed one wrap fix.**
   A first draft split `"Return ONLY"` and `"the corrected name"` across a `'\n'`-joined line break
   (mirroring `slug-name-designator-lost`'s own array literal), which made
   `repair-strategy.spec.ts`'s `/Return ONLY the corrected name/` (a single-line-contiguous regex)
   fail to match even though the instruction's actual content was correct. Rewrapped so the phrase
   sits on one line; `slug-name-designator-lost`'s own wording is untouched (out of this task's
   scope).

## 6. Files changed (summary)

Unchanged since v1 for the committed T1-T6/T9/T11/T12 work (see v1 §6).

Parked again (stashed, not committed): `src/utils/heading-style.ts` (full rewrite of
`checkProductNameStuffing`/`checkProductNameStuffingDoc`, plus new
`productNamePatternWithUnitLocale()`/`hasProductCore()`/`localizedNameShapeIssue()` helpers),
`src/utils/repair-strategy.ts` (new `heading-brand-core-missing` entry only — T4/T9/T11/T12's own
edits to this file remain committed, unaffected).

Not touched: `src/prompt-core/master-system-prompt.ts`, `src/prompts/task-a.ts`,
`src/prompts/task-b.ts`, `src/prompts/task-c.ts`, `src/utils/output-validator.ts` (all five FROZEN
files — `bash arch-guard.sh` confirms all five checksums unchanged).

Not touched, not owned (reported, not edited — see §3.2): `src/utils/heading-style.spec.ts`,
`src/services/content-orchestrator.simplified.spec.ts`.
