import { OpenAiProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { GeminiProvider } from './gemini.js';

export function createProvider(name) {
  switch (name.toLowerCase()) {
    case 'openai':
      return new OpenAiProvider(process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL);
    case 'anthropic':
      return new AnthropicProvider(process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_MODEL);
    case 'gemini':
      return new GeminiProvider(process.env.GEMINI_API_KEY);
    default:
      throw new Error(`Unknown LLM provider: "${name}". Set LLM_PROVIDER to openai | anthropic | gemini.`);
  }
}
