import { findImageModel } from '../providers/model-support.js';

// $ per 1M tokens, per Claude model. Update here when Anthropic changes prices —
// past usage_log rows keep the cost computed at insert time, so this only affects new rows.
const DEFAULT_PRICES = {
  // Claude Sonnet 5.5. Listed BEFORE claude-sonnet-5 so a dated id such as
  // claude-sonnet-5-5-<date> hits this entry in the substring loop, not the shorter key.
  // cw is 2x base input (1h ephemeral caches), cr is 0.1x, as for Sonnet 5.
  'claude-sonnet-5-5': { in: 2.00, out: 10.00, cw: 4.00, cr: 0.20 },
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

// Gemini 3.7 Flash — introductory rate through 2026-12-31, standard rate after.
// Evaluated per lookup (not at module load) so a long-running server picks up the
// switch without a restart.
function gemini37FlashPrice(now) {
  const standard = { in: 1.50, out: 7.50, cw: 0, cr: 0.15 };
  const promo = { in: 0.75, out: 3.75, cw: 0, cr: 0.075 };
  return now < new Date('2027-01-01T00:00:00Z') ? promo : standard;
}

// Gemini 3.8 Flash — same promo window and rates as 3.7 Flash. A helper of its own, so the
// model can never fall through to FALLBACK_PRICE (which would overstate it 4x) or to another
// Gemini entry in the substring loop.
function gemini38FlashPrice(now) {
  const standard = { in: 1.50, out: 7.50, cw: 0, cr: 0.15 };
  const promo = { in: 0.75, out: 3.75, cw: 0, cr: 0.075 };
  return now < new Date('2027-01-01T00:00:00Z') ? promo : standard;
}

// `now` is an injectable clock for tests; production callers omit it.
function getPrices(model, now = new Date()) {
  if (model === 'gemini-3.7-flash') return gemini37FlashPrice(now);
  if (model === 'gemini-3.8-flash') return gemini38FlashPrice(now);
  if (DEFAULT_PRICES[model]) return DEFAULT_PRICES[model];
  for (const key of Object.keys(DEFAULT_PRICES)) {
    if (model.includes(key) || key.includes(model)) return DEFAULT_PRICES[key];
  }
  return FALLBACK_PRICE;
}

// --- Image Studio (US-10.1, FR-70, DD-12) ---------------------------------------------------------
// Image models are billed per returned NON-thought image, not per token, so their prices live in a
// table of their own, keyed by the EXACT catalogue model id. They are deliberately absent from
// DEFAULT_PRICES: the image path never calls getPrices(), so it can never reach the substring loop
// or FALLBACK_PRICE (which would silently bill an image at a text-token rate).
//
// $ per generated image. Source: V-5 of docs/evidence/US-10.1-pre-implementation-checks.md
// (Gemini Developer API image tier pricing, recorded 2026-11-01). Update here and in the catalogue
// together; test/image-studio/image-model-consistency.spec.ts fails until the two agree.
const IMAGE_PRICES = {
  'gemini-3.1-flash-image': 0.03,
  'gemini-3-pro-image': 0.06,
};

// Thrown when an image model has no per-image price. The generate handler maps it to a 500
// PRICE_NOT_CONFIGURED before any usage row is written (FR-26 precedence, FR-70).
class PriceNotConfiguredError extends Error {
  constructor(modelId) {
    super(`No per-image price configured for model "${modelId}"`);
    this.name = 'PriceNotConfiguredError';
    this.modelId = modelId;
  }
}

// Exact key only: a near-miss or unknown id throws instead of matching by substring.
function getImagePrice(modelId) {
  if (typeof modelId === 'string' && Object.hasOwn(IMAGE_PRICES, modelId)) return IMAGE_PRICES[modelId];
  throw new PriceNotConfiguredError(modelId);
}

// `nonThoughtImageCount` is the classifier's imageCount (thought images are already excluded, FR-84).
function computeImageCost(modelId, nonThoughtImageCount) {
  const unit = getImagePrice(modelId);
  return unit * nonThoughtImageCount;
}

function computeCost(model, usage) {
  // An image model is never priced by tokens; the catalogue `modalities` is the only list of them.
  if (findImageModel(model)) {
    throw new Error(`computeCost cannot price image model "${model}"; use computeImageCost`);
  }
  const p = getPrices(model);
  const M = 1_000_000;
  const inTok = usage.inputTokens || 0;
  const outTok = usage.outputTokens || 0;
  const cwTok = usage.cacheWriteTokens || 0;
  const crTok = usage.cacheReadTokens || 0;
  return (inTok * p.in + outTok * p.out + cwTok * p.cw + crTok * p.cr) / M;
}

export { DEFAULT_PRICES, getPrices, computeCost, IMAGE_PRICES, getImagePrice, computeImageCost, PriceNotConfiguredError };
