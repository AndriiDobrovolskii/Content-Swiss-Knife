---
artifact: open_decisions
story: US-6.1
version: 4
status: ARCHIVED
owner: so-clarifier
supersedes: docs/decisions/US-6.1-open-decisions.md#3
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T00:00:00Z
inputs_consumed:
  - key: story
    version: 4
  - key: open_decisions
    version: 3
open_decisions_blocking: false
---

# US-6.1 - Open Decisions (v4)

Supersedes v3, which consumed Story v3. Story v4 (human-decided on approving spec v4) resolves the
scheme question and the `notyoutube.com` / userinfo shapes of OD-9, and A-7a (bare iframe survival).
Nothing from v3 is dropped: each item is resolved-by-human (cited) or carried forward. Open now: OD-4,
OD-5, OD-6 (Story Q1), OD-7 (narrowed again), OD-9 (narrowed). None is blocking. Each lists a default a
specification MAY carry as a labelled assumption; a human can overturn it.

## Resolved by human (Story v2, v3 and v4)

### OD-1 - Which container shapes must be preserved - RESOLVED-BY-HUMAN (Story v2)
- Story "Expected": "however many wrapper divs there are (1..N)"; AC-1 "N nested `<div>` elements
  (tested for N = 1, 2 and 3)"; AC-2 "every wrapper div ... in the original nesting order".
- Residual split out as OD-7.

### OD-2 - Store/locale in the Context contradicts STORE_REGISTRY - RESOLVED-BY-HUMAN (Story v2)
- Context: "the cross-store copy/adapt scenario is **intentional** ... the fix must work for any store
  and locale"; Scope: all STORE_REGISTRY stores and locales. Spec states scope as store- and
  locale-independent.

### OD-3 - Iframe host/src policy - RESOLVED-BY-HUMAN (core Story v2; allow-list and match rule Story v3; scheme Story v4)
- Core (v2): AC-7 removes disallowed or empty-src bare/div-wrapped iframes. `sanitizeUntrustedHtml`
  (`src/utils/html-cleaner.ts`) has no iframe/host filter, so this is new editor behaviour and a
  SECURITY_REVIEW surface.

### OD-3a - Exact host allow-list and match rule - RESOLVED-BY-HUMAN (Story v3)
- Story AC-7: `src` must parse with the native `URL` object and the parsed `hostname` must equal, or be
  a subdomain of, one of `youtube.com`, `youtu.be`, `vimeo.com`, `player.vimeo.com`; "Substring
  matching on the whole `src` is not acceptable". Context: "strict `URL` hostname parsing ... substring
  matching is rejected as an XSS bypass". Out of scope: other hosts. Story Q2 closed.
- Residual URL edge cases are tracked in OD-9.

### OD-8 - Structural-parity baseline when AC-7 removes an iframe - RESOLVED-BY-HUMAN (Story v3)
- Story AC-9: baseline "taken from the HTML after load-time sanitization, so no 'Structure changed
  since load' message is shown for that removed iframe"; a kept iframe whose `src` is later changed or
  lost still triggers the message. Context repeats the decision.

### OD-9 (part) - Scheme policy and the `notyoutube.com` / userinfo shapes - RESOLVED-BY-HUMAN (Story v4)
- Story v4 AC-7: "the parsed `protocol` is `https:` or `http:`"; "any other protocol (e.g.
  `ftp://youtube.com/x`)" is removed. This settles OD-9(a): `javascript:`, `data:`, `blob:`, `ftp:` and
  every non-http(s) protocol are removed.
- Story v4 AC-7 lists `https://notyoutube.com/embed/1` (no dot boundary) and
  `https://youtube.com@evil.example/` (userinfo) as removed shapes, "Each of these shapes has its own
  test." This settles OD-9(c) and the `notyoutube.com` half of OD-9(h): subdomain match requires a dot
  boundary; userinfo is judged by the parsed `hostname`.
- Context (Story v4): human decision on approving spec v4 recorded.

### A-7a - Survival of a bare (unwrapped) allowed iframe - RESOLVED-BY-HUMAN (Story v4)
- Story v4 Context: "a bare (unwrapped) iframe that survives sanitization is acceptable - strict
  round-trip parity is required only for div-wrapped iframes." Settles OD-7(a) for the bare
  (N = 0) case: survival is acceptable, not required to round-trip strictly.

### Naming - RESOLVED-BY-HUMAN (Story v3)
- References: the helper is `isVideoSrc` (`src/utils/video-figure.ts:77`, verified in code). It is
  substring-based today; AC-7 requires stricter `URL` hostname matching, "not parity with it". Spec must
  not reuse `isVideoSrc` as the editor rule.

## Open

### OD-4 - Meaning of "unchanged" / "byte-identical" (non-blocking) - carried
- **Question:** DOM-level equality (attribute values, presence of `allowfullscreen`) or string-level
  (attribute order, `allowfullscreen=""` vs `allowfullscreen`, `style` whitespace)? Are attributes not
  listed in AC-1 (e.g. `width`, `height`, `frameborder`) preserved or dropped?
