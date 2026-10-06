---
artifact: specification
story: US-6.1
version: 5
status: ARCHIVED
owner: so-spec-writer
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T00:00:00Z
supersedes: docs/specifications/US-6.1-spec.md#4
inputs_consumed:
  - key: story
    version: 4
  - key: clarification_report
    version: 4
  - key: open_decisions
    version: 4
open_decisions_blocking: false
---

# Specification: US-6.1 — Preserve a pasted YouTube/Vimeo iframe and its wrapper divs in the HTML editor

## Summary

A YouTube or Vimeo `<iframe>` that sits inside N (1, 2 or 3 tested) plain wrapper `<div>` elements
survives loading into the HTML editor, editing elsewhere, and **Copy HTML** with its attributes and
the wrapper divs intact, and the "Structure changed since load" warning is not raised for it. Plain text
beside the iframe in the same wrapper div is kept and stays editable. A pasted bare or div-wrapped
`<iframe>` is kept only if its `src` parses with the native `URL` object, the parsed `protocol` is
`https:` or `http:`, and the parsed `hostname` equals or is a subdomain of `youtube.com`, `youtu.be`,
`vimeo.com` or `player.vimeo.com`; any other iframe is removed during sanitization, and its removal does
not raise the structure warning. The existing `<figure>`-wrapped iframe behaviour is unchanged.

## Background

A content operator pasted a description containing a YouTube embed in two nested divs
(`div > div > iframe`). The editor discarded the iframe and left an empty `<p></p>` in the inner div;
Copy HTML then failed with the "Structure changed since load: <iframe> src list diverges" message.
The editor models only `<figure>` + `<iframe>`; a div-wrapped iframe has no node that accepts it.
Evidence: `Knowledge/Issues/1/yt-iframe.txt` (source for the AC-1 fixture, including the exact `title`
and `allow` values the Story elides). The check that emits the message is the structural parity
validation invoked by Copy HTML; its comparison logic is not being changed, only the baseline it is
given (FR-12). Human decisions recorded in the Story: the cross-store copy/adapt scenario is
intentional, so behaviour must not depend on which store the HTML came from; host filtering uses strict
`URL` hostname parsing (substring matching is rejected as an XSS bypass); the `src` protocol must be
strictly `https:` or `http:`; explicit negative tests are required for look-alike, `notyoutube.com`,
userinfo and other-protocol shapes; and a bare (unwrapped) iframe that survives sanitization is
acceptable, with strict round-trip parity required only for div-wrapped iframes. The existing helper
`isVideoSrc` (`src/utils/video-figure.ts`) is substring-based and is not the rule required here; it is
neither reused nor modified as the editor rule.

## Scope

| | |
|---|---|
| **Stores** | All `STORE_REGISTRY` stores. The editor round trip has no store input; behaviour is store-independent. |
| **Locales** | All `STORE_REGISTRY` locales. No locale input exists, so no uk-UA master fan-out applies (nothing is generated or translated). |
| **Track** | angular |
| **Surface** | `src/app/components/html-editor/**` (per the Story) |
| **FROZEN files (AGENTS.md §9)** | none |

## Functional requirements

"Allowed iframe", wherever used below, means an iframe satisfying FR-7 and FR-8.

### FR-1: Allowed iframe attributes survive the round trip for N = 1, 2 and 3 wrappers

When HTML in which an allowed iframe is wrapped in N nested `<div>` elements (tested for N = 1, 2 and 3)
is loaded into the HTML editor and read back with no edits, the output contains the `<iframe>` with a
`src` byte-identical to the input, and with `title`, `allow`, `referrerpolicy`, `loading`,
`allowfullscreen` and `style` equal to the input values (DOM-level comparison, see Assumption A-4).

**Failure path:** if any of these attributes differs from the input, or the iframe is absent, for any of
N = 1, 2 or 3, the round trip is defective and the test for this requirement fails.

### FR-2: Wrapper divs survive the round trip

In the same round trip (N = 1, 2 and 3), every wrapper div is returned with its original `style`
attribute, in the original nesting order (outermost div > … > innermost div > iframe). No `<p></p>` (or
other substituted element) appears in place of the iframe.

