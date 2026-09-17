---
artifact: specification
story: {{US-x.y}}
version: 1
status: DRAFT
owner: so-spec-writer
created_at: {{ISO-8601 UTC}}
updated_at: {{ISO-8601 UTC}}
supersedes: null
inputs_consumed:
  - key: story
    version: {{n}}
  - key: clarification_report
    version: {{n}}
  - key: open_decisions
    version: {{n}}
open_decisions_blocking: false
---

# Specification: {{US-x.y}} — {{Title}}

## Summary

{{Two or three sentences: what will be true when this is done. No design, no file names.}}

## Background

{{Why this is being specified now, and the evidence behind it — a failed generation, a review
finding, a corpus fixture, a section of test/render-reconciliation.report.md.}}

## Scope

| | |
|---|---|
| **Stores** | {{STORE_REGISTRY values only}} |
| **Locales** | {{explicit. If uk-UA is affected, state what happens to every derived locale}} |
| **Track** | {{angular / server / prompt}} |
| **FROZEN files (AGENTS.md §9)** | {{none — or named, with the §9 stop acknowledged}} |

## Functional requirements

### FR-1: {{short descriptive title}}

{{The behaviour, present tense, falsifiable. Name the actor or trigger if it depends on one.}}

**Failure path:** {{what happens when it does not work — or "n/a, no failure path" with why}}

### FR-2: {{short descriptive title}}

{{…}}

## Generated-HTML requirements (AGENTS.md §4)

> Only when the Story changes generated HTML. Quote each criterion in play **verbatim** and
> cite §4 — including the ones that must remain true, not only the ones being changed.
> Paraphrasing a production-calibrated criterion is how it silently changes.

### FR-n: {{criterion name}}

> "{{verbatim quote from AGENTS.md §4}}"

{{What this Story does to it: preserves it / extends it / is constrained by it.}}

## Non-functional requirements

Only what actually constrains this Story.

- **NFR-1:** {{e.g. systemBlocks must not be collapsed into userContent — AGENTS.md §3}}
- **NFR-2:** {{e.g. no behaviour may depend on the active provider — §3 Rule 1}}

## Out of scope

Written even when obvious. This is what `so-plan-reviewer` checks scope creep against.

- {{…}}

## Open questions

{{Open Decisions still recorded against this Story, and their `blocking` status. If the user
explicitly accepted a "Not Ready" risk to proceed, record that acceptance here with what was
accepted.}}

- {{none — or the list}}

## Traceability matrix

Every `AC-n` from the Story maps to at least one `FR-n`. An AC with no FR is a gap; an FR
with no AC is scope creep.

| Acceptance criterion | Satisfied by | Notes |
|---|---|---|
| AC-1 | FR-1, FR-3 | |
| AC-2 | FR-2 | |
