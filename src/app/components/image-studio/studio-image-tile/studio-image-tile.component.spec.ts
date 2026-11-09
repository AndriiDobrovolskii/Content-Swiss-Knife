/**
 * US-10.5 T27 - StudioImageTileComponent: one generated image with its label and actions.
 * Covers FR-6 (D-6: native one-click download, kept as native-delivery tests), FR-7 (render-time size, with and without), FR-8 (nothing out of
 * scope is rendered), FR-9 ("Edit of v{N}" chip, "Compare with v{N}" only while the source is retained), the alt text rule with the "Generated
 * image" fallback re-resolved on a language change (D-2 / reviewer note N3), D-9 (v{N} lookups scoped to the tile label).
 *
 * Component runner. PINNED CONTRACT (owner T27; standalone, OnPush):
 *   inputs: lang (required), versionNumber (required number), editOf (optional { n: number; sourceRetained: boolean } | null, default null)
 *   the tile reads the version, its bytes and the prompt from the current session; actions go through the delivery service.
 *   <figure aria-labelledby=...> whose <figcaption> reads `v{N} · {W}×{H}` (U+00B7 and U+00D7) or just `v{N}` while the size is unknown or
 *   undecodable; exactly ONE <img> inside the figure (alt = the prompt by the alt-text rule, or T-21); buttons named exactly "Download" (X-8) and
 *   "Edit this →"; a chip "Edit of v{n}" (X-39) when editOf is given; a button "Compare with v{n}" (X-38) only when editOf.sourceRetained.
 */
import { describe, it, expect, vi } from 'vitest';
import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { screen, within } from '@testing-library/angular';
import { StudioImageTileComponent } from './studio-image-tile.component';
import { StudioDeliveryService } from '../../../../services/image-studio/studio-delivery.service';
import { StudioComposerComponent } from '../studio-composer/studio-composer.component';
import { StorageQuotaError } from '../../../../utils/image-studio/ports';
import { renderStudio, byName, t, LABELS, imagesBody, expectGenerate, flushGenerate } from '../../../../../test/image-studio/helpers/studio-render';
import { sessionOf, bytesEqual } from '../../../../../test/image-studio/helpers/sessions';
import { makeSession, decodeRaster, makeRaster, inlineImagePart, toBase64 } from '../../../../../test/image-studio/helpers/fakes';

const figure = () => screen.getByRole('figure');
const caption = () => (figure().querySelector('figcaption')?.textContent ?? '').replace(/\s+/g, ' ').trim();
const tile = async (specs: Parameters<typeof sessionOf>[0], n = 1, extra: Record<string, unknown> = {}, opts: Record<string, unknown> = {}) => {
  const { session, api } = sessionOf(specs);
  const h = await renderStudio(StudioImageTileComponent, { sessions: [session], inputs: { versionNumber: n, ...extra }, ...opts });
  return { h, api, session };
};

