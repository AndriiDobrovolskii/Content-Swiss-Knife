/**
 * derived-action.spec.ts - US-10.6 T19 (FR-1, FR-2, FR-3; AC-1, AC-2; owner rulings SM-1 ii, SM-12 i, G-8 OD-7 / OD-8).
 *
 * `planDerivedAction` decides what an Upscale 4K or a Variation sends. PINNED CONTRACT (the plan fixes the name and the input fields; the shapes are fixed here):
 *   planDerivedAction({ kind: 'upscale' | 'variation', version, sessionModel, imageCount, catalogue })
 *     version   = { number, prompt, aspectRatio, resolution, model, image: { mimeType, data } }       the source version with its inline bytes
 *     catalogue = the image models of model-catalog.json ({ id, resolutions }[])
 *   -> { enabled: true, buildInput, storedPrompt } | { enabled: false, reasonId: string }
 *   buildInput (what the request builder receives; every field is asserted):
 *     omitHistory: true, attachedVersion: version.image, aspectRatio: version's, editOfVersion: version.number, NO presetId, NO chipId,
 *     model / resolution / text / imageCount as below
 *   Upscale:   resolution '4K'; text ABSENT (SM-12 i: no instruction text, the image alone); imageCount absent or 1;
 *              model = the session's model when it offers 4K, otherwise the first catalogue model that offers 4K (SM-1 ii: it RUNS on the supporting
 *              model; the session's own selected model is not part of the result and is never changed);
 *              an already-4K version is { enabled: false, reasonId } (FR-2 (d)).
 *   Variation: resolution = the version's own (never silently changed); text = the version's prompt when it is not blank, ABSENT otherwise (SM-12 i, FR-3 (a));
 *              imageCount = the Images value passed in; model = the session's model when it offers that resolution, otherwise the first catalogue model that
 *              does (a 4K version in a Flash session runs on Pro, SM-1 ii).
 *   storedPrompt = the SOURCE version's prompt, for both kinds (plan 8, N-8, G-8 OD-7): the store records it as the new version's prompt.
 * The function never mutates its input and never returns a request the catalogue would reject (a model / resolution pair it does not offer).
 */
import { describe, it, expect } from 'vitest';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const plan = async (input: Record<string, unknown>): Promise<any> => (await load('./derived-action')).planDerivedAction(input);

const FLASH = 'gemini-3.1-flash-image';
const PRO = 'gemini-3-pro-image';
const CATALOGUE = [
  { id: FLASH, resolutions: ['1K', '2K'] },
  { id: PRO, resolutions: ['1K', '2K', '4K'] },
];
const IMAGE = { mimeType: 'image/png', data: 'QUJDRA==' };
const version = (over: Record<string, unknown> = {}) => ({ number: 2, prompt: 'a white mug on a desk', aspectRatio: '4:5', resolution: '2K', model: PRO, image: IMAGE, ...over });
const base = (over: Record<string, unknown> = {}) => ({ kind: 'upscale', version: version(), sessionModel: PRO, imageCount: 1, catalogue: CATALOGUE, ...over });

describe('planDerivedAction: Upscale 4K (T19, AC-1, FR-1, FR-2, SM-12 i)', () => {
  it('AC-1: sends the source image with an empty history at 4K on Pro with the version\'s ratio, naming its source, and no preset', async () => {
    const out = await plan(base());
    expect(out.enabled).toBe(true);
    expect(out.buildInput).toMatchObject({ omitHistory: true, attachedVersion: IMAGE, aspectRatio: '4:5', resolution: '4K', model: PRO, editOfVersion: 2 });
    expect('presetId' in out.buildInput).toBe(false);
    expect('chipId' in out.buildInput).toBe(false);
  });

  it('SM-12 i: there is NO instruction text - no text field (or only a blank one) on the Upscale input', async () => {
    const out = await plan(base());
    expect(out.buildInput.text === undefined || String(out.buildInput.text).trim() === '').toBe(true);
  });

  it('FR-1: no image count is asked for (one image); the Images selector does not turn an Upscale into several', async () => {
    const out = await plan(base({ imageCount: 4 }));
    expect(out.buildInput.imageCount === undefined || out.buildInput.imageCount === 1).toBe(true);
  });

  it('SM-1 ii: in a FLASH session the Upscale RUNS ON PRO (the supporting model) - it is enabled, 4K, and no 4K request is sent to Flash', async () => {
    const out = await plan(base({ sessionModel: FLASH, version: version({ model: FLASH, resolution: '2K' }) }));
    expect(out.enabled).toBe(true);
    expect(out.buildInput.model).toBe(PRO);
    expect(out.buildInput.resolution).toBe('4K');
  });

  it('SM-1 ii: the result never carries a model / resolution pair the catalogue does not offer, whatever the session model', async () => {
    for (const sessionModel of [FLASH, PRO, 'gemini-retired-image']) {
      const out = await plan(base({ sessionModel }));
      const spec = CATALOGUE.find((m) => m.id === out.buildInput.model);
      expect(spec, sessionModel).toBeDefined();
      expect(spec!.resolutions).toContain(out.buildInput.resolution);
    }
  });

  it('FR-2 (d): a version that is already 4K is not upscaled again - the action is disabled with a reason id', async () => {
    const out = await plan(base({ version: version({ resolution: '4K' }) }));
    expect(out.enabled).toBe(false);
    expect(typeof out.reasonId).toBe('string');
    expect(out.reasonId.length).toBeGreaterThan(0);
    expect('buildInput' in out).toBe(false);
  });

  it('plan 8 (N-8): storedPrompt is the SOURCE version\'s prompt although nothing is sent; a blank source gives a blank storedPrompt', async () => {
    expect((await plan(base())).storedPrompt).toBe('a white mug on a desk');
    expect((await plan(base({ version: version({ prompt: '' }) }))).storedPrompt).toBe('');
  });
});

