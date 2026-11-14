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
 * Not here (T17, owner rulings SM-6 / SM-5): the name-length cap, the preset-count cap and the stale-value check.
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

/** The id pattern a registry preset id must match; a user preset id matches it too. */
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Every generated user id starts with this; no registry id does. */
const USER_ID_PREFIX = 'user-';

const REASON_NAME_EMPTY = 'The preset name is empty.';
const REASON_NAME_TAKEN = 'A preset with this name already exists.';

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
 * existing user preset name or to a registry preset name (uk or en), is refused with a reason (FR-15 (c)).
 */
export function createUserPreset(
  input: UserPresetInput,
  existing: readonly UserPreset[],
  nowMs: number,
): CreateUserPresetResult {
  const key = nameKey(input.name);
  if (key.length === 0) return { ok: false, reason: REASON_NAME_EMPTY };

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
