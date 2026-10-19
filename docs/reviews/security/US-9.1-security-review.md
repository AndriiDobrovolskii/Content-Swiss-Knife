---
artifact: security_review
story: US-9.1
version: 3
status: APPROVED
owner: so-security-reviewer
stage: SECURITY_REVIEW
created_at: 2026-10-19T16:50:00Z
updated_at: 2026-10-19T16:50:00Z
supersedes: docs/reviews/security/US-9.1-security-review.md#2
inputs_consumed:
  - {key: story, version: 6}
  - {key: specification, version: 8}
  - {key: implementation_report, version: 3}
  - {key: verification_report, version: 3}
open_decisions_blocking: false
---

# Security Review: US-9.1 No picture references and livelier descriptions (track prompt), operator-notes removal, round 3 (after the AC-11/AC-12 waiver)

- Story: US-9.1 | Stage: SECURITY_REVIEW | Skill: so-security-reviewer | Version: 3 (supersedes v2).
- Branch `feat/US-9.1-no-picture-references-and-livelier-descriptions`, HEAD `313f727`.
- Why a new version: Story v6 and Specification v8 change only the acceptance status of AC-11 and AC-12 (WAIVED by the owner, 2026-10-19, "not measured"). Implementation_report v3 and verification_report v3 are record refreshes. No code changed.
- Verdict: **PASS** (0 blocking, 1 non-blocking, 4 observations, plus one stated coverage limit, L-1). This PASS is not human approval.

## What was re-checked in this round (each command was run)

| Check | Result |
|---|---|
| `git diff 313f727 --stat -- . ':!docs'` (working tree vs HEAD, non-doc) | **empty**. `git status --short` outside `docs/` is also empty. The non-doc tree is byte-identical to what v2 examined. |
| `git diff --stat 09f87dc..HEAD -- server package.json package-lock.json .env.example src/utils/html-cleaner.ts src/app/pipes src/app/components/html-editor src/utils/output-validator.ts angular.json tsconfig.json vite.config.ts` | **empty**. Proxy, dependencies, env template, sanitizer, SafeHtml pipe, editor schema and validator are unchanged since `09f87dc`. |
| `src/services/history.service.ts`, `src/services/retrieval.service.ts` in `09f87dc..HEAD` | **not in the diff**. `content-orchestrator.service.ts`: 6 deletions, no addition. |
| Added lines outside `docs/` and outside `*.spec.ts` grepped for `bypassSecurityTrust`, `process.env`, `API_KEY`, `innerHTML`, `fetch(`, `localStorage`, `eval(`, `new Function`, `sk-ant-`, `sk-` + 20 chars, `AIza`, `Bearer ` | **no match**. |
| Added lines including specs and fixtures grepped for key shapes, `API_KEY`, `password`, `secret` | **no match**. |
| `bypassSecurityTrust*` in non-spec `src/` | exactly one, `src/app/pipes/safe-html.pipe.ts:14` (not in the diff). |
| `operator[ _-]?notes?` in non-spec `src/`, `server/`, `tools/` (ts, js, html) | zero files. |
| Whole-input serialisation (`JSON.stringify(input...)`, `Object.entries/values/keys(input...)`) in non-spec `src/` | zero hits, so a stray stored key cannot ride into a prompt by enumeration. |
| Pin specs re-run: `test/operator-notes-source-scan.spec.ts`, `history.service.legacy-entry.spec.ts`, `content-orchestrator.stray-operator-notes.spec.ts`, `app.component.no-operator-notes.spec.ts` | 4 files, **61 tests passed** (vitest, 6.4 s). |

Correction to v2: its header cited "39 files, 865 insertions, 1787 deletions" for the non-doc diff. That figure is the whole `09f87dc..HEAD` diff including `docs/`. The non-doc diff is 38 files, 752 insertions, 1773 deletions (checked this round; `1b73c8a^..86b0d62` gives the same 38/752/1773). No conclusion of v2 depends on the figure.

## The five surfaces

1. **Secret containment: CLEAR.** No `server/**`, `.env.example`, `process.env` or key reference touched; no new setting, so no `.env.example` update owed. No log line, `call-log` field or usage-database column added. No key-shaped string in source, specs, fixtures or the golden.
2. **DomSanitizer bypass: CLEAR.** Same inputs reach `safeHtml` as before (post-validation generated HTML, plus history-restored output, O-3). One template element was removed, none added; no new `bypassSecurityTrust*`; `html-cleaner.ts`, `output-validator.ts` and the pipe are untouched.
3. **Editor schema: CLEAR.** `src/app/components/html-editor/` and `attr-helpers.ts` untouched.
4. **Prompt injection: CLEAR (narrowed).** The free-text operator-notes channel into `userContent` is deleted; nothing was added to `systemBlocks`; `RetrievalService` and every fetch scope are untouched, so fetched pages still land where they did before. A stored `operatorNotes` never reaches a prompt (generation input is built fresh from form signals; prompt builders enumerate fields explicitly; no whole-object serialisation; pinned by the passing stray-property spec). `supplementalContent` and `customInstructions` are unchanged (O-4).
5. **Proxy, errors, telemetry: CLEAR.** `server/**` diff is empty: CORS, `describe-error.js`, `call-log.js`, `usage/store.js` unchanged; no deployment, binding or origin change.

