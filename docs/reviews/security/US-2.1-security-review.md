---
artifact: security_review
story: US-2.1
version: 3
supersedes: docs/reviews/security/US-2.1-security-review.md@v2
status: APPROVED
owner: so-security-reviewer
created_at: 2026-09-21T00:00:00Z
updated_at: 2026-09-21T11:05:00Z
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 2
  - key: implementation_report
    version: 3
  - key: verification_report
    version: 3
diff_reviewed: main...HEAD at 53a8f29 (merge-base equals main 64e7b48; v2 reviewed c8d91fa; since then only test-only 2ddecf7 and docs, re-checked)
verdict: PASS
---

# Security review - US-2.1 (migrate descriptions to v4 schemas)

v3 re-check at 53a8f29: `git diff main...HEAD` for `server/**`, `src/app/**`, `.env.example` and `html-cleaner.ts` is empty; a grep of added non-test source lines for `process.env`, `API_KEY`, `console.`, `fetch(`, `bypassSecurity`, `innerHTML`, `systemBlocks` returned no hit. Commit 2ddecf7 adds spec files only. All five surfaces remain clear; the conclusions below stand.

Scope: the `main...HEAD` diff (48 files). It touches `src/domain`, `src/prompt-core`, `src/prompts`,
`src/render`, `src/services/content-orchestrator.service.ts`, `src/utils/number-format-fixer.ts`,
`src/utils/seo-number-format.ts`, tests, fixtures and docs. It touches **nothing** under `server/**`,
`src/app/**`, `.env.example` or `src/utils/html-cleaner.ts` (verified with `git diff --stat main...HEAD`
on those paths: empty).

## Surface 1 - Secret containment: clear
- Grep of the added lines for `process.env`, `API_KEY`, `console.` and `fetch` found no code hit; the
  matches were spec/plan prose only.
- No key, config object or response shape is added. `selectHookPattern` takes only `name` and website name.
- No new setting, so `.env.example` needs no entry (and this branch does not change it).

## Surface 2 - DomSanitizer bypass: clear
- No `bypassSecurityTrust*` added; `safe-html.pipe.ts` is untouched.
- What reaches the pipe: the same renderer output as before. The new `renderKeyBenefitsV4` escapes
  `label`/`value`/`lead`/`heading` with `esc()` and runs `why`/`text` through `prose()`, the same treatment the
  v3 path applied. The CTA heading in v4 is a code-assembled per-locale string
  (`getRenderRules().ctaHeading`), not model output, and `packageContents.heading` is escaped and constrained
  to two fixed strings by the schema. No new content source (fetched page, filename, error string) flows in.
- `html-cleaner.ts` and the validator are unchanged, so the de-facto sanitizer is not weakened. The new
  schema refinements (`keyBenefits` must be bullets, at most 8 merged items, hook start `<b>..</b> - `) only
  narrow what is accepted.

## Surface 3 - TipTap editor: clear
- No change to `html-editor/` schema, extensions or `attr-helpers.ts`. Output shape gains no new
  tag/attribute (`<ol>` for package contents is an existing tag, not an editor-schema change).

## Surface 4 - Prompt injection: clear
- The hook-pattern instruction is a static constant chosen by a pure FNV-1a hash of product name + store name;
  no network, no fetched content. It is placed in `userContent` only. `systemBlocks[0]` and the task
  template are unchanged in structure (spec NFR-1 and the `task-a-doc` tests assert identical
  `systemBlocks` across products). No fetched page reaches `systemBlocks`; no fetch surface widened
  (`RetrievalService` untouched).
- Note: `input.name` is user-supplied but is only hashed, never interpolated into the instruction.

## Surface 5 - Proxy, errors, telemetry: clear for US-2.1
- No US-2.1 commit touches `server/**`, `describe-error.js`, `call-log.js` or `usage/store.js`.
  Telemetry stays metadata-only; no new logging.

## Finding for the human (outside US-2.1, working tree only) - NOT part of this verdict
**F1 - Staged US-1.1 CORS rollback (non-blocking for US-2.1; needs a human decision; re-confirmed present in the working tree at v3).**
The working tree has uncommitted/staged changes that delete `server/cors-policy.js`,
`test/cors-policy.spec.ts` and the US-1.1 docs, and change `server/index.js` from
`cors({ origin: corsOriginPolicy(resolveAllowedOrigins(process.env.ALLOWED_ORIGINS)) })` to a bare `cors()`
(also removing the `ALLOWED_ORIGINS` block from `.env.example`). Effect: the proxy answers any browser origin
again, and the proxy holds four provider API keys and accepts 50mb bodies, so any web page a user visits
can drive it if it is reachable (localhost or otherwise). Acceptable only for a localhost-bound dev
proxy; it is a regression of the origin allowlist US-1.1 delivered. It is in no US-2.1 commit, so it does
not block this Story. Recommend confirming it is intentional, or restoring the staged deletions
(`git restore --staged --worktree` on those paths) before any commit or PR from this branch, so it does not
ride into the US-2.1 PR by accident.

## Observations (pre-existing, untouched)
- Single `bypassSecurityTrustHtml` in `safe-html.pipe.ts` remains the only one.
- `express.json({ limit: '50mb' })` and unrestricted CORS in `main` before US-1.1; see F1.

## Verdict
PASS. No blocking or non-blocking findings inside the US-2.1 diff.
