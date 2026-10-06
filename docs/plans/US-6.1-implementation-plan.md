---
artifact: implementation_plan
story: US-6.1
version: 2
status: APPROVED
owner: so-planner
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T12:00:00Z
supersedes: docs/plans/US-6.1-implementation-plan.md#1
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: open_decisions
    version: 4
  - key: impact_analysis
    version: 1
open_decisions_blocking: false
---

# Implementation plan: US-6.1 (preserve a pasted YouTube/Vimeo iframe and its wrapper divs in the HTML editor)

This plan decides design only. It orders no work and assigns no track (so-implementation-planner does that). It
consumes Impact Analysis v1 without re-surveying it; the few code facts restated below were read from the working
tree only to make a decision concrete.

## 1. Approach

Two independent, small pieces plus one wiring change, all inside `src/app/components/html-editor/**`
(the Specification's Surface):

1. **Schema:** a new atomic block node `embedIframe` (new sibling file) that claims a bare `<iframe>` and stores
   its attributes verbatim. Because it is a `block`-group node, `genericBlock` (`content: 'block+'`) accepts it
   directly as a child, so `div > div > iframe` parses to wrappers that hold the iframe itself and ProseMirror
   never auto-fills an empty `<p></p>`. Wrappers keep their `style` in the existing `genericBlock` attribute, and
   a minimal serialisation fix in `genericBlock.renderHTML` writes it back verbatim (D6; v1 wrongly assumed this
   already worked); sibling text is wrapped in `<p>` by ProseMirror as it is today and stays ordinary editable text.
2. **Filter:** a new pure function `filterEmbedIframes(html)` in a new editor-side file. It removes every
   non-`<figure>`-wrapped iframe whose `src` is empty, missing, unparsable by `new URL(src)` (no base), whose
   parsed `protocol` is not `https:`/`http:`, or whose parsed `hostname` is not equal to / a dot-boundary
   subdomain of `youtube.com`, `youtu.be`, `vimeo.com`, `player.vimeo.com`. It only deletes; it never rewrites
   `src` (A-9: original string preserved).
3. **Wiring:** one composed sanitizer `sanitizeEditorHtml(html) = filterEmbedIframes(sanitizeUntrustedHtml(html))`
   is used at **both** gates in the component (load, which also seeds the parity baseline, and `buildCopyHtml`,
   which also serves Source mode). Parity comparison (`validateStructuralParity`) is untouched.

## 2. Design decisions

### D1. Domain model (`src/domain/`)

No change. No Zod schema, no `ProductDescriptionDoc`/`ConsumablesDoc` field, no artifact on disk affected.
Corpus fixtures in `test/fixtures/corpus/` are not touched and not regenerated (no renderer output moves;
Impact hazard 5). Traces: NFR-3.

### D2. The editor-local chain (analogue of prompt -> schema -> renderer -> validator)

The repository chain (prompt, `src/domain`, `src/render`, `output-validator.ts`) is not touched (Impact hazard 3).
The editor-local chain is: sanitizer -> TipTap schema -> `getHTML` serializer -> `buildCopyHtml` fix-ups ->
`validateStructuralParity`. How the links stay in agreement:

- **Sanitizer/filter and schema agree by construction:** the filter runs before the schema ever sees the HTML, so
  the schema node can be permissive (it stores whatever iframe survived) and never needs its own host check. The
  schema is not a second gate; it must not be relied on for security.
- **Schema and serializer agree on the iframe:** `embedIframe.renderHTML` emits `<iframe src="...">` with the
  stored attributes using double-quoted attribute serialization (DOM `innerHTML`/ProseMirror serializer), which is
  what `srcList(html,'iframe')` in `structural-parity.ts` requires (it matches only double-quoted `src="..."`).
  `src` is stored as the original string, so a `?rel=0` / `&amp;` form compares equal on both sides (Impact
  silent-failure risk 3).
- **Baseline and output agree:** both the baseline (`originalHtml`) and the Copy output pass through the same
  `sanitizeEditorHtml`, so a removed iframe is absent from both (FR-12), while a kept iframe that is later
  changed or lost is present in the baseline and absent/different in the output, so the unchanged check still
  warns (FR-13). The filter is a pure removal keyed on `src` validity, so it cannot make baseline and output
  both lose an *allowed* iframe (Impact risk 2); a dedicated FR-13 test guards that.

AGENTS.md §4 criteria: this Story changes no prompt, renderer or generated HTML. The §4 rule "a video embed
present in the input is present in the output" is the motivating rule; it is enforced for the editor by FR-1..FR-5
tests. The §4 rule that generated iframes sit in `<figure>` is unchanged: the `videoEmbedFigure` node and
`video-figure.ts` are not modified. Traces: FR-1..FR-5, FR-12, FR-13.

### D3. Filter placement (Impact U-1) - decision, no widening of scope

Options: (a) edit `sanitizeUntrustedHtml` in `src/utils/html-cleaner.ts` (outside the stated Surface); (b) a new
file inside the Surface that composes with it. **Chosen: (b).** New file
`src/app/components/html-editor/editor-html-pipeline.ts` (name indicative) exports `filterEmbedIframes` and
`sanitizeEditorHtml`; `html-cleaner.ts` and its spec are **not modified**. Consequences:

- The change stays inside `src/app/components/html-editor/**`; U-1 is resolved without a human widening Surface.
  This is recorded as a plan decision, not a risk needing a Surface change. (A human who prefers (a) may overturn
  it; the filter function's contract is identical, only its import path changes.)
- `sanitizeUntrustedHtml` keeps its documented narrow contract and its other callers (`html-cleaner.spec.ts`
  cases for `javascript:`/`data:`, NFR-1) are unaffected. Order is deliberate: the filter runs *after*
  `sanitizeUntrustedHtml`, so a `javascript:`/`data:` `src` already emptied there falls under FR-9 and is removed.
- The filter does not import `isVideoSrc` (`video-figure.ts`/`video-manifest.ts`), per spec. Allowed hosts are a
  local constant array in the filter; this is a security allow-list, not a language list or currency, so
  `STORE_REGISTRY` does not apply (Impact hazard 1).
- Scope of the filter: every `<iframe>` whose parent element is **not** a `<figure>` (bare, div-wrapped, and any
  other non-figure container are all filtered, the stricter reading of "bare or div-wrapped"). `<figure>`-wrapped
  iframes are skipped so the `youtube.invalid` fixture in `round-trip.spec.ts` keeps passing (FR-6, A-6).
- Parsing: `new URL(src)` in try/catch; no base. Relative and protocol-relative `src` throw and are removed
  (A-9). Decision uses `url.hostname` (already lowercased by `URL`) and `url.protocol` only: `host === h ||
  host.endsWith('.' + h)`. Port, trailing dot and whitespace policy are not decided here (left to a human,
  flagged for SECURITY_REVIEW). A `src` with leading/trailing whitespace is accepted by `URL` after trim; the
  original string is written back unchanged because the filter never touches kept nodes.
- Only the iframe element is removed; wrapper divs remain (A-7(b)). Because the filter operates on HTML before
  the schema, the schema's `block+` requirement for a now-empty wrapper div is handled by ProseMirror's existing
  auto-fill (the empty wrapper gets a `<p></p>`), identically on baseline and output, so no parity message
  results; this is the residual shape U-4 left open and the plan accepts it (no AC states it).
- Source mode (`currentSourceHtml()`) goes through `buildCopyHtml` -> `sanitizeEditorHtml`, so the filter applies
  there too (Impact risk 6) and at both sanitize gates (risk 7).

### D4. FROZEN files

None. Sibling files are used anyway: `embed-iframe-node.ts` and `editor-html-pipeline.ts` are new; `structural-parity.ts`,
`html-cleaner.ts`, `video-embed-figure-node.ts`, `global-attributes.ts`,
`video-figure.ts`, `video-manifest.ts` are not edited. `generic-block-node.ts` IS edited (D6, minimal
`renderHTML` fix). No §9 request is made: Impact hazard 4 confirms `arch-guard.sh` has no checksum on these files,
and a re-check of `arch-guard.sh` and AGENTS.md section 9 for v2 found no reference to `generic-block-node.ts`, so
it is not FROZEN and no section 9 stop applies.

### D5. Prompt payload contract

No prompt builder changes; `PromptPayload`, `systemBlocks` and `userContent` are untouched, so prompt caching
(AGENTS.md §3) is not affected.

### D6. Angular surface

- **New node `embedIframe`** (`extensions/embed-iframe-node.ts`): `group: 'block'`, `atom: true`,
  `selectable: true`, no content. Attributes, all stored verbatim from the DOM element: `src`, `title`, `allow`,
  `referrerpolicy`, `loading`, `style`, `allowfullscreen` (boolean via `hasAttribute`), plus `width`, `height`,
  `frameborder` (unlisted in AC-1; carried through because dropping them silently is the worse default; A-4
  leaves them unspecified). `parseHTML: [{ tag: 'iframe', getAttrs }]` where `getAttrs` returns `false` if
  `dom.parentElement` is a `<figure>` so `videoEmbedFigure` (priority 60) remains the only claimant of figure
  iframes (FR-6; and a leaf figure node does not descend into its own content in any case).
  `renderHTML` emits `['iframe', attrs]`, omitting null attributes and emitting `allowfullscreen: ''` when true.
  Its `style` lives in the node's own attributes because `GlobalAttributes` lists no iframe type (Impact table).
- **Registration:** add `EmbedIframe` to `TIPTAP_EXTENSIONS` in `extensions/index.ts` (the single registration
  point), adjacent to `VideoEmbedFigure`.
- **Minimal behaviour-preserving edit to `genericBlock.renderHTML`** (`extensions/generic-block-node.ts`).
  v1's premise that wrapper `style` already round-trips verbatim is false: `renderHTML` returns a
  `[tag, attrs, 0]` spec and ProseMirror's `DOMSerializer` applies `style` through `dom.style.cssText`, which
  re-serialises it (`margin: 0 auto` -> `margin: 0px auto`), breaking AC-2/FR-2 verbatim wrapper style for N = 2
  and 3. Decision: in `renderHTML`, build the wrapper element directly (`document.createElement(tagName)`), write
  every attribute except `style` as before, write `style` with `setAttribute('style', value)` (verbatim string), and
  return `{ dom, contentDOM: dom }`. The attribute schema, `parseHTML`, tag-name selection, content hole and
  every other attribute's output are unchanged; only the `style` write path changes. `genericBlock` still accepts
  the new block node through its `block+` content, which is why a node (not a mark or passthrough hack) was
  chosen. Evidence: a builder experiment (reverted) with exactly this edit made all 104 tests in
  `src/app/components/html-editor` pass. Verified against the code: `renderHTML` is `[tagName, mergeAttributes(HTMLAttributes), 0]`.
- **Component `html-editor.component.ts`:** replace the two `sanitizeUntrustedHtml` calls (load; the return of
  `buildCopyHtml`) with `sanitizeEditorHtml`. The baseline signal `originalHtml` is set from the same value that
  is given to TipTap (`pendingContent`), which is already the case. No new signals, no OnPush change, no RxJS.
  `copy()`/`copyAnyway()`/`validateStructuralParity` call sites are untouched (comparison logic out of scope).
- **Typing in sibling text (FR-11):** needs no component work; sibling text is a normal `paragraph` child of the
  wrapper `genericBlock`.

### D7. Server surface

None. No `server/**` file is reachable (Impact hazard 7); `server/usage/store.js` is not touched and no migration
question arises.

### D8. Validation strategy

Runner for every category below is `npm run test:logic` (vitest, happy-dom, `src/**/*.spec.ts`). No new
`*.component.spec.ts` / `test:components` spec (see D9).

| Category | Against | Requirements |
|---|---|---|
| Schema round trip, N = 1, 2, 3 | `getSchema(TIPTAP_EXTENSIONS)` + `PMDOMParser`/`DOMSerializer` (the existing `round-trip.spec.ts` helpers), fixture built from `Knowledge/Issues/1/yt-iframe.txt` incl. exact `title`/`allow`; DOM-level attribute comparison (A-4) | FR-1, FR-2 (wrapper `style`, nesting, no `<p></p>` in place of iframe) |
| Two chains, order | same helpers, two chains with distinct `src` (A-5a) | FR-4 |
| Unrelated edit leaves embed untouched | ProseMirror `EditorState` + transaction on a paragraph elsewhere, then serialise; no live `Editor` (none exists in any spec; happy-dom limits noted in `round-trip.spec.ts` header) | FR-5 |
| Figure regression | existing "preserves iframe attrs..." test, unmodified; plus a new assertion that a figure iframe with an off-list host is not filtered | FR-6 |
| Filter, one test per shape | `filterEmbedIframes` unit spec: six host-negative shapes, `ftp:`, `javascript:`, `data:`, `blob:`, empty/missing/unparsable/relative/protocol-relative src, and kept shapes (`www.youtube.com` with `?rel=0`, `youtu.be`, `player.vimeo.com`, `vimeo.com`, `http://www.youtube.com`) | FR-7, FR-8, FR-9 |
| Composition order | `sanitizeEditorHtml` on `javascript:`/`data:` iframe `src` is removed (not just emptied) | FR-9, NFR-1 |
| `html-cleaner.spec.ts` regression | existing `sanitizeUntrustedHtml` cases run unchanged | NFR-1 |
| Sibling text | schema round trip of text beside the iframe in the same div; assert text presence, not string equality (A-5c; Impact risk 8) | FR-10 |
| Typing | `EditorState.apply(tr.insertText(...))` at the sibling text position, serialise, assert typed characters at that position | FR-11 |
| Copy-path parity | composed pipeline `finalizeCopyHtml` + `validateStructuralParity` (see D9): allowed iframe unedited -> no iframe message; removed iframe -> no message; kept iframe `src` changed/removed -> iframe message still present | FR-3, FR-12, FR-13 |
| Determinism | same input twice yields identical output | NFR-2 |
| Regression suites | `structural-parity*.spec.ts`, `beautify-round-trip.spec.ts`, `source-view.spec.ts`, `table-thead.spec.ts`, zero-edit `description_uk-UA.original.html` parity | FR-13 guard, schema safety |
| Happy-dom `URL` fidelity (Impact U-3) | the userinfo and `blob:` shape tests run in vitest; if happy-dom's `URL` diverges from the native one the test, not the filter, is the suspect: the filter must use the global `URL` and the spec must assert against Node/native `URL` semantics | FR-7, FR-8 |
| Build | `ng build` and `tsc` | all |

### D9. Where Copy HTML / typing tests live (Impact U-2) - decision

`copy()` is inseparable from the component only through `buildCopyHtml()`'s `editor.getHTML()`. The remaining
steps are pure. Decision: extract two pure functions into `editor-html-pipeline.ts`:

- `finalizeCopyHtml(rawHtml)` = `sanitizeEditorHtml(wrapImageFigures(reconstructTableThead(stripTiptapArtifacts(raw))))`
  (the existing order, moved verbatim; behaviour identical);
- `sanitizeEditorHtml` as above.

`buildCopyHtml()` becomes `finalizeCopyHtml(raw)` and `copy()` still calls `validateStructuralParity` directly. The parity
tests (FR-3, FR-12, FR-13) then run in `test:logic` by feeding `sanitizeEditorHtml(input)` as baseline and
`finalizeCopyHtml(serialize(parse(sanitizeEditorHtml(input))))` as output through the real
`validateStructuralParity`. Rejected: a new `html-editor.component.spec.ts` under `ng test`: TipTap `Editor` and
CodeMirror have no precedent under happy-dom or Karma in this repo (only two component specs exist, neither mounts an
editor), so it would be the first of its kind and carries unverified feasibility. Residual: the two call-site
swaps in `html-editor.component.ts` are covered by build/typing plus manual verification, not an automated component
test. This is recorded as a risk below.

## 3. Files to create / modify

Derived from Impact Analysis v1.

**Create**
- `src/app/components/html-editor/extensions/embed-iframe-node.ts` - the `embedIframe` atomic block node (D6).
- `src/app/components/html-editor/editor-html-pipeline.ts` - `filterEmbedIframes`, `sanitizeEditorHtml`,
  `finalizeCopyHtml` (D3, D9).
- `src/app/components/html-editor/editor-html-pipeline.spec.ts` - filter, composition, and copy-parity specs.

**Modify**
- `src/app/components/html-editor/extensions/generic-block-node.ts` - `renderHTML` builds the wrapper element and
  writes `style` with `setAttribute` so it serialises verbatim (D6). Not FROZEN.
- `src/app/components/html-editor/extensions/index.ts` - register `EmbedIframe`.
- `src/app/components/html-editor/html-editor.component.ts` - use `sanitizeEditorHtml` in `load()` and
  `finalizeCopyHtml` in `buildCopyHtml()`; no other change.
- `src/app/components/html-editor/extensions/round-trip.spec.ts` - **add** new tests only (N = 1, 2, 3; two
  chains; sibling text; unrelated edit; typing). The existing figure test and the `youtube.invalid` fixture stay
  unmodified (FR-6).

**Not modified (verified-unchanged, per Impact "re-verification")**: `structural-parity.ts` (and its specs),
`html-cleaner.ts`/`html-cleaner.spec.ts`, `video-embed-figure-node.ts`,
`global-attributes.ts`, `video-figure.ts`, `video-manifest.ts`, `safe-html.pipe.ts`. (`generic-block-node.ts` moved to
Modify in v2.)

## 4. FROZEN-file position

None reached. Sibling files are used for all new logic; no §9 request is made.

## 5. Risks

| Risk | How it would surface | Mitigation |
|---|---|---|
| Filter bypass via an `src` shape the tests did not name (port, trailing dot, whitespace, `youtube-nocookie.com`) | SECURITY_REVIEW; a crafted iframe survives into Copy HTML | Hostname-only decision on parsed `URL`; no substring; unlisted edge cases flagged to human (A-9) and SECURITY_REVIEW; add tests for chosen behaviour of port/case/trailing dot as characterisation, not as new policy |
| Filter bypass via an iframe in a non-div, non-figure container or inside a `<figure>` nested deeper than one level | An off-list iframe in `<figure><div><iframe>` survives | Filter rule is "parent is not `figure`" (direct parent only), mirroring `videoEmbedFigure`'s `:scope > iframe`; the nested case then reaches the schema, where it becomes an `embedIframe` that was filtered unless directly under a figure. Add a test for `figure > div > iframe` off-list host being removed |
| A figure iframe with an off-list host remains unfiltered (A-6) | Not a regression; but a figure path stays unfiltered | Explicit assumption A-6; SECURITY_REVIEW to confirm acceptance; out of scope per spec |
| Source-mode or one gate bypassing the filter | Source-mode Copy includes an off-list iframe | Single composed `sanitizeEditorHtml` used at both gates; `finalizeCopyHtml` test with source-style input |
| Parity message false positive/negative (FR-12/13) | Spurious "Structure changed" or silent loss | Baseline and output share one function; FR-13 test with a kept-then-changed iframe |
| Other `genericBlock` consumers (div/section pass-through, `div.table-responsive`, FAQPage/HowTo sections, `wrapImageFigures`/table paths) change output because `renderHTML` now builds the element itself | A previously passing round-trip, parity, beautify, source-view or table spec fails; or non-`style` attributes (class, id, microdata) change | Edit is limited to the `style` write path; `parseHTML`, attributes and content hole untouched. Guard: the existing `round-trip.spec.ts` genericBlock cases and `structural-parity*.spec.ts`, `beautify-round-trip.spec.ts`, `source-view.spec.ts`, `table-thead.spec.ts` and zero-edit `description_uk-UA.original.html` parity run unmodified (no dedicated genericBlock spec exists; grep finds `genericBlock` only in those files plus `attr-helpers.ts`, `global-attributes.ts`, `index.ts`). Add a `style` verbatim assertion (`margin: 0 auto`) for N = 2, 3 |
| `<p></p>` reappears for some N | FR-2 test fails for one of N = 1,2,3 | Iframe is a real block child of `genericBlock`; tests cover all three N |
| `iframe` rule colliding with `figure` | Existing figure test fails | `getAttrs` guard on figure parent; FR-6 test left unmodified |
| Live iframe loaded inside the editor DOM (node renders a real iframe) | Network request to YouTube/Vimeo when an allowed iframe is loaded | Same as the existing `videoEmbedFigure`; only allow-listed hosts reach the schema; SECURITY_REVIEW input |
| Component wiring untested by an automated component spec (D9) | A mistaken call-site swap compiles but misbehaves | Build + `tsc`; manual Copy HTML check recorded in the quality gate evidence; pure functions carry the logic |
| happy-dom `URL` differs from native for userinfo/`blob:` (U-3) | Negative test passes or fails wrongly | Tests asserted against native semantics; investigate the test environment first |
| Attribute set on `embedIframe` drops an attribute a real paste carries | Silent attribute loss (e.g. `frameborder`) | width/height/frameborder carried; unlisted others unspecified (A-4) |

## 6. Rejected alternatives

1. **Edit `sanitizeUntrustedHtml` in `html-cleaner.ts`.** Simplest single gate, but it is outside the Spec's
   Surface, changes a shared util with other callers, and widens SECURITY_REVIEW scope. Rejected in favour of a
   Surface-local composed sanitizer with the same effect (D3).
2. **Filter inside the TipTap schema (`parseHTML` `getAttrs: false` for off-list hosts).** Keeps one place but would
   not cover Source-mode Copy HTML, would leave `originalHtml` holding the iframe (FR-12 false positive), and
   makes the schema a security boundary.
3. **Widen `genericBlock` to treat `iframe` as inline/raw HTML passthrough, or convert `div > iframe` to
   `<figure>` (reuse `videoEmbedFigure`).** Converting rewrites the markup, which the Story and spec put out of
   scope, and loses wrapper divs and exact attributes. Distinct from the v2 decision: D6 makes only a narrow
   serialisation fix to how `genericBlock` writes `style`; it adds no passthrough, no new accepted content and no
   conversion.
3a. **Leave `genericBlock` unchanged (v1).** Rejected: its spec-based `renderHTML` lets ProseMirror re-serialise
   `style` via `cssText`, so FR-2 verbatim wrapper style fails for N = 2 and 3.
3b. **Put the wrapper style in a new wrapper node or override in `embedIframe`/post-process the HTML.** Rejected:
   a second wrapper node would compete with `genericBlock` for `div`; post-processing hides the defect and adds a
   fourth pipeline step.
4. **Make `embedIframe` inline.** `genericBlock`'s `block+` would not accept it directly, so ProseMirror would
   wrap it in `<p>` and break FR-2 (extra `<p>`).
5. **Reuse `isVideoSrc`.** Substring-based; the Story rejects it as an XSS bypass (spec FR-7).
6. **Add a `html-editor.component.spec.ts` under `ng test` for FR-3/11/12/13.** Unproven feasibility for TipTap and
   CodeMirror in this repo; the pure-function extraction gives the same coverage in the established runner (D9).
7. **Filter only on load, not on copy.** Leaves Source mode and any in-editor insertion unfiltered (two-gate
   hazard); rejected.

## 7. Traceability (Specification v5)

| FR / NFR | Design decision / file |
|---|---|
| FR-1 | D6 `embedIframe` attributes; `embed-iframe-node.ts`; `extensions/index.ts`; round-trip tests |
| FR-2 | D6 (block child of `genericBlock`; `genericBlock.renderHTML` writes `style` verbatim via `setAttribute`); `generic-block-node.ts`; D8 |
| FR-3 | D2 (baseline = output pipeline), D9 (`finalizeCopyHtml`), `editor-html-pipeline.ts` |
| FR-4 | D6 (separate atomic nodes keep document order); D8 |
| FR-5 | D6 (atom, `style` in node attrs); D8 |
| FR-6 | D6 (figure-parent guard), D3 (filter skips figures); existing test unmodified |
| FR-7 | D3 hostname rule; `editor-html-pipeline.ts` |
| FR-8 | D3 protocol rule; `editor-html-pipeline.ts` |
| FR-9 | D3 (unparsable/empty/missing removed; runs after `sanitizeUntrustedHtml`) |
| FR-10 | D6 (sibling text becomes ordinary `paragraph`); D8 |
| FR-11 | D6 (no component work), D8 (EditorState transaction test) |
| FR-12 | D2, D3 (`sanitizeEditorHtml` at load seeds baseline), `html-editor.component.ts` |
| FR-13 | D2 (comparison untouched), D8 FR-13 test |
| NFR-1 | D3 (composition order, `html-cleaner.ts` untouched); SECURITY_REVIEW flagged |
| NFR-2 | D3/D6 (pure functions, no time/random); D8 determinism test |
| NFR-3 | D1, D5, D7 |

## 8. Items for the human

- **Placement of the filter (U-1)** was decided inside the Surface (D3, new sibling file); no Surface widening is
  requested. Overturn only if you prefer the filter inside `sanitizeUntrustedHtml`.
- **Test runner (U-2)** was decided as `test:logic` only via pure-function extraction (D9); no component spec.
- Port, trailing-dot, whitespace and `youtube-nocookie.com` policy remain unspecified (A-9) and are flagged for
  SECURITY_REVIEW.
