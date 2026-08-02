/**
 * call-log.js
 *
 * One consistent line-format for "which provider actually served this call".
 *
 * WHY THIS EXISTS. Providers became per-slot: Deep can run on Anthropic while Fast runs on
 * Gemini in the same generation. The logs did not follow. The boot line printed `LLM_PROVIDER`,
 * which since runtime settings landed is only the fallback for requests that arrive carrying no
 * settings — so a terminal showing `(provider: gemini)` while every call went to Claude was the
 * normal, expected output, and it read as "the mixed configuration is gone".
 *
 * What logging existed was ad-hoc and lived inside two of the three providers' `generate()`
 * (anthropic.js and gemini.js printed their own line; openai.js printed nothing, and the vision
 * and PDF routes printed nothing at all). From inside a provider there is no way to know the
 * task label, the slot it was picked for, how long the call took, or what it cost.
 *
 * So the formatting lives here — pure string functions, no console, no Express — and the routes
 * in server/index.js do the printing, because that is the one place where provider, slot, task
 * label, elapsed time and usage are all in scope at once. It is also the only provider-independent
 * place, which is what architecture rule #5 asks for.
 */

const PREFIX = '[LLM]';

/** Token counters are not uniformly populated. GeminiProvider writes explicit zeros, but
 *  AnthropicProvider assigns `u.cache_creation_input_tokens` straight through — the Anthropic
 *  SDK omits those fields entirely on an uncached response, so they arrive `undefined`. Without
 *  this coercion the cache clause prints `undefined/undefined` instead of being suppressed, and
 *  `toLocaleString()` throws on the way there. */
const count = (n) => Number(n ?? 0);

const num = (n) => count(n).toLocaleString('en-US');

const seconds = (ms) => `${(Number(ms ?? 0) / 1000).toFixed(1)}s`;

/** `Task A` when the caller named a task, else the route (`vision`, `pdf`, a curl call). */
const label = ({ taskLabel, route }) => taskLabel || route || 'call';

/**
 * What the call is aimed at: `anthropic/claude-sonnet-5 (medium)`.
 *
 * `slot` is null for a provider with no catalog entry — OpenAI, reachable only through
 * LLM_PROVIDER — and undefined when the failure happened before the request was resolved at
 * all. Degrade to whatever is known rather than printing `undefined/undefined`.
 */
function target(provider, slot) {
  if (!provider) return 'unresolved';
  if (!slot?.model) return provider;
  return slot.level
    ? `${provider}/${slot.model} (${slot.level})`
    : `${provider}/${slot.model}`;
}

/**
 * `[LLM] Task A · uk-UA · creative → deep: anthropic/claude-sonnet-5 (medium)`
 *
 * Most fields are genuinely optional and the formatter is built for it — `filter(Boolean)` drops
 * whatever is absent. The vision route has no `mode`, the PDF route has neither `taskLabel` nor
 * `lang`, and `provider`/`slot` are unbound when resolveRequest() threw. Annotated because
 * without it TS infers every destructured field as required from the call sites.
 *
 * @param {object}  o
 * @param {string}  o.route
 * @param {string}  o.slotName
 * @param {string}  [o.taskLabel]
 * @param {string}  [o.lang]
 * @param {string}  [o.mode]
 * @param {string}  [o.provider]
 * @param {{ model?: string, level?: string, maxOutputTokens?: number } | null} [o.slot]
 */
export function formatCallStart({ route, taskLabel, lang, mode, slotName, provider, slot }) {
  const head = [label({ taskLabel, route }), lang, mode].filter(Boolean).join(' · ');
  return `${PREFIX} ${head} → ${slotName}: ${target(provider, slot)}`;
}

/**
 * `[LLM] Task A done in 47.2s — in 8,431 (cache r/w 7,900/0) out 5,204 — $0.0912`
 *
 * @param {object}  o
 * @param {string}  o.route
 * @param {number}  o.ms
 * @param {string}  [o.taskLabel]
 * @param {{ inputTokens?: number, outputTokens?: number,
 *           cacheReadTokens?: number, cacheWriteTokens?: number }} [o.usage]
 * @param {number}  [o.costUsd] omitted when pricing has no entry for the model — the cost clause
 *                              is then suppressed rather than printed as `$NaN`.
 */
export function formatCallDone({ route, taskLabel, ms, usage = {}, costUsd }) {
  const read = count(usage.cacheReadTokens);
  const write = count(usage.cacheWriteTokens);
  // Gemini never writes a cache and reports 0/0 on every call; printing the clause each time
  // would be pure noise. Show it only when the cache actually did something.
  const cache = read || write ? ` (cache r/w ${num(read)}/${num(write)})` : '';
  const cost = typeof costUsd === 'number' ? ` — $${costUsd.toFixed(4)}` : '';

  return `${PREFIX} ${label({ taskLabel, route })} done in ${seconds(ms)}`
    + ` — in ${num(usage.inputTokens)}${cache} out ${num(usage.outputTokens)}${cost}`;
}

/**
 * `[LLM] Task A · uk-UA → deep: anthropic/claude-sonnet-5 ✗ FAILED in 30.1s — fetch failed: ECONNRESET`
 *
 * A failure is exactly where the mixed configuration most needs attribution — "the run died" is
 * useless when two providers were involved — and sendError() cannot supply it: it sees the error
 * and nothing else. It still owns the HTTP response; this only owns the log line.
 *
 * `provider` and `slot` are undefined when resolveRequest() itself threw (an unknown provider is
 * rejected before either is bound), so neither may be assumed present.
 *
 * @param {object}  o
 * @param {string}  o.route
 * @param {number}  o.ms
 * @param {string}  [o.taskLabel]
 * @param {string}  [o.lang]
 * @param {string}  [o.slotName]
 * @param {string}  [o.provider]
 * @param {{ model?: string, level?: string, maxOutputTokens?: number } | null} [o.slot]
 * @param {string}  [o.detail] falls back to 'unknown error'
 */
export function formatCallError({ route, taskLabel, lang, slotName, provider, slot, ms, detail }) {
  const head = [label({ taskLabel, route }), lang].filter(Boolean).join(' · ');
  const where = slotName ? ` → ${slotName}: ${target(provider, slot)}` : '';
  return `${PREFIX} ${head}${where} ✗ FAILED in ${seconds(ms)} — ${detail || 'unknown error'}`;
}