describe('FR-6 / FR-7 / D-9: the label v{N} · {W}×{H} (T27)', () => {
  it('shows "v1 · 40×30" once the size is probed from the image bytes', async () => {
    await tile([{ api: 'png' }]);
    await vi.waitFor(() => expect(caption()).toBe('v1 · 40×30'));
  });

  it('is a <figure> labelled by its caption (the accessible name of the figure is the label)', async () => {
    await tile([{ api: 'png' }]);
    await vi.waitFor(() => expect(screen.getByRole('figure', { name: 'v1 · 40×30' })).toBeDefined());
  });

  it('FR-7 failure path: bytes that cannot be decoded leave the label at "v1" - no error, no alert', async () => {
    const { h } = await tile([{ api: 'png' }], 1, {}, { codec: { probeFails: true } });
    await h.settle();
    expect(caption()).toBe('v1');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('D-9: the version number is findable in the label of the tile (a \\bv1\\b lookup scoped to the tile caption)', async () => {
    await tile([{ api: 'png' }, { api: 'png' }], 2);
    await vi.waitFor(() => expect(caption()).toMatch(/\bv2\b/));
    expect(caption()).not.toMatch(/\bv1\b/);
  });

  it('the tile holds exactly one image (it is the only <img> inside a <figure>)', async () => {
    const { h } = await tile([{ api: 'png' }]);
    expect(h.view.container.querySelectorAll('figure img')).toHaveLength(1);
  });
});

describe('FR-75 / D-2 / N3: the alt text and the "Generated image" fallback (T27)', () => {
  it('a typed prompt is the alt as it is', async () => {
    await tile([{ api: 'png' }]);
    expect(within(figure()).getByAltText('prompt 1')).toBeDefined();
  });

  it('a blank prompt (an images-only message) gets "Generated image", re-resolved to "Згенероване зображення" on a language toggle', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    session.meta.versions[0].prompt = '';
    const h = await renderStudio(StudioImageTileComponent, { sessions: [session], inputs: { versionNumber: 1 } });
    expect(within(figure()).getByAltText('Generated image')).toBeDefined();
    await h.setLang('uk');
    expect(within(figure()).getByAltText('Згенероване зображення')).toBeDefined();
  });

  it('a prompt-derived alt is NOT localised by a language toggle', async () => {
    const { h } = await tile([{ api: 'png' }]);
    await h.setLang('uk');
    expect(within(figure()).getByAltText('prompt 1')).toBeDefined();
  });

  it('a prompt over 100 code points gives its first 100 followed by three full stops', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    session.meta.versions[0].prompt = 'a'.repeat(100) + 'b';
    await renderStudio(StudioImageTileComponent, { sessions: [session], inputs: { versionNumber: 1 } });
    expect(within(figure()).getByAltText('a'.repeat(100) + '...')).toBeDefined();
  });
});

