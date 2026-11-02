/**
 * Shared test doubles for US-10.1 (Nano Banana Image Studio).
 *
 * WHY THIS FILE EXISTS. Neither runner has IndexedDB or a canvas, and AGENTS.md section 1 / NFR-7 forbid adding
 * `fake-indexeddb` or a canvas package (human decision at HUMAN_PLAN_APPROVAL). The plan therefore routes every ambient
 * effect through ports (DD-15) and tests the logic against the in-memory fakes below. Nothing here is the unit under
 * test: it is the boundary the unit is tested against.
 *
 * THE PORT SHAPES BELOW ARE THE TEST-PINNED CONTRACT. The plan names the ports (`Clock`, `Scheduler`, `IdSource`,
 * `AlertPort`, `ConfirmPort`, `ClipboardPort`, `SavePort`, `UiLanguage`, `Announcer`, `ImageCodec`, `SessionStorePort`,
 * `StorageQuotaError`) and the `SessionStorePort` operation list, but not every parameter. The shapes fixed here are
 * the ones `src/utils/image-studio/ports.ts` must satisfy structurally (a fake is passed where a port is expected, so
 * `tsc` checks the fit once ports.ts exists). They are declared locally, not imported, so this file compiles and runs
 * before ports.ts exists and a missing implementation never turns the helpers themselves red.
 *
 * Deterministic by construction: no wall clock, no timers, no randomness, no network.
 */

// ---------------------------------------------------------------------------------------------------------------------
// Port contract (structural; production ports.ts must be assignable to / from these)
// ---------------------------------------------------------------------------------------------------------------------

export type ImageMime = 'image/png' | 'image/jpeg' | 'image/webp';

export interface Clock { now(): number }
export interface Scheduler {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}
export interface IdSource { next(): string }
export interface AlertPort { alert(message: string): void }
export interface ConfirmPort { confirm(message: string): boolean }
export interface ClipboardPort { writePng(bytes: Uint8Array): Promise<void> }
export interface SavePort { save(bytes: Uint8Array, mimeType: string, fileName: string): void }
export type UiLanguage = () => 'en' | 'uk';
export interface Announcer { announce(text: string): void; clear(): void }

export interface CodecProbe { width: number; height: number }
export interface CodecTranscodeRequest {
  bytes: Uint8Array;
  targetMime: string;
  maxLongSide?: number;
  quality?: number;
  fillWhite?: boolean;
}
export interface CodecTranscodeResult { bytes: Uint8Array; mime: string; width: number; height: number }
export interface ImageCodec {
  /** Rejects when the bytes cannot be decoded. Resolves with the as-displayed (orientation-applied) size. */
  probe(bytes: Uint8Array): Promise<CodecProbe>;
  transcode(req: CodecTranscodeRequest): Promise<CodecTranscodeResult>;
}

export interface Part {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  inlineData?: { mimeType: string; data: string };
  fileData?: { fileUri: string; mimeType: string };
  [extra: string]: unknown;
}
export interface Turn { id: string; role: 'user' | 'model'; parts: Part[] }
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
}
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
export interface StoredSession { meta: SessionMeta; turns: Turn[] }
export interface CommitBatch {
  /** Turns to put (insert or replace). */
  putTurns: Turn[];
  /** Turns to delete; their sent bytes are deleted in the same transaction. */
  deleteTurnIds: string[];
  /** The new session meta (turnOrder, versions, costUsd, nextVersionNumber, lastActivity ...). */
  meta: SessionMeta;
}
export interface SessionStorePort {
  loadAndExpire(now: number): Promise<SessionMeta[]>;
  loadSession(id: string): Promise<StoredSession | null>;
  createWithEviction(
    newSession: StoredSession,
    pick: (metas: SessionMeta[]) => string[],
  ): Promise<{ created: boolean; evictedIds: string[] }>;
  commit(sessionId: string, batch: CommitBatch): Promise<void>;
  putSentBytes(sessionId: string, fileUri: string, bytes: Uint8Array, mimeType: string): Promise<void>;
  getSentBytes(sessionId: string, fileUri: string): Promise<{ bytes: Uint8Array; mimeType: string } | null>;
  /** Replace file URIs inside stored turns and re-key the sent bytes. `map` is oldUri -> newUri. */
  remapFileUris(sessionId: string, map: Record<string, string>): Promise<void>;
  deleteSession(id: string): Promise<void>;
}

