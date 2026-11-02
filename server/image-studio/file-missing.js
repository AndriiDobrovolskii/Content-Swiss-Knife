/**
 * FILE_MISSING recogniser for the Image Studio generate route (US-10.1, FR-17, FR-61; DD-13).
 *
 * The BFF answers 410 FILE_MISSING only for the CONJUNCTION of three conditions, never for "any 404":
 *   1. the request carried at least one `fileData` part (a `file_uri`);
 *   2. the upstream status is in the recorded V-2 class (FILE_MISSING_STATUSES, constants.js);
 *   3. the error itself names a file resource (`files/...` or "File not found").
 *
 * Rule 1: this module imports no SDK symbol. The caller reads `status` and `message` from the upstream
 * error and passes them as plain values. The result is a strict boolean, so no upstream text can flow into
 * a browser-facing field through here.
 */
import { FILE_MISSING_STATUSES } from './constants.js';

/** V-2: the error body names `files/<id>` or says "File not found or has expired". */
const NAMES_A_FILE_RESOURCE = /(?:^|[^a-z0-9_])files\/|file not found/i;

/**
 * @param {{ requestCarriedFileUri?: boolean, status?: number, message?: string }} input
 * @returns {boolean}
 */
export function isFileMissing(input) {
  if (typeof input !== 'object' || input === null) return false;
  const { requestCarriedFileUri, status, message } = input;
  if (requestCarriedFileUri !== true) return false;
  if (typeof status !== 'number' || !FILE_MISSING_STATUSES.includes(status)) return false;
  if (typeof message !== 'string' || message.length === 0) return false;
  return NAMES_A_FILE_RESOURCE.test(message);
}
