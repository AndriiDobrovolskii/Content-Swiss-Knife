/**
 * image-studio.store.roles-presets.spec.ts - US-10.6 T29 (attachment roles, the stored Style-ref tag) and T30 (applying a user preset)
 * (FR-10..FR-14, FR-15 (e); AC-6..AC-9, AC-10; owner rulings SM-2 after, SM-3 i, SM-4 i, SM-5 i, G-8 OD-10 (b)(c)).
 *
 * Runner: test:logic, the real ImageStudioStore on `Injector.create` (test/image-studio/helpers/store-harness.ts); no TestBed. Describes end "(T29)" / "(T30)".
 *
 * PINNED CONTRACT (plan 7.2 and 7.4; names in the plan, shapes fixed here):
 *   Attachment gains role: 'product' | 'style-ref' (default 'product'); draft().attachments[i].role
 *   store.setAttachmentRole(id, role): { ok: true } | { ok: false, reason: 'X-61' | 'X-62' }
 *       through attachment-roles.ts: a second Style ref is refused with X-61 and the first stays; a change to Product that would hold six Products is refused
 *       with X-62 and the image stays Style ref; an unknown id changes nothing. It sends nothing and clears nothing.
 *   store.send(): the request's new turn carries the Style-ref sentence IMMEDIATELY AFTER the Style-ref image part, no part carries a role field, and the stored
 *       USER turn gets styleRefPartIndex = the index of that image part (Turn level, OD-10 b/c); a send with no Style ref writes no such field.
 *   store.canSend() is false for a draft whose only content is a Style-ref upload (SM-4 i; the predicate itself is send-state.spec.ts).
 *   store.applyUserPreset(preset): fills the LITERAL saved prompt (no {product} substitution), aspect ratio and resolution; sets the model ONLY while the session has
 *       no version (like applyPreset); marks presetId AND checkedPresetId with the preset id; a stale model or resolution is applied through
 *       checkUserPresetForApply (SM-5 i: fallback to the model's default resolution / the default model), never refused.
 */
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { setupStore, activeSession } from '../../../test/image-studio/helpers/store-harness';
import { makeSession, makeRaster } from '../../../test/image-studio/helpers/fakes';
import { imagesResponse, imagePart, okBody } from '../../../test/image-studio/helpers/core-fixtures';

const FLASH = 'gemini-3.1-flash-image';
const PRO = 'gemini-3-pro-image';
const SENTENCE = 'Use this image purely as a stylistic reference, do not copy the product from it';
const bytes = () => makeRaster({ format: 'png', width: 4, height: 4 });
const entry = (name: string) => ({ fileUri: `files/${name}`, mimeType: 'image/png', fileName: `${name}.png`, bytes: bytes() });
const lastRequest = (llm: any) => llm.generateImage.mock.calls.at(-1)[0];
const emptySession = () => setupStore({ seed: [activeSession(makeSession('a'))] });
const withVersions = (model = FLASH) => setupStore({ seed: [activeSession(makeSession('a', { pairs: 1, model }))] });
const ids = (store: any) => store.draft().attachments.map((a: any) => a.id);
const roles = (store: any) => store.draft().attachments.map((a: any) => a.role);

