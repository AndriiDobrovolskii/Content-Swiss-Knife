/**
 * image-studio.store.derived.spec.ts - US-10.6 T31, the cases that do NOT depend on a seam (FR-1, FR-2 (a), (d), (e), FR-3, FR-7; AC-1, AC-2).
 *
 * Runner: test:logic, the real ImageStudioStore on `Injector.create` with test doubles (test/image-studio/helpers/store-harness.ts); no TestBed.
 * Describes end "(T31)" so `-t "\(T31\)"` selects them (the breakdown lists them under image-studio.store.generation.spec.ts; they live here to keep that
 * ~1000-line file untouched, AC-15).
 *
 * PINNED CONTRACT (plan 7.2 and 8; names in the plan, shapes fixed here):
 *   store.upscale(versionNumber): Promise<void>      one generate request with an EMPTY history and a new turn that carries ONLY the source version inline
 *                                                    (no text part - no Upscale instruction text exists, SM-12), the version's aspect ratio, resolution '4K',
 *                                                    the Pro model, no preset, no imageCount; stored through the existing execute() path
 *   store.variation(versionNumber): Promise<void>    the same shape with the source version inline PLUS the source version's stored prompt as a text part
 *                                                    (none when the prompt is blank), imageCount = draft().imageCount at the click (omitted when 1),
 *                                                    the source version's aspect ratio and resolution, the source's model
 *   the new versions take the next numbers after the session's HIGHEST (nothing is renumbered), carry resolution / model of the request and
 *   `editOfVersion` = the source number, and a derived version's stored `prompt` is the SOURCE version's prompt (plan 8 "What prompt an Upscale carries")
 *
 * SM-1 ii and SM-12 i are RULED (owner, 2026-11-14): in a Flash session an Upscale (and a Variation of a 4K version) runs on the supporting model (Pro) without
 * changing the session's selected model - asserted in the last describe - and no Upscale / Variation instruction text exists (Upscale = the image alone).
 *
 * Needs T1 check 1 (the vendor accepting a 4K image-to-image edit) for AC-1 to hold in production; these cases use a stub and assert the REQUEST, which is
 * what the store controls. The live 4K edit was accepted on Pro (evidence E2); the live smoke of the changed route stays an obligation (AGENTS.md section 6 item 9, T40).
 */
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { setupStore, activeSession } from '../../../test/image-studio/helpers/store-harness';
import { makeSession } from '../../../test/image-studio/helpers/fakes';
import { imagesResponse, imagePart, okBody, failure } from '../../../test/image-studio/helpers/core-fixtures';

const PRO = 'gemini-3-pro-image';
const FLASH = 'gemini-3.1-flash-image';
const tagged = (n: number, tag: string) => Array.from({ length: n }, (_, i) => imagePart({ thoughtSignature: `${tag}-${i + 1}` }));
const lastRequest = (llm: any) => llm.generateImage.mock.calls.at(-1)[0];
const textParts = (request: any) => request.newTurn.parts.filter((p: any) => typeof p.text === 'string');
const imageParts = (request: any) => request.newTurn.parts.filter((p: any) => p.inlineData);

/** Three Pro versions v1..v3 (2K, 4:5) with prompts "prompt 1".."prompt 3"; v2 can be turned into a 4K version by the case. */
function proSession(mutate?: (s: ReturnType<typeof makeSession>) => void) {
  const s = makeSession('a', { pairs: 3, model: PRO });
  s.meta.versions.forEach((v) => { v.resolution = '2K'; v.aspectRatio = '4:5'; });
  mutate?.(s);
  return activeSession(s);
}
const storedImage = (store: any, turnId: string) => store.currentSession().turns.find((t: any) => t.id === turnId).parts[0].inlineData;

