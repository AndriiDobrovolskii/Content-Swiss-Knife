import { ValidationIssue } from './output-validator';

/**
 * language-consistency.ts
 *
 * Deterministic backstop against mid-document language drift — the failure mode where the LLM
 * starts in the input's own language (§1 Hook) but drifts into a different one partway through,
 * typically triggered by a strong contextual cue elsewhere in the prompt (a store name, an image
 * URL's domain) that TASK_OPTIMIZE_INSTRUCTION's SCOPE OVERRIDE explicitly forbids using as a
 * language signal but cannot reliably suppress on every input — see optimizer.ts's own comment:
 * "this task has produced incorrect output before by treating them as if they were." Empirically
 * confirmed: xTool F2 / impresora-3d.es input (English prose, .es image domain) → §1 stayed
 * English, everything from §2 onward drifted to Spanish.
 *
 * Optimizer has no known target locale — that's the whole point (see optimizer.ts) — so this
 * can't check against a fixed expected language the way output-validator.ts's other locale-gated
 * checks do. Instead it treats §1 (the block OUTPUT LANGUAGE is anchored to) as ground truth and
 * checks the rest of the document against it: first at script-family level (Cyrillic vs Latin —
 * cheap, 100% reliable), then within Latin script via a stopword vote (no ML/embeddings —
 * consistent with the project's determinism doctrine), and within Cyrillic script via a small
 * uk/ru-discriminating letter set (mirrors the uk/ru conflation bug already found in
 * isAlreadyCyrillic's binary classifier — this check doesn't repeat that mistake).
 *
 * False-negative safe by design: when there isn't enough signal to call a language confidently,
 * the check no-ops rather than guessing — a validator that cries wolf on ambiguous input trains
 * the repair-gate to "fix" things that aren't broken, burning a retry for nothing.
 */

const CYRILLIC_RE = /[\u0400-\u04FF]/g;
const LATIN_RE = /[a-zA-ZÀ-ÿ]/g;

// Letters unique to one alphabet — enough to tell uk-UA and ru-UA apart without a dictionary.
const UK_ONLY_RE = /[іїєґІЇЄҐ]/g;
const RU_ONLY_RE = /[ыэёъЫЭЁЪ]/g;

// One stopword set per Latin language Optimizer realistically sees (STORE_REGISTRY's set) plus
// two common non-store languages, so drift into a language the store network doesn't even use
// still gets caught. Not meant to be exhaustive — MIN_STOPWORD_HITS is what makes it work with
// a short list.
const LATIN_STOPWORDS: Record<string, string[]> = {
    en: ['the', 'and', 'for', 'with', 'this', 'that', 'from', 'are', 'is', 'of', 'to', 'a'],
    es: ['el', 'la', 'de', 'para', 'con', 'una', 'un', 'que', 'los', 'las', 'y', 'es'],
    pt: ['para', 'com', 'uma', 'um', 'que', 'dos', 'das', 'não', 'os', 'as', 'é'],
    pl: ['dla', 'oraz', 'jest', 'przez', 'który', 'się', 'nie', 'na', 'do', 'z'],
    de: ['der', 'die', 'das', 'und', 'für', 'mit', 'ist', 'ein', 'eine', 'nicht'],
    fr: ['le', 'la', 'de', 'pour', 'avec', 'une', 'un', 'que', 'les', 'des', 'et', 'est'],
    it: ['il', 'la', 'di', 'per', 'con', 'una', 'un', 'che', 'gli', 'le', 'sono', 'è'],
};

const MIN_SIGNAL_CHARS = 20;
const MIN_SIGNAL_WORDS = 20;
const MIN_STOPWORD_HITS = 5;

function scriptFamily(text: string): 'cyrillic' | 'latin' | 'unknown' {
    const cyr = (text.match(CYRILLIC_RE) ?? []).length;
    const lat = (text.match(LATIN_RE) ?? []).length;
    if (cyr + lat < MIN_SIGNAL_CHARS) return 'unknown';
    return cyr > lat ? 'cyrillic' : 'latin';
}

function detectCyrillicSubLanguage(text: string): 'uk' | 'ru' | null {
    const uk = (text.match(UK_ONLY_RE) ?? []).length;
    const ru = (text.match(RU_ONLY_RE) ?? []).length;
    if (uk === 0 && ru === 0) return null;
    return uk >= ru ? 'uk' : 'ru';
}

function detectLatinLanguage(text: string): string | null {
    const words = text.toLowerCase().match(/\b[a-zà-ÿ]+\b/g) ?? [];
    if (words.length < MIN_SIGNAL_WORDS) return null;
    const scores = Object.entries(LATIN_STOPWORDS).map(([lang, sw]) => {
        const set = new Set(sw);
        return [lang, words.filter(w => set.has(w)).length] as const;
    });
    scores.sort((a, b) => b[1] - a[1]);
    const [topLang, topScore] = scores[0];
    const secondScore = scores[1]?.[1] ?? 0;
    // Require both a minimum absolute signal AND a clear lead over the runner-up — romance
    // languages (es/pt/fr/it) share enough short stopwords that a near-tie isn't real signal.
    if (topScore < MIN_STOPWORD_HITS || topScore <= secondScore) return null;
    return topLang;
}

