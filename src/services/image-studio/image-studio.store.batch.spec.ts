/**
 * image-studio.store.batch.spec.ts - US-10.6 T27 (FR-4, FR-5, FR-7, FR-9, FR-24 / OD-6e; AC-3, AC-5).
 *
 * Runner: test:logic, the real ImageStudioStore on `Injector.create` with test doubles for its ports (test/image-studio/helpers/store-harness.ts);
 * no TestBed. Every case title of the task ends "(T27)" in its describe, so `-t "\(T27\)"` selects them.
 *
 * Why a separate file: the breakdown lists these as new describes of image-studio.store.generation.spec.ts; that file is ~1000 lines of US-10.1 / 10.5
 * assertions that must not be touched (AC-15), so the T27 cases live beside it. The runner (-t) selection is the same.
 *
 * PINNED CONTRACT (plan 7.2; names in the plan, shapes fixed here):
 *   store.draft().imageCount: 1 | 2 | 4     default 1, reset by a new session; setDraft({ imageCount }) normalises a value outside {1,2,4} to 1
 *   store.send()                            builds the request with `imageCount` ONLY when it is greater than 1 (a one-image request is unchanged)
 *   a response with N image parts is committed as ONE model turn through applyResponse: versions numbered consecutively, the turn cost and the
 *   session total are the response's total costUsd, and the single status announces the HIGHEST new number
 *   store.imageActionsCompleted(): number  a signal that counts actions that ended with at least one image (the container observes it to refresh spend)
 *
 * Deferred (not asserted): Cancel keeping already-returned images (FR-9 (c), owner ruling G-2 unmade), the retry-after-partial turn-id rule (the plan does
 * not say how the offer is surfaced - needs the OD-6 (b) ruling), the batch warning / failure lines (T28, SM-9 and UA copy).
 */
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { setupStore, activeSession } from '../../../test/image-studio/helpers/store-harness';
import { makeSession } from '../../../test/image-studio/helpers/fakes';
import { imagesResponse, imagePart, textResponse, okBody, failure, flush } from '../../../test/image-studio/helpers/core-fixtures';

const tagged = (n: number, tag: string) => Array.from({ length: n }, (_, i) => imagePart({ thoughtSignature: `${tag}-${i + 1}` }));
const batch = (requested: number, granted: number, succeeded: number, failures: Array<{ cause: string }> = []) => ({ requested, granted, succeeded, failures });
const lastRequest = (llm: any) => llm.generateImage.mock.calls.at(-1)[0];
const seeded = (pairs = 1) => setupStore({ seed: [activeSession(makeSession('a', { pairs }))] });

describe('Store: the Images selector value in the draft (T27)', () => {
  it('FR-4: the draft starts with imageCount 1', async () => {
    const { store } = await seeded();
    expect(store.draft().imageCount).toBe(1);
  });

  it('AC-3: setDraft({ imageCount }) keeps 2 and 4 [characterization]', async () => {
    const { store } = await seeded();
    store.setDraft({ imageCount: 4 });
    expect(store.draft().imageCount).toBe(4);
    store.setDraft({ imageCount: 2 });
    expect(store.draft().imageCount).toBe(2);
  });

  it('FR-4 failure path: a value outside {1, 2, 4} that reaches the draft is treated as 1 - it is never kept and never sent as a count', async () => {
    const { store, llm } = await seeded();
    for (const bad of [0, 3, 5, 99, -2, '4', null, 2.5]) {
      store.setDraft({ imageCount: bad });
      expect(store.draft().imageCount, String(bad)).toBe(1);
    }
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse()));
    store.setDraft({ imageCount: 3, text: 'a mug' });
    await store.send();
    expect('imageCount' in lastRequest(llm)).toBe(false);
  });

  it('FR-4 (Proposed, OD-11): the value resets to 1 on a new session', async () => {
    const { store } = await seeded();
    store.setDraft({ imageCount: 4 });
    expect(await store.newSession()).toBe(true);
    expect(store.draft().imageCount).toBe(1);
  });
});

