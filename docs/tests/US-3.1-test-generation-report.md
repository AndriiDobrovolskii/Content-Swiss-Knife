---
artifact: test_generation_report
story: US-3.1
version: 7
status: ARCHIVED
owner: so-test-writer
created_at: 2026-09-27T09:00:00Z
updated_at: 2026-09-29T12:00:00Z
supersedes: docs/tests/US-3.1-test-generation-report.md#6
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
open_decisions_blocking: false
---

# Test Generation Report — US-3.1

## v7 — TEST_WRITING for T16 / T17 / T18 (specification v20, plan v13, breakdown v11)

**Files touched (tests only; no implementation).** `src/utils/repair-gate.spec.ts` (T16 describe, 6 tests),
`src/utils/repair-strategy.spec.ts` (D17 nested describe, 6), `src/utils/seo-metadata-shape.long-h1.spec.ts`
(D17 describe, 5), `src/domain/description-doc.schema.v4.spec.ts` (FR-14/AC-7 describe, 16 incl. it.each
expansions; two imports added). The pre-existing uncommitted T13-T15 spec edits were left as-is; nothing
was reverted, committed or pushed.

**Observed run** (`npx vitest run` on the four files; `npx tsc --noEmit` clean):
`Test Files 4 failed (4) | Tests 16 failed | 219 passed (235)`.

| Group | Failing tests | Actual failure (right reason) |
|---|---|---|
| T16 | 4 | `expected "vi.fn()" to be called 2 times, but got 1 times` (JSON answer accepted, no corrective retry) |
| T17 repair-strategy | 4 | `expected 'alpha beta' to be 'alpha beta gamma'`; `expected 'alpha' to be 'alpha beta'` (x2); `expected 'Model' to be 'Model 2.5'` |
| T17 long-h1 | 4 | `expected 'Ultra Premium Microfibre Optical Clea…' to be '...'` (last complete word dropped), same for h1OfLength(60), hyphen, decimal |
| T18 | 4 | `expected [ 'cta.heading' ] to deeply equal []`; `expected [ 'doc.cta.heading' ] to not include 'doc.cta.heading'` |

No failure is an import/module error. Pre-existing tests in the four files all pass (219 passed), the
[pin] and '3.0' guard tests being among them by design. Failures are asserted from FR-8/FR-10/FR-14, not
copied from output; the expected strings were derived by hand from the requirement ("longest whole-word
prefix within the limit").

**Coverage gaps / notes.** (a) Corpus fixtures not reusable for D17 (need a boundary at the 49th code
point); fixtures are inline, ASCII, with precondition assertions on the boundary character. The real
pt-PT artifact is not in the corpus; an incident-shaped equivalent is used. (b) D17 decimal-point
boundary ("20.5") is unspecified; see test_strategy v7. (c) T18 regression run of the ~20 specs is for
so-builder. (d) Full-suite run not performed at this stage (only the four affected files).

## Verification checklist — v7
- [x] No component specs added; no Angular TestBed. [x] No toBeTruthy-only assertions. [x] No sleep/network/randomness.
- [x] Tests were run; failures observed and recorded, for the right reason. [x] No implementation code written.
- [x] Existing tests in touched files still pass.

## v6 — fresh TEST_WRITING pass for T13/T14/T15 against the now-`APPROVED` implementation_plan v11 / task_breakdown v10 / plan_review v9 chain

**Trigger.** v5's own upstreams (`specification` v17, `impact_analysis` v4, `implementation_plan`
v7, `task_breakdown` v6, `plan_review` v6) have all since advanced and are now `APPROVED`/`PASS`
(`specification` v19, `impact_analysis` v5, `implementation_plan` v11, `task_breakdown` v10,
`plan_review` v9). Per this repository's own artifact-staleness contract, v5 was stale. This round
re-runs `TEST_WRITING` against the current chain.

