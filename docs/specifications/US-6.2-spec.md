---
artifact: specification
story: US-6.2
version: 2
status: APPROVED
owner: so-spec-writer
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-07T00:00:00Z
supersedes: docs/specifications/US-6.2-spec.md#1
inputs_consumed:
  - key: story
    version: 3
  - key: clarification_report
    version: 3
  - key: open_decisions
    version: 3
open_decisions_blocking: false
---

# Specification: US-6.2 — Keep `<b>` and `<strong>` exactly as supplied

## Summary

After this change the shared HTML cleaner no longer converts `<b>` into `<strong>`: every `<b>` and every `<strong>` that
enters `cleanHtmlStructure` leaves under its own tag name, attributes such as `class` included, on both the LLM Optimizer
path and the no-LLM Fast path. The FROZEN master system prompt stops reserving `<strong>` for brands / main model / core
USPs and instead states that `<b>` is the tag for all emphasis. `src/prompts/optimizer.ts` is not modified.

## Background

A content operator reported that optimizing an existing description (AgiBot X2 EDU, evidence
`Knowledge/Issues/1/strong-tags.txt`) turns every `<b>` into `<strong>`. Two contributors were verified read-only:

- `cleanHtmlStructure` (`src/utils/html-cleaner.ts`) replaces every `<b>` element with a new `<strong>` element, copying only
  `innerHTML` (block at lines 164-169, comment "Replace all `<b>` tags with `<strong>` tags"). It is called from `optimize()`
  (LLM output) and from `cleanStructureOnly()` (Fast path, raw input) in `src/services/content-orchestrator.service.ts`.
- `src/prompt-core/master-system-prompt.ts` lines 475-477 (inside `[FORMAT]`) tell the model to reserve `<strong>` for
  brands / main model / core USPs.

Human decisions recorded in Story v3 (2026-10-06): the `<b>` to `<strong>` block in the cleaner is deleted with no
compensating logic; the human gives explicit AGENTS.md section 9 permission to modify the FROZEN
`src/prompt-core/master-system-prompt.ts`; `src/prompts/optimizer.ts` receives no override.

Other verified facts: heading hygiene in the cleaner unwraps `strong, b, span` inside `h2`/`h3`/`h4` (lines 118-120); the
generic microdata strip removes `itemscope`, `itemtype` and `itemprop` (lines 279-283) and not `class`;
`MASTER_SYSTEM_PROMPT` is sent by Task A (`task-a.ts`), Task C (`task-c.ts`) and the Optimizer (`optimizer.ts`), and by the
Doc pipeline through `buildPromptA`.

## Scope

| | |
|---|---|
| **Stores** | All values of `STORE_REGISTRY` (`src/prompt-core/constants.ts`). No store, locale or currency is named or changed. |
| **Locales** | All `STORE_REGISTRY` locales. The cleaner is locale-independent. The master prompt is shared text: the changed wording reaches the uk-UA master (Task A), every locale translated from it (Task C), the Optimizer and the Doc pipeline. Descriptions already generated keep their existing tags; nothing is regenerated. |
| **Track** | angular (cleaner) and prompt (FROZEN master prompt, prompt specs, golden fixture) |
| **FROZEN file edited** | `src/prompt-core/master-system-prompt.ts` only, under the human's explicit AGENTS.md section 9 permission recorded in Story v3 (2026-10-06). `src/prompts/task-a.ts`, `task-b.ts`, `task-c.ts` and `src/utils/output-validator.ts` are not edited. |
| **Baseline** | The FROZEN edit requires `bash arch-guard.sh --rebaseline`, with the updated `.arch-guard-checksums` committed in the same commit as the edit (AGENTS.md section 9). |

## Functional requirements

### FR-1: `<b>` survives the cleaner as `<b>`

When HTML containing `<b>X</b>` outside `h2`, `h3` and `h4` is passed through `cleanHtmlStructure`, the output contains
`<b>X</b>` and contains no `<strong>` element.

**Failure path:** input that contains no `<strong>` produces no `<strong>` element in the output (the cleaner introduces
none).

### FR-2: `<strong>` survives the cleaner as `<strong>`

When HTML containing `<strong>X</strong>` outside `h2`, `h3` and `h4` is passed through `cleanHtmlStructure`, the output
contains `<strong>X</strong>` and contains no `<b>` element.

**Failure path:** input that contains no `<b>` produces no `<b>` element in the output.

### FR-3: Mixed input keeps both element counts

For an input containing both `<b>` and `<strong>` elements, the output of `cleanHtmlStructure` contains exactly as many `<b>`
elements and exactly as many `<strong>` elements as the input, counting only elements outside `h2`, `h3` and `h4`.

**Failure path:** a count mismatch in either tag is a defect.

