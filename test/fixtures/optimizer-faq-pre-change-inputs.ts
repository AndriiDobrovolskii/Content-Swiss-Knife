/**
 * optimizer-faq-pre-change-inputs.ts - deterministic inputs for the US-9.1 D15 pre-change oracle
 * (`src/prompts/payload-oracle.d15.spec.ts`, plan D15, FR-23 items 4 and 5, NFR-9).
 *
 * WHY THIS EXISTS. Specification FR-23 says the optimizer's block 1 and `userContent`, and every block of the
 * Task C FAQ variant, are byte-unchanged by this Story. Before this oracle no byte golden, digest or snapshot
 * existed for either payload (`optimizer.spec.ts` is behavioural; the FAQ variant had only a "no master
 * fragment" negative check), and an edit to a constant they interpolate (`NO_LEAKED_REASONING_CLAUSE` for the
 * optimizer, the `FAQ_*` constants for the FAQ variant) would have passed every existing test. An empty
 * `git diff` over `optimizer.ts` proves the file, not the payload.
 *
 * The expected digests are in `test/fixtures/golden/optimizer-faq-pre-change.json`, captured by TEST_WRITING
 * from the commit the Story branch was cut from (header `_meta`), BEFORE any edit to `constants.ts` or
 * `master-system-prompt.ts` (both are in the import chain of those payloads). It is green on arrival and must
 * stay green after every later task. It is NEVER regenerated or updated to follow a change (AGENTS.md 7.7).
 *
 * Optimizer block 0 is deliberately not digested: it IS the master, so the spec asserts it `toBe` the live
 * `MASTER_SYSTEM_PROMPT` and nothing in the JSON has to follow a master edit.
 */
import { buildOptimizerPrompt } from '../../src/prompts/optimizer';
import { buildPromptC } from '../../src/prompts/task-c';
import { buildTranslatePrompt } from '../../src/prompts/task-translate';
import type { PromptPayload } from '../../src/prompt-core/payload';
import { registryPairs } from './task-c-description-inputs';

const FIGURES_HTML =
  '<p><b>Creality Ender-3 V3 SE</b> - budget FDM printer for first-time owners.</p>'
  + '<h2>Motion</h2><p>The direct-drive extruder feeds flexible filament without slipping.</p>'
  + '<figure><img src="https://cdn.example/creality/ender/extruder.jpg" alt="Direct-drive extruder" decoding="async">'
  + '<figcaption><b>Extruder:</b> direct-drive assembly</figcaption></figure>'
  + '<p>Auto leveling measures 25 points before each print.</p>'
  + '<figure><img src="https://cdn.example/creality/ender/leveling.jpg" alt="Leveling probe" loading="lazy" decoding="async">'
  + '<figcaption><b>Leveling:</b> probe above the nozzle</figcaption></figure>';

const POINTER_HTML =
  '<p><b>Ортур H20</b> - лазерний гравер для майстерні.</p>'
  + '<p>Ряд із трьох круглих модулів ззаду показано на зображенні.</p>'
  + '<figure><img src="https://cdn.example/ortur/h20/back.jpg" alt="Задня панель" decoding="async">'
  + '<figcaption><b>Задня панель:</b> три круглі модулі</figcaption></figure>';

const PLAIN_HTML = '<p><b>Тест</b> - короткий опис, 1,75 мм.</p>';

/** The optimizer input set: with and without `productName`, figures, a pointer sentence, plain text. */
export const OPTIMIZER_CASES: Record<string, () => PromptPayload> = {
  'with-name/figures': () => buildOptimizerPrompt(FIGURES_HTML, 'Creality Ender-3 V3 SE'),
  'no-name/figures': () => buildOptimizerPrompt(FIGURES_HTML),
  'with-name/pointer-sentence': () => buildOptimizerPrompt(POINTER_HTML, 'Ortur H20'),
  'no-name/pointer-sentence': () => buildOptimizerPrompt(POINTER_HTML),
  'with-name/plain': () => buildOptimizerPrompt(PLAIN_HTML, 'Ortur H20'),
  'no-name/plain': () => buildOptimizerPrompt(PLAIN_HTML),
};

/** A valid uk-UA master FAQ (the structure `task-c.faq.spec.ts` uses): the FAQ variant's input. */
export const FAQ_HTML =
  '<h3>Чи потрібен підігрів столу?</h3><p><b>Так, рекомендовано.</b> Нагрівайте стіл до 60 °C.</p>'
  + '<h3>Яке сопло обрати?</h3><p>Для швидкості - 0,4 мм:</p>'
  + '<ul><li><b>0,4 мм:</b> швидкість;</li><li><b>0,2 мм:</b> деталі.</li></ul>';

type FaqOpts = { sourceLocale?: string; localizedName?: string };
const FAQ_VARIANTS: Array<{ name: string; opts: FaqOpts }> = [
  { name: 'faq/no-source-locale', opts: {} },
  { name: 'faq/source-locale', opts: { sourceLocale: 'uk-UA' } },
  { name: 'faq/source-locale+localized-name', opts: { sourceLocale: 'uk-UA', localizedName: 'Ortur H20 20 W' } },
];

export const faqKey = (store: string, lang: string, variant: string) => `${store} | ${lang} | ${variant}`;

/**
 * The Task C FAQ variant (`buildPromptC(..., { contentKind: 'faq' })`) for the same 16 store x
 * non-master-language pairs the Task C description golden uses, three option variants each.
 */
export function faqVariantCases(): Record<string, () => PromptPayload> {
  const out: Record<string, () => PromptPayload> = {};
  for (const p of registryPairs()) {
    for (const v of FAQ_VARIANTS) {
      out[faqKey(p.store, p.lang, v.name)] = () => buildPromptC(FAQ_HTML, p.lang, p.store, p.group, undefined, { ...v.opts, contentKind: 'faq' });
    }
  }
  return out;
}

/** `buildTranslatePrompt` (carries no master): category 17 of plan D13. */
export const TRANSLATE_CASES: Record<string, () => PromptPayload> = {
  'translate/uk-user': () => buildTranslatePrompt(PLAIN_HTML, 'Ukrainian', 'user-facing-content'),
  'translate/de-internal': () => buildTranslatePrompt(PLAIN_HTML, 'German', 'internal-matching-only'),
  'translate/pl-user+spare-parts': () => buildTranslatePrompt(PLAIN_HTML, 'Polish', 'user-facing-content', 'spare-parts'),
};
