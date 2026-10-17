---
artifact: security_review
story: US-8.1
version: 4
status: APPROVED
owner: so-security-reviewer
stage: SECURITY_REVIEW
created_at: 2026-10-14T22:55:00Z
updated_at: 2026-10-16T08:00:00Z
supersedes: docs/reviews/security/US-8.1-security-review.md#3
inputs_consumed:
  - {key: story, version: 3}
  - {key: specification, version: 3}
  - {key: implementation_report, version: 5}
  - {key: verification_report, version: 5}
---

# Security Review: US-8.1 Single master FAQ and standalone FAQ tool

- Story: US-8.1 | Stage: SECURITY_REVIEW | Skill: so-security-reviewer | Version: 4 (re-review of HEAD `ac62fe4`, after the v4 layout delta T14-T17) | Status: DRAFT
- Supersedes v3 (PASS, reviewed at `74c820e`; v3, v2 and v1 remain in git history; v1 was CHANGES_REQUIRED on B-1).
- Inputs: story v3, specification v3 (APPROVED), implementation_report v5, verification_report v5 (all current, none superseded), and the real diff (`git diff 74c820e..HEAD` for the delta since v3, `git diff 27b01b8..HEAD` for the sensitive-path scan), branch `feat/US-8.1-single-master-faq`.
- Verdict: **PASS** (0 blocking findings). B-1 remains **resolved**. Non-blocking N-1, N-2, N-3 and observations O-1..O-4 are unchanged. No new finding.

## What changed since v3

`git diff 74c820e..HEAD --name-only` outside `docs/` is exactly three files, nothing else:

| File | Change | Class |
|---|---|---|
| `src/app/app.component.html` | T16: the FAQ Supplemental Content `<app-source-input>` block moved from after Specs to directly after Product Name, and its `[label]` now binds `uiLabels().supplementalContentRequired` (was `supplementalContent`). T15: the empty-state guard `@if (appMode() !== 'generator' && ...)` gains `&& appMode() !== 'faq-generator'`. | template move + label key + one guard condition |
| `src/app/app.component.ts` | T14/T17: one new key `supplementalContentRequired` in each of the two `TRANSLATIONS` blocks (en: `'Supplemental Content (Required)'`, uk: `'Додатковий контент (Обов\'язково)'`) | two static string literals |
| `src/app/app.component.faq-layout.spec.ts` | new layout pin spec (485 lines) | test only |

`git diff 74c820e..HEAD --stat` restricted to `server/`, `.env.example`, `package.json`, `package-lock.json`, `.arch-guard-checksums`, `src/app/pipes/`, `src/utils/html-cleaner.ts`, `src/utils/output-validator.ts`, `src/prompts/`, `src/prompt-core/`, `src/services/`, `src/utils/`, `src/app/components/` is **empty**. So since v3 there is no production logic, server, prompt, proxy, sink, dependency or setting change, and the FAQ shape gate that closed B-1 (`src/utils/faq-html.ts`) is untouched.

### Delta-specific checks (each was run)

- **Label binding is an escaped text sink.** `source-input.component.html:4` renders the label as `{{ label }}` (Angular interpolation, auto-escaped); no `[innerHTML]`, no `safeHtml` pipe in that component. The new value is a compile-time string constant from `TRANSLATIONS`, not user, model or fetched content. No path from untrusted input to the label.
- **Moved input is wiring-identical.** `faqSupplementalContent` is still bound `[value]` / `(valueChange)` to the same signal (`app.component.ts:497`); its consumers (`:721`, `:974`) and the reset (`:1129`) are unchanged. The T16 move changes position only, no new read, write or sink for the pasted text. Pre-existing N-2 (pasted fields interpolated without fence or length cap) is therefore unchanged in scope.
- **Empty-state guard change narrows a placeholder block.** The `faq-generator` mode no longer shows the "no content yet" placeholder. It is a static icon plus the `noContentYet` label; no data, no handler, no sink. It does not alter what is rendered through the `safeHtml` pipe.
- **No new `bypassSecurityTrust*`.** `grep` over `src` (non-spec) finds exactly one: `src/app/pipes/safe-html.pipe.ts:14` (`bypassSecurityTrustHtml`). The pipe file is unchanged since v3 and since the branch base `27b01b8`.
- **New spec scanned.** Added lines of `app.component.faq-layout.spec.ts` searched for `https?://`, `api_key`, `secret`, `token`, `bearer`, `password`, `process.env`, `sk-`, `eval(`, `innerHTML`, `bypassSecurity`, `fetch(`, `child_process`. No URL, key, credential, env-secret read or DOM sink. The only hits are the benign `process.cwd()` and `readFileSync` (fixed in-repo path to the checked-in `app.component.html`/`.ts`, read as text) and the word "token" in a CSS class-token helper. The spec makes no network call and imports no production secret path. It is never imported by production code.
- **`.arch-guard-checksums`.** Empty diff since v3. The `27b01b8..HEAD` diff of that file is the already-recorded O-4 (FROZEN `task-c.ts` re-baseline under recorded section 9 grants), not new.
- **Editor schema.** `src/app/components/html-editor/` not touched; no widening.
- I did not re-run the vitest or build gate for this review (implementation_report v5 and the quality gate report own that evidence); the claims above are from reading the diff and files at HEAD.

