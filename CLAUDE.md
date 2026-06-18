# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⛔ FROZEN FILES — Claude Code MUST NOT modify without explicit user instruction

The following files contain production-calibrated prompt text and validation logic.
These files are FROZEN. Claude Code must NOT edit them unless the user explicitly
says "modify [filename]" for that specific file in the current session.

Refactoring a service that IMPORTS these files does NOT authorize editing them.
Fixing a bug elsewhere does NOT authorize editing them.

FROZEN list:
- src/prompts/task-a.ts
- src/prompts/task-b.ts
- src/prompts/task-c.ts
- src/prompt-core/master-system-prompt.ts
- src/utils/output-validator.ts

If Claude Code needs to change any frozen file to complete a task, it MUST:
1. STOP
2. Tell the user EXACTLY what change is needed and WHY
3. Wait for explicit approval before proceeding

Instructions for Claude Code in this repository. Read before making any change.

## What this project is

An Angular app that generates SEO/AEO/GEO-optimized product descriptions for 3D-printing and scanning e-commerce stores. It used to live in Google AI Studio on Gemini; we are migrating it to local development with a provider-independent architecture.

The detailed migration plan is in `REFACTOR_PLAN.md`. This file holds operational rules; the plan holds strategy. On conflict, `REFACTOR_PLAN.md` wins.

## Stack

- Frontend: Angular (standalone components, signals), TypeScript.
- LLM providers: OpenAI (`gpt-4o`, primary during development) → Anthropic (`claude-sonnet-4-6`, target). Gemini — optional fallback.
- Retrieval/grounding: Serper.dev (`/search`) + page fetch. **Not** Google Grounding.
- Build: Vite. Secrets go through a local backend proxy, never into the browser bundle.

## Commands

```bash
npm install            # dependencies
npm run dev            # local run (frontend + proxy)
npm run build          # production build
npm run lint           # tsc --noEmit — run before every commit
npm run test           # vitest run (one-shot)
npm run test:watch     # vitest watch mode
npm run test:coverage  # vitest + V8 coverage report
```

**After every Claude Code session:** `bash arch-guard.sh` — verifies the 4 architecture rules and frozen-file checksums. Run `bash arch-guard.sh --rebaseline` only after an intentional frozen-file change that was explicitly approved.

Before considering a task done: `npm run lint && npm run build` must pass with no errors.

## Architecture rules

1. **Provider independence.** All LLM work goes through the `LlmProvider` interface. No direct calls to `@google/genai`, `openai`, or `@anthropic-ai/sdk` outside `src/services/providers/`. The active provider is chosen by a factory from `LLM_PROVIDER` in env. Adding a provider = a new implementation of the interface, with no changes to the orchestrator.

2. **Retrieval separate from the LLM.** Web search and page fetching go through `RetrievalProvider` (`SerperRetrievalProvider`). Do not mix with generation. URL extraction is done by fetching the page, not by searching.

3. **Prompts out of code.** Prompt texts live in `prompts/` (or as versioned constants), not hard-coded as strings inside services. The main prompt = the contents of `system_promt.txt` (the strict variant). Split it into a shared system instruction + per-task parts for the 3-step orchestration (HTML → SEO JSON → translations).

4. **Secrets.** `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `SERPER_API_KEY` (opt. `GEMINI_API_KEY`) — server-side only, through the proxy. **Never** import keys into Angular code or put them in the bundle. Remove the legacy `declare const GEMINI_API_KEY` pattern. Keep `.env.example` current; the real `.env` stays in `.gitignore`.

5. **Behavioral compatibility.** The retry/backoff wrapper must stay provider-independent. Don't break existing features: Generator, Optimizer, Translator, Image Tools, SEO Meta, Copywriter, Readability.

## Generation pipeline

`ContentOrchestratorService.generate()` runs four sequential steps:

1. **Task A** (`buildPromptA`) — generates the base English HTML description.
2. **Task B** (`buildPromptB`) — generates SEO metadata JSON (multilingual, one object per language). Uses the Task A HTML as grounding context.
3. **Task C** (`buildPromptC`) — translates the base HTML into each non-English language defined for the store. Ukrainian always runs first.
4. **FAQ / HowTo** (`buildPromptFaq` / `buildPromptHowTo`) — optional; runs only when `input.supplementalContent` is present. Produces schema-free HTML artifacts for the CMS native FAQ/HowTo module fields.

All prompt builders return a `PromptPayload` (`src/prompt-core/payload.ts`):

```ts
{ systemBlocks: SystemBlock[];  // [0]=master (cache:true), [1]=task (cache:true)
  userContent: string; }        // dynamic per call — never cached
