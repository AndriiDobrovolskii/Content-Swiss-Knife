import { Component, ElementRef, HostListener, NgZone, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Editor } from '@tiptap/core';
import { EditorView } from '@codemirror/view';
import { SearchQuery, setSearchQuery, findNext, findPrevious, replaceNext, replaceAll as cmReplaceAll } from '@codemirror/search';
import { TIPTAP_EXTENSIONS } from './extensions';
import { reconstructTableThead } from './extensions/table-thead';
import { searchReplaceKey } from './extensions/search-replace-extension';
import { stripTiptapArtifacts, sanitizeUntrustedHtml } from '../../../utils/html-cleaner';
import { wrapImageFigures } from '../../../utils/image-figure';
import { ensureRel0 } from '../../../utils/video-url';
import { validateStructuralParity } from '../../../utils/structural-parity';
import type { ValidationIssue } from '../../../utils/output-validator';
import { beautifyHtml, createSourceEditorState, getSearchMatchInfo, themeCompartment } from './source-view';
import { vscodeLight, vscodeDark } from '@uiw/codemirror-theme-vscode';
import { FindReplacePanelComponent } from './find-replace-panel.component';
import type { FindReplaceQuery } from './find-replace-query';
import { FeedbackContextService } from '../../../services/feedback-context.service';
import { buildFeedbackUrl } from '../../../utils/feedback-url';
import { environment } from '../../../environments/environment';

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
    linkUrlPlaceholder: 'https://…',
    apply: 'Apply',
    remove: 'Remove',
    cancel: 'Cancel',
    imageSrc: 'Image URL',
    imageAlt: 'Alt text',
    imageCaption: 'Caption',
    insert: 'Insert',
    mediaUrl: 'YouTube / Vimeo URL',
    mediaCaption: 'Caption',
    undoTooltip: 'Undo',
    redoTooltip: 'Redo',
    paragraphTooltip: 'Paragraph',
    heading2Tooltip: 'Heading 2',
    heading3Tooltip: 'Heading 3',
    heading4Tooltip: 'Heading 4',
    boldTooltip: 'Bold',
    italicTooltip: 'Italic',
    underlineTooltip: 'Underline',
    strikeTooltip: 'Strikethrough',
    subscriptTooltip: 'Subscript',
    superscriptTooltip: 'Superscript',
    highlightTooltip: 'Highlight',
    alignLeftTooltip: 'Align left',
    alignCenterTooltip: 'Align center',
    alignRightTooltip: 'Align right',
    alignJustifyTooltip: 'Justify',
    linkTooltip: 'Insert link',
    blockquoteTooltip: 'Blockquote',
    hrTooltip: 'Horizontal rule',
    bulletListTooltip: 'Bullet list',
    orderedListTooltip: 'Numbered list',
    imageTooltip: 'Insert image',
    mediaTooltip: 'Embed video',
    insertTableTooltip: 'Insert table',
    addRowAboveTooltip: 'Add row above',
    addRowBelowTooltip: 'Add row below',
    deleteRowTooltip: 'Delete row',
    addColumnLeftTooltip: 'Add column left',
    addColumnRightTooltip: 'Add column right',
    deleteColumnTooltip: 'Delete column',
    deleteTableTooltip: 'Delete table',
    sourceModeTooltip: 'Source code',
    fullscreenTooltip: 'Fullscreen',
    exitFullscreenTooltip: 'Exit fullscreen',
    findReplaceTooltip: 'Find and replace (Ctrl+F)',
    feedbackTooltip: 'Suggest an improvement — the current HTML is copied to the clipboard for the "before" field',
    feedbackCopied: 'HTML copied — paste it into the "before" field',
    feedbackNamePrompt: 'Your name (goes into the request so we know who to ask back):',
    feedbackPopupBlocked: 'The browser blocked the new tab. Open the form:',
    feedbackOpenForm: 'Open the form',
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
    linkUrlPlaceholder: 'https://…',
    apply: 'Застосувати',
    remove: 'Прибрати',
    cancel: 'Скасувати',
    imageSrc: 'URL зображення',
    imageAlt: 'Alt-текст',
    imageCaption: 'Підпис',
    insert: 'Вставити',
    mediaUrl: 'URL YouTube / Vimeo',
    mediaCaption: 'Підпис',
    undoTooltip: 'Скасувати',
    redoTooltip: 'Повторити',
    paragraphTooltip: 'Абзац',
    heading2Tooltip: 'Заголовок 2',
    heading3Tooltip: 'Заголовок 3',
    heading4Tooltip: 'Заголовок 4',
    boldTooltip: 'Жирний',
    italicTooltip: 'Курсив',
    underlineTooltip: 'Підкреслений',
    strikeTooltip: 'Закреслений',
    subscriptTooltip: 'Нижній індекс',
    superscriptTooltip: 'Верхній індекс',
    highlightTooltip: 'Виділення кольором',
    alignLeftTooltip: 'Вирівняти ліворуч',
    alignCenterTooltip: 'Вирівняти по центру',
    alignRightTooltip: 'Вирівняти праворуч',
    alignJustifyTooltip: 'Вирівняти по ширині',
    linkTooltip: 'Вставити посилання',
    blockquoteTooltip: 'Цитата',
    hrTooltip: 'Горизонтальна лінія',
    bulletListTooltip: 'Маркований список',
    orderedListTooltip: 'Нумерований список',
    imageTooltip: 'Вставити зображення',
    mediaTooltip: 'Вставити відео',
    insertTableTooltip: 'Вставити таблицю',
    addRowAboveTooltip: 'Додати рядок вище',
    addRowBelowTooltip: 'Додати рядок нижче',
    deleteRowTooltip: 'Видалити рядок',
    addColumnLeftTooltip: 'Додати стовпець ліворуч',
    addColumnRightTooltip: 'Додати стовпець праворуч',
    deleteColumnTooltip: 'Видалити стовпець',
    deleteTableTooltip: 'Видалити таблицю',
    sourceModeTooltip: 'Вихідний код',
    fullscreenTooltip: 'На весь екран',
    exitFullscreenTooltip: 'Вийти з повноекранного режиму',
    findReplaceTooltip: 'Знайти і замінити (Ctrl+F)',
    feedbackTooltip: 'Запропонувати покращення — поточний HTML скопіюється в буфер для поля «ДО»',
    feedbackCopied: 'HTML скопійовано — вставте його в поле «ДО»',
    feedbackNamePrompt: 'Ваше ім’я (потрапить у запит, щоб було зрозуміло, в кого перепитати):',
    feedbackPopupBlocked: 'Браузер заблокував нову вкладку. Відкрити форму:',
    feedbackOpenForm: 'Відкрити форму',
  },
};

