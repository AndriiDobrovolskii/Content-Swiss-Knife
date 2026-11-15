/**
 * The attachment-role invariant of the Image Studio (US-10.6 FR-10, FR-11, FR-12 (a)-(f), FR-14; AC-6, AC-7, AC-8;
 * the five-Product limit of US-10.1 AC-3 kept by AC-15).
 *
 * ONE place decides every path that sets or changes a role, so the composer, the store and a restored session cannot
 * disagree:
 *   - at most FIVE Product uploads (a Style ref image is not one of the five, AC-8);
 *   - at most ONE Style ref;
 *   - the attached "Edit this" version is outside the five, has no role control and is Product (SM-3 (i), US-10.1 FR-10).
 *
 * Pure functions: no clock, no storage, no mutation of the list they are given. A rejection carries a studio text id
 * (a string literal, as `upload-rules.ts` returns 'T-3'); the dictionary entries X-61 and X-62 are the T24 copy task's.
 */
import { MAX_UPLOADS, countUploads, canAttachUpload } from './upload-rules';

export type AttachmentRole = 'product' | 'style-ref';

/** An attachment as the role rules see it. A role-less upload (an item written before this Story) is Product. */
export interface RoleAttachment {
  id: string;
  kind: 'upload' | 'version';
  role?: AttachmentRole;
}

/** The studio text id of a second Style ref rejection (FR-11). */
export const REASON_SECOND_STYLE_REF = 'X-61';
/** The studio text id of a sixth Product rejection caused by a role change (FR-12). */
export const REASON_SIXTH_PRODUCT = 'X-62';

export type RoleDecision =
  | { ok: true }
  | { ok: false; reason: typeof REASON_SECOND_STYLE_REF | typeof REASON_SIXTH_PRODUCT | 'T-3' };

/** A stored value is Style ref only when it is exactly the string 'style-ref'; anything else is Product (FR-12 (f), FR-14). */
export function normalizeStoredRole(stored: unknown): AttachmentRole {
  return stored === 'style-ref' ? 'style-ref' : 'product';
}

/** Whether one more new image (a new image is Product, AC-6) may be attached; the 6th Product is refused with T-3. */
export function decideAttach(list: readonly RoleAttachment[]): RoleDecision {
  return canAttachUpload(list);
}

/**
 * Whether the upload `id` may take `role`.
 *   - to Style ref: refused with X-61 when ANOTHER upload already is the Style ref (the first stays);
 *   - to Product: refused with X-62 when the OTHER uploads already hold five Products (it would be six).
 * Taking the role the item already has is accepted. The attached version has no role control (SM-3 (i)) and an id that
 * is not in the list is a caller defect, so both throw `RangeError` rather than answer a silent accept.
 */
export function decideRoleChange(list: readonly RoleAttachment[], id: string, role: AttachmentRole): RoleDecision {
  const target = list.find((item) => item.id === id);
  if (!target) throw new RangeError(`Unknown attachment: ${id}`);
  if (target.kind !== 'upload') throw new RangeError(`The attached version has no role: ${id}`);

  if (normalizeStoredRole(target.role) === role) return { ok: true };

  const others = list.filter((item) => item.id !== id);
  if (role === 'style-ref') {
    const taken = others.some((item) => item.kind === 'upload' && normalizeStoredRole(item.role) === 'style-ref');
    return taken ? { ok: false, reason: REASON_SECOND_STYLE_REF } : { ok: true };
  }
  return countUploads(others) >= MAX_UPLOADS ? { ok: false, reason: REASON_SIXTH_PRODUCT } : { ok: true };
}
