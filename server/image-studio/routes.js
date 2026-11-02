/**
 * Mounting of the Image Studio routes (US-10.1, DD-5).
 *
 * `mountImageStudioRoutes(app, overrides)` registers the routes on an Express app, with the real
 * dependencies by default. Tests inject doubles through `overrides`.
 *
 * Rule 1: no SDK import here; the Gemini provider is reached through the existing factory, always
 * `gemini` whatever LLM_PROVIDER says (FR-6). Rule 2: no retrieval.
 */
import { resolveProvider } from '../providers/factory.js';
import { createUploadHandler } from './handlers.js';

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

/** The production dependencies of the handlers. */
function defaultDeps() {
  return {
    getGemini: () => resolveProvider('gemini'),
    hasGeminiKey: () => Boolean(process.env.GEMINI_API_KEY),
    now: () => Date.now(),
    sleep: abortableSleep,
    log: (...args) => console.log(...args),
  };
}

/**
 * @param {import('express').Express} app
 * @param {object} [overrides] dependency doubles for tests
 */
export function mountImageStudioRoutes(app, overrides = {}) {
  const deps = { ...defaultDeps(), ...overrides };
  app.post('/api/image-studio/upload', createUploadHandler(deps));
}
