---
artifact: specification_review
story: US-6.1
version: 5
status: APPROVED
owner: so-spec-reviewer
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T00:00:00Z
supersedes: docs/reviews/specifications/US-6.1-spec-review.md#4
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: open_decisions
    version: 4
open_decisions_blocking: false
---

# Spec Review: US-6.1 — Preserve a pasted YouTube/Vimeo iframe and its wrapper divs in the HTML editor

**Verdict:** PASS
**Loop-back:** n/a

> A `PASS` here is **not** human approval. Approval is recorded only by `/so:approve`
> (AGENTS.md §10).

## Summary

Re-review of Specification v5 against Story v4 and Open Decisions v4. Review v4 was stale (it consumed
Story v3 / spec v4 / open_decisions v3) and is replaced by this one. Staleness contract: story v4,
specification v5, open_decisions v4 and clarification_report v4 are all current DRAFT, none SUPERSEDED, and
the spec's `inputs_consumed` (story 4, clarification_report 4, open_decisions 4) matches. The v4 non-blocking
findings (scheme policy, `notyoutube.com`/userinfo tests, bare-iframe reading) are now carried as human-decided
requirements (FR-7, FR-8, A-7a). All six axes are clear.

## 1. Acceptance-criterion coverage

Matrix re-derived from Story v4.

| AC | Story says | Specification satisfies it via | Verdict |
|---|---|---|---|
| AC-1 | Same `<iframe>`, byte-identical `src`; `title`, `allow`, `referrerpolicy`, `loading`, `allowfullscreen`, `style` unchanged; N = 1, 2, 3 | FR-1 (A-4 DOM-level) | covered |
| AC-2 | Wrapper divs keep `style` and nesting order; no `<p></p>` | FR-2 | covered |
| AC-3 | No "Structure changed" for iframe src list on Copy HTML | FR-3 | covered |
| AC-4 | Two div-wrapped iframes keep both `src` in order | FR-4 (A-5a) | covered |
| AC-5 | Text edit elsewhere leaves embed and wrappers unchanged | FR-5 | covered |
| AC-6 | Figure iframe unchanged; `round-trip.spec.ts` "preserves iframe attrs…" green | FR-6 (A-6) | covered |
| AC-7 | Kept only if `URL`-parsed, protocol `https:`/`http:`, hostname equals/subdomain of four names; else removed from document and output; empty/missing/unparsable, other protocol (`ftp://youtube.com/x`), unknown host, five look-alikes incl. `notyoutube.com` and userinfo; one test per shape; no substring matching | FR-7 (host rule; all five look-alikes plus unknown host; kept examples), FR-8 (protocol; `ftp:`, `javascript:`, `data:`, `blob:`; `http:` kept), FR-9 (empty/missing/unparsable) | covered; every Story example reproduced with its own-test requirement; NFR-1 forbids substring matching |
| AC-8 | Sibling text present in document and output; typing changes output | FR-10, FR-11 | covered |
| AC-9 | Baseline from HTML after load-time sanitization, no message for removed iframe; kept iframe later changed or lost still triggers the message | FR-12 (baseline), FR-13 (still warns) | covered, split in two |

Requirements tracing to no acceptance criterion (scope creep): none. FR-1..FR-13 each trace to an AC
(FR-13 to AC-9 second sentence; FR-8 `javascript:`/`data:`/`blob:` cases are the "any other protocol" clause of AC-7).

## 2. Non-verifiable language

None found. Each FR states a comparable outcome and a failure path. "Equal to the input values" is pinned by
A-4 (DOM-level). The host and protocol rules are concrete (parsed `hostname`, parsed `protocol`, four names,
listed positive and negative examples).

## 3. Contradictions with the Story

