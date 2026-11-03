// @vitest-environment node
/**
 * US-10.1 T10 - generate / upload request schemas (FR-3, FR-18, FR-19, FR-25, FR-35, AC-8, AC-9, AC-21; plan DD-5).
 *
 * PINNED CONTRACT (server/image-studio/request-schema.js):
 *   parseGenerateRequest(body) -> the validated request, deep-equal to the input when valid (parts are PASSED ON UNMODIFIED,
 *       service fields such as `thought` / `thoughtSignature` and any unknown part field survive); throws an ImageStudioError
 *       { code: 'INVALID_REQUEST', status: 400 } for every violation below. Sync or async both satisfy this spec (it awaits).
 *   parseUploadRequest(body) -> { data } ; throws the same INVALID_REQUEST error when `data` is missing, not a string or empty.
 *   Request shape (FR-25): { model, aspectRatio, resolution, presetId?, history: Turn[], newTurn: { id, parts } }.
 *   Rules asserted: model must be an IMAGE model id of the catalogue (a text id is INVALID_REQUEST, FR-3); aspectRatio in
 *   1:1 4:3 3:4 4:5 16:9 9:16; resolution in 1K 2K 4K and allowed for the model (4K only on Pro, DD-3); presetId matches
 *   ^[a-z0-9][a-z0-9-]{0,63}$ when present; history has even length, alternates roles starting with `user`; every turn id
 *   (history and newTurn) is a non-empty string and unique; newTurn has non-whitespace text OR at least one image part
 *   (`inlineData` or `fileData`) - an images-only turn is valid (OD-46, D-34, V-9).
 * Not asserted: the live API accepting an images-only turn (check V-9 is a human check), part payload validity (base64).
 */
import { describe, it, expect } from 'vitest';
import { turn, textPart, inlineImagePart, filePart } from './helpers/fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const path = '../../server/image-studio/request-schema.js';

const FLASH = 'gemini-3.1-flash-image';
const PRO = 'gemini-3-pro-image';

const base = (over: Record<string, unknown> = {}) => ({
  model: FLASH,
  aspectRatio: '1:1',
  resolution: '1K',
  history: [] as unknown[],
  newTurn: { id: 'n1', parts: [textPart('a white mug on a table')] },
  ...over,
});

async function parse(body: unknown) {
  const { parseGenerateRequest } = await load(path);
  return await parseGenerateRequest(body);
}
async function rejected(body: unknown): Promise<any> {
  const { parseGenerateRequest } = await load(path);
  try { await parseGenerateRequest(body); } catch (e) { return e; }
  throw new Error('expected parseGenerateRequest to throw');
}
function expectInvalid(err: any) {
  expect(err.code).toBe('INVALID_REQUEST');
  expect(err.status).toBe(400);
}

describe('parseGenerateRequest - valid requests', () => {
  it('FR-18 / AC-8: a text-only turn is valid and returned unchanged', async () => {
    const body = base();
    expect(await parse(body)).toEqual(body);
  });

  it('FR-18 / AC-8: text plus an uploaded image (fileData) is valid', async () => {
    const body = base({ newTurn: { id: 'n1', parts: [textPart('make it blue'), filePart('files/abc')] } });
    expect(await parse(body)).toEqual(body);
  });

  it('FR-18 / D-34 / V-9: an images-only turn (no text part at all) is valid', async () => {
    const body = base({ newTurn: { id: 'n1', parts: [filePart('files/abc')] } });
    expect(await parse(body)).toEqual(body);
  });

  it('FR-18 / D-34: an attached version (inline image) with no text is valid', async () => {
    const body = base({ newTurn: { id: 'n1', parts: [inlineImagePart('image/png', 'AAAA')] } });
    expect(await parse(body)).toEqual(body);
  });

  it('FR-18: whitespace-only text WITH an image is valid (the image carries the message)', async () => {
    const body = base({ newTurn: { id: 'n1', parts: [textPart('   '), filePart('files/abc')] } });
    expect(await parse(body)).toEqual(body);
  });

  it('FR-19: every aspect ratio of the list and every resolution allowed for the model is accepted', async () => {
    for (const aspectRatio of ['1:1', '4:3', '3:4', '4:5', '16:9', '9:16']) {
      expect(await parse(base({ aspectRatio }))).toMatchObject({ aspectRatio });
    }
    for (const resolution of ['1K', '2K']) expect(await parse(base({ resolution }))).toMatchObject({ resolution });
    for (const resolution of ['1K', '2K', '4K']) expect(await parse(base({ model: PRO, resolution }))).toMatchObject({ resolution });
  });

  it('FR-25: a valid two-turn history (user, model) followed by a new turn is accepted', async () => {
    const history = [turn('u1', 'user', textPart('white background')), turn('m1', 'model', inlineImagePart('image/png', 'AAAA'))];
    const body = base({ history, newTurn: { id: 'u2', parts: [textPart('softer shadow')] } });
    expect(await parse(body)).toEqual(body);
  });

  it('FR-32: presetId is optional and a valid one is accepted (lowercase letters, digits, hyphen; 1 to 64 characters)', async () => {
    expect(await parse(base())).not.toHaveProperty('presetId');
    for (const presetId of ['white-bg', 'a', '0', 'detail-closeup', `a${'b'.repeat(63)}`]) {
      expect(await parse(base({ presetId }))).toMatchObject({ presetId });
    }
  });
});

