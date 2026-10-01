import { describe, it, expect, beforeEach, vi } from 'vitest';

/** Captures what the provider hands to the SDK, and replays a canned response. */
const calls: any[] = [];
let nextResponse: any;

/** Constructor options, so the client-level timeout and retry settings can be asserted. */
const ctorArgs: any[] = [];

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor(opts: any) { ctorArgs.push(opts); }
    models = {
      generateContent: async (req: any) => {
        calls.push(req);
        return nextResponse;
      },
    };
  },
}));

// Retry would re-run a throwing call and turn one assertion failure into four. Backed by a
// vi.fn() (not a bare factory) so the fallback-wiring tests below can inspect what `generate()`
// passed as the `fallback` argument, or make the mock actually invoke it.
const withRetryMock = vi.fn((fn: any, _maxRetries?: any, _baseDelayMs?: any, _fallback?: any, _maxPolicyRetries?: any) => fn());
vi.mock('../server/utils/retry.js', () => ({
  withRetry: (fn: any, maxRetries?: any, baseDelayMs?: any, fallback?: any, maxPolicyRetries?: any) =>
    withRetryMock(fn, maxRetries, baseDelayMs, fallback, maxPolicyRetries),
}));

const { GeminiProvider } = await import('../server/providers/gemini.js');

function reply(text: string, extra: Record<string, any> = {}) {
  return {
    text,
    candidates: [{ finishReason: 'STOP' }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 5, cachedContentTokenCount: 80 },
    ...extra,
  };
}

const PAYLOAD = {
  systemBlocks: [{ text: 'MASTER', cache: true }, { text: 'TASK A', cache: true }],
  userContent: 'Product: Bambu X1C',
};

describe('GeminiProvider request shape', () => {
  beforeEach(() => { calls.length = 0; nextResponse = reply('<p>ok</p>'); });

  const provider = () => new GeminiProvider('test-key');

  // System blocks must stay in their own stable field: Gemini's implicit context caching
  // keys on a stable prompt prefix, and concatenating them into `contents` defeats it.
  it('puts system blocks in systemInstruction, not contents', async () => {
    await provider().generate(PAYLOAD, 'creative', { model: 'gemini-3.1-pro-preview', level: 'medium', maxOutputTokens: 65536 });

    expect(calls[0].config.systemInstruction).toBe('MASTER\n\nTASK A');
    expect(calls[0].contents).toBe('Product: Bambu X1C');
    expect(calls[0].contents).not.toContain('MASTER');
  });

  it('forwards the slot model, thinking level and output ceiling', async () => {
    await provider().generate(PAYLOAD, 'creative', { model: 'gemini-3.6-flash', level: 'minimal', maxOutputTokens: 65536 });

    expect(calls[0].model).toBe('gemini-3.6-flash');
    expect(calls[0].config.thinkingConfig).toEqual({ thinkingLevel: 'minimal' });
    expect(calls[0].config.maxOutputTokens).toBe(65536);
  });

  // thinkingBudget is deprecated in favour of thinkingLevel; sending both is an error.
  it('never sends the deprecated thinkingBudget', async () => {
    await provider().generate(PAYLOAD, 'text', { model: 'gemini-3.6-flash', level: 'low', maxOutputTokens: 65536 });
    expect(calls[0].config.thinkingConfig).not.toHaveProperty('thinkingBudget');
  });

  it('requests JSON only for the json modes', async () => {
    const p = provider();
    nextResponse = reply('{"a":1}');
    await p.generate(PAYLOAD, 'creative-json', { model: 'gemini-3.6-flash', level: 'low', maxOutputTokens: 65536 });
    expect(calls[0].config.responseMimeType).toBe('application/json');

    nextResponse = reply('<p>x</p>');
    await p.generate(PAYLOAD, 'creative', { model: 'gemini-3.6-flash', level: 'low', maxOutputTokens: 65536 });
    expect(calls[1].config.responseMimeType).toBeUndefined();
  });

  it('parses JSON responses and returns text otherwise', async () => {
    const p = provider();
    nextResponse = reply('{"meta_title":"X"}');
    const json = await p.generate(PAYLOAD, 'json', { model: 'gemini-3.6-flash', level: 'low', maxOutputTokens: 65536 });
    expect(json.result).toEqual({ meta_title: 'X' });

    nextResponse = reply('<p>hello</p>');
    const text = await p.generate(PAYLOAD, 'text', { model: 'gemini-3.6-flash', level: 'low', maxOutputTokens: 65536 });
    expect(text.result).toBe('<p>hello</p>');
  });
});

