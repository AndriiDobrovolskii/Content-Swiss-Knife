import { describe, it, expect, beforeEach, vi } from 'vitest';

const streamCalls: any[] = [];
const createCalls: any[] = [];
let nextMessage: any;

function message(text: string, extra: Record<string, any> = {}) {
  return {
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    usage: { input_tokens: 100, output_tokens: 20, cache_creation_input_tokens: 5, cache_read_input_tokens: 80 },
    ...extra,
  };
}

/** Constructor options, so the client-level timeout and retry settings can be asserted. */
const ctorArgs: any[] = [];

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    constructor(opts: any) { ctorArgs.push(opts); }
    messages = {
      stream: (config: any, options?: any) => { streamCalls.push({ config, options, beta: false }); return { finalMessage: async () => nextMessage }; },
      create: async (config: any, options?: any) => { createCalls.push({ config, options }); return nextMessage; },
    };
    beta = {
      messages: {
        stream: (config: any, options?: any) => { streamCalls.push({ config, options, beta: true }); return { finalMessage: async () => nextMessage }; },
      },
    };
  },
}));

// Backed by a vi.fn() (not a bare factory) so the fallback-wiring tests below can inspect what
// `generate()` passed as the `fallback` argument, or make the mock actually invoke it.
const withRetryMock = vi.fn((fn: any, _maxRetries?: any, _baseDelayMs?: any, _fallback?: any, _maxPolicyRetries?: any) => fn());
vi.mock('../server/utils/retry.js', () => ({
  withRetry: (fn: any, maxRetries?: any, baseDelayMs?: any, fallback?: any, maxPolicyRetries?: any) =>
    withRetryMock(fn, maxRetries, baseDelayMs, fallback, maxPolicyRetries),
}));

const { AnthropicProvider } = await import('../server/providers/anthropic.js');

const CACHED_PAYLOAD = {
  systemBlocks: [{ text: 'MASTER', cache: true }, { text: 'TASK A', cache: true }],
  userContent: 'Product: Bambu X1C',
};

const DEEP = { model: 'claude-sonnet-5', level: 'medium', maxOutputTokens: 64000 };
const FAST = { model: 'claude-haiku-4-5', level: 'disabled', maxOutputTokens: 16000 };

describe('AnthropicProvider thinking configuration', () => {
  beforeEach(() => { streamCalls.length = 0; createCalls.length = 0; nextMessage = message('<p>ok</p>'); });

  // Sonnet 5 rejects manual budget_tokens; adaptive + output_config.effort is the only
  // supported form. This is the exact shape the pre-settings code sent at 'medium'.
  // display is pinned because the catalog spans models whose defaults disagree ('omitted'
  // on Sonnet 5, 'summarized' on Sonnet 4.6) and nothing here surfaces reasoning.
  it('sends adaptive thinking plus effort for a level', async () => {
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative', DEEP);
    const { config } = streamCalls[0];

    expect(config.model).toBe('claude-sonnet-5');
    expect(config.thinking).toEqual({ type: 'adaptive', display: 'omitted' });
    expect(config.output_config).toEqual({ effort: 'medium' });
    expect(config.max_tokens).toBe(64000);
  });

  it('sends thinking disabled with no output_config at all', async () => {
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'text', FAST);
    const { config } = streamCalls[0];

    expect(config.model).toBe('claude-haiku-4-5');
    expect(config.thinking).toEqual({ type: 'disabled' });
    expect(config).not.toHaveProperty('output_config');
    expect(config.max_tokens).toBe(16000);
  });

  // Anthropic's API has no 'minimal' effort. The catalog never offers it for a Claude model,
  // but a hand-rolled request must not produce a 400.
  it('maps minimal onto low rather than sending it verbatim', async () => {
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative', { ...DEEP, level: 'minimal' });
    expect(streamCalls[0].config.output_config).toEqual({ effort: 'low' });
  });

  // Free slot assignment means Sonnet can land in the Fast slot; max_tokens must follow the
  // model, not the mode, or a thinking-capable model gets a 16000 ceiling.
  it('takes max_tokens from the model, not the mode', async () => {
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'text', { model: 'claude-sonnet-5', level: 'low', maxOutputTokens: 64000 });
    expect(streamCalls[0].config.max_tokens).toBe(64000);
    expect(streamCalls[0].config.output_config).toEqual({ effort: 'low' });
  });
});