```

The `cache: true` flag on system blocks enables Anthropic prompt caching. Do not collapse `systemBlocks` into `userContent` — it breaks caching economics.

## Store registry

`STORE_REGISTRY` in `src/prompt-core/constants.ts` is the **single source of truth** for every store's group, currency, languages, and image base URL. `getLangsForStore()` derives `seoLangs` and `transLangs` from it. Do not hard-code language lists or currency symbols anywhere else — derive them from the registry.

## Server / frontend split

- **`server/providers/`** — the real LLM implementations (OpenAI, Anthropic, Gemini). These run in Node.js, have access to env secrets, and are selected by `LLM_PROVIDER` env var via `server/providers/factory.js`. The server exposes `/api/llm/*` and `/api/retrieval/*` routes on port 3001.
- **`src/services/providers/`** — contains only the `LlmProvider` TypeScript interface and type exports. No real provider logic lives here.
- **`src/services/llm.service.ts`** — implements `LlmProvider` by delegating every call to the Express proxy via `HttpClient`. Angular never touches an SDK directly.

Adding a provider means: a new class in `server/providers/`, a new `case` in `factory.js`, and new env vars in `.env.example`. No Angular changes needed.

## Known accepted tech debt

`content-orchestrator.service.ts` contains several inline prompt functions (`buildOptimizerPrompt`, `buildReadabilityPrompt`, `buildKeywordsPrompt`, `buildImageAltPrompt`, `buildCopywriterPrompt`). These are flagged as warnings (not errors) by `arch-guard.sh` — they are tracked debt, not violations. Do not treat them as a pattern to follow; new prompts go in `src/prompts/`.

## Hard rules for output HTML (acceptance criteria)

Any change to the prompt/generation is checked against these. If the output violates one, it's a bug:

- **Forbidden** `itemtype="https://schema.org/Product"` in the description body (the CMS already emits Product via JSON-LD; a duplicate = a critical error in GSC). Allowed only: `PropertyValue`, `FAQPage`, `HowTo`.
- Space between number and unit: `1.75 mm`, `200 °C` (not `1.75mm`).
- Spec count on output = spec count on input. Don't change values or units.
- Images wrapped in `<figure>` (inline style `display: block; width: max-content; max-width: 100%; margin: 4px auto;`) with a `<figcaption>` (a `<b>` lead-in label distinct from the alt + description) and `decoding="async"`. First image — without `loading="lazy"`; every subsequent one — with it. No `<figure>` nested inside `<p>`. No orphan images (each is preceded by a `<p>` lead-in).
- Video iframes (YouTube/Vimeo) wrapped in `<figure>` (aspect-ratio on an inner `<div>`) with a `<figcaption>` "Video review of [Product]"; `src` preserved with `rel=0` ensured; `loading="lazy"` + the standard `allow`/`referrerpolicy`/`allowfullscreen` set; no `<figure>` nested inside `<p>`.
- SEO: meta_title ≤ 55 chars; meta_description ≤ 155, ends with CTA ➔, includes the currency symbol.
- Non-EN languages: no anglicisms ("друк" not "прінт", "ПЗ" not "софт").
- HTML only, no Markdown. No `<br>` for spacing; `<hr>` after each `</section>`.

## Workflow

- Small atomic changes, one plan phase at a time. Each phase — its own branch/PR.
- Before swapping a provider/prompt — capture a golden output for regression.
- Keep a working rollback switch to the previous provider until the corresponding phase is complete.
- In the PR, state which `REFACTOR_PLAN.md` phase was closed and how the acceptance criteria were verified.

## What NOT to do

- Don't hard-code API keys into client code.
- Don't add `schema.org/Product` to the description body.
- Don't bring back Google Grounding — grounding only through Serper.
- Don't change spec numeric values/units during the rewrite.
- Don't produce a "combined" output file — each language separately; `seo_metadata.json` separately.
- Don't batch edits across multiple phases in one commit.