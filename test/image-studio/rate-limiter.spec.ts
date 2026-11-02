// @vitest-environment node
/**
 * US-10.1 T7 - the per-IP fixed-window rate limiter (FR-66, FR-67, FR-68, SD-16, D-1; plan DD-8).
 *
 * PINNED CONTRACT (server/image-studio/rate-limiter.js):
 *   createRateLimiter({ limit, windowMs, now }) -> { tryConsume(ip) , trackedKeys() }
 *   tryConsume(ip) is ONE synchronous check-and-increment returning { allowed: boolean, retryAfterSeconds: number }
 *     - allowed requests are counted; a refused request is NOT counted and does not move the window;
 *     - the window of a key starts at its first counted request (D-1) and lasts `windowMs`;
 *     - a refusal carries retryAfterSeconds = whole seconds left in the window, ROUNDED UP (SD-16).
 *   trackedKeys() -> number of keys currently held. Entries are swept on access, so after the hour no key older than the
 *     window is retained (FR-67: tracked keys never exceed the IPs active in the last hour).
 * `now` is injected; there is no timer, no wall clock. The exact boundary instant (now === start + windowMs) is not
 * asserted (the Specification says "ends exactly one hour later" without fixing the inclusive side); one ms either side is.
 */
import { describe, it, expect } from 'vitest';
import { makeFakeClock } from './helpers/fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

const HOUR = 3_600_000;

async function limiter(clock = makeFakeClock(0)) {
  const { createRateLimiter } = await load('../../server/image-studio/rate-limiter.js');
  return { clock, rl: createRateLimiter({ limit: 30, windowMs: HOUR, now: () => clock.now() }) };
}

describe('createRateLimiter - the 30 per hour rule', () => {
  it('FR-66 / AC-42: requests 1 to 30 from one key are allowed and the 31st is refused', async () => {
    const { rl } = await limiter();
    for (let i = 1; i <= 30; i++) expect(rl.tryConsume('1.2.3.4').allowed, `request ${i}`).toBe(true);
    expect(rl.tryConsume('1.2.3.4').allowed).toBe(false);
    expect(rl.tryConsume('1.2.3.4').allowed).toBe(false);
  });

  it('FR-66: the limit is a constructor value, not a hard-coded 30', async () => {
    const { createRateLimiter } = await load('../../server/image-studio/rate-limiter.js');
    const rl = createRateLimiter({ limit: 2, windowMs: 1000, now: () => 0 });
    expect(rl.tryConsume('k').allowed).toBe(true);
    expect(rl.tryConsume('k').allowed).toBe(true);
    expect(rl.tryConsume('k').allowed).toBe(false);
  });

  it('FR-66: 31 concurrent tryConsume calls never let a key pass 30 (single atomic check-and-increment)', async () => {
    const { rl } = await limiter();
    const results = await Promise.all(Array.from({ length: 31 }, async () => rl.tryConsume('9.9.9.9')));
    expect(results.filter((r: any) => r.allowed)).toHaveLength(30);
    expect(results.filter((r: any) => !r.allowed)).toHaveLength(1);
  });

  it('FR-66: two keys are isolated - exhausting one leaves the other untouched', async () => {
    const { rl } = await limiter();
    for (let i = 0; i < 30; i++) rl.tryConsume('a');
    expect(rl.tryConsume('a').allowed).toBe(false);
    expect(rl.tryConsume('b').allowed).toBe(true);
    for (let i = 0; i < 29; i++) expect(rl.tryConsume('b').allowed).toBe(true);
    expect(rl.tryConsume('b').allowed).toBe(false);
  });
});

