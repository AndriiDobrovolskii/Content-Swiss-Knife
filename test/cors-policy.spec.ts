/**
 * cors-policy.spec.ts — US-1.1, the proxy's CORS allow-list.
 *
 * The BFF currently mounts `app.use(cors())` with no options, which answers every request with
 * `Access-Control-Allow-Origin: *`. These tests pin the allow-list behaviour that replaces it.
 *
 * WHY THE UNIT UNDER TEST IS A PURE MODULE, NOT THE EXPRESS APP. `server/index.js:241` calls
 * `app.listen()` at module scope, so importing it starts a listener; every existing `server/**`
 * test works around that the same way (see test/llm-routes.spec.ts) by importing a pure function.
 * The Story's plan (D1) took that route deliberately and rejected adding `supertest`, which would
 * be an AGENTS.md §7.8 dependency proposal.
 *
 * WHY THE THIRD BLOCK DRIVES THE REAL `cors` MIDDLEWARE. The acceptance criteria are written in
 * terms of a RESPONSE HEADER ("receives an `Access-Control-Allow-Origin` header echoing that exact
 * origin"), not in terms of a callback argument. `cors` is already a production dependency, so the
 * composed expression `corsOriginPolicy(resolveAllowedOrigins(...))` — the exact value
 * `server/index.js` will hand to `cors({ origin: … })` — is driven through the real middleware with
 * a minimal request/response double. No new dependency, no app restructuring. This is plan review
 * finding 2: it shrinks the untested surface of this Story to the literal `app.use(...)` call.
 *
 * Runner: `test:logic` (`npm run test:logic`). Not a component spec; the filename must NOT end in
 * `.component.spec.ts`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import cors from 'cors';

const HERE = dirname(fileURLToPath(import.meta.url));
const POLICY_MODULE = pathToFileURL(join(HERE, '..', 'server', 'cors-policy.js')).href;

/**
 * Loaded at RUN time inside each test, not imported at module scope.
 *
 * These tests are written before `server/cors-policy.js` exists (AGENTS.md §5 — the tests come
 * first and start red). Vite resolves both static AND statically-analysable dynamic imports while
 * transforming the file, so either shape turns "the module is not written yet" into one collection
 * error with ZERO named tests — and the AC ↔ test matrix would then point at tests that never ran,
 * which is exactly what `so-reconciliation-reviewer` has to be able to check. Resolving the
 * specifier at run time instead gives one honest failure per acceptance criterion, and behaves
 * identically to a plain import once the module is there. The module is production ESM `.js` and
 * needs no transform, so nothing is lost by skipping the pipeline.
 *
 * The shape below is declared here rather than derived with `typeof import(…)` for the same
 * reason: a type-only reference to a file that does not exist yet is a TS2307, which fails
 * `npm run lint` AND stops the `test:components` bundle from building at all — turning "the new
 * tests are red" into "the other runner cannot start". Declaring it keeps the red confined to
 * these tests, and states the contract T1 has to satisfy.
 */
type OriginCallback = (error: unknown, allowed?: unknown) => void;

interface CorsPolicy {
  /** `ALLOWED_ORIGINS`, verbatim, to a normalised and always non-empty allow-list. */
  resolveAllowedOrigins(raw: string | undefined): string[];
  /** An allow-list to the `origin` callback the `cors` package expects. */
  corsOriginPolicy(allowed: string[]): (origin: string | undefined, callback: OriginCallback) => void;
}

const loadPolicy = (): Promise<CorsPolicy> => import(/* @vite-ignore */ POLICY_MODULE) as Promise<CorsPolicy>;

const DEFAULT_ORIGIN = 'http://localhost:3000';

/** What the `cors` package's `origin` callback was told, captured synchronously. */
interface Decision {
  /** The callback's first argument. Anything truthy makes `cors` abort the request via `next(err)`. */
  error: unknown;
  /** The callback's second argument. `true` reflects the request's origin; `false` omits the header. */
  allowed: unknown;
  /** How many times the policy answered. */
  calls: number;
}

type OriginPolicy = (origin: string | undefined, callback: OriginCallback) => void;

function decide(policy: OriginPolicy, origin: string | undefined): Decision {
  const decision: Decision = { error: undefined, allowed: undefined, calls: 0 };
  policy(origin, (error, allowed) => {
    decision.calls += 1;
    decision.error = error;
    decision.allowed = allowed;
  });
  return decision;
}

/** What the middleware did to the response, and whether the request was allowed to continue. */
interface Exchange {
  headers: Record<string, string>;
  nextCalled: boolean;
  nextError: unknown;
  ended: boolean;
  statusCode: number | undefined;
}

/**
 * The smallest request/response pair the `cors` middleware actually uses: it reads `req.method` and
 * `req.headers.origin`, and writes through `res.setHeader` / `res.getHeader` (the `vary` package
 * reads the latter), `res.statusCode`, and `res.end` on a preflight it answers itself.
 */
