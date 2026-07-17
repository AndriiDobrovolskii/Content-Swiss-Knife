import { Component, computed, input, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CKEditorComponent, CKEditorModule } from '@ckeditor/ckeditor5-angular';
import {
  ClassicEditor, Essentials, Paragraph, Heading, Bold, Italic, Underline,
  Strikethrough, Subscript, Superscript, Highlight, Alignment, Link,
  BlockQuote, HorizontalLine, List, Image, ImageInsert, MediaEmbed,
  Table, TableToolbar, GeneralHtmlSupport, SourceEditing, Fullscreen
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
  issues = signal<ValidationIssue[]>([]);
  showIssues = signal<boolean>(false);
  copiedFlash = signal<boolean>(false);

  // Exposed so app.component.ts can guard mode-switches against silently
  // discarding an in-progress edit (this component owns all its own state).
  hasUnsavedChanges = computed(() => this.loaded());

  // Template-ref locator (not type-based) — <ckeditor> is conditionally
  // rendered behind `@if (loaded())`. Data is read lazily from here at copy
  // time instead of mirroring getData() into a signal on every keystroke —
  // getData() re-serializes the whole document model to HTML and doing that
  // per keystroke visibly stalls typing on large pasted documents.
  ckeditorRef = viewChild<CKEditorComponent<ClassicEditor>>('ckeditorRef');

  Editor = ClassicEditor;

  // NOTE: htmlSupport.allow is intentionally maximal (allow everything not owned by
  // another loaded feature). This is the upper bound validated in the prototype.
  // Narrow it later only if a specific unwanted tag/attribute is observed leaking
  // through from a paste — do not narrow speculatively.
  config = {
    licenseKey: 'GPL',
    plugins: [
      Essentials, Paragraph, Heading, Bold, Italic, Underline, Strikethrough,
      Subscript, Superscript, Highlight, Alignment, Link, BlockQuote,
      HorizontalLine, List, Image, ImageInsert, MediaEmbed, Table,
      TableToolbar, GeneralHtmlSupport, SourceEditing, Fullscreen,
    ],
    toolbar: [
      'undo', 'redo', '|',
      'heading', '|',
      'bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', '|',
      'highlight', 'alignment', '|',
      'link', 'blockQuote', 'horizontalLine', '|',
      'bulletedList', 'numberedList', '|',
      'insertImage', 'mediaEmbed', 'insertTable', '|',
      'sourceEditing', 'fullscreen',
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
    this.issues.set([]);
    this.showIssues.set(false);
    this.loaded.set(true);
  }

  reset() {
    this.pastedHtml.set('');
    this.originalHtml.set('');
    this.issues.set([]);
    this.showIssues.set(false);
    this.loaded.set(false);
  }

  copy() {
    const cleaned = stripCkeditorArtifacts(this.ckeditorRef()?.editorInstance?.getData() ?? '');
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
    this.doCopy(stripCkeditorArtifacts(this.ckeditorRef()?.editorInstance?.getData() ?? ''));
  }

  private doCopy(html: string) {
    navigator.clipboard.writeText(html);
    this.showIssues.set(false);
    this.copiedFlash.set(true);
    setTimeout(() => this.copiedFlash.set(false), 1500);
  }
}
