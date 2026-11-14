/**
 * batch-outcome.spec.ts - US-10.6 T15 and T28's message builder (AC-4, AC-5; FR-8 (c), FR-9 (a); owner rulings SM-9 i, UA copy as proposed).
 *
 * PINNED CONTRACT (src/utils/image-studio/batch-outcome.ts):
 *   describeBatchOutcome(batch, lang: 'en' | 'uk'): string[]      ordered message lines for the ONE alert; [] when there is nothing to say
 *   batch = { requested, granted, succeeded, failures: [{ cause }] }    the server report (plan 3.2); `requested` and `succeeded` are images, `granted` is calls
 *   Lines, in this order:
 *     1. the rate-limit warning, present exactly when granted < requested: text X-55 with {n} = batch.succeeded (SM-9 i: the images that EXIST) and
 *        {requested} = batch.requested, built from the numbers the server reports (FR-8 (c)), never clamped;
 *     2. when failures is not empty: the summary X-56 with {k} = failures.length (failed calls) and {N} = batch.requested;
 *     3. then one line per DISTINCT failure cause, in first-occurrence order, the cause text X-57 (safety), X-58 (empty), X-59 (retries_exhausted), X-60 (file_missing).
 * Text ids and texts: see studio-texts.spec.ts (T24). No second role="status" is involved: these lines are rendered inside the single alert (T28).
 */
import { describe, it, expect } from 'vitest';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const describeOutcome = async (batch: unknown, lang = 'en'): Promise<string[]> => (await load('./batch-outcome')).describeBatchOutcome(batch, lang);

describe('describeBatchOutcome: the rate-limit warning (T15, AC-4, FR-8, SM-9 i)', () => {
  it('AC-4: with 28 used and 4 requested (4 requested, 2 granted, both succeeded) the warning is exactly "Rate limit reached. Generated 2 of 4 images."', async () => {
    const lines = await describeOutcome({ requested: 4, granted: 2, succeeded: 2, failures: [] });
    expect(lines).toEqual(['Rate limit reached. Generated 2 of 4 images.']);
  });

  it('AC-4 (uk, owner copy): "Ліміт вичерпано. Згенеровано 2 із 4 зображень."', async () => {
    expect(await describeOutcome({ requested: 4, granted: 2, succeeded: 2, failures: [] }, 'uk')).toEqual(['Ліміт вичерпано. Згенеровано 2 із 4 зображень.']);
  });

  it('FR-8: the numbers are filled from the report - 1 granted of 4 reads "Generated 1 of 4 images", 3 of 4 reads "Generated 3 of 4 images"', async () => {
    expect(await describeOutcome({ requested: 4, granted: 1, succeeded: 1, failures: [] })).toEqual(['Rate limit reached. Generated 1 of 4 images.']);
    expect(await describeOutcome({ requested: 4, granted: 3, succeeded: 3, failures: [] })).toEqual(['Rate limit reached. Generated 3 of 4 images.']);
  });

  it('SM-9 i: in the mixed case (4 requested, 2 granted, one of the two granted calls failed) {n} is `succeeded` (1), not `granted` (2)', async () => {
    const lines = await describeOutcome({ requested: 4, granted: 2, succeeded: 1, failures: [{ cause: 'safety' }] });
    expect(lines[0]).toBe('Rate limit reached. Generated 1 of 4 images.');
  });

  it('plan 5.0: a call that returned two images (succeeded 3, granted 2, requested 4) prints the numbers as reported - "Generated 3 of 4 images", never clamped', async () => {
    const lines = await describeOutcome({ requested: 4, granted: 2, succeeded: 3, failures: [] });
    expect(lines).toEqual(['Rate limit reached. Generated 3 of 4 images.']);
  });

  it('no warning when every requested call was granted (also when succeeded exceeds requested)', async () => {
    expect(await describeOutcome({ requested: 2, granted: 2, succeeded: 2, failures: [] })).toEqual([]);
    expect(await describeOutcome({ requested: 2, granted: 2, succeeded: 3, failures: [] })).toEqual([]);
  });

  it('AC-3: a clean 4-of-4 batch says nothing at all - no warning and no failure line', async () => {
    expect(await describeOutcome({ requested: 4, granted: 4, succeeded: 4, failures: [] })).toEqual([]);
  });
});

describe('describeBatchOutcome: failure lines (T15/T28, AC-5, FR-9 (a))', () => {
  it('AC-5: 2 of 4 fail for different causes -> the summary then one line per cause, English', async () => {
    const lines = await describeOutcome({ requested: 4, granted: 4, succeeded: 2, failures: [{ cause: 'safety' }, { cause: 'empty' }] });
    expect(lines).toEqual(['Could not generate 2 of 4 images.', 'blocked by the safety filter', 'empty response']);
  });

  it('AC-5 (uk, owner copy): the same batch in Ukrainian', async () => {
    const lines = await describeOutcome({ requested: 4, granted: 4, succeeded: 2, failures: [{ cause: 'safety' }, { cause: 'empty' }] }, 'uk');
    expect(lines).toEqual(['Не вдалося згенерувати 2 із 4 зображень.', 'заблоковано фільтром безпеки', 'порожня відповідь']);
  });

  it('FR-9 (a): causes that repeat give ONE line per cause class (three safety blocks are one cause line), in first-occurrence order', async () => {
    const lines = await describeOutcome({ requested: 4, granted: 4, succeeded: 1, failures: [{ cause: 'safety' }, { cause: 'retries_exhausted' }, { cause: 'safety' }] });
    expect(lines).toEqual(['Could not generate 3 of 4 images.', 'blocked by the safety filter', 'no answer after retries']);
  });

  it('every cause of the closed contract list has its own accepted text, in both languages', async () => {
    const en = { safety: 'blocked by the safety filter', empty: 'empty response', retries_exhausted: 'no answer after retries', file_missing: 'input file no longer available, attach it again' };
    const uk = { safety: 'заблоковано фільтром безпеки', empty: 'порожня відповідь', retries_exhausted: 'сервіс не відповів після повторних спроб', file_missing: 'вхідний файл недоступний, прикріпіть його знову' };
    for (const cause of Object.keys(en) as Array<keyof typeof en>) {
      expect((await describeOutcome({ requested: 2, granted: 2, succeeded: 1, failures: [{ cause }] }, 'en'))[1], cause).toBe(en[cause]);
      expect((await describeOutcome({ requested: 2, granted: 2, succeeded: 1, failures: [{ cause }] }, 'uk'))[1], cause).toBe(uk[cause]);
    }
  });

  it('a rate-limited batch whose granted call also failed lists the warning FIRST and then the failure lines', async () => {
    const lines = await describeOutcome({ requested: 4, granted: 2, succeeded: 1, failures: [{ cause: 'empty' }] });
    expect(lines).toEqual(['Rate limit reached. Generated 1 of 4 images.', 'Could not generate 1 of 4 images.', 'empty response']);
  });

  it('it does not mutate its input', async () => {
    const batch = { requested: 4, granted: 2, succeeded: 1, failures: [{ cause: 'safety' }] };
    const before = structuredClone(batch);
    await describeOutcome(batch);
    expect(batch).toEqual(before);
  });
});
