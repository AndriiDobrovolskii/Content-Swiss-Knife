---
artifact: plan_review
story: {{US-x.y}}
version: 1
status: DRAFT
owner: so-plan-reviewer
created_at: {{ISO-8601 UTC}}
updated_at: {{ISO-8601 UTC}}
supersedes: null
inputs_consumed:
  - key: specification
    version: {{n}}
  - key: impact_analysis
    version: {{n}}
  - key: implementation_plan
    version: {{n}}
  - key: task_breakdown
    version: {{n}}
open_decisions_blocking: false
---

# Plan Review: {{US-x.y}} — {{Title}}

**Verdict:** {{PASS | CHANGES_REQUIRED | BLOCKED}}
**Loop-back:** {{n/a | changes_required → ARCHITECTURE_PLANNING | changes_required_tasks → IMPLEMENTATION_PLANNING | changes_required_specification → SPECIFICATION}}

> `PASS` here is **not** human approval. Only `/so:approve` records that (AGENTS.md §10).

## Summary

{{Two or three sentences: is this plan buildable as written, and the single most important
thing wrong with it if anything.}}

## 1. Specification coverage (re-derived, both directions)

| FR | Reached by task(s) | Verdict |
|---|---|---|
| FR-1 | T1, T3 | covered |
| FR-2 | — | **WORK THAT WILL NOT HAPPEN** |

| Task | Traces to | Verdict |
|---|---|---|
| T1 | plan §Domain model → FR-1 | ok |
| T4 | — | **SCOPE CREEP** — checked against Specification *Out of scope* |

## 2. FROZEN files (AGENTS.md §9)

| Task | Frozen file touched | §9 stop present? | Sibling-file pattern used? | Verdict |
|---|---|---|---|---|
| {{T2}} | {{src/prompts/task-a.ts}} | {{yes/no}} | {{yes/no}} | {{ok / **BLOCKING**}} |

Plan assumes approval it does not have: {{no / **yes — where**}}

## 3. Architecture rules (AGENTS.md §3)

| Rule | Checked | Finding |
|---|---|---|
| 1 — no direct SDK outside `server/providers/` | | |
| **2 — retrieval separate from generation** (no automated check anywhere) | | |
| 3 — prompt text out of services | | |
| 4 — no key in the bundle | | |
| 5 — no existing feature broken | | |
| `STORE_REGISTRY` sole source of locales/currency | | |
| `systemBlocks` not collapsed into `userContent` | | |

## 4. prompt → schema → renderer → validator

- Links touched: {{…}}
- Stay in agreement: {{yes / finding}}
- Contract-before-consumer ordering holds: {{yes / **ordering defect — T{{n}} before T{{m}}**}}
- §4 criteria the renderer must keep satisfying, list complete: {{yes / missing …}}

## 5. Task quality

| Check | Result |
|---|---|
| All eight fields present on every task | |
| Acceptance checks observable | |
| Each task could end in one green commit (§13) | |
| No task spans two tracks | |
| Ordered by dependency and risk, riskiest first, rationale stated | |
| Fixture updates sit with the change that moves them | |

## 6. Test strategy

| Check | Result |
|---|---|
| Every task names test files **and** runner | |
| Component specs named `*.component.spec.ts` | |
| Untested tasks justify changing no behaviour | |
| Failure paths from the FRs are covered | |
| Nothing relies on weakening/skipping a test (§7.7) | |

## 7. Impact-analysis fidelity

- Plan consumed the survey rather than re-deriving it: {{yes/no}}
- Files touched but not surveyed: {{none / list — survey gap or scope growth?}}

## Verdict rationale

{{Why this verdict and this loop-back target rather than the adjacent one — where the fix
belongs, not where it was noticed.}}

## Non-blocking findings

- {{…}}
