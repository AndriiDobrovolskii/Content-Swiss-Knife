import type { AppMode, TabDescriptor } from './types';
import { getStore, bcp47ToTaskCLang } from '../prompt-core/constants';

export interface TabDescriptorLabels {
  /** uiLabels().uaGenerator — label of the single uk-UA description tab in ua-generator mode. */
  uaGenerator: string;
  /** uiLabels().translation — suffix of a translation tab: `${taskKey} ${translation}`. */
  translation: string;
  /** baseOutputLabel() — label of the master `html` tab in Generator mode. */
  baseOutput: string;
  /** baseFaqTabLabel() — label of the master FAQ tab (`faq-html`) in Generator and faq-generator modes. */
  baseFaqTab: string;
}

export interface TabDescriptorContext {
  appMode: AppMode;
  /** Already resolved by the caller as `content().website?.name ?? selectedWebsite()?.name ?? ''`.
   *  Empty string => deriveTabDescriptors returns [] for every mode. */
  storeName: string;
  /** content().mainHtmlLocale. Undefined => the historical "first en-* language" master. */
  mainHtmlLocale: string | undefined;
  /** content().translations; ONLY key presence is read (key = Task C language key, e.g. 'UA'). */
  translations: Readonly<Record<string, string>>;
  /** content().faqArtifacts; ONLY key presence is read (key = BCP-47 ISO). */
  faqArtifacts: Readonly<Record<string, string>> | undefined;
  labels: TabDescriptorLabels;
}

/**
 * Ordered list of output tabs, derived from STORE_REGISTRY language order and the presence of
 * faqArtifacts. Pure: the AppComponent computed gathers the context and delegates here.
 * SEO is rendered separately, always last (added by AppComponent._autoSelectTab).
 */
export function deriveTabDescriptors(ctx: TabDescriptorContext): TabDescriptor[] {
  const { storeName, faqArtifacts, labels } = ctx;
  if (!storeName) return [];

  const store = getStore(storeName);

  // ua-generator: one uk-UA description tab, then a FAQ tab per language that has a FAQ entry.
  // faq-generator: FAQ tabs only. Both list uk-UA first, then the others in STORE_REGISTRY order.
  if (ctx.appMode === 'ua-generator' || ctx.appMode === 'faq-generator') {
    const tabs: TabDescriptor[] = [];
    if (ctx.appMode === 'ua-generator') {
      tabs.push({ id: 'html', label: labels.uaGenerator, type: 'english', color: 'purple', iso: 'uk-UA', isFaq: false });
    }
    if (faqArtifacts?.['uk-UA']) {
      tabs.push({
        id: 'faq-html',
        label: ctx.appMode === 'ua-generator' ? 'FAQ' : labels.baseFaqTab,
        type: 'faq-english', color: 'green', iso: 'uk-UA', isFaq: true,
      });
    }
    for (const iso of store.languages) {
      if (iso === 'uk-UA') continue;
      if (!faqArtifacts?.[iso]) continue;
      const taskKey = bcp47ToTaskCLang(iso, store.group);
      tabs.push({ id: `faq-trans-${iso}`, label: `${taskKey} FAQ`, type: 'faq-translation', color: 'green', iso, taskKey, isFaq: true });
    }
    return tabs;
  }

  // The master locale for THIS generated content. Falls back to the store's first en-*
  // language (historical default) for content generated before mainHtmlLocale was tracked,
  // e.g. SEO-only/Slug-only runs where mainHtmlUa is empty anyway.
  const masterIso = ctx.mainHtmlLocale ?? store.languages.find(iso => iso.startsWith('en-')) ?? store.languages[0];

  const tabs: TabDescriptor[] = [];

  for (const iso of store.languages) {
    if (iso === masterIso) {
      tabs.push({ id: 'html', label: labels.baseOutput, type: 'english', color: 'blue', iso, isFaq: false });
      if (faqArtifacts?.[iso]) {
        tabs.push({ id: 'faq-html', label: labels.baseFaqTab, type: 'faq-english', color: 'green', iso, isFaq: true });
      }
      continue;
    }

    const taskKey = bcp47ToTaskCLang(iso, store.group);
    if (!ctx.translations[taskKey]) continue;

    tabs.push({ id: `trans-${taskKey}`, label: `${taskKey} ${labels.translation}`, type: 'translation', color: 'purple', iso, taskKey, isFaq: false });
    if (faqArtifacts?.[iso]) {
      tabs.push({ id: `faq-trans-${iso}`, label: `${taskKey} FAQ`, type: 'faq-translation', color: 'green', iso, taskKey, isFaq: true });
    }
  }

  return tabs;
}
