---
artifact: plan_review
story: US-6.1
version: 2
status: APPROVED
owner: so-plan-reviewer
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T13:00:00Z
supersedes: docs/reviews/plans/US-6.1-plan-review.md#1
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
open_decisions_blocking: false
---

# Plan Review (re-review, v2): US-6.1 — Preserve a pasted YouTube/Vimeo iframe and its wrapper divs in the HTML editor

**Verdict:** PASS
**Loop-back:** n/a

> `PASS` here is **not** human approval. Only `/so:approve` records that (AGENTS.md §10).

## Summary

Review v1 (APPROVED) covered plan/tasks v1 and is stale. This v2 re-reviews plan v2 and task breakdown v2 against
Specification v5 (APPROVED), Story v4 and Impact Analysis v1; all five inputs are current, none SUPERSEDED. The one
substantive change is a narrow `genericBlock.renderHTML` edit (wrapper `style` written via `setAttribute`), folded
into T3. I verified against the code that the v1 premise was false, that the proposed edit is sound, that
`generic-block-node.ts` is not FROZEN, and that the edit does not drift the Specification scope. Nothing else in the
plan regressed. T1 and T2 are unchanged and already committed (58d8335, 770c61a).

## Independent verification of the v2 change

1. **v1 premise is false (confirmed).** `generic-block-node.ts` `renderHTML` returns the spec
   `[tagName, mergeAttributes(HTMLAttributes), 0]`. In `node_modules/prosemirror-model/src/to_dom.ts` line 220,
   `renderSpec` handles `style` as `dom.style.cssText = attrs[name]` (every other attribute uses `setAttribute`,
   line 221). The CSSOM re-serialises the value, so `margin: 0 auto` becomes `margin: 0px auto`, which breaks
   FR-2/AC-2 (verbatim wrapper `style`) for N = 2 and 3. `mergeAttributes` with a single object leaves `style`
   untouched, so the loss happens at the DOMSerializer step, exactly where the plan locates it.
2. **The edit is sound.** ProseMirror's `renderSpec` accepts a `{ dom, contentDOM }` output spec, so building the
   element directly, writing non-`style` attributes as before, writing `style` with `setAttribute('style', value)` and
   returning `{ dom, contentDOM: dom }` is a supported shape. Attribute schema, `parseHTML`, tag-name selection and the
   content hole are unchanged. The `itemscope` attribute is rendered through `booleanAttr()` into `HTMLAttributes`
   (`itemscope=""`), so a loop over `HTMLAttributes` preserves it. The builder's reverted experiment (104 html-editor
   tests green) is recorded in the plan; I did not re-run it.
3. **Not FROZEN.** AGENTS.md section 9 FROZEN list and `arch-guard.sh` `FROZEN_FILES` contain only `task-a/b/c.ts`,
   `master-system-prompt.ts` and `output-validator.ts`; `generic-block-node.ts` appears in neither, and `AGENTS.md`
   never mentions it. No section 9 stop is required.
4. **No scope drift.** The file is inside the Specification's Surface (`src/app/components/html-editor/**`). It is
   listed in Impact Analysis v1 (line 56, "its `style` attr is what FR-2 requires to survive") as a re-verify file,
   so it was surveyed, not new. The edit serves FR-2 directly. None of the Specification's *Out of scope* items is
   touched: no markup normalisation or div-to-figure conversion (rejected alternative 3 is explicitly distinguished
   from the D6 serialisation fix), no new hosts, no US-6.2 work, no prompt/renderer change, no parity-comparison
   change, `isVideoSrc` untouched.

## 1. Specification coverage (re-derived, both directions)

| FR | Reached by task(s) | Verdict |
|---|---|---|
| FR-1 | T3 (node, N = 1, 2, 3) | covered |
| FR-2 | T3 (block child of `genericBlock` plus the `style` write fix; N = 2, 3 verbatim `margin: 0 auto` assertion) | covered; v2 closes the gap v1 had |
| FR-3, FR-13 | T3 (copy-parity cases); T2 wiring | covered |
| FR-4, FR-5 | T3 | covered |
| FR-6 | T1 (figure skip), T3 (figure-parent guard, existing test unmodified) | covered |
| FR-7, FR-8, FR-9 | T1 | covered |
| FR-10, FR-11 | T3 | covered |
| FR-12 | T2 | covered |
| NFR-1, NFR-2 | T1 | covered |
| NFR-3 | none by design | clear |

AC-1 to AC-9 all reachable (AC-1 FR-1, AC-2 FR-2, AC-3 FR-3, AC-4 FR-4, AC-5 FR-5, AC-6 FR-6, AC-7 FR-7/8/9,
AC-8 FR-10/11, AC-9 FR-12/13).

