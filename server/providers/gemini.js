import { GoogleGenAI } from '@google/genai';
import { withRetry } from '../utils/retry.js';

export class GeminiProvider {
  constructor(apiKey) {
    this.ai = new GoogleGenAI({ apiKey });
    this.flashModel = 'gemini-2.0-flash';
    this.thinkingModel = 'gemini-2.5-flash-preview-05-20';
  }

  async generate(prompt, mode = 'text') {
    return withRetry(async () => {
      if (mode === 'creative') {
        const response = await this.ai.models.generateContent({
          model: this.thinkingModel,
          contents: prompt,
          config: { thinkingConfig: { thinkingBudget: 8000 } }
        });
        return response.text || '';
      }

      if (mode === 'json') {
        const response = await this.ai.models.generateContent({
          model: this.flashModel,
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        const text = response.text || '{}';
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
      }

      const response = await this.ai.models.generateContent({
        model: this.flashModel,
        contents: prompt
      });
      return response.text || '';
    });
  }

  async analyzeImage(base64Data, mimeType, prompt) {
    return withRetry(async () => {
      const response = await this.ai.models.generateContent({
        model: this.flashModel,
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: prompt }
          ]
        }
      });
      return response.text?.trim() || '';
    });
  }

  async extractFromPdf(base64Data) {
    return withRetry(async () => {
      const response = await this.ai.models.generateContent({
        model: this.flashModel,
        contents: {
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: base64Data } },
            { text: 'Extract the full product description and technical specifications from document. Return them as plain text.' }
          ]
        }
      });
      return response.text || '';
    });
  }

  async chat(messages, systemInstruction, tools) {
    // Stateless Gemini chat: reconstruct history as a flat prompt
    const lines = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const fullPrompt = [systemInstruction, lines].filter(Boolean).join('\n\n');
    const text = await this.generate(fullPrompt, 'text');
    return { text };
  }
}
