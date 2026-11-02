/**
 * US-10.1 T47 (guard, FR-72, AC-44 "retrievable" half, C11): the cost dashboard keeps its old buckets and totals when
 * Image Studio usage rows are mixed in, and shows the `image-studio|<preset>|<resolution>` bucket.
 *
 * GREEN ON ARRIVAL by design: the dashboard code is NOT changed by this Story (FR-72, OD-35) - this spec pins that
 * the additive change stays additive. It is the only automated check of that property (plan Silent-failure risk 4).
 *
 * Component runner (`ng test`): the dashboard is rendered with the real UsageService over an HttpTestingController,
 * not a stub of the component. Costs are hand-written numbers, not copied from a run.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/angular';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { DashboardComponent } from './dashboard.component';

interface Row {
  id: number; ts: number; provider: string; model: string; mode: string | null; taskLabel: string | null;
  productName: string | null; store: string | null; lang: string | null;
  inputTokens: number; outputTokens: number; cacheWriteTokens: number; cacheReadTokens: number; costUsd: number;
}

const row = (id: number, over: Partial<Row>): Row => ({
  id, ts: 1_700_000_000_000 + id, provider: 'anthropic', model: 'claude-sonnet-5-5', mode: 'creative',
  taskLabel: 'Doc (base)', productName: 'Bambu X1C', store: 'EXPERT3D', lang: 'uk-UA',
  inputTokens: 1000, outputTokens: 500, cacheWriteTokens: 0, cacheReadTokens: 0, costUsd: 0.25, ...over,
});

const OLD_ROWS: Row[] = [
  row(1, { taskLabel: 'Doc (base)', costUsd: 0.25 }),
  row(2, { taskLabel: 'Doc (base)', costUsd: 0.25 }),
  row(3, { taskLabel: 'Translate', costUsd: 0.5, model: 'claude-haiku-4-5' }),
];
const IMAGE_ROWS: Row[] = [
  row(4, {
    provider: 'gemini', model: 'gemini-3.1-flash-image', mode: null, taskLabel: 'image-studio|white-bg|2K',
    productName: null, store: null, lang: null, costUsd: 0.03,
  }),
  row(5, {
    provider: 'gemini', model: 'gemini-3.1-flash-image', mode: null, taskLabel: 'image-studio|white-bg|2K',
    productName: null, store: null, lang: null, costUsd: 0.03,
  }),
];

async function renderWith(rows: Row[]) {
  const view = await render(DashboardComponent, { providers: [provideHttpClient(), provideHttpClientTesting()] });
  const http = TestBed.inject(HttpTestingController);
  http.expectOne((r) => r.url === '/api/usage').flush({ rows });
  await view.fixture.whenStable();
  view.detectChanges();
  return view;
}

/** The "By Task" card: its heading's parent element. */
const byTaskCard = () => screen.getByText('By Task').parentElement as HTMLElement;
/** The bucket line of one task label inside the "By Task" card. */
const bucket = (label: string) => within(byTaskCard()).getByText(label).parentElement as HTMLElement;

describe('FR-72 / AC-44: dashboard with mixed old and image-studio rows', () => {
  beforeEach(() => localStorage.clear());

  /** Hand-written expectations for the two OLD buckets (cost 0.25 + 0.25, and 0.5): identical in both renders below. */
  const OLD_BUCKETS = { 'Doc (base)': '2×$0.5000', Translate: '1×$0.5000' };
  const lineOf = (label: string) => bucket(label).textContent!.replace(/\s+/g, ' ').replace(label, '').trim();

  it('FR-72: with only the old rows the task buckets show their count and cost (premise of the next test)', async () => {
    await renderWith(OLD_ROWS);
    expect(lineOf('Doc (base)')).toBe(OLD_BUCKETS['Doc (base)']);
    expect(lineOf('Translate')).toBe(OLD_BUCKETS.Translate);
  });

  it('FR-72: old task buckets show exactly the same count and cost when image-studio rows are mixed in', async () => {
    await renderWith([...OLD_ROWS, ...IMAGE_ROWS]);
    expect(lineOf('Doc (base)')).toBe(OLD_BUCKETS['Doc (base)']);
    expect(lineOf('Translate')).toBe(OLD_BUCKETS.Translate);
  });

  it('FR-72 / AC-44: the image-studio|white-bg|2K bucket is present with its own count and cost', async () => {
    await renderWith([...OLD_ROWS, ...IMAGE_ROWS]);
    const line = bucket('image-studio|white-bg|2K').textContent!.replace(/\s+/g, ' ');
    expect(line).toContain('2×');
    expect(line).toContain('$0.0600');
  });

  it('FR-72: the grand total is the old total plus the image-studio rows (additive, nothing re-weighted)', async () => {
    await renderWith([...OLD_ROWS, ...IMAGE_ROWS]);
    const totalCard = screen.getByText('Total Cost').parentElement as HTMLElement;
    expect(totalCard.textContent).toContain('$1.0600');
    expect(totalCard.textContent).toContain('5 requests');
  });
});
