---
artifact: security_review
story: US-8.1
version: 1
status: DRAFT
owner: so-security-reviewer
stage: SECURITY_REVIEW
created_at: 2026-10-14T22:55:00Z
updated_at: 2026-10-14T22:55:00Z
supersedes: null
inputs_consumed:
  - {key: story, version: 1}
  - {key: specification, version: 2}
  - {key: implementation_report, version: 2}
  - {key: verification_report, version: 2}
---

# Security Review: US-8.1 Single master FAQ and standalone FAQ tool

- Story: US-8.1 | Stage: SECURITY_REVIEW | Skill: so-security-reviewer | Version: 1 | Status: DRAFT
- Inputs: story v1, specification v2 (APPROVED), implementation_report v2, verification_report v2, and the real diff `27b01b8..HEAD` (branch `feat/US-8.1-single-master-faq`, HEAD `c4b7f03`)
- Verdict: **CHANGES_REQUIRED** (1 blocking finding, 3 non-blocking, 4 observations). Loop back: `changes_required` -> IMPLEMENTATION.

Scope of the diff outside docs and tests: `src/app/` (new `faq-generator` mode, `tab-descriptors.ts`, `types.ts`), `src/prompts/` (`task-c.ts` FROZEN, human-approved; `task-faq.ts`), `src/services/content-orchestrator.service.ts`, `src/utils/` (`faq-html.ts`, `faq-gate.ts`, `faq-form.ts`, `structural-parity.ts`), `tools/feedback-form/create-form.gs`, `.arch-guard-checksums`. **No change** under `server/`, `.env.example`, `src/app/pipes/`, `src/utils/html-cleaner.ts`, `src/utils/output-validator.ts`, `src/app/components/html-editor/`, `src/services/history.service.ts` or `llm.service.ts`.

## Surface 1: Secret containment (Rule 4) - CLEAR
- Diff grep over `src`, `tools`, `test` for `process.env`, `api_key`, `SERPER`, `ANTHROPIC`, `OPENAI`, `GEMINI`, `eval(`, `new Function`, `document.write`: no added line matches. `bash arch-guard.sh`: ALL CHECKS PASSED.
- Traced the new data flow, not only literals. The FAQ Generator state (`faqSelectedWebsite`, `faqProductName`, `faqDescription`, `faqSpecs`, `faqSupplementalContent`) is five plain signals holding user-typed text. `generateFaqOnly()` builds a `ProductInput` from them and calls `orchestrator.generateFaqOnly`, which calls `llm.generateText(payload, useThinking, meta)` exactly as the existing FAQ step did. No key, config object or API-response field is read or forwarded by new code.
- `tools/feedback-form/create-form.gs`: the only change is one added string, `'FAQ Generator'`, in the `TOOLS` choice list. No secret, no new network call.
- No new setting, so `.env.example` needs no change. No key in any new test, fixture or golden file (`test/fixtures/golden/task-c-description-prompts.json` holds prompt text only).

## Surface 2: DomSanitizer bypass - FINDING B-1 (blocking)
- `safe-html.pipe.ts` is unchanged and the diff adds **no** new `bypassSecurityTrust*` call (still exactly one, `safe-html.pipe.ts:14`).
- What reaches the pipe in this change: the FAQ tab panels render `parseFaqItems(faqHtml)`, and each `item.answer` goes through `[innerHTML]="item.answer | safeHtml"` (`app.component.html:1533`). `faqHtml` is `content().faqArtifacts[iso]`. In the new FAQ-only mode the model output is produced from the user-pasted Supplemental Content, Original Description and Tech Specs. No filename, error string or fetched page reaches this path; the FAQ pipeline does no retrieval.
- The only control between the model and that sink is the five-element allowlist `validateFaqShape` (FR-9, "only `h3 p b ul li`, no attributes"). `html-cleaner.ts` is not applied to FAQs, and the demoted frozen validator only warns (plan D6). So `validateFaqShape` is the de-facto sanitizer for this path, and it can be defeated.

