/**
 * US-10.1 T45 - ImageStudioComponent (the container): chat log, the single status region, the alert region, focus.
 * Covers FR-20, FR-21, FR-23, FR-36, FR-45, FR-47, FR-59, FR-62, FR-63, FR-64, FR-74, FR-75, FR-76, FR-77, FR-79, FR-81, FR-83;
 * AC-10, AC-11, AC-12, AC-13, AC-36, AC-38, AC-39, AC-46, AC-47, AC-48; NFR-14 (fake ports only).
 *
 * Component runner. Drives render -> type -> (attach through the fake codec) -> Send -> `HttpTestingController` answers the BFF,
 * then observes text, `role` regions and focus as a user would. The 120 s deadline and the Cancel path use the FAKE scheduler
 * behind SCHEDULER_PORT (no real timers); the live-region updates are counted with a `MutationObserver`.
 *
 * Counting rule (FR-74 / FR-83): the single `role="status"` element changes to a non-empty text exactly twice for a success
 * (T-16 then T-17 with the real version number) and exactly once for any end without a version (T-16); clearing it is not an
 * announcement. Errors, the Cancel notice, the safety block and the trim notice are `role="alert"`; a text-only reply is
 * plain chat content; the studio has no other `role="status"` and no `aria-live="polite"`.
 *
 * Pinned UI contract: see helpers/studio-render.ts. The chat log is an element with role="log" named X-26 (turns and replies); each
 * generated image carries a visible label containing `v<N>`, the model label and the resolution.
 *
 * NOT here: the pure rules behind each outcome (error-dispatch T31, runner T33/T34, apply-response T29) - this spec checks
 * that the container shows them through the right channel.
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/angular';
import { ImageStudioComponent } from './image-studio.component';
import {
  renderStudio, observeMutations, byName, t, LABELS, MODEL_LABEL, textOf, png, fileOf, imagesBody, expectGenerate, flushGenerate, collectUploads,
  GENERATE_URL, type Harness, type Lang,
} from '../../../../test/image-studio/helpers/studio-render';
import { makeSession, toBase64, makeRaster, decodeRaster } from '../../../../test/image-studio/helpers/fakes';
import { StorageQuotaError } from '../../../utils/image-studio/ports';

const EMPTY = () => makeSession('s0');
const alertsText = () => screen.queryAllByRole('alert').map((a) => textOf(a)).join(' | ');
const sendBtn = (lang: Lang = 'en') => byName.button(t('X-1', lang)) as HTMLButtonElement;
const retryBtn = (lang: Lang = 'en') => screen.queryByRole('button', { name: LABELS[lang].retry });
/**
 * The image tile (<figure>) of version n inside the log, found by its accessible name (the figcaption `v{N}` / `v{N} · {W}×{H}`). Scoped to
 * the log so the status region's "Version v{N} is ready", the version strip and the dialog can never satisfy a tile assertion.
 */
const tileLabelled = (n: number, lang: Lang = 'en') =>
  within(screen.getByRole('log', { name: t('X-26', lang) })).queryAllByRole('figure', { name: new RegExp(`\\bv${n}\\b`) });
/** The version strip of the container, and one of its thumbnail buttons (a tile's "Compare with v{n}" button must never be mistaken for it). */
const stripEl = (h: Harness) => {
  const el = h.view.container.querySelector('app-studio-version-strip');
  if (el === null) throw new Error('app-studio-version-strip is not rendered');
  return el as HTMLElement;
};
const stripThumb = (h: Harness, n: number) => within(stripEl(h)).getByRole('button', { name: new RegExp(`\\bv${n}\\b`) });

/** Counts the transitions of the status region to a non-empty text. */
function watchStatus() {
  const el = screen.getByRole('status');
  const seen: string[] = [];
  let last = textOf(el);
  const mo = observeMutations(el, () => {
    const cur = textOf(el);
    if (cur !== last) { seen.push(cur); last = cur; }
  }, { childList: true, characterData: true, subtree: true });
  return { announcements: () => seen.filter((s) => s !== ''), now: () => textOf(el), stop: () => mo.disconnect() };
}

async function typeAndSend(h: Harness, text: string, lang: Lang = 'en') {
  await h.user.type(byName.textarea(lang), text);
  await h.user.click(sendBtn(lang));
  await h.settle();
}

