import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, Injector, input, type OnInit,
} from '@angular/core';
import { findImageModel } from '../../../prompt-core/model-catalog';
import { ImageStudioStore } from '../../../services/image-studio/image-studio.store';
import { StudioDeliveryService } from '../../../services/image-studio/studio-delivery.service';
import { StudioMediaService } from '../../../services/image-studio/studio-media.service';
import { buildAlt } from '../../../utils/image-studio/alt-text';
import { studioText, type StudioLanguage, type StudioTextParams } from '../../../utils/image-studio/studio-texts';
import { StudioComposerComponent } from './studio-composer/studio-composer.component';
import { StudioFullViewComponent } from './studio-full-view/studio-full-view.component';
import { StudioHeaderComponent } from './studio-header/studio-header.component';
import { StudioSessionListComponent } from './studio-session-list/studio-session-list.component';
import { StudioVersionStripComponent } from './studio-version-strip/studio-version-strip.component';

/** One part of the chat log, in the order the API returned it (FR-20). */
type LogPart =
  | { kind: 'text'; text: string }
  | { kind: 'image'; src: string; prompt: string; number: number; modelLabel: string; resolution: string };

interface LogTurn {
  id: string;
  role: 'user' | 'model';
  parts: LogPart[];
}

/**
 * The Image Studio container (US-10.1 DD-22, DD-23): the chat log of the current session, the single `role="status"`
 * generation region bound to the store's status message, the `role="alert"` region for errors and notices, the SynthID
 * notice, and the three children. The state lives in the root `ImageStudioStore`, never here, so a paid call survives
 * leaving the mode (DD-14). Every text is resolved from `studio-texts` for `lang()` at render time (FR-77).
 *
 * Focus returns to the prompt field when a generation ends, whatever the outcome, as long as the field is enabled
 * (FR-76, SD-37, D-29).
 */
@Component({
  selector: 'app-image-studio',
  standalone: true,
  imports: [StudioComposerComponent, StudioFullViewComponent, StudioHeaderComponent, StudioSessionListComponent, StudioVersionStripComponent],
  providers: [StudioMediaService, StudioDeliveryService],
  templateUrl: './image-studio.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageStudioComponent implements OnInit {
  readonly lang = input.required<StudioLanguage>();

  protected readonly store = inject(ImageStudioStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** The turns of the current session with their images already resolved to data URLs and version labels. */
  protected readonly log = computed<LogTurn[]>(() => {
    const session = this.store.currentSession();
    if (!session) return [];
    const versionOf = new Map(session.meta.versions.map((v) => [`${v.turnId}:${v.partIndex}`, v]));
    return session.turns.map((turn) => {
      const parts: LogPart[] = [];
      turn.parts.forEach((part, index) => {
        if (part.thought) return;
        if (part.text !== undefined && part.text.trim() !== '') parts.push({ kind: 'text', text: part.text });
        const version = versionOf.get(`${turn.id}:${index}`);
        if (turn.role === 'model' && part.inlineData && version) {
          parts.push({
            kind: 'image',
            src: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            prompt: version.prompt,
            number: version.number,
            modelLabel: findImageModel(version.model)?.label ?? version.model,
            resolution: version.resolution,
          });
        }
      });
      return { id: turn.id, role: turn.role, parts };
    });
  });

  constructor() {
    // The store announces in the language current at the moment of the announcement (FR-77).
    effect(() => this.store.setLanguage(this.lang()));

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
  }

  protected tx(id: string, params?: StudioTextParams): string {
    return studioText(id, this.lang(), params);
  }

  /** The `alt` of a generated image: the prompt cut by the alt-text rule, or the localised fallback (FR-75, D-35). */
  protected altOf(prompt: string): string {
    const alt = buildAlt(prompt);
    return alt.kind === 'prompt' ? alt.text : this.tx(alt.textId);
  }

  protected async retry(): Promise<void> {
    await this.store.retry();
  }

  private focusPrompt(): void {
    const prompt = this.host.nativeElement.querySelector('textarea');
    if (prompt && !prompt.disabled) prompt.focus();
  }
}
