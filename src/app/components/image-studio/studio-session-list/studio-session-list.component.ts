import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ImageStudioStore } from '../../../../services/image-studio/image-studio.store';
import { LOCAL_OFFSET_PORT } from '../../../../services/image-studio/image-studio.tokens';
import { formatCost, formatRowDate } from '../../../../utils/image-studio/format';
import type { SessionMeta } from '../../../../utils/image-studio/ports';
import { studioCount } from '../../../../utils/image-studio/plural';
import { sessionName } from '../../../../utils/image-studio/session-name';
import { studioText, type StudioLanguage } from '../../../../utils/image-studio/studio-texts';

/**
 * The session list (US-10.1 DD-22, FR-49, FR-86; US-10.5 FR-2, plan DD-16): the stored sessions, newest last activity first (at most 20,
 * the store enforces the cap), under the count line "N sessions" (X-32.*). Each row shows the session name (`sessionName`, absent when
 * empty), the local date (`formatRowDate` with the offset from `LOCAL_OFFSET_PORT`, NFR-4) and the session's own cost. The heading, the
 * New session button (now in the header) and the overall-cost line are gone (D-4). Every text comes from `studio-texts` for `lang()`
 * at render time (FR-77).
 */
@Component({
  selector: 'app-studio-session-list',
  standalone: true,
  templateUrl: './studio-session-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioSessionListComponent {
  readonly lang = input.required<StudioLanguage>();

  protected readonly store = inject(ImageStudioStore);
  private readonly localOffset = inject(LOCAL_OFFSET_PORT);

  /** The count line: the number of stored sessions with its plural form for the interface language. */
  protected countLine(): string {
    return studioCount('X-32', this.lang(), this.store.sessions().length);
  }

  /** The accessible name of the list (the visible heading is gone). */
  protected listLabel(): string {
    return studioText('X-9', this.lang());
  }

  /** The row name: the prompt of the highest-numbered retained version (OI-A option a); empty when blank or without versions. */
  protected nameOf(meta: SessionMeta): string {
    return sessionName(meta);
  }

  /** The last activity of a session as `dd.MM · HH:mm` in the viewer's local time. */
  protected dateOf(meta: SessionMeta): string {
    return formatRowDate(meta.lastActivity, this.localOffset.offsetMinutes(meta.lastActivity));
  }

  /** The session's own estimated cost, `$` and two decimals. */
  protected costOf(meta: SessionMeta): string {
    return formatCost(meta.costUsd) ?? '';
  }

  protected async select(id: string): Promise<void> {
    await this.store.selectSession(id);
  }
}
