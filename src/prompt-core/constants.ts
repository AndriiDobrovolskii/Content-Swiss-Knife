import type { WebsiteGroup } from '../app/types';
import type { MasterScript } from '../utils/specs-grounding';

/** Canonical per-store registry. THE single place store facts are defined. */
export interface StoreProfile {
  group: WebsiteGroup;
  region: string;
  currency: string;
  currencySymbol: string;
  languages: string[];
  imageBaseUrl: string;
  siteSuffix: string;
}

export const STORE_REGISTRY: Record<string, StoreProfile> = {
  '3DDevice': { group: 'UA', region: 'Ukraine 🇺🇦', currency: 'UAH (₴)', currencySymbol: '₴', languages: ['en-GB', 'uk-UA', 'ru-UA'], imageBaseUrl: 'https://3ddevice.com.ua/image/catalog/products/', siteSuffix: '3DDevice' },
  '3DPrinter': { group: 'UA', region: 'Ukraine 🇺🇦', currency: 'UAH (₴)', currencySymbol: '₴', languages: ['en-GB', 'uk-UA', 'ru-UA'], imageBaseUrl: 'https://3dprinter.com.ua/image/catalog/Products/', siteSuffix: '3DPrinter' },
  '3DScanner': { group: 'UA', region: 'Ukraine 🇺🇦', currency: 'UAH (₴)', currencySymbol: '₴', languages: ['en-GB', 'uk-UA', 'ru-UA'], imageBaseUrl: 'https://3dscanner.com.ua/image/catalog/Products/', siteSuffix: '3DScanner' },
  'Center 3D Print': { group: 'EU', region: 'Poland & EU 🇵🇱', currency: 'PLN (zł) / EUR (€)', currencySymbol: 'zł', languages: ['pl-PL', 'en-GB', 'de-DE', 'uk-UA', 'ru-UA'], imageBaseUrl: 'https://center3dprint.com/image/catalog/Products/', siteSuffix: 'C3D' },
  'Drukarka 3D': { group: 'EU', region: 'Poland 🇵🇱', currency: 'PLN (zł)', currencySymbol: 'zł', languages: ['pl-PL', 'uk-UA'], imageBaseUrl: 'https://drukarka-3d.com.pl/image/catalog/products/', siteSuffix: 'Drukarka 3D' },
  'EXPERT3D': { group: 'ES', region: 'Valencia, Spain 🇪🇸', currency: 'EUR (€)', currencySymbol: '€', languages: ['en-ES', 'es-ES', 'pt-PT', 'uk-UA'], imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/', siteSuffix: 'EXPERT3D' },
  'Expert-3DPrinter': { group: 'US', region: 'Houston, TX 🇺🇸', currency: 'USD ($)', currencySymbol: '$', languages: ['en-US', 'es-MX', 'uk-UA'], imageBaseUrl: '', siteSuffix: 'Expert-3DPrinter' },
};

/**
 * The currency symbol `validateSeoMetadata` should check meta_description against, or `''` to skip
 * the check entirely.
 *
 * DELIBERATELY NOT `getStore(name).currencySymbol`. getStore is non-nullable — it falls back to a
 * default profile carrying `€` — so an unrecognised store would silently assert the WRONG currency
 * and emit a misleading warning on a Ukrainian or Polish storefront. Indexing the registry lets an
 * unknown name resolve to `''`, which disables the rule instead. No warning beats a wrong warning,
 * and `''` is the behaviour every call site had before this was wired up, so nothing can regress.
 *
 * One named function rather than six copies of `STORE_REGISTRY[x]?.currencySymbol ?? ''` at the
 * call sites: the rule sat dead for months precisely because `''` is a legal argument, and six
 * repetitions of a subtle expression is how it would quietly become `''` again.
 */
export function currencySymbolFor(storeName: string): string {
  return STORE_REGISTRY[storeName]?.currencySymbol ?? '';
}

export function getStore(name: string): StoreProfile {
  return STORE_REGISTRY[name] ?? {
    group: 'EU', region: 'Global/EU', currency: 'EUR (€)', currencySymbol: '€',
    languages: ['en-GB'], imageBaseUrl: '', siteSuffix: name,
  };
}

/**
 * Script of each store's MASTER artifact. Today every master is uk-UA, so every entry is
 * 'Cyrillic'. This map exists so that adding a store — or moving one to native per-locale
 * generation — is a compile-time decision instead of an inherited default. See the
 * specs-grounding fail-open PR, design note D2.
 */
const STORE_MASTER_SCRIPT: Record<string, MasterScript> = {
  '3DDevice': 'Cyrillic',
  '3DPrinter': 'Cyrillic',
  '3DScanner': 'Cyrillic',
  'Center 3D Print': 'Cyrillic',
  'Drukarka 3D': 'Cyrillic',
  'EXPERT3D': 'Cyrillic',
  'Expert-3DPrinter': 'Cyrillic',
};

export function masterScriptFor(storeName: string): MasterScript {
  return STORE_MASTER_SCRIPT[storeName] ?? 'Cyrillic';
}

/**
 * EXPERT3D — the ES-group storefront and its Tone of Voice.
 * The single predicate that gates every EXPERT3D-only ToV injection (Task A voice block,
 * Task C translation overlay). Equivalent to group === 'ES' but named for intent.
 *
 * This used to cover two storefronts; `Impresora-3D` was the store's OLD NAME, on the same
 * domain, and was retired from the registry. Group-based rather than name-based is now a
 * DEFAULT: a future ES-group store inherits this voice unless it is given its own. That is the
 * intended behaviour for a second Spanish storefront — but it is inheritance, not a coincidence,
 * so give any such store an explicit voice if it should not sound like EXPERT3D.
 */
export function isExpert3dStore(name: string): boolean {
  return getStore(name).group === 'ES';
}

/**
 * Center 3D Print — the single storefront running the "Style B" Tone of Voice (verb-led benefit
 * bullets, functional/question H2s, an operating-tips block, a consultative CTA).
 * The single predicate gating every C3D-only ToV injection (Task A voice block, Task C
 * translation overlay, per-locale overlays).
 *
 * DELIBERATELY NAME-BASED, NOT GROUP-BASED — do not "simplify" this to `group === 'EU'`.
 * Unlike isExpert3dStore (where EXPERT3D is the ONLY ES-group store, so the group and the voice
 * coincide), Center 3D Print shares group 'EU' with Drukarka 3D, which keeps the DEFAULT voice.
 * A group check would silently leak Style B onto Drukarka 3D's output.
 */
export function isCenter3dPrintStore(name: string): boolean {
  return name === 'Center 3D Print';
}

/**
 * Standalone Translator tool — its target-language list. Store-independent by design:
 * the Translator only translates text into a target language with correct orthography,
 * with NO store/market coupling (unlike the generation pipeline's Task C).
 * SINGLE SOURCE OF TRUTH — the UI dropdown (app.component.ts) and the prompt builder
 * (prompts/task-translate.ts) both derive from this array. Do not hardcode the list elsewhere.
 */
export const TRANSLATOR_LANGUAGES = [
  'English (en-GB)',
  'American English (en-US)',
  'American Spanish (es-US)',
  'European English (en-ES)',
  'Spanish (es-ES)',
  'Portuguese (pt-PT)',
  'Polish',
  'German',
  'Ukrainian',
  'russian',
] as const;
export type TranslatorLanguage = typeof TRANSLATOR_LANGUAGES[number];

export function bcp47ToTaskCLang(lang: string, group: WebsiteGroup): string {
  // English is a TRANSLATION TARGET (master is uk-UA). These labels are the ones
  // buildPromptC() dispatches on — see EU_EN_INSTRUCTION / usInstruction() in task-c.ts.
  if (lang === 'en-GB' || lang === 'en-ES') return 'European English';
  if (lang === 'en-US') return 'American English';
  if (lang === 'uk-UA') return group === 'US' ? 'Ukrainian' : 'UA';
  if (lang === 'ru-UA') return 'RU';
  if (lang === 'pl-PL') return 'PL';
  if (lang === 'de-DE') return 'DE';
  if (lang === 'es-ES') return 'ES';
  if (lang === 'es-MX') return 'American Spanish';
  if (lang === 'pt-PT') return 'PT';
  return lang;
}

/** The master/base locale of the whole pipeline. Every other locale is a translation of it. */
export const MASTER_LOCALE = 'uk-UA';

/**
 * Derives seoLangs and transLangs from STORE_REGISTRY — the single source of truth.
 * transLangs = every published language of the store EXCEPT the master (uk-UA), which is
 * generated natively by Task A. English is now a translation target like any other.
 */
export function getLangsForStore(storeName: string): { seoLangs: string[]; transLangs: string[] } {
  const store = getStore(storeName);
  return {
    seoLangs: store.languages,
    transLangs: store.languages
      .filter(lang => lang !== MASTER_LOCALE)
      .map(lang => bcp47ToTaskCLang(lang, store.group)),
  };
}

/** Reverse mapping: internal task label → BCP47 ISO code, given the store name. */
export function taskLangToIso(taskLabel: string, storeName: string): string {
  const store = getStore(storeName);
  for (const lang of store.languages) {
    if (bcp47ToTaskCLang(lang, store.group) === taskLabel) return lang;
  }
  return taskLabel;
}

/** Human-readable language name for LLM prompts, keyed by BCP47 ISO code. */
export function isoToHumanLang(iso: string): string {
  const map: Record<string, string> = {
    'en-GB': 'British English',
    'en-ES': 'English (for Spain, European style)',
    'en-US': 'American English',
    'uk-UA': 'Ukrainian',
    'ru-UA': 'Russian',
    'pl-PL': 'Polish',
    'de-DE': 'German',
    'es-ES': 'Castilian Spanish',
    'es-MX': 'Mexican Spanish',
    'pt-PT': 'European Portuguese',
  };
  return map[iso] ?? iso;
}

/** §2 killer-specs 2-column headers (post Step-B collapse), keyed by lowercase BCP47. */
export const KILLER_SPECS_HEADERS: Record<string, [param: string, benefit: string]> = {
  'uk-ua': ['Параметр', 'Ваша перевага'],
  'ru-ua': ['Параметр', 'Ваше преимущество'],
  'es-es': ['Parámetro', 'Su ventaja'],
  'es-mx': ['Parámetro', 'Su ventaja'],
  'es-us': ['Parámetro', 'Su ventaja'],
  'pt-pt': ['Parâmetro', 'A sua vantagem'],
  'pl-pl': ['Parametr', 'Twoja korzyść'],
  'de-de': ['Parameter', 'Ihr Vorteil'],
  'en-gb': ['Parameter', 'Your Advantage'],
  'en-es': ['Parameter', 'Your Advantage'],
  'en-us': ['Parameter', 'Your Advantage'],
};

/**
 * §2 killer-specs headers — CENTER 3D PRINT OVERRIDE. Style B confines direct second-person
 * address to the operating-tips block and the CTA (see C3D_TOV_BASE_OVERLAY SIGNATURE MOVE #3
 * and C3D_UK_LOCALE_TOV's REGISTER line); everywhere else the benefit is stated impersonally,
 * from the machine's point of view. The default pair ("Ваша перевага" / "Twoja korzyść" /
 * "Ihr Vorteil" / "Your Advantage") therefore violates this store's own voice, in §2, on every
 * product — and it is injected DETERMINISTICALLY by table-finalize.ts, never written by the
 * model, so no prompt rule can reach it.
 *
 * An OVERRIDE LAYER, not a replacement map: any locale absent here resolves through
 * KILLER_SPECS_HEADERS. Only Center 3D Print's five STORE_REGISTRY languages are listed (plus
 * the two other English variants, which carry identical text); es-ES/es-MX/pt-PT are omitted
 * deliberately because this store does not publish them — add a row if that ever changes.
 */
const KILLER_SPECS_HEADERS_C3D: Record<string, [param: string, benefit: string]> = {
  'uk-ua': ['Параметр', 'Практична користь'],
  'ru-ua': ['Параметр', 'Практическая польза'],
  'pl-pl': ['Parametr', 'Praktyczna korzyść'],
  'de-de': ['Parameter', 'Praktischer Nutzen'],
  'en-gb': ['Parameter', 'Practical benefit'],
  'en-es': ['Parameter', 'Practical benefit'],
  'en-us': ['Parameter', 'Practical benefit'],
};

/**
 * Resolves the §2 two-column header pair for a locale, honouring per-store ToV overrides.
 * Keeps the store decision here next to isCenter3dPrintStore, so table-finalize.ts stays a dumb
 * renderer — the same isolation mechanism every other ToV divergence uses.
 *
 * EXACT-KEY LOOKUP ON PURPOSE — returns `undefined` for an unrecognized locale rather than
 * falling back to English or base-language matching (do NOT switch this to resolveLocaleValue).
 * table-finalize.ts depends on that `undefined` to trigger its Optimizer fallback, which reuses
 * the header text the model already wrote for THAT document; the artifact is its own source of
 * truth for what language it is in. resolveLocaleValue would silently map e.g. 'es-AR' onto
 * 'es-es' and defeat it.
 */
export function getKillerSpecsHeaders(
  locale: string,
  storeName = '',
): [string, string] | undefined {
  const key = locale.toLowerCase();
  return (isCenter3dPrintStore(storeName) ? KILLER_SPECS_HEADERS_C3D[key] : undefined)
    ?? KILLER_SPECS_HEADERS[key];
}

/** §7 "Parameter/Value" table headers, keyed by lowercase BCP47 — see master-system-prompt.ts's
 *  own §7 localization table. Used by the Optimizer's post-processing (Generator's Task
 *  A/C output already carries LLM-authored localized headers natively). */
export const SPEC_TABLE_HEADERS: Record<string, [param: string, value: string]> = {
  'uk-ua': ['Параметр', 'Значення'],
  'ru-ua': ['Параметр', 'Значение'],
  'es-es': ['Parámetro', 'Valor'],
  'es-mx': ['Parámetro', 'Valor'],
  'es-us': ['Parámetro', 'Valor'],
  'pt-pt': ['Parâmetro', 'Valor'],
  'pl-pl': ['Parametr', 'Wartość'],
  'de-de': ['Parameter', 'Wert'],
  'en-gb': ['Parameter', 'Value'],
  'en-es': ['Parameter', 'Value'],
  'en-us': ['Parameter', 'Value'],
};

/** Localized "General Information" spec-category label, keyed by lowercase BCP47 — used to
 *  dissolve small spec categories (see spec-category-merge.ts). */
export const BASE_CATEGORY_LABELS: Record<string, string> = {
  'uk-ua': 'Загальні відомості',
  'ru-ua': 'Общие сведения',
  'es-es': 'Información general',
  'es-mx': 'Información general',
  'es-us': 'Información general',
  'pt-pt': 'Informações gerais',
  'pl-pl': 'Informacje ogólne',
  'de-de': 'Allgemeine Informationen',
  'en-gb': 'General Information',
  'en-es': 'General Information',
  'en-us': 'General Information',
};

/** Resolves a value from a locale-keyed map: exact match first, then a same-base-language match
 *  anchored on the hyphen boundary (so a short/unusual locale string like `'e'` can't accidentally
 *  match `'en-gb'`), then `fallback`. */
export function resolveLocaleValue<T>(map: Record<string, T>, locale: string, fallback: T): T {
  const norm = locale.toLowerCase();
  if (map[norm] !== undefined) return map[norm];
  const baseLang = norm.split('-')[0];
  const matchingKey = Object.keys(map).find(k => {
    const keyNorm = k.toLowerCase();
    return keyNorm === baseLang || keyNorm.startsWith(baseLang + '-');
  });
  return matchingKey !== undefined ? map[matchingKey] : fallback;
}

/** Brand lists per store group. */
export const BRANDS_ES = ['Raise3D', 'Formlabs', 'xTool', 'Shining3D', 'XGRIDS', 'PUDU', 'Metal3D'];
export const BRANDS_DEFAULT = [
  'KLEMA', 'Formlabs', 'CreatBot', 'Raise3D', 'UltiMaker', 'MakerBot', 'Markforged', 'Omni 3D',
  'Shining3D', 'Peel 3D', 'Creaform', 'Revopoint', 'Scantech', 'Surphaser', 'Thunk3D', 'E-PLUS 3D',
  'Fastform', 'xTool', 'Magigoo', 'Aesub', 'Bambu Lab', 'PUDU', 'Metal3D',
];

/**
 * Brand-guarantee sentence used in the COMMERCIAL CLOSING / CTA-TRUST block (Schema v3 §9).
 * Variant: "100% authenticity + fair price" — niches with counterfeit risk (3D printing/scanning).
 * Alternatives if needed:
 *   - "genuine products"   — if price transparency not needed
 *   - "expert support"    — complex technical products
 *   - "transparent pricing" — if price transparency matters
 */
export const BRAND_GUARANTEE_EN =
  `As an official representative of [Brand], we guarantee 100% authenticity, fair price, authorized service, and an official warranty.`;

/**
 * Numeric provenance rule for image text. A LANGUAGE-LEVEL fidelity rule, not a store/ToV
 * overlay — it applies to every task, every store and every language version, and reaches the
 * master prompt by riding NUMBER_FORMAT_RULES, which master-system-prompt.ts interpolates. That
 * makes it systemBlocks[0] for Task A, Task C and the Optimizer alike.
 *
 * Real defect it closes: an <img alt> read "лазерна головка 40 Вт" for a product whose source
 * specs state 20 W — a breach of the CLAUDE.md criterion that spec values are reproduced with
 * 100% fidelity and never invented. Numbers are the one part of an alt/figcaption where the
 * distinctness rule ("vary the wording") has no legitimate application, so this is absolute
 * rather than advisory.
 *
 * The upstream half of the fix lives in vision-prepass.ts: a wrong figure is usually COPIED
 * faithfully from a manifest caption that read it off a promo banner, not invented by Task A.
 * The deterministic half is alt-numeric-fidelity.ts, which fails the repair gate on any figure
 * this rule failed to prevent.
 */
export const NUMERIC_SOURCE_FIDELITY_RULES = `[NUMERIC FIDELITY IN IMAGE TEXT — alt and figcaption]
Every number-plus-unit you write inside an alt="" or a <figcaption> MUST appear in the source input
for THIS product — [Technical Specs], [Raw Description], or that image's own manifest caption.
Reproduce it; never infer it, never round it, never carry it over from a sibling model, a
marketing banner, or another product in the same family.
- Covers wattage, laser/spot size, speed, accuracy, dimensions, build volume, temperature, weight,
  capacity, runtime, resolution and price alike.
- WHEN THE SOURCE DOES NOT STATE THE FIGURE: describe the subject QUALITATIVELY instead of
  numerically ("the laser head assembly", "the enclosed work area"). An alt text with no number is
  correct; an alt text with a plausible-looking wrong number is a factual error.
- WHEN THE SOURCE STATES A DIFFERENT FIGURE: the source wins. Never let an on-image label, a
  filename or a caption override [Technical Specs].
- PRECEDENCE OVER THE MANIFEST CAPTION — FOR NUMBERS ONLY: this overrides the [IMAGE HANDLING]
  instruction to reuse a supplied manifest caption VERBATIM. If a manifest caption carries a
  number+unit that [Technical Specs] does not state, or contradicts, DROP that figure and keep the
  rest of the caption unchanged. Never substitute a different number in its place. Everything else
  in the IMAGE GROUNDING LOCK stands: you still add no comparison, direction, metric, cause or
  result the caption does not carry.
SELF-CHECK BEFORE OUTPUT:
- [ ] Re-read every alt="" and every <figcaption>. For each number+unit in them, point to the exact
      line of [Technical Specs] / [Raw Description] / the manifest caption it came from. Delete any
      figure you cannot point to, and rewrite that phrase qualitatively.`;

/**
 * Locale-aware decimal/thousands separator rules (Schema v3 Appendix).
 * Applies EVERYWHERE a number is written — body prose, headings, captions, CTA copy, AND
 * spec-table cells alike — for every generated language. Only the separator punctuation
 * localizes; the digits themselves and the unit must stay identical to the source
 * (CLAUDE.md "don't change values or units" governs the quantity, not its notation).
 */
export const NUMBER_FORMAT_RULES = `[NUMBER FORMATTING — by locale, applies everywhere]
Format every decimal/large number per the target locale's separator convention — in running
text, headings, captions, AND spec-table <td> cells alike. Never change the digits or the
unit; only the separator punctuation localizes.
- uk-UA / ru-UA: decimal comma, thousands non-breaking space  → 1 234 567,89
- pl-PL:         decimal comma, thousands non-breaking space  → 1 234 567,89
- de-DE:         decimal comma, thousands dot (or space)      → 1.234.567,89
- es-ES:         decimal comma, thousands dot (or space)      → 1.234.567,89
- en-GB / en-ES: decimal dot, thousands comma                 → 1,234,567.89
- en-US:         decimal dot, thousands comma                 → 1,234,567.89
- es-US / es-MX (US market, CLDR): decimal dot, thousands comma → 1,234,567.89

${NUMERIC_SOURCE_FIDELITY_RULES}`;

/**
 * Per-locale sentence-length budget. A LANGUAGE-LEVEL quality rule (like NUMBER_FORMAT_RULES),
 * NOT a store/ToV overlay: it applies to EVERY task, EVERY store, EVERY generated and translated
 * language version, and is injected once into the master prompt. Values are words-per-sentence,
 * calibrated per language because the same meaning costs a different word count across languages
 * (German compounds + verb-final frame → fewest words; Romance expansion → most; Slavic drops
 * articles but words run longer). The English band is grounded in the comprehension curve
 * (~14 words ≈ 90% comprehension, sharp drop after 25); other bands are derived from the
 * language-adapted readability formulas + text-expansion factors. Averages over a section, with a
 * hard per-sentence ceiling. Also the AEO/GEO sweet spot: answer engines extract the first 1–2
 * sentences of a section, so the opening sentence must be short and self-contained.
 */
export interface SentenceLengthBand {
  hero: [number, number];
  body: [number, number];
  faq: [number, number];
  ceiling: number;
}

/**
 * Machine-readable mirror of the table printed in SENTENCE_LENGTH_RULES below, keyed by lowercase
 * BCP47. The prose stays authoritative FOR THE MODEL; this map is authoritative FOR CODE
 * (sentence-length.ts). A spec test parses the prose table and asserts every ceiling agrees, so
 * the two cannot drift.
 *
 * WHY NOT GENERATE THE PROSE FROM THIS MAP: the table is interpolated into MASTER_SYSTEM_PROMPT,
 * a `cache: true` system block for every store. Re-emitting it programmatically would change its
 * bytes and cold-start every prompt-cache slot in the system for a purely cosmetic gain. A test
 * is the cheaper guarantee.
 *
 * uk-UA / ru-UA ceiling is 20, NOT the 25 in the Center 3D Print ToV source document — see the
 * C3D_TOV_BASE_OVERLAY doc comment: the stricter global figure wins and the store overlay
 * deliberately does not restate the looser one.
 */
export const SENTENCE_LENGTH_BANDS: Record<string, SentenceLengthBand> = {
  // BODY upper bounds are held at ~0.72 x ceiling. That ratio is not arbitrary: en-GB/en-ES already
  // sat there and never produced a sentence-too-long warning, while uk-UA (0.80) and de-DE (0.83)
  // were the tightest and were exactly where real generations overshot — 21/22/22 words against the
  // uk-UA ceiling of 20 (Ortur H20 20 W, Center 3D Print, 2026-07-27). The model cannot count its
  // own words, so the target must sit far enough below the ceiling that a normal overshoot still
  // lands under it. Same doctrine as task-a.ts's consumables rule ("AIM LOW (~2100) to leave
  // headroom; budget words, do not measure").
  //
  // Ceilings are acceptance criteria and deliberately NOT moved — lowering one would hide the
  // problem rather than fix it. hero/faq are untouched: both already carry far more headroom and
  // neither produced a violation.
  'en-gb': { hero: [9, 14], body: [15, 18], faq: [10, 15], ceiling: 25 },
  'en-es': { hero: [9, 14], body: [15, 18], faq: [10, 15], ceiling: 25 },
  'en-us': { hero: [8, 12], body: [14, 16], faq: [9, 14], ceiling: 22 },
  'de-de': { hero: [8, 12], body: [11, 13], faq: [8, 13], ceiling: 18 },
  'es-es': { hero: [10, 15], body: [15, 19], faq: [12, 16], ceiling: 27 },
  'es-mx': { hero: [9, 13], body: [14, 17], faq: [10, 15], ceiling: 24 },
  'pl-pl': { hero: [8, 13], body: [13, 16], faq: [10, 15], ceiling: 22 },
  'uk-ua': { hero: [8, 12], body: [12, 14], faq: [9, 14], ceiling: 20 },
  'ru-ua': { hero: [8, 12], body: [12, 14], faq: [9, 14], ceiling: 20 },
};

export const SENTENCE_LENGTH_RULES = `[SENTENCE LENGTH — by locale, applies everywhere, every language version]
Write to a words-per-sentence budget calibrated for the TARGET language. The range is a PER-SENTENCE
target, not a section average: you cannot count your own words, so aim at the MIDDLE of the band and
treat the ceiling as a hard failure threshold you never approach. Vary length for rhythm (mix short
and medium) — do NOT make every sentence the same length.
Sections: HERO = opening/intro paragraph · BODY = feature→benefit + technical-explanation prose ·
FAQ = the FIRST sentence of every answer (supporting sentences may sit at the BODY band).
                    HERO     BODY      FAQ-1st   ceiling
- en-GB / en-ES:    9–14     15–18     10–15     25
- en-US:            8–12     14–16     9–14      22
- de-DE:            8–12     11–13     8–13      18   (compounds + Satzklammer — keep shortest)
- es-ES:            10–15    15–19     12–16     27   (Romance expansion — highest budget)
- es-MX:            9–13     14–17     10–15     24
- pl-PL:            8–13     13–16     10–15     22
- uk-UA / ru-UA:    8–12     12–14     9–14      20   (no articles, long words — split long clauses)
UNIVERSAL (all locales): one idea per sentence; open each section AND each FAQ answer with a
complete, self-contained statement (answer-first); front-load subject + key attribute (product +
spec) at the sentence start; anchor technical sentences on a concrete figure. Avoid nested/
subordinate pile-ups (uk/ru дієприслівникові звороти; de Schachtelsätze).
NEVER run an enumeration of 3+ items into a single sentence — split it across sentences, or emit it
as <ul><li>. This governs the §9 trust points specifically: state them as separate sentences, never
as one comma chain. A run-in list is the most common way a sentence silently passes the ceiling.
[ON TRANSLATION] "Preserve structure" governs HTML only (sections, classes, <hr>) — NOT sentence
boundaries. If a source English sentence would exceed the TARGET band, SPLIT it; if the target
language is terser, you may MERGE. Re-fit to the target band instead of mirroring English sentence
structure 1:1 (critical for de-DE and uk-UA/ru-UA).`;

/** US mixed measurement rule — the ONLY copy. */
export const US_MEASUREMENT_RULES = `[MEASUREMENT SYSTEM — MIXED US STANDARD]
CONVERT to Imperial: Printer Dimensions → inches, Build Volume → inches, Printer Weight → lbs, Filament Spool Weight → lbs (oz for small samples).
KEEP in Metric: Layer Thickness → μm, Filament Diameter → mm, Nozzle → mm, Temperature → °C, Print Speed → mm/s, Resin Volume → L/ml.`;

/**
 * Single source of truth for unit-abbreviation localization across the whole pipeline.
 * Interpolated into MASTER_SYSTEM_PROMPT, task-c (generic + US_UK) and referenced by task-slug.
 * Language-driven, not store-driven: applies to uk-UA / ru-UA output on EVERY storefront.
 * Deterministic backstops: number-format-fixer (spacing) and output-validator
 * (latin-unit-in-cyrillic-text warning).
 */
export const UNIT_LOCALIZATION_RULES = `[UNIT LOCALIZATION]
LATIN-SCRIPT LANGUAGES (en-GB/en-US/en-ES, pl-PL, de-DE, es-ES, es-MX, pt-PT): keep ALL international
unit abbreviations unchanged (mm, kg, W, kW, GHz, GB…). Never invent localized abbreviations.
Lowercase "l" for litre in pl (litr); "L" acceptable in en/de.

CYRILLIC LANGUAGES (uk-UA, ru-UA) — cyrillize EVERY unit abbreviation in ALL visible text,
including spec-table cells, alt="", title="", figcaptions and repeated Product Names.
Only the abbreviation script changes; the numeric value NEVER changes. Spacing rule still
applies ("200 mm" → "200 мм", "10W" → "10 Вт").
  Length:      mm→мм, cm→см, m→м, km→км, μm/µm→мкм, nm→нм
  Mass:        kg→кг, g→г, mg→мг
  Power:       W→Вт, kW→кВт, mW→мВт
  Voltage:     V→В, kV→кВ, mV→мВ
  Current:     A→А, mA→мА
  Frequency:   Hz→Гц, kHz→кГц, MHz→МГц, GHz→ГГц
  Volume:      L/l→л, ml→мл
  Data:        GB→ГБ, MB→МБ, TB→ТБ
  Bitrate:     Mbit/Mb→Мбіт (uk) / Мбит (ru), Gbit→Гбіт (uk) / Гбит (ru)
  Speed:       mm/s→мм/с, m/s→м/с
  Area/Volume: m²→м², m³→м³, cm²→см², cm³→см³
  Capacity:    mAh→мА·год (uk) / мА·ч (ru)
  Rotation:    rpm→об/хв (uk) / об/мин (ru)
  Time:        min→хв. (uk) / мин. (ru), h→год. (uk) / ч (ru), s→с
  Composite units cyrillize part-by-part (kg/h → кг/год (uk) / кг/ч (ru)).
KEEP UNCHANGED in uk/ru (fixed exception list — technical convention): °C, °F, VAC / V AC
(full form "вольт змінного струму / вольт переменного тока" is too long for tables/UI),
dpi, px, fps, K (colour temperature, e.g. "6500 K"), ppm, and any inch marks in US-market
content. Any unit NOT listed anywhere above: keep as in source, do not guess.
[NUMBER SEPARATOR REMINDER] Decimal comma for uk/ru/pl/de/es-ES ("1.5 kW" → "1,5 кВт");
decimal dot for en-GB/en-US/en-ES/es-MX. Separator rules live in [NUMBER FORMATTING].`;

export const METRIC_MEASUREMENT_RULES = `[MEASUREMENT] Use standard Metric units (mm, kg, °C).
SPACING IS MANDATORY: a single space between number and unit everywhere (body, table cells, alt text).
✅ "10 W", "1.75 mm", "200 °C", "-5 °C – 50 °C"   ❌ "10W", "1.75mm", "200°C"
Normalize spacing even if the source omits it ("10W" → "10 W").`;

/**
 * Product-name localization rule (Schema v3 §0/§7/§9 consistency) — THE single copy.
 * Shared by the master system prompt (Task A/B native generation) AND Task C (translation),
 * so the Product Name localizes identically no matter which path produced the language version.
 * Behaviour: the GENERIC DESCRIPTIVE CATEGORY (e.g. "Reflective Markers") is TRANSLATED and, for
 * non-English locales, placed FIRST (category-first); brand/sub-brand/model stay Latin in the
 * middle; embedded units, number separators, and the count abbreviation localize. English keeps
 * brand-first order. Count abbreviation split: es-ES "uds" vs es-MX "pzas".
 */
export const PRODUCT_NAME_LOCALIZATION = `[PRODUCT NAME LOCALIZATION — localize the Product Name in EVERY place it appears]
The Product Name recurs in the hook <p>, the §2 killer-specs table heading, spec-table <h2>/<h3>,
the §7 "Technical specifications of the [Product Name]" header, figure captions, and the §9
commercial-closing H2 — render it in ONE consistent localized form across all of them.

Split the Product Name into three parts and treat each differently:
1. GENERIC DESCRIPTIVE CATEGORY — the common noun(s) naming WHAT the product is
   ("Reflective Markers", "Filament", "Resin", "Build Plate", "Cleaning Kit"). TRANSLATE it into the
   target language using natural, normative terminology (anti-anglicism rules apply).
2. BRAND / SUB-BRAND / MODEL — proper names ("Shining3D", "EinScan", "EINSTAR VEGA", "Bambu Lab",
   "Creality Ender") AND material/consumable TRADE NAMES ("Nylon 12 Powder", "Nylon 11 GF Powder",
   "PA12", "PETG-CF"). KEEP in original Latin script — NEVER translate or transliterate, even when
   the same word appears generically elsewhere in the text (see anti-anglicism rule for the
   generic-noun case).
3. EMBEDDED SPECS — dimensions and quantities ("12 mm", "1500 pcs"). Localize units, number
   separators and the count abbreviation (below); never change the digits.

WORD ORDER:
- English (en-GB / en-ES / en-US): brand-first → [Brand Model] [Descriptive] [specs].
- uk-UA / ru-UA / pl-PL / de-DE / es-ES / es-MX / pt-PT: category-first → [Translated descriptive]
  [Brand Model] [specs].

COUNT / QUANTITY ABBREVIATION ("pcs" / "pieces" / "units" / "pack"):
  Ukrainian (uk-UA) → "шт."  ·  Russian (ru-UA) → "шт."  ·  Polish (pl-PL) → "szt."  ·
  German (de-DE) → "Stk"  ·  Castilian Spanish (es-ES) → "uds"  ·
  Mexican Spanish (es-MX) → "pzas"  ·  European Portuguese (pt-PT) → "un."  ·
  English (en-GB / en-ES / en-US) → "pcs".
  uk/ru/pl carry a trailing period (correct abbreviation orthography); de/es/en/pt do not.
  This form is identical everywhere the count appears — Product Name, spec-table quantity rows,
  running text — never drop the period in one place and keep it in another.
UNITS → follow the unit rules above ([CYRILLIC UNITS] / [UNITS]): "12 mm" → uk/ru "12 мм"; keep
Latin for en/pl/de/es. NUMBER SEPARATORS → follow the number-format rules above ([NUMBER FORMATTING]
/ [NUMBERS]). The digits never change.

WORKED EXAMPLE — source "Shining3D EinScan Reflective Markers 12 mm 1500 pcs":
  en-GB / en-ES / en-US → Shining3D EinScan Reflective Markers 12 mm 1500 pcs
  es-ES → Marcadores reflectantes Shining3D EinScan 12 mm 1500 uds
  es-MX → Marcadores reflectantes Shining3D EinScan 12 mm 1500 pzas
  uk-UA → Відбиваючі маркери Shining3D EinScan 12 мм 1500 шт.
  ru-UA → Маркеры отражающие Shining3D EinScan 12 мм 1500 шт.
  pl-PL → Markery odbijające Shining3D EinScan 12 mm 1500 szt.
  de-DE → Reflektive Marker Shining3D EinScan 12 mm 1500 Stk
  pt-PT → Marcadores refletores Shining3D EinScan 12 mm 1500 un.

EDGE CASE — if the name is purely brand + model with NO generic descriptor (e.g. "Bambu Lab X1
Carbon"), there is nothing to translate or reorder: keep brand/model Latin and only localize the
embedded units / numbers / counts.
Never add, drop, or invent tokens; aside from the descriptive↔brand reordering above, preserve token
order and identical numeric values — only the translated descriptor, unit script, separators, and
count abbreviation change.`;

/**
 * Simplified HTML schema for consumable products (filament / resin / adhesive).
 * Used by task-a.ts when templateId === 'consumables-resin'.
 * Overrides Schema v3.0 §1–§9. All other master-prompt rules stay in effect:
 * unit cyrillization, number separators, no H1, no microdata, anti-anglicism.
 * Hard visible-text limit: 2 500 characters (HTML tags stripped).
 */
export const CONSUMABLES_SIMPLIFIED_SCHEMA =
  `[CONSUMABLES SIMPLIFIED SCHEMA — overrides Schema v3.0 §1–§9]
Product is a consumable material (filament / resin / adhesive). Use this schema exclusively.
IGNORE: §1 Hook, §2 Killer Specs, §3 Functionality, §4 Applications, §5 Compatibility,
        §6 Package Contents, §9 CTA-TRUST from the master [CONTENT STRUCTURE].
KEEP ALL OTHER MASTER RULES: unit cyrillization, number separators, no H1, no microdata, anti-anglicism.

TARGET LENGTH: ~2100 visible characters (HTML tags stripped). HARD CEILING: 2500 — validation FAILS above this.
You cannot count your own characters, so AIM LOW (~2100) to leave headroom; budget words, do not measure.
Translations into German/Russian/Spanish expand 10–30% vs. English — that headroom is what keeps them under 2500.
Write efficiently — never pad to a minimum length.

SECTIONS — emit in this exact order, no extras:

§C1 HOOK  (plain <p>, 40–60 words)
  What the material is + base polymer/chemistry. Core differentiating property.
  Primary workflow it serves. No heading. No <section> wrapper.
  ANTI-REPETITION: identify the descriptive root in the Product Name (e.g. "Reflective"/"Marker",
  "Filament"/"PLA"). State that concept ONCE. If you need to reference it again in the same
  paragraph, use a different word or a pronoun — NEVER a cognate of the same root (e.g. do not
  follow "Reflective Markers" with "retroreflective… marker-based"). Before finalizing, re-read the
  hook and rewrite if any root/cognate appears twice.
  BODY-WIDE ANTI-REPETITION (§C1–§C6): the same rule applies across the WHOLE description, not just
  the hook. Within any one bullet or paragraph, do not repeat a content root in successive sentences
  (e.g. "виявлення… виявлення", "діапазону… діапазону", "range… range"). Vary with domain synonyms:
  detection→capture/registration, range→reach/distance, target/marker→point/reference point. Spec
  values are exempt — never alter a number or unit to avoid repetition.

§C2 FEATURES & MATERIAL PROPERTIES  (<h2> + <ul>, 4–6 items)
  en H2: "Features & Material Properties"
  Each <li>: <b>[Feature label.]</b> [1–2 sentences — concrete outcome, no marketing fluff.]

§C3 APPLICATIONS  (<h2> + <ul>, 3–4 items)
  en H2: "Applications"
  Each <li>: <b>[Scenario]:</b> [1 sentence on what this material enables here.]

§C4 PRINT SETTINGS + SPEC TABLES  (one <h2> per parameter group)
  en H2: "Print Settings" (required if printing parameters are provided)
  Optional: one-sentence print tip (e.g. active-cooling recommendation).
  Table: <div class="table-responsive"><table><tbody>
    <tr><td>[Parameter]</td><td>[Value + unit]</td></tr>
  </tbody></table></div>
  PARAMETER LABELS: each [Parameter] must read as a self-contained noun phrase ("Inner diameter",
  "Markers per sheet", "Total markers") — never a clipped sentence fragment.
  COUNT/QUANTITY ROWS (MANDATORY): a quantity row is any row whose Value is a count of discrete
  items (markers/sheets/pieces/units per sheet/pack/box, or a grand total). EVERY such row MUST
  carry the count abbreviation in its Value cell — no bare integers. Apply it uniformly: if the
  total row has it, the per-sheet and per-pack rows MUST have it too. Localized form:
    en "15 pcs" · uk/ru "15 шт." (WITH trailing period) · pl "15 szt." · de "15 Stk" ·
    es-ES "15 uds" · es-MX "15 pzas" · pt-PT "15 un.".
  Self-check before output: scan every quantity row; if any shows a bare number, add the abbreviation.
  If mechanical properties provided → add separate <h2> + table. en H2: "Mechanical Properties"
  If physical properties provided   → add separate <h2> + table. en H2: "Physical Properties"
  NO <thead>. NO <h3>. NEVER invent parameter values.

§C5 STORAGE GUIDELINES  (<h2> + <ul>, 2–3 items)
  en H2: "Storage Guidelines"
  Each <li>: <b>[Label]:</b> [concrete storage/handling instruction.]

§C6 CLOSING CTA  (<hr> + plain <p>, 1–2 sentences)
  Product name + store name + availability/shipping.
  One internal category link where contextually natural. No <p class="cta">. No H2.

FORBIDDEN for consumables:
  §2 Killer-Specs 3-column table · §3 Functionality H2/H3 blocks · §5 Compatibility section
  §6 Package Contents · <section class="specs"> · itemprop / microdata · <h3> · <p class="cta">`;
/**
* Translation overlay for consumables. Appended to whichever task-c instruction is
* selected when templateId === 'consumables-resin'. Stops the translator from re-inflating
* the simplified §C1–§C6 structure into a printer/scanner-style description, and carries the
* 2500-char limit into every target language (DE/RU expand vs EN). Single source of truth.
*/
export const CONSUMABLES_TRANSLATION_OVERLAY =
  `[CONSUMABLES MODE — TRANSLATION OVERLAY — these rules WIN over any [LABELS]/closing-H2 instruction above]
The source uses the CONSUMABLES SIMPLIFIED SCHEMA (§C1–§C6), NOT Schema v3.0.
Translate it AS-IS. Do NOT restructure it into a printer/scanner-style description.

- NO "What's in the box" / Package Contents section exists here. If a [LABELS] line mentions one, IGNORE it — emit none.
- The closing CTA is a plain <p> after <hr> (§C6). DO NOT convert it into a "Why buy … from [Store]?" H2 block. Keep it a short closing paragraph.
- DO NOT add Killer-Specs 3-column table, Functionality, or Compatibility sections — they are absent from the source.
- Translate only the §C2/§C3/§C4/§C5 H2 headings actually present.
- COLON CAPITALIZATION in §C2/§C3/§C5 items ("<b>Label:</b> continuation"): for uk-UA, ru-UA,
  pl-PL — lowercase the first letter after the colon (it introduces an explanation of the bold
  label, not a new sentence; house style — uk "Великі об'єкти: автомобільні панелі…" NOT
  "…: Автомобільні…"). For de-DE keep the German default (capitalize when a complete clause
  follows — that is correct German orthography). For en-GB/en-ES/en-US keep the English default
  (capitalized, as a sentence).
- SPEC-TABLE PARAMETER RE-NOMINALIZATION: translating a §C4 quantity [Parameter] (EN "Markers per
  sheet" / "Sheets per pack" / "Total markers") word-for-word often lands in the genitive/partitive
  case and reads like a clipped sentence — WRONG, e.g. uk "Маркерів на аркуші", ru "Маркеров на
  листе". Rephrase as a clean nominative noun phrase, adding a quantity head-noun if needed: uk
  "Кількість маркерів на аркуші" / "Кількість аркушів у наборі" / "Загальна кількість маркерів";
  ru "Количество маркеров на листе" / "Количество листов в наборе" / "Общее количество маркеров";
  pl "Liczba znaczników na arkusz" / "Liczba arkuszy w opakowaniu" / "Łączna liczba znaczników".
  Apply the same nominative-phrase check to every other §C4 label in the target language.
- COUNT-ABBREVIATION CONSISTENCY: if the source table's quantity rows carry the count abbreviation
  inconsistently, FIX it on translation — every quantity row gets the same localized abbreviation,
  not just the total row. Forms: uk/ru "шт." (WITH trailing period), pl "szt.", de "Stk",
  es-ES "uds", es-MX "pzas", pt-PT "un.". Add it to any quantity row that shows a bare integer.
- BODY-WIDE ANTI-REPETITION also applies to the translation: do not let a content root repeat in
  successive sentences of any §C1–§C6 bullet/paragraph; vary with target-language synonyms. Never
  alter spec values to do so.
- ANTI-ANGLICISM (target language only — applies to uk-UA, ru-UA, pl-PL, de-DE, es-ES, es-MX):
  before finalizing, scan the draft for unnecessary English loanwords/calques and replace with the
  native term, using this classification:
    BAD (jargon/anglicism/morphological calque) — e.g. uk "ретровідбиваючі" (mechanical "-ючі" calque,
    not a real Ukrainian adjective form), "прінт", "софт".
    GOOD (native/normative equivalent) — uk "світловідбивальний" or, in technical/ДСТУ context,
    "світлоповертальний" (replaces "ретровідбиваючі"); "друк" (not "прінт"); "ПЗ" (not "софт").
    ALLOWED (no direct native equivalent — established technical/industry term, keep as-is):
    filament, nozzle, extruder, scanner/skaner/сканер, USB, Wi-Fi.
  Prefer the literary/normative adjective form over inventing a hybrid calque of the English or
  Russian root. When in doubt whether a term is BAD or ALLOWED, default to the native form.
  EDITOR-LOCKED TERMS (uk-UA, confirmed against gold-edited reference, takes precedence over any
  literal translation): "reference point(s)" → "реперна(-і) точка(-и)" (NOT "опорна точка" /
  "референсна точка"); "digitisation/digitalization" → "оцифрування" (already standard — do not
  drift to "діджитизація"/"цифровізація"). Apply the same precedence logic in ru/pl/de/es when an
  equivalent editor-confirmed term exists in the glossary.

HARD LIMIT: translated visible text (HTML tags stripped) MUST stay at or below 2100 characters (ceiling 2500).
Since you cannot count characters, COMPRESS structurally: keep §C2/§C3/§C5 bullets to one short sentence each, drop adjectives. Never pad, never add sentences.
If the target language expands vs. the source, COMPRESS §C2/§C3/§C5 prose to stay under the limit. Never pad, never add sentences.
Preserve every spec-table row and numeric value verbatim (only localize unit/separator as instructed above).`;

/**
 * EXPERT3D Tone of Voice — BASE-GENERATION overlay (Task A only, EXPERT3D).
 * Added as an extra CACHED system block AFTER master + task-a instruction, so the shared
 * master+task prefix stays byte-stable (cache hit) for every other store and EXPERT3D just
 * gets one additional cached suffix (its own cache slot). Encodes brand character, the
 * forbidden-word list and the Fact -> Mechanism -> Consequence formula. Product-agnostic:
 * no product-specific few-shots that would bias unrelated categories. Register and loanword
 * rules are per-locale and live in EXPERT3D_TOV_TRANSLATION_OVERLAY instead.
 */
export const EXPERT3D_TOV_BASE_OVERLAY =
  `[EXPERT3D BRAND VOICE — applies to this store's base generation and every language version]
Write as EXPERT3D: a technical partner that sells solutions, not boxes. The narrator is an
experienced engineering consultant who knows the product and respects the reader's time —
not a salesperson, not an enthusiast.

TONE:
- Confident, never boastful. Technically precise, but readable without a glossary.
- Emotionally neutral: no excitement, no exclamation marks.
- Every claim is backed by a concrete figure or a mechanism — never vague.
- Respect the reader: do not explain the obvious; do surface the non-obvious.

VOICE FORMULA (apply throughout — especially "Why it matters" cells, key benefits, applications):
  Fact -> Mechanism -> User consequence.
  e.g. "A 0.2 mm nozzle forms a narrower extrusion path, sharpening the boundary between colour
  overlap zones." — parameter + how it works + what the buyer gets, in one sentence.

FORBIDDEN WORDS (all languages — extends the master fluff ban): revolutionary, innovative,
cutting-edge, advanced, best, incredible, amazing, fantastic, perfect choice, must-have,
top product, game-changer, "quality on point", "exceeds expectations", "buy now", "don't miss
out". Replace each with a specific fact or number.
  BAD  "High-quality filament / excellent print results / easy to use"
  GOOD "±0.02 mm diameter tolerance across all four spools / even colour saturation on 0.2 mm
       details / no manual profile calibration when HEX values match"

Keep the schema's mandated section order and headings — the ToV changes the WORDING and the
evidence discipline, not the structure. In Applications, every entry states a concrete scenario
plus what makes THIS product the right tool for it (the differentiator vs alternatives), never
just the industry name.`;

/**
 * EXPERT3D per-locale ToV — European Portuguese (pt-PT). Embedded by the Task C
 * EXPERT3D_PT_INSTRUCTION (Translator) and injected into Task A via customInstructions
 * for native pt-PT generation (main pipeline, PR #3). Register/vocabulary rules only — brand
 * character + Fact→Mechanism→Consequence come from EXPERT3D_TOV_BASE_OVERLAY.
 * Checked against real native-generated output (Formlabs Fuse X1 proofreading pass): orthography,
 * calque, Spanish-leakage and delivery-market sections below were added in response to concrete
 * defects found.
 */
export const EXPERT3D_PT_LOCALE_TOV =
  `[EXPERT3D ToV — EUROPEAN PORTUGUESE (pt-PT) — these rules WIN over any conflicting register line]
MARKET: European Portuguese for Portugal. This is NOT Brazilian Portuguese (pt-BR).

REGISTER (formal, mandatory — B2B industrial capital equipment):
- Formal third-person European register. Address the reader impersonally or as "o cliente".
  NEVER "tu" / "te" / "teu" / "vosso". Avoid "você" as the default subject pronoun (distances in PT-PT).
- European construction: "estar a + infinitivo" ("está a imprimir"), NEVER the Brazilian gerund
  ("está imprimindo"). "de forma a", "por forma a" over Brazilian "de modo a" where natural.

VOCABULARY (European, mandatory — replace Brazilian analogues):
- ecrã (NOT tela) · ficheiro (NOT arquivo) · utilizador (NOT usuário) · rato (NOT mouse) ·
  gestão · pormenor · equipa (NOT time) · autocolante (NOT adesivo where "sticker").
- "tela" is BANNED in EVERY sense, not only "screen": screen/display → "ecrã" · canvas
  (EN "canvas" — print/craft MATERIAL: canvas prints, fabric substrates, material lists) →
  "lona" (never "tela", and never "ecrã" — a material is not a display). Material enumerations
  such as "wood, paper, canvas, acrylic" → "madeira, papel, lona, acrílico"; "prints directly
  on fabric and canvas" → "imprime diretamente em tecido e lona".
- Tech: "resina" · "plataforma de impressão" / "base" (bed) · "extrusor" · "bico" (nozzle) ·
  "software de fatiamento (slicer)" · "impressão 3D" · "impressora 3D".

ORTHOGRAPHY (post-1990 Acordo Ortográfico, mandatory): drop the silent consonant in "ct"/"cç"/"pt"
clusters that pre-reform spelling kept. Concrete examples — always follow these exactly, do not
just paraphrase the rule name: "actua(r/l/va/ndo)" → "atua(r/l/va/ndo)" · "arquitectura" →
"arquitetura" · "táctil" → "tátil" · "electrónico" → "eletrónico" · "activado" → "ativado" ·
"injecção" → "injeção" · "projecção" → "projeção" · "directamente" → "diretamente" ·
"Conetividade" → "Conectividade" (the 'c' is pronounced here — post-AO90 keeps it, unlike the
silent-consonant clusters above).

FORBIDDEN MARKETING WORDS (extends the master fluff ban): revolucionário, inovador, de ponta,
o melhor, incrível, fantástico, a escolha perfeita, imprescindível, imperdível. Replace each with
a concrete figure or mechanism.

FORBIDDEN CALQUES / ANGLICISMS:
- "performance" → "desempenho" · "workflow" → "fluxo de trabalho" · "footprint"/"pegada"
  (installation sense) → "área de instalação / ocupação" · "end-to-end"/"de ponta a ponta" →
  "integral / de princípio a fim" · "fixtures" → "fixações / utensílios de fixação".
- Brazilianisms count as calques here: arquivo, tela, usuário, mouse, time — use the European forms above
  ("tela" in the canvas-material sense → "lona", see VOCABULARY).
- 3D-printing/industrial terminology: "pó reclamado" → "pó recuperado" · "pó selecionado"
  (sifted powder) → "pó peneirado" · "embalamento" (packing-density sense, NOT literal parcel
  packaging) → "empacotamento" · "taxa de atualização" (powder refresh rate, NOT UI refresh rate)
  → "taxa de renovação" · "breakout limpo" → "extração limpa" · "nitrogénio" (chemical element) →
  "azoto" (PT-PT never uses "nitrogénio" for this) · "gantries" → "pórticos" · "powder bed fusion"
  (left in English) → "fusão em leito de pó" · "sistemas legados" (calque of "legacy systems") →
  "sistemas convencionais" / "de geração anterior" · "filtros de carbono" (gas/air filtration
  media) → "filtros de carvão ativado" ("carbono" alone stays correct elsewhere, e.g. "fibra de
  carbono") · "caixa de luvas selada" (glove-box / breakout-station description) → "câmara selada
  com luvas" · "Ítrio" (chemical element error: fiber lasers in this domain are Ytterbium, never
  Yttrium) → "Itérbio" · "visão artificial" → "visão computacional" (industry-standard term for
  computer vision) · "conectores cegos" → "conectores de acoplamento cego" (blind-mate connectors)
  · "desempacotamento" (breakout/cleaning-station process specifically, not general unpacking) →
  "extração das peças" · "transportador pneumático" → "transportador a vácuo" (vacuum conveyor) ·
  "carcaças" (hardware/electronics enclosures — reads as informal here) → "invólucros" / "caixas".

SPANISH-LEAKAGE WATCHLIST: this store also serves es-ES — Spanish vocabulary bleeding into pt-PT
output is a systemic risk, not a one-off. Known leaks to avoid: "utillajes" → "ferramental" ·
"pantalla" → "ecrã" · "ajustes" → "definições/configurações". Watch generally for Spanish-looking
words where a distinct Portuguese term exists.

GRAMMAR: "dezenas de milhar" → "dezenas de milhares" (number agreement).

DOCUMENT SCOPE: every rule above applies to the ENTIRE generated artifact — main body, FAQ,
HowTo, and any other block generated under this locale — not only the first/main section. Do not
relax terminology discipline in a shorter or separately-framed block.

NUMBERS: decimal comma, space thousands ("1,75 mm"; "12 500 h"). Never change digits or unit.
COUNT: unit-count abbreviation is "un." (see [PRODUCT NAME LOCALIZATION]).

SPEC TABLES: translate English technical terminology inside specification tables into Portuguese
— never leave it in English (e.g. "Selective Laser Sintering" → "Sinterização Seletiva a Laser",
"Ytterbium Fiber" → "Fibra de Itérbio").

DELIVERY / MARKET (commercial-closing CTA section): the delivery destination is Portugal and the
rest of the EU — never state Spain as the delivery destination. Valencia, Spain may still be named
elsewhere as the company's operating/shipping base, but must never appear as the market the
equipment is delivered "to". Use this exact template for the delivery-availability sentence in the
CTA paragraph: "O equipamento está disponível para aquisição com soluções de transporte
especializado para as suas instalações em Portugal e restantes países da UE."`;

/**
 * EXPERT3D Tone of Voice — Castilian Spanish (es-ES) vocabulary overlay for NATIVE generation.
 * Extracted from EXPERT3D_ES_INSTRUCTION (task-c.ts, translation-only) so native Task A
 * generation (main pipeline) has the same vocabulary/showroom constraints without duplicating
 * them into the orchestrator as inline strings.
 *
 * @deprecated Unused by the main pipeline since the uk-UA-master + Task-C-translation revert —
 * es-ES is now a Task C translation target and EXPERT3D_ES_INSTRUCTION (task-c.ts) already embeds
 * these rules. Kept for the standalone Translator/tools, which still call buildNativeLangOverlay
 * directly.
 */
export const EXPERT3D_ES_NATIVE_VOCAB_OVERLAY =
  `[EXPERT3D ToV — CASTILIAN SPANISH (es-ES) VOCABULARY]
MARKET: Spain (es-ES), European terminology only.
MANDATORY VOCABULARY: Ordenador (NOT computadora) · Fichero (NOT archivo) ·
Laminador / software de laminado (NOT rebanador/slicer) · Plataforma de impresión / cama de
impresión (bed) · Extrusor.
SHOWROOM: EXPERT3D has no physical showroom — do not invent a showroom/visit/demo-unit claim.`;

/**
 * EXPERT3D per-locale ToV — Ukrainian (uk-UA). Carries the uk-UA register (formal «Ви») and
 * anti-anglicism forbidden-stems rules that otherwise only live inside
 * EXPERT3D_TOV_TRANSLATION_OVERLAY (a Task C / translation-path asset). The uk-UA MASTER is
 * never translated, so buildMasterUaOverlay() injects this directly into Task A's
 * customInstructions instead — mirrors the EXPERT3D_ES_NATIVE_VOCAB_OVERLAY precedent (a
 * native-generation extract paralleling, not replacing, the translation-side instruction).
 */
export const EXPERT3D_UK_LOCALE_TOV =
  `[EXPERT3D ToV — UKRAINIAN (uk-UA) — these rules WIN over any conflicting register line]
REGISTER (formal, mandatory — B2B industrial capital equipment): formal "Ви" (з великої),
technical and direct, no pathos. Never informal "ти".
FORBIDDEN STEMS (drop or replace with a concrete fact): революцій-, інновацій-, ідеальн-,
неймовірн-, найкращ- (when unproven).
COLON CAPITALIZATION in "<b>Label:</b> continuation" list items and figcaptions: lowercase the
first letter after the colon (it introduces an explanation of the bold label, not a new sentence).`;

/**
 * EXPERT3D Tone of Voice — TRANSLATION overlay (Task C, EXPERT3D locales).
 * Appended to whichever task-c instruction is selected — same mechanism as
 * CONSUMABLES_TRANSLATION_OVERLAY. Carries the per-locale FORMAL register, the es-ES
 * forbidden-calque list and the uk-UA forbidden-word stems into every EXPERT3D language
 * version and preserves the brand voice through translation. These rules WIN over any
 * conflicting [STYLE]/register line above (notably the legacy "use tú" line — B2B industrial
 * capital equipment uses the formal register).
 */
export const EXPERT3D_TOV_TRANSLATION_OVERLAY =
  `[EXPERT3D ToV — TRANSLATION OVERLAY — these rules WIN over any [STYLE]/register line above]
Preserve the EXPERT3D brand voice: expert-consultant, factual, no marketing fluff. Do NOT
introduce forbidden words in the target language (revolucionario/innovador/puntero/el mejor/
increíble/la elección perfecta/imprescindible ; революційний/інноваційний/ідеальний/неймовірний/
найкращий). Keep the Fact -> Mechanism -> Consequence shape of each claim.

REGISTER (formal, mandatory — this is B2B industrial capital equipment):
- es-ES / es-MX: formal "usted" throughout — verbs, possessives (le garantizamos, le asesora,
  su línea, aproveche). NEVER "tú" / "te" / "tu".
- uk-UA: formal "Ви" (з великої), technical and direct, no pathos.
- pl-PL: formal Pan/Pani — never bezpośrednie "ty".
- en-ES / en-GB: neutral, impersonal industrial tone (English has no tú/usted).

FORBIDDEN CALQUES (es-ES / es-MX — replace the English calque with natural Spanish; match
inflected forms too, e.g. huella/huellas, puente/puentes; applies in running prose AND in
spec-table row labels, e.g. "Huella de operación recomendada" -> "Espacio de instalación
recomendado"):
- huella (= footprint) -> superficie de ocupación / espacio de instalación
- de extremo a extremo (= end-to-end) -> de principio a fin / integral
- producción puente (= bridge manufacturing) -> producción de transición
- fixtures (untranslated) -> fijaciones / utillajes de sujeción
- envases protésicos (= socket, wrong term) -> encajes protésicos
- útiles (= tooling) -> utillajes
- over-literal flujo de trabajo (= workflow, overused) -> flujo de producción / proceso

FORBIDDEN STEMS (uk-UA — drop or replace with a concrete fact): революцій-, інновацій-,
ідеальн-, неймовірн-, найкращ- (when unproven).

COLON CAPITALIZATION in "<b>Label:</b> continuation" list items and figcaptions: for uk-UA /
ru-UA / pl-PL lowercase the first letter after the colon (it introduces an explanation of the
bold label, not a new sentence). For de-DE and all English keep the default capital.`;

/**
 * Center 3D Print Tone of Voice ("Style B") — BASE-GENERATION overlay (Task A, C3D only).
 * Added as an extra CACHED system block AFTER master + task-a instruction, so the shared
 * master+task prefix stays byte-stable (cache hit) for every other store and C3D just gets one
 * additional cached suffix (its own cache slot) — same mechanism as EXPERT3D_TOV_BASE_OVERLAY.
 *
 * Encodes ONLY what is store-specific: bullet grammar, heading style, the operating-tips block,
 * the CTA shape, and the Style-A anti-patterns. Rules that already exist globally are deliberately
 * NOT restated here — SENTENCE_LENGTH_RULES (whose uk-UA ceiling of 20 is STRICTER than this ToV's
 * 25 — restating the looser figure would create a conflict), NUMBER_FORMAT_RULES,
 * UNIT_LOCALIZATION_RULES and PRODUCT_NAME_LOCALIZATION all stay authoritative.
 * Per-locale verb/imperative lexicons live in C3D_UK_LOCALE_TOV / C3D_PL_LOCALE_TOV instead.
 *
 * 2026-07-27: OVERRIDE #1 no longer mandates a run-in semicolon <p> for §4. That form conflicted
 * structurally with SENTENCE_LENGTH_RULES — a run-in list of 4-8 fields reads as one sentence, and
 * the real Ortur Laser Master 3 generation produced a 68-word span against a uk-UA ceiling of 20 —
 * and the model half-complied anyway, keeping the banned "Label:" colons inside the paragraph. §4
 * now follows SIGNATURE MOVE #1 like every other list, which removes the conflict. The bold-opener
 * word cap was added in the same pass so conciseness is enforced where it does not cost specs.
 *
 * 2026-07-27: OVERRIDE #7 added for §3's <h2>s. SIGNATURE MOVE #2 states the functional-heading
 * rule generally, but the master's §3 "Recommended H2 order" supplies five NOMINAL templates by
 * name, and specificity beat generality on every run — «Технологія SLS та принцип роботи» is
 * simultaneously SIGNATURE MOVE #2's BAD example and the master's recommended §3 heading. The two
 * sections that always came out functional (§4, §9) are exactly the two that already had a named
 * OVERRIDE entry, so §3 got one in the same substitution-table shape. Written as a table of five
 * named inputs rather than a general prohibition precisely so it CANNOT generalize to <h3> and
 * re-trigger the §7 category collapse (see spec-category-shape.ts).
 */
export const C3D_TOV_BASE_OVERLAY =
  `[CENTER 3D PRINT BRAND VOICE — "Style B" — applies to this store's base generation and every
language version]
ACTIVATION GATE: these rules apply ONLY when the store is Center 3D Print. They are inert for any
other storefront and must never be propagated into another store's output.

VOICE IN ONE LINE: a service engineer-consultant who explains, in plain steps, what the machine
DOES FOR YOU. Competent but never distant, benefit-led, ready to advise on safe operation.
Archetype: Sage + Caregiver (mentor / guide). Methodical, accessible, benefit-driven,
service-minded, instructional, calm. The reader should feel: "someone knowledgeable is walking me
through this and looking out for the result."

SIGNATURE MOVE #1 — VERB-LED BENEFIT BULLETS (the single most important rule).
Every feature/advantage bullet is a PERSONIFIED ACTION OF THE MACHINE, not a labelled term.
  <li><b>[3rd-person present verb] + short benefit claim. </b>[1-3 supporting sentences with the
  hard specs.]</li>
- The bold opener STARTS WITH A VERB describing what the machine does, and ENDS WITH A PERIOD —
  never a colon. Note the space before </b>.
- The machine is the grammatical subject: it holds, delivers, keeps, prints, controls, automates.
- Then unpack with concrete numbers, and explain WHY the spec matters (EEAT).
GOOD: <li><b>Fits large parts and dense batches. </b>The 330 × 330 × 565 mm build volume prints
      large-format items and packs many parts into a single build.</li>
GOOD: <li><b>Moves to the next job quickly. </b>The removable build unit rolls out and is replaced
      in under 5 minutes, so the machine barely idles.</li>

ANTI-PATTERN — NEVER WRITE LIKE THIS HERE ("Style A", the old voice — banned):
  BAD  <li><b>Adaptive thermal control:</b> heated chamber, quartz elements...</li>   noun + colon
  BAD  "...SLS needs no support structures - which opens up the possibility of..."    dash "reveal"
Rewrite such content as a verb-led bullet and SPLIT the dash into two sentences.

SIGNATURE MOVE #2 — FUNCTIONAL / QUESTION HEADINGS (SECTION HEADINGS ONLY).
MAIN SECTION HEADINGS (<h2> in §1-§6 and §9) describe a FUNCTION or answer a user query — they are
never bare nouns.
  GOOD: "How selective laser sintering works" - "Where [Product] is used" -
        "Build module and work between cycles" - "Tips for operating [Product]" -
        "Materials and compatible equipment"
  BAD:  "SLS technology and operating principle" - "Areas of application"
Reusable patterns: "How ... works", "Where ... is used", "How to [action]",
"[Function] and [function]", "Tips for operating ...". Mirror the pattern in every language.
HOWEVER, SUB-HEADINGS (<h3>) in the specifications section (§7) and in the functionality section
(§3) MUST be CONCISE NOMINAL PHRASES — "Лазерний модуль", "Безпека", "Електроніка та підключення".
The functional-heading rule above does NOT apply to them: a §7 spec category is a label, not a
statement. Keep emitting <h3> sub-headings exactly where the master schema calls for them; never
drop or merge spec categories to avoid writing a nominal phrase.
When the SOURCE spec list is FLAT (no categories given), group it into 3-6 §7 categories of AT
LEAST 3 rows each, naming every category in the target output language.

SIGNATURE MOVE #3 — "TIPS FOR OPERATING [Product]" ADVISORY BLOCK (register shift).
This is the ONLY place that addresses the operator directly.
- Emit an H2 "Tips for operating [Product]" IMMEDIATELY BEFORE the final commercial-closing
  section, WHEN the product is production hardware with real handling/safety considerations
  (printers, post-processing, powder, resin). Skip it for products with none.
- 3-5 bullets, each = BOLD IMPERATIVE OPENER ending with a period + supporting instruction.
  Second person, formal register.
- Practical and safety-oriented; cite MSDS / PPE / manufacturer limits where the source supports it.
  Never invent a safety figure the source does not state.
  <li><b>Maintain the specified room conditions. </b>Keep temperature at 18–28 °C and humidity
  no higher than 30 %.</li>
Everywhere OUTSIDE this block (and the CTA), stay impersonal / benefit-3rd-person — do NOT scatter
second-person address through the body.

SIGNATURE MOVE #4 — CONSULTATIVE CTA WITH A DIRECT ASK.
The closing paragraph is consultative and ENDS WITH A DIRECT INVITATION, not a passive status line.
  GOOD ending: "Contact our specialists to discuss lead times, configuration and how [Product]
               fits your production requirements."
  BAD ending:  "The printer is available for purchase with delivery across ..." (flat, no ask)
Keep the mandatory brand-guarantee sentence and the trust points from the master [CONTENT
STRUCTURE]. Mention where applicable: official representative, fair price, authorized service,
warranty, pre-purchase consultation, commissioning/integration.

PUNCTUATION LIMITS (store-specific; all other typography rules stay as defined globally):
- Em/en dash as a RHETORICAL device: avoid; at most 1 per 400 words. Use a period or comma instead.
  Genuine numeric ranges are exempt.
- Exclamation marks in the body: ZERO. Emoji in the body: ZERO.
- Question marks: only in the commercial-closing H2.
- Rhetorical colon in list items ("term:"): FORBIDDEN — see the OVERRIDES table below.
- Rhythm: alternate a short claim (5-10 words) with a supporting sentence, within the global
  per-locale sentence-length budget, which remains authoritative.
- BOLD OPENER LENGTH: the bold verb-led opener of any bullet is AT MOST 10 WORDS. It is a claim,
  not a summary — put the numbers in the supporting sentences that follow, never in the opener.
  This caps the opener only; the supporting sentences stay governed by the per-locale
  sentence-length budget above. Do NOT compress a whole <li> to fit — dropping the hard specs to
  shorten a bullet is a worse error than a long bullet.
- <b> marks bullet verb/imperative openers and inline technical parameters. Brand/model emphasis
  follows the global <strong> rule — do not double up.

OVERRIDES — these WIN over the conflicting master [CONTENT STRUCTURE] instructions, for this store
only. The master rule named on the left is REPLACED by the form on the right:
1. APPLICATIONS list "<li><b>[Industry / Scenario]:</b> ...": the <ul>, the 4-8 entries and the
   80-250 word budget all STAY; only the COLON-LABEL form is replaced. Write each entry as a
   verb-led bullet per SIGNATURE MOVE #1 — the bold opener starts with a 3rd-person present verb,
   ends with a PERIOD, and is followed by 1-2 sentences naming the concrete field/scenario and the
   mechanism that makes this product right for it. NEVER a bare industry noun, NEVER a colon
   label, NEVER a run-in paragraph of fields separated by semicolons.
   GOOD: <li><b>Cuts acrylic signage without post-sanding. </b>The 20 W diode module leaves a
         sealed edge on 3 mm cast acrylic, so sign shops skip the finishing step.</li>
   BAD:  <li><b>Advertising:</b> cuts acrylic signage.</li>                          noun + colon
   BAD:  <p>Branding and marking: applies logos...; decorative engraving: reproduces
         patterns...</p>                                    run-in semicolon list — banned here
2. APPLICATIONS H2 (the localized "Areas of application" template): REPLACED by the functional
   form "Where [Product] is used".
3. COMPATIBILITY list "<li><b>[Aspect label]</b> [values]": REPLACED by a verb-led opener ending
   in a period, per SIGNATURE MOVE #1.
4. COMMERCIAL-CLOSING H2: REPLACED by the soft-"worth it" phrasing naming the store, e.g.
   en "Why it is worth buying [Product] from Center 3D Print?". Use the target language's natural
   equivalent of "worth" (pl "Dlaczego warto kupić …", uk/ru per the locale overlay).
5. FIGCAPTION lead-in "<b>LEAD-IN LABEL:</b> description": REPLACED by a verb-led, period-
   terminated opener ("<b>Prints fine detail. </b>..."). The lead-in must still differ from the
   alt text and from the preceding lead-in <p>, per the global figure rules.
6. KEY BENEFITS and FUNCTIONALITY bullets: verb-led per SIGNATURE MOVE #1, never noun+colon.
7. §3 "Recommended H2 order" (the master's five §3 topic templates — "Technology / Operating
   principle", "Construction & hardware", "Software & automation", "Safety",
   "Certification & compliance"): those five strings name the TOPIC each §3 <h2> must COVER.
   They are NOT the heading to emit — emitting them as written produces exactly the bare nominal
   heading SIGNATURE MOVE #2 forbids. REPLACE each with the functional form:
     Technology / Operating principle  ->  "How [Product] works"
     Construction & hardware           ->  "How [named assembly] [raises / holds / delivers X]"
                                           (name the real assembly, e.g. "How the lift platform
                                           and the camera raise accuracy")
     Software & automation             ->  "What software drives [Product]"
     Safety                            ->  "What safety mechanisms [Product] uses"
     Certification & compliance        ->  "Which standards [Product] complies with"
   REWORDING ONLY: same topics, same count, same order (source order still wins per [NARRATIVE
   FIDELITY]), same §3 depth and word budget. NEVER drop or merge a §3 topic to avoid writing a
   functional heading — a missing topic is a far worse error than a clumsy heading.
   THIS OVERRIDE GOVERNS <h2> ONLY. §3's and §7's <h3> sub-headings stay CONCISE NOMINAL PHRASES,
   exactly as SIGNATURE MOVE #2 already requires ("Лазерний модуль", "Безпека", "Електроніка та
   підключення"). Emit every <h3> the master schema calls for.

CONSUMABLES MODE (§C1-§C6): when the [CONSUMABLES SIMPLIFIED SCHEMA] is active instead of Schema
v3.0, this voice still governs its list items. The schema's SECTIONS, ORDER, TABLES, H2 set and
FORBIDDEN list are untouched — only the item grammar changes:
- §C2 items "<b>[Feature label.]</b>": the bold opener becomes VERB-LED (it already ends in a
  period, so only the noun-to-verb shift is needed).
- §C3 items "<b>[Scenario]:</b>": verb-led, ending in a period. No colon. Same form as OVERRIDE #1.
- §C5 items "<b>[Label]:</b>": a bold IMPERATIVE opener ending in a period, matching SIGNATURE
  MOVE #3 — storage and handling instructions are advice, so the imperative is the natural register
  there. No colon.
- BUDGET GUARD: §C is capped at 2500 characters. In this mode each item takes the verb/imperative
  opener plus EXACTLY ONE supporting sentence, not SIGNATURE MOVE #1's 1-3. If the budget is still
  tight, cut supporting detail — never drop a required §C section or a spec value.
The COLON CAPITALIZATION rule in the consumables overlay describes the form these items USED to
take; with no colon left in §C2/§C3/§C5 it simply has nothing to apply to. Do not reintroduce a
colon in order to satisfy it.

SCOPE OF THIS ToV: it changes WORDING and BULLET GRAMMAR only. Section order, <hr> placement,
spec-table structure and row count, figure/video markup, the no-H1 and no-microdata rules, unit
localization, number formatting, product-name localization, the per-locale sentence-length budget
and every SEO limit stay EXACTLY as the master defines them.

SELF-CHECK BEFORE OUTPUT:
- [ ] Every feature bullet starts with a verb (3rd person) and its bold opener ends with a period,
      not a colon.
- [ ] No noun-label-plus-colon bullets and no em-dash "reveals" anywhere (no Style A leakage).
- [ ] Section H2s are functional/question-style, not bare nouns — AND §7/§3 <h3> sub-headings are
      still present, as concise nominal phrases in the output language.
- [ ] Every §3 <h2> uses the OVERRIDE #7 functional form, and §3/§7 <h3> stay nominal labels.
- [ ] §7 carries 3-6 spec categories of at least 3 rows each, never one catch-all category.
- [ ] Applications is a verb-led <ul> of 4-8 bullets — no "Field:" colon labels, no run-in
      semicolon paragraph, no bare industry nouns.
- [ ] Every bold bullet opener is at most 10 words, with the numbers in the sentences after it.
- [ ] Figcaption lead-ins are verb-led and period-terminated.
- [ ] Zero "!", zero body emoji, dashes within budget.
- [ ] The operating-tips block is present (if handling/safety-relevant) with imperative bullets;
      direct second-person address appears ONLY there and in the CTA.
- [ ] The closing H2 uses the "worth buying" form, keeps the brand-guarantee sentence, and ends
      with a direct "contact us"-type ask.`;

/**
 * Center 3D Print ToV — TRANSLATION overlay (Task C, C3D locales). Appended to whichever task-c
 * instruction is selected — same mechanism as CONSUMABLES_TRANSLATION_OVERLAY /
 * EXPERT3D_TOV_TRANSLATION_OVERLAY.
 *
 * Its primary job is preventing RE-NOMINALIZATION: translating a verb-led opener into Polish or
 * German pulls hard toward a noun label ("Вміщує великі деталі." -> "Pojemność komory:" /
 * "Bauraum:"), which silently restores the banned Style A. Also reused as the FAQ-artifact overlay
 * via buildNativeLangOverlay().
 */
export const C3D_TOV_TRANSLATION_OVERLAY =
  `[CENTER 3D PRINT ToV — "Style B" — TRANSLATION OVERLAY — these rules WIN over any conflicting
[STYLE]/[LABELS] or list-format line above]
The source is written in the Center 3D Print voice: a service engineer-consultant explaining what
the machine does for the reader. Preserve that voice in the target language.

DO NOT RE-NOMINALIZE (the main failure mode of this translation).
Every bullet whose bold opener is a VERB + benefit claim ending in a PERIOD must stay a verb +
benefit claim ending in a PERIOD. Translating it into a noun label plus a colon is WRONG and
silently restores the banned old voice.
  BAD  <li><b>Pojemność komory:</b> 330 × 330 × 565 mm…</li>      noun + colon
  BAD  <li><b>Bauraum:</b> 330 × 330 × 565 mm…</li>               noun + colon
  GOOD <li><b>Mieści duże detale i gęste partie. </b>Przestrzeń robocza 330 × 330 × 565 mm…</li>
  GOOD <li><b>Fasst große Bauteile und dichte Chargen. </b>Der Bauraum von 330 × 330 × 565 mm…</li>
The machine stays the grammatical subject in the target language too. Keep the space before </b>.
Write every example form with the target language's own diacritics/script — never a stripped
ASCII approximation.

VERB STARTERS to reuse (3rd-person present):
  PL: Mieści, Zapewnia, Utrzymuje, Drukuje, Kontroluje, Automatyzuje, Przyspiesza, Obniża, Upraszcza
  DE: Fasst, Sorgt für, Hält, Druckt, Überwacht, Automatisiert, Beschleunigt, Senkt, Vereinfacht
  EN: Fits, Delivers, Keeps, Prints, Monitors, Automates, Cuts, Speeds up, Simplifies
  RU: Вмещает, Обеспечивает, Держит, Печатает, Контролирует, Автоматизирует, Ускоряет, Снижает

FUNCTIONAL HEADINGS (SECTION HEADINGS ONLY): keep the main <h2> section headings functional/
question-style; do not flatten them into bare nouns. Mirror the source pattern: "How … works"
(pl "Jak działa …", de "So funktioniert …", ru «Как работает …»), "Where … is used"
(pl "Gdzie stosuje się …", de "Wo … eingesetzt wird", ru «Где применяют …»).
§3 in particular arrives with question-form headings and must KEEP them — collapsing one back to
a topic label is the same failure as re-nominalizing a bullet:
  «Яке ПЗ підтримує …»            pl "Jakie oprogramowanie obsługuje …",
                                  de "Welche Software … steuert", ru «Какое ПО поддерживает …»
  «Які механізми безпеки …»       pl "Jakie mechanizmy bezpieczeństwa …",
                                  de "Welche Sicherheitsmechanismen …", ru «Какие механизмы …»
  BAD: pl "Oprogramowanie i automatyzacja" · de "Software und Automatisierung" ·
       ru «ПО и автоматизация» — bare noun topics, the banned form.
SUB-HEADINGS (<h3>) in the specifications section (§7) and the functionality section (§3) are
EXEMPT: they stay CONCISE NOMINAL PHRASES, translated as labels (pl "Moduł lasera",
"Bezpieczeństwo"; de "Lasermodul", "Sicherheit"). Reproduce EVERY <h3> present in the source —
never drop, merge or convert a spec category into a sentence-style heading. The number of §7
categories in your output must equal the number in the source.

APPLICATIONS (§4): the source renders applications as a <ul> of VERB-LED bullets — not a
colon-labelled list, and not a run-in paragraph. Keep that shape. DO NOT RE-NOMINALIZE applies
here with full force: a field or industry label plus a colon is the single most likely regression
in this section, because "Zastosowanie:" / "Anwendung:" read as natural section labels.
  BAD  <li><b>Zastosowanie:</b> reklama, grawerowanie…</li>            noun + colon
  BAD  <li><b>Anwendung:</b> Werbetechnik, Gravur…</li>                noun + colon
  BAD  <li><b>Reklama:</b> tnie plexi na szyldy…</li>                  bare field + colon
  GOOD <li><b>Tnie plexi na szyldy bez doszlifowania. </b>Moduł 20 W…</li>
  GOOD <li><b>Schneidet Acrylschilder ohne Nachschliff. </b>Das 20-W-Modul…</li>
Keep the SAME number of <li> as the source — list-item counts are checked deterministically, not
merely requested.

CONSUMABLES MODE (§C1-§C6): if the consumables translation overlay is also present, its §C2/§C3/§C5
items arrive VERB-LED (or, in §C5, imperative-led) and period-terminated, because this store's base
voice already replaced their colon-label form. Translate them as they arrive. Its COLON
CAPITALIZATION rule describes the form those items USED to take — with no colon left in §C2/§C3/§C5
it has nothing to apply to, so do not reintroduce a colon in order to satisfy it. Every other
consumables rule (section set, tables, the 2500-character cap) still applies unchanged.

OPERATING-TIPS BLOCK: if the source has a "Tips for operating [Product]" H2, translate its heading
functionally (pl "Wskazówki dotyczące eksploatacji …", de "Hinweise zum Betrieb von …",
ru «Советы по эксплуатации …») and keep each bullet's opener as a BOLD IMPERATIVE ending in a
period, in the target language's FORMAL register (pl the impersonal "Należy …" form, de
Sie-Imperativ, uk/ru formal «Ви»/«Вы»-form).
Direct second-person address stays confined to this block and the CTA — do not spread it elsewhere.

FIGCAPTIONS: keep verb-led, period-terminated lead-ins; do not restore "LABEL:" form.

PUNCTUATION: zero exclamation marks, zero body emoji, em-dash as a rhetorical device avoided
(genuine ranges exempt). Question marks only in the closing H2.

CLOSING CTA: keep the "worth buying" H2 form (pl "Dlaczego warto kupić [Product] w Center 3D Print?",
de "Warum sich der Kauf von [Product] bei Center 3D Print lohnt?") and END the paragraph with the
direct invitation to contact the specialists — never a flat availability statement. Keep the
brand-guarantee sentence.`;

/**
 * Localized openers of the Style B operating-tips H2, one per language Center 3D Print publishes.
 * SINGLE SOURCE OF TRUTH for detecting that block in generated HTML — the same strings appear as
 * prose instructions inside the C3D overlays above, and tov-second-person.ts matches against this
 * array so the two can never drift apart.
 *
 * Prefix match: the real heading continues with the product name ("Поради щодо експлуатації
 * Ortur Laser Master 3").
 */
export const OPERATING_TIPS_H2_MARKERS = [
  'Tips for operating',
  'Поради щодо експлуатації',
  'Советы по эксплуатации',
  'Wskazówki dotyczące eksploatacji',
  'Hinweise zum Betrieb',
];

/**
 * Question / functional <h2> openers, per locale. SINGLE SOURCE OF TRUTH — interpolated into
 * C3D_UK_LOCALE_TOV's HEADING PATTERNS block AND imported by heading-style.ts, so the rule the
 * model is given and the rule the linter enforces are literally the same array. Same mechanism
 * as OPERATING_TIPS_H2_MARKERS above.
 */
export const FUNCTIONAL_H2_OPENERS: Record<string, string[]> = {
  'uk-ua': ['Як', 'Що', 'Які', 'Яке', 'Який', 'Яка', 'Яким', 'Яких', 'Де', 'Чому', 'Скільки', 'Коли'],
  'ru-ua': ['Как', 'Что', 'Какие', 'Какое', 'Какой', 'Какая', 'Каким', 'Каких', 'Где', 'Почему', 'Сколько', 'Когда'],
};

/**
 * <h2> forms the MASTER schema mandates in a nominal shape. A nominal heading here is CORRECT,
 * not a Style A regression, so heading-style.ts prefix-matches against this list before flagging.
 *
 * §7's "Технічні характеристики …" is additionally exempt structurally (any <h2> inside
 * <section class="specs">); it is listed here too so a §7 header emitted outside that wrapper is
 * still not flagged.
 *
 * NOT included, deliberately: umbrella headings that merely contain the product name, e.g.
 * «Безпечна експлуатація Ortur H20». Exempting on the product name would also exempt most of the
 * nominal headings the linter exists to catch. If a specific umbrella form proves legitimate and
 * recurring, add it here explicitly rather than widening the rule.
 */
export const MANDATED_NOMINAL_H2: Record<string, string[]> = {
  'uk-ua': ['Технічні характеристики', 'Матеріали та сумісне обладнання', 'Сумісність', 'Комплект постачання'],
  'ru-ua': ['Технические характеристики', 'Материалы и совместимое оборудование', 'Совместимость', 'Комплект поставки'],
};

/**
 * Center 3D Print per-locale ToV — Ukrainian (uk-UA). The uk-UA MASTER is never translated, so
 * these lexical rules must be injected into Task A via buildMasterUaOverlay() or they are
 * silently lost — same reasoning as EXPERT3D_UK_LOCALE_TOV.
 */
export const C3D_UK_LOCALE_TOV =
  `[CENTER 3D PRINT ToV — UKRAINIAN (uk-UA) — these rules WIN over any conflicting register line]
VERB STARTERS for benefit bullets (3rd-person present, machine as subject) — reuse and vary:
Вміщує, Забезпечує, Тримає, Друкує, Контролює, Потребує, Автоматизує, Пришвидшує, Знижує,
Підтримує, Спрощує, Дозволяє.
  Приклад: <li><b>Тримає стабільну температуру по всій камері. </b>Термоізольована камера,
  кварцово-трубчасті нагрівачі та 13 незалежних зон нагрівання контролюють режим від першого до
  останнього шару.</li>

§4 «ДЕ ЗАСТОСОВУЮТЬ» — теж дієслівний <ul>, а не перелік через «;» і не «Ярлик: пояснення».
Оскільки uk-UA — майстер-версія, форма цього блоку визначає його форму в усіх мовах.
  Приклад: <li><b>Ріже акрилові вивіски без дошліфовування. </b>Модуль 20 Вт залишає запаяний
  край на литому акрилі 3 мм, тож рекламні майстерні пропускають етап обробки.</li>
  ЗАБОРОНЕНО: <p>Брендування та маркування: наносить логотипи…; декоративне гравіювання:
  відтворює візерунки…</p>

IMPERATIVE STARTERS for the operating-tips block (formal «ви»-form):
Дотримуйтеся, Працюйте, Дочекайтеся, Перевіряйте, Забезпечте, Зберігайте, Уникайте.
  H2: «Поради щодо експлуатації [Product]»
  <li><b>Дотримуйтеся умов у приміщенні. </b>Забезпечте температуру 18–28 °C та вологість не
  вище 30 %.</li>

HEADING PATTERNS для <h2> РОЗДІЛІВ (функційні/питальні — замінюють голі іменникові теми).
Дозволені зачини: ${FUNCTIONAL_H2_OPENERS['uk-ua'].map(o => `«${o} …»`).join(', ')} —
або особова дієслівна форма на початку.
§3 — конкретні заміни майстер-шаблонів:
  Технологія / принцип роботи      → «Як працює [Product]»
  Конструкція та апаратна частина  → «Як платформа підйому та камера підвищують точність»
                                     (шаблон: «Як [вузол] [робить X]»)
  ПЗ та автоматизація              → «Яке ПЗ підтримує [Product]»
  Безпека                          → «Які механізми безпеки застосовує [Product]»
  Сертифікація та відповідність    → «Яким стандартам відповідає [Product]»
Інші розділи: «Сфери застосування» → «Де застосовують [Product]»;
«Технологія SLS та принцип роботи» → «Як працює селективне лазерне спікання».
ЗАБОРОНЕНО як <h2>: «Лазерний модуль потужністю 20 Вт», «ПЗ та автоматизація», «Безпека під час
роботи», «Електронне керування та аварійні системи», «Моторизована платформа, камера та візуальне
позиціонування» — це іменникові теми, а не функційні заголовки.
Формула «[Функція] та [функція]» БІЛЬШЕ НЕ Є зразком: два іменники, з'єднані «та», — це саме та
форма, яку заборонено. Використовуйте її, лише якщо хоча б одна частина містить особову дієслівну
форму.
ВИНЯТОК 1 (<h3>): підзаголовки <h3> у §3 та §7 залишаються короткими іменниковими ярликами
(«Лазерний модуль», «Безпека», «Електроніка та підключення»). Це правило їх НЕ стосується —
жодного <h3> не можна прибрати чи об'єднати заради функційного формулювання.
ВИНЯТОК 2: заголовки, які майстер-схема задає іменниковими —
${MANDATED_NOMINAL_H2['uk-ua'].map(h => `«${h} …»`).join(', ')}.

COMMERCIAL-CLOSING H2 — use the soft «варто» form, which REPLACES the master's
«Чому купити [Product] в [Store]?» template:
  «Чому варто купити [Product] у Center 3D Print?»
The paragraph ends with a direct ask, e.g. «Зв'яжіться з нашими спеціалістами, щоб обговорити
терміни поставки, конфігурацію та відповідність [Product] вашим виробничим вимогам.»

REGISTER: формальне «ви» з'являється ТІЛЬКИ у блоці порад щодо експлуатації та в CTA. У решті
тексту — безособово, вигода подається від 3-ї особи (машина як суб'єкт дії).
Anti-anglicism rules stay as defined globally (друк, не «прінт»; ПЗ, не «софт»).`;

/**
 * Center 3D Print per-locale ToV — Polish (pl-PL). pl-PL is this store's primary market and its
 * first-listed language in STORE_REGISTRY, and Polish is where verb-led openers most reliably
 * collapse back into noun labels. Injected via buildNativeLangOverlay() for the FAQ artifact;
 * the Task C translation path gets it through C3D_TOV_TRANSLATION_OVERLAY's PL verb list.
 */
export const C3D_PL_LOCALE_TOV =
  `[CENTER 3D PRINT ToV — POLISH (pl-PL) — these rules WIN over any conflicting register line]
VERB STARTERS for benefit bullets (3rd-person present, machine as subject):
Mieści, Zapewnia, Utrzymuje, Drukuje, Kontroluje, Automatyzuje, Przyspiesza, Obniża, Podtrzymuje,
Upraszcza, Pozwala.
  <li><b>Mieści duże detale i gęste partie. </b>Przestrzeń robocza 330 × 330 × 565 mm pozwala
  drukować wielkogabarytowe wyroby i rozmieszczać wiele detali w jednej budowie.</li>
NIGDY: <li><b>Pojemność komory:</b> …</li> — rzeczownik z dwukropkiem to zakazany styl A.

IMPERATIVE STARTERS for the operating-tips block — użyj formy bezosobowej «Należy …» (to jest
polski odpowiednik formalnego trybu rozkazującego; NIE stosuj bezpośredniego „ty"):
Należy przestrzegać, Należy zapewnić, Należy odczekać, Należy sprawdzać, Należy przechowywać,
Należy unikać.
  H2: «Wskazówki dotyczące eksploatacji [Product]»
  <li><b>Należy przestrzegać warunków w pomieszczeniu. </b>Temperatura 18–28 °C, wilgotność
  nie wyższa niż 30 %.</li>

HEADING PATTERNS dla <h2> SEKCJI: «Jak działa …», «Jak [zespół] [podnosi / zapewnia X]»,
«Jakie oprogramowanie obsługuje …», «Jakie mechanizmy bezpieczeństwa stosuje …»,
«Jakim normom odpowiada …», «Gdzie stosuje się …», «Wskazówki dotyczące eksploatacji …».
Zamiast «Zastosowania» → «Gdzie stosuje się [Product]».
Wzorzec «[Funkcja] i [funkcja]» NIE jest już dozwolony — dwa rzeczowniki połączone «i» to
dokładnie ta zakazana forma nominalna. Użyj go tylko wtedy, gdy co najmniej jedna część zawiera
osobową formę czasownika.
WYJĄTEK: <h3> w §3 i §7 pozostają zwięzłymi etykietami rzeczownikowymi («Moduł lasera»,
«Bezpieczeństwo») — ta reguła ich NIE dotyczy. Nagłówki, które schemat nadrzędny zadaje jako
rzeczownikowe («Dane techniczne …», «Materiały i kompatybilne urządzenia»), też są dozwolone.

COMMERCIAL-CLOSING H2: «Dlaczego warto kupić [Product] w Center 3D Print?» (the master's pl-PL
template already uses the «warto» form — keep it). Zakończ akapit bezpośrednim zaproszeniem:
«Prosimy o kontakt z naszymi specjalistami, aby omówić terminy dostawy, konfigurację i zgodność
[Product] z Państwa wymaganiami produkcyjnymi.»

REGISTER: bezpośredni zwrot do czytelnika wyłącznie w bloku wskazówek i w CTA; w pozostałym
tekście — bezosobowo, korzyść w 3. osobie.`;

/**
 * Builds the customInstructions suffix for native per-language generation (main pipeline Step 4,
 * ContentOrchestratorService.generate()). Generic image-caption-translation note for every
 * language; EXPERT3D stores additionally get the register/calque ToV overlay, plus PT's or ES's
 * locale-specific overlay; Center 3D Print gets its Style B overlay, plus PL's locale overlay.
 */
export function buildNativeLangOverlay(lang: string, humanLang: string, storeName: string): string {
  const parts = [
    `[NATIVE ${humanLang.toUpperCase()} OUTPUT — IMAGE TEXT OVERRIDE] This description is generated ` +
    `natively in ${humanLang} with no separate translation pass. The image manifest figcaption/` +
    `vision-description text is sourced in English — do NOT copy it verbatim. Translate each ` +
    `figcaption and alt text into natural, idiomatic ${humanLang} preserving the same factual ` +
    `meaning before using it.`,
  ];
  if (isExpert3dStore(storeName)) {
    parts.push(EXPERT3D_TOV_TRANSLATION_OVERLAY);
    if (lang === 'PT') parts.push(EXPERT3D_PT_LOCALE_TOV);
    if (lang === 'ES') parts.push(EXPERT3D_ES_NATIVE_VOCAB_OVERLAY);
  }
  if (isCenter3dPrintStore(storeName)) {
    parts.push(C3D_TOV_TRANSLATION_OVERLAY);
    if (lang === 'PL') parts.push(C3D_PL_LOCALE_TOV);
  }
  return parts.join('\n\n');
}

/**
 * customInstructions suffix for the uk-UA MASTER generation (Task A, pipeline Step 1).
 * Two jobs:
 *  1. The image-manifest figcaption/alt text is sourced in English by the Vision pre-pass —
 *     Task A must translate it, not copy it verbatim.
 *  2. EXPERT3D's uk-UA register/anti-anglicism rules live in EXPERT3D_UK_LOCALE_TOV, and Center
 *     3D Print's Style B uk-UA lexicon in C3D_UK_LOCALE_TOV. The master is NOT translated, so
 *     those rules must be injected here or they are silently lost.
 */
export function buildMasterUaOverlay(storeName: string): string {
  const parts = [
    '[UKRAINIAN MASTER OUTPUT — IMAGE TEXT OVERRIDE] This description is the master artifact, ' +
    'generated natively in Ukrainian. The image manifest figcaption/vision-description text is ' +
    'sourced in English — do NOT copy it verbatim. Translate each figcaption and alt text into ' +
    'natural, idiomatic Ukrainian preserving the same factual meaning before using it.',
  ];
  if (isExpert3dStore(storeName)) parts.push(EXPERT3D_UK_LOCALE_TOV);
  if (isCenter3dPrintStore(storeName)) parts.push(C3D_UK_LOCALE_TOV);
  return parts.join('\n\n');
}

/**
 * Anti-calque constraints for translation FROM the uk-UA master. Keyed by the Task C target label.
 * Appended to the (cached) Task C instruction system block — static text, one extra cache slot per
 * target-language pair, no per-product variance.
 *
 * SEED CONTENT — NEEDS-PROOFREADER. Each list must be reviewed and extended by a native reviewer
 * for that locale before this pipeline's output is treated as publish-ready.
 */
export const UK_SOURCE_ANTICALQUE: Record<string, string> = {
  'PL': `[SOURCE-LANGUAGE INTERFERENCE — UKRAINIAN → POLISH]
The source is Ukrainian. Polish and Ukrainian are closely related; a fluent-looking output can still
be structurally Ukrainian. Guard against:
- FALSE FRIENDS: do not carry a Ukrainian word into Polish on phonetic similarity alone. Verify the
  Polish sense of every cognate before using it.
- GENITIVE CHAINS: Ukrainian stacks genitives ("система подачі філаменту принтера"). Polish prefers
  a prepositional or adjectival construction. Break chains of 3+ genitives.
- "який дозволяє" / "що забезпечує" → do NOT default to "który pozwala" / "co zapewnia" in every
  clause. Vary: participles, "dzięki czemu", a full stop and a new sentence.
- VERBAL NOUNS: Ukrainian technical prose over-nominalizes. Prefer a finite Polish verb where the
  Ukrainian used a verbal noun.
- Write as a native Polish technical copywriter would write from scratch, not as a translator.`,

  'RU': `[SOURCE-LANGUAGE INTERFERENCE — UKRAINIAN → RUSSIAN]
The source is Ukrainian. Guard against:
- FALSE FRIENDS and surzhyk forms carried over on phonetic similarity.
- Ukrainian syntactic patterns and word order reproduced literally.
- Use standard normative Russian technical vocabulary throughout.`,

  'ES': `[SOURCE-LANGUAGE INTERFERENCE — UKRAINIAN → SPANISH]
The source is Ukrainian, a heavily inflected language with free word order and long genitive chains.
Do not reproduce Slavic sentence architecture in Spanish:
- Break long multi-clause Ukrainian sentences into shorter Spanish ones.
- Do not translate every "який/що" clause as "que". Use participles, "lo que permite", or a new
  sentence.
- Restore Spanish subject-verb-object order and article usage (Ukrainian has no articles — every
  noun in the output needs its article decided, not omitted).`,

  'PT': `[SOURCE-LANGUAGE INTERFERENCE — UKRAINIAN → EUROPEAN PORTUGUESE]
The source is Ukrainian. Same guards as Spanish: break long Slavic multi-clause sentences, do not
map every relative clause to "que", and decide every article explicitly (Ukrainian has none).
European Portuguese only — see the pt-PT ToV asset for vocabulary.`,

  'DE': `[SOURCE-LANGUAGE INTERFERENCE — UKRAINIAN → GERMAN]
The source is Ukrainian. Do not carry Slavic clause order into German. Respect German verb-final
subordinate clauses and compound-noun formation; do not calque Ukrainian genitive chains as
prepositional "von"-chains where a compound noun is the native form.`,

  'European English': `[SOURCE-LANGUAGE INTERFERENCE — UKRAINIAN → ENGLISH]
The source is Ukrainian. The English version is a PUBLISHED, SEO-bearing storefront language — it
must read as native English technical marketing copy, not as a translation.
- Ukrainian has no articles. Every English noun phrase needs its article decided deliberately.
- Do not carry Ukrainian word order. Restore natural English collocations: "resin 3D printer with a
  monochrome 8K LCD", not "3D printer with LCD-display of monochrome 8K type".
- Do not translate every "який/що" clause as "which". Prefer participles and shorter sentences.
- Prefer the industry-standard English term over a literal rendering of the Ukrainian term.`,

  'American English': `[SOURCE-LANGUAGE INTERFERENCE — UKRAINIAN → ENGLISH]
Same rules as European English above; American spelling and Imperial-first measurement per the US
instruction block.`,
};