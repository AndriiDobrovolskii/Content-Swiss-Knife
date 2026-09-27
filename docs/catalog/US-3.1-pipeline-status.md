---
artifact: pipeline_status
story: US-3.1
version: 1
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-09-27T10:00:00Z
updated_at: 2026-09-27T10:30:00Z
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 8
  - key: open_decisions
    version: 4
  - key: impact_analysis
    version: 2
  - key: implementation_plan
    version: 4
  - key: task_breakdown
    version: 5
  - key: plan_review
    version: 5
  - key: test_strategy
    version: 1
  - key: ac_test_matrix
    version: 1
open_decisions_blocking: false
---

# Pipeline Status — US-3.1: Make the repair gate actually block ungrounded content and stop the brand-core/heading-form rule conflict

**Verdict (attempt 1, angular track): `CHANGES_REQUIRED`.** 9 of the 10 in-track tasks (T1, T2, T3,
T4, T5, T6, T9, T11, T12) are done, committed, and their own named tests pass. T7 is implemented
but **parked** (reverted via `git stash`, not committed) after its own tests proved incompatible
with real accepted uk-UA corpus output and several pre-existing, unrelated fixtures — see §3. T8
and T10 are **not attempted**: both are `track: prompt` (this dispatch is `track: angular`) and
both name FROZEN files with no fresh, in-session "modify [filename]" instruction — see §4.

Branch: `feat/US-3.1-qa-gate-brand-core-fixes` (created off `docs/US-2.2-archive`, since no story
branch existed yet).

## 1. Task outcomes

| Task | Track | Outcome | Commit | Notes |
|---|---|---|---|---|
| T1 | angular | done | `df9ec36` | `doc-schema-issues.ts` gains a Zod-path → `doc.<hops>` converter (suppresses a path only for a root-level, length-1 array-cardinality failure); `repair-strategy.ts` gains a `doc-schema` entry and its `step()` array-without-index check is narrowed to intermediate path segments only (see §5, non-blocking finding 1); `content-orchestrator.service.ts`'s `produceTaskADoc`/`runDocGate` re-safeParse at three points instead of trusting a non-null `doc`. |
| T2 | angular | done | `e48fa1b` | New `src/utils/async-retry.ts`, `retryAsync<T>`. Standalone, no wiring yet. |
| T3 | angular | done | `a01bd12` | `groundingSpecs()` wrapped as `retryAsync`'s attempt, `maxAttempts: 3`. FR-4 no-silent-fallback guarantee re-asserted, unchanged. |
| T4 | angular | done | `4dfccf0` | `NON_REGENERABLE_RULES` + `repair-gate.ts`'s main-loop break condition + `toArtifactReport` status reorder. |
| T5 | angular | done | `fb03d68` | All three `specs-grounding-disabled` emission sites flipped `warning` → `error`. |
| T6 | angular | done | `fbf4859` | `groundingExportBlocked` computed signal; `downloadZip()`/`downloadText()` guarded; `downloadAllImages()` untouched. `repairReportExtraFile()` extracted out of `downloadZip()` — see §5, non-blocking finding 4. |
| T7 | angular | **blocked** (`blocked_by_architecture`) | not committed — stashed | Implemented per the breakdown, made its own 10 tests pass, then reverted. See §3. |
| T8 | prompt | **not attempted** | — | Wrong track for this dispatch; FROZEN file, no fresh-session "modify" instruction. See §4. |
| T9 | angular | done | `c78e6da` | New `src/utils/seo-metadata-shape.ts` (`meta-title-template-shape`, `meta-title-h1-identical`), composed into all four `validateSeoMetadata` call sites; `meta-title-length`'s suffix-preservation wording/branch removed. |
| T10 | prompt | **not attempted** | — | Wrong track; FROZEN `task-b.ts`, no fresh-session "modify" instruction. See §4. |
| T11 | angular | done | `0c14353` | `slug-name-designator-lost` field-scoped-only ladder entry. |
| T12 | angular | done | `3e36e4e` | `meta-title-length`'s `fieldInstruction` gains the marker-preservation line. Case-2 regression pin (deterministic tier) stayed green throughout. |

## 2. Measured state (real command output)

