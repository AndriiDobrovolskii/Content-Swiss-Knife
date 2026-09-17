---
name: so-story-writer
description: >
  Turns raw input — an idea, a bug report, a piece of user feedback — into a structured User
  Story file under docs/stories/, and registers it in docs/catalog/stories.yaml. Use when the
  user runs /so:new, or says "I want X", "X is broken", "we should add Y" and there is no
  Story for it yet. Interviews the user for a missing actor, business outcome or acceptance
  criterion rather than inventing one; anything genuinely undecidable becomes a recorded Open
  Decision. Owns the STORY_WRITING stage, the story artifact and the story_catalog artifact.
  Does not write a specification (so-spec-writer), does not clarify ambiguity into a decision
  log (so-clarifier), and does not activate the Story or write any workflow state — that is
  so-orchestrator's, via /so:start.
---

# so-story-writer

## Purpose

This is the front door. Everything downstream — clarification, specification, plan, tests,
code — is derived from the Story file this skill writes, so a vague Story is not a small
problem that gets fixed later; it is a vague specification, then vague tests, then wrong code.

The skill's job is to convert a sentence a person said into a Story someone else could
implement without asking them anything. Where that is not possible, it **asks**, and where an
answer genuinely does not exist yet, it records an Open Decision instead of inventing one.

## Operational Contract

```
Precondition:     Raw input from the user. No Story exists for it yet.
Input Artifacts:  docs/catalog/stories.yaml; docs/stories/ (existing Stories, for id
                  allocation and duplicate detection); README.md; AGENTS.md;
                  src/prompt-core/constants.ts (STORE_REGISTRY).
Output Artifacts: story  (docs/stories/{story_id}-{slug}.md)
                  story_catalog  (docs/catalog/stories.yaml)
Resolve both paths from docs/workflow/artifact-paths.yaml. Never hard-code them.
```

## Required context

This repository has no `docs/product/` directory. Its domain authorities are:

1. **`README.md`** — "What it does", "Supported stores & markets", "How generation works",
   "Tools & modes". This is what the product actually is.
2. **`AGENTS.md`** §3 (architecture rules), §4 (the hard HTML acceptance criteria), §9 (the
   FROZEN file list). A Story that would require changing a FROZEN file is not forbidden, but
   it MUST say so explicitly — that is a §9 stop the whole pipeline needs to see early.
3. **`STORE_REGISTRY`** in `src/prompt-core/constants.ts` — the single source of truth for
   every store's group, currency, languages and image base URL. A Story that names a store,
   a locale or a currency must use the registry's own values. Never invent a store or a
   locale.
4. **`docs/catalog/stories.yaml`** and existing `docs/stories/` — for id allocation and to
   catch a duplicate before writing a second Story for the same need.

## Workflow

### 1. Understand the raw input

Classify it: a **feature**, a **bug**, or a **piece of feedback** that may be either. A bug
Story states the observed behaviour, the expected behaviour and the reproduction; a feature
Story states the actor, the outcome and the value.

Check `docs/stories/` for an existing Story covering the same need. If one exists, say so and
stop — propose amending it rather than creating a near-duplicate.

### 2. Interview for what is missing — one focused round

Ask about what you genuinely cannot determine. Typical gaps in this repository:

- **Who** is this for — the content operator running a generation, or an end reader of the
  product page? They want different things.
- **Which stores or locales** does it affect: all of `STORE_REGISTRY`, one group, or one
  store? Anything uk-UA-specific is special — uk-UA is the master artifact every other
  locale is translated from, so a change there fans out to every language.
- **What does "done" look like**, stated as something observable? "Better descriptions" is
  not an acceptance criterion; "the spec table keeps its row count after the rewrite" is.
- **Does it touch generated HTML?** If so, which of AGENTS.md §4's criteria are in play.
- **Does it require a prompt change?** If yes, does it touch a FROZEN file (§9)?

Ask these as a short, focused round — not a long form. Ask only what the answer changes.

### 3. Record what cannot be answered

