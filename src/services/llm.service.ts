import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LlmProvider, ChatMessage, ChatTool, ChatResponse } from './providers/llm-provider.interface';
import { PromptPayload } from '../prompt-core/payload';

function toPayload(input: PromptPayload | string): PromptPayload {
  if (typeof input === 'string') return { systemBlocks: [], userContent: input };
  return input;
}

@Injectable({ providedIn: 'root' })
export class LlmService implements LlmProvider {
  private http = inject(HttpClient);

  private chatMessages: ChatMessage[] = [];
  private chatSystem = '';
  private chatTools: ChatTool[] = [];

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

  async generateCreativeContent(input: PromptPayload | string): Promise<string> {
    return this.generate<string>(toPayload(input), 'creative');
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

  startChat(systemInstruction: string, tools: ChatTool[] = []) {
    this.chatMessages = [];
    this.chatSystem = systemInstruction;
    this.chatTools = tools.length > 0 ? tools : [
      { name: 'restart_generation', description: 'Restart the content generation process. Use when the user asks to regenerate or after updating inputs.' }
    ];
  }

  async sendChatMessage(message: string): Promise<ChatResponse> {
    this.chatMessages.push({ role: 'user', content: message });
    const response = await this.post<ChatResponse>('/llm/chat', {
      messages: this.chatMessages,
      systemInstruction: this.chatSystem,
      tools: this.chatTools
    });

    if (response.toolCall) {
      this.chatMessages.push({ role: 'assistant', content: response.text || '', toolCall: response.toolCall });
    } else {
      this.chatMessages.push({ role: 'assistant', content: response.text || '' });
    }

    return response;
  }

  async sendToolResponse(toolName: string, response: any): Promise<string> {
    const lastWithToolCall = [...this.chatMessages].reverse().find(m => m.role === 'assistant' && m.toolCall);
    this.chatMessages.push({
      role: 'tool',
      content: JSON.stringify(response),
      toolCallId: lastWithToolCall?.toolCall?.id || '',
      toolName
    });

    const result = await this.post<ChatResponse>('/llm/chat', {
      messages: this.chatMessages,
      systemInstruction: this.chatSystem,
      tools: this.chatTools
    });

    this.chatMessages.push({ role: 'assistant', content: result.text || '' });
    return result.text || '';
  }
}
