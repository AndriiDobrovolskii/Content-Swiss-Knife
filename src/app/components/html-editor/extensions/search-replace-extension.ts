/**
 * search-replace-extension.ts
 *
 * Custom Find & Replace engine for the WYSIWYG (TipTap/ProseMirror) view —
 * TipTap has no built-in find/replace, and the one third-party package found
 * on npm for it (@sereneinserenade/tiptap-search-and-replace) was rejected:
 * stale (0.1.1, 2024), "Proprietary" license per the npm registry, and a
 * mismatched description. This is a small, in-house Extension instead.
 *
 * A plain word/phrase can be split across multiple ProseMirror text nodes
 * purely due to inline formatting — e.g. "при<b>віт</b>" is two adjacent
 * text nodes ("при", "віт") with no gap between them. Per-node scanning
 * would never find "привіт" spanning both, so this flattens the whole
 * document into one string first, matches against that, then maps each
 * string offset back to a real ProseMirror document position.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';

export interface SearchReplaceState {
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  regexp: boolean;
  matches: { from: number; to: number }[];
  currentIndex: number;
  invalidRegex: boolean;
}

const EMPTY_STATE: SearchReplaceState = {
  query: '',
  caseSensitive: false,
  wholeWord: false,
  regexp: false,
  matches: [],
  currentIndex: -1,
  invalidRegex: false,
};

type SearchReplaceMeta =
  | { type: 'setQuery'; query: string; caseSensitive: boolean; wholeWord: boolean; regexp: boolean }
  | { type: 'setIndex'; index: number };

export const searchReplaceKey = new PluginKey<SearchReplaceState>('searchReplace');

interface TextRun {
  text: string;
  docPos: number;
  flatStart: number;
}

/**
 * Flattens the document into one string for cross-node matching. A '\n'
 * separator is inserted whenever the nearest block ancestor changes between
 * two consecutive text nodes (i.e. crossing from one paragraph/heading/cell
 * into another) — but NOT between text nodes that share the same block
 * parent, so an inline-formatting split like "при" + "<b>віт</b>" (same
 * parent <p>) concatenates into "привіт" as one matchable run.
 */
function extractDocText(doc: PMNode): { flatText: string; runs: TextRun[] } {
  const runs: TextRun[] = [];
  const chunks: string[] = [];
  let flatLen = 0;
  let prevParent: PMNode | null = null;

  doc.descendants((node, pos, parent) => {
    if (!node.isText || !node.text) return true;
    if (prevParent !== null && parent !== prevParent) {
      chunks.push('\n');
      flatLen += 1;
    }
    runs.push({ text: node.text, docPos: pos, flatStart: flatLen });
    chunks.push(node.text);
    flatLen += node.text.length;
    prevParent = parent ?? null;
    return true;
  });

  return { flatText: chunks.join(''), runs };
}

/** Maps a flat-string offset back to a ProseMirror document position. */
function mapOffsetToDocPos(runs: TextRun[], offset: number): number {
  for (let i = runs.length - 1; i >= 0; i--) {
    const run = runs[i];
    if (offset >= run.flatStart) {
      const withinRun = Math.min(offset - run.flatStart, run.text.length);
      return run.docPos + withinRun;
    }
  }
  return 0;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRegExp(query: string, caseSensitive: boolean, wholeWord: boolean, regexp: boolean): RegExp | null {
  let pattern = regexp ? query : escapeRegExp(query);
  if (wholeWord) pattern = `\\b(?:${pattern})\\b`;
  try {
    return new RegExp(pattern, caseSensitive ? 'g' : 'gi');
  } catch {
    return null;
  }
}

function computeMatches(
  doc: PMNode,
  query: string,
  caseSensitive: boolean,
  wholeWord: boolean,
  regexp: boolean,
): { matches: { from: number; to: number }[]; invalidRegex: boolean } {
  if (!query) return { matches: [], invalidRegex: false };

  const re = buildRegExp(query, caseSensitive, wholeWord, regexp);
  if (!re) return { matches: [], invalidRegex: true };

  const { flatText, runs } = extractDocText(doc);
  const matches: { from: number; to: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(flatText)) !== null) {
    if (match[0].length === 0) {
      re.lastIndex += 1;
      continue;
    }
    matches.push({
      from: mapOffsetToDocPos(runs, match.index),
      to: mapOffsetToDocPos(runs, match.index + match[0].length),
    });
  }
  return { matches, invalidRegex: false };
}

/** Exported (not just used internally by SearchReplace) so tests can build
 * a raw EditorState with this plugin directly, without a live Editor/View. */
