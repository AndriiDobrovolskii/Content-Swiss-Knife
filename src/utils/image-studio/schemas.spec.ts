/**
 * schemas.spec.ts - US-10.1 T19 (FR-24, FR-25, FR-45, FR-71, FR-84, D-6, NFR-13).
 *
 * The client-side Zod schemas are the API-boundary and local-storage gate of the studio: a generate response is
 * validated before it enters application state (AC-14: an invalid response is an error, never an empty image),
 * and a record read back from IndexedDB is parsed, with a bad or future-version record IGNORED (not listed, not
 * counted, not deleted).
 *
 * PINNED CONTRACT (the plan names the schemas; the helper names and the over-length rule's carrier are fixed here):
 *   schemas.ts
 *     GenerateResponseSchema        Zod discriminated union on `kind`: 'images' | 'text' | 'safety' (SD-1, wire shapes in
 *                                   CONTRACT.md). `.safeParse(body)` => { success, data | error }.
 *     parseGenerateResponse(body, requestTurnIdCount?: number)
 *                                   => { ok: true, value } | { ok: false, error: string }. Same rules as the schema plus
 *                                   FR-24 "trimmedTurnIds never longer than the number of turn ids the request carried"
 *                                   (a static schema cannot know that number, so the bound is a parameter).
 *     UploadResponseSchema          { fileUri: non-empty string, mimeType: non-empty string }
 *     StoredSessionSchema           the persisted session META record (`sessions` store), schemaVersion: 1
 *     StoredTurnSchema              one persisted turn (`turns` store): id, role 'user'|'model', parts (passthrough)
 *     parseStoredSession(x)         => SessionMeta | null   (null = "ignored": bad shape or unknown schemaVersion; never throws)
 *     parseStoredTurn(x)            => Turn | null
 *   ports.ts
 *     StorageQuotaError             `class extends Error`, `name === 'StorageQuotaError'`
 *
 * Not asserted: the cut guard on PROTECTED turns (it needs the session, so it is T29's apply-response spec), and the
 * server-side validation (T10).
 */
import { describe, it, expect } from 'vitest';
import { makeSession, toBase64, makeRaster, inlineImagePart, textPart, turn } from '../../../test/image-studio/helpers/fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

const PNG = toBase64(makeRaster({ format: 'png', width: 4, height: 4 }));
const IMG = { inlineData: { mimeType: 'image/png', data: PNG } };
const USAGE = { inputTokens: 120, outputTokens: 1290 };
const images = (over: Record<string, unknown> = {}) => ({
  kind: 'images', parts: [IMG], costUsd: 0.03, usage: USAGE, trimmedTurnIds: [], ...over,
});

