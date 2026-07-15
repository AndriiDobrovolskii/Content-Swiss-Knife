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
import { UK_SOURCE_ANTICALQUE, EXPERT3D_TOV_TRANSLATION_OVERLAY } from '../prompt-core/constants';

const SAMPLE_HTML = '<p>Sample product description.</p>';

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
    const payload = buildPromptC(SAMPLE_HTML, 'PT', 'SomeOtherStore');
    const taskBlock = payload.systemBlocks[1].text;
    expect(taskBlock).not.toContain('EUROPEAN PORTUGUESE LOCALIZATION FOR EXPERT3D');
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
    const payload = buildPromptC('Estamos presentes en los siguientes mercados', 'Portuguese (EXPERT3D)', 'SomeOtherStore');
    expect(payload.userContent).toContain('[Store Name]: SomeOtherStore');
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
