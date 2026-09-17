---
name: so-planner
description: >
  Produces the architectural implementation plan for a Story from its approved Specification
  and the impact analyzer's blast-radius survey — the design decisions, the files to create
  and modify, the risks taken, and the validation strategy. Absorbs the design work the
  reference harness split across separate API and database stages: Zod domain-model shape,
  prompt payload contracts, renderer and validator structure, and Angular component/service
  design. Use when a Specification is approved and impact analysis is done, and the
  architecture must be decided before tasks are ordered ("plan the implementation for
  US-x.y"). Owns the ARCHITECTURE_PLANNING stage and the implementation_plan artifact. Does
  not decide execution order or assign tasks (so-implementation-planner), and does not write
  tests or code.
---

# so-planner

## Purpose

Decide **how** this Story gets built, once, in writing, before anyone writes a task list
against it.

This stage carries the design load that the reference harness spread across separate API and
database design stages. There is no REST contract to design here and no relational schema, but
there is real design: what shape the Zod domain model takes, what the prompt payload contract
becomes, where a transform belongs, whether a new sibling file is the right answer to a FROZEN
file, and what the Angular surface looks like.

A plan is not a task list. It states decisions and their reasons. `so-implementation-planner`
turns it into ordered work.

## Operational Contract

```
Precondition:     HUMAN_SPEC_APPROVAL approved; IMPACT_ANALYSIS returned PASS.
Input Artifacts:  story, specification, open_decisions, impact_analysis.
Output Artifacts: implementation_plan
Resolve every path from docs/workflow/artifact-paths.yaml. Never hard-code one.
```

**Consume the impact analysis; do not re-derive it.** The affected-file survey and the hazard
table are inputs. If the survey is wrong or incomplete, that is a `CHANGES_REQUIRED` back to
`IMPACT_ANALYSIS`, not something to quietly redo here.

## What the plan must decide

### 1. Domain model (`src/domain/`)

If the shape of `ProductDescriptionDoc` or `ConsumablesDoc` changes: state the new/changed
fields, whether they are required or optional, and what happens to artifacts already on disk
that lack them. A Zod schema change is a compatibility decision, not just a type edit — the
corpus fixtures in `test/fixtures/corpus/` must still parse, or the plan must say they are
regenerated and why that is acceptable.

### 2. The prompt → schema → renderer → validator chain

For every link the impact analysis flagged, state the change and, critically, **how the links
stay in agreement**. A prompt asked for a field the schema does not have is a schema failure
at runtime; a schema field the renderer ignores is silently dropped output.

State explicitly which AGENTS.md §4 criteria the renderer must continue to satisfy, and where
in the code that is enforced.

### 3. FROZEN files (AGENTS.md §9)

If the impact analysis flagged one, the plan must choose and justify one of:

- **A new sibling file** — the established pattern here: `task-a-doc.ts` and
  `task-a-consumables-doc.ts` exist because `task-a.ts` is frozen;
  `image-manifest-coverage.ts` exists because `output-validator.ts` is. Prefer this.
- **Editing the frozen file** — only with the §9 protocol: STOP, state exactly what and why,
  wait for explicit approval. The plan states the request; it does not grant it.

A plan that quietly assumes a frozen file can be edited is a defect.

### 4. Prompt payload contract (`src/prompt-core/payload.ts`)

If a prompt builder changes: does the `PromptPayload` shape change, and do the `systemBlocks`
stay separate from `userContent`? Collapsing them breaks Anthropic prompt caching economics
(AGENTS.md §3) — if the plan requires a change here, it states the caching consequence.

### 5. Angular surface (`src/app`, `src/services`)

Standalone components, signals, `inject()`. State: which components change, which signals or
computeds are added, whether anything needs `OnPush`, and what the component test will drive
(render, click, signal change) — `so-test-writer` builds on this. RxJS belongs only at the
HTTP boundary; a plan introducing it elsewhere must justify it.

### 6. Server surface (`server/`)

Plain ESM JavaScript. If `server/usage/store.js` gains a column, the plan must address that
there is **no migration mechanism**: `CREATE TABLE IF NOT EXISTS` silently no-ops against an
existing database, so the plan states how existing installs get the new column, or that they
deliberately do not.

### 7. Validation strategy

How this will be proven, at the level of "what kind of test, against what". Not the tests
themselves — `so-test-writer` writes those — but enough that a missing test category is
visible now. Name which runner each category lands in.

### 8. Risks and the rejected alternatives

State at least the alternatives that were seriously considered and why they lost. A plan with
no rejected alternative was not a decision, it was the first idea. Name what could go wrong
and what would make it visible.

## Output

The `implementation_plan` artifact, front matter per `artifact-schema.md`:

- **Approach** — one paragraph, the shape of the solution.
- **Design decisions** — one subsection per decision above that applies, each with its reason.
- **Files to create / modify** — grouped, each with one line on what changes. Derived from the
  impact analysis, not re-surveyed.
- **FROZEN-file position** — sibling file, or an explicit §9 request.
- **Validation strategy** — test categories and their runners.
- **Risks** — what could break, and how it would surface.
- **Rejected alternatives** — with reasons.
- **Traceability** — every `FR-n` in the Specification maps to at least one design decision or
  file.

## Result Envelope

`stage: ARCHITECTURE_PLANNING`, `skill: so-planner`. The two `loop_back` keys available here
are `changes_required` → `SPECIFICATION` and `changes_required_impact` → `IMPACT_ANALYSIS`.
Choose by where the fix belongs: an unimplementable requirement is a Specification problem; a
blast radius that missed a consumer is an impact problem.

## Constraints

- Never write code, tests or fixtures.
- Never order tasks or assign them to a track — that is `so-implementation-planner`.
- Never re-derive the impact analysis; consume it or loop back.
- Never plan an edit to a FROZEN file without the explicit §9 request (AGENTS.md §9).
- Never plan a change that violates an architecture rule (§3) — especially Rule 2, retrieval
  separate from generation, which has no automated check and will not be caught later.
- Never plan to hard-code a language list or currency symbol outside `STORE_REGISTRY`.
- Never weaken or exclude a test to make a design work (§7.7).
- English in the artifact; Ukrainian to the user.

## Verification Checklist

- [ ] Every applicable design area above has an explicit decision with a reason.
- [ ] Every `FR-n` traces to a design decision or a named file.
- [ ] The prompt → schema → renderer → validator links are stated as staying in agreement.
- [ ] Which AGENTS.md §4 criteria the renderer must keep satisfying is named.
- [ ] FROZEN-file position is explicit: sibling file, or a §9 request that stops for approval.
- [ ] `systemBlocks` / `userContent` separation is addressed if a prompt builder changes.
- [ ] Corpus fixture compatibility is addressed if the domain schema changes.
- [ ] `server/usage/store.js` migration-free reality is addressed if its schema changes.
- [ ] Validation strategy names test categories **and** their runner.
- [ ] At least one rejected alternative is recorded with its reason.
