import { Injectable, signal, inject } from '@angular/core';
import { LlmService } from './llm.service';
import { RetrievalService } from './retrieval.service';
import { HistoryService } from '@/src/services/history.service';
import { ProductInput, GeneratedContent, WebsiteOption } from '../app/types';
import { cleanHtmlStructure, stripCodeFences } from '../utils/html-cleaner';
import { wrapVideoFigures } from '../utils/video-figure';
import { wrapImageFigures } from '../utils/image-figure';
import { fixNumberFormatting } from '../utils/number-format-fixer';
import { validateGeneratedHtml, validateSeoMetadata, ValidationIssue } from '../utils/output-validator';
import { validateSpecsGrounding } from '../utils/specs-grounding';
import { validateSlugs } from '../utils/slug-validator';
import { buildPromptA } from '../prompts/task-a';
import { buildPromptB } from '../prompts/task-b';
import { buildPromptSlug } from '../prompts/task-slug';
import { normalizeSlug, ensureUniqueSlugs, slugsToLocalizedNames } from '../prompt-core/slug-utils';
import { getStore, getLangsForStore, isoToHumanLang, taskLangToIso, isExpert3dStore, buildNativeLangOverlay } from '../prompt-core/constants';
import { buildPromptC } from '../prompts/task-c';
import { buildPromptFaq } from '../prompts/task-faq';
import { buildOptimizerPrompt } from '../prompts/optimizer';
import { buildReadabilityPrompt } from '../prompts/readability';
import { buildKeywordsPrompt } from '../prompts/keywords';
import { buildImageAltPrompt } from '../prompts/image-alt';
import { buildCopywriterPrompt } from '../prompts/copywriter';
import { sortUkrainianFirst } from '../utils/locale-sort';
import { SlugResponse } from '../app/types';
import { runRepairGate, appendRepairFeedback } from '../utils/repair-gate';
import { trimConsumablesToLimit } from '../utils/consumables-trim';
import { PromptPayload } from '../prompt-core/payload';

