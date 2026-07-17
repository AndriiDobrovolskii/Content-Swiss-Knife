import { Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import {
  ClassicEditor, Essentials, Paragraph, Heading, Bold, Italic, Link,
  List, Table, TableToolbar, GeneralHtmlSupport, SourceEditing
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import { stripCkeditorArtifacts } from '../../../utils/html-cleaner';
import { validateStructuralParity } from '../../../utils/structural-parity';
import type { ValidationIssue } from '../../../utils/output-validator';

const LABELS = {
  en: {
    title: 'HTML Editor',
    subtitle: 'Paste generated HTML, edit the text, copy it back out.',
    pasteLabel: 'Paste HTML',
    pastePlaceholder: 'Paste the full generated HTML here…',
    loadBtn: 'Load into editor',
    copyBtn: 'Copy HTML',
    copyAnywayBtn: 'Copy anyway',
    reloadBtn: 'Start over',
    issuesTitle: 'Structure changed since load:',
    copied: 'Copied!',
  },
  uk: {
    title: 'HTML-редактор',
    subtitle: 'Вставте згенерований HTML, відредагуйте текст, скопіюйте назад.',
    pasteLabel: 'Вставити HTML',
    pastePlaceholder: 'Вставте сюди повний згенерований HTML…',
    loadBtn: 'Завантажити в редактор',
    copyBtn: 'Копіювати HTML',
    copyAnywayBtn: 'Копіювати попри це',
    reloadBtn: 'Почати заново',
    issuesTitle: 'Структура змінилась з моменту завантаження:',
    copied: 'Скопійовано!',
  },
};

@Component({
  selector: 'app-html-editor',
  standalone: true,
  imports: [CommonModule, CKEditorModule],
  templateUrl: './html-editor.component.html',
})
export class HtmlEditorComponent {
  lang = input<'en' | 'uk'>('uk');
  t = computed(() => LABELS[this.lang()]);

  pastedHtml = signal<string>('');
  originalHtml = signal<string>('');
  loaded = signal<boolean>(false);
  currentData = signal<string>('');
  issues = signal<ValidationIssue[]>([]);
  showIssues = signal<boolean>(false);
  copiedFlash = signal<boolean>(false);

  // Exposed so app.component.ts can guard mode-switches against silently
  // discarding an in-progress edit (this component owns all its own state).
  hasUnsavedChanges = computed(() => this.loaded());

  Editor = ClassicEditor;

  // NOTE: htmlSupport.allow is intentionally maximal (allow everything not owned by
  // another loaded feature). This is the upper bound validated in the prototype.
  // Narrow it later only if a specific unwanted tag/attribute is observed leaking
  // through from a paste — do not narrow speculatively.
  config = {
    licenseKey: 'GPL',
    plugins: [
      Essentials, Paragraph, Heading, Bold, Italic, Link,
      List, Table, TableToolbar, GeneralHtmlSupport, SourceEditing,
    ],
    toolbar: [
      'undo', 'redo', '|', 'heading', '|', 'bold', 'italic', 'link', '|',
      'bulletedList', 'numberedList', '|', 'insertTable', '|', 'sourceEditing',
    ],
    htmlSupport: {
      allow: [{ name: /.*/, attributes: true, classes: true, styles: true }],
    },
  };

  updatePastedHtml(event: Event) {
    this.pastedHtml.set((event.target as HTMLTextAreaElement).value);
  }

  load() {
    const html = this.pastedHtml().trim();
    if (!html) return;
    this.originalHtml.set(html);
    this.currentData.set(html);
    this.issues.set([]);
    this.showIssues.set(false);
    this.loaded.set(true);
  }

  reset() {
    this.pastedHtml.set('');
    this.originalHtml.set('');
    this.currentData.set('');
    this.issues.set([]);
    this.showIssues.set(false);
    this.loaded.set(false);
  }

  // `event` typed `any`: @ckeditor/ckeditor5-angular's ChangeEvent export name has moved
  // across major versions. Tighten to the exact type once the pinned 9.x API is confirmed
  // locally (`npm ls @ckeditor/ckeditor5-angular` + its .d.ts) — do not guess it here.
  onChange(event: any) {
    this.currentData.set(event.editor.getData());
  }

  copy() {
    const cleaned = stripCkeditorArtifacts(this.currentData());
    // validateStructuralParity() is documented as a uk-UA-master vs. translation check;
    // it's reused here purely for its structural-isomorphism mechanics (element counts +
    // media src identity) to diff the original paste against the CKEditor-edited output.
    const found = validateStructuralParity(this.originalHtml(), cleaned, 'HTML Editor');
    if (found.length) {
      this.issues.set(found);
      this.showIssues.set(true);
      return;
    }
    this.doCopy(cleaned);
  }

  copyAnyway() {
    this.doCopy(stripCkeditorArtifacts(this.currentData()));
  }

  private doCopy(html: string) {
    navigator.clipboard.writeText(html);
    this.showIssues.set(false);
    this.copiedFlash.set(true);
    setTimeout(() => this.copiedFlash.set(false), 1500);
  }
}
