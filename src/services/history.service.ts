import { Injectable, signal, effect } from '@angular/core';
import { GeneratedContent, ProductInput, HistoryItem } from '../app/types';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  history = signal<HistoryItem[]>([]);

  constructor() {
    const saved = localStorage.getItem('seo_gen_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.history.set(parsed);
        }
      } catch (e) {
        console.error('Failed to load history', e);
        // If parsing fails, reset storage to avoid persistent errors
        localStorage.removeItem('seo_gen_history');
      }
    }

    effect(() => {
      localStorage.setItem('seo_gen_history', JSON.stringify(this.history()));
    });
  }

  add(input: ProductInput, output: GeneratedContent) {
    const item: HistoryItem = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      input,
      output
    };
    this.history.update(h => [item, ...h]);
  }

  clear() {
    // Explicitly set the signal to an empty array
    this.history.set([]);
    // Force clean the storage immediately to ensure sync state
    localStorage.removeItem('seo_gen_history');
  }

  delete(id: string) {
    this.history.update(h => h.filter(x => x.id !== id));
  }
}