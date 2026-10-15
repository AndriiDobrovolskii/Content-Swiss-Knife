---
artifact: security_review
story: US-8.1
version: 3
status: DRAFT
owner: so-security-reviewer
stage: SECURITY_REVIEW
created_at: 2026-10-14T22:55:00Z
updated_at: 2026-10-15T12:30:00Z
supersedes: docs/reviews/security/US-8.1-security-review.md#2
inputs_consumed:
  - {key: story, version: 2}
  - {key: specification, version: 2}
  - {key: implementation_report, version: 4}
  - {key: verification_report, version: 4}
---

# Security Review: US-8.1 Single master FAQ and standalone FAQ tool

- Story: US-8.1 | Stage: SECURITY_REVIEW | Skill: so-security-reviewer | Version: 3 (re-review of HEAD `74c820e`) | Status: DRAFT
- Supersedes v2 (PASS, reviewed at `312b172`; v2 and v1 remain in git history, v1 was CHANGES_REQUIRED on B-1).
- Inputs: story v2, specification v2 (APPROVED), implementation_report v4, verification_report v4 (both current, not superseded), and the real diff (`git diff 1ac82e1..HEAD` and `git diff 9916841..HEAD`, branch `feat/US-8.1-single-master-faq`).
- Verdict: **PASS** (0 blocking findings; non-blocking N-1, N-2, N-3 unchanged; observations O-1..O-4 unchanged). B-1 remains **resolved**.

Note on the story input: the story file is version 2 and its only commit is `bcec6b1` (before every review); v2 of this review listed "story v1" in its front matter, which was a recording slip, not a story change.

## What changed since v2

`git diff 9916841..HEAD --stat` (v2 reviewed commit vs HEAD) is 14 files: 5 under `src/` + `test/`, the rest `docs/`. Outside `docs/` exactly these five files changed, and nothing else:

| File | Change | Class |
|---|---|---|
| `src/utils/faq-html.ts` | `d33292c`: one line, `const MARKDOWN_BOLD =/\*\*...` becomes `const MARKDOWN_BOLD = /\*\*...` (one inserted space; regex literal byte-identical) | whitespace only |
| `src/app/app.component.template-wiring.spec.ts` | +96 lines: source-text pins (`htmlLf`/`tsLf` string matches) for the AC-10 label key and the AC-11 predicate arguments | test only |
| `src/services/content-orchestrator.faq-pipeline.spec.ts` | +41/-1: AC-19 integration block, imports two helpers | test only |
| `src/services/content-orchestrator.faq-standalone.spec.ts` | +27/-1: AC-19 integration block, imports one helper | test only |
| `test/fixtures/faq-pipeline.ts` | +44: `DESCRIPTION_ONLY_MARKERS`, `faqTranslationPromptProblems`, `looksLikeDescriptionPrompt`, and one import of the existing `MASTER_SYSTEM_PROMPT` constant | test helper only |

`git diff 1ac82e1..HEAD` (the B-1 fix commit vs HEAD) restricted to `server/`, `tools/`, `.env.example`, `package.json`, `package-lock.json`, `.arch-guard-checksums`, `src/app/pipes/`, `src/utils/html-cleaner.ts`, `src/utils/output-validator.ts`, `src/prompts/`, `src/prompt-core/` is **empty**. So: no production logic, no server, no prompt, no proxy, no sink change, no dependency change, no new setting. The `d33292c` line is on the `MARKDOWN_BOLD` constant, not on `PERMITTED_TAG` or the `includes('<')` check, so the B-1 fix is untouched.

### New test helpers: secret / key / URL / unsafe-fixture check
Scanned every added line of `git diff 9916841..HEAD -- src test` for `https?://`, `api_key`, `secret`, `token`, `bearer`, `password`, `process.env`, `sk-`, `eval(`, `innerHTML`, `bypassSecurity`. The only hits are three comment lines that contain the file name `task-c.faq.spec.ts` (substring `sk-c`). No literal URL, key, credential, env read, DOM sink or `bypassSecurityTrust*` is present. The marker strings (`</section>`, `<hr`, `<h2`, `CTA`, `H1 LOCK`, `[Delivery`, ...) are inert substrings used with `String.includes` against the prompt text the stubbed model received; they are never rendered, parsed or sent anywhere. The `MASTER_SYSTEM_PROMPT` import is a read of an existing in-repo constant inside a spec fixture (never imported by production code). The template-wiring pins only read the checked-in `app.component.html` / `.ts` as text. The test code reads only the stubbed LLM boundary; no real provider call, no network.

