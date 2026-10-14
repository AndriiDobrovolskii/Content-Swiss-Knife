/**
 * faq-form.ts
 *
 * US-8.1 (FR-16, AC-11, AC-12): the Generate-enablement predicate of the standalone FAQ Generator.
 *
 * The form requires exactly three inputs: a store, a Product Name and Supplemental Content.
 * Whitespace-only text counts as empty. Original Description and Tech Specs are deliberately NOT
 * parameters - they are optional context and must never block Generate (AC-12).
 *
 * Pure: no signals, no DOM, no I/O, so it is testable without the component.
 */
import type { WebsiteOption } from '../app/types';

export interface FaqFormValues {
  website: WebsiteOption | null;
  productName: string;
  supplementalContent: string;
}

/** True only when a store is selected AND Product Name and Supplemental Content are non-blank. */
export function isFaqFormComplete(values: FaqFormValues): boolean {
  return (
    values.website !== null &&
    values.productName.trim() !== '' &&
    values.supplementalContent.trim() !== ''
  );
}
