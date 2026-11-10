import { CHIP_INSTRUCTIONS } from '../../prompt-core/prompt-presets';

/**
 * Pure white backdrop for the "Product on white" preset and the "Remove background" chip.
 *
 * An image model paints the backdrop as part of the scene, so a hex value in the prompt is a wish: the result comes back
 * off-white with a soft gradient. `flattenBackgroundToWhite` fixes that on the decoded pixels, with no DOM and no canvas,
 * so it is plain TypeScript and can move into a Web Worker later without a change.
 *
 * The backdrop is the region reachable from the frame border through pixels that are (a) light and near-neutral and
 * (b) a smooth step away from their already-accepted neighbour. The fill starts only from border pixels close to the
 * typical border colour, so a light product that touches the frame does not seed it. A sharp product edge stops the fill, and a region the
 * product encloses is never reached. Inside the region a smoothstep ramp brings the nearly white part to exactly 255 and
 * lets the darker shadow keep its own value, so there is no seam where the two meet.
 *
 * Known limit: a product whose colour equals the backdrop where it touches the frame border cannot be told apart from it
 * by any border fill.
 */

/** The preset whose result must have a pure white backdrop (`PROMPT_PRESETS` in prompt-core/prompt-presets.ts). */
export const WHITE_BACKGROUND_PRESET_ID = 'white-bg';

/** Darkness (255 - min channel) up to which a backdrop pixel becomes exactly white. */
const D_WHITE = 12;
/** Darkness above which a pixel is never backdrop: it is shadow or product and keeps its own value. */
const D_MAX = 36;
/** The largest RGB distance between two neighbouring backdrop pixels; a gradient passes, a product edge does not. */
const STEP = 8;
/** The largest RGB distance between a border pixel and the typical (median) border colour for it to seed the fill. */
const SEED_TOLERANCE = 12;

const REMOVE_BACKGROUND_TEXT = CHIP_INSTRUCTIONS.find((chip) => chip.id === 'remove-background')?.instruction ?? '';

/** True for a send whose result must get a pure white backdrop: the white-bg preset, or the Remove-background chip text. */
export function needsWhiteBackground(input: { presetId?: string; text?: string }): boolean {
  if (input.presetId === WHITE_BACKGROUND_PRESET_ID) return true;
  return REMOVE_BACKGROUND_TEXT !== '' && input.text?.trim() === REMOVE_BACKGROUND_TEXT;
}

function smoothstep(t: number): number {
  const c = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

/** The median of 0..255 values (0 for an empty list). */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const histogram = new Uint32Array(256);
  for (const v of values) histogram[v]++;
  let seen = 0;
  for (let v = 0; v < 256; v++) {
    seen += histogram[v];
    if (seen * 2 >= values.length) return v;
  }
  return 255;
}

function darkness(r: number, g: number, b: number): number {
  return 255 - Math.min(r, g, b);
}

/** Returns a new RGBA array: transparency composited over white, the backdrop flattened to #FFFFFF. Never mutates `rgba`. */
export function flattenBackgroundToWhite(rgba: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const pixels = width * height;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || rgba.length !== pixels * 4) {
    throw new RangeError('The pixel buffer does not match width x height x 4');
  }

  // 1. Composite over white, so a transparent cut-out backdrop is treated as white.
  const out = new Uint8ClampedArray(pixels * 4);
  for (let p = 0; p < pixels; p++) {
    const i = p * 4;
    const alpha = rgba[i + 3] / 255;
    out[i] = Math.round(rgba[i] * alpha + 255 * (1 - alpha));
    out[i + 1] = Math.round(rgba[i + 1] * alpha + 255 * (1 - alpha));
    out[i + 2] = Math.round(rgba[i + 2] * alpha + 255 * (1 - alpha));
    out[i + 3] = 255;
  }

  // 2. Flood fill (4-connected) from every border pixel.
  const inBackdrop = new Uint8Array(pixels);
  const queue = new Int32Array(pixels);
  let head = 0;
  let tail = 0;
  const lightEnough = (p: number): boolean => darkness(out[p * 4], out[p * 4 + 1], out[p * 4 + 2]) <= D_MAX;
  const push = (p: number): void => {
    inBackdrop[p] = 1;
    queue[tail++] = p;
  };
  const borderPixels: number[] = [];
  for (let x = 0; x < width; x++) borderPixels.push(x, (height - 1) * width + x);
  for (let y = 1; y < height - 1; y++) borderPixels.push(y * width, y * width + width - 1);
  const lightBorder = borderPixels.filter(lightEnough);
  const typical = [0, 1, 2].map((c) => median(lightBorder.map((p) => out[p * 4 + c])));
  const seedLimit = SEED_TOLERANCE * SEED_TOLERANCE;
  for (const p of lightBorder) {
    const dr = out[p * 4] - typical[0];
    const dg = out[p * 4 + 1] - typical[1];
    const db = out[p * 4 + 2] - typical[2];
    if (inBackdrop[p] === 0 && dr * dr + dg * dg + db * db <= seedLimit) push(p);
  }

  const stepLimit = STEP * STEP;
  const visit = (from: number, to: number): void => {
    if (inBackdrop[to] !== 0 || !lightEnough(to)) return;
    const dr = out[from * 4] - out[to * 4];
    const dg = out[from * 4 + 1] - out[to * 4 + 1];
    const db = out[from * 4 + 2] - out[to * 4 + 2];
    if (dr * dr + dg * dg + db * db <= stepLimit) push(to);
  };
  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) visit(p, p - 1);
    if (x < width - 1) visit(p, p + 1);
    if (y > 0) visit(p, p - width);
    if (y < height - 1) visit(p, p + width);
  }

  // 3. Remap the backdrop: darkness d -> d * smoothstep((d - D_WHITE) / (D_MAX - D_WHITE)), continuous at both ends.
  for (let p = 0; p < pixels; p++) {
    if (inBackdrop[p] === 0) continue;
    const i = p * 4;
    const d = darkness(out[i], out[i + 1], out[i + 2]);
    const factor = smoothstep((d - D_WHITE) / (D_MAX - D_WHITE));
    for (let c = 0; c < 3; c++) out[i + c] = Math.round(255 - (255 - out[i + c]) * factor);
  }
  return out;
}