describe('FR-74 / AC-46 / FR-83: the status region announces exactly twice for a success', () => {
  it('AC-46 / FR-74: Send then a successful reply update the single role=status region exactly twice - T-16 then T-17 with the real version number (en)', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    const w = watchStatus();
    expect(w.now()).toBe('');
    await typeAndSend(h, 'a white mug');
    await flushGenerate(h, imagesBody());
    expect(w.announcements()).toEqual(['Generating…', 'Version v1 is ready']);
    w.stop();
  });

  it('AC-46 / FR-74 / FR-77: the same two announcements in Ukrainian under uk ("Генерую…", "Версію v1 готово")', async () => {
    const h = await renderStudio(ImageStudioComponent, { lang: 'uk', sessions: [EMPTY()] });
    const w = watchStatus();
    await typeAndSend(h, 'біла чашка', 'uk');
    await flushGenerate(h, imagesBody());
    expect(w.announcements()).toEqual(['Генерую…', 'Версію v1 готово']);
    w.stop();
  });

  it('FR-74 (OD-30 C-30.5): a two-image response announces the HIGHEST number (v2) and still only twice', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    const w = watchStatus();
    await typeAndSend(h, 'two variants');
    await flushGenerate(h, imagesBody({ count: 2 }));
    expect(w.announcements()).toEqual(['Generating…', 'Version v2 is ready']);
    // ASSERTION SCOPE (test_strategy v5, section 9): the status region itself reads "Version v2 is ready", so a whole-screen /\bv2\b/ text
    // lookup is satisfied by the announcement alone and proves nothing about the images. The label is asked of the tiles: one <figure> per
    // image, named by its caption (v{N} · {W}×{H}), inside the log.
    expect(tileLabelled(1)).toHaveLength(1);
    expect(tileLabelled(2)).toHaveLength(1);
    w.stop();
  });

  it('FR-77 / FR-74: an announcement uses the language at the moment it is made - toggling to uk while the call is in flight gives the Ukrainian T-17', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    const w = watchStatus();
    await typeAndSend(h, 'a mug');
    await h.setLang('uk');
    await flushGenerate(h, imagesBody());
    expect(w.announcements()).toEqual(['Generating…', 'Версію v1 готово']);
    w.stop();
  });

  it('FR-83: the studio contains exactly ONE role=status element and NO aria-live="polite" element, before and after a generation', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    const count = () => [h.view.container.querySelectorAll('[role="status"]').length, h.view.container.querySelectorAll('[aria-live="polite"]').length];
    expect(count()).toEqual([1, 0]);
    await typeAndSend(h, 'a mug');
    await flushGenerate(h, imagesBody());
    expect(count()).toEqual([1, 0]);
  });
});

