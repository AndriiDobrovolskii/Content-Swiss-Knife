import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

// Seam for the one #effort branch no catalog model can reach any more (a model that lists `max`):
// findModel is real unless a test installs an override. The provider under test stays real.
let findModelOverride: ((provider: string, id: string) => unknown) | undefined;
vi.mock('../server/providers/model-support.js', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, findModel: (p: string, id: string) => findModelOverride?.(p, id) ?? actual.findModel(p, id) };
});

const { AnthropicProvider } = await import('../server/providers/anthropic.js');

const CACHED_PAYLOAD = {
  systemBlocks: [{ text: 'MASTER', cache: true }, { text: 'TASK A', cache: true }],
  userContent: 'Product: Bambu X1C',
};

const DEEP = { model: 'claude-sonnet-5', level: 'medium', maxOutputTokens: 64000 };
const FAST = { model: 'claude-haiku-4-5', level: 'disabled', maxOutputTokens: 16000 };
const DEEP_55 = { model: 'claude-sonnet-5-5', level: 'high', maxOutputTokens: 128000 };

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
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative', DEEP_55);
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

    expect(streamCalls[0].config.model).toBe('claude-sonnet-5-5');
    const message2 = warn.mock.calls.map(c => c.join(' ')).join('\n');
    expect(message2).toContain('claude-sonnet-4-6');
    expect(message2).toContain('claude-sonnet-5-5');
  });
});

/**
 * US-4.1 — claude-sonnet-5-5 request shape (FR-6, FR-10, FR-10a, FR-11, FR-12).
 *
 * Sonnet 5.5 answers HTTP 400 to `thinking: { type: 'disabled' }`, to non-default sampling
 * parameters and to forced tool use, so the guard is on the REQUEST the provider builds. The
 * vendor SDK is mocked at the boundary above; the provider under test is real.
 */
const SONNET_55_LEVELS = ['between_tools', 'low', 'medium', 'high', 'xhigh'] as const;
const slot55 = (level: string) => ({ model: 'claude-sonnet-5-5', level, maxOutputTokens: 128000 });

describe('AnthropicProvider claude-sonnet-5-5 thinking mapping (FR-10, FR-11)', () => {
  beforeEach(() => { streamCalls.length = 0; createCalls.length = 0; nextMessage = message('<p>ok</p>'); });

  it('FR-10: sends thinking between_tools with no output_config, display, budget_tokens or block_binding', async () => {
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative', slot55('between_tools'));
    const { config } = streamCalls[0];

    expect(config.model).toBe('claude-sonnet-5-5');
    expect(config.thinking).toEqual({ type: 'between_tools' });
    expect(config.thinking).not.toHaveProperty('display');
    expect(config.thinking).not.toHaveProperty('budget_tokens');
    expect(config.thinking).not.toHaveProperty('block_binding');
    expect(config).not.toHaveProperty('output_config');
    expect(config.max_tokens).toBe(128000);
  });

  it('FR-10: maps a level of disabled (request that bypassed the clamp) to between_tools, never disabled', async () => {
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative', slot55('disabled'));
    const { config } = streamCalls[0];

    expect(config.thinking).toEqual({ type: 'between_tools' });
    expect(config).not.toHaveProperty('output_config');
  });

  it.each(['low', 'medium', 'high', 'xhigh'])('FR-11: sends adaptive thinking, display omitted and exactly effort %s', async (level) => {
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative', slot55(level));
    const { config } = streamCalls[0];

    expect(config.thinking).toEqual({ type: 'adaptive', display: 'omitted' });
    expect(config.output_config).toEqual({ effort: level });
  });

  it('FR-11: maps minimal onto low effort on claude-sonnet-5-5', async () => {
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative', slot55('minimal'));
    expect(streamCalls[0].config.thinking).toEqual({ type: 'adaptive', display: 'omitted' });
    expect(streamCalls[0].config.output_config).toEqual({ effort: 'low' });
  });

  it('FR-10: keeps thinking disabled on models that still use it (Haiku, Sonnet 5)', async () => {
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'text', FAST);
    expect(streamCalls[0].config.thinking).toEqual({ type: 'disabled' });

    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'text',
      { model: 'claude-sonnet-5', level: 'disabled', maxOutputTokens: 64000 });
    expect(streamCalls[1].config.thinking).toEqual({ type: 'disabled' });
  });

  it('FR-10: never combines between_tools with effort, and never sends disabled, in any generate mode or level', async () => {
    const p = new AnthropicProvider('k');
    for (const mode of ['text', 'json', 'creative', 'creative-json'] as const) {
      nextMessage = message(mode.includes('json') ? '{"a":1}' : '<p>ok</p>');
      for (const level of [...SONNET_55_LEVELS, 'max', 'disabled', 'minimal']) {
        await p.generate(CACHED_PAYLOAD, mode, slot55(level));
      }
    }
    expect(streamCalls.length).toBe(4 * 8);
    for (const { config } of streamCalls) expect(config.output_config?.effort).not.toBe('max');
    for (const { config } of streamCalls) {
      expect(config.thinking.type).not.toBe('disabled');
      if (config.thinking.type === 'between_tools') {
        expect(config).not.toHaveProperty('output_config');
        expect(Object.keys(config.thinking)).toEqual(['type']);
      }
      if (config.output_config) expect(config.thinking.type).toBe('adaptive');
    }
  });
});

