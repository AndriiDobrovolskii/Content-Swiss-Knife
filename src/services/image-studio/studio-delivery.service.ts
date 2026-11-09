import { Injectable, computed, inject, signal } from '@angular/core';
import { buildArchiveName } from '../../utils/image-studio/archive-name';
import { fromBase64 } from '../../utils/image-studio/base64';
import { deliver, deliverForClipboard, DeliveryError } from '../../utils/image-studio/delivery';
import { buildFileName } from '../../utils/image-studio/file-name';
import type { ImageMime, Version } from '../../utils/image-studio/ports';
import { sessionName } from '../../utils/image-studio/session-name';
import { ZipBuildError, type ZipVersion } from '../../utils/image-studio/zip';
import { ImageStudioStore } from './image-studio.store';
import { ARCHIVE_BUILDER_PORT, CLIPBOARD_PORT, CLOCK_PORT, IMAGE_CODEC_PORT, SAVE_PORT } from './image-studio.tokens';

/** One retained version with the bytes of its image as the API returned them. */
export interface DeliveryItem {
  version: Version;
  mime: ImageMime | null;
  data: string | null;
}

/** The open full-view state: the version shown, and the version it is compared with when opened from a compare. */
export interface OpenView {
  number: number;
  compareWith?: number;
}

/** A failure whose studio text is already known. */
class DeliveryFailure extends Error {
  constructor(public readonly textId: string) {
    super(textId);
  }
}

/**
 * The delivery state and actions of the Image Studio (US-10.5 DD-6, DD-8, FR-6, FR-10, FR-11, FR-12): what the version
 * strip used to own privately, now shared by the tile, the full view and the feed. Container-scoped (provided by the
 * Image Studio component, not root).
 *
 * Delivery is native: Download and Download all hand over the bytes the API returned, untouched, with the extension of
 * their own MIME, and never call the codec; only Copy to clipboard converts, to PNG (FR-57). A version is flagged as
 * downloaded only after the success signal of SD-17. Every failure is reported as a studio text id (X-18 to X-22);
 * the service holds ids only, no UI text.
 */
@Injectable()
export class StudioDeliveryService {
  private readonly store = inject(ImageStudioStore);
  private readonly codec = inject(IMAGE_CODEC_PORT);
  private readonly savePort = inject(SAVE_PORT);
  private readonly clipboard = inject(CLIPBOARD_PORT);
  private readonly clock = inject(CLOCK_PORT);
  private readonly buildArchive = inject(ARCHIVE_BUILDER_PORT);

  /** The retained versions of the current session, oldest first, with their bytes. */
  readonly items = computed<DeliveryItem[]>(() => {
    const session = this.store.currentSession();
    if (!session) return [];
    return [...session.meta.versions]
      .sort((a, b) => a.number - b.number)
      .map((version) => {
        const inline = session.turns.find((turn) => turn.id === version.turnId)?.parts[version.partIndex]?.inlineData;
        return { version, mime: (inline?.mimeType as ImageMime | undefined) ?? null, data: inline?.data ?? null };
      });
  });

  private readonly busySignal = signal(false);
  private readonly messageIdSignal = signal<string | null>(null);
  private readonly openViewSignal = signal<OpenView | null>(null);

  /** True while a download, copy or archive build runs; a generation does not set it. */
  readonly busy = this.busySignal.asReadonly();
  /** The studio text id of the last failure, cleared when the next action starts. */
  readonly messageId = this.messageIdSignal.asReadonly();
  readonly openView = this.openViewSignal.asReadonly();
  readonly downloadAllDisabled = computed(() => this.items().length === 0 || this.busy());

  private opener: HTMLElement | null = null;

  open(number: number, opener?: HTMLElement | null, compareWith?: number): void {
    this.opener = opener ?? null;
    this.messageIdSignal.set(null);
    this.openViewSignal.set(compareWith === undefined ? { number } : { number, compareWith });
  }

  /** Closes the full view and returns focus to the element that opened it. */
  close(): void {
    this.openViewSignal.set(null);
    this.opener?.focus();
    this.opener = null;
  }

  async edit(number: number): Promise<void> {
    await this.store.editVersion(number);
  }

  /** One-click download: the API bytes, their MIME and the extension of that MIME; no codec call (FR-6). */
  async download(number: number): Promise<void> {
    await this.run(async () => {
      const item = this.itemOf(number);
      const source = this.sourceOf(item);
      const file = await deliver(source, source.mime, { codec: this.codec });
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

  /** Copies the version to the clipboard as PNG, whatever its own format (FR-57). */
  async copy(number: number): Promise<void> {
    await this.run(async () => {
      const item = this.itemOf(number);
      const file = await deliverForClipboard(this.sourceOf(item), { codec: this.codec });
      try {
        await this.clipboard.writePng(file.bytes);
      } catch {
        throw new DeliveryFailure('X-20');
      }
      return [item.version.number];
    });
  }

  /** One ZIP of every retained version in its native format, named from the instant and the session name (FR-11, FR-12). */
  async downloadAll(): Promise<void> {
    if (this.downloadAllDisabled()) return;
    await this.run(async () => {
      const session = this.store.currentSession();
      const now = this.clock.now();
      const versions: ZipVersion[] = this.items().map((item) => {
        const source = this.sourceOf(item);
        return {
          number: item.version.number,
          bytes: source.bytes,
          mime: source.mime,
          targetMime: source.mime,
          aspectRatio: item.version.aspectRatio,
        };
      });
      const zip = await this.buildArchive(versions, { codec: this.codec, productName: this.store.draft().productName });
      if (zip === null) return [];
      this.save(zip, 'application/zip', buildArchiveName(session ? sessionName(session.meta) : '', now));
      return versions.map((v) => v.number);
    });
  }

  /**
   * Runs one delivery action: clears the previous message, maps a failure to its studio text, and flags the versions
   * as downloaded only after the action succeeded (SD-17). A storage failure of the flag is the store's to report.
   */
  private async run(action: () => Promise<number[]>): Promise<void> {
    if (this.busy()) return;
    this.busySignal.set(true);
    this.messageIdSignal.set(null);
    let delivered: number[];
    try {
      delivered = await action();
    } catch (error) {
      this.messageIdSignal.set(this.failureText(error));
      return;
    } finally {
      this.busySignal.set(false);
    }
    if (delivered.length > 0) await this.store.markDownloaded(delivered);
  }

  private failureText(error: unknown): string {
    if (error instanceof DeliveryFailure) return error.textId;
    if (error instanceof DeliveryError) return error.kind === 'bytes-unavailable' ? 'X-22' : 'X-19';
    if (error instanceof ZipBuildError) return 'X-21';
    return 'X-18';
  }

  private itemOf(number: number): DeliveryItem {
    const item = this.items().find((i) => i.version.number === number);
    if (!item) throw new DeliveryError('bytes-unavailable');
    return item;
  }

  /** The bytes of a version as the API returned them; throws when they are not available (X-22). */
  private sourceOf(item: DeliveryItem): { bytes: Uint8Array; mime: ImageMime } {
    if (!item.mime || !item.data) throw new DeliveryError('bytes-unavailable');
    return { bytes: fromBase64(item.data), mime: item.mime };
  }

  /** Hands a file to the browser's save mechanism; a throw is the download failure X-18. */
  private save(bytes: Uint8Array, mimeType: string, fileName: string): void {
    try {
      this.savePort.save(bytes, mimeType, fileName);
    } catch {
      throw new DeliveryFailure('X-18');
    }
  }
}
