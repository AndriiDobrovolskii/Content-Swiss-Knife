import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, throwError } from 'rxjs';
import { LlmProvider } from './providers/llm-provider.interface';
import { PromptPayload, UsageMeta } from '../prompt-core/payload';
import { classifyLlmError } from './providers/llm-errors';

function toPayload(input: PromptPayload | string): PromptPayload {
  if (typeof input === 'string') return { systemBlocks: [], userContent: input };
  return input;
}

@Injectable({ providedIn: 'root' })
export class LlmService implements LlmProvider {
  private http = inject(HttpClient);

  private post<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(
      this.http.post<T>(`/api${path}`, body).pipe(
        catchError(err => throwError(() => classifyLlmError(err))),
      ),
    );
  }

  private generate<T>(payload: PromptPayload, mode: string, meta?: UsageMeta): Promise<T> {
    return this.post<{ result: T }>('/llm/generate', {
      systemBlocks: payload.systemBlocks,
      userContent: payload.userContent,
      mode,
      ...(meta ?? {}),
    }).then((r: any) => r.result);
  }

  async generateText(input: PromptPayload | string, useThinking = false, meta?: UsageMeta): Promise<string> {
    return this.generate<string>(toPayload(input), useThinking ? 'creative' : 'text', meta);
  }

  async generateJson<T = any>(input: PromptPayload | string, useThinking = false, meta?: UsageMeta): Promise<T> {
    return this.generate<T>(toPayload(input), useThinking ? 'creative-json' : 'json', meta);
  }

  async analyzeImage(base64Data: string, mimeType: string, prompt: string, useThinking = false): Promise<string> {
    const { result } = await this.post<{ result: string }>('/llm/vision', {
      base64Data,
      mimeType,
      prompt,
      useThinking
    });
    return result;
  }

  async extractFromPdf(base64Data: string): Promise<string> {
    const { result } = await this.post<{ result: string }>('/llm/pdf', { base64Data });
    return result;
  }
}
