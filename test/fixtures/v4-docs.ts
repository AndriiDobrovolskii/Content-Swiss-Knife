/**
 * v4-docs.ts — hand-authored `ProductDescriptionDoc` fixtures for US-2.1.
 *
 * WHY THIS MODULE EXISTS. The committed reconciliation corpus
 * (`test/fixtures/corpus/*.doc.json`) is two artifacts of the SAME product, both `'3.0'`, both
 * uk-UA, and the impact analysis measured six shapes it does not contain — a single-`<h3>`
 * functionality group, a non-`bullets` §2 Block, an array `SpecRow.value`, a combined §2 list over
 * eight items, `compatibility` + `packageContents`, and a video embed. Those six shapes are
 * exactly what every new v4 rule turns on, so they have to be authored rather than sampled.
 *
 * WHY `test/fixtures/` AND NOT `src/domain/__fixtures__/`. `vitest.config.ts` holds `src/domain/**`
 * at 95/95/90/95 coverage. A fixture module there enters that measurement, and an exported builder
 * a later task stops calling would drop the directory below its floor for a reason unrelated to the
 * code under test. `test/**` is outside the coverage `include`, is already the home of
 * `test/fixtures/corpus/`, and is inside `tsconfig.json`'s `include` so `npm run lint` still
 * typechecks it.
 *
 * THE TWO FAMILIES, AND WHY THEY ARE SHAPED DIFFERENTLY (implementation plan C-1).
 *
 *   `'3.0'` family — plain `ProductDescriptionDoc` values. They typecheck against
 *   `description-doc.ts:122` as it stands today (`schemaVersion: '3.0'`, a literal type) and parse
 *   against `description-doc.schema.ts` unmodified. That is their whole evidentiary value: a
 *   legacy shape that passes only AFTER the schema moved proves nothing about the schema not
 *   having moved. Their bodies must stay byte-stable across T1 and T3 (task breakdown T3, check 5).
 *
 *   `'4.0'` family — split by what consumes it, which is the boundary the plan review drew:
 *     · `ProductDescriptionDocSchema.safeParse` takes `unknown`, so every schema negative below is
 *       returned as `unknown` and needs no `ProductDescriptionDoc`-typed value at all;
 *     · `renderDescription(doc: ProductDescriptionDoc, …)` does need the type, and that is the one
 *       place `asSchemaVersion4()` exists for.
 *
 * DO NOT ADD A `'4.0'` ITEM TO `test/fixtures/corpus/`. That harness reconciles the renderer
 * against artifacts production has already shipped, and production has shipped no v4 artifact
 * (plan R5). A hand-authored corpus triple would make `render-reconciliation.spec.ts` assert the
 * plan's own assumption back to itself.
 */
import type { Block, ProductDescriptionDoc } from '../../src/domain/description-doc';

// ── The `'3.0'` family — the OD-2 cache shapes, each of which must keep parsing forever ──────────

/**
 * A minimal, schema-valid `'3.0'` uk-UA document. Every builder below starts here and changes ONE
 * thing, so a failure names the shape that caused it rather than the fixture in general.
 *
 * Deliberately carries no figure and no video: the ref-integrity `superRefine` requires every
 * manifest entry to be referenced exactly once, and a base that already spends refs makes each
 * variant's arithmetic a puzzle. The two variants that need media add both sides together.
 *
 * The headings are Style B-legal for Center 3D Print — §3 opens with a functional «Як …», §4/§5/§6
 * use forms `MANDATED_NOMINAL_H2` already allows — so `heading-style.v4.spec.ts` can assert that
 * the ONLY new `h2-nominal-heading` candidate a v4 render introduces is the §2 heading itself.
 */
