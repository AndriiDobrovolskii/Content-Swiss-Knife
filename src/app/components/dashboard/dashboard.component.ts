import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsageService, UsageRecord } from '../../../services/usage.service';

interface Breakdown { label: string; cost: number; colorClass: string; barClass: string; }
interface GroupRow { key: string; count: number; cost: number; }

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const LABELS = {
  en: {
    title: 'Cost Dashboard', subtitle: 'Actual Anthropic API spend, per request',
    refresh: 'Refresh', loading: 'Loading…', empty: 'No requests in this range.',
    from: 'From', to: 'To', store: 'Store', task: 'Task', product: 'Product', allStores: 'All stores', allTasks: 'All tasks',
    productPlaceholder: 'Search product…',
    totalCost: 'Total Cost', requests: 'requests',
    inputTokens: 'Input Tokens', outputTokens: 'Output Tokens', cacheWrite: 'Cache Write', cacheRead: 'Cache Read',
    costBreakdown: 'Cost Breakdown', byModel: 'By Model', byTask: 'By Task',
    entries: 'Requests', totalRow: 'TOTAL',
    colModel: 'Model', colTask: 'Task', colProduct: 'Product', colStore: 'Store', colLang: 'Lang',
    colIn: 'Input', colOut: 'Output', colCw: 'Cache W', colCr: 'Cache R', colCost: 'Cost', colWhen: 'When',
  },
  uk: {
    title: 'Дашборд витрат', subtitle: 'Реальні витрати на Anthropic API, по кожному запиту',
    refresh: 'Оновити', loading: 'Завантаження…', empty: 'Немає запитів за цей період.',
    from: 'Від', to: 'До', store: 'Магазин', task: 'Задача', product: 'Продукт', allStores: 'Усі магазини', allTasks: 'Усі задачі',
    productPlaceholder: 'Пошук продукту…',
    totalCost: 'Загальна вартість', requests: 'запитів',
    inputTokens: 'Input токени', outputTokens: 'Output токени', cacheWrite: 'Cache Write', cacheRead: 'Cache Read',
    costBreakdown: 'Розбивка вартості', byModel: 'По моделях', byTask: 'По задачах',
    entries: 'Запити', totalRow: 'РАЗОМ',
    colModel: 'Модель', colTask: 'Задача', colProduct: 'Продукт', colStore: 'Магазин', colLang: 'Мова',
    colIn: 'Input', colOut: 'Output', colCw: 'Cache W', colCr: 'Cache R', colCost: 'Вартість', colWhen: 'Коли',
  },
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private usageService = inject(UsageService);

  lang = input<'en' | 'uk'>('en');

  t = computed(() => LABELS[this.lang()]);

  allRecords = signal<UsageRecord[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  fromDate = signal(toDateInputValue(new Date(Date.now() - 30 * DAY_MS)));
  toDate = signal(toDateInputValue(new Date()));
  storeFilter = signal('');
  taskFilter = signal('');
  productFilter = signal('');

  stores = computed(() => Array.from(new Set(this.allRecords().map(r => r.store).filter((s): s is string => !!s))).sort());
  taskLabels = computed(() => Array.from(new Set(this.allRecords().map(r => r.taskLabel).filter((s): s is string => !!s))).sort());

  filteredRecords = computed(() => {
    const store = this.storeFilter();
    const task = this.taskFilter();
    const product = this.productFilter().trim().toLowerCase();
    return this.allRecords().filter(r =>
      (!store || r.store === store) &&
      (!task || r.taskLabel === task) &&
      (!product || (r.productName || '').toLowerCase().includes(product))
    );
  });

  totals = computed(() => {
    const rows = this.filteredRecords();
    const acc = { inTok: 0, outTok: 0, cwTok: 0, crTok: 0, cost: 0 };
    for (const r of rows) {
      acc.inTok += r.inputTokens;
      acc.outTok += r.outputTokens;
      acc.cwTok += r.cacheWriteTokens;
      acc.crTok += r.cacheReadTokens;
      acc.cost += r.costUsd;
    }
    return acc;
  });

  // Token-type costs aren't stored per-type, only the combined cost per row — approximate
  // the breakdown proportionally to token share so the bars stay informative without a
  // second pricing lookup on the client.
  breakdown = computed<Breakdown[]>(() => {
    const rows = this.filteredRecords();
    let inCost = 0, outCost = 0, cwCost = 0, crCost = 0;
    for (const r of rows) {
      const totalTok = r.inputTokens + r.outputTokens + r.cacheWriteTokens + r.cacheReadTokens || 1;
      inCost += r.costUsd * (r.inputTokens / totalTok);
      outCost += r.costUsd * (r.outputTokens / totalTok);
      cwCost += r.costUsd * (r.cacheWriteTokens / totalTok);
      crCost += r.costUsd * (r.cacheReadTokens / totalTok);
    }
    return [
      { label: this.t().inputTokens, cost: inCost, colorClass: 'text-blue-500 dark:text-blue-400', barClass: 'bg-blue-500' },
      { label: this.t().outputTokens, cost: outCost, colorClass: 'text-emerald-500 dark:text-emerald-400', barClass: 'bg-emerald-500' },
      { label: this.t().cacheWrite, cost: cwCost, colorClass: 'text-amber-500 dark:text-amber-400', barClass: 'bg-amber-500' },
      { label: this.t().cacheRead, cost: crCost, colorClass: 'text-pink-500 dark:text-pink-400', barClass: 'bg-pink-500' },
    ];
  });

  maxBreakdownCost = computed(() => Math.max(...this.breakdown().map(b => b.cost), 0.000001));

  byModel = computed<GroupRow[]>(() => this.groupBy(this.filteredRecords(), r => r.model));
  byTask = computed<GroupRow[]>(() => this.groupBy(this.filteredRecords(), r => r.taskLabel || '—'));

  maxModelCost = computed(() => Math.max(...this.byModel().map(g => g.cost), 0.000001));
  maxTaskCost = computed(() => Math.max(...this.byTask().map(g => g.cost), 0.000001));

  private groupBy(rows: UsageRecord[], keyFn: (r: UsageRecord) => string): GroupRow[] {
    const map = new Map<string, GroupRow>();
    for (const r of rows) {
      const key = keyFn(r);
      const existing = map.get(key) ?? { key, count: 0, cost: 0 };
      existing.count++;
      existing.cost += r.costUsd;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
  }

  ngOnInit() {
    this.refresh();
  }

  async refresh() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const from = new Date(`${this.fromDate()}T00:00:00`).getTime();
      const to = new Date(`${this.toDate()}T23:59:59.999`).getTime();
      this.allRecords.set(await this.usageService.fetch({ from, to }));
    } catch (e: any) {
      this.error.set(e?.error?.error || e?.message || 'Failed to load usage data');
    } finally {
      this.loading.set(false);
    }
  }

  modelBadgeClass(model: string): string {
    const m = model.toLowerCase();
    if (m.includes('opus')) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    if (m.includes('haiku')) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
    return 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300';
  }

  fmtTokens(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return n.toLocaleString();
  }

  fmtCost(c: number): string {
    if (c < 0.01) return '$' + c.toFixed(6);
    return '$' + c.toFixed(4);
  }

  fmtWhen(ts: number): string {
    return new Date(ts).toLocaleString();
  }
}