**Failure path:** a missing wrapper, altered `style`, changed nesting order, or an empty `<p>` in place
of the iframe fails this requirement.

### FR-3: Copy HTML raises no iframe structure warning for an allowed iframe

When the operator clicks **Copy HTML** on an unedited document containing an allowed div-wrapped
iframe, the editor does not show the "Structure changed since load" message concerning the `<iframe>`
src list.

**Failure path:** if the iframe src list of the output differs from the baseline's (a kept iframe lost,
reordered or altered), the existing structure check still reports the divergence (see FR-13); this Story
does not weaken or bypass that check.

### FR-4: Multiple div-wrapped iframes keep order

When a document contains two allowed div-wrapped iframes (Assumption A-5: two separate wrapper chains
with distinct `src`), both `src` values appear in the output in their original order after the round
trip.

**Failure path:** a dropped, duplicated or reordered iframe fails this requirement.

### FR-5: Unrelated edits leave the embed untouched

When the operator edits text elsewhere in the document, the allowed div-wrapped iframe and its wrappers
are output unchanged (same attributes, same nesting, same position relative to the surrounding content).

**Failure path:** any change to the embed or its wrappers as a result of an unrelated edit fails this
requirement.

### FR-6: Figure-wrapped iframe behaviour is unchanged

The existing `<figure>`-wrapped iframe case round-trips exactly as before; the existing
`round-trip.spec.ts` test "preserves iframe attrs…" remains green without modification (see Assumption
A-6).

**Failure path:** if that test fails or must be altered to pass, this requirement is not met.

### FR-7: A pasted bare or div-wrapped iframe is kept only for an allow-listed `URL` hostname

During sanitization of pasted or loaded HTML, a bare or div-wrapped `<iframe>` whose `src` parses with the
native `URL` object is kept only if the parsed `hostname` equals, or is a subdomain (dot boundary) of, one
of `youtube.com`, `youtu.be`, `vimeo.com` or `player.vimeo.com`. The decision uses the parsed `hostname`
only, never a substring search over the whole `src` string. An iframe that is not kept is removed: it
appears neither in the editor document nor in the Copy HTML output. The name `isVideoSrc` denotes the
existing substring-based helper and is not this rule.

Each of the following is removed, and each has its own test (one test per shape):
- `https://example.com/embed/1` (unknown host);
- `https://evil.example/?x=youtube.com` (allow-listed name in the query);
- `https://youtube.com.evil.example/embed/1` (allow-listed name as a prefix of the host);
- `https://evil.example/youtube.com` (allow-listed name in the path);
- `https://notyoutube.com/embed/1` (no dot boundary);
- `https://youtube.com@evil.example/` (userinfo; the parsed hostname is `evil.example`).

Each of the following is kept: `https://www.youtube.com/embed/Y9C9_tiOsbQ?rel=0`, `https://youtu.be/x`,
`https://player.vimeo.com/video/1`, `https://vimeo.com/1`.

**Failure path:** an iframe with a non-allow-listed hostname that is present in the editor document or in
the Copy HTML output, or an allow-listed iframe that is removed, fails this requirement.

### FR-8: A pasted bare or div-wrapped iframe is kept only for an `https:` or `http:` protocol

During the same sanitization, a bare or div-wrapped `<iframe>` whose `src` parses with the native `URL`
object is kept only if the parsed `protocol` is `https:` or `http:`. An iframe with any other protocol is
removed and appears neither in the editor document nor in the Copy HTML output, even when its hostname is
allow-listed.

Each of the following is removed, and each has its own test: `ftp://youtube.com/x`; `javascript:` and
`data:` sources (these are also covered by the existing `sanitizeUntrustedHtml`, NFR-1); `blob:`.
`http://www.youtube.com/embed/x` is kept (protocol `http:` with an allow-listed hostname).

**Failure path:** an iframe with a non-`https:`/`http:` protocol present in the editor document or in the
Copy HTML output, or an `http:` iframe with an allow-listed hostname that is removed, fails this
requirement.

### FR-9: A pasted iframe with an empty, missing or unparsable src is removed

When a pasted bare or div-wrapped `<iframe>` has an empty `src`, no `src` attribute, or a `src` that the
native `URL` object cannot parse, sanitization removes it: it does not appear in the editor document or
in the Copy HTML output. An iframe whose `src` was emptied by the existing `sanitizeUntrustedHtml`
(a `javascript:`/`data:` value) falls under this requirement.

