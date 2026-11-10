import { describe, it, expect } from 'vitest';
import { CHIP_INSTRUCTIONS } from '../../prompt-core/prompt-presets';
import { flattenBackgroundToWhite, needsWhiteBackground } from './white-background';

/**
 * Pure-pixel tests (logic runner, no canvas): the flattening works on a plain RGBA array.
 * Fixtures are synthetic stand-ins for a Gemini "Product on white" result: an off-white backdrop with a soft gradient,
 * a product, and a soft shadow under it.
 */
const W = 60;
const H = 60;

type Rgb = readonly [number, number, number];

function blank(width = W, height = H): Uint8ClampedArray {
  return new Uint8ClampedArray(width * height * 4);
}

function set(img: Uint8ClampedArray, width: number, x: number, y: number, rgb: Rgb, a = 255): void {
  const i = (y * width + x) * 4;
  img[i] = rgb[0];
  img[i + 1] = rgb[1];
  img[i + 2] = rgb[2];
  img[i + 3] = a;
}

function get(img: Uint8ClampedArray, width: number, x: number, y: number): number[] {
  const i = (y * width + x) * 4;
  return [img[i], img[i + 1], img[i + 2], img[i + 3]];
}

/** A backdrop that drifts from (248,248,250) at the top to (243,243,246) at the bottom: the reported off-white. */
function backdrop(width = W, height = H): Uint8ClampedArray {
  const img = blank(width, height);
  for (let y = 0; y < height; y++) {
    const shade = Math.round((y / (height - 1)) * 5);
    for (let x = 0; x < width; x++) set(img, width, x, y, [248 - shade, 248 - shade, 250 - shade]);
  }
  return img;
}

function fillRect(img: Uint8ClampedArray, width: number, x0: number, y0: number, x1: number, y1: number, rgb: Rgb): void {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(img, width, x, y, rgb);
}

describe('flattenBackgroundToWhite: the backdrop', () => {
  it('turns an off-white gradient backdrop into exactly #FFFFFF at the corners and at the middle of every edge', () => {
    const img = backdrop();
    fillRect(img, W, 20, 15, 40, 40, [200, 120, 60]); // the product

    const out = flattenBackgroundToWhite(img, W, H);

    for (const [x, y] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1], [W / 2, 0], [W / 2, H - 1], [0, H / 2], [W - 1, H / 2]]) {
      expect(get(out, W, x, y), `pixel ${x},${y}`).toEqual([255, 255, 255, 255]);
    }
  });

  it('leaves an image that is already pure white identical', () => {
    const img = blank();
    fillRect(img, W, 0, 0, W, H, [255, 255, 255]);
    fillRect(img, W, 20, 15, 40, 40, [30, 30, 30]);

    expect(Array.from(flattenBackgroundToWhite(img, W, H))).toEqual(Array.from(img));
  });

  it('does not touch an image whose border is not light (nothing is a backdrop)', () => {
    const img = blank();
    fillRect(img, W, 0, 0, W, H, [90, 90, 95]);

    expect(Array.from(flattenBackgroundToWhite(img, W, H))).toEqual(Array.from(img));
  });

  it('composites transparency over white, so a transparent cut-out background reads #FFFFFF', () => {
    const img = blank(); // every pixel starts as rgba(0,0,0,0)
    fillRect(img, W, 20, 15, 40, 40, [200, 120, 60]);

    const out = flattenBackgroundToWhite(img, W, H);

    expect(get(out, W, 0, 0)).toEqual([255, 255, 255, 255]);
    expect(get(out, W, 30, 25)).toEqual([200, 120, 60, 255]);
  });

  it('returns a new array of the same size and never mutates its input', () => {
    const img = backdrop();
    const copy = Array.from(img);

    const out = flattenBackgroundToWhite(img, W, H);

    expect(out).not.toBe(img);
    expect(out.length).toBe(img.length);
    expect(Array.from(img)).toEqual(copy);
  });

  it('rejects a buffer whose length does not match width x height x 4', () => {
    expect(() => flattenBackgroundToWhite(new Uint8ClampedArray(10), W, H)).toThrow(RangeError);
  });
});

