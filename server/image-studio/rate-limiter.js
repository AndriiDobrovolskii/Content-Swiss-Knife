/**
 * Per-IP fixed-window rate limiter for the Image Studio generate route (US-10.1, DD-8).
 *
 * Contract:
 *   createRateLimiter({ limit, windowMs, now }) -> { tryConsume(key), trackedKeys() }
 *
 * - `tryConsume` is one synchronous check-and-increment. There is no `await` between the check and the
 *   increment, so concurrent requests cannot take a key past `limit` (FR-66).
 * - A key's window starts at its first counted request and lasts `windowMs` (D-1). A refused request is
 *   not counted and does not move the window (FR-67).
 * - A refusal carries `retryAfterSeconds`, the whole seconds left in the window, rounded up (SD-16).
 * - Expired entries are swept on access, so the map never holds more keys than were active inside the last
 *   window (FR-67). There is no timer: `now` is injected and nothing runs between calls.
 *
 * In-memory and per process by design: a restart resets every counter, and a second instance would keep its
 * own counts (accepted in the plan; one Railway instance today).
 */

/**
 * @param {{ limit: number, windowMs: number, now: () => number }} options
 */
export function createRateLimiter({ limit, windowMs, now }) {
  /** @type {Map<string, { start: number, count: number }>} */
  const entries = new Map();

  function sweep(at) {
    for (const [key, entry] of entries) {
      if (at >= entry.start + windowMs) entries.delete(key);
    }
  }

  return {
    /**
     * @param {string} key
     * @returns {{ allowed: boolean, retryAfterSeconds: number }}
     */
    tryConsume(key) {
      const at = now();
      sweep(at);

      const entry = entries.get(key);
      if (!entry) {
        entries.set(key, { start: at, count: 1 });
        return { allowed: true, retryAfterSeconds: 0 };
      }

      if (entry.count < limit) {
        entry.count += 1;
        return { allowed: true, retryAfterSeconds: 0 };
      }

      const msLeft = entry.start + windowMs - at;
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(msLeft / 1000)) };
    },

    /** Number of keys currently held (after the most recent sweep). */
    trackedKeys() {
      return entries.size;
    },
  };
}
