---
artifact: plan_review
story: US-4.1
version: 3
status: ARCHIVED
owner: so-plan-reviewer
created_at: 2026-10-01T00:00:00Z
updated_at: 2026-10-01T00:00:00Z
supersedes: docs/reviews/plans/US-4.1-plan-review.md#2
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 3
  - key: impact_analysis
    version: 2
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 3
open_decisions_blocking: false
---

# Plan Review: US-4.1 — Add Claude Sonnet 5.5 and Gemini 3.8 Flash, make them the defaults, retire Sonnet 4.6

**Verdict:** PASS
**Loop-back:** n/a

> `PASS` here is **not** human approval. Only `/so:approve` records that (AGENTS.md §10).

## Summary

Re-review for specification v3 (OQ-2: `max` removed from the `claude-sonnet-5-5` levels). Plan v2 and
task_breakdown v3 are a sound delta on the nine built commits: every v3 FR/AC is reachable, order is
T11 -> T12 -> T13 -> T10, no FROZEN file is touched, and nothing exceeds the Specification. The one
defect found is metadata, not content: task_breakdown v3 lists `plan_review` v1 in `inputs_consumed`
(see non-blocking finding 1). The plan is buildable as written.

## Supersession and input currency

- Inputs read: specification v3 (APPROVED), impact_analysis v2, implementation_plan v2, task_breakdown v3
  (DRAFT), story v1. Each is the current version; none is SUPERSEDED. plan_review v2 is superseded by this
  document.
- task_breakdown v3 `inputs_consumed` includes `plan_review` v1. Assessment: this is a real, if minor,
  breach of the staleness contract. v1 is SUPERSEDED (v2 existed, APPROVED, before v3 was written), and
  `plan_review` is not a declared input of `IMPLEMENTATION_PLANNING` (stage-map inputs: story,
  specification, impact_analysis, implementation_plan); it is the output of the stage that reviews the
  breakdown. The content of the breakdown does not depend on it (all substantive inputs cited are current:
  spec 3, plan 2, impact 2), so I do not treat it as blocking; the entry should be dropped or corrected the
  next time the owner touches the file, because `HUMAN_PLAN_APPROVAL` will mark this file APPROVED with a
  stale input recorded.

## 1. Specification coverage (re-derived, both directions)

Re-derived from spec v3 text and the task bodies, not from the coverage tables.

| FR | Reached by task(s) | Verdict |
|---|---|---|
| FR-1 (five levels, no `max`) | T4 built; T11 (JSON edit + catalog spec) | covered |
| FR-2, FR-3 | T4 built (unchanged by v3) | covered |
| FR-4 (vocabulary, clamp outcomes: `disabled`->`between_tools`, `max`->`xhigh`, `minimal`->`low`) | T1, T3 built (ordering keeps `max`); T4; T11 (outcomes pinned in catalog spec) | covered |
| FR-4a (client/server parity) | T1, T3; T11 parity invariant over every model x probe | covered |
| FR-5 | T4 (position), T8 (`DEFAULTS`) built | covered |
| FR-6, FR-7, FR-8 | T7 built | covered |
| FR-9 (stored `max` -> `xhigh`) | T8 built; T11 (service spec) ; T13 (comment) | covered |
| FR-10 | T6 built; T12 (independent of clamp, `FALLBACK_DEEP`/bypass cases) | covered |
| FR-10a | T6 built (`Math.min(1000, max)` branch still on `thinkingOff`; verified in `anthropic.js` line 157) | covered |
| FR-11 (never effort `max`) | T12 (`#effort`) | covered |
| FR-12 (five-level guard) | T6 built; T12 (`SONNET_55_LEVELS` drops `max`) | covered |
| FR-13, FR-14, FR-15 | T5 built | covered |
| FR-16 | T9 built; T11/T13 comment edits | covered |
| FR-17 | per-task gate clause; QUALITY_GATE | covered |
| NFR-1..NFR-7 | T6, T7, T12 (no prompt, retrieval, secret change; header unchanged) | covered |
| NFR-8 | T10 (read-only, runs last) | covered |
| AC-1..AC-10 | AC-1 T1-T4, T11; AC-2 T4; AC-3 T8; AC-4 T7; AC-5/6 T5; AC-7 T8, T11; AC-8 T6, T12; AC-9 T9; AC-10 gate | all reachable |

