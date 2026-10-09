/**
 * task-c.spec.ts
 *
 * Regression guard for the pt-PT branch in buildPromptC (src/prompts/task-c.ts):
 * confirms the EXPERT3D_PT_INSTRUCTION is selected (not the generic fallback) and
 * that the EXPERT3D_TOV_TRANSLATION_OVERLAY is not double-appended for pt-PT.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { buildPromptC } from './task-c';
import { UK_SOURCE_ANTICALQUE, EXPERT3D_TOV_TRANSLATION_OVERLAY, C3D_TOV_TRANSLATION_OVERLAY, NUMERIC_SOURCE_FIDELITY_RULES } from '../prompt-core/constants';

const SAMPLE_HTML = '<p>Sample product description.</p>';

describe('buildPromptC — global rules that must survive translation', () => {
  it('carries the numeric-fidelity rule for alt/figcaption', () => {
    expect(buildPromptC(SAMPLE_HTML, 'PL', 'Center 3D Print').systemBlocks[0].text)
      .toContain(NUMERIC_SOURCE_FIDELITY_RULES);
  });

  it('bans re-nominalizing §4 into "Zastosowanie:" / "Anwendung:"', () => {
    const taskBlock = buildPromptC(SAMPLE_HTML, 'PL', 'Center 3D Print').systemBlocks[1].text;
    expect(taskBlock).toContain('Zastosowanie:');
    expect(taskBlock).not.toMatch(/run-in semicolon <p> paragraph, KEEP/);
  });
});

describe('buildPromptC — pt-PT (EXPERT3D)', () => {
  it('selects EXPERT3D_PT_INSTRUCTION via the "PT" task-label branch', () => {
    const payload = buildPromptC(SAMPLE_HTML, 'PT', 'EXPERT3D');
    const taskBlock = payload.systemBlocks[1].text;
    expect(taskBlock).toContain('EUROPEAN PORTUGUESE LOCALIZATION FOR EXPERT3D');
  });

  it('selects EXPERT3D_PT_INSTRUCTION via the literal "Portuguese (EXPERT3D)" label', () => {
    const payload = buildPromptC(SAMPLE_HTML, 'Portuguese (EXPERT3D)', 'EXPERT3D');
    const taskBlock = payload.systemBlocks[1].text;
    expect(taskBlock).toContain('EUROPEAN PORTUGUESE LOCALIZATION FOR EXPERT3D');
  });

  it('does not double-append EXPERT3D_TOV_TRANSLATION_OVERLAY for pt-PT (own ToV embedded already)', () => {
    const payload = buildPromptC(SAMPLE_HTML, 'PT', 'EXPERT3D');
    const taskBlock = payload.systemBlocks[1].text;
    expect(taskBlock).not.toContain('EXPERT3D ToV — TRANSLATION OVERLAY');
  });

  it('embeds the pt-PT locale ToV (register/vocabulary rules)', () => {
    const payload = buildPromptC(SAMPLE_HTML, 'PT', 'EXPERT3D');
    const taskBlock = payload.systemBlocks[1].text;
    expect(taskBlock).toContain('EXPERT3D ToV — EUROPEAN PORTUGUESE (pt-PT)');
  });

  it('falls back to generic instruction for "PT" on a non-EXPERT3D store', () => {
    // A REGISTERED store, not an arbitrary name: buildPromptC now throws for a store with no
    // deliveryRegion, so a fictitious name would fail here for an unrelated reason.
    const payload = buildPromptC(SAMPLE_HTML, 'PT', 'Center 3D Print');
    const taskBlock = payload.systemBlocks[1].text;
    expect(taskBlock).not.toContain('EUROPEAN PORTUGUESE LOCALIZATION FOR EXPERT3D');
  });
});

/**
 * Center 3D Print "Style B" ToV — translation-path scoping. The overlay's job is stopping the
 * translator from re-nominalizing verb-led openers back into noun+colon labels, so it must reach
 * every C3D target language — and no other store's.
 */
