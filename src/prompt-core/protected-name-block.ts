/**
 * protected-name-block.ts
 *
 * US-7.1 (FR-2, OD-2): the per-product `[PROTECTED PRODUCT NAME]` block. It carries the operator's
 * typed name, so it is product-specific text and therefore goes into `userContent` ONLY. A
 * product-specific string in a cached `systemBlocks` entry would fragment the prompt cache per
 * product (AGENTS.md section 3), so `systemBlocks` is passed through by reference, untouched.
 *
 * The static, product-independent counterpart lives in `PRODUCT_NAME_LOCALIZATION` (constants.ts);
 * both use the marker literal below.
 */
import { classifyProductName } from '../utils/protected-product-name';
import type { PromptPayload } from './payload';

export const PROTECTED_NAME_MARKER = '[PROTECTED PRODUCT NAME]';

export function buildProtectedNameBlock(typedName: string): string {
  const typed = typedName.trim();
  return [
    PROTECTED_NAME_MARKER,
    `Typed name: "${typed}"`,
    'This is a brand/model name. Keep every token of it, in the typed order, untranslated and verbatim, and render it once. '
      + 'Do not translate, drop, shorten, reorder or replace any token, including descriptive words such as a trailing noun. '
      + 'Only the locale formatting of numbers and units inside it is allowed (for example "1.75 mm" becomes "1,75 мм" in a comma-decimal locale).',
    'A localized category noun may be added in front of the name, but never inside it and never instead of any of its tokens. '
      + 'Priority: the full typed name outranks the localized category noun. For SEO fields, when the category noun and the full name '
      + 'do not both fit the 55-character meta_title limit, omit the category noun and keep the whole name.',
  ].join('\n');
}

/** Appends the block to `userContent` for a protected name; returns the payload unchanged otherwise. */
export function withProtectedNameBlock(payload: PromptPayload, typedName: string): PromptPayload {
  const typed = (typedName ?? '').trim();
  if (!typed || !classifyProductName(typed).protected) return payload;
  return {
    systemBlocks: payload.systemBlocks,
    userContent: `${payload.userContent}\n\n${buildProtectedNameBlock(typed)}\n`,
  };
}
