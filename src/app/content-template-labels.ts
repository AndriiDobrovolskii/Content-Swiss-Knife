/**
 * The Content Template dropdown labels, EN and UA (US-2.2 FR-2, AC-2, AC-9).
 *
 * A pure module (no Angular import) so the label sets can be checked by plain vitest: `uiLabels` in
 * `app.component.ts` is a private const there. `app.component.ts` spreads `TEMPLATE_LABELS.en` and
 * `.uk` into its two `TRANSLATIONS` entries, so `uiLabels()` exposes exactly these keys.
 *
 * The `Record<TemplateLabelKey, string>` annotation makes a key missing in either language a build
 * error, which is the FR-2 failure path (a label must never render as a raw key or blank).
 *
 * OD-10 (open): the wording below is the Specification's. A different wording is a one-string change
 * here and nowhere else.
 */
import type { SimplifiedTemplateId } from '../prompt-core/simplified-templates';

export const TEMPLATE_LABEL_KEYS = [
  'templateFull',
  'templateFilaments',
  'templateAccessories',
  'templateSpareParts',
  'includeFunctionality',
] as const;

export type TemplateLabelKey = (typeof TEMPLATE_LABEL_KEYS)[number];

/** Which label names each simplified template in the dropdown. Full description is the static option. */
export const TEMPLATE_ID_LABEL_KEY: Record<SimplifiedTemplateId, TemplateLabelKey> = {
  'filaments-resins-powders': 'templateFilaments',
  accessories: 'templateAccessories',
  'spare-parts': 'templateSpareParts',
};

export const TEMPLATE_LABELS: { en: Record<TemplateLabelKey, string>; uk: Record<TemplateLabelKey, string> } = {
  en: {
    templateFull: 'Full description',
    templateFilaments: 'Filaments, resins, powders',
    templateAccessories: 'Accessories',
    templateSpareParts: 'Spare parts',
    includeFunctionality: 'Include Functionality (§3)',
  },
  uk: {
    templateFull: 'Повний опис',
    templateFilaments: 'Філаменти, смоли, порошки',
    templateAccessories: 'Аксесуари',
    templateSpareParts: 'Запчастини',
    includeFunctionality: 'Додати блок Функціональність (§3)',
  },
};