### B-1 (blocking, introduced): the `validateFaqShape` tag tokenizer can be bypassed, so an attribute-bearing element is stored and rendered with sanitization off
`faq-html.ts` finds tags with this regex: `<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>`. It treats a `"` or `'` anywhere inside a tag as the start of a quoted string that must be closed. A browser does not: outside an attribute value, a quote is just a character of an attribute name. When the quote has no partner later in the text, the regex fails to match the whole tag, so the tag is never seen: no `faq-element-not-allowed`, no `faq-attribute-present`, and nothing pushed on the stack.

Evidence, run against the real `validateFaqShape` (Node 24, `--experimental-strip-types`), and parsed with the repo's `parse5` to show what a browser builds:

| Input (FAQ text) | `validateFaqShape` | parse5 serialisation |
|---|---|---|
| `<h3>Q</h3><p>A</p><img src=x onerror=alert(1) a'>` | **ACCEPT (no issue)** | `<img src="x" onerror="alert(1)" a'="">` |
| `<h3>Q</h3><p>A</p><img src=x onerror=alert(1) a">` | **ACCEPT (no issue)** | `<img src="x" onerror="alert(1)" a"="">` |
| `<h3>Q</h3><p>A</p><img src=x onerror=alert(1)` (no closing `>`) | **ACCEPT (no issue)** | element dropped at end of input |
| `<h3>Q</h3><script>alert(1)</script>` | REJECT `faq-element-not-allowed` | n/a |
| `<h3>Q</h3><p onclick="x()">A</p>` | REJECT `faq-attribute-present` | n/a |
| `<h3>Q</h3><p><strong onmouseover=alert(1)>A</strong></p>` after `convertStrongToB` | REJECT `faq-attribute-present` | n/a |
| `<h3>Q</h3><p/onclick=alert(1)>A</p>` | REJECT `faq-attribute-present` | n/a |
| `<h3>Q</h3><svg onload=alert(1)></svg>` | REJECT | n/a |

The plain cases are rejected, so the allowlist works for well-behaved attacks; rows 1 and 2 are the bypass. They need the unpaired quote to have **no later partner of the same kind** in the remaining text (a later `'` or `"` pairs with it and the tag is then matched and rejected, as the mid-document variant showed). An attacker or a hijacked model controls the tail of the output, so this is easy to arrange: put the payload last.

How it reaches the sink: `isFaqStorable` is true (no contract error), `storeFaq` writes the string, and `parseFaqItems` (a `DOMParser` walk over `doc.body.children`) appends any element after the first `<h3>` to the current answer via `outerHTML`. The `<img ... onerror=...>` therefore lands in `item.answer`, and `[innerHTML] | safeHtml` executes it in the app origin. Row 3 is the weaker twin: dropped by a browser at end of input, but the stored/copied FAQ source is pasted into a CMS next to other markup, where a dangling `<img src=x onerror=...` swallows the following text into its attributes.

Why this is in scope for this Story and not a pre-existing condition: before US-8.1 the FAQ had no allowlist at all (only the demoted-style `validateGeneratedHtml` warnings). US-8.1 introduced FR-9 and `validateFaqShape` as the enforced, store-blocking control and the verification report records it as met ("enforced by `validateFaqShape`"). The control exists, is claimed, and is bypassable; the new standalone mode additionally puts a free-text, user-pasted field (Supplemental Content) directly in front of it, and the single master is fanned into N translation calls (see N-1). The impact if exploited is script execution in the tool's origin: the page can read `localStorage` history (`seo_gen_history`, which now also stores FAQ-only runs with the pasted Supplemental Content), and call the open-CORS proxy to spend provider quota. It cannot read an API key, which never reaches the browser.

Likelihood is low-to-moderate (needs an adversarial model output, for example via prompt injection through pasted third-party copy), severity is the skill's blocking class ("content that never passed the generation pipeline can reach the sanitizer bypass" in effect: content that the pipeline's own allowlist failed to stop).

