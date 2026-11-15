/**
 * The pure core of "+ Save current as preset" (US-10.6 T16; FR-15 (a)-(d), FR-16, FR-17; AC-10, AC-10a, AC-11).
 *
 * Pure and deterministic: ids come from an INJECTED clock reading (epoch milliseconds), never the host clock, and
 * nothing here touches `localStorage` (the storage port and its browser adapter are T18). The registry
 * `PROMPT_PRESETS` is only read, never written (FR-17).
 *
 * A generated id is `user-<base36 of the clock>`, with a `-<n>` counter suffix on a collision with an existing id. It
 * matches the registry preset id pattern, contains no `|` (so it cannot corrupt the usage `taskLabel`) and starts with
 * `user-`, which no registry id does, so a user preset can never equal `white-bg` and trigger the white-background
 * flow (plan 7.5, guard S8). The typed name is display text only and never becomes the id.
 *
 * T17 adds the two owner-ruled caps (SM-6: name at most 60 characters, at most 30 presets) and the stale-value check
 * (SM-5 i: a preset whose model is gone, or whose resolution its model does not offer, is APPLIED with a fallback, never
 * refused). The `{ refused }` branch of the plan is therefore not built.
 */
import { PROMPT_PRESETS } from '../../prompt-core/prompt-presets';

/** A preset the user saved from the composer. The prompt is the literal composer text, never a `{product}` template. */
export interface UserPreset {
  id: string;
  /** Display text, stored exactly as typed. */
  name: string;
  prompt: string;
  aspectRatio: string;
  resolution: string;
  model: string;
}

export interface UserPresetInput {
  name: string;
  prompt: string;
  aspectRatio: string;
  resolution: string;
  model: string;
}

export type CreateUserPresetResult = { ok: true; preset: UserPreset } | { ok: false; reason: string };

export type ParseStoredPresetsResult = { ok: true; presets: UserPreset[] } | { ok: false };

/** The longest accepted preset name, in characters (code points); owner ruling SM-6. */
export const USER_PRESET_NAME_MAX = 60;

/** The most user presets that may be saved; owner ruling SM-6. */
export const USER_PRESET_MAX_COUNT = 30;

/**
 * The model a preset falls back to when its own model is gone from the catalogue (SM-5 i). Same value as the store's
 * `DEFAULT_MODEL`; a util does not import a service, and `createUserPreset`/`checkUserPresetForApply` take the catalogue
 * as data, so the id is only used to pick the entry out of it.
 */
const FALLBACK_MODEL_ID = 'gemini-3.1-flash-image';

/** The id pattern a registry preset id must match; a user preset id matches it too. */
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Every generated user id starts with this; no registry id does. */
const USER_ID_PREFIX = 'user-';

const REASON_NAME_EMPTY = 'The preset name is empty.';
const REASON_NAME_TAKEN = 'A preset with this name already exists.';
// Cap refusals: plain English reasons. The accepted UA/EN display copy is still owed by the owner (see pipeline status).
const REASON_NAME_TOO_LONG = `The preset name is longer than ${USER_PRESET_NAME_MAX} characters.`;
const REASON_LIMIT_REACHED = `The limit of ${USER_PRESET_MAX_COUNT} saved presets is reached.`;

/** Name comparison for the duplicate check: surrounding whitespace and letter case do not make a name different. */
function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

function nextId(nowMs: number, existing: readonly UserPreset[]): string {
  const taken = new Set(existing.map((p) => p.id));
  const base = `${USER_ID_PREFIX}${Math.max(0, Math.floor(nowMs)).toString(36)}`;
  if (!taken.has(base)) return base;
  let counter = 2;
  while (taken.has(`${base}-${counter}`)) counter++;
  return `${base}-${counter}`;
}

/**
 * Builds a user preset from the current composer state. An empty or whitespace-only name, and a name equal to an
 * existing user preset name or to a registry preset name (uk or en), is refused with a reason (FR-15 (c)); so is a name
 * longer than `USER_PRESET_NAME_MAX` characters, and any save when `existing` already holds `USER_PRESET_MAX_COUNT`
 * presets (SM-6). Nothing is saved on a refusal.
 */
