import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, signal, untracked, viewChild } from '@angular/core';
import { ImageStudioStore } from '../../../../services/image-studio/image-studio.store';
import { CLIPBOARD_PORT, IMAGE_CODEC_PORT, SAVE_PORT } from '../../../../services/image-studio/image-studio.tokens';
import { buildAlt } from '../../../../utils/image-studio/alt-text';
import { deliver, deliverForClipboard, DeliveryError } from '../../../../utils/image-studio/delivery';
import { buildFileName } from '../../../../utils/image-studio/file-name';
import { resolveTargetFormat } from '../../../../utils/image-studio/output-format';
import type { ImageMime, Version } from '../../../../utils/image-studio/ports';
import { studioText, type StudioLanguage, type StudioTextParams } from '../../../../utils/image-studio/studio-texts';
import { buildZip, ZipBuildError, type ZipVersion } from '../../../../utils/image-studio/zip';

/** One retained version with the bytes of its image as the API returned them. */
interface StripItem {
  version: Version;
  mime: ImageMime | null;
  data: string | null;
}

const FORMATS: ReadonlyArray<{ mime: ImageMime; label: string }> = [
  { mime: 'image/png', label: 'PNG' },
  { mime: 'image/jpeg', label: 'JPG' },
  { mime: 'image/webp', label: 'WEBP' },
];

const ZIP_FILE_NAME = 'image-studio-versions.zip';