describe('FR-74 / FR-83: an end without a version updates the status region once (T-16) and speaks through the alert channel', () => {
  const FAILS: Array<{ name: string; status: number; body: unknown; text: string; retry: boolean; ukText?: string }> = [
    { name: '502 UPSTREAM_RETRIES_EXHAUSTED', status: 502, body: { error: 'UPSTREAM_RETRIES_EXHAUSTED' }, text: 'The service is temporarily unavailable. Please try again.', retry: true, ukText: 'Сервіс тимчасово недоступний. Спробуйте ще раз.' },
    { name: '502 EMPTY_RESPONSE', status: 502, body: { error: 'EMPTY_RESPONSE' }, text: 'The model returned an empty or truncated response. Please try again.', retry: true, ukText: 'Модель повернула порожню або обірвану відповідь. Спробуйте ще раз.' },
    { name: '429 RATE_LIMIT_EXCEEDED', status: 429, body: { error: 'RATE_LIMIT_EXCEEDED' }, text: 'Generation limit exceeded (30 per hour). Please try again later.', retry: false, ukText: 'Перевищено ліміт генерацій (30 на годину). Спробуйте пізніше.' },
    { name: '501 GEMINI_KEY_MISSING', status: 501, body: { error: 'GEMINI_KEY_MISSING' }, text: 'Gemini API key is required for Image Studio', retry: false, ukText: 'Для Image Studio потрібен ключ Gemini API' },
    { name: '413 REQUEST_BODY_TOO_LARGE', status: 413, body: { error: 'REQUEST_BODY_TOO_LARGE' }, text: 'The request is too large and cannot be processed.', retry: false },
    { name: '413 PROTECTED_HISTORY_EXCEEDS_LIMIT', status: 413, body: { error: 'PROTECTED_HISTORY_EXCEEDS_LIMIT' }, text: 'The session is too large. Please start a new session from the latest version', retry: false, ukText: 'Сесія занадто велика. Будь ласка, почніть нову сесію з останньої версії' },
    { name: '500 PRICE_NOT_CONFIGURED', status: 500, body: { error: 'PRICE_NOT_CONFIGURED' }, text: 'API error', retry: false, ukText: 'Помилка API' },
    { name: '400 INVALID_REQUEST', status: 400, body: { error: 'INVALID_REQUEST' }, text: 'API error', retry: false },
    { name: '404 upstream, not a closed code', status: 404, body: { error: 'Помилка API' }, text: 'API error', retry: false },
    { name: '502 without the error envelope (proxy)', status: 502, body: 'Bad Gateway', text: 'The service is temporarily unavailable. Please try again.', retry: true },
  ];

  it.each(FAILS)('FR-61 / FR-83 / FR-74: $name -> one status update (T-16), the text in role=alert, Retry offered: $retry', async (c) => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    const w = watchStatus();
    await typeAndSend(h, 'a mug');
    await flushGenerate(h, c.body, { status: c.status, statusText: 'Err' });
    expect(w.announcements()).toEqual(['Generating…']);
    expect(w.now()).toBe(''); // SD-36: the region is cleared at the end, which is not an announcement
    expect(alertsText()).toContain(c.text);
    expect(Boolean(retryBtn())).toBe(c.retry);
    expect(screen.queryAllByText(/\bv\d+\b/)).toHaveLength(0); // no version was created
    w.stop();
  });

  it.each(FAILS.filter((c) => c.ukText))('FR-77 / FR-83 (uk): $name shows the Ukrainian text in role=alert', async (c) => {
    const h = await renderStudio(ImageStudioComponent, { lang: 'uk', sessions: [EMPTY()] });
    await typeAndSend(h, 'чашка', 'uk');
    await flushGenerate(h, c.body, { status: c.status, statusText: 'Err' });
    expect(alertsText()).toContain(c.ukText!);
  });

  it('SD-31 / FR-22: a transport failure (no response, status 0) is a failed turn with T-7 and a Retry button', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    const w = watchStatus();
    await typeAndSend(h, 'a mug');
    h.http.expectOne(GENERATE_URL).error(new ProgressEvent('error'));
    await h.settle();
    expect(alertsText()).toContain(t('T-7', 'en'));
    expect(retryBtn()).not.toBeNull();
    expect(w.announcements()).toEqual(['Generating…']);
    w.stop();
  });

  it('FR-85 / SD-31: a failed generate call is never repeated by the client on its own - exactly one POST per user action', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    await typeAndSend(h, 'a mug');
    h.http.expectOne(GENERATE_URL).flush({ error: 'UPSTREAM_RETRIES_EXHAUSTED' }, { status: 503, statusText: 'x' });
    await h.settle();
    h.scheduler.advance(60_000);
    await h.settle();
    h.http.expectNone(GENERATE_URL);
  });

  it('AC-14 / FR-24 / FR-64: a 200 that matches no variant is surfaced as an error, never as an empty image, and enters no history', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    await typeAndSend(h, 'a mug');
    await flushGenerate(h, { kind: 'images', parts: [], costUsd: 0.03, usage: { inputTokens: 1, outputTokens: 1 }, trimmedTurnIds: [] });
    expect(screen.queryAllByRole('alert').length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/\bv1\b/)).toHaveLength(0);
    expect(h.sessionStore.snapshot().sessions['s0'].turns).toHaveLength(0);
  });
});

describe('FR-62 / FR-63 / AC-38 / AC-39: safety block and text-only reply', () => {
  it('AC-38 / FR-62 / SD-36: a safety reply shows T-4 in role=alert, not the vendor reason string, creates no version and leaves the history untouched', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    await typeAndSend(h, 'something blocked');
    await flushGenerate(h, { kind: 'safety', reason: 'IMAGE_SAFETY', trimmedTurnIds: [] });
    expect(alertsText()).toContain('The request was blocked by the safety filter. Try rephrasing it.');
    expect(h.view.container.textContent).not.toContain('IMAGE_SAFETY');
    expect(h.sessionStore.snapshot().sessions['s1'].turns.map((x) => x.id)).toEqual(['u1', 'm1']);
    // The same-turn Retry stays available (FR-62).
    expect(retryBtn()).not.toBeNull();
  });

  it('FR-36 / AC-38: the blocked turn is never sent back - the next message carries only the accepted history', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    await typeAndSend(h, 'something blocked');
    await flushGenerate(h, { kind: 'safety', reason: 'SAFETY', trimmedTurnIds: [] });
    await h.user.clear(byName.textarea('en'));
    await typeAndSend(h, 'something gentle');
    const req = expectGenerate(h);
    expect(req.request.body.history.map((x: any) => x.id)).toEqual(['u1', 'm1']);
    expect(req.request.body.newTurn.parts.map((p: any) => p.text)).toEqual(['something gentle']);
    req.flush(imagesBody());
    await h.settle();
  });

  it('AC-39 / FR-63 / SD-36: a text-only reply is shown as plain chat content (no live role), creates no version, offers Retry, and the status updates once', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    const w = watchStatus();
    await typeAndSend(h, 'draw a mug');
    await flushGenerate(h, { kind: 'text', text: 'I can only describe it in words.', trimmedTurnIds: [] });
    const shown = screen.getByText('I can only describe it in words.');
    expect(shown.closest('[role="alert"]')).toBeNull();
    expect(shown.closest('[role="status"]')).toBeNull();
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    expect(screen.queryAllByText(/\bv1\b/)).toHaveLength(0);
    expect(retryBtn()).not.toBeNull();
    expect(w.announcements()).toEqual(['Generating…']);
    expect(h.sessionStore.snapshot().sessions['s0'].turns).toHaveLength(0);
    w.stop();
  });
});

