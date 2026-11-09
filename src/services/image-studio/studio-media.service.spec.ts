/**
 * US-10.5 T19 - StudioMediaService: render-time image size and input-thumbnail sources (Specification FR-7 (+ Proposed OD-23), FR-3 (a);
 * plan DD-9). Closes the "fan-out" gap: the codec probe is called ONCE per distinct image however often the feed re-renders.
 *
 * Runner: test:logic, `Injector.create` (see test/image-studio/helpers/service-setup.ts). The fake codec exposes `probeCalls`.
 *
 * PINNED CONTRACT (src/services/image-studio/studio-media.service.ts, owner T19; container-scoped `@Injectable()`, not root):
 *   sizeOf(key: string, getBytes: () => Uint8Array | null): Signal<{ width: number; height: number } | null>
 *       `key` is `turnId:partIndex`. The signal is `null` until the probe resolves, `null` when the probe rejects (never retried, never
 *       surfaced), and `null` when `getBytes()` gives no bytes (the codec is then not called). The probe runs once per distinct key.
 *   thumbFor(sessionId: string, turn: Turn, partIndex: number): Signal<string | null>
 *       a data URL (`data:<mime>;base64,<data>`): the part's `inlineData` directly, or for a `fileData` part the bytes of
 *       SESSION_STORE_PORT.getSentBytes(sessionId, fileUri); `null` when the bytes are gone (nothing is rendered, no error).
 *   Both caches are cleared when the current session id changes; the clearing is observable on the NEXT call (no change-detection
 *   pass is needed), so a re-read after a switch probes again.
 */
import { describe, it, expect } from 'vitest';
import { flush } from '../../../test/image-studio/helpers/core-fixtures';
import { setupStudioServices, activeNow } from '../../../test/image-studio/helpers/service-setup';
import { makeRaster, makeSession, turn, textPart, filePart, inlineImagePart, toBase64 } from '../../../test/image-studio/helpers/fakes';

const png = (w: number, h: number, size = 200) => makeRaster({ format: 'png', width: w, height: h, size });
const seedA = () => activeNow(makeSession('a', { pairs: 1 }));

describe('FR-7: the image size is probed once per distinct image (T19)', () => {
  it('reads null while the probe is pending, then {width, height} as the codec reports it', async () => {
    const { media } = await setupStudioServices({ seed: [seedA()] });
    const size = media.sizeOf('m1:0', () => png(640, 480));
    expect(size()).toBeNull();
    await flush();
    expect(size()).toEqual({ width: 640, height: 480 });
  });

  it('OD-23: for N distinct images the number of probe calls stays N across any number of re-reads', async () => {
    const { media, codec } = await setupStudioServices({ seed: [seedA()] });
    const images = [png(10, 10, 100), png(20, 20, 101), png(30, 30, 102)];
    for (let round = 0; round < 5; round++) {
      images.forEach((bytes, i) => media.sizeOf(`m${i}:0`, () => bytes));
    }
    await flush();
    for (let round = 0; round < 5; round++) {
      images.forEach((bytes, i) => media.sizeOf(`m${i}:0`, () => bytes));
    }
    await flush();
    expect(codec.probeCalls).toBe(3);
  });

  it('the same key returns the same cached result and getBytes is not asked again once cached', async () => {
    const { media, codec } = await setupStudioServices({ seed: [seedA()] });
    let asked = 0;
    const getBytes = () => { asked += 1; return png(8, 6); };
    media.sizeOf('m1:0', getBytes);
    await flush();
    const again = media.sizeOf('m1:0', getBytes);
    expect(again()).toEqual({ width: 8, height: 6 });
    expect(codec.probeCalls).toBe(1);
    expect(asked).toBeLessThanOrEqual(1);
  });

  it('FR-7 failure path: bytes that cannot be decoded give null, no exception, and the probe is never retried', async () => {
    const { media, codec } = await setupStudioServices({ seed: [seedA()], codec: { probeFails: true } });
    const size = media.sizeOf('m1:0', () => png(5, 5));
    await flush();
    expect(size()).toBeNull();
    media.sizeOf('m1:0', () => png(5, 5));
    await flush();
    expect(codec.probeCalls).toBe(1);
  });

  it('missing bytes give null and the codec is not called', async () => {
    const { media, codec } = await setupStudioServices({ seed: [seedA()] });
    const size = media.sizeOf('m1:0', () => null);
    await flush();
    expect(size()).toBeNull();
    expect(codec.probeCalls).toBe(0);
  });

  it('a session switch clears the cache: the same key is probed again afterwards', async () => {
    const { media, codec, store } = await setupStudioServices({
      seed: [seedA(), (() => { const b = activeNow(makeSession('b', { pairs: 1 })); b.meta.lastActivity -= 1_000; return b; })()],
    });
    expect(store.currentSessionId()).toBe('a');
    media.sizeOf('m1:0', () => png(8, 8));
    await flush();
    expect(codec.probeCalls).toBe(1);

    await store.selectSession('b');
    media.sizeOf('m1:0', () => png(8, 8));
    await flush();
    expect(codec.probeCalls).toBe(2);
  });
});

describe('FR-3 (a): input thumbnail sources (T19)', () => {
  const B64 = toBase64(png(4, 4));

  it('an inlineData part (an attached earlier version) gives its own data URL, with no storage read', async () => {
    const { media, port } = await setupStudioServices({ seed: [seedA()] });
    const t = turn('u1', 'user', textPart('edit'), inlineImagePart('image/png', B64));
    const src = media.thumbFor('a', t, 1);
    await flush();
    expect(src()).toBe(`data:image/png;base64,${B64}`);
    expect(port.log.filter((l) => l.startsWith('getSentBytes'))).toEqual([]);
  });

  it('a fileData part (an upload) is read from the sent-bytes store and given as a data URL', async () => {
    const bytes = png(4, 4, 150);
    const { media, port } = await setupStudioServices({ seed: [seedA()] });
    await port.putSentBytes('a', 'files/up-1', bytes, 'image/png');
    const t = turn('u1', 'user', textPart('blend'), filePart('files/up-1'));
    const src = media.thumbFor('a', t, 1);
    await flush();
    expect(src()).toBe(`data:image/png;base64,${toBase64(bytes)}`);
  });

  it('FR-3 failure path: a fileData part whose bytes are no longer stored gives null (the thumbnail is omitted) without an error', async () => {
    const { media } = await setupStudioServices({ seed: [seedA()] });
    const src = media.thumbFor('a', turn('u1', 'user', filePart('files/gone')), 0);
    await flush();
    expect(src()).toBeNull();
  });

  it('the same (session, turn, part) is read from storage once, however often it is asked for', async () => {
    const { media, port } = await setupStudioServices({ seed: [seedA()] });
    await port.putSentBytes('a', 'files/up-1', png(4, 4), 'image/png');
    const t = turn('u1', 'user', filePart('files/up-1'));
    for (let i = 0; i < 4; i++) media.thumbFor('a', t, 0);
    await flush();
    expect(port.log.filter((l) => l.startsWith('getSentBytes:a:files/up-1'))).toHaveLength(1);
  });

  it('a part index that is not an image part gives null', async () => {
    const { media } = await setupStudioServices({ seed: [seedA()] });
    const src = media.thumbFor('a', turn('u1', 'user', textPart('only text')), 0);
    await flush();
    expect(src()).toBeNull();
  });
});
