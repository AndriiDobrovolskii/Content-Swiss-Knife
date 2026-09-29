---
artifact: test_strategy
story: US-3.1
version: 7
status: DRAFT
owner: so-test-writer
created_at: 2026-09-27T09:00:00Z
updated_at: 2026-09-29T12:00:00Z
supersedes: docs/tests/US-3.1-test-strategy.md#6
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

# Test Strategy — US-3.1: Make the repair gate actually block ungrounded content and stop the brand-core/heading-form rule conflict

## Revision note — v7, superseding v6 (TEST_WRITING for T16 / T17 / T18)

**Why.** v6 consumed specification v19 / plan v11 / breakdown v10. Since then the chain advanced to
specification v20 (adds FR-14 / AC-7), impact_analysis v6, implementation_plan v13 (D16, D17, D18) and
task_breakdown v11 (T16, T17, T18; T1-T15 landed), plan_review v10. This round writes the failing tests for
the three new tasks. v6 content below is retained unchanged for T1-T15.

**Runner.** All new tests are `test:logic` (`vitest run`); no component or service-DI spec is added, so no
`*.component.spec.ts` file and no `Injector.create` is involved.

| Task | Requirement | Level | File (existing file extended unless noted) | What it proves |
|---|---|---|---|---|
| T16 (D16) | FR-10, FR-11, AC-6 | unit, real `runRepairGate`, `repairField` is a mock (boundary) | `src/utils/repair-gate.spec.ts` (new describe "T16") | JSON-object / JSON-array / whitespace-led JSON answer is not written; exactly one corrective retry (original instruction preserved, mentions JSON, systemBlocks by reference); a second JSON answer is discarded (exactly 2 calls, no JSON in field); plain answer accepted on first call; braces later in text not rejected |
| T17 (D17) | FR-8, AC-4 | unit, pure function through the exported `truncateAtWordBoundary` | `src/utils/repair-strategy.spec.ts` (new nested describe "D17") | Clip landing on space / hyphen / en dash / pipe / decimal-then-space keeps the complete last word; mid-word clip and limit / dangling-separator invariants pinned |
| T17 (D17) | FR-8(b), AC-4 | unit, through exported `normalizeLongH1MetaTitle` | `src/utils/seo-metadata-shape.long-h1.spec.ts` (new describe) | Incident-shaped h1 (49th code point followed by space), synthetic `h1OfLength(60)`, hyphen and decimal fixtures keep the full 49-code-point core; mid-word pin |
| T18 (D18) | FR-14, AC-7 | unit, real `ProductDescriptionDocSchema` + real `docSchemaIssues` | `src/domain/description-doc.schema.v4.spec.ts` (new describe "FR-14 / AC-7") | Synthetic `'4.0'` fixture (from `v4ValidDoc`) with empty / absent / null `cta.heading` parses, normalised to `''`, no `doc.cta.heading` finding; `'3.0'` empty / absent / null fails at path `cta.heading` and yields an error-severity `doc-schema` finding at `doc.cta.heading` (asserted on PATH, never message text); tag-like heading and `cta.text: ''` still fail on both versions |

**Design decisions.** (1) The plan lists two D18 files (`v4.spec` and `schema.spec`); both halves live in
`description-doc.schema.v4.spec.ts` so the '4.0' relaxation and the '3.0' guard sit side by side and
reuse that file's `issuesFor`/`pathsFor` helpers and the shared `v3BaseDoc`/`v4ValidDoc` fixtures (no new
fixture file). (2) Per plan section 4c.3, '4.0' missing/null is pinned as PASSING; no test pins a '4.0'
missing-key rejection. (3) The D16 retry wording is deliberately not pinned. (4) D16 tests use `maxRepairs: 0`
so only the pre-loop ladder pass exercises the rung, keeping call counts unambiguous.

**Not unit-tested, by design.** The ~20 cta.heading-referencing specs (impact_analysis v6 section 2,
Unknown 13) are a regression RUN for so-builder, not new tests. Consumer no-throw on `''` (heading-style,
ToV, mapDocText) is covered indirectly: the schema normalises to a string, and those specs are in the
regression set. Interaction of D16 with the live Slugs call site is covered by the existing
`content-orchestrator.repair-field-wiring.spec.ts` staying green.

