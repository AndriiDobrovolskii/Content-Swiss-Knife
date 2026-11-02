// @vitest-environment node
/**
 * classify-response.spec.ts - US-10.1 T12 (FR-24, FR-26, FR-62, FR-63, FR-64, FR-84; SD-15, SD-23, D-10).
 *
 * PINNED CONTRACT (server/image-studio/classify-response.js, ESM, pure, imports NO SDK - the closed sets of SD-23 are
 * string constants there; only THIS spec imports the SDK enums to enumerate every vendor value):
 *   export function classifyResponse(response): Result
 *   Result = { class: 'safety', reason: string }                          // reason = finishReason, or blockReason when no candidate
 *          | { class: 'images', parts: Part[], imageCount: number }        // parts = the first candidate's parts, API order, thought parts kept;
 *                                                                          // imageCount = valid NON-thought image parts
 *          | { class: 'text', text: string }                               // non-thought text parts joined
 *          | { class: 'failed' }                                           // class 4 of FR-26 (HTTP 502 EMPTY_RESPONSE at the handler)
 * `response` is the SDK shape: { candidates?: [{ finishReason?, content?: { parts? } }], promptFeedback?: { blockReason? } }.
 * A "valid image part" = a NON-thought part whose `inlineData` has an `image/*` mimeType and non-empty `data` (AC-14, FR-84).
 *
 * The expected class of every combination below is computed INDEPENDENTLY from the FR-26 decision table and the closed
 * sets of SD-23 (written out in this file), not read back from the implementation.
 */
import { describe, it, expect } from 'vitest';
import { FinishReason, BlockedReason } from '@google/genai';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const MODULE = '../../server/image-studio/classify-response.js';

// SD-23 closed sets, as written in the Specification.
const CANDIDATE_SAFETY = new Set(['SAFETY', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'IMAGE_SAFETY', 'IMAGE_PROHIBITED_CONTENT']);
const PROMPT_SAFETY = new Set(['SAFETY', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'IMAGE_SAFETY', 'MODEL_ARMOR', 'JAILBREAK']);

const IMG = { inlineData: { mimeType: 'image/png', data: 'iVBORw0KGgo=' } };
const THOUGHT_IMG = { thought: true, inlineData: { mimeType: 'image/png', data: 'dGhvdWdodA==' } };
const TXT = { text: 'a short caption' };

type Shape = { name: string; parts: unknown[] | undefined; validImage: boolean; textOnly: boolean };
const SHAPES: Shape[] = [
  { name: 'valid image', parts: [IMG], validImage: true, textOnly: false },
  { name: 'image + text', parts: [TXT, IMG], validImage: true, textOnly: false },
  { name: 'text only', parts: [TXT], validImage: false, textOnly: true },
  { name: 'thought image + final image', parts: [THOUGHT_IMG, IMG], validImage: true, textOnly: false },
  { name: 'thought image + text', parts: [THOUGHT_IMG, TXT], validImage: false, textOnly: true },
  { name: 'thought image only', parts: [THOUGHT_IMG], validImage: false, textOnly: false },
  { name: 'no parts', parts: [], validImage: false, textOnly: false },
  { name: 'parts missing', parts: undefined, validImage: false, textOnly: false },
  { name: 'empty text only', parts: [{ text: '' }], validImage: false, textOnly: false },
  { name: 'a part of neither kind', parts: [{ functionCall: { name: 'x', args: {} } }], validImage: false, textOnly: false },
  { name: 'inline data that is not an image', parts: [{ inlineData: { mimeType: 'text/plain', data: 'aGk=' } }], validImage: false, textOnly: false },
  { name: 'image with empty data', parts: [{ inlineData: { mimeType: 'image/png', data: '' } }], validImage: false, textOnly: false },
];

const candidate = (finishReason: string | undefined, parts: unknown[] | undefined) => ({
  candidates: [{ ...(finishReason === undefined ? {} : { finishReason }), content: parts === undefined ? {} : { role: 'model', parts } }],
});

/** FR-26 decision table, rows 1 and 3-6, written out independently of the implementation. */
function expectedForCandidate(finish: string | undefined, shape: Shape): 'safety' | 'images' | 'text' | 'failed' {
  if (finish !== undefined && CANDIDATE_SAFETY.has(finish)) return 'safety';
  if (shape.validImage) return 'images';
  if (shape.textOnly && finish === 'STOP') return 'text';
  return 'failed';
}

