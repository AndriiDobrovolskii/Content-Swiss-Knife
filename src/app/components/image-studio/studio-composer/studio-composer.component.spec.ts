/**
 * US-10.1 T41 - StudioComposerComponent: presets, chips, selectors, Send and Cancel, input locks.
 * Covers FR-18, FR-19, FR-21, FR-28, FR-29, FR-31, FR-50, FR-77, FR-79; AC-8, AC-9, AC-15, AC-18, AC-27 (UI half).
 *
 * Component runner (`*.component.spec.ts`). The component is rendered with the REAL root store; the ports are the fakes of
 * `test/image-studio/helpers/fakes.ts` behind the contract's tokens, and `HttpTestingController` stands in for the BFF.
 * The harness (`helpers/studio-render.ts`) documents the pinned UI contract (accessible names are the text ids of the
 * Specification's Interface text table, so expected strings are the confirmed literals, never copied from a run).
 *
 * What is NOT here: the attachment surface (T42), the strip (T43), the session list (T44), live regions and focus (T45).
 * Preset/chip prompt LITERALS are asserted from SD-21; their registry is T4's spec.
 */
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/angular';
import { StudioComposerComponent } from './studio-composer.component';
import {
  renderStudio, byName, t, LABELS, MODEL_LABEL, FLASH, PRO, imagesBody, expectGenerate, flushGenerate, GENERATE_URL, type Harness,
} from '../../../../../test/image-studio/helpers/studio-render';
import { makeSession } from '../../../../../test/image-studio/helpers/fakes';

const TEMPLATE = {
  'white-bg': 'Product photo of {product} on a clean pure white (#FFFFFF) background, soft shadow below the product, product centred in the frame.',
  lifestyle: 'Lifestyle photo of {product} placed in a real environment such as a workshop, an office or a classroom.',
  banner: 'Wide banner image featuring {product}, with a free area reserved for text. Do not draw any text.',
};

let h: Harness;

describe('FR-19 / AC-9: ratio and resolution selectors', () => {
  it('AC-9 / FR-19: the defaults are 1:1 and 1K and the ratio list is exactly the six values of AC-9', async () => {
    h = await renderStudio(StudioComposerComponent);
    const ratio = byName.select('X-4', 'en');
    expect(ratio.value).toBe('1:1');
    expect(byName.select('X-5', 'en').value).toBe('1K');
    const options = within(ratio).getAllByRole('option').map((o) => o.textContent!.trim());
    expect(options).toEqual(['1:1', '4:3', '3:4', '4:5', '16:9', '9:16']);
  });

  it('AC-9 / FR-19: 4K is not selectable for Flash and is selectable for Pro', async () => {
    h = await renderStudio(StudioComposerComponent);
    const res = byName.select('X-5', 'en');
    expect(within(res).getAllByRole('option').map((o) => o.textContent!.trim())).toEqual(['1K', '2K']);
    await h.user.selectOptions(byName.select('X-6', 'en'), MODEL_LABEL.pro);
    await h.settle();
    expect(within(byName.select('X-5', 'en')).getAllByRole('option').map((o) => o.textContent!.trim())).toEqual(['1K', '2K', '4K']);
  });

  it('FR-19: switching from Pro with 4K selected back to Flash never leaves 4K selected', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.selectOptions(byName.select('X-6', 'en'), MODEL_LABEL.pro);
    await h.user.selectOptions(byName.select('X-5', 'en'), '4K');
    await h.user.selectOptions(byName.select('X-6', 'en'), MODEL_LABEL.flash);
    await h.settle();
    expect(byName.select('X-5', 'en').value).not.toBe('4K');
  });
});

describe('FR-28 / FR-29 / AC-15: presets fill the form and stay editable (T34)', () => {
  it('FR-30 / FR-77: exactly five preset buttons in the group named X-13, named by the current language (en)', async () => {
    h = await renderStudio(StudioComposerComponent);
    const group = screen.getByRole('group', { name: t('X-13', 'en') });
    expect(within(group).getAllByRole('button').map((b) => b.textContent!.trim())).toEqual([
      'Product on white', 'Lifestyle scene', 'Category banner', 'Social', 'Detail close-up',
    ]);
  });

  it('FR-30 / FR-77: the same five presets carry the uk names after a language toggle', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.setLang('uk');
    const group = screen.getByRole('group', { name: t('X-13', 'uk') });
    expect(within(group).getAllByRole('button').map((b) => b.textContent!.trim())).toEqual([
      'Товар на білому тлі', 'Лайфстайл-сцена', 'Банер категорії', 'Соцмережі', 'Деталь крупним планом',
    ]);
  });

  it('AC-15 / FR-28 / FR-79 / D-14: Product on white fills the prompt (product substituted), 1:1, 2K and Flash', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.type(byName.product('en'), 'Bambu X1C');
    await h.user.click(byName.button('Product on white'));
    await h.settle();
    expect(byName.textarea('en').value).toBe(TEMPLATE['white-bg'].replace('{product}', 'Bambu X1C'));
    expect(byName.select('X-4', 'en').value).toBe('1:1');
    expect(byName.select('X-5', 'en').value).toBe('2K');
    expect(byName.select('X-6', 'en').selectedOptions[0].textContent!.trim()).toBe(MODEL_LABEL.flash);
  });

  it('AC-15 / AC-17 / FR-28: Lifestyle scene fills 4:5 (was 4:3), 2K and Pro; Category banner fills 16:9, 2K and Pro', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.click(byName.button('Lifestyle scene'));
    await h.settle();
    expect(byName.select('X-4', 'en').value).toBe('4:5');
    expect(byName.select('X-5', 'en').value).toBe('2K');
    expect(byName.select('X-6', 'en').selectedOptions[0].textContent!.trim()).toBe(MODEL_LABEL.pro);
    await h.user.click(byName.button('Category banner'));
    await h.settle();
    expect(byName.select('X-4', 'en').value).toBe('16:9');
    expect(byName.select('X-5', 'en').value).toBe('2K');
    expect(byName.textarea('en').value).toBe(TEMPLATE.banner.replace('{product}', 'the product'));
  });

  it('D-15 / FR-79: with an empty product-name field {product} becomes "the product" and no placeholder remains', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.click(byName.button('Lifestyle scene'));
    await h.settle();
    expect(byName.textarea('en').value).toBe(TEMPLATE.lifestyle.replace('{product}', 'the product'));
    expect(byName.textarea('en').value).not.toContain('{product}');
  });

  it('D-14: a later change of the product-name field does not rewrite the prompt text', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.type(byName.product('en'), 'Alpha');
    await h.user.click(byName.button('Category banner'));
    const before = byName.textarea('en').value;
    await h.user.type(byName.product('en'), ' Beta');
    await h.settle();
    expect(byName.textarea('en').value).toBe(before);
    expect(before).toContain('Alpha');
  });

  it('FR-28 / AC-15: the prompt stays editable after a preset is picked', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.click(byName.button('Social'));
    await h.user.type(byName.textarea('en'), ' with a green background');
    await h.settle();
    expect(byName.textarea('en').value).toBe('Social media image of the product. with a green background');
  });

  it('FR-32 / FR-28: the picked preset id travels with the request (presetId) and an edited prompt is what is sent', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.click(byName.button('Detail close-up'));
    await h.user.type(byName.textarea('en'), ' edited');
    await h.user.click(byName.button(t('X-1', 'en')));
    const req = expectGenerate(h);
    expect(req.request.body.presetId).toBe('detail-closeup');
    expect(req.request.body.newTurn.parts[0].text).toBe('Detail close-up of the product. edited');
    expect(req.request.body.aspectRatio).toBe('1:1');
    expect(req.request.body.resolution).toBe('2K');
    expect(req.request.body.model).toBe(PRO);
    req.flush(imagesBody());
    await h.settle();
  });
});

