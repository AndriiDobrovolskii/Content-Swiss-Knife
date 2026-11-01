/**
 * The Image Studio's closed error vocabulary on the server (FR-61, SD-2).
 *
 * Every non-200 answer on an image route carries exactly `{ error: <closed code> }` and an HTTP status
 * the shared contract gives that code. Upstream text never reaches the browser. The code-to-status map is
 * read from `src/prompt-core/image-studio-contract.json`, the one source both runtimes share.
 *
 * `UPSTREAM_RETRIES_EXHAUSTED` is the one code with no fixed status: it carries the original upstream
 * 429 or 5xx, so its status must be supplied and is checked.
 */
import contract from '../../src/prompt-core/image-studio-contract.json' with { type: 'json' };

const CODE_STATUS = contract.errorCodes;
const VARIABLE_STATUS_CODE = 'UPSTREAM_RETRIES_EXHAUSTED';

function assertKnownCode(code) {
  if (typeof code !== 'string' || !Object.hasOwn(CODE_STATUS, code)) {
    throw new Error(`Unknown Image Studio error code: ${String(code)}`);
  }
}

/** True for the statuses UPSTREAM_RETRIES_EXHAUSTED may carry: upstream 429 or any 5xx. */
function isRetryableUpstreamStatus(status) {
  return status === 429 || (Number.isInteger(status) && status >= 500 && status <= 599);
}

/**
 * The contract status of a closed code, or `undefined` for UPSTREAM_RETRIES_EXHAUSTED.
 * Throws for an unknown code so a typo cannot become a silent generic error.
 */
export function statusForCode(code) {
  assertKnownCode(code);
  const status = CODE_STATUS[code];
  return status === null ? undefined : status;
}

/**
 * True only when `(status, code)` is a BFF signal: the code is closed AND the status is the one the
 * contract gives it (for UPSTREAM_RETRIES_EXHAUSTED, any 429 or 5xx). A reserved status without its code
 * (an upstream 410, 411, 413 or 501) is never a BFF signal, and neither is a code on the wrong status.
 */
export function isBffSignal(status, code) {
  if (typeof code !== 'string' || !Object.hasOwn(CODE_STATUS, code)) return false;
  if (code === VARIABLE_STATUS_CODE) return isRetryableUpstreamStatus(status);
  return CODE_STATUS[code] === status;
}

export class ImageStudioError extends Error {
  /**
   * @param {string} code one of the closed SD-2 codes
   * @param {number} [status] defaults to the contract status; required for UPSTREAM_RETRIES_EXHAUSTED
   */
  constructor(code, status) {
    assertKnownCode(code);
    const resolved = status === undefined ? statusForCode(code) : status;
    if (resolved === undefined) {
      throw new Error(`${code} carries the upstream status and requires it`);
    }
    if (!isBffSignal(resolved, code)) {
      throw new Error(`Status ${String(resolved)} is not the contract status of ${code}`);
    }
    super(code);
    this.name = 'ImageStudioError';
    this.code = code;
    this.status = resolved;
  }

  /** The only body a browser ever receives for this error. */
  get body() {
    return { error: this.code };
  }
}
