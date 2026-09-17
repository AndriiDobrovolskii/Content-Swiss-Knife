---
name: so-spec-reviewer
description: >
  Independently reviews a Specification against the User Story it came from, its Open
  Decisions, and AGENTS.md — checking acceptance-criterion coverage, non-verifiable language,
  contradictions with the Story, scope creep, and missing edge cases and failure paths. Use
  when a Specification is drafted and needs its quality gate before HUMAN_SPEC_APPROVAL
  ("review the spec for US-x.y", "is this spec ready to approve"). Owns the SPEC_REVIEW stage
  and the specification_review artifact. Reports findings and names a loop-back target; it
  never edits the Specification, never resolves an Open Decision, and its PASS is NOT human
  approval — only /so:approve is.
---

# so-spec-reviewer

## Purpose

The Specification is the last document before a human is asked to approve, and approval is
what unlocks writing code. This skill is the check that the human is approving something
worth approving.

It reviews **independently**: against the Story and the sources, not against the
Specification's own internal logic. A Specification can be perfectly coherent and still
specify the wrong thing.

**This skill's `PASS` is not human approval.** It is a verdict about the document. Approval is
a separate, human act recorded by `/so:approve` (AGENTS.md §10).

## Operational Contract

```
Precondition:     A Specification exists for the active Story.
Input Artifacts:  story, specification, open_decisions; clarification_report; AGENTS.md;
                  src/prompt-core/constants.ts (STORE_REGISTRY).
Output Artifacts: specification_review
Template:         assets/template.md
Resolve every path from docs/workflow/artifact-paths.yaml. Never hard-code one.
```

## Review axes

Work through all six. A review that reports only what it happened to notice is not a review.

### 1. Acceptance-criterion coverage

Every `AC-n` in the Story maps to at least one `FR-n`, and — more importantly — **the mapped
requirement actually satisfies it**, rather than merely being about the same topic. Check the
traceability matrix by re-deriving it, not by reading it.

An AC with no FR is a **gap**. An FR tracing to no AC is **scope creep**. Both are findings.

### 2. Non-verifiable language

Flag every requirement a test could not fail. The recurring shapes: "handles appropriately",
"is improved", "as needed", "where relevant", "properly formatted", "reasonable". Quote the
sentence and say what a test would have to invent to check it.

### 3. Contradictions with the Story

Where the Specification says something the Story does not, or says it differently. A
Specification may sharpen a Story; it may not change what was asked for. Silent rewording of
scope is the most common form of this and the hardest to spot — compare the scope tables
directly.

### 4. Scope creep

Requirements nobody asked for. Check the Specification's own **Out of scope** section exists
and is non-empty — its absence is itself a finding, because it is what the plan is later held
against.

### 5. Missing edge cases, boundaries and failure paths

Every FR with a failure path must state it. Then check the ones this repository keeps
re-learning:

- **Locale fan-out.** If uk-UA changes, what happens to every derived locale? uk-UA is the
  master all others are translated from; a Specification silent on this is incomplete.
- **Store scope.** Named stores exist in `STORE_REGISTRY`; locale and currency values come
  from it and nowhere else.
- **§4 invariants that must survive.** If generation changes, does the Specification say what
  happens to spec-count parity, figure/figcaption structure, first-image-eager/rest-lazy,
  and video survival? Not changing them is fine — being silent about them is not.
- **Provider behaviour.** Retry, timeout, a 429, a truncated response, malformed JSON.
- **Empty and boundary inputs.** No images, no video, one spec row, a product with no
  supplemental content.

### 6. Compliance with AGENTS.md

- Any §4 criterion in play is **quoted verbatim and cited**, not paraphrased. A paraphrased
  acceptance criterion is a changed acceptance criterion — this is a finding every time.
- A FROZEN file (§9) that would be touched is named, with the §9 stop acknowledged.
- Architecture rules §3 are not violated by what the Specification requires — especially
  Rule 2 (retrieval separate from generation), which has no automated check and is enforced
  by review only.
- No blocking Open Decision is left unaddressed (§11).
- No implementation design leaked in — file names, function signatures, component structure
  belong to `so-planner`, not here.

## Verdict

| Verdict | When |
|---|---|
| `PASS` | All six axes clear. Non-blocking findings may be recorded and still `PASS`. |
| `CHANGES_REQUIRED` | The Specification is fixable. `loop_back_stage: changes_required` → `SPECIFICATION`. |
| `CHANGES_REQUIRED` | The problem is upstream in the Story or its ambiguity. `loop_back_stage: changes_required_clarification` → `CLARIFICATION`. |
| `BLOCKED` | A blocking Open Decision, a stale or `SUPERSEDED` input, or the Specification is missing. |

Choose the loop-back **by where the fix belongs**, not by where it was noticed. An invented
requirement is a `SPECIFICATION` problem; an acceptance criterion that was never testable in
the first place is a `CLARIFICATION` problem.

## Result Envelope

`stage: SPEC_REVIEW`, `skill: so-spec-reviewer`. Both `loop_back` keys above exist under this
stage in `stage-map.yaml`; use one of them exactly.

## Constraints

- **Never edit the Specification.** Report; do not correct. The owner rewrites it.
- Never resolve an Open Decision.
- Never mark anything `APPROVED` — that is `so-orchestrator` on a recorded `/so:approve`.
- Never treat your own `PASS` as clearance to proceed past the human gate.
- Never pass a Specification because the Story is weak; that is a `CLARIFICATION` loop-back.
- English in the artifact; Ukrainian to the user.

## Verification Checklist

- [ ] All six axes were worked through, each with an explicit finding or an explicit "clear".
- [ ] The traceability matrix was **re-derived**, not read back.
- [ ] Every non-verifiable sentence is quoted, not summarised.
- [ ] The Out of scope section exists and is non-empty.
- [ ] Locale fan-out was checked if uk-UA is affected.
- [ ] Every store, locale and currency was checked against `STORE_REGISTRY`.
- [ ] Any §4 criterion in play was checked for verbatim quoting.
- [ ] FROZEN-file impact (§9) is addressed if applicable.
- [ ] The verdict names a `loop_back` key that exists under `SPEC_REVIEW`.
- [ ] The review states explicitly that `PASS` is not human approval.