describe('FR-31 / AC-18: quick-edit chips appear only after v1', () => {
  const chips = (lang: 'en' | 'uk') => ['T-15a', 'T-15b', 'T-15c', 'T-15d'].map((id) => t(id, lang));

  it('AC-18 / FR-31: no chip is shown before the session holds a version', async () => {
    h = await renderStudio(StudioComposerComponent);
    for (const name of chips('en')) expect(byName.queryButton(name), name).toBeNull();
  });

  it('AC-18 / FR-31: the four chips are shown (en labels) once a version exists', async () => {
    h = await renderStudio(StudioComposerComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    expect(chips('en')).toEqual(['Remove background', 'Brighter', 'Softer shadow', 'Different angle']);
    for (const name of chips('en')) expect(byName.button(name), name).toBeDefined();
  });

  it('AC-18 / FR-77: the chip labels are the Ukrainian values of AC-18 under uk', async () => {
    h = await renderStudio(StudioComposerComponent, { lang: 'uk', sessions: [makeSession('s1', { pairs: 1 })] });
    for (const name of ['Прибрати фон', 'Світліше', "Тінь м'якша", 'Інший ракурс']) {
      expect(byName.button(name), name).toBeDefined();
    }
  });

  it('AC-18 / FR-31: clicking "Softer shadow" sends the English SD-21 instruction with the whole retained history', async () => {
    h = await renderStudio(StudioComposerComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    await h.user.click(byName.button('Softer shadow'));
    const req = expectGenerate(h);
    expect(req.request.body.newTurn.parts.map((p: any) => p.text)).toEqual(['Make the shadow softer.']);
    expect(req.request.body.history.map((x: any) => x.id)).toEqual(['u1', 'm1']);
    req.flush(imagesBody());
    await h.settle();
  });

  it('AC-18 / CF-3: the instruction sent is English even when the interface language is uk', async () => {
    h = await renderStudio(StudioComposerComponent, { lang: 'uk', sessions: [makeSession('s1', { pairs: 1 })] });
    await h.user.click(byName.button('Світліше'));
    const req = expectGenerate(h);
    expect(req.request.body.newTurn.parts.map((p: any) => p.text)).toEqual(['Make the image brighter.']);
    req.flush(imagesBody());
    await h.settle();
  });

  it('FR-31 / FR-21: while a generation runs the chips are not actionable', async () => {
    h = await renderStudio(StudioComposerComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    await h.user.click(byName.button('Brighter'));
    const req = expectGenerate(h);
    for (const name of chips('en')) expect((byName.button(name) as HTMLButtonElement).disabled, name).toBe(true);
    req.flush(imagesBody());
    await h.settle();
  });
});

describe('FR-18 / D-34: Send enablement (T35)', () => {
  it('FR-18 / AC-8: Send is disabled for an empty prompt with no image', async () => {
    h = await renderStudio(StudioComposerComponent);
    // S11 site (was L197): a blank draft reads "Write a prompt to start" (X-29), not the Send/Generate label.
    expect((byName.button(t('X-29', 'en')) as HTMLButtonElement).disabled).toBe(true);
  });

  it('D-34 / FR-18: a whitespace-only prompt with no image keeps Send disabled and sends nothing', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.type(byName.textarea('en'), '   ');
    await h.settle();
    // S11 site (was L204)
    expect((byName.button(t('X-29', 'en')) as HTMLButtonElement).disabled).toBe(true);
    h.http.expectNone(() => true);
  });

  it('AC-8 / FR-18: a text-only prompt enables Send and the outbound user turn is one text part', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.type(byName.textarea('en'), 'a white mug on a table');
    const send = byName.button(t('X-1', 'en')) as HTMLButtonElement;
    expect(send.disabled).toBe(false);
    await h.user.click(send);
    const req = expectGenerate(h);
    expect(req.request.body.newTurn.parts).toEqual([{ text: 'a white mug on a table' }]);
    expect(req.request.body.history).toEqual([]);
    expect(req.request.body.model).toBe(FLASH);
    req.flush(imagesBody());
    await h.settle();
  });
});

describe('FR-21: the composer locks while a generation runs (T35)', () => {
  it('FR-21: while a request is in flight the prompt and Send are disabled, Cancel is enabled, and the model switch is inactive', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.type(byName.textarea('en'), 'a white mug');
    await h.user.click(byName.button(t('X-1', 'en')));
    await h.settle();
    expect(byName.textarea('en').disabled).toBe(true);
    // S11 site (was L230): execute() blanks the draft, so during a generation the disabled button reads "Write a prompt to start"
    // (the stated v4 change to the approved OD-13 block); Send is still disabled.
    expect((byName.button(t('X-29', 'en')) as HTMLButtonElement).disabled).toBe(true);
    expect((byName.button(LABELS.en.cancel) as HTMLButtonElement).disabled).toBe(false);
    expect(byName.select('X-6', 'en').disabled).toBe(true);
    const req = expectGenerate(h);
    req.flush(imagesBody());
    await h.settle();
  });

  it('FR-21: when the generation ends the prompt is enabled again and Cancel is gone', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.type(byName.textarea('en'), 'a white mug');
    await h.user.click(byName.button(t('X-1', 'en')));
    const req = expectGenerate(h);
    req.flush(imagesBody());
    await h.settle();
    expect(byName.textarea('en').disabled).toBe(false);
    expect(byName.queryButton(LABELS.en.cancel)).toBeNull();
  });
});

