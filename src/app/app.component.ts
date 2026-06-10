import { Component, signal, inject, computed, effect, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentOrchestratorService } from '../services/content-orchestrator.service';
import { HistoryService } from '../services/history.service';
import { LlmService } from '../services/llm.service';
import { WebsiteOption, WEBSITE_OPTIONS, ProductInput, SeoMetaItem, HistoryItem, ProcessedImage, AppMode, CONTENT_TEMPLATES, ContentTemplate, ImageManifestEntry } from './types';
import { normalizeImageFilename } from '../utils/image-filename';
import { buildVisionPrepassPrompt } from '../prompts/vision-prepass';
import { downloadPackage, downloadTextPackage, downloadImagesPackage } from '../utils/zip-generator';
import { SafeHtmlPipe } from './pipes/safe-html.pipe';
import { SourceInputComponent } from './components/source-input/source-input.component';
import { HighlightCodeDirective } from './directives/highlight-code.directive';
import saveAs from 'file-saver';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface InputImage {
  file: File;
  previewUrl: string;
}

const TRANSLATIONS = {
  en: {
    appTitle: 'SEO Content',
    generator: 'Generator',
    optimizer: 'Optimizer',
    translator: 'Translator',
    imageTools: 'Image Tools',
    seoGenerator: 'SEO Meta',
    copywriter: 'Copywriter',
    seoGenBtn: 'Generate Metadata',
    seoOnlyTitle: 'SEO Metadata Generator',
    contextDescription: 'Context Description',
    seoOnlyPlaceholder: 'Paste the product description here (Text or HTML) to provide context...',
    targetWebsite: 'Target Website',
    selectWebsite: 'Select Website...',
    productName: 'Product Name',
    originalDescription: 'Original Description',
    techSpecs: 'Tech Specs',
    inputText: 'Text',
    inputPdf: 'PDF',
    inputUrl: 'URL',
    inputMd: 'MD',
    pdfDrop: 'Click to upload PDF',
    pdfReady: 'PDF processed (Ready)',
    pdfHint: 'Gemini will extract text',
    mdDrop: 'Click to upload Markdown file(s)',
    mdReady: 'Markdown loaded',
    mdHint: 'Reads .md files locally (no upload)',
    urlPlaceholder: 'https://example.com/product',
    fetchUrl: 'Fetch',
    urlSuccess: 'Content fetched successfully',
    urlHint: 'Fetches and extracts page content',
    rawHtmlInput: 'Raw HTML Input',
    optTasks: 'Automated tasks:',
    optTask1: 'Generate alt/title for images',
    optTask2: 'Remove fixed style widths',
    optTask3: 'Highlight keywords (strong)',
    targetLang: 'Target Language',
    contentToTrans: 'Content to Translate',
    transFeatures: 'Features:',
    transFeat1: 'Professional Marketing Style',
    transFeat2: 'Preserves HTML/CSS/JS',
    transFeat3: 'Checks for source errors',
    generateBtn: 'Generate Content',
    optimizeBtn: 'Optimize HTML',
    cleanStructureBtn: 'Clean Structure (Fast)',
    translateBtn: 'Translate Content',
    rewriteBtn: 'Rewrite Content',
    processing: 'Processing...',
    optimizing: 'Optimizing...',
    translating: 'Translating...',
    rewriting: 'Rewriting...',
    clearAll: 'Clear All',
    historyTitle: 'Generation History',
    noHistory: 'No history yet.',
    compareSelected: 'Compare Selected',
    clearHistory: 'Clear History',
    compareTitle: 'Compare Versions',
    htmlCode: 'HTML Code',
    seoMeta: 'SEO Metadata',
    englishOutput: 'US English Output',
    englishOutputGeneric: 'English',
    copyCode: 'Copy Code',
    htmlSource: 'HTML Source',
    livePreview: 'Live Preview (Rendered)',
    h1Tag: 'H1 Tag',
    metaTitle: 'Meta Title',
    metaDesc: 'Meta Description',
    copyAllSeo: 'Copy All SEO Fields',
    optResult: 'Optimization Result',
    copyHtml: 'Copy HTML',
    transResult: 'Translation Result',
    copyContent: 'Copy Content',
    rewriteResult: 'Rewritten Content',
    copyRewrite: 'Copy Rewritten Text',
    chatTitle: 'Context Assistant',
    chatPlaceholder: 'Ask about your content...',
    alertFillFields: 'Please fill in all mandatory fields:\n- Target Website\n- Product Name\n- Original Description',
    alertHistoryClear: 'Are you sure you want to delete all generated history? This cannot be undone.',
    readyOptimize: 'Ready to Optimize',
    pasteHtmlStart: 'Paste HTML in the sidebar to start.',
    readyTranslate: 'Ready to Translate',
    selectLangStart: 'Select language and paste text to start.',
    noContentYet: 'No content generated yet',
    fillFormStart: 'Select a website, fill the form, and click Generate.',
    translation: 'Translation',
    placeholderName: 'e.g. Creality K1 Max',
    placeholderDesc: 'Paste original text here...',
    placeholderSpecs: 'Paste raw specs list here...',
    placeholderHtml: 'Paste your raw HTML here...',
    placeholderTrans: 'Paste text or HTML here...',
    placeholderRewrite: 'Paste text or HTML to rewrite here...',
    textToRewrite: 'Text to Rewrite',
    supplementalContent: 'Supplemental Content (Optional)',
    placeholderSupplemental: 'Paste How-To guides or FAQs here...',
    customInstructions: 'Custom Instructions (Optional)',
    placeholderInstructions: 'e.g., "Write in a more casual tone", "Focus on durability for industrial use."',
    keywordAnalysis: 'Keyword Density',
    imgSelectImages: 'Select Images',
    imgDropZone: 'Drag & Drop or Click to Upload',
    imgFormat: 'Format',
    imgQuality: 'Quality (Compression)',
    imgAiAlt: 'Generate AI Alt Text',
    imgAiAltHint: 'Requires API Key',
    imgProcessBtn: 'Process Images',
    imgProcessing: 'Converting...',
    imgResults: 'Results',
    imgDownload: 'Download',
    imgDownloadAll: 'Download All (ZIP)',
    imgDownloadJson: 'Download JSON',
    imgSize: 'Size',
    imgOriginal: 'Original',
    imgBalanced: 'Balanced (Web Recommended)',
    imgSmaller: 'Smaller File',
    readability: 'Readability',
    readabilityTitle: 'Readability & Clarity Analysis',
    readabilityPlaceholder: 'Paste text here to analyze its readability and get optimization suggestions...',
    analyzeBtn: 'Analyze Readability',
    readabilityScore: 'Readability Score',
    readabilityLevel: 'Clarity Level',
    readabilityIssues: 'Potential Issues',
    readabilitySuggestions: 'Optimization Suggestions',
    optimizedVersion: 'Optimized Version',
    readabilityResults: 'Readability Analysis Results',
    readabilityOptimized: 'Optimized Content',
    copyOptimized: 'Copy Optimized Text',
    pastePlain: 'Paste Text',
    seoKeywords: 'Keyword Ideas',
    getKeywords: 'Get Suggestions',
    analyzingKeywords: 'Analyzing...',
    contentTemplate: 'Content Template',
    selectTemplate: 'Select Template...',
    customTemplate: 'Custom Template Structure',
    titlePattern: 'Title Pattern',
    headingStructure: 'Heading Structure (comma separated)',
    bodyFocus: 'Body Focus',
    keywordStrategy: 'Keyword Strategy',
    validationTitle: 'Acceptance criteria check',
    validationErrorsLabel: 'error(s)',
    validationWarningsLabel: 'warning(s)',
  },
  uk: {
    appTitle: 'SEO Content',
    generator: 'Генератор',
    optimizer: 'Оптимізатор',
    translator: 'Перекладач',
    imageTools: 'Інструменти зображень',
    seoGenerator: 'SEO Мета',
    copywriter: 'Копірайтер',
    seoGenBtn: 'Генерувати метадані',
    seoOnlyTitle: 'Генератор SEO метаданих',
    contextDescription: 'Опис для контексту',
    seoOnlyPlaceholder: 'Вставте опис товару сюди (Текст або HTML) для контексту...',
    targetWebsite: 'Цільовий сайт',
    selectWebsite: 'Оберіть сайт...',
    productName: 'Назва товару',
    originalDescription: 'Опис товару',
    techSpecs: 'Тех. характеристики',
    inputText: 'Текст',
    inputPdf: 'PDF',
    inputUrl: 'URL',
    inputMd: 'MD',
    pdfDrop: 'Натисніть для завантаження PDF',
    pdfReady: 'PDF оброблено (Готово)',
    pdfHint: 'Gemini витягне текст',
    mdDrop: 'Натисніть, щоб завантажити Markdown-файл(и)',
    mdReady: 'Markdown завантажено',
    mdHint: 'Читає .md локально (без вивантаження)',
    urlPlaceholder: 'https://example.com/product',
    fetchUrl: 'Знайти',
    urlSuccess: 'Контент отримано успішно',
    urlHint: 'Завантажує та витягує вміст сторінки',
    rawHtmlInput: 'Вхідний HTML',
    optTasks: 'Автоматичні задачі:',
    optTask1: 'Генерація alt/title для зображень',
    optTask2: 'Видалення фіксованої ширини',
    optTask3: 'Виділення ключових слів (strong)',
    targetLang: 'Цільова мова',
    contentToTrans: 'Контент для перекладу',
    transFeatures: 'Особливості:',
    transFeat1: 'Професійний маркетинговий стиль',
    transFeat2: 'Збереження HTML/CSS/JS',
    transFeat3: 'Перевірка помилок джерела',
    generateBtn: 'Згенерувати',
    optimizeBtn: 'Оптимізувати',
    cleanStructureBtn: 'Очистити структуру (Швидко)',
    translateBtn: 'Перекласти',
    rewriteBtn: 'Переписати',
    processing: 'Обробка...',
    optimizing: 'Оптимізація...',
    translating: 'Переклад...',
    rewriting: 'Переписую...',
    clearAll: 'Очистити все',
    historyTitle: 'Історія генерацій',
    noHistory: 'Історія порожня.',
    compareSelected: 'Порівняти обрані',
    clearHistory: 'Очистити історію',
    compareTitle: 'Порівняння версій',
    htmlCode: 'HTML код',
    seoMeta: 'SEO метадані',
    englishOutput: 'Результат (Англійська)',
    englishOutputGeneric: 'Англійська',
    copyCode: 'Копіювати код',
    htmlSource: 'Джерело HTML',
    livePreview: 'Попередній перегляд',
    h1Tag: 'Тег H1',
    metaTitle: 'Meta Title',
    metaDesc: 'Meta Description',
    copyAllSeo: 'Копіювати все SEO',
    optResult: 'Результат оптимізації',
    copyHtml: 'Копіювати HTML',
    transResult: 'Результат перекладу',
    copyContent: 'Копіювати контент',
    rewriteResult: 'Результат переписування',
    copyRewrite: 'Копіювати текст',
    chatTitle: 'Асистент контексту',
    chatPlaceholder: 'Запитайте про ваш контент...',
    alertFillFields: 'Будь ласка, заповніть обов\'язкові поля:\n- Цільовий сайт\n- Назва товару\n- Оригінальний опис',
    alertHistoryClear: 'Ви впевнені, що хочете видалити всю історію? Цю дію неможливо відмінити.',
    readyOptimize: 'Готовий до оптимізації',
    pasteHtmlStart: 'Вставте HTML у бічну панель, щоб почати.',
    readyTranslate: 'Готовий до перекладу',
    selectLangStart: 'Оберіть мову та вставте текст, щоб почати.',
    noContentYet: 'Контент ще не згенеровано',
    fillFormStart: 'Оберіть сайт, заповніть форму та натисніть Згенерувати.',
    translation: 'Переклад',
    placeholderName: 'напр. Creality K1 Max',
    placeholderDesc: 'Вставте оригінальний текст сюди...',
    placeholderSpecs: 'Вставте список характеристик...',
    placeholderHtml: 'Вставте ваш raw HTML сюди...',
    placeholderTrans: 'Вставте текст або HTML сюди...',
    placeholderRewrite: 'Вставте текст або HTML для переписування сюди...',
    textToRewrite: 'Текст для переписування',
    supplementalContent: 'Додатковий контент (Опціонально)',
    placeholderSupplemental: 'Вставте інструкції (How-To) або FAQ сюди...',
    customInstructions: 'Додаткові інструкції (Опціонально)',
    placeholderInstructions: 'напр., "Писати в більш неформальному стилі", "Зосередитись на міцності для промислового використання."',
    keywordAnalysis: 'Щільність ключових слів',
    imgSelectImages: 'Обрати зображення',
    imgDropZone: 'Перетягніть або натисніть',
    imgFormat: 'Формат',
    imgQuality: 'Якість (Стиснення)',
    imgAiAlt: 'Генерувати AI Alt текст',
    imgAiAltHint: 'Потрібен API Key',
    imgProcessBtn: 'Обробити',
    imgProcessing: 'Конвертація...',
    imgResults: 'Результати',
    imgDownload: 'Завантажити',
    imgDownloadAll: 'Завантажити все (ZIP)',
    imgDownloadJson: 'Завантажити JSON',
    imgSize: 'Розмір',
    imgOriginal: 'Оригінал',
    imgBalanced: 'Збалансовано (Для Web)',
    imgSmaller: 'Менший файл',
    readability: 'Читабельність',
    readabilityTitle: 'Аналіз читабельності та чіткості',
    readabilityPlaceholder: 'Вставте текст сюди, щоб проаналізувати його читабельність та отримати пропозиції щодо оптимізації...',
    analyzeBtn: 'Аналізувати читабельність',
    readabilityScore: 'Показник читабельності',
    readabilityLevel: 'Рівень чіткості',
    readabilityIssues: 'Потенційні проблеми',
    readabilitySuggestions: 'Пропозиції щодо оптимізації',
    optimizedVersion: 'Оптимізована версія',
    readabilityResults: 'Результати аналізу читабельності',
    readabilityOptimized: 'Оптимізований контент',
    copyOptimized: 'Копіювати оптимізований текст',
    pastePlain: 'Вставити текст',
    seoKeywords: 'Ідеї ключових слів',
    getKeywords: 'Отримати ідеї',
    analyzingKeywords: 'Аналіз...',
    contentTemplate: 'Шаблон контенту',
    selectTemplate: 'Оберіть шаблон...',
    customTemplate: 'Власна структура шаблону',
    titlePattern: 'Патерн заголовка',
    headingStructure: 'Структура підзаголовків (через кому)',
    bodyFocus: 'Фокус тексту',
    keywordStrategy: 'Стратегія ключових слів',
    validationTitle: 'Перевірка критеріїв якості',
    validationErrorsLabel: 'помилок',
    validationWarningsLabel: 'попереджень',
  }
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe, SourceInputComponent, HighlightCodeDirective],
  templateUrl: './app.component.html',
})
export class AppComponent implements AfterViewChecked {
  private orchestrator = inject(ContentOrchestratorService);
  private historyService = inject(HistoryService);
  private llmService = inject(LlmService);

