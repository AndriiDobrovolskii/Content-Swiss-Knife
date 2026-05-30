import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RetrievalProvider, SearchResult } from './retrieval/retrieval-provider.interface';

@Injectable({ providedIn: 'root' })
export class RetrievalService implements RetrievalProvider {
  private http = inject(HttpClient);

  async fetchUrl(url: string): Promise<string> {
    const { content } = await firstValueFrom(
      this.http.post<{ content: string }>('/api/retrieval/url', { url })
    );
    return content;
  }

  async searchWeb(query: string, num = 5): Promise<SearchResult[]> {
    const { organic } = await firstValueFrom(
      this.http.post<{ organic: SearchResult[] }>('/api/retrieval/search', { query, num })
    );
    return organic ?? [];
  }
}