describe('Store: attachment roles (T29, AC-6, AC-7, AC-8)', () => {
  it('AC-6: a newly attached image is Product', async () => {
    const { store } = await emptySession();
    await store.attach([entry('a'), entry('b')]);
    expect(roles(store)).toEqual(['product', 'product']);
  });

  it('AC-7: marking one image as Style ref works; marking a SECOND is refused with X-61 and the first stays marked', async () => {
    const { store } = await emptySession();
    await store.attach([entry('a'), entry('b')]);
    const [first, second] = ids(store);
    expect(store.setAttachmentRole(first, 'style-ref')).toEqual({ ok: true });
    expect(store.setAttachmentRole(second, 'style-ref')).toEqual({ ok: false, reason: 'X-61' });
    expect(roles(store)).toEqual(['style-ref', 'product']);
  });

  it('AC-7: removing the Style ref image makes the role available again', async () => {
    const { store } = await emptySession();
    await store.attach([entry('a'), entry('b')]);
    const [first, second] = ids(store);
    store.setAttachmentRole(first, 'style-ref');
    store.removeAttachment(first);
    expect(store.setAttachmentRole(second, 'style-ref')).toEqual({ ok: true });
  });

  it('SM-3 i / FR-11: changing the Style ref image back to Product is accepted and frees the role', async () => {
    const { store } = await emptySession();
    await store.attach([entry('a'), entry('b')]);
    const [first, second] = ids(store);
    store.setAttachmentRole(first, 'style-ref');
    expect(store.setAttachmentRole(first, 'product')).toEqual({ ok: true });
    expect(store.setAttachmentRole(second, 'style-ref')).toEqual({ ok: true });
  });

  it('AC-8 / FR-12: five Product uploads plus one Style ref are six uploads in all; changing the Style ref to Product (a sixth Product) is refused with X-62 and the image stays Style ref', async () => {
    const { store } = await emptySession();
    await store.attach([entry('a'), entry('b'), entry('c'), entry('d'), entry('e'), entry('s')]);
    const all = ids(store);
    expect(store.setAttachmentRole(all[5], 'style-ref')).toEqual({ ok: true });
    expect(store.setAttachmentRole(all[5], 'product')).toEqual({ ok: false, reason: 'X-62' });
    expect(roles(store)).toEqual(['product', 'product', 'product', 'product', 'product', 'style-ref']);
  });

  it('FR-12: removing a Product upload makes the change to Product possible again', async () => {
    const { store } = await emptySession();
    await store.attach([entry('a'), entry('b'), entry('c'), entry('d'), entry('e'), entry('s')]);
    const all = ids(store);
    store.setAttachmentRole(all[5], 'style-ref');
    store.removeAttachment(all[0]);
    expect(store.setAttachmentRole(all[5], 'product')).toEqual({ ok: true });
  });

  it('an unknown attachment id changes nothing and reports not ok', async () => {
    const { store } = await emptySession();
    await store.attach([entry('a')]);
    const before = structuredClone(store.draft().attachments);
    expect(store.setAttachmentRole('no-such-id', 'style-ref').ok).toBe(false);
    expect(store.draft().attachments).toEqual(before);
  });

  it('SM-3 i: the attached "Edit this" version is Product and has no role of its own - it is outside the five and does not block a Style ref', async () => {
    const { store } = await withVersions();
    await store.editVersion(1);
    await store.attach([entry('a')]);
    const [only] = ids(store);
    expect(store.draft().attachedVersion).not.toBeNull();
    expect(store.setAttachmentRole(only, 'style-ref')).toEqual({ ok: true });
  });
});

describe('Store: a Style-ref send (T29, AC-9, FR-13, FR-14, SM-2 after, SM-4 i)', () => {
  it('SM-4 i: a draft whose only content is a Style-ref image cannot be sent - canSend is false and send() calls nothing', async () => {
    const { store, llm } = await emptySession();
    await store.attach([entry('s')]);
    store.setAttachmentRole(ids(store)[0], 'style-ref');
    expect(store.canSend()).toBe(false);
    await store.send();
    expect(llm.generateImage).not.toHaveBeenCalled();
  });

  it('AC-9 / SM-2: the request has the AC-9 sentence immediately AFTER the Style ref image part, once; the Product image has none', async () => {
    const { store, llm } = await emptySession();
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse()));
    await store.attach([entry('p'), entry('s')]);
    store.setAttachmentRole(ids(store)[1], 'style-ref');
    store.setDraft({ text: 'a mug' });
    await store.send();
    const parts = lastRequest(llm).newTurn.parts;
    expect(parts.map((p: any) => p.text ?? p.fileData?.fileUri)).toEqual(['a mug', 'files/p', 'files/s', SENTENCE]);
  });

  it('FR-13 (c) / S3: no part of the request carries a role field (an unknown field could make Gemini answer 400)', async () => {
    const { store, llm } = await emptySession();
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse()));
    await store.attach([entry('p'), entry('s')]);
    store.setAttachmentRole(ids(store)[1], 'style-ref');
    store.setDraft({ text: 'a mug' });
    await store.send();
    for (const part of lastRequest(llm).newTurn.parts) expect(Object.keys(part)).not.toContain('role');
  });

  it('AC-9 / FR-14: the stored USER turn keeps the role tag as styleRefPartIndex (the index of the Style ref image part) and the tag is not on any part', async () => {
    const { store, llm } = await emptySession();
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse()));
    await store.attach([entry('p'), entry('s')]);
    store.setAttachmentRole(ids(store)[1], 'style-ref');
    store.setDraft({ text: 'a mug' });
    await store.send();
    const userTurn = store.currentSession().turns.find((t: any) => t.role === 'user');
    expect(userTurn.styleRefPartIndex).toBe(2);
    expect(userTurn.parts[2].fileData.fileUri).toBe('files/s');
    for (const part of userTurn.parts) expect(Object.keys(part)).not.toContain('role');
  });

  it('FR-14: a send with no Style ref image stores no styleRefPartIndex and the next request history carries no tag [characterization]', async () => {
    const { store, llm } = await emptySession();
    llm.generateImage.mockResolvedValue(okBody(imagesResponse()));
    await store.attach([entry('p')]);
    store.setDraft({ text: 'a mug' });
    await store.send();
    const userTurn = store.currentSession().turns.find((t: any) => t.role === 'user');
    expect('styleRefPartIndex' in userTurn).toBe(false);
  });

  it('FR-14 / S3: after a Style-ref send the NEXT request resends that user turn as { id, role, parts } only - the tag never reaches Gemini', async () => {
    const { store, llm } = await emptySession();
    llm.generateImage.mockResolvedValue(okBody(imagesResponse()));
    await store.attach([entry('p'), entry('s')]);
    store.setAttachmentRole(ids(store)[1], 'style-ref');
    store.setDraft({ text: 'a mug' });
    await store.send();
    store.setDraft({ text: 'now softer' });
    await store.send();
    const history = lastRequest(llm).history;
    expect(history).toHaveLength(2);
    expect(Object.keys(history[0]).sort()).toEqual(['id', 'parts', 'role']);
    expect(history[0].parts.map((p: any) => p.text ?? p.fileData?.fileUri)).toEqual(['a mug', 'files/p', 'files/s', SENTENCE]);
  });

  it('a draft attachment role is never persisted: after the send the draft attachments are cleared with their roles', async () => {
    const { store, llm } = await emptySession();
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse()));
    await store.attach([entry('p'), entry('s')]);
    store.setAttachmentRole(ids(store)[1], 'style-ref');
    store.setDraft({ text: 'a mug' });
    await store.send();
    expect(store.draft().attachments).toEqual([]);
  });
});

