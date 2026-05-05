import { Injectable, signal, inject } from '@angular/core';
import { GeminiService } from './gemini.service';
import { ThinkingLevel } from "@google/genai";
import { HistoryService } from '@/src/services/history.service';
import { ProductInput, GeneratedContent, GROUP_CONFIG, WebsiteOption, CONTENT_TEMPLATES } from '../app/types';
import { cleanHtmlStructure } from '../utils/html-cleaner';

@Injectable({
  providedIn: 'root'
})
export class ContentOrchestratorService {
  private gemini = inject(GeminiService);
  private historyService = inject(HistoryService);

  // State signals
  isGenerating = signal(false);
  progressMessage = signal('');
  
  // Keyword Suggestion State
  suggestedKeywords = signal<string[]>([]);
  isSuggestingKeywords = signal(false);
  
  // Generator Results
  content = signal<GeneratedContent>({
    mainHtmlEn: '',
    translations: {},
    seoData: null
  });

  // Optimizer Results
  optimizerOutput = signal<string>('');

  // Translator Results
  translatorOutput = signal<string>('');

  // Copywriter Results
  copywriterOutput = signal<string>('');

  // Readability Results
  readabilityScore = signal<any | null>(null);

  async generate(input: ProductInput, useThinking = false): Promise<void> {
    this.isGenerating.set(true);
    // Reset content before new generation
    this.content.set({ mainHtmlEn: '', translations: {}, seoData: null });
    
    try {
      const groupConfig = GROUP_CONFIG[input.website.group];

      // 1. Generate Main English Description (Thinking Mode)
      this.progressMessage.set(useThinking ? 'Generating US English HTML Description (Deep Thinking)...' : 'Generating US English HTML Description...');
      const promptA = this.buildPromptA(input);
      // Use Thinking model for creative writing
      let htmlEn = await this.gemini.generateCreativeContent(promptA, useThinking ? ThinkingLevel.HIGH : ThinkingLevel.LOW);
      
      // Cleanup English HTML just in case
      htmlEn = htmlEn.replace(/```html/g, '').replace(/```/g, '').trim();

      this.content.update(c => ({ ...c, mainHtmlEn: htmlEn }));

      // 2. Generate SEO Metadata (Standard Flash)
      this.progressMessage.set(`Generating SEO Metadata for ${groupConfig.seoLangs.join(', ')}...`);
      // Updated to pass input.name as well, as required by the new JSON schema
      const promptB = this.buildPromptB(input.website.name, input.name, groupConfig.seoLangs);
      const seoJson = await this.gemini.generateJson(promptB, useThinking);
      
      this.content.update(c => ({ ...c, seoData: seoJson }));

      // 3. Translations (Standard Flash)
      for (const lang of groupConfig.transLangs) {
        this.progressMessage.set(`Translating HTML to ${lang}...`);
        const promptC = this.buildPromptC(htmlEn, lang, input.website.group);
        let translatedHtml = await this.gemini.generateText(promptC, useThinking);
        
        // STRICT CLEANUP: Remove markdown code blocks if present
        translatedHtml = translatedHtml.replace(/```html/g, '').replace(/```/g, '').trim();

        // === SPECIAL RULE: Spanish (EXPERT3D) URL Replacement for Generator ===
        if (input.website.name === 'EXPERT3D' && lang === 'ES') {
           translatedHtml = this.applySpanishExpert3dReplacements(translatedHtml);
        }

        this.content.update(c => ({
          ...c,
          translations: { ...c.translations, [lang]: translatedHtml }
        }));
      }

      // Save to History
      this.historyService.add(input, this.content());
      this.progressMessage.set('Done!');

    } catch (error) {
      this.progressMessage.set('Error occurred during generation.');
      console.error(error);
      alert('Generation failed. Check console for details.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  async generateSeoMetadata(input: ProductInput, useThinking = false): Promise<void> {
    this.isGenerating.set(true);
    this.content.set({ mainHtmlEn: '', translations: {}, seoData: null });

    try {
      const groupConfig = GROUP_CONFIG[input.website.group];

      this.progressMessage.set(`Generating ONLY SEO Metadata for ${groupConfig.seoLangs.join(', ')}...`);
      
      // Pass the description as context since we don't have generated HTML
      const promptB = this.buildPromptB(input.website.name, input.name, groupConfig.seoLangs, input.description);
      const seoJson = await this.gemini.generateJson(promptB, useThinking);

      this.content.update(c => ({ ...c, seoData: seoJson }));

      // Save to History
      this.historyService.add(input, this.content());
      this.progressMessage.set('SEO Generation Done!');

    } catch (error) {
      this.progressMessage.set('Error occurred during SEO generation.');
      console.error(error);
      alert('SEO Generation failed.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  async generateKeywords(name: string, description: string): Promise<void> {
    this.isSuggestingKeywords.set(true);
    this.suggestedKeywords.set([]);
    try {
       const keywords = await this.gemini.generateKeywords(name, description);
       this.suggestedKeywords.set(keywords);
    } catch(e) {
       console.error(e);
       alert('Failed to generate keyword suggestions.');
    } finally {
       this.isSuggestingKeywords.set(false);
    }
  }

  async optimize(htmlInput: string, productName: string = '', useThinking = false): Promise<void> {
    this.isGenerating.set(true);
    this.progressMessage.set(useThinking ? 'Optimizing HTML (Deep Thinking)...' : 'Optimizing HTML: Attributes, Styles, and Keywords...');
    this.optimizerOutput.set('');

    try {
      // Standard AI Optimization
      let optimized = await this.gemini.optimizeHtmlContent(htmlInput, productName, useThinking);
      // Cleanup markdown
      optimized = optimized.replace(/```html/g, '').replace(/```/g, '').trim();
      
      // Apply Structural Cleaner as a final pass to ensure perfection
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
    this.progressMessage.set('Cleaning HTML structure locally...');
    this.optimizerOutput.set('');
    
    try {
      // Simulate a small delay for UX so user sees the change
      await new Promise(resolve => setTimeout(resolve, 500));
      const cleaned = cleanHtmlStructure(htmlInput);
      this.optimizerOutput.set(cleaned);
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
    this.progressMessage.set(useThinking ? `Translating content to ${targetLang} (Thinking Mode)...` : `Translating content to ${targetLang}...`);
    this.translatorOutput.set('');

    try {
      // Build the appropriate prompt based on target language
      const prompt = this.buildTranslatorPrompt(content, targetLang);
      
      let translated = useThinking 
        ? await this.gemini.generateCreativeContent(prompt, ThinkingLevel.HIGH)
        : await this.gemini.generateText(prompt);
      
      // Cleanup markdown
      translated = translated.replace(/```html/g, '').replace(/```/g, '').trim();

      // === SPECIAL RULE: Spanish (EXPERT3D) URL Replacement ===
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
    this.progressMessage.set(useThinking ? 'Rewriting content (Deep Thinking)...' : 'Rewriting content with localized expertise...');
    this.copywriterOutput.set('');

    try {
      const prompt = this.buildCopywriterPrompt(website, text);
      let rewritten = await this.gemini.generateCreativeContent(prompt, useThinking ? ThinkingLevel.HIGH : ThinkingLevel.LOW);
      rewritten = rewritten.replace(/```html/g, '').replace(/```/g, '').trim();
      this.copywriterOutput.set(rewritten);
      this.progressMessage.set('Content Rewritten!');
    } catch (error) {
      this.progressMessage.set('Error during rewriting process.');
      console.error(error);
      alert('Rewrite failed.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  async analyzeReadability(text: string): Promise<void> {
    this.isGenerating.set(true);
    this.progressMessage.set('Analyzing readability and clarity...');
    this.readabilityScore.set(null);

    try {
      const result = await this.gemini.analyzeReadability(text);
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

  resetState() {
    this.content.set({ mainHtmlEn: '', translations: {}, seoData: null });
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
    this.progressMessage.set(type === 'url' ? 'Scanning URL with Google Search...' : 'Analyzing PDF Document...');
    try {
      if (type === 'url') {
        return await this.gemini.extractFromUrl(data);
      } else {
        return await this.gemini.extractFromPdf(data);
      }
    } finally {
      this.isGenerating.set(false);
    }
  }

  private applySpanishExpert3dReplacements(content: string): string {
    let result = content;

    const badTag = '<a href="https://impresora-3d.es/kupiti-3d-printer/">\u00ABНаші контакти\u00BB</a>';
    const goodTag = '<a href="https://impresora-3d.es/contactos/">Contactos</a>';
    result = result.split(badTag).join(goodTag);

    const urlReplacements = [
      // Specific Product Replacements (High Priority)
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
      // Generic/Contact Replacements (Lower Priority)
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

  private getUsMeasurementRules(): string {
    return `### 📏 **Measurement System (Mixed US Standard)**
You **MUST** apply the following specific unit conversions (standard for the US 3D printing industry):

1.  **CONVERT to Imperial Units:**
    *   **Printer Dimensions:** Convert to **inches** (e.g., 18.5" x 18.5" x 20").
    *   **Build Volume (Print Area):** Convert to **inches**.
    *   **Printer Weight:** Convert to **lbs**.
    *   **Filament Spool Weight:** Convert to **lbs** (or oz for small samples).

2.  **KEEP in Metric Units (DO NOT CONVERT):**
    *   **Layer Thickness:** Keep in **microns (μm)**.
    *   **Filament Diameter:** Keep in **mm** (e.g., 1.75 mm).
    *   **Nozzle Diameter:** Keep in **mm**.
    *   **Temperature:** Keep in **°C** (do not convert to Fahrenheit).
    *   **Print Speed:** Keep in **mm/s**.
    *   **Resin Volume:** Keep in **L** or **ml**.`;
  }

  private buildCopywriterPrompt(website: WebsiteOption, text: string): string {
    const siteName = website.name;
    let localizationContext = '';

    if (['3DDevice', '3DPrinter', '3DScanner'].includes(siteName)) {
      localizationContext = `
### 🌍 Context for ${siteName} (UA Market)
- **Language Priority:** Ukrainian (uk-UA), Russian (ru-UA).
- **Tone:** Professional, clear, and trustworthy. Expert voice.
      `;
    } else if (siteName === 'Center 3D Print') {
      localizationContext = `
### 🌍 Context for ${siteName} (EU Market)
- **Language Priority:** Polish (pl-PL), English (en-GB), German (de-DE).
- **Tone:** Professional, direct, and technically accurate.
      `;
    } else if (siteName === 'EXPERT3D' || siteName === 'Impresora-3D') {
      localizationContext = `
### 🌍 Context for ${siteName} (Spain Market)
- **Language Priority:** Spanish (es-ES).
- **Tone:** "Cercano y Profesional" (Close and Professional). Engaging and direct. Use "Tú".
      `;
    } else if (siteName === 'Expert-3DPrinter') {
      localizationContext = `
${this.getUsMeasurementRules()}

### 🌍 Context for ${siteName} (US Market)
- **Language Priority:** English (en-US), Spanish (es-MX).
- **Tone:** Confident, benefit-driven, and energetic. Use active voice.
      `;
    } else {
       // Fallback for custom sites not in list
       localizationContext = `### 🌍 Context for ${siteName} (${website.group})`;
    }

    return `[ROLE]
You are an expert copywriter and SEO specialist. Your task is to rewrite a given text to make it unique, engaging, and stylistically appropriate for the specific target market defined below.

[TASK]
Rewrite the following [SOURCE TEXT] to be approximately 80% unique. The core meaning and technical facts must be preserved, but the structure, vocabulary, and sentence construction must be significantly different.

${localizationContext}

[STYLE & HUMANIZATION GUIDELINES]
1.  **No Fluff:** Start directly with value. Ban intro phrases like "In the modern world..." or "Introduction".
2.  **Expert Perspective (The "Why"):** Don't just list specs in the description body. Explain *why* they matter. (e.g., "Heated chamber -> Prevents warping for ABS/Nylon").
3.  **Rhythm & Burstiness:** 
    - Mix short punchy sentences with longer descriptive ones. 
    - Avoid monotonous, symmetrical paragraph structures.
    - **Prohibited:** Do NOT use generic marketing clichés ("ideal solution", "cutting-edge", "perfect choice") unless strictly factual.
4.  **Formatting:** Use <strong> tags to highlight *keywords* and *specs*, but sparingly (max 2-3 per paragraph).

[FORMAT REQUIREMENTS (STRICT)]
1.  **HTML Structure:**
    - NO <h1> tag.
    - Use <h2> for main section titles.
    - Use <h3> for sub-features within the description and for specification categories.
    - Wrap ALL paragraphs in <p> tags.
    - **CMS Requirement:** After each closing </p>, immediately add <br> for spacing except for the last paragraph of the text.
    - Lists: Use <ul><li>...</li></ul>.
2.  **Formatting:**
    - Use <strong> for bold text. NO markdown (**text**).
    - **NO** markdown code blocks (\`\`\`html). Return RAW HTML string only.

[SOURCE TEXT]
${text}
`;
  }

  private buildPromptA(input: ProductInput): string {
    const isUsSite = input.website.group === 'US';
    const customInstructions = input.customInstructions?.trim()
      ? `\n[USER-PROVIDED INSTRUCTIONS]\n${input.customInstructions.trim()}\n`
      : '';

    let templateContext = '';
    if (input.templateId || input.customTemplate) {
      const template = CONTENT_TEMPLATES.find(t => t.id === input.templateId);
      const structure = {
        ...(template?.structure || {}),
        ...(input.customTemplate || {})
      };

      templateContext = `
[CONTENT TEMPLATE INSTRUCTIONS]
- Title Pattern: ${structure.titlePattern}
- Heading Structure: ${structure.headingStructure?.join(' -> ')}
- Body Focus: ${structure.bodyFocus}
- Keyword Strategy: ${structure.keywordStrategy}
      `;
    }

    return `[ROLE]
You are an expert technical copywriter specializing in 3D technology (3D printing, scanning, and additive manufacturing). Your goal is to generate SEO and GEO-optimized product descriptions that AI search engines (like Perplexity, Gemini, SearchGPT) can easily parse, cite, and rank.

[TASK]
Rewrite the provided product description for an online store. 
Goal: Create an attractive, human-like, high-converting, and high-fact-density text for the target audience looking for specific benefits of ${input.name}.
Uniqueness Target: The rewritten text must be structurally and linguistically unique (~75% diff from input description text), BUT technical data must remain identical.

${templateContext}

[INPUT DATA]
[Product Name]: ${input.name}
[Raw Description]: ${input.description}
[Technical Specs]: ${input.specs}
[Supplemental Content]: ${input.supplementalContent || 'None provided.'}
[Store Name]: ${input.website.name}
${customInstructions}

[MEASUREMENT RULES (REGION SPECIFIC)]
${isUsSite ? this.getUsMeasurementRules() : 'Use standard Metric units (mm, kg, °C) unless specified otherwise.'}
*IMPORTANT CONSTRAINT:* Ensure the visible text and the HTML Microdata values (itemprop="value") match perfectly to maintain AI trust.

[STYLE & GEO GUIDELINES]
1.  **Answer-First Methodology:** Start directly with a fact-dense summary. Ban intro phrases like "In the modern world...". No fluff.
2.  **Expert Perspective (The "Why"):** Don't just list specs in the description body. Explain *why* they matter. (e.g., "Heated chamber -> Prevents warping for ABS/Nylon").
3.  **Semantic Chunking:** Use self-contained sections. Formulate H2/H3 titles as user-intent questions or benefit-driven statements (e.g., "What are the capabilities of ${input.name}?").
4.  **Fact Density:** Maintain a high concentration of technical data (measurements, tolerances, materials). 
5.  **Rhythm & Burstiness:** Mix short punchy sentences with longer descriptive ones. Avoid monotonous paragraph structures.
6.  **Prohibited:** Do NOT use generic marketing clichés ("ideal solution", "cutting-edge", "perfect choice") unless strictly factual.

[CONTENT STRUCTURE & MICRODATA (STRICT HTML)]

1.  **The "Answer-First" Hook (40-75 words):**
    Wrap this section in a <div itemscope itemtype="https://schema.org/Product">.
    A concise opening: What is this and what is its main "killer feature"? 
    Naturally include: <span itemprop="name">${input.name}</span>.
    Wrap the summary text in: <span itemprop="description">...</span>.

2.  **Expert Deep Dive: Features & Real-World Application:**
    Rephrase the [Raw Description]. Mention specific use cases (e.g., prototyping, dental, jewelry).
    *Sub-headings:* Use <h3> tags ONLY to group distinct logical sections.
    *Quick Specs Table:* Include a <table> summarizing 3-4 "Killer Specs" (e.g., Build Volume, Print Speed, Material Compatibility) for quick AI extraction.

3.  **Technical Specifications (CRITICAL FIDELITY):**
    You must output the specifications exactly as provided in the input, preserving the quantity and values.
    
    *Structure Rules:*
    - **Wrapper:** Wrap this entire section in \`<section class="specs">\`.
    - **Main Header:** Start this section strictly with: <h2>Technical specifications of the ${input.name}</h2>.
    - **Sub-headers:** Use <h3> tags for specification categories found in the input.
    - **The List (Microdata Enhanced):** Format as a clean bulleted list (<ul><li>...</li></ul>).
    - **CRITICAL FORMAT:** Each specification must be wrapped exactly like this:
      <li itemprop="additionalProperty" itemscope itemtype="https://schema.org/PropertyValue">
        <span itemprop="name">Property Name</span>: <span itemprop="value">Value (with units)</span>
      </li>
    - **Completeness/In the box:** Package contents go in a <ul> list, but DO NOT use an <h3> header for this specific part.
    - **DO NOT CUT:** If the input has 20 specs, the output must have 20 specs.
    - **DO NOT CHANGE:** Keep numerical values and units exactly as they are (subject to the MEASUREMENT RULES).

4.  **Supplemental Content (How-To / FAQ) [OPTIONAL]:**
    If [Supplemental Content] is provided and not empty (not "None provided."), insert it exactly here, between the Technical Specifications and the Final Closing Paragraph.
    - **Classification:** 
      - If the text contains sequential steps, numbered lists, or instructions (like "Step 1", "How to set up"), classify it as HowTo.
      - If the text contains a Q&A format, classify it as FAQ.
      - It can contain both if both are present.
    - **Schema.org Integration:** Wrap the identified content in semantic HTML using inline Schema.org attributes.
      - For FAQ: Use \`<div itemscope itemtype="https://schema.org/FAQPage">\`, \`<div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">\`, and \`<div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">\`.
      - For HowTo: Use \`<div itemscope itemtype="https://schema.org/HowTo">\`, \`<div itemprop="step" itemscope itemtype="https://schema.org/HowToStep">\`, and \`<span itemprop="text">\`.
    - **Content Integrity:** Do NOT heavily rewrite the supplemental content. Maintain the original professional/technical tone and specific details. You may only adjust minor formatting to fit the HTML structure.
    - **Optionality:** If the [Supplemental Content] block is empty or "None provided.", proceed directly from Specifications to the Closing Paragraph without adding empty tags.
    - **Wrapper:** If present, wrap the entire supplemental section in \`<section class="supplemental-content">\`.

5.  **Why Buy from ${input.website.name}? (Trust Section & CTA):**
    Persuasive closing (max 3 sentences). Wrap in \`<p class="cta">\`.
    - Mention expert experience since 2012.
    - IF brand is listed here:[KLEMA, Formlabs, CreatBot, Raise3D, UltiMaker, MakerBot, Markforged, Omni 3D, Shining 3D, Peel 3D, Creaform, Revopoint, Scantech, Surphaser, Thunk3D, E-PLUS 3D, Fastform, xTool, Magigoo, Aesub, Bambu Lab], explicitly state: "As an official representative of [Brand], we guarantee the best price, authorized service, and official warranty."

[SEO INSTRUCTIONS]
- Primary Keyword: "${input.name}"
- Density: Natural usage (approx 1-2 times per section).
- H2 Tags: Use benefit-driven headers.

[FORMAT REQUIREMENTS (STRICT)]
1.  **HTML Structure:**
    - NO <h1> tag.
    - Use <h2> for main section titles.
    - Use <h3> for sub-features within the description and for specification categories.
    - Wrap ALL paragraphs in <p> tags.
    - **CMS Requirement:** After each closing </p>, </h2>, and </h3>, immediately add <br> for spacing except for the last paragraph of the text.
    - Lists: Use <ul><li>...</li></ul>.
2.  **Formatting:**
    - Use <strong> to highlight keywords and specs sparingly (max 2-3 per paragraph). NO markdown (**text**).
    - **NO** markdown code blocks (\`\`\`html). Return RAW HTML string only.
3.  **Grammar & Punctuation:**
    - Follow standard English grammar. 
    - In bulleted lists, you may start with lowercase if they are fragments. For full sentences after a colon, capitalize the first letter.

[iframe HANDLING STRATEGY (CRITICAL)]
If the [Raw Description] contains <iframe> tags (YouTube/Vimeo):
1.  **EXTRACT:** Identify the iframe code.
2.  **PRESERVE:** Do not change a single character in the <iframe> tag.
3.  **INSERT:** Place the <iframe> code logically within the "Deep Dive" section, roughly where it appeared in the original context (e.g., after the paragraph describing the feature shown in the video).

[FINAL RESPONSE]
Generate the text in **\${isUsSite ? 'American English' : 'European English (British spelling)'}** (or target language if specified).
Output ONLY the HTML.`;
  }

  private buildPromptB(siteName: string, productName: string, languages: string[], descriptionContext?: string): string {
    let strategyContext = '';
    let siteSuffix = `| ${siteName}`; 

    if (['3DDevice', '3DPrinter', '3DScanner'].includes(siteName)) {
      strategyContext = `Target Region: Ukraine 🇺🇦
Currency: UAH (₴)
Main Value: Official Warranty, In Stock.
Language Priority: Ukrainian (uk-UA), Russian (ru-UA).`;
    } else if (siteName === 'Center 3D Print') {
      strategyContext = `Target Region: Poland 🇵🇱 & EU 🇪🇺
Currency: PLN (zł) / EUR (€)
Main Value: Wysyłka 24h, Faktura VAT.
Language Priority: Polish (pl-PL), English (en-GB), German (de-DE).`;
    } else if (siteName === 'EXPERT3D' || siteName === 'Impresora-3D') {
      strategyContext = `Target Region: Spain 🇪🇸
Currency: EUR (€)
Main Value: Disponible bajo pedido, Garantía oficial.
Language Priority: Spanish (es-ES), English (en-ES), Ukrainian (uk-UA).`;
      siteSuffix = '| EXPERT3D'; 
    } else if (siteName === 'Expert-3DPrinter') {
      strategyContext = `Target Region: USA (Houston, Texas) 🇺🇸
Currency: USD ($)
Main Value: US Support, Free Shipping.
Language Priority: English (en-US), Spanish (es-MX), Ukrainian (uk-UA).`;
    } else {
      strategyContext = `Target Region: Global/EU
Currency: EUR (€)`;
    }

    const safeSymbols = `✨, ✅, ➔, !, +, %, |`; 

    return `Role: Senior SEO Specialist for High-Tech eCommerce.
Task: Generate optimized H1, Meta Title, and Meta Description tags following strict rules.

INPUT DATA:
Website: "${siteName}"
Product Name: "${productName}"
Target Languages: ${languages.join(', ')}

CONTEXT (Strategy):
${strategyContext}

${descriptionContext ? `PRODUCT HIGHLIGHTS (Extract USPs from here):
${descriptionContext.substring(0, 1000)}` : ''} 

==================================================
⚠️ TECHNICAL & DATABASE CONSTRAINTS (STRICT):
1. **ALLOWED SYMBOLS**: Use ONLY these safe symbols: ${safeSymbols}.
2. **FORBIDDEN SYMBOLS**: Do NOT use flags (🇺🇸), packages (📦) or complex emojis not listed above.
3. **LENGTH RULES**:
   - Title: MAX 55 characters (Strict limit).
   - Description: MAX 150 characters.
==================================================

GENERATION RULES:

1. **H1 Tag (MANDATORY)**: 
   - **Goal:** Create the main page heading.
   - **Syntax:** "[Product Name] [Model/Series]"
   - **Cleanup:** Remove marketing fluff (e.g., "Buy", "Best Price", "New"). Keep it strictly technical.
   - **Example:** "Creality K1 Max" (NOT "Buy Creality K1 Max Cheap").

2. **Meta Title** (Formula: "[Product] - [Benefit] [Suffix]"):
   - Suffix: "${siteSuffix}" (Mandatory).
   - **Constraint:** If Product Name is long (>50 chars), DROP the [Benefit] part. Just use "[Product Name] [Suffix]" to avoid truncation.
   - **Symbol Usage:** Use ONE safe symbol (✨ or ✅) to grab attention, but keep total length < 55 chars.

3. **Meta Description** (Pattern: "Hook + Solution + Specs + CTA"):
   - Start with a verb or problem.
   - Include 1 hard spec (e.g., size, speed, material) from context.
   - **MUST** end with CTA and arrow: "Buy now ➔" or equivalent in target language.
   - **MUST** include price symbol from context (${strategyContext.match(/Currency: (.+)/)?.[1] || '€'}).

OUTPUT FORMAT (JSON Only):
Return a raw JSON object with specific ISO codes for languages:
{
  "site_name": "${siteName}",
  "seo_data": [
    {
      "language": "ISO Code (e.g., en-US, es-ES, pl-PL, uk-UA)",
      "h1": "String (Clean Product Name)",
      "meta_title": "String (Max 55 chars)",
      "meta_description": "String (Max 155 chars, ends with CTA ➔)"
    }
  ]
}`;
  }

  private buildPromptC(html: string, targetLang: string, websiteGroup?: string): string {
    const isUsVariant = targetLang === 'American Spanish' || targetLang === 'American English' || 
                        targetLang.includes('American Spanish') || targetLang.includes('American English') ||
                        targetLang === 'European English' ||
                        (targetLang === 'Ukrainian' && websiteGroup === 'US') ||
                        targetLang === 'Ukrainian (Expert-3DPrinter)' ||
                        targetLang === 'European English (EXPERT3D)';

    if (isUsVariant) {
        return this.buildTranslatorPrompt(html, targetLang, websiteGroup);
    }

    return `Role: You are an experienced professional marketing translator specializing in technical and e-commerce topics. Your main task is to create high-quality, stylistically perfect, modern and SEO-optimized translations of marketing product descriptions.
Topics: 3D printers, 3D scanners, laser engravers, consumables and accessories.

### 🔄 **Language Detection Logic**
First, detect the language of the INPUT HTML content.
1.  **IF the detected language IS THE SAME as the Target Language (${targetLang}):**
    *   **Action:** Do NOT translate. Instead, **REWRITE and PARAPHRASE** the content.
    *   **Goal:** Improve the style, flow, and professional tone. Optimize for SEO keywords. Remove repetition or robotic phrasing. Make it sound native and high-converting.
2.  **IF the detected language IS DIFFERENT from the Target Language:**
    *   **Action:** Perform a standard high-quality translation.

### 📝 **Formatting & Safety Rules**
The translation/rewriting should be as SEO-friendly as possible, preserving and adapting keywords from the original text for the target market.
Use modern, professional, technically accurate terminology (without slang).
Specific formatting and punctuation rules:
Punctuation (Ukrainian/Russian): When translating into Ukrainian or Russian, the word that comes immediately after the colon (:) must start with a lowercase letter, unless it is a proper noun or a word that cannot be translated.
HTML and links: It is forbidden to translate HTML tags and URLs themselves.
Only the text inside the tags and the values of the attributes: alt="..." and title="..." are subject to translation.
The following tags cannot be translated: <b></b>, <i></i>, <p></p>, <span></span>, <a href="..."></a> and their attributes (href, class, id, etc.).
The following image links cannot be translated: <img src="URL_ADDRESS">.
CSS/JavaScript: All CSS code (<style>...</style>) and JavaScript code (<script>...</script>) must be left unchanged and must not be placed in code blocks (three backslashes).
Input /Output : If the input text is in HTML format, the output text in the code block must also be in HTML format.
Reqs: SEO friendly, Professional style, HTML aware (do not translate tags).
If input is HTML, output HTML.
Don't translate the Own Names.

### ⛔ **STRICT TRANSLATION CONSTRAINTS (NO LOCALIZATION)**
1. **NO GEOGRAPHIC CHANGES:** If the source text mentions specific countries, cities, or delivery zones (e.g., "Spain", "USA", "Europe"), translate them LITERALLY. Do NOT change "Spain" to "Ukraine" (or any other country) just because the target language is different.
2. **NO BRAND/STORE CHANGES:** Do not change or adapt store names, phone numbers, or contact intents unless explicitly instructed.
3. **NO ADDED CLAIMS:** Translate the meaning exactly. Do not add free shipping, warranties, or services not explicitly stated in the original text.

CRITICAL OUTPUT RULE: Return ONLY the raw HTML string. Do NOT wrap the output in markdown code blocks (like \`\`\`html). Do NOT add any conversational text.

TARGET LANGUAGE: ${targetLang}
INPUT HTML:
${html}`;
  }

  private buildTranslatorPrompt(content: string, targetLang: string, websiteGroup?: string): string {
    if (targetLang === 'European English' || targetLang === 'European English (EXPERT3D)') {
        return `### 🎯 **Role and Context**
You are a **Native European Marketing Copywriter & Localization Expert**.
Your goal is to **translate and adapt** product descriptions from the source language into high-converting, natural **European English (en-GB/en-EU)** specifically for the European market.

The store sells 3D printing equipment to European engineers, businesses, and hobbyists.

### 🔄 **Edge Case: Same Language Input**
Check the language of the INPUT CONTENT.
*   **IF the input is ALREADY in English:**
    *   **Action:** Treat this as a **Copy Editing & Polishing** task.
    *   **Goal:** Apply all the European Localization rules below. Improve flow, fix grammar, and ensure a "native European marketing" feel. Do NOT simply output the exact same text.
*   **IF the input is different:**
    *   **Action:** Translate and Localize normally.

### ⚙️ **Process and Output Structure**
Return ONLY the localized text in European English. Do not add any headers or separators.

### 🛡️ **Localization & Safety Rules (Crucial)**
1.  **STRICTLY European/British English:** Use British spelling (e.g., "colour", "customise", "fibre", "optimise"). It MUST NOT be American English (en-US).
2.  **Measurement System:** Strictly maintain Metric units (mm, °C, kg) which are standard for Europe. Do NOT convert to Imperial units.

### ✍️ **REWRITING & STYLE RULES (Transcreation)**
1.  **Tone:** Direct, confident, professional but accessible.
2.  **Burstiness:** Use a mix of short and medium-length sentences to sound human.

### ⛔ **Negative Constraints (Do NOT do this)**
1.  **Do NOT translate Brand/Model Names:** Keep Creality, Ender, Saturn, Neptune in English.
2.  **Do NOT translate File Names:** <img src="..."> intact.
3.  **Do NOT Add New Information:** Do NOT add marketing claims, "We offer", or brand promises that are not present in the source text. Transcreate the style, but preserve the original semantic meaning strictly.

### ⚙️ **HTML & Formatting Strict Rules**
1.  **Raw Output:** Return **ONLY** the HTML content. NO markdown blocks.
2.  **Structure Integrity:** Do not remove tags (<p>, <div>, <ul>).
3.  **SEO Attributes:** You **MUST** translate and adapt text inside \`alt="..."\` and \`title="..."\`.

### 📥 **INPUT CONTENT:**
${content}`;
    }

    if ((targetLang === 'Ukrainian' && websiteGroup === 'US') || targetLang === 'Ukrainian (Expert-3DPrinter)') {
        return `### 🎯 **Role and Context**
You are a **Native Ukrainian Marketing Copywriter & Localization Expert**.
Your goal is to **translate and adapt** product descriptions from the source language into high-converting, natural **Ukrainian** for a product sold in the US market.

### ⚙️ **Process and Output Structure**
Return ONLY the localized text in Ukrainian. Do not add any headers or separators.

### 🛡️ **Localization & Safety Rules (Crucial)**
1.  **CRITICAL MEASUREMENT CONSTRAINT:** Even though the text is being translated into Ukrainian, if the original US text contains Imperial units (inches, lbs), the Ukrainian translation MUST preserve these Imperial units (дюйми, фунти) and NOT convert them to Metric. This is because the product is still being sold in the US market.

### ✍️ **REWRITING & STYLE RULES (Transcreation)**
1.  **Tone:** Direct, confident, professional but accessible.
2.  **Burstiness:** Use a mix of short and medium-length sentences to sound human.

### ⛔ **Negative Constraints (Do NOT do this)**
1.  **Do NOT translate Brand/Model Names:** Keep Creality, Ender, Saturn, Neptune in English.
2.  **Do NOT translate File Names:** <img src="..."> intact.
3.  **Do NOT Add New Information:** Do NOT add marketing claims, "We offer", or brand promises that are not present in the source text. Transcreate the style, but preserve the original semantic meaning strictly.

### ⚙️ **HTML & Formatting Strict Rules**
1.  **Raw Output:** Return **ONLY** the HTML content. NO markdown blocks.
2.  **Structure Integrity:** Do not remove tags (<p>, <div>, <ul>).
3.  **SEO Attributes:** You **MUST** translate and adapt text inside \`alt="..."\` and \`title="..."\`.

### 📥 **INPUT CONTENT:**
${content}`;
    }

    if (targetLang.includes('American English') || targetLang.includes('American Spanish')) {
        const isEnglish = targetLang.includes('American English');
        const languageInstruction = isEnglish
            ? 'Translate/localize the input text into **American English (en-US)**.'
            : 'Translate/localize the input text into **US/Latin American Spanish (es-US)**.';

        const outputStructureInstruction = isEnglish
            ? 'Return ONLY the localized text in American English. Do not add any headers or separators.'
            : 'Return ONLY the localized text in Spanish (Latin/US). Do not add any headers or separators.';

        return `### 🎯 **Role and Context**
You are a **Native US Marketing Copywriter & Localization Expert** based in **Houston, Texas**.
Your goal is to **translate and adapt** product descriptions from the source language into high-converting, natural **${languageInstruction}** specifically for the US market.

The store sells products from global brands (Creality, Anycubic, Elegoo) to American engineers, businesses, and hobbyists.

### 🔄 **Edge Case: Same Language Input**
Check the language of the INPUT CONTENT.
*   **IF the input is ALREADY in the Target Language** (e.g., Input is English and Target is American English):
    *   **Action:** Treat this as a **Copy Editing & Polishing** task.
    *   **Goal:** Apply all the US Localization rules below (Measurement, Tone, Terms). Improve flow, fix grammar, and ensure a "native US marketing" feel. Do NOT simply output the exact same text.
*   **IF the input is different:**
    *   **Action:** Translate and Localize normally.

### ⚙️ **Process and Output Structure**
${outputStructureInstruction}

${this.getUsMeasurementRules()}

### 🛡️ **Localization & Safety Rules (Crucial)**
Match the content to the reality of a US-based business:

| Category | Source Concept | Action / Replacement |
| :--- | :--- | :--- |
| **Branding** | "3DDevice" | Replace with **"Expert-3DPrinter"**. |
| **Geography** | Ukraine / Kyiv / Lviv | Replace with **"USA" / "Texas" / "Houston"**. |
| **Logistics** | Nova Poshta / Ukrposhta | Replace with **"US carriers (UPS, FedEx)"**. |
| **Delivery** | Specific local promises | **REPLACE with:** "Fast shipping across the USA" or "Orders processed within 24h". |
| **Contacts** | UA Phone Numbers | Replace with: **"our Texas support team"** OR specific US number. |
| **Terminology** | "3D Plastic" | Replace with **"Filament"** (English) or **"Filamento"** (Spanish). |

### ✍️ **REWRITING & STYLE RULES (Transcreation)**
1.  **Change the Rhythm:** Do not follow the source sentence structure 1:1. Break long complex sentences into shorter, punchy ones typical for US marketing.
2.  **Focus on Benefits:**
    *   *Source:* "The printer has a closed chamber which allows printing ABS."
    *   *US Adaptation:* "Print warp-free ABS parts easily thanks to the fully enclosed chamber." (Active voice, benefit-first).
3.  **US Tone:** Direct, confident, professional but accessible. Avoid "fluff" like "It is important to note that...".
4.  **Burstiness:** Use a mix of short and medium-length sentences to sound human.

### ⛔ **Negative Constraints (Do NOT do this)**
1.  **Do NOT translate Brand/Model Names:** Keep Creality, Ender, Saturn, Neptune in English.
2.  **Do NOT translate File Names:** <img src="..."> intact.
3.  **Do NOT convert technical metric standards:** (See Measurement System section).
4.  **Do NOT Add New Information:** Do NOT add marketing claims, "We offer", or brand promises that are not present in the source text. Transcreate the style, but preserve the original semantic meaning strictly.

### ⚙️ **HTML & Formatting Strict Rules**
1.  **Raw Output:** Return **ONLY** the HTML content. NO markdown blocks.
2.  **Structure Integrity:** Do not remove tags (<p>, <div>, <ul>).
3.  **SEO Attributes:** You **MUST** translate and adapt text inside \`alt="..."\` and \`title="..."\`.

### 📥 **INPUT CONTENT:**
${content}`;
    }

    if (targetLang === 'Spanish (EXPERT3D)') {
        return `### 🎯 **Role and Context**
You are a **Native Spanish Copywriter & Localization Expert** based in **Valencia, Spain**.
Your goal is to **translate and adapt** product descriptions from the source language into natural, persuasive, and SEO-friendly **Castilian Spanish (Español de España, es-ES)**.

The store **"EXPERT3D"** sells 3D printing equipment to Spanish engineers, makers, and businesses.

### 🔄 **Edge Case: Same Language Input**
Check the language of the INPUT CONTENT.
*   **IF the input is ALREADY in Spanish:**
    *   **Action:** Treat this as a **Stylistic Improvement & SEO Optimization** task.
    *   **Goal:** Enforce the "Castilian Spanish" style defined below. Improve persuasion, fix errors, and ensure professional tone.
*   **IF the input is different:**
    *   **Action:** Translate and Localize normally.

### ⚙️ **Process and Output Structure**
Return **ONLY** the localized HTML string. No markdown blocks.

### 🛡️ **Localization Rules (Crucial)**
Adapt the content to the reality of the Spanish market:

| Category | Source Concept | Action / Replacement |
| :--- | :--- | :--- |
| **Store Name** | "3DDevice" / "Center 3D Print" | Replace with **"EXPERT3D"**. |
| **Geography** | Ukraine / Kyiv | Replace with **"España"** or **"Valencia"**. |
| **Shipping** | Specific UA carriers | Replace with **"envío urgente 24/48h"** or **"mensajería urgente"**. |
| **Support** | UA Phone Numbers | Replace with: **"nuestro soporte técnico"**. |
| **Currency** | Prices in UAH/USD | **REMOVE** specific prices. Use: "excelente calidad-precio" or "inversión rentable". |
| **Terminology** | "3D Plastic" | Replace with **"Filamento"**. |

### ✍️ **REWRITING & STYLE RULES (Transcreation)**
1.  **Break the "Translation" Rhythm:**
    *   Do not follow the source sentence structure 1:1.
    *   *Source:* "The printer is characterized by high speed."
    *   *ES Adaptation:* "Imprime más rápido que nunca gracias a su cinemática mejorada." (Active, benefit-focused).
2.  **Tone (Cercano y Profesional):**
    *   Use **"Tú"** (Tuteo) to address the user directly. It creates trust in Spain.
    *   Avoid robotic passives. Instead of "It is recommended", use "Te recomendamos".
3.  **Focus on Results:** Spanish buyers value reliability and finish quality. Emphasize "acabados profesionales" (professional finishes) and "fiabilidad" (reliability).
4.  **Avoid Repetition:** Spanish allows for richer vocabulary than English. Use synonyms to avoid repeating "impresora" or "imprimir" in every sentence.

### 🗣️ **Dialect & Vocabulary (Strict es-ES)**
*   **YES:** Ordenador, Móvil, Vídeo (accented), Fichero, Coche.
*   **NO:** Computadora, Celular, Video, Archivo (okay but Fichero is common), Carro.
*   **Tech Terms:**
    *   "Resin" -> **"Resina"**.
    *   "Slicer" -> **"Laminador"** (preferred formal) or "Slicer" (common slang).
    *   "Bed/Plate" -> **"Plataforma"** or **"Cama caliente"**.

### ⛔ **Negative Constraints**
1.  **Do NOT translate Brand Names:** Creality, Anycubic, Elegoo, Bambu Lab -> Keep Original.
2.  **Do NOT translate File Names:** <img src="..."> -> Keep Original.
3.  **Do NOT convert Metrics:** Keep mm, cm, kg, °C. Do NOT use Imperial units.
4.  **Do NOT break Links:** NEVER change hrefs to "#". If you don't have a replacement, keep the original URL.
5.  **Do NOT Add New Information:** Do NOT add marketing claims, "En EXPERT3D ofrecemos...", or brand promises that are not present in the source text. Transcreate the style, but preserve the original semantic meaning strictly.

### ⚙️ **HTML & Formatting**
1.  **Raw Output:** Return **ONLY** the HTML content.
2.  **Structure Integrity:** Preserve <p>, <div>, <ul>, <strong> tags.
3.  **SEO:** Translate and adapt text inside \`alt="..."\` and \`title="..."\`.

### 📥 **INPUT CONTENT:**
${content}`;
  }

  // ✅ ДОДАЙТЕ ЦЕЙ РЯДОК:
    // Якщо мова стандартна, використовуємо загальний промпт для перекладу
    return this.buildPromptC(content, targetLang);
}
}