/**
 * US-4.1 v3 (D3', FR-11): Sonnet 5.5 has no `max` effort, so the provider must never put it on the
 * wire for a model whose catalog levels lack it, even when a request bypassed the clamp.
 */
describe('AnthropicProvider never sends effort max for a model without it (D3)', () => {
  beforeEach(() => { streamCalls.length = 0; createCalls.length = 0; nextMessage = message('<p>ok</p>'); });
  afterEach(() => { vi.unstubAllEnvs(); findModelOverride = undefined; });

  it('FR-11: a slot with level max that bypassed the clamp sends xhigh via generate', async () => {
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative', slot55('max'));
    expect(streamCalls[0].config.thinking).toEqual({ type: 'adaptive', display: 'omitted' });
    expect(streamCalls[0].config.output_config).toEqual({ effort: 'xhigh' });
  });

  it('FR-11: a slot with level max that bypassed the clamp sends xhigh via analyzeImage', async () => {
    await new AnthropicProvider('k').analyzeImage('B64', 'image/jpeg', 'Describe', true, slot55('max'));
    expect(createCalls[0].config.output_config).toEqual({ effort: 'xhigh' });
  });

  it('FR-11: the FALLBACK_DEEP slot with ANTHROPIC_THINKING_EFFORT=max sends xhigh', async () => {
    vi.stubEnv('ANTHROPIC_MODEL_THINKING', '');
    vi.stubEnv('ANTHROPIC_THINKING_EFFORT', 'max');
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative');
    expect(streamCalls[0].config.model).toBe('claude-sonnet-5-5');
    expect(streamCalls[0].config.output_config).toEqual({ effort: 'xhigh' });
  });

  it('FR-11: an id absent from the catalog with level max sends xhigh', async () => {
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative',
      { model: 'claude-from-the-future', level: 'max', maxOutputTokens: 64000 });
    expect(streamCalls[0].config.output_config).toEqual({ effort: 'xhigh' });
  });

  it('FR-11: no claude-sonnet-5-5 request body contains effort max at any input level', async () => {
    const p = new AnthropicProvider('k');
    for (const level of ['disabled', 'between_tools', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']) {
      await p.generate(CACHED_PAYLOAD, 'creative', slot55(level));
    }
    expect(streamCalls.length).toBe(8);
    for (const { config } of streamCalls) expect(JSON.stringify(config)).not.toContain('"effort":"max"');
  });

  // Pass-through branch: no catalog model lists max after v3, so the only way to reach it is a
  // findModel override. This documents the contract; it is green before and after the rework.
  it('FR-11: passes max through unchanged when the model catalog entry lists max (mocked findModel)', async () => {
    findModelOverride = (_p, id) => (id === 'claude-fake-max'
      ? { id, levels: ['low', 'high', 'max'], defaultLevel: 'high', maxOutputTokens: 64000 } : undefined);
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative',
      { model: 'claude-fake-max', level: 'max', maxOutputTokens: 64000 });
    expect(streamCalls[0].config.output_config).toEqual({ effort: 'max' });
  });
});

describe('AnthropicProvider claude-sonnet-5-5 request-shape guard (FR-12, NFR-7)', () => {
  beforeEach(() => { streamCalls.length = 0; nextMessage = message('<p>ok</p>'); });

  it.each(SONNET_55_LEVELS)('FR-12: carries no sampling fields and no forced tool_choice at level %s', async (level) => {
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative', slot55(level));
    const { config } = streamCalls[0];

    expect(config).not.toHaveProperty('temperature');
    expect(config).not.toHaveProperty('top_p');
    expect(config).not.toHaveProperty('top_k');
    expect(['any', 'tool']).not.toContain(config.tool_choice?.type);
    expect(config.thinking.type).not.toBe('disabled');
    expect(config.thinking).not.toHaveProperty('budget_tokens');
  });

  it('FR-12: carries the same guard on the cache-free (plain endpoint) request', async () => {
    await new AnthropicProvider('k').generate({ systemBlocks: [{ text: 'PLAIN' }], userContent: 'hi' }, 'text', slot55('high'));
    const { config } = streamCalls[0];
    expect(streamCalls[0].beta).toBe(false);
    for (const field of ['temperature', 'top_p', 'top_k', 'tool_choice']) expect(config).not.toHaveProperty(field);
  });

  // NFR-7 is an UNVERIFIED vendor assumption, not tested live; this only pins that the header is
  // still sent on 5.5 and prompt-cache block separation is intact (NFR-2).
  it('NFR-7 / NFR-2: keeps the 1h-cache beta header and the cache breakpoints on claude-sonnet-5-5', async () => {
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative', slot55('high'));
    expect(streamCalls[0].beta).toBe(true);
    expect(streamCalls[0].config.betas).toEqual(['extended-cache-ttl-2025-04-11']);
    expect(streamCalls[0].config.system).toEqual([
      { type: 'text', text: 'MASTER', cache_control: { type: 'ephemeral', ttl: '1h' } },
      { type: 'text', text: 'TASK A', cache_control: { type: 'ephemeral', ttl: '1h' } },
    ]);
  });
});