describe('createRateLimiter - the window (D-1, FR-67)', () => {
  it('D-1: the window starts at the key\'s FIRST counted request, not at clock-aligned hours', async () => {
    const { rl, clock } = await limiter(makeFakeClock(1_234_567));
    rl.tryConsume('k'); // first counted request at 1 234 567
    clock.advance(HOUR - 1);
    for (let i = 0; i < 29; i++) rl.tryConsume('k');
    expect(rl.tryConsume('k').allowed).toBe(false); // one ms before the hour is over
    clock.advance(2); // one ms after
    expect(rl.tryConsume('k').allowed).toBe(true);
  });

  it('D-1 / FR-67: after the window the counter is reset - a full 30 are allowed again and the 31st of the NEW window is refused', async () => {
    const { rl, clock } = await limiter();
    for (let i = 0; i < 30; i++) rl.tryConsume('k');
    expect(rl.tryConsume('k').allowed).toBe(false);
    clock.advance(HOUR + 1);
    for (let i = 1; i <= 30; i++) expect(rl.tryConsume('k').allowed, `request ${i} of the new window`).toBe(true);
    expect(rl.tryConsume('k').allowed).toBe(false);
  });

  it('D-1: the new window starts at the first request after expiry, so it lasts a full hour from THAT request', async () => {
    const { rl, clock } = await limiter();
    rl.tryConsume('k');
    clock.advance(HOUR * 2); // long idle
    for (let i = 0; i < 30; i++) rl.tryConsume('k'); // first of these starts the new window at t = 2h
    clock.advance(HOUR - 1);
    expect(rl.tryConsume('k').allowed).toBe(false);
    clock.advance(2);
    expect(rl.tryConsume('k').allowed).toBe(true);
  });

  it('FR-67: a refused request does not extend or restart the window', async () => {
    const { rl, clock } = await limiter();
    for (let i = 0; i < 30; i++) rl.tryConsume('k'); // window starts at t = 0
    clock.advance(30 * 60_000);
    expect(rl.tryConsume('k').allowed).toBe(false); // refused at +30 min
    clock.advance(30 * 60_000 + 1); // +60 min +1 ms from the FIRST request
    expect(rl.tryConsume('k').allowed).toBe(true);
  });

  it('FR-67: tracked keys never exceed the IPs active in the last hour (expired entries are swept on access)', async () => {
    const { rl, clock } = await limiter();
    for (let i = 0; i < 100; i++) rl.tryConsume(`10.0.0.${i}`);
    expect(rl.trackedKeys()).toBe(100);
    clock.advance(HOUR + 1);
    rl.tryConsume('192.168.0.1'); // any access sweeps
    expect(rl.trackedKeys()).toBe(1);
    clock.advance(30 * 60_000);
    rl.tryConsume('192.168.0.2');
    expect(rl.trackedKeys()).toBe(2);
  });

  it('FR-67: a key still inside its window survives the sweep (only expired keys are dropped)', async () => {
    const { rl, clock } = await limiter();
    rl.tryConsume('old');
    clock.advance(40 * 60_000);
    rl.tryConsume('mid');
    clock.advance(30 * 60_000); // old is 70 min old (expired), mid is 30 min old
    rl.tryConsume('new');
    expect(rl.trackedKeys()).toBe(2); // mid + new
    for (let i = 0; i < 29; i++) rl.tryConsume('mid'); // mid had 1 counted + 29 = 30
    expect(rl.tryConsume('mid').allowed).toBe(false);
  });
});

describe('createRateLimiter - Retry-After (SD-16)', () => {
  it('SD-16: the refusal carries the whole seconds left in the window, rounded up (fresh window = 3600)', async () => {
    const { rl } = await limiter();
    for (let i = 0; i < 30; i++) rl.tryConsume('k');
    const refused = rl.tryConsume('k');
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBe(3600);
  });

  it('SD-16: 1 ms after the window start 3 599.999 s are left and the value is rounded UP to 3600', async () => {
    const { rl, clock } = await limiter();
    for (let i = 0; i < 30; i++) rl.tryConsume('k');
    clock.advance(1);
    expect(rl.tryConsume('k').retryAfterSeconds).toBe(3600);
  });

  it('SD-16: with 3 598.5 s left the value is 3599 (rounded up, never down to 3598)', async () => {
    const { rl, clock } = await limiter();
    for (let i = 0; i < 30; i++) rl.tryConsume('k');
    clock.advance(1500);
    expect(rl.tryConsume('k').retryAfterSeconds).toBe(3599);
  });

  it('SD-16: with exactly 61 000 ms left the value is 61, and with 1 ms left it is 1', async () => {
    const { rl, clock } = await limiter();
    for (let i = 0; i < 30; i++) rl.tryConsume('k');
    clock.advance(HOUR - 61_000);
    expect(rl.tryConsume('k').retryAfterSeconds).toBe(61);
    clock.advance(61_000 - 1);
    expect(rl.tryConsume('k').retryAfterSeconds).toBe(1);
  });

  it('SD-16: the value is a positive integer number of seconds', async () => {
    const { rl, clock } = await limiter();
    for (let i = 0; i < 30; i++) rl.tryConsume('k');
    clock.advance(123_456);
    const { retryAfterSeconds } = rl.tryConsume('k');
    expect(Number.isInteger(retryAfterSeconds)).toBe(true);
    expect(retryAfterSeconds).toBeGreaterThan(0);
  });
});
