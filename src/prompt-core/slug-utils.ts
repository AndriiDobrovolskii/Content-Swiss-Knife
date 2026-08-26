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

export function normalizeSlug(input: string, language?: string): string {
  return stripDiacritics(transliterateCyrillic(input, language))
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