// ---------------------------------------------------------------------------------------------------------------------
// Clock, scheduler, ids, recorders
// ---------------------------------------------------------------------------------------------------------------------

export interface FakeClock extends Clock { advance(ms: number): void; set(ms: number): void }
export function makeFakeClock(start = 1_000_000): FakeClock {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; }, set: (ms) => { t = ms; } };
}

/**
 * A scheduler whose time only moves when the test says so. `advance(ms)` fires due timers in due-time order
 * (ties in creation order), moving the shared clock to each timer's due time before it fires, and finally to the end.
 * A timer created by a firing timer is honoured if it falls inside the advanced window.
 */
export interface FakeScheduler extends Scheduler {
  advance(ms: number): void;
  readonly pending: number;
}
export function makeFakeScheduler(clock: FakeClock): FakeScheduler {
  interface T { id: number; due: number; fn: () => void; seq: number }
  let seq = 0;
  const timers = new Map<number, T>();
  return {
    setTimeout(fn, ms) {
      const t: T = { id: ++seq, due: clock.now() + ms, fn, seq };
      timers.set(t.id, t);
      return t.id;
    },
    clearTimeout(handle) { timers.delete(handle as number); },
    advance(ms) {
      const end = clock.now() + ms;
      for (;;) {
        const next = [...timers.values()].filter((t) => t.due <= end).sort((a, b) => a.due - b.due || a.seq - b.seq)[0];
        if (!next) break;
        timers.delete(next.id);
        if (next.due > clock.now()) clock.set(next.due);
        next.fn();
      }
      clock.set(end);
    },
    get pending() { return timers.size; },
  };
}

export function makeIdSource(prefix = 'id'): IdSource & { readonly issued: string[] } {
  let n = 0;
  const issued: string[] = [];
  return { next: () => { const id = `${prefix}-${++n}`; issued.push(id); return id; }, issued };
}

export function makeRecordingAnnouncer(): Announcer & { announced: string[]; clears: number } {
  const rec = {
    announced: [] as string[],
    clears: 0,
    announce(text: string) { rec.announced.push(text); },
    clear() { rec.clears += 1; },
  };
  return rec;
}

export function makeAlertPort(): AlertPort & { messages: string[] } {
  const messages: string[] = [];
  return { messages, alert: (m) => { messages.push(m); } };
}

export function makeConfirmPort(answer = true): ConfirmPort & { asked: string[]; answer: boolean } {
  const rec = { asked: [] as string[], answer, confirm(m: string) { rec.asked.push(m); return rec.answer; } };
  return rec;
}

export function makeClipboardPort(): ClipboardPort & { written: Uint8Array[]; failWith: Error | null } {
  const rec = {
    written: [] as Uint8Array[],
    failWith: null as Error | null,
    async writePng(bytes: Uint8Array) {
      if (rec.failWith) throw rec.failWith;
      rec.written.push(bytes);
    },
  };
  return rec;
}

export function makeSavePort(): SavePort & { saved: Array<{ bytes: Uint8Array; mimeType: string; fileName: string }>; failWith: Error | null } {
  const rec = {
    saved: [] as Array<{ bytes: Uint8Array; mimeType: string; fileName: string }>,
    failWith: null as Error | null,
    save(bytes: Uint8Array, mimeType: string, fileName: string) {
      if (rec.failWith) throw rec.failWith;
      rec.saved.push({ bytes, mimeType, fileName });
    },
  };
  return rec;
}

// ---------------------------------------------------------------------------------------------------------------------
// Byte fixtures: leading bytes of real formats (what the magic-byte detectors read)
// ---------------------------------------------------------------------------------------------------------------------

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

export const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
export const JPG_MAGIC = [0xff, 0xd8, 0xff];
/** RIFF <4-byte size> WEBP : the container check is "RIFF" at 0 and "WEBP" at 8. */
export const webpMagic = () => [...ascii('RIFF'), 0x24, 0x00, 0x00, 0x00, ...ascii('WEBP')];
export const GIF_MAGIC = ascii('GIF89a');
/** A RIFF container that is NOT a WEBP (a WAV). */
export const wavMagic = () => [...ascii('RIFF'), 0x24, 0x00, 0x00, 0x00, ...ascii('WAVE')];