// ── Orchestrator ────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class ContentOrchestratorService {
  private llm = inject(LlmService);
  private retrieval = inject(RetrievalService);
  private historyService = inject(HistoryService);

  // State signals
  isGenerating = signal(false);
  progressMessage = signal('');

  suggestedKeywords = signal<string[]>([]);
  isSuggestingKeywords = signal(false);

  content = signal<GeneratedContent>({
    mainHtmlEn: '',
    translations: {},
    seoData: null,
    slugData: null
  });

  optimizerOutput = signal<string>('');
  translatorOutput = signal<string>('');
  copywriterOutput = signal<string>('');
  readabilityScore = signal<any | null>(null);

  // Post-generation acceptance-criteria check results (see output-validator.ts).
  validationIssues = signal<ValidationIssue[]>([]);
  maxRepairs = signal(1);

  /** Tracks the product+store key of the last successfully generated slug, so the main
   *  pipeline and standalone SEO can reuse the localized names without a second LLM call.
   *  Key format: "${website.name}::${name.trim()}". Cleared implicitly on mismatch. */
  private approvedSlugKey = signal<string | null>(null);
  private slugKey(input: ProductInput): string {
    return `${input.website.name}::${input.name.trim()}`;
  }

  async generate(input: ProductInput, useThinking = false): Promise<void> {
    // Reuse an editor-approved slug ONLY when it was approved for THIS exact product+store
    // (from a prior standalone Slug run); otherwise start clean. This makes the approved
    // localized name authoritative across H1/title/URL without ever reusing a stale name.
    const reusedSlug = this.approvedSlugKey() === this.slugKey(input) ? this.content().slugData ?? null : null;
    this.content.set({ mainHtmlEn: '', translations: {}, seoData: null, slugData: reusedSlug, website: input.website, faqArtifacts: {} });
    this.validationIssues.set([]);

    const isConsumables = input.templateId === 'consumables-resin';
    const repairBudget = isConsumables ? 2 : this.maxRepairs();

    await this.withProgress(async () => {
      const { seoLangs, transLangs } = getLangsForStore(input.website.name);

      // Step 1 — Generate base English HTML (with one repair attempt on hard errors)
      this.progressMessage.set(useThinking ? 'Generating HTML Description (Deep Thinking)…' : 'Generating HTML Description…');
      const basePayloadA = buildPromptA(input);
      const produceHtmlA = async (payload: PromptPayload): Promise<string> => {
        let html = await this.llm.generateText(payload, useThinking);
        html = stripCodeFences(html);
        html = wrapVideoFigures(html, input.name);
        html = wrapImageFigures(html);
        html = fixNumberFormatting(html);
        return html;
      };
      const { artifact: htmlEn, finalIssues: htmlIssues, repairsUsed: aRepairs } = await runRepairGate<string>({
        label: 'HTML (base)',
        maxRepairs: repairBudget,
        basePayload: basePayloadA,
        produce: produceHtmlA,
        validate: html => [
          ...validateGeneratedHtml(html, 'HTML (base)', input.name, undefined, { templateId: input.templateId }),
          ...validateSpecsGrounding(html, input.specs, 'HTML (base)'),
        ],
        withFeedback: appendRepairFeedback,
        onAttempt: (n, c) =>
          this.progressMessage.set(`Repairing HTML (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
      });
      if (aRepairs > 0) console.info(`[repair-gate] HTML (base): ${aRepairs} repair(s) applied`);
      const finalHtmlEn = isConsumables ? trimConsumablesToLimit(htmlEn) : htmlEn;
      this.content.update(c => ({ ...c, mainHtmlEn: finalHtmlEn }));
      this.validationIssues.set(
        isConsumables
          ? validateGeneratedHtml(finalHtmlEn, 'HTML (base)', input.name, undefined, { templateId: input.templateId })
          : htmlIssues,
      );

      // Step 2 — SEO slugs FIRST. The localized `name` per locale is the single source of
      // truth for the storefront product-name field (→ H1) AND the Task B title core.
      // Reuse an editor-approved slug if present for THIS product+store; else generate.
      // Non-blocking either way: a slug failure must not abort SEO/translations/FAQ.
      let localizedNames: Record<string, string> | undefined;
      if (reusedSlug?.slugs?.length) {
        localizedNames = slugsToLocalizedNames(reusedSlug.slugs);
      } else {
        try {
          this.progressMessage.set(`Generating SEO slugs for ${seoLangs.join(', ')}…`);
          const promptSlug = buildPromptSlug(input.website.name, input.name, seoLangs, htmlEn);
          const rawSlug = await this.llm.generateJson<SlugResponse>(promptSlug, useThinking);
          const slugData = this.normalizeSlugResponse(rawSlug);
          this.content.update(c => ({ ...c, slugData }));
          this.approvedSlugKey.set(this.slugKey(input));
          localizedNames = slugsToLocalizedNames(slugData.slugs);
        } catch (e) {
          console.warn('[Slugs] Generation failed; SEO H1 falls back to formula.', e);
          this.validationIssues.update(issues => [
            ...issues,
            { severity: 'warning', rule: 'slug-generation-failed', detail: 'Slug generation failed — H1 and meta_title fall back to the English formula for all locales. Re-run Slug separately or regenerate.', context: 'Slugs' },
          ]);
        }
      }

      // Step 3 — Generate SEO Metadata. Localized names (if any) are consumed VERBATIM as
      // h1 + title core; HTML context still feeds meta_description's hard spec.
      this.progressMessage.set(`Generating SEO Metadata for ${seoLangs.join(', ')}…`);
      const promptB = buildPromptB(input.website.name, input.name, seoLangs, htmlEn, localizedNames);
      const { artifact: seoJson, repairsUsed: bRepairs } = await runRepairGate({
        label: 'SEO metadata',
        maxRepairs: this.maxRepairs(),
        basePayload: promptB,
        produce: (payload) => this.llm.generateJson(payload, useThinking),
        validate: (json) => validateSeoMetadata(json, ''),
        withFeedback: appendRepairFeedback,
        onAttempt: (n, c) =>
          this.progressMessage.set(`Repairing SEO metadata (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
      });
      if (bRepairs > 0) console.info(`[repair-gate] SEO metadata: ${bRepairs} repair(s) applied`);
      this.content.update(c => ({ ...c, seoData: seoJson }));

      // Step 4 — Native per-language generation (Ukrainian always first). Each target language is
      // generated directly via Task A (buildPromptA with a baseLanguageOverride), NOT translated
      // from finalHtmlEn — mirrors generateUaContent()'s native path, generalized to every target
      // language. Kept sequential (not Promise.all): matches every other loop in this pipeline,
      // and avoids tripping provider rate limits since native generation is a heavier call than
      // translation was.
      const sortedTransLangs = [...transLangs].sort(sortUkrainianFirst);
      for (const lang of sortedTransLangs) {
        const locale = taskLangToIso(lang, input.website.name);
        const humanLang = isoToHumanLang(locale);
        const baseLanguageOverride = `${humanLang} (${locale})`;
        const isExpert3d = isExpert3dStore(input.website.name);

        this.progressMessage.set(`Generating ${lang} description…`);

        const langInput: ProductInput = {
          ...input,
          customInstructions: [
            input.customInstructions?.trim(),
            buildNativeLangOverlay(lang, humanLang, input.website.name),
          ].filter(Boolean).join('\n\n'),
        };
        const basePayloadLang = buildPromptA(langInput, baseLanguageOverride);
        const { artifact: htmlLang, repairsUsed: langRepairs } = await runRepairGate<string>({
          label: `HTML (${lang})`,
          maxRepairs: repairBudget,
          basePayload: basePayloadLang,
          produce: async (payload) => {
            let html = await this.llm.generateText(payload, useThinking);
            html = stripCodeFences(html);
            html = wrapVideoFigures(html, input.name);
            if (isExpert3d && (lang === 'ES' || lang === 'PT')) {
              html = this.applySpanishExpert3dReplacements(html);
            }
            html = wrapImageFigures(html);
            return fixNumberFormatting(html);
          },
          validate: (html) => [
            ...validateGeneratedHtml(html, `HTML (${lang})`, input.name, locale, { templateId: input.templateId }),
            ...validateSpecsGrounding(html, input.specs, `HTML (${lang})`),
          ],
          withFeedback: appendRepairFeedback,
          onAttempt: (n, c) =>
            this.progressMessage.set(`Repairing ${lang} description (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
        });
        if (langRepairs > 0) console.info(`[repair-gate] HTML (${lang}): ${langRepairs} repair(s) applied`);
        const finalLangHtml = isConsumables ? trimConsumablesToLimit(htmlLang) : htmlLang;
        this.content.update(c => ({
          ...c,
          translations: { ...c.translations, [lang]: finalLangHtml }
        }));
      }

      // Step 5 — FAQ artifacts (schema-free, for Journal theme native module fields).
      // Optional: runs only when Supplemental Content is supplied. Description and specs
      // are still passed to the builder as grounding context, but they do not trigger it.
      if (input.supplementalContent?.trim()) {
        const store = getStore(input.website.name);
        for (const isoCode of store.languages) {
          const humanLang = isoToHumanLang(isoCode);

          this.progressMessage.set(`Generating FAQ artifact (${isoCode})…`);
          const basePayloadFaq = buildPromptFaq(
            input.name, input.description, input.specs,
            input.supplementalContent ?? '', humanLang, store.currencySymbol,
          );
          const validateFaqHtml = (html: string): ValidationIssue[] => {
            const issues = validateGeneratedHtml(html, `FAQ (${isoCode})`, input.name, isoCode);
            if (html && !html.trim().startsWith('<')) {
              issues.push({
                severity: 'error', rule: 'non-html-output',
                detail: 'Output is not HTML (does not start with "<").',
                context: `FAQ (${isoCode})`,
              });
            }
            return issues;
          };
          const { artifact: faqHtml, repairsUsed: faqRepairs } = await runRepairGate<string>({
            label: `FAQ (${isoCode})`,
            maxRepairs: this.maxRepairs(),
            basePayload: basePayloadFaq,
            produce: async (payload) => {
              const html = await this.llm.generateText(payload, useThinking);
              return stripCodeFences(html);
            },
            validate: validateFaqHtml,
            withFeedback: appendRepairFeedback,
            onAttempt: (n, c) =>
              this.progressMessage.set(`Repairing FAQ (${isoCode}) (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
          });
          if (faqRepairs > 0) console.info(`[repair-gate] FAQ (${isoCode}): ${faqRepairs} repair(s) applied`);
          if (faqHtml.startsWith('<')) {
            this.content.update(c => ({ ...c, faqArtifacts: { ...c.faqArtifacts, [isoCode]: faqHtml } }));
          } else {
            console.warn(`[FAQ] No usable artifact for ${isoCode}: model returned non-HTML after repair. Skipped.`);
          }
        }
      }

      // Post-generation acceptance-criteria check (non-blocking — reports only).
      this.runOutputValidation(input.website.name, input.name, input.templateId);

      this.historyService.add(input, this.content());
      this.progressMessage.set('Done!');
    }, 'Error during generation.', 'Generation failed. Check console for details.');
  }

  /** Native uk-UA generation: Task A is called directly in Ukrainian (no English base,
   *  no Task C translation loop). SEO/slug/FAQ are scoped to uk-UA only. Mirrors generate()'s
   *  repair gates and validators for the artifacts it shares. */
  async generateUaContent(input: ProductInput, useThinking = false): Promise<void> {
    const UA_ISO = 'uk-UA';
    const UA_BASE_LANGUAGE = 'Ukrainian (uk-UA)';

    this.content.set({ mainHtmlEn: '', translations: {}, seoData: null, slugData: null, website: input.website, faqArtifacts: {}, mainHtmlLocale: UA_ISO });
    this.validationIssues.set([]);

    const isConsumables = input.templateId === 'consumables-resin';
    const repairBudget = isConsumables ? 2 : this.maxRepairs();

    await this.withProgress(async () => {
      const { seoLangs } = getLangsForStore(input.website.name);

      // Step 1 — Task A generated NATIVELY in Ukrainian (no English base, no Task C).
      // Image manifest figcaption/alt text is sourced in English (Vision pre-pass output), so a
      // custom-instructions override is injected here to make Task A translate it into Ukrainian
      // instead of copying it verbatim — the normal pipeline gets this for free from Task C, which
      // this native path skips entirely.
      this.progressMessage.set(useThinking ? 'Generating Ukrainian Description (Deep Thinking)…' : 'Generating Ukrainian Description…');
      const uaInput: ProductInput = {
        ...input,
        customInstructions: [
          input.customInstructions?.trim(),
          '[UKRAINIAN NATIVE OUTPUT — IMAGE TEXT OVERRIDE] This description is generated natively in ' +
          'Ukrainian with no separate translation pass. The image manifest figcaption/vision-description ' +
          'text is sourced in English — do NOT copy it verbatim. Translate each figcaption and alt text ' +
          'into natural, idiomatic Ukrainian preserving the same factual meaning before using it.',
        ].filter(Boolean).join('\n\n'),
      };
      const basePayloadA = buildPromptA(uaInput, UA_BASE_LANGUAGE);
      const produceHtmlUa = async (payload: PromptPayload): Promise<string> => {
        let html = await this.llm.generateText(payload, useThinking);
        html = stripCodeFences(html);
        html = wrapVideoFigures(html, input.name);
        html = wrapImageFigures(html);
        html = fixNumberFormatting(html);
        return html;
      };
      const { artifact: htmlUa, finalIssues: htmlIssues, repairsUsed: aRepairs } = await runRepairGate<string>({
        label: 'HTML (uk-UA)',
        maxRepairs: repairBudget,
        basePayload: basePayloadA,
        produce: produceHtmlUa,
        validate: html => [
          ...validateGeneratedHtml(html, 'HTML (uk-UA)', input.name, UA_ISO, { templateId: input.templateId }),
          ...validateSpecsGrounding(html, input.specs, 'HTML (uk-UA)'),
        ],
        withFeedback: appendRepairFeedback,
        onAttempt: (n, c) =>
          this.progressMessage.set(`Repairing description (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
      });
      if (aRepairs > 0) console.info(`[repair-gate] HTML (uk-UA): ${aRepairs} repair(s) applied`);
      const finalHtmlUa = isConsumables ? trimConsumablesToLimit(htmlUa) : htmlUa;
      this.content.update(c => ({ ...c, mainHtmlEn: finalHtmlUa }));
      this.validationIssues.set(
        isConsumables
          ? validateGeneratedHtml(finalHtmlUa, 'HTML (uk-UA)', input.name, UA_ISO, { templateId: input.templateId })
          : htmlIssues,
      );

      // Step 2 — Slug for ALL site languages, grounded in the uk-UA description. Localized name
      // is the single source of truth for H1 + Task B title core. Non-blocking: a slug failure
      // must not abort SEO/FAQ.
      let localizedNames: Record<string, string> | undefined;
      try {
        this.progressMessage.set(`Generating SEO slugs for ${seoLangs.join(', ')}…`);
        const promptSlug = buildPromptSlug(input.website.name, input.name, seoLangs, finalHtmlUa);
        const rawSlug = await this.llm.generateJson<SlugResponse>(promptSlug, useThinking);
        const slugData = this.normalizeSlugResponse(rawSlug);
        this.content.update(c => ({ ...c, slugData }));
        this.approvedSlugKey.set(this.slugKey(input));
        localizedNames = slugsToLocalizedNames(slugData.slugs);
      } catch (e) {
        console.warn('[Slugs] uk-UA slug generation failed; H1 falls back to formula.', e);
        this.validationIssues.update(issues => [
          ...issues,
          { severity: 'warning', rule: 'slug-generation-failed', detail: 'Slug generation failed — H1 and meta_title fall back to the formula.', context: 'Slugs' },
        ]);
      }

      // Step 3 — SEO metadata for ALL site languages, grounded in the uk-UA description.
      this.progressMessage.set(`Generating SEO Metadata for ${seoLangs.join(', ')}…`);
      const promptB = buildPromptB(input.website.name, input.name, seoLangs, finalHtmlUa, localizedNames);
      const { artifact: seoJson, repairsUsed: bRepairs } = await runRepairGate({
        label: 'SEO metadata',
        maxRepairs: this.maxRepairs(),
        basePayload: promptB,
        produce: (payload) => this.llm.generateJson(payload, useThinking),
        validate: (json) => validateSeoMetadata(json, ''),
        withFeedback: appendRepairFeedback,
        onAttempt: (n, c) =>
          this.progressMessage.set(`Repairing SEO metadata (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
      });
      if (bRepairs > 0) console.info(`[repair-gate] SEO metadata: ${bRepairs} repair(s) applied`);
      this.content.update(c => ({ ...c, seoData: seoJson }));

      // Step 4 — FAQ artifact (uk-UA only). Runs ONLY when Supplemental Content is supplied.
      if (input.supplementalContent?.trim()) {
        const store = getStore(input.website.name);
        this.progressMessage.set('Generating FAQ artifact (uk-UA)…');
        const basePayloadFaq = buildPromptFaq(
          input.name, input.description, input.specs,
          input.supplementalContent ?? '', isoToHumanLang(UA_ISO), store.currencySymbol,
        );
        const validateFaqHtml = (html: string): ValidationIssue[] => {
          const issues = validateGeneratedHtml(html, 'FAQ (uk-UA)', input.name, UA_ISO);
          if (html && !html.trim().startsWith('<')) {
            issues.push({
              severity: 'error', rule: 'non-html-output',
              detail: 'Output is not HTML (does not start with "<").',
              context: 'FAQ (uk-UA)',
            });
          }
          return issues;
        };
        const { artifact: faqHtml, repairsUsed: faqRepairs } = await runRepairGate<string>({
          label: 'FAQ (uk-UA)',
          maxRepairs: this.maxRepairs(),
          basePayload: basePayloadFaq,
          produce: async (payload) => {
            const html = await this.llm.generateText(payload, useThinking);
            return stripCodeFences(html);
          },
          validate: validateFaqHtml,
          withFeedback: appendRepairFeedback,
          onAttempt: (n, c) =>
            this.progressMessage.set(`Repairing FAQ (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
        });
        if (faqRepairs > 0) console.info(`[repair-gate] FAQ (uk-UA): ${faqRepairs} repair(s) applied`);
        if (faqHtml.startsWith('<')) {
          this.content.update(c => ({ ...c, faqArtifacts: { ...c.faqArtifacts, [UA_ISO]: faqHtml } }));
        } else {
          console.warn('[FAQ] No usable uk-UA artifact: model returned non-HTML after repair. Skipped.');
        }
      }

      // Post-generation acceptance-criteria check (non-blocking — reports only).
      this.runOutputValidation(input.website.name, input.name, input.templateId, UA_ISO);

      this.historyService.add(input, this.content());
      this.progressMessage.set('Done!');
    }, 'Error during Ukrainian generation.', 'Ukrainian generation failed. Check console for details.');
  }

  async generateSeoMetadata(input: ProductInput, useThinking = false): Promise<void> {
    // Reuse slugData ONLY if it was approved for THIS exact product+store, so a Slug→SEO
    // standalone run feeds the approved localized name to B as h1 + title core. Otherwise
    // clear it (and B falls back to the English formula → independence preserved).
    const existingSlug = this.approvedSlugKey() === this.slugKey(input) ? this.content().slugData ?? null : null;
    this.content.set({ mainHtmlEn: '', translations: {}, seoData: null, slugData: existingSlug, website: input.website });
    this.validationIssues.set([]);

    await this.withProgress(async () => {
      const { seoLangs } = getLangsForStore(input.website.name);
      this.progressMessage.set(`Generating SEO Metadata for ${seoLangs.join(', ')}…`);

      const localizedNames = existingSlug?.slugs?.length
        ? slugsToLocalizedNames(existingSlug.slugs)
        : undefined;
      const promptB = buildPromptB(input.website.name, input.name, seoLangs, input.description, localizedNames);
      const { artifact: seoJson, repairsUsed: bRepairs } = await runRepairGate({
        label: 'SEO metadata',
        maxRepairs: this.maxRepairs(),
        basePayload: promptB,
        produce: (payload) => this.llm.generateJson(payload, useThinking),
        validate: (json) => validateSeoMetadata(json, ''),
        withFeedback: appendRepairFeedback,
        onAttempt: (n, c) =>
          this.progressMessage.set(`Repairing SEO metadata (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
      });
      if (bRepairs > 0) console.info(`[repair-gate] SEO metadata: ${bRepairs} repair(s) applied`);
      this.content.update(c => ({ ...c, seoData: seoJson }));

      this.validationIssues.set(validateSeoMetadata(this.content().seoData, ''));

      this.historyService.add(input, this.content());
      this.progressMessage.set('SEO Generation Done!');
    }, 'Error during SEO generation.', 'SEO Generation failed.');
  }

  async generateSlugs(input: ProductInput, useThinking = false): Promise<void> {
    this.content.set({ mainHtmlEn: '', translations: {}, seoData: null, slugData: null, website: input.website });
    this.validationIssues.set([]);

    await this.withProgress(async () => {
      const { seoLangs } = getLangsForStore(input.website.name);
      this.progressMessage.set(`Generating SEO slugs for ${seoLangs.join(', ')}…`);

      const promptSlug = buildPromptSlug(input.website.name, input.name, seoLangs, input.description);
      const rawSlug = await this.llm.generateJson<SlugResponse>(promptSlug, useThinking);
      const slugData = this.normalizeSlugResponse(rawSlug);
      this.content.update(c => ({ ...c, slugData }));
      this.approvedSlugKey.set(this.slugKey(input));

      this.validationIssues.set(validateSlugs(slugData));

      this.historyService.add(input, this.content());
      this.progressMessage.set('Slug Generation Done!');
    }, 'Error during slug generation.', 'Slug Generation failed.');
  }

  private normalizeSlugResponse(raw: SlugResponse): SlugResponse {
    const slugs = (raw.slugs ?? []).map(s => ({ ...s, slug: normalizeSlug(s.slug || s.name) }));
    const unique = ensureUniqueSlugs(slugs);
    return {
      site_name: raw.site_name ?? '',
      slugs: slugs.map((s, i) => ({ ...s, slug: unique[i] })),
    };
  }

  async generateKeywords(name: string, description: string): Promise<void> {
    this.isSuggestingKeywords.set(true);
    this.suggestedKeywords.set([]);
    try {
      const keywords = await this.llm.generateJson<string[]>(buildKeywordsPrompt(name, description));
      this.suggestedKeywords.set(Array.isArray(keywords) ? keywords : []);
    } catch (e) {
      console.error(e);
      alert('Failed to generate keyword suggestions.');
    } finally {
      this.isSuggestingKeywords.set(false);
    }
  }

  async optimize(htmlInput: string, productName = '', useThinking = false): Promise<void> {
    this.optimizerOutput.set('');
    this.progressMessage.set('Optimizing HTML…');
    await this.withProgress(async () => {
      let optimized = await this.llm.generateText(buildOptimizerPrompt(htmlInput, productName), useThinking);
      optimized = stripCodeFences(optimized);
      optimized = cleanHtmlStructure(optimized);
      this.optimizerOutput.set(optimized);
      this.progressMessage.set('Optimization Complete!');
    }, 'Error during optimization.', 'Optimization failed.');
  }

  async cleanStructureOnly(htmlInput: string): Promise<void> {
    this.optimizerOutput.set('');
    this.progressMessage.set('Cleaning HTML structure locally…');
    await this.withProgress(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      this.optimizerOutput.set(cleanHtmlStructure(htmlInput));
      this.progressMessage.set('Structure Cleaned!');
    }, 'Error while cleaning.', 'Cleaning failed');
  }

  async translate(content: string, targetLang: string, useThinking = false): Promise<void> {
    this.translatorOutput.set('');
    this.progressMessage.set(`Translating to ${targetLang}…`);
    await this.withProgress(async () => {
      const prompt = buildPromptC(content, targetLang, '', undefined);
      let translated = await this.llm.generateText(prompt, useThinking);
      translated = stripCodeFences(translated);
      if (targetLang === 'Spanish (EXPERT3D)' || targetLang === 'Portuguese (EXPERT3D)') {
        translated = this.applySpanishExpert3dReplacements(translated);
      }
      this.translatorOutput.set(translated);
      this.progressMessage.set('Translation Complete!');
    }, 'Error during translation.', 'Translation failed.');
  }

  async rewrite(website: WebsiteOption, text: string, useThinking = false): Promise<void> {
    this.copywriterOutput.set('');
    this.progressMessage.set('Rewriting content…');
    await this.withProgress(async () => {
      const prompt = buildCopywriterPrompt(website, text);
      let rewritten = await this.llm.generateText(prompt, useThinking);
      rewritten = stripCodeFences(rewritten);
      this.copywriterOutput.set(rewritten);
      this.progressMessage.set('Content Rewritten!');
    }, 'Error during rewriting.', 'Rewrite failed.');
  }

  async analyzeReadability(text: string): Promise<void> {
    this.readabilityScore.set(null);
    this.progressMessage.set('Analyzing readability…');
    await this.withProgress(async () => {
      const result = await this.llm.generateJson(buildReadabilityPrompt(text));
      this.readabilityScore.set(result);
      this.progressMessage.set('Analysis Complete!');
    }, 'Error during readability analysis.', 'Analysis failed.');
  }

  /**
   * Runs deterministic acceptance-criteria checks across all generated artifacts and
   * stores the results in the validationIssues signal. Errors are also logged so they
   * are visible during development. Never throws — validation is advisory.
   */
  private runOutputValidation(storeName: string, productName?: string, templateId?: string, mainLocale?: string): void {
    const c = this.content();
    const issues: ValidationIssue[] = [
      ...validateGeneratedHtml(c.mainHtmlEn, mainLocale ? `HTML (${mainLocale})` : 'HTML (base)', productName, mainLocale, { templateId }),
      ...Object.entries(c.translations).flatMap(([lang, html]) =>
        validateGeneratedHtml(html, `HTML (${lang})`, productName, taskLangToIso(lang, storeName), { templateId })
      ),
      ...validateSeoMetadata(c.seoData, ''),
      ...validateSlugs(c.slugData ?? null),
    ];
    this.validationIssues.set(issues);
    const errors = issues.filter(i => i.severity === 'error');
    if (errors.length > 0) {
      console.warn(`[output-validator] ${errors.length} acceptance-criteria error(s):`, errors);
    }
  }

  resetState() {
    this.content.set({ mainHtmlEn: '', translations: {}, seoData: null, slugData: null, faqArtifacts: {} });
    this.validationIssues.set([]);
    this.optimizerOutput.set('');
    this.translatorOutput.set('');
    this.copywriterOutput.set('');
    this.readabilityScore.set(null);
    this.suggestedKeywords.set([]);
    this.progressMessage.set('');
    this.isGenerating.set(false);
    this.isSuggestingKeywords.set(false);
  }

  async extractContent(type: 'url' | 'pdf', data: string): Promise<string> {
    this.isGenerating.set(true);
    this.progressMessage.set(type === 'url' ? 'Fetching URL content…' : 'Analyzing PDF document…');
    try {
      if (type === 'url') {
        return await this.retrieval.fetchUrl(data);
      } else {
        return await this.llm.extractFromPdf(data);
      }
    } finally {
      this.isGenerating.set(false);
      this.progressMessage.set('');
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async withProgress(
    task: () => Promise<void>,
    errorMsg: string,
    alertMsg = errorMsg,
  ): Promise<void> {
    this.isGenerating.set(true);
    try { await task(); }
    catch (error) {
      this.progressMessage.set(errorMsg);
      console.error(error);
      alert(alertMsg);
    } finally {
      this.isGenerating.set(false);
    }
  }

  private applySpanishExpert3dReplacements(content: string): string {
    let result = content;

    const badTag = '<a href="https://impresora-3d.es/kupiti-3d-printer/">«Наші контакти»</a>';
    const goodTag = '<a href="https://impresora-3d.es/contactos/">Contactos</a>';
    result = result.split(badTag).join(goodTag);

    const urlReplacements = [
      {
        old: [
          'https://3ddevice.com.ua/en/product/formlabs-resin-pump-for-form-4/',
          'https://3ddevice.com.ua/en/product/formlabs-resin-pump-for-form-4'
        ],
        new: 'https://impresora-3d.es/product/bomba-de-resina-formlabs-para-form-4/'
      },
      {
        old: [
          'https://3ddevice.com.ua/en/product/formlabs-resin-pump-for-high-volume-resin/',
          'https://3ddevice.com.ua/en/product/formlabs-resin-pump-for-high-volume-resin'
        ],
        new: 'https://impresora-3d.es/product/bomba-de-resina-formlabs-para-form-3/'
      },
      {
        old: [
          'https://3ddevice.com.ua/en/contacts/',
          'https://3ddevice.com.ua/contacts-ua/',
          'https://3ddevice.com.ua/ru/magazin-3d-printerov-kontakty/',
          'https://3ddevice.com.ua/en/contacts',
          'https://3ddevice.com.ua/contacts-ua',
          'https://3ddevice.com.ua/ru/magazin-3d-printerov-kontakty',
          'https://impresora-3d.es/kupiti-3d-printer/',
          'https://impresora-3d.es/pro-nas/',
          'https://impresora-3d.es/pro-nas'
        ],
        new: 'https://impresora-3d.es/contactos/'
      }
    ];

    urlReplacements.forEach(rule => {
      rule.old.forEach(url => {
        result = result.split(url).join(rule.new);
      });
    });

    // EXPERT3D ToV — deterministic calque fixes. Case-insensitive to catch sentence-initial
    // capitals; plural form of 'producción puente' maps to plural replacement.
    const calqueReplacements: Array<[RegExp, (m: string) => string]> = [
      [/de extremo a extremo/gi, (m) => {
        const r = 'de principio a fin';
        return /^[A-ZÁÉÍÓÚÑÜ]/.test(m) ? r[0].toUpperCase() + r.slice(1) : r;
      }],
      [/producci[oó]n puentes?/gi, (m) => {
        const r = /puentes$/i.test(m) ? 'producciones de transición' : 'producción de transición';
        return /^[A-ZÁÉÍÓÚÑÜ]/.test(m) ? r[0].toUpperCase() + r.slice(1) : r;
      }],
    ];
    calqueReplacements.forEach(([re, replacer]) => {
      result = result.replace(re, replacer);
    });

    return result;
  }

}