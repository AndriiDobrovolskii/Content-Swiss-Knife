import contract from './image-studio-contract.json';

/**
 * Typed accessors over `image-studio-contract.json` - the one place the closed Image Studio values live
 * (US-10.1 DD-1). The BFF reads the same JSON through an import attribute; the client reads it here, so
 * the two runtimes cannot drift apart.
 *
 * Holds only what BOTH runtimes need: the error-code -> HTTP status map (SD-2), the aspect ratios (FR-19),
 * the resolutions and the response kinds (SD-1). BFF-only limits live in `server/image-studio/constants.js`
 * and the client-only deadline lives in the generation runner.
 */

/** The error code -> HTTP status map. `null` marks a code whose status is the original upstream status. */
const ERROR_STATUS: Readonly<Record<string, number | null>> = contract.errorCodes;

/** Every closed BFF error code, in contract order. */
export const ERROR_CODES: readonly string[] = Object.keys(ERROR_STATUS);

/** Aspect ratios offered by the studio, in Story order (FR-19). */
export const ASPECT_RATIOS: readonly string[] = contract.aspectRatios;

/** Output resolutions (FR-19). Which of them a given model accepts is the catalogue's `resolutions`. */
export const RESOLUTIONS: readonly string[] = contract.resolutions;

/** The discriminant of a generate response (SD-1). */
export const RESPONSE_KINDS: readonly string[] = contract.responseKinds;

/** True when `x` is one of the closed BFF error codes. Case-sensitive; never true for a non-string. */
export function isErrorCode(x: unknown): boolean {
  return typeof x === 'string' && Object.prototype.hasOwnProperty.call(ERROR_STATUS, x);
}

/**
 * The HTTP status a closed code is answered with, or `null` for a code that carries the original
 * upstream status. Throws for anything that is not a closed code: there is no silent default (FR-61).
 */
export function statusOf(code: unknown): number | null {
  if (!isErrorCode(code)) {
    throw new Error(`Unknown Image Studio error code: ${String(code)}`);
  }
  return ERROR_STATUS[code as string];
}

/** The BFF codes that are answered with `status` (for example 413 has two). Empty when none is. */
export function codesForStatus(status: number): string[] {
  return ERROR_CODES.filter((code) => ERROR_STATUS[code] === status);
}

/** True when `x` is one of the supported aspect ratios. */
export function isAspectRatio(x: unknown): boolean {
  return typeof x === 'string' && ASPECT_RATIOS.includes(x);
}

/** True when `x` is one of the supported resolutions. */
export function isResolution(x: unknown): boolean {
  return typeof x === 'string' && RESOLUTIONS.includes(x);
}

/** True when `x` is one of the response kinds. */
export function isResponseKind(x: unknown): boolean {
  return typeof x === 'string' && RESPONSE_KINDS.includes(x);
}
