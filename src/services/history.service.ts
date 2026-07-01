import { Injectable, signal, effect } from '@angular/core';
import { GeneratedContent, ProductInput, HistoryItem } from '../app/types';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly MAX_HISTORY_ITEMS = 20;

  history = signal<HistoryItem[]>([]);

  constructor() {
    const saved = localStorage.getItem('seo_gen_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.history.set(parsed.slice(0, this.MAX_HISTORY_ITEMS));
        }
      } catch (e) {
        console.error('Failed to load history', e);
        localStorage.removeItem('seo_gen_history');
      }
    }

    effect(() => {
      const items = this.history();
      try {
        localStorage.setItem('seo_gen_history', JSON.stringify(items));
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          const trimmed = items.slice(0, Math.ceil(items.length / 2));
          this.history.set(trimmed);
        }
      }
    });
  }

  add(input: ProductInput, output: GeneratedContent) {
    const item: HistoryItem = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      input,
      output
    };
    this.history.update(h => [item, ...h].slice(0, this.MAX_HISTORY_ITEMS));
  }

  clear() {
    this.history.set([]);
    localStorage.removeItem('seo_gen_history');
  }

  delete(id: string) {
    this.history.update(h => h.filter(x => x.id !== id));
  }
}
