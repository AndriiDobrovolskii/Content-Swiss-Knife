import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ImageStudioStore } from '../../../../services/image-studio/image-studio.store';
import { StudioDeliveryService, type DeliveryItem } from '../../../../services/image-studio/studio-delivery.service';
import { StudioMediaService } from '../../../../services/image-studio/studio-media.service';
import { buildAlt } from '../../../../utils/image-studio/alt-text';
import { fromBase64 } from '../../../../utils/image-studio/base64';
import { studioText, type StudioLanguage, type StudioTextParams } from '../../../../utils/image-studio/studio-texts';

/** The edit source of an image as the feed hands it over (US-10.5 FR-9): the source version and whether it is still retained. */
export interface TileEditOf {
  n: number;
  sourceRetained: boolean;
}

let nextTileId = 0;

/**
 * One generated image of the feed (US-10.5 FR-6, FR-7, FR-9; plan DD-7, DD-9): a `<figure>` labelled by its `<figcaption>`
 * (`v{N} · {W}×{H}`, or `v{N}` while the size is unknown or undecodable), the image with its alt text, Download and
 * Edit this →, the "Edit of v{n}" chip when the image edits an earlier version, and "Compare with v{n}" only while that
 * source is still retained. The version, its bytes and its prompt are read from the current session through
 * StudioDeliveryService; every action goes through it (native delivery, no codec call), and its failure messages are
 * rendered by the container's alert region, not here. The render-time size comes from StudioMediaService (probed once
 * per image). Every text is a studio-texts id resolved for `lang()` at render time (FR-77); the alt of a prompt is the
 * prompt itself and is never localised, only its "Generated image" fallback is.
 */
@Component({
  selector: 'app-studio-image-tile',
  standalone: true,
  templateUrl: './studio-image-tile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioImageTileComponent {
  readonly lang = input.required<StudioLanguage>();
  readonly versionNumber = input.required<number>();
  readonly editOf = input<TileEditOf | null>(null);

  private readonly store = inject(ImageStudioStore);
  private readonly delivery = inject(StudioDeliveryService);
  private readonly media = inject(StudioMediaService);

  protected readonly captionId = `studio-tile-caption-${nextTileId++}`;
  protected readonly generating = this.store.generating;
  protected readonly busy = this.delivery.busy;

  /** The version this tile shows, with its bytes; `undefined` when the session no longer retains it. */
  protected readonly item = computed<DeliveryItem | undefined>(() => this.delivery.items().find((i) => i.version.number === this.versionNumber()));

  /** `v{N} · {W}×{H}`, or `v{N}` while the size is unknown or the bytes cannot be decoded (FR-7). */
  protected readonly label = computed(() => {
    const item = this.item();
    if (!item) return '';
    const size = this.media.sizeOf(`${item.version.turnId}:${item.version.partIndex}`, () => (item.data ? fromBase64(item.data) : null))();
    return size ? `v${item.version.number} · ${size.width}×${size.height}` : `v${item.version.number}`;
  });

  protected tx(id: string, params?: StudioTextParams): string {
    return studioText(id, this.lang(), params);
  }

  protected altOf(item: DeliveryItem): string {
    const alt = buildAlt(item.version.prompt);
    return alt.kind === 'prompt' ? alt.text : this.tx(alt.textId);
  }

  protected srcOf(item: DeliveryItem): string | null {
    return item.mime && item.data ? `data:${item.mime};base64,${item.data}` : null;
  }

  protected download(item: DeliveryItem): Promise<void> {
    return this.delivery.download(item.version.number);
  }

  protected edit(item: DeliveryItem): Promise<void> {
    return this.delivery.edit(item.version.number);
  }

  protected compare(item: DeliveryItem, source: TileEditOf, event: Event): void {
    this.delivery.open(item.version.number, event.currentTarget as HTMLElement, source.n);
  }
}