describe('buildPromptC — Center 3D Print ToV', () => {
  const langsFor = (store: string) => ({ store, langs: ['PL', 'DE', 'RU', 'European English'] });

  it('appends the C3D overlay for every Center 3D Print target language', () => {
    for (const lang of langsFor('Center 3D Print').langs) {
      const payload = buildPromptC(SAMPLE_HTML, lang, 'Center 3D Print');
      expect(payload.systemBlocks[1].text, lang).toContain(C3D_TOV_TRANSLATION_OVERLAY);
    }
  });

  it('does not append the C3D overlay for Drukarka 3D — same EU group, different voice', () => {
    const payload = buildPromptC(SAMPLE_HTML, 'PL', 'Drukarka 3D');
    expect(payload.systemBlocks[1].text).not.toContain(C3D_TOV_TRANSLATION_OVERLAY);
  });

  it('does not append the C3D overlay for any other store', () => {
    for (const store of ['3DDevice', '3DPrinter', '3DScanner', 'EXPERT3D', 'Expert-3DPrinter']) {
      const payload = buildPromptC(SAMPLE_HTML, 'PL', store);
      expect(payload.systemBlocks[1].text, store).not.toContain(C3D_TOV_TRANSLATION_OVERLAY);
    }
  });

  it('C3D never receives the EXPERT3D overlay (the two ToVs are mutually exclusive)', () => {
    const payload = buildPromptC(SAMPLE_HTML, 'PL', 'Center 3D Print');
    expect(payload.systemBlocks[1].text).not.toContain(EXPERT3D_TOV_TRANSLATION_OVERLAY);
  });

  it('a simplified template keeps the omitted-paragraph clause and layers the ToV after it (US-2.2 FR-19)', () => {
    const payload = buildPromptC(SAMPLE_HTML, 'PL', 'Center 3D Print', undefined, 'spare-parts');
    const taskBlock = payload.systemBlocks[1].text;
    expect(taskBlock).toContain('TRANSLATE WHAT IS PRESENT');
    expect(taskBlock).toContain(C3D_TOV_TRANSLATION_OVERLAY);
    expect(taskBlock.indexOf('TRANSLATE WHAT IS PRESENT')).toBeLessThan(taskBlock.indexOf(C3D_TOV_TRANSLATION_OVERLAY));
  });
});

describe('buildPromptC — image preservation manifest is conditional on figure markup', () => {
  it('omits the [IMAGE MANIFEST] block when the input has no figure/img/iframe markup', () => {
    const payload = buildPromptC('Estamos presentes en los siguientes mercados', 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).not.toContain('[IMAGE MANIFEST]');
    expect(payload.userContent).not.toContain('already contains the FINAL, approved');
  });

  it('includes the [IMAGE MANIFEST] block when the input contains a <figure> block', () => {
    const html = '<p>Lead-in.</p><figure><img src="a.jpg" alt="A"><figcaption>Caption</figcaption></figure>';
    const payload = buildPromptC(html, 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).toContain('[IMAGE MANIFEST]');
  });

  it('names the <iframe> title as translatable, not as a byte-identical attribute', () => {
    // The manifest used to grant exactly TWO exceptions (figcaption text, img alt) and lock every
    // other attribute byte-identical, which directly contradicted the per-language blocks below
    // ("Translate alt=… and title=…") and left the English YouTube title in every translation.
    const html = '<p>Lead-in.</p><figure><iframe src="https://youtube.com/embed/x" title="Hands-on demo"></iframe><figcaption>Caption</figcaption></figure>';
    const { userContent } = buildPromptC(html, 'Portuguese (EXPERT3D)', '');
    expect(userContent).toContain('THREE exceptions');
    expect(userContent).not.toContain('TWO exceptions');
    expect(userContent).toMatch(/translate the <iframe> title="" attribute\s+value into the target language/i);
  });

  it('omits the [IMAGE MANIFEST] block when the input contains a bare <img> tag with no <figure> wrapper', () => {
    const html = '<p>Lead-in.</p><img src="a.jpg" alt="A">';
    const payload = buildPromptC(html, 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).not.toContain('[IMAGE MANIFEST]');
    expect(payload.userContent).toContain('[STANDALONE SNIPPET]');
  });

  it('omits the [IMAGE MANIFEST] block when the input contains a bare <iframe> tag with no <figure> wrapper', () => {
    const html = '<p>Lead-in.</p><iframe src="https://youtube.com/embed/x"></iframe>';
    const payload = buildPromptC(html, 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).not.toContain('[IMAGE MANIFEST]');
    expect(payload.userContent).toContain('[STANDALONE SNIPPET]');
  });

  it('omits the [IMAGE MANIFEST] block for a non-product widget with a bare <img> icon (contact/country-selector snippet)', () => {
    const html = `<div class="country-item">
    <div class="country-item__picture">
        <img src="https://impresora-3d.es/image/catalog/usa.png" alt="USA">
        <div class="country-item__heading">
            <p class="country-item__picture-name">USA</p>
        </div>
    </div>
</div>`;
    const payload = buildPromptC(html, 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).not.toContain('[IMAGE MANIFEST]');
    expect(payload.userContent).toContain('[STANDALONE SNIPPET]');
  });
});

