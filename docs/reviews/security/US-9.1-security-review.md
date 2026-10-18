---
artifact: security_review
story: US-9.1
version: 1
status: DRAFT
owner: so-security-reviewer
stage: SECURITY_REVIEW
created_at: 2026-10-18T20:20:25Z
updated_at: 2026-10-18T20:20:25Z
supersedes: null
inputs_consumed:
  - {key: story, version: 4}
  - {key: specification, version: 5}
  - {key: implementation_report, version: 1}
  - {key: verification_report, version: 1}
open_decisions_blocking: false
---

# Security Review: US-9.1 No picture references and livelier descriptions (track prompt)

- Story: US-9.1 | Stage: SECURITY_REVIEW | Skill: so-security-reviewer | Version: 1
- Branch `feat/US-9.1-no-picture-references-and-livelier-descriptions`, HEAD `9d8b0c2`, BASE `6546db8`. Diff reviewed: `git diff 6546db8..HEAD` (88 files; 20 production files, the rest specs, fixtures, tools, docs).
- Inputs: story v4, specification v5, implementation_report v1, verification_report v1 (all current, none superseded).
- Verdict: **PASS** (0 blocking findings, 3 non-blocking, 4 observations). This PASS is not human approval.

## Sensitive-path scan (each was run)

| Check | Result |
|---|---|
| `git diff --stat 6546db8..HEAD -- server package.json package-lock.json .env.example src/utils/html-cleaner.ts src/app/pipes src/app/components/html-editor` | **empty**. `server/**`, dependencies, `.env.example`, the sanitizer, the SafeHtml pipe and the TipTap editor are byte-identical to BASE. |
| Added lines (non-docs) grepped for `bypassSecurityTrust`, `process.env`, `API_KEY`, `innerHTML`, `fetch(` | no hit in production code. The only `localStorage` hits are inside spec text and docs. |
| Added lines (non-docs) grepped for key shapes (`sk-ant-`, `sk-...20+`, `AIza...`, `Bearer ...`, `API_KEY=...`) | **no match**. |
| `operatorNotes` / `Operator Notes` grep over `server/` and `src/` non-spec | only `app.component.ts`, `operator-notes-form-state.ts`, `types.ts`, `prompts/operator-notes.ts`, `prompts/task-a.ts`, `content-orchestrator.service.ts` (one line in `numericFidelitySources`). Nothing in `server/`. |
| `bypassSecurityTrust*` in non-spec source | unchanged: exactly one, `safe-html.pipe.ts` (not in the diff). |

## Surface 1: Secret containment (Rule 4) - CLEAR

- No `server/**`, `.env.example`, `process.env` or key reference added. `.env.example` is current: no new setting was introduced, so no update was owed.
- New code is pure `src/**` string and signal logic. The four notes travel `OperatorNotesFormState` -> `ProductInput.operatorNotes` -> `buildPromptA` `userContent` -> existing `/api` proxy call. No key, config object or API-response field is read into any new code path.
- `server/utils/call-log.js` formats provider, model, slot, elapsed time and usage counters only (read in full; untouched). `server/usage/store.js` untouched. The notes are not added to any log line or usage row: nothing in `server/` names them, and the proxy sees them only as part of the already-existing request body.

## Surface 2: DomSanitizer bypass - CLEAR

- What reaches `safeHtml` in this change: the same thing as before, the post-validation generated HTML. The notes never reach a template: the only template touch is `<textarea [value]="values()[key]">` (a value binding, not HTML) and `{{ labels()[key] }}` (escaped interpolation of a compile-time label constant). No `[innerHTML]`, no pipe.
- A free-text note can only influence the page indirectly, by steering the model, and the model output goes through the unchanged `html-cleaner.ts` and `output-validator.ts` path. `output-validator.ts` changed by exactly two things: a reworded `image-manifest-missing` detail string and one added `warning`-severity call `imageDeixisIssues(doc, locale, context)`. Nothing was removed or loosened; the added check is read-only on the parsed `doc` and emits issues, it does not mutate or pass content on.
- No new `bypassSecurityTrust*` call. Single existing one unchanged.

