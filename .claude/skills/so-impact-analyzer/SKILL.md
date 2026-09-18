---
name: so-impact-analyzer
description: >
  Surveys the blast radius of an approved Specification before anything is planned — which
  files, stores, locales, prompts, fixtures and tests the work actually reaches, and which of
  this repository's known fan-out hazards it trips. Use when a Specification is approved and
  the scope of change needs to be known before planning ("what does US-x.y touch?", "impact
  analysis for this story"). Owns the IMPACT_ANALYSIS stage and the impact_analysis artifact.
  Produces the affected-file survey so-planner builds its plan from, so the plan does not have
  to re-derive it. Does not design the solution (so-planner), does not order tasks
  (so-implementation-planner), and does not write code.
---

# so-impact-analyzer

## Purpose

Find out what this change actually touches, **before** someone plans it. A plan built on an
incomplete blast radius produces a task list that is missing tasks, and the missing ones
surface at `QUALITY_GATE` as a broken test in a file nobody thought was related.

This codebase has specific fan-out shapes that are not obvious from reading a Specification.
Naming them is most of this skill's value.

## Operational Contract

```
Precondition:     HUMAN_SPEC_APPROVAL was approved. The Specification is current.
Input Artifacts:  story, specification, open_decisions.
Output Artifacts: impact_analysis
Resolve every path from docs/workflow/artifact-paths.yaml. Never hard-code one.
```

## The known fan-out hazards

Check every one explicitly. A hazard that does not apply is recorded as "checked, does not
apply" — silence is indistinguishable from not looking.

### 1. `STORE_REGISTRY` fan-out

`STORE_REGISTRY` in `src/prompt-core/constants.ts` is the single source of truth for every
store's group, currency, languages and image base URL. Consumers reach across the whole
codebase — at the time of writing: `src/app/app.component.ts`,
`src/prompt-core/{doc-pipeline-flag,store-render-rules}.ts`, `src/prompts/task-slug.ts`,
`src/render/render-description.ts`, `src/services/content-orchestrator.service.ts`,
`src/utils/{language-consistency,output-validator,table-finalize}.ts`.

**Re-derive this list; do not trust the one above.** A registry change is never local.

### 2. uk-UA is the master, not one locale among many

Task A generates the uk-UA artifact; Task C translates it into every other locale. A change
to uk-UA generation therefore reaches **every language**. A change to Task C reaches only the
translated ones. Getting this backwards is the difference between a one-locale fix and a
full-catalogue regeneration.

### 3. The prompt → renderer → validator chain

These three move together and are frequently mistaken for independent:

```
src/prompts/*.ts + src/prompt-core/*.ts   what the model is asked for
        ↓
src/domain/*.schema.ts                    the Zod shape the answer must satisfy
        ↓
src/render/render-{description,consumables}.ts   Doc → HTML
        ↓
src/utils/output-validator.ts             the acceptance criteria, enforced
```

Changing what a prompt produces without changing the schema gives a schema failure; changing
the schema without the renderer gives unrendered fields; changing either without the
validator means the AGENTS.md §4 criteria stop matching what is actually emitted. Always
state which links of this chain the Story touches.

### 4. FROZEN files (AGENTS.md §9)

`src/prompts/task-{a,b,c}.ts`, `src/prompt-core/master-system-prompt.ts`,
`src/utils/output-validator.ts`. If the work would require editing one, **say so here, loudly**
— that is a §9 stop the plan and the human gate both need to see. Note the established
workaround pattern: `task-a-doc.ts` and `task-a-consumables-doc.ts` exist precisely because
`task-a.ts` is frozen, and `image-manifest-coverage.ts` exists because `output-validator.ts`
is. A new sibling file is often the right answer, but it is a design decision for
`so-planner`, not something to assume here.

### 5. The corpus conformance harness

`test/fixtures/corpus/` holds accepted artifacts as `.ctx.json` / `.doc.json` / `.uk-UA.html`
triples, consumed by `test/render-reconciliation.spec.ts` and `test/render-conformance.spec.ts`.
Anything changing rendered output will move these fixtures — and **`test/render-reconciliation.report.md`
§5 records that the corpus is currently only two items covering the same product (Ortur H20
20 W) across two stores.** If the Story depends on coverage the corpus does not have, that is
a finding now, not a surprise at `TEST_WRITING`.

### 6. The two test runners

`*.component.spec.ts` runs under `npm run test:components`; everything else under
`npm run test:logic`. A Story adding component tests adds work to a runner that currently has
one file in it. Say which runner the new tests land in.

### 7. Server-side surfaces with no co-located tests

`server/**` has no tests beside it — it is covered indirectly from `test/*.spec.ts`
(`llm-routes`, the three providers, `pricing`, `usage-store`, `retry`, `json-parse`). A Story
touching `server/` must name which of those specs it puts at risk. Also note
`server/usage/store.js` has **no migration mechanism**: its schema is `CREATE TABLE IF NOT
EXISTS`, so adding a column is a silent no-op against an existing database.

## Method

1. Read the Specification's scope table and functional requirements — the survey is bounded by
   what was approved, not by what looks related.
2. For each hazard above, determine applicability **by searching the codebase**, not by
   recall. Record what you searched for.
3. Build the affected-file list: files that must change, files that will need re-verification
   even if unchanged, and tests that exercise them.
4. Identify what could break silently — the failure that produces no error, only wrong output.
   In this codebase that is usually a §4 criterion that stops being enforced, a locale that
   stops being generated, or a fixture that quietly diverges.
5. State what the survey could **not** determine, and what would resolve it.

## Output

The `impact_analysis` artifact, front matter per `artifact-schema.md`, containing:

- **Affected files**, in three groups: *must change*, *needs re-verification*, *tests that
  cover them*.
- **Hazard table** — every one of the seven above, with applies / does not apply and the
  evidence.
- **Silent-failure risks** — what breaks without erroring.
- **Fixture and corpus impact** — which fixtures move, and whether coverage exists.
- **Blast-radius summary** — one paragraph a planner can act on.
- **Unknowns** — what could not be determined and what would settle it.

## Result Envelope

`stage: IMPACT_ANALYSIS`, `skill: so-impact-analyzer`.

- **`PASS`** — the survey is complete and every hazard was checked.
- **`CHANGES_REQUIRED`** — the Specification's scope cannot be surveyed because it is
  ambiguous about what it touches. `loop_back_stage: changes_required` → `SPECIFICATION`
  (the only key this stage has).
- **`BLOCKED`** — an input is stale or `SUPERSEDED`, or a blocking Open Decision determines
  the blast radius.

## Constraints

- Never design the solution. "This will need a new renderer branch" is planning; "the
  renderer is affected" is impact.
- Never write or modify code, tests or fixtures.
- Never trust a remembered file list — re-derive it from the codebase every run.
- Never omit a hazard because it seems obviously inapplicable. Record the check.
- English in the artifact; Ukrainian to the user.

## Verification Checklist

- [ ] All seven hazards are recorded with applies / does not apply **and evidence**.
- [ ] The `STORE_REGISTRY` consumer list was re-derived, not copied from this document.
- [ ] uk-UA master-vs-translation direction is stated explicitly if generation is touched.
- [ ] Which links of the prompt → schema → renderer → validator chain are affected is named.
- [ ] FROZEN-file impact is stated loudly if any.
- [ ] Corpus coverage was checked against what the Story needs, citing the report's §5 gap.
- [ ] Which test runner new tests land in is named.
- [ ] Silent-failure risks are listed separately from things that would error.
- [ ] Unknowns are stated rather than guessed.
