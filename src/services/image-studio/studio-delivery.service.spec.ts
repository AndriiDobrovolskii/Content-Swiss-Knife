/**
 * US-10.5 T20 + T40 - StudioDeliveryService: the delivery state and actions that used to live privately in the version strip, now
 * native-format and shared (Specification FR-6, FR-11, FR-12; dispositions D-6, D-7, D-8; plan DD-6, DD-8).
 *
 * Runner: test:logic, `Injector.create` (test/image-studio/helpers/service-setup.ts): the real store, the real delivery modules
 * (`delivery.ts`, `zip.ts`, `file-name.ts`), the fakes behind the ports. `ARCHIVE_BUILDER_PORT` is a recording wrapper over the real
 * `buildZip` that can be told to throw (the only way X-21 is still reachable under native delivery, plan F-4).
 *
 * PINNED CONTRACT (src/services/image-studio/studio-delivery.service.ts, owner T20; container-scoped `@Injectable()`):
 *   items(): Array<{ version: Version; mime: ImageMime | null; data: string | null }>   retained versions, oldest first, with the API bytes
 *   busy(): boolean            true while a download, copy or archive build runs (generation does NOT set it)
 *   messageId(): string | null the studio text id of the last failure (X-18 .. X-22), cleared when the next action starts
 *   openView(): { number: number; compareWith?: number } | null    the open full-view state
 *   downloadAllDisabled(): boolean      items().length === 0 || busy()
 *   download(n), copy(n), edit(n): Promise<void>;  downloadAll(): Promise<void>
 *   open(n: number, opener?: HTMLElement | null, compareWith?: number): void;   close(): void   (close returns focus to the opener)
 * Native download: the bytes the API returned, untouched, with the extension of THEIR MIME (not of Version.inputFormat), and no codec call.
 *
 * Two kinds of top-level describe groups, selectable by `-t "\(T20\)"` / `-t "\(T40\)"` (breakdown rule R2). (T40) is written to the owner
 * ruling OI-A -> option a (docs/decisions/US-10.5-open-decisions.md): blank latest prompt => archive stem image-studio-versions; chip latest
 * => the chip instruction as the stem. Red until T20.
 */
import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import { flush, deferred } from '../../../test/image-studio/helpers/core-fixtures';
import { setupStudioServices, activeNow } from '../../../test/image-studio/helpers/service-setup';
import { sessionOf, bytesEqual } from '../../../test/image-studio/helpers/sessions';
import { makeSession, decodeRaster, turn, textPart } from '../../../test/image-studio/helpers/fakes';
import { ZipBuildError } from '../../utils/image-studio/zip';

const flagOf = (port: any, i: number, id = 's1') => port.snapshot().sessions[id].meta.versions[i].downloaded;

