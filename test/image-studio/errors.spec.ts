// @vitest-environment node
/**
 * US-10.1 T5 - ImageStudioError over the shared error contract (FR-61, SD-2).
 *
 * PINNED CONTRACT (server/image-studio/errors.js):
 *   new ImageStudioError(code, status?)  - `code` must be one of the closed SD-2 codes, else the constructor throws.
 *       `status` defaults to the contract status of the code; `UPSTREAM_RETRIES_EXHAUSTED` has NO fixed status (it carries the
 *       original upstream 429 / 5xx), so omitting it throws and a non-429/non-5xx status throws.
 *       Instances are `Error`s with `.code`, `.status`, `.message === code` and `.body === { error: code }`.
 *   statusForCode(code)                  - the contract status, or undefined for UPSTREAM_RETRIES_EXHAUSTED; throws for an unknown code.
 *   isBffSignal(status, code)            - true ONLY when the pair is a BFF signal: the code is a closed code AND the status is the
 *       one the contract gives it (UPSTREAM_RETRIES_EXHAUSTED: any 429 or 5xx). A reserved status without its code (an upstream
 *       410 / 411 / 413 / 501) is never a BFF signal, and a code without its status is not either.
 */
import { describe, it, expect } from 'vitest';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

// SD-2, verbatim.
const CONTRACT: Array<[string, number]> = [
  ['CONTENT_LENGTH_REQUIRED', 411],
  ['REQUEST_BODY_TOO_LARGE', 413],
  ['PROTECTED_HISTORY_EXCEEDS_LIMIT', 413],
  ['FILE_MISSING', 410],
  ['RATE_LIMIT_EXCEEDED', 429],
  ['GEMINI_KEY_MISSING', 501],
  ['UNSUPPORTED_IMAGE_TYPE', 415],
  ['INVALID_REQUEST', 400],
  ['EMPTY_RESPONSE', 502],
  ['PRICE_NOT_CONFIGURED', 500],
];

describe('ImageStudioError', () => {
  it('FR-61 / SD-2: each closed code defaults to its contract status and exposes a { error: code } body', async () => {
    const { ImageStudioError } = await load('../../server/image-studio/errors.js');
    for (const [code, status] of CONTRACT) {
      const e = new ImageStudioError(code);
      expect(e, code).toBeInstanceOf(Error);
      expect(e.code, code).toBe(code);
      expect(e.status, code).toBe(status);
      expect(e.message, code).toBe(code);
      expect(e.body, code).toEqual({ error: code });
    }
  });

  it('FR-61: an explicit status equal to the contract status is accepted', async () => {
    const { ImageStudioError } = await load('../../server/image-studio/errors.js');
    const e = new ImageStudioError('FILE_MISSING', 410);
    expect(e.status).toBe(410);
  });

  it('FR-61: a code with a status that is not its contract status is refused (never recognised by one half of the pair)', async () => {
    const { ImageStudioError } = await load('../../server/image-studio/errors.js');
    expect(() => new ImageStudioError('FILE_MISSING', 404)).toThrow();
    expect(() => new ImageStudioError('GEMINI_KEY_MISSING', 500)).toThrow();
  });

  it('SD-2: an unknown code throws instead of becoming a silent generic error', async () => {
    const { ImageStudioError } = await load('../../server/image-studio/errors.js');
    expect(() => new ImageStudioError('NOT_A_CODE', 400)).toThrow();
    expect(() => new ImageStudioError('', 500)).toThrow();
  });

  it('SD-2: UPSTREAM_RETRIES_EXHAUSTED carries the original upstream status (429 or any 5xx) and requires it', async () => {
    const { ImageStudioError } = await load('../../server/image-studio/errors.js');
    for (const status of [429, 500, 503, 504]) {
      const e = new ImageStudioError('UPSTREAM_RETRIES_EXHAUSTED', status);
      expect(e.status).toBe(status);
      expect(e.body).toEqual({ error: 'UPSTREAM_RETRIES_EXHAUSTED' });
    }
    expect(() => new ImageStudioError('UPSTREAM_RETRIES_EXHAUSTED')).toThrow();
    expect(() => new ImageStudioError('UPSTREAM_RETRIES_EXHAUSTED', 404)).toThrow();
  });
});

describe('statusForCode', () => {
  it('SD-2: returns the contract status of every closed code and undefined for UPSTREAM_RETRIES_EXHAUSTED', async () => {
    const { statusForCode } = await load('../../server/image-studio/errors.js');
    for (const [code, status] of CONTRACT) expect(statusForCode(code), code).toBe(status);
    expect(statusForCode('UPSTREAM_RETRIES_EXHAUSTED')).toBeUndefined();
  });

  it('SD-2: throws for an unknown code', async () => {
    const { statusForCode } = await load('../../server/image-studio/errors.js');
    expect(() => statusForCode('NOPE')).toThrow();
  });
});

describe('isBffSignal - reserved statuses are recognised by status AND code', () => {
  it('FR-61: every (contract status, contract code) pair is a BFF signal', async () => {
    const { isBffSignal } = await load('../../server/image-studio/errors.js');
    for (const [code, status] of CONTRACT) expect(isBffSignal(status, code), code).toBe(true);
    expect(isBffSignal(429, 'UPSTREAM_RETRIES_EXHAUSTED')).toBe(true);
    expect(isBffSignal(503, 'UPSTREAM_RETRIES_EXHAUSTED')).toBe(true);
  });

  it('FR-61 / FR-17: an upstream 410 without the FILE_MISSING code is not the BFF signal', async () => {
    const { isBffSignal } = await load('../../server/image-studio/errors.js');
    expect(isBffSignal(410, undefined)).toBe(false);
    expect(isBffSignal(410, 'Помилка API')).toBe(false);
  });

  it('FR-61 / FR-5: an upstream 501 without GEMINI_KEY_MISSING, and 413 / 411 without their codes, are not BFF signals', async () => {
    const { isBffSignal } = await load('../../server/image-studio/errors.js');
    expect(isBffSignal(501, undefined)).toBe(false);
    expect(isBffSignal(501, 'not implemented')).toBe(false);
    expect(isBffSignal(413, undefined)).toBe(false);
    expect(isBffSignal(411, '')).toBe(false);
  });

  it('FR-52: the two 413 codes are distinct signals and neither is recognised by the status alone', async () => {
    const { isBffSignal } = await load('../../server/image-studio/errors.js');
    expect(isBffSignal(413, 'PROTECTED_HISTORY_EXCEEDS_LIMIT')).toBe(true);
    expect(isBffSignal(413, 'REQUEST_BODY_TOO_LARGE')).toBe(true);
    expect(isBffSignal(413, 'FILE_MISSING')).toBe(false);
  });

  it('FR-61: a closed code on the wrong status is not a BFF signal', async () => {
    const { isBffSignal } = await load('../../server/image-studio/errors.js');
    expect(isBffSignal(404, 'FILE_MISSING')).toBe(false);
    expect(isBffSignal(400, 'RATE_LIMIT_EXCEEDED')).toBe(false);
    expect(isBffSignal(404, 'UPSTREAM_RETRIES_EXHAUSTED')).toBe(false);
  });
});