describe('FR-36: Retry re-sends the same turn; a failed turn returns to the composer and enters no history', () => {
  it('FR-36 / FR-64: after a failure the prompt is back in the composer, Retry re-sends the SAME turn (text, model, ratio, resolution), and the session holds no turn', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    await h.user.type(byName.textarea('en'), 'a blue mug');
    await h.user.selectOptions(byName.select('X-4', 'en'), '4:3');
    await h.user.click(sendBtn());
    const first = expectGenerate(h);
    const firstBody = JSON.parse(JSON.stringify(first.request.body));
    first.flush({ error: 'UPSTREAM_RETRIES_EXHAUSTED' }, { status: 502, statusText: 'x' });
    await h.settle();
    expect(byName.textarea('en').value).toBe('a blue mug');
    expect(h.sessionStore.snapshot().sessions['s0'].turns).toHaveLength(0);
    await h.user.click(retryBtn()!);
    const second = expectGenerate(h);
    const { newTurn: n2, ...rest2 } = second.request.body;
    const { newTurn: n1, ...rest1 } = firstBody;
    expect(rest2).toEqual(rest1);
    expect(n2.parts).toEqual(n1.parts);
    second.flush(imagesBody());
    await h.settle();
    expect(tileLabelled(1)).toHaveLength(1); // the tile, not the status text "Version v1 is ready" (assertion scope, test_strategy v5, section 9)
  });
});

describe('FR-21 / FR-22 / AC-11 / AC-12: Cancel and the 120 s deadline', () => {
  it('AC-11 / FR-21: Cancel aborts the request, shows T-18 in role=alert, announces nothing more (status once), restores the prompt and re-enables the composer', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    const w = watchStatus();
    await typeAndSend(h, 'cancel me');
    const req = expectGenerate(h);
    expect(byName.textarea('en').disabled).toBe(true);
    await h.user.click(byName.button(LABELS.en.cancel));
    await h.settle();
    expect(req.cancelled).toBe(true);
    expect(alertsText()).toContain('Generation cancelled.');
    expect(w.announcements()).toEqual(['Generating…']);
    expect(byName.textarea('en').disabled).toBe(false);
    expect(byName.textarea('en').value).toBe('cancel me');
    expect(h.sessionStore.snapshot().sessions['s0'].turns).toHaveLength(0);
    w.stop();
  });

  it('AC-12 / FR-22: at 120 000 ms the request is aborted and T-6 is shown with a Retry button; at 119 999 ms nothing has happened', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    await typeAndSend(h, 'slow one');
    const req = expectGenerate(h);
    h.scheduler.advance(119_999);
    await h.settle();
    expect(req.cancelled).toBe(false);
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    h.scheduler.advance(1);
    await h.settle();
    expect(req.cancelled).toBe(true);
    expect(alertsText()).toContain('The response timed out (120 s).');
    expect(retryBtn()).not.toBeNull();
  });

  it('FR-22 / SD-22: a response arriving after the timeout is ignored - no version appears', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    await typeAndSend(h, 'slow one');
    const req = expectGenerate(h);
    h.scheduler.advance(120_000);
    await h.settle();
    if (!req.cancelled) req.flush(imagesBody());
    await h.settle();
    expect(screen.queryAllByText(/\bv1\b/)).toHaveLength(0);
    expect(h.sessionStore.snapshot().sessions['s0'].turns).toHaveLength(0);
  });

  it('FR-21: while a generation runs the Cancel button, the version strip, the session list and New session stay enabled', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    await typeAndSend(h, 'another');
    const req = expectGenerate(h);
    expect((byName.button(LABELS.en.cancel) as HTMLButtonElement).disabled).toBe(false);
    expect((byName.button(LABELS.en.newSession) as HTMLButtonElement).disabled).toBe(false);
    expect((stripThumb(h, 1) as HTMLButtonElement).disabled).toBe(false);
    expect((byName.button(LABELS.en.downloadAll) as HTMLButtonElement).disabled).toBe(false);
    req.flush(imagesBody());
    await h.settle();
  });

  it('SD-22: a response is applied only to the session that sent it - switching to another session mid-call does not orphan or misplace it', async () => {
    const a = makeSession('s1', { lastActivity: 1_000_000, createdAt: 1_000_000 });
    const b = makeSession('s2', { lastActivity: 1_000_000 - 1000, createdAt: 1_000_000 - 1000 });
    const h = await renderStudio(ImageStudioComponent, { sessions: [a, b] });
    await typeAndSend(h, 'for session one');
    const req = expectGenerate(h);
    await h.store.selectSession('s2');
    await h.settle();
    req.flush(imagesBody());
    await h.settle();
    await vi.waitFor(() => expect(h.sessionStore.snapshot().sessions['s1'].turns).toHaveLength(2));
    expect(h.sessionStore.snapshot().sessions['s2'].turns).toHaveLength(0);
  });
});

