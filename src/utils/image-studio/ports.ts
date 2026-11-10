/**
 * The ports of the Image Studio (US-10.1 DD-15, NFR-14).
 *
 * Every ambient effect the studio's logic needs (time, timers, ids, storage, image decoding, dialogs, clipboard,
 * file saving, language, live announcements) is reached through one of these interfaces, so the logic is plain
 * TypeScript that runs in the logic runner with in-memory fakes. The browser implementations are thin adapters
 * that contain no decisions; they are bound through injection tokens (`image-studio.tokens.ts`).
 *
 * This file declares interfaces and one error class only.
 */

/** The image formats the studio accepts and produces. */
export type ImageMime = 'image/png' | 'image/jpeg' | 'image/webp';

/** Wall-clock time in epoch milliseconds. */
export interface Clock {
  now(): number;
}

/** Timers. The handle type is opaque to the caller. */
export interface Scheduler {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

/** Source of turn and session ids (SD-20). */
export interface IdSource {
  next(): string;
}

/** A blocking user notification (wraps the browser alert dialog). */
export interface AlertPort {
  alert(message: string): void;
}

/** A blocking yes/no question (wraps the browser confirm dialog). */
export interface ConfirmPort {
  confirm(message: string): boolean;
}

/** Writes a PNG to the system clipboard (FR-57). Rejects when the clipboard refuses. */
export interface ClipboardPort {
  writePng(bytes: Uint8Array): Promise<void>;
}

/**
 * The local-time offset of the viewer's zone at an instant (US-10.5 DD-13). The value is in minutes EAST of UTC (UTC+2
 * is +120, UTC-5 is -300), the sign `formatRowDate` expects; it depends on the instant because of daylight saving.
 */
export interface LocalOffset {
  offsetMinutes(epochMs: number): number;
}

/** Hands a file to the browser's save mechanism. */
export interface SavePort {
  save(bytes: Uint8Array, mimeType: string, fileName: string): void;
}

/** The current UI language, read at the moment a text is needed (FR-77). */
export type UiLanguage = () => 'en' | 'uk';

/**
 * The single live status region. `announce` sets the message; `clear` empties the region and is not an
 * announcement (DD-23, P-15).
 */
export interface Announcer {
  announce(text: string): void;
  clear(): void;
}

export interface CodecProbe {
  width: number;
  height: number;
}

export interface CodecTranscodeRequest {
  bytes: Uint8Array;
  targetMime: string;
  maxLongSide?: number;
  quality?: number;
  fillWhite?: boolean;
}

export interface CodecTranscodeResult {
  bytes: Uint8Array;
  /** The MIME type the encoder actually produced; a caller compares it with the one it asked for. */
  mime: string;
  width: number;
  height: number;
}

/** Image decoding and re-encoding. */
export interface ImageCodec {
  /** Rejects when the bytes cannot be decoded. Resolves with the as-displayed (orientation-applied) size. */
  probe(bytes: Uint8Array): Promise<CodecProbe>;
  transcode(req: CodecTranscodeRequest): Promise<CodecTranscodeResult>;
}

/**
 * Sets the backdrop of a decoded image to exactly #FFFFFF (see `flattenBackgroundToWhite`). Rejects when the bytes cannot be
 * decoded or the canvas is unavailable; the caller keeps the original image then. The result is always lossless PNG.
 */
export interface ImageBackgroundPort {
  flattenToWhite(bytes: Uint8Array, mime: string): Promise<{ bytes: Uint8Array; mime: string }>;
}

/** A content part exactly as it must be resent; service fields pass through untouched (FR-35). */
export interface Part {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  inlineData?: { mimeType: string; data: string };
  fileData?: { fileUri: string; mimeType: string };
  [extra: string]: unknown;
}

export interface Turn {
  id: string;
  role: 'user' | 'model';
  parts: Part[];
  // US-10.5 display metadata, all optional and never part of the resend payload (the request builder projects a turn to
  // `{role, parts}` only). A turn saved before US-10.5 carries none of them.
  /** The cost in USD of the response that created this model turn. */
  cost?: number;
  /** The measured duration of that generation, in milliseconds. */
  durationMs?: number;
  /** The id of the preset (chip) the send was made with, when it was. */
  presetId?: string;
  /** The input images of the send: the user-turn parts it used. */
  inputRefs?: { turnId: string; partIndex: number }[];
}

/** One retained generated image of a session. */
export interface Version {
  number: number;
  turnId: string;
  partIndex: number;
  model: string;
  resolution: string;
  aspectRatio: string;
  prompt: string;
  inputFormat: ImageMime;
  downloaded: boolean;
  /**
   * US-10.5 display metadata, not part of the resend payload: the number of the version this one was edited from, when it
   * was generated from a retained version. Optional; a version saved before US-10.5 has none.
   */
  editOfVersion?: number;
}

/** The persisted session meta record (the `sessions` object store). */
export interface SessionMeta {
  schemaVersion: 1;
  id: string;
  createdAt: number;
  lastActivity: number;
  model: string;
  costUsd: number;
  nextVersionNumber: number;
  turnOrder: string[];
  versions: Version[];
}

export interface StoredSession {
  meta: SessionMeta;
  turns: Turn[];
}

export interface CommitBatch {
  /** Turns to put (insert or replace). */
  putTurns: Turn[];
  /** Turns to delete; their sent bytes are deleted in the same transaction. */
  deleteTurnIds: string[];
  /** The new session meta (turnOrder, versions, costUsd, nextVersionNumber, lastActivity ...). */
  meta: SessionMeta;
}

/** Session persistence. Every method that writes is all-or-nothing. */
export interface SessionStorePort {
  /** One transaction: deletes sessions older than seven days and returns the remaining metas. */
  loadAndExpire(now: number): Promise<SessionMeta[]>;
  loadSession(id: string): Promise<StoredSession | null>;
  /** One transaction; `pick(metas)` chooses the victims inside it. */
  createWithEviction(
    newSession: StoredSession,
    pick: (metas: SessionMeta[]) => string[],
  ): Promise<{ created: boolean; evictedIds: string[] }>;
  /** One transaction: put and delete turns, delete their sent bytes, put the meta. */
  commit(sessionId: string, batch: CommitBatch): Promise<void>;
  putSentBytes(sessionId: string, fileUri: string, bytes: Uint8Array, mimeType: string): Promise<void>;
  getSentBytes(sessionId: string, fileUri: string): Promise<{ bytes: Uint8Array; mimeType: string } | null>;
  /** Replace file URIs inside stored turns and re-key the sent bytes. `map` is oldUri -> newUri. */
  remapFileUris(sessionId: string, map: Record<string, string>): Promise<void>;
  deleteSession(id: string): Promise<void>;
}

/** Thrown by a storage adapter when the browser's storage quota is exceeded (FR-81). */
export class StorageQuotaError extends Error {
  constructor(message = 'Storage quota exceeded') {
    super(message);
    this.name = 'StorageQuotaError';
    Object.setPrototypeOf(this, StorageQuotaError.prototype);
  }
}
