/**
 * source-view.ts
 *
 * Framework-free helpers backing the html-editor's Source view: HTML
 * pretty-printing (js-beautify) and CodeMirror 6 state construction with a
 * VS Code light/dark theme. Kept out of html-editor.component.ts so it's
 * testable without mounting Angular or a live EditorView.
 */

import * as beautify from 'js-beautify';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine, keymap } from '@codemirror/view';
import { html } from '@codemirror/lang-html';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { vscodeLight, vscodeDark } from '@uiw/codemirror-theme-vscode';

/** Inline tags that must never be split across lines/indented — doing so
 * would insert whitespace text nodes on ProseMirror re-parse. */
const INLINE_TAGS = ['b', 'strong', 'a', 'span', 'i', 'u', 'sub', 'sup'];

export function beautifyHtml(sourceHtml: string): string {
  return beautify.html(sourceHtml, {
    indent_size: 2,
    wrap_line_length: 0,
    preserve_newlines: false,
    inline: INLINE_TAGS,
    unformatted: INLINE_TAGS,
    content_unformatted: INLINE_TAGS,
  });
}

/** Swappable at runtime via `themeCompartment.reconfigure(...)` so the
 * dark/light theme can change without recreating the whole EditorView. */
export const themeCompartment = new Compartment();

const baseSizingTheme = EditorView.theme({
  '&': { fontSize: '0.875rem', height: '100%' },
  '.cm-scroller': { fontFamily: 'ui-monospace, monospace', minHeight: '200px' },
});

export function createSourceEditorState(
  doc: string,
  dark: boolean,
  onDocChanged: (value: string) => void,
): EditorState {
  return EditorState.create({
    doc,
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      html(),
      themeCompartment.of(dark ? vscodeDark : vscodeLight),
      EditorView.lineWrapping,
      baseSizingTheme,
      EditorView.updateListener.of(update => {
        if (update.docChanged) onDocChanged(update.state.doc.toString());
      }),
    ],
  });
}
