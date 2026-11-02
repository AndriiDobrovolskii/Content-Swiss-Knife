import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ImageStudioStore } from '../../../../services/image-studio/image-studio.store';
import { buildAlt } from '../../../../utils/image-studio/alt-text';
import type { SessionMeta } from '../../../../utils/image-studio/ports';
import { studioText, type StudioLanguage, type StudioTextParams } from '../../../../utils/image-studio/studio-texts';

/**
 * The session list (US-10.1 DD-22, FR-49, FR-71, FR-86): the stored sessions, newest last activity first (at most 20,
 * the store enforces the cap), New session behind the T-23 confirmation, selection, and the running estimated cost of
 * the current session (X-10). The list and New session stay enabled while a generation runs: the store keeps the
 * response with the session that sent it. Every text comes from `studio-texts` for `lang()` at render time (FR-77).
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

  protected tx(id: string, params?: StudioTextParams): string {
    return studioText(id, this.lang(), params);
  }

  /** The estimated total of the current session in dollars (FR-71). */
  protected costLine(): string {
    return this.tx('X-10', { amount: `$${this.store.costUsd().toFixed(2)}` });
  }

  /** The last activity of a session in the interface language. */
  protected whenOf(meta: SessionMeta): string {
    return new Date(meta.lastActivity).toLocaleString(this.lang() === 'uk' ? 'uk-UA' : 'en-GB');
  }

  /** The prompt of the session's latest version, cut by the alt-text rule; empty before the first version. */
  protected subtitleOf(meta: SessionMeta): string {
    const latest = meta.versions.reduce<SessionMeta['versions'][number] | undefined>(
      (best, v) => (!best || v.number > best.number ? v : best),
      undefined,
    );
    if (!latest) return '';
    const alt = buildAlt(latest.prompt);
    return alt.kind === 'prompt' ? alt.text : '';
  }

  protected async select(id: string): Promise<void> {
    await this.store.selectSession(id);
  }

  protected async newSession(): Promise<void> {
    await this.store.newSession();
  }
}
