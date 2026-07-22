/**
 * search-replace-extension.spec.ts
 *
 * Headless plugin-state tests (no live EditorView, consistent with
 * round-trip.spec.ts's approach) for the custom WYSIWYG Find & Replace
 * engine. Exercises the plugin's state.apply reducer directly by dispatching
 * transactions with the same meta the addCommands() layer sets.
 *
 * RUN: npm run test
 */

import { describe, it, expect } from 'vitest';
import { getSchema } from '@tiptap/core';
import { DOMParser as PMDOMParser } from '@tiptap/pm/model';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { TIPTAP_EXTENSIONS } from './index';
import { searchReplaceKey, searchReplacePlugin, type SearchReplaceState } from './search-replace-extension';

const schema = getSchema(TIPTAP_EXTENSIONS);

function stateFromHtml(html: string): EditorState {
  const dom = new DOMParser().parseFromString(html, 'text/html');
  const doc = PMDOMParser.fromSchema(schema).parse(dom.body);
  return EditorState.create({ doc, plugins: [searchReplacePlugin()] });
}

function setQuery(
  state: EditorState,
  query: string,
  opts: Partial<{ caseSensitive: boolean; wholeWord: boolean; regexp: boolean }> = {},
): EditorState {
  const tr = state.tr;
  tr.setMeta(searchReplaceKey, {
    type: 'setQuery',
    query,
    caseSensitive: opts.caseSensitive ?? false,
    wholeWord: opts.wholeWord ?? false,
    regexp: opts.regexp ?? false,
  });
  return state.apply(tr);
}

function ps(state: EditorState): SearchReplaceState {
  return searchReplaceKey.getState(state)!;
}

function textOf(state: EditorState, m: { from: number; to: number }): string {
  return state.doc.textBetween(m.from, m.to, '', '');
}

/** Mirrors searchReplaceNext's index/selection logic, for tests that don't
 * need the full TipTap command chain. */
function next(state: EditorState): EditorState {
  const p = ps(state);
  const idx = (p.currentIndex + 1) % p.matches.length;
  const m = p.matches[idx];
  const tr = state.tr;
  tr.setMeta(searchReplaceKey, { type: 'setIndex', index: idx });
  tr.setSelection(TextSelection.create(tr.doc, m.from, m.to));
  return state.apply(tr);
}

function previous(state: EditorState): EditorState {
  const p = ps(state);
  const count = p.matches.length;
  const idx = (p.currentIndex - 1 + count) % count;
  const m = p.matches[idx];
  const tr = state.tr;
  tr.setMeta(searchReplaceKey, { type: 'setIndex', index: idx });
  tr.setSelection(TextSelection.create(tr.doc, m.from, m.to));
  return state.apply(tr);
}

function replaceAll(state: EditorState, replacement: string): EditorState {
  const p = ps(state);
  const tr = state.tr;
  const sorted = [...p.matches].sort((a, b) => b.from - a.from);
  for (const m of sorted) tr.insertText(replacement, m.from, m.to);
  tr.setMeta(searchReplaceKey, {
    type: 'setQuery',
    query: p.query,
    caseSensitive: p.caseSensitive,
    wholeWord: p.wholeWord,
    regexp: p.regexp,
  });
  return state.apply(tr);
}