**Failure path:** if such an iframe is present in the editor document or in the Copy HTML output, this
requirement is not met.

### FR-10: Sibling text beside the iframe is preserved

When plain text sits next to an allowed `<iframe>` inside the same wrapper div, that text is present in
the editor document and in the Copy HTML output.

**Failure path:** if the text is missing from either the editor document or the output, this requirement
is not met.

### FR-11: Sibling text stays editable

In the same document as FR-10, typing into that sibling text changes the Copy HTML output accordingly (the
typed characters appear in the output at the edited position).

**Failure path:** if the text cannot be edited or the typed characters do not appear in the output, this
requirement is not met.

### FR-12: The structural-parity baseline is taken after load-time sanitization

When Copy HTML runs on a document whose pasted iframe was removed under FR-7, FR-8 or FR-9, the
structural parity check compares the output against a baseline taken from the HTML after load-time
sanitization, so no "Structure changed since load" message is shown for that removed iframe.

**Failure path:** if the message is shown for an iframe that sanitization removed, this requirement is
not met.

### FR-13: A kept iframe that is later changed or lost still triggers the warning

When a kept (allowed) iframe's `src` is changed or lost during editing, Copy HTML still shows the
"Structure changed since load" message for the iframe src list.

**Failure path:** if no message is shown for such a change or loss, this requirement is not met (the
check has been weakened).

## Generated-HTML rule in play (AGENTS.md §4) — rationale, not a requirement

This Story changes no prompt, renderer or generated HTML, so no §4 generation criterion is restated as
a functional requirement. The §4 rule that motivates the fix is:

> "**A video embed present in the input is present in the output.** A YouTube/Vimeo
> `<iframe>` in the source description must survive into every generated language version.
> Losing it is a bug, not a stylistic choice" — see `src/utils/video-manifest.ts`

The verifiable behaviour for the editor round trip is carried by FR-1 to FR-5, FR-10 and FR-11. The §4
rule that generated video iframes are wrapped in `<figure>` is unchanged; converting div wrappers is out
of scope.

## Non-functional requirements

- **NFR-1 (untrusted HTML):** the editor load and Copy HTML path continues to apply
  `sanitizeUntrustedHtml` exactly as today: removal of `script` and `style` elements, removal of `on*`
  attributes, and removal of `href`/`src` values matching `^\s*(javascript|data):` (case-insensitive),
  and applies it to an allowed div-wrapped iframe as it does to the figure-wrapped iframe (parity). This
  Story adds exactly one new filter on top of that parity: the strict `URL` iframe filter of FR-7, FR-8
  and FR-9 (hostname exact/subdomain match and `https:`/`http:` protocol), with no substring matching on
  the `src` string. The existing substring-based `isVideoSrc` is not the rule for this filter. The iframe
  standardiser in `html-cleaner.ts` is a separate path and is not applied here. Preservation of pasted
  untrusted HTML and the new host/protocol filter are flagged as SECURITY_REVIEW surfaces.
- **NFR-2 (determinism):** the round trip is deterministic: the same input yields the same output, with
  no randomness or wall-clock dependence.
- **NFR-3 (retrieval/provider/secrets):** no provider, retrieval, prompt or secret-handling behaviour
  is touched (AGENTS.md §3 Rules 1, 2, 4); the change is confined to the HTML editor surface.

## Out of scope

- Normalising or rewriting iframe markup (e.g. converting div wrappers to `<figure>`).
- Allowing hosts other than `youtube.com`, `youtu.be`, `vimeo.com` and `player.vimeo.com` (and their
  subdomains).
- The `<b>` to `<strong>` defect (US-6.2).
- Any prompt, renderer, generator or translation change; any FROZEN file.
- Changing the comparison logic of the structural parity check itself (only its baseline, FR-12).
- Applying the FR-7/FR-8/FR-9 filter to `<figure>`-wrapped iframes (Assumption A-6).
- Reusing or modifying `isVideoSrc` as the editor's host rule.
- Requiring strict round-trip parity for a bare (zero-wrapper) iframe (Assumption A-7a).