  @ViewChild('chatContainer') chatContainer?: ElementRef;

  // App Mode
  appMode = signal<AppMode>('generator');

  // UI Language
  uiLanguage = signal<'en' | 'uk'>('en');

  // Computed Labels
  uiLabels = computed(() => TRANSLATIONS[this.uiLanguage()]);

  // Dark Mode
  darkMode = signal<boolean>(false);

  // Real Options
  websiteOptions = WEBSITE_OPTIONS;
  translatorLanguages = [
    'English', 
    'American English (Expert-3DPrinter)', 
    'American Spanish (Expert-3DPrinter)', 
    'European English (EXPERT3D)',
    'Spanish (EXPERT3D)', 
    'Polish', 
    'German', 
    'Ukrainian', 
    'Ukrainian (Expert-3DPrinter)',
    'Russian', 
    'Spanish'
  ];

  // --- GENERATOR STATE ---
  selectedWebsite = signal<WebsiteOption | null>(null);
  productName = signal<string>('');
  description = signal<string>('');
  specs = signal<string>('');
  supplementalContent = signal<string>('');
  customInstructions = signal<string>('');
  generatorUseThinking = signal<boolean>(true); // Default to true as per original behavior

  // --- TEMPLATE STATE ---
  availableTemplates = CONTENT_TEMPLATES;
  selectedTemplateId = signal<string>('');
  customTemplate = signal<Partial<ContentTemplate['structure']>>({});
  showCustomTemplate = signal<boolean>(false);
  