Recommended fix (for the implementer, not applied here):
- Make `validateFaqShape` fail closed on markup it cannot tokenize: any `<` followed by a letter or `/` or `!` or `?` that does not complete as a well-formed allowed tag must raise `faq-not-well-formed` (a stray `<` in prose is `&lt;`). A simple form is an allowlist-first scan: after removing the exact permitted tags `</?(h3|p|b|ul|li)\s*>` (no attributes), the remainder must contain no `<`.
- Treat a quote inside a tag head as an attribute (`faq-attribute-present`) without requiring it to pair.
- Do **not** loosen `html-cleaner.ts` or `output-validator.ts`, and do **not** add a second `bypassSecurityTrust*`.
- Add regression cases to `src/utils/faq-html.spec.ts` for the three accepted rows above, plus an unterminated trailing `<`.

## Surface 3: Untrusted HTML in the editor - CLEAR
- `src/app/components/html-editor/**` and `extensions/attr-helpers.ts` are not in the diff; no node or attribute was added to the TipTap schema. The FAQ tabs are a read-only preview plus a `highlight.js` source view (`[appHighlightCode]`, text, not HTML), and are not routed through the editor.

## Surface 4: Prompt injection - N-1, N-2 (non-blocking); no fetched-page path
- No retrieval is involved: `runFaqPipeline` does no fetch (Rule 2 held; confirmed by the verification report and by the diff). The untrusted inputs here are user-pasted text (Supplemental Content, Original Description, Tech Specs) and, second order, the master FAQ.
- Instruction vs data channel: in `buildPromptFaq` the three pasted fields are interpolated into `userContent` under `[Original Description]:`, `[Tech Specs]:`, `[Supplemental Content]:`; `systemBlocks` holds only the constant `TASK_FAQ_SYSTEM`. In `buildFaqTranslationPayload` the master goes into `userContent` as `[BASE FAQ HTML]:`; both `systemBlocks` are constant text plus locale rules. Nothing user-controlled reaches `systemBlocks`, so the cached instruction channel is not poisoned. Containment of the model itself is strong: it is a plain text-completion call with no tools and no retrieval, and its output is only ever stored if it passes the shape gate (B-1 is the gap in that gate).