describe('classifyResponse - the FR-26 decision table, row by row', () => {
  it('FR-26 row 1 / FR-62: a candidate finished with a safety reason is class safety whatever parts it holds, and the reason is carried', async () => {
    const { classifyResponse } = await load(MODULE);
    const r = classifyResponse(candidate('IMAGE_SAFETY', [TXT]));
    expect(r.class).toBe('safety');
    expect(r.reason).toBe('IMAGE_SAFETY');
  });

  it('FR-26 row 1 / N-2: an image part of a safety-finished candidate is dropped - the result is safety, never images', async () => {
    const { classifyResponse } = await load(MODULE);
    const r = classifyResponse(candidate('PROHIBITED_CONTENT', [IMG]));
    expect(r.class).toBe('safety');
    expect(r.reason).toBe('PROHIBITED_CONTENT');
    expect(r.parts).toBeUndefined();
  });

  it('FR-26 row 2 / FR-62: no candidate and a prompt-level safety blockReason is class safety carrying the blockReason', async () => {
    const { classifyResponse } = await load(MODULE);
    for (const reason of ['SAFETY', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'IMAGE_SAFETY', 'MODEL_ARMOR', 'JAILBREAK']) {
      expect(classifyResponse({ promptFeedback: { blockReason: reason } })).toEqual({ class: 'safety', reason });
      expect(classifyResponse({ candidates: [], promptFeedback: { blockReason: reason } })).toEqual({ class: 'safety', reason });
    }
  });

  it('FR-26 row 3: a candidate with a valid image is class images - parts in API order, thought parts kept, one image counted', async () => {
    const { classifyResponse } = await load(MODULE);
    const parts = [TXT, IMG];
    const r = classifyResponse(candidate('STOP', parts));
    expect(r.class).toBe('images');
    expect(r.parts).toEqual(parts);
    expect(r.imageCount).toBe(1);
  });

  it('FR-26 row 3 / D-10: an image together with an ABNORMAL finish reason is still images', async () => {
    const { classifyResponse } = await load(MODULE);
    for (const finish of ['MAX_TOKENS', 'OTHER', 'RECITATION', 'NO_IMAGE', 'IMAGE_OTHER', undefined]) {
      expect(classifyResponse(candidate(finish, [IMG])).class, String(finish)).toBe('images');
    }
  });

  it('FR-26 row 3: two images are two counted images in one result, in API order', async () => {
    const { classifyResponse } = await load(MODULE);
    const second = { inlineData: { mimeType: 'image/jpeg', data: '/9j/4AAQ' } };
    const r = classifyResponse(candidate('STOP', [IMG, TXT, second]));
    expect(r.imageCount).toBe(2);
    expect(r.parts).toEqual([IMG, TXT, second]);
  });

  it('FR-26 row 4 / FR-63: text only with the normal finish STOP is class text carrying the text', async () => {
    const { classifyResponse } = await load(MODULE);
    expect(classifyResponse(candidate('STOP', [TXT]))).toEqual({ class: 'text', text: 'a short caption' });
  });

  it('FR-26 row 5 / FR-64: text only with an abnormal finish (MAX_TOKENS, RECITATION, LANGUAGE, OTHER, absent) is class failed', async () => {
    const { classifyResponse } = await load(MODULE);
    for (const finish of ['MAX_TOKENS', 'RECITATION', 'LANGUAGE', 'OTHER', 'FINISH_REASON_UNSPECIFIED', undefined]) {
      expect(classifyResponse(candidate(finish, [TXT])).class, String(finish)).toBe('failed');
    }
  });

  it('FR-26 row 6: a candidate with no parts, only empty text, or parts of neither kind is class failed even with STOP', async () => {
    const { classifyResponse } = await load(MODULE);
    expect(classifyResponse(candidate('STOP', [])).class).toBe('failed');
    expect(classifyResponse(candidate('STOP', undefined)).class).toBe('failed');
    expect(classifyResponse(candidate('STOP', [{ text: '' }])).class).toBe('failed');
    expect(classifyResponse(candidate('STOP', [{ functionCall: { name: 'x' } }])).class).toBe('failed');
  });

  it('FR-26 row 7 / N-5: no candidate and a blockReason outside the prompt-level safety set (OTHER, UNSPECIFIED, unknown) or none at all is class failed', async () => {
    const { classifyResponse } = await load(MODULE);
    expect(classifyResponse({ promptFeedback: { blockReason: 'OTHER' } }).class).toBe('failed');
    expect(classifyResponse({ promptFeedback: { blockReason: 'BLOCKED_REASON_UNSPECIFIED' } }).class).toBe('failed');
    expect(classifyResponse({ promptFeedback: { blockReason: 'A_NEW_VENDOR_REASON' } }).class).toBe('failed');
    expect(classifyResponse({ candidates: [] }).class).toBe('failed');
    expect(classifyResponse({}).class).toBe('failed');
  });

  it('FR-26 row 8 / FR-24: a body that is malformed or not an object is class failed, never an empty image', async () => {
    const { classifyResponse } = await load(MODULE);
    for (const bad of [null, undefined, 'text', 42, [], { candidates: 'x' }, { candidates: [null] }, { candidates: [{ content: 'x' }] }]) {
      expect(classifyResponse(bad as any).class, JSON.stringify(bad)).toBe('failed');
    }
  });

  it('FR-26: the prompt-level blockReason is read ONLY when there is no usable candidate (a candidate wins)', async () => {
    const { classifyResponse } = await load(MODULE);
    const withImage = { ...candidate('STOP', [IMG]), promptFeedback: { blockReason: 'SAFETY' } };
    expect(classifyResponse(withImage).class).toBe('images');
    const withText = { ...candidate('STOP', [TXT]), promptFeedback: { blockReason: 'SAFETY' } };
    expect(classifyResponse(withText).class).toBe('text');
  });

  it('FR-26 / SD-23: only the FIRST candidate is read', async () => {
    const { classifyResponse } = await load(MODULE);
    const r = classifyResponse({ candidates: [candidate('STOP', [TXT]).candidates[0], candidate('STOP', [IMG]).candidates[0]] });
    expect(r.class).toBe('text');
  });
});