  // --- OPTIMIZER STATE ---
  optimizerInputHtml = signal<string>('');
  optimizerUseThinking = signal<boolean>(false);

  // --- TRANSLATOR STATE ---
  translatorInput = signal<string>('');
  translatorTargetLang = signal<string>('English');
  translatorUseThinking = signal<boolean>(false);

  // --- COPYWRITER STATE ---
  copywriterInput = signal<string>('');
  copywriterUseThinking = signal<boolean>(false);

  // --- SEO GENERATOR STATE ---
  seoUseThinking = signal<boolean>(false);

  // --- IMAGE TOOLS STATE ---
  imgFiles = signal<InputImage[]>([]);
  imgTargetFormat = signal<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  imgQuality = signal<number>(0.85);
  imgUseAiAlt = signal<boolean>(false);
  imgResults = signal<ProcessedImage[]>([]);
  isImgProcessing = signal<boolean>(false);

  // --- GENERATOR IMAGE MANIFEST STATE ---
  genImgManifest = signal<ImageManifestEntry[]>([]);
  genBrandFolder = signal<string>('');
  genModelFolder = signal<string>('');
  isVisionAnalyzing = signal<boolean>(false);
  visionAnalyzedCount = signal<number>(0);
  private genImgFileMap = new Map<string, File>();

