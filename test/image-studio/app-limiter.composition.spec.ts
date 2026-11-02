// @vitest-environment node
/**
 * app-limiter.composition.spec.ts - US-10.1 T18 (FR-66, FR-67, FR-68, FR-51, NFR-6; plan C4, DD-4, DD-8, R5, R11).
 *
 * The cases of the `createApp` composition that need the REAL generate handler and the REAL limiter, split from
 * create-app.spec.ts (breakdown O-2): the 429 carries CORS headers, a forged X-Forwarded-For does not reset a bucket, two
 * client addresses are isolated, the window resets, and the rejections of the earlier layers are not counted.
 *
 * LOOPBACK, NOT NETWORK (plan R11): the app listens on 127.0.0.1:0 in this process and is called through node:http. The
 * Gemini provider, the clock, sleep, usage sink, price and log are stubs injected through createApp's deps (CONTRACT.md);
 * `mountImageRoutes` is NOT passed, so the real routes (POST /api/image-studio/generate and /upload) are mounted.
 *
 * Client address (FR-66): `req.ip` with `trust proxy` = 1 - with one trusted hop the client is the RIGHTMOST entry of
 * X-Forwarded-For that the (loopback) proxy appended; entries to its LEFT are client-supplied and ignored. With no
 * X-Forwarded-For the client is the socket peer, 127.0.0.1.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { makeFakeClock, PNG_MAGIC, padTo, toBase64 } from './helpers/fakes';
import { makeStubGemini, makeInstantSleep } from './helpers/handler-fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const ORIGIN = 'https://shop.example';
const HOUR = 3_600_000;

let server: http.Server | null = null;
afterEach(async () => {
  if (server) await new Promise<void>((r) => server!.close(() => r()));
  server = null;
});

async function boot() {
  const { createApp } = await load('../../server/app.js');
  const clock = makeFakeClock(10_000_000);
  const gemini = makeStubGemini();
  const insertUsage = vi.fn();
  const app = createApp({
    allowedOrigins: [ORIGIN],
    getGemini: () => gemini,
    hasGeminiKey: () => true,
    now: () => clock.now(),
    sleep: makeInstantSleep().sleep,
    insertUsage,
    price: (_id: string, n: number) => n * 0.03,
    log: () => undefined,
  });
  server = http.createServer(app);
  await new Promise<void>((r) => server!.listen(0, '127.0.0.1', () => r()));
  return { port: (server!.address() as AddressInfo).port, clock, gemini, insertUsage };
}

interface Reply { status: number; headers: http.IncomingHttpHeaders; body: any }
function post(port: number, path: string, payload: unknown, opts: { xff?: string; declareLength?: number } = {}): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const text = opts.declareLength === undefined ? JSON.stringify(payload) : '';
    const headers: Record<string, string | number> = { Origin: ORIGIN, 'Content-Type': 'application/json' };
    headers['Content-Length'] = opts.declareLength ?? Buffer.byteLength(text);
    if (opts.xff) headers['X-Forwarded-For'] = opts.xff;
    const req = http.request({ host: '127.0.0.1', port, method: 'POST', path, headers, agent: false }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let body: any = raw;
        try { body = JSON.parse(raw); } catch { /* non-JSON */ }
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body });
        if (opts.declareLength !== undefined) req.destroy();
      });
    });
    req.on('error', (e) => { if (opts.declareLength === undefined) reject(e); });
    if (opts.declareLength === undefined) { req.write(text); req.end(); } else req.flushHeaders();
  });
}

const generateBody = () => ({
  model: 'gemini-3.1-flash-image', aspectRatio: '1:1', resolution: '1K', history: [],
  newTurn: { id: 'u-new', parts: [{ text: 'white background' }] },
});
const GEN = '/api/image-studio/generate';

/** Sends `n` valid generate requests for one client address and returns their statuses. */
async function burst(port: number, n: number, xff?: string): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push((await post(port, GEN, generateBody(), { xff })).status);
  return out;
}

