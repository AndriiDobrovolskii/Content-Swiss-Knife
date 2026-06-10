import OpenAI from 'openai';
import { pdfToText } from '../utils/pdf.js';
import { withRetry } from '../utils/retry.js';

export class OpenAiProvider {
  constructor(apiKey, model = 'gpt-4o') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generate(payload, mode = 'text') {
    return withRetry(async () => {
      const { systemBlocks = [], userContent = '' } =
        typeof payload === 'string' ? { systemBlocks: [], userContent: payload } : payload;
      const system = systemBlocks.map(b => b.text).join('\n\n');
      const openaiMessages = [];
      if (system) openaiMessages.push({ role: 'system', content: system });
      openaiMessages.push({ role: 'user', content: userContent });
      const config = {
        model: this.model,
        messages: openaiMessages,
      };

      if (mode === 'json') {
        config.response_format = { type: 'json_object' };
        config.temperature = 0.15;
      } else if (mode === 'creative') {
        config.temperature = 0.8;
        config.max_tokens = 16384;
      } else {
        config.temperature = 0.4;
        config.max_tokens = 8192;
      }

      const response = await this.client.chat.completions.create(config);
      const text = response.choices[0].message.content || '';

      if (mode === 'json') {
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
      }
      return text;
    });
  }

  async analyzeImage(base64Data, mimeType, prompt) {
    return withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            { type: 'text', text: prompt }
          ]
        }],
        max_tokens: 300,
      });
      return response.choices[0].message.content || '';
    });
  }

  async extractFromPdf(base64Data) {
    // OpenAI doesn't natively support PDFs — extract text via pdf-parse then refine with LLM
    const rawText = await pdfToText(base64Data);
    return withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{
          role: 'user',
          content: `Extract the full product description and technical specifications from the following PDF text. Return them as clean plain text.\n\n${rawText.substring(0, 12000)}`
        }],
        max_tokens: 4096,
      });
      return response.choices[0].message.content || rawText;
    });
  }

  async chat(messages, systemInstruction, tools) {
    return withRetry(async () => {
      const openaiMessages = [];

      if (systemInstruction) {
        openaiMessages.push({ role: 'system', content: systemInstruction });
      }

      for (const msg of messages) {
        if (msg.role === 'tool') {
          openaiMessages.push({
            role: 'tool',
            tool_call_id: msg.toolCallId || 'unknown',
            content: msg.content
          });
        } else if (msg.role === 'assistant' && msg.toolCall) {
          openaiMessages.push({
            role: 'assistant',
            content: msg.content || null,
            tool_calls: [{
              id: msg.toolCall.id,
              type: 'function',
              function: { name: msg.toolCall.name, arguments: '{}' }
            }]
          });
        } else if (msg.role === 'user' || msg.role === 'assistant') {
          openaiMessages.push({ role: msg.role, content: msg.content });
        }
      }

      const config = {
        model: this.model,
        messages: openaiMessages,
        temperature: 0.7,
      };

      if (tools && tools.length > 0) {
        config.tools = tools.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: { type: 'object', properties: {} }
          }
        }));
        config.tool_choice = 'auto';
      }

      const response = await this.client.chat.completions.create(config);
      const choice = response.choices[0];

      if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length > 0) {
        const toolCall = choice.message.tool_calls[0];
        return {
          text: choice.message.content || '',
          toolCall: { name: toolCall.function.name, id: toolCall.id }
        };
      }

      return { text: choice.message.content || '' };
    });
  }
}
