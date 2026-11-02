/**
 * The download file name of a version (US-10.1 FR-56, SD-14, SD-39, SD-40):
 *
 *   {product-name}_v{N}_{ratio}.{ext}        for example  bambu-lab-h2d_v3_1x1.webp
 *
 * - the product name is lower-cased and each run of characters that are not letters or digits becomes ONE hyphen
 *   (so a path separator, a Windows-reserved or control character, a dot or an underscore can never survive);
 *   leading and trailing hyphens are dropped; a name that sanitizes to nothing is `image` (SD-14)
 * - N is the version number within the current session, as given
 * - the ratio is written with `x` for the colon
 * - the extension follows the DELIVERED format: png, jpg (never jpeg), webp (SD-39, SD-40)
 */
const EXTENSION_OF: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const FALLBACK_NAME = 'image';

export interface FileNameInput {
  productName?: string | null;
  versionNumber: number;
  aspectRatio: string;
  /** The MIME type of the file being delivered; anything but PNG, JPEG or WEBP throws. */
  mimeType: string;
}

function sanitiseProductName(name: string | null | undefined): string {
  const cleaned = (name ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned === '' ? FALLBACK_NAME : cleaned;
}

export function buildFileName(input: FileNameInput): string {
  const extension = Object.prototype.hasOwnProperty.call(EXTENSION_OF, input.mimeType) ? EXTENSION_OF[input.mimeType] : undefined;
  if (!extension) throw new Error(`Unsupported delivery format: ${String(input.mimeType)}`);

  const ratio = String(input.aspectRatio).replace(':', 'x');
  return `${sanitiseProductName(input.productName)}_v${input.versionNumber}_${ratio}.${extension}`;
}
