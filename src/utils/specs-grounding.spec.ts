import { describe, it, expect } from 'vitest';
import { validateSpecsGrounding } from './specs-grounding';

const SRC = `Build Volume: 330 × 330 × 565 mm (61.5 L)
Hopper Capacity: 105 L
Layer Thickness: 110 μm
Laser: Ytterbium Fibre, 120 W`;

/** Mirrors the real schema: section.specs → table → thead(Parameter|Value) → tbody rows. */
function specSection(rows: string): string {
  return `<section class="specs"><table>` +
    `<thead><tr><th>Parameter</th><th>Value</th></tr></thead>` +
    `<tbody>${rows}</tbody></table></section>`;
}

describe('validateSpecsGrounding — Rule: spec-row-not-grounded', () => {
  it('flags a hallucinated row whose label is absent from source ("Throughput")', () => {
    const html = specSection(`<tr><td>Throughput</td><td>0330 kg/hr</td></tr>`);
    const issues = validateSpecsGrounding(html, SRC, 'HTML (base)');
    expect(issues.find(i => i.rule === 'spec-row-not-grounded')?.severity).toBe('error');
  });

  it('does NOT flag a grounded row present in source ("Hopper Capacity")', () => {
    const html = specSection(`<tr><td>Hopper Capacity</td><td>105 L</td></tr>`);
    expect(validateSpecsGrounding(html, SRC, 'HTML (base)')).toHaveLength(0);
  });

  it('does NOT flag the <thead> header row (label "Parameter" is not a spec)', () => {
    const html = specSection(`<tr><td>Build Volume</td><td>330 × 330 × 565 mm</td></tr>`);
    // Only the grounded Build Volume row exists in tbody; header "Parameter" must be ignored.
    expect(validateSpecsGrounding(html, SRC, 'HTML (base)')).toHaveLength(0);
  });

  it('does NOT run on the top key-specs table (bare table outside section.specs)', () => {
    const html =
      `<div class="table-responsive"><table>` +
      `<thead><tr><th>Specification</th><th>Value</th><th>Why it matters</th></tr></thead>` +
      `<tbody><tr><td>Throughput</td><td>0330 kg/hr</td><td>faster jobs</td></tr></tbody>` +
      `</table></div>`;
    expect(validateSpecsGrounding(html, SRC, 'HTML (base)')).toHaveLength(0);
  });

  it('no-ops when source specs are empty', () => {
    const html = specSection(`<tr><td>Throughput</td><td>0330</td></tr>`);
    expect(validateSpecsGrounding(html, '', 'HTML (base)')).toHaveLength(0);
  });

  it('skips rows whose label is only generic/stopwords', () => {
    const html = specSection(`<tr><td>Type</td><td>PLA</td></tr>`);
    expect(validateSpecsGrounding(html, SRC, 'HTML (base)')).toHaveLength(0);
  });

  it('propagates context to the issue', () => {
    const html = specSection(`<tr><td>Throughput</td><td>0330</td></tr>`);
    const issue = validateSpecsGrounding(html, SRC, 'HTML (base)')
      .find(i => i.rule === 'spec-row-not-grounded');
    expect(issue?.context).toBe('HTML (base)');
  });
});
