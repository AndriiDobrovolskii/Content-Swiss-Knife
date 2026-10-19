/**
 * image-placeholder.deixis.spec.ts - US-9.1 T4 (FR-19, AC-7 second sentence): `figureCaptionWarnings` emits
 * `image-caption-deixis` at `warning` for a picture-reference phrase in a marker figure's caption.
 *
 * Per the FR-18 carrier table `figureCaptionWarnings` is the ONLY function that reports the figcaption carrier
 * as a warning, and it never reports the alt carrier. Tests assert the RULE ID and the LEVEL, not the detail
 * text (FR-19; the detail follows the module's Ukrainian QA convention).
 *
 * A NEW file on purpose: `image-placeholder.spec.ts` and `image-placeholder-validate.spec.ts` stay untouched
 * (their three `figureCaptionWarnings(...)).toEqual([])` assertions, lines 173, 220 and 242 of the first, are
 * the stay-green guard for the unchanged behaviour and are not edited). A FIGURE'S warnings depend only on
 * that figure, so the `slice(before)` logic of `image-placeholder-validate.ts` still holds: the finaliser
 * group below re-asserts that property through the public finaliser.
 *
 * RED until T4: the rule does not exist. `figureCaptionWarnings`' second parameter (locale) is optional and
 * defaults to uk-UA, so every call here that omits it is a call an existing caller could make.
 */
import { describe, it, expect } from 'vitest';
import { buildFigureParts, figureCaptionWarnings } from './image-placeholder';
import { applyImagePlaceholdersHtml } from './image-placeholder-html';
import {
  validateDroppedPlaceholders, finalizeDroppedPlaceholdersHtml, preExtractPlaceholders,
} from './image-placeholder-validate';
import { entry, IMAGE_BASE, FOLDERS, LAMP_ALT_UK } from '../../test/fixtures/image-placeholder/fixtures';

const RULE = 'image-caption-deixis';
/** The optional second parameter (locale) is added by T4; reached through a cast so this spec type-checks before it exists. */
const withLocale = figureCaptionWarnings as unknown as (figures: Parameters<typeof figureCaptionWarnings>[0], locale: string) => ReturnType<typeof figureCaptionWarnings>;
const ON = { cyrillicCheck: true } as const;
const POINTER_DESC = 'На фото сканер має вбудований екран, що показує зручність перегляду.';
const CLEAN_DESC = 'Сенсорний екран запускає сканування й показує 3D-модель.';

const parts = (over: Parameters<typeof entry>[0] = {}) => buildFigureParts(entry(over), ON);
const ruleHits = (figures: ReturnType<typeof parts>[], locale?: string) =>
  (locale ? withLocale(figures, locale) : figureCaptionWarnings(figures)).filter(w => w.rule === RULE);

describe('figureCaptionWarnings emits image-caption-deixis (FR-19)', () => {
  it('emits one warning-level finding for a caption description that points at the picture', () => {
    const hits = ruleHits([parts({ visionDescriptionUk: POINTER_DESC })]);
    expect(hits).toHaveLength(1);
    expect(hits[0].severity).toBe('warning');
    expect(typeof hits[0].detail).toBe('string');
    expect(hits[0].detail.length).toBeGreaterThan(0);
  });

  it.each([
    ['a caption that starts with the picture noun as a subject', 'Колаж показує три модулі на задній панелі.'],
    ['a participle pointing at the page layout', 'Ряд із трьох круглих модулів ззаду показано на зображенні.'],
    ['a spatial pointer to a figure', 'Нижче розміщено відео з оглядом пристрою.'],
  ])('emits for %s', (_n, visionDescriptionUk) => {
    expect(ruleHits([parts({ visionDescriptionUk })])).toHaveLength(1);
  });

  it('emits for the label too: the whole figcaption text is the carrier', () => {
    expect(ruleHits([parts({ visionLabelUk: 'На фото:', visionDescriptionUk: CLEAN_DESC })])).toHaveLength(1);
  });

  it('emits for a figure with the FALLBACK label (the check runs before the fallback-label skip)', () => {
    const p = parts({ visionLabelUk: undefined, visionDescriptionUk: POINTER_DESC });
    expect(p.fallbackLabel).toBe(true);
    expect(ruleHits([p])).toHaveLength(1);
  });

  it('emits once per figure, even when the caption holds two pointer phrases', () => {
    expect(ruleHits([parts({ visionDescriptionUk: `${POINTER_DESC} Нижче розміщено відео.` })])).toHaveLength(1);
  });

  it('emits nothing for a clean caption', () => {
    expect(ruleHits([parts({ visionDescriptionUk: CLEAN_DESC })])).toEqual([]);
  });

  it('emits nothing when only the ALT carries the phrase (alt is reported by collectFigureDeixis and the script only)', () => {
    expect(ruleHits([parts({ visionDescriptionUk: CLEAN_DESC, visionAltUk: 'На фото видно екран сканера' })])).toEqual([]);
  });

  it('does not match the code-authored fallback label or alt prefix (Q-CODEALT)', () => {
    // No Ukrainian fields recorded: the figure is built from the fallback label, the file name and the alt prefix.
    const fallbackOnly = buildFigureParts(entry({ visionLabelUk: undefined, visionDescriptionUk: undefined, visionAltUk: undefined }), ON);
    expect(ruleHits([fallbackOnly])).toEqual([]);
  });

  it('keeps the other FR-21 warnings and adds this one beside them, in the same list', () => {
    const generic = parts({ visionLabelUk: 'Зображення:', visionDescriptionUk: POINTER_DESC });
    const rules = figureCaptionWarnings([generic]).map(w => w.rule);
    expect(rules).toContain('image-caption-not-native');
    expect(rules).toContain(RULE);
  });

  it('judges each figure on its own: a clean figure after a pointer figure gets no warning', () => {
    const first = parts({ visionDescriptionUk: POINTER_DESC });
    const second = parts({ id: 'img-2', urlFilename: 'second.jpg', originalFilename: 'second.jpg', visionLabelUk: 'Екран:', visionDescriptionUk: CLEAN_DESC });
    expect(ruleHits([first, second])).toHaveLength(1);
    expect(ruleHits([second, first])).toHaveLength(1);
  });

  it('takes an optional locale: an English caption is judged by the English pattern, a Ukrainian one is not', () => {
    // cyrillicCheck is OFF for the English figure on purpose: with the check on, `buildFigureParts` discards non-Cyrillic
    // text and the figcaption holds only the file-name fallback, so no implementation could ever see the English sentence.
    const english = buildFigureParts(
      entry({ visionLabelUk: 'Back panel:', visionDescriptionUk: 'The row of three round modules is shown in the image.' }),
      { cyrillicCheck: false },
    );
    expect(english.captionText ?? '', 'the English text must survive buildFigureParts').toContain('shown in the image');
    expect(ruleHits([english], 'en-GB')).toHaveLength(1);
    expect(ruleHits([parts({ visionDescriptionUk: POINTER_DESC })], 'en-GB')).toEqual([]);
  });

  it('is a pure function of its input (no state between calls)', () => {
    const figures = [parts({ visionDescriptionUk: POINTER_DESC })];
    expect(figureCaptionWarnings(figures)).toEqual(figureCaptionWarnings(figures));
  });
});