export function padTo(head: number[], total: number): Uint8Array {
  const out = new Uint8Array(Math.max(total, head.length));
  out.set(head, 0);
  return out;
}

/** Shared magic-byte fixtures: the SAME table is run against the BFF detector (T9) and the client detector (T21). */
export const MAGIC_FIXTURES: Array<{ name: string; bytes: Uint8Array; expected: ImageMime | null }> = [
  { name: 'PNG', bytes: padTo(PNG_MAGIC, 32), expected: 'image/png' },
  { name: 'JPG (FF D8 FF E0)', bytes: padTo([...JPG_MAGIC, 0xe0], 32), expected: 'image/jpeg' },
  { name: 'JPG (FF D8 FF E1, EXIF marker)', bytes: padTo([...JPG_MAGIC, 0xe1], 32), expected: 'image/jpeg' },
  { name: 'WEBP', bytes: padTo(webpMagic(), 32), expected: 'image/webp' },
  { name: 'GIF', bytes: padTo(GIF_MAGIC, 32), expected: null },
  { name: 'RIFF/WAV (RIFF but not WEBP)', bytes: padTo(wavMagic(), 32), expected: null },
  { name: 'truncated PNG header (4 bytes)', bytes: new Uint8Array(PNG_MAGIC.slice(0, 4)), expected: null },
  { name: 'truncated JPG header (2 bytes)', bytes: new Uint8Array([0xff, 0xd8]), expected: null },
  { name: 'truncated RIFF (no WEBP tag)', bytes: new Uint8Array(webpMagic().slice(0, 10)), expected: null },
  { name: 'empty buffer', bytes: new Uint8Array(0), expected: null },
  { name: 'plain text claiming to be a PNG', bytes: new Uint8Array(ascii('not an image at all, just text')), expected: null },
];

export const toBase64 = (bytes: Uint8Array): string => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
export const fromBase64 = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

// ---------------------------------------------------------------------------------------------------------------------
// Synthetic raster format + fake codec (works without a canvas)
// ---------------------------------------------------------------------------------------------------------------------

export type RasterFormat = 'png' | 'jpg' | 'webp';
const MIME_OF: Record<RasterFormat, ImageMime> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
const FORMAT_OF: Record<string, RasterFormat> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const MAGIC_OF: Record<RasterFormat, () => number[]> = { png: () => PNG_MAGIC, jpg: () => [...JPG_MAGIC, 0xe0], webp: webpMagic };
const RASTER_TAG = ascii('RSTR');
const EXIF_TAG = ascii('Exif\0\0GPSLatitude');
const ANIM_TAG = ascii('ANIM');

export interface RasterSpec {
  format: RasterFormat;
  width: number;
  height: number;
  /** Total byte length of the produced buffer (default: just the header). */
  size?: number;
  /** Embed EXIF/GPS marker bytes (a camera original). */
  exif?: boolean;
  /** Embed an animation chunk marker (animated WEBP / APNG). */
  animated?: boolean;
  /** Encoder quality byte recorded in the header (transcode output only). */
  quality?: number;
  /** Transparency was flattened onto white (transcode output only). */
  filledWhite?: boolean;
}

/**
 * Layout: <real magic bytes> 'RSTR' w(u32) h(u32) flags(u8) quality(u8) [EXIF tag] [ANIM tag] zero padding.
 * Real magic bytes mean the production magic-byte detectors accept it; the rest lets the fake codec "decode" it.
 */
export function makeRaster(spec: RasterSpec): Uint8Array {
  const head: number[] = [...MAGIC_OF[spec.format](), ...RASTER_TAG];
  const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  head.push(...u32(spec.width), ...u32(spec.height));
  const flags = (spec.exif ? 1 : 0) | (spec.animated ? 2 : 0) | (spec.filledWhite ? 4 : 0);
  head.push(flags, spec.quality ?? 0);
  if (spec.exif) head.push(...EXIF_TAG);
  if (spec.animated) head.push(...ANIM_TAG);
  return padTo(head, spec.size ?? head.length);
}