function exchange(
  middleware: (req: unknown, res: unknown, next: (error?: unknown) => void) => void,
  { method = 'GET', origin }: { method?: string; origin?: string } = {},
): Exchange {
  const headers: Record<string, string> = {};
  const result: Exchange = {
    headers,
    nextCalled: false,
    nextError: undefined,
    ended: false,
    statusCode: undefined,
  };
  const req = { method, headers: origin === undefined ? {} : { origin } };
  const res = {
    statusCode: undefined as number | undefined,
    setHeader(key: string, value: string) {
      headers[String(key).toLowerCase()] = value;
    },
    getHeader(key: string) {
      return headers[String(key).toLowerCase()];
    },
    removeHeader(key: string) {
      delete headers[String(key).toLowerCase()];
    },
    end() {
      result.ended = true;
    },
  };
  middleware(req, res, (error?: unknown) => {
    result.nextCalled = true;
    result.nextError = error;
  });
  result.statusCode = res.statusCode;
  return result;
}

const ALLOW_ORIGIN = 'access-control-allow-origin';

// ---------------------------------------------------------------------------------------------
// FR-1, FR-5 — reading the allow-list out of configuration.
// ---------------------------------------------------------------------------------------------

describe('resolveAllowedOrigins — the allow-list comes from configuration', () => {
  it('AC-4: defaults to http://localhost:3000 alone when ALLOWED_ORIGINS is unset', async () => {
    const { resolveAllowedOrigins } = await loadPolicy();

    expect(resolveAllowedOrigins(undefined)).toEqual([DEFAULT_ORIGIN]);
  });

  it('AC-4: falls back to that same single default for an empty or entry-less value', async () => {
    const { resolveAllowedOrigins } = await loadPolicy();

    for (const raw of ['', '   ', ',', ' , ,  ,']) {
      expect(resolveAllowedOrigins(raw)).toEqual([DEFAULT_ORIGIN]);
    }
  });

  it('AC-4: never returns a value the cors package would read as "allow every origin"', async () => {
    const { resolveAllowedOrigins } = await loadPolicy();

    // `cors` treats a falsy `origin`, or the string '*', as permission for every origin
    // (node_modules/cors/lib/index.js: `if (!options.origin || options.origin === '*')`). A
    // missing configuration value must fail CLOSED, so no input may produce any of those.
    for (const raw of [undefined, '', '   ', ',,,', ' , ']) {
      const allowed = resolveAllowedOrigins(raw);
      expect(Array.isArray(allowed)).toBe(true);
      expect(allowed.length).toBeGreaterThan(0);
      expect(allowed).not.toContain('*');
      expect(allowed).not.toContain('');
    }
  });

  it('AC-1: splits a comma-separated value and ignores whitespace around each entry', async () => {
    const { resolveAllowedOrigins } = await loadPolicy();

    expect(resolveAllowedOrigins(' https://shop.example , http://localhost:3000 '))
      .toEqual(['https://shop.example', DEFAULT_ORIGIN]);
  });

  it('AC-1: discards empty entries instead of admitting an empty origin', async () => {
    const { resolveAllowedOrigins } = await loadPolicy();

    expect(resolveAllowedOrigins('https://a.example,, ,https://b.example,'))
      .toEqual(['https://a.example', 'https://b.example']);
  });

  it('AC-1: a configured trailing slash still matches the origin a browser actually sends', async () => {
    const { resolveAllowedOrigins } = await loadPolicy();

    // A browser sends `Origin: https://shop.example` with no trailing slash. Without this
    // normalisation an operator who configures `https://shop.example/` gets a proxy that looks
    // configured and silently blocks everything, with no error anywhere.
    expect(resolveAllowedOrigins('https://shop.example/, http://localhost:3000/'))
      .toEqual(['https://shop.example', DEFAULT_ORIGIN]);
  });
});

// ---------------------------------------------------------------------------------------------
// FR-2, FR-3, FR-4 — the decision itself.
// ---------------------------------------------------------------------------------------------