describe('planDerivedAction: Variation (T19, AC-2, FR-3, SM-12 i)', () => {
  const variation = (over: Record<string, unknown> = {}) => base({ kind: 'variation', ...over });

  it('AC-2: sends the source image AND its original prompt, empty history, at the version\'s own resolution and ratio, K = the Images value', async () => {
    const out = await plan(variation({ imageCount: 2 }));
    expect(out.enabled).toBe(true);
    expect(out.buildInput).toMatchObject({ omitHistory: true, attachedVersion: IMAGE, aspectRatio: '4:5', resolution: '2K', model: PRO, editOfVersion: 2, text: 'a white mug on a desk', imageCount: 2 });
    expect('presetId' in out.buildInput).toBe(false);
  });

  it('FR-3 (e): K is whatever the Images value is at the call (1, 2 or 4)', async () => {
    for (const k of [1, 2, 4]) expect((await plan(variation({ imageCount: k }))).buildInput.imageCount, `K=${k}`).toBe(k);
  });

  it('FR-3 (a): a source with a blank or whitespace prompt is varied with the image alone - no text field', async () => {
    for (const prompt of ['', '   ', '\n']) {
      const out = await plan(variation({ version: version({ prompt }) }));
      expect(out.enabled).toBe(true);
      expect(out.buildInput.text === undefined || String(out.buildInput.text).trim() === '', JSON.stringify(prompt)).toBe(true);
    }
  });

  it('FR-3 (d): a Variation of a 4K version in a Pro session is a 4K request on Pro (never silently changed)', async () => {
    const out = await plan(variation({ version: version({ resolution: '4K' }) }));
    expect(out.buildInput.resolution).toBe('4K');
    expect(out.buildInput.model).toBe(PRO);
  });

  it('SM-1 ii: a 4K version varied in a FLASH session RUNS ON PRO at 4K - enabled, the output resolution is not changed to fit Flash', async () => {
    const out = await plan(variation({ sessionModel: FLASH, version: version({ model: PRO, resolution: '4K' }) }));
    expect(out.enabled).toBe(true);
    expect(out.buildInput.model).toBe(PRO);
    expect(out.buildInput.resolution).toBe('4K');
  });

  it('FR-3 (d): a Flash 2K version varied in a Flash session stays on Flash at 2K (a pair the catalogue allows - no needless switch to Pro)', async () => {
    const out = await plan(variation({ sessionModel: FLASH, version: version({ model: FLASH, resolution: '2K' }) }));
    expect(out.buildInput.model).toBe(FLASH);
    expect(out.buildInput.resolution).toBe('2K');
  });

  it('plan 8: storedPrompt equals the source prompt; planning a Variation of an UPSCALED version (whose stored prompt is the original) sends the original text with the image', async () => {
    const upscaled = version({ number: 4, resolution: '4K', prompt: 'a white mug on a desk' });
    const out = await plan(variation({ version: upscaled }));
    expect(out.storedPrompt).toBe('a white mug on a desk');
    expect(out.buildInput.text).toBe('a white mug on a desk');
  });
});

describe('planDerivedAction: purity (T19)', () => {
  it('does not mutate its input', async () => {
    const input = base({ kind: 'variation', imageCount: 4 });
    const before = structuredClone(input);
    await plan(input);
    expect(input).toEqual(before);
  });
});
