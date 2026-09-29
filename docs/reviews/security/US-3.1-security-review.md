---
artifact: security_review
story: US-3.1
version: 4
status: ARCHIVED
owner: so-security-reviewer
stage: SECURITY_REVIEW
created_at: 2026-09-28T00:00:00Z
updated_at: 2026-09-29T23:00:00Z
supersedes: docs/reviews/security/US-3.1-security-review.md#3
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 20
  - key: implementation_report
    version: 5
  - key: verification_report
    version: 4
---

# Security Review - US-3.1 (re-run against T16-T18 working-tree delta)

Verdict: **PASS**. No blocking findings. Two non-blocking findings (N2, N3) and carried-forward
v3 finding N1. Precondition: `verification_report` v4 returned PASS. Inputs are the current
versions (spec v20 APPROVED; implementation_report v5; verification_report v4).

**Basis.** `git status` / `git diff` of the uncommitted working tree, read in full for the three
production files: `src/utils/repair-gate.ts` (+17/-1, D16), `src/utils/repair-strategy.ts` (+5,
D17), `src/domain/description-doc.schema.ts` (+13/-1, D18/FR-14). The spec files in the diff
(`*.spec.ts`, `seo-metadata-shape.long-h1.spec.ts`) contain synthetic fixtures only. Render
consumers of `cta.heading` were traced. The five surface files (`safe-html.pipe.ts`,
`html-cleaner.ts`, `html-editor/`, `server/**`, `retrieval.service.ts`, `.env.example`) are absent
from the working-tree diff (`git diff --stat -- src/app server .env.example
src/utils/html-cleaner.ts` is empty). A grep of the added diff lines for
`process.env|api_key|secret` returned nothing.

## Surface 1 - Secret containment: clear
No env read, key, or config carrying a key in the delta. The D16 retry suffix is a fixed literal
string plus the existing `instruction`; no request data, env value or key is interpolated. No new
log line and no new `console.*`. `.env.example` is unaffected (no new setting).

## Surface 2 - DomSanitizer bypass: clear; no new `bypassSecurityTrust*`
`safe-html.pipe.ts` untouched (still exactly one bypass call).

**Loosened `cta.heading` (D18) - can an empty heading reach rendered output? No.**
- Schema: `heading` is now `z.string().nullish().transform(v => v ?? '')`, so an absent/null heading
  becomes `''`. A new `superRefine` re-applies `NonEmpty` (empty and tag-like rejected) to every doc
  except `schemaVersion === '4.0' && heading === ''`. So `'3.0'` docs still cannot carry an empty
  heading, and any non-empty value (any version) still must pass `NonEmpty`, which keeps the
  tag-like guard on non-empty values. No widening of accepted non-empty content.
- Render: `render-description.ts:446-449` - for v4 the CTA `<h2>` is assembled from the per-locale
  template (`getRenderRules(...).ctaHeading`) and `doc.cta.heading` is discarded; for `'3.0'` the
  heading is used but is guaranteed non-empty by the refine and is passed through `esc()`. Either
  way the value is HTML-escaped before it enters the `<h2>`. An empty string therefore cannot reach
  SafeHtml output. `doc-prose-transforms.ts:134` maps the heading through a prose fn (empty in, empty
  out) and `heading-style.ts` / `tov-second-person.ts` only read it for validation.
- Residual (N2, non-blocking): for a v4 doc the model-supplied non-empty `cta.heading` is still
  validated but discarded; unchanged from before.
Nothing that did not come from the generation pipeline gains a path into the pipe.

**Existing accepted mechanism (N1, carried from v3).** Block-repaired model HTML reaches the bypass
pipe more often per run (T14); gates `rejectPatch`/`rejectDocPatch` unchanged. Accepted rationale
still holds; D16-D18 do not alter it.

## Surface 3 - TipTap editor: clear
`html-editor/`, `extensions/`, `attr-helpers.ts` not in the diff. No new allowed node or attribute.

## Surface 4 - Prompt injection: clear, one non-blocking note
- **D16 guard** (`looksLikeJsonEnvelope`: `/^[{[]/` on trimmed text) is applied to the
  `repairField` result. On a JSON-shaped result it retries once with `instruction` + a fixed
  literal rejection notice, and on a second JSON-shaped result discards (`null`, rung spent, no
  loop: at most 2 LLM calls per rung). The rejected model output is NOT echoed into the retry
  suffix, so the model's (possibly injection-influenced) previous output does not get re-fed as
  instruction. `repairFieldPayload` still passes `systemBlocks` by reference and puts only
  `userContent: instruction` in the user channel, so nothing new reaches `systemBlocks` and the
  cache invariant is intact.
- The guard is a shape filter, not a sanitizer, and is not claimed to be one. A non-JSON result
  (including text beginning with an HTML tag or prose) is accepted as before; downstream it is
  subject to the same validators and, for HTML fields, the same trust class as any
  generation-pipeline text. It only ever rejects more than before (strictly narrowing what
  the repair path can accept), so it cannot widen the surface.
- The `instruction` already embeds the current field `value` (which may derive from earlier model
  output; fetched-page influence is indirect and pre-existing). D16 adds no new data source there.
- N3 (non-blocking): the retry doubles worst-case field-repair LLM calls per rung (cost/latency),
  bounded to exactly one retry; not a security defect.
- D17 (`cutOnWordBoundary`): pure string function on already-held text; index `chars[limit]` is
  guarded by the earlier `chars.length <= limit` return, so no out-of-range read; regex is a
  fixed character-class test with no catastrophic-backtracking shape. Clear.
- No change to what is fetched, redirect handling, or fetched-content bounding
  (`retrieval.service.ts` untouched).

## Surface 5 - Proxy / errors / telemetry: clear
`server/**` untouched: CORS, `describe-error.js`, `usage/store.js`, `call-log.js` unchanged. No
deployment/binding/origin effect. The new code adds no error message reaching the browser and no
logging.

## Findings
| ID | Class | Origin | Note |
|---|---|---|---|
| N1 | Non-blocking | This Story (T14, carried) | More block-repair points reaching the accepted bypass surface. |
| N2 | Observation | Pre-existing | v4 discards a non-empty model `cta.heading`; validated only. |
| N3 | Non-blocking (cost only) | This change (D16) | One extra LLM call on JSON-shaped field-repair output. |

Pre-existing, untouched: CORS with no origin restriction (`server/index.js`); `rejectPatch` does
not inspect nested markup for `on*`/`javascript:` (accepted, v1-v3).
