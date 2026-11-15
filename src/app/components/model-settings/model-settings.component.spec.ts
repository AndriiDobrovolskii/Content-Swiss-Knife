/**
 * The first component spec in this repository, and the proof that the Angular unit-test
 * runner actually works (AGENTS.md §5).
 *
 * It runs under the Angular `unit-test` builder (`npm run test:components`), NOT under the
 * plain vitest logic runner — the `*.component.spec.ts` suffix is the boundary, and
 * `vitest.config.ts` excludes it for exactly that reason.
 *
 * Note what is asserted: rendered text the user reads, a click on a button found by its
 * accessible name, and an emitted output. Not `toBeTruthy()` on the fixture, and not the
 * component's private fields — per AGENTS.md §5, a test that only proves the class can be
 * constructed is a defect, not coverage.
 *
 * ModelSettingsService is deliberately NOT mocked. It is a real `providedIn: 'root'` signal
 * store whose only side effect is localStorage, already wrapped in try/catch and available
 * in the test environment. Substituting it here would mean testing the mock instead of the
 * wiring between template, signals and service.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ModelSettingsComponent } from './model-settings.component';

describe('ModelSettingsComponent', () => {
  beforeEach(() => {
    // The service restores from localStorage in its constructor; start every test from the
    // documented defaults rather than from whatever a previous test persisted.
    localStorage.clear();
  });

  it('renders the English title by default', async () => {
    await render(ModelSettingsComponent);

    expect(screen.getByRole('heading', { name: /AI Model Settings/i })).toBeTruthy();
  });

  it('renders Ukrainian labels when the lang input is uk', async () => {
    await render(ModelSettingsComponent, { inputs: { lang: 'uk' } });

    // The `lang` input signal feeds the `labels` computed, which the template reads.
    expect(screen.getByRole('heading', { name: 'Налаштування моделі ШІ' })).toBeTruthy();
    expect(screen.getByText('Слот глибокого мислення')).toBeTruthy();
  });

  it('emits closed when the user clicks the close button', async () => {
    const user = userEvent.setup();
    let emitted = 0;

    await render(ModelSettingsComponent, {
      on: { closed: () => { emitted += 1; } },
    });

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(emitted).toBe(1);
  });

  it('switches the deep slot to the provider the user picks', async () => {
    const user = userEvent.setup();
    const { fixture } = await render(ModelSettingsComponent);
    const settings = fixture.componentInstance.settings;

    // Default deep slot is Anthropic; pick a different provider from the catalog so the
    // assertion cannot pass by accident if the default ever changes.
    const other = settings.catalog.find(p => p.id !== settings.deepProvider());
    expect(other).toBeDefined();

    await user.click(screen.getAllByRole('button', { name: other!.label })[0]);

    expect(settings.deepProvider()).toBe(other!.id);
  });
});

/**
 * US-4.1 (T4 owns the T2 label assertions) — AC-1 / FR-4: the new Deep default claude-sonnet-5-5 has
 * five thinking levels (v3: no max), two of which (between_tools, xhigh) the settings UI has never had to
 * label. What the user sees must be a readable label, never the raw catalog id, in both languages.
 */