describe('FR-6 / D-6: one-click download is native - the API bytes, their MIME, their extension, no codec call (T20)', () => {
  it('a PNG version is saved with the API bytes unchanged as image_v1_1x1.png and the codec is not called', async () => {
    const { session, api } = sessionOf([{ api: 'png' }]);
    const { delivery, save, codec } = await setupStudioServices({ seed: [activeNow(session)] });
    await delivery.download(1);
    expect(save.saved).toHaveLength(1);
    expect(bytesEqual(save.saved[0].bytes, api[0])).toBe(true);
    expect(save.saved[0].mimeType).toBe('image/png');
    expect(save.saved[0].fileName).toBe('image_v1_1x1.png');
    expect(codec.transcodeCalls).toBe(0);
  });

  it('equal-format delivery for JPG and WEBP: the extension follows the held bytes and the codec is not called', async () => {
    const { session, api } = sessionOf([{ api: 'jpg' }, { api: 'webp' }]);
    const { delivery, save, codec } = await setupStudioServices({ seed: [activeNow(session)] });
    await delivery.download(1);
    await delivery.download(2);
    expect(save.saved.map((s: any) => s.fileName)).toEqual(['image_v1_1x1.jpg', 'image_v2_1x1.webp']);
    expect(bytesEqual(save.saved[0].bytes, api[0]) && bytesEqual(save.saved[1].bytes, api[1])).toBe(true);
    expect(codec.transcodeCalls).toBe(0);
  });

  it('FR-6 / OD-24: the stored inputFormat no longer steers the download - a PNG held for a JPG upload is saved as PNG, unconverted', async () => {
    const { session, api } = sessionOf([{ api: 'png', input: 'image/jpeg' }]);
    const { delivery, save, codec } = await setupStudioServices({ seed: [activeNow(session)] });
    await delivery.download(1);
    expect(save.saved[0].mimeType).toBe('image/png');
    expect(save.saved[0].fileName).toBe('image_v1_1x1.png');
    expect(bytesEqual(save.saved[0].bytes, api[0])).toBe(true);
    expect(codec.transcodeCalls).toBe(0);
  });

  it('the file name carries the ratio with x for the colon and the product name of the composer', async () => {
    const { session } = sessionOf([{ api: 'png', ratio: '16:9' }]);
    const { delivery, save, store } = await setupStudioServices({ seed: [activeNow(session)] });
    store.setDraft({ productName: 'Bambu Lab H2D' });
    await delivery.download(1);
    expect(save.saved[0].fileName).toBe('bambu-lab-h2d_v1_16x9.png');
  });

  it('SD-17: the downloaded flag is persisted only for the downloaded version, only after the save was handed over', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const { delivery, port } = await setupStudioServices({ seed: [activeNow(session)] });
    expect(flagOf(port, 0)).toBe(false);
    await delivery.download(1);
    expect(flagOf(port, 0)).toBe(true);
    expect(flagOf(port, 1)).toBe(false);
  });

  it('FR-6 failure path: a save that throws gives X-18, saves nothing and leaves the flag unset', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const { delivery, save, port } = await setupStudioServices({ seed: [activeNow(session)] });
    save.failWith = new Error('blocked by the browser');
    await delivery.download(1);
    expect(delivery.messageId()).toBe('X-18');
    expect(save.saved).toHaveLength(0);
    expect(flagOf(port, 0)).toBe(false);
    expect(delivery.busy()).toBe(false);
  });

  it('bytes that are not available give X-22 and no save', async () => {
    const s = activeNow(makeSession('s1', { pairs: 1 }));
    s.turns[1] = turn('m1', 'model', textPart('no image here'));
    const { delivery, save } = await setupStudioServices({ seed: [s] });
    await delivery.download(1);
    expect(delivery.messageId()).toBe('X-22');
    expect(save.saved).toHaveLength(0);
  });

  it('the previous failure message is cleared when the next action starts', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const { delivery, save } = await setupStudioServices({ seed: [activeNow(session)] });
    save.failWith = new Error('x');
    await delivery.download(1);
    expect(delivery.messageId()).toBe('X-18');
    save.failWith = null;
    await delivery.download(1);
    expect(delivery.messageId()).toBeNull();
  });
});

describe('FR-57: Copy to clipboard keeps PNG (T20)', () => {
  it('a PNG version is copied as its API bytes with no conversion, and the flag is set after the write', async () => {
    const { session, api } = sessionOf([{ api: 'png' }]);
    const { delivery, clipboard, codec, port } = await setupStudioServices({ seed: [activeNow(session)] });
    await delivery.copy(1);
    expect(bytesEqual(clipboard.written[0], api[0])).toBe(true);
    expect(codec.transcodeCalls).toBe(0);
    expect(flagOf(port, 0)).toBe(true);
  });

  it('JPG and WEBP versions are converted to PNG for the clipboard', async () => {
    const { session } = sessionOf([{ api: 'jpg' }, { api: 'webp' }]);
    const { delivery, clipboard, codec } = await setupStudioServices({ seed: [activeNow(session)] });
    await delivery.copy(1);
    await delivery.copy(2);
    expect(clipboard.written.map((b: Uint8Array) => decodeRaster(b)?.format)).toEqual(['png', 'png']);
    const targets = codec.calls.filter((c: any) => c.kind === 'transcode').map((c: any) => c.req.targetMime);
    expect(targets).toEqual(['image/png', 'image/png']); // whatever their own format, the clipboard always gets PNG (old strip assertion kept)
  });

  it('a rejected clipboard write gives X-20, copies nothing and leaves the flag unset', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const { delivery, clipboard, port } = await setupStudioServices({ seed: [activeNow(session)] });
    clipboard.failWith = new Error('NotAllowedError');
    await delivery.copy(1);
    expect(delivery.messageId()).toBe('X-20');
    expect(clipboard.written).toHaveLength(0);
    expect(flagOf(port, 0)).toBe(false);
  });
});

