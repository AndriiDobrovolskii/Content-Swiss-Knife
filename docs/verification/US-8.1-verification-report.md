---
artifact: verification_report
story: US-8.1
version: 3
status: DRAFT
owner: so-implementation-verifier
stage: IMPLEMENTATION_VERIFICATION
created_at: 2026-10-15T08:45:00Z
updated_at: 2026-10-15T08:45:00Z
supersedes: docs/verification/US-8.1-verification-report.md#2
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: implementation_plan
    version: 1
  - key: task_breakdown
    version: 3
  - key: implementation_report
    version: 3
  - key: quality_gate_report
    version: 3
---

# Implementation Verification Report - US-8.1 (v3, re-verification after the B-1 fix)

Scope: `git diff 27b01b8..HEAD` on `feat/US-8.1-single-master-faq` (HEAD `ca7d717`). Version 2 (PASS at `75cc0be`) is superseded. The delta since v2 is `git diff 75cc0be..HEAD`; I read the B-1 commits `97d8913` (tests) and `1ac82e1` (fix) in full and re-ran the FROZEN and scope checks over the whole range. Every check is against the diff and the files as they stand, not against the reports. The mechanical gate was not re-run as verification; `bash arch-guard.sh` was run once, read-only, as a FROZEN cross-check (exit 0).

**Verdict: PASS** (`loop_back_stage: null`). The B-1 change introduces no new violation. Three non-blocking findings (N-1 to N-3); one is the style nit the gate reported.

## What changed since v2 (the whole delta)

`git diff 75cc0be..HEAD --stat` over source and tests: `src/utils/faq-html.ts` (+12/-1) and three spec files (`faq-html.spec.ts`, `faq-gate.spec.ts`, `content-orchestrator.faq-pipeline.spec.ts`); everything else is docs and workflow state. `git diff 75cc0be..HEAD -- .arch-guard-checksums src/prompts src/prompt-core src/utils/output-validator.ts server package.json arch-guard.sh` is empty.

The fix (`1ac82e1`, one file): a new constant `PERMITTED_TAG = /<\/?(?:h3|p|b|ul|li)\s*>/gi`, and after the existing tag-stack pass, `if (html.replace(PERMITTED_TAG, '').includes('<'))` reports `faq-not-well-formed`. No new rule id; `FAQ_SHAPE_RULES` is unchanged, so every consumer keyed on the five ids is unaffected. The issue carries no `path`, so the repair ladder still resolves it to a full FAQ regeneration, exactly as for the other shape errors. The function stays pure and deterministic (no DOM, clock, random).

## B-1 change against the approved Specification

**FR-9** says a stored FAQ "parses with no unclosed or mismatched tag and contains no element other than `h3`, `p`, `b`, `ul`, `li`", and by default (OD-4) begins with an `<h3>` and has no attributes on those elements. The fix makes that enforcement total. Before it, input the tag tokenizer could not see (unpaired quote in a tag head, missing `>`, comment, processing instruction, CDATA, bare `<`) was reported as "no issue" and was stored, then reached `bypassSecurityTrustHtml`: a real FR-9 hole. After it, the only `<` that can survive is the head of one of the five exact attribute-free tags (whitespace before `>` tolerated, case-insensitive). This is the five-element, attribute-free allowlist FR-9 states, applied fail-closed. A permitted-tag removal cannot manufacture a safe string out of a bad one: a nested input such as `<<p>script>` leaves `<script>` after the single replace pass, so it is still rejected. A tag with any attribute or a slash form (`<p/>`) is not removed and is rejected, both by the old pass and by the new one.

