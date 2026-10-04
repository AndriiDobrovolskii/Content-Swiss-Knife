---
artifact: story
story: US-4.1
slug: add-sonnet-5-5-and-gemini-3-8-flash
title: Add Claude Sonnet 5.5 and Gemini 3.8 Flash as selectable models, make them the defaults, and retire Sonnet 4.6
track: server
version: 1
status: ARCHIVED
owner: so-story-writer
created_at: 2026-10-01T00:00:00Z
updated_at: 2026-10-01T00:00:00Z
---

# US-4.1 — Add Claude Sonnet 5.5 and Gemini 3.8 Flash as selectable models, make them the defaults, and retire Sonnet 4.6

## Story

As a **content operator running a generation**,
I want **Claude Sonnet 5.5 and Gemini 3.8 Flash available in the model settings and used by
default for the Deep and Fast slots**,
so that **new generations run on the current models without me having to reselect them, and
cost reporting stays correct for the new models**.

## Context

Anthropic released Claude Sonnet 5.5 on 2026-09-28 and Google lists Gemini 3.8 Flash as a
stable model. The model catalog (`src/prompt-core/model-catalog.json`) currently offers
Sonnet 5 / Sonnet 4.6 / Haiku 4.5 and Gemini 3.1 Pro / 3.7 Flash / 3.6 Flash; Deep defaults to
`claude-sonnet-5` and Fast to `gemini-3.7-flash`. The owner decided: add both models, make both
the defaults, and remove Sonnet 4.6.

Official values this Story relies on (checked 2026-10-01):

- **Sonnet 5.5** — API id `claude-sonnet-5-5`; 1M context; 128K max output; adaptive thinking
  (default effort `high`); $2 in / $10 out / $2.50 5m-write / $4 1h-write / $0.20 cache-read
  per MTok. Non-default `temperature`/`top_p`/`top_k` returns HTTP 400. Forced tool use returns
  an error. Lowest thinking setting is `between_tools`.
  Sources: `platform.claude.com/docs/en/models/sonnet-5-5/overview`,
  `platform.claude.com/docs/en/about-claude/pricing`.
- **Gemini 3.8 Flash** — id `gemini-3.8-flash`; stable; 1,048,576 in / 65,536 out tokens;
  thinking levels `low`, `medium`, `high` — **`minimal` is not supported and returns an error**;
  context caching supported; paid-tier $0.75 in / $3.75 out / $0.075 cache-read per 1M tokens
  through 2026-12-31, then $1.50 / $7.50 / $0.15 from 2027-01-01.
  Sources: `ai.google.dev/gemini-api/docs/models/gemini-3.8-flash`,
  `ai.google.dev/gemini-api/docs/pricing`.

The current Fast default level is `minimal` (`DEFAULT_SETTINGS.fast` in
`src/services/model-settings.service.ts`, and `FALLBACK_FAST` in `server/providers/gemini.js`),
so simply swapping the model id would send an unsupported level.

## Scope

| | |
|---|---|
| **Stores** | all of `STORE_REGISTRY` — model choice is store-independent |
| **Locales** | all — model choice is locale-independent; no prompt or content change |
| **Surface** | `src/prompt-core/model-catalog.json`; `server/usage/pricing.js`; `server/providers/anthropic.js` (default model); `server/providers/gemini.js` (`FALLBACK_FAST`); `src/services/model-settings.service.ts` (defaults + stored-settings restore); `README.md` and `.env.example` model references; existing specs that reference the retired/superseded ids |
| **Touches FROZEN files?** | no |
| **Touches generated HTML?** | no |

## Acceptance criteria

- **AC-1:** The model catalog contains `claude-sonnet-5-5` under provider `anthropic` with
  `maxOutputTokens` 128000, and `gemini-3.8-flash` under provider `gemini` with `tier: "fast"`,
  `levels` exactly `["low","medium","high"]` and `maxOutputTokens` 65536. `levels` for
  `gemini-3.8-flash` does not contain `minimal`.
- **AC-2:** The model catalog no longer contains `claude-sonnet-4-6`. `claude-sonnet-5`,
  `claude-haiku-4-5`, `gemini-3.1-pro-preview`, `gemini-3.7-flash` and `gemini-3.6-flash` remain
  selectable.
- **AC-3:** With no stored settings, the Deep slot is `anthropic` / `claude-sonnet-5-5` and the
  Fast slot is `gemini` / `gemini-3.8-flash`, and each default `level` is a member of that
  model's catalog `levels`.
- **AC-4:** The Anthropic provider's default thinking-model fallback (used when
  `ANTHROPIC_MODEL_THINKING` is unset) resolves to `claude-sonnet-5-5`, and the Gemini
  provider's `FALLBACK_FAST` resolves to `gemini-3.8-flash` at a level in that model's `levels`
  (never `minimal`).
