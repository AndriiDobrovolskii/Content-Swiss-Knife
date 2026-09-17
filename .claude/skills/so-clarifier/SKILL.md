---
name: so-clarifier
description: >
  Reads a User Story critically before any specification is written, and surfaces every place
  a specification writer would otherwise have to guess — ambiguous acceptance criteria,
  unstated validation or store/locale scope, undecided behaviour — as an Open Decisions log.
  Use when a Story needs a readiness check ("is this Story ready for a spec?", "what is
  ambiguous about US-x.y?") before handing it to so-spec-writer. Owns the CLARIFICATION stage
  and the clarification_report and open_decisions artifacts. It never answers its own
  questions: its output is a decision log, not a decision. Does not draft a specification
  (so-spec-writer) and does not write the Story itself (so-story-writer).
---

# so-clarifier

## Purpose

This skill sits between "a Story exists" and "a specification gets written." Its job is to
read the Story critically — against this repository's own established rules and vocabulary,
not in isolation — and flag every place a specification writer would otherwise have to guess.

Guessing here is expensive. An invented validation rule or an assumed locale scope that
reaches a specification becomes implementation, and implementation becomes a regression to
unwind later.

**The skill never fills a gap itself.** Its output is a decision log, not a decision.

## Operational Contract

```
Precondition:     The Story exists and matches docs/workflow/active-story.yaml.
Input Artifacts:  story; any existing open_decisions for this Story; README.md; AGENTS.md;
                  src/prompt-core/constants.ts (STORE_REGISTRY);
                  test/render-reconciliation.report.md.
Output Artifacts: clarification_report, open_decisions
Resolve every path from docs/workflow/artifact-paths.yaml. Never hard-code one.
```

## Required context

There is no `docs/product/` here. Read, in this order:

1. **`README.md`** — "What it does", "Supported stores & markets", "How generation works",
   "Tools & modes". The product's own description of itself.
2. **`AGENTS.md`** — §3 architecture rules, §4 the hard HTML acceptance criteria (they are
   product rules, not style), §9 the FROZEN list, §11 the Open Decisions policy this skill
   implements.
3. **`STORE_REGISTRY`** (`src/prompt-core/constants.ts`) — the authority for every store's
   group, currency, languages and image base URL. A Story naming a store, locale or currency
   must agree with it.
4. The target **Story**, including its own `Open questions` section — those are inputs, not
   answers, and each becomes an Open Decision unless the Story or a source above settles it.
5. **`test/render-reconciliation.report.md`** — §3 (which post-processing transforms survive
   the renderer) and §5 (what still blocks the next phase). A Story touching the Doc pipeline
   or the renderer may already be blocked by something recorded there.
6. Any existing **`open_decisions`** for this Story. This run either confirms those were
   resolved or supersedes them; it must never silently drop a still-open item.

## What to analyse

- **Business intent** — actor, trigger and value: stated, or inferred by the reader?
- **Acceptance criteria** — complete, observable, falsifiable? Flag anything of the
  "handles it appropriately" kind; it cannot be tested, so it will be invented later.
- **Store and locale scope** — which of `STORE_REGISTRY` is in play. **uk-UA is special**: it
  is the master artifact every other locale is translated from, so a change there fans out to
  every language. A Story that is silent about this is ambiguous, not "all locales".
- **Generated-HTML impact** — if output HTML changes, which AGENTS.md §4 criteria are in
  play, and whether any of them conflict with what the Story asks for.
- **Prompt impact** — does this require prompt text changes, and do they reach a FROZEN file
  (§9)? If so the pipeline needs to know now, not at implementation.
- **Generation invariants** — a Story touching generation must say what happens to the §4
  invariants it could disturb: spec-count parity, figure/figcaption structure, video survival.
- **Dependencies** — other Stories, fixtures, or corpus coverage this assumes exists.
- **Assumptions** — anything a specification writer would have to silently decide.

## Open Decision detection

When something cannot be reliably inferred from the sources above or the Story itself:

**Do not invent an answer.** Record an Open Decision. Each one states:

1. **The question**, precisely enough to be answerable with one sentence.
2. **Why it cannot be inferred** — what was checked and came up empty. "Checked
   `STORE_REGISTRY`; it has no field for this" is evidence. "Unclear" is not.
3. **The concrete impact of leaving it unresolved** — what a specification writer would
   otherwise have to guess, and what breaks if the guess is wrong.
4. **`blocking: true | false`** — blocking means the next stage cannot proceed without it
   (AGENTS.md §11).

Typical triggers here: locale scope unstated; a store named that is not in the registry; an
acceptance criterion that cannot be observed; a §4 criterion the Story would violate without
saying so; a prompt change whose FROZEN status is unaddressed; error/retry behaviour
unspecified; what happens to already-generated artifacts left open.

## Outputs

Write **both**, always:

- **`open_decisions`** — one entry per unresolved question, in the format above.
- **`clarification_report`** — what is clear, what is ambiguous, and an explicit verdict:
  **Ready for Specification** or **Not Ready — see Open Decisions**.

A Story with zero open decisions still gets both files. An Open Decisions log saying "none
found" is evidence the Story was checked; a missing file is indistinguishable from a skipped
stage.

## Result Envelope

Return the envelope from `artifact-lifecycle.md` §3, `stage: CLARIFICATION`,
`skill: so-clarifier`.

- **`PASS`** — both artifacts written. `PASS` is correct even when Open Decisions were found,
  as long as none is `blocking: true`; non-blocking ones go in `non_blocking_findings`.
- **`BLOCKED`** — at least one Open Decision is `blocking: true`, or the Story is too vague
  to analyse at all. Name them in `blocking_issues`.
- This stage has **no `loop_back` map** in `stage-map.yaml`, so `CHANGES_REQUIRED` has
  nowhere to route. A Story that is wrong rather than merely incomplete — it contradicts the
  registry, or describes several unrelated changes — is `BLOCKED`, reported as needing
  amendment.

## Constraints

- **Never answer your own question.** A plausible inference is still a guess.
- Never write a specification, a plan, tests or code.
- Never edit the Story. A Story that needs changing is reported, not corrected.
- Never drop a still-open decision from a previous run.
- Never mark anything `APPROVED`.
- English in the artifacts; Ukrainian to the user.

## Verification Checklist

- [ ] Both artifacts were written, even if no ambiguity was found.
- [ ] Every ambiguity is either resolved **with a cited source** or logged as an Open
      Decision — none silently dropped.
- [ ] Every Open Decision states the question, what was checked, the impact, and `blocking`.
- [ ] Locale scope was examined explicitly, including whether uk-UA fan-out applies.
- [ ] Every store, locale and currency in the Story was checked against `STORE_REGISTRY`.
- [ ] If generated HTML changes, the AGENTS.md §4 criteria in play are named.
- [ ] If prompt text changes, FROZEN status (§9) is addressed.
- [ ] Still-open decisions from a previous run are carried forward.
- [ ] The report states an explicit readiness verdict.
