---
artifact: security_review
story: US-7.1
version: 1
status: APPROVED
owner: so-security-reviewer
stage: SECURITY_REVIEW
created_at: 2026-10-09T16:20:09Z
updated_at: 2026-10-09T16:20:09Z
supersedes: null
inputs_consumed:
  - {key: story, version: 1}
  - {key: specification, version: 4}
  - {key: verification_report, version: 1}
---

# Security Review: US-7.1 Preserve proper product names

- Story: US-7.1 | Stage: SECURITY_REVIEW | Skill: so-security-reviewer | Version: 1 | Status: DRAFT
- Inputs: story, specification v4, verification_report v1, diff `ac03ac6..fb335d8` (US-6.2 commit 120dcbc excluded)
- Verdict: **PASS** (3 non-blocking findings, 2 observations)

Scope of the diff outside docs/tests: `src/prompt-core/` (new block builder, slug trimmer, constants), `src/prompts/` (task-a-doc, task-c [FROZEN, human-approved F-1], task-slug, task-translate, optimizer), `src/utils/` (tokens, classifier, preservation checks, seo core name, repair-strategy), `src/services/content-orchestrator.service.ts`. No change under `server/`, `src/app/`, or `.env.example`.

## Surface 1: Secret containment - CLEAR
- Diff grep for `process.env`, `API_KEY`, `bypassSecurityTrust`: no hits. No new setting, so `.env.example` needs no change.
- New data flowing anywhere: the operator-typed Product Name and validation `detail` strings (typed name, missing tokens). Neither can carry a key.
- No change to `server/`, so response bodies, `call-log.js` and the usage store are untouched.

## Surface 2: DomSanitizer bypass - CLEAR
- `safe-html.pipe.ts` and `html-cleaner.ts` are not in the diff; no new `bypassSecurityTrust*` call.
- The new code only reads generated HTML (`checkDescriptionHtml`, `checkOptimizerText`) and is report-only: it emits `ValidationIssue`s and never mutates or injects HTML. Nothing new reaches the pipe. The slug trimmer outputs slugs, which go through the existing `normalizeSlug` path.

## Surface 3: Editor allow-list - CLEAR
- `src/app/components/html-editor/**` not touched; no attribute or node widened.

## Surface 4: Prompt injection

### F-1 (non-blocking, introduced): typed name interpolated into the `[PROTECTED PRODUCT NAME]` block without delimiter neutralisation
`buildProtectedNameBlock` writes `Typed name: "${typed}"` into `userContent`. The value is only trimmed; embedded quotes, newlines or a literal `[PROTECTED PRODUCT NAME]` / `[VALIDATION FEEDBACK` marker are not escaped. A name that passes the classifier (any name containing a brand or a letter+digit token such as `X1C`) can therefore carry multi-line text that reads as instructions or forges a block.
Why it stays non-blocking: (a) the string is typed by the operator of a keyless local tool, the same actor who already controls the whole prompt; (b) the name was already interpolated raw into `userContent` by `buildPromptA/B/C/Slug` (pre-existing), so the block adds a second copy but no new channel; (c) it goes to `userContent` only, never `systemBlocks` (verified: `withProtectedNameBlock` passes `payload.systemBlocks` by reference), so the cached instruction channel is not reached; (d) worst case is mis-generated marketing copy for that operator's own product.
Recommendation (optional hardening): collapse whitespace/newlines in the typed name and strip or neutralise `"` and `[` `]` before embedding, in one place (`buildProtectedNameBlock`).

### F-2 (non-blocking, introduced): repair feedback echoes model-output tokens
`PART2` issue detail (`product-name-preservation.ts` ~line 136) includes `form`, a slice of the model's own output around matched typed-name tokens; `appendRepairFeedback` echoes `detail` into the retry `userContent`. Description text is derived from Serper-fetched pages indirectly, so injected text could in principle be replayed once. Bounded: `form` spans only tokens between the first and last matched typed-name token (gap-limited by the validity predicate), is appended to `userContent` after the existing `[VALIDATION FEEDBACK]` header, and never reaches `systemBlocks`. Same accepted pattern as `heading-style.ts`, which already echoes detail. Recommendation: cap `form` length (for example 200 chars) when building the detail.

### F-3 (non-blocking, introduced): no new fetch, no widening
No change to `RetrievalService`, URL fetching or redirects; fetched content placement is unchanged. Recorded as clear.

## Surface 5: Proxy, errors, telemetry
- `server/` untouched: CORS, `describe-error.js`, `usage/store.js`, `call-log.js` unchanged. Deployment/binding/origin handling not affected.
- Logging: only new `console.info` lines are the existing `[repair-gate] Slugs: N repair(s) applied` counts (no names, no payloads). Validation issue text (contains the typed name) is UI state only, not logged or written to the usage DB.

## ReDoS and regex construction - CLEAR
- The typed name is never used to build a `RegExp`. The only dynamic regexes (`NUMBER_UNIT_RE`, `LEADING_RE`, `TRAILING_RE` in `product-name-tokens.ts`) are built once at module load from static constants; the unit alternation is passed through `escapeRe`. Remaining regexes are static and anchored (`LETTERS_AND_DIGITS` lookaheads, `INTEGER_RE`, `NUMBER_RE`); no nested quantifiers. Name matching is token-array comparison, not regex.
- `containsBrand` and `findContiguous` are O(brands x tokens) / O(n*m) over operator-length input: no amplification.

## Observations (pre-existing, not blocking)
- O-1: `server/index.js` `cors()` has no origin restriction (accepted for the localhost dev proxy; unchanged by this Story).
- O-2: `bypassSecurityTrustHtml` remains the single bypass in the codebase (unchanged).

## Checklist
- [x] All five surfaces examined, each with a finding or explicit clear
- [x] Secret flow traced (no new secret-bearing values; no server change)
- [x] `.env.example` current (no new setting)
- [x] Inputs to the bypass pipe identified: none new
- [x] No new `bypassSecurityTrust*`
- [x] Editor allow-list not widened
- [x] No fetched content in `systemBlocks`; dynamic block is `userContent` only
- [x] Error responses / telemetry unchanged (metadata-only usage store)
