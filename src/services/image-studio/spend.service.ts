import { Injectable, inject, signal } from '@angular/core';
import { sumImageStudioSpend, utcMonthStart } from '../../utils/image-studio/spend';
import { UsageService } from '../usage.service';
import { CLOCK_PORT } from './image-studio.tokens';

/**
 * What the header may show (US-10.6 T14, FR-18 (c), (d), AC-12). A figure exists only in the 'ready' state; 'loading' and
 * 'error' carry none, so a pending or failed request can never read as `$0.00` (OD-13).
 */
export type SpendState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; today: number; month: number };

/**
 * The Image Studio spend for the current UTC day and UTC month (US-10.6 FR-18, FR-19), read from the existing
 * `GET /api/usage` through `UsageService` and selected on the client (OD-3 a).
 *
 * This service NEVER fetches on its own: nothing here runs a request at construction. The `image-studio` container owns
 * both triggers (once on open, again after an action that ended with an image) and calls `refresh()` (plan 12, N-4).
 * "Now" comes from the injected `CLOCK_PORT`, never the host clock.
 */
@Injectable({ providedIn: 'root' })
export class SpendService {
  private readonly usage = inject(UsageService);
  private readonly clock = inject(CLOCK_PORT);

  private readonly stateSignal = signal<SpendState>({ kind: 'loading' });
  /** Start of the newest request; an older request that finishes later is ignored. */
  private latestRequest = 0;

  /** The current figures state. No `today` / `month` key exists unless `kind` is 'ready'. */
  readonly state = this.stateSignal.asReadonly();

  /**
   * One `UsageService.fetch({ from: <UTC month start> })`; today and month are derived from that one result. Never
   * throws: a failed fetch ends in the 'error' state with no figure, and an earlier figure is dropped, not kept stale.
   */
  async refresh(): Promise<void> {
    const request = ++this.latestRequest;
    const nowMs = this.clock.now();
    this.stateSignal.set({ kind: 'loading' });
    try {
      const rows = await this.usage.fetch({ from: utcMonthStart(nowMs) });
      if (request !== this.latestRequest) return;
      const { today, month } = sumImageStudioSpend(rows, nowMs);
      this.stateSignal.set({ kind: 'ready', today, month });
    } catch {
      if (request !== this.latestRequest) return;
      this.stateSignal.set({ kind: 'error' });
    }
  }
}