interface ToolbarState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  subscript: boolean;
  superscript: boolean;
  highlightColor: string | null;
  align: 'left' | 'center' | 'right' | 'justify';
  headingLevel: 0 | 1 | 2 | 3 | 4;
  bulletList: boolean;
  orderedList: boolean;
  blockquote: boolean;
  link: boolean;
  inTable: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

const EMPTY_TOOLBAR_STATE: ToolbarState = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  subscript: false,
  superscript: false,
  highlightColor: null,
  align: 'left',
  headingLevel: 0,
  bulletList: false,
  orderedList: false,
  blockquote: false,
  link: false,
  inTable: false,
  canUndo: false,
  canRedo: false,
};

const HIGHLIGHT_COLORS = ['#fef08a', '#bbf7d0', '#fbcfe8', '#bfdbfe'];

@Component({
  selector: 'app-html-editor',
  standalone: true,
  imports: [CommonModule, FindReplacePanelComponent],
  templateUrl: './html-editor.component.html',
})
export class HtmlEditorComponent {
  private feedback = inject(FeedbackContextService);

  lang = input<'en' | 'uk'>('uk');
  t = computed(() => LABELS[this.lang()]);

  pastedHtml = signal<string>('');
  originalHtml = signal<string>('');
  loaded = signal<boolean>(false);
  issues = signal<ValidationIssue[]>([]);
  showIssues = signal<boolean>(false);
  copiedFlash = signal<boolean>(false);

  feedbackCopiedFlash = signal<boolean>(false);
  feedbackPopupBlocked = signal<boolean>(false);
  // null until the form is configured in src/environments/ — the button stays hidden.
  feedbackUrl = computed(() => buildFeedbackUrl(environment.feedbackForm, {
    author: this.feedback.editorName(),
    tool: 'HTML-редактор',
  }));

  sourceMode = signal<boolean>(false);
  fullscreen = signal<boolean>(false);

  findReplaceOpen = signal<boolean>(false);
  findReplaceMatchCount = signal<number>(0);
  findReplaceCurrentMatch = signal<number>(0);
  private lastFindReplaceQuery: FindReplaceQuery | null = null;

  toolbarState = signal<ToolbarState>(EMPTY_TOOLBAR_STATE);
  highlightColors = HIGHLIGHT_COLORS;