describe('Store: send carries the count (T27)', () => {
  it('AC-3: with the selector at 4 the request that reaches the HTTP layer carries imageCount 4', async () => {
    const { store, llm } = await seeded();
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(4, 'a'), costUsd: 0.16, batch: batch(4, 4, 4) })));
    store.setDraft({ text: 'a white mug', imageCount: 4 });
    await store.send();
    expect(llm.generateImage).toHaveBeenCalledTimes(1);
    expect(lastRequest(llm).imageCount).toBe(4);
  });

  it('FR-4: with the selector at 1 the request carries NO imageCount field - a one-image request is exactly as before [characterization]', async () => {
    const { store, llm } = await seeded();
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse()));
    store.setDraft({ text: 'a white mug' });
    await store.send();
    expect('imageCount' in lastRequest(llm)).toBe(false);
  });
});

describe('Store: N images become N consecutive versions of one turn (T27)', () => {
  it('AC-3: 4 images add the versions v2..v5 (after the existing v1), all pointing at the SAME model turn, with consecutive numbers [characterization]', async () => {
    const { store, llm } = await seeded(1);
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(4, 'a'), costUsd: 0.16, batch: batch(4, 4, 4) })));
    store.setDraft({ text: 'a white mug', imageCount: 4 });
    await store.send();
    const versions = store.versions();
    expect(versions.map((v: any) => v.number)).toEqual([1, 2, 3, 4, 5]);
    const added = versions.slice(1);
    expect(new Set(added.map((v: any) => v.turnId)).size).toBe(1);
    expect(added.map((v: any) => v.partIndex)).toEqual([0, 1, 2, 3]);
    expect(added.every((v: any) => v.model === 'gemini-3.1-flash-image' && v.resolution === '1K')).toBe(true);
  });

  it('FR-7 (b): the 4 results are stored as ONE model turn whose parts are exactly the returned parts in order, thoughtSignatures included [characterization]', async () => {
    const { store, llm } = await seeded(1);
    const parts = tagged(4, 'sig');
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts, costUsd: 0.16, batch: batch(4, 4, 4) })));
    store.setDraft({ text: 'a white mug', imageCount: 4 });
    await store.send();
    const turnId = store.versions().at(-1).turnId;
    const stored = store.currentSession().turns.find((t: any) => t.id === turnId);
    expect(stored.role).toBe('model');
    expect(stored.parts).toEqual(parts);
  });

  it('FR-5 / NFR-1: the cost recorded for the turn and added to the session is the response total for the 4 images [characterization]', async () => {
    const { store, llm } = await seeded(1);
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(4, 'a'), costUsd: 0.16, batch: batch(4, 4, 4) })));
    store.setDraft({ text: 'a white mug', imageCount: 4 });
    const before = store.costUsd();
    await store.send();
    expect(store.costUsd()).toBeCloseTo(before + 0.16, 10);
    const turnId = store.versions().at(-1).turnId;
    expect(store.currentSession().turns.find((t: any) => t.id === turnId).cost).toBeCloseTo(0.16, 10);
  });

  it('FR-24: the single status announces the HIGHEST new version once (v5), not one announcement per image [characterization]', async () => {
    const { store, llm } = await seeded(1);
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(4, 'a'), costUsd: 0.16, batch: batch(4, 4, 4) })));
    store.setDraft({ text: 'a white mug', imageCount: 4 });
    await store.send();
    expect(store.statusMessage()).toBe('Version v5 is ready');
  });

  it('FR-7 (b) / FR-35: the NEXT request after a merged turn is a valid alternating history that echoes the merged model turn exactly as stored [characterization]', async () => {
    const { store, llm } = await seeded(1);
    const parts = tagged(4, 'echo');
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts, costUsd: 0.16, batch: batch(4, 4, 4) })));
    store.setDraft({ text: 'a white mug', imageCount: 4 });
    await store.send();
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse()));
    store.setDraft({ text: 'make the shadow softer' });
    await store.send();
    const history = lastRequest(llm).history;
    expect(history).toHaveLength(4); // u1 m1 and the merged pair
    expect(history.map((t: any) => t.role)).toEqual(['user', 'model', 'user', 'model']);
    expect(history[3].parts).toEqual(parts);
    expect(new Set([...history.map((t: any) => t.id), lastRequest(llm).newTurn.id]).size).toBe(5);
  });
});