describe('GeminiProvider usage accounting', () => {
  beforeEach(() => { calls.length = 0; nextResponse = reply('<p>ok</p>'); });

  // Google bills reasoning at the full output rate, so thoughts must be folded into
  // outputTokens or every deep call under-reports its cost.
  it('folds thinking tokens into outputTokens', async () => {
    const { usage } = await new GeminiProvider('k')
      .generate(PAYLOAD, 'creative', { model: 'gemini-3.1-pro-preview', level: 'high', maxOutputTokens: 65536 });

    expect(usage).toEqual({
      model: 'gemini-3.1-pro-preview',
      mode: 'creative',
      inputTokens: 100,
      outputTokens: 25,        // 20 candidates + 5 thoughts
      cacheWriteTokens: 0,     // Gemini implicit caching has no per-token write charge
      cacheReadTokens: 80,
    });
  });

  it('reports zeroes rather than NaN when usageMetadata is absent', async () => {
    nextResponse = { text: 'x', candidates: [{ finishReason: 'STOP' }] };
    const { usage } = await new GeminiProvider('k')
      .generate(PAYLOAD, 'text', { model: 'gemini-3.6-flash', level: 'low', maxOutputTokens: 65536 });

    expect(usage.inputTokens).toBe(0);
    expect(usage.outputTokens).toBe(0);
  });
});

/**
 * #readText's explicit `parts.filter(p => !p.thought ...)` — mirrors AnthropicProvider's own
 * explicit `.filter(b => b.type === 'text')` instead of trusting the SDK's `.text` convenience
 * getter to keep excluding thought parts implicitly forever. No `thinkingConfig` call in this
 * provider sets `includeThoughts`, so `parts` never carries a `thought: true` entry today — this
 * proves the filter works if that ever changes, not that it currently fires in production.
 */
describe('GeminiProvider thought-part filtering', () => {
  beforeEach(() => { calls.length = 0; });

  it('excludes a thought part from the returned text', async () => {
    nextResponse = reply('ignored-by-parts-path', {
      candidates: [{
        finishReason: 'STOP',
        content: { parts: [{ thought: true, text: 'internal reasoning' }, { text: 'the real answer' }] },
      }],
    });
    const { result } = await new GeminiProvider('k')
      .generate(PAYLOAD, 'text', { model: 'gemini-3.6-flash', level: 'low', maxOutputTokens: 65536 });
    expect(result).toBe('the real answer');
  });

  it('falls back to response.text only when parts is absent, not when parts filtered to empty', async () => {
    // parts present but ONLY a thought part — must yield '', not fall through to response.text.
    nextResponse = reply('should-not-be-used', {
      candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'internal reasoning' }] } }],
    });
    const { result: onlyThought } = await new GeminiProvider('k')
      .generate(PAYLOAD, 'text', { model: 'gemini-3.6-flash', level: 'low', maxOutputTokens: 65536 });
    expect(onlyThought).toBe('');

    // parts absent entirely — the legacy response.text fallback still applies.
    nextResponse = reply('legacy path', { candidates: [{ finishReason: 'STOP' }] });
    const { result: legacy } = await new GeminiProvider('k')
      .generate(PAYLOAD, 'text', { model: 'gemini-3.6-flash', level: 'low', maxOutputTokens: 65536 });
    expect(legacy).toBe('legacy path');
  });
});