export function searchReplacePlugin(): Plugin<SearchReplaceState> {
  return new Plugin<SearchReplaceState>({
    key: searchReplaceKey,
    state: {
      init: () => EMPTY_STATE,
      apply(tr, prev, _oldState, newState) {
        const meta = tr.getMeta(searchReplaceKey) as SearchReplaceMeta | undefined;

        if (meta?.type === 'setIndex') {
          return { ...prev, currentIndex: meta.index };
        }

        if (meta?.type === 'setQuery') {
          const { matches, invalidRegex } = computeMatches(
            newState.doc,
            meta.query,
            meta.caseSensitive,
            meta.wholeWord,
            meta.regexp,
          );
          return {
            query: meta.query,
            caseSensitive: meta.caseSensitive,
            wholeWord: meta.wholeWord,
            regexp: meta.regexp,
            matches,
            invalidRegex,
            currentIndex: matches.length ? 0 : -1,
          };
        }

        if (tr.docChanged && prev.query) {
          const { matches, invalidRegex } = computeMatches(
            newState.doc,
            prev.query,
            prev.caseSensitive,
            prev.wholeWord,
            prev.regexp,
          );
          const currentIndex = matches.length
            ? Math.min(prev.currentIndex === -1 ? 0 : prev.currentIndex, matches.length - 1)
            : -1;
          return { ...prev, matches, invalidRegex, currentIndex };
        }

        return prev;
      },
    },
    props: {
      decorations(state) {
        const pluginState = searchReplaceKey.getState(state);
        if (!pluginState || pluginState.matches.length === 0) return DecorationSet.empty;
        const decorations = pluginState.matches.map((m, i) =>
          Decoration.inline(m.from, m.to, {
            class: i === pluginState.currentIndex ? 'search-match-current' : 'search-match',
          }),
        );
        return DecorationSet.create(state.doc, decorations);
      },
    },
  });
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchReplace: {
      searchReplaceSetQuery: (
        query: string,
        options?: Partial<{ caseSensitive: boolean; wholeWord: boolean; regexp: boolean }>,
      ) => ReturnType;
      searchReplaceNext: () => ReturnType;
      searchReplacePrevious: () => ReturnType;
      searchReplaceCurrent: (replacement: string) => ReturnType;
      searchReplaceAll: (replacement: string) => ReturnType;
    };
  }
}

export const SearchReplace = Extension.create({
  name: 'searchReplace',

  addProseMirrorPlugins() {
    return [searchReplacePlugin()];
  },

  addCommands() {
    return {
      searchReplaceSetQuery:
        (query, options) =>
        ({ tr, dispatch }) => {
          tr.setMeta(searchReplaceKey, {
            type: 'setQuery',
            query,
            caseSensitive: options?.caseSensitive ?? false,
            wholeWord: options?.wholeWord ?? false,
            regexp: options?.regexp ?? false,
          });
          if (dispatch) dispatch(tr);
          return true;
        },

      searchReplaceNext:
        () =>
        ({ state, tr, dispatch }) => {
          const pluginState = searchReplaceKey.getState(state);
          if (!pluginState || pluginState.matches.length === 0) return false;
          const nextIndex = (pluginState.currentIndex + 1) % pluginState.matches.length;
          const match = pluginState.matches[nextIndex];
          tr.setMeta(searchReplaceKey, { type: 'setIndex', index: nextIndex });
          tr.setSelection(TextSelection.create(tr.doc, match.from, match.to));
          tr.scrollIntoView();
          if (dispatch) dispatch(tr);
          return true;
        },

      searchReplacePrevious:
        () =>
        ({ state, tr, dispatch }) => {
          const pluginState = searchReplaceKey.getState(state);
          if (!pluginState || pluginState.matches.length === 0) return false;
          const count = pluginState.matches.length;
          const prevIndex = (pluginState.currentIndex - 1 + count) % count;
          const match = pluginState.matches[prevIndex];
          tr.setMeta(searchReplaceKey, { type: 'setIndex', index: prevIndex });
          tr.setSelection(TextSelection.create(tr.doc, match.from, match.to));
          tr.scrollIntoView();
          if (dispatch) dispatch(tr);
          return true;
        },

      searchReplaceCurrent:
        replacement =>
        ({ state, tr, dispatch }) => {
          const pluginState = searchReplaceKey.getState(state);
          if (!pluginState || pluginState.currentIndex < 0 || pluginState.matches.length === 0) return false;
          const match = pluginState.matches[pluginState.currentIndex];
          tr.insertText(replacement, match.from, match.to);
          tr.setMeta(searchReplaceKey, {
            type: 'setQuery',
            query: pluginState.query,
            caseSensitive: pluginState.caseSensitive,
            wholeWord: pluginState.wholeWord,
            regexp: pluginState.regexp,
          });
          if (dispatch) dispatch(tr);
          return true;
        },

      searchReplaceAll:
        replacement =>
        ({ state, tr, dispatch }) => {
          const pluginState = searchReplaceKey.getState(state);
          if (!pluginState || pluginState.matches.length === 0) return false;
          // Last-to-first: earlier positions in this same transaction are
          // never invalidated by a later edit, so no tr.mapping bookkeeping
          // is needed.
          const sorted = [...pluginState.matches].sort((a, b) => b.from - a.from);
          for (const m of sorted) {
            tr.insertText(replacement, m.from, m.to);
          }
          tr.setMeta(searchReplaceKey, {
            type: 'setQuery',
            query: pluginState.query,
            caseSensitive: pluginState.caseSensitive,
            wholeWord: pluginState.wholeWord,
            regexp: pluginState.regexp,
          });
          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },
});