describe('classifyResponse - thought parts (FR-84)', () => {
  it('FR-84: a thought image plus a final image counts exactly one image, and the thought part stays in the parts', async () => {
    const { classifyResponse } = await load(MODULE);
    const r = classifyResponse(candidate('STOP', [THOUGHT_IMG, IMG]));
    expect(r.class).toBe('images');
    expect(r.imageCount).toBe(1);
    expect(r.parts).toEqual([THOUGHT_IMG, IMG]);
  });

  it('FR-84: a response whose only image is a thought image and which has text with STOP is the text variant, not images', async () => {
    const { classifyResponse } = await load(MODULE);
    const r = classifyResponse(candidate('STOP', [THOUGHT_IMG, TXT]));
    expect(r).toEqual({ class: 'text', text: 'a short caption' });
  });

  it('FR-84: a thought image and no text is class failed (502 EMPTY_RESPONSE at the handler)', async () => {
    const { classifyResponse } = await load(MODULE);
    expect(classifyResponse(candidate('STOP', [THOUGHT_IMG])).class).toBe('failed');
  });

  it('FR-84 / SD-23: a thought image on a safety-finished candidate is still safety', async () => {
    const { classifyResponse } = await load(MODULE);
    expect(classifyResponse(candidate('SAFETY', [THOUGHT_IMG, IMG])).class).toBe('safety');
  });
});

describe('classifyResponse - every vendor enum member lands in exactly one class (FR-26, N-1)', () => {
  it('SD-23: the closed sets written in this spec are members of the installed enums, so a vendor rename is noticed here', () => {
    const finish = new Set(Object.values(FinishReason) as string[]);
    const blocked = new Set(Object.values(BlockedReason) as string[]);
    for (const v of CANDIDATE_SAFETY) expect(finish.has(v), `FinishReason.${v}`).toBe(true);
    for (const v of PROMPT_SAFETY) expect(blocked.has(v), `BlockedReason.${v}`).toBe(true);
    expect(finish.has('STOP')).toBe(true);
  });

  it('FR-26: every FinishReason (plus an absent and an unknown one) x every part shape maps to exactly the class the decision table gives', async () => {
    const { classifyResponse } = await load(MODULE);
    const finishes: Array<string | undefined> = [...(Object.values(FinishReason) as string[]), undefined, 'A_FINISH_REASON_ADDED_LATER'];
    let combinations = 0;
    for (const finish of finishes) {
      for (const shape of SHAPES) {
        const result = classifyResponse(candidate(finish, shape.parts));
        const label = `finish=${String(finish)} shape=${shape.name}`;
        expect(['safety', 'images', 'text', 'failed'], label).toContain(result.class);
        expect(result.class, label).toBe(expectedForCandidate(finish, shape));
        combinations += 1;
      }
    }
    expect(combinations).toBe(finishes.length * SHAPES.length);
    expect(finishes.length).toBeGreaterThanOrEqual(17 + 2); // the installed enum has 17 members
  });

  it('FR-26: every BlockedReason (plus an unknown one) with no usable candidate maps to safety only for the prompt-level safety set, else failed', async () => {
    const { classifyResponse } = await load(MODULE);
    const reasons: string[] = [...(Object.values(BlockedReason) as string[]), 'A_BLOCK_REASON_ADDED_LATER'];
    for (const reason of reasons) {
      const expected = PROMPT_SAFETY.has(reason) ? 'safety' : 'failed';
      expect(classifyResponse({ promptFeedback: { blockReason: reason } }).class, reason).toBe(expected);
      expect(classifyResponse({ candidates: [], promptFeedback: { blockReason: reason } }).class, `${reason} (empty candidates)`).toBe(expected);
    }
  });

  it('FR-26: with a usable candidate the blockReason never changes the class, for every BlockedReason', async () => {
    const { classifyResponse } = await load(MODULE);
    for (const reason of Object.values(BlockedReason) as string[]) {
      const base = candidate('STOP', [IMG]);
      expect(classifyResponse({ ...base, promptFeedback: { blockReason: reason } }).class, reason).toBe('images');
    }
  });
});