**Does rejecting a residual `<` in text conflict with any requirement, AC or fixture? No.**
- Specification: no FR, NFR, AC or OD requires a raw `<` to survive in FAQ text. Searching the spec for `&lt;`, "less-than" and "raw <" finds nothing that asks for one; the FR-21/FR-22/FR-23 content rules (unit spacing, no Markdown, no `<br>`, no anglicisms, no `itemtype`) are untouched. A literal `<` in prose has to be written as the entity `&lt;` for the text to be correct HTML in any case, because a raw `<` followed by a letter is parsed as a tag by the browser.
- Fixtures and tests: `test/fixtures/faq-pipeline.ts` (`FAQ_MASTER_HTML`, the `<strong>` variant, `FAQ_INVALID_HTML`) contain no raw `<` in text; units are `°C` and `мм`. `faq-html.spec.ts` guards G1-G10 pin what stays accepted: G3 `5 &lt; 6 &amp; 7 &gt; 3 &quot;x&quot;` (escaped entities), G4 a literal `>` in text, G2 straight and Ukrainian apostrophes, G5 upper-case tags, G6 whitespace before `>`. Unit symbols (`°`, `×`, `Ø`, `µ`, `≤`, `±`) are not `<` and are not affected. The 16-pair description golden and the description path are untouched.
- Consequence if a model does emit a raw `<` in prose: the FAQ is a contract error and is regenerated (master: up to 3 attempts per FR-10; translation: FR-11), then not stored. That is the failure path FR-9 already prescribes; it is fail-closed, not an unsafe outcome. See N-1 for the residual quality trade-off.

## Check 1 - Architecture Rule 2 (retrieval separate from generation): HOLDS

Read: the full diff of `1ac82e1` and `97d8913`, plus the v2 reading of `runFaqPipeline`, `runFaqGate`, `generateFaqOnly`, `buildFaqTranslationPayload`, `faq-gate.ts`, `faq-html.ts`. The B-1 delta adds one regex constant and one string test in a pure utility; no fetch, search, `RetrievalService`/`RetrievalProvider` use, model call or I/O. `server/`, `package.json`, `arch-guard.sh` have no diff in the range or in the delta. No grounding, no SDK import. Review-only: no command checks this rule.

## Check 2 - AGENTS.md section 4 HTML criteria: HOLDS

The change is a validator-only tightening of the FAQ shape gate. Description prompt, Zod schema, renderers and `output-validator.ts` are unchanged, so Product `itemtype`, meta lengths, CTA, figures and video embeds are unaffected. The FAQ stays HTML-only, five elements, no attributes, no Markdown (`MARKDOWN_*` rules intact, order of `note` calls unchanged), no `<br>`. `meta-description-currency`: `output-validator.ts` is not in the diff; the rule stays disarmed and `seo-currency-wiring.spec.ts` is untouched.

## Check 3 - STORE_REGISTRY as the only source of languages and currency: HOLDS

The added lines of `1ac82e1` contain no BCP-47 code, currency symbol or code, or URL (checked by search over the added lines). The only added strings are a rule detail message and a comment. The registry-derived language name and `MASTER_LOCALE` use verified in v2 (V-1, V-2) are in `8c89bce`, which is unchanged since.

## Check 4 - Prompt-caching block separation: HOLDS

No prompt builder changed in the delta (`src/prompts`, `src/prompt-core` have no diff since `75cc0be`). `buildFaqTranslationPayload` and `buildPromptFaq` keep `systemBlocks` with `cache: true` and per-product data in `userContent`, as verified in v2.

## Check 5 - FROZEN files: HOLDS (unchanged from v2)

`git log --oneline 27b01b8..HEAD -- src/prompts/task-c.ts .arch-guard-checksums src/prompts/task-a.ts src/prompts/task-b.ts src/prompt-core/master-system-prompt.ts src/utils/output-validator.ts` lists exactly `da59195` and `8c89bce`, as in v2; the B-1 commits touch none of the five frozen files or `.arch-guard-checksums`. Each of the two commits changed `src/prompts/task-c.ts` and re-baselined `.arch-guard-checksums` in the same commit. The two section 9 grants are recorded in `docs/catalog/US-8.1-pipeline-status.md` ("T1 - section 9 stop and approval record", line 51; "Loop-back fix 1 of 3 ... section 9 stop and approval record", line 194); the B-1 section (line 213) records no section 9 stop because none was needed. `bash arch-guard.sh`: "All frozen files unchanged", exit 0. I can confirm the records exist and the diffs stay inside them; I cannot independently re-observe the in-session grants themselves.