function fromBase64(data: string): Uint8Array {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * The version strip (US-10.1 DD-22, FR-33, FR-37, FR-38, FR-54 to FR-58): the retained versions of the current
 * session, the full view of one version with its delivery actions (format selector, Download, Copy to clipboard,
 * Edit this version), and Download all versions. The bytes, the conversions and the file names come from the pure
 * delivery modules; saving and the clipboard go through their ports. A version is flagged as downloaded only after
 * the success signal of SD-17. Every failure is reported through the `role="alert"` region (X-18 to X-22).
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
  private readonly codec = inject(IMAGE_CODEC_PORT);
  private readonly savePort = inject(SAVE_PORT);
  private readonly clipboard = inject(CLIPBOARD_PORT);

  protected readonly formats = FORMATS;
  /** The retained versions of the current session, oldest first. */
  protected readonly items = computed<StripItem[]>(() => {
    const session = this.store.currentSession();
    if (!session) return [];
    return [...session.meta.versions]
      .sort((a, b) => a.number - b.number)
      .map((version) => {
        const inline = session.turns.find((turn) => turn.id === version.turnId)?.parts[version.partIndex]?.inlineData;
        return { version, mime: (inline?.mimeType as ImageMime | undefined) ?? null, data: inline?.data ?? null };
      });
  });

  /** The version number whose full view is open. */
  private readonly openNumber = signal<number | null>(null);
  /** The operator's selector choices, per session and version; never persisted (D-22). */
  private readonly formatChoice = signal<Record<string, ImageMime>>({});
  protected readonly messageId = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly opened = computed(() => {
    const number = this.openNumber();
    return number === null ? null : (this.items().find((item) => item.version.number === number) ?? null);
  });

  private readonly dialogRef = viewChild<ElementRef<HTMLElement>>('dialog');
  private opener: HTMLElement | null = null;

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

  protected altOf(item: StripItem): string {
    const alt = buildAlt(item.version.prompt);
    return alt.kind === 'prompt' ? alt.text : this.tx(alt.textId);
  }

  protected srcOf(item: StripItem): string | null {
    return item.mime && item.data ? `data:${item.mime};base64,${item.data}` : null;
  }

  protected targetOf(item: StripItem): ImageMime {
    return resolveTargetFormat(item.version.inputFormat, this.formatChoice()[this.choiceKey(item.version)]);
  }

  protected open(item: StripItem, event: Event): void {
    this.opener = event.currentTarget as HTMLElement;
    this.messageId.set(null);
    this.openNumber.set(item.version.number);
  }

  protected close(): void {
    this.openNumber.set(null);
    this.opener?.focus();
    this.opener = null;
  }

  protected onFormat(item: StripItem, event: Event): void {
    const mime = (event.target as HTMLSelectElement).value as ImageMime;
    this.formatChoice.update((all) => ({ ...all, [this.choiceKey(item.version)]: mime }));
  }

  protected async edit(item: StripItem): Promise<void> {
    await this.store.editVersion(item.version.number);
  }

  /** One-click download in the version's target format (FR-54, FR-55). */
  protected async download(item: StripItem): Promise<void> {
    await this.run(async () => {
      const source = this.sourceOf(item);
      const file = await deliver(source, this.targetOf(item), { codec: this.codec });
      const name = buildFileName({
        productName: this.store.draft().productName,
        versionNumber: item.version.number,
        aspectRatio: item.version.aspectRatio,
        mimeType: file.mime,
      });
      this.save(file.bytes, file.mime, name);
      return [item.version.number];
    });
  }

  /** Copies the version to the clipboard as PNG, whatever its target format (FR-57). */
  protected async copy(item: StripItem): Promise<void> {
    await this.run(async () => {
      const file = await deliverForClipboard(this.sourceOf(item), { codec: this.codec });
      try {
        await this.clipboard.writePng(file.bytes);
      } catch {
        throw new StripFailure('X-20');
      }
      return [item.version.number];
    });
  }

  /** One ZIP of every retained version, each in its own target format (FR-58). */
  protected async downloadAll(): Promise<void> {
    await this.run(async () => {
      const items = this.items();
      const versions: ZipVersion[] = items.map((item) => {
        const source = this.sourceOf(item);
        return {
          number: item.version.number,
          bytes: source.bytes,
          mime: source.mime,
          targetMime: this.targetOf(item),
          aspectRatio: item.version.aspectRatio,
        };
      });
      const zip = await buildZip(versions, { codec: this.codec, productName: this.store.draft().productName });
      if (zip === null) return [];
      this.save(zip, 'application/zip', ZIP_FILE_NAME);
      return versions.map((v) => v.number);
    });
  }

  /**
   * Runs one delivery action: clears the previous message, maps a failure to its studio text, and flags the versions
   * as downloaded only after the action succeeded (SD-17). A storage failure of the flag is the store's to report.
   */
  private async run(action: () => Promise<number[]>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.messageId.set(null);
    let delivered: number[];
    try {
      delivered = await action();
    } catch (error) {
      this.messageId.set(this.failureText(error));
      return;
    } finally {
      this.busy.set(false);
    }
    if (delivered.length > 0) await this.store.markDownloaded(delivered);
  }

  private failureText(error: unknown): string {
    if (error instanceof StripFailure) return error.textId;
    if (error instanceof DeliveryError) return error.kind === 'bytes-unavailable' ? 'X-22' : 'X-19';
    if (error instanceof ZipBuildError) return 'X-21';
    return 'X-18';
  }

  /** The bytes of a version as the API returned them; throws when they are not available (X-22). */
  private sourceOf(item: StripItem): { bytes: Uint8Array; mime: ImageMime } {
    if (!item.mime || !item.data) throw new DeliveryError('bytes-unavailable');
    return { bytes: fromBase64(item.data), mime: item.mime };
  }

  /** Hands a file to the browser's save mechanism; a throw is the download failure X-18. */
  private save(bytes: Uint8Array, mimeType: string, fileName: string): void {
    try {
      this.savePort.save(bytes, mimeType, fileName);
    } catch {
      throw new StripFailure('X-18');
    }
  }

  private choiceKey(version: Version): string {
    return `${this.store.currentSessionId() ?? ''}:${version.number}`;
  }
}

/** A failure whose studio text is already known. */
class StripFailure extends Error {
  constructor(public readonly textId: string) {
    super(textId);
  }
}
