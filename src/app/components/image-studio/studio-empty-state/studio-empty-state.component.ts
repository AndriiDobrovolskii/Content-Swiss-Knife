import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ImageStudioStore } from '../../../../services/image-studio/image-studio.store';
import {
  findPreset,
  presetDescription,
  presetName,
  STARTER_PRESET_IDS,
  type PromptPreset,
} from '../../../../prompt-core/prompt-presets';
import { studioText, type StudioLanguage } from '../../../../utils/image-studio/studio-texts';

/** One starter card as the template reads it (the preset itself, its display name and its optional card text in `lang()`). */
interface StarterCard {
  preset: PromptPreset;
  name: string;
  description: string | undefined;
  /** The accessible name: the preset name followed by its description (plan R-9), so an exact-name lookup finds only the preset row. */
  label: string;
}

/**
 * The empty state of the feed (US-10.5 FR-18, FR-19, FR-22; plan DD-7): the headline (X-40), the sentence (X-41) and the three starter cards.
 * The cards are read from the preset registry through `STARTER_PRESET_IDS`, `presetName` and `presetDescription` (never hard-coded; a preset
 * without a description shows no description element). Choosing a card calls `store.applyPreset(preset)`, the same patch as the composer's
 * preset row, and sends nothing. Every text comes from `studio-texts` or the registry for `lang()` at render time (FR-77).
 */
@Component({
  selector: 'app-studio-empty-state',
  standalone: true,
  templateUrl: './studio-empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioEmptyStateComponent {
  readonly lang = input.required<StudioLanguage>();

  private readonly store = inject(ImageStudioStore);

  protected headline(): string {
    return studioText('X-40', this.lang());
  }

  protected sentence(): string {
    return studioText('X-41', this.lang());
  }

  /** The starter cards in registry order; an id the registry no longer holds yields no card. */
  protected cards(): StarterCard[] {
    const lang = this.lang();
    const cards: StarterCard[] = [];
    for (const id of STARTER_PRESET_IDS) {
      const preset = findPreset(id);
      if (!preset) continue;
      const name = presetName(preset, lang);
      const description = presetDescription(preset, lang);
      cards.push({ preset, name, description, label: description ? `${name} ${description}` : name });
    }
    return cards;
  }

  protected choose(preset: PromptPreset): void {
    this.store.applyPreset(preset);
  }
}