describe('the warning reaches the placeholder report and the dropped-marker validator (AC-7, FR-19)', () => {
  const MARKER_A = '[desk-lamp.jpg]';
  const withPointer = entry({ visionDescriptionUk: POINTER_DESC });

  it('the HTML placeholder step puts image-caption-deixis in report.warnings for a marker figure it builds', () => {
    const { report } = applyImagePlaceholdersHtml(`<p>Lead ${MARKER_A} tail.</p>`, [withPointer], IMAGE_BASE, FOLDERS);
    expect(report.warnings.filter(w => w.rule === RULE)).toHaveLength(1);
  });

  it('validateDroppedPlaceholders carries it with the given context and at warning level; it is never an error', () => {
    const { report } = applyImagePlaceholdersHtml(`<p>Lead ${MARKER_A} tail.</p>`, [withPointer], IMAGE_BASE, FOLDERS);
    const issues = validateDroppedPlaceholders(preExtractPlaceholders(`Intro ${MARKER_A}`, [withPointer]), report, 'HTML (uk-UA)');
    const hit = issues.filter(i => i.rule === RULE);
    expect(hit).toHaveLength(1);
    expect(hit[0].severity).toBe('warning');
    expect(hit[0].context).toBe('HTML (uk-UA)');
    expect(issues.filter(i => i.severity === 'error')).toEqual([]);
  });
});

describe('the slice(before) property of image-placeholder-validate still holds with the new warning (T4)', () => {
  const placedEntry = entry({ visionDescriptionUk: POINTER_DESC });
  const LATE = entry({
    id: 'img-9', originalFilename: 'late.jpg', urlFilename: 'late.jpg', visionLabelUk: 'Екран:', visionAltUk: LAMP_ALT_UK,
  });
  const LATE_POINTER = entry({ ...LATE, visionDescriptionUk: 'Нижче розміщено відео з оглядом пристрою.' });
  const droppedIssues = (e: ReturnType<typeof entry>) => {
    const { report } = applyImagePlaceholdersHtml('<p>Nothing here.</p>', [e], IMAGE_BASE, FOLDERS);
    return validateDroppedPlaceholders(preExtractPlaceholders(`[${e.originalFilename}]`, [e]), report, 'HTML (uk-UA)');
  };

  it('an end-appended figure with a pointer caption gets exactly ONE new image-caption-deixis; the already-placed figure\'s warning is not repeated', () => {
    const placed = [buildFigureParts(placedEntry, ON)];
    const { issues } = finalizeDroppedPlaceholdersHtml(
      '<p>Nothing here.</p>', droppedIssues(LATE_POINTER), [LATE_POINTER], IMAGE_BASE, FOLDERS, { placed },
    );
    expect(issues.filter(i => i.rule === RULE)).toHaveLength(1);
  });

  it('an end-appended CLEAN figure after a placed pointer figure adds no image-caption-deixis at all', () => {
    const placed = [buildFigureParts(placedEntry, ON)];
    const cleanLate = entry({ ...LATE, visionDescriptionUk: CLEAN_DESC });
    const { issues } = finalizeDroppedPlaceholdersHtml(
      '<p>Nothing here.</p>', droppedIssues(cleanLate), [cleanLate], IMAGE_BASE, FOLDERS, { placed },
    );
    expect(issues.filter(i => i.rule === RULE)).toEqual([]);
  });
});