export interface DecodedRaster {
  format: RasterFormat;
  mime: ImageMime;
  width: number;
  height: number;
  hasExif: boolean;
  animated: boolean;
  filledWhite: boolean;
  quality: number;
}
/** Inspect a buffer produced by `makeRaster` or by the fake codec. Returns null for anything else. */
export function decodeRaster(bytes: Uint8Array): DecodedRaster | null {
  let format: RasterFormat | null = null;
  let magicLen = 0;
  for (const f of ['png', 'jpg', 'webp'] as RasterFormat[]) {
    const m = MAGIC_OF[f]();
    if (m.every((b, i) => bytes[i] === b)) { format = f; magicLen = m.length; break; }
  }
  if (!format) return null;
  if (!RASTER_TAG.every((b, i) => bytes[magicLen + i] === b)) return null;
  const o = magicLen + RASTER_TAG.length;
  const rd = (i: number) => ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
  const flags = bytes[o + 8];
  return {
    format, mime: MIME_OF[format], width: rd(o), height: rd(o + 4),
    hasExif: (flags & 1) === 1, animated: (flags & 2) === 2, filledWhite: (flags & 4) === 4, quality: bytes[o + 9],
  };
}

/** True when the buffer contains the byte sequence (used to assert "no GPS bytes were sent"). */
export function containsBytes(haystack: Uint8Array, needle: number[] | string): boolean {
  const n = typeof needle === 'string' ? ascii(needle) : needle;
  outer: for (let i = 0; i + n.length <= haystack.length; i++) {
    for (let j = 0; j < n.length; j++) if (haystack[i + j] !== n[j]) continue outer;
    return true;
  }
  return false;
}
export const EXIF_MARKER = 'GPSLatitude';
export const ANIMATION_MARKER = 'ANIM';

export interface FakeCodecOptions {
  /** Make `transcode` answer with this MIME instead of the requested one (a browser with no WEBP encoder). */
  outputMimeOverride?: string;
  /** Force the byte length of every transcode output (to exceed 5 242 880 B for the D-7 test). */
  outputSize?: number;
  /** Make `probe` reject for every input (undecodable). */
  probeFails?: boolean;
  /** Make `transcode` reject for every input. */
  transcodeFails?: boolean;
}
export interface FakeCodec extends ImageCodec {
  options: FakeCodecOptions;
  calls: Array<
    | { kind: 'probe'; bytes: Uint8Array }
    | { kind: 'transcode'; req: CodecTranscodeRequest }
  >;
  readonly probeCalls: number;
  readonly transcodeCalls: number;
}

/**
 * The fake codec honours the parameters a real canvas codec must receive: it scales to `maxLongSide` (never up),
 * drops EXIF/animation (a canvas redraw does), records `quality`, and fills transparency white when `fillWhite`.
 * It does not prove a real canvas does any of that (W-2 / V-8): it proves the plumbing passes the parameters.
 */
export function makeFakeCodec(options: FakeCodecOptions = {}): FakeCodec {
  const codec: FakeCodec = {
    options,
    calls: [],
    get probeCalls() { return codec.calls.filter((c) => c.kind === 'probe').length; },
    get transcodeCalls() { return codec.calls.filter((c) => c.kind === 'transcode').length; },
    async probe(bytes) {
      codec.calls.push({ kind: 'probe', bytes });
      const d = codec.options.probeFails ? null : decodeRaster(bytes);
      if (!d) throw new Error('fake codec: cannot decode');
      return { width: d.width, height: d.height };
    },
    async transcode(req) {
      codec.calls.push({ kind: 'transcode', req });
      const d = codec.options.transcodeFails ? null : decodeRaster(req.bytes);
      if (!d) throw new Error('fake codec: cannot transcode');
      let { width, height } = d;
      const long = Math.max(width, height);
      if (req.maxLongSide !== undefined && long > req.maxLongSide) {
        const k = req.maxLongSide / long;
        width = Math.max(1, Math.round(width * k));
        height = Math.max(1, Math.round(height * k));
      }
      const outMime = codec.options.outputMimeOverride ?? req.targetMime;
      const fmt = FORMAT_OF[outMime] ?? 'png';
      const bytes = makeRaster({
        format: fmt, width, height, exif: false, animated: false,
        quality: req.quality ?? 0, filledWhite: Boolean(req.fillWhite),
        size: codec.options.outputSize,
      });
      return { bytes, mime: outMime, width, height };
    },
  };
  return codec;
}

// ---------------------------------------------------------------------------------------------------------------------
// In-memory SessionStorePort with real all-or-nothing semantics
// ---------------------------------------------------------------------------------------------------------------------