export function v3BaseDoc(): ProductDescriptionDoc {
  return {
    schemaVersion: '3.0',
    locale: 'uk-UA',
    localizedName: 'Ortur H20 20 W',
    hook: '<b>Ortur H20 20 W</b> — лазерний гравер із потужністю 20 Вт і робочим полем 400 × 400 мм.',
    killerSpecs: [
      { label: 'Потужність лазера', value: '20 Вт', why: 'Ріже фанеру 6 мм за один прохід.' },
      { label: 'Робоче поле', value: '400 × 400 мм', why: 'Вміщує аркуш формату A3 без перестановки.' },
      { label: 'Швидкість', value: '10 000 мм/хв', why: 'Скорочує час серійного замовлення удвічі.' },
    ],
    keyBenefits: [bulletsBlock(3, 'Перевага')],
    functionality: [
      {
        heading: 'Як працює лазерний модуль',
        blocks: [{ kind: 'paragraph', text: 'Діодний модуль фокусує промінь у пляму 0,08 мм.' }],
      },
    ],
    applications: {
      heading: 'Сфери застосування',
      items: [
        { scenario: 'Сувенірне виробництво:', text: ' гравіювання на дереві та акрилі.' },
        { scenario: 'Текстиль:', text: ' розкрій аплікацій і трафаретів.' },
        { scenario: 'Прототипування:', text: ' швидкий розкрій макетів із картону.' },
        { scenario: 'Освіта:', text: ' демонстрація лазерної обробки на уроках.' },
      ],
    },
    specs: {
      heading: 'Технічні характеристики Ortur H20 20 W',
      categories: [
        {
          title: 'Лазерний модуль',
          rows: [
            { label: 'Потужність', value: '20 Вт' },
            { label: 'Тип', value: 'діодний' },
          ],
        },
      ],
    },
    cta: {
      heading: 'Чому варто купити Ortur H20 20 W у EXPERT3D?',
      text: 'EXPERT3D постачає професійне обладнання та забезпечує сервіс на місці.',
    },
    figures: [],
    videos: [],
  };
}

/**
 * L1 / FR-27. A functionality group with EXACTLY ONE `<h3>` sub-heading.
 *
 * v4 §3 (`:364-366`) opens an `<h3>` only when a group has 2+ distinct sub-functions, and the
 * human's settled Decision 1 made that a validated check rather than a prompt rule. This shape is
 * what an unconditional `.min(2)` on `makeSubsectionSchema` would reject — including in cached
 * `'3.0'` documents, which is what OD-2 exists to prevent, and what D3 routes around by putting the
 * bound in the version-guarded refinement instead.
 */
export function v3SingleH3FunctionalityGroup(): ProductDescriptionDoc {
  const doc = v3BaseDoc();
  doc.functionality[0].subsections = [
    { heading: 'Діодний модуль', blocks: [{ kind: 'paragraph', text: 'Змінна голівка на 20 Вт.' }] },
  ];
  return doc;
}

/**
 * L3 / FR-4. A §2 Key Benefits collection carrying all four Block kinds.
 *
 * `keyBenefits: z.array(RelaxedBlockSchema).min(1)` admits `paragraph`, `figure` and `video` today,
 * and a cached artifact may use any of them. FR-4 forbids all three for `'4.0'` only.
 */
export function v3NonBulletsKeyBenefits(): ProductDescriptionDoc {
  const doc = v3BaseDoc();
  doc.figures = [{ file: 'ortur-h20.jpg', alt: 'Гравер Ortur H20', caption: '<b>Ortur H20. </b>Загальний вигляд.' }];
  doc.videos = [
    { src: 'https://www.youtube.com/embed/abc123', title: 'Ortur H20 20 W огляд', caption: '<b>Відеоогляд. </b>Гравер у роботі.' },
  ];
  doc.keyBenefits = [
    bulletsBlock(3, 'Перевага'),
    { kind: 'paragraph', text: 'Модуль знімається без інструментів.' },
    { kind: 'figure', ref: 0 },
    { kind: 'video', ref: 0 },
  ];
  return doc;
}

/**
 * L2 / FR-10. A §7 spec row whose `value` is an ARRAY of strings.
 *
 * `SpecRow.value` is `z.union([NonEmpty, z.array(NonEmpty).min(1)])`, and the EXPERT3D artifact is
 * why: it writes a multi-valued parameter as a list. FR-9/FR-10 make the string form the only legal
 * one for `'4.0'`, scoped to that version so this document keeps parsing.
 */
export function v3ArraySpecValue(): ProductDescriptionDoc {
  const doc = v3BaseDoc();
  doc.specs.categories[0].rows.push({ label: 'Сумісні матеріали', value: ['фанера', 'акрил', 'шкіра'] });
  return doc;
}

/**
 * L4 / FR-17. A §2 whose COMBINED rendered list is twelve items — four `killerSpecs` plus a
 * `bullets` Block of eight.
 *
 * Today every individual bound holds: `killerSpecs` is `.min(3).max(4)`, each `bullets` Block is
 * `.min(2).max(8)`, and `keyBenefits` has no maximum on the number of Blocks at all. That is why
 * FR-17's ceiling of 8 is a cross-collection invariant and not any single `.max()`.
 */
export function v3OverCeilingKeyBenefits(): ProductDescriptionDoc {
  const doc = v3BaseDoc();
  doc.killerSpecs.push({ label: 'Фокус', value: '0,08 мм', why: 'Дає чіткий контур на дрібному шрифті.' });
  doc.keyBenefits = [bulletsBlock(8, 'Перевага')];
  return doc;
}

