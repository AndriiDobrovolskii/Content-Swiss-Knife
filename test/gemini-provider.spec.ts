import { describe, it, expect, beforeEach, vi } from 'vitest';

/** Captures what the provider hands to the SDK, and replays a canned response. */
const calls: any[] = [];
let nextResponse: any;

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: async (req: any) => {
        calls.push(req);
        return nextResponse;
      },
    };
  },
}));

// Retry would re-run a throwing call and turn one assertion failure into four.
vi.mock('../server/utils/retry.js', () => ({ withRetry: (fn: any) => fn() }));

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