describe('FR-50 / D-4 / AC-27 (UI half): the model switch', () => {
  it('SD-19: before the session holds a version, the model selector is enabled and only sets the next message\'s model (no session is created)', async () => {
    h = await renderStudio(StudioComposerComponent);
    // FR-49: init() with nothing stored creates ONE empty session (store.sessions.spec). SD-19 concerns the switch only:
    // the stored id set after init is the baseline, and the switch must neither add a session nor replace that one.
    const before = Object.keys(h.sessionStore.snapshot().sessions).sort();
    expect(byName.select('X-6', 'en').disabled).toBe(false);
    await h.user.selectOptions(byName.select('X-6', 'en'), MODEL_LABEL.pro);
    await h.settle();
    expect(Object.keys(h.sessionStore.snapshot().sessions).sort()).toEqual(before);
    // It only set the model of the NEXT message: the selector shows Pro and the next request goes out with Pro.
    expect(byName.select('X-6', 'en').selectedOptions[0].textContent!.trim()).toBe(MODEL_LABEL.pro);
    await h.user.type(byName.textarea('en'), 'a white mug');
    await h.user.click(byName.button(t('X-1', 'en')));
    const req = expectGenerate(h);
    expect(req.request.body.model).toBe(PRO);
    req.flush(imagesBody());
    await h.settle();
    // Still the same single session after the first version was produced (no seed, no extra row).
    expect(Object.keys(h.sessionStore.snapshot().sessions).sort()).toEqual(before);
  });

  it('FR-50 (D-4 relaxed): with unsent text in the composer the model selector stays enabled and switching keeps the text', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.type(byName.textarea('en'), 'unsent');
    await h.settle();
    expect(byName.select('X-6', 'en').disabled).toBe(false);
    await h.user.selectOptions(byName.select('X-6', 'en'), MODEL_LABEL.pro);
    await h.settle();
    expect(byName.select('X-6', 'en').selectedOptions[0].textContent!.trim()).toBe(MODEL_LABEL.pro);
    expect((byName.textarea('en') as HTMLTextAreaElement).value).toBe('unsent');
  });

  it('FR-50 / AC-27: with a version and an empty composer, switching Flash to Pro creates a NEW session seeded with the latest version as an attachment', async () => {
    h = await renderStudio(StudioComposerComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    expect(byName.select('X-6', 'en').disabled).toBe(false);
    await h.user.selectOptions(byName.select('X-6', 'en'), MODEL_LABEL.pro);
    await h.settle();
    const ids = Object.keys(h.sessionStore.snapshot().sessions);
    expect(ids).toHaveLength(2);
    expect(ids).toContain('s1');
    // The seed is the attached version, shown in the attachment list (the same element as FR-14).
    expect(await screen.findByAltText(t('X-27', 'en', { n: 1 }))).toBeDefined();
    // History is not mixed: the old session keeps its own turns.
    expect(h.sessionStore.snapshot().sessions['s1'].turns.map((x) => x.id)).toEqual(['u1', 'm1']);
  });
});

describe('FR-77: every composer text follows the interface language at render time (T35)', () => {
  it('FR-77: a language toggle re-renders the labels of Send, the prompt, the product field and the three selectors', async () => {
    h = await renderStudio(StudioComposerComponent);
    // S11 sites (were L298 and L301): the fresh composer is blank, so the button reads X-29 in both languages.
    expect(byName.button(t('X-29', 'en'))).toBeDefined();
    expect(byName.textarea('en')).toBeDefined();
    await h.setLang('uk');
    expect(byName.button(t('X-29', 'uk'))).toBeDefined();
    expect(screen.getByRole('textbox', { name: 'Опишіть зображення' })).toBeDefined();
    expect(screen.getByRole('textbox', { name: 'Назва товару' })).toBeDefined();
    expect(screen.getByRole('combobox', { name: 'Співвідношення сторін' })).toBeDefined();
    expect(screen.getByRole('combobox', { name: 'Роздільна здатність' })).toBeDefined();
    expect(screen.getByRole('combobox', { name: 'Модель' })).toBeDefined();
    // Re-pointed null-check (was L307, which had gone vacuous: no button is named "Generate" in a blank composer in ANY language):
    // after the toggle the English "Write a prompt to start" button must be gone.
    expect(screen.queryByRole('button', { name: t('X-29', 'en') })).toBeNull();
  });
});

