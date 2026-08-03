import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { resolveRequest as resolveLlmRequest, slotFor } from './llm-request.js';
import { SerperRetrieval } from './retrieval/serper.js';
import { fetchUrl } from './retrieval/fetcher.js';
import { computeCost } from './usage/pricing.js';
import { insertUsage, queryUsage, insertGeneration, queryGenerations } from './usage/store.js';
import { describeError } from './utils/describe-error.js';
import { formatCallStart, formatCallDone, formatCallError } from './utils/call-log.js';
import { formatBuild, readBuild } from './utils/build-info.js';
import { warmProviders } from './providers/factory.js';

config();

const app = express();
const PORT = process.env.PORT || 3001;
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const serper = new SerperRetrieval(process.env.SERPER_API_KEY);

// Bind the env fallback once; the per-request logic lives in ./llm-request.js so it can be
// tested without booting Express or holding API keys.
const resolveRequest = (body, slotName) => resolveLlmRequest(body, slotName, LLM_PROVIDER);

// `error.message` alone is not enough. A transport failure arrives as a bare `fetch failed`, with
// the actual reason (ECONNRESET, ENOTFOUND, a socket timeout) on `error.cause` — so every network
// fault used to produce the same opaque 24-byte body. describeError flattens the cause chain; see
// server/utils/describe-error.js.
//
// This sends, it no longer logs: every caller now prints a formatCallError line first, which says
// the same thing plus the slot, provider, model and elapsed time. Logging here too would just
// print each failure twice.
function sendError(res, error) {
  res.status(error.status || 500).json({ error: describeError(error) });
}

// ── LLM routes ─────────────────────────────────────────────────────────────

app.post('/api/llm/generate', async (req, res) => {
  const { systemBlocks = [], userContent = '', mode = 'text', taskLabel, productName, store, lang } = req.body;
  const slotName = slotFor(mode);
  const started = Date.now();
  // Declared out here so the catch can name what failed. resolveRequest() rejects an unknown
  // provider before either is bound, so neither may be assumed present down there.
  let provider, slot;

  try {
    const resolved = resolveRequest(req.body, slotName);
    ({ provider, slot } = resolved);
    console.log(formatCallStart({ route: 'generate', taskLabel, lang, mode, slotName, provider, slot }));

    const { result, usage } = await resolved.instance.generate({ systemBlocks, userContent }, mode, slot);

    if (usage) {
      const costUsd = computeCost(usage.model, usage);
      try {
        insertUsage({
          // The provider that actually served THIS request — not the boot-time env value,
          // which would mislabel every Gemini row as anthropic.
          provider,
          model: usage.model,
          mode: usage.mode,
          taskLabel, productName, store, lang,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cacheWriteTokens: usage.cacheWriteTokens,
          cacheReadTokens: usage.cacheReadTokens,
          costUsd,
        });
      } catch (usageError) {
        // Persistence must never fail the actual generation response to the caller.
        console.error('[Usage] failed to record usage:', usageError.message);
      }
      // Outside the try above on purpose: a logging failure must not be mistaken for — or
      // silently swallowed by — the usage-persistence handler.
      console.log(formatCallDone({ route: 'generate', taskLabel, ms: Date.now() - started, usage, costUsd }));
    }

    res.json({ result });
  } catch (error) {
    console.error(formatCallError({
      route: 'generate', taskLabel, lang, slotName, provider, slot,
      ms: Date.now() - started, detail: describeError(error),
    }));
    sendError(res, error);
  }
});

app.post('/api/llm/vision', async (req, res) => {
  const { base64Data, mimeType, prompt, useThinking = false } = req.body;
  // Vision has no `mode`, so Deep Thinking Mode picks the slot directly.
  const slotName = useThinking ? 'deep' : 'fast';
  const started = Date.now();
  let provider, slot;

  try {
    const resolved = resolveRequest(req.body, slotName);
    ({ provider, slot } = resolved);
    console.log(formatCallStart({ route: 'vision', slotName, provider, slot }));

    const result = await resolved.instance.analyzeImage(base64Data, mimeType, prompt, useThinking, slot);
    res.json({ result });
  } catch (error) {
    console.error(formatCallError({
      route: 'vision', slotName, provider, slot,
      ms: Date.now() - started, detail: describeError(error),
    }));
    sendError(res, error);
  }
});

app.post('/api/llm/pdf', async (req, res) => {
  const { base64Data } = req.body;
  const started = Date.now();
  let provider, slot;

  try {
    // Extraction is mechanical transcription — always the cheap slot.
    const resolved = resolveRequest(req.body, 'fast');
    ({ provider, slot } = resolved);
    console.log(formatCallStart({ route: 'pdf', slotName: 'fast', provider, slot }));

    const result = await resolved.instance.extractFromPdf(base64Data, slot);
    res.json({ result });
  } catch (error) {
    console.error(formatCallError({
      route: 'pdf', slotName: 'fast', provider, slot,
      ms: Date.now() - started, detail: describeError(error),
    }));
    sendError(res, error);
  }
});

