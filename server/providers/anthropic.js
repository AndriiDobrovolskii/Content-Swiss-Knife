import Anthropic from '@anthropic-ai/sdk';
import { withRetry } from '../utils/retry.js';

export class AnthropicProvider {
  constructor(apiKey, model = 'claude-sonnet-4-6') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generate(prompt, mode = 'text') {
    return withRetry(async () => {
      const config = {
        model: this.model,
        max_tokens: mode === 'creative' ? 8192 : 4096,
        messages: [{ role: 'user', content: prompt }],
      };

      if (mode === 'creative') {
        config.thinking = { type: 'enabled', budget_tokens: 4000 };
      }

      const response = await this.client.messages.create(config);
      const textBlock = response.content.find(b => b.type === 'text');
      const text = textBlock?.text || '';

      if (mode === 'json') {
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
      }
      return text;
    });
  }

  async analyzeImage(base64Data, mimeType, prompt) {
    return withRetry(async () => {
      const response = await this.client.messages.create({
        model: this.model,
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
        model: this.model,
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
        model: this.model,
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
