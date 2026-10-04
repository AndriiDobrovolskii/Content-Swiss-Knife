---
artifact: security_review
story: US-5.1
version: 3
status: ARCHIVED
owner: so-security-reviewer
stage: SECURITY_REVIEW
created_at: 2026-10-02T00:00:00Z
updated_at: 2026-10-04T08:00:00Z
supersedes: docs/reviews/security/US-5.1-security-review.md@v2
inputs_consumed:
  - {key: story, version: 1}
  - {key: specification, version: 9}
  - {key: implementation_report, version: 3}
  - {key: verification_report, version: 3}
open_decisions_blocking: false
---

# US-5.1 Security Review (v3)

- Scope: `git diff ef08509..HEAD` (50 files): Vision pre-pass with three Ukrainian fields, marker step (HTML and Doc paths), master prompt marker sentence, `server/providers/openai.js`.
- Verdict: PASS (no blocking finding; 1 observation)

## 1. Secret containment: CLEAR
Only server change is `server/providers/openai.js` `max_tokens` 300 to 1000 (one line). No `process.env` read, no log or response-shape change, no new setting (`.env.example` untouched, none needed), no key in any test or fixture (the new test uses the literal placeholder `'k'`). No `console.*` or log call added in `image-placeholder*.ts`, `vision-contract.ts`, `vision-prepass.ts`. Vision texts are stored on the in-memory manifest entry only; usage store and `call-log.js` untouched. The higher cap raises cost per Vision call only; it does not change what is recorded.

## 2. DomSanitizer bypass: CLEAR
Single `bypassSecurityTrustHtml` (`safe-html.pipe.ts:14`), unchanged; no new `bypassSecurityTrust*`. `html-cleaner.ts` logic untouched (only a spec line changed).
Newly reaching the pipe: figures built from manifest entries.
- The three Vision fields (`label`, `description`, `alt`) are model output, parsed by `parseVisionResult` (trim, string-typed only), then:
  - caption: `captionText = <b>${escapeText(label)}</b> ${escapeText(description)}` (`image-placeholder.ts:161`), `& < >` escaped, so no tag or attribute can come from the model; the only markup is the fixed `<b>`.
  - alt, HTML path: `escAttr` (`& " < >`) in `image-placeholder-html.ts`; alt, Doc path: stored in `doc.figures` and emitted through `esc()` in `render-description.ts:134`; caption goes through `prose()` (escape, then restores only `<b>`/`<strong>`).
  - `Figure.file` is `urlFilename` from `normalizeImageFilename` (restricted charset), `src` is attribute-escaped on both paths.
- Operator-typed marker text is matched by `PLACEHOLDER_RE = /\[([a-z0-9-]+\.(?:jpg|webp))\]/g` and must equal a manifest `originalFilename`; no operator-controlled text other than the matched file name is reflected. Unmatched marker text is removed or reported by name in a QA message (Ukrainian string, rendered by the QA panel, not through the SafeHtml pipe).
- New `hookExtra` / `cta.extra` blocks reuse the existing `block` renderer (no new emitter) and are only written by the placeholder step.
- The HTML-path tag-aware walker only rewrites text tokens and passes comments, script and style through opaque; it does not unescape or re-parse attribute values.

## 3. TipTap editor: CLEAR
`image-figure-node.ts` only swaps three style constants for the shared `image-figure-style.ts` constants (`width: max-content`). No node, attribute or allow-list widened; `attr-helpers.ts` untouched.

## 4. Prompt injection: CLEAR
- Vision pre-pass: input is the operator's own uploaded image and product name; output is parsed as data and never re-enters any prompt (grep: `visionLabelUk|visionDescriptionUk|visionAltUk` appear only in `types.ts`, `vision-contract.ts`, `image-placeholder.ts` and the orchestrator). In the orchestrator they join the numeric-grounding allow-list string used by validators, not a prompt.
- `buildMarkerBlock` (`task-a.ts`): interpolates only file names that match the strict charset and a manifest upload; appended to `userContent`, not `systemBlocks`; empty when nothing matches. Length is bounded by the manifest size.
- Master prompt (`master-system-prompt.ts`): +3 static lines, no `${}`; FROZEN change carries recorded human approval (commit df52e88); does not weaken data/instruction delimiting. Cached prefix is one identical constant for all importers (pinned by spec).
- No fetch or redirect behaviour changed; retrieval untouched.

## 5. Proxy, error surface, telemetry: CLEAR
No change to CORS, binding, `describe-error.js`, `usage/store.js` or `call-log.js`. The OpenAI Vision call has no truncation check: a cut-off reply fails `parseVisionResult` and the entry becomes `error`; no provider body is surfaced by this change.

## Findings
| Id | Class | Introduced here? | Note |
|---|---|---|---|
| F-1 | Observation | No (pre-existing, F-3 in v2) | Brand/model folder free text is concatenated into `src` before escaping (`figureSrc` in both renderers). Output is attribute-escaped on both paths and prefixed by `imageBase`, so no injection; operator-supplied only. No action. |
| F-2 | Observation | No | `escapeText` does not escape quotes; correct for its text-node-only use. Do not reuse it for attributes. |

No blocking and no non-blocking findings introduced by this Story.
