import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface UsageRecord {
  id: number;
  ts: number;
  provider: string;
  model: string;
  mode: string | null;
  taskLabel: string | null;
  productName: string | null;
  store: string | null;
  lang: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  costUsd: number;
}

export interface UsageFilters {
  from?: number;
  to?: number;
  store?: string;
  taskLabel?: string;
  productName?: string;
}

@Injectable({ providedIn: 'root' })
export class UsageService {
  private http = inject(HttpClient);

  async fetch(filters: UsageFilters = {}): Promise<UsageRecord[]> {
    const params: Record<string, string> = {};
    if (filters.from != null) params['from'] = String(filters.from);
    if (filters.to != null) params['to'] = String(filters.to);
    if (filters.store) params['store'] = filters.store;
    if (filters.taskLabel) params['taskLabel'] = filters.taskLabel;
    if (filters.productName) params['productName'] = filters.productName;

    const { rows } = await firstValueFrom(
      this.http.get<{ rows: UsageRecord[] }>('/api/usage', { params })
    );
    return rows;
  }
}
