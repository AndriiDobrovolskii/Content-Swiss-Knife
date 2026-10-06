---
artifact: task_breakdown
story: US-6.1
version: 2
status: ARCHIVED
owner: so-implementation-planner
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T12:00:00Z
supersedes: docs/plans/US-6.1-task-breakdown.md#1
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 2
open_decisions_blocking: false
---

# Task breakdown: US-6.1 (preserve a pasted YouTube/Vimeo iframe and its wrapper divs in the HTML editor)

Revision v2 (supersedes v1, which was approved against plan v1). Cause: implementation_plan v2 (D6) adds a minimal
behaviour-preserving edit to `genericBlock.renderHTML` so wrapper `style` serialises verbatim. Change: T3 gains
`generic-block-node.ts` and its acceptance checks; T3 Notes no longer forbid editing `genericBlock`; the coverage
table gains the D6 `genericBlock` row. T1 and T2 are unchanged and are DONE (commits 58d8335, 770c61a); they stay
completed. The edit is folded into T3 rather than a new T4 because N = 2 and N = 3 only go green with both the node
and the style fix, so splitting would leave a task that cannot end with its tests green (one task = one commit).

All tasks are track `angular`: every file lives under `src/app/components/html-editor/**`. No task touches
`server/**`, `src/prompts/**`, `src/prompt-core/**`, `src/domain/**`, `src/render/**` or any FROZEN file, so no
AGENTS.md §9 stop is carried. Every test runs in `test:logic` (vitest, happy-dom); the plan (D8, D9) rules out a
`test:components` spec.

## Execution order

`T1 -> T2 -> T3` (strictly sequential; no parallel group).

- T1 has no dependency and could in principle run beside nothing else; T2 imports T1's functions; T3 depends on T1
  only through shared test helpers, but is ordered last so the filter is already wired when the new node first
  lets an iframe survive parsing (never a state where an off-list iframe reaches the schema unfiltered).

## Risk-first rationale

T1 is first because the allow-list filter is the security-bearing decision and rests on the one unverified
assumption (Impact U-3: happy-dom `URL` fidelity for userinfo and `blob:`); proving it first is cheap, while the
node (T3) is mechanical once the filter is sound.

---

## T1 — Add the pure iframe filter and sanitizer pipeline

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

A new editor-side module exports `filterEmbedIframes` (removes every non-`<figure>`-parented iframe whose `src` is
empty, missing, unparsable, not `https:`/`http:`, or whose parsed hostname is not an exact/dot-boundary match of
`youtube.com`, `youtu.be`, `vimeo.com`, `player.vimeo.com`; never rewrites a kept `src`), `sanitizeEditorHtml`
(`filterEmbedIframes(sanitizeUntrustedHtml(html))`) and `finalizeCopyHtml` (the existing copy fix-up order moved
verbatim, ending in `sanitizeEditorHtml`). Nothing calls them yet.

### Files

| File | Change |
|---|---|
| `src/app/components/html-editor/editor-html-pipeline.ts` | create: `filterEmbedIframes`, `sanitizeEditorHtml`, `finalizeCopyHtml` |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/app/components/html-editor/editor-html-pipeline.spec.ts` (filter, composition-order, determinism, figure-skip and `figure > div > iframe` cases) | `test:logic` | FR-6 (figure skip), FR-7, FR-8, FR-9, NFR-1, NFR-2, AC-7 |
| `src/utils/html-cleaner.spec.ts` (existing, unmodified) | `test:logic` | NFR-1 regression |

### Acceptance check

`npx vitest run src/app/components/html-editor/editor-html-pipeline.spec.ts` shows every filter test green: each
negative shape (notyoutube.com, evil.com, userinfo, `youtube.com.evil.com`, `ftp:`, `javascript:`, `data:`,
`blob:`, empty/missing/unparsable/relative/protocol-relative `src`) removes the iframe, each kept shape
(`www.youtube.com?rel=0`, `youtu.be`, `vimeo.com`, `player.vimeo.com`, `http://www.youtube.com`) is returned
byte-identical, and a `<figure>`-wrapped off-list iframe is untouched. `html-cleaner.spec.ts` stays green; lint
and `ng build` pass.

### Notes

