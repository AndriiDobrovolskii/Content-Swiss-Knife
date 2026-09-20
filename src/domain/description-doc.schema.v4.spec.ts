/**
 * description-doc.schema.v4.spec.ts — US-2.1 validation categories V1, V2 and V12.
 *
 * WHY A SECOND SPEC FILE BESIDE `description-doc.schema.spec.ts`. That file is the 2026-08-02
 * bullet-item regression suite and every test in it is green; nothing here weakens, re-authors or
 * reruns any of it. The v4 migration is a separate subject with its own reason to exist, and
 * keeping it separate means the `'3.0'` regression evidence and the `'4.0'` enforcement evidence
 * can be read — and can fail — independently.
 *
 * THE THREE CATEGORIES AND WHAT EACH IS FOR:
 *
 *   V1  `'3.0'` compatibility — the leak suite. Six cached shapes must keep parsing forever
 *       (OD-2, NFR-8). GREEN ON ARRIVAL, deliberately: it is the baseline that makes V2 meaningful,
 *       and it is only evidence while `src/domain/` is unmodified. See the header note below.
 *   V2  `'4.0'` enforcement. The same four leak shapes must FAIL under `'4.0'`, each at its own
 *       dotted path, so `doc-schema-issues.ts:118-120` hands the repair ladder a field to target.
 *   V12 FR-18's negative. Nothing here rejects a generation for a word count.
 */
import { describe, it, expect } from 'vitest';
import type { ZodIssue } from 'zod';

import { ProductDescriptionDocSchema } from './description-doc.schema';
import {
  V4_PACKAGE_CONTENTS_HEADING_UK,
  v3ArraySpecValue,
  v3BaseDoc,
  v3NonBulletsKeyBenefits,
  v3OverCeilingKeyBenefits,
  v3SingleH3FunctionalityGroup,
  v3WithCompatibilityAndPackageContents,
  v3WithVideo,
  v4LongHookDoc,
  v4Negatives,
  v4ValidDoc,
  wordCount,
} from '../../test/fixtures/v4-docs';

/** Every failing issue as `path: message`, the same join `doc-schema-issues.ts` performs. */
function issuesFor(doc: unknown): string[] {
  const result = ProductDescriptionDocSchema.safeParse(doc);
  return result.success ? [] : result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
}

/** Just the dotted paths, for asserting WHERE a rule fired rather than how it is worded. */
function pathsFor(doc: unknown): string[] {
  const result = ProductDescriptionDocSchema.safeParse(doc);
  return result.success ? [] : result.error.issues.map(i => i.path.join('.'));
}

function rawIssues(doc: unknown): ZodIssue[] {
  const result = ProductDescriptionDocSchema.safeParse(doc);
  return result.success ? [] : result.error.issues;
}

// ── V1 — `'3.0'` compatibility: the leak suite ───────────────────────────────────────────────────

/**
 * 🔵 CHARACTERIZATION / BASELINE — this block is GREEN BEFORE ANY IMPLEMENTATION EXISTS, and that
 * is the point of it. It is the instrument that falsifies the plan's central bet (D1: every v4 rule
 * sits behind `if (doc.schemaVersion !== '4.0') return;`, so no bound a cached document parses
 * through ever moves). A shape authored in the same commit as the rule it dodges is a tautology;
 * authored here, against `src/domain/` unmodified, it is evidence that these are legitimate
 * pre-existing cached shapes. If any test below turns red at T3, a v4 rule leaked onto `'3.0'`.
 */
