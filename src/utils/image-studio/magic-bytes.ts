import type { ImageMime } from './ports';

/**
 * Format detection of the user's file by its leading bytes (US-10.1 FR-9, D-19). The file name and any claimed
 * MIME type are never inputs. This is the client twin of `server/image-studio/magic-bytes.js`; the two are kept
 * in step by a parity test over one shared fixture table.
 *
 * PNG: 89 50 4E 47 0D 0A 1A 0A. JPEG: FF D8 FF. WEBP: "RIFF" at offset 0 and "WEBP" at offset 8.
 */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const RIFF_TAG = [0x52, 0x49, 0x46, 0x46];
const WEBP_TAG = [0x57, 0x45, 0x42, 0x50];

function hasBytesAt(bytes: Uint8Array, signature: readonly number[], offset: number): boolean {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}

/** The image type the bytes start with, or `null`. Bounds-checked: short or empty input gives `null`. */
export function detectImageType(bytes: Uint8Array): ImageMime | null {
  if (!bytes || typeof bytes.length !== 'number') return null;
  if (hasBytesAt(bytes, PNG_SIGNATURE, 0)) return 'image/png';
  if (hasBytesAt(bytes, JPEG_SIGNATURE, 0)) return 'image/jpeg';
  if (hasBytesAt(bytes, RIFF_TAG, 0) && hasBytesAt(bytes, WEBP_TAG, 8)) return 'image/webp';
  return null;
}