/**
 * FR-6 / V15's `'3.0'` subject. Both conditional sections populated.
 *
 * NEITHER committed corpus document carries `packageContents` — verified by grepping both
 * `.doc.json` files — so `render-reconciliation.spec.ts` is byte-for-byte green under EITHER choice
 * of §6 list element and cannot detect D17 in either direction. This builder is the only subject
 * the `'3.0'` half of that assertion has.
 */
export function v3WithCompatibilityAndPackageContents(): ProductDescriptionDoc {
  const doc = v3BaseDoc();
  doc.compatibility = {
    heading: 'Сумісність',
    blocks: [bulletsBlock(2, 'Сумісне обладнання')],
  };
  doc.packageContents = {
    heading: 'Комплект постачання',
    items: ['Гравер Ortur H20 20 W', 'Лазерний модуль 20 Вт', 'Комплект кріплень'],
  };
  return doc;
}

/**
 * FR-24. A video embed carried in §3 functionality — the destination `buildVideoBlock`
 * (`task-a.ts:117`) already instructs and the only unconditional one a v4 document has, since §4
 * admits no video and §5 is conditional.
 */
export function v3WithVideo(): ProductDescriptionDoc {
  const doc = v3BaseDoc();
  doc.videos = [
    { src: 'https://www.youtube.com/embed/abc123', title: 'Ortur H20 20 W огляд', caption: '<b>Відеоогляд. </b>Гравер у роботі.' },
  ];
  doc.functionality[0].blocks.push({ kind: 'video', ref: 0 });
  return doc;
}

// ── The version bridge ───────────────────────────────────────────────────────────────────────────

/**
 * Returns `doc` with `schemaVersion: '4.0'`, typed as a `ProductDescriptionDoc`.
 *
 * 🔴 THE CAST IS DELIBERATE AND IS T3's TO DELETE. `description-doc.ts:122` is the literal
 * `schemaVersion: '3.0'` until D2 widens it to `'3.0' | '4.0'`, and `tsconfig.json` includes
 * `test/**\/*` while `npm run lint` is `tsc --noEmit` — so a `'4.0'` value typed as
 * `ProductDescriptionDoc` cannot compile before T3 (plan C-1). Every OTHER `'4.0'` fixture in this
 * module is returned as `unknown`, because `ProductDescriptionDocSchema.safeParse` takes `unknown`
 * and needs no type; this one exists because `renderDescription` takes a `ProductDescriptionDoc`
 * and V3, V14 and V15's `'4.0'` half all go through it.
 *
 * Once T3 lands, the body becomes `{ ...doc, schemaVersion: '4.0' }` with no cast and the function
 * can stay as a readable spelling of "the same document, one version up".
 */
export function asSchemaVersion4(doc: ProductDescriptionDoc): ProductDescriptionDoc {
  return { ...doc, schemaVersion: '4.0' } as unknown as ProductDescriptionDoc;
}

// ── The `'4.0'` family ───────────────────────────────────────────────────────────────────────────

/** v4 §6's uk-UA single-product heading, stated verbatim by FR-6. */
export const V4_PACKAGE_CONTENTS_HEADING_UK = 'Що в коробці?';

export interface V4DocOptions {
  locale?: string;
  /**
   * §6's heading. FR-6 makes it code-resident per locale (T2's table), and the D5 membership check
   * validates it against that table — so a caller asserting the membership check must pass the real
   * table entry rather than relying on this default, which covers uk-UA only.
   */
  packageContentsHeading?: string;
}

/**
 * A document that satisfies every v4 rule this Story adds: §2 carries `bullets` Blocks only, the
 * combined §2 list is 3 + 3 = 6 items (v4's recommended target, under FR-17's ceiling of 8), every
 * §7 `value` is a single string, each functionality group has either 0 or ≥2 subsections, and
 * `packageContents` is populated.
 *
 * `packageContents` is not decoration: it is V15's `'4.0'` subject, and no other fixture here or in
 * the corpus carries one.
 */
