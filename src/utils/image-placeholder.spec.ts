/**
 * image-placeholder.spec.ts - US-5.1 T9: the shared marker grammar, matcher and figure builder (v9).
 *
 * Rewritten for Specification v9: the figure's label, description and alt are the three native-Ukrainian
 * Vision texts of the manifest entry (FR-4, FR-21, A-14, A-16); the English strings, the "Image:" label
 * and the legacy `altText` / `visionDescription` sources are gone.
 *
 * CONTRACT PINNED HERE (names from plan D4; shapes chosen by TEST_WRITING, see the test strategy):
 *   - `PLACEHOLDER_RE`, `extractPlaceholders(text)`, `matchManifest(file, manifest)`: unchanged from v5
 *   - `buildFigureParts(entry, { cyrillicCheck })` -> { file, alt, captionText }; `captionText` is the whole
 *     Figure.caption string, `<b>{label}</b> {description}`, HTML-escaped; pure, deterministic, never throws
 *   - `figureCaptionWarnings(figures)` takes the buildFigureParts results in document order and returns the
 *     warnings of FR-21 (rules `image-caption-not-native` and `image-caption-duplicate-label`, severity
 *     'warning', Ukrainian detail naming the file); a pure function of the list
 *   - `IMAGE_CAPTION_LABEL` no longer exists
 *
 * Written BEFORE the builder is reworked: every case below that exercises the Ukrainian fields fails until
 * T9. Cases that restate unchanged v5 behaviour (grammar, matcher) are green on arrival by design.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PLACEHOLDER_RE, extractPlaceholders, matchManifest, buildFigureParts, figureCaptionWarnings,
} from './image-placeholder';
import * as placeholderModule from './image-placeholder';
import {
  entry, legacyEntry, LAMP, LAMP_ALT, LAMP_VISION, LAMP_LABEL_UK, LAMP_DESC_UK, LAMP_ALT_UK, FALLBACK_LABEL,
  stripTags, collapse, hasCyrillic,
} from '../../test/fixtures/image-placeholder/fixtures';

const ON = { cyrillicCheck: true } as const;
const OFF = { cyrillicCheck: false } as const;
const ENGLISH_STRINGS = /Image:|Product image|\bView\b/;

describe('PLACEHOLDER_RE / extractPlaceholders - FR-1 (AC-1), FR-10 (AC-6)', () => {
  it('is a global, case-sensitive expression (OD-9, OD-17)', () => {
    expect(PLACEHOLDER_RE.flags).toContain('g');
    expect(PLACEHOLDER_RE.flags).not.toContain('i');
  });

  it.each([
    ['[image-name.jpg]', 'image-name.jpg'],
    ['[image-name.webp]', 'image-name.webp'],
    ['[a1.jpg]', 'a1.jpg'],
    ['[photo-2024-03.webp]', 'photo-2024-03.webp'],
    // OD-9 grammar is `[a-z0-9\-]+`; Assumption A-2 records that doubled / edge hyphens are accepted.
    ['[a--b.jpg]', 'a--b.jpg'],
    ['[-a.jpg]', '-a.jpg'],
  ])('identifies %s as an image placeholder', (marker, file) => {
    expect(extractPlaceholders(`Before ${marker} after.`)).toEqual([file]);
  });

  it.each([
    '[Image.jpg]',        // uppercase: case-sensitive (OD-17)
    '[IMAGE-NAME.JPG]',
    '[image-name.JPG]',
    '[my image.jpg]',     // space
    '[a_b.jpg]',          // underscore is outside the grammar
    '[a.png]',            // extension outside {jpg, webp}
    '[a.jpeg]',
    '[a.jpg.jpg]',
    '[.jpg]',             // no name
    '[note]',             // AC-6 examples
    '[1]',
    '[see figure 3]',
    '[image-name.jpg',    // unclosed
    'image-name.jpg]',
  ])('does not treat %s as a placeholder', text => {
    expect(extractPlaceholders(`Before ${text} after.`)).toEqual([]);
  });

  it('returns every marker in order of appearance and keeps duplicates', () => {
    expect(extractPlaceholders('A [a.jpg] b [b.webp] c [a.jpg] d [note]')).toEqual(['a.jpg', 'b.webp', 'a.jpg']);
  });

  it('finds markers inside surrounding inline markup', () => {
    expect(extractPlaceholders('<b>Bold [a.jpg]</b> and <strong>[b.webp]</strong>')).toEqual(['a.jpg', 'b.webp']);
  });

  it('is not poisoned by regex statefulness between calls', () => {
    expect(extractPlaceholders('[a.jpg]')).toEqual(['a.jpg']);
    expect(extractPlaceholders('[a.jpg]')).toEqual(['a.jpg']);
  });
});

describe('matchManifest - FR-2', () => {
  it('matches a file name equal to an entry originalFilename', () => {
    expect(matchManifest('desk-lamp.jpg', [LAMP])).toBe(LAMP);
  });

  it('returns undefined when no entry has that originalFilename', () => {
    expect(matchManifest('missing.jpg', [LAMP])).toBeUndefined();
  });

  it('returns undefined for an empty or absent manifest', () => {
    expect(matchManifest('desk-lamp.jpg', [])).toBeUndefined();
    expect(matchManifest('desk-lamp.jpg', undefined)).toBeUndefined();
  });

  it('does not count an entry whose status is error (OD-8)', () => {
    expect(matchManifest('desk-lamp.jpg', [entry({ status: 'error' })])).toBeUndefined();
  });

  it('does not count an entry whose status is pending (A-5)', () => {
    expect(matchManifest('desk-lamp.jpg', [entry({ status: 'pending' })])).toBeUndefined();
  });

  it('does not count an entry with no usable urlFilename (A-12)', () => {
    expect(matchManifest('desk-lamp.jpg', [entry({ urlFilename: '' })])).toBeUndefined();
  });

  it('matches a .webp marker by originalFilename although the output file ends .jpg (A-5)', () => {
    const webp = entry({ originalFilename: 'desk-lamp.webp', urlFilename: 'desk-lamp.jpg' });
    expect(matchManifest('desk-lamp.webp', [webp])).toBe(webp);
    // The output name is NOT the lookup key.
    expect(matchManifest('desk-lamp.jpg', [webp])).toBeUndefined();
  });

  it('lets the first uploaded entry win when several share an originalFilename (A-5)', () => {
    const first = entry({ id: 'a', urlFilename: 'dup-1.jpg', order: 0 });
    const second = entry({ id: 'b', urlFilename: 'dup-2.jpg', order: 1 });
    expect(matchManifest('desk-lamp.jpg', [first, second])).toBe(first);
  });

  it('skips an unusable duplicate and matches the next usable one', () => {
    const broken = entry({ id: 'a', status: 'error', order: 0 });
    const good = entry({ id: 'b', urlFilename: 'dup-2.jpg', order: 1 });
    expect(matchManifest('desk-lamp.jpg', [broken, good])).toBe(good);
  });
});

describe('the English caption label is gone - FR-4, NFR-11, A-14 (H-7)', () => {
  it('no longer exports IMAGE_CAPTION_LABEL', () => {
    expect('IMAGE_CAPTION_LABEL' in placeholderModule).toBe(false);
  });
});

describe('buildFigureParts - the happy path (FR-4, FR-21, AC-9 h)', () => {
  it('uses the urlFilename as the figure file', () => {
    const webp = entry({ originalFilename: 'desk-lamp.webp', urlFilename: 'desk-lamp.jpg' });
    expect(buildFigureParts(webp, ON).file).toBe('desk-lamp.jpg');
  });

  it('takes alt from the recorded Ukrainian alt (A-16), not from the legacy altText', () => {
    const parts = buildFigureParts(LAMP, ON);
    expect(parts.alt).toBe(LAMP_ALT_UK);
    expect(parts.alt).not.toBe(LAMP_ALT);
  });

  it('builds the caption as <b>label</b> description from the recorded Ukrainian texts', () => {
    expect(buildFigureParts(LAMP, ON).captionText).toBe(`<b>${LAMP_LABEL_UK}</b> ${LAMP_DESC_UK}`);
  });

  it('never shows the English caption (visionDescription) or the legacy altText in a marker figure (A-16)', () => {
    const parts = buildFigureParts(LAMP, ON);
    expect(parts.captionText).not.toContain(LAMP_VISION);
    expect(parts.alt).not.toContain(LAMP_ALT);
    expect(parts.captionText + parts.alt).not.toMatch(ENGLISH_STRINGS);
  });

  it('every one of label, description and alt contains a Cyrillic letter (AC-9 h)', () => {
    const parts = buildFigureParts(LAMP, ON);
    expect(hasCyrillic(parts.alt)).toBe(true);
    expect(hasCyrillic(stripTags(parts.captionText))).toBe(true);
    const label = /<b>([^<]*)<\/b>/.exec(parts.captionText)![1];
    expect(hasCyrillic(label)).toBe(true);
    expect(hasCyrillic(parts.captionText.replace(/<b>[^<]*<\/b>/, ''))).toBe(true);
  });

  it('produces no warning for a fully native entry', () => {
    expect(figureCaptionWarnings([buildFigureParts(LAMP, ON)])).toEqual([]);
  });

  it('is deterministic: the same entry gives the same parts', () => {
    expect(buildFigureParts(LAMP, ON)).toEqual(buildFigureParts(LAMP, ON));
  });
});

describe('buildFigureParts - label rule (FR-21 rule 1)', () => {
  const labelOf = (label: string): string =>
    /<b>([^<]*)<\/b>/.exec(buildFigureParts(entry({ visionLabelUk: label }), ON).captionText)![1];

  it('trims the recorded label and keeps exactly one trailing colon', () => {
    expect(labelOf('  Результат роботи зеленого лазера:  ')).toBe('Результат роботи зеленого лазера:');
  });

  it('appends a colon when the recorded label has none', () => {
    expect(labelOf('Результат роботи зеленого лазера')).toBe('Результат роботи зеленого лазера:');
  });

  it.each([
    ['Результат::', 'Результат:'],
    ['Результат:::', 'Результат:'],
    ['Результат: :', 'Результат:'],
    ['Результат :  : ', 'Результат:'],
  ])('collapses a trailing colon run in %j to one colon', (raw, expected) => {
    expect(labelOf(raw)).toBe(expected);
  });

  it.each(['Зображення:', 'Зображення', 'ЗОБРАЖЕННЯ:', 'зображення :', 'Зображення товару:', 'зображення товару', 'Image:', 'Product image:'])(
    'treats the generic label %j as non-native: the fallback label is used and one image-caption-not-native warning is raised',
    generic => {
      const parts = buildFigureParts(entry({ visionLabelUk: generic }), ON);
      expect(parts.captionText.startsWith(`<b>${FALLBACK_LABEL}</b>`)).toBe(true);
      const warnings = figureCaptionWarnings([parts]);
      expect(warnings.map(w => w.rule)).toEqual(['image-caption-not-native']);
    },
  );

  it('keeps a label that merely contains a generic word (only equality counts)', () => {
    expect(labelOf('Зображення з лазерним променем')).toBe('Зображення з лазерним променем:');
  });

  it('uses the fallback label without a warning when the recorded label is missing, empty or whitespace', () => {
    for (const visionLabelUk of [undefined, '', '   ']) {
      const parts = buildFigureParts(entry({ visionLabelUk }), ON);
      expect(parts.captionText).toBe(`<b>${FALLBACK_LABEL}</b> ${LAMP_DESC_UK}`);
      expect(figureCaptionWarnings([parts])).toEqual([]);
    }
  });

  it('falls back to the label and warns when the recorded label has no Cyrillic letter, keeping a native description', () => {
    const parts = buildFigureParts(entry({ visionLabelUk: 'Result of the green laser:' }), ON);
    expect(parts.captionText).toBe(`<b>${FALLBACK_LABEL}</b> ${LAMP_DESC_UK}`);
    expect(figureCaptionWarnings([parts]).map(w => w.rule)).toEqual(['image-caption-not-native']);
  });
});

describe('buildFigureParts - description and alt rules (FR-21 rules 2, 3; FR-4)', () => {
  it('trims the recorded description and alt', () => {
    const parts = buildFigureParts(entry({ visionDescriptionUk: `  ${LAMP_DESC_UK}  `, visionAltUk: `  ${LAMP_ALT_UK}  ` }), ON);
    expect(parts.captionText).toBe(`<b>${LAMP_LABEL_UK}</b> ${LAMP_DESC_UK}`);
    expect(parts.alt).toBe(LAMP_ALT_UK);
  });

  it('falls back to the file name (hyphens as spaces) plus a full stop for a missing description, silently', () => {
    for (const visionDescriptionUk of [undefined, '', '  ']) {
      const parts = buildFigureParts(entry({ visionDescriptionUk }), ON);
      expect(parts.captionText).toBe(`<b>${LAMP_LABEL_UK}</b> desk lamp.`);
      expect(figureCaptionWarnings([parts])).toEqual([]);
    }
  });

  it('falls back to the file name without extension, hyphens as spaces, for a missing alt, silently (A-12)', () => {
    for (const visionAltUk of [undefined, '', '   ']) {
      const parts = buildFigureParts(entry({ visionAltUk }), ON);
      expect(parts.alt).toBe('desk lamp');
      expect(figureCaptionWarnings([parts])).toEqual([]);
    }
  });

  it('treats a non-empty description without any Cyrillic letter as empty and raises one not-native warning', () => {
    const parts = buildFigureParts(entry({ visionDescriptionUk: 'A desk lamp on a table.' }), ON);
    expect(parts.captionText).toBe(`<b>${LAMP_LABEL_UK}</b> desk lamp.`);
    expect(figureCaptionWarnings([parts]).map(w => w.rule)).toEqual(['image-caption-not-native']);
  });

  it('treats a non-empty alt without any Cyrillic letter as empty and raises one not-native warning', () => {
    const parts = buildFigureParts(entry({ visionAltUk: 'Desk lamp on a table' }), ON);
    expect(parts.alt).toBe('desk lamp');
    expect(figureCaptionWarnings([parts]).map(w => w.rule)).toEqual(['image-caption-not-native']);
  });

  it('raises ONE not-native warning per file even when label, description and alt are all non-native', () => {
    const parts = buildFigureParts(entry({
      visionLabelUk: 'Green laser result:', visionDescriptionUk: 'A laser burns wood.', visionAltUk: 'Laser on wood',
    }), ON);
    expect(parts.captionText).toBe(`<b>${FALLBACK_LABEL}</b> desk lamp.`);
    expect(parts.alt).toBe('desk lamp');
    expect(figureCaptionWarnings([parts])).toHaveLength(1);
  });

  it('a Cyrillic letter anywhere in the field is enough: the check is a cheap proxy, not a language detector (A-14)', () => {
    const parts = buildFigureParts(entry({ visionDescriptionUk: 'Lamp на столі.' }), ON);
    expect(parts.captionText).toBe(`<b>${LAMP_LABEL_UK}</b> Lamp на столі.`);
    expect(figureCaptionWarnings([parts])).toEqual([]);
  });
});

describe('buildFigureParts - an entry created before this Story (FR-21 failure path, NFR-12, AC-9 i)', () => {
  const parts = buildFigureParts(legacyEntry(), ON);

  it('takes the Ukrainian fallbacks for label, description and alt with no warning', () => {
    expect(parts.captionText).toBe(`<b>${FALLBACK_LABEL}</b> desk lamp.`);
    expect(parts.alt).toBe('desk lamp');
    expect(figureCaptionWarnings([parts])).toEqual([]);
  });

  it('never reads the English altText or visionDescription of such an entry (A-16)', () => {
    expect(parts.alt).not.toContain(LAMP_ALT);
    expect(parts.captionText).not.toContain(LAMP_VISION);
  });

  it('carries no English fallback string: no "Image:", "Product image", "View"', () => {
    expect(parts.captionText + parts.alt).not.toMatch(ENGLISH_STRINGS);
  });
});

describe('buildFigureParts - alt versus the whole figcaption text (FR-4, H-4, A-4, AC-9 h)', () => {
  const whole = `${LAMP_LABEL_UK} ${LAMP_DESC_UK}`;

  it('prefixes the Ukrainian "Фото: " when alt equals the whole figcaption text including the label', () => {
    const parts = buildFigureParts(entry({ visionAltUk: whole }), ON);
    expect(parts.alt).toBe(`Фото: ${whole}`);
  });

  it('compares after collapsing whitespace', () => {
    const parts = buildFigureParts(entry({ visionAltUk: `${LAMP_LABEL_UK}   ${LAMP_DESC_UK}` }), ON);
    expect(parts.alt.startsWith('Фото: ')).toBe(true);
  });

  it('keeps alt unchanged when it equals only the description (the label is part of the compared text)', () => {
    const parts = buildFigureParts(entry({ visionAltUk: LAMP_DESC_UK }), ON);
    expect(parts.alt).toBe(LAMP_DESC_UK);
  });

  it('never uses the former English "View " prefix', () => {
    expect(buildFigureParts(entry({ visionAltUk: whole }), ON).alt).not.toMatch(/^View /);
  });

  it('guarantees a non-empty alt that differs from the whole figcaption text for every input shape', () => {
    const cases = [
      entry(),
      legacyEntry(),
      entry({ visionAltUk: '' }),
      entry({ visionDescriptionUk: '' }),
      entry({ visionAltUk: whole }),
      entry({ visionLabelUk: '', visionDescriptionUk: '', visionAltUk: `${FALLBACK_LABEL} desk lamp.` }),
      entry({ visionAltUk: 'Desk lamp' }),
    ];
    for (const e of cases) {
      const parts = buildFigureParts(e, ON);
      expect(parts.alt.trim()).not.toBe('');
      expect(collapse(parts.alt)).not.toBe(collapse(stripTags(parts.captionText)));
    }
  });

  it('never yields an empty figcaption', () => {
    for (const e of [legacyEntry(), entry({ visionLabelUk: '  ', visionDescriptionUk: '  ' })]) {
      expect(stripTags(buildFigureParts(e, ON).captionText).trim().length).toBeGreaterThan(FALLBACK_LABEL.length);
    }
  });
});

describe('buildFigureParts - HTML escaping of the recorded text', () => {
  it('escapes <, > and & in the label and the description so the caption stays valid markup', () => {
    const parts = buildFigureParts(entry({
      visionLabelUk: 'Лазер <b> & тест:', visionDescriptionUk: 'Потужність <20 Вт & більше.',
    }), ON);
    expect(parts.captionText).toBe('<b>Лазер &lt;b&gt; &amp; тест:</b> Потужність &lt;20 Вт &amp; більше.');
  });
});

describe('buildFigureParts - the cyrillicCheck option (A-15)', () => {
  const english = entry({ visionLabelUk: 'Green laser result:', visionDescriptionUk: 'A laser burns wood.', visionAltUk: 'Laser on wood' });

  it('with the check off, non-empty text is used as recorded and raises no not-native warning', () => {
    const parts = buildFigureParts(english, OFF);
    expect(parts.captionText).toBe('<b>Green laser result:</b> A laser burns wood.');
    expect(parts.alt).toBe('Laser on wood');
    expect(figureCaptionWarnings([parts])).toEqual([]);
  });

  it('with the check off, an empty field still takes the Ukrainian fallback (the non-empty test)', () => {
    const parts = buildFigureParts(entry({ visionLabelUk: '', visionDescriptionUk: '', visionAltUk: '' }), OFF);
    expect(parts.captionText).toBe(`<b>${FALLBACK_LABEL}</b> desk lamp.`);
    expect(parts.alt).toBe('desk lamp');
  });

  it('with the check on, the same English entry takes the fallbacks and raises one warning', () => {
    const parts = buildFigureParts(english, ON);
    expect(parts.captionText).toBe(`<b>${FALLBACK_LABEL}</b> desk lamp.`);
    expect(figureCaptionWarnings([parts])).toHaveLength(1);
  });
});

describe('figureCaptionWarnings - FR-21 rules 5 and the not-native rule (AC-9 h, i)', () => {
  const two = (labelA: string, labelB: string) => [
    buildFigureParts(entry({ visionLabelUk: labelA }), ON),
    buildFigureParts(entry({ originalFilename: 'kettle-side.jpg', urlFilename: 'kettle-side.jpg', visionLabelUk: labelB }), ON),
  ];

  it('warns once, for the LATER figure, when two figures share a label, and names that file', () => {
    const warnings = figureCaptionWarnings(two('Вигляд збоку:', 'Вигляд збоку:'));
    expect(warnings).toHaveLength(1);
    expect(warnings[0].rule).toBe('image-caption-duplicate-label');
    expect(warnings[0].severity).toBe('warning');
    expect(warnings[0].detail).toContain('kettle-side.jpg');
    expect(warnings[0].detail).not.toContain('desk-lamp.jpg');
  });

  it('compares labels trimmed, colon-stripped and ignoring case', () => {
    expect(figureCaptionWarnings(two('Вигляд збоку:', '  ВИГЛЯД збоку ')).map(w => w.rule)).toEqual(['image-caption-duplicate-label']);
  });

  it('keeps the text of both figures (no rewording)', () => {
    const figures = two('Вигляд збоку:', 'Вигляд збоку:');
    const before = structuredClone(figures);
    figureCaptionWarnings(figures);
    expect(figures).toEqual(before);
    expect(figures[1].captionText.startsWith('<b>Вигляд збоку:</b>')).toBe(true);
  });

  it('warns for each later figure when three share a label', () => {
    const f = (file: string) => buildFigureParts(entry({ originalFilename: file, urlFilename: file, visionLabelUk: 'Вигляд збоку:' }), ON);
    const warnings = figureCaptionWarnings([f('a.jpg'), f('b.jpg'), f('c.jpg')]);
    expect(warnings.map(w => w.rule)).toEqual(['image-caption-duplicate-label', 'image-caption-duplicate-label']);
    expect(warnings[0].detail).toContain('b.jpg');
    expect(warnings[1].detail).toContain('c.jpg');
  });

  it('raises nothing for distinct labels', () => {
    expect(figureCaptionWarnings(two('Вигляд збоку:', 'Вигляд спереду:'))).toEqual([]);
  });

  it('exempts the generic fallback label: it may repeat without a warning', () => {
    const figures = [buildFigureParts(legacyEntry(), ON), buildFigureParts(legacyEntry({ originalFilename: 'kettle-side.jpg', urlFilename: 'kettle-side.jpg' }), ON)];
    expect(figures.every(p => p.captionText.startsWith(`<b>${FALLBACK_LABEL}</b>`))).toBe(true);
    expect(figureCaptionWarnings(figures)).toEqual([]);
  });

  it('raises the not-native warning once per file, naming it', () => {
    const warnings = figureCaptionWarnings([buildFigureParts(entry({ visionAltUk: 'English alt only' }), ON)]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ rule: 'image-caption-not-native', severity: 'warning' });
    expect(warnings[0].detail).toContain('desk-lamp.jpg');
  });

  it('writes the user-facing text in Ukrainian (project rule: QA messages are Ukrainian, NFR-11)', () => {
    const notNative = figureCaptionWarnings([buildFigureParts(entry({ visionAltUk: 'English alt only' }), ON)]);
    const duplicate = figureCaptionWarnings(two('Вигляд збоку:', 'Вигляд збоку:'));
    for (const w of [...notNative, ...duplicate]) expect(hasCyrillic(w.detail)).toBe(true);
  });

  it('is a pure function of the list: the same list gives the same warnings, in order', () => {
    const figures = [...two('Вигляд збоку:', 'Вигляд збоку:'), buildFigureParts(entry({ originalFilename: 'c.jpg', urlFilename: 'c.jpg', visionAltUk: 'English' }), ON)];
    expect(figureCaptionWarnings(figures)).toEqual(figureCaptionWarnings(figures));
    expect(figureCaptionWarnings([])).toEqual([]);
  });
});

describe('NFR-6 - no store or locale literal in the shared module', () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'image-placeholder.ts'), 'utf8');

  it('does not name a store from STORE_REGISTRY nor import the registry', () => {
    expect(src).not.toMatch(/STORE_REGISTRY/);
    expect(src).not.toMatch(/EXPERT3D|Expert-3DPrinter|Drukarka|Center 3D Print/);
  });

  it('holds no locale code literal: the Cyrillic proxy is driven by the cyrillicCheck option (A-15)', () => {
    expect(src).not.toMatch(/['"`](?:uk-UA|ru-UA|pl-PL|en-GB|en-US|de-DE|es-ES|es-MX|pt-PT|en-ES)['"`]/);
  });
});

describe('NFR-11 - the only hardcoded user-visible strings are Ukrainian', () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'image-placeholder.ts'), 'utf8');

  it('contains none of the former English fallback strings', () => {
    expect(src).not.toMatch(/Product image/);
    expect(src).not.toMatch(/['"`]View /);
    expect(src).not.toMatch(/IMAGE_CAPTION_LABEL/);
    expect(src).not.toMatch(/['"`]Image:['"`]/);
  });

  it('contains the hardcoded Ukrainian fallback label and alt prefix', () => {
    expect(src).toContain('Зображення товару:');
    expect(src).toContain('Фото: ');
  });
});