export interface InMemorySessionStore extends SessionStorePort {
  /** Make every WRITE method throw `error` and change nothing (a quota failure). `null` restores normal operation. */
  failWrites(error: Error | null): void;
  /** Make only `putSentBytes` throw (the OD-37 case: the sent-bytes store fails, everything else works). */
  failSentBytes(error: Error | null): void;
  /** Seed a session directly (bypasses `pick`/cap logic, never fails). */
  seed(session: StoredSession, sentBytes?: Record<string, { bytes: Uint8Array; mimeType: string }>): void;
  /** Deep-ish snapshot of the stored state for assertions. */
  snapshot(): { sessions: Record<string, StoredSession>; sentBytes: Record<string, string[]> };
  /** Every call made, in order, as `<method>:<arg summary>`. */
  readonly log: string[];
  /** Number of write transactions that actually committed. */
  readonly commits: number;
}

const clone = <T>(v: T): T => structuredClone(v);

export function makeInMemorySessionStore(): InMemorySessionStore {
  const sessions = new Map<string, StoredSession>();
  const bytes = new Map<string, { bytes: Uint8Array; mimeType: string }>(); // key `${sessionId}\u0000${fileUri}`
  const key = (s: string, u: string) => `${s}\u0000${u}`;
  let writeError: Error | null = null;
  let sentError: Error | null = null;
  const log: string[] = [];
  let commits = 0;

  const guardWrite = () => { if (writeError) throw writeError; };
  const deleteSessionInternal = (id: string) => {
    sessions.delete(id);
    for (const k of [...bytes.keys()]) if (k.startsWith(`${id}\u0000`)) bytes.delete(k);
  };

  const store: InMemorySessionStore = {
    log,
    get commits() { return commits; },
    failWrites(e) { writeError = e; },
    failSentBytes(e) { sentError = e; },
    seed(session, sent) {
      sessions.set(session.meta.id, clone(session));
      for (const [uri, v] of Object.entries(sent ?? {})) bytes.set(key(session.meta.id, uri), { bytes: v.bytes, mimeType: v.mimeType });
    },
    snapshot() {
      const outS: Record<string, StoredSession> = {};
      for (const [id, s] of sessions) outS[id] = clone(s);
      const outB: Record<string, string[]> = {};
      for (const k of bytes.keys()) { const [sid, uri] = k.split('\u0000'); (outB[sid] ??= []).push(uri); }
      return { sessions: outS, sentBytes: outB };
    },
    async loadAndExpire(now) {
      log.push(`loadAndExpire:${now}`);
      // SD-33: strictly older than 7 x 24 h from last activity is expired; exactly 7 days is kept.
      const expired = [...sessions.values()].filter((s) => now - s.meta.lastActivity > 604_800_000).map((s) => s.meta.id);
      if (expired.length) { guardWrite(); for (const id of expired) deleteSessionInternal(id); commits += 1; }
      return [...sessions.values()].map((s) => clone(s.meta));
    },
    async loadSession(id) {
      log.push(`loadSession:${id}`);
      const s = sessions.get(id);
      return s ? clone(s) : null;
    },
    async createWithEviction(newSession, pick) {
      log.push(`createWithEviction:${newSession.meta.id}`);
      guardWrite();
      const victims = pick([...sessions.values()].map((s) => clone(s.meta)));
      // All-or-nothing: validate first, then apply.
      for (const id of victims) deleteSessionInternal(id);
      sessions.set(newSession.meta.id, clone(newSession));
      commits += 1;
      return { created: true, evictedIds: [...victims] };
    },
    async commit(sessionId, batch) {
      log.push(`commit:${sessionId}`);
      guardWrite();
      const s = sessions.get(sessionId);
      if (!s) throw new Error('commit: unknown session');
      const next = clone(s);
      const byId = new Map(next.turns.map((t) => [t.id, t]));
      for (const id of batch.deleteTurnIds) byId.delete(id);
      for (const t of batch.putTurns) byId.set(t.id, clone(t));
      next.turns = batch.meta.turnOrder.map((id) => byId.get(id)).filter((t): t is Turn => Boolean(t));
      next.meta = clone(batch.meta);
      // Deleting a turn deletes the sent bytes of the file URIs it referenced.
      for (const id of batch.deleteTurnIds) {
        const gone = s.turns.find((t) => t.id === id);
        for (const p of gone?.parts ?? []) if (p.fileData) bytes.delete(key(sessionId, p.fileData.fileUri));
      }
      sessions.set(sessionId, next);
      commits += 1;
    },
    async putSentBytes(sessionId, fileUri, b, mimeType) {
      log.push(`putSentBytes:${sessionId}:${fileUri}`);
      guardWrite();
      if (sentError) throw sentError;
      bytes.set(key(sessionId, fileUri), { bytes: b, mimeType });
    },
    async getSentBytes(sessionId, fileUri) {
      log.push(`getSentBytes:${sessionId}:${fileUri}`);
      return bytes.get(key(sessionId, fileUri)) ?? null;
    },
    async remapFileUris(sessionId, map) {
      log.push(`remapFileUris:${sessionId}`);
      guardWrite();
      const s = sessions.get(sessionId);
      if (!s) throw new Error('remap: unknown session');
      for (const t of s.turns) for (const p of t.parts) {
        if (p.fileData && map[p.fileData.fileUri]) p.fileData = { ...p.fileData, fileUri: map[p.fileData.fileUri] };
      }
      for (const [oldUri, newUri] of Object.entries(map)) {
        const v = bytes.get(key(sessionId, oldUri));
        if (v) { bytes.delete(key(sessionId, oldUri)); bytes.set(key(sessionId, newUri), v); }
      }
      commits += 1;
    },
    async deleteSession(id) {
      log.push(`deleteSession:${id}`);
      guardWrite();
      deleteSessionInternal(id);
      commits += 1;
    },
  };
  return store;
}

