import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ImageStudioStore } from '../../../../services/image-studio/image-studio.store';
import { SpendService } from '../../../../services/image-studio/spend.service';
import { formatMoney } from '../../../../utils/image-studio/format';
import { studioCount } from '../../../../utils/image-studio/plural';
import { studioText, type StudioLanguage } from '../../../../utils/image-studio/studio-texts';

/**
 * The studio header (US-10.5 FR-1, plan DD-6): the "Image Studio" heading (X-30, a heading, never a button), the New session
 * button (moved here from the session list, D-4; the T-23 confirmation and the cap-of-20 eviction stay in the store) and the
 * plain text "· history (N)" with N = the stored sessions (X-33.*). It has no history control (OD-6b, OD-6c).
 * US-10.6 T37 (FR-18, AC-12): at the right end it shows "Today $X · month $Y" (X-53, two decimals) from `SpendService.state`. The header
 * only RENDERS that state and fetches nothing: the container (T38) calls `refresh()`. While loading and after a failed fetch there is
 * no figure, only a neutral dash (never `$0.00` for an unknown value). The per-session cost counter (US-10.1 FR-71) is not in this component and is kept.
 * Every text comes from `studio-texts` for `lang()` at render time (FR-77).
 */
@Component({
  selector: 'app-studio-header',
  standalone: true,
  templateUrl: './studio-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioHeaderComponent {
  readonly lang = input.required<StudioLanguage>();

  protected readonly store = inject(ImageStudioStore);
  private readonly spend = inject(SpendService);

  protected title(): string {
    return studioText('X-30', this.lang());
  }

  protected newSessionLabel(): string {
    return studioText('T-22.newSession', this.lang());
  }

  protected historyCount(): string {
    return studioCount('X-33', this.lang(), this.store.sessions().length);
  }

  /** "Today $X · month $Y" (X-53) once the figures are ready; null while loading and after a failed fetch. */
  protected spendText(): string | null {
    const state = this.spend.state();
    if (state.kind !== 'ready') return null;
    const today = formatMoney(state.today, 2);
    const month = formatMoney(state.month, 2);
    if (today === null || month === null) return null;
    // The "$" is part of the X-53 text, so the placeholders take the money without its own sign.
    return studioText('X-53', this.lang(), { today: today.slice(1), month: month.slice(1) });
  }

  protected async newSession(): Promise<void> {
    await this.store.newSession();
  }
}