describe('flattenBackgroundToWhite: the product and the shadow', () => {
  it('leaves every product pixel unchanged, including a near-white area enclosed by the product', () => {
    const img = backdrop();
    fillRect(img, W, 15, 10, 45, 40, [200, 150, 100]);
    fillRect(img, W, 27, 22, 33, 28, [251, 251, 251]); // near-white, but not connected to the frame border
    const before = Array.from(img);

    const out = flattenBackgroundToWhite(img, W, H);

    for (let y = 10; y < 40; y++) {
      for (let x = 15; x < 45; x++) {
        const i = (y * W + x) * 4;
        expect(Array.from(out.slice(i, i + 4)), `pixel ${x},${y}`).toEqual(before.slice(i, i + 4));
      }
    }
  });

  it('does not eat a light product that touches the frame border: its edge stops the fill', () => {
    const img = backdrop();
    fillRect(img, W, 0, 20, 12, 40, [240, 238, 236]); // lighter than D_MAX would allow on its own, but a different colour
    const before = Array.from(img);

    const out = flattenBackgroundToWhite(img, W, H);

    for (let y = 20; y < 40; y++) {
      for (let x = 0; x < 12; x++) {
        const i = (y * W + x) * 4;
        expect(Array.from(out.slice(i, i + 4)), `pixel ${x},${y}`).toEqual(before.slice(i, i + 4));
      }
    }
    expect(get(out, W, W - 1, 30)).toEqual([255, 255, 255, 255]);
  });

  it('keeps the soft shadow: pixels well below white stay darker than #FFFFFF and the product is untouched', () => {
    const img = backdrop();
    fillRect(img, W, 20, 10, 40, 40, [200, 120, 60]);
    // A shadow band under the product that fades from (205,205,210) at the product down to the backdrop.
    for (let y = 40; y < 52; y++) {
      const fade = (y - 40) / 11;
      const base = Math.round(205 + fade * (244 - 205));
      for (let x = 14; x < 46; x++) set(img, W, x, y, [base, base, base + 3]);
    }

    const out = flattenBackgroundToWhite(img, W, H);

    const shadowCore = get(out, W, 30, 41);
    expect(shadowCore[0]).toBeLessThan(255);
    expect(shadowCore).toEqual(get(img, W, 30, 41));
    expect(get(out, W, 30, 25)).toEqual([200, 120, 60, 255]);
  });

  it('blends the shadow into the white without a seam: no adjacent step grows beyond a small bound', () => {
    const img = backdrop();
    fillRect(img, W, 20, 10, 40, 40, [200, 120, 60]);
    for (let y = 40; y < 56; y++) {
      const fade = (y - 40) / 15;
      const base = Math.round(205 + fade * (244 - 205));
      for (let x = 14; x < 46; x++) set(img, W, x, y, [base, base, base + 3]);
    }

    const out = flattenBackgroundToWhite(img, W, H);

    let widest = 0;
    let previous = get(out, W, 30, 40)[0];
    for (let y = 41; y < H; y++) {
      const value = get(out, W, 30, y)[0];
      expect(value, `row ${y} must not get darker going away from the product`).toBeGreaterThanOrEqual(previous);
      widest = Math.max(widest, value - previous);
      previous = value;
    }
    expect(widest).toBeLessThanOrEqual(8);
    expect(get(out, W, 30, H - 1)).toEqual([255, 255, 255, 255]);
  });
});

describe('needsWhiteBackground: which sends get a pure white backdrop', () => {
  const removeBackground = CHIP_INSTRUCTIONS.find((chip) => chip.id === 'remove-background')?.instruction ?? '';

  it('is true for the "Product on white" preset, whatever the text became after it was picked', () => {
    expect(needsWhiteBackground({ presetId: 'white-bg', text: 'Product photo on a clean pure white background.' })).toBe(true);
    expect(needsWhiteBackground({ presetId: 'white-bg', text: 'something the operator typed instead' })).toBe(true);
  });

  it('is true for the "Remove background" chip text, with surrounding whitespace ignored', () => {
    expect(removeBackground).not.toBe('');
    expect(needsWhiteBackground({ text: removeBackground })).toBe(true);
    expect(needsWhiteBackground({ presetId: undefined, text: `  ${removeBackground}\n` })).toBe(true);
  });

  it('is false for every other preset and for free text that merely mentions a white background', () => {
    expect(needsWhiteBackground({ presetId: 'lifestyle', text: 'Lifestyle photo of the product.' })).toBe(false);
    expect(needsWhiteBackground({ presetId: 'banner', text: 'Wide banner image.' })).toBe(false);
    expect(needsWhiteBackground({ text: 'Put the product on a pure white background' })).toBe(false);
    expect(needsWhiteBackground({ text: `Do not ${removeBackground.toLowerCase()}` })).toBe(false);
    expect(needsWhiteBackground({})).toBe(false);
  });
});
