/**
 * US-10.1 T43 - StudioVersionStripComponent: the strip, the full view and the delivery actions.
 * Covers FR-33, FR-37, FR-38, FR-54, FR-55, FR-56, FR-57, FR-58, FR-83, SD-17, SD-28; AC-22, AC-23, AC-31 to AC-35.
 *
 * Component runner. The real root store, the real delivery/zip modules, and the fakes behind the contract tokens:
 * `SAVE_PORT` records saved files (and can fail), `CLIPBOARD_PORT` records PNG writes (and can fail), the fake codec
 * records conversions (and can fail) - so "byte-identical when the formats are equal, a conversion otherwise" is
 * observable without a canvas. The real canvas half (white fill, WEBP encode, JPG quality) is V-8 / proposed V-10: the gate
 * proves the PARAMETERS passed to the codec (target MIME, quality 90, `fillWhite`, no `maxLongSide`), not pixels.
 *
 * Pinned UI contract (helpers/studio-render.ts): thumbnail buttons whose accessible name contains `v<N>` in a strip headed
 * X-16; clicking one opens a dialog named X-17 (closed by a button named X-15) holding that version's format selector
 * (X-7: PNG, JPG, WEBP), Download (X-8), Copy to clipboard, Edit this version and an image with the SD-35 alt; "Download all
 * versions" is in the strip. Errors X-18..X-22 appear in a `role="alert"` element.
 * The "Edit this version" tests mount the strip together with the composer (selectors `app-studio-composer` and
 * `app-studio-version-strip` are part of the pinned contract) because the attachment is composer state (FR-37).
 */
import { describe, it, expect, vi } from 'vitest';
import { Component, input } from '@angular/core';
import { screen, within } from '@testing-library/angular';
import JSZip from 'jszip';
import { StudioVersionStripComponent } from './studio-version-strip.component';
import { StudioComposerComponent } from '../studio-composer/studio-composer.component';
import {
  renderStudio, byName, t, LABELS, textOf, imagesBody, expectGenerate, flushGenerate, type Harness, type Lang,
} from '../../../../../test/image-studio/helpers/studio-render';
import {
  makeSession, makeRaster, decodeRaster, inlineImagePart, toBase64, type RasterFormat, type ImageMime, type StoredSession,
} from '../../../../../test/image-studio/helpers/fakes';
import { StorageQuotaError } from '../../../../utils/image-studio/ports';

const MIME: Record<RasterFormat, ImageMime> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

interface Spec { api: RasterFormat; input?: ImageMime; ratio?: string }
/** A session whose model turns hold the given API formats; returns the exact API bytes per version. */
function sessionOf(specs: Spec[]): { session: StoredSession; api: Uint8Array[] } {
  const session = makeSession('s1', { pairs: specs.length });
  const api: Uint8Array[] = [];
  specs.forEach((s, i) => {
    const bytes = makeRaster({ format: s.api, width: 40, height: 30, size: 300 + i });
    api.push(bytes);
    session.turns[i * 2 + 1].parts[0] = inlineImagePart(MIME[s.api], toBase64(bytes), { thoughtSignature: `sig-${i + 1}` });
    session.meta.versions[i].inputFormat = s.input ?? MIME[s.api];
    session.meta.versions[i].aspectRatio = s.ratio ?? '1:1';
  });
  return { session, api };
}

const vBtn = (n: number) => screen.getByRole('button', { name: new RegExp(`\\bv${n}\\b`) });
const dialog = (lang: Lang = 'en') => screen.getByRole('dialog', { name: t('X-17', lang) });
async function openVersion(h: Harness, n: number, lang: Lang = 'en') {
  await h.user.click(vBtn(n));
  await h.settle();
  return within(dialog(lang));
}
const flagOf = (h: Harness, i: number) => h.sessionStore.snapshot().sessions['s1'].meta.versions[i].downloaded;
const alertText = async () => textOf(await screen.findByRole('alert'));
const bytesEqual = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