Use the global `URL` with try/catch and no base; decide on `hostname`/`protocol` only, never substring (spec FR-7).
Do not import `isVideoSrc`. Allowed hosts are a local constant (not `STORE_REGISTRY`). Port/trailing-dot/whitespace
policy is not decided here; add only characterisation tests if the spec names them. If a userinfo or `blob:` test
fails, suspect happy-dom `URL` before the filter (plan D8). `html-cleaner.ts` must not change. `finalizeCopyHtml`
must preserve the current order: `stripTiptapArtifacts` -> `reconstructTableThead` -> `wrapImageFigures` ->
sanitize; take the helper names from `html-editor.component.ts` as they are today.

---

## T2 — Wire the composed sanitizer at both component gates

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T1 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

The component's load path (which seeds the structural-parity baseline `originalHtml`) calls `sanitizeEditorHtml`,
and `buildCopyHtml()` returns `finalizeCopyHtml(raw)`, so Copy HTML and Source mode filter off-list iframes at
the same two gates. A removed iframe is absent from both baseline and output, so no iframe parity message is
raised for it. Comparison logic (`validateStructuralParity`) is untouched.

### Files

| File | Change |
|---|---|
| `src/app/components/html-editor/html-editor.component.ts` | modify: replace the two `sanitizeUntrustedHtml` calls with `sanitizeEditorHtml` (load) and `finalizeCopyHtml` (`buildCopyHtml`); no new signals |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/app/components/html-editor/editor-html-pipeline.spec.ts` (copy-parity cases where the iframe is removed: baseline and output both via the pipeline, real `validateStructuralParity`, Source-style input) | `test:logic` | FR-12, AC-9 |
| `src/app/components/html-editor/structural-parity.spec.ts`, `beautify-round-trip.spec.ts`, `source-view.spec.ts`, `table-thead.spec.ts` (existing, unmodified) | `test:logic` | regression: finalize order moved verbatim |

### Acceptance check

The removed-iframe parity tests are green and the existing regression specs above stay green; `npm run lint` and
`ng build` (type check of the component) pass. The two call-site swaps themselves have no automated component
test (plan D9); the builder records a manual Copy HTML check (paste an off-list iframe, Copy: no structure
warning, iframe absent) as quality-gate evidence.

### Notes

Only the two call sites change; `copy()`, `copyAnyway()` and the `validateStructuralParity` call sites stay as
they are. Baseline must be set from the same sanitized value given to TipTap.

---

## T3 — Add the `embedIframe` atomic block node and register it

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T1, T2 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

`genericBlock.renderHTML` is edited minimally so wrapper `style` round-trips verbatim, and a new atomic block node `embedIframe` claims a non-figure `<iframe>`, stores `src`, `title`, `allow`,
`referrerpolicy`, `loading`, `style`, `allowfullscreen`, plus `width`, `height`, `frameborder` verbatim, and
serialises back with double-quoted attributes. Registered next to `VideoEmbedFigure`, it lets `div > div > iframe`
(N = 1, 2, 3) round-trip with wrapper `style` and iframe attributes intact, no `<p></p>` in place of the iframe,
sibling text kept and editable, and two chains kept in order. Figure-parented iframes are still claimed only by
`videoEmbedFigure`. The `genericBlock.renderHTML` edit builds the wrapper element directly
(`document.createElement(tagName)`), writes every attribute except `style` as before, writes `style` with
`setAttribute('style', value)` (verbatim string; ProseMirror's spec path would re-serialise it via `cssText`, turning
`margin: 0 auto` into `margin: 0px auto`) and returns `{ dom, contentDOM: dom }`. Attribute schema, `parseHTML`,
tag-name selection and the content hole are unchanged.

### Files

| File | Change |
|---|---|
| `src/app/components/html-editor/extensions/embed-iframe-node.ts` | create: `group: 'block'`, `atom: true`, `selectable: true`; `parseHTML` returns `false` when parent is `<figure>`; `renderHTML` omits null attrs, `allowfullscreen: ''` when true |
| `src/app/components/html-editor/extensions/index.ts` | modify: add `EmbedIframe` to `TIPTAP_EXTENSIONS` adjacent to `VideoEmbedFigure` |
| `src/app/components/html-editor/extensions/generic-block-node.ts` | modify: `renderHTML` builds the element and writes `style` via `setAttribute` (not FROZEN: no checksum in `arch-guard.sh`, no AGENTS.md §9 reference) |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/app/components/html-editor/extensions/round-trip.spec.ts` (new tests: N = 1, 2, 3 from the `Knowledge/Issues/1/yt-iframe.txt` shape, with a wrapper `style` verbatim assertion `margin: 0 auto` for N = 2 and 3; two chains; unrelated edit via `EditorState`; sibling text presence and typing transaction) | `test:logic` | FR-1, FR-2, FR-4, FR-5, FR-10, FR-11, AC-1, AC-2, AC-4, AC-5, AC-8 |
| existing `genericBlock` consumers: `round-trip.spec.ts` genericBlock/microdata cases, `structural-parity.spec.ts`, `beautify-round-trip.spec.ts`, `source-view.spec.ts`, `table-thead.spec.ts`, zero-edit `description_uk-UA.original.html` parity (all unmodified) | `test:logic` | D6 regression: only the `style` write path changed |
| `src/app/components/html-editor/editor-html-pipeline.spec.ts` (copy-parity cases: allowed iframe unedited gives no iframe message; kept iframe `src` changed or removed still gives the message; zero-edit `description_uk-UA.original.html` parity) | `test:logic` | FR-3, FR-13, AC-3, AC-9 |
| `round-trip.spec.ts` existing "preserves iframe attrs..." test and `youtube.invalid` fixture (unmodified) | `test:logic` | FR-6, AC-6 |

