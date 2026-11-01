/**
 * image-studio-contract.spec.ts - US-10.1 T3 (FR-19, FR-24, FR-61, SD-1, SD-2, NFR-13, DD-1).
 *
 * The closed values both runtimes need - the error-code -> status map (SD-2), the aspect ratios (FR-19), the
 * resolutions and the response kinds (SD-1) - live in ONE file, `image-studio-contract.json`, read by Node
 * through an import attribute and by the client through the typed accessors of `image-studio-contract.ts`
 * (DD-1: a single source prevents drift; a parity test only detects it).
 *
 * PINNED CONTRACT (the plan names the files, not the accessor names; the builder follows these):
 *   JSON  { "errorCodes": { "<CODE>": <status number> | null }, "aspectRatios": string[],
 *           "resolutions": string[], "responseKinds": string[] }
 *         (`null` only for UPSTREAM_RETRIES_EXHAUSTED, whose status is the original upstream status.)
 *   TS    ERROR_CODES: readonly string[]            every closed code, in JSON order
 *         statusOf(code): number | null              throws for an unknown code (no silent default)
 *         isErrorCode(x: unknown): boolean
 *         codesForStatus(status: number): string[]   the BFF codes that carry that status
 *         ASPECT_RATIOS, RESOLUTIONS, RESPONSE_KINDS: readonly string[]
 *         isAspectRatio(x), isResolution(x), isResponseKind(x): boolean
 *
 * Not asserted: the 30 MB / 18 MB / retry / rate-limit values (they are server-only constants, T5) and the
 * 120 s deadline (client-only, T33): this file must hold ONLY what both runtimes read (plan DD-1).
 *
 * Coverage: src/prompt-core/** carries the 95/95/85/95 floors (NFR-13), so every accessor and both branches
 * of each guard (known / unknown input) are exercised.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const readJson = (): any => JSON.parse(readFileSync(resolve(process.cwd(), 'src/prompt-core/image-studio-contract.json'), 'utf8'));

/** SD-2 / FR-61, verbatim. */
const SD2: Record<string, number | null> = {
  CONTENT_LENGTH_REQUIRED: 411,
  REQUEST_BODY_TOO_LARGE: 413,
  PROTECTED_HISTORY_EXCEEDS_LIMIT: 413,
  FILE_MISSING: 410,
  RATE_LIMIT_EXCEEDED: 429,
  GEMINI_KEY_MISSING: 501,
  UNSUPPORTED_IMAGE_TYPE: 415,
  INVALID_REQUEST: 400,
  EMPTY_RESPONSE: 502,
  PRICE_NOT_CONFIGURED: 500,
  UPSTREAM_RETRIES_EXHAUSTED: null,
};

describe('image-studio-contract.json (DD-1, SD-1, SD-2, FR-19)', () => {
  it('SD-2 / FR-61: maps every closed code to exactly its status, and contains no other code', () => {
    const json = readJson();
    expect(json.errorCodes).toEqual(SD2);
  });

  it('SD-2: every reserved upstream status (410, 411, 413, 501) is carried by at least one BFF code', () => {
    const json = readJson();
    for (const status of [410, 411, 413, 501]) {
      const carriers = Object.entries(json.errorCodes).filter(([, s]) => s === status).map(([c]) => c);
      expect(carriers.length, `status ${status}`).toBeGreaterThan(0);
    }
  });

  it('FR-19: lists exactly the six aspect ratios, in the Story order', () => {
    expect(readJson().aspectRatios).toEqual(['1:1', '4:3', '3:4', '4:5', '16:9', '9:16']);
  });

  it('FR-19: lists the resolutions 1K, 2K, 4K', () => {
    expect(readJson().resolutions).toEqual(['1K', '2K', '4K']);
  });

  it('SD-1 / FR-24: the response kinds are exactly images, text, safety', () => {
    expect(readJson().responseKinds).toEqual(['images', 'text', 'safety']);
  });

  it('DD-1: holds only closed shared values - no BFF-only limit and no client deadline leaked into the shared file', () => {
    expect(Object.keys(readJson()).sort()).toEqual(['aspectRatios', 'errorCodes', 'resolutions', 'responseKinds']);
  });
});

