import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ASPECT_RATIOS } from '../../../../prompt-core/image-studio-contract';
import { findImageModel, IMAGE_MODELS } from '../../../../prompt-core/model-catalog';
import {
  applyProduct, CHIP_INSTRUCTIONS, presetName, PROMPT_PRESETS, type ChipInstruction, type PromptPreset,
} from '../../../../prompt-core/prompt-presets';
import { ImageStudioStore } from '../../../../services/image-studio/image-studio.store';
import { studioText, type StudioLanguage, type StudioTextParams } from '../../../../utils/image-studio/studio-texts';

/**
 * The studio composer (US-10.1 DD-22): presets, quick-edit chips, the prompt, the product-name field, the ratio,
 * resolution and model selectors, Send and Cancel. State lives in the root `ImageStudioStore`; this component renders
 * it and forwards user actions. Every text is resolved from `studio-texts` for `lang()` at render time (FR-77).
 */
@Component({
  selector: 'app-studio-composer',
  standalone: true,
  templateUrl: './studio-composer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioComposerComponent {
  readonly lang = input.required<StudioLanguage>();

  protected readonly store = inject(ImageStudioStore);
  protected readonly presets = PROMPT_PRESETS;
  protected readonly chips = CHIP_INSTRUCTIONS;
  protected readonly ratios = ASPECT_RATIOS;
  protected readonly models = IMAGE_MODELS;
  /** The resolutions the selected model accepts: 4K is offered only by Pro (FR-19). */
  protected readonly resolutions = computed(() => findImageModel(this.store.draft().model)?.resolutions ?? []);
  /** Chips appear only once the session holds a version (FR-31). */
  protected readonly showChips = computed(() => this.store.versions().length > 0);

  protected tx(id: string, params?: StudioTextParams): string {
    return studioText(id, this.lang(), params);
  }

  protected presetLabel(preset: PromptPreset): string {
    return presetName(preset, this.lang());
  }

  protected chipLabel(chip: ChipInstruction): string {
    return studioText(chip.textId, this.lang());
  }

  protected onText(event: Event): void {
    this.store.setDraft({ text: (event.target as HTMLTextAreaElement).value });
  }

  protected onProductName(event: Event): void {
    this.store.setDraft({ productName: (event.target as HTMLInputElement).value });
  }

  protected onRatio(event: Event): void {
    this.store.setDraft({ aspectRatio: (event.target as HTMLSelectElement).value });
  }

  protected onResolution(event: Event): void {
    this.store.setDraft({ resolution: (event.target as HTMLSelectElement).value });
  }

  /** The model switch (FR-50): the store decides between "next message only" and "new seeded session". */
  protected async onModel(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    await this.store.switchModel(select.value);
    // A refused switch must not leave the control showing a model that is not in use.
    select.value = this.store.draft().model;
  }

  /**
   * Picking a preset fills the prompt (the product name substituted once, D-14), the ratio, the resolution and,
   * while the session holds no version, the model (FR-28). In a session with a version the model changes only
   * through the model selector, which starts a new session.
   */
  protected pickPreset(preset: PromptPreset): void {
    const patch = {
      text: applyProduct(preset.template, this.store.draft().productName),
      presetId: preset.id,
      aspectRatio: preset.defaults.aspectRatio,
      resolution: preset.defaults.resolution,
      ...(this.store.versions().length === 0 ? { model: preset.defaults.model } : {}),
    };
    this.store.setDraft(patch);
  }

  /** A chip is a one-click edit of the latest version: its English instruction is sent at once (FR-31). */
  protected async sendChip(chip: ChipInstruction): Promise<void> {
    this.store.setDraft({ text: chip.instruction, presetId: null });
    await this.store.send();
  }

  protected async send(): Promise<void> {
    await this.store.send();
  }

  protected cancel(): void {
    this.store.cancel();
  }
}