describe('parseGenerateRequest - FR-35 parts pass through unmodified', () => {
  it('FR-35 / AC-21: thought, thoughtSignature and unknown part fields survive parsing deep-equal', async () => {
    const modelParts = [
      { text: 'thinking...', thought: true, thoughtSignature: 'SIG-A' },
      { inlineData: { mimeType: 'image/png', data: 'QUJD' }, thoughtSignature: 'SIG-B', vendorExtra: { nested: [1, 2, 3] } },
    ];
    const history = [turn('u1', 'user', textPart('hi', { custom: 'keep-me' })), { id: 'm1', role: 'model', parts: modelParts }];
    const body = base({ history, newTurn: { id: 'u2', parts: [textPart('again'), filePart('files/xyz')] } });
    const out = await parse(body);
    expect(out.history[1].parts).toEqual(modelParts);
    expect(out.history[0].parts[0].custom).toBe('keep-me');
    expect(out).toEqual(body);
  });

  it('FR-35: the parsed request does not alias or mutate the caller\'s body', async () => {
    const body = base({ history: [turn('u1', 'user', textPart('hi')), turn('m1', 'model', textPart('ok', { thoughtSignature: 's' }))] });
    const copy = JSON.parse(JSON.stringify(body));
    await parse(body);
    expect(body).toEqual(copy);
  });
});

describe('parseGenerateRequest - FR-18 empty turns', () => {
  it('FR-18: a new turn with empty parts is INVALID_REQUEST', async () => {
    expectInvalid(await rejected(base({ newTurn: { id: 'n1', parts: [] } })));
  });

  it('FR-18 / D-34: a new turn with only whitespace text and no image is INVALID_REQUEST', async () => {
    for (const text of ['', '   ', '\n\t ']) {
      expectInvalid(await rejected(base({ newTurn: { id: 'n1', parts: [textPart(text)] } })));
    }
  });
});

