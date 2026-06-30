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
import { validateSlugs } from '../utils/slug-validator';
import { buildPromptA } from '../prompts/task-a';
import { buildPromptB } from '../prompts/task-b';
import { buildPromptSlug } from '../prompts/task-slug';
import { normalizeSlug, ensureUniqueSlugs, slugsToLocalizedNames } from '../prompt-core/slug-utils';
import { getStore, getLangsForStore, US_MEASUREMENT_RULES, isoToHumanLang, taskLangToIso } from '../prompt-core/constants';
import { buildPromptC } from '../prompts/task-c';
import { buildPromptFaq } from '../prompts/task-faq';
import { sortUkrainianFirst } from '../utils/locale-sort';
import { SlugResponse } from '../app/types';
import { runRepairGate, appendRepairFeedback } from '../utils/repair-gate';
import { trimConsumablesToLimit } from '../utils/consumables-trim';
import { PromptPayload } from '../prompt-core/payload';

// ── Inline prompts for tools that don't need external templates ─────────────

function buildOptimizerPrompt(htmlInput: string, productName = ''): string {
  const contextInstruction = productName ? ` + "${productName}"` : '';
  return `🛠️ Role
You are an Advanced HTML Parser & SEO Optimizer. Refactor dirty HTML into clean, semantic, high-performance HTML5.

⚡️ Execution Pipeline (follow strictly)
PHASE 1 — Structural Cleanup
1. Remove <noscript> tags and content.
2. Unwrap <div class="wpb-content-wrapper">…</div> — keep inner HTML.
3. Smart Image Extraction:
   - <a href…><img …></a> → keep only <img …>.
   - <picture>…<img …>…</picture> → keep only <img …>.
   - WordPress captions → extract <img> + <p>Caption text</p>.
4. Heading Hygiene: remove <strong>, <b>, <span> inside <h2>/<h3>/<h4> but keep text.
5. Tag Replacement:
   - <pre>…</pre> → <small>…</small>
   - <p><br /></p> → <br>
   - <b>…</b> → <strong>…</strong>

PHASE 2 — Image Optimization
For every <img>:
- If data-src present: move to src, remove data-src.
- REMOVE: class, style, loading, decoding, srcset, sizes, border.
- KEEP: width, height, alt, title. Never invent dimensions.
- Alt text: if missing/empty, generate 4–8 words based on context${contextInstruction}.
- Title attribute: REMOVE entirely.

PHASE 3 — Semantic Highlighting
- Bold High-Value Technical Specs only (44.2 MPa, 70 °C, 1.93 GPa).
- Do NOT bold standard volumes/weights, ABS/PLA/PETG acronyms in paragraphs.
- Max 1 highlight per paragraph.
- In lists: <li><strong>Nozzle:</strong> 0.4 mm</li>.

⛔ Output Restrictions
- NEVER output Python code, scripts, or explanations.
- Raw HTML Only — no markdown code blocks.
- Do not close <div> tags not opened in the input.

📥 Input HTML:
${htmlInput}`;
}

function buildReadabilityPrompt(text: string): string {
  return `Act as a Professional Editor and Accessibility Specialist.
Analyze the following text for clarity, readability, and accessibility.

Text to analyze:
${text.substring(0, 5000)}

Provide analysis in this JSON format:
{
  "score": number (0–100, 100 = extremely clear),
  "level": "Easy | Moderate | Difficult | Technical",
  "issues": ["specific clarity/accessibility issues"],
  "suggestions": ["specific improvements"],
  "optimizedText": "rewritten version implementing the suggestions while preserving technical facts and SEO keywords"
}

Return ONLY the raw JSON object.`;
}

function buildKeywordsPrompt(productName: string, description: string): string {
  return `Act as an SEO Specialist.
Analyze the following product information and generate a list of 10 high-impact, relevant SEO keywords
and phrases (including long-tail). Focus on terms potential buyers would search for related to
3D printing equipment.

Product Name: ${productName}
Description Context: ${description.substring(0, 2000)}

Return ONLY a raw JSON array of strings. Example: ["keyword 1", "keyword 2"]`;
}

