// Sonnet 5 hard output ceiling (thinking + response text combined).
export const MAX_TOKENS_CEILING = 128000;

// Default output budget for creative/creative-json modes. On Sonnet 5, adaptive thinking
// shares this budget with the response text, so thinking is disabled for these modes
// (see AnthropicProvider#generate) and the full budget goes to output.
//
// Calibration (step 7): a ~14000-char (~13000 stripped) Ukrainian Schema v3.0 description
// (9 sections, a 15-row spec table, 4 figures — sized to match the real complete en-ES
// sample from the original bug report) measured 6306 input_tokens via
// POST /v1/messages/count_tokens against claude-sonnet-5's actual tokenizer. Scaled to
// exactly match the real sample's length, that's ~6800 tokens; a 1.3x safety margin puts
// the calibrated floor under 9000 tokens — the original truncation bug was adaptive
// thinking eating the shared budget (now disabled above), not output text itself needing
// more room. 64000 is therefore a deliberately generous ceiling, not a calibrated minimum
// — kept at this value on explicit instruction rather than lowered to the measured floor.
export const CREATIVE_MAX_TOKENS_DEFAULT = 64000;

// Default output budget for non-creative (text/json) modes — unchanged from before this fix.
export const TEXT_MAX_TOKENS_DEFAULT = 16000;

// Multiplier applied to max_tokens on each retry after an IncompleteGenerationError.
export const MAX_TOKENS_ESCALATION_FACTOR = 1.5;

// analyzeImage() budget — raised from 300 for headroom now that thinking is disabled.
export const VISION_MAX_TOKENS_DEFAULT = 1024;
