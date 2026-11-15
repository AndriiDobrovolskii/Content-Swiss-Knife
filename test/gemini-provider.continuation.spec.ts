/**
 * US-11.1 (T2) - FR-23 / AC-14: `GeminiProvider`'s response reader treats `finishReason === 'CONTINUATION'` as an
 * unfinished generation. It throws an error that names the model, as it does for MAX_TOKENS, and it never
 * returns the partial text - not from `generate()`, not from `analyzeImage()`, not from `extractFromPdf()`
 * (all three read through the one `#readText`).
 *
 * This file uses the REAL `withRetry` (test/gemini-provider.spec.ts stubs it out) because one requirement is
 * about retry: a CONTINUATION failure is a deterministic guard, so the operation must run exactly once. The
 * SDK itself is faked, and no network call is made (OD-5: mocked unit tests only).
 *
 * Why the error text is constrained (task breakdown T2): the Doc repair gate stops at once on a message that
 * `isUnrepairableGenerationError` recognises (imported read-only from src/render/doc-schema-issues.ts, a
 * FROZEN neighbour that this Story must not edit), and `withRetry` must see none of its transient markers.
 *
 * These cases use models that exist today: the guard is model-independent, so they need no catalog anchoring.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isUnrepairableGenerationError } from '../src/render/doc-schema-issues';

const calls: any[] = [];
let nextResponse: any;

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor(_opts: any) {}
    models = {
      generateContent: async (req: any) => {
        calls.push(req);
        return nextResponse;
      },
    };
  },
}));

const { GeminiProvider } = await import('../server/providers/gemini.js');

const PAYLOAD = { systemBlocks: [{ text: 'MASTER', cache: true }], userContent: 'Product: Bambu X1C' };
const PARTIAL = 'PARTIAL-TEXT-THAT-MUST-NEVER-REACH-THE-CALLER';

/** A response that stopped with CONTINUATION and still carries text, in both places a reader might look. */
function continuation(text = PARTIAL) {
  return {
    text,
    candidates: [{ finishReason: 'CONTINUATION', content: { parts: [{ text }] } }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 5, cachedContentTokenCount: 0 },
  };
}

/** Words withRetry (server/utils/retry.js) treats as transient. A CONTINUATION error must contain none of them. */
const TRANSIENT = [
  '429', 'overloaded', 'RESOURCE_EXHAUSTED', 'rate_limit', 'timed out', 'socket hang up',
  'network error', 'fetch failed', 'Retryable HTTP Error',
];

const MODELS = ['gemini-3.8-flash', 'gemini-3.1-pro-preview'] as const;
const slot = (model: string) => ({ model, level: 'low', maxOutputTokens: 65536 });

/**
 * The partial text each entry point is fed. The json entry point gets text that WOULD parse, so a reader that
 * parses before it checks the finish reason would return it - and a rejection for any other reason (a parse
 * error) cannot stand in for the guard.
 */
const partialFor = (entryName: string) => (entryName.startsWith('generate (json') ? '{"ok":1}' : PARTIAL);

type EntryPoint = [name: string, run: (model: string) => Promise<unknown>];
const ENTRY_POINTS: EntryPoint[] = [
  ['generate (text)', model => new GeminiProvider('k').generate(PAYLOAD, 'text', slot(model))],
  ['generate (creative)', model => new GeminiProvider('k').generate(PAYLOAD, 'creative', slot(model))],
  ['generate (json, partial text that parses)', model => new GeminiProvider('k').generate(PAYLOAD, 'json', slot(model))],
  ['analyzeImage', model => new GeminiProvider('k').analyzeImage('B64', 'image/jpeg', 'Describe', false, slot(model))],
  ['extractFromPdf', model => new GeminiProvider('k').extractFromPdf('PDF64', slot(model))],
];

async function failureOf(run: () => Promise<unknown>): Promise<Error> {
  let value: unknown;
  let error: Error | undefined;
  try {
    value = await run();
  } catch (e) {
    error = e as Error;
  }
  // Checked outside the try block, so the assertion failure itself is never mistaken for the awaited rejection.
  if (!error) expect.unreachable(`expected a rejection, got a value: ${JSON.stringify(value)}`);
  return error as Error;
}

describe('GeminiProvider treats finishReason CONTINUATION as unfinished (FR-23, AC-14)', () => {
  beforeEach(() => { calls.length = 0; });

  for (const model of MODELS) {
    for (const [name, run] of ENTRY_POINTS) {
      describe(`${name} on ${model}`, () => {
        it('rejects with an error that names the model and carries none of the partial text', async () => {
          // The json entry point is fed partial text that WOULD parse, so a reader that parses before it checks would return it.
          nextResponse = continuation(partialFor(name));
          const error = await failureOf(() => run(model));
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toContain(model);
          expect(error.message).not.toContain(PARTIAL);
        });

        it('makes a single SDK attempt: a deterministic guard is not retried', async () => {
          nextResponse = continuation(partialFor(name));
          await failureOf(() => run(model));
          expect(calls).toHaveLength(1);
        });

        it('words the error so the Doc repair gate stops at once and withRetry sees nothing transient', async () => {
          nextResponse = continuation(partialFor(name));
          const error = await failureOf(() => run(model));
          expect(isUnrepairableGenerationError(error), error.message).toBe(true);
          for (const marker of TRANSIENT) expect(error.message, `contains "${marker}"`).not.toContain(marker);
          expect((error as { status?: number }).status).toBeUndefined();
        });
      });
    }
  }
});

describe('the CONTINUATION guard does not change the other finish reasons (characterization)', () => {
  beforeEach(() => { calls.length = 0; });

  it('a response that finished with STOP still returns its text', async () => {
    nextResponse = {
      text: '<p>done</p>',
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '<p>done</p>' }] } }],
      usageMetadata: {},
    };
    const { result } = await new GeminiProvider('k').generate(PAYLOAD, 'text', slot('gemini-3.8-flash'));
    expect(result).toBe('<p>done</p>');
  });

  it('a response with no finishReason at all still returns its text (the SDK may omit it)', async () => {
    nextResponse = { text: 'plain', candidates: [{ content: { parts: [{ text: 'plain' }] } }], usageMetadata: {} };
    const { result } = await new GeminiProvider('k').generate(PAYLOAD, 'text', slot('gemini-3.8-flash'));
    expect(result).toBe('plain');
  });

  it('MAX_TOKENS still throws its own truncated message', async () => {
    nextResponse = {
      text: '<p>half', candidates: [{ finishReason: 'MAX_TOKENS' }], usageMetadata: {},
    };
    const error = await failureOf(() => new GeminiProvider('k').generate(PAYLOAD, 'text', slot('gemini-3.8-flash')));
    expect(error.message).toMatch(/truncated: hit maxOutputTokens on gemini-3\.8-flash/);
  });
});
