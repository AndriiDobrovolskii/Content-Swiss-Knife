import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { createProvider } from './providers/factory.js';
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

const provider = createProvider(LLM_PROVIDER);
const serper = new SerperRetrieval(process.env.SERPER_API_KEY);

// ── LLM routes ─────────────────────────────────────────────────────────────

app.post('/api/llm/generate', async (req, res) => {
  try {
    const { systemBlocks = [], userContent = '', mode = 'text', effort, taskLabel, productName, store, lang } = req.body;
    const { result, usage } = await provider.generate({ systemBlocks, userContent }, mode, effort);

    if (usage) {
      try {
        insertUsage({
          provider: LLM_PROVIDER,
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
    console.error('[LLM] generate error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/llm/vision', async (req, res) => {
  try {
    const { base64Data, mimeType, prompt, useThinking = false } = req.body;
    const result = await provider.analyzeImage(base64Data, mimeType, prompt, useThinking);
    res.json({ result });
  } catch (error) {
    console.error('[LLM] vision error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/llm/pdf', async (req, res) => {
  try {
    const { base64Data } = req.body;
    const result = await provider.extractFromPdf(base64Data);
    res.json({ result });
  } catch (error) {
    console.error('[LLM] pdf error:', error.message);
    res.status(500).json({ error: error.message });
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
