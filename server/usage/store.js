import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

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

export { insertUsage, queryUsage };
