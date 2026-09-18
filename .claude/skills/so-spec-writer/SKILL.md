---
name: so-spec-writer
description: >
  Turns an approved User Story plus its clarification report and Open Decisions into a
  Specification — numbered functional requirements, non-functional requirements, explicit
  out-of-scope, and a traceability matrix mapping every acceptance criterion to the
  requirements that satisfy it. Use when a Story has passed clarification and needs the
  specification the whole pipeline is built from ("write the spec for US-x.y"). Owns the
  SPECIFICATION stage and the specification artifact. The Specification is what
  HUMAN_SPEC_APPROVAL approves and what AGENTS.md §10 requires before any implementation code
  exists. Does not resolve Open Decisions (so-clarifier records them; a human answers them),
  does not plan the implementation (so-planner), and does not write tests or code.
---

# so-spec-writer

## Purpose

The Specification is the document AGENTS.md §10 makes mandatory: no implementation code, in
any layer, without an approved one. Everything downstream is derived from it — the plan, the
tests, the reconciliation check at the end. So it has one job: state what must be true when
this is done, precisely enough that a test can be written against every sentence, and
narrowly enough that nothing else gets built.

A Specification is not a design. It says **what**, not **how**. Where a "how" is genuinely
constrained (the retrieval path must stay out of generation; the store registry must stay the
only source of locales), that is a constraint to state, not a design to author —
`so-planner` does the design.

## Operational Contract

```
Precondition:     CLARIFICATION returned PASS. No Open Decision is blocking:true.
Input Artifacts:  story, clarification_report, open_decisions; README.md; AGENTS.md;
                  src/prompt-core/constants.ts (STORE_REGISTRY).
Output Artifacts: specification
Template:         assets/template.md
Resolve every path from docs/workflow/artifact-paths.yaml. Never hard-code one.
```

## Preconditions — check before writing anything

1. **No blocking Open Decision.** If `open_decisions` contains `blocking: true`, stop and
   return `BLOCKED`. Writing a Specification over a blocking decision means guessing, and the
   guess gets approved (AGENTS.md §11).
2. **The clarification verdict is Ready for Specification.** If it is "Not Ready", stop —
   unless the user has explicitly accepted the open risk, in which case record that
   acceptance in the Specification's own Open Questions section.
3. **Inputs are current.** Neither the Story nor the clarification report is `SUPERSEDED`
   (`artifact-schema.md` staleness contract).

## Writing the Specification

Use `assets/template.md`.

### Functional requirements

Numbered `FR-1`, `FR-2`, … Each one:

- states a **behaviour**, in the present tense, that is true when the system is correct;
- is **falsifiable** — a test can fail it;
- names the **actor or trigger** where the behaviour depends on one;
- covers its **failure path**, not only the happy one. A requirement that says what happens
  when things work and is silent on what happens when they do not is half a requirement.

Split a requirement that needs an "and" between two independently testable behaviours.

### Non-functional requirements

Only what actually constrains this Story. In this repository the recurring ones are:

- **Prompt caching economics** — `systemBlocks` must not be collapsed into `userContent`
  (AGENTS.md §3).
- **Provider independence** — no behaviour may depend on which provider is active (§3 Rule 1).
- **Retrieval separation** — search and page fetch stay out of generation (§3 Rule 2). This
  rule has no automated check, so stating it here is how it gets reviewed at all.
- **Secrets** — nothing reaching the browser bundle (§3 Rule 4).
- **Determinism** — anything the tests will need to pin: no unseeded randomness, no wall-clock
  dependence.

### The §4 acceptance criteria are requirements, not background

If the Story changes generated HTML, the relevant AGENTS.md §4 criteria are **part of this
Specification**. Restate the ones in play as explicit FRs, including the ones that must remain
true — spec-count parity, figure/figcaption structure, first-image-eager/rest-lazy, video
survival, `meta_title` ≤ 55, `meta_description` ≤ 155 ending in CTA ➔ with no currency symbol.

Do not paraphrase them. Quote the criterion and cite §4.

### Store and locale scope

State it explicitly, in `STORE_REGISTRY` terms. If uk-UA is affected, say what happens to
every derived locale — uk-UA is the master every other language is translated from, so
"uk-UA only" is almost never the whole answer.

### Out of scope

Write this section even when it feels obvious. It is what stops `so-planner` growing the work
and what `so-plan-reviewer` checks scope creep against.

### Traceability matrix

Every `AC-n` from the Story maps to at least one `FR-n`. An acceptance criterion with no
requirement is a gap; a requirement satisfying no acceptance criterion is scope creep. Both
are findings, not things to smooth over — if the Story's criteria are genuinely insufficient,
that is `CHANGES_REQUIRED` back to `CLARIFICATION`, not a requirement you invent.

## Result Envelope

`stage: SPECIFICATION`, `skill: so-spec-writer`.

- **`PASS`** — the Specification is written, every `AC-n` is traced, no requirement was
  invented.
- **`CHANGES_REQUIRED`** — the Story's acceptance criteria cannot be turned into falsifiable
  requirements without inventing something. `loop_back_stage: changes_required_clarification`
  is not available from this stage; this stage has no `loop_back` map, so use `BLOCKED` and
  name what `CLARIFICATION` must resolve.
- **`BLOCKED`** — a blocking Open Decision, a "Not Ready" verdict without accepted risk, or a
  stale input.

## Constraints

- **Never invent a requirement** to fill a gap the Story left. That is the failure this whole
  pipeline exists to prevent.
- Never resolve an Open Decision. Recording that one exists is the correct action.
- Never design the implementation — no file names, no function signatures, no component
  structure. That is `so-planner`.
- Never write tests or code.
- Never mark the Specification `APPROVED`. It is born `DRAFT`; only `/so:approve` through
  `so-orchestrator` changes that.
- Never weaken a §4 criterion because the Story would be easier without it.
- English in the artifact; Ukrainian to the user.

## Verification Checklist

- [ ] No blocking Open Decision was open when writing began.
- [ ] Every requirement is numbered, falsifiable, and states a behaviour.
- [ ] Every requirement with a failure path states it.
- [ ] Every `AC-n` from the Story appears in the traceability matrix against at least one FR.
- [ ] No FR exists that traces to no AC.
- [ ] Store and locale scope is stated in `STORE_REGISTRY` terms, with uk-UA fan-out
      addressed if applicable.
- [ ] Any AGENTS.md §4 criterion in play is quoted and cited, not paraphrased.
- [ ] Out of scope is written and non-empty.
- [ ] No implementation design leaked in.
- [ ] Front matter is complete per `artifact-schema.md`, including `inputs_consumed` with the
      versions actually read.
