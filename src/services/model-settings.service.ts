import { Injectable, computed, signal } from '@angular/core';
import {
  MODEL_CATALOG, ModelSpec, ProviderId, ThinkingLevel,
  clampLevel, defaultModel, findModel, findProvider,
} from '../prompt-core/model-catalog';

const STORAGE_KEY = 'seo_gen_model_settings';

/** One slot's resolved configuration, as sent to the server. */
export interface SlotSettings { model: string; level: ThinkingLevel; }

/** What LlmService merges into every /api/llm/* request body. */
export interface ModelSettings {
  provider: ProviderId;
  deep: SlotSettings;
  fast: SlotSettings;
}

/**
 * Defaults reproduce the pre-settings behaviour exactly: Anthropic, Sonnet 5 with
 * 'medium' effort on the Deep Thinking path, Haiku 4.5 with thinking off on the fast
 * path. Anyone who never opens the settings menu sees no change at all.
 */
const DEFAULTS: ModelSettings = {
  provider: 'anthropic',
  deep: { model: 'claude-sonnet-5', level: 'medium' },
  fast: { model: 'claude-haiku-4-5', level: 'disabled' },
};

/**
 * Which provider/model/thinking level each of the two slots runs.
 *
 * The pipeline has always had two slots — "Deep Thinking Mode" in each tool picks between
 * them — and this service only decides what fills them. That is why none of the 21
 * orchestrator call sites need to know settings exist: LlmService reads a snapshot at
 * request time.
 */
@Injectable({ providedIn: 'root' })
export class ModelSettingsService {
  readonly catalog = MODEL_CATALOG;

  provider = signal<ProviderId>(DEFAULTS.provider);
  deepModel = signal<string>(DEFAULTS.deep.model);
  deepLevel = signal<ThinkingLevel>(DEFAULTS.deep.level);
  fastModel = signal<string>(DEFAULTS.fast.model);
  fastLevel = signal<ThinkingLevel>(DEFAULTS.fast.level);

  /** Models offered for the current provider. */
  models = computed<ModelSpec[]>(() => findProvider(this.provider())?.models ?? []);

  deepSpec = computed<ModelSpec | undefined>(() => findModel(this.provider(), this.deepModel()));
  fastSpec = computed<ModelSpec | undefined>(() => findModel(this.provider(), this.fastModel()));

  constructor() {
    this.restore();
  }

  snapshot(): ModelSettings {
    return {
      provider: this.provider(),
      deep: { model: this.deepModel(), level: this.deepLevel() },
      fast: { model: this.fastModel(), level: this.fastLevel() },
    };
  }

  /** Switching provider resets both slots — a Claude model id is meaningless to Gemini. */
  setProvider(provider: ProviderId) {
    if (!findProvider(provider)) return;
    this.provider.set(provider);

    const [first, second] = findProvider(provider)!.models;
    const deep = first;
    // Prefer a distinct 'fast'-tier model for the fast slot; fall back to the same model
    // when a provider only registers one.
    const fast = findProvider(provider)!.models.find(m => m.tier === 'fast') ?? second ?? first;

    this.deepModel.set(deep.id);
    this.deepLevel.set(deep.defaultLevel);
    this.fastModel.set(fast.id);
    this.fastLevel.set(fast.defaultLevel);
    this.persist();
  }

  setDeepModel(modelId: string) {
    const spec = findModel(this.provider(), modelId);
    if (!spec) return;
    this.deepModel.set(spec.id);
    // Carry the current level across if the new model accepts it, else snap to the nearest.
    this.deepLevel.set(clampLevel(this.provider(), spec.id, this.deepLevel()));
    this.persist();
  }

  setFastModel(modelId: string) {
    const spec = findModel(this.provider(), modelId);
    if (!spec) return;
    this.fastModel.set(spec.id);
    this.fastLevel.set(clampLevel(this.provider(), spec.id, this.fastLevel()));
    this.persist();
  }

  setDeepLevel(level: ThinkingLevel) {
    this.deepLevel.set(clampLevel(this.provider(), this.deepModel(), level));
    this.persist();
  }

  setFastLevel(level: ThinkingLevel) {
    this.fastLevel.set(clampLevel(this.provider(), this.fastModel(), level));
    this.persist();
  }

  /** Back to the Anthropic Sonnet/Haiku config, and drop the stored override entirely. */
  reset() {
    this.provider.set(DEFAULTS.provider);
    this.deepModel.set(DEFAULTS.deep.model);
    this.deepLevel.set(DEFAULTS.deep.level);
    this.fastModel.set(DEFAULTS.fast.model);
    this.fastLevel.set(DEFAULTS.fast.level);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing stored to clear, or storage is unavailable — the signals are already correct.
    }
  }

  isDefault(): boolean {
    const s = this.snapshot();
    return s.provider === DEFAULTS.provider
      && s.deep.model === DEFAULTS.deep.model && s.deep.level === DEFAULTS.deep.level
      && s.fast.model === DEFAULTS.fast.model && s.fast.level === DEFAULTS.fast.level;
  }

  /**
   * Read the stored settings back, validating every field against the catalog. A model that
   * has since been removed falls back to the provider's first entry, and a level the model
   * no longer accepts snaps to the nearest one — so a catalog edit can never leave a user
   * stuck sending a request the API will reject.
   */
  private restore() {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Private-mode localStorage throws on read; the defaults are already in place.
      return;
    }
    if (!raw) return;

    let stored: Partial<ModelSettings>;
    try {
      stored = JSON.parse(raw);
    } catch {
      return;
    }

    const provider: ProviderId = findProvider(stored.provider as string)
      ? (stored.provider as ProviderId)
      : DEFAULTS.provider;
    this.provider.set(provider);

    const deep = this.validateSlot(provider, stored.deep, 'premium');
    const fast = this.validateSlot(provider, stored.fast, 'fast');
    this.deepModel.set(deep.model);
    this.deepLevel.set(deep.level);
    this.fastModel.set(fast.model);
    this.fastLevel.set(fast.level);
  }

  private validateSlot(provider: ProviderId, slot: SlotSettings | undefined, preferTier: ModelSpec['tier']): SlotSettings {
    const spec = findModel(provider, slot?.model ?? '')
      ?? findProvider(provider)?.models.find(m => m.tier === preferTier)
      ?? defaultModel(provider)!;
    return { model: spec.id, level: clampLevel(provider, spec.id, slot?.level ?? spec.defaultLevel) };
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshot()));
    } catch {
      // Quota exhausted or storage blocked — the settings still apply for this session.
      // Never let a persistence failure surface as an error mid-generation.
    }
  }
}
