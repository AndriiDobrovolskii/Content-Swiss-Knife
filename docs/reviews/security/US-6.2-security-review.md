---
artifact: security_review
story: US-6.2
version: 1
status: ARCHIVED
owner: so-security-reviewer
stage: SECURITY_REVIEW
created_at: 2026-10-07T00:00:00Z
updated_at: 2026-10-07T00:00:00Z
inputs_consumed:
  - key: story
    version: 3
  - key: specification
    version: 2
  - key: implementation_report
    version: 1
  - key: verification_report
    version: 1
---

# Security Review - US-6.2

Verdict: **PASS** with one non-blocking finding. Scope: `git diff origin/main` (commits 33c4431 T1, a9ede90 T2):
`src/utils/html-cleaner.ts` (-7 lines), `src/prompt-core/master-system-prompt.ts` (one sentence), their specs,
`test/fixtures/golden/full-description-prompts.json`, `.arch-guard-checksums` (frozen-file hash refresh), workflow docs.

## Surface 1 - Secret containment: clear
No `server/**`, `.env.example`, `process.env`, key, log, usage-DB or error-message path touched. No new setting. The diff adds no
import of anything environment-related to `src/**`, so no key can reach the bundle through this change.

## Surface 2 - DomSanitizer bypass: clear, with one non-blocking finding
No new `bypassSecurityTrust*` call; `safe-html.pipe.ts` is untouched and still has the single call.

Finding NB-1 (non-blocking, narrow widening of a pre-existing accepted gap). The removed block replaced every `<b>` with a fresh
`<strong>` via `innerHTML` copy, which incidentally discarded ALL attributes on `<b>`. Now `<b>` and `<strong>` pass through
`cleanHtmlStructure` as supplied, attributes included. Stated exactly:
- `<b onclick=...>`, `<b style=...>`, `<strong onclick=...>`, `<strong style=...>` now pass through `cleanHtmlStructure`. Before, only
  `<strong onclick=...>` (supplied as strong) passed; `<b ...>` attributes were dropped.
- `cleanHtmlStructure` is not a sanitiser: it has no event-handler or javascript:-URL removal at all (attribute handling is limited to
  table/th/iframe/img/microdata). It already passed `onclick` on `<p>`, `<span>`, `<strong>`, etc., so this is one more tag in an
  already-open class, not a new class.
- `sanitizeUntrustedHtml` (strips `on*` attributes, dangerous href/src, script/style) is NOT on this path. It is called only from
  `editor-html-pipeline.ts` (`sanitizeEditorHtml`, editor round-trip). The Fast-path result
  (`optimizerOutput.set(finalizeTablesForDisplay(cleanHtmlStructure(htmlInput)))`, content-orchestrator.service.ts ~1787) and the LLM
  optimize path (~1760) are rendered at app.component.html:1620 via `| safeHtml` (bypass) with no later sanitiser, so an `onclick` on
  a `<b>` in the Fast-path would execute in the preview. Editor/Copy-HTML paths that go through `sanitizeEditorHtml` do strip `on*`.
- Exposure: Fast-path input is raw HTML pasted by the operator into their own local tool (self-XSS, no multi-user surface), and the
  LLM path emits `<b>` without attributes per the prompt. Rationale of the accepted bypass still holds, hence non-blocking.
- Recommendation (not done here; cleaner must not be weakened in this review): a follow-up Story could run `sanitizeUntrustedHtml`
  on Fast-path output before display. Not required for US-6.2.

## Surface 3 - Editor / TipTap: clear
No change to the schema, extensions or attribute helpers; allow-list not widened. (Preserving `<b>`/`<strong>` is within existing marks.)

## Surface 4 - Prompt injection: clear
The prompt edit replaces one formatting sentence with "Use <b> for all emphasis (brands, models, specifications)." It adds no
dynamic interpolation, no instruction about fetched content, nothing injection-relevant. Fetched/Serper content placement,
`systemBlocks` and length bounds are untouched, so that surface is unchanged. The FROZEN-file change is wording only; checksum refreshed.

## Surface 5 - Proxy / telemetry: clear
No `server/**` change; CORS, describe-error, call-log and usage store untouched. Golden fixture JSON is test data only (prompt text
mirror), containing no secrets.

## Observations (pre-existing, not introduced)
- `cleanHtmlStructure` performs no event-handler sanitisation; Fast-path output reaches `safeHtml` unsanitised.
- `cors()` unrestricted on the local proxy.

## Findings summary
Blocking: none. Non-blocking: NB-1. Observations: 2.
