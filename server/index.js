import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { resolveRequest as resolveLlmRequest, slotFor } from './llm-request.js';
import { SerperRetrieval } from './retrieval/serper.js';
import { fetchUrl } from './retrieval/fetcher.js';
import { computeCost } from './usage/pricing.js';
import { insertUsage, queryUsage } from './usage/store.js';

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

function sendError(res, error, tag) {
  const status = error.status || 500;
  console.error(`[${tag}] error:`, error.message);
  res.status(status).json({ error: error.message });
}

// ── LLM routes ─────────────────────────────────────────────────────────────

app.post('/api/llm/generate', async (req, res) => {
  try {
    const { systemBlocks = [], userContent = '', mode = 'text', taskLabel, productName, store, lang } = req.body;
    const { provider, instance, slot } = resolveRequest(req.body, slotFor(mode));
    const { result, usage } = await instance.generate({ systemBlocks, userContent }, mode, slot);

    if (usage) {
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
          costUsd: computeCost(usage.model, usage),
        });
      } catch (usageError) {
        // Persistence must never fail the actual generation response to the caller.
        console.error('[Usage] failed to record usage:', usageError.message);
      }
    }

    res.json({ result });
  } catch (error) {
    sendError(res, error, 'LLM generate');
  }
});

app.post('/api/llm/vision', async (req, res) => {
  try {
    const { base64Data, mimeType, prompt, useThinking = false } = req.body;
    // Vision has no `mode`, so Deep Thinking Mode picks the slot directly.
    const { instance, slot } = resolveRequest(req.body, useThinking ? 'deep' : 'fast');
    const result = await instance.analyzeImage(base64Data, mimeType, prompt, useThinking, slot);
    res.json({ result });
  } catch (error) {
    sendError(res, error, 'LLM vision');
  }
});

app.post('/api/llm/pdf', async (req, res) => {
  try {
    const { base64Data } = req.body;
    // Extraction is mechanical transcription — always the cheap slot.
    const { instance, slot } = resolveRequest(req.body, 'fast');
    const result = await instance.extractFromPdf(base64Data, slot);
    res.json({ result });
  } catch (error) {
    sendError(res, error, 'LLM pdf');
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

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT} (provider: ${process.env.LLM_PROVIDER || 'openai'})`);
});
