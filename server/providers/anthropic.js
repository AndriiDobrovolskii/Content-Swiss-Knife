import Anthropic from '@anthropic-ai/sdk';
import { withRetry } from '../utils/retry.js';

export class AnthropicProvider {
  constructor(apiKey, opts = {}) {
    this.client = new Anthropic({ apiKey });
    this.thinkingModel = opts.thinkingModel || process.env.ANTHROPIC_MODEL_THINKING || 'claude-sonnet-4-6';
    this.fastModel     = opts.fastModel     || process.env.ANTHROPIC_MODEL_FAST     || 'claude-haiku-4-5';
  }

  // Deep Thinking ON → mode 'creative' → Sonnet. OFF (text/json) → Haiku.
  #modelFor(mode) { return mode === 'creative' ? this.thinkingModel : this.fastModel; }

  // Turn our blocks into a cacheable Anthropic system array.
  #toSystem(blocks = []) {
    return blocks
      .filter(b => b && b.text)
      .map(b => ({ type: 'text', text: b.text, ...(b.cache ? { cache_control: { type: 'ephemeral' } } : {}) }));
  }

  async generate(payload, mode = 'text') {
    // Back-compat: accept a plain string too.
    const { systemBlocks = [], userContent = '' } =
      typeof payload === 'string' ? { systemBlocks: [], userContent: payload } : payload;

    return withRetry(async () => {
      const config = {
        model: this.#modelFor(mode),
        max_tokens: mode === 'creative' ? 32000 : 16000,
        system: this.#toSystem(systemBlocks),
        messages: [{ role: 'user', content: userContent }],
      };
      if (mode === 'creative') config.thinking = { type: 'enabled', budget_tokens: 6000 };

      const hasCacheBlocks = systemBlocks.some(b => b?.cache);
      const stream = hasCacheBlocks
        ? this.client.beta.messages.stream({ betas: ['prompt-caching-2024-07-31'], ...config })
        : this.client.messages.stream(config);
      const response = await stream.finalMessage();

      const u = response.usage || {};
      console.log('[anthropic]', config.model, mode,
        { in: u.input_tokens, out: u.output_tokens, cw: u.cache_creation_input_tokens, cr: u.cache_read_input_tokens });

      const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
      if (mode === 'json') return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
      return text;
    });
  }

  async analyzeImage(base64Data, mimeType, prompt) {
    return withRetry(async () => {
      const response = await this.client.messages.create({
        model: this.fastModel,
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } },
            { type: 'text', text: prompt }
          ]
        }]
      });
      return response.content.find(b => b.type === 'text')?.text || '';
    });
  }

  async extractFromPdf(base64Data) {
    return withRetry(async () => {
      const response = await this.client.messages.create({
        model: this.fastModel,
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64Data }
            },
            {
              type: 'text',
              text: 'Extract the full product description and technical specifications from this document. Return them as plain text.'
            }
          ]
        }]
      });
      return response.content.find(b => b.type === 'text')?.text || '';
    });
  }

  async chat(messages, systemInstruction, tools) {
    return withRetry(async () => {
      const anthropicMessages = [];

      for (const msg of messages) {
        if (msg.role === 'tool') {
          anthropicMessages.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: msg.toolCallId || 'unknown',
              content: msg.content
            }]
          });
        } else if (msg.role === 'assistant' && msg.toolCall) {
          const parts = [];
          if (msg.content) parts.push({ type: 'text', text: msg.content });
          parts.push({ type: 'tool_use', id: msg.toolCall.id, name: msg.toolCall.name, input: {} });
          anthropicMessages.push({ role: 'assistant', content: parts });
        } else if (msg.role === 'user' || msg.role === 'assistant') {
          anthropicMessages.push({ role: msg.role, content: msg.content });
        }
      }

      const config = {
        model: this.thinkingModel,
        max_tokens: 2048,
        messages: anthropicMessages,
      };

      if (systemInstruction) config.system = systemInstruction;

      if (tools && tools.length > 0) {
        config.tools = tools.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: { type: 'object', properties: {} }
        }));
      }

      const response = await this.client.messages.create(config);
      const toolUse = response.content.find(b => b.type === 'tool_use');
      const textBlock = response.content.find(b => b.type === 'text');

      if (toolUse) {
        return {
          text: textBlock?.text || '',
          toolCall: { name: toolUse.name, id: toolUse.id }
        };
      }

      return { text: textBlock?.text || '' };
    });
  }
}