### N-1 (non-blocking, introduced): a poisoned master flows into N translation prompts
The uk-UA master becomes the SOURCE of up to N-1 translation calls, so a successful injection through Supplemental Content is amplified into every locale. Mitigations that hold: the translation system block instructs element-for-element translation and forbids attributes; each translation is validated by `validateFaqShape` plus `validateFaqStructuralParity` (h3/p/ul/li counts equal the master's), capped at 3 attempts, and a failing language is skipped. Residual risk: parity counts structure, not wording, so injected *text* (a false claim, a link-like string, a competitor name) survives translation and is fanned out; this is a content-correctness risk with a mild worst case (marketing copy), and the markup risk is B-1. Recommendation: after B-1, consider checking that no translation contains an element or attribute the master lacks (already covered by the shape gate once fixed). No change to the prompt is required by this review.

### N-2 (non-blocking, introduced widening of an accepted surface): pasted fields are interpolated without delimiters or a length bound
`productName`, `originalDescription`, `techSpecs` and `supplementalContent` are concatenated into `userContent` with only a bracketed header, no fence, no "treat as data" instruction and no maximum length. A pasted text containing `[OUTPUT CONTRACT]`-style markers or "ignore previous instructions" can read as instruction. This is the same pattern the Generator already used for Supplemental Content, now with a second entry point (the standalone tool), and the worst case is corrupted marketing copy plus extra token cost, not an action. Recommendation (optional, not blocking): fence the pasted fields and cap length in the prompt builder in a later Story; do not touch `task-c.ts`/`master-system-prompt.ts` (FROZEN) for it.

## Surface 5: Proxy, CORS, error surface and telemetry - CLEAR for this change
- `server/**` is untouched: CORS handling, `describe-error.js`, `call-log.js` and `usage/store.js` are exactly as before. The permissive `cors()` without an origin restriction remains a pre-existing accepted condition for a localhost proxy (see O-1); this change does not alter deployment, binding or origin handling.
- Usage database: `generateFaqOnly` and the shared pipeline call `llm.generateText` with `{ taskLabel, productName, store, lang }` only. `usage/store.js` persists `taskLabel`, `productName`, `store`, `lang` and token/cost counters; it does not persist prompt or response text. New values are the labels `FAQ (uk-UA)` and `FAQ translation (<iso>)`; no secret and no pasted free text is added.
- Logs (browser console only): the SP-3 skip writes `[FAQ] Store "<name>" does not list uk-UA; FAQ generation skipped.` (store name from the fixed registry); the failure warnings write the label and the thrown `Error` object from the provider call; the info line writes the label. No payload, key or pasted content is logged by new code. `console.error` for the pipeline safety net logs the caught error object, same as the surrounding code.
- History: FAQ-only runs now call `historyService.add(input, content)`, so the pasted Supplemental Content, description and specs are stored in `localStorage` (`seo_gen_history`, capped at 20). This is the existing Generator behaviour extended to the new mode (see O-2); it matters only because B-1 would let injected script read it.

## Findings summary

| Id | Class | Introduced / pre-existing | Surface |
|---|---|---|---|
| B-1 | **Blocking** | Introduced (new `validateFaqShape` tokenizer) | 2 (SafeHtml sink) |
| N-1 | Non-blocking | Introduced (fan-out of the single master) | 4 |
| N-2 | Non-blocking | Widening of an existing accepted pattern (second entry point) | 4 |
| O-1 | Observation | Pre-existing | 5 (open `cors()`) |
| O-2 | Observation | Pre-existing pattern, extended to FAQ-only runs | 5 (localStorage history) |
| O-3 | Observation | Pre-existing | 2 (`safe-html.pipe.ts` bypass is by design; only one call exists) |
| O-4 | Observation | Introduced, accepted | `.arch-guard-checksums` updated for `task-c.ts` (FROZEN file; human approval is recorded by the verification report, not re-judged here) |

Also noted, not a finding: HTML comments (`<!-- -->`) pass `validateFaqShape` because the tag regex ignores `<!`. A comment is inert in the preview, but it is outside the five-element contract; the B-1 fix (nothing but the permitted tags may remain) closes it for free.

## Verdict

**CHANGES_REQUIRED**, `loop_back_stage: changes_required` (-> IMPLEMENTATION). The Specification needs no change: FR-9 already requires "only the five elements, no attributes"; the implementation does not enforce it for an unpaired-quote tag or an unterminated trailing tag. Fix in `src/utils/faq-html.ts` with regression tests in `src/utils/faq-html.spec.ts` (test additions are the implementer's, through the TDD gate), then re-run the gate, the verification and this review. All other surfaces are clear or non-blocking.

## Verification Checklist

- [x] All five surfaces examined, each with a finding or an explicit "clear".
- [x] Secret flow traced through signals, `ProductInput`, `generateText` metadata and the usage store, not only grepped for literals.
- [x] `.env.example` current: no new setting; untouched.
- [x] What reaches `bypassSecurityTrustHtml` identified: `item.answer` from `faqArtifacts` via `parseFaqItems`.
- [x] No new `bypassSecurityTrust*` call.
- [x] Editor schema / attribute allow-list not touched; no widening.
- [x] No fetched-page content in this change; pasted and master text sit in `userContent`, never in `systemBlocks`.
- [x] Error responses and `server/**`: untouched.
- [x] Usage telemetry remains metadata-only.
- [x] Each finding classed blocking / non-blocking / observation, introduced vs pre-existing separated.
