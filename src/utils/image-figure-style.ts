/**
 * image-figure-style.ts - the one place the structural layout of an image figure is written down
 * (US-5.1 FR-22, plan D6). The structured-document renderer, `wrapImageFigures` and the TipTap
 * `imageFigure` node all import these constants so the three surfaces cannot drift apart.
 *
 * Video figures have their own layout (render-description.ts) and deliberately do not use these.
 */

/** Figure box: as wide as its content, never wider than the column, centred. */
export const IMAGE_FIGURE_STYLE = 'display: block; width: max-content; max-width: 100%; margin: 4px auto;';

/** The image inside an image figure. */
export const IMAGE_IMG_STYLE = 'max-width: 100%; height: auto; display: block;';

/** The figcaption of an image figure. */
export const IMAGE_FIGCAPTION_STYLE = 'text-align: left;';