describe('GenerateResponseSchema - the images variant (FR-24, AC-14)', () => {
  it('FR-24: accepts a well-formed images response and returns the parts, cost and usage unchanged', async () => {
    const { GenerateResponseSchema } = await load('./schemas');
    const r = GenerateResponseSchema.safeParse(images());
    expect(r.success).toBe(true);
    expect(r.data.kind).toBe('images');
    expect(r.data.costUsd).toBe(0.03);
    expect(r.data.usage).toEqual(USAGE);
    expect(r.data.parts).toEqual([IMG]);
    expect(r.data.trimmedTurnIds).toEqual([]);
  });

  it('FR-25 / AC-21: service fields on parts (thought, thoughtSignature, unknown keys) pass through untouched', async () => {
    const { GenerateResponseSchema } = await load('./schemas');
    const parts = [
      { text: 'thinking...', thought: true, thoughtSignature: 'sig-A' },
      { ...IMG, thoughtSignature: 'sig-B', someFutureField: { nested: 1 } },
    ];
    const r = GenerateResponseSchema.safeParse(images({ parts }));
    expect(r.success).toBe(true);
    expect(r.data.parts).toEqual(parts);
  });

  it('FR-24: a free cost of exactly 0 is valid (a response with zero billable images is not malformed)', async () => {
    const { GenerateResponseSchema } = await load('./schemas');
    expect(GenerateResponseSchema.safeParse(images({ costUsd: 0 })).success).toBe(true);
  });

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    ['a negative number', -0.01],
    ['a numeric string', '0.03'],
    ['null', null],
    ['undefined (missing)', undefined],
  ])('FR-24: rejects costUsd = %s (finite non-negative number required)', async (_n, costUsd) => {
    const { GenerateResponseSchema } = await load('./schemas');
    expect(GenerateResponseSchema.safeParse(images({ costUsd })).success).toBe(false);
  });

  it('FR-24: rejects an images response with no parts, with only text parts, or with a missing parts field', async () => {
    const { GenerateResponseSchema } = await load('./schemas');
    expect(GenerateResponseSchema.safeParse(images({ parts: [] })).success).toBe(false);
    expect(GenerateResponseSchema.safeParse(images({ parts: [{ text: 'only words' }] })).success).toBe(false);
    expect(GenerateResponseSchema.safeParse(images({ parts: undefined })).success).toBe(false);
  });

  it('FR-84: a thought image is not a valid image part - a response whose only image is a thought image is rejected as images', async () => {
    const { GenerateResponseSchema } = await load('./schemas');
    const thoughtOnly = [{ ...IMG, thought: true }, { text: 'caption' }];
    expect(GenerateResponseSchema.safeParse(images({ parts: thoughtOnly })).success).toBe(false);
    // but a thought image next to a final image is fine (exactly one valid image part is enough)
    expect(GenerateResponseSchema.safeParse(images({ parts: [{ ...IMG, thought: true }, IMG] })).success).toBe(true);
  });

  it('FR-24: an inline image part must carry a non-empty mime type and data', async () => {
    const { GenerateResponseSchema } = await load('./schemas');
    expect(GenerateResponseSchema.safeParse(images({ parts: [{ inlineData: { mimeType: 'image/png', data: '' } }] })).success).toBe(false);
    expect(GenerateResponseSchema.safeParse(images({ parts: [{ inlineData: { data: PNG } }] })).success).toBe(false);
    expect(GenerateResponseSchema.safeParse(images({ parts: [{ inlineData: { mimeType: 'text/plain', data: PNG } }] })).success).toBe(false);
  });

  it('FR-24: the token usage is part of the images variant - a missing or non-numeric usage is rejected', async () => {
    const { GenerateResponseSchema } = await load('./schemas');
    expect(GenerateResponseSchema.safeParse(images({ usage: undefined })).success).toBe(false);
    expect(GenerateResponseSchema.safeParse(images({ usage: { inputTokens: 'many', outputTokens: 1 } })).success).toBe(false);
  });
});

describe('GenerateResponseSchema - text and safety variants (FR-24, FR-62, FR-63)', () => {
  it('FR-63 / FR-24: accepts the text variant with its text and trimmedTurnIds', async () => {
    const { GenerateResponseSchema } = await load('./schemas');
    const r = GenerateResponseSchema.safeParse({ kind: 'text', text: 'I cannot draw that, but here is a hint.', trimmedTurnIds: ['m1', 'u2'] });
    expect(r.success).toBe(true);
    expect(r.data.kind).toBe('text');
    expect(r.data.trimmedTurnIds).toEqual(['m1', 'u2']);
  });

  it('FR-62 / FR-24: accepts the safety variant carrying the reason string', async () => {
    const { GenerateResponseSchema } = await load('./schemas');
    const r = GenerateResponseSchema.safeParse({ kind: 'safety', reason: 'IMAGE_SAFETY', trimmedTurnIds: [] });
    expect(r.success).toBe(true);
    expect(r.data.reason).toBe('IMAGE_SAFETY');
  });

  it('FR-24: a text variant without text and a safety variant without a reason are rejected', async () => {
    const { GenerateResponseSchema } = await load('./schemas');
    expect(GenerateResponseSchema.safeParse({ kind: 'text', trimmedTurnIds: [] }).success).toBe(false);
    expect(GenerateResponseSchema.safeParse({ kind: 'safety', trimmedTurnIds: [] }).success).toBe(false);
  });
});

describe('GenerateResponseSchema - a 200 matching no variant is an invalid response (FR-24, AC-14)', () => {
  it.each([
    ['an empty object', {}],
    ['null', null],
    ['undefined', undefined],
    ['a string', 'ok'],
    ['an array', []],
    ['a missing kind', { parts: [IMG], costUsd: 0.03, usage: USAGE, trimmedTurnIds: [] }],
    ['an unknown kind', { kind: 'empty', trimmedTurnIds: [] }],
    ['the error envelope', { error: 'Помилка API' }],
    ['the Story-literal snake_case field names', { kind: 'images', parts: [IMG], cost_usd: 0.03, usage: USAGE, trimmed_turn_ids: [] }],
  ])('AC-14: rejects %s - it is surfaced as an error, never as an empty image', async (_n, body) => {
    const { GenerateResponseSchema, parseGenerateResponse } = await load('./schemas');
    expect(GenerateResponseSchema.safeParse(body).success).toBe(false);
    const r = parseGenerateResponse(body, 10);
    expect(r.ok).toBe(false);
    expect(typeof r.error).toBe('string');
    expect(r.error.length).toBeGreaterThan(0);
  });
});

