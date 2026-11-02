/**
 * zip.spec.ts - US-10.1 T27 (FR-58, SD-28, AC-35; CF-17, D-22, FR-56).
 *
 * The archive is built with the EXISTING `jszip` dependency (NFR-7) and read back here with `JSZip.loadAsync`. Entry names
 * are asserted as literals taken from FR-56 (`bambu-lab-h2d_v3_1x1.webp` style), so this spec does not depend on how the
 * file-name builder is called.
 *
 * PINNED CONTRACT (src/utils/image-studio/zip.ts):
 *   buildZip(
 *     versions: Array<{ number: number; bytes: Uint8Array; mime: ImageMime /* S, as the API returned *\/;
 *                       targetMime: ImageMime /* T, the version's current selector value *\/; aspectRatio: string }>,
 *     deps: { codec: ImageCodec; productName: string }
 *   ): Promise<Uint8Array | null>
 *     - zero versions: resolves null (no archive is ever produced; the action is disabled, SD-28) and calls no codec
 *     - otherwise resolves the zip bytes: one entry per version, named per FR-56 from deps.productName, version.number,
 *       version.aspectRatio and the resulting format; each entry is the API bytes untouched when S equals T, else one
 *       codec.transcode to T (same rules as delivery.ts)
 *     - any conversion failure REJECTS with an Error named 'ZipBuildError'; nothing partial is ever returned
 *
 * Deliberately NOT asserted: the enabled/disabled state of the button (component spec of the version strip).
 */
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { makeFakeCodec, makeRaster, decodeRaster, type FakeCodec, type CodecTranscodeRequest } from '../../../test/image-studio/helpers/fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const PNG = 'image/png';
const JPG = 'image/jpeg';
const WEBP = 'image/webp';
const FORMAT = { [PNG]: 'png', [JPG]: 'jpg', [WEBP]: 'webp' } as const;

const version = (number: number, mime: string, targetMime: string, aspectRatio: string, size = { w: 640, h: 480 }) => ({
  number,
  bytes: makeRaster({ format: FORMAT[mime as keyof typeof FORMAT], width: size.w, height: size.h }),
  mime,
  targetMime,
  aspectRatio,
});

async function open(zipBytes: Uint8Array) {
  const zip = await JSZip.loadAsync(zipBytes);
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir).sort();
  const read = async (name: string) => zip.files[name].async('uint8array');
  return { names, read };
}

describe('FR-58 / AC-35: Download all versions', () => {
  it('AC-35 / FR-58 / CF-17: three retained versions with mixed target formats give three entries named per FR-56, each in its own format', async () => {
    const { buildZip } = await load('./zip');
    const codec = makeFakeCodec();
    const versions = [
      version(1, PNG, PNG, '1:1'),
      version(3, PNG, JPG, '16:9'), // gaps in numbering are allowed (FR-23)
      version(4, JPG, WEBP, '4:5'),
    ];
    const out = await buildZip(versions, { codec, productName: 'Bambu Lab H2D' });
    expect(out).toBeInstanceOf(Uint8Array);
    const { names, read } = await open(out);
    expect(names).toEqual(['bambu-lab-h2d_v1_1x1.png', 'bambu-lab-h2d_v3_16x9.jpg', 'bambu-lab-h2d_v4_4x5.webp']);
    expect(decodeRaster(await read('bambu-lab-h2d_v1_1x1.png'))!.format).toBe('png');
    expect(decodeRaster(await read('bambu-lab-h2d_v3_16x9.jpg'))!.format).toBe('jpg');
    expect(decodeRaster(await read('bambu-lab-h2d_v4_4x5.webp'))!.format).toBe('webp');
  });

  it('FR-58 / FR-82: an entry whose API format equals its target is the API bytes unchanged; only differing entries are transcoded (once each)', async () => {
    const { buildZip } = await load('./zip');
    const codec = makeFakeCodec();
    const v1 = version(1, PNG, PNG, '1:1');
    const v2 = version(2, PNG, JPG, '1:1');
    const v3 = version(3, WEBP, WEBP, '1:1');
    const out = await buildZip([v1, v2, v3], { codec, productName: 'x' });
    const { read } = await open(out);
    expect(await read('x_v1_1x1.png')).toEqual(v1.bytes);
    expect(await read('x_v3_1x1.webp')).toEqual(v3.bytes);
    expect(codec.transcodeCalls).toBe(1);
    expect((codec.calls[0] as { req: CodecTranscodeRequest }).req.targetMime).toBe(JPG);
  });

  it('FR-58 / FR-55: a converted entry keeps the native pixel size (no resize) and the JPG white-fill / quality 90 parameters', async () => {
    const { buildZip } = await load('./zip');
    const codec = makeFakeCodec();
    const out = await buildZip([version(2, PNG, JPG, '4:3', { w: 3000, h: 2250 })], { codec, productName: 'p' });
    const { read } = await open(out);
    const d = decodeRaster(await read('p_v2_4x3.jpg'))!;
    expect([d.width, d.height, d.quality, d.filledWhite]).toEqual([3000, 2250, 90, true]);
  });

  it('FR-56 / FR-58: an empty product name falls back to `image` in every entry name', async () => {
    const { buildZip } = await load('./zip');
    const out = await buildZip([version(1, PNG, PNG, '1:1'), version(2, PNG, PNG, '9:16')], { codec: makeFakeCodec(), productName: '' });
    const { names } = await open(out);
    expect(names).toEqual(['image_v1_1x1.png', 'image_v2_9x16.png']);
  });

  it('SD-28 / FR-58: zero retained versions produce no archive (null) and call no codec - an empty ZIP is never produced', async () => {
    const { buildZip } = await load('./zip');
    const codec = makeFakeCodec();
    const out = await buildZip([], { codec, productName: 'anything' });
    expect(out).toBeNull();
    expect(codec.calls).toHaveLength(0);
  });

  it('FR-58 failure path: a conversion failure rejects with ZipBuildError and no archive is returned', async () => {
    const { buildZip } = await load('./zip');
    const codec = makeFakeCodec({ transcodeFails: true });
    const err: any = await buildZip([version(1, PNG, PNG, '1:1'), version(2, PNG, JPG, '1:1')], { codec, productName: 'p' })
      .then((v: unknown) => ({ resolved: v }), (e: unknown) => e);
    expect(err.resolved).toBeUndefined();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ZipBuildError');
  });

  it('FR-58 failure path: a failure on the LAST of several conversions still yields no partial archive', async () => {
    const { buildZip } = await load('./zip');
    const base: FakeCodec = makeFakeCodec();
    let n = 0;
    const codec = {
      ...base,
      probe: base.probe,
      transcode: async (req: CodecTranscodeRequest) => {
        n += 1;
        if (n === 3) throw new Error('third conversion fails');
        return base.transcode(req);
      },
    };
    const versions = [version(1, PNG, JPG, '1:1'), version(2, PNG, WEBP, '1:1'), version(3, JPG, PNG, '1:1')];
    const err: any = await buildZip(versions, { codec, productName: 'p' }).then((v: unknown) => ({ resolved: v }), (e: unknown) => e);
    expect(err.resolved).toBeUndefined();
    expect(err.name).toBe('ZipBuildError');
    expect(n).toBe(3);
  });

  it('FR-50 / FR-58: the archive holds exactly the versions it was given (it never mixes sessions - one entry per given version)', async () => {
    const { buildZip } = await load('./zip');
    const out = await buildZip([version(1, PNG, PNG, '1:1')], { codec: makeFakeCodec(), productName: 'p' });
    const { names } = await open(out);
    expect(names).toHaveLength(1);
  });
});
