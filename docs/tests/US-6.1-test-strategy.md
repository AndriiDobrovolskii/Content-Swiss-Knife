---
artifact: test_strategy
story: US-6.1
version: 2
status: ARCHIVED
owner: so-test-writer
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T13:00:00Z
supersedes: docs/tests/US-6.1-test-strategy.md#1
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: open_decisions
    version: 4
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
open_decisions_blocking: false
---

# Test Strategy - US-6.1: preserve a pasted YouTube/Vimeo iframe and its wrapper divs in the HTML editor

Track: angular. Every assertion is written from the Story's AC-1..AC-9 and Specification v5 (FR-1..FR-13,
NFR-1, NFR-2), not from the plan's proposed implementation. Human plan-gate decisions applied: D9 accepted
(logic extracted to pure functions, tested in `test:logic`; manual QA for the T2 call-site swap) and DOM-level
comparison accepted instead of byte-for-byte (A-4). No production file, no frozen file, no fixture and no
workflow state file was touched by this stage.

## 1. Runners and naming

All tests run in the **logic runner** (`npm run test:logic`, vitest + happy-dom). There is no
`*.component.spec.ts` and no `Injector.create` service spec: no Angular component or service is mounted (plan
D9: TipTap `Editor` / CodeMirror have no precedent under happy-dom or Karma here). Neither new spec name ends in
`.component.spec.ts`, so neither is picked up by `test:components`.

## 2. What is tested, at which level

| Task | Spec file | Level | Proves |
|---|---|---|---|
| T1 | `src/app/components/html-editor/editor-html-pipeline.spec.ts` (new) | unit, pure functions `filterEmbedIframes`, `sanitizeEditorHtml`, `finalizeCopyHtml` | FR-7 (hostname rule, 7 negative shapes + figure-nested, 6 kept shapes), FR-8 (protocol rule, ftp/javascript/data/blob removed, http kept), FR-9 (empty/missing/unparsable/relative/protocol-relative removed), FR-6 figure skip, NFR-1 composition order and base-sanitizer parity, NFR-2 determinism |
| T2 | same file, describe "T2 ..." | pure pipeline + real `validateStructuralParity` | FR-12: baseline = `sanitizeEditorHtml(input)`, output = `finalizeCopyHtml(serialize(parse(baseline)))`; six removal shapes raise no iframe message; Source-mode style input is filtered |
| T3 | same file, describes "T3 ..." | real schema (`getSchema(TIPTAP_EXTENSIONS)` + ProseMirror parse/serialize), `EditorState` transactions, real `validateStructuralParity` | FR-3 (N=1,2,3 unedited: no iframe message and iframe really in output), FR-13 (iframe deleted / src changed through a transaction still warns), zero-edit parity of `description_uk-UA.original.html` through the new pipeline |
| T3 | `src/app/components/html-editor/extensions/round-trip.spec.ts` (extended; existing tests untouched) | schema round trip, DOM-level | FR-1 + FR-2 (N=1,2,3: all attributes, wrapper `style`, nesting order, no `<p>`), FR-4 (two chains, order), FR-5 (edit elsewhere via `EditorState`), FR-10 + FR-11 (sibling text kept, editable via `insertText`), NFR-2 |

AC-6 / FR-6 regression: the existing `round-trip.spec.ts` test "preserves iframe attrs and a hand-edited caption
verbatim" (and its `youtube.invalid` fixture) is the unmodified guard; the new figure-skip filter test adds the
off-list-host figure case.

## 3. Fixtures

The iframe markup and the first two wrapper `style` values are copied from `Knowledge/Issues/1/yt-iframe.txt`
(exact `title`, `allow`, `referrerpolicy`, `style`); the third wrapper style is invented for N=3 and is only
compared against itself. The zero-edit parity test reuses the existing
`src/utils/__fixtures__/description_uk-UA.original.html`. `test/fixtures/corpus/` is not used: nothing in the
editor round trip consumes `.ctx.json` / `.doc.json`, and no new fixture file was created.

## 4. Deliberately not unit-tested

- The two call-site swaps in `html-editor.component.ts` (`load()` -> `sanitizeEditorHtml`, `buildCopyHtml()` ->
  `finalizeCopyHtml`): plan D9 / human decision. Covered by build + a manual Copy HTML check the builder records
  as quality-gate evidence (paste an off-list iframe, Copy: no structure warning, iframe absent). Residual risk: a
  mistaken swap that compiles. A tempting mitigation (grep-the-source test) was rejected as non-behavioural.
- A live TipTap `Editor` typing path: FR-11 is asserted at the ProseMirror transaction level, which is what the
  editor applies to the document.
- Port, trailing dot, mixed case, surrounding whitespace, `youtube-nocookie.com` (A-9): the Specification leaves
  policy to a human, so no test pins them (would be inventing a requirement). Flagged for SECURITY_REVIEW.
- Bare (zero-wrapper) allowed iframe strict parity (A-7a): out of scope; only removal of off-list bare iframes is tested.
- Residual shape after removal (A-7b, empty wrapper gets an auto `<p>`): no AC states it; tests assert only that the
  wrapper and surrounding content remain and that no iframe message appears.

## 5. Expected state at the end of this stage (v2, after plan v2)

Plan v2 added a narrow `genericBlock.renderHTML` edit (wrapper `style` written with `setAttribute`, verbatim).
T1 (58d8335) and T2 (770c61a) are committed. `embed-iframe-node.ts` and its registration in
`extensions/index.ts` are already present, uncommitted, in the working tree, so the T1, T2 and iframe-node tests
are green now. The only part of T3 still missing is the `genericBlock` edit.

Red now (4 tests), all for one right reason: ProseMirror's `DOMSerializer` re-serialises `style` through
`cssText` (`margin: 0 auto` becomes `margin: 0px auto`), which is exactly what the `genericBlock` edit must fix.

- `round-trip.spec.ts` `keeps the iframe attributes and the wrapper divs for N = 2 wrappers` and `N = 3 wrappers`
  (wrapper style `max-width: 1200px; width: 100%; margin: 0 auto;`).
- `round-trip.spec.ts`, new describe `genericBlock - wrapper style is returned verbatim` > `does not re-serialise
  the style of a plain wrapper div` for `margin: 0 auto;` and `max-width: 1200px; width: 100%; margin: 0 auto;`.

Green now, additive guards that must stay green after the edit (they pin "only `style` changes"): `keeps class, id,
itemprop, itemtype and itemscope unchanged on a div and a section`, `skips null attributes`, `skips only the
missing attributes`, and the style case without a `0` shorthand (`... margin: 4px auto;`), which cssText already
preserves. All pre-existing tests pass.
