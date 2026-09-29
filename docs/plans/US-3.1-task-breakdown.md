---
artifact: task_breakdown
story: US-3.1
version: 11
status: APPROVED
owner: so-implementation-planner
created_at: 2026-09-22T16:00:00Z
updated_at: 2026-09-30T15:00:00Z
supersedes: docs/plans/US-3.1-task-breakdown.md#10
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 20
  - key: impact_analysis
    version: 6
  - key: implementation_plan
    version: 13
open_decisions_blocking: false
---

# Task Breakdown: US-3.1 — Make the repair gate actually block ungrounded content and stop the brand-core/heading-form rule conflict

**v11, superseding v10 — re-run against `specification` v20 (was v19), `impact_analysis` v6 (was v5) and
`implementation_plan` v13 (was v11).** v10's `status: APPROVED` predates all three moves and is not
treated as current; this version is `DRAFT` and requires a fresh `PLAN_REVIEW` and human approval. Three
plan decisions postdate v10 and had no task; each is decomposed here as one new task. **`T1`-`T15` are
unchanged in Files/Tests/Acceptance-check/Notes and are not re-derived** (all `T1`-`T15` are committed; the
`T13`-`T15` "new this revision" Status labels in their sections below are historical and mean "landed in
`a16ddbd` (`T13`/`T14`) and `4a7f806` (`T15`)").

1. **`T16` — `D16` (`implementation_plan` §4a; `pipeline_status` v11 LEAD 3, highest severity, in scope per
   `54e5fa6`).** `applyTier`'s field-scoped branch trusts a repair result with no shape check, so a
   JSON-envelope answer (the es-ES Slugs incident) can be written into a plain-text field. One
   `repair-gate.ts` change: a module-private `looksLikeJsonEnvelope` guard with one bounded corrective
   retry. Serves `FR-10`/`FR-11`/`AC-6`. Depends on `T13` (same lines; `T13` is committed).
2. **`T17` — `D17` (§4b; LEAD 2).** `cutOnWordBoundary` needlessly drops a complete trailing word when the
   clip lands exactly on a separator. One `repair-strategy.ts` change (module-private function; no new
   export). Serves `FR-8`/`AC-4` (benefits `T15`'s `computeLongH1MetaTitle`) and must leave `T12`'s pin and
   the existing `truncateAtWordBoundary` describe block green. Depends on `T15` and `T12` (both committed)
   only in the sense that their tests are its non-regression set.
3. **`T18` — `D18` (§4c; `FR-14`/`AC-7`, new in `specification` v20).** `description-doc.schema.ts`: `cta.heading`
   non-empty becomes `schemaVersion`-conditional. One production file plus schema-level tests plus a
   regression run of the ~20 `cta.heading`-referencing specs (`impact_analysis` v6 §2, Unknown #13). Serves
   `FR-14`, `AC-7`. No dependency on any other task.

**Not tasks, by design.** `D12` remains a verification note. `implementation_plan` §4.1's rows for
`docs/specifications/US-3.1-spec.md` and `docs/plans/US-3.1-task-breakdown.md` are "not this plan's to
write". The `SENTENCE_TERMINAL` "шт." note (`heading-style.ts`) is flagged in the plan for a future
revisit, not scheduled. `repairFieldPayload()` is deliberately unchanged (plan §4a.3; Rejected alternative
13). No FROZEN file is touched by `T16`-`T18` (plan §4.1); no §9 stop is carried.

**Test-state note (TDD ordering).** `TEST_WRITING` has not yet written tests for `D16`/`D17`/`D18`
(the working tree holds only the uncommitted `T13`-`T15` specs). `T16`-`T18`'s `Tests` fields name the
files the plan's §4.1/§4.2 designate; `so-test-writer` must create them failing before `IMPLEMENTATION`,
and if it does not, that is a `PLAN_REVIEW` finding, not something `so-builder` papers over.

**v10, superseding v9 — re-verified against `specification` v19 (was v17, `+2`) and `implementation_plan`
v11 (was v10, `+1`), per this repository's own artifact-staleness contract, since both upstreams moved
after this document's own `inputs_consumed` was last written; `impact_analysis` also moves in this
revision's own `inputs_consumed`, v4 → v5, for the same reason.** Both upstreams were read in full this
round, not only their own stated diffs. One substantive correction, one already-open finding confirmed
resolved without this document's own edit, and one new upstream residual carried in for completeness:

1. **`T15`'s own "for every locale" `OD-10`-closure claim was an overclaim, corrected to match
   `implementation_plan` v11 §2.7's precise framing.** `v9`'s own `T15` Notes (the "Completely disjoint
   from `T13`/`T14`" paragraph, below) stated that `D15`'s widened `h1Len ≥ 54` threshold "closes
   `D9`/`T10`'s own named residual (the H1-core-length-55 boundary, §1.11) as a side effect, **for every
   locale**." `implementation_plan` v11 §2.7 (re-verified this round against `specification` v19's four
   independent citations — `FR-13(b)`, the `AC-5` traceability row, `NFR-5`, and the `OD-10` entry in Open
   questions, all four agreeing) states this precisely, not uniformly: the **general-row** case (H1-core
   length exactly 55) **is** fully closed by `D15` — it falls inside `D15`'s `h1Len ≥ 54` domain, so
   `T15`'s own unconditional normalization intercepts it before `task-b.ts`'s line-48/line-49 cascade
   (`D11`, `T10`, already shipped) is ever reached. **De-DE's band does not close to the same degree** —
   it narrows from 52-55 to 52-53, and those two remaining values (52, 53) sit *below* `D15`'s own
   `h1Len ≥ 54` activation domain, so `T15`'s own `isH1Unreachable` predicate is false for them by
   construction; those entries stay on the normal-case cascade path (`T10`/`D11`), where a collision
   still depends on the differentiation marker's own length (`m ≥ 4` at core length 52, `m ≥ 3` at 53 —
   unaffected at `m = 1`, the shipped single-character `"·"` mark). This is a correction to this
   document's own prose, not to `T15`'s own Files/Tests/Acceptance-check content — `T15`'s code, its test
   list, and its acceptance check are all unchanged in substance below; only the "Completely disjoint from
   `T13`/`T14`" paragraph's own closure claim is corrected to state that de-DE's residual 52-53 band
   remains open, belonging to `FR-13(b)`/`D11`/`T10`, not to `T15`/`D15` to close.
2. **`T15`'s own Notes paragraph on `AC-4`'s stale Specification text — re-checked, and now resolved,
   not left open.** `v9`'s own `T15` Notes stated, against `specification` v17, that `AC-4`'s literal text
   "is still unchanged" and did not yet describe the `h1Len ≥ 54` alternate shape. Independently
   re-checked this round against the live, current `specification` (v19, `APPROVED`): `FR-8(b)` (added at
   v18) now states this exact exception at `FR-8` itself and at the `AC-4` traceability row, and v19
   additionally discloses `D15`'s own mid-word-truncation fallback at the same two places and in Open
   questions. The paragraph is corrected below to record this as resolved by `specification`'s own later
   revision, not as an open ask this document still carries forward.
3. **One new item carried in from `impact_analysis` v5, not present in any prior revision of this
   document — a named residual, not a design change.** `impact_analysis` v5's own Unknown #11 ("new this
   round") independently observes that `T15`'s unconditional normalization corrects `meta_title`'s *shape*
   for any `h1Len ≥ 54` entry but has no visibility into whether `h1` itself is correct — a model response
   whose `h1` carries an unrelated defect will still produce a validator-accepted `meta_title` once `T15`
   ships. `implementation_plan` v11 does not name this residual anywhere in its own text (grepped this
   round: no hit for "mask" or "visibility into whether" in the current `implementation_plan`), so it is
   carried into `T15`'s own Notes below directly from `impact_analysis`, per this document's contract to
   consume that artifact too — recorded as scope-correct behaviour, not a defect, the same register
   `impact_analysis` itself uses.

**Independently re-checked and found to need no change:** `impact_analysis` v5's own re-verification (its
`T1`-`T12` status correction, the confirmed absence of any `seo_data`-bearing corpus fixture, `FR-8(b)`'s
FROZEN-file-free footprint) reaches the same conclusions this document's `T1`-`T12` `Status` rows and
`T15`'s own Files table already state — no further correction needed there. Every other part of
`specification` v19 read this round (`FR-1`-`FR-7`, `FR-9`-`FR-12`, `FR-13(a)/(c)/(d)`, the `NFR`s, Out of
scope, and the rest of the Traceability matrix) states, in its own front matter and in `implementation_plan`
v11's own re-confirmation, that it is unaffected by v18/v19's fixes — independently spot-checked against
this document's own `T1`-`T14`/coverage-table content and found to require no change. **Everything else —
`T1`-`T14`'s own Files/Tests/Acceptance-check/Notes/Status content, the Execution order, the Risk-first
rationale, the Coverage table, and `T15`'s own Files/Tests/Acceptance-check sections — is unchanged from
`v9` and is not re-derived here.**

---

**v9, superseding v8 — responds to Implementation Plan v10's `D15` correction (the `h1Len = 54`
self-contradiction `T15`'s own v8 Notes found and routed back), decomposes it, and independently
re-verifies rather than re-actions the other two carried-forward findings v10's own Result Envelope
named.** Three things, none of them a redesign of `T1`–`T14`'s own substance:

1. **`T15` is rebuilt in full against Implementation Plan v10's corrected `D15`.** v10 widens `D15`'s
   activation threshold from `h1Len ≥ 55` to `h1Len ≥ 54` (derived from `MIN_DASH_TAIL = 2`, the
   pre-existing reachable check's own real minimum addition, rather than from `D15`'s own 1-code-point
   `"·"` mark) — closing the exact gap this document's own v8 `T15` Notes independently found and
   refused to invent a fix for. v10 also replaces the validator's independent structural re-derivation
   (prefix / word-boundary / mark checks) with an equality check against a new, shared,
   **module-private** `computeLongH1MetaTitle(h1)` — the same pure function the normalizer calls — so
   the normalizer and validator can no longer independently drift, closing a second defect v10 found
   while verifying its own proof (a literal `=== ' '` check that could reject
   `truncateAtWordBoundary`'s own legitimate trailing-punctuation-adjacent output). `T15` below reflects
   both corrections: the `h1Len ≥ 54` threshold, the `h1Len = 54` boundary test (previously deliberately
   excluded pending this resolution), a trailing-punctuation-before-cut fixture, a
   no-word-boundary-in-first-49 fixture, a `MIN_DASH_TAIL` pin, a `MIRRORED_MAX_META_TITLE` drift
   characterization, and the closed-form coverage sweep Implementation Plan §2.4.1 proves — every case
   expressed through `T15`'s own **exported** entry points (`normalizeLongH1MetaTitle`,
   `validateSeoMetadataShape`), since `isH1Unreachable`/`computeLongH1MetaTitle`/`DASH_TAIL` are
   module-private by Implementation Plan §4.1's own design and a test file cannot import what a module
   does not export — see `T15`'s own Notes for exactly how each case routes through the public surface.
2. **Finding (a) — `task_breakdown` still describing `T7`/`T8`/`T10` as pending — independently checked
   against this document's own live text and found already resolved, not re-fixed.** Implementation Plan
   v10's own non-blocking findings (§5) restate, unaffected by this round's own `D15` work, that
   `task_breakdown` "v6/v8... still describes `T7`/`T8`/`T10` as pending work." A direct re-read of this
   document's own `T7`/`T8`/`T10` Status rows (below) — independently re-checked this round, not
   assumed correct because a prior revision claimed so — finds each already reads "done, committed"
   with the live commit hash (`ad4c678`/`1c02c89`/`3d89c86`), and the `v7` preface (preserved below,
   unchanged) already states this correction was made when `v7` superseded `v6`. This finding is stale
   against the current artifact, not a defect this revision needed to correct. Recorded as such in this
   revision's own Result Envelope rather than silently ignored.
3. **Finding (c) — Specification `AC-4`/`FR-8` text not yet updated for the widened `h1 ≥ 54`
   boundary — re-confirmed still open, carried forward as a non-blocking finding, not edited here.**
   `docs/specifications/US-3.1-spec.md` (v17, `APPROVED`) still states `AC-4` as "follows the single
   approved template ... identically across all four locales" with no alternate-shape carve-out for a
   long `h1` (grepped this round: `FR-8`'s own section, `§2123`, is unchanged since the `h1 ≥ 55`
   version of this finding was first recorded). This is `Specification`'s own future work, delegated the
   same way `OD-9` delegated `FR-13`'s exact prompt wording — not something `so-implementation-planner`
   owns or edits.

Everything else — `T1`–`T14`'s own Files/Tests/Acceptance-check/Notes/Status content, the Execution
order, the Risk-first rationale, the Coverage table's task mappings — is unchanged from `v8` and is not
re-derived here; only `T15` itself, the "Regression checks for T13/T14/T15" section's own `T15`
paragraph, and the Result Envelope change in substance below.

---

**v8, superseding v7 — resumes a dispatch interrupted mid-task, independently re-verified rather than
trusted on sight.** A prior round of this same dispatch was cut off by an API rate-limit failure after
writing v7's body but before it returned a Result Envelope — confirmed directly: v7's own file ended
immediately after the Coverage table's "Not tied to any task" section, with **no Result Envelope at
all**, even though `T15`'s own Notes section (below) already states "See this document's Result
Envelope (`blocking_issues`) for the loop-back this finding triggers." There was no envelope to carry
it. This revision does three things, none of them a redesign of `T1`–`T15`'s own substance:

1. **Independently re-verified v7 in full** against the live source (`git log`, `git show --stat`,
   direct reads of `src/utils/repair-gate.ts`, `src/utils/seo-metadata-shape.ts`,
   `src/services/content-orchestrator.service.ts`), against Implementation Plan v9's own text, and
   against the current `story`/`specification`/`impact_analysis` versions — found `T1`–`T12`'s
   `Status` rows, `T13`/`T14`'s line citations, and `T15`'s own arithmetic all accurate; found no
   drift in `inputs_consumed` (story v1, specification v17 `APPROVED`, impact_analysis v4,
   implementation_plan v9 `DRAFT` — all still the current artifact versions, re-checked directly
   against each file's own front matter and against `docs/workflow/workflow-state.yaml`).
2. **Finished the regression-impact analysis v7's own interrupted round was mid-way through** —
   its last recorded in-progress note was "let's check whether existing tests would break under
   D15/D13/D14, to write accurate regression-check notes," and no such notes exist anywhere in v7's
   text for `T13`/`T14`/`T15` (unlike `T7`'s own "Regression checks" paragraph, which was the model
   this work was meant to follow). A new **Regression checks for T13/T14/T15** section is added below,
   immediately after `T15`, completing that work with evidence, not assertion.
3. **Escalated a real, independently-reverified finding `T15`'s own Notes already surfaced but that
   v7 never routed anywhere, for lack of a Result Envelope to carry it.** `T15`'s "Blocking gap" Note
   (unchanged below) documents a genuine self-contradiction inside Implementation Plan v9's own design:
   at `h1Len = 54` exactly, neither the existing (`D6`) reachable-shape check nor `D15`'s new override
   activates, so `meta-title-template-shape` is architecturally unsatisfiable for that one `h1` length
   with no task in this breakdown able to close it and no test that could honestly be written for it.
   Re-derived independently this round (not merely re-cited) against the live `DASH_TAIL` regex in
   `src/utils/seo-metadata-shape.ts:36` and `D15`'s own coded threshold in Implementation Plan §2.4 —
   confirmed real. This is exactly the case `.claude/skills/so-implementation-planner/SKILL.md` names
   as a loop-back, not a decision this stage may invent ("Never make an architectural decision. If the
   plan does not say, loop back... Do not invent the missing decision") — so this revision's own Result
   Envelope (new, appended at the end of this document — v7 had none) reports `CHANGES_REQUIRED`,
   `loop_back_stage: changes_required_architecture`, routing back to `ARCHITECTURE_PLANNING` for
   `so-planner` to resolve the threshold, not for this stage to pick a fix.

**Nothing in `T1`–`T15`'s own Files/Tests/Acceptance-check/Notes/Status content changes in this
revision** — every substantive correction v7 made over v6 stands unchanged; this revision only
completes the regression analysis v7 left undone and gives the finding v7 already found a Result
Envelope to travel in.

---

**v7, superseding v6** (`docs/plans/US-3.1-task-breakdown.md#6`, `status: APPROVED` — that approval
predates Implementation Plan v9's own two rounds of work: the accidental destruction and
reconstruction of the plan around `T7`/`T8`/`T10`, and this round's fresh design work on the two
real-regeneration defects `pipeline_status` v8 diagnosed. v6's `APPROVED` status is not treated as
still current here — this revision is re-run against Implementation Plan v9, the current artifact,
not a citation refresh of v6.)

**What actually changed, verified directly rather than assumed from Implementation Plan v9's own
process notes.**

1. **`T7`, `T8` and `T10` are done, committed, unchanged in design.** Implementation Plan v9 itself
   flags, as a corrected factual error carried in v8, that these three tasks were recorded as
   "pending the §9 consent gate" when in fact all three had already shipped. Independently
   re-verified this round, not taken on the Plan's own say-so: `git log --oneline -40` on
   `feat/US-3.1-qa-gate-brand-core-fixes` shows `ad4c678` (`feat(US-3.1 T7): heading-brand-core-missing
   (FR-6/FR-7) — blessed-position restructure`), `1c02c89` (`feat(US-3.1 T8): [HEADING FORM]
   disambiguation for short===full product names (FR-12)`) and `3d89c86` (`feat(US-3.1 T10):
   task-b.ts SEO-metadata prompt rewrite (FR-13(a)-(d))`), the same three commits the Plan names — and
   `git show --stat` on each of the three (re-run this round, not merely cited) confirms every file it
   touches matches this document's own Files table for that task, including, for `T8`/`T10`, the
   same-commit `.arch-guard-checksums` rebaseline AGENTS.md §9 requires (see each task's own `Status`
   row for the exact file list `git show --stat` returned). A full re-run of `git log --oneline -40`
   this round finds **every one of `T1`–`T12`'s own named
   commits** — `df9ec36` (T1), `e48fa1b` (T2), `a01bd12` (T3), `4dfccf0` (T4), `fb03d68` (T5),
   `fbf4859` (T6), `ad4c678` (T7), `1c02c89` (T8), `c78e6da` (T9), `3d89c86` (T10), `0c14353` (T11),
   `3e36e4e` (T12) — confirming, independently of the Plan's own text, that all twelve tasks this
   artifact's v6 revision named are committed on this branch. **No task below is rebuilt or
   re-decomposed on that account** — Implementation Plan v9 itself states `D1`–`D12`'s design
   substance is unchanged by the status correction, and this revision's own read of every one of
   `T1`–`T12`'s Files/Tests/Acceptance-check/Notes sections (all reproduced in full below, per this
   Story's own established convention of staying self-contained) found nothing in any of them that
   depends on the wrong status label the correction fixes — each task's own text already described
   what to build, not whether it had been built yet. Each task's metadata table below gains a
   **`Status`** row recording its commit, so this document itself stops being the reason a future
   round has to re-derive what v9's process notes state — the gap the Plan's own non-blocking
   finding names.
2. **Three new tasks, `T13`–`T15`, decompose Implementation Plan v9's two newly-designed decisions.**
   `D13`/`D14` (repair-gate.ts's two confirmed mechanism gaps — a field-scoped rung that silently
   no-ops on a genuinely missing key, and a main regeneration loop that never retries field-scoped/
   block-scoped repair on a fresh attempt) decompose into `T13` (`D13`) and `T14` (`D14`, depends on
   `T13`) below. `D15` (the deterministic, word-boundary-safe `h1`-truncation normalization that
   closes Defect 1 — `meta-title-template-shape` unsatisfiable for `h1` lengths ≥ 55) decomposes into
   `T15` below, independent of `T13`/`T14` (Implementation Plan §2.7: disjoint files, disjoint rule
   names, no interaction). None of `T1`–`T12` needs a design change to accommodate `T13`–`T15` —
   Implementation Plan v9 §2.5 states `D15` requires no `task-b.ts` edit at all (so `T10`'s own
   FROZEN-file work is untouched), and `D13`/`D14` extend `repair-gate.ts`'s existing `applyTier`/main
   loop that `T4` already touches, without changing `T4`'s own design or Files entry.

**Old paragraph, preserved below for this document's own continuity — v6, superseding v5** (`docs/plans/US-3.1-task-breakdown.md#5`, `status: APPROVED` — that approval predates Specification's own v9–v17 revision history, Impact Analysis's v3/v4 revisions and Implementation Plan's v5/v6/v7 revisions in full, and is therefore stale, not authoritative, against the current inputs this revision consumes: Specification v17 (was v8, `+9` versions), Impact Analysis v4 (was v2, `+2`), Implementation Plan v7 (was v4, `+3`)). v5's own `APPROVED` status is not treated as still valid here — a re-run against three materially advanced inputs, not a citation refresh.

**What actually changed in substance, checked against Implementation Plan v7's own "no other design decision changes" claim rather than assumed:** Implementation Plan v7 confirms D1–D4 and D6–D12 are carried forward unchanged in substance since v4/v5 (Specification v9–v17 rewrote FR-7, and only FR-7, across seven-plus SPEC_REVIEW rounds) — so T1–T6, T8–T12 below are **unchanged in design** from v5, with only this preface's and the affected cross-reference version numbers refreshed, not their Files/Tests/Acceptance-check/Notes content. **D5 is the one decision that changed**, twice since v5's own baseline (Implementation Plan v4): v5/v6 of the Plan found and fixed a Cyrillic-unit matcher defect and a fixture-truthfulness defect neither this artifact's own v5 nor its predecessors had surfaced (D5(e)), then extended FR-7's mandatory-presence check to a new `doc.localizedName` leaf for `schemaVersion: '4.0'` Docs, with its own shape/banned-character/occurrence-count/trailing-position test and a path-parameterized repair instruction (D5(f)) — Specification v9 through v15 drove that extension. **Implementation Plan v7 then narrows D5(f) back down**: Specification v16/v17 removes the first-§3-heading leaf (`doc.functionality[0].heading`) from `heading-brand-core-missing`'s mandatory-presence check entirely (a real, human-accepted golden-corpus heading that never named the product, with no corresponding QA-evidenced regression there, per Impact Analysis v3's own fixture read), leaving **one conceptual leaf — the CTA-heading position, `schemaVersion`-conditional between `doc.cta.heading` and `doc.localizedName`** — down from the two blessed positions v5's own T7 covered (itself built against Specification v8, before D5(e)/D5(f) existed at all) and down from the three leaves Implementation Plan v6 briefly wired D5(e)'s matcher to.

**T7 is rebuilt in full below, not merely re-cited.** v5's T7 text describes a two-blessed-position mandatory-presence check with no locale-aware matcher, no `doc.localizedName` leaf, no shape test, and no path-parameterized repair instruction — accurate against Specification v8, stale against v17. `docs/catalog/US-3.1-pipeline-status.md` §3 independently confirms `so-builder` actually attempted T7 per that stale, two-position design during `IMPLEMENTATION`, made its own ten named tests pass, then found it broke ~30 tests in files it does not own (`content-orchestrator.doc-gate.spec.ts`, `.hook-pattern.spec.ts`, `.simplified.spec.ts`, `.ua-doc-pipeline.spec.ts`) via exactly the Cyrillic-unit false-positive Impact Analysis v3/v4 and Implementation Plan v5–v7 independently trace, and reverted the attempt via `git stash` (`loop_back_stage: blocked_by_architecture`) rather than commit it. **This revision's T7 is a full rebuild against Implementation Plan v7's current D5/D5(e)/D5(f) design, not a resumption of that stashed attempt** — the stash's own Doc-path `blessedFirst` shorthand (`headings.length > 1 ? headings[0] : undefined`) is explicitly flagged by the Plan's own "Implementation-fidelity note" (D5) as diverging from the correct, path-based Pass-1 rule for any template omitting §3 entirely, and predates the `doc.localizedName` leaf, its shape test, and the v16/v17 narrowing entirely. T8 (`Depends on: T7`) needs no change to its own design — it disambiguates `[HEADING FORM]`'s prompt text once the validator-side semantics settle, and the validator-side semantics it depends on (the blessed-position exemption, the degenerate `short === full` case) are FR-6's, unaffected by FR-7's leaf-count narrowing.

**Two carried-forward items this revision was instructed to independently verify, not accept as given, both confirmed real and fixed below.**

1. **The task-count miscount v5 itself carries, named by `so-test-writer`'s `test_generation_report` (finding F2) and independently confirmed non-blocking by Plan Review v5.** v5's own "Not a parallel-safe group" paragraph (below) states "T12, new in v2, also edits `src/utils/repair-strategy.ts` and names the same spec file — five tasks now contend for that one file, not four." That arithmetic is wrong on its own terms: the sentence immediately before it already names **five** tasks (T1, T4, T7, T9, T11) contending for that file before T12 is even added, so adding T12 makes **six**, not five. Independently re-verified this round by reading all twelve tasks' own Files tables directly rather than trusting either the old prose or the two reviews that flagged it: `src/utils/repair-strategy.ts` is modified by **T1, T4, T7, T9, T11 and T12** — six tasks, confirmed by name. Fixed below, in place, with the corrected count and task list.
2. **T6's acceptance-check wording overclaim, carried forward unfixed through Plan Review v2 through v5 and named again, explicitly, by Implementation Plan v7's own corrected D4 entry.** v5's T6 acceptance check states that `downloadZip()`/`downloadText()` "do not invoke the export functions" and that this is "observable via `app.component.export-guard.spec.ts`" — phrasing that reads as a runtime execution proof. `app.component.export-guard.spec.ts` runs in the `test:logic` runner, no `TestBed`, and never actually calls either guarded method or invokes Angular's own change detection — it is a **source-text pin** (`methodSource()`-style extraction of the method body, asserting the guard call and its early `return` appear, in the right order, before the gated `downloadPackage()`/`downloadTextPackage()` call), the same idiom `app.component.template-wiring.spec.ts` already establishes elsewhere in this codebase. Corrected below so this artifact stops repeating the overclaim a sixth revision running.

**T12's case-2 characterization-pin framing, re-verified against Implementation Plan v7's own restated D9 note — already correct in v5, unchanged in substance below.** Implementation Plan v7 restates, for clarity rather than because its substance changed, that T12's case-2 test (`REPAIR_STRATEGIES.get('meta-title-length')!.deterministic`, exercised at the exact H1-core-length-55 boundary) is a **deliberate, passing-on-write characterization pin of already-implemented, unmodified `cutOnWordBoundary()` behaviour**, not a red-to-green proof of new behaviour this Story introduces — and that `so-test-writer` should record it in `test_generation_report` on that basis rather than list it in `ac_test_matrix` as AC-5's own red-to-green evidence. v5's own T12 text (below) already states this precisely, correctly anticipating Implementation Plan v6/v7's later restatement; re-checked line-by-line this round against Implementation Plan v7's restated note and found to need no correction — carried forward unchanged.

**Every other task (T1–T6, T9, T11) is carried forward unchanged in design, cross-checked against Impact Analysis v4's own independent confirmation that all nine are done and committed** (`git`-confirmed by Impact Analysis v4's re-run hazard/citation checks, and restated by `docs/catalog/US-3.1-pipeline-status.md` §1) **and that none of Specification v9–v17's FR-7-only content touches any file, test, or design decision any of these nine tasks name.** Only this preface's own version references change for them; their Files/Tests/Acceptance-check/Notes sections are byte-for-byte the same as v5's, reproduced below for this document's own self-containment, per this repository's convention that a superseding artifact stays readable without its predecessor open.

---

**v5, superseding v4** (`docs/plans/US-3.1-task-breakdown.md#4`), re-run against Implementation Plan v4
(`docs/plans/US-3.1-implementation-plan.md#4`), which corrects its own D11(b) analysis (Plan Review v4
Finding 3) after re-reading `cutOnWordBoundary()` (`src/utils/repair-strategy.ts:197-204`) past the step
v2/v3 stopped at. That earlier trace stopped at `chars.slice(0, limit)` and concluded the deterministic
repair tier "returns the bare, h1-identical 55-character core" at the H1-core-length-55 boundary — the
claim T12 (v4 of this artifact) was built against. Independently re-verified this round by reading the
live function directly (confirmed unchanged, lines 197-204): after slicing, the function unconditionally
backs up to `clipped.lastIndexOf(' ')`, which for every realistic multi-word H1 core (every worked example
in the Plan is multi-word) additionally strips the core's own trailing word. The result is therefore
strictly shorter than `h1`, so it cannot be byte-identical to `h1` and cannot re-trip
`meta-title-h1-identical` — it re-trips `meta-title-template-shape`'s condition (2) ("does not start with
`h1` verbatim") instead, a different failure mode than v4 of this artifact tested for. Implementation Plan
v4 also confirms `cutOnWordBoundary()` is not exported (`repair-strategy.ts:197`, no `export` keyword — a
test cannot call it directly, as v4 of this artifact's T12 assumed) and makes the explicit design decision
to keep it that way, routing the required test through the actual production entry point instead:
`REPAIR_STRATEGIES.get('meta-title-length')!.deterministic`.

**T12 is rebuilt below against this corrected design** — its Files entry is unchanged (same single line
added to `meta-title-length`'s `fieldInstruction`), but its Tests-to-turn-green table, Acceptance check and
Notes are rewritten to assert the corrected three-part outcome (shorter than `h1`, not byte-identical to
`h1`, not a prefix of `h1`) through the exported/registered entry point, not a private function. **T10's
Notes section (line ~891 of v4) is also corrected**, for the same reason: it restated the same now-disproven
"reproduce the bare, h1-identical string — re-tripping `meta-title-h1-identical`" claim as the boundary
behaviour T12 exercises, which is a direct dependency on D11(b)'s old claim, not merely an adjacent mention
of the real, distinct `meta-title-h1-identical` check (D6) that T9 registers. **Every other task (T1-T11)
was reviewed for the same dependency and found clean** — a full-file search for "h1-identical" (this
document) found four other occurrences (the D6/T9 check definition and its Files/Acceptance-check/Notes
mentions), all of which name `meta-title-h1-identical` as the real, separate mechanical check D6 registers
(byte-identical `meta_title`/`h1`, a condition that can arise independently of the `cutOnWordBoundary()`
boundary case, e.g. a model literally echoing `h1` into `meta_title`) — none of them describe or depend on
the disproven `cutOnWordBoundary()` trace, so none needed a change. D1-D10, D11(a)/(c)/(d) and D12 are
unchanged in substance in Implementation Plan v4, so T1-T9 and T11's design content, and T10's own `what
changes`/Files/Tests/Acceptance-check sections, are unaffected and carried forward unchanged below (only
T10's Notes correction above, and the introductory paragraph below's version references, change).

**v4, superseding v3** (`docs/plans/US-3.1-task-breakdown.md#3`), re-run against Implementation Plan v3
(`docs/plans/US-3.1-implementation-plan.md#3`) and Plan Review v3
(`docs/reviews/plans/US-3.1-plan-review.md#3`, `CHANGES_REQUIRED` → `ARCHITECTURE_PLANNING`, which
cascades forward to this stage per that review's own routing rationale). Two changes, neither touching
D1–D12's design substance:

1. **Sync with Implementation Plan v3's corrected D9/D11(c) citations — checked, and this artifact's v3
   text already agreed.** Implementation Plan v3 corrected its own D9 "Test files needing an edit for
   compatibility" section and D11(c) prose, which v2 had mis-attributed to
   `src/prompts/output-integrity-wiring.spec.ts`, to point to the real location, **`src/prompts/task-b.spec.ts`,
   lines 18-67**. This task breakdown's own v3 revision had already independently found and fixed the
   equivalent T9/T10 citations before Implementation Plan v3 existed (see the v3 paragraph below), so this
   pass re-verified rather than re-derived: T10's Tests table below already cites `task-b.spec.ts`, lines
   18-67, matching Implementation Plan v3 exactly, including the same three named tests (`'parses every
   budget row...'` at line 24, `'leaves real headroom...'` at line 39, `'never demonstrates an over-budget
   title as a ✓ example'` at line 55) and the same row-parsing-regex line (`:22`). Implementation Plan v3
   also now correctly states D9's `'leaves real headroom...'` test **must be recalibrated**, not merely
   supplemented with new coverage — this task breakdown's T10 "Tests to turn green" section already
   states exactly that (the "Corrected in v3" passage, before the Tests table, unchanged below).
   Implementation Plan v3 further now flags
   `src/utils/repair-strategy.spec.ts:175-181` as a real, currently-green test requiring a rewrite under
   AGENTS.md §7.7 — T9 below already carried this finding since its own v3 revision. **Nothing in this
   artifact's citations changed as a result of this sync check** — item 2 below is the only substantive
   change this revision makes.
2. **Plan Review v3 finding 1, fixed: T9 no longer assigns `so-builder` a test-file edit.** T9's v3 text
   stated, in its "What changes," "Tests to turn green" and Notes sections, that this `angular`-track
   IMPLEMENTATION task's "own scope now explicitly includes rewriting or removing" `repair-strategy.
   spec.ts:175-181` "in the same commit" as its code change. `.claude/skills/so-builder/SKILL.md`
   (re-read this round) states twice, in its own voice, that `so-builder` must "Never modify a test file"
   and "do[es] not own the test files" — a test that seems wrong is a finding to report, never a test to
   edit. T9 below is corrected to state that `TEST_WRITING` recalibrates (rewrites) `repair-strategy.
   spec.ts:175-181` and re-confirms the neighbouring lines-183-186 test still holds — both **before** T9's
   `IMPLEMENTATION` work starts — mirroring T10's own, already-correct attribution of its `task-b.spec.ts`
   recalibration to `TEST_WRITING` rather than to `so-builder`. T9's own code-change scope (the new
   `seo-metadata-shape.ts` module, the `meta-title-length` suffix-wording/branch removal) is unchanged;
   only who performs the test-file edit, and when, is corrected.

   **Re-checked for the same pattern elsewhere in this breakdown, per this revision's own instruction to
   verify rather than trust the prior reviewer's scope.** A full-file search across all 12 tasks for
   "so-builder," "same commit," "rewrit-", and "TEST_WRITING" (re-run this round, not merely carried over
   from Plan Review v3's own equivalent check) confirms T9 was and remains the only task instructing its
   own executing track to edit a test file. T4's "same commit" reference is to the `toArtifactReport`
   production-code fix landing alongside D3's exclusion, not a test. T8's and T10's "same commit"
   references are to their own `.arch-guard-checksums` rebaselines, not test files — and both already state
   their test-file work (source-text pins, the `task-b.spec.ts` recalibration) is `TEST_WRITING`'s, per the
   TDD ordering constraint every task in this breakdown otherwise follows correctly. T11's "rewriting" is
   the `slugs[i].name` production data field, not a test. No second instance of Finding 1's pattern exists.

**Implementation Plan v2's own citation errors, flagged as a routing note in this artifact's v3 revision,
are now resolved — no orchestrator action needed on that front.** v3 of this task breakdown carried a note
that Implementation Plan v2's D9/D11(c) prose repeated the same two citation errors this artifact had
already fixed on the task side, and that this task breakdown does not own or edit `implementation_plan`.
Implementation Plan v3 (`docs/plans/US-3.1-implementation-plan.md#3`) has since corrected both passages
directly, confirmed by item 1 above — that note is now historical and is not repeated as a live routing
concern in this revision.

**v3, superseding v2** (`docs/plans/US-3.1-task-breakdown.md#2`), a `CHANGES_REQUIRED` loop-back from
Plan Review v2 (`docs/reviews/plans/US-3.1-plan-review.md#2`, `changes_required_tasks`). Plan Review v2
independently opened, rather than inherited, the test files v2's T9 and T10 cited and found two
confirmed factual errors — neither a design defect; both are corrected here without touching D1–D12's
substance:

1. **Wrong file for the budget-margin and anchor-truthfulness tests.** v2's T10 (and this file's own
   introductory paragraph, in the sentence just below) attributed `'leaves real headroom rather than
   sitting exactly on the ceiling'` and `'never demonstrates an over-budget title as a ✓ example'` to
   `src/prompts/output-integrity-wiring.spec.ts`. That file, read in full this round, is an unrelated
   `NO_LEAKED_REASONING_CLAUSE` wiring guard and contains neither test. Both tests are real, with the
   exact regex and line ranges v2 cited — but they live in **`src/prompts/task-b.spec.ts`, lines
   18-67**, a file T10 already edits for other reasons. T10's Files/Tests citations below are corrected
   to point there; `output-integrity-wiring.spec.ts` needs no edit from this Story at all.
2. **A real, currently-passing test pins exactly the behaviour T9 removes, and v2 said none did.**
   `src/utils/repair-strategy.spec.ts:175-181` (`'preserves a trailing " | Store" suffix...'`) asserts
   `truncateAtWordBoundary(...).endsWith(' | Center3D')` — exactly the `' | '`-detecting branch at
   `repair-strategy.ts:182-192` that T9/D9 remove entirely. The claim, repeated from Impact Analysis v2
   through the Implementation Plan into v2's own T9 Tests table, that "no existing test currently pins
   the old behaviour," is false; it traces to a grep for capital-S `"Suffix"` against prose that reads
   lowercase "suffix." T9 below now owns removing/rewriting that test in the same commit as the code
   change, per AGENTS.md §7.7, and the neighbouring test at lines 183-186 is re-examined explicitly
   rather than left silently assumed to still hold (it does — see T9 below). **Superseded in v4: this
   was itself a defect (Plan Review v3, finding 1) — `TEST_WRITING`, not T9/`so-builder`, owns this
   rewrite, and it happens before T9's `IMPLEMENTATION` work starts, not "in the same commit" as T9's
   code change. See the v4 paragraph above, item 2, and T9 below.**

Per the Plan Review's own suggestion, this revision also spot-checked the breakdown's other "no
existing test currently pins X" claims for the same failure mode (a citation grepped/inherited rather
than opened) — specifically T7's heading-style widening claim and T8's FR-12 prompt-text-pin claim.
Both were independently re-verified against the live spec files this round (`heading-style.spec.ts`,
`heading-style.v4.spec.ts`, `task-a.spec.ts`, `task-a.simplified.spec.ts`,
`master-system-prompt.spec.ts`, `master-system-prompt.v4.spec.ts`): no existing test exercises T7's
specific widening combination (a generic first §3 heading, a non-carrying §9 closing, and 2+ other
product-named headings all flagged — every existing "outside the two reserved slots" test has the
first heading and the CTA both already carrying the product name, which is a different case), and no
existing test pins `task-a.ts` line 153's exact restatement text or blocks a new clause after
`master-system-prompt.ts`'s "AT MOST TWO..." sentence (`master-system-prompt.v4.spec.ts:226` only
asserts the substring `/AT MOST TWO/`, unaffected by an appended clause). T7 and T8 are otherwise
unchanged below.

**v2, superseding v1** (`docs/plans/US-3.1-task-breakdown.md#1`). v1 was built against Implementation
Plan v1, where D11 (FR-13(a)/(b)/(d)) was still illustrative — v1's own plan text stated the exact
wording was "left to `so-builder`/`so-test-writer`" pending an Owner authorization (OD-9) that did not
yet exist. The Owner has since granted OD-9 in full, Specification v8 finalizes FR-13(a)/(b)/(d) as
concrete requirements, and Implementation Plan v2 (`docs/plans/US-3.1-implementation-plan.md#2`)
rewrites D11 in full with concrete prompt text, a concrete data path, a concrete differentiation
marker checked against its own repair-path interaction, and a concrete fix for two test-level
conflicts Impact Analysis v2 found (mis-citing `output-integrity-wiring.spec.ts` — corrected above to
`task-b.spec.ts`). **D1 through D10 and D12 are carried forward unchanged in substance**
(Implementation Plan v2's own statement, re-verified against the live source this round) — so T1
through T9 and T11 below are carried forward from v1 unchanged in design, as this Story's own baseline
for FR-1 through FR-12 and FR-13(c), **modulo this v3 pass's test-citation corrections to T9**. **Only
the work decomposing D11 changes in substance**: T10 is rewritten in full (and here, its test
citations corrected), and a new task, T12, is added for D9's new-in-v2 clause (a `repair-strategy.ts`
`fieldInstruction` addition that is D11(b)'s natural companion but lands in a different, non-FROZEN
file, so it is its own task rather than folded into T10's FROZEN-file edit).

**Historical note, resolved as of this revision:** v3 of this task breakdown flagged here that the
Implementation Plan (then v2) carried the same two citation errors in its D9 and D11(c) prose
(`docs/plans/US-3.1-implementation-plan.md#2`, references to `output-integrity-wiring.spec.ts` for the
budget-margin/anchor-truthfulness tests, and the "no existing test currently pins the old behaviour"
claim for `truncateAtWordBoundary()`), and that this task breakdown does not own or edit the
Implementation Plan. Implementation Plan v3 has since corrected both passages directly — see the v4
paragraph above, item 1.

This is **15** ordered, individually verifiable tasks decomposing Implementation Plan v10 (`T1`–`T14`
against `D1`–`D14`, unchanged in substance since `v8` of this document; `T15` rebuilt this round against
`v10`'s corrected `D15`). `T1`–`T12` decompose the same twelve design decisions `D1`–`D12` as every
prior revision of this artifact — all twelve **done and committed** (see each task's own `Status` row
above, independently re-verified this round via `git log`, not merely restated from the Plan's own
text). `D11` was rewritten in full in v2, carried forward unchanged in substance since; `D5` was the one
decision Implementation Plan v5–v7 revised (the Cyrillic-unit-aware matcher and the CTA-heading-only
`doc.localizedName` mandatory-presence narrowing), decomposed into `T7`'s full rebuild — now shipped,
`ad4c678`. `T13`/`T14` decompose `D13`/`D14` (`repair-gate.ts`'s two confirmed mechanism gaps),
unchanged since `v8` of this document — Implementation Plan v10 confirms `D13`/`D14` are untouched by
this round's own `D15` work (disjoint files, disjoint rule names, §2.7). **`T15` is rebuilt this
revision** against `v10`'s corrected `D15` (the deterministic `h1`-truncation normalization closing
Defect 1, now activating at `h1Len ≥ 54` via a shared, module-private `isH1Unreachable`/
`computeLongH1MetaTitle` pair and an equality-based validator, rather than `v9`'s `h1Len ≥ 55` threshold
and independent structural re-derivation). Every file the plan names and every `FR-n`/`AC-n`/`NFR-n` the
Specification (v17, APPROVED) states is reachable through at least one task below — see Coverage table.
`D12` ("confirmed not reached") produces no task: it is a verification note in the plan, not an
implementation decision, and is listed in the coverage table for completeness rather than left silently
unmapped.

All 15 tasks are `track: angular` except T8 and T10, which are `track: prompt` (they edit files
under `src/prompts/` / `src/prompt-core/` — see `stage-map.yaml`'s `skills_by_track`). Every test
lands in the logic runner (`npm run test:logic`, vitest) — the Impact Analysis's hazard-6 finding
(no `*.component.ts` this Story touches has a natural `*.component.spec.ts`, and `app.component.ts`
has none by deliberate prior decision) holds for every task; this Story adds no component-runner
work. `T13`–`T15` touch only `src/utils/**`/`src/services/**`, so this holds for them too.

## Execution order

**`T1`–`T12` are all done, committed (see each task's own `Status` row) — the ordering below is
preserved as the historical record of how they landed, and remains correct if this branch is ever
rebuilt from scratch. `T13`–`T15` are this revision's own new work; they are additive and do not
reorder anything already shipped.**

```
1.  T1                                    — solo, first (riskiest decision)
2.  T2, T4, T7, T9, T11                   — parallel group, independent of T1 and each other
3.  T3                                    — after T2
4.  T5                                    — after T3 and T4
5.  T8                                    — after T7
6.  T10, T12                              — after T9 (order-independent of each other)
7.  T6                                    — after T5
8.  T13, T15                              — parallel group; T13 independent of T15 (disjoint files,
                                             disjoint rules, Implementation Plan §2.7); both
                                             independent of the now-committed T1–T12
9.  T14                                   — after T13 (same file, contract-before-consumer: T14's
                                             own convergence test needs T13's missing-key fix live)
10. T16, T17, T18                         — new in v11; mutually independent (disjoint production
                                             files: repair-gate.ts / repair-strategy.ts /
                                             description-doc.schema.ts); all follow the committed
                                             T1-T15. Suggested order T16, T17, T18 (severity), not
                                             required.
```

**v11 addition.** `T16` (`repair-gate.ts`) touches the same lines `T13` shipped; `T13`/`T14` are
committed, so its dependency is satisfied. `T17` (`repair-strategy.ts`) shares that file with the six
already-committed tasks listed below. Serialize on file contention only if the committed history is ever
replayed.

| Task | Depends on | Order-independent of |
|---|---|---|
| T1 | none | everything |
| T2 | none | T1, T4, T7, T9, T11 |
| T3 | T2 | — |
| T4 | none | T1, T2, T7, T9, T11 |
| T5 | T3, T4 | — |
| T6 | T5 | — |
| T7 | none | T1, T2, T4, T9, T11 |
| T8 | T7 | — |
| T9 | none | T1, T2, T4, T7, T11 |
| T10 | T9 | T12 |
| T11 | none | T1, T2, T4, T7, T9 |
| T12 | T9 | T10 |
| T13 | none | T1–T12 (all shipped), T15 |
| T14 | T13 | T1–T12 (all shipped) |
| T15 | none | T1–T12 (all shipped), T13, T14 |
| T16 | T13 (committed) | T17, T18 |
| T17 | none (T12/T15 committed; their tests are its non-regression set) | T16, T18 |
| T18 | none | T16, T17 |

**Not a parallel-safe group — file contention, not a dependency.** T1, T4, T7, T9 and T11 are
mutually *order-independent* (none needs another's code to compile or to be correct), but T1, T4, T7,
T9 and T11 — five tasks — all edit `src/utils/repair-strategy.ts` and all name
`src/utils/repair-strategy.spec.ts` as a test file; **T12, new in v2, also edits
`src/utils/repair-strategy.ts` and names the same spec file** — **six** tasks now contend for that one
file (T1, T4, T7, T9, T11, T12), not five. **Corrected in v6**: v5's own text at this exact point
stated "five tasks... not four," an arithmetic error independently flagged by `so-test-writer`'s
`test_generation_report` (finding F2) and confirmed non-blocking by Plan Review v5 — the five tasks
named in the sentence above this one were already five before T12 was added, so the total after
adding T12 is six, not five; re-verified this round directly against all twelve tasks' own Files
tables, not merely against the two reviews that flagged the error. Separately,
`src/services/content-orchestrator.service.ts` is touched by T1, T3,
T5 and T9. Two agents or two branches working genuinely concurrently on any pair from either set will
collide on the same file. Read the table above as "any order is correct," not as "safe to execute
literally simultaneously" — `so-builder` should serialize work that lands in `repair-strategy.ts` and
in `content-orchestrator.service.ts` even where no `Depends on` column requires it. **T12 in
particular should serialize immediately after T9**, not merely "at some point after" — it extends the
exact `fieldInstruction` string T9 already edits, and applying both changes to the same lines from
independently-branched work risks a textual merge conflict even though neither task's *correctness*
depends on the other's content.

## Risk-first rationale

**v11 note.** Among the three new tasks, `T16` is first because it is `D16`, the highest-severity item
(a JSON blob can ship as a slug name, `pipeline_status` v11 LEAD 3) and it edits the shared `applyTier`
branch every `doc-schema`/`slug-name-designator-lost`/`meta-title-length` repair passes through, so a
wrong guard has the widest collateral surface. `T17`'s reasoning is unverified by an independent read
(plan Risk 15) and is proven by running the pinned `T12`/`truncateAtWordBoundary` suites; `T18` is the
best-understood, single-file, and carries the one silent-regression trap (`'3.0'` must still fail),
covered by named negative tests. The original `T1`-first rationale below still describes the historical
ordering of `T1`-`T15`.

**T1 (FR-10 / plan decision D7) goes first.** It is the one decision the Implementation Plan itself
flags as going beyond what the Specification or Impact Analysis had surfaced, and as the plan's own
first draft got wrong: an earlier version of this exact decision (a separate `rawCandidate` field)
was rejected during planning because it silently breaks the moment a field-scoped repair succeeds —
the rejected alternative Implementation Plan §1.7 (`D7`) still names by description. **Citation note
(v7 of this artifact):** earlier revisions of this document cited this as "Rejected alternative 6" /
"plan Risk 9" against a numbered list in a since-destroyed `v7` implementation plan. Implementation
Plan's own numbered Risks (§4.3, 1-10 as of v10 — item 10 new, added when v10 widened `D15`'s
threshold) and Rejected alternatives (§4.4, 1-11 as of v10 — item 11 new, added when v10 replaced the
validator's structural re-derivation with an equality check) are a **fresh, unrelated list scoped
entirely to `D13`-`D15` work** — they do not renumber or replace whatever numbered list the destroyed
`v7` plan once used for `D1`-`D12`'s own risks/rejected alternatives, and the Plan's own reconstructed
§1 text carries `D1`-`D12` forward by description only, with
no numbered list of its own for them. Every bare "Risk N" / "Rejected alternative N" reference in
`T1`-`T12` below that is **not** citing Implementation Plan §4.3/§4.4 directly (i.e., not about
`D13`-`D15`) is corrected to a description-only citation for this reason — re-verified individually,
not blanket-suppressed. The shipped design — letting `attempt.doc` briefly hold a schema-invalid
candidate and re-`safeParse`-ing at every consumer — is architecturally novel for this codebase and
still carries a named, unresolved residual (the `manufacturedFullRegenWork` interaction, described in
Implementation Plan §1.7). It touches the core Task-A generation path (`produceTaskADoc`, `runDocGate`), is fully
self-contained (no dependency on any other task), and if the "one object, re-checked everywhere"
shape turns out not to hold against a consumer this plan didn't enumerate, that needs to surface
before three other tasks (T5, T6, T7's sibling work) build alongside an assumption about `DocAttempt`
that might have to change. Every other task is either mechanical (severity-literal changes, ladder
entries, a computed guard signal) or additive (a new module, new text), with no comparable
architectural novelty or previously-caught wrong turn.

**Ordering rationale for the grounding/repair-budget chain (T2 → T3 → T4 → T5 → T6), a case of
contract-before-consumer applied twice.** T4 (the `NON_REGENERABLE_RULES` exclusion and the
`toArtifactReport` status-derivation fix, FR-2(b)) is sequenced to land before T5 (the literal
`'warning'`→`'error'` severity flip, FR-2(a)) even though the two touch disjoint files and neither
is a compile-time dependency of the other: T4's exclusion mechanism is a no-op today (no rule is
error-severity for it to exclude), so landing it first is a safe, independently-testable-with-
synthetic-fixtures change that closes the disproportionate-repair-cost regression *before* the
literal flip in T5 could ever trigger it for real. Landing T5 before T4 would leave a real commit
in the history where an unresolved grounding failure burns the run's entire repair budget on
nothing — exactly the regression FR-2(b) exists to prevent, avoidable here at zero cost by ordering.
T3 (wiring `retryAsync` into `groundingSpecs()`, FR-1) must precede T5 for the same reason at the
contract level: AC-1's own text conditions the hard-block on "even after retries are exhausted" —
escalating severity before retry is wired would hard-block on a single transient failure, which is
not what AC-1 asks for.

**Ordering rationale for T9 → {T10, T12} (D6/D9/D11, FR-8/FR-9/FR-13), a third case of
contract-before-consumer, new in v2.** T9 lands first because it is what T10's rewritten prompt text
and T12's repair-instruction text are both designed *against*: T9 introduces the
`seo-metadata-shape.ts` checks (`meta-title-template-shape`, `meta-title-h1-identical`) that
FR-13(a)/(b)/(d)'s rewritten template and appended marker exist to satisfy, and T9 removes
`meta-title-length`'s suffix-preservation wording that T10's no-suffix template and T12's
marker-preservation instruction would otherwise directly contradict if they landed against the
pre-T9 text. Landing T10 or T12 before T9 would mean editing prompt/repair text to match checks and
wording that do not exist yet in the codebase. **T10 and T12 are themselves order-independent of each
other** — T10's literal `"·"` marker text and T12's generic "preserve the trailing single-mark
character" instruction do not reference each other's exact wording; each independently satisfies its
own acceptance check once T9 has landed, and D9/OD-10's own named residual (the H1-core-length-55
boundary where `meta-title-length`'s deterministic repair tier can still strip the marker) is
accepted and exercised regardless of which of T10/T12 happens to land first.

**T13 before T14 (new in v7), a fourth case of contract-before-consumer.** T13 fixes `applyTier`'s own
read-side gate condition; T14 extends the loop that calls `applyTier` to retry more often. T14's own
acceptance check includes a "two independent-leaf findings converge in one attempt's pass" case that
specifically exercises a genuinely-missing-key finding (T13's own fix) alongside an independent-leaf
finding — without T13 live first, that case cannot exercise what it is meant to prove. T15 is ordered
nowhere relative to T13/T14: Implementation Plan §2.7 confirms disjoint files, disjoint rule names, no
interaction — it is listed as a parallel group with T13 in Execution order purely because both are new,
independent, `Depends on: none` work, not because either constrains the other.

## Tasks

### T1 — Let a schema-invalid Task-A Doc candidate survive as a repairable value, addressed by path

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | no |
| **Status** | done, committed — `df9ec36` (verified this round via `git log`) |

#### What changes

A `doc-schema` finding (an empty required string, or any Zod field-level failure) becomes
field-scoped-repairable instead of always falling through to a full-document regeneration:
`produceTaskADoc()`'s catch block returns the raw, schema-invalid candidate object as `doc` instead
of `null`, every existing consumer that assumed "non-null `doc`" meant "schema-valid `doc`" is
guarded with a fresh, cheap `ProductDescriptionDocSchema.safeParse()` before trusting it, and
`docSchemaIssues()` gains a Zod-path → `doc.<hops>` converter so a field-level failure carries an
addressable `path`. A genuinely unparseable response (no candidate at all) is unaffected and still
falls through to full-regen.

#### Files

| File | Change |
|---|---|
| `src/services/content-orchestrator.service.ts` | modify — `produceTaskADoc()`'s catch block returns `candidate as ProductDescriptionDoc` (hoisted out of the try block) instead of `null` when a candidate parsed as JSON but failed schema validation; `runDocGate()`'s `produce` closure adds a `safeParse` check before normalizing; `runDocGate()`'s `validate` closure re-`safeParse`s `attempt.doc` and runs the Tier-1 suite only when it succeeds, else returns fresh `docSchemaIssues()`; the post-loop render guard re-`safeParse`s before rendering |
| `src/render/doc-schema-issues.ts` | modify — add a Zod-path → `doc.<hops>` converter (numeric segments attach as `[n]` to the preceding string segment, matching `repair-strategy.ts`'s existing addressing grammar); assign the converted path to each returned issue's `path` field on the field-level-Zod-error branch only |
| `src/utils/repair-strategy.ts` | modify — add a `'doc-schema'` entry to `REPAIR_STRATEGIES`: `{ ladder: ['field-scoped'], fieldInstruction: ... }`; `resolveLadder` appends `'full-regen'` automatically as the terminator (the rule is `error`-severity) |

#### Tests to turn green

These already exist and are **failing** when this task starts — `TEST_WRITING` wrote them. Turn
them green without weakening them (AGENTS.md §7.7).

| Test file | Runner | Covers |
|---|---|---|
| `src/render/doc-schema-issues.spec.ts` | `test:logic` | FR-10(a) — the Zod-path converter |
| `src/render/doc-schema-issues.branches.spec.ts` | `test:logic` | FR-10(a) — converter edge branches |
| `src/render/doc-schema-issues.v4.spec.ts` | `test:logic` | FR-10(a) — converter regression |
| `src/services/content-orchestrator.doc-gate.spec.ts` (extended, or a new sibling file if `so-test-writer` finds the existing one already scoped elsewhere) | `test:logic` | FR-10(b), AC-6 — field-scoped repair of a schema-invalid candidate; still-invalid-after-repair fallthrough to full-regen; genuinely unparseable response (`doc: null`) fallthrough unchanged; a candidate that graduates to schema-valid and, on the next pass, has its own newly-surfaced Tier-1 finding (e.g. `heading-product-name-stuffing`) successfully field-scoped-repaired; the `manufacturedFullRegenWork` residual (a candidate that graduates on the same pass a fresh, unregistered-strategy Tier-1 error first surfaces correctly falls through to full-regen, not a silent ship) |
| `src/utils/repair-strategy.spec.ts` (extended) | `test:logic` | FR-10 — the new `'doc-schema'` `REPAIR_STRATEGIES` entry |

#### Acceptance check

A `doc-schema` finding whose `ValidationIssue` carries a `doc.<hops>` path and whose raw candidate
survives on `attempt.doc` is repaired by the field-scoped rung without a full-document regeneration;
a still-invalid candidate after that rung, a genuinely unparseable response, and a candidate that
graduates to schema-valid but surfaces a fresh unregistered-strategy Tier-1 error on the same pass
each still fall through to full-regen exactly as today — all four states observable as passing,
named assertions in the test files above. This task's own named specs pass and no previously-passing
spec regresses; the suite is not fully green until every task lands (T2–T12's tests exist and are
failing at this point, per the TDD ordering constraint; as of v7, T13–T15's tests are also failing at
this point) — full-suite green and a successful `npm run build` are `QUALITY_GATE`'s concern, not a
claim this task makes.

#### Notes

This is the plan's own flagged riskiest decision (see Risk-first rationale) — a design already
revised once after an earlier draft (a separate `rawCandidate` field) was found to silently break
field-scoped repairs for a graduated candidate's own new findings (Implementation Plan §1.7 — see this
document's Risk-first rationale, "Citation note," for why this is cited by description, not by a
renumbered "Rejected alternative N"). `DocAttempt`'s type itself is unchanged (`doc: ProductDescriptionDoc | null`); only
its doc comment needs updating to state it may briefly hold a schema-invalid candidate between
generation and a successful repair. The `manufacturedFullRegenWork` interaction is a **named,
accepted residual** (Implementation Plan §1.7) — the test above must assert the actual fallthrough behaviour, not
an aspirational fix; do not attempt to weaken `manufacturedFullRegenWork`'s wholesale-rejection
discipline to close it, that is explicitly out of this task's scope.

---

### T2 — Generic, provider-agnostic retry-with-backoff helper

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | no |
| **Status** | done, committed — `e48fa1b` (verified this round via `git log`) |

#### What changes

A new, small, Promise-based `retryAsync<T>` helper is added, independent of any provider or
transport-status shape, with an injectable delay function so tests never depend on a real clock
(NFR-3). It does not yet touch `groundingSpecs()` — that wiring is T3.

#### Files

| File | Change |
|---|---|
| `src/utils/async-retry.ts` | create — `retryAsync<T>(attempt, opts: { maxAttempts, isRetryable, baseDelayMs?, delay? })`; default `delay` is a real `setTimeout`-backed promise, injectable for tests; exponential backoff (`baseDelayMs * 2**(n-1)`), recommended defaults `maxAttempts: 3`, `baseDelayMs: 500` |

#### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/async-retry.spec.ts` | `test:logic` | FR-1, NFR-2, NFR-3 — retries exactly `maxAttempts` times on a persistently-retryable result; stops early on the first non-retryable result; never calls the real `setTimeout` (injected `delay` stub) |

#### Acceptance check

`retryAsync` retries per its `isRetryable`/`maxAttempts` contract and never depends on wall-clock
time in its own test — observable in `async-retry.spec.ts` passing with no test timeout/flakiness
from real timers. This is a standalone new file with no prior tests to regress; full-suite green
remains `QUALITY_GATE`'s concern once all 15 tasks (T1–T12, and, as of v7, T13–T15) have landed.

#### Notes

Deliberately not `retryTransport()` (`http-retry.ts`) — that operator is RxJS-based and keyed on
HTTP transport-status shape (`isUpstreamTransportFailure`); reusing it would retry only a subset of
`groundingSpecs()`'s throw-path failures and never the empty/wrong-script paths OD-5 requires
covered (Implementation Plan §1.1 — cited by description, not by a renumbered "Rejected alternative N";
see this document's Risk-first rationale "Citation note").

---

### T3 — Wire `groundingSpecs()`'s specs-translation call through the retry helper

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T2 |
| **FROZEN (AGENTS.md §9)** | no |
| **Status** | done, committed — `a01bd12` (verified this round via `git log`) |

#### What changes

`groundingSpecs()`'s existing try/catch body (unchanged internally — it still never throws out of
the wrapped attempt, and still never substitutes `input.specs` as a grounded translation) is wrapped
as `retryAsync`'s `attempt` function, retried on any of the three business-semantic failure triggers
(throw, empty/whitespace-only text, wrong-script per `inspectGroundedTranslation`). A transient
single-attempt failure on any trigger no longer disables grounding by itself; `groundingSpecs()`
only returns `{ text: '', failure }` after the retry budget is exhausted with every attempt still
failing.

#### Files

| File | Change |
|---|---|
| `src/services/content-orchestrator.service.ts` | modify — `groundingSpecs()` (`~:268-295`) wraps its existing try/catch body as the `attempt` function passed to `retryAsync`, with `isRetryable: r => !!r.failure` |

#### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/services/content-orchestrator.grounding-style-guide.spec.ts` (extended if it already exercises `groundingSpecs()`, else a new sibling spec — `so-test-writer` confirms per Impact Analysis Unknown #2) | `test:logic` | FR-1 (all three triggers, each succeeding on a later attempt, plus one exhausting the budget with the returned `failure` matching the *last* attempt's cause), FR-4 (the `{ text: '', failure }` no-silent-fallback contract still holds after wrapping) |

#### Acceptance check

A transient single-attempt failure on any of the three triggers (throw, empty, wrong-script)
succeeds on a subsequent attempt before the retry budget is exhausted; `groundingSpecs()` returns a
failure result only once every attempt in the budget has failed, and that result never substitutes
`input.specs` as if it were grounded — observable via the new/extended retry test cases.

#### Notes

FR-4's Ortur H20 no-silent-fallback guarantee is an **invariant this task must not disturb**, not new
behaviour — assert it explicitly in the same spec rather than assuming it survives the wrap silently.
**Shared spec file with T5:** this task and T5 both extend the same content-orchestrator spec file
(whichever `so-test-writer` selects). T3 turns green only its own retry/FR-4 cases — T5's
severity-escalation cases in that same file are expected to still be failing when T3's commit lands;
do not treat "the whole file is green" as this task's bar.

---

### T4 — Exclude an unresolved `specs-grounding-disabled` finding from the repair loop's attempt-spending test

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | no |
| **Status** | done, committed — `4dfccf0` (verified this round via `git log`) |

#### What changes

A new rule-keyed constant marks `specs-grounding-disabled` as a rule no repair instrument can ever
resolve within one run; the repair-gate loop stops spending full-document-regeneration attempts on a
run whose *only* error-severity issue is that rule, while continuing to repair any other
co-occurring error-severity issue exactly as today. A load-bearing defect this plan's own analysis
found (not named by the Specification or Impact Analysis) is fixed in the same commit:
`toArtifactReport`'s `status` derivation currently assumes `repairsUsed === 0` implies
`finalErrors === 0`, which this exclusion breaks for the first time — left unfixed, a grounding-only
run would be reported `'clean'` while an error-severity finding is present.

#### Files

| File | Change |
|---|---|
| `src/utils/repair-strategy.ts` | modify — add `export const NON_REGENERABLE_RULES: ReadonlySet<string> = new Set(['specs-grounding-disabled'])`, with a doc comment stating the reason verbatim from FR-2(b) |
| `src/utils/repair-gate.ts` | modify — loop guard changes from `if (best.errors === 0) break;` to break when `regenerableErrorCount(best.issues) === 0` (a new helper or inline filter counting `severity === 'error' && !NON_REGENERABLE_RULES.has(rule)`); `best.errors` itself is unchanged (still used for the strictly-better tie-break); `toArtifactReport`'s status derivation reordered to `finalErrors > 0 ? 'unresolved' : (result.repairsUsed === 0 ? 'clean' : 'repaired')` |

#### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/repair-gate.spec.ts` (extended) | `test:logic` | FR-2(b) — (i) grounding-only synthetic error → zero `repairsUsed`, `status: 'unresolved'` (the regression test for the `toArtifactReport` reordering specifically); (ii) grounding error + one other repairable error → the other error is repaired normally, `repairsUsed > 0`, grounding persists in `finalIssues` throughout; (iii) grounding error alone, `finalIssues` still contains it after the loop exits |
| `src/utils/repair-strategy.spec.ts` (extended) | `test:logic` | `NON_REGENERABLE_RULES` membership |

#### Acceptance check

A run whose only error-severity finding is a `NON_REGENERABLE_RULES` member spends zero
full-document-regeneration attempts and reports `status: 'unresolved'` (never `'clean'` or
`'repaired'`); a run with that finding plus another repairable error continues to repair the other
error exactly as before, undisturbed by the grounding finding's presence — both observable in
`repair-gate.spec.ts`.

#### Notes

This task is fully testable today with synthetic `ValidationIssue` fixtures — `specs-grounding-
disabled` is not yet error-severity anywhere in the real code path until T5 lands. That is
intentional: see Risk-first rationale for why this task is sequenced before T5 rather than after.
`issuesBefore` (`repair-gate.ts:344`, unchanged) still includes the escalated grounding error
whenever the loop actually runs for another reason — do not narrow it; this is a deliberate,
previously-stated decision (Implementation Plan D3, "keep it that way"), not an oversight to fix
here.

---

### T5 — Escalate `specs-grounding-disabled` to `error` severity at all three emission sites

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T3, T4 |
| **FROZEN (AGENTS.md §9)** | no |
| **Status** | done, committed — `fb03d68` (verified this round via `git log`) |

#### What changes

The three places `content-orchestrator.service.ts` emits a `specs-grounding-disabled` issue for a
generation whose grounding failed (after the T3 retry budget is exhausted) now carry
`severity: 'error'` instead of `'warning'`. No other field on the issue changes. `repair-gate.ts`'s
existing severity-based accounting (unchanged by this task) then counts it toward "still failing";
T4's exclusion (already in place) keeps that from spending the run's repair budget on it alone.

#### Files

| File | Change |
|---|---|
| `src/services/content-orchestrator.service.ts` | modify — three `specs-grounding-disabled` issue literals change `severity: 'warning' as const` to `severity: 'error' as const`: `runDocGate()`'s shared closure (`~:547-549`), `generate()`'s inline HTML-gate closure (`~:755-757`), `generateUaContent()`'s separately duplicated inline HTML-gate closure (`~:1172-1174`) |

#### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| Same spec as T3 (`content-orchestrator.grounding-style-guide.spec.ts` or its chosen sibling, extended) | `test:logic` | FR-2(a) — all three emission sites carry `severity: 'error'` once retries are exhausted; a run whose only error is this one is reported `'unresolved'` with zero `repairsUsed` (cross-checked against T4's `repair-gate.spec.ts` assertions) |

#### Acceptance check

After retries are exhausted (T3), every `specs-grounding-disabled` issue at all three emission sites
carries `severity: 'error'`, and `repair-gate.ts` counts it toward "still failing" without spending
regen budget when it is the run's only error (T4) — observable via the content-orchestrator spec and
`repair-gate.spec.ts` together.

#### Notes

Landing this after T4 (not before) is deliberate — see Risk-first rationale. No
`specs-grounding-disabled` issue is emitted at all for a product with no source `input.specs`; this
task changes only the severity of an issue that would already have been emitted, never adds a new
emission site.

---

### T6 — Block ZIP and plain-text export on an unresolved grounding failure

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T5 |
| **FROZEN (AGENTS.md §9)** | no |
| **Status** | done, committed — `fbf4859` (verified this round via `git log`) |

#### What changes

`downloadZip()` and `downloadText()` in `app.component.ts` gain a guard: when the current
generation's `repairReport()` includes a `finalIssues` entry with `rule: 'specs-grounding-disabled'`
and `severity: 'error'` for any artifact, neither export action proceeds — a blocking message states
that §7 specs could not be verified against source. `downloadAllImages()` is untouched (it reads a
distinct signal, `imgResults()`, carrying no §7 content). Generation itself is not affected — this
guard is confined to the two export handlers.

#### Files

| File | Change |
|---|---|
| `src/app/app.component.ts` | modify — add `groundingExportBlocked` computed signal reading `this.repairReport()`; guard `downloadZip()` and `downloadText()` with an early return + `alert(this.uiLabels().alertGroundingBlocked)` when true; add `alertGroundingBlocked` key to both the `en` and `uk` UI-label dictionaries, following the existing `alertFillFields` pattern |

#### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/app/app.component.export-guard.spec.ts` (new, following the source-text-pin/behavioural-assertion precedent of `app.component.template-wiring.spec.ts` — no component spec introduced) | `test:logic` | FR-3, FR-5 — `downloadZip()`/`downloadText()` do not call `downloadPackage()`/`downloadTextPackage()` when `groundingExportBlocked()` is true, and do call them, unaffected, otherwise; `downloadAllImages()` is unaffected in both cases; generation itself (`generate()`/`generateUaContent()`) is not touched by this guard |

#### Acceptance check

**Corrected in v6 (Implementation Plan v7's own D4 wording correction, carried forward unfixed
through Plan Review v2–v5).** This is a **source-text pin**, not a runtime execution proof —
`app.component.export-guard.spec.ts` runs in the `test:logic` runner with no `TestBed` and never
actually calls `downloadZip()`/`downloadText()` or triggers Angular's own change detection, so no
assertion in it can observe either method actually running. What it observes instead:
`methodSource()`-style extraction of `downloadZip()`'s and `downloadText()`'s own method bodies shows
the `groundingExportBlocked()` guard and its early `return` appearing, in source order, **before**
the call to `downloadPackage()`/`downloadTextPackage()` respectively — the same source-text idiom
`app.component.template-wiring.spec.ts` already uses elsewhere in this codebase. The guard reads
`repairReport()` for a `finalIssues` entry `{rule: 'specs-grounding-disabled', severity: 'error'}` on
any artifact; `downloadAllImages()`'s own method body contains no such guard, confirming it is
unaffected — all observable via `app.component.export-guard.spec.ts`'s source-text assertions, not
via calling any of the three methods.

#### Notes

Resolves Impact Analysis Unknown #1: the block is implemented entirely at the `app.component.ts`
call sites — `zip-generator.ts` is **not modified**. The guard reads `finalIssues` (rule-specific),
never `repairUnresolvedCount()` — gating on the latter would block export for an unrelated
unresolved rule (e.g. a persisted `heading-brand-core-missing`) this FR never asked to block.

---

### T7 — Fix the blessed-position exemption/brand-core-presence conflict in `heading-style.ts`, with FR-7's mandatory-presence check narrowed to the CTA-heading position only

*(Rebuilt in full for v6 — supersedes v5's T7, which was built against Specification v8's two-blessed-
position design and predates Implementation Plan v5–v7's D5(e) locale-aware matcher and D5(f)
`doc.localizedName` leaf entirely. `docs/catalog/US-3.1-pipeline-status.md` §3 independently confirms
`so-builder` attempted v5's own design during `IMPLEMENTATION`, passed all ten of its own named tests,
then broke ~30 tests it does not own via the exact Cyrillic-unit false positive Implementation Plan
v5–v7 trace, and reverted the attempt (`git stash`, `loop_back_stage: blocked_by_architecture`) rather
than commit it. This task is a full rebuild against Implementation Plan v7's current D5/D5(e)/D5(f)
design — **not** a resumption of that stash, whose own Doc-path `blessedFirst` shorthand
(`headings.length > 1 ? headings[0] : undefined`) the Plan's own "Implementation-fidelity note" (D5)
flags as diverging from the correct, path-based Pass-1 rule for any template omitting §3 entirely,
e.g. `test/fixtures/simplified-docs.ts`'s `sparePartsDoc()`.)*

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | no |
| **Status** | done, committed — `ad4c678` (v8 flagged this as "not yet implemented" in error; corrected in Implementation Plan v9 and independently re-verified this round via `git log --oneline -40` and `git show --stat ad4c678`, which shows `src/utils/heading-style.ts` (+250/-19) and `src/utils/repair-strategy.ts` (+36), matching this task's own Files table exactly) |

#### What changes

`checkProductNameStuffing`/`checkProductNameStuffingDoc` are restructured in two passes. **Pass 1**
computes the two blessed positions (first §3 heading, CTA heading) **structurally**, before the
per-heading loop, instead of deriving them only from headings that already matched the short-name
pattern (Doc: by `path` — `doc.functionality[0].heading`/`doc.cta.heading`; HTML: the first `<h2>`
outside `section.specs`, and the last such `<h2>` ending in `?`, with the `named.includes(lastH2)`
conjunct dropped). **Pass 2**, the existing per-heading loop, exempts the full-pattern branch at a
blessed position when `short === full` (the degenerate case) — **this FR-6 exemption is unaffected by
FR-7's narrowing below and still covers both blessed positions**, exactly as it did in v5.

**FR-7's own mandatory-presence check, `heading-brand-core-missing` (`error`-severity, ladder-
registered), is narrowed to the CTA-heading position only — one conceptual leaf, `schemaVersion`-
conditional, not two blessed positions.** `doc.functionality[0].heading` is **not** part of this
presence check for either `schemaVersion` (Specification v16, confirmed unaffected by v17) — it
remains a blessed position for Pass 1/Pass 2's own FR-6 stuffing exemption only, unaffected. At the
CTA-heading position: for the HTML/string-path, the closing heading identified in Pass 1, for every
`schemaVersion`; for the Doc-path, `doc.cta.heading` when `schemaVersion` is `'3.0'`, and
`doc.localizedName` when `schemaVersion` is `'4.0'` — a virtual leaf constructed adjacent to Pass 1's
`blessedClosing` resolution, **never** added to the `named[]` array and never counted toward FR-6's
own budget-of-two.

A new, dedicated, locale-aware matcher, `productNamePatternWithUnitLocale(name, locale)` (gated on the
existing `CYRILLIC_LOCALES` constant), is used **only** by `heading-brand-core-missing`'s presence
(`hasCore`) test at the CTA-heading position (both the `doc.cta.heading`/`doc.localizedName` leaves
and the HTML closing-heading call site) — it builds on `productNamePattern()`'s own digit-flexible
escaping, then additionally recognizes a `digit-run [optional space] unit-key` span written in its
Cyrillic form (via the existing, read-only `LATIN_TO_CYRILLIC_UNITS` table, `unit-tables.ts`). It is
**never** used by the shared `productNamePattern()`/`shortPattern`/`fullPattern` that
`heading-product-name-stuffing` (FR-6) and Pass 2 above still use unmodified — widening the shared
matcher would newly trip `heading-product-name-stuffing` against the corpus's own already-accepted
`specs.heading` content (a non-blessed heading that already, legitimately, contains the cyrillized-unit
product name).

The `doc.localizedName` leaf additionally requires the value (original or repaired) to be a bare name
— no leading/trailing sentence framing, no CTA wording, no sentence-terminal punctuation, quotation
marks, or line breaks, subject to an occurrence-count exemption against the raw, untranslated
`opts.input.name` (never `invariantCore()`/`productShort()`-derived). Concretely: two literal
`Set<string>` banned-character classes — `SENTENCE_TERMINAL = {'.', '!', '?', '…'}` (the ellipsis one
code point, distinct from three ASCII periods) and `QUOTE_MARKS = {'"', '"', '"', '„', '«', '»'}` — with
the bare comma and every apostrophe/single-quote-shaped character excluded from both by omission, no
special-case code; a line break (`\n`/`\r`) banned unconditionally, never exempted; an occurrence-count
exemption (a per-character-code-point `Map` diff between the candidate and `opts.input.name`, not a
class-membership or positional/substring test — a candidate fails for character `c` only when `c`'s
count in the candidate exceeds `c`'s count in `opts.input.name`); and a trailing-position check,
additional to occurrence-count, never in its place — a banned character that is the candidate's own
trailing (non-whitespace) character is exempt only when it also matches `opts.input.name.trim()`'s own
trailing character. **The punctuation-free CTA/sentence-framing component of this shape requirement is
deliberately not implemented** — Specification v16/v17 checked and rejected both a core-position rule
and a word-count-margin rule for it (Implementation Plan §1.5 — cited by description, not by a
renumbered "Rejected alternative N"; see this document's Risk-first rationale "Citation note") and
accepts the gap as disclosed, not closed; this task must not invent a third mechanism for it.

`repair-strategy.ts` gains a `heading-brand-core-missing` entry whose single `fieldInstruction` is
dispatched by `issue.path`: a `doc.localizedName`-path issue gets bare-name wording mirroring
`slug-name-designator-lost`'s own ("Rewrite this localized product name... Return ONLY the corrected
name..."); the one remaining heading-path issue (`doc.cta.heading`, and the HTML closing-heading path)
keeps `heading-product-name-stuffing`'s existing heading-oriented wording ("Rewrite this heading...").
One rule identity, two dispatched instructions — not two rule identities.

#### Files

| File | Change |
|---|---|
| `src/utils/heading-style.ts` | modify — `checkProductNameStuffing` (HTML) and `checkProductNameStuffingDoc` (Doc): Pass 1/Pass 2 structural blessed-position precomputation and FR-6's degenerate-case exemption (unaffected by the narrowing below, still both positions); a new `heading-brand-core-missing` presence check scoped to the CTA-heading position only (`doc.cta.heading` for `schemaVersion: '3.0'`, `doc.localizedName` for `'4.0'`, the HTML closing heading for every version) — `doc.functionality[0].heading` raises no `heading-brand-core-missing` finding under any `schemaVersion`; a new `productNamePatternWithUnitLocale()` locale-aware matcher (gated on `CYRILLIC_LOCALES`, sourced from the existing `LATIN_TO_CYRILLIC_UNITS` table, `unit-tables.ts` — read-only, no new export), used only by this presence test, never by the shared `productNamePattern()`; a new banned-character/occurrence-count/trailing-position shape-test helper scoped to the `doc.localizedName` leaf, kept as a small, separately-testable function (Implementation Plan §1.5 — cited by description, not a renumbered "Risk N"; see this document's Risk-first rationale "Citation note") rather than interleaved into the existing per-heading loop body |
| `src/utils/repair-strategy.ts` | modify — add a `'heading-brand-core-missing'` entry to `REPAIR_STRATEGIES`, ladder `['field-scoped', 'block-scoped']` (mirroring `heading-product-name-stuffing`'s existing entry); `fieldInstruction` dispatched by `issue.path` (bare-name wording for `doc.localizedName`, heading-oriented wording otherwise); `resolveLadder` appends `'full-regen'` automatically |

#### Tests to turn green

These already exist and are **failing** when this task starts — `TEST_WRITING` wrote/extended them,
and `TEST_WRITING` also owns the collateral fixture fixes named below (`content-orchestrator.doc-
gate.spec.ts`'s `makeDoc()` CTA placeholder, and `.hook-pattern.spec.ts`'s/`.ua-doc-pipeline.spec.ts`'s
mocked-fixture reconciliation), performed **before** this task starts, per AGENTS.md §7.7 — the same
division of labor T9 already establishes in this document for `repair-strategy.spec.ts`'s suffix-
preservation rewrite. This task does not itself edit any test file.

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/heading-style.spec.ts`, `src/utils/heading-style.v4.spec.ts` (extended) | `test:logic` | FR-6 — the `productShort(name) === name` degenerate case at both blessed positions (unaffected by FR-7's narrowing); a blessed-position heading carrying the full/invariant form (still flagged); the intentional widening case (a generic first §3 heading, a non-carrying §9 closing, 2+ other product-named headings, all now flagged, both HTML and Doc shapes); a non-blessed heading naming the product (unaffected). FR-7, scoped to the CTA-heading position only — mandatory presence: missing entirely (HTML and Doc, `schemaVersion: '3.0'` via `doc.cta.heading` and `'4.0'` via `doc.localizedName`), a corrupted/partial variant; **no test exercises `doc.functionality[0].heading` under `heading-brand-core-missing`** — out of scope as of v16, asserting presence there would test removed behaviour, not fill a gap; a blessed heading/name carrying the Cyrillic-unit spelling of a Latin-unit-bearing product name must **not** trip the check on either `doc.cta.heading` or `doc.localizedName`, plus a second, representative unit pair (e.g. `kg`/`кг`) proving the matcher is table-driven, not `"W"`-specific; a non-blessed heading carrying the cyrillized-unit product name (the corpus's own `specs.heading` shape) must **not** newly trip `heading-product-name-stuffing` (proving the dedicated matcher does not leak into the shared one); the `doc.localizedName` shape test's full worked-example set (the trailing-period counter-example and its interior-position sibling, the two-instance occurrence-count failure, the Cyrillic-unit passing case) each as its own case, not a subset; the path-parameterized `fieldInstruction` returns bare-name wording for a `doc.localizedName`-path issue and heading-oriented wording for a heading-path issue; a fixture tripping both `heading-brand-core-missing` and `heading-product-name-stuffing` at the same CTA position asserts each rule's own finding count independently (the virtual `doc.localizedName` entry never counts toward FR-6's budget-of-two, Implementation Plan §1.5 — cited by description, not a renumbered "Risk N"; see this document's Risk-first rationale "Citation note"); the `schemaVersion`-conditional retarget proven symmetrically (`doc.cta.heading` wrong/`doc.localizedName` correct passes; the reverse trips it; a `schemaVersion: '3.0'` Doc is still checked against `doc.cta.heading`, unaffected by the retarget). **Do not write a test asserting either of FR-7's two punctuation-free CTA-framing worked examples ("Buy the [name] Now", "Technical specifications for the [name]") is rejected** — Specification v16/v17 accepts this as a disclosed residual, not a gap this task's tests should assume is closed |
| `src/utils/repair-strategy.spec.ts` (extended) | `test:logic` | FR-7 — the `heading-brand-core-missing` ladder entry and its two-branch `fieldInstruction` dispatch |

**Regression checks — fixed by `TEST_WRITING` before this task starts, re-run rather than turned green
by this task.** `content-orchestrator.doc-gate.spec.ts` (`makeDoc()`'s CTA-position placeholder made
truthful — it must genuinely name the fixture's own product; its first-§3-heading placeholder needs no
change, since that leaf is out of `heading-brand-core-missing`'s scope entirely); `content-
orchestrator.hook-pattern.spec.ts` and `content-orchestrator.ua-doc-pipeline.spec.ts` (their mocked
`'Doc (uk-UA)'` response reconciled with the new field-scoped repair path, per Impact Analysis v4
Corrections #2 — either restubbed with an already-passing CTA heading or the `generateText`/
`generateJson` mocks extended to converge); `test/fixtures/simplified-docs.ts` (Impact Analysis v4
Unknown #8, still open: whether its real `localizedName` value independently satisfies the shape test —
verify directly, do not assume). This task's own code must not newly regress any of the four once
`TEST_WRITING`'s fixes land.

#### Acceptance check

A CTA or first-§3 heading carrying exactly the `productShort()` form at a blessed position is never
flagged by `heading-product-name-stuffing`, even when `productShort(name) === name`; a blessed-position
heading carrying more than that form is still flagged (FR-6, both positions, unaffected by FR-7's
narrowing). At the CTA-heading position only — `doc.cta.heading` for a `schemaVersion: '3.0'` Doc,
`doc.localizedName` for `'4.0'`, the corresponding rendered `<h2>` for the HTML path — a heading/name
missing the `productShort()` form entirely, or carrying a corrupted/partial/mistranslated variant,
raises `error`-severity `heading-brand-core-missing`, repaired via the field-scoped/block-scoped ladder
before any full-regen; a Cyrillic-unit-correct localization is never flagged there.
`doc.functionality[0].heading` raises no `heading-brand-core-missing` finding under any circumstance.
The `doc.localizedName` leaf's repaired-or-original value additionally satisfies the banned-character/
occurrence-count/trailing-position shape test before the finding is considered resolved; a repair that
returns heading- or CTA-framed text — even containing the `productShort()` substring — does not resolve
it. A punctuation-free CTA/sentence-framed `doc.localizedName` value with no banned character is not
rejected — the disclosed, accepted residual, not a defect — observable via `heading-
style.spec.ts`/`.v4.spec.ts`/`repair-strategy.spec.ts`, with `content-orchestrator.doc-
gate.spec.ts`/`.hook-pattern.spec.ts`/`.ua-doc-pipeline.spec.ts` passing as regression checks once
`TEST_WRITING`'s fixture fixes land.

#### Notes

**This is a full rebuild against Specification v16/v17's narrower design — do not resume the stashed
v8-era attempt** (`docs/catalog/US-3.1-pipeline-status.md` §3); see the introductory note above this
task for why its `headings[0]` shorthand is unsafe against `test/fixtures/simplified-docs.ts`'s
`sparePartsDoc()`.

The intentional flagged-set widening (FR-6's own, unaffected by FR-7's narrowing; Implementation Plan
§1.5, cited by description — see this document's Risk-first rationale "Citation note") — a stray,
non-blessed product-named heading that used to occupy one of the "reserved" two
slots by accident is now correctly flagged instead — must be asserted as a **deliberate correction**,
not treated as a regression to explain away; no existing test currently exercises this combination, so
this is new coverage, not a flipped expectation. FR-6 and FR-7 are disjoint by construction: a
heading/name carrying exactly the `productShort()` form satisfies both and triggers neither. The
virtual `doc.localizedName` entry FR-7 constructs for the CTA-position check must never leak into FR-6's
own `named[]` array or budget-of-two count (Implementation Plan §1.5, cited by description) — assert this directly on a
fixture that would trip both rules at the same position.

**`TEST_WRITING` owns the four collateral fixture fixes named in the Tests table above** — the same
division of labor T9 already establishes in this document for `repair-strategy.spec.ts`'s suffix-
preservation rewrite. This task's own scope is the production-code change in `heading-
style.ts`/`repair-strategy.ts` and turning the already-recalibrated, already-red tests green; it does
not itself edit any test file, per `.claude/skills/so-builder/SKILL.md`'s constraint that `so-builder`
never modifies a test file and does not own the test files.

FR-6's own Doc-path CTA position (`doc.cta.heading`, read unconditionally by `collectHeadings()`
regardless of `schemaVersion`) is **not** retargeted by this task — a documented, non-blocking parallel
gap (Out of scope), separate from FR-7's own `schemaVersion`-conditional retarget above.

---

### T8 — `[HEADING FORM]` prompt-text disambiguation for the `productShort(name) === name` degenerate case

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T7 |
| **FROZEN (AGENTS.md §9)** | **yes — `src/prompt-core/master-system-prompt.ts` and `src/prompts/task-a.ts`.** This task MUST stop and request approval before editing them. |
| **Status** | done, committed — `1c02c89` (v8 flagged this as "not yet implemented" in error; corrected in Implementation Plan v9 and independently re-verified this round via `git log --oneline -40` and `git show --stat 1c02c89`, which shows `.arch-guard-checksums`, `src/prompt-core/master-system-prompt.ts` + its spec, `src/prompts/task-a.ts` + its spec, and `test/fixtures/golden/full-description-prompts.json` all in the same commit — confirming the §9 rebaseline requirement was met) |

#### What changes

`master-system-prompt.ts`'s `[HEADING FORM]` block gets one added clause stating explicitly that the
two-blessed-position exception holds unchanged when `[Product-short]` equals the full product name
(no configuration code or packaging suffix to drop) — closing the prompt-side contributor to the
es-ES/pt-PT regression FR-6/FR-7 close on the validator side. `task-a.ts`'s one-line restatement of
the same rule (`~:153`) is reworded so it no longer reads as an unqualified "forbids the full name
outright" absolute. No other line in either file changes.

#### Files

| File | Change |
|---|---|
| `src/prompt-core/master-system-prompt.ts` | modify (FROZEN, Story D3 §9 authorization) — `[HEADING FORM]` block (`~:127-136`): add one clause after the existing "AT MOST TWO `<h2>`... may contain `[Product-short]`" sentence, stating the exception holds when `[Product-short]` equals the full name |
| `src/prompts/task-a.ts` | modify (FROZEN, Story D3 §9 authorization) — line `~:153`'s restatement reworded to state the pointer accurately (e.g. "...follow `[HEADING FORM]`, which forbids the full name outright except at the two blessed positions it names") |
| `.arch-guard-checksums` | rebaseline — `bash arch-guard.sh --rebaseline`, same commit, covering exactly these two files |

#### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-a.spec.ts`, `src/prompts/task-a.simplified.spec.ts` | `test:logic` | FR-12 — source-text pin for the reworded line-153 restatement |
| `src/prompt-core/master-system-prompt.spec.ts`, `src/prompt-core/master-system-prompt.v4.spec.ts` | `test:logic` | FR-12 — source-text pin for the `[HEADING FORM]` block's new clause |

#### Acceptance check

`[HEADING FORM]`'s two-blessed-position exception text states explicitly that it holds unchanged
when `productShort(name)` equals the full name; `task-a.ts`'s restatement no longer contradicts it
by omission; no other line in either file changed; `bash arch-guard.sh` shows exactly these two
files changed (and nothing else) after `--rebaseline` — observable via the source-text-pin specs and
a clean arch-guard run.

#### Notes

**§9 stop, already recorded, not newly requested here.** The Story's own D3 decision
(`docs/stories/US-3.1-qa-gate-brand-core-fixes.md`, "Resolved decisions") pre-authorizes exactly this
edit, scoped to disambiguating `[HEADING FORM]`/the invariant-core rule text — `so-builder` must
still perform the §9 stop-and-confirm ritual (state exactly what changes and why, per AGENTS.md §9
steps 1-3) before editing either file, and must not touch any other line, block or rule in either
file. Sequenced after T7 so the prompt text disambiguates a rule whose validator-side semantics are
already settled, and rebaselined separately from T10's `task-b.ts` edit (Implementation Plan §1.10/§1.11,
cited by description, not a renumbered "Risk N" — see this document's Risk-first rationale "Citation
note" — each FROZEN-file commit gets its own immediate rebaseline, not a batched one).

---

### T9 — `meta_title`/`h1` shape validation (`seo-metadata-shape.ts`) and the `meta-title-length` suffix-preservation removal

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | no |
| **Status** | done, committed — `c78e6da` (verified this round via `git log`) |

#### What changes

A new sibling validation module adds two mechanical checks — `meta-title-template-shape` (a
`| {site_name}` suffix, a non-verbatim-`h1`-prefix/mid-word-truncated title, or a title that isn't
strictly longer than `h1` with a dash separator) and `meta-title-h1-identical` (byte-identical
`h1`/`meta_title`) — composed into the four existing `validateSeoMetadata(json, NO_CURRENCY_CHECK)`
call sites. `output-validator.ts` stays untouched (FROZEN, not authorized) — per OD-4's resolution
these checks live outside it. The existing `meta-title-length` repair strategy's suffix-preservation
wording and code branch are removed, since they now actively conflict with the no-suffix template.
**Flagged since v3, attribution corrected in v4 (Plan Review v3, finding 1):** this removal breaks a
real, currently-passing test — `repair-strategy.spec.ts:175-181` pins exactly the `' | '`-detecting
branch being removed. `TEST_WRITING` recalibrates (rewrites) that test and re-confirms the neighbouring
lines-183-186 test still holds, **before** this task's `IMPLEMENTATION` work starts, per AGENTS.md §7.7
— this task's own scope is the production-code change (the new module plus the `meta-title-length`
wording/branch removal) and turning the already-recalibrated, already-red test green; it does not itself
edit any test file, per `.claude/skills/so-builder/SKILL.md`'s constraint that `so-builder` never
modifies a test file and does not own the test files.

#### Files

| File | Change |
|---|---|
| `src/utils/seo-metadata-shape.ts` | create — `validateSeoMetadataShape(seo: SeoResponse \| null, context: string): ValidationIssue[]`, skipping silently when `h1` is absent (following `product-name-consistency.ts:124`'s established convention) |
| `src/services/content-orchestrator.service.ts` | modify — compose `validateSeoMetadataShape` into the four existing `validateSeoMetadata` call sites: the Task B repair-gate `validate:` closures (`~:866`, `~:1267`, `~:1365`) and `runOutputValidation()`'s own call (`~:1647`) |
| `src/utils/repair-strategy.ts` | modify — `meta-title-length` entry: remove `fieldInstruction`'s "Keep the product name and the store suffix after ' \| ' if one is present" wording; remove `truncateAtWordBoundary()`'s `' \| '`-detecting/preserving branch (`~:182-192`) entirely |

#### Tests to turn green

These already exist and are **failing** when this task starts — `TEST_WRITING` wrote the new
`seo-metadata-shape.spec.ts` cases and recalibrated one existing `repair-strategy.spec.ts` assertion
per AGENTS.md §7.7 — see Notes. Turn them green without weakening them.

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/seo-metadata-shape.spec.ts` (new) | `test:logic` | FR-8, FR-9 — one case per mechanical condition (pipe-suffix present, not-a-verbatim-`h1`-prefix/mid-word truncation, not-longer-than-`h1`, missing dash separator, `h1`-identical) plus a passing template-shaped case; at least one fixture where `h1` is category-first/locale-specific (not the QA sample's own product) proving condition 2 is anchored on `h1`, not only ever exercised where the two are indistinguishable |
| `src/utils/repair-strategy.spec.ts` (already recalibrated by `TEST_WRITING` before this task starts — **v4, Plan Review v3 finding 1: reassigned from `so-builder` to `TEST_WRITING`; see Notes**) | `test:logic` | FR-8 — `truncateAtWordBoundary()`'s suffix-branch removal. `repair-strategy.spec.ts:175-181` (`'preserves a trailing " | Store" suffix, which is the least redundant part'`, previously asserting `truncateAtWordBoundary(...).endsWith(' | Center3D')`) directly pins the `' | '`-detecting branch this task removes. **`TEST_WRITING` rewrites this assertion to the new, non-preserving behaviour** (a long title with a `' \| '` segment is now truncated on a plain word boundary with no suffix special-casing, i.e. `truncateAtWordBoundary('Ortur H20 20 W Laser Engraver for Wood and Steel \| Center3D', 55)` no longer ends in `' \| Center3D'`), with an explicit stated reason (mirroring T10's `task-b.spec.ts` margin-test treatment) that the old suffix-preserving property is no longer true by design — not silently deleted, and not left for this task to discover or perform mid-task. `TEST_WRITING` also re-confirms the neighbouring test at lines 183-186 (`'drops the suffix when preserving it would leave no meaningful head'`) still holds: its only assertion is a length bound (`Array.from(out).length).toBeLessThanOrEqual(20)`), which `cutOnWordBoundary()` guarantees unconditionally regardless of the removed branch — it needs no rewrite, only a run-and-confirm. This task turns the already-recalibrated `repair-strategy.spec.ts:175-181` assertion, and the already-confirmed-still-valid lines-183-186 assertion, green via its `truncateAtWordBoundary()` code change alone — this task makes no edit to `repair-strategy.spec.ts` itself |

#### Acceptance check

`meta-title-template-shape` fails a `meta_title` carrying a `| {site_name}` segment, one that
doesn't start with `h1` verbatim (including mid-word truncation), or one that isn't strictly longer
than `h1` with a dash separator following the `h1` prefix; `meta-title-h1-identical` fails a
byte-identical `h1`/`meta_title` pair; both checks are composed into all four existing
`validateSeoMetadata` call sites; `meta-title-length`'s repair strategy no longer preserves a
trailing `| Suffix` segment in either its `fieldInstruction` text or `truncateAtWordBoundary()`'s
code path; the pre-existing `repair-strategy.spec.ts:175-181` suffix-preservation test — already
recalibrated by `TEST_WRITING`, before this task starts, to assert the new, non-preserving behaviour
(not left red, not silently deleted without explanation) — passes under this task's code change with
no further test-file edit made by this task, and the neighbouring lines-183-186 test stays green
throughout — observable via `seo-metadata-shape.spec.ts` and `repair-strategy.spec.ts`.

#### Notes

Neither `meta-title-template-shape` nor `meta-title-h1-identical` is registered in
`REPAIR_STRATEGIES` — explicit Out of scope — both fall through to `resolveLadder`'s `['full-regen']`
default despite carrying a `path`. `output-validator.ts` receives no edit in this task, under any
circumstance — it is FROZEN and not authorized (a separate, unrelated §9 stop if ever needed, not
something this task infers). **T12, new in v2, extends this same `meta-title-length` entry further**
(a marker-preservation instruction line) — sequence that task immediately after this one (see
Execution order); this task's own scope is unchanged by that later addition.

**v3 finding, preserved: a real test pins the removed behaviour.** v2 of this task (and the Impact
Analysis and Implementation Plan before it) stated flatly that no existing test pins
`truncateAtWordBoundary()`'s old suffix-preserving behaviour. That was never independently verified by
opening `repair-strategy.spec.ts` — it traced to a `grep -n "Suffix"` (capital S) that missed the
test's own lowercase "suffix" prose. `repair-strategy.spec.ts:175-181` is real, currently green, and
pins exactly the branch this task deletes; leaving it untouched would land this task's commit with a
newly-red, previously-passing test — a live AGENTS.md §7.7 exposure. v3 fixed the identification of
this defect correctly.

**v4 correction, Plan Review v3 finding 1: who performs the fix, not whether it is needed.** v3's own
text then assigned the rewrite to this task itself ("this task's own scope now explicitly includes
rewriting or removing that test... in the same commit as the `truncateAtWordBoundary()` change"). That
is a §7.7-legitimate edit, but T9 is an `angular`-track IMPLEMENTATION task, executed by `so-builder`,
whose own governing skill file (`.claude/skills/so-builder/SKILL.md`) states twice, in its own voice,
that it must "Never modify a test file" and "do[es] not own the test files" — a test that seems wrong
is a finding to report, not a test to edit. T9's v3 text instructed the one actor barred from touching
test files to touch one. **Corrected here to match T10's own, already-correct pattern for the
structurally identical `task-b.spec.ts` margin-test recalibration**: `TEST_WRITING` rewrites
`repair-strategy.spec.ts:175-181` to assert the new, non-preserving behaviour, and re-confirms
lines 183-186 still hold, **before** T9's `IMPLEMENTATION` work starts — per the TDD ordering
constraint every other task in this breakdown already follows (`so-implementation-planner/SKILL.md`:
"the tests exist and fail before any task runs"). T9 then only turns the already-recalibrated,
already-red test green, exactly as every other task in this breakdown does for its own tests. D9's
design (the module, the wording/branch removal, the reason for the rewrite) is unchanged by this
correction — only the responsible stage and its timing relative to T9 are.

---

### T10 — `task-b.ts` SEO-metadata prompt: define the template's real components, fix both `h1`-collision paths, reconcile budgets, drop the suffix, retain `site_name` guidance

*(Rewritten in full for v2 — supersedes v1's T10, which was built against D11's illustrative v1
draft. All text below is concrete, matching D11 as carried forward unchanged in substance from
Implementation Plan v2 through v3 (`docs/plans/US-3.1-implementation-plan.md#3`) and Specification
v8's finalized FR-13(a)/(b)/(d), checked against the live `task-b.ts`. **v3 correction, still current:**
the recalibrated budget-margin/anchor-truthfulness tests this task turns green are in `task-b.spec.ts`,
not `output-integrity-wiring.spec.ts` — v2 checked the latter's existence but not that it actually
contained these tests; Plan Review v2 opened it and found it does not (see Tests table below).
Implementation Plan v3 has since made the identical citation correction on its own side (v3's D9/D11(c)
prose), so this task's citations and the Plan's now agree.)*

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T9 |
| **FROZEN (AGENTS.md §9)** | **yes — `src/prompts/task-b.ts`.** This task MUST stop and request approval before editing it. |
| **Status** | done, committed — `3d89c86` (v8 flagged this as "not yet implemented — pending the §9 consent gate" in error; corrected in Implementation Plan v9 and independently re-verified this round via `git log --oneline -40` and `git show --stat 3d89c86`, which shows `.arch-guard-checksums`, `src/prompts/task-b.ts` (+77/-36) and `src/prompts/task-b.spec.ts` (+162) in the same commit — confirming the same-commit §9 rebaseline requirement was met) |

#### What changes

Four coupled edits to `TASK_B_INSTRUCTION`'s "— meta_title —" block (lines 39-51) plus
`buildPromptB()`'s excerpt-construction code (lines 112-140), all landing in the same commit — every
line touched sits inside OD-3's, OD-7's and OD-9's already-recorded, now-fully-confirmed §9 grants,
and no line outside them is touched:

- **(a) Cascade components, sourced data.** Step 1 of the degradation cascade names
  `[Localized Category]`/`[Spec]` explicitly, replacing the undefined `[Benefit]` placeholder.
  `buildPromptB()`'s blind `contextHtmlOrDescription.substring(0, 1000)` truncation is replaced with a
  two-slice construction, entirely inside the function body (no new top-level helper): when a
  `<section class="specs">` block is found in the source (the literal string production HTML emits),
  the excerpt is a 500-char prose slice plus up to a 500-char slice from that section, joined by a
  newline; when none is found (the `generateSeoMetadata()` call site, which passes plain-text
  `input.description`), the excerpt stays the full 1000-char prose slice — **byte-identical to today's
  behaviour on that one call site**, not a regression. Total excerpt length is capped at 1000
  characters in both branches. `userContent`'s `${namesBlock}${context}` concatenation order is
  unchanged, and the bracket label still begins with the literal substring `[CONTEXT`.
- **(b) Both `h1`-collision paths fixed by appending, never substituting.** Step 3's "LAST RESORT"
  rung and the separate line-49 bare-core-overflow rule are both revised so neither can return the
  bare H1 core unmodified: step 3 now appends a single-grapheme "·" (U+00B7 MIDDLE DOT, `m = 1`, no
  separating space) directly after the H1 core, and the overflow rule explicitly forbids dropping that
  mark to force a fit — "if `'[H1 core]·'` itself still exceeds the per-locale budget, return it
  anyway, unchanged." Line 40's H1-core-verbatim-prefix rule is respected (the mark is appended, never
  substituted inside the core), and line 49's mid-word-truncation prohibition is preserved unchanged.
- **(c) Budget table reconciled, row format preserved.** The per-locale Title budget table (lines
  67-79) is reconciled to ≤54 (en-GB/en-US/en-ES, es-ES/es-MX, pl-PL, uk-UA/ru-UA, "(any other
  locale)") / ≤51 (de-DE) — unchanged numeric values from v1's draft, now under OD-7's confirmed
  grant. The table's descriptive text is corrected to state the real margin against the untouched
  55-char ceiling (1 character general, 4 for de-DE), not the 7-character margin the current text
  claims. **The table's row format — leading whitespace, colon placement, the literal string
  `Title ≤` — is preserved exactly; only the numeric values change (48→54, 45→51)**, so
  `task-b.spec.ts`'s own row-parsing regex (`:22` — **corrected in v3**; v2 mis-attributed this to
  `output-integrity-wiring.spec.ts`, which contains no such regex — see Tests table below) keeps
  matching with no test-side edit needed for this specific risk.
- **(d) Suffix mandates removed at both lines; `site_name` guidance retained, re-scoped.** Line 44's
  "MANDATORY... present at steps 1 AND 2" sentence and line 47's separate "KEEP suffix" instruction at
  step 2 are both removed. The "`[Site Suffix]` comes from [INPUT DATA] — use it VERBATIM" sentence is
  **retained and re-scoped in place**, stating explicitly it now governs only the JSON's top-level
  `site_name` field, never `meta_title` — this is the only instruction anywhere in
  `TASK_B_INSTRUCTION` that tells the model how to derive `site_name` (`canonicalizeSeoData()` spreads
  `...seo` with no code-side fallback, and `zip-generator.ts` consumes `site_name` directly), so a
  literal deletion of the surrounding text would silently regress it to an unguided value.

All four few-shot anchors (lines 81-106, including line 98 — Anchor 3's own "LAST RESORT" example,
previously missed by an earlier spec revision) are rewritten to match (a)/(b)/(d): none ends in a
`| StoreName` segment, none is byte-identical to its own `H1`, every bracketed character count is
hand-verified truthful and ≤ 51 (the new tightest row, de-DE — `task-b.spec.ts`'s own
`'never demonstrates an over-budget title as a ✓ example'` test (**corrected in v3**; v2
mis-attributed this to `output-integrity-wiring.spec.ts`, which contains no such test) applies the
tightest budget across the whole table to every anchor regardless of which locale row it
illustrates), and every anchor keeps its
`(?:meta_title|step \d result):\s+"…"\s+\[N ✓ …]` line shape intact.

#### Files

| File | Change |
|---|---|
| `src/prompts/task-b.ts` | modify (FROZEN — OD-3 + OD-7 + OD-9 §9 authorizations, all three now fully granted and re-confirmed line-for-line against the live file) — full rewrite of the "— meta_title —" block (lines 39-51) per (a)/(b)/(d) above; budget table (lines 67-79) reconciled per (c); all four few-shot anchors (lines 81-106) rewritten to match; `buildPromptB()`'s excerpt-construction code (lines 112-140) replaces the blind `substring(0,1000)` with the two-slice prose+specs construction per (a) |
| `.arch-guard-checksums` | rebaseline — `bash arch-guard.sh --rebaseline`, same commit, covering exactly `task-b.ts` (a single rebaseline covers all three authorizations landing in this one file — OD-3, OD-7, OD-9 — per the Impact Analysis's rebaseline note); kept **separate** from T8's rebaseline of `master-system-prompt.ts`/`task-a.ts` (Implementation Plan §1.10/§1.11, cited by description — see this document's Risk-first rationale "Citation note") |

#### Tests to turn green

These already exist and are **failing** when this task starts — `TEST_WRITING` wrote them (or
recalibrated two existing assertions per AGENTS.md §7.7 — see Notes). Turn them green without
weakening them.

**Corrected in v3 (Plan Review v2, finding 1).** v2 attributed the budget-margin and
anchor-truthfulness tests below to `src/prompts/output-integrity-wiring.spec.ts`. That file, read in
full this round, is an unrelated `NO_LEAKED_REASONING_CLAUSE` wiring guard — it contains neither test
and needs no edit from this task. Both tests are real, with the exact text, regex and line ranges v2
cited, but they live in **`src/prompts/task-b.spec.ts`, lines 18-67** (a file this task already edits
for other reasons), folded into the single row below rather than a separate file/row.

| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-b.spec.ts` (extended; **v3: also covers the two recalibrated pre-existing assertions v2 mis-attributed to `output-integrity-wiring.spec.ts` — corrected here to their real location, lines 18-67**) | `test:logic` | FR-13(a)-(d) — the `[Benefit]`→`[Localized Category]`/`[Spec]` redefinition; both `h1`-collision fixes (step-3 rung and line-49 overflow rule) via the appended `"·"` marker; the reconciled budget numbers (≤54 general / ≤51 de-DE) with row format preserved; all four few-shot anchors including line 98, each ≤51 characters, none `| StoreName`, none byte-identical to its `H1`; the corrected "AIM LOW" margin text; the `userContent` block-ordering assertion (`:116-126`, "localizedNames block appears after `[Target Languages]` and before `[CONTEXT]`") passing **unmodified** — asserted directly as a regression proof that the excerpt-widening did not disturb it, not merely assumed; the excerpt-widening logic itself — a description containing `<section class="specs">` pulls both the ≤500-char prose slice and the ≤500-char specs slice; one without pulls the full 1000 characters unchanged from today (byte-identical to current behaviour on the `generateSeoMetadata()` call site); the specs-section regex matches the literal production shape `<section class="specs">`; **FR-13(c) — `task-b.spec.ts:39-53`'s `'leaves real headroom...'` test, renamed and recalibrated to assert (1) each row's budget equals its Specification-stated value exactly (general rows: ceiling−1 = 54; de-DE: ceiling−4 = 51), sourced from FR-13(c)'s own numbers rather than a proxy percentage, and (2) the relational invariant that de-DE's budget stays strictly tighter than the general rows' — the original "real headroom" property is no longer true by design (OD-8) so the old assertion could not honestly stay, per the Specification's own framing; FR-13(a)/(b)/(d) — `task-b.spec.ts:55-66`'s anchor-truthfulness test (`'never demonstrates an over-budget title as a ✓ example'`) exercised against T10's rewritten anchors, each hand-verified ≤51 characters, no suffix, never `h1`-identical; `task-b.spec.ts:18-37`'s `'parses every budget row...'` and `'a title at the full %s budget... passes the validator'` assertions confirmed to remain green unmodified (row format preserved per (c), both new values ≤55)** |

#### Acceptance check

`task-b.ts`'s degradation cascade names `[Localized Category]`/`[Spec]` explicitly with data sourced
from the widened `[CONTEXT]` excerpt; no rung, including the line-49 terminal overflow rule, can emit
a `meta_title` byte-identical to `h1` — every terminal case instead ends in the appended `"·"` mark;
the per-locale Title budget table reads ≤54 for the general rows and ≤51 for de-DE, in its original
row format, with an honest 1-/4-character margin statement; no few-shot anchor ends in `| StoreName`
or duplicates its own `H1`; the `site_name`-sourcing sentence survives, re-scoped to that field only;
no other section of `task-b.ts` changed; `bash arch-guard.sh` shows exactly `task-b.ts` changed after
`--rebaseline` — observable via `task-b.spec.ts` (which, corrected in v3, is also where the recalibrated
budget-margin and anchor-truthfulness assertions live — `output-integrity-wiring.spec.ts` is unaffected
by this task and needs no edit) and a clean arch-guard run.

#### Notes

**Authorization is now fully confirmed, not merely proposed — this closes v1 T10's own open finding
for `so-plan-reviewer`.** v1's T10 flagged, as an unresolved finding, whether OD-3's/OD-7's grants
extended far enough to cover lines 46, 48, 49 and `buildPromptB()`'s excerpt code. That question is
now closed: the Owner's **OD-9** (`docs/decisions/US-3.1-open-decisions.md#4`) explicitly names lines
46, 47, 48 and 49 and the whole 112-140 `buildPromptB()` span, and Specification v8/so-clarifier
independently re-verified the grant covers everything (a), (b) and (d) need with no gap. `so-builder`
must still perform the full §9 stop-and-confirm ritual (state exactly what changes and why, per
AGENTS.md §9 steps 1-3) before editing any of (a)-(d) — the authorization being confirmed on paper
does not remove that ritual — and must not touch any section of `task-b.ts` beyond what OD-3/OD-7/OD-9
actually grant, and must not set the budget table to any number other than FR-13(c)'s stated ones.

**Why `"·"`, `m = 1`, no space — a deliberate choice, not an arbitrary one.** OD-10's own arithmetic
(`docs/decisions/US-3.1-open-decisions.md#4`) derives that appending any marker of length `m ≥ 1` can
push an H1 core that today passes the untouched, FROZEN `output-validator.ts` `MAX_META_TITLE = 55`
check into newly failing it, for a bounded set of H1-core lengths (exactly 55 for the general rows;
52-55 for de-DE, growing with `m`). A 1-grapheme mark with no separating space lands on OD-10's own
narrowest permitted case — de-DE's collision band collapses to the same single length (55) the
general rows already have, instead of a wider `{52,53,54,55}` band a longer marker would produce. A
2-grapheme-or-longer marker, and a length-neutral character *substitution* inside the bare core
instead of an append, were both weighed and rejected (Implementation Plan §1.11, `D11`, cited by
description — see this document's Risk-first rationale "Citation note") — do not reintroduce either: substitution breaks line 40's H1-core-verbatim guarantee and
corrupts the customer-facing product name for no reduction in cost (a substituted core still fails
FR-8's template-shape check exactly as the unmarked core does today).

**A further, related residual — distinct from OD-10's own, and accepted by Implementation Plan v4's
D11(b) itself rather than by OD-10 or the Specification — is not closed by this task; its boundary
behaviour is exercised by T12, not here.** At the exact H1-core-length-55 boundary, `meta-title-
length`'s deterministic repair tier (`cutOnWordBoundary()`, `repair-strategy.ts`) can itself strip the
appended mark — and, for every realistic multi-word H1 core, additionally strip the core's own trailing
word via the function's unconditional `lastIndexOf(' ')` backup step — producing a truncated, corrupted
product name strictly shorter than `h1`. **Corrected in v5 (Implementation Plan v4, Plan Review v4
Finding 3):** because the result is shorter than `h1`, it cannot be byte-identical to `h1`, so it
re-trips `meta-title-template-shape`'s condition (2) ("does not start with `h1` verbatim") — not
`meta-title-h1-identical`, as this task's v2-v4 text stated — and correctly falls through to
`full-regen` rather than shipping the collision (a cost, not a silent defect). This is a different
failure path than OD-10's own residual above (the terminal rung's bare `"·"` marker re-tripping
`meta-title-template-shape`'s condition (3) at generation time, for the unrelated reason of a missing
dash separator) — neither the Specification nor OD-10 describes this specific repair-time interaction;
it is a design-time finding the Implementation Plan makes and accepts under its own authority. T12 adds
the field-scoped rung's marker-preservation instruction that mitigates (does not eliminate) this; this
task's own tests do not need to reproduce that boundary case — it is T12's.

**No edit to `[FIELD TYPES]` (lines 24-26) is needed, and none is authorized — do not "fix" it while
adding a character-counting-relevant mark.** That section sits **outside** every one of OD-3's/OD-7's/
OD-9's granted spans; its existing, unedited language — "every symbol... counts as exactly 1" —
already covers the appended single-grapheme `"·"` mark correctly (Implementation Plan D11(b)). Editing
it would be a §9 violation, not a scope quibble, however reasonable it might look next to a
character-counting change.

**The widened `[CONTEXT]` excerpt is a heuristic, not a guarantee `{Spec}` is always present**
(Implementation Plan §1.11, `D11`(a), cited by description — see this document's Risk-first rationale
"Citation note") — validate against a real long-description generation, not only the QA
sample's own short product, if feasible during `so-test-writer`/`so-builder`'s work. **The retained
`site_name`-sourcing sentence is a single point of guidance for a field this Story does not otherwise
validate** (Implementation Plan §1.11, `D11`(d), cited by description) — no FR in this Story adds a shape check on `site_name`
itself, so a `so-test-writer` smoke case confirming `site_name` still populates correctly after the
surrounding text is rewritten is worth adding even though nothing in this Story's own scope requires
it formally.

---

### T11 — `slug-name-designator-lost` repair-ladder entry

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | no |
| **Status** | done, committed — `0c14353` (verified this round via `git log`) |

#### What changes

`slug-name-designator-lost` (an existing, unconditional check in `slug-validator.ts`, unchanged by
this task) becomes repairable via a single field-scoped rewrite of the affected `slugs[i].name`
field, instead of always falling through to a full-document regeneration.

#### Files

| File | Change |
|---|---|
| `src/utils/repair-strategy.ts` | modify — add a `'slug-name-designator-lost'` entry to `REPAIR_STRATEGIES`: `{ ladder: ['field-scoped'], fieldInstruction: ... }`, addressed at the existing `slugs[i].name` path (`slug-validator.ts:75,88`); `resolveLadder` appends `'full-regen'` automatically (the rule is already `error`-severity) |

#### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/slug-validator.spec.ts` (extended) | `test:logic` | FR-11 — a new case proving the repair ladder resolves a `slug-name-designator-lost` finding |
| `src/utils/repair-strategy.spec.ts` (extended) | `test:logic` | FR-11 — the new entry itself |

#### Acceptance check

A `slug-name-designator-lost` finding is repaired by rewriting the single affected `slugs[i].name`
field rather than falling through to full-document regeneration — observable via the new
`repair-strategy.spec.ts`/`slug-validator.spec.ts` cases.

#### Notes

No change to `slug-validator.ts`'s check logic itself — only repairability, per FR-11's own scope.
Fully independent of every other task; may run at any point.

---

### T12 — Preserve `meta_title`'s h1-differentiation marker through `meta-title-length`'s deterministic repair tier

*(New in v2 — decomposes D9's new-in-v2 clause, D11(b)'s natural companion. Not present in v1, since
v1's D11/D9 were still illustrative. **Rebuilt in v5** against Implementation Plan v4's corrected D11(b) —
v4 of this task was built against a since-disproven claim about `cutOnWordBoundary()`'s output at the
H1-core-length-55 boundary and a test entry point (`cutOnWordBoundary()` itself) the function does not
actually expose. See the v5 paragraph at the top of this document for the full correction; only this
task's Tests-to-turn-green table, Acceptance check and Notes change — its Files entry and "What changes"
were already correct and are unchanged.)*

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T9 |
| **FROZEN (AGENTS.md §9)** | no |
| **Status** | done, committed — `3e36e4e` (verified this round via `git log`) |

#### What changes

`REPAIR_STRATEGIES`'s existing `meta-title-length` entry — already edited by T9 to drop its
suffix-preservation wording — gains one further line in its `fieldInstruction` text: an instruction
to preserve a trailing single-mark differentiation character while shortening a title, rather than
drop it. This reduces (does not eliminate) how often T10's appended `"·"` marker is lost when a
`meta_title` needs shortening: the field-scoped rung, tried first in the `['field-scoped',
'deterministic']` ladder, is an LLM rewrite more likely to honour an explicit instruction than the
deterministic terminator's length-blind slice is. No change to the entry's ladder shape or to its
`deterministic` function itself — only the text the field-scoped rung's model call is given.

#### Files

| File | Change |
|---|---|
| `src/utils/repair-strategy.ts` | modify — `meta-title-length` entry's `fieldInstruction` (already touched by T9's suffix-wording removal) gains one additional line: `"If this title ends in a single mark character not part of the product name (added so the title is never identical to the page's H1 value), keep that mark while shortening — never drop it, and never let the result become identical to the H1 value."` |

#### Tests to turn green

**Rebuilt in v5 against Implementation Plan v4's corrected D11(b) (Plan Review v4 Finding 3).** v4 of this
task asserted that `cutOnWordBoundary()`, exercised directly, strips the trailing `"·"` mark at the
H1-core-length-55 boundary and returns the bare, `h1`-identical 55-character core. Independently
re-verified against the live function this round (`repair-strategy.ts:197-204`, unchanged): after
`chars.slice(0, limit)` clips the mark off (`limit` is 55, the marked string is 56 characters, so the
clip is exactly the 55-character core), the function does not return that clip — it unconditionally
backs up to `clipped.lastIndexOf(' ')` and cuts before it whenever that index is `> 0`. For any
realistic multi-word H1 core (every worked example in the Plan is multi-word), the clip ends in a real
content character, so this finds the space before the core's own last word and drops that word too. The
actual output is therefore the core **with its own trailing word additionally stripped**, strictly
shorter than `h1` — never the bare, unmodified core, and never byte-identical to `h1`. Two further
corrections follow: (1) `cutOnWordBoundary()` is not exported (`repair-strategy.ts:197`, no `export`
keyword) — a test cannot call it directly, so the test below goes through the actual production entry
point instead; (2) because the result is shorter than `h1`, it cannot contain `h1` as a prefix, so it
re-trips `meta-title-template-shape`'s condition (2) on re-validation, not `meta-title-h1-identical`.

**Only case (1) below is a turn-green test for this task.** Case (2)'s fixture (the marked H1 core, no
`' | '` segment anywhere in it) never enters `truncateAtWordBoundary()`'s `' | '`-detecting branch —
`sepIndex = text.lastIndexOf(' | ')` is `-1` regardless of whether T9 has removed that branch yet — so
case (2) exercises `cutOnWordBoundary()`'s pre-existing, unconditional `lastIndexOf(' ')` backup step,
which no task in this Story modifies. Once `TEST_WRITING` writes it, case (2) is a **passing
characterization/regression pin documenting the accepted residual**, not a test this task turns from red
to green — stated explicitly here so it is not mistaken for a TDD violation of the ordering constraint
(a task's tests exist and fail before the task runs) when `so-plan-reviewer`/`so-test-writer` reads this
table. T12's own red-to-green obligation is case (1) alone; T12 must not weaken or delete case (2), and
its own `fieldInstruction` addition (case (1)) must not alter case (2)'s outcome, since `fieldInstruction`
text only affects the field-scoped rung, never the `deterministic` function case (2) calls.

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/repair-strategy.spec.ts` (extended) | `test:logic` | FR-13(b) (D9) — **case (1), turns green by this task:** `meta-title-length`'s `fieldInstruction` text includes the marker-preservation instruction |
| `src/utils/repair-strategy.spec.ts` (extended) | `test:logic` | FR-13(b) (D11(b)) — **case (2), already passing when `TEST_WRITING` writes it; this task must keep it passing, not turn it green:** a case exercising `REPAIR_STRATEGIES.get('meta-title-length')!.deterministic` directly — the actual, exported/registered production entry point (`repair-gate.ts`'s ladder invokes exactly this function, which forwards into `truncateAtWordBoundary(current, limit)` and falls straight through to `cutOnWordBoundary()` with no intermediate logic, since the fixture contains no `' \| '` segment) — at the H1-core-length-55 boundary: a synthetic `issue.measured = { actual: 56, limit: 55, unit: 'chars' }` (`limit` sourced from the validator's own ceiling, confirmed against `output-validator.ts:667`'s `issue.measured.limit`, not the prompt's per-locale budget) and a 56-character `current` value (a 55-character multi-word H1 core with the appended `"·"`, no `' \| '` anywhere); asserting the returned string is (a) strictly shorter than the 55-character H1 core — its own last word is additionally stripped, not merely the mark; (b) not byte-identical to `h1`; and (c) does not start with the full `h1` string as a prefix — documenting the corrected residual (re-trips `meta-title-template-shape`, not `meta-title-h1-identical`) through the exported/registered entry point, not a private function |

#### Acceptance check

`meta-title-length`'s `fieldInstruction` text instructs the model to preserve a trailing single-mark
differentiation character while shortening a title rather than drop it (case (1), this task's own
red-to-green obligation). Calling `REPAIR_STRATEGIES.get('meta-title-length')!.deterministic` at the
exact H1-core-length-55 boundary (a 56-character marked title with no `' | '` segment,
`issue.measured.limit = 55`) returns a string that is (1) strictly shorter than the 55-character H1
core, (2) not byte-identical to `h1`, and (3) not a prefix-match of `h1` — the corrected accepted
residual, already true of pre-existing, unmodified `cutOnWordBoundary()` behaviour and merely documented
by case (2), which this task must leave passing, not attempt to turn green — observable via the two
`repair-strategy.spec.ts` cases above.

#### Notes

This does **not** fully close OD-10's residual — a title landing at exactly the H1-core-length-55
boundary is still reduced by the deterministic tier, when the field-scoped rung does not converge
first, to a truncated, corrupted core (missing its own trailing word) that is shorter than, and not a
prefix of, `h1`. **This is a further, smaller, named residual that Implementation Plan v4's D11(b)
itself accepts, layered on top of OD-10's own accepted cost — distinct from OD-10's own residual (the
terminal rung's bare `"·"` marker re-tripping `meta-title-template-shape`'s condition (3) at every
terminal-rung length, an unrelated cause — no dash separator after the `h1` prefix) and distinct from
OD-8's (the general-row/de-DE margin-thinning cost). Neither the Specification nor OD-10 itself
describes this specific repair-time boundary interaction** — it is a design-time finding the
Implementation Plan makes and accepts under its own authority, the same disposition FR-13(c) already
uses for OD-8's own margin-thinning residual. **Corrected in v5 (Implementation Plan v4, Plan Review v4
Finding 3):** the corrected residual re-trips the unregistered
`meta-title-template-shape` check, not `meta-title-h1-identical` as v2-v4 of this task stated — both
checks are equally unregistered in `REPAIR_STRATEGIES` and both fall through to `resolveLadder()`'s
`['full-regen']` terminator, so the run-level safety property (the collision is never silently shipped,
only escalated to full regeneration at a real cost) still holds, by a different check firing than
previously claimed. When the deterministic tier reaches this boundary, `repair-gate` re-validates
afterward and correctly falls through to `full-regen` rather than shipping the collision — a cost,
not a silently shipped defect. **Do not attempt to teach `cutOnWordBoundary()` marker-aware or
word-boundary-specific structure to close this fully** — that is explicitly out of scope
(Implementation Plan §1.11, `D11`(b), cited by description, not a renumbered "Rejected alternative N" —
see this document's Risk-first rationale "Citation note"): it is the same class of fix Specification FR-13(c)
already declines for the parallel template-tail-stripping residual, on `repair-strategy.ts`'s own
stated design principle that a strategy is selected by rule identity alone, never a specific field's
internal structure. **`cutOnWordBoundary()` stays unexported** — Implementation Plan v4's explicit
design decision: nothing else in this Story needs it exported, and widening a private helper's surface
to satisfy one test is not justified when an already-exported/registered entry point
(`REPAIR_STRATEGIES.get('meta-title-length')!.deterministic`) reaches the identical code path. **Sequence
immediately after T9**, not merely "at some point after" (see Execution order's file-contention
note) — this task edits the same `fieldInstruction` string T9 already edits. **Order-independent of
T10**: neither this task's generic instruction text nor `cutOnWordBoundary()`'s behaviour needs to
reference T10's literal `"·"` character to satisfy its own acceptance check above.

**Scope of the required boundary test, resolved explicitly, not left silent — corrected in v5.**
v1/v2's own D11(b) draft asked, in prose no longer present in Implementation Plan v4, for a "Required
test: exercise an H1 core of exactly 55 characters through the full repair path (not just the
validator)" — ambiguous between a unit-level and a `repair-gate.ts`-level integration case, which v4 of
this task resolved by reading the two rungs of `meta-title-length`'s ladder as jointly satisfying it.
**Implementation Plan v4 has since replaced that ambiguous phrasing with a concrete, unit-level
specification** (its "Required test (corrected)" paragraph): call
`REPAIR_STRATEGIES.get('meta-title-length')!.deterministic` directly — the actual production entry
point, since `cutOnWordBoundary()` itself is not exported — with the synthetic fixture and three-part
assertion in the Tests table above. This task's two `repair-strategy.spec.ts` cases satisfy that concrete
specification directly: the `fieldInstruction`-text case (1) proves the field-scoped rung (tried first)
is told to preserve the mark, and the `deterministic`-entry-point case (2) proves what happens when that
rung does not converge and the deterministic tier runs — between them, both rungs of
`meta-title-length`'s `['field-scoped', 'deterministic']` ladder are exercised at the exact boundary, at
the unit level Implementation Plan v4 itself now names; no `repair-gate.ts`-level integration spec is
required for this specific case, since the Plan no longer asks for one. **Separately: the de-DE band
stays a single length, not a range, under this task's own
`m = 1` choice.** Impact Analysis silent-failure risk #8 describes a 52-55-character de-DE band in the
general case (`m` unspecified), but D11(b)'s own arithmetic states the band's width grows with `m`; at
`m = 1` (T10's chosen marker), the smallest de-DE H1-core length already reaching the overflow rule is
55 (same as the general rows), so 55 is the complete boundary case for de-DE too — do not add cases for
52-54, which are not reachable at `m = 1`.

---

### T13 — `repair-gate.ts`'s field-scoped rung must attempt a genuinely missing field, not just skip it

*(New in v7 — decomposes Implementation Plan v9 `D13` (§3.3), the first of the two `repair-gate.ts`
mechanism gaps `pipeline_status` v8 confirmed against the real 2026-09-28 regeneration: the field-scoped
rung silently no-ops on a genuinely missing key, as opposed to a present-but-wrong-type one.)*

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | no |
| **Status** | new this revision |

#### What changes

`applyTier`'s gate condition (`repair-gate.ts:213-214`, confirmed live this round —
`const value = getAtPath(next, issue.path); if (!strategy || typeof value !== 'string') { advance(issue); continue; }`)
currently treats a genuinely absent key (`getAtPath` returns `undefined`, Zod's own `"Required"`
message) identically to "nothing to repair" — it advances the ladder cursor without ever calling
`repairField`/`deterministic`, so a missing-key finding silently exhausts its only rung with no attempt
made at all. `applyTier` gains a `missing` branch: a `value === undefined` finding is no longer skipped
outright — it is dispatched to whichever tier is active with an empty-string `''` stand-in for the
missing value (`strategy.deterministic(missing ? '' : value, issue)` / the same substitution for
`fieldInstruction`), so every existing `fieldInstruction`/`deterministic` implementation stays
byte-identical and needs no signature change. The write side is confirmed already correct
(`setAtPath`'s terminal-segment guard writes cleanly and creates a missing leaf when its container
exists) — this task is a **read-side-only** fix, per the Plan's own explicit framing.

This directly completes `D7`/`T1`'s own `doc-schema` registration (§1.7 of the Plan): `T1` registered
the field-scoped rung for "a required string field that came back empty," but the real regeneration hit
the harder case Zod reports identically-in-spirit but structurally differently — an absent key. Nothing
in `T1`'s own Files/Tests changes; this task closes a gap in already-shipped behaviour it left open.

#### Files

| File | Change |
|---|---|
| `src/utils/repair-gate.ts` | modify — `applyTier` (lines 203-252): replace the `typeof value !== 'string'` skip with a `missing = value === undefined` branch that still dispatches to the active tier's strategy function, substituting `''` for the missing value; a value that is present but genuinely the wrong type (neither `string` nor `undefined` — a structural anomaly no strategy in this codebase currently addresses) still advances-and-skips exactly as today |

#### Tests to turn green

These already exist and are **failing** when this task starts — `TEST_WRITING` wrote them.

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/repair-gate.spec.ts` (extended) | `test:logic` | FR-10(b), AC-6 — a synthetic `T`/`ValidationIssue` fixture whose `path` resolves to a genuinely absent key (not merely an empty string) is dispatched to the field-scoped rung's `repairField`/`fieldInstruction` (and separately, the deterministic rung's `strategy.deterministic`), each called with `''` as the value argument, not skipped; the ladder cursor still advances exactly once per pass, matching the existing present-but-wrong-value behaviour; a value that is present but not a `string` and not `undefined` still advances-and-skips unchanged (regression case, proving this task narrows the gate condition rather than removing it) |
| `src/services/content-orchestrator.doc-gate.spec.ts` (extended — new fixture, `so-test-writer`'s own addition per the Plan's Files table, "a Doc missing `cta.heading` entirely") | `test:logic` | FR-10(b), AC-6 — a `doc-schema` finding against a fixture that omits `cta.heading` as a key entirely (not `emptyRequiredStringDoc()`'s present-but-empty `cta.text`, confirmed this round to be the only existing fixture and confirmed it does NOT exercise this case) is repaired by the field-scoped rung without falling through to full-document regeneration |

#### Acceptance check

A `ValidationIssue` whose `path` resolves to an absent key on the candidate object reaches
`repairField`/`strategy.deterministic` with `''` substituted for the missing value, instead of being
silently skipped — observable via the new `repair-gate.spec.ts` cases; the real-shaped regression
(`doc-schema` against a Doc missing `cta.heading` entirely) is field-scoped-repaired rather than falling
through to full-regen, observable via the extended `content-orchestrator.doc-gate.spec.ts` fixture. A
present-but-wrong-type value still advances-and-skips exactly as before this task (no behaviour change
for that case).

#### Notes

**Deliberately not a `RepairStrategy.fieldInstruction` signature change** (Implementation Plan §3.3) —
`issue.detail` already carries Zod's own message verbatim for a `doc-schema` finding, so the model
already receives an accurate signal without an interface change; only `applyTier`'s own gate condition
changes. This task is independently testable at the pre-loop ladder pass alone (the one place
field-scoped repair already runs today) — it does not depend on `T14`'s main-loop retry to be
observable, though the two together are what let the real regeneration's coin-flip oscillation actually
converge (see `T14`). Sequenced first of the two because `T14`'s own "two independent-leaf findings
converge in one attempt's pass" integration case needs this fix live to exercise the `doc-schema`
(missing-key) side of that convergence.

---

### T14 — `repair-gate.ts`'s main regeneration loop must give a fresh full-regeneration attempt its own field-scoped/block-scoped shot, not only a deterministic cleanup

*(New in v7 — decomposes Implementation Plan v9 `D14` (§3.4), the second of the two `repair-gate.ts`
mechanism gaps: once a finding with no `deterministic` tier survives the pre-loop ladder, only
non-monotonic full-document regeneration can touch it again — the confirmed mechanism behind the real
regeneration's observed fix-one-break-the-other oscillation between `doc-schema` and
`heading-brand-core-missing`.)*

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T13 |
| **FROZEN (AGENTS.md §9)** | no |
| **Status** | new this revision |

#### What changes

The pre-loop ladder logic (`repair-gate.ts`'s "Tiered ladder" block, confirmed live this round at lines
279-345) is extracted into a reusable async helper, `runLadderPass(startArtifact, startIssues) →
{ artifact, issues }`, called from two sites: (1) before the main loop, unchanged behaviour; (2) inside
the main `while` loop (lines 351-406), **replacing** today's narrower `deterministic`-only `cleanupPlan`
block (lines 378-387) — every fresh full-regeneration attempt now gets a genuine field-scoped/
block-scoped shot at its own errors, not only a deterministic cleanup pass. **The critical correctness
detail, carried from the Plan verbatim:** the ladder cursor (`ladderCursor`, `cursorMoves`) must become
**local to each `runLadderPass` invocation** — constructed fresh on each call, not module- or
closure-shared across invocations — otherwise a rung already exhausted against the *initial* attempt's
output would resolve to `'full-regen'` the instant the same rule fires again on a *fresh*
full-regeneration's output, reproducing gap (b)'s own defect one level up. Does not increment
`repairsUsed` — the existing `RepairAttemptRecord` bookkeeping (built from the post-cleanup issue set)
is unchanged in shape, only in what produced the numbers it records. The existing "Final block pass"
(lines 408-431) is left unchanged (Implementation Plan, Rejected alternative 8).

#### Files

| File | Change |
|---|---|
| `src/utils/repair-gate.ts` | modify — extract the pre-loop "Tiered ladder" block (lines 279-345) into `runLadderPass(startArtifact, startIssues)`, with its own fresh `ladderCursor`/`cursorMoves` state local to the call, not shared with any other invocation; call it once before the main loop (unchanged behaviour, same as today) and again inside the main `while` loop immediately after each `produce()`/`validate()` call, replacing the existing `deterministic`-only `cleanupPlan` block |

#### Tests to turn green

These already exist and are **failing** when this task starts — `TEST_WRITING` wrote them.

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/repair-gate.spec.ts` (extended) | `test:logic` | FR-10, FR-11, AC-6 — (i) a fresh full-regeneration attempt whose own output carries a field-scoped-repairable error (not merely a deterministic one) is repaired within that same attempt's ladder pass, not left to a further full-regen; (ii) **two independent-leaf findings converging in one attempt's own pass** — a synthetic fixture carrying both a genuinely-missing-key finding (exercising `T13`'s fix) and an independent-leaf field-scoped finding, both resolved together in the same `runLadderPass` invocation, since `setAtPath` touches only its own leaf and the two cannot regress each other; (iii) **stale-cursor regression** — a rule whose ladder was already exhausted against the *initial* attempt's output (cursor advanced to `'full-regen'`) is proven to get a **fresh** cursor, and therefore a genuine retry, when the identical rule fires again on a *later* full-regeneration's own output, not silently resolved to `'full-regen'` by a carried-over cursor |
| `src/services/content-orchestrator.doc-gate.spec.ts` (extended, the same new "missing `cta.heading`" fixture `T13` adds) | `test:logic` | AC-6 — the real-shaped oscillation (a fresh full-regeneration whose output fixes one of `doc-schema`/`heading-brand-core-missing` but introduces the other) now converges via the retried ladder pass within the same attempt, rather than requiring two full discarded regenerations and shipping attempt 0's own original finding |

#### Acceptance check

A field-scoped/block-scoped-repairable error surfacing fresh on a full-regeneration attempt's own output
is repaired within that attempt's own ladder pass, not left for a further, non-monotonic full
regeneration; two independent-leaf findings (one of them a genuinely-missing-key finding) converge
together in a single attempt's pass; a rule's ladder cursor exhausted against one attempt's output is
demonstrably fresh (not stale) against a later attempt's own output — all three observable via the
extended `repair-gate.spec.ts` cases; the real-shaped `doc-schema`/`heading-brand-core-missing`
oscillation converges within one retried attempt rather than oscillating across two discarded ones,
observable via the extended `content-orchestrator.doc-gate.spec.ts` fixture.

#### Notes

**Depends on `T13`, not merely ordered after it** — this task's own "two independent-leaf findings
converge" test needs a genuinely-missing-key finding to actually be attempted (not silently skipped) for
the `doc-schema` side of that convergence to be meaningful; without `T13` live, that specific test case
would either fail for the wrong reason (the missing key still skipped) or would have to be narrowed to
avoid exercising it, which would leave `T14`'s own acceptance check for the real regression unproven.
**The stale-cursor correctness detail is the subtle part of this task** (Implementation Plan Risk 3,
carried unchanged from v8) — get the cursor's scope wrong (module-level or loop-level instead of
per-invocation) and the fix silently regresses to gap (b)'s own symptom one level up, passing every test
that does not specifically exercise a rule firing on two different attempts' outputs. Does not touch
`toArtifactReport`'s status derivation (`T4`'s own fix, already shipped) or `NON_REGENERABLE_RULES`
(`T4`'s own exclusion set) — `T14`'s retried ladder pass runs `regenerableErrorCount`-eligible errors
exactly as the main loop already does; a `NON_REGENERABLE_RULES` member is still never spent on by
either the pre-loop or the retried in-loop ladder pass, since neither `doc-schema` nor
`heading-brand-core-missing` is a member of that set. **Extending `doc-schema`'s ladder to
`['field-scoped', 'block-scoped']`, or fixing the dormant `getDocBlock` `"doc."`-prefix mismatch, is
explicitly out of this task's scope** (Implementation Plan §3.5, Rejected alternatives 6-7) — `T13` +
`T14` alone are sufficient for the mechanism fix; both findings this incident's oscillation involves are
resolvable at the field-scoped rung once `T13`'s gate condition and `T14`'s retry both hold.

---

### T15 — Deterministic, word-boundary-safe `h1` truncation for `meta_title` when no verbatim-anchored shape can ever pass (`D15`, rebuilt this revision against Implementation Plan v10's corrected threshold/validator)

*(New in v7, decomposing Implementation Plan v9's original `D15` (§2); **rebuilt in v9 of this document**
against Implementation Plan v10's corrected `D15` — the `h1Len ≥ 54` threshold and the equality-based
validator that closes the `h1Len = 54` self-contradiction this document's own `v8` `T15` Notes found and
routed back via `changes_required_architecture`. `D15` resolves the Owner's decision 2 (option (b)) for
Defect 1: `meta-title-template-shape` is architecturally unsatisfiable, not merely under-repaired,
whenever `Array.from(h1).length + MIN_DASH_TAIL > MIRRORED_MAX_META_TITLE` — confirmed against the real
2026-09-28 regeneration's es-ES (66), pt-PT (60) and uk-UA (69) `h1` grapheme counts, all exceeding the
`h1Len ≤ 53` ceiling a passing verbatim-`h1`-anchored `meta_title` requires under the FROZEN
`MAX_META_TITLE = 55` check. No registered repair strategy — field-scoped or otherwise — can close this:
any rewrite bound by the same `len(h1)+2 ≤ length ≤ 55` arithmetic either repeats the failure or would
have to violate the FROZEN ceiling.)*

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | no |
| **Status** | new (design rebuilt this revision against Implementation Plan v10's corrected `D15`; not yet attempted by `so-builder`) |

#### What changes

When `h1` is long enough that **no** verbatim-`h1`-anchored `meta_title` shape can ever pass the FROZEN
55-character ceiling — `Array.from(h1).length + MIN_DASH_TAIL > MIRRORED_MAX_META_TITLE`, i.e.
`h1Len ≥ 54` (`MIN_DASH_TAIL = 2`, the pre-existing reachable check's own real minimum addition — one
dash-like character plus one non-whitespace character — **not** `D15`'s own 1-code-point `"·"` mark; the
`+1` vs. `+2` confusion between these two different quantities is exactly what produced the
`h1Len = 54` gap `v8` of this document found) — the pipeline stops asking the model to solve an
impossible constraint and instead **deterministically constructs** the title from `h1` directly,
unconditionally overwriting whatever the model produced for that entry.

Two new, **module-private** functions in `seo-metadata-shape.ts` — `isH1Unreachable(h1)` (the single
source of truth for which regime an `h1` length is in, called identically by the normalizer and the
validator so the two can never independently drift) and `computeLongH1MetaTitle(h1)` (a pure function of
`h1` alone: a genuine, word-boundary-safe prefix of `h1`, via the already-exported, already-shipped
`truncateAtWordBoundary()` from `repair-strategy.ts`, `D9`, at `SAFE_CORE_LENGTH = 49`, with `"·"`
appended — never a model improvisation, so the real shipped defect this round's predecessor diagnosed,
an interior phrase silently deleted from `h1`, cannot recur by construction) — back a new **exported**
function, `normalizeLongH1MetaTitle(h1, currentMetaTitle)`: a no-op when `isH1Unreachable(h1)` is false,
else `computeLongH1MetaTitle(h1)` regardless of what the model produced. This is called from
`content-orchestrator.service.ts`'s existing `canonicalizeSeoData()` (the single choke point already
re-run at every SEO-producing code path — the three `produce`/repair call sites), so the normalization
applies **before** `validate()` ever sees the artifact, both on initial generation and after any
field-scoped repair — `meta-title-template-shape` will not actually fire for this sub-case in production
once this ships. **Unchanged from `v8` of this document**: the call site itself, its line, and its
wiring into `canonicalizeSeoData()`.

`seo-metadata-shape.ts`'s existing `validateSeoMetadataShape` gains a matching conditional branch — **no
longer an independent structural re-derivation** (prefix / word-boundary / mark checks, as `v8` of this
document specified) but an **equality check**: `isH1Unreachable(h1)` true requires
`metaTitle === computeLongH1MetaTitle(h1)`, exactly, nothing else. This is the second correction
Implementation Plan v10 makes while verifying its own closed-form proof: a structural re-check (a literal
`h1[i] === ' '` test, `v8`'s own design) can reject a value `truncateAtWordBoundary`/`cutOnWordBoundary`
itself legitimately produces, whenever the natural cut point is immediately preceded by a character
`cutOnWordBoundary`'s own trailing-punctuation strip removes (`repair-strategy.ts:204`,
`` /[\s\-–—|,:;.]+$/ ``) — the normalizer and validator can no longer independently drift, because they
call the identical function and compare by equality rather than each re-deriving "does this look right."
The existing dash-tail rule for the reachable case (`h1Len ≤ 53`) is entirely unchanged.

**No `task-b.ts` edit, and no new FROZEN-file authorization** (Implementation Plan §2.5) — the model's
own step-3 cascade text is left exactly as-is; for the `h1Len ≥ 54` case, whatever the model produces is
simply discarded and replaced deterministically before validation runs.

#### Files

| File | Change |
|---|---|
| `src/utils/seo-metadata-shape.ts` | modify — new **exported** function `normalizeLongH1MetaTitle(h1: string, currentMetaTitle: string): string`; two new **module-private** (not exported) functions, `isH1Unreachable(h1: string): boolean` and `computeLongH1MetaTitle(h1: string): string`, shared by the normalizer and the validator; module constants `MIRRORED_MAX_META_TITLE = 55` (mirrors, and is characterization-tested against, `output-validator.ts`'s FROZEN, non-exported `MAX_META_TITLE`, since that file cannot be imported from), `MIN_DASH_TAIL = 2` (the `DASH_TAIL` regex's own minimum match length — the constant `isH1Unreachable`'s threshold is derived from, not `D15`'s own output-shape `+1`) and `SAFE_CORE_LENGTH = 49`; `truncateAtWordBoundary` imported from `./repair-strategy`; `validateSeoMetadataShape`'s `meta-title-template-shape` check branches on `isH1Unreachable(h1)`: the existing dash-tail rule for the reachable case (`h1Len ≤ 53`) is unchanged; the unreachable case (`h1Len ≥ 54`) requires `metaTitle === computeLongH1MetaTitle(h1)` exactly, replacing `v8`'s independent structural re-derivation |
| `src/services/content-orchestrator.service.ts` | modify — `canonicalizeSeoData()`: `meta_title`'s canonicalization result is wrapped with `normalizeLongH1MetaTitle(h1, canonicalizeMultiInOne(item.meta_title, item.language))`, called after the item's `h1` is itself canonicalized (so the function sees the same, final `h1` string the artifact ships). **Unchanged from `v8`** — this round's correction stays entirely inside `seo-metadata-shape.ts`'s own threshold/validator logic |

#### Tests to turn green

These already exist and are **failing** when this task starts — `TEST_WRITING` wrote them. **Routing
note, new this revision:** `isH1Unreachable`, `computeLongH1MetaTitle` and `DASH_TAIL` are
module-private (not exported) per this task's own Files table above — a spec file cannot import them
directly. Every case below is expressed through the module's two **exported** entry points,
`normalizeLongH1MetaTitle` and `validateSeoMetadataShape` (plus, for the ceiling-drift case, the
existing FROZEN, already-exported `validateSeoMetadata`/`output-validator.ts` behaviour), never through
a private symbol — `TEST_WRITING` must not add an `export` to any of the three to make a test easier to
write; that would itself be a scope creep this task does not authorize.

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/seo-metadata-shape.spec.ts` (extended) | `test:logic` | FR-8, AC-4 — **boundary arithmetic**, via `normalizeLongH1MetaTitle`: `h1` lengths 53 (no-op — the reachable check's own last satisfiable length), **54 (new this revision — the value `v8`'s `T15` Notes found uncovered; now the first activating length under the widened threshold)**, 55, 56 and 66 (the real es-ES length), asserting a no-op strictly below 54 and a compliant, honestly-truncated value at and above it. **Validator branch, equality-based (revised this revision):** for an unreachable `h1`, `validateSeoMetadataShape` raises no `meta-title-template-shape` issue when `meta_title` equals the value `normalizeLongH1MetaTitle(h1, <anything>)` returns for that `h1` (obtained through the exported function itself, not a private helper — for an unreachable `h1` its second argument is ignored, so this is a legitimate way to derive the expected value without exporting `computeLongH1MetaTitle`), and raises the issue for any deviation — an interior-edited prefix, a missing `"·"` mark, a bare-`h1` value (which also separately fails `meta-title-h1-identical`), or any other string not byte-identical to that returned value. **New this revision, both via the same equality mechanism (no literal string pinned for either — the equality check makes the exact output path immaterial):** a fixture whose natural word-boundary cut point is immediately preceded by a character `cutOnWordBoundary`'s trailing-strip regex removes (e.g. an `h1` shaped `"...Cloths, x100..."` long enough to be unreachable), asserting `validateSeoMetadataShape` accepts `normalizeLongH1MetaTitle`'s own output there; a fixture with no space at all in the first 49 code points of `h1`, asserting `validateSeoMetadataShape` still accepts whatever `normalizeLongH1MetaTitle` returns, while also asserting the returned value's own length is `≤ 50` and ends in `"·"` (a property check, not a pinned literal, since which internal path `truncateAtWordBoundary`/`cutOnWordBoundary` takes for this fixture is an implementation detail the equality-based validator design deliberately no longer depends on). **`MIN_DASH_TAIL` pin, via the existing (unchanged) reachable-case behaviour:** at `h1Len = 53` (the reachable ceiling), `validateSeoMetadataShape` accepts a `meta_title` of `h1 + "-x"` and rejects `h1 + "-"` and `h1 + "- "` — pinning the dash-tail rule's real 2-code-point minimum tail behaviourally, through the same public check the reachable branch has always used, without needing `DASH_TAIL` exported. **Ceiling-drift characterization, via the existing FROZEN, already-exported validator behaviour:** a synthetic `seo_data` entry whose `meta_title` is exactly 55 code points long passes the FROZEN `meta-title-length` check and one 56 code points long fails it (through `validateSeoMetadata`/`output-validator.ts`, already imported and exercised elsewhere in this Story's own tests) — confirms `MIRRORED_MAX_META_TITLE`'s hard-coded `55` has not silently drifted from the real, FROZEN ceiling, without importing the FROZEN, non-exported constant directly. **Closed-form coverage sweep (new this revision, the executable counterpart to Implementation Plan §2.4.1's proof):** a loop over a representative `h1Len` range spanning the boundary (e.g. 0 through 70, or a sampled subset including 0, 53, 54, 55, 66) constructing a word-boundary-friendly `h1` of each length, asserting for every one that `validateSeoMetadataShape` raises no `meta-title-template-shape` issue against the `meta_title` `normalizeLongH1MetaTitle` itself produces for that `h1` (using a reachable-shaped `h1 + "-x"` candidate as the function's second argument, so the no-op branch is exercised honestly too) — proving the proof's claim (every `h1Len` has a real, validator-accepted, unconditionally-shipped value) directly against the shipped code, not merely asserted in prose |
| `src/services/content-orchestrator.spec.ts` (new, or the sibling file `so-test-writer` selects for `canonicalizeSeoData`-level coverage) | `test:logic` | FR-8, AC-4 — the exact es-ES (66), pt-PT (60) and uk-UA (69) `h1` strings from the 2026-09-28 real regeneration, run through `canonicalizeSeoData`, produce a `meta_title` that (a) is a genuine, word-boundary-safe prefix of `h1` up to the `"·"` mark, (b) contains no interior deletion (the specific defect the real artifact shipped — `"Toallitas de limpieza óptica Formlabs Optical Cleaning Cloths x100·"` silently dropped `"Optical Cleaning Cloths "` from its interior), and (c) passes the updated validator. **Unchanged from `v8`** |

**Regression check, performed this revision, confirmed clean — not a new task obligation, recorded for
traceability.** The widened threshold (`h1Len ≥ 54`, was `≥ 55`) and the equality-based validator both
touch `validateSeoMetadataShape`'s own behaviour more broadly than `v8`'s design did. Every existing `h1`
fixture in `seo-metadata-shape.spec.ts` (checked directly this revision) is short (the longest,
`'Makera Cyclone Dust Collector'`, is 30 graphemes) — far below 54, so none is reachable by either
threshold and none regresses. `task-b.spec.ts`'s `'a title at the full %s budget... passes the
validator'` case (checked directly this revision) uses `h1: 'h'` — it exercises the FROZEN
`output-validator.ts` length ceiling directly, not `seo-metadata-shape.ts`'s own checks, and is
unaffected. `repair-strategy.ts` was also checked for an import from `seo-metadata-shape.ts` (a possible
reverse-import risk this task's new module-private helpers could create) — the one existing reference is
a doc-comment cross-reference, not an import; no circular dependency.

#### Acceptance check

`normalizeLongH1MetaTitle` is a no-op for `h1Len ≤ 53` and produces a compliant, word-boundary-safe
`h1`-prefix-plus-`"·"` value for `h1Len ≥ 54`; `canonicalizeSeoData()` applies it unconditionally at
every SEO-producing code path, before validation runs; the validator's unreachable-case branch accepts a
`meta_title` if and only if it is byte-identical to `normalizeLongH1MetaTitle`'s own output for that
`h1` (equality, not structural re-derivation) — rejecting any deviation; the real es-ES/pt-PT/uk-UA `h1`
strings from the 2026-09-28 regeneration produce a `meta_title` that is a genuine prefix of `h1` (no
interior deletion) and passes validation; the closed-form coverage sweep confirms no `h1Len` in the
sampled range is left unsatisfiable — observable via `seo-metadata-shape.spec.ts` and the
`content-orchestrator`-level regression test. `meta-title-h1-identical` (`T9`/`D6`) is untouched and
cannot fire against this task's own output by construction, since `computeLongH1MetaTitle`'s core is
always truncated to `SAFE_CORE_LENGTH` (49), strictly shorter than any `h1` triggering it (`h1Len ≥ 54`).

#### Notes

**`h1Len = 54` gap, closed this revision — not a residual, not a note for a future round.** `v8` of this
document's own `T15` independently re-derived a genuine self-contradiction in Implementation Plan v9's
`D15` design — at `h1Len = 54` exactly, neither the pre-existing reachable check (`h1Len ≤ 53`) nor
`v9`'s own override (`h1Len ≥ 55`) applied — and correctly refused to invent a fix, routing back to
`ARCHITECTURE_PLANNING` per this stage's own governing constraint. Implementation Plan v10 resolves it:
`D15`'s activation threshold is widened to `h1Len ≥ 54`, derived from `MIN_DASH_TAIL` (the reachable
check's own real constant) rather than from `D15`'s own `+1` mark length, and a closed-form proof
(Implementation Plan §2.4.1) establishes `Reachable(n)` (`n ≤ 53`) and `Unreachable(n)` (`n ≥ 54`, the
logical negation of `Reachable`, not an independently-authored second formula) are exhaustive and
mutually exclusive for every integer `n ≥ 0` — no third "neither applies" state can exist by
construction. This task's own boundary test list above includes `h1Len = 54` for the first time,
exercising the fix directly rather than merely trusting the proof.

**A second, independently-found defect, also closed this revision.** While verifying that proof rather
than accepting `v9`'s validator code at face value, Implementation Plan v10 found `v9`'s own structural
re-check (a literal `h1[withoutMark.length] === ' '` comparison) could reject a value
`truncateAtWordBoundary`/`cutOnWordBoundary` itself legitimately produces, present for every `h1Len`
`D15` was ever designed to cover (not only 54) — closed by replacing the structural re-derivation with
an equality check against the same shared `computeLongH1MetaTitle(h1)` the normalizer calls, so the two
can no longer independently drift. This task's Tests table reflects both corrections.

**Independently derived, not the Owner's literally-suggested mechanism** (Implementation Plan §2.3) —
the Owner's decision 2 suggested `productShort()`; the Plan independently verified it does not work for
the real case (applied to the raw name, it is locale-invariant and lands mid-string, not as an `h1`
prefix; applied to each locale's own translated `h1`, its Latin-capitalization heuristic breaks on
translated prose and fails outright on Cyrillic) and designed `D15`'s actual mechanism — deterministic
truncation of `h1` itself — as a different, disclosed substitute that still delivers the Owner's stated
outcome. This task must not reintroduce `productShort()`/`invariantCore()` as the anchor; use
`truncateAtWordBoundary()` exactly as the Plan specifies.

**Named residuals, not this task's to close** (Implementation Plan §2.6) — a pathological
no-word-boundary-or-all-punctuation-stripped fallback (unobserved in the real corpus; **downgraded this
revision from a possible validation-failure risk to a purely cosmetic one**, now that the validator
accepts exactly whatever `computeLongH1MetaTitle` returns rather than re-deriving an independent
structural expectation) and the model's own wasted first-pass generation cost for `h1Len ≥ 54` entries
(since `task-b.ts` is not edited, the model still attempts its own cascade and that attempt is
unconditionally discarded). **New this revision:** a deliberate `h1Len = 54` non-uniformity — a bare
`h1 + "·"` (55 total) would technically also fit the FROZEN ceiling at exactly `n = 54`, but
`computeLongH1MetaTitle` truncates to `SAFE_CORE_LENGTH` uniformly for the whole `n ≥ 54` regime rather
than special-casing this one value (Implementation Plan §2.4.1) — accepted for simplicity, not a gap;
this task's tests must not assert a bare `h1 + "·"` as the expected value at `h1Len = 54`. None of these
three is a defect this task's tests should assume is fixed.

**`AC-4`'s literal Specification text no longer fully describes the `h1Len ≥ 54` case — resolved as of
`v10` of this document, no longer an open ask.** (Implementation Plan §2.6, Residual 3 — boundary
corrected in `v9` of this document from the `h1 ≥ 55` version of this same finding). This was the Owner's
own authorized redefinition (decision 2), not a scope narrowing this task introduces; `so-implementation-
planner` does not own `specification.md`. **`v9`'s own check here was against `specification` v17,
`APPROVED`, which still read unchanged at the time.** Re-checked this revision against the current,
`APPROVED` `specification` v19: `FR-8(b)` (added at v18) now states this exact `h1Len ≥ 54` alternate
shape explicitly, both at `FR-8`'s own section and at the `AC-4` traceability row, and v19 additionally
discloses `D15`'s own mid-word-truncation fallback (§2.6 Residual 1, above) at the same two places and in
Open questions. The catch-up this note originally flagged as `Specification`'s own future work has
already happened — stated here for traceability only, not as something this task's Files list touches.

**Completely disjoint from `T13`/`T14`** (Implementation Plan §2.7) — no shared file, no shared rule
name, no interaction; may run at any point relative to them, including in parallel. **Closes `D9`/`T10`'s
own named residual (the H1-core-length-55 boundary, §1.11) in full for the general row only —
corrected this revision (`v10`) from `v9`'s own overclaim that this closure held "for every locale."**
Re-checked against Implementation Plan v11 §2.7 (itself corrected there against `specification` v19's
`FR-13(b)`, the `AC-5` traceability row, `NFR-5`, and the `OD-10` entry — four independent citations, all
agreeing): the general-row case (H1-core length exactly 55) **is** fully closed by `D15` — it falls inside
`D15`'s `h1Len ≥ 54` domain, so this task's own unconditional normalization intercepts it before
`task-b.ts`'s line-48/line-49 cascade (`D11`, `T10`) is ever reached. **De-DE's band does not close to the
same degree.** It narrows from 52-55 to 52-53 — but those two remaining values (52, 53) sit *below* this
task's own `h1Len ≥ 54` activation domain: `isH1Unreachable(h1)` is false for them by construction, so
this task's normalization does not run, and cannot run, for a de-DE H1 core of length 52 or 53. Those
entries stay on `T10`/`D11`'s own normal-case cascade path, where a collision still depends on the
differentiation marker's own length (`m ≥ 4` at core length 52, `m ≥ 3` at 53 — the shipped marker is a
single `"·"` character, `m = 1`, so neither remaining length collides today, but this task does not make
that guarantee structural). **This residual is `FR-13(b)`/`D11`/`T10`'s own accepted cost (`OD-10`,
`specification` v19, "narrowed, not eliminated"), not this task's to close** — `T15` does not touch it,
and this task's own tests must not assert that a de-DE `h1` of core length 52 or 53 is ever normalized by
`normalizeLongH1MetaTitle`; it is a no-op for both, correctly, since both are `< 54`. `T12`'s own
unit-level test (`REPAIR_STRATEGIES.get('meta-title-length')!.deterministic`, exercised directly, not
through `canonicalizeSeoData`) is unaffected and stays valid as its own characterization pin — this task
does not remove or supersede it.

**New this revision (`v10`), carried in from `impact_analysis` v5's own Unknown #11, not from
Implementation Plan v11 (which does not name this residual anywhere in its own text) — a named residual,
not a defect.** This task's own unconditional normalization corrects `meta_title`'s *shape* for any
`h1Len ≥ 54` entry, but has no visibility into whether `h1` itself is correct: a model response whose
`h1` carries an unrelated defect (the same general class of real 2026-09-28 data-integrity defect this
task's own design exists to stop compounding, but at the `h1` field itself rather than at `meta_title`)
will still produce a validator-accepted `meta_title`, since `normalizeLongH1MetaTitle` is a pure function
of whatever `h1` string it is given. This is scope-correct behaviour — `h1`'s own correctness is a
separate concern no task in this breakdown owns — not a defect this task's tests should assume is fixed
or attempt to close.

---

### T16 — Reject a JSON-envelope answer to a field-scoped repair, with one bounded corrective retry (`D16`)

*(New in v11 — decomposes `implementation_plan` v13 `D16` (§4a), `pipeline_status` v11 LEAD 3.)*

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T13 (committed `a16ddbd`; same `applyTier` field-scoped lines) |
| **FROZEN (AGENTS.md §9)** | no |
| **Status** | new this revision |

#### What changes

`applyTier`'s field-scoped branch currently writes whatever `opts.repairField(...)` returns (after `trim()`)
into the field. `repairFieldPayload()` keeps the cached `systemBlocks` (which describe a full JSON contract)
while replacing `userContent` with a plain-text instruction, so the model can answer with the whole JSON
object (the 2026-09-29 es-ES Slugs incident). The branch gains a module-private
`looksLikeJsonEnvelope(text)` (`/^[{[]/.test(text.trim())`); a JSON-shaped result triggers exactly one
retry with the original instruction plus an explicit "your previous answer was rejected, return plain text
only" suffix; a second JSON-shaped result is discarded (`replacement = null`, no write). `advance(issue)`
still fires exactly once per rung regardless of internal calls, so ladder cursor/budget bookkeeping from
`T13`/`T14` is untouched. `repairFieldPayload()` itself and `basePayload.userContent` are deliberately NOT
changed (plan §4a.3, Rejected alternative 13). Because the guard sits in the shared branch it protects
`doc-schema`, `slug-name-designator-lost` and `meta-title-length` together.

#### Files

| File | Change |
|---|---|
| `src/utils/repair-gate.ts` | modify — add module-private `looksLikeJsonEnvelope()`; revise `applyTier`'s field-scoped branch to call `opts.repairField` via a local `attempt(instr)` helper, retry once on a JSON-shaped result, discard on a second |

#### Tests to turn green

Must exist and be **failing** when this task starts — `TEST_WRITING` writes them (not yet written as of
this revision; see the v11 test-state note).

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/repair-gate.spec.ts` (extended) | `test:logic` | FR-10/FR-11/AC-6 — (i) a `repairField` mock returning a JSON-object-shaped string, and one returning a JSON-array-shaped string, is rejected on call 1, retried exactly once with the corrective instruction, and a plain-text retry response is accepted and written; (ii) JSON-shaped on both calls: no write, rung cursor advances exactly once, matching other unaddressed-rung cases; (iii) no false positive: every pre-existing plain-string `repairField` mock is accepted on the first call and its existing `toHaveBeenCalledTimes(1)` style counts are unchanged |
| `src/services/content-orchestrator.repair-field-wiring.spec.ts` (extended; exact file confirmed at `TEST_WRITING`) | `test:logic` | AC-6 — real-incident regression: a Slugs `repairField` whose first response is the shipped JSON blob with a hallucinated `site_name` is rejected and, given a plain-text retry, `slugs[i].name` ends up as prose, never the blob |

#### Acceptance check

A JSON-envelope-shaped field-scoped repair result never reaches `setAtPath`: it is retried exactly once,
then either replaced by the plain-text retry or discarded with the rung spent once — observable via the
named `repair-gate.spec.ts` cases (call counts asserted) and the Slugs regression case. Every existing
plain-text `repairField` test in `repair-gate.spec.ts` passes unchanged (call counts intact).

#### Notes

Assumption residual (plan Risk 14): no registered `fieldInstruction` legitimately yields a value starting
with `{` or `[`; do not add a per-rule opt-out (not designed). The retry doubles LLM calls only on the
failure it exists for (Risk 13). Do not touch `repairFieldPayload()`.

---

### T17 — Do not drop an already-complete trailing word when a clip lands exactly on a boundary (`D17`)

*(New in v11 — decomposes `implementation_plan` v13 `D17` (§4b), `pipeline_status` v11 LEAD 2.)*

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none (`T12`/`T15` committed; their pinned tests are this task's non-regression set) |
| **FROZEN (AGENTS.md §9)** | no |
| **Status** | new this revision |

#### What changes

`cutOnWordBoundary(text, limit)` (module-private, `repair-strategy.ts`) unconditionally backs up to the last
space inside the clip, dropping a final word that was already complete when the very next original
character is a separator. It gains an early return: if `chars[limit]` matches `/^[\s\-–—|,:;.]/` (the
exact class its own trailing-strip regex uses) the clip is trimmed of trailing separators and returned
without backing up. `truncateAtWordBoundary`'s exported signature is unchanged and no new export is
added. `computeLongH1MetaTitle` (`T15`) inherits the fix with no edit to its own file, so the real pt-PT
`"...Optical Cleaning·"` (missing "Cloths") shape is corrected.

#### Files

| File | Change |
|---|---|
| `src/utils/repair-strategy.ts` | modify — boundary-aware early return in module-private `cutOnWordBoundary` |

#### Tests to turn green

Must exist and be **failing** when this task starts — `TEST_WRITING` writes them (not yet written).

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/repair-strategy.spec.ts` (extended) | `test:logic` | FR-8/AC-4 — a fixture whose `limit`-code-point clip lands exactly on a space (and one per remaining separator class member) retains the complete trailing word via the exported `truncateAtWordBoundary`; **non-regression:** `T12`'s existing "H1-core-length-55 boundary" describe block and the `truncateAtWordBoundary` describe block (`:163-211`) are NOT modified and stay green (plan §4b.3 closed-form claim, to be empirically confirmed by the run) |
| `src/utils/seo-metadata-shape.long-h1.spec.ts` (extended) | `test:logic` | FR-8(b)/AC-4 — real-artifact regression: the pt-PT `h1` shape (or an equivalent fixture) through the exported entry points yields a `meta_title` that retains the trailing word fitting in `SAFE_CORE_LENGTH`; every existing assertion in the file stays valid (plan §4b.3) |

#### Acceptance check

The named boundary-fixture and pt-PT regression tests pass, and `T12`'s pinned characterization test plus
every existing `truncateAtWordBoundary` case pass unmodified — proving §4b.3's reasoning empirically rather
than trusting it (plan Risk 15).

#### Notes

Two production callers only (`meta-title-length`'s deterministic tier, `computeLongH1MetaTitle`). If `T12`'s
pin or any existing case turns red, that is a finding to report (loop back), not a test to edit (§7.7).
Do not narrow the separator class to whitespace (Rejected alternative 15).

---

### T18 — Make `cta.heading`'s non-empty requirement `schemaVersion`-conditional (`D18`, `FR-14`/`AC-7`)

*(New in v11 — decomposes `implementation_plan` v13 `D18` (§4c); `specification` v20 `FR-14`/`AC-7`.)*

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | no (`description-doc.schema.ts` is not on the §9 list) |
| **Status** | new this revision |

#### What changes

For `schemaVersion: '4.0'` an empty, absent or `null` `cta.heading` no longer fails schema validation (the
renderer discards it), so it stops firing a `doc-schema` finding and spending a repair attempt. For `'3.0'`
the requirement is unchanged: same Zod message, same dotted path `doc.cta.heading` via `docSchemaIssues()`,
same severity. Mechanism (plan §4c.2): `cta.heading` becomes a module-private lenient field
`z.string().nullish().transform(v => v ?? '')` (output type stays `string`, so no TS type or renderer/
consumer change), plus one dedicated root `.superRefine`, placed between the figure-ref and v4 refinements,
that runs `NonEmpty.safeParse(doc.cta.heading)` and forwards issues at `['cta','heading']` whenever
`schemaVersion !== '4.0'` or the heading is non-empty (so a tag-like value still fails for both versions).
`cta.text` and every other field are untouched.

#### Files

| File | Change |
|---|---|
| `src/domain/description-doc.schema.ts` | modify — lenient `cta.heading` field; new `.superRefine` (annotated `doc: ProductDescriptionDoc` like its siblings) with explicit `['cta','heading']` path |

#### Tests to turn green

Must exist and be **failing** when this task starts — `TEST_WRITING` writes them (not yet written; exact
file split confirmed at `TEST_WRITING`).

| Test file | Runner | Covers |
|---|---|---|
| `src/domain/description-doc.schema.v4.spec.ts` (extended) | `test:logic` | FR-14(a)/AC-7 — `'4.0'` with `cta.heading` `''`, absent key, and `null` each parse (per plan §4.3: both empty AND absent pass; do NOT pin a `'4.0'` missing-key rejection); a non-empty `'4.0'` heading still parses; a tag-like `'4.0'` heading still fails at `cta.heading`; a `'4.0'` doc with empty heading through `validateHeadingStyleDoc`, the ToV scan and `mapDocText` yields no new finding and no throw |
| `src/domain/description-doc.schema.spec.ts` (extended) | `test:logic` | FR-14(b)/AC-7(b) — `'3.0'` with empty, absent and `null` heading each still fail at path `cta.heading`, and `docSchemaIssues()` still emits `doc.cta.heading`; `cta.text: ''` still fails for both versions |
| Regression set: the ~20 specs in `impact_analysis` v6 §2 that reference `cta.heading` (incl. `src/services/content-orchestrator.doc-gate.spec.ts` — `T13`'s `'3.0'` missing-key fixture must stay green — `src/utils/repair-gate.spec.ts`, `src/utils/heading-style*.spec.ts`, `test/render-conformance.spec.ts`, `test/tools/scaffold-doc.spec.ts`, and the `doc-tier`/`doc-block-repair`/`sentence-length`/`bullet-lead-punctuation` specs) | `test:logic` | no previously-green spec regresses; any spec counting repair calls with an empty `'4.0'` heading (impact hazard 4, Unknown #13) is identified, and if it must change that is reported, not silently edited |

#### Acceptance check

`'4.0'` documents with an empty/absent/`null` `cta.heading` parse; `'3.0'` documents with the same three
values fail at `cta.heading` with the unchanged message and `doc.cta.heading` finding path; tag-like and
`cta.text` negatives still fail — all as named passing assertions in the two schema spec files. The full
`cta.heading`-referencing regression set runs green (`npm run test:logic`), and rendered HTML for both
versions is unchanged (`test/render-conformance.spec.ts` byte-identical).

#### Notes

Silent-regression trap (plan Risks 17-18): a loosened `'3.0'` would ship an empty CTA `<h2>` with no
validator firing — the `'3.0'` negatives are the only guard, so they must be present. Relaxes only
non-emptiness; `TAG_LIKE` stays (Rejected alternative 19). Do not fold into the v4 refinement's early-return
block (Rejected alternative 16). The `'4.0'` missing-key position is a plan design choice inside FR-14's
latitude (Risk 20); a one-line Specification clarification is recommended, non-blocking.

---

## Regression checks for T13/T14/T15 (new in v8; T15's own paragraph re-checked in v9 against Implementation Plan v10's corrected threshold/validator)

*(This is the work an earlier round of this dispatch left unfinished — its last recorded note was
"let's check whether existing tests would break under D15/D13/D14, to write accurate regression-check
notes," with nothing written down before the round was interrupted. Performed here directly against the
live test files, not asserted from the Plan's own text, following the same discipline `T7`'s own
"Regression checks" paragraph and Implementation Plan §4.2's "Collateral regression sweep" already
establish for this Story.)*

**T13 (`applyTier`'s `missing` branch) — zero regression risk to any existing test, confirmed by
absence, not by assumption.** A full-file search of `src/utils/repair-gate.spec.ts` (1751 lines, read in
full this round) for every angle a test could pin the current, defective `typeof value !== 'string'`
skip-on-missing behaviour — `getAtPath`, `undefined`, "not a string," "wrong type," "wrong-type,"
"skipped" — returns exactly one unrelated hit (a comment on a *different* case, block-scoped repair
against a plain HTML string). **No existing test exercises a genuinely absent key today** — every
existing `doc-schema` fixture in `content-orchestrator.doc-gate.spec.ts` that reaches the field-scoped
rung uses `emptyRequiredStringDoc()` (`cta.text: ''`, a present-but-empty string — `typeof value ===
'string'` already, unaffected by `T13`'s change) or `invalidSchemaDoc()` (a killerSpecs array-length
failure — `getAtPath` returns a defined array, not `undefined`, so it still advances-and-skips
identically before and after `T13`, per this task's own "regression case" already named in its Notes).
`T13` is additive, new coverage only.

**T14 (replacing the main loop's `deterministic`-only cleanup with a full, per-invocation-scoped
`runLadderPass`) — independently traced against every existing test that reaches the main
regeneration loop with a repairable second-attempt output; none is expected to break, for three
distinct, confirmed reasons, listed per group rather than per test:**

- **Second-attempt outputs that are already clean** (`repair-gate.spec.ts`'s `"does not call validate
  an extra time when a regen needs no deterministic cleanup"`, line ~1560, and both
  `content-orchestrator.doc-gate.spec.ts` `"...ships a valid artifact on attempt 2"` /
  `"...renders exactly once when the repair is triggered by a schema failure instead"` cases, lines
  ~255/~314): `runLadderPass`'s own first check, `errs = issues.filter(isLadderCandidate); if
  (errs.length === 0) break;`, fires immediately when the regen's own output already validates clean —
  identical short-circuit to the old `cleanupPlan.length > 0` guard, zero extra `validate()`/
  `repairField`/`generateText` calls either way. Traced line-by-line against the live `repair-gate.ts`
  (this round), not assumed.
- **Second-attempt outputs whose only remaining error carries no `path`** (`repair-gate.spec.ts`'s
  `"records a repair that fixed one locale but broke another as introduced, and ships attempt 0"`, line
  ~291 — `enGb`/`plPl` fixtures deliberately omit `path` entirely): `applyTier`'s loop condition `if
  (planned !== tier || !issue.path) continue;` skips a path-less issue identically under the old
  single-pass `applyTier('deterministic', ...)` call and the new `runLadderPass` — no behavioural
  difference reaches this fixture either way.
- **Second-attempt outputs whose repairable error uses a `['deterministic']`-only ladder** (slug-charset
  — `repair-gate.spec.ts`'s `"ships a regen that fixed the designator but introduced a cleanable
  slug-charset issue, instead of discarding it"`, line ~1529, `repairsUsed: 1`, `attempts` length 1,
  `attempts[0].introduced: []`): no `repairField` is configured in this test at all, so `T14`'s only
  behavioural addition (a field-scoped rung inside the main loop) is a structural no-op for it — the
  ladder resolves slug-charset via its sole `deterministic` rung in the pass's first iteration, finds
  nothing left on pass 2 (`errs.length === 0`), and exits with exactly one extra `validate()` call, the
  same count the old single-pass cleanup produced. `attempts.push` still runs once per `while` iteration
  (unchanged by `T14`), so `attempts` length and `introduced` are unaffected.

**No existing test was found where a second (or later) full-regeneration attempt's own output carries a
fresh, `path`-bearing, field-scoped-first finding (`doc-schema`, `heading-brand-core-missing`,
`meta-title-length`) *and* a `repairField`/`generateText` mock configured with a call-count-limited
queue** — the one combination that would actually exercise `T14`'s new behaviour (an extra `repairField`
call inside the main loop, not only in the pre-loop pass) and could therefore break on an exhausted mock
queue. This is expected: today's code cannot reach that branch at all (gap (b) is exactly what `T14`
closes), so no existing test could have been written to depend on it. **This is forward guidance for
`TEST_WRITING`, not a regression finding**: the new tests `T14`'s own Tests-to-turn-green table
specifies (the "fresh field-scoped-repairable error within one attempt" and "two independent-leaf
findings converge" cases) must budget their `repairField`/`generateText` mocks generously — `T14` can
now call `repairField` once per full-regeneration attempt, not only once in the pre-loop pass — a
`.mockResolvedValueOnce()` queue sized for the old behaviour would under-supply the new one and return
`undefined`, which `.trim()` would throw on.

**T15 (`normalizeLongH1MetaTitle` wired into `canonicalizeSeoData()`) — confirmed disjoint from every
existing `seo_data`/`canonicalizeSeoData` fixture found this round**, beyond Implementation Plan §2.7's
own file/rule-name disjointness argument (which covers `T13`/`T14`, not existing SEO fixtures). A
repo-wide search for every existing test touching `seo_data`/`canonicalizeSeoData`
(`content-orchestrator.doc-gate.spec.ts`, `.hook-pattern.spec.ts`, `.grounding-style-guide.spec.ts`,
`.repair-field-wiring.spec.ts`, `.simplified.spec.ts`, `.ua-doc-pipeline.spec.ts`) found their `h1`
fixtures are all short, invariant-core-style product names (e.g. `content-orchestrator.repair-field-
wiring.spec.ts`'s `H1 = 'Ortur F10 10W Laser Engraver'`, 28 graphemes) — every one is far below `T15`'s
own `h1Len ≥ 54` activation threshold (**re-checked this revision against the corrected, lower threshold
— was `≥ 55` when this analysis first ran; widening the threshold by one only shrinks the reachable
range, so a conclusion that held at `≥ 55` holds a fortiori at `≥ 54`, and the same fixtures were
re-confirmed directly rather than assumed still clear**), so `normalizeLongH1MetaTitle` is a no-op
against every existing fixture and none is at risk of a silently-overwritten `meta_title` once `T15`
lands. No existing test uses an `h1` at or near the 53–54-grapheme boundary at all — new coverage only,
matching `T15`'s own Tests-to-turn-green table. **Also re-checked this revision, per the validator's own
change from structural re-derivation to equality-based comparison:** `seo-metadata-shape.spec.ts`'s
existing `meta-title-template-shape`/`meta-title-h1-identical` fixtures (all short `h1` values, listed
above) exercise only the unchanged, reachable-case dash-tail branch — none reaches the revised
unreachable-case equality branch, so none is affected by that revision either.

**Scope of this analysis, stated plainly rather than implied.** This traced every test in
`repair-gate.spec.ts` and every `content-orchestrator.*.spec.ts` file that reaches `runRepairGate`'s
main loop or `canonicalizeSeoData` with a second (or later) produce/validate cycle — the exact surface
`T13`/`T14`/`T15` touch. It does not re-verify every one of this Story's ~15 tasks' own already-settled
regression claims (`T7`'s four collateral fixtures, `T9`'s `repair-strategy.spec.ts` recalibration,
etc.) — those were independently re-checked in v6/v7 and are unaffected by this round's own work, which
touches no file any of `T1`–`T12` names. Implementation Plan §4.2's own "Collateral regression sweep" —
re-running the full suite once `T13`–`T15` land — remains `QUALITY_GATE`'s unconditional backstop
regardless of this analysis's own care.

---

## Coverage table

### Forward — FR / AC / NFR / plan decision → task

| Item | Task(s) |
|---|---|
| FR-1 | T2, T3 |
| FR-2(a) | T5 |
| FR-2(b) | T4 |
| FR-3 | T6 |
| FR-4 | T3 |
| FR-5 | T6 |
| FR-6 | T7 |
| FR-7 | T7 |
| FR-8 | T9, T15, T17 |
| FR-9 | T9 |
| FR-10 | T1, T13, T14, T16 |
| FR-11 | T11, T14, T16 |
| FR-12 | T8 |
| FR-14 | T18 |
| FR-13(a) | T10 |
| FR-13(b) | T10, T12 |
| FR-13(c) | T10 |
| FR-13(d) | T10 |
| NFR-1 | T8, T10 |
| NFR-2 | T2 |
| NFR-3 | T2 |
| NFR-4 | T7, T9 (constraint honored by tests, no new locale list added) |
| NFR-5 | T8, T10 |
| AC-1 | T2, T3, T4, T5, T6 |
| AC-2 | T7, T8 |
| AC-3 | T7, T8 |
| AC-4 | T9, T10, T15, T17 |
| AC-5 | T9, T10, T12 |
| AC-6 | T1, T11, T13, T14, T16 |
| AC-7 | T18 |
| Plan D1 | T2, T3 |
| Plan D2 | T5 |
| Plan D3 | T4 |
| Plan D4 | T6 |
| Plan D5 | T7 |
| Plan D6 | T9 |
| Plan D7 | T1 |
| Plan D8 | T11 |
| Plan D9 | T9, T12 |
| Plan D10 | T8 |
| Plan D11 | T10 |
| Plan D12 | — (confirmed not reached; a verification note, not an implementation decision — no task) |
| Plan D13 | T13 |
| Plan D14 | T14 |
| Plan D15 | T15 |
| Plan D16 | T16 |
| Plan D17 | T17 |
| Plan D18 | T18 |

### Reverse — task → what it covers

| Task | FR / AC / NFR / plan decision |
|---|---|
| T1 | FR-10, AC-6, plan D7 |
| T2 | FR-1, NFR-2, NFR-3, AC-1, plan D1 |
| T3 | FR-1, FR-4, AC-1, plan D1 |
| T4 | FR-2(b), AC-1, plan D3 |
| T5 | FR-2(a), AC-1, plan D2 |
| T6 | FR-3, FR-5, AC-1, plan D4 |
| T7 | FR-6, FR-7, AC-2, AC-3, NFR-4, plan D5 |
| T8 | FR-12, NFR-1, NFR-5, AC-2, AC-3, plan D10 |
| T9 | FR-8, FR-9, NFR-4, AC-4, AC-5, plan D6, plan D9 |
| T10 | FR-13(a), FR-13(b), FR-13(c), FR-13(d), NFR-1, NFR-5, AC-4, AC-5, plan D11 |
| T11 | FR-11, AC-6, plan D8 |
| T12 | FR-13(b), AC-5, plan D9 |
| T13 | FR-10, AC-6, plan D13 |
| T14 | FR-10, FR-11, AC-6, plan D14 |
| T15 | FR-8, AC-4, plan D15 |
| T16 | FR-10, FR-11, AC-6, plan D16 |
| T17 | FR-8, AC-4, plan D17 |
| T18 | FR-14, AC-7, plan D18 |

### Not tied to any task — regression checks only

`test/render-reconciliation.spec.ts` and `test/render-conformance.spec.ts` are expected to pass
byte-identically before and after this Story (no task touches the renderer or generated-HTML output
shape, confirmed by the Specification's Summary and every task's own Files list above). They are not
mapped to a task because no task modifies what they check; `so-gate-enforcer`'s full `npm test` run
at `QUALITY_GATE` exercises them as an unconditional regression check. A failure there after all 15
tasks land would indicate scope crept into rendering — a defect, not an expected consequence of any
task above.

`src/prompts/task-c.ts` is named by the Story's own D3 authorization ("`task-a.ts`, `task-b.ts`,
`task-c.ts` and/or `master-system-prompt.ts`") as a FROZEN file this Story *may* edit, but no task
above edits it. This is intentional, not an omission: the Specification (Out of scope), the Impact
Analysis (FROZEN-file impact) and the Implementation Plan (Files to create/modify) each
independently re-verified, directly against the live file, that all six of its per-locale
CTA/"why-buy" heading formulas already name `[Product-short]` correctly — `task-c.ts` needs no edit
for this Story. Re-confirmed unaffected by OD-9 (Impact Analysis v2): OD-9's grant is scoped to
`task-b.ts` only.

---

## Result Envelope

*(v10's PASS envelope is superseded. Added in v11.)*

```yaml
stage: IMPLEMENTATION_PLANNING
skill: so-implementation-planner
story: US-3.1
result:
  verdict: PASS
  loop_back_stage: null
  summary: >
    v11 supersedes v10 against specification v20, impact_analysis v6, implementation_plan v13.
    T1-T15 unchanged and committed. Three new tasks decompose the plan decisions that postdate v10:
    T16 (D16, JSON-envelope guard with one bounded retry in repair-gate.ts applyTier), T17 (D17,
    boundary-aware cutOnWordBoundary in repair-strategy.ts), T18 (D18, FR-14/AC-7, schemaVersion-
    conditional cta.heading in description-doc.schema.ts, with a regression run of the ~20
    cta.heading-referencing specs). Coverage table updated forward and reverse (FR-14, AC-7, D16-D18).
    No FROZEN file touched. Status is DRAFT; v10's APPROVED does not carry over.
artifacts_written:
  - key: task_breakdown
    path: docs/plans/US-3.1-task-breakdown.md
    version: 11
    status: DRAFT
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 20
  - key: impact_analysis
    version: 6
  - key: implementation_plan
    version: 13
blocking_issues: []
non_blocking_findings:
  - "TEST_WRITING has not written tests for D16/D17/D18; T16-T18 name the files the plan designates, to be created failing before IMPLEMENTATION."
  - "D17's closed-form non-regression claim (T12 pin unaffected) is unverified until run; T17 acceptance requires the empirical run."
  - "T18 '4.0' missing-key passes (plan 4.3 design choice); a one-line Specification clarification is recommended, non-blocking."
  - "T13-T15 Status rows still read 'new this revision'; v11 preamble marks them historical/committed."
```
