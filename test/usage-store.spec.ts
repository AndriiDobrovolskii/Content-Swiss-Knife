/**
 * usage-store.spec.ts
 *
 * The generation-outcome log. Exercises the REAL DDL and the real statements against an in-memory
 * SQLite database, so the schema is proven rather than assumed.
 *
 * WHY generation_log IS A NEW TABLE AND NOT A COLUMN ON usage_log — both reasons verified against
 * the code, and either alone is decisive:
 *
 *   1. THERE IS NO MIGRATION MECHANISM. The schema is a single `CREATE TABLE IF NOT EXISTS`, and
 *      server/usage/data.db already holds real cost data. Editing that statement is a silent no-op
 *      on an existing database — the column never appears, and the first INSERT naming it fails at
 *      runtime. Adding one would mean inventing a migration system.
 *   2. WRONG GRAIN. insertUsage is called from the /api/llm/generate route, so usage_log is one row
 *      per LLM CALL. One product generation makes many — Task A, Task B, Task C per locale, slug,
 *      FAQ, plus every repair attempt. A per-generation outcome has nowhere to live in it.
 *
 * A fresh table sidesteps both: `CREATE TABLE IF NOT EXISTS` on a name that does not exist yet is
 * exactly the safe case, and the existing cost data is never touched.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

type Store = typeof import('../server/usage/store.js');

/** Fresh in-memory database per test — resetModules re-runs the module-init DDL. */
async function freshStore(): Promise<Store> {
  vi.resetModules();
  process.env['USAGE_DB_PATH'] = ':memory:';
  return import('../server/usage/store.js');
}

const GEN = {
  store: 'EXPERT3D',
  locale: 'uk-UA',
  productName: 'Ortur H20 20 W',
  pipeline: 'doc' as const,
  outcome: 'ok' as const,
  repairsUsed: 0,
};

beforeEach(() => {
  delete process.env['USAGE_DB_PATH'];
});

describe('generation_log', () => {
  it('exists as soon as the module loads — the DDL runs at init, not on first write', async () => {
    const store = await freshStore();
    // Querying before any insert would throw "no such table" if the DDL were lazy.
    expect(store.queryGenerations()).toEqual([]);
  });

  it('round-trips a generation record', async () => {
    const store = await freshStore();
    store.insertGeneration(GEN);

    const rows = store.queryGenerations();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      store: 'EXPERT3D',
      locale: 'uk-UA',
      productName: 'Ortur H20 20 W',
      pipeline: 'doc',
      outcome: 'ok',
      repairsUsed: 0,
    });
    expect(typeof rows[0].ts).toBe('number');
  });

  /** The four outcomes the rate is computed from. */
  it.each(['ok', 'repaired', 'failed-schema', 'failed-json-syntax'])(
    'accepts the %s outcome',
    async outcome => {
      const store = await freshStore();
      store.insertGeneration({ ...GEN, outcome: outcome as never });
      expect(store.queryGenerations()[0].outcome).toBe(outcome);
    },
  );

  /**
   * Store and locale are what turn an anecdote into a rate — "EXPERT3D fails 12% of the time" is
   * actionable, "a product failed" is not.
   */
  it('filters by store, so a bad store reads as a pattern', async () => {
    const store = await freshStore();
    store.insertGeneration({ ...GEN, store: 'EXPERT3D' });
    store.insertGeneration({ ...GEN, store: 'Center 3D Print' });

    expect(store.queryGenerations({ store: 'EXPERT3D' })).toHaveLength(1);
    expect(store.queryGenerations({ store: 'EXPERT3D' })[0].store).toBe('EXPERT3D');
  });

  it('filters by outcome, so the failure rate is one query', async () => {
    const store = await freshStore();
    store.insertGeneration({ ...GEN, outcome: 'ok' });
    store.insertGeneration({ ...GEN, outcome: 'failed-schema' });
    store.insertGeneration({ ...GEN, outcome: 'failed-schema' });

    expect(store.queryGenerations({ outcome: 'failed-schema' })).toHaveLength(2);
  });

  it('records how many repairs a generation needed', async () => {
    const store = await freshStore();
    store.insertGeneration({ ...GEN, outcome: 'repaired', repairsUsed: 2 });
    expect(store.queryGenerations()[0].repairsUsed).toBe(2);
  });

  it('tolerates a record with only the required fields', async () => {
    const store = await freshStore();
    expect(() => store.insertGeneration({ outcome: 'ok', pipeline: 'html' })).not.toThrow();
    expect(store.queryGenerations()[0].store).toBeNull();
  });
});

describe('usage_log is untouched', () => {
  /**
   * The point of a separate table. If adding generation_log had disturbed the existing schema, this
   * is where it would show — the cost data is the thing that must not break.
   */
  it('still accepts and returns a usage row alongside the new table', async () => {
    const store = await freshStore();
    store.insertUsage({
      provider: 'anthropic', model: 'claude-sonnet-5', mode: 'json',
      taskLabel: 'Doc (base)', store: 'EXPERT3D', inputTokens: 10, outputTokens: 20, costUsd: 0.5,
    });

    const rows = store.queryUsage();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ provider: 'anthropic', costUsd: 0.5, taskLabel: 'Doc (base)' });
  });

  it('keeps the two tables independent', async () => {
    const store = await freshStore();
    store.insertGeneration(GEN);
    expect(store.queryUsage()).toEqual([]);
  });
});