**Known ambiguity, non-blocking.** D17 reuses the class `[\s\-–—|,:;.]`, so a clip landing just before a
decimal point ("Model 20.5 W", limit 8) would yield "Model 20". Spec/AC do not address it; no test pins or
forbids it (the decimal fixtures use a space boundary). Flagged for PLAN_REVIEW / so-builder.

## Revision note — v6, superseding v5 (fresh TEST_WRITING pass against the now-current, `APPROVED` upstream chain)

**Why this round exists.** v5's own front matter recorded `specification` v17, `impact_analysis`
v4, `implementation_plan` v7, `task_breakdown` v6, `plan_review` v6 — every one of those inputs has
since advanced (`specification` +2, `impact_analysis` +1, `implementation_plan` +4, `task_breakdown`
+4, `plan_review` +3), and `implementation_plan` (v11, `APPROVED`), `task_breakdown` (v10,
`APPROVED`) and `plan_review` (v9, `APPROVED`, `PASS`) are all now approved. Per this repository's
own artifact-staleness contract, v5 was stale the moment those upstreams advanced. This round re-runs
`TEST_WRITING` against the current chain, read in full (not only the diff), rather than patching v5's
own text in place.

**What changed on the ground since v5, verified directly, not assumed from any document's own
narrative.**

1. **`c17ceee` (`fix(US-3.1): wire repairField into Slugs/SEO repair gates`) landed after v5 was
   written.** v5's own subject — the AC-6/FR-11 `repairField` wiring gap `RECONCILIATION` v1 found —
   is now fixed and committed. Re-run this round: all three of
   `content-orchestrator.repair-field-wiring.spec.ts`'s pre-existing tests (the Slugs positive
   proof, its negative control, and the bundled SEO Finding-5 proof) are **GREEN**, confirmed by
   direct execution (see Evidence, below), not inherited from `pipeline_status` v7's own "full suite
   green" claim.
2. **`T1`–`T12` remain done and committed, all green**, re-confirmed by this round's own full-suite
   run (see Evidence) — unchanged in substance from v5's own account, only the front-matter
   version references move.
3. **`T13`, `T14` and `T15` are new work this round adds tests for.** These three tasks did not
   exist in `task_breakdown` v6 (v5's own upstream) — they were decomposed in `task_breakdown` v7–v10
   from `implementation_plan` v9–v11's `D13`/`D14`/`D15`, closing the two `repair-gate.ts` mechanism
   gaps and the `meta-title-template-shape` unsatisfiable-for-long-`h1` defect a real 2026-09-28
   regeneration diagnosed. **This is the substantive new content of this revision**: nine new tests
   across four files (two extended, one new sibling, one new describe block in an existing file),
   all verified red this round, for the documented reason, before hand-back.

**Compression note, disclosed rather than silently done.** v1 through v5's own revision notes (T7's
recalibration history, the golden-fixture fix, the destructuring-bug fix, the AC-6/FR-11 wiring
design-decision write-up) are this Story's own historical record and remain fully readable in
`docs/tests/US-3.1-test-strategy.md`'s git history (`#5` and earlier). They are summarized rather than
reproduced verbatim here, since none of that history is live work this round redoes — T1–T12 and the
AC-6/FR-11 wiring are done, committed, and unaffected by anything `T13`–`T15` touch (disjoint files,
disjoint rule names, confirmed in `implementation_plan` v11 §2.7 and re-confirmed by this round's own
full-suite run showing zero collateral change). This is a deliberate scope decision for THIS revision,
not a claim that the earlier history no longer matters.

## Approach (unchanged in principle since v1)

Every assertion is written from the acceptance criterion or the functional requirement in
`specification` v19, never from the Implementation Plan's proposed implementation and never copied
from an actual run. The same two named exception classes from v1–v5 still apply (a
characterization/regression pin over already-implemented, unmodified code; a test asserting a check's
own disclosed, accepted residual) — no new exception class is introduced this round.

All fifteen tasks are `track: angular` (`T13`–`T15` included) or `track: prompt` (`T8`, `T10`, both
already shipped, unaffected). This Story adds no `test:components` work at any point in its history,
including this round — re-confirmed directly: `npm run test:components` is 23/23 green, unaffected by
any of this round's four touched/new files (see Evidence).

## Layers, and why each is tested where it is (unchanged since v1)

