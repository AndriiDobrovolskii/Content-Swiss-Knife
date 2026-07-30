// Server-side view of the model catalog. Imports the SAME file the Angular app imports
// (src/prompt-core/model-catalog.json) via an import attribute, so there is no mirror to
// keep in sync — the catalog exists once, on disk, and both runtimes read it.
//
// `npm run server` runs from the repo root, so this relative path resolves. The production
// Angular build inlines the JSON into the bundle and never reads it from disk.
import catalog from '../../src/prompt-core/model-catalog.json' with { type: 'json' };

const LEVEL_ORDER = ['disabled', 'minimal', 'low', 'medium', 'high'];

export function findProvider(provider) {
  return catalog.providers.find(p => p.id === provider);
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