describe('search-replace-extension — match scanning', () => {
  it('finds match count/positions on a multi-paragraph fixture', () => {
    const state = setQuery(stateFromHtml('<p>Hello world</p><p>Hello again</p>'), 'Hello');
    const p = ps(state);
    expect(p.matches).toHaveLength(2);
    p.matches.forEach(m => expect(textOf(state, m)).toBe('Hello'));
  });

  it('finds a match spanning a formatting boundary (при + <b>віт</b> → "привіт")', () => {
    const state = setQuery(stateFromHtml('<p>при<b>віт</b> world</p>'), 'привіт');
    const p = ps(state);
    expect(p.matches).toHaveLength(1);
    expect(textOf(state, p.matches[0])).toBe('привіт');
  });

  it('does not treat text in different paragraphs as adjacent', () => {
    const state = setQuery(stateFromHtml('<p>foo</p><p>bar</p>'), 'foobar');
    expect(ps(state).matches).toHaveLength(0);
  });

  it('case-sensitive toggle changes match count', () => {
    const insensitive = setQuery(stateFromHtml('<p>Hello hello</p>'), 'hello', { caseSensitive: false });
    expect(ps(insensitive).matches).toHaveLength(2);

    const sensitive = setQuery(stateFromHtml('<p>Hello hello</p>'), 'hello', { caseSensitive: true });
    expect(ps(sensitive).matches).toHaveLength(1);
    expect(textOf(sensitive, ps(sensitive).matches[0])).toBe('hello');
  });

  it('whole-word toggle excludes substring matches inside a longer word', () => {
    const partial = setQuery(stateFromHtml('<p>cat category</p>'), 'cat', { wholeWord: false });
    expect(ps(partial).matches).toHaveLength(2);

    const wholeWord = setQuery(stateFromHtml('<p>cat category</p>'), 'cat', { wholeWord: true });
    expect(ps(wholeWord).matches).toHaveLength(1);
  });

  it('regex toggle interprets the query as a pattern', () => {
    const state = setQuery(stateFromHtml('<p>foo1 foo2 bar3</p>'), 'foo\\d', { regexp: true });
    const p = ps(state);
    expect(p.matches).toHaveLength(2);
    expect(p.invalidRegex).toBe(false);
  });

  it('flags an invalid regex without throwing, and yields no matches', () => {
    const state = setQuery(stateFromHtml('<p>anything</p>'), '(unterminated', { regexp: true });
    const p = ps(state);
    expect(p.invalidRegex).toBe(true);
    expect(p.matches).toHaveLength(0);
  });
});

describe('search-replace-extension — navigation', () => {
  it('next/previous wrap around at document boundaries', () => {
    const base = setQuery(stateFromHtml('<p>a a a</p>'), 'a');
    expect(ps(base).currentIndex).toBe(0);

    const afterNext1 = next(base);
    expect(ps(afterNext1).currentIndex).toBe(1);
    const afterNext2 = next(afterNext1);
    expect(ps(afterNext2).currentIndex).toBe(2);
    const wrapped = next(afterNext2);
    expect(ps(wrapped).currentIndex).toBe(0);

    const wrappedBack = previous(base);
    expect(ps(wrappedBack).currentIndex).toBe(ps(base).matches.length - 1);
  });
});

describe('search-replace-extension — replace all', () => {
  it('produces exactly N replacements with no corrupted trailing text', () => {
    const state = setQuery(stateFromHtml('<p>foo bar foo baz foo</p>'), 'foo');
    expect(ps(state).matches).toHaveLength(3);

    const replaced = replaceAll(state, 'QUX');
    expect(replaced.doc.textContent).toBe('QUX bar QUX baz QUX');
    // Re-running the query against the new doc should find zero "foo"s left.
    const rescanned = setQuery(replaced, 'foo');
    expect(ps(rescanned).matches).toHaveLength(0);
  });

  it('replaces a match that spans multiple text nodes (formatting boundary) without corruption', () => {
    const state = setQuery(stateFromHtml('<p>при<b>віт</b>, світе</p>'), 'привіт');
    expect(ps(state).matches).toHaveLength(1);

    const replaced = replaceAll(state, 'бувай');
    expect(replaced.doc.textContent).toBe('бувай, світе');
  });
});

describe('search-replace-extension — remapping after unrelated edits', () => {
  it('recomputes matches after an edit elsewhere in the document', () => {
    let state = setQuery(stateFromHtml('<p>Hello world</p><p>Hello again</p>'), 'Hello');
    expect(ps(state).matches).toHaveLength(2);

    // Insert text at the very start of the doc — shifts every position downstream.
    const tr = state.tr.insertText('XYZ ', 1, 1);
    state = state.apply(tr);

    const p = ps(state);
    expect(p.matches).toHaveLength(2);
    p.matches.forEach(m => expect(textOf(state, m)).toBe('Hello'));
  });
});