| Layer | Runner | How |
|---|---|---|
| Pure logic (`repair-strategy.ts`, `repair-gate.ts`, `heading-style.ts`, `slug-validator.ts`, `doc-schema-issues.ts`, `seo-metadata-shape.ts`, `async-retry.ts`) | `test:logic` | plain vitest, real functions, inline fixtures |
| Angular services (`ContentOrchestratorService` — `runDocGate()`, `groundingSpecs()`, `generate()`, `generateSlugs()`, `generateSeoMetadata()`) | `test:logic` | `Injector.create` with `import '@angular/compiler'` first — never TestBed; `LlmService` stubbed at the boundary, everything else real |
| FROZEN prompt builders under §9 authorization (`master-system-prompt.ts`, `task-a.ts`, `task-b.ts`) | `test:logic` | plain vitest; unaffected by this round — `T13`/`T14`/`T15` touch no FROZEN file (Implementation Plan §4.1: "No FROZEN file is touched by `D13`/`D14`/`D15`") |
| Cross-cutting regression | `test:logic` | the full pre-existing suite — re-run this round: 145 of 149 files green, the 4 "failed" files being exactly this round's own new/extended red tests |

No `sleep`, no unseeded randomness, no network, anywhere in this Story's tests, including the nine new
this round.

## T13/T14/T15 test design (new this revision) — `repair-gate.ts`'s two mechanism gaps and `D15`'s long-`h1` normalization

### T13 (FR-10(b), AC-6, plan D13) — `applyTier` dispatches a genuinely missing field, not silently skipping it

`applyTier`'s gate condition (`repair-gate.ts:213-214`, confirmed live this round) reads
`const value = getAtPath(next, issue.path); if (!strategy || typeof value !== 'string') {
advance(issue); continue; }` — a genuinely ABSENT key (`getAtPath` returns `undefined`, Zod's own
"Required") is treated identically to "nothing to repair": the strategy function is never called,
only the ladder cursor advances. T13 is a read-side-only fix: a missing value is dispatched to the
active tier's strategy with `''` substituted, exactly as a present-but-empty string always was.

**`src/utils/repair-gate.spec.ts` (extended), three new tests, real registered `REPAIR_STRATEGIES`
entries spied with `vi.spyOn` (never a hand-rolled fake strategy injected via a mock — this proves
DISPATCH happened, with the genuine `fieldInstruction`/`deterministic` implementations still
running):**
1. A synthetic artifact whose `cta.text` key is genuinely absent (not `''`) reaches `doc-schema`'s
   `fieldInstruction`/`repairField` with `''` as the current value, and the repair lands — proven by
   `fieldInstructionSpy.toHaveBeenCalledWith('', issue)`, `repairField` called once, the field
   written, `repairsUsed === 0`.
2. The same missing-key dispatch for the `deterministic` tier (`slug-charset`'s own
   `deterministic`), proving dispatch happened even though `slugify('')` legitimately returns `null`
   (an empty value can never satisfy `SLUG_PATTERN`) — this test proves DISPATCH only, not that a
   missing slug becomes repairable this way.
3. **`[pin]`** a value that is present but neither a `string` nor `undefined` (a structural anomaly)
   still advances-and-skips, unaffected by this fix — true before AND after T13, a regression guard,
   not red-to-green evidence.

**`src/services/content-orchestrator.doc-gate.spec.ts` (extended)**, one new fixture
(`missingCtaHeadingDoc()` — `cta.heading` genuinely absent, not `emptyRequiredStringDoc()`'s
present-but-empty `cta.text`) and one new test: the real-shaped regression is repaired field-scoped
with zero full regenerations. Confirmed `docSchemaIssues()` converts a Zod "Required" failure at
`['cta','heading']` to `path: 'doc.cta.heading'` regardless of whether the leaf is missing or merely
wrong-typed (`toDocPath` does not distinguish the two), so this fixture genuinely exercises
`getAtPath` returning `undefined` because the key does not exist at all.

### T14 (FR-10, FR-11, AC-6, plan D14) — the main regeneration loop gives a fresh attempt a genuine field-scoped/block-scoped ladder pass, with a cursor local to that attempt

The main loop's only per-attempt action today is a `deterministic`-tier-only cleanup
(`issues.filter(i => i.path && REPAIR_STRATEGIES.get(i.rule)?.deterministic)`). A rule with NO
`deterministic` rung at all (`doc-schema`, `slug-name-designator-lost`, `heading-brand-core-missing`)
is excluded from that filter outright — once such a finding survives the pre-loop ladder, or
surfaces fresh on a later full-regeneration attempt's own output, only ANOTHER full regeneration can
touch it. T14 replaces the narrow cleanup with a full, per-invocation-scoped ladder pass
(`runLadderPass`), run again inside the main loop after every `produce()`/`validate()` — with a
ladder cursor FRESH on each call, not shared across invocations (the subtle part, Implementation
Plan Risk 3).