## Fresh evidence from HEAD (this run)

Environment: Node v24.15.0, real `convertStrongToB` + `validateFaqShape` from `src/utils/faq-html.ts` at HEAD, loaded with `--experimental-strip-types`; `parse5` from `node_modules` as the browser model (probe script in the session scratchpad, not committed). Each case wrapped as `<h3>Q</h3><p>...</p>`.

| Input | Result at HEAD |
|---|---|
| v1 B-1 payloads: `<img src=x onerror=alert(1) a'>`, `<img ... a">`, unterminated `<img src=x onerror=alert(1)`, bare trailing `<` | all REJECT `faq-not-well-formed` |
| `<strong onmouseover=...>`, `<STRONG ...>`, `<b/onmouseover=...>`, `<p\nonclick=...>` | REJECT (`faq-not-well-formed` + `faq-attribute-present`) |
| comment `<!-- -->`, `<![CDATA[`, `<ScRiPt>`, `<svg onload>`, `<<p>img ...>`, `<im<b>g ...>`, NUL after `<`, `a < b` | all REJECT |
| entity forms `&lt;script&gt;...`, `&#60;img onerror&#62;` | ACCEPT, parse5 fragment yields only `h3,p` text (inert) |
| plain `<b>bold</b> text` | ACCEPT, elements `h3,p,b` |
| N-3 class: `<b >x</b >`, `<b >` | ACCEPT (the known N-3 gap, unchanged) |
| randomized campaign: 300,000 strings from a 28-fragment alphabet (quotes, `<`, `/`, `=`, NUL, NBSP, FF, entities, all five elements, `strong`, `img`, `script`, `svg`, `!--`, `[CDATA[`) | 3,152 accepted; 0 contained an element outside `h3 p b ul li`, any attribute, or a comment node (parse5 tree walk) |

Vitest run of the two named specs at HEAD: `npx vitest run src/utils/faq-html.spec.ts src/utils/faq-gate.spec.ts` gives **Test Files 2 passed (2), Tests 115 passed (115)** (this includes the B-1 regression rows, and the `isFaqStorable` rows showing `faq-not-well-formed`, `faq-element-not-allowed` and `faq-attribute-present` at severity error are NOT storable).

## Surface-by-surface (all five re-asserted)

1. **Secret containment (Rule 4): CLEAR.** No `server/**`, `.env.example`, `process.env` or key reference added since v2 (empty diff above); the only new code is spec/fixture code with no secret-shaped literal. `.env.example` current (no new setting). Server error funnel, `call-log.js` and `usage/store.js` untouched, so telemetry stays metadata only.
2. **DomSanitizer bypass: CLEAR, B-1 RESOLVED.** Still exactly one `bypassSecurityTrustHtml` in non-spec source (`src/app/pipes/safe-html.pipe.ts:14`), file unchanged. What reaches it is unchanged from v2: `item.answer` from `faqArtifacts`, written only by `storeFaq` after `buildFaqValidator` + `isFaqStorable`; the fail-closed check `html.replace(PERMITTED_TAG, '').includes('<')` is byte-identical to what v2 attacked, and re-run above. `html-cleaner.ts` / `output-validator.ts` not touched, nothing loosened.
3. **Editor schema: CLEAR.** `src/app/components/html-editor/` not touched; no widening.
4. **Prompt injection: CLEAR with N-1, N-2 UNCHANGED non-blocking.** `src/prompts/**`, `src/prompt-core/**` and the orchestrator are unchanged since v2 (the AC-19 specs only observe the prompt at the stubbed boundary). No fetched-page content in the FAQ path, no change to what is fetched, pasted fields and master stay in `userContent`, `systemBlocks` constant text only.
5. **Proxy: CLEAR.** `server/**` untouched since before v2. Open `cors()` remains a pre-existing observation (O-1); no deployment, binding or origin change.

