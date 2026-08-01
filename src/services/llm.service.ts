import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LlmProvider } from './providers/llm-provider.interface';
import { PromptPayload, UsageMeta } from '../prompt-core/payload';
import { ModelSettingsService } from './model-settings.service';

function toPayload(input: PromptPayload | string): PromptPayload {
  if (typeof input === 'string') return { systemBlocks: [], userContent: input };
  return input;
}

@Injectable({ providedIn: 'root' })
export class LlmService implements LlmProvider {
  private http = inject(HttpClient);
  private settings = inject(ModelSettingsService);

  /** Every LLM call carries the current provider/model/level choice. Reading the snapshot
   *  here — rather than threading it through the orchestrator — is what keeps all 21
   *  orchestrator call sites unaware that runtime model settings exist at all. */
  private post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    return firstValueFrom(this.http.post<T>(`/api${path}`, { ...body, ...this.settings.snapshot() }));
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

  /**
   * Reports how a whole generation ended, for the failure-rate metric.
   *
   * The SERVER records usage per LLM call and cannot see the shape of a generation; only the
   * orchestrator knows whether the product came out, needed repairs, or never validated. Hence a
   * client-side report rather than server-side inference.
   *
   * FIRE-AND-FORGET BY DESIGN: telemetry must never be able to fail a generation that otherwise
   * succeeded. A rejected promise here is swallowed on purpose — but NOT silently.
   *
   * WHY IT WARNS. This used to be a bare `catch {}`. On 2026-08-01 a full four-locale EXPERT3D run
   * wrote its artifacts and left ZERO rows in generation_log, and there was no way to tell whether
   * the report was never sent or sent and rejected — an empty table looks exactly like a table
   * nobody wrote to. Since this metric is what gates widening the Doc pipeline to more stores, a
   * silently lost row is worse than a noisy one: it biases the rate without anyone knowing.
   */
  async recordGeneration(record: {
    store?: string;
    locale?: string;
    productName?: string;
    pipeline: 'doc' | 'html';
    outcome: 'ok' | 'repaired' | 'failed-schema' | 'failed-json-syntax';
    repairsUsed?: number;
  }): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/usage/generation', record));
    } catch (e) {
      // Swallowed so the generation still succeeds, but reported so a hole in the metric is
      // visible rather than indistinguishable from "no generations ran".
      console.warn(
        `[usage] generation_log row LOST for ${record.store ?? '?'}/${record.locale ?? '?'} `
        + `(${record.pipeline}, ${record.outcome}): ${e instanceof Error ? e.message : String(e)}`
      );
    }
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
