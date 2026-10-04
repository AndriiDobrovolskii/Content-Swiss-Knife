---
artifact: specification_review
story: US-4.1
version: 3
status: ARCHIVED
owner: so-spec-reviewer
created_at: 2026-10-01T00:00:00Z
updated_at: 2026-10-01T00:00:00Z
supersedes: docs/reviews/specifications/US-4.1-spec-review.md#2
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 3
  - key: open_decisions
    version: 2
open_decisions_blocking: false
---

# Spec Review: US-4.1 (re-review of Specification v3)

**Verdict:** PASS
**Loop-back:** n/a

> This PASS is **not** human approval. Approval is recorded only by `/so:approve` (AGENTS.md section 10).

## Summary

v3 removes only `max` from `claude-sonnet-5-5` levels (now `[between_tools, low, medium, high, xhigh]`; `max` clamps to `xhigh`).
The change is applied consistently in FR-1, FR-4, FR-4a, FR-9, FR-10, FR-11 and the traceability matrix, is feasible against the existing
clamp, and adds no scope. No blocking finding.

## 1. Acceptance-criterion coverage

Re-derived from the Story: AC-1 -> FR-1/2/4/4a; AC-2 -> FR-3; AC-3 -> FR-5; AC-4 -> FR-6/7/8; AC-5 -> FR-13; AC-6 -> FR-14; AC-7 -> FR-9;
AC-8 -> FR-10/10a/11/12; AC-9 -> FR-16; AC-10 -> FR-17. All covered and the mapped FRs satisfy them. Requirements without a Story AC
(FR-4a, FR-10a, FR-15, AGENTS.md part of FR-16, NFR-7/8) are disclosed and trace to OD resolutions: not scope creep.

## 2. Non-verifiable language

None blocking. NFR-8 remains a recorded verification activity (unchanged from v2).

## 3. Contradictions with the Story

None. Removing `max` narrows the OD-1 level set; the Story does not enumerate 5.5 levels (R-4, disclosed).

## 4. Scope creep

Out of scope present and non-empty: yes. The `max` removal is owner-directed (OQ-2), model-wide, limited to one model, and changes no other model's
levels or clamp outcomes. No new requirement was introduced beyond the consequences (clamp outcome, parity, restore, request shape).

## 5. Edge cases, boundaries, failure paths

| Area | Finding |
|---|---|
| FR failure paths | Present. FR-1 fails on any `levels` array containing `max`; FR-4 states a requested/stored `max` never reaches the request; FR-11 states request carries `xhigh`, never `max`. |
| Locale fan-out / store scope | Unchanged, stated in Scope; model choice is store-independent. |
| Stored/restored `max` | FR-9 covers a stored `max` restoring as `xhigh`. |
| Server-side `max` | FR-4a requires `max` -> `xhigh` on both client and server. |
| Provider behaviour | Truncation at `max_tokens` is disclosed (OQ-2) and left to NFR-8; see non-blocking finding 2. |

## 6. Compliance with AGENTS.md

No FROZEN file; no section 4 change (not applicable, stated); Rules 1-4 respected; no blocking Open Decision; no new implementation design beyond the
already-noted `model-support.js` mention.

## Consistency check of the `max` change (FR-1/4/4a/9/10/11, traceability)

- FR-1: levels exact, no `max`, failure path rejects `max` in the array. Consistent.
- FR-4: `max` stays in the shared vocabulary/ordering (other models keep it), `max` -> `xhigh` outcome, ordering statement "max is nearest to `xhigh`". Consistent.
  Other models' `max` returned unchanged. Consistent.
- FR-4a: `max` -> `xhigh` on both sides for 5.5. Consistent.
- FR-9: stored `max` restores as `xhigh`. Consistent.
- FR-10: `between_tools` never with `xhigh`/`max`; notes `max` is clamped to `xhigh` before the request. Consistent.
- FR-11: effort only `low`..`xhigh`; never sends `max`. Consistent.
- Traceability matrix: AC-1 and AC-7 notes carry `max` -> `xhigh`. Consistent.
- No stray residual reference to `max` as a 5.5 level in the spec (the only mentions are the removal, the clamp, and other models).

## Feasibility against the clamp (`src/prompt-core/model-catalog.ts`, mirrored in `server/providers/model-support.js` line 9)

Both use `LEVEL_ORDER = [disabled, between_tools, minimal, low, medium, high, xhigh, max]`, index-based nearest snap, ties upward. For levels
`[between_tools(1), low(3), medium(4), high(5), xhigh(6)]`:
`max`(7) -> `xhigh` (distance 1, unique nearest); `disabled`(0) -> `between_tools`; `minimal`(2) ties `between_tools`/`low` -> `low`;
unknown -> `defaultLevel`. Needs no ordering change, so FR-4 and FR-4a are achievable and parity holds by construction.
Both clamps were already identical in ordering; the parity test just needs the new probe.

## Explicit judgement: OD-1 (open_decisions v2) still lists `max` for 5.5

**Not blocking; acceptable.** Reasons: (1) the Specification states the supersession explicitly in OQ-2 and in FR-1 ("revised by the owner decision recorded in
OQ-2"), scoped to "the `max` member of OD-1's recorded level set for this model only"; (2) the decision is the owner's own, human-confirmed, and has a
documented evidence basis (live truncation at 128000); (3) no Open Decision is left unresolved, so `open_decisions_blocking: false` stands and no
section 11 gate is triggered; (4) the Specification does not edit or resolve an Open Decision, so the SO boundary is respected. The residual risk is a
reader of open_decisions v2 alone seeing a stale level set. Recommendation: have so-clarifier record the owner's decision as open_decisions v3 (or an
amendment note on OD-1) for a single source of truth, but it is hygiene, not a gate for HUMAN_SPEC_APPROVAL. The approver should be told that OQ-2 wins for 5.5.

## Verdict rationale

PASS: all six axes clear, the change is internally consistent and feasible, and the OD-1 divergence is disclosed and owner-sourced. CHANGES_REQUIRED
was not chosen because no defect exists whose fix belongs in the Specification or Clarification.

## Non-blocking findings

1. OD-1 staleness (above): recommend an open_decisions v3 / OD-1 note recording the `max` removal for 5.5.
2. Truncation may still occur at `xhigh`: `xhigh` also spends large thinking budgets against the same 128000 ceiling, so the observed failure
   can reproduce at `xhigh` (and `max` now silently becomes `xhigh`, which is the closest, not a guaranteed-safe, level). The Specification discloses that the
   truncation "is not otherwise addressed" (OQ-2, NFR-8, Out of scope). Acceptable and non-blocking: the owner chose a narrow mitigation, and NFR-8 keeps a
   verification activity. The approver should accept explicitly that this Story does not guarantee truncation-free `xhigh` runs. Consider noting a follow-up Story
   (truncation repair / timeouts) for the plan.
3. Silent clamping of a stored `max` to `xhigh` changes user-visible effort for users who had `max`; a UI/notice is not specified. Low impact, not required.
4. FR-4/FR-4a name `server/providers/model-support.js`; mild file-level detail, justified as the duplicate implementation (carried from v2).
5. OQ-1 (`minimal` -> `low` vs `between_tools`) remains a recorded owner confirmation, unchanged and non-blocking.
6. A Story amendment for the AC-1/AC-9 gaps (R-4) remains advisable.
