---
artifact: security_review
story: US-6.1
version: 1
status: ARCHIVED
owner: so-security-reviewer
stage: SECURITY_REVIEW
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-06T00:00:00Z
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: implementation_report
    version: 1
  - key: verification_report
    version: 1
---

# Security Review - US-6.1

Verdict: **PASS** with non-blocking findings. Scope: `git diff main...HEAD` (commits 58d8335, 770c61a, df268b8):
`editor-html-pipeline.ts` (new), `embed-iframe-node.ts` (new), `generic-block-node.ts`, `extensions/index.ts`,
`html-editor.component.ts`. No `server/**`, `.env.example`, `html-cleaner.ts`, or `safe-html.pipe.ts` change.

## Surface 1 - Secret containment: clear
No `process.env`, key, log, usage-DB, response-body or error-message path touched. No server file or `.env.example` changed.

## Surface 2 - DomSanitizer bypass: clear
No new `bypassSecurityTrust*` (still exactly one, `safe-html.pipe.ts`). The editor component does not use the SafeHtml pipe;
its output goes to TipTap's own DOM and to the clipboard. `html-cleaner.ts` is unmodified, so nothing it removed is weakened.
The new filter runs strictly after `sanitizeUntrustedHtml` and only deletes nodes.

## Surface 3 - Editor untrusted HTML

### (1) filterEmbedIframes host/protocol rule (`isAllowedEmbedSrc`)
Rule: `new URL(src)` must parse without a base; protocol `https:`/`http:`; `URL.hostname` equals or ends with `.` + one of
youtube.com, youtu.be, vimeo.com, player.vimeo.com. Only deletes; a kept `src` is never rewritten.

| Input | Code behaviour | Risk |
|---|---|---|
| `evil-youtube.com`, `youtube.com.evil.com`, `notyoutube.com` | removed (exact or `.suffix` match only) | none |
| `https://youtube.com@evil.com/` | hostname `evil.com`, removed | none |
| `https://evil.com@youtube.com/` | hostname `youtube.com`, kept; browser also connects to youtube.com | none |
| `ftp:`, `blob:`, `javascript:`, `data:`, `about:` | protocol check removes (and `javascript:`/`data:` already stripped upstream) | none |
| relative / protocol-relative (`//youtube.com/x`) / empty / missing | `new URL` throws or null, removed (fail closed) | none; functional loss only |
| explicit port (`youtube.com:8080`) | `hostname` excludes port, kept | negligible (still youtube.com) |
| trailing dot (`youtube.com.`) | hostname keeps the dot, not matched, removed (fail closed) | none |
| mixed case | `URL` lowercases, kept | none |
| whitespace-padded src | `URL` strips leading/trailing C0/space, kept; browser strips the same way | none |
| tab/newline inside host | `URL` strips them, so parse and browser agree | none |
| `youtube-nocookie.com` | removed | none (functional gap, not security) |
| `http:` | allowed | low: plain-http embed (mixed content/MITM); matches spec FR-8 |
| any `*.youtube.com` / `*.vimeo.com` subdomain, any path | allowed | low, accepted breadth |

### (2) Attributes preserved on a kept iframe
`EmbedIframe` stores only `src,title,allow,referrerpolicy,loading,style,width,height,frameborder,allowfullscreen`; `srcdoc`, `sandbox`
and `on*` are NOT carried through the WYSIWYG round trip (dropped by the schema). `sanitizeUntrustedHtml` already strips `on*`
everywhere. It does NOT touch `srcdoc`, `sandbox`, `allow`, or `style`.
- **Finding NB-1 (non-blocking, new surface):** a bare iframe with an allow-listed `src` plus `srcdoc="<script>..."` survives
  `filterEmbedIframes` (it only inspects `src`; browsers prefer `srcdoc`). It survives to output on the Source-mode -> Copy HTML
  path, which does not pass through the TipTap schema (`finalizeCopyHtml(currentSourceHtml())`). Before US-6.1 the same payload
  on a bare iframe would have been dropped by the schema only in WYSIWYG; in Source mode it already passed through, so this is
  a widening of an existing accepted surface, not a new class. The output is a clipboard string for a CMS, not rendered in-app
  or via the SafeHtml pipe. Recommendation: strip `srcdoc` (and force/strip `sandbox`) in `filterEmbedIframes` in a follow-up.

### (3) Figure-wrapped iframes (Story Q1/OD-6, A-6)
`<figure><iframe>` (direct child) is exempt from the filter. Residual: any http(s)/ftp/blob `src` and any `srcdoc` on such an
iframe survives load and Copy (only `javascript:`/`data:` `src` are stripped). Pre-existing, unchanged by this Story (the
`videoEmbedFigure` node already handled it; WYSIWYG renders only src/title/allow/etc., so srcdoc is dropped there but kept via
Source -> Copy). Accepted by Story decision; **Observation O-1**, same recommendation as NB-1 if the decision is revisited.
Note the narrow exemption: only a direct `FIGURE` parent; `figure > div > iframe` is filtered.

### (4) Gates parity
Load: `sanitizeEditorHtml` (= `filterEmbedIframes(sanitizeUntrustedHtml(.))`). Copy HTML and Source-mode seeding: `buildCopyHtml`
-> `finalizeCopyHtml`, ending in the same `sanitizeEditorHtml`. Both gates use the one composed function; confirmed in the diff.
- **Finding NB-2 (non-blocking, pre-existing path):** `toggleSourceMode` (Source -> WYSIWYG) sets `pendingContent` to the raw,
  unsanitized CodeMirror text. A user typing `<iframe src="javascript:...">` or an off-list `src` into Source mode and toggling
  back gets it parsed by `EmbedIframe`/`videoEmbedFigure` and rendered in the live editor DOM (the Copy gate removes it again on
  copy). This is self-input by the operator, and the unsanitized toggle predates US-6.1; US-6.1 adds one more node type that
  honours `src`. Recommendation: pass the toggle-back content through `sanitizeEditorHtml`.

### (5) genericBlock.renderHTML
Now uses `setAttribute` for every merged attribute. This matches what ProseMirror's spec renderer did for non-`style`
attributes, and the attribute set is a closed allow-list (`class, style, id` + microdata via `MICRODATA_ATTRS`; `tagName` is
`rendered: false`), so `on*` or `javascript:` attributes cannot reach it. `tagName` is only ever `div`/`section` from
`parseHTML`. The load-time sanitizer runs before TipTap sees content. `style` is written verbatim (no CSS sanitization, as before).
Clear.

## Surface 4 - Prompt injection: clear (not touched)
No retrieval, orchestrator, prompt or `systemBlocks` change.

## Surface 5 - Proxy / telemetry: clear (not touched)
No `server/**` change; CORS, error funnel, usage store and call-log unchanged.

## Classification
- Blocking: none.
- Non-blocking (introduced/widened by this change): NB-1 (srcdoc on kept iframe, Source -> Copy path), NB-2 (Source toggle-back unsanitized, now one more node honours `src`).
- Observation (pre-existing): O-1 (figure iframe exemption), `http:` allowed, subdomain breadth.
