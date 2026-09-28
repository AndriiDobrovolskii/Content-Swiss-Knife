---
artifact: pipeline_status
story: US-3.1
version: 6
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-09-27T10:00:00Z
updated_at: 2026-09-28T12:20:00Z
supersedes: docs/catalog/US-3.1-pipeline-status.md#5
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
    version: 4
  - key: ac_test_matrix
    version: 4
  - key: reconciliation_report
    version: 1
open_decisions_blocking: false
---

# Pipeline Status — US-3.1: Make the repair gate actually block ungrounded content and stop the brand-core/heading-form rule conflict

**Verdict this round (RECONCILIATION loop-back, attempt 1 of 3): `CHANGES_REQUIRED` →
`loop_back_stage: changes_required_tests` (routes to `TEST_WRITING`).** No production code was
written this round. `RECONCILIATION` v1's blocking Finding 0 (AC-6 / FR-11) was independently
re-verified against source and is real: `slug-name-designator-lost`'s registered field-scoped
repair strategy (`src/utils/repair-strategy.ts:264-281`, T11's own work) is never reachable in
production because none of the three Slugs `runRepairGate` call sites in
`src/services/content-orchestrator.service.ts` (lines 878, 1286, 1459) supply a `repairField`
executor — `src/utils/repair-gate.ts:219` gates the field-scoped rung on that option's presence,
and `grep -rn "repairField:" src/**/*.ts` shows exactly one production supplier in the whole
codebase, wired only to the unrelated Doc gate at `content-orchestrator.service.ts:612`.

**The fix itself is small and well-precedented** (mirror `runDocGate`'s existing `repairField:`
pattern at line 612 onto the three Slugs call sites, and — per RECONCILIATION's non-blocking
Finding 5, same root cause — the three SEO call sites at lines 909, 1315, 1419). It was **not**
implemented this round because, per this dispatch's own instruction and independent verification
below, **no test in this codebase currently exercises a Slugs- or SEO-shaped `runRepairGate` call
with a `repairField` executor supplied.** AGENTS.md §5 is unambiguous: "No implementation code, in
any layer, may be written before a test that fails for the right reason exists." `so-builder` does
not own test files and may not write one to unblock itself. This round therefore reports the gap
rather than closing it, and loops back to `TEST_WRITING` for the missing red test(s), per this
dispatch's own explicit instruction for exactly this situation.

Branch: `feat/US-3.1-qa-gate-brand-core-fixes` (unchanged). No commit made this round — nothing was
written to `src/` or `test/`.

## 1. Verification performed this round (why this is not merely trusting RECONCILIATION's own claim)

1. Read `src/services/content-orchestrator.service.ts:612` (the Doc gate's `repairField:` wiring)
   directly, to understand the established pattern before judging whether it applies cleanly to
   Slugs/SEO. It does: `repairField` is a one-line `async payload => stripCodeFences(await
   this.llm.generateText(payload, false, { taskLabel: ..., productName: ..., store: ... }))`, and
   `runRepairGate` internally builds the minimal, cache-preserving payload via
   `repairFieldPayload()` before calling it — the executor itself needs no knowledge of the field
   being repaired.
2. Read all three Slugs call sites (`content-orchestrator.service.ts:878-889` in `generate()`,
   `:1286-1297` in `generateUaContent()`, `:1459-1470` in `generateSlugs()`) and all three SEO call
   sites (`:909-924`, `:1315-1330`, `:1419-1433`) directly. Confirmed: none supplies `repairField`.
3. Read `src/utils/repair-gate.ts:219` directly: `applyTier()`'s field-scoped branch is gated on
   `strategy.fieldInstruction && opts.repairField` — confirming the registered strategy is a true
   no-op (cursor advances, no repair attempted) whenever `repairField` is absent, exactly as
   RECONCILIATION describes.
4. Read `src/utils/repair-strategy.ts:264-281` directly: `slug-name-designator-lost` has
   `ladder: ['field-scoped']` and **no** `deterministic` tier, so a missing `repairField` leaves
   this rule with zero working repair instrument in production (it falls straight to
   `full-regen`, which `resolveLadder` appends automatically for an error-severity rule).
5. **Checked the TDD-gate caveat directly rather than accepting RECONCILIATION's own flag at face
   value** — searched every spec file for `repairField` usage:
   `grep -rn "repairField" src/services/*.spec.ts` returns matches **only** in
   `content-orchestrator.doc-gate.spec.ts` (the Doc gate's own dedicated integration tests, lines
   762-801, proving `runDocGate`'s field-scoped rung end-to-end: one call to `generateText`, zero
   full regenerations, and a documented fallback test for when the field-scoped call itself fails).
   No `content-orchestrator.*.spec.ts` file exercises `repairField` for Slugs or SEO.
6. Read `src/utils/repair-gate.spec.ts`'s `'validateSlugs feeding a real repair loop'` describe
   block (lines 1496-1578) in full: all three of its tests call `runRepairGate<SlugResponse>`
   directly with the real `validateSlugs`, but **none of the three passes a `repairField` option**
   — every one resolves `slug-name-designator-lost` by asserting `produce` is called a second time
   (full regeneration), which is the gate-level mechanism test for the no-`repairField` path, not a
   test of the wiring this round would add.
7. Read `src/utils/repair-strategy.spec.ts`'s `slug-name-designator-lost` block (line 482 on):
   confirms only the registry entry's shape (`ladder`, `fieldInstruction` text) — it never calls
   `runRepairGate` at all, so it cannot stand in for a wiring test either.
8. Conclusion: adding `repairField:` to the three Slugs (and three SEO) call sites today would be
   production code with **no failing test to turn green** — a direct AGENTS.md §5 violation. This
   confirms RECONCILIATION's own caveat rather than merely repeating it.

## 2. What TEST_WRITING needs to add (routed via `loop_back_stage: changes_required_tests`)

**Blocking half (AC-6 / FR-11).** A service-level integration test, in a new or extended
`content-orchestrator.*.spec.ts` file, mirroring `content-orchestrator.doc-gate.spec.ts:762-801`'s
own pattern (DI + `makeMockLlm`-style stubbing of `LlmService`, not `TestBed`) for the Slugs gate:

- Stub `generateJson` to return a `SlugResponse` whose `name` for one locale lacks the product's
  invariant core (e.g. `'Ortur F10 Laser Engraver 10 W'` against source name `'Ortur F10 10W'` —
  the same fixture shape `repair-gate.spec.ts:1497-1520` already uses).
- Stub `generateText` to return the corrected name (e.g. `'Ortur F10 10W Laser Engraver'`).
- Drive it through whichever Slugs call site is cheapest to reach directly — `generateSlugs()`
  (`content-orchestrator.service.ts:1446-1482`) needs no HTML/Doc fixture at all, unlike the other
  two sites which sit inside `generate()`/`generateUaContent()`'s full pipeline.
- Assert: `generateJson` called **exactly once** for the Slug produce (no full regeneration);
  `generateText` called **exactly once**, and — the cache-preservation contract `repair-gate.ts`'s
  own doc comment states for `repairFieldPayload()` — with `systemBlocks` identical **by
  reference** to the base Slug payload's `systemBlocks`; `repairsUsed === 0`; the shipped
  `slugData.slugs[i].name` equals the corrected name; no `slug-name-designator-lost` finding
  survives in `finalIssues`.
- A negative-control sibling (mirroring `doc-gate.spec.ts:784-800`) where the field-scoped
  `generateText` call itself fails to produce a usable value, proving the ladder still escalates to
  full regeneration rather than silently shipping the broken name.
- This is the test that is currently red against `HEAD`: today, wiring `repairField` into
  `generateSlugs()` with no other change would make `generateJson` fire **twice** (full
  regeneration) and `generateText` **zero** times, failing the assertions above outright — proof
  the gap is real, not merely a missing option nobody has exercised.
- Two design questions the new test should pin down explicitly rather than leave implicit (the
  advisor flagged these; so-builder should not decide them unilaterally): (a) whether
  `slugs[i].slug` should be re-derived from a field-repaired `name` (today `normalizeSlugResponse`
  runs only inside `produce`, so a field-scoped rewrite of `name` alone would leave `slug` stale);
  (b) whether the field-repaired name should still pass through `canonicalizeMultiInOne` the way
  every `produce()` output already does. Whatever the test asserts here becomes the contract the
  next `IMPLEMENTATION` round builds to.

**Non-blocking half (F5 / T12, bundled in the same TEST_WRITING pass to avoid a second loop-back
later, since it is the identical wiring gap at the identical mechanism).** The same test shape for
the SEO gate's `meta-title-length` rule: `generateJson` returns an over-length `meta_title`,
`generateText` returns a corrected, still-differentiated title; assert `generateText` is called
(the field-scoped rung actually ran) and that the shipped title is the model's returned text, not
`truncateAtWordBoundary`'s deterministic word-boundary cut — proving the field-scoped rung, not
just its deterministic terminator, is reachable. Same open question as (b) above applies to
`canonicalizeSeoData`.

**Heads-up for TEST_WRITING:** any existing end-to-end spec that queues ordered
`mockResolvedValueOnce` values for `generateText` across a full `generate()`/`generateUaContent()`
run may need its call-count expectations re-checked once a Slugs or SEO fixture in that same test
can now trigger a field-scoped `generateText` call it did not make before.

## 3. Scope note carried forward from RECONCILIATION (not a finding against this round)

Task Breakdown v6's T11 (`docs/plans/US-3.1-task-breakdown.md:1108-1144`) and T12
(`:1148-` on) both scope their Files table to `src/utils/repair-strategy.ts` only; neither names
the `content-orchestrator.service.ts` wiring in its Files table or Acceptance check. `so-builder`
built exactly what T11/T12 asked for in every prior round — this is why the gap survived
QUALITY_GATE, IMPLEMENTATION_VERIFICATION and SECURITY_REVIEW and was only caught at RECONCILIATION.
Recorded here for the orchestrator's visibility, not re-litigated as a planning defect by this
skill (RECONCILIATION already routed this as an IMPLEMENTATION-stage fix, not back to planning).

## 4. Files changed this round

None. No `src/` or `test/` file was read-and-modified; the file reads in §1 were inspection only.
`docs/catalog/US-3.1-pipeline-status.md` (this file) is the only artifact this round wrote, and it
is `so-builder`'s own owned artifact per `artifact-paths.yaml`.

## 5. Conclusion

The blocking AC-6/FR-11 gap RECONCILIATION found is confirmed, independently, by direct source
read and by this codebase's own existing tests. The fix (`repairField:` wiring, mirroring the Doc
gate's established pattern) is straightforward but cannot be written yet: no test in the
repository currently exercises a Slugs- or SEO-shaped `runRepairGate` call with `repairField`
supplied, so AGENTS.md §5's TDD gate blocks `so-builder` from writing it. Routed
`changes_required_tests` → `TEST_WRITING` with the precise test specification in §2. Once that test
exists and is red for the stated reason, the wiring itself is a same-day IMPLEMENTATION task: one
`repairField:` line per call site (six total), each an exact mirror of
`content-orchestrator.service.ts:612`.