// =====================================================================================================================
// US-10.5 composer additions. Component runner. Every symbol used here exists at T21 (the composer spec is type-clean at its first
// runtime owner, breakdown rule R3): the store members used (applyPreset, sendState, checkedPresetId) are reached through `h.store`.
// Contract added to helpers/studio-render.ts: the quick-edit chips precede the prompt textarea; the send button's accessible name is
// exactly its label, with a decorative `Ctrl ↵` hint (aria-hidden); the preset button of the checked preset has aria-pressed="true" and a
// decorative aria-hidden check glyph.
// =====================================================================================================================
const presetBtn = (name: string) => screen.getByRole('button', { name });
const follows = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('US-10.5 FR-15 / FR-16 / FR-26 / FR-27: the restyled composer layout (T34)', () => {
  it('FR-15: the quick-edit chips are displayed directly ABOVE the prompt field (before it in document order)', async () => {
    h = await renderStudio(StudioComposerComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    for (const name of ['Remove background', 'Brighter', 'Softer shadow', 'Different angle']) {
      expect(follows(byName.button(name), byName.textarea('en')), name).toBe(true);
    }
  });

  it('FR-15 failure path: with no generated version no chip is rendered', async () => {
    h = await renderStudio(StudioComposerComponent);
    expect(screen.queryByRole('button', { name: 'Brighter' })).toBeNull();
  });

  it('the send button\'s accessible name is exactly "Generate" when text is typed (the Ctrl ↵ hint is decorative)', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.type(byName.textarea('en'), 'a mug');
    expect(screen.getByRole('button', { name: 'Generate' })).toBeDefined();
    const hint = screen.getByText('Ctrl ↵');
    expect(hint.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('button', { name: 'Generate' }).contains(hint)).toBe(true);
  });

  it('the label is Ukrainian under uk ("Згенерувати") and the hint is language-neutral', async () => {
    h = await renderStudio(StudioComposerComponent, { lang: 'uk' });
    await h.user.type(byName.textarea('uk'), 'чашка');
    expect(screen.getByRole('button', { name: 'Згенерувати' })).toBeDefined();
    expect(screen.getByText('Ctrl ↵')).toBeDefined();
  });

  it('FR-16: the aspect ratio stays the native select with the six values, 4K needs Pro, and the product-name field and Cancel stay', async () => {
    h = await renderStudio(StudioComposerComponent);
    expect(byName.select('X-4', 'en').tagName).toBe('SELECT');
    expect(byName.product('en')).toBeDefined();
    await h.user.type(byName.textarea('en'), 'x');
    await h.user.click(byName.button(t('X-1', 'en')));
    expect(byName.button(LABELS.en.cancel)).toBeDefined();
    const req = expectGenerate(h);
    req.flush(imagesBody());
    await h.settle();
  });

  it('FR-26 / FR-27: the composer holds every generation control - prompt, attach, presets, ratio, resolution, model, product name', async () => {
    h = await renderStudio(StudioComposerComponent);
    expect(byName.textarea('en')).toBeDefined();
    expect(byName.button(t('X-2', 'en'))).toBeDefined();
    expect(screen.getByRole('group', { name: t('X-13', 'en') })).toBeDefined();
    for (const id of ['X-4', 'X-5', 'X-6']) expect(byName.select(id, 'en')).toBeDefined();
    expect(byName.product('en')).toBeDefined();
  });

  // US-10.6 (OD-16 completion, G-6): the Images selector (4th combobox), the Product / Style ref label, "Save current as preset" and the "≈ $X for N images" estimate are now IN scope (AC-3, AC-6, AC-10, AC-13)
  // and are asserted present in the US-10.6 describes; a literal "1/2/4" string, a "Reference role" selector and time wording stay absent.
  it('FR-8 / AC-10 absence (narrowed by US-10.6): no literal "Images 1/2/4" text, no "Reference role" selector, no time estimate wording', async () => {
    h = await renderStudio(StudioComposerComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    const text = h.view.container.textContent ?? '';
    expect(text).not.toMatch(/Images\s*1\s*\/\s*2\s*\/\s*4|1\s*\/\s*2\s*\/\s*4/);
    expect(text).not.toMatch(/Reference role/i);
    expect(text).not.toMatch(/estimate|Estimated|~\s?\$|\bseconds?\b/i);
    // the comboboxes are the three selects of FR-16 (ratio, resolution, model) plus the Images selector of US-10.6 (AC-3)
    expect(screen.getAllByRole('combobox')).toHaveLength(4);
    expect(screen.queryByRole('combobox', { name: /reference|role/i })).toBeNull();
  });

  it('FR-8 absence in the preset row: it offers exactly the five presets and nothing else in the group', async () => {
    h = await renderStudio(StudioComposerComponent);
    expect(within(screen.getByRole('group', { name: t('X-13', 'en') })).getAllByRole('button')).toHaveLength(5);
  });
});

describe('US-10.5 FR-14 / FR-19: the preset row uses the store\'s applyPreset (T34)', () => {
  it('a pick sets BOTH the wire preset id and the checked preset (the same effect as a starter card)', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.click(presetBtn('Lifestyle scene'));
    await h.settle();
    expect(h.store.draft().presetId).toBe('lifestyle');
    expect(h.store.draft().checkedPresetId).toBe('lifestyle');
    expect(byName.select('X-4', 'en').value).toBe('4:5');
  });

  it('FR-14 rule 3: a quick-edit chip send leaves NEITHER preset field set and sends no presetId (a chip send has none of the three)', async () => {
    h = await renderStudio(StudioComposerComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    await h.user.click(presetBtn('Product on white'));
    expect(h.store.draft().presetId).toBe('white-bg');
    expect(h.store.draft().checkedPresetId).toBe('white-bg'); // precondition: the check mark is set, so "null after the chip" is a clearing, not an absence
    await h.user.click(byName.button('Brighter'));
    const req = expectGenerate(h);
    expect(req.request.body.presetId).toBeUndefined();
    expect(h.store.draft().presetId).toBeNull();
    expect(h.store.draft().checkedPresetId).toBeNull();
    req.flush(imagesBody());
    await h.settle();
  });
});

describe('US-10.5 FR-17 (SQ-1-B): Generate / Write a prompt to start, and Ctrl+Enter (T35)', () => {
  const chord = '{Control>}{Enter}{/Control}';

  it('a blank composer reads "Write a prompt to start" and is disabled; typed text reads "Generate" and is enabled', async () => {
    h = await renderStudio(StudioComposerComponent);
    expect((byName.button(LABELS.en.writePrompt) as HTMLButtonElement).disabled).toBe(true);
    await h.user.type(byName.textarea('en'), 'a mug');
    expect((byName.button(LABELS.en.generate) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('button', { name: LABELS.en.writePrompt })).toBeNull();
  });

  it('the label follows the draft: clearing the text brings "Write a prompt to start" back', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.type(byName.textarea('en'), 'a mug');
    await h.user.clear(byName.textarea('en'));
    expect(byName.button(LABELS.en.writePrompt)).toBeDefined();
  });

  it('the Ukrainian blank label is "Напишіть промпт для початку"', async () => {
    h = await renderStudio(StudioComposerComponent, { lang: 'uk' });
    expect((byName.button(LABELS.uk.writePrompt) as HTMLButtonElement).disabled).toBe(true);
  });

  it('the Ctrl ↵ hint is shown with either label and is decorative in both', async () => {
    h = await renderStudio(StudioComposerComponent);
    expect(screen.getByText('Ctrl ↵').getAttribute('aria-hidden')).toBe('true');
    await h.user.type(byName.textarea('en'), 'a mug');
    expect(screen.getByText('Ctrl ↵').getAttribute('aria-hidden')).toBe('true');
  });

  it('FR-17 rule 1: Ctrl+Enter in the prompt field sends exactly when a click would - once, with the typed text', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.type(byName.textarea('en'), 'a white mug');
    await h.user.keyboard(chord);
    const req = expectGenerate(h);
    expect(req.request.body.newTurn.parts).toEqual([{ text: 'a white mug' }]);
    req.flush(imagesBody());
    await h.settle();
  });

  it('FR-17 failure path: Ctrl+Enter with a blank prompt and nothing attached sends nothing', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.click(byName.textarea('en'));
    await h.user.keyboard(chord);
    await h.settle();
    h.http.expectNone(GENERATE_URL);
    expect(h.store.generating()).toBe(false);
  });

  it('FR-17 failure path: Ctrl+Enter with whitespace only sends nothing', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.type(byName.textarea('en'), '   ');
    await h.user.keyboard(chord);
    await h.settle();
    h.http.expectNone(GENERATE_URL);
  });

  it('FR-17 failure path: Ctrl+Enter while a generation runs does not start a second request', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.type(byName.textarea('en'), 'a white mug');
    await h.user.click(byName.button(LABELS.en.generate));
    const req = expectGenerate(h);
    byName.textarea('en').focus();
    await h.user.keyboard(chord);
    await h.settle();
    h.http.expectNone(GENERATE_URL);
    req.flush(imagesBody());
    await h.settle();
  });

  it('FR-17 failure path: Ctrl+Enter in a blocked session sends nothing (413 PROTECTED_HISTORY_EXCEEDS_LIMIT)', async () => {
    h = await renderStudio(StudioComposerComponent, { sessions: [makeSession('s1', { pairs: 1 })] });
    await h.user.type(byName.textarea('en'), 'too much');
    await h.user.click(byName.button(LABELS.en.generate));
    await flushGenerate(h, { error: 'PROTECTED_HISTORY_EXCEEDS_LIMIT' }, { status: 413, statusText: 'x' });
    await h.user.type(byName.textarea('en'), ' more');
    await h.user.keyboard(chord);
    await h.settle();
    h.http.expectNone(GENERATE_URL);
  });

  it('a send by Ctrl+Enter produces the same request as a click (same body)', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.type(byName.textarea('en'), 'same words');
    await h.user.click(byName.button(LABELS.en.generate));
    const first = expectGenerate(h); // expectOne takes the request out of the controller: keep the handle and flush THIS request
    const viaClick = JSON.parse(JSON.stringify(first.request.body));
    first.flush({ error: 'UPSTREAM_RETRIES_EXHAUSTED' }, { status: 502, statusText: 'x' });
    await h.settle();
    expect(byName.textarea('en').value).toBe('same words'); // a failed turn returns to the composer
    await h.user.click(byName.textarea('en'));
    await h.user.keyboard(chord);
    const second = expectGenerate(h);
    const viaChord = second.request.body;
    expect(viaChord.newTurn.parts).toEqual(viaClick.newTurn.parts);
    expect(viaChord.model).toBe(viaClick.model);
    expect(viaChord.aspectRatio).toBe(viaClick.aspectRatio);
    expect(viaChord.resolution).toBe(viaClick.resolution);
    second.flush(imagesBody());
    await h.settle();
  });
});

