---
artifact: delivery_summary
story: US-6.1
version: 1
status: ARCHIVED
owner: so-orchestrator
created_at: 2026-10-06T15:00:00Z
updated_at: 2026-10-06T15:00:00Z
supersedes: null
---

# US-6.1 delivery summary — a pasted YouTube/Vimeo iframe and its wrapper divs survive the HTML editor

## What was delivered
Pasting a description whose video embed is a bare `<iframe>` inside one or more wrapper `<div>`s into the HTML
editor no longer drops the iframe or raises "Structure changed since load: <iframe> src list diverges". The iframe
and every wrapper div come back from **Copy HTML** with their attributes and inline `style` unchanged, for 1..N
wrappers, for any store and locale in `STORE_REGISTRY`.

Concretely (all under `src/app/components/html-editor/`):
- `editor-html-pipeline.ts` (new): a pure strict-URL iframe filter, `filterEmbedIframes`, composed as
  `sanitizeEditorHtml = filterEmbedIframes(sanitizeUntrustedHtml(...))` and applied at both the load gate (which
  seeds the structural-parity baseline) and the Copy HTML gate (which also covers Source mode). An iframe that is not
  a direct child of a `<figure>` is kept only if its `src` parses with `URL`, the protocol is `http:`/`https:`, and the
  hostname equals or is a subdomain of `youtube.com`, `youtu.be`, `vimeo.com` or `player.vimeo.com`; otherwise it is
  removed. Substring matching is not used.
- `extensions/embed-iframe-node.ts` (new, registered in `extensions/index.ts`): an atomic block TipTap node so
  `div > div > iframe` parses without an auto-filled `<p></p>`.
- `extensions/generic-block-node.ts`: `renderHTML` now builds the element and writes every attribute with
  `setAttribute`, because ProseMirror's `style` handling re-serialised `margin: 0 auto` to `margin: 0px auto`
  (plan v1's premise that wrapper style already round-trips was false; found by the builder, fixed via plan v2 D6).
- The structural-parity baseline is taken after load-time sanitization, so a removed off-list iframe raises no
  warning, while a kept iframe that is later deleted or whose `src` changes still warns (AC-9).

Delivered by PR #134 (`feat/US-6.1-html-editor-preserve-iframe-embed`), merged into `main` at
2026-10-06T14:51:33Z as merge commit `fd79cf8`; pushed tip `fd5f31a` (five commits: `58d8335` T1, `770c61a` T2,
`df268b8` T3, `5b5c422` pipeline status, `fd5f31a` delivery docs). Track: angular. No FROZEN file changed.

## Acceptance criteria and how each was proven
Tests are under `npm run test:logic`: `editor-html-pipeline.spec.ts` (new, 49 tests) and `extensions/round-trip.spec.ts`
(new describes; existing tests unmodified). Matrix: `docs/tests/US-6.1-ac-test-matrix.md`.

| AC | Proof |
|---|---|
| AC-1 iframe + attributes survive for N = 1/2/3 wrappers | round-trip.spec.ts: attribute fidelity for N = 1, 2, 3 |
| AC-2 wrapper `style`, nesting and no `<p></p>` | round-trip.spec.ts: same tests, plus the genericBlock verbatim-style describe |
| AC-3 no "Structure changed" on Copy HTML | editor-html-pipeline.spec.ts: real `validateStructuralParity` through the copy helper, 1/2/3 wrappers |
| AC-4 two iframes keep their order | round-trip.spec.ts: `[youtube, vimeo]` in order |
| AC-5 editing elsewhere leaves the embed untouched | round-trip.spec.ts: ProseMirror transaction, embed `outerHTML` unchanged |
| AC-6 figure-wrapped iframe unchanged | existing `videoEmbedFigure - attribute fidelity` test, unedited, plus a filter test |
| AC-7 host, protocol, empty/unparsable `src` removed | one test per shape: `example.com`, `?x=youtube.com`, `youtube.com.evil.example`, `evil.example/youtube.com`, `notyoutube.com`, `https://youtube.com@evil.example/`, `ftp:`/`javascript:`/`data:`/`blob:`, empty, missing, unparsable, relative, protocol-relative |
| AC-8 sibling text kept and editable | round-trip.spec.ts: text in document and output; typed characters appear in the output |
| AC-9 parity baseline after sanitization | editor-html-pipeline.spec.ts: six removed shapes raise no issue; a deleted or changed kept iframe raises exactly one |

## Gate results
- Quality gate at `df268b8` (so-gate-enforcer): `npm run lint` clean; `test:logic` 164 files, 4569 passed, 3 skipped
  (the existing `LIVE_DOC_TEST`); `test:components` 2 files, 32 passed; coverage 93.79 / 87.97 / 95.07 / 94.29
  (statements / branches / functions / lines), floors held; `npm run build` clean; `bash arch-guard.sh` OK, all five
  frozen checksums unchanged; `npm run validate:harness` 0 errors. Logic suite grew from 163 files / 4506 tests.
- Implementation verification: PASS (8-file editor-only diff, no FROZEN or rule violation).
- Security review: PASS, no blocking findings (static review only).
- Reconciliation: PASS, AC-1..AC-9 each have an existing test that would fail on violation.
- Human gates: spec v5 and plan v2 approved after rework (see below); PR gate approved with the approver's statement that
  the manual Copy HTML check of the two `html-editor.component.ts` call-site swaps was done and works (not independently
  verified; the generated reports still list it as pending because they predate the approval).

## Process notes
- The Specification went through four revisions and two human rejections: human decisions replaced substring host
  matching with strict `URL` hostname matching, added the http/https-only rule, formalised the parity baseline (AC-9)
  and widened AC-1 from two to 1..N wrappers. Story v4, clarification v4 and the spec were re-run after each change.
- IMPLEMENTATION looped back once (`blocked_by_plan`, then `changes_required_architecture`) when T3 showed the
  `genericBlock` style premise was wrong; plan v2 and task breakdown v2 were re-approved.

## Open Decisions
Resolved by the human in Story v2–v4: wrapper count 1..N (OD-1); cross-store copy is intentional (OD-2); strict
host/protocol rule and allow-list including `player.vimeo.com` (OD-3a, A-9 scheme); parity baseline after sanitization
(OD-8); bare iframe survival acceptable (A-7a); `isVideoSrc` naming.

Deferred (non-blocking, labelled assumptions in specification v5): OD-4 DOM-level vs string-level "unchanged" and unlisted
iframe attributes; OD-5 AC-4/AC-5/AC-8 fixture shapes and atomicity; OD-6 whether the host rule applies to
`<figure>`-wrapped iframes (the existing `youtube.invalid` fixture conflicts with strict matching, so figure iframes
are not filtered); OD-7 non-div containers and what remains of the wrapper chain after removal; OD-9 `URL` edge cases
(port, case, trailing dot, whitespace, `youtube-nocookie.com`, write-back of the original `src`) — code behaviour
checked by the security review, none a risk, none pinned by a test.

## Follow-ups
- NB-1 (security): `srcdoc`/`sandbox` on a kept iframe survive the Source → Copy HTML path; recommend stripping them in
  the filter.
- NB-2 (security): Source → WYSIWYG toggle-back loads raw, unsanitized text; recommend running it through
  `sanitizeEditorHtml`.
- `figure > iframe` is not host-filtered (Story Q1 / OD-6).
- The two component call-site swaps in `html-editor.component.ts` have no automated test (plan D9).
- Story US-6.2 (`<b>` → `<strong>` rewrite) is a separate, not-started Story.
