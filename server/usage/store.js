import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Overridable so tests can exercise the real DDL against ':memory:' instead of the live database.
// Production never sets it, so the default path is unchanged.
//
// Lives under project-root data/, NOT server/ — `npm run server` runs `node --watch server/index.js`,
// which restarts the whole process on any file write under server/. WAL mode (below) writes to this
// file on every insertUsage() call, so keeping it inside server/ meant one fast call finishing while
// a slow one was still streaming would restart the server and kill the slow call's connection.
const DB_PATH = process.env.USAGE_DB_PATH || path.join(__dirname, '../../data/usage.db');

if (DB_PATH !== ':memory:') fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
if (DB_PATH !== ':memory:') db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS usage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    mode TEXT,
    task_label TEXT,
    product_name TEXT,
    store TEXT,
    lang TEXT,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cache_write_tokens INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_usage_log_ts ON usage_log (ts);

  -- One row per GENERATION, deliberately separate from usage_log.
  --
  -- Not a column on usage_log, for two reasons. There is no migration mechanism here — the schema
  -- is CREATE TABLE IF NOT EXISTS and data.db already holds real cost data, so adding a column to
  -- that statement is a silent no-op and the first INSERT naming it fails at runtime. And the grain
  -- is wrong: insertUsage runs per LLM CALL, while one generation makes many (Task A, Task B, Task C
  -- per locale, slug, FAQ, plus every repair attempt).
  --
  -- A new table name is the safe case for CREATE TABLE IF NOT EXISTS, and the cost data is never
  -- touched.
  CREATE TABLE IF NOT EXISTS generation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,
    store TEXT,
    locale TEXT,
    product_name TEXT,
    -- 'doc' | 'html' — which pipeline produced it, so the rollout can be compared against the path
    -- it replaced rather than against nothing.
    pipeline TEXT NOT NULL,
    -- 'ok' | 'repaired' | 'failed-schema' | 'failed-json-syntax'
    outcome TEXT NOT NULL,
    repairs_used INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_generation_log_ts ON generation_log (ts);
`);

const insertStmt = db.prepare(`
  INSERT INTO usage_log (
    ts, provider, model, mode, task_label, product_name, store, lang,
    input_tokens, output_tokens, cache_write_tokens, cache_read_tokens, cost_usd
  ) VALUES (
    @ts, @provider, @model, @mode, @taskLabel, @productName, @store, @lang,
    @inputTokens, @outputTokens, @cacheWriteTokens, @cacheReadTokens, @costUsd
  )
`);

// Synchronous by design — better-sqlite3 has no async API, and none is needed here.
function insertUsage(record) {
  insertStmt.run({
    ts: record.ts ?? Date.now(),
    provider: record.provider,
    model: record.model,
    mode: record.mode ?? null,
    taskLabel: record.taskLabel ?? null,
    productName: record.productName ?? null,
    store: record.store ?? null,
    lang: record.lang ?? null,
    inputTokens: record.inputTokens ?? 0,
    outputTokens: record.outputTokens ?? 0,
    cacheWriteTokens: record.cacheWriteTokens ?? 0,
    cacheReadTokens: record.cacheReadTokens ?? 0,
    costUsd: record.costUsd ?? 0,
  });
}

const insertGenerationStmt = db.prepare(`
  INSERT INTO generation_log (ts, store, locale, product_name, pipeline, outcome, repairs_used)
  VALUES (@ts, @store, @locale, @productName, @pipeline, @outcome, @repairsUsed)
`);

/**
 * Records the outcome of one product generation.
 *
 * The value is a RATE, not an alert: what fraction of products fail, and where. Store and locale
 * are what turn an anecdote ("a product failed") into something actionable ("EXPERT3D fails 12%%
 * of the time"). `failed-json-syntax` is counted separately from `failed-schema` on purpose — the
 * first says the model's JSON was malformed, the second that it was well-formed but wrong, and they
 * call for different fixes.
 */
function insertGeneration(record) {
  insertGenerationStmt.run({
    ts: record.ts ?? Date.now(),
    store: record.store ?? null,
    locale: record.locale ?? null,
    productName: record.productName ?? null,
    pipeline: record.pipeline,
    outcome: record.outcome,
    repairsUsed: record.repairsUsed ?? 0,
  });
}

function queryGenerations(filters = {}) {
  const clauses = [];
  const params = {};

  if (filters.from) { clauses.push('ts >= @from'); params.from = Number(filters.from); }
  if (filters.to) { clauses.push('ts <= @to'); params.to = Number(filters.to); }
  if (filters.store) { clauses.push('store = @store'); params.store = filters.store; }
  if (filters.outcome) { clauses.push('outcome = @outcome'); params.outcome = filters.outcome; }
  if (filters.pipeline) { clauses.push('pipeline = @pipeline'); params.pipeline = filters.pipeline; }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM generation_log ${where} ORDER BY ts DESC`).all(params);

  return rows.map(r => ({
    id: r.id,
    ts: r.ts,
    store: r.store,
    locale: r.locale,
    productName: r.product_name,
    pipeline: r.pipeline,
    outcome: r.outcome,
    repairsUsed: r.repairs_used,
  }));
}

function queryUsage(filters = {}) {
  const clauses = [];
  const params = {};

  if (filters.from) { clauses.push('ts >= @from'); params.from = Number(filters.from); }
  if (filters.to) { clauses.push('ts <= @to'); params.to = Number(filters.to); }
  if (filters.store) { clauses.push('store = @store'); params.store = filters.store; }
  if (filters.taskLabel) { clauses.push('task_label = @taskLabel'); params.taskLabel = filters.taskLabel; }
  if (filters.productName) { clauses.push('product_name LIKE @productName'); params.productName = `%${filters.productName}%`; }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM usage_log ${where} ORDER BY ts DESC`).all(params);

  return rows.map(r => ({
    id: r.id,
    ts: r.ts,
    provider: r.provider,
    model: r.model,
    mode: r.mode,
    taskLabel: r.task_label,
    productName: r.product_name,
    store: r.store,
    lang: r.lang,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    cacheWriteTokens: r.cache_write_tokens,
    cacheReadTokens: r.cache_read_tokens,
    costUsd: r.cost_usd,
  }));
}

export { insertUsage, queryUsage, insertGeneration, queryGenerations };
