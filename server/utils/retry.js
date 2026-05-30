export async function withRetry(operation, maxRetries = 3, baseDelayMs = 3000) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const status = error?.status || error?.response?.status;
      const message = error?.message || '';

      const isRetryable =
        status === 429 ||
        status === 503 ||
        message.includes('429') ||
        message.includes('overloaded') ||
        message.includes('RESOURCE_EXHAUSTED') ||
        message.includes('rate_limit');

      if (isRetryable && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.warn(`[Retry] Attempt ${attempt}/${maxRetries} rate-limited. Retrying in ${Math.round(delay)}ms…`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}
