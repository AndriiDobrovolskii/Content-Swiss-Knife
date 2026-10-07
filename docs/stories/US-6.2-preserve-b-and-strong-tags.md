---
artifact: story
story: US-6.2
slug: preserve-b-and-strong-tags
title: Stop rewriting <b> into <strong>: remove the cleaner conversion and make the master prompt use <b> for all emphasis
track: angular
version: 3
status: DRAFT
owner: so-story-writer
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T00:00:00Z
---

# US-6.2 — Keep `<b>` and `<strong>` exactly as supplied

## Story

> Bug Story — **Observed / Expected / Reproduction** replace the usual actor sentence.

**Actor:** a content operator running the optimizer on an existing description.

### Observed

When a description is optimized through the LLM pipeline, every `<b>` in the input comes out as
`<strong>`. Input (from the report): `<p><b>AgiBot X2 EDU —</b> is a humanoid robot …</p>` and
`<li><b>Modular design.</b> …</li>`; output: `<p><strong>AgiBot X2 EDU</strong> — humanoid robot …`
and `<li><strong>Total degrees of freedom: 29</strong> — …</li>`.

### Expected

The bold tag used on input is the bold tag on output: `<b>` stays `<b>`, `<strong>` stays
`<strong>`. No conversion in either direction.

### Reproduction

1. Run the optimizer with the HTML in `Knowledge/Issues/1/strong-tags.txt` as the original
   description. 2. Inspect the result: no `<b>` remains, `<strong>` is used instead.

## Context

Reported by the content operator (AgiBot X2 EDU, en input). Evidence:
`Knowledge/Issues/1/strong-tags.txt`. A deterministic conversion exists at
`src/utils/html-cleaner.ts` ("Replace all `<b>` tags with `<strong>` tags"), and the HTML editor
deliberately emits `<b>` to avoid rewriting existing markup (`extensions/index.ts`), so the two
disagree. Clarification found that both layers contribute: the cleaner rewrites every `<b>` unconditionally
(`html-cleaner.ts:164-169`, copying `innerHTML` only), and the FROZEN `master-system-prompt.ts:475-476`
also tells the model to reserve `<strong>` for brands / main model / core USPs. `cleanHtmlStructure` is called from
`optimize()` (LLM output) and from `cleanStructureOnly()` (the no-LLM Fast path, on raw input), so both paths have the defect.

Human decisions (2026-10-06, on rejecting plan v1; they supersede the earlier decision to leave the FROZEN prompt alone
and to add an override in `optimizer.ts`): do **not** add overrides to `src/prompts/optimizer.ts`. The human gives the
explicit AGENTS.md §9 permission to modify the FROZEN `src/prompt-core/master-system-prompt.ts`: replace the sentence
that reserves `<strong>` for brands / main model / core USPs (lines 475-476, inside `[FORMAT]`) with a rule that uses
`<b>` for all emphasis (brands, models, specifications). In `src/utils/html-cleaner.ts` the `<b>` → `<strong>` block
(lines 164-169) is simply deleted, with no compensating logic. After the FROZEN edit `bash arch-guard.sh --rebaseline`
is run and the re-baselined `.arch-guard-checksums` is committed in the same commit as the edit (AGENTS.md §9). Both
`optimize()` and the Fast path are in scope; the HTML editor and the renderer are out of scope. AGENTS.md §4
(figcaption lead-in is `<b>`) is consistent with the new rule.

## Scope

| | |
|---|---|
| **Stores** | all of STORE_REGISTRY |
| **Locales** | all of STORE_REGISTRY locales. The master prompt is shared text, so the edit reaches every pipeline that sends `MASTER_SYSTEM_PROMPT`; which of those pipelines is affected is for impact analysis to list |
| **Surface** | `src/utils/html-cleaner.ts` (shared by `optimize()` and the Fast-path `cleanStructureOnly()`), `src/prompt-core/master-system-prompt.ts` (FROZEN, `[FORMAT]` sentence at lines 475-476), the prompt specs that assert that sentence, and `.arch-guard-checksums` |
| **Touches FROZEN files?** | **YES** — `src/prompt-core/master-system-prompt.ts`, with the human's explicit AGENTS.md §9 permission recorded above (2026-10-06). Nothing else FROZEN: `output-validator.ts`, `task-a.ts`, `task-b.ts`, `task-c.ts` stay unedited. Requires `bash arch-guard.sh --rebaseline` and the checksum file in the same commit |
| **Touches generated HTML?** | yes — bold tags in generated and optimized descriptions; AGENTS.md §4 figcaption `<b>` lead-in unchanged |

## Acceptance criteria

- **AC-1:** HTML containing `<b>X</b>` passed through `cleanHtmlStructure` yields `<b>X</b>` with
  no `<strong>` element in the output.
- **AC-2:** HTML containing `<strong>X</strong>` passed through `cleanHtmlStructure` yields
  `<strong>X</strong>` with no `<b>` element in the output.
- **AC-3:** For an input with both tags mixed, the output of `cleanHtmlStructure` has the same number
  of `<b>` elements and the same number of `<strong>` elements as the input, counting only elements
  outside `<h2>`, `<h3>` and `<h4>`.
