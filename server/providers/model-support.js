// Server-side view of the model catalog. Imports the SAME file the Angular app imports
// (src/prompt-core/model-catalog.json) via an import attribute, so there is no mirror to
// keep in sync — the catalog exists once, on disk, and both runtimes read it.
//
// `npm run server` runs from the repo root, so this relative path resolves. The production
// Angular build inlines the JSON into the bundle and never reads it from disk.
import catalog from '../../src/prompt-core/model-catalog.json' with { type: 'json' };

const LEVEL_ORDER = ['disabled', 'between_tools', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];

/** True when the catalog entry is an image-generation model (its `modalities` include 'image'). */
export function isImageModel(entry) {
  return Array.isArray(entry?.modalities) && entry.modalities.includes('image');
}

/** Pure derivation of the text-only model list: drops every image entry, keeps the original order
 *  and never mutates its input. Applied once to the raw JSON list below, so findModel, defaultModel,
 *  resolveSlot (and its tier fallback) and clampLevel can never see an image entry — even if a later
 *  edit reorders the JSON. An image entry carries no `levels`, so one reaching clampLevel would throw. */
export function textModelsOf(entries) {
  return entries.filter(entry => !isImageModel(entry));
}

/** Every image-generation model across all providers, in catalog order. */
export const IMAGE_MODELS = catalog.providers.flatMap(p => p.models.filter(isImageModel));

/** The text-only view of the catalog every existing text path reads. */
const TEXT_PROVIDERS = catalog.providers.map(p => ({ ...p, models: textModelsOf(p.models) }));

export function findProvider(provider) {
  return TEXT_PROVIDERS.find(p => p.id === provider);
}

export function findImageModel(modelId) {
  return IMAGE_MODELS.find(m => m.id === modelId);
}

/** Resolve an image-model id from a request body. Accepts only an entry whose `modalities` include
 *  'image'; a text model id, an unknown id or a non-string value is a client error (400
 *  INVALID_REQUEST). The error carries only `status` and `code`, never the offending value. */
export function resolveImageModel(modelId) {
  const model = typeof modelId === 'string' ? findImageModel(modelId) : undefined;
  if (!model) {
    const err = new Error('The requested model is not an image model.');
    err.status = 400;
    err.code = 'INVALID_REQUEST';
    throw err;
  }
  return model;
}

export function isKnownProvider(provider) {
  return Boolean(findProvider(provider));
}

export function findModel(provider, modelId) {
  return findProvider(provider)?.models.find(m => m.id === modelId);
}

export function defaultModel(provider) {
  return findProvider(provider)?.models[0];
}

/** Snap `level` onto the nearest level the model accepts. Mirrors clampLevel() in
 *  src/prompt-core/model-catalog.ts — ties resolve upward, so a level a model can't do is
 *  never silently downgraded to no-thinking. Defensive: the UI already only offers valid
 *  levels, but the request body is client input and must not be trusted. */
export function clampLevel(provider, modelId, level) {
  const model = findModel(provider, modelId) ?? defaultModel(provider);
  if (!model) return 'medium';
  if (model.levels.includes(level)) return level;

  const want = LEVEL_ORDER.indexOf(level);
  if (want === -1) return model.defaultLevel;

  return model.levels.reduce((best, candidate) => {
    const dBest = Math.abs(LEVEL_ORDER.indexOf(best) - want);
    const dCand = Math.abs(LEVEL_ORDER.indexOf(candidate) - want);
    if (dCand < dBest) return candidate;
    if (dCand === dBest && LEVEL_ORDER.indexOf(candidate) > LEVEL_ORDER.indexOf(best)) return candidate;
    return best;
  }, model.levels[0]);
}

/** Resolve one slot ({ model, level }) from a request body into a validated
 *  { model, level, maxOutputTokens } triple. An unknown or missing model falls back to a
 *  model of `preferTier` rather than erroring — a stale client should degrade, not break.
 *
 *  The tier matters: without it a request carrying no settings would route the Fast slot to
 *  the catalog's first entry (a premium model), quietly running translations on Sonnet. */
export function resolveSlot(provider, slot, preferTier = 'premium') {
  const model = findModel(provider, slot?.model)
    ?? findProvider(provider)?.models.find(m => m.tier === preferTier)
    ?? defaultModel(provider);
  if (!model) throw new Error(`No models registered for provider "${provider}".`);
  return {
    model: model.id,
    level: clampLevel(provider, model.id, slot?.level ?? model.defaultLevel),
    maxOutputTokens: model.maxOutputTokens,
  };
}