## Findings

| Id | Class | Introduced / pre-existing | Surface | Status vs v2 |
|---|---|---|---|---|
| B-1 | Blocking | Introduced | 2 | RESOLVED (`1ac82e1`), re-verified at HEAD |
| N-1 | Non-blocking | Introduced | 4 | unchanged |
| N-2 | Non-blocking | Widening of an accepted pattern | 4 | unchanged |
| N-3 | Non-blocking | Introduced by the B-1 fix | 2 | unchanged, carried forward |
| O-1 | Observation | Pre-existing | 5 (open `cors()`) | unchanged |
| O-2 | Observation | Pre-existing pattern extended to FAQ-only runs | 5 (localStorage history) | unchanged |
| O-3 | Observation | Pre-existing | 2 (single `bypassSecurityTrustHtml`, by design) | unchanged |
| O-4 | Observation | Introduced, accepted | `.arch-guard-checksums` for FROZEN `task-c.ts`; approval recorded elsewhere | unchanged |

- **N-1** (poisoned master fans out to up to N-1 translation calls): wording-level content risk; markup half is gated fail-closed. Marketing-copy worst case.
- **N-2** (pasted fields interpolated without fence or length cap, second entry point): optional later hardening; FROZEN prompt files not to be touched for it.
- **N-3** (low): `PERMITTED_TAG` uses `\s`, wider than HTML whitespace (TAB/LF/FF/CR/SPACE). A tag padded with Unicode space, e.g. `<b >`, is accepted, and `parseFaqItems` tests `tagName === 'H3'`, so an `<h3 >` question makes that FAQ render empty. Re-checked at HEAD: only whitespace-like characters can sit between the tag name and `>`, so no `=`, quote, letter or digit follows the name; no `on*`, `src`, `href` or `style` attribute, no value, no raw-text or foreign-content context is reachable, and the 300,000-string campaign found no element or attribute outside the allow-list that was executable. I found no exploit, so it stays non-blocking (functional/contract gap only). Recommendation (implementer, optional, not applied here): use `[ \t\n\f\r]*` instead of `\s*` in `PERMITTED_TAG` and the `(?=[\s/>])` lookaheads, with a regression case for `<p >` / `<li\f >`. Do not touch `html-cleaner.ts` or `output-validator.ts`.

Pre-existing, not this Story: history restore from `localStorage` (`seo_gen_history`) re-hydrates `faqArtifacts` without re-running the gate; exploiting it already requires same-origin script execution.

## Verdict

**PASS.** The branch since v2 changed one whitespace-only space in a constant, three spec files and one test fixture; no production logic, server, prompt, proxy or sink changed, no new `bypassSecurityTrust*`, no secret, key, URL or unsafe fixture entered. B-1 remains closed with fresh evidence. This PASS is not human approval.

## Verification Checklist

- [x] All five surfaces examined; each with a finding or an explicit "clear" (above).
- [x] Secret flow: no related file in the delta (`server/`, `.env.example`, `process.env` diff empty); added lines scanned for key/secret/URL literals.
- [x] `.env.example` current: no new setting.
- [x] What reaches `bypassSecurityTrustHtml` identified (`item.answer` via `storeFaq` after the gate); unchanged.
- [x] No new `bypassSecurityTrust*` call (one in non-spec source, `safe-html.pipe.ts:14`).
- [x] Editor schema / attribute allow-list not touched.
- [x] No fetched-page content in the FAQ path; pasted and master text in `userContent`, never `systemBlocks`.
- [x] Error responses and `server/**` untouched.
- [x] Usage telemetry remains metadata-only.
- [x] Each finding classed blocking / non-blocking / observation, introduced vs pre-existing separated.
- [x] Input artifacts are the current versions (implementation_report v4, verification_report v4, specification v2 APPROVED, story v2).
