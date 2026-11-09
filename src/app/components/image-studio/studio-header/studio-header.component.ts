import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ImageStudioStore } from '../../../../services/image-studio/image-studio.store';
import { studioCount } from '../../../../utils/image-studio/plural';
import { studioText, type StudioLanguage } from '../../../../utils/image-studio/studio-texts';

/**
 * The studio header (US-10.5 FR-1, plan DD-6): the "Image Studio" heading (X-30, a heading, never a button), the New session
 * button (moved here from the session list, D-4; the T-23 confirmation and the cap-of-20 eviction stay in the store) and the
 * plain text "· history (N)" with N = the stored sessions (X-33.*). It shows no spend total and no history control (OD-6b, OD-6c).
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

  protected title(): string {
    return studioText('X-30', this.lang());
  }

  protected newSessionLabel(): string {
    return studioText('T-22.newSession', this.lang());
  }

  protected historyCount(): string {
    return studioCount('X-33', this.lang(), this.store.sessions().length);
  }

  protected async newSession(): Promise<void> {
    await this.store.newSession();
  }
}
