import { Injectable, inject, signal, untracked, type Signal, type WritableSignal } from '@angular/core';
import { toBase64 } from '../../utils/image-studio/base64';
import type { Turn } from '../../utils/image-studio/ports';
import { IMAGE_CODEC_PORT, SESSION_STORE_PORT } from './image-studio.tokens';
import { ImageStudioStore } from './image-studio.store';

/** The rendered size of one image. */
export interface ImageSize {
  width: number;
  height: number;
}

/**
 * Render-time media facts of the studio feed (US-10.5 DD-9, FR-7, FR-3 (a)). Container-scoped (provided by the Image
 * Studio component, not root), so its caches die with the studio.
 *
 * `sizeOf` probes an image once per distinct key (`turnId:partIndex`) however often the feed re-renders; a probe that
 * rejects is stored as `null` and neither retried nor surfaced. `thumbFor` resolves the data URL of an input image of a
 * user turn: the part's own `inlineData`, or the sent bytes of a `fileData` upload; bytes that are gone give `null`
 * (the thumbnail is omitted, no error). Both caches are dropped when the current session changes; the check runs on the
 * next call, so no change-detection pass is needed. The service holds ids only, no UI text.
 */
@Injectable()
export class StudioMediaService {
  private readonly store = inject(ImageStudioStore);
  private readonly codec = inject(IMAGE_CODEC_PORT);
  private readonly sessionStore = inject(SESSION_STORE_PORT);

  private sizes = new Map<string, WritableSignal<ImageSize | null>>();
  private thumbs = new Map<string, WritableSignal<string | null>>();
  private cacheSession: string | null | undefined = undefined;

  sizeOf(key: string, getBytes: () => Uint8Array | null): Signal<ImageSize | null> {
    this.syncSession();
    const cached = this.sizes.get(key);
    if (cached) return cached;

    const size = signal<ImageSize | null>(null);
    this.sizes.set(key, size);
    const bytes = getBytes();
    if (bytes) {
      void (async () => {
        try {
          const { width, height } = await this.codec.probe(bytes);
          size.set({ width, height });
        } catch {
          // An undecodable image keeps its null size; never retried, never shown (FR-7).
        }
      })();
    }
    return size;
  }

  thumbFor(sessionId: string, turn: Turn, partIndex: number): Signal<string | null> {
    this.syncSession();
    const key = `${sessionId}:${turn.id}:${partIndex}`;
    const cached = this.thumbs.get(key);
    if (cached) return cached;

    const part = turn.parts[partIndex];
    const thumb = signal<string | null>(null);
    this.thumbs.set(key, thumb);
    if (part?.inlineData) {
      thumb.set(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
    } else if (part?.fileData) {
      const { fileUri, mimeType } = part.fileData;
      void (async () => {
        try {
          const stored = await this.sessionStore.getSentBytes(sessionId, fileUri);
          if (stored) thumb.set(`data:${stored.mimeType || mimeType};base64,${toBase64(stored.bytes)}`);
        } catch {
          // The sent bytes cannot be read: the thumbnail is omitted without an error (FR-3).
        }
      })();
    }
    return thumb;
  }

  /** Drops both caches when the current session is not the one they were filled for. */
  private syncSession(): void {
    const current = untracked(() => this.store.currentSessionId());
    if (current === this.cacheSession) return;
    this.cacheSession = current;
    this.sizes = new Map();
    this.thumbs = new Map();
  }
}