| Task | Traces to | Verdict |
|---|---|---|
| T1-T10 | plan v1 D1..D11 (built / pending as recorded) | ok |
| T11 | D1', D2', D12 -> FR-1, FR-4, FR-4a, FR-9 | ok |
| T12 | D3', D12 -> FR-10, FR-11, FR-12 | ok |
| T13 | D8' -> FR-9 (comment) | ok |

No orphan task. Scope creep checked against the Specification's *Out of scope* by name: no new model, no
prompt/schema/HTML change, Sonnet 5 / 3.7 / 3.6 retained and not migrated, `claude-sonnet-5` pricing comment
untouched, no `usage_log` re-pricing, `AGENTS.md` not touched by v3, historical references untouched, no
timeout or truncation change (T10 read-only). The plan explicitly rejects removing `max` from the shared
ordering/`LABELS` (A7), which keeps scope inside FR-4. Clear.

## 2. FROZEN files (AGENTS.md §9)

| Task | Frozen file touched | §9 stop present? | Sibling-file pattern used? | Verdict |
|---|---|---|---|---|
| T11 | none (`model-catalog.json`/`.ts`, four spec files) | n/a | n/a | ok |
| T12 | none (`server/providers/anthropic.js`, provider spec) | n/a | n/a | ok |
| T13 | none (`src/services/model-settings.service.ts`) | n/a | n/a | ok |

Verified on the branch: `git diff main..HEAD --name-only` shows no `src/prompts/task-*.ts`,
`master-system-prompt.ts` or `output-validator.ts`. Plan assumes approval it does not have: no.

## 3. Architecture rules (AGENTS.md §3)

| Rule | Checked | Finding |
|---|---|---|
| 1 — no direct SDK outside `server/providers/` | yes | `#effort` lives in `server/providers/anthropic.js` and reads the catalog through the already-imported `findModel`; client edits are data and comments. Clear |
| **2 — retrieval separate from generation** | yes, deliberately | No retrieval, Serper or fetch file in T11-T13; generation code gains no fetch. Clear |
| 3 — prompt text out of services | yes | T13 reworks comments only; no prompt text. Clear |
| 4 — no key in the bundle | yes | No key or env value added to `src/`. Clear |
| 5 — no existing feature broken | yes | Other models' clamp outcomes pinned by the parity invariant; plan A2 rejects calling `clampLevel` in the provider because it would change Haiku/Sonnet 5 behaviour. Clear |
| `STORE_REGISTRY` sole source of locales/currency | yes | Not referenced. Clear |
| `systemBlocks` not collapsed into `userContent` | yes | `#toSystem` and prompt assembly untouched. Clear |

## 4. prompt -> schema -> renderer -> validator

- Links touched: none.
- Stay in agreement: yes.
- Contract-before-consumer ordering holds: yes. T11 (catalog data) precedes T12, whose `#effort` derives
  "model lacks `max`" from that catalog; T13 depends on T11 only. No renderer/schema ordering applies.
- §4 criteria list complete: yes (not applicable by construction, matches spec).

## 5. Task quality

| Check | Result |
|---|---|
| All eight fields present on every task | Yes on T11, T12, T13, T10 (track, depends, FROZEN, what, files, tests, acceptance, notes). T1-T9 are recorded as a status table only, correct for built work |
| Acceptance checks observable | Yes: JSON diff is exactly one removed `"max"`; comment-only `git diff` for `.ts` files; no captured 5.5 request body contains `"effort":"max"`; recorded red-before / green-after |
| Each task could end in one green commit (§13) | Yes (see ordering below). T11 stays green after commit: the old provider spec drives slots directly and `#thinkingConfig` has not yet read the catalog, so it is unaffected until T12 |
| No task spans two tracks | Minor: T11 is labelled `prompt` but also edits a component spec (`angular` runner) and a server route spec. All three are test-only edits that go green on the single data edit and cannot be committed apart from it; justified in the task. Non-blocking finding 2 |
| Ordered by dependency and risk, riskiest first, rationale stated | Yes: `T11, T12, T13, T10`; T12 cannot precede T11 and T13 is independent of T12; rationale for T11 first is stated |
| Fixture updates sit with the change that moves them | Yes: spec reworks ship in the same commit as the production task that turns them green |

Built-task record (verified with `git log main..HEAD`): T1 `eb669f0`, T2 `75c98d7`, T3 `83a859a`, T4 `6646005`,
T5 `05b03f4`, T6 `aa036df`, T7 `2d5f4c6`, T8 `a6eb94d`, T9 `db74695`. The nine hashes and titles match the
log exactly, in order; there are no other commits on the branch.