describe('GeminiProvider fails loud', () => {
  beforeEach(() => { calls.length = 0; });

  // A truncated artifact must never reach the validator or the repair gate looking valid —
  // the same contract AnthropicProvider honours.
  it('throws on a truncated response instead of returning half an artifact', async () => {
    nextResponse = reply('<p>half', { candidates: [{ finishReason: 'MAX_TOKENS' }] });
    await expect(
      new GeminiProvider('k').generate(PAYLOAD, 'creative', { model: 'gemini-3.1-pro-preview', level: 'high', maxOutputTokens: 65536 }),
    ).rejects.toThrow(/truncated/i);
  });

  it('throws when the safety filter blocks the response', async () => {
    nextResponse = reply('', { candidates: [{ finishReason: 'SAFETY' }] });
    await expect(
      new GeminiProvider('k').generate(PAYLOAD, 'text', { model: 'gemini-3.6-flash', level: 'low', maxOutputTokens: 65536 }),
    ).rejects.toThrow(/blocked by safety/i);
  });
});

describe('GeminiProvider vision and pdf', () => {
  beforeEach(() => { calls.length = 0; nextResponse = reply('  A grey 3D printer.  '); });

  it('sends the image inline with the slot model and level', async () => {
    const alt = await new GeminiProvider('k')
      .analyzeImage('BASE64', 'image/jpeg', 'Describe', true, { model: 'gemini-3.1-pro-preview', level: 'medium', maxOutputTokens: 65536 });

    expect(alt).toBe('A grey 3D printer.');
    expect(calls[0].model).toBe('gemini-3.1-pro-preview');
    expect(calls[0].config.thinkingConfig).toEqual({ thinkingLevel: 'medium' });
    expect(calls[0].config.maxOutputTokens).toBe(8000);
    expect(calls[0].contents.parts[0].inlineData).toEqual({ mimeType: 'image/jpeg', data: 'BASE64' });
  });

  // PDF extraction asks for the cheapest depth — but Gemini 3.1 Pro rejects 'minimal'
  // outright, so it must be clamped to that model's floor instead of hard-coded.
  it('clamps the pdf thinking level to what the model accepts', async () => {
    const p = new GeminiProvider('k');
    await p.extractFromPdf('PDF64', { model: 'gemini-3.6-flash', level: 'medium', maxOutputTokens: 65536 });
    expect(calls[0].config.thinkingConfig).toEqual({ thinkingLevel: 'minimal' });

    await p.extractFromPdf('PDF64', { model: 'gemini-3.1-pro-preview', level: 'medium', maxOutputTokens: 65536 });
    expect(calls[1].config.thinkingConfig).toEqual({ thinkingLevel: 'low' });
  });
});

/**
 * A hung provider call must stay bounded, and retry policy belongs in exactly one
 * provider-independent place — `withRetry`, per architecture rule #5.
 *
 * ⚠ `retryOptions` MUST BE ABSENT, not set to `{ attempts: 1 }`. An earlier version of this test
 * asserted the opposite, on the premise that `attempts` "defaults to 5" and would stack with
 * withRetry's 3 into 15 issues of one request. The SDK source disproves it — `apiCall`
 * (dist/node/index.mjs:13305) enters its pRetry wrapper ONLY when `retryOptions` is present:
 *
 *     if (!httpOptions || !httpOptions.retryOptions) return fetch(url, requestInit);
 *
 * So the default was never reachable; passing `{ attempts: 1 }` OPTED IN to a dormant wrapper. And
 * inside it a retryable status becomes `throw new Error('Retryable HTTP Error: ' + statusText)` —
 * a bare Error with no `status` — thrown before `throwErrorIfNotOK` can build the real `ApiError`.
 * That is what silently un-retried a 504 on 2026-08-02 and lost a live generation's specs
 * grounding. Omitting the option disables the loop AND preserves the status.
 *
 * The values are asserted as literals rather than against the shared constant: a test that reads
 * the same constant as the code proves only that the constant equals itself.
 */
