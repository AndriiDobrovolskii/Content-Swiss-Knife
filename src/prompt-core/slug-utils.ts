// Ukrainian + Russian Cyrillic → Latin. Pragmatic BGN/PCGN-style scheme.
const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'y', й: 'i',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya',
  ґ: 'g', є: 'ie', і: 'i', ї: 'i', "'": '',
  ё: 'e', ъ: '', ы: 'y', э: 'e',
};

// и/й/г are the shared letters Ukrainian and Russian romanize differently for the same
// spelling (принтер → prynter vs printer). ё doesn't exist in the Ukrainian alphabet at all,
// so overriding it to the more standard 'yo' (base map has 'e') only ever affects ru-UA.
// ы/э/ъ already carry these exact values in CYRILLIC_MAP — no need to repeat them here.
const RU_OVERRIDES: Record<string, string> = { г: 'g', и: 'i', й: 'y', ё: 'yo' };
const RU_CYRILLIC_MAP: Record<string, string> = { ...CYRILLIC_MAP, ...RU_OVERRIDES };

function transliterateCyrillic(input: string, language?: string): string {
  const map = language?.startsWith('ru') ? RU_CYRILLIC_MAP : CYRILLIC_MAP;
  return input
    .split('')
    .map(ch => {
      const lower = ch.toLowerCase();
      const mapped = map[lower];
      return mapped !== undefined ? mapped : ch;
    })
    .join('');
}

function stripDiacritics(input: string): string {
  return input
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/gi, 'l');
}

const SLUG_STOPWORDS = new Set([
  'for', 'to', 'do', 'the', 'a',
  'dla', 'na', 'z',
  'für', 'zu', 'mit',
  'для', 'на', 'с',
  'para', 'de', 'con',
]);

// Splits on hyphens too: an already-composed `slug` field (per task-slug.ts's own worked
// examples) arrives hyphen-joined, not space-separated, so a whitespace-only split would never
// see individual words to filter. Re-joining with spaces and normalizing afterward makes the
// hyphen/space split lossless for every non-stopword token.
export function stripSlugStopwords(input: string): string {
  return input
    .split(/[\s-]+/)
    .filter(token => {
      const cleanToken = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      if (!cleanToken) return true;
      if (cleanToken.length === 1 && cleanToken === cleanToken.toUpperCase()) return true;
      return !SLUG_STOPWORDS.has(cleanToken.toLowerCase());
    })
    .join(' ');
}

// uk-UA/ru-UA/pl-PL/de-DE/es-ES names carry a decimal COMMA ("1,75 мм"). normalizeSlug's char-class
// collapse below doesn't include a comma, so left unconverted it becomes a hyphen ("1-75") instead
// of surviving as the decimal point every other locale already gets ("1.75"). Only a comma strictly
// between two digits is touched, so a thousands-style or non-numeric comma is untouched.
function commaDecimalToDot(input: string): string {
  return input.replace(/(\d),(\d)/g, '$1.$2');
}

// Reverse of UNIT_LOCALIZATION_RULES (constants.ts) — that table cyrillizes a Latin unit
// abbreviation for uk-UA/ru-UA prose ("mm" → "мм"). transliterateCyrillic below romanizes
// PHONETICALLY, letter by letter, which is right for words but wrong for a unit symbol that
// merely happens to be spelled with the same letters as an unrelated word: "кг" (kilogram) is
// "к"+"г" → "k"+"h" phonetically, giving the nonsense unit "kh" instead of "kg". Every unit here
// must be converted to its Latin SI form BEFORE the phonetic pass ever sees it.
const UNIT_MAP: Record<string, string> = {
  мкм: 'um', мм: 'mm', см: 'cm', км: 'km', нм: 'nm', м: 'm',
  кг: 'kg', мг: 'mg', г: 'g',
  квт: 'kW', мвт: 'mW', вт: 'W',
  кв: 'kV', мв: 'mV', в: 'V',
  ма: 'mA', а: 'A',
  кгц: 'kHz', мгц: 'MHz', ггц: 'GHz', гц: 'Hz',
  мл: 'ml', л: 'l',
  гб: 'GB', мб: 'MB', тб: 'TB',
  год: 'h', хв: 'min', ч: 'h', мин: 'min', с: 's',
};
// Composite/locale-branching units from UNIT_LOCALIZATION_RULES (rpm "об/хв"↔"об/мин", capacity
// "мА·год"↔"мА·ч", "kg/h" cyrillized part-by-part) are deliberately NOT covered here — they need
// per-locale parsing this single token map can't express safely. Left as source text (i.e.
// whatever transliterateCyrillic does with them next), which is the existing pre-PR-0b behavior,
// not a regression.
const UNIT_TOKENS = Object.keys(UNIT_MAP).sort((a, b) => b.length - a.length);
const UNIT_RE = new RegExp(`(?<=[0-9][\\s\\u00A0]+)(${UNIT_TOKENS.join('|')})(?![\\p{L}\\p{N}])`, 'giu');

// Anchored on a preceding digit + whitespace so a unit token is only ever replaced right after a
// number (the shape every real spec value has) — never as a substring of an ordinary word like
// "загартована" (which contains "г") or "годин" (which starts with "год"). Uses \p{L}/\p{N}
// instead of \b: JS's \b is ASCII-only, so it does not see a boundary between a space and a
// Cyrillic letter (both are non-word to the regex engine) and would silently fail to anchor here.
function canonicalizeUnitsForSlug(input: string): string {
  return input.replace(UNIT_RE, match => UNIT_MAP[match.toLowerCase()]);
}

export function normalizeSlug(input: string, language?: string): string {
  return stripDiacritics(transliterateCyrillic(canonicalizeUnitsForSlug(commaDecimalToDot(input)), language))
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/(?<!\d)\.(?!\d)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function ensureUniqueSlugs(items: { language: string; slug: string }[]): string[] {
  const seen = new Set<string>();
  return items.map(({ language, slug }) => {
    let candidate = slug;
    if (seen.has(candidate)) {
      const desc = (language.split('-')[1] ?? language.split('-')[0] ?? '').toLowerCase();
      if (desc) candidate = `${slug}-${desc}`;
    }
    let n = 2;
    while (seen.has(candidate)) candidate = `${slug}-${n++}`;
    seen.add(candidate);
    return candidate;
  });
}

export const SLUG_PATTERN = /^[a-z0-9]+(\.[0-9]+)?(-[a-z0-9]+(\.[0-9]+)?)*$/;

export function slugsToLocalizedNames(slugs: { language: string; name: string }[]): Record<string, string> {
  return Object.fromEntries(slugs.map(s => [s.language, s.name]));
}
