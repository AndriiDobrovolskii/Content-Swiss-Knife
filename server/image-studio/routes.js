/**
 * Mounting of the Image Studio routes (US-10.1, DD-5).
 *
 * `mountImageStudioRoutes(app, overrides)` registers the routes on an Express app, with the real
 * dependencies by default. Tests inject doubles through `overrides`.
 *
 * Rule 1: no SDK import here; the Gemini provider is reached through the existing factory, always
 * `gemini` whatever LLM_PROVIDER says (FR-6). Rule 2: no retrieval.
 */
import { computeImageCost } from '../usage/pricing.js';
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from './constants.js';
import { createGenerateHandler, createUploadHandler } from './handlers.js';
import { createRateLimiter } from './rate-limiter.js';

/** A wait that ends early, with an AbortError, when `signal` aborts (the retry loop's backoff, FR-21). */
export function abortableSleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * The default usage writer. `usage/store.js` opens the SQLite file when it is imported, so it is loaded on
 * the first write rather than when this module is imported: importing `server/app.js` (and so this
 * module) must stay free of side effects. The handler awaits the result, so a failed write is still caught
 * and logged there (FR-69).
 */
async function insertUsageLazily(row) {
  const { insertUsage } = await import('../usage/store.js');
  insertUsage(row);
}

/**
 * The Gemini provider, resolved on first use. `providers/factory.js` pulls in the three vendor SDKs, so it is loaded
 * by the first request rather than when this module is imported: importing `server/app.js` stays light and free of
 * side effects. The handlers await the result.
 */
async function getGeminiLazily() {
  const { resolveProvider } = await import('../providers/factory.js');
  return resolveProvider('gemini');
}

/** The production dependencies of the handlers. */
function defaultDeps() {
  return {
    getGemini: getGeminiLazily,
    hasGeminiKey: () => Boolean(process.env.GEMINI_API_KEY),
    now: () => Date.now(),
    sleep: abortableSleep,
    insertUsage: insertUsageLazily,
    price: computeImageCost,
    log: (...args) => console.log(...args),
  };
}

/**
 * @param {import('express').Express} app
 * @param {object} [overrides] dependency doubles for tests
 */
export function mountImageStudioRoutes(app, overrides = {}) {
  const deps = { ...defaultDeps(), ...overrides };
  // One limiter per mounted app: the counters live in this process only (FR-67).
  deps.limiter ??= createRateLimiter({ limit: RATE_LIMIT_MAX, windowMs: RATE_LIMIT_WINDOW_MS, now: deps.now });
  app.post('/api/image-studio/upload', createUploadHandler(deps));
  app.post('/api/image-studio/generate', createGenerateHandler(deps));
}
