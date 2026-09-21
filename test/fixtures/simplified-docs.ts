/**
 * simplified-docs.ts — hand-authored v4 `ProductDescriptionDoc` shapes for the three simplified
 * content templates (US-2.2). New file rather than an edit of `v4-docs.ts`: the existing fixtures
 * stay byte-stable and the corpus is untouched (impact analysis, "do not regenerate any accepted
 * artifact fixture").
 *
 * WORD BUDGETS ARE EXPLICIT. Every builder takes the word count it should land on for each paragraph
 * so a range test names the paragraph it violates. The generated filler is plain Ukrainian tokens
 * (no digits, no units, no punctuation inside a sentence) so it cannot trip a number-format or
 * calque rule. Counts are asserted through `countWordsOf` below, an independent tokenizer: a
 * fixture that silently drifted out of its intended band would otherwise make a range test pass or
 * fail for the wrong reason.
 *
 * The docs are returned through `unknown` because, before T3, `ProductDescriptionDoc` still
 * requires every paragraph and a simplified shape does not typecheck against it. After T3 the cast
 * is redundant and harmless.
 */
import type { ProductDescriptionDoc } from '../../src/domain/description-doc';

/** `n` filler words, deterministic. */
export function words(n: number): string {
  const pool = ['матеріал', 'друк', 'якість', 'стабільний', 'надійний', 'шар', 'поверхня', 'точність', 'сумісний', 'простий'];
  return Array.from({ length: n }, (_, i) => pool[i % pool.length]).join(' ');
}

/** Independent word counter (whitespace tokens of the tag-stripped text, punctuation-only tokens ignored). */
export function countWordsOf(html: string): number {
  return html
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(t => /[\p{L}\p{N}]/u.test(t)).length;
}

export interface SimplifiedBudget {
  /** §1 hook words, name included. */
  hook?: number;
  /** §2 killer specs + key benefits, whole block. */
  block2?: number;
  /** §4 applications, whole list. */
  applications?: number;
  /** §5 compatibility words (heading excluded). */
  compat?: number;
  /** §8 CTA words. */
  cta?: number;
}

export const IN_RANGE: Required<SimplifiedBudget> = { hook: 60, block2: 150, applications: 130, compat: 60, cta: 70 };

const NAME = 'eSUN PLA+';

function hook(nWords: number): string {
  // "<b>eSUN PLA+</b> — " contributes 2 counted words (name); the em dash is punctuation-only.
  return `<b>${NAME}</b> — ${words(Math.max(0, nWords - 2))}`;
}

function block2(nWords: number) {
  // 3 killer specs (label 2 + value 2 words + why k) and one bullets Block of 3 items (lead 2 + text k).
  const fixed = 3 * 4 + 3 * 2;
  const k = Math.max(1, Math.round((nWords - fixed) / 6));
  return {
    killerSpecs: ['Діаметр нитки', 'Вага котушки', 'Температура друку'].map((label, i) => ({
      label, value: `${i + 1} значення`, why: words(k),
    })),
    keyBenefits: [{
      kind: 'bullets' as const,
      items: ['Перша перевага:', 'Друга перевага:', 'Третя перевага:'].map(lead => ({ lead, text: ` ${words(k)}` })),
    }],
  };
}

function applications(nWords: number) {
  const fixed = 4 * 2;
  const k = Math.max(1, Math.round((nWords - fixed) / 4));
  return {
    heading: 'Сфери застосування',
    items: ['Прототипи:', 'Побутові вироби:', 'Навчальні моделі:', 'Функціональні деталі:']
      .map(scenario => ({ scenario, text: ` ${words(k)}` })),
  };
}

function compatibility(nWords: number) {
  return { heading: 'Сумісність', blocks: [{ kind: 'paragraph' as const, text: words(nWords) }] };
}

function specs(categories = 1) {
  return {
    heading: 'Технічні характеристики',
    categories: Array.from({ length: categories }, (_, c) => ({
      title: `Група ${c + 1}`,
      rows: [
        { label: `Діаметр ${c + 1}`, value: '1,75 мм' },
        { label: `Вага ${c + 1}`, value: '1 кг' },
        { label: `Температура ${c + 1}`, value: '200 °C' },
      ],
    })),
  };
}