describe('US-10.5 FR-14 (i)/(c): the check mark is conveyed programmatically and clears on typing (T36)', () => {
  const pressed = (name: string) => presetBtn(name).getAttribute('aria-pressed');

  it('a picked preset button is aria-pressed="true" and shows a decorative check glyph; the others are not pressed', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.click(presetBtn('Product on white'));
    expect(pressed('Product on white')).toBe('true');
    expect(presetBtn('Product on white').querySelector('[aria-hidden="true"]')).not.toBeNull();
    for (const other of ['Lifestyle scene', 'Category banner', 'Social', 'Detail close-up']) {
      expect(pressed(other), other).not.toBe('true');
      expect(presetBtn(other).querySelector('[aria-hidden="true"]'), other).toBeNull();
    }
  });

  it('the check mark is on exactly one preset at a time', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.click(presetBtn('Product on white'));
    await h.user.click(presetBtn('Category banner'));
    const all = within(screen.getByRole('group', { name: t('X-13', 'en') })).getAllByRole('button');
    expect(all.filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(pressed('Category banner')).toBe('true');
  });

  it('editing the prompt text clears the check mark (glyph and aria-pressed) as soon as the user types', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.click(presetBtn('Product on white'));
    // PRECONDITION (test_strategy v5, section 9): without it the two negations below pass before T36, because a button that has no check
    // mark at all also has "no check mark after typing". The mark must be there first, then be seen to clear.
    expect(pressed('Product on white')).toBe('true');
    expect(presetBtn('Product on white').querySelector('[aria-hidden="true"]')).not.toBeNull();
    await h.user.type(byName.textarea('en'), ' on a table');
    expect(pressed('Product on white')).not.toBe('true');
    expect(presetBtn('Product on white').querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('FR-14 rule 4 / D-3: after the edit the request STILL carries the picked preset id, and the stored turn records none', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.click(presetBtn('Product on white'));
    await h.user.type(byName.textarea('en'), ' edited');
    await h.user.click(byName.button(LABELS.en.generate));
    const req = expectGenerate(h);
    expect(req.request.body.presetId).toBe('white-bg');
    req.flush(imagesBody());
    await h.settle();
    const stored = h.sessionStore.snapshot().sessions[h.store.currentSessionId()!];
    const modelTurn = stored.turns.filter((x) => x.role === 'model').pop() as unknown as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(modelTurn, 'presetId')).toBe(false);
  });

  it('without an edit the stored turn records the picked preset', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.click(presetBtn('Category banner'));
    await h.user.click(byName.button(LABELS.en.generate));
    const req = expectGenerate(h);
    req.flush(imagesBody());
    await h.settle();
    const stored = h.sessionStore.snapshot().sessions[h.store.currentSessionId()!];
    expect((stored.turns.filter((x) => x.role === 'model').pop() as unknown as Record<string, unknown>)['presetId']).toBe('banner');
  });

  it('with no preset picked no button is pressed', async () => {
    h = await renderStudio(StudioComposerComponent);
    const all = within(screen.getByRole('group', { name: t('X-13', 'en') })).getAllByRole('button');
    expect(all.filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(0);
  });
});


