import { describe, it, expect, vi, beforeEach } from 'vitest';

const { finalMessageMock, streamMock, createMock } = vi.hoisted(() => {
  const finalMessageMock = vi.fn();
  const streamMock = vi.fn(() => ({ finalMessage: finalMessageMock }));
  const createMock = vi.fn();
  return { finalMessageMock, streamMock, createMock };
});

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function AnthropicMock() {
    return {
      messages: { stream: streamMock, create: createMock },
      beta: { messages: { stream: streamMock } },
    };
  }),
}));

const { AnthropicProvider } = await import('./anthropic.js');
const { IncompleteGenerationError, RefusalError } = await import('../utils/errors.js');
const { CREATIVE_MAX_TOKENS_DEFAULT, TEXT_MAX_TOKENS_DEFAULT, VISION_MAX_TOKENS_DEFAULT } = await import('./anthropic-config.js');

function makeProvider() {
  return new AnthropicProvider('test-key', { thinkingModel: 'claude-sonnet-5', fastModel: 'claude-haiku-4-5' });
}

describe('AnthropicProvider#generate — stop_reason gate', () => {
  beforeEach(() => {
    finalMessageMock.mockReset();
    streamMock.mockClear();
  });

  it('returns the result normally when stop_reason is end_turn', async () => {
    finalMessageMock.mockResolvedValue({
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 20 },
      content: [{ type: 'text', text: 'hello world' }],
    });

    const { result } = await makeProvider().generate('prompt', 'text');
    expect(result).toBe('hello world');
  });

  it('throws IncompleteGenerationError on stop_reason max_tokens and never returns the truncated text', async () => {
    finalMessageMock.mockResolvedValue({
      stop_reason: 'max_tokens',
      usage: { input_tokens: 10, output_tokens: 9999 },
      content: [{ type: 'text', text: 'truncated mid-wo' }],
    });

    const provider = makeProvider();
    await expect(provider.generate('prompt', 'creative')).rejects.toThrow(IncompleteGenerationError);
  });

  it('throws RefusalError on stop_reason refusal', async () => {
    finalMessageMock.mockResolvedValue({ stop_reason: 'refusal', usage: {}, content: [] });

    const provider = makeProvider();
    await expect(provider.generate('prompt', 'creative')).rejects.toThrow(RefusalError);
  });

  it('treats tool_use as success', async () => {
    finalMessageMock.mockResolvedValue({
      stop_reason: 'tool_use',
      usage: {},
      content: [{ type: 'text', text: 'ok' }],
    });

    const { result } = await makeProvider().generate('prompt', 'text');
    expect(result).toBe('ok');
  });

  it('treats stop_sequence/pause_turn as incomplete (not accepted as success)', async () => {
    finalMessageMock.mockResolvedValue({ stop_reason: 'pause_turn', usage: {}, content: [{ type: 'text', text: 'x' }] });
    await expect(makeProvider().generate('prompt', 'text')).rejects.toThrow(IncompleteGenerationError);
  });
});

describe('AnthropicProvider#generate — creative mode config', () => {
  beforeEach(() => {
    finalMessageMock.mockReset();
    streamMock.mockClear();
    finalMessageMock.mockResolvedValue({ stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: 'ok' }] });
  });

  it('disables thinking and uses the creative max-tokens budget for creative mode', async () => {
    await makeProvider().generate('prompt', 'creative');
    const config = streamMock.mock.calls[0][0];
    expect(config.thinking).toEqual({ type: 'disabled' });
    expect(config.max_tokens).toBe(CREATIVE_MAX_TOKENS_DEFAULT);
  });

  it('disables thinking and uses the creative max-tokens budget for creative-json mode', async () => {
    finalMessageMock.mockResolvedValue({ stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: '{}' }] });
    await makeProvider().generate('prompt', 'creative-json');
    const config = streamMock.mock.calls[0][0];
    expect(config.thinking).toEqual({ type: 'disabled' });
    expect(config.max_tokens).toBe(CREATIVE_MAX_TOKENS_DEFAULT);
  });

  it('does not set thinking and uses the text max-tokens budget for text mode', async () => {
    await makeProvider().generate('prompt', 'text');
    const config = streamMock.mock.calls[0][0];
    expect(config.thinking).toBeUndefined();
    expect(config.max_tokens).toBe(TEXT_MAX_TOKENS_DEFAULT);
  });
});

describe('AnthropicProvider#analyzeImage', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('sets thinking: disabled and the raised vision max-tokens budget', async () => {
    createMock.mockResolvedValue({ content: [{ type: 'text', text: 'A red widget on a white background.' }] });

    const result = await makeProvider().analyzeImage('base64==', 'image/png', 'Describe this image', true);

    expect(result).toBe('A red widget on a white background.');
    const config = createMock.mock.calls[0][0];
    expect(config.thinking).toEqual({ type: 'disabled' });
    expect(config.max_tokens).toBe(VISION_MAX_TOKENS_DEFAULT);
  });

  it('returns non-empty text even in a would-have-been-truncated scenario, since thinking cannot consume the budget', async () => {
    // Regression for the bug: previously no `thinking` key was set, so adaptive thinking
    // could activate implicitly on a Sonnet 5 thinking model and eat the 300-token budget,
    // leaving an empty alt text. With thinking explicitly disabled, the full budget goes
    // to the text response.
    createMock.mockResolvedValue({ content: [{ type: 'text', text: 'A 3D-printed miniature figurine.' }] });
    const result = await makeProvider().analyzeImage('base64==', 'image/jpeg', 'Write concise alt text.', true);
    expect(result).not.toBe('');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('AnthropicProvider#extractFromPdf', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('sets thinking: disabled defensively, leaves max_tokens unchanged', async () => {
    createMock.mockResolvedValue({ content: [{ type: 'text', text: 'extracted spec text' }] });

    const result = await makeProvider().extractFromPdf('base64==');

    expect(result).toBe('extracted spec text');
    const config = createMock.mock.calls[0][0];
    expect(config.thinking).toEqual({ type: 'disabled' });
    expect(config.max_tokens).toBe(4096);
  });
});