describe('FR-76 / AC-48: focus returns to the prompt field', () => {
  it('AC-48 / FR-76: after a success the focused element is the prompt field', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    await typeAndSend(h, 'a mug');
    await flushGenerate(h, imagesBody());
    expect(document.activeElement).toBe(byName.textarea('en'));
  });

  it('FR-76 (OD-21): after an error the focus is in the prompt field', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    await typeAndSend(h, 'a mug');
    await flushGenerate(h, { error: 'UPSTREAM_RETRIES_EXHAUSTED' }, { status: 502, statusText: 'x' });
    expect(document.activeElement).toBe(byName.textarea('en'));
  });

  it('FR-76 (OD-21): after Cancel the focus is in the prompt field', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    await typeAndSend(h, 'a mug');
    expectGenerate(h);
    await h.user.click(byName.button(LABELS.en.cancel));
    await h.settle();
    expect(document.activeElement).toBe(byName.textarea('en'));
  });

  it('FR-76 (OD-21): after the timeout the focus is in the prompt field', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    await typeAndSend(h, 'a mug');
    expectGenerate(h);
    h.scheduler.advance(120_000);
    await h.settle();
    expect(document.activeElement).toBe(byName.textarea('en'));
  });

  it('FR-47 / SD-37: in the blocked state only Send is disabled, the prompt stays enabled and holds the focus, T-14 is in role=alert with no Retry', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    await typeAndSend(h, 'too big');
    await flushGenerate(h, { error: 'PROTECTED_HISTORY_EXCEEDS_LIMIT' }, { status: 413, statusText: 'x' });
    expect(alertsText()).toContain('The session is too large. Please start a new session from the latest version');
    expect(alertsText()).not.toContain('permanently deleted'); // T-9 is NOT shown instead of T-14
    expect(retryBtn()).toBeNull();
    expect(byName.textarea('en').disabled).toBe(false);
    expect(document.activeElement).toBe(byName.textarea('en'));
    await h.user.type(byName.textarea('en'), ' more');
    expect(sendBtn().disabled).toBe(true);
    // Viewing, the strip, download and New session stay available.
    expect((byName.button(LABELS.en.newSession) as HTMLButtonElement).disabled).toBe(false);
    expect((byName.button(LABELS.en.downloadAll) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('FR-45 / FR-83: the trim notice', () => {
  it('FR-45 / T-9 / FR-83: a cut is reported as a permanent deletion with the counts, in role=alert (not role=status), and the cut is applied to the stored session', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [makeSession('s1', { pairs: 3 })] });
    const w = watchStatus();
    await typeAndSend(h, 'continue');
    await flushGenerate(h, imagesBody({ trimmedTurnIds: ['m1', 'u2'] }));
    expect(alertsText()).toContain('To stay within the limits, the following were permanently deleted from this device: versions: 1, messages: 2, images attached to them: 0.');
    expect(w.announcements()).toEqual(['Generating…', 'Version v4 is ready']);
    const ids = h.sessionStore.snapshot().sessions['s1'].turns.map((x) => x.id);
    expect(ids).not.toContain('m1');
    expect(ids).not.toContain('u2');
    expect(ids.slice(0, 1)).toEqual(['u1']); // the first user turn is protected
    w.stop();
  });

  it('FR-45 / FR-77: the notice is the Ukrainian T-9 under uk', async () => {
    const h = await renderStudio(ImageStudioComponent, { lang: 'uk', sessions: [makeSession('s1', { pairs: 3 })] });
    await typeAndSend(h, 'далі', 'uk');
    await flushGenerate(h, imagesBody({ trimmedTurnIds: ['m1', 'u2'] }));
    expect(alertsText()).toContain('Щоб вкластися в ліміти, назавжди видалено з цього пристрою: версій — 1, повідомлень — 2, доданих у них зображень — 0.');
  });
});

