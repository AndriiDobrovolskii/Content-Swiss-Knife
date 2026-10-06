---
artifact: reconciliation_report
story: US-6.1
version: 1
status: APPROVED
owner: so-reconciliation-reviewer
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T00:00:00Z
inputs_consumed:
  - {key: story, version: 4}
  - {key: specification, version: 5}
  - {key: ac_test_matrix, version: 2}
  - {key: implementation_report, version: 1}
  - {key: verification_report, version: 1}
---

# US-6.1 Reconciliation Report (HEAD df268b8; commits 58d8335, 770c61a, df268b8)

Verdict: PASS, with recorded gaps (G-1..G-3) that are not AC failures. This PASS is not human approval (AGENTS.md section 10).

## Evidence

- Read-only run `npx vitest run src/app/components/html-editor`: 7 files, 110 tests, 110 passed. No `.skip`, `.todo`, `.only`, `xit`, `xdescribe` in either backing spec.
- Both backing specs exist: `src/app/components/html-editor/editor-html-pipeline.spec.ts` (P), `src/app/components/html-editor/extensions/round-trip.spec.ts` (R).
- The only removed line in `round-trip.spec.ts` is an import line (`DOMSerializer` import split to add `type Node`); the AC-6 test body is unmodified.
- No FROZEN file touched (diff main..HEAD over `src` lists 7 files, all under `src/app/components/html-editor/`).
- happy-dom prints "Failed to load iframe page ... Iframe page loading is disabled" DOMExceptions to stderr while parsing iframe HTML; tests still pass (noise, not a failure).

## Three-level check per criterion

L1 = row in matrix v2. L2 = named test exists in the file. L3 = body read; a violation would fail it.

| AC | L1 | L2 | L3 | Why L3 holds |
|---|---|---|---|---|
| AC-1 | yes | yes (R `div-wrapped YouTube iframe ... N = 1/2/3`) | yes | exactly one iframe; `src`, `title`, `allow`, `referrerpolicy`, `loading`, `style` asserted equal to input constants, `allowfullscreen` present; N = 1,2,3 |
| AC-2 | yes | yes (same test + `genericBlock - wrapper style is returned verbatim`) | yes | each wrapper `style` asserted equal to the input (`margin: 0 auto;` not `0px`), nesting walked outermost to iframe, `p` count 0 |
| AC-3 | yes | yes (P `T3 Copy HTML structure check ... 1/2/3 divs`) | yes | real `validateStructuralParity` filtered to iframe issues must be `[]`, and non-vacuous: the iframe src is asserted present in baseline and output |
| AC-4 | yes | yes (R `two div-wrapped iframes keep their order`) | yes | `[youtube, vimeo]` array equality, order-sensitive |
| AC-5 | yes | yes (R `editing elsewhere leaves ... untouched`) | yes | real PM transaction edits a later paragraph; embed chain `outerHTML` equal before and after |
| AC-6 | yes | yes (R `videoEmbedFigure - attribute fidelity`, unmodified; P figure skip test) | yes | existing test unchanged; filter keeps a `youtube.invalid` figure iframe |
| AC-7 | yes | yes (P hostname, protocol, empty/unparsable describes) | yes | one `it.each` row per shape: example.com, `?x=youtube.com`, `youtube.com.evil.example`, `evil.example/youtube.com`, `notyoutube.com`, `https://youtube.com@evil.example/`, `notvimeo.com`; protocols ftp/javascript/data/blob removed, http and https kept; empty, missing, unparsable, relative, protocol-relative removed. Each asserts zero iframes and, for hostname rows, that wrapper and text remain. Kept rows assert `src` byte-identical. Both gates covered (`sanitizeEditorHtml`, `finalizeCopyHtml`) |
| AC-8 | yes | yes (R `text beside a div-wrapped iframe`, two tests) | yes | text in PM `doc.textContent` and output, text follows iframe (compareDocumentPosition), wrapper style kept; typed `XYZ` appears at the edited position (`Watch XYZthe full demo`) via a real transaction |
| AC-9 | yes | yes (P T2 and T3 describes) | yes | baseline = `sanitizeEditorHtml(input)` for 6 removed shapes (incl. `notyoutube.com`, userinfo, ftp, javascript, empty); baseline and output both iframe-free and parity issues `[]`. Kept iframe deleted or src changed yields exactly 1 parity issue naming the original (and changed) src. Zero-edit real fixture yields `[]` |

NFR-1 and NFR-2 are asserted (P sanitizer-composition tests, determinism tests in P and R).

## Drift from the Specification

- FR-1..FR-13: each has an implementation. `embed-iframe-node.ts` (FR-1, 2, 4, 5, 10, 11), `generic-block-node.ts` verbatim style (FR-2), `editor-html-pipeline.ts` strict `URL` hostname and protocol filter (FR-7, 8, 9; figure-direct-child exempt, FR-6), `html-editor.component.ts` `load()` baseline taken from `sanitizeEditorHtml` output and `buildCopyHtml()` via `finalizeCopyHtml` (FR-3, 12, 13). None dropped.
- Behaviour matches the approved wording; no reinterpreted criterion.
- Scope added: none found against the Out of scope list (no `isVideoSrc` reuse, no change to the parity comparison, no figure filtering, no `html-cleaner.ts` change, no iframe rewrite). Extra attributes on `embedIframe` (`width`, `height`, `frameborder`) are preservation only.
- Story drift: none.

## Gaps and pending items (reported honestly; not counted as passes)

- G-1 (pending): manual Copy HTML QA for the T2 call-site swaps in `html-editor.component.ts` is PENDING, not performed (implementation report). The two call sites (`load()`, `buildCopyHtml()`) are not covered by any automated component test (plan D9, test strategy section 4). AC-3 and AC-9 are proven at function level (the spec helpers replicate the component flow), not through the component.
- G-2: AC-4, AC-5 and AC-8 are proven on schema-level fixtures (ProseMirror `DOMParser`/`DOMSerializer`, `EditorState` transactions, happy-dom), not on a mounted TipTap editor and not on the Spec A-5 fixture shapes through the component. They do assert the criterion; they are not component-level proof.
- G-3 (minor): AC-2 wrapper `style` verbatim is asserted at the schema level; the Copy-gate tests (`finalizeCopyHtml`) do not re-assert wrapper `style` after `sanitizeUntrustedHtml`. Residual risk only; no violation observed.
- A-9 edge cases (port, case, whitespace, trailing dot, `youtube-nocookie.com`) have no tests, by documented decision.

## Security review items (outside the ACs, not AC gaps)

- NB-1: a kept iframe may carry `srcdoc` and no `sandbox` (Source to Copy path).
- NB-2: Source toggle-back to WYSIWYG is unsanitized (pre-existing path, one more node honours `src`).

## Result

PASS: every AC-1..AC-9 has a matrix row, an existing test, and an assertion that would fail on violation. Human gate should weigh G-1 (manual QA still pending) before approval.