function buildImageAltPrompt(): string {
  return `Generate professional, technical SEO alt text for this product image.

Rules:
1. Be Specific: mention technical specs visible in the image (wavelengths, spot sizes, material types).
2. Comparative Analysis: if the image shows a comparison, describe the before/after or left/right differences.
3. Function over Form: focus on the result of the technology shown.
4. Tone: scientific, precise, professional. No marketing fluff ("amazing", "beautiful").
5. Structure: main subject first, then technical details and the specific machine/process.
6. Conciseness: maximum 20 words. No introductory phrases like "This image shows".`;
}

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
    this.isGenerating.set(true);
    // Reuse an editor-approved slug ONLY when it was approved for THIS exact product+store
    // (from a prior standalone Slug run); otherwise start clean. This makes the approved
    // localized name authoritative across H1/title/URL without ever reusing a stale name.
    const reusedSlug = this.approvedSlugKey() === this.slugKey(input) ? this.content().slugData ?? null : null;
    this.content.set({ mainHtmlEn: '', translations: {}, seoData: null, slugData: reusedSlug, website: input.website, faqArtifacts: {} });
    this.validationIssues.set([]);

    const isConsumables = input.templateId === 'consumables-resin';
    const repairBudget = isConsumables ? 2 : this.maxRepairs();

    try {
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
        validate: html => validateGeneratedHtml(html, 'HTML (base)', input.name, undefined, { templateId: input.templateId }),
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

      // Step 4 — Translations (Ukrainian always first)
      const sortedTransLangs = [...transLangs].sort(sortUkrainianFirst);
      for (const lang of sortedTransLangs) {
        this.progressMessage.set(`Translating to ${lang}…`);
        const basePayloadC = buildPromptC(finalHtmlEn, lang, input.website.name, input.website.group, input.templateId);
        const locale = taskLangToIso(lang, input.website.name);
        const { artifact: translatedHtml, repairsUsed: cRepairs } = await runRepairGate<string>({
          label: `HTML (${lang})`,
          maxRepairs: repairBudget,
          basePayload: basePayloadC,
          produce: async (payload) => {
            let html = await this.llm.generateText(payload, useThinking);
            html = stripCodeFences(html);
            if (input.website.name === 'EXPERT3D' && lang === 'ES') {
              html = this.applySpanishExpert3dReplacements(html);
            }
            html = wrapImageFigures(html);
            return fixNumberFormatting(html);
          },
          validate: (html) => validateGeneratedHtml(html, `HTML (${lang})`, input.name, locale, { templateId: input.templateId }),
          withFeedback: appendRepairFeedback,
          onAttempt: (n, c) =>
            this.progressMessage.set(`Repairing translation ${lang} (attempt ${n}, ${c} issue${c > 1 ? 's' : ''})…`),
        });
        if (cRepairs > 0) console.info(`[repair-gate] HTML (${lang}): ${cRepairs} repair(s) applied`);
        const finalTranslated = isConsumables ? trimConsumablesToLimit(translatedHtml) : translatedHtml;
        this.content.update(c => ({
          ...c,
          translations: { ...c.translations, [lang]: finalTranslated }
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

    } catch (error) {
      this.progressMessage.set('Error during generation.');
      console.error(error);
      alert('Generation failed. Check console for details.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  async generateSeoMetadata(input: ProductInput, useThinking = false): Promise<void> {
    this.isGenerating.set(true);
    // Reuse slugData ONLY if it was approved for THIS exact product+store, so a Slug→SEO
    // standalone run feeds the approved localized name to B as h1 + title core. Otherwise
    // clear it (and B falls back to the English formula → independence preserved).
    const existingSlug = this.approvedSlugKey() === this.slugKey(input) ? this.content().slugData ?? null : null;
    this.content.set({ mainHtmlEn: '', translations: {}, seoData: null, slugData: existingSlug });
    this.validationIssues.set([]);

    try {
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

      // Validate just the SEO metadata for this flow (no HTML produced here).
      this.validationIssues.set(
        validateSeoMetadata(this.content().seoData, '')
      );

      this.historyService.add(input, this.content());
      this.progressMessage.set('SEO Generation Done!');

    } catch (error) {
      this.progressMessage.set('Error during SEO generation.');
      console.error(error);
      alert('SEO Generation failed.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  async generateSlugs(input: ProductInput, useThinking = false): Promise<void> {
    this.isGenerating.set(true);
    this.content.set({ mainHtmlEn: '', translations: {}, seoData: null, slugData: null });
    this.validationIssues.set([]);

    try {
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

    } catch (error) {
      this.progressMessage.set('Error during slug generation.');
      console.error(error);
      alert('Slug Generation failed.');
    } finally {
      this.isGenerating.set(false);
    }
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
    this.isGenerating.set(true);
    this.progressMessage.set('Optimizing HTML…');
    this.optimizerOutput.set('');

    try {
      let optimized = await this.llm.generateText(buildOptimizerPrompt(htmlInput, productName), useThinking);
      optimized = stripCodeFences(optimized);
      optimized = cleanHtmlStructure(optimized);
      this.optimizerOutput.set(optimized);
      this.progressMessage.set('Optimization Complete!');
    } catch (error) {
      this.progressMessage.set('Error during optimization.');
      console.error(error);
      alert('Optimization failed.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  async cleanStructureOnly(htmlInput: string): Promise<void> {
    this.isGenerating.set(true);
    this.progressMessage.set('Cleaning HTML structure locally…');
    this.optimizerOutput.set('');
    try {
      await new Promise(resolve => setTimeout(resolve, 0));
      this.optimizerOutput.set(cleanHtmlStructure(htmlInput));
      this.progressMessage.set('Structure Cleaned!');
    } catch (e) {
      console.error(e);
      alert('Cleaning failed');
    } finally {
      this.isGenerating.set(false);
    }
  }

  async translate(content: string, targetLang: string, useThinking = false): Promise<void> {
    this.isGenerating.set(true);
    this.progressMessage.set(`Translating to ${targetLang}…`);
    this.translatorOutput.set('');

    try {
      const prompt = buildPromptC(content, targetLang, '', undefined);
      let translated = await this.llm.generateText(prompt, useThinking);
      translated = stripCodeFences(translated);

      if (targetLang === 'Spanish (EXPERT3D)') {
        translated = this.applySpanishExpert3dReplacements(translated);
      }

      this.translatorOutput.set(translated);
      this.progressMessage.set('Translation Complete!');
    } catch (error) {
      this.progressMessage.set('Error during translation.');
      console.error(error);
      alert('Translation failed.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  async rewrite(website: WebsiteOption, text: string, useThinking = false): Promise<void> {
    this.isGenerating.set(true);
    this.progressMessage.set('Rewriting content…');
    this.copywriterOutput.set('');

    try {
      const prompt = this.buildCopywriterPrompt(website, text);
      let rewritten = await this.llm.generateText(prompt, useThinking);
      rewritten = stripCodeFences(rewritten);
      this.copywriterOutput.set(rewritten);
      this.progressMessage.set('Content Rewritten!');
    } catch (error) {
      this.progressMessage.set('Error during rewriting.');
      console.error(error);
      alert('Rewrite failed.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  async analyzeReadability(text: string): Promise<void> {
    this.isGenerating.set(true);
    this.progressMessage.set('Analyzing readability…');
    this.readabilityScore.set(null);

    try {
      const result = await this.llm.generateJson(buildReadabilityPrompt(text));
      this.readabilityScore.set(result);
      this.progressMessage.set('Analysis Complete!');
    } catch (error) {
      this.progressMessage.set('Error during readability analysis.');
      console.error(error);
      alert('Analysis failed.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  /**
   * Runs deterministic acceptance-criteria checks across all generated artifacts and
   * stores the results in the validationIssues signal. Errors are also logged so they
   * are visible during development. Never throws — validation is advisory.
   */
  private runOutputValidation(storeName: string, productName?: string, templateId?: string): void {
    const c = this.content();
    const issues: ValidationIssue[] = [
      ...validateGeneratedHtml(c.mainHtmlEn, 'HTML (base)', productName, undefined, { templateId }),
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

  // ── Image alt text (used by app.component.ts) ────────────────────────────

  getImageAltPrompt(): string {
    return buildImageAltPrompt();
  }

  // ── Private helpers ───────────────────────────────────────────────────────

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

    return result;
  }

  private buildCopywriterPrompt(website: WebsiteOption, text: string): string {
    const siteName = website.name;
    const store = getStore(siteName);
    let localizationContext = '';

    if (store.group === 'UA') {
      localizationContext = `### Context for ${siteName} (UA Market)
- Language Priority: Ukrainian (uk-UA), Russian (ru-UA).
- Tone: Professional, clear, and trustworthy. Expert voice.`;
    } else if (store.group === 'EU') {
      localizationContext = `### Context for ${siteName} (EU Market)
- Language Priority: Polish (pl-PL), English (en-GB), German (de-DE).
- Tone: Professional, direct, and technically accurate.`;
    } else if (store.group === 'ES') {
      localizationContext = `### Context for ${siteName} (Spain Market)
- Language Priority: Spanish (es-ES).
- Tone: "Cercano y Profesional". Engaging and direct. Use "Tú".`;
    } else if (store.group === 'US') {
      localizationContext = `${US_MEASUREMENT_RULES}

### Context for ${siteName} (US Market)
- Language Priority: English (en-US), Spanish (es-MX).
- Tone: Confident, benefit-driven, and energetic. Use active voice.`;
    } else {
      localizationContext = `### Context for ${siteName} (${website.group})`;
    }

    return `[ROLE]
You are an expert copywriter and SEO specialist. Rewrite the given text to make it unique,
engaging, and stylistically appropriate for the specific target market defined below.

[TASK]
Rewrite the following [SOURCE TEXT] to be approximately 80% unique. The core meaning and
technical facts must be preserved, but the structure, vocabulary, and sentence construction
must be significantly different.

${localizationContext}

[STYLE & HUMANIZATION GUIDELINES]
1. No Fluff: start directly with value. Ban intro phrases like "In the modern world…".
2. Expert Perspective (The "Why"): explain WHY specs matter.
3. Rhythm & Burstiness: mix short punchy sentences with longer descriptive ones.
   Prohibited clichés: "ideal solution", "cutting-edge", "perfect choice".
4. Formatting: use <strong> for keywords and specs sparingly (max 2–3 per paragraph).

[FORMAT REQUIREMENTS]
1. HTML Structure: NO <h1>. Use <h2> for section titles, <h3> for sub-features.
   Wrap ALL paragraphs in <p> tags. Lists: <ul><li>…</li></ul>.
2. Formatting: use <strong> for bold. NO markdown (**text**).
3. NO markdown code blocks. Return RAW HTML string only.

[SOURCE TEXT]
${text}`;
  }
}