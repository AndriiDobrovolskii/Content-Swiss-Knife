import { PromptPayload, UsageMeta } from '../../prompt-core/payload';

export type { PromptPayload, UsageMeta };

export interface LlmProvider {
  generateText(payload: PromptPayload | string, useThinking?: boolean, meta?: UsageMeta): Promise<string>;
generateJson<T = any>(payload: PromptPayload | string, useThinking?: boolean, meta?: UsageMeta): Promise<T>;
  analyzeImage(base64Data: string, mimeType: string, prompt: string, useThinking?: boolean): Promise<string>;
  extractFromPdf(base64Data: string): Promise<string>;
}
