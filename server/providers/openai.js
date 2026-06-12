import OpenAI from 'openai';
import { pdfToText } from '../utils/pdf.js';
import { withRetry } from '../utils/retry.js';

export class OpenAiProvider {
  constructor(apiKey, model = 'gpt-4o') {
    this._apiKey = apiKey;
    this._client = null;
    this.model = model;
  }

  get client() {
    if (!this._client) this._client = new OpenAI({ apiKey: this._apiKey });
    return this._client;
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
}
