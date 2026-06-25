// Ukrainian + Russian Cyrillic → Latin. Pragmatic BGN/PCGN-style scheme.
const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'y', й: 'i',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya',
  ґ: 'g', є: 'ie', і: 'i', ї: 'i', "'": '',
  ё: 'e', ъ: '', ы: 'y', э: 'e',
};

function transliterateCyrillic(input: string): string {
  return input
    .split('')
    .map(ch => {
      const lower = ch.toLowerCase();
      const mapped = CYRILLIC_MAP[lower];
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

export function normalizeSlug(input: string): string {
  return stripDiacritics(transliterateCyrillic(input))
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
