import type { ImageHttpResult } from '../../services/image-studio/http-abort';
import { detectImageType } from './magic-bytes';
import type { ImageCodec } from './ports';
import { UploadResponseSchema } from './schemas';
import { checkSentBytes, decideUpload, MAX_LONG_SIDE } from './upload-rules';

/**
 * The ingest pipeline for ONE user-supplied image (US-10.1 DD-20, FR-11 to FR-16), in the exact order of the
 * Specification:
 *
 *   1. magic-byte detection of the user's file (D-19); anything but PNG, JPG or WEBP is T-1, and the codec is
 *      never consulted
 *   2. `probe` (decode): a failure is T-1 WHATEVER the size (N-7)
 *   3. the FR-11 table over (as-displayed long side, size): a file over 5 MB that needs no downscale is T-2
 *   4. `transcode` in the SAME format, downscaling to 2048 only when the long side is over 2048; the encoder runs
 *      for every accepted upload, so the bytes that leave are always the encoder's output, never the original
 *   5. the encoder's output type must equal the required format (D-31); a mismatch is T-1
 *   6. the 5 242 880 B check on the SENT bytes (D-7); over is T-2
 *   7. upload; a failure is returned normalised (FR-61)
 *   8. store the sent bytes for a later FILE_MISSING re-upload, best effort (OD-37): a failure never blocks the
 *      attachment. The store is keyed by the `fileUri`, which exists only after the upload, so it follows it.
 *
 * Every ambient effect (decoding, uploading, storing) is an injected dependency, so this module is plain
 * TypeScript (NFR-14). W-2: the tests prove the PLUMBING (the raw bytes never reach the upload or the store);
 * that a real canvas drops EXIF is a browser fact recorded by the human (check V-8).
 */

export interface IngestDeps {
  codec: ImageCodec;
  /** Sends `{ data }` (base64 of the sent bytes) to the BFF upload route. */
  upload(req: { data: string }, signal?: AbortSignal): Promise<ImageHttpResult>;
  /** Persists the sent bytes under their `fileUri`; may reject (best effort). */
  storeSentBytes(fileUri: string, bytes: Uint8Array, mimeType: string): Promise<void>;
  /** Called once for a file whose store failed, so the caller can coalesce one alert per action (D-28). */
  onStoreFailure?(error: unknown): void;
  signal?: AbortSignal;
}

export type IngestResult =
  | {
      ok: true;
      fileUri: string;
      mimeType: string;
      sentBytes: Uint8Array;
      width: number;
      height: number;
      sentBytesStored: boolean;
    }
  | { ok: false; reason: 'T-1' | 'T-2' }
  | { ok: false; reason: 'upload'; status: number; errorField?: string };

/** JPG and WEBP are re-encoded at quality 90; PNG is lossless and takes no quality (SD-42). */
const LOSSY_QUALITY = 90;

/** Base64 of a byte array, built in slices so a multi-megabyte image does not overflow the call stack. */
function toBase64(bytes: Uint8Array): string {
  const SLICE = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += SLICE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + SLICE));
  }
  return btoa(binary);
}

export async function ingestImage(input: { bytes: Uint8Array }, deps: IngestDeps): Promise<IngestResult> {
  const { bytes } = input;

  const mime = detectImageType(bytes);
  if (!mime) return { ok: false, reason: 'T-1' };

  let probed: { width: number; height: number };
  try {
    probed = await deps.codec.probe(bytes);
  } catch {
    return { ok: false, reason: 'T-1' };
  }

  const decision = decideUpload({ longSide: Math.max(probed.width, probed.height), size: bytes.length });
  if (!decision.accept) return { ok: false, reason: 'T-2' };

  let encoded: { bytes: Uint8Array; mime: string; width: number; height: number };
  try {
    encoded = await deps.codec.transcode({
      bytes,
      targetMime: mime,
      ...(decision.downscale ? { maxLongSide: MAX_LONG_SIDE } : {}),
      ...(mime === 'image/png' ? {} : { quality: LOSSY_QUALITY }),
    });
  } catch {
    return { ok: false, reason: 'T-1' };
  }

  if (encoded.mime !== mime) return { ok: false, reason: 'T-1' };
  if (!checkSentBytes(encoded.bytes.length).ok) return { ok: false, reason: 'T-2' };

  const reply = await deps.upload({ data: toBase64(encoded.bytes) }, deps.signal);
  if (!reply.ok) {
    // The compiler configuration does not narrow a boolean discriminant, so the failure arm is named.
    const failure = reply as Extract<ImageHttpResult, { ok: false }>;
    return { ok: false, reason: 'upload', status: failure.status, errorField: failure.errorField };
  }
  const uploaded = UploadResponseSchema.safeParse((reply as Extract<ImageHttpResult, { ok: true }>).body);
  if (!uploaded.success) return { ok: false, reason: 'upload', status: 502 };

  const { fileUri, mimeType } = uploaded.data;
  let sentBytesStored = true;
  try {
    await deps.storeSentBytes(fileUri, encoded.bytes, mimeType);
  } catch (error) {
    sentBytesStored = false;
    deps.onStoreFailure?.(error);
  }

  return {
    ok: true,
    fileUri,
    mimeType,
    sentBytes: encoded.bytes,
    width: encoded.width,
    height: encoded.height,
    sentBytesStored,
  };
}
