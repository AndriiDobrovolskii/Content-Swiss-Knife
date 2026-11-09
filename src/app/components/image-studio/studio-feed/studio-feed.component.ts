import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { findPreset } from '../../../../prompt-core/prompt-presets';
import { ImageStudioStore } from '../../../../services/image-studio/image-studio.store';
import { StudioDeliveryService } from '../../../../services/image-studio/studio-delivery.service';
import { buildFeed, type FeedCard } from '../../../../utils/image-studio/feed';
import { studioText, type StudioLanguage, type StudioTextParams } from '../../../../utils/image-studio/studio-texts';
import { StudioEmptyStateComponent } from '../studio-empty-state/studio-empty-state.component';
import { StudioTurnCardComponent } from '../studio-turn-card/studio-turn-card.component';

/**
 * The results feed (US-10.5 FR-3 (h), FR-11, FR-18, FR-20, FR-33; plan DD-7, DD-8): a `role="log"` container that is always
 * rendered (its live setting is off: announcements belong to the container's one status region), holding the empty state, or
 * a presentational first-generation progress element, or the turn cards oldest first. Above the log, outside it, sit the
 * controls and notes: "Download all (N) .zip" (from `StudioDeliveryService`; not rendered while the empty state shows) and the
 * SynthID notice. The delivery failure messages (X-18 to X-22) are a `role="alert"` element outside the log as well.
 *
 * The empty state shows iff the session has no turns and no generation runs; the progress element replaces it during the
 * first generation (no role, no live region, `aria-hidden`), and the empty state returns when that generation stores no turn.
 * Before any session exists the log renders empty. Every text is a `studio-texts` id resolved for `lang()` at render time.
 * After the cards, still inside the log, come the non-history events (text replies) and Retry (T32, FR-27), with today's content
 * and behaviour. The version strip slot is T33's: it will sit between the cards and the events.
 */
@Component({
  selector: 'app-studio-feed',
  standalone: true,
  imports: [StudioEmptyStateComponent, StudioTurnCardComponent],
  templateUrl: './studio-feed.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioFeedComponent {
  readonly lang = input.required<StudioLanguage>();

  protected readonly store = inject(ImageStudioStore);
  protected readonly delivery = inject(StudioDeliveryService);

  private readonly session = this.store.currentSession;

  /** The cards of the current session, oldest first. */
  protected readonly cards = computed<FeedCard[]>(() => {
    const session = this.session();
    return session ? buildFeed(session, { isKnownPresetId: (id) => findPreset(id) !== undefined }).cards : [];
  });

  /** True for a session with no stored turn (FR-18); false before any session exists. */
  private readonly noTurns = computed(() => {
    const session = this.session();
    return session !== null && session.turns.length === 0;
  });

  protected readonly showEmpty = computed(() => this.noTurns() && !this.store.generating());
  protected readonly showProgress = computed(() => this.noTurns() && this.store.generating());
  protected readonly showDownloadAll = computed(() => this.session() !== null && !this.showEmpty());

  protected readonly versionCount = computed(() => this.delivery.items().length);
  protected readonly messageId = this.delivery.messageId;

  protected downloadAll(): Promise<void> {
    return this.delivery.downloadAll();
  }

  protected retry(): Promise<void> {
    return this.store.retry();
  }

  protected tx(id: string, params?: StudioTextParams): string {
    return studioText(id, this.lang(), params);
  }
}
