import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { type FindReplaceQuery, isValidRegex } from './find-replace-query';

export type { FindReplaceQuery };

const LABELS = {
  en: {
    findPlaceholder: 'Find',
    replacePlaceholder: 'Replace',
    replaceBtn: 'Replace',
    replaceAllBtn: 'Replace All',
    caseSensitiveTooltip: 'Match case',
    wholeWordTooltip: 'Match whole word',
    regexTooltip: 'Use regular expression',
    previousTooltip: 'Previous match',
    nextTooltip: 'Next match',
    closeTooltip: 'Close',
    noResults: 'No results',
    invalidRegex: 'Invalid regular expression',
  },
  uk: {
    findPlaceholder: 'Знайти',
    replacePlaceholder: 'Замінити',
    replaceBtn: 'Замінити',
    replaceAllBtn: 'Замінити все',
    caseSensitiveTooltip: 'Враховувати регістр',
    wholeWordTooltip: 'Тільки ціле слово',
    regexTooltip: 'Регулярний вираз',
    previousTooltip: 'Попередній збіг',
    nextTooltip: 'Наступний збіг',
    closeTooltip: 'Закрити',
    noResults: 'Немає результатів',
    invalidRegex: 'Некоректний регулярний вираз',
  },
};

/**
 * Shared Find & Replace bar for the html-editor: same UI regardless of
 * whether the active engine is CodeMirror (Source mode) or the custom
 * ProseMirror search plugin (WYSIWYG mode) — the parent decides which
 * engine `queryChange`/`next`/`previous`/`replaceOne`/`replaceAll` target.
 */
@Component({
  selector: 'app-find-replace-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './find-replace-panel.component.html',
})
export class FindReplacePanelComponent {
  lang = input<'en' | 'uk'>('uk');
  t = computed(() => LABELS[this.lang()]);

  open = input<boolean>(false);
  matchCount = input<number>(0);
  currentMatch = input<number>(0);

  queryChange = output<FindReplaceQuery>();
  next = output<void>();
  previous = output<void>();
  replaceOne = output<void>();
  replaceAll = output<void>();
  close = output<void>();

  searchText = signal<string>('');
  replaceText = signal<string>('');
  caseSensitive = signal<boolean>(false);
  wholeWord = signal<boolean>(false);
  regex = signal<boolean>(false);

  invalidRegex = computed(() => this.regex() && !isValidRegex(this.searchText()));

  private emitQueryChange() {
    if (this.invalidRegex()) return;
    this.queryChange.emit({
      search: this.searchText(),
      replace: this.replaceText(),
      caseSensitive: this.caseSensitive(),
      wholeWord: this.wholeWord(),
      regexp: this.regex(),
    });
  }

  updateSearchText(event: Event) {
    this.searchText.set((event.target as HTMLInputElement).value);
    this.emitQueryChange();
  }

  updateReplaceText(event: Event) {
    this.replaceText.set((event.target as HTMLInputElement).value);
    this.emitQueryChange();
  }

  toggleCaseSensitive() {
    this.caseSensitive.update(v => !v);
    this.emitQueryChange();
  }

  toggleWholeWord() {
    this.wholeWord.update(v => !v);
    this.emitQueryChange();
  }

  toggleRegex() {
    this.regex.update(v => !v);
    this.emitQueryChange();
  }

  onSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) this.previous.emit();
      else this.next.emit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close.emit();
    }
  }
}
