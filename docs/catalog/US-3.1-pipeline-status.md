---
artifact: pipeline_status
story: US-3.1
version: 9
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-09-27T10:00:00Z
updated_at: 2026-09-29T14:45:00Z
supersedes: docs/catalog/US-3.1-pipeline-status.md#8
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 19
  - key: open_decisions
    version: 4
  - key: impact_analysis
    version: 5
  - key: implementation_plan
    version: 11
  - key: task_breakdown
    version: 10
  - key: plan_review
    version: 9
  - key: test_strategy
    version: 6
  - key: ac_test_matrix
    version: 6
open_decisions_blocking: false
---

# Pipeline Status — US-3.1 (v9, T13/T14/T15 implemented)

**Verdict this round: `PASS`.** `T13`, `T14` and `T15` — the last three tasks `task_breakdown` v10
names — are implemented, committed, and independently re-verified green this round. `T1`–`T12` and
the AC-6/FR-11 `repairField` wiring (`c17ceee`) were already implemented and committed before this
round started (confirmed via `git log`, unchanged by this round). This closes both defects
`pipeline_status` v8 diagnosed against the real 2026-09-28 regeneration: the `repair-gate.ts`
mechanism gaps behind the `doc-schema`/`heading-brand-core-missing` oscillation (`T13`/`T14`, `D13`/
`D14`), and `meta-title-template-shape`'s architectural unsatisfiability for a long `h1`
(`T15`, `D15`).

Branch: `feat/US-3.1-qa-gate-brand-core-fixes`. Two commits this round (see §4).

---

## 1. What was built

### 1.1 T13 (FR-10(b), AC-6, plan D13) — `applyTier`'s gate condition now dispatches a genuinely missing field

**File:** `src/utils/repair-gate.ts`, `applyTier` (inside the new `runLadderPass`, see T14 below).

`getAtPath(next, issue.path)` returning `undefined` — a genuinely absent key, Zod's own
`"Required"` — is no longer treated identically to "nothing to repair." A `missing` branch
dispatches the active tier's strategy (`deterministic`/`fieldInstruction`) with `''` substituted
for the missing value, exactly like a present-but-empty string always was. A value that is present
but neither a `string` nor `undefined` (a structural anomaly no strategy in this codebase
addresses) still advances-and-skips exactly as before this task.

**One narrowing beyond the Plan's own literal pseudocode, found while making the fixture-level
tests pass, not invented speculatively.** `getAtPath` also returns `undefined` for a `"block[i]"`
path evaluated against a raw-string artifact (`T = string`, the HTML shape) — not because a real
JSON leaf is missing, but because a string has no such property to begin with; `"block[i]"` is
`block-repair.ts`'s own addressing grammar, consulted only by the block-scoped rung, never by
`getAtPath`/`setAtPath`. Dispatching field-scoped repair for that case is wrong and regressed an
**existing, already-passing** test — `repair-gate.spec.ts`'s `heading-product-name-stuffing — one
ladder serving two artifact shapes` describe block, `'resolves an HTML "block[i]" path via the
block-scoped rung — field-scoped harmlessly no-ops first'` — which explicitly asserts `repairField`
is never called for that shape. `missing` is therefore scoped to `typeof next !== 'string'`, so
T13's dispatch fires only for a genuinely absent leaf on a JSON-shaped artifact (`doc-schema`,
`slug-name-designator-lost`, etc.), never for a block-only path on an HTML string. AGENTS.md §7.7
forbids weakening that test to go green, so the code was narrowed to keep it green instead.

### 1.2 T14 (FR-10, FR-11, AC-6, plan D14) — the main regeneration loop gives every fresh attempt its own full ladder pass

**File:** `src/utils/repair-gate.ts`.

The pre-loop "Tiered ladder" block is extracted into a reusable async closure,
`runLadderPass(startArtifact, startIssues) → { artifact, issues }`, with its own `ladderCursor`/
`cursorMoves` state constructed **fresh on every call** — never shared across invocations. Two call
sites: once before the main loop (unchanged behaviour), and again inside the main `while` loop,
immediately after each `produce()`/`validate()` call, **replacing** the old `deterministic`-only
`cleanupPlan` block. A fresh full-regeneration attempt now gets a genuine field-scoped/block-scoped
shot at its own newly-surfaced findings — not only the tier-0 terminator a rule with no
`deterministic` rung (`doc-schema`, `slug-name-designator-lost`, `heading-brand-core-missing`)
could never reach there before. Does not increment `repairsUsed` or spend its own budget.