An answer the user does not have is **not** a reason to guess and not a reason to stall. Note
it in the Story's own `Open questions` section, stating the question, what you checked, and
what a specification writer would otherwise have to assume. `so-clarifier` will formalise it
into the Open Decisions log at the next stage (AGENTS.md §11).

### 4. Allocate the id

Epic-dotted, matching `story_id_pattern` in `artifact-paths.yaml` (`US-<epic>.<n>`). Reuse an
existing epic number when the work belongs to one; allocate the next free `<n>` within it.
Only open a new epic for a genuinely new area. Never reuse an id, including one whose Story
was archived.

### 5. Choose the track

`angular` | `server` | `prompt` — this selects the implementation sub-skill list in
`stage-map.yaml`, so a wrong value misroutes the build.

| Track | When | Surface |
|---|---|---|
| `angular` | default | `src/app`, `src/services`, `src/render`, `src/domain`, `src/utils` |
| `server` | the Express proxy, a provider, retrieval, usage telemetry | `server/**` |
| `prompt` | prompt text or prompt-building logic | `src/prompts`, `src/prompt-core` |

A Story spanning more than one names the **primary** track; per-task tracks are assigned
later by `so-implementation-planner`.

### 6. Write the Story and register it

Use `assets/template.md`. Front matter per `docs/workflow/artifact-schema.md` — `slug` must
match the filename. Then add the Story to `docs/catalog/stories.yaml` with state
`NOT_STARTED`.

English in the file (AGENTS.md §1); Ukrainian when talking to the user.

## Acceptance criteria — the part that matters

Each one must be **observable and falsifiable**. A criterion nobody can write a failing test
against is not a criterion; `so-test-writer` will have to invent one later, and that
invention is how a specification silently drifts from what was wanted.

| Not acceptable | Acceptable |
|---|---|
| "The output is better" | "`meta_description` ends with the CTA ➔ and is ≤ 155 characters" |
| "Images work properly" | "The first `<img>` has no `loading="lazy"`; every later one has it" |
| "It handles errors" | "A provider 429 retries with backoff and surfaces one user-visible error, not five" |
| "Fast enough" | "A single-locale generation completes without the 60 s proxy timeout firing" |

Number them `AC-1`, `AC-2`, … — `so-reconciliation-reviewer` matches these exact ids against
the AC ↔ test matrix at the end of the pipeline.

## Result Envelope

Return the envelope from `docs/workflow/artifact-lifecycle.md` §3, with `stage: STORY_WRITING`
and `skill: so-story-writer`.

`BLOCKED` when: the raw input is too vague to produce a single falsifiable acceptance
criterion even after the interview round, or it describes several unrelated changes that
should be separate Stories. Say which, and propose the split.

## Constraints

- **Never invent** an acceptance criterion, a business rule, a security rule, a store, a
  locale or a currency. Undecidable → `Open questions`.
- Never write a specification, a plan or code. One Story file and one catalog entry.
- Never write `workflow-state.yaml`, `active-story.yaml` or `history.jsonl` — creating a
  Story does not activate it. `/so:start` does that, through `so-orchestrator`.
- Never mark a Story `APPROVED`. It is born `DRAFT`.
- Never fold two unrelated needs into one Story to avoid asking which one is wanted.

## Verification Checklist

- [ ] The id is epic-dotted, free, and matches `story_id_pattern`.
- [ ] `slug` in the front matter matches the filename.
- [ ] `track` is one of `angular` | `server` | `prompt` and is justified by the surface.
- [ ] Every acceptance criterion is observable and could be written as a failing test.
- [ ] Acceptance criteria are numbered `AC-n`.
- [ ] Any store, locale or currency named comes from `STORE_REGISTRY`.
- [ ] If a FROZEN file (§9) would be touched, the Story says so explicitly.
- [ ] Nothing was guessed — every gap is either answered by the user or in `Open questions`.
- [ ] The catalog entry exists with state `NOT_STARTED`.
- [ ] The file is in English.