function functionality(nWords: number) {
  return [{ heading: 'Як працює аксесуар', blocks: [{ kind: 'paragraph' as const, text: words(nWords) }] }];
}

function base(b: SimplifiedBudget) {
  return {
    schemaVersion: '4.0' as const,
    locale: 'uk-UA',
    localizedName: NAME,
    hook: hook(b.hook ?? IN_RANGE.hook),
    cta: { heading: 'ignored', text: words(b.cta ?? IN_RANGE.cta) },
    figures: [] as unknown[],
    videos: [] as unknown[],
  };
}

const asDoc = (o: unknown) => o as ProductDescriptionDoc;

export interface FilamentsOptions extends SimplifiedBudget {
  /** default true; `false` omits §5. */
  compat_present?: boolean;
  /** number of spec categories; `0` omits §7 entirely. Default 1. */
  specCategories?: number;
}

/** Filaments/resins/powders: §1, §2, §4, [§5], [§7], §8. */
export function filamentsDoc(o: FilamentsOptions = {}): ProductDescriptionDoc {
  const cats = o.specCategories ?? 1;
  return asDoc({
    ...base(o),
    ...block2(o.block2 ?? IN_RANGE.block2),
    applications: applications(o.applications ?? IN_RANGE.applications),
    ...(o.compat_present === false ? {} : { compatibility: compatibility(o.compat ?? IN_RANGE.compat) }),
    ...(cats === 0 ? {} : { specs: specs(cats) }),
  });
}

export interface AccessoriesOptions extends SimplifiedBudget {
  withFunctionality?: boolean;
  compat_present?: boolean;
  specCategories?: number;
}

/** Accessories: §1, §2, [§3 iff checkbox], [§5], [§7], §8. */
export function accessoriesDoc(o: AccessoriesOptions = {}): ProductDescriptionDoc {
  const cats = o.specCategories ?? 1;
  return asDoc({
    ...base(o),
    ...block2(o.block2 ?? IN_RANGE.block2),
    ...(o.withFunctionality ? { functionality: functionality(80) } : {}),
    ...(o.compat_present === false ? {} : { compatibility: compatibility(o.compat ?? IN_RANGE.compat) }),
    ...(cats === 0 ? {} : { specs: specs(cats) }),
  });
}

/** Spare parts: §1, [§5], §8 only. */
export function sparePartsDoc(o: SimplifiedBudget & { compat_present?: boolean } = {}): ProductDescriptionDoc {
  return asDoc({
    ...base(o),
    ...(o.compat_present === false ? {} : { compatibility: compatibility(o.compat ?? IN_RANGE.compat) }),
  });
}

/** A Full-description-shaped doc (every paragraph) — reused from the v4 builders by callers; this is
 *  only a helper to blank named paragraphs on a copy. */
export function without(doc: ProductDescriptionDoc, ...keys: string[]): ProductDescriptionDoc {
  const copy: Record<string, unknown> = { ...(doc as unknown as Record<string, unknown>) };
  for (const k of keys) delete copy[k];
  return asDoc(copy);
}

/** Same, but sets the named paragraphs to null (AC-11 accepts "omitted or null"). */
export function nulled(doc: ProductDescriptionDoc, ...keys: string[]): ProductDescriptionDoc {
  const copy: Record<string, unknown> = { ...(doc as unknown as Record<string, unknown>) };
  for (const k of keys) copy[k] = null;
  return asDoc(copy);
}

// ── English, sentence-structured content for the cross-store conformance matrix ──────────────────
//
// `words()` above is one unpunctuated run: fine for range arithmetic, wrong for the real validator
// (sentence-length, calque, product-name rules). The conformance matrix runs `validateGeneratedHtml`
// over every store/locale, so its content is short declarative English sentences built from the
// same word budget. Locale-neutral on purpose (see v4ConformanceDoc): brand names, integers and
// metric units read the same in every target language.

const SENTENCES = [
  'The spool feeds smoothly through the extruder.',
  'Diameter stays steady along the whole length.',
  'Layers bond well and the surface looks clean.',
  'Each spool is vacuum packed with a desiccant.',
  'The material prints without stringing or clogging.',
  'Colours stay consistent from one batch to the next.',
  'It works with most open filament printers on the market.',
  'Retraction settings need very little tuning.',
];