- **Checked:** Story v4 AC-1 says `src` "byte-identical" and listed attributes "unchanged"; silent on
  level and unlisted attributes. `round-trip.spec.ts` asserts via DOM `getAttribute`/`hasAttribute`.
- **Impact:** String-level equality may be unachievable through TipTap serialisation; unlisted
  attributes decide whether a node whitelists or passes through everything.
- **blocking:** false. Assumption: DOM-level equality for listed attributes; unlisted unspecified.

### OD-5 - AC-4 / AC-5 / AC-8 fixture and editability details (non-blocking) - carried
- **Question:** (a) AC-4: two separate wrapper chains, or two iframes in one div; same or distinct
  `src`? (b) AC-5: may the user select/delete the iframe, or is it atomic? (c) AC-8: sibling text before
  or after the iframe, bare in the div or in a `<p>`; is order preserved?
- **Checked:** Story v4 AC-4, AC-5, AC-8 wording (unchanged); no multi-iframe fixture exists.
- **Impact:** Test fixtures and node atom/selectable behaviour would be guessed.
- **blocking:** false. Assumption: two separate chains with distinct `src`; iframe atomic and
  selectable; sibling text order preserved.

### OD-6 - Does the AC-7 host rule apply to `<figure>`-wrapped iframes (non-blocking) - Story Q1 (still open)
- **Question:** Does AC-7 also filter `<figure>` video embeds?
- **Checked:** Story v4 Q1 (still open, unchanged): `round-trip.spec.ts:85` uses host `youtube.invalid`,
  which a strict `youtube.com` match rejects, and AC-6 requires that test green. AC-7 is worded only for
  "bare or div-wrapped". Strict matching on figures would break AC-6 unless the fixture changes.
- **Impact:** Applying it breaks AC-6's test; not applying leaves an unfiltered figure path.
- **blocking:** false. Story-stated fallback: rule limited to bare and div-wrapped iframes.

### OD-7 - Residual shapes not covered by AC-1/AC-2 (non-blocking) - carried, narrowed
- **Question:** (a) [narrowed by A-7a] Is an allowed iframe inside a non-div container
  (`<p>`/`<section>`/top level other than the bare case) preserved? A-7a says bare survival is
  acceptable, but not whether non-div containers are required to round-trip. (b) When AC-7 removes an
  iframe, does its wrapper chain remain (empty div) or collapse, and is the wrapper chain baselined
  likewise under AC-9?
- **Checked:** Story v4 Context (A-7a) and AC-7/AC-9: AC-9 settles only the parity message; no AC states
  what DOM a removed iframe leaves behind.
- **Impact:** Spec would guess what output a removed iframe leaves and whether non-div containers are in
  scope.
- **blocking:** false. Assumption: removal deletes only the iframe, leaving wrappers; non-div containers
  are not required to round-trip strictly.

### OD-9 - Remaining URL edge cases of the AC-7 host rule (non-blocking) - carried, narrowed
- **Question:** For `URL`-parsed hostname matching, what is the verdict for: (b) protocol-relative
  `//www.youtube.com/embed/x` and relative `src` (is a base URL used, or are they "unparsable" and
  removed?); (d) explicit port (`https://youtube.com:8080/`, `https://www.youtube.com:443/...`); (e)
  mixed case (`YouTube.COM`); (f) trailing dot (`youtube.com.`); (g) leading/trailing whitespace in
  `src`; (h, remainder) sibling domains such as `youtube-nocookie.com` (excluded by Out of scope but not
  stated by name); (i) whether the byte-identical `src` of AC-1 is written back as authored, not as the
  `URL`-normalised form.
- **Checked:** Story v4 AC-7 and Context. v4 settles scheme (a), userinfo (c) and `notyoutube.com`; it
  is silent on relative/protocol-relative `src`, port, case, trailing dot, whitespace and write-back.
  `URL` lowercases the host, drops default ports and accepts a trailing dot, but no source states the
  policy for them.
- **Impact:** Spec would invent port/trailing-dot/whitespace rules in a security-relevant filter; a
  wrong guess admits unintended hosts or rejects legitimate `https://www.youtube.com:443/...` embeds or
  breaks AC-1 byte-identical `src`.
- **blocking:** false. Assumption to label, not decide: match on `URL.hostname` only (case-insensitive
  by `URL`); a `src` that `new URL(src)` cannot parse without a base is removed; original `src` string
  written back unchanged; port, trailing dot and whitespace left to a human. Flag for security review.

## Resolved from sources (not open) - carried
- AC-3 vs US-6.2: `src/utils/structural-parity.ts` `COUNTED_TAGS` does not count `<b>`/`<strong>`, so the
  iframe src-list message is independent of US-6.2.
- Fixture values: `title`/`allow` ellipses are in `Knowledge/Issues/1/yt-iframe.txt`.