Note: nested bold, empty bold elements, and bold inside non-list elements (for example `<p>`, `<td>`, `<figcaption>`) pass
through the cleaner unchanged in tag name; they are covered by FR-1 to FR-3 and need no separate requirement.

### FR-4: Master prompt no longer reserves `<strong>` and states `<b>` for all emphasis

The exported `MASTER_SYSTEM_PROMPT` no longer contains the sentence that reserves `<strong>` for brands / main model / core
USPs, and its `[FORMAT]` section states that `<b>` is the tag for all emphasis (brands, models, specifications). Contract
quoted for approval (assumption A-4, OD-10):

- Old text, exactly as in the file (line break after "500"):
  `Reserve <strong> for brands / main model / core USPs at a density of 2–3 per 500` + newline +
  `characters maximum; use <b> for inline spec scannability.`
- New text: `Use <b> for all emphasis (brands, models, specifications).`

The 2-3 per 500 characters density cap is dropped with the old text. A test asserts, against the exported prompt text, that
the old sentence is absent and the new sentence is present inside the `[FORMAT]` section.

**Failure path:** if the old sentence is still present, or the new sentence is absent from `[FORMAT]`, the test fails.

### FR-5: Heading hygiene is unchanged

Inside `h2`, `h3` and `h4`, `<b>` and `<strong>` elements are still unwrapped to their plain text by `cleanHtmlStructure`; the
heading text is retained and no bold element remains inside a heading.

**Failure path:** a bold element left inside a heading is a defect.

### FR-6: The Fast path preserves both tags

When the Fast path `cleanStructureOnly()` receives raw input containing `<b>X</b>` and `<strong>Y</strong>`, the output
contains `<b>X</b>` and `<strong>Y</strong>` with no conversion in either direction.

**Failure path:** no LLM is involved on this path, so the result is determined by the input alone; any conversion is a defect.

### FR-7: Bold tags keep their `class` attribute

When `<b class="highlight">X</b>` or `<strong class="highlight">Y</strong>` is passed through `cleanHtmlStructure`, the output
element keeps `class="highlight"` and keeps its tag name (`b` stays `b`, `strong` stays `strong`).

**Failure path:** attributes other than `class` on bold tags are not covered (see Out of scope and OD-8).

### FR-8: The FROZEN diff is limited to the emphasis sentence

The diff of `src/prompt-core/master-system-prompt.ts` against `main` replaces exactly the old text quoted in FR-4 with the new
text quoted in FR-4; every other byte of the file is identical, including the sentences that follow
(`Emit only tags that wrap content. Keep a high text-to-HTML ratio.`). `src/prompts/optimizer.ts` has no diff against `main`.

**Failure path:** any other changed byte in the FROZEN file, or any diff in `src/prompts/optimizer.ts`, fails this requirement.

### FR-9: The FROZEN baseline is re-recorded in the same commit

After the FROZEN edit, `bash arch-guard.sh` exits 0, and the updated `.arch-guard-checksums` is in the same commit as the
`master-system-prompt.ts` edit. The only checksum that changes is that of `src/prompt-core/master-system-prompt.ts`.

**Failure path:** a checksum change for any other FROZEN file, a baseline in a different commit, or a non-zero arch-guard exit
fails this requirement.

### FR-10: Existing tests follow the new wording

Every existing test or fixture that embeds or asserts the removed `<strong>` sentence is updated to the new wording of FR-4,
and `npm run test:logic` is green, with no test deleted or weakened otherwise. Known case (OD-12, assumption A-5):
`test/fixtures/golden/full-description-prompts.json` embeds the old sentence and
`src/prompts/full-description.golden.spec.ts` asserts byte equality against it; the fixture is regenerated so that its only
change is the single sentence of FR-4, shown in the diff.

**Failure path:** a failing `npm run test:logic`, a deleted or weakened test, or a fixture diff beyond the FR-4 sentence fails
this requirement.

## Generated-HTML requirements (AGENTS.md section 4)

The one criterion in play, quoted from AGENTS.md section 4:

> "Images wrapped in `<figure>` (inline style `display: block; width: max-content; max-width: 100%; margin: 4px auto;`) with a
> `<figcaption>` (a `<b>` lead-in label distinct from the alt + description) and `decoding="async"`."

This Story neither extends nor weakens it; the new master wording (`<b>` for all emphasis) is consistent with it. This is a
constraint, not a new requirement: no FR is added for it. A figcaption `<strong>` lead-in that is present in raw input
passes through the cleaner unchanged, and nothing deterministic converts it (assumption A-3, OD-9). The other section 4
criteria (spec-count parity, first-image-eager / rest-lazy, figure structure, video survival, `meta_title` / `meta_description`)
are not changed by a bold tag-name change and stay covered by the existing regression suites (NFR-3).

## Non-functional requirements