export function createUserPreset(
  input: UserPresetInput,
  existing: readonly UserPreset[],
  nowMs: number,
): CreateUserPresetResult {
  const key = nameKey(input.name);
  if (key.length === 0) return { ok: false, reason: REASON_NAME_EMPTY };
  if (Array.from(input.name).length > USER_PRESET_NAME_MAX) return { ok: false, reason: REASON_NAME_TOO_LONG };
  if (existing.length >= USER_PRESET_MAX_COUNT) return { ok: false, reason: REASON_LIMIT_REACHED };

  const taken =
    existing.some((p) => nameKey(p.name) === key) ||
    PROMPT_PRESETS.some((p) => nameKey(p.name.en) === key || nameKey(p.name.uk) === key);
  if (taken) return { ok: false, reason: REASON_NAME_TAKEN };

  return {
    ok: true,
    preset: {
      id: nextId(nowMs, existing),
      name: input.name,
      prompt: input.prompt,
      aspectRatio: input.aspectRatio,
      resolution: input.resolution,
      model: input.model,
    },
  };
}

function isWellFormed(value: unknown): value is UserPreset {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['id'] === 'string' &&
    ID_PATTERN.test(v['id']) &&
    v['id'].startsWith(USER_ID_PREFIX) &&
    typeof v['name'] === 'string' &&
    v['name'].trim().length > 0 &&
    typeof v['prompt'] === 'string' &&
    typeof v['aspectRatio'] === 'string' &&
    typeof v['resolution'] === 'string' &&
    typeof v['model'] === 'string'
  );
}

/**
 * Reads a stored value. Anything that is not an array of well-formed presets with distinct ids is `{ ok: false }` as a
 * whole: data that does not parse is ignored, never partly applied (FR-15 (d)). The input is not mutated and the
 * returned presets are copies.
 */
export function parseStoredPresets(value: unknown): ParseStoredPresetsResult {
  if (!Array.isArray(value)) return { ok: false };
  const ids = new Set<string>();
  const presets: UserPreset[] = [];
  for (const entry of value as unknown[]) {
    if (!isWellFormed(entry) || ids.has(entry.id)) return { ok: false };
    ids.add(entry.id);
    presets.push({
      id: entry.id,
      name: entry.name,
      prompt: entry.prompt,
      aspectRatio: entry.aspectRatio,
      resolution: entry.resolution,
      model: entry.model,
    });
  }
  return { ok: true, presets };
}

/** A new list without the preset `id`; the others keep their order, an unknown id changes nothing (AC-10a). */
export function deleteUserPreset(presets: readonly UserPreset[], id: string): UserPreset[] {
  return presets.filter((p) => p.id !== id);
}

/** An image model of `model-catalog.json` as the stale-value check needs it. */
export interface PresetCatalogueModel {
  id: string;
  /** The resolutions the model offers, default first. */
  resolutions: readonly string[];
}

/** `{ ok }`: apply as saved. `{ fallback }`: apply with this model and resolution instead (SM-5 i). Never refuses. */
export type CheckUserPresetResult = { ok: true } | { fallback: { model: string; resolution: string } };

/**
 * Checks a saved preset against the current catalogue (FR-15 (e), SM-5 i). A model in the catalogue that offers the saved
 * resolution is `{ ok }`; a model that does not offer it keeps the model and takes its default (first) resolution; a model
 * that is gone falls back to the default model and its default resolution. An empty catalogue holds nothing to check
 * against, so the preset is applied as saved. Pure: neither argument is mutated.
 */
export function checkUserPresetForApply(
  preset: Pick<UserPreset, 'model' | 'resolution'>,
  catalogue: readonly PresetCatalogueModel[],
): CheckUserPresetResult {
  const own = catalogue.find((m) => m.id === preset.model);
  if (own) {
    if (own.resolutions.includes(preset.resolution)) return { ok: true };
    const resolution = own.resolutions[0];
    return resolution === undefined ? { ok: true } : { fallback: { model: own.id, resolution } };
  }
  const fallback = catalogue.find((m) => m.id === FALLBACK_MODEL_ID) ?? catalogue[0];
  const resolution = fallback?.resolutions[0];
  if (!fallback || resolution === undefined) return { ok: true };
  return { fallback: { model: fallback.id, resolution } };
}