| Check | Baseline (before this dispatch) | After T1–T6, T9, T11, T12 (T7 parked) |
|---|---|---|
| `npm run test:logic` (`vitest run`) | 13 files failed, 51 failed / 3793 passed / 3 skipped (3847) | 5 files failed, **20 failed** / 3847 passed / 3 skipped (3870) — the 20 are exactly T7 (10: `heading-style.spec.ts` 7 + `repair-strategy.spec.ts` 3) + T8/T10 (10: `master-system-prompt.spec.ts` 1 + `task-a.spec.ts` 1 + `task-b.spec.ts` 8) |
| `npm run test:components` (`ng test`) | not run at baseline | 2 files, **23 passed**, 0 failed |
| `npm run lint` (`tsc --noEmit`) | 3 pre-existing errors (missing `async-retry`/`seo-metadata-shape` modules, missing `NON_REGENERABLE_RULES` export) | **clean, 0 errors** |
| `npm run build` (`ng build`) | not run at baseline | **succeeded** (pre-existing `file-saver`/`js-beautify`/`jszip` CommonJS warnings only, unrelated to this Story) |
| `bash arch-guard.sh` | ALL CHECKS PASSED | **ALL CHECKS PASSED** — all five FROZEN checksums unchanged (T8/T10 never touched, T7 stashed) |
| `npm run test:coverage` | not run — QUALITY_GATE's concern per the task breakdown's own repeated statement | not run, same reason |
| `npm run validate:harness` | n/a — no `docs/workflow/` or `so-*` skill touched | n/a |

Per-task test evidence (each task's own named spec files run in isolation, all green, before being
folded into the full-suite numbers above): T1 (`doc-schema-issues.spec.ts` + `.branches` + `.v4`,
`content-orchestrator.doc-gate.spec.ts`, `repair-strategy.spec.ts` doc-schema block), T2
(`async-retry.spec.ts`, 8/8), T3 (`content-orchestrator.grounding-retry.spec.ts` FR-1 block, 5/5),
T4 (`repair-gate.spec.ts` FR-2(b) + `toArtifactReport` blocks, `repair-strategy.spec.ts`
`NON_REGENERABLE_RULES` block), T5 (`content-orchestrator.grounding-retry.spec.ts` FR-2(a) +
`content-orchestrator.doc-gate.spec.ts` FR-2(a), plus the full three-file
`content-orchestrator.doc-gate.spec.ts`/`.grounding-retry.spec.ts`/`repair-gate.spec.ts` run:
108/108), T6 (`app.component.export-guard.spec.ts`, 7/7), T9 (`seo-metadata-shape.spec.ts`, 15/15),
T11 (`slug-validator.spec.ts` + `repair-strategy.spec.ts` T11 blocks), T12 (`repair-strategy.spec.ts`
T12 block, including the case-2 regression pin staying green).

## 3. T7 — blocked (`blocked_by_architecture`)

T7 was implemented exactly per the breakdown: `checkProductNameStuffing`/`checkProductNameStuffingDoc`
in `heading-style.ts` restructured to compute `blessedFirst`/`blessedClosing` structurally, before
the per-heading loop, with an FR-6 exemption scoped to the degenerate case
(`productShort(name) === name`) at a blessed position, and a new mandatory-presence FR-7 pass
(`heading-brand-core-missing`, error severity) at those same two positions; `repair-strategy.ts`
gained a matching `heading-brand-core-missing` entry. **All 10 of T7's own named tests
(`heading-style.spec.ts` 7, `repair-strategy.spec.ts` 3) passed on the first run.**

Running the full suite next surfaced **~30 newly-broken tests** in files this task does not own
and this skill forbids editing: `content-orchestrator.doc-gate.spec.ts` (10 tests, including T1's
own "repairs a Story-example empty required string… spending zero full regenerations", which is
green at T1 and red once T7 lands), `content-orchestrator.hook-pattern.spec.ts` (2),
`content-orchestrator.simplified.spec.ts` (17), `content-orchestrator.ua-doc-pipeline.spec.ts` (1).
Attribution (grepped from the actual `[repair-gate] … cannot address …` log lines the failing runs
produced): 100% of the newly-broken assertions trace to the new `heading-brand-core-missing`
error-severity finding; none trace to FR-6's widening of `heading-product-name-stuffing`.

Two independent checks confirm this is not a fixable-in-place regression:

1. **Corpus check.** `validateHeadingStyleDoc()` run directly against
   `test/fixtures/corpus/expert3d-ortur-h20-20w.doc.json` (a real, human-accepted golden artifact
   `render-reconciliation.spec.ts` depends on) with `productName: 'Ortur H20 20 W'` returns TWO
   `heading-brand-core-missing` errors: the first-§3 heading (`"Принцип роботи та модульна
   конструкція"`, genuinely product-name-free) and, more importantly, the CTA heading
   (`"Чому купити Ortur H20 20 Вт в EXPERT3D?"`) — which DOES name the product, but in its
   correctly-cyrillized uk-UA unit form ("Вт", not the Latin "W" the raw `productName` carries).
   `productNamePattern()`'s digit-letter-flexible-spacing regex does not account for Cyrillic unit
   substitution, so a real, previously-accepted, correctly-localized heading is now flagged as an
   `error`-severity, field-scoped-repairable defect — the field-scoped rung would then rewrite a
   correct CTA.
2. **Fixture check.** `content-orchestrator.doc-gate.spec.ts`'s own `makeDoc()` (used by dozens of
   tests unrelated to headings — schema validation, grounding, sentence-length repair) sets
   `functionality: [{ heading: 'How it works' }]` and `cta: { heading: 'CTA' }`, neither of which
   names the product ('Test Product'). Both are placeholder text for testing other behaviour, not
   representative content, and both now trip FR-7 at error severity.

FR-7 is explicitly a **mandatory-presence** rule by design (OD-6, resolved by Specification v4 —
not a conditional-correctness reading this task could relax to make these pass; that was
considered and rejected as weakening the rule contrary to its own resolution). The corpus finding
means the mandatory-presence design, as specified, produces a false-positive error-severity finding
against real, previously-accepted output over a known, unaddressed gap (localized/cyrillized unit
spelling in the brand-core match). That is an architecture-level question — how brand-core matching
should treat localized unit forms — not something `so-builder` can resolve by re-implementing the
match heuristic without a design decision, and not something fixable by editing the ~30 other test
files (forbidden; not owned by this task).

**Action taken:** T7's two files (`heading-style.ts`, `repair-strategy.ts`'s
`heading-brand-core-missing` entry) were reverted via `git stash` (not committed) to keep the
working tree, and the full suite, at the T1–T6/T9/T11/T12 state. The stash is preserved
(`git stash list` shows it) and exported as a reference patch for the next pass. Re-running the
full suite after the stash confirmed exactly 39 failures (the T1–T6 baseline minus T4's own fixes;
now 20 after T9/T11/T12/T2/T3/T5/T6 landed) with **zero** of the ~30 collateral-damage tests
present.

**`loop_back_stage: blocked_by_architecture`.** D5 (Implementation Plan) needs to decide how
`heading-brand-core-missing`'s brand-core match should treat localized/cyrillized unit spelling
(e.g. widen `productNamePattern()` to a locale-aware unit-substitution table, or scope the pattern
match differently), and separately whether/how the ~30 collateral-damage fixtures across
`content-orchestrator.doc-gate.spec.ts`, `.hook-pattern.spec.ts`, `.simplified.spec.ts`,
`.ua-doc-pipeline.spec.ts` should be updated (a `TEST_WRITING` task) once that design question is
settled, since `so-builder` does not own test files.

## 4. T8/T10 — not attempted (frozen-file, wrong track, §9 stop)

Both tasks are `track: prompt` in task_breakdown v5, not `track: angular` — this dispatch was
explicitly scoped to the angular track. Independently, both name FROZEN files
(`src/prompt-core/master-system-prompt.ts`, `src/prompts/task-a.ts`, `src/prompts/task-b.ts`) and
AGENTS.md §9 requires the user to say "modify [filename]" **explicitly, in the current session**
before either is edited. The Story's own D3 decision and OD-3/OD-7/OD-9 record the Owner's
authorization for these exact edits, but that authorization was granted in earlier sessions/stages
of this pipeline, not in this dispatch — an upstream agent's instruction to "implement T1–T12" is
not the user saying "modify [filename]" in this session, and a subagent cannot perform the "wait
for explicit approval" half of the §9 ritual. Both are left undone, correctly still red:

- **T8** — `master-system-prompt.ts`'s `[HEADING FORM]` block needs one clause added after the
  "AT MOST TWO … `[Product-short]`" sentence, stating the exception holds unchanged when
  `[Product-short]` equals the full product name; `task-a.ts`'s line ~153 restatement needs
  rewording so it no longer reads as an unqualified "forbids the full name outright" absolute. No
  other line in either file. `.arch-guard-checksums` needs `--rebaseline` in the same commit,
  covering exactly these two files.
- **T10** — `task-b.ts`'s whole "— meta_title —" block (lines 39-51) needs rewriting per (a)-(d) in
  the task breakdown (cascade step 1 → `[Localized Category]`/`[Spec]`; step 3 + line 49 both
  append a `"·"` differentiation mark rather than ever returning the bare H1 core; the budget table
  reconciled to ≤54/≤51; the suffix mandates at lines 44 and 47 removed, `[Site Suffix]` re-scoped to
  `site_name` only; all four few-shot anchors rewritten to match) and `buildPromptB()`'s
  excerpt-construction code (lines 112-140) needs the two-slice prose+specs construction. A separate
  `.arch-guard-checksums` rebaseline, covering only `task-b.ts`, in the same commit.

Both §9 stops are requested here for the next dispatch that runs on the `prompt` track with an
explicit, in-session "modify [filename]" instruction for the three named files.

## 5. Non-blocking findings

1. **T1 narrowed `repair-strategy.ts`'s `step()` array-without-index check beyond the plan's Files
   entry.** The plan's T1 Files table lists only "add a `'doc-schema'` entry to
   `REPAIR_STRATEGIES`" for `repair-strategy.ts`. Making `doc-schema-issues.spec.ts`'s own
   "every doc-schema issue with a path still resolves through repair-strategy.ts's own path
   grammar" test pass required narrowing the pre-existing array-without-index throw to intermediate
   path segments only (a terminal segment may now legitimately address a leaf whose current,
   invalid value is an array — e.g. a `string | array` union field that failed its array branch).
   Verified against the one existing test that pins this check (an intermediate-segment case,
   unaffected) — no other test in the suite exercises the terminal-segment case. Recorded as a
   finding since it goes beyond what the Files table named, though the test evidence supports it.
2. **T4/T9/T11/T12 all touched `repair-strategy.ts`, as the task breakdown's own file-contention
   note anticipated** — done serially in the order T1 → T4 → T9 → T12 → T11 to avoid the
   textual-merge risk the breakdown flags, with a full-suite run after each.
3. **The FR-6 exemption's scope (`isDegenerate = short === full`) was this implementer's own
   reading**, not spelled out verbatim in the task breakdown beyond "including the degenerate case
   where `productShort(name) === name`". Chosen because it is the only reading that satisfies both
   the new degenerate-case exemption tests AND the pre-existing, non-degenerate
   "still flags a blessed-position heading that carries more than the short form" test — recorded
   as an interpretation, not a plan-stated rule (parked with T7 either way).
4. **T6's `repairReportExtraFile()` extraction is a narrow refactor of pre-existing code**, not
   named in the task breakdown's Files entry for T6. Needed because `app.component.export-guard.spec.ts`'s
   own regex-based method-body extractor (`methodSource()`) truncates at the FIRST `}` it finds
   textually inside the method — which, before this extraction, was the inline
   `{ name: 'repair_gate_report.md', … }` object literal inside `downloadZip()`, before the
   `downloadPackage(` call the test needs to find. Extracting the object literal into a same-file
   private method removes the premature `}` from `downloadZip()`'s own body without changing its
   behavior.

## 6. Files changed (summary)

Created: `src/utils/async-retry.ts`, `src/utils/seo-metadata-shape.ts`.
Modified: `src/render/doc-schema-issues.ts`, `src/utils/repair-strategy.ts`, `src/utils/repair-gate.ts`,
`src/services/content-orchestrator.service.ts`, `src/app/app.component.ts`.
Parked (stashed, not committed): `src/utils/heading-style.ts`,
`src/utils/repair-strategy.ts` (the `heading-brand-core-missing` entry only — the rest of T4/T9/T11/T12's
edits to that file are committed).
Not touched: `src/prompt-core/master-system-prompt.ts`, `src/prompts/task-a.ts`, `src/prompts/task-b.ts`,
`src/prompts/task-c.ts`, `src/utils/output-validator.ts` (all five FROZEN files — `bash arch-guard.sh`
confirms all five checksums unchanged).