Gap window T11 -> T12: after T11 the catalog has no `max` for 5.5 but `#thinkingConfig` still forwards
`max` if a caller bypasses the clamp. Verified in code: the normal route path goes through `resolveSlot`
(`server/llm-request.js` line 44), which clamps, so the window is reachable only by `FALLBACK_DEEP` with
`ANTHROPIC_THINKING_EFFORT=max` or direct provider calls. The breakdown names it and says to land T12
immediately after T11. Acceptable on a single-PR branch with mocked SDK tests; not a defect.

TDD ordering: spec reworks are authored first by `so-test-writer`, recorded red against current code, and
committed with the green production task (T1-T9 convention). Replacing assertions pinned to spec v2 with
spec v3 behaviour is a deliberate behaviour replacement, not a weakening (§7.7). Clear.

## 6. Test strategy

| Check | Result |
|---|---|
| Every task names test files **and** runner | Yes: T11 (`test:logic` ×3 files incl. route spec, `test:components` for the component spec), T12 (`test:logic`); T13 and T10 declare no test and say why (comment only / read-only) |
| Component specs named `*.component.spec.ts` | Yes: `model-settings.component.spec.ts` |
| Untested tasks justify changing no behaviour | Yes: T13, T10 |
| Failure paths from the FRs are covered | Yes: `max` bypassing the clamp via `generate` and `analyzeImage`, `FALLBACK_DEEP` env `max`, id absent from catalog, stored `max` and 4.6+`max` restore, `disabled`/`between_tools` shape cases, no `output_config`/`display`/`budget_tokens`/`block_binding` |
| Nothing relies on weakening/skipping a test (§7.7) | Yes. The "model lists `max` -> pass-through" branch of `#effort` may be omitted only if recorded in the test strategy (T12 Notes); that is a disclosed, not silent, omission |

FR-4 vacuous clause ("on every model whose `levels` contain `max`, `max` is returned unchanged"): verified
against `model-catalog.json`: `max` currently appears once (the 5.5 entry, to be removed by T11), so after T11
no catalog model lists it and the clause has no test subject; the spec's "such as Gemini and Sonnet 5" is
likewise false. The plan handles this correctly: it does not rely on the clause, replaces it with a stronger
non-vacuous invariant (every model x probe level: client == server, result in `levels`, member unchanged) and
explicit per-model `max` rows, and carries a rewording recommendation (D2'(d)). Not a Specification blocker
because no requirement outcome changes and the vacuity cannot make a wrong build pass.

## 7. Impact-analysis fidelity

- Plan consumed the survey rather than re-deriving it: yes (F-4 -> D2', F-5 -> D2', F-6 -> D3', U-1..U-5
  each resolved).
- Files touched but not surveyed: none. `anthropic.js`, catalog JSON/ts, service, four specs and the route
  spec are all in the survey or its plan-delta list.

## Verdict rationale

Nothing in the decomposition, ordering, TDD placement or scope requires revision, so no loop-back is
warranted. The `plan_review` v1 entry in the task_breakdown front matter is an input-currency error in
metadata only; it changes no task, dependency or acceptance check, and a loop to `IMPLEMENTATION_PLANNING`
for it alone would not change what is built. It is reported so the owner can correct it. PASS goes to the
human plan gate; it is not approval.

## Non-blocking findings

1. task_breakdown v3 `inputs_consumed` lists `plan_review` v1: SUPERSEDED, and not a declared input of
   `IMPLEMENTATION_PLANNING`. Remove or correct at the next revision (see "Supersession and input currency").
2. T11 is labelled `prompt` yet edits specs run by `test:components` and a server route spec; justified as
   test-only edits inseparable from the single data change. The TDD note counts "five spec files" while the
   task lists four reworks plus one added route case; wording only.
3. FR-4's vacuous "model lists `max`" clause and "such as Gemini and Sonnet 5" should be reworded at the next
   specification revision (carried from plan D2'(d)).
4. Gap window between the T11 and T12 commits (reachable only by a clamp-bypassing path): land T12
   immediately after T11.
5. OQ-1 (`minimal` -> `low`, `disabled` -> `between_tools`), NFR-7 (beta header on 5.5) and the U-4
   effort-omission assumption remain unverified owner-facing notes.