None. Scope table (all stores, all locales, angular, `src/app/components/html-editor/**`, no FROZEN, no
generated HTML) matches Story v4. Summary and FR-7/FR-8 reproduce AC-7 including the protocol clause and the
`notyoutube.com`/userinfo shapes. Out of scope carries the Story's three items and adds only items that follow
from Story Q1, A-7a and the Story's own decisions. The spec's A-7a wording matches the Story Context decision.

## 4. Scope creep

- Out of scope section present and non-empty: yes (eight items).
- No requirement beyond AC-1..AC-9. A-4..A-7 and A-9 are labelled assumptions traced to OD-4..OD-7 and OD-9.

## 5. Missing edge cases, boundaries and failure paths

| Area | Checked | Finding |
|---|---|---|
| FR failure paths | FR-1..FR-13 | Each states one; FR-3 and FR-13 keep the structure check from being weakened. Clear. |
| Locale fan-out (uk-UA master → derived locales) | Scope | Nothing generated or translated; stated. Clear. |
| Store scope vs STORE_REGISTRY | Scope, Background | No store or locale literal named; "all `STORE_REGISTRY`". Clear. |
| §4 invariants that must survive | §4 rationale block | Only the video-embed rule is in play; figure-wrapper rule stated unchanged; no generation change. Clear. |
| Provider behaviour | NFR-3 | No provider, retrieval, prompt or secret path touched. Clear. |
| Empty / boundary inputs | FR-7, FR-8, FR-9, A-7, A-9 | Empty/missing/unparsable `src`, foreign host, look-alikes, non-http(s) protocols, sibling text covered. Residual output after removal, non-div containers, port/trailing-dot/whitespace/protocol-relative policy are recorded as labelled non-blocking assumptions (A-7b, A-9); the Story does not require them. Acceptable. |

## 6. Compliance with AGENTS.md

| Check | Result |
|---|---|
| §4 criteria in play quoted verbatim and cited | Pass. Quote matches AGENTS.md lines 219-221 ("A video embed present in the input is present in the output. … Losing it is a bug, not a stylistic choice"); citation `video-manifest.ts` outside the quotation. Marked rationale, not a requirement. |
| §9 FROZEN-file impact | Pass: none, stated in Scope. |
| §3 architecture rules (incl. Rule 2) | Pass: NFR-3, no retrieval or provider path. |
| §11 no blocking Open Decision left unaddressed | Pass: OD-4..OD-7 and OD-9 non-blocking; `open_decisions_blocking: false` matches open_decisions v4. |
| No implementation design leaked in | Pass. NFR-1 names `sanitizeUntrustedHtml` / `html-cleaner.ts` and Background names `isVideoSrc` only to state existing behaviour or Story-supplied references. No new node, file or signature. |

## Verdict rationale

PASS: every Story v4 AC is covered by a verifiable FR, no blocking finding exists, and the unresolved
questions (Story Q1; OD-4..OD-7, OD-9) are carried as non-blocking labelled assumptions a human can overturn,
as §11 permits. The Story v4 human decisions (protocol policy, `notyoutube.com`/userinfo tests, bare-iframe
survival) are reflected as requirements or scope statements, not assumptions. This is a verdict about the
document only; HUMAN_SPEC_APPROVAL by `/so:approve` is still required.

## Non-blocking findings

- A-9 still leaves port, trailing dot, whitespace-padded `src`, mixed case and `youtube-nocookie.com` to a
  human; protocol-relative and relative values are removed as unparsable (FR-9). Flag for SECURITY_REVIEW.
- FR-9 treats a whitespace-padded `src` per A-9 (unparsable without trimming is not guaranteed: `new URL`
  trims leading/trailing whitespace); the test writer should pin the observed behaviour or ask a human.
- FR-7/FR-8 filter bare and div-wrapped iframes only; the figure path stays unfiltered (A-6, Story Q1 open).
  SECURITY_REVIEW should note the residual unfiltered figure surface.
- SECURITY_REVIEW must receive the preserved-untrusted-iframe surface and the new host/protocol filter (NFR-1).
- This review's verdict is not human approval.
