// @vitest-environment node
/**
 * fan-out.spec.ts - US-10.6 T7 (FR-5, FR-7 (a), FR-9 (a), NFR-5; AC-3, AC-5).
 *
 * `reduceSlots` of server/image-studio/fan-out.js: the PURE reducer that folds the outcomes of the N parallel upstream calls ("slots") into one
 * `images` result (plan 5.0 units, plan 5.2 steps 6 and 8, breakdown T7). It runs with no clock, no sleep and no network: slot outcomes are plain
 * values and "the second call finished before the first" is an array order, not a timer.
 *
 * PINNED CONTRACT. The plan fixes the name `reduceSlots` and says it "also takes the requested N and the numeric unit price"; the argument and
 * slot shapes below are pinned HERE by the test writer (the builder follows them) and are the minimum needed to assert the behaviour:
 *
 *   reduceSlots({ slots, requested, unitPrice })
 *     slots     Array<{ index: number, outcome }>   in COMPLETION order (any order); `index` is the slot number (the order the images were requested).
 *               outcome is one of
 *                 { class: 'images', parts: Part[], imageCount: number, usage?: { inputTokens, outputTokens } }   imageCount = non-thought image parts
 *                 { class: 'safety', reason: string } | { class: 'text', text: string } | { class: 'failed' }      the classifier's results
 *                 { error: unknown }                                                                              a thrown upstream failure
 *     requested the N the operator asked for (images);  unitPrice  a plain number (dollars per image) - NOT the pair-keyed price function.
 *     granted   = slots.length (one slot per upstream call).
 *   Returns, when at least one slot is `images`:
 *     { class: 'images', parts, succeeded, costUsd, usage: { inputTokens, outputTokens }, batch? }
 *       parts      the successful slots' parts concatenated in SLOT-INDEX order (a slot's thought parts stay with it)
 *       succeeded  the SUM of imageCount over the successful slots (images; never clamped, may exceed granted or requested)
 *       costUsd    unitPrice * succeeded (one expression, no rounding)
 *       usage      token usage summed over the successful slots
 *       batch      ONLY when requested > 1: { requested, granted, succeeded, failures: Array<{ cause }> } - one failures entry per FAILED CALL
 *                  (so failures.length = granted - successful calls); the images never attempted (requested - granted) have no entry.
 *   Closed cause mapping (the only place that maps; plan 3.1 / 5.2 step 6):
 *     safety -> 'safety'; failed -> 'empty'; text -> 'empty'; { error: ImageStudioError('FILE_MISSING') } -> 'file_missing'; any other error -> 'retries_exhausted'.
 *   When NO slot succeeded: the LOWEST-index slot's outcome is returned as a one-image request would return it ({ class: 'safety', reason } /
 *     { class: 'text', text } / { class: 'failed' }) with no `batch`, or its error is rethrown (the same instance); when every slot is FILE_MISSING
 *     the result is a thrown ImageStudioError('FILE_MISSING').
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const FAN_OUT = '../../server/image-studio/fan-out.js';
const ERRORS = '../../server/image-studio/errors.js';

const UNIT = 0.04; // a plain test double for the numeric unit price; NOT a vendor price
const img = (tag: string) => ({ inlineData: { mimeType: 'image/png', data: `data-${tag}` } });
const thought = (tag: string) => ({ thought: true, inlineData: { mimeType: 'image/png', data: `thought-${tag}` } });
const ok = (index: number, tag: string, usage = { inputTokens: 10, outputTokens: 100 }) => ({
  index,
  outcome: { class: 'images', parts: [img(tag)], imageCount: 1, usage },
});
const contractCauses = (): string[] =>
  JSON.parse(readFileSync(resolve(process.cwd(), 'src/prompt-core/image-studio-contract.json'), 'utf8')).imageFailureCauses ?? [];

async function reduce(slots: unknown[], requested: number, unitPrice = UNIT): Promise<any> {
  const { reduceSlots } = await load(FAN_OUT);
  return reduceSlots({ slots, requested, unitPrice });
}
async function reduceError(slots: unknown[], requested: number): Promise<any> {
  try { await reduce(slots, requested); } catch (e) { return e; }
  throw new Error('expected reduceSlots to throw');
}

describe('reduceSlots - the module surface (T7)', () => {
  it('FR-5: server/image-studio/fan-out.js exports reduceSlots as a function', async () => {
    const m = await load(FAN_OUT);
    expect(typeof m.reduceSlots).toBe('function');
  });
});

describe('reduceSlots - numbering is by slot index, not completion order (FR-7 (a), NFR-5, AC-3)', () => {
  it('FR-7 (a): slots that complete in the order 2, 0, 1 produce the parts of slots 0, 1, 2', async () => {
    const result = await reduce([ok(2, 'C'), ok(0, 'A'), ok(1, 'B')], 4);
    expect(result.class).toBe('images');
    expect(result.parts).toEqual([img('A'), img('B'), img('C')]);
  });

  it('FR-7 (a): the same slots completing in index order give the identical result (completion order is irrelevant)', async () => {
    const ordered = await reduce([ok(0, 'A'), ok(1, 'B'), ok(2, 'C')], 4);
    const shuffled = await reduce([ok(1, 'B'), ok(2, 'C'), ok(0, 'A')], 4);
    expect(shuffled).toEqual(ordered);
  });

  it('FR-7 (a): a failed slot leaves no gap - the successful slots 0 and 2 become the first two images, in order', async () => {
    const result = await reduce([ok(2, 'C'), { index: 1, outcome: { class: 'safety', reason: 'SAFETY' } }, ok(0, 'A')], 4);
    expect(result.parts).toEqual([img('A'), img('C')]);
  });

  it('FR-7 (a): a slot\'s thought parts stay with that slot, in front of its final image', async () => {
    const withThought = { index: 1, outcome: { class: 'images', parts: [thought('B'), img('B')], imageCount: 1 } };
    const result = await reduce([withThought, ok(0, 'A')], 2);
    expect(result.parts).toEqual([img('A'), thought('B'), img('B')]);
  });
});

describe('reduceSlots - units: a slot is worth the imageCount it carries (plan 5.0, review B-1)', () => {
  it('B-1: a slot with two image parts counts 2 images - both are in parts and succeeded is 2', async () => {
    const twoImages = { index: 0, outcome: { class: 'images', parts: [img('X'), img('Y')], imageCount: 2 } };
    const result = await reduce([twoImages], 1);
    expect(result.parts).toEqual([img('X'), img('Y')]);
    expect(result.succeeded).toBe(2);
    expect(result.costUsd).toBeCloseTo(UNIT * 2, 12);
  });

  it('B-1: succeeded is the SUM of imageCount and is not clamped to granted or requested', async () => {
    const result = await reduce([
      { index: 0, outcome: { class: 'images', parts: [img('A1'), img('A2')], imageCount: 2 } },
      { index: 1, outcome: { class: 'images', parts: [img('B1'), img('B2')], imageCount: 2 } },
    ], 2);
    expect(result.succeeded).toBe(4);
    expect(result.batch.requested).toBe(2);
    expect(result.batch.granted).toBe(2);
    expect(result.batch.succeeded).toBe(4);
  });

  it('B-1 / FR-84: a slot with a thought image plus a final image counts ONE image (the thought is not billed)', async () => {
    const result = await reduce([{ index: 0, outcome: { class: 'images', parts: [thought('T'), img('F')], imageCount: 1 } }], 1);
    expect(result.succeeded).toBe(1);
    expect(result.costUsd).toBeCloseTo(UNIT, 12);
    expect(result.parts).toContainEqual(thought('T'));
  });

  it('FR-21 / AC-5: costUsd is unitPrice * succeeded - one expression, only for the images that exist', async () => {
    const result = await reduce([ok(0, 'A'), { index: 1, outcome: { class: 'failed' } }, ok(2, 'C'), { index: 3, outcome: { class: 'safety', reason: 'SAFETY' } }], 4);
    expect(result.succeeded).toBe(2);
    expect(result.costUsd).toBe(UNIT * 2);
  });

  it('plan 5.0: token usage is summed over the successful slots', async () => {
    const result = await reduce([ok(0, 'A', { inputTokens: 10, outputTokens: 100 }), ok(1, 'B', { inputTokens: 7, outputTokens: 50 })], 2);
    expect(result.usage).toEqual({ inputTokens: 17, outputTokens: 150 });
  });
});

describe('reduceSlots - the batch report (FR-8, FR-9, AC-4, AC-5)', () => {
  it('AC-3: for requested 1 the result has no batch field', async () => {
    const result = await reduce([ok(0, 'A')], 1);
    expect('batch' in result).toBe(false);
    expect(result.succeeded).toBe(1);
  });

  it('AC-3: when every one of 4 requested slots succeeds the batch is { requested 4, granted 4, succeeded 4, failures [] }', async () => {
    const result = await reduce([ok(0, 'A'), ok(1, 'B'), ok(2, 'C'), ok(3, 'D')], 4);
    expect(result.batch).toEqual({ requested: 4, granted: 4, succeeded: 4, failures: [] });
  });

  it('AC-4: 4 requested but only 2 granted (2 slots, both succeed) reports requested 4, granted 2, succeeded 2 and no failure entry for the 2 never attempted', async () => {
    const result = await reduce([ok(0, 'A'), ok(1, 'B')], 4);
    expect(result.batch).toEqual({ requested: 4, granted: 2, succeeded: 2, failures: [] });
  });

  it('AC-5: 2 of 4 fail -> the 2 successes are kept, failures has one entry per failed call, succeeded is 2', async () => {
    const result = await reduce([
      ok(0, 'A'),
      { index: 1, outcome: { class: 'safety', reason: 'SAFETY' } },
      ok(2, 'C'),
      { index: 3, outcome: { class: 'failed' } },
    ], 4);
    expect(result.class).toBe('images');
    expect(result.parts).toEqual([img('A'), img('C')]);
    expect(result.batch.requested).toBe(4);
    expect(result.batch.granted).toBe(4);
    expect(result.batch.succeeded).toBe(2);
    expect(result.batch.failures).toHaveLength(2);
    expect(result.batch.failures).toEqual([{ cause: 'safety' }, { cause: 'empty' }]);
  });

  it('plan 5.0: failures.length equals granted minus the successful calls (also when 4 were requested and only 3 granted)', async () => {
    const result = await reduce([ok(0, 'A'), { index: 1, outcome: { class: 'failed' } }, ok(2, 'C')], 4);
    expect(result.batch.granted).toBe(3);
    expect(result.batch.failures).toHaveLength(3 - 2);
  });

  it('FR-7 (a): failures are listed in slot-index order whatever the completion order', async () => {
    const result = await reduce([
      { index: 3, outcome: { class: 'failed' } },
      ok(0, 'A'),
      { index: 1, outcome: { class: 'safety', reason: 'SAFETY' } },
      ok(2, 'C'),
    ], 4);
    expect(result.batch.failures).toEqual([{ cause: 'safety' }, { cause: 'empty' }]);
  });
});

describe('reduceSlots - the closed cause mapping table (plan 3.1, review B-2)', () => {
  const fileMissing = async () => { const { ImageStudioError } = await load(ERRORS); return new ImageStudioError('FILE_MISSING'); };
  const cases: Array<[string, () => Promise<unknown> | unknown, string]> = [
    ['classifier safety', () => ({ class: 'safety', reason: 'IMAGE_SAFETY' }), 'safety'],
    ['classifier failed (EMPTY_RESPONSE)', () => ({ class: 'failed' }), 'empty'],
    ['classifier text (words and no image)', () => ({ class: 'text', text: 'I cannot draw that' }), 'empty'],
    ['FILE_MISSING error', async () => ({ error: await fileMissing() }), 'file_missing'],
    ['an upstream error with a status', () => ({ error: Object.assign(new Error('upstream 429'), { status: 429 }) }), 'retries_exhausted'],
    ['an error with no status', () => ({ error: new Error('socket hang up') }), 'retries_exhausted'],
  ];

  for (const [label, makeOutcome, cause] of cases) {
    it(`B-2: ${label} maps to the single closed cause "${cause}" and that cause is a member of the contract's imageFailureCauses`, async () => {
      const outcome = await makeOutcome();
      const result = await reduce([ok(0, 'A'), { index: 1, outcome }], 2);
      expect(result.class).toBe('images');
      expect(result.batch.failures).toEqual([{ cause }]);
      expect(contractCauses()).toContain(cause);
    });
  }

  it('B-2: a batch of one image slot and one text slot answers images with failures [{ cause: "empty" }] and does not carry the words of the text slot', async () => {
    const result = await reduce([ok(0, 'A'), { index: 1, outcome: { class: 'text', text: 'private words' } }], 2);
    expect(result.class).toBe('images');
    expect(result.batch.failures).toEqual([{ cause: 'empty' }]);
    expect(JSON.stringify(result)).not.toContain('private words');
  });

  it('B-2: no cause outside the contract list can be produced - every cause over all six outcome kinds is a member', async () => {
    const allowed = contractCauses();
    expect(allowed.length).toBe(4);
    const outcomes = await Promise.all(cases.map(async ([, make]) => make()));
    const result = await reduce([ok(0, 'A'), ...outcomes.map((outcome, i) => ({ index: i + 1, outcome }))], 8);
    for (const failure of result.batch.failures) expect(allowed).toContain(failure.cause);
    expect(result.batch.failures).toHaveLength(outcomes.length);
  });
});

describe('reduceSlots - when no slot succeeded (plan 5.2: the lowest-numbered slot answers as a one-image request would)', () => {
  it('safety: the lowest-index slot\'s safety outcome is returned, with no batch and no cause', async () => {
    const result = await reduce([
      { index: 2, outcome: { class: 'failed' } },
      { index: 0, outcome: { class: 'safety', reason: 'PROHIBITED_CONTENT' } },
      { index: 1, outcome: { class: 'text', text: 'words' } },
    ], 4);
    expect(result).toEqual({ class: 'safety', reason: 'PROHIBITED_CONTENT' });
    expect('batch' in result).toBe(false);
  });

  it('an all-text batch answers the text outcome with no batch and no cause', async () => {
    const result = await reduce([{ index: 1, outcome: { class: 'text', text: 'second' } }, { index: 0, outcome: { class: 'text', text: 'first' } }], 2);
    expect(result).toEqual({ class: 'text', text: 'first' });
  });

  it('an all-empty batch answers the failed outcome (the handler turns it into EMPTY_RESPONSE)', async () => {
    const result = await reduce([{ index: 0, outcome: { class: 'failed' } }, { index: 1, outcome: { class: 'failed' } }], 2);
    expect(result.class).toBe('failed');
    expect('batch' in result).toBe(false);
  });

  it('a thrown upstream failure of the lowest slot is rethrown as the same error instance', async () => {
    const lowest = Object.assign(new Error('boom'), { status: 503 });
    const e = await reduceError([{ index: 1, outcome: { error: new Error('other') } }, { index: 0, outcome: { error: lowest } }], 2);
    expect(e).toBe(lowest);
  });

  it('when every slot is FILE_MISSING the result is a thrown FILE_MISSING (so the client\'s existing re-upload recovery runs)', async () => {
    const { ImageStudioError } = await load(ERRORS);
    const e = await reduceError([
      { index: 0, outcome: { error: new ImageStudioError('FILE_MISSING') } },
      { index: 1, outcome: { error: new ImageStudioError('FILE_MISSING') } },
    ], 2);
    expect(e?.code).toBe('FILE_MISSING');
    expect(e?.status).toBe(410);
  });
});

describe('reduceSlots - purity (NFR-5)', () => {
  it('does not mutate its input and returns a result that shares no mutable parts array with a slot', async () => {
    const slots = [ok(1, 'B'), ok(0, 'A')];
    const before = structuredClone(slots);
    const result = await reduce(slots, 2);
    expect(slots).toEqual(before);
    result.parts.push({ text: 'appended after the call' });
    expect(slots).toEqual(before);
  });
});
