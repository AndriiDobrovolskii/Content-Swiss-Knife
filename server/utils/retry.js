export async function withRetry(operation, maxRetries = 3, baseDelayMs = 3000) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;

      // Refusals are a deliberate model decision, not a transient failure — retrying
      // with a different max_tokens budget wouldn't change the outcome.
      if (error?.code === 'refusal') throw error;

      const isIncomplete = error?.code === 'incomplete_generation';
      const status = error?.status || error?.response?.status;
      const message = error?.message || '';

      const isRetryable =
        isIncomplete ||
        status === 429 ||
        status === 503 ||
        message.includes('429') ||
        message.includes('overloaded') ||
        message.includes('RESOURCE_EXHAUSTED') ||
        message.includes('rate_limit');

      if (isRetryable && attempt < maxRetries) {
        if (isIncomplete) {
          // No backoff delay needed — max_tokens truncation isn't rate-limiting, and the
          // caller escalates its own budget for the next attempt via the attempt number.
          console.warn(`[Retry] Attempt ${attempt}/${maxRetries} truncated (stop_reason=${error.stopReason}). Retrying with an escalated max_tokens budget…`);
        } else {
          const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
          console.warn(`[Retry] Attempt ${attempt}/${maxRetries} rate-limited. Retrying in ${Math.round(delay)}ms…`);
          await new Promise(r => setTimeout(r, delay));
        }
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}