**Baseline, established before writing anything new.** `git log --oneline -6` confirms `c17ceee`
(`fix(US-3.1): wire repairField into Slugs/SEO repair gates`) is already on this branch, landed after
v5's own `test_generation_report` was written — v5's own three RED tests
(`content-orchestrator.repair-field-wiring.spec.ts`) are expected to be GREEN now. Verified directly,
not assumed:

```
$ npx vitest run src/services/content-orchestrator.repair-field-wiring.spec.ts --reporter=verbose
```

confirmed (before this round's own new T15 tests were added to the same file) all three of the
file's pre-existing tests pass: the Slugs positive proof (`generateJson` called once, `generateText`
called once, `repairsUsed === 0`), the Slugs negative control (falls through to full regen), and the
bundled SEO Finding-5 proof — matching `pipeline_status` v7's own "AC-6/FR-11 wiring landed, full
suite green" record, independently re-confirmed here rather than taken on that document's word.

### New/extended files, this round

1. `src/utils/repair-gate.spec.ts` (extended) — added `import { REPAIR_STRATEGIES } from
   './repair-strategy'` and `afterEach` to the vitest import list; two new describe blocks, six new
   tests (T13 ×3, T14 ×3).
2. `src/services/content-orchestrator.doc-gate.spec.ts` (extended) — added one new fixture
   (`missingCtaHeadingDoc()`); two new describe blocks, two new tests (T13 ×1, T14 ×1).
3. `src/utils/seo-metadata-shape.long-h1.spec.ts` (**new file**) — a deliberate sibling to the
   existing `seo-metadata-shape.spec.ts`, not an extension of it (see the placement-decision note
   below); thirteen new tests.
4. `src/services/content-orchestrator.repair-field-wiring.spec.ts` (extended) — one new describe
   block, four new tests (a fixture-premise check plus es-ES/pt-PT/uk-UA).

**Total new tests this round: 25** (6 + 2 + 13 + 4).

### Placement-decision evidence — why T15's new coverage is a new sibling file, and why its import uses a runtime property lookup rather than a static named import

Empirically verified this round, not assumed from the advisor's own caution alone:

**Attempt 1 — a static named import** (`import { normalizeLongH1MetaTitle, validateSeoMetadataShape }
from './seo-metadata-shape'`) into the new sibling file:

```
$ npx vitest run src/utils/seo-metadata-shape.long-h1.spec.ts --reporter=verbose
```

did **not** crash the whole file (vitest's esbuild-based transform binds the missing name to
`undefined` at runtime rather than throwing a module-resolution `SyntaxError`) — the first-assertion
guard test failed cleanly:

```
FAIL  ... > exists as an exported function (first-assertion guard...) 
AssertionError: expected 'undefined' to be 'function'
```

but `npm run lint` and `npm run test:components` both broke, and NOT only for this one file:

```
$ npm run lint
src/utils/seo-metadata-shape.long-h1.spec.ts(38,10): error TS2305: Module '"./seo-metadata-shape"'
has no exported member 'normalizeLongH1MetaTitle'.

$ npm run test:components
[ERROR] TS2305: Module '"./seo-metadata-shape"' has no exported member 'normalizeLongH1MetaTitle'.
[plugin angular-compiler]
    src/utils/seo-metadata-shape.long-h1.spec.ts:38:9: ...
Application bundle generation failed.
```

