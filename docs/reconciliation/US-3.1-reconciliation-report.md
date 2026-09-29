---
artifact: reconciliation_report
story: US-3.1
version: 4
status: APPROVED
owner: so-reconciliation-reviewer
stage: RECONCILIATION
created_at: 2026-09-29T22:00:00Z
updated_at: 2026-09-29T23:30:00Z
supersedes: docs/reconciliation/US-3.1-reconciliation-report.md#3
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 20
  - key: ac_test_matrix
    version: 7
  - key: implementation_report
    version: 5
  - key: verification_report
    version: 4
open_decisions_blocking: false
---

# Reconciliation Report - US-3.1 (v4, post T16/T17/T18)

Verdict: **PASS**, with non-blocking findings. This is not human approval (AGENTS.md section 10);
only `/so:approve` at a human gate records that.

This round adds T16 (plan D16, `repair-gate.ts` JSON-envelope guard), T17 (plan D17,
`repair-strategy.ts` word-boundary retention) and T18 (plan D18, `description-doc.schema.ts`
`cta.heading` relaxation for `'4.0'`, FR-14 / AC-7). AC-1..AC-5 and the T1-T15 rows of AC-4/AC-6
were fully reconciled in v3 of this report; they are not re-read in full. Because T16/T17 touch
`repair-gate.ts` and `repair-strategy.ts` (files AC-1/AC-3/AC-4/AC-5/AC-6 checks live in), every
spec file backing those ACs that lives in the touched files was re-executed this session.

## 0. Execution evidence

```
npx vitest run src/domain/description-doc.schema.v4.spec.ts src/utils/repair-gate.spec.ts \
  src/utils/repair-strategy.spec.ts src/utils/seo-metadata-shape.long-h1.spec.ts \
  src/services/content-orchestrator.doc-gate.spec.ts \
  src/services/content-orchestrator.repair-field-wiring.spec.ts
```
Result: 6 files passed, 258 tests passed, 0 failed. `grep` for `skip`/`.todo`/`.only` in
`description-doc.schema.v4.spec.ts` and `seo-metadata-shape.long-h1.spec.ts`: no matches.
Full-suite/lint/build/arch-guard results are the QUALITY_GATE's (`implementation_report` v5) and
were not re-run here.

## 1. AC-by-AC

Story lists AC-1..AC-6. AC-7 exists only in Specification v20 (its own addition, disclosed in
the Traceability matrix); it is reconciled against the Specification's stated AC-7 text, not a Story
criterion (see Finding 4).

| AC | L1 row | L2 file/test exist | L3 asserts the criterion | Note |
|---|---|---|---|---|
| AC-1 | yes (matrix v7, unchanged) | yes (v3, re-run green) | yes (v3) | unaffected by T16-T18 in substance; `repair-gate.spec.ts` FR-2(b) blocks re-run green |
| AC-2 | yes | yes | yes (v3) | files untouched by T16-T18 |
| AC-3 | yes | yes | yes (v3) | `repair-strategy.spec.ts` heading-brand-core rows re-run green |
| AC-4 | yes (T9/T10/T15 + new T17 rows) | yes | yes | T17 detail below |
| AC-5 | yes | yes | yes (v3) | `repair-strategy.spec.ts` rows re-run green |
| AC-6 | yes (T1/T11/T13/T14 + new T16 rows) | yes | yes | T16 detail below |
| AC-7 | yes (matrix v7, "AC-7 (T18 / D18, FR-14)") | yes | yes | detail below |

### AC-4 / T17 (word-boundary retention, D17)
- L2: `repair-strategy.spec.ts` describe `D17 - a clip that lands exactly on a word boundary keeps
  its last complete word` (line 216) holds all six named tests; `seo-metadata-shape.long-h1.spec.ts`
  describe `normalizeLongH1MetaTitle - D17` (line 210) holds all five named tests.
- L3: the tests assert exact outputs derived from the requirement (longest whole-word prefix within
  the limit): `truncateAtWordBoundary('alpha beta gamma delta', 16)` is `'alpha beta gamma'`
  (space, hyphen, decimal-token, en-dash, pipe variants); the long-h1 tests pin the full 49-code-point
  core with the middle-dot mark, with index-of-boundary preconditions asserted first. The mid-word
  case is pinned as a negative control. A regression (dropping the complete last word) fails each.
  Not `toBeTruthy()`-only, not skipped.

### AC-6 / T16 (JSON-envelope guard, D16)
- L2: `repair-gate.spec.ts` describe `runRepairGate - T16 ... D16` (line 1963) holds all six named
  tests.
- L3: uses a genuinely absent `cta.text` so the field-scoped rung fires; asserts exactly two
  `repairField` calls for `{`/`[`/leading-whitespace JSON answers, that the second payload preserves
  the first `userContent` as a prefix, mentions JSON, and keeps `systemBlocks` identity, and that the
  plain retry answer lands. The bounded-discard test asserts exactly two calls and that neither `{`
  nor `site_name` reaches the field. Pins: plain answer takes one call; later-embedded braces are not
  rejected. A violation (writing the JSON, or a third call) fails these.
- Observation: the discard test asserts absence of JSON in the field rather than a specific final
  state, which matches the plan's stated contract ("rung advances with no write").

### AC-7 (FR-14) - specifically requested confirmation of AC-7(b)
- **L1:** matrix v7 has an explicit `AC-7 (T18 / D18, FR-14)` table (lines 51-61).
- **L2 / file-name check:** the matrix row names `src/domain/description-doc.schema.v4.spec.ts`,
  which is the file that actually contains the pins (describe `FR-14 / AC-7 - cta.heading is required
  for "3.0" and not for "4.0"`, lines 358-440). `task_breakdown` (`docs/plans/US-3.1-task-breakdown.md`,
  line 2103) names `src/domain/description-doc.schema.spec.ts (extended)`; that file exists but is
  **not modified** in the working tree (`git status`), so the breakdown's file designation was not
  followed. The matrix names the **correct** file for where the tests really live. Matrix row is
  right; the plan/breakdown is stale on this one point (Finding 3).
