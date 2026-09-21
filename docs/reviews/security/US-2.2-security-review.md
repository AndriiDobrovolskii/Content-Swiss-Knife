---
artifact: security_review
story: US-2.2
version: 1
status: APPROVED
owner: so-security-reviewer
stage: SECURITY_REVIEW
created_at: 2026-09-21T19:00:00Z
updated_at: 2026-09-21T19:00:00Z
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 1
  - key: implementation_report
    version: 2
  - key: verification_report
    version: 1
---

# Security Review - US-2.2

Verdict: **PASS**. No blocking findings, no non-blocking findings introduced by this change.
Scope: uncommitted working tree against HEAD (58 tracked files changed plus new untracked files).

## Surface 1 - Secret containment: clear
- `git diff HEAD -- server .env.example`: the only server change is a one-line SQL comment in `server/usage/store.js` (drops `'consumables-doc'` from a comment). No `process.env`, key, or config read added anywhere.
- New/changed files (`simplified-templates.ts`, `simplified-template-blocks.ts`, `description-doc.completeness.ts`, `simplified-word-ranges.ts`, `simplified-specs-shape.ts`, `content-template-labels.ts`, the dropdown component) contain no `process.env`, `apiKey` or `API_KEY` reference (grep of non-spec files).
- `llm.service.ts` change is a type narrowing (`pipeline: 'doc' | 'html'`), no payload or logging change. No new setting, so `.env.example` needs no update (unchanged, no diff).

## Surface 2 - DomSanitizer bypass: clear
- Exactly one `bypassSecurityTrust*` remains, in `src/app/pipes/safe-html.pipe.ts` (unchanged, no diff). No second call added.
- What reaches the pipe: the same generation-pipeline HTML as before. The new flat-§7 path in `render-description.ts` (`renderSpecs(..., flat)`) escapes labels and values with `esc()` exactly like the categorised path; absent paragraphs are skipped without markup. New null-safe readers add no raw interpolation. No path lets a fetched page, filename or error string flow into the pipe.
- `src/utils/html-cleaner.ts` is untouched. The output validator (FROZEN, OD-9 approved) gains template-aware checks; the diff removes consumables-only paths and adds rules, and does not remove sanitising rules.

## Surface 3 - Editor allow-list: clear
- `src/app/components/html-editor/**` is untouched (no diff): no new attribute or node survives round-trip.

## Surface 4 - Prompt injection: clear
- Per-template task instructions are fixed strings (`buildSimplifiedDocInstruction`) placed in `systemBlocks[1]`, cacheable and independent of any input.
- Per-run facts (`buildSimplifiedRunFacts`: hasSpecs boolean, includeFunctionality boolean, template id from a closed registry) go to uncached `userContent`. Only booleans and a registry-validated id are interpolated; no fetched page text and no free-form user text enters `systemBlocks`. `isSimplifiedTemplateId` gates unknown or stale ids to the pre-Story path.
- Fetch scope: `RetrievalService` not touched; no widening of what is fetched or redirect handling.

## Surface 5 - Proxy, errors, telemetry: clear
- CORS/binding/deployment: untouched, so the pre-existing unrestricted `cors()` is unaffected (Observation only, not this change).
- Error surface: `describe-error.js` untouched; the orchestrator changes only remove the consumables gate and add validator issues carrying field paths, not provider bodies.
- Usage store: metadata columns only, unchanged apart from a comment; `call-log.js` untouched.

## UI input
The new dropdown (`content-template-select`) renders labels via Angular interpolation (auto-escaped, no `innerHTML`); the option values come from the closed registry and the checkbox is a boolean.

## Findings
| # | Class | Finding |
|---|---|---|
| - | Blocking | none |
| - | Non-blocking | none |
| O1 | Observation (pre-existing) | `server/index.js` `cors()` has no origin restriction; acceptable for localhost dev proxy, untouched here. |

## Checklist
All five surfaces examined; no new `bypassSecurityTrust*`; editor schema unchanged; fetched content not in `systemBlocks`; telemetry remains metadata-only; `.env.example` current (no new setting).
