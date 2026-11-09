/**
 * US-10.5 T26 - StudioEmptyStateComponent: the headline, the sentence and the three starter cards read from the preset registry.
 * Covers FR-18, FR-19, FR-22 (+ NFR-2: names, ratios and descriptions come from PROMPT_PRESETS, not from the component).
 *
 * Component runner. Contract (owner T26; standalone, OnPush): input `lang`; the cards are `button`s, one per STARTER_PRESET_IDS entry in
 * registry order, whose ACCESSIBLE NAME is the preset name followed by its description (so an exact-name lookup of the composer's preset row
 * button is not duplicated, plan R-9); choosing a card calls the store's applyPreset, exactly as the composer's preset row does.
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/angular';
import { StudioEmptyStateComponent } from './studio-empty-state.component';
import { renderStudio, t, PRO, GENERATE_URL } from '../../../../../test/image-studio/helpers/studio-render';
import { findPreset, presetName, presetDescription, STARTER_PRESET_IDS } from '../../../../prompt-core/prompt-presets';

const cards = () => screen.getAllByRole('button');

describe('FR-18: headline, sentence and three starter cards (T26)', () => {
  it('shows the headline "Your images will appear here" and the explanatory sentence', async () => {
    await renderStudio(StudioEmptyStateComponent);
    expect(screen.getByText('Your images will appear here')).toBeDefined();
    expect(screen.getByText('Describe the image you want, or start from one of the templates below.')).toBeDefined();
  });

  it('shows the Ukrainian headline and sentence under uk', async () => {
    await renderStudio(StudioEmptyStateComponent, { lang: 'uk' });
    expect(screen.getByText("Тут з'являться ваші зображення")).toBeDefined();
    expect(screen.getByText('Опишіть потрібне зображення або почніть з одного з шаблонів нижче.')).toBeDefined();
  });

  it('has exactly three starter cards, in registry order, named "Product on white", "Lifestyle scene", "Category banner" (each followed by its description)', async () => {
    await renderStudio(StudioEmptyStateComponent);
    const names = cards().map((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').replace(/\s+/g, ' ').trim());
    expect(names).toHaveLength(3);
    expect(names[0]).toMatch(/^Product on white\b.*Perfect for e-commerce listings/);
    expect(names[1]).toMatch(/^Lifestyle scene\b.*Product in a realistic setting/);
    expect(names[2]).toMatch(/^Category banner\b.*Wide format with space for text/);
  });

  it('R-9: an exact-name lookup of the preset name finds NO starter card (so the composer\'s preset row button stays unique)', async () => {
    await renderStudio(StudioEmptyStateComponent);
    for (const name of ['Product on white', 'Lifestyle scene', 'Category banner']) expect(screen.queryByRole('button', { name })).toBeNull();
  });

  it('under uk the cards carry the Ukrainian names and descriptions', async () => {
    await renderStudio(StudioEmptyStateComponent, { lang: 'uk' });
    const names = cards().map((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').replace(/\s+/g, ' ').trim());
    // No \b here: without the u flag \b is ASCII-only, so after a Cyrillic letter it never matches before a space.
    expect(names[0]).toMatch(/^Товар на білому тлі(?=\s).*Ідеально для товарних карток/);
    expect(names[1]).toMatch(/^Лайфстайл-сцена(?=\s).*Товар у реалістичному оточенні/);
    expect(names[2]).toMatch(/^Банер категорії(?=\s).*Широкий формат із місцем для тексту/);
  });
});

describe('FR-22 / NFR-2: the cards are read from the registry, not hard-coded (T26)', () => {
  it.each(['en', 'uk'] as const)('the cards match presetName / presetDescription of STARTER_PRESET_IDS in %s', async (lang) => {
    await renderStudio(StudioEmptyStateComponent, { lang });
    const names = cards().map((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').replace(/\s+/g, ' ').trim());
    STARTER_PRESET_IDS.forEach((id, i) => {
      const p = findPreset(id)!;
      expect(names[i]).toContain(presetName(p, lang));
      expect(names[i]).toContain(presetDescription(p, lang)!);
    });
  });

  it('changing a preset description in the registry changes its card with no component change', async () => {
    const banner = findPreset('banner')!;
    const original = banner.description!.en;
    banner.description!.en = 'Changed in the registry only';
    try {
      await renderStudio(StudioEmptyStateComponent);
      const names = cards().map((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').replace(/\s+/g, ' ').trim());
      expect(names[2]).toContain('Changed in the registry only');
      expect(names[2]).not.toContain('Wide format with space for text');
    } finally {
      banner.description!.en = original;
    }
  });
});

describe('FR-19: choosing a card fills the composer exactly as the preset row does, and sends nothing (T26)', () => {
  it('"Lifestyle scene" fills prompt, 4:5, 2K and Pro, sets both preset fields, and leaves the prompt editable plain text', async () => {
    const h = await renderStudio(StudioEmptyStateComponent);
    await h.user.click(cards()[1]);
    await h.settle();
    const d = h.store.draft();
    expect(d.text).toBe('Lifestyle photo of the product placed in a real environment such as a workshop, an office or a classroom.');
    expect(d.aspectRatio).toBe('4:5');
    expect(d.resolution).toBe('2K');
    expect(d.model).toBe(PRO);
    expect(d.presetId).toBe('lifestyle');
    expect(d.checkedPresetId).toBe('lifestyle');
  });

  it('"Product on white" substitutes the product name from the composer draft', async () => {
    const h = await renderStudio(StudioEmptyStateComponent);
    h.store.setDraft({ productName: 'Bambu X1C' });
    await h.user.click(cards()[0]);
    expect(h.store.draft().text).toContain('Bambu X1C');
    expect(h.store.draft().text).not.toContain('{product}');
  });

  it('choosing a card sends no request and starts no generation', async () => {
    const h = await renderStudio(StudioEmptyStateComponent);
    await h.user.click(cards()[2]);
    await h.settle();
    h.http.expectNone(GENERATE_URL);
    expect(h.store.generating()).toBe(false);
  });

  it('FR-19 failure path: after every card the resolution is one the chosen model offers (no 4K on Flash)', async () => {
    const h = await renderStudio(StudioEmptyStateComponent);
    for (let i = 0; i < 3; i++) {
      await h.user.click(cards()[i]);
      const d = h.store.draft();
      expect(['1K', '2K', '4K']).toContain(d.resolution);
      if (d.model !== PRO) expect(d.resolution).not.toBe('4K');
    }
  });

  it('the cards are real buttons reachable from the keyboard and carry a translated name under uk (no English fallback)', async () => {
    await renderStudio(StudioEmptyStateComponent, { lang: 'uk' });
    expect(screen.queryByText(t('X-40', 'en'))).toBeNull();
    for (const b of cards()) expect(b.tagName).toBe('BUTTON');
  });
});