## Check 6 - Angular and server conventions: HOLDS

The delta is a pure `src/utils` function plus specs. No component, NgModule, RxJS, SDK import, prompt string in a service, secret, log line or `server/usage/store.js` change. The fix reduces the attack surface that reaches the `SafeHtml` pipe; it adds none.

## Check 7 - Scope discipline: HOLDS, with one style finding

The B-1 commits touch only `src/utils/faq-html.ts` (the fix) and three spec files (the red tests, committed before the fix at `97d8913`, then not modified by the fix: `1ac82e1` is a single-file commit), plus docs and workflow state. No drive-by refactor, rename, comment deletion or reformatting of untouched files. The test commit's matrix and generation-report revisions are TEST_WRITING artifacts for the B-1 loop-back.

## Non-blocking findings

- **N-1 (informational): raw `<` in FAQ prose is now a hard rejection.** The FAQ generation prompts (`task-faq.ts`, the FAQ translation variant in `task-c.ts`) do not tell the model to write a literal `<` as `&lt;` (the only `&lt;` mentions in `src/utils` are the new error text and unrelated image helpers). If a model writes a raw `<` in prose (for example "< 0.1 mm"), the output costs a repair attempt and, after the attempts, the FAQ is skipped. This is fail-closed, FR-9-conformant and not a rule violation, and the error detail ("use &lt; for a literal \"<\"") is handed to the repair loop. If this proves to cost real generations, a one-line prompt hint is the follow-up; it would need its own task, and for the Task C variant a section 9 stop. Not required by any AC.
- **N-2 (style, gate-reported nit, confirmed in the diff): missing space in `src/utils/faq-html.ts`.** `1ac82e1` rewrites the line as `const MARKDOWN_BOLD =/\*\*[^*\n]+\*\*/;` (no space after `=`); the pre-fix line was `const MARKDOWN_BOLD = /\*\*[^*\n]+\*\*/;`. The change to that line is a whitespace-only edit unrelated to B-1 and is the only inconsistent line in the file (every other `const X = /.../` has the space). Behaviour is identical and the gate (lint, tests, build) is green, so it does not block; it is a stray formatting change on a line the fix did not need to touch (section 7 item 8) and should be restored to `= /` the next time the file is edited.
- **N-3 (informational, carried from v2 N-1/N-3):** the unregistered-store fallback in `faqGenericRules` yields the raw task label, and `sourceLocale === 'uk-UA'` plus the Task C dispatch labels remain literals mirrored from the frozen description path (FR-12 same-dispatch). Neither is changed by B-1. The v2 N-2 note on the FR-21 NBSP assertion correction (`c62e30a`) also stands.

## Review-only checks (not caught by any command)

Rule 2 (Check 1); the judgment that the residual-`<` rejection does not conflict with FR-9, an AC or a fixture (the tests only pin the cases they list; they do not say whether a raw `<` in prose is wanted); the STORE_REGISTRY literal scan; the FROZEN approval records and same-commit re-baseline beyond arch-guard's checksum compare; prompt-caching separation; the whitespace-only style change on the `MARKDOWN_BOLD` line (lint passes it).

## Result

PASS. The B-1 fix is confined to `src/utils/faq-html.ts`, consistent with FR-9's five-element attribute-free allowlist, introduces no Rule 2, section 4, registry, caching, FROZEN or scope violation, and the residual-`<` rejection conflicts with no requirement, AC or fixture. This is a verdict, not human approval; the artifact stays DRAFT.