describe('Store: a partial result keeps the successes and bills the total (T27)', () => {
  it('AC-5: 2 of 4 fail -> the turn shows the 2 successful images (v2, v3) and the session cost grows by the response total for 2 [characterization]', async () => {
    const { store, llm } = await seeded(1);
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(2, 'ok'), costUsd: 0.08, batch: batch(4, 4, 2, [{ cause: 'safety' }, { cause: 'empty' }]) })));
    store.setDraft({ text: 'a white mug', imageCount: 4 });
    const before = store.costUsd();
    await store.send();
    expect(store.versions().map((v: any) => v.number)).toEqual([1, 2, 3]);
    expect(store.costUsd()).toBeCloseTo(before + 0.08, 10);
  });

  it('FR-24 (OD-6e): in a mixed outcome the single status announces the highest successful version [characterization]', async () => {
    const { store, llm } = await seeded(1);
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(2, 'ok'), costUsd: 0.08, batch: batch(4, 4, 2, [{ cause: 'safety' }, { cause: 'empty' }]) })));
    store.setDraft({ text: 'a white mug', imageCount: 4 });
    await store.send();
    expect(store.statusMessage()).toBe('Version v3 is ready');
  });

  it('B-1: a response in which succeeded (images) exceeds the granted calls is committed in full - every paid image becomes a version [characterization]', async () => {
    const { store, llm } = await seeded(1);
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(3, 'x'), costUsd: 0.12, batch: batch(2, 2, 3) })));
    store.setDraft({ text: 'a white mug', imageCount: 2 });
    await store.send();
    expect(store.versions().map((v: any) => v.number)).toEqual([1, 2, 3, 4]);
  });
});

describe('Store: imageActionsCompleted counts actions that ended with at least one image (T27)', () => {
  it('starts at 0, counts a successful send, and does not count a failure, a text answer or a refused request', async () => {
    const { store, llm } = await seeded(1);
    expect(store.imageActionsCompleted()).toBe(0);

    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse()));
    store.setDraft({ text: 'first' });
    await store.send();
    expect(store.imageActionsCompleted()).toBe(1);

    llm.generateImage.mockResolvedValueOnce(failure(500));
    store.setDraft({ text: 'second' });
    await store.send();
    await flush();
    expect(store.imageActionsCompleted()).toBe(1);

    llm.generateImage.mockResolvedValueOnce(okBody(textResponse()));
    store.setDraft({ text: 'third' });
    await store.send();
    expect(store.imageActionsCompleted()).toBe(1);
  });

  it('a partial result (at least one image) counts as ONE completed action; a multi-image success also counts as one, not one per image', async () => {
    const { store, llm } = await seeded(1);
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(4, 'a'), costUsd: 0.16, batch: batch(4, 4, 4) })));
    store.setDraft({ text: 'four', imageCount: 4 });
    await store.send();
    expect(store.imageActionsCompleted()).toBe(1);
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'b'), costUsd: 0.04, batch: batch(4, 4, 1, [{ cause: 'safety' }, { cause: 'safety' }, { cause: 'empty' }]) })));
    store.setDraft({ text: 'partial', imageCount: 4 });
    await store.send();
    expect(store.imageActionsCompleted()).toBe(2);
  });
});


