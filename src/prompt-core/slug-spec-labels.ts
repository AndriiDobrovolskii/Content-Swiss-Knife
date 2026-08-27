/**
 * slug-spec-labels.ts
 *
 * Deterministic, localized labels for a killer-spec URL-slug suffix.
 *
 * WHY A REGISTRY, NOT A MODEL TRANSLATION. A slug is permanent state — the URL of a published
 * product page. If the label token came from the LLM (asked to translate "power" into pl-PL at
 * slug-generation time), two independent runs of the same product could translate it differently
 * and produce two different URLs for what should be the same page — exactly the class of bug PR
 * #103 fixed for Cyrillic transliteration (prynter/printer), by moving that decision from the model
 * into code. This does not repeat that mistake one layer up.
 *
 * OPEN KEY, CLOSED REGISTRY. `KillerSpec.key` (description-doc.ts) is an open string — the model
 * can emit any short kebab-case identifier. This registry only recognizes a known, curated subset.
 * `resolveSpecLabel` returns `null` for anything else, which is the normal "no suffix for this
 * product" outcome, not an error — see killer-spec-resolver.ts.
 *
 * SEED TRANSLATIONS, NOT FINAL COPY. This table was drafted without access to a maintained
 * glossary/terminology file (none exists in this repo today — "glossary" appears only as prose
 * inside prompt text, e.g. constants.ts's anti-anglicism rules, not as a machine-checkable
 * artifact). Have a native speaker per locale review these before enabling any store on
 * slug-spec-suffix-flag.ts's allow-list.
 */

/** BCP-47 locale codes covering every language STORE_REGISTRY (constants.ts) actually uses. */
export const SPEC_LABEL_REGISTRY: Record<string, Record<string, string>> = {
  accuracy: {
    'uk-UA': 'точність', 'ru-UA': 'точность', 'pl-PL': 'dokładność',
    'de-DE': 'Genauigkeit', 'es-ES': 'precisión', 'es-MX': 'precisión',
    'pt-PT': 'precisão', 'en-GB': 'accuracy', 'en-ES': 'accuracy', 'en-US': 'accuracy',
  },
  resolution: {
    'uk-UA': 'роздільна здатність', 'ru-UA': 'разрешение', 'pl-PL': 'rozdzielczość',
    'de-DE': 'Auflösung', 'es-ES': 'resolución', 'es-MX': 'resolución',
    'pt-PT': 'resolução', 'en-GB': 'resolution', 'en-ES': 'resolution', 'en-US': 'resolution',
  },
  speed: {
    'uk-UA': 'швидкість', 'ru-UA': 'скорость', 'pl-PL': 'prędkość',
    'de-DE': 'Geschwindigkeit', 'es-ES': 'velocidad', 'es-MX': 'velocidad',
    'pt-PT': 'velocidade', 'en-GB': 'speed', 'en-ES': 'speed', 'en-US': 'speed',
  },
  'frame-rate': {
    'uk-UA': 'частота кадрів', 'ru-UA': 'частота кадров', 'pl-PL': 'liczba klatek',
    'de-DE': 'Bildrate', 'es-ES': 'fotogramas', 'es-MX': 'fotogramas',
    'pt-PT': 'fotogramas', 'en-GB': 'frame rate', 'en-ES': 'frame rate', 'en-US': 'frame rate',
  },
  'build-volume': {
    'uk-UA': 'область друку', 'ru-UA': 'область печати', 'pl-PL': 'obszar druku',
    'de-DE': 'Bauraum', 'es-ES': 'volumen de impresión', 'es-MX': 'volumen de impresión',
    'pt-PT': 'volume de impressão', 'en-GB': 'build volume',
    'en-ES': 'build volume', 'en-US': 'build volume',
  },
  'working-area': {
    'uk-UA': 'робоча зона', 'ru-UA': 'рабочая зона', 'pl-PL': 'obszar roboczy',
    'de-DE': 'Arbeitsbereich', 'es-ES': 'área de trabajo', 'es-MX': 'área de trabajo',
    'pt-PT': 'área de trabalho', 'en-GB': 'working area',
    'en-ES': 'working area', 'en-US': 'working area',
  },
  'layer-height': {
    'uk-UA': 'висота шару', 'ru-UA': 'высота слоя', 'pl-PL': 'wysokość warstwy',
    'de-DE': 'Schichthöhe', 'es-ES': 'altura de capa', 'es-MX': 'altura de capa',
    'pt-PT': 'altura de camada', 'en-GB': 'layer height',
    'en-ES': 'layer height', 'en-US': 'layer height',
  },
  power: {
    'uk-UA': 'потужність', 'ru-UA': 'мощность', 'pl-PL': 'moc',
    'de-DE': 'Leistung', 'es-ES': 'potencia', 'es-MX': 'potencia',
    'pt-PT': 'potência', 'en-GB': 'power', 'en-ES': 'power', 'en-US': 'power',
  },
};

/** `null` for an unrecognized key or an unmapped locale — the normal "no suffix" fallback. */
export function resolveSpecLabel(key: string, language: string): string | null {
  return SPEC_LABEL_REGISTRY[key]?.[language] ?? null;
}

/**
 * Locale-agnostic membership check — is `key` recognized at all, for any language? Used to raise a
 * visible warning when the model drifts from the registry's known vocabulary (e.g. emitting
 * "scan-accuracy" instead of "accuracy" across two otherwise-identical runs of the same product),
 * so that drift is observable rather than only showing up as a silently-flickering "does this
 * product get a slug suffix or not" outcome.
 */
export function isKnownSpecKey(key: string): boolean {
  return key in SPEC_LABEL_REGISTRY;
}
