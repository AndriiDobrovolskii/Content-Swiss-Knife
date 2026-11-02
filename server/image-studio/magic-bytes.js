/**
 * BFF magic-byte image detection for the Image Studio upload route (US-10.1, FR-9 BFF half, DD-20).
 *
 * Contract:
 *   detectImageType(bytes) -> 'image/png' | 'image/jpeg' | 'image/webp' | null
 *
 * The type is decided from the LEADING BYTES only. The function takes bytes and nothing else: a claimed MIME
 * type or a file name is never an input, so the upload response can carry only the DETECTED type. The client
 * has its own copy of this four-line rule (src/utils/image-studio/magic-bytes.ts); a parity test keeps the two
 * in agreement.
 *
 *   PNG   89 50 4E 47 0D 0A 1A 0A
 *   JPEG  FF D8 FF
 *   WEBP  "RIFF" at offset 0 and "WEBP" at offset 8
 */

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const RIFF_TAG = [0x52, 0x49, 0x46, 0x46];
const WEBP_TAG = [0x57, 0x45, 0x42, 0x50];

/**
 * @param {Uint8Array} bytes
 * @param {number[]} signature
 * @param {number} offset
 * @returns {boolean}
 */
function hasBytesAt(bytes, signature, offset) {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}

/**
 * @param {Uint8Array | Buffer} bytes
 * @returns {'image/png' | 'image/jpeg' | 'image/webp' | null}
 */
export function detectImageType(bytes) {
  if (!bytes || typeof bytes.length !== 'number') return null;
  if (hasBytesAt(bytes, PNG_SIGNATURE, 0)) return 'image/png';
  if (hasBytesAt(bytes, JPEG_SIGNATURE, 0)) return 'image/jpeg';
  if (hasBytesAt(bytes, RIFF_TAG, 0) && hasBytesAt(bytes, WEBP_TAG, 8)) return 'image/webp';
  return null;
}
