/**
 * error-dispatch.spec.ts - US-10.1 T31 (FR-47, FR-52, FR-61, FR-68, FR-83; SD-2, SD-13, SD-26, SD-31, PD-25, D-2).
 *
 * The client dispatches on status AND code (the BFF `{ error: string }` envelope value), never on status alone, and it
 * never renders a code: it maps each closed code to a fixed studio text id (the Specification ids T-n, SD-13).
 *
 * PINNED CONTRACT (src/utils/image-studio/error-dispatch.ts):
 *   dispatchError(input: { status: number; errorField?: string; retryAfterSeconds?: number }): {
 *     textId: string;            // 'T-1' .. 'T-14' (key of STUDIO_TEXTS)
 *     retry: boolean;            // true => the UI offers a Retry button
 *     blocked: boolean;          // true only for 413 + PROTECTED_HISTORY_EXCEEDS_LIMIT (FR-47)
 *     reupload: boolean;         // true only for 410 + FILE_MISSING (FR-17; the runner owns the re-upload)
 *     region: 'alert' | 'status';// FR-83: every error is role="alert"; never role="status"
 *     retryAfterSeconds?: number;// passed through unchanged when the input carries it (429 RATE_LIMIT_EXCEEDED, FR-68)
 *   }
 *   status 0 = transport failure / no response. errorField undefined = no JSON envelope (bare proxy 502/503/504, Express's
 *   own non-JSON 413 ...). The function is pure and total (any input yields an outcome).
 *
 * Deliberately NOT asserted: the 120 s timeout T-6, a Cancel T-18 and a quota failure T-20 - those are not HTTP errors and
 * are produced by the runner/store, not by this table.
 */
import { describe, it, expect } from 'vitest';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

interface Row { name: string; status: number; errorField?: string; textId: string; retry: boolean; blocked?: boolean; reupload?: boolean }

/** FR-61 table, row by row (status, closed code) -> SD-13 text id and Retry. */
const BFF_ROWS: Row[] = [
  { name: 'body over 30 MB', status: 413, errorField: 'REQUEST_BODY_TOO_LARGE', textId: 'T-8', retry: false },
  { name: 'no Content-Length', status: 411, errorField: 'CONTENT_LENGTH_REQUIRED', textId: 'T-12', retry: false },
  { name: 'protected remainder over the limits', status: 413, errorField: 'PROTECTED_HISTORY_EXCEEDS_LIMIT', textId: 'T-14', retry: false, blocked: true },
  { name: 'expired file', status: 410, errorField: 'FILE_MISSING', textId: 'T-10', retry: false, reupload: true },
  { name: 'rate limit', status: 429, errorField: 'RATE_LIMIT_EXCEEDED', textId: 'T-13', retry: false },
  { name: 'missing key', status: 501, errorField: 'GEMINI_KEY_MISSING', textId: 'T-11', retry: false },
  { name: 'unsupported image bytes', status: 415, errorField: 'UNSUPPORTED_IMAGE_TYPE', textId: 'T-1', retry: false },
  { name: 'invalid request', status: 400, errorField: 'INVALID_REQUEST', textId: 'T-12', retry: false },
  { name: 'empty or truncated 200', status: 502, errorField: 'EMPTY_RESPONSE', textId: 'T-5', retry: true },
  { name: 'paid generation with no price', status: 500, errorField: 'PRICE_NOT_CONFIGURED', textId: 'T-12', retry: false },
];

describe('FR-61 / SD-13: every BFF closed code maps to exactly one outcome', () => {
  for (const row of BFF_ROWS) {
    it(`FR-61: ${row.status} ${row.errorField} (${row.name}) -> ${row.textId}, retry ${row.retry}`, async () => {
      const { dispatchError } = await load('./error-dispatch');
      const out = dispatchError({ status: row.status, errorField: row.errorField });
      expect(out.textId).toBe(row.textId);
      expect(out.retry).toBe(row.retry);
      expect(out.blocked).toBe(row.blocked ?? false);
      expect(out.reupload).toBe(row.reupload ?? false);
    });
  }

  for (const status of [429, 500, 502, 503, 504]) {
    it(`FR-60 / FR-61: ${status} UPSTREAM_RETRIES_EXHAUSTED (original upstream status) -> T-7 with Retry`, async () => {
      const { dispatchError } = await load('./error-dispatch');
      const out = dispatchError({ status, errorField: 'UPSTREAM_RETRIES_EXHAUSTED' });
      expect([out.textId, out.retry, out.blocked, out.reupload]).toEqual(['T-7', true, false, false]);
    });
  }

  it('FR-61: the ten status+code rows plus the exhausted code all produce a defined outcome (no code falls through unmapped)', async () => {
    const { dispatchError } = await load('./error-dispatch');
    for (const row of BFF_ROWS) {
      const out = dispatchError({ status: row.status, errorField: row.errorField });
      expect(typeof out.textId, row.errorField).toBe('string');
      expect(out.textId, row.errorField).toMatch(/^T-\d+[a-d]?$/);
    }
  });
});

