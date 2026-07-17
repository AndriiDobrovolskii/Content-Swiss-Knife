import Anthropic from '@anthropic-ai/sdk';
import { withRetry } from '../utils/retry.js';
import { normalizePayload } from '../utils/payload.js';
import { parseJsonResponse } from '../utils/json-parse.js';
import { PDF_EXTRACT_PROMPT } from '../utils/pdf-prompt.js';

export class AnthropicProvider {
  constructor(apiKey, opts = {}) {
    this.client = new Anthropic({ apiKey });
    this.thinkingModel = opts.thinkingModel || process.env.ANTHROPIC_MODEL_THINKING || 'claude-sonnet-5';
    this.fastModel = opts.fastModel || process.env.ANTHROPIC_MODEL_FAST || 'claude-haiku-4-5';
    // Sonnet 5 defaults to effort 'high' (~= Sonnet 4.6 at 'max'). We pin 'medium',
    // which is the closest behavioral match to the previous Sonnet 4.6 @ high pass.
    this.thinkingEffort = opts.thinkingEffort || process.env.ANTHROPIC_THINKING_EFFORT || 'medium';
  }

  // Deep Thinking ON → mode 'creative'/'creative-json' → Sonnet. OFF → Haiku.
  #modelFor(mode) { return (mode === 'creative' || mode === 'creative-json') ? this.thinkingModel : this.fastModel; }

  // Turn our blocks into a cacheable Anthropic system array.
  #toSystem(blocks = []) {
    return blocks
      .filter(b => b && b.text)
      .map(b => ({ type: 'text', text: b.text, ...(b.cache ? { cache_control: { type: 'ephemeral', ttl: '1h' } } : {}) }));
  }

  // `effort` is a per-request override of this.thinkingEffort — 'disabled' means Sonnet 5
  // with thinking off (no output_config sent at all); 'low'/'medium'/'high' means adaptive
  // thinking at that depth. Falls back to the fixed this.thinkingEffort when omitted, so
  // callers that don't pass it (e.g. analyzeImage) keep their current behavior. Ignored on
  // non-creative modes — Haiku never runs thinking.
  async generate(payload, mode = 'text', effort) {
    const { systemBlocks = [], userContent = '' } = normalizePayload(payload);

    return withRetry(async () => {
      const isCreative = mode === 'creative' || mode === 'creative-json';
      const config = {
        // Sonnet 5's tokenizer emits ~30% more tokens for the same text, and max_tokens
        // caps thinking + response text combined. 64000 leaves headroom for both.
        // Non-creative modes route to Haiku (old tokenizer, no thinking) — unchanged.
        model: this.#modelFor(mode),
        max_tokens: isCreative ? 64000 : 16000,
        system: this.#toSystem(systemBlocks),
        messages: [{ role: 'user', content: userContent }],
      };
      if (isCreative) {
        if (effort === 'disabled') {
          config.thinking = { type: 'disabled' };
        } else {
          config.thinking = { type: 'adaptive' };
          config.output_config = { effort: effort || this.thinkingEffort };
        }
      }

      const hasCacheBlocks = systemBlocks.some(b => b?.cache);
      const stream = hasCacheBlocks
        ? this.client.beta.messages.stream({ betas: ['extended-cache-ttl-2025-04-11'], ...config })
        : this.client.messages.stream(config);
      const response = await stream.finalMessage();

      // Fail loudly. A truncated or refused response must never reach the validator
      // or the repair gate as if it were a valid artifact.
      if (response.stop_reason === 'max_tokens') {
        throw new Error(
          `[anthropic] output truncated: hit max_tokens (${config.max_tokens}) on ${config.model} / ${mode}. ` +
          `Raise max_tokens or lower output_config.effort.`
        );
      }
      if (response.stop_reason === 'refusal') {
        throw new Error(`[anthropic] request refused by safety classifier on ${config.model} / ${mode}.`);
      }

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
      const model = useThinking ? this.thinkingModel : this.fastModel;
      const config = {
        model,
        // Sonnet 5: max_tokens caps thinking + response text COMBINED. Deep Thinking ON runs
        // adaptive thinking, so the ceiling must leave room for reasoning AND the caption;
        // 300 (the old value) starved either the thinking or the answer. The caption itself is
        // tiny (<= 20 words), so 8000 is pure headroom against truncation, not a cost — only
        // tokens actually generated bill. OFF path (Haiku, thinking disabled) needs the caption
        // budget only.
        max_tokens: useThinking ? 8000 : 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } },
            { type: 'text', text: prompt }
          ]
        }]
      };
      if (useThinking) {
        // Deep Thinking ON → Sonnet 5. Adaptive thinking lets the model reason about the image
        // (identify the subject, read on-image text, pick the single most useful sentence)
        // before writing a concise best-practice alt caption. Manual thinking with
        // budget_tokens is a 400 error on Sonnet 5 — adaptive + effort is the only supported
        // mode. Reuses the pipeline's pinned effort ('medium') for behavioral consistency with
        // generate().
        config.thinking = { type: 'adaptive' };
        config.output_config = { effort: this.thinkingEffort };
      } else {
        // Deep Thinking OFF → Haiku. Sonnet 5 would run adaptive thinking if `thinking` were
        // omitted, so pin it disabled; no-op on the Haiku path. Nothing competes with the caption.
        config.thinking = { type: 'disabled' };
      }

      const response = await this.client.messages.create(config);

      // Same fail-loud contract as generate(): a truncated or refused caption must never reach
      // the manifest as if valid. On a throw the client falls back to filename-derived alt text.
      if (response.stop_reason === 'max_tokens') {
        throw new Error(
          `[anthropic] vision output truncated: hit max_tokens (${config.max_tokens}) on ${model}. ` +
          `Raise max_tokens or lower output_config.effort.`
        );
      }
      if (response.stop_reason === 'refusal') {
        throw new Error(`[anthropic] vision request refused by safety classifier on ${model}.`);
      }

      // Return only visible text blocks; adaptive thinking emits separate thinking blocks
      // (display defaults to 'omitted' on Sonnet 5) that must never be spliced into the caption.
      return response.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
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