Task to plan item: T1 -> D3/D9/D8; T2 -> D3 wiring, D6 component, D9; T3 -> D6 node, registration and the
`genericBlock.renderHTML` edit. No task traces to nothing. Scope creep against *Out of scope*, checked by name:
**clear** (see verification item 4). `width`/`height`/`frameborder` carried on the node remain attribute preservation
under unspecified A-4.

## 2. FROZEN files (AGENTS.md §9)

| Task | Frozen file touched | §9 stop present? | Sibling-file pattern? | Verdict |
|---|---|---|---|---|
| T1 | none | n/a | yes (new `editor-html-pipeline.ts`) | ok |
| T2 | none | n/a | n/a | ok |
| T3 | none (`generic-block-node.ts` verified not FROZEN) | n/a | yes (new `embed-iframe-node.ts`) | ok |

The plan assumes no approval it lacks. **Clear.**

## 3. Architecture rules (AGENTS.md §3)

Rules 1, 3, 4 clear (no SDK, prompt text or secret touched). **Rule 2** checked deliberately by reading the plan:
nothing retrieves or generates; editor-only change. Rule 5: figure path guarded in both filter and node; the
`genericBlock` edit is limited to the `style` write path and is guarded by named regression specs (see axis 5 and
non-blocking finding 1). `STORE_REGISTRY` remains the only source of locales and currency (the host allow-list is a
security list, not a locale or currency). `systemBlocks` untouched. **Clear.**

## 4. prompt -> schema -> renderer -> validator

Repository chain untouched. Editor-local chain (sanitizer -> schema -> serializer -> `buildCopyHtml` fix-ups ->
`validateStructuralParity`) stays in agreement; the serializer link now additionally preserves wrapper `style`
verbatim. Contract-before-consumer ordering holds: T1 filter, T2 wiring, T3 node plus serializer fix, so an off-list
iframe never reaches the schema unfiltered. The serializer fix and the node both land in T3, which is correct: N = 2
and 3 cannot go green with only one, so splitting would break the one-green-commit rule. **Clear.**

## 5. Task quality

All eight fields present on each task. Acceptance checks are observable; T3 now names the `margin: 0 auto` (not
`margin: 0px auto`) verbatim check plus the full regression list. Each task can end in one green commit (§13): T3 is
the largest but not separable. All tasks track `angular`. Order is by dependency and risk (filter first, U-3).
Fixtures sit with their change. **Clear.**

## 6. Test strategy

All tasks name files and the runner `test:logic`; no component spec is added, so the `*.component.spec.ts` rule is
n/a. T3 regression set for the `genericBlock` edit (round-trip genericBlock/microdata cases, `structural-parity`,
`beautify-round-trip`, `source-view`, `table-thead`, zero-edit `description_uk-UA.original.html` parity) runs
unmodified; nothing weakens, skips or excludes a test (§7.7). **Clear.**

## 7. Impact-analysis fidelity

Every file the plan touches appears in Impact Analysis v1 (must-change or re-verify) or is a new sibling file the
survey left to the planner. `generic-block-node.ts` moved from re-verify to modify, which is a plan decision inside
the surveyed set, not an unsurveyed file. No loop-back to `IMPACT_ANALYSIS`. **Clear.**

## Verdict rationale

All seven axes clear. The v2 delta is correct, minimal, inside the Surface, non-FROZEN and required by FR-2; the rest
of the plan and tasks are unchanged from the v1 review that passed. No blocking Open Decision.

## Non-blocking findings

1. **Wider output effect of the `genericBlock` edit.** Every `div`/`section` `style` now serialises verbatim instead
   of CSSOM-normalised. This is the intended fidelity gain, but any existing spec or fixture that implicitly relied on
   normalised wrapper `style` would move; the builder's 104-green run suggests none does. Builder should keep the
   non-`style` attribute loop byte-identical (class, id, `itemprop`, `itemtype`, `itemscope=""`) and skip null values
   as `renderSpec` does. The new code should use the global `document` only where it already exists in both runners
   (happy-dom and browser); confirm in the gate.
2. **Call-site wiring (T2) has no automated test** (carried from v1; unchanged). The manual Copy HTML check must be
   recorded as quality-gate evidence.
3. **T1 acceptance wording "byte-identical"** (carried from v1; T1 is already committed): compare kept iframes at the
   DOM level, not by whole-string equality.
4. **Filter bypass shapes beyond those named** (port, trailing dot, whitespace, `youtube-nocookie.com`) remain A-9
   policy left to a human; SECURITY_REVIEW must confirm.
5. **Empty wrapper after a removed iframe** (A-7(b)) is accepted by the plan; no AC states the residual output.
6. **Working-tree state:** T3 files (`embed-iframe-node.ts`, `index.ts`, `round-trip.spec.ts`, `editor-html-pipeline.spec.ts`)
   are already present uncommitted; `generic-block-node.ts` is not yet modified. This review judges the plan, not that
   in-progress code.
