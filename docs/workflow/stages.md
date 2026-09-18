# The Delivery Workflow — human-readable overview

**Non-normative.** `stage-map.yaml` is the authority for stage identifiers, order, ownership
and routing. If this page and that file disagree, the file wins and this page is the bug.

## The shape of it

```
  /so:new  ──▶ STORY_WRITING          so-story-writer          raw idea → docs/stories/
               CLARIFICATION          so-clarifier             what the Story does not say
               SPECIFICATION          so-spec-writer
               SPEC_REVIEW            so-spec-reviewer
  ┌────────▶ ★ HUMAN_SPEC_APPROVAL    ← /so:approve            NO CODE EXISTS BEFORE HERE
  │            IMPACT_ANALYSIS        so-impact-analyzer       blast radius
  │            ARCHITECTURE_PLANNING  so-planner               domain/prompt/component design
  │            IMPLEMENTATION_PLANNING so-implementation-planner
  │            PLAN_REVIEW            so-plan-reviewer
  │          ★ HUMAN_PLAN_APPROVAL    ← /so:approve
  │            TEST_WRITING           so-test-writer           tests that FAIL
  │            IMPLEMENTATION         so-builder               make them pass
  │            QUALITY_GATE           so-gate-enforcer         lint/test/coverage/build/arch-guard
  │            IMPLEMENTATION_VERIFICATION so-implementation-verifier
  │            SECURITY_REVIEW        so-security-reviewer
  │            RECONCILIATION         so-reconciliation-reviewer  did we build what the spec said
  └──────── ★ HUMAN_PR_APPROVAL      ← /so:approve
               PR_PREPARATION         so-pr-preparer           drafts only
               PR_CREATION            so-pr-creator            the ONLY stage that touches the remote
             ★ READY_FOR_PR           ← /so:approve
             ★ COMPLETED              ← /so:approve            merge VERIFIED, not claimed
               ARCHIVED               terminal, via /so:archive
```

★ = the workflow stops for a person. `/so:next` never passes one.

## Commands

| Command | What it does |
|---|---|
| `/so:new <raw text>` | Turn an idea, bug or piece of feedback into a Story file. |
| `/so:start <StoryId>` | Activate a Story and initialise its workflow state. |
| `/so:next` | Advance through as many consecutive automated stages as possible, stopping at the first human gate, `BLOCKED`, or an exhausted loop-back. |
| `/so:status` | Read-only report: current stage, inputs/outputs, stale inputs, blockers, the pending gate and its exact approval command. |
| `/so:approve [comment]` | Record human approval of the current gate. |
| `/so:reject <reason>` | Record human rejection; routes to the gate's `on_reject`. |
| `/so:archive` | Consolidate a completed delivery. Only from `COMPLETED`. |

## The three rules people get wrong

**A review skill returning `PASS` is not human approval.** `PASS` is a verdict about a stage;
approval is a human decision recorded by `/so:approve`. Never infer one from the other, and
never pass a gate automatically — including when asked to advance several stages at once.

**`TEST_WRITING` is supposed to produce failing tests.** A suite that passes at that stage is
evidence the tests do not exercise the new behaviour. Turning them green is
`IMPLEMENTATION`'s job, and turning them green by weakening them is an AGENTS.md §7.7
violation.

**`COMPLETED` verifies the merge against the repository.** A human saying "it's merged" is
not sufficient. This exists because an approval once had to be retracted after the workflow
advanced on an unverified claim while no branch or Pull Request existed at all.

## Loop-backs

A stage returning `CHANGES_REQUIRED` names a **key** from its own `loop_back` map; the
orchestrator resolves the key to a stage. A target attempted **three times** without reaching
`PASS` holds `BLOCKED` for a human decision rather than looping a fourth time.

An unknown key, a retired stage identifier, or any other workflow invariant failure means:
hold, report, name the earliest responsible stage. Never route around it.

## What this workflow does not have

No `API_DESIGN`, `DB_DESIGN` or `DESIGN_REVIEW`. There is no REST contract to design here and
no relational schema — the only database is a single server-side usage-telemetry table with
no migration mechanism. Those concerns are absorbed by `ARCHITECTURE_PLANNING`, which covers
the Zod domain models, the prompt payload contracts and component/service shape in one
artifact. The identifiers are listed in `stage-map.yaml` `retired_identifiers` so a stale
reference to them is caught rather than silently honoured.

No `BACKLOG_SYNC` either: Stories are Docs-as-Code files in this repository, written by
`so-story-writer`, not GitHub Issues pulled by a sync step. A requirement change and the code
implementing it move in the same Pull Request.
