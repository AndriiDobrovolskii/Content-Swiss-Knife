import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LlmProvider } from './providers/llm-provider.interface';
import { PromptPayload } from '../prompt-core/payload';

function toPayload(input: PromptPayload | string): PromptPayload {
  if (typeof input === 'string') return { systemBlocks: [], userContent: input };
  return input;
}

@Injectable({ providedIn: 'root' })
export class LlmService implements LlmProvider {
  private http = inject(HttpClient);

  private post<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(`/api${path}`, body));
  }

  private generate<T>(payload: PromptPayload, mode: string): Promise<T> {
    return this.post<{ result: T }>('/llm/generate', {
      systemBlocks: payload.systemBlocks,
      userContent: payload.userContent,
      mode,
    }).then((r: any) => r.result);
  }

  async generateText(input: PromptPayload | string, useThinking = false): Promise<string> {
    return this.generate<string>(toPayload(input), useThinking ? 'creative' : 'text');
  }

  async generateJson<T = any>(input: PromptPayload | string, useThinking = false): Promise<T> {
    return this.generate<T>(toPayload(input), useThinking ? 'creative-json' : 'json');
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
