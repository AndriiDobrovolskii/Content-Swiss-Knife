---
artifact: implementation_plan
story: US-3.1
version: 13
status: APPROVED
owner: so-planner
created_at: 2026-09-28T21:00:00Z
updated_at: 2026-09-30T14:00:00Z
supersedes: docs/plans/US-3.1-implementation-plan.md#12
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 20
  - key: open_decisions
    version: 4
  - key: impact_analysis
    version: 6
  - key: pipeline_status
    version: 11
    note: the dispatching artifact for this round — so-builder's IMPLEMENTATION-stage loop-back
      (verdict CHANGES_REQUIRED, loop_back key blocked_by_architecture), naming the three design
      decisions this revision addresses. Reference only, not owned or edited here.
  - key: task_breakdown
    version: 10
    note: reference only — so-implementation-planner's own artifact, not owned or edited here.
open_decisions_blocking: false
---

# Implementation Plan: US-3.1 — Make the repair gate actually block ungrounded content and stop the brand-core/heading-form rule conflict

## ⚠ Process note (this round, v13) — re-run against `specification` v20 / `impact_analysis` v6; the one v12 gap (Decision 3) is now designed as `D18`; `D1`-`D17` unchanged

**Why this round exists.** v12 returned `CHANGES_REQUIRED` (`loop_back_stage: changes_required`) solely
because no FR authorized the `cta.heading` schema fix (its §4c). `SPECIFICATION` answered with v20
(`APPROVED`): `FR-14`/`AC-7`. `impact_analysis` advanced to v6 (adds the `description-doc.schema.ts`
surface and a `doc.cta.heading` consumer table; its non-blocking unknown #12 asks whether a *missing*
`cta.heading` must pass for `'4.0'`). Both upstreams moved, so per the artifact-staleness contract this
round re-consumes them.

**What changed.** §4c is rewritten as the design of `D18` (a lenient, self-normalizing field plus one
dedicated per-version root refinement; one file; no FROZEN edit; no TS-type change), and the Files,
Validation strategy, Risks, Rejected alternatives, Traceability and Result Envelope sections are extended
for it. **Unknown #12 is settled in §4c.3** (missing passes for `'4.0'`, a superset of both readings;
`'3.0'` still fails at the same path).

**What did not change.** `D1`-`D17` (§1-§4b, including `D15`/`D16`/`D17`) are carried forward verbatim.
`specification` v20's only delta is `FR-14`/`AC-7` (its front matter states the rest is unaffected);
`impact_analysis` v6's only new surface is the FR-14 schema file and its consumer table. The v12 process
note below is retained as the historical record of the round that produced `D16`/`D17` and identified
this gap; its statement that Decision 3 is "NOT designed" and its `CHANGES_REQUIRED` verdict are
**superseded by this note and §4c**. Verdict this round: `PASS`.

---

## ⚠ Process note (carried from v12, historical — its Decision 3 verdict is superseded by v13) — `ARCHITECTURE_PLANNING` loop-back from `IMPLEMENTATION`, `pipeline_status` v11, `blocked_by_architecture`; two of three findings designed, one routed onward to `SPECIFICATION`

**Why this round exists.** `v11` (this document, unchanged below except for this note and the
additions in §4a/§4b/§4c and the extended §4/§5) passed `PLAN_REVIEW`/`HUMAN_PLAN_APPROVAL` and
moved to `IMPLEMENTATION`. `so-builder`'s dispatch there produced `pipeline_status` v11
(`docs/catalog/US-3.1-pipeline-status.md`), which returned `CHANGES_REQUIRED` /
`loop_back_stage: blocked_by_architecture` — three findings, in `so-builder`'s own stated priority
order, each requiring an `ARCHITECTURE_PLANNING` design decision `so-builder`'s own governing skill
does not authorize it to invent. This round consumes `pipeline_status` v11 as a dispatching input
(not an artifact this stage owns or edits) and, per this round's own instruction, independently
re-verifies each finding's primary evidence against the live source before designing around it,
rather than trusting `pipeline_status`'s own framing at face value — the same discipline this
document's own `v9`/`v10`/`v11` rounds already applied to `task_breakdown`'s loop-backs.