describe('FR-20 / FR-23 / AC-10 / AC-13: the chat log (T33)', () => {
  it('AC-10 / FR-20: text and images are rendered in the order the API returned them', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    await typeAndSend(h, 'order check');
    const img = (n: number) => ({ inlineData: { mimeType: 'image/png', data: toBase64(makeRaster({ format: 'png', width: 8, height: 8, size: 100 + n })) } });
    await flushGenerate(h, {
      kind: 'images', costUsd: 0.06, usage: { inputTokens: 1, outputTokens: 1 }, trimmedTurnIds: [],
      parts: [{ text: 'FIRST-TEXT' }, img(1), { text: 'SECOND-TEXT' }, img(2)],
    });
    const log = screen.getByRole('log', { name: t('X-26', 'en') });
    const first = within(log).getByText('FIRST-TEXT');
    const second = within(log).getByText('SECOND-TEXT');
    // D-10 / FR-3 (h): the tiles are the images inside a <figure>; the strip's thumbnails (alt = the prompt as well) sit in buttons.
    const images = within(log).getAllByRole('img').filter((i) => (i as HTMLImageElement).alt === 'order check' && i.closest('figure') !== null);
    expect(images).toHaveLength(2);
    const before = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(before(first, images[0])).toBe(true);
    expect(before(images[0], second)).toBe(true);
    expect(before(second, images[1])).toBe(true);
  });

  it('AC-13 / FR-23: each generated image is labelled with its version number, the model label and the resolution', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    await h.user.click(byName.button('Lifestyle scene')); // renamed by FR-21 (was 'Lifestyle'): a mandated name-only change
    await h.user.click(sendBtn());
    await flushGenerate(h, imagesBody());
    const log = screen.getByRole('log', { name: t('X-26', 'en') });
    // D-10: all three facts stay asserted - the version number on the image tile, the model label and the resolution on the tile's card (chips).
    const tile = within(log).getAllByText(/\bv1\b/).map((el) => el.closest('figure')).find((f) => f !== null) as HTMLElement;
    expect(textOf(tile)).toContain('v1');
    const card = tile.closest('article') as HTMLElement;
    expect(card).not.toBeNull();
    expect(textOf(card)).toContain(MODEL_LABEL.pro);
    expect(textOf(card)).toContain('2K');
  });
});

describe('FR-75 / AC-47: alt text of a generated image', () => {
  const altsOfGenerated = () => screen.getAllByRole('img').map((i) => (i as HTMLImageElement).alt);
  // ASSERTION SCOPE (test_strategy v5, section 9): the alt rule binds BOTH renderings of a generated image - the tile in the log (an <img> inside
  // a <figure>) and the strip thumbnail (an <img> inside a button). A whole-screen `toContain` is satisfied by either one alone, so a tile with a
  // wrong alt would pass behind a correct thumbnail. The positive checks therefore ask each rendering on its own; the "no stray text" check
  // keeps the whole screen.
  const altsOf = (imgs: Iterable<Element>) => Array.from(imgs).map((i) => i.getAttribute('alt') ?? '');
  const tileAlts = (h: Harness) => altsOf(h.view.container.querySelectorAll('[role="log"] figure img'));
  const stripAlts = (h: Harness) => altsOf(stripEl(h).querySelectorAll('img'));
  const expectBoth = (h: Harness, alt: string) => {
    expect(tileAlts(h), 'tile alt').toContain(alt);
    expect(stripAlts(h), 'strip alt').toContain(alt);
  };

  it('AC-47 / SD-35: a prompt of at most 100 code points is the alt as it is (whitespace collapsed, trimmed)', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    await typeAndSend(h, '  white   mug on a table ');
    await flushGenerate(h, imagesBody());
    expectBoth(h, 'white mug on a table');
  });

  it('AC-47 / SD-35: a 101-code-point prompt gives its first 100 code points followed by three ASCII full stops', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    const prompt = 'a'.repeat(100) + 'b';
    await h.user.click(byName.textarea('en'));
    await h.user.paste(prompt);
    await h.user.click(sendBtn());
    await flushGenerate(h, imagesBody());
    expectBoth(h, 'a'.repeat(100) + '...');
    expect(altsOfGenerated().some((a) => a.includes('b'))).toBe(false);
  });

  it('D-16 / D-35 / T-21: an images-only message gets the alt "Generated image", re-resolved to "Згенероване зображення" on a language toggle', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    await h.user.upload(h.view.container.querySelector('input[type="file"]') as HTMLInputElement, fileOf('in.png', png()));
    (await collectUploads(h, 1))[0].flush({ fileUri: 'files/in', mimeType: 'image/png' });
    await h.settle();
    await h.user.click(sendBtn());
    await flushGenerate(h, imagesBody());
    expectBoth(h, 'Generated image');
    await h.setLang('uk');
    expectBoth(h, 'Згенероване зображення');
  });

  it('FR-75 / D-35: a prompt-derived alt is NOT localised by a language toggle', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    await typeAndSend(h, 'white mug');
    await flushGenerate(h, imagesBody());
    await h.setLang('uk');
    expectBoth(h, 'white mug');
  });
});

