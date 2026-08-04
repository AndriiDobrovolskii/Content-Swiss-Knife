/**
 * timeouts.js
 *
 * How long a single provider call may hang before it is aborted.
 *
 * WHY THIS EXISTS. Every SDK ships a generous default and its own retry loop, and the two multiply:
 * `@anthropic-ai/sdk` defaults to a 10-minute timeout with `maxRetries: 2`, and `@google/genai`'s
 * `retryOptions.attempts` "default to 5". Wrapped in our own `withRetry` (3 attempts), one stuck
 * request could be issued up to 15 times, each waiting on a long timeout — effectively unbounded.
 * The SDK docs say so themselves: "request timeouts are retried by default, so in a worst-case
 * scenario you may wait much longer than this timeout."
 *
 * So the SDKs' own retry loops are switched off and retry policy lives in exactly one
 * provider-independent place — `withRetry` — which is what architecture rule #5 asks for. The
 * timeouts below are what remains to bound a hang.
 *
 * WHY NOT 60–120 s ACROSS THE BOARD. A deep call legitimately runs for minutes: the 2026-08-01
 * EXPERT3D run emitted 17,940 output tokens in a single `creative-json` call. A short universal cap
 * would abort real generations and trade a rare hang for constant flakiness. Hence two values,
 * keyed by the same deep/fast split the rest of the pipeline already uses (`slotFor` in
 * server/llm-request.js).
 *
 * An aborted request surfaces as a timeout error, which `withRetry` now classifies as a transport
 * failure and retries — so bounding the hang and recovering from it are two halves of one change.
 */

/**
 * Deep: thinking models producing long artifacts.
 *
 * WHY 20 MINUTES AND NOT ANTHROPIC'S 10. This used to be 600_000 — the SDK's own default — until a
 * Sonnet 4.6 @ high `Doc (base)` run showed 600 s is not enough for a single attempt. The [LLM] line
 * read `FAILED in 1137.2s`, and since server/index.js starts that clock BEFORE `generate()` it spans
 * the whole `withRetry`: attempt 1 hit this timeout at 600 s and was retried as a transport failure,
 * attempt 2 ran ~533 s and died on max_tokens. Sonnet 4.6's effort ladder sits a rung below Sonnet
 * 5's (4.6 @ high ≈ 5 @ medium), so it thinks appreciably longer for the same artifact — and the
 * wider ceiling that stops the truncation makes each attempt longer still.
 *
 * THE COST, STATED PLAINLY: `withRetry` spends 3 attempts, so a genuinely wedged request now hangs
 * for up to 60 minutes rather than 30. What keeps that bounded in practice is that the repair gate
 * no longer multiplies it — a truncation or safety block short-circuits out of the Doc branch
 * instead of buying 3 more attempts (see src/render/doc-schema-issues.ts).
 */
export const DEEP_TIMEOUT_MS = 1_200_000;

/**
 * Vision with thinking. Deliberately NOT DEEP_TIMEOUT_MS: an image caption is capped at 8000 output
 * tokens and cannot legitimately run for twenty minutes, so borrowing the deep budget would only
 * widen the hang window — and an image manifest issues one call per image, so it would widen it
 * once per image.
 */
export const VISION_TIMEOUT_MS = 600_000;

/** Fast: short text/JSON calls — slugs, keywords, metadata, translations. */
export const FAST_TIMEOUT_MS = 120_000;

/**
 * Mirrors `slotFor(mode)` in server/llm-request.js — the deep modes are exactly the creative ones.
 * Kept as its own function because the providers receive the RESOLVED slot config
 * (`{ model, level, maxOutputTokens }`), which no longer carries the slot's name.
 */
export function timeoutForMode(mode) {
  return (mode === 'creative' || mode === 'creative-json') ? DEEP_TIMEOUT_MS : FAST_TIMEOUT_MS;
}
