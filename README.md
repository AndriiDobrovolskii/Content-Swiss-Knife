# Content Swiss Knife

An internal productivity tool that generates **SEO/AEO/GEO‑optimized product descriptions** for a network of 3D‑printing, 3D‑scanning, and laser‑engraving e‑commerce stores. From a product name, raw specs, and optional source material, it produces clean **Schema.org‑ready HTML**, **SEO metadata**, and **multilingual translations** — tuned per store and per regional market.

It is built around a single quality benchmark: match or exceed hand‑crafted, Claude‑grade output, but at the throughput of a pipeline.

> **Status:** actively developed. A few components are still being finished (see [Roadmap & In‑Progress](#roadmap--in-progress)). None of them block the core flow — the generator already produces strong, publishable descriptions today.

---

## Table of Contents

- [What it does](#what-it-does)
- [Supported stores & markets](#supported-stores--markets)
- [Architecture](#architecture)
- [How generation works](#how-generation-works)
- [Tools & modes](#tools--modes)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the app](#running-the-app)
- [Usage](#usage)
- [BFF API reference](#bff-api-reference)
- [Project layout](#project-layout)
- [Roadmap & in-progress](#roadmap--in-progress)

---

## What it does

Given a product, the app generates a complete, store‑specific content package:

- **Base HTML description** — semantic HTML5 with a fixed section structure (overview, key features, technical specs, applications, etc.), Schema.org Product microdata, sensible heading hierarchy, and disciplined inline highlighting of hard specs.
- **SEO metadata** — `h1`, `meta_title`, and `meta_description` per target language, with each `meta_description` grounded in a real hard spec pulled from the generated body.
- **URL slugs** — a localized name + a latin‑only, hyphen‑delimited, cross‑language‑unique slug per target language, deterministically normalized regardless of model output.
- **Translations** — full localized HTML for every non‑English language a store targets, with Ukrainian generated first.
- **FAQ / HowTo artifacts** — optional schema‑free HTML blocks for native theme modules, generated per language when supplemental content is supplied.
- **Validation** — every artifact is passed through deterministic acceptance‑criteria checks (unit spacing, Schema.org rules, lazy‑loading patterns, SEO length constraints) before it reaches the UI.

---

## Supported stores & markets

Store facts live in a single canonical registry (`prompt-core/constants.ts`), which is the only place store behavior is defined. Seven stores span four geo‑groups:

| Store | Group | Market | Languages |
| --- | --- | --- | --- |
| 3DDevice | UA | Ukraine | en‑GB, uk‑UA, ru‑UA |
| 3DPrinter | UA | Ukraine | en‑GB, uk‑UA, ru‑UA |
| 3DScanner | UA | Ukraine | en‑GB, uk‑UA, ru‑UA |
| Center 3D Print | EU | Poland & EU | pl‑PL, en‑GB, de‑DE, uk‑UA, ru‑UA |
| Drukarka 3D | EU | Poland (Kraków) | pl‑PL, uk‑UA |
| EXPERT3D / Impresora‑3D | ES | Valencia, Spain | en‑ES, es‑ES, uk‑UA |
| Expert‑3DPrinter | US | Houston, TX | en‑US, es‑MX, uk‑UA |

Each group carries its own tone, currency, measurement rules (e.g. imperial conversions for the US group), and language priority. Target languages for both SEO metadata and translations are derived automatically from the store registry — there is no per‑group hardcoding to keep in sync.

---

## Architecture

```
┌─────────────────────────────┐        HTTP/JSON         ┌──────────────────────────────┐
│  Angular 21 SPA (port 3000) │  ───────────────────────▶ │  Express BFF (port 3001)      │
│                             │                          │                               │
│  • Standalone components    │                          │  • /api/llm/*                 │
│  • Angular Signals state    │                          │  • /api/retrieval/*           │
│  • ContentOrchestrator      │                          │  • Provider factory           │
│  • LlmService / Retrieval   │                          │     (anthropic|openai|gemini) │
└─────────────────────────────┘                          └───────────────┬──────────────┘
                                                                          │  SDK calls
                                                                          ▼
                                                          ┌──────────────────────────────┐
                                                          │  Provider adapters            │
                                                          │  anthropic.js / openai.js /   │
                                                          │  gemini.js  +  Serper / fetch │
                                                          └──────────────────────────────┘
```

**Frontend** — Angular 21, standalone components, Angular Signals for reactive state, Tailwind CSS. All orchestration logic lives in services; the `ContentOrchestratorService` drives the pipeline and exposes progress and results as signals.

**Backend (BFF)** — a thin Express server that exposes LLM and retrieval endpoints and selects an LLM provider at startup. It never contains business logic — it routes requests to provider adapters.

**Provider independence is a hard rule.** All vendor SDK calls are confined to the adapter layer (`providers/anthropic.js`, `openai.js`, `gemini.js`). Provider‑specific behavior — cache‑control headers, beta endpoints, thinking‑mode toggles — stays inside the relevant adapter and never leaks into the orchestrator, services, or frontend. Swapping providers is a single environment variable.

**Prompts are isolated.** Every task prompt lives in its own file (`prompts/task-a.ts`, `task-b.ts`, `task-c.ts`, `task-faq.ts`, `task-howto.ts`) over a shared `prompt-core/master-system-prompt.ts`. Dynamic per‑store values are injected into the user‑content block, never into the static system block, so prompt caching stays consistent across stores.

---

## How generation works

A single `generate()` run executes an ordered, multi‑step pipeline. Each step writes its result into a signal, so the UI updates progressively as content arrives:

1. **Base English HTML (Task A)** — the creative/thinking pass. Builds the full semantic description from the product input. Uses the high‑capability model (Anthropic Sonnet by default), optionally with extended thinking enabled.
2. **SEO metadata (Task B)** — runs the fast model (Anthropic Haiku) and returns strict JSON. The freshly generated HTML is passed back in as context so each `meta_description` can cite a genuine hard spec rather than generic copy.
3. **URL slugs (Task Slug)** — immediately follows SEO metadata, on the fast model. The LLM proposes a localized `name` + `slug` per target language; a deterministic post‑processing layer (`normalizeSlug` / `ensureUniqueSlugs`) then guarantees the actual URL contract (latin‑only, lowercase, hyphen‑delimited, unique across languages) regardless of what the model returned. A slug failure is logged and skipped — it never aborts the rest of the run.
4. **Translations (Task C)** — one fast‑model call per non‑English target language. Ukrainian is always generated first. Store‑specific link/URL rewrites (e.g. Spanish EXPERT3D internal links) are applied as a post‑step.
5. **FAQ / HowTo artifacts** — generated per language **only** when supplemental content is provided. These are schema‑free HTML blocks intended for native theme module fields.

After the pipeline finishes, all artifacts run through `output-validator.ts`. Validation is **advisory**: issues are surfaced to the UI and logged, but never abort a run, so you always get usable output even when a minor acceptance check trips.

Model roles are intentionally split: a strong model for the one creative, high‑value pass, and a fast, cost‑efficient model for the repetitive structured/translation passes.

---

## Tools & modes

Beyond the main generator, the app ships several focused modes:

- **Generator** — the full product‑content pipeline described above.
- **SEO Generator** — produces SEO metadata standalone.
- **Slug Generator** — produces localized name + URL slug pairs standalone, for a single product/store, without running the full pipeline.
- **Optimizer** — refactors dirty/imported HTML into clean, semantic HTML5 (image hygiene, heading cleanup, spec highlighting).
- **Copywriter** — rewrites existing text to be ~80% unique for a specific target market while preserving technical facts.
- **Readability** — scores text for clarity/accessibility and returns an optimized rewrite.
- **Translator** — standalone translation of supplied HTML.
- **Image Tools** — image processing and AI alt‑text generation *(under product review — see roadmap)*.

Source material can be supplied directly, pulled from a **URL** (with a fetch → reader‑fallback chain for bot‑protected pages), or extracted from a **PDF**. Product enrichment by name is available via Serper.

---

## Installation

### Prerequisites

- **Node.js** (LTS recommended) and npm
- API key for at least one LLM provider (Anthropic, OpenAI, or Gemini)
- *(Optional)* a Serper.dev key for product enrichment / web search

### Clone & install

```bash
git clone https://github.com/AndriiDobrovolskii/Content-Swiss-Knife.git
cd Content-Swiss-Knife
npm install
```

---

## Configuration

Create a `.env` file in the project root. The BFF reads it via `dotenv` at startup.

```dotenv
# Which provider to use: openai | anthropic | gemini
LLM_PROVIDER=anthropic

# --- Anthropic (primary) ---
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL_THINKING=claude-sonnet-4-5   # Task A (creative/thinking)
ANTHROPIC_MODEL_FAST=claude-haiku-4-5        # Tasks B / C (structured + translations)

# --- OpenAI (used for cost-effective testing) ---
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# --- Gemini (optional) ---
GEMINI_API_KEY=...

# --- Retrieval (optional) ---
SERPER_API_KEY=...

# --- Server ---
PORT=3001
```

Set `LLM_PROVIDER` to whichever provider you want active; only that provider’s key is required to run.

---

## Running the app

The project runs two processes side by side: the **Express BFF** on port `3001` and the **Angular dev server** on port `3000`. They are typically started together with `concurrently`.

```bash
# Start frontend + BFF together (check package.json for the exact script name)
npm run dev
```

Or start them separately in two terminals:

```bash
# Terminal 1 — BFF
npm run server      # → http://localhost:3001

# Terminal 2 — Angular dev server
npm start           # → http://localhost:3000
```

**Windows:** a `.bat` launcher using a relative path (`%~dp0`) is provided for one‑click local startup.

Then open **http://localhost:3000** in your browser.

> Adjust the script names above to match the `scripts` block in your `package.json`.

---

## Usage

1. **Pick a store.** This drives market, currency, measurement rules, tone, and the full set of target languages automatically.
2. **Enter the product** — name, specs, and a base description. Optionally paste/import source content from a **URL** or **PDF**, or enrich by product name.
3. *(Optional)* Add **supplemental content** to trigger FAQ/HowTo artifact generation, and **custom instructions** to steer the copy.
4. *(Optional)* Toggle **deep thinking** for the base HTML pass when the product warrants extra reasoning.
5. **Generate.** Watch progress update live as each step completes: HTML → SEO → translations → artifacts.
6. **Review** the per‑language live previews and any validation notes, then export. Generated assets can be packaged for upload to the target store.

---

## BFF API reference

All endpoints accept and return JSON.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/llm/generate` | Run a generation in `text` or `json` mode. Body: `{ systemBlocks, userContent, mode }`. |
| `POST` | `/api/llm/vision` | Analyze an image. Body: `{ base64Data, mimeType, prompt, useThinking }`. |
| `POST` | `/api/llm/pdf` | Extract content from a PDF. Body: `{ base64Data }`. |
| `POST` | `/api/llm/chat` | Multi‑turn chat with optional tools. Body: `{ messages, systemInstruction, tools }`. |
| `POST` | `/api/retrieval/url` | Fetch readable content from a URL. Body: `{ url }`. |
| `POST` | `/api/retrieval/search` | Product/web search via Serper. Body: `{ query, num }`. |

The request payload for `/api/llm/generate` deliberately separates a cacheable `systemBlocks` array from per‑request `userContent`, keeping the static system context stable across calls.

---

## Project layout

```
server/
  index.js                  # Express BFF: LLM + retrieval routes
  providers/
    factory.js              # Provider selection (anthropic|openai|gemini)
    anthropic.js            # Anthropic adapter (cache control, thinking, etc.)
    openai.js
    gemini.js
  retrieval/
    serper.js               # Product enrichment / search
    fetcher.js              # URL fetch with fallback chain
src/
  prompt-core/
    master-system-prompt.ts # Shared system prompt
    constants.ts            # Canonical store registry (single source of truth)
  prompts/
    task-a.ts               # HTML description (creative)
    task-b.ts               # SEO metadata (JSON)
    task-c.ts               # Translations
    task-faq.ts / task-howto.ts
  services/
    content-orchestrator.service.ts  # Pipeline driver (signals)
    llm.service.ts
    retrieval.service.ts
    history.service.ts
  utils/
    output-validator.ts     # Acceptance-criteria checks
    html-cleaner.ts
  app/                       # Angular standalone components, types
```

---

## Roadmap & in-progress

The core generation flow is stable and produces publishable, high‑quality descriptions today. A few areas are still being completed and are **non‑blocking** for content generation:

- **Prompt caching** — finalizing the implementation and verifying expected token savings on fast‑model (Haiku) calls.
- **Tool‑call pairing hardening** — completing a pre‑flight validator that prevents malformed `tool_use` / `tool_result` pairs from corrupting conversation history, plus its test suite.
- **UI refactor (multi‑phase)** — typography normalization, adaptive layout, dynamic per‑language tab labels, and per‑language live preview are being rolled out incrementally.
- **Per‑field source input** — extracting a reusable source‑input component for per‑field source‑mode selection and fetch logic.
- **Image Tools mode** — currently under product review; may be slimmed down or removed.

These are quality, ergonomics, and efficiency improvements layered on top of a working pipeline — you can install, configure, and generate full multilingual content packages right now.

---

## License

Internal project. Not intended for public distribution.
