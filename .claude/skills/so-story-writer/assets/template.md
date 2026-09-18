---
artifact: story
story: {{US-x.y}}
slug: {{lowercase-kebab-matching-the-filename}}
title: {{One line, English}}
track: {{angular | server | prompt}}
version: 1
status: DRAFT
owner: so-story-writer
created_at: {{ISO-8601 UTC}}
updated_at: {{ISO-8601 UTC}}
---

# {{US-x.y}} — {{Title}}

## Story

As a **{{actor — a content operator running a generation, an end reader of the product page,
a maintainer}}**,
I want **{{the capability}}**,
so that **{{the outcome that makes it worth building}}**.

> For a bug, replace this section with **Observed**, **Expected** and **Reproduction**
> instead — same rigour, different shape.

## Context

{{Why now. What prompted this: a failed generation, a review finding, a user report. Link the
evidence — a corpus fixture, a report section, a prior Story. Two or three sentences.}}

## Scope

| | |
|---|---|
| **Stores** | {{all of STORE_REGISTRY / a group / named stores — registry values only}} |
| **Locales** | {{all / uk-UA master only / named locales. uk-UA changes fan out to every language}} |
| **Surface** | {{the files or subsystems this is expected to reach}} |
| **Touches FROZEN files?** | {{no — or YES, naming which; that is an AGENTS.md §9 stop}} |
| **Touches generated HTML?** | {{no — or yes, naming the AGENTS.md §4 criteria in play}} |

## Acceptance criteria

Each must be observable and falsifiable — something `so-test-writer` can write a failing test
against without inventing anything.

- **AC-1:** {{…}}
- **AC-2:** {{…}}
- **AC-3:** {{…}}

## Out of scope

- {{What this Story deliberately does not do, so the plan does not grow into it.}}

## Open questions

Anything that could not be answered. Not a placeholder for work not done — a real question,
with what was checked. `so-clarifier` formalises these into the Open Decisions log.

- **Q1:** {{the question}}
  - Checked: {{what was consulted and came up empty}}
  - Impact if unresolved: {{what a specification writer would otherwise have to assume}}

## References

- {{README.md section, AGENTS.md section, corpus fixture, prior Story, report section}}
