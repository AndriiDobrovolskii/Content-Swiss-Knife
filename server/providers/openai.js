import OpenAI from 'openai';
import { pdfToText } from '../utils/pdf.js';
import { withRetry } from '../utils/retry.js';
import { normalizePayload } from '../utils/payload.js';
import { parseJsonResponse } from '../utils/json-parse.js';

export class OpenAiProvider {
  constructor(apiKey, model = 'gpt-4o') {
    this._apiKey = apiKey;
    this._client = null;
    this.model = model;
  }

  get client() {
    if (!this._client) this._client = new OpenAI({ apiKey: this._apiKey });
    return this._client;
  }

  async generate(payload, mode = 'text') {
    return withRetry(async () => {
      const { systemBlocks = [], userContent = '' } = normalizePayload(payload);
      const system = systemBlocks.map(b => b.text).join('\n\n');
      const openaiMessages = [];
      if (system) openaiMessages.push({ role: 'system', content: system });
      openaiMessages.push({ role: 'user', content: userContent });
      const config = {
        model: this.model,
        messages: openaiMessages,
      };

      if (mode === 'json') {
        config.response_format = { type: 'json_object' };
        config.temperature = 0.15;
      } else if (mode === 'creative') {
        config.temperature = 0.8;
        config.max_tokens = 16384;
      } else {
        config.temperature = 0.4;
        config.max_tokens = 8192;
      }

      const response = await this.client.chat.completions.create(config);

      // Fail loudly on truncation — the same contract AnthropicProvider and GeminiProvider honour.
      // This provider was the odd one out: it handed a cut-off response straight to
      // parseJsonResponse, where a half-written artifact could parse into a structurally valid
      // object with fields simply missing. On the Doc path zod would catch that; SEO metadata,
      // slugs and keywords have no such gate and would have shipped the partial.
      const finish = response.choices[0].finish_reason;
      if (finish === 'length') {
        throw new Error(
          `[openai] output truncated: hit max_tokens (${config.max_tokens ?? 'model default'}) on ` +
          `${config.model} / ${mode}. Raise max_tokens for this mode, or shorten the input.`
        );
      }
      if (finish === 'content_filter') {
        throw new Error(`[openai] response blocked by content filter on ${config.model} / ${mode}.`);
      }

      const text = response.choices[0].message.content || '';

      const result = mode === 'json' ? parseJsonResponse(text) : text;
      return { result, usage: null };
    });
  }

  async analyzeImage(base64Data, mimeType, prompt) {
    return withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            { type: 'text', text: prompt }
          ]
        }],
        max_tokens: 300,
      });
      return response.choices[0].message.content || '';
    });
  }

  async extractFromPdf(base64Data) {
    // OpenAI doesn't natively support PDFs — extract text via pdf-parse then refine with LLM
    const rawText = await pdfToText(base64Data);
    return withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{
          role: 'user',
          content: `Extract the full product description and technical specifications from the following PDF text. Return them as clean plain text.\n\n${rawText.substring(0, 12000)}`
        }],
        max_tokens: 4096,
      });
      return response.choices[0].message.content || rawText;
    });
  }
}
