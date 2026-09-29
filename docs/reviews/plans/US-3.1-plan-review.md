---
artifact: plan_review
story: US-3.1
version: 10
status: ARCHIVED
owner: so-plan-reviewer
created_at: 2026-09-30T16:00:00Z
updated_at: 2026-09-30T16:00:00Z
supersedes: docs/reviews/plans/US-3.1-plan-review.md#9
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
open_decisions_blocking: false
---

# Plan Review: US-3.1 — Make the repair gate actually block ungrounded content and stop the brand-core/heading-form rule conflict

**Verdict:** PASS
**Loop-back:** n/a

> `PASS` here is **not** human approval. Only `/so:approve` records that (AGENTS.md §10).

## Process note

v9 reviewed `specification` v19 / `impact_analysis` v5 / `implementation_plan` v11 / `task_breakdown` v10 and is
stale against all four current inputs (v20 / v6 / v13 / v11). This round re-derived coverage, FROZEN-file and
architecture checks against the live documents and live source (`repair-gate.ts` `applyTier`,
`repair-strategy.ts` `cutOnWordBoundary`, `description-doc.schema.ts`, `seo-metadata-shape.ts`); it did not read
v9's conclusions forward. `D1`-`D15` / `T1`-`T15` are unchanged in substance since v9 (all `T1`-`T15` committed);
their v9 verdicts stand and were spot-checked, not re-litigated. The new material is `D16`/`D17`/`D18` and
`T16`/`T17`/`T18`.

## Summary

The plan and breakdown are buildable as written. Every FR/AC, including the new `FR-14`/`AC-7`, reaches a task; no
task touches a FROZEN file; no architecture rule is implicated. `D16`, `D17`, `D18` are each a single-file,
non-FROZEN change with named tests and a stated non-regression set. No blocking finding. Two design-level
observations (`D17`'s separator class, `D18`'s missing-key position) are recorded as non-blocking.

## 1. Specification coverage (re-derived, both directions)

Forward (re-derived from the Specification's FR list, not from the plan's table):

| FR / AC | Reached by task(s) | Verdict |
|---|---|---|
| FR-1 | T2, T3 | covered |
| FR-2(a)/(b) | T5 / T4 | covered |
| FR-3, FR-5 | T6 | covered |
| FR-4 | T3 | covered |
| FR-6, FR-7 | T7 (T8 for FR-12 prompt side) | covered |
| FR-8 | T9, T15, T17 | covered |
| FR-9 | T9 | covered |
| FR-10 | T1, T13, T14, T16 | covered |
| FR-11 | T11, T14, T16 | covered |
| FR-12 | T8 | covered |
| FR-13(a)-(d) | T10, T12 | covered |
| **FR-14 (a)/(b)** | **T18** | covered |
| AC-1..AC-6 | as in breakdown Coverage table | covered |
| **AC-7** | **T18** (schema-level `'4.0'` pass + `'3.0'` negatives) | covered, reachable |