`ng test`'s builder performs a full-program TypeScript compile across the whole `src/` tree
(confirmed: the error names a file that is not itself a `*.component.spec.ts` and not part of any
component's own module graph) — a missing named export in ANY file, including a plain
`test:logic`-runner file, aborts bundling for the ENTIRE components test run, which would have
regressed `test:components` from its established 23/23 green baseline to a hard build failure. This
is a collateral break, not merely this new file's own intended red state, and is the specific risk
the advisor flagged.

**Attempt 2 (kept) — a runtime property lookup on the module namespace, narrowed to the real
signature via `as unknown as <interface>`:**

```ts
import * as seoMetadataShapeModule from './seo-metadata-shape';
type NormalizeLongH1MetaTitle = (h1: string, currentMetaTitle: string) => string;
const normalizeLongH1MetaTitle: NormalizeLongH1MetaTitle =
  (seoMetadataShapeModule as unknown as { normalizeLongH1MetaTitle: NormalizeLongH1MetaTitle })
    .normalizeLongH1MetaTitle;
```

— the same idiom `content-orchestrator.doc-gate.spec.ts`'s own `asDocGate()` already establishes in
this codebase for reaching a not-yet-public surface, not a new pattern and not a bare `any`. Re-run:

```
$ npm run lint
> tsc --noEmit
(clean, 0 errors)

$ npm run test:components
 Test Files  2 passed (2)
      Tests  23 passed (23)
```

Both clean/green. The file's `test:logic` red state is unchanged in substance (a `TypeError:
normalizeLongH1MetaTitle is not a function` for tests with no first-assertion guard, a clean
assertion mismatch for the one test that has one) — the genuine, correctly-reasoned red state a
not-yet-implemented export should produce, with the collateral build break removed.

### Evidence the new tests were run, and are red for the documented reason

```
$ npx vitest run src/utils/repair-gate.spec.ts src/services/content-orchestrator.doc-gate.spec.ts
  src/utils/seo-metadata-shape.long-h1.spec.ts src/services/content-orchestrator.repair-field-wiring.spec.ts
  --reporter=verbose
```

**`repair-gate.spec.ts` — 5 of 6 new tests red, 1 `[pin]` green (as designed):**

```
 × runRepairGate — T13 ... > a missing (not merely empty) field-scoped value reaches
   fieldInstruction/repairField with "" as the current value, and the repair lands
   → expected "fieldInstruction" to be called with arguments: [ '', { severity: 'error', …(4) } ]
   Number of calls: 0

 × runRepairGate — T13 ... > a missing (not merely empty) deterministic-tier value reaches
   strategy.deterministic with "" as the current value, instead of being silently skipped
   → expected "deterministic" to be called with arguments: [ '', { severity: 'error', …(4) } ]
   Number of calls: 0

 ✓ runRepairGate — T13 ... > [pin] a value that is present but neither a string nor undefined
   (a structural anomaly) still advances-and-skips, unaffected by this fix

 × runRepairGate — T14 ... > a field-scoped-repairable error surfacing fresh on a
   full-regeneration attempt is repaired within that same attempt, not left for a further regen
   → expected "fieldInstruction" to be called with arguments: [ 'Corrupted Name', …(1) ]
   Number of calls: 0

 × runRepairGate — T14 ... > two independent-leaf findings on the SAME fresh regeneration
   attempt ... converge together in that attempt's own ladder pass
   → expected "fieldInstruction" to be called with arguments: [ '', { severity: 'error', …(4) } ]
   Number of calls: 0

 × runRepairGate — T14 ... > a rule's ladder cursor exhausted against the initial attempt's own
   output is fresh again against a later full-regeneration attempt's output, not carried over stale
   → expected "vi.fn()" to be called 2 times, but got 1 times
```

Each failure traced for the right reason, confirmed by reading the live `applyTier`/main-loop code
(`repair-gate.ts:203-406`) this round, not assumed: the missing-key gate condition
(`typeof value !== 'string'`, true for `undefined`) skips dispatch before any strategy function is
ever called, exactly matching "0 calls" for every `fieldInstructionSpy`/`deterministicSpy`
assertion; the main loop's `deterministic`-only `cleanupPlan` excludes every rule used here
(`doc-schema`, `slug-name-designator-lost` — neither has a `deterministic` rung), exactly matching
"0 calls" for the fresh-regen tests; the stale-cursor test's `repairField` count of 1 (not 2) matches
the pre-loop pass alone running, with no in-loop retry attempted at all under today's code. No
`TypeError`/`ReferenceError`/module-resolution failure in any of the 5.

**`content-orchestrator.doc-gate.spec.ts` — 2 of 2 new tests red:**

```
 × runDocGate — T13 ... > repairs a missing (not merely empty) cta.heading via the field-scoped
   rung, spending zero full regenerations
   AssertionError: expected 1 to be +0 // Object.is equality
   (repairsUsed)

 × runDocGate — T14 ... > a fresh full-regeneration whose field-scoped repair fixes doc-schema
   but introduces heading-brand-core-missing converges within the same attempt
   AssertionError: expected [ { severity: 'error', …(4) } ] to deeply equal []
   Received: [{ context: 'HTML (base)', detail: 'killerSpecs: Array must contain at least 3
   element(s)', path: undefined, rule: 'doc-schema', severity: 'error' }]
```

Both traced: T13's missing-key fixture falls through to a real full regeneration under today's code
(`repairsUsed` becomes 1, not 0 — the second, fallback `generateJson` resolved value this test
supplies specifically so the run degrades to a clean assertion mismatch rather than an unstubbed-call
crash). T14's own tie-break trace: attempt 0 (`invalidSchemaDoc()`, one error) and attempt 1 (the
fresh regen, also one unresolved error, since neither `doc-schema` nor the finding it would surface
after repair is ever attempted in-loop) tie on error count — `runRepairGate`'s "ties keep earliest"
rule ships attempt 0's own original `doc-schema` finding (the `killerSpecs` one), which the test's
filter (`doc-schema` OR `heading-brand-core-missing`) correctly still catches as unresolved. No
`TypeError`/crash.

**`seo-metadata-shape.long-h1.spec.ts` — 11 of 13 new tests red, 2 `[pin]`s green (as designed):**

```
 × exists as an exported function (first-assertion guard...)
   AssertionError: expected 'undefined' to be 'function'
 × is a no-op for h1Len = 53 ...
 × activates at h1Len = 54 ...
 × produces a compliant, word-boundary-safe h1 prefix at h1Len = 55 / 56 / 66  (×3)
 × is deterministic ...
 × accepts exactly the value normalizeLongH1MetaTitle produces...rejects every deviation
 × accepts computeLongH1MetaTitle's own output...trailing punctuation...
 × accepts computeLongH1MetaTitle's own hard-clip fallback...
 × for every sampled h1Len, ...passes validateSeoMetadataShape...

 ✓ [pin] MIN_DASH_TAIL, via the unchanged reachable-case behaviour at h1Len = 53
 ✓ [pin] a 55-code-point meta_title passes the FROZEN meta-title-length check; a 56-code-point
   one fails it
```

All ten non-guard, non-pin failures are `TypeError: normalizeLongH1MetaTitle is not a function` — the
correct, expected reason: `normalizeLongH1MetaTitle`'s runtime property lookup resolves to `undefined`
until `so-builder` adds the real export, and calling `undefined(...)` throws exactly this. The two
`[pin]`s pass because they exercise only the pre-existing, UNCHANGED reachable-case dash-tail check
(`h1Len = 53`, below T15's own `h1Len ≥ 54` activation domain) and the already-shipped, already-
exported, FROZEN `validateSeoMetadata` — neither touches any T15 code.

**`content-orchestrator.repair-field-wiring.spec.ts` — 3 of 4 new tests red, 1 fixture-premise check
green:**

```
 ✓ fixture premise: every real h1 in the regime is confirmed h1Len >= 54, matching
   pipeline_status v8's own recorded counts

 × es-ES: produces a genuine, word-boundary-safe prefix of h1 — never the interior-phrase
   deletion the real artifact shipped
   AssertionError: expected "vi.fn()" to be called 1 times, but got 2 times   (generateJson)

 × pt-PT: produces a genuine, word-boundary-safe prefix of h1 — never the interior-phrase
   deletion the real artifact shipped
   AssertionError: expected "vi.fn()" to be called 1 times, but got 2 times

 × uk-UA: produces a genuine, word-boundary-safe prefix of h1 — never the interior-phrase
   deletion the real artifact shipped
   AssertionError: expected "vi.fn()" to be called 1 times, but got 2 times
```

Traced: today (pre-T15), each fixture's shipped, real 2026-09-28 `meta_title` does not start with
its own `h1` verbatim (the exact interior-phrase-deletion defect the real artifact shipped), so
`meta-title-template-shape` fires; having no registered `REPAIR_STRATEGIES` entry, the finding falls
straight to full-document regeneration — `generateJson` called twice (the initial attempt plus one
regeneration), not once. `mockResolvedValue` (not `Once`) on `generateJson` keeps every regeneration
attempt returning the SAME defective fixture, so this degrades to a clean, capped assertion mismatch
rather than exhausting a mock queue and crashing. No `TypeError`/`alert is not a function` masking.

### Full-suite re-run this round — confirms only this round's own new tests are red, nothing pre-existing broke

```
$ npm run test:logic
 Test Files  4 failed | 145 passed (149)
      Tests  21 failed | 3891 passed | 3 skipped (3915)
```

`3915 = 3890 (pre-round total, per pipeline_status v7's "full suite green" record: 3887 passed + 3
skipped) + 25 (this round's own new tests)`. Reconciled precisely: pre-round green total was 3887;
this round adds 25 new tests, 21 of which start red and 4 of which are `[pin]`/fixture-premise tests
that pass on write; `3887 + 4 = 3891` passed, `21` failed, `3` skipped (unchanged) — matches exactly,
confirming zero pre-existing test regressed. The 4 "failed" files (out of 149 total, up from 148) are
exactly the four this round touched/added; the other 145 are unmodified and green.

```
$ npm run test:components
 Test Files  2 passed (2)
      Tests  23 passed (23)
```

Unaffected — unchanged from every prior round's own recorded baseline, re-confirmed after this
round's T15 import-placement fix (see the placement-decision evidence above).

```
$ npm run lint
> tsc --noEmit
(clean, 0 errors)
```

```
$ bash arch-guard.sh
✅ ALL CHECKS PASSED
  ✓ OK  (Rule #1, no direct SDK calls)
  ✓ OK  (Rule #3, no hard-coded prompts)
  ✓ OK  (Rule #4, no API keys in frontend)
  ✓ All frozen files unchanged
```

```
$ git status --short src/ test/ docs/tests/
 M src/services/content-orchestrator.doc-gate.spec.ts
 M src/services/content-orchestrator.repair-field-wiring.spec.ts
 M src/utils/repair-gate.spec.ts
?? docs/tests/US-3.1-ac-test-matrix.md
?? docs/tests/US-3.1-test-generation-report.md
?? docs/tests/US-3.1-test-strategy.md
?? src/utils/seo-metadata-shape.long-h1.spec.ts

$ git status --short src/ | grep -v '\.spec\.ts'
(empty — no non-spec src/ file touched this round)
```

Confirms: exactly the four spec files this round's own work names were touched; no production file
(`repair-gate.ts`, `seo-metadata-shape.ts`, `content-orchestrator.service.ts`, or any FROZEN file)
was modified — `so-builder`'s own `IMPLEMENTATION` round is what turns `T13`/`T14`/`T15`'s red tests
green.

### Findings

**F1 (informational, no action).** `implementation_plan` v11 §4.1 itself flags that
`src/services/content-orchestrator.spec.ts` "(or the sibling file `so-test-writer` selects for
`canonicalizeSeoData`-level coverage)" is a `TEST_WRITING`-owned placement decision. This round places
that coverage in the existing `content-orchestrator.repair-field-wiring.spec.ts` instead of a new
file — it already boots `ContentOrchestratorService` via `generateSeoMetadata()` and already shares
the same `canonicalizeSeoData`-reaching call path the real-`h1` regression test needs, so extending it
avoids a fourth near-duplicate DI-harness file for one describe block. Recorded per this Story's own
convention of disclosing a placement decision rather than silently making it.

**F2 (informational, no action — the placement-decision evidence above, restated for the Findings
section's own visibility).** A static named import of `normalizeLongH1MetaTitle` breaks `npm run
lint` and, more severely, `npm run test:components`'s full-program Angular build for the ENTIRE
suite, not merely the one new file. Closed this round via a runtime property lookup narrowed to the
real signature (`content-orchestrator.doc-gate.spec.ts`'s own `asDocGate()` idiom) — no `any`, no
`@ts-expect-error`. Recorded here because it is a genuinely new failure mode this Story's own earlier
rounds (T1, T2, T9's own original red-module rounds, which named a WHOLLY missing module rather than
a missing NAMED EXPORT from an existing one) did not need to solve, and a future round writing tests
against an as-yet-unexported symbol on an EXISTING module should reuse this pattern rather than
rediscover it.

**F3 (informational, no action).** `implementation_plan` v11 §2.6/Task Breakdown `T15`'s own Notes
name several residuals this round's tests deliberately do not close: the pathological
no-word-boundary hard-clip fallback (tested as a property, not fixed); the de-DE 52-53 `OD-10` band
(`FR-13(b)`/`D11`/`T10`'s own accepted cost, not `T15`'s); the `h1`-level-defect-masking residual
(`impact_analysis` v5's own Unknown #11, scope-correct). None is a gap this round's own tests should
have closed — restated here so a future reviewer does not mistake their absence for an oversight.

## v5 and earlier

See git history for `docs/tests/US-3.1-test-generation-report.md` (`#5` and prior) for the full
per-round record of T1–T12's own original red-to-green evidence, the golden-fixture fix, the
`task-b.spec.ts` destructuring-bug fix, and the AC-6/FR-11 wiring gap's own original diagnosis —
summarized, not reproduced, in `test_strategy` v6's own "Compression note."

## Verification checklist — v6

- [x] Every component spec is named `*.component.spec.ts`; every file touched/added this round is
      not, and is picked up by `test:logic` (confirmed by the isolated and full-suite runs above).
- [x] The one Angular-service-level spec touched (`content-orchestrator.doc-gate.spec.ts`) already
      uses `Injector.create`, with `import '@angular/compiler'` first — unchanged, reused.
- [x] Every `AC-n` (AC-1..AC-6) still appears in the matrix with a real test file and test name
      (`ac_test_matrix` v6).
- [x] No test's only assertion is `toBeTruthy()`.
- [x] No assertion copied from actual output — the real es-ES/pt-PT/uk-UA fixtures use
      `pipeline_status` v8's own already-recorded data as INPUT only; every expected value elsewhere
      is computed at test time or asserted as a property.
- [x] No `sleep`, no unseeded randomness, no network.
- [x] The tests were actually run and the failing output recorded above, verbatim (abbreviated for
      readability; full verbose output reproducible via the exact commands listed).
- [x] Each failure traced for the right reason — see the per-file trace above; no masked
      "unstubbed call"/"alert is not a function" crash anywhere in this round's own new tests
      (avoided by construction: `mockResolvedValue` for the T15 real-`h1` tests, a fallback
      `generateJson` resolution for the T13 doc-gate test).
- [x] Pre-existing tests still pass — 145 of 149 `test:logic` files green (the 4 "failed" are this
      round's own new/extended red tests, individually reconciled above); `test:components` 23/23
      green; `npm run lint` clean; `bash arch-guard.sh` clean, all FROZEN files unchanged.
- [x] `docs/workflow/workflow-state.yaml` and `docs/workflow/history.jsonl` not written by this
      revision.
- [x] `git diff --stat` against every non-`*.spec.ts` file under `src/` is empty — no production or
      FROZEN file touched.
