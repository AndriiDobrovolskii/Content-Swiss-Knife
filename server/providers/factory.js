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