**A second, independently-found defect, closed in the same pass, because making `T14`'s own real-
shaped acceptance test pass exposed it.** `cursorKey` was keyed by `path` alone
(`i.path ?? issueKey(i)`). That is correct when exactly one rule ever visits a given path, which
was true before `T13` (a missing key was always silently skipped, so a second rule could never fire
on the same path within one pass). Once `T13` makes a missing key genuinely repairable, the real
oscillation `T14` exists to close can put **two different rules** on the identical leaf within one
`runLadderPass` invocation: `content-orchestrator.doc-gate.spec.ts`'s own `T14` fixture
(`missingCtaHeadingDoc()`) has `doc-schema` fire first (the key is absent), its field-scoped repair
write some text, and — when that text does not carry the product name —
`heading-brand-core-missing` fire fresh on the **same** `doc.cta.heading` path the next
`validate()` call. A path-only cursor handed `heading-brand-core-missing` `doc-schema`'s
already-advanced cursor position, skipping its own field-scoped rung and landing directly on its
block-scoped rung — which is dead code for a `"doc."`-prefixed path (the dormant `getDocBlock`
prefix defect, Implementation Plan §3.1, deliberately left unfixed), so the finding never actually
resolved. `cursorKey` now keys by `path::rule` (falling back to `issueKey` when there is no path),
giving each rule its own independent cursor even when two rules coincide on one leaf, while
preserving the original design's own stated per-path-per-rule property for the ordinary,
one-rule-per-path case. Verified this does not regress the "two issues, same rule, same context,
different paths" test (`repair-gate.spec.ts`, `'gives two issues in the SAME context but different
paths independent ladders'`) — that case's two paths still key distinctly.

