/**
 * The upload rules of the Image Studio (US-10.1 FR-10, FR-11, FR-12): the (long side, size) decision table and
 * the count rule. Pure functions; the ingest pipeline (`image-ingest.ts`) calls them in the exact order of FR-11.
 *
 * "5 MB" is 5 242 880 bytes (SD-25). A file that cannot be decoded never reaches the table (N-7); that is the
 * ingest pipeline's T-1 failure.
 */

/** The as-displayed long side above which an image is downscaled (FR-11). */
export const MAX_LONG_SIDE = 2048;
/** The size limit of the SENT (re-encoded) bytes: 5 MB = 5 242 880 B (SD-25, D-7). */
export const MAX_UPLOAD_BYTES = 5_242_880;
/** The most user uploads one message may carry (FR-10). */
export const MAX_UPLOADS = 5;

export interface UploadDecision {
  row: 1 | 2 | 3 | 4;
  accept: boolean;
  downscale: boolean;
  /** Present only on a rejection: the studio text id (T-2, size). */
  reason?: 'T-2';
}

/**
 * The FR-11 table, four mutually exclusive rows:
 *   1. long side <= 2048, size <= 5 MB  accept, no downscale
 *   2. long side <= 2048, size >  5 MB  reject T-2, never silently re-encoded
 *   3. long side >  2048, size <= 5 MB  accept, downscale to 2048
 *   4. long side >  2048, size >  5 MB  accept, downscale to 2048 (the sent bytes are checked afterwards, D-7)
 *
 * Throws `RangeError` for a long side that is not a finite positive number or a size that is not a finite
 * non-negative number: those are programming errors, not a silent accept.
 */
export function decideUpload(input: { longSide: number; size: number }): UploadDecision {
  const { longSide, size } = input;
  if (!Number.isFinite(longSide) || longSide <= 0) throw new RangeError(`Invalid long side: ${longSide}`);
  if (!Number.isFinite(size) || size < 0) throw new RangeError(`Invalid size: ${size}`);

  const tooLong = longSide > MAX_LONG_SIDE;
  const tooBig = size > MAX_UPLOAD_BYTES;
  if (!tooLong && !tooBig) return { row: 1, accept: true, downscale: false };
  if (!tooLong) return { row: 2, accept: false, downscale: false, reason: 'T-2' };
  if (!tooBig) return { row: 3, accept: true, downscale: true };
  return { row: 4, accept: true, downscale: true };
}

/** D-7: the check on the bytes that will actually be sent (after the re-encode). */
export function checkSentBytes(size: number): { ok: true } | { ok: false; reason: 'T-2' } {
  return size <= MAX_UPLOAD_BYTES ? { ok: true } : { ok: false, reason: 'T-2' };
}

export interface AttachmentKind {
  kind: 'upload' | 'version';
}

/** How many of the attachments are user uploads; the attached version is outside the five (FR-10). */
export function countUploads(attachments: readonly AttachmentKind[]): number {
  return attachments.filter((a) => a.kind === 'upload').length;
}

/** Whether one more user upload may be attached; the 6th is refused with T-3. Does not touch the list. */
export function canAttachUpload(attachments: readonly AttachmentKind[]): { ok: true } | { ok: false; reason: 'T-3' } {
  return countUploads(attachments) < MAX_UPLOADS ? { ok: true } : { ok: false, reason: 'T-3' };
}
