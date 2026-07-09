import { HttpErrorResponse } from '@angular/common/http';

/** Mirrors server/utils/errors.js's IncompleteGenerationError across the HTTP boundary. */
export class IncompleteGenerationClientError extends Error {
  readonly code = 'incomplete_generation' as const;
  constructor(message: string, readonly stopReason?: string, readonly locale?: string) {
    super(message);
    this.name = 'IncompleteGenerationClientError';
  }
}

/** Mirrors server/utils/errors.js's RefusalError across the HTTP boundary. */
export class RefusalClientError extends Error {
  readonly code = 'refusal' as const;
  constructor(message: string, readonly category?: string, readonly locale?: string) {
    super(message);
    this.name = 'RefusalClientError';
  }
}

/**
 * Classifies an HTTP error from the LLM proxy into a typed client-side error when the
 * server tagged it via mapProviderError (server/utils/http-errors.js); passes through
 * anything else (network errors, unrelated 500s) unchanged.
 */
export function classifyLlmError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { code?: string; error?: string; stopReason?: string; category?: string; locale?: string } | null;
    if (body?.code === 'incomplete_generation') {
      return new IncompleteGenerationClientError(body.error ?? 'Generation incomplete', body.stopReason, body.locale);
    }
    if (body?.code === 'refusal') {
      return new RefusalClientError(body.error ?? 'Generation refused', body.category, body.locale);
    }
  }
  return err as Error;
}