  imageForm = signal<{ src: string; alt: string; figcaption: string } | null>(null);
  mediaForm = signal<{ url: string; figcaption: string } | null>(null);
  linkPopover = signal<{ url: string } | null>(null);

  // Exposed so app.component.ts can guard mode-switches against silently
  // discarding an in-progress edit (this component owns all its own state).
  hasUnsavedChanges = computed(() => this.loaded());

  // Template-ref locator — the host div is conditionally rendered behind
  // `@if (!sourceMode())`. TipTap attaches to it imperatively; HTML is read
  // lazily at copy time instead of mirroring getHTML() into a signal on
  // every keystroke — getHTML() re-serializes the whole document model and
  // doing that per keystroke visibly stalls typing on large documents.
  editorHost = viewChild<ElementRef<HTMLDivElement>>('editorHost');
  sourceHost = viewChild<ElementRef<HTMLDivElement>>('sourceHost');

  private editor?: Editor;
  private cmView?: EditorView;
  private pendingContent = '';

  // Deliberately a plain field, not a signal — mirrors `pendingContent`. It is
  // written on every CodeMirror doc change, and a signal here would make the
  // Source-view lifecycle effect below re-run (and so tear the editor down and
  // rebuild it) on every keystroke. Nothing renders it, so there is nothing to
  // be reactive for. Read it through currentSourceHtml().
  private sourceHtml = '';

  // Tailwind's dark mode is class-based on <html>, toggled by app.component.ts
  // with no shared service — a MutationObserver is the simplest way for this
  // component to react to it without adding a new @Input every future caller
  // of <app-html-editor> would have to remember to pass.
  private darkMode = signal<boolean>(document.documentElement.classList.contains('dark'));

