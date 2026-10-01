---
story: US-4.1
artifact: security_review
version: 2
supersedes: docs/reviews/security/US-4.1-security-review.md@v1
status: ARCHIVED
stage: SECURITY_REVIEW
skill: so-security-reviewer
verdict: PASS
---

# US-4.1 Security Review (v2)

Re-review after the spec v3 rework (T11-T13). Scope: `git diff main..HEAD`, HEAD 6664e89
(19 files). Inputs: story, specification v3 (APPROVED), implementation_report v2,
verification_report v2. v1 is SUPERSEDED.

Verdict: PASS. No blocking findings. Two non-blocking/observation notes introduced, two pre-existing observations.

## New surface since v1

### N1. `AnthropicProvider#effort` / `#offThinking` catalog lookup: clear
- Both call `findModel('anthropic', model)`, which is `models.find(m => m.id === modelId)`: strict
  equality over a static in-memory array. The model value is used only as a comparison key. It is
  never a path, query, shell argument, regex, object key or log field. A non-string, absent or
  hostile id simply matches nothing.
- Unknown id behaviour is fail-safe: `#offThinking` returns `{ type: 'disabled' }` and `#effort`
  maps `max` to `xhigh` (the lowest-privilege fallback for an unlisted model). No exception, no
  reflection of the input.
- Data reaching it: on the normal path the model is already normalised by `resolveSlot` to a catalog
  id. The env fallback (`ANTHROPIC_MODEL_THINKING`, `ANTHROPIC_THINKING_EFFORT`) is operator-controlled
  and goes through the same lookup, so a bad value degrades rather than reaching the wire.
- Wire-shape hardening: `max` can no longer reach Anthropic for a model that lacks it, and
  `between_tools` is never combined with `output_config` / `display`. This narrows what a
  hand-rolled request can send; it is a defence-in-depth gain.
- No new log line, error text or response field carries the model id or level.
  `maxOutputTokens` cap for the caption path (`Math.min(1000, ...)`) is a bound, not a widening.

### N2. Settings-service restore path for stored levels: clear (one observation)
- Source is the user's own `localStorage`; it is parsed in a try/catch, and every slot passes
  `validateSlot` -> `findModel` / `clampLevel`, so a tampered level (including `max`, `between_tools`
  or arbitrary strings) is clamped onto a catalog level or replaced by defaults before it is applied or sent.
  Nothing from storage reaches HTML, `innerHTML` or the `SafeHtml` pipe.
- Stored `max` restores as `xhigh` in memory and is persisted at the next setter call (documented in T13). No security impact.
- Observation O1 (carried from v1 F1): `RETIRED_MODELS[slot.model]` is a plain-object lookup on a storage-controlled string
  (`constructor`, `toString` yield truthy inherited members, set `migrated`, then are discarded by validateSlot).
  Self-only, harmless. Optional hardening: `Object.hasOwn` or a `Map`.

## The five surfaces

1. Secret containment: clear. Diff grep for `process.env`, `API_KEY`, key-shaped literals: the only
   env read is `ANTHROPIC_MODEL_THINKING` / `ANTHROPIC_THINKING_EFFORT` (non-secret, server-only);
   nothing under `src/**` gained an env read. `.env.example` is current (model ids, level comments);
   key lines remain placeholders (`sk-ant-...`, `AIza...`). No key in response, log, `call-log.js` or usage DB.
2. DomSanitizer bypass: clear. No change to `safe-html.pipe.ts`, `html-cleaner.ts`, validator; no new
   `bypassSecurityTrust*` call. Only label maps in the settings component (auto-escaped interpolation).
3. Editor schema: clear. Nothing under `html-editor/` changed.
4. Prompt injection: clear. Retrieval, orchestrator, `systemBlocks` and `#toSystem` untouched; only the
   `thinking` / `output_config` request shape changed.
5. Proxy, errors, telemetry: clear. No change to `server/index.js` (CORS/binding), `describe-error.js`,
   `usage/store.js`, `call-log.js`. `pricing.js` adds prices and an injectable `now` (test clock; production omits it); the usage record stays metadata only.
   Gemini `thinkingLevel` is now passed through `clampLevel`, which narrows what is sent upstream.

## Findings
| # | Class | Origin | Detail |
|---|---|---|---|
| O1 | Observation | Introduced (harmless) | Inherited-property lookup in `RETIRED_MODELS`, see N2. |
| O2 | Observation | Introduced (informational) | `#effort`/`#offThinking` silently degrade an unknown model id instead of rejecting it. Intentional, stale clients degrade rather than break. |
| O3 | Observation | Pre-existing | `cors()` without origin restriction in `server/index.js`; deployment/binding unchanged. |
| O4 | Observation | Pre-existing | Single `bypassSecurityTrustHtml` pipe remains the only bypass; unchanged. |

No blocking and no non-blocking findings requiring action.

## Checklist
All five surfaces and both new surfaces examined, each with explicit "clear". Secret flow traced
through the changed provider and settings code, not only by literal grep. `.env.example` current with
placeholders. No new bypass call. Editor allow-list untouched. Fetched content path untouched. Error
and telemetry paths untouched.
