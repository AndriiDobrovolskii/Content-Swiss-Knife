/**
 * US-10.1 T42 - composer attachments: button, drop, paste, thumbnails, upload states.
 * Covers FR-8, FR-10, FR-14, FR-15, FR-73, FR-81; AC-1, AC-3, AC-6, AC-7, AC-45 (and the images-only message of FR-18 / D-34).
 *
 * Component runner. The browser canvas is the fake codec (`makeFakeCodec`, a synthetic raster format): this spec proves the
 * UI plumbing around it (what is shown, what is sent, what is refused), not that a real canvas strips EXIF (W-2 / V-8).
 * Uploads happen at ATTACH time (plan DD-17, P-1): each accepted file is ingested and POSTed to /api/image-studio/upload
 * immediately, and the thumbnail shows `uploading` until the BFF answers.
 *
 * Pinned UI contract (see helpers/studio-render.ts): attach `<button>` named X-2 plus a real `<input type="file">`; a drop
 * zone carrying the X-3 hint; a paste handler on the prompt; the thumbnails in a list named X-25, each thumbnail an `<img>`
 * whose alt is the user's file name (X-27 for an attached version), each with a remove button named X-14; reasons T-1..T-3 in a
 * `role="alert"` element; a failed attachment offers Retry only for an exhausted retry loop (T-7).
 *
 * NOT here: the pure decision table and boundaries (T22), the pipeline order (T23), the BFF magic-byte check (T9/T17).
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/angular';
import { StudioComposerComponent } from './studio-composer.component';
import {
  renderStudio, byName, t, LABELS, MODEL_LABEL, png, fileOf, imagesBody, expectGenerate, collectUploads, textOf,
  UPLOAD_URL, type Harness,
} from '../../../../../test/image-studio/helpers/studio-render';
import {
  makeSession, decodeRaster, containsBytes, EXIF_MARKER, fromBase64, GIF_MAGIC, padTo,
} from '../../../../../test/image-studio/helpers/fakes';
import { StorageQuotaError } from '../../../../utils/image-studio/ports';

const EMPTY = () => makeSession('s0');
const attachBtn = () => byName.button(t('X-2', 'en'));
const fileInput = (h: Harness) => h.view.container.querySelector('input[type="file"]') as HTMLInputElement;
const thumbs = () => within(screen.getByRole('list', { name: t('X-25', 'en') })).queryAllByRole('listitem');
const alertsText = () => screen.queryAllByRole('alert').map((a) => textOf(a)).join(' | ');

async function attach(h: Harness, files: File[], uris?: string[]) {
  for (const f of files) await h.user.upload(fileInput(h), f);
  const reqs = await collectUploads(h, files.length);
  reqs.forEach((r, i) => r.flush({ fileUri: uris?.[i] ?? `files/f${i + 1}`, mimeType: 'image/png' }));
  await h.settle();
  return reqs;
}

describe('AC-1 / FR-8 / FR-73 / AC-45: three ways in, one list; a keyboard-operable control', () => {
  it('AC-45 / FR-73: the control is a real <button> and a real <input type="file">; Enter on the focused button opens the file input', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    const btn = attachBtn();
    expect(btn.tagName).toBe('BUTTON');
    const input = fileInput(h);
    expect(input.type).toBe('file');
    const opened = { n: 0 };
    input.addEventListener('click', () => { opened.n += 1; });
    btn.focus();
    expect(document.activeElement).toBe(btn);
    await h.user.keyboard('{Enter}');
    expect(opened.n).toBe(1);
  });

  it('AC-45 / FR-73: Space on the focused button also opens the file input', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    const input = fileInput(h);
    const opened = { n: 0 };
    input.addEventListener('click', () => { opened.n += 1; });
    attachBtn().focus();
    await h.user.keyboard(' ');
    expect(opened.n).toBe(1);
  });

  it('AC-1 / FR-8: attaching through the file input shows a thumbnail named after the file and issues exactly one upload POST', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await h.user.upload(fileInput(h), fileOf('mug.png', png()));
    expect(await screen.findByAltText('mug.png')).toBeDefined();
    const reqs = await collectUploads(h, 1);
    expect(reqs[0].request.method).toBe('POST');
    expect(Object.keys(reqs[0].request.body)).toEqual(['data']);
    reqs[0].flush({ fileUri: 'files/f1', mimeType: 'image/png' });
    await h.settle();
    h.http.expectNone(UPLOAD_URL);
  });

  it('AC-1 / FR-8: dropping a file on the drop zone attaches it through the same path (thumbnail + one upload)', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    const zone = screen.getByText(t('X-3', 'en'));
    fireEvent.drop(zone, { dataTransfer: { files: [fileOf('dropped.png', png())], types: ['Files'] } });
    expect(await screen.findByAltText('dropped.png')).toBeDefined();
    const reqs = await collectUploads(h, 1);
    reqs[0].flush({ fileUri: 'files/d1', mimeType: 'image/png' });
    await h.settle();
  });

  it('AC-1 / FR-8: pasting an image (Ctrl+V) into the prompt attaches it through the same path', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    const file = fileOf('pasted.png', png());
    fireEvent.paste(byName.textarea('en'), {
      clipboardData: { files: [file], types: ['Files'], items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }] },
    });
    expect(await screen.findByAltText('pasted.png')).toBeDefined();
    const reqs = await collectUploads(h, 1);
    reqs[0].flush({ fileUri: 'files/p1', mimeType: 'image/png' });
    await h.settle();
  });

  it('FR-8 failure path: a dropped item that is not a supported image is rejected with T-1 and the images already attached stay', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await attach(h, [fileOf('ok.png', png())]);
    const zone = screen.getByText(t('X-3', 'en'));
    fireEvent.drop(zone, { dataTransfer: { files: [fileOf('notes.png', new TextEncoder().encode('plain text, not an image'))], types: ['Files'] } });
    await h.settle();
    expect(alertsText()).toContain(t('T-1', 'en'));
    expect(thumbs()).toHaveLength(1);
    expect(screen.getByAltText('ok.png')).toBeDefined();
  });
});

describe('AC-6 / FR-14: thumbnails before sending, removable one by one', () => {
  it('AC-6 / FR-14: two thumbnails; removing the first leaves the second', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await attach(h, [fileOf('a.png', png()), fileOf('b.png', png())]);
    expect(thumbs()).toHaveLength(2);
    await h.user.click(within(thumbs()[0]).getByRole('button', { name: t('X-14', 'en') }));
    await h.settle();
    expect(thumbs()).toHaveLength(1);
    expect(screen.queryByAltText('a.png')).toBeNull();
    expect(screen.getByAltText('b.png')).toBeDefined();
  });

  it('FR-14 / FR-18: a removed attachment is not part of the outbound turn', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await attach(h, [fileOf('a.png', png()), fileOf('b.png', png())], ['files/A', 'files/B']);
    await h.user.click(within(thumbs()[0]).getByRole('button', { name: t('X-14', 'en') }));
    await h.user.type(byName.textarea('en'), 'compose');
    await h.user.click(byName.button(t('X-1', 'en')));
    const req = expectGenerate(h);
    const files = req.request.body.newTurn.parts.filter((p: any) => p.fileData).map((p: any) => p.fileData.fileUri);
    expect(files).toEqual(['files/B']);
    req.flush(imagesBody());
    await h.settle();
  });
});

describe('FR-18 / D-34: an images-only message is valid', () => {
  it('FR-18: with one ready attachment and an empty prompt Send is enabled and the outbound turn holds the file part and NO text part', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await attach(h, [fileOf('only.png', png())], ['files/only']);
    const send = byName.button(t('X-1', 'en')) as HTMLButtonElement;
    expect(send.disabled).toBe(false);
    await h.user.click(send);
    const req = expectGenerate(h);
    expect(req.request.body.newTurn.parts).toEqual([{ fileData: { fileUri: 'files/only', mimeType: 'image/png' } }]);
    req.flush(imagesBody());
    await h.settle();
  });

  it('FR-18 / DD-17: Send stays disabled while any thumbnail is still uploading and enables when the upload finishes', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await h.user.type(byName.textarea('en'), 'with image');
    await h.user.upload(fileInput(h), fileOf('slow.png', png()));
    await screen.findByAltText('slow.png');
    expect(screen.getByText(t('X-23', 'en'))).toBeDefined();
    expect((byName.button(t('X-1', 'en')) as HTMLButtonElement).disabled).toBe(true);
    const [req] = await collectUploads(h, 1);
    req.flush({ fileUri: 'files/slow', mimeType: 'image/png' });
    await h.settle();
    expect((byName.button(t('X-1', 'en')) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText(t('X-23', 'en'))).toBeNull();
  });
});

describe('FR-10 / AC-3: at most five uploads; the attached version is outside the five', () => {
  it('AC-3 / FR-10: a 6th upload is refused with T-3 (en) and the five already attached remain', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await attach(h, [1, 2, 3, 4, 5].map((n) => fileOf(`i${n}.png`, png())));
    expect(thumbs()).toHaveLength(5);
    await h.user.upload(fileInput(h), fileOf('i6.png', png()));
    await h.settle();
    expect(alertsText()).toContain('You can attach no more than 5 images to one message.');
    expect(thumbs()).toHaveLength(5);
    expect(screen.queryByAltText('i6.png')).toBeNull();
    h.http.expectNone(UPLOAD_URL);
  });

  it('FR-10 / FR-15: the same refusal reads T-3 in Ukrainian under uk', async () => {
    const h = await renderStudio(StudioComposerComponent, { lang: 'uk', sessions: [EMPTY()] });
    const input = fileInput(h);
    for (const n of [1, 2, 3, 4, 5]) await h.user.upload(input, fileOf(`i${n}.png`, png()));
    (await collectUploads(h, 5)).forEach((r, i) => r.flush({ fileUri: `files/${i}`, mimeType: 'image/png' }));
    await h.settle();
    await h.user.upload(input, fileOf('i6.png', png()));
    await h.settle();
    expect(alertsText()).toContain('До одного повідомлення можна додати не більше 5 зображень.');
  });

  it('FR-10 (OD-28 C-28.1): 5 uploads PLUS an attached version are accepted; the 6th upload is still refused', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    // A model switch with a version and an empty composer seeds a new session with the latest version attached (FR-50).
    await h.user.selectOptions(byName.select('X-6', 'en'), MODEL_LABEL.pro);
    await screen.findByAltText(t('X-27', 'en', { n: 1 }));
    await attach(h, [1, 2, 3, 4, 5].map((n) => fileOf(`u${n}.png`, png())));
    expect(thumbs()).toHaveLength(6); // five uploads + the attached version
    await h.user.upload(fileInput(h), fileOf('u6.png', png()));
    await h.settle();
    expect(alertsText()).toContain(t('T-3', 'en'));
    expect(thumbs()).toHaveLength(6);
  });

  it('FR-37 (N-3) / FR-14: removing the attached version thumbnail leaves the message without it', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    await h.user.selectOptions(byName.select('X-6', 'en'), MODEL_LABEL.pro);
    const seed = await screen.findByAltText(t('X-27', 'en', { n: 1 }));
    await h.user.click(within(seed.closest('li') as HTMLElement).getByRole('button', { name: t('X-14', 'en') }));
    await h.settle();
    expect(screen.queryByAltText(t('X-27', 'en', { n: 1 }))).toBeNull();
    expect(thumbs()).toHaveLength(0);
  });
});

describe('FR-15 / AC-7: a rejected file shows its reason and keeps the rest', () => {
  it('AC-7 / FR-15 / FR-9 (T-1): non-image bytes under an image name are refused with T-1; the earlier attachment stays and no upload is made', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await attach(h, [fileOf('good.png', png())]);
    await h.user.upload(fileInput(h), fileOf('fake.png', new TextEncoder().encode('this is plain text'), 'image/png'));
    await h.settle();
    expect(alertsText()).toContain(t('T-1', 'en'));
    expect(screen.getByAltText('good.png')).toBeDefined();
    expect(thumbs()).toHaveLength(1);
    h.http.expectNone(UPLOAD_URL);
  });

  it('AC-2 / FR-15 (T-1): a GIF is refused with T-1 whatever its extension', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await h.user.upload(fileInput(h), fileOf('anim.png', padTo(GIF_MAGIC, 64), 'image/png'));
    await h.settle();
    expect(alertsText()).toContain('Unsupported file format. Allowed formats: PNG, JPG, WEBP.');
    expect(thumbs()).toHaveLength(0);
    h.http.expectNone(UPLOAD_URL);
  });

  it('FR-11 / FR-13 (T-1): a file the codec cannot decode is refused with T-1 whatever its size', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()], codec: { probeFails: true } });
    await h.user.upload(fileInput(h), fileOf('broken.png', png()));
    await h.settle();
    expect(alertsText()).toContain(t('T-1', 'en'));
    expect(thumbs()).toHaveLength(0);
    h.http.expectNone(UPLOAD_URL);
  });

  it('AC-4 / AC-7 / D-7 (T-2): a result over 5 242 880 B after the re-encode is refused with T-2 and nothing is uploaded', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()], codec: { outputSize: 5_242_881 } });
    await h.user.upload(fileInput(h), fileOf('big.png', png(1000, 800, 4096)));
    await h.settle();
    expect(alertsText()).toContain('File is too large: the maximum size is 5 MB.');
    expect(thumbs()).toHaveLength(0);
    h.http.expectNone(UPLOAD_URL);
  });

  it('AC-5 (plumbing only, W-2): the bytes handed to the upload are the codec output - no EXIF marker - never the raw file', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    const raw = png();
    expect(containsBytes(raw, EXIF_MARKER)).toBe(true); // premise: the camera original carries GPS bytes
    await h.user.upload(fileInput(h), fileOf('gps.png', raw));
    const [req] = await collectUploads(h, 1);
    const sent = fromBase64(req.request.body.data);
    expect(containsBytes(sent, EXIF_MARKER)).toBe(false);
    expect(decodeRaster(sent)?.format).toBe('png');
    req.flush({ fileUri: 'files/gps', mimeType: 'image/png' });
    await h.settle();
  });
});

describe('FR-16 / DD-17: upload states and Retry (T35)', () => {
  it('FR-16 / T-7: an exhausted retry loop (502 UPSTREAM_RETRIES_EXHAUSTED) marks the attachment failed, shows T-7 and offers Retry on it', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await h.user.upload(fileInput(h), fileOf('flaky.png', png()));
    const [req] = await collectUploads(h, 1);
    req.flush({ error: 'UPSTREAM_RETRIES_EXHAUSTED' }, { status: 502, statusText: 'Bad Gateway' });
    await h.settle();
    expect(alertsText()).toContain(t('T-7', 'en'));
    const item = thumbs()[0];
    expect(within(item).getByRole('button', { name: LABELS.en.retry })).toBeDefined();
    // S11 site (was L279): a failed upload with a blank prompt leaves nothing to send, so the disabled button reads "Write a prompt to start".
    expect((byName.button(t('X-29', 'en')) as HTMLButtonElement).disabled).toBe(true);
  });

  it('FR-16: Retry on a failed attachment issues a new upload POST and, once answered, the attachment is ready (no Retry left)', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await h.user.upload(fileInput(h), fileOf('flaky.png', png()));
    (await collectUploads(h, 1))[0].flush({ error: 'UPSTREAM_RETRIES_EXHAUSTED' }, { status: 502, statusText: 'Bad Gateway' });
    await h.settle();
    await h.user.click(within(thumbs()[0]).getByRole('button', { name: LABELS.en.retry }));
    const [again] = await collectUploads(h, 1);
    again.flush({ fileUri: 'files/ok', mimeType: 'image/png' });
    await h.settle();
    expect(within(thumbs()[0]).queryByRole('button', { name: LABELS.en.retry })).toBeNull();
  });

  it('FR-16: a non-retryable upload failure (400) shows "API error" (T-12) with NO Retry button, and the attachment can be removed', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await h.user.upload(fileInput(h), fileOf('bad.png', png()));
    (await collectUploads(h, 1))[0].flush({ error: 'Помилка API' }, { status: 400, statusText: 'Bad Request' });
    await h.settle();
    expect(alertsText()).toContain(t('T-12', 'en'));
    expect(within(thumbs()[0]).queryByRole('button', { name: LABELS.en.retry })).toBeNull();
    await h.user.click(within(thumbs()[0]).getByRole('button', { name: t('X-14', 'en') }));
    await h.settle();
    expect(thumbs()).toHaveLength(0);
  });

  it('FR-5 / FR-16: a missing key (501 GEMINI_KEY_MISSING) on upload shows T-11 without any Retry', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await h.user.upload(fileInput(h), fileOf('nokey.png', png()));
    (await collectUploads(h, 1))[0].flush({ error: 'GEMINI_KEY_MISSING' }, { status: 501, statusText: 'Not Implemented' });
    await h.settle();
    expect(alertsText()).toContain('Gemini API key is required for Image Studio');
    expect(alertsText()).not.toMatch(/API_KEY/);
    expect(within(thumbs()[0]).queryByRole('button', { name: LABELS.en.retry })).toBeNull();
  });
});

describe('FR-81 / D-28 / OD-37: a failing sent-bytes store while attaching', () => {
  it('FR-81 / D-28: attaching three files while the sent-bytes store throws a quota error gives exactly ONE native alert (T-20) and the uploads still happen', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    h.sessionStore.failSentBytes(new StorageQuotaError('quota'));
    await attach(h, [fileOf('a.png', png()), fileOf('b.png', png()), fileOf('c.png', png())], ['files/a', 'files/b', 'files/c']);
    expect(h.alerts.messages).toEqual([t('T-20', 'en')]);
    expect(thumbs()).toHaveLength(3);
    // Neither a role=alert element nor a role=status update (CF-13); the attachments are not flagged failed.
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    for (const li of thumbs()) expect(within(li).queryByRole('button', { name: LABELS.en.retry })).toBeNull();
  });

  it('FR-81 / OD-37 C-37.4: the attachment is still sent normally in the generate request', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    h.sessionStore.failSentBytes(new StorageQuotaError('quota'));
    await attach(h, [fileOf('a.png', png())], ['files/a']);
    await h.user.type(byName.textarea('en'), 'use it');
    await h.user.click(byName.button(t('X-1', 'en')));
    const req = expectGenerate(h);
    expect(req.request.body.newTurn.parts.filter((p: any) => p.fileData).map((p: any) => p.fileData.fileUri)).toEqual(['files/a']);
    req.flush(imagesBody());
    await h.settle();
  });

  it('FR-16 / SD-24: when the store works, the sent bytes (not the raw file) are kept per file URI for a later FILE_MISSING recovery', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await attach(h, [fileOf('a.png', png())], ['files/a']);
    await waitForSentBytes(h, 's0', 'files/a');
  });

  it('FR-81 (uk): the alert text is the Ukrainian T-20 under uk', async () => {
    const h = await renderStudio(StudioComposerComponent, { lang: 'uk', sessions: [EMPTY()] });
    h.sessionStore.failSentBytes(new StorageQuotaError('quota'));
    await attach(h, [fileOf('a.png', png())]);
    expect(h.alerts.messages).toEqual(['Не вдалося зберегти у сховищі браузера: перевищено квоту. Звільніть місце у сховищі браузера та спробуйте ще раз.']);
  });
});

async function waitForSentBytes(h: Harness, sessionId: string, uri: string) {
  await vi.waitFor(() => {
    expect(h.sessionStore.snapshot().sentBytes[sessionId] ?? []).toContain(uri);
  });
  const stored = await h.sessionStore.getSentBytes(sessionId, uri);
  expect(stored).not.toBeNull();
  expect(containsBytes(stored!.bytes, EXIF_MARKER)).toBe(false);
  expect(decodeRaster(stored!.bytes)?.format).toBe('png');
}

// ---------------------------------------------------------------------------------------------------------------------
// US-10.5 T35 - Ctrl+Enter and the label with attachments (Specification FR-17, owner ruling SQ-1-B).
// The images-only tests above (L138-150: ready upload, blank prompt, click Send, outbound turn with no text part) are KEPT unchanged: their
// button lookup is dictionary-bound (X-1), so it follows the new text "Generate" by itself (D-2: "only the lookup name changes").
// ---------------------------------------------------------------------------------------------------------------------
describe('US-10.5 FR-17: a blank prompt with attachments - label, enablement and Ctrl+Enter (T35)', () => {
  const chord = '{Control>}{Enter}{/Control}';

  it('a blank prompt with a ready upload reads "Generate" (not "Write a prompt to start") and is enabled', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await attach(h, [fileOf('only.png', png())], ['files/only']);
    expect((screen.getByRole('button', { name: LABELS.en.generate }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('button', { name: LABELS.en.writePrompt })).toBeNull();
  });

  it('Ctrl+Enter with a blank prompt and a ready upload sends the images-only turn exactly as a click does (file part, no text part)', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await attach(h, [fileOf('only.png', png())], ['files/only']);
    await h.user.click(byName.textarea('en'));
    await h.user.keyboard(chord);
    const req = expectGenerate(h);
    expect(req.request.body.newTurn.parts).toEqual([{ fileData: { fileUri: 'files/only', mimeType: 'image/png' } }]);
    req.flush(imagesBody());
    await h.settle();
  });

  it('while an attachment is still uploading the blank-prompt button reads "Write a prompt to start" and Ctrl+Enter sends nothing', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await h.user.upload(fileInput(h), fileOf('slow.png', png()));
    await screen.findByAltText('slow.png');
    expect((byName.button(LABELS.en.writePrompt) as HTMLButtonElement).disabled).toBe(true);
    await h.user.click(byName.textarea('en'));
    await h.user.keyboard(chord);
    await h.settle();
    h.http.expectNone('/api/image-studio/generate');
    const [req] = await collectUploads(h, 1);
    req.flush({ fileUri: 'files/slow', mimeType: 'image/png' });
    await h.settle();
  });

  it('typed text with an uploading attachment keeps the label "Generate" but the button stays disabled and Ctrl+Enter sends nothing', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await h.user.type(byName.textarea('en'), 'with image');
    await h.user.upload(fileInput(h), fileOf('slow.png', png()));
    await screen.findByAltText('slow.png');
    expect((byName.button(LABELS.en.generate) as HTMLButtonElement).disabled).toBe(true);
    await h.user.keyboard(chord);
    await h.settle();
    h.http.expectNone('/api/image-studio/generate');
    const [req] = await collectUploads(h, 1);
    req.flush({ fileUri: 'files/slow', mimeType: 'image/png' });
    await h.settle();
  });
});


// ---------------------------------------------------------------------------------------------------------------------
// US-10.6 T34 - the Product / Style ref toggle on each uploaded-image thumbnail, its two rejection alerts, and the sentence in the request
// (FR-10, FR-11, FR-12, FR-13; AC-6, AC-7, AC-8, AC-9; owner rulings: the label is an INTERACTIVE TOGGLE BUTTON on uploaded-image thumbnails only (not on the attached version, SM-3 i),
// SM-4 i, SM-2 after, UA copy as proposed).
// PINNED DOM CONTRACT: every ready upload's <li> holds a <button> whose accessible name is the CURRENT role label - "Product" (X-48) or "Style ref" (X-49); clicking it switches the image
// between the two roles; the rejection of a second Style ref (X-61) and of a change to Product beyond five Product uploads (X-62) is shown in a role="alert" element - never in a
// role="status"; the attached "Edit this" version's <li> has no such button.
// ---------------------------------------------------------------------------------------------------------------------
describe('AC-6 / AC-7 / AC-8: the role toggle on an uploaded thumbnail (T34)', () => {
  const productLabel = (lang: 'en' | 'uk' = 'en') => t('X-48', lang);
  const styleLabel = (lang: 'en' | 'uk' = 'en') => t('X-49', lang);
  const toggleOf = (li: HTMLElement, name: string) => within(li).getByRole('button', { name });
  async function attachN(h: Harness, n: number) {
    const files = Array.from({ length: n }, (_, i) => fileOf(`img${i + 1}.png`, png(64, 48, 2048 + i)));
    await attach(h, files, files.map((_, i) => `files/f${i + 1}`));
  }

  it('AC-6: each newly attached image is Product - its thumbnail carries a button named "Product"', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await attachN(h, 2);
    expect(thumbs()).toHaveLength(2);
    for (const li of thumbs()) expect(toggleOf(li, productLabel())).toBeDefined();
  });

  it('AC-6: clicking the toggle makes the image Style ref (the button is then named "Style ref") and clicking again returns it to Product', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await attachN(h, 1);
    await h.user.click(toggleOf(thumbs()[0], productLabel()));
    expect(toggleOf(thumbs()[0], styleLabel())).toBeDefined();
    expect((h.store.draft() as any).attachments[0].role).toBe('style-ref');
    await h.user.click(toggleOf(thumbs()[0], styleLabel()));
    expect(toggleOf(thumbs()[0], productLabel())).toBeDefined();
  });

  it('AC-7: marking a SECOND image as Style ref is rejected with the explanatory message in role="alert", and the first stays marked', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await attachN(h, 2);
    await h.user.click(toggleOf(thumbs()[0], productLabel()));
    await h.user.click(toggleOf(thumbs()[1], productLabel()));
    expect(alertsText()).toContain('Only one image can be a style reference per generation.');
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('status')).toHaveLength(0);
    expect(toggleOf(thumbs()[0], styleLabel())).toBeDefined();
    expect(toggleOf(thumbs()[1], productLabel())).toBeDefined();
  });

  it('AC-7: removing the Style ref image makes the role available again for the other image', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await attachN(h, 2);
    await h.user.click(toggleOf(thumbs()[0], productLabel()));
    await h.user.click(within(thumbs()[0]).getByRole('button', { name: t('X-14', 'en') }));
    await h.user.click(toggleOf(thumbs()[0], productLabel()));
    expect(toggleOf(thumbs()[0], styleLabel())).toBeDefined();
  });

  it('AC-8: five Product uploads plus one Style ref are accepted together (six uploads), and a further Product upload is refused as today (T-3)', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await attachN(h, 5);
    await h.user.click(toggleOf(thumbs()[4], productLabel()));
    const fresh = fileOf('sixth.png', png(64, 48, 3000));
    await h.user.upload(fileInput(h), fresh);
    const reqs = await collectUploads(h, 1);
    reqs[0].flush({ fileUri: 'files/f6', mimeType: 'image/png' });
    await h.settle();
    expect(thumbs()).toHaveLength(6);
    await h.user.upload(fileInput(h), fileOf('seventh.png', png(64, 48, 3100)));
    await h.settle();
    expect(alertsText()).toContain(t('T-3', 'en'));
    expect(thumbs()).toHaveLength(6);
    h.http.expectNone(UPLOAD_URL);
  });

  it('AC-8 / FR-12: with five Products and one Style ref, changing the Style ref to Product is rejected in role="alert" ("You can attach no more than 5 product images.") and the image stays Style ref', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await attachN(h, 5);
    await h.user.click(toggleOf(thumbs()[4], productLabel()));
    await h.user.upload(fileInput(h), fileOf('sixth.png', png(64, 48, 3000)));
    const reqs = await collectUploads(h, 1);
    reqs[0].flush({ fileUri: 'files/f6', mimeType: 'image/png' });
    await h.settle();
    await h.user.click(toggleOf(thumbs()[4], styleLabel()));
    expect(alertsText()).toContain('You can attach no more than 5 product images.');
    expect(toggleOf(thumbs()[4], styleLabel())).toBeDefined();
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('SM-3 i: the attached "Edit this" version has no Product / Style ref button', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    await h.store.editVersion(1);
    await h.settle();
    const list = screen.getByRole('list', { name: t('X-25', 'en') });
    const li = within(list).getAllByRole('listitem')[0];
    expect(within(li).queryByRole('button', { name: productLabel() })).toBeNull();
    expect(within(li).queryByRole('button', { name: styleLabel() })).toBeNull();
  });

  it('UA copy: the toggle reads "Товар" and "Референс стилю"', async () => {
    const h = await renderStudio(StudioComposerComponent, { lang: 'uk', sessions: [EMPTY()] });
    await h.user.upload(fileInput(h), fileOf('a.png', png()));
    const reqs = await collectUploads(h, 1);
    reqs[0].flush({ fileUri: 'files/f1', mimeType: 'image/png' });
    await h.settle();
    await h.user.click(toggleOf(thumbs()[0], 'Товар'));
    expect(toggleOf(thumbs()[0], 'Референс стилю')).toBeDefined();
  });
});

describe('AC-9 / FR-13 / SM-4 i: sending with a Style ref image (T34)', () => {
  async function twoImages(h: Harness) {
    const files = [fileOf('product.png', png(64, 48, 2048)), fileOf('style.png', png(64, 48, 2049))];
    await attach(h, files, ['files/p', 'files/s']);
  }

  it('SM-4 i: a draft whose only content is a Style ref image cannot be sent - the send button stays disabled (label "Write a prompt to start")', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await h.user.upload(fileInput(h), fileOf('style.png', png()));
    const reqs = await collectUploads(h, 1);
    reqs[0].flush({ fileUri: 'files/s', mimeType: 'image/png' });
    await h.settle();
    await h.user.click(within(thumbs()[0]).getByRole('button', { name: t('X-48', 'en') }));
    expect((byName.button(t('X-29', 'en')) as HTMLButtonElement).disabled).toBe(true);
  });

  it('AC-9 / SM-2: the outbound turn is text, product image, Style ref image, then the AC-9 sentence - the sentence immediately AFTER the Style ref image, no role on any part', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await twoImages(h);
    await h.user.click(within(thumbs()[1]).getByRole('button', { name: t('X-48', 'en') }));
    await h.user.type(byName.textarea('en'), 'a mug');
    await h.user.click(byName.button(t('X-1', 'en')));
    const parts = (expectGenerate(h).request.body as { newTurn: { parts: Array<Record<string, any>> } }).newTurn.parts;
    expect(parts.map((p) => p['text'] ?? p['fileData']?.fileUri)).toEqual([
      'a mug', 'files/p', 'files/s', 'Use this image purely as a stylistic reference, do not copy the product from it',
    ]);
    for (const part of parts) expect(Object.keys(part)).not.toContain('role');
  });
});
