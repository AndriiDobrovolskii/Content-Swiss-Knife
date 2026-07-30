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

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      stream: (config: any) => { streamCalls.push({ config, beta: false }); return { finalMessage: async () => nextMessage }; },
      create: async (config: any) => { createCalls.push(config); return nextMessage; },
    };
    beta = {
      messages: {
        stream: (config: any) => { streamCalls.push({ config, beta: true }); return { finalMessage: async () => nextMessage }; },
      },
    };
  },
}));

vi.mock('../server/utils/retry.js', () => ({ withRetry: (fn: any) => fn() }));

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
  it('sends adaptive thinking plus effort for a level', async () => {
    await new AnthropicProvider('k').generate(CACHED_PAYLOAD, 'creative', DEEP);
    const { config } = streamCalls[0];

    expect(config.model).toBe('claude-sonnet-5');
    expect(config.thinking).toEqual({ type: 'adaptive' });
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
    expect(createCalls[0].max_tokens).toBe(8000);
    expect(createCalls[0].thinking).toEqual({ type: 'adaptive' });

    await p.analyzeImage('B64', 'image/jpeg', 'Describe', false, FAST);
    expect(createCalls[1].max_tokens).toBe(1000);
    expect(createCalls[1].thinking).toEqual({ type: 'disabled' });
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
    expect(createCalls[0].thinking).toEqual({ type: 'disabled' });
    expect(createCalls[0].max_tokens).toBe(4096);
  });
});
