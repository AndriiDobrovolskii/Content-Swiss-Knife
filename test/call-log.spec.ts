/**
 * call-log.spec.ts
 *
 * WHY THIS EXISTS. Providers are per-slot: Deep on Anthropic and Fast on Gemini in the same run
 * is a supported configuration. The logs did not say so — the boot line printed LLM_PROVIDER
 * (only the no-settings fallback) and the per-call lines lived inside two of the three providers,
 * where the task label, slot, elapsed time and cost are all out of scope.
 *
 * These cases pin the formatter's decision points, not its prose: the shapes that differ between
 * providers, and the fields that are legitimately absent.
 */
import { describe, it, expect } from 'vitest';

import { formatCallStart, formatCallDone, formatCallError } from '../server/utils/call-log.js';

const DEEP = { model: 'claude-sonnet-5', level: 'medium', maxOutputTokens: 64000 };
const FAST = { model: 'gemini-3.6-flash', level: 'minimal', maxOutputTokens: 65536 };

describe('formatCallStart', () => {
  it('names the slot, provider, model and thinking level', () => {
    expect(formatCallStart({
      route: 'generate', taskLabel: 'Task A', lang: 'uk-UA', mode: 'creative',
      slotName: 'deep', provider: 'anthropic', slot: DEEP,
    })).toBe('[LLM] Task A · uk-UA · creative → deep: anthropic/claude-sonnet-5 (medium)');
  });

  // The whole point of the feature: one run, two providers. The two lines must be tellable apart.
  it('distinguishes the fast slot on a different provider', () => {
    expect(formatCallStart({
      route: 'generate', taskLabel: 'Task C', lang: 'en-US', mode: 'json',
      slotName: 'fast', provider: 'gemini', slot: FAST,
    })).toBe('[LLM] Task C · en-US · json → fast: gemini/gemini-3.6-flash (minimal)');
  });

  // Vision and PDF carry neither a task label nor a language. They must not print `undefined`.
  it('falls back to the route name and drops absent fields', () => {
    expect(formatCallStart({ route: 'vision', slotName: 'fast', provider: 'gemini', slot: FAST }))
      .toBe('[LLM] vision → fast: gemini/gemini-3.6-flash (minimal)');
  });

  // OpenAI has no catalog entry, so resolveRequest returns slot: null and the provider keeps its
  // own internal defaults. There is no model to name.
  it('degrades to the provider alone when there is no catalog slot', () => {
    expect(formatCallStart({ route: 'pdf', slotName: 'fast', provider: 'openai', slot: null }))
      .toBe('[LLM] pdf → fast: openai');
  });
});

describe('formatCallDone', () => {
  it('reports elapsed time, tokens and cost', () => {
    expect(formatCallDone({
      route: 'generate', taskLabel: 'Task A', ms: 47_200,
      usage: { inputTokens: 8431, outputTokens: 5204, cacheReadTokens: 7900, cacheWriteTokens: 0 },
      costUsd: 0.0912,
    })).toBe('[LLM] Task A done in 47.2s — in 8,431 (cache r/w 7,900/0) out 5,204 — $0.0912');
  });

  // Gemini never writes a cache and reports 0/0 every time; the clause would be pure noise.
  it('omits the cache clause when nothing was cached', () => {
    expect(formatCallDone({
      route: 'generate', taskLabel: 'Task C', ms: 6100,
      usage: { inputTokens: 4102, outputTokens: 3880, cacheReadTokens: 0, cacheWriteTokens: 0 },
      costUsd: 0.0031,
    })).toBe('[LLM] Task C done in 6.1s — in 4,102 out 3,880 — $0.0031');
  });

  /**
   * The shape that would have crashed the logger. AnthropicProvider assigns
   * `u.cache_creation_input_tokens` straight through, and the Anthropic SDK omits those fields
   * entirely on an uncached response — so they arrive `undefined`, not 0, unlike Gemini's
   * explicit zeros. Uncoerced this printed `undefined/undefined` and threw on toLocaleString().
   */
  it('treats undefined cache counters as zero instead of throwing', () => {
    expect(formatCallDone({
      route: 'generate', taskLabel: 'Task B', ms: 1500,
      usage: { inputTokens: 900, outputTokens: 120 },
      costUsd: 0.001,
    })).toBe('[LLM] Task B done in 1.5s — in 900 out 120 — $0.0010');
  });

  it('omits the cost when none was computed', () => {
    expect(formatCallDone({ route: 'vision', ms: 800, usage: { inputTokens: 10, outputTokens: 20 } }))
      .toBe('[LLM] vision done in 0.8s — in 10 out 20');
  });
});

describe('formatCallError', () => {
  // The thinking level stays on the failure line: a call that died at 'high' and one that died
  // at 'minimal' are different diagnoses, and this is often the only line anyone reads.
  it('names the slot, provider, model and level that failed, and how long it waited', () => {
    expect(formatCallError({
      route: 'generate', taskLabel: 'Task A', lang: 'uk-UA',
      slotName: 'deep', provider: 'anthropic', slot: DEEP,
      ms: 30_100, detail: 'fetch failed: ECONNRESET',
    })).toBe('[LLM] Task A · uk-UA → deep: anthropic/claude-sonnet-5 (medium) ✗ FAILED in 30.1s — fetch failed: ECONNRESET');
  });

  /**
   * resolveRequest() rejects an unknown provider with a BadRequest BEFORE provider and slot are
   * bound, so the catch has nothing to name. It must still report the failure rather than throw
   * a second error on top of the first.
   */
  it('degrades when the request failed before the provider was resolved', () => {
    expect(formatCallError({
      route: 'generate', taskLabel: 'Task A', slotName: 'deep',
      provider: undefined, slot: undefined,
      ms: 2, detail: 'Unknown LLM provider: "skynet".',
    })).toBe('[LLM] Task A → deep: unresolved ✗ FAILED in 0.0s — Unknown LLM provider: "skynet".');
  });

  it('survives an error with no detail', () => {
    expect(formatCallError({ route: 'pdf', slotName: 'fast', provider: 'gemini', slot: FAST, ms: 100 }))
      .toBe('[LLM] pdf → fast: gemini/gemini-3.6-flash (minimal) ✗ FAILED in 0.1s — unknown error');
  });
});