AC-7 / FR-14 reachability: `FR-14(a)` is reached through `T18`'s lenient field plus `superRefine`
(`description-doc.schema.ts`), asserted by `'4.0'` empty/absent/`null` parse cases; `FR-14(b)` (the silent-regression
direction) is reached by the `'3.0'` empty/absent/`null` negatives asserting path `cta.heading` and
`docSchemaIssues()` -> `doc.cta.heading`; `cta.text` negative present. The `FR-14` scope clause ("no file outside
`description-doc.schema.ts`") is honoured: one production file. Confirmed live that `cta: z.object({ heading:
NonEmpty, text: Prose })` is at line 216 and two root `.superRefine` blocks exist (237, 285), so the plan's
"between figure-ref and v4 refinement" placement is real and the `omittable`/`.nullish().transform` idiom it reuses
exists (line 175).

Reverse (task -> plan item -> FR):

| Task | Traces to | Verdict |
|---|---|---|
| T16 | plan §4a `D16` -> FR-10, FR-11, AC-6 | ok |
| T17 | plan §4b `D17` -> FR-8(b), AC-4 | ok |
| T18 | plan §4c `D18` -> FR-14, AC-7 | ok |
| T1-T15 | unchanged from v9 | ok |

Scope creep check against Specification *Out of scope*: `D16` does not touch `repairFieldPayload()` (plan §4a.3,
rejected alternative 13) so it does not reopen any excluded "context-in-repair-payload" item; `D18` relaxes only
non-emptiness (`TAG_LIKE` retained) and does not touch `cta.text` or `FR-7`'s check, matching the FR-14 scope
paragraph and the Out-of-scope bullet added at v20. `T17`'s change is inside `FR-8(b)`'s already-approved `D15`
mechanism. No creep.

## 2. FROZEN files (AGENTS.md §9)

| Task | Frozen file touched | §9 stop present? | Sibling-file pattern used? | Verdict |
|---|---|---|---|---|
| T16 | none (`src/utils/repair-gate.ts`) | n/a | n/a | ok |
| T17 | none (`src/utils/repair-strategy.ts`) | n/a | n/a | ok |
| T18 | none (`src/domain/description-doc.schema.ts`) | n/a | n/a | ok |
| T1-T15 | `T8`, `T10` edited FROZEN prompt files under recorded authorization, already committed with same-commit `.arch-guard-checksums` rebaseline | consumed | n/a | ok (unchanged) |

Checked against the §9 FROZEN list (`task-a/b/c.ts`, `master-system-prompt.ts`, `output-validator.ts`): none of
`T16`-`T18`'s Files rows names any of them; the plan §4.1 states this explicitly and the breakdown carries "no §9
stop" correctly. `D15`'s `MIRRORED_MAX_META_TITLE` continues to mirror, not edit, `output-validator.ts`.
Plan assumes approval it does not have: **no**.

## 3. Architecture rules (AGENTS.md §3)

| Rule | Checked | Finding |
|---|---|---|
| 1 — no direct SDK outside `server/providers/` | yes | No SDK use; `D16`'s retry goes through the existing injected `opts.repairField` callback. Clear. |
| **2 — retrieval separate from generation** | yes, deliberately | `D16` adds a second call to `repairField` (generation-side) only; no retrieval is introduced or folded into generation. `D17`/`D18` are pure functions/schema. Clear. |
| 3 — prompt text out of services | yes | `D16`'s corrective retry suffix (a short "your previous answer was rejected" string) lives in `src/utils/repair-gate.ts`, not in a service or `src/prompts/`. `repair-strategy.ts` already holds `fieldInstruction` text in `src/utils/`, so this follows the repository's existing repair-instruction precedent; arch-guard Rule 3 scans services, not utils. See non-blocking finding 3. |
| 4 — no key in the bundle | yes | Nothing touches keys or env. Clear. |
| 5 — no existing feature breaks | yes | `D16` no-false-positive test (existing mocks' call counts unchanged), `D17` non-regression set, `D18` ~20-spec regression set + render-conformance byte-identity. Clear as designed. |
| `STORE_REGISTRY` sole source of locales/currency | yes | No locale or currency list added by `D16`-`D18`. Clear. |
| `systemBlocks` not collapsed into `userContent` | yes | `D16` explicitly leaves `repairFieldPayload()` (`systemBlocks` by reference) untouched. Clear. |

## 4. prompt -> schema -> renderer -> validator

- Links touched: schema (`D18`); repair-loop output handling (`D16`); a deterministic string helper feeding
  `meta_title` normalization/validation (`D17`). No prompt, no renderer change.
- Stay in agreement: yes. `D18` moves the one link out of agreement (schema demanding a value the prompt
  `task-a-doc.ts:148-150` disowns and the renderer `render-description.ts:443-449` discards for `'4.0'`); `'3.0'`
  still reads the heading verbatim and still requires it. `D17` flows through the shared `truncateAtWordBoundary`,
  and `D15`'s validator compares against the same shared `computeLongH1MetaTitle`, so normalizer and validator
  cannot drift.
- Contract-before-consumer ordering holds: yes. `T16`/`T17`/`T18` are mutually independent (disjoint production
  files); `T16` after `T13` (committed); `T17`'s dependents `T12`/`T15` are committed and serve as its
  non-regression set.
- §4 criteria: the renderer is unchanged, so the §4 HTML criteria are not re-exposed; plan §4c.4 states this and the
  `render-conformance` byte-identity check is in `T18`'s acceptance. List complete for what changes.

## 5. Task quality

| Check | Result |
|---|---|
| All required fields present on every task | yes — Track, Depends on, FROZEN, Status, What changes, Files, Tests, Acceptance check, Notes on `T16`-`T18` |
| Acceptance checks observable | yes — call counts asserted (`T16`), named boundary/pt-PT fixtures plus unmodified pins (`T17`), named parse/fail assertions at `cta.heading` plus byte-identical render (`T18`) |
| Each task could end in one green commit (§13) | yes — one production file each; `T18`'s regression run is a run, not an edit |
| No task spans two tracks | yes — all `angular` (`src/utils`, `src/domain`) |
| Ordered by dependency and risk, riskiest first | yes — Risk-first note puts `T16` (widest collateral surface, highest severity) first, with rationale |
| Fixture updates sit with the change that moves them | yes — `T18` names impact hazard 4 (repair-call-count specs with an empty `'4.0'` heading) and requires reporting rather than silent edits |

## 6. Test strategy

| Check | Result |
|---|---|
| Every task names test files **and** runner | yes — all `test:logic` |
| Component specs named `*.component.spec.ts` | n/a — no component-runner work (`T16`-`T18` are `src/utils`/`src/domain`) |
| Untested tasks justify changing no behaviour | n/a — all three have tests |
| Failure paths from the FRs are covered | yes — `T16`: JSON-object and JSON-array shapes, double-JSON exhaustion, no-false-positive, real Slugs incident; `T18`: `'3.0'` empty/absent/`null` negatives (the FR-14(b) failure path), `'4.0'` tag-like negative, `cta.text` negative |
| Nothing relies on weakening/skipping a test (§7.7) | yes — `T17` states `T12`'s pin and the `truncateAtWordBoundary` block are NOT modified and a red result is a loop-back finding; `T18` states the same for the regression set |

The breakdown's test-state note is correct: `TEST_WRITING` has not yet written the `T16`-`T18` tests, which is the
normal state before `HUMAN_PLAN_APPROVAL` -> `TEST_WRITING`; it is not a plan defect. `src/utils/repair-gate.spec.ts`,
`content-orchestrator.doc-gate.spec.ts` and `content-orchestrator.repair-field-wiring.spec.ts` show as modified in the
working tree, which is `T13`-`T15` test work (uncommitted), not `T16`-`T18`.

## 7. Impact-analysis fidelity

- Plan consumed the survey rather than re-deriving it: yes. `D18` adopts `impact_analysis` v6's consumer table
  (`heading-style.ts:479`, `tov-second-person.ts:224`, `doc-prose-transforms.ts:134`), hazards 3/4, silent-failure
  risk 2, and closes Unknown #12 (missing key) and cites Unknown #13 (the ~20-spec regression set).
- Files touched but not surveyed: none. `T16` `repair-gate.ts`, `T17` `repair-strategy.ts`, `T18`
  `description-doc.schema.ts` are all surveyed files.

## Verdict rationale

PASS. Nothing blocks `TEST_WRITING`. The `'4.0'`-missing-key question (Owner-flagged) is not blocking and does not
warrant `changes_required_specification`: `FR-14(a)` says "may be empty (or otherwise absent of enforced content)";
`AC-7` says the schema "does not require a `'4.0'` Doc's `cta.heading` to be non-empty" — a missing key is a
fortiori not required, so the plan's superset reading (empty AND missing pass, `'3.0'` still fails at the same path)
satisfies both readings and no test can be forced to contradict the Specification, since the Failure path names
only "empty". The only reading it would violate ("missing must still fail for `'4.0'`") is stated nowhere. It is
recorded as a specification wording gap (finding 1) with a one-line fix that the plan itself already recommends and
that is reversible by a one-token change. The `FR-14` scope sentence calls the relaxation "exactly one presence
constraint"; a missing-key pass is arguably a second (presence vs non-emptiness) — that ambiguity is the same gap.

## Non-blocking findings

1. **Spec gap (wording), `FR-14(a)`/`AC-7`: empty vs missing for `'4.0'` is unstated.** Plan §4c.3 chooses "both
   pass", `T18` pins both, and forbids pinning a `'4.0'` missing-key rejection. Recommend a one-line Specification
   clarification at the next Specification touch; not a precondition. `so-reconciliation-reviewer` should judge
   `AC-7` against the `''` reading plus "no `'4.0'` rejection for absent key" and treat the absent/`null` pins as
   plan-chosen, not Specification-mandated. Side effect to note: for `'3.0'` a missing key changes from Zod's
   "Required" (aborting `invalid_type`) to `NonEmpty`'s min-length message (non-aborting custom issue). Path
   `doc.cta.heading` is unchanged, and `T13`'s `'3.0'` missing-key fixture is in `T18`'s regression set, so this is
   covered, but the message text differs from "identical Zod message" for the missing-key sub-case specifically;
   `so-test-writer` should assert on path, not message text, for that sub-case.
2. **`D17` separator class is broader than word boundary.** `/^[\s\-–—|,:;.]/` on `chars[limit]` treats an interior
   `-`, `.` or `,` (hyphenated compound `Anti-static`, decimal `3.5`, `1,5`) as "clip already lands on a word
   boundary", so a clip ending just before such a character now returns a half-token (`...Anti`, `...3`) where the
   old logic backed up to the previous space. Bounded (mid-token fallback is already a disclosed `FR-8(b)`
   characteristic; two production callers; validator and normalizer share the function so no drift) and the plan's
   Rejected alternative 15 deliberately keeps the class aligned with the trailing-strip regex. Suggest `so-test-writer`
   add one hyphen/decimal fixture so the behaviour is a conscious pin, and that `so-planner` reconsider
   whitespace-only for `chars[limit]` at the next plan touch. Also: `D17`'s claim that `T12`'s pin is unaffected
   (`chars[55]` is `'·'`, not in the class) checks out by hand against the code; it remains to be confirmed by the run
   `T17`'s acceptance check requires.
3. **`D16` guard false-positive exposure.** A legitimate repaired value beginning with `{` or `[` would be retried
   once and then discarded. The plan names this assumption (Risk 14) and none of the three registered strategies
   produces such a value; no opt-out is designed. Acceptable. The corrective retry suffix is prompt-like text living in
   `repair-gate.ts` (`src/utils`); consistent with `repair-strategy.ts` precedent and not caught by arch-guard Rule 3,
   but `so-implementation-verifier` should confirm it stays a short repair suffix and not system-level prompt text.
4. **Stale prose in the breakdown.** The v11 body still says "This is **15** ordered ... tasks decomposing
   Implementation Plan v10", the closing sentence of the Coverage table says "after all 15 tasks land", and
   `T13`-`T15` Status rows read "new this revision"; the v11 preamble clarifies them as historical. Cosmetic;
   fold into the next breakdown touch.
5. **Working-tree note.** `T13`-`T15` spec changes are uncommitted in the working tree while the breakdown marks
   those tasks committed (`a16ddbd`, `4a7f806`). Not a plan defect; flagged for the orchestrator so committed-state
   claims are not relied on without `git status`.

> `PASS` above is not human approval. Only `/so:approve` at `HUMAN_PLAN_APPROVAL` records that.
