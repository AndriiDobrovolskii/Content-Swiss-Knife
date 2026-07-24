import { describe, it, expect } from 'vitest';
import { validateLanguageConsistency } from './language-consistency';

// ~25+ words per block — clears MIN_SIGNAL_WORDS/MIN_SIGNAL_CHARS.
const EN_HOOK =
    `<p>The xTool F2 Portable Dual Laser Engraver is a highly portable, industrial-grade dual-laser ` +
    `system designed to transform personalised engraving into an automated, high-throughput business ` +
    `for retail and event use.</p>`;

const ES_REST =
    `<p>El módulo de diodo de 15 W produce cortes profundos y grabados nítidos en madera, cuero y ` +
    `acrílico, mientras que el láser infrarrojo de 5 W a 1064 nm se dirige a metales y plásticos ` +
    `duros con una precisión de alineación excepcional.</p>` +
    `<p>La cámara inteligente de 50 MP proporciona una vista previa del espacio de trabajo a escala ` +
    `real, eliminando la alineación manual y reduciendo el desperdicio de material en cada lote.</p>`;

const ES_HOOK =
    `<p>El xTool F2 Portable Dual Laser Engraver es un sistema láser dual portátil de grado ` +
    `industrial diseñado para transformar el grabado personalizado en un negocio automatizado y de ` +
    `alto rendimiento para tiendas y eventos.</p>`;

const UK_HOOK =
    `<p>xTool F2 Portable Dual Laser Engraver — це високопортативна промислова система з двома ` +
    `лазерами, розроблена для перетворення персоналізованого гравіювання на автоматизований, ` +
    `високопродуктивний бізнес для роздрібної торгівлі та подій.</p>`;

const RU_REST =
    `<p>Модуль диода мощностью 15 Вт обеспечивает глубокие и четкие резы на дереве, коже и ` +
    `акриле, в то время как инфракрасный лазер мощностью 5 Вт с длиной волны 1064 нм предназначен ` +
    `для металлов и твердых пластиков с исключительной точностью выравнивания.</p>` +
    `<p>Интеллектуальная камера с разрешением 50 МП обеспечивает предварительный просмотр рабочей ` +
    `области в реальном масштабе, устраняя ручное выравнивание и уменьшая потери материала в ` +
    `каждой партии.</p>`;

describe('validateLanguageConsistency', () => {
    it('flags the reproduced xTool F2 bug: English hook, Spanish rest (same Latin script)', () => {
        const issues = validateLanguageConsistency(EN_HOOK + ES_REST);
        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('language-drift');
        expect(issues[0].detail).toContain('"en"');
        expect(issues[0].detail).toContain('"es"');
    });

    it('flags a script-family mismatch: English hook, Ukrainian rest', () => {
        const cyrillicRest = UK_HOOK.replace('<p>', '<p>').repeat(1); // reuse as a Cyrillic block
        const issues = validateLanguageConsistency(EN_HOOK + `<p>${cyrillicRest}</p>`);
        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('language-drift-script');
    });

    it('flags a same-script sub-language mismatch: uk-UA hook, ru-UA rest', () => {
        const issues = validateLanguageConsistency(UK_HOOK + RU_REST);
        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('language-drift');
        expect(issues[0].detail).toContain('uk-UA');
        expect(issues[0].detail).toContain('ru-UA');
    });

    it('does not flag a consistent Spanish document', () => {
        expect(validateLanguageConsistency(ES_HOOK + ES_REST)).toHaveLength(0);
    });

    it('does not flag a consistent Ukrainian document', () => {
        expect(validateLanguageConsistency(UK_HOOK + UK_HOOK)).toHaveLength(0);
    });

    it('no-ops when there is only one top-level block (nothing to compare)', () => {
        expect(validateLanguageConsistency(EN_HOOK)).toHaveLength(0);
    });

    it('no-ops when blocks are too short to carry signal', () => {
        expect(validateLanguageConsistency('<p>Hi.</p><p>Hola.</p>')).toHaveLength(0);
    });

    // ── Layer 1: Input→Output mismatch (wholesale translation) ───────────
    it('flags wholesale translation: EN input, fully-ES output (no internal drift)', () => {
        // The output is internally consistent Spanish — old §1-vs-rest would miss this.
        const esOutput = ES_HOOK + ES_REST;
        const enInput = EN_HOOK + `<p>The 15W diode module delivers deep, precise cuts and crisp ` +
            `engravings on wood, leather, and acrylic, while the 5W IR laser at 1064 nm targets ` +
            `metals and hard plastics with exceptional alignment precision.</p>`;
        const issues = validateLanguageConsistency(esOutput, enInput);
        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('language-mismatch');
        expect(issues[0].detail).toContain('"en"');
        expect(issues[0].detail).toContain('"es"');
    });

    it('flags script-family mismatch between input and output', () => {
        const issues = validateLanguageConsistency(UK_HOOK + UK_HOOK, EN_HOOK + EN_HOOK);
        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('language-mismatch-script');
    });

    it('does not flag when input and output are both English', () => {
        const enOutput = EN_HOOK + `<p>The 15W diode module delivers deep, precise cuts and ` +
            `crisp engravings on wood, leather, and acrylic for commercial environments.</p>`;
        const enInput = EN_HOOK + `<p>The xTool F2 is a compact laser system designed for ` +
            `high-throughput personalised engraving with dual laser sources.</p>`;
        expect(validateLanguageConsistency(enOutput, enInput)).toHaveLength(0);
    });
});