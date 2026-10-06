---
artifact: impact_analysis
story: US-6.1
version: 1
status: DRAFT
owner: so-impact-analyzer
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T00:00:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: open_decisions
    version: 4
open_decisions_blocking: false
---

# Impact Analysis: US-6.1 - Preserve a pasted YouTube/Vimeo iframe and its wrapper divs in the HTML editor

All paths were re-derived from the working tree on this run (searches: `iframe`, `sanitizeUntrustedHtml`,
`validateStructuralParity`, `html-cleaner`, `STORE_REGISTRY`, `genericBlock`, `originalHtml`).

## Mechanism of the defect (impact, not design)

- `GenericBlock` (`extensions/generic-block-node.ts`) claims `div`/`section` with `content: 'block+'`.
  No node in `TIPTAP_EXTENSIONS` accepts a bare `<iframe>`; only `VideoEmbedFigure` accepts one and only inside
  a `<figure>` (`parseHTML` tag `figure`). A `div > div > iframe` therefore parses to empty wrapper(s) with an
  auto-filled `<p></p>`, and the iframe is lost.
- `html-editor.component.ts` `load()` sets `originalHtml = sanitizeUntrustedHtml(html)` (line ~395); `copy()`
  runs `validateStructuralParity(originalHtml(), buildCopyHtml(), ...)` (line ~414). The
  "Structure changed since load" text is `issuesTitle` (line 32). The iframe message is the
  `structural-parity-media` rule in `src/utils/structural-parity.ts` (`srcList(html,'iframe')`, a regex that
  requires a double-quoted `src="..."`).
- `sanitizeUntrustedHtml` (`src/utils/html-cleaner.ts:353`) currently removes only script/style, `on*`, and
  `javascript:`/`data:` href/src. It does not remove iframes. The new FR-7/8/9 filter has no existing home.

## Affected files

### Must change (necessarily reached by FR-1..FR-13)