describe('FR-52: 413 is dispatched on the code, both cases side by side', () => {
  it('FR-52 / PD-25: 413 REQUEST_BODY_TOO_LARGE is generic T-8, no Retry, not blocked', async () => {
    const { dispatchError } = await load('./error-dispatch');
    const out = dispatchError({ status: 413, errorField: 'REQUEST_BODY_TOO_LARGE' });
    expect([out.textId, out.retry, out.blocked]).toEqual(['T-8', false, false]);
  });

  it('FR-52 / FR-47: 413 PROTECTED_HISTORY_EXCEEDS_LIMIT is the blocked state T-14, no Retry', async () => {
    const { dispatchError } = await load('./error-dispatch');
    const out = dispatchError({ status: 413, errorField: 'PROTECTED_HISTORY_EXCEEDS_LIMIT' });
    expect([out.textId, out.retry, out.blocked]).toEqual(['T-14', false, true]);
  });

  it('FR-52 / PD-25: Express\'s own non-JSON 413 (no code) is the generic T-8 without Retry and is NOT the blocked state', async () => {
    const { dispatchError } = await load('./error-dispatch');
    const out = dispatchError({ status: 413 });
    expect([out.textId, out.retry, out.blocked]).toEqual(['T-8', false, false]);
  });

  it('FR-52: a 413 carrying an unknown error string is also the generic T-8', async () => {
    const { dispatchError } = await load('./error-dispatch');
    expect(dispatchError({ status: 413, errorField: 'something else' }).textId).toBe('T-8');
  });
});

describe('FR-52 / FR-68: 429 has two different outcomes', () => {
  it('FR-68: RATE_LIMIT_EXCEEDED (T-13, no Retry) differs from UPSTREAM_RETRIES_EXHAUSTED (T-7, Retry) for the same status 429', async () => {
    const { dispatchError } = await load('./error-dispatch');
    const limit = dispatchError({ status: 429, errorField: 'RATE_LIMIT_EXCEEDED', retryAfterSeconds: 1800 });
    const exhausted = dispatchError({ status: 429, errorField: 'UPSTREAM_RETRIES_EXHAUSTED' });
    expect([limit.textId, limit.retry]).toEqual(['T-13', false]);
    expect([exhausted.textId, exhausted.retry]).toEqual(['T-7', true]);
    expect(limit).not.toEqual(exhausted);
  });

  it('FR-68 / SD-16: the retry interval of the 429 rejection is passed through unchanged', async () => {
    const { dispatchError } = await load('./error-dispatch');
    expect(dispatchError({ status: 429, errorField: 'RATE_LIMIT_EXCEEDED', retryAfterSeconds: 1234 }).retryAfterSeconds).toBe(1234);
  });
});

