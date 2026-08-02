import { OpenAiProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { GeminiProvider } from './gemini.js';

// Providers are stateless w.r.t. model choice — the model and thinking level arrive with
// each request — so one instance per provider is reused for the process lifetime. This is
// what makes switching providers from the UI free: no SDK client is rebuilt per call.
const cache = new Map();

export function createProvider(name) {
  switch (name.toLowerCase()) {
    case 'openai':
      return new OpenAiProvider(process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL);
    case 'anthropic':
      return new AnthropicProvider(process.env.ANTHROPIC_API_KEY);
    case 'gemini':
      return new GeminiProvider(process.env.GEMINI_API_KEY);
    default:
      throw new Error(`Unknown LLM provider: "${name}". Set LLM_PROVIDER to openai | anthropic | gemini.`);
  }
}

export function resolveProvider(name) {
  const key = String(name).toLowerCase();
  if (!cache.has(key)) cache.set(key, createProvider(key));
  return cache.get(key);
}

/** Which env var holds each provider's key. The only place that mapping is written down. */
const KEY_ENV = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

/**
 * Construct every keyed provider up front and report what happened, one entry per provider.
 *
 * WHY EAGER. Since providers became per-slot, a run can touch two of them, and lazily building
 * a client on first use means a missing or malformed key surfaces mid-generation — after Task A
 * has already been paid for — as a 500 from whichever route happened to need it first. Building
 * at boot turns that into a line in the startup log.
 *
 * Never throws. A provider without a key is a fact to report, not a reason to refuse to serve
 * the ones that do work: an Anthropic-only setup is a legitimate configuration, and the OpenAI
 * key is expected to be absent in most of them.
 */
export function warmProviders() {
  return Object.entries(KEY_ENV).map(([id, envVar]) => {
    const hasKey = Boolean(process.env[envVar]);
    if (!hasKey) return { id, envVar, hasKey: false, ready: false, error: null };
    try {
      resolveProvider(id);
      return { id, envVar, hasKey: true, ready: true, error: null };
    } catch (error) {
      return { id, envVar, hasKey: true, ready: false, error: error.message };
    }
  });
}