// ---------------------------------------------------------------------------------------------------------------------
// Data builders
// ---------------------------------------------------------------------------------------------------------------------

export const textPart = (text: string, extra: Partial<Part> = {}): Part => ({ text, ...extra });
export const inlineImagePart = (mimeType: string, data: string, extra: Partial<Part> = {}): Part => ({ inlineData: { mimeType, data }, ...extra });
export const filePart = (fileUri: string, mimeType = 'image/png'): Part => ({ fileData: { fileUri, mimeType } });
export const turn = (id: string, role: 'user' | 'model', ...parts: Part[]): Turn => ({ id, role, parts });

export function makeVersion(over: Partial<Version> & { number: number; turnId: string }): Version {
  return {
    partIndex: 0, model: 'gemini-3.1-flash-image', resolution: '1K', aspectRatio: '1:1', prompt: 'a white mug',
    inputFormat: 'image/png', downloaded: false, ...over,
  };
}

/**
 * A stored session of `pairs` user/model turn pairs. Each model turn holds one inline PNG (raster, 8x8) as version
 * v(i+1). Turn ids are `u1 m1 u2 m2 ...`. `lastActivity` defaults to `createdAt`.
 */
export function makeSession(id: string, opts: { pairs?: number; createdAt?: number; lastActivity?: number; model?: string; costUsd?: number } = {}): StoredSession {
  const pairs = opts.pairs ?? 0;
  const turns: Turn[] = [];
  const versions: Version[] = [];
  for (let i = 1; i <= pairs; i++) {
    turns.push(turn(`u${i}`, 'user', textPart(`prompt ${i}`)));
    const png = makeRaster({ format: 'png', width: 8, height: 8 });
    turns.push(turn(`m${i}`, 'model', inlineImagePart('image/png', toBase64(png), { thoughtSignature: `sig-${i}` })));
    versions.push(makeVersion({ number: i, turnId: `m${i}`, prompt: `prompt ${i}`, model: opts.model ?? 'gemini-3.1-flash-image' }));
  }
  const createdAt = opts.createdAt ?? 1_000_000;
  return {
    meta: {
      schemaVersion: 1, id, createdAt, lastActivity: opts.lastActivity ?? createdAt,
      model: opts.model ?? 'gemini-3.1-flash-image', costUsd: opts.costUsd ?? 0,
      nextVersionNumber: pairs + 1, turnOrder: turns.map((t) => t.id), versions,
    },
    turns,
  };
}

/** `await expect(...)` helper: resolves a promise to its rejection (or fails the test when it resolves). */
export async function rejectionOf(p: Promise<unknown>): Promise<unknown> {
  try { await p; } catch (e) { return e; }
  throw new Error('expected the promise to reject, but it resolved');
}
