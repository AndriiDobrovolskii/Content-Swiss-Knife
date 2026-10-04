/**
 * task-a.spec.ts
 *
 * Store-scoping guard for the Tone-of-Voice system blocks in buildPromptA (src/prompts/task-a.ts).
 *
 * Both ToV overlays (EXPERT3D, Center 3D Print) are APPENDED after the master + task instruction,
 * never merged into them. That is what keeps the shared cached prefix byte-stable for every other
 * store — so these tests assert both halves: the right store gets its extra block, and everyone
 * else's block sequence is unchanged.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { buildPromptA } from './task-a';
import { buildPromptADoc } from './task-a-doc';
import { MASTER_SYSTEM_PROMPT } from '../prompt-core/master-system-prompt';
import { EXPERT3D_TOV_BASE_OVERLAY, C3D_TOV_BASE_OVERLAY, STORE_REGISTRY, NUMERIC_SOURCE_FIDELITY_RULES } from '../prompt-core/constants';
import type { ImageManifestEntry, ProductInput, WebsiteGroup } from '../app/types';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GOLDEN_CASES } from '../../test/fixtures/full-description-inputs';
import type { PromptPayload } from '../prompt-core/payload';

function inputFor(storeName: string): ProductInput {
  return {
    website: { name: storeName, group: STORE_REGISTRY[storeName].group as WebsiteGroup, url: '' },
    name: 'Formlabs Fuse X1',
    description: 'An SLS 3D printer.',
    specs: 'Build volume | 330 × 330 × 565 mm',
  };
}

const NEUTRAL_STORES = ['3DDevice', '3DPrinter', '3DScanner', 'Drukarka 3D', 'Expert-3DPrinter'];

describe('buildPromptA — ToV system-block scoping', () => {
  it('Center 3D Print gets a third cached block carrying the Style B overlay', () => {
    const { systemBlocks } = buildPromptA(inputFor('Center 3D Print'));
    expect(systemBlocks).toHaveLength(3);
    expect(systemBlocks[2].text).toBe(C3D_TOV_BASE_OVERLAY);
    expect(systemBlocks[2].cache).toBe(true);
  });

  it('EXPERT3D still gets its own overlay, unchanged, and none of the C3D text', () => {
    const { systemBlocks } = buildPromptA(inputFor('EXPERT3D'));
    expect(systemBlocks).toHaveLength(3);
    expect(systemBlocks[2].text).toBe(EXPERT3D_TOV_BASE_OVERLAY);
    expect(systemBlocks.map(b => b.text).join()).not.toContain(C3D_TOV_BASE_OVERLAY);
  });

  /** Unlike the ToV overlays, the numeric-fidelity rule is store-agnostic — the defect was too. */
  it('every store receives the numeric-fidelity rule for alt/figcaption', () => {
    for (const store of Object.keys(STORE_REGISTRY)) {
      const joined = buildPromptA(inputFor(store)).systemBlocks.map(b => b.text).join('\n');
      expect(joined, store).toContain(NUMERIC_SOURCE_FIDELITY_RULES);
    }
  });

  /**
   * US-3.1 T8 (FR-12, §9 Story D3 authorization). Line ~153's restatement of [HEADING FORM]
   * currently reads "which forbids the full name outright" as an unqualified absolute — the exact
   * shape SPEC-ROOT FR-12 exists to reword, since it contradicts, by omission, [HEADING FORM]'s own
   * two-blessed-position exception. Negative-pins the OLD unqualified sentence and positive-pins a
   * qualifier naming the two allowed positions, at the outcome level rather than one exact string
   * (Implementation Plan D10 states the requirement, not the wording).
   */
  it('no longer restates [HEADING FORM] as an unqualified "forbids the full name outright" absolute', () => {
    const { userContent } = buildPromptA(inputFor('EXPERT3D'));
    // The OLD sentence ended right at "outright." with nothing after it — a reworded version must
    // not end the whole prompt there.
    expect(userContent.trim().endsWith('which forbids the full name outright.')).toBe(false);
    expect(userContent).toMatch(/\[HEADING FORM\]/);
    // A qualifier naming the exception must survive, referencing the two blessed positions.
    expect(userContent).toMatch(/except[\s\S]{0,120}(two|blessed|first §3|§9)/i);
  });

  it('only Center 3D Print sees the §4 verb-led-<ul> override', () => {
    for (const store of Object.keys(STORE_REGISTRY)) {
      const joined = buildPromptA(inputFor(store)).systemBlocks.map(b => b.text).join('\n');
      expect(joined.includes('[ ] Applications is a verb-led <ul>'), store)
        .toBe(store === 'Center 3D Print');
    }
  });

  it('Drukarka 3D shares group EU with C3D but gets NO ToV block — the leak this guards against', () => {
    const { systemBlocks } = buildPromptA(inputFor('Drukarka 3D'));
    expect(systemBlocks).toHaveLength(2);
    expect(systemBlocks.map(b => b.text).join()).not.toContain(C3D_TOV_BASE_OVERLAY);
  });

  it('every other store keeps exactly two system blocks, with no ToV text at all', () => {
    for (const store of NEUTRAL_STORES) {
      const { systemBlocks } = buildPromptA(inputFor(store));
      const joined = systemBlocks.map(b => b.text).join();
      expect(systemBlocks, store).toHaveLength(2);
      expect(joined, store).not.toContain(C3D_TOV_BASE_OVERLAY);
      expect(joined, store).not.toContain(EXPERT3D_TOV_BASE_OVERLAY);
    }
  });

  /**
   * The §7 FLAT SOURCE rule lives in MASTER_SYSTEM_PROMPT, so it reaches all 8 stores. A store ToV
   * overlay is appended AFTER it and can therefore override it — which is exactly how the Center
   * 3D Print collapse happened (its heading rule out-specified the schema). This is the standing
   * cheap guard that no store's voice contradicts §7 again.
   */
  it('every store receives the §7 flat-source grouping rule', () => {
    for (const store of Object.keys(STORE_REGISTRY)) {
      const joined = buildPromptA(inputFor(store)).systemBlocks.map(b => b.text).join('\n');
      expect(joined.replace(/\s+/g, ' '), store)
        .toMatch(/do NOT emit a single catch-all category/i);
    }
  });

  it('no store ToV overlay tells the model to avoid nominal sub-headings', () => {
    for (const store of Object.keys(STORE_REGISTRY)) {
      // The overlay blocks only — the master's own §7 text legitimately discusses categories.
      const overlays = buildPromptA(inputFor(store)).systemBlocks.slice(2).map(b => b.text).join('\n');
      if (!overlays) continue;
      // A blanket "headings are never nominal" line is the exact regression: it must always be
      // scoped to section headings and paired with the <h3> exemption.
      if (/never bare noun/i.test(overlays)) {
        expect(overlays, `${store}: blanket nominal-heading ban without an <h3> carve-out`)
          .toMatch(/<h3>[\s\S]*MUST be CONCISE NOMINAL PHRASES/i);
      }
    }
  });

  it('the two cached prefix blocks are byte-identical across every store (cache stability)', () => {
    const stores = Object.keys(STORE_REGISTRY);
    const prefixes = stores.map(s => buildPromptA(inputFor(s)).systemBlocks.slice(0, 2));
    for (const [i, prefix] of prefixes.entries()) {
      expect(prefix[0].text, stores[i]).toBe(MASTER_SYSTEM_PROMPT);
      expect(prefix[1].text, stores[i]).toBe(prefixes[0][1].text);
    }
  });
});