  // --- READABILITY STATE ---
  readabilityInput = signal<string>('');
  readabilityResult = this.orchestrator.readabilityScore;

  // UI State
  activeTab = signal<string>('html');
  showHistory = signal(false);

  // --- COMPARISON STATE ---
  comparisonIds = signal<string[]>([]);
  showComparison = signal(false);
  comparisonTab = signal<'html' | 'seo'>('html');

  // --- CHAT STATE ---
  isChatOpen = signal(false);
  isChatThinking = signal(false);
  chatMessages = signal<ChatMessage[]>([]);
  chatInput = signal('');
  private chatInitialized = false;

  // Orchestrator Signals Proxies
  isGenerating = this.orchestrator.isGenerating;
  progressMessage = this.orchestrator.progressMessage;
  content = this.orchestrator.content;
  optimizerOutput = this.orchestrator.optimizerOutput;
  translatorOutput = this.orchestrator.translatorOutput;
  copywriterOutput = this.orchestrator.copywriterOutput;
  suggestedKeywords = this.orchestrator.suggestedKeywords;
  isSuggestingKeywords = this.orchestrator.isSuggestingKeywords;

  // Post-generation acceptance-criteria check results.
  validationIssues = this.orchestrator.validationIssues;
  validationErrorCount = computed(() => this.validationIssues().filter(i => i.severity === 'error').length);
  validationWarningCount = computed(() => this.validationIssues().filter(i => i.severity === 'warning').length);

  // True once any generated artifact exists — drives form placement (centred vs sidebar).
  hasOutput = computed(() => !!this.content().mainHtmlEn || !!this.content().seoData);

  // "US English Output" only for the US store; plain "English" for all other groups.
  // Uses website recorded on the generated content so a post-generation dropdown change
  // does not relabel an already-shown result.
  baseOutputLabel = computed(() => {
    const group = this.content().website?.group ?? this.selectedWebsite()?.group;
    return group === 'US'
      ? this.uiLabels().englishOutput
      : this.uiLabels().englishOutputGeneric;
  });

  historyItems = this.historyService.history;

