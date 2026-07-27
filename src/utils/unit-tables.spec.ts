/**
 * unit-tables.spec.ts
 *
 * Anti-drift guard: unit-tables.ts is the copy CODE consumes, UNIT_LOCALIZATION_RULES is the copy
 * the MODEL is given. If they disagree, the deterministic fixer and the prompt pull in different
 * directions and the output becomes inconsistent by construction.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { LATIN_TO_CYRILLIC_UNITS, UNIT_SCRIPT_EXCEPTIONS, UNIT_SCRIPT_DECLINED } from './unit-tables';
import { UNIT_LOCALIZATION_RULES } from '../prompt-core/constants';

/** The prompt writes "kg/h → кг/год" with spaces but "mm→мм" without; normalize the arrow. */
const PROMPT = UNIT_LOCALIZATION_RULES.replace(/\s*→\s*/g, '→');
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/**
 * The prompt groups some units as alternations — "L/l→л", "μm/µm→мкм", "Mbit/Mb→Мбіт" — so a
 * key may sit on either side of the slash. Accept all three shapes.
 */
function promptDeclares(latin: string, cyrillic: string): boolean {
  return (
    PROMPT.includes(`${latin}→${cyrillic}`) ||
    new RegExp(`(?:^|[\\s,(])${esc(latin)}/[^\\s,]*→${esc(cyrillic)}`, 'm').test(PROMPT) ||
    new RegExp(`(?:^|[\\s,(])[^\\s,/]*/${esc(latin)}→${esc(cyrillic)}`, 'm').test(PROMPT)
  );
}

describe('unit-tables agrees with UNIT_LOCALIZATION_RULES', () => {
  it('every mapped unit is declared in the prompt rules with the same Cyrillic form', () => {
    for (const [latin, { uk }] of Object.entries(LATIN_TO_CYRILLIC_UNITS)) {
      expect(promptDeclares(latin, uk), `${latin} -> ${uk}`).toBe(true);
    }
  });

  /**
   * The prompt is authoritative and says: "Any unit NOT listed anywhere above: keep as in
   * source, do not guess." This caught an invented "mm/min" mapping during implementation.
   */
  it('contains no unit the prompt does not list', () => {
    for (const latin of Object.keys(LATIN_TO_CYRILLIC_UNITS)) {
      expect(PROMPT, latin).toMatch(new RegExp(`(?:^|[\\s,/(])${esc(latin)}(?:[/→]|\\b)`, 'm'));
    }
  });

  it('every ru-specific form appears in the prompt rules too', () => {
    for (const [latin, { ru }] of Object.entries(LATIN_TO_CYRILLIC_UNITS)) {
      if (!ru) continue;
      expect(UNIT_LOCALIZATION_RULES, `${latin} -> ${ru} (ru)`).toContain(ru);
    }
  });

  it('every exception is named in the prompt rules and absent from the map', () => {
    for (const unit of UNIT_SCRIPT_EXCEPTIONS) {
      expect(UNIT_LOCALIZATION_RULES, unit).toContain(unit);
      expect(LATIN_TO_CYRILLIC_UNITS, unit).not.toHaveProperty(unit);
    }
  });

  /** These are in the prompt but deliberately not in the map — see the map's doc comment. */
  it('the declined units are absent from the map, on purpose', () => {
    for (const unit of UNIT_SCRIPT_DECLINED) {
      expect(LATIN_TO_CYRILLIC_UNITS, unit).not.toHaveProperty(unit);
    }
  });

  it('no mapping is its own identity, and no Cyrillic form leaked into a key', () => {
    for (const [latin, { uk }] of Object.entries(LATIN_TO_CYRILLIC_UNITS)) {
      expect(latin).not.toBe(uk);
      expect(latin, latin).toMatch(/^[\x20-\x7E²³µμ]+$/);
    }
  });
});