describe('buildPromptA — lists instead of run-on sentences', () => {
  // Generation-side fix for the one warning class the repair tier could not close. Two runs
  // showed the model will not split a three-item enumeration on instruction, and a block patch
  // cannot turn a <p> into a <ul>: rejectPatch requires one element with the same root tag, and
  // validateStructuralParity counts <li> between the master and its translations. At generation
  // time neither constraint applies and a list is the natural shape for an enumeration.
  const taskBlock = (input: ProductInput) => buildPromptA(input).systemBlocks[1].text;

  it('tells the standard schema to list three or more parallel items', () => {
    const text = taskBlock(inputFor('3DPrinter'));
    expect(text).toMatch(/three or more parallel items/i);
    expect(text).toMatch(/<ul>/);
  });

  it('confines the rule to body prose, away from the hook, the tables and the closing', () => {
    // Left unbounded this turns a description into bullet soup, and §2/§7 are tables already.
    const text = taskBlock(inputFor('3DPrinter'));
    expect(text).toMatch(/§3 and §5/);
    expect(text).toMatch(/never to the §1 hook/i);
  });

  it('keeps a figure from losing its lead-in paragraph', () => {
    // Acceptance criteria require a <p> lead-in directly above every <figure>; without this the
    // list could take that position.
    expect(taskBlock(inputFor('3DPrinter'))).toMatch(/<figure>\s*directly after/i);
  });

  it('a simplified template leaves the shared task block untouched — its overlay rides in userContent (US-2.2 NFR-1)', () => {
    const simplified = { ...inputFor('3DPrinter'), templateId: 'spare-parts' };
    expect(taskBlock(simplified)).toBe(taskBlock(inputFor('3DPrinter')));
  });
});