describe('trimmedTurnIds is validated on every variant and fails the WHOLE response (D-6, FR-24, FR-44)', () => {
  const variants: Array<[string, (t: unknown) => Record<string, unknown>]> = [
    ['images', (t) => images({ trimmedTurnIds: t })],
    ['text', (t) => ({ kind: 'text', text: 'hello', trimmedTurnIds: t })],
    ['safety', (t) => ({ kind: 'safety', reason: 'SAFETY', trimmedTurnIds: t })],
  ];

  it.each(variants)('D-6: %s variant - accepts an empty list and a list of non-empty string ids', async (_k, build) => {
    const { GenerateResponseSchema } = await load('./schemas');
    expect(GenerateResponseSchema.safeParse(build([])).success).toBe(true);
    expect(GenerateResponseSchema.safeParse(build(['m1', 'u2'])).success).toBe(true);
  });

  it.each(variants)('D-6: %s variant - rejects a missing list, a non-array, an empty-string id and a non-string id', async (_k, build) => {
    const { GenerateResponseSchema } = await load('./schemas');
    for (const bad of [undefined, null, 'm1', { 0: 'm1' }, [''], ['m1', ''], [1], ['m1', null], [['m1']]]) {
      expect(GenerateResponseSchema.safeParse(build(bad)).success, JSON.stringify(bad)).toBe(false);
    }
  });

  it('D-6: a paid image whose trimmedTurnIds is malformed is NOT shown - the whole response is an error', async () => {
    const { parseGenerateResponse } = await load('./schemas');
    const r = parseGenerateResponse(images({ trimmedTurnIds: [''] }), 5);
    expect(r.ok).toBe(false);
    expect(r.value).toBeUndefined();
  });

  it('FR-24: a list longer than the number of turn ids the request carried fails the whole response', async () => {
    const { parseGenerateResponse } = await load('./schemas');
    expect(parseGenerateResponse(images({ trimmedTurnIds: ['a', 'b', 'c'] }), 2).ok).toBe(false);
    expect(parseGenerateResponse(images({ trimmedTurnIds: ['a', 'b'] }), 2).ok).toBe(true);
    expect(parseGenerateResponse(images({ trimmedTurnIds: ['a'] }), 0).ok).toBe(false);
    expect(parseGenerateResponse(images({ trimmedTurnIds: [] }), 0).ok).toBe(true);
  });

  it('FR-24: parseGenerateResponse returns the validated value on success', async () => {
    const { parseGenerateResponse } = await load('./schemas');
    const r = parseGenerateResponse(images({ trimmedTurnIds: ['m1'] }), 3);
    expect(r.ok).toBe(true);
    expect(r.value.kind).toBe('images');
    expect(r.value.trimmedTurnIds).toEqual(['m1']);
  });
});

