---
artifact: pipeline_status
story: US-3.1
version: 7
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-09-27T10:00:00Z
updated_at: 2026-09-28T15:45:00Z
supersedes: docs/catalog/US-3.1-pipeline-status.md#6
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
    version: 5
  - key: ac_test_matrix
    version: 5
  - key: reconciliation_report
    version: 1
open_decisions_blocking: false
---

# Pipeline Status — US-3.1: Make the repair gate actually block ungrounded content and stop the brand-core/heading-form rule conflict

**Verdict this round: implementation complete, all named tests green, full suite clean.** This is
IMPLEMENTATION retry attempt 2 for the AC-6/FR-11 loop-back (attempt 1, recorded in v6, correctly
stopped at the TDD gate with no test coverage). `TEST_WRITING` v5 has since added
`src/services/content-orchestrator.repair-field-wiring.spec.ts` (3 tests, red for the documented
reason). This round wires the missing `repairField` executor into all six Slugs/SEO
`runRepairGate` call sites in `src/services/content-orchestrator.service.ts`, re-applies the same
post-hoc normalization `produce()` already applies to every full generation, and confirms the 3
new tests pass without weakening them and nothing else in the suite regressed.

Branch: `feat/US-3.1-qa-gate-brand-core-fixes`. Commit: `c17ceee` — "fix(US-3.1): wire repairField
into Slugs/SEO repair gates (AC-6/FR-11)" (includes the new spec file, previously untracked, and
the production wiring in one commit).

## 1. What was built

Six `runRepairGate` call sites in `src/services/content-orchestrator.service.ts`, all now wired:

| Call site | Method | Line (pre-change) |
|---|---|---|
| Slugs | `generate()` | ~878 |
| SEO metadata | `generate()` | ~909 |
| Slugs | `generateUaContent()` | ~1286 |
| SEO metadata | `generateUaContent()` | ~1315 |
| SEO metadata | `generateSeoMetadata()` | ~1419 |
| Slugs | `generateSlugs()` | ~1459 |

Two changes per call site, mirroring the existing Doc gate's own pattern at line 612:

1. **`repairField` executor added** — `async payload => stripCodeFences(await
   this.llm.generateText(payload, false, { taskLabel: ..., productName: input.name, store:
   input.website.name[, lang: UA_ISO] }))`, identical in shape to the Doc gate's own executor.
   This makes `repair-gate.ts:219`'s field-scoped rung reachable for `slug-name-designator-lost`
   (T11, `ladder: ['field-scoped']`, no deterministic tier) and `meta-title-length`'s field-scoped
   rung (T12) for the first time in production.
2. **Post-hoc re-normalization added** — a field-scoped repair writes the target field (`.name`
   for Slugs, `.meta_title` for SEO) directly via `setAtPath`, bypassing `produce()`'s own
   normalization entirely (the ladder runs *inside* `runRepairGate`, after `produce()` has already
   returned). Left alone, this would ship a field-repaired `.name` whose invariant core was just
   restored sitting next to a `.slug` still derived from the OLD, broken name — the exact
   corruption shape FR-11 exists to close, merely relocated from `.name` to `.slug`, and
   undetectable by `validateSlugs` (confirmed by reading `slug-validator.ts` in full: it has no
   `.slug`/`.name` consistency check). Each Slugs call site now re-applies
   `this.normalizeSlugResponse()` to the gate's shipped artifact; each SEO call site re-applies
   `this.canonicalizeSeoData()`. Both are pre-existing, pure, already-tested functions
   (`content-orchestrator.service.ts:1484-1498` / `:1508-1518`, unchanged by this round) — reused,
   not reimplemented, exactly as the dispatch required. Idempotent when nothing was field-repaired:
   `canonicalizeMultiInOne` is a no-op on already-canonical text, and `normalizeSeoNumbers`
   (`seo-number-format.ts`) touches only `meta_description`, never `meta_title`/`h1`, so re-running
   `canonicalizeSeoData` cannot perturb a field-repaired `meta_title` beyond the one
   `canonicalizeMultiInOne` pass the test pins.

