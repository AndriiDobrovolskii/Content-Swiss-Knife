---
artifact: ac_test_matrix
story: US-3.1
version: 7
status: DRAFT
owner: so-test-writer
created_at: 2026-09-27T09:00:00Z
updated_at: 2026-09-29T12:00:00Z
supersedes: docs/tests/US-3.1-ac-test-matrix.md#6
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 20
  - key: impact_analysis
    version: 6
  - key: implementation_plan
    version: 13
  - key: task_breakdown
    version: 11
  - key: plan_review
    version: 10
  - key: test_strategy
    version: 7
open_decisions_blocking: false
---

# AC ↔ Test Matrix — US-3.1

## v7 additions (T16 / T17 / T18) — all RED this revision unless marked [pin]

No AC id changes; **AC-7** is added (specification v20's own addition; not a Story criterion, per the
spec's traceability disclosure). All rows below are `test:logic`.

### AC-4 (T17 / D17)

| Test file | Test | Status |
|---|---|---|
| `src/utils/repair-strategy.spec.ts` | `truncateAtWordBoundary` > `D17 - a clip that lands exactly on a word boundary keeps its last complete word` > 'keeps the final word when the next character is a space', '...a hyphen', 'keeps a complete decimal token when the boundary is the space after it', '...an en dash or a pipe' | **RED** |
| same | '[pin] still backs up to the previous word when the clip lands mid-word', '[pin] never exceeds the limit and never leaves a dangling separator' | GREEN pin |
| `src/utils/seo-metadata-shape.long-h1.spec.ts` | `normalizeLongH1MetaTitle — D17: a complete word at the clip boundary is retained (T17)` > 'space after the 49th code point...', 'synthetic h1OfLength shape...', 'hyphen after the 49th code point...', 'decimal token complete at the boundary...' | **RED** |
| same | '[pin] a clip that lands mid-word still backs up to the previous whole word' | GREEN pin |

### AC-6 (T16 / D16)

| Test file | Test | Status |
|---|---|---|
| `src/utils/repair-gate.spec.ts` | `runRepairGate — T16 (...D16)` > 'a JSON-object answer is retried once with a corrective payload, and the plain retry answer is what lands', 'a JSON-array answer is treated the same way', 'leading whitespace before the brace does not evade the guard', 'a still-JSON-shaped answer after the one retry is discarded: exactly two calls, and no JSON is ever written into the field' | **RED** |
| same | '[pin] an ordinary plain-text answer is accepted on the first call, with no retry', '[pin] a plain answer that merely contains braces or brackets later in the text is not rejected' | GREEN pin |

### AC-7 (T18 / D18, FR-14)

| Test file | Test | Status |
|---|---|---|
| `src/domain/description-doc.schema.v4.spec.ts` | `FR-14 / AC-7 — ...` > `'4.0': an empty, absent or null cta.heading does not fail` > 'empty string parses', 'a missing key parses, and the parsed value is normalised to an empty string', 'a null value parses, ...', 'produces no doc.cta.heading finding through docSchemaIssues' | **RED** |
| same | `'4.0'` pins: non-empty heading preserved; tag-like non-empty heading fails at `cta.heading`; `cta.text` still required | GREEN pin |
| same | `'3.0': cta.heading stays required` > 'empty string / missing key / null fails at path cta.heading' and '... is reported as an error-severity doc-schema finding targeting doc.cta.heading' (AC-7(b), asserts on PATH not message) | GREEN guard (must stay green after T18) |
| same | `'3.0'` pins: tag-like heading fails; `cta.text` required; valid doc parses | GREEN pin |

The AC-7(b) '3.0' rows are green now by construction: they are the silent-regression guard that fails
if T18's refinement is wrong (plan risks 17/18), not red-to-green evidence.

**v6, superseding v5.** Fresh `TEST_WRITING` pass against the now-`APPROVED` `implementation_plan`
v11 / `task_breakdown` v10 / `plan_review` v9 (`PASS`) chain — see `test_strategy` v6's own revision
note for the full staleness account. Two things changed relative to v5:

1. **AC-6's `repairField`-wiring rows move from RED to GREEN.** `c17ceee`
   (`fix(US-3.1): wire repairField into Slugs/SEO repair gates`) landed after v5 was written, closing
   exactly the gap v5's own new tests existed to prove. Re-run this round, independently, not taken
   on `pipeline_status` v7's own "full suite green" claim: all three of
   `content-orchestrator.repair-field-wiring.spec.ts`'s pre-existing tests pass.
2. **AC-4 and AC-6 each gain new rows for `T13`/`T14`/`T15`** — the three new tasks
   `implementation_plan` v9–v11 / `task_breakdown` v7–v10 decompose from the two real-regeneration
   defects `pipeline_status` v8 diagnosed. All new rows are **RED — this revision**, verified by
   direct execution (see `test_generation_report` v6).

No `AC-n` id changes. Ids are the Story's `AC-1`..`AC-6` verbatim. Runner: every file below is
`test:logic` (`vitest run`) — this Story adds no `test:components` work, at any point in its
history including this round (re-confirmed: 23/23 green, unaffected). A test marked **[pin]** is a
characterization/regression pin exercising already-implemented or intentionally-unchanged code, not
evidence of new behaviour for the AC it is listed under.

## AC-1 — Retry-with-backoff for grounding; hard-block after retries exhausted; no silent fallback — green, committed (T2–T6), unaffected by this round

| Test file | Test | Task |
|---|---|---|
| `src/utils/async-retry.spec.ts` | `retryAsync` — all 8 tests | T2 |
| `src/services/content-orchestrator.grounding-retry.spec.ts` | all `groundingSpecs()` FR-1/FR-4 tests | T3 |
| `src/services/content-orchestrator.grounding-retry.spec.ts` **[structural]** | `specs-grounding-disabled` emission-site pin | T5 |
| `src/services/content-orchestrator.doc-gate.spec.ts` | `runDocGate — FR-2(a)` emission test | T5 |
| `src/utils/repair-strategy.spec.ts` | `NON_REGENERABLE_RULES` tests | T4 |
| `src/utils/repair-gate.spec.ts` | `runRepairGate — FR-2(b)` exclusion tests | T4 |
| `src/utils/repair-gate.spec.ts` | `toArtifactReport — FR-2(b)(iii)` status-derivation tests | T4 |
| `src/app/app.component.export-guard.spec.ts` **[structural]** | all 7 export-guard tests | T6 |

## AC-2 — `heading-product-name-stuffing`'s full-pattern branch respects the blessed-position exemption — green, committed (T7/T8), unaffected by this round

| Test file | Test | Task |
|---|---|---|
| `src/utils/heading-style.spec.ts` | `validateHeadingStyle`/`validateHeadingStyleDoc` blessed-position tests | T7 |
| `src/prompt-core/master-system-prompt.spec.ts` **[structural]** | `[HEADING FORM]` degenerate-case exception tests | T8 |
| `src/prompts/task-a.spec.ts` **[structural]** | line-153 restatement test | T8 |

## AC-3 — Brand-core invariant extends beyond `slugs.json` to the CTA-heading position — green, committed (T7/T8), unaffected by this round

| Test file | Test | Task |
|---|---|---|
| `src/utils/heading-style.spec.ts` | all `heading-brand-core-missing`/`doc.localizedName` shape tests | T7 |
| `src/utils/repair-strategy.spec.ts` | `heading-brand-core-missing` registry tests | T7 |
| `src/prompt-core/master-system-prompt.spec.ts`, `src/prompts/task-a.spec.ts` **[structural]** | same two tests as AC-2 | T8 |

## AC-4 — `meta_title` follows the single approved template, with no site-name suffix — **T9/T10 rows green/unaffected; T15 adds the h1Len >= 54 regime, RED — this revision**

| Test file | Test | Task | Status |
|---|---|---|---|---|
| `src/utils/seo-metadata-shape.spec.ts` | `validateSeoMetadataShape — meta-title-template-shape`, all 10 tests (the `h1Len <= 53` regime, D6, unchanged) | T9 | GREEN — committed |
| `src/utils/repair-strategy.spec.ts` | suffix-wording/branch-removal tests | T9 | GREEN — committed |
| `src/prompts/task-b.spec.ts` | `TASK_B_INSTRUCTION`/`buildPromptB()` FR-13(a)-(d) tests | T10 | GREEN — committed (`3d89c86`) |
| `src/utils/seo-metadata-shape.long-h1.spec.ts` **(new this revision)** | `normalizeLongH1MetaTitle — boundary arithmetic` > `'is a no-op for h1Len = 53...'`, `'activates at h1Len = 54...'`, `'produces a compliant, word-boundary-safe h1 prefix at h1Len = %i'` (55/56/66), `'is deterministic...'` | T15 | **RED — this revision** |
| `src/utils/seo-metadata-shape.long-h1.spec.ts` **(new this revision)** | `validateSeoMetadataShape — meta-title-template-shape, the h1Len >= 54 regime` > `'accepts exactly the value normalizeLongH1MetaTitle produces...and rejects every deviation'`, `'accepts computeLongH1MetaTitle's own output when the natural cut point is immediately preceded by trailing punctuation...'`, `'accepts computeLongH1MetaTitle's own hard-clip fallback when h1 has no word boundary...'` | T15 | **RED — this revision** |
| `src/utils/seo-metadata-shape.long-h1.spec.ts` **(new this revision)** | `normalizeLongH1MetaTitle / validateSeoMetadataShape — closed-form coverage sweep` > `'for every sampled h1Len, the value normalizeLongH1MetaTitle produces...passes validateSeoMetadataShape'` | T15 | **RED — this revision** |
| `src/services/content-orchestrator.repair-field-wiring.spec.ts` **(new this revision)** | `generateSeoMetadata() — T15` > `'es-ES: produces a genuine, word-boundary-safe prefix of h1...'`, `'pt-PT: produces a genuine, word-boundary-safe prefix of h1...'`, `'uk-UA: produces a genuine, word-boundary-safe prefix of h1...'` | T15 | **RED — this revision** |
| `src/utils/seo-metadata-shape.long-h1.spec.ts` **[pin]** | `'[pin] MIN_DASH_TAIL, via the unchanged reachable-case behaviour at h1Len = 53...'` | T15 | GREEN — pin, not red-to-green evidence |
| `src/utils/seo-metadata-shape.long-h1.spec.ts` **[pin]** | `'[pin] a 55-code-point meta_title passes the FROZEN meta-title-length check; a 56-code-point one fails it'` | T15 | GREEN — pin, not red-to-green evidence |

## AC-5 — `h1` and `meta_title` are never byte-identical for the same locale — green, committed (T9/T10/T12), unaffected by this round

| Test file | Test | Task |
|---|---|---|
| `src/utils/seo-metadata-shape.spec.ts` | `meta-title-h1-identical`, all 4 tests | T9 |
| `src/prompts/task-b.spec.ts` | h1-verbatim-prefix / never-byte-identical tests | T10 |
| `src/utils/repair-strategy.spec.ts` | marker-preservation red-to-green test | T12 |
| `src/utils/repair-strategy.spec.ts` **[pin]** | `meta-title-length` deterministic-tier boundary pin | T12 |

Note: `T15`'s own design guarantees `meta-title-h1-identical` (`T9`/`D6`) cannot fire against its
output by construction (`computeLongH1MetaTitle`'s core is always strictly shorter than any `h1`
triggering it) — no new AC-5 test is added for `T15`; this is stated as a design property in
`implementation_plan` §2.4 and re-confirmed by this round's `content-orchestrator.repair-field-wiring.spec.ts`
tests' own `expect(metaTitle).not.toBe(h1)` assertion (listed under AC-4 above, since the test's own
subject is FR-8(b)/AC-4, with the FR-9/AC-5 guarantee asserted as a byproduct).

