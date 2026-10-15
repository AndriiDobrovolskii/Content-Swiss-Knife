---
artifact: security_review
story: US-8.1
version: 2
status: DRAFT
owner: so-security-reviewer
stage: SECURITY_REVIEW
created_at: 2026-10-14T22:55:00Z
updated_at: 2026-10-15T09:00:00Z
supersedes: docs/reviews/security/US-8.1-security-review.md#1
inputs_consumed:
  - {key: story, version: 1}
  - {key: specification, version: 2}
  - {key: implementation_report, version: 3}
  - {key: verification_report, version: 3}
---

# Security Review: US-8.1 Single master FAQ and standalone FAQ tool

- Story: US-8.1 | Stage: SECURITY_REVIEW | Skill: so-security-reviewer | Version: 2 (re-review) | Status: DRAFT
- Supersedes v1 (CHANGES_REQUIRED on B-1). v1 remains in git history (`aaff972` and earlier).
- Inputs: story v1, specification v2 (APPROVED), implementation_report v3, verification_report v3 (both current, not superseded), and the real diff `27b01b8..HEAD` (branch `feat/US-8.1-single-master-faq`, HEAD `312b172`).
- Verdict: **PASS** (0 blocking findings; non-blocking N-1, N-2 unchanged from v1, plus one new non-blocking N-3; observations O-1..O-4 unchanged). B-1 is **resolved**.

## What changed since v1

`git diff c4b7f03..HEAD` outside `docs/` touches exactly four files: `src/utils/faq-html.ts` (the B-1 fix, commit `1ac82e1`) and three spec files (`faq-html.spec.ts`, `faq-gate.spec.ts`, `content-orchestrator.faq-pipeline.spec.ts`, commit `97d8913`). Nothing under `server/`, `.env.example`, `src/app/pipes/`, `html-cleaner.ts`, `output-validator.ts`, `html-editor/`, `src/prompts/` or the orchestrator changed. So Surfaces 1, 3, 4 and 5 are unchanged from v1 (clear / N-1 / N-2 / clear). Only Surface 2 is re-examined below.

## Surface 2: DomSanitizer bypass - B-1 RESOLVED, N-3 recorded

### The fix
After the existing tag pass, `validateFaqShape` now does `html.replace(PERMITTED_TAG, '').includes('<')` with `PERMITTED_TAG = /<\/?(?:h3|p|b|ul|li)\s*>/gi`, and reports `faq-not-well-formed` if any `<` is left. Reasoning checked: the permitted-tag pattern contains exactly one `<` (its opener), so after the replace every surviving `<` is a `<` that did NOT open an exact permitted tag; hence an accepted string is plain text plus exact `<h3|p|b|ul|li>` / `</...>` tags and nothing else. Existing rule ids for well-formed bad tags are unchanged (G7-G10 in the new spec). The check is independent of the quote-pairing logic that B-1 defeated.

### Independent attack (not the repo's tests)
Method: real `convertStrongToB` + `validateFaqShape` (Node 24, `--experimental-strip-types`), plus the real `buildFaqValidator` / `isFaqStorable` through vitest, with `parse5` 7.3.0 as the browser model. For every accepted string I parsed it as a document (the `DOMParser` view used by `parseFaqItems`), as a fragment (the `innerHTML` view used by `safeHtml`), and re-parsed the re-serialised body (the `outerHTML` -> `innerHTML` round trip), and walked each tree for any element outside `h3 p b ul li`, any attribute, any comment/doctype node, any non-HTML namespace, any `<template>` content.

Handcrafted inputs (46), all with the result shown:

