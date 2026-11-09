/**
 * US-10.5 T22 - StudioCompareSliderComponent: the before/after slider (FR-10 (+ Proposed OD-9), AC-5; plan DD-10).
 *
 * Component runner. happy-dom has no layout, so pointer drag, the clip geometry and the mismatched-size frame are NOT asserted here (they are
 * T42 evidence); what a user and a screen reader can observe IS: the role, the value, the keys, the labels and the two images.
 *
 * PINNED CONTRACT (owner T22; standalone, OnPush, signals):
 *   inputs: lang (required), before = { number: number; src: string; alt: string }, after = { number: number; src: string; alt: string }  (both required)
 *   one element with role="slider", focusable (tabindex 0), aria-valuemin=0, aria-valuemax=100, aria-valuenow, accessible name X-42;
 *   start 50; ArrowLeft / ArrowRight -/+5 clamped to 0..100; Home -> 0; End -> 100;
 *   visible labels "Before (v{N})" (X-35) and "After (v{M})" (X-36); both images are <img> elements carrying `object-contain` (fitted, uncropped).
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/angular';
import { StudioCompareSliderComponent } from './studio-compare-slider.component';
import { renderStudio, t } from '../../../../../test/image-studio/helpers/studio-render';

const SRC_A = 'data:image/png;base64,AAAA';
const SRC_B = 'data:image/png;base64,BBBB';
const inputs = { before: { number: 1, src: SRC_A, alt: 'before alt' }, after: { number: 3, src: SRC_B, alt: 'after alt' } };
const slider = () => screen.getByRole('slider');
const now = () => Number(slider().getAttribute('aria-valuenow'));

describe('FR-10: the slider role, range, name and start value (T22)', () => {
  it('is a focusable role="slider" named X-42 with range 0..100 starting at 50', async () => {
    await renderStudio(StudioCompareSliderComponent, { inputs });
    const s = slider();
    expect(s.getAttribute('aria-valuemin')).toBe('0');
    expect(s.getAttribute('aria-valuemax')).toBe('100');
    expect(now()).toBe(50);
    expect(s.tabIndex).toBe(0);
    expect(screen.getByRole('slider', { name: t('X-42', 'en') })).toBe(s);
  });

  it('there is exactly one slider', async () => {
    await renderStudio(StudioCompareSliderComponent, { inputs });
    expect(screen.getAllByRole('slider')).toHaveLength(1);
  });

  it('the accessible name follows the language (uk)', async () => {
    await renderStudio(StudioCompareSliderComponent, { lang: 'uk', inputs });
    expect(screen.getByRole('slider', { name: t('X-42', 'uk') })).toBeDefined();
  });
});

describe('FR-10: keyboard operation (T22)', () => {
  it('ArrowRight raises aria-valuenow by 5 and ArrowLeft lowers it by 5', async () => {
    const h = await renderStudio(StudioCompareSliderComponent, { inputs });
    slider().focus();
    await h.user.keyboard('{ArrowRight}');
    expect(now()).toBe(55);
    await h.user.keyboard('{ArrowRight}{ArrowRight}');
    expect(now()).toBe(65);
    await h.user.keyboard('{ArrowLeft}');
    expect(now()).toBe(60);
  });

  it('Home sets the minimum (0) and End sets the maximum (100)', async () => {
    const h = await renderStudio(StudioCompareSliderComponent, { inputs });
    slider().focus();
    await h.user.keyboard('{Home}');
    expect(now()).toBe(0);
    await h.user.keyboard('{End}');
    expect(now()).toBe(100);
  });

  it('the value is clamped: ArrowLeft at 0 stays 0, ArrowRight at 100 stays 100', async () => {
    const h = await renderStudio(StudioCompareSliderComponent, { inputs });
    slider().focus();
    await h.user.keyboard('{Home}{ArrowLeft}{ArrowLeft}');
    expect(now()).toBe(0);
    await h.user.keyboard('{End}{ArrowRight}{ArrowRight}');
    expect(now()).toBe(100);
  });

  it('a step that would overshoot is clamped to the bound (97 + 5 stays within 0..100)', async () => {
    const h = await renderStudio(StudioCompareSliderComponent, { inputs });
    slider().focus();
    await h.user.keyboard('{End}{ArrowLeft}'); // 95
    await h.user.keyboard('{ArrowRight}{ArrowRight}');
    expect(now()).toBe(100);
  });

  it('an unrelated key changes nothing', async () => {
    const h = await renderStudio(StudioCompareSliderComponent, { inputs });
    slider().focus();
    await h.user.keyboard('a{Tab}');
    expect(now()).toBe(50);
  });
});

describe('FR-10: the two images and their labels (T22)', () => {
  it('shows "Before (v1)" and "After (v3)" in English', async () => {
    await renderStudio(StudioCompareSliderComponent, { inputs });
    expect(screen.getByText('Before (v1)')).toBeDefined();
    expect(screen.getByText('After (v3)')).toBeDefined();
  });

  it('shows "До (v1)" and "Після (v3)" under uk', async () => {
    await renderStudio(StudioCompareSliderComponent, { lang: 'uk', inputs });
    expect(screen.getByText('До (v1)')).toBeDefined();
    expect(screen.getByText('Після (v3)')).toBeDefined();
  });

  it('draws both images, source first, fitted uncropped (object-contain) in one frame', async () => {
    const h = await renderStudio(StudioCompareSliderComponent, { inputs });
    const imgs = Array.from(h.view.container.querySelectorAll('img'));
    expect(imgs.map((i) => i.getAttribute('src'))).toEqual([SRC_A, SRC_B]);
    for (const img of imgs) expect(img.className).toContain('object-contain');
  });
});
