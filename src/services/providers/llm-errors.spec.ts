import '@angular/compiler'; // HttpErrorResponse pulls in Angular's JIT compiler chain outside a bootstrapped app
import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { classifyLlmError, IncompleteGenerationClientError, RefusalClientError } from './llm-errors';

describe('classifyLlmError', () => {
  it('maps a 502 incomplete_generation body to IncompleteGenerationClientError', () => {
    const httpError = new HttpErrorResponse({
      status: 502,
      statusText: 'Bad Gateway',
      url: '/api/llm/generate',
      error: { error: 'Anthropic generation incomplete: stop_reason=max_tokens mode=creative', code: 'incomplete_generation', stopReason: 'max_tokens', locale: 'uk-UA' },
    });

    const result = classifyLlmError(httpError);

    expect(result).toBeInstanceOf(IncompleteGenerationClientError);
    expect((result as IncompleteGenerationClientError).stopReason).toBe('max_tokens');
    expect((result as IncompleteGenerationClientError).locale).toBe('uk-UA');
  });

  it('maps a 422 refusal body to RefusalClientError', () => {
    const httpError = new HttpErrorResponse({
      status: 422,
      statusText: 'Unprocessable Entity',
      url: '/api/llm/generate',
      error: { error: 'Anthropic refused the request', code: 'refusal', category: 'cyber', locale: 'es-ES' },
    });

    const result = classifyLlmError(httpError);

    expect(result).toBeInstanceOf(RefusalClientError);
    expect((result as RefusalClientError).category).toBe('cyber');
    expect((result as RefusalClientError).locale).toBe('es-ES');
  });

  it('passes through an HttpErrorResponse with no recognized code unchanged', () => {
    const httpError = new HttpErrorResponse({
      status: 500,
      statusText: 'Internal Server Error',
      url: '/api/llm/generate',
      error: { error: 'some unrelated failure' },
    });

    const result = classifyLlmError(httpError);

    expect(result).toBe(httpError);
  });

  it('passes through a non-HttpErrorResponse error unchanged', () => {
    const plain = new Error('network down');

    const result = classifyLlmError(plain);

    expect(result).toBe(plain);
  });
});