describe('parseGenerateRequest - ids and history shape', () => {
  it('FR-25: a repeated turn id inside the history is INVALID_REQUEST', async () => {
    const history = [turn('x', 'user', textPart('a')), turn('x', 'model', textPart('b'))];
    expectInvalid(await rejected(base({ history })));
  });

  it('FR-25: a new-turn id equal to a history id is INVALID_REQUEST', async () => {
    const history = [turn('u1', 'user', textPart('a')), turn('m1', 'model', textPart('b'))];
    expectInvalid(await rejected(base({ history, newTurn: { id: 'm1', parts: [textPart('c')] } })));
  });

  it('FR-25: an empty or missing turn id is INVALID_REQUEST', async () => {
    expectInvalid(await rejected(base({ newTurn: { id: '', parts: [textPart('c')] } })));
    expectInvalid(await rejected(base({ newTurn: { parts: [textPart('c')] } })));
    expectInvalid(await rejected(base({ history: [turn('', 'user', textPart('a')), turn('m1', 'model', textPart('b'))] })));
  });

  it('FR-25: a history that starts with a model turn is INVALID_REQUEST', async () => {
    const history = [turn('m1', 'model', textPart('b')), turn('u2', 'user', textPart('a'))];
    expectInvalid(await rejected(base({ history })));
  });

  it('FR-25: an odd-length history is INVALID_REQUEST (the history is always user/model pairs)', async () => {
    expectInvalid(await rejected(base({ history: [turn('u1', 'user', textPart('a'))] })));
    const three = [turn('u1', 'user', textPart('a')), turn('m1', 'model', textPart('b')), turn('u2', 'user', textPart('c'))];
    expectInvalid(await rejected(base({ history: three })));
  });

  it('FR-25: roles that do not alternate are INVALID_REQUEST', async () => {
    const history = [turn('u1', 'user', textPart('a')), turn('u2', 'user', textPart('b'))];
    expectInvalid(await rejected(base({ history })));
  });

  it('FR-25: a body that is not an object, or lacks history / newTurn, is INVALID_REQUEST', async () => {
    expectInvalid(await rejected(null));
    expectInvalid(await rejected('x'));
    const { history, ...noHistory } = base();
    void history;
    expectInvalid(await rejected(noHistory));
    const { newTurn, ...noTurn } = base();
    void newTurn;
    expectInvalid(await rejected(noTurn));
    expectInvalid(await rejected(base({ history: 'nope' })));
  });
});

describe('parseGenerateRequest - model, ratio, resolution, preset', () => {
  it('FR-3: a TEXT model id is INVALID_REQUEST and so is an unknown or missing model', async () => {
    expectInvalid(await rejected(base({ model: 'gemini-3.1-pro-preview' })));
    expectInvalid(await rejected(base({ model: 'claude-sonnet-5-5' })));
    expectInvalid(await rejected(base({ model: 'nope' })));
    expectInvalid(await rejected(base({ model: undefined })));
  });

  it('FR-19: an aspect ratio outside the list is INVALID_REQUEST', async () => {
    for (const aspectRatio of ['2:1', '21:9', '1x1', '', undefined]) {
      expectInvalid(await rejected(base({ aspectRatio })));
    }
  });

  it('FR-19: a resolution outside the list is INVALID_REQUEST', async () => {
    for (const resolution of ['8K', '512', '1k', '', undefined]) {
      expectInvalid(await rejected(base({ resolution })));
    }
  });

  it('FR-19 / DD-3: 4K on Flash is INVALID_REQUEST (a resolution not allowed for its model) while 4K on Pro is accepted', async () => {
    expectInvalid(await rejected(base({ model: FLASH, resolution: '4K' })));
    expect(await parse(base({ model: PRO, resolution: '4K' }))).toMatchObject({ model: PRO, resolution: '4K' });
  });

  it('FR-32: a presetId that does not match ^[a-z0-9][a-z0-9-]{0,63}$ is INVALID_REQUEST (so "|" cannot enter the task label)', async () => {
    const bad = ['', 'White-BG', '-lead', 'has space', 'pipe|inside', 'under_score', `a${'b'.repeat(64)}`, 'ü'];
    for (const presetId of bad) expectInvalid(await rejected(base({ presetId })));
  });
});

describe('parseUploadRequest', () => {
  it('FR-16: { data: base64 } is accepted and returned', async () => {
    const { parseUploadRequest } = await load(path);
    expect(await parseUploadRequest({ data: 'iVBORw0KGgo=' })).toMatchObject({ data: 'iVBORw0KGgo=' });
  });

  it('FR-16: a missing, non-string or empty data field is INVALID_REQUEST (400)', async () => {
    const { parseUploadRequest } = await load(path);
    for (const body of [{}, { data: 5 }, { data: '' }, { data: null }, null, 'x']) {
      let err: any;
      try { await parseUploadRequest(body); } catch (e) { err = e; }
      expect(err, JSON.stringify(body)).toBeDefined();
      expect(err.code).toBe('INVALID_REQUEST');
      expect(err.status).toBe(400);
    }
  });
});