**`src/utils/repair-gate.spec.ts` (extended), three new tests:**
1. A field-scoped-repairable error (`slug-name-designator-lost`) surfacing FRESH on a
   full-regeneration attempt's own output is repaired within that same attempt, not left unresolved —
   proven via `fieldInstructionSpy`/`repairField` call counts and `finalIssues`.
2. **Two independent-leaf findings on the SAME fresh regeneration attempt** — a genuinely-missing-key
   finding (`doc-schema`, exercising T13's own fix) and an independent-leaf finding
   (`slug-name-designator-lost`) — converge together in that ONE attempt's own ladder pass, proven by
   two distinct `repairField` calls within a single `repairsUsed` increment.
3. **Stale-cursor regression**, built specifically so a "half-fixed" implementation (a main-loop
   ladder pass that shares ONE cursor across the pre-loop pass and every in-loop retry) still fails
   it: a rule's ladder cursor exhausted against the INITIAL attempt's own output must be genuinely
   fresh again against a LATER full-regeneration attempt's own output — `repairField` called twice
   total (once pre-loop, once in-loop), not once.

**`src/services/content-orchestrator.doc-gate.spec.ts` (extended)**, one new test using the same
`missingCtaHeadingDoc()` fixture T13 adds: the real-shaped oscillation `pipeline_status` v8
diagnosed — a fresh full-regeneration whose own field-scoped repair fixes `doc-schema` but, because
the repaired heading text doesn't name the product, appears to introduce `heading-brand-core-missing`
— converges within that SAME attempt's own ladder pass (two `generateText` calls, one full regen),
not across two discarded regenerations.

### T15 (FR-8(b), AC-4, plan D15) — deterministic, word-boundary-safe `h1` truncation for `meta_title` when no verbatim-anchored shape can ever fit

When `h1` is 54+ Unicode code points long, no `h1`-anchored `meta_title` shape can ever satisfy the
FROZEN 55-character ceiling (`h1Len + MIN_DASH_TAIL(2) > 55`). `D15` (Implementation Plan §2.4, this
round's own corrected version — threshold widened from `h1Len ≥ 55` to `h1Len ≥ 54`, validator
redesigned from an independent structural re-derivation to an equality check against the shared
`computeLongH1MetaTitle`) constructs the title deterministically from `h1` itself instead.

**Placement decision, disclosed rather than following the Task Breakdown's literal "(extended)"
instruction.** `normalizeLongH1MetaTitle` does not exist yet on `src/utils/seo-metadata-shape.ts`.
Empirically confirmed this round: a plain, static named import of a not-yet-existing export does
**not** crash `vitest`'s module loader at `test:logic` runtime (it binds `undefined`, producing a
clean assertion mismatch on a first-assertion guard) — but it DOES break `npm run lint` (`tsc
--noEmit`) with `TS2305: has no exported member`, and, more severely, breaks `npm run
test:components`'s full-program Angular build **for the entire suite**, not merely this one file
(confirmed empirically: `ng test` aborted at the bundling stage, naming this exact import). A new
sibling file, `src/utils/seo-metadata-shape.long-h1.spec.ts`, isolates the new coverage from the
existing 24-test green `seo-metadata-shape.spec.ts` file, and accesses the not-yet-existing export
via a runtime property lookup on the module namespace, narrowed to its exact real signature — the
same `as unknown as <narrow interface>` idiom `content-orchestrator.doc-gate.spec.ts`'s own
`asDocGate()` already establishes in this codebase, not a new pattern and not an `any` escape. This
keeps `npm run lint` clean and `npm run test:components` at 23/23 green, both re-confirmed this
round (see Evidence), while the file's `test:logic` red state stays a clean, correctly-reasoned
`TypeError`/assertion failure, not a build-breaking collateral regression.