describe('AnthropicProvider claude-sonnet-5-5 vision and pdf (FR-10, FR-10a)', () => {
  beforeEach(() => { createCalls.length = 0; nextMessage = message('  A grey 3D printer.  '); });

  // The plan chose to keep the existing no-thinking caption budget (1000) when thinking is
  // between_tools; the Specification only requires that it is explicit, defined and within
  // maxOutputTokens, so both the chosen value and the ceiling are asserted.
  it.each(['disabled', 'between_tools'])('FR-10a: sizes max_tokens for a no-thinking caption at level %s', async (level) => {
    await new AnthropicProvider('k').analyzeImage('B64', 'image/jpeg', 'Describe', false, slot55(level));
    const { config } = createCalls[0];

    expect(config.thinking).toEqual({ type: 'between_tools' });
    expect(config).not.toHaveProperty('output_config');
    expect(config.max_tokens).toBe(1000);
    expect(config.max_tokens).toBeLessThanOrEqual(128000);
  });

  it('FR-10a: keeps the thinking-enabled caption budget at high', async () => {
    await new AnthropicProvider('k').analyzeImage('B64', 'image/jpeg', 'Describe', true, slot55('high'));
    const { config } = createCalls[0];

    expect(config.thinking).toEqual({ type: 'adaptive', display: 'omitted' });
    expect(config.max_tokens).toBe(8000);
  });

  it('FR-10a: never exceeds the model ceiling on a small-ceiling model', async () => {
    await new AnthropicProvider('k').analyzeImage('B64', 'image/jpeg', 'Describe', false,
      { model: 'claude-sonnet-5-5', level: 'between_tools', maxOutputTokens: 500 });
    expect(createCalls[0].config.max_tokens).toBeLessThanOrEqual(500);
  });

  it('FR-10a: leaves the Haiku no-thinking caption shape unchanged', async () => {
    await new AnthropicProvider('k').analyzeImage('B64', 'image/jpeg', 'Describe', false, FAST);
    expect(createCalls[0].config.thinking).toEqual({ type: 'disabled' });
    expect(createCalls[0].config.max_tokens).toBe(1000);
  });

  it('FR-10: pins pdf extraction to between_tools on claude-sonnet-5-5, never disabled', async () => {
    await new AnthropicProvider('k').extractFromPdf('PDF64', slot55('high'));
    expect(createCalls[0].config.thinking).toEqual({ type: 'between_tools' });
    expect(createCalls[0].config.max_tokens).toBe(4096);
  });

  it('FR-10: keeps pdf extraction on disabled for Haiku', async () => {
    await new AnthropicProvider('k').extractFromPdf('PDF64', FAST);
    expect(createCalls[0].config.thinking).toEqual({ type: 'disabled' });
  });
});

describe('AnthropicProvider thinking-model fallback (FR-6)', () => {
  beforeEach(() => { streamCalls.length = 0; nextMessage = message('<p>ok</p>'); });
  afterEach(() => vi.unstubAllEnvs());

  it('resolves to claude-sonnet-5-5 when ANTHROPIC_MODEL_THINKING is unset', async () => {
    vi.stubEnv('ANTHROPIC_MODEL_THINKING', '');
    vi.stubEnv('ANTHROPIC_THINKING_EFFORT', '');
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative');
    const { config } = streamCalls[0];

    expect(config.model).toBe('claude-sonnet-5-5');
    expect(config.max_tokens).toBe(128000);
    expect(config.thinking).toEqual({ type: 'adaptive', display: 'omitted' });
    expect(config.output_config).toEqual({ effort: 'medium' });
  });

  it('uses the set value when ANTHROPIC_MODEL_THINKING is set', async () => {
    vi.stubEnv('ANTHROPIC_MODEL_THINKING', 'claude-sonnet-5');
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative');
    expect(streamCalls[0].config.model).toBe('claude-sonnet-5');
  });
});
