// @vitest-environment node
/**
 * US-10.1 T6 - `createApp(deps)` composes CORS, the image body limit and the parsers in the required order
 * (FR-27, FR-51, NFR-6, AC-30; plan DD-4, risks R5 / R7 / R11).
 *
 * PINNED CONTRACT (server/app.js):
 *   createApp({ allowedOrigins: string[], mountImageRoutes?: (app) => void, registerRoutes?: (app) => void, ...handlerDeps }) -> express app
 *   Order inside: `app.set('trust proxy', 1)` -> `cors({ origin: corsOriginPolicy(allowedOrigins) })` -> image body limit mounted
 *   on '/api/image-studio' -> `express.json({ limit: '50mb' })` -> `express.urlencoded` -> `mountImageRoutes(app)` ->
 *   `registerRoutes(app)`. It never calls `listen` and installs no process handler; importing server/app.js starts nothing.
 *   This spec never imports server/index.js (that module listens at import).
 *
 * LOOPBACK, NOT NETWORK (plan R11): the app listens on 127.0.0.1:0 inside this process and is called through node:http;
 * no external host is contacted. Rejections of an OVERSIZE image-prefix request are provoked by DECLARING the length and
 * sending no body (the middleware decides on the header alone), which is deterministic and cheap; the 50 MB-parser case
 * sends a real 31 MB JSON body to a probe route outside the prefix.
 *
 * NOT here (they need the real generate handler, F1b's app-limiter.composition.spec.ts): 429 with CORS headers, forged
 * X-Forwarded-For, two-IP isolation.
 */
import { describe, it, expect, afterEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

const ORIGIN = 'https://shop.example';
const MB = 1024 * 1024;

let server: http.Server | null = null;
afterEach(async () => {
  if (server) await new Promise<void>((r) => server!.close(() => r()));
  server = null;
});

async function boot(extra: Record<string, unknown> = {}) {
  const { createApp } = await load('../../server/app.js');
  const app = createApp({
    allowedOrigins: [ORIGIN],
    mountImageRoutes: (a: any) => {
      a.get('/api/image-studio/ping', (_req: any, res: any) => res.status(200).json({ ok: 'image-get' }));
      a.post('/api/image-studio/echo', (req: any, res: any) => res.status(200).json({ ok: 'image-post', size: JSON.stringify(req.body ?? null).length }));
    },
    registerRoutes: (a: any) => {
      a.post('/api/probe', (req: any, res: any) => res.status(200).json({ received: String(req.body?.data ?? '').length }));
      a.get('/health', (_req: any, res: any) => res.status(200).json({ ok: true }));
    },
    ...extra,
  });
  server = http.createServer(app);
  await new Promise<void>((r) => server!.listen(0, '127.0.0.1', () => r()));
  return { app, port: (server!.address() as AddressInfo).port };
}

interface Reply { status: number; headers: http.IncomingHttpHeaders; body: any }

/** One request. `declareLength` sends a Content-Length header but no body (header-only provocation). */
function call(
  port: number,
  { method = 'GET', path = '/', origin, body, declareLength, chunked = false }:
    { method?: string; path?: string; origin?: string; body?: Buffer | string; declareLength?: number; chunked?: boolean } = {},
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string | number> = {};
    if (origin) headers['Origin'] = origin;
    if (body !== undefined || declareLength !== undefined) headers['Content-Type'] = 'application/json';
    if (declareLength !== undefined) headers['Content-Length'] = declareLength;
    else if (body !== undefined && !chunked) headers['Content-Length'] = Buffer.byteLength(body);
    const req = http.request({ host: '127.0.0.1', port, method, path, headers, agent: false }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let parsed: any = text;
        try { parsed = JSON.parse(text); } catch { /* non-JSON body */ }
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body: parsed });
        // Header-only provocation: once the answer is complete, drop the connection (the declared body never arrives).
        if (declareLength !== undefined) req.destroy();
      });
    });
    req.on('error', (e) => { if (declareLength === undefined) reject(e); });
    if (body !== undefined) req.write(body);
    if (declareLength === undefined) req.end(); else req.flushHeaders();
  });
}

