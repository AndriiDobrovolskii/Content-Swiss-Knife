/**
 * US-10.1 T43 / US-10.5 T21 + T23 + T33 - StudioVersionStripComponent: the thumbnails of the retained versions.
 * Covers FR-38, AC-23 (US-10.1) and, for US-10.5, FR-6 / D-5 (the strip consumes the delivery service, the format selector is gone), FR-13.
 *
 * US-10.5 DISPOSITIONS (Specification FR-32 table, approved with SQ-5-B). Every moved or removed block is listed here AND in the test
 * generation report; nothing was deleted without a new home:
 *   D-5 REMOVED   "FR-55 / FR-82: selectable download format and conversion parameters" (old L156-218, five tests): the format selector no longer
 *                 exists (FR-6). The still-true behaviour is pinned in studio-delivery.service.spec.ts ("a PNG held for a JPG upload is saved as PNG,
 *                 unconverted") and in the full-view / tile specs (no combobox).
 *   D-6 MOVED     old L88-115 (PNG with API bytes, MIME, image_v1_1x1.png, zero codec calls; equal-format JPG and WEBP), L116-123 (file name ratio),
 *                 L125-133 (the downloaded flag), kept ASSERTION FOR ASSERTION in studio-image-tile.component.spec.ts (the new host of the actions).
 *   D-5 MOVED     the dialog cases (old L76-85 open / close / alt) to studio-full-view.component.spec.ts; the Copy cases (old L220-256) to
 *                 studio-full-view / studio-delivery.service.spec.ts; the Edit cases (old L327-386) to studio-image-tile.component.spec.ts.
 *   D-5 / D-7 / D-8 MOVED  "Download all versions" (old L258-317) to studio-feed.component.spec.ts: D-7 keeps the three-version mixed-format archive as a
 *                 native-delivery test (the converted JPG entry assertion became "the entry of v2 is the native PNG, byte-identical, image_v2_1x1.png,
 *                 no codec call"), D-8 is rewritten to the injectable archive builder (X-21) plus a failing save (X-18).
 *   D-9           the \bv1\b lookups are scoped to the tile label in the tile spec.
 * What stays here: the strip as thumbnails. Component runner; type-clean from T21 (it imports only the strip and helpers that exist then).
 * Contract: thumbnail buttons whose accessible name contains `v<N>`, each holding an <img> with the prompt as alt (never inside a <figure>);
 * clicking one asks the delivery service to open that version (`openView()` becomes {number}).
 */
import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { screen } from '@testing-library/angular';
import { StudioVersionStripComponent } from './studio-version-strip.component';
import { StudioDeliveryService } from '../../../../services/image-studio/studio-delivery.service';
import { renderStudio, t, LABELS } from '../../../../../test/image-studio/helpers/studio-render';
import { sessionOf } from '../../../../../test/image-studio/helpers/sessions';
import { makeSession } from '../../../../../test/image-studio/helpers/fakes';

const vBtn = (n: number) => screen.getByRole('button', { name: new RegExp(`\\bv${n}\\b`) });

describe('FR-38 / AC-23: the strip shows one thumbnail per retained version (T21)', () => {
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

  it('AC-23: clicking a thumbnail asks the delivery service to open that version (the full view is a separate component)', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    expect(TestBed.inject(StudioDeliveryService).openView()).toBeNull();
    await h.user.click(vBtn(2));
    await h.settle();
    expect(TestBed.inject(StudioDeliveryService).openView()).toEqual({ number: 2 });
  });

  it('a strip with no retained version shows no thumbnail', async () => {
    await renderStudio(StudioVersionStripComponent, { sessions: [makeSession('s1')] });
    expect(screen.queryAllByRole('button', { name: /\bv\d+\b/ })).toHaveLength(0);
  });
});

describe('FR-6 / D-5: the download-format selector is gone from the studio (T21)', () => {
  it('after opening a version there is no "Download format" selector (no combobox, no X-7 text) anywhere', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    await h.user.click(vBtn(1));
    await h.settle();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByText(t('X-7', 'en'))).toBeNull();
    expect(screen.queryByText(/PNG|JPG|WEBP/)).toBeNull();
  });
});

describe('D-5 / FR-32 (d): the dialog is not part of the strip (T23)', () => {
  it('opening a version in the strip alone renders no dialog (the dialog host is the full-view component)', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    await h.user.click(vBtn(1));
    await h.settle();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('FR-11 / FR-13: the strip is thumbnails only (T33)', () => {
  it('the strip has no "Download all" button (the control lives once, in the feed)', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    expect(screen.queryByRole('button', { name: LABELS.en.downloadAll })).toBeNull();
  });

  it('every thumbnail is an image inside a button and no thumbnail sits in a <figure> (so tile counts never include them)', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    const imgs = Array.from(h.view.container.querySelectorAll('img'));
    expect(imgs).toHaveLength(2);
    for (const img of imgs) {
      expect(img.closest('button')).not.toBeNull();
      expect(img.closest('figure')).toBeNull();
    }
  });

  it('a thumbnail\'s alt is the prompt, or "Generated image" for a blank prompt, re-resolved on a language toggle (D-2)', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    session.meta.versions[0].prompt = '';
    const h = await renderStudio(StudioVersionStripComponent, { sessions: [session] });
    expect(screen.getByAltText('Generated image')).toBeDefined();
    await h.setLang('uk');
    expect(screen.getByAltText('Згенероване зображення')).toBeDefined();
  });
});