describe('AnthropicProvider prompt caching', () => {
  beforeEach(() => { streamCalls.length = 0; nextMessage = message('<p>ok</p>'); });

  // Collapsing the cache breakpoints would silently multiply the bill; guard the shape.
  it('marks cache breakpoints and uses the 1h-TTL beta endpoint', async () => {
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative', DEEP);

    expect(streamCalls[0].beta).toBe(true);
    expect(streamCalls[0].config.system).toEqual([
      { type: 'text', text: 'MASTER', cache_control: { type: 'ephemeral', ttl: '1h' } },
      { type: 'text', text: 'TASK A', cache_control: { type: 'ephemeral', ttl: '1h' } },
    ]);
  });

  it('uses the plain endpoint when nothing is cacheable', async () => {
    await new AnthropicProvider('k').generate({ systemBlocks: [{ text: 'PLAIN' }], userContent: 'hi' }, 'text', FAST);

    expect(streamCalls[0].beta).toBe(false);
    expect(streamCalls[0].config.system).toEqual([{ type: 'text', text: 'PLAIN' }]);
  });

  it('reports cache read and write tokens for the dashboard', async () => {
    const { usage } = await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative', DEEP);
    expect(usage).toEqual({
      model: 'claude-sonnet-5', mode: 'creative',
      inputTokens: 100, outputTokens: 20, cacheWriteTokens: 5, cacheReadTokens: 80,
    });
  });
});

