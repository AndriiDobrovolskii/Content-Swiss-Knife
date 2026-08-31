
export type WebsiteGroup = 'UA' | 'EU' | 'ES' | 'US';

export type AppMode = 'generator' | 'ua-generator' | 'optimizer' | 'translator' | 'image-tools' | 'seo-generator' | 'copywriter' | 'readability' | 'slug-generator' | 'html-editor' | 'dashboard';

export interface WebsiteOption {
  name: string;
  group: WebsiteGroup;
  url: string;
}

export interface TemplateStructure {
  titlePattern: string;
  headingStructure: string[];
  bodyFocus: string;
  keywordStrategy: string;
}

export interface ContentTemplate {
  id: string;
  description: string;
  geo: WebsiteGroup[];
  structure?: TemplateStructure;
}

export interface ImageManifestEntry {
  id: string;
  originalFilename: string;
  urlFilename: string;
  previewUrl: string;
  visionDescription: string;
  altText: string;
  order: number;
  status: 'pending' | 'analyzing' | 'done' | 'error';
}

export interface ProductInput {
  website: WebsiteOption;
  name: string;
  description: string;
  specs: string;
  supplementalContent?: string;
  customInstructions?: string;
  templateId?: string;
  customTemplate?: Partial<ContentTemplate['structure']>;
  imageManifest?: ImageManifestEntry[];
  brandFolder?: string;
  modelFolder?: string;
}

export interface SeoMetaItem {
  language: string;
  h1: string;
  meta_title: string;
  meta_description: string;
}

export interface SeoResponse {
  site_name: string;
  seo_data: SeoMetaItem[];
}

export interface SlugItem {
  language: string;
  name: string;
  slug: string;
}

export interface SlugResponse {
  site_name: string;
  slugs: SlugItem[];
}

export interface ReadabilityScore {
  score: number;
  level: string;
  issues: string[];
  suggestions: string[];
  optimizedText?: string;
}

export interface GeneratedContent {
  mainHtmlUa: string;
  translations: Record<string, string>; // e.g., 'UA': '<html>...</html>'
  seoData: SeoResponse | null;
  slugData?: SlugResponse | null;
  website?: WebsiteOption; // store this content was generated for (optional for backward compat)
  faqArtifacts?: Record<string, string>;   // ISO code → schema-free faq_[ISO].html
  mainHtmlLocale?: string; // ISO code for mainHtmlUa's actual language, e.g. 'uk-UA' for native ua-generator output. Undefined = English (historical default).
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  input: ProductInput;
  output: GeneratedContent;
}

export interface ProcessedImage {
  id: string;
  originalName: string;
  originalSize: number;
  blob: Blob;
  previewUrl: string;
  newSize: number;
  format: string;
  altText?: string;
}

/** Descriptor for a single output tab in the generator header. */
export interface TabDescriptor {
  id: string;
  label: string;
  type: 'english' | 'translation' | 'faq-english' | 'faq-translation';
  color: 'blue' | 'purple' | 'green';
  iso: string;
  taskKey?: string;
  isFaq: boolean;
}

export const WEBSITE_OPTIONS: WebsiteOption[] = [
  { name: '3DDevice', group: 'UA', url: '3ddevice.com.ua' },
  { name: '3DPrinter', group: 'UA', url: '3dprinter.com.ua' },
  { name: '3DScanner', group: 'UA', url: '3dscanner.com.ua' },
  { name: 'Center 3D Print', group: 'EU', url: 'center3dprint.com' },
  { name: 'Drukarka 3D', group: 'EU', url: 'drukarka-3d.com.pl' },
  { name: 'EXPERT3D', group: 'ES', url: 'expert3d.es' },
  { name: 'Expert-3DPrinter', group: 'US', url: 'expert-3dprinter.com' }
];

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    id: 'consumables-resin',
    description: 'Simplified consumables schema (filament/resin/adhesive) — focuses on material properties, mechanical strength, and finish, with a 5500-character visible-text ceiling.',
    geo: ['UA', 'EU', 'ES', 'US']
  }
];

