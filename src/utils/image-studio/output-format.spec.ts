/**
 * output-format.spec.ts - US-10.1 T26 (FR-82, AC-32; decisions D-19, D-20, D-21, D-22, OD-18 / OD-45).
 *
 * Covers the INPUT-FORMAT half of FR-82: which format a generated version inherits (first match wins) and how the
 * operator's selector value overrides it as the TARGET format. The byte-delivery half (cases i-vi, x-xii) is in
 * delivery.spec.ts.
 *
 * Module under test does not exist yet -> loaded at run time (one named red test per case, not one collection error).
 *
 * PINNED CONTRACT (src/utils/image-studio/output-format.ts; the plan names the file and the rule, not the signature):
 *   outputFormat(ctx: {
 *     uploadedFormats?: ImageMime[];        // formats of the user-uploaded images of THIS message, attachment order,
 *                                           // identified from the file as the user supplied it (D-19)
 *     attachedVersionFormat?: ImageMime;    // input format of the version attached under FR-37 / a seed, if any
 *     latestVersionFormat?: ImageMime;      // input format of the session's latest version, if the session has one
 *   }): ImageMime                            // 'image/png' | 'image/jpeg' | 'image/webp'
 *   resolveTargetFormat(inputFormat: ImageMime, selectorChoice?: ImageMime): ImageMime
 *     // the input format is only the DEFAULT of the selector; a choice made before downloading wins (rule (e))
 *
 * Deliberately NOT asserted: how the format of a file is detected from its bytes (magic-byte specs own that).
 */
import { describe, it, expect } from 'vitest';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const PNG = 'image/png';
const JPG = 'image/jpeg';
const WEBP = 'image/webp';

describe('FR-82 input format: first match wins (rules a to c)', () => {
  it('FR-82 (vii): a PNG upload first and a JPG upload second gives input format PNG (the FIRST upload decides)', async () => {
    const { outputFormat } = await load('./output-format');
    expect(outputFormat({ uploadedFormats: [PNG, JPG] })).toBe(PNG);
  });

  it('FR-82 (vii) mirrored: a JPG upload first and a PNG upload second gives JPG (attachment order, not a fixed preference)', async () => {
    const { outputFormat } = await load('./output-format');
    expect(outputFormat({ uploadedFormats: [JPG, PNG, WEBP] })).toBe(JPG);
  });

  it('FR-82 / D-21: a message with an upload AND an attached version takes the format of the first upload, not the version', async () => {
    const { outputFormat } = await load('./output-format');
    expect(outputFormat({ uploadedFormats: [WEBP], attachedVersionFormat: JPG, latestVersionFormat: PNG })).toBe(WEBP);
  });

  it('FR-82 (viii): v2 made by "Edit this version" on a JPG-input v1 inherits JPG (attached version, no upload)', async () => {
    const { outputFormat } = await load('./output-format');
    // The latest version deliberately differs, so only rule (c) can produce JPG.
    expect(outputFormat({ uploadedFormats: [], attachedVersionFormat: JPG, latestVersionFormat: PNG })).toBe(JPG);
    expect(outputFormat({ attachedVersionFormat: JPG, latestVersionFormat: PNG })).toBe(JPG);
  });

  it('FR-82 / D-20: a text-only follow-up (no upload, no attached version) inherits the latest version\'s input format', async () => {
    const { outputFormat } = await load('./output-format');
    expect(outputFormat({ latestVersionFormat: WEBP })).toBe(WEBP);
    expect(outputFormat({ uploadedFormats: [], latestVersionFormat: JPG })).toBe(JPG);
  });

  it('FR-82 (ix): a text-to-image message in a session with no version has input format PNG', async () => {
    const { outputFormat } = await load('./output-format');
    expect(outputFormat({})).toBe(PNG);
    expect(outputFormat({ uploadedFormats: [] })).toBe(PNG);
  });

  it('FR-82: an upload of each format is honoured when it is the only input (PNG, JPG, WEBP)', async () => {
    const { outputFormat } = await load('./output-format');
    expect(outputFormat({ uploadedFormats: [PNG] })).toBe(PNG);
    expect(outputFormat({ uploadedFormats: [JPG] })).toBe(JPG);
    expect(outputFormat({ uploadedFormats: [WEBP] })).toBe(WEBP);
  });
});

describe('FR-82 / AC-32 / D-22 target format: the selector overrides the default', () => {
  it('AC-32 / FR-82 (v): with no selector change the target equals the input format (a JPG-input version defaults to JPG)', async () => {
    const { resolveTargetFormat } = await load('./output-format');
    expect(resolveTargetFormat(JPG)).toBe(JPG);
    expect(resolveTargetFormat(PNG, undefined)).toBe(PNG);
  });

  it('AC-32 / FR-82 (vi): the operator changing the selector from JPG to WEBP wins over the inherited format', async () => {
    const { resolveTargetFormat } = await load('./output-format');
    expect(resolveTargetFormat(JPG, WEBP)).toBe(WEBP);
    expect(resolveTargetFormat(WEBP, PNG)).toBe(PNG);
    expect(resolveTargetFormat(PNG, JPG)).toBe(JPG);
  });

  it('FR-82 / D-22: selecting the same format as the input is a no-op (target equals input)', async () => {
    const { resolveTargetFormat } = await load('./output-format');
    expect(resolveTargetFormat(WEBP, WEBP)).toBe(WEBP);
  });
});
