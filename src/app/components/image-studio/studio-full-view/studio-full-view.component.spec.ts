/**
 * US-10.5 T23 - StudioFullViewComponent: the one dialog (moved out of the version strip), single image or before/after compare.
 * Covers FR-10, FR-33 (exactly one dialog, focus return), D-5 (the dialog-level delivery actions, minus the removed format selector).
 *
 * Component runner. The component takes only `lang`; what is open is the delivery service's `openView()` state, so the specs open a
 * view through the same service instance the component injects (the harness provides it at the TestBed root).
 * Contract: the only role="dialog" of the studio, named X-17; buttons Download (X-8), Copy to clipboard, "Edit this →", Close (X-15);
 * with a compare source a role="slider" and the labels "Before (v{N})" / "After (v{M})"; when either image has no bytes the single-image view.
 * Failure texts of delivery actions (X-18..X-22) are shown by the feed (see studio-feed.component.spec.ts), not by this dialog.
 */
import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { screen, within } from '@testing-library/angular';
import { StudioFullViewComponent } from './studio-full-view.component';
import { StudioDeliveryService } from '../../../../services/image-studio/studio-delivery.service';
import { renderStudio, t, LABELS, type Harness } from '../../../../../test/image-studio/helpers/studio-render';
import { sessionOf, bytesEqual } from '../../../../../test/image-studio/helpers/sessions';
import { makeSession, turn, textPart } from '../../../../../test/image-studio/helpers/fakes';

const dialog = () => screen.getByRole('dialog', { name: t('X-17', 'en') });
const delivery = () => TestBed.inject(StudioDeliveryService);
async function open(h: Harness, n: number, opener?: HTMLElement, compareWith?: number) {
  delivery().open(n, opener ?? null, compareWith);
  h.view.detectChanges();
  await h.settle();
}

describe('FR-33: exactly one dialog, only while a view is open (T23)', () => {
  it('no dialog exists until a view is opened, then exactly one', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const h = await renderStudio(StudioFullViewComponent, { sessions: [session] });
    expect(screen.queryByRole('dialog')).toBeNull();
    await open(h, 2);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(dialog()).toBeDefined();
  });

  it('the dialog shows the opened version\'s image with the prompt as alt', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const h = await renderStudio(StudioFullViewComponent, { sessions: [session] });
    await open(h, 2);
    expect(within(dialog()).getByAltText('prompt 2')).toBeDefined();
  });

  it('focus moves into the dialog when it opens', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioFullViewComponent, { sessions: [session] });
    await open(h, 1);
    await vi.waitFor(() => expect(dialog().contains(document.activeElement)).toBe(true));
  });
});

