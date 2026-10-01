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
import { describe, it, expect, beforeEach } from 'vitest';
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