describe('corsOriginPolicy — the decision the cors package asks for', () => {
  const LIST = ['https://shop.example', DEFAULT_ORIGIN];

  it('AC-1: allows an origin that appears in the list', async () => {
    const { corsOriginPolicy } = await loadPolicy();

    expect(decide(corsOriginPolicy(LIST), 'https://shop.example')).toMatchObject({
      allowed: true,
      calls: 1,
    });
  });

  it('AC-2: refuses an origin that does not appear in the list, by omission', async () => {
    const { corsOriginPolicy } = await loadPolicy();
    const decision = decide(corsOriginPolicy(LIST), 'https://evil.example');

    expect(decision.allowed).toBe(false);
    expect(decision.calls).toBe(1);
  });

  it('AC-2: refusal never produces an error, which would abort the request instead of omitting the header', async () => {
    const { corsOriginPolicy } = await loadPolicy();
    const policy = corsOriginPolicy(LIST);

    // `cors` calls `next(err)` when the callback's first argument is truthy, which turns a refusal
    // into an aborted request. FR-3 requires the request to be processed normally and the browser
    // to do the blocking, so the first argument must stay falsy on every path.
    for (const origin of ['https://evil.example', 'null', 'file://', 'http://localhost:3000.evil.example']) {
      const decision = decide(policy, origin);
      expect(decision.allowed).toBe(false);
      expect(decision.error).toBeFalsy();
      expect(decision.error).not.toBeInstanceOf(Error);
    }
    expect(() => policy('https://evil.example', () => {})).not.toThrow();
  });

  it('AC-3: allows a request that carries no Origin header at all', async () => {
    const { corsOriginPolicy } = await loadPolicy();

    // `cors` passes `undefined` when the request has no `Origin` header — a server-to-server call,
    // curl, or Railway's deploy health check. Treating that as "not in the allow-list" would break
    // the health check on deploy and nowhere else.
    const decision = decide(corsOriginPolicy(LIST), undefined);
    expect(decision.allowed).toBe(true);
    expect(decision.error).toBeFalsy();
  });

  it('AC-2: an Origin header that is present but empty is not in the list, so it is refused', async () => {
    const { corsOriginPolicy } = await loadPolicy();

    // Distinct from `undefined` above: a header that arrived, carrying nothing.
    expect(decide(corsOriginPolicy(LIST), '').allowed).toBe(false);
  });

  it('AC-2: matching is exact — a different port, scheme, case or host is a different origin', async () => {
    const { corsOriginPolicy } = await loadPolicy();
    const policy = corsOriginPolicy([DEFAULT_ORIGIN]);

    for (const nearMiss of [
      'http://localhost:3001',              // different port
      'https://localhost:3000',             // different scheme
      'http://LOCALHOST:3000',              // different case
      'http://evil.localhost:3000',         // host the entry is a suffix of
      'http://localhost:3000.evil.example', // host the entry is a prefix of
    ]) {
      expect(decide(policy, nearMiss).allowed).toBe(false);
    }
    expect(decide(policy, DEFAULT_ORIGIN).allowed).toBe(true);
  });

  it('AC-1: an allow-list with several entries admits each of them', async () => {
    const { corsOriginPolicy } = await loadPolicy();
    const policy = corsOriginPolicy(LIST);

    for (const origin of LIST) {
      expect(decide(policy, origin).allowed).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// The composed expression, driven through the real `cors` middleware. This is where the
// acceptance criteria are asserted as what they actually say: response headers.
// ---------------------------------------------------------------------------------------------

describe('the composed policy, through the real cors middleware', () => {
  /** Exactly the expression server/index.js will pass to `cors({ origin: … })`. */
  const middlewareFor = async (env: string | undefined) => {
    const { corsOriginPolicy, resolveAllowedOrigins } = await loadPolicy();
    return cors({ origin: corsOriginPolicy(resolveAllowedOrigins(env)) });
  };

  it('AC-1: a listed origin receives Access-Control-Allow-Origin echoing that exact origin', async () => {
    const middleware = await middlewareFor('https://shop.example,http://localhost:3000');
    const response = exchange(middleware, { origin: 'https://shop.example' });

    expect(response.headers[ALLOW_ORIGIN]).toBe('https://shop.example');
    expect(response.headers[ALLOW_ORIGIN]).not.toBe('*');
  });

  it('AC-2: an unlisted origin receives no Access-Control-Allow-Origin header', async () => {
    const middleware = await middlewareFor('https://shop.example');
    const response = exchange(middleware, { origin: 'https://evil.example' });

    expect(response.headers[ALLOW_ORIGIN]).toBeUndefined();
  });

  it('AC-2: an unlisted origin is not rejected — the request is processed, the browser blocks the response', async () => {
    const middleware = await middlewareFor('https://shop.example');
    const response = exchange(middleware, { origin: 'https://evil.example' });

    expect(response.nextCalled).toBe(true);
    expect(response.nextError).toBeFalsy();
    expect(response.ended).toBe(false);
    expect(response.statusCode).toBeUndefined();
  });

  it('AC-3: a request with no Origin header is handed on untouched, so /health still answers', async () => {
    const middleware = await middlewareFor('https://shop.example');
    const response = exchange(middleware, {});

    // The middleware must not end the response, set a status, or pass an error — the route handler
    // runs exactly as it does today. (`cors` sets no Access-Control-Allow-Origin here either:
    // there is no origin to reflect.)
    expect(response.nextCalled).toBe(true);
    expect(response.nextError).toBeFalsy();
    expect(response.ended).toBe(false);
    expect(response.statusCode).toBeUndefined();
  });

  it('AC-4: with ALLOWED_ORIGINS unset, localhost:3000 is admitted and every other origin is not', async () => {
    const middleware = await middlewareFor(undefined);

    expect(exchange(middleware, { origin: DEFAULT_ORIGIN }).headers[ALLOW_ORIGIN]).toBe(DEFAULT_ORIGIN);

    for (const origin of ['https://evil.example', 'http://localhost:4200', 'https://shop.example']) {
      expect(exchange(middleware, { origin }).headers[ALLOW_ORIGIN]).toBeUndefined();
    }
  });

  it('AC-4: an empty ALLOWED_ORIGINS does not reopen the wildcard', async () => {
    for (const raw of ['', '   ', ',,']) {
      const middleware = await middlewareFor(raw);
      expect(exchange(middleware, { origin: 'https://evil.example' }).headers[ALLOW_ORIGIN]).toBeUndefined();
      expect(exchange(middleware, { origin: DEFAULT_ORIGIN }).headers[ALLOW_ORIGIN]).toBe(DEFAULT_ORIGIN);
    }
  });

  it('AC-1: a preflight from a listed origin is answered with that origin echoed back', async () => {
    const middleware = await middlewareFor('https://shop.example');
    const response = exchange(middleware, { method: 'OPTIONS', origin: 'https://shop.example' });

    expect(response.headers[ALLOW_ORIGIN]).toBe('https://shop.example');
  });

  it('AC-2: a preflight from an unlisted origin receives no Access-Control-Allow-Origin header either', async () => {
    const middleware = await middlewareFor('https://shop.example');
    const response = exchange(middleware, { method: 'OPTIONS', origin: 'https://evil.example' });

    // A preflight the browser cannot pass is what stops the real request being sent. If preflight
    // and the actual request disagreed, a page could pass one and be blocked on the other.
    expect(response.headers[ALLOW_ORIGIN]).toBeUndefined();
    expect(response.nextError).toBeFalsy();
  });

  it('does not enable credentialed CORS', async () => {
    const middleware = await middlewareFor('https://shop.example');
    const response = exchange(middleware, { origin: 'https://shop.example' });

    // NFR-1: no cookies, no browser session, nothing to widen the surface for.
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------
// FR-7, NFR-2 — the setting is documented, with a placeholder and no real deployment URL.
// ---------------------------------------------------------------------------------------------

describe('.env.example documents ALLOWED_ORIGINS', () => {
  const ENV_EXAMPLE = join(HERE, '..', '.env.example');
  const read = () => readFileSync(ENV_EXAMPLE, 'utf8');

  /** The `ALLOWED_ORIGINS=` line, plus the comment block immediately above it. */
  function documentedSetting(contents: string): { value: string; comment: string } | null {
    const lines = contents.split(/\r?\n/);
    const index = lines.findIndex((line) => /^\s*ALLOWED_ORIGINS\s*=/.test(line));
    if (index === -1) return null;
    const comment: string[] = [];
    for (let i = index - 1; i >= 0 && /^\s*#/.test(lines[i]); i -= 1) comment.unshift(lines[i]);
    return { value: lines[index].replace(/^\s*ALLOWED_ORIGINS\s*=/, '').trim(), comment: comment.join('\n') };
  }

  it('AC-5: names the variable and explains the comma-separated format', async () => {
    const setting = documentedSetting(read());

    expect(setting).not.toBeNull();
    // Deliberately loose — this asserts that the format is explained, not how it is worded. A
    // stricter match would make the test a copy-editing gate on a comment.
    expect(setting?.comment).toMatch(/comma/i);
    expect(setting?.comment).toMatch(/localhost:3000/);
  });

  it('AC-5: carries a placeholder only — no real deployed URL enters the repository', async () => {
    const contents = read();
    const setting = documentedSetting(contents);

    expect(setting).not.toBeNull();

    // Every host in the configured value must be a placeholder: loopback, or a reserved example
    // domain (RFC 2606 / RFC 6761), or an obvious `your-…` stand-in.
    const hosts = (setting?.value ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => entry.replace(/^[a-z]+:\/\//i, '').replace(/[/:].*$/, ''));
    for (const host of hosts) {
      expect(host).toMatch(/^(localhost|127\.0\.0\.1|(.+\.)?example(\.(com|net|org))?|your-[\w.-]+)$/i);
    }

    // And no platform hostname anywhere in the file — the deployed origin is a deployment setting,
    // not a repository one (AGENTS.md §3 Rule 4).
    expect(contents).not.toMatch(/\b[\w-]+\.(railway\.app|up\.railway\.app|vercel\.app|netlify\.app|onrender\.com|herokuapp\.com|fly\.dev)\b/i);
  });
});