**LEAD 3 (highest severity — a corrupted, garbage URL shipped) — independently re-verified,
confirmed, and designed this round as `D16`, §4a.** Re-read `repair-gate.ts:50-52`
(`repairFieldPayload`) and its `applyTier` field-scoped branch (confirmed at the file's current
lines 276-279 before this round's edit) live; re-read `task-slug.ts`'s system instruction and
`content-orchestrator.service.ts`'s Slugs gate wiring (lines 878-896) and `normalizeSlugResponse`
(lines 1535-1549) live. `pipeline_status` v11's root-cause trace holds up against the live source
in every particular checked. Designed and ready: an output-shape guard in `applyTier`'s shared
field-scoped branch, with a bounded one-shot retry, plus an explicit decision (with reasons) to
leave `repairFieldPayload()` itself unchanged rather than restoring `basePayload.userContent`.

**LEAD 2 — independently re-derived (not merely re-cited) and designed this round as `D17`, §4b.**
Hand-traced `cutOnWordBoundary` (`repair-strategy.ts:199-206`) against both `h1OfLength`'s fixture
shape and the real pt-PT `h1`/`meta_title` pair pipeline_status v11 cites, confirming the exact
mechanism: the function always backs up to the space BEFORE the word ending at the clip boundary,
even when that boundary word is already complete (the character immediately following the clip, in
the untouched original text, is itself a separator). Designed and ready: a boundary-aware early
return in `cutOnWordBoundary`, chosen over a local, non-shared duplicate specifically because a
closed-form check against `T12`'s own pinned fixture (`repair-strategy.spec.ts`'s
"meta-title-length deterministic tier at the H1-core-length-55 boundary" describe block) shows the
fix does not reach that fixture's own branch — see §4b for the full derivation. This is `so-planner`'s
own reasoning, not yet independently confirmed by `PLAN_REVIEW` or by an actual test run; flagged
as such in §4b/§4.3/§5, matching this document's own established discipline for a not-yet-reviewed
proof (see the existing items 9-11 in §4.3, about `D15`'s own `h1Len=54`/validator-equality fixes).

**LEAD 1 — checked against `specification` v19 as this round's own governing instruction required,
found NOT covered, and therefore NOT designed this round — §4c.** Searched `specification` v19 in
full (not only the `cta.heading`/`FR-7` passages already known to exist) for any requirement that
would authorize making `description-doc.schema.ts:216`'s `cta: z.object({ heading: NonEmpty, ... })`
`schemaVersion`-conditional. Found extensive `v19` coverage of `cta.heading` in service of `FR-7`
(which Doc-path the `heading-brand-core-missing` REPAIR check reads, and at which position) — but
no FR addressing the separate, earlier-stage question of whether the Zod SCHEMA itself should
require `cta.heading` to be non-empty for `schemaVersion: '4.0'`. Per this round's own governing
instruction, inventing that FR is `so-spec-writer`'s territory, not `so-planner`'s — doing so here
would be the AGENTS.md §10 "escape hatch" this Story's own pipeline exists to close. This is the
one finding this round returns `CHANGES_REQUIRED` for (`loop_back_stage: changes_required`, which
`stage-map.yaml` routes to `SPECIFICATION`); §4c states precisely what is missing, for
`so-spec-writer`'s use, without pre-deciding the FR's wording.

**Verdict this round: `CHANGES_REQUIRED`, `loop_back_stage: changes_required`.** Per this round's
own instruction, the whole Plan is not held back on the one finding that needs `SPECIFICATION`:
`D16` (§4a) and `D17` (§4b) are fully designed, ready for `so-implementation-planner`, and recorded
in this same revision — a future `ARCHITECTURE_PLANNING` round, once `specification` gains the
missing FR, only has to add Decision 3's design on top of what is already here, not redo `D16`/`D17`.
`D1`-`D15` (§1-§3, §4 as it stood in `v11`) are unaffected by this round's work and are **not**
re-verified again here beyond what §4a/§4b/§4c themselves touch — no upstream (`specification` v19,
`impact_analysis` v5) moved between `v11` and this round, only `pipeline_status` advanced (v8 → v11,
consumed here for the first time), so there is no staleness to re-check in `D1`-`D15`'s own substance.

---

## ⚠ Process note (this round, v11) — re-verified against `specification` v19 and `impact_analysis` v5; one correction found and closed, substance otherwise unchanged

**Why this round exists.** `v10`'s own front matter recorded `inputs_consumed: specification version 17,
impact_analysis version 4`. Both upstreams have since moved — `specification` v17 → v19 (v18 added
`FR-8(b)`, describing `v10`'s own `D15` mechanism back into the Specification per `PLAN_REVIEW` v8's
loop-back; v19 then fixed three internal-consistency gaps `SPEC_REVIEW` v17 found in v18's own addition:
a stale Summary claim, an undisclosed second departure from `AC-4`'s literal text — the mid-word-
truncation fallback — and a stale `FR-13(b)`/`AC-5`/`NFR-5`/`OD-10` collision-band figure); `impact_analysis`
v4 → v5 (re-validated against `specification` v19, found no new file/store/locale/fixture surface, and
corrected a stale implementation-status narrative in its own text, unrelated to `D15`). Per this
repository's own artifact-staleness contract (`docs/workflow/artifact-schema.md`), `v10` was stale against
both the moment `specification` v19 was approved, and this round re-runs `ARCHITECTURE_PLANNING` against
both current upstreams, read in full, rather than only against the `FR-8(b)`/`AC-4`/`AC-5` diff.

**What this round checked, and what it found.** `v10`'s own `D15` (§2.4 below) is the mechanism
`specification` v19's `FR-8(b)` was written **to describe** — so-spec-writer specified the plan's real,
already-verified design, not the reverse — so the expected outcome going in was that `D15` needed no
substantive change, only confirmation. That expectation is correct for `D15`'s own code and closed-form
proof: independently re-checked line by line against `FR-8(b)`'s final, approved wording (below), every
one of the threshold (`h1Len ≥ 54`), the `≤ 50`-code-point ceiling, the "prefix is a genuine,
unmodified/never-interior-edited slice of `h1`" property, and the disclosed mid-word-truncation fallback
lines up exactly between the two documents — `specification` v19 does not require any change to `D15`'s
code or to its closed-form proof (§2.4.1).

**One real gap was found, not in `D15` itself but in this Plan's own prose about a *different*, already-
shipped mechanism's residual.** §2.7 (below, `v10`'s text, unchanged until this round) claimed `D15`'s
widened `h1Len ≥ 54` threshold "closes `OD-10`'s previously-accepted residual as a side effect, **for
every locale**" — describing that residual, at the time, as "exactly `h1`-core length 55 general /
52-55 de-DE." `specification` v19 (`FR-13(b)`, the `AC-5` traceability row, `NFR-5`, and the `OD-10` entry
in Open questions — all four, independently cross-checked, agree) now states the band precisely, and
corrects it: the general-row case is fully closed (subsumed by `D15`'s `h1Len ≥ 54` domain, exactly as
§2.7 already argued), but de-DE's band narrows only to **52-53** — two `h1`-core lengths **below**
`D15`'s own `h1Len ≥ 54` activation domain, produced by `task-b.ts`'s own line-48/line-49 cascade (`D11`,
already shipped) for `h1Len` values `D15` never touches at all. `specification` v19 states this explicitly
as "narrowed, not eliminated" and "collision-live for de-DE, depending on an unspecified differentiation-
marker length" (`NFR-5`; `OD-10` entry). **`v10`'s own "for every locale" claim was therefore an overclaim**
— `D15` cannot close a residual produced at `h1Len` values outside its own domain, regardless of how the
threshold is worded. This is a correction to this Plan's own narrative, not a design defect: `D15`'s code
is unaffected, and this Plan never claimed responsibility for a fix to the de-DE 52-53 band (that is
`FR-13(b)`/`D11`'s own accepted residual, `OD-10`, unaffected by anything in §2). §2.7 is corrected below to
state the closure precisely — general row fully closed, de-DE narrowed from 52-55 to 52-53 (still open) —
matching `specification` v19's own text rather than the earlier, imprecise "for every locale" framing.

**Everything else re-verified and found unchanged in substance.** §2.6 Residual 3 (this Plan's own
non-blocking note that `Specification`'s `AC-4`/`FR-8` text needed to catch up to `D15`'s shipped
behaviour) is now resolved by `specification` v18/v19 — corrected in place below to say so, not left as an
open ask against a Specification that has since answered it. The disclosed mid-word-truncation fallback
(§2.6 Residual 1) is unchanged in substance and now also stated explicitly by `specification` v19 itself
(a new `AC-4`-traceability-row/Open-questions disclosure, `FR-8(b)`'s own prose unchanged) — the same
already-accepted engineering, now doubly disclosed rather than redesigned. One prose-level looseness,
independent of anything `v19` changed, is noted for completeness in §4.3 (new item 12): `FR-8(b)`'s own
text describes the word-boundary search span as "within its first 50 code points of `h1`," while `D15`'s
`SAFE_CORE_LENGTH` constant (49) searches within the first 49 — a one-code-point difference that can never
produce a `meta_title` exceeding the `≤ 50`-total-length bullet (the binding constraint `D15`'s own
`SAFE_CORE_LENGTH + 1 = 50` respects exactly) and cannot produce a validator disagreement (the validator
checks equality against the same shared function `D15`'s normalizer calls), so it is flagged as an
observation for the Specification's own prose, not a Plan defect requiring a code change. `impact_analysis`
v5's own corrections (the `T1`-`T12` status narrative, the confirmed absence of any `seo_data`-bearing
corpus fixture) were already independently reached by `v10`'s own process notes (§1) and validation
strategy (§4.2, sourcing `T15`'s test data from the real 2026-09-28 regeneration, not the corpus) — no
change needed there. No other part of `specification` v19 (read in full this round, not only `FR-8`/`FR-13`/
`AC-4`/`AC-5`) introduces a requirement this Plan does not already address; `D1`-`D14`'s design substance
is unaffected, confirmed against `specification` v19's own front matter, which states `FR-1` through
`FR-12`, `FR-13(a)/(c)/(d)`, and `FR-8(a)`/`(b)`'s own normative text are unaffected by v19's three fixes.

**Verdict: `PASS`, re-verified and confirmed unchanged in substance, with the one narrative correction
above.** No new FROZEN-file request, no new Owner decision, no change to `D15`'s code, its closed-form
proof, or `D13`/`D14`.

---

## ⚠ Process note (carried from v8, unchanged) — v7 was accidentally destroyed while writing v8, and is not recoverable

v8's first draft used the `Write` tool against this file after reading only a partial span, not the
whole document. `v7` (`status: APPROVED`) was never committed to git, so that `Write` call overwrote it
in place with no git history to recover from. `git log --all`, `git stash list`, `git fsck
--lost-found` and a scratchpad/checkpoint search were all exhausted at v8's own round and found
nothing. **`D1`–`D5` and `D10`–`D12` below remain v8's reconstruction, not recovered v7 text** — rebuilt
from `docs/plans/US-3.1-task-breakdown.md` v6 plus live-source re-verification. `D6`–`D9` are v7's
original text, captured verbatim before the overwrite. Per this round's own explicit instruction, this
revision builds on v8's content **without redoing or re-litigating that reconstruction's substance** —
`so-plan-reviewer` remains the stage that gives `D1`–`D5`/`D10`–`D12` first-draft-level scrutiny, not
this round.

## ⚠ New process note (this round) — v8's own carry-forward status for `D5`/`D10`/`D11` is factually wrong, corrected here without touching their design substance

Independent verification this round (`git log --oneline -- src/prompts/task-b.ts`, `git log --oneline
-30`, `git show --stat` on the relevant commits) found that **`T7`, `T8` and `T10` are already
committed on this branch**, contradicting v8's §1 claim that only `T1`–`T6`, `T9`, `T11`, `T12` are done
and that "`T7`/`T8`/`T10` remain unattempted":

- `T7` — commit `ad4c678`, `feat(US-3.1 T7): heading-brand-core-missing (FR-6/FR-7) — blessed-position
  restructure`.
- `T8` — commit `1c02c89`, `feat(US-3.1 T8): [HEADING FORM] disambiguation for short===full product
  names (FR-12)`.
- `T10` — commit `3d89c86`, `feat(US-3.1 T10): task-b.ts SEO-metadata prompt rewrite (FR-13(a)-(d))`,
  which also rebaselines `.arch-guard-checksums` **in the same commit**, per AGENTS.md §9's own
  requirement — confirmed via `git show --stat 3d89c86` (`.arch-guard-checksums | 2 +-`).

Independently confirmed against the **live** `src/prompts/task-b.ts` (re-read in full this round): its
"— meta_title —" block already matches `D11`'s designed target exactly — the three-step cascade with
the appended `"·"` mark, the "never drop the '·' to force a fit, and never truncate the H1 core to force
a fit" line, the reconciled `≤54`/`≤51` budget table, no `[Site Suffix] is MANDATORY` instruction, and
four few-shot anchors none of which ends in `| StoreName` or is byte-identical to its own H1. This is
not a coincidental resemblance — `docs/catalog/US-3.1-pipeline-status.md` v4 (`0c1709f docs(US-3.1):
record IMPLEMENTATION pipeline status v4 — T10 committed, ...`) already recorded `T10` as committed,
before v8 (and v7, per its own reconstruction) apparently lost track of this. `pipeline_status` v8's own
Defect 2 analysis is internally consistent with `T7` being live (it treats `heading-brand-core-missing`
as an already-firing rule on the real artifact) — only `implementation_plan` v8's carry-forward
bookkeeping for `D5`/`D10`/`D11` is wrong, most likely because the reconstruction was built from
`task_breakdown` v6's own task-description prose (what `T7`/`T8`/`T10` **should** do) without
cross-checking `git log` for what had **already shipped**.

**What this changes, precisely, and what it does not:**

- `D5`, `D10`, `D11` below are corrected to **`Status: done, committed`** (commits `ad4c678`,
  `1c02c89`, `3d89c86` respectively). Their **design substance is unchanged** — this is a status-field
  correction, not a redesign, and is not the reconstruction v8's process note already disclosed as
  needing `so-plan-reviewer`'s scrutiny (that disclosure concerns whether the reconstructed *design*
  matches the destroyed `v7`'s wording, not whether the task shipped).
- This directly affects this round's own work: §2 below (Defect 1 / `D15`) is designed **as a layer on
  top of the already-shipped `task-b.ts` text**, not as work contingent on a still-pending §9 consent
  gate. `D15` needs no further edit to `task-b.ts` at all (see §2.5) — but this status correction is the
  reason that question has a clean answer rather than an assumed one.
- **Not addressed by this round, flagged for `so-implementation-planner`:** `task_breakdown` v6 (the
  Story's own `APPROVED` task list) still describes `T7`/`T8`/`T10` as pending work with `Depends
  on`/ordering entries built around that assumption. That artifact is not owned by `so-planner`, so this
  Plan does not edit it — but `so-implementation-planner`'s next revision should mark `T7`/`T8`/`T10`
  `done` rather than re-decompose already-shipped work. Recorded in `blocking_issues`/`non_blocking_findings`
  below (§5) so it is not silently lost between rounds the way it evidently already was once.

---

## ⚠ New process note (this round) — `h1Len = 54` self-contradiction in `D15` closed; no Owner decision needed

**Loop-back source.** `so-implementation-planner`'s `task_breakdown` v8 (`T15`'s own "Blocking gap" Note,
its Result Envelope's `blocking_issues`) independently re-derived, against the live `DASH_TAIL` regex in
`seo-metadata-shape.ts:36` and `D15`'s own coded threshold in this Plan's §2.4, a genuine
self-contradiction in `v9`'s own design: the pre-existing (`D6`) reachable-shape check requires
`h1Len ≤ 53` for any `meta_title` to pass (`DASH_TAIL`'s minimum match is 2 code points — one dash-like
character plus one non-whitespace character — against the FROZEN 55-char `MAX_META_TITLE` ceiling), while
`D15`'s own override in `v9`'s §2.4 code activated only at `h1Len ≥ 55` (`h1Len + 1 > 55`). **At
`h1Len = 54` exactly, neither branch's condition held** — `so-implementation-planner` correctly declined to
invent a fix and routed back here.

**Root cause, confirmed against live source this round, not merely re-cited.** `v9`'s own §4.2 validation-
strategy prose already lists `h1` lengths `53, 54, 55, 56, 66` as the boundary test set for
`normalizeLongH1MetaTitle` — i.e. `v9`'s own stated *intent* already treated `54` as a value the function
should handle correctly (as either a no-op or a compliant override). The bug is that §2.4's *code* derived
its threshold from `D15`'s own output shape (`h1` plus the 1-code-point `"·"` mark, hence `+ 1`) instead of
from the pre-existing check's actual minimum addition (`DASH_TAIL`'s 2-code-point minimum tail, `+ 2`) —
an off-by-one between two quantities that happen to share a name ("the smallest addition to `h1`") but are
not the same number. `v9`'s own §4.2 prose and §2.4 code therefore already disagreed with each other before
`so-implementation-planner` ever touched the file; the loop-back surfaced an inconsistency this Plan
introduced against itself, not a fresh ambiguity.

**The fix, and why it is chosen over the other named direction.** `D15`'s activation threshold is widened
from `h1Len ≥ 55` to `h1Len ≥ 54` (§2.4, revised) — i.e. it is now derived from the same `+ 2` (`DASH_TAIL`'s
real minimum tail) the reachable check already uses, not from `D15`'s own `+ 1` mark length. The rejected
direction — narrowing `DASH_TAIL`'s minimum-tail requirement instead, so the *reachable* check's own
ceiling shifts to `h1Len ≤ 54` — is rejected in §4.4 (new item 10): it would accept a bare `"{h1}-"` tail
(a dash with nothing meaningful after it) as satisfying `FR-8`'s `"{H1} - {Localized Category} {Spec}"`
template, silently weakening an already-shipped check's semantic guarantee for every `h1` length below the
boundary, not only at 54 — a global side effect to fix a single-point gap. Widening `D15` is surgical: it
extends an already-designed, already-verified deterministic mechanism to one additional `h1` length, with
no change to `DASH_TAIL`'s own meaning.

**A second, independently-found defect closed in the same pass, because a `PASS` verdict cannot rest on an
proof with a false premise.** Independent re-verification of `v9`'s §2.4 validator code — re-reading
`truncateAtWordBoundary`/`cutOnWordBoundary` (`repair-strategy.ts:192-206`) in full rather than assuming
its documented behaviour — found that `v9`'s own structural validator check (`isWordBoundaryPrefix`,
requiring `h1[withoutMark.length] === ' '`) can reject a value `truncateAtWordBoundary` itself legitimately
produces, independent of the `h1Len = 54` fix and present for every `h1Len` `D15` was ever designed to
cover (`≥ 55` in `v9`, `≥ 54` here): `cutOnWordBoundary` strips trailing
`` [\s\-–—|,:;.] `` characters from the cut point (`repair-strategy.ts:204`) after backing up to the last
space, so whenever the word immediately before the natural cut point ends in one of those characters (e.g.
`"...Cloths, x100"`), the returned core is shorter than the space boundary itself, and the character in
`h1` immediately after the returned core is that trailing punctuation mark, not a space — which
`v9`'s literal `=== ' '` check would then wrongly reject. Separately, when no space exists at all in the
first `SAFE_CORE_LENGTH` code points, `cutOnWordBoundary` returns the hard clip (not `null`), which can end
mid-word and would also fail that same structural check. **Both are closed here by construction, not by
enumerating more cases**: §2.4's validator branch no longer re-derives the expected shape structurally —
it calls the exact same pure function the normalizer calls (`computeLongH1MetaTitle`, new, shared) and
requires byte equality. Two independently-coded comparisons of "does this look right" is the same class of
bug that produced the `h1Len = 54` gap; a single shared computation, compared once, cannot drift from
itself. See §4.4 (new item 11) for why this supersedes `v9`'s independent-re-derivation design rather than
only patching its edge cases.

**Confirmed same code-point unit as the FROZEN check, so the arithmetic in §2.4's proof is not comparing
different things.** `output-validator.ts`'s own `MAX_META_TITLE` comparison uses `charLength()`
(`output-validator.ts:385-387`, `Array.from(s).length` — Unicode code points), and `D15`'s
`Array.from(h1).length` is textually identical. No unit mismatch.

**No FROZEN-file edit, no new Owner decision.** Both changes (the widened threshold, the shared-computation
validator) touch only `src/utils/seo-metadata-shape.ts` and (for the threshold) the call site in
`src/services/content-orchestrator.service.ts` — the same two non-`FROZEN` files `v9`'s `D15` already
named. Nothing here reopens `D13`/`D14` or `OD-10` — see §2.7, revised.

---

## 0. What this revision is, and its verdict

**This revision (v10) is a separate loop-back cycle from the one described below** — `v9` itself passed
(`PASS`, no loop-back) and moved on to `IMPLEMENTATION_PLANNING`; `task_breakdown` v8 then returned
`CHANGES_REQUIRED`/`changes_required_architecture` against `v9`'s own `D15` design (the `h1Len = 54`
self-contradiction, see the new process note above), which is what dispatches this round —
`ARCHITECTURE_PLANNING` loop-back attempt 1/3 of *this* cycle, distinct from the `v8`→`v9` "attempt 2/3"
counter the paragraph below describes for the earlier, Owner-decision cycle. The rest of this section (v9's
own text) is carried forward unchanged as the historical record of that earlier cycle.

This is a continuation of `ARCHITECTURE_PLANNING` (loop-back attempt 2/3), re-dispatched after v8
returned `BLOCKED` on two questions: (1) the accidental destruction of `v7` (disclosed above, carried
forward, not re-litigated), and (2) Defect 1 (`meta-title-template-shape` unsatisfiable for long `h1`),
which needed an Owner decision among three options.

**The Owner (sbruhov@gmail.com) has now made both decisions this round exists to finalize:** v8 is
accepted as the plan of record including its disclosed reconstruction, and Defect 1 is resolved by
**option (b)** — redefine what the template anchors on for the case where `h1` alone cannot fit, rather
than requesting a new §9 grant on `output-validator.ts` (option a) or re-affirming the residual (option
c). This round turns that decision into a concrete design, **`D15`** (§2), and independently verifies it
rather than accepting the Owner's own suggested mechanism (`productShort()`) at face value — verification
found `productShort()` itself does not work for the real case (§2.3), so `D15`'s actual mechanism is a
different, independently-derived one that still delivers the Owner's stated outcome (a verbatim-honest
title, no ceiling change) and is disclosed as such rather than silently substituted.

**Verdict: `PASS`.** Both defects now have a complete design. Defect 2 (`D13`/`D14`, §3) is carried
forward from v8 unchanged — already fully designed, non-`FROZEN`, ready for `IMPLEMENTATION_PLANNING`.
Defect 1 (`D15`, §2) is newly designed this round: it requires **no new FROZEN-file authorization** —
`D15` touches only `src/utils/seo-metadata-shape.ts` and `src/services/content-orchestrator.service.ts`
(both non-`FROZEN`, both already in Story Scope), and deliberately does not edit `src/prompts/task-b.ts`
at all (§2.5). No blocking Open Decision remains for either defect. Named, non-blocking residuals are
recorded in §2.6 and §5, per this Story's own established discipline of surfacing a residual rather than
silently claiming full closure.

**This revision (v10)** corrects a self-contradiction `task_breakdown` v8 found in `v9`'s own coding of
`D15` (the `h1Len = 54` gap) and, in verifying that fix rather than shipping the minimal patch, found and
closed a second, previously-undetected validator/normalizer drift risk in the same mechanism (see the new
process note above and §2.4, revised). **Verdict remains `PASS`** — both corrections are within `D15`'s
already-authorized surface (the same two non-`FROZEN` files), require no new FROZEN-file authorization and
no new Owner decision, and the closed-form proof in §2.4.1 (new) establishes the gap cannot recur for any
`h1Len`.

---

## 1. What did not change (reconstructed carry-forward, `D5`/`D10`/`D11` status corrected above)

`task_breakdown` v6's own preface, this round's corrected `git log` read (see process note above), and a
re-run `bash arch-guard.sh` (clean) confirm: `T1`–`T12` are **all** done and committed except `T7`/`T8`
(now corrected to done — see above) — i.e. **every task `task_breakdown` v6 names is committed**. Neither
of `pipeline_status` v8's two defects implicates `D1`–`D12`'s substance — both are gaps in already-shipped
design, not a reason to revisit it. `D1`–`D12` are reconstructed below (§1.1) for this document's own
self-containment, per this repository's established convention.

### 1.1 `D1` — `FR-1`: a new, Promise-based retry helper, not the existing RxJS transport retry

*(Reconstructed from `task_breakdown` v6 `T2`/`T3`, cross-checked against the live
`src/utils/async-retry.ts` and `groundingSpecs()`. Unchanged from v8.)*

**Status: done, `T2`/`T3`, committed.** A new, small, provider-agnostic `retryAsync<T>(attempt, opts: {
maxAttempts, isRetryable, baseDelayMs?, delay? })` (`src/utils/async-retry.ts`) wraps
`groundingSpecs()`'s existing try/catch body — unchanged internally, still never throwing out of the
attempt and still never substituting `input.specs` as a grounded translation (`FR-4`'s no-silent-fallback
guarantee) — as its `attempt` function, retried on any of the three business-semantic failure triggers
`OD-5` named (throw, empty/whitespace-only text, wrong-script). **Deliberately not** the existing
`retryTransport()`/`http-retry.ts` operator: that is RxJS-based and keyed on HTTP transport-status shape,
which would retry only a subset of the three triggers `OD-5` requires covered. Exponential backoff, an
injectable delay function so no test depends on a real clock (`NFR-3`).

### 1.2 `D2` — `FR-2(a)`: severity escalation at exactly three sites, mechanical

*(Reconstructed from `task_breakdown` v6 `T5`. Unchanged from v8.)*

**Status: done, `T5`, committed.** The three places `content-orchestrator.service.ts` emits a
`specs-grounding-disabled` issue (the shared `runDocGate()` closure, `generate()`'s inline HTML-gate
closure, `generateUaContent()`'s separately-duplicated inline HTML-gate closure) change
`severity: 'warning' as const` to `severity: 'error' as const`, and nothing else on the issue literal.
Sequenced after `D1`/`D3` (below) at the task level — escalating severity before retry exists would
hard-block on a single transient failure, and landing the exclusion (`D3`) before the escalation avoids a
real commit in history where an unresolved grounding failure could burn the whole repair budget on
nothing.

### 1.3 `D3` — `FR-2(b)`: exclude the rule from the regen loop's continuation test via a new rule-keyed constant in `repair-strategy.ts`, not a predicate threaded through three call sites

*(Reconstructed from `task_breakdown` v6 `T4`, cross-checked against the live `repair-strategy.ts`'s
`NON_REGENERABLE_RULES` and `repair-gate.ts`'s `regenerableErrorCount`. Unchanged from v8.)*

**Status: done, `T4`, committed.** `NON_REGENERABLE_RULES: ReadonlySet<string>` (`repair-strategy.ts`,
currently `{'specs-grounding-disabled'}`) names a rule no repair instrument can ever resolve within one
run. `repair-gate.ts`'s main loop stops spending full-document-regeneration attempts once
`regenerableErrorCount(best.issues) === 0` (errors minus any `NON_REGENERABLE_RULES` member), while
`best.errors` itself is untouched (still drives the strictly-better tie-break) and `issuesBefore` still
includes the escalated grounding error whenever the loop runs for another reason. `toArtifactReport`'s
`status` derivation is reordered (`finalErrors > 0 ? 'unresolved' : repairsUsed === 0 ? 'clean' :
'repaired'`) so a grounding-only run is never misreported `'clean'`. This decision's own shape — a
per-`rule` static exclusion set, not per-`issue` — is directly relevant to why `D15` (§2.4) below builds a
new mechanism rather than reusing this one for Defect 1.

### 1.4 `D4` — `FR-3`: a computed guard signal in `app.component.ts`, following the existing `alert(this.uiLabels()...)` precedent

*(Reconstructed from `task_breakdown` v6 `T6`. Unchanged from v8.)*

**Status: done, `T6`, committed.** `groundingExportBlocked` (a `computed()` at `app.component.ts:535-537`)
is `true` when any artifact's `repairReport()` carries a `finalIssues` entry with
`rule: 'specs-grounding-disabled' && severity: 'error'`. `downloadZip()`/`downloadText()`
(`app.component.ts:1136-1144`) each open with `if (this.groundingExportBlocked()) return
alert(this.uiLabels().alertGroundingBlocked);`. Deliberately scoped to this **one** rule via
`finalIssues`, not `repairUnresolvedCount()` — the code's own comment states gating on the latter "would
block export for an unrelated unresolved rule (e.g. a persisted `heading-brand-core-missing`) this FR
never asked to block." `downloadAllImages()` is untouched (reads a distinct signal). `zip-generator.ts`
itself is not modified — the guard lives entirely at the two `app.component.ts` call sites.

### 1.5 `D5` — `FR-6`/`FR-7`: precompute blessed positions structurally, before the per-heading loop; `FR-7`'s mandatory-presence check narrowed to the CTA-heading position only, `schemaVersion`-conditional

*(Reconstructed from `task_breakdown` v6 `T7`. **Status corrected this round: done, committed, commit
`ad4c678`** — v8 had this as "not yet implemented"; see the process note above.)*

`checkProductNameStuffing`/`checkProductNameStuffingDoc` (`heading-style.ts`) are restructured in two
passes. **Pass 1** computes the two blessed positions (first §3 heading, CTA heading) structurally, before
the per-heading loop — HTML: the first `<h2>` outside `section.specs`, and the closing `<h2>` ending in
`?`; Doc: `doc.functionality[0].heading`/`doc.cta.heading` by path. **Pass 2**, the existing per-heading
loop, exempts the full-pattern branch at a blessed position when `short === full` (the `FR-6` degenerate
case).

`FR-7`'s own mandatory-presence check, `heading-brand-core-missing`, is narrowed to the CTA-heading
position only — one conceptual leaf, `schemaVersion`-conditional (`doc.cta.heading` for `'3.0'`,
`doc.localizedName` for `'4.0'`; the corresponding closing `<h2>` for the HTML path).
`doc.functionality[0].heading` is **not** part of this presence check under any `schemaVersion`. A
dedicated, locale-aware matcher (`productNamePatternWithUnitLocale(name, locale)`, gated on
`CYRILLIC_LOCALES`, sourced from the existing `LATIN_TO_CYRILLIC_UNITS` table) is used **only** by this
presence check's `hasCore` test — never by the shared `productNamePattern()` `FR-6` still uses unmodified.
The `doc.localizedName` leaf additionally requires a bare-name shape: no sentence-terminal punctuation
(`SENTENCE_TERMINAL = {'.','!','?','…'}`) or quote marks, no line break, an occurrence-count exemption
against raw `opts.input.name`, and a trailing-position exemption. `repair-strategy.ts` gains a
`'heading-brand-core-missing'` entry, ladder `['field-scoped', 'block-scoped']`, `fieldInstruction`
dispatched by `issue.path`.

**Outstanding, unaffected by this round's status correction:** the real 2026-09-28 artifact's own
persisting `heading-brand-core-missing` finding is a `SENTENCE_TERMINAL`-check false-positive candidate
against a Ukrainian unit abbreviation (`"шт."`) correctly carrying a trailing period — see §3.2. This is a
live, shipped-code false positive (not a pending-implementation risk), since `T7` is confirmed committed —
sharpens, not changes, the urgency of resolving it.

### 1.6 `D6` — `FR-8`/`FR-9`: `src/utils/seo-metadata-shape.ts`, mechanical shape checks only, no semantic category/spec parsing

*(Original `v7` text, captured verbatim before the overwrite. Unchanged from v8.)*

**Status: done, `T9`, committed.** New sibling module (`OD-4`'s resolution), exporting
`validateSeoMetadataShape(seo: SeoResponse | null, context: string): ValidationIssue[]`, composed at all
four existing `validateSeoMetadata(json, NO_CURRENCY_CHECK)` call sites.

Per `seo_data[i]` entry (skipping silently when `h1` is absent):
- **`meta-title-h1-identical`** (`FR-9`, `error`, `path: seo_data[i].meta_title`): fires when
  `meta_title === h1` byte-for-byte.
- **`meta-title-template-shape`** (`FR-8`, `error`, `path: seo_data[i].meta_title`): fires when (1)
  `meta_title` contains a `' | '` segment anywhere; (2) `meta_title` does not start with `h1` verbatim; or
  (3) `meta_title` is not strictly longer than `h1`, or the text after the `h1` prefix does not start with
  `/^\s*-\s*\S/`.

**Neither check is registered in `REPAIR_STRATEGIES` (Out of scope, explicit) — as of v8.** `D15` (§2.4)
below registers a **new, narrowly-scoped repair mechanism for `meta-title-template-shape`**, but does so
by construction-preventing the finding at generation time rather than reversing `D6`'s decision that a
*post-hoc* repair has "no cheap repair path guaranteed by construction" — see §2.5 for why this is not a
reopening of `D6`.

### 1.7 `D7` — `FR-10`: let `doc` hold a schema-invalid candidate, but explicitly guard every existing consumer that assumed non-null meant valid

*(Original `v7` text, captured verbatim before the overwrite. Unchanged from v8.)*

**Status: done, `T1`, committed.** `produceTaskADoc()`'s catch block returns the raw candidate **as**
`doc` (`candidate as ProductDescriptionDoc`), and every consumer that reads `attempt.doc`/
`result.artifact.doc` and needs to know validity re-derives it with a fresh
`ProductDescriptionDocSchema.safeParse()` — never a cached flag.

`docSchemaIssues()` gains a Zod-path → `doc.<hops>` converter. `REPAIR_STRATEGIES` gains
`'doc-schema': { ladder: ['field-scoped'], fieldInstruction: ... }`.

**Named residual, unchanged from v1:** `manufacturedFullRegenWork` can still reject a pass wholesale when
a graduated candidate simultaneously surfaces a fresh, unregistered-strategy Tier-1 error — accepted, not
closed by this plan, exercised by a required test.

**This is the decision Defect 2's `D13` (§3) directly completes** — `D7` registered `doc-schema`'s
field-scoped rung; `D13` fixes the reason it could still silently no-op on a genuinely missing field.

### 1.8 `D8` — `FR-11`: `slug-name-designator-lost` repair-ladder entry

*(Original `v7` text, captured verbatim before the overwrite. Unchanged from v8.)*

**Status: done, `T11`, committed.** `REPAIR_STRATEGIES` gains `'slug-name-designator-lost': { ladder:
['field-scoped'], fieldInstruction: ... }`, addressed at `slugs[i].name`. No change to
`slug-validator.ts`'s check logic.

### 1.9 `D9` — `FR-8`'s ladder-conflict fix on the existing `meta-title-length` entry, extended to preserve `D11`'s differentiation marker

*(Original `v7` text, captured verbatim before the overwrite. Unchanged from v8.)*

**Status: done, `T9`/`T12`, committed** — including the marker-preservation `fieldInstruction` line.

`REPAIR_STRATEGIES`'s existing `meta-title-length` entry has two places that actively preserve a site
suffix, both wrong under `FR-8`'s no-suffix template: `fieldInstruction`'s `"Keep the product name and the
store suffix after ' | ' if one is present."` line (removed), and `truncateAtWordBoundary()`'s `' | '`-
detecting branch (removed entirely). After removal, `truncateAtWordBoundary()` always falls through to
`cutOnWordBoundary(text, limit)` for a template-shaped title — `D15` (§2.4) below reuses this exact,
already-shipped, exported function.

**Marker-preservation instruction:** `fieldInstruction`'s returned text gains one line: `"If this title
ends in a single mark character not part of the product name ... keep that mark while shortening — never
drop it, and never let the result become identical to the H1 value."`

### 1.10 `D10` — `FR-12`: prompt-text edit, `[HEADING FORM]` degenerate-case disambiguation (§9 `D3`-Story authorization)

*(Reconstructed from `task_breakdown` v6 `T8`. **Status corrected this round: done, committed, commit
`1c02c89`** — v8 had this as "not yet implemented"; see the process note above.)*

`master-system-prompt.ts`'s `[HEADING FORM]` block gains one clause after its existing "AT MOST TWO
`<h2>`... may contain `[Product-short]`" sentence, stating the exception holds unchanged when
`[Product-short]` equals the full product name (the degenerate case with no configuration code or
packaging suffix to drop) — confirmed present in the live file (§2.3 of this round independently re-read
`master-system-prompt.ts`'s `[HEADING FORM]` block while investigating `productShort()`; the clause is
there). `task-a.ts`'s one-line restatement is reworded so it no longer reads as an unqualified "forbids
the full name outright." Authorized by the Story's own `D3` (Resolved decisions) — already granted, not a
fresh request.

### 1.11 `D11` — `FR-13`: `task-b.ts`'s four-part prompt edit and `buildPromptB()`'s excerpt widening, under `OD-9`'s authorization

*(Reconstructed from `task_breakdown` v6 `T10`. **Status corrected this round: done, committed, commit
`3d89c86`** — v8 had this as "not yet implemented — pending the §9 consent gate"; the gate was already
exercised. See the process note above for the evidence: the live `task-b.ts` text, `pipeline_status` v4's
own "T10 committed" record, and `git show --stat 3d89c86` confirming the same-commit
`.arch-guard-checksums` rebaseline AGENTS.md §9 requires.)*

Four coupled edits to `TASK_B_INSTRUCTION`'s "— meta_title —" block plus `buildPromptB()`'s
excerpt-construction code, all inside `OD-3`'s/`OD-7`'s/`OD-9`'s already-granted §9 scope, confirmed
shipped exactly as designed:

- **(a)** Cascade step 1 names `[Localized Category]`/`[Spec]` explicitly, replacing the undefined
  `[Benefit]` placeholder; `buildPromptB()`'s excerpt construction is a two-slice prose-plus-specs-section
  construction.
- **(b)** Both `h1`-collision paths are fixed by appending, never substituting: step 3 appends a single
  `"·"` (U+00B7) mark directly after the H1 core; the overflow rule forbids dropping that mark to force a
  fit. Confirmed live: `"H1 core is NEVER truncated mid-word, at any step, including step 3. meta_title is
  NEVER byte-identical to h1: step 3's '·' mark exists specifically so this can never happen."` and `"never
  drop the '·' to force a fit, and never truncate the H1 core to force a fit"` are both present verbatim in
  the current file.
- **(c)** The per-locale Title budget table is reconciled to ≤54 (general rows) / ≤51 (de-DE) — confirmed
  live.
- **(d)** The mandatory suffix-retention instructions are removed; `[Site Suffix]` is retained and
  re-scoped to the JSON's top-level `site_name` field only — confirmed live (no `MANDATORY` text remains).

**A residual `D11` itself already names, distinct from `OD-10`'s own — see §2.7 for how `D15` interacts
with it.** At the exact H1-core-length-55 boundary, `meta-title-length`'s deterministic repair tier
(`cutOnWordBoundary()`) can still strip the appended `"·"` mark and the core's own trailing word. `T12`/`D9`
mitigate, but do not eliminate, this — **`D15` below closes this specific boundary case as a side effect**,
since its own threshold (§2.4) subsumes it.

**Why this matters for Defect 1 (§2), restated with corrected status:** `D11`(b)'s fix is designed around
the case where the H1 core is *near* the budget boundary. It was never designed to, and cannot, rescue the
case Defect 1 reports — an H1 core that exceeds the FROZEN 55-char ceiling **by itself**, with no cascade
rung reachable at all. `D11` — now confirmed **shipped**, not pending — does not change under this round's
work; `D15` is new, additional design that layers on top of it without re-opening `task-b.ts`.

### 1.12 `D12` — AGENTS.md §4 / server-side: confirmed not reached

*(Reconstructed from `task_breakdown` v6's own summary. Unchanged from v8.)*

No task in this Story's scope touches `server/**`, and no `AGENTS.md` §4 HTML acceptance criterion is
implicated by any of `FR-1`–`FR-13`.

---

## 2. Defect 1 — `meta-title-template-shape` unsatisfiable for long `h1`: resolved via `D15` (Owner decision 2, option (b))

### 2.1 What v8 already confirmed, carried forward as still-accurate factual findings

v8's independent re-verification of the real 2026-09-28 regeneration
(`expert3d_formlabs_optical_cleaning_cloths_2026-09-28_1706.zip`) stands and is not redone here:

- **Arithmetic, confirmed:** a passing `meta_title` (under the pre-`D15` check) needs `length ≥
  len(h1) + 2` and `length ≤ 55` (FROZEN `output-validator.ts`), so `len(h1) ≤ 53`. Real `h1` values:
  es-ES 66, pt-PT 60, uk-UA 69 graphemes — all unsatisfiable.
- **Correction 1 (v8):** the dash-tail vs. `"·"`-mark mismatch is `FR-13(b)`'s own already-accepted cost,
  unaffected by `D15` (§2.7).
- **Correction 3 (v8), the most material finding, and the one `D15` directly closes:** the shipped es-ES
  title (`"Toallitas de limpieza óptica Formlabs x100·"`) is not `h1` truncated or `h1` plus a mark — it is
  `h1` with an entire interior phrase (`"Optical Cleaning Cloths "`, 25 characters) silently deleted, then
  the mark appended. This violates `task-b.ts`'s own "H1 core verbatim" contract and is a data-integrity
  defect in what ships, not merely a validator complaint. **`D15`'s mechanism (§2.4) closes this by
  construction**: the corrected title is always a genuine, code-computed, word-boundary-safe prefix of the
  real `h1` string — never a model improvisation, so this specific failure mode cannot recur.

### 2.2 The Owner's decision 2 (this round)

> *"redefine the template anchor for long names (e.g., using `productShort()`) so we produce a
> verbatim-honest title without touching the 55-character ceiling."*

This closes the Owner-authorship question v8 left open. `D15` below is this round's concrete design for
it. Per this round's own instruction, the suggested mechanism (`productShort()`) is independently verified
rather than assumed — §2.3 documents that verification and why `D15`'s actual mechanism differs from the
literal suggestion while still delivering the Owner's stated outcome.

### 2.3 Independent verification of `productShort()` — found not fit for purpose, for two distinct, evidenced reasons

`productShort()` (`src/prompt-core/product-name-core.ts:151-157`) is exported and trivially importable
into any non-`FROZEN` file — no obstacle there. The question this round actually had to answer is whether
it computes something *usable* as a meta_title anchor for the real failing case. It does not, in either of
its only two possible applications:

**(a) Applied to the raw/base product name (`input.name`/`productName`) — the only mode this function is
used or tested for anywhere in this codebase** (confirmed: every call site —
`src/utils/heading-style.ts:225,495`, `src/prompts/task-a.ts`, `master-system-prompt.ts`'s `[Product-short]`
convention, `product-name-core.spec.ts`'s own corpus — passes the raw catalog name, never a localized
string; `master-system-prompt.ts:128-130` states explicitly: `"[Product-short] IS GIVEN TO YOU in the user
message ... Use it exactly as supplied; never re-derive it or expand it back"` — i.e. one value, identical
across every locale). For this Story's real regenerated product, `"Formlabs Optical Cleaning Cloths x100"`:
`invariantCore()` captures every token (all look designator-shaped — capitalized Latin words or a
digit-bearing token), and `productShort()`'s only trimming step (dropping a *trailing* `CONFIG_TOKEN`) does
not apply (`"x100"` does not match `CONFIG_TOKEN`'s `^\d+(?:[/x×-]\d+)+$` — it starts with a letter). Net
result: `productShort(raw name) === raw name`, unchanged, 37 graphemes — arithmetically it would fit
(37+2 ≤ 54), but it is **the same untranslated 37-character string for every locale**. Checked against the
real es-ES `h1` (`"Toallitas de limpieza óptica Formlabs Optical Cleaning Cloths x100"`): this string is
`h1`'s trailing **suffix**, not its prefix — the translated category description leads. Anchoring
`meta_title` on it would put the brand/model span first and never reach the translated portion at all,
which is a genuinely different title shape than `h1`'s own, breaking `FR-8`'s stated purpose ("aligns
title↔H1") for exactly the locales this defect affects.

**(b) Applied directly to each locale's own localized `h1` string** (the only way to get a per-locale
value at all): independently computed against the real es-ES/pt-PT/uk-UA `h1` strings and found broken in
two further, disqualifying ways neither of which is a coincidence of this one product:
- `looksLikeDesignator()`'s Latin-capitalization heuristic (`token !== token.toLowerCase()`) was written
  and is tested only against raw catalog names, where capitalization marks a brand/model token. Applied to
  translated Spanish/Portuguese prose, the *sentence-initial* word is capitalized for grammatical reasons
  unrelated to brand identity: `invariantCore("Toallitas de limpieza óptica Formlabs Optical Cleaning
  Cloths x100")` returns `"Toallitas"` alone (the scan starts, matches the capitalized first token, then
  stops at the next, lowercase token `"de"`) — a linguistically meaningless "core." pt-PT computes to
  `"Panos"` by the identical mechanism. Neither is usable as a meta_title anchor.
- `looksLikeDesignator()`'s designator regex (`/^[A-Za-zÀ-ÿ][\w'’-]*$/`) matches Latin letters only. Every
  token of the uk-UA `h1` (`"Серветки для очищення оптики Formlabs Optical Cleaning Cloths 100 шт."`) up
  to the first Latin word is Cyrillic and fails this regex outright; the scan breaks at position 0 with
  zero designator tokens captured, so `invariantCore()` falls through to its own documented fallback —
  "keep the whole original string." `productShort(uk-UA h1)` is therefore **the full, unshortened
  69-grapheme string** — zero length reduction, the one locale where a reduction is most needed.

**Conclusion, stated plainly per this round's obligation not to claim closure it has not verified:**
`productShort()`, applied either way, does not produce a workable, correct meta_title anchor for this
Story's real regeneration case. This is not an implementation gap — it is an architectural mismatch: the
function is deliberately biased toward over-capture and was built and corpus-tested
(`product-name-core.spec.ts`) exclusively for raw, Latin-script catalog names feeding a context (headings)
where the identical untranslated span is already an accepted exception at exactly two positions (`OD-2`).
It was never designed to shorten *translated* prose, and reusing it there produces either a
title/H1-misaligned anchor (mode a) or a linguistically broken one (mode b). `D15` below therefore
implements the Owner's stated **outcome** — a shorter, verbatim-honest anchor, no ceiling change — through
a different, independently-derived mechanism, disclosed here rather than silently substituted for the
suggested one.

### 2.4 `D15` — deterministic, word-boundary-safe truncation of `h1` itself, normalized at generation time; no `task-b.ts` edit (revised this round: threshold corrected, validator redesigned around a single shared computation)

**Files:** `src/utils/seo-metadata-shape.ts` (validator, non-`FROZEN`, already Story-owned per `D6`) and
`src/services/content-orchestrator.service.ts` (normalization call site, non-`FROZEN`, already in Story
Scope's Surface table). **Unchanged from `v9`** — this round's fix stays entirely inside the surface `v9`
already authorized.

**What changed from `v9`, and why (see the process note above for the full derivation).** Two corrections,
both scoped to this same pair of files:

1. **The activation threshold is widened from `h1Len ≥ 55` to `h1Len ≥ 54`**, derived from the pre-existing
   check's actual minimum addition (`DASH_TAIL`'s 2-code-point minimum tail), not from `D15`'s own 1-code-
   point mark — the off-by-one that produced the `h1Len = 54` gap `task_breakdown` v8 found.
2. **The validator no longer re-derives the expected shape structurally** (prefix / word-boundary / mark
   checks, independently coded from the normalizer's own truncation logic). It now calls the **same pure
   function** the normalizer calls and requires byte equality. This closes, as a side effect of removing
   the duplication rather than by enumerating more cases, a second defect independent of the `h1Len = 54`
   gap: `v9`'s literal `h1[withoutMark.length] === ' '` check could reject a value
   `truncateAtWordBoundary`/`cutOnWordBoundary` (`repair-strategy.ts:192-206`) itself legitimately produces
   — `cutOnWordBoundary` strips trailing `` [\s\-–—|,:;.] `` characters after backing up to the last space
   (`repair-strategy.ts:204`), so whenever the word before the natural cut point ends in one of those
   characters, the returned core stops one or more characters short of the space itself, and `h1` at that
   position holds the stripped punctuation mark, not a space. A structural re-check that does not know
   about that stripping step rejects the normalizer's own correct output. Two independently-coded
   comparisons of "does this look right" is the same bug class that produced the `h1Len = 54` gap; a single
   shared computation, compared by equality, cannot drift from itself.

**The mechanism.** When `h1` is long enough that *no* verbatim-h1-anchored, dash-tailed shape can ever pass
the FROZEN 55-character ceiling — `Array.from(h1).length + MIN_DASH_TAIL > MIRRORED_MAX_META_TITLE`, i.e.
`h1Len ≥ 54` — the pipeline stops asking the model to solve an impossible constraint and instead
**deterministically constructs** the title from `h1` directly, unconditionally overwriting whatever the
model produced for that entry:

```ts
// src/utils/seo-metadata-shape.ts — new, co-located with the check it satisfies
import { truncateAtWordBoundary } from './repair-strategy'; // already exported, already shipped (D9)

/** Mirrors output-validator.ts's FROZEN MAX_META_TITLE (55) — see the characterization test in
 *  §4.2 that fails loudly if the two ever drift apart, since this file may not import the FROZEN
 *  constant directly. Confirmed same unit as output-validator.ts's own charLength() (Array.from
 *  code-point count, output-validator.ts:385-387) — the arithmetic below is not comparing two
 *  different notions of "length." */
const MIRRORED_MAX_META_TITLE = 55;

/** DASH_TAIL's (seo-metadata-shape.ts's own dash-tail regex, above) minimum possible match length:
 *  one dash-like character plus one non-whitespace character, with both `\s*` spans empty. This is
 *  the actual boundary the reachable (pre-D15) check enforces — NOT D15's own "+1" mark length. The
 *  h1Len=54 gap (task_breakdown v8) was exactly this: D15's threshold was derived from its own output
 *  shape's addition (+1, the "·" mark) instead of from this number. Pinned by a test (§4.2): "-x"
 *  matches DASH_TAIL; "-", "- " and "·" alone do not. */
const MIN_DASH_TAIL = 2;

const SAFE_CORE_LENGTH = 49; // + 1 code point for "·" = 50 total — comfortably under every locale's
                              // FR-13(c) budget (≤54 general, ≤51 de-DE) and the 55 ceiling, with
                              // the SAME "aim low" margin philosophy task-b.ts's own budget table
                              // states for the model-driven case. Applied uniformly for every
                              // h1Len >= 54 — including h1Len = 54 itself, where a bare "{h1}·" (55
                              // total) would technically also fit the ceiling. Deliberate: one
                              // computation for the whole unreachable regime, no h1Len=54 special
                              // case (§2.6, residual note).

/** Single source of truth for which regime an h1 length is in. Called identically by the normalizer
 *  and the validator so the two can never independently drift the way the h1Len=54 gap did — there
 *  is exactly one formula, not two that are supposed to agree. */
function isH1Unreachable(h1: string): boolean {
  return Array.from(h1).length + MIN_DASH_TAIL > MIRRORED_MAX_META_TITLE;
}

/** The canonical fallback value once h1 is unreachable — a genuine, word-boundary-safe PREFIX of h1
 *  (never an interior edit or deletion), immediately followed by a single "·" mark. A pure function
 *  of h1 alone, called identically by the normalizer and the validator (equality, not re-derivation)
 *  so the two can never disagree about what "correct" looks like, regardless of any edge-case
 *  behaviour inside truncateAtWordBoundary/cutOnWordBoundary (trailing-punctuation stripping, or the
 *  no-word-boundary-found hard clip) — both sides observe the identical output. */
function computeLongH1MetaTitle(h1: string): string {
  const core = truncateAtWordBoundary(h1, SAFE_CORE_LENGTH)
    ?? Array.from(h1).slice(0, SAFE_CORE_LENGTH).join('').trim(); // pathological empty-after-strip
                                                                    // fallback — named residual, §2.6
  return `${core}·`;
}

export function normalizeLongH1MetaTitle(h1: string, currentMetaTitle: string): string {
  return isH1Unreachable(h1) ? computeLongH1MetaTitle(h1) : currentMetaTitle; // reachable —
                                                                                // leave the model's/
                                                                                // repair's value alone
}
```

Called from `content-orchestrator.service.ts`'s existing `canonicalizeSeoData()` (the single choke point
already re-run at **every** SEO-producing code path — initial `produce()` and after any field-scoped
repair, confirmed at all three call sites, `content-orchestrator.service.ts:927,948,1350,1368,1460,1478`):

```ts
private canonicalizeSeoData(seo: SeoResponse, productName = ''): SeoResponse {
  return normalizeSeoNumbers({
    ...seo,
    seo_data: (seo.seo_data ?? []).map(item => {
      const h1 = canonicalizeMultiInOne(item.h1, item.language);
      return {
        ...item,
        h1,
        meta_title: normalizeLongH1MetaTitle(h1, canonicalizeMultiInOne(item.meta_title, item.language)),
        meta_description: canonicalizeMultiInOne(item.meta_description, item.language),
      };
    }),
  }, productName);
}
```

Because this runs **before** `validate()` sees the artifact (it is inside `produce`'s own wrapped call,
and is re-run after any field-scoped repair), `meta-title-template-shape` will not actually fire for this
specific sub-case in production once this ships — a stronger outcome than "repairs cheaply," and zero
extra repair-gate cost (see Risk in §4.3 for the one thing this does *not* save: the model's own wasted
first-pass generation attempt for these entries).

**`seo-metadata-shape.ts`'s validator gains a matching conditional branch** — revised this round from an
independent structural re-derivation to an equality check against the same shared computation (defense in
depth is preserved: it still correctly rejects a `meta_title` that reached this state by some other path,
e.g. a future direct edit or a value that never went through `canonicalizeSeoData`; it now additionally
cannot disagree with the normalizer about what "correct" looks like):

```ts
if (isH1Unreachable(h1)) {
  const expected = computeLongH1MetaTitle(h1);
  if (metaTitle !== expected) {
    issues.push({
      severity: 'error',
      rule: 'meta-title-template-shape',
      detail: `meta_title ("${metaTitle}") does not follow the long-h1 fallback shape: h1 is ` +
        `${Array.from(h1).length} code points and no dash-tailed shape can fit the ` +
        `${MIRRORED_MAX_META_TITLE}-character ceiling, so meta_title must be exactly the ` +
        `deterministic word-boundary-safe prefix of h1 followed by "·" that this pipeline always ` +
        `computes and applies at generation time ("${expected}").`,
      context, path,
    });
  }
} else {
  // existing dash-tail branch, entirely unchanged
}
```

`meta-title-h1-identical` (`D6`) is untouched — it cannot fire against `D15`'s output by construction,
since `computeLongH1MetaTitle`'s core is always truncated to `SAFE_CORE_LENGTH` (49) whenever it runs
(`isH1Unreachable` only ever triggers at `h1Len ≥ 54 > 49`), so the result is always strictly shorter than
`h1` even before the appended mark is considered.

### 2.4.1 Closed-form proof — no `h1Len` value is left uncovered or double-covered (new this round)

Let `n = Array.from(h1).length` (Unicode code points — confirmed identical to `output-validator.ts`'s own
`charLength()` unit, §2.4 above). Define:

- **Reachable(`n`)** := `n + MIN_DASH_TAIL ≤ MIRRORED_MAX_META_TITLE`, i.e. `n + 2 ≤ 55`, i.e. `n ≤ 53` —
  the pre-existing (`D6`) dash-tail check's own domain.
- **Unreachable(`n`)** := `isH1Unreachable(h1)`, defined in code as `n + MIN_DASH_TAIL > MIRRORED_MAX_META_TITLE`
  — i.e. `n ≥ 54` — **the logical negation of Reachable, by construction**, not an independently-authored
  second formula. This is the structural fix: the `h1Len = 54` gap existed because `v9` had two separately
  written comparisons that happened to disagree at one point; here there is exactly one predicate and its
  negation, so no third state (both false) can exist.

**(a) Exhaustive partition, no gap, no overlap.** For every integer `n ≥ 0`, `n ≤ 53` and `n ≥ 54` are
mutually exclusive and jointly exhaustive — elementary arithmetic, and true independent of any property of
`h1`'s actual content. Since `Unreachable` is *defined* as `¬Reachable`, exactly one of
`{Reachable(n), Unreachable(n)}` holds for every `n`. No value of `n` can fall into neither (the `h1Len=54`
failure mode) or both.

**(b) The Reachable branch, when active, is satisfiable.** For every `n ≤ 53`: the string `h1 + "-x"` (a
dash character plus one non-whitespace character — exactly `MIN_DASH_TAIL` additional code points) starts
with `h1` verbatim, is strictly longer than `h1`, matches `DASH_TAIL` immediately after the `h1` prefix
(minimum-length match, confirmed against the live regex `/^\s*[-–—]\s*\S/`), and has total length
`n + 2 ≤ 55` — passing the FROZEN ceiling. So the reachable check's accept-set is non-empty for every `n`
in its domain (unchanged from `v9` — this was already true; restated here for the proof's completeness).

**(c) The Unreachable branch, when active, is always satisfied post-normalization.** For every `n ≥ 54`:
`canonicalizeSeoData` unconditionally calls `normalizeLongH1MetaTitle(h1, …)` before `validate()` ever runs
(confirmed: the single choke point, re-run at all three produce/repair call sites — §2.4 above, unchanged
from `v9`). Since `isH1Unreachable(h1)` is true by (a), `normalizeLongH1MetaTitle` returns
`computeLongH1MetaTitle(h1)`. The validator's own branch, reached because `isH1Unreachable(h1)` is
*the same* predicate evaluated on *the same* `h1`, computes `expected = computeLongH1MetaTitle(h1)` — the
identical pure function applied to the identical input, hence the identical output. The shipped
`metaTitle` therefore satisfies `metaTitle === expected` **by construction**, independent of any internal
edge-case behaviour of `truncateAtWordBoundary`/`cutOnWordBoundary` (trailing-punctuation stripping, the
no-word-boundary-found hard clip, or any other implementation detail) — both sides observe whatever that
function actually returns, because they call the same function. `computeLongH1MetaTitle`'s output length is
always `≤ SAFE_CORE_LENGTH + 1 = 50 ≤ 55`, so the FROZEN ceiling (`meta-title-length`, `output-validator.ts`)
is also always satisfied, for every `n ≥ 54` including arbitrarily large `n` (the real es-ES/pt-PT/uk-UA
values, 66/60/69, included).

**Conclusion.** By (a), every `n ≥ 0` is in exactly one of the two regimes. By (b) and (c), whichever regime
`n` is in has at least one real, achievable, validator-accepted `meta_title` value, and — for the
`Unreachable` regime specifically — the pipeline's own unconditional normalization guarantees the *shipped*
value is that accepted value, not merely that one exists in principle. No `h1Len` is left permanently
failing, and no `h1Len` is covered by both branches at once (the two predicates are complements by
construction, so simultaneous coverage is impossible, not merely unobserved).

**One accepted, deliberate non-uniformity, stated rather than silently chosen.** At `n = 54` exactly, a
bare `h1 + "·"` (55 total) would also fit under the FROZEN ceiling — `computeLongH1MetaTitle` does not use
it, truncating to the same `SAFE_CORE_LENGTH` as every other `n ≥ 54` instead. This is a uniformity choice
(one computation for the whole regime, no `n = 54` special case), not a gap: the value it does produce is
still `≤ SAFE_CORE_LENGTH + 1` and still passes both the FROZEN ceiling and the validator's equality check
by (c) above.

### 2.5 Why this needs no new FROZEN-file authorization

`D15` touches only `seo-metadata-shape.ts` and `content-orchestrator.service.ts`, both non-`FROZEN` and
already within this Story's authorized surface (`D6` for the former; the Story's own Scope > Surface
table plus `OD-1`'s confirmed extension for the latter). **`src/prompts/task-b.ts` is not edited at all**
by this design — the model's own step-3 cascade text (already shipped, `D11`) is left exactly as-is; for
the `h1 ≥ 54` case, whatever the model produces for `meta_title` is simply discarded and replaced
deterministically before validation ever runs. This is a deliberate design choice, not an oversight: it
means `D15` requires zero new Owner authorization, unlike a design that taught the model about this new
rung directly (§2.6, Residual 2, names that as an optional, explicitly-not-requested follow-up).

**Still true after this round's threshold widening and validator redesign** — re-confirmed directly: both
corrections stay inside `seo-metadata-shape.ts` and `content-orchestrator.service.ts`'s existing call site;
neither adds a new file, neither touches `task-b.ts`, `task-a.ts`, `master-system-prompt.ts` or
`output-validator.ts`. No new §9 request is made by this revision.

### 2.6 Residuals — named, not silently closed

1. **Pathological no-word-boundary-or-all-punctuation fallback (reworded this round — no longer a
   validation-failure risk, still a cosmetic one).** If `truncateAtWordBoundary(h1, 49)`'s internal
   `cutOnWordBoundary` cannot find a usable boundary inside the first 49 code points of `h1` (an
   unrealistically long single token, or a clip whose entire content is stripped by the trailing-punctuation
   regex), it returns `null` and `computeLongH1MetaTitle` falls back to a hard 49-code-point clip, which
   could — in that narrow, unobserved-in-the-corpus case — cut mid-word. **Under `v9`'s validator design
   this could have caused `meta-title-template-shape` to persist (a real validation failure); under this
   round's equality-based validator (§2.4) it cannot** — the validator accepts exactly whatever
   `computeLongH1MetaTitle` returns, including this fallback's own output, so the residual is now purely
   cosmetic (a less-pretty title in an unobserved edge case), not a correctness risk. Not fixed here; a
   future story could special-case it if it is ever observed.
2. **Wasted first-pass model generation for `h1 ≥ 54` entries.** Because `task-b.ts` is not edited, the
   model still attempts its own step-3 cascade for these entries, and that attempt is unconditionally
   discarded by `D15`'s normalization. This is a real, ongoing (small) generation-cost inefficiency, not a
   correctness problem. A future `task-b.ts` edit teaching the model about this rung directly could avoid
   it, but that is new prompt-text substance beyond `OD-9`'s four already-itemized purposes and is **not
   requested or self-authorized here** — recorded as an optional, Owner-decidable follow-up in `blocking_issues`
   is inappropriate (nothing here blocks); it is recorded as a `non_blocking_finding` (§5) instead.
3. **`AC-4`'s literal text ("follows the single approved template ... identically across all four
   locales") no longer describes the `h1 ≥ 54` case exactly** — that case now has its own, code-enforced
   alternate shape (truncated-core + mark), a genuine, Owner-authorized redefinition (decision 2), not a
   silent scope narrowing. **Resolved as of this round: `specification` v18 added `FR-8(b)`, stating this
   exact exception at `AC-4`'s traceability row and at `FR-8` itself, and v19 additionally disclosed the
   mid-word-truncation fallback (§2.6 Residual 1, below) at the same row and in Open questions.** No
   longer an open ask against a future Specification revision — the catch-up this note originally
   requested has already happened, independently re-confirmed this round against the live `specification`
   v19 text (`FR-8(b)`, the `AC-4` traceability row, and the "New in v18"/"New in v19" Open-questions
   bullets).
4. **Deliberate `h1Len = 54` non-uniformity (new this round, restated from §2.4.1)** — a bare `h1 + "·"`
   would technically fit the ceiling at exactly `n = 54`, but `computeLongH1MetaTitle` truncates to
   `SAFE_CORE_LENGTH` uniformly for the whole `n ≥ 54` regime rather than special-casing this one value.
   Accepted for simplicity (§2.4.1); not a gap — the produced value still passes both the FROZEN ceiling
   and the validator's equality check.

### 2.7 Confirms no conflict with `D13`/`D14` (Defect 2) or `OD-10` (corrected this round against `specification` v19's now-precise band — see the process note above)

- **`D13`/`D14` (§3) touch `repair-gate.ts`'s `applyTier` and main loop, used by `doc-schema` and
  `heading-brand-core-missing` on Doc/HTML artifacts.** `D15` touches `seo-metadata-shape.ts` and
  `content-orchestrator.service.ts`'s SEO-specific `canonicalizeSeoData()` — a disjoint validation domain
  (`seo_data`, not `ProductDescriptionDoc`/HTML). No shared file, no shared rule name, no interaction.
- **`OD-10`'s residual is `FR-13(b)`/`D11`'s own — the line-49 cascade fallback's differentiation-mark
  ceiling collision — not `D15`'s to close, and `v10`'s prior claim that `D15` closes it "for every
  locale" was an overclaim, corrected here against `specification` v19's now-precise band.** `v10` described
  the residual as "exactly `h1`-core length 55 general / 52-55 de-DE" and argued `D15`'s widened `h1 ≥ 54`
  threshold — a superset of the `h1 ≥ 55` boundary that description implied — closes it entirely. Re-checked
  this round against the live `specification` v19 text (`FR-13(b)`, the `AC-5` traceability row, `NFR-5`,
  and the `OD-10` entry in Open questions — all four independently cross-checked, all four agree): the
  general-row case (`h1`-core length exactly 55) **is** fully closed by `D15` exactly as `v10` argued — it
  falls inside `D15`'s `h1Len ≥ 54` domain, so `FR-8(b)`'s unconditional normalization intercepts it before
  `task-b.ts`'s line-48/line-49 cascade (`D11`) is ever reached, and the collision this residual named for
  that row can no longer occur. **But de-DE's band does not close to the same degree — it narrows from
  52-55 to 52-53, and those two values (52, 53) are `h1Len` values *below* `D15`'s own `h1Len ≥ 54`
  activation domain.** `D15` normalizes an entry only when `isH1Unreachable(h1)` is true, i.e. `h1Len ≥ 54`
  — by construction, it does not run, and cannot run, for an `h1`-core length of 52 or 53; those entries
  stay on `FR-8(a)`'s own reachable path, where `task-b.ts`'s line-48/line-49 cascade (`D11`, already
  shipped, unaffected by this Story) can still degrade to the bare H1 core, append its differentiation mark,
  and — depending on the mark's own length `m` (`m ≥ 4` at core length 52, `m ≥ 3` at 53) — still collide
  with the untouched 55-character ceiling. `specification` v19 states this precisely: "narrowed, not
  eliminated" (`FR-13(b)`), "collision-live for de-DE, depending on an unspecified differentiation-marker
  length" (`OD-10` entry, Open questions). **`D15` therefore closes the general-row case in full and closes
  part of de-DE's band (the `h1Len = 54`/`55` portion, which now falls inside `D15`'s domain instead of
  reaching the cascade at all) — but the remaining de-DE 52-53 band is `FR-13(b)`/`D11`'s own accepted
  residual, unaffected by `D15`, and is not this Plan's §2 to close.** No design gap follows from this: the
  residual is already an explicitly accepted one (`OD-10`, `specification` v19's own resolution), the
  marker-length decision it depends on is `so-planner`'s/the implementer's prompt-authoring choice for
  `task-b.ts`'s already-shipped mark (`D11`(b), a single `"·"` character, `m = 1` — independently
  re-confirmed against the live `task-b.ts` text, which does not collide at either remaining length with a
  1-character mark) — this is recorded for accuracy against `specification` v19's own text, not because a
  fix is owed here. **Not reopened by this round's `D15` code or proof** — `D15`'s own threshold/validator
  changes (§2.4, unchanged from `v10`) still only add coverage inside `D15`'s own domain; what changed this
  round is this Plan's own description of a *different* mechanism's (`D11`'s) residual, to match
  `specification` v19's corrected numbers.

---

## 3. Defect 2 — `doc-schema` / `heading-brand-core-missing` oscillation: full design (unchanged from v8)

*(Carried forward verbatim from v8 — already independently re-verified there, unaffected by this round's
Defect 1 work or by the `T7`/`T8`/`T10` status correction above, since `D13`/`D14` concern `repair-gate.ts`
mechanism gaps that exist regardless of which findings are currently live.)*

### 3.1 Confirmed exactly as reported, both gaps

- **Gap (a):** `repair-gate.ts:213-214` — `const value = getAtPath(next, issue.path); if (!strategy ||
  typeof value !== 'string') { advance(issue); continue; }`. `getAtPath` returns `undefined` on a missing
  hop by design; `typeof undefined !== 'string'` is `true`, so a genuinely missing field (Zod
  `"Required"`) silently no-ops the field-scoped rung — confirmed.
- **The write side is not broken:** `setAtPath`'s terminal-segment guard is gated on `!last`, so a
  **leaf** that is currently absent, whose **container** exists (e.g. `cta` exists, `cta.heading` does
  not), writes cleanly and creates the key. **The fix is read-side only** — `applyTier`'s own gate
  condition.
- **Gap (b):** `repair-gate.ts:378-387` — the main loop's only per-attempt action is a `deterministic`-
  tier `cleanupPlan`; neither `doc-schema` nor `heading-brand-core-missing` has a `deterministic` tier, so
  `cleanupPlan` is always empty for them and only full regeneration can touch either past the pre-loop
  ladder — confirmed.
- **The dormant `getDocBlock` path-prefix defect is confirmed real**, traced end to end: `doc-tier.ts`'s
  `repairDocBlocks` groups by `issue.path` unmodified (the `"doc."`-prefixed wrapper-relative form every
  Doc-path emitter uses) and passes it into `doc-block-repair.ts`'s `getDocBlock`, which is documented to
  require a **Doc-relative** path — resolves `doc.doc.localizedName`, which does not exist, returning
  `undefined`. Confirmed dead code for every `"doc."`-prefixed finding today. Not needed to close this
  incident (§3.3); left unfixed by design.

### 3.2 What actually shipped — and the honest limit of what `D13`/`D14` alone fix

Attempts 1 and 2 both tied on error count (`net change +0`) and were both **discarded** — the artifact
that actually shipped is attempt 0's own output, unmodified, carrying attempt 0's own original
`heading-brand-core-missing` finding, the same `"шт."` (Ukrainian unit-abbreviation) trailing-period case
§1.5 flags as a likely `SENTENCE_TERMINAL` false positive — now confirmed live-code, not pending (§1.5's
status correction).

**`D13`/`D14` (below) close the *mechanism*, not this specific persisting finding.** If the `"шт."` case is
a genuine `SENTENCE_TERMINAL` rule defect, no amount of field-scoped/block-scoped/full-regen retrying can
resolve it. Not this round's to fix — a `heading-style.ts`/`FR-7`-owned question, surfaced for resolution
alongside this Plan (§5).

### 3.3 `D13` — `repair-gate.ts`'s field-scoped rung must attempt a genuinely missing field, not just skip it

**File:** `src/utils/repair-gate.ts`, `applyTier` (lines 203-252). **Non-FROZEN. No new authorization
needed.**

```ts
const value = getAtPath(next, issue.path);
const missing = value === undefined;
if (!strategy || (typeof value !== 'string' && !missing)) { advance(issue); continue; }

let replacement: string | null = null;
if (tier === 'deterministic' && strategy.deterministic) {
  replacement = strategy.deterministic(missing ? '' : (value as string), issue);
} else if (tier === 'field-scoped' && strategy.fieldInstruction && opts.repairField) {
  const instruction = strategy.fieldInstruction(missing ? '' : (value as string), issue);
  replacement = (await opts.repairField(repairFieldPayload(opts.basePayload, instruction)))?.trim() || null;
}

advance(issue);
if (replacement !== null && replacement !== value) next = setAtPath(next, issue.path, replacement);
```

**Deliberately not a `RepairStrategy.fieldInstruction` signature change.** `issue.detail` for a
`doc-schema` finding already carries Zod's own message verbatim, so the model already receives an accurate
signal without an interface change. Coercing `missing` to `''` keeps every existing
`fieldInstruction`/`deterministic` implementation byte-identical; only `applyTier`'s gate condition
changes.

This closes a gap in already-shipped behavior (`D7`/`FR-10`, §1.7): `doc-schema`'s field-scoped entry was
registered specifically for "a required string field that came back empty," and this fix makes it actually
reach the harder case Zod reports identically-in-spirit but structurally differently (an absent key vs. an
empty string).

### 3.4 `D14` — `repair-gate.ts`'s main regeneration loop must give a fresh full-regeneration attempt its own field-scoped/block-scoped shot, not only a deterministic cleanup

**File:** `src/utils/repair-gate.ts`, the "Tiered ladder" block (lines 279-345) and the main `while`
loop's per-attempt cleanup (lines 361-387). **Non-FROZEN. No new authorization needed.**

Extract the existing pre-loop ladder logic into a reusable async helper, `runLadderPass(startArtifact,
startIssues) → { artifact, issues }`. Two call sites: (1) before the main loop, unchanged behavior; (2)
inside the main loop, immediately after each `produce()`/`validate()` call, **replacing** today's narrower
`deterministic`-only cleanup.

**The critical correctness detail:** the ladder cursor must become **local to each `runLadderPass`
invocation**, constructed fresh on each call — otherwise a rung already exhausted against the *initial*
attempt's output would resolve to `'full-regen'` the moment the same rule fires again on a *fresh*
full-regeneration's output, a subtler version of gap (b) itself. Resetting per invocation gives every
attempt its own genuine `fieldBudget`-bounded shot, which is what lets `doc-schema` (a `doc.cta.heading`
write) and `heading-brand-core-missing` (an independent-leaf write) converge in the *same* attempt's own
ladder pass, since `setAtPath` touches only its own leaf and the two cannot regress each other.

Does not increment `repairsUsed`. The existing "Final block pass" (lines 408-431) is left unchanged (§4,
rejected alternative).

### 3.5 Why extending `doc-schema`'s ladder to `block-scoped`, or fixing the dormant `getDocBlock` prefix bug, is not needed here

`D13` + `D14` alone are sufficient for the *mechanism* fix: `doc-schema`'s existing `['field-scoped']`
ladder becomes reachable and repeatable, and both findings this incident's *oscillation* involves are
resolvable at the field-scoped rung.

---

## 4a. NEW (v12) — Defect 3 (`pipeline_status` v11 LEAD 3, highest severity): a field-scoped repair result is trusted without a shape check — `D16`

### 4a.1 Root cause, re-verified against the live source this round

- **`repair-gate.ts:50-52`, `repairFieldPayload(basePayload, instruction)`** — confirmed live,
  unchanged since it shipped: `{ systemBlocks: basePayload.systemBlocks, userContent: instruction }`.
  `systemBlocks` survive BY REFERENCE; `userContent` (the real product/site context) is replaced
  entirely by the one-field repair instruction.
- **`applyTier`'s field-scoped branch (`repair-gate.ts`, current lines 276-279, i.e. the same lines
  `D13` already touches for the `missing` gate)** — confirmed live:
  `replacement = (await opts.repairField(repairFieldPayload(opts.basePayload, instruction)))?.trim() || null;`
  followed immediately by `advance(issue)` and, unconditionally when non-null, a `setAtPath` write.
  **No check anywhere on this path rejects a value that does not look like the plain field it was
  asked for.**
- **The Slugs gate (`content-orchestrator.service.ts:878-896`, confirmed live)** wires
  `repairField: async payload => stripCodeFences(await this.llm.generateText(payload, ...))` —
  `stripCodeFences` strips only Markdown code fences (confirmed by reading its call site; it does not
  parse or validate the response's shape). `basePayload` here is `promptSlug =
  buildPromptSlug(input.website.name, input.name, seoLangs, mergedHtmlEn)`, whose `systemBlocks` are
  `task-slug.ts`'s instruction text — confirmed live (`task-slug.ts:19,32,130,142,156,185`) to state
  repeatedly, with several complete worked examples, "Output stays RAW JSON (pipeline contract):
  `{site_name, slugs:[{language,name,slug}]}`". `repairFieldPayload` keeps that system text
  unmodified while replacing `userContent` with `repair-strategy.ts`'s `'slug-name-designator-lost'`
  `fieldInstruction` ("Return ONLY the corrected name as plain text..."). The model receives two
  instructions that directly conflict in the same call — one (cached, system-level) insisting on a
  complete JSON object; one (fresh, user-level) insisting on plain text — with no product/site name
  anywhere in what it received, since `userContent` no longer carries it.
- **`normalizeSlugResponse` (`content-orchestrator.service.ts:1535-1549`, confirmed live)** runs
  `canonicalizeMultiInOne`/`normalizeSlug`/`stripSlugStopwords` against whatever string comes back,
  with no check that it is plausible prose rather than a serialized JSON blob.
- **This is the shared mechanism, not a Slugs-only defect.** `doc-schema` (`T1`/`D7`/`D13`),
  `slug-name-designator-lost` (`T11`/`D8`) and `meta-title-length` (`T12`/`D9`) all resolve through
  this identical `applyTier` field-scoped branch and this identical `repairFieldPayload()`. A guard at
  `applyTier` protects all three; a guard scoped to the Slugs call site alone would not.

### 4a.2 The guard — an output-shape check with one bounded, explicit retry

Deliberately narrow: rejects only an unambiguous JSON envelope (the trimmed response starts with `{`
or `[`), not "parses as JSON" in general — every field this ladder ever repairs (a Doc string field, a
slug name, a meta title) is short plain prose, none of which legitimately opens with a brace or
bracket, while a broader "attempt `JSON.parse` and reject on success" rule would false-positive on a
legitimate value that happens to be a bare number.

```ts
// repair-gate.ts — new, module-private, colocated with applyTier
/**
 * A field-scoped repair call is supposed to return exactly one plain value: the corrected field,
 * nothing else. Detects the shipped-defect failure mode (2026-09-29 es-ES Slugs incident,
 * pipeline_status v11 LEAD 3) — the model answering with the FULL JSON object its cached system
 * block still describes, instead of the plain text repairFieldPayload's userContent asked for.
 * Deliberately narrow: rejects only an unambiguous JSON envelope (starts with `{` or `[` after
 * trimming), not "parses as JSON" generally — a legitimate field value can be a bare number or a
 * numeric-looking token, and JSON.parse would accept those too without them being the defect.
 */
function looksLikeJsonEnvelope(text: string): boolean {
  return /^[{[]/.test(text.trim());
}
```

```ts
// repair-gate.ts — applyTier, field-scoped branch (revises the existing lines, same D13 already
// touches for the `missing` gate — the two changes compose without touching each other's logic)
} else if (tier === 'field-scoped' && strategy.fieldInstruction && opts.repairField) {
  const instruction = strategy.fieldInstruction(missing ? '' : (value as string), issue);
  const attempt = async (instr: string) =>
    (await opts.repairField!(repairFieldPayload(opts.basePayload, instr)))?.trim() || null;

  let raw = await attempt(instruction);
  if (raw !== null && looksLikeJsonEnvelope(raw)) {
    console.warn(
      `[repair-gate] ${opts.label}: field-scoped repair for "${issue.rule}" at "${issue.path}" ` +
      'returned a JSON-shaped value instead of the plain text asked for; retrying once with an ' +
      'explicit correction.',
    );
    raw = await attempt([
      instruction,
      '',
      'YOUR PREVIOUS ANSWER WAS REJECTED: it looked like a JSON object or array, not the plain',
      'text value asked for above. Return ONLY the corrected value as plain text — no { or [',
      'characters, no quotes wrapping the whole answer, no JSON of any kind.',
    ].join('\n'));
    if (raw !== null && looksLikeJsonEnvelope(raw)) {
      console.warn(
        `[repair-gate] ${opts.label}: field-scoped repair for "${issue.rule}" at "${issue.path}" ` +
        'was still JSON-shaped after one correction — discarding this rung.',
      );
      raw = null;
    }
  }
  replacement = raw;
}
```

**Why a bounded retry, not an unconditional reject.** A silent reject (never trusting a corrected
value, always falling straight through and letting the rung's cursor advance with no write) is
strictly safe but pays for the escalation to the next rung / full regeneration on every occurrence of
a failure this round's own evidence shows the model can resolve once the conflict is named outright —
nothing in what the model originally received said "even though the system block above describes a
JSON contract, THIS call wants plain text only, and your last answer proved you read that instruction
the wrong way." This is the same escalation technique `repair-gate.ts`'s own `escalateForRetry`
already uses for a measured-overshoot retry (the "Second attempt at a MEASURED finding" comment,
unchanged, this round confirmed still live) — applied here to a SHAPE failure instead of a measured
one. Exactly one retry, never more: consistent with this file's own established discipline
(`sentence-too-long`'s two-rung cap, `repair-strategy.ts`) that a failure surviving one explicit
correction should reach the report honestly rather than burn a third call.

### 4a.3 Decision: `repairFieldPayload()` itself is left unchanged — `basePayload.userContent` is NOT threaded back in

Pipeline_status v11 explicitly asked this round to decide this, not merely note it. Considered and
rejected as the fix, for three reasons:

1. **It does not, by itself, close the defect.** The root conflict is between the SURVIVING system
   block (still describing the full JSON contract) and the field instruction. Restoring product/site
   context to `userContent` does not remove that conflict — the model could still choose the JSON
   shape, now merely with a plausible instead of a hallucinated `site_name`. The guard in §4a.2 is
   what actually makes a JSON-shaped answer unable to ship; it is the fix this defect needs, and it
   makes the anchor question moot for THIS defect.
2. **It reopens a decision this module's own doc comment already made, for a stated reason, and
   would undo it for all three rules at once.** `repairFieldPayload`'s comment (`repair-gate.ts:43-49`,
   re-read live, unchanged) states: "Deliberately NOT `appendRepairFeedback`: appending to the full
   `userContent` would ship the entire product context to correct one string." Restoring even a slice
   of it would ship that context on every field-scoped repair call across `doc-schema`,
   `slug-name-designator-lost` AND `meta-title-length` — not only the Slugs case that motivated the
   question — at a real, recurring token cost for the two rules that never needed it.
3. **Each registered strategy already has the mechanism to carry whatever anchor it specifically
   needs, via `issue.detail`.** `slug-name-designator-lost`'s own `fieldInstruction`
   (`repair-strategy.ts:271-280`, re-read live) states in its own comment: "issue.detail already names
   the exact invariant core that must survive — never re-derived here, so the instruction always
   matches whatever this run's product actually is." The missing site name was never something
   `userContent` needed to supply generically; if `slug-validator.ts`'s own finding is ever judged to
   need the real site name in its instruction, that is a targeted change to that one strategy's
   `issue.detail`/`fieldInstruction`, not a generic payload-shape change affecting every rule.

**`repairFieldPayload()`'s signature, comment and "systemBlocks by reference, userContent replaced
entirely" contract all stay exactly as shipped.** The fix lives entirely in `applyTier`'s own
field-scoped branch (§4a.2).

### 4a.4 Files, FROZEN-file position, residual

**Files:** `src/utils/repair-gate.ts` only — `looksLikeJsonEnvelope()` (new, module-private) and the
`applyTier` field-scoped branch (revised, the same lines `D13` (§3.3) already touches). No change to
`repair-strategy.ts`, `repairFieldPayload()` itself, `content-orchestrator.service.ts`, or any prompt
file. **Non-`FROZEN`. No new authorization needed** — the same file `D13`/`D14` already modify.

**Residual, named.** The retry doubles the field-scoped rung's LLM cost specifically for a
JSON-shaped miss (2 calls instead of 1) — a real, small, and correctly-bounded cost: the rung is
still spent exactly once (`advance(issue)` fires once regardless of how many internal `attempt()`
calls happened), so this does not touch the ladder's cursor/budget bookkeeping `D13`/`D14` rely on.
Not fixed further — the alternative (no retry, straight reject) is cheaper but strictly worse at
repair quality; recorded as a rejected alternative (§4.4, new item 12).

---

## 4b. NEW (v12) — Defect 4 (`pipeline_status` v11 LEAD 2): `cutOnWordBoundary` needlessly drops an already-complete trailing word at an exact clip boundary — `D17`

### 4b.1 Root cause, re-derived by hand against the live function, not merely re-cited

`cutOnWordBoundary` (`repair-strategy.ts:199-206`, module-private, called by the exported
`truncateAtWordBoundary`):

```ts
function cutOnWordBoundary(text: string, limit: number): string | null {
  const chars = Array.from(text.trim());
  if (chars.length <= limit) return text.trim();
  const clipped = chars.slice(0, limit).join('');
  const lastSpace = clipped.lastIndexOf(' ');
  const cut = (lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).replace(/[\s\-–—|,:;.]+$/, '').trim();
  return cut.length > 0 ? cut : null;
}
```

`clipped = chars.slice(0, limit)` never includes `chars[limit]` itself — the character in the
ORIGINAL text that comes immediately after the clip. When that character is a separator (a space, or
one of the other characters this same function's own trailing-strip regex already treats as
boundary-equivalent — `-`, `–`, `—`, `|`, `,`, `:`, `;`, `.`), the clip's own last word is ALREADY
complete: nothing was cut off mid-word, and there is nothing to back up from. But the function does
not check this — it unconditionally searches for the last space WITHIN `clipped` and cuts there,
discarding the clip's entire final word even when that word was never truncated at all.

**Traced against `h1OfLength`'s own fixture shape (`seo-metadata-shape.long-h1.spec.ts`,
`'AAAA '.repeat(...)`, spaces recurring every 5th character):** for `limit = 49` (`SAFE_CORE_LENGTH`),
`chars[49]` is always a space (`49 % 5 === 4`), so `chars.slice(0, 49)` already ends exactly at the
end of a complete word (`chars[45..48] = "AAAA"`). `clipped` (indices 0-48) therefore ends in that
same complete `"AAAA"`, with no trailing space of its own (the space is at index 49, outside the
clip). `clipped.lastIndexOf(' ')` finds the PREVIOUS space (index 44, before the final `"AAAA"`) and
cuts there — discarding the entire final, already-complete word for no reason.

**Traced against the real pt-PT incident (`pipeline_status` v11 §3(b)):** the shipped title
`"…Optical Cleaning·"` is missing `"Cloths"`. Reconstructing why: the real `h1`'s 49-code-point clip
boundary lands exactly after `"Cloths"` (the next character, at index 49, is the space before
`"x100"`) — i.e. `"Cloths"` was already fully captured within the clip, complete, not truncated. The
same mechanism as above discards it anyway, backing up to the space before `"Cloths"` and leaving
`"…Optical Cleaning"`. This is the general shape of the defect, not specific to this one product: any
`h1` whose natural 49-code-point clip happens to land exactly on a word boundary loses that entire
final word for nothing.

### 4b.2 The fix — a boundary-aware early return, using the same separator class the function already treats as boundary-equivalent

```ts
function cutOnWordBoundary(text: string, limit: number): string | null {
  const chars = Array.from(text.trim());
  if (chars.length <= limit) return text.trim();
  const clipped = chars.slice(0, limit).join('');
  // NEW: if the clip already lands exactly on a word boundary — the very next character in the
  // ORIGINAL text is itself one of the separators this function already treats as boundary-
  // equivalent for stripping purposes (the SAME character class the trailing-strip regex below
  // uses, not a new or narrower one) — the clip's own last word is already complete and must not
  // be backed up further. Backing up unconditionally here was the defect (pipeline_status v11
  // LEAD 2): a needlessly short prefix that still satisfies every existing shape assertion.
  if (/^[\s\-–—|,:;.]/.test(chars[limit])) {
    const trimmed = clipped.replace(/[\s\-–—|,:;.]+$/, '').trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  const lastSpace = clipped.lastIndexOf(' ');
  const cut = (lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).replace(/[\s\-–—|,:;.]+$/, '').trim();
  return cut.length > 0 ? cut : null;
}
```

`chars[limit]` is always defined at this point in the function — the early `chars.length <= limit`
return above already guarantees `chars.length > limit`. The new branch reuses the identical character
class `[\s\-–—|,:;.]` the function's own trailing-strip regex already uses, deliberately — using a
narrower class (e.g. whitespace only) for this new check than the EXISTING check uses would itself be
a fresh instance of "two definitions of the same idea that are supposed to agree," the exact bug
class `D15`'s own §2.4 revision (`v10`) already eliminated one layer up, between the validator and the
normalizer. Consistency with that already-established principle in this Plan is why this fix reuses
the same class rather than inventing a second one.

### 4b.3 Closed-form check against `T12`'s own pinned characterization test — not yet independently confirmed by `PLAN_REVIEW` or a real test run

`T12`'s pin (`repair-strategy.spec.ts`, "registry strategies — meta-title-length deterministic tier
at the H1-core-length-55 boundary", re-read live this round) exercises `truncateAtWordBoundary(marked,
55)` where `marked = CORE + '·'`, `CORE` a 55-grapheme string, so `marked` is 56 code points. Here
`limit = 55`, and `chars[55]` — the character in `marked` immediately after the clip — is the
appended `'·'` (U+00B7) mark, since `marked`'s first 55 characters are `CORE` exactly and its 56th
(index 55) is the mark. **`'·'` does not match `[\s\-–—|,:;.]`** — it is not whitespace and not one
of the six listed punctuation characters. The new early-return branch's condition is therefore
`false` for this exact pinned input, and the function falls through to its pre-existing,
UNMODIFIED backup logic — producing the identical output the pin already asserts (the last word of
`CORE`, `"1kgX"`, still dropped). **The fix, by this construction, does not reach `T12`'s pinned case
at all** — the pin exercises a clip boundary followed by an appended mark character, not a natural
word boundary in `h1` itself, and those are exactly the two cases the new condition distinguishes.

This is `so-planner`'s own derivation, checked by hand against the live pinned test and the live
function, not an assumption. It has **not** yet been independently confirmed by `PLAN_REVIEW`, nor
empirically confirmed by actually running the test suite (`so-planner` does not run tests) —
flagged explicitly in §4b.4/§4.3/§5 for both. Also separately re-verified by the same method against
every existing case in `truncateAtWordBoundary`'s own describe block (`repair-strategy.spec.ts:163-211`
— "cuts on a word boundary", the two `' | '`-suffix cases, "leaves no dangling separator", "returns
null"): in each, `chars[limit]` is a non-separator character (a letter), so the new branch does not
activate and each case's asserted output is unchanged.

### 4b.4 Files, FROZEN-file position, risk

**Files:** `src/utils/repair-strategy.ts` only — `cutOnWordBoundary` (module-private, unexported;
no new export is added). No change to `truncateAtWordBoundary`'s own exported signature, to
`seo-metadata-shape.ts`, or to `content-orchestrator.service.ts` — `computeLongH1MetaTitle` (`D15`,
already shipped) calls `truncateAtWordBoundary`, which delegates to the corrected function, so `D15`
benefits automatically with no change to its own file. **Non-`FROZEN`. No new authorization needed.**

**Risk, explicit.** This changes a SHARED, non-exported function's output for any caller whose clip
happens to land exactly on a boundary character. Confirmed this round: exactly two production call
sites exist (`meta-title-length`'s deterministic tier via `REPAIR_STRATEGIES`, and
`computeLongH1MetaTitle`/`D15`) — `git grep` for `truncateAtWordBoundary`/`cutOnWordBoundary`
confirms no third caller. §4b.3's closed-form check covers the first; the second (`D15`) is the
mechanism this fix exists to correct, so a behavior change there is the intended outcome, not a risk.
The risk that remains is that §4b.3's own reasoning is not yet independently checked (see above) —
`so-implementation-planner`/`so-test-writer` should add the non-regression case explicitly (§4.2),
and `so-builder`/`PLAN_REVIEW` must confirm it empirically before this decision is treated as closed.

---

## 4c. NEW (v13) — Decision 3 / `D18` (`FR-14` / `AC-7`): `cta.heading`'s non-empty requirement made `schemaVersion`-conditional in `description-doc.schema.ts`

*(v12 left this undesigned because no FR covered it. `specification` v20 adds `FR-14`/`AC-7`; this
section is the design v12 promised. The defect narrative is carried by `FR-14`'s text and
`impact_analysis` v6 §1, both re-verified live this round, and is not restated at length.)*

### 4c.1 What is being decided

`src/domain/description-doc.schema.ts:216` — `cta: z.object({ heading: NonEmpty, text: Prose })` — rejects
an empty `cta.heading` for every `schemaVersion`, while `render-description.ts:443-449` discards it for
`'4.0'` and `task-a-doc.ts:148-150` tells the model it is discarded. `FR-14(a)`: `'4.0'` must not fail
(or spend a repair attempt) because `cta.heading` is empty. `FR-14(b)`: `'3.0'` must keep requiring a
non-empty value, at the same severity. Scope (FR-14): `cta.text` and every other field's validation
unchanged; no file outside `description-doc.schema.ts` implied.

### 4c.2 The design — a lenient field plus one dedicated root refinement (`FR-14` leaves the mechanism to the Plan)

Two coordinated changes, both in `description-doc.schema.ts`, no new file:

1. **The field becomes lenient and self-normalizing**: `cta: z.object({ heading: <lenient>, text: Prose })`
   where `<lenient>` is a module-private `z.string().nullish().transform(v => v ?? '')` — the same
   omit-or-null-normalization technique the file already uses for `videos` (line 228) and `omittable()`
   (line 175), so no new idiom. Output type is `string`, so `ProductDescriptionDoc.cta.heading: string`
   (`description-doc.ts:168`) and the `_typeCheck` assignment at line 421 are unaffected: **no TS type
   change, no renderer change**. Every consumer (`heading-style.ts:479`, `tov-second-person.ts:224`,
   `doc-prose-transforms.ts:134`) keeps seeing a `string`, never `undefined` — this closes
   `impact_analysis` v6 silent-failure risk 2 by construction rather than by hardening each consumer.
2. **One dedicated root-level `.superRefine`, placed between the existing figure-ref refinement and the
   v4 refinement**, enforces the rule per version. When `doc.schemaVersion !== '4.0'` or
   `doc.cta.heading !== ''`, it runs the file's existing `NonEmpty` schema
   (`NonEmpty.safeParse(doc.cta.heading)`) and forwards each issue via `ctx.addIssue` with
   `path: ['cta', 'heading']`. Consequences:
   - **`'3.0'` (FR-14(b)):** an empty, missing (normalized to `''`) or `null` heading fails with the
     identical Zod message (`String must contain at least 1 character(s)`) at the identical dotted path
     `cta.heading`, so `docSchemaIssues()` still yields `doc.cta.heading` and `REPAIR_STRATEGIES`'
     `doc-schema` field-scoped targeting and `T13`/`D13`'s missing-key rung (`repair-gate.ts:264`) resolve
     unchanged (impact hazard 3). A tag-like value still fails (`NonEmpty`'s `TAG_LIKE` refine).
   - **`'4.0'` (FR-14(a)):** `''`, a missing key or `null` passes. A **non-empty** value still has
     `NonEmpty`'s tag-like rule applied: FR-14 relaxes exactly one constraint (non-empty), and `TAG_LIKE` is
     a separate one; relaxing it too would exceed the FR's own stated scope.
   - `cta.text` (`Prose`, required non-empty on both versions) is untouched.

   It is a **separate** `.superRefine`, not folded into the v4 refinement, because that block's documented
   invariant is "no bound a `'3.0'` document parses through moves at all" behind ONE early return
   (lines 285-286); this rule must fire for `'3.0'`, so it cannot live behind that guard. It annotates
   `doc: ProductDescriptionDoc` like its siblings (TSCONFIG NOTE) and uses the explicit `['cta','heading']`
   path (the file's stated reason for spelling paths out: `doc-schema-issues.ts` and `repair-strategy.ts`
   resolve the dotted string).

### 4c.3 Empty vs missing for `'4.0'` — settled here (`impact_analysis` v6 Unknown #12)

`FR-14(a)` says "may be empty (or otherwise absent of enforced content)"; it never states that a missing
key must (or must not) pass. Design position: **both empty and missing pass for `'4.0'`.** Reasons:
(i) it is a superset, satisfying either reading of (a); the only reading it would contradict (a missing key
must still FAIL for `'4.0'`) is stated nowhere in the FR, whose Failure path names only "empty";
(ii) "absent of enforced content" plainly covers an absent key; (iii) the renderer discards the value, so a
missing key has no more effect than `''`; (iv) normalizing to `''` at the field means downstream consumers
need no `undefined` hardening. This is a design choice inside FR-14's stated latitude, not an invented
requirement. A one-line Specification clarification is recommended (§5, non-blocking) but is not a
precondition, because narrowing D18 later (dropping `.nullish()`) is a one-token change if the Owner
intends otherwise. `so-test-writer` must therefore pin `'4.0'` with both `''` and an absent key as passing,
and must not pin a `'4.0'` missing-key rejection.

### 4c.4 Compatibility, and how the prompt → schema → renderer → validator chain stays in agreement

- **Persisted/corpus compatibility:** a relaxation for `'4.0'`, behaviour-identical for `'3.0'` (same path,
  same message, same tag-like rule). Every `'3.0'`/`'4.0'` document that parses today parses identically (a
  present heading is preserved as-is; only a missing/null one gains `''`). No corpus fixture moves
  (`impact_analysis` v6, fixture impact); `test/fixtures/simplified-docs.ts` (`cta.heading: 'ignored'`) and
  `test/tools/scaffold-doc.spec.ts` (TODO-valued heading) remain valid.
- **Chain:** prompt (`task-a-doc.ts:148-150`, `simplified-template-blocks.ts:219`) tells the model the
  heading is discarded → schema (D18) now accepts what a compliant model emits → renderer discards it for
  `'4.0'` and reads it verbatim for `'3.0'` (unchanged) → validators: `FR-7`'s `heading-brand-core-missing`
  reads `doc.localizedName` for `'4.0'`, so an empty CTA heading produces no new finding; `FR-6` stuffing
  cannot fire on an empty heading. The one link that was out of agreement (schema demanding what prompt and
  renderer disown) is the one that moves.
- **AGENTS.md §4 HTML criteria:** untouched — the renderer, hence the rendered CTA `<h2>` for both versions,
  is unchanged.
- **FROZEN files:** none touched; `description-doc.schema.ts` is not on the §9 list. No §9 request.
- **`systemBlocks`/`userContent`, `server/usage/store.js`:** not applicable — no prompt or server change.
- **`FR-10`/`D13`/`D14` interaction:** `D18` only removes the `'4.0'` empty-heading `doc-schema` finding that
  `T13`/`T14` were partly built around; their missing-key rung and per-attempt ladder are still needed for
  every other leaf and for `'3.0'`, and their tests (fixture is `schemaVersion '3.0'`,
  `doc-gate.spec.ts:50`) stay green.

### 4c.5 Files and residuals

**One production file:** `src/domain/description-doc.schema.ts`. Tests (logic runner) in §4.2. Residuals:
(a) like its two siblings, the new refinement does not run when another field yields an aborting
(type/missing-key) issue in the same parse, so a `'3.0'` empty heading then surfaces on the next pass; the
D14 per-attempt ladder converges on it, and the `'3.0'` missing-key case is improved (now a non-aborting
custom issue). (b) Real `'4.0'` runs stop spending one repair attempt on this leaf — intended; any existing
spec counting repair calls with an empty `'4.0'` heading could shift (impact hazard 4), so `so-builder`
re-runs the ~20 referencing specs (impact_analysis §2) to find any such case (Unknown #13).

---

## 4. Files, Validation strategy, Risks, Rejected alternatives

### 4.1 Files to create / modify

**No FROZEN file is touched by `D13`-`D18`.** No prompt text changes anywhere in this revision. `D10`/`D11`
(formerly-pending §9 authorizations) are confirmed already exercised and consumed — see the v8 process note — so no
further FROZEN-file work remains open in this Story at all. **`D18` (v13, `FR-14`, §4c)** adds exactly one production
file, `src/domain/description-doc.schema.ts` (not on the §9 list).

| File | Change | Defect |
|---|---|---|
| `src/utils/repair-gate.ts` | `applyTier`: treat a missing field-scoped/deterministic target as addressable (`D13`). Extract the ladder-pass logic into a reusable, per-invocation-scoped helper (`D14`). **New this round:** an output-shape guard (`looksLikeJsonEnvelope`) on the field-scoped branch's `opts.repairField` result, with one bounded corrective retry before the rung is treated as unaddressed (`D16`, §4a). | 2, 3 (new) |
| `src/utils/repair-gate.spec.ts` | New tests: missing-key field-scoped repair; per-attempt ladder pass; two independent-leaf findings converging in one attempt's pass; stale-cursor regression. **New this round:** a JSON-envelope-shaped `repairField` mock is rejected and retried once with a corrective instruction; a still-JSON-shaped response after the retry is discarded (the rung advances with no write, escalating exactly as any other unaddressed rung); an ordinary plain-text response (unchanged from every existing test's own mocks) is accepted on the first call, confirmed not to trigger a second `repairField` call (`D16`). | 3 (new) |
| `src/services/content-orchestrator.doc-gate.spec.ts` | New fixture: a Doc missing `cta.heading` entirely (not merely empty). | 2 |
| `src/utils/seo-metadata-shape.ts` | New exports `normalizeLongH1MetaTitle(h1, currentMetaTitle)`, and (new this round, module-private) `isH1Unreachable(h1)`/`computeLongH1MetaTitle(h1)` shared by the normalizer and the validator; `meta-title-template-shape`'s check branches on `isH1Unreachable(h1)` (`Array.from(h1).length + MIN_DASH_TAIL > MIRRORED_MAX_META_TITLE`, i.e. `h1Len ≥ 54`) — reachable case unchanged, unreachable case requires `metaTitle === computeLongH1MetaTitle(h1)` (`D15`, revised this round: threshold `54` not `55`; validator equality-based, not structural). | 1 |
| `src/services/content-orchestrator.service.ts` | `canonicalizeSeoData()` calls `normalizeLongH1MetaTitle()` per `seo_data[i]` entry, after computing the canonicalized `h1`, before `meta_title`'s own canonicalization result is finalized (`D15`). Unchanged this round. | 1 |
| `src/utils/seo-metadata-shape.spec.ts` (or wherever `T9`'s own tests live — confirm exact path at `TEST_WRITING`) | New tests: `normalizeLongH1MetaTitle` for `h1` lengths 53, **54 (new this round — previously excluded, now the first activating length)**, 55, 56, 66; the validator's unreachable-case branch, now asserted by equality against `computeLongH1MetaTitle(h1)` rather than structurally — including a case whose natural word-boundary cut point is immediately preceded by trailing punctuation (`,`/`.`/`:`/`;`/a dash) that `cutOnWordBoundary` strips, confirming the equality check accepts it where a literal `=== ' '` check would not; a `MIN_DASH_TAIL === 2` pin (`"-x"` matches `DASH_TAIL`, `"-"`/`"- "`/`"·"` do not); a characterization test asserting `MIRRORED_MAX_META_TITLE === 55` stays in sync with `output-validator.ts`'s own FROZEN constant (fails loudly on drift rather than silently). | 1 |
| `src/services/content-orchestrator.spec.ts` (or sibling) | New test: the real es-ES/pt-PT/uk-UA `h1` values from the 2026-09-28 artifact, run through `canonicalizeSeoData`, produce a title that is a genuine, word-boundary-safe `h1` prefix plus `"·"`, never the interior-phrase-deleted shape the real artifact shipped. Unchanged this round. | 1 |
| `src/utils/heading-style.ts` | The `SENTENCE_TERMINAL` "шт." question (§3.2) — not this Plan's to fix, flagged for whoever revisits `heading-style.ts` next. | 2 (persisting-finding root cause) |
| `docs/plans/US-3.1-task-breakdown.md` | Not this Plan's to write — `so-implementation-planner`'s next revision must (a) mark `T7`/`T8`/`T10` `done` (carried from v9's own process note, still unaddressed as of `task_breakdown` v8) and (b) decompose `T15` against this round's corrected `D15` — the widened `h1Len ≥ 54` threshold, the shared `isH1Unreachable`/`computeLongH1MetaTitle` helpers, the equality-based validator, and the newly-required `h1Len = 54` and trailing-punctuation/no-boundary test cases `T15`'s own v8 Notes deliberately excluded pending this resolution. | — |
| `docs/specifications/US-3.1-spec.md` | Not this Plan's to write — `AC-4`/`FR-8` should state the `h1 ≥ 54` alternate shape explicitly (§2.6, Residual 3; addressed by `specification` v18/v19). **v13:** the `FR-14` gap v12 flagged is answered by `specification` v20; a one-line clarification of missing-key vs empty for `'4.0'` is recommended (§4c.3), not required. | 1, — |
| `src/utils/repair-strategy.ts` | **New this round.** `cutOnWordBoundary` (module-private): a boundary-aware early return when the clip already lands on a word boundary in the original text, reusing the function's own existing `[\s\-–—|,:;.]` separator class rather than a new one (`D17`, §4b). No change to the exported `truncateAtWordBoundary` signature. | 4 (new) |
| `src/utils/repair-strategy.spec.ts` | **New this round.** New tests for `cutOnWordBoundary`'s boundary-aware branch (a fixture whose natural clip lands exactly on a space, asserting the full trailing word is retained, not dropped) and an explicit re-confirmation that `T12`'s existing pinned "H1-core-length-55 boundary" describe block is unmodified and still green (§4b.3's own closed-form check, empirically confirmed) (`D17`). | 4 (new) |
| `src/utils/seo-metadata-shape.long-h1.spec.ts` | **New this round.** A real-artifact regression case (the actual pt-PT `h1`/`meta_title` shape from the 2026-09-28 incident, or an equivalent fixture) asserting `computeLongH1MetaTitle`'s output now retains the trailing word that fits within `SAFE_CORE_LENGTH`, closing the gap the existing `expectGenuineH1PrefixShape` property assertions do not catch (`D17`). No existing assertion in this file is weakened or removed — every current case remains valid under the fix (§4b.3). | 4 (new) |
| `src/domain/description-doc.schema.ts` | **New in v13.** `cta.heading` becomes a module-private lenient field (`z.string().nullish().transform(v => v ?? '')`); one new dedicated `.superRefine` (between the figure-ref and v4 refinements) re-applies `NonEmpty` at `['cta','heading']` when `schemaVersion !== '4.0'` or the heading is non-empty (`D18`, §4c). No TS type change (`description-doc.ts:168` stays `heading: string`), no renderer/prompt change. | 5 (new) |
| `src/domain/description-doc.schema.v4.spec.ts`, `src/domain/description-doc.schema.spec.ts` | **New in v13.** `'4.0'` empty/absent/null heading passes; `'3.0'` empty/absent/null heading fails at `cta.heading`; tag-like and `cta.text` negatives; consumers do not throw on `''` (§4.2, `D18`). Exact file choice confirmed at `TEST_WRITING`. | 5 (new) |

No change to `src/prompts/task-a.ts`, `task-b.ts`, `task-c.ts`, `master-system-prompt.ts`, or
`src/utils/output-validator.ts` — all FROZEN, none touched by this revision.

### 4.2 Validation strategy

- **Logic runner (`npm run test:logic`)** — both `D13`/`D14` (generic `repair-gate.ts` logic) and `D15`
  (`seo-metadata-shape.ts` pure functions, `content-orchestrator.service.ts`'s `canonicalizeSeoData`) are
  `src/utils/**`/`src/services/**` logic, tested at that level directly.
- **Defect 2 (`D13`/`D14`):** as v8 — missing-key coverage, cross-attempt convergence, stale-cursor
  regression, all against synthetic fixtures generic over `T`.
- **Defect 1 (`D15`):**
  - **Boundary arithmetic:** `normalizeLongH1MetaTitle` at `h1` lengths 53 (no-op — the reachable check's
    own last satisfiable length, §2.4.1(b)), **54 (new this round — the value `task_breakdown` v8 found
    uncovered; now the first activating length under the widened threshold)**, 55, 56, 66 (the real es-ES
    length) — asserts the function is a no-op strictly below the threshold and produces a compliant,
    honestly-truncated value at and above it, with no value in this span left untested.
  - **Real-artifact regression:** the exact es-ES/pt-PT/uk-UA `h1` strings from the 2026-09-28
    regeneration, asserting the produced `meta_title` (a) is a genuine prefix of `h1` up to the mark, (b)
    contains no interior deletion (the Correction-3 failure mode), (c) passes the updated validator.
  - **Validator branch (revised this round — equality-based, not structural):** synthetic cases for the
    unreachable branch — `metaTitle === computeLongH1MetaTitle(h1)` (passes); any deviation from that exact
    value, including an interior-edited prefix, a non-word-boundary cut, a missing mark, or a bare-`h1`
    value (fails; a byte-identical bare-`h1` also separately fails `meta-title-h1-identical`). **New this
    round:** a fixture whose natural word-boundary cut point is immediately preceded by a character
    `cutOnWordBoundary`'s trailing-strip regex removes (`,`/`.`/`:`/`;`/a dash) — asserting the equality
    check accepts `computeLongH1MetaTitle`'s own output here, where `v9`'s literal `=== ' '` check would
    have wrongly rejected it (the defect independently found and closed this round, §2.4); a fixture with
    no space at all in the first `SAFE_CORE_LENGTH` code points, asserting the hard-clip fallback still
    validates by the same equality mechanism.
  - **`MIN_DASH_TAIL` pin (new this round):** `DASH_TAIL.test("-x")` is `true`; `DASH_TAIL.test("-")`,
    `DASH_TAIL.test("- ")` and `DASH_TAIL.test("·")` are each `false` — pins the 2-code-point minimum tail
    `isH1Unreachable`'s threshold is derived from, so a future edit to `DASH_TAIL` that silently changes
    this minimum cannot reopen the `h1Len = 54`-class gap unnoticed.
  - **Constant-drift characterization test:** `MIRRORED_MAX_META_TITLE === 55`, so a future FROZEN-file
    change to `output-validator.ts`'s ceiling (were one ever separately authorized) is caught here rather
    than silently diverging.
  - **Closed-form coverage assertion (new this round):** a property-style or explicit-loop test over
    `h1Len` from, say, 0 through 70 (or a representative sample spanning the boundary) asserting exactly one
    of `{isH1Unreachable(h1) === false and a reachable meta_title exists, isH1Unreachable(h1) === true}`
    holds for each — the executable counterpart to §2.4.1's proof, not a substitute for it.
- **Component runner:** none — both defects live in `src/utils/**`/`src/services/**`, outside
  `*.component.spec.ts` territory.
- **Collateral regression sweep:** re-run the full suite after `D14`/`D15` land; any spec asserting an
  exact `meta_title` value for a long-name fixture, or an exact call count/sequence for a Doc/HTML/FAQ/SEO
  gate's main loop, may need updating.
- **The `"шт."` question (§3.2):** not this revision's to test — `heading-style.spec.ts`'s own eventual
  revisit should exercise it against real corpus data.
- **Defect 3 (`D16`, new this round, §4a):**
  - **Guard activation:** a `repairField` mock returning a JSON-object-shaped string (`'{"site_name":
    "Default", ...}'`) and one returning a JSON-array-shaped string are both rejected on the first
    call, trigger exactly one retry with the corrective instruction, and — mocked to return plain text
    on that retry — the plain text is accepted and written.
  - **Exhaustion:** a `repairField` mock returning a JSON-shaped string on BOTH calls results in no
    write (`replacement` stays effectively unaddressed) and the rung's cursor still advances exactly
    once, matching every other unaddressed-rung case already pinned in `repair-gate.spec.ts`.
  - **No false positive:** every existing `repairField` mock already in `repair-gate.spec.ts` (plain
    strings, none starting with `{`/`[`) continues to be accepted on the first call — the exact call
    counts those tests already pin (`toHaveBeenCalledTimes(1)`, etc.) must remain unchanged; this is
    the collateral-regression check for `D16` specifically, over and above the general sweep above.
  - **Real-incident regression:** a synthetic reproduction of the es-ES Slugs case — a `repairField`
    mock whose first response is the shipped garbage shape (a JSON object embedding a hallucinated
    `site_name`) — asserts the guard rejects it and, given a corrected plain-text retry response,
    `slugs[i].name` ends up as genuine prose, never the JSON blob.
- **Defect 4 (`D17`, new this round, §4b):**
  - **Boundary-aware branch:** a fixture whose `limit`-code-point clip lands exactly on a space (or
    one of the other five separator characters) in the source text asserts the full, already-complete
    trailing word is retained — not dropped — closing the gap `h1OfLength`'s own derivation and the
    real pt-PT trace (§4b.1) both demonstrate.
  - **Non-regression, `T12`'s pin:** `repair-strategy.spec.ts`'s existing "H1-core-length-55 boundary"
    describe block is NOT modified (AGENTS.md §7.7) and must still pass unchanged after the fix —
    the closed-form check in §4b.3 is `so-planner`'s own reasoning and must be empirically confirmed
    by actually running this suite, not merely trusted.
  - **Non-regression, `truncateAtWordBoundary`'s own existing describe block:** every case in
    `repair-strategy.spec.ts:163-211` (word-boundary cut, both `' | '`-suffix cases, dangling
    separator, null-on-unsatisfiable) must remain green unmodified, per §4b.3's own case-by-case check.
  - **Real-artifact regression:** the actual pt-PT `h1`/`meta_title` shape (or an equivalent fixture
    reproducing the same boundary condition) run through `computeLongH1MetaTitle`, asserting the
    result now retains the word the shipped artifact dropped.

- **`D18` (`FR-14`/`AC-7`) — logic runner (`npm run test:logic`), schema-level, in `src/domain/description-doc.schema.v4.spec.ts`
  (the natural home for the `'4.0'` cases) and `description-doc.schema.spec.ts` (`'3.0'` negatives):** (1) `'4.0'` doc with
  `cta.heading: ''` parses; (2) `'4.0'` doc with the key absent, and with `null`, parses; (3) `'4.0'` doc with a non-empty
  heading still parses, and one containing a tag-like value still fails at `cta.heading`; (4) **`'3.0'` doc with empty, absent
  and `null` heading each still fail, with issue path `cta.heading` and `docSchemaIssues()` emitting `doc.cta.heading`**
  (AC-7(b), the silent-regression guard); (5) `cta.text: ''` still fails for both versions; (6) a `'4.0'` doc with an empty
  heading run through `validateHeadingStyleDoc`, the ToV scan and `mapDocText` produces no new finding and no throw;
  (7) `T13`'s existing missing-key fixture (`'3.0'`) is unchanged and green; (8) the ~20 referencing specs listed in
  `impact_analysis` v6 §2 are re-run as a regression set. No test is weakened or excluded (§7.7); the `render-conformance`
  and corpus specs need no change.

### 4.3 Risks

1. **Broad collateral surface for `D14`.** Unchanged from v8 — `repair-gate.ts` backs every gate; making
   the main loop retry field-scoped/block-scoped repair on every full-regeneration attempt is a real
   behavior change for every registered rule.
2. **Cost/latency for `D14`, bounded.** Unchanged from v8.
3. **Stale-cursor correctness for `D14` is subtle.** Unchanged from v8.
4. **The dormant `getDocBlock` prefix bug remains unfixed**, by design (§3.5).
5. **Export is not blocked by Defect 1.** Unchanged from v8 — `groundingExportBlocked` is scoped to
   `specs-grounding-disabled` specifically; a `meta-title-template-shape` finding never gated export, and
   `D15` does not change that.
6. **`D15`'s wasted first-pass generation cost for `h1 ≥ 54` entries** (§2.6, Residual 2) — a real,
   small, ongoing inefficiency, not a correctness risk, since the normalization is unconditional and
   authoritative regardless of what the model produced. (Boundary updated this round from `55` to `54`;
   substance unchanged.)
7. **`D15`'s pathological no-word-boundary-or-all-punctuation fallback** (§2.6, Residual 1) — unobserved in
   the real corpus, named rather than fixed. **Downgraded this round** from a possible validation-failure
   risk to a purely cosmetic one, now that the validator accepts whatever `computeLongH1MetaTitle` actually
   returns (equality-based, §2.4) rather than re-deriving an independent structural expectation.
8. **`MIRRORED_MAX_META_TITLE`/`MIN_DASH_TAIL` constant duplication** — `seo-metadata-shape.ts` cannot
   import `output-validator.ts`'s `MAX_META_TITLE`, and `DASH_TAIL`'s minimum-match length is likewise not
   independently importable (not exported, and the file is FROZEN so adding `export` would itself need
   authorization). Mitigated by the characterization test and the `MIN_DASH_TAIL` pin in §4.2, not
   eliminated as a structural duplication. **This is precisely the drift risk that produced the `h1Len = 54`
   gap** (the `+1`-mark vs. `+2`-dash-tail off-by-one) — now closed by deriving `isH1Unreachable`'s
   threshold from `MIN_DASH_TAIL` (the reachable check's own real constant) rather than from `D15`'s output
   shape, but the underlying two-constants-must-agree structure is unavoidable without a FROZEN-file
   export this Story does not request.
9. **This revision's `D1`–`D5`/`D10`–`D12` reconstruction (v8, carried forward) may not match the
   destroyed `v7` exactly**, and its `D5`/`D10`/`D11` *status* fields (corrected this round) show the
   reconstruction process itself is error-prone — `so-plan-reviewer` should treat §1 with continued
   first-draft-level scrutiny, now doubly warranted.
10. **This round's own `h1Len = 54` fix and the trailing-punctuation validator fix are new, not yet
    reviewed by `so-plan-reviewer`** (new this round) — §2.4/§2.4.1's proof is this round's own reasoning,
    independently constructed and internally checked, but has not yet had an independent second read the
    way `D1`–`D12` have had across multiple `PLAN_REVIEW` rounds. Flagged for `PLAN_REVIEW`'s explicit
    attention, same discipline as item 9 above for the reconstructed decisions.
11. **§2.7's `OD-10` framing (new this round) has not yet had a second read either.** `specification` v19
    is the authority for the corrected band (de-DE 52-53, general row closed); this round's own re-derivation
    that `D15` does not and cannot touch the remaining 52-53 band (those `h1Len` values are outside `D15`'s
    `isH1Unreachable` domain by construction) is this round's reasoning, not yet independently re-checked by
    `PLAN_REVIEW`. Same discipline as items 9-10.
12. **`FR-8(b)`'s own prose describes the word-boundary search span as "within its first 50 code points of
    `h1`," while `D15`'s `SAFE_CORE_LENGTH` constant searches within the first 49** (observed this round,
    re-verifying `specification` v19's exact wording against `D15`'s live constant). Not a Plan defect: the
    binding constraint is the `≤ 50`-total-length bullet (prefix plus the 1-code-point mark), which
    `SAFE_CORE_LENGTH + 1 = 50` satisfies exactly and which a 50-code-point-prefix reading would violate by
    one code point if taken literally — so `D15`'s narrower, 49-code-point search window is the correct,
    conservative reading, and the validator's equality check (§2.4) means the two documents' wording cannot
    produce a disagreement about what actually ships, only, in a vanishingly rare case (a word boundary
    landing exactly at `h1`'s 50th code point), one additional instance of the already-accepted hard-clip
    fallback (§2.6, Residual 1) that a literal 50-code-point search would not have needed. Flagged for
    awareness, not a code or design change — the discrepancy is in `specification`'s own prose, which
    `so-planner` does not own or edit.
13. **`D16`'s retry cost (new this round, §4a.4).** A JSON-shaped miss now costs 2 `repairField` calls
    instead of 1 before the rung is treated as unaddressed — small, bounded (the rung is still spent
    exactly once), and only paid on the failure mode it exists to close.
14. **`D16`'s guard narrowness — could a legitimate field value ever start with `{` or `[`?** (new this
    round). Checked against every registered `fieldInstruction` in `repair-strategy.ts` (`doc-schema`,
    `slug-name-designator-lost`, `meta-title-length`): each explicitly asks for short plain prose (a
    field value, a product name, a title), and none of this codebase's real corpus data opens a
    legitimate value with a brace or bracket. Accepted as a residual assumption, not eliminated by
    proof — if a future registered strategy's field is ever genuinely allowed to start with `{`/`[`,
    the guard would need a per-rule opt-out, not designed here because no such strategy exists today.
15. **`D17`'s proof is `so-planner`'s own reasoning, not yet independently checked** (new this round,
    §4b.3/§4b.4) — flagged for `PLAN_REVIEW`'s explicit attention and for `so-builder` to confirm
    empirically (run the actual test suite) before treating `D17` as closed, same discipline already
    applied to items 9-11 above for `D1`-`D12`/`D15`.
16. **(Superseded in v13 — Decision 3 is now designed as `D18`, §4c.)** v12's residual (`doc-schema` firing on `cta.heading`
    for every `'4.0'` generation) is closed by `D18`.
17. **`D18` over-relaxing `'3.0'` (new in v13).** If the refinement's condition or the field leniency were wrong, a `'3.0'`
    document could ship an empty CTA `<h2>` silently. Visible only through a test asserting a `'3.0'` empty, missing and
    `null` `cta.heading` all still fail at path `cta.heading` (§4.2, AC-7(b)).
18. **`D18` losing the `cta.heading` finding path for `'3.0'` (new in v13)** — a changed path string would silently degrade
    `T13`'s field-scoped rung to full regeneration. Mitigated by the explicit `['cta','heading']` path and a test that
    `docSchemaIssues()` still emits `doc.cta.heading` for `'3.0'`.
19. **Repair-call-count drift (new in v13).** An existing spec counting repair calls with an empty `'4.0'` heading could shift
    without a compile error (impact hazard 4); `so-builder` re-runs the referencing specs.
20. **The `'4.0'` missing-key position (§4c.3) is a design choice inside `FR-14`'s latitude** (new in v13); if the Owner reads
    (a) as requiring a missing key to fail, D18 narrows by dropping `.nullish()`.

### 4.4 Rejected alternatives

1. **Registering `meta-title-template-shape` generally in `REPAIR_STRATEGIES` (a post-hoc LLM
   field-scoped repair, rather than `D15`'s pre-emptive deterministic normalization).** Rejected: a
   field-scoped rewrite is bound by the same two constraints (`len(h1)+2 ≤ length ≤ 55`) as the original
   generation for the reachable case, and for the unreachable case an LLM call adds cost and a fresh
   opportunity for another Correction-3-style silent edit — `D15`'s deterministic, `h1`-derived
   construction is strictly safer and cheaper for exactly the case that needs it.
2. **Using `productShort()` literally, as the Owner's suggestion named it.** Rejected after independent
   verification (§2.3) found it unfit for purpose in both of its only possible applications. Not a
   disagreement with the Owner's decision (option (b) is accepted and implemented) — a correction of the
   specific mechanism suggested to illustrate it, disclosed rather than silently swapped.
3. **Threading per-locale `FR-13(c)` budgets (54/51) into `normalizeLongH1MetaTitle` for a tighter target
   length, instead of one fixed `SAFE_CORE_LENGTH`.** Rejected as unnecessary complexity: this is already
   an accepted-degraded fallback path (the model's normal cascade never reaches it for a reachable `h1`),
   so hitting each locale's soft budget precisely buys little, and a single conservative constant (49 +
   mark = 50, under even the tighter de-DE 51 budget) avoids threading `locale`/`store` into
   `seo-metadata-shape.ts`, which does not currently take either parameter.
4. **A repair-gate–routed (post-hoc) fix for `D15`, mirroring `D13`/`D14`'s shape.** Rejected: `D15`'s
   correction is 100% deterministic from `h1` alone with no case where "leave the model's attempt alone"
   is preferable (§2.1, Correction 3) — routing it through `applyTier`/`ValidationIssue.measured` would
   require extending `ValidationIssue`'s FROZEN shape (`output-validator.ts`) to carry `h1`, which `D15`'s
   chosen design (normalize at the `canonicalizeSeoData` choke point, before validation) avoids needing at
   all.
5. **Blanket-adding `meta-title-template-shape` to `NON_REGENERABLE_RULES`.** Rejected, same reasoning as
   v8: a per-rule, not per-issue, static set would deny full-regeneration to genuinely fixable causes too
   (a stray suffix, a short-`h1` dash-tail mismatch), and is now doubly unnecessary since `D15` prevents
   the unreachable case from reaching the repair gate at all.
6. **Fixing the dormant `getDocBlock` `"doc."`-prefix mismatch as part of Defect 2.** Rejected for this
   revision — unchanged reasoning from v8 (§3.5, §4.4 item 4 there).
7. **Extending `doc-schema`'s ladder to `['field-scoped', 'block-scoped']`.** Rejected as unneeded,
   unchanged from v8.
8. **Removing the "Final block pass" as redundant once `D14` lands.** Rejected, unchanged from v8.
9. **Routing this round's Defect 1 work back to `SPECIFICATION` via `changes_required_impact` or
   `changes_required`, since `AC-4`'s literal text no longer fully describes `D15`'s behavior (§2.6,
   Residual 3).** Rejected: the Owner's decision 2 already authorizes exactly this redefinition in
   substance (this round's own dispatch); `Specification`'s exact replacement wording for `AC-4`/`FR-8` is
   delegable to a later `Specification` revision the same way `OD-9` already delegated `FR-13`'s exact
   prompt wording to `so-planner` — looping back now would spend an attempt (this Story is on 2 of 3) to
   restate a decision already made, not to resolve a new ambiguity.
10. **Narrowing `DASH_TAIL`'s minimum-tail requirement (e.g. to just the dash character, no trailing
    non-whitespace requirement) instead of widening `D15`'s own threshold** (new this round — the second
    direction `task_breakdown` v8 named). Rejected: this would shift the reachable check's own ceiling from
    `h1Len ≤ 53` to `h1Len ≤ 54`, closing the gap from the other side, but it does so by accepting a bare
    `"{h1}-"` tail (a dash with nothing meaningful after it) as satisfying `FR-8`'s
    `"{H1} - {Localized Category} {Spec}"` template — a real semantic weakening of an already-shipped
    check, and one that applies to *every* `h1` length below the boundary (0 through 54), not only to the
    single value that needed fixing. Widening `D15`'s threshold is a surgical, single-point extension of an
    already-designed, already-verified mechanism; narrowing `DASH_TAIL` is a global loosening of a
    different check's own meaning to produce the same coverage. The former is strictly narrower in its
    blast radius for an equivalent outcome.
11. **Keeping `v9`'s independent structural re-derivation in the validator (prefix / word-boundary / mark
    checks, separately coded from the normalizer's own truncation) and only patching it to special-case the
    trailing-punctuation and no-boundary edge cases found this round** (new this round). Rejected: patching
    the structural check case-by-case treats each edge case as if it were the last one, which is exactly
    the assumption that produced the `h1Len = 54` gap in the first place (two independently-authored
    comparisons, believed to agree, that did not). Replacing the structural re-derivation with an equality
    check against the same shared `computeLongH1MetaTitle` function used by the normalizer removes the
    entire class of drift bug at once, is less code, and does not depend on the validator's author having
    correctly enumerated every way `cutOnWordBoundary`'s internal stripping/clipping behaviour could differ
    from a naive structural expectation.
12. **An unconditional reject for `D16` (no retry) instead of one bounded corrective retry** (new this
    round, §4a.2). Rejected: strictly safer but pays the escalation cost (next rung / full
    regeneration) on every JSON-shaped miss, including the ones this round's own evidence shows the
    model can resolve once the conflict between the surviving system block and the field instruction is
    named outright — the same reasoning this file's own `escalateForRetry` already applies to a
    measured-overshoot retry.
13. **Restoring `basePayload.userContent` (in full or as a trimmed anchor) to `repairFieldPayload()`**
    (new this round, §4a.3, pipeline_status v11's own explicit question). Rejected: does not by itself
    close the defect (the guard does), reopens a deliberate token-cost decision this module's own doc
    comment already states a reason for, and would apply the cost to `doc-schema`/`meta-title-length`
    calls that never needed it, not only the Slugs case that motivated the question.
14. **A local, non-shared truncation path inside `computeLongH1MetaTitle` instead of fixing the shared
    `cutOnWordBoundary`** (new this round, §4b — pipeline_status v11's own named option (ii)). Rejected:
    would duplicate `cutOnWordBoundary`'s own trailing-punctuation-stripping/no-boundary-found logic a
    second time in `seo-metadata-shape.ts` — exactly the "two independently-coded comparisons that are
    supposed to agree" bug class `D15`'s own §2.4 revision (`v10`) already eliminated for the
    validator/normalizer pair. Reintroducing it here, one layer down, to avoid touching the shared
    function would be inconsistent with that already-established principle in this same Plan, and the
    closed-form check in §4b.3 found no evidence the shared fix threatens `T12`'s pin.
15. **Checking only whitespace (not the full `[\s\-–—|,:;.]` class) for `D17`'s new "already at boundary"
    condition** (new this round). Rejected: `cutOnWordBoundary` already treats that whole class as
    boundary-equivalent for stripping purposes on its existing path; using a narrower class for the NEW
    check than the EXISTING check uses would itself be a fresh instance of the same two-definitions
    inconsistency this fix exists to avoid.
16. **Folding the `'3.0'` requirement into the existing v4 `superRefine` (or making `cta` a `schemaVersion`-discriminated union)** (new in v13, §4c).
    Rejected: the v4 refinement's documented invariant is that no bound a `'3.0'` document parses through moves,
    enforced by a single early return — the new rule must fire for `'3.0'`, so it cannot sit behind that guard;
    and a discriminated union of the whole document would restructure a schema whose cached documents must keep
    parsing forever (NFR-8) to relax one leaf.
17. **Relaxing `cta.heading` unconditionally (`z.string()` or `.optional()` for every version), letting the renderer's `'3.0'`
    branch cope** (new in v13). Rejected: `FR-14(b)` forbids it and `impact_analysis` v6 silent-failure risk 1 names it —
    a `'3.0'` document would ship an empty CTA `<h2>` with no validator firing (`heading-style` cannot flag a heading
    with no product name).
18. **Making the field merely `.optional()` (no `.nullish().transform`) and hardening `tov-second-person.ts` /
    `doc-prose-transforms.ts` / `heading-style.ts` against `undefined`** (new in v13). Rejected: widens the TS type
    (`heading?: string`), forces a renderer edit the FR says is not implied, and spreads a null-guard across three
    consumers, versus one normalization at the schema boundary; also `null` would still be rejected on `'4.0'`.
19. **Dropping `TAG_LIKE` for `'4.0'` too (treat the discarded field as free text)** (new in v13). Rejected: `FR-14` relaxes
    exactly one constraint (non-empty); a tag-like value is a separate defect class the file's own `NonEmpty` comment
    explains, and relaxing it is outside the FR's stated scope.

### 4.5 Traceability (delta from v8, extended in v12 for `D16`/`D17` and in v13 for `D18`)

| Requirement | Design decision | File(s) |
|---|---|---|
| `FR-10` (`doc-schema` targeted repair), `AC-6` | `D13` — field-scoped rung reachable for a missing field | `src/utils/repair-gate.ts` |
| `FR-10`/`FR-11`/`AC-6` (targeted repair, not full-regen) | `D14` — main loop retries the ladder per attempt, cursor scoped per invocation | `src/utils/repair-gate.ts` |
| `FR-8`/`AC-4` (`meta-title-template-shape`), `FR-9`/`AC-5` | **`D15`** — deterministic word-boundary-safe `h1` truncation, generation-time normalization, no `task-b.ts` edit | `src/utils/seo-metadata-shape.ts`, `src/services/content-orchestrator.service.ts` |
| `FR-10`/`FR-11`/`AC-6` (targeted repair must not ship an unaddressed rule's raw model output uncorrected) | **`D16` (new this round)** — output-shape guard + bounded retry on the shared field-scoped branch | `src/utils/repair-gate.ts` |
| `FR-8`/`AC-4` (`meta-title-template-shape`'s dash-tailed shape, and `D15`'s own long-`h1` fallback — both consume `cutOnWordBoundary`) | **`D17` (new this round)** — boundary-aware fix to the shared truncation primitive | `src/utils/repair-strategy.ts` |
| `FR-7` (`heading-brand-core-missing`, CTA-heading position) | `D5` (reconstructed, status corrected to done) | `src/utils/heading-style.ts` |
| `FR-13(a)-(d)` | `D11` (reconstructed, status corrected to done) | `src/prompts/task-b.ts` |
| `FR-12` | `D10` (reconstructed, status corrected to done) | `master-system-prompt.ts`, `task-a.ts` |
| `FR-14` / `AC-7` (`cta.heading` non-empty is `schemaVersion`-conditional; `specification` v20) | **`D18` (new this round, §4c)** — lenient nullish-to-`''` field plus a dedicated per-version root `superRefine` re-applying `NonEmpty` at `cta.heading` for every version except `'4.0'`-with-empty; missing-key semantics settled in §4c.3 | `src/domain/description-doc.schema.ts` |

`FR-1`–`FR-6` map to `D1`–`D5` as reconstructed in §1; substance unchanged from v8/the destroyed `v7`.

---

## 5. Result Envelope

```yaml
stage: ARCHITECTURE_PLANNING
skill: so-planner
story: US-3.1
result:
  verdict: PASS
  loop_back_stage: null
  summary: >
    v13 supersedes v12. It designs the one decision v12 left open (Decision 3 / D18, FR-14 / AC-7):
    description-doc.schema.ts's cta.heading becomes schemaVersion-conditional via a lenient field
    (nullish, normalized to '') plus one dedicated root-level superRefine that re-applies the existing
    NonEmpty rule at path cta.heading for every schemaVersion except '4.0' (and, for '4.0', still
    applies NonEmpty's tag-like rule to a non-empty value). Impact-analysis Unknown #12 is settled
    in-plan: a missing key passes for '4.0' (superset of both readings; FR-14(a)'s "or otherwise absent
    of enforced content" and the renderer's discard both support it), and the '3.0' missing-key path
    still fails at the identical path so T13/D13 targeting is preserved. One file changes
    (src/domain/description-doc.schema.ts); no FROZEN file, no prompt, renderer, TS type or fixture.
    D1-D17 (incl. D15/D16/D17) are carried forward unchanged; upstreams specification v19->v20 and
    impact_analysis v5->v6 were re-read for the delta only, and neither moves D1-D17's substance.
artifacts_written:
  - key: implementation_plan
    path: docs/plans/US-3.1-implementation-plan.md
    version: 13
    status: DRAFT
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 20
  - key: open_decisions
    version: 4
  - key: impact_analysis
    version: 6
  - key: pipeline_status
    version: 11
  - key: task_breakdown
    version: 10
blocking_issues: []
non_blocking_findings:
  - "Specification FR-14(a) does not literally state whether a MISSING cta.heading key must pass for
     '4.0' (only 'empty ... or otherwise absent of enforced content'). D18 accepts both empty and
     missing (a superset of either reading) and pins it in the plan; if the Specification's author
     intended missing-key to still FAIL for '4.0', that is a Specification clarification, and D18
     narrows by dropping .nullish() (a one-token change). Recommend a one-line clarification at the
     next Specification revision; not blocking."
  - "D18's new dedicated superRefine, like the two existing ones, does not run when another field
     produced an aborting (type/missing-key) issue in the same parse; a '3.0' empty cta.heading is
     then reported on the next parse pass. D14's per-attempt ladder converges on it; the '3.0'
     missing-key case is in fact improved (now a non-aborting custom issue). so-test-writer should
     pin that the T13 fixture stays green."
  - "task_breakdown v10 predates D18 (and D16/D17); so-implementation-planner must decompose D18 (one
     schema task plus tests) alongside whatever it already covers. task_breakdown is not owned here."
  - "D16/D17 remain reasoning not yet independently confirmed by PLAN_REVIEW or a real run (v12 items
     13-15), and Sec 2.7's OD-10 framing likewise; carried forward unchanged."
  - "Carried forward unchanged from v12: heading-style.ts 'шт.' SENTENCE_TERMINAL false-positive
     candidate; dormant getDocBlock prefix bug; MIRRORED_MAX_META_TITLE/MIN_DASH_TAIL duplication;
     FR-8(b) 50-vs-49 code-point prose looseness."
evidence:
  - "Read specification v20 FR-14 (lines 2924-2979) and AC-7 references; impact_analysis v6 sections 1-2,
     silent-failure risks, fixture impact and Unknowns 12-14."
  - "Read src/domain/description-doc.schema.ts lines 15-54, 150-300 and the _typeCheck line (421) live:
     cta at line 216, NonEmpty/TAG_LIKE definitions, the two existing superRefines and the v4 version
     guard; src/domain/description-doc.ts:168 TS type cta.heading: string (unchanged by D18)."
  - "Read src/utils/heading-style.ts 470-560 live: collectHeadings pushes doc.cta.heading, FR-7 reads
     doc.localizedName for '4.0'; consumers are safe for '' and, because D18 normalizes missing to '',
     never see undefined. Grep confirmed doc-prose-transforms.ts:134 and tov-second-person.ts:224 read
     doc.cta.heading as a string."
  - "Read src/services/content-orchestrator.doc-gate.spec.ts (grep, lines 40-130, 819-870): the T13
     missing-key fixture is schemaVersion '3.0' (line 50), so it keeps failing under D18 at path
     doc.cta.heading."
  - "Read AGENTS.md Sec 9 FROZEN list (task-a/b/c.ts, master-system-prompt.ts, output-validator.ts):
     description-doc.schema.ts is not FROZEN."
  - "No tests, builds or arch-guard were run this round (so-planner runs no code); only this Plan file
     was edited. A backup of v12 was kept in the session scratchpad because the file is untracked."
```
