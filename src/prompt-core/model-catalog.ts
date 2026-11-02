import catalog from './model-catalog.json';

/** Providers selectable from the settings menu. OpenAI stays reachable via LLM_PROVIDER
 *  in .env but is deliberately not offered in the UI — it has no thinking levels. */
export type ProviderId = 'anthropic' | 'gemini';

/** Every thinking level any provider understands, ordered weakest → strongest.
 *  Individual models accept only a subset (see ModelSpec.levels) — Gemini 3.1 Pro has no
 *  'minimal' and cannot disable thinking at all; Anthropic has no 'minimal'. Claude Sonnet 5.5
 *  cannot disable thinking either: its lowest rung is 'between_tools' (interleaved thinking
 *  between tool calls only), and it adds the 'xhigh' effort level. 'max' is a member of this
 *  ordering but no catalog model lists it, so it clamps to the nearest level the model offers. */
export type ThinkingLevel =
  'disabled' | 'between_tools' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

/** Ordinal scale used to clamp a level onto a model that doesn't accept it. */
const LEVEL_ORDER: ThinkingLevel[] = [
  'disabled', 'between_tools', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max',
];

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
   * On Anthropic this caps thinking AND response text together. Sonnet 5.5 gets its true 128K
   * ceiling because a high-effort run spends a large share of the budget thinking (64000
   * truncated a `Doc (base)` run mid-JSON on the 4.x line), while Sonnet 5 stays at 64000, where
   * it works. Only tokens actually generated are billed, so a higher ceiling costs nothing until
   * it is used.
   */
  maxOutputTokens: number;
}

export interface ProviderSpec {
  id: ProviderId;
  label: string;
  models: ModelSpec[];
}

/** An image-generation model (US-10.1). It has no thinking levels and no output-token ceiling, so it is
 *  a separate shape from ModelSpec: `levels` stays required on ModelSpec and is never made optional. */
export interface ImageModelSpec {
  id: string;
  label: string;
  /** Advisory cost/speed hint, as for ModelSpec. */
  tier: 'premium' | 'fast';
  modalities: ['image'];
  /** Input-token ceiling the BFF trim budgets against. */
  inputTokenLimit: number;
  /** Output resolutions this model accepts (a subset of the closed contract list). */
  resolutions: string[];
}

/** One raw entry of model-catalog.json: a text model or an image model. */
export type CatalogEntry = ModelSpec | ImageModelSpec;

interface RawProviderSpec {
  id: ProviderId;
  label: string;
  models: CatalogEntry[];
}

/** True for an image-generation entry (its `modalities` include 'image'). */
export function isImageModelSpec(entry: CatalogEntry): entry is ImageModelSpec {
  return 'modalities' in entry && Array.isArray(entry.modalities) && entry.modalities.includes('image');
}

/** Pure text-only derivation of a raw model list: drops every image entry, keeps the original order and
 *  never mutates its input. Every text path (findModel, defaultModel, clampLevel, the settings menu)
 *  reads this view, so an image entry (no `levels`) can never reach them. */
export function textModelsOf(entries: CatalogEntry[]): ModelSpec[] {
  return entries.filter((entry): entry is ModelSpec => !isImageModelSpec(entry));
}

const RAW_PROVIDERS = catalog.providers as unknown as RawProviderSpec[];

/** Single source of truth, shared verbatim with the server via model-catalog.json. Text models only:
 *  image models are listed in IMAGE_MODELS. */
export const MODEL_CATALOG: ProviderSpec[] =
  RAW_PROVIDERS.map(p => ({ ...p, models: textModelsOf(p.models) }));

/** Every image-generation model across all providers, in catalog order. */
export const IMAGE_MODELS: ImageModelSpec[] =
  RAW_PROVIDERS.flatMap(p => p.models.filter(isImageModelSpec));

export function findImageModel(modelId: string): ImageModelSpec | undefined {
  return IMAGE_MODELS.find(m => m.id === modelId);
}

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
