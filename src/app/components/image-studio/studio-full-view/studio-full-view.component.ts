import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, untracked, viewChild } from '@angular/core';
import { ImageStudioStore } from '../../../../services/image-studio/image-studio.store';
import { StudioDeliveryService, type DeliveryItem } from '../../../../services/image-studio/studio-delivery.service';
import { buildAlt } from '../../../../utils/image-studio/alt-text';
import { studioText, type StudioLanguage, type StudioTextParams } from '../../../../utils/image-studio/studio-texts';
import { StudioCompareSliderComponent, type CompareSide } from '../studio-compare-slider/studio-compare-slider.component';

/**
 * The full view of one version (US-10.5 FR-10, FR-33, plan DD-10): the one `role="dialog"` of the studio, moved out of
 * the version strip. What is open is the delivery service's `openView()` state (`{ number, compareWith? }`); this
 * component only renders it and forwards the operator's clicks. With a compare source it hosts the before/after
 * slider; if either image has no bytes it falls back to the single image of the edited version. Escape and Close
 * close the view and the service returns focus to the opener. It is mounted by the container as a sibling outside the
 * `role="log"` feed. The failures of its delivery actions are shown by the feed (X-18 to X-22), not here.
 */
@Component({
  selector: 'app-studio-full-view',
  standalone: true,
  imports: [StudioCompareSliderComponent],
  templateUrl: './studio-full-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioFullViewComponent {
  readonly lang = input.required<StudioLanguage>();

  protected readonly store = inject(ImageStudioStore);
  protected readonly delivery = inject(StudioDeliveryService);
  protected readonly busy = this.delivery.busy;

  /** The version the dialog shows, or null while no view is open (or the version is gone). */
  protected readonly opened = computed<DeliveryItem | null>(() => {
    const view = this.delivery.openView();
    return view === null ? null : (this.delivery.items().find((item) => item.version.number === view.number) ?? null);
  });

  /** The before/after pair when a compare source is set and both images have bytes; null selects the single-image view. */
  protected readonly compare = computed<{ before: CompareSide; after: CompareSide } | null>(() => {
    const view = this.delivery.openView();
    const afterItem = this.opened();
    if (view === null || view.compareWith === undefined || afterItem === null) return null;
    const beforeItem = this.delivery.items().find((item) => item.version.number === view.compareWith);
    if (!beforeItem) return null;
    const before = this.sideOf(beforeItem);
    const after = this.sideOf(afterItem);
    return before && after ? { before, after } : null;
  });

  private readonly dialogRef = viewChild<ElementRef<HTMLElement>>('dialog');

  constructor() {
    // Move focus into the full view when it opens.
    effect(() => {
      const dialog = this.dialogRef();
      if (dialog) untracked(() => dialog.nativeElement.focus());
    });
  }

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

  protected close(): void {
    this.delivery.close();
  }

  protected edit(item: DeliveryItem): Promise<void> {
    return this.delivery.edit(item.version.number);
  }

  protected download(item: DeliveryItem): Promise<void> {
    return this.delivery.download(item.version.number);
  }

  protected copy(item: DeliveryItem): Promise<void> {
    return this.delivery.copy(item.version.number);
  }

  private sideOf(item: DeliveryItem): CompareSide | null {
    const src = this.srcOf(item);
    return src === null ? null : { number: item.version.number, src, alt: this.altOf(item) };
  }
}
