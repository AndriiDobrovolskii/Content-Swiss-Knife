// Sonnet 5 hard output ceiling (thinking + response text combined).
export const MAX_TOKENS_CEILING = 128000;

// Default output budget for creative/creative-json modes. On Sonnet 5, adaptive thinking
// shares this budget with the response text, so thinking is disabled for these modes
// (see AnthropicProvider#generate) and the full budget goes to output.
// TODO(step 7): replace with a measured worst-case value (Anthropic token-counting API
// against claude-sonnet-5 on the longest real uk-UA description) × 1.3, capped at
// MAX_TOKENS_CEILING. 64000 is a provisional, uncalibrated default.
export const CREATIVE_MAX_TOKENS_DEFAULT = 64000;

// Default output budget for non-creative (text/json) modes — unchanged from before this fix.
export const TEXT_MAX_TOKENS_DEFAULT = 16000;

// Multiplier applied to max_tokens on each retry after an IncompleteGenerationError.
export const MAX_TOKENS_ESCALATION_FACTOR = 1.5;

// analyzeImage() budget — raised from 300 for headroom now that thinking is disabled.
export const VISION_MAX_TOKENS_DEFAULT = 1024;
