/**
 * Normalizes an image filename for CDN URLs:
 * lowercase, spaces/underscores → hyphens, strip non-alnum, force .jpg extension.
 *
 * Examples:
 *   "Multi Scan Mode 3D.png" → "multi-scan-mode-3d.jpg"
 *   "high_prec_scan.jpeg"   → "high-prec-scan.jpg"
 *   "UE--PRO  Photo.webp"   → "ue-pro-photo.jpg"
 */
export function normalizeImageFilename(originalName: string): string {
  const withoutExt = originalName.includes('.')
    ? originalName.substring(0, originalName.lastIndexOf('.'))
    : originalName;

  return withoutExt
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    + '.jpg';
}
