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
    // US-10.6 T2 (OD-16 closed table, FR-4 / FR-9 (a) / FR-21): the three closed lists the Story adds are shared values both runtimes read.
    expect(Object.keys(readJson()).sort()).toEqual(['aspectRatios', 'errorCodes', 'imageCounts', 'imageFailureCauses', 'imagePrices', 'resolutions', 'responseKinds']);
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

/**
 * US-10.6 T2 - the shared contract gains imageCounts, imageFailureCauses and imagePrices (FR-4, FR-9 (a), FR-21, FR-22, AC-3, AC-5, AC-14, AC-14a).
 *
 * PINNED CONTRACT (the plan names the three JSON keys and says "typed accessors"; the accessor names are fixed here):
 *   JSON  imageCounts: number[]                       exactly [1, 2, 4]
 *         imageFailureCauses: string[]                exactly ["safety", "empty", "retries_exhausted", "file_missing"] (no "text" member)
 *         imagePrices: { "<model id>": { "<resolution>": <usd per image> } }
 *   TS    IMAGE_COUNTS, IMAGE_FAILURE_CAUSES: readonly arrays equal to the JSON
 *         IMAGE_PRICES: the imagePrices object (same content as the JSON)
 *
 * VALUES: pinned from the owner's OD-2 ruling of 2026-11-14 (evidence docs/evidence/US-10.6-vendor-facts-evidence.md v1); the other cases assert STRUCTURE
 * (which pairs have a price, positive finite numbers, 4K above 1K and 2K - AC-14a).
 */
const IMAGE_CATALOGUE = (): Array<{ id: string; resolutions: string[] }> =>
  (JSON.parse(readFileSync(resolve(process.cwd(), 'src/prompt-core/model-catalog.json'), 'utf8')) as any).providers
    .flatMap((p: any) => p.models)
    .filter((m: any) => (m.modalities ?? []).includes('image'))
    .map((m: any) => ({ id: m.id, resolutions: m.resolutions }));

describe('image-studio-contract.json: the US-10.6 lists (T2)', () => {
  it('FR-4 / AC-3: imageCounts is exactly [1, 2, 4]', () => {
    expect(readJson().imageCounts).toEqual([1, 2, 4]);
  });

  it('FR-9 (a) / AC-5: imageFailureCauses is exactly the four cause classes and has no "text" member', () => {
    expect(readJson().imageFailureCauses).toEqual(['safety', 'empty', 'retries_exhausted', 'file_missing']);
  });

  it('FR-22 / AC-14a: imagePrices has an entry for every (model, resolution) pair the catalogue allows, and for no other pair', () => {
    const prices = readJson().imagePrices ?? {};
    const catalogue = IMAGE_CATALOGUE();
    expect(catalogue.length).toBeGreaterThanOrEqual(2);
    expect(Object.keys(prices).sort()).toEqual(catalogue.map((m) => m.id).sort());
    for (const model of catalogue) {
      expect(Object.keys(prices[model.id] ?? {}).sort(), model.id).toEqual([...model.resolutions].sort());
    }
  });

  it('FR-22: every price is a positive finite number of dollars per image', () => {
    const prices = readJson().imagePrices ?? {};
    expect(Object.keys(prices).length).toBeGreaterThan(0);
    for (const [model, byRes] of Object.entries<Record<string, unknown>>(prices)) {
      for (const [resolution, unit] of Object.entries(byRes)) {
        expect(typeof unit, `${model} ${resolution}`).toBe('number');
        expect(Number.isFinite(unit as number) && (unit as number) > 0, `${model} ${resolution}`).toBe(true);
      }
    }
  });

  it('OD-2 (owner ruling 2026-11-14): imagePrices holds exactly the accepted USD-per-generated-image values - Flash 1K 0.067 / 2K 0.101, Pro 1K 0.134 / 2K 0.134 / 4K 0.24', () => {
    expect(readJson().imagePrices).toEqual({
      'gemini-3.1-flash-image': { '1K': 0.067, '2K': 0.101 },
      'gemini-3-pro-image': { '1K': 0.134, '2K': 0.134, '4K': 0.24 },
    });
  });

  it('AC-14a: for every model that offers 4K, the 4K price is greater than the 1K price and greater than the 2K price', () => {
    const prices = readJson().imagePrices ?? {};
    const with4k = IMAGE_CATALOGUE().filter((m) => m.resolutions.includes('4K'));
    expect(with4k.length).toBeGreaterThan(0);
    for (const model of with4k) {
      const byRes = prices[model.id] ?? {};
      expect(byRes['4K'], `${model.id} 4K above 1K`).toBeGreaterThan(byRes['1K']);
      expect(byRes['4K'], `${model.id} 4K above 2K`).toBeGreaterThan(byRes['2K']);
    }
  });

  it('FR-23 / AC-15: the pinned errorCodes table is unchanged - no new error code is introduced by this Story [characterization]', () => {
    expect(readJson().errorCodes).toEqual(SD2);
  });
});

describe('image-studio-contract.ts: the US-10.6 accessors (T2)', () => {
  it('FR-4: IMAGE_COUNTS equals the JSON list [1, 2, 4]', async () => {
    const m = await load('./image-studio-contract');
    expect([...(m.IMAGE_COUNTS ?? [])]).toEqual([1, 2, 4]);
    expect([...(m.IMAGE_COUNTS ?? [])]).toEqual(readJson().imageCounts);
  });

  it('FR-9 (a): IMAGE_FAILURE_CAUSES equals the JSON list', async () => {
    const m = await load('./image-studio-contract');
    expect([...(m.IMAGE_FAILURE_CAUSES ?? [])]).toEqual(['safety', 'empty', 'retries_exhausted', 'file_missing']);
  });

  it('FR-21: IMAGE_PRICES carries the same content the server reads from the JSON (one source, no second copy)', async () => {
    const m = await load('./image-studio-contract');
    expect(m.IMAGE_PRICES).toBeDefined();
    expect(m.IMAGE_PRICES).toEqual(readJson().imagePrices);
  });
});
