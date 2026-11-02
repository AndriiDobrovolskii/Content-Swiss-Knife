// @vitest-environment node
/**
 * magic-bytes.parity.spec.ts - US-10.1 T21 (FR-9, DD-20).
 *
 * The client detector (TypeScript, src/utils/image-studio/magic-bytes.ts) and the BFF detector (JavaScript,
 * server/image-studio/magic-bytes.js) are two implementations of one four-line rule. A parity test is the agreed way to
 * keep them in step (DD-20): ONE shared fixture table (MAGIC_FIXTURES, helpers/fakes.ts) is run against both and the
 * results must be equal fixture by fixture, including every reject (GIF, truncated headers, RIFF that is not WEBP,
 * empty, text).
 *
 * PINNED CONTRACT: both modules export `detectImageType(bytes: Uint8Array): 'image/png' | 'image/jpeg' | 'image/webp' | null`.
 * The server module is the T9 deliverable; if it exports the function under another name (`detectImageMime`) the test
 * still resolves it, and fails with a clear message when neither exists.
 */
import { describe, it, expect } from 'vitest';
import { MAGIC_FIXTURES } from './helpers/fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

async function detectors() {
  const client = await load('../../src/utils/image-studio/magic-bytes');
  const server = await load('../../server/image-studio/magic-bytes.js');
  const serverFn = server.detectImageType ?? server.detectImageMime;
  if (typeof serverFn !== 'function') throw new Error('server/image-studio/magic-bytes.js must export detectImageType(bytes)');
  if (typeof client.detectImageType !== 'function') throw new Error('src/utils/image-studio/magic-bytes.ts must export detectImageType(bytes)');
  return { client: client.detectImageType as (b: Uint8Array) => string | null, server: serverFn as (b: Uint8Array) => string | null };
}

describe('client and BFF magic-byte detectors agree (FR-9)', () => {
  it.each(MAGIC_FIXTURES.map((f) => [f.name, f] as const))('FR-9 parity: %s gives the same verdict in both detectors, and it is the specified one', async (_name, fixture) => {
    const { client, server } = await detectors();
    const c = client(fixture.bytes);
    const s = server(fixture.bytes);
    expect(s).toBe(c);
    expect(c).toBe(fixture.expected);
  });

  it('FR-9 parity: the fixture table covers both accepted and rejected cases (guards against an empty or one-sided table)', () => {
    expect(MAGIC_FIXTURES.filter((f) => f.expected !== null).map((f) => f.expected)).toEqual(
      expect.arrayContaining(['image/png', 'image/jpeg', 'image/webp']),
    );
    expect(MAGIC_FIXTURES.filter((f) => f.expected === null).length).toBeGreaterThanOrEqual(5);
  });
});