- **L3, AC-7(a) `'4.0'`:** empty string, missing key and `null` each parse with no `cta.heading`
  path finding; missing/null normalise to `''` (asserted on `result.data.cta.heading`); no
  `doc.cta.heading` finding via `docSchemaIssues`. Pins: non-empty preserved verbatim, tag-like
  non-empty still fails at `cta.heading`, `cta.text: ''` still fails at `cta.text`.
- **L3, AC-7(b) `'3.0'` (confirmed):** `it.each` over empty string / missing key / `null` using
  `v3BaseDoc()` (verified `schemaVersion: '3.0'` in `test/fixtures/v4-docs.ts:55`) asserts
  `pathsFor(doc)` contains `'cta.heading'`; a second `it.each` asserts `docSchemaIssues` yields a
  finding at `doc.cta.heading` with `severity === 'error'` and `rule === 'doc-schema'`. Assertions are
  on PATH/severity/rule, not message text. Cross-read against the implementation diff: the lenient
  field transforms null/absent to `''`, and the dedicated `superRefine` re-applies `NonEmpty` at
  path `['cta','heading']` unless `schemaVersion === '4.0' && heading === ''`, so an empty/absent/null
  `'3.0'` heading fails at that path; a broken refinement (accepting empty for 3.0) would fail these
  six cases. Pins: tag-like `'3.0'` heading fails, `cta.text` required, valid `'3.0'` doc parses.
- Mutation-style check: if T18 relaxed `'3.0'` too, the `'3.0'` cases fail; if T18 left `'4.0'`
  required, the `'4.0'` cases fail. Both directions are covered.

**AC-7: PASS**, all three levels.

## 2. Drift from the approved Specification (v20)

- **No FR silently dropped.** FR-14 implemented (`description-doc.schema.ts` +12/-1), T16 -> FR-10/FR-11,
  T17 -> FR-8(b)/AC-4, per `implementation_report` v5's commit table and `verification_report` v4.
- **No undisclosed scope addition.** Diff files: `description-doc.schema.ts`, `repair-gate.ts`,
  `repair-strategy.ts` (plus specs). FR-14's scope statement ("no file outside
  `description-doc.schema.ts`") holds; `cta.text` validation unchanged (pinned). No FROZEN file or
  `output-validator.ts` in the working-tree diff.
- **Criterion reinterpretation:** none new. Carried, disclosed and Specification-approved: AC-4 /
  FR-8(b) departure from the Story's literal mid-word-truncation text (v3 Finding 4); AC-3 Story/Spec
  wording divergence (v3 Finding 5). T17 narrows, rather than widens, that departure by keeping
  complete words.

## 3. Findings

| # | Severity | Finding |
|---|---|---|
| 1 | Non-blocking | `ac_test_matrix` v7 labels the T16/T17/T18 rows **RED** (T18 `'4.0'` rows RED, `'3.0'` rows GREEN guard). All are GREEN in the working tree this session (0 failures across 258 tests); the matrix was evidently written before implementation. A stale label under-claims coverage, so it cannot hide a gap. Recommend `so-test-writer` refresh statuses once the work is committed. |
| 2 | Non-blocking | T13-T18 code and specs are uncommitted (`M` repair-gate.ts/repair-strategy.ts/description-doc.schema.ts and their specs; `??` seo-metadata-shape.long-h1.spec.ts). Level 2 was satisfied against the working tree. Commit hygiene (AGENTS.md sections 1.3 and 7.8) belongs to PR_PREPARATION, which must not draft from a committed-ref diff alone. No `RECONCILIATION` loop-back key exists for this and the tests are neither missing nor weak. |
| 3 | Non-blocking | The breakdown names `description-doc.schema.spec.ts` as the T18 extension target; the AC-7(b) `'3.0'` pins actually live in `description-doc.schema.v4.spec.ts`. Matrix v7 names the correct file. Documentation drift in the breakdown only; `verification_report` v4 Finding 9's concern (pins not visible) is resolved: they are present at lines 402-439. |
| 4 | Non-blocking (disclosed) | AC-7 is not a Story criterion (Story v1 lists AC-1..AC-6); it is Specification v20's own addition. Reconciled here against the Specification's AC-7 text. If the Owner wants it in the Story, that is `so-story-writer`'s call; not a defect in the implementation. |
| 5 | Non-blocking (carried) | `app.component.export-guard.spec.ts` (AC-1 / T6) remains structural-only (source-text), not a runtime refusal proof. |
| 6 | Non-blocking (carried) | Slugs/SEO wiring (`c17ceee`) not named in `task_breakdown` T9-T12 Files tables; traceability correction only. |

## 4. Verification checklist

- [x] Every AC-n (Story AC-1..AC-6, plus Specification AC-7) has a matrix row.
- [x] Level 2 done by opening the named files and locating the tests (T16, T17 x2, T18 opened and
      read in full; unchanged AC-1..AC-5 rows carried from v3 and re-run green).
- [x] Level 3 done by reading test bodies; no `toBeTruthy()`-only, copied-from-actual, skipped or
      todo test found backing any criterion.
- [x] AC-7(b) `'3.0'` empty/absent/null failing at the `cta.heading` path confirmed against both test
      and implementation; matrix row names the right file.
- [x] Every FR checked for silent drop (none) and scope addition against Out of scope (none).
- [x] `loop_back_stage`: not applicable; verdict is PASS.
- [x] This PASS is not human approval; only `/so:approve` records that.