describe('UploadResponseSchema (FR-16)', () => {
  it('FR-16: accepts { fileUri, mimeType } and returns them', async () => {
    const { UploadResponseSchema } = await load('./schemas');
    const body = { fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/abc123', mimeType: 'image/png' };
    const r = UploadResponseSchema.safeParse(body);
    expect(r.success).toBe(true);
    expect(r.data).toEqual(body);
  });

  it('FR-16: rejects an empty or missing fileUri, a missing mimeType and a non-object', async () => {
    const { UploadResponseSchema } = await load('./schemas');
    expect(UploadResponseSchema.safeParse({ fileUri: '', mimeType: 'image/png' }).success).toBe(false);
    expect(UploadResponseSchema.safeParse({ mimeType: 'image/png' }).success).toBe(false);
    expect(UploadResponseSchema.safeParse({ fileUri: 'files/x' }).success).toBe(false);
    expect(UploadResponseSchema.safeParse(null).success).toBe(false);
  });
});

describe('stored records (FR-48, FR-71, D-6, P-9): a bad record is ignored, not listed, not deleted, never thrown', () => {
  const meta = () => structuredClone(makeSession('s1', { pairs: 2, costUsd: 0.06 }).meta);

  it('FR-71: a valid session meta parses and keeps cost, version numbering, order and downloaded flags', async () => {
    const { parseStoredSession, StoredSessionSchema } = await load('./schemas');
    const m = meta();
    m.versions[1].downloaded = true;
    expect(StoredSessionSchema.safeParse(m).success).toBe(true);
    expect(parseStoredSession(m)).toEqual(m);
    expect(parseStoredSession(m).costUsd).toBe(0.06);
    expect(parseStoredSession(m).nextVersionNumber).toBe(3);
    expect(parseStoredSession(m).turnOrder).toEqual(['u1', 'm1', 'u2', 'm2']);
  });

  it('P-9: an unknown schemaVersion is ignored (null), so a future version can read what an older one wrote', async () => {
    const { parseStoredSession } = await load('./schemas');
    expect(parseStoredSession({ ...meta(), schemaVersion: 2 })).toBeNull();
    expect(parseStoredSession({ ...meta(), schemaVersion: 0 })).toBeNull();
    const noVersion: any = meta();
    delete noVersion.schemaVersion;
    expect(parseStoredSession(noVersion)).toBeNull();
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'session'],
    ['an array', []],
    ['an empty object', {}],
    ['a numeric lastActivity stored as a string', (m: any) => ({ ...m, lastActivity: '1000' })],
    ['a missing id', (m: any) => ({ ...m, id: undefined })],
    ['an empty id', (m: any) => ({ ...m, id: '' })],
    ['a turnOrder that is not an array', (m: any) => ({ ...m, turnOrder: 'u1,m1' })],
    ['a negative cost', (m: any) => ({ ...m, costUsd: -1 })],
    ['a NaN cost', (m: any) => ({ ...m, costUsd: Number.NaN })],
    ['a version without a number', (m: any) => ({ ...m, versions: [{ ...m.versions[0], number: undefined }] })],
    ['a version with an unsupported input format', (m: any) => ({ ...m, versions: [{ ...m.versions[0], inputFormat: 'image/gif' }] })],
    ['a nextVersionNumber below 1', (m: any) => ({ ...m, nextVersionNumber: 0 })],
  ])('P-9: ignores a record with %s (returns null, does not throw)', async (_n, mutate) => {
    const { parseStoredSession, StoredSessionSchema } = await load('./schemas');
    const input = typeof mutate === 'function' ? (mutate as (m: any) => unknown)(meta()) : mutate;
    expect(() => parseStoredSession(input)).not.toThrow();
    expect(parseStoredSession(input)).toBeNull();
    expect(StoredSessionSchema.safeParse(input).success).toBe(false);
  });

  it('FR-35 / D-18: a stored turn keeps thoughtSignature, thought parts, fileData and inline versions byte-for-byte', async () => {
    const { parseStoredTurn, StoredTurnSchema } = await load('./schemas');
    const t = turn('m1', 'model',
      textPart('thinking', { thought: true, thoughtSignature: 'sig-1' }),
      inlineImagePart('image/png', PNG, { thoughtSignature: 'sig-2', future: [1, 2] }),
      { fileData: { fileUri: 'files/abc', mimeType: 'image/png' } },
    );
    expect(StoredTurnSchema.safeParse(t).success).toBe(true);
    expect(parseStoredTurn(t)).toEqual(t);
  });

  it('P-9: a turn with an unknown role, an empty id or non-array parts is ignored', async () => {
    const { parseStoredTurn } = await load('./schemas');
    expect(parseStoredTurn({ id: 'x', role: 'system', parts: [] })).toBeNull();
    expect(parseStoredTurn({ id: '', role: 'user', parts: [] })).toBeNull();
    expect(parseStoredTurn({ id: 'x', role: 'user', parts: 'hi' })).toBeNull();
    expect(parseStoredTurn(null)).toBeNull();
  });
});

describe('StorageQuotaError (DD-15, FR-81)', () => {
  it('FR-81: is a typed Error subclass the adapter can throw and the store can recognise with instanceof', async () => {
    const { StorageQuotaError } = await load('./ports');
    const e = new StorageQuotaError('quota');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(StorageQuotaError);
    expect(e.name).toBe('StorageQuotaError');
    expect(e.message).toBe('quota');
    expect(new Error('quota')).not.toBeInstanceOf(StorageQuotaError);
  });
});
