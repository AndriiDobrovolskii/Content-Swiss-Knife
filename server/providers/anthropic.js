import Anthropic from '@anthropic-ai/sdk';
import { withRetry } from '../utils/retry.js';
import { normalizePayload } from '../utils/payload.js';
import { parseJsonResponse } from '../utils/json-parse.js';
import { PDF_EXTRACT_PROMPT } from '../utils/pdf-prompt.js';
import { resolveSlot } from './model-support.js';

// Fallback slot used when a caller doesn't pass one (direct unit-test calls, a request that
// predates the settings menu). Mirrors the historical env-driven defaults.
const FALLBACK_DEEP = () => resolveSlot('anthropic', {
  model: process.env.ANTHROPIC_MODEL_THINKING || 'claude-sonnet-5',
  level: process.env.ANTHROPIC_THINKING_EFFORT || 'medium',
});
const FALLBACK_FAST = () => resolveSlot('anthropic', {
  model: process.env.ANTHROPIC_MODEL_FAST || 'claude-haiku-4-5',
  level: 'disabled',
});

export class AnthropicProvider {
  constructor(apiKey) {
    this.client = new Anthropic({ apiKey });
  }

  // Turn our blocks into a cacheable Anthropic system array.
  #toSystem(blocks = []) {
    return blocks
      .filter(b => b && b.text)
      .map(b => ({ type: 'text', text: b.text, ...(b.cache ? { cache_control: { type: 'ephemeral', ttl: '1h' } } : {}) }));
  }

  // Translate a catalog thinking level into Anthropic's request shape.
  // 'disabled' → thinking off, no output_config at all. Everything else → adaptive thinking
  // at that effort. Manual thinking with budget_tokens is a 400 on Sonnet 5; adaptive +
  // output_config.effort is the only supported form.
  #thinkingConfig(level) {
    if (level === 'disabled') return { thinking: { type: 'disabled' } };
    // Anthropic has no 'minimal'; the catalog never offers it for a Claude model, but clamp
    // defensively so a hand-rolled request can't produce a 400.
    const effort = level === 'minimal' ? 'low' : level;
    return { thinking: { type: 'adaptive' }, output_config: { effort } };
  }

  /**
   * `slot` is the resolved { model, level, maxOutputTokens } for this call, chosen by the
   * settings menu and validated server-side. Deep Thinking Mode picks which slot; this
   * provider no longer decides the model from `mode`.
   */
  async generate(payload, mode = 'text', slot) {
    const { systemBlocks = [], userContent = '' } = normalizePayload(payload);
    const isCreative = mode === 'creative' || mode === 'creative-json';
    const { model, level, maxOutputTokens } = slot || (isCreative ? FALLBACK_DEEP() : FALLBACK_FAST());

    return withRetry(async () => {
      const config = {
        model,
        // The model's real output ceiling. max_tokens caps thinking + response text combined
        // on Sonnet 5, so this must leave room for both.
        max_tokens: maxOutputTokens,
        system: this.#toSystem(systemBlocks),
        messages: [{ role: 'user', content: userContent }],
        ...this.#thinkingConfig(level),
      };

      const hasCacheBlocks = systemBlocks.some(b => b?.cache);
      const stream = hasCacheBlocks
        ? this.client.beta.messages.stream({ betas: ['extended-cache-ttl-2025-04-11'], ...config })
        : this.client.messages.stream(config);
      const response = await stream.finalMessage();

      // Fail loudly. A truncated or refused response must never reach the validator
      // or the repair gate as if it were a valid artifact.
      if (response.stop_reason === 'max_tokens') {
        throw new Error(
          `[anthropic] output truncated: hit max_tokens (${config.max_tokens}) on ${model} / ${mode}. ` +
          `Raise the model's maxOutputTokens in model-catalog.json or lower the thinking level.`
        );
      }
      if (response.stop_reason === 'refusal') {
        throw new Error(`[anthropic] request refused by safety classifier on ${model} / ${mode}.`);
      }

      const u = response.usage || {};
      console.log('[anthropic]', model, mode, `thinking=${level}`,
        { in: u.input_tokens, out: u.output_tokens, cw: u.cache_creation_input_tokens, cr: u.cache_read_input_tokens });

      const usage = {
        model,
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

  async analyzeImage(base64Data, mimeType, prompt, useThinking = false, slot) {
    const { model, level, maxOutputTokens } = slot || (useThinking ? FALLBACK_DEEP() : FALLBACK_FAST());

    return withRetry(async () => {
      const thinking = this.#thinkingConfig(level);
      const config = {
        model,
        // The caption itself is tiny (<= 20 words), but max_tokens caps thinking + text
        // combined, so a thinking run needs real headroom. Only tokens actually generated
        // bill, so the ceiling is free insurance against truncation.
        max_tokens: thinking.thinking.type === 'disabled' ? 1000 : Math.min(8000, maxOutputTokens),
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } },
            { type: 'text', text: prompt }
          ]
        }],
        ...thinking,
      };

      const response = await this.client.messages.create(config);

      // Same fail-loud contract as generate(): a truncated or refused caption must never reach
      // the manifest as if valid. On a throw the client falls back to filename-derived alt text.
      if (response.stop_reason === 'max_tokens') {
        throw new Error(
          `[anthropic] vision output truncated: hit max_tokens (${config.max_tokens}) on ${model}. ` +
          `Raise max_tokens or lower the thinking level.`
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

  async extractFromPdf(base64Data, slot) {
    const { model } = slot || FALLBACK_FAST();
    return withRetry(async () => {
      const response = await this.client.messages.create({
        model,
        max_tokens: 4096,
        // Extraction is mechanical transcription. Pin thinking off — Sonnet 5 runs adaptive
        // thinking when `thinking` is omitted, which would eat this small budget if a
        // thinking-capable model is assigned to the Fast slot. No-op on Haiku.
        thinking: { type: 'disabled' },
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