**One TypeScript-only correction, found by `npm run lint`, not by a test.** `let artifact = await
opts.produce(...)` was left without an explicit type; TypeScript infers `Awaited<T>` for an
unconstrained generic `T` awaited from a bare `Promise<T>`, and `runLadderPass`'s own explicit
return type (`Promise<{ artifact: T; ... }>`) resolves to real `T` once awaited — not structurally
identical to `Awaited<T>` for TypeScript's purposes. `artifact` is now declared `let artifact: T =
...`, pinning every reassignment (from `runLadderPass`, `opts.produce`) to a single, consistent
type. No behavioural change; `tsc --noEmit` is clean.

### 1.3 T15 (FR-8(b), AC-4, plan D15) — deterministic, word-boundary-safe `h1` truncation for an unreachable `meta_title`

**Files:** `src/utils/seo-metadata-shape.ts`, `src/services/content-orchestrator.service.ts`.

Two new module-private functions in `seo-metadata-shape.ts` — `isH1Unreachable(h1)` (single source
of truth for `Array.from(h1).length + MIN_DASH_TAIL > MIRRORED_MAX_META_TITLE`, i.e. `h1Len ≥ 54`)
and `computeLongH1MetaTitle(h1)` (a genuine, word-boundary-safe prefix of `h1`, via the already-
exported `truncateAtWordBoundary()` from `repair-strategy.ts` at `SAFE_CORE_LENGTH = 49`, plus one
appended `"·"` mark) — back a new **exported** `normalizeLongH1MetaTitle(h1, currentMetaTitle)`: a
no-op below the threshold, else the deterministic fallback regardless of what the model produced.
Called from `content-orchestrator.service.ts`'s `canonicalizeSeoData()`, the single choke point
already re-run at every SEO-producing code path (initial `produce()` and after any field-scoped
repair), so the normalization applies before `validateSeoMetadataShape` ever sees the artifact.
`validateSeoMetadataShape`'s `meta-title-template-shape` check now branches on `isH1Unreachable(h1)`:
the existing dash-tail rule is unchanged for `h1Len ≤ 53`; for `h1Len ≥ 54` it requires byte
equality against `computeLongH1MetaTitle(h1)` — the same shared computation the normalizer calls —
rather than an independent structural re-derivation, so the two can never drift apart. No edit to
`src/prompts/task-b.ts` or any other FROZEN file (Implementation Plan §2.5) — implemented exactly
as designed, with no deviation found necessary.

---

## 2. Gate evidence (commands actually run this round)

| Command | Result |
|---|---|
| `npx vitest run` (full `test:logic`) | **3912 passed, 3 skipped** (live-probe tests, pre-existing, unrelated), 149 files |
| `npm run test:components` (`ng test --watch=false`) | **23 passed**, 2 files |
| `npm run lint` (`tsc --noEmit`) | clean (after the `T14` type-annotation fix, §1.2) |
| `npm run build` (`ng build`) | succeeds; pre-existing CommonJS bundler warnings only (`file-saver`, `js-beautify`, `jszip`), unrelated to this round |
| `bash arch-guard.sh` | **all checks passed**; frozen files unchanged |

Targeted re-run of the four files carrying this round's 25 tests
(`src/utils/repair-gate.spec.ts`, `src/services/content-orchestrator.doc-gate.spec.ts`,
`src/utils/seo-metadata-shape.long-h1.spec.ts`,
`src/services/content-orchestrator.repair-field-wiring.spec.ts`) plus the two adjacent files whose
existing coverage this round's code changes could plausibly touch
(`src/utils/seo-metadata-shape.spec.ts`, `src/utils/repair-strategy.spec.ts`): **200/200 passed**,
including the 21 tests that started red and the 4 pin/fixture-premise tests that were already green.

No test file, fixture, or coverage setting was modified. No FROZEN file was touched.

## 3. What was NOT touched, and why

- `src/prompts/task-a.ts`, `task-b.ts`, `task-c.ts`, `src/prompt-core/master-system-prompt.ts`,
  `src/utils/output-validator.ts` — FROZEN, no task this round names them, `arch-guard.sh` confirms
  unchanged.
- The dormant `getDocBlock` `"doc."`-prefix mismatch (Implementation Plan §3.1/§3.5) — explicitly
  out of `T13`/`T14`'s scope; `T13`+`T14` together make `heading-brand-core-missing` resolvable at
  its own **field-scoped** rung before the block-scoped rung (where that dormant bug lives) is ever
  reached for the fixtures this Story's tests exercise. Left unfixed by design, as the Plan states.
- The `"шт."` `SENTENCE_TERMINAL` false-positive question (Implementation Plan §3.2) — a
  `heading-style.ts`/`FR-7` question, not this round's to fix.
- `docs/specifications/US-3.1-spec.md`'s `AC-4`/`FR-8` prose — already resolved by `specification`
  v18/v19 (`FR-8(b)`), independently confirmed current this round.

## 4. Commits this round

1. `feat(US-3.1 T13/T14): repair-gate ladder retries missing fields and fresh regen attempts
   (FR-10/FR-11, plan D13/D14)` — `src/utils/repair-gate.ts`.
2. `feat(US-3.1 T15): deterministic long-h1 meta_title fallback (FR-8(b)/AC-4, plan D15)` —
   `src/utils/seo-metadata-shape.ts`, `src/services/content-orchestrator.service.ts`.

(Exact hashes recorded by `git log` on `feat/US-3.1-qa-gate-brand-core-fixes` once both land.)

## 5. Non-blocking findings, carried forward, not this round's to act on

- Implementation Plan §2.6 Residual 2 (wasted first-pass model generation for `h1 ≥ 54` entries) —
  unchanged, accepted, not requested here.
- `impact_analysis` v5 Unknown #11 (T15's normalization corrects `meta_title`'s shape but has no
  visibility into whether `h1` itself is correct) — unchanged, scope-correct behaviour per that
  artifact's own framing, not a defect.
- `FR-13(b)`/`D11`'s own de-DE 52–53 `h1`-core-length residual (`OD-10`) — unaffected by `D15`,
  outside this Story's closed scope, per Implementation Plan §2.7.