| File | Why | Notes |
|---|---|---|
| `src/app/components/html-editor/extensions/` (a node or parse path that accepts a bare iframe inside `genericBlock`, plus registration in `extensions/index.ts`) | FR-1, FR-2, FR-4, FR-5, FR-10, FR-11: currently no node can hold the iframe | Which file/shape is a planner decision. `index.ts` is the only registration point (`TIPTAP_EXTENSIONS`). `genericBlock` needs `block+` content to be able to contain whatever carries the iframe. |
| The place that applies the FR-7/FR-8/FR-9 filter | Filter must run on load and before the baseline is taken (FR-12) | Candidates the planner must choose between: `src/utils/html-cleaner.ts` (`sanitizeUntrustedHtml`, outside the Spec's stated Surface `src/app/components/html-editor/**`) or a new editor-side step. See Unknown U-1. |

### Needs re-verification even if unchanged

| File | Why |
|---|---|
| `src/app/components/html-editor/html-editor.component.ts` | `load()` baseline (`originalHtml`), `buildCopyHtml()` (stripTiptapArtifacts, reconstructTableThead, wrapImageFigures, sanitizeUntrustedHtml), `copy()` parity call. FR-12 depends on the baseline being derived after the filter. Also the Source-mode path (`currentSourceHtml()`) bypasses TipTap entirely. |
| `src/utils/structural-parity.ts` | Comparison logic is out of scope (FR-13 must keep warning). Note: it is the uk-UA master/translation parity validator, shared with `content-orchestrator.service.ts`, `table-finalize.ts`, `spec-category-merge.ts`; it must not be touched here. |
| `src/utils/html-cleaner.ts` | `stripTiptapArtifacts` and `sanitizeUntrustedHtml` run on the Copy path. `cleanHtmlStructure` contains a separate iframe standardiser (lines ~187-237, rewrites style/attrs, wraps in a div); NFR-1 says it is not applied here; confirm it is not reached from the editor path (it is imported by `content-orchestrator.service.ts`, not by the component). |
| `src/app/components/html-editor/extensions/video-embed-figure-node.ts` | Figure-wrapped iframe path must be unchanged (FR-6). A new bare-iframe parse rule must not match iframes already claimed by `figure` (priority 60) nor change which node claims `<figure><iframe>`. |
| `src/app/components/html-editor/extensions/generic-block-node.ts` | Claims every `div`; its `style` attr is what FR-2 requires to survive. Its `class`/`id`/microdata handling is shared with FAQ/table-wrapper fixtures. |
| `src/app/components/html-editor/extensions/global-attributes.ts` | Does not list any iframe or div type; a new node's `style` must carry its own attributes. |
| `src/utils/video-figure.ts`, `src/utils/video-manifest.ts` | Contain `isVideoSrc` (substring); the Spec forbids reuse/modification as the editor rule. Re-verify no accidental import. |
| `src/app/pipes/safe-html.pipe.ts` | Mentions iframes; editor output preview/rendering surface (security review input). |

### Tests that cover them

| Test | Runner | Relevance |
|---|---|---|
| `src/app/components/html-editor/extensions/round-trip.spec.ts` | `npm run test:logic` (vitest, happy-dom; matches `src/**/*.spec.ts`, not `*.component.spec.ts`) | The home for new schema-level tests (FR-1, 2, 4, 5, 10). Test "preserves iframe attrs and a hand-edited caption verbatim" (line ~85, `youtube.invalid` fixture) is the FR-6 guard and must stay unmodified. It uses `PMDOMParser.fromSchema` directly, no live Editor. |
| `src/utils/html-cleaner.spec.ts` (`sanitizeUntrustedHtml` describe at line ~230) | `test:logic` | Natural home for FR-7/8/9 negative shapes if the filter lives in `html-cleaner.ts`; existing `javascript:`/`data:` cases (NFR-1) must stay green. |
| `src/utils/structural-parity.spec.ts`, `structural-parity.v4.spec.ts`, `structural-parity-restore.spec.ts`, `simplified-translation-parity.spec.ts` | `test:logic` | Guard FR-13 (comparison unchanged). Not expected to change. |
| `src/app/components/html-editor/beautify-round-trip.spec.ts`, `source-view.spec.ts`, `find-replace-query.spec.ts`, `extensions/search-replace-extension.spec.ts`, `extensions/table-thead.spec.ts` | `test:logic` | Regression surface for any schema change. |
| FR-3, FR-11, FR-12, FR-13 (Copy HTML warning, typing into sibling text) | see Unknown U-2 | `copy()` and typing need the component/live Editor; no `html-editor.component.spec.ts` exists. Schema-level specs cannot exercise the clipboard path. |

## Hazard table (all seven checked)

| # | Hazard | Applies? | Evidence |
|---|---|---|---|
| 1 | `STORE_REGISTRY` fan-out | Does not apply | Spec Scope is store-independent. Re-derived consumers via search: `STORE_REGISTRY` is not referenced anywhere under `src/app/components/html-editor/**` or in `html-cleaner.ts`/`structural-parity.ts`. No registry field is read or changed. |
| 2 | uk-UA master vs translation | Does not apply | Nothing is generated or translated (Spec Scope; NFR-3). Note only the name overlap: `structural-parity.ts` is documented as the uk-UA master-to-translation check but here is called with the editor's own load-time HTML as "master". |
| 3 | Prompt -> schema -> renderer -> validator chain | Does not apply to the chain; applies to an editor-local analogue | No `src/prompts`, `src/prompt-core`, `src/domain/*.schema.ts`, `src/render/*` or `output-validator.ts` change. The editor-local chain affected is: sanitizer (`html-cleaner.ts`) -> TipTap schema (`extensions/*`) -> `getHTML` serializer -> `buildCopyHtml` fix-ups -> `validateStructuralParity`. Links touched: sanitizer (new filter), schema (new bare-iframe acceptance), parity baseline (FR-12). |
| 4 | FROZEN files (AGENTS.md §9) | Does not apply | Frozen set (`task-{a,b,c}.ts`, `master-system-prompt.ts`, `output-validator.ts`) is not on the change path. `structural-parity.ts` is documented as NOT frozen but its comparison is out of scope. `arch-guard.sh` has no checksum entries for the editor files (searched `html-editor`, `html-cleaner`, `video-embed`, `generic-block`: no matches). |
| 5 | Corpus conformance harness | Does not apply | `test/fixtures/corpus/` (2 Ortur H20 items; report §5 gap) feeds the renderer conformance specs only; no renderer output changes. The editor fixture needed here (AC-1) is a new `Knowledge/Issues/1/yt-iframe.txt`-derived string for `round-trip.spec.ts`, not a corpus triple. That file contains one real YouTube iframe in a Spanish AgiBot X2 description; the exact `title`/`allow` values must be taken from it (Spec). The existing `src/utils/__fixtures__/description_uk-UA.original.html` fixture used by `round-trip.spec.ts` is shared and must keep passing with zero-edit parity. |
| 6 | Two test runners | Applies | New schema/sanitizer tests land in `test:logic` (vitest, happy-dom). Only `content-template-select` and `model-settings` have `*.component.spec.ts` under `test:components` (`ng test`); there is no editor component spec. Whether FR-3/11/12/13 need that runner is Unknown U-2. |
| 7 | Server-side surfaces | Does not apply | No `server/**` file is reachable; searched imports of the editor files (none from `server/`). |

## Silent-failure risks (produce wrong output, not an error)

1. **Parity baseline divergence (FR-12).** If the FR-7/8/9 filter is applied inside the editor (parse/schema
   step) but `originalHtml` was captured from the unfiltered sanitized string, Copy HTML shows a false
   "Structure changed" for every removed iframe; conversely if the filter is applied to the output but not
   the baseline, a removed iframe is silently reported as lost. No exception either way.
2. **Weakened check (FR-13).** Anything that makes baseline and output both lose the iframe (e.g. filtering
   both sides with a rule that also drops allowed iframes) turns the existing media check into a no-op for
   iframes with no failing test unless FR-13 is tested with a kept-then-altered iframe.
3. **`srcList` regex fragility.** `structural-parity.ts` only sees double-quoted `src="..."`. A serializer
   round trip that re-quotes or reorders attributes is fine; a filter that rewrites `src` into the
   `URL`-normalised form (Spec A-9 says write back the original string) would change the byte-identical
   comparison silently for `?rel=0`/`&amp;` forms.
4. **Figure-wrapped iframes (FR-6).** If the host filter also reaches `<figure>` iframes, the existing
   `youtube.invalid` fixture would be removed. The existing test would then fail loudly, but a subtler variant
   is real figure iframes with off-list hosts being silently dropped at runtime for generator output.
5. **`genericBlock` auto-`<p>`.** Wrappers that contain only an iframe depend on how the new acceptance is
   modelled; a model that still lets ProseMirror pad empty `block+` content reintroduces `<p></p>` (FR-2)
   in some N values but not others. N = 1, 2, 3 all need tests.
6. **Source-mode path.** Source mode serves CodeMirror text directly (`currentSourceHtml()`), so an iframe
   that the WYSIWYG drops can still appear in the output, only `sanitizeUntrustedHtml` runs on it. Host/protocol
   filtering would then apply only if it lives in `sanitizeUntrustedHtml`; if it lives in the TipTap path only,
   Source-mode Copy HTML would bypass FR-7/8 silently (a security-relevant divergence).
7. **Two sanitisation calls.** `sanitizeUntrustedHtml` is called at load and at copy as "two independent
   gates". A filter placed in only one of them leaves the other path unfiltered.
8. **Sibling text and `block+`.** Bare text beside an iframe inside a div is auto-wrapped in `<p>` by
   ProseMirror (existing test at line ~228 documents this); output differs textually from input (A-5(c) says
   unspecified), so tests must not assert string equality.

## Fixture and corpus impact

- `test/fixtures/corpus/*`: not moved (no render change). Corpus gap (report §5, two items, same product) is
  irrelevant because no corpus coverage is needed.
- New fixtures needed: N = 1, 2, 3 wrapper HTML built from `Knowledge/Issues/1/yt-iframe.txt` (exact
  `title`/`allow`); a two-chain document (FR-4); sibling-text document (FR-10/11); and one input per
  FR-7/FR-8 negative shape (6 + 3 shapes, one test each) plus the kept shapes. These are inline test strings.
- Existing fixtures that must remain green unchanged: `round-trip.spec.ts` figure test, the
  `description_uk-UA.original.html` zero-edit parity test.

## Blast-radius summary

The change is confined to the HTML editor in effect: a new way for the TipTap schema to hold a bare iframe
inside `genericBlock` wrappers, and a new strict-URL iframe filter that must run before the parity baseline
is captured. No store, locale, prompt, renderer, domain schema, server or FROZEN file is reached, and no
corpus fixture moves. The two risks a planner must act on are placement and scope of the filter: the natural
home (`sanitizeUntrustedHtml` in `src/utils/html-cleaner.ts`) is outside the Spec's stated Surface
(`src/app/components/html-editor/**`), and where the filter lives decides whether Source mode, the two
sanitize gates (load and copy), and the FR-12 baseline all see it. The Copy HTML/warning requirements
(FR-3, FR-12, FR-13) and typing (FR-11) cannot be exercised by the existing schema-level `round-trip.spec.ts`
approach alone, and there is no editor component spec. Everything else lands in the vitest runner
(`test:logic`).

## Unknowns

- **U-1 (surface mismatch):** The Spec declares Surface `src/app/components/html-editor/**`, yet the cheapest
  correct placement of FR-7/8/9 is `src/utils/html-cleaner.ts` (shared util with its own spec). Not
  determinable from the Spec whether editing `html-cleaner.ts` is in scope. It is not frozen. Resolution: the
  planner records the decision, or a human widens Surface. Does not block this stage (the Spec does not forbid
  it; `sanitizeUntrustedHtml` is not used by the generation pipeline per search).
- **U-2 (test runner for Copy/typing behaviour):** FR-3, FR-11, FR-12, FR-13 involve `copy()` and live typing.
  Whether they are tested by extracting pure helpers into `test:logic` or by a new `*.component.spec.ts`
  under `test:components` (`ng test`, currently two files, none for the editor) cannot be decided here.
  Resolution: so-planner / so-test-writer, after checking that `ng test` can mount `HtmlEditorComponent`
  (TipTap, CodeMirror) in this repo.
- **U-3:** Whether `happy-dom` `URL` parsing matches the native `URL` for the userinfo and `blob:` shapes
  (FR-7/8 negative tests) was not executed; it is a test-time check. The filter itself runs in the browser.
- **U-4:** Behaviour of `sanitizeUntrustedHtml` for a removed iframe leaving an otherwise empty wrapper div
  (A-7(b)): not specified, so the effect on the schema's `block+` requirement for that div (an empty
  `genericBlock`) was not determined.