describe('GeminiProvider request bounds', () => {
  beforeEach(() => { calls.length = 0; ctorArgs.length = 0; nextResponse = reply('<p>ok</p>'); });

  it('leaves the SDK retry wrapper disengaged and sets a client-level timeout', () => {
    new GeminiProvider('test-key');
    expect(ctorArgs[0].httpOptions.retryOptions).toBeUndefined();
    expect(ctorArgs[0].httpOptions.timeout).toBe(1_200_000);
  });

  /**
   * The deep slot must stay generous. The 2026-08-01 run emitted 17,940 output tokens in a single
   * `creative-json` call — minutes of work — so a short cap would abort legitimate generations.
   */
  it('gives a deep call the long timeout', async () => {
    nextResponse = reply('{"ok":1}');   // creative-json parses its reply
    await new GeminiProvider('k')
      .generate(PAYLOAD, 'creative-json', { model: 'gemini-3.1-pro-preview', level: 'high', maxOutputTokens: 65536 });
    expect(calls[0].config.httpOptions.timeout).toBe(1_200_000);
  });

  it('gives a fast call the short timeout', async () => {
    await new GeminiProvider('k')
      .generate(PAYLOAD, 'text', { model: 'gemini-3.6-flash', level: 'minimal', maxOutputTokens: 8192 });
    expect(calls[0].config.httpOptions.timeout).toBe(120_000);
  });
});

/**
 * Same-provider model fallback: when a sustained 503/429 exhausts withRetry's policy budget, it
 * invokes the `fallback` thunk `generate()` handed it. See server/utils/retry.js and the
 * 2026-08-17 incident this was added for (sustained Gemini 503 "high demand").
 */
describe('GeminiProvider same-provider fallback', () => {
  beforeEach(() => {
    calls.length = 0;
    nextResponse = reply('<p>ok</p>');
    withRetryMock.mockReset();
    withRetryMock.mockImplementation((fn: any) => fn());
  });

  it('does not build a fallback when the configured slot already is the fallback model', async () => {
    await new GeminiProvider('k')
      .generate(PAYLOAD, 'creative', { model: 'gemini-3.1-pro-preview', level: 'medium', maxOutputTokens: 65536 });

    expect(withRetryMock.mock.calls[0][3]).toBeUndefined();
  });

  it('builds a fallback to the alternate model when the slot differs', async () => {
    await new GeminiProvider('k')
      .generate(PAYLOAD, 'creative', { model: 'gemini-3.6-flash', level: 'medium', maxOutputTokens: 65536 });

    expect(typeof withRetryMock.mock.calls[0][3]).toBe('function');
  });

  it('invokes the fallback against the alternate model and logs both model names', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    withRetryMock.mockImplementationOnce((fn: any, _max: any, _base: any, fallback: any) => (fallback ? fallback() : fn()));

    await new GeminiProvider('k')
      .generate(PAYLOAD, 'creative', { model: 'gemini-3.6-flash', level: 'medium', maxOutputTokens: 65536 });

    expect(calls[0].model).toBe('gemini-3.1-pro-preview');
    const message = warn.mock.calls.map(c => c.join(' ')).join('\n');
    expect(message).toContain('gemini-3.6-flash');
    expect(message).toContain('gemini-3.1-pro-preview');
  });
});

/**
 * US-4.1 — gemini-3.8-flash as the Fast fallback and the `minimal` clamp (FR-5, FR-7, FR-8, NFR-6).
 * Gemini 3.8 Flash answers with an error to thinking level `minimal`, so no request may carry it.
 */
const FLASH_38 = (level: string) => ({ model: 'gemini-3.8-flash', level, maxOutputTokens: 65536 });

