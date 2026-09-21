/**
 * US-2.2 (loop-back from QUALITY_GATE) — branch coverage for the FR-18 "absent paragraph is skipped"
 * paths of renderDescription and for the flat §7 array-value handling (FR-8). Each test asserts the
 * observable HTML, not that a line ran.
 */
import { describe, it, expect } from 'vitest';
import { renderDescription, type RenderContext } from './render-description';
import { getRenderRules } from '../prompt-core/store-render-rules';
import { KILLER_SPECS_HEADERS } from '../prompt-core/constants';
import type { ProductDescriptionDoc } from '../domain/description-doc';
import {
  v3BaseDoc, v3ArraySpecValue, v3NonBulletsKeyBenefits, asSchemaVersion4, v4ValidDoc,
} from '../../test/fixtures/v4-docs';

const CTX: RenderContext = {
  imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/',
  brandFolder: 'ortur',
  modelFolder: 'h20',
  storeName: 'EXPERT3D',
};
const liCount = (html: string) => (html.match(/<li>/g) ?? []).length;

function withoutKeyBenefits(doc: ProductDescriptionDoc): ProductDescriptionDoc {
  const { keyBenefits: _omit, ...rest } = doc;
  return rest as ProductDescriptionDoc;
}
function withoutKillerSpecs(doc: ProductDescriptionDoc): ProductDescriptionDoc {
  const { killerSpecs: _omit, ...rest } = doc;
  return rest as ProductDescriptionDoc;
}

describe("'3.0' §2 with only one half present (FR-18)", () => {
  it('killerSpecs without keyBenefits: renders the §2a table and no benefit list', () => {
    const html = renderDescription(withoutKeyBenefits(v3BaseDoc()), CTX);
    const [, benefitHeader] = KILLER_SPECS_HEADERS['uk-ua'];
    expect(html).toContain(`<th>${benefitHeader}</th>`);
    expect(html).toContain('Потужність лазера: 20 Вт');
    expect(html).not.toContain('Перевага');
  });

  it('keyBenefits without killerSpecs: renders the bullets and no §2a table', () => {
    const html = renderDescription(withoutKillerSpecs(v3BaseDoc()), CTX);
    const [, benefitHeader] = KILLER_SPECS_HEADERS['uk-ua'];
    expect(html).not.toContain(`<th>${benefitHeader}</th>`);
    expect(html).not.toContain('Потужність лазера');
    expect(html).toContain('Перевага');
  });

  it('neither half present: no §2 markup at all', () => {
    const html = renderDescription(withoutKillerSpecs(withoutKeyBenefits(v3BaseDoc())), CTX);
    expect(html).not.toContain('Перевага');
    expect(html).not.toContain('Потужність лазера');
    expect(html).toContain('Як працює лазерний модуль');
  });

  it('a locale without a §2a header pair falls back to the en-gb headers', () => {
    const html = renderDescription({ ...v3BaseDoc(), locale: 'xx-XX' }, CTX);
    const [paramHeader, benefitHeader] = KILLER_SPECS_HEADERS['en-gb'];
    expect(html).toContain(`<th>${paramHeader}</th>`);
    expect(html).toContain(`<th>${benefitHeader}</th>`);
  });
});

describe("'4.0' §2 combined list with one half absent", () => {
  it('killerSpecs only: the spec items are listed and no benefit item is', () => {
    const html = renderDescription(withoutKeyBenefits(v4ValidDoc()), CTX);
    expect(html).toContain('<li><b>Потужність лазера: 20 Вт</b> — Ріже фанеру 6 мм за один прохід.</li>');
    expect(html).not.toContain('Перевага');
  });

  it('keyBenefits only: the bullet items are listed and no spec item is', () => {
    const html = renderDescription(withoutKillerSpecs(v4ValidDoc()), CTX);
    expect(html).toContain('Перевага');
    expect(html).not.toContain('Потужність лазера: 20 Вт</b> —');
  });

  it('non-bullets keyBenefits Blocks contribute no list item and no markup', () => {
    const html = renderDescription(asSchemaVersion4(v3NonBulletsKeyBenefits()), CTX);
    const section2 = html.slice(html.indexOf('<ul>'), html.indexOf('</ul>'));
    expect(liCount(section2)).toBe(liCount(
      renderDescription(v4ValidDoc(), CTX).slice(
        renderDescription(v4ValidDoc(), CTX).indexOf('<ul>'),
        renderDescription(v4ValidDoc(), CTX).indexOf('</ul>'),
      ),
    ));
    expect(html).not.toContain('Модуль знімається без інструментів.');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<figure');
  });

  it('a context without storeName still assembles the §9 heading from the default rules', () => {
    const doc = v4ValidDoc();
    const { storeName: _omit, ...noStore } = CTX;
    const html = renderDescription(doc, noStore);
    const expected = getRenderRules('').ctaHeading(doc.locale, doc.localizedName);
    expect(html).toContain(`<h2>${expected}</h2>\n<p class="cta">`);
  });
});

describe('flatSpecs with a multi-valued SpecRow (FR-8)', () => {
  it('joins an array value with ", " inside one cell', () => {
    const html = renderDescription(v3ArraySpecValue(), CTX, { flatSpecs: true });
    expect(html).toContain('<tr><td>Сумісні матеріали</td><td>фанера, акрил, шкіра</td></tr>');
  });

  it('a plain string value is rendered verbatim', () => {
    const html = renderDescription(v3ArraySpecValue(), CTX, { flatSpecs: true });
    expect(html).toContain('<tr><td>Потужність</td><td>20 Вт</td></tr>');
  });
});
