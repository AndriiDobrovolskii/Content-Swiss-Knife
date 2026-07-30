import { GoogleGenAI } from '@google/genai';
import { withRetry } from '../utils/retry.js';
import { normalizePayload } from '../utils/payload.js';
import { parseJsonResponse } from '../utils/json-parse.js';
import { PDF_EXTRACT_PROMPT } from '../utils/pdf-prompt.js';
import { clampLevel, resolveSlot } from './model-support.js';

// Used when a caller doesn't pass a slot (direct unit-test calls, or a request that
// predates the settings menu). Gemini 3.1 Pro cannot disable thinking at all.
const FALLBACK_DEEP = () => resolveSlot('gemini', { model: 'gemini-3.1-pro-preview' });
const FALLBACK_FAST = () => resolveSlot('gemini', { model: 'gemini-3.6-flash', level: 'minimal' });

export class GeminiProvider {
  constructor(apiKey) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Read the visible answer, and fail loudly on a truncated or blocked response — the same
   * contract AnthropicProvider honours. A half-written artifact must never reach the
   * validator or the repair gate looking like a valid one.
   */
  #readText(response, model, what) {
    const finish = response.candidates?.[0]?.finishReason;
    if (finish === 'MAX_TOKENS') {
      throw new Error(
        `[gemini] ${what} truncated: hit maxOutputTokens on ${model}. ` +
        `Raise the model's maxOutputTokens in model-catalog.json or lower the thinking level.`
      );
    }
    if (finish === 'SAFETY' || finish === 'PROHIBITED_CONTENT' || finish === 'BLOCKLIST') {
      throw new Error(`[gemini] ${what} blocked by safety filter (${finish}) on ${model}.`);
    }
    return response.text || '';
  }

  /**
   * Gemini bills thinking tokens at the full output rate, so thoughtsTokenCount has to be
   * folded into outputTokens or the cost dashboard under-reports every deep call.
   * Gemini's implicit caching has no per-token write charge, hence cacheWriteTokens: 0.
   */
  #usage(response, model, mode) {
    const u = response.usageMetadata || {};
    return {
      model,
      mode,
      inputTokens: u.promptTokenCount ?? 0,
      outputTokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
      cacheWriteTokens: 0,
      cacheReadTokens: u.cachedContentTokenCount ?? 0,
    };
  }

  async generate(payload, mode = 'text', slot) {
    const isCreative = mode === 'creative' || mode === 'creative-json';
    const { model, level, maxOutputTokens } = slot || (isCreative ? FALLBACK_DEEP() : FALLBACK_FAST());
    const isJson = mode === 'json' || mode === 'creative-json';

    return withRetry(async () => {
      const { systemBlocks = [], userContent = '' } = normalizePayload(payload);

      const response = await this.ai.models.generateContent({
        model,
        contents: userContent,
        config: {
          // The system blocks belong in systemInstruction, NOT concatenated into contents.
          // Gemini's implicit context caching keys on a stable prompt prefix, so keeping the
          // master + task instructions in their own stable field is what lets the `cache: true`
          // breakpoints pay off here the way they do on Anthropic.
          systemInstruction: systemBlocks.filter(b => b?.text).map(b => b.text).join('\n\n') || undefined,
          maxOutputTokens,
          thinkingConfig: { thinkingLevel: level },
          ...(isJson ? { responseMimeType: 'application/json' } : {}),
        },
      });

      const text = this.#readText(response, model, mode);
      const usage = this.#usage(response, model, mode);
      console.log('[gemini]', model, mode, `thinking=${level}`,
        { in: usage.inputTokens, out: usage.outputTokens, cr: usage.cacheReadTokens });

      return { result: isJson ? parseJsonResponse(text || '{}') : text, usage };
    });
  }

  async analyzeImage(base64Data, mimeType, prompt, useThinking = false, slot) {
    const { model, level, maxOutputTokens } = slot || (useThinking ? FALLBACK_DEEP() : FALLBACK_FAST());

    return withRetry(async () => {
      const response = await this.ai.models.generateContent({
        model,
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: prompt }
          ]
        },
        config: {
          // The caption is <= 20 words, but thinking tokens draw from the same budget.
          maxOutputTokens: Math.min(8000, maxOutputTokens),
          thinkingConfig: { thinkingLevel: level },
        },
      });
      return this.#readText(response, model, 'vision').trim();
    });
  }

  async extractFromPdf(base64Data, slot) {
    const { model } = slot || FALLBACK_FAST();

    return withRetry(async () => {
      const response = await this.ai.models.generateContent({
        model,
        contents: {
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: base64Data } },
            { text: PDF_EXTRACT_PROMPT }
          ]
        },
        config: {
          maxOutputTokens: 8192,
          // Mechanical transcription — the cheapest depth this model allows. Clamped, because
          // Gemini 3.1 Pro rejects 'minimal' outright (its floor is 'low').
          thinkingConfig: { thinkingLevel: clampLevel('gemini', model, 'minimal') },
        },
      });
      return this.#readText(response, model, 'pdf');
    });
  }
}