describe('FR-59 / AC-36: the SynthID notice', () => {
  it('AC-36 / FR-59: the notice is static text in the interface language (en and uk), not in a live region', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    const notice = screen.getByText('Gemini images carry an invisible SynthID watermark that cannot be removed.');
    expect(notice.closest('[role="alert"],[role="status"]')).toBeNull();
    await h.setLang('uk');
    expect(screen.getByText('Зображення Gemini містять невидимий водяний знак SynthID, який неможливо видалити.')).toBeDefined();
  });
});

describe('FR-79 / FR-56: the product-name field names the downloaded file', () => {
  it('FR-56 / FR-79 / SD-14: product "Bambu Lab H2D" gives bambu-lab-h2d_v1_1x1.png for the first version', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    await h.user.type(byName.product('en'), 'Bambu Lab H2D');
    await typeAndSend(h, 'studio shot');
    await flushGenerate(h, imagesBody());
    await h.user.click(stripThumb(h, 1));
    await h.settle();
    const dlg = within(screen.getByRole('dialog', { name: t('X-17', 'en') }));
    await h.user.click(dlg.getByRole('button', { name: t('X-8', 'en') }));
    await h.settle();
    expect(h.save.saved.map((s) => s.fileName)).toEqual(['bambu-lab-h2d_v1_1x1.png']);
    expect(decodeRaster(h.save.saved[0].bytes)?.format).toBe('png');
  });
});

describe('FR-81 / SD-34: a quota failure on the response commit', () => {
  it('SD-34 / FR-81: the native alert shows T-20 once, no role=alert element and no status update appear, the session is unchanged and there is NO Retry button', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    const w = watchStatus();
    await typeAndSend(h, 'a mug');
    h.sessionStore.failWrites(new StorageQuotaError('quota'));
    await flushGenerate(h, imagesBody());
    expect(h.alerts.messages).toEqual([t('T-20', 'en')]);
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    expect(retryBtn()).toBeNull();
    expect(w.announcements()).toEqual(['Generating…']);
    h.sessionStore.failWrites(null);
    expect(h.sessionStore.snapshot().sessions['s0'].turns).toHaveLength(0);
    expect(byName.textarea('en').value).toBe('a mug'); // the content returns to the composer (a failed turn)
    w.stop();
  });

  it('FR-81 / D-29: after the native alert is dismissed the focus is in the prompt field when it is enabled', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    await typeAndSend(h, 'a mug');
    h.sessionStore.failWrites(new StorageQuotaError('quota'));
    await flushGenerate(h, imagesBody());
    expect(document.activeElement).toBe(byName.textarea('en'));
  });
});

describe('FR-77: a language toggle re-renders the studio chrome', () => {
  it('FR-77: labels, the SynthID notice and the control names switch to Ukrainian without a reload and back to English', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    // S11 sites (were L512, L514, L518, L519): the draft is blank, so the button reads X-29 in both languages. The two null-checks (were L516 and
    // L519) are re-pointed at the text of the state they test: after the toggle the OTHER language's button must be gone (the old
    // 'Send' / 'Надіслати' lookups would now be vacuous - no such label exists any more).
    expect(byName.button(t('X-29', 'en'))).toBeDefined();
    await h.setLang('uk');
    expect(byName.button(t('X-29', 'uk'))).toBeDefined();
    expect(byName.button(LABELS.uk.newSession)).toBeDefined();
    expect(screen.queryByRole('button', { name: t('X-29', 'en') })).toBeNull();
    await h.setLang('en');
    expect(byName.button(t('X-29', 'en'))).toBeDefined();
    expect(screen.queryByRole('button', { name: t('X-29', 'uk') })).toBeNull();
  });
});


