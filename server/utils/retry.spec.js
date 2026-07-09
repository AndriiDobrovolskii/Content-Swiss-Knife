import { describe, it, expect, vi } from 'vitest';
import { withRetry } from './retry.js';
import { IncompleteGenerationError, RefusalError } from './errors.js';

describe('withRetry — attempt numbering', () => {
  it('passes a 1-based attempt number to operation on every call', async () => {
    const seenAttempts = [];
    const operation = vi.fn((attempt) => {
      seenAttempts.push(attempt);
      if (seenAttempts.length < 3) throw new IncompleteGenerationError({ mode: 'creative', stopReason: 'max_tokens' });
      return 'done';
    });

    const result = await withRetry(operation, 3, 0);

    expect(result).toBe('done');
    expect(seenAttempts).toEqual([1, 2, 3]);
  });
});

describe('withRetry — IncompleteGenerationError (max_tokens truncation)', () => {
  it('retries with an escalated max_tokens budget on each attempt, mirroring how generate() computes it', async () => {
    // Mirrors AnthropicProvider#generate's escalation formula so this test proves the
    // *mechanism* (operation receiving an increasing attempt number) actually produces
    // an increasing budget, not just that a retry happened.
    const baseMaxTokens = 64000;
    const escalationFactor = 1.5;
    const usedMaxTokens = [];

    const operation = vi.fn((attempt) => {
      const maxTokens = Math.round(baseMaxTokens * Math.pow(escalationFactor, attempt - 1));
      usedMaxTokens.push(maxTokens);
      if (attempt < 3) throw new IncompleteGenerationError({ mode: 'creative', stopReason: 'max_tokens', maxTokensUsed: maxTokens });
      return { result: 'ok', maxTokens };
    });

    const result = await withRetry(operation, 3, 0);

    expect(usedMaxTokens).toEqual([64000, 96000, 144000]);
    expect(usedMaxTokens[1]).toBeGreaterThan(usedMaxTokens[0]);
    expect(usedMaxTokens[2]).toBeGreaterThan(usedMaxTokens[1]);
    expect(result.result).toBe('ok');
  });

  it('throws upward after exhausting retries, never returning a fallback/truncated value', async () => {
    const operation = vi.fn(() => {
      throw new IncompleteGenerationError({ mode: 'creative', stopReason: 'max_tokens' });
    });

    await expect(withRetry(operation, 3, 0)).rejects.toThrow(IncompleteGenerationError);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('does not delay between incomplete-generation retries (no rate-limit backoff needed)', async () => {
    const start = Date.now();
    const operation = vi.fn((attempt) => {
      if (attempt < 3) throw new IncompleteGenerationError({ mode: 'creative', stopReason: 'max_tokens' });
      return 'done';
    });

    await withRetry(operation, 3, 5000); // large baseDelayMs — would be slow if backoff applied
    expect(Date.now() - start).toBeLessThan(500);
  });
});

describe('withRetry — RefusalError', () => {
  it('never retries a refusal — throws immediately on the first attempt', async () => {
    const operation = vi.fn(() => {
      throw new RefusalError({ mode: 'creative', category: 'cyber' });
    });

    await expect(withRetry(operation, 3, 0)).rejects.toThrow(RefusalError);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});

describe('withRetry — existing rate-limit behavior (regression)', () => {
  it('still retries on HTTP 429 with backoff', async () => {
    const operation = vi.fn((attempt) => {
      if (attempt < 2) {
        const err = new Error('rate limited');
        err.status = 429;
        throw err;
      }
      return 'ok';
    });

    const result = await withRetry(operation, 3, 1);
    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry a plain unrelated error', async () => {
    const operation = vi.fn(() => {
      throw new Error('boom');
    });

    await expect(withRetry(operation, 3, 0)).rejects.toThrow('boom');
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
