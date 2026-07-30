import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'seo_gen_editor_name';

/**
 * Who is sitting at the keyboard — used to prefill the "Хто подає запит?" field of
 * the improvement-request Google Form (see src/utils/feedback-url.ts).
 *
 * Shared by the sidebar button and the HTML-editor toolbar button so the name is
 * asked once, in one place. `askEditorName` is deliberately synchronous: the
 * callers open the form with `window.open` right after it, and an `await` in
 * between would risk spending the transient user activation on a popup block.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackContextService {
  editorName = signal<string>('');

  constructor() {
    try {
      this.editorName.set(localStorage.getItem(STORAGE_KEY)?.trim() ?? '');
    } catch {
      // Private-mode localStorage can throw on read; the name is optional.
    }
  }

  /** Prompt for the name (pre-filled with the current one). Returns null if cancelled or left blank. */
  askEditorName(promptText: string): string | null {
    const answer = window.prompt(promptText, this.editorName());
    if (answer === null) return null;

    const name = answer.trim();
    if (!name) return null;

    this.editorName.set(name);
    try {
      localStorage.setItem(STORAGE_KEY, name);
    } catch {
      // Not persisting is survivable — the name still holds for this session.
    }
    return name;
  }

  /** The stored name, asking for it first if we don't have one yet. */
  ensureEditorName(promptText: string): string | null {
    return this.editorName() || this.askEditorName(promptText);
  }

  /**
   * Open the form in a new tab. Returns false when the popup was blocked, so the
   * caller can offer a plain link instead.
   *
   * The window feature string deliberately omits `noopener`: with it, window.open is
   * specified to return null even on success, which makes "was it blocked?" undecidable.
   * Nulling `opener` afterwards gives the same protection with an answerable result.
   */
  openFormTab(url: string): boolean {
    const tab = window.open(url, '_blank');
    if (!tab) return false;
    tab.opener = null;
    return true;
  }
}