describe('Store: applying a user preset (T30, AC-10, FR-15 (e), SM-5 i)', () => {
  const preset = (over: Record<string, unknown> = {}) => ({
    id: 'user-lw3x9k', name: 'My mug shot', prompt: 'Photo of {product} on a desk', aspectRatio: '4:5', resolution: '2K', model: PRO, ...over,
  });

  it('AC-10: applies like a registry preset in an empty session - the literal prompt, ratio, resolution and model are filled and the preset is checked', async () => {
    const { store } = await emptySession();
    store.applyUserPreset(preset());
    expect(store.draft()).toMatchObject({ text: 'Photo of {product} on a desk', aspectRatio: '4:5', resolution: '2K', model: PRO, presetId: 'user-lw3x9k', checkedPresetId: 'user-lw3x9k' });
  });

  it('FR-15 (b): the saved prompt is LITERAL - a product name in the composer is not substituted for {product}', async () => {
    const { store } = await emptySession();
    store.setDraft({ productName: 'Ortur H20' });
    store.applyUserPreset(preset());
    expect(store.draft().text).toBe('Photo of {product} on a desk');
  });

  it('US-10.1 FR-28: in a session that already has a version the model is NOT switched by a preset, the other fields are applied', async () => {
    const { store } = await withVersions(FLASH);
    store.applyUserPreset(preset({ model: PRO, resolution: '1K' }));
    expect(store.draft().model).toBe(FLASH);
    expect(store.draft()).toMatchObject({ aspectRatio: '4:5', resolution: '1K', text: 'Photo of {product} on a desk' });
  });

  it('AC-10: the next send carries the user preset id as the wire preset id (the usage taskLabel preset segment)', async () => {
    const { store, llm } = await emptySession();
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse()));
    store.applyUserPreset(preset());
    await store.send();
    expect(lastRequest(llm).presetId).toBe('user-lw3x9k');
    expect(lastRequest(llm).model).toBe(PRO);
  });

  it('plan 7.5 (guard S8): a user preset id never triggers the white-background flow', async () => {
    const { store, llm, background } = await emptySession();
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ parts: [imagePart()] })));
    store.applyUserPreset(preset({ id: 'user-white-bg' }));
    await store.send();
    expect(background.flattenToWhite).not.toHaveBeenCalled();
  });

  it('SM-5 i: a preset whose resolution its model does not offer (Flash with 4K) is applied with that model\'s default resolution, not refused', async () => {
    const { store } = await emptySession();
    store.applyUserPreset(preset({ model: FLASH, resolution: '4K' }));
    expect(store.draft()).toMatchObject({ model: FLASH, resolution: '1K', checkedPresetId: 'user-lw3x9k' });
  });

  it('SM-5 i: a preset whose model is no longer in the catalogue is applied on the default model with its default resolution', async () => {
    const { store } = await emptySession();
    store.applyUserPreset(preset({ model: 'gemini-2-retired-image', resolution: '2K' }));
    expect(store.draft()).toMatchObject({ model: FLASH, resolution: '1K' });
  });

  it('registry presets are unaffected: applyPreset still fills a registry preset and marks its own id [characterization]', async () => {
    const { store } = await emptySession();
    const { PROMPT_PRESETS } = await import('../../prompt-core/prompt-presets');
    store.applyPreset(PROMPT_PRESETS[1]);
    expect(store.draft().checkedPresetId).toBe(PROMPT_PRESETS[1].id);
  });
});