## Open questions and assumptions

All non-blocking (`open_decisions_blocking: false`); none resolved here. Defaults are carried as
labelled assumptions a human may overturn. Resolved by the human and therefore stated as requirements,
not assumptions: OD-1 (wrapper depth), OD-2 (store/locale scope), OD-3 / OD-3a (host allow-list and
strict `URL` match, FR-7), OD-9 scheme and the `notyoutube.com`/userinfo shapes (FR-7, FR-8), OD-8
(parity baseline, FR-12/FR-13). Resolved by the human as a scope statement: **A-7a** — a bare
(unwrapped) allowed iframe that survives sanitization is acceptable and not required to round-trip
strictly; strict parity applies only to div-wrapped iframes (FR-1 to FR-5). The five open decisions:

- **OD-4 / A-4 (meaning of "unchanged"):** DOM-level equality (attribute values; presence of
  `allowfullscreen`), consistent with `round-trip.spec.ts`; string-level equality is not required.
  Iframe attributes not listed in AC-1 (e.g. `width`, `height`, `frameborder`) are unspecified.
- **OD-5 / A-5 (fixtures and editability):** (a) AC-4 fixture is two separate wrapper chains with distinct
  `src`. (b) AC-5 is verified by editing text elsewhere; selecting or deleting the iframe is not
  specified. (c) AC-8 fixture: the sibling text sits in the same wrapper div as the iframe, and its order
  relative to the iframe is preserved as in the input; whether it is bare text or inside a `<p>` is not
  specified.
- **OD-6 / A-6 (figure iframes, Story Q1):** assumption (Story-stated fallback): the FR-7/FR-8/FR-9
  filter is limited to bare and div-wrapped iframes; `<figure>`-wrapped iframes are untouched, so the
  `youtube.invalid` host in the existing `round-trip.spec.ts` fixture keeps passing (FR-6). Applying the
  filter to figures would conflict with FR-6 unless that fixture changed.
- **OD-7 / A-7 (residual shapes, narrowed):** (b) when FR-7, FR-8 or FR-9 removes an iframe, the
  surrounding wrapper divs are assumed to remain and only the iframe is deleted; no AC states the
  residual output, and FR-12 states only the parity-message result. Allowed iframes inside non-div
  containers (`<p>`, `<section>`, top level other than the bare case covered by A-7a) are not required to
  round-trip strictly and are not specified here.
- **OD-9 / A-9 (remaining URL edge cases, narrowed):** scheme, userinfo and `notyoutube.com` are decided
  (FR-7, FR-8). Still unspecified by the Story: protocol-relative or relative `src`, explicit port,
  mixed case, trailing dot, surrounding whitespace, and sibling domains such as `youtube-nocookie.com`.
  Assumption: the host decision is made on `URL.hostname` only (case-insensitive as `URL` normalises it);
  a `src` that `new URL(src)` cannot parse without a base (including relative and protocol-relative
  values) is removed per FR-9; the original `src` string is written back unchanged, not the
  `URL`-normalised form; port, trailing-dot and whitespace policy are left to a human. Flagged for
  SECURITY_REVIEW.

## Traceability matrix

| Acceptance criterion | Satisfied by | Notes |
|---|---|---|
| AC-1 | FR-1 | N = 1, 2, 3; DOM-level equality (A-4); host/protocol per FR-7, FR-8 |
| AC-2 | FR-2 | N = 1, 2, 3 |
| AC-3 | FR-3 | |
| AC-4 | FR-4 | Fixture per A-5 |
| AC-5 | FR-5 | |
| AC-6 | FR-6 | A-6 |
| AC-7 | FR-7, FR-8, FR-9 | Strict `URL` parse; hostname rule (FR-7), `https:`/`http:` protocol (FR-8), empty/unparsable (FR-9); one test per negative shape; figure iframes excluded per A-6; bare survival per A-7a; edge cases A-9; NFR-1 |
| AC-8 | FR-10, FR-11 | Fixture shape per A-5(c) |
| AC-9 | FR-12, FR-13 | Baseline after load-time sanitization; kept-iframe change still warns |

Every FR traces to at least one AC; no requirement exists without one. AC-1..AC-9 are all covered.