- **AC-4 (master prompt contract):** `MASTER_SYSTEM_PROMPT` no longer contains the sentence that reserves `<strong>` for
  brands / main model / core USPs, and its `[FORMAT]` section states that `<b>` is the tag for all emphasis (brands,
  models, specifications). A test asserts both against the exported prompt text.
- **AC-5:** Inside `<h2>`, `<h3>` and `<h4>` bold tags are still unwrapped to plain text
  (existing heading hygiene unchanged).
- **AC-6:** The Fast path `cleanStructureOnly()` on raw input containing `<b>X</b>` and `<strong>Y</strong>` returns
  both unchanged (no conversion), the same behaviour as AC-1/AC-2 through the shared cleaner.
- **AC-7:** `<b class="highlight">X</b>` and `<strong class="highlight">Y</strong>` passed through `cleanHtmlStructure`
  keep their `class` attribute and their tag name.
- **AC-8 (minimal FROZEN diff):** The diff of `src/prompt-core/master-system-prompt.ts` against `main` changes only
  the `[FORMAT]` emphasis sentence from AC-4; every other line is byte-identical. `src/prompts/optimizer.ts` is not
  modified.
- **AC-9 (FROZEN baseline):** `bash arch-guard.sh` exits 0 after `--rebaseline`, and the updated
  `.arch-guard-checksums` is in the same commit as the `master-system-prompt.ts` edit.
- **AC-10 (existing specs):** Every existing prompt spec that asserted the removed `<strong>` sentence is updated to the
  new wording, and `npm run test:logic` is green with no test deleted or weakened otherwise.

## Out of scope

- Choosing a single canonical bold tag for the whole product beyond the master prompt's emphasis rule.
- Changing how many bold tags the output contains beyond the emphasis-tag wording (see Q1 on the density cap).
- Adding any override or tag-preservation clause to `src/prompts/optimizer.ts` (explicitly rejected by the human).
- Editing any FROZEN file other than `src/prompt-core/master-system-prompt.ts`; in particular `output-validator.ts`.
- The Doc pipeline renderer (`render-description.ts`), the Translator and the HTML editor, which do not call
  `cleanHtmlStructure`.
- Proving the live model emits `<b>`: AC-4 verifies the prompt text, not model output. A manual run of the Optimizer
  and the generator on `Knowledge/Issues/1/strong-tags.txt` is expected as release evidence, not as an automated test.
- The HTML editor iframe defect (US-6.1).

## Open questions

- **Q1:** The replaced sentence also carried a density cap ("`<strong>` ... at a density of 2–3 per 500 characters
  maximum; use `<b>` for inline spec scannability"). Does a cap carry over to the new `<b>`-for-all-emphasis rule, and
  are the trailing sentences ("Emit only tags that wrap content. Keep a high text-to-HTML ratio.") kept verbatim?
  - Checked: `master-system-prompt.ts:475-477`; the human's instruction names only the `<strong>` rule.
  - Impact if unresolved: a specification would have to assume the density cap is dropped and the two trailing
    sentences stay unchanged.
- **Q2:** Does any other step in `cleanHtmlStructure` drop attributes on `<b>`/`<strong>` (AC-7)?
  - Checked: removing the `innerHTML`-copy rewrite stops it dropping attributes there; clarification found the cleaner
    strips `itemscope`, `itemtype` and `itemprop` (`html-cleaner.ts:279-283`) and no `class`.
  - Impact if unresolved: an `itemprop` on a bold tag is still dropped, which AC-7 does not cover.
- **Q3:** An input `<strong>` lead-in in a `<figcaption>` stays `<strong>` through the cleaner (AC-2, AC-6), and nothing
  deterministic converts it to `<b>`: the FROZEN `output-validator.ts` matches the literal `<b>` only and is not called on
  the Optimizer path. The master prompt says `<b>` now, but the Fast path has no model.
  - Checked: clarification report US-6.2 (OD-6, OD-9).
  - Impact if unresolved: a figcaption `<strong>` can reach the output on the Fast path; accepted as a limitation.
- **Q4:** Which pipelines send `MASTER_SYSTEM_PROMPT` and therefore change behaviour (legacy Task A, Optimizer,
  Translator, Doc pipeline), and does any stored fixture, golden or corpus expectation embed the old sentence?
  - Checked: spec files referencing `MASTER_SYSTEM_PROMPT` exist (`master-system-prompt*.spec.ts`,
    `optimizer.spec.ts`, `task-a*.spec.ts`, `output-integrity-wiring.spec.ts`, `render-description.spec.ts`,
    `constants.spec.ts`); contents not read.
  - Impact if unresolved: impact analysis would have to enumerate them; a golden prompt file may need regeneration.

## References

- `Knowledge/Issues/1/strong-tags.txt`
- `src/utils/html-cleaner.ts`, `src/prompt-core/master-system-prompt.ts` (FROZEN, §9 permission above), `src/prompts/optimizer.ts` (not modified)
- `src/app/components/html-editor/extensions/index.ts`
- `docs/evidence/US-6.2-clarification-report.md`, `docs/decisions/US-6.2-open-decisions.md` (v1, resolved here by human decision)