describe('AnthropicProvider fails loud', () => {
  beforeEach(() => { streamCalls.length = 0; });

  it('throws on truncation instead of returning half an artifact', async () => {
    nextMessage = message('<p>half', { stop_reason: 'max_tokens' });
    await expect(new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative', DEEP))
      .rejects.toThrow(/truncated/i);
  });

  it('throws on a safety refusal', async () => {
    nextMessage = message('', { stop_reason: 'refusal' });
    await expect(new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative', DEEP))
      .rejects.toThrow(/refused/i);
  });
});

describe('AnthropicProvider vision and pdf', () => {
  beforeEach(() => { createCalls.length = 0; nextMessage = message('  A grey 3D printer.  '); });

  it('gives a thinking run real headroom and a non-thinking run just the caption budget', async () => {
    const p = new AnthropicProvider('k');

    await p.analyzeImage('B64', 'image/jpeg', 'Describe', true, DEEP);
    expect(createCalls[0].config.max_tokens).toBe(8000);
    expect(createCalls[0].config.thinking).toEqual({ type: 'adaptive', display: 'omitted' });

    await p.analyzeImage('B64', 'image/jpeg', 'Describe', false, FAST);
    expect(createCalls[1].config.max_tokens).toBe(1000);
    expect(createCalls[1].config.thinking).toEqual({ type: 'disabled' });
  });

  it('returns only visible text, never a thinking block', async () => {
    nextMessage = message('A grey 3D printer.', {
      content: [{ type: 'thinking', thinking: 'internal reasoning' }, { type: 'text', text: 'A grey 3D printer.' }],
    });
    const alt = await new AnthropicProvider('k').analyzeImage('B64', 'image/jpeg', 'Describe', true, DEEP);

    expect(alt).toBe('A grey 3D printer.');
    expect(alt).not.toContain('internal reasoning');
  });

  // PDF extraction has a small 4096 budget. Sonnet 5 runs adaptive thinking when `thinking`
  // is omitted, which would eat that budget if it is assigned to the Fast slot.
  it('pins thinking off for pdf extraction', async () => {
    await new AnthropicProvider('k').extractFromPdf('PDF64', { model: 'claude-sonnet-5', level: 'high', maxOutputTokens: 64000 });
    expect(createCalls[0].config.thinking).toEqual({ type: 'disabled' });
    expect(createCalls[0].config.max_tokens).toBe(4096);
  });
});

/**
 * See server/utils/timeouts.js. The SDK defaults to a 10-minute timeout AND `maxRetries: 2`, and
 * its own docs warn that "request timeouts are retried by default, so in a worst-case scenario you
 * may wait much longer than this timeout." Stacked on withRetry's 3 attempts, a hung call was
 * effectively unbounded. Retry policy belongs in withRetry alone (architecture rule #5).
 *
 * Literals, not the shared constant: a test that reads the same constant as the code proves only
 * that the constant equals itself.
 */
describe('AnthropicProvider request bounds', () => {
  beforeEach(() => { streamCalls.length = 0; createCalls.length = 0; ctorArgs.length = 0; nextMessage = message('<p>ok</p>'); });

  it('disables the SDK retry loop and sets a client-level timeout', () => {
    new AnthropicProvider('k');
    expect(ctorArgs[0].maxRetries).toBe(0);
    expect(ctorArgs[0].timeout).toBe(1_200_000);
  });

  it('gives a deep call the long timeout', async () => {
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative', DEEP);
    expect(streamCalls[0].options.timeout).toBe(1_200_000);
  });

  it('gives a fast call the short timeout', async () => {
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'text', FAST);
    expect(streamCalls[0].options.timeout).toBe(120_000);
  });

  // A thinking caption is capped at 8000 tokens and cannot run for twenty minutes, so it gets its
  // own budget rather than the deep one. Pinned because the two were the same constant until the
  // deep timeout was raised, and sharing it again would silently widen the hang window once per
  // image in a manifest.
  it('gives a thinking vision call the vision timeout, not the deep one', async () => {
    await new AnthropicProvider('k').analyzeImage('B64', 'image/jpeg', 'Describe', true, DEEP);
    expect(createCalls[0].options.timeout).toBe(600_000);
  });
});

/**
 * Same-provider model fallback: when a sustained 503/429 exhausts withRetry's policy budget, it
 * invokes the `fallback` thunk `generate()` handed it. See server/utils/retry.js and the
 * 2026-08-17 incident this was added for (sustained provider "high demand" errors).
 */
describe('AnthropicProvider same-provider fallback', () => {
  beforeEach(() => {
    streamCalls.length = 0;
    nextMessage = message('<p>ok</p>');
    withRetryMock.mockReset();
    withRetryMock.mockImplementation((fn: any) => fn());
  });

  // DEEP/FAST above already equal what FALLBACK_DEEP()/FALLBACK_FAST() resolve to (no env
  // overrides in the test run), so they're the natural no-op case: switching to "the alternate
  // model" would just mean the same model again.
  it('does not build a fallback when the configured slot already is the fallback model', async () => {
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative', DEEP);
    expect(withRetryMock.mock.calls[0][3]).toBeUndefined();
  });

  it('builds a fallback to the alternate model when the slot differs', async () => {
    await new AnthropicProvider('k')
      .generate(CACHED_PAYLOAD, 'creative', { model: 'claude-sonnet-4-6', level: 'medium', maxOutputTokens: 32000 });
    expect(typeof withRetryMock.mock.calls[0][3]).toBe('function');
  });

  it('invokes the fallback against the alternate model and logs both model names', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    withRetryMock.mockImplementationOnce((fn: any, _max: any, _base: any, fallback: any) => (fallback ? fallback() : fn()));

    await new AnthropicProvider('k')
      .generate(CACHED_PAYLOAD, 'creative', { model: 'claude-sonnet-4-6', level: 'medium', maxOutputTokens: 32000 });

    expect(streamCalls[0].config.model).toBe('claude-sonnet-5');
    const message2 = warn.mock.calls.map(c => c.join(' ')).join('\n');
    expect(message2).toContain('claude-sonnet-4-6');
    expect(message2).toContain('claude-sonnet-5');
  });
});
