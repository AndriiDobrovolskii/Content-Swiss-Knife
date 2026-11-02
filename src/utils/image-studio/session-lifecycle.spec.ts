/**
 * session-lifecycle.spec.ts - US-10.1 T30 (FR-48, FR-49, FR-50, FR-86; SD-32, SD-33, SD-41; D-23, D-24, D-25;
 * AC-25, AC-26, AC-27).
 *
 * PINNED CONTRACT (src/utils/image-studio/session-lifecycle.ts; pure, no clock: `now` is always a parameter):
 *   isExpired(lastActivity: number, now: number): boolean
 *       strictly more than 604 800 000 ms since last activity (SD-33); exactly 604 800 000 ms is KEPT
 *   pickEvictionVictims(metas: SessionMeta[], opts: { cap: number; leavingId?: string; inFlightId?: string; creatingId?: string }): string[]
 *       `metas` = the stored sessions BEFORE the creation. Returns the ids to delete, oldest last-activity first, so that
 *       metas.length - victims.length + 1 <= cap (D-25 heals a count above the cap). Candidates exclude leavingId,
 *       inFlightId and creatingId (D-23). Ties on last activity: smaller id in UTF-16 code-unit order (SD-41).
 *       When fewer candidates exist than needed it returns the candidates it has (never an excluded session).
 *       Pure: does not mutate `metas`.
 *   touchOnEvent(meta: SessionMeta, event: string, now: number): SessionMeta
 *       returns a COPY with lastActivity = now for exactly the SD-32 events 'commit' | 'cut' | 'downloaded-changed',
 *       and an UNCHANGED copy for everything else (e.g. 'open', 'select', 'view', 'sent-bytes-stored', 'composer-edit',
 *       'generation-start'). The input is never mutated.
 *
 * The D-24 test drives `pickEvictionVictims` through the in-memory SessionStorePort of fakes.ts (`createWithEviction`),
 * which is the real integration point: pick is called with the stored metas inside the port's single "transaction".
 * The fake's atomicity is a test double, so that test proves the CONTRACT the lifecycle relies on, not real IndexedDB
 * (residual R1 / N-1 of the plan).
 */
import { describe, it, expect } from 'vitest';
import { makeInMemorySessionStore, makeSession, type SessionMeta } from '../../../test/image-studio/helpers/fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const WEEK = 604_800_000;

/** Metas whose lastActivity order differs from their creation order. */
const meta = (id: string, createdAt: number, lastActivity: number): SessionMeta => makeSession(id, { createdAt, lastActivity }).meta;

/** 20 sessions s01..s20: created in id order, but activity stamps run in REVERSE (s20 is the least recently active). */
const twenty = (): SessionMeta[] =>
  Array.from({ length: 20 }, (_, i) => {
    const n = i + 1;
    return meta(`s${String(n).padStart(2, '0')}`, 1_000 + n, 10_000 - n * 10);
  });

describe('FR-48 / SD-33 / AC-25: seven-day expiry boundary', () => {
  it('AC-25 / SD-33: age 604 799 999 ms is kept', async () => {
    const { isExpired } = await load('./session-lifecycle');
    expect(isExpired(1_000, 1_000 + WEEK - 1)).toBe(false);
  });
  it('AC-25 / SD-33: age exactly 604 800 000 ms is kept', async () => {
    const { isExpired } = await load('./session-lifecycle');
    expect(isExpired(1_000, 1_000 + WEEK)).toBe(false);
  });
  it('AC-25 / SD-33: age 604 800 001 ms is expired', async () => {
    const { isExpired } = await load('./session-lifecycle');
    expect(isExpired(1_000, 1_000 + WEEK + 1)).toBe(true);
  });
  it('SD-33: a brand-new session (age 0) is not expired', async () => {
    const { isExpired } = await load('./session-lifecycle');
    expect(isExpired(5_000, 5_000)).toBe(false);
  });
});

describe('SD-32 / FR-48: what renews last activity (an exhaustive list)', () => {
  for (const event of ['commit', 'cut', 'downloaded-changed']) {
    it(`SD-32: the ${event} event sets lastActivity to now and leaves other fields alone`, async () => {
      const { touchOnEvent } = await load('./session-lifecycle');
      const m = meta('a', 100, 200);
      const out = touchOnEvent(m, event, 9_999);
      expect(out.lastActivity).toBe(9_999);
      expect({ ...out, lastActivity: 0 }).toEqual({ ...m, lastActivity: 0 });
    });
  }

  for (const event of ['open', 'select', 'view', 'sent-bytes-stored', 'composer-edit', 'generation-start']) {
    it(`SD-32: ${event} is NOT activity - lastActivity is unchanged`, async () => {
      const { touchOnEvent } = await load('./session-lifecycle');
      expect(touchOnEvent(meta('a', 100, 200), event, 9_999).lastActivity).toBe(200);
    });
  }

  it('SD-32: touchOnEvent never mutates its input', async () => {
    const { touchOnEvent } = await load('./session-lifecycle');
    const m = meta('a', 100, 200);
    const before = structuredClone(m);
    touchOnEvent(m, 'commit', 9_999);
    expect(m).toEqual(before);
  });
});

