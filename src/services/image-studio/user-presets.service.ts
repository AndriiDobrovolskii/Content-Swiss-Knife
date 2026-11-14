import { Injectable, inject, signal } from '@angular/core';
import {
  createUserPreset, deleteUserPreset, parseStoredPresets, type UserPreset, type UserPresetInput,
} from '../../utils/image-studio/user-presets';
import { CLOCK_PORT, USER_PRESET_STORAGE_PORT } from './image-studio.tokens';

/** What a save needs from the composer; the name is typed, the rest is the composer's current state. */
export type CurrentPresetFields = Omit<UserPresetInput, 'name'>;

export type SaveUserPresetResult = { ok: true; preset: UserPreset } | { ok: false; reason: string };

const REASON_NOT_STORED = 'The preset could not be stored in this browser.';

/**
 * The user's saved presets (US-10.6 T18, FR-15 (d), FR-16, FR-17; AC-10, AC-10a, AC-11), kept in the browser through
 * `USER_PRESET_STORAGE_PORT` (NFR-10). The list is read from the port once, when the service is created; storage that is
 * unreadable or holds data that does not parse gives an empty list and writes nothing. A save or a removal the port could
 * not store reports `{ ok: false }` and leaves `presets()` as it was, so nothing is shown as saved or deleted that is not.
 * The service shows nothing itself: the caller turns a failure into a message through the existing alert channel. The
 * registry `PROMPT_PRESETS` is never part of this list.
 */
@Injectable({ providedIn: 'root' })
export class UserPresetsService {
  private readonly storage = inject(USER_PRESET_STORAGE_PORT);
  private readonly clock = inject(CLOCK_PORT);

  private readonly presetsSignal = signal<readonly UserPreset[]>(this.readStored());

  /** The saved user presets, in the order they were saved. */
  readonly presets = this.presetsSignal.asReadonly();

  /** Saves the composer's current fields under `name`. A refusal (empty, duplicate, too long, limit) or a failed write saves nothing. */
  save(name: string, current: CurrentPresetFields): SaveUserPresetResult {
    const created = createUserPreset({ name, ...current }, this.presetsSignal(), this.clock.now());
    if (!created.ok) return created;
    const next = [...this.presetsSignal(), created.preset];
    if (!this.write(next)) return { ok: false, reason: REASON_NOT_STORED };
    this.presetsSignal.set(next);
    return created;
  }

  /** Deletes the preset `id` at once, without a confirmation (OD-12 (f)). A failed write leaves the preset in the list. */
  remove(id: string): { ok: boolean } {
    const current = this.presetsSignal();
    if (!current.some((p) => p.id === id)) return { ok: true };
    const next = deleteUserPreset(current, id);
    if (!this.write(next)) return { ok: false };
    this.presetsSignal.set(next);
    return { ok: true };
  }

  private write(presets: UserPreset[]): boolean {
    try {
      return this.storage.save(presets).ok;
    } catch {
      return false;
    }
  }

  private readStored(): readonly UserPreset[] {
    try {
      const loaded = this.storage.load();
      if (!loaded.ok) return [];
      const parsed = parseStoredPresets(loaded.presets);
      return parsed.ok ? parsed.presets : [];
    } catch {
      return [];
    }
  }
}
