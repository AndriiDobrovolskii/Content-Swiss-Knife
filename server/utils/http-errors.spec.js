import { describe, it, expect } from 'vitest';
import { mapProviderError } from './http-errors.js';
import { IncompleteGenerationError, RefusalError } from './errors.js';

describe('mapProviderError', () => {
  it('maps IncompleteGenerationError to 502 with stopReason/code in the body', () => {
    const error = new IncompleteGenerationError({ mode: 'creative', stopReason: 'max_tokens', locale: 'uk-UA', maxTokensUsed: 96000 });

    const { status, body } = mapProviderError(error);

    expect(status).toBe(502);
    expect(body.code).toBe('incomplete_generation');
    expect(body.stopReason).toBe('max_tokens');
    expect(body.locale).toBe('uk-UA');
    expect(body.error).toBe(error.message);
  });

  it('maps RefusalError to 422 with category/code in the body', () => {
    const error = new RefusalError({ mode: 'creative', locale: 'es-ES', category: 'cyber' });

    const { status, body } = mapProviderError(error);

    expect(status).toBe(422);
    expect(body.code).toBe('refusal');
    expect(body.stopReason).toBe('refusal');
    expect(body.category).toBe('cyber');
    expect(body.locale).toBe('es-ES');
  });

  it('falls back to 500 with just the message for an unrelated error', () => {
    const error = new Error('some network failure');

    const { status, body } = mapProviderError(error);

    expect(status).toBe(500);
    expect(body).toEqual({ error: 'some network failure' });
  });
});
