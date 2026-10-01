import { Injectable, computed, signal } from '@angular/core';
import {
  MODEL_CATALOG, ModelSpec, ProviderId, ThinkingLevel,
  clampLevel, findModel, findProvider,
} from '../prompt-core/model-catalog';

const STORAGE_KEY = 'seo_gen_model_settings';

/** Models removed from the catalog, mapped to the model a stored selection of them moves onto.
 *  Applied once in restore(). Deliberately the only migration: other stored choices (Sonnet 5,
 *  Gemini 3.7 / 3.6 Flash) are still in the catalog and stay exactly as the user left them. */
const RETIRED_MODELS: Record<string, string> = {
  'claude-sonnet-4-6': 'claude-sonnet-5-5',
};

/** One slot's resolved configuration, as sent to the server. Each slot names its own
 *  provider: Deep on Claude and Fast on Gemini in the same run is a supported setup. */
export interface SlotSettings { provider: ProviderId; model: string; level: ThinkingLevel; }

/** What LlmService merges into every /api/llm/* request body. */
export interface ModelSettings {
  deep: SlotSettings;
  fast: SlotSettings;
}

/** The shape written by the versions that had one provider for both slots. Still read on
 *  restore so a returning user keeps their configuration instead of silently reverting. */
interface LegacySettings {
  provider?: string;
  deep?: Partial<SlotSettings>;
  fast?: Partial<SlotSettings>;
}

/**
 * The mixed configuration the pipeline is shaped for: the judgment work (Task A, the master
 * uk-UA artifact) on Sonnet 5.5, the mechanical work (translations, PDF extraction) on Gemini
 * Flash. Deep stays on Anthropic because the whole artifact is written there and the prompt
 * text is calibrated against it; Fast moves to Gemini because per-language translation is the
 * bulk of the token spend and the cheapest place to pay it.
 *
 * Fast runs Gemini 3.8 Flash at `low`. 3.8 Flash has no `minimal`, and the Fast slot's job is
 * transcription, not reasoning, so `low` is the cheapest level it offers; it matches
 * FALLBACK_FAST in server/providers/gemini.js so a request carrying settings and one carrying
 * none route identically. This intentionally differs from the catalog `defaultLevel` (`high`),
 * which is what a provider switch in the settings UI lands on.
 *
 * A browser with no stored settings lands here directly. A stored Sonnet 4.6 choice (removed
 * from the catalog) is moved onto Sonnet 5.5 by the one-time migration in restore() below;
 * every other stored choice is left alone.
 */
