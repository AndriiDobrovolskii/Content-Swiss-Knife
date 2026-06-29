import { strippedVisibleLength, CONSUMABLES_CHAR_LIMIT } from './output-validator';

/**
 * Guarantees a consumables description fits the char limit by removing whole trailing
 * <li> items (last-in-document first → Storage, then Applications, then Features).
 * Never touches <table> rows (spec values are sacred) and never drops a list below minPerList.
 * Re-serializes via DOMParser, so attribute/whitespace normalization is expected & harmless.
 */
export function trimConsumablesToLimit(
    html: string,
    limit = CONSUMABLES_CHAR_LIMIT,
    minPerList = 2,
): string {
    if (!html || strippedVisibleLength(html) <= limit) return html;

    const doc = new DOMParser().parseFromString(html, 'text/html');

    const nextRemovable = (): HTMLLIElement | null => {
        const lis = Array.from(doc.body.querySelectorAll('li'))
            .filter(li => !li.closest('table')) as HTMLLIElement[];
        for (let i = lis.length - 1; i >= 0; i--) {
            const list = lis[i].closest('ul,ol');
            if (list && list.querySelectorAll(':scope > li').length > minPerList) return lis[i];
        }
        return null;
    };

    let li: HTMLLIElement | null;
    while (strippedVisibleLength(doc.body.innerHTML) > limit && (li = nextRemovable())) {
        li.remove();
    }

    const out = doc.body.innerHTML;
    if (strippedVisibleLength(out) > limit) {
        console.warn('[consumables-trim] Still over limit after trimming all spare <li> — prose/tables too long; left to LLM repair.');
    }
    return out;
}