describe('createApp composition', () => {
  it('NFR-6 / FR-66: trust proxy is set to 1 (the one-hop Railway assumption)', async () => {
    const { app } = await boot();
    expect(app.get('trust proxy')).toBe(1);
  });

  it('FR-51: importing server/app.js and building the app starts no listener', async () => {
    const before = (process as any).getActiveResourcesInfo().filter((r: string) => r === 'TCPServerWrap').length;
    const { createApp } = await load('../../server/app.js');
    createApp({ allowedOrigins: [ORIGIN], mountImageRoutes: () => {}, registerRoutes: () => {} });
    const after = (process as any).getActiveResourcesInfo().filter((r: string) => r === 'TCPServerWrap').length;
    expect(after).toBe(before);
  });

  it('FR-27 / FR-51: a 31 MB declared body on an image-studio route is rejected 413 REQUEST_BODY_TOO_LARGE WITH the CORS header (CORS runs before the body limit)', async () => {
    const { port } = await boot();
    const r = await call(port, { method: 'POST', path: '/api/image-studio/echo', origin: ORIGIN, declareLength: 31 * MB });
    expect(r.status).toBe(413);
    expect(r.body).toEqual({ error: 'REQUEST_BODY_TOO_LARGE' });
    expect(r.headers['access-control-allow-origin']).toBe(ORIGIN);
  });

  it('FR-27 / FR-51: a POST with no Content-Length (chunked) on an image-studio route is 411 CONTENT_LENGTH_REQUIRED WITH the CORS header', async () => {
    const { port } = await boot();
    const r = await call(port, { method: 'POST', path: '/api/image-studio/echo', origin: ORIGIN, body: '{"a":1}', chunked: true });
    expect(r.status).toBe(411);
    expect(r.body).toEqual({ error: 'CONTENT_LENGTH_REQUIRED' });
    expect(r.headers['access-control-allow-origin']).toBe(ORIGIN);
  });

  it('FR-51: an origin that is not allowed gets no CORS header on the rejection (the allow-list policy still applies)', async () => {
    const { port } = await boot();
    const r = await call(port, { method: 'POST', path: '/api/image-studio/echo', origin: 'https://evil.example', declareLength: 31 * MB });
    expect(r.status).toBe(413);
    expect(r.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('FR-51 / AC-30: the SAME 31 MB body is accepted by the global 50 MB parser on a route outside the image prefix', async () => {
    const { port } = await boot();
    const big = JSON.stringify({ data: 'a'.repeat(31 * MB) });
    expect(Buffer.byteLength(big)).toBeGreaterThan(31 * MB);
    const r = await call(port, { method: 'POST', path: '/api/probe', origin: ORIGIN, body: big });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ received: 31 * MB });
  });

  it('FR-51: a normal small POST to an image-studio route passes the limit and reaches its handler', async () => {
    const { port } = await boot();
    const r = await call(port, { method: 'POST', path: '/api/image-studio/echo', origin: ORIGIN, body: JSON.stringify({ hello: 'world' }) });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe('image-post');
    expect(r.body.size).toBeGreaterThan(0); // the JSON parser ran after the limit
  });

  it('FR-51: GET on an image-studio route is not rejected (body-less methods pass)', async () => {
    const { port } = await boot();
    const r = await call(port, { method: 'GET', path: '/api/image-studio/ping', origin: ORIGIN });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: 'image-get' });
  });

  it('FR-51: an OPTIONS preflight on an image-studio route is answered by CORS, not rejected with 411 or 413', async () => {
    const { port } = await boot();
    const r = await call(port, { method: 'OPTIONS', path: '/api/image-studio/echo', origin: ORIGIN });
    expect(r.status).toBeLessThan(400);
    expect(r.headers['access-control-allow-origin']).toBe(ORIGIN);
  });

  it('NFR-6: existing-route behaviour is unchanged - a GET to a registered route answers 200 and a missing Content-Length is not required outside the prefix', async () => {
    const { port } = await boot();
    const health = await call(port, { method: 'GET', path: '/health', origin: ORIGIN });
    expect(health.status).toBe(200);
    const chunked = await call(port, { method: 'POST', path: '/api/probe', origin: ORIGIN, body: JSON.stringify({ data: 'xyz' }), chunked: true });
    expect(chunked.status).toBe(200);
    expect(chunked.body).toEqual({ received: 3 });
  });
});