describe('GeminiProvider FALLBACK_FAST (FR-7)', () => {
  beforeEach(() => {
    calls.length = 0;
    nextResponse = reply('<p>ok</p>');
    withRetryMock.mockReset();
    withRetryMock.mockImplementation((fn: any) => fn());
  });

  it('runs a slot-less fast call on gemini-3.8-flash at low, never minimal', async () => {
    await new GeminiProvider('k').generate(PAYLOAD, 'text');

    expect(calls[0].model).toBe('gemini-3.8-flash');
    expect(calls[0].config.thinkingConfig).toEqual({ thinkingLevel: 'low' });
    expect(calls[0].config.maxOutputTokens).toBe(65536);
  });

  it('runs slot-less pdf extraction and vision on gemini-3.8-flash without minimal', async () => {
    const p = new GeminiProvider('k');
    await p.extractFromPdf('PDF64');
    await p.analyzeImage('B64', 'image/jpeg', 'Describe', false);

    for (const call of calls) {
      expect(call.model).toBe('gemini-3.8-flash');
      expect(call.config.thinkingConfig.thinkingLevel).not.toBe('minimal');
    }
  });

  it('keeps the slot-less deep fallback on gemini-3.1-pro-preview', async () => {
    await new GeminiProvider('k').generate(PAYLOAD, 'creative');
    expect(calls[0].model).toBe('gemini-3.1-pro-preview');
  });

  // NFR-6: a request that carries settings and one that carries none must route identically.
  it('NFR-6: matches the client Fast-slot default in provider, model and level', async () => {
    localStorage.clear();
    const { ModelSettingsService } = await import('../src/services/model-settings.service');
    const clientFast = new ModelSettingsService().snapshot().fast;

    await new GeminiProvider('k').generate(PAYLOAD, 'text');

    expect(clientFast.provider).toBe('gemini');
    expect(clientFast.model).toBe('gemini-3.8-flash');
    expect(calls[0].model).toBe(clientFast.model);
    expect(calls[0].config.thinkingConfig.thinkingLevel).toBe(clientFast.level);
  });

  it('builds no fallback when a fast slot already is gemini-3.8-flash', async () => {
    await new GeminiProvider('k').generate(PAYLOAD, 'text', FLASH_38('low'));
    expect(withRetryMock.mock.calls[0][3]).toBeUndefined();
  });

  it('falls back to gemini-3.8-flash at low when a fast call on 3.6 Flash exhausts its retry budget', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    withRetryMock.mockImplementationOnce((fn: any, _m: any, _b: any, fallback: any) => (fallback ? fallback() : fn()));

    await new GeminiProvider('k')
      .generate(PAYLOAD, 'text', { model: 'gemini-3.6-flash', level: 'medium', maxOutputTokens: 65536 });

    expect(calls[0].model).toBe('gemini-3.8-flash');
    expect(calls[0].config.thinkingConfig).toEqual({ thinkingLevel: 'low' });
  });
});

describe('GeminiProvider snaps minimal to low on gemini-3.8-flash (FR-8)', () => {
  beforeEach(() => { calls.length = 0; nextResponse = reply('<p>ok</p>'); });

  it('clamps a pdf extraction to low, not minimal', async () => {
    await new GeminiProvider('k').extractFromPdf('PDF64', FLASH_38('medium'));
    expect(calls[0].model).toBe('gemini-3.8-flash');
    expect(calls[0].config.thinkingConfig).toEqual({ thinkingLevel: 'low' });
  });

  it('clamps a generate slot that carries minimal to low', async () => {
    await new GeminiProvider('k').generate(PAYLOAD, 'text', FLASH_38('minimal'));
    expect(calls[0].config.thinkingConfig).toEqual({ thinkingLevel: 'low' });
  });

  it('clamps a vision slot that carries minimal to low', async () => {
    await new GeminiProvider('k').analyzeImage('B64', 'image/jpeg', 'Describe', false, FLASH_38('minimal'));
    expect(calls[0].config.thinkingConfig).toEqual({ thinkingLevel: 'low' });
  });

  it('does not throw and still returns the answer when it clamps', async () => {
    nextResponse = reply('  A grey 3D printer.  ');
    await expect(new GeminiProvider('k').analyzeImage('B64', 'image/jpeg', 'Describe', false, FLASH_38('minimal')))
      .resolves.toBe('A grey 3D printer.');
  });

  it('passes a level the model accepts through unchanged', async () => {
    await new GeminiProvider('k').generate(PAYLOAD, 'text', FLASH_38('high'));
    expect(calls[0].config.thinkingConfig).toEqual({ thinkingLevel: 'high' });
  });

  it('leaves minimal untouched on models that support it', async () => {
    await new GeminiProvider('k').generate(PAYLOAD, 'text', { model: 'gemini-3.7-flash', level: 'minimal', maxOutputTokens: 65536 });
    await new GeminiProvider('k').analyzeImage('B64', 'image/jpeg', 'Describe', false,
      { model: 'gemini-3.6-flash', level: 'minimal', maxOutputTokens: 65536 });
    expect(calls[0].config.thinkingConfig).toEqual({ thinkingLevel: 'minimal' });
    expect(calls[1].config.thinkingConfig).toEqual({ thinkingLevel: 'minimal' });
  });
});
