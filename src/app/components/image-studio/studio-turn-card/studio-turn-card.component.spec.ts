/**
 * US-10.5 T28 + T29 + T41 - StudioTurnCardComponent: one generation as a card.
 * T28: input thumbnails, prompt, ratio / resolution / model chips, the preset chip, the summary line, model text interleaved with the image tiles
 *      (FR-3 (a)-(e), (g); FR-4; FR-25).  T29: the "Reuse prompt" button (FR-5, ungated parts).  T41: the preset rows of Reuse, written to the
 *      OWNER RULING OI-B -> option 1 (docs/decisions/US-10.5-open-decisions.md): Reuse counts as an edit for the check mark (cleared) and keeps
 *      the wire preset id.
 *
 * Component runner. The card is built the way the feed builds it: from the REAL `buildFeed` over a seeded session (type owner T11 <= T28).
 * PINNED CONTRACT (owner T28; standalone, OnPush): inputs `lang` (required) and `card` (required FeedCard). Root element is an <article>. It contains
 *   input thumbnails as <img> with alt X-31 "Input image {n}" (never the prompt, never inside a <figure>); the prompt text; ratio, resolution and model
 *   chips and, only for a known preset id, the preset chip, as plain text; the summary line `{N} images · $cost · T s` (FR-4 partial-field rule);
 *   the model text paragraphs and the image tiles (<app-studio-image-tile>, each a <figure>) in API order; thought parts never; and (T29) a button
 *   "Reuse prompt" (X-37), absent when card.prompt is blank, disabled while !store.inputEnabled().
 * Reuse moves focus to the composer's prompt field, so those cases render the card next to the real composer in a host.
 */
import { describe, it, expect } from 'vitest';
import { Component, input } from '@angular/core';
import { screen, within } from '@testing-library/angular';
import { StudioTurnCardComponent } from './studio-turn-card.component';
import { StudioComposerComponent } from '../studio-composer/studio-composer.component';
import { buildFeed, type FeedCard } from '../../../../utils/image-studio/feed';
import {
  renderStudio, byName, t, MODEL_LABEL, FLASH, PRO, GENERATE_URL, imagesBody, expectGenerate, type Lang,
} from '../../../../../test/image-studio/helpers/studio-render';
import { sessionOf, mixedTextImageSession, withTurnExtras } from '../../../../../test/image-studio/helpers/sessions';
import { makeSession, turn, textPart, filePart, inlineImagePart, makeRaster, toBase64, type StoredSession } from '../../../../../test/image-studio/helpers/fakes';

const KNOWN = ['white-bg', 'lifestyle', 'banner', 'social', 'detail-closeup'];
const cardsOf = (s: StoredSession) => buildFeed(s, { isKnownPresetId: (id: string) => KNOWN.includes(id) }).cards;
const article = () => screen.getByRole('article');
const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

async function renderCard(session: StoredSession, index = 0, opts: { lang?: Lang } = {}) {
  const card = cardsOf(session)[index];
  return renderStudio(StudioTurnCardComponent, { sessions: [session], inputs: { card }, ...(opts.lang ? { lang: opts.lang } : {}) });
}

describe('FR-3 (b)-(d): prompt and chips (T28)', () => {
  it('shows the prompt text and the ratio, resolution and model chips', async () => {
    const s = makeSession('s1', { pairs: 1 });
    Object.assign(s.meta.versions[0], { prompt: 'a red mug', aspectRatio: '4:5', resolution: '2K', model: PRO });
    await renderCard(s);
    const a = text(article());
    expect(a).toContain('a red mug');
    expect(a).toContain('4:5');
    expect(a).toContain('2K');
    expect(a).toContain(MODEL_LABEL.pro);
  });

  it('shows the preset chip (the registry name) for a known recorded preset', async () => {
    const s = withTurnExtras(makeSession('s1', { pairs: 1 }), 'm1', { presetId: 'lifestyle' });
    await renderCard(s);
    expect(text(article())).toContain('Lifestyle scene');
  });

  it('under uk the preset chip is the Ukrainian registry name', async () => {
    const s = withTurnExtras(makeSession('s1', { pairs: 1 }), 'm1', { presetId: 'banner' });
    await renderCard(s, 0, { lang: 'uk' });
    expect(text(article())).toContain('Банер категорії');
  });

  it('shows no preset chip when none was recorded, and none for an id the registry no longer knows', async () => {
    const none = makeSession('s1', { pairs: 1 });
    await renderCard(none);
    expect(text(article())).not.toMatch(/Product on white|Lifestyle scene|Category banner|Social|Detail close-up/);
  });

  it('a removed preset id never reaches the card (buildFeed drops it), so no chip and no error', async () => {
    const s = withTurnExtras(makeSession('s1', { pairs: 1 }), 'm1', { presetId: 'removed-later' });
    expect(cardsOf(s)[0].presetId).toBeUndefined();
    await renderCard(s);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(text(article())).not.toContain('removed-later'); // no chip, and the raw id is not printed in its place
  });
});