  constructor(private ngZone: NgZone) {
    const observer = new MutationObserver(() => {
      this.ngZone.run(() => {
        this.darkMode.set(document.documentElement.classList.contains('dark'));
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // Source-view lifecycle. Only these three signals decide whether a
    // CodeMirror view should exist; everything the view is *built from* is read
    // inside untracked() so it can never become a dependency. Without that, the
    // per-keystroke write to the doc re-runs this effect, onCleanup destroys the
    // view, and the body rebuilds it — which is exactly how typing in Source
    // mode used to lose focus and the caret after every single character.
    effect(onCleanup => {
      const host = this.sourceHost();
      const loaded = this.loaded();
      const sourceMode = this.sourceMode();

      if (!host || !loaded || !sourceMode) return;

      untracked(() => {
        this.cmView = new EditorView({
          state: createSourceEditorState(
            this.sourceHtml,
            this.darkMode(),
            value => { this.sourceHtml = value; },
            () => this.refreshCodeMirrorMatchInfo(),
          ),
          parent: host.nativeElement,
        });
        if (this.lastFindReplaceQuery) this.dispatchCodeMirrorQuery(this.lastFindReplaceQuery);
      });

      // Fires both when sourceMode/loaded flip back to false and on component
      // destroy, so this effect solely owns the view's teardown.
      onCleanup(() => {
        this.cmView?.destroy();
        this.cmView = undefined;
      });
    });

    // Swap the CodeMirror theme in place on dark-mode changes, without
    // recreating the whole EditorView.
    effect(() => {
      const dark = this.darkMode();
      this.cmView?.dispatch({ effects: themeCompartment.reconfigure(dark ? vscodeDark : vscodeLight) });
    });

    effect(onCleanup => {
      onCleanup(() => observer.disconnect());
    });
  }

  private readonly _editorLifecycle = effect(() => {
    const host = this.editorHost();
    const loaded = this.loaded();
    const sourceMode = this.sourceMode();

    if (!loaded || sourceMode) {
      if (this.editor) {
        this.editor.destroy();
        this.editor = undefined;
      }
      return;
    }
    if (!host || this.editor) return;

    this.editor = new Editor({
      element: host.nativeElement,
      extensions: TIPTAP_EXTENSIONS,
      content: this.pendingContent,
      onTransaction: () => {
        this.refreshToolbarState();
        this.refreshWysiwygMatchInfo();
      },
      onSelectionUpdate: () => this.refreshToolbarState(),
    });
    if (this.lastFindReplaceQuery) this.dispatchWysiwygQuery(this.lastFindReplaceQuery);
    this.refreshToolbarState();
  });

  ngOnDestroy() {
    // Only the TipTap editor — its lifecycle effect has no onCleanup. The
    // CodeMirror view is destroyed by its effect's onCleanup; destroying it
    // here too would double-destroy the same view.
    this.editor?.destroy();
  }

  /** The live CodeMirror document, which is the authority while Source mode is
   * open; the mirrored field is the fallback for when no view exists. */
  private currentSourceHtml(): string {
    return this.cmView?.state.doc.toString() ?? this.sourceHtml;
  }

  private refreshToolbarState() {
    const e = this.editor;
    if (!e) return;

    const headingLevel = ([1, 2, 3, 4] as const).find(level => e.isActive('heading', { level })) ?? 0;
    const align = (['center', 'right', 'justify'] as const).find(a => e.isActive({ textAlign: a })) ?? 'left';

    const next: ToolbarState = {
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      subscript: e.isActive('subscript'),
      superscript: e.isActive('superscript'),
      highlightColor: (e.getAttributes('highlight')['color'] as string | undefined) ?? null,
      align,
      headingLevel,
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      blockquote: e.isActive('blockquote'),
      link: e.isActive('link'),
      inTable: e.isActive('table') || e.isActive('tableCell') || e.isActive('tableHeader'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    };

    const prev = this.toolbarState();
    const changed = (Object.keys(next) as (keyof ToolbarState)[]).some(key => next[key] !== prev[key]);
    if (changed) this.toolbarState.set(next);
  }

  updatePastedHtml(event: Event) {
    this.pastedHtml.set((event.target as HTMLTextAreaElement).value);
  }

  load() {
    const html = this.pastedHtml().trim();
    if (!html) return;
    const sanitized = sanitizeUntrustedHtml(html);
    this.originalHtml.set(sanitized);
    this.pendingContent = sanitized;
    this.issues.set([]);
    this.showIssues.set(false);
    this.sourceMode.set(false);
    this.loaded.set(true);
  }

  reset() {
    this.pastedHtml.set('');
    this.originalHtml.set('');
    this.issues.set([]);
    this.showIssues.set(false);
    this.sourceMode.set(false);
    this.loaded.set(false);
  }

  copy() {
    const html = this.buildCopyHtml();
    const found = validateStructuralParity(this.originalHtml(), html, 'HTML Editor');
    if (found.length) {
      this.issues.set(found);
      this.showIssues.set(true);
      return;
    }
    this.doCopy(html);
  }

  copyAnyway() {
    this.doCopy(this.buildCopyHtml());
  }

  private buildCopyHtml(): string {
    const raw = this.sourceMode() ? this.currentSourceHtml() : (this.editor?.getHTML() ?? '');
    const stripped = stripTiptapArtifacts(raw);
    const tableFixed = reconstructTableThead(stripped);
    const figuresFixed = wrapImageFigures(tableFixed);
    return sanitizeUntrustedHtml(figuresFixed);
  }

  private doCopy(html: string) {
    navigator.clipboard.writeText(html);
    this.showIssues.set(false);
    this.copiedFlash.set(true);
    setTimeout(() => this.copiedFlash.set(false), 1500);
  }

  // --- Improvement-request form ---

  /**
   * Put the current HTML on the clipboard for the form's "before" field, then open
   * the form. The name is asked synchronously, before any await, so window.open still
   * runs inside the click's user activation; the clipboard write is awaited because
   * Firefox/Safari reject it once a new tab takes the focus away.
   */
  async copyAndOpenFeedback() {
    if (!this.feedback.ensureEditorName(this.t().feedbackNamePrompt)) return;

    const url = this.feedbackUrl();
    if (!url) return;

    if (this.loaded()) {
      // Beautified, not raw: a minified blob is unreadable in a spreadsheet cell.
      await navigator.clipboard.writeText(beautifyHtml(this.buildCopyHtml()));
      this.feedbackCopiedFlash.set(true);
      setTimeout(() => this.feedbackCopiedFlash.set(false), 4000);
    }

    this.feedbackPopupBlocked.set(!this.feedback.openFormTab(url));
  }

  // --- Source mode ---

  toggleSourceMode() {
    if (this.sourceMode()) {
      // Read before flipping the signal — that flip tears the view down.
      this.pendingContent = this.currentSourceHtml();
      this.sourceMode.set(false);
    } else {
      // Seeds the doc the lifecycle effect builds the view from, below.
      this.sourceHtml = beautifyHtml(this.buildCopyHtml());
      this.sourceMode.set(true);
    }
  }

  // --- Find & Replace ---
  // One shared panel/UI; the active engine depends on sourceMode() — the
  // CodeMirror instance in Source mode, or the custom ProseMirror
  // searchReplace plugin (extensions/search-replace-extension.ts) in the
  // normal WYSIWYG view.

  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent) {
    if (!this.loaded()) return;
    const mod = event.ctrlKey || event.metaKey;
    if (mod && (event.key === 'f' || event.key === 'h')) {
      event.preventDefault();
      this.openFindReplace();
    } else if (event.key === 'Escape' && this.findReplaceOpen()) {
      this.closeFindReplace();
    }
  }

  openFindReplace() {
    this.findReplaceOpen.set(true);
  }

  closeFindReplace() {
    this.findReplaceOpen.set(false);
  }

  onFindReplaceQueryChange(query: FindReplaceQuery) {
    this.lastFindReplaceQuery = query;
    if (this.sourceMode()) this.dispatchCodeMirrorQuery(query);
    else this.dispatchWysiwygQuery(query);
  }

  private dispatchCodeMirrorQuery(query: FindReplaceQuery) {
    if (!this.cmView) return;
    const searchQuery = new SearchQuery({
      search: query.search,
      replace: query.replace,
      caseSensitive: query.caseSensitive,
      wholeWord: query.wholeWord,
      regexp: query.regexp,
    });
    this.cmView.dispatch({ effects: setSearchQuery.of(searchQuery) });
    this.refreshCodeMirrorMatchInfo();
  }

  private refreshCodeMirrorMatchInfo() {
    if (!this.cmView) return;
    const { count, current } = getSearchMatchInfo(this.cmView);
    this.findReplaceMatchCount.set(count);
    this.findReplaceCurrentMatch.set(current);
  }

  private dispatchWysiwygQuery(query: FindReplaceQuery) {
    if (!this.editor) return;
    this.editor.commands.searchReplaceSetQuery(query.search, {
      caseSensitive: query.caseSensitive,
      wholeWord: query.wholeWord,
      regexp: query.regexp,
    });
    this.refreshWysiwygMatchInfo();
  }

  private refreshWysiwygMatchInfo() {
    if (!this.editor || this.sourceMode()) return;
    const state = searchReplaceKey.getState(this.editor.state);
    this.findReplaceMatchCount.set(state?.matches.length ?? 0);
    this.findReplaceCurrentMatch.set(state && state.currentIndex >= 0 ? state.currentIndex + 1 : 0);
  }

  onFindNext() {
    if (this.sourceMode()) {
      if (!this.cmView) return;
      findNext(this.cmView);
      this.refreshCodeMirrorMatchInfo();
    } else {
      this.editor?.commands.searchReplaceNext();
      this.refreshWysiwygMatchInfo();
    }
  }

  onFindPrevious() {
    if (this.sourceMode()) {
      if (!this.cmView) return;
      findPrevious(this.cmView);
      this.refreshCodeMirrorMatchInfo();
    } else {
      this.editor?.commands.searchReplacePrevious();
      this.refreshWysiwygMatchInfo();
    }
  }

  onReplaceOne() {
    if (this.sourceMode()) {
      if (!this.cmView) return;
      replaceNext(this.cmView);
      this.refreshCodeMirrorMatchInfo();
    } else {
      this.editor?.commands.searchReplaceCurrent(this.lastFindReplaceQuery?.replace ?? '');
      this.refreshWysiwygMatchInfo();
    }
  }

  onReplaceAll() {
    if (this.sourceMode()) {
      if (!this.cmView) return;
      cmReplaceAll(this.cmView);
      this.refreshCodeMirrorMatchInfo();
    } else {
      this.editor?.commands.searchReplaceAll(this.lastFindReplaceQuery?.replace ?? '');
      this.refreshWysiwygMatchInfo();
    }
  }

  // --- Fullscreen ---

  toggleFullscreen() {
    this.fullscreen.update(v => !v);
  }

  // --- Formatting commands ---

  toggleBold() { this.editor?.chain().focus().toggleBold().run(); }
  toggleItalic() { this.editor?.chain().focus().toggleItalic().run(); }
  toggleUnderline() { this.editor?.chain().focus().toggleUnderline().run(); }
  toggleStrike() { this.editor?.chain().focus().toggleStrike().run(); }
  toggleSubscript() { this.editor?.chain().focus().toggleSubscript().run(); }
  toggleSuperscript() { this.editor?.chain().focus().toggleSuperscript().run(); }

  toggleHighlight(color: string) {
    if (this.toolbarState().highlightColor === color) {
      this.editor?.chain().focus().unsetHighlight().run();
    } else {
      this.editor?.chain().focus().toggleHighlight({ color }).run();
    }
  }

  setAlign(align: 'left' | 'center' | 'right' | 'justify') {
    this.editor?.chain().focus().setTextAlign(align).run();
  }

  setHeading(level: 0 | 2 | 3 | 4) {
    if (level === 0) this.editor?.chain().focus().setParagraph().run();
    else this.editor?.chain().focus().toggleHeading({ level }).run();
  }

  toggleBulletList() { this.editor?.chain().focus().toggleBulletList().run(); }
  toggleOrderedList() { this.editor?.chain().focus().toggleOrderedList().run(); }
  toggleBlockquote() { this.editor?.chain().focus().toggleBlockquote().run(); }
  insertHorizontalRule() { this.editor?.chain().focus().setHorizontalRule().run(); }
  undo() { this.editor?.chain().focus().undo().run(); }
  redo() { this.editor?.chain().focus().redo().run(); }

  // --- Link mini-popover ---

  openLinkPopover() {
    const existing = this.editor?.getAttributes('link')['href'] as string | undefined;
    this.linkPopover.set({ url: existing ?? '' });
  }

  updateLinkUrl(event: Event) {
    this.linkPopover.set({ url: (event.target as HTMLInputElement).value });
  }

  applyLink() {
    const popover = this.linkPopover();
    if (!popover) return;
    const url = popover.url.trim();
    if (url) {
      this.editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    } else {
      this.editor?.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    this.linkPopover.set(null);
  }

  removeLink() {
    this.editor?.chain().focus().extendMarkRange('link').unsetLink().run();
    this.linkPopover.set(null);
  }

  closeLinkPopover() {
    this.linkPopover.set(null);
  }

  // --- Insert image ---

  openImageForm() {
    this.imageForm.set({ src: '', alt: '', figcaption: '' });
  }

  updateImageForm(patch: Partial<{ src: string; alt: string; figcaption: string }>) {
    const current = this.imageForm();
    if (current) this.imageForm.set({ ...current, ...patch });
  }

  confirmInsertImage() {
    const form = this.imageForm();
    if (!form || !form.src.trim()) {
      this.imageForm.set(null);
      return;
    }
    const hasExistingImage = (this.editor?.getHTML() ?? '').includes('<img');
    const figureContent: Record<string, unknown>[] = [
      {
        type: 'figureImg',
        attrs: {
          src: form.src.trim(),
          alt: form.alt.trim() || null,
          loading: hasExistingImage ? 'lazy' : null,
        },
      },
    ];
    if (form.figcaption.trim()) {
      figureContent.push({
        type: 'figcaption',
        content: [{ type: 'text', text: form.figcaption.trim() }],
      });
    }
    this.editor?.chain().focus().insertContent({ type: 'imageFigure', content: figureContent }).run();
    this.imageForm.set(null);
  }

  cancelInsertImage() {
    this.imageForm.set(null);
  }

  // --- Insert media (video embed) ---

  openMediaForm() {
    this.mediaForm.set({ url: '', figcaption: '' });
  }

  updateMediaForm(patch: Partial<{ url: string; figcaption: string }>) {
    const current = this.mediaForm();
    if (current) this.mediaForm.set({ ...current, ...patch });
  }

  confirmInsertMedia() {
    const form = this.mediaForm();
    if (!form || !form.url.trim()) {
      this.mediaForm.set(null);
      return;
    }
    this.editor
      ?.chain()
      .focus()
      .insertContent({
        type: 'videoEmbedFigure',
        attrs: { src: ensureRel0(form.url.trim()), figcaption: form.figcaption.trim() },
      })
      .run();
    this.mediaForm.set(null);
  }

  cancelInsertMedia() {
    this.mediaForm.set(null);
  }

  // --- Table ---

  insertTable() {
    this.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  addRowBefore() { this.editor?.chain().focus().addRowBefore().run(); }
  addRowAfter() { this.editor?.chain().focus().addRowAfter().run(); }
  deleteRow() { this.editor?.chain().focus().deleteRow().run(); }
  addColumnBefore() { this.editor?.chain().focus().addColumnBefore().run(); }
  addColumnAfter() { this.editor?.chain().focus().addColumnAfter().run(); }
  deleteColumn() { this.editor?.chain().focus().deleteColumn().run(); }
  deleteTable() { this.editor?.chain().focus().deleteTable().run(); }
}