describe('FR-6 / D-6: Download is native and one click (T27)', () => {
  it('a PNG version is saved with the API bytes unchanged, MIME image/png, as image_v1_1x1.png, with no codec call', async () => {
    const { h, api } = await tile([{ api: 'png' }]);
    await h.user.click(screen.getByRole('button', { name: t('X-8', 'en') }));
    await h.settle();
    expect(h.save.saved).toHaveLength(1);
    expect(bytesEqual(h.save.saved[0].bytes, api[0])).toBe(true);
    expect(h.save.saved[0].mimeType).toBe('image/png');
    expect(h.save.saved[0].fileName).toBe('image_v1_1x1.png');
    expect(h.codec.transcodeCalls).toBe(0);
  });

  it.each([['jpg', 'image_v1_1x1.jpg', 'image/jpeg'], ['webp', 'image_v1_1x1.webp', 'image/webp']] as const)(
    'equal-format delivery for %s: the file is named %s, typed %s, byte-identical, and the codec is not called', async (format, name, mime) => {
      const { h, api } = await tile([{ api: format }]);
      await h.user.click(screen.getByRole('button', { name: t('X-8', 'en') }));
      await h.settle();
      expect(h.save.saved[0].fileName).toBe(name);
      expect(h.save.saved[0].mimeType).toBe(mime);
      expect(bytesEqual(h.save.saved[0].bytes, api[0])).toBe(true);
      expect(h.codec.transcodeCalls).toBe(0);
      expect(decodeRaster(h.save.saved[0].bytes)?.format).toBe(format);
    });

  it('the ratio goes into the file name with x for the colon (16:9 -> 16x9)', async () => {
    const { h } = await tile([{ api: 'png', ratio: '16:9' }]);
    await h.user.click(screen.getByRole('button', { name: t('X-8', 'en') }));
    await h.settle();
    expect(h.save.saved[0].fileName).toBe('image_v1_16x9.png');
  });

  it('SD-17: the downloaded flag is persisted for the downloaded version only (v2 stays unflagged) after the save', async () => {
    const { h } = await tile([{ api: 'png' }, { api: 'png' }], 1);
    expect(h.sessionStore.snapshot().sessions['s1'].meta.versions.map((v) => v.downloaded)).toEqual([false, false]);
    await h.user.click(screen.getByRole('button', { name: t('X-8', 'en') }));
    await vi.waitFor(() => expect(h.sessionStore.snapshot().sessions['s1'].meta.versions[0].downloaded).toBe(true));
    expect(h.sessionStore.snapshot().sessions['s1'].meta.versions[1].downloaded).toBe(false);
  });

  it('there is exactly one control named "Download" and one named "Edit this →" in the tile (no duplicate accessible names, R-9)', async () => {
    await tile([{ api: 'png' }]);
    expect(screen.getAllByRole('button', { name: 'Download' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Edit this →' })).toHaveLength(1);
  });

  it('under uk the buttons read "Завантажити" and "Редагувати →"', async () => {
    await tile([{ api: 'png' }], 1, {}, { lang: 'uk' });
    expect(screen.getByRole('button', { name: 'Завантажити' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Редагувати →' })).toBeDefined();
  });
});

describe('FR-6: Edit this → attaches the version to the composer (T27)', () => {
  it('clicking it puts that version in the draft of the same session', async () => {
    const { h } = await tile([{ api: 'png' }, { api: 'png' }], 2);
    await h.user.click(screen.getByRole('button', { name: LABELS.en.edit }));
    await h.settle();
    expect(h.store.draft().attachedVersion).toMatchObject({ fromVersion: 2 });
  });
});

describe('FR-9: the "Edit of v{N}" chip and the "Compare with v{N}" control (T27)', () => {
  it('an image that edits a RETAINED earlier version shows the chip and the Compare control', async () => {
    await tile([{ api: 'png' }, { api: 'png' }], 2, { editOf: { n: 1, sourceRetained: true } });
    expect(screen.getByText('Edit of v1')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Compare with v1' })).toBeDefined();
  });

  it('when the source version is no longer retained the chip stays and Compare is NOT shown', async () => {
    await tile([{ api: 'png' }, { api: 'png' }], 2, { editOf: { n: 1, sourceRetained: false } });
    expect(screen.getByText('Edit of v1')).toBeDefined();
    expect(screen.queryByRole('button', { name: /Compare with/ })).toBeNull();
  });

  it('an image with no stored source (an old session, a typed follow-up) shows neither, without an error', async () => {
    await tile([{ api: 'png' }, { api: 'png' }], 2);
    expect(screen.queryByText(/Edit of v/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Compare with/ })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('Compare opens the full view with the source as Before: {number: 2, compareWith: 1}', async () => {
    const { h } = await tile([{ api: 'png' }, { api: 'png' }], 2, { editOf: { n: 1, sourceRetained: true } });
    await h.user.click(screen.getByRole('button', { name: 'Compare with v1' }));
    await h.settle();
    expect(TestBed.inject(StudioDeliveryService).openView()).toEqual({ number: 2, compareWith: 1 });
  });

  it('the texts follow the language: "Редакція v1" and "Порівняти з v1" under uk', async () => {
    await tile([{ api: 'png' }, { api: 'png' }], 2, { editOf: { n: 1, sourceRetained: true } }, { lang: 'uk' });
    expect(screen.getByText('Редакція v1')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Порівняти з v1' })).toBeDefined();
  });
});

describe('FR-8: nothing out of scope is rendered on a tile (T27)', () => {
  it('no Upscale 4K, Variation or Alt text action, and no Save as preset', async () => {
    const { h } = await tile([{ api: 'png' }]);
    for (const text of [/Upscale/i, /Variation/i, /Alt text/i, /Save (current )?as preset/i]) {
      expect(h.view.container.textContent).not.toMatch(text);
    }
    expect(screen.queryByRole('button', { name: /Upscale|Variation|Alt text/i })).toBeNull();
  });

  it('a version whose bytes are unavailable still renders the label and the actions without throwing', async () => {
    const s = makeSession('s1', { pairs: 1 });
    s.turns[1].parts[0] = inlineImagePart('image/png', toBase64(makeRaster({ format: 'png', width: 4, height: 4 })));
    s.turns[1].parts = [{ text: 'bytes gone' }];
    await renderStudio(StudioImageTileComponent, { sessions: [s], inputs: { versionNumber: 1 } });
    expect(screen.getByRole('button', { name: t('X-8', 'en') })).toBeDefined();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Moved from studio-version-strip.component.spec.ts (D-5, kept assertion for assertion): "Edit this version" -> "Edit this →" in the normal and
// the blocked state (FR-37 / AC-22), and the quota failure of the downloaded flag (FR-33 / FR-81). The attachment is composer state, so the
// tiles are hosted next to the real composer.
// ---------------------------------------------------------------------------------------------------------------------
@Component({
  selector: 'test-host-tiles',
  standalone: true,
  imports: [StudioImageTileComponent, StudioComposerComponent],
  template: `<app-studio-image-tile [versionNumber]="1" [lang]="lang()" /><app-studio-image-tile [versionNumber]="2" [lang]="lang()" /><app-studio-composer [lang]="lang()" />`,
})
class TilesAndComposerHost { lang = input.required<'en' | 'uk'>(); }

describe('FR-37 / AC-22 (moved from the strip, D-5): Edit this → in the normal state', () => {
  const attachedList = () => screen.queryAllByAltText(/^Version v\d+ attached for editing$/);
  const editBtn = (n: number) => screen.getAllByRole('button', { name: LABELS.en.edit })[n - 1];

  it('AC-22: the action attaches that version to the next message of the SAME session - its thumbnail (X-27) appears in the composer\'s list and no session is created', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const h = await renderStudio(TilesAndComposerHost, { sessions: [session] });
    await h.user.click(editBtn(1));
    await h.settle();
    expect(await screen.findByAltText(t('X-27', 'en', { n: 1 }))).toBeDefined();
    expect(Object.keys(h.sessionStore.snapshot().sessions)).toEqual(['s1']);
  });

  it('D-9 / FR-37: a second "Edit this →" REPLACES the first - at most one version is attached at a time', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const h = await renderStudio(TilesAndComposerHost, { sessions: [session] });
    await h.user.click(editBtn(1));
    await h.user.click(editBtn(2));
    await h.settle();
    expect(attachedList().map((i) => i.getAttribute('alt'))).toEqual([t('X-27', 'en', { n: 2 })]);
  });

  it('FR-37: the attached version is sent INLINE in the next message (never as a file URI) together with the new text', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const h = await renderStudio(TilesAndComposerHost, { sessions: [session] });
    await h.user.click(editBtn(1));
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
    const h = await renderStudio(TilesAndComposerHost, { sessions: [session] });
    await h.user.type(byName.textarea('en'), 'too much');
    await h.user.click(byName.button(t('X-1', 'en')));
    await flushGenerate(h, { error: 'PROTECTED_HISTORY_EXCEEDS_LIMIT' }, { status: 413, statusText: 'Payload Too Large' });
    // Only Send is disabled (SD-37); the old session keeps its history.
    expect((byName.button(t('X-1', 'en')) as HTMLButtonElement).disabled).toBe(true);
    expect((editBtn(1) as HTMLButtonElement).disabled).toBe(false);
    await h.user.click(editBtn(2));
    await vi.waitFor(() => expect(Object.keys(h.sessionStore.snapshot().sessions)).toHaveLength(2));
    expect(h.sessionStore.snapshot().sessions['s1'].turns.map((x) => x.id)).toEqual(['u1', 'm1', 'u2', 'm2']);
    expect(await screen.findByAltText(t('X-27', 'en', { n: 2 }))).toBeDefined();
  });
});

describe('FR-33 / FR-81 (moved from the strip, D-5): a flag write that fails with a quota error', () => {
  it('leaves the flag unset and shows the native alert once (T-20)', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioImageTileComponent, { sessions: [session], inputs: { versionNumber: 1 } });
    h.sessionStore.failWrites(new StorageQuotaError('quota'));
    await h.user.click(screen.getByRole('button', { name: t('X-8', 'en') }));
    await vi.waitFor(() => expect(h.alerts.messages).toEqual([t('T-20', 'en')]));
    h.sessionStore.failWrites(null);
    expect(h.sessionStore.snapshot().sessions['s1'].meta.versions[0].downloaded).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// T43 (security hardening NB-1, NB-3; docs/reviews/security/US-10.5-security-review.md section 7). A sibling block: no case above is changed.
// Component runner; cannot be run at this stage (no `ng test`), so the red reasons are reasoned in test strategy v7 section 11.
//
// PINNED CONTRACT ADDITION (owner T43): stored image data is untrusted at render time.
//   NB-1: malformed stored base64 (`inlineData.data`) never breaks the tile: it renders its <figure>, its <img> and its caption, and the caption reads
//         `v{N}` (the "size unknown" rule of FR-7), with no alert and no uncaught render error.
//   NB-3: an unsupported stored MIME (anything but image/png, image/jpeg, image/webp) is an unresolvable image: the tile still renders (figure,
//         alt), but its <img> carries NO data URL of that MIME (no `src` of the stored string). The caption is not pinned for this case: whether
//         the bytes are kept for the size probe is the builder's choice.
// ---------------------------------------------------------------------------------------------------------------------
describe('NB-1 / NB-3 hardening: stored image data is not trusted at render time (T43)', () => {
  const MALFORMED = '***not base64***';
  const storedPart = (session: any) => session.turns[1].parts[0].inlineData as { mimeType: string; data: string };

  it('precondition: atob really throws on the malformed string (so the case below is not vacuous)', () => {
    expect(() => atob(MALFORMED)).toThrow();
  });

  it('NB-1: a version whose stored base64 is malformed still renders its tile - figure, image and the caption "v1" - with no alert', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    storedPart(session).data = MALFORMED;
    const h = await renderStudio(StudioImageTileComponent, { sessions: [session], inputs: { versionNumber: 1 } });
    await h.settle();
    expect(within(figure()).getByAltText('prompt 1')).toBeDefined();
    expect(caption()).toBe('v1');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('NB-1: the malformed-data tile keeps its Download and "Edit this →" buttons (the tile is not half-rendered)', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    storedPart(session).data = MALFORMED;
    await renderStudio(StudioImageTileComponent, { sessions: [session], inputs: { versionNumber: 1 } });
    expect(within(figure()).getByRole('button', { name: t('X-8', 'en') })).toBeDefined();
    expect(within(figure()).getByRole('button', { name: t('T-22.editVersion', 'en') })).toBeDefined();
  });

  it.each([['text/html'], ['image/svg+xml']])('NB-3: a stored MIME of %s renders the tile with an image that carries no data URL of that MIME', async (mime) => {
    const { session } = sessionOf([{ api: 'png' }]);
    storedPart(session).mimeType = mime;
    const h = await renderStudio(StudioImageTileComponent, { sessions: [session], inputs: { versionNumber: 1 } });
    await h.settle();
    const img = within(figure()).getByAltText('prompt 1');
    expect(img.getAttribute('src') ?? '').not.toContain(mime);
    expect(within(figure()).getByRole('button', { name: t('X-8', 'en') })).toBeDefined();
  });

  it('guard: the same session with a valid PNG still shows the data URL and the probed size', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    await renderStudio(StudioImageTileComponent, { sessions: [session], inputs: { versionNumber: 1 } });
    expect(within(figure()).getByAltText('prompt 1').getAttribute('src') ?? '').toContain('data:image/png;base64,');
    await vi.waitFor(() => expect(caption()).toBe('v1 · 40×30'));
  });
});