No change to `repair-gate.ts`, `repair-strategy.ts`, `slug-validator.ts`, or any FROZEN file.
`bash arch-guard.sh` confirms all frozen files unchanged.

## 2. Test evidence

**Target spec, `content-orchestrator.repair-field-wiring.spec.ts`:**

```
$ npx vitest run src/services/content-orchestrator.repair-field-wiring.spec.ts --reporter=verbose

 ✓ generateSlugs() — field-scoped repair of slug-name-designator-lost (AC-6, FR-11) >
   resolves the finding via one field-scoped call, spending zero full regenerations
 ✓ generateSlugs() — field-scoped repair of slug-name-designator-lost (AC-6, FR-11) >
   falls through to full regeneration when the field-scoped call itself fails, never
   shipping the broken name
 ✓ generateSeoMetadata() — field-scoped repair of meta-title-length (Finding 5) >
   ships the model-corrected title, not truncateAtWordBoundary's deterministic cut

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

All 3 pass for the intended reason, not a weakened assertion: none of the three tests, their
fixtures, or their assertions were edited — only production code changed. Decision (a) (`.slug`
re-derived from the field-repaired `.name`) and decision (b) (field-repaired value still
canonicalized) both verified directly by the positive test's assertions, computed from the real
imported `normalizeSlug`/`stripSlugStopwords`/`enforceSlugLength`/`canonicalizeMultiInOne`, not
hand-typed literals.

**Full suite, both runners:**

```
$ npm run test:logic
 Test Files  148 passed (148)
      Tests  3887 passed | 3 skipped (3890)

$ npm run test:components
 Test Files  2 passed (2)
      Tests  23 passed (23)
```

3887 passed / 3 skipped / 0 failed — 148/148 files green, including the new spec file counted
in. The 3 pre-existing skips are unrelated to this round (unchanged from every prior round's
baseline). No call-count regression found in any other `content-orchestrator.*.spec.ts` file:
checked directly, per the dispatch's own instruction, by running the full `test:logic` suite and
confirming zero failures anywhere outside the 3 newly-green target tests — every existing spec
that queues ordered `generateText`/`generateJson` mocks for a Slugs- or SEO-shaped fixture still
passes with its original call-count expectations, because none of those fixtures' `name`/`h1`
values trip `slug-name-designator-lost` or `meta-title-length` (each already contains its
invariant core / stays under the 55-char budget) — so the newly-reachable field-scoped rung is
never entered by any of them, matching `test_generation_report` v5's own "Heads-up check" finding
that traced this exhaustively before this round began.

**Lint:**

```
$ npm run lint
 tsc --noEmit   (clean, 0 errors)
```

**Arch-guard:**

```
$ bash arch-guard.sh
 ✅ ALL CHECKS PASSED — frozen files unchanged, no direct SDK calls outside providers/,
    no hard-coded prompts in services, no API keys in frontend source.
```

## 3. Files changed this round

- `src/services/content-orchestrator.service.ts` — the six-call-site wiring described in §1.
- `src/services/content-orchestrator.repair-field-wiring.spec.ts` — committed in the same commit
  (previously written by `TEST_WRITING` v5 but left uncommitted/untracked; not edited by this
  round — `git diff` against the version `TEST_WRITING` produced is empty, confirmed before
  staging).
- `docs/catalog/US-3.1-pipeline-status.md` (this file) — `so-builder`'s own owned artifact.

No other file touched. No test file, fixture, or `vitest.config.ts` coverage setting was
modified. No FROZEN file (`src/prompts/task-a.ts`, `src/prompts/task-b.ts`,
`src/prompts/task-c.ts`, `src/prompt-core/master-system-prompt.ts`,
`src/utils/output-validator.ts`) was touched — confirmed both by `git diff --stat` (absent from
the changed-file list) and by `arch-guard.sh`'s own checksum check.

## 4. Conclusion

AC-6/FR-11's field-scoped repair mechanism (T11) and the bundled Finding-5 SEO gap (T12) are now
wired into production, not merely registered and unit-tested. The 3 tests `TEST_WRITING` v5
pinned are green for the documented reason; the full suite (both runners), lint and arch-guard are
all clean. Ready for `QUALITY_GATE` to re-run its own mechanical gate over this commit.
