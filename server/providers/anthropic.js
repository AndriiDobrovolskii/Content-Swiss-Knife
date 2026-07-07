import Anthropic from '@anthropic-ai/sdk';
import { withRetry } from '../utils/retry.js';
import { normalizePayload } from '../utils/payload.js';
import { parseJsonResponse } from '../utils/json-parse.js';
import { PDF_EXTRACT_PROMPT } from '../utils/pdf-prompt.js';

export class AnthropicProvider {
  constructor(apiKey, opts = {}) {
    this.client = new Anthropic({ apiKey });
    this.thinkingModel = opts.thinkingModel || process.env.ANTHROPIC_MODEL_THINKING || 'claude-sonnet-4-6';
    this.fastModel     = opts.fastModel     || process.env.ANTHROPIC_MODEL_FAST     || 'claude-haiku-4-5';
  }

  // Deep Thinking ON → mode 'creative'/'creative-json' → Sonnet. OFF → Haiku.
  #modelFor(mode) { return (mode === 'creative' || mode === 'creative-json') ? this.thinkingModel : this.fastModel; }

  // Turn our blocks into a cacheable Anthropic system array.
  #toSystem(blocks = []) {
    return blocks
      .filter(b => b && b.text)
      .map(b => ({ type: 'text', text: b.text, ...(b.cache ? { cache_control: { type: 'ephemeral', ttl: '1h' } } : {}) }));
  }

  async generate(payload, mode = 'text') {
    const { systemBlocks = [], userContent = '' } = normalizePayload(payload);

    return withRetry(async () => {
      const isCreative = mode === 'creative' || mode === 'creative-json';
      const config = {
        model: this.#modelFor(mode),
        max_tokens: isCreative ? 32000 : 16000,
        system: this.#toSystem(systemBlocks),
        messages: [{ role: 'user', content: userContent }],
      };
      if (isCreative) config.thinking = { type: 'enabled', budget_tokens: 6000 };

      const hasCacheBlocks = systemBlocks.some(b => b?.cache);
      const stream = hasCacheBlocks
        ? this.client.beta.messages.stream({ betas: ['extended-cache-ttl-2025-04-11'], ...config })
        : this.client.messages.stream(config);
      const response = await stream.finalMessage();

      const u = response.usage || {};
      console.log('[anthropic]', config.model, mode,
        { in: u.input_tokens, out: u.output_tokens, cw: u.cache_creation_input_tokens, cr: u.cache_read_input_tokens });

      const usage = {
        model: config.model,
        mode,
        inputTokens: u.input_tokens,
        outputTokens: u.output_tokens,
        cacheWriteTokens: u.cache_creation_input_tokens,
        cacheReadTokens: u.cache_read_input_tokens,
      };

      const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
      const result = (mode === 'json' || mode === 'creative-json') ? parseJsonResponse(text) : text;
      return { result, usage };
    });
  }

  async analyzeImage(base64Data, mimeType, prompt, useThinking = false) {
    return withRetry(async () => {
      const response = await this.client.messages.create({
        model: useThinking ? this.thinkingModel : this.fastModel,
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } },
            { type: 'text', text: prompt }
          ]
        }]
      });
      return response.content.find(b => b.type === 'text')?.text || '';
    });
  }

  async extractFromPdf(base64Data) {
    return withRetry(async () => {
      const response = await this.client.messages.create({
        model: this.fastModel,
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64Data }
            },
            { type: 'text', text: PDF_EXTRACT_PROMPT }
          ]
        }]
      });
      return response.content.find(b => b.type === 'text')?.text || '';
    });
  }
}
