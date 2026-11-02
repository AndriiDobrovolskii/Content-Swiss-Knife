import type { CodecTranscodeRequest, ImageCodec, ImageMime } from './ports';

/**
 * Delivery conversion (US-10.1 DD-21, FR-54, FR-55, FR-57, FR-82).
 *
 * `deliver` returns the API bytes UNTOUCHED when the API format equals the target (no decode, no encode, the same
 * array instance). Otherwise it makes exactly one `transcode` at the native size (`maxLongSide` is never passed, so a
 * download never resizes): JPG at quality 90 with a white fill for transparency, WEBP at quality 90, PNG lossless.
 *
 * A failure is a typed `DeliveryError`; there is never a silent fallback to the source bytes. The clipboard copy
 * always targets PNG (FR-57).
 */
const DELIVERY_QUALITY = 90;

export type DeliveryErrorKind = 'bytes-unavailable' | 'conversion-failed' | 'wrong-output-type';

export class DeliveryError extends Error {
  constructor(
    public readonly kind: DeliveryErrorKind,
    message?: string,
  ) {
    super(message ?? `Delivery failed: ${kind}`);
    this.name = 'DeliveryError';
    Object.setPrototypeOf(this, DeliveryError.prototype);
  }
}

export interface DeliverableVersion {
  bytes: Uint8Array;
  mime: ImageMime;
}

export interface DeliveredFile {
  bytes: Uint8Array;
  mime: string;
  /** False when the API bytes were returned untouched. */
  converted: boolean;
}

export interface DeliveryDeps {
  codec: ImageCodec;
}

function requestFor(bytes: Uint8Array, targetMime: ImageMime): CodecTranscodeRequest {
  if (targetMime === 'image/jpeg') return { bytes, targetMime, quality: DELIVERY_QUALITY, fillWhite: true };
  if (targetMime === 'image/webp') return { bytes, targetMime, quality: DELIVERY_QUALITY };
  return { bytes, targetMime };
}

export async function deliver(version: DeliverableVersion, targetMime: ImageMime, deps: DeliveryDeps): Promise<DeliveredFile> {
  if (!version.bytes || version.bytes.length === 0) throw new DeliveryError('bytes-unavailable');
  if (version.mime === targetMime) return { bytes: version.bytes, mime: targetMime, converted: false };

  let out;
  try {
    out = await deps.codec.transcode(requestFor(version.bytes, targetMime));
  } catch {
    throw new DeliveryError('conversion-failed');
  }
  if (out.mime !== targetMime) throw new DeliveryError('wrong-output-type');
  return { bytes: out.bytes, mime: out.mime, converted: true };
}

/** The clipboard copy: always PNG, byte for byte when the version already is one (FR-57). */
export function deliverForClipboard(version: DeliverableVersion, deps: DeliveryDeps): Promise<DeliveredFile> {
  return deliver(version, 'image/png', deps);
}