## Surface 3: Untrusted HTML in the editor - CLEAR

`src/app/components/html-editor/` and `extensions/attr-helpers.ts` are untouched. No tag, node or attribute was added to any allow-list. The notes are plain text in a prompt and never enter the editor's input model.

## Surface 4: Prompt injection / untrusted text into a prompt - CLEAR with N-1, N-2

- **Where the notes land.** `buildOperatorNotesBlock` is interpolated into `userContent` of `buildPromptA` (`task-a.ts:168`), beside `[Supplemental Content]` and `[Custom Instructions]`. `systemBlocks` (`MASTER_SYSTEM_PROMPT`, `TASK_A_INSTRUCTION`, the two ToV overlays) carry only static text. Verified by reading the return value of `buildPromptA`: notes are not in `systemBlocks`, so they are not cached as instructions and cannot become part of the cached prefix.
- **New cached constants are static.** `NO_IMAGE_DEIXIS_RULE` and `LIVELINESS_RULES` are template literals with no `${}` interpolation of any input, store or run value; the master change adds only literal text and those two constants. The cached prefix gains no injectable channel.
- **Trust model.** The notes are typed by the operator of this tool, not fetched from a third party; unlike the Serper/RetrievalService path they are not third-party-authored. No retrieval code or fetch scope changed (`RetrievalService` and `content-orchestrator` retrieval calls untouched; the one orchestrator edit adds the notes to `numericFidelitySources` so typed numbers count as grounded, plus two reworded warning strings).
- **N-1 (non-blocking, matches accepted pattern): no fence and no length cap.** Each value is trimmed and joined as `Label: value` lines under `[Operator Notes]`. A value containing a newline followed by, for example, `[Official Brand]: ...` or `[Raw Description]: ...` can visually imitate a sibling block, and the textareas have no `maxlength`. This is the same accepted behaviour as pre-existing `supplementalContent` and `customInstructions` (recorded as N-2 in the US-8.1 review). The worst case is wrong marketing copy chosen by the person who typed it; the output is still validated and sanitised downstream. Optional later hardening, not a blocker: a per-field length cap and a one-line "treat as data" instruction in a non-frozen location. `task-a.ts` and the master are FROZEN, so this is a plan decision, not something to patch here.
- **N-2 (non-blocking, widening of an accepted surface): number grounding trusts the notes.** `numericFidelitySources` now treats operator-typed numbers as sanctioned source (FR-30, OD-20(2)). That is by design and means the numeric-fidelity guard will not flag a wrong number the operator typed. It is an integrity trade-off, not a confidentiality issue.

## Surface 5: Proxy, error surface and telemetry - CLEAR

- `server/**` is unchanged (empty diff), so CORS (still open `cors()`, pre-existing O-1), `describe-error.js`, `call-log.js` and `usage/store.js` behave as before. No deployment, binding or origin handling changed.
- Telemetry stays metadata-only. The new data (the notes) is not read by any server file.

## Additional requested checks

### Browser-visible bundle and persistence of the notes

- Nothing secret reaches the bundle: no `process.env`, key or server config in the new files (scan above).
- **localStorage persistence (N-3, non-blocking).** `ProductInput` is stored whole in `HistoryItem.input`, and `HistoryService` writes the history array to `localStorage` key `seo_gen_history` (`history.service.ts:27`, unchanged). So a populated `operatorNotes` (test results, limitations, comparisons that may be internal commercial facts) is now persisted in the browser in clear text, exactly like `supplementalContent` and `customInstructions` already are, and is restored by `restoreHistory` (`operatorNotesState.restore`). Same-origin script execution is already required to read it, and the product has no multi-user surface, so this is class non-blocking: a new field of an accepted storage pattern, not a new store. Operators should be told not to type confidential material that must not sit in browser storage; `Clear All` clears the form fields but, as before, not the history.
- **Notes reaching a SafeHtml sink or TipTap-editable HTML:** no. Verified above; the notes are never rendered, they only enter a prompt. A restored history item puts them back into the textareas only (`[value]` binding).

