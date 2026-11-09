import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { ASPECT_RATIOS } from '../../../../prompt-core/image-studio-contract';
import { findImageModel, IMAGE_MODELS } from '../../../../prompt-core/model-catalog';
import {
  CHIP_INSTRUCTIONS, presetName, PROMPT_PRESETS, type ChipInstruction, type PromptPreset,
} from '../../../../prompt-core/prompt-presets';
import { ImageStudioStore } from '../../../../services/image-studio/image-studio.store';
import {
  ALERT_PORT, ID_SOURCE_PORT, IMAGE_CODEC_PORT, SESSION_STORE_PORT,
} from '../../../../services/image-studio/image-studio.tokens';
import { LlmService } from '../../../../services/llm.service';
import { dispatchError } from '../../../../utils/image-studio/error-dispatch';
import { ingestImage, type IngestResult } from '../../../../utils/image-studio/image-ingest';
import { detectImageType } from '../../../../utils/image-studio/magic-bytes';
import { studioText, type StudioLanguage, type StudioTextParams } from '../../../../utils/image-studio/studio-texts';
import { canAttachUpload } from '../../../../utils/image-studio/upload-rules';

/** Base64 of a byte array, built in slices so a multi-megabyte image does not overflow the call stack. */
function toBase64(bytes: Uint8Array): string {
  const SLICE = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += SLICE) binary += String.fromCharCode(...bytes.subarray(i, i + SLICE));
  return btoa(binary);
}

/** The reason shown in the composer's alert region after a refused or failed attachment: a studio text id. */
interface AttachMessage {
  textId: string;
}

/**
 * The studio composer (US-10.1 DD-22, restyled by US-10.5): presets (picked through the store's `applyPreset`),
 * the attachment surface (button, drop zone, paste, thumbnails, upload states), quick-edit chips directly above the
 * prompt, the prompt, the product-name field, the ratio, resolution and model selectors, Generate and Cancel. State lives in the root `ImageStudioStore`; this component renders it and forwards user actions. Every text
 * is resolved from `studio-texts` for `lang()` at render time (FR-77).
 *
 * Attaching (DD-17): each accepted file is ingested (DD-20) and uploaded at once; the attachment shows `uploading`,
 * `ready` or `failed` in the store's draft, and Send waits for every upload.
 */
