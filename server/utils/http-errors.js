/**
 * Maps a thrown provider error to an HTTP status + machine-readable body.
 * 502: the upstream model produced an incomplete (max_tokens-truncated) response — the
 *      request itself was fine, but the server refuses to pass truncated text through.
 * 422: the upstream model refused the request outright — understood, not a server fault.
 * 500: anything else, unchanged from prior behavior.
 */
export function mapProviderError(error) {
  if (error?.code === 'incomplete_generation') {
    return {
      status: 502,
      body: { error: error.message, code: error.code, stopReason: error.stopReason, locale: error.locale },
    };
  }
  if (error?.code === 'refusal') {
    return {
      status: 422,
      body: { error: error.message, code: error.code, stopReason: 'refusal', category: error.category, locale: error.locale },
    };
  }
  return { status: 500, body: { error: error.message } };
}