app.get('/api/usage', (req, res) => {
  try {
    const { from, to, store, taskLabel, productName } = req.query;
    const rows = queryUsage({ from, to, store, taskLabel, productName });
    res.json({ rows });
  } catch (error) {
    console.error('[Usage] query error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// One row per GENERATION, not per LLM call — see the generation_log comment in usage/store.js.
// The client is the only party that knows how a whole generation ended (the server sees individual
// calls), so it reports the outcome here.
app.post('/api/usage/generation', (req, res) => {
  try {
    const { store, locale, productName, pipeline, outcome, repairsUsed } = req.body ?? {};
    if (!pipeline || !outcome) {
      return res.status(400).json({ error: 'pipeline and outcome are required' });
    }
    insertGeneration({ store, locale, productName, pipeline, outcome, repairsUsed });
    res.json({ ok: true });
  } catch (error) {
    console.error('[Usage] generation insert error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/usage/generations', (req, res) => {
  try {
    const { from, to, store, outcome, pipeline } = req.query;
    res.json({ rows: queryGenerations({ from, to, store, outcome, pipeline }) });
  } catch (error) {
    console.error('[Usage] generation query error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Retrieval routes ────────────────────────────────────────────────────────

app.post('/api/retrieval/url', async (req, res) => {
  try {
    const { url } = req.body;
    const content = await fetchUrl(url);
    res.json({ content });
  } catch (error) {
    console.error('[Retrieval] url error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/retrieval/search', async (req, res) => {
  try {
    const { query, num = 5 } = req.body;
    const results = await serper.search(query, num);
    res.json(results);
  } catch (error) {
    console.error('[Retrieval] search error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// A failed bind used to be near-silent: an older instance keeps the port, the Angular proxy
// keeps reaching *it*, and it answers every /api call from the .env snapshot it read at its
// own boot — so an edited API key looks like it was ignored, and the terminal you are
// watching prints nothing at all. Exiting non-zero also makes `concurrently` tear the whole
// `npm run dev` down instead of leaving the frontend talking to a stranger's backend — but
// only because the `dev` script passes `-k`. Without that flag concurrently just reports the
// dead child and lets its siblings run on, which is how half-stacks outlive their terminal
// and turn into orphans still holding a port.
//
// Since `npm run server` gained `--watch` (package.json — JSON takes no comments, so the reasoning
// lives here), node supervises this process and stays alive across an exit, which softens the
// tear-down above: a failed bind no longer takes `ng serve` down with it, and saving a fixed file
// restarts the server on its own. Two things `--watch` does NOT cover:
//   • `.env` — dotenv READS it, so it is not part of the module graph node watches. Editing a key
//     still needs a manual restart, which is what the `.env` stamp on the boot line is for.
//   • an in-flight generation — saving a server file mid-run kills that request. Accepted: its
//     result would have come from the code you just replaced.
let bindFailed = false;

const server = app.listen(PORT, () => {
  // The dual-stack bind emits 'listening' for one socket *before* the other one's
  // EADDRINUSE arrives, so logging success synchronously here would print a reassuring
  // line on a conflict. One tick of delay lets the error land first and suppress it.
  setImmediate(() => {
    if (bindFailed) return;
    console.log(`[Server] Running on http://localhost:${PORT}`);

    // Which commit this process is actually executing. `npm run server` now passes `--watch`, so
    // server code reloads like client code — but a log without this line cannot PROVE it did, and
    // that is what turned a loaded-vs-disk mismatch into a session-long misdiagnosis on 2026-08-02.
    // See server/utils/build-info.js.
    console.log(formatBuild(readBuild()));

    // The old line here printed LLM_PROVIDER and called it "provider", which has been wrong
    // since the settings menu landed: it is the fallback for a request that carries no
    // settings, not what serves your calls. A terminal reading `(provider: gemini)` while every
    // Deep call went to Claude was correct output that looked like a broken configuration.
    const inventory = warmProviders();
    const summary = inventory
      .map(p => p.ready ? `${p.id} ✓ ready`
        : p.hasKey ? `${p.id} ✗ ${p.error}`
        : `${p.id} ✗ no ${p.envVar}`)
      .join(' | ');
    console.log(`[Server] Providers: ${summary}`);
    console.log(`[Server] Fallback for requests that carry no settings: ${LLM_PROVIDER} (LLM_PROVIDER). `
      + `Each request picks its own provider per slot — see the [LLM] lines below.`);
  });
});

server.on('error', (error) => {
  bindFailed = true;
  if (error.code === 'EADDRINUSE') {
    console.error(
      `[Server] Port ${PORT} is already in use. Another server/index.js is still running and ` +
      `will serve /api with ITS OWN .env snapshot — stop that process first.`
    );
  } else {
    console.error('[Server] listen error:', error.message);
  }
  process.exit(1);
});