describe('FR-86: eviction order and the cap of 20', () => {
  it('FR-86 / C-36.3: at the cap the victim is the oldest LAST ACTIVITY, not the oldest created', async () => {
    const { pickEvictionVictims } = await load('./session-lifecycle');
    // s01 is the oldest created, but s20 has the oldest activity stamp.
    expect(pickEvictionVictims(twenty(), { cap: 20 })).toEqual(['s20']);
  });

  it('FR-86: a session renewed by a committed write is not the one deleted', async () => {
    const { pickEvictionVictims, touchOnEvent } = await load('./session-lifecycle');
    const metas = twenty().map((m) => (m.id === 's20' ? touchOnEvent(m, 'commit', 50_000) : m));
    expect(pickEvictionVictims(metas, { cap: 20 })).toEqual(['s19']);
  });

  it('FR-86: with fewer than 20 stored sessions nothing is deleted (19 stored, creating the 20th)', async () => {
    const { pickEvictionVictims } = await load('./session-lifecycle');
    expect(pickEvictionVictims(twenty().slice(0, 19), { cap: 20 })).toEqual([]);
  });

  it('FR-86: an empty store deletes nothing', async () => {
    const { pickEvictionVictims } = await load('./session-lifecycle');
    expect(pickEvictionVictims([], { cap: 20 })).toEqual([]);
  });

  it('D-25: a stored count of 21 is reduced to 20 by the next creation (two victims, oldest first)', async () => {
    const { pickEvictionVictims } = await load('./session-lifecycle');
    const metas = [...twenty(), meta('s21', 1_021, 10_000 - 21 * 10)];
    const victims = pickEvictionVictims(metas, { cap: 20 });
    expect(victims).toEqual(['s21', 's20']);
    expect(metas.length - victims.length + 1).toBe(20);
  });

  it('D-25: a stored count of 22 (two tabs) heals to 20 at the next creation', async () => {
    const { pickEvictionVictims } = await load('./session-lifecycle');
    const metas = [...twenty(), meta('s21', 1_021, 10_000 - 210), meta('s22', 1_022, 10_000 - 220)];
    expect(pickEvictionVictims(metas, { cap: 20 })).toEqual(['s22', 's21', 's20']);
  });

  it('FR-86: the input list is not mutated and the victims are returned oldest first', async () => {
    const { pickEvictionVictims } = await load('./session-lifecycle');
    const metas = [...twenty(), meta('s21', 1_021, 10_000 - 210)];
    const before = structuredClone(metas);
    pickEvictionVictims(metas, { cap: 20 });
    expect(metas).toEqual(before);
  });
});

describe('D-23 / AC-26 / AC-27: sessions that are never evicted', () => {
  it('D-23 / AC-26: the session being left is not deleted even when it holds the oldest stamp - the next oldest is', async () => {
    const { pickEvictionVictims } = await load('./session-lifecycle');
    expect(pickEvictionVictims(twenty(), { cap: 20, leavingId: 's20' })).toEqual(['s19']);
  });

  it('D-23 / AC-27: the source session of a model switch (the one being left) is protected the same way', async () => {
    const { pickEvictionVictims } = await load('./session-lifecycle');
    const metas = twenty();
    const victims = pickEvictionVictims(metas, { cap: 20, leavingId: 's20', inFlightId: undefined });
    expect(victims).not.toContain('s20');
    expect(victims).toHaveLength(1);
  });

  it('D-23: a session with a generation in flight is not deleted', async () => {
    const { pickEvictionVictims } = await load('./session-lifecycle');
    expect(pickEvictionVictims(twenty(), { cap: 20, inFlightId: 's20' })).toEqual(['s19']);
  });

  it('D-23: leaving AND in-flight both protected - the third oldest is chosen', async () => {
    const { pickEvictionVictims } = await load('./session-lifecycle');
    expect(pickEvictionVictims(twenty(), { cap: 20, leavingId: 's20', inFlightId: 's19' })).toEqual(['s18']);
  });

  it('D-23: the session being created is never a candidate', async () => {
    const { pickEvictionVictims } = await load('./session-lifecycle');
    expect(pickEvictionVictims(twenty(), { cap: 20, creatingId: 's20' })).toEqual(['s19']);
  });

  it('D-23: when no other session exists the cap is not exceeded and nothing is deleted', async () => {
    const { pickEvictionVictims } = await load('./session-lifecycle');
    expect(pickEvictionVictims([meta('only', 1, 1)], { cap: 1, leavingId: 'only' })).toEqual([]);
  });
});