describe('buildPromptA — [VIDEO MANIFEST]', () => {
  const SRC = 'https://www.youtube.com/embed/Bw2xL_gL7zc';
  const withVideo = (storeName = '3DPrinter'): ProductInput => ({
    ...inputFor(storeName),
    description: `An SLS 3D printer.\n\n<iframe src="${SRC}" title="Hands-on"></iframe>`,
  });

  it('states the count and the verbatim src when the source has an embed', () => {
    // Video used to have no manifest at all while images had a COUNT=N HARD RULE, and the model
    // dropped the embed whenever images were present to crowd it out.
    const { userContent } = buildPromptA(withVideo());
    expect(userContent).toContain('[VIDEO MANIFEST] — COUNT=1');
    expect(userContent).toContain(SRC);
    expect(userContent).toContain('title: "Hands-on"');
    expect(userContent).toMatch(/VERBATIM/);
  });

  it('labels the supplied title as source-language input and orders it rewritten in the body language', () => {
    // The manifest used to hand the model the source title unlabelled and with no instruction, so
    // the English YouTube title was copied straight through into the uk-UA master and every
    // translation of it (EXPERT3D XGRIDS L2 Pro).
    const { userContent } = buildPromptA(withVideo());
    expect(userContent).toContain('source title: "Hands-on"');
    expect(userContent).toMatch(/do NOT copy it through/i);
    expect(userContent).toMatch(/title="" in the BODY LANGUAGE/i);
  });

  it('downgrades double quotes inside a source title so they cannot desync the quoted-value format', () => {
    const quoted: ProductInput = {
      ...inputFor('3DPrinter'),
      description: `<iframe src="${SRC}" title='Hands-on with "Lixel L2 Pro"'></iframe>`,
    };
    const { userContent } = buildPromptA(quoted);
    expect(userContent).toContain(`source title: "Hands-on with 'Lixel L2 Pro'"`);
    // Scoped to the manifest line only: [Raw Description] further down legitimately still carries
    // the original iframe, double quotes and all — it is the untouched input.
    const manifestLine = userContent.split('\n').find(l => l.includes('source title:'))!;
    expect(manifestLine).not.toContain('"Lixel L2 Pro"');
    expect(manifestLine.match(/"/g)).toHaveLength(2); // exactly the pair delimiting the value
  });

  it('anchors the embed to a section that actually exists in the schema', () => {
    // The master rule used to say "place in Deep Dive" — a section named nowhere in Schema v3.0.
    expect(buildPromptA(withVideo()).userContent).toContain('§3 FUNCTIONALITY');
  });

  it('counts two distinct embeds and deduplicates a repeated one', () => {
    const other = 'https://player.vimeo.com/video/12345';
    const two = { ...inputFor('3DPrinter'), description: `<iframe src="${SRC}"></iframe><iframe src="${other}"></iframe>` };
    expect(buildPromptA(two).userContent).toContain('[VIDEO MANIFEST] — COUNT=2');

    const dupe = { ...inputFor('3DPrinter'), description: `<iframe src="${SRC}"></iframe><iframe src="${SRC}?rel=0"></iframe>` };
    expect(buildPromptA(dupe).userContent).toContain('[VIDEO MANIFEST] — COUNT=1');
  });

  it('leaves userContent byte-identical when the source has no video', () => {
    // The no-video case is the overwhelming majority; adding anything here would churn the
    // prompt cache for every product that has no embed.
    const plain = inputFor('3DPrinter');
    expect(buildPromptA(plain).userContent).not.toContain('[VIDEO MANIFEST]');
  });

  it('keeps the video block for a simplified template: an embed in the source survives (US-2.2 FR-23)', () => {
    const simplified = { ...withVideo(), templateId: 'spare-parts' };
    expect(buildPromptA(simplified).userContent).toContain('[VIDEO MANIFEST]');
  });

  it('ignores a non-video iframe such as an embedded map', () => {
    const map = { ...inputFor('3DPrinter'), description: '<iframe src="https://maps.google.com/maps?q=x"></iframe>' };
    expect(buildPromptA(map).userContent).not.toContain('[VIDEO MANIFEST]');
  });
});

/**
 * US-5.1 T11 — AC-9a/9b/9c and the "same section" wording (Spec v5 FR-19, plan v5 section 0 Q-D
 * correction). Written before the [IMAGE MARKERS] block exists, so they fail until T15.
 *
 * Only `COUNT=N` and the verbatim `[file.ext]` list are asserted: the line format of the block is
 * the planner's (U-9) and is deliberately not pinned here.
 */
describe('buildPromptA — [IMAGE MARKERS] block (US-5.1 FR-19, AC-9a-c)', () => {
  const entry = (originalFilename: string, order: number, status: ImageManifestEntry['status'] = 'done'): ImageManifestEntry => ({
    id: `img-${order}`, originalFilename, urlFilename: `p-${originalFilename.replace(/\.webp$/, '.jpg')}`,
    previewUrl: '', visionDescription: 'A part', altText: 'A part', order, status,
  });
  const MANIFEST = [entry('front.jpg', 1), entry('side-view.webp', 2), entry('back.jpg', 3), entry('broken.jpg', 4, 'error')];

  const withMarkers = (store: string, description: string, manifest: ImageManifestEntry[] = MANIFEST): ProductInput =>
    ({ ...inputFor(store), description, imageManifest: manifest });

  /** The slice of userContent from the block header to the closing instruction line. */
  const markerBlock = (userContent: string): string => {
    const start = userContent.indexOf('[IMAGE MARKERS]');
    if (start < 0) return '';
    const end = userContent.indexOf('\n\nGenerate the description in', start);
    return userContent.slice(start, end < 0 ? undefined : end);
  };
  const countOf = (block: string): number | undefined => {
    const m = /COUNT=(\d+)/.exec(block);
    return m ? Number(m[1]) : undefined;
  };

  const TWO = 'Intro. [front.jpg] shows the front. Later, [side-view.webp] the side.';
  const THREE = '[front.jpg] first. [side-view.webp] second. Third [back.jpg].';

  it.each([
    ['one marker', 'Intro text. See [front.jpg] for the front.', ['front.jpg']],
    ['two markers', TWO, ['front.jpg', 'side-view.webp']],
    ['three markers', THREE, ['front.jpg', 'side-view.webp', 'back.jpg']],
  ])('AC-9a: %s gives COUNT=N and every matched file verbatim', (_label, description, files) => {
    const block = markerBlock(buildPromptA(withMarkers('3DPrinter', description)).userContent);
    expect(block, 'userContent has an [IMAGE MARKERS] block').not.toBe('');
    expect(countOf(block)).toBe(files.length);
    for (const f of files) expect(block).toContain(`[${f}]`);
  });

  it('AC-9a: a marker repeated in the description is counted once', () => {
    const block = markerBlock(buildPromptA(withMarkers('3DPrinter', '[front.jpg] here and again [front.jpg], then [back.jpg].')).userContent);
    expect(block, 'userContent has an [IMAGE MARKERS] block').not.toBe('');
    expect(countOf(block)).toBe(2);
    expect(block.split('[front.jpg]')).toHaveLength(2); // listed exactly once
  });

  it('AC-9a: an unmatched or mangled marker is not listed and not counted', () => {
    const description = 'Real [front.jpg]. Unknown [missing.jpg]. Errored [broken.jpg]. Mangled [ back.jpg ] and [Back.JPG].';
    const block = markerBlock(buildPromptA(withMarkers('3DPrinter', description)).userContent);
    expect(block, 'userContent has an [IMAGE MARKERS] block').not.toBe('');
    expect(countOf(block)).toBe(1);
    expect(block).toContain('[front.jpg]');
    for (const bad of ['[missing.jpg]', '[broken.jpg]', '[ back.jpg ]', '[Back.JPG]', '[back.jpg]']) {
      expect(block, bad).not.toContain(bad);
    }
  });

  it('AC-9a: Expert-3DPrinter, whose [IMAGE MANIFEST] block prints None, still gets the block from the real manifest', () => {
    const { userContent } = buildPromptA(withMarkers('Expert-3DPrinter', TWO));
    expect(userContent).toContain('[IMAGE MANIFEST]\nNone');
    const block = markerBlock(userContent);
    expect(block, 'userContent has an [IMAGE MARKERS] block').not.toBe('');
    expect(countOf(block)).toBe(2);
    expect(block).toContain('[front.jpg]');
    expect(block).toContain('[side-view.webp]');
  });

  it('AC-9a: the block depends only on description + imageManifest, identical for every registered store (any group, imageBaseUrl or none)', () => {
    const stores = Object.keys(STORE_REGISTRY);
    expect(new Set(stores.map(s => STORE_REGISTRY[s].group)).size, 'stores span several groups').toBeGreaterThan(1);
    expect(new Set(stores.map(s => STORE_REGISTRY[s].imageBaseUrl)).size, 'stores differ in imageBaseUrl').toBeGreaterThan(1);
    const blocks = stores.map(s => markerBlock(buildPromptA(withMarkers(s, TWO)).userContent));
    for (const [i, block] of blocks.entries()) {
      expect(block, `${stores[i]}: userContent has an [IMAGE MARKERS] block`).not.toBe('');
      expect(countOf(block), stores[i]).toBe(2);
      expect(block, stores[i]).toContain('[front.jpg]');
      expect(block, stores[i]).toContain('[side-view.webp]');
      expect(block, `${stores[i]}: block equals the first store's block`).toBe(blocks[0]);
    }
  });

  /** Pins why an unregistered store is not an AC-9a case: it cannot build a Task A prompt at all (Spec v5 A-3). */
  it('AC-9a: a store absent from STORE_REGISTRY cannot build a prompt (deliveryRegion error), so it is out of AC-9a scope', () => {
    const custom: ProductInput = {
      website: { name: 'Some Custom Shop', group: 'US' as WebsiteGroup, url: '' },
      name: 'Formlabs Fuse X1', description: TWO, specs: '', imageManifest: MANIFEST,
    };
    expect(() => buildPromptA(custom)).toThrow(/STORE_REGISTRY has no deliveryRegion/);
  });

  /** Wording: plan v5 section 0 (Q-D correction) is the authority: the relocation stays in the SAME section. */
  it('wording: the relocation instruction keeps the marker in the SAME section and never says it may cross one', () => {
    const block = markerBlock(buildPromptA(withMarkers('3DPrinter', TWO)).userContent);
    expect(block, 'userContent has an [IMAGE MARKERS] block').not.toBe('');
    expect(block).toMatch(/nearest\s+preceding\s+body\s+paragraph\s+in\s+the\s+same\s+section/i);
    expect(block).not.toMatch(/across\s+a\s+section\s+boundary|cross(?:es|ing)?\s+(?:a|the)\s+section/i);
  });

  describe('AC-9b: no matched marker leaves userContent byte-identical to the pre-Story output', () => {
    const GOLDEN: Record<string, PromptPayload> = JSON.parse(
      readFileSync(join(process.cwd(), 'test', 'fixtures', 'golden', 'full-description-prompts.json'), 'utf8'),
    );
    it.each(['html/expert3d', 'html/legacy', 'html/legacy+lang', 'html/c3d+customTemplate'])(
      'golden case %s: userContent is byte-equal and has no [IMAGE MARKERS]', (name) => {
        const { userContent } = GOLDEN_CASES[name]();
        expect(userContent === GOLDEN[name].userContent, 'userContent differs from the golden').toBe(true);
        expect(userContent).not.toContain('[IMAGE MARKERS]');
      });

    /** Rebuilds the pre-Story bytes without a baseline file: swap each token for a neutral one, build, swap back. */
    it.each([
      ['an unmatched marker', 'Text [missing.jpg] more text.'],
      ['only an errored-entry marker', 'Text [broken.jpg] more text.'],
      ['a mangled marker', 'Text [ front.jpg ] and [Front.JPG].'],
    ])('%s: userContent equals the neutral-token build with the tokens restored, and has no block', (_label, description) => {
      const TOKEN = 'ZZNEUTRALTOKENZZ';
      const pieces = description.split(/(\[[^\]]*\])/).filter(Boolean);
      const neutral = pieces.map(p => (p.startsWith('[') ? TOKEN : p)).join('');
      const baseline = buildPromptA(withMarkers('3DPrinter', neutral)).userContent;
      const restored = pieces.filter(p => p.startsWith('[')).reduce((acc, p) => acc.replace(TOKEN, p), baseline);
      const actual = buildPromptA(withMarkers('3DPrinter', description)).userContent;
      expect(actual === restored, 'userContent differs from the pre-Story shape').toBe(true);
      expect(actual).not.toContain('[IMAGE MARKERS]');
    });
  });

  describe('AC-9c: systemBlocks stay static', () => {
    it.each(['3DPrinter', 'EXPERT3D', 'Center 3D Print', 'Expert-3DPrinter'])(
      '%s: no marker filename or COUNT= in any system block', (store) => {
        const marked = buildPromptA(withMarkers(store, THREE));
        expect(markerBlock(marked.userContent), 'the marker case must actually carry a block').not.toBe('');
        for (const b of marked.systemBlocks) {
          for (const f of ['front.jpg', 'side-view.webp', 'back.jpg']) expect(b.text).not.toContain(f);
          expect(b.text).not.toContain('COUNT=');
        }
      });

    it.each(['3DPrinter', 'EXPERT3D', 'Center 3D Print', 'Expert-3DPrinter'])(
      '%s: systemBlocks deep-equal between a marker input and a no-marker input', (store) => {
        const marked = buildPromptA(withMarkers(store, THREE));
        const plain = buildPromptA(withMarkers(store, 'Plain description with no marker.'));
        expect(markerBlock(marked.userContent), 'the marker case must actually carry a block').not.toBe('');
        expect(marked.systemBlocks).toEqual(plain.systemBlocks);
      });
  });
});

/**
 * US-5.1 AC-9 (k), spec v9 (OD-25 = A, FR-21, NFR-5, NFR-12): the three Ukrainian Vision texts of a manifest
 * entry reach NO prompt. The marker step reads them from the manifest after generation; Task A never sees
 * them, so a text-only prompt cannot be asked to produce them and `systemBlocks` carry no per-image text.
 * Sentinel strings are planted in the three fields; none may appear in `userContent` or in any system block.
 *
 * Written before the manifest type carries the fields (T4): it fails to type-check until then, and at
 * runtime it is a guard that the FROZEN `buildImageBlock` never starts reading them (green on arrival).
 */
describe('buildPromptA / buildPromptADoc - the Ukrainian Vision fields reach no prompt (US-5.1 AC-9 k)', () => {
  const SENTINELS = ['SENTINEL-LABEL-UK-91', 'SENTINEL-DESC-UK-92', 'SENTINEL-ALT-UK-93'];
  const withUk = (originalFilename: string, order: number): ImageManifestEntry => ({
    id: `img-${order}`, originalFilename, urlFilename: `p-${originalFilename}`, previewUrl: '',
    visionDescription: 'A part', altText: 'A part', order, status: 'done',
    visionLabelUk: SENTINELS[0], visionDescriptionUk: SENTINELS[1], visionAltUk: SENTINELS[2],
  });
  const withoutUk = (e: ImageManifestEntry): ImageManifestEntry => {
    const { visionLabelUk: _l, visionDescriptionUk: _d, visionAltUk: _a, ...rest } = e;
    return rest;
  };
  const MANIFEST = [withUk('front.jpg', 1), withUk('back.jpg', 2)];
  const stores = ['3DPrinter', 'EXPERT3D', 'Center 3D Print', 'Expert-3DPrinter'];
  const marked = (store: string, manifest: ImageManifestEntry[]): ProductInput =>
    ({ ...inputFor(store), description: 'Intro [front.jpg] text [back.jpg] end.', imageManifest: manifest });
  const plain = (store: string, manifest: ImageManifestEntry[]): ProductInput =>
    ({ ...inputFor(store), description: 'Plain description without a marker.', imageManifest: manifest });

  it.each(stores)('%s: no sentinel in userContent or any system block, with and without markers', (store) => {
    for (const i of [marked(store, MANIFEST), plain(store, MANIFEST)]) {
      for (const payload of [buildPromptA(i), buildPromptADoc(i)]) {
        for (const s of SENTINELS) {
          expect(payload.userContent, s).not.toContain(s);
          for (const b of payload.systemBlocks) expect(b.text, s).not.toContain(s);
        }
      }
    }
  });

  it.each(stores)('%s: userContent and systemBlocks are byte-identical whether or not the entries carry the Ukrainian fields', (store) => {
    const bare = MANIFEST.map(withoutUk);
    for (const build of [buildPromptA, buildPromptADoc]) {
      for (const [a, b] of [[marked(store, MANIFEST), marked(store, bare)], [plain(store, MANIFEST), plain(store, bare)]]) {
        const withFields = build(a);
        const without = build(b);
        expect(withFields.userContent === without.userContent, 'userContent differs').toBe(true);
        expect(withFields.systemBlocks).toEqual(without.systemBlocks);
      }
    }
  });
});