describe('FR-11: "Download all" is disabled at zero versions and while busy, but not while generating (T20)', () => {
  it('disabled with no version, and activating it saves nothing', async () => {
    const { delivery, save } = await setupStudioServices({ seed: [activeNow(makeSession('s1'))] });
    expect(delivery.items()).toHaveLength(0);
    expect(delivery.downloadAllDisabled()).toBe(true);
    await delivery.downloadAll();
    expect(save.saved).toHaveLength(0);
  });

  it('enabled with one version', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const { delivery } = await setupStudioServices({ seed: [activeNow(session)] });
    expect(delivery.downloadAllDisabled()).toBe(false);
  });

  it('disabled while a delivery action is in progress, enabled again when it ends', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const { delivery, clipboard } = await setupStudioServices({ seed: [activeNow(session)] });
    const gate = deferred<void>();
    clipboard.writePng = () => gate.promise;
    const copying = delivery.copy(1);
    await flush();
    expect(delivery.busy()).toBe(true);
    expect(delivery.downloadAllDisabled()).toBe(true);
    gate.resolve();
    await copying;
    expect(delivery.busy()).toBe(false);
    expect(delivery.downloadAllDisabled()).toBe(false);
  });

  it('activating it while busy starts no archive build', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const { delivery, clipboard, archive } = await setupStudioServices({ seed: [activeNow(session)] });
    const gate = deferred<void>();
    clipboard.writePng = () => gate.promise;
    const copying = delivery.copy(1);
    await flush();
    await delivery.downloadAll();
    expect(archive.calls).toHaveLength(0);
    gate.resolve();
    await copying;
  });

  it('a generation in progress does NOT disable it (SD-28 pins busy, not generating)', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const { delivery, store, llm } = await setupStudioServices({ seed: [activeNow(session)] });
    const pending = deferred<{ ok: true; body: unknown }>();
    llm.generateImage.mockImplementationOnce(() => pending.promise);
    store.setDraft({ text: 'another' });
    const sending = store.send();
    await flush();
    expect(store.generating()).toBe(true);
    expect(delivery.downloadAllDisabled()).toBe(false);
    pending.resolve({ ok: true, body: { kind: 'text', text: 'done', trimmedTurnIds: [] } });
    await sending;
  });
});

describe('FR-6 / FR-12 / D-7: Download all builds one archive of native entries named from the instant and the session name (T20)', () => {
  it('three versions of mixed formats give one zip: every entry is the NATIVE API bytes (v2 is the PNG, image_v2_1x1.png), no codec call, all flagged', async () => {
    const { session, api } = sessionOf([
      { api: 'png' },
      { api: 'png', input: 'image/jpeg' },   // used to be converted to JPG; now native PNG
      { api: 'webp', ratio: '4:5' },
    ]);
    const { delivery, save, codec, port } = await setupStudioServices({ seed: [activeNow(session)] });
    await delivery.downloadAll();
    expect(save.saved).toHaveLength(1);
    expect(save.saved[0].mimeType).toBe('application/zip');
    const zip = await JSZip.loadAsync(save.saved[0].bytes);
    expect(Object.keys(zip.files).sort()).toEqual(['image_v1_1x1.png', 'image_v2_1x1.png', 'image_v3_4x5.webp']);
    for (const [name, i] of [['image_v1_1x1.png', 0], ['image_v2_1x1.png', 1], ['image_v3_4x5.webp', 2]] as const) {
      expect(bytesEqual(await zip.file(name)!.async('uint8array'), api[i]), name).toBe(true);
    }
    expect(codec.transcodeCalls).toBe(0);
    expect([0, 1, 2].map((i) => flagOf(port, i))).toEqual([true, true, true]);
  });

  it('FR-12: the archive is named {UTC timestamp of the fake clock}-{kebab of the latest typed prompt}.zip', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    session.meta.versions[1].prompt = 'Red sneakers on white';
    const { delivery, save } = await setupStudioServices({ seed: [activeNow(session)] });
    await delivery.downloadAll();
    expect(save.saved[0].fileName).toBe('20261108-181530-red-sneakers-on-white.zip');
  });

  it('FR-12: the timestamp is read when the action is activated - advancing the fake clock changes the name', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    session.meta.versions[0].prompt = 'mug';
    const { delivery, save, clock } = await setupStudioServices({ seed: [activeNow(session)] });
    clock.advance(1_000);
    await delivery.downloadAll();
    expect(save.saved[0].fileName).toBe('20261108-181531-mug.zip');
  });

  it('the archive builder receives the held MIME as the target for every version (native), in version order', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'jpg' }]);
    const { delivery, archive } = await setupStudioServices({ seed: [activeNow(session)] });
    await delivery.downloadAll();
    expect(archive.calls[0].numbers).toEqual([1, 2]);
    expect(archive.calls[0].targetMimes).toEqual(['image/png', 'image/jpeg']);
  });
});