| Input class | Result |
|---|---|
| v1 rows: `<img ... a'>`, `<img ... a">`, unterminated `<img src=x onerror=alert(1)`, bare trailing `<` | all REJECT `faq-not-well-formed` |
| `<strong onmouseover=...>`, `<STRONG ...>`, `<strong/onmouseover=...>` (rename must not launder attributes) | REJECT; `convertStrongToB` only rewrites the name, the attribute remains visible to the validator and raises `faq-attribute-present` |
| `<b/onmouseover=...>`, `<p/onclick=...>`, `<p\nonclick=...>`, `<p\ronclick=...>` | REJECT |
| comment `<!-- -->`, `<!-->..-->` trick, CDATA, processing instruction, DOCTYPE | REJECT |
| `<ScRiPt>`, `<svg onload>`, nested/odd `<<p>img ...>`, `<p<p>>`, split `<im<b>g ...>`, `<stro<strong>ng ...>`, `<<strong>strong>` | REJECT |
| NUL / U+0001 inside or right after `<`, inside the tag name | REJECT |
| text-level `a < b`, `1 <2` | REJECT (must be `&lt;`) - intended by the fix |
| Entities `&lt;script&gt;`, `&#60;img onerror&#62;`, `&#x3c;...`, `&lt` without semicolon, double-encoded `&amp;lt;` | ACCEPT, and safe: parse5 yields a text node only; no element or attribute in any of the three views; the re-serialised form re-escapes `<` as `&lt;` and re-parses to text again (no mXSS: no raw-text, RCDATA, `svg`, `math`, `noscript`, `template` or `style` element can ever be produced by an accepted string) |
| Upper/mixed-case allowed tags `<H3>Q</H3><P>..` | ACCEPT, benign (names are case-folded by the parser) |

Two randomized campaigns, accepted strings checked against the tree walk: (a) 300,000 strings from a 60-fragment alphabet (quotes, `<`, `>`, `/`, `!`, `--`, `[CDATA[`, NUL, control chars, NBSP, entities, all five elements, `strong`, `script`, `img`, `svg`): 38,815 accepted, **0 violations**; (b) 1,500,000 strings biased toward tag heads followed by whitespace-like, quote, `=`, `/`, NUL and `<` characters: 44,115 accepted, **0 script/event-handler/comment/foreign-element hits** and exactly two "soft" classes, N-3 below. End to end through the real `buildFaqValidator` + `isFaqStorable`: the v1 payloads, the `<strong onmouseover>` payload are `storable=false`; the entity payload is `storable=true` and inert.

Sink path re-traced: `produce` -> `convertStrongToB` + normalizers -> `validate` (`buildFaqValidator`) -> in `runRepairGate` the artifact and its issues travel together (`best = {artifact, issues, ...}`; the tier-0/field/block passes and the final block pass each re-run `validate` on the artifact they ship) -> `isFaqStorable(result.finalIssues)` -> `storeFaq` (the only writer of `faqArtifacts`; re-applies the idempotent `convertStrongToB`, which is a no-op on an accepted string because an accepted string cannot contain `<strong`) -> `parseFaqItems` -> `safeHtml`. No path writes `faqArtifacts` without the gate; there is still exactly one `bypassSecurityTrust*` call (`safe-html.pipe.ts:14`), unchanged. `html-cleaner.ts` / `output-validator.ts` are untouched and nothing was loosened. `item.question` is rendered with `{{ }}` interpolation (escaped), not through the pipe.

### N-3 (non-blocking, introduced, low): `PERMITTED_TAG` uses `\s`, which is wider than HTML whitespace
JavaScript `\s` also matches U+000B, U+00A0, U+1680, U+2000-U+200A, U+2028, U+2029, U+202F, U+205F, U+3000 and U+FEFF. The HTML tokenizer treats only TAB, LF, FF, CR and SPACE as whitespace. Consequences, proven with parse5 (reproduction strings written with escapes):
- `<p >A</p >` is accepted and builds an element whose tag name is `p ` (not `p`).
- `<li\f >` / `<p\t　>` is accepted: after the real whitespace the Unicode space starts an attribute whose name consists only of Unicode-space characters and whose value is empty.

Why this is non-blocking: the characters admitted are only whitespace-like and the match must then end at `>`, so no `=`, quote, letter or digit can follow the tag name. No attribute name can be `on*`, `src`, `href`, `style` or anything else with behaviour, no value is possible, the element name is one of the five plus invisible padding, and no script, URL, raw-text or foreign-content context is reachable. Across 1.5M targeted strings the only divergences were these two classes. It is a violation of the letter of FR-9 ("only five elements, no attributes") with no demonstrated execution path, hence not the blocking class. Side effects are functional only: `parseFaqItems` tests `tagName === 'H3'`, so an `<h3 >` question is not recognised and that FAQ would render empty.
Recommendation (implementer, optional, one line, not applied here): use `[ \t\n\f\r]*` instead of `\s*` in `PERMITTED_TAG` (and in the `(?=[\s/>])` lookaheads), plus a regression case `<p >` / `<li\f >` rejected. Do not touch `html-cleaner.ts` or `output-validator.ts`.

