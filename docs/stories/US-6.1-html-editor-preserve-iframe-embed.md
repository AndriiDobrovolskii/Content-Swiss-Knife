---
artifact: story
story: US-6.1
slug: html-editor-preserve-iframe-embed
title: Preserve a pasted YouTube/Vimeo iframe and its wrapper divs in the HTML editor so Copy HTML no longer fails with "Structure changed"
track: angular
version: 4
status: DRAFT
owner: so-story-writer
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T00:00:00Z
---

# US-6.1 — Preserve a pasted YouTube/Vimeo iframe and its wrapper divs in the HTML editor

## Story

> Bug Story — **Observed / Expected / Reproduction** replace the usual actor sentence.

**Actor:** a content operator pasting an existing description into the HTML editor and copying
it back out — typically to migrate a description from one store to another and adapt it.

### Observed

An existing description contains a video embed wrapped in two plain divs:

```html
<div style="width: 100%; max-width: 1000px; aspect-ratio: 16 / 9; margin: 4px auto;"><div style="max-width: 1200px; width: 100%; margin: 0 auto;"><iframe src="https://www.youtube.com/embed/Y9C9_tiOsbQ?rel=0" title="…" loading="lazy" allow="…" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen="" style="width: 100%; aspect-ratio: 16 / 9; border: none;"></iframe></div></div>
```

After the description is pasted into the HTML editor:

1. The `<iframe>` is dropped and the inner div collapses to an empty `<p></p>`:
   `<div style="…"><div style="…"><p></p></div></div>`.
2. Clicking **Copy HTML** shows: `Structure changed since load: <iframe> src list diverges from the
   uk-UA master. Expected (in order): [https://www.youtube.com/embed/Y9C9_tiOsbQ?rel=0]. Got: [].
   Every src must be carried over byte-identical and in the same order.`

The same `<iframe>` inside a `<figure>` already round-trips (see `video-embed-figure-node.ts`);
only the bare, div-wrapped form is lost.

### Expected

The `<iframe>` and all its wrapper divs, with all their attributes and inline styles, survive
paste and **Copy HTML** unchanged, however many wrapper divs there are (1..N), and no
"Structure changed" warning is raised for them. An iframe that is not a YouTube/Vimeo embed, or
has an empty `src`, is not preserved (see AC-7), and removing it does not raise a "Structure changed" warning (AC-9).

### Reproduction

1. Open the HTML editor. 2. Paste the description in `Knowledge/Issues/1/yt-iframe.txt`.
3. Click **Copy HTML**.

## Context

Reported by the content operator on a description copied from 3DDevice and being adapted for a
store with an es locale (AgiBot X2 EDU). Evidence: `Knowledge/Issues/1/yt-iframe.txt` (input
HTML, error text and the mutated HTML). Human decision (2026-10-06): the cross-store
copy/adapt scenario is **intentional** — operators copy a description, including its video,
from one store to another and replace links — so the fix must work for any store and locale and
must not depend on which store the HTML came from. Human decision (2026-10-06, on approving spec v4): the `src` protocol must be strictly `https:` or `http:`, anything else is removed; explicit negative tests are required for `notyoutube.com` and `https://youtube.com@evil.example/`; a bare (unwrapped) iframe that survives sanitization is acceptable — strict round-trip parity is required only for div-wrapped iframes. Human decision (2026-10-06, on rejecting spec v3): host filtering must use strict `URL` hostname parsing with exact or subdomain match on `youtube.com`, `youtu.be`, `vimeo.com` and `player.vimeo.com` — substring matching is rejected as an XSS bypass; and the Copy HTML parity baseline is taken after load-time sanitization. The editor's video support models only
`<figure>` + `<iframe>` (`video-embed-figure-node.ts`), so a div-wrapped iframe falls through to
the generic schema and is discarded.

## Scope

| | |
|---|---|
| **Stores** | all of STORE_REGISTRY — the defect does not depend on the store |
| **Locales** | all of STORE_REGISTRY locales — the defect is locale-independent |
| **Surface** | `src/app/components/html-editor/**` (extensions, round-trip, structure check, sanitization of pasted iframes) |
| **Touches FROZEN files?** | no |
| **Touches generated HTML?** | no — editor round-trip of existing HTML; no prompt or renderer change |