// ---------------------------------------------------------------------------------------------------------------------
// US-10.6 T33 - the Images selector and the pre-send estimate next to Generate (FR-4, FR-20, FR-21; AC-3, AC-13; owner rulings SM-7 i, placement as proposed,
// UA copy as proposed, G-8 OD-14 a/d).
// PINNED DOM CONTRACT: a <select> (role combobox) named X-47 ("Images" / "Кількість") with the options 1, 2, 4, default 1, placed BEFORE the aspect-ratio, resolution
// and model selects; the estimate is plain text (X-54 family, T24) placed BEFORE the Generate button, NOT role="status"; it makes no request; it updates with the
// image count, the resolution and the model; changing the count changes draft().imageCount and the request that is sent.
// ---------------------------------------------------------------------------------------------------------------------
describe('AC-3 / FR-4: the Images selector (T33)', () => {
  const imagesSelect = (lang: 'en' | 'uk' = 'en') => screen.getByRole('combobox', { name: t('X-47', lang) }) as HTMLSelectElement;

  it('AC-3: a combobox named "Images" offers exactly 1, 2 and 4 and defaults to 1', async () => {
    h = await renderStudio(StudioComposerComponent);
    const select = imagesSelect();
    expect(within(select).getAllByRole('option').map((o) => o.textContent!.trim())).toEqual(['1', '2', '4']);
    expect(select.value).toBe('1');
  });

  it('placement (owner ruling): the Images select comes before the aspect ratio, resolution and model selects in the controls row', async () => {
    h = await renderStudio(StudioComposerComponent);
    for (const id of ['X-4', 'X-5', 'X-6']) {
      expect(imagesSelect().compareDocumentPosition(byName.select(id, 'en')) & Node.DOCUMENT_POSITION_FOLLOWING, id).toBeTruthy();
    }
  });

  it('AC-3: choosing 4 sets the draft count, and the Generate request carries imageCount 4', async () => {
    h = await renderStudio(StudioComposerComponent, { sessions: [makeSession('s1')] });
    await h.user.selectOptions(imagesSelect(), '4');
    expect((h.store.draft() as any).imageCount).toBe(4);
    await h.user.type(byName.textarea('en'), 'a white mug');
    await h.user.click(byName.button(t('X-1', 'en')));
    const body = expectGenerate(h).request.body as { imageCount?: number };
    expect(body.imageCount).toBe(4);
  });

  it('FR-4: with 1 selected the request carries no imageCount field [characterization]', async () => {
    h = await renderStudio(StudioComposerComponent, { sessions: [makeSession('s1')] });
    await h.user.type(byName.textarea('en'), 'a white mug');
    await h.user.click(byName.button(t('X-1', 'en')));
    expect('imageCount' in (expectGenerate(h).request.body as object)).toBe(false);
  });

  it('the label follows the language: "Кількість" in Ukrainian', async () => {
    h = await renderStudio(StudioComposerComponent, { lang: 'uk' });
    expect(imagesSelect('uk')).toBeDefined();
  });
});

