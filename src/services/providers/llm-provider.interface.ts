import { PromptPayload } from '../../prompt-core/payload';

export type { PromptPayload };

export interface LlmProvider {
  generateText(payload: PromptPayload | string, useThinking?: boolean): Promise<string>;
generateJson<T = any>(payload: PromptPayload | string, useThinking?: boolean): Promise<T>;
  analyzeImage(base64Data: string, mimeType: string, prompt: string, useThinking?: boolean): Promise<string>;
  extractFromPdf(base64Data: string): Promise<string>;
}