/** Sentences totalling exactly `n` words (the last sentence is trimmed to fit). */
export function sentences(n: number): string {
  const out: string[] = [];
  let left = n;
  for (let i = 0; left > 0; i++) {
    const words = SENTENCES[i % SENTENCES.length].replace(/\.$/, '').split(' ');
    const take = Math.min(words.length, left);
    out.push(`${words.slice(0, take).join(' ')}.`);
    left -= take;
  }
  return out.join(' ');
}

/**
 * A simplified-template document in clean English sentences, for one locale. `figures`: adds one
 * lead-in paragraph + one figure into §5 (or §4 when the template has it) and one video into §5, so
 * FR-22 / FR-23 can be checked on every store and locale.
 */
export function conformanceSimplifiedDoc(
  template: 'filaments-resins-powders' | 'accessories' | 'spare-parts',
  locale: string,
  opts: { includeFunctionality?: boolean; media?: boolean } = {},
): ProductDescriptionDoc {
  const name = 'eSUN PLA+';
  const s2 = (k: number) => ({
    killerSpecs: ['Diameter', 'Spool weight', 'Print temperature'].map((label, i) => ({
      label, value: `${(i + 1) * 100} units`, why: sentences(k),
    })),
    keyBenefits: [{
      kind: 'bullets' as const,
      items: ['First benefit:', 'Second benefit:', 'Third benefit:'].map(lead => ({ lead, text: ` ${sentences(k)}` })),
    }],
  });
  const media = opts.media
    ? {
        figures: [{ file: 'spool.jpg', alt: 'Grey spool of filament', caption: '<b>Spool. </b>Grey filament on a reel.' }],
        videos: [{ src: 'https://www.youtube.com/embed/abc123', title: 'Filament overview', caption: '<b>Overview. </b>Filament in use.' }],
      }
    : { figures: [] as unknown[], videos: [] as unknown[] };
  const compatBlocks: unknown[] = [{ kind: 'paragraph', text: sentences(opts.media ? 30 : 60) }];
  if (opts.media) {
    compatBlocks.push({ kind: 'paragraph', text: 'The photo below shows the spool.' }, { kind: 'figure', ref: 0 },
      { kind: 'paragraph', text: 'The video below shows the filament in use.' }, { kind: 'video', ref: 0 });
  }
  const specsBlock = {
    heading: 'Technical specifications',
    categories: [{
      title: 'General',
      rows: [
        { label: 'Diameter', value: '175 mm' },
        { label: 'Spool weight', value: '1 kg' },
        { label: 'Print temperature', value: '200 °C' },
      ],
    }],
  };
  const apps = {
    heading: 'Applications',
    items: ['Prototypes:', 'Household parts:', 'Teaching models:', 'Functional parts:']
      .map(scenario => ({ scenario, text: ` ${sentences(28)}` })),
  };
  const base = {
    schemaVersion: '4.0' as const, locale, localizedName: name,
    hook: `<b>${name}</b> — ${sentences(58)}`,
    cta: { heading: 'ignored', text: sentences(70) },
    ...media,
  };
  const compat = { compatibility: { heading: 'Compatibility', blocks: compatBlocks } };
  if (template === 'spare-parts') return asDoc({ ...base, ...compat });
  if (template === 'accessories') {
    return asDoc({
      ...base, ...s2(24), ...compat, specs: specsBlock,
      ...(opts.includeFunctionality ? { functionality: [{ heading: 'How the accessory works', blocks: [{ kind: 'paragraph', text: sentences(60) }] }] } : {}),
    });
  }
  return asDoc({ ...base, ...s2(24), applications: apps, ...compat, specs: specsBlock });
}

/**
 * Memoised thunk. Specs that render a simplified document must NOT do so at module or describe scope:
 * an exception there aborts collection, so the file registers zero tests and the failure is
 * unattributable. Rendering inside `it()` (through `lazy`) makes each test fail on its own.
 */
export function lazy<T>(make: () => T): () => T {
  let cached: { v: T } | undefined;
  return () => (cached ??= { v: make() }).v;
}
