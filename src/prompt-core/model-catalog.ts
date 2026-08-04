import catalog from './model-catalog.json';

/** Providers selectable from the settings menu. OpenAI stays reachable via LLM_PROVIDER
 *  in .env but is deliberately not offered in the UI — it has no thinking levels. */
export type ProviderId = 'anthropic' | 'gemini';

/** Every thinking level any provider understands, ordered weakest → strongest.
 *  Individual models accept only a subset (see ModelSpec.levels) — Gemini 3.1 Pro has no
 *  'minimal' and cannot disable thinking at all; Anthropic has no 'minimal'. */
export type ThinkingLevel = 'disabled' | 'minimal' | 'low' | 'medium' | 'high';

/** Ordinal scale used to clamp a level onto a model that doesn't accept it. */
const LEVEL_ORDER: ThinkingLevel[] = ['disabled', 'minimal', 'low', 'medium', 'high'];

export interface ModelSpec {
  /** Wire id sent to the SDK. */
  id: string;
  label: string;
  /** Advisory cost/speed hint for the settings UI. Does not restrict which slot the model goes in. */
  tier: 'premium' | 'fast';
  /** Exactly what this model's API accepts — the settings UI renders nothing else. */
  levels: ThinkingLevel[];
  defaultLevel: ThinkingLevel;
  /**
   * The model's real output ceiling; providers use it for max_tokens / maxOutputTokens.
   *
   * Two premium Claude models sit at different values on purpose, and the JSON cannot say why.
   * On Anthropic this caps thinking AND response text together, and Sonnet 4.6's effort ladder sits
   * a rung below Sonnet 5's (4.6 @ high ≈ 5 @ medium), so 4.6 spends appreciably more of the budget
   * thinking to reach the same artifact — 64000 truncated a `Doc (base)` run mid-JSON. 4.6 therefore
   * gets its true 128K ceiling while Sonnet 5 stays at 64000, where it works. Only tokens actually
   * generated are billed, so a higher ceiling costs nothing until it is used.
   */
  maxOutputTokens: number;
}

export interface ProviderSpec {
  id: ProviderId;
  label: string;
  models: ModelSpec[];
}

/** Single source of truth, shared verbatim with the server via model-catalog.json. */
export const MODEL_CATALOG = catalog.providers as ProviderSpec[];

export function findProvider(provider: string): ProviderSpec | undefined {
  return MODEL_CATALOG.find(p => p.id === provider);
}

export function findModel(provider: string, modelId: string): ModelSpec | undefined {
  return findProvider(provider)?.models.find(m => m.id === modelId);
}

/** The model a slot falls back to when the requested one isn't in the catalog. */
export function defaultModel(provider: string): ModelSpec | undefined {
  return findProvider(provider)?.models[0];
}

/** Snap `level` onto the nearest level the model actually accepts.
 *
 *  Nearest-neighbour on LEVEL_ORDER rather than "fall back to defaultLevel", because it
 *  preserves the user's intent across a model switch: Flash 3.6 @ minimal → Gemini 3.1 Pro
 *  becomes 'low' (still the cheapest Pro offers), not 'medium' (a silent cost increase).
 *  Ties resolve upward — never silently drop a user to no-thinking at all. */
export function clampLevel(provider: string, modelId: string, level: unknown): ThinkingLevel {
  const model = findModel(provider, modelId) ?? defaultModel(provider);
  if (!model) return 'medium';
  if (model.levels.includes(level as ThinkingLevel)) return level as ThinkingLevel;

  const want = LEVEL_ORDER.indexOf(level as ThinkingLevel);
  if (want === -1) return model.defaultLevel;

  return model.levels.reduce((best, candidate) => {
    const dBest = Math.abs(LEVEL_ORDER.indexOf(best) - want);
    const dCand = Math.abs(LEVEL_ORDER.indexOf(candidate) - want);
    if (dCand < dBest) return candidate;
    // Tie → prefer the stronger level.
    if (dCand === dBest && LEVEL_ORDER.indexOf(candidate) > LEVEL_ORDER.indexOf(best)) return candidate;
    return best;
  }, model.levels[0]);
}
