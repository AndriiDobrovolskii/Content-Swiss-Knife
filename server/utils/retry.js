/**
 * retry.js
 *
 * Provider-independent retry/backoff for every LLM call (architecture rule #5).
 *
 * THREE FAILURE CHARACTERS, ALL RETRYABLE.
 *
 * - POLICY — the provider answered and said no: 429, 503, "overloaded", RESOURCE_EXHAUSTED.
 * - TRANSPORT — nobody answered at all: connection reset, DNS failure, socket or body timeout.
 *   Node/undici surfaces these as a bare `TypeError: fetch failed`, with the real reason on
 *   `error.cause.code`.
 * - INCOMPLETE JSON — the provider claims the response is fine (no policy/transport signal, no
 *   MAX_TOKENS-style ceiling guard) but the body handed back is structurally cut off. See
 *   `server/utils/json-parse.js`'s `assertNotTruncated`, written as defence-in-depth for exactly
 *   this — "a cut stream, a proxy timeout, or a future provider [that] sets nothing at all". This
 *   is a momentary exchange failure, not a request problem, so it belongs with TRANSPORT in
 *   character — but unlike a dead connection, a different model plausibly *won't* glitch on the
 *   same generation, so it is also fallback-eligible like POLICY. See `isIncompleteJson` below.
 *
 * Only the policy half used to be handled. On 2026-08-01 a real EXPERT3D run died after four
 * successful calls — ~40 K output tokens already paid for — when the fifth failed with
 * `fetch failed`, and the server log contains no `[Retry]` line at all: it was rethrown on attempt
 * 1 of 3. That was backwards. A transport failure is the MORE retryable of the two: it is usually a
 * momentary blip, and nothing about the request itself is wrong.
 *
 * WHAT MUST STILL FAIL FAST. A deterministic error (400, a safety block, a provider's own
 * MAX_TOKENS/stop_reason:max_tokens/finish_reason:length ceiling guard) cannot be fixed by sending
 * the same request again — retrying it only makes every genuine failure three times slower and
 * three times more expensive. Bare 500 is deliberately NOT retried: a provider 500 is often a
 * malformed request, unlike 502/504 which are gateway-level and transient. The INCOMPLETE JSON
 * class above is deliberately narrower than "any truncation guard": a provider hitting its own
 * output ceiling is a structural, likely-to-recur failure and stays in this fail-fast list
 * untouched — only `json-parse.js`'s own detector, which fires precisely when no such ceiling was
 * reported, is retried.
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
    // `@google/genai`'s own wording, matched exactly because the error carries nothing else: its
    // retry wrapper strips `status` and `code` before rethrowing (see the warning in
    // server/providers/gemini.js). We no longer engage that wrapper, so this should be
    // unreachable — it stays as a backstop, because the failure mode it guards against is silent:
    // gateway errors simply stop being retried, with nothing in the log to say so.
    if (message.includes('Retryable HTTP Error')) return true;

    current = current.cause;
    depth++;
  }

  return false;
}

/**
 * Backoff cap. Without it the exponential series keeps doubling forever, which only matters once
 * `maxPolicyRetries` (below) got wide enough to reach it — at the original 3-attempt budget the
 * series never got past 6s and a cap was moot.
 */
const MAX_DELAY_MS = 30_000;

/**
 * `maxRetries` is deliberately left as the TRANSPORT budget (unchanged, default 3) and
 * `maxPolicyRetries` is a new, separate, wider budget (default 6) for the policy class alone.
 *
 * WHY TWO BUDGETS, NOT ONE WIDER ONE. server/utils/timeouts.js already documents, in detail, the
 * worst case for a genuinely wedged call: a timeout surfaces as a transport failure, and
 * DEEP_TIMEOUT_MS (20 min) × withRetry's attempt count × the repair gate's own retry budget is
 * called out there as "close to 4 hours in the worst case" at the current 3-attempt budget.
 * Raising that budget globally to chase a 2026-08-17 run of sustained Gemini 503s (Google
 * answering "busy", not a dead connection) would double that worst case to ~8 hours for a call
 * that is simply never going to answer. The 503/429 class is where the actual problem lives, so
 * only that class gets more room; a hung connection still fails in the same bounded time it always
 * has.
 *
 * `fallback` is an optional thunk the caller may supply. It is invoked at most once, only when the
 * budget was exhausted by a failure worth trying a different model over — POLICY or INCOMPLETE
 * JSON (see the file header), never plain TRANSPORT and never a deterministic error: a dead
 * connection or a malformed request isn't fixed by trying a different model, but a provider being
 * overloaded or glitching on one particular generation plausibly is. Provider-independent by
 * construction: this file never learns what the thunk represents, only that there's one more thing
 * to try.
 */
export async function withRetry(operation, maxRetries = 3, baseDelayMs = 3000, fallback, maxPolicyRetries = 6) {
  const attemptCap = Math.max(maxRetries, maxPolicyRetries);
  let lastError;
  let exhaustedFallbackEligible = false;
  let exhaustedLimit;

  for (let attempt = 1; attempt <= attemptCap; attempt++) {
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

      // A provider that reports its response complete (no 429/503, no MAX_TOKENS-style guard) can
      // still hand back a body that is structurally cut off — see json-parse.js's
      // assertNotTruncated, written as defence-in-depth for exactly this. Unlike the provider's
      // own ceiling guards (which stay fail-fast — the same ceiling will likely recur), this means
      // the EXCHANGE was incomplete, not the REQUEST was wrong, so it's retried like a transport
      // blip and is fallback-eligible like a policy failure: a different model may simply not
      // glitch on this generation.
      const isIncompleteJson = error?.code === 'ERR_INCOMPLETE_JSON';

      exhaustedFallbackEligible = isRateLimited || isIncompleteJson;

      const limit = isRateLimited ? maxPolicyRetries : maxRetries;
      exhaustedLimit = limit;

      if ((isRateLimited || isTransport || isIncompleteJson) && attempt < limit) {
        // Jitter is capped by the base delay so a test can pass a 1 ms base and not wait a second
        // per attempt. In production baseDelayMs is 3000, so this is the original 0–1000 ms.
        const jitter = Math.random() * Math.min(1000, baseDelayMs);
        const delay = Math.min(MAX_DELAY_MS, baseDelayMs * Math.pow(2, attempt - 1)) + jitter;
        // Name the actual class. This line used to say "rate-limited" unconditionally, which would
        // now mislabel every transport retry and hide the very thing worth noticing.
        const reason = isRateLimited
          ? 'rate-limited'
          : isIncompleteJson
            ? 'an incomplete JSON body'
            : `transport failure (${describeError(error)})`;
        console.warn(`[Retry] Attempt ${attempt}/${limit} ${reason}. Retrying in ${Math.round(delay)}ms…`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      break; // budget exhausted for this failure's class, or a deterministic error
    }
  }

  if (exhaustedFallbackEligible && fallback) {
    console.warn(`[Retry] Exhausted retry budget (${exhaustedLimit} attempts). Falling back to the alternate model…`);
    return fallback();
  }
  throw lastError;
}
