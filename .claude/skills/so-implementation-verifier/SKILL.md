---
name: so-implementation-verifier
description: >
  Verifies technical compliance with AGENTS.md for rules no command can check — architecture
  Rule 2 (retrieval separate from generation), the §4 HTML acceptance criteria where the
  prompt or renderer changed, STORE_REGISTRY as the only source of locales and currency, the
  prompt-caching block separation, and that no FROZEN file changed without recorded approval.
  Use after the mechanical gate is green and before security and AC review ("verify US-x.y
  against AGENTS.md", "did we follow the rules"). Owns the IMPLEMENTATION_VERIFICATION stage
  and the verification_report artifact. This is technical/Definition-of-Done compliance —
  "did we follow the rules" — distinct from so-reconciliation-reviewer's "did we build the
  right thing". Reads the diff and reports; never edits code or tests.
---

# so-implementation-verifier

## Purpose

`so-gate-enforcer` proved the commands are green. That is necessary and nowhere near
sufficient: the rules with the worst consequences in this repository have **no automated
check at all**, and a green gate says nothing about them.

This skill reads the actual diff and checks those rules by eye. If it does not catch them,
nothing does.

## Operational Contract

```
Precondition:     QUALITY_GATE returned PASS.
Input Artifacts:  story, specification, implementation_plan, task_breakdown,
                  implementation_report, quality_gate_report.
Output Artifacts: verification_report
Also read:        the actual diff for this Story, and AGENTS.md.
Resolve every artifact path from docs/workflow/artifact-paths.yaml. Never hard-code one.
```

**Read the diff, not the reports.** The reports say what was intended; the diff says what
landed. Every check below is against the diff.

## The checks

### 1. Architecture Rule 2 — retrieval separate from generation

**The single most important check in this skill, because nothing else performs it.**
arch-guard implements Rules 1, 3 and 4 and explicitly not this one; the tests do not cover it;
a green gate is not evidence it holds (AGENTS.md §3, "Known accepted tech debt").

Verify by reading:

- Web search and page fetch go through `RetrievalProvider` / `RetrievalService`, never
  through an LLM call path.
- Generation code does not perform its own fetching, and retrieval code does not call a model.
- URL extraction is done by **fetching the page**, not by searching for it.
- Nothing reintroduces Google Grounding — grounding is Serper only.

State explicitly what you read to reach the verdict. "Checked, holds" without naming the code
paths is not a check.

### 2. AGENTS.md §4 — the HTML acceptance criteria

Required whenever the prompt, the Zod schema, a renderer or the validator changed. For each
§4 criterion in play, confirm against real output or the corpus fixtures — not against the
plan's intention:

- No `itemtype="https://schema.org/Product"` in the description body; only `PropertyValue`,
  `FAQPage`, `HowTo`.
- Space between number and unit (`1.75 mm`, `200 °C`).
- **Spec count on output equals spec count on input**, values and units unchanged.
- Figures: each image in a `<figure>` with a `<figcaption>`, the first `<img>` **without**
  `loading="lazy"` and every later one **with** it, `decoding="async"` on all, no `<figure>`
  nested in a `<p>`, no orphan images, lead-in `<p>` not duplicating the figcaption, `alt` not
  duplicating the figcaption, and the inline style string intact.
- **A video embed present in the input is present in the output**, in every generated
  language, wrapped per the §4 rules with a figcaption in the artifact's own language.
- `meta_title` ≤ 55; `meta_description` ≤ 155 ending in CTA ➔, **with no currency symbol**.
- Non-EN: no anglicisms.
- HTML only, no Markdown; no `<br>` for spacing; `<hr>` after each `</section>`.

**`output-validator.ts`'s `meta-description-currency` rule stays disarmed.** That is
deliberate and pinned by `src/services/seo-currency-wiring.spec.ts`. If the diff arms it,
that is a finding — not an improvement.

### 3. `STORE_REGISTRY` remains the single source of truth

No language list, locale set, currency symbol or image base URL hard-coded anywhere outside
`src/prompt-core/constants.ts`. Search the diff for literal locale codes and currency
characters; `getLangsForStore()` is how `seoLangs` and `transLangs` are derived.

### 4. Prompt-caching block separation

If a prompt builder changed: `systemBlocks` are still separate from `userContent`, and
`cache: true` still marks the cacheable system blocks. Collapsing them breaks Anthropic prompt
caching economics (AGENTS.md §3) and produces no error — exactly the silent failure class.

### 5. FROZEN files (AGENTS.md §9)

Confirm from the diff that none of the five changed. If one did:

- a recorded §9 approval exists in this Story's artifacts, **and**
- `.arch-guard-checksums` was re-baselined in the **same commit** as the edit.

Missing either → `CHANGES_REQUIRED`, highest severity.

### 6. Angular and server conventions

- Standalone components, signals, field-level `inject()`; no `NgModule`; RxJS only at the HTTP
  boundary.
- No SDK import outside `server/providers/`; no prompt string inside a service.
- No secret reachable from the browser bundle, a response body or a log line.
- `server/usage/store.js` schema change, if any, addressed the no-migration reality rather
  than assuming the table is recreated.

### 7. Scope discipline

The diff contains **only** what `task_breakdown` named. Drive-by refactors, renames,
reformatting of untouched files, or deleted comments are §7.8 findings even when the change
itself is an improvement.

## Result Envelope

`stage: IMPLEMENTATION_VERIFICATION`, `skill: so-implementation-verifier`. Keys:
`changes_required` → `IMPLEMENTATION`, `changes_required_plan` → `ARCHITECTURE_PLANNING`.

Use `changes_required_plan` when the code faithfully implements a plan that itself violates a
rule — fixing it in the builder would mean re-deciding the design there.

## Constraints

- Never edit code, tests, fixtures or configuration.
- Never re-run the mechanical gate and call that verification — different job.
- Never accept "the gate is green" as evidence for any check in this document.
- Never arm the disarmed `meta-description-currency` rule, or endorse a diff that does.
- Never mark anything `APPROVED`.
- English in the artifact; Ukrainian to the user.

## Verification Checklist

- [ ] The **diff** was read, not just the reports.
- [ ] Rule 2 was checked by naming the specific code paths examined.
- [ ] Every §4 criterion in play was checked against real output or fixtures.
- [ ] The `meta-description-currency` rule is still disarmed.
- [ ] No locale, currency or image base URL is hard-coded outside `STORE_REGISTRY`.
- [ ] `systemBlocks` / `userContent` separation intact if a prompt builder changed.
- [ ] No FROZEN file changed, or approval **and** same-commit re-baseline both confirmed.
- [ ] No secret can reach the bundle, a response or a log.
- [ ] The diff contains nothing `task_breakdown` did not name.
- [ ] The report states which checks are review-only and would not have been caught otherwise.