describe('V1 — a cached `3.0` document keeps parsing, whatever v4 says about the same shape', () => {
  it.each([
    ['L1 / FR-27 — a functionality group with exactly one <h3>', v3SingleH3FunctionalityGroup],
    ['L3 / FR-4  — §2 carrying a paragraph, a figure and a video Block', v3NonBulletsKeyBenefits],
    ['L2 / FR-10 — a §7 spec row whose value is an array of strings', v3ArraySpecValue],
    ['L4 / FR-17 — a combined §2 list of twelve rendered items', v3OverCeilingKeyBenefits],
    ['FR-6 / V15 — §5 compatibility and §6 package contents both populated', v3WithCompatibilityAndPackageContents],
    ['FR-24     — a video embed carried in §3 functionality', v3WithVideo],
  ])('accepts %s', (_label, build) => {
    expect(issuesFor(build())).toEqual([]);
  });

  it('accepts the base document every builder above is derived from', () => {
    expect(issuesFor(v3BaseDoc())).toEqual([]);
  });

  /**
   * The bound FR-17 introduces is a CROSS-COLLECTION one, and this states why no single `.max()`
   * expresses it: the twelve-item fixture violates nothing today, because `killerSpecs` is capped
   * at 4, each `bullets` Block at 8, and `keyBenefits` has no cap on its number of Blocks at all.
   */
  it('shows the over-ceiling shape is legal today because every individual bound still holds', () => {
    const doc = v3OverCeilingKeyBenefits();
    const bullets = doc.keyBenefits[0];
    const items = bullets.kind === 'bullets' ? bullets.items.length : 0;
    expect(doc.killerSpecs).toHaveLength(4);
    expect(items).toBe(8);
    expect(doc.killerSpecs.length + items).toBe(12);
    expect(issuesFor(doc)).toEqual([]);
  });
});

// ── V2 — `'4.0'` enforcement ─────────────────────────────────────────────────────────────────────

describe('V2 — the same four shapes are rejected under `4.0`, each at its own dotted path', () => {
  it('FR-15 — the schema accepts `4.0` as a version at all', () => {
    expect(issuesFor(v4ValidDoc())).toEqual([]);
  });

  /**
   * FR-27 / the human's settled Decision 1. A §3 group opens `<h3>` sub-headings only when it has
   * 2+ distinct sub-functions. The path matters as much as the rejection: `repair-strategy.ts`
   * resolves `functionality.0.subsections` for a tier-0 fix, and a root-level issue would degrade
   * the repair to a full-document regeneration.
   */
  it('FR-27 — rejects a single-<h3> functionality group at `functionality.0.subsections`', () => {
    expect(pathsFor(v4Negatives.singleH3FunctionalityGroup())).toContain('functionality.0.subsections');
  });

  it('FR-27 — leaves an absent or empty `subsections` alone; the rule fires only on length 1', () => {
    const zero = v4ValidDoc();
    zero.functionality = [{ heading: 'Як працює модуль', blocks: [{ kind: 'paragraph', text: 'Текст.' }] }];
    expect(issuesFor(zero)).toEqual([]);
  });

  /**
   * FR-4. §2 of a `'4.0'` document is exactly one `<h2>` and one `<ul>` — so every Block in
   * `keyBenefits` must be `bullets`. All three offending Blocks are named, not just the first:
   * an implementation that stops at the first non-`bullets` Block leaves the model repairing one
   * field per attempt against a budget FR-30 can exhaust.
   */
  it('FR-4 — rejects every non-`bullets` §2 Block at `keyBenefits.<i>.kind`', () => {
    const paths = pathsFor(v4Negatives.nonBulletsKeyBenefits());
    expect(paths).toContain('keyBenefits.1.kind');   // paragraph
    expect(paths).toContain('keyBenefits.2.kind');   // figure
    expect(paths).toContain('keyBenefits.3.kind');   // video
  });

  it('FR-4 — a §2 of `bullets` Blocks only is accepted', () => {
    expect(issuesFor(v4ValidDoc())).toEqual([]);
  });

  /** FR-9 / FR-10. Multiple values are comma-joined by the MODEL into one string, not by the renderer. */
  it('FR-10 — rejects an array §7 spec value at `specs.categories.0.rows.2.value`', () => {
    expect(pathsFor(v4Negatives.arraySpecValue())).toContain('specs.categories.0.rows.2.value');
  });

  it('FR-10 — accepts the same parameter comma-joined into a single string', () => {
    const doc = v4ValidDoc();
    doc.specs.categories[0].rows.push({ label: 'Сумісні матеріали', value: 'фанера, акрил, шкіра' });
    expect(issuesFor(doc)).toEqual([]);
  });

  /**
   * FR-17. The ceiling is on the COMBINED list, and the issue sits at `keyBenefits` because no
   * single field owns it — that is FR-17's own stated consequence and the reason R2 exists.
   */
  it('FR-17 — rejects a combined §2 list of more than 8 items, at `keyBenefits`', () => {
    expect(pathsFor(v4Negatives.overCeilingKeyBenefits())).toContain('keyBenefits');
  });

  /**
   * T3 acceptance check 3 / D7. The issue carries its operands so the tier-1 repair instruction can
   * state the exact surplus instead of restating the rule. `params` is zod v3's only channel for
   * structured data on a custom issue; `repair-gate.ts:177-178` and `repair-strategy.ts:245-252`
   * both read `issue.measured` once it reaches a `ValidationIssue`.
   */
  it('FR-17 — the ceiling issue carries `measured: { actual, limit, unit }`', () => {
    const issue = rawIssues(v4Negatives.overCeilingKeyBenefits())
      .find(i => i.path.join('.') === 'keyBenefits');
    expect(issue).toBeDefined();
    expect((issue as unknown as { params?: { measured?: unknown } }).params?.measured)
      .toEqual({ actual: 12, limit: 8, unit: 'items' });
  });

  it('FR-17 — a combined §2 list of exactly 8 items is accepted; 9 is not', () => {
    const at8 = v4ValidDoc();
    at8.keyBenefits = [{
      kind: 'bullets',
      items: Array.from({ length: 5 }, (_, i) => ({ lead: `Перевага ${i + 1}:`, text: ` опис ${i + 1}.` })),
    }];
    expect(at8.killerSpecs).toHaveLength(3);
    expect(issuesFor(at8)).toEqual([]);

    const at9 = v4ValidDoc();
    at9.keyBenefits = [{
      kind: 'bullets',
      items: Array.from({ length: 6 }, (_, i) => ({ lead: `Перевага ${i + 1}:`, text: ` опис ${i + 1}.` })),
    }];
    expect(pathsFor(at9)).toContain('keyBenefits');
  });

  /**
   * FR-6 / D5. `packageContents.heading` stays model-authored, but for `'4.0'` it must be one of the
   * two code-resident entries for the document's locale — so the single-vs-set choice stays with the
   * model while the wording stops drifting between regenerations.
   */
  it('FR-6 — rejects a §6 heading that is not a table entry for the document locale', () => {
    const doc = v4ValidDoc();
    doc.packageContents = { heading: 'Комплектація товару', items: ['Гравер', 'Модуль'] };
    expect(pathsFor(doc)).toContain('packageContents.heading');
  });

  it('FR-6 — accepts the uk-UA single-product heading FR-6 states verbatim', () => {
    const doc = v4ValidDoc({ packageContentsHeading: V4_PACKAGE_CONTENTS_HEADING_UK });
    expect(issuesFor(doc)).toEqual([]);
  });

  /** FR-29 — the functionality bullets floor of 3 is NOT relaxed as a side effect of this Story. */
  it('FR-29 — a 2-item bullets Block in §3 still fails under `4.0`, exactly as under `3.0`', () => {
    const doc = v4ValidDoc();
    doc.functionality = [{
      heading: 'Як працює модуль',
      blocks: [{ kind: 'bullets', items: [
        { lead: 'Перше:', text: ' опис.' },
        { lead: 'Друге:', text: ' опис.' },
      ] }],
    }];
    expect(issuesFor(doc).join('\n')).toMatch(/at least 3 element/i);
  });
});