## AC-6 — `doc-schema` and `slug-name-designator-lost` get targeted `REPAIR_STRATEGIES` ladder entries, AND the ladder is actually reachable in production

**`doc-schema` (T1) and `slug-name-designator-lost` (T11): green, committed, reachable in production
end to end (`c17ceee`, re-confirmed this round).** `T13`/`T14` add NEW coverage for two further,
independently-diagnosed `repair-gate.ts` mechanism gaps: a genuinely MISSING (not merely empty)
addressable field silently skipped (T13), and a fresh full-regeneration attempt's own new findings
never getting a field-scoped/block-scoped shot at all (T14) — both real, evidenced against the
2026-09-28 regeneration (`pipeline_status` v8 §2.1-§2.3).

| Test file | Test | Task | Status |
|---|---|---|---|---|
| `src/utils/repair-strategy.spec.ts` | `doc-schema` registry tests, all 4 | T1 | GREEN |
| `src/render/doc-schema-issues.spec.ts` | Zod-path converter tests, all 5 | T1 | GREEN |
| `src/services/content-orchestrator.doc-gate.spec.ts` | `runDocGate — FR-10` field-scoped repair tests | T1 | GREEN |
| `src/utils/repair-strategy.spec.ts` | `slug-name-designator-lost` registry tests, all 3 | T11 | GREEN |
| `src/utils/slug-validator.spec.ts` | `validateSlugs` tiered-ladder tests, both | T11 | GREEN |
| `src/services/content-orchestrator.repair-field-wiring.spec.ts` | `generateSlugs()` field-scoped repair, both tests (positive + negative control) | AC-6/FR-11 wiring | **GREEN — committed (`c17ceee`), re-confirmed this round by direct execution** |
| `src/services/content-orchestrator.repair-field-wiring.spec.ts` | `generateSeoMetadata()` Finding-5 field-scoped repair | AC-6/FR-11 wiring | **GREEN — committed (`c17ceee`), re-confirmed this round** |
| `src/utils/repair-gate.spec.ts` **(new this revision)** | `runRepairGate — T13` > `'a missing (not merely empty) field-scoped value reaches fieldInstruction/repairField with "" as the current value, and the repair lands'`, `'a missing (not merely empty) deterministic-tier value reaches strategy.deterministic with "" as the current value...'` | T13 | **RED — this revision** |
| `src/utils/repair-gate.spec.ts` **[pin]** | `'[pin] a value that is present but neither a string nor undefined...still advances-and-skips, unaffected by this fix'` | T13 | GREEN — pin, not red-to-green evidence |
| `src/services/content-orchestrator.doc-gate.spec.ts` **(new this revision)** | `runDocGate — T13` > `'repairs a missing (not merely empty) cta.heading via the field-scoped rung, spending zero full regenerations'` | T13 | **RED — this revision** |
| `src/utils/repair-gate.spec.ts` **(new this revision)** | `runRepairGate — T14` > `'a field-scoped-repairable error surfacing fresh on a full-regeneration attempt is repaired within that same attempt, not left for a further regen'`, `'two independent-leaf findings on the SAME fresh regeneration attempt...converge together in that attempt's own ladder pass'`, `'a rule's ladder cursor exhausted against the initial attempt's own output is fresh again against a later full-regeneration attempt's output, not carried over stale'` | T14 | **RED — this revision** |
| `src/services/content-orchestrator.doc-gate.spec.ts` **(new this revision)** | `runDocGate — T14` > `'a fresh full-regeneration whose field-scoped repair fixes doc-schema but introduces heading-brand-core-missing converges within the same attempt'` | T14 | **RED — this revision** |

