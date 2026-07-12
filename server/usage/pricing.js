// $ per 1M tokens, per Claude model. Update here when Anthropic changes prices —
// past usage_log rows keep the cost computed at insert time, so this only affects new rows.
const DEFAULT_PRICES = {
  // Claude Sonnet 5 — INTRODUCTORY pricing, in effect through 2026-08-31.
  // TODO(2026-09-01): switch to standard rates → { in: 3.00, out: 15.00, cw: 6.00, cr: 0.30 }
  // cw is 2x base input because this codebase writes 1h ephemeral caches (ttl: '1h'),
  // not 5m caches (which would be 1.25x). cr is 0.1x base input.
  'claude-sonnet-5':   { in: 2.00, out: 10.00, cw: 4.00, cr: 0.20 },
  'claude-sonnet-4-6': { in: 3.00, out: 15.00, cw: 3.75, cr: 0.30 },
  'claude-sonnet-4-5': { in: 3.00, out: 15.00, cw: 3.75, cr: 0.30 },
  'claude-sonnet-4':   { in: 3.00, out: 15.00, cw: 3.75, cr: 0.30 },
  'claude-opus-4-8':   { in: 5.00, out: 25.00, cw: 6.25, cr: 0.50 },
  'claude-opus-4-7':   { in: 5.00, out: 25.00, cw: 6.25, cr: 0.50 },
  'claude-opus-4-6':   { in: 5.00, out: 25.00, cw: 6.25, cr: 0.50 },
  'claude-opus-4-5':   { in: 5.00, out: 25.00, cw: 6.25, cr: 0.50 },
  'claude-haiku-4-5':  { in: 1.00, out: 5.00,  cw: 1.25, cr: 0.10 },
  'claude-haiku-3-5':  { in: 0.80, out: 4.00,  cw: 1.00, cr: 0.08 },
};

const FALLBACK_PRICE = { in: 3.00, out: 15.00, cw: 3.75, cr: 0.30 };

function getPrices(model) {
  if (DEFAULT_PRICES[model]) return DEFAULT_PRICES[model];
  for (const key of Object.keys(DEFAULT_PRICES)) {
    if (model.includes(key) || key.includes(model)) return DEFAULT_PRICES[key];
  }
  return FALLBACK_PRICE;
}

function computeCost(model, usage) {
  const p = getPrices(model);
  const M = 1_000_000;
  const inTok = usage.inputTokens || 0;
  const outTok = usage.outputTokens || 0;
  const cwTok = usage.cacheWriteTokens || 0;
  const crTok = usage.cacheReadTokens || 0;
  return (inTok * p.in + outTok * p.out + cwTok * p.cw + crTok * p.cr) / M;
}

export { DEFAULT_PRICES, getPrices, computeCost };