- **AC-5:** `getPrices('claude-sonnet-5-5')` returns `{ in: 2.00, out: 10.00, cw: 4.00, cr: 0.20 }`
  (1h cache write, per this repository's `ttl: '1h'` convention) and does not return
  `FALLBACK_PRICE`.
- **AC-6:** `getPrices('gemini-3.8-flash')` returns `{ in: 0.75, out: 3.75, cw: 0, cr: 0.075 }`
  for any date before 2027-01-01T00:00:00Z and `{ in: 1.50, out: 7.50, cw: 0, cr: 0.15 }` from
  that instant on, evaluated per lookup (not at module load); it never returns `FALLBACK_PRICE`
  and never resolves to another Gemini model's entry.
- **AC-7:** Restoring stored settings whose Deep slot is `claude-sonnet-4-6` yields Deep =
  `claude-sonnet-5-5` and persists the correction; it does not throw and does not leave a model
  id that is absent from the catalog.
- **AC-8:** A request the Anthropic provider builds for `claude-sonnet-5-5`, at every `level` in
  its catalog entry, contains no `temperature`, `top_p` or `top_k` field and no forced
  `tool_choice`.
- **AC-9:** `README.md` and `.env.example` name `claude-sonnet-5-5` as the example/default
  `ANTHROPIC_MODEL_THINKING` value, and no remaining reference in non-historical source, specs
  or docs names `claude-sonnet-4-6` as a selectable or default model.
- **AC-10:** `npm test` (both runners), `npm run lint`, `npm run build` and `bash arch-guard.sh`
  pass.

## Out of scope

- Adding Claude Opus 5.5, Fable 5.1, or any other model.
- Changing prompts, schemas, or generated HTML; no FROZEN file is touched.
- Removing Sonnet 5, Gemini 3.7 Flash or Gemini 3.6 Flash from the catalog.
- Rewriting the stale `claude-sonnet-5` pricing comment in `server/usage/pricing.js`
  (it still says introductory pricing ends 2026-08-31; Anthropic's pricing page now states
  $2/$10 is the permanent standard price). Reported for a separate fix.
- Re-pricing past `usage_log` rows; cost stays as computed at insert time.
- Live-API verification against the vendors; acceptance is by unit tests with mocked SDKs.

## Open questions

- **Q1:** Which thinking levels does `claude-sonnet-5-5` expose in the catalog, and is
  `thinking: { type: "disabled" }` still accepted? The Sonnet 5.5 page says the lowest thinking
  setting is `between_tools` (works at `high` effort or below) and does not state whether
  `disabled` is valid; the provider sends `disabled` for level `disabled` and for PDF extraction
  (`server/providers/anthropic.js`).
  - Checked: Sonnet 5.5 overview and pricing pages; `anthropic.js` thinking mapping.
  - Impact if unresolved: a spec writer would copy Sonnet 5's `["disabled","low","medium","high"]`
    and risk a runtime 400 on every PDF extraction and `disabled` run.
- **Q2:** What is the default Fast level for `gemini-3.8-flash`? `minimal` is rejected; `low` is
  the nearest, but that is a choice, not a documented fact.
  - Checked: Gemini 3.8 Flash model page.
  - Impact if unresolved: the spec writer would pick `low` silently, changing Fast-slot cost and
    latency characteristics.
- **Q3:** Should a stored Fast slot on `gemini-3.7-flash` / `gemini-3.6-flash` be migrated to
  `gemini-3.8-flash` (as the 3.6→3.7 one-time migration did), or left alone since 3.7/3.6 stay
  selectable? Same question for a stored Deep slot on `claude-sonnet-5`.
  - Checked: `restore()` in `model-settings.service.ts`; the owner said "add + make default" for
    Gemini and "remove 4.6, make 5.5 default" for Sonnet, without addressing stored choices.
  - Impact if unresolved: existing operators either stay silently on older models or are
    silently moved off a model they chose.
- **Q4:** Should the `claude-sonnet-4-6` entry be deleted from `DEFAULT_PRICES` in
  `server/usage/pricing.js`, or kept so the usage dashboard can still price old rows?
  - Checked: `pricing.js` comments say past rows keep their insert-time cost.
  - Impact if unresolved: removing it could make substring-matching `getPrices` return a wrong
    or fallback price for any later lookup of the old id.
- **Q5:** `claude-sonnet-5` is catalogued at `maxOutputTokens` 64000 although Anthropic lists
  128K; AC-1 uses the documented 128000 for 5.5. Confirm 128000 is intended for the Deep slot
  given the existing "truncated: hit max_tokens" repair-path tuning.
  - Checked: catalog; Sonnet 5.5 overview.
  - Impact if unresolved: a different ceiling changes truncation behaviour in Task A.

## References

- `src/prompt-core/model-catalog.json`, `server/usage/pricing.js`,
  `server/providers/anthropic.js`, `server/providers/gemini.js`,
  `src/services/model-settings.service.ts`
- `README.md` § environment configuration (`ANTHROPIC_MODEL_THINKING`)
- Prior migration precedent: Gemini 3.6 → 3.7 Flash (`restore()` in `model-settings.service.ts`)
- `AGENTS.md` §3 (Rule #1: vendor SDK calls only in `server/providers/`), §9 (FROZEN files — none touched)
- https://platform.claude.com/docs/en/models/sonnet-5-5/overview
- https://platform.claude.com/docs/en/about-claude/pricing
- https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash
- https://ai.google.dev/gemini-api/docs/pricing
