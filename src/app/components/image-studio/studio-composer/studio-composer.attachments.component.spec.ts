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

describe('FR-16 / DD-17: upload states and Retry', () => {
  it('FR-16 / T-7: an exhausted retry loop (502 UPSTREAM_RETRIES_EXHAUSTED) marks the attachment failed, shows T-7 and offers Retry on it', async () => {
    const h = await renderStudio(StudioComposerComponent, { sessions: [EMPTY()] });
    await h.user.upload(fileInput(h), fileOf('flaky.png', png()));
    const [req] = await collectUploads(h, 1);
    req.flush({ error: 'UPSTREAM_RETRIES_EXHAUSTED' }, { status: 502, statusText: 'Bad Gateway' });
    await h.settle();
    expect(alertsText()).toContain(t('T-7', 'en'));
    const item = thumbs()[0];
    expect(within(item).getByRole('button', { name: LABELS.en.retry })).toBeDefined();
    expect((byName.button(t('X-1', 'en')) as HTMLButtonElement).disabled).toBe(true);
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
