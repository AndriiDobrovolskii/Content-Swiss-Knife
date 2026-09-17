---
artifact: specification_review
story: {{US-x.y}}
version: 1
status: DRAFT
owner: so-spec-reviewer
created_at: {{ISO-8601 UTC}}
updated_at: {{ISO-8601 UTC}}
supersedes: null
inputs_consumed:
  - key: story
    version: {{n}}
  - key: specification
    version: {{n}}
  - key: open_decisions
    version: {{n}}
open_decisions_blocking: false
---

# Spec Review: {{US-x.y}} — {{Title}}

**Verdict:** {{PASS | CHANGES_REQUIRED | BLOCKED}}
**Loop-back:** {{n/a | changes_required → SPECIFICATION | changes_required_clarification → CLARIFICATION}}

> A `PASS` here is **not** human approval. Approval is recorded only by `/so:approve`
> (AGENTS.md §10).

## Summary

{{Two or three sentences. What this Specification gets right, and the single most important
thing wrong with it, if anything.}}

## 1. Acceptance-criterion coverage

Matrix re-derived from the Story, not read back from the Specification.

| AC | Story says | Specification satisfies it via | Verdict |
|---|---|---|---|
| AC-1 | {{…}} | FR-1 | covered |
| AC-2 | {{…}} | — | **GAP** |

Requirements tracing to no acceptance criterion (scope creep): {{none / FR-n}}

## 2. Non-verifiable language

Each quoted, not summarised.

- **FR-n** — "{{verbatim sentence}}"
  - A test would have to invent: {{what}}

{{or: none found}}

## 3. Contradictions with the Story

- {{Story says X; Specification says Y. Scope tables compared directly.}}

{{or: none found}}

## 4. Scope creep

- Out of scope section present and non-empty: {{yes / **no — finding**}}
- {{Requirements nobody asked for}}

{{or: none found}}

## 5. Missing edge cases, boundaries and failure paths

| Area | Checked | Finding |
|---|---|---|
| FR failure paths | | |
| Locale fan-out (uk-UA master → derived locales) | | |
| Store scope vs STORE_REGISTRY | | |
| §4 invariants that must survive | | |
| Provider behaviour (retry, timeout, 429, malformed JSON) | | |
| Empty / boundary inputs | | |

## 6. Compliance with AGENTS.md

| Check | Result |
|---|---|
| §4 criteria in play quoted **verbatim** and cited, not paraphrased | |
| §9 FROZEN-file impact named and acknowledged | |
| §3 architecture rules not violated — incl. Rule 2, review-only | |
| §11 no blocking Open Decision left unaddressed | |
| No implementation design leaked in | |

## Verdict rationale

{{Why this verdict and not the adjacent one. If CHANGES_REQUIRED, why this loop-back target
is where the fix belongs rather than where the problem was noticed.}}

## Non-blocking findings

{{Recorded but not blocking. These travel with a PASS.}}

- {{…}}