describe('FR-33 / AC-23: closing (T23)', () => {
  it('the Close button closes the view', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioFullViewComponent, { sessions: [session] });
    await open(h, 1);
    await h.user.click(within(dialog()).getByRole('button', { name: t('X-15', 'en') }));
    await h.settle();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(delivery().openView()).toBeNull();
  });

  it('Escape closes the view', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioFullViewComponent, { sessions: [session] });
    await open(h, 1);
    await vi.waitFor(() => expect(dialog().contains(document.activeElement)).toBe(true));
    await h.user.keyboard('{Escape}');
    await h.settle();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closing returns focus to the element that opened the view', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioFullViewComponent, { sessions: [session] });
    const opener = document.createElement('button');
    opener.textContent = 'opener';
    document.body.appendChild(opener);
    await open(h, 1, opener);
    await h.user.click(within(dialog()).getByRole('button', { name: t('X-15', 'en') }));
    await h.settle();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe('D-5: the dialog keeps Download, Copy and Edit, and the format selector is gone (T23)', () => {
  it('offers Download, Copy to clipboard, Edit this → and Close - and no format selector or option list', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioFullViewComponent, { sessions: [session] });
    await open(h, 1);
    const d = within(dialog());
    expect(d.getByRole('button', { name: t('X-8', 'en') })).toBeDefined();
    expect(d.getByRole('button', { name: LABELS.en.copy })).toBeDefined();
    expect(d.getByRole('button', { name: LABELS.en.edit })).toBeDefined();
    expect(d.getByRole('button', { name: t('X-15', 'en') })).toBeDefined();
    expect(d.queryByRole('combobox')).toBeNull();
    expect(screen.queryByText(t('X-7', 'en'))).toBeNull();
  });

  it('Download saves the native bytes as image_v2_1x1.png with no codec call', async () => {
    const { session, api } = sessionOf([{ api: 'png' }, { api: 'png', input: 'image/jpeg' }]);
    const h = await renderStudio(StudioFullViewComponent, { sessions: [session] });
    await open(h, 2);
    await h.user.click(within(dialog()).getByRole('button', { name: t('X-8', 'en') }));
    await h.settle();
    expect(h.save.saved).toHaveLength(1);
    expect(h.save.saved[0].fileName).toBe('image_v2_1x1.png');
    expect(bytesEqual(h.save.saved[0].bytes, api[1])).toBe(true);
    expect(h.codec.transcodeCalls).toBe(0);
  });

  it('Copy to clipboard writes the PNG', async () => {
    const { session, api } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioFullViewComponent, { sessions: [session] });
    await open(h, 1);
    await h.user.click(within(dialog()).getByRole('button', { name: LABELS.en.copy }));
    await vi.waitFor(() => expect(h.clipboard.written).toHaveLength(1));
    expect(bytesEqual(h.clipboard.written[0], api[0])).toBe(true);
  });

  it('Edit this → attaches that version to the composer\'s draft', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const h = await renderStudio(StudioFullViewComponent, { sessions: [session] });
    await open(h, 1);
    await h.user.click(within(dialog()).getByRole('button', { name: LABELS.en.edit }));
    await h.settle();
    expect(h.store.draft().attachedVersion).toMatchObject({ fromVersion: 1 });
  });

  it('under uk the dialog buttons read Завантажити / Редагувати → / Закрити', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioFullViewComponent, { lang: 'uk', sessions: [session] });
    await open(h, 1);
    const d = within(screen.getByRole('dialog', { name: t('X-17', 'uk') }));
    expect(d.getByRole('button', { name: 'Завантажити' })).toBeDefined();
    expect(d.getByRole('button', { name: 'Редагувати →' })).toBeDefined();
    expect(d.getByRole('button', { name: 'Закрити' })).toBeDefined();
  });
});

describe('FR-10: compare mode inside the dialog (T23)', () => {
  it('with a compare source the dialog holds one role="slider" and the labels "Before (v1)" and "After (v3)"', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }, { api: 'png' }]);
    const h = await renderStudio(StudioFullViewComponent, { sessions: [session] });
    await open(h, 3, undefined, 1);
    const d = within(dialog());
    expect(d.getAllByRole('slider')).toHaveLength(1);
    expect(d.getByText('Before (v1)')).toBeDefined();
    expect(d.getByText('After (v3)')).toBeDefined();
    expect(screen.getAllByRole('dialog')).toHaveLength(1); // the slider lives IN the existing dialog, not inline in the feed
  });

  it('the slider is keyboard-operable from inside the dialog', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const h = await renderStudio(StudioFullViewComponent, { sessions: [session] });
    await open(h, 2, undefined, 1);
    screen.getByRole('slider').focus();
    await h.user.keyboard('{ArrowRight}');
    expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe('55');
  });

  it('without a compare source there is no slider', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    const h = await renderStudio(StudioFullViewComponent, { sessions: [session] });
    await open(h, 2);
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('FR-10 failure path: if the SOURCE image has no bytes the dialog falls back to the single-image view of the edited image - no broken slider, no error', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    session.turns[1] = turn('m1', 'model', textPart('no image bytes for v1'));
    const h = await renderStudio(StudioFullViewComponent, { sessions: [session] });
    await open(h, 2, undefined, 1);
    expect(screen.queryByRole('slider')).toBeNull();
    expect(within(dialog()).getByAltText('prompt 2')).toBeDefined();
  });

  it('FR-10 failure path: if the EDITED image has no bytes there is no slider either', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    session.turns[3] = turn('m2', 'model', textPart('no image bytes for v2'));
    const h = await renderStudio(StudioFullViewComponent, { sessions: [session] });
    await open(h, 2, undefined, 1);
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('the dialog works for a session with a different number of versions (the store session switch does not leave a stale dialog)', async () => {
    const h = await renderStudio(StudioFullViewComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    await open(h, 1);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });
});
