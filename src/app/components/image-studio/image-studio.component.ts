import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, Injector, input, type OnInit, untracked,
} from '@angular/core';
import { ImageStudioStore } from '../../../services/image-studio/image-studio.store';
import { SpendService } from '../../../services/image-studio/spend.service';
import { StudioDeliveryService } from '../../../services/image-studio/studio-delivery.service';
import { StudioMediaService } from '../../../services/image-studio/studio-media.service';
import { studioText, type StudioLanguage, type StudioTextParams } from '../../../utils/image-studio/studio-texts';
import { StudioComposerComponent } from './studio-composer/studio-composer.component';
import { StudioFeedComponent } from './studio-feed/studio-feed.component';
import { StudioFullViewComponent } from './studio-full-view/studio-full-view.component';
import { StudioHeaderComponent } from './studio-header/studio-header.component';
import { StudioSessionListComponent } from './studio-session-list/studio-session-list.component';

/**
 * The Image Studio container (US-10.1 DD-22, DD-23; US-10.5 DD-6, DD-7): the single `role="status"` generation region bound to
 * the store's status message, the `role="alert"` region for errors and notices, and the children: the session list, the header,
 * the results feed (which owns the log, the version strip, Download all and the SynthID notice), the one full-view dialog (a
 * sibling of the feed's log) and the composer. The state lives in the root `ImageStudioStore`, never here, so a paid call
 * survives leaving the mode (DD-14). Every text is resolved from `studio-texts` for `lang()` at render time (FR-77).
 *
 * Focus returns to the prompt field when a generation ends, whatever the outcome and whichever control started it (Generate, Retry,
 * or Upscale 4K / Variation on an image tile), as long as the field is enabled (FR-76, SD-37, D-29; US-10.6 AC-16).
 *
 * US-10.6 T38: the container wires the tile outputs to `store.upscale` / `store.variation` and owns both spend-fetch triggers (plan 12,
 * FR-18 (c)): one `SpendService.refresh()` when the studio opens and one more each time an action ends with at least one image
 * (`store.imageActionsCompleted`). The header only renders. The batch warning and failure lines render inside the one alert region.
 */
/** Store messages the composer already shows itself (X-61, X-62); the container's alert skips them. */
const COMPOSER_OWNED_MESSAGES: readonly string[] = ['X-61', 'X-62'];

@Component({
  selector: 'app-image-studio',
  standalone: true,
  imports: [StudioComposerComponent, StudioFeedComponent, StudioFullViewComponent, StudioHeaderComponent, StudioSessionListComponent],
  providers: [StudioMediaService, StudioDeliveryService],
  templateUrl: './image-studio.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageStudioComponent implements OnInit {
  readonly lang = input.required<StudioLanguage>();

  protected readonly store = inject(ImageStudioStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly spend = inject(SpendService);

  /**
   * The message the alert region shows. A rejected role change (X-61, X-62) is also shown by the composer next to the attachments
   * it concerns, so the container does not render it a second time.
   */
  protected readonly alert = computed(() => {
    const message = this.store.message();
    return message && !COMPOSER_OWNED_MESSAGES.includes(message.textId) ? message : null;
  });

  constructor() {
    // The store announces in the language current at the moment of the announcement (FR-77).
    effect(() => this.store.setLanguage(this.lang()));

    // An action that ended with at least one image refreshes the spend figures (OD-13); a failed, cancelled or text-only one does not.
    let completed = untracked(() => this.store.imageActionsCompleted());
    effect(() => {
      const now = this.store.imageActionsCompleted();
      if (now === completed) return;
      completed = now;
      untracked(() => void this.spend.refresh());
    });

    // When a generation ends, move focus to the prompt once the field is enabled again.
    let wasGenerating = false;
    effect(() => {
      const generating = this.store.generating();
      if (wasGenerating && !generating) afterNextRender(() => this.focusPrompt(), { injector: this.injector });
      wasGenerating = generating;
    });
  }

  ngOnInit(): void {
    // Opening the mode loads the stored sessions once; the store outlives the component (DD-14).
    if (this.store.currentSession() === null) void this.store.init();
    // The spend figures are fetched once when the studio opens; the header only renders them.
    void this.spend.refresh();
  }

  protected tx(id: string, params?: StudioTextParams): string {
    return studioText(id, this.lang(), params);
  }

  private focusPrompt(): void {
    const prompt = this.host.nativeElement.querySelector('textarea');
    if (prompt && !prompt.disabled) prompt.focus();
  }
}
