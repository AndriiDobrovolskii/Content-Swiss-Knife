import { PromptPayload, UsageMeta } from '../../prompt-core/payload';
import type { ImageHttpResult } from '../image-studio/http-abort';

export type { PromptPayload, UsageMeta };

export interface LlmProvider {
  generateText(payload: PromptPayload | string, useThinking?: boolean, meta?: UsageMeta): Promise<string>;
  generateJson<T = any>(payload: PromptPayload | string, useThinking?: boolean, meta?: UsageMeta): Promise<T>;
  analyzeImage(base64Data: string, mimeType: string, prompt: string, useThinking?: boolean): Promise<string>;
  extractFromPdf(base64Data: string): Promise<string>;
  /** One non-retrying image generation call (US-10.1 FR-85); failures are returned, never thrown. */
  generateImage(request: Record<string, unknown>, signal?: AbortSignal): Promise<ImageHttpResult>;
  /** Uploads one image to the Files API through the BFF; transient transport failures are retried. */
  uploadImageFile(request: Record<string, unknown>, signal?: AbortSignal): Promise<ImageHttpResult>;
}