describe('Store: Upscale 4K (T31)', () => {
  it('AC-1: Upscale of v1 sends an EMPTY history and one new turn holding ONLY v1 inline, at 4K on the Pro model, with the version\'s aspect ratio, no preset and no count', async () => {
    const { store, llm } = await setupStore({ seed: [proSession()] });
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'up') })));
    await store.upscale(1);
    expect(llm.generateImage).toHaveBeenCalledTimes(1);
    const request = lastRequest(llm);
    expect(request.history).toEqual([]);
    expect(request.model).toBe(PRO);
    expect(request.resolution).toBe('4K');
    expect(request.aspectRatio).toBe('4:5');
    expect('presetId' in request).toBe(false);
    expect('imageCount' in request).toBe(false);
    expect(textParts(request)).toEqual([]);
    expect(imageParts(request)).toHaveLength(1);
    expect(imageParts(request)[0].inlineData).toEqual(storedImage(store, 'm1'));
  });

  it('AC-1 / OD-7 (Proposed): Upscale of a NON-latest version (v1 of v1..v3) creates v4 - the next number after the session\'s highest - and renumbers nothing', async () => {
    const { store, llm } = await setupStore({ seed: [proSession()] });
    const before = store.versions().map((v: any) => ({ number: v.number, turnId: v.turnId, resolution: v.resolution }));
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'up') })));
    await store.upscale(1);
    const after = store.versions();
    expect(after.map((v: any) => v.number)).toEqual([1, 2, 3, 4]);
    expect(after.slice(0, 3).map((v: any) => ({ number: v.number, turnId: v.turnId, resolution: v.resolution }))).toEqual(before);
  });

  it('AC-1: the new version\'s resolution label is 4K and its model is the Pro model, and it names its source (editOfVersion 1)', async () => {
    const { store, llm } = await setupStore({ seed: [proSession()] });
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'up') })));
    await store.upscale(1);
    const created = store.versions().find((v: any) => v.number === 4);
    expect(created.resolution).toBe('4K');
    expect(created.model).toBe(PRO);
    expect(created.aspectRatio).toBe('4:5');
    expect(created.editOfVersion).toBe(1);
  });

  it('plan 8 (N-8): the Upscale version\'s stored prompt is the SOURCE version\'s prompt, although no text was sent', async () => {
    const { store, llm } = await setupStore({ seed: [proSession()] });
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'up') })));
    await store.upscale(2);
    expect(textParts(lastRequest(llm))).toEqual([]);
    expect(store.versions().find((v: any) => v.number === 4).prompt).toBe('prompt 2');
  });

  it('FR-7 / FR-2 (e): history keeps its alternating shape - the stored session ends with a user turn and a model turn for the upscale, an even number of turns', async () => {
    const { store, llm } = await setupStore({ seed: [proSession()] });
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'up') })));
    await store.upscale(1);
    const turns = store.currentSession().turns;
    expect(turns).toHaveLength(8);
    expect(turns.map((t: any) => t.role)).toEqual(['user', 'model', 'user', 'model', 'user', 'model', 'user', 'model']);
  });

  it('FR-24: the single status announces the new version once', async () => {
    const { store, llm } = await setupStore({ seed: [proSession()] });
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'up') })));
    await store.upscale(1);
    expect(store.statusMessage()).toBe('Version v4 is ready');
  });

  it('FR-1 failure path: when the call fails no version is added, the session cost is unchanged, the source is unchanged and the failure is shown', async () => {
    const { store, llm } = await setupStore({ seed: [proSession()] });
    const before = { versions: structuredClone(store.versions()), cost: store.costUsd() };
    llm.generateImage.mockResolvedValueOnce(failure(502, 'EMPTY_RESPONSE'));
    await store.upscale(1);
    expect(store.versions()).toEqual(before.versions);
    expect(store.costUsd()).toBe(before.cost);
    expect(store.message()).not.toBeNull();
  });

  it('FR-2 (d) (Proposed, OD-7): a version that is ALREADY 4K cannot be upscaled - nothing is sent and nothing is stored', async () => {
    const { store, llm } = await setupStore({ seed: [proSession((s) => { s.meta.versions[1].resolution = '4K'; })] });
    const before = structuredClone(store.versions());
    await store.upscale(2);
    expect(llm.generateImage).not.toHaveBeenCalled();
    expect(store.versions()).toEqual(before);
  });

  it('upscale of a version that does not exist sends nothing', async () => {
    const { store, llm } = await setupStore({ seed: [proSession()] });
    await store.upscale(99);
    expect(llm.generateImage).not.toHaveBeenCalled();
  });
});

