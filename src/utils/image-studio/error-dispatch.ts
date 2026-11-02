import { isErrorCode, statusOf } from '../../prompt-core/image-studio-contract';

/**
 * Maps a failed Image Studio HTTP call to one studio text (US-10.1 FR-47, FR-52, FR-61, FR-68, FR-83, SD-2, SD-13,
 * SD-26, SD-31). The client dispatches on the status AND the code (the `{ error }` envelope value), never on the
 * status alone, and never renders a code: each closed code maps to a fixed studio text id. A reserved code that
 * arrives on the wrong status is not read as that signal; anything that is not a closed code renders T-12.
 *
 * Not produced here: the client deadline (T-6), a Cancel (T-18) and a quota failure (T-20) are not HTTP errors.
 * Pure and total: any input yields an outcome.
 */
export interface DispatchInput {
  /** The HTTP status; 0 means a transport failure or no response. */
  status: number;
  /** The `error` string of our own envelope; undefined when the response carried none. */
  errorField?: string;
  retryAfterSeconds?: number;
}

export interface DispatchOutcome {
  textId: string;
  /** True when the UI offers a Retry button. */
  retry: boolean;
  /** True only for 413 + PROTECTED_HISTORY_EXCEEDS_LIMIT (FR-47). */
  blocked: boolean;
  /** True only for 410 + FILE_MISSING (FR-17): the runner owns the re-upload. */
  reupload: boolean;
  /** FR-83: every error goes to the alert region, never the status region. */
  region: 'alert' | 'status';
  retryAfterSeconds?: number;
}

interface CodeRule {
  textId: string;
  retry?: boolean;
  blocked?: boolean;
  reupload?: boolean;
}

/** One rule per closed BFF code (FR-61). */
const CODE_RULES: Readonly<Record<string, CodeRule>> = {
  REQUEST_BODY_TOO_LARGE: { textId: 'T-8' },
  CONTENT_LENGTH_REQUIRED: { textId: 'T-12' },
  PROTECTED_HISTORY_EXCEEDS_LIMIT: { textId: 'T-14', blocked: true },
  FILE_MISSING: { textId: 'T-10', reupload: true },
  RATE_LIMIT_EXCEEDED: { textId: 'T-13' },
  GEMINI_KEY_MISSING: { textId: 'T-11' },
  UNSUPPORTED_IMAGE_TYPE: { textId: 'T-1' },
  INVALID_REQUEST: { textId: 'T-12' },
  EMPTY_RESPONSE: { textId: 'T-5', retry: true },
  PRICE_NOT_CONFIGURED: { textId: 'T-12' },
  UPSTREAM_RETRIES_EXHAUSTED: { textId: 'T-7', retry: true },
};

/** A status that is a gateway or transport failure: nothing of ours answered (SD-31). */
const TRANSPORT_STATUSES: ReadonlySet<number> = new Set([0, 500, 502, 503, 504]);

/** True when `code` is a closed code that our server really answers with `status`. */
function codeMatchesStatus(code: string, status: number): boolean {
  if (!isErrorCode(code) || !Object.prototype.hasOwnProperty.call(CODE_RULES, code)) return false;
  const expected = statusOf(code);
  // A code whose status is null carries the original upstream status (429 or any 5xx).
  return expected === null ? status === 429 || status >= 500 : expected === status;
}

function outcome(rule: CodeRule, input: DispatchInput): DispatchOutcome {
  return {
    textId: rule.textId,
    retry: rule.retry ?? false,
    blocked: rule.blocked ?? false,
    reupload: rule.reupload ?? false,
    region: 'alert',
    ...(input.retryAfterSeconds !== undefined ? { retryAfterSeconds: input.retryAfterSeconds } : {}),
  };
}

export function dispatchError(input: DispatchInput): DispatchOutcome {
  const { status, errorField } = input;

  if (typeof errorField === 'string' && codeMatchesStatus(errorField, status)) {
    return outcome(CODE_RULES[errorField], input);
  }
  // Express's own non-JSON 413, or a 413 with a code we do not know: the generic size text (FR-52).
  if (status === 413) return outcome({ textId: 'T-8' }, input);
  // Nothing of ours answered: a lost call, offered as a manual Retry (SD-31, FR-85).
  if (errorField === undefined && TRANSPORT_STATUSES.has(status)) return outcome({ textId: 'T-7', retry: true }, input);
  return outcome({ textId: 'T-12' }, input);
}