const DEFAULTS: ModelSettings = {
  deep: { provider: 'anthropic', model: 'claude-sonnet-5-5', level: 'high' },
  fast: { provider: 'gemini', model: 'gemini-3.8-flash', level: 'low' },
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

  deepProvider = signal<ProviderId>(DEFAULTS.deep.provider);
  deepModel = signal<string>(DEFAULTS.deep.model);
  deepLevel = signal<ThinkingLevel>(DEFAULTS.deep.level);
  fastProvider = signal<ProviderId>(DEFAULTS.fast.provider);
  fastModel = signal<string>(DEFAULTS.fast.model);
  fastLevel = signal<ThinkingLevel>(DEFAULTS.fast.level);

  /** Models offered for each slot — the two lists are independent now. */
  deepModels = computed<ModelSpec[]>(() => findProvider(this.deepProvider())?.models ?? []);
  fastModels = computed<ModelSpec[]>(() => findProvider(this.fastProvider())?.models ?? []);

  deepSpec = computed<ModelSpec | undefined>(() => findModel(this.deepProvider(), this.deepModel()));
  fastSpec = computed<ModelSpec | undefined>(() => findModel(this.fastProvider(), this.fastModel()));

  constructor() {
    this.restore();
  }

  snapshot(): ModelSettings {
    return {
      deep: { provider: this.deepProvider(), model: this.deepModel(), level: this.deepLevel() },
      fast: { provider: this.fastProvider(), model: this.fastModel(), level: this.fastLevel() },
    };
  }

  /** Switching a slot's provider resets that slot only — a Claude model id is meaningless
   *  to Gemini, but the other slot's choice is none of this one's business. */
  setDeepProvider(provider: ProviderId) {
    if (!findProvider(provider)) return;
    const spec = this.pick(provider, 'premium');
    this.deepProvider.set(provider);
    this.deepModel.set(spec.id);
    this.deepLevel.set(spec.defaultLevel);
    this.persist();
  }

  setFastProvider(provider: ProviderId) {
    if (!findProvider(provider)) return;
    const spec = this.pick(provider, 'fast');
    this.fastProvider.set(provider);
    this.fastModel.set(spec.id);
    this.fastLevel.set(spec.defaultLevel);
    this.persist();
  }

  setDeepModel(modelId: string) {
    const spec = findModel(this.deepProvider(), modelId);
    if (!spec) return;
    this.deepModel.set(spec.id);
    // Carry the current level across if the new model accepts it, else snap to the nearest.
    this.deepLevel.set(clampLevel(this.deepProvider(), spec.id, this.deepLevel()));
    this.persist();
  }

  setFastModel(modelId: string) {
    const spec = findModel(this.fastProvider(), modelId);
    if (!spec) return;
    this.fastModel.set(spec.id);
    this.fastLevel.set(clampLevel(this.fastProvider(), spec.id, this.fastLevel()));
    this.persist();
  }

  setDeepLevel(level: ThinkingLevel) {
    this.deepLevel.set(clampLevel(this.deepProvider(), this.deepModel(), level));
    this.persist();
  }

  setFastLevel(level: ThinkingLevel) {
    this.fastLevel.set(clampLevel(this.fastProvider(), this.fastModel(), level));
    this.persist();
  }

  /** Back to the Anthropic Sonnet/Haiku config, and drop the stored override entirely. */
  reset() {
    this.apply(DEFAULTS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing stored to clear, or storage is unavailable — the signals are already correct.
    }
  }

  isDefault(): boolean {
    const s = this.snapshot();
    return sameSlot(s.deep, DEFAULTS.deep) && sameSlot(s.fast, DEFAULTS.fast);
  }

  /** The model a slot lands on when its provider changes: prefer a model of the slot's own
   *  tier, so a provider switch never quietly puts translations on a premium model. */
  private pick(provider: ProviderId, preferTier: ModelSpec['tier']): ModelSpec {
    const models = findProvider(provider)!.models;
    return models.find(m => m.tier === preferTier) ?? models[0];
  }

  private apply(settings: ModelSettings) {
    this.deepProvider.set(settings.deep.provider);
    this.deepModel.set(settings.deep.model);
    this.deepLevel.set(settings.deep.level);
    this.fastProvider.set(settings.fast.provider);
    this.fastModel.set(settings.fast.model);
    this.fastLevel.set(settings.fast.level);
  }

  /**
   * Read the stored settings back, validating every field against the catalog. A model that
   * has since been removed falls back to a model of the slot's tier, and a level the model
   * no longer accepts snaps to the nearest one — so a catalog edit can never leave a user
   * stuck sending a request the API will reject.
   *
   * A payload written before providers went per-slot carries one top-level `provider`; it is
   * read as the provider of both slots, which is exactly what that user had configured.
   *
   * One-time migration: a stored slot (either one) on a model in RETIRED_MODELS
   * (`claude-sonnet-4-6`) is moved onto its replacement (`claude-sonnet-5-5`) before
   * validation, then re-persisted so this only fires once per browser. The stored level is then
   * clamped into the replacement's levels like any other level (`disabled` becomes
   * `between_tools`, `minimal` becomes `low`, `medium` is kept).
   *
   * A stored `max` (no catalog model lists it) restores as `xhigh` on Sonnet 5.5 through
   * validateSlot -> clampLevel. Level-only corrections like this are applied in memory and
   * written back at the next setter call; the persist condition above is deliberately not
   * widened to cover them.
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

    let stored: LegacySettings;
    try {
      stored = JSON.parse(raw);
    } catch {
      return;
    }

    let migrated = false;
    const migrate = (slot: Partial<SlotSettings> | undefined) => {
      const next = slot?.model ? RETIRED_MODELS[slot.model] : undefined;
      if (!next) return slot;
      migrated = true;
      return { ...slot, model: next };
    };

    this.apply({
      deep: this.validateSlot(migrate(stored.deep), stored.provider, DEFAULTS.deep, 'premium'),
      fast: this.validateSlot(migrate(stored.fast), stored.provider, DEFAULTS.fast, 'fast'),
    });

    if (migrated) this.persist();
  }

  private validateSlot(
    slot: Partial<SlotSettings> | undefined,
    legacyProvider: string | undefined,
    fallback: SlotSettings,
    preferTier: ModelSpec['tier'],
  ): SlotSettings {
    const provider = findProvider(slot?.provider as string)?.id
      ?? findProvider(legacyProvider as string)?.id
      ?? fallback.provider;
    const spec = findModel(provider, slot?.model ?? '') ?? this.pick(provider, preferTier);
    return {
      provider,
      model: spec.id,
      level: clampLevel(provider, spec.id, slot?.level ?? spec.defaultLevel),
    };
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

function sameSlot(a: SlotSettings, b: SlotSettings): boolean {
  return a.provider === b.provider && a.model === b.model && a.level === b.level;
}