describe('createApp with the real routes - rate limit composition', () => {
  it('FR-68 / AC-42: the 31st counted request is 429 RATE_LIMIT_EXCEEDED and the rejection carries the CORS headers and Retry-After', async () => {
    const { port } = await boot();
    const statuses = await burst(port, 30, '198.51.100.1');
    expect(statuses.every((s) => s === 200)).toBe(true);
    const refused = await post(port, GEN, generateBody(), { xff: '198.51.100.1' });
    expect(refused.status).toBe(429);
    expect(refused.body).toEqual({ error: 'RATE_LIMIT_EXCEEDED' });
    expect(refused.headers['access-control-allow-origin']).toBe(ORIGIN); // the limiter is mounted after cors()
    expect(Number(refused.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(refused.headers['retry-after'])).toBeLessThanOrEqual(3600);
  });

  it('FR-66: a forged X-Forwarded-For entry does not reset the bucket - only the rightmost hop (the trusted proxy\'s observation) identifies the client', async () => {
    const { port } = await boot();
    await burst(port, 30, '198.51.100.1');
    const forged = await post(port, GEN, generateBody(), { xff: '203.0.113.99, 198.51.100.1' });
    expect(forged.status).toBe(429);
    const forgedMany = await post(port, GEN, generateBody(), { xff: '1.1.1.1, 2.2.2.2, 198.51.100.1' });
    expect(forgedMany.status).toBe(429);
  });

  it('FR-66: two client addresses are isolated - exhausting one bucket leaves the other usable, and the request without X-Forwarded-For is its own bucket', async () => {
    const { port } = await boot();
    await burst(port, 30, '198.51.100.1');
    expect((await post(port, GEN, generateBody(), { xff: '198.51.100.1' })).status).toBe(429);
    expect((await post(port, GEN, generateBody(), { xff: '198.51.100.2' })).status).toBe(200);
    expect((await post(port, GEN, generateBody())).status).toBe(200); // socket peer 127.0.0.1
  });

  it('FR-67 / D-1: the window is fixed at one hour from the first counted request - still closed 1 ms before the hour, open again 1 ms after it', async () => {
    const { port, clock } = await boot();
    await burst(port, 30, '198.51.100.1');
    expect((await post(port, GEN, generateBody(), { xff: '198.51.100.1' })).status).toBe(429);
    clock.advance(HOUR - 1);
    expect((await post(port, GEN, generateBody(), { xff: '198.51.100.1' })).status).toBe(429);
    clock.advance(2);
    expect((await post(port, GEN, generateBody(), { xff: '198.51.100.1' })).status).toBe(200);
  });

  it('FR-51 / FR-66: a 413 REQUEST_BODY_TOO_LARGE from the body-limit layer is not a counted request, and it carries the CORS headers', async () => {
    const { port, gemini } = await boot();
    const tooLarge = await post(port, GEN, null, { declareLength: 31 * 1024 * 1024 + 1, xff: '198.51.100.1' });
    expect(tooLarge.status).toBe(413);
    expect(tooLarge.body).toEqual({ error: 'REQUEST_BODY_TOO_LARGE' });
    expect(tooLarge.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(gemini.count.generateImage).toBe(0);
    const statuses = await burst(port, 30, '198.51.100.1'); // the full 30 are still available
    expect(statuses.every((s) => s === 200)).toBe(true);
    expect((await post(port, GEN, generateBody(), { xff: '198.51.100.1' })).status).toBe(429);
  });

  it('FR-66 / FR-27: requests rejected by body validation (400) never consume the limiter', async () => {
    const { port } = await boot();
    for (let i = 0; i < 35; i++) {
      const bad = await post(port, GEN, { ...generateBody(), aspectRatio: '2:1' }, { xff: '198.51.100.1' });
      expect(bad.status).toBe(400);
    }
    const statuses = await burst(port, 30, '198.51.100.1');
    expect(statuses.every((s) => s === 200)).toBe(true);
  });

  it('FR-66 / FR-16: uploads are not counted - 40 uploads leave the generate budget untouched', async () => {
    const { port } = await boot();
    const data = toBase64(padTo(PNG_MAGIC, 64));
    for (let i = 0; i < 40; i++) {
      const up = await post(port, '/api/image-studio/upload', { data }, { xff: '198.51.100.1' });
      expect(up.status).toBe(200);
      expect(up.body).toMatchObject({ mimeType: 'image/png' });
    }
    const statuses = await burst(port, 30, '198.51.100.1');
    expect(statuses.every((s) => s === 200)).toBe(true);
  });

  it('FR-69 / FR-70: through the real app an accepted generation answers 200 images with CORS headers and writes exactly one usage row', async () => {
    const { port, insertUsage } = await boot();
    const res = await post(port, GEN, { ...generateBody(), presetId: 'white-bg', resolution: '2K' });
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(res.body).toMatchObject({ kind: 'images', trimmedTurnIds: [] });
    expect(insertUsage).toHaveBeenCalledTimes(1);
    expect(insertUsage.mock.calls[0][0].taskLabel).toBe('image-studio|white-bg|2K');
  });
});
