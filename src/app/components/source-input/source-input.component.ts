import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentOrchestratorService } from '../../../services/content-orchestrator.service';

type Mode = 'text' | 'pdf' | 'url' | 'md';

@Component({
  selector: 'app-source-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './source-input.component.html',
})
export class SourceInputComponent {
  // Two-way value via explicit value/valueChange (works cleanly with parent signals).
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  @Input() label = '';
  @Input() placeholder = '';
  @Input() accent: 'blue' | 'teal' = 'blue';
  @Input() required = false;
  @Input() textHeight = 'h-32';                 // tailwind height class for the textarea
  @Input() labels: Record<string, string> = {}; // pass uiLabels() from parent for i18n

  private orchestrator = inject(ContentOrchestratorService);

  mode = signal<Mode>('text');
  busy = signal(false);

  // Accent-derived literal class strings (Tailwind CDN, so no purge concerns).
  get ringClass() { return this.accent === 'teal' ? 'focus:ring-teal-500' : 'focus:ring-blue-500'; }
  get linkClass() { return this.accent === 'teal' ? 'text-teal-600 dark:text-teal-400' : 'text-blue-600 dark:text-blue-400'; }
  get fetchBtnClass() {
    return this.accent === 'teal'
      ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 hover:bg-teal-200 dark:hover:bg-teal-900/50'
      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50';
  }

  setMode(mode: Mode) { this.mode.set(mode); }

  setText(v: string) {
    this.value = v;
    this.valueChange.emit(v);
  }

  onTextInput(event: Event) {
    this.setText((event.target as HTMLTextAreaElement).value);
  }

  async fetchFromUrl(url: string) {
    if (!url) return;
    this.busy.set(true);
    try {
      const text = await this.orchestrator.extractContent('url', url);
      this.setText(text);
      this.mode.set('text');                      // show extracted text
    } catch {
      alert('Failed to fetch from URL');
    } finally {
      this.busy.set(false);
    }
  }

  async onPdfUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.busy.set(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const text = await this.orchestrator.extractContent('pdf', base64);
        this.setText(text);
        this.mode.set('text');
      } catch {
        alert('Failed to process PDF');
      } finally {
        input.value = '';
        this.busy.set(false);
      }
    };
    reader.readAsDataURL(file);
  }

  // Markdown: read one or many .md files locally, concatenate, no network.
  async onMarkdownUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (!files.length) return;
    this.busy.set(true);
    try {
      const texts = await Promise.all(files.map(f => f.text()));
      const combined = files.length > 1
        ? texts.map((t, i) => `<!-- ${files[i].name} -->\n${t.trim()}`).join('\n\n---\n\n')
        : texts[0].trim();
      this.setText(combined);
      this.mode.set('text');
    } catch {
      alert('Failed to read Markdown file(s)');
    } finally {
      input.value = '';
      this.busy.set(false);
    }
  }
}