describe('buildPromptC — always supplies [Store Name] and a standalone-snippet note for figure-less input', () => {
  it('derives [Store Name] from the "(EXPERT3D)" suffix in the target-language label when storeName is empty', () => {
    const payload = buildPromptC('Estamos presentes en los siguientes mercados', 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).toContain('[Store Name]: EXPERT3D');
  });

  it('adds a [STANDALONE SNIPPET] instruction telling the model not to ask for more context, for figure-less input', () => {
    const payload = buildPromptC('Estamos presentes en los siguientes mercados', 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).toContain('[STANDALONE SNIPPET]');
    expect(payload.userContent).not.toContain('[IMAGE MANIFEST]');
  });

  it('falls back to an explicit N/A [Store Name] when neither storeName nor a "(...)" language suffix is available', () => {
    const payload = buildPromptC('Estamos presentes en los siguientes mercados', 'PT', '');
    expect(payload.userContent).toContain('[Store Name]: N/A');
  });

  it('still includes [Store Name] and [IMAGE MANIFEST] together for figure-bearing input', () => {
    const html = '<p>Lead-in.</p><figure><img src="a.jpg" alt="A"><figcaption>Caption</figcaption></figure>';
    const payload = buildPromptC(html, 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).toContain('[Store Name]: EXPERT3D');
    expect(payload.userContent).toContain('[IMAGE MANIFEST]');
  });

  it('prefers an explicit storeName argument over deriving one from the target-language label', () => {
    const payload = buildPromptC('Estamos presentes en los siguientes mercados', 'Portuguese (EXPERT3D)', 'Drukarka 3D');
    expect(payload.userContent).toContain('[Store Name]: Drukarka 3D');
  });
});

describe('buildPromptC — forbids inventing wrapping tags/links for figure-less input', () => {
  it('instructs the model not to wrap plain-text output in tags/links absent from the input (CTA-like snippet)', () => {
    const payload = buildPromptC('Перейти до каталогу', 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).toContain('Do NOT wrap the output');
  });

  it('still supplies [Store Name] and [STANDALONE SNIPPET], and omits [IMAGE MANIFEST], for the CTA-like snippet', () => {
    const payload = buildPromptC('Перейти до каталогу', 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).toContain('[Store Name]: EXPERT3D');
    expect(payload.userContent).toContain('[STANDALONE SNIPPET]');
    expect(payload.userContent).not.toContain('[IMAGE MANIFEST]');
  });

  it('does not add the no-wrapping instruction to figure-bearing input (still resolves to IMAGE_PRESERVATION_MANIFEST)', () => {
    const html = '<p>Lead-in.</p><figure><img src="a.jpg" alt="A"><figcaption>Caption</figcaption></figure>';
    const payload = buildPromptC(html, 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).not.toContain('Do NOT wrap the output');
    expect(payload.userContent).toContain('[IMAGE MANIFEST]');
  });
});