// ---------------------------------------------------------------------------------------------------------------------
// US-10.6 T28 - the batch warning and the failure lines in the ONE alert (AC-4, AC-5, FR-8, FR-9, FR-24; owner rulings SM-9 i, UA copy as proposed).
// PINNED: store.message() is the one pending alert; after an action whose response carries a batch with something to say it is
//   { region: 'alert', lines: string[] }   with lines = describeBatchOutcome(batch, lang) (batch-outcome.spec.ts), rendered inside that same alert;
// a clean batch (nothing to say) leaves message() null; the single status is unchanged (one announcement of the highest version).
// ---------------------------------------------------------------------------------------------------------------------
describe('Store: the batch warning and failure lines (T28)', () => {
  it('AC-4: 28 used, 4 asked, 2 granted and both succeeded -> the 2 images are shown AND the alert holds "Rate limit reached. Generated 2 of 4 images."', async () => {
    const { store, llm } = await seeded(1);
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(2, 'ok'), costUsd: 0.2, batch: batch(4, 2, 2) })));
    store.setDraft({ text: 'a white mug', imageCount: 4 });
    await store.send();
    expect(store.versions().map((v: any) => v.number)).toEqual([1, 2, 3]);
    expect(store.message()).toMatchObject({ region: 'alert', lines: ['Rate limit reached. Generated 2 of 4 images.'] });
  });

  it('AC-5: 2 of 4 fail -> the 2 images are shown AND the alert lists the summary and one line per cause', async () => {
    const { store, llm } = await seeded(1);
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(2, 'ok'), costUsd: 0.2, batch: batch(4, 4, 2, [{ cause: 'safety' }, { cause: 'empty' }]) })));
    store.setDraft({ text: 'a white mug', imageCount: 4 });
    await store.send();
    expect(store.versions()).toHaveLength(3);
    expect(store.message()?.lines).toEqual(['Could not generate 2 of 4 images.', 'blocked by the safety filter', 'empty response']);
  });

  it('SM-9 i: the mixed case (2 granted of 4, one of them fails) reads "Generated 1 of 4" followed by the failure lines, in one alert', async () => {
    const { store, llm } = await seeded(1);
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'ok'), costUsd: 0.1, batch: batch(4, 2, 1, [{ cause: 'retries_exhausted' }]) })));
    store.setDraft({ text: 'a white mug', imageCount: 4 });
    await store.send();
    expect(store.message()?.lines).toEqual(['Rate limit reached. Generated 1 of 4 images.', 'Could not generate 1 of 4 images.', 'no answer after retries']);
  });

  it('FR-24: the single status still announces only the highest successful version - the failure is the alert\'s business, not a second status [characterization]', async () => {
    const { store, llm } = await seeded(1);
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(2, 'ok'), costUsd: 0.2, batch: batch(4, 4, 2, [{ cause: 'safety' }, { cause: 'empty' }]) })));
    store.setDraft({ text: 'a white mug', imageCount: 4 });
    await store.send();
    expect(store.statusMessage()).toBe('Version v3 is ready');
  });

  it('AC-3: a clean 4-of-4 batch leaves no alert [characterization]', async () => {
    const { store, llm } = await seeded(1);
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(4, 'ok'), costUsd: 0.4, batch: batch(4, 4, 4) })));
    store.setDraft({ text: 'a white mug', imageCount: 4 });
    await store.send();
    expect(store.message()).toBeNull();
  });

  it('FR-9: the alert is cleared when the next action starts', async () => {
    const { store, llm } = await seeded(1);
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(2, 'ok'), costUsd: 0.2, batch: batch(4, 2, 2) })));
    store.setDraft({ text: 'first', imageCount: 4 });
    await store.send();
    expect(store.message()).not.toBeNull();
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse()));
    store.setDraft({ text: 'second', imageCount: 1 });
    await store.send();
    expect(store.message()).toBeNull();
  });
});
