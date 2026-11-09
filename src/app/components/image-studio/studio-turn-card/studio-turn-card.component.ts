import { DOCUMENT } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, inject, Injector, input, untracked } from '@angular/core';
import { findImageModel } from '../../../../prompt-core/model-catalog';
import { findPreset, presetName } from '../../../../prompt-core/prompt-presets';
import { ImageStudioStore } from '../../../../services/image-studio/image-studio.store';
import { StudioMediaService } from '../../../../services/image-studio/studio-media.service';
import { formatCost, formatSeconds, joinSummary } from '../../../../utils/image-studio/format';
import type { FeedCard } from '../../../../utils/image-studio/feed';
import { studioCount } from '../../../../utils/image-studio/plural';
import { studioText, type StudioLanguage, type StudioTextParams } from '../../../../utils/image-studio/studio-texts';
import { StudioImageTileComponent, type TileEditOf } from '../studio-image-tile/studio-image-tile.component';

/** One input thumbnail as the template reads it: the data URL and its alt text ordinal (1-based, over the thumbnails that resolved). */
interface InputThumb {
  src: string;
  n: number;
}

/**
 * One generation as a card (US-10.5 FR-3, FR-4, FR-25; plan DD-6, DD-7, DD-9): the input thumbnails of the send, the prompt,
 * the ratio / resolution / model chips and, only for a preset id the registry knows, the preset chip, the summary line, and
 * the card's items in API order: model text paragraphs interleaved with the image tiles (SQ-3-A). Everything is read from the
 * `FeedCard` the feed built from the stored turn, so a field an old session lacks is simply not rendered (no placeholder).
 * The card holds ids and values only; every text is a studio-texts id or the preset registry name resolved for `lang()` at
 * render time (FR-77). Input thumbnails are plain `<img>` outside any `<figure>` (only tiles are figures) whose alt is the
 * "Input image {n}" text, never the prompt; a reference whose bytes are gone is omitted without an error.
 * The "Reuse prompt" button (FR-5) exists only for a non-blank prompt, is disabled while the composer is, puts the card's
 * prompt, ratio and model into the composer through `store.reusePrompt` (which sends nothing and writes no preset field) and
 * then moves focus to the composer's prompt field, found by its accessible name once the field has rendered the new text.
 */
@Component({
  selector: 'app-studio-turn-card',
  standalone: true,
  imports: [StudioImageTileComponent],
  templateUrl: './studio-turn-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioTurnCardComponent {
  readonly lang = input.required<StudioLanguage>();
  readonly card = input.required<FeedCard>();

  private readonly store = inject(ImageStudioStore);
  private readonly media = inject(StudioMediaService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  protected readonly inputEnabled = this.store.inputEnabled;

  /** The model chip: the catalog label of the model, or the stored id when the catalog no longer lists it. */
  protected readonly modelLabel = computed(() => {
    const model = this.card().model;
    return model === '' ? '' : (findImageModel(model)?.label ?? model);
  });

  /** The preset chip: the registry name in `lang()`, only for an id the feed already validated as known. */
  protected readonly presetLabel = computed(() => {
    const id = this.card().presetId;
    const preset = id === undefined ? undefined : findPreset(id);
    return preset === undefined ? '' : presetName(preset, this.lang());
  });

  /** `{N} images · $cost · T s`, empty when neither a cost nor a duration was recorded (FR-4 partial-field rule). */
  protected readonly summaryLine = computed(() => {
    const { count, cost, durationMs } = this.card().summary;
    const costText = formatCost(cost);
    const secondsText = formatSeconds(durationMs);
    if (costText === null && secondsText === null) return '';
    const lang = this.lang();
    return joinSummary([
      studioCount('X-34', lang, count),
      costText,
      secondsText === null ? null : studioText('X-43', lang, { T: secondsText }),
    ]);
  });

  /** The input thumbnails whose bytes can still be read, in stored order. */
  protected readonly thumbs = computed<InputThumb[]>(() => {
    const session = this.store.currentSession();
    if (!session) return [];
    const resolved: string[] = [];
    for (const ref of this.card().thumbs) {
      const turn = session.turns.find((t) => t.id === ref.turnId);
      if (!turn) continue;
      // thumbFor fills a fresh signal synchronously for an inline part; that write must not happen inside this computed's reactive context.
      const url = untracked(() => this.media.thumbFor(session.meta.id, turn, ref.partIndex));
      const src = url();
      if (src) resolved.push(src);
    }
    return resolved.map((src, index) => ({ src, n: index + 1 }));
  });

  private readonly editOfByNumber = computed(() => {
    const map = new Map<number, TileEditOf>();
    for (const image of this.card().images) if (image.editOf) map.set(image.number, image.editOf);
    return map;
  });

  protected editOf(versionNumber: number): TileEditOf | null {
    return this.editOfByNumber().get(versionNumber) ?? null;
  }

  protected reuse(): void {
    const { prompt, aspectRatio, model } = this.card();
    if (!prompt || !this.store.inputEnabled()) return;
    this.store.reusePrompt({ prompt, aspectRatio, model });
    afterNextRender(() => this.focusPrompt(), { injector: this.injector });
  }

  /** Focuses the composer's prompt field (the textarea named by X-12), if it is mounted and enabled. */
  private focusPrompt(): void {
    const name = this.tx('X-12');
    for (const field of Array.from(this.document.querySelectorAll('textarea'))) {
      if (field.getAttribute('aria-label') === name && !field.disabled) {
        field.focus();
        return;
      }
    }
  }

  protected tx(id: string, params?: StudioTextParams): string {
    return studioText(id, this.lang(), params);
  }
}