describe('FR-3 (a): input thumbnails (T28)', () => {
  function withInputs(): { session: StoredSession; bytes: Uint8Array } {
    const bytes = makeRaster({ format: 'png', width: 4, height: 4, size: 180 });
    const s = makeSession('s1', { pairs: 1 });
    s.turns[0] = turn('u1', 'user', textPart('blend'), filePart('files/a'), inlineImagePart('image/png', toBase64(bytes)));
    withTurnExtras(s, 'm1', { inputRefs: [{ turnId: 'u1', partIndex: 1 }, { turnId: 'u1', partIndex: 2 }] });
    return { session: s, bytes };
  }

  it('renders one thumbnail per resolvable reference with the alt "Input image {n}" - never the prompt - and none inside a figure', async () => {
    const { session, bytes } = withInputs();
    const h = await renderStudio(StudioTurnCardComponent, { sessions: [session], sentBytes: { s1: { 'files/a': { bytes, mimeType: 'image/png' } } }, inputs: { card: cardsOf(session)[0] } });
    await h.settle();
    const thumbs = within(article()).getAllByAltText(/^Input image \d+$/);
    expect(thumbs.map((i) => i.getAttribute('alt'))).toEqual(['Input image 1', 'Input image 2']);
    for (const img of thumbs) expect(img.closest('figure')).toBeNull();
    // ASSERTION SCOPE (test_strategy v5, section 9): the <article> also holds the generated tile (T27), whose <img> alt IS the version prompt
    // ("prompt 1", FR-75 / buildAlt). "Never the prompt" is a fact about the INPUT THUMBNAILS only, so it is asked of the images that are NOT
    // inside a <figure> (the thumbnails), not of the whole card. Together with the two lines above this pins: the thumbnails are exactly the
    // two "Input image {n}" images, none sits in a figure, and none carries the prompt as its alt.
    const nonTileImages = Array.from(article().querySelectorAll('img')).filter((i) => i.closest('figure') === null);
    expect(nonTileImages.map((i) => i.getAttribute('alt'))).toEqual(['Input image 1', 'Input image 2']);
    expect(nonTileImages.some((i) => i.getAttribute('alt') === 'prompt 1')).toBe(false);
  });

  it('FR-3 failure path: a thumbnail whose bytes are no longer stored is omitted without an error (the inline one remains)', async () => {
    const { session } = withInputs();
    const h = await renderStudio(StudioTurnCardComponent, { sessions: [session], inputs: { card: cardsOf(session)[0] } });
    await h.settle();
    expect(within(article()).getAllByAltText(/^Input image \d+$/)).toHaveLength(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('the thumbnail alt follows the language (Вхідне зображення 1)', async () => {
    const { session, bytes } = withInputs();
    const h = await renderStudio(StudioTurnCardComponent, { lang: 'uk', sessions: [session], sentBytes: { s1: { 'files/a': { bytes, mimeType: 'image/png' } } }, inputs: { card: cardsOf(session)[0] } });
    await h.settle();
    expect(within(article()).getByAltText('Вхідне зображення 1')).toBeDefined();
  });

  it('a card without references (an old session) shows no thumbnail', async () => {
    await renderCard(makeSession('s1', { pairs: 1 }));
    expect(within(article()).queryAllByAltText(/^Input image/)).toHaveLength(0);
  });
});

describe('FR-4: the summary line and its partial-field rule (T28)', () => {
  const single = (extras: Record<string, unknown>) => withTurnExtras(makeSession('s1', { pairs: 1 }), 'm1', extras);

  it('shows "1 image · $0.12 · 12.4 s" with all three pieces', async () => {
    await renderCard(single({ cost: 0.12, durationMs: 12_400 }));
    expect(text(article())).toContain('1 image · $0.12 · 12.4 s');
  });

  it('a two-image turn reads "2 images" and model text parts do not add to the count', async () => {
    const s = withTurnExtras(mixedTextImageSession(), 'm1', { cost: 0.067, durationMs: 5_000 });
    await renderCard(s);
    expect(text(article())).toContain('2 images · $0.07 · 5.0 s');
  });

  it('only a cost: the missing duration drops its separator', async () => {
    await renderCard(single({ cost: 0.12 }));
    expect(text(article())).toContain('1 image · $0.12');
    // ASSERTION SCOPE (test_strategy v5, section 9): the summary line is followed by the tiles inside the same <article>, so the old
    // `not.toMatch(/·\s*$/)` looked at the END of the whole card (the tile's last button) and was vacuous. The dangling separator is asked of
    // the text right after the cost: whatever follows (the tile caption "v1 ...") must not start with a "·".
    expect(text(article())).toMatch(/1 image · \$0\.12(?!\s*·)/);
  });

  it('only a duration: "1 image · 5.0 s" and no cost segment', async () => {
    await renderCard(single({ durationMs: 5_000 }));
    expect(text(article())).toContain('1 image · 5.0 s');
    expect(text(article())).not.toContain('$');
    expect(text(article())).not.toMatch(/·\s*·/); // the missing cost leaves no empty segment between two separators
  });

  it('neither cost nor duration (an old session): no summary line at all, and nothing renders as NaN, undefined or $0.00', async () => {
    await renderCard(single({}));
    expect(text(article())).not.toMatch(/\b1 image\b|NaN|undefined|\$0\.00/);
  });

  it('a present-but-invalid cost is treated as missing', async () => {
    await renderCard(single({ cost: 'abc', durationMs: 5_000 }));
    expect(text(article())).toContain('1 image · 5.0 s');
    expect(text(article())).not.toMatch(/NaN|undefined|abc/);
  });

  it('under uk: "1 зображення · $0.12 · 12.4 с"', async () => {
    await renderCard(single({ cost: 0.12, durationMs: 12_400 }), 0, { lang: 'uk' });
    expect(text(article())).toContain('1 зображення · $0.12 · 12.4 с');
  });
});

describe('FR-3 (g) / rules 1-4: model text is interleaved with the image tiles in API order (T28)', () => {
  it('FIRST-TEXT, image 1, SECOND-TEXT, image 2 in document order; the thought part is never shown', async () => {
    await renderCard(mixedTextImageSession());
    const a = article();
    const first = within(a).getByText('FIRST-TEXT');
    const second = within(a).getByText('SECOND-TEXT');
    const figures = within(a).getAllByRole('figure');
    expect(figures).toHaveLength(2);
    const before = (x: Node, y: Node) => Boolean(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(before(first, figures[0])).toBe(true);
    expect(before(figures[0], second)).toBe(true);
    expect(before(second, figures[1])).toBe(true);
    expect(within(a).queryByText('hidden thought')).toBeNull();
  });

  it('every tile appears exactly once and text parts add no tile: two images, two text parts, two figures', async () => {
    await renderCard(mixedTextImageSession());
    expect(within(article()).getAllByRole('figure')).toHaveLength(2);
    expect(article().querySelectorAll('figure img')).toHaveLength(2);
  });

  it('an image-only turn renders its tiles with no text paragraph and no error', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    await renderCard(session);
    expect(within(article()).getAllByRole('figure')).toHaveLength(1);
  });
});

describe('FR-25: an old session renders without placeholders (T28)', () => {
  it('prompt and tile render; no preset chip, no thumbnails, no summary, no alert, no placeholder text', async () => {
    const { session } = sessionOf([{ api: 'png' }]);
    await renderCard(session);
    const a = text(article());
    expect(a).toContain('prompt 1');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(a).not.toMatch(/NaN|undefined|null|N\/A|—/);
  });

  it('a mixed session: the OLD card shows no cost', async () => {
    const s = withTurnExtras(makeSession('s1', { pairs: 2 }), 'm2', { cost: 0.5, durationMs: 1_000 });
    await renderCard(s, 0);
    expect(text(article())).not.toContain('$');
  });

  it('a mixed session: the NEW card shows its own cost', async () => {
    const s = withTurnExtras(makeSession('s1', { pairs: 2 }), 'm2', { cost: 0.5, durationMs: 1_000 });
    await renderCard(s, 1);
    expect(text(article())).toContain('$0.50');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// T29 - Reuse prompt. The card is hosted next to the real composer: Reuse moves focus to the composer's prompt field.
// ---------------------------------------------------------------------------------------------------------------------
@Component({
  selector: 'test-host-reuse',
  standalone: true,
  imports: [StudioTurnCardComponent, StudioComposerComponent],
  template: `<app-studio-turn-card [card]="card()" [lang]="lang()" /><app-studio-composer [lang]="lang()" />`,
})
class ReuseHostComponent {
  lang = input.required<'en' | 'uk'>();
  card = input.required<FeedCard>();
}

async function renderReuse(session: StoredSession, lang: Lang = 'en') {
  return renderStudio(ReuseHostComponent, { lang, sessions: [session], inputs: { card: cardsOf(session)[0] } });
}
const reuseBtn = (lang: Lang = 'en') => screen.getByRole('button', { name: t('X-37', lang) });

describe('FR-5: Reuse prompt fills the composer, moves focus and sends nothing (T29)', () => {
  function sessionWithPrompt() {
    const s = makeSession('s1', { pairs: 1 });
    Object.assign(s.meta.versions[0], { prompt: 'a red mug on a table', aspectRatio: '16:9', model: FLASH });
    return s;
  }

  it('puts the card\'s prompt, aspect ratio and model into the composer', async () => {
    const h = await renderReuse(sessionWithPrompt());
    await h.user.type(byName.textarea('en'), 'old words');
    await h.user.click(reuseBtn());
    await h.settle();
    expect(byName.textarea('en').value).toBe('a red mug on a table');
    expect(byName.select('X-4', 'en').value).toBe('16:9');
    expect(byName.select('X-6', 'en').selectedOptions[0].textContent!.trim()).toBe(MODEL_LABEL.flash);
  });

  it('moves focus to the prompt field', async () => {
    const h = await renderReuse(sessionWithPrompt());
    await h.user.click(reuseBtn());
    await h.settle();
    expect(document.activeElement).toBe(byName.textarea('en'));
  });

  it('sends nothing: no generate request is made', async () => {
    const h = await renderReuse(sessionWithPrompt());
    await h.user.click(reuseBtn());
    await h.settle();
    h.http.expectNone(GENERATE_URL);
    expect(h.store.generating()).toBe(false);
  });

  // POSITIVE TWIN of the blank-prompt case below (test_strategy v5, section 9): that case passes today only because no Reuse button exists
  // yet. This one is red until T29 renders the button, and it re-renders the SAME card with a blank prompt, so "absent" is proved against a
  // button that was demonstrably there a moment earlier (not against a button that never existed).
  it('is present, named "Reuse prompt", on a card that has a prompt, and disappears when the same card is re-rendered with a blank prompt', async () => {
    const withPrompt = sessionWithPrompt();
    const h = await renderReuse(withPrompt);
    expect(screen.getAllByRole('button', { name: t('X-37', 'en') })).toHaveLength(1);
    const blank = sessionWithPrompt();
    blank.meta.versions[0].prompt = '';
    h.view.fixture.componentRef.setInput('card', cardsOf(blank)[0]);
    await h.settle();
    expect(screen.queryByRole('button', { name: t('X-37', 'en') })).toBeNull();
  });

  it('is absent on a card that has no prompt (an images-only send)', async () => {
    const s = sessionWithPrompt();
    s.meta.versions[0].prompt = '';
    await renderReuse(s);
    expect(screen.queryByRole('button', { name: t('X-37', 'en') })).toBeNull();
  });

  it('is disabled while the prompt field is disabled (a generation is running), and enabled again afterwards', async () => {
    const h = await renderReuse(sessionWithPrompt());
    await h.user.type(byName.textarea('en'), 'another one');
    await h.user.click(byName.button(t('X-1', 'en')));
    await h.settle();
    expect(byName.textarea('en').disabled).toBe(true);
    expect((reuseBtn() as HTMLButtonElement).disabled).toBe(true);
    const req = expectGenerate(h);
    req.flush(imagesBody());
    await h.settle();
    expect((reuseBtn() as HTMLButtonElement).disabled).toBe(false);
  });

  it('is named "Використати промпт" under uk', async () => {
    await renderReuse(sessionWithPrompt(), 'uk');
    expect(screen.getByRole('button', { name: 'Використати промпт' })).toBeDefined();
  });
});

describe('FR-5 / FR-14 (owner ruling OI-B, option 1): Reuse prompt clears the check mark and keeps the wire preset id (T41)', () => {
  const pickWhite = () => screen.getByRole('button', { name: 'Product on white' });

  it('after a preset pick the check mark is on that preset; Reuse clears it (read from the store, so this case needs no composer markup beyond T34)', async () => {
    const h = await renderReuse(makeSession('s1', { pairs: 1 }));
    await h.user.click(pickWhite());
    expect(h.store.draft().checkedPresetId).toBe('white-bg');
    await h.user.click(reuseBtn());
    await h.settle();
    expect(h.store.draft().checkedPresetId).toBeNull();
  });

  it('Reuse keeps the wire preset id of the earlier pick: the next Generate still carries presetId', async () => {
    const h = await renderReuse(makeSession('s1', { pairs: 1 }));
    await h.user.click(pickWhite());
    await h.user.click(reuseBtn());
    await h.settle();
    expect(h.store.draft().presetId).toBe('white-bg');
    expect(h.store.draft().checkedPresetId).toBeNull();
    await h.user.click(byName.button(t('X-1', 'en')));
    const req = expectGenerate(h);
    expect(req.request.body.presetId).toBe('white-bg');
    req.flush(imagesBody());
    await h.settle();
  });

  it('with no preset picked, Reuse leaves no check mark and no wire preset', async () => {
    const h = await renderReuse(makeSession('s1', { pairs: 1 }));
    await h.user.click(reuseBtn());
    await h.settle();
    expect(h.store.draft().presetId).toBeNull();
    expect(h.store.draft().checkedPresetId).toBeNull();
  });
});