describe('FR-38 / AC-23: the strip and the full view', () => {
  it('AC-23 / FR-38: the strip (headed "Versions") shows one thumbnail button per retained version, labelled v1..v3, with the prompt as alt', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }, { api: 'png' }]);
    await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    expect(screen.getByText(t('X-16', 'en'))).toBeDefined();
    for (const n of [1, 2, 3]) expect(vBtn(n), `v${n}`).toBeDefined();
    expect(screen.getByAltText('prompt 2')).toBeDefined(); // SD-35: alt = the prompt that produced the image
  });

  it('FR-38: versions of another stored session are not shown', async () => {
    const a = sessionOf([{ api: 'png' }]).session;
    const b = makeSession('s2', { pairs: 2, lastActivity: 1_000_000 - 1000, createdAt: 1_000_000 - 1000 });
    await renderStudio(StudioVersionStripComponent, { sessions: [a, b] });
    expect(screen.getAllByRole('button', { name: /\bv\d+\b/ })).toHaveLength(1);
  });

  it('AC-23: clicking a thumbnail opens the full view dialog; its close button (X-15) closes it', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    expect(screen.queryByRole('dialog')).toBeNull();
    const view = await openVersion(h, 2);
    expect(view.getByAltText('prompt 2')).toBeDefined();
    await h.user.click(view.getByRole('button', { name: t('X-15', 'en') }));
    await h.settle();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('FR-54 / AC-31 / FR-82: one-click download in the target format', () => {
  it('AC-31 / FR-54 (i): a PNG version with a PNG target downloads the API bytes unchanged, with no codec call, as image_v1_1x1.png', async () => {
    const { session, api } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    const view = await openVersion(h, 1);
    await h.user.click(view.getByRole('button', { name: t('X-8', 'en') }));
    await h.settle();
    expect(h.save.saved).toHaveLength(1);
    expect(bytesEqual(h.save.saved[0].bytes, api[0])).toBe(true);
    expect(h.save.saved[0].mimeType).toBe('image/png');
    expect(h.save.saved[0].fileName).toBe('image_v1_1x1.png');
    expect(h.codec.transcodeCalls).toBe(0);
  });

  it('AC-31 / FR-82 (i): equal-format delivery makes no codec call for JPG and WEBP either', async () => {
    const { session, api } = sessionOf([{ api: 'jpg' }, { api: 'webp' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    for (const n of [1, 2]) {
      const view = await openVersion(h, n);
      await h.user.click(view.getByRole('button', { name: t('X-8', 'en') }));
      await h.settle();
      await h.user.click(view.getByRole('button', { name: t('X-15', 'en') }));
    }
    expect(h.save.saved.map((s) => s.fileName)).toEqual(['image_v1_1x1.jpg', 'image_v2_1x1.webp']);
    expect(bytesEqual(h.save.saved[0].bytes, api[0]) && bytesEqual(h.save.saved[1].bytes, api[1])).toBe(true);
    expect(h.codec.transcodeCalls).toBe(0);
  });

  it('AC-33 / FR-56: the file name carries the version number and the ratio with x for the colon (16:9 -> 16x9)', async () => {
    const { session } = sessionOf([{ api: 'png', ratio: '16:9' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    const view = await openVersion(h, 1);
    await h.user.click(view.getByRole('button', { name: t('X-8', 'en') }));
    await h.settle();
    expect(h.save.saved[0].fileName).toBe('image_v1_16x9.png');
  });

  it('FR-33 / SD-17: the downloaded flag is unset before and set (persisted) only after the save was handed to the browser', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    expect(flagOf(h, 0)).toBe(false);
    const view = await openVersion(h, 1);
    await h.user.click(view.getByRole('button', { name: t('X-8', 'en') }));
    await vi.waitFor(() => expect(flagOf(h, 0)).toBe(true));
    expect(flagOf(h, 1)).toBe(false); // only the downloaded version
  });

  it('FR-54 failure path / SD-17: a save that throws shows X-18, downloads nothing and leaves the flag unset', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    h.save.failWith = new Error('blocked by the browser');
    const view = await openVersion(h, 1);
    await h.user.click(view.getByRole('button', { name: t('X-8', 'en') }));
    expect(await alertText()).toBe('Could not download the image.');
    expect(h.save.saved).toHaveLength(0);
    expect(flagOf(h, 0)).toBe(false);
  });

  it('FR-83: the download failure is announced in the Ukrainian text under uk', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioVersionStripComponent, { lang: 'uk', sessions: [session] });
    h.save.failWith = new Error('blocked');
    const view = await openVersion(h, 1, 'uk');
    await h.user.click(view.getByRole('button', { name: 'Завантажити' }));
    expect(await alertText()).toBe('Не вдалося завантажити зображення.');
  });
});

describe('FR-55 / FR-82: selectable download format and conversion parameters', () => {
  it('FR-82 default: the selector starts at the version\'s input format (JPG) and a JPG upload with a PNG answer downloads a JPG of quality 90, named .jpg (v)', async () => {
    const { session } = sessionOf([{ api: 'png', input: 'image/jpeg' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    const view = await openVersion(h, 1);
    expect(view.getByRole<HTMLSelectElement>('combobox', { name: t('X-7', 'en') }).selectedOptions[0].textContent!.trim()).toBe('JPG');
    await h.user.click(view.getByRole('button', { name: t('X-8', 'en') }));
    await h.settle();
    expect(h.codec.transcodeCalls).toBe(1);
    const call = h.codec.calls.find((c) => c.kind === 'transcode') as { kind: 'transcode'; req: any };
    expect(call.req.targetMime).toBe('image/jpeg');
    expect(call.req.quality).toBe(90);
    expect(call.req.fillWhite).toBe(true);
    expect(call.req.maxLongSide).toBeUndefined(); // never resized (FR-54)
    expect(h.save.saved[0].fileName).toBe('image_v1_1x1.jpg');
    expect(decodeRaster(h.save.saved[0].bytes)?.format).toBe('jpg');
  });

  it('FR-55 / FR-82 (vi): the operator\'s selector choice wins - JPG changed to WEBP gives a WEBP of quality 90 named .webp', async () => {
    const { session } = sessionOf([{ api: 'png', input: 'image/jpeg' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    const view = await openVersion(h, 1);
    await h.user.selectOptions(view.getByRole('combobox', { name: t('X-7', 'en') }), 'WEBP');
    await h.user.click(view.getByRole('button', { name: t('X-8', 'en') }));
    await h.settle();
    const call = h.codec.calls.find((c) => c.kind === 'transcode') as { kind: 'transcode'; req: any };
    expect(call.req.targetMime).toBe('image/webp');
    expect(call.req.quality).toBe(90);
    expect(h.save.saved[0].fileName).toBe('image_v1_1x1.webp');
    expect(h.save.saved[0].mimeType).toBe('image/webp');
  });

  it('FR-82 (x) / FR-55: a PNG source with the selector changed to WEBP converts exactly once', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    const view = await openVersion(h, 1);
    await h.user.selectOptions(view.getByRole('combobox', { name: t('X-7', 'en') }), 'WEBP');
    await h.user.click(view.getByRole('button', { name: t('X-8', 'en') }));
    await h.settle();
    expect(h.codec.transcodeCalls).toBe(1);
  });

  it('FR-55 failure path / FR-33: a failing conversion shows X-19, downloads nothing and leaves the flag unset', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session], codec: { transcodeFails: true } });
    const view = await openVersion(h, 1);
    await h.user.selectOptions(view.getByRole('combobox', { name: t('X-7', 'en') }), 'JPG');
    await h.user.click(view.getByRole('button', { name: t('X-8', 'en') }));
    expect(await alertText()).toBe('Could not convert the image to the selected format.');
    expect(h.save.saved).toHaveLength(0);
    expect(flagOf(h, 0)).toBe(false);
  });

  it('D-22: the selector value is per version - changing v1 leaves v2 at its own inherited format', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'webp' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    let view = await openVersion(h, 1);
    await h.user.selectOptions(view.getByRole('combobox', { name: t('X-7', 'en') }), 'JPG');
    await h.user.click(view.getByRole('button', { name: t('X-15', 'en') }));
    view = await openVersion(h, 2);
    expect(view.getByRole<HTMLSelectElement>('combobox', { name: t('X-7', 'en') }).selectedOptions[0].textContent!.trim()).toBe('WEBP');
  });
});

describe('FR-57 / AC-34: Copy to clipboard is always PNG', () => {
  it('AC-34 / FR-57: a PNG version is copied as its API bytes with no conversion; the flag is set after the write resolved', async () => {
    const { session, api } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    const view = await openVersion(h, 1);
    await h.user.click(view.getByRole('button', { name: LABELS.en.copy }));
    await vi.waitFor(() => expect(h.clipboard.written).toHaveLength(1));
    expect(bytesEqual(h.clipboard.written[0], api[0])).toBe(true);
    expect(h.codec.transcodeCalls).toBe(0);
    await vi.waitFor(() => expect(flagOf(h, 0)).toBe(true));
  });

  it('AC-34 / FR-57: JPG and WEBP versions are converted to PNG for the clipboard (a PNG signature each time), whatever their target format', async () => {
    const { session } = sessionOf([{ api: 'jpg' }, { api: 'webp' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    for (const n of [1, 2]) {
      const view = await openVersion(h, n);
      await h.user.click(view.getByRole('button', { name: LABELS.en.copy }));
      await vi.waitFor(() => expect(h.clipboard.written).toHaveLength(n));
      await h.user.click(view.getByRole('button', { name: t('X-15', 'en') }));
    }
    expect(h.clipboard.written.map((b) => decodeRaster(b)?.format)).toEqual(['png', 'png']);
    const targets = h.codec.calls.filter((c) => c.kind === 'transcode').map((c: any) => c.req.targetMime);
    expect(targets).toEqual(['image/png', 'image/png']);
  });

  it('FR-57 failure path / SD-17: a rejected clipboard write shows X-20, copies nothing and leaves the flag unset', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    h.clipboard.failWith = new Error('NotAllowedError');
    const view = await openVersion(h, 1);
    await h.user.click(view.getByRole('button', { name: LABELS.en.copy }));
    expect(await alertText()).toBe('Could not copy the image to the clipboard.');
    expect(h.clipboard.written).toHaveLength(0);
    expect(flagOf(h, 0)).toBe(false);
  });
});

describe('FR-58 / AC-35 / SD-28: Download all versions', () => {
  it('SD-28 / FR-58: the action is disabled while the session retains no version', async () => {
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [makeSession('s1')] });
    expect((byName.button(LABELS.en.downloadAll) as HTMLButtonElement).disabled).toBe(true);
    await h.user.click(byName.button(LABELS.en.downloadAll));
    expect(h.save.saved).toHaveLength(0);
  });

  it('SD-28 / FR-58: the action is enabled with one version', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    expect((byName.button(LABELS.en.downloadAll) as HTMLButtonElement).disabled).toBe(false);
  });

  it('AC-35 / FR-58 / D-22: three versions of mixed target formats give one ZIP with three correctly named, correctly formatted entries; every version is flagged', async () => {
    const { session, api } = sessionOf([
      { api: 'png' },                              // target png, unchanged
      { api: 'png', input: 'image/jpeg' },         // target jpg, converted
      { api: 'webp', ratio: '4:5' },               // target webp, unchanged
    ]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    await h.user.click(byName.button(LABELS.en.downloadAll));
    await vi.waitFor(() => expect(h.save.saved).toHaveLength(1));
    const zipFile = h.save.saved[0];
    expect(zipFile.mimeType).toBe('application/zip');
    expect(zipFile.fileName).toMatch(/\.zip$/);
    const zip = await JSZip.loadAsync(zipFile.bytes);
    expect(Object.keys(zip.files).sort()).toEqual(['image_v1_1x1.png', 'image_v2_1x1.jpg', 'image_v3_4x5.webp']);
    const e1 = await zip.file('image_v1_1x1.png')!.async('uint8array');
    const e2 = await zip.file('image_v2_1x1.jpg')!.async('uint8array');
    const e3 = await zip.file('image_v3_4x5.webp')!.async('uint8array');
    expect(bytesEqual(e1, api[0])).toBe(true);        // equal formats: byte-identical
    expect(decodeRaster(e2)?.format).toBe('jpg');     // converted
    expect(bytesEqual(e3, api[2])).toBe(true);
    expect(h.codec.transcodeCalls).toBe(1);
    await vi.waitFor(() => {
      expect([0, 1, 2].map((i) => flagOf(h, i))).toEqual([true, true, true]);
    });
  });

  it('FR-58 failure path: a conversion failure while building the archive shows X-21, downloads nothing (no partial ZIP) and flags nothing', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png', input: 'image/jpeg' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session], codec: { transcodeFails: true } });
    await h.user.click(byName.button(LABELS.en.downloadAll));
    expect(await alertText()).toBe('Could not build the ZIP archive.');
    expect(h.save.saved).toHaveLength(0);
    expect([0, 1].map((i) => flagOf(h, i))).toEqual([false, false]);
  });

  it('FR-33 / FR-81: a flag write that fails with a quota error leaves the flag unset and shows the native alert once (T-20)', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    h.sessionStore.failWrites(new StorageQuotaError('quota'));
    const view = await openVersion(h, 1);
    await h.user.click(view.getByRole('button', { name: t('X-8', 'en') }));
    await vi.waitFor(() => expect(h.alerts.messages).toEqual([t('T-20', 'en')]));
    h.sessionStore.failWrites(null);
    expect(flagOf(h, 0)).toBe(false);
  });
});

@Component({
  selector: 'test-host',
  standalone: true,
  imports: [StudioComposerComponent, StudioVersionStripComponent],
  template: `<app-studio-composer [lang]="lang()" /><app-studio-version-strip [lang]="lang()" />`,
})
class HostComponent { lang = input.required<'en' | 'uk'>(); }

describe('FR-37 / AC-22: "Edit this version" - normal and blocked states', () => {
  const attachedList = () => screen.queryAllByAltText(/^Version v\d+ attached for editing$/);

  it('AC-22 / FR-37 normal state: the action attaches that version to the next message of the SAME session - its thumbnail (X-27) appears in the composer\'s list and no session is created', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const h = await renderStudio(HostComponent, { sessions: [session] });
    const view = await openVersion(h, 1);
    await h.user.click(view.getByRole('button', { name: LABELS.en.edit }));
    await h.settle();
    expect(await screen.findByAltText(t('X-27', 'en', { n: 1 }))).toBeDefined();
    expect(Object.keys(h.sessionStore.snapshot().sessions)).toEqual(['s1']);
  });

  it('D-9 / FR-37: a second "Edit this version" REPLACES the first - at most one version is attached at a time', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const h = await renderStudio(HostComponent, { sessions: [session] });
    let view = await openVersion(h, 1);
    await h.user.click(view.getByRole('button', { name: LABELS.en.edit }));
    await h.user.click(view.getByRole('button', { name: t('X-15', 'en') }));
    view = await openVersion(h, 2);
    await h.user.click(view.getByRole('button', { name: LABELS.en.edit }));
    await h.settle();
    expect(attachedList().map((i) => i.getAttribute('alt'))).toEqual([t('X-27', 'en', { n: 2 })]);
  });

  it('FR-37: the attached version is sent INLINE in the next message (never as a file URI) together with the new text', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const h = await renderStudio(HostComponent, { sessions: [session] });
    const view = await openVersion(h, 1);
    await h.user.click(view.getByRole('button', { name: LABELS.en.edit }));
    await h.user.click(view.getByRole('button', { name: t('X-15', 'en') }));
    await h.user.type(byName.textarea('en'), 'make it blue');
    await h.user.click(byName.button(t('X-1', 'en')));
    const req = expectGenerate(h);
    const parts = req.request.body.newTurn.parts;
    expect(parts.some((p: any) => p.inlineData)).toBe(true);
    expect(parts.some((p: any) => p.fileData)).toBe(false);
    expect(parts.find((p: any) => p.text)?.text).toBe('make it blue');
    req.flush(imagesBody());
    await h.settle();
  });

  it('FR-37 / FR-47 blocked state: after a 413 PROTECTED_HISTORY_EXCEEDS_LIMIT the same action on EVERY retained version creates a NEW session seeded with that version', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const h = await renderStudio(HostComponent, { sessions: [session] });
    await h.user.type(byName.textarea('en'), 'too much');
    await h.user.click(byName.button(t('X-1', 'en')));
    await flushGenerate(h, { error: 'PROTECTED_HISTORY_EXCEEDS_LIMIT' }, { status: 413, statusText: 'Payload Too Large' });
    // Only Send is disabled (SD-37); the old session keeps its history.
    expect((byName.button(t('X-1', 'en')) as HTMLButtonElement).disabled).toBe(true);
    let view = await openVersion(h, 1);
    expect((view.getByRole('button', { name: LABELS.en.edit }) as HTMLButtonElement).disabled).toBe(false);
    await h.user.click(view.getByRole('button', { name: t('X-15', 'en') }));
    view = await openVersion(h, 2);
    await h.user.click(view.getByRole('button', { name: LABELS.en.edit }));
    await vi.waitFor(() => expect(Object.keys(h.sessionStore.snapshot().sessions)).toHaveLength(2));
    expect(h.sessionStore.snapshot().sessions['s1'].turns.map((x) => x.id)).toEqual(['u1', 'm1', 'u2', 'm2']);
    expect(await screen.findByAltText(t('X-27', 'en', { n: 2 }))).toBeDefined();
  });
});