- **NFR-1 (determinism):** FR-1 to FR-3, FR-5 to FR-7 are verified by unit tests on the cleaner with fixed input strings: no
  model call, no randomness, no wall-clock dependence. FR-4 is verified by assertions on the exported prompt text, not on
  model output. FR-8 and FR-9 are verified by `git diff` against `main` and `bash arch-guard.sh`.
- **NFR-2 (provider independence and caching):** no behaviour depends on which provider is active (AGENTS.md section 3 Rule 1).
  `systemBlocks` are not collapsed into `userContent`. The cached master block changes once, by the single sentence of FR-4.
- **NFR-3 (no regression):** both test runners and the AGENTS.md section 6 gate that passed before this change still pass,
  including heading hygiene, figure/figcaption and table handling through `cleanHtmlStructure`.
- **NFR-4 (FROZEN containment):** besides the single permitted edit of FR-8, no FROZEN file has a diff.
- **NFR-5 (retrieval and secrets):** retrieval (search, page fetch) stays out of generation (section 3 Rule 2) and no secret
  reaches the browser bundle (section 3 Rule 4); this Story touches neither.

## Out of scope

- Choosing a single canonical bold tag for the whole product beyond the master prompt's emphasis rule.
- Changing how many bold tags the output contains beyond the emphasis-tag wording; the dropped density cap is an assumption
  (A-4), not a new limit.
- Any override or tag-preservation clause in `src/prompts/optimizer.ts` (rejected by the human).
- Editing any FROZEN file other than `src/prompt-core/master-system-prompt.ts`, in particular `output-validator.ts`.
- The Doc pipeline renderer, the Translator and the HTML editor, which do not call `cleanHtmlStructure`.
- `src/prompts/task-a-doc.ts` and `src/prompts/simplified-template-blocks.ts`, which still restate "Reserve `<strong>`" (A-6).
- Stale comments and reports that mention the old sentence (`description-doc.ts`, `description-doc.schema.ts`,
  `render-description.spec.ts` comment, `test/render-reconciliation.report.md`) (A-6).
- Deterministic enforcement of the figcaption `<b>` lead-in.
- Preserving attributes on bold tags other than `class`, including `itemprop` (dropped by the existing microdata strip).
- Proving the live model emits `<b>`: FR-4 verifies prompt text only. A manual Optimizer and generator run on
  `Knowledge/Issues/1/strong-tags.txt` is expected as release evidence, not as an automated test.
- The HTML editor iframe defect (US-6.1).

## Open questions

All are non-blocking (`open_decisions_blocking: false`), recorded as labelled assumptions; none is resolved by this
Specification and the human may overturn any at HUMAN_SPEC_APPROVAL.

- **OD-8 (assumption A-2):** `itemprop` on a bold tag is dropped by the existing microdata strip. Assumed: FR-7 covers `class`
  only; this existing behaviour is out of scope.
- **OD-9 (assumption A-3):** figcaption `<strong>` lead-in is not deterministically normalised (the Optimizer path does not
  call the FROZEN `output-validator.ts`). Assumed: accepted limitation; the new master wording is the only enforcement. The same
  assumption accepts that a `<strong>` inside `<figcaption>` passes through the cleaner (OD-9 figcaption pass-through).
- **OD-10 (assumption A-4):** exact replacement boundary of the `[FORMAT]` sentence and the density cap. Assumed: the old text
  quoted in FR-4 is replaced by the new text quoted in FR-4; the density cap is dropped; the two trailing sentences stay
  byte-identical.
- **OD-11 (assumption A-6):** other prompts and comments that restate the old rule (`task-a-doc.ts:96`,
  `simplified-template-blocks.ts:127`, comments) are left untouched; the residual inconsistency is out of scope.
- **OD-12 (assumption A-5):** the golden fixture `test/fixtures/golden/full-description-prompts.json` embeds the old sentence
  and `full-description.golden.spec.ts` asserts byte equality. Assumed: the fixture is regenerated with only the FR-4 sentence
  changed (FR-10).
- **A-1 (carried, no OD):** whether the live model obeys the new wording is not provable by tests; manual release run only.

## Traceability matrix

| Acceptance criterion | Satisfied by | Notes |
|---|---|---|
| AC-1 | FR-1 | |
| AC-2 | FR-2 | |
| AC-3 | FR-3 | |
| AC-4 | FR-4 | master prompt text contract; OD-10 |
| AC-5 | FR-5 | |
| AC-6 | FR-6 | |
| AC-7 | FR-7 | `class` only; OD-8 |
| AC-8 | FR-8 | exact boundary quoted in FR-4; OD-10 |
| AC-9 | FR-9 | AGENTS.md section 9 |
| AC-10 | FR-10 | OD-12 |

Every FR traces to at least one AC; NFR-1 to NFR-5 are constraints and add no behaviour.