/** Extract all visible prose from HTML and detect its language. */
function detectHtmlLanguage(html: string): { family: 'cyrillic' | 'latin' | 'unknown'; lang: string | null } {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body.textContent ?? '';
    const family = scriptFamily(text);
    if (family === 'unknown') return { family, lang: null };
    const lang = family === 'cyrillic' ? detectCyrillicSubLanguage(text) : detectLatinLanguage(text);
    return { family, lang };
}

/**
 * Validates that the output HTML's language matches the input HTML's language and that
 * the output is internally consistent (no mid-document drift).
 *
 * Two layers of defense:
 *
 * 1. **Input→Output mismatch** (new): detects wholesale translation — the failure mode where
 *    the LLM translates the entire document (including §1) into the wrong language. This was
 *    invisible to the old §1-vs-rest check because a fully-Spanish output is internally
 *    consistent. Requires `inputHtml` to be passed.
 *
 * 2. **Internal drift** (original): detects mid-document language switch — e.g. §1 stays
 *    English but §2 onward drifts to Spanish. Works even without `inputHtml`.
 *
 * Run on the FULL rewritten HTML, after finalizeTablesForDisplay() — see the repair-gate
 * wiring in content-orchestrator.service.ts's optimize().
 */
export function validateLanguageConsistency(html: string, inputHtml?: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // ── Layer 1: Input→Output language mismatch ──────────────────────────────
    // When we know the input language, compare it against the output language.
    // This catches the wholesale-translation bug: EN input → entire output in ES.
    if (inputHtml) {
        const input = detectHtmlLanguage(inputHtml);
        const output = detectHtmlLanguage(html);

        if (input.family !== 'unknown' && output.family !== 'unknown') {
            if (input.family !== output.family) {
                issues.push({
                    severity: 'error',
                    rule: 'language-mismatch-script',
                    detail:
                        `Input is ${input.family} script but the output is ${output.family} script — ` +
                        `the output must be written in the same language as the input.`,
                    context: 'Optimizer output',
                });
                return issues;
            }

            if (input.lang && output.lang && input.lang !== output.lang) {
                issues.push({
                    severity: 'error',
                    rule: 'language-mismatch',
                    detail:
                        `Input language is "${input.lang}" but the output is entirely in "${output.lang}" — ` +
                        `the output must be written in the same language as the input, not translated.`,
                    context: 'Optimizer output',
                });
                return issues;
            }
        }
    }

    // ── Layer 2: Internal drift within the output ────────────────────────────
    // Even if Layer 1 passes (or inputHtml is unavailable), check that the output
    // doesn't drift mid-document.
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const blocks = Array.from(doc.body.children).map(el => el.textContent ?? '');
    if (blocks.length < 2) return issues; // nothing to compare against

    const anchorText = blocks[0];
    const anchorFamily = scriptFamily(anchorText);
    if (anchorFamily === 'unknown') return issues;

    const anchorLang =
        anchorFamily === 'cyrillic'
            ? detectCyrillicSubLanguage(anchorText)
            : detectLatinLanguage(anchorText);

    let currentChunk = '';
    for (let i = 1; i < blocks.length; i++) {
        currentChunk += (currentChunk ? ' ' : '') + blocks[i];

        const chunkFamily = scriptFamily(currentChunk);
        if (chunkFamily === 'unknown') continue;

        if (anchorFamily !== chunkFamily) {
            issues.push({
                severity: 'error',
                rule: 'language-drift-script',
                detail:
                    `Hook (§1) is written in ${anchorFamily} script but the rest of the document is ` +
                    `${chunkFamily} script — output must stay in one language throughout, matching the ` +
                    `input's own language.`,
                context: 'Optimizer output',
            });
            return issues;
        }

        const chunkLang =
            chunkFamily === 'cyrillic'
                ? detectCyrillicSubLanguage(currentChunk)
                : detectLatinLanguage(currentChunk);

        if (chunkLang) {
            if (anchorLang && chunkLang !== anchorLang) {
                if (anchorFamily === 'cyrillic') {
                    const label = (l: string) => (l === 'uk' ? 'uk-UA' : 'ru-UA');
                    issues.push({
                        severity: 'error',
                        rule: 'language-drift',
                        detail:
                            `Hook (§1) reads as ${label(anchorLang)} but the rest of the document reads as ` +
                            `${label(chunkLang)} — output must stay in one language throughout.`,
                        context: 'Optimizer output',
                    });
                } else {
                    issues.push({
                        severity: 'error',
                        rule: 'language-drift',
                        detail:
                            `Hook (§1) is in "${anchorLang}" but the rest of the document reads as "${chunkLang}" — ` +
                            `output must stay in one language throughout, matching the input's own language.`,
                        context: 'Optimizer output',
                    });
                }
                return issues;
            }
            // Chunk matched the anchor language — reset to start evaluating the next section independently.
            currentChunk = '';
        }
    }

    return issues;
}