describe('FR-11 failure path / D-8: an archive or save failure shows its alert, saves nothing, flags nothing (T20)', () => {
  it('D-8: an archive builder that throws ZipBuildError gives X-21 ("Could not build the ZIP archive."), nothing saved, no flag', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'webp' }]);
    const { delivery, save, archive, port } = await setupStudioServices({ seed: [activeNow(session)] });
    archive.failWith = new ZipBuildError();
    await delivery.downloadAll();
    expect(delivery.messageId()).toBe('X-21');
    expect(save.saved).toHaveLength(0);
    expect([0, 1].map((i) => flagOf(port, i))).toEqual([false, false]);
  });

  it('D-8 second case: a failing save port gives X-18, nothing saved, no flag', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const { delivery, save, port } = await setupStudioServices({ seed: [activeNow(session)] });
    save.failWith = new Error('disk full');
    await delivery.downloadAll();
    expect(delivery.messageId()).toBe('X-18');
    expect(save.saved).toHaveLength(0);
    expect(flagOf(port, 0)).toBe(false);
  });

  it('after the failure the next successful action clears the message and busy is false', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const { delivery, archive, save } = await setupStudioServices({ seed: [activeNow(session)] });
    archive.failWith = new ZipBuildError();
    await delivery.downloadAll();
    expect(delivery.busy()).toBe(false);
    archive.failWith = null;
    await delivery.downloadAll();
    expect(delivery.messageId()).toBeNull();
    expect(save.saved).toHaveLength(1);
  });
});

describe('FR-10 / FR-33: the open full-view state and focus return (T20)', () => {
  it('open(n) holds {number: n}; open(n, opener, m) holds the compare source; close() clears it', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }, { api: 'png' }]);
    const { delivery } = await setupStudioServices({ seed: [activeNow(session)] });
    expect(delivery.openView()).toBeNull();
    delivery.open(2);
    expect(delivery.openView()).toEqual({ number: 2 });
    delivery.open(3, null, 1);
    expect(delivery.openView()).toEqual({ number: 3, compareWith: 1 });
    delivery.close();
    expect(delivery.openView()).toBeNull();
  });

  it('close() returns focus to the element that opened the view', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const { delivery } = await setupStudioServices({ seed: [activeNow(session)] });
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    const focus = vi.spyOn(opener, 'focus');
    delivery.open(1, opener);
    delivery.close();
    expect(focus).toHaveBeenCalledTimes(1);
    opener.remove();
  });

  it('opening a view clears an earlier failure message', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const { delivery, save } = await setupStudioServices({ seed: [activeNow(session)] });
    save.failWith = new Error('x');
    await delivery.download(1);
    expect(delivery.messageId()).toBe('X-18');
    delivery.open(1);
    expect(delivery.messageId()).toBeNull();
  });

  it('edit(n) attaches that version to the composer of the same session (the strip used to call the store directly)', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const { delivery, store } = await setupStudioServices({ seed: [activeNow(session)] });
    await delivery.edit(1);
    expect(store.draft().attachedVersion).toMatchObject({ fromVersion: 1 });
  });

  it('items lists the retained versions of the CURRENT session only, oldest first, with their bytes', async () => {
    const { session, api } = sessionOf([{ api: 'png' }, { api: 'jpg' }]);
    const other = activeNow(makeSession('s2', { pairs: 3 }));
    other.meta.lastActivity -= 1_000;
    const { delivery } = await setupStudioServices({ seed: [activeNow(session), other] });
    const items = delivery.items();
    expect(items.map((i: any) => i.version.number)).toEqual([1, 2]);
    expect(items.map((i: any) => i.mime)).toEqual(['image/png', 'image/jpeg']);
    expect(items[0].data).toEqual(expect.any(String));
    expect(api).toHaveLength(2);
  });
});

