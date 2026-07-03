
export type WebsiteGroup = 'UA' | 'EU' | 'ES' | 'US';

export type AppMode = 'generator' | 'ua-generator' | 'optimizer' | 'translator' | 'image-tools' | 'seo-generator' | 'copywriter' | 'readability' | 'slug-generator';

export interface WebsiteOption {
  name: string;
  group: WebsiteGroup;
  url: string;
}

export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  niche: string;
  geo: WebsiteGroup[];
  structure: {
    titlePattern: string;
    headingStructure: string[];
    bodyFocus: string;
    keywordStrategy: string;
  };
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
  mainHtmlEn: string;
  translations: Record<string, string>; // e.g., 'UA': '<html>...</html>'
  seoData: SeoResponse | null;
  slugData?: SlugResponse | null;
  website?: WebsiteOption; // store this content was generated for (optional for backward compat)
  faqArtifacts?: Record<string, string>;   // ISO code → schema-free faq_[ISO].html
  mainHtmlLocale?: string; // ISO code for mainHtmlEn's actual language, e.g. 'uk-UA' for native ua-generator output. Undefined = English (historical default).
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
    id: 'standard-3d-printer',
    name: 'Standard 3D Printer',
    description: 'Optimized for FDM/SLA 3D printers with focus on technical specs and use cases.',
    niche: '3D Printers',
    geo: ['UA', 'EU', 'ES', 'US'],
    structure: {
      titlePattern: '[Brand] [Model] - Professional 3D Printer',
      headingStructure: ['Overview', 'Key Features', 'Technical Specifications', 'What\'s in the Box', 'Why Choose Us'],
      bodyFocus: 'Emphasize reliability, print volume, and material compatibility.',
      keywordStrategy: 'Focus on "buy [model]", "[model] price", and "best 3d printer for [niche]".'
    }
  },
  {
    id: 'industrial-scanner',
    name: 'Industrial 3D Scanner',
    description: 'High-precision scanning focus for metrology and engineering.',
    niche: '3D Scanners',
    geo: ['UA', 'EU', 'US'],
    structure: {
      titlePattern: '[Brand] [Model] High-Precision 3D Scanner',
      headingStructure: ['Metrology Grade Scanning', 'Advanced Features', 'Software Integration', 'Applications', 'Technical Data'],
      bodyFocus: 'Focus on accuracy, resolution, and speed of data acquisition.',
      keywordStrategy: 'Focus on "industrial 3d scanner", "metrology equipment", and "reverse engineering scanner".'
    }
  },
  {
    id: 'consumables-resin',
    name: 'Consumables: Resin/Filament',
    description: 'Focus on material properties, mechanical strength, and finish.',
    niche: 'Consumables',
    geo: ['UA', 'EU', 'ES', 'US'],
    structure: {
      titlePattern: '[Brand] [Material] [Color] [Weight]',
      headingStructure: ['Material Properties', 'Printing Settings', 'Mechanical Characteristics', 'Compatibility'],
      bodyFocus: 'Focus on surface finish, strength, and ease of printing.',
      keywordStrategy: 'Focus on "[material] filament", "high strength resin", and "[brand] consumables".'
    }
  }
];

