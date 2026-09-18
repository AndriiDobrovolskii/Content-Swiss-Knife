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
import { render, screen } from '@testing-library/angular';
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
