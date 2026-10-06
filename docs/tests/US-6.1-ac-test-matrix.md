---
artifact: ac_test_matrix
story: US-6.1
version: 2
status: ARCHIVED
owner: so-test-writer
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T13:00:00Z
supersedes: docs/tests/US-6.1-ac-test-matrix.md#1
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
open_decisions_blocking: false
---

# AC <-> test matrix - US-6.1

Files: `P` = `src/app/components/html-editor/editor-html-pipeline.spec.ts`,
`R` = `src/app/components/html-editor/extensions/round-trip.spec.ts`. All run under `npm run test:logic`.

| AC | FR/NFR | Test file | Test (describe > it) | Asserts |
|---|---|---|---|---|
| AC-1 | FR-1 | R | `div-wrapped YouTube iframe - attributes and wrappers survive (US-6.1 AC-1, AC-2)` > `keeps the iframe attributes and the wrapper divs for N = 1/2/3 wrappers` | exactly one iframe; `src`, `title`, `allow`, `referrerpolicy`, `loading`, `style` equal to input; `allowfullscreen` present |
| AC-2 | FR-2 | R | same tests (N = 1, 2, 3); plus `genericBlock - wrapper style is returned verbatim (US-6.1 AC-2, plan v2 D6)` > `does not re-serialise the style of a plain wrapper div` (3 styles incl. `margin: 0 auto;`), `keeps class, id, itemprop, itemtype and itemscope unchanged on a div and a section`, `skips null attributes: a bare div gets no empty ... attribute`, `skips only the missing attributes` | each wrapper keeps its `style` verbatim (`margin: 0 auto`, not `0px`), nesting order, iframe innermost, zero `<p>`; non-style genericBlock attributes unchanged; null attributes not emitted |
| AC-3 | FR-3 | P | `T3 Copy HTML structure check with an allowed div-wrapped iframe (FR-3, AC-3)` > `raises no iframe structure message ... wrapped in 1/2/3 divs` | real `validateStructuralParity` yields no `<iframe>` src-list issue; the iframe src is in the output (non-vacuous) |
| AC-4 | FR-4 | R | `two div-wrapped iframes keep their order (US-6.1 AC-4)` > `returns both src values in the original order` | `[youtube src, vimeo src]` in order |
| AC-5 | FR-5 | R | `editing elsewhere leaves a div-wrapped iframe untouched (US-6.1 AC-5)` > `outputs the embed chain unchanged after typing in a paragraph below it` | transaction edits a later paragraph; embed chain `outerHTML` identical before/after, same position |
| AC-6 | FR-6 | R (existing, unmodified) + P | `videoEmbedFigure - attribute fidelity` > `preserves iframe attrs and a hand-edited caption verbatim`; P: `T1 filterEmbedIframes - figure-wrapped iframes are untouched (FR-6, A-6)` > `keeps a figure > iframe with an off-list host exactly as it is` | existing test stays green unedited; filter does not touch a direct-figure iframe even on `youtube.invalid` |
| AC-7 (FR-7 hostname) | FR-7 | P | `T1 filterEmbedIframes - hostname rule (FR-7, AC-7)` > `removes a div-wrapped iframe: <shape>` (one test per shape: example.com; `?x=youtube.com`; `youtube.com.evil.example`; `evil.example/youtube.com`; `notyoutube.com`; `https://youtube.com@evil.example/`; `notvimeo.com`), plus `removes a bare (unwrapped) off-list iframe`, `removes an off-list iframe nested as figure > div > iframe`, mixed-order test | iframe absent from output; wrapper div and surrounding text remain |
| AC-7 (kept) | FR-7 | P | same describe > `keeps a div-wrapped iframe and does not rewrite its src: <shape>` (www.youtube.com?rel=0, youtube.com, m.youtube.com, youtu.be, player.vimeo.com, vimeo.com) and `keeps every other attribute ...` | one iframe, `src` byte-identical, other attributes unchanged |
| AC-7 (FR-8 protocol) | FR-8 | P | `T1 filterEmbedIframes - protocol rule (FR-8, AC-7)` > `removes a div-wrapped iframe with ftp: / javascript: / data: / blob:` (one test each), `keeps http: with an allow-listed hostname` | removed / kept as specified |
| AC-7 (FR-9 empty/unparsable) | FR-9 | P | `T1 filterEmbedIframes - empty, missing and unparsable src (FR-9, AC-7)` > empty, no src attribute, unparsable (`http://`, free text), relative, protocol-relative; and `T1 sanitizeEditorHtml ...` > `removes (not merely empties) an iframe whose javascript: / data: src ...` | iframe removed, not left with an empty src |
| AC-7 (NFR-1) | NFR-1 | P | `T1 sanitizeEditorHtml ...` > `still strips <script>, <style> and on* attributes around a kept iframe`; `T1 finalizeCopyHtml ...` > filters off-list / keeps allowed / base sanitizer applied | parity with existing sanitizer; both gates (Copy, Source) filter |
| AC-8 | FR-10 | R | `text beside a div-wrapped iframe (US-6.1 AC-8)` > `keeps the sibling text in the editor document and in the output, after the iframe` | text in PM `doc.textContent` and in output; text follows the iframe; wrapper `style` kept |
| AC-8 | FR-11 | R | same describe > `keeps the sibling text editable: typed characters appear in the output at the edited position` | `insertText('XYZ')` mid-text appears as `Watch XYZthe full demo`; iframe still present |
| AC-9 | FR-12 | P | `T2 structural-parity baseline after load-time sanitization (FR-12, AC-9)` > `raises no iframe structure message ... : <off-list host / notyoutube.com / userinfo / ftp: / javascript: / empty src>`; `applies the same gate to Source-mode style input` | baseline and output both lack the iframe; no iframe parity issue |
| AC-9 | FR-13 | P | `T3 a kept iframe that is changed or lost still triggers the warning (FR-13, AC-9)` > `warns when the iframe is deleted during editing`, `warns when the iframe src is changed during editing`; `T3 zero-edit parity ...` | exactly one iframe parity issue naming the original (and changed) src; zero-edit real document has no issue |
| (NFR-2) | NFR-2 | P, R | `T1 filterEmbedIframes - determinism`, `T1 finalizeCopyHtml ... is deterministic`, R `div-wrapped iframe round trip is deterministic (US-6.1 NFR-2)` | same input -> same output |

Not covered by any automated test (by decision, see test strategy section 4): the two `html-editor.component.ts`
call-site swaps (manual QA, plan D9); A-9 edge cases (port, case, whitespace, trailing dot, `youtube-nocookie.com`).