**`src/utils/seo-metadata-shape.long-h1.spec.ts` (new), thirteen tests:**
- **Boundary arithmetic** (`normalizeLongH1MetaTitle`): no-op at `h1Len = 53` (the reachable check's
  own last satisfiable length); activates at `h1Len = 54` (the exact gap `task_breakdown` v8 found and
  `implementation_plan` v10/v11 closed); compliant word-boundary-safe output at 55, 56, 66;
  determinism (same `h1` → same output, regardless of the model's own attempt).
- **Validator branch, equality-based**: accepts exactly `normalizeLongH1MetaTitle`'s own output for
  an unreachable `h1`, rejects every deviation (missing mark, bare `h1`, an interior deletion, one
  code point over the ≤50 ceiling).
- A fixture whose natural word-boundary cut point is immediately preceded by trailing punctuation
  `cutOnWordBoundary`'s own strip regex removes — closing, via the equality-based redesign, the
  second defect `implementation_plan` v10 found while verifying its own proof (a literal
  `h1[core.length] === ' '` structural check could have wrongly rejected this).
- A fixture with no word boundary at all within the search window — the accepted, narrow hard-clip
  fallback, asserted as a property (`≤50` total, ends in `"·"`), never a pinned literal implementation
  path.
- **`[pin]`** the `MIN_DASH_TAIL` minimum tail, via the UNCHANGED reachable-case behaviour at
  `h1Len = 53` — already true before T15, exercises no new code.
- **`[pin]`** the `MIRRORED_MAX_META_TITLE` characterization, via the existing FROZEN,
  already-exported `validateSeoMetadata` — confirms the private mirror constant has not silently
  drifted from `output-validator.ts`'s own `MAX_META_TITLE = 55`.
- **Closed-form coverage sweep** — the executable counterpart of Implementation Plan §2.4.1's proof:
  for a sampled `h1Len` range (0, 1, 10, 30, 52, 53, 54, 55, 56, 60, 66, 70), the value
  `normalizeLongH1MetaTitle` produces for that `h1` always passes `validateSeoMetadataShape` — no
  `h1Len` is left unsatisfiable.

**Naming/boundary discipline, per Plan Review v9 §4's own explicit instruction to this stage.**
`FR-8(b)`'s prose says the word-boundary search happens "within its first 50 code points of `h1`",
while the live design's `SAFE_CORE_LENGTH` is 49 (`+1` mark `= 50` total). Plan Review v9
independently proved (§4.1, a worked arithmetic argument) that no `h1` exists for which this costs a
genuinely available, `≤50`-total-compliant boundary cut — the imprecision is in the Specification's
own prose, not the code. **Nothing in this round's new tests asserts a literal "50-code-point search
window"**; every assertion is the OUTCOME `FR-8(b)` itself requires (`≤50` total, ends in `"·"`, a
genuine prefix, no available boundary skipped) — avoiding a false `invalid_specification` loop-back
against code that is actually correct.

**`src/services/content-orchestrator.repair-field-wiring.spec.ts` (extended)**, four new tests using
the REAL es-ES (66), pt-PT (60) and uk-UA (69) `h1` strings AND the real, SHIPPED (defective)
`meta_title` values from the 2026-09-28 regeneration (`docs/catalog/US-3.1-pipeline-status.md` v8,
lines 74-76 — recovered from the real record, never invented) — run through `canonicalizeSeoData()`
via `generateSeoMetadata()`, each must produce a genuine, word-boundary-safe prefix of the shipped
`h1`, never the interior-phrase deletion the real artifact actually shipped. `generateJson` uses
`mockResolvedValue` (not `Once`), deliberately: today, `meta-title-template-shape` has no registered
repair strategy, so a defective fixture falls through to full-document regeneration on every attempt;
an ordered, count-limited mock queue would exhaust and mask the real red reason under an unrelated
"unstubbed generateJson call" throw — the exact trap this same file's own pre-existing Slugs test
already documents avoiding, applied here to the new fixtures too.

## Per-task test placement (T1–T12 and the AC-6/FR-11 wiring, unchanged since v5 in substance — front-matter version references only)