describe('buildPromptC — opts (uk-UA master pipeline: H1 lock + anti-calque)', () => {
  it('injects the localizedName as an [H1 LOCK] block into userContent, not systemBlocks', () => {
    const payload = buildPromptC(SAMPLE_HTML, 'PL', 'Drukarka 3D', 'EU', undefined, { localizedName: 'Filament PLA Premium' });
    expect(payload.userContent).toContain('[H1 LOCK — NON-NEGOTIABLE]');
    expect(payload.userContent).toContain('Filament PLA Premium');
    expect(payload.systemBlocks[0].text).not.toContain('Filament PLA Premium');
    expect(payload.systemBlocks[1].text).not.toContain('Filament PLA Premium');
  });

  it('systemBlocks[0] (master prompt) is byte-identical with and without opts', () => {
    const withOpts = buildPromptC(SAMPLE_HTML, 'PL', 'Drukarka 3D', 'EU', undefined, { localizedName: 'X', sourceLocale: 'uk-UA' });
    const withoutOpts = buildPromptC(SAMPLE_HTML, 'PL', 'Drukarka 3D');
    expect(withOpts.systemBlocks[0].text).toBe(withoutOpts.systemBlocks[0].text);
  });

  it('sourceLocale "uk-UA" + targetLang "PL" appends UK_SOURCE_ANTICALQUE[PL] to the task instruction', () => {
    const payload = buildPromptC(SAMPLE_HTML, 'PL', 'Drukarka 3D', 'EU', undefined, { sourceLocale: 'uk-UA' });
    expect(payload.systemBlocks[1].text).toContain(UK_SOURCE_ANTICALQUE['PL']);
  });

  it('no opts (standalone Translator path) adds no H1 lock and no anti-calque block', () => {
    const payload = buildPromptC(SAMPLE_HTML, 'PL', 'Drukarka 3D');
    expect(payload.userContent).not.toContain('[H1 LOCK');
    expect(payload.systemBlocks[1].text).not.toContain(UK_SOURCE_ANTICALQUE['PL']);
  });

  it('targetLang "European English" on an EXPERT3D store selects EU_EN_INSTRUCTION and still appends the EXPERT3D ToV overlay', () => {
    const payload = buildPromptC(SAMPLE_HTML, 'European English', 'EXPERT3D');
    const taskBlock = payload.systemBlocks[1].text;
    expect(taskBlock).toContain('EUROPEAN ENGLISH COPY EDITING');
    expect(taskBlock).toContain(EXPERT3D_TOV_TRANSLATION_OVERLAY);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// US-7.1 T15 (F-1, APPROVED at HUMAN_PLAN_APPROVAL; FR-2, FR-6, AC-3). task-c.ts is FROZEN
// (AGENTS.md §9); the edit is approved per file with .arch-guard-checksums re-baselined in the same
// commit. The inline per-locale sentences told the model to "TRANSLATE the generic descriptor and
// reorder it category-first" — in the CACHED system block, contradicting the protected-name rule for
// every non-uk-UA locale. They are replaced by a reference to [PRODUCT NAME LOCALIZATION].
//
// Targeted at the INLINE phrases only, on whitespace-collapsed text (lines wrap mid-phrase in the
// source): PRODUCT_NAME_LOCALIZATION itself legitimately contains "category-first" for GENERIC names
// and is interpolated into every branch, so a blanket "no category-first" assertion could never pass.
// ═══════════════════════════════════════════════════════════════════════════
describe('buildPromptC — inline descriptor-translation sentences are replaced (US-7.1 T15, F-1)', () => {
  // [label, store, websiteGroup, hadTheInlineSentence]. Every instruction branch of buildPromptC.
  const BRANCHES: [string, string, string, boolean][] = [
    ['European English', 'EXPERT3D', 'ES', false],
    ['Ukrainian', 'Expert-3DPrinter', 'US', true],
    ['American English', 'Expert-3DPrinter', 'US', true],
    ['American Spanish', 'Expert-3DPrinter', 'US', true],
    ['ES', 'EXPERT3D', 'ES', true],
    ['PT', 'EXPERT3D', 'ES', true],
    ['Portuguese (EXPERT3D)', 'EXPERT3D', 'ES', true],
    ['PL', 'Center 3D Print', 'EU', true],
    ['DE', 'Center 3D Print', 'EU', true],
    ['Russian', 'Center 3D Print', 'EU', true],
    ['EN', 'Center 3D Print', 'EU', true],
    ['Ukrainian', '3DDevice', 'UA', true],
  ];
  const systemText = (lang: string, store: string, group: string) =>
    buildPromptC(SAMPLE_HTML, lang, store, group).systemBlocks.map(b => b.text).join('\n').replace(/\s+/g, ' ');

  const OLD_SENTENCES: [string, RegExp][] = [
    ['TRANSLATE the generic descriptor', /TRANSLATE\s+the\s+generic\s+descriptor/i],
    ['reorder it category-first', /reorder\s+it\s+category-first/i],
    ['translates descriptor category-first (es-MX variant)', /translates?\s+(the\s+)?descriptor[^.]{0,40}category-first/i],
  ];

  it.each(BRANCHES)('%s (%s): none of the contradictory inline sentences remain', (lang, store, group) => {
    const text = systemText(lang, store, group);
    for (const [label, re] of OLD_SENTENCES) {
      expect(text, `still contains "${label}"`).not.toMatch(re);
    }
  });

  it.each(BRANCHES.filter(b => b[3]))(
    '%s (%s): the sentence now defers to [PRODUCT NAME LOCALIZATION] and says a protected name is kept verbatim',
    (lang, store, group) => {
      expect(systemText(lang, store, group))
        .toMatch(/apply \[PRODUCT NAME LOCALIZATION\][^.]{0,60}protected name is kept verbatim/i);
    },
  );

  it('the six PRODUCT_NAME_LOCALIZATION interpolations stay: the generic-name rule is still delivered (regression guard)', () => {
    const text = buildPromptC(SAMPLE_HTML, 'PL', 'Center 3D Print', 'EU').systemBlocks.map(b => b.text).join('\n');
    expect(text).toContain('[PRODUCT NAME LOCALIZATION');
    expect(text).toContain('GENERIC DESCRIPTIVE CATEGORY');
  });
});