describe('image-studio-contract.ts typed accessors (FR-61, SD-2, NFR-13)', () => {
  it('SD-2: ERROR_CODES lists every closed code and agrees with the JSON file', async () => {
    const m = await load('./image-studio-contract');
    expect([...m.ERROR_CODES].sort()).toEqual(Object.keys(SD2).sort());
    expect([...m.ERROR_CODES]).toEqual(Object.keys(readJson().errorCodes));
  });

  it('SD-2: statusOf returns the SD-2 status for every code', async () => {
    const m = await load('./image-studio-contract');
    for (const [code, status] of Object.entries(SD2)) {
      expect(m.statusOf(code), code).toBe(status);
    }
  });

  it('FR-61: statusOf throws for an unknown code instead of returning a default', async () => {
    const m = await load('./image-studio-contract');
    expect(() => m.statusOf('NOT_A_CODE')).toThrow();
    expect(() => m.statusOf('')).toThrow();
    expect(() => m.statusOf(undefined)).toThrow();
    // a case variant of a real code is still not a closed code
    expect(() => m.statusOf('file_missing')).toThrow();
  });

  it('FR-61: isErrorCode accepts only closed codes and rejects upstream-ish strings and non-strings', async () => {
    const m = await load('./image-studio-contract');
    expect(m.isErrorCode('FILE_MISSING')).toBe(true);
    expect(m.isErrorCode('UPSTREAM_RETRIES_EXHAUSTED')).toBe(true);
    expect(m.isErrorCode('Помилка API')).toBe(false);
    expect(m.isErrorCode('')).toBe(false);
    expect(m.isErrorCode(410)).toBe(false);
    expect(m.isErrorCode(null)).toBe(false);
    expect(m.isErrorCode(undefined)).toBe(false);
  });

  it('FR-61: codesForStatus finds the BFF code(s) of a status; 413 has two distinct codes; an unreserved status has none', async () => {
    const m = await load('./image-studio-contract');
    expect(m.codesForStatus(410)).toEqual(['FILE_MISSING']);
    expect(m.codesForStatus(411)).toEqual(['CONTENT_LENGTH_REQUIRED']);
    expect(m.codesForStatus(501)).toEqual(['GEMINI_KEY_MISSING']);
    expect([...m.codesForStatus(413)].sort()).toEqual(['PROTECTED_HISTORY_EXCEEDS_LIMIT', 'REQUEST_BODY_TOO_LARGE']);
    expect(m.codesForStatus(418)).toEqual([]);
  });

  it('FR-19: ASPECT_RATIOS and RESOLUTIONS equal the specified lists and the JSON file', async () => {
    const m = await load('./image-studio-contract');
    expect([...m.ASPECT_RATIOS]).toEqual(['1:1', '4:3', '3:4', '4:5', '16:9', '9:16']);
    expect([...m.RESOLUTIONS]).toEqual(['1K', '2K', '4K']);
    expect([...m.ASPECT_RATIOS]).toEqual(readJson().aspectRatios);
    expect([...m.RESOLUTIONS]).toEqual(readJson().resolutions);
  });

  it('SD-1: RESPONSE_KINDS is exactly the three kinds', async () => {
    const m = await load('./image-studio-contract');
    expect([...m.RESPONSE_KINDS]).toEqual(['images', 'text', 'safety']);
  });

  it('FR-19: isAspectRatio / isResolution / isResponseKind accept members and reject everything else', async () => {
    const m = await load('./image-studio-contract');
    for (const r of ['1:1', '4:3', '3:4', '4:5', '16:9', '9:16']) expect(m.isAspectRatio(r), r).toBe(true);
    for (const r of ['2:3', '21:9', '1x1', '', 1, null]) expect(m.isAspectRatio(r), String(r)).toBe(false);
    for (const r of ['1K', '2K', '4K']) expect(m.isResolution(r), r).toBe(true);
    for (const r of ['8K', '1k', '', 1024, undefined]) expect(m.isResolution(r), String(r)).toBe(false);
    for (const k of ['images', 'text', 'safety']) expect(m.isResponseKind(k), k).toBe(true);
    for (const k of ['image', 'error', '', null]) expect(m.isResponseKind(k), String(k)).toBe(false);
  });
});