describe('FR-61 / FR-17 / SD-31: a reserved upstream status without its BFF code is not a BFF signal', () => {
  const reserved: Array<{ status: number; code: string; label: string }> = [
    { status: 410, code: 'FILE_MISSING', label: 'FILE_MISSING' },
    { status: 411, code: 'CONTENT_LENGTH_REQUIRED', label: 'CONTENT_LENGTH_REQUIRED' },
    { status: 501, code: 'GEMINI_KEY_MISSING', label: 'GEMINI_KEY_MISSING' },
  ];

  for (const r of reserved) {
    it(`FR-61: bare ${r.status} (no envelope code) is the generic T-12, not ${r.label}`, async () => {
      const { dispatchError } = await load('./error-dispatch');
      const out = dispatchError({ status: r.status });
      expect([out.textId, out.retry, out.blocked, out.reupload]).toEqual(['T-12', false, false, false]);
    });

    it(`FR-61: ${r.status} with the generic envelope text "Помилка API" is the generic T-12, not ${r.label}`, async () => {
      const { dispatchError } = await load('./error-dispatch');
      const out = dispatchError({ status: r.status, errorField: 'Помилка API' });
      expect([out.textId, out.reupload, out.blocked]).toEqual(['T-12', false, false]);
    });
  }

  it('FR-17: a 410 that is not FILE_MISSING never asks for a re-upload', async () => {
    const { dispatchError } = await load('./error-dispatch');
    expect(dispatchError({ status: 410, errorField: 'Помилка API' }).reupload).toBe(false);
    expect(dispatchError({ status: 410 }).reupload).toBe(false);
  });

  it('FR-17: FILE_MISSING with a status other than 410 is not a re-upload signal (status AND code)', async () => {
    const { dispatchError } = await load('./error-dispatch');
    const out = dispatchError({ status: 404, errorField: 'FILE_MISSING' });
    expect(out.reupload).toBe(false);
    expect(out.textId).toBe('T-12');
  });

  it('FR-61: a BFF code on the wrong status is not read as that signal (GEMINI_KEY_MISSING on 500, RATE_LIMIT_EXCEEDED on 500, PROTECTED_HISTORY_EXCEEDS_LIMIT on 400)', async () => {
    const { dispatchError } = await load('./error-dispatch');
    expect(dispatchError({ status: 500, errorField: 'GEMINI_KEY_MISSING' }).textId).toBe('T-12');
    expect(dispatchError({ status: 500, errorField: 'RATE_LIMIT_EXCEEDED' }).textId).toBe('T-12');
    const protectedOn400 = dispatchError({ status: 400, errorField: 'PROTECTED_HISTORY_EXCEEDS_LIMIT' });
    expect(protectedOn400.blocked).toBe(false);
    expect(protectedOn400.textId).toBe('T-12');
  });

  it('FR-61: an upstream 4xx other than 429 carries "Помилка API" with no code -> T-12, no Retry (400, 401, 403, 404)', async () => {
    const { dispatchError } = await load('./error-dispatch');
    for (const status of [400, 401, 403, 404]) {
      const out = dispatchError({ status, errorField: 'Помилка API' });
      expect([out.textId, out.retry], String(status)).toEqual(['T-12', false]);
    }
  });

  it('SD-2: any `error` that is not a closed code renders T-12, the client never renders the code', async () => {
    const { dispatchError } = await load('./error-dispatch');
    expect(dispatchError({ status: 418, errorField: 'I am a teapot' }).textId).toBe('T-12');
    expect(dispatchError({ status: 400, errorField: '' }).textId).toBe('T-12');
  });
});

describe('SD-31 / FR-85: a lost or envelope-less failure is T-7 with a manual Retry', () => {
  for (const status of [0, 500, 502, 503, 504]) {
    it(`SD-31: status ${status} without an { error } envelope -> T-7, Retry offered`, async () => {
      const { dispatchError } = await load('./error-dispatch');
      const out = dispatchError({ status });
      expect([out.textId, out.retry, out.blocked, out.reupload]).toEqual(['T-7', true, false, false]);
    });
  }
});

describe('FR-83: error channel', () => {
  it('FR-83: every outcome is announced through role="alert" (never role="status")', async () => {
    const { dispatchError } = await load('./error-dispatch');
    const inputs = [
      ...BFF_ROWS.map((r) => ({ status: r.status, errorField: r.errorField })),
      { status: 429, errorField: 'UPSTREAM_RETRIES_EXHAUSTED' },
      { status: 0 }, { status: 502 }, { status: 413 }, { status: 404, errorField: 'Помилка API' },
    ];
    for (const input of inputs) {
      expect(dispatchError(input).region, JSON.stringify(input)).toBe('alert');
    }
  });

  it('FR-47: the blocked outcome offers no Retry and is the only outcome with blocked set', async () => {
    const { dispatchError } = await load('./error-dispatch');
    const blocked = BFF_ROWS.filter((r) => dispatchError({ status: r.status, errorField: r.errorField }).blocked);
    expect(blocked.map((r) => r.errorField)).toEqual(['PROTECTED_HISTORY_EXCEEDS_LIMIT']);
  });

  it('SD-26 / FR-61: PRICE_NOT_CONFIGURED shows "Помилка API" (T-12) with no Retry', async () => {
    const { dispatchError } = await load('./error-dispatch');
    const out = dispatchError({ status: 500, errorField: 'PRICE_NOT_CONFIGURED' });
    expect([out.textId, out.retry]).toEqual(['T-12', false]);
  });

  it('D-2 / FR-5: RATE_LIMIT_EXCEEDED and GEMINI_KEY_MISSING offer no Retry', async () => {
    const { dispatchError } = await load('./error-dispatch');
    expect(dispatchError({ status: 429, errorField: 'RATE_LIMIT_EXCEEDED' }).retry).toBe(false);
    expect(dispatchError({ status: 501, errorField: 'GEMINI_KEY_MISSING' }).retry).toBe(false);
  });
});