export function v4ValidDoc(options: V4DocOptions = {}): ProductDescriptionDoc {
  const { locale = 'uk-UA', packageContentsHeading = V4_PACKAGE_CONTENTS_HEADING_UK } = options;

  const doc = v3BaseDoc();
  doc.locale = locale;
  doc.functionality = [
    {
      heading: 'Як працює лазерний модуль',
      blocks: [{ kind: 'paragraph', text: 'Діодний модуль фокусує промінь у пляму 0,08 мм.' }],
      // Two sub-functions, so the <h3> level is legitimate under v4 §3 and FR-27.
      subsections: [
        { heading: 'Діодний модуль', blocks: [{ kind: 'paragraph', text: 'Змінна голівка на 20 Вт.' }] },
        { heading: 'Система охолодження', blocks: [{ kind: 'paragraph', text: 'Активний обдув тримає 45 °C.' }] },
      ],
    },
    {
      heading: 'Як програмне забезпечення керує різанням',
      blocks: [{ kind: 'paragraph', text: 'LaserGRBL і LightBurn керують усіма режимами.' }],
    },
  ];
  doc.compatibility = { heading: 'Сумісність', blocks: [bulletsBlock(2, 'Сумісне обладнання')] };
  doc.packageContents = {
    heading: packageContentsHeading,
    items: ['Гравер Ortur H20 20 W', 'Лазерний модуль 20 Вт', 'Комплект кріплень'],
  };
  return asSchemaVersion4(doc);
}

/**
 * The `'4.0'` subject for the per-store × per-locale conformance matrix (V14).
 *
 * Shaped after `test/render-conformance.spec.ts`'s own `conformanceDoc()` — three figures, a video,
 * a nested `<h3>` and §5 compatibility — so the matrix exercises every renderer branch. Two
 * deliberate differences from that fixture:
 *
 *   · NO FIGURE AND NO VIDEO IN §2. FR-4 forbids both there for `'4.0'`, and moving them is exactly
 *     what puts FR-23's first-image rule in play: a figure the position walk never visits resolves
 *     to position 0 — the LCP slot — and ships without `loading="lazy"`. §3 functionality and §4
 *     applications are both visited by `forEachBlockInOrder`, which is why they are the destinations.
 *   · NO `packageContents`. §6 is conditional (FR-6), and its heading is validated by the D5
 *     membership check against the table for the document's locale — which a locale-parameterised
 *     fixture cannot supply without hard-coding ten headings. §6 is V15's subject, not V14's.
 *
 * Locale-neutral content on purpose: brand names, model numbers and metric units read the same in
 * every target language and cannot trip a calque check, and units carry the mandated space
 * ("165 mm", not "165mm") so `unit-spacing` stays quiet for the right reason.
 */
export function v4ConformanceDoc(locale: string): ProductDescriptionDoc {
  const doc = v3BaseDoc();
  doc.locale = locale;
  doc.localizedName = 'Formlabs Fuse 1';
  doc.hook = '<b>Formlabs Fuse 1</b> — SLS 3D printer with a 165 × 165 × 300 mm build volume.';
  doc.killerSpecs = [
    { label: 'Build volume', value: '165 × 165 × 300 mm', why: 'Fits a full nesting batch.' },
    { label: 'Layer height', value: '0.11 mm', why: 'Holds fine detail across the bed.' },
    { label: 'Laser power', value: '10 W', why: 'Sinters PA 12 at rated speed.' },
  ];
  doc.keyBenefits = [{
    kind: 'bullets',
    items: [
      { lead: 'Nesting. ', text: 'Uses the full 165 mm height.' },
      { lead: 'Powder reuse. ', text: 'Recovers up to 70 % of unsintered PA 12.' },
      { lead: 'Fuse Sift. ', text: 'Handles depowdering in one station.' },
    ],
  }];
  doc.functionality = [
    {
      heading: 'How the Fuse 1 print process works',
      blocks: [
        { kind: 'paragraph', text: 'Formlabs Fuse 1 operates at 165 mm build height.' },
        { kind: 'figure', ref: 0 },
      ],
      subsections: [
        { heading: 'PA 12 powder', blocks: [{ kind: 'paragraph', text: 'Rated at 1.01 g/cm³.' }] },
        { heading: 'Laser control', blocks: [{ kind: 'paragraph', text: 'Scans at 10 W rated power.' }] },
      ],
    },
    {
      heading: 'How the Fuse Sift workflow runs',
      blocks: [
        { kind: 'paragraph', text: 'Depowdering happens in one station.' },
        { kind: 'figure', ref: 1 },
        { kind: 'video', ref: 0 },
      ],
    },
  ];
  doc.applications = {
    heading: 'Applications',
    blocks: [{ kind: 'paragraph', text: 'Formlabs Fuse 1 covers short-run production.' }],
    items: [
      { scenario: 'Jigs. ', text: 'PA 12 parts survive shop-floor handling.' },
      { scenario: 'Ducting. ', text: 'Complex internal channels print unsupported.' },
      { scenario: 'Prototypes. ', text: 'Functional parts in 24 h.' },
      { scenario: 'Spares. ', text: 'On-demand replacements at 0.11 mm layers.' },
    ],
  };
  doc.compatibility = { heading: 'Compatibility', blocks: [{ kind: 'figure', ref: 2 }] };
  doc.specs = {
    heading: 'Technical specifications of Formlabs Fuse 1',
    categories: [
      { title: 'Print engine', rows: [{ label: 'Technology', value: 'SLS' }, { label: 'Laser', value: '10 W' }] },
      // Comma-joined into ONE string by the model — FR-9 / FR-10, the `'4.0'` shape.
      { title: 'Materials', rows: [{ label: 'Supported', value: 'PA 12, PA 11, PA 12 GB' }] },
    ],
  };
  doc.cta = {
    heading: 'Why buy Formlabs Fuse 1',
    text: 'Official warranty and service on every unit.',
  };
  doc.figures = [
    { file: 'fuse1-printer.jpg', alt: 'Formlabs Fuse 1 printer', caption: '<b>Fuse 1. </b>SLS printer.' },
    { file: 'fuse-sift.jpg', alt: 'Fuse Sift station', caption: '<b>Fuse Sift. </b>Depowdering station.' },
    { file: 'pa12-parts.jpg', alt: 'PA 12 printed parts', caption: '<b>PA 12. </b>Finished parts.' },
  ];
  doc.videos = [{
    src: 'https://www.youtube.com/embed/abc123',
    title: 'Formlabs Fuse 1 overview',
    caption: '<b>Overview. </b>Fuse 1 in operation.',
  }];
  return asSchemaVersion4(doc);
}