describe('FR-12 (owner ruling OI-A, option a): the archive name after an images-only or chip latest send (T40)', () => {
  it('a blank latest prompt (images-only send) names the archive {timestamp}-image-studio-versions.zip', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    session.meta.versions[0].prompt = 'red mug';
    session.meta.versions[1].prompt = '';
    const { delivery, save } = await setupStudioServices({ seed: [activeNow(session)] });
    await delivery.downloadAll();
    expect(save.saved[0].fileName).toBe('20261108-181530-image-studio-versions.zip');
  });

  it('a chip latest send names the archive from the chip instruction text', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    session.meta.versions[0].prompt = 'red mug';
    session.meta.versions[1].prompt = 'Make the shadow softer.';
    const { delivery, save } = await setupStudioServices({ seed: [activeNow(session)] });
    await delivery.downloadAll();
    expect(save.saved[0].fileName).toBe('20261108-181530-make-the-shadow-softer.zip');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// T43 (security hardening NB-3; docs/reviews/security/US-10.5-security-review.md section 7). A sibling block: no case above is changed.
//
// PINNED CONTRACT ADDITION (owner T43): `items()` validates the stored `inlineData.mimeType` against the supported image MIMEs
// (image/png, image/jpeg, image/webp) BEFORE it is typed as an ImageMime. A version whose stored MIME is anything else is an
// unresolvable image, exactly like a version whose bytes are gone: its item carries `mime: null` (never the stored string), so
// download / copy / download-all give X-22 ("bytes unavailable") and hand nothing over. The retained-version list itself (which
// versions exist, their order) is NOT changed by this rule; the cases below assert only that no item carries an unsupported MIME and
// what is (not) delivered, so they hold whether the builder keeps the unresolvable item in the list (mime/data null) or leaves it out.
// Red until T43 (the cases that use a bad MIME); the valid-MIME case is a green regression guard.
// ---------------------------------------------------------------------------------------------------------------------
describe('NB-3 hardening: a stored MIME that is not png, jpeg or webp is an unresolvable image, never cast and never delivered (T43)', () => {
  const SUPPORTED = ['image/png', 'image/jpeg', 'image/webp'];
  const BAD = [['text/html'], ['image/svg+xml'], ['application/octet-stream'], ['image/gif'], ['']] as const;

  /** v1 (png bytes) with its stored MIME replaced by `mime`, then v2 (jpg) and v3 (webp) untouched. */
  const sessionWithBadFirst = (mime: unknown) => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'jpg' }, { api: 'webp' }]);
    (session.turns[1].parts[0].inlineData as { mimeType: unknown }).mimeType = mime;
    return session;
  };

  it.each(BAD)('items(): no item carries the stored MIME %j, and the valid neighbours keep theirs', async (mime) => {
    const { delivery } = await setupStudioServices({ seed: [activeNow(sessionWithBadFirst(mime))] });
    const items = delivery.items();
    const v1 = items.find((i: any) => i.version.number === 1);
    expect(v1?.mime ?? null).toBeNull();
    expect(items.every((i: any) => i.mime === null || SUPPORTED.includes(i.mime))).toBe(true);
    expect(items.find((i: any) => i.version.number === 2)?.mime).toBe('image/jpeg');
    expect(items.find((i: any) => i.version.number === 3)?.mime).toBe('image/webp');
  });

  it('items(): a stored MIME that is not a string is not cast either', async () => {
    const { delivery } = await setupStudioServices({ seed: [activeNow(sessionWithBadFirst(42))] });
    expect(delivery.items().find((i: any) => i.version.number === 1)?.mime ?? null).toBeNull();
  });

  it.each(BAD)('download(1) with the stored MIME %j gives X-22, saves nothing and leaves the flag unset', async (mime) => {
    const { delivery, save, port } = await setupStudioServices({ seed: [activeNow(sessionWithBadFirst(mime))] });
    await delivery.download(1);
    expect(delivery.messageId()).toBe('X-22');
    expect(save.saved).toHaveLength(0);
    expect(flagOf(port, 0)).toBe(false);
    expect(delivery.busy()).toBe(false);
  });

  it('copy(1) with a stored MIME of text/html gives X-22, writes nothing to the clipboard and leaves the flag unset', async () => {
    const { delivery, clipboard, codec, port } = await setupStudioServices({ seed: [activeNow(sessionWithBadFirst('text/html'))] });
    await delivery.copy(1);
    expect(delivery.messageId()).toBe('X-22');
    expect(clipboard.written).toHaveLength(0);
    expect(codec.transcodeCalls).toBe(0);
    expect(flagOf(port, 0)).toBe(false);
  });

  it('download all on a session whose only version has an unsupported MIME saves nothing and flags nothing', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    (session.turns[1].parts[0].inlineData as { mimeType: unknown }).mimeType = 'image/svg+xml';
    const { delivery, save, port } = await setupStudioServices({ seed: [activeNow(session)] });
    await delivery.downloadAll();
    expect(save.saved).toHaveLength(0);
    expect(flagOf(port, 0)).toBe(false);
  });

  it('guard: the valid versions beside a rejected one are still delivered natively (jpg as image_v2_1x1.jpg, webp as image_v3_1x1.webp)', async () => {
    const { delivery, save, codec } = await setupStudioServices({ seed: [activeNow(sessionWithBadFirst('text/html'))] });
    await delivery.download(2);
    await delivery.download(3);
    expect(save.saved.map((s: any) => [s.fileName, s.mimeType])).toEqual([
      ['image_v2_1x1.jpg', 'image/jpeg'], ['image_v3_1x1.webp', 'image/webp'],
    ]);
    expect(codec.transcodeCalls).toBe(0);
  });
});
