// @vitest-environment node
/**
 * file-missing.spec.ts - US-10.1 T13 (FR-17, FR-61): the FILE_MISSING recogniser.
 *
 * FR-17: the BFF answers 410 FILE_MISSING only for the CONJUNCTION of (1) the request carried a `file_uri`, (2) the upstream
 * error is of the class check V-2 establishes for a missing file, (3) the error itself names a file resource. "It is not
 * any 404." The class is recorded in docs/evidence/US-10.1-pre-implementation-checks.md, Check V-2: upstream HTTP 404 whose
 * body names `files/...` / "File not found or has expired".
 *
 * PINNED CONTRACT (server/image-studio/file-missing.js, ESM; imports NO SDK symbol - Rule 1, DD-28 d):
 *   export function isFileMissing({ requestCarriedFileUri: boolean, status: number, message: string }): boolean
 *   - `status` / `message` are plain values read from the upstream error by the caller (message may be the SDK ApiError's
 *     JSON-string message); the result is a strict boolean, so no upstream text can flow into a browser-facing field.
 * The recorded status set lives in server/image-studio/constants.js as `FILE_MISSING_STATUSES` (T13 modifies it).
 */
import { describe, it, expect } from 'vitest';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const MODULE = '../../server/image-studio/file-missing.js';

const V2_MESSAGE = 'File not found or has expired: files/nonexistent123';
const V2_SDK_JSON = JSON.stringify({ error: { code: 404, message: V2_MESSAGE, status: 'NOT_FOUND' } });
const MODEL_NOT_FOUND = 'models/gemini-3.1-flash-image is not found for API version v1beta, or is not supported for generateContent.';

describe('isFileMissing - the FR-17 conjunction', () => {
  it('FR-17 / V-2: a 404 naming files/... on a request that carried a file_uri is a missing file', async () => {
    const { isFileMissing } = await load(MODULE);
    expect(isFileMissing({ requestCarriedFileUri: true, status: 404, message: V2_MESSAGE })).toBe(true);
  });

  it('FR-17 / V-2: the SDK ApiError form (the body serialised into the message) is recognised too', async () => {
    const { isFileMissing } = await load(MODULE);
    expect(isFileMissing({ requestCarriedFileUri: true, status: 404, message: V2_SDK_JSON })).toBe(true);
  });

  it('FR-17: a model-not-found 404 is NOT a missing file, even when the request carried a file_uri', async () => {
    const { isFileMissing } = await load(MODULE);
    expect(isFileMissing({ requestCarriedFileUri: true, status: 404, message: MODEL_NOT_FOUND })).toBe(false);
    expect(isFileMissing({ requestCarriedFileUri: true, status: 404, message: JSON.stringify({ error: { code: 404, message: MODEL_NOT_FOUND, status: 'NOT_FOUND' } }) })).toBe(false);
  });

  it('FR-17: the very same file-missing error on a request that carried NO file_uri is not recognised (condition 1)', async () => {
    const { isFileMissing } = await load(MODULE);
    expect(isFileMissing({ requestCarriedFileUri: false, status: 404, message: V2_MESSAGE })).toBe(false);
  });

  it('FR-17: a bare 404 whose message does not name a file resource is not recognised (condition 3: "not any 404")', async () => {
    const { isFileMissing } = await load(MODULE);
    expect(isFileMissing({ requestCarriedFileUri: true, status: 404, message: 'Not Found' })).toBe(false);
    expect(isFileMissing({ requestCarriedFileUri: true, status: 404, message: '' })).toBe(false);
  });

  it('FR-17 / FR-61: a "Files API" mention in an unrelated 400 is passed through, not recognised', async () => {
    const { isFileMissing } = await load(MODULE);
    expect(isFileMissing({ requestCarriedFileUri: true, status: 400, message: 'Invalid argument: the Files API request is malformed (files/abc)' })).toBe(false);
    expect(isFileMissing({ requestCarriedFileUri: true, status: 400, message: V2_MESSAGE })).toBe(false);
  });

  it('FR-17 / FR-61: a status outside the recorded V-2 class is never recognised - 410, 403, 429, 500, 501 with a file-naming message', async () => {
    const { isFileMissing } = await load(MODULE);
    for (const status of [400, 403, 410, 413, 429, 500, 501, 503]) {
      expect(isFileMissing({ requestCarriedFileUri: true, status, message: V2_MESSAGE }), String(status)).toBe(false);
    }
  });

  it('FR-17: missing or odd inputs never throw and are not recognised', async () => {
    const { isFileMissing } = await load(MODULE);
    expect(isFileMissing({ requestCarriedFileUri: true, status: 404 } as any)).toBe(false);
    expect(isFileMissing({ requestCarriedFileUri: true, status: undefined, message: V2_MESSAGE } as any)).toBe(false);
    expect(isFileMissing({} as any)).toBe(false);
  });

  it('FR-61: the result is a strict boolean, so no upstream text can reach a browser-facing field through the recogniser', async () => {
    const { isFileMissing } = await load(MODULE);
    for (const input of [
      { requestCarriedFileUri: true, status: 404, message: V2_MESSAGE },
      { requestCarriedFileUri: true, status: 404, message: MODEL_NOT_FOUND },
      { requestCarriedFileUri: false, status: 500, message: 'secret upstream detail' },
    ]) {
      expect(typeof isFileMissing(input)).toBe('boolean');
    }
  });

  it('FR-17 / V-2: the recorded status set in constants.js is exactly the 404 class of the evidence record', async () => {
    const constants = await load('../../server/image-studio/constants.js');
    expect([...constants.FILE_MISSING_STATUSES]).toEqual([404]);
  });
});