describe('ModelSettingsComponent with claude-sonnet-5-5 (US-4.1)', () => {
  beforeEach(() => { localStorage.clear(); });

  const deepSlider = () => screen.getAllByRole('slider')[0] as HTMLInputElement;
  const fastSlider = () => screen.getAllByRole('slider')[1] as HTMLInputElement;
  const levelValueNextTo = (labelText: string) =>
    (screen.getAllByText(labelText)[0].nextElementSibling as HTMLElement).textContent!.trim();

  it('offers claude-sonnet-5-5 in the Deep model list and no longer offers claude-sonnet-4-6', async () => {
    await render(ModelSettingsComponent);

    const deepModels = Array.from((screen.getAllByRole('combobox')[0] as HTMLSelectElement).options).map(o => o.value);
    expect(deepModels).toEqual(['claude-sonnet-5-5', 'claude-sonnet-5', 'claude-haiku-4-5']);
    expect(deepModels).not.toContain('claude-sonnet-4-6');
  });

  it('offers gemini-3.8-flash in the Fast model list when Fast runs on Gemini', async () => {
    await render(ModelSettingsComponent);

    const fastModels = Array.from((screen.getAllByRole('combobox')[1] as HTMLSelectElement).options).map(o => o.value);
    expect(fastModels).toContain('gemini-3.8-flash');
    expect(fastModels).not.toContain('claude-sonnet-4-6');
  });

  it('sizes the Deep slider to the five Sonnet 5.5 levels (steps 0..4) and starts it on High', async () => {
    await render(ModelSettingsComponent);

    expect(deepSlider().min).toBe('0');
    expect(deepSlider().max).toBe('4');
    expect(deepSlider().value).toBe('3');
    expect(levelValueNextTo('Thinking level')).toBe('High');
  });

  it('sizes the Fast slider to the three Gemini 3.8 Flash levels (no Minimal) and starts it on Low', async () => {
    await render(ModelSettingsComponent);

    expect(fastSlider().max).toBe('2');
    expect(fastSlider().value).toBe('0');
    expect(screen.queryByText('Minimal')).toBeNull();
  });

  it('labels the Deep scale ends in English: Between tools ... Extra high, with no Max label and no raw level id', async () => {
    await render(ModelSettingsComponent);

    expect(screen.getAllByText('Between tools').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Extra high').length).toBeGreaterThan(0);
    expect(screen.queryByText('Max')).toBeNull();
    expect(screen.queryByText('between_tools')).toBeNull();
    expect(screen.queryByText('xhigh')).toBeNull();
    expect(screen.queryByText('max')).toBeNull();
  });

  it('shows Extra high and drives setDeepLevel when the user slides to the top (fifth, index 4) step', async () => {
    const { fixture } = await render(ModelSettingsComponent);

    fireEvent.input(deepSlider(), { target: { value: '4' } });

    expect(fixture.componentInstance.settings.deepLevel()).toBe('xhigh');
    expect((await screen.findAllByText('Extra high')).length).toBeGreaterThan(0);
    expect(screen.queryByText('xhigh')).toBeNull();
  });

  it('shows Between tools and drives setDeepLevel when the user slides to the first step', async () => {
    const { fixture } = await render(ModelSettingsComponent);

    fireEvent.input(deepSlider(), { target: { value: '0' } });

    expect(fixture.componentInstance.settings.deepLevel()).toBe('between_tools');
    await screen.findAllByText('Between tools');
    expect(levelValueNextTo('Thinking level')).toBe('Between tools');
    expect(screen.queryByText('between_tools')).toBeNull();
  });

  it('has no step beyond Extra high: the top step is index 4 and never reads Max', async () => {
    const { fixture } = await render(ModelSettingsComponent);

    expect(deepSlider().max).toBe('4');
    fireEvent.input(deepSlider(), { target: { value: '4' } });

    expect(fixture.componentInstance.settings.deepLevel()).toBe('xhigh');
    expect(levelValueNextTo('Thinking level')).toBe('Extra high');
    expect(screen.queryByText('Max')).toBeNull();
  });

  it('renders Ukrainian text, not English and not the raw id, for the new levels', async () => {
    const { fixture } = await render(ModelSettingsComponent, { inputs: { lang: 'uk' } });

    for (const [index, id] of [['0', 'between_tools'], ['4', 'xhigh']] as const) {
      fireEvent.input(deepSlider(), { target: { value: index } });
      expect(fixture.componentInstance.settings.deepLevel()).toBe(id);

      const shown = levelValueNextTo('Рівень мислення');
      expect(shown, id).toMatch(/[Ѐ-ӿ]/);
      expect(shown, id).not.toBe(id);
      expect(['Between tools', 'Extra high', 'Max']).not.toContain(shown);
      expect(screen.queryByText(id)).toBeNull();
    }
  });
});

/**
 * US-11.1 (T8, with T6 making the model list true) - FR-6, FR-7, FR-8, FR-9 and the UI half of FR-13 / AC-4.
 * Written from the Specification: what the operator sees in the two model dropdowns, the cost/speed badge
 * beside the selected model, and the thinking-level control. ModelSettingsService is the real signal store
 * (see the file header); nothing here is mocked.
 *
 * Only FR-7 and FR-8 start red against code that already lists the models; the dropdown and slider cases are
 * driven by the catalog and are pinned here so they cannot regress (task breakdown T8).
 */
describe('ModelSettingsComponent with the Gemini 4 models (US-11.1)', () => {
  beforeEach(() => { localStorage.clear(); });

  const GEMINI_LABELS = ['Gemini 4 Carbon', 'Gemini 3.1 Pro', 'Gemini 4 Hydrogen', 'Gemini 3.8 Flash'];
  const GEMINI_IDS = ['gemini-4-carbon', 'gemini-3.1-pro-preview', 'gemini-4-hydrogen', 'gemini-3.8-flash'];

  const deepSelect = () => screen.getAllByRole('combobox')[0] as HTMLSelectElement;
  const fastSelect = () => screen.getAllByRole('combobox')[1] as HTMLSelectElement;
  const slider = (index: 0 | 1) => screen.getAllByRole('slider')[index] as HTMLInputElement;
  /** The badge sits right beside the model dropdown, inside the same row. */
  const badgeOf = (select: HTMLSelectElement) => select.nextElementSibling as HTMLElement;
  const optionLabels = (select: HTMLSelectElement) => Array.from(select.options).map(o => o.textContent!.trim());
  const optionIds = (select: HTMLSelectElement) => Array.from(select.options).map(o => o.value);
  /** The level text shown beside "Thinking level" for the deep (0) or fast (1) slot. */
  const levelText = (index: 0 | 1) =>
    (screen.getAllByText('Thinking level')[index].nextElementSibling as HTMLElement).textContent!.trim();
  /** The two end labels printed under the slider. */
  const endLabels = (index: 0 | 1) =>
    Array.from(slider(index).nextElementSibling!.children).map(c => c.textContent!.trim());

  async function openOnGemini() {
    const view = await render(ModelSettingsComponent);
    // Fast already runs on Gemini; switch Deep to Gemini through the provider button, as a user does.
    await userEvent.setup().click(screen.getAllByRole('button', { name: 'Google Gemini' })[0]);
    return view;
  }
  const choose = (select: HTMLSelectElement, id: string) => fireEvent.change(select, { target: { value: id } });

  describe('model dropdown contents (FR-6, AC-2)', () => {
    it('Deep slot on Gemini lists exactly Carbon, 3.1 Pro, Hydrogen, 3.8 Flash, in that order', async () => {
      await openOnGemini();
      await vi.waitFor(() => expect(optionLabels(deepSelect())).toEqual(GEMINI_LABELS));
      expect(optionIds(deepSelect())).toEqual(GEMINI_IDS);
    });

    it('Fast slot on Gemini lists exactly the same four, in the same order', async () => {
      await render(ModelSettingsComponent);
      expect(optionLabels(fastSelect())).toEqual(GEMINI_LABELS);
      expect(optionIds(fastSelect())).toEqual(GEMINI_IDS);
    });

    it('neither dropdown, nor any other text on the panel, mentions Gemini 3.7 Flash or Gemini 3.6 Flash', async () => {
      await openOnGemini();
      await vi.waitFor(() => expect(optionLabels(deepSelect())).toEqual(GEMINI_LABELS));
      for (const select of [deepSelect(), fastSelect()]) {
        expect(optionLabels(select)).not.toContain('Gemini 3.7 Flash');
        expect(optionLabels(select)).not.toContain('Gemini 3.6 Flash');
      }
      expect(screen.queryByText(/Gemini 3\.[67] Flash/)).toBeNull();
    });

    it('the two image models are not offered in either dropdown', async () => {
      await openOnGemini();
      await vi.waitFor(() => expect(optionLabels(deepSelect())).toEqual(GEMINI_LABELS));
      for (const select of [deepSelect(), fastSelect()]) {
        expect(optionIds(select)).not.toContain('gemini-3.1-flash-image');
        expect(optionIds(select)).not.toContain('gemini-3-pro-image');
      }
    });
  });

  describe('cost/speed badge text (FR-7, AC-3)', () => {
    it('Deep slot: $$$ for Carbon and 3.1 Pro, $$ ⚡ for Hydrogen, $ ⚡ for 3.8 Flash', async () => {
      await openOnGemini();
      await vi.waitFor(() => expect(deepSelect().value).toBe('gemini-4-carbon'));
      expect(badgeOf(deepSelect()).textContent!.trim()).toBe('$$$');

      choose(deepSelect(), 'gemini-3.1-pro-preview');
      await vi.waitFor(() => expect(badgeOf(deepSelect()).textContent!.trim()).toBe('$$$'));

      choose(deepSelect(), 'gemini-4-hydrogen');
      await vi.waitFor(() => expect(badgeOf(deepSelect()).textContent!.trim()).toBe('$$ ⚡'));

      choose(deepSelect(), 'gemini-3.8-flash');
      await vi.waitFor(() => expect(badgeOf(deepSelect()).textContent!.trim()).toBe('$ ⚡'));
    });

    it('Fast slot: the default gemini-3.8-flash reads $ ⚡, and Hydrogen, Carbon and 3.1 Pro read $$ ⚡, $$$, $$$', async () => {
      await render(ModelSettingsComponent);
      expect(fastSelect().value).toBe('gemini-3.8-flash');
      expect(badgeOf(fastSelect()).textContent!.trim()).toBe('$ ⚡');

      choose(fastSelect(), 'gemini-4-hydrogen');
      await vi.waitFor(() => expect(badgeOf(fastSelect()).textContent!.trim()).toBe('$$ ⚡'));

      choose(fastSelect(), 'gemini-4-carbon');
      await vi.waitFor(() => expect(badgeOf(fastSelect()).textContent!.trim()).toBe('$$$'));

      choose(fastSelect(), 'gemini-3.1-pro-preview');
      await vi.waitFor(() => expect(badgeOf(fastSelect()).textContent!.trim()).toBe('$$$'));
    });

    // Characterization: green before this Story and it must stay green.
    it('the Anthropic badges read exactly as before: $$$ for Sonnet 5.5 and Sonnet 5, $ ⚡ for Haiku 4.5', async () => {
      await render(ModelSettingsComponent);
      expect(deepSelect().value).toBe('claude-sonnet-5-5');
      expect(badgeOf(deepSelect()).textContent!.trim()).toBe('$$$');

      choose(deepSelect(), 'claude-sonnet-5');
      await vi.waitFor(() => expect(badgeOf(deepSelect()).textContent!.trim()).toBe('$$$'));

      choose(deepSelect(), 'claude-haiku-4-5');
      await vi.waitFor(() => expect(badgeOf(deepSelect()).textContent!.trim()).toBe('$ ⚡'));
    });
  });

  describe('badge colour sets (FR-8, AC-3)', () => {
    const AMBER = ['bg-amber-100', 'dark:bg-amber-900/30', 'text-amber-700', 'dark:text-amber-300'];
    const EMERALD = ['bg-emerald-100', 'dark:bg-emerald-900/30', 'text-emerald-700', 'dark:text-emerald-300'];

    /** Class tokens of the Deep badge once the Deep slot (on Gemini) shows `modelId`. One render per test. */
    async function deepBadgeClassesFor(modelId: string): Promise<string[]> {
      await openOnGemini();
      await vi.waitFor(() => expect(optionIds(deepSelect())).toContain(modelId));
      choose(deepSelect(), modelId);
      await vi.waitFor(() => expect(deepSelect().value).toBe(modelId));
      return Array.from(badgeOf(deepSelect()).classList);
    }
    const light = (tokens: string[], colour: string) => tokens.filter(t => !t.startsWith('dark:') && t.includes(`-${colour}-`));
    const dark = (tokens: string[], colour: string) => tokens.filter(t => t.startsWith('dark:') && t.includes(`-${colour}-`));

    it('the balanced (Hydrogen) badge uses a sky set with both a light and a dark variant, and no amber or emerald class', async () => {
      const tokens = await deepBadgeClassesFor('gemini-4-hydrogen');
      expect(light(tokens, 'sky'), tokens.join(' ')).not.toHaveLength(0);
      expect(dark(tokens, 'sky'), tokens.join(' ')).not.toHaveLength(0);
      expect(tokens.filter(t => t.includes('amber') || t.includes('emerald')), tokens.join(' ')).toEqual([]);
    });

    it('the balanced set differs from both the premium (amber) set and the fast (emerald) set', async () => {
      const balanced = await deepBadgeClassesFor('gemini-4-hydrogen');
      for (const token of [...AMBER, ...EMERALD]) expect(balanced, `balanced badge reuses ${token}`).not.toContain(token);
    });

    // Characterization: green before this Story. The premium and fast badges keep their existing class sets.
    it('the premium badge (Gemini 3.1 Pro) keeps its amber set', async () => {
      const premium = await deepBadgeClassesFor('gemini-3.1-pro-preview');
      for (const token of AMBER) expect(premium, `premium badge lacks ${token}`).toContain(token);
      expect(premium.filter(t => t.includes('sky'))).toEqual([]);
    });

    it('the fast badge (Gemini 3.8 Flash) keeps its emerald set', async () => {
      const fast = await deepBadgeClassesFor('gemini-3.8-flash');
      for (const token of EMERALD) expect(fast, `fast badge lacks ${token}`).toContain(token);
      expect(fast.filter(t => t.includes('sky'))).toEqual([]);
    });
  });

  describe('thinking-level control (FR-9, FR-13 UI half, AC-4)', () => {
    it.each(['gemini-4-carbon', 'gemini-4-hydrogen', 'gemini-3.8-flash'])(
      '%s offers exactly Low to High on the Deep slider and never Minimal', async (id) => {
        await openOnGemini();
        await vi.waitFor(() => expect(optionIds(deepSelect())).toEqual(GEMINI_IDS));
        choose(deepSelect(), id);
        await vi.waitFor(() => expect(deepSelect().value).toBe(id));

        expect(slider(0).min).toBe('0');
        expect(slider(0).max).toBe('2');
        expect(endLabels(0)).toEqual(['Low', 'High']);
        expect(screen.queryByText('Minimal')).toBeNull();
      });

    it.each(['gemini-4-carbon', 'gemini-4-hydrogen', 'gemini-3.8-flash'])(
      '%s offers exactly Low to High on the Fast slider and never Minimal', async (id) => {
        await render(ModelSettingsComponent);
        choose(fastSelect(), id);
        await vi.waitFor(() => expect(fastSelect().value).toBe(id));

        expect(slider(1).max).toBe('2');
        expect(endLabels(1)).toEqual(['Low', 'High']);
        expect(screen.queryByText('Minimal')).toBeNull();
      });

    it('selecting Gemini 4 Hydrogen in the Deep dropdown shows High on a full slider; selecting Carbon shows Medium', async () => {
      await openOnGemini();
      await vi.waitFor(() => expect(deepSelect().value).toBe('gemini-4-carbon'));
      expect(levelText(0)).toBe('Medium');

      fireEvent.input(slider(0), { target: { value: '0' } });   // the operator moves the slider to Low first
      await vi.waitFor(() => expect(levelText(0)).toBe('Low'));

      choose(deepSelect(), 'gemini-4-hydrogen');
      await vi.waitFor(() => expect(levelText(0)).toBe('High'));
      expect(slider(0).value).toBe('2');

      fireEvent.input(slider(0), { target: { value: '0' } });
      choose(deepSelect(), 'gemini-4-carbon');
      await vi.waitFor(() => expect(levelText(0)).toBe('Medium'));
      expect(slider(0).value).toBe('1');
    });
  });
});