### Image-deixis detector and validator: regex DoS (ReDoS)

Read every pattern in `src/utils/image-deixis.ts` (7 languages, 5 to 6 patterns each) and then ran them against hostile inputs under Node v24.15.0. Structure:

- All patterns are built from alternations of literal words with `\p{L}*`/`\p{L}+` tails, anchored by `(?<!\p{L})` and `(?!\p{L})`. The `\p{L}*` stem tail is followed by a lookahead that can only fail on a letter, which the greedy tail has already consumed, so there is no backtracking into it.
- The only repeated group is `(?:\p{L}+\s+)?` (optional, once) between a picture noun and a show verb, and the German `(?:\p{L}+\s+){0,8}?zu\s+sehen`, which is **bounded to 8** repetitions and whose iterations are separated by mandatory `\s+`, so it cannot split one run of letters in two ways. No `(a+)+`, `(a|a)*` or unbounded nested quantifier exists. Worst case is polynomial with a small degree, not exponential.
- **Empirical run.** For all 7 languages, with 7 adversarial shapes (random keyword soup, 80k-character single letter run, repeated sentence starts `. на `, `ist wort ` x 9k, 80k whitespace run, repeated picture nouns), at input lengths 20,000 and 80,000 characters, **no case exceeded 50 ms**. The script output `done` with no slow-case line. (Script lived in the scratchpad, not the repo; no repo file was written for it.)
- `description-metrics.ts` regexes (`/\s+/gu`, `/(?<=[.!?…])\s+(?=[\p{Lu}\d«"])/u`, `NUMBER_RE`, `/[\p{L}\p{N}]/u`) are linear (single quantifier, no nesting; `NUMBER_RE`'s `(?:[ ]\d{3})*` is separated by mandatory space and fixed-width digits).
- Both detectors take only model output or operator text and never throw (try/catch around the walk), so a hostile string cannot crash the validator. The detector adds `warning`-severity issues only; they never enter the repair loop, so a crafted output cannot force extra model calls through it.
- Observation O-1: the detector runs on whole carrier texts without a length cap. At the measured speeds this is not a practical problem; not worth a finding.

### `tools/measure-description.ts`

- **No network, no secrets.** The only imports are `node:fs` `readFileSync`, `linkedom` and two leaf modules under `src/utils/`. No `fetch`, `http`, `child_process` or `process.env` read. Grep confirmed.
- **Path handling.** Eight flags take a file path, read verbatim with `readFileSync` (no concatenation, no shell, no glob). It reads whatever path the invoking user names; there is no confinement and none is needed for a local CLI run by the same user. Error output echoes the path and the OS message (`JSON.stringify`d), no file content. **O-2 (observation):** if this script were ever wired to untrusted file names (CI on a pull request, a web endpoint), the path arguments would become a read primitive. Today they are not.
- **Untrusted HTML parsing.** `linkedom` (already in `package.json` at `^0.18.12`, so no dependency change) parses the generated HTML into an inert DOM. It does not execute scripts, load subresources or follow URLs. The script only reads `textContent`/`alt`. The wrapper is a plain string concatenation inside `<body>` for the parser, never written back anywhere. The `package.json` and lockfile diff is empty.
- Exit statuses and the first output line (`process.version`) disclose only the Node version.

### Baseline fixtures copied from git-ignored `Knowledge/`

`/Knowledge/` is git-ignored (`.gitignore:27`); the three files were copied into tracked `test/fixtures/baseline/`. Inspected all three:

- `creality-pika-uk-v2.html` (39 KB) and `description_uk-UA.html` (42 KB): generated Ukrainian storefront product copy for Creality Pika. Content: product prose, spec tables, 18 image URLs on the public `impresora-3d.es` catalog, one YouTube embed id, six HTML comments with section names. **Zero** `<script>`, `onerror=`, `onload=`, `javascript:`; no email, phone number, key, token, internal host, absolute local path or customer data. Public-facing marketing copy.
- `prompt-changes.spec.md` (24 KB, Ukrainian): the internal change-planning document for this Story (rule table, file names, FR list, dates). It names repository file paths and prompt phrases only. No credential, no customer data, no internal-only commercial figure. It contains no secret, but it is internal design discussion now committed to a tracked directory.
- A key-shape grep across all changed non-doc files found nothing.
- **O-3 (observation):** none of the three files is imported by any spec or source (`grep 'baseline/'` over `src test tools` is empty), so they are inert reference material in the repo. Because they bypass the "Knowledge/ is local only" convention, the owner should consciously accept that the internal planning doc is now in git history. No change requested.

## Findings

| Id | Class | Introduced / pre-existing | Surface | Summary |
|---|---|---|---|---|
| N-1 | Non-blocking | Widening of an accepted pattern | 4 | Operator notes interpolated into `userContent` without fence or length cap; same as `supplementalContent`/`customInstructions` |
| N-2 | Non-blocking | Introduced, by design (FR-30) | 4 | Operator-typed numbers are treated as grounded; the numeric guard will not catch a wrong operator number |
| N-3 | Non-blocking | New field of an accepted store | persistence | `operatorNotes` is saved to `localStorage` `seo_gen_history` in clear text and restored from it |
| O-1 | Observation | Pre-existing | 5 | `cors()` has no origin restriction (local dev proxy); this change does not touch binding or deployment |
| O-2 | Observation | Introduced, benign | CLI | `measure-description.ts` reads any caller-named path; fine for a local CLI, would matter only if exposed |
| O-3 | Observation | Introduced, benign | fixtures | Three baseline files from git-ignored `Knowledge/` now tracked; no secret or customer data; one is an internal planning doc; unreferenced by code |
| O-4 | Observation | Pre-existing | 2 | Single `bypassSecurityTrustHtml` by design; unchanged |

Nothing in this change (a) lets a secret escape the server, (b) lets non-pipeline content reach the sanitizer bypass, or (c) puts fetched-page content into `systemBlocks`. No Blocking finding.

Out of scope for this stage, noted for the orchestrator only: `.arch-guard-checksums` re-baselined four FROZEN files (`task-a.ts`, `master-system-prompt.ts`, `output-validator.ts`; the commit messages say owner-approved). Approval recording is the verifier's lane (verification_report v1 covers it), not a security finding here.

## Verdict

**PASS.** The change is prompt text, a pure detector, an extra read-only validator warning, one new form with escaped bindings, and a local CLI. Server, dependencies, sanitizer, SafeHtml pipe and editor schema are untouched; no secret-shaped literal was added; the detector is not ReDoS-prone (measured, not only read); the notes stay in `userContent` and in browser history storage. The three non-blocking items are accepted-pattern widenings the implementer need not change for this Story.

## Verification Checklist

- [x] All five surfaces examined, each with a finding or an explicit "clear".
- [x] Secret flow traced through the notes path and the proxy request body, not only grepped for literals; key-shape grep also run.
- [x] `.env.example` current: no new setting, no value.
- [x] What reaches `bypassSecurityTrustHtml` identified: unchanged post-validation generated HTML; the notes never reach it.
- [x] No new `bypassSecurityTrust*` call.
- [x] Editor schema / attribute allow-list untouched.
- [x] Notes are in `userContent`, never in `systemBlocks`; new cached constants are static. No fetched-page change.
- [x] `server/**` untouched, so error responses unchanged; no stack/upstream-URL/provider-body path added.
- [x] Usage telemetry remains metadata-only (`call-log.js` read; `usage/store.js` untouched).
- [x] Each finding classed blocking / non-blocking / observation, introduced vs pre-existing separated.
- [x] Input artifacts are current versions (story v4, specification v5, implementation_report v1, verification_report v1).
- [ ] Test suites not re-run by this stage (read-only diff review plus a scratchpad ReDoS timing run); gate evidence belongs to the quality-gate and implementation reports.
