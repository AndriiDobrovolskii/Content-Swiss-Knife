import { IMAGE_COUNTS } from '../../prompt-core/image-studio-contract';

/** The images asked for in one request (US-10.6 FR-4). */
export type ImageCount = 1 | 2 | 4;

/**
 * Normalises an image count read from a draft, a stored value or a control (US-10.6 FR-4 failure path).
 * A value that is not one of the shared contract's `imageCounts` (a stale draft, a fraction, NaN, the string
 * "4") becomes 1, so an out-of-range count is never sent.
 */
export function normalizeImageCount(x: unknown): ImageCount {
  return typeof x === 'number' && IMAGE_COUNTS.includes(x) ? (x as ImageCount) : 1;
}