@Component({
  selector: 'app-studio-composer',
  standalone: true,
  templateUrl: './studio-composer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioComposerComponent {
  readonly lang = input.required<StudioLanguage>();

  protected readonly store = inject(ImageStudioStore);
  private readonly llm = inject(LlmService);
  private readonly codec = inject(IMAGE_CODEC_PORT);
  private readonly sessionStore = inject(SESSION_STORE_PORT);
  private readonly ids = inject(ID_SOURCE_PORT);
  private readonly alerts = inject(ALERT_PORT);

  protected readonly presets = PROMPT_PRESETS;
  protected readonly chips = CHIP_INSTRUCTIONS;
  protected readonly ratios = ASPECT_RATIOS;
  protected readonly models = IMAGE_MODELS;
  /** The resolutions the selected model accepts: 4K is offered only by Pro (FR-19). */
  protected readonly resolutions = computed(() => findImageModel(this.store.draft().model)?.resolutions ?? []);
  /** The send button's label follows the draft, not the reason it is disabled: "Generate" or "Write a prompt to start" (FR-17). */
  protected readonly sendLabelTextId = computed(() => (this.store.sendState().labelId === 'generate' ? 'X-1' : 'X-29'));
  /** Chips appear only once the session holds a version (FR-31). */
  protected readonly showChips = computed(() => this.store.versions().length > 0);

  /** The reason of the last refused or failed attachment (T-1 to T-3, T-7, T-11, T-12); shown in `role="alert"`. */
  protected readonly attachMessage = signal<AttachMessage | null>(null);
  /** Local previews by attachment id, built from the file the user chose. */
  protected readonly previews = signal<Record<string, string>>({});
  /** Attachments whose failure is an exhausted retry loop: only these offer Retry (T-22, FR-16). */
  protected readonly retryable = signal<ReadonlySet<string>>(new Set());
  /** The user's bytes by attachment id, kept so a Retry can run the whole ingest again. */
  private readonly originals = new Map<string, Uint8Array>();
  private activeIngests = 0;
  private storeFailed = false;

  constructor() {
    // Forget the previews and bytes of attachments that left the draft (removed, or cleared by a send).
    effect(() => {
      const live = new Set(this.store.draft().attachments.map((a) => a.id));
      untracked(() => {
        for (const id of [...this.originals.keys()]) if (!live.has(id)) this.originals.delete(id);
        this.previews.update((all) => {
          const kept = Object.entries(all).filter(([id]) => live.has(id));
          return kept.length === Object.keys(all).length ? all : Object.fromEntries(kept);
        });
        this.retryable.update((all) => {
          const kept = [...all].filter((id) => live.has(id));
          return kept.length === all.size ? all : new Set(kept);
        });
      });
    });
  }

  protected tx(id: string, params?: StudioTextParams): string {
    return studioText(id, this.lang(), params);
  }

  protected presetLabel(preset: PromptPreset): string {
    return presetName(preset, this.lang());
  }

  protected chipLabel(chip: ChipInstruction): string {
    return studioText(chip.textId, this.lang());
  }

  /**
   * Typing clears only the check mark (FR-14 c): the wire `presetId` keeps being sent, but the stored turn records a
   * preset only while the check mark was showing at send.
   */
  protected onText(event: Event): void {
    this.store.setDraft({ text: (event.target as HTMLTextAreaElement).value, checkedPresetId: null });
  }

  protected onProductName(event: Event): void {
    this.store.setDraft({ productName: (event.target as HTMLInputElement).value });
  }

  protected onRatio(event: Event): void {
    this.store.setDraft({ aspectRatio: (event.target as HTMLSelectElement).value });
  }

  protected onResolution(event: Event): void {
    this.store.setDraft({ resolution: (event.target as HTMLSelectElement).value });
  }

  /** The model switch (FR-50): the store decides between "next message only" and "new seeded session". */
  protected async onModel(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    await this.store.switchModel(select.value);
    // A refused switch must not leave the control showing a model that is not in use.
    select.value = this.store.draft().model;
  }

  /**
   * A chip is a one-click edit of the latest version: its English instruction is sent at once (FR-31). A chip send
   * records no preset, neither the wire one nor the checked one (FR-14), so both fields are cleared first.
   */
  protected async sendChip(chip: ChipInstruction): Promise<void> {
    this.store.setDraft({ text: chip.instruction, presetId: null, checkedPresetId: null });
    await this.store.send();
  }

  protected async send(): Promise<void> {
    await this.store.send();
  }

  /** Ctrl+Enter in the prompt sends exactly when a click on the enabled button would (FR-17); never a newline. */
  protected async onCtrlEnter(event: Event): Promise<void> {
    event.preventDefault();
    if (this.store.sendState().enabled) await this.send();
  }

  protected cancel(): void {
    this.store.cancel();
  }

  // ---- attachments (FR-8, FR-10, FR-14 to FR-16, FR-73, FR-81) --------------------------------------------------

  protected onFilesChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.attachFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    if (!this.store.inputEnabled()) return;
    event.preventDefault();
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.attachFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  /** A pasted image attaches through the same path; pasted text is left to the textarea. */
  protected onPaste(event: ClipboardEvent): void {
    const data = event.clipboardData;
    if (!data) return;
    let files = Array.from(data.files ?? []);
    if (files.length === 0) {
      files = Array.from(data.items ?? [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
    }
    if (files.length === 0) return;
    event.preventDefault();
    this.attachFiles(files);
  }

  protected removeAttachment(id: string): void {
    this.store.removeAttachment(id);
  }

  protected removeAttachedVersion(): void {
    this.store.setDraft({ attachedVersion: null });
  }

  protected retryAttachment(id: string): void {
    const bytes = this.originals.get(id);
    const sessionId = this.store.currentSessionId();
    if (!bytes || sessionId === null || !this.updateAttachment(id, { state: 'uploading' })) return;
    this.attachMessage.set(null);
    this.retryable.update((all) => new Set([...all].filter((x) => x !== id)));
    void this.runIngest(id, bytes, sessionId);
  }

  /**
   * Reserves a thumbnail for each file at once (so the five-upload rule counts files that are still being read),
   * then ingests and uploads them. The attached version is outside the five (FR-10).
   */
  private attachFiles(files: File[]): void {
    if (files.length === 0 || !this.store.inputEnabled()) return;
    const sessionId = this.store.currentSessionId();
    if (sessionId === null) return;
    this.attachMessage.set(null);
    for (const file of files) {
      const current = this.store.draft().attachments;
      if (!canAttachUpload(current.map(() => ({ kind: 'upload' as const }))).ok) {
        this.attachMessage.set({ textId: 'T-3' });
        break;
      }
      const id = this.ids.next();
      this.store.setDraft({
        attachments: [...current, { id, fileName: file.name, fileUri: '', mimeType: file.type, state: 'uploading' }],
      });
      void this.runIngest(id, file, sessionId);
    }
  }

  private async runIngest(id: string, source: File | Uint8Array, sessionId: string): Promise<void> {
    this.activeIngests += 1;
    try {
      const bytes = source instanceof Uint8Array ? source : new Uint8Array(await source.arrayBuffer());
      this.originals.set(id, bytes);
      const detected = detectImageType(bytes);
      if (detected) this.previews.update((all) => ({ ...all, [id]: `data:${detected};base64,${toBase64(bytes)}` }));

      const result = await ingestImage({ bytes }, {
        codec: this.codec,
        upload: (request, signal) => this.llm.uploadImageFile(request, signal),
        storeSentBytes: (fileUri, sent, mimeType) => this.sessionStore.putSentBytes(sessionId, fileUri, sent, mimeType),
        onStoreFailure: () => { this.storeFailed = true; },
      });
      if (this.store.currentSessionId() !== sessionId) return;

      if (result.ok) {
        this.updateAttachment(id, { state: 'ready', fileUri: result.fileUri, mimeType: result.mimeType });
      } else if ((result as Extract<IngestResult, { ok: false }>).reason === 'upload') {
        // The compiler configuration does not narrow a boolean discriminant, so the failure arm is named.
        const failure = result as Extract<IngestResult, { reason: 'upload' }>;
        const outcome = dispatchError({ status: failure.status, errorField: failure.errorField });
        if (this.updateAttachment(id, { state: 'failed' })) {
          this.attachMessage.set({ textId: outcome.textId });
          if (outcome.retry) this.retryable.update((all) => new Set([...all, id]));
        }
      } else {
        this.store.removeAttachment(id);
        this.attachMessage.set({ textId: (result as Extract<IngestResult, { ok: false }>).reason });
      }
    } catch {
      // A file that cannot even be read is not an image the studio can use (T-1).
      this.store.removeAttachment(id);
      this.attachMessage.set({ textId: 'T-1' });
    } finally {
      this.activeIngests -= 1;
      // One native alert for every sent-bytes store failure of a run of attachments (FR-81, D-28).
      if (this.activeIngests === 0 && this.storeFailed) {
        this.storeFailed = false;
        this.alerts.alert(studioText('T-20', this.lang()));
      }
    }
  }

  /** Patches one attachment of the current draft; false when it is no longer there (removed meanwhile). */
  private updateAttachment(
    id: string,
    patch: Partial<{ state: 'uploading' | 'ready' | 'failed'; fileUri: string; mimeType: string }>,
  ): boolean {
    const current = this.store.draft().attachments;
    if (!current.some((a) => a.id === id)) return false;
    this.store.setDraft({ attachments: current.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
    return true;
  }
}
