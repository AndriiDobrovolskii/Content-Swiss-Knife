/**
 * Per-IP fixed-window rate limiter for the Image Studio generate route (US-10.1, DD-8).
 *
 * Contract:
 *   createRateLimiter({ limit, windowMs, now }) -> { tryConsume(key), tryConsumeUpTo(key, n), trackedKeys() }
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

    /**
     * Atomic partial grant (US-10.6 FR-8, NFR-6): counts min(remaining, n) units for `key` in ONE synchronous
     * check-and-increment (no `await` between the check and the increment). Granted units are counted exactly
     * like `tryConsume` units (same key, same window, same limit). When nothing is left it grants 0, carries
     * `retryAfterSeconds` (whole seconds left in the window, rounded up) and neither counts nor moves the window.
     * @param {string} key
     * @param {number} n units asked for (a positive integer)
     * @returns {{ granted: number, retryAfterSeconds: number }}
     */
    tryConsumeUpTo(key, n) {
      if (!Number.isInteger(n) || n < 1) return { granted: 0, retryAfterSeconds: 0 };

      const at = now();
      sweep(at);

      const entry = entries.get(key);
      const remaining = limit - (entry ? entry.count : 0);
      if (remaining < 1) {
        const msLeft = (entry ? entry.start : at) + windowMs - at;
        return { granted: 0, retryAfterSeconds: Math.max(1, Math.ceil(msLeft / 1000)) };
      }

      const granted = Math.min(remaining, n);
      if (entry) entry.count += granted;
      else entries.set(key, { start: at, count: granted });
      return { granted, retryAfterSeconds: 0 };
    },

    /** Number of keys currently held (after the most recent sweep). */
    trackedKeys() {
      return entries.size;
    },
  };
}
