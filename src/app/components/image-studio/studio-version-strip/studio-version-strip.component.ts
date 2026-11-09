import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, input, untracked, viewChild, computed } from '@angular/core';
import { ImageStudioStore } from '../../../../services/image-studio/image-studio.store';
import { StudioDeliveryService, type DeliveryItem } from '../../../../services/image-studio/studio-delivery.service';
import { buildAlt } from '../../../../utils/image-studio/alt-text';
import { studioText, type StudioLanguage, type StudioTextParams } from '../../../../utils/image-studio/studio-texts';

/**
 * The version strip (US-10.1 DD-22, FR-33, FR-37, FR-38, FR-54 to FR-58; US-10.5 FR-6): the retained versions of the
 * current session and, for now, the full view of one version with its delivery actions (Download, Copy to clipboard,
 * Edit this version) and Download all versions. The delivery state and every action belong to StudioDeliveryService
 * (the bytes are delivered natively, there is no format selector); this component only renders them and forwards the
 * operator's clicks. Every failure is reported through the `role="alert"` region (X-18 to X-22).
 */
@Component({
  selector: 'app-studio-version-strip',
  standalone: true,
  templateUrl: './studio-version-strip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioVersionStripComponent {
  readonly lang = input.required<StudioLanguage>();

  protected readonly store = inject(ImageStudioStore);
  protected readonly delivery = inject(StudioDeliveryService);

  /** The retained versions of the current session, oldest first. */
  protected readonly items = this.delivery.items;
  protected readonly messageId = this.delivery.messageId;
  protected readonly busy = this.delivery.busy;

  protected readonly opened = computed(() => {
    const view = this.delivery.openView();
    return view === null ? null : (this.items().find((item) => item.version.number === view.number) ?? null);
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

  protected open(item: DeliveryItem, event: Event): void {
    this.delivery.open(item.version.number, event.currentTarget as HTMLElement);
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

  protected downloadAll(): Promise<void> {
    return this.delivery.downloadAll();
  }
}
