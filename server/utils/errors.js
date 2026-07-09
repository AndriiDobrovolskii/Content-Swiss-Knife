export class IncompleteGenerationError extends Error {
  constructor({ mode, stopReason, locale, maxTokensUsed } = {}) {
    super(`Anthropic generation incomplete: stop_reason=${stopReason} mode=${mode}`);
    this.name = 'IncompleteGenerationError';
    this.code = 'incomplete_generation';
    this.mode = mode;
    this.stopReason = stopReason;
    this.locale = locale;
    this.maxTokensUsed = maxTokensUsed;
  }
}

export class RefusalError extends Error {
  constructor({ mode, locale, category } = {}) {
    super(`Anthropic refused the request (mode=${mode}${category ? `, category=${category}` : ''})`);
    this.name = 'RefusalError';
    this.code = 'refusal';
    this.mode = mode;
    this.locale = locale;
    this.category = category;
  }
}
