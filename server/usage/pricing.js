// $ per 1M tokens, per Claude model. Update here when Anthropic changes prices —
// past usage_log rows keep the cost computed at insert time, so this only affects new rows.
const DEFAULT_PRICES = {
  // Claude Sonnet 5 — INTRODUCTORY pricing, in effect through 2026-08-31.
  // TODO(2026-09-01): switch to standard rates → { in: 3.00, out: 15.00, cw: 6.00, cr: 0.30 }
  // cw is 2x base input because this codebase writes 1h ephemeral caches (ttl: '1h'),
  // not 5m caches (which would be 1.25x). cr is 0.1x base input.
  'claude-sonnet-5':   { in: 2.00, out: 10.00, cw: 4.00, cr: 0.20 },
  // Selectable in the settings menu, so its cw follows the same 2x-base 1h-cache rule as
  // Sonnet 5 above. claude-haiku-4-5 below is likewise live (it's the fast-tier model — see
  // ANTHROPIC_MODEL_FAST in server/providers/anthropic.js) and follows the same 2x-base 1h-cache
  // rule. The remaining dormant/unselectable entries below those two still carry the 1.25x 5m rate.
  'claude-sonnet-4-6': { in: 3.00, out: 15.00, cw: 6.00, cr: 0.30 },
  'claude-sonnet-4-5': { in: 3.00, out: 15.00, cw: 3.75, cr: 0.30 },
  'claude-sonnet-4':   { in: 3.00, out: 15.00, cw: 3.75, cr: 0.30 },
  'claude-opus-4-8':   { in: 5.00, out: 25.00, cw: 6.25, cr: 0.50 },
  'claude-opus-4-7':   { in: 5.00, out: 25.00, cw: 6.25, cr: 0.50 },
  'claude-opus-4-6':   { in: 5.00, out: 25.00, cw: 6.25, cr: 0.50 },
  'claude-opus-4-5':   { in: 5.00, out: 25.00, cw: 6.25, cr: 0.50 },
  'claude-haiku-4-5':  { in: 1.00, out: 5.00,  cw: 2.00, cr: 0.10 },
  'claude-haiku-3-5':  { in: 0.80, out: 4.00,  cw: 1.00, cr: 0.08 },

  // Google Gemini. `out` covers thinking tokens too — GeminiProvider folds thoughtsTokenCount
  // into outputTokens, because Google bills reasoning at the full output rate.
  // cw is 0: implicit context caching has no per-token write charge (storage is billed per
  // hour, which this schema doesn't model). cr is the cached-input rate.
  // NOTE: Pro's >200k-token tier ($4.00 in / $18.00 out) is NOT modeled — prompts that large
  // will under-report here. Split the entry if that becomes a real usage pattern.
  'gemini-3.1-pro-preview': { in: 2.00, out: 12.00, cw: 0, cr: 0.20 },
  'gemini-3.6-flash':       { in: 1.50, out:  7.50, cw: 0, cr: 0.15 },
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
