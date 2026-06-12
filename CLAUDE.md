# CLAUDE.md

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
npm install          # dependencies
npm run dev          # local run (frontend + proxy)
npm run build        # production build
npm run lint         # linter — run before every commit
npm run test         # tests
```

Before considering a task done: `npm run lint && npm run build` must pass with no errors.

## Architecture rules

1. **Provider independence.** All LLM work goes through the `LlmProvider` interface. No direct calls to `@google/genai`, `openai`, or `@anthropic-ai/sdk` outside `src/services/providers/`. The active provider is chosen by a factory from `LLM_PROVIDER` in env. Adding a provider = a new implementation of the interface, with no changes to the orchestrator.

2. **Retrieval separate from the LLM.** Web search and page fetching go through `RetrievalProvider` (`SerperRetrievalProvider`). Do not mix with generation. URL extraction is done by fetching the page, not by searching.

3. **Prompts out of code.** Prompt texts live in `prompts/` (or as versioned constants), not hard-coded as strings inside services. The main prompt = the contents of `system_promt.txt` (the strict variant). Split it into a shared system instruction + per-task parts for the 3-step orchestration (HTML → SEO JSON → translations).

4. **Secrets.** `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `SERPER_API_KEY` (opt. `GEMINI_API_KEY`) — server-side only, through the proxy. **Never** import keys into Angular code or put them in the bundle. Remove the legacy `declare const GEMINI_API_KEY` pattern. Keep `.env.example` current; the real `.env` stays in `.gitignore`.

5. **Behavioral compatibility.** The retry/backoff wrapper must stay provider-independent. Don't break existing features: Generator, Optimizer, Translator, Image Tools, SEO Meta, Copywriter, Readability.

## Hard rules for output HTML (acceptance criteria)

Any change to the prompt/generation is checked against these. If the output violates one, it's a bug:

- **Forbidden** `itemtype="https://schema.org/Product"` in the description body (the CMS already emits Product via JSON-LD; a duplicate = a critical error in GSC). Allowed only: `PropertyValue`, `FAQPage`, `HowTo`.
- Space between number and unit: `1.75 mm`, `200 °C` (not `1.75mm`).
- Spec count on output = spec count on input. Don't change values or units.
- First image — without `loading="lazy"`; every subsequent one — with it. No orphan images (each is preceded by a `<p>` lead-in).
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