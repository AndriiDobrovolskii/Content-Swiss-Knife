/**
 * retry.js
 *
 * Provider-independent retry/backoff for every LLM call (architecture rule #5).
 *
 * TWO CLASSES OF FAILURE, AND BOTH ARE RETRYABLE.
 *
 * - POLICY — the provider answered and said no: 429, 503, "overloaded", RESOURCE_EXHAUSTED.
 * - TRANSPORT — nobody answered at all: connection reset, DNS failure, socket or body timeout.
 *   Node/undici surfaces these as a bare `TypeError: fetch failed`, with the real reason on
 *   `error.cause.code`.
 *
 * Only the policy half used to be handled. On 2026-08-01 a real EXPERT3D run died after four
 * successful calls — ~40 K output tokens already paid for — when the fifth failed with
 * `fetch failed`, and the server log contains no `[Retry]` line at all: it was rethrown on attempt
 * 1 of 3. That was backwards. A transport failure is the MORE retryable of the two: it is usually a
 * momentary blip, and nothing about the request itself is wrong.
 *
 * WHAT MUST STILL FAIL FAST. A deterministic error (400, a safety block, a truncation guard) cannot
 * be fixed by sending the same request again — retrying it only makes every genuine failure three
 * times slower and three times more expensive. Bare 500 is deliberately NOT retried: a provider 500
 * is often a malformed request, unlike 502/504 which are gateway-level and transient.
 */

import { describeError } from './describe-error.js';

/**
 * Transport-level failures worth retrying. `UND_ERR_*` are undici's own; the rest are libuv/OS
 * socket errors. All of them mean the request never got a considered answer.
 */
const TRANSPORT_CODES = new Set([
  'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT',
  'EPIPE', 'EHOSTUNREACH', 'ENETUNREACH', 'ECONNABORTED',
  'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET', 'UND_ERR_RESPONSE_STATUS_CODE',
]);

/**
 * Error names used by the SDKs and the runtime when a request is aborted or times out. These
 * matter because the SDK clients are configured with explicit timeouts — bounding a hang is only
 * useful if the resulting error is then retried, otherwise it just renames the failure.
 */
const TRANSPORT_NAMES = new Set([
  'AbortError', 'TimeoutError',
  'APIConnectionError', 'APIConnectionTimeoutError',
]);

/** Chain depth is bounded so a self-referential `cause` cannot hang the retry wrapper. */
const MAX_CAUSE_DEPTH = 8;

/**
 * Walks the whole `error.cause` chain, not just one level.
 *
 * The SDKs wrap: `[gemini] generate failed` → `request failed` → the undici error that actually
 * carries `code`. Checking only the top level finds nothing and the call is not retried.
 */
function isTransportFailure(error) {
  const seen = new Set();
  let current = error;
  let depth = 0;

  while (current && depth < MAX_CAUSE_DEPTH && !seen.has(current)) {
    seen.add(current);

    if (current.code && TRANSPORT_CODES.has(current.code)) return true;
    if (current.name && TRANSPORT_NAMES.has(current.name)) return true;

    const message = String(current.message || '');
    // Matched narrowly and case-sensitively where it matters: `fetch failed` is undici's exact
    // wording, and "timed out" is the SDKs'. A loose /timeout/ would also match legitimate
    // application errors that merely mention one.
    if (message.includes('fetch failed')) return true;
    if (/timed out|socket hang up|network error/i.test(message)) return true;

    current = current.cause;
    depth++;
  }

  return false;
}

export async function withRetry(operation, maxRetries = 3, baseDelayMs = 3000) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const status = error?.status || error?.response?.status;
      const message = error?.message || '';

      const isRateLimited =
        status === 429 ||
        status === 503 ||
        message.includes('429') ||
        message.includes('overloaded') ||
        message.includes('RESOURCE_EXHAUSTED') ||
        message.includes('rate_limit');

      // Gateway statuses sit with transport rather than policy: nothing considered the request.
      const isTransport = status === 502 || status === 504 || isTransportFailure(error);

      if ((isRateLimited || isTransport) && attempt < maxRetries) {
        // Jitter is capped by the base delay so a test can pass a 1 ms base and not wait a second
        // per attempt. In production baseDelayMs is 3000, so this is the original 0–1000 ms.
        const jitter = Math.random() * Math.min(1000, baseDelayMs);
        const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
        // Name the actual class. This line used to say "rate-limited" unconditionally, which would
        // now mislabel every transport retry and hide the very thing worth noticing.
        const reason = isRateLimited ? 'rate-limited' : `transport failure (${describeError(error)})`;
        console.warn(`[Retry] Attempt ${attempt}/${maxRetries} ${reason}. Retrying in ${Math.round(delay)}ms…`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}
