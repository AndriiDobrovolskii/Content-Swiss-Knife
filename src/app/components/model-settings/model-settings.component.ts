import { Component, ChangeDetectionStrategy, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModelSettingsService } from '../../../services/model-settings.service';
import { ModelSpec, ProviderId, ThinkingLevel } from '../../../prompt-core/model-catalog';

const LABELS = {
  en: {
    title: 'AI Model Settings',
    close: 'Close',
    provider: 'Provider',
    deepTitle: 'Deep Thinking Slot',
    deepCaption: 'Complex work: page structure, the base description',
    fastTitle: 'Fast Slot',
    fastCaption: 'Translations, SEO metadata, formatting',
    model: 'Model',
    thinking: 'Thinking level',
    noThinking: 'This model runs without thinking',
    highWarning: 'High noticeably increases response time and API cost.',
    slotHint: '“Deep Thinking Mode” in each tool chooses which slot runs.',
    reset: 'Reset to defaults',
    done: 'Done',
    levels: { disabled: 'Disabled', minimal: 'Minimal', low: 'Low', medium: 'Medium', high: 'High' },
  },
  uk: {
    title: 'Налаштування моделі ШІ',
    close: 'Закрити',
    provider: 'Провайдер',
    deepTitle: 'Слот глибокого мислення',
    deepCaption: 'Складні задачі: структура сторінки, базовий опис',
    fastTitle: 'Швидкий слот',
    fastCaption: 'Переклади, SEO-метадані, форматування',
    model: 'Модель',
    thinking: 'Рівень мислення',
    noThinking: 'Ця модель працює без мислення',
    highWarning: 'High помітно збільшує час відповіді та вартість запиту.',
    slotHint: '«Deep Thinking Mode» у кожному інструменті обирає, який слот запускати.',
    reset: 'Скинути до типових',
    done: 'Готово',
    levels: { disabled: 'Вимкнено', minimal: 'Мінімальний', low: 'Низький', medium: 'Середній', high: 'Високий' },
  },
} as const;

@Component({
  selector: 'app-model-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './model-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelSettingsComponent {
  lang = input<'en' | 'uk'>('en');
  closed = output<void>();

  settings = inject(ModelSettingsService);
  labels = computed(() => LABELS[this.lang()]);

  levelLabel(level: ThinkingLevel): string {
    return this.labels().levels[level] ?? level;
  }

  /** Advisory cost/speed hint. Does not restrict which slot a model may go in. */
  tierBadge(spec: ModelSpec | undefined): string {
    return spec?.tier === 'premium' ? '$$$' : '$ ⚡';
  }

  tierBadgeClass(spec: ModelSpec | undefined): string {
    return spec?.tier === 'premium'
      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
  }

  setDeepProvider(id: ProviderId) { this.settings.setDeepProvider(id); }
  setFastProvider(id: ProviderId) { this.settings.setFastProvider(id); }

  /** The slider works on indices into the model's own `levels`, so it auto-sizes: 4 steps for
   *  Gemini 3.6 Flash, 3 for Gemini 3.1 Pro (which has no Minimal), 1 for Haiku. */
  deepIndex = computed(() => this.indexOf(this.settings.deepSpec(), this.settings.deepLevel()));
  fastIndex = computed(() => this.indexOf(this.settings.fastSpec(), this.settings.fastLevel()));

  onDeepSlide(raw: string) {
    const levels = this.settings.deepSpec()?.levels ?? [];
    const next = levels[Number(raw)];
    if (next) this.settings.setDeepLevel(next);
  }

  onFastSlide(raw: string) {
    const levels = this.settings.fastSpec()?.levels ?? [];
    const next = levels[Number(raw)];
    if (next) this.settings.setFastLevel(next);
  }

  private indexOf(spec: ModelSpec | undefined, level: ThinkingLevel): number {
    const i = spec?.levels.indexOf(level) ?? -1;
    return i === -1 ? 0 : i;
  }
}
