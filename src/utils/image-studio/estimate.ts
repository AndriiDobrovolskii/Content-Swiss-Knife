import { IMAGE_PRICES } from '../../prompt-core/image-studio-contract';

/**
 * The pre-send cost estimate of an image request (US-10.6 FR-20, FR-21; OD-18): the price of one generated
 * image for the (model, resolution) pair times the number of images, input images excluded.
 *
 * The unit price is read from the shared contract (`image-studio-contract.json`, through `IMAGE_PRICES`), the
 * same table the server prices usage from, so the estimate and the recorded cost cannot drift (AC-14). The
 * result is NOT rounded (Rule A, OD-14): rounding for display belongs to the text that shows it. Returns
 * `null` when the pair has no price - no number is invented (FR-20 failure path).
 */
export function estimateCost(model: string, resolution: string, n: number): number | null {
  if (!Object.prototype.hasOwnProperty.call(IMAGE_PRICES, model)) return null;
  const byResolution = IMAGE_PRICES[model];
  if (!Object.prototype.hasOwnProperty.call(byResolution, resolution)) return null;
  return byResolution[resolution] * n;
}