### Acceptance check

The new round-trip and copy-parity tests are green with DOM-level attribute comparison (A-4); `round-trip.spec.ts`
N = 2 and N = 3 return the wrapper `style` verbatim (`margin: 0 auto`, not `margin: 0px auto`); the existing figure
test and every existing genericBlock/round-trip/structural-parity/beautify-round-trip/source-view/table-thead spec
pass unmodified; and `npm run lint`, `npm test` (both runners), `npm run test:coverage` and `ng build` are
green. A document with one, two and three div-wrapped iframes yields the original wrappers, `style` values and
iframe attributes in Copy HTML.

### Notes

The only permitted `genericBlock` change is the `renderHTML` `style` write path described above (plan D6); touch no
other part of `generic-block-node.ts` (non-`style` attribute output, e.g. class, id, microdata, must be byte-identical
to today). Do not edit `global-attributes.ts`, `video-embed-figure-node.ts` or `structural-parity.ts`.
`src` is stored as the original string so `srcList` (double-quoted `src="..."` only) compares equal on both
sides, including `?rel=0` / `&amp;` forms. The node must stay a block, not inline (an inline node would force a
wrapping `<p>`, breaking FR-2). The node is not a security gate; the T1 filter already ran. Assert sibling text by
presence, not string equality (A-5c).

---

## Coverage

### Plan item to tasks

| Plan item | Tasks |
|---|---|
| D1 (no domain/fixture change) | none by design; no task touches `src/domain` or `test/fixtures/corpus` |
| D2 editor-local chain agreement | T1, T2, T3 |
| D3 filter placement, composed sanitizer, figure skip | T1 (create), T2 (wire) |
| D4 FROZEN none | all tasks (no FROZEN files) |
| D5 / D7 (no prompt, no server) | none by design |
| D6 `embedIframe` node, registration | T3 |
| D6 `genericBlock.renderHTML` verbatim `style` edit (`generic-block-node.ts`) | T3 |
| D6 component wiring | T2 |
| D8 validation strategy | T1 (filter, composition, determinism), T2 (removed-iframe parity), T3 (round trip, copy-parity, typing) |
| D9 `finalizeCopyHtml` extraction | T1 (create), T2 (use) |
| Files: `embed-iframe-node.ts`, `extensions/index.ts`, `generic-block-node.ts`, `round-trip.spec.ts` | T3 |
| Files: `editor-html-pipeline.ts`, `editor-html-pipeline.spec.ts` | T1 (create), T2/T3 (extend spec) |
| Files: `html-editor.component.ts` | T2 |

### Requirement to tasks

| Requirement | Tasks |
|---|---|
| FR-1, FR-4, FR-5, FR-10, FR-11 | T3 |
| FR-2 | T3 (node as block child plus `genericBlock` verbatim `style`) |
| FR-3, FR-13 | T3 |
| FR-6 | T1 (filter skips figures), T3 (node guard, existing test) |
| FR-7, FR-8, FR-9 | T1 |
| FR-12 | T2 |
| NFR-1, NFR-2 | T1 |
| NFR-3 | none by design (nothing touched) |

### Task to plan item

T1 -> D3, D9, D8. T2 -> D3 wiring, D6 component, D9, FR-12. T3 -> D6 node, registration and `genericBlock.renderHTML` edit. No task maps to
nothing.
