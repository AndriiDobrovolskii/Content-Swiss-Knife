/**
 * openai-provider.spec.ts
 *
 * OpenAiProvider had no spec at all, while the other two providers each had one. Two things worth
 * covering are now load-bearing:
 *
 * 1. THE TRUNCATION GUARD. `parseJsonResponse` deliberately refuses to complete a cut-off document,
 *    which is only safe because every provider throws on truncation BEFORE parsing. This provider
 *    was the last one without that check — it handed a cut-off response straight to the parser,
 *    where a half-written artifact could parse into a structurally valid object with fields simply
 *    missing. On the Doc path zod catches that; SEO metadata, slugs and keywords have no schema
 *    gate and would have shipped the partial.
 *
 * 2. REQUEST BOUNDS. The SDK defaults to a 10-minute timeout with its own retry loop, which
 *    multiplies with withRetry's 3 attempts. See server/utils/timeouts.js.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const calls: any[] = [];
const ctorArgs: any[] = [];
let nextResponse: any;

vi.mock('openai', () => ({
  default: class {
    constructor(opts: any) { ctorArgs.push(opts); }
    chat = {
      completions: {
        create: async (config: any, options?: any) => { calls.push({ config, options }); return nextResponse; },
      },
    };
  },
}));

// Retry would re-run a throwing call and turn one assertion failure into several.
vi.mock('../server/utils/retry.js', () => ({ withRetry: (fn: any) => fn() }));

const { OpenAiProvider } = await import('../server/providers/openai.js');

function reply(content: string, finish_reason = 'stop') {
  return { choices: [{ message: { content }, finish_reason }] };
}

const PAYLOAD = {
  systemBlocks: [{ text: 'MASTER', cache: true }, { text: 'TASK A', cache: true }],
  userContent: 'Product: Bambu X1C',
};

describe('OpenAiProvider fails loud', () => {
  beforeEach(() => { calls.length = 0; nextResponse = reply('<p>ok</p>'); });

  /**
   * The regression that matters: a truncated response must not reach parseJsonResponse, which no
   * longer completes cut-off documents and would otherwise surface a confusing parse error instead
   * of the real cause.
   */
  it('throws on truncation rather than parsing a half-written artifact', async () => {
    nextResponse = reply('{"hook":"half', 'length');
    await expect(new OpenAiProvider('k', 'gpt-4o').generate(PAYLOAD, 'json'))
      .rejects.toThrow(/truncated/i);
  });

  it('names max_tokens in the truncation error so the fix is obvious', async () => {
    nextResponse = reply('<p>half', 'length');
    await expect(new OpenAiProvider('k', 'gpt-4o').generate(PAYLOAD, 'creative'))
      .rejects.toThrow(/max_tokens/);
  });

  it('throws when the content filter blocks the response', async () => {
    nextResponse = reply('', 'content_filter');
    await expect(new OpenAiProvider('k', 'gpt-4o').generate(PAYLOAD, 'text'))
      .rejects.toThrow(/content filter/i);
  });

  it('returns the text on a normal stop', async () => {
    const { result } = await new OpenAiProvider('k', 'gpt-4o').generate(PAYLOAD, 'text');
    expect(result).toBe('<p>ok</p>');
  });
});

describe('OpenAiProvider request bounds', () => {
  beforeEach(() => { calls.length = 0; ctorArgs.length = 0; nextResponse = reply('<p>ok</p>'); });

  it('disables the SDK retry loop and sets a client-level timeout', () => {
    // The client is lazily constructed, so touching the getter is what builds it.
    void new OpenAiProvider('k', 'gpt-4o').client;
    expect(ctorArgs[0].maxRetries).toBe(0);
    expect(ctorArgs[0].timeout).toBe(600_000);
  });

  it('gives a deep call the long timeout', async () => {
    await new OpenAiProvider('k', 'gpt-4o').generate(PAYLOAD, 'creative');
    expect(calls[0].options.timeout).toBe(600_000);
  });

  it('gives a fast call the short timeout', async () => {
    await new OpenAiProvider('k', 'gpt-4o').generate(PAYLOAD, 'text');
    expect(calls[0].options.timeout).toBe(120_000);
  });
});