describe('Store: Variation (T31)', () => {
  it('AC-2: Variation of v1 with the Images selector at 2 sends v1 inline AND its original prompt, empty history, imageCount 2, at v1\'s own resolution, ratio and model', async () => {
    const { store, llm } = await setupStore({ seed: [proSession()] });
    store.setDraft({ imageCount: 2 });
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(2, 'var'), costUsd: 0.2, batch: { requested: 2, granted: 2, succeeded: 2, failures: [] } })));
    await store.variation(1);
    expect(llm.generateImage).toHaveBeenCalledTimes(1);
    const request = lastRequest(llm);
    expect(request.history).toEqual([]);
    expect(request.imageCount).toBe(2);
    expect(request.model).toBe(PRO);
    expect(request.resolution).toBe('2K');
    expect(request.aspectRatio).toBe('4:5');
    expect('presetId' in request).toBe(false);
    expect(textParts(request).map((p: any) => p.text)).toEqual(['prompt 1']);
    expect(imageParts(request)).toHaveLength(1);
    expect(imageParts(request)[0].inlineData).toEqual(storedImage(store, 'm1'));
  });

  it('AC-2: with K = 2 the session gains 2 new versions with consecutive numbers (v4, v5) in the same turn', async () => {
    const { store, llm } = await setupStore({ seed: [proSession()] });
    store.setDraft({ imageCount: 2 });
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(2, 'var'), costUsd: 0.2, batch: { requested: 2, granted: 2, succeeded: 2, failures: [] } })));
    await store.variation(1);
    const added = store.versions().filter((v: any) => v.number > 3);
    expect(added.map((v: any) => v.number)).toEqual([4, 5]);
    expect(new Set(added.map((v: any) => v.turnId)).size).toBe(1);
    expect(added.every((v: any) => v.editOfVersion === 1 && v.prompt === 'prompt 1')).toBe(true);
  });

  it('FR-3 (e): K is the Images value at the moment of the click - 4 is sent as 4, and the composer selector is left as the operator set it', async () => {
    const { store, llm } = await setupStore({ seed: [proSession()] });
    store.setDraft({ imageCount: 4 });
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(4, 'var'), costUsd: 0.4, batch: { requested: 4, granted: 4, succeeded: 4, failures: [] } })));
    await store.variation(2);
    expect(lastRequest(llm).imageCount).toBe(4);
    expect(store.draft().imageCount).toBe(4);
  });

  it('FR-3: with the selector at 1 the Variation request carries no imageCount field and adds one version', async () => {
    const { store, llm } = await setupStore({ seed: [proSession()] });
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'var') })));
    await store.variation(3);
    expect('imageCount' in lastRequest(llm)).toBe(false);
    expect(store.versions().map((v: any) => v.number)).toEqual([1, 2, 3, 4]);
  });

  it('FR-3 (a): a source version with a BLANK prompt is varied with the image alone - there is no text part, and the request is still sent', async () => {
    const { store, llm } = await setupStore({ seed: [proSession((s) => { s.meta.versions[0].prompt = ''; })] });
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'var') })));
    await store.variation(1);
    expect(llm.generateImage).toHaveBeenCalledTimes(1);
    expect(textParts(lastRequest(llm))).toEqual([]);
    expect(imageParts(lastRequest(llm))).toHaveLength(1);
    expect(store.versions().find((v: any) => v.number === 4).prompt).toBe('');
  });

  it('FR-3 (d): a Variation of a 4K version in a Pro session is a 4K request on the Pro model (the output resolution is the source\'s, not silently changed)', async () => {
    const { store, llm } = await setupStore({ seed: [proSession((s) => { s.meta.versions[1].resolution = '4K'; })] });
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'var') })));
    await store.variation(2);
    expect(lastRequest(llm).resolution).toBe('4K');
    expect(lastRequest(llm).model).toBe(PRO);
    expect(store.versions().find((v: any) => v.number === 4).resolution).toBe('4K');
  });

  it('FR-3 (d): a Variation in a Flash session of a Flash 2K version is a 2K request on Flash - a pair the catalogue allows', async () => {
    const flash = activeSession(makeSession('f', { pairs: 2, model: FLASH }));
    flash.meta.versions.forEach((v) => { v.resolution = '2K'; });
    const { store, llm } = await setupStore({ seed: [flash] });
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'var') })));
    await store.variation(1);
    expect(lastRequest(llm).model).toBe(FLASH);
    expect(lastRequest(llm).resolution).toBe('2K');
  });

  it('plan 8 (N-8): a Variation of an UPSCALED version sends the ORIGINAL prompt text with its image, not an image alone', async () => {
    const { store, llm } = await setupStore({ seed: [proSession()] });
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'up') })));
    await store.upscale(1); // creates v4 (4K) whose stored prompt is "prompt 1"
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'var') })));
    await store.variation(4);
    const request = lastRequest(llm);
    expect(textParts(request).map((p: any) => p.text)).toEqual(['prompt 1']);
    expect(imageParts(request)[0].inlineData).toEqual(storedImage(store, store.versions().find((v: any) => v.number === 4).turnId));
    expect(request.resolution).toBe('4K');
  });

  it('FR-3 failure path: when every image fails no version is added and the failure is shown; nothing is silent', async () => {
    const { store, llm } = await setupStore({ seed: [proSession()] });
    const before = structuredClone(store.versions());
    llm.generateImage.mockResolvedValueOnce(failure(502, 'EMPTY_RESPONSE'));
    await store.variation(1);
    expect(store.versions()).toEqual(before);
    expect(store.message()).not.toBeNull();
  });
});

