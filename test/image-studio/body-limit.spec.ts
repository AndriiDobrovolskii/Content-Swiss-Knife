// @vitest-environment node
/**
 * US-10.1 T5 - the Content-Length body-limit middleware for /api/image-studio/* (FR-51, FR-61, SD-2, SD-3, AC-30).
 *
 * PINNED CONTRACT (server/image-studio/body-limit.js):
 *   export function imageBodyLimit(): (req, res, next) => void
 *   - Express middleware, mounted by createApp with `app.use('/api/image-studio', imageBodyLimit())`, so the middleware
 *     itself decides only on METHOD and the declared `Content-Length`, never on the path.
 *   - Body-bearing methods (POST, PUT, PATCH): declared length > 31 457 280 B -> HTTP 413 `{ error: 'REQUEST_BODY_TOO_LARGE' }`;
 *     no Content-Length header -> HTTP 411 `{ error: 'CONTENT_LENGTH_REQUIRED' }`; otherwise `next()` once, no response.
 *   - GET, HEAD, OPTIONS are never rejected (`next()` called, nothing sent), whatever headers they carry.
 *   - A rejection ends the response and does NOT call `next()`; the body is exactly `{ error: <closed code> }`.
 *   The fake req exposes `method` and `headers` (lower-case keys, as Node does) and `get(name)`; the fake res supports
 *   `status().json()`, `status().send()`, `status().end()`, `setHeader/set` - the assertions read what was sent, not how.
 *
 * Not asserted here: that CORS headers are present on the rejection (that is mount order - create-app.spec.ts).
 */
import { describe, it, expect } from 'vitest';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

const LIMIT = 30 * 1024 * 1024; // 31 457 280 B (Size units, Definitions)

interface Exchange { status: number | undefined; body: unknown; nextCalls: number; nextArgs: unknown[]; headers: Record<string, string> }

function exchange(
  middleware: (req: unknown, res: unknown, next: (e?: unknown) => void) => void,
  { method = 'POST', contentLength, extraHeaders = {} }: { method?: string; contentLength?: string | number; extraHeaders?: Record<string, string> } = {},
): Exchange {
  const out: Exchange = { status: undefined, body: undefined, nextCalls: 0, nextArgs: [], headers: {} };
  const headers: Record<string, string> = { ...extraHeaders };
  if (contentLength !== undefined) headers['content-length'] = String(contentLength);
  const req = {
    method,
    headers,
    get: (n: string) => headers[n.toLowerCase()],
    header: (n: string) => headers[n.toLowerCase()],
  };
  const res: any = {
    statusCode: 200,
    headersSent: false,
    status(n: number) { out.status = n; res.statusCode = n; return res; },
    setHeader(k: string, v: string) { out.headers[k.toLowerCase()] = v; return res; },
    set(k: string, v: string) { out.headers[k.toLowerCase()] = v; return res; },
    type() { return res; },
    json(b: unknown) { out.body = b; res.headersSent = true; return res; },
    send(b: unknown) { out.body = typeof b === 'string' ? safeParse(b) : b; res.headersSent = true; return res; },
    end(b?: unknown) { if (b !== undefined) out.body = typeof b === 'string' ? safeParse(b) : b; res.headersSent = true; return res; },
  };
  middleware(req, res, (e?: unknown) => { out.nextCalls += 1; out.nextArgs.push(e); });
  return out;
}
function safeParse(s: string) { try { return JSON.parse(s); } catch { return s; } }

async function limit() {
  const m = await load('../../server/image-studio/body-limit.js');
  return m.imageBodyLimit();
}

describe('imageBodyLimit - declared Content-Length over 30 MB', () => {
  it('FR-51 / AC-30: a declared 31 MB POST (31 457 281 B) is answered 413 REQUEST_BODY_TOO_LARGE and next() is not called', async () => {
    const r = exchange(await limit(), { contentLength: LIMIT + 1 });
    expect(r.status).toBe(413);
    expect(r.body).toEqual({ error: 'REQUEST_BODY_TOO_LARGE' });
    expect(r.nextCalls).toBe(0);
  });

  it('FR-51: exactly 30 MB (31 457 280 B) is "at most 30 MB" and passes', async () => {
    const r = exchange(await limit(), { contentLength: LIMIT });
    expect(r.status).toBeUndefined();
    expect(r.nextCalls).toBe(1);
    expect(r.nextArgs[0]).toBeUndefined();
  });

  it('FR-51: a 31 MB declared body (the Specification test value) is rejected', async () => {
    const r = exchange(await limit(), { contentLength: 31 * 1024 * 1024 });
    expect(r.status).toBe(413);
    expect(r.body).toEqual({ error: 'REQUEST_BODY_TOO_LARGE' });
  });

  it('FR-51: PUT and PATCH are body-bearing too and are rejected over the limit', async () => {
    for (const method of ['PUT', 'PATCH']) {
      const r = exchange(await limit(), { method, contentLength: LIMIT + 1 });
      expect(r.status, method).toBe(413);
      expect(r.body, method).toEqual({ error: 'REQUEST_BODY_TOO_LARGE' });
    }
  });

  it('FR-51: a small declared POST body passes and a declared zero-length POST passes', async () => {
    for (const len of [1, 1024, 0]) {
      const r = exchange(await limit(), { contentLength: len });
      expect(r.status, String(len)).toBeUndefined();
      expect(r.nextCalls, String(len)).toBe(1);
    }
  });
});

describe('imageBodyLimit - missing Content-Length', () => {
  it('FR-51 / FR-61: a POST with no Content-Length (chunked) is answered 411 CONTENT_LENGTH_REQUIRED, next() not called', async () => {
    const r = exchange(await limit(), { extraHeaders: { 'transfer-encoding': 'chunked' } });
    expect(r.status).toBe(411);
    expect(r.body).toEqual({ error: 'CONTENT_LENGTH_REQUIRED' });
    expect(r.nextCalls).toBe(0);
  });

  it('FR-51: PUT and PATCH without Content-Length are 411 as well', async () => {
    for (const method of ['PUT', 'PATCH']) {
      const r = exchange(await limit(), { method });
      expect(r.status, method).toBe(411);
      expect(r.body, method).toEqual({ error: 'CONTENT_LENGTH_REQUIRED' });
    }
  });
});

describe('imageBodyLimit - body-less methods are never rejected', () => {
  it('FR-51: GET, HEAD and OPTIONS pass with no Content-Length', async () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      const r = exchange(await limit(), { method });
      expect(r.status, method).toBeUndefined();
      expect(r.nextCalls, method).toBe(1);
      expect(r.body, method).toBeUndefined();
    }
  });

  it('FR-51: GET, HEAD and OPTIONS pass even when they declare an oversize Content-Length', async () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      const r = exchange(await limit(), { method, contentLength: LIMIT * 2 });
      expect(r.status, method).toBeUndefined();
      expect(r.nextCalls, method).toBe(1);
    }
  });
});

describe('imageBodyLimit - responses carry closed codes only (FR-61)', () => {
  it('FR-61: the rejection body has exactly one key, "error", and the value is a contract code (no upstream or parser text)', async () => {
    for (const [contentLength, code] of [[LIMIT + 1, 'REQUEST_BODY_TOO_LARGE'], [undefined, 'CONTENT_LENGTH_REQUIRED']] as const) {
      const r = exchange(await limit(), { contentLength });
      expect(Object.keys(r.body as object)).toEqual(['error']);
      expect((r.body as any).error).toBe(code);
    }
  });
});