| Task | Test file(s) | Status |
|---|---|---|
| T1 (FR-10, AC-6) | `src/utils/repair-strategy.spec.ts`, `src/render/doc-schema-issues.spec.ts`, `src/services/content-orchestrator.doc-gate.spec.ts` | GREEN — committed (`df9ec36`) |
| T2 (FR-1, NFR-2/3) | `src/utils/async-retry.spec.ts` | GREEN — committed (`e48fa1b`) |
| T3 (FR-1, FR-4) | `src/services/content-orchestrator.grounding-retry.spec.ts` | GREEN — committed (`a01bd12`) |
| T4 (FR-2(b)) | `src/utils/repair-gate.spec.ts`, `src/utils/repair-strategy.spec.ts` | GREEN — committed (`4dfccf0`) |
| T5 (FR-2(a)) | `src/services/content-orchestrator.grounding-retry.spec.ts`, `src/services/content-orchestrator.doc-gate.spec.ts` | GREEN — committed (`fb03d68`) |
| T6 (FR-3, FR-5) | `src/app/app.component.export-guard.spec.ts` | GREEN — committed (`fbf4859`) |
| T7 (FR-6, FR-7) | `src/utils/heading-style.spec.ts`, `src/utils/repair-strategy.spec.ts` | GREEN — committed (`ad4c678`) |
| T8 (FR-12) | `src/prompt-core/master-system-prompt.spec.ts`, `src/prompts/task-a.spec.ts` | GREEN — committed (`1c02c89`) |
| T9 (FR-8, FR-9) | `src/utils/seo-metadata-shape.spec.ts`, `src/utils/repair-strategy.spec.ts` | GREEN — committed (`c78e6da`) |
| T10 (FR-13(a)-(d)) | `src/prompts/task-b.spec.ts` | GREEN — committed (`3d89c86`) |
| T11 (FR-11, plan D8) | `src/utils/repair-strategy.spec.ts`, `src/utils/slug-validator.spec.ts` | GREEN — committed (`0c14353`) |
| T12 (FR-13(b)) | `src/utils/repair-strategy.spec.ts` | GREEN — committed (`3e36e4e`) |
| AC-6/FR-11 wiring (`repairField` into the Slugs/SEO gates) | `src/services/content-orchestrator.repair-field-wiring.spec.ts` | **GREEN — committed (`c17ceee`), re-confirmed this round by direct execution (see Evidence)** |
| T13 (FR-10(b), AC-6, plan D13) | `src/utils/repair-gate.spec.ts`, `src/services/content-orchestrator.doc-gate.spec.ts` | **RED — this revision** |
| T14 (FR-10, FR-11, AC-6, plan D14) | `src/utils/repair-gate.spec.ts`, `src/services/content-orchestrator.doc-gate.spec.ts` | **RED — this revision** |
| T15 (FR-8(b), AC-4, plan D15) | `src/utils/seo-metadata-shape.long-h1.spec.ts`, `src/services/content-orchestrator.repair-field-wiring.spec.ts` | **RED — this revision** |

## Characterization pins — named, not disguised as red-to-green proof

Carried unchanged from v1–v5 (T12's `cutOnWordBoundary()`-boundary case; the
`heading-product-name-stuffing` non-regression pin against the corpus's own cyrillized-unit
`specs.heading`), plus three new this round, all explicitly labeled `[pin]` in their own test names
and excluded from `ac_test_matrix`'s red-to-green evidence:
1. T13's "present-but-wrong-type still advances-and-skips" regression case.
2. T15's `MIN_DASH_TAIL` check at `h1Len = 53`, via the unchanged reachable-case behaviour.
3. T15's `MIRRORED_MAX_META_TITLE` ceiling-drift characterization (55 passes / 56 fails), via the
   existing FROZEN `validateSeoMetadata`.

## Deliberately not unit-tested (with why)

Carried unchanged from v1–v5 for T1–T12 (T6's export guard is structural, not a live-browser proof;
T5's other two emission sites proven structurally; the widened `[CONTEXT]` excerpt tested only
against synthetic fixtures; no `site_name` smoke case; live-model behaviour not verifiable
statically; `productShort()`/`invariantCore()`'s over-capture heuristic inherited, not fixed; the
punctuation-free CTA/sentence-framing component of `doc.localizedName`'s shape requirement; the
interior-relocated-punctuation worked example). **New this round:**
- **T15's pathological no-word-boundary-or-all-punctuation-stripped fallback is exercised as a
  property (`≤50` total, ends in `"·"`), never a pinned literal internal path** — which of
  `truncateAtWordBoundary`/`cutOnWordBoundary`'s internal branches a given fixture takes is an
  implementation detail the equality-based validator design deliberately no longer depends on
  (Implementation Plan §2.6 Residual 1, downgraded this round from a possible validation-failure
  risk to a purely cosmetic one).