## Surface 1, 3, 5: unchanged, CLEAR
No change to code in these surfaces since v1 (see "What changed"). v1 evidence stands: no `process.env` or key reference added, no `.env.example` change needed, no editor-schema change, `server/**` untouched (error funnel, `call-log.js`, `usage/store.js`), telemetry still metadata only.

## Surface 4: Prompt injection - N-1, N-2 UNCHANGED, still non-blocking
`src/prompts/task-faq.ts`, `task-c.ts`, `master-system-prompt.ts` and the orchestrator are byte-identical to what v1 reviewed (outside the four files above). Pasted fields and the master still sit in `userContent` under bracketed headers; `systemBlocks` holds constant text only; no retrieval in the FAQ path; no new fetch.
- **N-1** (poisoned master fans out to up to N-1 translation calls): unchanged. The one thing that moved is that the markup half of the risk is now enforced by a gate that failed closed in my tests; the residual is wording-level (false claim, competitor name) which structural parity does not catch. Still a content-correctness risk with a marketing-copy worst case. Non-blocking.
- **N-2** (pasted fields interpolated without fence or length cap, now with a second entry point): unchanged. Non-blocking, optional later hardening, FROZEN prompt files not to be touched for it.

## Findings summary

| Id | Class | Introduced / pre-existing | Surface | Status vs v1 |
|---|---|---|---|---|
| B-1 | Blocking | Introduced | 2 | **RESOLVED** by `1ac82e1` |
| N-1 | Non-blocking | Introduced | 4 | unchanged |
| N-2 | Non-blocking | Widening of an accepted pattern | 4 | unchanged |
| N-3 | Non-blocking | Introduced by the B-1 fix | 2 | new |
| O-1 | Observation | Pre-existing | 5 (open `cors()`) | unchanged |
| O-2 | Observation | Pre-existing pattern extended to FAQ-only runs | 5 (localStorage history) | unchanged |
| O-3 | Observation | Pre-existing | 2 (single `bypassSecurityTrustHtml`, by design) | unchanged |
| O-4 | Observation | Introduced, accepted | `.arch-guard-checksums` for FROZEN `task-c.ts`; approval recorded elsewhere | unchanged |

One more observation (pre-existing, not this Story): history restore from `localStorage` (`seo_gen_history`) re-hydrates `faqArtifacts` without re-running the gate; exploiting that already requires same-origin script execution.

## Verdict

**PASS.** No blocking finding. The v1 blocker is closed: every payload in the v1 report is now rejected, and the fail-closed "no `<` outside exact permitted tags" rule held against about 1.8M adversarial strings with no script, event handler, comment, foreign element or mXSS vector reaching the tree. N-3 is the single residual contract gap (invisible-whitespace padding of an allowed tag or attribute name) and should be fixed when convenient; it does not reach the executable class. This PASS is not human approval.

## Verification Checklist

- [x] All five surfaces examined; 1, 3, 4, 5 confirmed unchanged by diff, 2 re-attacked.
- [x] Secret flow unchanged since v1 (no related file in the delta).
- [x] `.env.example` current: no new setting.
- [x] What reaches `bypassSecurityTrustHtml`: `item.answer` from `faqArtifacts`, only via `storeFaq` after the gate; re-traced end to end.
- [x] No new `bypassSecurityTrust*` call.
- [x] Editor schema / attribute allow-list not touched.
- [x] No fetched-page content; pasted and master text in `userContent`, never in `systemBlocks`.
- [x] Error responses and `server/**` untouched.
- [x] Usage telemetry remains metadata-only.
- [x] Each finding classed blocking / non-blocking / observation, introduced vs pre-existing separated.
- [x] Input artifacts are the current versions (implementation_report v3, verification_report v3).