  constructor() {
    const savedState = localStorage.getItem('seo_gen_form_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.websiteName) {
          const site = this.websiteOptions.find(w => w.name === parsed.websiteName);
          if (site) this.selectedWebsite.set(site);
        }
        if (parsed.productName) this.productName.set(parsed.productName);
        if (parsed.description) this.description.set(parsed.description);
        if (parsed.specs) this.specs.set(parsed.specs);
        if (parsed.customInstructions) this.customInstructions.set(parsed.customInstructions);
      } catch (e) {
        console.error('Failed to restore form state', e);
      }
    }

    const savedDark = localStorage.getItem('seo_gen_dark_mode');
    if (savedDark) {
      this.darkMode.set(JSON.parse(savedDark));
    }

    const savedLang = localStorage.getItem('seo_gen_ui_lang');
    if (savedLang === 'uk' || savedLang === 'en') {
      this.uiLanguage.set(savedLang);
    }

    effect(() => {
      const state = {
        websiteName: this.selectedWebsite()?.name || null,
        productName: this.productName(),
        description: this.description(),
        specs: this.specs(),
        customInstructions: this.customInstructions()
      };
      localStorage.setItem('seo_gen_form_state', JSON.stringify(state));
    });

    effect(() => {
      localStorage.setItem('seo_gen_dark_mode', JSON.stringify(this.darkMode()));
      if (this.darkMode()) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });

    effect(() => {
      localStorage.setItem('seo_gen_ui_lang', this.uiLanguage());
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom() {
    if (this.chatContainer) {
      const el = this.chatContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  isFormValid = computed(() => {
    const hasWebsite = this.selectedWebsite() !== null;
    const hasName = this.productName().trim().length > 0;
    const hasDescription = this.description().trim().length > 0;
    return hasWebsite && hasName && hasDescription;
  });

  isOptimizerValid = computed(() => this.optimizerInputHtml().trim().length > 0);

  isTranslatorValid = computed(() => this.translatorInput().trim().length > 0);
  
  isReadabilityValid = computed(() => this.readabilityInput().trim().length > 0);
  
  isCopywriterValid = computed(() => this.selectedWebsite() && this.copywriterInput().trim().length > 0);

  keywordAnalysis = computed(() => {
    const html = this.content().mainHtmlEn;
    if (!html) return [];

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body.textContent || '';
    
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    const totalWords = words.length;
    if (totalWords === 0) return [];

    const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'you', 'are', 'not', 'have', 'was', 'but', 'all', 'can', 'will', 'has', 'one', 'out', 'into', 'about', 'our', 'your', 'more', 'its', 'they', 'their', 'what', 'which', 'when', 'who', 'how', 'why', 'any', 'some', 'than', 'then', 'now', 'also', 'use', 'using', 'used', 'new', 'only', 'just', 'like', 'see', 'get', 'make', 'made', 'does', 'did', 'done', 'been', 'being', 'very', 'much', 'many', 'most', 'such', 'other', 'over', 'under', 'between', 'through', 'where', 'while', 'since', 'after', 'before', 'during', 'without', 'within']);
    const counts: Record<string, number> = {};
    
    words.forEach(w => {
      if (!STOP_WORDS.has(w) && !/^\d+$/.test(w)) {
        counts[w] = (counts[w] || 0) + 1;
      }
    });

    return Object.entries(counts)
        .map(([word, count]) => ({ word, count, density: (count / totalWords) * 100 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
  });

  selectedComparisonItems = computed(() => {
    return this.historyItems().filter(h => this.comparisonIds().includes(h.id));
  });

  getTranslationKeys() {
    return Object.keys(this.content().translations);
  }

  toggleDarkMode() {
    this.darkMode.update(v => !v);
  }

  toggleLanguage() {
    this.uiLanguage.update(l => l === 'en' ? 'uk' : 'en');
  }

  setMode(mode: AppMode) {
    this.appMode.set(mode);
  }

  onWebsiteChange(event: Event) {
    const siteName = (event.target as HTMLSelectElement).value;
    if (!siteName) {
      this.selectedWebsite.set(null);
      return;
    }
    const site = this.websiteOptions.find(s => s.name === siteName);
    if (site) {
      this.selectedWebsite.set(site);
    }
  }

  onTemplateChange(event: Event) {
    const templateId = (event.target as HTMLSelectElement).value;
    this.selectedTemplateId.set(templateId);
    if (!templateId) {
      this.showCustomTemplate.set(false);
    }
  }

  toggleCustomTemplate() {
    this.showCustomTemplate.update(v => !v);
  }

  updateCustomTemplate(field: keyof ContentTemplate['structure'], event: Event) {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.customTemplate.update(current => {
      if (field === 'headingStructure') {
        return { ...current, [field]: value.split(',').map(s => s.trim()).filter(s => s.length > 0) };
      }
      return { ...current, [field]: value };
    });
  }

  updateProductName(event: Event) { this.productName.set((event.target as HTMLInputElement).value); }
  updateCustomInstructions(event: Event) { this.customInstructions.set((event.target as HTMLTextAreaElement).value); }
  updateOptimizerInput(event: Event) { this.optimizerInputHtml.set((event.target as HTMLTextAreaElement).value); }
  updateTranslatorInput(event: Event) { this.translatorInput.set((event.target as HTMLTextAreaElement).value); }
  updateReadabilityInput(event: Event) { this.readabilityInput.set((event.target as HTMLTextAreaElement).value); }
  updateCopywriterInput(event: Event) { this.copywriterInput.set((event.target as HTMLTextAreaElement).value); }
  updateTranslatorLang(event: Event) { this.translatorTargetLang.set((event.target as HTMLSelectElement).value); }
  toggleTranslatorThinking() { this.translatorUseThinking.update(v => !v); }
  toggleGeneratorThinking() { this.generatorUseThinking.update(v => !v); }
  toggleOptimizerThinking() { this.optimizerUseThinking.update(v => !v); }
  toggleCopywriterThinking() { this.copywriterUseThinking.update(v => !v); }
  toggleSeoThinking() { this.seoUseThinking.update(v => !v); }

  async pastePlainText(field: 'productName' | 'description' | 'specs' | 'supplementalContent') {
    try {
      const text = await navigator.clipboard.readText();
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const cleanText = doc.body.textContent || text;
      const finalVal = cleanText.trim();
      if (field === 'productName') this.productName.set(finalVal);
      else if (field === 'description') this.description.set(finalVal);
      else if (field === 'specs') this.specs.set(finalVal);
      else if (field === 'supplementalContent') this.supplementalContent.set(finalVal);
    } catch (e: any) {
      console.error('Failed to paste text', e);
      if (e.message?.includes('permissions policy') || e.name === 'NotAllowedError') {
        alert('Clipboard access blocked by browser settings or security policy.\n\nPlease paste manually using keyboard shortcut: Ctrl+Shift+V (Paste as plain text).');
      } else {
        alert('Could not read clipboard. Please paste manually.');
      }
    }
  }

  async generate() {
    const currentSite = this.selectedWebsite();
    if (!currentSite || !this.isFormValid()) {
      alert(this.uiLabels().alertFillFields);
      return;
    }
    const manifest = this.genImgManifest();
    const input: ProductInput = {
      website: currentSite,
      name: this.productName(),
      description: this.description(),
      specs: this.specs(),
      supplementalContent: this.supplementalContent(),
      customInstructions: this.customInstructions(),
      templateId: this.selectedTemplateId() || undefined,
      customTemplate: Object.keys(this.customTemplate()).length > 0 ? this.customTemplate() : undefined,
      imageManifest: manifest.length > 0 ? manifest : undefined,
      brandFolder: this.genBrandFolder().trim() || undefined,
      modelFolder: this.genModelFolder().trim() || undefined,
    };
    this.activeTab.set('html');
    await this.orchestrator.generate(input, this.generatorUseThinking());
    if (this.chatInitialized) {
      this.llmService.sendChatMessage(`[System Update] Generation Complete. New content is now available in the preview. User inputs: Name="${this.productName()}", Website="${this.selectedWebsite()?.name}".`);
    }
  }

  async generateSeoOnly() {
    const currentSite = this.selectedWebsite();
    if (!currentSite || !this.isFormValid()) {
      alert(this.uiLabels().alertFillFields);
      return;
    }
    const input: ProductInput = {
      website: currentSite,
      name: this.productName(),
      description: this.description(),
      specs: '',
      supplementalContent: this.supplementalContent(),
      templateId: this.selectedTemplateId() || undefined,
      customTemplate: Object.keys(this.customTemplate()).length > 0 ? this.customTemplate() : undefined
    };
    this.activeTab.set('seo');
    await this.orchestrator.generateSeoMetadata(input, this.seoUseThinking());
  }

  async getKeywords() {
    if (!this.productName() || !this.description()) {
      alert('Please enter Product Name and Description first.');
      return;
    }
    await this.orchestrator.generateKeywords(this.productName(), this.description());
  }

  async optimize() {
    if (!this.isOptimizerValid()) return;
    await this.orchestrator.optimize(this.optimizerInputHtml(), this.productName(), this.optimizerUseThinking());
  }

  async cleanStructure() {
    if (!this.isOptimizerValid()) return;
    await this.orchestrator.cleanStructureOnly(this.optimizerInputHtml());
  }

  async translate() {
    if (!this.isTranslatorValid()) return;
    await this.orchestrator.translate(this.translatorInput(), this.translatorTargetLang(), this.translatorUseThinking());
  }

  async analyzeReadability() {
    if (!this.isReadabilityValid()) return;
    await this.orchestrator.analyzeReadability(this.readabilityInput());
  }

  async rewriteContent() {
    const site = this.selectedWebsite();
    if (!site || !this.isCopywriterValid()) {
      alert('Please select a Target Website and provide text to rewrite.');
      return;
    }
    await this.orchestrator.rewrite(site, this.copywriterInput(), this.copywriterUseThinking());
  }

  toggleHistory() { this.showHistory.update(v => !v); }

  restoreHistory(item: HistoryItem) {
    this.appMode.set('generator');
    this.selectedWebsite.set(item.input.website);
    this.productName.set(item.input.name);
    this.description.set(item.input.description);
    this.specs.set(item.input.specs);
    this.supplementalContent.set(item.input.supplementalContent || '');
    this.customInstructions.set(item.input.customInstructions || '');
    this.orchestrator.content.set(item.output);
    this.showHistory.set(false);
  }

  clearHistory() {
    if(confirm(this.uiLabels().alertHistoryClear)) {
      this.historyService.clear();
      this.comparisonIds.set([]);
      this.showComparison.set(false);
    }
  }

  toggleComparisonSelection(id: string, event: Event) {
    event.stopPropagation();
    this.comparisonIds.update(ids => {
      if (ids.includes(id)) return ids.filter(i => i !== id);
      if (ids.length >= 3) return [...ids.slice(1), id];
      return [...ids, id];
    });
  }

  openComparison() {
    if (this.comparisonIds().length >= 2) {
      this.showComparison.set(true);
    }
  }

  closeComparison() { this.showComparison.set(false); }

  toggleChat() {
    this.isChatOpen.update(v => !v);
    if (this.isChatOpen() && !this.chatInitialized) {
      const context = this.buildChatContext();
      this.llmService.startChat(context);
      this.chatMessages.set([{ role: 'model', text: 'Hello! I am your context-aware SEO assistant. I can see the content you are working on. I can also restart the generation for you if you update the inputs. How can I help?' }]);
      this.chatInitialized = true;
    }
  }

  updateChatInput(event: Event) { this.chatInput.set((event.target as HTMLTextAreaElement).value); }

  async sendChatMessage() {
    const msg = this.chatInput().trim();
    if (!msg || this.isChatThinking()) return;
    this.chatInput.set('');
    this.chatMessages.update(msgs => [...msgs, { role: 'user', text: msg }]);
    this.isChatThinking.set(true);
    try {
      const response = await this.llmService.sendChatMessage(msg);
      if (response.toolCall?.name === 'restart_generation') {
        this.chatMessages.update(msgs => [...msgs, { role: 'model', text: 'Restarting generation based on your updates...' }]);
        await this.generate();
        const finalResponse = await this.llmService.sendToolResponse('restart_generation', { success: true, message: 'Generation started and completed successfully.' });
        this.chatMessages.update(msgs => [...msgs, { role: 'model', text: finalResponse }]);
      } else {
        this.chatMessages.update(msgs => [...msgs, { role: 'model', text: response.text }]);
      }
    } catch (e) {
      this.chatMessages.update(msgs => [...msgs, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
      console.error(e);
    } finally {
      this.isChatThinking.set(false);
    }
  }

  private buildChatContext(): string {
    let context = 'You are a helpful SEO Content Assistant expert in 3D printing equipment.\n';
    if (this.appMode() === 'generator') {
      context += `Current Product: ${this.productName() || 'Not set'}\n`;
      context += `Target Website: ${this.selectedWebsite()?.name || 'Not set'}\n`;
      if (this.content().mainHtmlEn) context += `\nCURRENT GENERATED HTML:\n${this.content().mainHtmlEn}\n`;
      else if (this.description()) context += `\nORIGINAL DESCRIPTION:\n${this.description()}\n`;
    } else if (this.appMode() === 'optimizer') {
      context += `User is optimizing HTML. Current Input length: ${this.optimizerInputHtml().length} chars.\n`;
      if(this.optimizerOutput()) context += `Optimized Output: ${this.optimizerOutput()}\n`;
    } else if (this.appMode() === 'translator') {
      context += `User is translating to ${this.translatorTargetLang()}.\n`;
    } else {
      context += `User is using Image Tools (Converter/Optimizer).\n`;
    }
    context += `\nInstructions: Answer the user's questions about the content. You can help rewrite sections, suggest SEO improvements, or explain technical terms. 
    If the user asks to "Regenerate" or says they have updated the inputs (Description/Name/Specs) based on your advice, call the "restart_generation" tool immediately.
    Be concise and professional.`;
    return context;
  }

  clearAll() {
    if (this.appMode() === 'generator' || this.appMode() === 'seo-generator') {
      this.productName.set('');
      this.description.set('');
      this.specs.set('');
      this.supplementalContent.set('');
      this.customInstructions.set('');
      this.selectedWebsite.set(null);
      if (this.appMode() === 'generator') this.activeTab.set('html');
      else this.activeTab.set('seo');
    } else if (this.appMode() === 'optimizer') {
      this.optimizerInputHtml.set('');
    } else if (this.appMode() === 'translator') {
      this.translatorInput.set('');
    } else if (this.appMode() === 'readability') {
      this.readabilityInput.set('');
    } else if (this.appMode() === 'copywriter') {
      this.copywriterInput.set('');
    } else if (this.appMode() === 'image-tools') {
      this.imgFiles().forEach(img => URL.revokeObjectURL(img.previewUrl));
      this.imgFiles.set([]);
      this.imgResults.set([]);
    }

    this.orchestrator.resetState();
    this.chatMessages.set([]);
    this.isChatOpen.set(false);
    this.chatInitialized = false;
  }

  async downloadZip() { await downloadPackage(this.content(), this.productName()); }
  async downloadText() { downloadTextPackage(this.content(), this.productName()); }

  copyToClipboard(text: string, event?: Event) {
    navigator.clipboard.writeText(text);
    if (event) this.animateCopyButton(event.currentTarget as HTMLElement);
  }

  copySeoItem(item: SeoMetaItem, event?: Event) {
    const text = `H1: ${item.h1}\nTitle: ${item.meta_title}\nDesc: ${item.meta_description}`;
    navigator.clipboard.writeText(text);
    if (event) this.animateCopyButton(event.currentTarget as HTMLElement);
  }

  private animateCopyButton(btn: HTMLElement) {
    const icon = btn.querySelector('i');
    if (icon) {
      const originalClass = icon.className;
      icon.className = 'fa-solid fa-check text-green-500 scale-110 transition-transform';
      setTimeout(() => { icon.className = originalClass; }, 1000);
    }
  }

  // ── Generator Image Manifest ──────────────────────────────────────────────

  onGenImgSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.addGenImgFiles(Array.from(input.files));
    input.value = '';
  }

  onGenImgDrop(event: DragEvent) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/'));
    this.addGenImgFiles(files);
  }

  onGenImgDragOver(event: DragEvent) { event.preventDefault(); }

  private addGenImgFiles(files: File[]) {
    const currentCount = this.genImgManifest().length;
    const entries: ImageManifestEntry[] = files.map((file, i) => {
      const id = crypto.randomUUID();
      this.genImgFileMap.set(id, file);
      return {
        id,
        originalFilename: file.name,
        urlFilename: normalizeImageFilename(file.name),
        previewUrl: URL.createObjectURL(file),
        visionDescription: '',
        altText: '',
        order: currentCount + i,
        status: 'pending',
      };
    });
    this.genImgManifest.update(list => [...list, ...entries]);
  }

  removeGenImg(id: string) {
    this.genImgManifest.update(list => {
      const entry = list.find(e => e.id === id);
      if (entry) URL.revokeObjectURL(entry.previewUrl);
      this.genImgFileMap.delete(id);
      return list.filter(e => e.id !== id).map((e, i) => ({ ...e, order: i }));
    });
  }

  updateGenAltText(id: string, value: string) {
    this.genImgManifest.update(list =>
      list.map(e => e.id === id ? { ...e, altText: value } : e)
    );
  }

  updateGenBrandFolder(event: Event) {
    this.genBrandFolder.set((event.target as HTMLInputElement).value);
  }

  updateGenModelFolder(event: Event) {
    this.genModelFolder.set((event.target as HTMLInputElement).value);
  }

  clearGenImgManifest() {
    this.genImgManifest().forEach(e => URL.revokeObjectURL(e.previewUrl));
    this.genImgManifest.set([]);
    this.genImgFileMap.clear();
  }

  async analyzeGenImages() {
    const pending = this.genImgManifest().filter(e => e.status === 'pending');
    if (pending.length === 0 || this.isVisionAnalyzing()) return;

    this.isVisionAnalyzing.set(true);
    this.visionAnalyzedCount.set(0);
    const concurrency = 3;

    try {
      for (let i = 0; i < pending.length; i += concurrency) {
        const batch = pending.slice(i, i + concurrency);
        await Promise.all(batch.map(async (entry) => {
          this.genImgManifest.update(list =>
            list.map(e => e.id === entry.id ? { ...e, status: 'analyzing' } : e)
          );
          try {
            const file = this.genImgFileMap.get(entry.id);
            if (!file) throw new Error('File not found');
            const base64 = await this.fileToBase64ForVision(file);
            const description = await this.llmService.analyzeImage(base64, 'image/jpeg', buildVisionPrepassPrompt());
            this.genImgManifest.update(list =>
              list.map(e => e.id === entry.id
                ? { ...e, status: 'done', visionDescription: description, altText: e.altText || description }
                : e)
            );
          } catch (err) {
            console.warn('Vision analysis failed for', entry.originalFilename, err);
            const fallbackAlt = entry.urlFilename.replace('.jpg', '').replace(/-/g, ' ');
            this.genImgManifest.update(list =>
              list.map(e => e.id === entry.id
                ? { ...e, status: 'error', altText: e.altText || fallbackAlt }
                : e)
            );
          }
          this.visionAnalyzedCount.update(n => n + 1);
        }));
      }
    } finally {
      this.isVisionAnalyzing.set(false);
    }
  }

  private fileToBase64ForVision(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Canvas context not supported');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.6).split(',')[1]);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ── Image Tools Tab ───────────────────────────────────────────────────────

  onImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const newImages = Array.from(input.files).map(file => ({ file, previewUrl: URL.createObjectURL(file) }));
      this.imgFiles.update(current => [...current, ...newImages]);
    }
    input.value = '';
  }

  onImageDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
       const newImages = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('image/')).map(file => ({ file, previewUrl: URL.createObjectURL(file) }));
       this.imgFiles.update(current => [...current, ...newImages]);
    }
  }

  onDragOver(event: DragEvent) { event.preventDefault(); }

  removeImage(index: number) {
    this.imgFiles.update(files => {
      URL.revokeObjectURL(files[index].previewUrl);
      return files.filter((_, i) => i !== index);
    });
  }

  toggleAiAlt() { this.imgUseAiAlt.update(v => !v); }
  updateQuality(event: Event) { this.imgQuality.set(parseInt((event.target as HTMLInputElement).value, 10) / 100); }

  async processImages() {
    if (this.imgFiles().length === 0) return;
    this.isImgProcessing.set(true);
    this.imgResults.set([]);
    try {
      const results = await Promise.all(this.imgFiles().map(img => this.processSingleImage(img.file)));
      this.imgResults.set(results);
    } catch (e) {
      console.error('Image processing failed', e);
      alert('One or more images failed to process.');
    } finally {
      this.isImgProcessing.set(false);
    }
  }

  private async processSingleImage(file: File): Promise<ProcessedImage> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Canvas context not supported');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(async (blob) => {
            if (!blob) return reject('Blob generation failed');
            let altText = '';
            if (this.imgUseAiAlt()) {
              try {
                const base64ForApi = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                altText = await this.llmService.analyzeImage(base64ForApi, 'image/jpeg', this.orchestrator.getImageAltPrompt());
              } catch (err) {
                console.warn('AI Alt Text failed', err);
                altText = 'Error generating alt text.';
              }
            }
            resolve({ id: crypto.randomUUID(), originalName: file.name, originalSize: file.size, blob: blob, previewUrl: URL.createObjectURL(blob), newSize: blob.size, format: this.imgTargetFormat(), altText: altText });
          }, this.imgTargetFormat(), this.imgQuality());
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  downloadImage(img: ProcessedImage) {
    let ext = img.format.split('/')[1];
    if (ext === 'jpeg') ext = 'jpg';
    let baseName = img.originalName;
    if (baseName.includes('.')) baseName = baseName.substring(0, baseName.lastIndexOf('.'));
    const name = `${baseName}.${ext}`;
    saveAs(img.blob, name);
  }

  async downloadAllImages() { await downloadImagesPackage(this.imgResults()); }

  downloadImageDataJson() {
    const data = this.imgResults().map(img => {
      let ext = img.format.split('/')[1];
      if (ext === 'jpeg') ext = 'jpg';
      let baseName = img.originalName;
      if (baseName.includes('.')) baseName = baseName.substring(0, baseName.lastIndexOf('.'));
      const fileName = `${baseName}.${ext}`;
      
      return {
        fileName: fileName,
        altText: img.altText || ''
      };
    });

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    saveAs(blob, `image-metadata-${Date.now()}.json`);
  }

  formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