- **The de-DE 52-53 residual band (`OD-10`, `FR-13(b)`/`D11`/`T10`'s own accepted cost) is
  deliberately NOT asserted as normalized by `T15`** — `isH1Unreachable` is false by construction
  for those two lengths (`< 54`), and no test in this round's new coverage claims otherwise. This is
  a Specification-level accepted residual, not a T15 gap.
- **`FR-8(b)`'s "no visibility into whether h1 itself is correct" residual** (`impact_analysis` v5's
  own Unknown #11, carried into `task_breakdown` v10's `T15` Notes) is not tested as a defect — it is
  scope-correct behaviour this Story does not touch.

## Fixtures

No new SHARED/named fixture file was added this round. Every new assertion uses an inline fixture
local to its own test, except the real es-ES/pt-PT/uk-UA `h1`/shipped-`meta_title` values (T15's
`content-orchestrator.repair-field-wiring.spec.ts` tests), which are recovered verbatim from
`docs/catalog/US-3.1-pipeline-status.md` v8 (lines 74-76) — the real, already-recorded 2026-09-28
regeneration data, never invented.

## Runner boundaries

No spec touched or added this round is named `*.component.spec.ts`. The one Angular-service-level
spec touched (`content-orchestrator.doc-gate.spec.ts`) already opens with `import '@angular/compiler'`
before any Angular import and uses `Injector.create`, unchanged — this round's own new tests reuse
that same established harness (`bootOrchestrator()`/`asDocGate()`), adding no new DI pattern.

## What each AC is proven by

See `docs/tests/US-3.1-ac-test-matrix.md` for the full mapping. As of v6: **AC-1 through AC-5 are
green** (AC-4/AC-5's T9/T10/T12 rows unaffected by this round; T15 ADDS new AC-4 coverage for the
`h1Len ≥ 54` regime, currently RED). **AC-6 is green for `doc-schema` (T1), `slug-name-designator-lost`
(T11), and the `repairField` production wiring (`c17ceee`)** — T13/T14 add NEW AC-6 coverage for the
two `repair-gate.ts` mechanism gaps a real regeneration diagnosed, currently RED.

## Verification checklist (skill)

- [x] No spec is named `*.component.spec.ts`.
- [x] The one Angular-service-level spec touched uses `Injector.create`, with `import
      '@angular/compiler'` first — unchanged, reused.
- [x] Every `AC-n` (AC-1..AC-6) appears in the matrix with a real test file and test name.
- [x] Every assertion was written from the criterion (`FR-8(b)`, `FR-10`, `FR-11`) or the plan's
      design (`D13`/`D14`/`D15`), never from an actual run.
- [x] No test's only assertion is `toBeTruthy()`.
- [x] No assertion is copied from actual output — the real es-ES/pt-PT/uk-UA fixtures use the
      already-recorded `pipeline_status` v8 data as INPUT (what the model produced), never as an
      expected value; every expected value is computed at test time from
      `normalizeLongH1MetaTitle`'s own real output or asserted as a property.
- [x] Existing corpus fixtures reused where they fit; the real `h1`/shipped-`meta_title` values are
      reused from `pipeline_status` v8, not re-invented; no new corpus fixture added.
- [x] No `sleep`, no unseeded randomness, no network.
- [x] Every new test was actually run; failing output recorded in the generation report.
- [x] Every new failure traced for the right reason — a clean assertion mismatch or a documented
      `TypeError: X is not a function` (the function genuinely does not exist yet), never a masked
      "unstubbed call" crash or a broken `npm run lint`/`npm run test:components` collateral (both
      re-confirmed clean/green this round after the T15 import-placement fix).
- [x] Pre-existing tests still pass — 145 of 149 `test:logic` files green (the 4 "failed" files are
      exactly this round's own new/extended red tests); `test:components` 23/23 green, unaffected.

## Evidence (commands run this round; verbatim output in `test_generation_report`)

- `npx vitest run src/utils/repair-gate.spec.ts src/services/content-orchestrator.doc-gate.spec.ts
  src/utils/seo-metadata-shape.long-h1.spec.ts src/services/content-orchestrator.repair-field-wiring.spec.ts
  --reporter=verbose` — isolated run of the four touched/new files.
- `npm run test:logic` — full suite, 149 files.
- `npm run test:components` — full suite, 2 files / 23 tests.
- `npm run lint` (`tsc --noEmit`).
- `bash arch-guard.sh`.
- `git status --short src/ test/ docs/tests/` and `git diff --stat` against every non-spec `src/`
  file, confirmed empty.
