---
artifact: clarification_report
story: US-6.1
version: 4
status: DRAFT
owner: so-clarifier
supersedes: docs/evidence/US-6.1-clarification-report.md#3
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T00:00:00Z
inputs_consumed:
  - key: story
    version: 4
  - key: open_decisions
    version: 4
open_decisions_blocking: false
---

# US-6.1 - Clarification Report (v4)

Re-run against Story v4; supersedes v3 (which consumed Story v3). The Specification v4 and its review
were written against Story v3 text and are stale versus Story v4 (context only).

**Verdict: Ready for Specification.** Five non-blocking Open Decisions remain in
`docs/decisions/US-6.1-open-decisions.md` (OD-4, OD-5, OD-6, OD-7, OD-9); each carries a default a spec
may state as a labelled assumption.

## What changed since v3

- **OD-9 scheme question resolved by human (Story v4):** AC-7 requires parsed `protocol` to be `https:`
  or `http:`; anything else (e.g. `ftp://youtube.com/x`) is removed.
- **OD-9 shapes resolved by human (Story v4):** `https://notyoutube.com/embed/1` (no dot boundary) and
  `https://youtube.com@evil.example/` (userinfo) are removed, each with its own test.
- **A-7a resolved by human (Story v4 Context):** a bare iframe that survives sanitization is
  acceptable; strict round-trip parity is required only for div-wrapped iframes. OD-7(a) narrowed.
- **Still open, unchanged by v4:** Story Q1 / OD-6 (figure iframes vs the AC-6 `youtube.invalid`
  fixture), OD-4, OD-5, OD-7(b) and non-div containers, and OD-9 relative/protocol-relative `src`, port,
  case, trailing dot, whitespace, `youtube-nocookie.com` naming and write-back of the original `src`.

## What is clear

- **Actor / value:** content operator copying/adapting a description across stores; the video embed must
  survive paste and Copy HTML.
- **Defect cause (verified earlier):** `genericBlock` accepts `div`, but no node claims a bare `<iframe>`
  (`videoEmbedFigure` claims only `<figure>` + iframe). The message comes from `validateStructuralParity`
  called from `copy()` in `html-editor.component.ts`.
- **Resolved by human:** OD-1 (1..N wrappers), OD-2 (store/locale independent), OD-3, OD-3a and the
  OD-9 scheme/userinfo/`notyoutube.com` part (allow-list, match rule, protocol), OD-8 (baseline), A-7a
  (bare survival acceptable), sibling text editable (AC-8).
- **Scope:** `src/app/components/html-editor/**`; no FROZEN file (AGENTS.md section 9); no
  prompt/renderer/generation change, so uk-UA fan-out does not apply and section 4 generation invariants
  are undisturbed; the section 4 "video embed in input is present in output" rule is what this upholds.
- **Security surface:** `sanitizeUntrustedHtml` (`src/utils/html-cleaner.ts`) has no iframe/host filter,
  so AC-7 and AC-9 are new editor behaviour and a SECURITY_REVIEW surface (untrusted HTML into TipTap).
- **Naming:** helper is `isVideoSrc` (`src/utils/video-figure.ts:77`); substring-based, not to be reused
  as the editor rule.
- **Dependencies:** none blocking. US-6.2 independent. AC-6 depends on `round-trip.spec.ts` "preserves
  iframe attrs..." staying green (see OD-6).
- **ACs:** AC-1..AC-9 observable at DOM level (precision caveat OD-4; AC-4/5/8 shape OD-5).
- `test/render-reconciliation.report.md` concerns the Doc pipeline/renderer; not touched.

## Still open

| OD | Topic | Source | Blocking |
|---|---|---|---|
| OD-4 | "Unchanged" at DOM vs string level; unlisted iframe attributes | carried | no |
| OD-5 | AC-4 fixture shape, AC-5 atomicity, AC-8 text position/shape | carried | no |
| OD-6 | AC-7 rule applies to `<figure>` iframes? (conflicts with AC-6 fixture host) | Story Q1 | no |
| OD-7 | Non-div containers; what remains after AC-7 removal (wrapper chain) | carried, narrowed | no |
| OD-9 | Remaining URL edge cases: relative/protocol-relative, port, case, trailing dot, whitespace, src write-back | carried, narrowed | no |

## Store and locale check

Scope is all `STORE_REGISTRY` stores and locales by explicit human decision; the editor has no store
input and no currency is involved. The Context pairing (3DDevice + es) is not a registry combination, but
the human confirmed the cross-store scenario is intentional (OD-2 resolved).