## Acceptance criteria

- **AC-1:** Loading HTML in which a YouTube or Vimeo `<iframe>` is wrapped in N nested `<div>`
  elements (tested for N = 1, 2 and 3) into the editor and reading it back with no edits returns
  the same `<iframe>` with a byte-identical `src`, and its `title`, `allow`, `referrerpolicy`,
  `loading`, `allowfullscreen` and `style` attributes unchanged.
- **AC-2:** In the same round trip every wrapper div is returned with its original `style`
  attribute, in the original nesting order (outermost div > … > innermost div > iframe), and no
  `<p></p>` appears in place of the iframe.
- **AC-3:** Clicking **Copy HTML** on that document does not produce a "Structure changed since
  load" message for the `<iframe>` src list.
- **AC-4:** A document with two div-wrapped iframes keeps both `src` values in their original
  order after the round trip.
- **AC-5:** Editing text elsewhere in the document leaves the div-wrapped `<iframe>` and its
  wrappers unchanged in the output.
- **AC-6:** The existing `<figure>`-wrapped iframe case still round-trips as before
  (`round-trip.spec.ts` "preserves iframe attrs…" stays green).
- **AC-7:** A pasted bare or div-wrapped `<iframe>` is kept only if its `src` parses with the
  native `URL` object, the parsed `protocol` is `https:` or `http:`, and the parsed `hostname`
  equals, or is a subdomain of, one of
  `youtube.com`, `youtu.be`, `vimeo.com` or `player.vimeo.com`. Otherwise it is removed during
  sanitization and appears neither in the editor document nor in the Copy HTML output. This
  covers an empty or missing `src`, an unparsable `src`, any other protocol (e.g.
  `ftp://youtube.com/x`), an unknown host
  (e.g. `https://example.com/embed/1`), and look-alikes whose host is not allow-listed even
  though the allow-listed name occurs elsewhere in the URL (e.g.
  `https://evil.example/?x=youtube.com`, `https://youtube.com.evil.example/embed/1`,
  `https://evil.example/youtube.com`, `https://notyoutube.com/embed/1` (no dot boundary),
  `https://youtube.com@evil.example/` (userinfo)). Each of these shapes has its own test.
  Substring matching on the whole `src` is not acceptable.
- **AC-8:** When plain text sits next to the `<iframe>` inside the same wrapper div, that text
  is present in the editor document and in the Copy HTML output, and typing into it changes the
  output accordingly (it stays editable).
- **AC-9:** When Copy HTML runs on a document whose pasted iframe was removed by AC-7, the
  structural-parity check takes its baseline from the HTML after load-time sanitization, so no
  "Structure changed since load" message is shown for that removed iframe. A kept iframe whose
  `src` is later changed or lost during editing still triggers the message.

## Out of scope

- Normalising or rewriting iframe markup (e.g. converting div wrappers to `<figure>`).
- Allowing hosts other than `youtube.com`, `youtu.be`, `vimeo.com` and `player.vimeo.com` (and their subdomains).
- The `<b>` → `<strong>` defect (US-6.2).

## Open questions

- **Q1:** Does the AC-7 host rule also apply to `<figure>`-wrapped iframes?
  - Checked: the human statement says the allow-list applies to pasted "bare" iframes "as for
    `<figure>` video"; the existing figure test (`round-trip.spec.ts:85`) uses the host
    `youtube.invalid`, which a strict `youtube.com` match would reject, and AC-6 requires that
    test to stay green.
  - Impact if unresolved: a specification would have to assume the rule is limited to bare and
    div-wrapped iframes (as AC-7 is worded) and leave the figure path unchanged.

## References

- `Knowledge/Issues/1/yt-iframe.txt`
- `src/app/components/html-editor/extensions/video-embed-figure-node.ts`, `round-trip.spec.ts`
- `src/app/components/html-editor/html-editor.component.ts` ("Structure changed since load:")
- `src/utils/video-figure.ts` (`isVideoSrc` — substring-based today; AC-7 requires stricter `URL` hostname matching, not parity with it)