## Surface-by-surface (all five re-asserted at HEAD `ac62fe4`)

1. **Secret containment (Rule 4): CLEAR.** No `server/**`, `.env.example`, `process.env` or key reference added since v3 (empty diff). The only new code is two static label strings, one template move/guard, and a spec with no secret-shaped literal. `.env.example` is current (no new setting, no value). `call-log.js` and `usage/store.js` untouched, so telemetry stays metadata only.
2. **DomSanitizer bypass: CLEAR, B-1 RESOLVED.** One `bypassSecurityTrustHtml`, unchanged. What reaches it is unchanged from v3: `item.answer` from `faqArtifacts`, written only by `storeFaq` after `buildFaqValidator` + `isFaqStorable`. The layout delta adds no new path into the pipe; the new label and the moved input do not touch it. `html-cleaner.ts` / `output-validator.ts` / `faq-html.ts` untouched, so nothing loosened. The B-1 fresh-evidence run in v3 (300,000-string campaign, 115 specs) stays valid because the gate source is byte-identical since then.
3. **Editor schema: CLEAR.** Not touched.
4. **Prompt injection: CLEAR with N-1, N-2 UNCHANGED non-blocking.** `src/prompts/**`, `src/prompt-core/**` and the orchestrator are unchanged since v3. No fetched-page content in the FAQ path; pasted fields and master stay in `userContent`; `systemBlocks` carry constant text only. The input reorder does not change what is sent.
5. **Proxy: CLEAR.** `server/**` untouched. Open `cors()` remains a pre-existing observation (O-1); no deployment, binding or origin change.

## Findings

| Id | Class | Introduced / pre-existing | Surface | Status vs v3 |
|---|---|---|---|---|
| B-1 | Blocking | Introduced | 2 | RESOLVED (`1ac82e1`), unchanged source at HEAD |
| N-1 | Non-blocking | Introduced | 4 | unchanged |
| N-2 | Non-blocking | Widening of an accepted pattern | 4 | unchanged |
| N-3 | Non-blocking | Introduced by the B-1 fix | 2 | unchanged, carried forward |
| O-1 | Observation | Pre-existing | 5 (open `cors()`) | unchanged |
| O-2 | Observation | Pre-existing pattern extended to FAQ-only runs | 5 (localStorage history) | unchanged |
| O-3 | Observation | Pre-existing | 2 (single `bypassSecurityTrustHtml`, by design) | unchanged |
| O-4 | Observation | Introduced, accepted | `.arch-guard-checksums` for FROZEN `task-c.ts`; approval recorded elsewhere | unchanged |

- **N-1** (poisoned master fans out to up to N-1 translation calls): wording-level content risk; markup half is gated fail-closed. Marketing-copy worst case.
- **N-2** (pasted fields interpolated without fence or length cap, second entry point): optional later hardening; FROZEN prompt files not to be touched for it.
- **N-3** (low): `PERMITTED_TAG` uses `\s`, wider than HTML whitespace, so a Unicode-space-padded tag such as `<b >` is accepted and an `<h3 >` question renders empty. No attribute, value or executable context is reachable (v3 campaign found none). Functional/contract gap only. Optional recommendation for the implementer: `[ \t\n\f\r]*` in `PERMITTED_TAG` and the `(?=[\s/>])` lookaheads with a regression case. Do not touch `html-cleaner.ts` or `output-validator.ts`.

Pre-existing, not this Story: history restore from `localStorage` (`seo_gen_history`) re-hydrates `faqArtifacts` without re-running the gate; exploiting it already requires same-origin script execution.

## Verdict

**PASS.** The layout delta (T14-T17) is a template reorder, a static label key in two locale blocks, one placeholder-guard condition and a test-only spec. It adds no secret, key, URL, sink, `bypassSecurityTrust*` call, server or prompt change, and does not widen the editor allow-list or what reaches the sanitizer bypass. B-1 stays closed. This PASS is not human approval.

## Verification Checklist

- [x] All five surfaces examined; each with a finding or an explicit "clear" (above).
- [x] Secret flow: no related file in the delta (`server/`, `.env.example`, `process.env` diff empty); added lines scanned for key/secret/URL literals.
- [x] `.env.example` current: no new setting.
- [x] What reaches `bypassSecurityTrustHtml` identified (`item.answer` via `storeFaq` after the gate); unchanged; the new label is a plain interpolation, not the pipe.
- [x] No new `bypassSecurityTrust*` call (one in non-spec source, `safe-html.pipe.ts:14`).
- [x] Editor schema / attribute allow-list not touched.
- [x] No fetched-page content in the FAQ path; pasted and master text in `userContent`, never `systemBlocks`.
- [x] Error responses and `server/**` untouched.
- [x] Usage telemetry remains metadata-only.
- [x] Each finding classed blocking / non-blocking / observation, introduced vs pre-existing separated.
- [x] Input artifacts are the current versions (story v3, specification v3 APPROVED, implementation_report v5, verification_report v5).
- [ ] Test suites were not re-run by this stage (read-only diff review); gate evidence belongs to the implementation and quality gate reports.
