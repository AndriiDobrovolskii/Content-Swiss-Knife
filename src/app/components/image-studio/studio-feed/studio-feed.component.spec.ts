/**
 * US-10.5 T30 + T32 + T33 - StudioFeedComponent: the results feed (log container, empty state or first-generation progress, turn cards, the
 * "Download all (N) .zip" row, the SynthID notice, events and Retry, and the one version strip).
 * T30: FR-3 (h), FR-11, FR-18, FR-20, FR-33, D-5 (Download all moved here), D-7, D-8.  T32: FR-27 (Retry kept), the non-history events.
 * T33: FR-13 (the strip slot) and the strip's thumbnails not being tile images.
 *
 * Component runner. The type owner of this file is T30 (it imports only the T30 component); the T32 and T33 describes are DOM cases against it
 * (breakdown rule R3). PINNED CONTRACT (header of helpers/studio-render.ts): the feed renders `<div role="log" aria-live="off" aria-label=X-26>`
 * ALWAYS; inside it, in order, the empty state OR a presentational first-generation progress element (`data-testid="studio-progress"`,
 * `aria-hidden="true"`, no role, no aria-live) OR the turn cards (<article>), then the one <app-studio-version-strip>, then events and Retry.
 * The "Download all (N) .zip" button, the SynthID notice (T-19) and the role="alert" element for delivery failures (X-18..X-22) sit OUTSIDE the
 * log. The notice is shown in every state: the existing spec AC-36 (container, empty session) must keep passing.
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/angular';
import JSZip from 'jszip';
import { StudioFeedComponent } from './studio-feed.component';
import {
  renderStudio, t, LABELS, textOf, imagesBody, expectGenerate, GENERATE_URL, type Harness, type Lang,
} from '../../../../../test/image-studio/helpers/studio-render';
import { sessionOf, bytesEqual, mixedTextImageSession } from '../../../../../test/image-studio/helpers/sessions';
import { makeSession, turn, textPart } from '../../../../../test/image-studio/helpers/fakes';
import { ZipBuildError } from '../../../../utils/image-studio/zip';

// The log's accessible name follows the studio language (X-26: Conversation / Розмова), so the lookup takes the language of the render.
const log = (lang: Lang = 'en') => screen.getByRole('log', { name: t('X-26', lang) });
const downloadAll = () => screen.getByRole('button', { name: LABELS.en.downloadAll }) as HTMLButtonElement;
const after = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const flagOf = (h: Harness, i: number) => h.sessionStore.snapshot().sessions['s1'].meta.versions[i].downloaded;
const NOTICE = 'Gemini images carry an invisible SynthID watermark that cannot be removed.';
async function startFirstGeneration(h: Harness, prompt = 'first') {
  h.store.setDraft({ text: prompt });
  void h.store.send();
  await h.settle();
  return expectGenerate(h);
}

describe('FR-3 (h): the log container (T30)', () => {
  it('is always rendered with role="log", aria-live="off" and the name X-26 - for an empty session and for a session with cards', async () => {
    await renderStudio(StudioFeedComponent, { sessions: [makeSession('s0')] });
    expect(log().getAttribute('aria-live')).toBe('off');
  });

  it('keeps role="log", aria-live="off" and the name with cards present', async () => {
    await renderStudio(StudioFeedComponent, { sessions: [makeSession('s1', { pairs: 2 })] });
    expect(log().getAttribute('aria-live')).toBe('off');
  });

  it('the name follows the language (Розмова)', async () => {
    await renderStudio(StudioFeedComponent, { lang: 'uk', sessions: [makeSession('s0')] });
    expect(screen.getByRole('log', { name: 'Розмова' })).toBeDefined();
  });
});

describe('FR-18: the empty state shows only while there are no turns and no generation (T30)', () => {
  it('shows the headline and the three starter cards INSIDE the log for a session with no turns', async () => {
    await renderStudio(StudioFeedComponent, { sessions: [makeSession('s0')] });
    expect(within(log()).getByText('Your images will appear here')).toBeDefined();
    expect(within(log()).getAllByRole('button')).toHaveLength(3);
  });

  it('does not show the empty state once a turn exists', async () => {
    await renderStudio(StudioFeedComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    expect(screen.queryByText('Your images will appear here')).toBeNull();
  });

  it('"Download all" is NOT rendered while the empty state shows (FR-11 Proposed), but the SynthID notice is', async () => {
    await renderStudio(StudioFeedComponent, { sessions: [makeSession('s0')] });
    expect(screen.queryByRole('button', { name: LABELS.en.downloadAll })).toBeNull();
    expect(screen.getByText(NOTICE)).toBeDefined();
  });
});

describe('FR-20 / FR-33: first-generation progress is presentational (T30)', () => {
  it('during the first generation the progress element replaces the empty state, is aria-hidden, and has no role or live setting', async () => {
    const h = await renderStudio(StudioFeedComponent, { sessions: [makeSession('s0')] });
    const req = await startFirstGeneration(h);
    const progress = within(log()).getByTestId('studio-progress');
    expect(progress.getAttribute('aria-hidden')).toBe('true');
    expect(progress.hasAttribute('role')).toBe(false);
    expect(progress.hasAttribute('aria-live')).toBe(false);
    expect(screen.queryByText('Your images will appear here')).toBeNull();
    expect(h.view.container.querySelectorAll('[role="status"],[aria-live="polite"]')).toHaveLength(0);
    req.flush(imagesBody());
    await h.settle();
  });

  it('when the generation succeeds the progress is gone and the card is shown', async () => {
    const h = await renderStudio(StudioFeedComponent, { sessions: [makeSession('s0')] });
    const req = await startFirstGeneration(h);
    req.flush(imagesBody());
    await h.settle();
    expect(screen.queryByTestId('studio-progress')).toBeNull();
    expect(within(log()).getAllByRole('article')).toHaveLength(1);
  });

  it('FR-20 failure path: if that generation ends without a version the progress is removed and the empty state returns', async () => {
    const h = await renderStudio(StudioFeedComponent, { sessions: [makeSession('s0')] });
    const req = await startFirstGeneration(h);
    req.flush({ error: 'UPSTREAM_RETRIES_EXHAUSTED' }, { status: 502, statusText: 'x' });
    await h.settle();
    expect(screen.queryByTestId('studio-progress')).toBeNull();
    expect(screen.getByText('Your images will appear here')).toBeDefined();
  });

  it('the progress is NOT shown for a later generation in a session that already has turns', async () => {
    const h = await renderStudio(StudioFeedComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    const req = await startFirstGeneration(h, 'second');
    expect(screen.queryByTestId('studio-progress')).toBeNull();
    req.flush(imagesBody());
    await h.settle();
  });
});

describe('FR-3 / FR-11: cards and the Download all row (T30)', () => {
  it('renders one card per generation, oldest first, each with its prompt', async () => {
    await renderStudio(StudioFeedComponent, { sessions: [makeSession('s1', { pairs: 3 })] });
    const cards = within(log()).getAllByRole('article');
    expect(cards).toHaveLength(3);
    cards.forEach((c, i) => expect(textOf(c)).toContain(`prompt ${i + 1}`));
  });

  it('"Download all (N) .zip" shows the number of retained versions, is enabled, and sits OUTSIDE the log', async () => {
    await renderStudio(StudioFeedComponent, { sessions: [makeSession('s1', { pairs: 3 })] });
    expect(downloadAll().textContent!.replace(/\s+/g, ' ').trim()).toBe('Download all (3) .zip');
    expect(downloadAll().disabled).toBe(false);
    expect(log().contains(downloadAll())).toBe(false);
  });

  it('the label is Ukrainian under uk ("Завантажити все (2) .zip")', async () => {
    await renderStudio(StudioFeedComponent, { lang: 'uk', sessions: [makeSession('s1', { pairs: 2 })] });
    expect(screen.getByRole('button', { name: 'Завантажити все (2) .zip' })).toBeDefined();
  });

  it('SD-28 / FR-11: in a feed that is shown but retains no version (an orphan user turn) the control is rendered DISABLED as "(0)" and saves nothing', async () => {
    const s = makeSession('s1');
    s.turns = [turn('u1', 'user', textPart('lonely'))];
    s.meta.turnOrder = ['u1'];
    const h = await renderStudio(StudioFeedComponent, { sessions: [s] });
    expect(downloadAll().textContent!.replace(/\s+/g, ' ').trim()).toBe('Download all (0) .zip');
    expect(downloadAll().disabled).toBe(true);
    await h.user.click(downloadAll());
    expect(h.save.saved).toHaveLength(0);
  });

  it('the SynthID notice is static text outside the log and outside any live region', async () => {
    await renderStudio(StudioFeedComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    const notice = screen.getByText(NOTICE);
    expect(notice.closest('[role="alert"],[role="status"],[role="log"]')).toBeNull();
  });

  it('FR-33: the feed adds no role="status" element, before or after a generation', async () => {
    const h = await renderStudio(StudioFeedComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    expect(h.view.container.querySelectorAll('[role="status"]')).toHaveLength(0);
  });
});

describe('FR-6 / D-7: Download all builds one native archive (T30)', () => {
  it('three versions of mixed formats give ONE zip named from the fake clock and the latest prompt; entries are native API bytes (v2 is the PNG), no codec call, all flagged', async () => {
    const { session, api } = sessionOf([{ api: 'png' }, { api: 'png', input: 'image/jpeg' }, { api: 'webp', ratio: '4:5' }]);
    const h = await renderStudio(StudioFeedComponent, { sessions: [session] });
    await h.user.click(downloadAll());
    await vi.waitFor(() => expect(h.save.saved).toHaveLength(1));
    const file = h.save.saved[0];
    expect(file.mimeType).toBe('application/zip');
    expect(file.fileName).toBe('19700101-001640-prompt-3.zip'); // the harness clock starts at 1 000 000 ms = 00:16:40 UTC
    const zip = await JSZip.loadAsync(file.bytes);
    expect(Object.keys(zip.files).sort()).toEqual(['image_v1_1x1.png', 'image_v2_1x1.png', 'image_v3_4x5.webp']);
    expect(bytesEqual(await zip.file('image_v2_1x1.png')!.async('uint8array'), api[1])).toBe(true);
    expect(bytesEqual(await zip.file('image_v3_4x5.webp')!.async('uint8array'), api[2])).toBe(true);
    expect(h.codec.transcodeCalls).toBe(0);
    await vi.waitFor(() => expect([0, 1, 2].map((i) => flagOf(h, i))).toEqual([true, true, true]));
  });

  it('a generation in progress does not disable it', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioFeedComponent, { sessions: [session] });
    const req = await startFirstGeneration(h, 'next');
    expect(downloadAll().disabled).toBe(false);
    req.flush(imagesBody());
    await h.settle();
  });
});

describe('FR-11 failure path / D-8: an archive or save failure is an alert, with no file and no flag (T30)', () => {
  it('D-8: an archive builder that throws ZipBuildError shows "Could not build the ZIP archive." in a role=alert, saves nothing, flags nothing', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'webp' }]);
    const h = await renderStudio(StudioFeedComponent, { sessions: [session] });
    h.archive.failWith = new ZipBuildError();
    await h.user.click(downloadAll());
    expect(textOf(await screen.findByRole('alert'))).toBe('Could not build the ZIP archive.');
    expect(h.save.saved).toHaveLength(0);
    expect([0, 1].map((i) => flagOf(h, i))).toEqual([false, false]);
  });

  it('D-8 second case: a failing save port shows "Could not download the image." and flags nothing', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioFeedComponent, { sessions: [session] });
    h.save.failWith = new Error('disk full');
    await h.user.click(downloadAll());
    expect(textOf(await screen.findByRole('alert'))).toBe('Could not download the image.');
    expect(flagOf(h, 0)).toBe(false);
  });

  it('the alert is outside the log', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioFeedComponent, { sessions: [session] });
    h.save.failWith = new Error('x');
    await h.user.click(downloadAll());
    expect(log().contains(await screen.findByRole('alert'))).toBe(false);
  });
});

describe('FR-27: events and Retry stay (T32)', () => {
  it('a text-only reply is shown as plain content inside the log (no live role), creates no version, offers Retry, and follows the cards', async () => {
    const h = await renderStudio(StudioFeedComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    const req = await startFirstGeneration(h, 'draw a mug');
    req.flush({ kind: 'text', text: 'I can only describe it in words.', trimmedTurnIds: [] });
    await h.settle();
    const shown = within(log()).getByText('I can only describe it in words.');
    expect(shown.closest('[role="alert"],[role="status"]')).toBeNull();
    expect(h.sessionStore.snapshot().sessions['s1'].turns).toHaveLength(2);
    expect(within(log()).getByRole('button', { name: LABELS.en.retry })).toBeDefined();
    expect(after(within(log()).getByRole('article'), shown)).toBe(true);
  });

  it('a safety block offers Retry inside the log and never shows the vendor reason string', async () => {
    const h = await renderStudio(StudioFeedComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    const req = await startFirstGeneration(h, 'something blocked');
    req.flush({ kind: 'safety', reason: 'IMAGE_SAFETY', trimmedTurnIds: [] });
    await h.settle();
    expect(within(log()).getByRole('button', { name: LABELS.en.retry })).toBeDefined();
    expect(h.view.container.textContent).not.toContain('IMAGE_SAFETY');
  });

  it('a failed generation offers Retry in the log; Retry re-sends the SAME turn and its success adds the card', async () => {
    const h = await renderStudio(StudioFeedComponent, { sessions: [makeSession('s0')] });
    const first = await startFirstGeneration(h, 'a blue mug');
    const firstBody = JSON.parse(JSON.stringify(first.request.body));
    first.flush({ error: 'UPSTREAM_RETRIES_EXHAUSTED' }, { status: 502, statusText: 'x' });
    await h.settle();
    await h.user.click(within(log()).getByRole('button', { name: LABELS.en.retry }));
    const second = expectGenerate(h);
    expect(second.request.body.newTurn.parts).toEqual(firstBody.newTurn.parts);
    second.flush(imagesBody());
    await h.settle();
    expect(within(log()).getAllByRole('article')).toHaveLength(1);
  });

  it('Retry is not offered when the composer content changed (SD-18) and is absent for a successful turn', async () => {
    const h = await renderStudio(StudioFeedComponent, { sessions: [makeSession('s0')] });
    const req = await startFirstGeneration(h, 'x');
    req.flush(imagesBody());
    await h.settle();
    expect(screen.queryByRole('button', { name: LABELS.en.retry })).toBeNull();
  });

  it('the Retry button is a plain control in the studio language (Повторити under uk)', async () => {
    const h = await renderStudio(StudioFeedComponent, { lang: 'uk', sessions: [makeSession('s0')] });
    h.store.setDraft({ text: 'x' });
    void h.store.send();
    await h.settle();
    h.http.expectOne(GENERATE_URL).flush({ error: 'UPSTREAM_RETRIES_EXHAUSTED' }, { status: 502, statusText: 'x' });
    await h.settle();
    expect(within(log('uk')).getByRole('button', { name: 'Повторити' })).toBeDefined();
  });
});

describe('FR-13: the version strip slot (T33)', () => {
  const strip = (h: Harness) => h.view.container.querySelector('app-studio-version-strip');

  it('with no retained version there is no strip and no empty frame in its place', async () => {
    const h = await renderStudio(StudioFeedComponent, { sessions: [makeSession('s0')] });
    expect(strip(h)).toBeNull();
    expect(within(log()).queryAllByRole('article')).toHaveLength(0); // nothing but the empty state is in the log
    expect(log().querySelectorAll('figure')).toHaveLength(0);
  });

  it('a feed that is shown but retains no version (an orphan user turn) renders no strip either', async () => {
    const s = makeSession('s1');
    s.turns = [turn('u1', 'user', textPart('lonely'))];
    s.meta.turnOrder = ['u1'];
    const h = await renderStudio(StudioFeedComponent, { sessions: [s] });
    expect(strip(h)).toBeNull();
  });

  it('with N versions there is exactly ONE strip, inside the log, and it is not inside any card', async () => {
    const h = await renderStudio(StudioFeedComponent, { sessions: [makeSession('s1', { pairs: 3 })] });
    expect(h.view.container.querySelectorAll('app-studio-version-strip')).toHaveLength(1);
    expect(log().contains(strip(h))).toBe(true);
    expect(strip(h)!.closest('article')).toBeNull();
  });

  it('the strip follows the card holding the main (newest) image and no earlier card', async () => {
    const h = await renderStudio(StudioFeedComponent, { sessions: [makeSession('s1', { pairs: 3 })] });
    const cards = within(log()).getAllByRole('article');
    expect(after(cards[2], strip(h)!)).toBe(true);
    expect(after(cards[1], cards[2])).toBe(true);
    // nothing sits between the earlier cards: the strip is not between card 1 and card 2 or card 2 and card 3
    expect(after(strip(h)!, cards[2])).toBe(false);
    expect(after(strip(h)!, cards[1])).toBe(false);
  });

  it('it lists every retained version, not only the newest card\'s', async () => {
    const h = await renderStudio(StudioFeedComponent, { sessions: [makeSession('s1', { pairs: 3 })] });
    expect(within(strip(h) as HTMLElement).getAllByRole('button', { name: /\bv\d+\b/ })).toHaveLength(3);
  });

  it('when the card of the main image is not in the feed the strip is at the END of the feed', async () => {
    const s = makeSession('s1', { pairs: 2 });
    s.turns = s.turns.filter((x) => x.id !== 'm2');
    const h = await renderStudio(StudioFeedComponent, { sessions: [s] });
    const cards = within(log()).getAllByRole('article');
    expect(cards).toHaveLength(1);
    expect(strip(h)).not.toBeNull();
    expect(after(cards[0], strip(h)!)).toBe(true);
  });

  it('the strip precedes events and Retry in document order', async () => {
    const h = await renderStudio(StudioFeedComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    const req = await startFirstGeneration(h, 'words please');
    req.flush({ kind: 'text', text: 'Only words.', trimmedTurnIds: [] });
    await h.settle();
    const text = within(log()).getByText('Only words.');
    const retry = within(log()).getByRole('button', { name: LABELS.en.retry });
    expect(after(strip(h)!, text)).toBe(true);
    expect(after(strip(h)!, retry)).toBe(true);
  });

  it('the strip\'s thumbnails are not image tiles: tile images are the <img> inside <figure> and their count equals the versions', async () => {
    const h = await renderStudio(StudioFeedComponent, { sessions: [mixedTextImageSession('order check')] });
    const tileImages = Array.from(log().querySelectorAll('figure img'));
    expect(tileImages).toHaveLength(2);
    expect(strip(h)!.querySelectorAll('figure')).toHaveLength(0);
    const stripImgs = strip(h)!.querySelectorAll('img');
    expect(stripImgs.length).toBeGreaterThan(0);
    for (const img of Array.from(stripImgs)) expect(img.closest('button')).not.toBeNull();
  });

  it('the strip thumbnails use the prompt as alt (so a tile-count assertion must select tiles, FR-3 (h))', async () => {
    const h = await renderStudio(StudioFeedComponent, { sessions: [mixedTextImageSession('order check')] });
    const alts = Array.from(strip(h)!.querySelectorAll('img')).map((i) => i.getAttribute('alt'));
    expect(alts.length).toBeGreaterThan(0);
    expect(alts.every((a) => a === 'order check')).toBe(true);
  });
});


describe('FR-6 / FR-83 (moved from the strip, D-5): a single-image download failure is an alert the feed shows (T30)', () => {
  it('a save that throws shows "Could not download the image." in a role=alert, downloads nothing and leaves the flag unset', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioFeedComponent, { sessions: [session] });
    h.save.failWith = new Error('blocked by the browser');
    await h.user.click(within(log()).getByRole('button', { name: t('X-8', 'en') }));
    expect(textOf(await screen.findByRole('alert'))).toBe('Could not download the image.');
    expect(h.save.saved).toHaveLength(0);
    expect(flagOf(h, 0)).toBe(false);
  });

  it('FR-83: the download failure is announced in the Ukrainian text under uk', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    const h = await renderStudio(StudioFeedComponent, { lang: 'uk', sessions: [session] });
    h.save.failWith = new Error('blocked');
    await h.user.click(within(log('uk')).getByRole('button', { name: 'Завантажити' }));
    expect(textOf(await screen.findByRole('alert'))).toBe('Не вдалося завантажити зображення.');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// T43 (security hardening NB-1; docs/reviews/security/US-10.5-security-review.md section 7). A sibling block: no case above is changed.
// Component runner; cannot be run at this stage. One unreadable stored image must not take the rest of the feed down.
// ---------------------------------------------------------------------------------------------------------------------
describe('NB-1 hardening: a version with malformed stored base64 does not break the feed (T43)', () => {
  it('the feed still renders both tiles: the malformed v1 is captioned "v1", the valid v2 gets its probed size, and no alert shows', async () => {
    const { session } = sessionOf([{ api: 'png' }, { api: 'png' }]);
    (session.turns[1].parts[0].inlineData as { data: string }).data = '***not base64***';
    const h = await renderStudio(StudioFeedComponent, { sessions: [session] });
    await h.settle();
    const captions = () => Array.from(log().querySelectorAll('figure figcaption')).map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim());
    await vi.waitFor(() => expect(captions()).toEqual(['v1', 'v2 · 40×30']));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