describe('SD-41: ties on last activity', () => {
  it('SD-41: with all stamps equal the session with the smaller id is deleted', async () => {
    const { pickEvictionVictims } = await load('./session-lifecycle');
    const metas = Array.from({ length: 20 }, (_, i) => meta(`t${String.fromCharCode(97 + i)}`, 100 + i, 5_000)); // ta..tt
    expect(pickEvictionVictims(metas.slice().reverse(), { cap: 20 })).toEqual(['ta']);
  });

  it('SD-41: ids are compared in UTF-16 code-unit order (uppercase "B" 0x42 sorts before lowercase "a" 0x61; "10" before "9")', async () => {
    const { pickEvictionVictims } = await load('./session-lifecycle');
    const stamp = 5_000;
    const fill = Array.from({ length: 18 }, (_, i) => meta(`z${i}`, 1, stamp + 1 + i)); // newer, never candidates first
    expect(pickEvictionVictims([...fill, meta('a', 1, stamp), meta('B', 1, stamp)], { cap: 20 })).toEqual(['B']);
    const fill2 = Array.from({ length: 18 }, (_, i) => meta(`z${i}`, 1, stamp + 1 + i));
    expect(pickEvictionVictims([...fill2, meta('s-9', 1, stamp), meta('s-10', 1, stamp)], { cap: 20 })).toEqual(['s-10']);
  });

  it('SD-41: a tie is broken by id only, whatever the creation order', async () => {
    const { pickEvictionVictims } = await load('./session-lifecycle');
    // 'm-a' was created LAST and 'm-b' FIRST: an "older creation wins" rule would pick m-b; the id rule picks m-a.
    const metas = [
      ...Array.from({ length: 18 }, (_, i) => meta(`n${i}`, 1, 9_000 + i)),
      meta('m-a', 9_999, 5_000),
      meta('m-b', 1, 5_000),
    ];
    expect(pickEvictionVictims(metas, { cap: 20 })).toEqual(['m-a']);
  });
});

describe('D-24 / FR-86: the eviction pick runs inside the port\'s single transaction', () => {
  const quota = Object.assign(new Error('quota'), { name: 'StorageQuotaError' });

  it('FR-86 / AC-26: through createWithEviction a creation at the cap leaves exactly 20 stored sessions without the oldest-activity one', async () => {
    const { pickEvictionVictims } = await load('./session-lifecycle');
    const store = makeInMemorySessionStore();
    for (const m of twenty()) store.seed({ meta: m, turns: [] });
    const fresh = makeSession('s99', { createdAt: 20_000, lastActivity: 20_000 });
    const res = await store.createWithEviction(fresh, (metas) => pickEvictionVictims(metas, { cap: 20, creatingId: 's99' }));
    expect(res.created).toBe(true);
    expect(res.evictedIds).toEqual(['s20']);
    const ids = Object.keys(store.snapshot().sessions);
    expect(ids).toHaveLength(20);
    expect(ids).toContain('s99');
    expect(ids).not.toContain('s20');
  });

  it('D-24: a creation whose transaction fails (quota) deletes nothing - the stored set is unchanged', async () => {
    const { pickEvictionVictims } = await load('./session-lifecycle');
    const store = makeInMemorySessionStore();
    for (const m of twenty()) store.seed({ meta: m, turns: [] });
    const before = store.snapshot();
    store.failWrites(quota);
    const fresh = makeSession('s99', { createdAt: 20_000, lastActivity: 20_000 });
    await expect(store.createWithEviction(fresh, (metas) => pickEvictionVictims(metas, { cap: 20 }))).rejects.toBe(quota);
    expect(store.snapshot()).toEqual(before);
  });

  it('FR-86 / D-25 through the port: 21 stored sessions end at 20 after one creation', async () => {
    const { pickEvictionVictims } = await load('./session-lifecycle');
    const store = makeInMemorySessionStore();
    for (const m of [...twenty(), meta('s21', 1_021, 10_000 - 210)]) store.seed({ meta: m, turns: [] });
    const res = await store.createWithEviction(makeSession('s99', { createdAt: 30_000 }), (metas) => pickEvictionVictims(metas, { cap: 20, creatingId: 's99' }));
    expect(res.evictedIds).toEqual(['s21', 's20']);
    expect(Object.keys(store.snapshot().sessions)).toHaveLength(20);
  });
});