## Requirement traceability beyond the ACs

| Requirement | Test(s) | Status |
|---|---|---|
| FR-1, FR-4, FR-5, NFR-1..NFR-4 | unchanged since v5 — see `test_strategy` v6's Per-task table | GREEN |
| NFR-5 (FROZEN-file `.arch-guard-checksums` rebaseline) | `QUALITY_GATE`'s concern; `T13`/`T14`/`T15` touch no FROZEN file at all (re-confirmed: `bash arch-guard.sh` clean this round, "All frozen files unchanged") | n/a for this round |
| Plan D13 (`applyTier`'s missing-key dispatch) | `repair-gate.spec.ts`'s T13 describe block | **RED — this revision** |
| Plan D14 (per-invocation ladder-pass retry) | `repair-gate.spec.ts`'s T14 describe block | **RED — this revision** |
| Plan D15 (deterministic long-h1 normalization) | `seo-metadata-shape.long-h1.spec.ts`, `content-orchestrator.repair-field-wiring.spec.ts`'s T15 describe block | **RED — this revision** |

## Not covered by design (see test_strategy's "Deliberately not unit-tested")

Carried unchanged from v1–v5 (live-model prompt-following behaviour, the `[CONTEXT]` excerpt
heuristic, `productShort()`/`invariantCore()`'s own over-capture false-positive rate, a `site_name`
smoke case, the punctuation-free CTA/sentence-framing residual, the interior-relocated-punctuation
worked example, `heading-brand-core-missing` against a `simplified-docs.ts` fixture). **New this
round:** T15's pathological no-word-boundary fallback (asserted as a property, not a pinned literal
path); the de-DE 52-53 `OD-10` residual band (`FR-13(b)`/`D11`/`T10`'s own accepted cost, `< 54`, not
this Story's `T15` to normalize); `FR-8(b)`'s "no visibility into whether h1 itself is correct"
residual (`impact_analysis` v5's own Unknown #11 — scope-correct, not a defect).
