import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { StudioDeliveryService, type DeliveryItem } from '../../../../services/image-studio/studio-delivery.service';
import { buildAlt } from '../../../../utils/image-studio/alt-text';
import { studioText, type StudioLanguage, type StudioTextParams } from '../../../../utils/image-studio/studio-texts';

/**
 * The version strip (US-10.1 DD-22, FR-33, FR-37, FR-38, FR-54 to FR-58; US-10.5 FR-6, FR-10): the retained versions of
 * the current session as thumbnails. Download all versions and the delivery failure alert (X-18 to X-22) live once, in the feed. A click on a thumbnail
 * asks StudioDeliveryService to open the full view, which is the StudioFullViewComponent's (the one dialog, a sibling of
 * the log). The delivery state and every action belong to the service (the bytes are delivered natively, there is no
 * format selector); this component only renders them and forwards the operator's clicks.
 */
@Component({
  selector: 'app-studio-version-strip',
  standalone: true,
  templateUrl: './studio-version-strip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioVersionStripComponent {
  readonly lang = input.required<StudioLanguage>();

  protected readonly delivery = inject(StudioDeliveryService);

  /** The retained versions of the current session, oldest first. */
  protected readonly items = this.delivery.items;

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

  protected open(item: DeliveryItem, event: Event): void {
    this.delivery.open(item.version.number, event.currentTarget as HTMLElement);
  }
}
