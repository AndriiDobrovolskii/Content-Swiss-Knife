/**
 * unit-tables.ts
 *
 * THE unit vocabulary for deterministic post-processing.
 *
 * Mirrors the CYRILLIC LANGUAGES table in UNIT_LOCALIZATION_RULES (prompt-core/constants.ts),
 * which stays the copy the MODEL is given; this is the copy CODE consumes. A spec test asserts
 * every mapping here appears in that prompt text, so the two cannot drift.
 *
 * Before this file there were three partial copies of "what counts as a unit": the spacing
 * regexes in number-format-fixer.ts, UNIT_TOKENS in alt-numeric-fidelity.ts, and the frozen
 * output-validator's LATIN_UNIT_IN_CYRILLIC. This is the shared, extensible one; new consumers
 * import from here.
 *
 * Pure data, no LLM.
 */

/** `ru` omitted means the Ukrainian form is used for both languages. */
export interface UnitMapping {
  uk: string;
  ru?: string;
}

/**
 * Latin unit abbreviation -> Cyrillic. Keys are matched CASE-SENSITIVELY: "W" is watt but "w" is
 * not, "A" is ampere but "a" is an article. Consumers must sort the alternation longest-first so
 * "mm/s" wins over "mm" and "kW" over "W".
 *
 * TWO UNITS ARE DELIBERATELY ABSENT although UNIT_LOCALIZATION_RULES lists them:
 *   h -> год. / ч      s -> с
 * Both are a single Latin letter after a digit, which is far more often a model-code fragment
 * ("Bambu Lab A1", "EinScan H2") than a measurement — and `s -> с` is a Latin/Cyrillic homoglyph
 * swap that no reviewer would ever spot in review. The prompt still asks the model for them; the
 * deterministic fixer declines to guess. Documented limitation, not an oversight.
 */
export const LATIN_TO_CYRILLIC_UNITS: Record<string, UnitMapping> = {
  // composite — must precede their components in any longest-first sort
  'mm/s': { uk: 'мм/с' },
  'm/s': { uk: 'м/с' },
  'kg/h': { uk: 'кг/год', ru: 'кг/ч' },
  // frequency
  'kHz': { uk: 'кГц' },
  'MHz': { uk: 'МГц' },
  'GHz': { uk: 'ГГц' },
  'Hz': { uk: 'Гц' },
  // electrical
  'mAh': { uk: 'мА·год', ru: 'мА·ч' },
  'mA': { uk: 'мА' },
  'kV': { uk: 'кВ' },
  'mV': { uk: 'мВ' },
  'kW': { uk: 'кВт' },
  'mW': { uk: 'мВт' },
  'W': { uk: 'Вт' },
  'V': { uk: 'В' },
  'A': { uk: 'А' },
  // data
  'Mbit': { uk: 'Мбіт', ru: 'Мбит' },
  'Gbit': { uk: 'Гбіт', ru: 'Гбит' },
  'GB': { uk: 'ГБ' },
  'MB': { uk: 'МБ' },
  'TB': { uk: 'ТБ' },
  // length — area/volume variants first
  'cm²': { uk: 'см²' },
  'cm³': { uk: 'см³' },
  'm²': { uk: 'м²' },
  'm³': { uk: 'м³' },
  'µm': { uk: 'мкм' },
  'μm': { uk: 'мкм' },
  'nm': { uk: 'нм' },
  'mm': { uk: 'мм' },
  'cm': { uk: 'см' },
  'km': { uk: 'км' },
  'm': { uk: 'м' },
  // mass
  'kg': { uk: 'кг' },
  'mg': { uk: 'мг' },
  'g': { uk: 'г' },
  // volume
  'ml': { uk: 'мл' },
  'L': { uk: 'л' },
  'l': { uk: 'л' },
  // rate / time
  'rpm': { uk: 'об/хв', ru: 'об/мин' },
  'min': { uk: 'хв.', ru: 'мин.' },
};

/**
 * NEVER converted, per the fixed exception list in UNIT_LOCALIZATION_RULES: technical convention
 * keeps these Latin even in Cyrillic text. They are simply absent from the map above — listed
 * here so the agreement test can assert the exclusion is deliberate rather than an omission.
 *
 * "V AC" / "VAC" needs an extra lookahead in the consumer, because it shares its leading token
 * with the genuine voltage unit "V".
 *
 * Inch marks are also exempt but are not listed here: the prompt states that exemption in prose
 * ("any inch marks in US-market content") rather than as a token, and no inch symbol appears in
 * the map, so nothing would convert one anyway.
 */
export const UNIT_SCRIPT_EXCEPTIONS = [
  '°C', '°F', 'VAC', 'V AC', 'dpi', 'px', 'fps', 'K', 'ppm',
] as const;

/** Units the prompt lists but the deterministic fixer deliberately declines — see the map's note. */
export const UNIT_SCRIPT_DECLINED = ['h', 's'] as const;