/**
 * The four `'3.0'` leak shapes re-emitted as `'4.0'`, for the V2 enforcement block.
 *
 * Returned as `unknown` on purpose — `ProductDescriptionDocSchema.safeParse(data: unknown)` is the
 * only consumer, so none of them needs the `ProductDescriptionDoc` type and none of them is
 * affected by C-1. This is the boundary the plan review drew, and it is what keeps this module
 * typecheckable before T3.
 */
export const v4Negatives = {
  /** FR-27 — one `<h3>` under a §3 H2. Expected issue path: `functionality.0.subsections`. */
  singleH3FunctionalityGroup: (): unknown => bumpVersion(v3SingleH3FunctionalityGroup()),
  /** FR-4 — a non-`bullets` Block in §2. Expected issue path: `keyBenefits.1.kind`. */
  nonBulletsKeyBenefits: (): unknown => bumpVersion(v3NonBulletsKeyBenefits()),
  /** FR-10 — an array `SpecRow.value`. Expected path: `specs.categories.0.rows.2.value`. */
  arraySpecValue: (): unknown => bumpVersion(v3ArraySpecValue()),
  /** FR-17 — a combined §2 list of twelve items. Expected path: `keyBenefits`. */
  overCeilingKeyBenefits: (): unknown => bumpVersion(v3OverCeilingKeyBenefits()),
};

/**
 * A document whose §1 hook runs well past v4's 40–85 word range.
 *
 * FR-18 is a NEGATIVE requirement: no validation rule may reject a generation on word count. This
 * fixture is what makes that assertable rather than assumed. The assertion is stated as "longer
 * than 85" rather than "exactly 86" on purpose — whether an em dash counts as a word is a
 * tokenizer quibble, and FR-18 is violated by ANY length-based rejection, not by one at 86.
 */
export function v4LongHookDoc(): unknown {
  const doc = v3BaseDoc();
  doc.hook = `<b>Ortur H20 20 W</b> — ${'слово '.repeat(83)}кінець.`;
  return bumpVersion(doc);
}

/** Word count of the rendered text of a hook, as FR-19 measures it. */
export function wordCount(text: string): number {
  return text.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

// ── helpers ──────────────────────────────────────────────────────────────────────────────────────

/**
 * Version-bumps a document for a `safeParse` call WITHOUT claiming the `ProductDescriptionDoc`
 * type — the shape `safeParse(unknown)` accepts and C-1 does not reach.
 */
function bumpVersion(doc: ProductDescriptionDoc): unknown {
  return { ...doc, schemaVersion: '4.0' };
}

/**
 * `n` bullet items whose leads end in a colon and whose texts open with a space — the separator
 * convention `BulletItemSchema`'s refine requires, and the one EXPERT3D's artifact uses.
 */
function bulletsBlock(n: number, leadPrefix: string): Block {
  return {
    kind: 'bullets',
    items: Array.from({ length: n }, (_, i) => ({
      lead: `${leadPrefix} ${i + 1}:`,
      text: ` пояснення номер ${i + 1}.`,
    })),
  };
}