// =====================================================================================================================
// US-10.5 container composition (T23, T24, T33). The container mounts the header, the session list, the feed (which hosts the strip), the
// single full-view dialog and the composer; it keeps the one role="status" region, the role="alert" region and the focus return.
// =====================================================================================================================
describe('US-10.5 FR-1 / FR-26 (T24): the header is mounted and "New session" exists exactly once', () => {
  it('shows the "Image Studio" heading (not a button), exactly one "New session" button and the "· history (N)" count', async () => {
    await renderStudio(ImageStudioComponent, { sessions: [makeSession('s1', { pairs: 1 }), makeSession('s2', { lastActivity: 999_000 })] });
    expect(screen.getByRole('heading', { name: 'Image Studio' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Image Studio' })).toBeNull();
    expect(screen.getAllByRole('button', { name: LABELS.en.newSession })).toHaveLength(1);
    expect(screen.getByText('· history (2)')).toBeDefined();
    expect(screen.getByText('2 sessions')).toBeDefined();
  });
});

describe('US-10.5 FR-13 / FR-3 (h) / FR-11 (T33): the feed is mounted inside the container', () => {
  it('there is exactly one log named X-26, one Download all control, one strip, and the strip is inside the log', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [makeSession('s1', { pairs: 2 })] });
    expect(screen.getAllByRole('log')).toHaveLength(1);
    const log = screen.getByRole('log', { name: t('X-26', 'en') });
    expect(screen.getAllByRole('button', { name: LABELS.en.downloadAll })).toHaveLength(1);
    expect(h.view.container.querySelectorAll('app-studio-version-strip')).toHaveLength(1);
    expect(log.contains(h.view.container.querySelector('app-studio-version-strip'))).toBe(true);
  });

  it('FR-6 / FR-11: "Download all (2) .zip" shows the number of retained versions and the SynthID notice is still shown', async () => {
    await renderStudio(ImageStudioComponent, { sessions: [makeSession('s1', { pairs: 2 })] });
    expect(screen.getByRole('button', { name: 'Download all (2) .zip' })).toBeDefined();
    expect(screen.getByText('Gemini images carry an invisible SynthID watermark that cannot be removed.')).toBeDefined();
  });

  it('FR-18 / AC-12: a session with no turn shows the empty state; sending the first prompt shows no empty state afterwards', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    expect(screen.getByText('Your images will appear here')).toBeDefined();
    await typeAndSend(h, 'a mug');
    await flushGenerate(h, imagesBody());
    expect(screen.queryByText('Your images will appear here')).toBeNull();
  });

  it('FR-33 / FR-20: during the first generation the empty state is replaced by a presentational progress element, and there is still exactly ONE role=status and NO aria-live="polite"', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [EMPTY()] });
    await typeAndSend(h, 'a mug');
    expectGenerate(h);
    expect(screen.queryByText('Your images will appear here')).toBeNull();
    expect(screen.getByTestId('studio-progress').getAttribute('aria-hidden')).toBe('true');
    expect(h.view.container.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(h.view.container.querySelectorAll('[aria-live="polite"]')).toHaveLength(0);
  });
});

describe('US-10.5 FR-10 / FR-33 (T23): the single full-view dialog is a sibling of the log', () => {
  it('opening a version from the strip shows exactly one dialog, and it is NOT inside the log', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    expect(screen.queryByRole('dialog')).toBeNull();
    await h.user.click(stripThumb(h, 1));
    await h.settle();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    const log = screen.getByRole('log', { name: t('X-26', 'en') });
    expect(log.contains(screen.getByRole('dialog'))).toBe(false);
  });

  it('the log\'s tile-image count is not changed by an open dialog (the dialog\'s image is outside the log)', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    const log = screen.getByRole('log', { name: t('X-26', 'en') });
    const before = log.querySelectorAll('figure img').length;
    // PRECONDITION (test_strategy v5, section 9): "unchanged" is only meaningful when there is something to change. With no tile at all the
    // count is 0 before and 0 after, and the case would pass on a feed that renders nothing. The one-version session has exactly one tile image.
    expect(before).toBe(1);
    await h.user.click(stripThumb(h, 1));
    await h.settle();
    expect(screen.getAllByRole('dialog')).toHaveLength(1); // the dialog is open (its own image is outside the log)
    expect(log.querySelectorAll('figure img').length).toBe(before);
  });
});

describe('US-10.5 FR-8 (T33): nothing out of scope is rendered anywhere in the studio', () => {
  it('no Upscale 4K, Variation, Alt text, Ctrl+K search, spend total, Save as preset, ref role selector, Images 1/2/4 or estimate', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [makeSession('s1', { pairs: 1, costUsd: 0.12 })] });
    const text = h.view.container.textContent ?? '';
    for (const re of [/Upscale/i, /Variation/i, /Alt text/i, /Ctrl\s*\+?\s*K/i, /Today|This month/i, /Save (current )?as preset/i, /Product ref|Style ref/i, /Images\s*1\s*\/\s*2\s*\/\s*4/, /Estimated|estimate/i]) {
      expect(text, String(re)).not.toMatch(re);
    }
  });
});

describe('US-10.5 FR-7 (T33): the size probe runs once per distinct image however often the studio re-renders', () => {
  it('two versions give two probe calls across a language toggle and a draft change', async () => {
    const h = await renderStudio(ImageStudioComponent, { sessions: [makeSession('s1', { pairs: 2 })] });
    await h.settle();
    const first = h.codec.probeCalls;
    expect(first).toBe(2);
    await h.setLang('uk');
    await h.user.type(byName.textarea('uk'), 'x');
    await h.settle();
    expect(h.codec.probeCalls).toBe(first);
  });
});
