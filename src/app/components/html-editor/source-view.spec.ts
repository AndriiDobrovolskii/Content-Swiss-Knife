import { describe, it, expect } from 'vitest';
import { beautifyHtml, createSourceEditorState } from './source-view';

describe('beautifyHtml', () => {
  it('indents nested figure/table blocks with 2-space indentation', () => {
    const input =
      '<div><figure><img src="a.jpg" alt="A"><figcaption>Cap</figcaption></figure>' +
      '<table><tr><th>H</th></tr><tr><td>D</td></tr></table></div>';
    const out = beautifyHtml(input);

    expect(out).toContain('\n');
    const lines = out.split('\n');
    const figureLine = lines.findIndex(l => l.trim().startsWith('<figure'));
    const imgLine = lines.findIndex(l => l.trim().startsWith('<img'));
    expect(figureLine).toBeGreaterThan(-1);
    expect(imgLine).toBeGreaterThan(figureLine);
    // img is nested one level deeper than figure
    const indentOf = (l: string) => l.length - l.trimStart().length;
    expect(indentOf(lines[imgLine])).toBeGreaterThan(indentOf(lines[figureLine]));
  });

  it('does not insert whitespace inside inline runs (b/strong/a/span)', () => {
    const input = '<p>text <b>bold word</b> more <a href="#">link text</a> end</p>';
    const out = beautifyHtml(input);
    expect(out).toContain('<b>bold word</b>');
    expect(out).toContain('<a href="#">link text</a>');
  });

  it('is idempotent on already-beautified input', () => {
    const input = '<p>Hello</p>';
    const once = beautifyHtml(input);
    const twice = beautifyHtml(once);
    expect(twice).toBe(once);
  });
});

describe('createSourceEditorState', () => {
  it('builds an EditorState from HTML without throwing, for both themes', () => {
    const onChange = () => {};
    const lightState = createSourceEditorState('<p>Hi</p>', false, onChange);
    const darkState = createSourceEditorState('<p>Hi</p>', true, onChange);
    expect(lightState.doc.toString()).toBe('<p>Hi</p>');
    expect(darkState.doc.toString()).toBe('<p>Hi</p>');
  });
});
