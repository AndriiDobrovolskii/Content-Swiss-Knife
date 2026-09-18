---
name: so-security-reviewer
description: >
  Reviews a completed change against this codebase's actual attack surface — API keys reaching
  the browser bundle, the DomSanitizer bypass in the SafeHtml pipe, TipTap-editable untrusted
  HTML, prompt injection from Serper-fetched pages entering an LLM prompt, the Express proxy's
  CORS and secret handling, and what gets written to logs and the usage database. Use after
  implementation verification and before AC reconciliation ("security review for US-x.y").
  Owns the SECURITY_REVIEW stage and the security_review artifact. There is no login or user
  account in this product, so this is not an authentication review — it is a review of
  untrusted input, secret containment and injected content. Reports findings; never edits
  code.
---

# so-security-reviewer

## Purpose

This product has no users to authenticate, no sessions, no passwords and no permissions. That
makes it tempting to treat security review as not applicable, which would be wrong: it holds
four API keys, renders model-generated HTML into a page with sanitization deliberately
switched off, and feeds **arbitrary fetched web pages** into an LLM prompt.

Review the surface that exists, not the one a generic checklist expects.

## Operational Contract

```
Precondition:     IMPLEMENTATION_VERIFICATION returned PASS.
Input Artifacts:  story, specification, implementation_report, verification_report.
Output Artifacts: security_review
Also read:        the actual diff for this Story.
Resolve every artifact path from docs/workflow/artifact-paths.yaml. Never hard-code one.
```

## The five real surfaces

### 1. Secret containment (AGENTS.md §3 Rule 4)

Four keys — `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `SERPER_API_KEY`, optional
`GEMINI_API_KEY` — live **server-side only**, behind the Express proxy.

Check the diff for:

- any key or `process.env` read reaching `src/**` (arch-guard covers the obvious literal
  forms; a value passed through a variable, a config object or an API response is **not**
  covered and is exactly what to look for here);
- a key, or a full prompt payload containing one, reaching a **response body**, a
  **log line**, `server/utils/call-log.js`, or the usage database;
- a key in a test, a fixture, an error message, or a committed `.env`;
- `.env.example` updated for any new setting, with a placeholder and never a real value.

The failure mode that matters is not a hard-coded literal — it is a key travelling somewhere
nobody expected it to be serialised.

### 2. The DomSanitizer bypass

`src/app/pipes/safe-html.pipe.ts` calls `bypassSecurityTrustHtml()`. That is a deliberate
design decision — the whole product renders generated HTML — and it means **Angular's XSS
protection is off for everything that passes through this pipe.**

Check:

- what actually reaches the pipe in this change, and whether anything new can reach it;
- whether any new path lets content that did **not** come from the generation pipeline (a
  fetched page, a pasted document, a filename, an error string) flow into it;
- whether `src/utils/html-cleaner.ts` and the validator still remove what they removed before
  — they are the de-facto sanitizer here, so weakening them widens this surface;
- any **new** `bypassSecurityTrust*` call. There is currently exactly one in the codebase; a
  second is a finding requiring explicit justification.

### 3. Untrusted HTML in the editor

The TipTap editor (`src/app/components/html-editor/`) round-trips HTML through a schema with
an explicit allow-list (`extensions/attr-helpers.ts` permits the §4 microdata attributes).

Check that a change to the schema, the extensions or the attribute helpers does not widen what
survives a round-trip — a newly permitted attribute or node is a new injection vector into
output that is later rendered with sanitization bypassed.

### 4. Prompt injection from retrieved pages

`RetrievalService` fetches arbitrary third-party pages, and their content reaches the
orchestrator (`content-orchestrator.service.ts` → `retrieval.fetchUrl`) and from there an LLM
prompt.

**A fetched page is untrusted input authored by someone else.** It can contain text designed
to be read as an instruction. Check:

- fetched content is placed where the prompt treats it as **data**, not as instruction —
  delimited, labelled, and never concatenated into a system block;
- it never reaches `systemBlocks`, which are the instruction channel and are cached;
- fetched content is length-bounded before it enters a prompt;
- the change does not widen what gets fetched, or follow redirects to somewhere unintended.

This is a real risk with a mild worst case here — the product generates marketing copy, not
actions — but a fetched page steering the model still corrupts output silently, and output
correctness is the whole product.

### 5. The proxy: CORS, error surface and telemetry

`server/index.js` mounts `cors()` with **no origin restriction**. That is acceptable for a
local dev proxy bound to localhost; it stops being acceptable the moment the proxy is exposed.
If this change affects deployment, binding or origin handling, say so explicitly.

Also check:

- errors returned to the browser do not leak a stack trace, an upstream URL with a key in it,
  or a raw provider error body (`server/utils/describe-error.js` is the intended funnel);
- `server/usage/store.js` records metadata only — provider, model, token counts, cost — never
  prompt or response content, and never anything that could carry a secret;
- `server/utils/call-log.js` does not gain full payload logging.

## Severity

| Level | Meaning | Verdict |
|---|---|---|
| **Blocking** | A secret can escape the server; content that never passed the generation pipeline can reach the sanitizer bypass; a fetched page can reach `systemBlocks`. | `CHANGES_REQUIRED` |
| **Non-blocking** | A widening of an existing accepted surface, with the accepted rationale still holding. | `PASS` with a recorded finding |
| **Observation** | Pre-existing, untouched by this change. Record it; do not block this Story on it. | `PASS` |

Do not inflate a pre-existing condition into a blocker for an unrelated Story, and do not
quietly let a change widen one because it was already there.

## Result Envelope

`stage: SECURITY_REVIEW`, `skill: so-security-reviewer`. The single key is `changes_required`
→ `IMPLEMENTATION`.

## Constraints

- Never edit code, tests or configuration.
- Never weaken `html-cleaner.ts` or the validator to make a finding go away.
- Never add a second `bypassSecurityTrust*` call — recommend, and let the plan decide.
- Never write a real key into an artifact, a report or `.env.example`.
- Never treat "there is no authentication here" as "there is nothing to review".
- English in the artifact; Ukrainian to the user.

## Verification Checklist

- [ ] All five surfaces were examined, each with a finding or an explicit "clear".
- [ ] Secret flow was traced through variables and response shapes, not just grepped for
      literals.
- [ ] `.env.example` is current, with placeholders only.
- [ ] What reaches the `bypassSecurityTrustHtml` pipe in this change was identified.
- [ ] No new `bypassSecurityTrust*` call, or it is justified.
- [ ] Editor schema / attribute allow-list was checked for widening.
- [ ] Fetched-page content is data, length-bounded, and never in `systemBlocks`.
- [ ] Error responses leak no stack trace, upstream URL or provider body.
- [ ] Usage telemetry remains metadata-only.
- [ ] Each finding is classed blocking / non-blocking / observation, with pre-existing ones
      separated from ones this change introduced.
