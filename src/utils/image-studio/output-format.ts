import type { ImageMime } from './ports';

/**
 * Output-format selection (US-10.1 FR-82, D-19 to D-22).
 *
 * `outputFormat` is the first-match rule for the INPUT format a generated version inherits:
 *   (a) the first user-uploaded image of the message, in attachment order, identified from the file as supplied;
 *   (b) else the input format of the version attached under FR-37;
 *   (c) else the input format of the session's latest version;
 *   (d) else PNG.
 *
 * `resolveTargetFormat` applies the operator's selector: the input format is only the DEFAULT, a choice made
 * before downloading wins.
 */
export interface OutputFormatContext {
  uploadedFormats?: readonly ImageMime[];
  attachedVersionFormat?: ImageMime;
  latestVersionFormat?: ImageMime;
}

export function outputFormat(ctx: OutputFormatContext): ImageMime {
  return ctx.uploadedFormats?.[0] ?? ctx.attachedVersionFormat ?? ctx.latestVersionFormat ?? 'image/png';
}

export function resolveTargetFormat(inputFormat: ImageMime, selectorChoice?: ImageMime): ImageMime {
  return selectorChoice ?? inputFormat;
}
