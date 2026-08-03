/**
 * describe-error.js
 *
 * Flattens an error and its `cause` chain into one readable line.
 *
 * WHY THIS EXISTS. A live generation died on 2026-08-01 and the only evidence anyone had was a
 * 24-byte HTTP body: `{"error":"fetch failed"}`. That is Node/undici's generic wrapper; the actual
 * reason — `ECONNRESET`, `ENOTFOUND`, a socket timeout — sits on `error.cause`, which `sendError`
 * was discarding. Two unrelated network faults produce byte-identical output, so the message could
 * not distinguish "DNS is down" from "the provider hung up".
 *
 * `fetch failed: ECONNRESET` costs one line here and saves a debugging session.
 *
 * Kept as a helper rather than inlined in server/index.js so it is directly testable — the same
 * shape as describeGroundingFailure, which the orchestrator already uses this way.
 */

/** Chain depth is bounded: a malformed error must never turn logging into an infinite loop. */
const MAX_DEPTH = 8;

export function describeError(error) {
  if (error === null || error === undefined) return 'unknown error';
  if (typeof error === 'string') return error || 'unknown error';

  const parts = [];
  const seen = new Set();
  let current = error;
  let depth = 0;

  while (current && depth < MAX_DEPTH && !seen.has(current)) {
    seen.add(current);

    // The outermost error is described by what it SAYS; the causes beneath it are described by
    // their `code`, which is the part that actually identifies a transport fault. Falling back
    // either way keeps a cause with no code from being dropped silently.
    const label = depth === 0
      ? (current.message || current.code)
      : (current.code || current.message);

    if (label) {
      const text = String(label);
      // undici repeats itself down the chain; the same string twice adds nothing.
      if (!parts.includes(text)) parts.push(text);
    }

    current = current.cause;
    depth++;
  }

  return parts.join(': ') || 'unknown error';
}