describe('Store: a normal send still records its sent text (T31)', () => {
  it('a normal send records the text it sent as the new version\'s prompt [characterization]', async () => {
    const { store, llm } = await setupStore({ seed: [proSession()] });
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'send') })));
    store.setDraft({ text: 'a brand new prompt' });
    await store.send();
    expect(store.versions().find((v: any) => v.number === 4).prompt).toBe('a brand new prompt');
  });
});


// ---------------------------------------------------------------------------------------------------------------------
// SM-1 ii (owner ruling 2026-11-14): when the session's model cannot serve the action, the action RUNS ON THE SUPPORTING MODEL (Pro) without changing the
// session's selected model; the new version's model records the model that served it. No 4K request is ever sent to Flash.
// ---------------------------------------------------------------------------------------------------------------------
describe('Store: Upscale and Variation in a FLASH session run on Pro (T31, SM-1 ii)', () => {
  function flashSession(mutate?: (s: ReturnType<typeof makeSession>) => void) {
    const s = makeSession('f', { pairs: 2, model: FLASH });
    s.meta.versions.forEach((v) => { v.resolution = '2K'; });
    mutate?.(s);
    return activeSession(s);
  }

  it('AC-1: Upscale of a Flash 2K version in a Flash session sends a 4K request to PRO, never to Flash', async () => {
    const { store, llm } = await setupStore({ seed: [flashSession()] });
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'up') })));
    await store.upscale(1);
    expect(llm.generateImage).toHaveBeenCalledTimes(1);
    expect(lastRequest(llm).model).toBe(PRO);
    expect(lastRequest(llm).resolution).toBe('4K');
    expect(lastRequest(llm).history).toEqual([]);
  });

  it('SM-1 ii: the session\'s selected model is NOT changed - the composer draft and the session meta still say Flash - and the new version records Pro and 4K', async () => {
    const { store, llm } = await setupStore({ seed: [flashSession()] });
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'up') })));
    await store.upscale(1);
    expect(store.draft().model).toBe(FLASH);
    expect(store.currentSession().meta.model).toBe(FLASH);
    const created = store.versions().find((v: any) => v.number === 3);
    expect(created.model).toBe(PRO);
    expect(created.resolution).toBe('4K');
    expect(created.editOfVersion).toBe(1);
  });

  it('AC-2 / SM-1 ii: a Variation of a 4K version (made earlier on Pro) in a Flash session runs on PRO at 4K, with the output resolution unchanged', async () => {
    const { store, llm } = await setupStore({ seed: [flashSession((s) => { s.meta.versions[1].resolution = '4K'; s.meta.versions[1].model = PRO; })] });
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'var') })));
    await store.variation(2);
    expect(lastRequest(llm).model).toBe(PRO);
    expect(lastRequest(llm).resolution).toBe('4K');
    expect(textParts(lastRequest(llm)).map((p: any) => p.text)).toEqual(['prompt 2']);
    expect(store.draft().model).toBe(FLASH);
  });

  it('SM-12 i: the Upscale in a Flash session still sends the image ALONE - no instruction text', async () => {
    const { store, llm } = await setupStore({ seed: [flashSession()] });
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: tagged(1, 'up') })));
    await store.upscale(2);
    expect(textParts(lastRequest(llm))).toEqual([]);
    expect(imageParts(lastRequest(llm))).toHaveLength(1);
  });

  it('FR-1 failure path: a failed Upscale in a Flash session adds no version and leaves the selected model on Flash', async () => {
    const { store, llm } = await setupStore({ seed: [flashSession()] });
    const before = structuredClone(store.versions());
    llm.generateImage.mockResolvedValueOnce(failure(502, 'EMPTY_RESPONSE'));
    await store.upscale(1);
    expect(store.versions()).toEqual(before);
    expect(store.draft().model).toBe(FLASH);
  });
});