## Does the waiver change anything on the attack surface?

No. The waiver alters the acceptance status of two measurement criteria; it adds, removes or alters no code, prompt, dependency, endpoint or stored field (non-doc tree identical to v2). The v2 conclusions therefore carry over unchanged.

## Coverage limit created by the waiver (L-1, not a finding)

AC-11/AC-12 were the only planned occasion on which live model output would have been produced for the final prompt. They are waived, so **no live generated output exists for the post-removal prompt, and this review did not and could not inspect any**. What that leaves unreviewed:

- Whether real model output, produced from real Serper-fetched pages and operator `supplementalContent`/`customInstructions`, ever contains injected or unsafe content (script-bearing or `on*`-attribute markup, `javascript:` or `data:` URLs, unexpected external links, text that obeys an instruction hidden in a fetched page). This review rests on the static argument that every generated string passes `html-cleaner.ts` and the validator before `safeHtml`, and on their unit tests; it did not observe them on live output.
- Whether prompt-injection text in a fetched page actually steers the final prompt's output (no adversarial run, with or without the removal; the pre-existing risk in O-4 and the retrieval path stays untested at runtime by this Story).
- Whether the final prompt text's wording change (master `[SOURCE FIDELITY]` bullets returned to the `6546db8` text) behaves safely with real inputs; only golden/text pins cover it.
- The owner's "manual testing" is not evidence available to this review (no run count, products or output recorded; verification_report v3 F3).

Severity: the worst case for this product remains silently wrong marketing copy, not an action or a secret escape, and the sanitizer bypass is unchanged, so this is a recorded limit and does not block. If the owner wants runtime assurance of the unsafe-content surface, a single live generation inspected for the items above would close it; that is outside this Story.

## Findings (v2 findings re-confirmed)

| Id | Class | Introduced / pre-existing | Status in this round |
|---|---|---|---|
| N-1 | Non-blocking | Residual of a feature this change removes; not widened | **Holds.** `HistoryService` is not in the diff; it still `JSON.parse`s `seo_gen_history`, keeps the first 20 items, with no per-item shape check, and the `effect()` re-persists the whole array, so a legacy `operatorNotes` key stays in clear text in `localStorage` until rotation or `Clear History`. It is never read (zero non-spec hits), never reaches a prompt or template (`restoreHistory` copies named fields only; history templates render `item.input.name` and `item.input.website.name` through escaped interpolation); `history.service.legacy-entry.spec.ts` passes. NFR-13 forbids a migration. Optional PR-note: operators who typed confidential material can use `Clear History`. |
| O-1 | Observation | Pre-existing | **Holds.** `cors()` has no origin restriction; binding and deployment untouched. |
| O-2 | Observation | Pre-existing | **Holds.** Unchecked `localStorage` parse; stray key inert; availability-only issue for a same-origin attacker. |
| O-3 | Observation | Pre-existing | **Holds.** Stored `item.output` is restored and rendered via the single `bypassSecurityTrustHtml`; requires same-origin script, no privilege gained; unchanged. |
| O-4 | Observation | Pre-existing | **Holds.** `supplementalContent` and `customInstructions` remain unfenced, uncapped free text in `userContent` (accepted pattern); the operator-notes sibling is gone. |

Nothing in the delivered diff `09f87dc..HEAD` (a) lets a secret escape the server, (b) lets non-pipeline content reach the sanitizer bypass, or (c) puts fetched-page content into `systemBlocks`. No blocking finding; no surface widened.

## Verdict

**PASS.** Attack surface is unchanged since v2 and smaller than at `09f87dc`; the waiver is a record change that leaves it untouched. Limit L-1 is stated above: no live output was reviewed.

## Verification Checklist

- [x] All five surfaces examined, each with a finding or an explicit "clear".
- [x] Secret flow traced (removal adds no secret-bearing path; key-shape grep over source, specs, fixtures found nothing).
- [x] `.env.example` current: unchanged, no new setting, placeholders only.
- [x] What reaches `bypassSecurityTrustHtml` identified: unchanged post-validation generated HTML (plus history-restored output, O-3).
- [x] No new `bypassSecurityTrust*` call (one, pre-existing, `safe-html.pipe.ts:14`).
- [x] Editor schema / attribute allow-list untouched.
- [x] Fetched-page content: no retrieval change; nothing added to `systemBlocks`; notes channel removed.
- [x] Error responses unchanged (`server/**` empty diff).
- [x] Usage telemetry remains metadata-only (`server/usage/store.js`, `call-log.js` untouched).
- [x] Each finding classed; introduced vs pre-existing separated.
- [x] Input artifacts are current versions (story v6, specification v8, implementation_report v3, verification_report v3).
- [ ] Live generated output was not reviewed (AC-11/AC-12 waived, L-1). Full gate not re-run by this stage; only the four pin specs listed above were run.