describe('AC-13 / FR-20: the estimate next to Generate (T33)', () => {
  const estimate = () => screen.getByText(/^≈ \$/);

  it('AC-13: for the default Flash 1K and 1 image it reads "≈ $0.07 for 1 image" (0.067 rounded for display only)', async () => {
    h = await renderStudio(StudioComposerComponent);
    expect(estimate().textContent!.trim()).toBe('≈ $0.07 for 1 image');
  });

  it('AC-13: it updates with the image count - 4 images read "≈ $0.27 for 4 images" (0.067 x 4 = 0.268)', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.selectOptions(screen.getByRole('combobox', { name: t('X-47', 'en') }), '4');
    expect(estimate().textContent!.trim()).toBe('≈ $0.27 for 4 images');
  });

  it('AC-13: it updates with the resolution - Flash 2K x 4 = 0.404 reads "≈ $0.40 for 4 images"', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.selectOptions(screen.getByRole('combobox', { name: t('X-47', 'en') }), '4');
    await h.user.selectOptions(byName.select('X-5', 'en'), '2K');
    expect(estimate().textContent!.trim()).toBe('≈ $0.40 for 4 images');
  });

  it('AC-13: it updates with the model - Pro 1K x 2 = 0.268 reads "≈ $0.27 for 2 images", and Pro 4K x 4 = 0.96', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.selectOptions(byName.select('X-6', 'en'), MODEL_LABEL.pro);
    await h.user.selectOptions(screen.getByRole('combobox', { name: t('X-47', 'en') }), '2');
    expect(estimate().textContent!.trim()).toBe('≈ $0.27 for 2 images');
    await h.user.selectOptions(screen.getByRole('combobox', { name: t('X-47', 'en') }), '4');
    await h.user.selectOptions(byName.select('X-5', 'en'), '4K');
    expect(estimate().textContent!.trim()).toBe('≈ $0.96 for 4 images');
  });

  it('SM-7 i / FR-20 (c): the Ukrainian estimate uses "зображення" for 1, 2 and 4 - "≈ $0.07 за 1 зображення"', async () => {
    h = await renderStudio(StudioComposerComponent, { lang: 'uk' });
    expect(estimate().textContent!.trim()).toBe('≈ $0.07 за 1 зображення');
    await h.user.selectOptions(screen.getByRole('combobox', { name: t('X-47', 'uk') }), '4');
    expect(estimate().textContent!.trim()).toBe('≈ $0.27 за 4 зображення');
  });

  it('placement (owner ruling): the estimate is to the left of the Generate button (earlier in document order) and is not a status region', async () => {
    h = await renderStudio(StudioComposerComponent);
    const generate = byName.button(t('X-29', 'en'));
    expect(estimate().compareDocumentPosition(generate) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(estimate().closest('[role="status"]')).toBeNull();
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('FR-20: the estimate needs no request - choosing a count, a resolution and a model issues no HTTP call', async () => {
    h = await renderStudio(StudioComposerComponent);
    await h.user.selectOptions(screen.getByRole('combobox', { name: t('X-47', 'en') }), '2');
    await h.user.selectOptions(byName.select('X-5', 'en'), '2K');
    h.http.expectNone(() => true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// US-10.6 T35 - the presets row: user presets, "+ Save current as preset", delete (FR-15..FR-17; AC-10, AC-10a, AC-11; owner rulings SM-6, G-8 OD-12, placement as proposed).
// PINNED DOM CONTRACT: the registry group (role group named X-13) stays EXACTLY the five registry buttons (its existing cases are unchanged); the user presets and the last
// (dashed) "+ Save current as preset" pill (button named X-50) are siblings of that group in the same row, AFTER it - not inside it. Clicking the pill shows a textbox named X-51
// ("Preset name"); Enter saves the current prompt, ratio, resolution and model under the typed name; a user preset is a button named by its name that applies like a registry
// preset (aria-pressed marks it); each has a delete button named X-52 ("Delete preset "{name}"") that is in the accessibility tree, tabbable and not hidden; registry
// presets have none. Storage goes through the USER_PRESET_STORAGE_PORT token (here a spec-local in-memory fake shared across renders, the "page reload").
// ---------------------------------------------------------------------------------------------------------------------
describe('AC-10 / AC-10a / AC-11: user presets in the presets row (T35)', () => {
  function makePort(initial: unknown = []) {
    const state = { stored: { ok: true as boolean, presets: initial as unknown }, failSaves: false, saveCalls: 0 };
    return {
      state,
      load: () => state.stored,
      save: (presets: unknown[]) => {
        state.saveCalls += 1;
        if (state.failSaves) return { ok: false };
        state.stored = { ok: true, presets: structuredClone(presets) };
        return { ok: true };
      },
    };
  }
  async function render(port: ReturnType<typeof makePort>, opts: { lang?: 'en' | 'uk'; sessions?: ReturnType<typeof makeSession>[] } = {}) {
    const tokens = await import('../../../../services/image-studio/image-studio.tokens') as Record<string, unknown>;
    return renderStudio(StudioComposerComponent, {
      ...(opts.lang ? { lang: opts.lang } : {}),
      sessions: opts.sessions ?? [makeSession('s1')],
      extraProviders: [{ provide: tokens['USER_PRESET_STORAGE_PORT'], useValue: port }],
    });
  }
  const saveBtn = (lang: 'en' | 'uk' = 'en') => byName.button(t('X-50', lang));
  async function saveAs(name: string, lang: 'en' | 'uk' = 'en') {
    await h.user.click(saveBtn(lang));
    const input = await screen.findByRole('textbox', { name: t('X-51', lang) });
    await h.user.type(input, `${name}{Enter}`);
    await h.settle();
  }
  const registryGroup = (lang: 'en' | 'uk' = 'en') => screen.getByRole('group', { name: t('X-13', lang) });
  const deleteBtn = (name: string, lang: 'en' | 'uk' = 'en') => screen.getByRole('button', { name: t('X-52', lang, { name }) });

  it('AC-10: the pill "+ Save current as preset" is the last pill of the row, after the registry group and outside it', async () => {
    h = await render(makePort());
    const pill = saveBtn();
    expect(pill.closest('[role="group"]')).not.toBe(registryGroup());
    expect(registryGroup().contains(pill)).toBe(false);
    expect(registryGroup().compareDocumentPosition(pill) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(registryGroup()).getAllByRole('button')).toHaveLength(5);
  });

  it('AC-10: saving stores the current prompt, ratio, resolution and model under the typed name; it appears as a pill after the registry group', async () => {
    h = await render(makePort());
    await h.user.type(byName.textarea('en'), 'A mug on a desk, soft light');
    await h.user.selectOptions(byName.select('X-4', 'en'), '4:5');
    await h.user.selectOptions(byName.select('X-5', 'en'), '2K');
    await saveAs('My mug shot');
    const pill = screen.getByRole('button', { name: 'My mug shot' });
    expect(registryGroup().contains(pill)).toBe(false);
    expect(registryGroup().compareDocumentPosition(pill) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('AC-10: choosing the saved preset applies it exactly like a registry one - prompt, ratio, resolution filled and the pill marked pressed', async () => {
    h = await render(makePort());
    await h.user.type(byName.textarea('en'), 'A mug on a desk, soft light');
    await h.user.selectOptions(byName.select('X-4', 'en'), '4:5');
    await h.user.selectOptions(byName.select('X-5', 'en'), '2K');
    await saveAs('My mug shot');
    await h.user.clear(byName.textarea('en'));
    await h.user.selectOptions(byName.select('X-4', 'en'), '1:1');
    await h.user.click(screen.getByRole('button', { name: 'My mug shot' }));
    expect(byName.textarea('en').value).toBe('A mug on a desk, soft light');
    expect(byName.select('X-4', 'en').value).toBe('4:5');
    expect(byName.select('X-5', 'en').value).toBe('2K');
    expect(screen.getByRole('button', { name: 'My mug shot' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('AC-10 (survives a reload): a new render over the same storage shows the saved preset', async () => {
    const port = makePort();
    h = await render(port);
    await h.user.type(byName.textarea('en'), 'A mug');
    await saveAs('Keeps after reload');
    h.view.fixture.destroy();
    document.body.innerHTML = '';
    h = await render(port);
    expect(screen.getByRole('button', { name: 'Keeps after reload' })).toBeDefined();
  });

  it('AC-10a: each user preset has a delete button named "Delete preset "{name}"" that is in the accessibility tree, tabbable and not hidden; registry presets have none', async () => {
    h = await render(makePort());
    await h.user.type(byName.textarea('en'), 'A mug');
    await saveAs('My mug');
    const del = deleteBtn('My mug');
    expect(del.hasAttribute('hidden')).toBe(false);
    expect(del.closest('[aria-hidden="true"]')).toBeNull();
    expect(del.tabIndex).toBeGreaterThanOrEqual(0);
    del.focus();
    expect(document.activeElement).toBe(del);
    expect(screen.getAllByRole('button', { name: /^Delete preset/ })).toHaveLength(1);
    expect(within(registryGroup()).queryAllByRole('button', { name: /^Delete preset/ })).toHaveLength(0);
  });

  it('AC-10a: deleting removes it from the row and from storage (immediately, no confirmation, OD-12 f); the registry group is untouched (AC-11)', async () => {
    const port = makePort();
    h = await render(port);
    await h.user.type(byName.textarea('en'), 'A mug');
    await saveAs('Doomed');
    await h.user.click(deleteBtn('Doomed'));
    await h.settle();
    expect(screen.queryByRole('button', { name: 'Doomed' })).toBeNull();
    expect((port.state.stored.presets as unknown[]).length).toBe(0);
    expect(h.confirmPort.asked).toEqual([]);
    expect(within(registryGroup()).getAllByRole('button').map((b) => b.textContent!.trim())).toEqual([
      'Product on white', 'Lifestyle scene', 'Category banner', 'Social', 'Detail close-up',
    ]);
  });

  it('OD-12 (f): deleting the preset that is currently checked unchecks it and leaves the composer fields as they are', async () => {
    h = await render(makePort());
    await h.user.type(byName.textarea('en'), 'Keep this text');
    await saveAs('Checked one');
    await h.user.click(screen.getByRole('button', { name: 'Checked one' }));
    await h.user.click(deleteBtn('Checked one'));
    await h.settle();
    expect(h.store.draft().checkedPresetId).toBeNull();
    expect(byName.textarea('en').value).toBe('Keep this text');
  });

  it('FR-15 (d): a save that cannot be stored shows no new preset', async () => {
    const port = makePort();
    port.state.failSaves = true;
    h = await render(port);
    await h.user.type(byName.textarea('en'), 'A mug');
    await saveAs('Not stored');
    expect(screen.queryByRole('button', { name: 'Not stored' })).toBeNull();
  });

  it('FR-15 (c): an empty name saves nothing', async () => {
    const port = makePort();
    h = await render(port);
    await h.user.click(saveBtn());
    await h.user.type(await screen.findByRole('textbox', { name: t('X-51', 'en') }), '{Enter}');
    await h.settle();
    expect(port.state.saveCalls).toBe(0);
  });

  it('SM-6: a name of 61 characters is not saved; one of 60 is', async () => {
    const port = makePort();
    h = await render(port);
    await h.user.type(byName.textarea('en'), 'A mug');
    await saveAs('x'.repeat(61));
    expect(screen.queryByRole('button', { name: 'x'.repeat(61) })).toBeNull();
    await saveAs('y'.repeat(60));
    expect(screen.getByRole('button', { name: 'y'.repeat(60) })).toBeDefined();
  });

  it('UA copy: the pill reads "+ Зберегти як пресет", the name field "Назва пресета" and the delete control "Видалити пресет «{name}»"', async () => {
    h = await render(makePort(), { lang: 'uk' });
    await h.user.type(byName.textarea('uk'), 'Кухоль');
    await saveAs('Мій кухоль', 'uk');
    expect(deleteBtn('Мій кухоль', 'uk').getAttribute('aria-label') ?? deleteBtn('Мій кухоль', 'uk').textContent).toContain('Видалити пресет «Мій кухоль»');
  });

  it('AC-11: user presets never reach the empty state starter cards (STARTER_PRESET_IDS consumers see registry presets only)', async () => {
    const port = makePort();
    h = await render(port);
    await h.user.type(byName.textarea('en'), 'A mug');
    await saveAs('Mine only');
    const { PROMPT_PRESETS } = await import('../../../../prompt-core/prompt-presets');
    expect(PROMPT_PRESETS.map((p) => p.name.en)).not.toContain('Mine only');
  });
});