// ── V12 — FR-18's negative ───────────────────────────────────────────────────────────────────────

describe('V12 — FR-18: no generation is rejected for a word-count miss', () => {
  it('accepts a §1 hook longer than v4’s 40–85 word range', () => {
    const doc = v4LongHookDoc();
    expect(wordCount((doc as { hook: string }).hook)).toBeGreaterThan(85);
    expect(issuesFor(doc)).toEqual([]);
  });

  it('accepts the same over-long hook on the `3.0` path too — no range is introduced anywhere', () => {
    const doc = v3BaseDoc();
    doc.hook = `<b>Ortur H20 20 W</b> — ${'слово '.repeat(90)}кінець.`;
    expect(wordCount(doc.hook)).toBeGreaterThan(85);
    expect(issuesFor(doc)).toEqual([]);
  });

  /**
   * The failure mode FR-18 is written against is a well-intentioned length check added beside the
   * real ones. Asserting on the MESSAGES rather than on success alone is what catches a rule that
   * rejects for the right count in the wrong place.
   */
  it('reports no word-, length- or character-count rule anywhere in the schema’s vocabulary', () => {
    const doc = v4LongHookDoc();
    expect(issuesFor(doc).join('\n')).not.toMatch(/word|слов|length|too long|40|85/i);
  });
});
